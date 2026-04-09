// Supabase Edge Function: send-push
// Sends push notifications via the Expo Push API.
//
// POST body: {
//   type: "tournament-warning" | "match-ready" | "tournament-complete",
//   tournamentId: string,
//   targetProfileIds?: string[]  // if omitted, sends to all entrants
// }
//
// Auth: requires service role key (called by pg_cron or admin)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default";
};

async function sendExpoPush(messages: PushMessage[]) {
  // Expo accepts batches of up to 100
  const batches: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  for (const batch of batches) {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(batch),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { type, tournamentId, targetProfileIds } = await req.json();

    if (!type || !tournamentId) {
      return new Response(
        JSON.stringify({ error: "type and tournamentId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which profiles to notify
    let profileIds: string[];

    if (targetProfileIds && targetProfileIds.length > 0) {
      profileIds = targetProfileIds;
    } else {
      // All entrants of this tournament
      const { data: entries } = await serviceClient
        .from("entries")
        .select("profile_id")
        .eq("tournament_id", tournamentId);

      profileIds = (entries ?? []).map((e) => e.profile_id);
    }

    if (profileIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch push tokens
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, push_token")
      .in("id", profileIds)
      .not("push_token", "is", null);

    const tokens = (profiles ?? [])
      .map((p) => p.push_token)
      .filter(Boolean) as string[];

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "no tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message based on type
    let title: string;
    let body: string;

    switch (type) {
      case "tournament-warning":
        title = "Tournament in 15 minutes!";
        body = "The Daily Throwdown starts soon. Make sure you're registered.";
        break;
      case "match-ready":
        title = "Your match is ready!";
        body = "Your opponent is waiting. Open the app to play your match.";
        break;
      case "tournament-complete":
        title = "Tournament Complete!";
        body = "Today's Daily Throwdown has a champion. Check the results!";
        break;
      default:
        title = "Daily Throwdown";
        body = "Something's happening in the tournament!";
    }

    const messages: PushMessage[] = tokens.map((token) => ({
      to: token,
      title,
      body,
      sound: "default",
      data: { tournamentId, type },
    }));

    await sendExpoPush(messages);

    return new Response(
      JSON.stringify({ ok: true, sent: messages.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
