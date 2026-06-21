begin;

-- 1. Aktualizácia roly v tabuľke profiles
-- Vymažeme aktuálny constraint pre roly, a vytvoríme nový, ktorý obsahuje aj 'trainer'
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', c.conname);
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'trainer', 'recepcny', 'manager', 'owner'));

-- 2. Vytvorenie bookable_services (Katalóg Služieb)
create table if not exists public.bookable_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('group', 'trainer', 'facility')),
  base_price numeric(10,2) not null check (base_price >= 0),
  price_unit text not null check (price_unit in ('hour', 'minute', 'session')),
  capacity int null check (capacity > 0), -- Ak je to hala = null/1, ak je to skupinovy trening = 15 atď.
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb, -- Pre špecifické cenové výpočty, napr. vírivka prvá hodina 20€, ďalšia 10€
  created_at timestamptz not null default now()
);

-- 3. Vytvorenie recurring_rules (Pravidlá pre opakujúce sa udalosti - napr. tréningy)
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.bookable_services(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Nedela, 1 = Pondelok...
  start_time time not null,
  end_time time not null,
  weeks_ahead int not null default 4, -- Na koľko týždňov dopredu sa to má generovať
  active_from date not null default current_date,
  active_until date not null default (current_date + interval '1 month')::date,
  constraint recurring_rules_active_window_check check (active_until >= active_from),
  created_at timestamptz not null default now()
);

-- 4. Vytvorenie service_schedules (Konkrétne termíny, časy a harmonogramy)
create table if not exists public.service_schedules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.bookable_services(id) on delete cascade,
  trainer_id uuid null references public.profiles(id) on delete set null, -- Null pre haly/wellness
  recurring_rule_id uuid null references public.recurring_rules(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  current_capacity int null, -- Pri generovaní sa prekopíruje z bookable_services.capacity
  created_at timestamptz not null default now()
);

-- 5. Vytvorenie bookings (Samotné rezervácie užívateľom)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  service_id uuid not null references public.bookable_services(id) on delete restrict,
  schedule_id uuid null references public.service_schedules(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  total_price numeric(10,2) not null,
  status text not null check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  stripe_pi_id text null, -- Pre naviazanie s platbou
  stripe_pi_cancelled_at timestamptz null, -- Potvrdené zrušenie Stripe Payment Intenta
  stripe_refund_id text null, -- Pre storná
  expires_at timestamptz null default (now() + interval '15 minutes'), -- Pending checkout je platný najviac 15 minút
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create extension if not exists btree_gist;

alter table public.bookings
  add constraint bookings_valid_time_range_check
  check (end_time > start_time);

alter table public.bookings
  add constraint bookings_pending_requires_expiry
  check (status <> 'pending' or expires_at is not null);

alter table public.bookings
  add constraint bookings_facility_no_overlap
  exclude using gist (
    service_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (schedule_id is null and status in ('pending', 'paid'));

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

create trigger bookings_user_no_overlap
before insert or update of user_id, start_time, end_time, status
on public.bookings
for each row
execute function public.prevent_user_booking_overlap();

-- 6. Prepojenie transakcií (existing table) na novú tabuľku bookings
alter table public.transactions
  add column if not exists booking_id uuid null references public.bookings(id) on delete set null;

-- 7. Zapnutie Row Level Security (RLS)
alter table public.bookable_services enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.service_schedules enable row level security;
alter table public.bookings enable row level security;

-- Povolíme VSETKYM (aj nenalogovaným, ak majú vidieť rozvrh) ČÍTANIE rozvrhu a služieb
create policy "Anyone can read bookable_services" on public.bookable_services for select using (true);
create policy "Anyone can read service_schedules" on public.service_schedules for select using (true);

-- Užívatelia si môžu čítať svoje vlastné rezervácie (a admini všetko)
create policy "Users can read own bookings" on public.bookings for select using (auth.uid() = user_id);

-- Užívatelia si môžu VYTÝVARAŤ rezervácie sami (status pôjde defaultne na 'pending' kým nezaplatia cez webhook)
create policy "Users can create bookings" on public.bookings for insert with check (auth.uid() = user_id);

-- Užívatelia môžu RUŠIŤ/UPRAVOVAŤ svoje rezervácie
create policy "Users can update own bookings" on public.bookings for update using (auth.uid() = user_id);

-- Admini majú plný prístup ku všetkému (Bypassed by Supabase admin/service roles but good for explicit admin logic if querying user-side)
-- (Poznámka: Pre bezpečné úpravy cien/rozvrhov budeme používať primárne Server actions s role=manager/owner/recepcny šekom)

commit;
