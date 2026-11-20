/**
 * unlocks.test.js
 * Half Marathon and Marathon gates: locked until the level and prior
 * races are done, then open. entryNeedsMessage only lists what is still
 * missing so the track menu can say "to enter" clearly.
 */

import { describe, expect, it } from "vitest";
import { createNewGame } from "@/lib/activities";
import { HALF_UNLOCK_LEVEL, MARATHON_UNLOCK_LEVEL } from "@/lib/constants";
import { xpToReachLevel } from "@/lib/xp";
import {
  entryNeedsMessage,
  halfStatus,
  isHalfOpen,
  isMarathonOpen,
  marathonStatus,
} from "@/lib/unlocks";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("half marathon unlock", () => {
  it("stays locked for a new runner", () => {
    const state = fresh();
    expect(isHalfOpen(state)).toBe(false);
    expect(halfStatus(state).needs.map((item) => item.ok)).toEqual([false, false, false]);
    expect(entryNeedsMessage(halfStatus(state).needs)).toBe(
      `Reach level ${HALF_UNLOCK_LEVEL}, finish the Brick City 5K, and finish the Community 10K to enter.`,
    );
  });

  it("needs level, a finished 5K, and a finished 10K", () => {
    const state = fresh();
    state.xp.overall = xpToReachLevel(HALF_UNLOCK_LEVEL);
    expect(isHalfOpen(state)).toBe(false);
    state.progress.fiveKFinished = true;
    expect(isHalfOpen(state)).toBe(false);
    expect(entryNeedsMessage(halfStatus(state).needs)).toBe(
      "Finish the Community 10K to enter.",
    );
    state.progress.tenKFinished = true;
    expect(isHalfOpen(state)).toBe(true);
    expect(entryNeedsMessage(halfStatus(state).needs)).toBe("Ready to enter.");
  });

  it("does not open from track or treadmill counts alone", () => {
    const state = fresh();
    state.xp.overall = xpToReachLevel(HALF_UNLOCK_LEVEL);
    state.progress.fiveKFinished = true;
    state.progress.tenKFinished = true;
    state.progress.trackRuns = 0;
    state.progress.treadmillRuns = 0;
    expect(isHalfOpen(state)).toBe(true);
  });
});

describe("marathon unlock", () => {
  it("stays locked until level and a finished half", () => {
    const state = fresh();
    expect(isMarathonOpen(state)).toBe(false);
    expect(entryNeedsMessage(marathonStatus(state).needs)).toBe(
      `Reach level ${MARATHON_UNLOCK_LEVEL} and finish the Brick City Half to enter.`,
    );
    state.xp.overall = xpToReachLevel(MARATHON_UNLOCK_LEVEL);
    expect(isMarathonOpen(state)).toBe(false);
    expect(entryNeedsMessage(marathonStatus(state).needs)).toBe(
      "Finish the Brick City Half to enter.",
    );
    state.progress.halfFinished = true;
    expect(isMarathonOpen(state)).toBe(true);
  });
});
