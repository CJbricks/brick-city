/**
 * sickness.test.js
 * Rare morning illness: trigger rarity and gap, blocked runs, natural
 * Peak cut, clinic sick visit (90% Peak + coins), and old-save load.
 */

import { describe, expect, it } from "vitest";
import {
  applyClinicSick,
  applyNap,
  applyRace,
  applyRival,
  applyRun,
  applySleep,
  createNewGame,
  menuFor,
  perform,
} from "@/lib/activities";
import { clinicRates } from "@/lib/constants";
import { deserialize, serialize } from "@/lib/save";
import {
  SICKNESS_BLOCK_MESSAGE,
  SICKNESS_CLINIC_PEAK_LOSS,
  SICKNESS_DAILY_CHANCE,
  SICKNESS_DURATION_DAYS,
  SICKNESS_MIN_GAP_DAYS,
  SICKNESS_NATURAL_PEAK_LOSS,
  SICKNESS_SAFE_DAYS,
  SICKNESS_WAKE_LINE,
  canRollSickness,
  cutPeakFraction,
  isSick,
  rollSicknessOnWake,
  sicknessStatusLine,
  tickSickness,
} from "@/lib/sickness";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

function makeSick(state, daysLeft = SICKNESS_DURATION_DAYS) {
  state.condition.sickness = {
    daysLeft,
    note: "Rest until it passes, or see the clinic.",
  };
  return state;
}

/** Always hit the daily roll. */
function alwaysHit() {
  return 0;
}

/** Always miss the daily roll. */
function alwaysMiss() {
  return 0.999;
}

describe("sickness tuning", () => {
  it("exposes named constants CJ can retune", () => {
    expect(SICKNESS_DAILY_CHANCE).toBeCloseTo(1 / 28);
    expect(SICKNESS_MIN_GAP_DAYS).toBe(21);
    expect(SICKNESS_SAFE_DAYS).toBe(7);
    expect(SICKNESS_DURATION_DAYS).toBe(2);
    expect(SICKNESS_NATURAL_PEAK_LOSS).toBe(0.5);
    expect(SICKNESS_CLINIC_PEAK_LOSS).toBe(0.9);
  });
});

describe("sickness trigger rarity and gap", () => {
  it("never rolls in the first in-game week", () => {
    const state = fresh();
    expect(state.calendar.day).toBe(1);
    expect(canRollSickness(state)).toBe(false);
    state.calendar.day = SICKNESS_SAFE_DAYS;
    expect(canRollSickness(state)).toBe(false);
    const lines = rollSicknessOnWake(state, alwaysHit);
    expect(lines).toEqual([]);
    expect(isSick(state)).toBe(false);
  });

  it("can roll after the first week when the gap is open", () => {
    const state = fresh();
    state.calendar.day = SICKNESS_SAFE_DAYS + 1;
    state.calendar.lastIllnessDay = null;
    expect(canRollSickness(state)).toBe(true);
    const lines = rollSicknessOnWake(state, alwaysHit);
    expect(lines).toEqual([SICKNESS_WAKE_LINE]);
    expect(isSick(state)).toBe(true);
    expect(state.condition.sickness.daysLeft).toBe(SICKNESS_DURATION_DAYS);
    expect(state.calendar.lastIllnessDay).toBe(state.calendar.day);
  });

  it("respects the minimum gap since the last illness", () => {
    const state = fresh();
    state.calendar.day = 40;
    state.calendar.lastIllnessDay = 40 - SICKNESS_MIN_GAP_DAYS + 1;
    expect(canRollSickness(state)).toBe(false);
    const missed = rollSicknessOnWake(state, alwaysHit);
    expect(missed).toEqual([]);

    state.calendar.lastIllnessDay = 40 - SICKNESS_MIN_GAP_DAYS;
    expect(canRollSickness(state)).toBe(true);
  });

  it("never triggers twice in a row on the same wake after recovery", () => {
    const state = fresh();
    state.calendar.day = 40;
    makeSick(state, 1);
    state.condition.peak = 40;
    const tick = tickSickness(state);
    expect(tick.recovered).toBe(true);
    expect(isSick(state)).toBe(false);
    const lines = rollSicknessOnWake(state, alwaysHit, true);
    expect(lines).toEqual([]);
    expect(isSick(state)).toBe(false);
  });

  it("misses when the daily roll fails", () => {
    const state = fresh();
    state.calendar.day = 40;
    const lines = rollSicknessOnWake(state, alwaysMiss);
    expect(lines).toEqual([]);
    expect(isSick(state)).toBe(false);
  });

  it("sleep can wake you sick and show the dialogue line", () => {
    const state = fresh();
    state.calendar.day = SICKNESS_SAFE_DAYS;
    const result = applySleep(state, alwaysHit);
    expect(result.ok).toBe(true);
    expect(result.state.calendar.day).toBe(SICKNESS_SAFE_DAYS + 1);
    expect(isSick(result.state)).toBe(true);
    expect(result.lines).toContain(SICKNESS_WAKE_LINE);
  });
});

