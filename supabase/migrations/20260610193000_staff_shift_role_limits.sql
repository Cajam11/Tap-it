begin;

create or replace function public.enforce_staff_shift_role_limits()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  assignee_role text;
  role_limit integer;
  overlapping_count integer;
  slot_start time;
  slot_end time;
begin
  if new.status not in ('pending', 'approved') then
    return new;
  end if;

  select p.role
    into assignee_role
  from public.profiles p
  where p.id = new.assignee_id
  limit 1;

  if assignee_role = 'owner' or assignee_role is null then
    return new;
  end if;

  role_limit := case assignee_role
    when 'recepcny' then 2
    when 'manager' then 1
    else null
  end;

  if role_limit is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('staff_shift_role_limit'),
    hashtext(new.work_date::text || ':' || assignee_role)
  );

  slot_start := new.start_time;
  while slot_start < new.end_time loop
    slot_end := least(slot_start + interval '30 minutes', new.end_time);

    select count(*)
      into overlapping_count
    from public.staff_shifts s
    join public.profiles p on p.id = s.assignee_id
    where s.id <> new.id
      and s.work_date = new.work_date
      and s.status in ('pending', 'approved')
      and p.role = assignee_role
      and s.start_time < slot_end
      and slot_start < s.end_time;

    if overlapping_count >= role_limit then
      raise exception using
        errcode = '23514',
        message = case assignee_role
          when 'recepcny' then 'Nie je mozne booknut viac ako dvoch recepcnych v rovnakom case.'
          else 'Nie je mozne booknut viac ako jedneho managera v rovnakom case.'
        end;
    end if;

    slot_start := slot_end;
  end loop;

  return new;
end;
$$;

revoke all on function public.enforce_staff_shift_role_limits() from public;

drop trigger if exists enforce_staff_shift_role_limits on public.staff_shifts;
create trigger enforce_staff_shift_role_limits
  before insert or update of assignee_id, work_date, start_time, end_time, status
  on public.staff_shifts
  for each row
  execute function public.enforce_staff_shift_role_limits();

commit;
