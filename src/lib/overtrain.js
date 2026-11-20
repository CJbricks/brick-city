/**
 * overtrain.js
 * When Fatigue stays cooked overnight, Peak Fitness starts to slip.
 *
 * This is the opposite of detraining. Detraining is "too many rest days."
 * Overtraining is "you never let Fatigue come down." Sleep is the only
 * place that applies the Peak cut, once per in-game day, after overnight
 * Fatigue relief. A good night that drops you under the line stops the
 * decline. Endurance is not touched. Peak never goes below 0.
 *
 * Sickness can also cut Peak on the same morning. Both are allowed to
 * apply. Nothing here reads the sickness object, so the two rules do
 * not trip over each other.
 */

import { clampMeter } from "@/lib/condition";

/**
 * Overnight Peak tax starts at this Fatigue (0–100 scale).
 * Why 75: matches the in-session Peak blunt in applyBody (fatigue ≥ 75
 * already shaves Peak after a Peak-gaining workout). It sits above the
 * red fatigue band (70) and below the bonk "poor sleep" line (80), so
 * ordinary hard days do not tax Peak overnight, but camping in the deep
 * red does.
 */
export const OVERTRAIN_FATIGUE = 75;

/**
 * Fraction of current Peak removed each overtrained night.
 * Why 0.04 (4%): a few percent per day. At Peak 50 that is about −2,
 * the same ballpark as one day of detraining. It hurts across a few
 * nights of staying cooked, but it is not a sickness-sized cut.
 */
export const OVERTRAIN_PEAK_FRACTION = 0.04;

/** HUD / status sheet line while Fatigue is still at or above the threshold. */
export const OVERTRAIN_STATUS_LINE = "Overtrained: Peak slipping";

/**
 * True when Fatigue is at or above OVERTRAIN_FATIGUE.
 * Used by the HUD, status sheet, and Injury screen. Sleep uses the
 * same check after overnight relief so a good night can clear it.
 */
export function isOvertrained(state) {
  return (state?.condition?.fatigue || 0) >= OVERTRAIN_FATIGUE;
}

export function overtrainingStatusLine() {
  return OVERTRAIN_STATUS_LINE;
}

/**
 * How much Peak to remove tonight. 0 when under the threshold or Peak
 * is already 0. Otherwise at least −1 so a tiny Peak still slips.
 */
export function overtrainingPeakDelta(peak, fatigue) {
  if ((fatigue || 0) < OVERTRAIN_FATIGUE) return 0;
  if (!(peak > 0)) return 0;
  return -Math.max(1, Math.round(peak * OVERTRAIN_PEAK_FRACTION));
}

/**
 * Apply one night of overtraining to the save. Mutates Peak only.
 * Returns { applied, lines } so applySleep can push a wake-up note.
 * Call once per sleep, after Fatigue relief, next to detraining.
 */
export function applyOvertraining(state) {
  const fatigue = state?.condition?.fatigue;
  const before = state?.condition?.peak;
  if (typeof before !== "number" || !Number.isFinite(before)) {
    return { applied: false, lines: [] };
  }
  const delta = overtrainingPeakDelta(before, fatigue);
  if (delta === 0) {
    return { applied: false, lines: [] };
  }
  state.condition.peak = clampMeter(before + delta);
  return {
    applied: true,
    lines: [
      `Overtrained overnight. Peak slipped from ${before} to ${state.condition.peak}.`,
    ],
  };
}
