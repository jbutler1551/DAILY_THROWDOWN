import { supabase, hasSupabaseEnv } from "./supabase";
import Constants from "expo-constants";
import type { Move } from "./types";

export type ProfileRecord = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  earnings_cents: number;
  total_wins: number;
  total_losses: number;
  total_tournaments: number;
  championships: number;
  final_four_appearances: number;
};

export type MyProfile = ProfileRecord & {
  current_streak: number;
  best_streak: number;
  last_entry_date: string | null;
};

export type PlayerStats = {
  totalThrows: number;
  rockPct: number;
  paperPct: number;
  scissorsPct: number;
};

export async function ensureProfile(profile: {
  id: string;
  email?: string | null;
  displayName?: string | null;
}) {
  if (!hasSupabaseEnv()) {
    return { ok: false as const, reason: "missing-env" as const };
  }

  const handleBase =
    (profile.email?.split("@")[0] || profile.displayName || "player")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20) || "player";

  const payload = {
    id: profile.id,
    handle: `${handleBase}-${profile.id.slice(0, 6)}`,
    display_name:
      profile.displayName ||
      profile.email?.split("@")[0] ||
      "Daily Throwdown Player",
    avatar_url: null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  const { error: streakError } = await supabase.from("streaks").upsert(
    {
      profile_id: profile.id,
      current_streak: 0,
      best_streak: 0,
    },
    { onConflict: "profile_id" }
  );

  if (streakError) {
    return { ok: false as const, reason: streakError.message };
  }

  return { ok: true as const };
}

export async function ensureTodayTournament() {
  if (!hasSupabaseEnv()) {
    return { ok: false as const, reason: "missing-env" as const };
  }

  const now = new Date();
  const tournamentDate = now.toISOString().slice(0, 10);
  const scheduledAt = new Date(
    `${tournamentDate}T19:00:00.000Z`
  ).toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from("tournaments")
    .select("id, tournament_date, status")
    .eq("tournament_date", tournamentDate)
    .maybeSingle();

  if (fetchError) {
    return { ok: false as const, reason: fetchError.message };
  }

  if (existing) {
    return { ok: true as const, tournament: existing };
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      tournament_date: tournamentDate,
      scheduled_at: scheduledAt,
      status: "scheduled",
      prize_pool_cents: 10000,
    })
    .select("id, tournament_date, status")
    .single();

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const, tournament: data };
}

export async function joinTodayTournament(input: {
  profileId: string;
  streak: number;
}) {
  const tournamentResult = await ensureTodayTournament();

  if (!tournamentResult.ok) {
    return tournamentResult;
  }

  const byeRound =
    input.streak >= 15 ? 3 : input.streak >= 5 ? 2 : null;

  const { data, error } = await supabase
    .from("entries")
    .upsert(
      {
        tournament_id: tournamentResult.tournament.id,
        profile_id: input.profileId,
        streak_at_entry: input.streak,
        bye_round: byeRound,
        status: "active",
      },
      { onConflict: "tournament_id,profile_id" }
    )
    .select(
      "id, tournament_id, profile_id, streak_at_entry, bye_round, status"
    )
    .single();

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return {
    ok: true as const,
    entry: data,
    tournament: tournamentResult.tournament,
  };
}

/**
 * Fetch the current user's full profile joined with their streak data.
 */
export async function getMyProfile(
  userId: string
): Promise<{ ok: true; profile: MyProfile } | { ok: false; reason: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, reason: "missing-env" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, handle, display_name, avatar_url, earnings_cents, total_wins, total_losses, total_tournaments, championships, final_four_appearances"
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, reason: profileError.message };
  }

  if (!profile) {
    return { ok: false, reason: "profile-not-found" };
  }

  const { data: streak, error: streakError } = await supabase
    .from("streaks")
    .select("current_streak, best_streak, last_entry_date")
    .eq("profile_id", userId)
    .maybeSingle();

  if (streakError) {
    return { ok: false, reason: streakError.message };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      current_streak: streak?.current_streak ?? 0,
      best_streak: streak?.best_streak ?? 0,
      last_entry_date: streak?.last_entry_date ?? null,
    },
  };
}

