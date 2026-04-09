"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

type SessionState = "loading" | "missing-env" | "signed-out" | "signed-in";

export function AuthGate() {
  const enabled = useMemo(() => hasSupabaseEnv(), []);
  const [sessionState, setSessionState] = useState<SessionState>(enabled ? "loading" : "missing-env");
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      setSessionState(data.session ? "signed-in" : "signed-out");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionState(session ? "signed-in" : "signed-out");
    });

    return () => subscription.unsubscribe();
  }, [enabled]);

  async function handleMagicLink() {
    setSending(true);
    setStatusMessage("Sending magic link…");

    try {
      const supabase = createSupabaseBrowserClient();
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Request timed out. Supabase auth may be hanging or blocked.")), 12000);
      });

      const authRequest = supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      const { error } = await Promise.race([authRequest, timeout]);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("Magic link sent. Check your email.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not send magic link.");
    } finally {
      setSending(false);
    }
  }

  if (sessionState === "signed-in") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Pill color="green">Auth connected</Pill>
            <h3 className="mt-3 text-xl font-semibold text-white">Supabase is wired up.</h3>
            <p className="mt-2 text-sm text-slate-300">
              Next step: connect tournament entry, streak storage, and live match data to the database.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (sessionState === "missing-env") {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <Pill>Backend setup</Pill>
          <h3 className="text-xl font-semibold text-white">Supabase is ready to plug in.</h3>
          <p className="text-sm text-slate-300">
            Add <code className="text-fuchsia-300">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-fuchsia-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to a local <code className="text-fuchsia-300">.env.local</code> file.
          </p>
          <p className="text-sm text-slate-400">
            Once those exist, this panel can handle sign-in and the app can start talking to the real database.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div>
          <Pill color="fuchsia">Phase 1</Pill>
          <h3 className="mt-3 text-xl font-semibold text-white">Turn the prototype into a real product.</h3>
          <p className="mt-2 text-sm text-slate-300">
            Sign in with a magic link once Supabase auth is configured. That will give us real users, real streaks, and real tournament entries.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400"
          />
          <Button onClick={handleMagicLink} disabled={!email || sending}>
            {sending ? "Sending…" : "Send magic link"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <Pill color={enabled ? "green" : "amber"}>{enabled ? "Supabase connected" : "Missing env"}</Pill>
          <span>Redirect target: {typeof window === "undefined" ? "browser only" : window.location.origin}</span>
        </div>

        {statusMessage ? <p className="text-sm text-slate-300">{statusMessage}</p> : null}
      </div>
    </Card>
  );
}
