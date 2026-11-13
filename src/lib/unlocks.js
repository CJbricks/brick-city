/**
 * unlocks.js
 * What is open on day one, and the exact checks for everything that isn't.
 * The town map greys out a locked place and prints these same lines, so
 * the player and the tests are reading one rule.
 *
 * v1 can actually start the 5K, the 10K (once earned), and the mountain
 * gate. The half marathon is a preview: you can see the requirements, and
 * the race itself arrives in a later build.
 *
 * The mountain used to look for the single id "trail". Any shoe whose
 * style is trail counts now, including the house lugs and every brand
 * trail shoe. A marathon shoe or a backyard shoe does not open the gate.
 */

import { isTrailShoe } from "@/lib/catalog";
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

export function halfStatus(state) {
  const level = runnerLevel(state);
  const ten = Boolean(state.progress.tenKFinished);
  const track = state.progress.trackRuns;
  const tread = state.progress.treadmillRuns;
  const needs = [
    { label: "Reach level 6", ok: level >= 6, have: `Lv ${level}` },
    { label: "Finish the Community 10K", ok: ten, have: ten ? "done" : "not yet" },
    { label: "Complete 5 track workouts", ok: track >= 5, have: `${track}/5` },
    { label: "Complete 5 treadmill runs", ok: tread >= 5, have: `${tread}/5` },
  ];
  return {
    open: false,
    ready: needs.every((item) => item.ok),
    needs,
  };
}

export function describeNeeds(needs) {
  return needs.map((item) => `${item.ok ? "Done" : "Need"}: ${item.label} (${item.have})`).join(" ");
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
  return tags;
}
