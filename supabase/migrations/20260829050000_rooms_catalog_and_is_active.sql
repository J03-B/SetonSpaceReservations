-- Align rooms with the campus map catalog and simplify public columns.
-- current_status = catalog lifecycle (active vs archived).
-- is_active = whether the room can be selected and reserved.

drop policy if exists "Public can view active public rooms" on public.rooms;
drop index if exists public.idx_rooms_status_public;
drop function if exists public.get_public_availability(uuid[], timestamptz, timestamptz);

alter table public.rooms rename column status to current_status;
alter table public.rooms rename column is_public to is_active;
alter table public.rooms drop column if exists timezone;
alter table public.rooms drop column if exists rules;
alter table public.rooms drop column if exists created_at;

create index idx_rooms_current_status_active
  on public.rooms (current_status, is_active);

create or replace function public.set_rooms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_rooms_updated_at();

revoke execute on function public.set_rooms_updated_at() from public, anon, authenticated;

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
    and rm.current_status = 'active'
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
    and rm.current_status = 'active'
    and rm.is_active = true
    and rr.status = 'pending'
    and rr.start_at < p_end_at
    and rr.end_at > p_start_at;
$$;

grant execute on function public.get_public_availability(uuid[], timestamptz, timestamptz) to anon, authenticated;

create policy "Public can view current rooms"
  on public.rooms for select
  using (current_status = 'active');

update public.rooms
set
  slug = 'faustina',
  name = 'Faustina',
  short_name = 'Faustina',
  building = 'Corpus Christi'
where slug = 'faustina-hall';

insert into public.rooms (
  name, short_name, slug, description, building, capacity, current_status, is_active
) values
  ('Anthony', 'Anthony', 'anthony', null, 'Main Building', null, 'active', true),
  ('Aquinas', 'Aquinas', 'aquinas', null, 'Main Building', null, 'active', true),
  ('Benedict', 'Benedict', 'benedict', null, 'Main Building', null, 'active', true),
  ('Bertoni', 'Bertoni', 'bertoni', null, 'Corpus Christi', null, 'active', true),
  ('Bosco', 'Bosco', 'bosco', null, 'Main Building', null, 'active', true),
  ('Carlo Acutis Tech Center', 'CATC', 'catc', null, 'Seton campus', null, 'active', true),
  ('Our Lady Queen of the Angels Chapel', 'Chapel', 'chapel', null, 'Main Building', null, 'active', true),
  ('Clare', 'Clare', 'clare', null, 'Main Building', null, 'active', true),
  ('Claude', 'Claude', 'claude', null, 'Main Building', null, 'active', true),
  ('DMC', 'DMC', 'dmc', null, 'Seton campus', null, 'active', true),
  ('Fatima', 'Fatima', 'fatima', null, 'Corpus Christi', null, 'active', true),
  ('Faustina', 'Faustina', 'faustina', null, 'Corpus Christi', null, 'active', true),
  ('Francis', 'Francis', 'francis', null, 'Corpus Christi', null, 'active', true),
  ('Goretti', 'Goretti', 'goretti', null, 'Main Building', null, 'active', true),
  ('Gym', 'Gym', 'gym', null, 'Seton campus', null, 'active', true),
  ('Imelda', 'Imelda', 'imelda', null, 'Main Building', null, 'active', true),
  ('Innocents', 'Innocents', 'innocents', null, 'Corpus Christi', null, 'active', true),
  ('Jerome', 'Jerome', 'jerome', null, 'Main Building', null, 'active', true),
  ('Joan', 'Joan', 'joan', null, 'Main Building', null, 'active', true),
  ('Joseph', 'Joseph', 'joseph', null, 'Corpus Christi', null, 'active', true),
  ('Laboure', 'Laboure', 'laboure', null, 'Main Building', null, 'active', true),
  ('Neri', 'Neri', 'neri', null, 'Corpus Christi', null, 'active', true),
  ('Patrick', 'Patrick', 'patrick', null, 'Corpus Christi', null, 'active', true),
  ('Savio', 'Savio', 'savio', null, 'Corpus Christi', null, 'active', true),
  ('Siena', 'Siena', 'siena', null, 'Main Building', null, 'active', true),
  ('Stein', 'Stein', 'stein', null, 'Main Building', null, 'active', true),
  ('Teresa', 'Teresa', 'teresa', null, 'Main Building', null, 'active', true),
  ('Vianney', 'Vianney', 'vianney', null, 'Main Building', null, 'active', true)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  description = null,
  building = excluded.building,
  capacity = null,
  current_status = 'active',
  is_active = true,
  updated_at = now();
