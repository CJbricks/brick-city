/**
 * town.test.js
 * A new runner has to be able to walk from Home to every other door.
 * This catches a fence, a fountain, or an NPC placed on the only path.
 * It also checks every built city map has one welcome sign, not one
 * per building, and that an old brick-city-save-v1 blob still loads.
 * The track test walks the oval with the same foot box as the runner,
 * and it refuses a fence that shares a tile with a sign or the gate.
 * It also presses A on the 5K board and the TRACK name: the tile under
 * you, and every neighbor facing the sign, has to open the track.
 */

import { describe, expect, it } from "vitest";
import { createNewGame } from "@/lib/activities";
import { paintActivationPads, sceneryLayout, tilesTouchedBy } from "@/game/art";
import { COLS, DIR, ROWS, TRACK_GATE, TRACK_SIGN_TILES, UNBUILT_CITIES, activationTiles, buildWorld, canReach, cityMaps, entranceAt, footBlocked, homeSpawn, isBlocked, lookupInteract, noteArrival, PLACES, TILE, signCopy, trackLaneTiles, unreachableTiles, worldPixelSize } from "@/game/town";
import { cafeRates, clinicRates } from "@/lib/constants";
import { xpToReachLevel } from "@/lib/xp";
import { deserialize } from "@/lib/save";

