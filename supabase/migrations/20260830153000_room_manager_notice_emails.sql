-- Assigned room-manager emails for new-request notices.
-- Requesters cannot read other users.email (RLS), so this is security definer.

create or replace function public.room_manager_notice_emails(p_room_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct lower(u.email)),
    '{}'::text[]
  )
  from public.rooms r
  join public.users u on u.id = r.manager_id
  where r.id = p_room_id
    and u.email is not null
    and length(trim(u.email)) > 0;
$$;

revoke all on function public.room_manager_notice_emails(uuid) from public;
grant execute on function public.room_manager_notice_emails(uuid) to authenticated;
