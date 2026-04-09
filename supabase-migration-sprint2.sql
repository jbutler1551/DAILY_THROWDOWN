-- Sprint 2: Tournament Lifecycle + Streak Engine
-- Run this in the Supabase SQL Editor after sprint1 migration.

-- ============================================================
-- 2A. pg_cron: Daily Tournament Creation
-- ============================================================

-- Enable pg_cron (already enabled on Supabase Pro plans)
create extension if not exists pg_cron;

-- Create a function that inserts today's tournament if it doesn't exist
create or replace function create_daily_tournament()
returns void
language plpgsql
security definer
as $$
declare
  today date := current_date;
  start_time timestamptz := (today::text || 'T19:00:00+00')::timestamptz; -- 2:00 PM CT = 19:00 UTC
begin
  insert into tournaments (tournament_date, scheduled_at, status, prize_pool_cents)
  values (today, start_time, 'scheduled', 10000)
  on conflict (tournament_date) do nothing;
end;
$$;

-- Schedule: every day at 06:00 UTC (midnight CT)
select cron.schedule(
  'create-daily-tournament',
  '0 6 * * *',
  $$select create_daily_tournament()$$
);

-- ============================================================
-- 2B. Streak Update Trigger on Entry Insert
-- ============================================================

-- Function that fires AFTER INSERT on entries.
-- Compares the tournament date to the player's last_entry_date
-- to determine if the streak is consecutive or needs resetting.
-- Then updates the bye_round on the entry based on the new streak.
create or replace function update_streak_on_entry()
returns trigger
language plpgsql
security definer
as $$
declare
  t_date date;
  prev_last_entry date;
  prev_streak integer;
  new_streak integer;
  new_best integer;
  computed_bye integer;
begin
  -- Get the tournament date for this entry
  select tournament_date into t_date
  from tournaments
  where id = NEW.tournament_id;

  -- Get the player's current streak state
  select current_streak, best_streak, last_entry_date
  into prev_streak, new_best, prev_last_entry
  from streaks
  where profile_id = NEW.profile_id;

  -- If no streak row exists (shouldn't happen with ensureProfile, but be safe)
  if not found then
    insert into streaks (profile_id, current_streak, best_streak, last_entry_date, updated_at)
    values (NEW.profile_id, 1, 1, t_date, now());
    new_streak := 1;
  else
    -- Already entered this tournament date? Don't double-increment.
    if prev_last_entry = t_date then
      return NEW;
    end if;

    -- Consecutive day check: last entry was exactly yesterday
    if prev_last_entry = t_date - interval '1 day' then
      new_streak := prev_streak + 1;
    else
      -- Gap in days: reset streak
      new_streak := 1;
    end if;

    -- Update best if exceeded
    if new_streak > new_best then
      new_best := new_streak;
    end if;

    update streaks
    set current_streak = new_streak,
        best_streak = new_best,
        last_entry_date = t_date,
        updated_at = now()
    where profile_id = NEW.profile_id;
  end if;

  -- Compute bye_round from the NEW streak value
  if new_streak >= 15 then
    computed_bye := 3;
  elsif new_streak >= 5 then
    computed_bye := 2;
  else
    computed_bye := null;
  end if;

  -- Update the entry's streak_at_entry and bye_round with authoritative server values
  -- (overrides whatever the client sent, ensuring consistency)
  NEW.streak_at_entry := new_streak;
  NEW.bye_round := computed_bye;

  return NEW;
end;
$$;

-- Use BEFORE INSERT so we can modify NEW values (streak_at_entry, bye_round)
create trigger trg_update_streak_on_entry
  before insert on entries
  for each row
  execute function update_streak_on_entry();

-- ============================================================
-- 2B (cont). Move deadline column on matches (needed for Sprint 3,
-- but adding now so the schema is ready)
-- ============================================================

alter table matches
  add column if not exists move_deadline timestamptz;