function citySignsOnMap(world) {
  // Walk this map's own interact grid. A second plaque added only
  // inside build(), and not in the map's signs list, still shows up.
  const found = [];
  for (let ty = 0; ty < world.interact.length; ty += 1) {
    const row = world.interact[ty];
    for (let tx = 0; tx < row.length; tx += 1) {
      const id = row[tx];
      if (typeof id === "string" && id.startsWith("sign-")) found.push({ id, tx, ty });
    }
  }
  return found;
}

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

  it("does not build a map for towns that are still only names", () => {
    const built = new Set(cityMaps().map((map) => map.id));
    expect(built.has("brick-city")).toBe(true);
    for (const city of UNBUILT_CITIES) {
      expect(built.has(city.id), city.name).toBe(false);
    }
  });

  // One assertion per built overworld. Today the loop runs once,
  // for Brick City. A later city added to cityMaps() is checked too.
  for (const map of cityMaps()) {
    it(`puts exactly one city info sign on the ${map.info.name} map`, () => {
      const world = map.build(createNewGame({ name: "Ada", gender: "female" }));
      const onMap = citySignsOnMap(world);
      expect(map.signs, map.id).toHaveLength(1);
      expect(world.signs, map.id).toHaveLength(1);
      expect(onMap, map.id).toEqual(map.signs.map((sign) => ({ id: sign.id, tx: sign.tx, ty: sign.ty })));

      const sign = onMap[0];
      expect(world.interact[sign.ty][sign.tx]).toBe(sign.id);
      expect(isBlocked(world, sign.tx, sign.ty)).toBe(true);
      const reachable = Object.values(DIR).some(([dx, dy]) => !isBlocked(world, sign.tx + dx, sign.ty + dy));
      expect(reachable, map.id).toBe(true);

      const copy = signCopy(map.info);
      expect(copy.speaker).toBe("City sign");
      expect(copy.lines).toEqual([`${map.info.name.toUpperCase()}\n"${map.info.motto}"`]);
      for (const place of map.places) {
        expect(copy.lines[0]).not.toContain(place.name);
      }

      if (map.id !== "brick-city") return;
      // The Home mat is the spawn tile. The post must not seal it.
      expect(isBlocked(world, 5, 7)).toBe(false);
      expect(lookupInteract(world, 5, 7, "left")).toBe("sign-city");
      expect(lookupInteract(world, 5, 7, "up")).toBe("home");

      // Tiles that used to hold a second Brick City plaque. If the
      // ground is a path, the post's collision has to be gone or you
      // still bump an invisible sign. The old mountain post sits on
      // grass, which is already not a path. A must not find a sign.
      const former = [
        [16, 7],
        [9, 13],
        [4, 22],
        [19, 22],
        [26, 10],
        [29, 7],
        [20, 17],
      ];
      const paths = new Set(["r", "d", "k", "i", "x", "s"]);
      for (const [tx, ty] of former) {
        expect(world.interact[ty][tx] ?? null, `${tx},${ty}`).toBeNull();
        if (paths.has(world.ground[ty][tx])) {
          expect(isBlocked(world, tx, ty), `${tx},${ty}`).toBe(false);
        }
      }
    });
  }

  it("loads a brick-city-save-v1 blob onto the one-sign map", () => {
    const legacy = createNewGame({ name: "Ada", gender: "female" });
    // Signs were never stored. Drop the fields an older v1 blob lacks,
    // and use a 16px Home-mat position. Loading must still succeed, and
    // the rebuilt town has the single welcome post. The runner is not
    // left inside a wall.
    delete legacy.tileSize;
    delete legacy.energy;
    delete legacy.sponsors;
    delete legacy.nappedToday;
    legacy.position = { x: 88, y: 120, facing: "up" };
    const loaded = deserialize(JSON.stringify(legacy));
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(1);
    expect(loaded.tileSize).toBe(TILE);
    expect(loaded.position).toEqual({ x: 176, y: 240, facing: "up" });
    // This blob is a Brick City runner. Rebuild that map and require
    // its one welcome post. Other maps, when they exist, are not in
    // the save. The loop above already checks each of them.
    const brick = cityMaps().find((map) => map.id === "brick-city");
    const world = brick.build(loaded);
    expect(citySignsOnMap(world)).toEqual(
      brick.signs.map((sign) => ({ id: sign.id, tx: sign.tx, ty: sign.ty })),
    );
    expect(citySignsOnMap(world)).toHaveLength(1);
    const tx = Math.floor(loaded.position.x / TILE);
    const ty = Math.floor(loaded.position.y / TILE);
    expect(isBlocked(world, tx, ty)).toBe(false);
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
    // (4, 7) is the welcome post, so that one sidewalk tile stays solid.
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
    expect(entranceAt(40, 10)).toBe("clinic");
    expect(entranceAt(39, 15)).toBe("cafe");
  });

  it("keeps every walkable tile reachable, including the trails and the clinic", () => {
    const closed = buildWorld(createNewGame({ name: "Ada", gender: "female" }));
    const home = homeSpawn();
    const origin = { tx: Math.floor(home.x / TILE), ty: Math.floor(home.y / TILE) };
    // A tile that only touches the path on a corner is not reachable.
    // The search steps up, down, left, and right, the same way the feet do.
    expect(unreachableTiles(closed, origin)).toEqual([]);
    expect(closed.ground.some((row) => row.includes("h"))).toBe(true);
    expect(canReach(closed, origin, { tx: 40, ty: 10 })).toBe(true);
    expect(lookupInteract(closed, 40, 10, "down")).toBe("clinic");
    expect(canReach(closed, origin, { tx: 39, ty: 15 })).toBe(true);
    expect(lookupInteract(closed, 39, 15, "down")).toBe("cafe");
    expect(closed.ground[15][39]).toBe("s");
    expect(closed.ground[15][35]).toBe("s");
    expect(closed.ground[10][35]).toBe("s");

    const openState = createNewGame({ name: "Ada", gender: "female" });
    openState.xp.overall = xpToReachLevel(8);
    openState.progress.parkTrailRuns = 5;
    openState.gear.equipped = "trail";
    const open = buildWorld(openState);
    expect(open.mountainOpen).toBe(true);
    expect(unreachableTiles(open, origin)).toEqual([]);
    const parkGrass = [];
    const mountainGrass = [];
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        if (open.ground[ty][tx] !== "h") continue;
        if (ty >= 22) parkGrass.push({ tx, ty });
        if (ty <= 6) mountainGrass.push({ tx, ty });
      }
    }
    expect(parkGrass.length).toBeGreaterThan(8);
    expect(mountainGrass.length).toBeGreaterThan(8);
    // A dead end is a walkable tile with exactly one walkable neighbor.
    const deadEnds = (tiles) => tiles.filter((tile) => {
      if (isBlocked(open, tile.tx, tile.ty)) return false;
      const neighbors = Object.values(DIR).filter(([dx, dy]) => !isBlocked(open, tile.tx + dx, tile.ty + dy));
      return neighbors.length === 1;
    });
    const parkWalkable = [];
    for (let ty = 28; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        if (!isBlocked(open, tx, ty)) parkWalkable.push({ tx, ty });
      }
    }
    expect(deadEnds(parkWalkable).length).toBeGreaterThan(0);
    expect(deadEnds(open.mountainTrail).length).toBeGreaterThan(0);
    for (const cell of closed.mountainTrail) {
      expect(isBlocked(closed, cell.tx, cell.ty), `${cell.tx},${cell.ty}`).toBe(true);
      expect(isBlocked(open, cell.tx, cell.ty), `${cell.tx},${cell.ty} open`).toBe(false);
    }
  });

  it("plans a PT clinic for every unbuilt city, with Summit Hollow the priciest", () => {
    expect(UNBUILT_CITIES.length).toBeGreaterThan(0);
    const prices = UNBUILT_CITIES.map((city) => city.clinic.treatment);
    expect(prices.every((price) => price > 0)).toBe(true);
    const summit = UNBUILT_CITIES.find((city) => city.id === "summit-hollow");
    expect(summit.clinic.treatment).toBe(clinicRates("summit-hollow").treatment);
    expect(summit.clinic.treatment).toBeGreaterThan(clinicRates("brick-city").treatment);
    expect(summit.clinic.treatment).toBe(Math.max(...prices, clinicRates("brick-city").treatment));
  });

  it("plans a coffee shop for every unbuilt city, with Summit Hollow the priciest", () => {
    expect(UNBUILT_CITIES.every((city) => city.cafe && city.cafe.name && city.cafe.pastry)).toBe(true);
    const prices = UNBUILT_CITIES.map((city) => city.cafe.coffee);
    const summit = UNBUILT_CITIES.find((city) => city.id === "summit-hollow");
    expect(summit.cafe.coffee).toBe(cafeRates("summit-hollow").coffee);
    expect(summit.cafe.coffee).toBeGreaterThan(cafeRates("brick-city").coffee);
    expect(summit.cafe.pastryCost).toBeGreaterThan(cafeRates("brick-city").pastryCost);
    expect(summit.cafe.coffee).toBe(Math.max(...prices, cafeRates("brick-city").coffee));
    const names = new Set(UNBUILT_CITIES.map((city) => city.cafe.name));
    names.add(cafeRates("brick-city").name);
    expect(names.size).toBe(UNBUILT_CITIES.length + 1);
  });
});

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function tileKey(tile) {
  return `${tile.tx},${tile.ty}`;
}

