/**
 * shared.js
 * Helpers for building town and road overworlds at TOWN_MAP_* size.
 *
 * Every themed city gets the same core training locations (home/inn,
 * shops, clinic, cafe with Wi-Fi, depot, trails/park). This file stamps
 * roads, buildings, and interact grids so Ridgeview and Flatland stay
 * the same footprint as Brick City without copying every line of town.js.
 *
 * Sidewalk letters ("s") must meet every door mat. The gym mat is west
 * of the x=10 road at (9, 14); the track booth sits on (26, 12). Those
 * two used to stay grass in stampCoreTown, so A worked on the interact
 * grid but feet could not stand there.
 */

// Same footprint as town.js (avoid importing town.js — circular).
export const TILE = 32;
export const MAP_COLS = 72;
export const MAP_ROWS = 66;

export const DIR = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

const WALK = new Set(["r", "d", "k", "i", "x", "s", "h"]);

export function emptyGround(fill = "g") {
  return Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(fill));
}

export function hRoad(ground, y, x0, x1, code = "r") {
  for (let x = x0; x <= x1; x += 1) {
    if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) ground[y][x] = code;
  }
}

export function vRoad(ground, x, y0, y1, code = "r") {
  for (let y = y0; y <= y1; y += 1) {
    if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) ground[y][x] = code;
  }
}

export function fillRect(ground, x0, y0, w, h, code) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) ground[y][x] = code;
    }
  }
}

/** Tree border so you cannot walk off the map. */
export function ringTrees(ground) {
  for (let x = 0; x < MAP_COLS; x += 1) {
    ground[0][x] = "t";
    ground[MAP_ROWS - 1][x] = "t";
  }
  for (let y = 0; y < MAP_ROWS; y += 1) {
    ground[y][0] = "t";
    ground[y][MAP_COLS - 1] = "t";
  }
}

/**
 * Core brick-style town skeleton shared by Ridgeview and Flatland.
 * Buildings sit near Brick City's original coords so art drawers work.
 */
export function stampCoreTown(ground) {
  ringTrees(ground);
  // Main streets. Lower east-west is y=20 (same as Brick City), not y=18:
  // the cafe footprint is y=16..19, so a road on 18 sealed the PT block
  // and cut Flatland's farm road off from home.
  hRoad(ground, 8, 1, MAP_COLS - 2);
  hRoad(ground, 20, 1, MAP_COLS - 2);
  hRoad(ground, 28, 1, 40);
  vRoad(ground, 10, 1, MAP_ROWS - 2);
  vRoad(ground, 22, 1, 40);
  vRoad(ground, 35, 8, 40);
  // Sidewalks under doors
  hRoad(ground, 7, 2, 20, "s");
  // Clinic / cafe block: join the x=35 spine to the door mats (Brick City
  // paves from 34/35 east). Leaving 36–37 as grass used to island the PT.
  hRoad(ground, 10, 35, 44, "s");
  hRoad(ground, 15, 35, 44, "s");
  vRoad(ground, 35, 10, 15, "s");
  hRoad(ground, 17, 14, 24, "s");
  // Through x=9 so the mat meets the x=10 road (Brick City paves 2..9).
  hRoad(ground, 22, 2, 9, "s");
  // Gym mat column: west of the x=10 street, same gap Brick City uses.
  vRoad(ground, 9, 10, 19, "s");
  // Track approach / booth strip east of the plaza (booth at 26, 12).
  vRoad(ground, 26, 10, 19, "s");
  // Depot mat (19, 17) and park approach
  ground[17][19] = "s";
  ground[30][18] = "x";
  // Plaza
  fillRect(ground, 14, 12, 8, 5, "d");
  // Park dirt + tall grass south
  fillRect(ground, 14, 30, 18, 12, "x");
  fillRect(ground, 16, 34, 10, 6, "h");
  // Pond
  fillRect(ground, 18, 32, 4, 3, "w");
  // Small track oval pad so the booth meets a walkable lane edge.
  fillRect(ground, 27, 11, 7, 8, "k");
  fillRect(ground, 28, 12, 5, 6, "i");
}

