update public.memberships
set price = case name
  when 'Jednorazový vstup' then 10.00
  when 'Mesačná' then 60.00
  when 'Ročná' then 630.00
  else price
end
where name in ('Jednorazový vstup', 'Mesačná', 'Ročná');
