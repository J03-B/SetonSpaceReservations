-- Main Building interior rooms (linked from floor map regions via spaceSlug)

insert into public.rooms (
  name, short_name, slug, description, building, timezone, status, is_public
) values
  ('Benedict', 'Benedict', 'benedict', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Laboure', 'Laboure', 'laboure', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Our Lady Queen of the Angels Chapel', 'Chapel', 'chapel', 'Main Building chapel.', 'Main Building', 'America/New_York', 'active', true),
  ('Aquinas', 'Aquinas', 'aquinas', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Clare', 'Clare', 'clare', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Siena', 'Siena', 'siena', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Claude', 'Claude', 'claude', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Bosco (Art)', 'Bosco', 'bosco', 'Main Building art room.', 'Main Building', 'America/New_York', 'active', true),
  ('Anthony', 'Anthony', 'anthony', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Vianney', 'Vianney', 'vianney', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Imelda', 'Imelda', 'imelda', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Joan', 'Joan', 'joan', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Jerome (Library)', 'Jerome', 'jerome', 'Main Building library.', 'Main Building', 'America/New_York', 'active', true),
  ('Stein (Computer Lab)', 'Stein', 'stein', 'Main Building computer lab.', 'Main Building', 'America/New_York', 'active', true),
  ('Teresa', 'Teresa', 'teresa', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true),
  ('Goretti', 'Goretti', 'goretti', 'Main Building classroom.', 'Main Building', 'America/New_York', 'active', true)
on conflict (slug) do nothing;
