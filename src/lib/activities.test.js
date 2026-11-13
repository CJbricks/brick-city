/**
 * activities.test.js
 * The week, played as data. These tests run the same functions the menus
 * call: an easy run, three rest days, Sunday's summary, a bonked 5K, a
 * clean 5K, the rival, and the unlock checks.
 */

import { describe, expect, it } from "vitest";
import {
  applyEatGel,
  applyEquip,
  applyHomeFood,
  applyNap,
  applyPurchase,
  applyRace,
  applyRival,
  applyRun,
  applyShift,
  applyShoe,
  applySleep,
  createNewGame,
} from "@/lib/activities";
import { isMountainOpen, isTenKOpen, mountainStatus } from "@/lib/unlocks";
import { xpToReachLevel } from "@/lib/xp";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("runs, food, and shifts", () => {
  it("makes an easy run shed fatigue, pass one slot, and count as training", () => {
    const result = applyRun(fresh(), "easy-run");
    expect(result.ok).toBe(true);
    expect(result.state.condition.fatigue).toBe(2);
    expect(result.state.condition.peak).toBe(21);
    expect(result.state.condition.endurance).toBe(26);
    expect(result.state.condition.nutrition).toBe(60);
    expect(result.state.energy).toBe(9);
    expect(result.state.calendar.slot).toBe(0);
    expect(result.state.calendar.trainedToday).toBe(true);
    expect(result.state.xp.overall).toBe(12);
    expect(result.state.xp.versatile).toBe(4);
    expect(result.state.attributes.recovery).toBe(8);
    expect(result.state.progress.totalMiles).toBe(2);
    expect(result.state.gear.miles.starter).toBe(2);
    expect(result.ticker).toBe("+2 Endurance ▲  +1 Peak ▲  −10 Fatigue ▼  −10 Nutrition ▼");
  });

  it("refuses a long run when fewer than two energy blocks are left", () => {
    const state = fresh();
    state.energy = 1;
    const result = applyRun(state, "long-run");
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.lines.join(" ")).toMatch(/Sleep at Home/);
  });

  it("fills nutrition from a meal and taxes the next run after a snack", () => {
    const bought = applyPurchase(fresh(), "meal");
    expect(bought.ok).toBe(true);
    expect(bought.state.coins).toBe(30);
    expect(bought.state.condition.nutrition).toBe(100);
    expect(bought.state.condition.mealQuality).toBe("good");
    expect(bought.state.condition.mealName).toBe("Pasta and greens");

    const poor = fresh();
    poor.coins = 7;
    const snack = applyPurchase(poor, "snack");
    expect(snack.state.condition.junk).toBe(true);
    const broke = applyPurchase(snack.state, "meal");
    expect(broke.ok).toBe(false);
  });

  it("pays coins for a shift choice and does not count it as a run", () => {
    const result = applyShift(fresh(), "gait", "wear");
    expect(result.ok).toBe(true);
    expect(result.state.coins).toBe(69);
    expect(result.state.calendar.trainedToday).toBe(false);
    expect(result.state.condition.fatigue).toBe(16);
  });
});

describe("sleep, detraining, and the weekly summary", () => {
  it("drops Peak on the third day without a run, and a run resets the streak", () => {
    let state = fresh();
    state = applySleep(state).state;
    state = applySleep(state).state;
    expect(state.calendar.daysSinceRun).toBe(2);
    expect(state.condition.peak).toBe(20);
    const third = applySleep(state);
    expect(third.state.calendar.daysSinceRun).toBe(3);
    expect(third.state.condition.peak).toBe(18);
    expect(third.state.condition.endurance).toBe(24);
    expect(third.lines.join(" ")).toMatch(/Peak -2/);

    const trained = applyRun(fresh(), "easy-run").state;
    const slept = applySleep(trained).state;
    expect(slept.calendar.daysSinceRun).toBe(0);
    expect(slept.condition.peak).toBe(21);
  });

  it("writes a weekly summary on Sunday night and a recovery bonus when the week was kind", () => {
    let state = fresh();
    for (let i = 0; i < 6; i += 1) state = applySleep(state).state;
    expect(state.calendar.weekday).toBe(6);
    expect(state.pendingSummary).toBeNull();
    const sunday = applySleep(state);
    expect(sunday.summary).not.toBeNull();
    expect(sunday.summary.weekIndex).toBe(1);
    expect(sunday.state.pendingSummary.miles).toBe(0);
    expect(sunday.state.calendar.weekday).toBe(0);
    expect(sunday.state.calendar.day).toBe(8);
    expect(sunday.state.calendar.weekIndex).toBe(2);

    const recovery = fresh();
    recovery.calendar.weekday = 6;
    recovery.calendar.weekMiles = 8;
    recovery.calendar.trainedToday = true;
    recovery.condition.fatigue = 10;
    recovery.calendar.fatigueSamples = [10, 12, 14];
    recovery.calendar.nutritionSamples = [70, 68];
    recovery.calendar.sleepSamples = [8];
    const result = applySleep(recovery);
    expect(result.summary.recoveryWeek).toBe(true);
    expect(result.state.xp.overall).toBe(15);
    expect(result.state.calendar.hardWeeks).toBe(0);

    const hard = fresh();
    hard.calendar.weekday = 6;
    hard.calendar.weekMiles = 30;
    hard.calendar.trainedToday = true;
    hard.condition.fatigue = 90;
    hard.calendar.slot = 0;
    hard.calendar.fatigueSamples = Array.from({ length: 12 }, () => 90);
    const hardResult = applySleep(hard);
    expect(hardResult.summary.hardWeek).toBe(true);
    expect(hardResult.state.calendar.hardWeeks).toBe(1);
  });
});