/**
 * One pixel at a time, the same way the runner slides along a wall:
 * try X, then Y, and stop if neither axis can move. A diagonal-only
 * corner fails this, which is the broken top-left of the old oval.
 */
function walkFeet(world, from, to) {
  let x = from.x;
  let y = from.y;
  const guard = TILE * 8;
  for (let step = 0; step < guard && (x !== to.x || y !== to.y); step += 1) {
    const dx = Math.sign(to.x - x);
    const dy = Math.sign(to.y - y);
    let nx = x;
    let ny = y;
    if (dx && !footBlocked(world, x + dx, y)) nx = x + dx;
    if (dy && !footBlocked(world, nx, y + dy)) ny = y + dy;
    if (nx === x && ny === y) {
      throw new Error(`feet stuck at ${x},${y} walking to ${to.x},${to.y}`);
    }
    x = nx;
    y = ny;
  }
  expect({ x, y }).toEqual(to);
}

const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

/**
 * A checks the tile you are facing, then the tile under your feet.
 * Both have to come back as the same place, or standing on a sign
 * only works when you happen to face the old booth.
 */
function expectSignOpens(world, tile, id) {
  for (const facing of Object.keys(DIR)) {
    expect(lookupInteract(world, tile.tx, tile.ty, facing), `on ${tile.tx},${tile.ty} facing ${facing}`).toBe(id);
  }
  for (const facing of Object.keys(DIR)) {
    const [dx, dy] = DIR[facing];
    const nx = tile.tx + dx;
    const ny = tile.ty + dy;
    const toward = OPPOSITE[facing];
    expect(lookupInteract(world, nx, ny, toward), `from ${nx},${ny} facing ${toward}`).toBe(id);
  }
}

