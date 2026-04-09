-- Sprint 3: Bracket Generation + Match Resolution + Timeouts
-- THE CORE — all game logic lives server-side. Real money depends on this.
-- Run in Supabase SQL Editor after sprint2 migration.

-- ============================================================
-- 3A. BRACKET GENERATION
-- ============================================================

-- Generate matches for a given round of a tournament.
-- Round 1: pairs entries with no bye (or whose bye_round < round_number).
-- Subsequent rounds: called by advance_round() with winners from prior round.
create or replace function generate_round(
  p_tournament_id uuid,
  p_round_number integer
)
returns void
language plpgsql
security definer
as $$
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
    -- Round 1: gather entries that don't have a bye for this round
    select array_agg(id order by random())
    into entry_ids
    from entries
    where tournament_id = p_tournament_id
      and status = 'active'
      and (bye_round is null or bye_round < p_round_number);
  else
    -- Later rounds: entries are injected by advance_round() into a temp table
    -- We read from a temp table 'round_entries' created by advance_round()
    select array_agg(entry_id order by random())
    into entry_ids
    from round_entries;
  end if;

  if entry_ids is null then
    entry_ids := '{}';
  end if;

  total := array_length(entry_ids, 1);
  if total is null then total := 0; end if;

  -- Determine total players remaining in tournament for phase/best_of logic
  select count(*) into players_remaining
  from entries
  where tournament_id = p_tournament_id and status = 'active';

  -- Determine phase
  if players_remaining <= 2 then
    match_phase := 'championship';
  elsif players_remaining <= 4 then
    match_phase := 'semifinal';
  elsif players_remaining <= 16 then
    match_phase := 'broadcast';
  else
    match_phase := 'elimination';
  end if;

  -- Best-of-3 for final 4 or fewer
  if players_remaining <= 4 then
    match_best_of := 3;
  else
    match_best_of := 1;
  end if;

  -- Pair players sequentially
  i := 1;
  while i <= total loop
    if i + 1 <= total then
      -- Normal match: two players
      insert into matches (
        tournament_id, round_number, slot_index, phase, best_of,
        player_a_entry_id, player_b_entry_id, status, house_match
      ) values (
        p_tournament_id, p_round_number, slot, match_phase, match_best_of,
        entry_ids[i], entry_ids[i+1], 'live', false
      );
      i := i + 2;
    else
      -- Odd player: house match
      insert into matches (
        tournament_id, round_number, slot_index, phase, best_of,
        player_a_entry_id, player_b_entry_id, status, house_match
      ) values (
        p_tournament_id, p_round_number, slot, match_phase, match_best_of,
        entry_ids[i], null, 'live', true
      )
      returning id into new_match_id;

      -- Pre-generate house throw (random move)
      insert into throws (match_id, game_number, entry_id, move)
      values (
        new_match_id,
        1,
        null, -- house has no entry_id
        (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]
      );

      i := i + 1;
    end if;

    slot := slot + 1;
  end loop;

  -- Set move_deadline on all new matches
  update matches
  set move_deadline = now() + interval '60 seconds'
  where tournament_id = p_tournament_id
    and round_number = p_round_number
    and status = 'live';
end;
$$;

-- Start a tournament: flip status to live, generate round 1.
create or replace function start_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update tournaments
  set status = 'live'
  where id = p_tournament_id and status = 'scheduled';

  -- Check if any entries exist
  if not exists (
    select 1 from entries
    where tournament_id = p_tournament_id and status = 'active'
  ) then
    -- No entrants: cancel
    update tournaments set status = 'cancelled' where id = p_tournament_id;
    return;
  end if;

  -- If only 1 entrant: auto-win
  if (select count(*) from entries
      where tournament_id = p_tournament_id and status = 'active') = 1 then
    update entries set status = 'winner'
    where tournament_id = p_tournament_id and status = 'active';
    update tournaments set status = 'completed' where id = p_tournament_id;
    return;
  end if;

  perform generate_round(p_tournament_id, 1);
end;
$$;

-- ============================================================
-- 3B. pg_cron: Tournament Start at 2 PM CT (19:00 UTC)
-- ============================================================

select cron.schedule(
  'start-daily-tournament',
  '0 19 * * *',
  $$select start_tournament(id) from tournaments where tournament_date = current_date and status = 'scheduled'$$
);

-- ============================================================
-- 3C. GAME RESOLUTION
-- ============================================================

-- RPS winner logic: returns 'a', 'b', or 'tie'
create or replace function rps_winner(move_a text, move_b text)
returns text
language plpgsql
immutable
as $$
begin
  if move_a = move_b then return 'tie'; end if;
  if (move_a = 'rock' and move_b = 'scissors') or
     (move_a = 'scissors' and move_b = 'paper') or
     (move_a = 'paper' and move_b = 'rock') then
    return 'a';
  end if;
  return 'b';
end;
$$;

