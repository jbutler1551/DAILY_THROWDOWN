// ---------------------------------------------------------------------------
// Core types for the RPS Tournament app
// ---------------------------------------------------------------------------

export type Move = "rock" | "paper" | "scissors";

export type MatchResult = "win" | "loss" | "tie";

export type TournamentPhase =
  | "pre-registration"   // before registration opens
  | "registration"       // registration open, countdown running
  | "active"             // tournament rounds in progress
  | "broadcast"          // 16 or fewer players remain
  | "final-four"         // semifinal matches
  | "championship"       // the final match
  | "complete";          // tournament finished

export type StreakTier = "none" | "round2-bye" | "round3-bye";

export interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
  streakDays: number;
  streakTier: StreakTier;
  totalWins: number;
  totalLosses: number;
  totalTournaments: number;
  finalFourAppearances: number;
  titles: number;
  favoriteMove?: Move;
  // computed stats
  rockPct: number;
  paperPct: number;
  scissorsPct: number;
}

export interface MatchThrow {
  playerAMove: Move | null;
  playerBMove: Move | null;
  winner: "playerA" | "playerB" | "tie" | null; // null = not yet resolved
}

export interface Match {
  id: string;
  round: number;
  playerA: Player;
  playerB: Player | null; // null = House Match
  throws: MatchThrow[];
  consecutiveTies: number;
  dualAdvance: boolean;        // true if 5 ties triggered dual advance
  isHouseMatch: boolean;
  isBestOf3: boolean;
  seriesScore: { a: number; b: number };
  status: "pending" | "in-progress" | "complete";
  winner: "playerA" | "playerB" | "both" | null;
  hostLine: string;
}

export interface Round {
  number: number;
  matches: Match[];
  playersRemaining: number;
  isBroadcast: boolean;
  isBestOf3: boolean;
}

export interface Tournament {
  id: string;
  date: string;             // ISO date
  phase: TournamentPhase;
  startsAt: string;          // display time
  entrantCount: number;
  currentRound: number;
  rounds: Round[];
  playersRemaining: number;
  broadcastThreshold: number; // 16
  prizePool: PrizePool;
  champion: Player | null;
  runnerUp: Player | null;
  semifinalists: Player[];
}

export interface PrizePool {
  total: string;
  champion: string;
  runnerUp: string;
  semifinalist: string;
}

export interface UserState {
  player: Player;
  currentTournament: Tournament | null;
  currentMatch: Match | null;
  isEliminated: boolean;
  isSpectating: boolean;
  hasBye: boolean;
  byeUntilRound: number;
  registered: boolean;
}

// Host commentary slots
export type HostSlot =
  | "pre-show"
  | "match-intro"
  | "pre-reveal"
  | "reveal"
  | "tie"
  | "five-tie"
  | "advance"
  | "elimination"
  | "broadcast-intro"
  | "final-four-intro"
  | "championship-intro"
  | "champion-crowned"
  | "house-match"
  | "streak-bye"
  | "between-rounds";
