-- Campus manager for all buildings, and route request visibility by room manager.
-- Decision: D-2026-08-29-manage-abilities

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
        access_level = 'tech_admin'
        or lower(email) = 'semperjoey@gmail.com'
      )
  );
$$;

create or replace function public.manages_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_tech_admin()
    or exists (
      select 1 from public.rooms
      where id = p_room_id
        and manager_id = auth.uid()
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
    when access_level = 'tech_admin' then access_level
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
    set access_level = 'tech_admin'::public.access_level
    where id = p_user_id
      and account_status = 'active';
    return;
  end if;

  if lower(p_email) = 'jbenin@setonschool.net' then
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
      when lower(new.email) = 'jbenin@setonschool.net' then 'manager'::public.access_level
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
  select id into campus_manager_id
  from public.users
  where lower(email) = 'jbenin@setonschool.net'
    and account_status = 'active';

  if campus_manager_id is not null then
    perform public.assign_campus_manager(campus_manager_id);
  end if;
end;
$$;

drop policy if exists "Requesters view own requests" on public.reservation_requests;
create policy "Requesters view own requests"
  on public.reservation_requests for select
  using (
    auth.uid() = requester_id
    or public.manages_room(room_id)
  );

drop policy if exists "Staff manage requests" on public.reservation_requests;
create policy "Staff manage requests"
  on public.reservation_requests for update
  using (public.manages_room(room_id))
  with check (public.manages_room(room_id));

drop policy if exists "Users view own confirmed reservations" on public.confirmed_reservations;
create policy "Users view own confirmed reservations"
  on public.confirmed_reservations for select
  using (
    auth.uid() = requester_id
    or public.manages_room(room_id)
  );

drop policy if exists "Staff manage confirmed reservations" on public.confirmed_reservations;
create policy "Staff manage confirmed reservations"
  on public.confirmed_reservations for all
  using (public.manages_room(room_id))
  with check (public.manages_room(room_id));

grant execute on function public.is_tech_admin() to anon, authenticated;
grant execute on function public.manages_room(uuid) to anon, authenticated;
revoke execute on function public.assign_campus_manager(uuid) from public, anon, authenticated;
