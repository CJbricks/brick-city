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
 *
 * The town has one welcome sign. It names the city and the motto, and
 * it stands on the sidewalk beside the Home mat (where you start).
 * Building name boards (HOME, GROCERY, and the rest) are painted in
 * art.js. They are not in this file, and they are not solid. Signs are
 * not stored in brick-city-save-v1, so an old save just rebuilds this map.
 *
 * The running track is a closed oval of "k" tiles east of the sidewalk
 * at x = 26. Corners are two tiles wide on purpose: a one-tile diagonal
 * step is not a path the feet can follow, so those corners used to look
 * like loose red squares and stop a lap. The gate is the sidewalk tiles
 * next to the west lane. art.js must not paint a fence on those tiles
 * or on the 5K board.
 *
 * Pressing A opens the track from the race booth and from the painted
 * signs. The 5K board is the sidewalk tile (26, 11). The TRACK name
 * board sits on the road above the north rail and covers two tiles.
 * Those pictures moved in the oval rebuild. The button used to listen
 * only to the booth, so standing on a sign did nothing.
 *
 * activationTiles() is the list of squares you can stand on to press A.
 * art.js paints those squares as gold mats. It does not keep a second
 * list of coordinates, so the mat cannot drift off the button again.
 *
 * cityMaps() is the list of overworlds that actually exist. Brick City
 * is the only one. Ridgeview, Lakeport, Mesa Verde Flats, Flatland, and
 * Summit Hollow are names in the design. They are in UNBUILT_CITIES and
 * have no tiles. Each of those records still names a PT clinic, so a
 * later map has a place to put the door. Summit Hollow's clinic is the
 * expensive one.
 *
 * The park trail keeps the pond loop and then winds south through tall
 * grass. The mountain trail keeps the gate at x=30 and then winds east
 * through the rocks. Both are one connected walk. Deep grass is the
 * letter h. It is walkable. Stepping on it can find an item (forage.js).
 */

import { CITIES, CITY_INFO } from "@/lib/constants";
import { isMountainOpen } from "@/lib/unlocks";

export { CITY_INFO };

export const TILE = 32;
// Wider and taller than the old 36×30 town so the two trails have room
// to branch. The buildings, roads, and doors stay on their old tiles.
export const COLS = 48;
export const ROWS = 46;

export const DIR = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

const WALK = new Set(["r", "d", "k", "i", "x", "s", "h"]);

export const BUILDINGS = [
  { id: "home", x: 2, y: 2, w: 7, h: 5, door: { x: 5, y: 6 } },
  { id: "grocery", x: 14, y: 2, w: 8, h: 5, door: { x: 17, y: 6 } },
  { id: "gym", x: 2, y: 11, w: 7, h: 7, door: { x: 8, y: 14 } },
  { id: "store", x: 2, y: 23, w: 7, h: 5, door: { x: 5, y: 23 } },
  // East of the upper road, past the track. Door faces north onto the
  // sidewalk at y=10, the same idea as Home's mat between the door and
  // the street. The sign says PT. It is not a red cross.
  { id: "clinic", x: 38, y: 11, w: 6, h: 4, door: { x: 40, y: 11 } },
];

/**
 * The one city info sign. An earlier pass put this same plaque beside
 * every place, so eight posts all read "BRICK CITY" and the motto.
 * Those copies are gone. This post is the sidewalk tile just west of
 * the Home mat: you spawn on (5, 7) facing the door, and turning left
 * faces the sign. The post is solid. The mat stays walkable, so you
 * stand next to it and press A.
 */
export const CITY_SIGNS = [
  { id: "sign-city", tx: 4, ty: 7 },
];

export function signCopy(info = CITY_INFO) {
  // One page. The plaque is that city's name and motto, not a building
  // name. Building names are the boards painted on the buildings.
  // The default is Brick City, the only map you can walk today.
  return {
    speaker: "City sign",
    lines: [`${info.name.toUpperCase()}\n"${info.motto}"`],
  };
}

