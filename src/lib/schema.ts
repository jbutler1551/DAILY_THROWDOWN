export const supabaseSchemaSql = `
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
`;
