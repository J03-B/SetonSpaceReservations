-- public.users no longer has phone or organization (account form decision).
-- handle_new_user still inserted those columns, so new sign-ups failed.

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
