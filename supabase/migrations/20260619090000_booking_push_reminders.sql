create table if not exists public.booking_push_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reminder_key text not null,
  scheduled_for timestamptz not null,
  status text not null default 'processing'
    check (status in ('processing', 'sent', 'skipped', 'failed')),
  sent_at timestamptz null,
  token_count integer not null default 0,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, reminder_key, scheduled_for)
);

create index if not exists booking_push_reminders_status_idx
  on public.booking_push_reminders (status, scheduled_for);

alter table public.booking_push_reminders enable row level security;
