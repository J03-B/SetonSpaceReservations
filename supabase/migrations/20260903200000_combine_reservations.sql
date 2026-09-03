-- One reservations table: pending, denied, or accepted.
-- Keep start_at/end_at as Eastern wall-clock timestamps for the calendar.

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id),
  requester_id uuid not null references public.users (id),
  title text,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'denied', 'accepted')),
  start_at timestamp not null,
  end_at timestamp not null,
  requested_at timestamptz not null default now(),
  decision_by uuid references public.users (id),
  decision_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_time_ok check (end_at > start_at)
);

insert into public.reservations (
  id, room_id, requester_id, title, reason, status,
  start_at, end_at, requested_at, decision_by, decision_at, decision_reason,
  created_at, updated_at
)
select
  id,
  room_id,
  requester_id,
  title,
  description,
  case status
    when 'declined' then 'denied'
    when 'cancelled' then 'denied'
    when 'approved' then 'accepted'
    else 'pending'
  end,
  start_at,
  end_at,
  created_at,
  declined_by,
  declined_at,
  decline_reason,
  created_at,
  updated_at
from public.reservation_requests;

update public.reservations r
set
  status = 'accepted',
  decision_by = c.approved_by,
  decision_at = c.approved_at,
  title = coalesce(c.title, r.title),
  reason = coalesce(c.description, r.reason)
from public.reservations_confirmed c
where c.request_id = r.id
  and c.status = 'active';

insert into public.reservations (
  id, room_id, requester_id, title, reason, status,
  start_at, end_at, requested_at, decision_by, decision_at,
  created_at, updated_at
)
select
  c.id,
  c.room_id,
  c.requester_id,
  c.title,
  c.description,
  case when c.status = 'active' then 'accepted' else 'denied' end,
  c.start_at,
  c.end_at,
  c.created_at,
  c.approved_by,
  c.approved_at,
  c.created_at,
  c.updated_at
from public.reservations_confirmed c
where c.request_id is null
   or not exists (select 1 from public.reservations r where r.id = c.request_id);

create index if not exists reservations_room_time_idx
  on public.reservations (room_id, start_at, end_at);
create index if not exists reservations_requester_idx
  on public.reservations (requester_id, requested_at desc);
create index if not exists reservations_status_idx
  on public.reservations (status);

alter table public.reservations
  add constraint reservations_accepted_no_overlap
  exclude using gist (
    room_id with =,
    tsrange(start_at, end_at, '[)') with &&
  )
  where (status = 'accepted');

create or replace function public.reservations_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.reservations_set_updated_at();

