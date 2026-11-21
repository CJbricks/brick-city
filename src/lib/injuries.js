/**
 * injuries.js
 * Typed running injuries, weather/fatigue risk, and clinic type costs.
 *
 * Blisters from nextSoreness still exist (condition.injury id "blister").
 * These typed injuries replace or stack as the chart injury when a run
 * rolls badly. Weather and high fatigue raise the chance. Night-run
 * strikes and soreness still apply separately.
 *
 * Injury types (durations in sleep nights):
 *   cramp      ~1 day, short
 *   pull       a few days
 *   achilles   several days, reduced performance
 *   knee       about a week
 *   concussion trail runs only, rare, mandatory rest
 *
 * The PT clinic can treat each type with a coin cost (city clinic
 * treatment price × a type multiplier) and faster recovery. Summit
 * Hollow still uses its higher clinic.treatment base.
 *
 * Headlamp: wearing hat id "headlamp" cuts nightRisk by
 * HEADLAMP_NIGHT_RISK_CUT (usually 1).
 */

import { clinicRates } from "@/lib/constants";
import { weatherInjuryBonus, todaysWeather } from "@/lib/weather";

/** Base chance a finished run rolls a typed injury (before modifiers). */
export const INJURY_BASE_CHANCE = 0.03;

/** Extra chance when Fatigue is at or above this line. */
export const INJURY_FATIGUE_LINE = 70;
export const INJURY_FATIGUE_CHANCE = 0.05;

/** Extra chance when Fatigue is at or above the red line. */
export const INJURY_FATIGUE_RED = 85;
export const INJURY_FATIGUE_RED_CHANCE = 0.04;

/** How many nights a clinic treatment removes for typed injuries. */
export const INJURY_CLINIC_NIGHTS = 2;

/**
 * Headlamp cuts this many nightRisk strikes. Wearing it makes night
 * city / park / trail safer without deleting the risk entirely.
 */
export const HEADLAMP_NIGHT_RISK_CUT = 1;

/** Hat id sold at the Run Store (Ridgeview unlock). Original name. */
export const HEADLAMP_HAT_ID = "headlamp";

/**
 * Typed injuries. weight is relative when a hit happens.
 * trailOnly: only ridge / night-trail / mountain-style runs.
 * blocksRunning: cannot start runs or races while active.
 * pacePenalty: fraction subtracted from race/run form score.
 * clinicMult: times the city's clinic.treatment price.
 */
export const INJURY_TYPES = {
  cramp: {
    id: "cramp",
    name: "Muscle cramp",
    days: 1,
    weight: 40,
    trailOnly: false,
    blocksRunning: false,
    pacePenalty: 0.02,
    clinicMult: 0.5,
    note: "Short. Easy work is fine; hard efforts feel tight.",
  },
  pull: {
    id: "pull",
    name: "Muscle pull",
    days: 3,
    weight: 28,
    trailOnly: false,
    blocksRunning: true,
    pacePenalty: 0.04,
    clinicMult: 0.85,
    note: "A few days off running. Walks and shop trips still work.",
  },
  achilles: {
    id: "achilles",
    name: "Achilles soreness",
    days: 5,
    weight: 18,
    trailOnly: false,
    blocksRunning: false,
    pacePenalty: 0.06,
    clinicMult: 1.0,
    note: "Several days. You can jog easy, but race pace suffers.",
  },
  knee: {
    id: "knee",
    name: "Knee strain",
    days: 7,
    weight: 12,
    trailOnly: false,
    blocksRunning: true,
    pacePenalty: 0.08,
    clinicMult: 1.25,
    note: "About a week. No running until the chart clears.",
  },
  concussion: {
    id: "concussion",
    name: "Concussion",
    days: 4,
    weight: 4,
    trailOnly: true,
    blocksRunning: true,
    pacePenalty: 0.1,
    clinicMult: 1.5,
    note: "Trail fall. Mandatory rest a few days. Clinic helps.",
  },
};

export const INJURY_BLOCK_MESSAGE =
  "Your injury chart says no running today. Rest, or visit the PT clinic.";

export function injuryById(id) {
  return INJURY_TYPES[id] || null;
}

