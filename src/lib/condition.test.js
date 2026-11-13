/**
 * condition.test.js
 * HUD math: bar colors, trend arrows, the change ticker, and how fast
 * nutrition drains when you are tired or living on snacks.
 */

import { describe, expect, it } from "vitest";
import {
  clampMeter,
  fatigueBand,
  fatigueColor,
  formatTicker,
  meterDelta,
  slotDrain,
  trend,
  trendsFor,
} from "@/lib/condition";

describe("condition meters", () => {
  it("clamps meters to 0..100", () => {
    expect(clampMeter(-4)).toBe(0);
    expect(clampMeter(40.4)).toBe(40);
    expect(clampMeter(140)).toBe(100);
  });

  it("paints fatigue green, then yellow, then red", () => {
    expect(fatigueBand(10)).toBe("green");
    expect(fatigueBand(40)).toBe("yellow");
    expect(fatigueBand(70)).toBe("red");
    expect(fatigueColor(80)).toBe("#e23d3d");
  });

  it("keeps tiny changes steady so the arrow does not flicker", () => {
    expect(trend(50, 49)).toBe("flat");
    expect(trend(52, 50)).toBe("up");
    expect(trend(48, 50)).toBe("down");
    expect(trendsFor({ endurance: 30, peak: 20, fatigue: 10, nutrition: 70 }, {
      endurance: 20,
      peak: 20,
      fatigue: 18,
      nutrition: 71,
    })).toEqual({
      endurance: "up",
      peak: "flat",
      fatigue: "down",
      nutrition: "flat",
    });
  });

  it("formats the ticker the way the HUD reads it, zeros omitted", () => {
    expect(formatTicker({ peak: 2, fatigue: 4, nutrition: -3 })).toBe(
      "+2 Peak ▲  +4 Fatigue ▲  −3 Nutrition ▼",
    );
    expect(formatTicker(meterDelta(
      { endurance: 20, peak: 20, fatigue: 10, nutrition: 70 },
      { endurance: 20, peak: 22, fatigue: 14, nutrition: 67 },
    ))).toBe("+2 Peak ▲  +4 Fatigue ▲  −3 Nutrition ▼");
  });

  it("drains harder when you are tired or ate junk", () => {
    expect(slotDrain({ fatigue: 10, junk: false })).toBe(4);
    expect(slotDrain({ fatigue: 60, junk: false })).toBe(6);
    expect(slotDrain({ fatigue: 10, junk: true })).toBe(7);
    expect(slotDrain({ fatigue: 80, junk: true })).toBe(9);
  });
});
