begin;

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid null references public.memberships(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  type text not null check (type in ('purchase', 'refund')),
  status text not null check (status in ('completed', 'pending', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_created_at
  on public.transactions (user_id, created_at desc);

create index if not exists idx_transactions_type_status
  on public.transactions (type, status);

alter table public.transactions enable row level security;

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own
  on public.transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own
  on public.transactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

commit;
