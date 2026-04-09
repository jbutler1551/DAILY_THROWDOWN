/**
 * Tournament state machine.
 * Determines the current phase based on tournament DB status + time.
 * Drives which UI states are shown across screens.
 */

export type TournamentState =
  | "no-tournament"   // No tournament row exists for today
  | "registration"    // Tournament exists, status=scheduled, before starting-soon window
  | "starting-soon"   // Within 15 minutes of scheduled_at
  | "live"            // Tournament status=live
  | "completed";      // Tournament status=completed

export type TournamentInfo = {
  id: string;
  tournament_date: string;
  scheduled_at: string;
  status: string;
};

/**
 * Derive the client-side tournament state from DB data + current time.
 */
export function getTournamentState(
  tournament: TournamentInfo | null,
  now: Date = new Date()
): TournamentState {
  if (!tournament) return "no-tournament";

  if (tournament.status === "completed") return "completed";
  if (tournament.status === "cancelled") return "no-tournament";
  if (tournament.status === "live") return "live";

  // status === 'scheduled'
  const scheduledAt = new Date(tournament.scheduled_at);
  const msUntilStart = scheduledAt.getTime() - now.getTime();
  const fifteenMinutes = 15 * 60 * 1000;

  if (msUntilStart <= 0) {
    // Past scheduled time but still 'scheduled' — server hasn't flipped to live yet
    // Treat as starting-soon (tournament will go live momentarily)
    return "starting-soon";
  }

  if (msUntilStart <= fifteenMinutes) {
    return "starting-soon";
  }

  return "registration";
}

/**
 * Calculate milliseconds until the tournament starts.
 * Returns 0 if already past scheduled time.
 */
export function getMsUntilStart(
  tournament: TournamentInfo | null,
  now: Date = new Date()
): number {
  if (!tournament) return 0;
  const scheduledAt = new Date(tournament.scheduled_at);
  return Math.max(0, scheduledAt.getTime() - now.getTime());
}

/**
 * Format milliseconds as HH:MM:SS countdown string.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
