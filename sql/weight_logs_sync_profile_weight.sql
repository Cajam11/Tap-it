begin;

create or replace function public.refresh_profile_weight_from_weight_logs(target_user_id uuid)
returns void
language plpgsql
as $$
declare
  latest_weight numeric;
begin
  select wl.weight_kg
    into latest_weight
  from public.weight_logs wl
  where wl.user_id = target_user_id
  order by wl.created_at desc, wl.id desc
  limit 1;

  if latest_weight is not null then
    update public.profiles
      set weight_kg = latest_weight
    where id = target_user_id;
  end if;
end;
$$;

create or replace function public.sync_profile_weight_from_weight_logs()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_profile_weight_from_weight_logs(old.user_id);
    return old;
  end if;

  perform public.refresh_profile_weight_from_weight_logs(new.user_id);

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.refresh_profile_weight_from_weight_logs(old.user_id);
  end if;

  return new;
end;
$$;

drop trigger if exists weight_logs_sync_profile_weight on public.weight_logs;
create trigger weight_logs_sync_profile_weight
after insert or update or delete on public.weight_logs
for each row
execute function public.sync_profile_weight_from_weight_logs();

commit;