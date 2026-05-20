-- Zabráni vytváraniu duplicitných pending/paid rezervácií pre rovnakého užívateľa a termín
create unique index if not exists bookings_user_schedule_unique_pending_paid
  on public.bookings (user_id, schedule_id)
  where schedule_id is not null and status in ('pending', 'paid');
