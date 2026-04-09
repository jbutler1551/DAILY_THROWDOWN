"use client";

import {
  PageShell,
  Card,
  HostLine,
  PlayerCard,
  VsDivider,
  Pill,
  Button,
} from "@/components/ui";
import { getHostLine } from "@/lib/host";

interface BracketMatch {
  id: string;
  round: string;
  playerA: string;
  playerB: string;
  result?: string;
  winner?: "a" | "b";
  status: "upcoming" | "live" | "complete";
  series?: string;
  isHouseMatch?: boolean;
  isBestOf3?: boolean;
}

const bracketMatches: BracketMatch[] = [
  // Round of 16
  { id: "r16-1", round: "Round of 16", playerA: "David", playerB: "Tyler", result: "🪨 vs ✂️", winner: "a", status: "complete" },
  { id: "r16-2", round: "Round of 16", playerA: "Emily", playerB: "Carlos", result: "📄 vs 🪨", winner: "a", status: "complete" },
  { id: "r16-3", round: "Round of 16", playerA: "Marcus", playerB: "Aria", result: "✂️ vs 📄", winner: "a", status: "complete" },
  { id: "r16-4", round: "Round of 16", playerA: "Sofia", playerB: "Jake", result: "📄 vs 📄 → 🪨 vs ✂️", winner: "a", status: "complete" },
  { id: "r16-5", round: "Round of 16", playerA: "Mia", playerB: "Ethan", result: "🪨 vs 📄", winner: "b", status: "complete" },
  { id: "r16-6", round: "Round of 16", playerA: "Luna", playerB: "Nina", result: "✂️ vs 🪨", winner: "b", status: "complete" },
  { id: "r16-7", round: "Round of 16", playerA: "Alex", playerB: "Zara", result: "📄 vs ✂️", winner: "b", status: "complete" },
  { id: "r16-8", round: "Round of 16", playerA: "Ryan", playerB: "Ivy", result: "🪨 vs ✂️", winner: "a", status: "complete" },

  // Elite 8
  { id: "e8-1", round: "Elite 8", playerA: "David", playerB: "Emily", result: "✂️ vs 📄", winner: "a", status: "complete" },
  { id: "e8-2", round: "Elite 8", playerA: "Marcus", playerB: "Sofia", result: "🪨 vs ✂️", winner: "a", status: "complete" },
  { id: "e8-3", round: "Elite 8", playerA: "Ethan", playerB: "Nina", status: "live", series: "1–0" },
  { id: "e8-4", round: "Elite 8", playerA: "Zara", playerB: "Ryan", status: "upcoming" },

  // Final 4 (upcoming)
  { id: "f4-1", round: "Final Four", playerA: "David", playerB: "Marcus", status: "upcoming", isBestOf3: true },
  { id: "f4-2", round: "Final Four", playerA: "TBD", playerB: "TBD", status: "upcoming", isBestOf3: true },

  // Final
  { id: "final", round: "Championship", playerA: "TBD", playerB: "TBD", status: "upcoming", isBestOf3: true },
];

function MatchCard({ match }: { match: BracketMatch }) {
  const statusColors = {
    upcoming: "border-white/10 bg-white/[0.03]",
    live: "border-cyan-400/30 bg-cyan-400/8 shadow-[0_0_20px_rgba(34,211,238,0.08)]",
    complete: "border-white/8 bg-white/[0.02]",
  };

  return (
    <div className={`rounded-2xl border p-4 ${statusColors[match.status]}`}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em]">
        <span className={match.status === "live" ? "text-cyan-300" : "text-white/40"}>
          {match.round}
        </span>
        <span className={
          match.status === "live"
            ? "text-cyan-300"
            : match.status === "complete"
            ? "text-emerald-300/60"
            : "text-white/30"
        }>
          {match.status === "live" ? "● LIVE" : match.status === "complete" ? "✓ Complete" : "Upcoming"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className={`text-sm font-bold ${match.winner === "a" ? "text-white" : match.winner === "b" ? "text-white/40 line-through" : "text-white/80"}`}>
          {match.playerA}
        </div>
        <div className="text-center">
          {match.result && (
            <div className="text-xs text-white/50">{match.result}</div>
          )}
          {match.series && (
            <div className="text-sm font-bold text-cyan-200">{match.series}</div>
          )}
          {!match.result && !match.series && (
            <div className="text-xs text-white/30">vs</div>
          )}
        </div>
        <div className={`text-right text-sm font-bold ${match.winner === "b" ? "text-white" : match.winner === "a" ? "text-white/40 line-through" : "text-white/80"}`}>
          {match.playerB}
        </div>
      </div>

      {match.isBestOf3 && (
        <div className="mt-2 text-center">
          <Pill color="cyan">Best of 3</Pill>
        </div>
      )}
    </div>
  );
}

