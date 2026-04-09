"use client";

import {
  PageShell,
  Card,
  HostLine,
  Pill,
  StatBox,
  Button,
} from "@/components/ui";
import { getHostLine } from "@/lib/host";

export default function ResultsPage() {
  return (
    <PageShell nav="results">
      {/* Champion banner */}
      <header className="rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-900/15 via-black/20 to-fuchsia-900/10 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <Pill color="amber">Tournament Complete</Pill>

          <div className="text-6xl">👑</div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              David Wins!
            </h1>
            <p className="text-lg text-white/70">
              Today&apos;s Daily Throwdown Champion
            </p>
          </div>

          <HostLine slot="Host">
            {getHostLine("champion-crowned")}
          </HostLine>

          <div className="flex flex-wrap justify-center gap-3">
            <a href="/lobby">
              <Button>Join Tomorrow&apos;s Tournament</Button>
            </a>
            <a href="/">
              <Button variant="secondary">Back to Home</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Final standings */}
      <Card title="Final Standings" subtitle="Today's prize winners">
        <div className="space-y-4">
          {[
            {
              place: "🥇 Champion",
              name: "David",
              prize: "$55",
              stat: "15-day streak · 7 rounds survived",
              color: "border-amber-400/25 bg-amber-400/8",
              nameColor: "text-amber-200",
              prizeColor: "text-amber-200",
            },
            {
              place: "🥈 Runner-Up",
              name: "Marcus",
              prize: "$25",
              stat: "22-day streak · Lost in championship",
              color: "border-white/15 bg-white/[0.04]",
              nameColor: "text-white",
              prizeColor: "text-white",
            },
            {
              place: "🏅 Semifinalist",
              name: "Ethan",
              prize: "$10",
              stat: "5-day streak · Lost in semifinal",
              color: "border-white/10 bg-white/[0.03]",
              nameColor: "text-white/80",
              prizeColor: "text-white/80",
            },
            {
              place: "🏅 Semifinalist",
              name: "Zara",
              prize: "$10",
              stat: "11-day streak · Lost in semifinal",
              color: "border-white/10 bg-white/[0.03]",
              nameColor: "text-white/80",
              prizeColor: "text-white/80",
            },
          ].map((entry) => (
            <div
              key={entry.name}
              className={`flex items-center justify-between rounded-2xl border p-5 ${entry.color}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 text-lg font-black text-white">
                  {entry.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${entry.nameColor}`}>
                      {entry.name}
                    </span>
                    <span className="text-sm text-white/40">{entry.place}</span>
                  </div>
                  <div className="text-sm text-white/50">{entry.stat}</div>
                </div>
              </div>
              <div className={`text-2xl font-black ${entry.prizeColor}`}>
                {entry.prize}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tournament recap */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tournament Stats">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatBox label="Total Entrants" value="3,127" />
            <StatBox label="Total Rounds" value="12" />
            <StatBox label="Total Throws" value="4,891" />
            <StatBox label="House Matches" value="6" />
            <StatBox label="Tie Replays" value="847" color="amber" />
            <StatBox label="Dual Advances" value="2" color="fuchsia" />
          </div>
        </Card>

        <Card title="Championship Recap" subtitle="Best of 3 — David vs Marcus">
          <div className="space-y-4">
            {[
              {
                game: "Game 1",
                moves: "🪨 vs ✂️",
                result: "David wins",
                host: "Rock opens the series. Marcus already looks concerned.",
              },
              {
                game: "Game 2",
                moves: "📄 vs 📄 → ✂️ vs 🪨",
                result: "Marcus wins",
                host: "Marcus forces a tie then strikes back. Series tied.",
              },
              {
                game: "Game 3",
                moves: "📄 vs 🪨",
                result: "David wins",
                host: "Paper. The quiet weapon. David takes the crown.",
              },
            ].map((game) => (
              <div
                key={game.game}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/60">
                    {game.game}
                  </span>
                  <span className="text-sm text-white/50">{game.moves}</span>
                </div>
                <div className="mt-2 font-bold text-emerald-200">
                  {game.result}
                </div>
                <div className="mt-2 text-sm italic text-fuchsia-200/70">
                  &ldquo;{game.host}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Notable moments */}
      <Card title="Notable Moments" subtitle="Highlights from today's tournament">
        <div className="space-y-3">
          {[
            {
              moment: "🤝 Dual Advance",
              description:
                "Luna and Nina tied 5 consecutive times in Round 4. Both advanced. The host called it 'unprecedented stubbornness.'",
            },
            {
              moment: "🏠 House Upset",
              description:
                "Jake faced The House in Round 3 and lost. The app randomly chose scissors. Jake had paper. Wait — Jake won. Never mind.",
            },
            {
              moment: "🔥 Streak of the Day",
              description:
                "Marcus entered on a 22-day streak with a Round 3 bye and made it to the championship. Consistency pays.",
            },
            {
              moment: "⚡ Fastest Match",
              description:
                "David vs Tyler in Round of 16: rock vs scissors. One throw. Three seconds. Done.",
            },
            {
              moment: "😤 Most Replays",
              description:
                "Sofia and Jake tied 4 times before Sofia finally won with rock. The host ran out of patience.",
            },
          ].map((item) => (
            <div
              key={item.moment}
              className="rounded-2xl border border-white/8 bg-slate-950/30 p-4"
            >
              <div className="text-sm font-bold text-white">{item.moment}</div>
              <div className="mt-1 text-sm leading-6 text-white/65">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Next tournament */}
      <div className="rounded-[2rem] border border-fuchsia-400/15 bg-black/20 p-6 text-center backdrop-blur md:p-8">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Next Tournament
          </div>
          <div className="text-4xl font-black text-fuchsia-200">
            Tomorrow at 2:00 PM CT
          </div>
          <p className="text-sm text-white/50">
            Your streak continues if you show up. Don&apos;t break it now.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
