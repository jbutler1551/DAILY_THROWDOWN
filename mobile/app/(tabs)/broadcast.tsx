import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text } from "react-native";
import {
  ScreenShell,
  Card,
  HostLine,
  PlayerCard,
  VsDivider,
  Pill,
} from "@/components/ui";
import { getHostLine } from "@/lib/host";
import {
  getTodayTournamentStatus,
  getTournamentBracket,
  subscribeToTournament,
  type BracketMatch,
} from "@/lib/data";
import {
  getTournamentState,
  type TournamentState,
} from "@/lib/tournament-state";

function MatchCard({ match }: { match: BracketMatch }) {
  const isLive = match.status === "live";
  const isComplete = match.status === "completed";

  const borderColor = isLive
    ? "border-cyan-400/30 bg-cyan-400/8"
    : isComplete
      ? "border-white/8 bg-white/[0.02]"
      : "border-white/10 bg-white/[0.03]";

  const playerAName = match.player_a?.display_name ?? "TBD";
  const playerBName = match.house_match
    ? "The House"
    : match.player_b?.display_name ?? "TBD";

  const isAWinner = match.winner_entry_id === match.player_a?.entry_id;
  const isBWinner =
    match.winner_entry_id === match.player_b?.entry_id;

  // Latest game result for display
  const lastGame = match.games[match.games.length - 1];
  const resultText = lastGame
    ? `${lastGame.player_a_move ?? "?"} vs ${lastGame.player_b_move ?? "?"}`
    : null;

  // Series score for best-of-3
  const aWins = match.games.filter((g) => g.result === "player_a").length;
  const bWins = match.games.filter((g) => g.result === "player_b").length;
  const seriesText = match.best_of === 3 ? `${aWins}-${bWins}` : null;

  return (
    <View className={`rounded-2xl border p-4 ${borderColor}`}>
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-[10px] uppercase tracking-widest ${
            isLive ? "text-cyan-300" : "text-white/40"
          }`}
        >
          Round {match.round_number}
          {match.phase !== "elimination" ? ` — ${match.phase}` : ""}
        </Text>
        <View className="flex-row gap-2">
          {match.dual_advance && <Pill color="amber">Dual Advance</Pill>}
          {match.tie_count > 0 && isLive && (
            <Pill color="red">{`Tie #${match.tie_count}`}</Pill>
          )}
          <Text
            className={`text-[10px] uppercase tracking-widest ${
              isLive
                ? "text-cyan-300"
                : isComplete
                  ? "text-emerald-300/60"
                  : "text-white/30"
            }`}
          >
            {isLive ? "LIVE" : isComplete ? "Complete" : "Upcoming"}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text
          className={`text-sm font-bold ${
            isAWinner
              ? "text-white"
              : isBWinner
                ? "text-white/40"
                : "text-white/80"
          }`}
        >
          {playerAName}
        </Text>
        <View className="items-center">
          {resultText && (
            <Text className="text-[10px] capitalize text-white/50">
              {resultText}
            </Text>
          )}
          {seriesText && (
            <Text className="text-sm font-bold text-cyan-200">
              {seriesText}
            </Text>
          )}
          {!resultText && !seriesText && (
            <Text className="text-xs text-white/30">vs</Text>
          )}
        </View>
        <Text
          className={`text-sm font-bold ${
            isBWinner
              ? "text-white"
              : isAWinner
                ? "text-white/40"
                : "text-white/80"
          }`}
        >
          {playerBName}
        </Text>
      </View>

      {match.best_of === 3 && (
        <View className="mt-2 items-center">
          <Pill color="cyan">Best of 3</Pill>
        </View>
      )}
    </View>
  );
}

