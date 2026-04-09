import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import {
  ScreenShell,
  Card,
  HostLine,
  StatBox,
  Button,
  Pill,
} from "@/components/ui";
import { getHostLine } from "@/lib/host";
import { supabase } from "@/lib/supabase";
import { getMyProfile, getTodayEntrantCount } from "@/lib/data";
import { getStreakTier } from "@/lib/engine";

export default function HomeScreen() {
  const router = useRouter();
  const [hostLine] = useState(() => getHostLine("pre-show"));
  const [entrantCount, setEntrantCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    // Fetch entrant count (no auth required)
    getTodayEntrantCount().then((res) => {
      if (res.ok) setEntrantCount(res.count);
    });

    // Fetch user streak if signed in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setIsSignedIn(true);
        getMyProfile(data.user.id).then((res) => {
          if (res.ok) setCurrentStreak(res.profile.current_streak);
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsSignedIn(true);
        getMyProfile(session.user.id).then((res) => {
          if (res.ok) setCurrentStreak(res.profile.current_streak);
        });
      } else {
        setIsSignedIn(false);
        setCurrentStreak(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const streakDisplay =
    currentStreak !== null ? String(currentStreak) : "--";

  const rewardDisplay = (() => {
    if (currentStreak === null) return "Sign in to check";
    const tier = getStreakTier(currentStreak);
    if (tier === "round3-bye") return "Round 3 Bye";
    if (tier === "round2-bye") return "Round 2 Bye";
    return "No bye yet";
  })();

  return (
    <ScreenShell>
      {/* Hero */}
      <View className="rounded-3xl border border-fuchsia-400/20 bg-black/20 p-5">
        <Pill>Daily Throwdown</Pill>

        <Text className="mt-4 text-3xl font-black tracking-tight text-white">
          Rock. Paper. Scissors.{" "}
          <Text className="text-fuchsia-300">Turned into a show.</Text>
        </Text>

        <Text className="mt-3 text-sm leading-6 text-white/70">
          A daily elimination tournament with company-funded cash prizes,
          spectator finals, streak rewards, and a witty AI host who refuses to
          let anyone lose quietly.
        </Text>

        {/* Tournament info */}
        <View className="mt-4 items-end rounded-2xl border border-white/10 bg-white/5 p-4">
          <Text className="text-[10px] uppercase tracking-widest text-white/40">
            Tournament Start
          </Text>
          <Text className="mt-1 text-2xl font-black text-fuchsia-200">
            2:00 PM CT
          </Text>
        </View>

        {/* Stats row */}
        <View className="mt-4 flex-row flex-wrap gap-3">
          <View className="flex-1">
            <StatBox label="Entrants" value={String(entrantCount)} />
          </View>
          <View className="flex-1">
            <StatBox label="Prize Pool" value="$100" color="amber" />
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-3">
          <View className="flex-1">
            <StatBox label="Your Streak" value={streakDisplay} color="green" />
          </View>
          <View className="flex-1">
            <View className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
              <Text className="text-[10px] uppercase tracking-widest text-emerald-100/60">
                Reward
              </Text>
              <Text className="mt-1 text-lg font-bold text-emerald-200">
                {rewardDisplay}
              </Text>
            </View>
          </View>
        </View>

        {/* Host */}
        <View className="mt-4">
          <HostLine slot="Host">{hostLine}</HostLine>
        </View>

        {/* CTAs */}
        <View className="mt-4 flex-row gap-3">
          <Button onPress={() => router.push("/lobby")}>
            Join Tournament
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push("/broadcast")}
          >
            Watch
          </Button>
        </View>
      </View>

      {/* How it works */}
      <Card title="How It Works" subtitle="Daily format, daily chaos">
        <View className="gap-3">
          <View className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <Text className="text-xs font-semibold text-white/50">
              Streak Rewards
            </Text>
            <View className="mt-2 gap-1">
              <Text className="text-sm text-white/75">
                5 straight days = Round 2 bye
              </Text>
              <Text className="text-sm text-white/75">
                15 straight days = Round 3 bye
              </Text>
              <Text className="text-sm text-white/75">
                Miss a day = streak resets
              </Text>
            </View>
          </View>
          <View className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <Text className="text-xs font-semibold text-white/50">
              Prize Breakdown
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-4">
              <Text className="text-sm text-white/75">
                Champion: <Text className="font-bold text-amber-200">$55</Text>
              </Text>
              <Text className="text-sm text-white/75">
                Runner-Up: <Text className="font-bold text-white">$25</Text>
              </Text>
              <Text className="text-sm text-white/75">
                Semis: <Text className="font-bold text-white/80">$10 ea</Text>
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Rules */}
      <Card title="Tournament Rules" subtitle="The full rule set">
        <View className="gap-2">
          {[
            "Daily tournament starts at 2:00 PM Central.",
            "No entry fee. Company-funded cash prizes.",
            "Ties replay until someone wins.",
            "5 consecutive ties = both players advance.",
            "5-day streak = Round 2 bye.",
            "15-day streak = Round 3 bye.",
            "Odd player faces The House (random app move).",
            "Broadcast mode at 16 players remaining.",
            "Final Four and Final are best-of-3.",
          ].map((rule) => (
            <View
              key={rule}
              className="rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3"
            >
              <Text className="text-sm leading-5 text-white/75">{rule}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScreenShell>
  );
}
