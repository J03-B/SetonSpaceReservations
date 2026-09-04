-- Verified @setonschool.net emails become trusted users on both apps.

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
      when help_access_level in ('worker', 'manager', 'admin', 'trusted user') then help_access_level
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
        when spaces_access_level in ('manager', 'admin', 'trusted user') then spaces_access_level
        else 'trusted user'::public.access_level
      end,
      help_access_level = case
        when help_access_level in ('worker', 'manager', 'admin', 'trusted user') then help_access_level
        else 'trusted user'::public.access_level
      end
    where id = p_user_id
      and account_status = 'active';
  end if;
end;
$$;

-- Manual trust approval should grant trusted on both apps.
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
  set
    spaces_access_level = case
      when spaces_access_level in ('guest', 'user') then 'trusted user'::public.access_level
      else spaces_access_level
    end,
    help_access_level = case
      when help_access_level in ('guest', 'user') then 'trusted user'::public.access_level
      else help_access_level
    end
  where id = p_user_id
    and account_status = 'active'
    and (
      spaces_access_level in ('guest', 'user')
      or help_access_level in ('guest', 'user')
    );

  if not found then
    raise exception 'user cannot be trusted';
  end if;
end;
$$;

-- Backfill already-verified Seton accounts.
update public.users
set
  spaces_access_level = case
    when spaces_access_level in ('manager', 'admin', 'trusted user') then spaces_access_level
    else 'trusted user'::public.access_level
  end,
  help_access_level = case
    when help_access_level in ('worker', 'manager', 'admin', 'trusted user') then help_access_level
    else 'trusted user'::public.access_level
  end
where email_verified_at is not null
  and account_status = 'active'
  and split_part(lower(email), '@', 2) = 'setonschool.net';
