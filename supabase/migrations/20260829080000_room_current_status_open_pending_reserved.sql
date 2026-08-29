-- current_status is live occupancy: Open, Pending, Reserved.
-- is_active is whether people can submit reservation requests.

drop policy if exists "Public can view current rooms" on public.rooms;
drop function if exists public.get_public_availability(uuid[], timestamptz, timestamptz);

alter table public.rooms alter column current_status drop default;
alter table public.rooms
  alter column current_status type text
  using 'Open';

drop type if exists public.room_status;

create type public.room_status as enum ('Open', 'Pending', 'Reserved');

alter table public.rooms
  alter column current_status type public.room_status
  using current_status::public.room_status;

alter table public.rooms
  alter column current_status set default 'Open'::public.room_status;

create or replace function public.refresh_room_current_status(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.room_status;
begin
  if exists (
    select 1
    from public.confirmed_reservations
    where room_id = p_room_id
      and status = 'active'
      and cancelled_at is null
      and start_at <= now()
      and end_at > now()
  ) then
    v_status := 'Reserved';
  elsif exists (
    select 1
    from public.reservation_requests
    where room_id = p_room_id
      and status = 'pending'
      and start_at <= now()
      and end_at > now()
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

create or replace function public.touch_room_current_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_room_current_status(old.room_id);
    return old;
  end if;

  perform public.refresh_room_current_status(new.room_id);
  if tg_op = 'UPDATE' and old.room_id is distinct from new.room_id then
    perform public.refresh_room_current_status(old.room_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reservation_requests_refresh_room_status on public.reservation_requests;
create trigger reservation_requests_refresh_room_status
  after insert or update or delete on public.reservation_requests
  for each row execute function public.touch_room_current_status();

drop trigger if exists confirmed_reservations_refresh_room_status on public.confirmed_reservations;
create trigger confirmed_reservations_refresh_room_status
  after insert or update or delete on public.confirmed_reservations
  for each row execute function public.touch_room_current_status();

revoke execute on function public.refresh_room_current_status(uuid) from public, anon, authenticated;
revoke execute on function public.touch_room_current_status() from public, anon, authenticated;

create or replace function public.get_public_availability(
  p_room_ids uuid[],
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table (
  space_id uuid,
  space_slug text,
  space_name text,
  start_at timestamptz,
  end_at timestamptz,
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
    cr.room_id,
    rm.slug,
    rm.name,
    cr.start_at,
    cr.end_at,
    'Reserved'::public.public_status,
    'Other',
    cr.updated_at
  from public.confirmed_reservations cr
  join public.rooms rm on rm.id = cr.room_id
  where cr.room_id = any(p_room_ids)
    and rm.is_active = true
    and cr.status = 'active'
    and cr.cancelled_at is null
    and cr.start_at < p_end_at
    and cr.end_at > p_start_at

  union all

  select
    rr.room_id,
    rm.slug,
    rm.name,
    rr.start_at,
    rr.end_at,
    'Pending'::public.public_status,
    'Other',
    rr.updated_at
  from public.reservation_requests rr
  join public.rooms rm on rm.id = rr.room_id
  where rr.room_id = any(p_room_ids)
    and rm.is_active = true
    and rr.status = 'pending'
    and rr.start_at < p_end_at
    and rr.end_at > p_start_at;
$$;

grant execute on function public.get_public_availability(uuid[], timestamptz, timestamptz) to anon, authenticated;

create policy "Public can view rooms"
  on public.rooms for select
  using (true);

drop policy if exists "Requesters insert own requests" on public.reservation_requests;

create policy "Requesters insert own requests"
  on public.reservation_requests for insert
  with check (
    auth.uid() = requester_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.account_status = 'active'
        and u.access_level in ('requester', 'trusted', 'manager', 'tech_admin')
        and u.email_verified_at is not null
    )
    and exists (
      select 1 from public.rooms rm
      where rm.id = room_id
        and rm.is_active = true
    )
  );

do $$
declare
  room_row record;
begin
  for room_row in select id from public.rooms loop
    perform public.refresh_room_current_status(room_row.id);
  end loop;
end $$;
