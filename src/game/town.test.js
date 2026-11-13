/**
 * town.test.js
 * A new runner has to be able to walk from Home to every other door.
 * This catches a fence, a fountain, or an NPC placed on the only path.
 */

import { describe, expect, it } from "vitest";
import { createNewGame } from "@/lib/activities";
import { CITY_SIGNS, COLS, DIR, ROWS, buildWorld, canReach, homeSpawn, isBlocked, lookupInteract, PLACES, TILE, signCopy, worldPixelSize } from "@/game/town";
import { CITY_INFO } from "@/lib/constants";

describe("town paths", () => {
  it("draws the town at 32px tiles", () => {
    expect(TILE).toBe(32);
    expect(worldPixelSize()).toEqual({ width: COLS * 32, height: ROWS * 32 });
  });

  it("starts at home on a walkable tile and can reach every place", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    const world = buildWorld(state);
    const home = homeSpawn();
    const homeTile = { tx: Math.floor(home.x / TILE), ty: Math.floor(home.y / TILE) };
    expect(isBlocked(world, homeTile.tx, homeTile.ty)).toBe(false);
    expect(state.position.facing).toBe("up");
    for (const place of PLACES) {
      expect(canReach(world, homeTile, place), place.id).toBe(true);
    }
  });

  it("puts a solid city sign beside every place without sealing the mat", () => {
    const world = buildWorld(createNewGame({ name: "Ada", gender: "female" }));
    expect(CITY_SIGNS).toHaveLength(8);
    for (const sign of CITY_SIGNS) {
      expect(world.interact[sign.ty][sign.tx]).toBe(sign.id);
      expect(isBlocked(world, sign.tx, sign.ty)).toBe(true);
      const place = PLACES.find((item) => item.id === sign.placeId);
      expect(isBlocked(world, place.tx, place.ty)).toBe(false);
      const reachable = Object.values(DIR).some(([dx, dy]) => !isBlocked(world, sign.tx + dx, sign.ty + dy));
      expect(reachable, sign.id).toBe(true);
      const copy = signCopy(sign);
      expect(copy.lines[0]).toContain("BRICK CITY");
      expect(copy.lines[0]).toContain(`"${CITY_INFO.motto}"`);
      expect(copy.lines[0]).toContain(sign.placeName);
    }
    expect(lookupInteract(world, 5, 7, "left")).toBe("sign-home");
    expect(lookupInteract(world, 5, 7, "up")).toBe("home");
  });
});
