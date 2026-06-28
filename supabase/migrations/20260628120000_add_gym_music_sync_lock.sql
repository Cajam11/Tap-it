begin;

create table if not exists public.system_locks (
  name text primary key,
  locked_until timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.system_locks enable row level security;

create or replace function public.try_acquire_gym_music_sync_lock(
  p_lock_seconds integer default 12
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_acquired boolean;
  v_lock_seconds integer;
begin
  v_lock_seconds := greatest(1, least(coalesce(p_lock_seconds, 12), 60));

  insert into public.system_locks as locks (
    name,
    locked_until,
    updated_at
  )
  values (
    'gym_music_current_playback',
    now() + make_interval(secs => v_lock_seconds),
    now()
  )
  on conflict (name) do update
  set locked_until = excluded.locked_until,
      updated_at = now()
  where locks.locked_until <= now()
  returning true into v_acquired;

  return coalesce(v_acquired, false);
end;
$$;

revoke all on table public.system_locks from public, anon, authenticated;
revoke all on function public.try_acquire_gym_music_sync_lock(integer)
  from public, anon, authenticated;
grant execute on function public.try_acquire_gym_music_sync_lock(integer)
  to service_role;

commit;
