-- Sprint 6: Push Notification Triggers
-- Run in Supabase SQL Editor after sprint5 migration.
-- NOTE: These cron jobs call the send-push Edge Function.
-- You must deploy the Edge Function first: supabase functions deploy send-push

-- ============================================================
-- 6A. Tournament Warning (15 min before start)
-- ============================================================

-- At 18:45 UTC (1:45 PM CT), send "starting in 15 min" notification
-- to all users with push tokens (not just entrants — encourage registration)
select cron.schedule(
  'tournament-15min-warning',
  '45 18 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'tournament-warning',
      'tournamentId', (select id::text from tournaments where tournament_date = current_date limit 1)
    )
  )
  $$
);

-- ============================================================
-- 6B. Tournament Complete Notification
-- ============================================================

-- Trigger: when tournament status changes to 'completed', notify all entrants
create or replace function notify_tournament_complete()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  -- Fire and forget via pg_net
  perform net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'tournament-complete',
      'tournamentId', NEW.id::text
    )
  );

  return NEW;
end;
$$;

create trigger trg_notify_tournament_complete
  after update on tournaments
  for each row
  execute function notify_tournament_complete();

-- NOTE: "match-ready" notifications are triggered from the advance_round()
-- function via the same mechanism. To add this, modify advance_round() to
-- call the send-push function with targetProfileIds of the new round's players.
-- This is left as a Sprint 7 enhancement to avoid over-complicating the
-- core bracket logic before load testing.
