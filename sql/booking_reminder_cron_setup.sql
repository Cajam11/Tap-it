-- Booking reminder scheduler for Supabase projects on Vercel Hobby.
--
-- Before running this script, add these two secrets in Supabase Dashboard > Vault:
--   booking_reminder_cron_url    https://www.tap-it.sk/api/cron/booking-reminders
--   booking_reminder_cron_secret the same value as Vercel's production CRON_SECRET
--
-- Keep the secret in Vault. Do not paste it into this tracked SQL file.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_booking_reminders()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_url text;
  v_cron_secret text;
begin
  select decrypted_secret
    into v_url
  from vault.decrypted_secrets
  where name = 'booking_reminder_cron_url'
  limit 1;

  select decrypted_secret
    into v_cron_secret
  from vault.decrypted_secrets
  where name = 'booking_reminder_cron_secret'
  limit 1;

  if v_url is null or v_cron_secret is null then
    raise exception 'Missing booking reminder URL or secret in Supabase Vault';
  end if;

  -- pg_net queues the request so this job does not block the database scheduler.
  perform net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_cron_secret),
    timeout_milliseconds := 10000
  );
end;
$$;

-- Recreate the named job so this file is safe to run again after changes.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'booking-reminders-every-5-min') then
    perform cron.unschedule('booking-reminders-every-5-min');
  end if;
end;
$$;

select cron.schedule(
  'booking-reminders-every-5-min',
  '*/5 * * * *',
  $$select public.trigger_booking_reminders();$$
);

-- Verify that the scheduler exists.
select jobid, jobname, schedule, command
from cron.job
where jobname = 'booking-reminders-every-5-min';
