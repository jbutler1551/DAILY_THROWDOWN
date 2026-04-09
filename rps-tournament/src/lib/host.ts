// ---------------------------------------------------------------------------
// Host commentary library — short, punchy, context-aware lines
// ---------------------------------------------------------------------------

import type { HostSlot, Move } from "./types";

const lines: Record<HostSlot, string[]> = {
  "pre-show": [
    "The arena opens. Judgment is about to begin.",
    "Welcome back. Today's chaos starts in a few minutes.",
    "Another day, another tournament. Let's see who has the nerve.",
    "The field is filling. Confidence is high. Accuracy is unknown.",
    "Register now. Regret later.",
  ],
  "match-intro": [
    "Two enter. One leaves smug.",
    "This should be quick. Or deeply embarrassing.",
    "Moves will be chosen. Mistakes will be made.",
    "The matchup is set. The tension is mostly imagined.",
    "Let's see what overconfidence looks like today.",
  ],
  "pre-reveal": [
    "Moves are locked. Lies are over.",
    "And now we discover who thought too hard.",
    "No turning back. History is about to become very stupid.",
    "Both locked in. One of them is already wrong.",
    "The moment of truth. Or at least the moment of rock.",
  ],
  "reveal": [
    "Paper beats rock. Clinical. Brutal. Bureaucratic.",
    "Scissors cuts paper. Surgical.",
    "Rock crushes scissors. Subtlety has left the building.",
    "Clean win. No ambiguity. No appeal.",
    "And that's that. Next.",
  ],
  "tie": [
    "A tie. Mutual cowardice or mutual genius.",
    "Same move. Same brain. Disturbing.",
    "Deadlock. Run it back.",
    "Again. These two refuse resolution.",
    "Neither wins. Both lose time.",
  ],
  "five-tie": [
    "Five straight ties. These two refuse the laws of elimination. Fine. Both advance.",
    "Five ties. The app respects stubbornness. Both go through.",
    "Unprecedented. Unbreakable. Unexplainable. Both advance.",
    "The universe has spoken. Neither of you loses today.",
    "Five consecutive ties. At this point, separating you would be cruel.",
  ],
  "advance": [
    "You survive. Barely counts as an achievement, but here we are.",
    "Through to the next round. Try not to celebrate too loudly.",
    "Advanced. The gauntlet continues.",
    "Still standing. That's more than most can say.",
    "Onward. The tournament doesn't wait for feelings.",
  ],
  "elimination": [
    "And that's the end. Brief, but memorable.",
    "Eliminated. The arena sends its condolences.",
    "Better luck tomorrow. Seriously.",
    "Gone. Reduced to a statistic.",
    "That's a wrap on your campaign. The host will remember you. Briefly.",
  ],
  "broadcast-intro": [
    "We're down to 16. Now it becomes a show.",
    "Broadcast mode is live. Everyone's watching.",
    "The field has thinned. The spotlight is on.",
    "16 remain. This is where it gets personal.",
    "Welcome to the part that matters.",
  ],
  "final-four-intro": [
    "Four remain. All get paid. Only one gets remembered.",
    "The final four. Every throw counts double now.",
    "We're in the endgame. Best of three. No mercy.",
    "Four players. Two semifinals. One will become legend. Three will become footnotes.",
    "The final four have arrived. The rest of you: watch and learn.",
  ],
  "championship-intro": [
    "One match left. One title. One last chance to look foolish in public.",
    "The final. Everything before this was prologue.",
    "Two players. Best of three. Winner takes the crown.",
    "This is it. The whole tournament comes down to this.",
    "Championship match. Deep breaths. Bigger throws.",
  ],
  "champion-crowned": [
    "A champion emerges. History is written.",
    "And there it is. Today's champion has been decided.",
    "Crown awarded. Ego permanently inflated.",
    "The tournament is over. One walks away a champion. Everyone else walks away humbled.",
    "Today's winner stands alone. Tomorrow, the chaos begins again.",
  ],
  "house-match": [
    "The House steps in. Mercy not guaranteed.",
    "You face The House today. It has no feelings and no strategy. Good luck.",
    "House Match. The app picks randomly. You pick desperately.",
    "Odd player out? You get The House. No hard feelings.",
    "The House doesn't care. The House just throws.",
  ],
  "streak-bye": [
    "Streak reward active. You skip the opening bloodbath.",
    "Your dedication is noted. Enjoy the bye.",
    "While others fight for survival, you wait. Earned, not given.",
    "Streak bye engaged. Watch the chaos from above.",
    "You've been here every day. The tournament respects consistency.",
  ],
  "between-rounds": [
    "Round complete. The herd thins.",
    "Survivors advance. Losers spectate.",
    "Next round incoming. Prepare accordingly.",
    "The bracket tightens. The pressure mounts.",
    "Another round done. Another wave of regret.",
  ],
};