describe("sickness blocks runs and races", () => {
  it("blocks runs and workouts with a friendly message", () => {
    const state = makeSick(fresh());
    const run = applyRun(state, "easy-run");
    expect(run.ok).toBe(false);
    expect(run.lines[0]).toBe(SICKNESS_BLOCK_MESSAGE);
    expect(run.state.energy).toBe(state.energy);

    const gym = applyRun(state, "strength");
    expect(gym.ok).toBe(false);
    expect(gym.lines[0]).toBe(SICKNESS_BLOCK_MESSAGE);
  });

  it("still allows the neighborhood walk, naps, and eating while sick", () => {
    const state = makeSick(fresh());
    const walk = applyRun(state, "neighborhood-walk");
    expect(walk.ok).toBe(true);

    const nap = applyNap(makeSick(fresh()));
    expect(nap.ok).toBe(true);

    const meal = perform(makeSick(fresh()), { type: "home-food", id: "meal" });
    expect(meal.ok).toBe(true);
  });

  it("blocks races and the rival duel", () => {
    const state = makeSick(fresh());
    const race = applyRace(state, "5k", 0.9);
    expect(race.ok).toBe(false);
    expect(race.lines[0]).toBe(SICKNESS_BLOCK_MESSAGE);

    const rival = applyRival(state, 0.9);
    expect(rival.ok).toBe(false);
    expect(rival.lines[0]).toBe(SICKNESS_BLOCK_MESSAGE);
  });

  it("grays out run menu rows while sick", () => {
    const state = makeSick(fresh());
    const park = menuFor("park", state);
    const easy = park.items.find((row) => row.action.id === "easy-run");
    expect(easy.disabled).toBe(true);
    expect(easy.disabledReason).toBe(SICKNESS_BLOCK_MESSAGE);

    const board = menuFor("activity", state);
    const walk = board.items.find((row) => row.action.id === "neighborhood-walk");
    expect(walk.disabled).toBe(false);
  });
});

describe("sickness recovery and clinic", () => {
  it("natural recovery after two days halves peak fitness", () => {
    const state = fresh();
    state.condition.peak = 40;
    makeSick(state, 2);

    const night1 = applySleep(state, alwaysMiss);
    expect(isSick(night1.state)).toBe(true);
    expect(night1.state.condition.sickness.daysLeft).toBe(1);
    expect(night1.state.condition.peak).toBe(40);

    const night2 = applySleep(night1.state, alwaysMiss);
    expect(isSick(night2.state)).toBe(false);
    expect(night2.state.condition.peak).toBe(20);
    expect(night2.lines.some((line) => /sickness passes/i.test(line))).toBe(true);
  });

  it("cutPeakFraction removes the named share of current peak", () => {
    const state = fresh();
    state.condition.peak = 80;
    cutPeakFraction(state, 0.5);
    expect(state.condition.peak).toBe(40);
    cutPeakFraction(state, 0.9);
    expect(state.condition.peak).toBe(4);
  });

  it("sick visit cures immediately, removes 90% peak, and charges coins", () => {
    const state = makeSick(fresh());
    state.condition.peak = 40;
    state.coins = 250;
    const price = clinicRates("brick-city").sick;
    expect(price).toBe(200);

    const done = applyClinicSick(state);
    expect(done.ok).toBe(true);
    expect(isSick(done.state)).toBe(false);
    expect(done.state.condition.peak).toBe(4);
    expect(SICKNESS_CLINIC_PEAK_LOSS).toBe(0.9);
    expect(done.state.coins).toBe(250 - price);

    const run = applyRun(done.state, "easy-run");
    expect(run.ok).toBe(true);
  });

  it("sick visit charges nothing when healthy or broke", () => {
    const healthy = fresh();
    healthy.coins = 500;
    const skipped = applyClinicSick(healthy);
    expect(skipped.ok).toBe(false);
    expect(skipped.state.coins).toBe(500);
    expect(skipped.lines[0]).toMatch(/keep your coins/i);

    const broke = makeSick(fresh());
    broke.coins = clinicRates("brick-city").sick - 1;
    const refused = applyClinicSick(broke);
    expect(refused.ok).toBe(false);
    expect(refused.state.coins).toBe(broke.coins);
    expect(isSick(refused.state)).toBe(true);
  });

  it("offers sick visit only while sick and scales Summit Hollow higher", () => {
    const healthy = menuFor("clinic", fresh());
    expect(healthy.items.map((row) => row.label)).toEqual([
      "Treatment session",
      "Soft tissue work",
      "Blister care",
      "Injury screen",
    ]);

    const sickMenu = menuFor("clinic", makeSick(fresh()));
    expect(sickMenu.items.map((row) => row.label)).toContain("Sick visit");
    expect(sickMenu.items.find((row) => row.action.type === "clinic-sick").detail).toMatch(
      /200 coins · clears sickness · −90% Peak/,
    );

    expect(clinicRates("summit-hollow").sick).toBe(360);
    expect(clinicRates("summit-hollow").sick).toBeGreaterThan(clinicRates("brick-city").sick);
    const summit = makeSick(fresh());
    summit.city = "summit-hollow";
    summit.coins = 500;
    summit.condition.peak = 40;
    const billed = applyClinicSick(summit);
    expect(billed.state.coins).toBe(500 - clinicRates("summit-hollow").sick);
  });

  it("status line reads Sick: N day(s) left", () => {
    const state = makeSick(fresh(), 1);
    expect(sicknessStatusLine(state)).toBe("Sick: 1 day left");
    state.condition.sickness.daysLeft = 2;
    expect(sicknessStatusLine(state)).toBe("Sick: 2 days left");
  });
});

describe("sickness save compatibility", () => {
  it("loads an old save as healthy with an open illness gap", () => {
    const legacy = fresh();
    delete legacy.condition.sickness;
    delete legacy.calendar.lastIllnessDay;
    const loaded = deserialize(serialize(legacy));
    expect(loaded.version).toBe(1);
    expect(loaded.condition.sickness).toBeNull();
    expect(loaded.calendar.lastIllnessDay).toBeNull();
    expect(isSick(loaded)).toBe(false);

    // Gap open after the first week, same as a brand-new save.
    loaded.calendar.day = SICKNESS_SAFE_DAYS + 1;
    expect(canRollSickness(loaded)).toBe(true);
  });
});
