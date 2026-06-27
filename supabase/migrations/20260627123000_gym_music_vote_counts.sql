begin;

create table if not exists public.gym_music_vote_counts (
  play_session_id uuid primary key references public.gym_music_play_sessions(id) on delete cascade,
  like_count integer not null default 0 check (like_count >= 0),
  dislike_count integer not null default 0 check (dislike_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.gym_music_vote_counts enable row level security;

drop policy if exists gym_music_vote_counts_authenticated_read on public.gym_music_vote_counts;
create policy gym_music_vote_counts_authenticated_read
  on public.gym_music_vote_counts
  for select
  to authenticated
  using (true);

grant select on public.gym_music_vote_counts to authenticated;
grant select, insert, update, delete on public.gym_music_vote_counts to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'gym_music_vote_counts'
    ) then
    alter publication supabase_realtime add table public.gym_music_vote_counts;
  end if;
end;
$$;

create or replace function public.refresh_gym_music_vote_counts(p_play_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_play_session_id is null then
    return;
  end if;

  insert into public.gym_music_vote_counts (
    play_session_id,
    like_count,
    dislike_count,
    updated_at
  )
  select
    p_play_session_id,
    count(*) filter (where vote = 'like')::integer,
    count(*) filter (where vote = 'dislike')::integer,
    now()
  from public.gym_music_votes
  where play_session_id = p_play_session_id
  on conflict (play_session_id) do update
  set like_count = excluded.like_count,
      dislike_count = excluded.dislike_count,
      updated_at = now();
end;
$$;

create or replace function public.refresh_gym_music_vote_counts_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_gym_music_vote_counts(old.play_session_id);
    return old;
  end if;

  perform public.refresh_gym_music_vote_counts(new.play_session_id);

  if tg_op = 'UPDATE' and old.play_session_id is distinct from new.play_session_id then
    perform public.refresh_gym_music_vote_counts(old.play_session_id);
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_gym_music_vote_counts_after_change on public.gym_music_votes;
create trigger refresh_gym_music_vote_counts_after_change
  after insert or update or delete on public.gym_music_votes
  for each row
  execute function public.refresh_gym_music_vote_counts_trigger();

insert into public.gym_music_vote_counts (
  play_session_id,
  like_count,
  dislike_count,
  updated_at
)
select
  play_session_id,
  count(*) filter (where vote = 'like')::integer,
  count(*) filter (where vote = 'dislike')::integer,
  now()
from public.gym_music_votes
group by play_session_id
on conflict (play_session_id) do update
set like_count = excluded.like_count,
    dislike_count = excluded.dislike_count,
    updated_at = now();

revoke all on function public.refresh_gym_music_vote_counts(uuid) from public;
revoke all on function public.refresh_gym_music_vote_counts_trigger() from public;
grant execute on function public.refresh_gym_music_vote_counts(uuid) to service_role;

commit;
