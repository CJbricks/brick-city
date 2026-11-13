/**
 * calendar.js
 * Brick City time. A day has five slots (Morning through Night). Most
 * errands take one slot. A long run takes two. Sleep ends the day no
 * matter which slot you are in, and the slot you pick changes how good
 * that sleep is. Sunday night writes the weekly summary.
 */

import { MAX_ENERGY, SLOTS, WEEKDAYS } from "@/lib/constants";

export function slotLabel(slot) {
  if (slot >= SLOTS.length) return SLOTS[SLOTS.length - 1];
  return SLOTS[Math.max(0, slot)];
}

export function weekdayLabel(weekday) {
  return WEEKDAYS[((weekday % 7) + 7) % 7];
}

export function formatWhen(calendar) {
  return `Day ${calendar.day} · ${weekdayLabel(calendar.weekday)} ${slotLabel(calendar.slot)}`;
}

/**
 * An activity fits if it finishes before the day rolls past Night.
 * Kept for the old slot math and the tests. Gameplay now spends energy
 * blocks (see slotFromEnergy) instead of refusing work because the clock
 * is late.
 */
export function canFit(slot, cost) {
  return slot + cost <= SLOTS.length;
}

/**
 * Energy left decides the time of day. A full bar is Morning. Every two
 * blocks spent moves the clock one step. Zero blocks is "the night is
 * spent" (slot 5), which is still labeled Night and counts as a late bedtime.
 */
export function slotFromEnergy(energy) {
  const safe = Math.max(0, Math.min(MAX_ENERGY, typeof energy === "number" ? energy : MAX_ENERGY));
  if (safe === 0) return 5;
  return Math.min(4, Math.floor((MAX_ENERGY - safe) / 2));
}

/**
 * How you sleep depends on when you go to bed.
 * Evening is the good night (8h). Waiting until Night is fine.
 * Going back to bed in the morning still ends the day, but it's poor sleep,
 * and poor sleep is half of the bonk rule.
 */
export function sleepPlan(slot) {
  if (slot <= 1) return { hours: 5, quality: "poor", relief: 16 };
  if (slot === 2) return { hours: 6, quality: "fair", relief: 26 };
  if (slot === 3) return { hours: 8, quality: "good", relief: 40 };
  return { hours: 7, quality: "ok", relief: 32 };
}

export function average(values) {
  if (!values || values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export function isSunday(weekday) {
  return weekday === 6;
}

/**
 * Pure summary math. The caller has already collected this week's miles,
 * XP, and the fatigue / nutrition / sleep samples.
 */
export function summarizeWeek(input) {
  const avgFatigue = average(input.fatigueSamples);
  const avgNutrition = average(input.nutritionSamples);
  const avgSleep = average(input.sleepSamples);
  const hardWeek = avgFatigue >= input.hardLine;
  const recoveryWeek =
    avgFatigue < input.recoveryLine && input.miles >= input.recoveryMiles;
  return {
    weekIndex: input.weekIndex,
    miles: round1(input.miles),
    xp: { ...input.xp },
    avgFatigue: round1(avgFatigue),
    avgNutrition: round1(avgNutrition),
    avgSleep: round1(avgSleep),
    hardWeek,
    recoveryWeek,
    peakLost: input.peakLost || 0,
    enduranceLost: input.enduranceLost || 0,
    detrainingNote: input.detrainingNote,
  };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
