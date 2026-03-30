begin;

-- Ensure UUID helper exists.
create extension if not exists pgcrypto;

-- =========================
-- MEMBERSHIP PLANS
-- =========================
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  billing_cycle text not null check (billing_cycle in ('entries', 'monthly', 'yearly')),
  entry_count integer null check (entry_count is null or entry_count > 0),
  duration_days integer null check (duration_days is null or duration_days > 0),
  is_single_entry boolean not null default false,
  price numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_billing_cycle
  on public.memberships (billing_cycle);

-- =========================
-- USER MEMBERSHIPS
-- =========================
create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete restrict,
  start_date timestamptz not null default now(),
  end_date timestamptz null,
  entries_remaining integer null check (entries_remaining is null or entries_remaining >= 0),
  status text not null check (status in ('active', 'expired', 'cancelled', 'suspended')),
  activated_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_memberships_user_id
  on public.user_memberships (user_id);

create index if not exists idx_user_memberships_status
  on public.user_memberships (status);

create index if not exists idx_user_memberships_user_status
  on public.user_memberships (user_id, status);

-- Exactly one active membership per user.
create unique index if not exists uq_user_memberships_one_active
  on public.user_memberships (user_id)
  where status = 'active';

-- =========================
-- QR TOKENS (15s rotating)
-- =========================
create table if not exists public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  hmac_signature text not null,
  status text not null check (status in ('active', 'checked_in', 'used', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  checked_in_at timestamptz null,
  used_at timestamptz null
);

create index if not exists idx_qr_tokens_user_id
  on public.qr_tokens (user_id);

create index if not exists idx_qr_tokens_status
  on public.qr_tokens (status);

create index if not exists idx_qr_tokens_expires_at
  on public.qr_tokens (expires_at);

-- Exactly one active token per user.
create unique index if not exists uq_qr_tokens_one_active
  on public.qr_tokens (user_id)
  where status = 'active';

-- =========================
-- RLS ENABLE
-- =========================
alter table public.memberships enable row level security;
alter table public.user_memberships enable row level security;
alter table public.qr_tokens enable row level security;

-- =========================
-- MEMBERSHIPS POLICIES
-- =========================
drop policy if exists memberships_select_authenticated on public.memberships;
create policy memberships_select_authenticated
  on public.memberships
  for select
  to authenticated
  using (true);

-- Optional: uncomment if you want anonymous users to read plans.
-- drop policy if exists memberships_select_anon on public.memberships;
-- create policy memberships_select_anon
--   on public.memberships
--   for select
--   to anon
--   using (true);

-- =========================
-- USER_MEMBERSHIPS POLICIES
-- =========================
drop policy if exists user_memberships_select_own on public.user_memberships;
create policy user_memberships_select_own
  on public.user_memberships
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_memberships_insert_own on public.user_memberships;
create policy user_memberships_insert_own
  on public.user_memberships
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_memberships_update_own on public.user_memberships;
create policy user_memberships_update_own
  on public.user_memberships
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep delete disabled for clients by default.

-- =========================
-- QR_TOKENS POLICIES
-- =========================
drop policy if exists qr_tokens_select_own on public.qr_tokens;
create policy qr_tokens_select_own
  on public.qr_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists qr_tokens_insert_own on public.qr_tokens;
create policy qr_tokens_insert_own
  on public.qr_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists qr_tokens_update_own on public.qr_tokens;
create policy qr_tokens_update_own
  on public.qr_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep delete disabled for clients by default.

commit;
