begin;

-- A member can only hold one active booking at a time, regardless of whether it
-- is for a trainer, group lesson, or facility. A trigger is used instead of an
-- exclusion constraint so existing historical bookings do not block deployment.
-- The transaction-level advisory lock closes the race between concurrent API
-- requests for the same member.
create or replace function public.prevent_user_booking_overlap()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('pending', 'paid') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if exists (
    select 1
    from public.bookings existing
    where existing.id <> new.id
      and existing.user_id = new.user_id
      and existing.status in ('pending', 'paid')
      and tstzrange(existing.start_time, existing.end_time, '[)')
        && tstzrange(new.start_time, new.end_time, '[)')
  ) then
    raise exception using
      errcode = '23P01',
      constraint = 'bookings_user_no_overlap',
      message = 'This booking overlaps another active booking for this user.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_user_no_overlap on public.bookings;

create trigger bookings_user_no_overlap
before insert or update of user_id, start_time, end_time, status
on public.bookings
for each row
execute function public.prevent_user_booking_overlap();

commit;
