-- Split DMC into Classroom + Common Space; CATC is VEX Space.
-- is_active hides the old whole-building rows. current_status is occupancy (Open).

update public.rooms
set is_active = false
where slug in ('dmc', 'catc');

insert into public.rooms (
  name, short_name, slug, description, building, current_status, is_active
) values
  ('Classroom', 'Classroom', 'classroom', null, 'Divine Mercy Center', 'Open', true),
  ('Common Space', 'Common Space', 'common-space', null, 'Divine Mercy Center', 'Open', true),
  ('VEX Space', 'VEX Space', 'vex-space', null, 'Carlo Acutis Tech Center', 'Open', true)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  building = excluded.building,
  is_active = true,
  updated_at = now();
