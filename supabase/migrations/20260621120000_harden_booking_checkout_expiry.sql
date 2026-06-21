begin;

alter table public.bookings
  add column if not exists expires_at timestamptz;

update public.bookings
set expires_at = created_at + interval '15 minutes'
where status = 'pending'
  and expires_at is null;

alter table public.bookings
  alter column expires_at set default (now() + interval '15 minutes');

alter table public.bookings
  drop constraint if exists bookings_pending_requires_expiry;

alter table public.bookings
  add constraint bookings_pending_requires_expiry
  check (status <> 'pending' or expires_at is not null);

create index if not exists bookings_pending_expiry_idx
  on public.bookings (expires_at)
  where status = 'pending';

-- Creates or returns a single active checkout while serialising reservations per
-- service. This is deliberately in Postgres so capacity checks cannot race when
-- many users reserve the same slot simultaneously.
create or replace function public.reserve_booking_checkout(
  p_user_id uuid,
  p_service_id uuid,
  p_schedule_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_total_price numeric
)
returns table (booking_id uuid, booking_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_type text;
  v_schedule_start timestamptz;
  v_schedule_end timestamptz;
  v_schedule_capacity integer;
  v_trainer_id uuid;
  v_pending_count integer;
  v_existing_booking_id uuid;
  v_existing_expiry timestamptz;
begin
  if p_end_time <= p_start_time then
    raise exception 'Neplatný čas rezervácie.';
  end if;

  -- One advisory lock per service makes the capacity check and insert atomic.
  perform pg_advisory_xact_lock(hashtextextended(p_service_id::text, 0));

  update public.bookings
  set status = 'cancelled', updated_at = now()
  where status = 'pending'
    and expires_at <= now();

  select type
    into v_service_type
  from public.bookable_services
  where id = p_service_id
    and is_active = true;

  if v_service_type is null then
    raise exception 'Služba nie je dostupná.';
  end if;

  select id, expires_at
    into v_existing_booking_id, v_existing_expiry
  from public.bookings
  where user_id = p_user_id
    and service_id = p_service_id
    and schedule_id is not distinct from p_schedule_id
    and start_time = p_start_time
    and end_time = p_end_time
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_existing_booking_id is not null then
    return query select v_existing_booking_id, v_existing_expiry;
    return;
  end if;

  if p_schedule_id is not null then
    select start_time, end_time, current_capacity, trainer_id
      into v_schedule_start, v_schedule_end, v_schedule_capacity, v_trainer_id
    from public.service_schedules
    where id = p_schedule_id
      and service_id = p_service_id
    for update;

    if v_schedule_start is null then
      raise exception 'Termín nebol nájdený.';
    end if;

    if v_service_type not in ('group', 'trainer') then
      raise exception 'Táto služba nepoužíva termín.';
    end if;

    if v_schedule_start <= now() then
      raise exception 'Tento termín už začal alebo skončil.';
    end if;

    if v_schedule_start <> p_start_time or v_schedule_end <> p_end_time then
      raise exception 'Termín sa medzitým zmenil. Vyberte ho znova.';
    end if;

    if v_trainer_id = p_user_id then
      raise exception 'Nemôžete si rezervovať sám seba ako trénera.';
    end if;

    if exists (
      select 1
      from public.bookings
      where user_id = p_user_id
        and schedule_id = p_schedule_id
        and status = 'paid'
    ) then
      raise exception 'Tento termín už máte rezervovaný.';
    end if;

    if v_schedule_capacity is not null then
      select count(*)
        into v_pending_count
      from public.bookings
      where schedule_id = p_schedule_id
        and status = 'pending'
        and expires_at > now();

      if v_schedule_capacity - v_pending_count <= 0 then
        raise exception 'Tento termín je práve rezervovaný iným používateľom.';
      end if;
    end if;
  elsif v_service_type <> 'facility' then
    raise exception 'Pre túto službu je potrebné vybrať termín.';
  end if;

  if exists (
    select 1
    from public.bookings
    where user_id = p_user_id
      and status in ('pending', 'paid')
      and (status <> 'pending' or expires_at > now())
      and start_time < p_end_time
      and end_time > p_start_time
  ) then
    raise exception 'Tento termín sa prekrýva s vašou inou aktívnou rezerváciou.';
  end if;

  insert into public.bookings (
    user_id,
    service_id,
    schedule_id,
    start_time,
    end_time,
    total_price,
    status,
    expires_at
  )
  values (
    p_user_id,
    p_service_id,
    p_schedule_id,
    p_start_time,
    p_end_time,
    p_total_price,
    'pending',
    now() + interval '15 minutes'
  )
  returning id, expires_at
    into booking_id, booking_expires_at;

  return next;
exception
  when exclusion_violation then
    raise exception 'Tento čas je už obsadený.';
  when unique_violation then
    raise exception 'Tento termín už máte rezervovaný.';
end;
$$;

revoke all on function public.reserve_booking_checkout(uuid, uuid, uuid, timestamptz, timestamptz, numeric)
  from public, anon, authenticated;
grant execute on function public.reserve_booking_checkout(uuid, uuid, uuid, timestamptz, timestamptz, numeric)
  to service_role;

-- Capacity belongs to the booking state transition, not to the webhook process.
-- This keeps it correct even when many Stripe webhooks arrive at once.
create or replace function public.sync_schedule_capacity_from_booking()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'pending'
    and new.status = 'paid'
    and (old.expires_at is null or old.expires_at <= now()) then
    new.status := 'cancelled';
    return new;
  end if;

  if new.schedule_id is null then
    return new;
  end if;

  if old.status <> 'paid' and new.status = 'paid' then
    update public.service_schedules
    set current_capacity = current_capacity - 1
    where id = new.schedule_id
      and current_capacity is not null
      and current_capacity > 0;
  elsif old.status = 'paid' and new.status in ('cancelled', 'refunded') then
    update public.service_schedules
    set current_capacity = current_capacity + 1
    where id = new.schedule_id
      and current_capacity is not null;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_sync_schedule_capacity on public.bookings;
create trigger bookings_sync_schedule_capacity
  before update of status on public.bookings
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_schedule_capacity_from_booking();

commit;
