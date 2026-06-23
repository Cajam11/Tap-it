# Membership payment checkout lifecycle

Each membership checkout has one database-backed payment attempt. It lasts 30
minutes, uses one stable Stripe idempotency key and is stored before a Stripe
PaymentIntent is created. Refreshing the page or retrying after a lost network
response therefore returns the same checkout instead of creating another one.

During rollout, the migration also moves existing pending membership payment
records into this lifecycle: the newest one that is less than 30 minutes old
remains usable, while older or replaced intents enter the cancellation queue.

The database allows only one pending membership attempt and one active
membership per user. The Stripe webhook is the sole path that activates a
membership. If a payment succeeds after its attempt expired, was replaced or
lost a race with another active membership, Tap-it records the charge and
automatically refunds it rather than activating a second membership.

## Scheduler setup

The same production `CRON_SECRET` can be used for booking and membership jobs.

1. Apply migration
   [20260622110000_harden_membership_payment_attempts.sql](../supabase/migrations/20260622110000_harden_membership_payment_attempts.sql)
   before deploying the updated web app.
2. Deploy the web app, including the new API endpoint and webhook handling.
3. In Supabase Dashboard > Vault create:
   - `membership_payment_expiry_cron_url` with
     `https://www.tap-it.sk/api/cron/expire-membership-payment-attempts`
   - `membership_payment_expiry_cron_secret` with the production `CRON_SECRET`.
4. Run [membership_payment_expiry_cron_setup.sql](../sql/membership_payment_expiry_cron_setup.sql)
   in the Supabase SQL Editor.
5. Confirm the Stripe webhook endpoint subscribes to:
   `payment_intent.succeeded`, `payment_intent.payment_failed`, and
   `payment_intent.canceled`, `refund.created`, `refund.updated`, and
   `refund.failed`.

Every minute the job expires at most 100 stale attempts and cancels their
Stripe PaymentIntents. A cancelled intent remains in a small retry queue until
Stripe confirms it is no longer payable, so a temporary network failure cannot
leave a usable saved checkout link behind.
