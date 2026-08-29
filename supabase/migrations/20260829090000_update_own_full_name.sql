-- Users may change their own display name. Authorization is auth.uid(), not client roles.

create or replace function public.update_own_full_name(p_full_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_saved text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  v_name := trim(both from coalesce(p_full_name, ''));
  if char_length(v_name) < 2 then
    raise exception 'Enter your full name.';
  end if;

  update public.users
  set full_name = v_name
  where id = auth.uid()
  returning full_name into v_saved;

  if v_saved is null then
    raise exception 'Profile not found';
  end if;

  return v_saved;
end;
$$;

revoke all on function public.update_own_full_name(text) from public, anon;
grant execute on function public.update_own_full_name(text) to authenticated;