/**
 * Track oval, stamped at TRACK_ORIGIN. "k" is the red lane, "i" is the
 * infield. The dots stay grass. Each "k" shares a full edge with the next
 * "k", including the corners. A corner that only touched on the diagonal
 * drew as its own white-bordered square and the feet could not cross it.
 */
export const TRACK_ORIGIN = { tx: 27, ty: 11 };

export const TRACK_ROWS = [
  ".kkkkk.",
  "kkiiikk",
  "kiiiiik",
  "kiiiiik",
  "kiiiiik",
  "kiiiiik",
  "kkiiikk",
  ".kkkkk.",
];

/**
 * Opening from the sidewalk (x = 26) onto the west lane (x = 27).
 * The race booth is (26, 12). These tiles stay walkable, and the fence
 * painter is not allowed to use them.
 */
export const TRACK_GATE = [
  { tx: 26, ty: 12 },
  { tx: 26, ty: 13 },
  { tx: 26, ty: 14 },
  { tx: 26, ty: 15 },
  { tx: 27, ty: 12 },
  { tx: 27, ty: 13 },
  { tx: 27, ty: 14 },
  { tx: 27, ty: 15 },
];

/**
 * Painted signs that open the same menu as the race booth (PLACES
 * "track" at 26, 12). id matches sceneryLayout() in art.js so a test
 * can check the picture and the button still share a tile.
 *
 * "5k" is one sidewalk tile. "track" is the TRACK name on the road,
 * wide enough to spill into the next tile. Both stay walkable. A looks
 * at the tile you face, then the tile under your feet, so the sign
 * itself has to be in this list or standing on it is a dead button.
 */
export const TRACK_SIGN_TILES = [
  { id: "5k", tx: 26, ty: 11 },
  { id: "track", tx: 27, ty: 9 },
  { id: "track", tx: 28, ty: 9 },
];

export function trackLaneTiles() {
  const tiles = [];
  TRACK_ROWS.forEach((row, yy) => {
    [...row].forEach((ch, xx) => {
      if (ch === "k") tiles.push({ tx: TRACK_ORIGIN.tx + xx, ty: TRACK_ORIGIN.ty + yy });
    });
  });
  return tiles;
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
  { id: "clinic", name: "PT Clinic", tx: 40, ty: 10, facing: "down" },
];

const NPCS = [
  {
    id: "ranger",
    name: "Ranger Inez Quill",
    // One tile east of the gate path. Standing on (30, 7) used to block
    // the only step onto the trail. (29, 7) used to be a city-sign post,
    // so the ranger is not put back on that tile either.
    tx: 31,
    ty: 7,
    facing: "left",
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
    // His own square is solid. This is the sidewalk tile just north of
    // him, the one you reach walking down from the booth. Standing on
    // it and pressing A opens the race, same as facing him.
    stand: { tx: 26, ty: 15 },
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

/**
 * Mountain trail, origin (27, 1). Each string is one row, x=27 through
 * x=46. d is the pebble path, h is deep grass, o is rock, and "." means
 * "do not paint over this tile".
 *
 * The path enters only through (30, 6), the old gate corridor, and then
 * bends east. (33, 1), (44, 1), (40, 3), and (42, 6) are dead ends: each
 * has a single walkable neighbor. The h tiles are side pockets off that
 * path. Row y=7 is a rock wall except the gate gap (left alone, it is
 * already the sidewalk). The ranger stands on the rock at (31, 7), so
 * the road east of the gate cannot walk into the trail from the side.
 */
export const MOUNTAIN_ORIGIN = { tx: 27, ty: 1 };

export const MOUNTAIN_PLAN = [
  "oooooodoooooooooodoo",
  "oohddddddddhoohhhdho",
  "oohdhdhhhhddddoohdoo",
  "oohdddhhohdhhooohdoo",
  "oohdohhohhddddddddho",
  "ooodooohhhhhhoodoooo",
  "ooo.oooooooooooooooo",
];

export function mountainTrailCells() {
  const cells = [];
  MOUNTAIN_PLAN.forEach((row, yy) => {
    [...row].forEach((ch, xx) => {
      if (ch !== "d" && ch !== "h") return;
      cells.push({
        tx: MOUNTAIN_ORIGIN.tx + xx,
        ty: MOUNTAIN_ORIGIN.ty + yy,
        code: ch,
      });
    });
  });
  return cells;
}

function stampMountain(grid) {
  MOUNTAIN_PLAN.forEach((row, yy) => {
    [...row].forEach((ch, xx) => {
      if (ch === ".") return;
      const tx = MOUNTAIN_ORIGIN.tx + xx;
      const ty = MOUNTAIN_ORIGIN.ty + yy;
      if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS) grid[ty][tx] = ch;
    });
  });
}

/**
 * Draw an orthogonal path. x changes first, then y, so a call that
 * names two corners becomes an L of tiles that share full edges.
 * A diagonal of single tiles would look connected and still stop the feet.
 */
function orthoLine(x0, y0, x1, y1) {
  const points = [];
  let x = x0;
  let y = y0;
  points.push([x, y]);
  while (x !== x1) {
    x += Math.sign(x1 - x);
    points.push([x, y]);
  }
  while (y !== y1) {
    y += Math.sign(y1 - y);
    points.push([x, y]);
  }
  return points;
}

function paintCodes(grid, points, code) {
  for (const [x, y] of points) {
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) grid[y][x] = code;
  }
}

