/**
 * town.js
 * The layout of Brick City: roads, doors, and who stands where.
 * No drawing happens here. art.js paints this data, and the simulation
 * only asks it for the home spawn. Keeping the grid as plain numbers
 * means a test can walk from Home to the track without a browser.
 *
 * Coordinates are tiles. (0, 0) is the top-left tree border. Y grows
 * downward, same as the screen. A "mat" is the walkable tile in front of
 * a door. Standing on it and pressing A opens that place.
 *
 * TILE is 32 source pixels. v1 used 16. A saved position is a pixel,
 * not a tile, so an old save has to be doubled on load (see save.js)
 * or the runner spawns halfway into the next tile and often in a wall.
 */

import { CITY_INFO } from "@/lib/constants";
import { isMountainOpen } from "@/lib/unlocks";

export { CITY_INFO };

export const TILE = 32;
export const COLS = 36;
export const ROWS = 30;

export const DIR = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

const WALK = new Set(["r", "d", "k", "i", "x"]);

export const BUILDINGS = [
  { id: "home", x: 2, y: 2, w: 7, h: 5, door: { x: 5, y: 6 } },
  { id: "grocery", x: 14, y: 2, w: 8, h: 5, door: { x: 17, y: 6 } },
  { id: "gym", x: 2, y: 11, w: 7, h: 7, door: { x: 8, y: 14 } },
  { id: "store", x: 2, y: 23, w: 7, h: 5, door: { x: 5, y: 23 } },
];

/**
 * One signpost per place, on a tile that is not the door mat. The post
 * itself is solid. The mat next to it stays walkable, so you face the
 * sign and press A instead of standing on it.
 */
export const CITY_SIGNS = [
  { id: "sign-home", placeId: "home", placeName: "Home", tx: 4, ty: 7 },
  { id: "sign-grocery", placeId: "grocery", placeName: "Grocery", tx: 16, ty: 7 },
  { id: "sign-gym", placeId: "gym", placeName: "Gym", tx: 9, ty: 13 },
  { id: "sign-store", placeId: "store", placeName: "Run Store", tx: 4, ty: 22 },
  { id: "sign-park", placeId: "park", placeName: "Park", tx: 19, ty: 22 },
  { id: "sign-track", placeId: "track", placeName: "Local Track", tx: 26, ty: 10 },
  { id: "sign-mountain", placeId: "mountain", placeName: "Mountain Gate", tx: 29, ty: 7 },
  { id: "sign-depot", placeId: "depot", placeName: "World Depot", tx: 20, ty: 17 },
];

export function signCopy(sign) {
  // One page, not three presses. The sign is a plaque: city, motto, place.
  return {
    speaker: "City sign",
    lines: [`${CITY_INFO.name.toUpperCase()}\n"${CITY_INFO.motto}"\n${sign.placeName}`],
  };
}

export const PLACES = [
  { id: "home", name: "Home", tx: 5, ty: 7, facing: "up" },
  { id: "grocery", name: "Grocery", tx: 17, ty: 7, facing: "up" },
  { id: "gym", name: "Gym", tx: 9, ty: 14, facing: "left" },
  { id: "store", name: "Run Store", tx: 5, ty: 22, facing: "down" },
  { id: "park", name: "Park", tx: 18, ty: 22, facing: "down" },
  { id: "track", name: "Local Track", tx: 26, ty: 12, facing: "right" },
  { id: "mountain", name: "Mountain Gate", tx: 30, ty: 8, facing: "up", lock: "mountain" },
  { id: "depot", name: "World Depot", tx: 19, ty: 17, facing: "up" },
];

