/**
 * brandColors.test.js
 * Every shoe brand has a small palette, and a runner with no sponsor
 * keeps the default shirt.
 */

import { describe, expect, it } from "vitest";
import { SHOE_SPONSOR_IDS } from "@/lib/sponsors";
import { PALETTES, runnerPalette } from "@/game/art";
import { BRAND_OUTFITS, applyBrandOutfit, brandOutfit, paletteLooksValid } from "@/game/brandColors";

describe("sponsor outfit palettes", () => {
  it("has a 2 or 3 color outfit for every shoe brand", () => {
    expect(Object.keys(BRAND_OUTFITS).sort()).toEqual([...SHOE_SPONSOR_IDS].sort());
    for (const id of SHOE_SPONSOR_IDS) {
      const outfit = brandOutfit(id);
      expect(paletteLooksValid(outfit)).toBe(true);
      const unique = new Set([outfit.cap, outfit.jacket, outfit.accent, outfit.shorts]);
      expect(unique.size).toBeGreaterThanOrEqual(2);
      expect(unique.size).toBeLessThanOrEqual(4);
    }
  });

  it("leaves the default outfit alone when there is no shoe sponsor", () => {
    const plain = runnerPalette("male", null);
    expect(plain.shirt).toBe(PALETTES.male.shirt);
    expect(plain.cap).toBe(PALETTES.male.cap);
    expect(applyBrandOutfit(PALETTES.female, "bpn")).toBe(PALETTES.female);
    expect(brandOutfit("nope")).toBeNull();
  });

  it("recolors cap, jacket, and shorts for the active shoe sponsor", () => {
    const nike = runnerPalette("female", "nike");
    expect(nike.cap).toBe(BRAND_OUTFITS.nike.cap);
    expect(nike.shirt).toBe(BRAND_OUTFITS.nike.jacket);
    expect(nike.shorts).toBe(BRAND_OUTFITS.nike.shorts);
    expect(nike.stripe).toBe(BRAND_OUTFITS.nike.accent);
    expect(nike.skin).toBe(PALETTES.female.skin);
    expect(runnerPalette("male", "hoka").shirt).toBe(BRAND_OUTFITS.hoka.jacket);
    expect(runnerPalette("male", "brooks").cap).toBe("#005eb8");
  });
});