describe("track sign interaction", () => {
  it("opens the track from the 5K board, the TRACK name, and the booth", () => {
    const world = buildWorld(createNewGame({ name: "Ada", gender: "female" }));
    const scene = sceneryLayout();
    // The picture and the button have to name the same tiles. Moving
    // the board in art.js without moving TRACK_SIGN_TILES fails here.
    for (const id of ["5k", "track"]) {
      const painted = tilesTouchedBy(scene.signs.find((sign) => sign.id === id));
      const listed = TRACK_SIGN_TILES.filter((tile) => tile.id === id);
      expect(painted.map((tile) => `${tile.tx},${tile.ty}`).sort()).toEqual(
        listed.map((tile) => `${tile.tx},${tile.ty}`).sort(),
      );
      for (const tile of painted) {
        expect(world.interact[tile.ty][tile.tx], `${id} ${tile.tx},${tile.ty}`).toBe("track");
        expect(isBlocked(world, tile.tx, tile.ty), `${id} sign is solid`).toBe(false);
        expectSignOpens(world, tile, "track");
      }
    }
    const booth = PLACES.find((place) => place.id === "track");
    expect(booth).toMatchObject({ tx: 26, ty: 12 });
    expectSignOpens(world, booth, "track");
    // East of the 5K board is the west rail, not a path. A still
    // resolves if a later edit opens that grass. You just cannot
    // walk there today.
    expect(isBlocked(world, 27, 11)).toBe(true);
    expect(lookupInteract(world, 27, 11, "left")).toBe("track");
  });

  it("still opens the other doorsteps and people", () => {
    const world = buildWorld(createNewGame({ name: "Ada", gender: "female" }));
    for (const place of PLACES) {
      expect(lookupInteract(world, place.tx, place.ty, place.facing), place.id).toBe(place.id);
      // Standing on the mat and looking away still counts. The feet
      // are the doorstep. Facing the door is the other way in.
      expect(lookupInteract(world, place.tx, place.ty, "down"), `${place.id} feet`).toBe(place.id);
    }
    // Remy stands on the sidewalk south of the booth. Face him.
    expect(lookupInteract(world, 25, 16, "right")).toBe("rival");
    expect(lookupInteract(world, 26, 15, "down")).toBe("rival");
  });
});

describe("activation mats", () => {
  it("paints a pad on every tile you can stand on to press A, and nowhere else", () => {
    const world = buildWorld(createNewGame({ name: "Ada", gender: "female" }));
    const standable = [];
    for (let ty = 0; ty < world.interact.length; ty += 1) {
      for (let tx = 0; tx < world.interact[ty].length; tx += 1) {
        if (world.interact[ty][tx] && !isBlocked(world, tx, ty)) {
          standable.push({ tx, ty, id: world.interact[ty][tx] });
        }
      }
    }
    const pads = activationTiles(world);
    expect(pads).toEqual(standable);
    // The painter stamps those squares and no others. A full-tile rect
    // is the mat's outline. Anything else would be a second list.
    const stamped = [];
    const ctx = {
      fillStyle: "",
      fillRect(x, y, w, h) {
        if (w === TILE && h === TILE) stamped.push({ tx: x / TILE, ty: y / TILE });
      },
    };
    const painted = paintActivationPads(ctx, world);
    expect(painted).toEqual(pads);
    expect(stamped).toEqual(pads.map(({ tx, ty }) => ({ tx, ty })));
    for (const pad of pads) {
      expect(world.interact[pad.ty][pad.tx], `${pad.tx},${pad.ty}`).toBe(pad.id);
      expect(isBlocked(world, pad.tx, pad.ty), `${pad.tx},${pad.ty}`).toBe(false);
    }
    const key = (tile) => `${tile.tx},${tile.ty}`;
    const padKeys = new Set(pads.map(key));
    for (const tile of TRACK_SIGN_TILES) expect(padKeys.has(key(tile)), key(tile)).toBe(true);
    const booth = PLACES.find((place) => place.id === "track");
    expect(padKeys.has(key(booth))).toBe(true);
    for (const id of ["park", "gym", "mountain", "home", "grocery", "store", "depot"]) {
      const place = PLACES.find((item) => item.id === id);
      expect(pads).toContainEqual({ tx: place.tx, ty: place.ty, id });
    }
    // Remy's mat is the sidewalk just north of him, not the square he blocks.
    expect(pads).toContainEqual({ tx: 26, ty: 15, id: "rival" });
    expect(padKeys.has("26,16")).toBe(false);
    expect(pads.some((pad) => pad.id === "sign-city")).toBe(false);
    expect(lookupInteract(world, 26, 15, "up")).toBe("rival");
    expect(lookupInteract(world, 26, 17, "up")).toBe("rival");
  });
});

