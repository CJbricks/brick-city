/**
 * cues.test.js
 * Which scene asks for which song. Remy is the battle theme. The 5K
 * and the 10K are the race theme. The victory fanfare is requested by
 * the screen when a finish celebrates, not by this map.
 */

import { describe, expect, it } from "vitest";
import { trackForScene } from "@/game/audio/cues";

describe("music cues", () => {
  it("plays the title theme until the runner is in town", () => {
    expect(trackForScene({ screen: "boot", panel: null })).toBeNull();
    expect(trackForScene({ screen: "title", panel: null })).toBe("title");
    expect(trackForScene({ screen: "gender", panel: null })).toBe("title");
    expect(trackForScene({ screen: "name", panel: null })).toBe("title");
  });

  it("uses the town theme for walking and ordinary menus", () => {
    expect(trackForScene({ screen: "play", panel: null })).toBe("town");
    expect(trackForScene({ screen: "play", panel: { type: "list", title: "Menu" } })).toBe("town");
    expect(trackForScene({ screen: "play", panel: { type: "map" } })).toBe("town");
  });

  it("splits Remy from a normal race", () => {
    expect(trackForScene({ screen: "play", panel: { type: "race", id: "5k" } })).toBe("race");
    expect(trackForScene({ screen: "play", panel: { type: "race", id: "10k" } })).toBe("race");
    expect(trackForScene({ screen: "play", panel: { type: "race", id: "rival" } })).toBe("battle");
    expect(trackForScene({
      screen: "play",
      panel: { type: "bonk", action: { type: "race", id: "5k" } },
    })).toBe("race");
    expect(trackForScene({
      screen: "play",
      panel: { type: "bonk", action: { type: "rival" } },
    })).toBe("battle");
    expect(trackForScene({
      screen: "play",
      panel: { type: "dialogue", music: "battle" },
    })).toBe("battle");
    expect(trackForScene({
      screen: "play",
      panel: { type: "dialogue", music: "race" },
    })).toBe("race");
  });
});
