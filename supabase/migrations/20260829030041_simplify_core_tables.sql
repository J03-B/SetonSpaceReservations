-- Simplify to four core tables (owner decision 2026-08-28):
-- users, rooms, reservation_requests, confirmed_reservations

-- Tear down the previous Phase 1 schema
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;
drop trigger if exists protect_profile_sensitive_columns on public.profiles;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.sync_profile_from_auth_user() cascade;
drop function if exists public.try_auto_grant_requester(uuid, text) cascade;
drop function if exists public.protect_profile_sensitive_columns() cascade;
drop function if exists public.is_tech_admin(uuid) cascade;
drop function if exists public.is_space_manager(uuid, uuid) cascade;
drop function if exists public.get_public_availability(uuid[], timestamptz, timestamptz) cascade;

drop table if exists public.audit_events cascade;
drop table if exists public.approval_decisions cascade;
drop table if exists public.reservations cascade;
drop table if exists public.reservation_requests cascade;
drop table if exists public.space_blackouts cascade;
drop table if exists public.operating_hours cascade;
drop table if exists public.space_manager_assignments cascade;
drop table if exists public.external_access_applications cascade;
drop table if exists public.role_assignments cascade;
drop table if exists public.approved_domains cascade;
drop table if exists public.spaces cascade;
drop table if exists public.profiles cascade;

drop type if exists public.comment_visibility cascade;
drop type if exists public.app_role cascade;
drop type if exists public.external_access_status cascade;
drop type if exists public.reservation_request_status cascade;
drop type if exists public.manager_type cascade;
drop type if exists public.space_status cascade;
drop type if exists public.account_status cascade;
drop type if exists public.public_status cascade;

create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

create type public.account_status as enum ('active', 'suspended', 'revoked');
create type public.access_level as enum ('none', 'requester', 'manager', 'tech_admin');
create type public.room_status as enum ('active', 'archived');
create type public.request_status as enum ('pending', 'declined', 'cancelled', 'approved');
create type public.reservation_status as enum ('active', 'cancelled');
create type public.public_status as enum ('Available', 'Pending', 'Reserved', 'Blocked', 'Closed');

-- Users: one row per Auth account. Access level lives here.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  email_verified_at timestamptz,
  phone text,
  organization text,
  access_level public.access_level not null default 'none',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rooms: one row per reservable room
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  slug text not null unique,
  description text,
  building text,
  capacity integer,
  timezone text not null default 'America/New_York',
  rules text,
  status public.room_status not null default 'active',
  is_public boolean not null default true,
  manager_id uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reservation requests awaiting a decision
create table public.reservation_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id),
  requester_id uuid not null references public.users (id),
  title text,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

-- Confirmed reservations only
create table public.confirmed_reservations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.reservation_requests (id),
  room_id uuid not null references public.rooms (id),
  requester_id uuid not null references public.users (id),
  title text,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  approved_by uuid references public.users (id),
  approved_at timestamptz not null default now(),
  status public.reservation_status not null default 'active',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index idx_rooms_status_public on public.rooms (status, is_public);
create index idx_requests_room_time on public.reservation_requests (room_id, start_at, end_at);
create index idx_confirmed_room_time on public.confirmed_reservations (room_id, start_at, end_at);

alter table public.confirmed_reservations add constraint confirmed_reservations_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status = 'active' and cancelled_at is null);

insert into public.rooms (
  name, short_name, slug, description, building, timezone, status, is_public
) values
  ('Bertoni', 'Bertoni', 'bertoni', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true),
  ('DMC', 'DMC', 'dmc', 'Shared facility space. Capacity, hours, and rules will be configured before launch.', 'Seton campus', 'America/New_York', 'active', true),
  ('Fatima', 'Fatima', 'fatima', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true),
  ('Faustina Hall', 'Faustina', 'faustina-hall', 'Shared facility space. Capacity, hours, and rules will be configured before launch.', 'Seton campus', 'America/New_York', 'active', true),
  ('Francis', 'Francis', 'francis', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true),
  ('Gym', 'Gym', 'gym', 'Athletic facility space. Capacity, hours, and rules will be configured before launch.', 'Seton campus', 'America/New_York', 'active', true),
  ('Innocents', 'Innocents', 'innocents', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true),
  ('Joseph', 'Joseph', 'joseph', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true),
  ('Neri', 'Neri', 'neri', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true),
  ('Patrick', 'Patrick', 'patrick', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true),
  ('Savio', 'Savio', 'savio', 'Corpus Christi classroom.', 'Corpus Christi', 'America/New_York', 'active', true)
