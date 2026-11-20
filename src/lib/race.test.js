/**
 * race.test.js
 * Bonk / DNF, the readiness warning, gear trade-offs, Remy's score, and
 * half / marathon distance scaling (energy, XP, coins, fatigue, form).
 * Rolls are passed in so none of this depends on luck.
 */

import { describe, expect, it } from "vitest";
import {
  RACES,
  flavorTime,
  fuelWarning,
  gearLine,
  gearModForStyle,
  judgeBonk,
  readiness,
  rivalScores,
} from "@/lib/race";
import { createNewGame } from "@/lib/activities";

function tiredAndHungry() {
  const state = createNewGame({ name: "Ada", gender: "female" });
  state.condition.nutrition = 20;
  state.condition.sleepQuality = "poor";
  state.condition.fatigue = 30;
  return state;
}

describe("bonk and DNF", () => {
  it("DNFs for sure when nutrition and sleep are both bad, before any gel choice", () => {
    const severe = judgeBonk({
      nutrition: 20,
      sleepQuality: "poor",
      fatigue: 10,
      roll: 0.99,
      km: 5,
    });
    expect(severe).toMatchObject({
      bonk: true,
      dnf: true,
      reason: "low-fuel-poor-sleep",
    });
    const fromFatigue = judgeBonk({
      nutrition: 10,
      sleepQuality: "good",
      fatigue: 80,
      gels: 0,
      roll: 0.2,
      km: 10,
    });
    expect(fromFatigue.reason).toBe("low-fuel-poor-sleep");
    expect(fromFatigue.dnf).toBe(true);
  });

  it("gives a 5K a slow finish and a 10K a DNF when only one side is low", () => {
    const five = judgeBonk({
      nutrition: 20,
      sleepQuality: "good",
      fatigue: 10,
      gels: 0,
      roll: 0.1,
      km: 5,
    });
    expect(five).toMatchObject({ bonk: true, dnf: false, slowFinish: true, reason: "chance-bonk" });
    const ten = judgeBonk({
      nutrition: 70,
      sleepQuality: "poor",
      fatigue: 10,
      gels: 0,
      roll: 0.44,
      km: 10,
    });
    expect(ten.dnf).toBe(true);
    const stillBonks = judgeBonk({
      nutrition: 20,
      sleepQuality: "good",
      fatigue: 10,
      roll: 0.1,
      km: 5,
    });
    expect(stillBonks).toMatchObject({ bonk: true, slowFinish: true, reason: "chance-bonk" });
    const lucky = judgeBonk({
      nutrition: 20,
      sleepQuality: "good",
      fatigue: 10,
      gels: 0,
      roll: 0.5,
      km: 5,
    });
    expect(lucky.reason).toBe("ok");
  });

  it("warns on the readiness screen only for the sure DNF", () => {
    const state = tiredAndHungry();
    expect(fuelWarning(state.condition).text).toBe("⚠ Low fuel + poor sleep: high DNF risk");
    expect(fuelWarning(state.condition).severe).toBe(true);
    const fresh = createNewGame({ name: "Ada", gender: "female" });
    expect(fuelWarning(fresh.condition).severe).toBe(false);
    const race = {
      ideal: { endurance: 0.35, peak: 0.65 },
      idealLabel: "35% Endurance / 65% Peak",
      style: "road",
    };
    const card = readiness(state, race);
    expect(card.warning.severe).toBe(true);
    expect(card.idealLabel).toMatch(/65% Peak/);
  });
});