export const CORE_BUILDINGS = [
  { id: "home", x: 2, y: 2, w: 7, h: 5, door: { x: 5, y: 6 } },
  { id: "grocery", x: 14, y: 2, w: 8, h: 5, door: { x: 17, y: 6 } },
  { id: "gym", x: 2, y: 11, w: 7, h: 7, door: { x: 8, y: 14 } },
  { id: "store", x: 2, y: 23, w: 7, h: 5, door: { x: 5, y: 23 } },
  { id: "clinic", x: 38, y: 11, w: 6, h: 4, door: { x: 40, y: 11 } },
  { id: "cafe", x: 36, y: 16, w: 8, h: 4, door: { x: 39, y: 16 } },
];

export function corePlaces(cafeName, trailName = "Trails") {
  return [
    { id: "home", name: "Inn", tx: 5, ty: 7, facing: "up" },
    { id: "grocery", name: "Grocery", tx: 17, ty: 7, facing: "up" },
    { id: "gym", name: "Gym", tx: 9, ty: 14, facing: "left" },
    { id: "store", name: "Run Store", tx: 5, ty: 22, facing: "down" },
    { id: "park", name: trailName, tx: 18, ty: 30, facing: "down" },
    { id: "track", name: "Local Track", tx: 26, ty: 12, facing: "right" },
    { id: "mountain", name: "Trail Head", tx: 30, ty: 8, facing: "up" },
    { id: "depot", name: "World Depot", tx: 19, ty: 17, facing: "up" },
    { id: "clinic", name: "PT Clinic", tx: 40, ty: 10, facing: "down" },
    { id: "cafe", name: cafeName, tx: 39, ty: 15, facing: "down" },
    { id: "activity", name: "Activity Board", tx: 20, ty: 14, facing: "up" },
  ];
}

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

export function spawnAt(tx, ty, facing = "down") {
  return { ...tileCenter(tx, ty), facing, tx, ty };
}

/**
 * Stamp blocked + interact from buildings, places, NPCs, signs, landmarks.
 */
export function assembleWorld({
  id,
  info,
  ground,
  buildings,
  places,
  npcs = [],
  signs = [],
  landmarks = [],
  activityBoard = null,
  trackSigns = [],
  mountainOpen = true,
  mountainTrail = [],
}) {
  const blocked = ground.map((row) => row.map((code) => !WALK.has(code)));
  for (const building of buildings) {
    for (let y = building.y; y < building.y + building.h; y += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) blocked[y][x] = true;
      }
    }
  }
  for (const mark of landmarks) {
    for (let y = mark.ty; y < mark.ty + mark.h; y += 1) {
      for (let x = mark.tx; x < mark.tx + mark.w; x += 1) {
        if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) blocked[y][x] = true;
      }
    }
  }
  if (!mountainOpen) {
    for (const cell of mountainTrail) {
      if (cell.ty >= 0 && cell.ty < MAP_ROWS && cell.tx >= 0 && cell.tx < MAP_COLS) {
        blocked[cell.ty][cell.tx] = true;
      }
    }
  }

  const interact = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(null));
  for (const place of places) {
    if (place.ty >= 0 && place.ty < MAP_ROWS && place.tx >= 0 && place.tx < MAP_COLS) {
      interact[place.ty][place.tx] = place.id;
    }
  }
  for (const tile of trackSigns) {
    interact[tile.ty][tile.tx] = "track";
  }
  for (const building of buildings) {
    interact[building.door.y][building.door.x] = building.id;
  }
  for (const npc of npcs) {
    blocked[npc.ty][npc.tx] = true;
    interact[npc.ty][npc.tx] = npc.location;
    if (npc.stand && !interact[npc.stand.ty][npc.stand.tx]) {
      interact[npc.stand.ty][npc.stand.tx] = npc.location;
    }
  }
  for (const sign of signs) {
    blocked[sign.ty][sign.tx] = true;
    interact[sign.ty][sign.tx] = sign.id;
  }
  if (activityBoard) {
    blocked[activityBoard.kiosk.ty][activityBoard.kiosk.tx] = true;
    interact[activityBoard.kiosk.ty][activityBoard.kiosk.tx] = activityBoard.id;
    interact[activityBoard.mat.ty][activityBoard.mat.tx] = activityBoard.id;
  }

  return {
    id,
    info,
    ground,
    blocked,
    interact,
    npcs,
    buildings,
    places,
    signs,
    landmarks,
    mountainOpen,
    mountainTrail,
    activityBoard,
  };
}

export { WALK };
