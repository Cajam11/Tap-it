begin;

create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

create table if not exists private.spotify_connection (
  id text primary key default 'primary' check (id = 'primary'),
  refresh_token text not null,
  spotify_user_id text null,
  spotify_display_name text null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  refresh_token_expires_at timestamptz not null default (now() + interval '6 months'),
  last_token_error text null,
  last_token_error_at timestamptz null
);

alter table private.spotify_connection enable row level security;
revoke all on table private.spotify_connection from public;
revoke all on table private.spotify_connection from anon;
revoke all on table private.spotify_connection from authenticated;
grant select, insert, update on table private.spotify_connection to service_role;

create table if not exists public.gym_music_play_sessions (
  id uuid primary key default gen_random_uuid(),
  spotify_track_id text not null,
  spotify_track_uri text not null,
  track_name text not null,
  artist_names text[] not null default '{}',
  album_name text null,
  album_image_url text null,
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),
  progress_ms integer null check (progress_ms is null or progress_ms >= 0),
  is_playing boolean not null default false,
  spotify_started_at timestamptz null,
  played_at timestamptz not null default now(),
  ended_at timestamptz null,
  device_id text null,
  device_name text null,
  device_type text null,
  device_is_active boolean not null default false,
  device_is_restricted boolean not null default false,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gym_music_play_sessions_current_idx
  on public.gym_music_play_sessions (ended_at, last_synced_at desc);

create index if not exists gym_music_play_sessions_track_idx
  on public.gym_music_play_sessions (spotify_track_id, played_at desc);

create table if not exists public.gym_music_votes (
  id uuid primary key default gen_random_uuid(),
  play_session_id uuid not null references public.gym_music_play_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (play_session_id, user_id)
);

create index if not exists gym_music_votes_session_vote_idx
  on public.gym_music_votes (play_session_id, vote);

create table if not exists public.gym_music_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null references public.profiles(id) on delete cascade,
  spotify_track_id text not null,
  spotify_track_uri text not null,
  track_name text not null,
  artist_names text[] not null default '{}',
  album_name text null,
  album_image_url text null,
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),
  status text not null default 'pending' check (status in ('pending', 'queued', 'rejected', 'failed')),
  queued_by uuid null references public.profiles(id) on delete set null,
  queued_at timestamptz null,
  rejected_by uuid null references public.profiles(id) on delete set null,
  rejected_at timestamptz null,
  queue_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gym_music_suggestions_status_created_idx
  on public.gym_music_suggestions (status, created_at asc);

create index if not exists gym_music_suggestions_user_created_idx
  on public.gym_music_suggestions (suggested_by, created_at desc);

create or replace function public.set_gym_music_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_gym_music_play_sessions_updated_at on public.gym_music_play_sessions;
create trigger set_gym_music_play_sessions_updated_at
  before update on public.gym_music_play_sessions
  for each row
  execute function public.set_gym_music_updated_at();

drop trigger if exists set_gym_music_votes_updated_at on public.gym_music_votes;
create trigger set_gym_music_votes_updated_at
  before update on public.gym_music_votes
  for each row
  execute function public.set_gym_music_updated_at();

drop trigger if exists set_gym_music_suggestions_updated_at on public.gym_music_suggestions;
create trigger set_gym_music_suggestions_updated_at
  before update on public.gym_music_suggestions
  for each row
  execute function public.set_gym_music_updated_at();

alter table public.gym_music_play_sessions enable row level security;
alter table public.gym_music_votes enable row level security;
alter table public.gym_music_suggestions enable row level security;

drop policy if exists gym_music_play_sessions_authenticated_read on public.gym_music_play_sessions;
create policy gym_music_play_sessions_authenticated_read
  on public.gym_music_play_sessions
  for select
  to authenticated
  using (true);

drop policy if exists gym_music_votes_self_or_admin_read on public.gym_music_votes;
create policy gym_music_votes_self_or_admin_read
  on public.gym_music_votes
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_admin_role('recepcny'))
  );

drop policy if exists gym_music_votes_self_insert on public.gym_music_votes;
create policy gym_music_votes_self_insert
  on public.gym_music_votes
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists gym_music_votes_self_update on public.gym_music_votes;
create policy gym_music_votes_self_update
  on public.gym_music_votes
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists gym_music_votes_self_delete on public.gym_music_votes;
create policy gym_music_votes_self_delete
  on public.gym_music_votes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists gym_music_suggestions_self_or_admin_read on public.gym_music_suggestions;
