-- Seton Space Reservations — initial schema (Phase 1 Foundation)
-- Reference: docs/seton-space-reservations-masterplan.md §19

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type account_status as enum ('active', 'suspended', 'revoked');
create type space_status as enum ('active', 'archived');
create type manager_type as enum ('Primary', 'Backup');
create type reservation_request_status as enum (
  'Draft', 'Submitted', 'Under Review', 'Changes Requested', 'Resubmitted',
  'Approved', 'Declined', 'Cancelled by Requester', 'Cancelled by Manager',
  'Expired', 'Completed'
);
create type external_access_status as enum (
  'Not Submitted', 'Submitted', 'Under Review', 'Changes Requested',
  'Approved', 'Declined', 'Suspended', 'Revoked'
);
create type public_status as enum ('Available', 'Pending', 'Reserved', 'Blocked', 'Closed');
create type app_role as enum ('tech_admin', 'space_manager', 'requester');
create type comment_visibility as enum ('requester_and_managers', 'managers_only', 'tech_admin_only');

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  normalized_email text not null unique,
  email_verified_at timestamptz,
  phone text,
  organization text,
  affiliation text,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

-- Approved email domains (configurable — masterplan §9.5)
create table public.approved_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  is_active boolean not null default true,
  auto_grant_requester boolean not null default true,
  required_identity_provider text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role assignments
create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role app_role not null,
  scope_type text not null default 'global',
  scope_id uuid,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  assigned_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (user_id, role, scope_type, scope_id)
);

-- External access applications
create table public.external_access_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization text not null,
  reason text not null,
  sponsor_contact text,
  status external_access_status not null default 'Not Submitted',
  requester_message text,
  admin_reason_category text,
  admin_public_message text,
  admin_internal_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Spaces
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  slug text not null unique,
  description text,
  building text,
  room text,
  address text,
  capacity integer,
  timezone text not null default 'America/New_York',
  status space_status not null default 'active',
  is_public boolean not null default true,
  public_rules text,
  internal_notes text,
  min_duration_minutes integer not null default 30,
  max_duration_minutes integer not null default 480,
  min_notice_minutes integer not null default 60,
  max_advance_days integer not null default 90,
  setup_buffer_minutes integer not null default 0,
  cleanup_buffer_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Space manager assignments
create table public.space_manager_assignments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  manager_type manager_type not null default 'Primary',
  is_active boolean not null default true,
  assigned_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (space_id, user_id, manager_type)
);

-- Operating hours
create table public.operating_hours (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  effective_from date not null default current_date,
  effective_until date
);

-- Space blackouts / availability blocks
create table public.space_blackouts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  type text not null default 'administrative',
  public_status public_status not null default 'Blocked',
  public_label text,
  internal_reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

-- Reservation requests
create table public.reservation_requests (
  id uuid primary key default gen_random_uuid(),
  confirmation_number text unique,
  requester_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id),
  status reservation_request_status not null default 'Draft',
  title text,
  category text,
  description text,
  organization text,
  expected_attendance integer,
  start_at timestamptz not null,
  end_at timestamptz not null,
  setup_buffer_minutes integer not null default 0,
  cleanup_buffer_minutes integer not null default 0,
  equipment_needs text,
  accessibility_needs text,
  food_beverage text,
  custodial_needs text,
  security_needs text,
  public_event boolean not null default false,
  requester_notes text,
  submitted_at timestamptz,
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (end_at > start_at)
);

-- Approved reservations
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_request_id uuid not null unique references public.reservation_requests (id),
  space_id uuid not null references public.spaces (id),
  requester_id uuid not null references public.profiles (id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  effective_start_at timestamptz not null,
  effective_end_at timestamptz not null,
  status text not null default 'active',
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  conditions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (end_at > start_at),
  check (effective_end_at > effective_start_at)
);

-- Approval decisions
create table public.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  reservation_request_id uuid not null references public.reservation_requests (id) on delete cascade,
  action text not null,
  reason_category text,
  public_message text,
  internal_note text,
  conditions jsonb,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz not null default now()
);

-- Audit events (append-only)
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id),
  actor_type text not null default 'user',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  reason text,
  source_ip_or_hash text,
  user_agent_or_hash text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_spaces_status_public on public.spaces (status, is_public);
create index idx_reservation_requests_space_status on public.reservation_requests (space_id, status);
create index idx_reservations_space_time on public.reservations (space_id, effective_start_at, effective_end_at);
create index idx_space_blackouts_space_time on public.space_blackouts (space_id, start_at, end_at);
create index idx_audit_events_entity on public.audit_events (entity_type, entity_id);

-- Prevent overlapping approved reservations (excluding cancelled)
create extension if not exists btree_gist;
alter table public.reservations add constraint reservations_no_overlap
  exclude using gist (
    space_id with =,
    tstzrange(effective_start_at, effective_end_at, '[)') with &&
  ) where (status = 'active' and cancelled_at is null);

-- Helper: check if user is tech admin
create or replace function public.is_tech_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.role_assignments
    where user_id = p_user_id
      and role = 'tech_admin'
      and (effective_until is null or effective_until > now())
  );
$$;

