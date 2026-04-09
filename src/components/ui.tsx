"use client";

import React from "react";

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

// ---- Pill / badge ----
export function Pill({
  children,
  color = "default",
}: {
  children: React.ReactNode;
  color?: "default" | "green" | "cyan" | "amber" | "red" | "fuchsia";
}) {
  const colors: Record<string, string> = {
    default: "border-white/15 bg-white/8 text-white/75",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-200",
    red: "border-red-400/20 bg-red-400/10 text-red-200",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${colors[color]}`}
    >
      {children}
    </span>
  );
}

// ---- Card ----
export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur ${className}`}
    >
      {title && (
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

// ---- Host Line ----
export function HostLine({
  children,
  slot,
}: {
  children: React.ReactNode;
  slot?: string;
}) {
  return (
    <div className="rounded-2xl border border-fuchsia-300/15 bg-gradient-to-r from-fuchsia-500/10 via-violet-400/8 to-cyan-400/8 px-5 py-4">
      {slot && (
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100/50">
          {slot}
        </div>
      )}
      <p className="text-base font-medium leading-7 text-white/90">&ldquo;{children}&rdquo;</p>
    </div>
  );
}

// ---- Stat box ----
export function StatBox({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string | number;
  color?: "default" | "green" | "amber" | "fuchsia" | "cyan";
}) {
  const valueColors: Record<string, string> = {
    default: "text-white",
    green: "text-emerald-200",
    amber: "text-amber-200",
    fuchsia: "text-fuchsia-200",
    cyan: "text-cyan-200",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${valueColors[color]}`}>{value}</div>
    </div>
  );
}

// ---- Big button ----
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-fuchsia-400 text-slate-950 hover:bg-fuchsia-300 font-bold",
    secondary:
      "border border-white/15 bg-white/5 text-white hover:bg-white/10 font-semibold",
    danger:
      "bg-red-500 text-white hover:bg-red-400 font-bold",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-6 py-3 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---- Move button (rock/paper/scissors) ----
const moveEmojis = { rock: "🪨", paper: "📄", scissors: "✂️" };
const moveLabels = { rock: "Rock", paper: "Paper", scissors: "Scissors" };

export function MoveButton({
  move,
  selected,
  locked,
  onClick,
}: {
  move: "rock" | "paper" | "scissors";
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`flex flex-col items-center justify-center gap-2 rounded-3xl border-2 p-6 text-center transition-all duration-200 ${
        selected
          ? "border-fuchsia-400 bg-fuchsia-400/15 scale-105 shadow-[0_0_30px_rgba(232,121,249,0.2)]"
          : "border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/8"
      } ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span className="text-5xl">{moveEmojis[move]}</span>
      <span className="text-sm font-bold uppercase tracking-wider">{moveLabels[move]}</span>
    </button>
  );
}

// ---- Countdown timer display ----
export function Countdown({
  label,
  value,
  size = "md",
}: {
  label: string;
  value: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  return (
    <div className="text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className={`mt-1 font-black ${sizes[size]}`}>{value}</div>
    </div>
  );
}

// ---- Player card ----
export function PlayerCard({
  name,
  subtitle,
  streakDays,
  side,
}: {
  name: string;
  subtitle?: string;
  streakDays?: number;
  side?: "left" | "right";
}) {
  const alignment = side === "right" ? "text-right items-end" : "text-left items-start";

  return (
    <div className={`flex flex-col gap-1 ${alignment}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 text-xl font-black text-white">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{name}</div>
      {subtitle && <div className="text-sm text-white/50">{subtitle}</div>}
      {streakDays !== undefined && streakDays > 0 && (
        <Pill color="green">{streakDays}-day streak</Pill>
      )}
    </div>
  );
}

// ---- VS divider ----
export function VsDivider({ score }: { score?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="text-3xl font-black text-fuchsia-300">VS</div>
      {score && (
        <>
          <div className="text-xs uppercase tracking-[0.2em] text-white/40">Series</div>
          <div className="text-xl font-bold text-white">{score}</div>
        </>
      )}
    </div>
  );
}

// ---- Nav bar ----
export function NavBar({ active }: { active: string }) {
  const links = [
    { href: "/", label: "Home", key: "home" },
    { href: "/lobby", label: "Lobby", key: "lobby" },
    { href: "/match", label: "Match", key: "match" },
    { href: "/broadcast", label: "Broadcast", key: "broadcast" },
    { href: "/results", label: "Results", key: "results" },
    { href: "/profile", label: "Profile", key: "profile" },
  ];

  return (
    <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            active === link.key
              ? "bg-fuchsia-400/15 text-fuchsia-200"
              : "text-white/60 hover:bg-white/8 hover:text-white"
          }`}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

// ---- Page shell ----
export function PageShell({
  children,
  nav,
}: {
  children: React.ReactNode;
  nav: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2d145d_0%,#140a2a_40%,#090511_100%)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:px-10">
        <div className="flex items-center justify-between">
          <a href="/" className="text-xl font-black tracking-tight">
            🎲 <span className="text-fuchsia-300">Daily Throwdown</span>
          </a>
          <NavBar active={nav} />
        </div>
        {children}
      </div>
    </main>
  );
}