create policy gym_music_suggestions_self_or_admin_read
  on public.gym_music_suggestions
  for select
  to authenticated
  using (
    suggested_by = (select auth.uid())
    or (select public.has_admin_role('recepcny'))
  );

drop policy if exists gym_music_suggestions_self_insert on public.gym_music_suggestions;
create policy gym_music_suggestions_self_insert
  on public.gym_music_suggestions
  for insert
  to authenticated
  with check (
    suggested_by = (select auth.uid())
    and status = 'pending'
    and queued_by is null
    and queued_at is null
    and rejected_by is null
    and rejected_at is null
    and queue_error is null
  );

drop policy if exists gym_music_suggestions_admin_update on public.gym_music_suggestions;
create policy gym_music_suggestions_admin_update
  on public.gym_music_suggestions
  for update
  to authenticated
  using ((select public.has_admin_role('recepcny')))
  with check ((select public.has_admin_role('recepcny')));

grant select on public.gym_music_play_sessions to authenticated;
grant select, insert, update, delete on public.gym_music_votes to authenticated;
grant select, insert, update on public.gym_music_suggestions to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'gym_music_play_sessions'
    ) then
      alter publication supabase_realtime add table public.gym_music_play_sessions;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'gym_music_votes'
    ) then
      alter publication supabase_realtime add table public.gym_music_votes;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'gym_music_suggestions'
    ) then
      alter publication supabase_realtime add table public.gym_music_suggestions;
    end if;
  end if;
end;
$$;

create or replace function public.get_spotify_connection()
returns table (
  refresh_token text,
  spotify_user_id text,
  spotify_display_name text,
  scopes text[],
  connected_at timestamptz,
  updated_at timestamptz,
  refresh_token_expires_at timestamptz,
  last_token_error text,
  last_token_error_at timestamptz
)
language sql
security definer
stable
set search_path = private, public, pg_temp
as $$
  select
    sc.refresh_token,
    sc.spotify_user_id,
    sc.spotify_display_name,
    sc.scopes,
    sc.connected_at,
    sc.updated_at,
    sc.refresh_token_expires_at,
    sc.last_token_error,
    sc.last_token_error_at
  from private.spotify_connection sc
  where sc.id = 'primary'
  limit 1;
$$;

create or replace function public.upsert_spotify_connection(
  p_refresh_token text,
  p_spotify_user_id text,
  p_spotify_display_name text,
  p_scopes text[],
  p_refresh_token_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  insert into private.spotify_connection (
    id,
    refresh_token,
    spotify_user_id,
    spotify_display_name,
    scopes,
    refresh_token_expires_at,
    connected_at,
    updated_at,
    last_token_error,
    last_token_error_at
  )
  values (
    'primary',
    p_refresh_token,
    p_spotify_user_id,
    p_spotify_display_name,
    coalesce(p_scopes, '{}'),
    p_refresh_token_expires_at,
    now(),
    now(),
    null,
    null
  )
  on conflict (id) do update
  set refresh_token = excluded.refresh_token,
      spotify_user_id = excluded.spotify_user_id,
      spotify_display_name = excluded.spotify_display_name,
      scopes = excluded.scopes,
      refresh_token_expires_at = excluded.refresh_token_expires_at,
      updated_at = now(),
      last_token_error = null,
      last_token_error_at = null;
end;
$$;

create or replace function public.update_spotify_refresh_token(p_refresh_token text)
returns void
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  update private.spotify_connection
  set refresh_token = p_refresh_token,
      refresh_token_expires_at = now() + interval '6 months',
      updated_at = now(),
      last_token_error = null,
      last_token_error_at = null
  where id = 'primary';
end;
$$;

create or replace function public.record_spotify_token_error(p_error text)
returns void
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  update private.spotify_connection
  set last_token_error = left(p_error, 500),
      last_token_error_at = now(),
      updated_at = now()
  where id = 'primary';
end;
$$;

revoke all on function public.get_spotify_connection() from public;
revoke all on function public.upsert_spotify_connection(text, text, text, text[], timestamptz) from public;
revoke all on function public.update_spotify_refresh_token(text) from public;
revoke all on function public.record_spotify_token_error(text) from public;

grant execute on function public.get_spotify_connection() to service_role;
grant execute on function public.upsert_spotify_connection(text, text, text, text[], timestamptz) to service_role;
grant execute on function public.update_spotify_refresh_token(text) to service_role;
grant execute on function public.record_spotify_token_error(text) to service_role;

commit;
