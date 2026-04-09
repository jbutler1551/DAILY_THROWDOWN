import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  joinTodayTournament,
  getMyProfile,
  getTodayTournamentStatus,
  getMyEntry,
  subscribeToEntries,
} from "@/lib/data";
import { getStreakTier } from "@/lib/engine";
import {
  getTournamentState,
  getMsUntilStart,
  formatCountdown,
  type TournamentState,
  type TournamentInfo,
} from "@/lib/tournament-state";

export default function LobbyScreen() {
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [tournamentState, setTournamentState] =
    useState<TournamentState>("no-tournament");
  const [entrantCount, setEntrantCount] = useState(0);
  const [countdown, setCountdown] = useState("--:--:--");
  const [entryBye, setEntryBye] = useState<number | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const hostLine = joined
    ? "You're locked in. Pride now involved."
    : tournamentState === "starting-soon"
      ? getHostLine("pre-show")
      : getHostLine("pre-show");

  // Load tournament + user data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Tournament status
      const tRes = await getTodayTournamentStatus();
      if (cancelled) return;
      if (tRes.ok && tRes.tournament) {
        setTournament(tRes.tournament);
        setEntrantCount(tRes.entrantCount);
        setTournamentState(getTournamentState(tRes.tournament));

        // Subscribe to live entrant count
        if (unsubRef.current) unsubRef.current();
        unsubRef.current = subscribeToEntries(
          tRes.tournament.id,
          (count) => {
            if (!cancelled) setEntrantCount(count);
          }
        );
      } else {
        setTournamentState("no-tournament");
      }

      // User streak + entry check
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);

      const profileRes = await getMyProfile(user.id);
      if (cancelled) return;
      if (profileRes.ok) {
        setCurrentStreak(profileRes.profile.current_streak);
      }

      // Check if already joined
      if (tRes.ok && tRes.tournament) {
        const entryRes = await getMyEntry(tRes.tournament.id, user.id);
        if (!cancelled && entryRes.ok && entryRes.entry) {
          setJoined(true);
          setEntryBye(entryRes.entry.bye_round);
          setCurrentStreak(entryRes.entry.streak_at_entry);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!tournament || tournamentState === "completed" || tournamentState === "live") {
      return;
    }

    function tick() {
      const ms = getMsUntilStart(tournament);
      setCountdown(formatCountdown(ms));
      // Update tournament state (might transition to starting-soon)
      setTournamentState(getTournamentState(tournament));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tournament, tournamentState]);

  const streakDisplay =
    currentStreak !== null ? String(currentStreak) : "--";

  const benefitDisplay = (() => {
    if (joined && entryBye) {
      return `Round ${entryBye} Bye`;
    }
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

      const streak = currentStreak ?? 0;

      const result = await joinTodayTournament({
        profileId: user.id,
        streak,
      });

      if (result.ok) {
        setJoined(true);
        // The trigger updates streak_at_entry and bye_round server-side.
        // Re-fetch entry to get authoritative values.
        if (result.entry) {
          setEntryBye(result.entry.bye_round);
          setCurrentStreak(result.entry.streak_at_entry);
        }
        // Re-fetch profile to get updated streak
        const profileRes = await getMyProfile(user.id);
        if (profileRes.ok) {
          setCurrentStreak(profileRes.profile.current_streak);
        }
      } else {
        setError(result.reason);
      }
    } catch (e) {
      setError("Failed to join. Try again.");
    } finally {
      setJoining(false);
    }
  }

  const statePill = (() => {
    switch (tournamentState) {
      case "no-tournament":
        return <Pill color="amber">No Tournament Today</Pill>;
      case "registration":
        return <Pill color="fuchsia">Registration Open</Pill>;
      case "starting-soon":
        return <Pill color="cyan">Starting Soon</Pill>;
      case "live":
        return <Pill color="green">Tournament Live</Pill>;
      case "completed":
        return <Pill color="default">Completed</Pill>;
    }
  })();

  const headerText = (() => {
    if (joined && tournamentState === "live") return "Tournament is Live!";
    if (joined) return "You're In. Tournament Starts Soon.";
    if (tournamentState === "live") return "Tournament In Progress";
    if (tournamentState === "completed") return "Today's Tournament is Over";
    if (tournamentState === "no-tournament") return "No Tournament Scheduled";
    return "Today's Tournament";
  })();

  const showJoinButton =
    !joined &&
    (tournamentState === "registration" || tournamentState === "starting-soon");

  return (
    <ScreenShell>
      {/* Status header */}
      <View className="rounded-3xl border border-fuchsia-400/20 bg-black/20 p-5">
        <View className="flex-row flex-wrap gap-2">
          {joined ? <Pill color="green">Registered</Pill> : null}
          {statePill}
        </View>

        <Text className="mt-3 text-2xl font-black tracking-tight text-white">
          {headerText}
        </Text>

        <Text className="mt-2 text-sm leading-6 text-white/70">
          {joined
            ? "Hang tight. When the clock hits zero, the bracket locks and chaos begins."
            : tournamentState === "registration"
              ? "Registration is open. Join now to lock in your spot."
              : tournamentState === "starting-soon"
                ? "Tournament starting momentarily. Last chance to enter!"
                : tournamentState === "live"
                  ? "The bracket is locked. Watch the action in Broadcast."
                  : "Check back tomorrow for the next daily tournament."}
        </Text>

        {/* Countdown */}
        {tournament &&
          tournamentState !== "live" &&
          tournamentState !== "completed" && (
            <View className="mt-4 items-center rounded-2xl border border-white/10 bg-white/5 p-4">
              <Text className="text-[10px] uppercase tracking-widest text-white/40">
                Tournament Starts In
              </Text>
              <Text className="mt-1 text-3xl font-black tracking-wider text-fuchsia-200">
                {countdown}
              </Text>
            </View>
          )}

        {/* Stats */}
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
            <StatBox
              label="Reward"
              value={benefitDisplay}
              color="cyan"
            />
          </View>
        </View>

        {/* Host */}
        <View className="mt-4">
          <HostLine slot="Host">{hostLine}</HostLine>
        </View>

        {/* CTA */}
        {showJoinButton && (
          <View className="mt-4">
            <Button onPress={handleJoin} disabled={joining}>
              {joining ? "Joining..." : "Join Today's Tournament"}
            </Button>
          </View>
        )}

        {joined && tournamentState !== "live" && tournamentState !== "completed" && (
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
