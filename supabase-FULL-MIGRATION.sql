-- ================================================================
-- DAILY THROWDOWN — COMPLETE DATABASE MIGRATION
-- Paste this entire script into Supabase SQL Editor and run.
-- Combines: base schema + sprint 1-5 + sprint 6 (without pg_net)
-- ================================================================

-- ============================================================
-- BASE SCHEMA: 7 tables + indexes
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists streaks (
  profile_id uuid primary key references profiles(id) on delete cascade,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  tournament_date date not null unique,
  scheduled_at timestamptz not null,
  status text not null check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  prize_pool_cents integer not null default 10000,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  streak_at_entry integer not null default 0,
  bye_round integer,
  status text not null default 'active' check (status in ('active', 'eliminated', 'winner', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (tournament_id, profile_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number integer not null,
  slot_index integer not null,
  phase text not null,
  best_of integer not null default 1,
  player_a_entry_id uuid references entries(id) on delete set null,
  player_b_entry_id uuid references entries(id) on delete set null,
  winner_entry_id uuid references entries(id) on delete set null,
  loser_entry_id uuid references entries(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'live', 'completed')),
  tie_count integer not null default 0,
  house_match boolean not null default false,
  dual_advance boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tournament_id, round_number, slot_index)
);

create table if not exists throws (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  game_number integer not null default 1,
  entry_id uuid references entries(id) on delete cascade,
  move text not null check (move in ('rock', 'paper', 'scissors')),
  created_at timestamptz not null default now()
);

create table if not exists match_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  game_number integer not null,
  player_a_move text check (player_a_move in ('rock', 'paper', 'scissors')),
  player_b_move text check (player_b_move in ('rock', 'paper', 'scissors')),
  winner_entry_id uuid references entries(id) on delete set null,
  result text not null check (result in ('player_a', 'player_b', 'tie', 'dual_advance')),
  created_at timestamptz not null default now(),
  unique (match_id, game_number)
);

create index if not exists idx_entries_tournament_id on entries(tournament_id);
create index if not exists idx_matches_tournament_round on matches(tournament_id, round_number);
create index if not exists idx_throws_match_id on throws(match_id);
create index if not exists idx_match_games_match_id on match_games(match_id);

-- ============================================================
-- SPRINT 1: Column additions + RLS
-- ============================================================

alter table profiles
  add column if not exists earnings_cents integer not null default 0,
  add column if not exists total_wins integer not null default 0,
  add column if not exists total_losses integer not null default 0,
  add column if not exists total_tournaments integer not null default 0,
  add column if not exists championships integer not null default 0,
  add column if not exists final_four_appearances integer not null default 0,
  add column if not exists push_token text;

alter table streaks
  add column if not exists last_entry_date date;

create index if not exists idx_entries_profile_id on entries(profile_id);
create index if not exists idx_throws_match_entry on throws(match_id, entry_id);

-- RLS: profiles
alter table profiles enable row level security;
create policy "profiles_public_read" on profiles for select using (true);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);

-- RLS: streaks
alter table streaks enable row level security;
create policy "streaks_public_read" on streaks for select using (true);
create policy "streaks_self_update" on streaks for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "streaks_self_insert" on streaks for insert with check (auth.uid() = profile_id);

-- RLS: tournaments
alter table tournaments enable row level security;
create policy "tournaments_public_read" on tournaments for select using (true);

-- RLS: entries
alter table entries enable row level security;
create policy "entries_public_read" on entries for select using (true);
create policy "entries_self_insert" on entries for insert with check (auth.uid() = profile_id);

-- RLS: matches
alter table matches enable row level security;
create policy "matches_public_read" on matches for select using (true);

-- RLS: throws (ANTI-CHEAT)
alter table throws enable row level security;
create policy "throws_self_insert" on throws for insert
  with check (auth.uid() = (select e.profile_id from entries e where e.id = entry_id));
create policy "throws_read_own" on throws for select
  using (auth.uid() = (select e.profile_id from entries e where e.id = entry_id));
