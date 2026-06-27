begin;

do $$
declare
  music_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach music_table in array array[
    'gym_music_play_sessions',
    'gym_music_vote_counts',
    'gym_music_suggestions'
  ]
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = music_table
    )
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = music_table
      ) then
      execute format('alter publication supabase_realtime add table public.%I', music_table);
    end if;
  end loop;
end;
$$;

commit;
