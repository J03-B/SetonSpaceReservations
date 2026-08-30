-- Requesters cannot UPDATE/DELETE their own pending rows (managers can).
-- Combine overlapping or adjacent own pending requests into one.

create or replace function public.combine_own_pending_request(
  p_keep_id uuid,
  p_drop_ids uuid[],
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room uuid;
  v_status public.request_status;
  v_drop uuid[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'invalid range';
  end if;

  if char_length(trim(p_description)) = 0 or char_length(p_description) > 2000 then
    raise exception 'invalid reason';
  end if;

  select room_id, status
    into v_room, v_status
  from public.reservation_requests
  where id = p_keep_id
    and requester_id = v_uid
  for update;

  if v_room is null or v_status is distinct from 'pending' then
    raise exception 'not found';
  end if;

  v_drop := coalesce(p_drop_ids, '{}');

  if exists (
    select 1
    from unnest(v_drop) as d(id)
    where d.id = p_keep_id
      or not exists (
        select 1
        from public.reservation_requests r
        where r.id = d.id
          and r.requester_id = v_uid
          and r.room_id = v_room
          and r.status = 'pending'
      )
  ) then
    raise exception 'invalid drop';
  end if;

  if coalesce(array_length(v_drop, 1), 0) > 0 then
    delete from public.reservation_requests
    where id = any(v_drop)
      and requester_id = v_uid
      and status = 'pending';
  end if;

  update public.reservation_requests
  set
    start_at = p_start_at,
    end_at = p_end_at,
    description = p_description,
    updated_at = now()
  where id = p_keep_id
    and requester_id = v_uid
    and status = 'pending';

  return p_keep_id;
end;
$$;

revoke all on function public.combine_own_pending_request(uuid, uuid[], timestamptz, timestamptz, text) from public;
grant execute on function public.combine_own_pending_request(uuid, uuid[], timestamptz, timestamptz, text) to authenticated;
