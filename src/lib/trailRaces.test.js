/**
 * trailRaces.test.js
 * Ridgeview premier unlock chain and reward scaling vs Marathon.
 */

import { describe, expect, it } from "vitest";
import { createNewGame, applyRace, menuFor } from "@/lib/activities";
import { RACES } from "@/lib/race";
import {
  RIDGE_50K_LEVEL,
  TRAIL_RACE_ORDER,
  isTrailRaceOpen,
  trailRaceStatus,
} from "@/lib/trailRaces";
import { deserialize, serialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

function readyFor50k() {
  const state = fresh();
  state.city = "ridgeview";
  state.mapId = "ridgeview";
  state.progress.marathonFinished = true;
  state.xp.overall = 5000;
  state.energy = 10;
  state.condition.nutrition = 100;
  state.condition.fatigue = 10;
  state.condition.sleepQuality = "good";
  return state;
}

describe("Ridgeview trail races", () => {
  it("scales rewards up from the Marathon", () => {
    const marathon = RACES.marathon;
    const fifty = RACES["ridge-50k"];
    expect(fifty.energy).toBeGreaterThan(marathon.energy);
    expect(fifty.xp.overall).toBeGreaterThan(marathon.xp.overall);
    expect(fifty.coins).toBeGreaterThan(marathon.coins);
    expect(RACES["ridge-200m"].daysCost).toBe(2);
    expect(RACES["ridge-100m"].daysCost).toBe(1);
  });

  it("gates 50K behind marathon + level, then each finish opens the next", () => {
    const state = fresh();
    expect(isTrailRaceOpen(state, "ridge-50k")).toBe(false);
    state.progress.marathonFinished = true;
    state.xp.overall = (RIDGE_50K_LEVEL - 1) * 40;
    expect(trailRaceStatus(state, "ridge-50k").open).toBe(false);
    const ready = readyFor50k();
    expect(isTrailRaceOpen(ready, "ridge-50k")).toBe(true);
    expect(isTrailRaceOpen(ready, "ridge-100k")).toBe(false);
    ready.progress.ridge50kFinished = true;
    ready.xp.overall = 20000;
    expect(isTrailRaceOpen(ready, "ridge-100k")).toBe(true);
  });

  it("lists Ridgeview premiers on the track menu in Ridgeview", () => {
    const state = readyFor50k();
    const menu = menuFor("track", state);
    const ids = menu.items.filter((row) => row.action?.type === "open-race").map((row) => row.action.id);
    for (const id of TRAIL_RACE_ORDER) expect(ids).toContain(id);
  });

  it("finishes the 50K and stamps the progress flag with celebration on first finish", () => {
    const state = readyFor50k();
    const result = applyRace(state, "ridge-50k", 0.9);
    expect(result.ok).toBe(true);
    expect(result.state.progress.ridge50kFinished).toBe(true);
    expect(result.celebrate).toBe(true);
  });

  it("loads old saves with ridge flags defaulting to false", () => {
    const state = fresh();
    const raw = JSON.parse(serialize(state));
    delete raw.progress.ridge50kFinished;
    delete raw.progress.ridge100kFinished;
    delete raw.progress.ridge100mFinished;
    delete raw.progress.ridge200mFinished;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.progress.ridge50kFinished).toBe(false);
    expect(loaded.progress.ridge200mFinished).toBe(false);
  });
});
