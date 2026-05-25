-- Allow authenticated makers to record push-permission prompt outcomes
-- for vows they own. These are client-side audit events and contain no
-- authority to change vow state.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_events'
      and policyname = 'audit_insert_push_permission_events'
  ) then
    create policy "audit_insert_push_permission_events" on public.audit_events
      for insert with check (
        event_type in (
          'push_permission_prompt_seen',
          'push_permission_granted',
          'push_permission_denied'
        )
        and actor_type = 'maker'
        and actor_id = auth.uid()
        and vow_id in (
          select id
          from public.vows
          where user_id = auth.uid()
        )
      );
  end if;
end $$;
