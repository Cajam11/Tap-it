-- Gym music current playback scheduler.
--
-- Before running this script, add these secrets in Supabase Dashboard > Vault:
--   music_sync_cron_url
--     https://www.tap-it.sk/api/cron/music-sync
--   music_sync_cron_secret
--     the same value as the web app's production CRON_SECRET
--
-- Keep the secret in Vault. Do not paste it into this tracked SQL file.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_gym_music_sync()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_url text;
  v_cron_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'music_sync_cron_url'
  limit 1;

  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets
  where name = 'music_sync_cron_secret'
  limit 1;

  if v_url is null or v_cron_secret is null then
    raise exception 'Missing gym music sync URL or secret in Supabase Vault';
  end if;

  -- pg_net queues the request, so pg_cron does not wait for the web endpoint.
  perform net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_cron_secret),
    timeout_milliseconds := 8000
  );
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'gym-music-sync-every-15-seconds') then
    perform cron.unschedule('gym-music-sync-every-15-seconds');
  end if;
end;
$$;

select cron.schedule(
  'gym-music-sync-every-15-seconds',
  '15 seconds',
  $$select public.trigger_gym_music_sync();$$
);

select jobid, jobname, schedule, command
from cron.job
where jobname = 'gym-music-sync-every-15-seconds';