describe("track gate and signs", () => {
  it("joins the lane into one oval and keeps fences off signs and the gate", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    const world = buildWorld(state);
    const scene = sceneryLayout();
    const signTiles = new Set();
    for (const sign of scene.signs) {
      for (const tile of tilesTouchedBy(sign)) signTiles.add(tileKey(tile));
    }
    const fenceTiles = new Set();
    for (const fence of scene.fences) {
      for (const sign of scene.signs) {
        expect(rectsOverlap(sign, fence), `${sign.id} overlaps ${fence.id}`).toBe(false);
      }
      for (const tile of tilesTouchedBy(fence)) {
        const key = tileKey(tile);
        expect(signTiles.has(key), `${fence.id} shares ${key} with a sign`).toBe(false);
        fenceTiles.add(key);
      }
    }

    const lanes = trackLaneTiles();
    expect(lanes.length).toBeGreaterThan(10);
    const laneKeys = new Set(lanes.map(tileKey));
    // One piece. A loose red square has no orthogonal neighbor in this set.
    const seen = new Set([tileKey(lanes[0])]);
    const queue = [lanes[0]];
    while (queue.length) {
      const current = queue.shift();
      for (const [dx, dy] of Object.values(DIR)) {
        const next = { tx: current.tx + dx, ty: current.ty + dy };
        const key = tileKey(next);
        if (!laneKeys.has(key) || seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    expect(seen.size).toBe(lanes.length);

    const start = PLACES.find((place) => place.id === "track");
    expect(isBlocked(world, start.tx, start.ty)).toBe(false);
    expect(fenceTiles.has(tileKey(start)), "fence blocks the race booth").toBe(false);
    // The road tile just west of the booth. This is the sidewalk approach.
    expect(canReach(world, { tx: start.tx - 1, ty: start.ty }, start)).toBe(true);
    for (const gate of TRACK_GATE) {
      expect(fenceTiles.has(tileKey(gate)), `fence on gate ${tileKey(gate)}`).toBe(false);
      expect(isBlocked(world, gate.tx, gate.ty), tileKey(gate)).toBe(false);
    }
    for (const lane of lanes) {
      expect(isBlocked(world, lane.tx, lane.ty), tileKey(lane)).toBe(false);
      expect(canReach(world, start, lane), tileKey(lane)).toBe(true);
      expect(fenceTiles.has(tileKey(lane)), `fence on lane ${tileKey(lane)}`).toBe(false);
    }

    const center = (tile) => ({ x: (tile.tx + 0.5) * TILE, y: (tile.ty + 0.5) * TILE });
    walkFeet(world, center(start), center({ tx: 27, ty: 12 }));
    for (const lane of lanes) {
      expect(footBlocked(world, center(lane).x, center(lane).y), tileKey(lane)).toBe(false);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const next = { tx: lane.tx + dx, ty: lane.ty + dy };
        if (!laneKeys.has(tileKey(next))) continue;
        walkFeet(world, center(lane), center(next));
      }
    }
  });
});
