/**
 * town.test.js
 * A new runner has to be able to walk from Home to every other door.
 * This catches a fence, a fountain, or an NPC placed on the only path.
 */

import { describe, expect, it } from "vitest";
import { createNewGame } from "@/lib/activities";
import { CITY_SIGNS, COLS, DIR, ROWS, buildWorld, canReach, entranceAt, homeSpawn, isBlocked, lookupInteract, noteArrival, PLACES, TILE, signCopy, worldPixelSize } from "@/game/town";
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

  it("paves a sidewalk from the street onto every door", () => {
    const world = buildWorld(createNewGame({ name: "Ada", gender: "female" }));
    const ground = world.ground;
    expect(ground[7][5]).toBe("s");
    expect(ground[8][5]).toBe("r");
    expect(ground[7][17]).toBe("s");
    expect(ground[8][17]).toBe("r");
    expect(ground[14][9]).toBe("s");
    expect(ground[14][10]).toBe("r");
    expect(ground[22][5]).toBe("s");
    expect(ground[21][5]).toBe("r");
    expect(ground[22][18]).toBe("s");
    expect(ground[23][18]).toBe("d");
    expect(ground[12][26]).toBe("s");
    expect(ground[12][25]).toBe("r");
    expect(ground[7][30]).toBe("s");
    expect(ground[8][30]).toBe("r");
    expect(ground[17][19]).toBe("s");
    expect(isBlocked(world, 5, 7)).toBe(false);
    expect(isBlocked(world, 4, 7)).toBe(true);
  });

  it("opens a building only when a step lands on its mat", () => {
    expect(noteArrival(null, { tx: 5, ty: 7 }, true)).toEqual({
      previous: { tx: 5, ty: 7 },
      entered: null,
    });
    const standing = noteArrival({ tx: 5, ty: 8 }, { tx: 5, ty: 7 }, true);
    expect(standing.entered).toBe("home");
    expect(noteArrival(standing.previous, { tx: 5, ty: 7 }, true).entered).toBeNull();
    expect(noteArrival({ tx: 5, ty: 8 }, { tx: 5, ty: 7 }, false).entered).toBeNull();
    expect(entranceAt(9, 14)).toBe("gym");
    expect(entranceAt(17, 7)).toBe("grocery");
    expect(entranceAt(5, 22)).toBe("store");
    expect(entranceAt(18, 22)).toBeNull();
    expect(entranceAt(30, 8)).toBeNull();
    expect(entranceAt(26, 12)).toBeNull();
    expect(entranceAt(19, 17)).toBeNull();
    const park = noteArrival({ tx: 18, ty: 21 }, { tx: 18, ty: 22 }, true);
    expect(park.entered).toBeNull();
    const gate = noteArrival({ tx: 30, ty: 9 }, { tx: 30, ty: 8 }, true);
    expect(gate.entered).toBeNull();
  });
});