describe("races, rivals, and unlocks", () => {
  it("DNFs the 5K with no prize when fuel and sleep are both low", () => {
    const state = fresh();
    state.condition.nutrition = 20;
    state.condition.sleepQuality = "poor";
    const result = applyRace(state, "5k", 0.99);
    expect(result.ok).toBe(true);
    expect(result.state.progress.fiveKFinished).toBe(false);
    expect(result.state.coins).toBe(48);
    expect(result.state.xp.overall).toBe(8);
    expect(result.lines.join(" ")).toMatch(/DNF/);
  });

  it("pays out a clean 5K and then opens the 10K once level 3 is reached", () => {
    const state = fresh();
    const result = applyRace(state, "5k", 0.8);
    expect(result.state.progress.fiveKFinished).toBe(true);
    expect(result.state.coins).toBe(76);
    expect(result.state.xp.overall).toBe(46);
    expect(result.state.milestones).toContain("banner");
    expect(isTenKOpen(result.state)).toBe(false);

    const ready = fresh();
    ready.xp.overall = 70;
    ready.progress.fiveKFinished = true;
    expect(isTenKOpen(ready)).toBe(true);
    const blocked = applyRace(fresh(), "10k", 0.5);
    expect(blocked.ok).toBe(false);
  });

  it("pauses a bonk when a gel is pocketed, then saves the race only if you eat it", () => {
    const doomed = fresh();
    doomed.condition.nutrition = 15;
    doomed.condition.sleepQuality = "poor";
    doomed.gels = 1;
    const paused = applyRace(doomed, "5k", 0.99);
    expect(paused.needsChoice).toBe(true);
    expect(paused.state).toBe(doomed);
    expect(doomed.gels).toBe(1);
    expect(doomed.progress.fiveKFinished).toBe(false);

    const declined = applyRace(doomed, "5k", 0.99, "decline");
    expect(declined.needsChoice).toBeFalsy();
    expect(declined.state.progress.fiveKFinished).toBe(false);
    expect(declined.state.gels).toBe(1);
    expect(declined.state.coins).toBe(48);

    const eaten = applyRace(doomed, "5k", 0.99, "eat");
    expect(eaten.state.progress.fiveKFinished).toBe(true);
    expect(eaten.state.gels).toBe(0);
    expect(eaten.state.coins).toBe(76);
    expect(eaten.state.energy).toBe(10);
    expect(eaten.lines.join(" ")).toMatch(/gel/i);

    const empty = fresh();
    empty.condition.nutrition = 15;
    empty.condition.sleepQuality = "poor";
    empty.gels = 0;
    const bonk = applyRace(empty, "5k", 0.99);
    expect(bonk.needsChoice).toBeFalsy();
    expect(bonk.state.progress.fiveKFinished).toBe(false);
    expect(bonk.lines.join(" ")).toMatch(/gel could have saved/i);
  });

  it("loses to Remy on day one and beats him after speed work", () => {
    const loss = applyRival(fresh(), 0.5);
    expect(loss.state.progress.rivalLosses).toBe(1);
    expect(loss.state.progress.rivalWins).toBe(0);
    const sharp = fresh();
    sharp.attributes.speed = 40;
    sharp.condition.peak = 60;
    sharp.condition.fatigue = 10;
    sharp.condition.endurance = 40;
    const win = applyRival(sharp, 0.8);
    expect(win.state.progress.rivalWins).toBe(1);
    expect(win.state.coins).toBe(64);
  });

  it("keeps the mountain shut until level, trail runs, and trail shoes", () => {
    const state = fresh();
    expect(isMountainOpen(state)).toBe(false);
    expect(mountainStatus(state).needs.map((item) => item.ok)).toEqual([false, false, false]);
    state.xp.overall = xpToReachLevel(8);
    state.progress.parkTrailRuns = 5;
    expect(isMountainOpen(state)).toBe(false);
    state.gear.owned = ["starter", "trail"];
    state.gear.equipped = "trail";
    state.gear.miles.trail = 0;
    expect(isMountainOpen(state)).toBe(true);
    const shut = applyRun(fresh(), "ridge-repeats");
    expect(shut.ok).toBe(false);
    const open = applyRun(state, "ridge-repeats");
    expect(open.ok).toBe(true);
    expect(open.state.progress.mountainRuns).toBe(1);
    expect(open.state.xp.trail).toBeGreaterThan(0);
  });

  it("equips shoes you own without charging, and buying resets miles", () => {
    const state = fresh();
    state.coins = 90;
    const purchase = applyShoe(state, "trail");
    expect(purchase.ok).toBe(true);
    expect(purchase.state.gear.equipped).toBe("trail");
    expect(purchase.state.coins).toBe(0);
    purchase.state.gear.miles.trail = 40;
    purchase.state.coins = 20;
    const back = applyEquip(purchase.state, "starter");
    expect(back.state.gear.equipped).toBe("starter");
    expect(back.state.coins).toBe(20);
  });
});