create policy "throws_read_opponent_after_resolve" on throws for select
  using (exists (select 1 from match_games mg where mg.match_id = throws.match_id and mg.game_number = throws.game_number));

-- RLS: match_games
alter table match_games enable row level security;
create policy "match_games_public_read" on match_games for select using (true);

-- ============================================================
-- SPRINT 2: pg_cron + streak trigger + move_deadline
-- ============================================================

create extension if not exists pg_cron;

alter table matches add column if not exists move_deadline timestamptz;

create or replace function create_daily_tournament()
returns void language plpgsql security definer as $$
declare
  today date := current_date;
  start_time timestamptz := (today::text || 'T19:00:00+00')::timestamptz;
begin
  insert into tournaments (tournament_date, scheduled_at, status, prize_pool_cents)
  values (today, start_time, 'scheduled', 10000)
  on conflict (tournament_date) do nothing;
end;
$$;

select cron.schedule('create-daily-tournament', '0 6 * * *', $$select create_daily_tournament()$$);

create or replace function update_streak_on_entry()
returns trigger language plpgsql security definer as $$
declare
  t_date date;
  prev_last_entry date;
  prev_streak integer;
  new_streak integer;
  new_best integer;
  computed_bye integer;
begin
  select tournament_date into t_date from tournaments where id = NEW.tournament_id;
  select current_streak, best_streak, last_entry_date
  into prev_streak, new_best, prev_last_entry from streaks where profile_id = NEW.profile_id;

  if not found then
    insert into streaks (profile_id, current_streak, best_streak, last_entry_date, updated_at)
    values (NEW.profile_id, 1, 1, t_date, now());
    new_streak := 1;
  else
    if prev_last_entry = t_date then return NEW; end if;
    if prev_last_entry = t_date - interval '1 day' then
      new_streak := prev_streak + 1;
    else
      new_streak := 1;
    end if;
    if new_streak > new_best then new_best := new_streak; end if;
    update streaks set current_streak = new_streak, best_streak = new_best,
      last_entry_date = t_date, updated_at = now() where profile_id = NEW.profile_id;
  end if;

  if new_streak >= 15 then computed_bye := 3;
  elsif new_streak >= 5 then computed_bye := 2;
  else computed_bye := null; end if;

  NEW.streak_at_entry := new_streak;
  NEW.bye_round := computed_bye;
  return NEW;
end;
$$;

create trigger trg_update_streak_on_entry
  before insert on entries for each row execute function update_streak_on_entry();

-- ============================================================
-- SPRINT 3: Bracket generation + match resolution + timeouts
-- ============================================================

create or replace function generate_round(p_tournament_id uuid, p_round_number integer)
returns void language plpgsql security definer as $$
declare
  entry_ids uuid[];
  i integer;
  slot integer := 0;
  total integer;
  players_remaining integer;
  match_phase text;
  match_best_of integer;
  new_match_id uuid;
begin
  if p_round_number = 1 then
    select array_agg(id order by random()) into entry_ids from entries
    where tournament_id = p_tournament_id and status = 'active'
      and (bye_round is null or bye_round < p_round_number);
  else
    select array_agg(entry_id order by random()) into entry_ids from round_entries;
  end if;

  if entry_ids is null then entry_ids := '{}'; end if;
  total := coalesce(array_length(entry_ids, 1), 0);

  select count(*) into players_remaining from entries
  where tournament_id = p_tournament_id and status = 'active';

  if players_remaining <= 2 then match_phase := 'championship';
  elsif players_remaining <= 4 then match_phase := 'semifinal';
  elsif players_remaining <= 16 then match_phase := 'broadcast';
  else match_phase := 'elimination'; end if;

  if players_remaining <= 4 then match_best_of := 3;
  else match_best_of := 1; end if;

  i := 1;
  while i <= total loop
    if i + 1 <= total then
      insert into matches (tournament_id, round_number, slot_index, phase, best_of,
        player_a_entry_id, player_b_entry_id, status, house_match)
      values (p_tournament_id, p_round_number, slot, match_phase, match_best_of,
        entry_ids[i], entry_ids[i+1], 'live', false);
      i := i + 2;
    else
      insert into matches (tournament_id, round_number, slot_index, phase, best_of,
        player_a_entry_id, player_b_entry_id, status, house_match)
      values (p_tournament_id, p_round_number, slot, match_phase, match_best_of,
        entry_ids[i], null, 'live', true)
      returning id into new_match_id;

      insert into throws (match_id, game_number, entry_id, move)
      values (new_match_id, 1, null,
        (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]);
      i := i + 1;
    end if;
    slot := slot + 1;
  end loop;

  update matches set move_deadline = now() + interval '60 seconds'
  where tournament_id = p_tournament_id and round_number = p_round_number and status = 'live';