const NPCS = [
  {
    id: "ranger",
    name: "Ranger Inez Quill",
    tx: 30,
    ty: 7,
    facing: "down",
    palette: "ranger",
    gender: "female",
    location: "mountain",
  },
  {
    id: "rival",
    name: "Remy Calder",
    tx: 26,
    ty: 16,
    facing: "left",
    palette: "rival",
    gender: "male",
    location: "rival",
  },
  {
    id: "juniper",
    name: "Juniper Hale",
    tx: 16,
    ty: 25,
    facing: "down",
    palette: "jogger",
    gender: "female",
    location: "chat-juniper",
  },
  {
    id: "bram",
    name: "Coach Bram",
    tx: 15,
    ty: 13,
    facing: "down",
    palette: "coach",
    gender: "male",
    location: "chat-bram",
  },
];

function blank() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill("g"));
}

function fillRect(grid, x, y, w, h, code) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS) grid[yy][xx] = code;
    }
  }
}

function hRoad(grid, y, x0, x1) {
  fillRect(grid, x0, y, x1 - x0 + 1, 2, "r");
}

function vRoad(grid, x, y0, y1) {
  fillRect(grid, x, y0, 2, y1 - y0 + 1, "r");
}

function stamp(grid, x, y, rows, codes) {
  rows.forEach((row, yy) => {
    [...row].forEach((ch, xx) => {
      const code = codes[ch];
      if (code) grid[y + yy][x + xx] = code;
    });
  });
}

export function createGround() {
  const grid = blank();
  fillRect(grid, 0, 0, COLS, 1, "t");
  fillRect(grid, 0, ROWS - 1, COLS, 1, "t");
  fillRect(grid, 0, 0, 1, ROWS, "t");
  fillRect(grid, COLS - 1, 0, 1, ROWS, "t");

  // Two east-west streets and two north-south streets. The blocks between
  // them are the buildings. Doors sit on the grass strip just off the road.
  hRoad(grid, 8, 2, 33);
  hRoad(grid, 20, 2, 33);
  vRoad(grid, 10, 2, 27);
  vRoad(grid, 24, 2, 27);

  // Stoops and sidewalks so every door actually touches the street.
  grid[7][5] = "d";
  grid[7][17] = "d";
  grid[7][4] = "f";
  grid[7][6] = "f";
  // Gym mat sits just west of the west street (x 9, y 14). grid is [y][x].
  grid[14][9] = "d";
  fillRect(grid, 26, 11, 1, 8, "d");
  grid[22][5] = "d";
  grid[22][18] = "d";

  // Center plaza, touching all four roads so you can cut across town.
  fillRect(grid, 12, 10, 12, 10, "d");
  fillRect(grid, 17, 14, 2, 2, "n");

  // Park dirt loop and pond, south of the lower street.
  fillRect(grid, 16, 23, 15, 1, "d");
  fillRect(grid, 16, 27, 15, 1, "d");
  for (let y = 24; y <= 26; y += 1) {
    grid[y][16] = "d";
    grid[y][30] = "d";
  }
  fillRect(grid, 24, 25, 5, 2, "w");
  grid[23][18] = "d";

  // Trees and rocks. The border is already trees.
  const trees = [
    [3, 10], [8, 19], [14, 24], [32, 24], [14, 27], [32, 27], [21, 24], [33, 23],
    [13, 22], [22, 11], [20, 18],
  ];
  for (const [x, y] of trees) grid[y][x] = "t";

  const rocks = [
    [27, 2], [28, 2], [29, 2], [31, 2], [32, 2], [33, 2],
    [27, 3], [28, 3], [32, 3], [33, 3],
    [27, 4], [33, 4], [27, 5], [33, 5],
    [28, 6], [29, 6], [31, 6], [32, 6],
  ];
  for (const [x, y] of rocks) grid[y][x] = "o";
  // The trail corridor behind the gate. The gate tile itself is x30,y6.
  grid[4][30] = "d";
  grid[5][30] = "d";
  grid[6][30] = "d";
  grid[3][30] = "o";
  grid[7][30] = "d";

  // Track oval in the east block.
  stamp(grid, 27, 11, [
    "..kkk..",
    ".kiiik.",
    "kiiiiik",
    "kiiiiik",
    "kiiiiik",
    "kiiiiik",
    ".kiiik.",
    "..kkk..",
  ], { k: "k", i: "i" });

  return grid;
}

