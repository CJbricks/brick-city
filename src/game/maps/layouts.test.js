/**
 * layouts.test.js
 * Each built town has a unique walkable layout: doors/NPCs/warps reachable
 * from the spawn, no asphalt cut by sidewalk, no sidewalk stubs into grass,
 * and a closed track oval (not a chopped rectangle).
 */

import { describe, expect, it } from "vitest";
import { createNewGame } from "@/lib/activities";
import {
  activationTiles,
  canReach,
  cityMaps,
  DIR,
  isBlocked,
  TILE,
  unreachableTiles,
} from "@/game/town";
import {
  matDoorOk,
  roadInterruptions,
  sidewalkStubs,
} from "@/game/maps/layoutEngine";
import { TRACK_ROWS } from "@/game/maps/shared";

function homeOrigin(world) {
  const home = world.places.find((place) => place.id === "home");
  return { tx: home.tx, ty: home.ty };
}

describe("per-town layouts", () => {
  for (const map of cityMaps()) {
    it(`keeps every ${map.info.name} door, NPC stand, and warp reachable from spawn`, () => {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      const origin = homeOrigin(world);
      expect(isBlocked(world, origin.tx, origin.ty)).toBe(false);

      for (const place of world.places) {
        expect(isBlocked(world, place.tx, place.ty), place.id).toBe(false);
        expect(canReach(world, origin, place), place.id).toBe(true);
      }

      // NPC stand mats (talk-from-here tiles) stay walkable and reachable.
      // Skip stands that sit on a closed mountain trail (Mara) — those
      // open with the gate, not with the town street plan.
      const lockedTrail = new Set(
        (!world.mountainOpen && world.mountainTrail
          ? world.mountainTrail
          : []
        ).map((cell) => `${cell.tx},${cell.ty}`),
      );
      for (const npc of world.npcs || []) {
        expect(isBlocked(world, npc.tx, npc.ty), npc.id).toBe(true);
        if (npc.stand) {
          const standKey = `${npc.stand.tx},${npc.stand.ty}`;
          if (lockedTrail.has(standKey)) continue;
          expect(isBlocked(world, npc.stand.tx, npc.stand.ty), `${npc.id} stand`).toBe(false);
          expect(canReach(world, origin, npc.stand), `${npc.id} stand`).toBe(true);
        } else {
          // Face the NPC from an open neighbor (or from a locked trail cell).
          const open = Object.values(DIR).some(([dx, dy]) => {
            const tx = npc.tx + dx;
            const ty = npc.ty + dy;
            return !isBlocked(world, tx, ty) || lockedTrail.has(`${tx},${ty}`);
          });
          expect(open, npc.id).toBe(true);
        }
      }

      // Activation mats are tagged underfoot and reachable. Facing a
      // neighbor can prefer another interact (Lina's stand faces the
      // club mat); feet still answer A via the tile under you.
      for (const pad of activationTiles(world)) {
        expect(canReach(world, origin, pad), `${pad.id}@${pad.tx},${pad.ty}`).toBe(true);
        expect(world.interact[pad.ty][pad.tx], `${pad.id} underfoot`).toBe(pad.id);
      }
    });

    it(`keeps ${map.info.name} walkable tiles in one connected component from home`, () => {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      // Trail tips (one-neighbor dirt) are still reachable; this catches
      // islands of sidewalk or plaza that never meet the street.
      expect(unreachableTiles(world, homeOrigin(world))).toEqual([]);
    });

    it(`does not cut ${map.info.name} asphalt with a sidewalk seam`, () => {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      expect(roadInterruptions(world.ground), world.id).toEqual([]);
    });

    it(`keeps ${map.info.name} sidewalks attached to mats or streets (no grass stubs)`, () => {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      const matKeys = new Set([
        ...world.places.map((p) => `${p.tx},${p.ty}`),
        ...(world.npcs || []).filter((n) => n.stand).map((n) => `${n.stand.tx},${n.stand.ty}`),
        ...(world.activityBoard ? [`${world.activityBoard.mat.tx},${world.activityBoard.mat.ty}`] : []),
        // City-sign pads are solid posts on a one-tile sidewalk spur.
        ...(world.signs || []).map((s) => `${s.tx},${s.ty}`),
      ]);
      // A tip next to a building wall is OK if it also touches pavement;
      // sidewalkStubs only flags cells with fewer than two pavement neighbors.
      expect(sidewalkStubs(world.ground, matKeys), world.id).toEqual([]);
    });

    it(`aligns ${map.info.name} building door mats with the kit`, () => {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      for (const building of world.buildings) {
        const mat = world.places.find((place) => place.id === building.id);
        expect(matDoorOk(building, mat), building.id).toBe(true);
      }
    });
  }

  it("stamps a closed track oval (TRACK_ROWS) on every built town", () => {
    for (const map of cityMaps()) {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      const lanes = [];
      for (let ty = 0; ty < world.ground.length; ty += 1) {
        for (let tx = 0; tx < world.ground[ty].length; tx += 1) {
          if (world.ground[ty][tx] === "k") lanes.push({ tx, ty });
        }
      }
      expect(lanes.length, world.id).toBeGreaterThan(10);
      // One connected ring: every lane tile has an orthogonal lane neighbor
      // path back to the first (no chopped mid-lane end into grass).
      const seen = new Set([`${lanes[0].tx},${lanes[0].ty}`]);
      const queue = [lanes[0]];
      while (queue.length) {
        const cur = queue.shift();
        for (const [dx, dy] of Object.values(DIR)) {
          const tx = cur.tx + dx;
          const ty = cur.ty + dy;
          const key = `${tx},${ty}`;
          if (seen.has(key) || world.ground[ty]?.[tx] !== "k") continue;
          seen.add(key);
          queue.push({ tx, ty });
        }
      }
      expect(seen.size, world.id).toBe(lanes.length);
      // Oval shape matches TRACK_ROWS lane count (corners share edges).
      const expectedK = TRACK_ROWS.join("").split("").filter((ch) => ch === "k").length;
      expect(lanes.length, world.id).toBe(expectedK);
    }
  });

  it("gives Ridgeview and Flatland street plans that are not Brick City copies", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    const maps = Object.fromEntries(cityMaps().map((m) => [m.id, m.build(state)]));
    const brickHome = maps["brick-city"].places.find((p) => p.id === "home");
    const ridgeHome = maps.ridgeview.places.find((p) => p.id === "home");
    const flatHome = maps.flatland.places.find((p) => p.id === "home");
    // At least one core place sits on a different tile than Brick City.
    const brickKeys = new Set(maps["brick-city"].places.map((p) => `${p.id}:${p.tx},${p.ty}`));
    const ridgeDiff = maps.ridgeview.places.filter((p) => !brickKeys.has(`${p.id}:${p.tx},${p.ty}`));
    const flatDiff = maps.flatland.places.filter((p) => !brickKeys.has(`${p.id}:${p.tx},${p.ty}`));
    expect(ridgeDiff.length).toBeGreaterThan(3);
    expect(flatDiff.length).toBeGreaterThan(3);
    expect(`${ridgeHome.tx},${ridgeHome.ty}`).not.toBe(`${brickHome.tx},${brickHome.ty}`);
    // Flatland keeps a crossroads feel: long country asphalt near mid-map.
    expect(maps.flatland.ground[30].includes("r")).toBe(true);
    expect(maps.flatland.ground.some((row, y) => y > 40 && row[32] === "r")).toBe(true);
  });
});