-- Resolve a single game within a match.
-- Called after both players have submitted throws for a game_number.
create or replace function resolve_game(p_match_id uuid, p_game_number integer)
returns void
language plpgsql
security definer
as $$
declare
  m record;
  throw_a record;
  throw_b record;
  result text;
  game_result text;
  game_winner uuid;
  a_series_wins integer;
  b_series_wins integer;
  new_tie_count integer;
begin
  -- Lock the match row
  select * into m from matches where id = p_match_id for update;

  if m.status != 'live' then return; end if;

  -- Get throws for this game
  -- Player A's throw
  select * into throw_a from throws
  where match_id = p_match_id and game_number = p_game_number
    and entry_id = m.player_a_entry_id;

  -- Player B's throw (or house throw where entry_id is null)
  if m.house_match then
    select * into throw_b from throws
    where match_id = p_match_id and game_number = p_game_number
      and entry_id is null;
  else
    select * into throw_b from throws
    where match_id = p_match_id and game_number = p_game_number
      and entry_id = m.player_b_entry_id;
  end if;

  if throw_a is null or throw_b is null then return; end if;

  -- Determine winner
  result := rps_winner(throw_a.move, throw_b.move);

  if result = 'tie' then
    game_result := 'tie';
    game_winner := null;
  elsif result = 'a' then
    game_result := 'player_a';
    game_winner := m.player_a_entry_id;
  else
    game_result := 'player_b';
    game_winner := m.player_b_entry_id;
  end if;

  -- Insert match_games record
  insert into match_games (match_id, game_number, player_a_move, player_b_move, winner_entry_id, result)
  values (p_match_id, p_game_number, throw_a.move, throw_b.move, game_winner, game_result)
  on conflict (match_id, game_number) do nothing;

  -- Handle tie
  if result = 'tie' then
    new_tie_count := m.tie_count + 1;
    update matches set tie_count = new_tie_count where id = p_match_id;

    -- 5 consecutive ties = dual advance
    if new_tie_count >= 5 then
      update matches
      set dual_advance = true, status = 'completed',
          winner_entry_id = m.player_a_entry_id  -- both advance, but we track A as nominal winner
      where id = p_match_id;

      -- Don't eliminate either player (both advance)
      return;
    end if;

    -- Reset move_deadline for next game
    update matches
    set move_deadline = now() + interval '60 seconds'
    where id = p_match_id;
    return;
  end if;

  -- Non-tie: reset consecutive tie count
  update matches set tie_count = 0 where id = p_match_id;

  if m.best_of = 1 then
    -- Best-of-1: match is complete
    if result = 'a' then
      update matches
      set status = 'completed',
          winner_entry_id = m.player_a_entry_id,
          loser_entry_id = m.player_b_entry_id
      where id = p_match_id;

      -- Eliminate loser (skip for house matches)
      if not m.house_match then
        update entries set status = 'eliminated'
        where id = m.player_b_entry_id;
      end if;
    else
      update matches
      set status = 'completed',
          winner_entry_id = m.player_b_entry_id,
          loser_entry_id = m.player_a_entry_id
      where id = p_match_id;

      update entries set status = 'eliminated'
      where id = m.player_a_entry_id;
    end if;
  else
    -- Best-of-3: check series score
    select count(*) into a_series_wins from match_games
    where match_id = p_match_id and result = 'player_a';

    select count(*) into b_series_wins from match_games
    where match_id = p_match_id and result = 'player_b';

    if a_series_wins >= 2 then
      update matches
      set status = 'completed',
          winner_entry_id = m.player_a_entry_id,
          loser_entry_id = m.player_b_entry_id
      where id = p_match_id;

      if not m.house_match then
        update entries set status = 'eliminated'
        where id = m.player_b_entry_id;
      end if;
    elsif b_series_wins >= 2 then
      update matches
      set status = 'completed',
          winner_entry_id = m.player_b_entry_id,
          loser_entry_id = m.player_a_entry_id
      where id = p_match_id;

      update entries set status = 'eliminated'
      where id = m.player_a_entry_id;
    else
      -- Series continues: reset deadline for next game
      update matches
      set move_deadline = now() + interval '60 seconds'
      where id = p_match_id;
    end if;
  end if;
end;
$$;

-- ============================================================
-- 3D. ROUND ADVANCEMENT
-- ============================================================

-- Advance to next round after all matches in current round complete.
create or replace function advance_round(
  p_tournament_id uuid,
  p_round_number integer
)
returns void
language plpgsql
security definer
as $$
declare
  winner_entries uuid[];
  bye_entries uuid[];
  all_entries uuid[];
  next_round integer := p_round_number + 1;
