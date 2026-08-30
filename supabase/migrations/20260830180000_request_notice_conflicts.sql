-- Overlapping pending requests and confirmed reservations for the manager notice.
-- Requesters cannot read other people's rows, so this is security definer.

create or replace function public.request_notice_conflicts(p_request_id uuid)
returns table (
  kind text,
  start_at timestamptz,
  end_at timestamptz,
  party_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select conflicts.kind, conflicts.start_at, conflicts.end_at, conflicts.party_name
  from public.reservation_requests req
  join lateral (
    select
      'pending'::text as kind,
      rr.start_at,
      rr.end_at,
      coalesce(nullif(trim(u.full_name), ''), u.email, 'Requester') as party_name
    from public.reservation_requests rr
    left join public.users u on u.id = rr.requester_id
    where rr.room_id = req.room_id
      and rr.id <> req.id
      and rr.status = 'pending'
      and rr.start_at < req.end_at
      and rr.end_at > req.start_at
    union all
    select
      'confirmed'::text,
      rc.start_at,
      rc.end_at,
      coalesce(nullif(trim(u.full_name), ''), u.email, 'Requester')
    from public.reservations_confirmed rc
    left join public.users u on u.id = rc.requester_id
    where rc.room_id = req.room_id
      and rc.status = 'active'
      and rc.start_at < req.end_at
      and rc.end_at > req.start_at
  ) conflicts on true
  where req.id = p_request_id
    and (
      req.requester_id = auth.uid()
      or public.manages_room(req.room_id)
    )
  order by conflicts.start_at;
$$;

revoke all on function public.request_notice_conflicts(uuid) from public;
grant execute on function public.request_notice_conflicts(uuid) to authenticated;
