begin;

alter table public.memberships
  add column if not exists description text not null default '',
  add column if not exists benefits text[] not null default '{}',
  add column if not exists display_order integer not null default 0,
  add column if not exists is_highlighted boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.memberships
set
  description = case name
    when 'Jednorazový vstup' then 'Flexibilný vstup bez viazanosti.'
    when 'Mesačná' then 'Najlepšia voľba pre pravidelný tréning.'
    when 'Ročná' then 'Celoročné členstvo s najlepšou hodnotou.'
    else description
  end,
  benefits = case name
    when 'Jednorazový vstup' then array['Prístup do posilňovne', 'Sauna', 'Skupinovky zadarmo']
    when 'Mesačná' then array['Neobmedzený vstup', 'Sauna', 'Skupinovky zadarmo', 'IONT nápoj']
    when 'Ročná' then array['Neobmedzený vstup', 'Sauna', 'Skupinovky zadarmo', 'IONT nápoj', 'Uterák']
    else benefits
  end,
  display_order = case name
    when 'Jednorazový vstup' then 10
    when 'Mesačná' then 20
    when 'Ročná' then 30
    else display_order
  end,
  is_highlighted = case name
    when 'Mesačná' then true
    else is_highlighted
  end
where benefits = '{}'::text[] or description = '' or display_order = 0;

create index if not exists memberships_visible_order_idx
  on public.memberships (is_active, display_order, created_at);

create or replace function public.set_memberships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_memberships_updated_at on public.memberships;
create trigger set_memberships_updated_at
  before update on public.memberships
  for each row
  execute function public.set_memberships_updated_at();

alter table public.memberships enable row level security;

drop policy if exists memberships_select_authenticated on public.memberships;
drop policy if exists memberships_select_anon on public.memberships;
drop policy if exists memberships_select_active on public.memberships;
create policy memberships_select_active
  on public.memberships
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists memberships_owner_select_all on public.memberships;
create policy memberships_owner_select_all
  on public.memberships
  for select
  to authenticated
  using ((select public.has_admin_role('owner')));

drop policy if exists memberships_owner_insert on public.memberships;
create policy memberships_owner_insert
  on public.memberships
  for insert
  to authenticated
  with check ((select public.has_admin_role('owner')));

drop policy if exists memberships_owner_update on public.memberships;
create policy memberships_owner_update
  on public.memberships
  for update
  to authenticated
  using ((select public.has_admin_role('owner')))
  with check ((select public.has_admin_role('owner')));

drop policy if exists memberships_owner_delete on public.memberships;
create policy memberships_owner_delete
  on public.memberships
  for delete
  to authenticated
  using ((select public.has_admin_role('owner')));

grant select on public.memberships to anon, authenticated;
grant insert, update, delete on public.memberships to authenticated;

commit;
