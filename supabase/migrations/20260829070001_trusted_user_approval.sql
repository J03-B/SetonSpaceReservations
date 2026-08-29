-- Manager approval grants Trusted User. Guests and Users can be trusted; roles stay protected.

create or replace function public.approve_trusted_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  update public.users
  set access_level = 'trusted'::public.access_level
  where id = p_user_id
    and account_status = 'active'
    and access_level in ('none', 'requester');

  if not found then
    raise exception 'user cannot be trusted';
  end if;
end;
$$;

revoke all on function public.approve_trusted_user(uuid) from public, anon;
grant execute on function public.approve_trusted_user(uuid) to authenticated;

drop policy if exists "Requesters insert own requests" on public.reservation_requests;

create policy "Requesters insert own requests"
  on public.reservation_requests for insert
  with check (
    auth.uid() = requester_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.account_status = 'active'
        and u.access_level in ('requester', 'trusted', 'manager', 'tech_admin')
        and u.email_verified_at is not null
    )
  );
