begin;

drop policy if exists user_memberships_delete_own on public.user_memberships;
create policy user_memberships_delete_own
  on public.user_memberships
  for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