export function tileCenter(tx, ty) {
  return {
    x: (tx + 0.5) * TILE,
    y: (ty + 0.5) * TILE,
  };
}

export function spawnFor(placeId) {
  const place = PLACES.find((item) => item.id === placeId);
  const center = tileCenter(place.tx, place.ty);
  return { ...center, facing: place.facing, tx: place.tx, ty: place.ty };
}

export function homeSpawn() {
  return spawnFor("home");
}

/**
 * mountainOpen changes two things: the gate tile, and whether the dirt
 * behind it is a path or a wall. Passing the whole state in keeps the
 * rule in unlocks.js instead of a second copy.
 */
export function buildWorld(state) {
  const ground = createGround();
  const mountainOpen = state ? isMountainOpen(state) : false;
  const blocked = ground.map((row) => row.map((code) => !WALK.has(code)));

  for (const building of BUILDINGS) {
    for (let y = building.y; y < building.y + building.h; y += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        blocked[y][x] = true;
      }
    }
  }

  // Fountain tiles use "n" which is already not in WALK. Gate:
  // closed, the gate and the ridge path stay blocked. Open, you can
  // step through and look up the trail. The run itself is still a menu.
  blocked[6][30] = !mountainOpen;
  blocked[5][30] = !mountainOpen;
  blocked[4][30] = !mountainOpen;

  const interact = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (const place of PLACES) {
    interact[place.ty][place.tx] = place.id;
  }
  for (const building of BUILDINGS) {
    interact[building.door.y][building.door.x] = building.id;
  }
  for (const npc of NPCS) {
    blocked[npc.ty][npc.tx] = true;
    interact[npc.ty][npc.tx] = npc.location;
  }
  for (const sign of CITY_SIGNS) {
    blocked[sign.ty][sign.tx] = true;
    interact[sign.ty][sign.tx] = sign.id;
  }

  return {
    ground,
    blocked,
    interact,
    npcs: NPCS,
    buildings: BUILDINGS,
    places: PLACES,
    signs: CITY_SIGNS,
    mountainOpen,
  };
}

export function tileOf(px, py) {
  return {
    tx: Math.floor(px / TILE),
    ty: Math.floor(py / TILE),
  };
}

export function inBounds(tx, ty) {
  return tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS;
}

export function isBlocked(world, tx, ty) {
  if (!inBounds(tx, ty)) return true;
  return world.blocked[ty][tx];
}

/**
 * Look at the tile you're facing first (a door or a person), then the
 * tile under your feet (the mat). Either one is enough to talk.
 */
export function lookupInteract(world, tx, ty, facing) {
  const [dx, dy] = DIR[facing] || DIR.down;
  const fx = tx + dx;
  const fy = ty + dy;
  if (inBounds(fx, fy) && world.interact[fy][fx]) return world.interact[fy][fx];
  if (inBounds(tx, ty) && world.interact[ty][tx]) return world.interact[ty][tx];
  return null;
}

export function placeById(id) {
  return PLACES.find((place) => place.id === id) || null;
}

export function placeIsLocked(place, state) {
  if (!place || place.lock !== "mountain") return false;
  return !isMountainOpen(state);
}

/**
 * Breadth-first search used by the "can I walk there?" test and, later,
 * if we want the game to refuse a broken quick-travel point.
 */
export function canReach(world, from, to) {
  if (from.tx === to.tx && from.ty === to.ty) return true;
  const seen = new Set([`${from.tx},${from.ty}`]);
  const queue = [from];
  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy] of Object.values(DIR)) {
      const tx = current.tx + dx;
      const ty = current.ty + dy;
      const key = `${tx},${ty}`;
      if (seen.has(key) || isBlocked(world, tx, ty)) continue;
      if (tx === to.tx && ty === to.ty) return true;
      seen.add(key);
      queue.push({ tx, ty });
    }
  }
  return false;
}

export function worldPixelSize() {
  return { width: COLS * TILE, height: ROWS * TILE };
}
