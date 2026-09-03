-- Worker is a Help access level. Managers assign workers to tasks.

comment on column public.users.help_access_level is
  'Seton Help: admin, manager, worker, trusted user, user, guest';

alter table public.users
  drop constraint if exists users_spaces_access_level_not_worker;

alter table public.users
  add constraint users_spaces_access_level_not_worker
  check (spaces_access_level <> 'worker');

create or replace function public.is_help_worker()
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
      and help_access_level = 'worker'
  );
$$;

create or replace function public.help_workers()
returns table (id uuid, email text, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email, u.full_name
  from public.users u
  where u.account_status = 'active'
    and u.help_access_level = 'worker'
  order by coalesce(nullif(u.full_name, ''), u.email);
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
    public.is_help_worker()
    or exists (
      select 1
      from public.tasks task
      join public.tickets t on t.id = task.ticket_id
      where t.classification_status = 'approved'
        and auth.uid() = any (task.worker_ids)
    );
$$;

grant execute on function public.is_help_worker() to authenticated;
grant execute on function public.help_workers() to authenticated;
revoke execute on function public.is_help_worker() from anon, public;
revoke execute on function public.help_workers() from anon, public;
