-- Load Test: Simulate a 2000-player tournament
-- Run this in the Supabase SQL Editor to test bracket generation at scale.
-- WARNING: This creates test data. Run on a test/staging project, not production.

-- Step 1: Create 2000 test profiles + streaks
do $$
declare
  i integer;
  uid uuid;
begin
  for i in 1..2000 loop
    uid := gen_random_uuid();

    insert into profiles (id, handle, display_name, avatar_url)
    values (uid, 'loadtest-' || i || '-' || left(uid::text, 6), 'LoadTest Player ' || i, null)
    on conflict (id) do nothing;

    insert into streaks (profile_id, current_streak, best_streak, last_entry_date, updated_at)
    values (uid, floor(random() * 20), floor(random() * 30), current_date - 1, now())
    on conflict (profile_id) do nothing;
  end loop;
end;
$$;

-- Step 2: Create today's tournament
select create_daily_tournament();

-- Step 3: Register all test players as entries
do $$
declare
  t_id uuid;
  p record;
begin
  select id into t_id from tournaments where tournament_date = current_date;

  for p in
    select id from profiles where handle like 'loadtest-%'
  loop
    begin
      insert into entries (tournament_id, profile_id, streak_at_entry, status)
      values (t_id, p.id, 0, 'active');
    exception when unique_violation then
      null; -- already entered
    end;
  end loop;
end;
$$;

-- Step 4: Verify entry count
select count(*) as entry_count from entries
where tournament_id = (select id from tournaments where tournament_date = current_date);

-- Step 5: Start the tournament (generates round 1 bracket)
-- Time this — should be <5 seconds for 2000 players
do $$
declare
  t_id uuid;
  start_time timestamptz;
  end_time timestamptz;
begin
  select id into t_id from tournaments where tournament_date = current_date;
  start_time := clock_timestamp();

  perform start_tournament(t_id);

  end_time := clock_timestamp();
  raise notice 'Tournament start took: % ms', extract(milliseconds from end_time - start_time);
end;
$$;

-- Step 6: Verify round 1 generated correctly
select
  round_number,
  count(*) as match_count,
  count(*) filter (where house_match) as house_matches,
  count(*) filter (where status = 'live') as live_matches
from matches
where tournament_id = (select id from tournaments where tournament_date = current_date)
group by round_number
order by round_number;

-- Step 7: Simulate all players submitting moves for round 1
-- (each player submits a random move)
do $$
declare
  m record;
  moves text[] := array['rock', 'paper', 'scissors'];
begin
  for m in
    select id, player_a_entry_id, player_b_entry_id, house_match
    from matches
    where tournament_id = (select id from tournaments where tournament_date = current_date)
      and round_number = 1
      and status = 'live'
  loop
    -- Player A submits
    insert into throws (match_id, game_number, entry_id, move)
    values (m.id, 1, m.player_a_entry_id, moves[floor(random() * 3 + 1)])
    on conflict do nothing;

    -- Player B submits (skip for house matches — house throw already exists)
    if not m.house_match and m.player_b_entry_id is not null then
      insert into throws (match_id, game_number, entry_id, move)
      values (m.id, 1, m.player_b_entry_id, moves[floor(random() * 3 + 1)])
      on conflict do nothing;
    end if;

    -- Resolve the game
    perform resolve_game(m.id, 1);
  end loop;
end;
$$;

-- Step 8: Check round advancement happened
select
  round_number,
  count(*) as match_count,
  count(*) filter (where status = 'completed') as completed,
  count(*) filter (where status = 'live') as live
from matches
where tournament_id = (select id from tournaments where tournament_date = current_date)
group by round_number
order by round_number;

-- Step 9: Count remaining active entries
select count(*) as active_entries
from entries
where tournament_id = (select id from tournaments where tournament_date = current_date)
  and status = 'active';

-- Step 10: Run full tournament to completion (simulate all remaining rounds)
do $$
declare
  t_id uuid;
  t_status text;
  round_num integer;
  m record;
  moves text[] := array['rock', 'paper', 'scissors'];
  iteration integer := 0;
  max_iterations integer := 50; -- safety: ~11 rounds for 2000 players + ties
begin
  select id into t_id from tournaments where tournament_date = current_date;

  loop
    iteration := iteration + 1;
    if iteration > max_iterations then
      raise notice 'Safety limit reached at iteration %', iteration;
      exit;
    end if;

    select status into t_status from tournaments where id = t_id;
    if t_status = 'completed' or t_status = 'cancelled' then
      raise notice 'Tournament completed after % iterations', iteration;
      exit;
    end if;

    -- Find live matches and simulate
    for m in
      select id, player_a_entry_id, player_b_entry_id, house_match, best_of
      from matches
      where tournament_id = t_id and status = 'live'
    loop
      -- Determine current game number
      declare
        current_game integer;
      begin
        select coalesce(max(game_number), 0) + 1 into current_game
        from match_games where match_id = m.id;

        -- Submit moves
        insert into throws (match_id, game_number, entry_id, move)
        values (m.id, current_game, m.player_a_entry_id, moves[floor(random() * 3 + 1)])
        on conflict do nothing;

        if not m.house_match and m.player_b_entry_id is not null then
          insert into throws (match_id, game_number, entry_id, move)
          values (m.id, current_game, m.player_b_entry_id, moves[floor(random() * 3 + 1)])
          on conflict do nothing;
        else
          -- House match: generate throw if not exists
          insert into throws (match_id, game_number, entry_id, move)
          values (m.id, current_game, null, moves[floor(random() * 3 + 1)])
          on conflict do nothing;
        end if;

        perform resolve_game(m.id, current_game);
      end;
    end loop;

    -- Small pause to let triggers fire (not needed in direct SQL but good practice)
  end loop;
end;
$$;

-- Step 11: Final verification
select status from tournaments where tournament_date = current_date;

select count(*) as total_matches,
       count(*) filter (where status = 'completed') as completed_matches,
       max(round_number) as total_rounds
from matches
where tournament_id = (select id from tournaments where tournament_date = current_date);

-- Exactly 1 winner
select count(*) as winners from entries
where tournament_id = (select id from tournaments where tournament_date = current_date)
  and status = 'winner';

-- Step 12: Cleanup test data (optional)
-- delete from profiles where handle like 'loadtest-%';
