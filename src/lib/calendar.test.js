/**
 * calendar.test.js
 * Slots, sleep quality, and the Sunday-night weekly summary math.
 * Sleep itself (advancing the day) is covered with the activity tests,
 * because that also applies detraining.
 */

import { describe, expect, it } from "vitest";
import { canFit, formatWhen, isSunday, sleepPlan, slotFromEnergy, summarizeWeek } from "@/lib/calendar";

describe("calendar", () => {
  it("fits a long run in the afternoon and refuses it at night", () => {
    expect(canFit(2, 2)).toBe(true);
    expect(canFit(4, 1)).toBe(true);
    expect(canFit(4, 2)).toBe(false);
    expect(canFit(5, 1)).toBe(false);
  });

  it("turns energy blocks into a time of day", () => {
    expect(slotFromEnergy(10)).toBe(0);
    expect(slotFromEnergy(9)).toBe(0);
    expect(slotFromEnergy(8)).toBe(1);
    expect(slotFromEnergy(4)).toBe(3);
    expect(slotFromEnergy(2)).toBe(4);
    expect(slotFromEnergy(0)).toBe(5);
    expect(slotFromEnergy(undefined)).toBe(0);
  });

  it("makes evening the good night and morning sleep a poor one", () => {
    expect(sleepPlan(3)).toEqual({ hours: 8, quality: "good", relief: 40 });
    expect(sleepPlan(4)).toMatchObject({ hours: 7, quality: "ok" });
    expect(sleepPlan(0)).toEqual({ hours: 5, quality: "poor", relief: 16 });
    expect(isSunday(6)).toBe(true);
    expect(isSunday(0)).toBe(false);
  });

  it("labels the day the HUD shows", () => {
    expect(formatWhen({ day: 3, weekday: 0, slot: 2 })).toBe("Day 3 · Mon Afternoon");
    expect(formatWhen({ day: 1, weekday: 4, slot: 5 })).toBe("Day 1 · Fri Night");
  });

  it("averages the week and flags hard weeks versus recovery weeks", () => {
    const hard = summarizeWeek({
      weekIndex: 2,
      miles: 20,
      xp: { overall: 40, trail: 0, marathon: 10, ultra: 0, versatile: 0 },
      fatigueSamples: [80, 90, 70],
      nutritionSamples: [40, 50],
      sleepSamples: [6, 5],
      hardLine: 60,
      recoveryLine: 35,
      recoveryMiles: 6,
      peakLost: -4,
      enduranceLost: 0,
      detrainingNote: "Peak slipped.",
    });
    expect(hard.hardWeek).toBe(true);
    expect(hard.recoveryWeek).toBe(false);
    expect(hard.avgFatigue).toBe(80);
    expect(hard.miles).toBe(20);
    expect(hard.xp.marathon).toBe(10);

    const easy = summarizeWeek({
      weekIndex: 3,
      miles: 8,
      xp: { overall: 12, trail: 0, marathon: 0, ultra: 0, versatile: 4 },
      fatigueSamples: [20, 10, 15],
      nutritionSamples: [70],
      sleepSamples: [8],
      hardLine: 60,
      recoveryLine: 35,
      recoveryMiles: 6,
      peakLost: 0,
      enduranceLost: 0,
      detrainingNote: "No detraining this week.",
    });
    expect(easy.recoveryWeek).toBe(true);
    expect(easy.avgSleep).toBe(8);
  });
});
