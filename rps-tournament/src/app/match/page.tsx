"use client";

import { useState, useCallback } from "react";
import {
  PageShell,
  Card,
  HostLine,
  Button,
  MoveButton,
  PlayerCard,
  VsDivider,
  Pill,
  Countdown,
} from "@/components/ui";
import { resolveThrow, randomMove } from "@/lib/engine";
import { getMoveRevealLine, getHostLine } from "@/lib/host";
import type { Move } from "@/lib/types";

type MatchState =
  | "intro"
  | "choosing"
  | "locked"
  | "reveal"
  | "result";

const moveEmojis: Record<Move, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

export default function MatchPage() {
  const [state, setState] = useState<MatchState>("intro");
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [result, setResult] = useState<"win" | "loss" | "tie" | null>(null);
  const [hostLine, setHostLine] = useState(getHostLine("match-intro"));
  const [round, setRound] = useState(3);
  const [tieCount, setTieCount] = useState(0);
  const [isHouseMatch] = useState(false);
  const [seriesScore, setSeriesScore] = useState({ you: 0, them: 0 });
  const [isBestOf3] = useState(false);

  const opponentName = isHouseMatch ? "The House" : "Emily";

  const handleStartMatch = useCallback(() => {
    setState("choosing");
    setHostLine(getHostLine("pre-reveal"));
  }, []);

  const handleSelectMove = useCallback((move: Move) => {
    if (state !== "choosing") return;
    setSelectedMove(move);
  }, [state]);

  const handleLockIn = useCallback(() => {
    if (!selectedMove) return;
    setState("locked");
    setHostLine("Moves locked. Revealing in 3… 2… 1…");

    // Simulate opponent + reveal after delay
    setTimeout(() => {
      const oppMove = randomMove();
      setOpponentMove(oppMove);
      setState("reveal");

      const outcome = resolveThrow(selectedMove, oppMove);

      if (outcome === "tie") {
        const newTieCount = tieCount + 1;
        setTieCount(newTieCount);

        if (newTieCount >= 5) {
          setResult("tie");
          setHostLine(getHostLine("five-tie"));
        } else {
          setResult("tie");
          setHostLine(getHostLine("tie"));
        }
      } else if (outcome === "playerA") {
        setResult("win");
        if (isBestOf3) {
          setSeriesScore((prev) => ({ ...prev, you: prev.you + 1 }));
        }
        setHostLine(getMoveRevealLine(selectedMove, oppMove));
      } else {
        setResult("loss");
        if (isBestOf3) {
          setSeriesScore((prev) => ({ ...prev, them: prev.them + 1 }));
        }
        setHostLine(getMoveRevealLine(oppMove, selectedMove));
      }

      setTimeout(() => setState("result"), 800);
    }, 1500);
  }, [selectedMove, tieCount, isBestOf3]);

  const handleNextAction = useCallback(() => {
    if (result === "tie" && tieCount < 5) {
      // Replay
      setSelectedMove(null);
      setOpponentMove(null);
      setResult(null);
      setState("choosing");
      setHostLine("Again. Let's see if anyone changes their mind.");
    } else {
      // Move to next screen
      if (result === "win" || (result === "tie" && tieCount >= 5)) {
        window.location.href = "/broadcast";
      } else {
        window.location.href = "/results";
      }
    }
  }, [result, tieCount]);

  return (
    <PageShell nav="match">
      {/* Round info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Pill color="fuchsia">Round {round}</Pill>
          {isHouseMatch && <Pill color="amber">House Match</Pill>}
          {isBestOf3 && <Pill color="cyan">Best of 3</Pill>}
          {tieCount > 0 && <Pill color="red">Tie #{tieCount}</Pill>}
        </div>
        <div className="text-sm text-white/50">247 players remaining</div>
      </div>

      {/* Main match area */}
      <div className="rounded-[2rem] border border-fuchsia-400/20 bg-black/20 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
        {/* Players */}
        <div className="flex items-center justify-between gap-4">
          <PlayerCard
            name="David"
            subtitle="15-day streak"
            streakDays={15}
            side="left"
          />
          <VsDivider
            score={isBestOf3 ? `${seriesScore.you}–${seriesScore.them}` : undefined}
          />
          <PlayerCard
            name={opponentName}
            subtitle={isHouseMatch ? "Random moves" : "8-day streak"}
            streakDays={isHouseMatch ? undefined : 8}
            side="right"
          />
        </div>

        {/* Host line */}
        <div className="mt-6">
          <HostLine slot="Host">{hostLine}</HostLine>
        </div>

        {/* State: intro */}
        {state === "intro" && (
          <div className="mt-8 flex flex-col items-center gap-6">
            <Countdown label="Match begins" value="Ready" size="lg" />
            <Button onClick={handleStartMatch}>Start Match</Button>
          </div>
        )}

        {/* State: choosing */}
        {state === "choosing" && (
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <Countdown label="Choose your move" value="0:10" size="md" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <MoveButton
                move="rock"
                selected={selectedMove === "rock"}
                locked={false}
                onClick={() => handleSelectMove("rock")}
              />
              <MoveButton
                move="paper"
                selected={selectedMove === "paper"}
                locked={false}
                onClick={() => handleSelectMove("paper")}
              />
              <MoveButton
                move="scissors"
                selected={selectedMove === "scissors"}
                locked={false}
                onClick={() => handleSelectMove("scissors")}
              />
            </div>
            <div className="flex justify-center">
              <Button
                onClick={handleLockIn}
                disabled={!selectedMove}
              >
                Lock In
              </Button>
            </div>
          </div>
        )}

        {/* State: locked */}
        {state === "locked" && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="text-6xl">{selectedMove && moveEmojis[selectedMove]}</div>
            <div className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Move locked — waiting for opponent…
            </div>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-full animate-pulse rounded-full bg-fuchsia-400" />
            </div>
          </div>
        )}

        {/* State: reveal + result */}
        {(state === "reveal" || state === "result") && (
          <div className="mt-8 space-y-6">
            {/* Move reveal */}
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs uppercase tracking-wider text-white/50">
                  You
                </div>
                <div className="text-7xl">
                  {selectedMove && moveEmojis[selectedMove]}
                </div>
                <div className="text-sm font-bold capitalize">
                  {selectedMove}
                </div>
              </div>

              <div className="text-2xl font-black text-white/30">vs</div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-xs uppercase tracking-wider text-white/50">
                  {opponentName}
                </div>
                <div className="text-7xl">
                  {opponentMove && moveEmojis[opponentMove]}
                </div>
                <div className="text-sm font-bold capitalize">
                  {opponentMove}
                </div>
              </div>
            </div>

            {/* Result banner */}
            {state === "result" && result && (
              <div className="space-y-4">
                <div
                  className={`rounded-2xl border p-6 text-center text-2xl font-black ${
                    result === "win"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : result === "loss"
                      ? "border-red-400/25 bg-red-400/10 text-red-200"
                      : "border-amber-400/25 bg-amber-400/10 text-amber-200"
                  }`}
                >
                  {result === "win" && "You Win!"}
                  {result === "loss" && "Eliminated"}
                  {result === "tie" && tieCount >= 5
                    ? "5 Ties — Both Advance!"
                    : result === "tie"
                    ? `Tie #${tieCount} — Replay`
                    : ""}
                </div>

                <div className="flex justify-center gap-3">
                  {result === "tie" && tieCount < 5 && (
                    <Button onClick={handleNextAction}>
                      Replay Round
                    </Button>
                  )}
                  {result === "win" && (
                    <Button onClick={handleNextAction}>
                      Continue →
                    </Button>
                  )}
                  {result === "loss" && (
                    <>
                      <a href="/broadcast">
                        <Button variant="secondary">Watch Tournament</Button>
                      </a>
                      <a href="/results">
                        <Button variant="secondary">View Results</Button>
                      </a>
                    </>
                  )}
                  {result === "tie" && tieCount >= 5 && (
                    <Button onClick={handleNextAction}>
                      Continue →
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match context */}
      <Card title="Match Context">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-white/45">
              Round
            </div>
            <div className="mt-2 text-2xl font-bold">{round}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-white/45">
              Players Left
            </div>
            <div className="mt-2 text-2xl font-bold">247</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-white/45">
              Broadcast At
            </div>
            <div className="mt-2 text-2xl font-bold text-cyan-200">16</div>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