describe("energy blocks and gels", () => {
  it("starts at 10, spends 1 or 2, and refills completely on sleep", () => {
    const easy = applyRun(fresh(), "easy-run");
    expect(easy.state.energy).toBe(9);
    const long = applyRun(fresh(), "long-run");
    expect(long.state.energy).toBe(8);
    expect(long.state.calendar.slot).toBe(1);
    const tired = fresh();
    tired.energy = 2;
    const slept = applySleep(tired);
    expect(slept.state.energy).toBe(10);
    expect(slept.state.calendar.slot).toBe(0);
    expect(slept.state.nappedToday).toBe(false);
  });

  it("lets you nap once in the daytime without giving energy back", () => {
    const first = applyNap(fresh());
    expect(first.ok).toBe(true);
    expect(first.state.energy).toBe(9);
    expect(first.state.condition.fatigue).toBe(0);
    expect(first.state.nappedToday).toBe(true);
    const second = applyNap(first.state);
    expect(second.ok).toBe(false);
    const late = fresh();
    late.energy = 4;
    expect(applyNap(late).ok).toBe(false);
  });

  it("cooks once a day at home for free, then the kitchen closes until sleep", () => {
    const start = fresh();
    start.condition.nutrition = 40;
    start.energy = 3;
    const meal = applyHomeFood(start, "meal");
    expect(meal.ok).toBe(true);
    expect(meal.state.condition.nutrition).toBe(68);
    expect(meal.state.condition.mealQuality).toBe("good");
    expect(meal.state.condition.junk).toBe(false);
    expect(meal.state.energy).toBe(3);
    expect(meal.state.coins).toBe(48);
    expect(meal.state.calendar.homeMealUsed).toBe(true);
    expect(applyHomeFood(meal.state, "meal").ok).toBe(false);

    const snack = applyHomeFood(meal.state, "snack");
    expect(snack.ok).toBe(true);
    expect(snack.state.condition.nutrition).toBe(82);
    expect(snack.state.condition.mealQuality).toBe("poor");
    expect(snack.state.condition.junk).toBe(true);
    expect(snack.state.energy).toBe(3);
    expect(applyHomeFood(snack.state, "snack").ok).toBe(false);

    const morning = applySleep(snack.state);
    expect(morning.state.calendar.homeMealUsed).toBe(false);
    expect(morning.state.calendar.homeSnackUsed).toBe(false);
    expect(morning.state.energy).toBe(10);
  });

  it("buys grocery food without spending an energy block", () => {
    const state = fresh();
    state.energy = 1;
    const bought = applyPurchase(state, "meal");
    expect(bought.ok).toBe(true);
    expect(bought.state.energy).toBe(1);
    expect(bought.state.coins).toBe(30);
  });

  it("buys a gel for coins only, and eating one adds a single block", () => {
    const bought = applyPurchase(fresh(), "gel");
    expect(bought.ok).toBe(true);
    expect(bought.state.gels).toBe(1);
    expect(bought.state.energy).toBe(10);
    expect(bought.state.coins).toBe(36);
    const full = applyEatGel(bought.state);
    expect(full.ok).toBe(false);
    const hungry = bought.state;
    hungry.energy = 8;
    hungry.condition.nutrition = 40;
    const eaten = applyEatGel(hungry);
    expect(eaten.ok).toBe(true);
    expect(eaten.state.energy).toBe(9);
    expect(eaten.state.gels).toBe(0);
    expect(eaten.state.condition.nutrition).toBe(52);
  });
});
