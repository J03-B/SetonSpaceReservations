-- Seed initial launch spaces and approved domain (assumption — masterplan §6)
-- Domain and space details must be confirmed before production launch.

insert into public.approved_domains (domain, is_active, auto_grant_requester, notes)
values (
  'setonschool.net',
  true,
  true,
  'Initial assumed Seton domain — verify before production (masterplan open decision #2)'
)
on conflict (domain) do nothing;

insert into public.spaces (
  name, short_name, slug, description, building, status, is_public,
  min_duration_minutes, max_duration_minutes, min_notice_minutes, max_advance_days
) values
(
  'DMC',
  'DMC',
  'dmc',
  'Shared facility space. Capacity, hours, and rules will be configured before launch.',
  'Seton campus',
  'active',
  true,
  30, 480, 60, 90
),
(
  'Faustina Hall',
  'Faustina',
  'faustina-hall',
  'Shared facility space. Capacity, hours, and rules will be configured before launch.',
  'Seton campus',
  'active',
  true,
  30, 480, 60, 90
),
(
  'Gym',
  'Gym',
  'gym',
  'Athletic facility space. Capacity, hours, and rules will be configured before launch.',
  'Seton campus',
  'active',
  true,
  30, 480, 60, 90
)
on conflict (slug) do nothing;

-- Default operating hours: Mon–Fri 7:00–22:00, Sat–Sun 8:00–20:00 (placeholder)
insert into public.operating_hours (space_id, day_of_week, open_time, close_time)
select s.id, d.day_of_week, d.open_time, d.close_time
from public.spaces s
cross join (
  values
    (0, '08:00'::time, '20:00'::time),
    (1, '07:00'::time, '22:00'::time),
    (2, '07:00'::time, '22:00'::time),
    (3, '07:00'::time, '22:00'::time),
    (4, '07:00'::time, '22:00'::time),
    (5, '07:00'::time, '22:00'::time),
    (6, '08:00'::time, '20:00'::time)
) as d(day_of_week, open_time, close_time)
where s.slug in ('dmc', 'faustina-hall', 'gym')
  and not exists (
    select 1 from public.operating_hours oh where oh.space_id = s.id
  );