begin
  -- Collect winners from completed matches (including both for dual-advance)
  select array_agg(winner_entry_id)
  into winner_entries
  from matches
  where tournament_id = p_tournament_id
    and round_number = p_round_number
    and status = 'completed'
    and winner_entry_id is not null;

  -- Also add player_b from dual-advance matches
  -- (player_a is already the nominal winner_entry_id)
  with dual as (
    select player_b_entry_id
    from matches
    where tournament_id = p_tournament_id
      and round_number = p_round_number
      and dual_advance = true
      and player_b_entry_id is not null
  )
  select array_agg(player_b_entry_id) into bye_entries from dual;

  -- Merge arrays
  all_entries := coalesce(winner_entries, '{}') || coalesce(bye_entries, '{}');

  -- Inject bye entries for next round (players who had a bye for this round)
  with byes as (
    select id from entries
    where tournament_id = p_tournament_id
      and status = 'active'
      and bye_round = next_round
  )
  select array_agg(id) into bye_entries from byes;

  all_entries := all_entries || coalesce(bye_entries, '{}');

  -- Check if tournament is over (1 or 0 players left)
  if array_length(all_entries, 1) is null or array_length(all_entries, 1) <= 1 then
    -- Tournament complete
    if array_length(all_entries, 1) = 1 then
      update entries set status = 'winner' where id = all_entries[1];
    end if;
    update tournaments set status = 'completed' where id = p_tournament_id;
    return;
  end if;

  -- Create temp table for generate_round to read from
  drop table if exists round_entries;
  create temp table round_entries (entry_id uuid) on commit drop;
  insert into round_entries
  select unnest(all_entries);

  perform generate_round(p_tournament_id, next_round);
end;
$$;

-- Trigger: when all matches in a round complete, advance to next round.
create or replace function check_round_complete()
returns trigger
language plpgsql
security definer
as $$
declare
  pending_count integer;
begin
  -- Only fire when status changes to 'completed'
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  -- Count non-completed matches in this round
  select count(*) into pending_count
  from matches
  where tournament_id = NEW.tournament_id
    and round_number = NEW.round_number
    and status != 'completed';

  if pending_count = 0 then
    perform advance_round(NEW.tournament_id, NEW.round_number);
  end if;

  return NEW;
end;
$$;

create trigger trg_check_round_complete
  after update on matches
  for each row
  execute function check_round_complete();

-- ============================================================
-- 3E. MOVE TIMEOUT (pg_cron every minute)
-- ============================================================

-- Auto-forfeit players who don't submit within the deadline.
create or replace function process_move_timeouts()
returns void
language plpgsql
security definer
as $$
declare
  m record;
  current_game integer;
  a_submitted boolean;
  b_submitted boolean;
begin
  for m in
    select * from matches
    where status = 'live'
      and move_deadline is not null
      and move_deadline < now()
  loop
    -- Determine current game number
    select coalesce(max(game_number), 0) + 1 into current_game
    from match_games where match_id = m.id;

    -- But if we already have a game for this number, skip (race condition guard)
    if exists (select 1 from match_games where match_id = m.id and game_number = current_game) then
      continue;
    end if;

    -- Check who has submitted
    a_submitted := exists (
      select 1 from throws
      where match_id = m.id and game_number = current_game
        and entry_id = m.player_a_entry_id
    );

    if m.house_match then
      b_submitted := exists (
        select 1 from throws
        where match_id = m.id and game_number = current_game
          and entry_id is null
      );
    else
      b_submitted := exists (
        select 1 from throws
        where match_id = m.id and game_number = current_game
          and entry_id = m.player_b_entry_id
      );
    end if;

    if a_submitted and b_submitted then
      -- Both submitted but game wasn't resolved (edge case) — resolve now
      perform resolve_game(m.id, current_game);
    elsif a_submitted and not b_submitted then
      -- B didn't submit: auto-forfeit B (A wins with random move for record)
      if m.house_match then
        -- House didn't throw? Generate one and resolve
        insert into throws (match_id, game_number, entry_id, move)
        values (m.id, current_game, null,
                (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]);
      else
        -- B forfeits: insert a losing throw for B
        insert into throws (match_id, game_number, entry_id, move)
        values (m.id, current_game, m.player_b_entry_id,
                (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]);
      end if;
      perform resolve_game(m.id, current_game);
    elsif not a_submitted and b_submitted then
      -- A didn't submit: auto-forfeit A
      insert into throws (match_id, game_number, entry_id, move)
      values (m.id, current_game, m.player_a_entry_id,
              (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]);
      perform resolve_game(m.id, current_game);
    else
      -- Neither submitted: random resolution
      insert into throws (match_id, game_number, entry_id, move)
      values (m.id, current_game, m.player_a_entry_id,
              (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]);
      if m.house_match then
        insert into throws (match_id, game_number, entry_id, move)
        values (m.id, current_game, null,
                (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]);
      else
        insert into throws (match_id, game_number, entry_id, move)
        values (m.id, current_game, m.player_b_entry_id,
                (array['rock', 'paper', 'scissors'])[floor(random() * 3 + 1)]);
      end if;
      perform resolve_game(m.id, current_game);
    end if;
  end loop;
end;
$$;

-- Schedule: every minute
select cron.schedule(
  'process-move-timeouts',
  '* * * * *',
  $$select process_move_timeouts()$$
);
