-- Mark read only for the channel the user actually opens (not the whole ticket).

create or replace function public.mark_channel_chat_read(p_channel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_id uuid;
  latest_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select ticket_id into v_ticket_id
  from public.channels
  where id = p_channel_id;

  if v_ticket_id is null then
    raise exception 'channel not found';
  end if;

  if not public.can_access_ticket_chat(v_ticket_id) then
    raise exception 'not authorized';
  end if;

  select m.id into latest_id
  from public.messages m
  where m.channel_id = p_channel_id
  order by m.sent_at desc, m.id desc
  limit 1;

  if latest_id is null then
    return;
  end if;

  update public.messages
  set read_user_ids = array_append(read_user_ids, auth.uid())
  where id = latest_id
    and not (auth.uid() = any (read_user_ids));
end;
$$;

revoke all on function public.mark_channel_chat_read(uuid) from public, anon;
grant execute on function public.mark_channel_chat_read(uuid) to authenticated;
