-- Sprint 5: Stats Finalization + Earnings
-- Run in Supabase SQL Editor after sprint3 migration.

-- ============================================================
-- 5A. Tournament Completion: Stats + Earnings Trigger
-- ============================================================

-- When a tournament completes, finalize all player stats and earnings.
create or replace function finalize_tournament_stats()
returns trigger
language plpgsql
security definer
as $$
declare
  t_id uuid := NEW.id;
  champ_entry record;
  runner_entry_id uuid;
  semi_entry_ids uuid[];
begin
  -- Only fire when status changes to 'completed'
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  -- Increment total_tournaments for ALL entrants
  update profiles
  set total_tournaments = total_tournaments + 1
  where id in (
    select profile_id from entries where tournament_id = t_id
  );

  -- Compute wins per profile
  update profiles p
  set total_wins = p.total_wins + sub.wins
  from (
    select e.profile_id, count(*) as wins
    from matches m
    join entries e on e.id = m.winner_entry_id
    where m.tournament_id = t_id and m.status = 'completed'
    group by e.profile_id
  ) sub
  where p.id = sub.profile_id;

  -- Compute losses per profile
  update profiles p
  set total_losses = p.total_losses + sub.losses
  from (
    select e.profile_id, count(*) as losses
    from matches m
    join entries e on e.id = m.loser_entry_id
    where m.tournament_id = t_id and m.status = 'completed'
    group by e.profile_id
  ) sub
  where p.id = sub.profile_id;

  -- Find champion (entry with status = 'winner')
  select * into champ_entry
  from entries
  where tournament_id = t_id and status = 'winner'
  limit 1;

  if champ_entry is not null then
    -- Champion: $55 (5500 cents) + championship count
    update profiles
    set earnings_cents = earnings_cents + 5500,
        championships = championships + 1,
        final_four_appearances = final_four_appearances + 1
    where id = champ_entry.profile_id;

    -- Find runner-up: loser of championship match
    select loser_entry_id into runner_entry_id
    from matches
    where tournament_id = t_id and phase = 'championship' and status = 'completed'
    limit 1;

    if runner_entry_id is not null then
      -- Runner-up: $25 (2500 cents)
      update profiles p
      set earnings_cents = p.earnings_cents + 2500,
          final_four_appearances = p.final_four_appearances + 1
      from entries e
      where e.id = runner_entry_id and p.id = e.profile_id;
    end if;

    -- Find semifinalists: losers of semifinal matches
    select array_agg(loser_entry_id) into semi_entry_ids
    from matches
    where tournament_id = t_id and phase = 'semifinal' and status = 'completed'
      and loser_entry_id is not null;

    if semi_entry_ids is not null then
      -- Semifinalists: $10 each (1000 cents)
      update profiles p
      set earnings_cents = p.earnings_cents + 1000,
          final_four_appearances = p.final_four_appearances + 1
      from entries e
      where e.id = any(semi_entry_ids) and p.id = e.profile_id;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_finalize_tournament_stats
  after update on tournaments
  for each row
  execute function finalize_tournament_stats();
