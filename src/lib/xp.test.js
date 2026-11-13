/**
 * xp.test.js
 * Level thresholds and attribute levels. The mountain gate asks for level
 * 8, so these numbers are gameplay, not decoration.
 */

import { describe, expect, it } from "vitest";
import { attributeLevel, levelFromXp, levelProgress, trackRank, xpToReachLevel } from "@/lib/xp";

describe("xp", () => {
  it("starts at level 1 and steps up on the published curve", () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(25);
    expect(xpToReachLevel(3)).toBe(70);
    expect(xpToReachLevel(8)).toBe(595);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(24)).toBe(1);
    expect(levelFromXp(25)).toBe(2);
    expect(levelFromXp(70)).toBe(3);
    expect(levelFromXp(594)).toBe(7);
    expect(levelFromXp(595)).toBe(8);
  });

  it("reports progress inside the current level", () => {
    const progress = levelProgress(30);
    expect(progress.level).toBe(2);
    expect(progress.into).toBe(5);
    expect(progress.need).toBe(45);
  });

  it("turns attribute points into levels, separate from Overall level", () => {
    expect(attributeLevel(0)).toBe(1);
    expect(attributeLevel(19)).toBe(1);
    expect(attributeLevel(20)).toBe(2);
    expect(attributeLevel(40)).toBe(3);
    expect(trackRank(0)).toBe(1);
    expect(trackRank(40)).toBe(2);
  });
});
