import { useState, useEffect, useCallback } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenShell, Card, Pill, StatBox, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { getMyProfile, getPlayerStats, getMatchHistory } from "@/lib/data";
import type { MyProfile, PlayerStats, MatchHistoryItem } from "@/lib/data";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);

  const fetchProfileData = useCallback(async (userId: string) => {
    const [profileResult, statsResult, historyResult] = await Promise.all([
      getMyProfile(userId),
      getPlayerStats(userId),
      getMatchHistory(userId),
    ]);

    if (profileResult.ok) setProfile(profileResult.profile);
    if (statsResult.ok) setStats(statsResult.stats);
    if (historyResult.ok) setMatchHistory(historyResult.matches);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
        ? { id: data.user.id, email: data.user.email ?? undefined }
        : null;
      setUser(u);
      setLoading(false);
      if (u) fetchProfileData(u.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
        ? { id: session.user.id, email: session.user.email ?? undefined }
        : null;
      setUser(u);
      if (u) fetchProfileData(u.id);
      else {
        setProfile(null);
        setStats(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileData]);

  if (loading) {
    return (
      <ScreenShell>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-white/50">Loading...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!user) {
    return (
      <ScreenShell>
        <View className="items-center gap-5 py-20">
          <Text className="text-xl font-black text-white">
            Sign in to view your profile
          </Text>
          <Text className="text-sm text-white/50">
            Your stats, streaks, and achievements will show here.
          </Text>
          <Button onPress={() => router.push("/auth")}>Sign In</Button>
        </View>
      </ScreenShell>
    );
  }

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Player";
  const initial = displayName.charAt(0).toUpperCase();
  const currentStreak = profile?.current_streak ?? 0;
  const bestStreak = profile?.best_streak ?? 0;
  const streakPct = Math.min((currentStreak / 15) * 100, 100);
  const earningsDisplay =
    profile && profile.earnings_cents > 0
      ? `$${(profile.earnings_cents / 100).toFixed(0)}`
      : "$0";

  const moveTendencies = [
    { move: "Rock", pct: stats?.rockPct ?? 0, color: "bg-red-400" },
    { move: "Paper", pct: stats?.paperPct ?? 0, color: "bg-blue-400" },
    { move: "Scissors", pct: stats?.scissorsPct ?? 0, color: "bg-amber-400" },
  ];

  return (
    <ScreenShell>
      {/* Profile header */}
      <View className="rounded-3xl border border-fuchsia-400/20 bg-black/20 p-5">
        <View className="flex-row items-center gap-4">
          <LinearGradient
            colors={["#e879f9", "#8b5cf6"]}
            className="h-20 w-20 items-center justify-center rounded-full"
          >
            <Text className="text-3xl font-black text-white">{initial}</Text>
          </LinearGradient>

          <View className="flex-1 gap-2">
            <Text className="text-2xl font-black text-white">
              {displayName}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill color="green">{`${currentStreak} day streak`}</Pill>
            </View>
            <Text className="text-xs text-white/40">{user.email}</Text>
          </View>
        </View>

        {/* Streak progress */}
        <View className="mt-5 gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] uppercase tracking-widest text-white/40">
              Streak Progress
            </Text>
            <Text className="text-[10px] text-white/40">
              {currentStreak} / 15 days
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-white/10">
            <View
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${streakPct}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[10px] text-white/30">0</Text>
            <Text className="text-[10px] text-emerald-300/50">5 — R2 Bye</Text>
            <Text className="text-[10px] text-cyan-300/50">15 — R3 Bye</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <Card title="Tournament Stats">
        <View className="flex-row flex-wrap gap-3">
          <View className="w-[48%]">
            <StatBox
              label="Tournaments"
              value={String(profile?.total_tournaments ?? 0)}
            />
          </View>
          <View className="w-[48%]">
            <StatBox
              label="Current Streak"
              value={String(currentStreak)}
              color="green"
            />
          </View>
          <View className="w-[48%]">
            <StatBox
              label="Best Streak"
              value={String(bestStreak)}
              color="cyan"
            />
          </View>
          <View className="w-[48%]">
            <StatBox
              label="Championships"
              value={String(profile?.championships ?? 0)}
              color="amber"
            />
          </View>
          <View className="w-[48%]">
            <StatBox
              label="Final Four"
              value={String(profile?.final_four_appearances ?? 0)}
              color="fuchsia"
            />
          </View>
          <View className="w-[48%]">
            <StatBox label="Earnings" value={earningsDisplay} color="amber" />
          </View>
        </View>
      </Card>

      {/* Move tendencies */}
      <Card title="Move Tendencies">
        <View className="gap-4">
          {moveTendencies.map((item) => (
            <View key={item.move} className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-white/70">{item.move}</Text>
                <Text className="text-sm font-bold text-white">
                  {item.pct}%
                </Text>
              </View>
              <View className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <View
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.pct}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Match history */}
      {matchHistory.length > 0 && (
        <Card title="Recent Matches" subtitle={`Last ${matchHistory.length}`}>
          <View className="gap-2">
            {matchHistory.map((m) => (
              <View
                key={m.matchId}
                className={`flex-row items-center justify-between rounded-2xl border p-3 ${
                  m.result === "win"
                    ? "border-emerald-400/20 bg-emerald-400/5"
                    : m.result === "loss"
                      ? "border-red-400/20 bg-red-400/5"
                      : "border-amber-400/20 bg-amber-400/5"
                }`}
              >
                <View className="flex-1">
                  <Text className="text-sm font-bold text-white">
                    vs {m.opponentName}
                  </Text>
                  <Text className="text-[10px] text-white/40">
                    {m.date} — R{m.round} {m.phase}
                  </Text>
                </View>
                <View className="items-end">
                  <Pill
                    color={
                      m.result === "win"
                        ? "green"
                        : m.result === "loss"
                          ? "red"
                          : "amber"
                    }
                  >
                    {m.result.toUpperCase()}
                  </Pill>
                  {m.myMove && m.oppMove && (
                    <Text className="mt-1 text-[10px] capitalize text-white/40">
                      {m.myMove} vs {m.oppMove}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Sign out */}
      <View className="items-center">
        <Button
          variant="secondary"
          onPress={async () => {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            setStats(null);
            setMatchHistory([]);
          }}
        >
          Sign Out
        </Button>
      </View>
    </ScreenShell>
  );
}
