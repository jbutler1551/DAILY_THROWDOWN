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

// ============================================================
// Bracket + Results Data Layer (Sprint 4)
// ============================================================

export type BracketMatch = {
  id: string;
  round_number: number;
  slot_index: number;
  phase: string;
  best_of: number;
  status: string;
  tie_count: number;
  house_match: boolean;
  dual_advance: boolean;
  winner_entry_id: string | null;
  player_a: { entry_id: string; display_name: string; avatar_url: string | null } | null;
  player_b: { entry_id: string; display_name: string; avatar_url: string | null } | null;
  games: MatchGameRecord[];
};

/**
 * Fetch the full bracket for a tournament (all matches with player names + games).
 */
export async function getTournamentBracket(
  tournamentId: string
): Promise<{ ok: true; matches: BracketMatch[]; rounds: number } | { ok: false; reason: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, reason: "missing-env" };
  }

  // Fetch all matches
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("slot_index", { ascending: true });

  if (error) {
    return { ok: false, reason: error.message };
  }

  if (!matches || matches.length === 0) {
    return { ok: true, matches: [], rounds: 0 };
  }

  // Collect all entry IDs
  const entryIds = new Set<string>();
  for (const m of matches) {
    if (m.player_a_entry_id) entryIds.add(m.player_a_entry_id);
    if (m.player_b_entry_id) entryIds.add(m.player_b_entry_id);
  }

  // Fetch entries with profiles
  const entryArray = Array.from(entryIds);
  const { data: entries } = await supabase
    .from("entries")
    .select("id, profile_id")
    .in("id", entryArray);

  const profileIds = (entries ?? []).map((e) => e.profile_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", profileIds);

  // Build lookup maps
  const entryToProfile = new Map<string, string>();
  for (const e of entries ?? []) {
    entryToProfile.set(e.id, e.profile_id);
  }
  const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  }

  // Fetch all match_games for this tournament
  const matchIds = matches.map((m) => m.id);
  const { data: allGames } = await supabase
    .from("match_games")
    .select("*")
    .in("match_id", matchIds)
    .order("game_number", { ascending: true });

  const gamesByMatch = new Map<string, MatchGameRecord[]>();
  for (const g of allGames ?? []) {
    const list = gamesByMatch.get(g.match_id) ?? [];
    list.push(g);
    gamesByMatch.set(g.match_id, list);
  }

  // Build bracket matches
  const bracketMatches: BracketMatch[] = matches.map((m) => {
    const playerAProfile = m.player_a_entry_id
      ? profileMap.get(entryToProfile.get(m.player_a_entry_id) ?? "")
      : null;
    const playerBProfile = m.player_b_entry_id
      ? profileMap.get(entryToProfile.get(m.player_b_entry_id) ?? "")
      : null;

    return {
      id: m.id,
      round_number: m.round_number,
      slot_index: m.slot_index,
      phase: m.phase,
      best_of: m.best_of,
      status: m.status,
      tie_count: m.tie_count,
      house_match: m.house_match,
      dual_advance: m.dual_advance,
      winner_entry_id: m.winner_entry_id,
      player_a: m.player_a_entry_id
        ? {
            entry_id: m.player_a_entry_id,
            display_name: playerAProfile?.display_name ?? "Player",
            avatar_url: playerAProfile?.avatar_url ?? null,
          }
        : null,
      player_b: m.player_b_entry_id
        ? {
            entry_id: m.player_b_entry_id,
            display_name: playerBProfile?.display_name ?? "Player",
            avatar_url: playerBProfile?.avatar_url ?? null,
          }
        : m.house_match
          ? { entry_id: "house", display_name: "The House", avatar_url: null }
          : null,
      games: gamesByMatch.get(m.id) ?? [],
    };
  });

  const maxRound = Math.max(...matches.map((m) => m.round_number));

  return { ok: true, matches: bracketMatches, rounds: maxRound };
}

