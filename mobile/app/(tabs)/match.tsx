import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import {
  ScreenShell,
  Card,
  HostLine,
  Button,
  MoveButton,
  PlayerCard,
  VsDivider,
  Pill,
} from "@/components/ui";
import { getMoveRevealLine, getHostLine } from "@/lib/host";
import type { Move } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import {
  getMyCurrentMatch,
  submitMove,
  subscribeToMatch,
  getTodayTournamentStatus,
  type MatchWithContext,
  type MatchGameRecord,
} from "@/lib/data";
import {
  getTournamentState,
  type TournamentState,
} from "@/lib/tournament-state";

type ScreenState =
  | "loading"
  | "no-tournament"    // No live tournament
  | "waiting"          // Tournament live but no match yet (bye or between rounds)
  | "choosing"         // Player needs to pick a move
  | "locked"           // Move submitted, waiting for opponent
  | "reveal"           // Both moves in, showing result
  | "result"           // Final result banner with next action
  | "eliminated"       // Player is out
  | "spectating";      // Tournament over or player finished

const moveEmojis: Record<Move, string> = {
  rock: "\u{1FAA8}",
  paper: "\u{1F4C4}",
  scissors: "\u2702\uFE0F",
};

export default function MatchScreen() {
  const router = useRouter();
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [match, setMatch] = useState<MatchWithContext | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentState, setTournamentState] = useState<TournamentState>("no-tournament");
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [latestGame, setLatestGame] = useState<MatchGameRecord | null>(null);
  const [hostLine, setHostLine] = useState(getHostLine("match-intro"));
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Compute display values from match
  const roundNumber = match?.round_number ?? 0;
  const isHouseMatch = match?.house_match ?? false;
  const isBestOf3 = (match?.best_of ?? 1) === 3;
  const tieCount = match?.tie_count ?? 0;
  const opponentName = isHouseMatch
    ? "The House"
    : match?.opponentProfile?.display_name ?? "Opponent";

  // Series score from games
  const seriesScore = (() => {
    if (!match) return { you: 0, them: 0 };
    let you = 0;
    let them = 0;
    for (const g of match.games) {
      if (g.result === "tie") continue;
      const gWinnerIsMe =
        (g.result === "player_a" && match.iAmPlayerA) ||
        (g.result === "player_b" && !match.iAmPlayerA);
      if (gWinnerIsMe) you++;
      else them++;
    }
    return { you, them };
  })();

  // Refresh match data
  const refreshMatch = useCallback(async () => {
    if (!tournamentId || !userId) return;

    const res = await getMyCurrentMatch(tournamentId, userId);
    if (!res.ok || !res.match) {
      // No match — could be waiting, bye, or eliminated
      // Check user's entry status
      const { data: entry } = await supabase
        .from("entries")
        .select("status, bye_round")
        .eq("tournament_id", tournamentId)
        .eq("profile_id", userId)
        .maybeSingle();

      if (!entry) {
        setScreenState("spectating");
        return;
      }

      if (entry.status === "eliminated") {
        setScreenState("eliminated");
        setHostLine(getHostLine("elimination"));
        return;
      }

      if (entry.status === "winner") {
        setScreenState("spectating");
        setHostLine(getHostLine("champion-crowned"));
        return;
      }

      // Active but no match — waiting for next round or has bye
      setScreenState("waiting");
      if (entry.bye_round) {
        setHostLine(getHostLine("streak-bye"));
      } else {
        setHostLine(getHostLine("between-rounds"));
      }
      return;
    }

    const m = res.match;
    setMatch(m);

    // Determine screen state from match data
    if (m.status === "completed") {
      const lastGame = m.games[m.games.length - 1];
      setLatestGame(lastGame ?? null);

      if (m.dual_advance) {
        setScreenState("result");
        setHostLine(getHostLine("five-tie"));
      } else if (m.winner_entry_id === m.myEntryId) {
        setScreenState("result");
        if (lastGame) {
          const myMove = m.iAmPlayerA ? lastGame.player_a_move : lastGame.player_b_move;
          const oppMove = m.iAmPlayerA ? lastGame.player_b_move : lastGame.player_a_move;
          if (myMove && oppMove) {
            setHostLine(getMoveRevealLine(myMove as Move, oppMove as Move));
          }
        }
      } else {
        setScreenState("eliminated");
        setHostLine(getHostLine("elimination"));
      }
      return;
    }

    // Match is live — check if we already submitted for current game
    const currentGameNumber = m.games.length + 1;
    const { data: myThrow } = await supabase
      .from("throws")
      .select("id, move")
      .eq("match_id", m.id)
      .eq("game_number", currentGameNumber)
      .eq("entry_id", m.myEntryId)
      .maybeSingle();

    if (myThrow) {
      setSelectedMove(myThrow.move as Move);
      setScreenState("locked");
      setHostLine("Move locked — waiting for opponent...");
    } else {
      setScreenState("choosing");
      setSelectedMove(null);
      if (tieCount > 0) {
        setHostLine("Again. Let's see if anyone changes their mind.");
      } else {
        setHostLine(getHostLine("pre-reveal"));
      }
    }
  }, [tournamentId, userId, tieCount]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) {
        setScreenState("no-tournament");
        return;
      }
      setUserId(user.id);

      const tRes = await getTodayTournamentStatus();
      if (cancelled) return;

      if (!tRes.ok || !tRes.tournament) {
        setScreenState("no-tournament");
        return;
      }

      const state = getTournamentState(tRes.tournament);
      setTournamentState(state);
      setTournamentId(tRes.tournament.id);

      if (state !== "live") {
        setScreenState("no-tournament");
        return;
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Once we have tournamentId + userId, fetch match and subscribe
  useEffect(() => {
    if (!tournamentId || !userId || tournamentState !== "live") return;

    refreshMatch();

    // Poll for match availability (new rounds) every 5 seconds
    const pollInterval = setInterval(refreshMatch, 5000);

    return () => clearInterval(pollInterval);
  }, [tournamentId, userId, tournamentState, refreshMatch]);

  // Subscribe to match-level Realtime when we have a match
  useEffect(() => {
    if (!match?.id) return;

    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToMatch(match.id, () => {
      refreshMatch();
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [match?.id, refreshMatch]);

  // Handle move selection
  const handleSelectMove = useCallback(
    (move: Move) => {
      if (screenState !== "choosing") return;
      setSelectedMove(move);
    },
    [screenState]
  );

  // Handle lock in — submit to Edge Function
  const handleLockIn = useCallback(async () => {
    if (!selectedMove || !match) return;
    setScreenState("locked");
    setHostLine("Move locked — waiting for opponent...");
    setError(null);

    const result = await submitMove(match.id, selectedMove);

    if (!result.ok) {
      setError(result.reason);
      setScreenState("choosing");
      return;
    }

    // If already resolved (house match or both submitted), refresh immediately
    if (result.resolved) {
      setTimeout(refreshMatch, 500);
    }
  }, [selectedMove, match, refreshMatch]);

  // Result helpers
  const getResultType = (): "win" | "loss" | "tie" | null => {
    if (!match || match.status !== "completed") return null;
    if (match.dual_advance) return "tie";
    if (match.winner_entry_id === match.myEntryId) return "win";
    return "loss";
  };

  const resultType = getResultType();

  const handleNextAction = useCallback(() => {
    if (resultType === "win" || resultType === "tie") {
      // Reset for next round — refreshMatch will pick up new match
      setMatch(null);
      setSelectedMove(null);
      setLatestGame(null);
      setScreenState("waiting");
      setHostLine(getHostLine("between-rounds"));
      // Will auto-refresh via poll interval
    } else {
      router.push("/broadcast");
    }
  }, [resultType, router]);

  // ============================================================
  // RENDER
  // ============================================================

  if (screenState === "loading") {
    return (
      <ScreenShell>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-white/50">Loading match...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (screenState === "no-tournament") {
    return (
      <ScreenShell>
        <View className="items-center gap-5 py-20">
          <Pill>No Active Tournament</Pill>
          <Text className="text-xl font-black text-white">
            No live tournament right now
          </Text>
          <Text className="text-sm text-center text-white/50">
            Matches begin when the daily tournament goes live at 2:00 PM CT.
          </Text>
          <Button variant="secondary" onPress={() => router.push("/lobby")}>
            Go to Lobby
          </Button>
        </View>
      </ScreenShell>
    );
  }

  if (screenState === "waiting") {
    return (
      <ScreenShell>
        <View className="items-center gap-5 py-20">
          <Pill color="cyan">Waiting</Pill>
          <Text className="text-xl font-black text-white">
            Waiting for your match...
          </Text>
          <View className="w-full">
            <HostLine slot="Host">{hostLine}</HostLine>
          </View>
          <Text className="text-sm text-center text-white/50">
            The next round is being prepared. Hang tight.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (screenState === "eliminated") {
    return (
      <ScreenShell>
        <View className="items-center gap-5 py-10">
          <Pill color="red">Eliminated</Pill>
          <Text className="text-xl font-black text-white">
            You've Been Eliminated
          </Text>
          <View className="w-full">
            <HostLine slot="Host">{hostLine}</HostLine>
          </View>
          <View className="flex-row gap-3">
            <Button onPress={() => router.push("/broadcast")}>
              Watch Live
            </Button>
            <Button variant="secondary" onPress={() => router.push("/results")}>
              Results
            </Button>
          </View>
        </View>
      </ScreenShell>
    );
  }

  if (screenState === "spectating") {
    return (
      <ScreenShell>
        <View className="items-center gap-5 py-10">
          <Pill color="green">Tournament Complete</Pill>
          <View className="w-full">
            <HostLine slot="Host">{hostLine}</HostLine>
          </View>
          <Button onPress={() => router.push("/results")}>
            View Results
          </Button>
        </View>
      </ScreenShell>
    );
  }

  // Active match states: choosing, locked, reveal, result
  const myMove = latestGame
    ? match?.iAmPlayerA
      ? (latestGame.player_a_move as Move | null)
      : (latestGame.player_b_move as Move | null)
    : null;
  const oppMove = latestGame
    ? match?.iAmPlayerA
      ? (latestGame.player_b_move as Move | null)
      : (latestGame.player_a_move as Move | null)
    : null;

  return (
    <ScreenShell>
      {/* Round info */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Pill color="fuchsia">{`Round ${roundNumber}`}</Pill>
        {match?.phase && <Pill color="default">{match.phase}</Pill>}
        {isHouseMatch && <Pill color="amber">House Match</Pill>}
        {isBestOf3 && <Pill color="cyan">Best of 3</Pill>}
        {tieCount > 0 && <Pill color="red">{`Tie #${tieCount}`}</Pill>}
      </View>

      {/* Main match area */}
      <View className="rounded-3xl border border-fuchsia-400/20 bg-black/20 p-5">
        {/* Players */}
        <View className="flex-row items-center justify-between">
          <PlayerCard
            name="You"
            subtitle={
              match ? `${match.games.length > 0 ? seriesScore.you + "W" : "Ready"}` : "--"
            }
            side="left"
          />
          <VsDivider
            score={
              isBestOf3
                ? `${seriesScore.you}-${seriesScore.them}`
                : undefined
            }
          />
          <PlayerCard
            name={opponentName}
            subtitle={
              isHouseMatch
                ? "Random moves"
                : match?.opponentStreak
                  ? `${match.opponentStreak}d streak`
                  : "--"
            }
            side="right"
          />
        </View>

        {/* Host line */}
        <View className="mt-5">
          <HostLine slot="Host">{hostLine}</HostLine>
        </View>

        {/* State: choosing */}
        {screenState === "choosing" && (
          <View className="mt-6 gap-4">
            <Text className="text-center text-xs uppercase tracking-widest text-white/40">
              Choose your move
            </Text>
            <View className="flex-row gap-3">
              <MoveButton
                move="rock"
                selected={selectedMove === "rock"}
                locked={false}
                onPress={() => handleSelectMove("rock")}
              />
              <MoveButton
                move="paper"
                selected={selectedMove === "paper"}
                locked={false}
                onPress={() => handleSelectMove("paper")}
              />
              <MoveButton
                move="scissors"
                selected={selectedMove === "scissors"}
                locked={false}
                onPress={() => handleSelectMove("scissors")}
              />
            </View>
            <View className="items-center">
              <Button onPress={handleLockIn} disabled={!selectedMove}>
                Lock In
              </Button>
            </View>
            {error && (
              <Text className="text-center text-sm text-red-300">{error}</Text>
            )}
          </View>
        )}

        {/* State: locked */}
        {screenState === "locked" && (
          <View className="mt-6 items-center gap-3">
            <Text className="text-6xl">
              {selectedMove && moveEmojis[selectedMove]}
            </Text>
            <Text className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Move locked — waiting for opponent...
            </Text>
            <View className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <View className="h-full w-full rounded-full bg-fuchsia-400 opacity-60" />
            </View>
          </View>
        )}

        {/* State: result (match completed) */}
        {screenState === "result" && resultType && (
          <View className="mt-6 gap-5">
            {/* Move reveal */}
            {myMove && oppMove && (
              <View className="flex-row items-center justify-center gap-6">
                <View className="items-center gap-1">
                  <Text className="text-[10px] uppercase tracking-widest text-white/40">
                    You
                  </Text>
                  <Text className="text-6xl">{moveEmojis[myMove]}</Text>
                  <Text className="text-xs font-bold capitalize text-white">
                    {myMove}
                  </Text>
                </View>

                <Text className="text-xl font-black text-white/30">vs</Text>

                <View className="items-center gap-1">
                  <Text className="text-[10px] uppercase tracking-widest text-white/40">
                    {opponentName}
                  </Text>
                  <Text className="text-6xl">{moveEmojis[oppMove]}</Text>
                  <Text className="text-xs font-bold capitalize text-white">
                    {oppMove}
                  </Text>
                </View>
              </View>
            )}

            {/* Result banner */}
            <View
              className={`rounded-2xl border p-5 ${
                resultType === "win"
                  ? "border-emerald-400/25 bg-emerald-400/10"
                  : resultType === "loss"
                    ? "border-red-400/25 bg-red-400/10"
                    : "border-amber-400/25 bg-amber-400/10"
              }`}
            >
              <Text
                className={`text-center text-xl font-black ${
                  resultType === "win"
                    ? "text-emerald-200"
                    : resultType === "loss"
                      ? "text-red-200"
                      : "text-amber-200"
                }`}
              >
                {resultType === "win" && "You Win! Advancing..."}
                {resultType === "loss" && "Eliminated"}
                {resultType === "tie" && "5 Ties — Both Advance!"}
              </Text>
            </View>

            <View className="flex-row justify-center gap-3">
              {(resultType === "win" || resultType === "tie") && (
                <Button onPress={handleNextAction}>
                  Next Round
                </Button>
              )}
              {resultType === "loss" && (
                <View className="flex-row gap-3">
                  <Button onPress={() => router.push("/broadcast")}>
                    Watch Live
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => router.push("/results")}
                  >
                    Results
                  </Button>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}
