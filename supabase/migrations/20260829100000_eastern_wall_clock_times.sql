-- Store reservation start/end as America/New_York wall-clock times
-- so the data table shows 2:00 AM when someone books 2:00 AM.

create or replace function public.now_eastern()
returns timestamp
language sql
stable
set search_path = public
as $$
  select timezone('America/New_York', now());
$$;

alter table public.reservations_confirmed
  drop constraint if exists reservations_confirmed_no_overlap;
alter table public.reservations_confirmed
  drop constraint if exists confirmed_reservations_no_overlap;

alter table public.reservation_requests
  alter column start_at type timestamp
    using (start_at at time zone 'America/New_York'),
  alter column end_at type timestamp
    using (end_at at time zone 'America/New_York');

alter table public.reservations_confirmed
  alter column start_at type timestamp
    using (start_at at time zone 'America/New_York'),
  alter column end_at type timestamp
    using (end_at at time zone 'America/New_York');

alter table public.reservations_confirmed
  add constraint reservations_confirmed_no_overlap
  exclude using gist (
    room_id with =,
    tsrange(start_at, end_at, '[)') with &&
  )
  where (status = 'active' and cancelled_at is null);

drop function if exists public.get_public_availability(uuid[], timestamptz, timestamptz);

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
    from public.reservations_confirmed
    where room_id = p_room_id
      and status = 'active'
      and cancelled_at is null
      and start_at <= v_now
      and end_at > v_now
  ) then
    v_status := 'Reserved';
  elsif exists (
    select 1
    from public.reservation_requests
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

create or replace function public.get_public_availability(
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
    cr.room_id,
    rm.slug,
    rm.name,
    cr.start_at,
    cr.end_at,
    'Reserved'::public.public_status,
    'Other',
    cr.updated_at
  from public.reservations_confirmed cr
  join public.rooms rm on rm.id = cr.room_id
  where cr.room_id = any(p_room_ids)
    and rm.is_active = true
    and cr.status = 'active'
    and cr.cancelled_at is null
    and cr.start_at < timezone('America/New_York', p_end_at)
    and cr.end_at > timezone('America/New_York', p_start_at)

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
    and rr.start_at < timezone('America/New_York', p_end_at)
    and rr.end_at > timezone('America/New_York', p_start_at);
$$;

grant execute on function public.now_eastern() to anon, authenticated, service_role;
grant execute on function public.get_public_availability(uuid[], timestamptz, timestamptz)
  to anon, authenticated, service_role;
