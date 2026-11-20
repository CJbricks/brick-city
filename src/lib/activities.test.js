/**
 * activities.test.js
 * The week, played as data. These tests run the same functions the menus
 * call: an easy run, three rest days, Sunday's summary, a bonked 5K, a
 * clean 5K, the rival, and the unlock checks.
 *
 * Track and park workouts are in here too. Threshold and Interval Run
 * have to raise Peak more than Endurance and cost four energy blocks.
 * Zone 2 raises both meters about evenly and costs three.
 *
 * Home meals, snacks, and naps are in here too. A free meal is a third
 * of the FOOD cap. The fourth plate and the third snack cost coins.
 * The third nap does not. Sleep puts the counters back to zero.
 *
 * The Run Store deck is in here too. Every card needs one best-paying
 * answer. The same card stays up if you look twice in one day. The
 * next day, and the next shift today, move on. Old saves and the old
 * shoes / stock / gait ids still pay.
 *
 * The town-square activity board is in here too. The easy loop rests
 * you. The speed loop costs four energy and raises Peak more than
 * Endurance. The 5K time trial uses the race clock and stores a PB.
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
  fiveKPbLine,
  homeMealPortion,
  isAfterDark,
  menuFor,
  nextSoreness,
  nightRiskOf,
  perform,
  RUNS,
} from "@/lib/activities";
import { slotFromEnergy } from "@/lib/calendar";
import { SHIFT_POOL, currentShift } from "@/lib/shifts";
import { deserialize, serialize } from "@/lib/save";
import { RACES } from "@/lib/race";
import {
  CLINIC_TREATMENT_ENERGY,
  HALF_UNLOCK_LEVEL,
  MARATHON_UNLOCK_LEVEL,
  NIGHT_MENTAL_CITY,
  NIGHT_MENTAL_PARK,
  NIGHT_MENTAL_TRAIL,
  NIGHT_RISK_CITY,
  NIGHT_RISK_PARK,
  NIGHT_RISK_TRAIL,
  NIGHT_RUN_MIN_SLOT,
  OBLIGATION_ENERGY,
  SHIFT_ENERGY,
  START_COINS,
} from "@/lib/constants";
import {
  isHalfOpen,
  isMarathonOpen,
  isMountainOpen,
  isTenKOpen,
  mountainStatus,
} from "@/lib/unlocks";
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
    expect(result.state.condition.nutrition).toBe(52);
    expect(result.state.energy).toBe(7);
    expect(result.state.calendar.slot).toBe(1);
    expect(result.state.calendar.trainedToday).toBe(true);
    expect(result.state.xp.overall).toBe(12);
    expect(result.state.xp.versatile).toBe(4);
    expect(result.state.attributes.recovery).toBe(8);
    expect(result.state.progress.totalMiles).toBe(2);
    expect(result.state.gear.miles.starter).toBe(2);
    expect(result.ticker).toBe("+2 Endurance ▲  +1 Peak ▲  −10 Fatigue ▼  −18 Nutrition ▼");
  });

  it("refuses a long run when fewer than four energy blocks are left", () => {
    const state = fresh();
    state.energy = 2;
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

function bestChoice(scenario) {
  return scenario.choices.reduce((best, choice) => (choice.coins > best.coins ? choice : best));
}

describe("the run store shift deck", () => {
  it("gives every card one top-paying answer inside the coin bands", () => {
    const speakers = new Set([
      "Customer",
      "Manager Nia",
      "Juniper Hale",
      "Coach Bram",
      "Nell Park",
      "Priya Sen",
      "Otto Bramble",
      "Sable Ortiz",
      "Tomas Reed",
    ]);
    const banned = [
      "Nike",
      "Hoka",
      "Brooks",
      "Adidas",
      "Salomon",
      "Asics",
      "Saucony",
      "New Balance",
      "Maurten",
      "Gatorade",
      "Nuun",
      "Balega",
      "Injinji",
      "Smartwool",
      "Altra",
    ];
    const blob = JSON.stringify(SHIFT_POOL);
    for (const name of banned) {
      expect(blob.toLowerCase()).not.toContain(name.toLowerCase());
    }

    expect(SHIFT_POOL.length).toBeGreaterThanOrEqual(24);
    expect(SHIFT_POOL.slice(0, 3).map((scenario) => scenario.id)).toEqual(["shoes", "stock", "gait"]);
    const ids = SHIFT_POOL.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const scenario of SHIFT_POOL) {
      expect(speakers.has(scenario.speaker)).toBe(true);
      expect(scenario.text.trim().length).toBeGreaterThan(0);
      expect(scenario.choices.length).toBeGreaterThanOrEqual(2);
      expect(scenario.choices.length).toBeLessThanOrEqual(3);
      const choiceIds = scenario.choices.map((choice) => choice.id);
      expect(new Set(choiceIds).size).toBe(choiceIds.length);

      const ranked = [...scenario.choices].sort((a, b) => b.coins - a.coins);
      const tops = scenario.choices.filter((choice) => choice.coins === ranked[0].coins);
      expect(tops).toHaveLength(1);
      expect(ranked[0].coins).toBeGreaterThanOrEqual(20);
      expect(ranked[0].coins).toBeLessThanOrEqual(22);
      expect(ranked[0].label.trim().length).toBeGreaterThan(0);
      expect(ranked[0].reply.trim().length).toBeGreaterThan(0);

      if (scenario.choices.length === 2) {
        expect(ranked[1].coins).toBeGreaterThanOrEqual(11);
        expect(ranked[1].coins).toBeLessThanOrEqual(16);
        expect(ranked[1].coins).toBeLessThan(ranked[0].coins);
      } else {
        expect(ranked[1].coins).toBeGreaterThanOrEqual(17);
        expect(ranked[1].coins).toBeLessThanOrEqual(19);
        expect(ranked[1].coins).toBeLessThan(ranked[0].coins);
        expect(ranked[2].coins).toBeGreaterThanOrEqual(11);
        expect(ranked[2].coins).toBeLessThanOrEqual(16);
        expect(ranked[2].coins).toBeLessThan(ranked[1].coins);
      }
      for (const choice of scenario.choices) {
        expect(choice.label.trim().length).toBeGreaterThan(0);
        expect(choice.reply.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the original three scenes and the six extra floor jobs", () => {
    const shoes = SHIFT_POOL.find((scenario) => scenario.id === "shoes");
    expect(shoes).toMatchObject({
      speaker: "Customer",
      text: "I'm running the park dirt loop today. What should I buy?",
      choices: [
        {
          id: "trail",
          label: "Trail shoes",
          coins: 22,
          reply: "They buy the Peakline Luggers. The till is heavier for it.",
        },
        {
          id: "flats",
          label: "Racing flats",
          coins: 11,
          reply: "They glance at the mud and buy them anyway. Smaller sale.",
        },
      ],
    });
    const stock = SHIFT_POOL.find((scenario) => scenario.id === "stock");
    expect(stock.choices.map((choice) => choice.id)).toEqual(["flavor", "caffeine"]);
    expect(stock.choices.find((choice) => choice.id === "caffeine").coins).toBe(20);
    const gait = SHIFT_POOL.find((scenario) => scenario.id === "gait");
    expect(gait.text).toBe("A runner wants a gait check. What do you watch first?");
    expect(gait.choices.find((choice) => choice.id === "wear").coins).toBe(21);

    const byId = Object.fromEntries(SHIFT_POOL.map((scenario) => [scenario.id, scenario]));
    expect(byId["first-timer"].text).toMatch(/dress shoes/);
    expect(byId["first-timer"].text).toMatch(/9/);
    expect(bestChoice(byId["first-timer"]).label.toLowerCase()).toMatch(/thumb/);
    expect(byId["race-rush"].text).toMatch(/5K/);
    expect(bestChoice(byId["race-rush"]).label.toLowerCase()).toMatch(/sock/);
    const raceWeak = byId["race-rush"].choices.find((choice) => choice.id !== bestChoice(byId["race-rush"]).id);
    expect(raceWeak.coins).toBeLessThan(bestChoice(byId["race-rush"]).coins);
    expect(raceWeak.reply.toLowerCase()).toMatch(/return/);
    expect(byId["muddy-return"].text.toLowerCase()).toMatch(/mud/);
    expect(bestChoice(byId["muddy-return"]).label.toLowerCase()).toMatch(/exchange/);
    expect(byId["group-run"].text.toLowerCase()).toMatch(/jog/);
    expect(bestChoice(byId["group-run"]).label.toLowerCase()).toMatch(/pace/);
    expect(byId["group-run"].choices.some((choice) => choice.reply.toLowerCase().includes("straggler"))).toBe(true);
    expect(byId["hot-hydration"].text.toLowerCase()).toMatch(/hot/);
    expect(bestChoice(byId["hot-hydration"]).label.toLowerCase()).toMatch(/electrolyte/);
    expect(byId["sock-blister"].text.toLowerCase()).toMatch(/cotton/);
    expect(bestChoice(byId["sock-blister"]).label.toLowerCase()).toMatch(/merino/);
  });

  it("lists one shift on the board and keeps the label when the card changes", () => {
    const store = menuFor("store", fresh());
    const shifts = store.items.filter((entry) => entry.action.type === "open-shift");
    expect(shifts).toHaveLength(1);
    expect(shifts[0].label).toBe("Work a shift");
    expect(shifts[0].detail).toBe("2 energy");
    expect(shifts[0].disabled).toBe(false);

    const tired = fresh();
    tired.energy = 0;
    const blocked = menuFor("store", tired).items.find((entry) => entry.action.type === "open-shift");
    expect(blocked.disabled).toBe(true);

    const later = fresh();
    later.calendar.shiftCursor = 4;
    const laterMenu = menuFor("store", later).items.find((entry) => entry.action.type === "open-shift");
    expect(laterMenu.label).toBe("Work a shift");
    expect(laterMenu.detail).toBe("2 energy");
  });

  it("stays on the same card all day, then changes without repeating yesterday", () => {
    const state = fresh();
    const opening = currentShift(state);
    expect(opening.id).toBe("shoes");
    expect(currentShift(state)).toBe(opening);

    const looked = fresh();
    const firstLook = currentShift(looked).id;
    expect(currentShift(looked).id).toBe(firstLook);
    expect(looked.calendar.shiftCursor).toBe(0);

    const nextDay = applySleep(fresh()).state;
    expect(currentShift(nextDay).id).toBe("stock");
    expect(currentShift(nextDay).id).not.toBe(opening.id);

    const third = applySleep(nextDay).state;
    expect(currentShift(third).id).toBe("gait");
    expect(currentShift(third).id).not.toBe(currentShift(nextDay).id);
  });

  it("gives each finished shift today a new card and pays that card's coins", () => {
    let state = fresh();
    const first = currentShift(state);
    const firstBest = bestChoice(first);
    const worked = applyShift(state, first.id, firstBest.id);
    expect(worked.ok).toBe(true);
    expect(worked.state.coins).toBe(48 + firstBest.coins);
    expect(worked.state.calendar.shiftsToday).toBe(1);
    const shownNext = currentShift(worked.state).id;
    expect(shownNext).not.toBe(first.id);
    expect(currentShift(worked.state).id).toBe(shownNext);
    expect(worked.state.calendar.shiftCursor).toBe(1);

    const second = currentShift(worked.state);
    const secondBest = bestChoice(second);
    const again = applyShift(worked.state, second.id, secondBest.id);
    expect(again.ok).toBe(true);
    expect(again.state.coins).toBe(48 + firstBest.coins + secondBest.coins);
    expect(again.state.calendar.trainedToday).toBe(false);

    const wrong = applyShift(worked.state, second.id, firstBest.id);
    expect(wrong.ok).toBe(false);
    expect(wrong.state).toBe(worked.state);

    const seen = [first.id, second.id];
    let morning = applySleep(again.state).state;
    expect(seen).not.toContain(currentShift(morning).id);
    expect(morning.calendar.shiftsToday).toBe(0);
  });

  it("walks the whole deck, then wraps to the first card", () => {
    let state = fresh();
    const seen = [];
    for (let i = 0; i < SHIFT_POOL.length; i += 1) {
      state.energy = 10;
      const card = currentShift(state);
      seen.push(card.id);
      const paid = applyShift(state, card.id, bestChoice(card).id);
      expect(paid.ok).toBe(true);
      expect(paid.state.coins).toBe(state.coins + bestChoice(card).coins);
      state = paid.state;
    }
    expect(seen).toEqual(SHIFT_POOL.map((scenario) => scenario.id));
    expect(new Set(seen).size).toBe(SHIFT_POOL.length);
    expect(currentShift(state).id).toBe(SHIFT_POOL[0].id);
  });

  it("refuses a card that is not on the counter, and still pays the old job ids", () => {
    const state = fresh();
    const today = currentShift(state);
    const later = SHIFT_POOL.find((scenario) => scenario.id === "sock-blister");
    const forged = applyShift(state, later.id, bestChoice(later).id);
    expect(forged.ok).toBe(false);
    expect(forged.state).toBe(state);
    expect(state.calendar.shiftCursor).toBe(0);
    expect(state.coins).toBe(48);

    const missed = applyShift(state, today.id, "wear");
    expect(missed.ok).toBe(false);
    expect(missed.state).toBe(state);

    const shoes = applyShift(fresh(), "shoes", "trail");
    expect(shoes.ok).toBe(true);
    expect(shoes.state.coins).toBe(70);
    const stock = applyShift(fresh(), "stock", "caffeine");
    expect(stock.ok).toBe(true);
    expect(stock.state.coins).toBe(68);
    const weak = applyShift(fresh(), "gait", "speed");
    expect(weak.ok).toBe(true);
    expect(weak.state.coins).toBe(60);
    expect(applyShift(fresh(), "shoes", "wear").ok).toBe(false);
    expect(applyShift(fresh(), "not-a-job", "trail").ok).toBe(false);
    const viaMenu = perform(fresh(), { type: "shift", job: "stock", choice: "flavor" });
    expect(viaMenu.ok).toBe(true);
    expect(viaMenu.state.coins).toBe(64);

    const broke = fresh();
    broke.energy = 0;
    const refused = applyShift(broke, "gait", "wear");
    expect(refused.ok).toBe(false);
    expect(refused.state).toBe(broke);
    expect(broke.coins).toBe(48);
    expect(broke.calendar.shiftCursor).toBe(0);
  });

  it("loads an old save with no deck bookmark and still runs a shift", () => {
    const legacy = fresh();
    delete legacy.calendar.shiftCursor;
    delete legacy.calendar.shiftsToday;
    const loaded = deserialize(serialize(legacy));
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(1);
    expect(loaded.runner.name).toBe("ADA");
    expect(loaded.calendar.shiftCursor).toBeUndefined();
    expect(loaded.calendar.shiftsToday).toBeUndefined();
    expect(currentShift(loaded).id).toBe("shoes");

    loaded.calendar.day = 2;
    expect(currentShift(loaded).id).toBe("stock");
    expect(currentShift(loaded).id).not.toBe("shoes");
    loaded.calendar.shiftsToday = 1;
    expect(currentShift(loaded).id).toBe("gait");
    expect(loaded.calendar.shiftCursor).toBeUndefined();

    const paid = applyShift(loaded, "gait", "wear");
    expect(paid.ok).toBe(true);
    expect(paid.state.coins).toBe(loaded.coins + 21);
    expect(paid.state.calendar.shiftCursor).toBe(3);
    const byDay = applyShift(deserialize(serialize(legacy)), currentShift(deserialize(serialize(legacy))).id, "trail");
    expect(byDay.ok).toBe(true);
    expect(byDay.state.coins).toBe(70);
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

  it("refuses the half and marathon until unlock, then pays scaled rewards", () => {
    expect(applyRace(fresh(), "half", 0.8).ok).toBe(false);
    expect(applyRace(fresh(), "marathon", 0.8).ok).toBe(false);

    const halfReady = fresh();
    halfReady.xp.overall = xpToReachLevel(HALF_UNLOCK_LEVEL);
    halfReady.progress.fiveKFinished = true;
    halfReady.progress.tenKFinished = true;
    halfReady.condition.nutrition = 90;
    halfReady.condition.sleepQuality = "good";
    halfReady.condition.fatigue = 10;
    halfReady.energy = 10;
    expect(isHalfOpen(halfReady)).toBe(true);
    const half = applyRace(halfReady, "half", 0.8);
    expect(half.ok).toBe(true);
    expect(half.state.progress.halfFinished).toBe(true);
    expect(half.state.coins).toBe(START_COINS + RACES.half.coins);
    expect(half.state.xp.overall).toBe(halfReady.xp.overall + RACES.half.xp.overall);
    expect(half.state.xp.marathon).toBe(RACES.half.xp.marathon);
    expect(half.state.energy).toBe(10 - RACES.half.energy);
    expect(half.state.condition.fatigue).toBe(10 + RACES.half.fatigue);
    expect(half.lines.join(" ")).toMatch(/Brick City Half/);
    expect(half.lines.join(" ")).not.toMatch(/later season|later build/i);

    const marathonReady = fresh();
    marathonReady.xp.overall = xpToReachLevel(MARATHON_UNLOCK_LEVEL);
    marathonReady.progress.halfFinished = true;
    marathonReady.condition.nutrition = 95;
    marathonReady.condition.sleepQuality = "good";
    marathonReady.condition.fatigue = 8;
    marathonReady.condition.endurance = 55;
    marathonReady.condition.peak = 35;
    marathonReady.energy = 10;
    expect(isMarathonOpen(marathonReady)).toBe(true);
    const marathon = applyRace(marathonReady, "marathon", 0.85);
    expect(marathon.ok).toBe(true);
    expect(marathon.state.progress.marathonFinished).toBe(true);
    expect(marathon.state.coins).toBe(START_COINS + RACES.marathon.coins);
    expect(marathon.state.xp.marathon).toBe(RACES.marathon.xp.marathon);
    expect(marathon.state.energy).toBe(10 - RACES.marathon.energy);
    expect(marathon.state.condition.fatigue).toBe(8 + RACES.marathon.fatigue);
    expect(marathon.celebrate).toBe(true);
    expect(marathon.lines.join(" ")).toMatch(/brick-red ribbon|Marathon Running track/i);

    // Energy and FOOD were spent; refill and confirm the first-finish line does not repeat.
    const nextStart = structuredClone(marathon.state);
    nextStart.energy = 10;
    nextStart.condition.nutrition = 95;
    nextStart.condition.fatigue = 8;
    const second = applyRace(nextStart, "marathon", 0.85);
    expect(second.ok).toBe(true);
    expect(second.lines.join(" ")).not.toMatch(/brick-red ribbon/);
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
    expect(eaten.state.energy).toBe(8);
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
  it("starts at 10, spends 3 or 4 on a run, and refills completely on sleep", () => {
    const easy = applyRun(fresh(), "easy-run");
    expect(easy.state.energy).toBe(7);
    const long = applyRun(fresh(), "long-run");
    expect(long.state.energy).toBe(6);
    expect(long.state.calendar.slot).toBe(2);
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
    expect(menuIds("track")).toEqual(
      expect.arrayContaining(["intervals", "threshold", "interval-run", "5k", "half", "marathon"]),
    );
    expect(menuIds("gym")).toEqual(expect.arrayContaining(["treadmill", "threshold", "interval-run"]));
    expect(menuIds("park")).toContain("zone-2");
    expect(menuIds("gym")).not.toContain("zone-2");
    expect(menuIds("park")).not.toContain("threshold");
    expect(menuIds("track")).not.toContain("zone-2");

    const track = menuFor("track", fresh());
    expect(track.items.find((entry) => entry.action.id === "threshold").label).toBe("Threshold Run");
    expect(track.items.find((entry) => entry.action.id === "interval-run").label).toBe("Interval Run");
    expect(menuFor("park", fresh()).items.find((entry) => entry.action.id === "zone-2").label).toBe("Zone 2 Run");
    const halfRow = track.items.find((entry) => entry.action.id === "half");
    expect(halfRow.disabled).toBe(true);
    expect(halfRow.detail).toMatch(/to enter/i);
    expect(halfRow.detail).not.toMatch(/later season|later build/i);
    expect(track.items.find((entry) => entry.action.id === "marathon").detail).not.toMatch(/later season|later build/i);
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
    expect(raced.state.energy).toBe(7);
    expect(raced.state.xp.overall).toBeGreaterThan(0);
  });

  it("makes threshold and interval runs raise Peak more than Endurance", () => {
    for (const id of ["threshold", "interval-run"]) {
      const gain = meterGain(id);
      expect(gain.result.ok, id).toBe(true);
      expect(gain.endurance, id).toBeGreaterThan(0);
      expect(gain.peak, id).toBeGreaterThan(gain.endurance);
      expect(gain.fatigue, id).toBeGreaterThan(meterGain("easy-run").fatigue);
      expect(gain.energy, id).toBe(4);
      expect(gain.result.state.calendar.trainedToday, id).toBe(true);
    }
    // One block left is not enough for a heavy session. The menu says so
    // before the run starts, and the run itself refuses.
    const tired = fresh();
    tired.energy = 1;
    const row = menuFor("track", tired).items.find((entry) => entry.action.id === "threshold");
    expect(row.disabled).toBe(true);
    expect(row.detail).toMatch(/4 energy/);
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
    expect(gain.energy).toBe(3);
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
    expect(later.state.energy).toBe(6);
    expect(later.state.calendar.slot).toBe(3);
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

describe("activity board", () => {
  it("lists the neighborhood efforts, including the walk, and their energy", () => {
    const menu = menuFor("activity", fresh());
    expect(menu.testId).toBe("activity-menu");
    expect(menu.items.map((entry) => entry.action.id)).toEqual([
      "neighborhood-easy",
      "neighborhood-walk",
      "neighborhood-speed",
      "neighborhood-5k",
      "night-city",
    ]);
    expect(menu.items[0].detail).toContain("3 energy");
    expect(menu.items[1].detail).toContain("2 energy");
    expect(menu.items[1].detail).not.toContain("mi");
    expect(menu.items[2].detail).toContain("4 energy");
    expect(menu.items[3].detail).toContain("3 energy");
    expect(menu.items[4].detail).toMatch(/Only after dark|Night run/);
    expect(fiveKPbLine(fresh())).toBe("Neighborhood 5K: no PB yet");
  });

  it("lets the easy loop ease fatigue and clear soreness", () => {
    const state = fresh();
    state.condition.sore = true;
    state.condition.fatigue = 74;
    const result = applyRun(state, "neighborhood-easy");
    expect(result.ok).toBe(true);
    expect(result.state.condition.fatigue).toBe(68);
    expect(result.state.condition.sore).toBe(false);
    expect(result.state.condition.endurance).toBe(fresh().condition.endurance + 1);
    expect(result.state.condition.peak).toBe(fresh().condition.peak);
    expect(result.state.energy).toBe(7);
    expect(result.state.calendar.trainedToday).toBe(true);
    expect(result.state.condition.injury).toBeNull();
  });

  it("lets a long walk recover fatigue without miles, soreness, or a blister", () => {
    const state = fresh();
    state.condition.sore = true;
    state.condition.fatigue = 80;
    state.condition.nutrition = 10;
    state.calendar.hardWeeks = 2;
    const beforeMiles = state.progress.totalMiles;
    const result = applyRun(state, "neighborhood-walk");
    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(8);
    expect(result.state.condition.fatigue).toBe(68);
    expect(result.state.condition.endurance).toBe(fresh().condition.endurance + 1);
    expect(result.state.condition.peak).toBe(fresh().condition.peak);
    expect(result.state.xp.overall).toBe(6);
    expect(result.state.progress.totalMiles).toBe(beforeMiles);
    expect(result.state.gear.miles.starter || 0).toBe(0);
    expect(result.state.condition.sore).toBe(true);
    expect(result.state.condition.injury).toBeNull();
    expect(result.state.calendar.trainedToday).toBe(true);
  });

  it("makes the speed loop a heavy peak session", () => {
    const gain = meterGain("neighborhood-speed");
    expect(gain.result.ok).toBe(true);
    expect(gain.energy).toBe(4);
    expect(gain.peak).toBeGreaterThan(gain.endurance);
    expect(gain.endurance).toBeGreaterThan(0);
    expect(gain.fatigue).toBeGreaterThan(0);
    expect(gain.fatigue).toBeGreaterThan(meterGain("neighborhood-easy").fatigue);
    const tired = fresh();
    tired.energy = 2;
    const row = menuFor("activity", tired).items.find((entry) => entry.action.id === "neighborhood-speed");
    expect(row.disabled).toBe(true);
    expect(applyRun(tired, "neighborhood-speed").ok).toBe(false);
  });

  it("times a solo 5K, saves a personal best, and spends three energy", () => {
    const first = applyRun(fresh(), "neighborhood-5k");
    expect(first.ok).toBe(true);
    expect(first.lines[0]).toBe("Neighborhood 5K: 29:05. New PB!");
    expect(first.state.records.fiveK).toBe("29:05");
    expect(first.state.energy).toBe(7);
    expect(first.state.progress.fiveKFinished).toBe(false);
    expect(first.state.progress.totalMiles).toBe(3.1);
    expect(first.state.sponsors.offers.shoe).toBeNull();
    expect(first.state.sponsors.mailbox).toEqual([]);
    expect(fiveKPbLine(first.state)).toBe("Neighborhood 5K PB 29:05");

    const tied = fresh();
    tied.records.fiveK = "29:05";
    const same = applyRun(tied, "neighborhood-5k");
    expect(same.lines[0]).toBe("Neighborhood 5K: 29:05. Your best is still 29:05.");
    expect(same.state.records.fiveK).toBe("29:05");

    const sharp = first.state;
    sharp.energy = 10;
    sharp.condition.endurance = 90;
    sharp.condition.peak = 90;
    sharp.condition.fatigue = 5;
    const better = applyRun(sharp, "neighborhood-5k");
    expect(better.lines[0]).toBe("Neighborhood 5K: 21:10. New PB!");
    expect(better.state.records.fiveK).toBe("21:10");
  });

  it("lets coffee, Race IQ, and road shoes move the 5K clock", () => {
    const base = fresh();
    base.condition.endurance = 40;
    base.condition.peak = 45;
    base.condition.fatigue = 12;
    const plain = applyRun(structuredClone(base), "neighborhood-5k");
    expect(plain.lines[0]).toBe("Neighborhood 5K: 26:40. New PB!");

    const caffeinated = structuredClone(base);
    caffeinated.condition.coffeeNext = "boost";
    const bumped = applyRun(caffeinated, "neighborhood-5k");
    expect(bumped.lines[0]).toBe("Neighborhood 5K: 23:55. New PB!");
    expect(bumped.state.condition.coffeeNext).toBeNull();
    expect(bumped.state.condition.fatigue).toBe(base.condition.fatigue + 12);

    const studied = structuredClone(base);
    studied.raceIq = 8;
    expect(applyRun(studied, "neighborhood-5k").lines[0]).toBe("Neighborhood 5K: 23:55. New PB!");

    const geared = structuredClone(base);
    geared.gear.equipped = "road";
    expect(applyRun(geared, "neighborhood-5k").lines[0]).toBe("Neighborhood 5K: 23:55. New PB!");
  });
});

describe("energy cost +1 bump", () => {
  it("charges one more block than the previous build on paid activities", () => {
    // Named constants for non-run spenders. Free kitchen / coffee / soft
    // tissue stay at 0 and are covered elsewhere.
    expect(SHIFT_ENERGY).toBe(2);
    expect(CLINIC_TREATMENT_ENERGY).toBe(2);
    expect(OBLIGATION_ENERGY).toBe(2);
    expect(RUNS["easy-run"].slots).toBe(3);
    expect(RUNS["long-run"].slots).toBe(4);
    expect(RUNS.strength.slots).toBe(2);
    expect(RUNS["neighborhood-walk"].slots).toBe(2);
    expect(RACES["5k"].energy).toBe(3);
    expect(RACES["10k"].energy).toBe(4);
    expect(RACES.half.energy).toBe(5);
    expect(RACES.marathon.energy).toBe(6);
  });
});

describe("night runs", () => {
  function eveningState() {
    const state = fresh();
    // Evening is slot 3. Enough energy for a 3-block night run.
    state.calendar.slot = NIGHT_RUN_MIN_SLOT;
    state.energy = 4;
    return state;
  }

  it("gates night runs to Evening or Night and shows the warning", () => {
    expect(NIGHT_RUN_MIN_SLOT).toBe(3);
    const morning = fresh();
    expect(isAfterDark(morning)).toBe(false);
    expect(menuFor("park", morning).items.map((row) => row.action.id)).toContain("night-park");
    const dayPark = menuFor("park", morning).items.find((row) => row.action.id === "night-park");
    expect(dayPark.disabled).toBe(true);
    expect(dayPark.detail).toMatch(/Only after dark/);
    expect(applyRun(morning, "night-park").ok).toBe(false);

    const night = eveningState();
    expect(isAfterDark(night)).toBe(true);
    const openPark = menuFor("park", night).items.find((row) => row.action.id === "night-park");
    expect(openPark.disabled).toBe(false);
    expect(openPark.detail).toMatch(/Night run: low visibility, higher injury risk/);
    expect(applyRun(night, "night-park").ok).toBe(true);

    const cityRow = menuFor("activity", night).items.find((row) => row.action.id === "night-city");
    expect(cityRow.detail).toMatch(/Night run: low visibility/);
  });

  it("ranks night injury risk trail > park > city and above day easy runs", () => {
    expect(NIGHT_RISK_TRAIL).toBeGreaterThan(NIGHT_RISK_PARK);
    expect(NIGHT_RISK_PARK).toBeGreaterThan(NIGHT_RISK_CITY);
    expect(nightRiskOf(RUNS["night-trail"])).toBe(NIGHT_RISK_TRAIL);
    expect(nightRiskOf(RUNS["night-park"])).toBe(NIGHT_RISK_PARK);
    expect(nightRiskOf(RUNS["night-city"])).toBe(NIGHT_RISK_CITY);
    expect(nightRiskOf(RUNS["easy-run"])).toBe(0);

    // Fresh runner, no other strikes: day easy stays clear, park night
    // (2 strikes) lights sore, city night (1 strike) stays clear.
    const calm = fresh();
    expect(nextSoreness(calm, RUNS["easy-run"]).sore).toBe(false);
    expect(nextSoreness(calm, RUNS["night-city"]).sore).toBe(false);
    expect(nextSoreness(calm, RUNS["night-park"]).sore).toBe(true);
    expect(nextSoreness(calm, RUNS["night-trail"]).sore).toBe(true);

    // One extra strike (tired) makes city night sore too, and turns an
    // already-sore park night into a blister path for trail.
    const tired = fresh();
    tired.condition.fatigue = 70;
    expect(nextSoreness(tired, RUNS["night-city"]).sore).toBe(true);
    expect(nextSoreness(tired, RUNS["easy-run"]).sore).toBe(false);
  });

  it("pays modest Mental Toughness so night work is worth the risk", () => {
    expect(NIGHT_MENTAL_TRAIL).toBeGreaterThan(NIGHT_MENTAL_PARK);
    expect(NIGHT_MENTAL_PARK).toBeGreaterThan(NIGHT_MENTAL_CITY);
    const park = applyRun(eveningState(), "night-park");
    expect(park.state.attributes.mental).toBe(NIGHT_MENTAL_PARK);
    expect(park.state.xp.overall).toBeGreaterThan(RUNS["easy-run"].xp.overall);

    const city = applyRun(eveningState(), "night-city");
    expect(city.state.attributes.mental).toBe(NIGHT_MENTAL_CITY);

    const mountain = eveningState();
    mountain.progress.parkTrailRuns = 5;
    mountain.xp.overall = xpToReachLevel(8);
    mountain.gear.owned = ["starter", "trail"];
    mountain.gear.equipped = "trail";
    mountain.gear.miles.trail = 0;
    expect(isMountainOpen(mountain)).toBe(true);
    const trail = applyRun(mountain, "night-trail");
    expect(trail.ok).toBe(true);
    expect(trail.state.attributes.mental).toBe(NIGHT_MENTAL_TRAIL);
    expect(trail.state.xp.trail).toBeGreaterThan(0);
  });
});
