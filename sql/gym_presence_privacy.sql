begin;

alter table public.profiles
  add column if not exists show_in_gym_list boolean not null default true,
  add column if not exists show_name_in_gym_list boolean not null default false,
  add column if not exists show_avatar_in_gym_list boolean not null default false;

create or replace function public.get_live_gym_presence()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  check_in timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.user_id,
    case
      when coalesce(p.show_name_in_gym_list, false)
        and nullif(btrim(p.full_name), '') is not null
      then p.full_name
      else 'Anonymous'
    end as display_name,
    case
      when coalesce(p.show_avatar_in_gym_list, false)
      then p.avatar_url
      else null
    end as avatar_url,
    e.check_in
  from public.entries e
  join public.profiles p on p.id = e.user_id
  where e.check_out is null
    and e.is_valid = true
    and coalesce(p.show_in_gym_list, true) = true
  order by e.check_in desc;
$$;

revoke all on function public.get_live_gym_presence() from public;
grant execute on function public.get_live_gym_presence() to authenticated;

commit;