-- Per-message read watermark: add user to latest message's read_user_ids when they open chat.
-- Drop the separate message_reads cursor table.

alter table public.messages
  add column if not exists read_user_ids uuid[] not null default '{}'::uuid[];

create index if not exists messages_read_user_ids_gin
  on public.messages using gin (read_user_ids);

create or replace function public.mark_ticket_chat_read(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_access_ticket_chat(p_ticket_id) then
    raise exception 'not authorized';
  end if;

  select m.id into latest_id
  from public.messages m
  join public.channels c on c.id = m.channel_id
  where c.ticket_id = p_ticket_id
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

revoke all on function public.mark_ticket_chat_read(uuid) from public, anon;
grant execute on function public.mark_ticket_chat_read(uuid) to authenticated;

drop policy if exists message_reads_select on public.message_reads;
drop policy if exists message_reads_upsert on public.message_reads;
drop policy if exists message_reads_update on public.message_reads;
drop table if exists public.message_reads;
