-- Bootstrap developer is dev@setonschool.net only.
-- Joe test accounts: gmail=manager, icloud=trusted user, outlook=worker.

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
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 1)
  );

  if lower(new.email) = 'dev@setonschool.net' then
    spaces_level := 'developer';
    help_level := 'developer';
    display_name := 'Joe (DEV)';
  elsif lower(new.email) = 'semperjoey@gmail.com' then
    spaces_level := 'manager';
    help_level := 'manager';
    display_name := 'Joe (manager)';
  elsif lower(new.email) = 'semperjoey@icloud.com' then
    spaces_level := 'trusted user';
    help_level := 'trusted user';
    display_name := 'Joe (User)';
  elsif lower(new.email) = 'semperjoey@outlook.com' then
    spaces_level := 'user';
    help_level := 'worker';
    display_name := 'Joe (Worker)';
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
      coalesce(nullif(existing.full_name, ''), display_name),
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
      display_name,
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

-- Live account roles / display names
update public.users
set
  full_name = 'Joe (DEV)',
  spaces_access_level = 'developer',
  help_access_level = 'developer',
  account_status = 'active'
where lower(email) = 'dev@setonschool.net';

update public.users
set
  full_name = 'Joe (manager)',
  spaces_access_level = 'manager',
  help_access_level = 'manager',
  account_status = 'active'
where lower(email) = 'semperjoey@gmail.com';

update public.users
set
  full_name = 'Joe (User)',
  spaces_access_level = 'trusted user',
  help_access_level = 'trusted user',
  account_status = 'active'
where lower(email) = 'semperjoey@icloud.com';

-- Outlook is assigned worker (Help) + user (Spaces) on first signup via handle_new_user.
update public.users
set
  full_name = 'Joe (Worker)',
  spaces_access_level = 'user',
  help_access_level = 'worker',
  account_status = 'active'
where lower(email) = 'semperjoey@outlook.com';
