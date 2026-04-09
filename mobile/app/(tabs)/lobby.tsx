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
import { joinTodayTournament, getMyProfile } from "@/lib/data";
import { getStreakTier } from "@/lib/engine";

export default function LobbyScreen() {
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const hostLine = joined
    ? "You're locked in. Pride now involved."
    : getHostLine("pre-show");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        getMyProfile(data.user.id).then((res) => {
          if (res.ok) setCurrentStreak(res.profile.current_streak);
        });
      }
    });
  }, []);

  const streakDisplay =
    currentStreak !== null ? String(currentStreak) : "--";

  const benefitDisplay = (() => {
    if (currentStreak === null) return "Sign in to check";
    const tier = getStreakTier(currentStreak);
    if (tier === "round3-bye") return "Round 3 Bye";
    if (tier === "round2-bye") return "Round 2 Bye";
    return "No bye (play all rounds)";
  })();

  async function handleJoin() {
    setJoining(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sign in first to join.");
        setJoining(false);
        return;
      }

      // Use real streak from profile
      const streak = currentStreak ?? 0;

      const result = await joinTodayTournament({
        profileId: user.id,
        streak,
      });

      if (result.ok) {
        setJoined(true);
      } else {
        setError(result.reason);
      }
    } catch (e) {
      setError("Failed to join. Try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <ScreenShell>
      {/* Status header */}
      <View className="rounded-3xl border border-fuchsia-400/20 bg-black/20 p-5">
        <View className="flex-row flex-wrap gap-2">
          <Pill color={joined ? "green" : "fuchsia"}>
            {joined ? "Registered" : "Registration Open"}
          </Pill>
        </View>

        <Text className="mt-3 text-2xl font-black tracking-tight text-white">
          {joined
            ? "You're In. Tournament Starts Soon."
            : "Today's Tournament"}
        </Text>

        <Text className="mt-2 text-sm leading-6 text-white/70">
          {joined
            ? "Hang tight. When the clock hits 2:00 PM CT, the bracket locks and chaos begins."
            : "Registration is open. Join now to lock in your spot."}
        </Text>

        {/* Stats */}
        <View className="mt-4 flex-row flex-wrap gap-3">
          <View className="flex-1">
            <StatBox label="Prize Pool" value="$100" color="amber" />
          </View>
          <View className="flex-1">
            <StatBox label="Your Streak" value={streakDisplay} color="green" />
          </View>
        </View>

        {/* Host */}
        <View className="mt-4">
          <HostLine slot="Host">{hostLine}</HostLine>
        </View>

        {/* CTA */}
        {!joined && (
          <View className="mt-4">
            <Button onPress={handleJoin} disabled={joining}>
              {joining ? "Joining..." : "Join Today's Tournament"}
            </Button>
          </View>
        )}

        {joined && (
          <View className="mt-4 flex-row items-center gap-3">
            <Pill color="green">Entry Confirmed</Pill>
            <Text className="text-xs text-white/50">
              Waiting for tournament to begin...
            </Text>
          </View>
        )}

        {error && (
          <Text className="mt-3 text-sm text-red-300">{error}</Text>
        )}
      </View>

      {/* Entry details */}
      <Card title="Your Entry Details">
        <View className="gap-3">
          {[
            {
              label: "Streak",
              value: streakDisplay,
              valueColor: "text-emerald-200",
            },
            {
              label: "Benefit",
              value: benefitDisplay,
              valueColor: "text-cyan-200",
            },
            {
              label: "Entry Fee",
              value: "Free",
              valueColor: "text-emerald-200",
            },
          ].map((item) => (
            <View
              key={item.label}
              className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4"
            >
              <Text className="text-sm text-white/50">{item.label}</Text>
              <Text className={`font-bold ${item.valueColor}`}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Prize structure */}
      <Card title="Prize Structure">
        <View className="gap-3">
          {[
            { place: "Champion", prize: "$55", color: "text-amber-200" },
            { place: "Runner-Up", prize: "$25", color: "text-white" },
            { place: "3rd Place", prize: "$10", color: "text-white/80" },
            { place: "4th Place", prize: "$10", color: "text-white/80" },
          ].map((item) => (
            <View
              key={item.place}
              className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4"
            >
              <Text className="text-sm text-white">{item.place}</Text>
              <Text className={`text-xl font-bold ${item.color}`}>
                {item.prize}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScreenShell>
  );
}