export function hasHeadlamp(state) {
  return state?.gear?.hat === HEADLAMP_HAT_ID;
}

/** Night risk after the headlamp cut. Never below 0. */
export function adjustedNightRisk(rawRisk, state) {
  const base = Math.max(0, Number(rawRisk) || 0);
  if (!hasHeadlamp(state)) return base;
  return Math.max(0, base - HEADLAMP_NIGHT_RISK_CUT);
}

export function injuryBlocksRunning(state) {
  const injury = state?.condition?.injury;
  if (!injury?.id) return false;
  // Blisters do not block all running (existing rule).
  if (injury.id === "blister") return false;
  const row = injuryById(injury.id);
  if (!row) return Boolean(injury.blocksRunning);
  return Boolean(row.blocksRunning);
}

export function injuryPacePenalty(state) {
  const injury = state?.condition?.injury;
  if (!injury?.id) return 0;
  if (injury.id === "blister") return 0.03;
  const row = injuryById(injury.id);
  if (row) return row.pacePenalty;
  return typeof injury.pacePenalty === "number" ? injury.pacePenalty : 0;
}

export function clinicCostForInjury(state, injuryId) {
  const rates = clinicRates(state?.city || "brick-city");
  const row = injuryById(injuryId);
  const mult = row?.clinicMult ?? 1;
  return Math.max(1, Math.round(rates.treatment * mult));
}

/**
 * Chance a run causes a typed injury. Pure; caller passes a roll.
 */
export function injuryChanceForRun(state, activity = {}) {
  let chance = INJURY_BASE_CHANCE;
  chance += weatherInjuryBonus(todaysWeather(state));
  const fatigue = state?.condition?.fatigue || 0;
  if (fatigue >= INJURY_FATIGUE_LINE) chance += INJURY_FATIGUE_CHANCE;
  if (fatigue >= INJURY_FATIGUE_RED) chance += INJURY_FATIGUE_RED_CHANCE;
  // Hard sessions and night risk bump a little more.
  if (activity.hard) chance += 0.02;
  const night = adjustedNightRisk(activity.nightRisk, state);
  chance += night * 0.015;
  return Math.min(0.45, chance);
}

function isTrailActivity(activity) {
  if (!activity) return false;
  if (activity.style === "trail") return true;
  if (activity.trail) return true;
  const id = activity.id || "";
  return id.includes("trail") || id.includes("ridge") || id.includes("mountain");
}

/**
 * Pick which typed injury hits. trailOnly rows only on trail sessions.
 */
export function pickInjuryType(activity, roll = 0.5) {
  const trail = isTrailActivity(activity);
  const pool = Object.values(INJURY_TYPES).filter((row) => trail || !row.trailOnly);
  const total = pool.reduce((sum, row) => sum + row.weight, 0);
  let cursor = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const row of pool) {
    cursor -= row.weight;
    if (cursor < 0) return row;
  }
  return pool[pool.length - 1];
}

/**
 * Maybe attach a typed injury after a run. Does not overwrite a worse
 * existing injury with more days left (unless the new one is longer).
 * Returns { hit, injury, line } and mutates state.condition when hit.
 */
export function maybeApplyRunInjury(state, activity, rng = Math.random) {
  if (state?.condition?.injury?.id === "concussion") {
    return { hit: false, injury: state.condition.injury, line: "" };
  }
  const chance = injuryChanceForRun(state, activity);
  if (rng() >= chance) return { hit: false, injury: state.condition.injury || null, line: "" };
  const row = pickInjuryType(activity, rng());
  const existing = state.condition.injury;
  if (existing && (existing.daysLeft || 0) >= row.days && existing.id !== "blister") {
    return { hit: false, injury: existing, line: "" };
  }
  const injury = {
    id: row.id,
    name: row.name,
    daysLeft: row.days,
    note: row.note,
    blocksRunning: row.blocksRunning,
    pacePenalty: row.pacePenalty,
  };
  state.condition.injury = injury;
  state.condition.sore = true;
  return {
    hit: true,
    injury,
    line: `${row.name}. ${row.note} ${row.days} night(s) on the chart.`,
  };
}
