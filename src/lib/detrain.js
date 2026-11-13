/**
 * detrain.js
 * The trade-off for rest and work. One or two days without a run are free.
 * That's a rest day, and rest days are how you show up fresh. Starting on
 * the third skipped day, Peak Fitness drops. Overall Endurance only starts
 * fading on day 6. Peak goes first because it was never the deep base.
 */

import {
  DETRAIN_FREE_DAYS,
  ENDURANCE_DETRAIN_CAP,
  ENDURANCE_DETRAIN_DAY,
  PEAK_DETRAIN_CAP,
  PEAK_DETRAIN_STEP,
} from "@/lib/constants";

export function detrainingDelta(daysSinceRun) {
  if (daysSinceRun <= DETRAIN_FREE_DAYS) {
    return { peak: 0, endurance: 0, active: false };
  }
  const extraDays = daysSinceRun - DETRAIN_FREE_DAYS;
  const peak = -Math.min(PEAK_DETRAIN_CAP, PEAK_DETRAIN_STEP * extraDays);
  const endurance =
    daysSinceRun >= ENDURANCE_DETRAIN_DAY
      ? -Math.min(ENDURANCE_DETRAIN_CAP, daysSinceRun - (ENDURANCE_DETRAIN_DAY - 1))
      : 0;
  return { peak, endurance, active: true };
}

export function detrainingNote(daysSinceRun) {
  const delta = detrainingDelta(daysSinceRun);
  if (!delta.active) return "Rest days this week stayed inside the free window.";
  const endurance =
    delta.endurance < 0 ? ` Endurance ${delta.endurance}.` : "";
  return `No run for ${daysSinceRun} days. Peak ${delta.peak}.${endurance}`;
}