end;
$$;

create or replace function start_tournament(p_tournament_id uuid)
returns void language plpgsql security definer as $$
begin
  update tournaments set status = 'live' where id = p_tournament_id and status = 'scheduled';

  if not exists (select 1 from entries where tournament_id = p_tournament_id and status = 'active') then
    update tournaments set status = 'cancelled' where id = p_tournament_id;
    return;
  end if;

  if (select count(*) from entries where tournament_id = p_tournament_id and status = 'active') = 1 then
    update entries set status = 'winner' where tournament_id = p_tournament_id and status = 'active';
    update tournaments set status = 'completed' where id = p_tournament_id;
    return;
  end if;

  perform generate_round(p_tournament_id, 1);
end;
$$;

select cron.schedule('start-daily-tournament', '0 19 * * *',
  $$select start_tournament(id) from tournaments where tournament_date = current_date and status = 'scheduled'$$);

create or replace function rps_winner(move_a text, move_b text)
returns text language plpgsql immutable as $$
begin
  if move_a = move_b then return 'tie'; end if;
  if (move_a = 'rock' and move_b = 'scissors') or
     (move_a = 'scissors' and move_b = 'paper') or
     (move_a = 'paper' and move_b = 'rock') then return 'a'; end if;
  return 'b';
end;
$$;

create or replace function resolve_game(p_match_id uuid, p_game_number integer)
returns void language plpgsql security definer as $$
declare
  m record; throw_a record; throw_b record;
  result text; game_result text; game_winner uuid;
  a_series_wins integer; b_series_wins integer; new_tie_count integer;
begin
  select * into m from matches where id = p_match_id for update;
  if m.status != 'live' then return; end if;

  select * into throw_a from throws
  where match_id = p_match_id and game_number = p_game_number and entry_id = m.player_a_entry_id;

  if m.house_match then
    select * into throw_b from throws
    where match_id = p_match_id and game_number = p_game_number and entry_id is null;
  else
    select * into throw_b from throws
    where match_id = p_match_id and game_number = p_game_number and entry_id = m.player_b_entry_id;
  end if;

  if throw_a is null or throw_b is null then return; end if;

  result := rps_winner(throw_a.move, throw_b.move);

  if result = 'tie' then game_result := 'tie'; game_winner := null;
  elsif result = 'a' then game_result := 'player_a'; game_winner := m.player_a_entry_id;
  else game_result := 'player_b'; game_winner := m.player_b_entry_id; end if;

  insert into match_games (match_id, game_number, player_a_move, player_b_move, winner_entry_id, result)
  values (p_match_id, p_game_number, throw_a.move, throw_b.move, game_winner, game_result)
  on conflict (match_id, game_number) do nothing;

  if result = 'tie' then
    new_tie_count := m.tie_count + 1;
    update matches set tie_count = new_tie_count where id = p_match_id;
    if new_tie_count >= 5 then
      update matches set dual_advance = true, status = 'completed',
        winner_entry_id = m.player_a_entry_id where id = p_match_id;
      return;
    end if;
    update matches set move_deadline = now() + interval '60 seconds' where id = p_match_id;
    return;
  end if;

  update matches set tie_count = 0 where id = p_match_id;

  if m.best_of = 1 then
    if result = 'a' then
      update matches set status = 'completed', winner_entry_id = m.player_a_entry_id,
        loser_entry_id = m.player_b_entry_id where id = p_match_id;
      if not m.house_match then
        update entries set status = 'eliminated' where id = m.player_b_entry_id;
      end if;
    else
      update matches set status = 'completed', winner_entry_id = m.player_b_entry_id,
        loser_entry_id = m.player_a_entry_id where id = p_match_id;
      update entries set status = 'eliminated' where id = m.player_a_entry_id;
    end if;
  else
    select count(*) into a_series_wins from match_games where match_id = p_match_id and result = 'player_a';
    select count(*) into b_series_wins from match_games where match_id = p_match_id and result = 'player_b';

    if a_series_wins >= 2 then
      update matches set status = 'completed', winner_entry_id = m.player_a_entry_id,
        loser_entry_id = m.player_b_entry_id where id = p_match_id;
      if not m.house_match then update entries set status = 'eliminated' where id = m.player_b_entry_id; end if;
    elsif b_series_wins >= 2 then
      update matches set status = 'completed', winner_entry_id = m.player_b_entry_id,
        loser_entry_id = m.player_a_entry_id where id = p_match_id;
      update entries set status = 'eliminated' where id = m.player_a_entry_id;
    else
      update matches set move_deadline = now() + interval '60 seconds' where id = p_match_id;
    end if;
  end if;