-- Helper: check if user manages a space
create or replace function public.is_space_manager(p_user_id uuid, p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.space_manager_assignments
    where user_id = p_user_id
      and space_id = p_space_id
      and is_active = true
  ) or public.is_tech_admin(p_user_id);
$$;

-- Public availability RPC — privacy-safe output only
create or replace function public.get_public_availability(
  p_space_ids uuid[],
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table (
  space_id uuid,
  space_slug text,
  space_name text,
  start_at timestamptz,
  end_at timestamptz,
  public_status public_status,
  activity_category text,
  request_updated_at timestamptz,
  timezone text
)
language sql
stable
security definer
set search_path = public
as $$
  -- Approved reservations
  select
    r.space_id,
    s.slug,
    s.name,
    r.effective_start_at,
    r.effective_end_at,
    'Reserved'::public_status,
    coalesce(rr.category, 'Other'),
    rr.updated_at,
    s.timezone
  from public.reservations r
  join public.spaces s on s.id = r.space_id
  left join public.reservation_requests rr on rr.id = r.reservation_request_id
  where r.space_id = any(p_space_ids)
    and r.status = 'active'
    and r.cancelled_at is null
    and r.effective_start_at < p_end_at
    and r.effective_end_at > p_start_at

  union all

  -- Pending holds (Submitted, Under Review, Changes Requested, Resubmitted)
  select
    rr.space_id,
    s.slug,
    s.name,
    rr.start_at - (rr.setup_buffer_minutes || ' minutes')::interval,
    rr.end_at + (rr.cleanup_buffer_minutes || ' minutes')::interval,
    'Pending'::public_status,
    coalesce(rr.category, 'Other'),
    rr.updated_at,
    s.timezone
  from public.reservation_requests rr
  join public.spaces s on s.id = rr.space_id
  where rr.space_id = any(p_space_ids)
    and rr.status in ('Submitted', 'Under Review', 'Changes Requested', 'Resubmitted')
    and rr.start_at < p_end_at
    and rr.end_at > p_start_at

  union all

  -- Administrative blocks
  select
    b.space_id,
    s.slug,
    s.name,
    b.start_at,
    b.end_at,
    b.public_status,
    'Other',
    b.created_at,
    s.timezone
  from public.space_blackouts b
  join public.spaces s on s.id = b.space_id
  where b.space_id = any(p_space_ids)
    and b.start_at < p_end_at
    and b.end_at > p_start_at;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.approved_domains enable row level security;
alter table public.role_assignments enable row level security;
alter table public.external_access_applications enable row level security;
alter table public.spaces enable row level security;
alter table public.space_manager_assignments enable row level security;
alter table public.operating_hours enable row level security;
alter table public.space_blackouts enable row level security;
alter table public.reservation_requests enable row level security;
alter table public.reservations enable row level security;
alter table public.approval_decisions enable row level security;
alter table public.audit_events enable row level security;

-- Public read: active public spaces
create policy "Public can view active public spaces"
  on public.spaces for select
  using (status = 'active' and is_public = true);

-- Public read: operating hours for public spaces
create policy "Public can view operating hours"
  on public.operating_hours for select
  using (
    exists (
      select 1 from public.spaces s
      where s.id = space_id and s.status = 'active' and s.is_public = true
    )
  );

-- Profiles: users read/update own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_tech_admin(auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Requesters see own requests
create policy "Requesters view own reservation requests"
  on public.reservation_requests for select
  using (
    auth.uid() = requester_id
    or public.is_space_manager(auth.uid(), space_id)
    or public.is_tech_admin(auth.uid())
  );

-- Managers manage assigned spaces
create policy "Managers view assigned space reservations"
  on public.reservations for select
  using (
    public.is_space_manager(auth.uid(), space_id)
    or auth.uid() = requester_id
    or public.is_tech_admin(auth.uid())
  );

-- Tech admin policies (broad read for support)
create policy "Tech admin manages approved domains"
  on public.approved_domains for all
  using (public.is_tech_admin(auth.uid()));

create policy "Tech admin manages role assignments"
  on public.role_assignments for all
  using (public.is_tech_admin(auth.uid()));

create policy "Tech admin views audit events"
  on public.audit_events for select
  using (public.is_tech_admin(auth.uid()));

-- External access: users see own application
create policy "Users view own external access application"
  on public.external_access_applications for select
  using (auth.uid() = user_id or public.is_tech_admin(auth.uid()));

create policy "Users insert own external access application"
  on public.external_access_applications for insert
  with check (auth.uid() = user_id);

-- Grant execute on public availability to anon and authenticated
grant execute on function public.get_public_availability(uuid[], timestamptz, timestamptz) to anon, authenticated;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_auto_grant boolean;
begin
  insert into public.profiles (id, full_name, normalized_email, email_verified_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(new.email),
    new.email_confirmed_at
  );

  v_domain := split_part(lower(new.email), '@', 2);
  select auto_grant_requester into v_auto_grant
  from public.approved_domains
  where domain = v_domain and is_active = true
  limit 1;

  if v_auto_grant then
    insert into public.role_assignments (user_id, role, scope_type)
    values (new.id, 'requester', 'global');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
