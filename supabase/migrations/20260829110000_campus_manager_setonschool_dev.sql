-- jbenin@setonschool.dev is a campus-wide manager for every building on signup.

create or replace function public.is_campus_manager_email(p_email text)
returns boolean
language sql
immutable
as $$
  select lower(p_email) in (
    'jbenin@setonschool.net',
    'jbenin@setonschool.dev'
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

  if lower(p_email) = 'semperjoey@gmail.com' then
    update public.users
    set access_level = 'tech_admin'::public.access_level
    where id = p_user_id
      and account_status = 'active';
    return;
  end if;

  if public.is_campus_manager_email(p_email) then
    perform public.assign_campus_manager(p_user_id);
    return;
  end if;

  if split_part(lower(p_email), '@', 2) = 'setonschool.net' then
    update public.users
    set access_level = case
      when access_level in ('manager', 'tech_admin') then access_level
      else 'requester'::public.access_level
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
begin
  insert into public.users (
    id, full_name, email, email_verified_at, phone, organization, access_level
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    new.email_confirmed_at,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'organization', ''),
    case
      when lower(new.email) = 'semperjoey@gmail.com' then 'tech_admin'::public.access_level
      when public.is_campus_manager_email(new.email) then 'manager'::public.access_level
      else 'none'::public.access_level
    end
  );

  if new.email_confirmed_at is not null then
    perform public.apply_verified_access(new.id, new.email);
  end if;

  return new;
end;
$$;

do $$
declare
  campus_manager_id uuid;
begin
  for campus_manager_id in
    select id
    from public.users
    where public.is_campus_manager_email(email)
      and account_status = 'active'
  loop
    perform public.assign_campus_manager(campus_manager_id);
  end loop;
end;
$$;

grant execute on function public.is_campus_manager_email(text) to anon, authenticated;
revoke execute on function public.assign_campus_manager(uuid) from public, anon, authenticated;
