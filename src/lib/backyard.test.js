/**
 * backyard.test.js
 * Flatland backyard loop rules, unlocks, and rewards.
 */

import { describe, expect, it } from "vitest";
import { createNewGame, perform } from "@/lib/activities";
import {
  BACKYARD_LOOP_MILES,
  BACKYARD_EVENTS,
  backyardReward,
  backyardUnlockStatus,
  loopFailChance,
  resolveBackyardLoop,
  startBackyardSession,
} from "@/lib/backyard";
import { deserialize, serialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("backyard ultras", () => {
  it("defines practice plus three premier yards", () => {
    expect(BACKYARD_EVENTS["backyard-practice"]).toBeTruthy();
    expect(BACKYARD_EVENTS["bigs-backyard"].premier).toBe(true);
    expect(BACKYARD_EVENTS["bpn-go-one-more"].requires).toBe("bigs-backyard");
    expect(BACKYARD_EVENTS["storm-city-backyard"].requires).toBe("bpn-go-one-more");
    expect(BACKYARD_LOOP_MILES).toBeCloseTo(4.167);
  });

  it("gates premiers by level and prior finishes", () => {
    const state = fresh();
    expect(backyardUnlockStatus(state, "bigs-backyard").open).toBe(false);
    state.xp.overall = 10000;
    expect(backyardUnlockStatus(state, "bigs-backyard").open).toBe(true);
    expect(backyardUnlockStatus(state, "bpn-go-one-more").open).toBe(false);
    state.progress.bigsBackyardFinished = true;
    state.xp.overall = 20000;
    expect(backyardUnlockStatus(state, "bpn-go-one-more").open).toBe(true);
  });

  it("raises fail chance with fatigue and scales rewards with loops", () => {
    expect(loopFailChance(90)).toBeGreaterThan(loopFailChance(10));
    const event = BACKYARD_EVENTS["bigs-backyard"];
    const reward = backyardReward(event, 5, true);
    expect(reward.miles).toBeCloseTo(5 * BACKYARD_LOOP_MILES, 1);
    expect(reward.coins).toBeGreaterThan(5 * 6);
  });

  it("lets you stop or continue loops through perform", () => {
    const state = fresh();
    state.xp.overall = 5000;
    state.energy = 10;
    const start = perform(state, { type: "backyard-start", id: "backyard-practice" });
    expect(start.ok).toBe(true);
    expect(start.needsBackyard).toBe(true);
    expect(start.state.backyardSession.eventId).toBe("backyard-practice");
    const stop = perform(start.state, { type: "backyard-loop", choice: "stop" });
    expect(stop.ok).toBe(true);
    expect(stop.state.backyardSession).toBeNull();
  });

  it("can win when loops reach the field size", () => {
    const state = fresh();
    const session = startBackyardSession(state, "backyard-practice");
    session.loops = BACKYARD_EVENTS["backyard-practice"].fieldLoops - 1;
    const result = resolveBackyardLoop(state, session, "continue", () => 0.99);
    expect(result.done).toBe(true);
    expect(result.won).toBe(true);
  });

  it("loads old saves with backyard flags defaulting to false / 0", () => {
    const state = fresh();
    const raw = JSON.parse(serialize(state));
    delete raw.progress.bigsBackyardFinished;
    delete raw.progress.backyardPracticeBest;
    delete raw.backyardSession;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.progress.bigsBackyardFinished).toBe(false);
    expect(loaded.progress.backyardPracticeBest).toBe(0);
  });
});
