// ---------------------------------------------------------------------------
// Tournament engine — core game logic
// ---------------------------------------------------------------------------

import type { Match, MatchThrow, Move, Player, Round, StreakTier, Tournament } from "./types";

// ---- Move resolution ----

const BEATS: Record<Move, Move> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

export function resolveThrow(a: Move, b: Move): "playerA" | "playerB" | "tie" {
  if (a === b) return "tie";
  return BEATS[a] === b ? "playerA" : "playerB";
}

// ---- Random move for House Match ----

const MOVES: Move[] = ["rock", "paper", "scissors"];

export function randomMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

// ---- Streak tier calculation ----

export function getStreakTier(streakDays: number): StreakTier {
  if (streakDays >= 15) return "round3-bye";
  if (streakDays >= 5) return "round2-bye";
  return "none";
}

export function getByeRound(tier: StreakTier): number {
  switch (tier) {
    case "round3-bye": return 3;
    case "round2-bye": return 2;
    default: return 1;
  }
}

// ---- Pair players for a round ----

export interface PairingResult {
  pairs: [Player, Player | null][]; // null second = House Match
}

export function pairPlayers(players: Player[]): PairingResult {
  // Shuffle
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const pairs: [Player, Player | null][] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    } else {
      // Odd player faces The House
      pairs.push([shuffled[i], null]);
    }
  }

  return { pairs };
}

// ---- Create a match ----

let matchIdCounter = 0;

export function createMatch(
  round: number,
  playerA: Player,
  playerB: Player | null,
  isBestOf3: boolean
): Match {
  matchIdCounter++;
  return {
    id: `match-${matchIdCounter}`,
    round,
    playerA,
    playerB,
    throws: [],
    consecutiveTies: 0,
    dualAdvance: false,
    isHouseMatch: playerB === null,
    isBestOf3,
    seriesScore: { a: 0, b: 0 },
    status: "pending",
    winner: null,
    hostLine: "",
  };
}

// ---- Play a single throw in a match ----

export interface ThrowResult {
  throw_: MatchThrow;
  matchComplete: boolean;
  dualAdvance: boolean;
  matchWinner: "playerA" | "playerB" | "both" | null;
}

export function playThrow(match: Match, moveA: Move, moveB: Move): ThrowResult {
  const result = resolveThrow(moveA, moveB);

  const throw_: MatchThrow = {
    playerAMove: moveA,
    playerBMove: moveB,
    winner: result,
  };

  match.throws.push(throw_);

  if (result === "tie") {
    match.consecutiveTies++;

    // 5 consecutive ties = dual advance
    if (match.consecutiveTies >= 5) {
      match.dualAdvance = true;
      match.status = "complete";
      match.winner = "both";
      return {
        throw_,
        matchComplete: true,
        dualAdvance: true,
        matchWinner: "both",
      };
    }

    return {
      throw_,
      matchComplete: false,
      dualAdvance: false,
      matchWinner: null,
    };
  }

  // Reset consecutive ties on non-tie
  match.consecutiveTies = 0;

  if (match.isBestOf3) {
    // Update series score
    if (result === "playerA") {
      match.seriesScore.a++;
    } else {
      match.seriesScore.b++;
    }

    // Check if series is won (first to 2)
    if (match.seriesScore.a >= 2) {
      match.status = "complete";
      match.winner = "playerA";
      return { throw_, matchComplete: true, dualAdvance: false, matchWinner: "playerA" };
    }
    if (match.seriesScore.b >= 2) {
      match.status = "complete";
      match.winner = "playerB";
      return { throw_, matchComplete: true, dualAdvance: false, matchWinner: "playerB" };
    }

    // Series continues
    return { throw_, matchComplete: false, dualAdvance: false, matchWinner: null };
  }

  // Single-throw match: winner determined
  match.status = "complete";
  match.winner = result;
  return { throw_, matchComplete: true, dualAdvance: false, matchWinner: result };
}

// ---- Build a round ----

export function buildRound(
  roundNumber: number,
  players: Player[],
  broadcastThreshold: number
): Round {
  const isBroadcast = players.length <= broadcastThreshold;
  // Best-of-3 for final four and championship
  const isBestOf3 = players.length <= 4;

  const { pairs } = pairPlayers(players);

  const matches = pairs.map(([a, b]) => createMatch(roundNumber, a, b, isBestOf3));

  return {
    number: roundNumber,
    matches,
    playersRemaining: players.length,
    isBroadcast,
    isBestOf3,
  };
}

// ---- Collect advancing players from a completed round ----

export function getAdvancingPlayers(round: Round): Player[] {
  const advancing: Player[] = [];

  for (const match of round.matches) {
    if (match.winner === "both") {
      advancing.push(match.playerA);
      if (match.playerB) advancing.push(match.playerB);
    } else if (match.winner === "playerA") {
      advancing.push(match.playerA);
    } else if (match.winner === "playerB") {
      if (match.playerB) advancing.push(match.playerB);
    }
  }

  return advancing;
}

// ---- Simulate a full tournament (for prototype/demo purposes) ----

