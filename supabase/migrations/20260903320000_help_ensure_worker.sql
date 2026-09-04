-- Allow Help managers/admins to promote eligible users to worker.
create or replace function public.help_ensure_worker(
  p_email text,
  p_full_name text default null
)
returns table (id uuid, email text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text := lower(trim(p_email));
  actor uuid := auth.uid();
  target public.users%rowtype;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  if not (
    public.is_help_admin()
    or public.is_help_staff()
    or exists (
      select 1
      from public.users u
      where u.id = actor
        and u.account_status = 'active'
        and u.help_access_level in ('manager', 'admin')
    )
  ) then
    raise exception 'Not authorized';
  end if;

  if wanted is null or wanted = '' or position('@' in wanted) = 0 then
    raise exception 'Enter a valid email address.';
  end if;

  select * into target
  from public.users u
  where lower(u.email) = wanted
  limit 1;

  if target.id is null then
    return;
  end if;

  if target.account_status is distinct from 'active' then
    raise exception 'That account is not active.';
  end if;

  if target.help_access_level in ('user', 'guest', 'trusted user', 'trusted') then
    update public.users
    set
      help_access_level = 'worker',
      full_name = case
        when coalesce(nullif(trim(full_name), ''), '') = '' and nullif(trim(p_full_name), '') is not null
          then trim(p_full_name)
        else full_name
      end
    where id = target.id
    returning * into target;
  elsif target.help_access_level = 'worker' then
    if coalesce(nullif(trim(target.full_name), ''), '') = '' and nullif(trim(p_full_name), '') is not null then
      update public.users
      set full_name = trim(p_full_name)
      where id = target.id
      returning * into target;
    end if;
  else
    raise exception 'Only regular users can be invited as workers.';
  end if;

  id := target.id;
  email := target.email;
  full_name := target.full_name;
  return next;
end;
$$;

grant execute on function public.help_ensure_worker(text, text) to authenticated;
revoke execute on function public.help_ensure_worker(text, text) from anon, public;
