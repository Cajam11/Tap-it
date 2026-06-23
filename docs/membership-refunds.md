# Membership cancellation refunds

The customer-facing **Cancel membership** action creates a real full Stripe
refund against the PaymentIntent that activated the current membership. It then
marks that membership instance as `cancelled` and writes one matching refund
transaction. A generated refund row is not treated as proof that money was
returned.

The request uses a stable idempotency key based on the `user_memberships` row.
If Stripe creates the refund but the browser or database request is interrupted,
retrying the action receives the same refund instead of sending money twice.

## Deployment

1. Apply
   [20260623110000_add_membership_refund_tracking.sql](../supabase/migrations/20260623110000_add_membership_refund_tracking.sql).
2. Deploy the web app and the mobile app.
3. In the Stripe webhook endpoint, enable `refund.created`, `refund.updated`,
   and `refund.failed` in addition to the existing PaymentIntent events.

Refunds can be asynchronous for some payment methods. The initial transaction
therefore mirrors Stripe's refund status (`completed`, `pending`, or `failed`),
and the two refund webhooks keep it in sync afterwards.
