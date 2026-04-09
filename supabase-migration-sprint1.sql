-- Sprint 1: Schema Additions + RLS Policies
-- Run this in the Supabase SQL Editor after the initial schema.

-- ============================================================
-- 1A. SCHEMA ADDITIONS
-- ============================================================

-- profiles: add stat columns + push token
alter table profiles
  add column if not exists earnings_cents integer not null default 0,
  add column if not exists total_wins integer not null default 0,
  add column if not exists total_losses integer not null default 0,
  add column if not exists total_tournaments integer not null default 0,
  add column if not exists championships integer not null default 0,
  add column if not exists final_four_appearances integer not null default 0,
  add column if not exists push_token text;

-- streaks: track last entry date for consecutive-day logic
alter table streaks
  add column if not exists last_entry_date date;

-- indexes for common query patterns
create index if not exists idx_entries_profile_id on entries(profile_id);
create index if not exists idx_throws_match_entry on throws(match_id, entry_id);

-- ============================================================
-- 1B. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- ---------- profiles ----------
alter table profiles enable row level security;

create policy "profiles_public_read"
  on profiles for select
  using (true);

create policy "profiles_self_update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_self_insert"
  on profiles for insert
  with check (auth.uid() = id);

-- ---------- streaks ----------
alter table streaks enable row level security;

create policy "streaks_public_read"
  on streaks for select
  using (true);

create policy "streaks_self_update"
  on streaks for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "streaks_self_insert"
  on streaks for insert
  with check (auth.uid() = profile_id);

-- ---------- tournaments ----------
alter table tournaments enable row level security;

create policy "tournaments_public_read"
  on tournaments for select
  using (true);

-- service-role only for insert/update (pg_cron + edge functions use service role)
-- No insert/update policies for anon/authenticated = blocked by default

-- ---------- entries ----------
alter table entries enable row level security;

create policy "entries_public_read"
  on entries for select
  using (true);

create policy "entries_self_insert"
  on entries for insert
  with check (auth.uid() = profile_id);

-- update restricted to service role (tournament engine sets status)
-- No update policy for anon/authenticated = blocked by default

-- ---------- matches ----------
alter table matches enable row level security;

create policy "matches_public_read"
  on matches for select
  using (true);

-- insert/update restricted to service role (bracket generation + resolution)

-- ---------- throws ----------
-- ANTI-CHEAT: Players can only see their own throws, or opponent throws
-- after the match game is resolved (i.e. match_games row exists for that game).
alter table throws enable row level security;

create policy "throws_self_insert"
  on throws for insert
  with check (
    auth.uid() = (select e.profile_id from entries e where e.id = entry_id)
  );

create policy "throws_read_own"
  on throws for select
  using (
    auth.uid() = (select e.profile_id from entries e where e.id = entry_id)
  );

create policy "throws_read_opponent_after_resolve"
  on throws for select
  using (
    exists (
      select 1 from match_games mg
      where mg.match_id = throws.match_id
        and mg.game_number = throws.game_number
    )
  );

-- ---------- match_games ----------
alter table match_games enable row level security;

create policy "match_games_public_read"
  on match_games for select
  using (true);

-- insert/update restricted to service role (resolution functions)
