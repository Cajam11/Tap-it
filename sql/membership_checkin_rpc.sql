begin;

create or replace function public.check_in_with_membership(p_user_id uuid, p_checked_in_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership record;
  v_new_remaining integer;
  v_entry_id uuid;
begin
  select
    um.id,
    um.membership_id,
    um.entries_remaining,
    um.status,
    um.end_date,
    m.billing_cycle
  into v_membership
  from public.user_memberships um
  join public.memberships m on m.id = um.membership_id
  where um.user_id = p_user_id
    and um.status = 'active'
    and (um.end_date is null or um.end_date > p_checked_in_at)
  order by um.start_date desc
  limit 1
  for update;

  if not found then
    raise exception 'membership_not_active';
  end if;

  if v_membership.billing_cycle = 'entries' then
    if v_membership.entries_remaining is null then
      v_new_remaining := 0;
    else
      v_new_remaining := v_membership.entries_remaining - 1;
    end if;

    if v_new_remaining < 0 then
      raise exception 'no_entries_remaining';
    end if;

    update public.user_memberships
    set entries_remaining = v_new_remaining,
        status = case when v_new_remaining = 0 then 'expired' else status end,
        end_date = case when v_new_remaining = 0 then p_checked_in_at else end_date end
    where id = v_membership.id;
  end if;

  insert into public.entries (user_id, check_in, is_valid)
  values (p_user_id, p_checked_in_at, true)
  returning id into v_entry_id;

  return jsonb_build_object(
    'entry_id', v_entry_id,
    'membership_id', v_membership.membership_id,
    'remaining', greatest(coalesce(v_new_remaining, coalesce(v_membership.entries_remaining, 0)), 0),
    'membership_status', case when v_membership.billing_cycle = 'entries' and coalesce(v_new_remaining, coalesce(v_membership.entries_remaining, 0)) = 0 then 'expired' else 'active' end
  );
end;
$$;

commit;