on conflict (slug) do nothing;

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
      and access_level in ('manager', 'tech_admin')
      and account_status = 'active'
  );
$$;

create or replace function public.protect_user_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.id := old.id;
    new.email := old.email;
    new.email_verified_at := old.email_verified_at;
    new.access_level := old.access_level;
    new.account_status := old.account_status;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_user_columns
  before update on public.users
  for each row execute function public.protect_user_columns();

-- Assumption: setonschool.net (masterplan open decision #2)
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
    id, full_name, email, email_verified_at, phone, organization
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    new.email_confirmed_at,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'organization', '')
  );

  if new.email_confirmed_at is not null then
    perform public.apply_verified_access(new.id, new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    email = lower(new.email),
    email_verified_at = new.email_confirmed_at,
    updated_at = now()
  where id = new.id;

  if new.email_confirmed_at is not null then
    perform public.apply_verified_access(new.id, new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email_confirmed_at, email on auth.users
  for each row execute function public.sync_user_from_auth();

-- Privacy-safe public calendar: status and time only
create or replace function public.get_public_availability(
  p_room_ids uuid[],
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table (
  space_id uuid,
  space_slug text,
  space_name text,
  start_at timestamptz,
  end_at timestamptz,
  public_status public.public_status,
  activity_category text,
  request_updated_at timestamptz,
  timezone text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cr.room_id,
    rm.slug,
    rm.name,
    cr.start_at,
    cr.end_at,
    'Reserved'::public.public_status,
    'Other',
    cr.updated_at,
    rm.timezone
  from public.confirmed_reservations cr
  join public.rooms rm on rm.id = cr.room_id
  where cr.room_id = any(p_room_ids)
    and cr.status = 'active'
    and cr.cancelled_at is null
    and cr.start_at < p_end_at
    and cr.end_at > p_start_at

  union all

  select
    rr.room_id,
    rm.slug,
    rm.name,
    rr.start_at,
    rr.end_at,
    'Pending'::public.public_status,
    'Other',
    rr.updated_at,
    rm.timezone
  from public.reservation_requests rr
  join public.rooms rm on rm.id = rr.room_id
  where rr.room_id = any(p_room_ids)
    and rr.status = 'pending'
    and rr.start_at < p_end_at
    and rr.end_at > p_start_at;
$$;

alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.reservation_requests enable row level security;
alter table public.confirmed_reservations enable row level security;

create policy "Public can view active public rooms"
  on public.rooms for select
  using (status = 'active' and is_public = true);

create policy "Staff can manage rooms"
  on public.rooms for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Users can view own row"
  on public.users for select
  using (auth.uid() = id or public.is_staff());

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Requesters view own requests"
  on public.reservation_requests for select
  using (auth.uid() = requester_id or public.is_staff());

create policy "Requesters insert own requests"
  on public.reservation_requests for insert
  with check (
    auth.uid() = requester_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.account_status = 'active'
        and u.access_level in ('requester', 'manager', 'tech_admin')
        and u.email_verified_at is not null
    )
  );

create policy "Staff manage requests"
  on public.reservation_requests for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "Users view own confirmed reservations"
  on public.confirmed_reservations for select
  using (auth.uid() = requester_id or public.is_staff());

create policy "Staff manage confirmed reservations"
  on public.confirmed_reservations for all
  using (public.is_staff())
  with check (public.is_staff());

grant execute on function public.get_public_availability(uuid[], timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_user_from_auth() from public, anon, authenticated;
revoke execute on function public.apply_verified_access(uuid, text) from public, anon, authenticated;
revoke execute on function public.protect_user_columns() from public, anon, authenticated;