describe("gear and rivals", () => {
  it("gives trail shoes a road penalty and worn-out shoes a bigger one", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    state.gear.equipped = "trail";
    state.gear.owned = ["starter", "trail"];
    state.gear.miles.trail = 0;
    expect(gearLine(state.gear, "road")).toBe("Peakline Lugger (fresh): −5% road pace");
    expect(gearModForStyle(state.gear, "trail").mod).toBeCloseTo(0.08);
    state.gear.miles.trail = 120;
    expect(gearLine(state.gear, "road")).toBe("Peakline Lugger (worn out): −13% road pace");
  });

  it("lets a sharp runner beat Remy and a fresh runner lose a fair roll", () => {
    const fresh = createNewGame({ name: "Ada", gender: "female" });
    expect(rivalScores(fresh, 0.5).win).toBe(false);
    fresh.attributes.speed = 40;
    fresh.condition.peak = 60;
    fresh.condition.fatigue = 10;
    fresh.condition.endurance = 40;
    expect(rivalScores(fresh, 0.8).win).toBe(true);
    expect(flavorTime({ id: "5k" }, 60, false)).toBe("21:10");
    expect(flavorTime({ id: "5k" }, 10, true)).toBe("31:40");
    expect(flavorTime({ id: "half" }, 60, false)).toBe("1:28:00");
    expect(flavorTime({ id: "marathon" }, 10, true)).toBe("5:40:00");
  });
});

describe("half and marathon race design", () => {
  it("scales energy, XP, coins, fatigue, and FOOD past the 10K", () => {
    const five = RACES["5k"];
    const ten = RACES["10k"];
    const half = RACES.half;
    const marathon = RACES.marathon;

    expect(half.miles).toBe(13.1);
    expect(marathon.miles).toBe(26.2);
    expect(half.energy).toBeGreaterThan(ten.energy);
    expect(marathon.energy).toBeGreaterThan(half.energy);
    expect(half.fatigue).toBeGreaterThan(ten.fatigue);
    expect(marathon.fatigue).toBeGreaterThan(half.fatigue);
    expect(half.nutrition).toBeLessThan(ten.nutrition);
    expect(marathon.nutrition).toBeLessThan(half.nutrition);
    expect(half.xp.overall).toBeGreaterThan(ten.xp.overall);
    expect(marathon.xp.overall).toBeGreaterThan(half.xp.overall);
    expect(half.xp.marathon).toBeGreaterThan(ten.xp.marathon);
    expect(marathon.xp.marathon).toBeGreaterThan(half.xp.marathon);
    expect(half.coins).toBeGreaterThan(ten.coins);
    expect(marathon.coins).toBeGreaterThan(half.coins);
    expect(half.energy).toBe(5);
    expect(marathon.energy).toBe(6);
    expect(half.fatigue).toBe(32);
    expect(marathon.fatigue).toBe(44);
    expect(half.coins).toBe(72);
    expect(marathon.coins).toBe(120);
    expect(five.energy).toBe(3);
  });

  it("weights form toward Endurance more as distance grows", () => {
    expect(RACES["5k"].ideal.endurance).toBeLessThan(RACES["10k"].ideal.endurance);
    expect(RACES["10k"].ideal.endurance).toBeLessThan(RACES.half.ideal.endurance);
    expect(RACES.half.ideal.endurance).toBeLessThan(RACES.marathon.ideal.endurance);
    expect(RACES.half.ideal).toEqual({ endurance: 0.55, peak: 0.45 });
    expect(RACES.marathon.ideal).toEqual({ endurance: 0.65, peak: 0.35 });
  });

  it("DNFs a half or marathon on a chance bonk the way a 10K does", () => {
    const half = judgeBonk({
      nutrition: 20,
      sleepQuality: "good",
      fatigue: 10,
      roll: 0.1,
      km: RACES.half.km,
    });
    expect(half).toMatchObject({ bonk: true, dnf: true, slowFinish: false });
    const marathon = judgeBonk({
      nutrition: 70,
      sleepQuality: "poor",
      fatigue: 10,
      roll: 0.1,
      km: RACES.marathon.km,
    });
    expect(marathon.dnf).toBe(true);
  });

  it("skips the short-road vest tax on half and marathon readiness", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    state.gear.carry = "camelbak-vest";
    state.gear.ownedCarry = ["camelbak-vest"];
    expect(readiness(state, RACES["5k"]).gearMod).toBeCloseTo(-0.04);
    expect(readiness(state, RACES.half).gearMod).toBeCloseTo(0);
    expect(readiness(state, RACES.marathon).gearMod).toBeCloseTo(0);
  });
});


