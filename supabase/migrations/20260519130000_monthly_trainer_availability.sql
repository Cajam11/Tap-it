begin;

alter table public.recurring_rules
  add column if not exists active_from date not null default current_date,
  add column if not exists active_until date not null default (current_date + interval '1 month')::date;

alter table public.recurring_rules
  drop constraint if exists recurring_rules_active_window_check;

alter table public.recurring_rules
  add constraint recurring_rules_active_window_check
  check (active_until >= active_from);

alter table public.service_schedules
  add column if not exists recurring_rule_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_schedules_recurring_rule_id_fkey'
      and conrelid = 'public.service_schedules'::regclass
  ) then
    alter table public.service_schedules
      add constraint service_schedules_recurring_rule_id_fkey
      foreign key (recurring_rule_id)
      references public.recurring_rules(id)
      on delete cascade;
  end if;
end;
$$;

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) ilike '%service_schedules%'
  loop
    execute format('alter table public.bookings drop constraint if exists %I', c.conname);
  end loop;
end;
$$;

alter table public.bookings
  add constraint bookings_schedule_id_fkey
  foreign key (schedule_id)
  references public.service_schedules(id)
  on delete set null;

create unique index if not exists service_schedules_rule_start_end_unique
  on public.service_schedules (recurring_rule_id, start_time, end_time)
  where recurring_rule_id is not null;

create index if not exists recurring_rules_trainer_service_active_until_idx
  on public.recurring_rules (trainer_id, service_id, active_until);

drop policy if exists "Trainers can manage their own recurring_rules" on public.recurring_rules;
create policy "Trainers can manage their own recurring_rules"
  on public.recurring_rules
  for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

drop policy if exists "Trainers can manage their own service_schedules" on public.service_schedules;
create policy "Trainers can manage their own service_schedules"
  on public.service_schedules
  for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

commit;
