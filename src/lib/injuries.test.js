/**
 * injuries.test.js
 * Typed injuries, weather/fatigue chance, headlamp night-risk cut, clinic costs.
 */

import { describe, expect, it } from "vitest";
import {
  HEADLAMP_HAT_ID,
  HEADLAMP_NIGHT_RISK_CUT,
  INJURY_TYPES,
  adjustedNightRisk,
  clinicCostForInjury,
  hasHeadlamp,
  injuryBlocksRunning,
  injuryChanceForRun,
  maybeApplyRunInjury,
  pickInjuryType,
} from "@/lib/injuries";
import { createNewGame, nextSoreness, applyClinicTreat } from "@/lib/activities";
import { NIGHT_RISK_TRAIL } from "@/lib/constants";
import { HATS } from "@/lib/catalog";
import { deserialize, serialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("injuries and headlamp", () => {
  it("lists the five typed injuries with durations and clinic multipliers", () => {
    expect(INJURY_TYPES.cramp.days).toBe(1);
    expect(INJURY_TYPES.pull.days).toBe(3);
    expect(INJURY_TYPES.achilles.days).toBe(5);
    expect(INJURY_TYPES.knee.days).toBe(7);
    expect(INJURY_TYPES.concussion.trailOnly).toBe(true);
    expect(INJURY_TYPES.pull.blocksRunning).toBe(true);
    expect(INJURY_TYPES.cramp.blocksRunning).toBe(false);
  });

  it("cuts night risk when a headlamp is worn", () => {
    const state = fresh();
    expect(adjustedNightRisk(NIGHT_RISK_TRAIL, state)).toBe(NIGHT_RISK_TRAIL);
    state.gear.hat = HEADLAMP_HAT_ID;
    expect(hasHeadlamp(state)).toBe(true);
    expect(adjustedNightRisk(NIGHT_RISK_TRAIL, state)).toBe(NIGHT_RISK_TRAIL - HEADLAMP_NIGHT_RISK_CUT);
    const sore = nextSoreness(state, { nightRisk: NIGHT_RISK_TRAIL, hard: true });
    // With headlamp, nightExtra is 2 instead of 3 — still can be sore with hard+other strikes.
    expect(sore).toBeTruthy();
  });

  it("raises injury chance with heat and high fatigue", () => {
    const calm = fresh();
    calm.weather = { today: "clear", tomorrow: "clear" };
    calm.condition.fatigue = 10;
    const hot = fresh();
    hot.weather = { today: "heat", tomorrow: "clear" };
    hot.condition.fatigue = 90;
    expect(injuryChanceForRun(hot, { hard: true })).toBeGreaterThan(injuryChanceForRun(calm, {}));
  });

  it("only picks concussion on trail activities", () => {
    // Force the last weight band with a high roll on a trail pool that includes concussion.
    const trail = pickInjuryType({ style: "trail", id: "ridge-repeats" }, 0.999);
    expect(Object.keys(INJURY_TYPES)).toContain(trail.id);
    const road = pickInjuryType({ style: "road", id: "easy-run" }, 0.999);
    expect(road.id).not.toBe("concussion");
  });

  it("applies a typed injury and blocks running when required", () => {
    const state = fresh();
    state.condition.fatigue = 90;
    state.weather = { today: "ice", tomorrow: "clear" };
    // Force a hit: first rng call chance check (0), second pick type.
    const hit = maybeApplyRunInjury(state, { hard: true, style: "road" }, (() => {
      let n = 0;
      return () => {
        n += 1;
        return n === 1 ? 0 : 0.5;
      };
    })());
    expect(hit.hit).toBe(true);
    expect(state.condition.injury).toBeTruthy();
    if (INJURY_TYPES[state.condition.injury.id].blocksRunning) {
      expect(injuryBlocksRunning(state)).toBe(true);
    }
  });

  it("charges type-specific clinic costs and shortens recovery", () => {
    const state = fresh();
    state.coins = 200;
    state.condition.injury = {
      id: "knee",
      name: "Knee strain",
      daysLeft: 7,
      note: "test",
      blocksRunning: true,
    };
    const cost = clinicCostForInjury(state, "knee");
    expect(cost).toBeGreaterThan(22);
    const treated = applyClinicTreat(state);
    expect(treated.ok).toBe(true);
    expect(treated.state.coins).toBe(200 - cost);
    expect(treated.state.condition.injury.daysLeft).toBe(5);
  });

  it("keeps headlamp as a catalog hat with ridgeview unlock", () => {
    expect(HATS.headlamp.unlock).toBe("ridgeview");
    expect(HATS.headlamp.nightRiskCut).toBe(1);
  });

  it("loads an old save without typed injury fields as healthy", () => {
    const state = fresh();
    const raw = JSON.parse(serialize(state));
    delete raw.weather;
    delete raw.mapId;
    delete raw.segments;
    delete raw.progress.ridge50kFinished;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.condition.injury).toBeNull();
    expect(loaded.progress.ridge50kFinished).toBe(false);
  });
});
