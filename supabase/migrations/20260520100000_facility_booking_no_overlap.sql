begin;

create extension if not exists btree_gist;

alter table public.bookings
  drop constraint if exists bookings_valid_time_range_check;

alter table public.bookings
  add constraint bookings_valid_time_range_check
  check (end_time > start_time);

do $$
begin
  if exists (
    select 1
    from public.bookings a
    join public.bookings b
      on a.id < b.id
      and a.service_id = b.service_id
      and a.schedule_id is null
      and b.schedule_id is null
      and a.status = 'paid'
      and b.status = 'paid'
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(b.start_time, b.end_time, '[)')
  ) then
    raise exception
      'Cannot add bookings_facility_no_overlap: overlapping paid facility bookings already exist. Resolve/refund duplicates manually first.';
  end if;
end;
$$;

with ranked_conflicts as (
  select
    duplicate.id
  from public.bookings duplicate
  where duplicate.schedule_id is null
    and duplicate.status in ('pending', 'paid')
    and exists (
      select 1
      from public.bookings keeper
      where keeper.id <> duplicate.id
        and keeper.service_id = duplicate.service_id
        and keeper.schedule_id is null
        and keeper.status in ('pending', 'paid')
        and tstzrange(keeper.start_time, keeper.end_time, '[)') && tstzrange(duplicate.start_time, duplicate.end_time, '[)')
        and (
          case keeper.status when 'paid' then 0 else 1 end,
          keeper.created_at,
          keeper.id
        ) < (
          case duplicate.status when 'paid' then 0 else 1 end,
          duplicate.created_at,
          duplicate.id
        )
    )
)
update public.bookings booking
set
  status = 'cancelled',
  updated_at = now()
from ranked_conflicts
where booking.id = ranked_conflicts.id
  and booking.status = 'pending';

do $$
begin
  if exists (
    select 1
    from public.bookings a
    join public.bookings b
      on a.id < b.id
      and a.service_id = b.service_id
      and a.schedule_id is null
      and b.schedule_id is null
      and a.status in ('pending', 'paid')
      and b.status in ('pending', 'paid')
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(b.start_time, b.end_time, '[)')
  ) then
    raise exception
      'Cannot add bookings_facility_no_overlap: overlapping facility bookings still exist after pending cleanup. Check paid duplicates.';
  end if;
end;
$$;

alter table public.bookings
  drop constraint if exists bookings_facility_no_overlap;

alter table public.bookings
  add constraint bookings_facility_no_overlap
  exclude using gist (
    service_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (schedule_id is null and status in ('pending', 'paid'));

commit;