export default function BroadcastScreen() {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentState, setTournamentState] =
    useState<TournamentState>("no-tournament");
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [totalRounds, setTotalRounds] = useState(0);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  const fetchBracket = useCallback(async (tId: string) => {
    const res = await getTournamentBracket(tId);
    if (res.ok) {
      setBracketMatches(res.matches);
      setTotalRounds(res.rounds);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const tRes = await getTodayTournamentStatus();
      if (cancelled) return;

      if (!tRes.ok || !tRes.tournament) {
        setLoading(false);
        return;
      }

      const state = getTournamentState(tRes.tournament);
      setTournamentState(state);
      setTournamentId(tRes.tournament.id);

      if (state === "live" || state === "completed") {
        await fetchBracket(tRes.tournament.id);
      }

      setLoading(false);

      // Subscribe to live updates
      if (state === "live") {
        unsubRef.current = subscribeToTournament(tRes.tournament.id, () => {
          if (!cancelled) fetchBracket(tRes.tournament!.id);
        });
      }
    }

    init();

    return () => {
      cancelled = true;
      if (unsubRef.current) unsubRef.current();
    };
  }, [fetchBracket]);

  // Derived values
  const liveMatches = bracketMatches.filter((m) => m.status === "live");
  const featuredMatch = liveMatches[0] ?? null;
  const activePlayerCount = bracketMatches.filter(
    (m) => m.status === "live" || m.status === "pending"
  ).length * 2; // rough estimate
  const completedCount = bracketMatches.filter(
    (m) => m.status === "completed"
  ).length;

  // Group by round
  const roundGroups = new Map<number, BracketMatch[]>();
  for (const m of bracketMatches) {
    const list = roundGroups.get(m.round_number) ?? [];
    list.push(m);
    roundGroups.set(m.round_number, list);
  }
  const sortedRounds = Array.from(roundGroups.entries()).sort(
    (a, b) => a[0] - b[0]
  );

  if (loading) {
    return (
      <ScreenShell>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-white/50">Loading bracket...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (tournamentState !== "live" && tournamentState !== "completed") {
    return (
      <ScreenShell>
        <View className="items-center gap-5 py-20">
          <Pill>Broadcast</Pill>
          <Text className="text-xl font-black text-white">
            No Active Broadcast
          </Text>
          <Text className="text-sm text-center text-white/50">
            The bracket will appear here when the tournament goes live at 2:00 PM CT.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      {/* Broadcast header */}
      <View className="rounded-3xl border border-cyan-400/20 bg-black/20 p-5">
        <View className="flex-row flex-wrap gap-2">
          <Pill color="cyan">
            {tournamentState === "live" ? "Broadcast Mode" : "Tournament Over"}
          </Pill>
          <Pill>{`${bracketMatches.length} matches`}</Pill>
          {liveMatches.length > 0 && (
            <Pill color="green">{`${liveMatches.length} live`}</Pill>
          )}
        </View>

        <Text className="mt-3 text-2xl font-black tracking-tight text-white">
          {tournamentState === "live"
            ? "The Tournament Is Live"
            : "Tournament Complete"}
        </Text>
        <Text className="mt-2 text-sm leading-6 text-white/70">
          {tournamentState === "live"
            ? "Broadcast mode is active. Everyone can watch."
            : `${totalRounds} rounds played. ${completedCount} matches completed.`}
        </Text>
      </View>

      {/* Featured live match */}
      {featuredMatch && (
        <View className="rounded-3xl border border-cyan-400/15 bg-cyan-900/10 p-5">
          <View className="flex-row items-center justify-between">
            <Pill color="cyan">Featured Match — LIVE</Pill>
            <Text className="text-xs font-semibold text-cyan-200">
              {featuredMatch.phase}
            </Text>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <PlayerCard
              name={featuredMatch.player_a?.display_name ?? "TBD"}
              subtitle={`Round ${featuredMatch.round_number}`}
              side="left"
            />
            <VsDivider
              score={
                featuredMatch.best_of === 3
                  ? `${featuredMatch.games.filter((g) => g.result === "player_a").length}-${featuredMatch.games.filter((g) => g.result === "player_b").length}`
                  : undefined
              }
            />
            <PlayerCard
              name={
                featuredMatch.house_match
                  ? "The House"
                  : featuredMatch.player_b?.display_name ?? "TBD"
              }
              subtitle={featuredMatch.house_match ? "Random moves" : `Round ${featuredMatch.round_number}`}
              side="right"
            />
          </View>

          <View className="mt-4">
            <HostLine slot="Live Commentary">
              {getHostLine("broadcast-intro")}
            </HostLine>
          </View>
        </View>
      )}

      {/* Bracket by round */}
      {sortedRounds.map(([roundNum, matches]) => (
        <Card
          key={roundNum}
          title={`Round ${roundNum}`}
          subtitle={`${matches.length} match${matches.length === 1 ? "" : "es"}`}
        >
          <View className="gap-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </View>
        </Card>
      ))}

      {/* Prize reminder */}
      <Card>
        <View className="gap-2">
          {[
            { label: "Champion", prize: "$55", color: "text-amber-200" },
            { label: "Runner-Up", prize: "$25", color: "text-white" },
            { label: "Semifinalists", prize: "$10 each", color: "text-white/80" },
          ].map((item) => (
            <View key={item.label} className="flex-row justify-between">
              <Text className="text-sm text-white/60">{item.label}</Text>
              <Text className={`text-sm font-bold ${item.color}`}>
                {item.prize}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScreenShell>
  );
}
