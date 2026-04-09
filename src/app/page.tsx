"use client";

import {
  PageShell,
  Card,
  HostLine,
  StatBox,
  Button,
  Pill,
} from "@/components/ui";
import { AuthGate } from "@/components/auth-gate";
import { getHostLine } from "@/lib/host";

export default function Home() {
  const hostLine = getHostLine("pre-show");

  return (
    <PageShell nav="home">
      {/* Hero */}
      <header className="flex flex-col gap-6 rounded-[2rem] border border-fuchsia-400/20 bg-black/20 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Pill>Daily Throwdown</Pill>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Rock. Paper. Scissors.{" "}
              <span className="text-fuchsia-300">Turned into a show.</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              A daily elimination tournament with company-funded cash prizes,
              spectator finals, streak rewards, and a witty AI host who refuses
              to let anyone lose quietly.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/12 bg-white/[0.05] p-5 text-right">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                Tournament Start
              </div>
              <div className="mt-1 text-3xl font-black text-fuchsia-200">
                2:00 PM CT
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                Countdown
              </div>
              <div className="mt-1 text-3xl font-black">15:07</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <StatBox label="Entrants" value="2,841" />
          <StatBox label="Prize Pool" value="$100" color="amber" />
          <StatBox label="Your Streak" value="15 days" color="green" />
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">
              Reward Active
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-200">
              Round 3 Bye
            </div>
          </div>
        </div>

        {/* Host + CTA */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <HostLine slot="Host">{hostLine}</HostLine>
          <div className="flex flex-wrap gap-3">
            <a href="/lobby">
              <Button>Join Today&apos;s Tournament</Button>
            </a>
            <a href="/broadcast">
              <Button variant="secondary">Watch Broadcast</Button>
            </a>
          </div>
        </div>
      </header>

      <AuthGate />

      {/* Content grid */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card
          title="How It Works"
          subtitle="Daily format, daily chaos"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white/60">
                Yesterday&apos;s Winner
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-200">
                Emily &quot;Paper Tyrant&quot; Chen
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Recent champions are displayed here. Streaks. Upsets. Legends.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white/60">
                Streak Rewards
              </div>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li>• 5 straight days → Round 2 bye</li>
                <li>• 15 straight days → Round 3 bye</li>
                <li>• Miss a day → streak resets</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 md:col-span-2">
              <div className="text-sm font-semibold text-white/60">
                Prize Breakdown
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                <span>🥇 Champion: <strong className="text-amber-200">$55</strong></span>
                <span>🥈 Runner-Up: <strong className="text-white">$25</strong></span>
                <span>🏅 Semifinalists: <strong className="text-white/80">$10 each</strong></span>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Tournament Rules"
          subtitle="The full rule set"
        >
          <ul className="space-y-3 text-sm leading-6 text-white/80">
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
              <li
                key={rule}
                className="rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3"
              >
                {rule}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </PageShell>
  );
}