end;
$$;

create or replace function advance_round(p_tournament_id uuid, p_round_number integer)
returns void language plpgsql security definer as $$
declare
  winner_entries uuid[]; bye_entries uuid[]; all_entries uuid[];
  next_round integer := p_round_number + 1;
begin
  select array_agg(winner_entry_id) into winner_entries from matches
  where tournament_id = p_tournament_id and round_number = p_round_number
    and status = 'completed' and winner_entry_id is not null;

  with dual as (
    select player_b_entry_id from matches
    where tournament_id = p_tournament_id and round_number = p_round_number
      and dual_advance = true and player_b_entry_id is not null
  )
  select array_agg(player_b_entry_id) into bye_entries from dual;

  all_entries := coalesce(winner_entries, '{}') || coalesce(bye_entries, '{}');

  with byes as (
    select id from entries
    where tournament_id = p_tournament_id and status = 'active' and bye_round = next_round
  )
  select array_agg(id) into bye_entries from byes;

  all_entries := all_entries || coalesce(bye_entries, '{}');

  if array_length(all_entries, 1) is null or array_length(all_entries, 1) <= 1 then
    if array_length(all_entries, 1) = 1 then
      update entries set status = 'winner' where id = all_entries[1];
    end if;
    update tournaments set status = 'completed' where id = p_tournament_id;
    return;
  end if;

  drop table if exists round_entries;
  create temp table round_entries (entry_id uuid) on commit drop;
  insert into round_entries select unnest(all_entries);
  perform generate_round(p_tournament_id, next_round);
end;
$$;

create or replace function check_round_complete()
returns trigger language plpgsql security definer as $$
declare pending_count integer;
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then return NEW; end if;
  select count(*) into pending_count from matches
  where tournament_id = NEW.tournament_id and round_number = NEW.round_number and status != 'completed';
  if pending_count = 0 then perform advance_round(NEW.tournament_id, NEW.round_number); end if;
  return NEW;
end;
$$;

create trigger trg_check_round_complete
  after update on matches for each row execute function check_round_complete();

-- Move timeout handler
create or replace function process_move_timeouts()
returns void language plpgsql security definer as $$
declare
  m record; current_game integer; a_submitted boolean; b_submitted boolean;
