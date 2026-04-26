begin;

alter table public.profiles
  add column if not exists role text;

update public.profiles
set role = 'user'
where role is null;

alter table public.profiles
  alter column role set default 'user',
  alter column role set not null;

-- Keep only role values used by the admin hierarchy.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', c.conname);
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'recepcny', 'manager', 'owner'));

create index if not exists idx_profiles_role
  on public.profiles (role);

create or replace function public.is_owner()
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
  );
end;
$$;

create or replace function public.has_admin_role(required_role text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  current_role text;
  current_rank integer;
  required_rank integer;
begin
  if auth.uid() is null or required_role is null then
    return false;
  end if;

  select p.role
    into current_role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if current_role is null then
    return false;
  end if;

  current_rank := case current_role
    when 'recepcny' then 1
    when 'manager' then 2
    when 'owner' then 3
    else 0
  end;

  required_rank := case required_role
    when 'recepcny' then 1
    when 'manager' then 2
    when 'owner' then 3
    else null
  end;

  if required_rank is null then
    return false;
  end if;

  return current_rank >= required_rank;
end;
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated, service_role;

revoke all on function public.has_admin_role(text) from public;
grant execute on function public.has_admin_role(text) to authenticated, service_role;

commit;