// Move-specific reveal lines
const moveRevealLines: Record<string, string[]> = {
  "rock-scissors": [
    "Rock crushes scissors. Subtlety has left the building.",
    "Rock. Blunt. Effective. Merciless.",
    "Scissors never stood a chance against that kind of force.",
  ],
  "scissors-paper": [
    "Scissors cuts paper. Surgical.",
    "Paper falls to scissors. A clean execution.",
    "Snip. Paper shredded. Moving on.",
  ],
  "paper-rock": [
    "Paper beats rock. Clinical. Brutal. Bureaucratic.",
    "Paper wraps rock. Quiet dominance.",
    "Rock gets smothered. Paper wins the bureaucratic war.",
  ],
};

// Player-specific taunts based on habits
const habitLines = {
  rockHeavy: [
    "Another rock? At this point it's a personality trait.",
    "Rock again. We get it. You're forceful.",
    "The rock dependency continues.",
  ],
  paperHeavy: [
    "Paper. Again. Are you filling out forms?",
    "Paper loyalist spotted.",
    "Paperwork filed. Literally.",
  ],
  scissorsHeavy: [
    "Scissors again? That's not strategy. That's a cry for help.",
    "More scissors. Fascinating. Predictable, but fascinating.",
    "The scissor obsession deepens.",
  ],
  onStreak: [
    "That's {count} wins straight. We may have to investigate.",
    "Streak continues. At this point it's either skill or statistical crime.",
    "Another win. The streak grows. The legend builds.",
  ],
  streakBroken: [
    "The streak ends. Reality returns.",
    "And just like that, the run is over.",
    "Streak broken. The tyrant falls.",
  ],
};

/**
 * Get a random host line for a given slot
 */
export function getHostLine(slot: HostSlot): string {
  const pool = lines[slot];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get a move-specific reveal line
 */
export function getMoveRevealLine(winnerMove: Move, loserMove: Move): string {
  const key = `${winnerMove}-${loserMove}`;
  const pool = moveRevealLines[key];
  if (!pool) return getHostLine("reveal");
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get a habit-based taunt
 */
export function getHabitLine(
  type: keyof typeof habitLines,
  vars?: Record<string, string | number>
): string {
  const pool = habitLines[type];
  let line = pool[Math.floor(Math.random() * pool.length)];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      line = line.replace(`{${k}}`, String(v));
    }
  }
  return line;
}

/**
 * Get a player-intro line for match intros
 */
export function getPlayerIntro(username: string, streakDays: number, favoriteMove?: Move): string {
  const parts: string[] = [];
  parts.push(username);

  if (streakDays >= 15) {
    parts.push(`— ${streakDays}-day streak, veteran status`);
  } else if (streakDays >= 5) {
    parts.push(`— ${streakDays}-day streak, earned the shortcut`);
  }

  if (favoriteMove) {
    const moveQuips: Record<Move, string> = {
      rock: "suspiciously fond of rock",
      paper: "a known paper enthusiast",
      scissors: "scissors loyalist",
    };
    parts.push(moveQuips[favoriteMove]);
  }

  return parts.join(", ");
}
