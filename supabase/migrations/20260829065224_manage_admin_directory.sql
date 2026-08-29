-- Admin directory includes Auth accounts that have not verified email yet.
-- Trusted access approval is Tech Admin only.

create or replace function public.list_accounts_for_admin()
returns table (
  id uuid,
  email text,
  full_name text,
  access_level text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_tech_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    au.id,
    lower(au.email::text),
    coalesce(
      nullif(u.full_name, ''),
      nullif(au.raw_user_meta_data->>'full_name', ''),
      split_part(au.email::text, '@', 1)
    ),
    coalesce(u.access_level::text, 'none')
  from auth.users au
  left join public.users u on u.id = au.id
  where au.email is not null
    and au.id <> auth.uid();
end;
$$;

create or replace function public.approve_trusted_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tech_admin() then
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

revoke all on function public.list_accounts_for_admin() from public, anon;
grant execute on function public.list_accounts_for_admin() to authenticated;
