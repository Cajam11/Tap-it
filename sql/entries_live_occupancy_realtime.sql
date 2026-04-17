begin;

-- Realtime payload visibility for UPDATE/DELETE needs rows to remain selectable.
drop policy if exists entries_select_live_open on public.entries;
drop policy if exists entries_select_live_realtime on public.entries;
create policy entries_select_live_realtime
  on public.entries
  for select
  to anon, authenticated
  using (is_valid = true);

-- Include full OLD/NEW row in realtime events so the client can detect open->closed transitions.
alter table public.entries replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
end;
$$;

commit;