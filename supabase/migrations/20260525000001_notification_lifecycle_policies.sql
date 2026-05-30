-- Notification lifecycle hardening.
-- Let authenticated app clients record push opens for vows they can already see.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_events'
      and policyname = 'audit_insert_notification_opened'
  ) then
    create policy "audit_insert_notification_opened" on public.audit_events
      for insert with check (
        event_type = 'notification_opened'
        and actor_type = 'system'
        and vow_id in (
          select id
          from public.vows
          where user_id = auth.uid()
             or witness_user_id = auth.uid()
             or target_user_id = auth.uid()
        )
      );
  end if;
end $$;
