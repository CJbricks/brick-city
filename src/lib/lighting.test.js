/**
 * lighting.test.js
 * The sky colors are data, so a test can check that dusk and night are
 * the slots that turn the lamps on, and that a bad slot does not crash.
 */

import { describe, expect, it } from "vitest";
import { TILE, COLS, ROWS } from "@/game/town";
import { glowAnchors, lightingForSlot, townLights } from "@/lib/lighting";

describe("time of day lighting", () => {
  it("names each calendar slot and only glows after sunset", () => {
    expect(lightingForSlot(0).name).toBe("Morning");
    expect(lightingForSlot(1).name).toBe("Midday");
    expect(lightingForSlot(2).name).toBe("Afternoon");
    expect(lightingForSlot(3).name).toBe("Golden Sunset");
    expect(lightingForSlot(3).glow).toBe(false);
    expect(lightingForSlot(4).name).toBe("Dusk");
    expect(lightingForSlot(4).glow).toBe(true);
    expect(lightingForSlot(5).name).toBe("Night");
    expect(lightingForSlot(5).strength).toBe(1);
    expect(lightingForSlot(99).name).toBe("Night");
    expect(lightingForSlot(undefined).name).toBe("Morning");
  });

  it("keeps windows and streetlamps inside the 32px town", () => {
    const lights = townLights();
    expect(lights.windows.length).toBeGreaterThanOrEqual(8);
    expect(lights.lamps).toHaveLength(8);
    const width = COLS * TILE;
    const height = ROWS * TILE;
    for (const pane of lights.windows) {
      expect(pane.x).toBeGreaterThan(0);
      expect(pane.x + pane.w).toBeLessThan(width);
      expect(pane.y + pane.h).toBeLessThan(height);
    }
    for (const lamp of lights.lamps) {
      expect(lamp.x).toBeGreaterThan(TILE);
      expect(lamp.x).toBeLessThan(width - TILE);
      expect(lamp.y).toBeLessThan(height - TILE);
    }
    const glow = glowAnchors();
    expect(glow.windows).toHaveLength(lights.windows.length);
    expect(glow.lamps[0].y).toBe(lights.lamps[0].y - 28);
  });
});
