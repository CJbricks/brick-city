/**
 * townThemes.test.js
 * Each built town has its own ground palette / building style. Brick City
 * stays on the original bright lawn. Ridgeview must look alpine (cooler
 * greens, conifers, chalet style) so it does not paint as a second Brick
 * City.
 */

import { describe, expect, it } from "vitest";
import {
  BRICK_CITY_THEME,
  FLATLAND_THEME,
  RIDGEVIEW_THEME,
  knownThemeIds,
  themeFor,
} from "@/game/townThemes";
import { buildRidgeviewWorld } from "@/game/maps/ridgeview";
import { createNewGame } from "@/lib/activities";
import { canReach, isBlocked } from "@/game/town";

describe("town themes", () => {
  it("registers brick-city, ridgeview, and flatland", () => {
    expect(knownThemeIds().sort()).toEqual(["brick-city", "flatland", "ridgeview"]);
    expect(themeFor("brick-city")).toBe(BRICK_CITY_THEME);
    expect(themeFor("ridgeview")).toBe(RIDGEVIEW_THEME);
    expect(themeFor("flatland")).toBe(FLATLAND_THEME);
    expect(themeFor("road-brick-ridgeview")).toBe(BRICK_CITY_THEME);
  });

  it("gives Ridgeview an alpine palette distinct from Brick City", () => {
    expect(RIDGEVIEW_THEME.grassA).not.toBe(BRICK_CITY_THEME.grassA);
    expect(RIDGEVIEW_THEME.treeShape).toBe("conifer");
    expect(BRICK_CITY_THEME.treeShape).toBe("round");
    expect(RIDGEVIEW_THEME.buildingStyle).toBe("ridgeview");
    expect(BRICK_CITY_THEME.buildingStyle).toBe("brick-city");
    expect(RIDGEVIEW_THEME.slateRoof).toBeTruthy();
    expect(RIDGEVIEW_THEME.chaletWall).toBeTruthy();
    expect(RIDGEVIEW_THEME.auburnBrick).toBeTruthy();
  });

  it("keeps a plaza church as a landmark only, not a shop door", () => {
    const world = buildRidgeviewWorld(createNewGame({ name: "Ada", gender: "female" }));
    const church = world.landmarks.find((mark) => mark.id === "church");
    expect(church).toMatchObject({ tx: 15, ty: 9, w: 4, h: 3 });
    // Blocked footprint, but no place / interact id named church.
    expect(world.places.some((place) => place.id === "church")).toBe(false);
    for (let ty = church.ty; ty < church.ty + church.h; ty += 1) {
      for (let tx = church.tx; tx < church.tx + church.w; tx += 1) {
        expect(isBlocked(world, tx, ty), `${tx},${ty}`).toBe(true);
        expect(world.interact[ty][tx]).not.toBe("church");
      }
    }
    expect(world.landmarks.some((mark) => mark.id === "race-arch")).toBe(true);
  });

  it("still reaches every Ridgeview door after the mountain-town props", () => {
    const world = buildRidgeviewWorld(createNewGame({ name: "Ada", gender: "female" }));
    const origin = { tx: 5, ty: 7 };
    for (const place of world.places) {
      expect(isBlocked(world, place.tx, place.ty), place.id).toBe(false);
      expect(canReach(world, origin, place), place.id).toBe(true);
    }
  });
});
