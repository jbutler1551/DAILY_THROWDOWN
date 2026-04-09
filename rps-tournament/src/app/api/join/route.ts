import { NextResponse } from "next/server";
import { ensureProfile, joinTodayTournament } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/server-supabase";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "You must sign in first." }, { status: 401 });
    }

    const profileResult = await ensureProfile({
      id: user.id,
      email: user.email,
      displayName: (user.user_metadata?.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "Player",
    });

    if (!profileResult.ok) {
      return NextResponse.json({ error: profileResult.reason }, { status: 500 });
    }

    const streak = 0;
    const entryResult = await joinTodayTournament({
      profileId: user.id,
      streak,
    });

    if (!entryResult.ok) {
      return NextResponse.json({ error: entryResult.reason }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      tournament: entryResult.tournament,
      entry: entryResult.entry,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error." },
      { status: 500 },
    );
  }
}
