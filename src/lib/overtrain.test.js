/**
 * overtrain.test.js
 * High Fatigue overnight slips Peak. Under the threshold, Peak is safe.
 * Recovery stops the decline. Peak never goes below 0. Endurance is
 * untouched. No new save fields: old brick-city-save-v1 files still load.
 */

import { describe, expect, it } from "vitest";
import { applySleep, createNewGame } from "@/lib/activities";
import { injuryScreenLines } from "@/lib/clinic";
import { deserialize, serialize } from "@/lib/save";
import {
  OVERTRAIN_FATIGUE,
  OVERTRAIN_PEAK_FRACTION,
  OVERTRAIN_STATUS_LINE,
  applyOvertraining,
  isOvertrained,
  overtrainingPeakDelta,
  overtrainingStatusLine,
} from "@/lib/overtrain";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("overtraining tuning", () => {
  it("exposes named constants CJ can retune", () => {
    expect(OVERTRAIN_FATIGUE).toBe(75);
    expect(OVERTRAIN_PEAK_FRACTION).toBe(0.04);
    expect(OVERTRAIN_STATUS_LINE).toMatch(/Overtrained/);
  });
});

describe("overtrainingPeakDelta", () => {
  it("declines Peak above the fatigue threshold", () => {
    expect(overtrainingPeakDelta(50, OVERTRAIN_FATIGUE)).toBe(-2);
    expect(overtrainingPeakDelta(50, OVERTRAIN_FATIGUE + 5)).toBe(-2);
    expect(overtrainingPeakDelta(80, OVERTRAIN_FATIGUE)).toBe(-3);
  });

  it("does not decline Peak below the threshold", () => {
    expect(overtrainingPeakDelta(50, OVERTRAIN_FATIGUE - 1)).toBe(0);
    expect(overtrainingPeakDelta(50, 0)).toBe(0);
  });

  it("never asks for more Peak than you have, and floors at 0", () => {
    expect(overtrainingPeakDelta(0, OVERTRAIN_FATIGUE)).toBe(0);
    expect(overtrainingPeakDelta(1, OVERTRAIN_FATIGUE)).toBe(-1);
  });
});

describe("applyOvertraining", () => {
  it("cuts Peak and leaves Endurance alone", () => {
    const state = fresh();
    state.condition.fatigue = OVERTRAIN_FATIGUE;
    state.condition.peak = 50;
    state.condition.endurance = 40;
    const result = applyOvertraining(state);
    expect(result.applied).toBe(true);
    expect(state.condition.peak).toBe(48);
    expect(state.condition.endurance).toBe(40);
    expect(result.lines[0]).toMatch(/Peak slipped from 50 to 48/);
  });

  it("does nothing under the threshold", () => {
    const state = fresh();
    state.condition.fatigue = OVERTRAIN_FATIGUE - 1;
    state.condition.peak = 50;
    const result = applyOvertraining(state);
    expect(result.applied).toBe(false);
    expect(state.condition.peak).toBe(50);
    expect(result.lines).toEqual([]);
  });

  it("never drops Peak below 0", () => {
    const state = fresh();
    state.condition.fatigue = OVERTRAIN_FATIGUE;
    state.condition.peak = 1;
    applyOvertraining(state);
    expect(state.condition.peak).toBe(0);
    const again = applyOvertraining(state);
    expect(again.applied).toBe(false);
    expect(state.condition.peak).toBe(0);
  });
});

describe("overtraining through sleep", () => {
  it("slips Peak on sleep when Fatigue stays above the threshold after relief", () => {
    // Evening sleep relieves 40. Bedtime 90 → wake Fatigue 50 (under).
    // Night sleep relieves 32. Bedtime 95 → wake Fatigue 63 (under).
    // Morning sleep relieves 16. Bedtime 95 → wake Fatigue 79 (still over).
    const state = fresh();
    state.calendar.slot = 0;
    state.condition.fatigue = 95;
    state.condition.peak = 50;
    state.condition.endurance = 40;
    // Mark trained so detraining does not also cut Peak.
    state.calendar.trainedToday = true;
    const slept = applySleep(state);
    expect(slept.state.condition.fatigue).toBe(79);
    expect(slept.state.condition.peak).toBe(48);
    expect(slept.state.condition.endurance).toBe(40);
    expect(slept.lines.join(" ")).toMatch(/Overtrained overnight/);
    expect(slept.ticker).toMatch(/Peak/);
  });

  it("stops declining once Fatigue recovers under the threshold", () => {
    const state = fresh();
    state.calendar.slot = 0;
    state.condition.fatigue = 95;
    state.condition.peak = 50;
    state.calendar.trainedToday = true;
    const first = applySleep(state);
    expect(first.state.condition.peak).toBe(48);
    expect(isOvertrained(first.state)).toBe(true);

    // Soft tissue / nap style recovery: bring Fatigue under the line
    // without another overtrained night.
    first.state.condition.fatigue = OVERTRAIN_FATIGUE - 1;
    first.state.calendar.trainedToday = true;
    first.state.calendar.slot = 3;
    const recovered = applySleep(first.state);
    expect(isOvertrained(recovered.state)).toBe(false);
    expect(recovered.state.condition.peak).toBe(48);
    expect(recovered.lines.join(" ")).not.toMatch(/Overtrained overnight/);
  });

  it("still works when sick: both Peak cuts can apply the same morning", () => {
    const state = fresh();
    state.calendar.slot = 0;
    state.condition.fatigue = 95;
    state.condition.peak = 40;
    state.condition.endurance = 30;
    state.calendar.trainedToday = true;
    state.condition.sickness = {
      daysLeft: 1,
      note: "Rest until it passes, or see the clinic.",
    };
    const slept = applySleep(state);
    // Natural sickness recovery halves Peak (40 → 20), then overtraining
    // takes 4% of 20 (at least 1) → 19.
    expect(slept.state.condition.sickness).toBeNull();
    expect(slept.state.condition.peak).toBe(19);
    expect(slept.state.condition.endurance).toBe(30);
    expect(slept.lines.join(" ")).toMatch(/sickness passes/i);
    expect(slept.lines.join(" ")).toMatch(/Overtrained overnight/);
  });
});

describe("overtraining feedback", () => {
  it("exposes the HUD status line while above the threshold", () => {
    const state = fresh();
    state.condition.fatigue = OVERTRAIN_FATIGUE;
    expect(isOvertrained(state)).toBe(true);
    expect(overtrainingStatusLine()).toBe(OVERTRAIN_STATUS_LINE);
    state.condition.fatigue = OVERTRAIN_FATIGUE - 1;
    expect(isOvertrained(state)).toBe(false);
  });

  it("mentions overtraining on the free Injury screen", () => {
    const state = fresh();
    state.condition.fatigue = OVERTRAIN_FATIGUE;
    const lines = injuryScreenLines(state).join(" ");
    expect(lines).toMatch(/Overtrained: Peak slipping/);
    expect(lines).toMatch(new RegExp(String(OVERTRAIN_FATIGUE)));
  });
});

describe("overtraining save compatibility", () => {
  it("loads an old save without any overtraining fields", () => {
    // No new save fields were added. Round-trip still works, and
    // overtraining is derived from Fatigue alone.
    const legacy = fresh();
    const loaded = deserialize(serialize(legacy));
    expect(loaded.condition.peak).toBe(legacy.condition.peak);
    expect(loaded.condition.fatigue).toBe(legacy.condition.fatigue);
    expect(isOvertrained(loaded)).toBe(false);
  });
});