function paintGrassWhereEmpty(grid, points) {
  for (const [x, y] of points) {
    if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
    if (grid[y][x] === "g") grid[y][x] = "h";
  }
}

/**
 * The pond loop stays where it was. This adds the south trail: one main
 * path from (22, 27) down to a dead end at (22, 42), plus side branches
 * that stop, plus deep grass beside the path but not beside a tip (a
 * grass tile next to a tip would stop it being a dead end).
 */
function layParkTrail(grid) {
  const segments = [
    [22, 28, 22, 30],
    [22, 30, 27, 30],
    [27, 30, 27, 33],
    [27, 33, 19, 33],
    [19, 33, 19, 36],
    [19, 36, 26, 36],
    [26, 36, 26, 39],
    [26, 39, 17, 39],
    [17, 39, 17, 42],
    [17, 42, 22, 42],
    // Branches. The last tile of each is a dead end.
    [25, 30, 25, 29],
    [25, 29, 28, 29],
    [19, 33, 14, 33],
    [24, 36, 24, 38],
    [20, 39, 20, 41],
    [27, 32, 32, 32],
    [32, 32, 32, 34],
    // East of the pond loop. (33, 25) is the tip.
    [30, 25, 33, 25],
  ];
  for (const [x0, y0, x1, y1] of segments) {
    paintCodes(grid, orthoLine(x0, y0, x1, y1), "d");
  }
  // Side pockets of tall grass. None of these touch a dead-end tip.
  const grass = [
    [21, 28], [21, 29], [23, 28], [23, 29], [24, 29],
    [21, 30], [21, 31], [20, 31], [20, 30],
    [20, 34], [21, 34], [22, 34], [23, 34], [24, 34], [25, 34],
    [27, 34], [27, 35], [27, 36], [28, 35], [28, 36],
    [18, 40], [19, 40], [21, 40], [22, 40], [23, 40],
    [16, 40], [16, 41], [15, 40],
    [31, 24], [31, 26], [32, 26],
  ];
  paintGrassWhereEmpty(grid, grass);
  // Inside the old pond loop, the lawn between the path and the water
  // becomes tall grass you can step into. Trees and the water stay.
  for (let y = 24; y <= 26; y += 1) {
    for (let x = 17; x <= 23; x += 1) {
      if (grid[y][x] === "g") grid[y][x] = "h";
    }
    if (grid[y][29] === "g") grid[y][29] = "h";
  }
}

