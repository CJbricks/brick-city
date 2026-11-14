/**
 * activities.test.js
 * The week, played as data. These tests run the same functions the menus
 * call: an easy run, three rest days, Sunday's summary, a bonked 5K, a
 * clean 5K, the rival, and the unlock checks.
 *
 * Track and park workouts are in here too. Threshold and Interval Run
 * have to raise Peak more than Endurance and cost two energy blocks.
 * Zone 2 raises both meters about evenly and costs one.
 *
 * Home meals, snacks, and naps are in here too. A free meal is a third
 * of the FOOD cap. The fourth plate and the third snack cost coins.
 * The third nap does not. Sleep puts the counters back to zero.
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
  homeMealPortion,
  menuFor,
  perform,
} from "@/lib/activities";
import { slotFromEnergy } from "@/lib/calendar";
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
    expect(slept.state.napsToday).toBe(0);
  });

  it("cooks at home for free without spending energy, and restocks after sleep", () => {
    const start = fresh();
    start.condition.nutrition = 40;
    start.energy = 3;
    const meal = applyHomeFood(start, "meal");
    expect(meal.ok).toBe(true);
    expect(meal.state.condition.nutrition).toBe(74);
    expect(meal.state.condition.mealName).toBe("Kitchen oatmeal");
    expect(meal.state.condition.mealQuality).toBe("good");
    expect(meal.state.condition.junk).toBe(false);
    expect(meal.state.energy).toBe(3);
    expect(meal.state.coins).toBe(48);
    expect(meal.state.calendar.homeMeals).toBe(1);

    const snack = applyHomeFood(meal.state, "snack");
    expect(snack.ok).toBe(true);
    expect(snack.state.condition.nutrition).toBe(86);
    expect(snack.state.condition.mealName).toBe("Pantry snack");
    expect(snack.state.condition.mealQuality).toBe("poor");
    expect(snack.state.condition.junk).toBe(true);
    expect(snack.state.energy).toBe(3);
    expect(snack.state.calendar.homeSnacks).toBe(1);

    const morning = applySleep(snack.state);
    expect(morning.state.calendar.homeMeals).toBe(0);
    expect(morning.state.calendar.homeSnacks).toBe(0);
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
    const snack = applyPurchase(bought.state, "snack");
    expect(snack.ok).toBe(true);
    expect(snack.state.energy).toBe(1);
    expect(snack.state.coins).toBe(23);
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

function meterGain(runId) {
  const before = fresh();
  const result = applyRun(before, runId);
  return {
    result,
    peak: result.state.condition.peak - before.condition.peak,
    endurance: result.state.condition.endurance - before.condition.endurance,
    fatigue: result.state.condition.fatigue - before.condition.fatigue,
    energy: before.energy - result.state.energy,
  };
}

function menuIds(locationId) {
  return menuFor(locationId, fresh()).items
    .map((entry) => entry.action?.id)
    .filter(Boolean);
}

describe("track, treadmill, and park workouts", () => {
  it("puts threshold and interval runs on the track and the treadmill, and zone 2 on the park", () => {
    expect(menuIds("track")).toEqual(expect.arrayContaining(["intervals", "threshold", "interval-run", "5k"]));
    expect(menuIds("gym")).toEqual(expect.arrayContaining(["treadmill", "threshold", "interval-run"]));
    expect(menuIds("park")).toContain("zone-2");
    expect(menuIds("gym")).not.toContain("zone-2");
    expect(menuIds("park")).not.toContain("threshold");
    expect(menuIds("track")).not.toContain("zone-2");

    const track = menuFor("track", fresh());
    expect(track.items.find((entry) => entry.action.id === "threshold").label).toBe("Threshold Run");
    expect(track.items.find((entry) => entry.action.id === "interval-run").label).toBe("Interval Run");
    expect(menuFor("park", fresh()).items.find((entry) => entry.action.id === "zone-2").label).toBe("Zone 2 Run");
  });

  it("runs every track workout to the end, including the 5K", () => {
    const menu = menuFor("track", fresh());
    for (const id of ["intervals", "threshold", "interval-run"]) {
      const item = menu.items.find((entry) => entry.action.id === id);
      const done = perform(fresh(), item.action, 0.9, () => 0.9);
      expect(done.ok, id).toBe(true);
      expect(done.lines.length, id).toBeGreaterThan(0);
      expect(done.state.energy, id).toBeLessThan(10);
      expect(done.state.xp.overall, id).toBeGreaterThan(0);
      expect(done.state.progress.totalMiles, id).toBeGreaterThan(0);
      expect(done.state.condition.peak, id).toBeGreaterThan(20);
    }
    const raceItem = menu.items.find((entry) => entry.action.id === "5k");
    expect(raceItem.action).toEqual({ type: "open-race", id: "5k" });
    const raced = applyRace(fresh(), "5k", 0.9);
    expect(raced.ok).toBe(true);
    expect(raced.state.progress.fiveKFinished).toBe(true);
    expect(raced.state.energy).toBe(9);
    expect(raced.state.xp.overall).toBeGreaterThan(0);
  });

  it("makes threshold and interval runs raise Peak more than Endurance", () => {
    for (const id of ["threshold", "interval-run"]) {
      const gain = meterGain(id);
      expect(gain.result.ok, id).toBe(true);
      expect(gain.endurance, id).toBeGreaterThan(0);
      expect(gain.peak, id).toBeGreaterThan(gain.endurance);
      expect(gain.fatigue, id).toBeGreaterThan(meterGain("easy-run").fatigue);
      expect(gain.energy, id).toBe(2);
      expect(gain.result.state.calendar.trainedToday, id).toBe(true);
    }
    // One block left is not enough for a heavy session. The menu says so
    // before the run starts, and the run itself refuses.
    const tired = fresh();
    tired.energy = 1;
    const row = menuFor("track", tired).items.find((entry) => entry.action.id === "threshold");
    expect(row.disabled).toBe(true);
    expect(row.detail).toMatch(/2 energy/);
    const refused = applyRun(tired, "interval-run");
    expect(refused.ok).toBe(false);
    expect(refused.state).toBe(tired);
    expect(tired.energy).toBe(1);
  });

  it("counts a hard speed session toward soreness and leaves zone 2 easy", () => {
    const cooked = fresh();
    cooked.condition.fatigue = 70;
    expect(applyRun(cooked, "threshold").state.condition.sore).toBe(true);
    const also = fresh();
    also.condition.fatigue = 70;
    expect(applyRun(also, "interval-run").state.condition.sore).toBe(true);
    const easy = fresh();
    easy.condition.fatigue = 70;
    expect(applyRun(easy, "zone-2").state.condition.sore).toBe(false);
  });

  it("makes a zone 2 run raise Endurance and Peak about evenly", () => {
    const gain = meterGain("zone-2");
    expect(gain.result.ok).toBe(true);
    expect(gain.endurance).toBeGreaterThan(0);
    expect(gain.peak).toBeGreaterThan(0);
    expect(Math.abs(gain.endurance - gain.peak)).toBeLessThanOrEqual(1);
    expect(gain.energy).toBe(1);
    expect(gain.fatigue).toBeGreaterThan(0);
    expect(gain.fatigue).toBeLessThan(meterGain("threshold").fatigue);
    expect(gain.result.lines.join(" ")).toMatch(/Endurance and Peak/);
    const broke = fresh();
    broke.energy = 0;
    expect(applyRun(broke, "zone-2").ok).toBe(false);
  });
});

describe("daily meals, snacks, and naps", () => {
  it("adds 34 food on the first meal and caps at 100", () => {
    expect(homeMealPortion(100, 0)).toBe(34);
    expect(homeMealPortion(100, 1)).toBe(33);
    expect(homeMealPortion(100, 2)).toBe(33);

    const empty = fresh();
    empty.condition.nutrition = 0;
    const first = applyHomeFood(empty, "meal");
    expect(first.ok).toBe(true);
    expect(first.state.condition.nutrition).toBe(34);

    const high = fresh();
    high.condition.nutrition = 90;
    const capped = applyHomeFood(high, "meal");
    expect(capped.state.condition.nutrition).toBe(100);
  });

  it("fills an empty bar to 100 across three free meals", () => {
    let state = fresh();
    state.condition.nutrition = 0;
    const gained = [];
    for (let i = 0; i < 3; i += 1) {
      const before = state.condition.nutrition;
      const meal = applyHomeFood(state, "meal");
      expect(meal.ok).toBe(true);
      expect(meal.state.coins).toBe(48);
      gained.push(meal.state.condition.nutrition - before);
      state = meal.state;
    }
    expect(gained).toEqual([34, 33, 33]);
    expect(state.condition.nutrition).toBe(100);
    expect(state.calendar.homeMeals).toBe(3);
    expect(homeMealPortion(105, 0) + homeMealPortion(105, 1) + homeMealPortion(105, 2)).toBe(105);
    expect(homeMealPortion(110, 0) + homeMealPortion(110, 1) + homeMealPortion(110, 2)).toBe(110);
  });

  it("blocks the fourth meal until you pay, and the grocery stays open", () => {
    let state = fresh();
    state.condition.nutrition = 0;
    state.coins = 0;
    for (let i = 0; i < 3; i += 1) {
      const meal = applyHomeFood(state, "meal");
      expect(meal.ok).toBe(true);
      state = meal.state;
    }
    const fourth = applyHomeFood(state, "meal");
    expect(fourth.ok).toBe(false);
    expect(fourth.lines[0]).toBe("Free meals used. Buy one for 18 coins?");
    expect(fourth.state.condition.nutrition).toBe(100);
    expect(fourth.state.calendar.homeMeals).toBe(3);

    state.coins = 18;
    state.condition.nutrition = 40;
    const bought = applyHomeFood(state, "meal");
    expect(bought.ok).toBe(true);
    expect(bought.state.coins).toBe(0);
    expect(bought.state.condition.nutrition).toBe(73);
    expect(bought.state.calendar.homeMeals).toBe(3);

    const shopper = fresh();
    shopper.calendar.homeMeals = 3;
    shopper.calendar.homeMealUsed = true;
    shopper.condition.nutrition = 40;
    const grocery = applyPurchase(shopper, "meal");
    expect(grocery.ok).toBe(true);
    expect(grocery.state.coins).toBe(30);
    expect(grocery.state.condition.nutrition).toBe(72);
  });

  it("blocks the third snack until you pay, and keeps the pantry effect", () => {
    let state = fresh();
    state.condition.nutrition = 40;
    state.coins = 0;
    const first = applyHomeFood(state, "snack");
    expect(first.ok).toBe(true);
    expect(first.state.condition.nutrition).toBe(52);
    expect(first.state.condition.junk).toBe(true);
    expect(first.state.condition.mealQuality).toBe("poor");
    expect(first.state.condition.mealName).toBe("Pantry snack");
    const second = applyHomeFood(first.state, "snack");
    expect(second.ok).toBe(true);
    expect(second.state.condition.nutrition).toBe(64);
    expect(second.state.calendar.homeSnacks).toBe(2);
    const third = applyHomeFood(second.state, "snack");
    expect(third.ok).toBe(false);
    expect(third.lines[0]).toBe("Free snacks used. Buy one for 7 coins?");
    expect(third.state.calendar.homeSnacks).toBe(2);

    second.state.coins = 7;
    const paid = applyHomeFood(second.state, "snack");
    expect(paid.ok).toBe(true);
    expect(paid.state.coins).toBe(0);
    expect(paid.state.condition.nutrition).toBe(76);
    expect(paid.state.condition.junk).toBe(true);
    expect(paid.state.calendar.homeSnacks).toBe(2);
  });

  it("adds 3 energy capped at 10, moves the clock one step, and blocks the third nap", () => {
    const low = fresh();
    low.energy = 4;
    low.calendar.slot = slotFromEnergy(4);
    const first = applyNap(low);
    expect(first.ok).toBe(true);
    expect(first.state.energy).toBe(7);
    expect(first.state.calendar.slot).toBe(slotFromEnergy(4) + 1);
    expect(first.state.napsToday).toBe(1);
    expect(first.state.condition.fatigue).toBe(0);

    const second = applyNap(first.state);
    expect(second.ok).toBe(true);
    expect(second.state.energy).toBe(10);
    expect(second.state.napsToday).toBe(2);

    const third = applyNap(second.state);
    expect(third.ok).toBe(false);
    expect(third.lines[0]).toBe("You've already napped twice today. Sleep will start a new day.");
    expect(third.state.energy).toBe(10);
    expect(third.state.napsToday).toBe(2);

    const almost = fresh();
    almost.energy = 8;
    almost.calendar.slot = slotFromEnergy(8);
    const capped = applyNap(almost);
    expect(capped.ok).toBe(true);
    expect(capped.state.energy).toBe(10);

    const full = applyNap(fresh());
    expect(full.state.energy).toBe(10);
    expect(full.state.calendar.slot).toBe(1);
    const later = applyRun(full.state, "long-run");
    expect(later.state.energy).toBe(8);
    expect(later.state.calendar.slot).toBe(2);
  });

  it("resets meal, snack, and nap counters after sleep", () => {
    let state = fresh();
    state.condition.nutrition = 40;
    state = applyHomeFood(state, "meal").state;
    state = applyHomeFood(state, "snack").state;
    state = applyNap(state).state;
    expect(state.calendar.homeMeals).toBe(1);
    expect(state.calendar.homeSnacks).toBe(1);
    expect(state.napsToday).toBe(1);
    expect(state.nappedToday).toBe(true);

    const morning = applySleep(state);
    expect(morning.ok).toBe(true);
    expect(morning.state.calendar.homeMeals).toBe(0);
    expect(morning.state.calendar.homeSnacks).toBe(0);
    expect(morning.state.napsToday).toBe(0);
    expect(morning.state.nappedToday).toBe(false);
    expect(morning.state.calendar.homeMealUsed).toBe(false);
    expect(morning.state.calendar.homeSnackUsed).toBe(false);
    expect(morning.state.energy).toBe(10);
    expect(morning.state.calendar.slot).toBe(0);

    const again = applyHomeFood(morning.state, "meal");
    expect(again.ok).toBe(true);
    expect(again.state.calendar.homeMeals).toBe(1);
    const napped = applyNap(again.state);
    expect(napped.ok).toBe(true);
    expect(napped.state.napsToday).toBe(1);
  });

  it("shows the counters in the Home menu and offers coins instead of closing the kitchen", () => {
    const open = menuFor("home", fresh());
    expect(open.intro).toContain("Meals 0/3");
    expect(open.intro).toContain("Snacks 0/2");
    expect(open.intro).toContain("Naps 0/2");
    const meal = open.items.find((entry) => entry.action.id === "meal");
    const snack = open.items.find((entry) => entry.action.id === "snack");
    const nap = open.items.find((entry) => entry.action.type === "nap");
    expect(meal.detail).toContain("+34 FOOD");
    expect(meal.detail).toContain("Meals 0/3");
    expect(meal.disabled).toBe(false);
    expect(snack.detail).toContain("+12 FOOD");
    expect(nap.label).toBe("Nap");
    expect(nap.disabled).toBe(false);
    expect(open.items[0].label).toBe("Sleep");
    expect(open.items[1].label).toBe("Nap");

    const used = fresh();
    used.calendar.homeMeals = 3;
    used.calendar.homeMealUsed = true;
    used.calendar.homeSnacks = 2;
    used.calendar.homeSnackUsed = true;
    used.napsToday = 2;
    used.nappedToday = true;
    const closed = menuFor("home", used);
    expect(closed.intro).toContain("Meals 3/3 · Snacks 2/2 · Naps 2/2");
    const paidMeal = closed.items.find((entry) => entry.action.id === "meal");
    const paidSnack = closed.items.find((entry) => entry.action.id === "snack");
    const tired = closed.items.find((entry) => entry.action.type === "nap");
    expect(paidMeal.detail).toBe("Free meals used. Buy one for 18 coins?");
    expect(paidMeal.disabled).toBe(false);
    expect(paidSnack.detail).toBe("Free snacks used. Buy one for 7 coins?");
    expect(paidSnack.disabled).toBe(false);
    expect(tired.disabled).toBe(true);
    expect(tired.disabledReason).toBe("You've already napped twice today. Sleep will start a new day.");

    used.coins = 0;
    const broke = menuFor("home", used);
    expect(broke.items.find((entry) => entry.action.id === "meal").disabled).toBe(true);
    expect(broke.items.find((entry) => entry.action.id === "meal").disabledReason).toBe("Not enough coins.");
  });
});