create or replace function public.refresh_room_current_status(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.room_status;
  v_now timestamp := public.now_eastern();
begin
  if exists (
    select 1
    from public.reservations
    where room_id = p_room_id
      and status = 'accepted'
      and start_at <= v_now
      and end_at > v_now
  ) then
    v_status := 'Reserved';
  elsif exists (
    select 1
    from public.reservations
    where room_id = p_room_id
      and status = 'pending'
      and start_at <= v_now
      and end_at > v_now
  ) then
    v_status := 'Pending';
  else
    v_status := 'Open';
  end if;

  update public.rooms
  set current_status = v_status
  where id = p_room_id
    and current_status is distinct from v_status;
end;
$$;

drop function if exists public.get_public_availability(uuid[], timestamptz, timestamptz);

create function public.get_public_availability(
  p_room_ids uuid[],
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table (
  space_id uuid,
  space_slug text,
  space_name text,
  start_at timestamp,
  end_at timestamp,
  public_status public.public_status,
  activity_category text,
  request_updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.room_id,
    rm.slug,
    rm.name,
    r.start_at,
    r.end_at,
    'Reserved'::public.public_status,
    'Other',
    r.updated_at
  from public.reservations r
  join public.rooms rm on rm.id = r.room_id
  where r.room_id = any(p_room_ids)
    and rm.is_active = true
    and r.status = 'accepted'
    and r.start_at < timezone('America/New_York', p_end_at)
    and r.end_at > timezone('America/New_York', p_start_at)

  union all

  select
    r.room_id,
    rm.slug,
    rm.name,
    r.start_at,
    r.end_at,
    'Pending'::public.public_status,
    'Other',
    r.updated_at
  from public.reservations r
  join public.rooms rm on rm.id = r.room_id
  where r.room_id = any(p_room_ids)
    and rm.is_active = true
    and r.status = 'pending'
    and r.start_at < timezone('America/New_York', p_end_at)
    and r.end_at > timezone('America/New_York', p_start_at);
$$;

grant execute on function public.get_public_availability(uuid[], timestamptz, timestamptz)
  to anon, authenticated, service_role;

create or replace function public.request_notice_conflicts(p_request_id uuid)
returns table (
  kind text,
  start_at timestamptz,
  end_at timestamptz,
  party_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select conflicts.kind, conflicts.start_at, conflicts.end_at, conflicts.party_name
  from public.reservations req
  join lateral (
    select
      'pending'::text as kind,
      rr.start_at,
      rr.end_at,
      coalesce(nullif(trim(u.full_name), ''), u.email, 'Requester') as party_name
    from public.reservations rr
    left join public.users u on u.id = rr.requester_id
    where rr.room_id = req.room_id
      and rr.id <> req.id
      and rr.status = 'pending'
      and rr.start_at < req.end_at
      and rr.end_at > req.start_at
    union all
    select
      'confirmed'::text,
      rc.start_at,
      rc.end_at,
      coalesce(nullif(trim(u.full_name), ''), u.email, 'Requester')
    from public.reservations rc
    left join public.users u on u.id = rc.requester_id
    where rc.room_id = req.room_id
      and rc.status = 'accepted'
      and rc.start_at < req.end_at
      and rc.end_at > req.start_at
  ) conflicts on true
  where req.id = p_request_id
    and (
      req.requester_id = auth.uid()
      or public.manages_room(req.room_id)
    )
  order by conflicts.start_at;
$$;

create or replace function public.combine_own_pending_request(
  p_keep_id uuid,
  p_drop_ids uuid[],
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room uuid;
  v_status text;
  v_drop uuid[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'invalid range';
  end if;

  if char_length(trim(p_description)) = 0 or char_length(p_description) > 2000 then
    raise exception 'invalid reason';
  end if;

  select room_id, status
    into v_room, v_status
  from public.reservations
  where id = p_keep_id
    and requester_id = v_uid
  for update;

  if v_room is null or v_status is distinct from 'pending' then
    raise exception 'not found';
  end if;

  v_drop := coalesce(p_drop_ids, '{}');

  if exists (
    select 1
    from unnest(v_drop) as d(id)
    where d.id = p_keep_id
      or not exists (
        select 1
        from public.reservations r
        where r.id = d.id
          and r.requester_id = v_uid
          and r.room_id = v_room
          and r.status = 'pending'
      )
  ) then
    raise exception 'invalid drop';
  end if;

  if coalesce(array_length(v_drop, 1), 0) > 0 then
    delete from public.reservations
    where id = any(v_drop)
      and requester_id = v_uid
      and status = 'pending';
  end if;

  update public.reservations
  set
    start_at = p_start_at,
    end_at = p_end_at,
    reason = p_description,
    updated_at = now()
  where id = p_keep_id
    and requester_id = v_uid
    and status = 'pending';

  return p_keep_id;
end;
$$;

drop trigger if exists reservation_requests_refresh_room_status on public.reservation_requests;
drop trigger if exists reservations_confirmed_refresh_room_status on public.reservations_confirmed;
drop trigger if exists confirmed_reservations_refresh_room_status on public.reservations_confirmed;

drop table if exists public.reservations_confirmed cascade;
drop table if exists public.reservation_requests cascade;

drop trigger if exists reservations_refresh_room_status on public.reservations;
create trigger reservations_refresh_room_status
  after insert or update or delete on public.reservations
  for each row execute function public.touch_room_current_status();

alter table public.reservations enable row level security;

drop policy if exists "Requesters view own reservations" on public.reservations;
create policy "Requesters view own reservations"
  on public.reservations for select
  using (auth.uid() = requester_id or public.manages_room(room_id));

drop policy if exists "Requesters insert own reservations" on public.reservations;
create policy "Requesters insert own reservations"
  on public.reservations for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.account_status = 'active'
        and u.access_level in ('user', 'trusted user', 'manager', 'admin')
        and u.email_verified_at is not null
    )
    and exists (
      select 1 from public.rooms rm
      where rm.id = room_id
        and rm.is_active = true
    )
  );

drop policy if exists "Staff manage reservations" on public.reservations;
create policy "Staff manage reservations"
  on public.reservations for update
  using (public.manages_room(room_id))
  with check (public.manages_room(room_id));

drop policy if exists "Staff delete reservations" on public.reservations;
create policy "Staff delete reservations"
  on public.reservations for delete
  using (public.manages_room(room_id));

grant select, insert, update, delete on public.reservations to authenticated;

drop type if exists public.request_status;
drop type if exists public.reservation_status;
