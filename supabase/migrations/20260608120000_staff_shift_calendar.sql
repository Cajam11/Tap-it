begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.has_admin_role(required_role text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  current_role text;
  current_rank integer;
  required_rank integer;
begin
  if (select auth.uid()) is null or required_role is null then
    return false;
  end if;

  select p.role
    into current_role
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;

  current_rank := case current_role
    when 'recepcny' then 1
    when 'manager' then 2
    when 'owner' then 3
    else 0
  end;

  required_rank := case required_role
    when 'recepcny' then 1
    when 'manager' then 2
    when 'owner' then 3
    else null
  end;

  if required_rank is null then
    return false;
  end if;

  return current_rank >= required_rank;
end;
$$;

revoke all on function public.has_admin_role(text) from public;
grant execute on function public.has_admin_role(text) to authenticated, service_role;

create table if not exists public.staff_shift_coverage_rules (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  required_count integer not null default 1 check (required_count > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_shift_coverage_rules_valid_time_check check (end_time > start_time),
  constraint staff_shift_coverage_rules_unique_window unique (day_of_week, start_time, end_time)
);

create table if not exists public.staff_shift_series (
  id uuid primary key default gen_random_uuid(),
  assignee_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  days_of_week integer[] not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_by uuid null references public.profiles(id) on delete set null,
  cancelled_at timestamptz null,
  cancellation_reason text null,
  created_at timestamptz not null default now(),
  constraint staff_shift_series_valid_date_check check (end_date >= start_date),
  constraint staff_shift_series_valid_time_check check (end_time > start_time),
  constraint staff_shift_series_days_check check (
    array_length(days_of_week, 1) > 0
    and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]
  ),
  constraint staff_shift_series_cancellation_reason_check check (
    status <> 'cancelled'
    or cancellation_reason is not null
  )
);

create table if not exists public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  assignee_id uuid not null references public.profiles(id) on delete restrict,
  series_id uuid null references public.staff_shift_series(id) on delete set null,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid null references public.profiles(id) on delete set null,
  approved_at timestamptz null,
  rejected_by uuid null references public.profiles(id) on delete set null,
  rejected_at timestamptz null,
  rejection_reason text null,
  cancelled_by uuid null references public.profiles(id) on delete set null,
  cancelled_at timestamptz null,
  cancellation_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_shifts_valid_time_check check (end_time > start_time),
  constraint staff_shifts_rejection_reason_check check (
    status <> 'rejected'
    or rejection_reason is not null
  ),
  constraint staff_shifts_cancellation_reason_check check (
    status <> 'cancelled'
    or cancellation_reason is not null
  )
);

alter table public.staff_shifts
  drop constraint if exists staff_shifts_assignee_no_overlap;

alter table public.staff_shifts
  add constraint staff_shifts_assignee_no_overlap
  exclude using gist (
    assignee_id with =,
    tsrange((work_date + start_time), (work_date + end_time), '[)') with &&
  )
  where (status in ('pending', 'approved'));

create index if not exists staff_shift_coverage_rules_day_active_idx
  on public.staff_shift_coverage_rules (day_of_week, is_active);

create index if not exists staff_shift_series_assignee_date_idx
  on public.staff_shift_series (assignee_id, start_date, end_date);

create index if not exists staff_shifts_work_date_status_idx
  on public.staff_shifts (work_date, status);

create index if not exists staff_shifts_assignee_date_idx
  on public.staff_shifts (assignee_id, work_date);

insert into public.staff_shift_coverage_rules (day_of_week, start_time, end_time, required_count)
values
  (0, '06:00', '22:00', 1),
  (1, '06:00', '22:00', 1),
  (2, '06:00', '22:00', 1),
  (3, '06:00', '22:00', 1),
  (4, '06:00', '22:00', 1),
  (5, '06:00', '22:00', 1),
  (6, '06:00', '22:00', 1)
on conflict (day_of_week, start_time, end_time) do update
set required_count = excluded.required_count,
    is_active = true,
    updated_at = now();

alter table public.staff_shift_coverage_rules enable row level security;
alter table public.staff_shift_series enable row level security;
alter table public.staff_shifts enable row level security;

drop policy if exists staff_shift_coverage_rules_admin_read on public.staff_shift_coverage_rules;
create policy staff_shift_coverage_rules_admin_read
  on public.staff_shift_coverage_rules
  for select
  to authenticated
  using ((select public.has_admin_role('recepcny')));

drop policy if exists staff_shift_series_admin_read on public.staff_shift_series;
create policy staff_shift_series_admin_read
  on public.staff_shift_series
  for select
  to authenticated
  using ((select public.has_admin_role('recepcny')));

drop policy if exists staff_shift_series_manager_insert on public.staff_shift_series;
create policy staff_shift_series_manager_insert
  on public.staff_shift_series
  for insert
  to authenticated
  with check ((select public.has_admin_role('manager')));

drop policy if exists staff_shift_series_manager_update on public.staff_shift_series;
create policy staff_shift_series_manager_update
  on public.staff_shift_series
  for update
  to authenticated
  using ((select public.has_admin_role('manager')))
  with check ((select public.has_admin_role('manager')));

drop policy if exists staff_shifts_admin_read on public.staff_shifts;
create policy staff_shifts_admin_read
  on public.staff_shifts
  for select
  to authenticated
  using ((select public.has_admin_role('recepcny')));

drop policy if exists staff_shifts_self_pending_insert on public.staff_shifts;
create policy staff_shifts_self_pending_insert
  on public.staff_shifts
  for insert
  to authenticated
  with check (
    (select public.has_admin_role('recepcny'))
    and (select auth.uid()) = assignee_id
    and (select auth.uid()) = requested_by
    and (select auth.uid()) = created_by
    and status = 'pending'
  );

drop policy if exists staff_shifts_manager_insert on public.staff_shifts;
create policy staff_shifts_manager_insert
  on public.staff_shifts
  for insert
  to authenticated
  with check ((select public.has_admin_role('manager')));

drop policy if exists staff_shifts_manager_update on public.staff_shifts;
create policy staff_shifts_manager_update
  on public.staff_shifts
  for update
  to authenticated
  using ((select public.has_admin_role('manager')))
  with check ((select public.has_admin_role('manager')));

grant select on public.staff_shift_coverage_rules to authenticated;
grant select, insert, update on public.staff_shift_series to authenticated;
grant select, insert, update on public.staff_shifts to authenticated;

commit;
