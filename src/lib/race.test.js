/**
 * race.test.js
 * Bonk / DNF, the readiness warning, gear trade-offs, and Remy's score.
 * Rolls are passed in so none of this depends on luck.
 */

import { describe, expect, it } from "vitest";
import {
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
  it("DNFs for sure when nutrition and sleep are both bad, gel or not", () => {
    const severe = judgeBonk({
      nutrition: 20,
      sleepQuality: "poor",
      fatigue: 10,
      gels: 1,
      roll: 0.99,
      km: 5,
    });
    expect(severe).toMatchObject({
      bonk: true,
      dnf: true,
      usedGel: false,
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
    const saved = judgeBonk({
      nutrition: 20,
      sleepQuality: "good",
      fatigue: 10,
      gels: 1,
      roll: 0.1,
      km: 5,
    });
    expect(saved).toMatchObject({ bonk: false, usedGel: true, reason: "gel-saved" });
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
  });
});
