begin;

-- Customer membership cancellation must go through the web backend so a real
-- Stripe refund and its DB ledger record cannot get out of sync.
drop policy if exists user_memberships_delete_own on public.user_memberships;

commit;
