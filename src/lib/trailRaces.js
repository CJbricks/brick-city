/**
 * trailRaces.js
 * Ridgeview premier mountain trail races and their progressive unlocks.
 *
 * Order: 50K → 100K → 100 Mile → 200 Mile.
 * Each finish + a level gate opens the next. Rewards scale up from the
 * Brick City Marathon (6 energy / 170 XP / 120 coins). Ultras longer
 * than a day spend the full energy bar and advance extra calendar days
 * (daysCost) with heavy fatigue.
 *
 * Finish flags: progress.ridge50kFinished, ridge100kFinished,
 * ridge100mFinished, ridge200mFinished. Missing on an old save = false.
 */

import { levelFromXp } from "@/lib/xp";
import { entryNeedsMessage } from "@/lib/unlocks";

/** Level gates after the previous finish. */
export const RIDGE_50K_LEVEL = 18;
export const RIDGE_100K_LEVEL = 22;
export const RIDGE_100M_LEVEL = 26;
export const RIDGE_200M_LEVEL = 30;

/**
 * Premier trail race rows. Merged into RACES in race.js.
 * daysCost: extra calendar days advanced on finish (on top of energy→sky).
 */
export const TRAIL_RACES = {
  "ridge-50k": {
    id: "ridge-50k",
    name: "Ridgeview 50K",
    km: 50,
    miles: 31.1,
    slots: 7,
    energy: 7,
    daysCost: 0,
    style: "trail",
    city: "ridgeview",
    premier: true,
    ideal: { endurance: 0.7, peak: 0.3 },
    idealLabel: "70% Endurance / 30% Peak",
    xp: { overall: 220, trail: 160, ultra: 40, versatile: 14 },
    attributes: { strength: 10, endurance: 20, mental: 12 },
    coins: 160,
    peak: 2,
    endurance: 14,
    fatigue: 55,
    nutrition: -48,
    dnfXp: { overall: 36, trail: 20 },
    dnfFatigue: 36,
  },
  "ridge-100k": {
    id: "ridge-100k",
    name: "Ridgeview 100K",
    km: 100,
    miles: 62.1,
    slots: 8,
    energy: 8,
    daysCost: 1,
    style: "trail",
    city: "ridgeview",
    premier: true,
    ideal: { endurance: 0.75, peak: 0.25 },
    idealLabel: "75% Endurance / 25% Peak",
    xp: { overall: 320, trail: 240, ultra: 70, versatile: 18 },
    attributes: { strength: 12, endurance: 28, mental: 16 },
    coins: 240,
    peak: 1,
    endurance: 18,
    fatigue: 70,
    nutrition: -60,
    dnfXp: { overall: 48, trail: 28 },
    dnfFatigue: 48,
  },
  "ridge-100m": {
    id: "ridge-100m",
    name: "Ridgeview 100 Mile",
    km: 160.9,
    miles: 100,
    slots: 10,
    energy: 10,
    daysCost: 1,
    style: "trail",
    city: "ridgeview",
    premier: true,
    ideal: { endurance: 0.8, peak: 0.2 },
    idealLabel: "80% Endurance / 20% Peak",
    xp: { overall: 450, trail: 340, ultra: 110, versatile: 22 },
    attributes: { strength: 14, endurance: 36, mental: 22 },
    coins: 360,
    peak: 0,
    endurance: 22,
    fatigue: 85,
    nutrition: -75,
    dnfXp: { overall: 64, trail: 36 },
    dnfFatigue: 58,
  },
  "ridge-200m": {
    id: "ridge-200m",
    name: "Ridgeview 200 Mile",
    km: 321.9,
    miles: 200,
    slots: 10,
    energy: 10,
    daysCost: 2,
    style: "trail",
    city: "ridgeview",
    premier: true,
    ideal: { endurance: 0.85, peak: 0.15 },
    idealLabel: "85% Endurance / 15% Peak",
    xp: { overall: 700, trail: 520, ultra: 180, versatile: 28 },
    attributes: { strength: 16, endurance: 48, mental: 30 },
    coins: 550,
    peak: 0,
    endurance: 28,
    fatigue: 95,
    nutrition: -90,
    dnfXp: { overall: 90, trail: 50 },
    dnfFatigue: 70,
  },
};

export const TRAIL_RACE_ORDER = ["ridge-50k", "ridge-100k", "ridge-100m", "ridge-200m"];

export function trailRaceFinishedFlag(raceId) {
  const map = {
    "ridge-50k": "ridge50kFinished",
    "ridge-100k": "ridge100kFinished",
    "ridge-100m": "ridge100mFinished",
    "ridge-200m": "ridge200mFinished",
  };
  return map[raceId] || null;
}

export function allRidgeviewPremiersFinished(state) {
  const p = state?.progress || {};
  return Boolean(p.ridge50kFinished)
    && Boolean(p.ridge100kFinished)
    && Boolean(p.ridge100mFinished)
    && Boolean(p.ridge200mFinished);
}

export function trailRaceStatus(state, raceId) {
  const level = levelFromXp(state?.xp?.overall || 0);
  const p = state?.progress || {};
  const needs = [];
  if (raceId === "ridge-50k") {
    needs.push({ label: `Reach level ${RIDGE_50K_LEVEL}`, ok: level >= RIDGE_50K_LEVEL, have: `Lv ${level}` });
    needs.push({
      label: "Finish the Brick City Marathon",
      ok: Boolean(p.marathonFinished),
      have: p.marathonFinished ? "done" : "not yet",
    });
  } else if (raceId === "ridge-100k") {
    needs.push({ label: `Reach level ${RIDGE_100K_LEVEL}`, ok: level >= RIDGE_100K_LEVEL, have: `Lv ${level}` });
    needs.push({
      label: "Finish the Ridgeview 50K",
      ok: Boolean(p.ridge50kFinished),
      have: p.ridge50kFinished ? "done" : "not yet",
    });
  } else if (raceId === "ridge-100m") {
    needs.push({ label: `Reach level ${RIDGE_100M_LEVEL}`, ok: level >= RIDGE_100M_LEVEL, have: `Lv ${level}` });
    needs.push({
      label: "Finish the Ridgeview 100K",
      ok: Boolean(p.ridge100kFinished),
      have: p.ridge100kFinished ? "done" : "not yet",
    });
  } else if (raceId === "ridge-200m") {
    needs.push({ label: `Reach level ${RIDGE_200M_LEVEL}`, ok: level >= RIDGE_200M_LEVEL, have: `Lv ${level}` });
    needs.push({
      label: "Finish the Ridgeview 100 Mile",
      ok: Boolean(p.ridge100mFinished),
      have: p.ridge100mFinished ? "done" : "not yet",
    });
  } else {
    return { open: false, needs: [{ label: "Unknown race", ok: false, have: "—" }] };
  }
  return { open: needs.every((n) => n.ok), needs };
}

export function isTrailRaceOpen(state, raceId) {
  return trailRaceStatus(state, raceId).open;
}

export function trailRaceNeedsMessage(state, raceId) {
  return entryNeedsMessage(trailRaceStatus(state, raceId).needs);
}