export function simulateTournament(entrants: Player[]): Tournament {
  const rounds: Round[] = [];
  let currentPlayers = [...entrants];

  // Separate players by bye tier
  const round1Players = currentPlayers.filter((p) => getByeRound(p.streakTier) <= 1);
  const round2Byes = currentPlayers.filter((p) => p.streakTier === "round2-bye");
  const round3Byes = currentPlayers.filter((p) => p.streakTier === "round3-bye");

  let roundNumber = 1;
  let activePlayers = round1Players;

  // Run rounds
  while (activePlayers.length > 1 || round2Byes.length > 0 || round3Byes.length > 0) {
    // Inject bye players at their designated round
    if (roundNumber === 2) {
      activePlayers = [...activePlayers, ...round2Byes];
      round2Byes.length = 0; // clear
    }
    if (roundNumber === 3) {
      activePlayers = [...activePlayers, ...round3Byes];
      round3Byes.length = 0; // clear
    }

    if (activePlayers.length <= 1) {
      // Edge case: if only bye players remain, push to next round
      if (round2Byes.length > 0 || round3Byes.length > 0) {
        roundNumber++;
        continue;
      }
      break;
    }

    const round = buildRound(roundNumber, activePlayers, 16);

    // Auto-play all matches in the round (simulation mode)
    for (const match of round.matches) {
      match.status = "in-progress";

      let complete = false;
      while (!complete) {
        const moveA = randomMove();
        const moveB = match.isHouseMatch ? randomMove() : randomMove();
        const result = playThrow(match, moveA, moveB);
        complete = result.matchComplete;
      }
    }

    rounds.push(round);
    activePlayers = getAdvancingPlayers(round);
    roundNumber++;

    // Safety: prevent infinite loops in edge cases
    if (roundNumber > 30) break;
  }

  const champion = activePlayers[0] || null;

  // Find runner-up and semifinalists from last rounds
  const lastRound = rounds[rounds.length - 1];
  let runnerUp: Player | null = null;
  const semifinalists: Player[] = [];

  if (lastRound && champion) {
    for (const match of lastRound.matches) {
      if (match.winner === "playerA" && match.playerA.id === champion.id && match.playerB) {
        runnerUp = match.playerB;
      } else if (match.winner === "playerB" && match.playerB?.id === champion.id) {
        runnerUp = match.playerA;
      }
    }
  }

  // Semifinalists = final four losers
  if (rounds.length >= 2) {
    const semisRound = rounds[rounds.length - 2];
    if (semisRound) {
      for (const match of semisRound.matches) {
        if (match.winner === "playerA" && match.playerB) {
          semifinalists.push(match.playerB);
        } else if (match.winner === "playerB") {
          semifinalists.push(match.playerA);
        }
      }
    }
  }

  return {
    id: `tournament-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    phase: "complete",
    startsAt: "2:00 PM CT",
    entrantCount: entrants.length,
    currentRound: roundNumber - 1,
    rounds,
    playersRemaining: activePlayers.length,
    broadcastThreshold: 16,
    prizePool: {
      total: "$100",
      champion: "$55",
      runnerUp: "$25",
      semifinalist: "$10",
    },
    champion,
    runnerUp,
    semifinalists,
  };
}

// ---- Generate mock players ----

const MOCK_NAMES = [
  "David", "Emily", "Marcus", "Sofia", "Jake", "Mia", "Tyler", "Luna",
  "Carlos", "Aria", "Ethan", "Nina", "Alex", "Zara", "Ryan", "Ivy",
  "Leo", "Chloe", "Max", "Ella", "Sam", "Ruby", "Kai", "Willow",
  "Finn", "Nora", "Cole", "Hazel", "Miles", "Jade", "Theo", "Sage",
];

export function generateMockPlayers(count: number): Player[] {
  const players: Player[] = [];

  for (let i = 0; i < count; i++) {
    const name = MOCK_NAMES[i % MOCK_NAMES.length] + (i >= MOCK_NAMES.length ? `${Math.floor(i / MOCK_NAMES.length) + 1}` : "");
    const streakDays = Math.random() > 0.8 ? Math.floor(Math.random() * 20) + 5 : Math.floor(Math.random() * 5);
    const rockPct = 20 + Math.floor(Math.random() * 30);
    const paperPct = 20 + Math.floor(Math.random() * (80 - rockPct));
    const scissorsPct = 100 - rockPct - paperPct;

    let favoriteMove: Move | undefined;
    if (rockPct > 45) favoriteMove = "rock";
    else if (paperPct > 45) favoriteMove = "paper";
    else if (scissorsPct > 45) favoriteMove = "scissors";

    players.push({
      id: `player-${i}`,
      username: name,
      streakDays,
      streakTier: getStreakTier(streakDays),
      totalWins: Math.floor(Math.random() * 50),
      totalLosses: Math.floor(Math.random() * 50),
      totalTournaments: Math.floor(Math.random() * 30),
      finalFourAppearances: Math.floor(Math.random() * 5),
      titles: Math.floor(Math.random() * 2),
      favoriteMove,
      rockPct,
      paperPct,
      scissorsPct,
    });
  }

  return players;
}
