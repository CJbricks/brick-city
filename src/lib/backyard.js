/**
 * backyard.js
 * Flatland backyard ultras: loop-by-loop until you stop or fail.
 *
 * Format (fictional, original names): 4.167-mile loops every hour.
 * You keep going until you choose to stop or fail a loop. Reward scales
 * with loops completed. Last one standing wins the premier yards.
 *
 * This is menu/dialogue-driven, not a walking map. Fatigue rises each
 * loop. Energy is spent up front for the event window (multi-hour).
 *
 * An old save has no backyard fields; loops default to 0 / false.
 */

import { levelFromXp } from "@/lib/xp";

/** Miles per backyard loop (classic backyard distance). */
export const BACKYARD_LOOP_MILES = 4.167;

/** Fatigue added each completed loop. */
export const BACKYARD_LOOP_FATIGUE = 6;

/** Nutrition lost each loop. */
export const BACKYARD_LOOP_NUTRITION = -5;

/** Peak / endurance nudges per loop (tiny). */
export const BACKYARD_LOOP_PEAK = 1;
export const BACKYARD_LOOP_ENDURANCE = 2;

/** Chance to fail a loop rises with fatigue (see loopFailChance). */
export const BACKYARD_FAIL_BASE = 0.04;
export const BACKYARD_FAIL_PER_FATIGUE = 0.0015;

/** Coins and XP per completed loop (before win bonus). */
export const BACKYARD_LOOP_COINS = 6;
export const BACKYARD_LOOP_XP = 8;

/** Extra coins when you are last one standing (premier only). */
export const BACKYARD_WIN_COINS = 40;
export const BACKYARD_WIN_XP = 40;

/**
 * How many loops the "field" lasts. Hitting this without failing makes
 * you last one standing. Practice yard is shorter.
 */
export const BACKYARD_EVENTS = {
  "backyard-practice": {
    id: "backyard-practice",
    name: "Flatland Practice Yard",
    premier: false,
    energy: 4,
    fieldLoops: 6,
    unlockLevel: 1,
    requires: null,
    blurb: "A short yard to learn the bell. Stop whenever you want.",
  },
  "bigs-backyard": {
    id: "bigs-backyard",
    name: "Big's Backyard",
    premier: true,
    energy: 6,
    fieldLoops: 12,
    unlockLevel: 18,
    requires: null,
    blurb: "The farm classic. 4.167 every hour. Last one standing.",
  },
  "bpn-go-one-more": {
    id: "bpn-go-one-more",
    name: "BPN Go One More",
    premier: true,
    energy: 7,
    fieldLoops: 16,
    unlockLevel: 22,
    requires: "bigs-backyard",
    blurb: "One more loop. Then maybe one more. Premier backyard.",
  },
  "storm-city-backyard": {
    id: "storm-city-backyard",
    name: "Storm City Backyard",
    premier: true,
    energy: 8,
    fieldLoops: 20,
    unlockLevel: 26,
    requires: "bpn-go-one-more",
    blurb: "Flatland's hardest yard. Wind, mud, and the bell.",
  },
};

export function backyardById(id) {
  return BACKYARD_EVENTS[id] || null;
}

export function backyardUnlockStatus(state, eventId) {
  const event = backyardById(eventId);
  if (!event) return { open: false, needs: [{ label: "Unknown event", ok: false, have: "—" }] };
  const level = levelFromXp(state?.xp?.overall || 0);
  const needs = [
    { label: `Reach level ${event.unlockLevel}`, ok: level >= event.unlockLevel, have: `Lv ${level}` },
  ];
  if (event.requires) {
    const flag = backyardFinishedFlag(event.requires);
    const done = Boolean(state?.progress?.[flag]);
    needs.push({
      label: `Finish ${backyardById(event.requires)?.name || event.requires}`,
      ok: done,
      have: done ? "done" : "not yet",
    });
  }
  return { open: needs.every((n) => n.ok), needs };
}

export function backyardFinishedFlag(eventId) {
  const map = {
    "backyard-practice": "backyardPracticeBest",
    "bigs-backyard": "bigsBackyardFinished",
    "bpn-go-one-more": "bpnGoOneMoreFinished",
    "storm-city-backyard": "stormCityBackyardFinished",
  };
  return map[eventId] || null;
}

export function loopFailChance(fatigue) {
  const f = typeof fatigue === "number" ? fatigue : 0;
  return Math.min(0.55, BACKYARD_FAIL_BASE + Math.max(0, f) * BACKYARD_FAIL_PER_FATIGUE);
}

/**
 * Active backyard session on the save while the menu loop is open.
 * { eventId, loops, alive }
 */
export function startBackyardSession(state, eventId) {
  const event = backyardById(eventId);
  if (!event) return null;
  return { eventId, loops: 0, alive: true };
}

/**
 * Resolve one loop. choice: "continue" | "stop".
 * Returns { done, failed, won, loops, lines } and mutates session + body.
 */
export function resolveBackyardLoop(state, session, choice, rng = Math.random) {
  const event = backyardById(session.eventId);
  const lines = [];
  if (!event || !session.alive) {
    return { done: true, failed: false, won: false, loops: session.loops || 0, lines: ["The yard is over."] };
  }

  if (choice === "stop") {
    session.alive = false;
    lines.push(`You step off after ${session.loops} loop(s). The bell keeps ringing for the others.`);
    return { done: true, failed: false, won: false, loops: session.loops, lines };
  }

  // Attempt the next loop.
  const chance = loopFailChance(state.condition.fatigue);
  if (rng() < chance) {
    session.alive = false;
    lines.push(`Loop ${session.loops + 1}: the bell catches you short. You're out.`);
    return { done: true, failed: true, won: false, loops: session.loops, lines };
  }

  session.loops += 1;
  state.condition.fatigue = Math.min(100, (state.condition.fatigue || 0) + BACKYARD_LOOP_FATIGUE);
  state.condition.nutrition = Math.max(0, (state.condition.nutrition || 0) + BACKYARD_LOOP_NUTRITION);
  state.condition.peak = Math.min(100, (state.condition.peak || 0) + BACKYARD_LOOP_PEAK);
  state.condition.endurance = Math.min(100, (state.condition.endurance || 0) + BACKYARD_LOOP_ENDURANCE);
  lines.push(
    `Loop ${session.loops} done (${BACKYARD_LOOP_MILES} mi). Fatigue is climbing. Continue or stop?`,
  );

  if (session.loops >= event.fieldLoops) {
    session.alive = false;
    lines.push("The field is gone. Last one standing.");
    return { done: true, failed: false, won: true, loops: session.loops, lines };
  }

  return { done: false, failed: false, won: false, loops: session.loops, lines };
}

export function backyardReward(event, loops, won) {
  const coins = loops * BACKYARD_LOOP_COINS + (won && event.premier ? BACKYARD_WIN_COINS : 0);
  const xp = loops * BACKYARD_LOOP_XP + (won && event.premier ? BACKYARD_WIN_XP : 0);
  const miles = Math.round(loops * BACKYARD_LOOP_MILES * 10) / 10;
  return { coins, xp, miles };
}
