/**
 * condition.js
 * Day-to-day body meters: Endurance, Peak, Fatigue, and Nutrition.
 * These move every run, meal, and night of sleep. They are not the same
 * as attribute levels. A ticker line and the little HUD arrows both come
 * from the helpers here.
 */

import {
  FATIGUE_RED,
  FATIGUE_YELLOW,
  JUNK_EXTRA_DRAIN,
  METER_KEYS,
  METER_LABELS,
  SLOT_NUTRITION_DRAIN,
  TIRED_EXTRA_DRAIN,
  TIRED_FATIGUE,
  TREND_THRESHOLD,
} from "@/lib/constants";

export function clampMeter(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function readMeters(condition) {
  return {
    endurance: condition.endurance,
    peak: condition.peak,
    fatigue: condition.fatigue,
    nutrition: condition.nutrition,
  };
}

/**
 * Arrow compared with yesterday (or with this morning, once yesterday's
 * snapshot is stored). Small wobbles stay "steady" so the HUD doesn't
 * flicker every time a meter moves by 1.
 */
export function trend(today, yesterday, threshold = TREND_THRESHOLD) {
  const delta = today - yesterday;
  if (delta >= threshold) return "up";
  if (delta <= -threshold) return "down";
  return "flat";
}

export const TREND_ARROW = {
  up: "▲",
  down: "▼",
  flat: "▬",
};

export function trendsFor(condition, yesterday) {
  const result = {};
  for (const key of METER_KEYS) {
    result[key] = trend(condition[key], yesterday[key]);
  }
  return result;
}

/** Fatigue is the bar that changes color: fresh green, working yellow, cooked red. */
export function fatigueBand(fatigue) {
  if (fatigue >= FATIGUE_RED) return "red";
  if (fatigue >= FATIGUE_YELLOW) return "yellow";
  return "green";
}

export function fatigueColor(fatigue) {
  const band = fatigueBand(fatigue);
  if (band === "red") return "#e23d3d";
  if (band === "yellow") return "#f2c14e";
  return "#3dba5d";
}

/**
 * One slot of the day passing. Hard days and junk food empty the tank faster.
 * Meals opt out of this (the meal *is* the food). Runs do not.
 */
export function slotDrain(condition) {
  let drain = SLOT_NUTRITION_DRAIN;
  if (condition.fatigue >= TIRED_FATIGUE) drain += TIRED_EXTRA_DRAIN;
  if (condition.junk) drain += JUNK_EXTRA_DRAIN;
  return drain;
}

/**
 * "+2 Peak ▲  +4 Fatigue ▲  −3 Nutrition ▼"
 * The arrow follows the sign of the change. Fatigue going up is still ▲,
 * even though being tired is bad. Zeros are skipped so the line stays short.
 */
export function formatTicker(deltas) {
  const parts = [];
  for (const key of METER_KEYS) {
    const value = deltas[key];
    if (!value) continue;
    const magnitude = Math.abs(value);
    const signed = value > 0 ? `+${magnitude}` : `−${magnitude}`;
    const arrow = value > 0 ? TREND_ARROW.up : TREND_ARROW.down;
    parts.push(`${signed} ${METER_LABELS[key]} ${arrow}`);
  }
  return parts.join("  ");
}

export function meterDelta(before, after) {
  const deltas = {};
  for (const key of METER_KEYS) {
    const change = after[key] - before[key];
    if (change !== 0) deltas[key] = change;
  }
  return deltas;
}