export default function BroadcastPage() {
  const liveMatch = bracketMatches.find((m) => m.status === "live");

  return (
    <PageShell nav="broadcast">
      {/* Broadcast header */}
      <header className="rounded-[2rem] border border-cyan-400/20 bg-black/20 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Pill color="cyan">Broadcast Mode</Pill>
              <Pill>12 Players Remaining</Pill>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              The Tournament Is Live
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/70">
              Broadcast mode is active. Everyone can watch. The host is paying attention.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/50">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            1,847 watching
          </div>
        </div>
      </header>

      {/* Featured live match */}
      {liveMatch && (
        <div className="rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-900/15 via-black/20 to-fuchsia-900/10 p-6 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <Pill color="cyan">● Featured Match — LIVE</Pill>
            <span className="text-sm font-semibold text-cyan-200">
              {liveMatch.round}
            </span>
          </div>

          <div className="flex items-center justify-between gap-6">
            <PlayerCard
              name={liveMatch.playerA}
              subtitle="12-day streak, rock loyalist"
              streakDays={12}
              side="left"
            />
            <VsDivider score={liveMatch.series} />
            <PlayerCard
              name={liveMatch.playerB}
              subtitle="3-day streak, unpredictable"
              streakDays={3}
              side="right"
            />
          </div>

          <div className="mt-6">
            <HostLine slot="Live Commentary">
              {getHostLine("broadcast-intro")}
            </HostLine>
          </div>
        </div>
      )}

      {/* Bracket */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
        {/* Round of 16 */}
        <Card title="Round of 16" subtitle="8 matches — all complete">
          <div className="space-y-3">
            {bracketMatches
              .filter((m) => m.round === "Round of 16")
              .map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
          </div>
        </Card>

        {/* Elite 8 */}
        <Card title="Elite 8" subtitle="4 matches — 2 remaining">
          <div className="space-y-3">
            {bracketMatches
              .filter((m) => m.round === "Elite 8")
              .map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
          </div>
        </Card>

        {/* Final Four + Championship */}
        <div className="space-y-6">
          <Card title="Final Four" subtitle="Best of 3 — upcoming">
            <div className="space-y-3">
              {bracketMatches
                .filter((m) => m.round === "Final Four")
                .map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
            </div>
          </Card>

          <Card title="Championship" subtitle="Best of 3 — the final match">
            <div className="space-y-3">
              {bracketMatches
                .filter((m) => m.round === "Championship")
                .map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
            </div>
          </Card>

          {/* Prize reminder */}
          <Card>
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex justify-between">
                <span>🥇 Champion</span>
                <span className="font-bold text-amber-200">$55</span>
              </div>
              <div className="flex justify-between">
                <span>🥈 Runner-Up</span>
                <span className="font-bold text-white">$25</span>
              </div>
              <div className="flex justify-between">
                <span>🏅 Semifinalists</span>
                <span className="font-bold text-white/80">$10 each</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Host commentary feed */}
      <Card title="Host Commentary" subtitle="Recent lines from the broadcast">
        <div className="space-y-3">
          {[
            "David dispatches Tyler with rock. Classic. Boring. Effective.",
            "Emily wraps Carlos in paper. Bureaucratic domination continues.",
            "Sofia needed a replay against Jake. First throw: tie. Second: decisive.",
            "We're through the round of 16. The pretenders are gone.",
            "Ethan and Nina are locked in right now. This one has tension.",
          ].map((line, i) => (
            <div
              key={i}
              className="rounded-xl border border-fuchsia-300/10 bg-fuchsia-500/5 px-4 py-3 text-sm text-white/80"
            >
              &ldquo;{line}&rdquo;
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
