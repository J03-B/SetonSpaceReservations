-- Developer helpers (enum value already added).

create or replace function public.is_tech_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and account_status = 'active'
      and spaces_access_level = 'developer'
  );
$$;

create or replace function public.is_help_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and account_status = 'active'
      and help_access_level = 'developer'
  );
$$;

create or replace function public.is_tech_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and account_status = 'active'
      and spaces_access_level in ('admin', 'developer')
  );
$$;

create or replace function public.is_help_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and account_status = 'active'
      and help_access_level in ('admin', 'developer')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and spaces_access_level in ('manager', 'admin', 'developer')
      and account_status = 'active'
  );
$$;

create or replace function public.is_help_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and help_access_level in ('manager', 'admin', 'developer')
      and account_status = 'active'
  );
$$;

create or replace function public.apply_verified_access(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or p_email = '' then
    return;
  end if;

  if public.is_campus_manager_email(p_email) then
    perform public.assign_campus_manager(p_user_id);
    update public.users
    set help_access_level = case
      when help_access_level in ('worker', 'manager', 'admin', 'developer', 'trusted user')
        then help_access_level
      else 'trusted user'::public.access_level
    end
    where id = p_user_id
      and account_status = 'active';
    return;
  end if;

  if split_part(lower(p_email), '@', 2) = 'setonschool.net' then
    update public.users
    set
      spaces_access_level = case
        when spaces_access_level in ('manager', 'admin', 'developer', 'trusted user')
          then spaces_access_level
        else 'trusted user'::public.access_level
      end,
      help_access_level = case
        when help_access_level in ('worker', 'manager', 'admin', 'developer', 'trusted user')
          then help_access_level
        else 'trusted user'::public.access_level
      end
    where id = p_user_id
      and account_status = 'active';
  else
    update public.users
    set help_access_level = case
      when help_access_level in ('worker', 'manager', 'admin', 'developer', 'trusted user', 'user')
        then help_access_level
      else 'user'::public.access_level
    end
    where id = p_user_id
      and account_status = 'active';
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  spaces_level public.access_level := 'guest';
  help_level public.access_level := 'guest';
  existing public.users%rowtype;
  claimed_name text;
begin
  if lower(new.email) = 'semperjoey@gmail.com' then
    spaces_level := 'developer';
    help_level := 'developer';
  elsif public.is_campus_manager_email(new.email) then
    spaces_level := 'manager';
  end if;

  select * into existing
  from public.users
  where lower(email) = lower(new.email)
    and id is distinct from new.id
  limit 1;

  if found then
    claimed_name := coalesce(
      nullif(existing.full_name, ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    );
    help_level := existing.help_access_level;
    spaces_level := case
      when existing.spaces_access_level in ('manager', 'admin', 'developer', 'trusted user')
        then existing.spaces_access_level
      else spaces_level
    end;

    perform public.reassign_help_user_refs(existing.id, new.id);
    delete from public.users where id = existing.id;
    delete from auth.users where id = existing.id;

    insert into public.users (
      id, full_name, email, email_verified_at, spaces_access_level, help_access_level, is_placeholder
    ) values (
      new.id,
      claimed_name,
      lower(new.email),
      new.email_confirmed_at,
      spaces_level,
      help_level,
      false
    );
  else
    insert into public.users (
      id, full_name, email, email_verified_at, spaces_access_level, help_access_level, is_placeholder
    ) values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
      lower(new.email),
      new.email_confirmed_at,
      spaces_level,
      help_level,
      false
    );
  end if;

  if new.email_confirmed_at is not null then
    perform public.apply_verified_access(new.id, new.email);
  end if;

  return new;
end;
$$;

drop function if exists public.list_accounts_for_admin();

create or replace function public.list_accounts_for_admin()
returns table (
  id uuid,
  email text,
  full_name text,
  access_level text,
  help_access_level text,
  account_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_tech_admin() and not public.is_help_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    u.id,
    lower(u.email::text),
    coalesce(nullif(u.full_name, ''), split_part(u.email::text, '@', 1)),
    coalesce(u.spaces_access_level::text, 'guest'),
    coalesce(u.help_access_level::text, 'guest'),
    coalesce(u.account_status::text, 'active')
  from public.users u
  where u.email is not null
    and coalesce(u.is_placeholder, false) = false
    and u.id <> auth.uid()
  order by lower(u.email);
end;
$$;

create or replace function public.set_user_account_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tech_admin() and not public.is_help_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('active', 'suspended', 'revoked') then
    raise exception 'invalid status';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot change your own account status';
  end if;
  if exists (
    select 1 from public.users
    where id = p_user_id
      and (
        help_access_level in ('admin', 'developer')
        or spaces_access_level in ('admin', 'developer')
      )
  ) then
    raise exception 'cannot change status of admin or developer accounts';
  end if;

  update public.users
  set account_status = p_status::public.account_status
  where id = p_user_id;
end;
$$;

create or replace function public.promote_user_to_trusted(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tech_admin() and not public.is_help_admin() then
    raise exception 'not authorized';
  end if;

  update public.users
  set
    spaces_access_level = case
      when spaces_access_level in ('guest', 'user') then 'trusted user'::public.access_level
      else spaces_access_level
    end,
    help_access_level = case
      when help_access_level in ('guest', 'user') then 'trusted user'::public.access_level
      else help_access_level
    end,
    account_status = 'active'
  where id = p_user_id
    and account_status in ('active', 'suspended', 'revoked');
end;
$$;

-- Bootstrap account becomes developer (existing row).
update public.users
set
  spaces_access_level = 'developer',
  help_access_level = 'developer'
where lower(email) = 'semperjoey@gmail.com';

grant execute on function public.is_tech_developer() to authenticated;
grant execute on function public.is_help_developer() to authenticated;
grant execute on function public.is_tech_admin() to authenticated;
grant execute on function public.is_help_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_help_staff() to authenticated;
grant execute on function public.list_accounts_for_admin() to authenticated;
grant execute on function public.set_user_account_status(uuid, text) to authenticated;
grant execute on function public.promote_user_to_trusted(uuid) to authenticated;

revoke execute on function public.is_tech_developer() from anon, public;
revoke execute on function public.is_help_developer() from anon, public;
revoke execute on function public.set_user_account_status(uuid, text) from anon, public;
revoke execute on function public.promote_user_to_trusted(uuid) from anon, public;