begin
  for m in select * from matches where status = 'live' and move_deadline is not null and move_deadline < now()
  loop
    select coalesce(max(game_number), 0) + 1 into current_game from match_games where match_id = m.id;
    if exists (select 1 from match_games where match_id = m.id and game_number = current_game) then continue; end if;

    a_submitted := exists (select 1 from throws where match_id = m.id and game_number = current_game and entry_id = m.player_a_entry_id);
    if m.house_match then
      b_submitted := exists (select 1 from throws where match_id = m.id and game_number = current_game and entry_id is null);
    else
      b_submitted := exists (select 1 from throws where match_id = m.id and game_number = current_game and entry_id = m.player_b_entry_id);
    end if;

    if a_submitted and b_submitted then
      perform resolve_game(m.id, current_game);
    elsif a_submitted and not b_submitted then
      if m.house_match then
        insert into throws (match_id, game_number, entry_id, move) values (m.id, current_game, null, (array['rock','paper','scissors'])[floor(random()*3+1)]);
      else
        insert into throws (match_id, game_number, entry_id, move) values (m.id, current_game, m.player_b_entry_id, (array['rock','paper','scissors'])[floor(random()*3+1)]);
      end if;
      perform resolve_game(m.id, current_game);
    elsif not a_submitted and b_submitted then
      insert into throws (match_id, game_number, entry_id, move) values (m.id, current_game, m.player_a_entry_id, (array['rock','paper','scissors'])[floor(random()*3+1)]);
      perform resolve_game(m.id, current_game);
    else
      insert into throws (match_id, game_number, entry_id, move) values (m.id, current_game, m.player_a_entry_id, (array['rock','paper','scissors'])[floor(random()*3+1)]);
      if m.house_match then
        insert into throws (match_id, game_number, entry_id, move) values (m.id, current_game, null, (array['rock','paper','scissors'])[floor(random()*3+1)]);
      else
        insert into throws (match_id, game_number, entry_id, move) values (m.id, current_game, m.player_b_entry_id, (array['rock','paper','scissors'])[floor(random()*3+1)]);
      end if;
      perform resolve_game(m.id, current_game);
    end if;
  end loop;
end;
$$;

select cron.schedule('process-move-timeouts', '* * * * *', $$select process_move_timeouts()$$);

-- ============================================================
-- SPRINT 5: Stats finalization trigger
-- ============================================================

create or replace function finalize_tournament_stats()
returns trigger language plpgsql security definer as $$
declare
  t_id uuid := NEW.id; champ_entry record; runner_entry_id uuid; semi_entry_ids uuid[];
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then return NEW; end if;

  update profiles set total_tournaments = total_tournaments + 1
  where id in (select profile_id from entries where tournament_id = t_id);

  update profiles p set total_wins = p.total_wins + sub.wins
  from (select e.profile_id, count(*) as wins from matches m join entries e on e.id = m.winner_entry_id
    where m.tournament_id = t_id and m.status = 'completed' group by e.profile_id) sub
  where p.id = sub.profile_id;

  update profiles p set total_losses = p.total_losses + sub.losses
  from (select e.profile_id, count(*) as losses from matches m join entries e on e.id = m.loser_entry_id
    where m.tournament_id = t_id and m.status = 'completed' group by e.profile_id) sub
  where p.id = sub.profile_id;

  select * into champ_entry from entries where tournament_id = t_id and status = 'winner' limit 1;
  if champ_entry is not null then
    update profiles set earnings_cents = earnings_cents + 5500, championships = championships + 1,
      final_four_appearances = final_four_appearances + 1 where id = champ_entry.profile_id;

    select loser_entry_id into runner_entry_id from matches
    where tournament_id = t_id and phase = 'championship' and status = 'completed' limit 1;
    if runner_entry_id is not null then
      update profiles p set earnings_cents = p.earnings_cents + 2500,
        final_four_appearances = p.final_four_appearances + 1
      from entries e where e.id = runner_entry_id and p.id = e.profile_id;
    end if;

    select array_agg(loser_entry_id) into semi_entry_ids from matches
    where tournament_id = t_id and phase = 'semifinal' and status = 'completed' and loser_entry_id is not null;
    if semi_entry_ids is not null then
      update profiles p set earnings_cents = p.earnings_cents + 1000,
        final_four_appearances = p.final_four_appearances + 1
      from entries e where e.id = any(semi_entry_ids) and p.id = e.profile_id;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_finalize_tournament_stats
  after update on tournaments for each row execute function finalize_tournament_stats();

-- ============================================================
-- DONE! Now enable Realtime on these tables via Supabase Dashboard:
--   matches, match_games, entries, tournaments
-- Then deploy Edge Functions:
--   supabase functions deploy submit-move
--   supabase functions deploy send-push
-- ============================================================