/**
 * Aggregate move tendencies from the throws table for a given profile.
 * Joins throws → entries to filter by profile_id.
 */
export async function getPlayerStats(
  profileId: string
): Promise<{ ok: true; stats: PlayerStats } | { ok: false; reason: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, reason: "missing-env" };
  }

  const { data, error } = await supabase
    .from("throws")
    .select("move, entry_id!inner(profile_id)")
    .eq("entry_id.profile_id", profileId);

  if (error) {
    return { ok: false, reason: error.message };
  }

  const total = data?.length ?? 0;
  if (total === 0) {
    return {
      ok: true,
      stats: { totalThrows: 0, rockPct: 0, paperPct: 0, scissorsPct: 0 },
    };
  }

  let rock = 0;
  let paper = 0;
  let scissors = 0;
  for (const row of data) {
    if (row.move === "rock") rock++;
    else if (row.move === "paper") paper++;
    else scissors++;
  }

  return {
    ok: true,
    stats: {
      totalThrows: total,
      rockPct: Math.round((rock / total) * 100),
      paperPct: Math.round((paper / total) * 100),
      scissorsPct: Math.round((scissors / total) * 100),
    },
  };
}

/**
 * Get today's tournament entrant count and the user's entry status.
 */
export async function getTodayEntrantCount(): Promise<{
  ok: boolean;
  count: number;
  tournamentId: string | null;
}> {
  if (!hasSupabaseEnv()) {
    return { ok: false, count: 0, tournamentId: null };
  }

  const tournamentDate = new Date().toISOString().slice(0, 10);

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id")
    .eq("tournament_date", tournamentDate)
    .maybeSingle();

  if (!tournament) {
    return { ok: true, count: 0, tournamentId: null };
  }

  const { count, error } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournament.id);

  return {
    ok: !error,
    count: count ?? 0,
    tournamentId: tournament.id,
  };
}

/**
 * Get today's tournament with full info for the state machine.
 */
export async function getTodayTournamentStatus() {
  if (!hasSupabaseEnv()) {
    return { ok: false as const, reason: "missing-env" as const };
  }

  const tournamentDate = new Date().toISOString().slice(0, 10);

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("id, tournament_date, scheduled_at, status")
    .eq("tournament_date", tournamentDate)
    .maybeSingle();

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  if (!tournament) {
    return { ok: true as const, tournament: null, entrantCount: 0 };
  }

  // Get entrant count
  const { count } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournament.id);

  return {
    ok: true as const,
    tournament,
    entrantCount: count ?? 0,
  };
}

/**
 * Get the current user's entry for a specific tournament.
 */
export async function getMyEntry(tournamentId: string, profileId: string) {
  if (!hasSupabaseEnv()) {
    return { ok: false as const, reason: "missing-env" as const };
  }

  const { data, error } = await supabase
    .from("entries")
    .select("id, tournament_id, profile_id, streak_at_entry, bye_round, status")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const, entry: data };
}

/**
 * Subscribe to real-time changes on the entries table for a tournament.
 * Returns an unsubscribe function.
 */
