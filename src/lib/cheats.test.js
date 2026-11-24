/**
 * cheats.test.js
 * Nick Names codes: each known code, unknown input, and case/whitespace
 * handling. These call the same applyCheatCode the pause menu uses.
 */

import { describe, expect, it } from "vitest";
import { createNewGame } from "@/lib/activities";
import {
  applyCheatCode,
  normalizeCheatCode,
  UNKNOWN_CHEAT_MESSAGE,
} from "@/lib/cheats";
import { SICKNESS_DURATION_DAYS, isSick } from "@/lib/sickness";
import { levelFromXp, xpToReachLevel } from "@/lib/xp";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("normalizeCheatCode", () => {
  it("trims whitespace and uppercases", () => {
    expect(normalizeCheatCode("  gimme05 ")).toBe("GIMME05");
    expect(normalizeCheatCode("ShAmAn")).toBe("SHAMAN");
  });
});

describe("applyCheatCode", () => {
  it("returns Nothing happened for an unknown code and leaves state alone", () => {
    const state = fresh();
    const xpBefore = state.xp.overall;
    const result = applyCheatCode(state, "not-a-real-code");
    expect(result.known).toBe(false);
    expect(result.message).toBe(UNKNOWN_CHEAT_MESSAGE);
    expect(result.state).toBe(state);
    expect(state.xp.overall).toBe(xpBefore);
  });

  it("matches codes case-insensitively with trimmed whitespace", () => {
    const state = fresh();
    const result = applyCheatCode(state, "  gImMe05\t");
    expect(result.known).toBe(true);
    expect(result.state.xp.overall).toBe(state.xp.overall + 5);
    expect(result.message).toMatch(/\+5 XP/i);
  });

  it("GIMME05 adds 5 overall XP and weekXp", () => {
    const state = fresh();
    const result = applyCheatCode(state, "GIMME05");
    expect(result.known).toBe(true);
    expect(result.state.xp.overall).toBe(state.xp.overall + 5);
    expect(result.state.calendar.weekXp.overall).toBe(state.calendar.weekXp.overall + 5);
    expect(result.message).toMatch(/\+5 XP/);
    // Original save is untouched (structuredClone).
    expect(state.xp.overall).toBe(0);
  });

  it("GIMME05 triggers the normal level-up line when XP crosses a threshold", () => {
    const state = fresh();
    // One point shy of level 2 (25 XP). +5 should land at level 2.
    state.xp.overall = xpToReachLevel(2) - 1;
    expect(levelFromXp(state.xp.overall)).toBe(1);
    const result = applyCheatCode(state, "GIMME05");
    expect(levelFromXp(result.state.xp.overall)).toBe(2);
    expect(result.message).toMatch(/You reached level 2/);
  });

  it("SICKONE sets the same sickness state a natural wake event would", () => {
    const state = fresh();
    state.calendar.day = 20;
    const peakBefore = state.condition.peak;
    const result = applyCheatCode(state, "SICKONE");
    expect(result.known).toBe(true);
    expect(isSick(result.state)).toBe(true);
    expect(result.state.condition.sickness).toEqual({
      daysLeft: SICKNESS_DURATION_DAYS,
      note: "Rest until it passes, or see the clinic.",
    });
    expect(result.state.calendar.lastIllnessDay).toBe(20);
    // Instant sick has no Peak penalty; that only hits on recovery.
    expect(result.state.condition.peak).toBe(peakBefore);
    expect(result.message).toMatch(/sick/i);
  });

  it("SHAMAN clears sickness and injury with no Peak loss and no coin cost", () => {
    const state = fresh();
    state.coins = 100;
    state.condition.peak = 40;
    state.condition.sickness = {
      daysLeft: 2,
      note: "Rest until it passes, or see the clinic.",
    };
    state.condition.injury = {
      id: "blister",
      name: "Blister",
      daysLeft: 2,
      note: "Ease off speed work.",
    };
    state.condition.sore = true;

    const result = applyCheatCode(state, "SHAMAN");
    expect(result.known).toBe(true);
    expect(result.state.condition.sickness).toBeNull();
    expect(result.state.condition.injury).toBeNull();
    expect(result.state.condition.sore).toBe(false);
    expect(result.state.condition.peak).toBe(40);
    expect(result.state.coins).toBe(100);
    expect(result.message).toMatch(/clears|gone|shaman/i);
  });
});
