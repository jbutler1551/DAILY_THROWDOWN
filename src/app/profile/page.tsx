"use client";

import {
  PageShell,
  Card,
  Pill,
  StatBox,
} from "@/components/ui";

export default function ProfilePage() {
  return (
    <PageShell nav="profile">
      {/* Profile header */}
      <header className="rounded-[2rem] border border-fuchsia-400/20 bg-black/20 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Avatar */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 text-4xl font-black text-white shadow-[0_0_30px_rgba(232,121,249,0.25)]">
            D
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">David</h1>
              <Pill color="green">15-Day Streak</Pill>
              <Pill color="cyan">Round 3 Bye</Pill>
            </div>
            <p className="text-sm text-white/60">
              Member since April 2026 · Chicago, IL
            </p>

            {/* Streak progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Streak Progress</span>
                <span>15 / 15 days (max tier)</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>0</span>
                <span className="text-emerald-300/60">5 — R2 Bye</span>
                <span className="text-cyan-300/60">15 — R3 Bye</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tournament Stats">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatBox label="Tournaments Played" value="18" />
            <StatBox label="Current Streak" value="15 days" color="green" />
            <StatBox label="Best Streak" value="15 days" color="cyan" />
            <StatBox label="Championships" value="2" color="amber" />
            <StatBox label="Final Four" value="5" color="fuchsia" />
            <StatBox label="Total Earnings" value="$145" color="amber" />
          </div>
        </Card>

        <Card title="Move Tendencies">
          <div className="space-y-6">
            {/* Move distribution */}
            {[
              { move: "🪨 Rock", pct: 38, color: "bg-red-400" },
              { move: "📄 Paper", pct: 35, color: "bg-blue-400" },
              { move: "✂️ Scissors", pct: 27, color: "bg-amber-400" },
            ].map((item) => (
              <div key={item.move} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{item.move}</span>
                  <span className="font-bold">{item.pct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-sm text-white/50">Favorite Move</div>
              <div className="mt-1 text-lg font-bold">🪨 Rock</div>
              <div className="mt-1 text-xs text-white/40">
                &quot;Suspiciously fond of rock&quot; — The Host
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Match history */}
      <Card title="Recent Tournaments" subtitle="Last 7 days">
        <div className="space-y-3">
          {[
            {
              date: "Apr 8",
              result: "🥇 Champion",
              rounds: 12,
              prize: "$55",
              color: "border-amber-400/25 bg-amber-400/8",
              textColor: "text-amber-200",
            },
            {
              date: "Apr 7",
              result: "🏅 Semifinalist",
              rounds: 10,
              prize: "$10",
              color: "border-white/10 bg-white/[0.03]",
              textColor: "text-white/80",
            },
            {
              date: "Apr 6",
              result: "Eliminated R5",
              rounds: 5,
              prize: "—",
              color: "border-white/8 bg-white/[0.02]",
              textColor: "text-white/50",
            },
            {
              date: "Apr 5",
              result: "🥈 Runner-Up",
              rounds: 11,
              prize: "$25",
              color: "border-white/12 bg-white/[0.04]",
              textColor: "text-white",
            },
            {
              date: "Apr 4",
              result: "Eliminated R3",
              rounds: 3,
              prize: "—",
              color: "border-white/8 bg-white/[0.02]",
              textColor: "text-white/50",
            },
            {
              date: "Apr 3",
              result: "Eliminated R7",
              rounds: 7,
              prize: "—",
              color: "border-white/8 bg-white/[0.02]",
              textColor: "text-white/50",
            },
            {
              date: "Apr 2",
              result: "🥇 Champion",
              rounds: 12,
              prize: "$55",
              color: "border-amber-400/25 bg-amber-400/8",
              textColor: "text-amber-200",
            },
          ].map((entry) => (
            <div
              key={entry.date}
              className={`flex items-center justify-between rounded-2xl border p-4 ${entry.color}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/40">{entry.date}</span>
                <span className={`font-bold ${entry.textColor}`}>
                  {entry.result}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/40">{entry.rounds} rounds</span>
                <span className={`font-bold ${entry.prize !== "—" ? "text-amber-200" : "text-white/30"}`}>
                  {entry.prize}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Achievements */}
      <Card title="Achievements" subtitle="Earned badges">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { emoji: "👑", title: "Champion", desc: "Won a daily tournament", earned: true },
            { emoji: "🔥", title: "On Fire", desc: "15-day participation streak", earned: true },
            { emoji: "🪨", title: "Rock Solid", desc: "Won 10 matches with rock", earned: true },
            { emoji: "🤝", title: "Stubborn", desc: "Triggered a 5-tie dual advance", earned: true },
            { emoji: "🏠", title: "House Hunter", desc: "Beat The House 5 times", earned: false },
            { emoji: "✂️", title: "Scissorhands", desc: "Won 10 matches with scissors", earned: false },
            { emoji: "📄", title: "Paper Trail", desc: "Won 10 matches with paper", earned: true },
            { emoji: "🏆", title: "Dynasty", desc: "Win 5 championships", earned: false },
            { emoji: "👀", title: "Spectator", desc: "Watch 10 broadcast modes", earned: true },
          ].map((badge) => (
            <div
              key={badge.title}
              className={`rounded-2xl border p-4 text-center ${
                badge.earned
                  ? "border-fuchsia-400/20 bg-fuchsia-400/8"
                  : "border-white/8 bg-white/[0.02] opacity-40"
              }`}
            >
              <div className="text-3xl">{badge.emoji}</div>
              <div className="mt-2 text-sm font-bold">{badge.title}</div>
              <div className="mt-1 text-xs text-white/50">{badge.desc}</div>
              {!badge.earned && (
                <div className="mt-2">
                  <Pill>Locked</Pill>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
