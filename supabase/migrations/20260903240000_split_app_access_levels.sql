-- Split users.access_level into Spaces and Help columns with the same enum.

alter table public.users
  rename column access_level to spaces_access_level;

alter table public.users
  add column help_access_level public.access_level not null default 'guest';

update public.users
set help_access_level = spaces_access_level;

comment on column public.users.spaces_access_level is
  'Seton Spaces: admin, manager, trusted user, user, guest';

comment on column public.users.help_access_level is
  'Seton Help: admin, manager, trusted user, user, guest';

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
        spaces_access_level = 'admin'
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
      and spaces_access_level in ('manager', 'admin')
      and account_status = 'active'
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
      and (
        help_access_level = 'admin'
        or lower(email) = 'semperjoey@gmail.com'
      )
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
      and help_access_level in ('manager', 'admin')
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
  set spaces_access_level = case
    when spaces_access_level = 'admin' then spaces_access_level
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
    set
      spaces_access_level = 'admin'::public.access_level,
      help_access_level = 'admin'::public.access_level
    where id = p_user_id
      and account_status = 'active';
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  spaces_level public.access_level := 'guest';
  help_level public.access_level := 'guest';
begin
  if lower(new.email) = 'semperjoey@gmail.com' then
    spaces_level := 'admin';
    help_level := 'admin';
  elsif public.is_campus_manager_email(new.email) then
    spaces_level := 'manager';
  end if;

  insert into public.users (
    id, full_name, email, email_verified_at, spaces_access_level, help_access_level
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    new.email_confirmed_at,
    spaces_level,
    help_level
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
  set spaces_access_level = 'trusted user'::public.access_level
  where id = p_user_id
    and account_status = 'active'
    and spaces_access_level in ('guest', 'user');

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
    coalesce(u.spaces_access_level::text, 'guest')
  from auth.users au
  left join public.users u on u.id = au.id
  where au.email is not null
    and au.id <> auth.uid();
end;
$$;

create or replace function public.protect_user_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if not public.is_staff() then
      new.id := old.id;
      new.email := old.email;
      new.email_verified_at := old.email_verified_at;
      new.spaces_access_level := old.spaces_access_level;
      new.account_status := old.account_status;
      new.created_at := old.created_at;
    end if;
    if not public.is_help_staff() then
      new.help_access_level := old.help_access_level;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.help_reviewers()
returns table (id uuid, email text, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email, u.full_name
  from public.users u
  where u.account_status = 'active'
    and u.help_access_level in ('admin', 'manager');
$$;

create or replace function public.can_see_ticket(p_ticket_id uuid, p_requester uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_help_admin()
    or public.is_help_staff()
    or p_requester = auth.uid()
    or exists (
      select 1
      from public.tasks task
      join public.tickets t on t.id = task.ticket_id
      where task.ticket_id = p_ticket_id
        and t.classification_status = 'approved'
        and (
          auth.uid() = any (task.manager_ids)
          or auth.uid() = any (task.worker_ids)
        )
    );
$$;

create or replace function public.can_see_task_row(
  p_ticket_id uuid,
  p_manager_ids uuid[],
  p_worker_ids uuid[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_help_admin()
    or public.is_help_staff()
    or exists (
      select 1 from public.tickets t
      where t.id = p_ticket_id
        and t.requester_id = auth.uid()
    )
    or (
      exists (
        select 1 from public.tickets t
        where t.id = p_ticket_id
          and t.classification_status = 'approved'
      )
      and (
        auth.uid() = any (p_manager_ids)
        or auth.uid() = any (p_worker_ids)
      )
    );
$$;

create or replace function public.ticket_my_roles()
returns table (is_manager boolean, is_worker boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_help_staff()
    or exists (
      select 1
      from public.tasks task
      join public.tickets t on t.id = task.ticket_id
      where t.classification_status = 'approved'
        and auth.uid() = any (task.manager_ids)
    ),
    exists (
      select 1
      from public.tasks task
      join public.tickets t on t.id = task.ticket_id
      where t.classification_status = 'approved'
        and auth.uid() = any (task.worker_ids)
    );
$$;

drop policy if exists "Requesters insert own reservations" on public.reservations;
create policy "Requesters insert own reservations"
  on public.reservations for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.account_status = 'active'
        and u.spaces_access_level in ('user', 'trusted user', 'manager', 'admin')
        and u.email_verified_at is not null
    )
    and exists (
      select 1 from public.rooms rm
      where rm.id = room_id
        and rm.is_active = true
    )
  );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    public.is_help_admin()
    or public.is_help_staff()
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and t.requester_id = auth.uid()
        and t.classification_status = 'pending'
        and public.ticket_email_verified()
    )
  );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_help_admin() or public.is_help_staff());

drop policy if exists tickets_people_read on public.users;
create policy tickets_people_read on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_help_admin()
    or public.is_help_staff()
    or public.is_staff()
    or exists (
      select 1
      from public.tasks task
      where auth.uid() = any (task.manager_ids)
         or auth.uid() = any (task.worker_ids)
    )
  );

drop policy if exists tickets_attachments_insert on storage.objects;
create policy tickets_attachments_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'help-attachments'
    and (
      (
        (storage.foldername(name))[1] = auth.uid()::text
        and public.ticket_email_verified()
      )
      or (
        (storage.foldername(name))[1] = 'catalog'
        and public.is_help_admin()
      )
    )
  );

drop policy if exists tickets_attachments_update on storage.objects;
create policy tickets_attachments_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'help-attachments'
    and (storage.foldername(name))[1] = 'catalog'
    and public.is_help_admin()
  )
  with check (
    bucket_id = 'help-attachments'
    and (storage.foldername(name))[1] = 'catalog'
    and public.is_help_admin()
  );

grant execute on function public.is_help_admin() to authenticated;
grant execute on function public.is_help_staff() to authenticated;