export type TournamentResults = {
  champion: { display_name: string; avatar_url: string | null } | null;
  runnerUp: { display_name: string; avatar_url: string | null } | null;
  semifinalists: { display_name: string; avatar_url: string | null }[];
  totalEntrants: number;
  totalRounds: number;
  totalThrows: number;
  totalTies: number;
};

/**
 * Fetch tournament results: champion, runner-up, semifinalists, stats.
 */
export async function getTournamentResults(
  tournamentId: string
): Promise<{ ok: true; results: TournamentResults } | { ok: false; reason: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, reason: "missing-env" };
  }

  // Get all entries to find winner
  const { data: entries } = await supabase
    .from("entries")
    .select("id, profile_id, status")
    .eq("tournament_id", tournamentId);

  const totalEntrants = entries?.length ?? 0;

  // Find champion (status = 'winner')
  const championEntry = entries?.find((e) => e.status === "winner");

  // Get all matches to find runner-up and semifinalists
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: false });

  const totalRounds = matches?.length
    ? Math.max(...matches.map((m) => m.round_number))
    : 0;

  // Championship match: loser is runner-up
  const championship = matches?.find((m) => m.phase === "championship" && m.status === "completed");
  const runnerUpEntryId = championship?.loser_entry_id;

  // Semifinal losers are semifinalists (3rd/4th place)
  const semiFinals = matches?.filter(
    (m) => m.phase === "semifinal" && m.status === "completed"
  ) ?? [];
  const semifinalistEntryIds = semiFinals
    .map((m) => m.loser_entry_id)
    .filter(Boolean) as string[];

  // Collect all profile IDs we need
  const entryIds = [
    championEntry?.id,
    runnerUpEntryId,
    ...semifinalistEntryIds,
  ].filter(Boolean) as string[];

  const relevantEntries = entries?.filter((e) => entryIds.includes(e.id)) ?? [];
  const profileIds = relevantEntries.map((e) => e.profile_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", profileIds);

  const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  }

  const entryToProfile = new Map<string, string>();
  for (const e of entries ?? []) {
    entryToProfile.set(e.id, e.profile_id);
  }

  const getProfile = (entryId: string | undefined) => {
    if (!entryId) return null;
    const profileId = entryToProfile.get(entryId);
    return profileId ? profileMap.get(profileId) ?? null : null;
  };

  // Count throws and ties
  const { count: throwCount } = await supabase
    .from("throws")
    .select("id", { count: "exact", head: true })
    .in("match_id", (matches ?? []).map((m) => m.id));

  const totalTies = (matches ?? []).reduce((sum, m) => sum + m.tie_count, 0);

  return {
    ok: true,
    results: {
      champion: getProfile(championEntry?.id),
      runnerUp: getProfile(runnerUpEntryId ?? undefined),
      semifinalists: semifinalistEntryIds.map(
        (eid) => getProfile(eid) ?? { display_name: "Unknown", avatar_url: null }
      ),
      totalEntrants,
      totalRounds,
      totalThrows: throwCount ?? 0,
      totalTies,
    },
  };
}

// ============================================================
// Match History (Sprint 5)
// ============================================================

export type MatchHistoryItem = {
  matchId: string;
  date: string;
  opponentName: string;
  result: "win" | "loss" | "tie";
  myMove: string | null;
  oppMove: string | null;
  phase: string;
  round: number;
};

/**
 * Fetch last 20 matches for a player across all tournaments.
 */
