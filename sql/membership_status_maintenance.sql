begin;

-- Fast path for expiration updates.
create index if not exists idx_user_memberships_active_end_date
  on public.user_memberships (end_date)
  where status = 'active' and end_date is not null;

-- Supabase scheduled jobs.
create extension if not exists pg_cron;

create or replace function public.expire_overdue_memberships()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  update public.user_memberships
  set status = 'expired'
  where status = 'active'
    and end_date is not null
    and end_date <= now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- Recreate the same-named job so script is idempotent.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-memberships-every-5-min') then
    perform cron.unschedule('expire-memberships-every-5-min');
  end if;
end;
$$;

select cron.schedule(
  'expire-memberships-every-5-min',
  '*/5 * * * *',
  $$select public.expire_overdue_memberships();$$
);

commit;
