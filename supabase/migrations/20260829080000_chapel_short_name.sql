-- Map nametag and catalog use the short room name.

update public.rooms
set
  name = 'Chapel',
  short_name = 'Chapel'
where slug = 'chapel';
