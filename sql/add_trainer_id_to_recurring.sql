alter table public.recurring_rules
add column trainer_id uuid null references public.profiles(id) on delete cascade;