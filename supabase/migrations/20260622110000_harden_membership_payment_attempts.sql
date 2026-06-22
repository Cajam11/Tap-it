begin;

create extension if not exists pgcrypto;

-- A PaymentIntent is not the source of truth for a membership purchase. This
-- row is created first and lets the app safely reuse, expire and reconcile a
-- checkout attempt, including a retry after a network timeout.
create table if not exists public.membership_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete restrict,
  membership_name text not null,
  billing_cycle text not null check (billing_cycle in ('entries', 'monthly', 'yearly')),
  entry_count integer null check (entry_count is null or entry_count > 0),
  duration_days integer null check (duration_days is null or duration_days > 0),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency = upper(currency)),
  stripe_payment_intent_id text unique,
  stripe_pi_cancelled_at timestamptz,
  stripe_refund_id text unique,
  status text not null check (status in ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  failure_reason text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open membership checkout is enough for a user. Apart from making the UI
-- predictable this is the final DB guard against double tabs and devices.
create unique index if not exists membership_payment_attempts_one_pending_per_user_idx
  on public.membership_payment_attempts (user_id)
  where status = 'pending';

create index if not exists membership_payment_attempts_pending_expiry_idx
  on public.membership_payment_attempts (expires_at)
  where status = 'pending';

-- Cancelled rows stay in this retry queue until Stripe confirms the intent is
-- no longer payable.
create index if not exists membership_payment_attempts_stripe_cancel_retry_idx
  on public.membership_payment_attempts (updated_at asc)
  where status = 'cancelled'
    and stripe_payment_intent_id is not null
    and stripe_pi_cancelled_at is null;

-- Carry any checkout that was already open before this rollout into the new
-- lifecycle. Only the newest still-young attempt per user remains pending;
-- every other legacy intent enters the same Stripe-cancellation retry queue.
with legacy_pending as (
  select
    t.id as transaction_id,
    t.user_id,
    t.membership_id,
    t.amount,
    t.currency,
    t.created_at,
    t.metadata ->> 'stripe_payment_intent_id' as stripe_payment_intent_id,
    row_number() over (
      partition by t.user_id
      order by t.created_at desc, t.id desc
    ) as user_attempt_rank
  from public.transactions t
  where t.type = 'purchase'
    and t.status = 'pending'
    and t.membership_id is not null
    and t.metadata ? 'stripe_payment_intent_id'
    and nullif(t.metadata ->> 'stripe_payment_intent_id', '') is not null
)
insert into public.membership_payment_attempts (
  user_id,
  membership_id,
  membership_name,
  billing_cycle,
  entry_count,
  duration_days,
  amount,
  currency,
  stripe_payment_intent_id,
  status,
  failure_reason,
  expires_at,
  cancelled_at,
  created_at,
  updated_at
)
select
  legacy.user_id,
  legacy.membership_id,
  membership.name,
  membership.billing_cycle,
  membership.entry_count,
  membership.duration_days,
  legacy.amount,
  coalesce(nullif(upper(legacy.currency), ''), 'EUR'),
  legacy.stripe_payment_intent_id,
  case
    when legacy.user_attempt_rank = 1
      and legacy.created_at + interval '30 minutes' > now() then 'pending'
    else 'cancelled'
  end,
  case
    when legacy.user_attempt_rank = 1
      and legacy.created_at + interval '30 minutes' > now() then null
    else 'legacy_checkout_expired_or_replaced'
  end,
  legacy.created_at + interval '30 minutes',
  case
    when legacy.user_attempt_rank = 1
      and legacy.created_at + interval '30 minutes' > now() then null
    else now()
  end,
  legacy.created_at,
  now()
from legacy_pending legacy
join public.memberships membership on membership.id = legacy.membership_id
on conflict (stripe_payment_intent_id) do nothing;

-- Historical transactions can legitimately contain duplicate PaymentIntent ids
-- from older webhook retries. Do not rewrite accounting history just to add an
-- index. New membership attempts carry their own immutable id, so uniqueness
-- starts at this rollout and still makes duplicate webhook deliveries safe.
create unique index if not exists transactions_unique_membership_attempt_purchase_idx
  on public.transactions ((metadata ->> 'membership_payment_attempt_id'))
  where type = 'purchase'
    and metadata ? 'membership_payment_attempt_id';

create unique index if not exists transactions_unique_membership_attempt_refund_idx
  on public.transactions ((metadata ->> 'membership_payment_attempt_id'))
  where type = 'refund'
    and metadata ? 'membership_payment_attempt_id';

-- The fresh-install schema already declares this invariant. The migration makes
-- it true in existing projects as well.
create unique index if not exists uq_user_memberships_one_active
  on public.user_memberships (user_id)
  where status = 'active';

alter table public.membership_payment_attempts enable row level security;

drop policy if exists membership_payment_attempts_select_own on public.membership_payment_attempts;
create policy membership_payment_attempts_select_own
  on public.membership_payment_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Serialises a user's checkout flow. It is intentionally service_role-only;
-- accepting arbitrary user ids from a browser would be unsafe.
create or replace function public.reserve_membership_payment_attempt(
  p_user_id uuid,
  p_membership_id uuid,
  p_ttl_minutes integer default 30
)
returns table (
  attempt_id uuid,
  payment_intent_id text,
  attempt_amount numeric,
  attempt_currency text,
  attempt_expires_at timestamptz,
  attempt_membership_name text,
  attempt_billing_cycle text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_plan public.memberships%rowtype;
  v_attempt public.membership_payment_attempts%rowtype;
begin
  if p_ttl_minutes < 5 or p_ttl_minutes > 120 then
    raise exception 'Neplatná dĺžka platobného checkoutu.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- A user should not wait for the maintenance cron after their previous plan
  -- has expired by time or consumed all available entries.
  update public.user_memberships
  set status = 'expired'
  where user_id = p_user_id
    and status = 'active'
    and (
      (end_date is not null and end_date <= now())
      or (entries_remaining is not null and entries_remaining <= 0)
    );

  if exists (
    select 1 from public.user_memberships
    where user_id = p_user_id and status = 'active'
  ) then
    raise exception 'membership_already_active';
  end if;

  select * into v_plan
  from public.memberships
  where id = p_membership_id;

  if v_plan.id is null or v_plan.price <= 0 then
    raise exception 'Neplatné členstvo.';
  end if;

  -- Expiration is authoritative in the database, not in a browser timer.
  update public.membership_payment_attempts
  set status = 'cancelled',
      failure_reason = 'checkout_expired',
      cancelled_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and status = 'pending'
    and expires_at <= now();

  select * into v_attempt
  from public.membership_payment_attempts
  where user_id = p_user_id and status = 'pending'
  order by created_at desc
  limit 1
  for update;

  if v_attempt.id is not null then
    if v_attempt.membership_id = v_plan.id
      and v_attempt.amount = v_plan.price
      and v_attempt.currency = 'EUR' then
      return query select v_attempt.id, v_attempt.stripe_payment_intent_id,
        v_attempt.amount, v_attempt.currency, v_attempt.expires_at,
        v_attempt.membership_name, v_attempt.billing_cycle;
      return;
    end if;

    update public.membership_payment_attempts
    set status = 'cancelled',
        failure_reason = 'replaced_by_new_membership_payment',
        cancelled_at = now(),
        updated_at = now()
    where id = v_attempt.id;
  end if;

  insert into public.membership_payment_attempts (
    user_id, membership_id, membership_name, billing_cycle, entry_count,
    duration_days, amount, currency, status, expires_at
  )
  values (
    p_user_id, v_plan.id, v_plan.name, v_plan.billing_cycle, v_plan.entry_count,
    v_plan.duration_days, v_plan.price, 'EUR', 'pending',
    now() + make_interval(mins => p_ttl_minutes)
  )
  returning * into v_attempt;

  return query select v_attempt.id, v_attempt.stripe_payment_intent_id,
    v_attempt.amount, v_attempt.currency, v_attempt.expires_at,
    v_attempt.membership_name, v_attempt.billing_cycle;
end;
$$;

revoke all on function public.reserve_membership_payment_attempt(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_membership_payment_attempt(uuid, uuid, integer)
  to service_role;

-- The webhook is the only place allowed to turn a paid attempt into an active
-- membership. Advisory locking and the unique active-membership index cover
-- concurrent webhook deliveries and future server code paths.
create or replace function public.complete_membership_payment_attempt(
  p_attempt_id uuid
)
returns table (activated boolean, result text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_attempt public.membership_payment_attempts%rowtype;
  v_entries_remaining integer;
  v_end_date timestamptz;
begin
  select * into v_attempt
  from public.membership_payment_attempts
  where id = p_attempt_id
  for update;

  if v_attempt.id is null then
    return query select false, 'attempt_not_found';
    return;
  end if;

  if v_attempt.status = 'completed' then
    return query select true, 'already_completed';
    return;
  end if;

  if v_attempt.status <> 'pending' then
    return query select false, v_attempt.status;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_attempt.user_id::text, 0));

  if v_attempt.expires_at <= now() then
    update public.membership_payment_attempts
    set status = 'cancelled',
        failure_reason = 'payment_completed_after_checkout_expiry',
        cancelled_at = now(),
        updated_at = now()
    where id = v_attempt.id;
    return query select false, 'expired';
    return;
  end if;

  update public.user_memberships
  set status = 'expired'
  where user_id = v_attempt.user_id
    and status = 'active'
    and (
      (end_date is not null and end_date <= now())
      or (entries_remaining is not null and entries_remaining <= 0)
    );

  if exists (
    select 1 from public.user_memberships
    where user_id = v_attempt.user_id and status = 'active'
  ) then
    return query select false, 'membership_already_active';
    return;
  end if;

  v_end_date := case
    when v_attempt.duration_days is not null
      then now() + make_interval(days => v_attempt.duration_days)
    else null
  end;
  v_entries_remaining := case
    when v_attempt.billing_cycle = 'entries' then coalesce(v_attempt.entry_count, 1)
    else null
  end;

  insert into public.user_memberships (
    user_id, membership_id, start_date, end_date, entries_remaining, status,
    activated_by_admin
  ) values (
    v_attempt.user_id, v_attempt.membership_id, now(), v_end_date,
    v_entries_remaining, 'active', false
  );

  update public.membership_payment_attempts
  set status = 'completed',
      completed_at = now(),
      updated_at = now(),
      failure_reason = null
  where id = v_attempt.id;

  return query select true, 'activated';
exception
  when unique_violation then
    return query select false, 'membership_already_active';
end;
$$;

revoke all on function public.complete_membership_payment_attempt(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_membership_payment_attempt(uuid)
  to service_role;

commit;
