begin;

create extension if not exists pgcrypto;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in timestamptz not null default now(),
  check_out timestamptz null,
  duration_min integer null check (duration_min is null or duration_min >= 0),
  is_valid boolean not null default true
);

create index if not exists idx_entries_user_id on public.entries (user_id);
create index if not exists idx_entries_check_in on public.entries (check_in desc);
create index if not exists idx_entries_open on public.entries (user_id) where check_out is null and is_valid = true;

-- Prevent duplicate open sessions for one user.
create unique index if not exists uq_entries_open_per_user
  on public.entries (user_id)
  where check_out is null and is_valid = true;

alter table public.entries enable row level security;

drop policy if exists entries_select_own on public.entries;
create policy entries_select_own
  on public.entries
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists entries_insert_own on public.entries;
create policy entries_insert_own
  on public.entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists entries_update_own on public.entries;
create policy entries_update_own
  on public.entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