export function subscribeToEntries(
  tournamentId: string,
  onInsert: (count: number) => void
) {
  let currentCount = 0;

  // Initial count fetch
  supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .then(({ count }) => {
      currentCount = count ?? 0;
      onInsert(currentCount);
    });

  const channel = supabase
    .channel(`entries:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "entries",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => {
        currentCount++;
        onInsert(currentCount);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================
// Match Data Layer (Sprint 3)
// ============================================================

export type MatchRecord = {
  id: string;
  tournament_id: string;
  round_number: number;
  slot_index: number;
  phase: string;
  best_of: number;
  player_a_entry_id: string | null;
  player_b_entry_id: string | null;
  winner_entry_id: string | null;
  loser_entry_id: string | null;
  status: string;
  tie_count: number;
  house_match: boolean;
  dual_advance: boolean;
  move_deadline: string | null;
};

export type MatchGameRecord = {
  id: string;
  match_id: string;
  game_number: number;
  player_a_move: string | null;
  player_b_move: string | null;
  winner_entry_id: string | null;
  result: string;
};

export type MatchWithContext = MatchRecord & {
  myEntryId: string;
  opponentEntryId: string | null;
  opponentProfile: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  opponentStreak: number;
  games: MatchGameRecord[];
  iAmPlayerA: boolean;
};

/**
 * Get the current user's active match in a tournament.
 * Returns the live match (or most recent completed match if no live one).
 */
export async function getMyCurrentMatch(
  tournamentId: string,
  profileId: string
): Promise<
  { ok: true; match: MatchWithContext | null } | { ok: false; reason: string }
> {
  if (!hasSupabaseEnv()) {
    return { ok: false, reason: "missing-env" };
  }

  // Get user's entry
  const { data: entry } = await supabase
    .from("entries")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!entry) {
    return { ok: true, match: null };
  }

  // Find their current match (prefer live, fall back to most recent completed)
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .or(`player_a_entry_id.eq.${entry.id},player_b_entry_id.eq.${entry.id}`)
    .order("round_number", { ascending: false })
    .limit(5);

  if (error) {
    return { ok: false, reason: error.message };
  }

  if (!matches || matches.length === 0) {
    return { ok: true, match: null };
  }

  // Prefer live match, then most recent
  const liveMatch = matches.find((m) => m.status === "live");
  const match = liveMatch ?? matches[0];

  const iAmPlayerA = match.player_a_entry_id === entry.id;
  const opponentEntryId = iAmPlayerA
    ? match.player_b_entry_id
    : match.player_a_entry_id;

  // Fetch opponent profile
  let opponentProfile = null;
  let opponentStreak = 0;
  if (opponentEntryId) {
    const { data: oppEntry } = await supabase
      .from("entries")
      .select("profile_id, streak_at_entry")
      .eq("id", opponentEntryId)
      .single();

    if (oppEntry) {
      opponentStreak = oppEntry.streak_at_entry;
      const { data: oppProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", oppEntry.profile_id)
        .single();
      opponentProfile = oppProfile;
    }
  }

  // Fetch games for this match
  const { data: games } = await supabase
    .from("match_games")
    .select("*")
    .eq("match_id", match.id)
    .order("game_number", { ascending: true });

  return {
    ok: true,
    match: {
      ...match,
      myEntryId: entry.id,
      opponentEntryId,
      opponentProfile,
      opponentStreak,
      games: games ?? [],
      iAmPlayerA,
    },
  };
}

/**
 * Submit a move via the Edge Function.
 */
export async function submitMove(
  matchId: string,
  move: Move
): Promise<{ ok: true; gameNumber: number; resolved: boolean } | { ok: false; reason: string }> {
  const extra = Constants.expoConfig?.extra ?? {};
  const supabaseUrl: string = extra.supabaseUrl ?? "";

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, reason: "Not authenticated" };
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/submit-move`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ matchId, move }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return { ok: false, reason: data.error ?? "Failed to submit move" };
  }

  return { ok: true, gameNumber: data.gameNumber, resolved: data.resolved };
}

/**
 * Subscribe to real-time changes on a specific match + its games.
 * Calls onUpdate whenever the match row or a match_games row changes.
 */
export function subscribeToMatch(
  matchId: string,
  onUpdate: () => void
) {
  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "matches",
        filter: `id=eq.${matchId}`,
      },
      () => onUpdate()
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "match_games",
        filter: `match_id=eq.${matchId}`,
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to tournament-level match changes (for bracket/broadcast).
 */
export function subscribeToTournament(
  tournamentId: string,
  onUpdate: () => void
) {
  const channel = supabase
    .channel(`tournament:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "matches",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
