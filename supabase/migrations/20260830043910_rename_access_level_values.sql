-- Access levels: admin, manager, trusted user, user, guest.

alter type public.access_level rename value 'none' to 'guest';
alter type public.access_level rename value 'requester' to 'user';
alter type public.access_level rename value 'trusted' to 'trusted user';
alter type public.access_level rename value 'tech_admin' to 'admin';

alter table public.users
  alter column access_level set default 'guest'::public.access_level;

comment on column public.users.access_level is
  'admin, manager, trusted user, user, guest';

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
      and (
        access_level = 'admin'
        or lower(email) = 'semperjoey@gmail.com'
      )
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
      and access_level in ('manager', 'admin')
      and account_status = 'active'
  );
$$;

create or replace function public.assign_campus_manager(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set access_level = case
    when access_level = 'admin' then access_level
    else 'manager'::public.access_level
  end
  where id = p_user_id
    and account_status = 'active';

  update public.rooms
  set manager_id = p_user_id;
end;
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
    set access_level = 'admin'::public.access_level
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
      when access_level in ('manager', 'admin') then access_level
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
begin
  insert into public.users (
    id, full_name, email, email_verified_at, access_level
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    new.email_confirmed_at,
    case
      when lower(new.email) = 'semperjoey@gmail.com' then 'admin'::public.access_level
      when public.is_campus_manager_email(new.email) then 'manager'::public.access_level
      else 'guest'::public.access_level
    end
  );

  if new.email_confirmed_at is not null then
    perform public.apply_verified_access(new.id, new.email);
  end if;

  return new;
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
  set access_level = 'trusted user'::public.access_level
  where id = p_user_id
    and account_status = 'active'
    and access_level in ('guest', 'user');

  if not found then
    raise exception 'user cannot be trusted';
  end if;
end;
$$;

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
    coalesce(u.access_level::text, 'guest')
  from auth.users au
  left join public.users u on u.id = au.id
  where au.email is not null
    and au.id <> auth.uid();
end;
$$;

drop policy if exists "Requesters insert own requests" on public.reservation_requests;

create policy "Requesters insert own requests"
  on public.reservation_requests for insert
  with check (
    auth.uid() = requester_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.account_status = 'active'
        and u.access_level in ('user', 'trusted user', 'manager', 'admin')
        and u.email_verified_at is not null
    )
    and exists (
      select 1 from public.rooms rm
      where rm.id = room_id
        and rm.is_active = true
    )
  );
