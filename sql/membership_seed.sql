begin;

insert into public.memberships (
  name,
  billing_cycle,
  entry_count,
  duration_days,
  is_single_entry,
  price
)
values
  ('Jednorazový vstup', 'entries', 1, null, true, 14.00),
  ('Mesačná', 'monthly', null, 30, false, 39.00),
  ('Ročná', 'yearly', null, 365, false, 29.00)
on conflict (name)
do update set
  billing_cycle = excluded.billing_cycle,
  entry_count = excluded.entry_count,
  duration_days = excluded.duration_days,
  is_single_entry = excluded.is_single_entry,
  price = excluded.price;

commit;
