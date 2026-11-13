/**
 * detrain.test.js
 * Rest days are free. Skipping runs for longer drains Peak first, then
 * Overall Endurance. This is the weekly puzzle: train, eat, work, sleep.
 */

import { describe, expect, it } from "vitest";
import { detrainingDelta, detrainingNote } from "@/lib/detrain";

describe("detraining", () => {
  it("does nothing for the first two days off", () => {
    expect(detrainingDelta(0)).toEqual({ peak: 0, endurance: 0, active: false });
    expect(detrainingDelta(1).active).toBe(false);
    expect(detrainingDelta(2)).toEqual({ peak: 0, endurance: 0, active: false });
  });

  it("drops Peak on day 3 and Endurance only from day 6", () => {
    expect(detrainingDelta(3)).toEqual({ peak: -2, endurance: 0, active: true });
    expect(detrainingDelta(5)).toEqual({ peak: -6, endurance: 0, active: true });
    expect(detrainingDelta(6)).toEqual({ peak: -8, endurance: -1, active: true });
    expect(detrainingDelta(12)).toEqual({ peak: -12, endurance: -6, active: true });
  });

  it("explains an active stretch in plain language", () => {
    expect(detrainingNote(1)).toMatch(/free window/);
    expect(detrainingNote(6)).toMatch(/Peak -8/);
    expect(detrainingNote(6)).toMatch(/Endurance -1/);
  });
});
