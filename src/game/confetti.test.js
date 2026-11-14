/**
 * confetti.test.js
 * The fall is the Marathon City shower, cut to 30 seconds, and turned
 * off when the player asked the browser for less motion.
 */

import { describe, expect, it } from "vitest";
import {
  CONFETTI_COLORS,
  CONFETTI_COUNT,
  CONFETTI_MS,
  CONFETTI_REDUCED_COUNT,
  pieceCount,
  spawnPieces,
  stepPieces,
} from "@/game/confetti";

describe("win confetti", () => {
  it("lasts 30 seconds and uses the Marathon City piece count", () => {
    expect(CONFETTI_MS).toBe(30000);
    expect(CONFETTI_COUNT).toBe(36);
    expect(CONFETTI_COLORS).toHaveLength(6);
    expect(pieceCount(false)).toBe(36);
    expect(pieceCount(true)).toBe(CONFETTI_REDUCED_COUNT);
    expect(pieceCount(true)).toBe(0);
  });

  it("falls, then wraps back to the top so the shower can last", () => {
    const bits = spawnPieces(2, 100, 40, () => 0.5);
    expect(bits[0].y).toBe(20);
    expect(bits[0].c).toBe(CONFETTI_COLORS[0]);
    const before = bits[0].y;
    stepPieces(bits, 100, 40, () => 0);
    expect(bits[0].y).toBeGreaterThan(before);
    bits[0].y = 41;
    stepPieces(bits, 100, 40, () => 0.25);
    expect(bits[0].y).toBe(-4);
    expect(bits[0].x).toBe(25);
  });
});