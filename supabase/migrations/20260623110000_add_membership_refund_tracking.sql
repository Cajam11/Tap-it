begin;

-- Keep the payment source and its refund on the membership instance itself.
-- A user can buy the same plan more than once, so plan id alone is not a safe
-- key when deciding which historic charge may be refunded.
alter table public.user_memberships
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_refund_id text;

create index if not exists user_memberships_stripe_payment_intent_idx
  on public.user_memberships (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists user_memberships_stripe_refund_idx
  on public.user_memberships (stripe_refund_id)
  where stripe_refund_id is not null;

-- Membership state and money movement must be changed through the server-side
-- refund flow. A client must not be able to create/delete memberships or make
-- a fake refund transaction directly. It may only mark an already depleted or
-- time-expired membership as expired for the existing lazy-read fast path.
drop policy if exists user_memberships_insert_own on public.user_memberships;
drop policy if exists user_memberships_update_own on public.user_memberships;
drop policy if exists user_memberships_delete_own on public.user_memberships;
drop policy if exists user_memberships_expire_own on public.user_memberships;
create policy user_memberships_expire_own
  on public.user_memberships
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and status = 'active'
    and (
      (end_date is not null and end_date <= now())
      or (entries_remaining is not null and entries_remaining <= 0)
    )
  )
  with check (auth.uid() = user_id and status = 'expired');

drop policy if exists transactions_insert_own on public.transactions;

create or replace function public.finalize_membership_refund(
  p_user_membership_id uuid,
  p_user_id uuid,
  p_payment_intent_id text,
  p_refund_id text,
  p_amount numeric,
  p_currency text,
  p_refund_status text
)
returns table (transaction_status text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_membership public.user_memberships%rowtype;
  v_transaction_status text;
begin
  if p_amount < 0 then
    raise exception 'Neplatná suma refundu.';
  end if;

  v_transaction_status := case
    when p_refund_status = 'succeeded' then 'completed'
    when p_refund_status in ('failed', 'canceled') then 'failed'
    else 'pending'
  end;

  select *
    into v_membership
  from public.user_memberships
  where id = p_user_membership_id
    and user_id = p_user_id
  for update;

  if v_membership.id is null then
    raise exception 'Členstvo nebolo nájdené.';
  end if;

  if v_membership.status = 'active' then
    update public.user_memberships
    set status = 'cancelled',
        end_date = now(),
        stripe_payment_intent_id = p_payment_intent_id,
        stripe_refund_id = p_refund_id
    where id = v_membership.id;
  elsif v_membership.stripe_refund_id is distinct from p_refund_id then
    raise exception 'Členstvo už bolo zmenené.';
  end if;

  if not exists (
    select 1
    from public.transactions
    where metadata @> jsonb_build_object('stripe_refund_id', p_refund_id)
  ) then
    insert into public.transactions (
      user_id,
      membership_id,
      amount,
      currency,
      type,
      status,
      metadata
    )
    values (
      p_user_id,
      v_membership.membership_id,
      p_amount,
      upper(p_currency),
      'refund',
      v_transaction_status,
      jsonb_build_object(
        'source_membership_row_id', v_membership.id,
        'stripe_payment_intent_id', p_payment_intent_id,
        'stripe_refund_id', p_refund_id,
        'reason', 'membership_cancelled_by_customer',
        'stripe_refund_status', p_refund_status
      )
    );
  end if;

  return query select v_transaction_status;
end;
$$;

revoke all on function public.finalize_membership_refund(uuid, uuid, text, text, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.finalize_membership_refund(uuid, uuid, text, text, numeric, text, text)
  to service_role;

commit;