export function createGround() {
  const grid = blank();
  fillRect(grid, 0, 0, COLS, 1, "t");
  fillRect(grid, 0, ROWS - 1, COLS, 1, "t");
  fillRect(grid, 0, 0, 1, ROWS, "t");
  fillRect(grid, COLS - 1, 0, 1, ROWS, "t");

  // Two east-west streets and two north-south streets. The blocks between
  // them are the buildings. Doors sit on the grass strip just off the road.
  // The upper street runs east to the PT clinic. The old end was x=33.
  hRoad(grid, 8, 2, 44);
  hRoad(grid, 20, 2, 33);
  vRoad(grid, 10, 2, 27);
  vRoad(grid, 24, 2, 27);

  // Gym mat sits just west of the west street (x 9, y 14). grid is [y][x].
  fillRect(grid, 26, 11, 1, 8, "d");

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
  // The gate approach. stampMountain leaves this tile alone (the "."
  // in the plan) and paints the trail north and east of it. pave()
  // below turns this dirt into the sidewalk you stand on to enter.
  grid[7][30] = "d";
  stampMountain(grid);
  layParkTrail(grid);

  // Continuous oval. See TRACK_ROWS. The sidewalk column x = 26 is
  // paved just below, and TRACK_GATE is the walk from that sidewalk
  // onto the west lane. Do not stamp the lane onto the sidewalk.
  stamp(grid, TRACK_ORIGIN.tx, TRACK_ORIGIN.ty, TRACK_ROWS, { k: "k", i: "i" });

  // Concrete sidewalks. Each one shares an edge with the road and with
  // the door tile, so the walk meets the threshold. Trees, roads, water,
  // and the track are left alone. The welcome sign occupies sidewalk
  // tile (4, 7). buildWorld marks that one tile solid.
  const pave = (x, y) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const code = grid[y][x];
    if (code === "g" || code === "f" || code === "d") grid[y][x] = "s";
  };
  for (let x = 2; x <= 9; x += 1) pave(x, 7);
  for (let x = 12; x <= 23; x += 1) pave(x, 7);
  for (let y = 10; y <= 19; y += 1) pave(9, y);
  for (let x = 2; x <= 9; x += 1) pave(x, 22);
  for (let x = 12; x <= 23; x += 1) pave(x, 22);
  for (let y = 10; y <= 19; y += 1) pave(26, y);
  pave(30, 7);
  // Sidewalk from the upper street down to the clinic door. The road
  // is y=8 and y=9. This row is the mat, the same gap Home uses.
  for (let x = 34; x <= 44; x += 1) pave(x, 10);
  for (let y = 17; y <= 19; y += 1) pave(19, y);

  return grid;
}

const BUILDING_DOORS = new Set(["home", "grocery", "gym", "store", "clinic"]);

/**
 * The walkable mat in front of a building door. Park, the track, the
 * depot, and the mountain gate are not in this set: those still wait
 * for the A button.
 */
export function entranceAt(tx, ty) {
  const place = PLACES.find((item) => item.tx === tx && item.ty === ty);
  if (!place || !BUILDING_DOORS.has(place.id)) return null;
  return place.id;
}

/**
 * Decides whether walking onto a tile should open a building menu.
 * previous is null the first time we look (spawn or a freshly loaded
 * save): we remember the tile and do not open anything, or Home would
 * pop its menu the moment a new game starts. moved is false for a
 * teleport such as the town map. Only a real step onto a new mat opens.
 */
export function noteArrival(previous, next, moved) {
  if (!next) return { previous: null, entered: null };
  if (!previous || previous.tx !== next.tx || previous.ty !== next.ty) {
    return {
      previous: next,
      entered: previous && moved ? entranceAt(next.tx, next.ty) : null,
    };
  }
  return { previous, entered: null };
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

  // Fountain tiles use "n" which is already not in WALK. The whole
  // mountain trail, not just the three old corridor tiles, stays a wall
  // until the gate opens. The sidewalk at (30, 7) is not in this list,
  // so you can still walk up to the ranger and read the closed gate.
  const mountainTrail = mountainTrailCells();
  if (!mountainOpen) {
    for (const cell of mountainTrail) blocked[cell.ty][cell.tx] = true;
  }

  const interact = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (const place of PLACES) {
    interact[place.ty][place.tx] = place.id;
  }
  // Booth is already "track". The signs are separate tiles. Without
  // this, the 5K board (one step north of the booth) and the TRACK
  // name on the road ignore A.
  for (const tile of TRACK_SIGN_TILES) {
    interact[tile.ty][tile.tx] = "track";
  }
  for (const building of BUILDINGS) {
    interact[building.door.y][building.door.x] = building.id;
  }
  for (const npc of NPCS) {
    blocked[npc.ty][npc.tx] = true;
    interact[npc.ty][npc.tx] = npc.location;
    // A mat in front of a person, only when that square is not already
    // a door or a sign. The person's own square stays solid.
    if (npc.stand && !interact[npc.stand.ty][npc.stand.tx]) {
      interact[npc.stand.ty][npc.stand.tx] = npc.location;
    }
  }
  // Only the welcome post is solid and readable. The old per-place
  // posts are not in CITY_SIGNS, so those tiles are not blocked here
  // and A does not open the city plaque on them.
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
    mountainTrail,
  };
}

