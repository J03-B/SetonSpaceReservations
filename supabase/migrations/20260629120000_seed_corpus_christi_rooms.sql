-- Corpus Christi classroom spaces (linked from floor map regions via spaceSlug)

insert into public.spaces (
  name, short_name, slug, description, building, status, is_public,
  min_duration_minutes, max_duration_minutes, min_notice_minutes, max_advance_days
) values
  ('Innocents', 'Innocents', 'innocents', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90),
  ('Patrick', 'Patrick', 'patrick', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90),
  ('Bertoni', 'Bertoni', 'bertoni', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90),
  ('Neri', 'Neri', 'neri', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90),
  ('Savio', 'Savio', 'savio', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90),
  ('Joseph', 'Joseph', 'joseph', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90),
  ('Francis', 'Francis', 'francis', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90),
  ('Fatima', 'Fatima', 'fatima', 'Corpus Christi classroom.', 'Corpus Christi', 'active', true, 30, 480, 60, 90)
on conflict (slug) do nothing;

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
where s.slug in ('innocents', 'patrick', 'bertoni', 'neri', 'savio', 'joseph', 'francis', 'fatima')
  and not exists (
    select 1 from public.operating_hours oh where oh.space_id = s.id
  );
