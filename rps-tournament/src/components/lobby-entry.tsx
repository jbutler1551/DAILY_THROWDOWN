"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

type LobbyState =
  | { kind: "missing-env" }
  | { kind: "signed-out" }
  | { kind: "ready"; userId: string; email: string | null }
  | { kind: "joining" }
  | { kind: "joined"; byeRound: number | null; streak: number }
  | { kind: "error"; message: string };

export function LobbyEntry() {
  const enabled = useMemo(() => hasSupabaseEnv(), []);
  const [state, setState] = useState<LobbyState>(enabled ? { kind: "signed-out" } : { kind: "missing-env" });

  useEffect(() => {
    if (!enabled) return;

    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setState({ kind: "signed-out" });
        return;
      }

      setState({ kind: "ready", userId: data.user.id, email: data.user.email ?? null });
    });
  }, [enabled]);

  async function handleJoin() {
    if (state.kind !== "ready") return;

    setState({ kind: "joining" });

    try {
      const response = await fetch("/api/join", {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok) {
        setState({ kind: "error", message: payload.error || "Could not join tournament." });
        return;
      }

      setState({ kind: "joined", byeRound: payload.entry.bye_round, streak: payload.entry.streak_at_entry });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Could not join tournament." });
    }
  }

  if (state.kind === "missing-env") {
    return (
      <Card>
        <Pill color="amber">Backend not connected</Pill>
        <p className="mt-3 text-sm text-slate-300">Add Supabase env vars first, then lobby entry can become real.</p>
      </Card>
    );
  }

  if (state.kind === "signed-out") {
    return (
      <Card>
        <Pill color="fuchsia">Sign in first</Pill>
        <p className="mt-3 text-sm text-slate-300">Use the magic link on the home page first. Then come back here and join the real tournament.</p>
      </Card>
    );
  }

  if (state.kind === "joining") {
    return (
      <Card>
        <Pill color="cyan">Joining…</Pill>
        <p className="mt-3 text-sm text-slate-300">Throwing your name into today&apos;s chaos.</p>
      </Card>
    );
  }

  if (state.kind === "joined") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <Pill color="green">You&apos;re in</Pill>
        <h3 className="mt-3 text-xl font-semibold text-white">Registered for today&apos;s tournament.</h3>
        <p className="mt-2 text-sm text-slate-200">
          Current streak: <strong>{state.streak}</strong>
          {" · "}
          {state.byeRound ? <>Bye locked for Round {state.byeRound}</> : <>No bye yet — earn one with your streak.</>}
        </p>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="border-rose-500/30 bg-rose-500/10">
        <Pill color="red">Join failed</Pill>
        <p className="mt-3 text-sm text-slate-200">{state.message}</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Pill color="cyan">Live entry</Pill>
          <h3 className="mt-3 text-xl font-semibold text-white">You can join the real tournament now.</h3>
          <p className="mt-2 text-sm text-slate-300">This writes a real entry row in Supabase for today&apos;s tournament.</p>
        </div>
        <Button onClick={handleJoin}>Join today&apos;s tournament</Button>
      </div>
    </Card>
  );
}
