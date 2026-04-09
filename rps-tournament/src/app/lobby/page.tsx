"use client";

import { useState } from "react";
import {
  PageShell,
  Card,
  HostLine,
  StatBox,
  Button,
  Pill,
} from "@/components/ui";
import { LobbyEntry } from "@/components/lobby-entry";
import { getHostLine } from "@/lib/host";

export default function LobbyPage() {
  const [joined, setJoined] = useState(false);

  const hostLine = joined
    ? "You're locked in. Pride now involved."
    : getHostLine("pre-show");

  return (
    <PageShell nav="lobby">
      {/* Status header */}
      <header className="rounded-[2rem] border border-fuchsia-400/20 bg-black/20 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Pill color={joined ? "green" : "fuchsia"}>
                  {joined ? "Registered" : "Registration Open"}
                </Pill>
                <Pill>Round 3 Bye Active</Pill>
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {joined
                  ? "You're In. Tournament Starts Soon."
                  : "Today's Tournament"}
              </h1>
              <p className="max-w-xl text-base leading-7 text-white/70">
                {joined
                  ? "Your 15-day streak grants a Round 3 bye. You'll enter after round 2 completes. Watch the early rounds while you wait."
                  : "Registration is open. Join now to lock in your spot. Once the clock hits 2:00 PM CT, the bracket locks and chaos begins."}
              </p>
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/12 bg-white/[0.05] p-5 text-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                  Starts In
                </div>
                <div className="mt-1 text-4xl font-black text-fuchsia-200">
                  12:34
                </div>
              </div>
              <div className="text-xs text-white/50">2:00 PM Central Time</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <StatBox label="Entrants" value="3,127" />
            <StatBox label="Prize Pool" value="$100" color="amber" />
            <StatBox label="Your Streak" value="15 days" color="green" />
            <StatBox label="Your Entry" value="Round 3" color="cyan" />
          </div>

          {/* Host + CTA */}
          <HostLine slot="Host">{hostLine}</HostLine>

          {!joined && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setJoined(true)}>
                Join Today&apos;s Tournament
              </Button>
              <Button variant="secondary">View Rules</Button>
            </div>
          )}

          {joined && (
            <div className="flex flex-wrap items-center gap-4">
              <Pill color="green">✓ Entry Confirmed</Pill>
              <span className="text-sm text-white/50">
                Waiting for tournament to begin…
              </span>
            </div>
          )}
        </div>
      </header>

      <LobbyEntry />

      {/* Waiting room content */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Your Entry Details">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-sm text-white/60">Streak</span>
              <span className="font-bold text-emerald-200">15 days</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-sm text-white/60">Benefit</span>
              <span className="font-bold text-cyan-200">Round 3 Bye</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-sm text-white/60">You Skip</span>
              <span className="font-bold">Rounds 1 &amp; 2</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-sm text-white/60">Entry Fee</span>
              <span className="font-bold text-emerald-200">Free</span>
            </div>
          </div>
        </Card>

        <Card title="Prize Structure">
          <div className="space-y-4">
            {[
              { place: "🥇 Champion", prize: "$55", color: "text-amber-200" },
              { place: "🥈 Runner-Up", prize: "$25", color: "text-white" },
              { place: "🏅 3rd Place", prize: "$10", color: "text-white/80" },
              { place: "🏅 4th Place", prize: "$10", color: "text-white/80" },
            ].map((item) => (
              <div
                key={item.place}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <span className="text-sm">{item.place}</span>
                <span className={`text-xl font-bold ${item.color}`}>
                  {item.prize}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Recent activity */}
      <Card title="Live Feed" subtitle="What's happening in the lobby">
        <div className="space-y-3">
          {[
            { time: "Just now", text: "Sofia joined the tournament (8-day streak)" },
            { time: "1 min ago", text: "Marcus returned for his 22nd consecutive day" },
            { time: "2 min ago", text: "Yesterday's champion Emily Chen is back" },
            { time: "3 min ago", text: "Tournament prize pool confirmed: $100" },
            { time: "5 min ago", text: "Registration opened" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-start gap-3 rounded-xl border border-white/8 bg-slate-950/30 px-4 py-3 text-sm"
            >
              <span className="shrink-0 text-white/40">{item.time}</span>
              <span className="text-white/75">{item.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
