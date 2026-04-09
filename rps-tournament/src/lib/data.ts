import { createSupabaseAdminLikeClient, hasSupabaseEnv } from "@/lib/supabase";

export type ProfileRecord = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

export async function ensureProfile(profile: {
  id: string;
  email?: string | null;
  displayName?: string | null;
}) {
  if (!hasSupabaseEnv()) {
    return { ok: false as const, reason: "missing-env" as const };
  }

  const supabase = createSupabaseAdminLikeClient();
  const handleBase = (profile.email?.split("@")[0] || profile.displayName || "player")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "player";

  const payload = {
    id: profile.id,
    handle: `${handleBase}-${profile.id.slice(0, 6)}`,
    display_name: profile.displayName || profile.email?.split("@")[0] || "Daily Throwdown Player",
    avatar_url: null,
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  const { error: streakError } = await supabase.from("streaks").upsert(
    {
      profile_id: profile.id,
      current_streak: 0,
      best_streak: 0,
    },
    { onConflict: "profile_id" },
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

  const supabase = createSupabaseAdminLikeClient();
  const now = new Date();
  const tournamentDate = now.toISOString().slice(0, 10);
  const scheduledAt = new Date(`${tournamentDate}T19:00:00.000Z`).toISOString();

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

  const supabase = createSupabaseAdminLikeClient();
  const byeRound = input.streak >= 15 ? 3 : input.streak >= 5 ? 2 : null;

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
      { onConflict: "tournament_id,profile_id" },
    )
    .select("id, tournament_id, profile_id, streak_at_entry, bye_round, status")
    .single();

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const, entry: data, tournament: tournamentResult.tournament };
}
