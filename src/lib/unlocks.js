/**
 * unlocks.js
 * What is open on day one, and the exact checks for everything that isn't.
 * The town map greys out a locked place and prints these same lines, so
 * the player and the tests are reading one rule.
 *
 * v1 can start the 5K, the 10K (once earned), the Half Marathon (once
 * earned), the Marathon (once earned), and the mountain gate. Track and
 * treadmill counters still exist on the save for training history, but
 * they are not a separate "road readiness" score and they do not gate
 * these races. Unlock rules live here; the numbers live in constants.js.
 *
 * The mountain used to look for the single id "trail". Any shoe whose
 * style is trail counts now, including the house lugs and every brand
 * trail shoe. A marathon shoe or a backyard shoe does not open the gate.
 */

import { isTrailShoe } from "@/lib/catalog";
import { HALF_UNLOCK_LEVEL, MARATHON_UNLOCK_LEVEL } from "@/lib/constants";
import { levelFromXp } from "@/lib/xp";

export function runnerLevel(state) {
  return levelFromXp(state.xp?.overall || 0);
}

export function mountainStatus(state) {
  const level = runnerLevel(state);
  const trails = state.progress.parkTrailRuns;
  const shoes = isTrailShoe(state.gear?.equipped);
  const needs = [
    { label: "Reach level 8", ok: level >= 8, have: `Lv ${level}` },
    { label: "Finish 5 park trail runs", ok: trails >= 5, have: `${trails}/5` },
    { label: "Equip trail shoes", ok: shoes, have: shoes ? "equipped" : "not equipped" },
  ];
  return { open: needs.every((item) => item.ok), needs };
}

export function isMountainOpen(state) {
  return mountainStatus(state).open;
}

export function tenKStatus(state) {
  const level = runnerLevel(state);
  const finished = Boolean(state.progress.fiveKFinished);
  const needs = [
    { label: "Reach level 3", ok: level >= 3, have: `Lv ${level}` },
    { label: "Finish the Brick City 5K", ok: finished, have: finished ? "done" : "not yet" },
  ];
  return { open: needs.every((item) => item.ok), needs };
}

export function isTenKOpen(state) {
  return tenKStatus(state).open;
}

/**
 * Half Marathon: overall level HALF_UNLOCK_LEVEL, plus both shorter road
 * races finished. Missing either race or the level keeps the board locked.
 */
export function halfStatus(state) {
  const level = runnerLevel(state);
  const five = Boolean(state.progress.fiveKFinished);
  const ten = Boolean(state.progress.tenKFinished);
  const needs = [
    { label: `Reach level ${HALF_UNLOCK_LEVEL}`, ok: level >= HALF_UNLOCK_LEVEL, have: `Lv ${level}` },
    { label: "Finish the Brick City 5K", ok: five, have: five ? "done" : "not yet" },
    { label: "Finish the Community 10K", ok: ten, have: ten ? "done" : "not yet" },
  ];
  const open = needs.every((item) => item.ok);
  return {
    open,
    // Older menus called this "ready". Same meaning as open now that the
    // race is playable; kept so any leftover ready checks still work.
    ready: open,
    needs,
  };
}

export function isHalfOpen(state) {
  return halfStatus(state).open;
}

/**
 * Marathon: overall level MARATHON_UNLOCK_LEVEL after finishing the half.
 * The full distance is the milestone, not a second preview row.
 */
export function marathonStatus(state) {
  const level = runnerLevel(state);
  const half = Boolean(state.progress.halfFinished);
  const needs = [
    { label: `Reach level ${MARATHON_UNLOCK_LEVEL}`, ok: level >= MARATHON_UNLOCK_LEVEL, have: `Lv ${level}` },
    { label: "Finish the Brick City Half", ok: half, have: half ? "done" : "not yet" },
  ];
  return { open: needs.every((item) => item.ok), needs };
}

export function isMarathonOpen(state) {
  return marathonStatus(state).open;
}

export function describeNeeds(needs) {
  return needs.map((item) => `${item.ok ? "Done" : "Need"}: ${item.label} (${item.have})`).join(" ");
}

/**
 * Locked-race copy: only what is still missing, as one "to enter" line.
 * Example: "Reach level 15 and finish the Community 10K to enter".
 * Done rows stay off the sentence so the player sees the gap, not a wall
 * of checkmarks.
 */
export function entryNeedsMessage(needs) {
  const missing = (needs || []).filter((item) => !item.ok).map((item) => item.label);
  if (missing.length === 0) return "Ready to enter.";
  if (missing.length === 1) return `${missing[0]} to enter.`;
  if (missing.length === 2) {
    return `${missing[0]} and ${lowerFirst(missing[1])} to enter.`;
  }
  const head = missing.slice(0, -1).map((label, index) => (index === 0 ? label : lowerFirst(label)));
  return `${head.join(", ")}, and ${lowerFirst(missing[missing.length - 1])} to enter.`;
}

function lowerFirst(text) {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * Town decorations. These don't change collision. The painter reads the
 * list and adds a banner, extra flowers, or an open gate.
 */
export function milestoneTags(state) {
  const tags = [];
  if (state.progress.fiveKFinished) tags.push("banner");
  if (runnerLevel(state) >= 3) tags.push("flowers");
  if (state.progress.parkTrailRuns >= 1) tags.push("trail-marker");
  if (isMountainOpen(state)) tags.push("gate-open");
  if (state.progress.halfFinished) tags.push("half-banner");
  if (state.progress.marathonFinished) tags.push("marathon-banner");
  return tags;
}
