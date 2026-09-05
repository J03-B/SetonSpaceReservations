-- help_access_level is the only source of staff identity.
-- guest / user / trusted user never gain manager/worker powers via task or category lists.

create or replace function public.ticket_my_roles()
returns table(is_manager boolean, is_worker boolean)
language sql
stable
security definer
set search_path = public
as $$
  select public.is_help_staff(), public.is_help_worker();
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
      public.is_help_worker()
      and auth.uid() = any (p_worker_ids)
    );
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
    or (
      public.is_help_worker()
      and exists (
        select 1
        from public.tasks task
        where task.ticket_id = p_ticket_id
          and auth.uid() = any (task.worker_ids)
      )
    );
$$;

create or replace function public.can_access_ticket_chat(p_ticket_id uuid)
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
      where t.id = p_ticket_id and t.requester_id = auth.uid()
    )
    or (
      public.is_help_worker()
      and exists (
        select 1 from public.tasks tk
        where tk.ticket_id = p_ticket_id
          and auth.uid() = any (tk.worker_ids)
      )
    );
$$;
