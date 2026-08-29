-- Auth/profile hardening: own-role reads, protected columns, verify-then-grant requester access

create policy "Users can view own role assignments"
  on public.role_assignments for select
  using (auth.uid() = user_id or public.is_tech_admin(auth.uid()));

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_tech_admin(auth.uid()) then
    new.id := old.id;
    new.normalized_email := old.normalized_email;
    new.email_verified_at := old.email_verified_at;
    new.account_status := old.account_status;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_profile_sensitive_columns
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_columns();

create or replace function public.try_auto_grant_requester(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_auto_grant boolean;
begin
  if p_email is null or p_email = '' then
    return;
  end if;

  v_domain := split_part(lower(p_email), '@', 2);
  select auto_grant_requester into v_auto_grant
  from public.approved_domains
  where domain = v_domain and is_active = true
  limit 1;

  if coalesce(v_auto_grant, false) then
    insert into public.role_assignments (user_id, role, scope_type)
    select p_user_id, 'requester'::app_role, 'global'
    where not exists (
      select 1
      from public.role_assignments
      where user_id = p_user_id
        and role = 'requester'
        and scope_type = 'global'
        and scope_id is null
        and (effective_until is null or effective_until > now())
    );
  end if;
end;
$$;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    email_verified_at = new.email_confirmed_at,
    last_sign_in_at = coalesce(new.last_sign_in_at, last_sign_in_at),
    normalized_email = lower(new.email),
    updated_at = now()
  where id = new.id;

  if new.email_confirmed_at is not null then
    perform public.try_auto_grant_requester(new.id, new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email_confirmed_at, last_sign_in_at, email on auth.users
  for each row execute function public.sync_profile_from_auth_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, normalized_email, email_verified_at, phone, organization, affiliation
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    new.email_confirmed_at,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'organization', ''),
    nullif(new.raw_user_meta_data->>'affiliation', '')
  );

  if new.email_confirmed_at is not null then
    perform public.try_auto_grant_requester(new.id, new.email);
  end if;

  return new;
end;
$$;

revoke execute on function public.try_auto_grant_requester(uuid, text) from public, anon, authenticated;
revoke execute on function public.sync_profile_from_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_sensitive_columns() from public, anon, authenticated;
