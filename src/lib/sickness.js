/**
 * sickness.js
 * A rare morning life event: you wake up sick for a couple of days.
 *
 * This is separate from a blister (condition.injury). A blister only
 * blocks hard speed work. Sickness blocks every run, workout, and race,
 * while walking, eating, napping, shopping, and the clinic still work.
 *
 * The roll happens once per wake in applySleep. The chance, the gap
 * since the last illness, and the first-week lockout are named constants
 * so CJ can retune without hunting through the sleep code. An old
 * brick-city-save-v1 file has none of these fields; Resume fills them
 * empty, and the version stays 1.
 */

import { clampMeter } from "@/lib/condition";

/**
 * Daily chance to get sick once the gap and first-week rules allow it.
 * With a 21-day minimum gap, 1/28 averages about one illness every
 * 7 weeks (gap + 1/chance ≈ 21 + 28 = 49 days ≈ 7 weeks). Aim is
 * roughly every 6–8 in-game weeks.
 */
export const SICKNESS_DAILY_CHANCE = 1 / 28;

/** Do not roll again until this many calendar days after the last illness started. */
export const SICKNESS_MIN_GAP_DAYS = 21;

/**
 * New saves start on day 1. No sickness during the first in-game week
 * (days 1–7). The roll runs after sleep bumps the day, so day 8 is the
 * first morning that can wake up sick.
 */
export const SICKNESS_SAFE_DAYS = 7;

/** How many full in-game days you stay sick when it hits. */
export const SICKNESS_DURATION_DAYS = 2;

/** Natural recovery removes this fraction of current Peak Fitness. */
export const SICKNESS_NATURAL_PEAK_LOSS = 0.5;

/** A sick visit at the clinic removes this fraction instead. */
export const SICKNESS_CLINIC_PEAK_LOSS = 0.65;

export const SICKNESS_WAKE_LINE = "You wake up feeling sick...";

export const SICKNESS_BLOCK_MESSAGE =
  "You're sick. Rest, eat, walk, or visit the clinic. Running and racing can wait.";

export function isSick(state) {
  const days = state?.condition?.sickness?.daysLeft;
  return typeof days === "number" && days > 0;
}

export function sickDaysLeft(state) {
  if (!isSick(state)) return 0;
  return Math.max(0, Math.floor(state.condition.sickness.daysLeft));
}

/** Status sheet / HUD copy: "Sick: 1 day left" or "Sick: 2 days left". */
export function sicknessStatusLine(state) {
  const days = sickDaysLeft(state);
  if (days <= 0) return "";
  const unit = days === 1 ? "day" : "days";
  return `Sick: ${days} ${unit} left`;
}

/**
 * Cut Peak by a fraction of whatever it is right now.
 * 0.5 means "half of current peak is removed" (peak becomes half).
 * 0.65 means peak keeps 35%.
 */
export function cutPeakFraction(state, fraction) {
  const peak = state?.condition?.peak;
  if (typeof peak !== "number" || !Number.isFinite(peak)) return;
  const keep = Math.max(0, 1 - fraction);
  state.condition.peak = clampMeter(peak * keep);
}

function dayOf(state) {
  const day = state?.calendar?.day;
  if (typeof day !== "number" || !Number.isFinite(day)) return 1;
  return Math.max(1, Math.floor(day));
}

/**
 * Gap, first week, currently sick, and "just recovered this wake" all
 * block a new roll. Never twice in a row means: if this sleep already
 * cleared a sickness, do not roll a new one on the same morning.
 */
export function canRollSickness(state, justRecovered = false) {
  if (justRecovered) return false;
  if (isSick(state)) return false;
  if (dayOf(state) <= SICKNESS_SAFE_DAYS) return false;
  const last = state?.calendar?.lastIllnessDay;
  if (typeof last === "number" && Number.isFinite(last)) {
    if (dayOf(state) < last + SICKNESS_MIN_GAP_DAYS) return false;
  }
  return true;
}

/**
 * Tick sickness overnight. Returns { recovered, lines }.
 * When days hit 0, Peak is cut by SICKNESS_NATURAL_PEAK_LOSS and the
 * sickness object is cleared. Call this once per sleep, before the
 * morning roll, so a recovery morning cannot also roll a new illness.
 */
export function tickSickness(state) {
  if (!isSick(state)) return { recovered: false, lines: [] };
  const left = sickDaysLeft(state) - 1;
  if (left > 0) {
    state.condition.sickness = {
      ...state.condition.sickness,
      daysLeft: left,
    };
    return { recovered: false, lines: [] };
  }
  const before = state.condition.peak;
  cutPeakFraction(state, SICKNESS_NATURAL_PEAK_LOSS);
  state.condition.sickness = null;
  return {
    recovered: true,
    lines: [
      `The sickness passes. Peak Fitness drops from ${before} to ${state.condition.peak}.`,
    ],
  };
}

/**
 * One daily roll on wake. Mutates state when it hits. Returns dialogue
 * lines to show (empty when the roll misses or the rules block it).
 * Pass rng so tests can force a hit without Math.random.
 */
export function rollSicknessOnWake(state, rng = Math.random, justRecovered = false) {
  if (!canRollSickness(state, justRecovered)) return [];
  if (rng() >= SICKNESS_DAILY_CHANCE) return [];
  state.condition.sickness = {
    daysLeft: SICKNESS_DURATION_DAYS,
    note: "Rest until it passes, or see the clinic.",
  };
  state.calendar.lastIllnessDay = dayOf(state);
  return [SICKNESS_WAKE_LINE];
}

/**
 * Fill missing sickness fields on an old save. Version stays 1.
 * Missing means healthy, and the gap is open (same idea as lastOfferDay).
 */
export function normalizeSickness(state) {
  if (!state?.condition) return state;
  if (!state.condition.sickness || typeof state.condition.sickness !== "object") {
    state.condition.sickness = null;
  } else {
    const days = state.condition.sickness.daysLeft;
    if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
      state.condition.sickness = null;
    } else {
      state.condition.sickness = {
        daysLeft: Math.floor(days),
        note:
          typeof state.condition.sickness.note === "string"
            ? state.condition.sickness.note
            : "Rest until it passes, or see the clinic.",
      };
    }
  }
  if (!state.calendar) return state;
  const last = state.calendar.lastIllnessDay;
  if (typeof last !== "number" || !Number.isFinite(last) || last < 1) {
    state.calendar.lastIllnessDay = null;
  } else {
    state.calendar.lastIllnessDay = Math.floor(last);
  }
  return state;
}
