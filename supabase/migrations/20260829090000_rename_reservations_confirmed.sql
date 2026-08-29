-- Keep table names consistent: reservation_requests, reservations_confirmed.

alter table if exists public.confirmed_reservations
  rename to reservations_confirmed;

alter index if exists idx_confirmed_room_time
  rename to idx_reservations_confirmed_room_time;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'confirmed_reservations_no_overlap'
  ) then
    alter table public.reservations_confirmed
      rename constraint confirmed_reservations_no_overlap
      to reservations_confirmed_no_overlap;
  end if;
end $$;

drop trigger if exists confirmed_reservations_refresh_room_status
  on public.reservations_confirmed;
drop trigger if exists reservations_confirmed_refresh_room_status
  on public.reservations_confirmed;

create trigger reservations_confirmed_refresh_room_status
  after insert or update or delete on public.reservations_confirmed
  for each row execute function public.touch_room_current_status();

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
    from public.reservations_confirmed
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
  from public.reservations_confirmed cr
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
