-- Access levels come from the users table only.
-- semperjoey@gmail.com is no longer treated as always-admin.

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
      and spaces_access_level = 'admin'
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
      and help_access_level = 'admin'
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
      when help_access_level in ('manager', 'admin') then help_access_level
      else 'user'::public.access_level
    end
    where id = p_user_id
      and account_status = 'active';
    return;
  end if;

  if split_part(lower(p_email), '@', 2) = 'setonschool.net' then
    update public.users
    set
      spaces_access_level = case
        when spaces_access_level in ('manager', 'admin') then spaces_access_level
        else 'user'::public.access_level
      end,
      help_access_level = case
        when help_access_level in ('manager', 'admin') then help_access_level
        else 'user'::public.access_level
      end
    where id = p_user_id
      and account_status = 'active';
  end if;
end;
$$;
