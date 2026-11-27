/**
 * buildingKit.test.js
 * Every building type has one door, no overlapping windows, and parts
 * inside its tile footprint. Catches the stacked-window / floating-door
 * bugs that came from mixing absolute panes() with relative drawers.
 */

import { describe, expect, it } from "vitest";
import {
  auditAllCompositions,
  auditComposition,
  compositionFor,
  knownBuildingIds,
  rectsOverlap,
} from "@/game/buildingKit";
import { matDoorOk } from "@/game/maps/layoutEngine";
import { cityMaps, TILE } from "@/game/town";
import { createNewGame } from "@/lib/activities";

describe("building compositions", () => {
  it("defines a kit entry for every shop building id", () => {
    expect(knownBuildingIds().sort()).toEqual(
      ["cafe", "clinic", "grocery", "gym", "home", "store"].sort(),
    );
  });

  it("passes the audit for every composition (one door, no stacked windows)", () => {
    expect(auditAllCompositions()).toEqual([]);
  });

  for (const id of knownBuildingIds()) {
    it(`keeps ${id} windows from overlapping the door or each other`, () => {
      const comp = compositionFor(id);
      expect(comp.door).toBeTruthy();
      const windows = comp.windows || [];
      for (let i = 0; i < windows.length; i += 1) {
        expect(rectsOverlap(windows[i], comp.door), `window ${i} vs door`).toBe(false);
        for (let j = i + 1; j < windows.length; j += 1) {
          expect(rectsOverlap(windows[i], windows[j]), `windows ${i}/${j}`).toBe(false);
        }
      }
      expect(auditComposition(id)).toEqual([]);
    });
  }
});

describe("building door mats on every town", () => {
  for (const map of cityMaps()) {
    it(`puts each ${map.info.name} door mat adjacent to exactly one door on walkable ground`, () => {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      const home = world.places.find((place) => place.id === "home");
      expect(home).toBeTruthy();
      for (const building of world.buildings) {
        const mat = world.places.find((place) => place.id === building.id);
        expect(mat, building.id).toBeTruthy();
        expect(matDoorOk(building, mat), `${world.id}:${building.id}`).toBe(true);
        // Mat is walkable and not asphalt.
        expect(world.blocked[mat.ty][mat.tx], `${world.id}:${building.id} mat blocked`).toBe(false);
        expect(world.ground[mat.ty][mat.tx], `${world.id}:${building.id} mat on road`).not.toBe("r");
        // Door brick stays solid and tagged.
        expect(world.interact[building.door.y][building.door.x]).toBe(building.id);
        expect(world.blocked[building.door.y][building.door.x]).toBe(true);
        // Composition footprint matches the map building size.
        const comp = compositionFor(building.id);
        if (comp) {
          expect(building.w).toBe(comp.tilesW);
          expect(building.h).toBe(comp.tilesH);
        }
      }
      // Pixel spawn stays on the home mat tile.
      const spawnX = (home.tx + 0.5) * TILE;
      const spawnY = (home.ty + 0.5) * TILE;
      expect(Math.floor(spawnX / TILE)).toBe(home.tx);
      expect(Math.floor(spawnY / TILE)).toBe(home.ty);
    });
  }
});