/**
 * Towns the design names that do not have tiles yet. The depot dialogue
 * can mention them. There is no grid, no welcome sign, and nothing to
 * collide with. When one of these gets a map, add it to cityMaps()
 * with exactly one welcome sign and take it off this list.
 */
export const UNBUILT_CITIES = Object.values(CITIES)
  .filter((city) => !city.built)
  .map((city) => ({ id: city.id, name: city.name, clinic: city.clinic }));

/**
 * Every overworld the game can build. The sign test loops this list,
 * so a new city is checked on the day it is added here. Brick City is
 * the only entry. Its welcome post is CITY_SIGNS, and there is one.
 */
export function cityMaps() {
  return [
    {
      id: CITY_INFO.id,
      info: CITY_INFO,
      signs: CITY_SIGNS,
      places: PLACES,
      build: buildWorld,
    },
  ];
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
 * Feet, not the whole sprite. The old box was ±4px on a 16px tile.
 * Tiles are 32px now, so the box is doubled and still the same fraction
 * of a tile. The head is allowed to overlap a fence or a wall.
 * Overworld uses this so the lap test and the runner agree.
 */
export function footBlocked(world, x, y) {
  const unit = TILE / 16;
  const points = [
    [x - 4 * unit, y - 2 * unit],
    [x + 3 * unit, y - 2 * unit],
    [x - 4 * unit, y + 3 * unit],
    [x + 3 * unit, y + 3 * unit],
  ];
  return points.some(([px, py]) => {
    const tile = tileOf(px, py);
    return isBlocked(world, tile.tx, tile.ty);
  });
}

/**
 * Squares a runner can stand on that answer A. Blocked interaction
 * squares (a person, a door buried in a building, the welcome post)
 * are targets you face. They are not mats, because you cannot stand
 * on them. The painter and the "press A" hint both read this list.
 */
export function activationTiles(world) {
  const tiles = [];
  if (!world?.interact) return tiles;
  for (let ty = 0; ty < world.interact.length; ty += 1) {
    const row = world.interact[ty];
    for (let tx = 0; tx < row.length; tx += 1) {
      const id = row[tx];
      if (!id || world.blocked[ty][tx]) continue;
      tiles.push({ tx, ty, id });
    }
  }
  return tiles;
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
/**
 * Every walkable tile the home mat cannot reach. The trail test uses
 * this so a branch that only touches a path on a diagonal (the feet
 * cannot take that step) fails instead of looking connected on the map.
 */
export function unreachableTiles(world, from) {
  const seen = new Set([`${from.tx},${from.ty}`]);
  const queue = [from];
  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy] of Object.values(DIR)) {
      const tx = current.tx + dx;
      const ty = current.ty + dy;
      const key = `${tx},${ty}`;
      if (seen.has(key) || isBlocked(world, tx, ty)) continue;
      seen.add(key);
      queue.push({ tx, ty });
    }
  }
  const missing = [];
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (isBlocked(world, tx, ty)) continue;
      if (!seen.has(`${tx},${ty}`)) missing.push({ tx, ty, code: world.ground[ty][tx] });
    }
  }
  return missing;
}

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
