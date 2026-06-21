begin;

alter table public.bookings
  add column if not exists stripe_pi_cancelled_at timestamptz;

-- Historical cancelled bookings should not create a large one-time retry queue.
-- Recent and future cancellations remain eligible until Stripe confirms cancellation.
update public.bookings
set stripe_pi_cancelled_at = updated_at
where status in ('cancelled', 'refunded')
  and stripe_pi_id is not null
  and stripe_pi_cancelled_at is null
  and updated_at < now() - interval '1 day';

create index if not exists bookings_cancelled_stripe_retry_idx
  on public.bookings (updated_at desc)
  where status = 'cancelled'
    and stripe_pi_id is not null
    and stripe_pi_cancelled_at is null;

commit;
