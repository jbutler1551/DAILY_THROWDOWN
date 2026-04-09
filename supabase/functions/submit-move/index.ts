// Supabase Edge Function: submit-move
// Handles move submission for a match. All resolution is server-side.
//
// POST body: { matchId: string, move: "rock" | "paper" | "scissors" }
// Auth: requires valid Supabase JWT (user must be a participant)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client (to verify JWT)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client (bypasses RLS for game resolution)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body
    const { matchId, move } = await req.json();

    if (!matchId || !move) {
      return new Response(
        JSON.stringify({ error: "matchId and move are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validMoves = ["rock", "paper", "scissors"];
    if (!validMoves.includes(move)) {
      return new Response(
        JSON.stringify({ error: "Invalid move. Must be rock, paper, or scissors." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch match
    const { data: match, error: matchError } = await serviceClient
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (match.status !== "live") {
      return new Response(
        JSON.stringify({ error: "Match is not live" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is a participant — look up their entry_id
    const { data: entry } = await serviceClient
      .from("entries")
      .select("id")
      .eq("tournament_id", match.tournament_id)
      .eq("profile_id", user.id)
      .single();

    if (!entry) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this match" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPlayerA = entry.id === match.player_a_entry_id;
    const isPlayerB = entry.id === match.player_b_entry_id;

    if (!isPlayerA && !isPlayerB) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this match" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine current game number
    const { count: gamesPlayed } = await serviceClient
      .from("match_games")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId);

    const currentGame = (gamesPlayed ?? 0) + 1;

    // Check for duplicate throw
    const { data: existingThrow } = await serviceClient
      .from("throws")
      .select("id")
      .eq("match_id", matchId)
      .eq("game_number", currentGame)
      .eq("entry_id", entry.id)
      .maybeSingle();

    if (existingThrow) {
      return new Response(
        JSON.stringify({ error: "You already submitted a move for this game" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert throw
    const { error: throwError } = await serviceClient
      .from("throws")
      .insert({
        match_id: matchId,
        game_number: currentGame,
        entry_id: entry.id,
        move,
      });

    if (throwError) {
      return new Response(
        JSON.stringify({ error: "Failed to submit move: " + throwError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if opponent has also submitted (or it's a house match)
    let opponentSubmitted = false;

    if (match.house_match) {
      // House match: house throw is pre-generated with entry_id = null
      const { data: houseThrow } = await serviceClient
        .from("throws")
        .select("id")
        .eq("match_id", matchId)
        .eq("game_number", currentGame)
        .is("entry_id", null)
        .maybeSingle();

      opponentSubmitted = !!houseThrow;

      // If no house throw for this game (subsequent games in best-of-3), generate one
      if (!opponentSubmitted) {
        const moves = ["rock", "paper", "scissors"];
        const houseMove = moves[Math.floor(Math.random() * 3)];
        await serviceClient.from("throws").insert({
          match_id: matchId,
          game_number: currentGame,
          entry_id: null,
          move: houseMove,
        });
        opponentSubmitted = true;
      }
    } else {
      // Check if opponent submitted
      const opponentEntryId = isPlayerA
        ? match.player_b_entry_id
        : match.player_a_entry_id;

      const { data: opponentThrow } = await serviceClient
        .from("throws")
        .select("id")
        .eq("match_id", matchId)
        .eq("game_number", currentGame)
        .eq("entry_id", opponentEntryId)
        .maybeSingle();

      opponentSubmitted = !!opponentThrow;
    }

    // If both submitted: resolve the game
    if (opponentSubmitted) {
      await serviceClient.rpc("resolve_game", {
        p_match_id: matchId,
        p_game_number: currentGame,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        gameNumber: currentGame,
        resolved: opponentSubmitted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