export async function getMatchHistory(
  profileId: string
): Promise<{ ok: true; matches: MatchHistoryItem[] } | { ok: false; reason: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, reason: "missing-env" };
  }

  // Get all entries for this profile
  const { data: entries } = await supabase
    .from("entries")
    .select("id, tournament_id")
    .eq("profile_id", profileId);

  if (!entries || entries.length === 0) {
    return { ok: true, matches: [] };
  }

  const entryIds = entries.map((e) => e.id);
  const entryIdSet = new Set(entryIds);
  const entryToTournament = new Map<string, string>();
  for (const e of entries) {
    entryToTournament.set(e.id, e.tournament_id);
  }

  // Fetch matches involving this player's entries, most recent first
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .or(entryIds.map((id) => `player_a_entry_id.eq.${id}`).join(",") + "," +
        entryIds.map((id) => `player_b_entry_id.eq.${id}`).join(","))
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { ok: false, reason: error.message };
  }

  if (!matches || matches.length === 0) {
    return { ok: true, matches: [] };
  }

  // Collect opponent entry IDs
  const opponentEntryIds = new Set<string>();
  for (const m of matches) {
    const myEntryId = entryIdSet.has(m.player_a_entry_id)
      ? m.player_a_entry_id
      : m.player_b_entry_id;
    const oppEntryId = myEntryId === m.player_a_entry_id
      ? m.player_b_entry_id
      : m.player_a_entry_id;
    if (oppEntryId) opponentEntryIds.add(oppEntryId);
  }

  // Fetch opponent profiles
  const oppEntryArray = Array.from(opponentEntryIds);
  const { data: oppEntries } = await supabase
    .from("entries")
    .select("id, profile_id")
    .in("id", oppEntryArray);

  const oppProfileIds = (oppEntries ?? []).map((e) => e.profile_id);
  const { data: oppProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", oppProfileIds);

  const entryToProfileId = new Map<string, string>();
  for (const e of oppEntries ?? []) {
    entryToProfileId.set(e.id, e.profile_id);
  }
  const profileNames = new Map<string, string>();
  for (const p of oppProfiles ?? []) {
    profileNames.set(p.id, p.display_name);
  }

  // Fetch last game for each match
  const matchIds = matches.map((m) => m.id);
  const { data: allGames } = await supabase
    .from("match_games")
    .select("*")
    .in("match_id", matchIds)
    .order("game_number", { ascending: false });

  const lastGameByMatch = new Map<string, MatchGameRecord>();
  for (const g of allGames ?? []) {
    if (!lastGameByMatch.has(g.match_id)) {
      lastGameByMatch.set(g.match_id, g);
    }
  }

  // Fetch tournament dates
  const tournamentIds = Array.from(new Set(matches.map((m) => m.tournament_id)));
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, tournament_date")
    .in("id", tournamentIds);

  const tournamentDates = new Map<string, string>();
  for (const t of tournaments ?? []) {
    tournamentDates.set(t.id, t.tournament_date);
  }

  // Build history items
  const history: MatchHistoryItem[] = matches.map((m) => {
    const myEntryId = entryIdSet.has(m.player_a_entry_id)
      ? m.player_a_entry_id
      : m.player_b_entry_id;
    const iAmA = myEntryId === m.player_a_entry_id;
    const oppEntryId = iAmA ? m.player_b_entry_id : m.player_a_entry_id;

    let opponentName = "The House";
    if (oppEntryId && !m.house_match) {
      const oppProfileId = entryToProfileId.get(oppEntryId);
      opponentName = (oppProfileId ? profileNames.get(oppProfileId) : null) ?? "Unknown";
    }

    let result: "win" | "loss" | "tie" = "loss";
    if (m.dual_advance) {
      result = "tie";
    } else if (m.winner_entry_id === myEntryId) {
      result = "win";
    }

    const lastGame = lastGameByMatch.get(m.id);
    const myMove = lastGame
      ? iAmA ? lastGame.player_a_move : lastGame.player_b_move
      : null;
    const oppMove = lastGame
      ? iAmA ? lastGame.player_b_move : lastGame.player_a_move
      : null;

    return {
      matchId: m.id,
      date: tournamentDates.get(m.tournament_id) ?? "",
      opponentName,
      result,
      myMove,
      oppMove,
      phase: m.phase,
      round: m.round_number,
    };
  });

  return { ok: true, matches: history };
}
