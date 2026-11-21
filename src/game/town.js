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
 * Map size: COLS×ROWS is the standard town footprint (~2× the older
 * 48×46 area). Future towns should use the same TOWN_MAP_* size so
 * camera bounds, collision, and tests stay comparable. Existing
 * buildings and doors keep their old tile coordinates; new streets
 * and landmarks fill the east and south expansion. An old save whose
 * pixel position lands in a wall is moved to the town-square spawn
 * (see safePlayerPosition).
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
 * The activity board is a kiosk in the town square, east of the fountain
 * and clear of Coach Bram. The post is solid. The tile south of it is
 * the gold mat. Pressing A there opens the neighborhood runs. The board
 * is not a fast-travel pin, and it is not stored in the save. An old
 * brick-city-save-v1 file rebuilds this map the same way it rebuilds
 * the welcome sign.
 *
 * cityMaps() is the list of overworlds that actually exist. Brick City,
 * Ridgeview, and Flatland are built. Lakeport, Mesa Verde Flats, and
 * Summit Hollow stay in UNBUILT_CITIES. Road maps between towns are
 * separate overworlds (see src/game/maps/roads.js) and are not city
 * plaques — they are not in cityMaps().
 *
 * The park trail keeps the pond loop and then winds south through tall
 * grass. The mountain trail keeps the gate at x=30 and then winds east
 * through the rocks. Both are one connected walk. Deep grass is the
 * letter h. It is walkable. Stepping on it can find an item (forage.js).
 */

import { CITIES, CITY_INFO } from "@/lib/constants";
import { RUN_CLUB_NAME } from "@/lib/runclub";
import { isMountainOpen } from "@/lib/unlocks";
import { currentMapId } from "@/lib/travel";
import { buildRidgeviewWorld, ridgeviewHomeSpawn, RIDGEVIEW_INFO, RIDGEVIEW_PLACES, RIDGEVIEW_SIGNS } from "@/game/maps/ridgeview";
import { buildFlatlandWorld, flatlandHomeSpawn, FLATLAND_INFO, FLATLAND_PLACES, FLATLAND_SIGNS } from "@/game/maps/flatland";
import {
  buildBrickRidgeRoadWorld,
  buildRidgeFlatRoadWorld,
  roadWestSpawn,
  roadEastSpawn,
} from "@/game/maps/roads";
import { ROAD_BRICK_RIDGEVIEW, ROAD_RIDGEVIEW_FLATLAND } from "@/lib/travel";

export { CITY_INFO };

export const TILE = 32;
/**
 * Standard town grid for Brick City and for future built towns.
 * Old footprint was 48×46 (2208 tiles). 72×66 is 4752 tiles (~2.15×).
 * Buildings and doors keep their original coordinates; new content
 * lives in the extra columns and rows.
 */
export const TOWN_MAP_COLS = 72;
export const TOWN_MAP_ROWS = 66;
export const COLS = TOWN_MAP_COLS;
export const ROWS = TOWN_MAP_ROWS;

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
  // South of the clinic. The door faces north onto the sidewalk at y=15.
  // The path to that sidewalk runs down tile x=35, which is clear of the
  // track fence (tile 34) and of the clinic (x=38). Tangentline Roasters.
  // id stays "cafe". The painted name is not written into the save.
  { id: "cafe", x: 36, y: 16, w: 8, h: 4, door: { x: 39, y: 16 } },
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

/**
 * Neighborhood activity board in the plaza. The fountain occupies
 * (17–18, 14–15). Coach Bram stands on (15, 13). This post is east of
 * both, on open dirt, so the roads around the square stay open.
 * The kiosk tile is solid (you do not walk through the post). The mat
 * is the walkable gold square you stand on to press A.
 */
export const ACTIVITY_BOARD = {
  id: "activity",
  kiosk: { tx: 20, ty: 13 },
  mat: { tx: 20, ty: 14 },
};

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
  // East road exit toward Ridgeview (after Half + Marathon). Talk or use depot.
  { id: "road-exit", name: "Ridge Road", tx: 68, ty: 8, facing: "right" },
  { id: "clinic", name: "PT Clinic", tx: 40, ty: 10, facing: "down" },
  { id: "cafe", name: "Tangentline Roasters", tx: 39, ty: 15, facing: "down" },
  // East expansion landmarks. Press A on the mat; they are not auto-doors.
  { id: "garden", name: "Community Garden", tx: 52, ty: 13, facing: "up" },
  { id: "library", name: "Branch Nook", tx: 55, ty: 8, facing: "up" },
  { id: "kiln", name: "Brick Kiln Overlook", tx: 58, ty: 23, facing: "up" },
  // Face south so A on the mat does not look into Lina's stand (50, 27).
  { id: "club", name: RUN_CLUB_NAME, tx: 50, ty: 28, facing: "down" },
];

/**
 * Open dirt east of the fountain. Used when a saved pixel position is
 * out of bounds or inside a wall after the map grew.
 */
export const TOWN_SQUARE = { tx: 16, ty: 12, facing: "down" };

/**
 * Solid scenery tiles that are not buildings: garden beds, the kiln
 * chimney block, and the club gazebo posts. art.js paints them; buildWorld
 * marks them blocked.
 *
 * Community Garden layout (tiles). The gold mat stays at (52, 13) and
 * Pia stands at (54, 13). A one-tile path runs north through (52, 12)
 * and (52, 11) so the gate still opens onto the beds. Do not put a
 * landmark on those path tiles or on the mat.
 *
 *   y10: bed-a (50-51) . path(52) . bed-b (53) . shed (55-56)
 *   y11: bed-c (50-51) . path(52) . bed-d (53-54) . shed
 *   y12: bed-e (50)    . path(51-52) . can(53) . scarecrow(56)
 *   y13: sidewalk mats — garden (52), Pia (54)
 */
export const LANDMARKS = [
  // Community garden: tidy raised beds, shed, scarecrow, tools.
  { id: "garden-bed-a", tx: 50, ty: 10, w: 2, h: 1 },
  { id: "garden-bed-b", tx: 53, ty: 10, w: 1, h: 1 },
  { id: "garden-bed-c", tx: 50, ty: 11, w: 2, h: 1 },
  { id: "garden-bed-d", tx: 53, ty: 11, w: 2, h: 1 },
  { id: "garden-bed-e", tx: 50, ty: 12, w: 1, h: 1 },
  { id: "garden-can", tx: 53, ty: 12, w: 1, h: 1 },
  { id: "garden-shed", tx: 55, ty: 10, w: 2, h: 2 },
  { id: "garden-scarecrow", tx: 56, ty: 12, w: 1, h: 1 },
  { id: "garden-tools", tx: 49, ty: 11, w: 1, h: 1 },
  // Branch Nook shelf wall.
  { id: "library-wall", tx: 54, ty: 6, w: 3, h: 2 },
  // Kiln chimney footprint.
  { id: "kiln-stack", tx: 57, ty: 21, w: 3, h: 2 },
  // Gazebo posts for Cornerstone Pace Club.
  { id: "club-post-nw", tx: 49, ty: 26, w: 1, h: 1 },
  { id: "club-post-ne", tx: 52, ty: 26, w: 1, h: 1 },
  { id: "club-post-sw", tx: 49, ty: 27, w: 1, h: 1 },
  { id: "club-post-se", tx: 52, ty: 27, w: 1, h: 1 },
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
  // Street / trail race opponents. Rematches use streetRaces.js.
  {
    id: "tess",
    name: "Tess Quay",
    tx: 13,
    ty: 8,
    facing: "down",
    palette: "jogger",
    gender: "female",
    location: "race-tess",
    stand: { tx: 13, ty: 9 },
  },
  {
    id: "kit",
    name: "Kit Solano",
    tx: 22,
    ty: 12,
    facing: "left",
    palette: "rival",
    gender: "male",
    location: "race-kit",
    stand: { tx: 21, ty: 12 },
  },
  {
    id: "otto",
    name: "Otto Venn",
    tx: 22,
    ty: 36,
    facing: "up",
    palette: "jogger",
    gender: "male",
    location: "race-otto",
    stand: { tx: 22, ty: 35 },
  },
  {
    id: "mara",
    name: "Mara Flint",
    // On a rock beside the mountain path (same idea as the ranger).
    // Unreachable until the gate opens. Standing on a trail "d"/"h"
    // would block that cell after the gate opens and break the
    // "every trail tile is walkable" test.
    tx: 39,
    ty: 2,
    facing: "left",
    palette: "ranger",
    gender: "female",
    location: "race-mara",
    stand: { tx: 38, ty: 2 },
  },
  // Tips, side quests, flavor.
  {
    id: "ned",
    name: "Ned Brickley",
    tx: 18,
    ty: 13,
    facing: "down",
    palette: "coach",
    gender: "male",
    location: "chat-ned",
  },
  {
    id: "pia",
    name: "Pia Moss",
    // East of the garden mat, not south of it. Standing on the mat and
    // facing down must still read "garden" from your feet.
    tx: 54,
    ty: 13,
    facing: "left",
    palette: "jogger",
    gender: "female",
    location: "chat-pia",
  },
  {
    id: "harlan",
    name: "Harlan Voss",
    // East of the kiln mat so facing down on the mat still reads "kiln".
    tx: 60,
    ty: 23,
    facing: "left",
    palette: "coach",
    gender: "male",
    location: "chat-harlan",
  },
  // Cornerstone Pace Club members at the gazebo.
  {
    id: "lina",
    name: "Lina Shore",
    tx: 50,
    ty: 26,
    facing: "down",
    palette: "jogger",
    gender: "female",
    location: "chat-lina",
    stand: { tx: 50, ty: 27 },
  },
  {
    id: "drew",
    name: "Drew Pebble",
    tx: 51,
    ty: 29,
    facing: "up",
    palette: "rival",
    gender: "male",
    location: "chat-drew",
  },
  {
    id: "sable",
    name: "Sable Wren",
    tx: 49,
    ty: 29,
    facing: "up",
    palette: "coach",
    gender: "female",
    location: "chat-sable",
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

  // Two east-west streets and two north-south streets in the original
  // core. The upper street now continues into the east expansion.
  hRoad(grid, 8, 2, 68);
  hRoad(grid, 20, 2, 68);
  // Third east-west street for the south / club district.
  hRoad(grid, 30, 46, 68);
  vRoad(grid, 10, 2, 27);
  vRoad(grid, 24, 2, 27);
  // East spine: clinic row down to the club plaza and kiln block.
  vRoad(grid, 48, 2, 44);
  vRoad(grid, 60, 8, 32);

  // Gym mat sits just west of the west street (x 9, y 14). grid is [y][x].
  fillRect(grid, 26, 11, 1, 8, "d");

  // Center plaza, touching all four roads so you can cut across town.
  fillRect(grid, 12, 10, 12, 10, "d");
  fillRect(grid, 17, 14, 2, 2, "n");

  // East plaza: garden / library sidewalks and the club dirt pad.
  fillRect(grid, 50, 10, 8, 6, "d");
  fillRect(grid, 49, 26, 5, 5, "d");
  fillRect(grid, 56, 20, 6, 6, "d");

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
    // East expansion shade.
    [46, 12], [46, 18], [54, 18], [62, 14], [64, 26], [46, 28], [54, 32],
  ];
  for (const [x, y] of trees) {
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) grid[y][x] = "t";
  }

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
  layEastParkSpur(grid);

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
  // Around the clinic's west side, then along the coffee shop's door.
  // y=15 is south of the clinic and north of the shop. x=35 connects
  // that row back to the clinic sidewalk, so the mat is not an island.
  for (let y = 11; y <= 15; y += 1) pave(35, y);
  for (let x = 35; x <= 44; x += 1) pave(x, 15);
  for (let y = 17; y <= 19; y += 1) pave(19, y);
  // East expansion mats: library, garden, kiln, club.
  for (let x = 50; x <= 56; x += 1) pave(x, 8);
  for (let x = 50; x <= 54; x += 1) pave(x, 13);
  for (let x = 56; x <= 60; x += 1) pave(x, 23);
  for (let x = 49; x <= 53; x += 1) pave(x, 28);
  // Connect clinic sidewalk east to the new spine.
  for (let x = 44; x <= 48; x += 1) pave(x, 10);
  for (let y = 10; y <= 20; y += 1) pave(47, y);

  return grid;
}

/**
 * Extra park dirt south and east of the old pond loop, so Otto and the
 * longer trail have room on the bigger map. Keeps every new tip a true
 * dead end (one walkable neighbor).
 */
function layEastParkSpur(grid) {
  const segments = [
    [22, 42, 22, 48],
    [22, 48, 30, 48],
    [30, 48, 30, 54],
    [30, 54, 18, 54],
    [18, 54, 18, 58],
    [18, 58, 26, 58],
    [26, 58, 26, 62],
    // Branches / dead ends.
    [26, 48, 26, 46],
    [28, 54, 34, 54],
    [34, 54, 34, 56],
    [22, 58, 22, 60],
  ];
  for (const [x0, y0, x1, y1] of segments) {
    paintCodes(grid, orthoLine(x0, y0, x1, y1), "d");
  }
  // Otto stands on the old trail spine; keep (22, 36) dirt.
  paintCodes(grid, orthoLine(22, 34, 22, 38), "d");
  const grass = [
    [21, 44], [23, 44], [21, 48], [23, 48], [29, 50], [31, 50],
    [19, 56], [17, 56], [25, 60], [27, 60], [27, 36], [21, 36],
  ];
  paintGrassWhereEmpty(grid, grass);
}

const BUILDING_DOORS = new Set(["home", "grocery", "gym", "store", "clinic", "cafe"]);

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

export function spawnFor(placeId, state = null) {
  const list = state ? placesFor(state) : PLACES;
  const place = list.find((item) => item.id === placeId) || PLACES.find((item) => item.id === placeId);
  if (!place) return homeSpawn();
  const center = tileCenter(place.tx, place.ty);
  return { ...center, facing: place.facing, tx: place.tx, ty: place.ty };
}

export function homeSpawn() {
  return spawnFor("home");
}

export function townSquareSpawn() {
  const center = tileCenter(TOWN_SQUARE.tx, TOWN_SQUARE.ty);
  return {
    ...center,
    facing: TOWN_SQUARE.facing,
    tx: TOWN_SQUARE.tx,
    ty: TOWN_SQUARE.ty,
  };
}

/**
 * If a saved pixel sits out of bounds or inside a wall (map grew, or an
 * old 16px position landed wrong), move the runner to the town square.
 * Feet use the same box as walking, so a head-over-fence save still
 * counts as safe when the feet are clear.
 */
export function safePlayerPosition(state, world = null) {
  const map = world || buildActiveWorld(state);
  const pos = state?.position;
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
    return townSquareSpawn();
  }
  const { tx, ty } = tileOf(pos.x, pos.y);
  if (!inBounds(tx, ty) || isBlocked(map, tx, ty) || footBlocked(map, pos.x, pos.y)) {
    return townSquareSpawn();
  }
  // Keep the saved facing and any extra fields. Do not invent tx/ty on
  // an old blob that never stored them; Resume only needs x/y/facing.
  const facing = pos.facing === "up" || pos.facing === "left" || pos.facing === "right"
    ? pos.facing
    : "down";
  return { ...pos, x: pos.x, y: pos.y, facing };
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

  // Garden beds, kiln stack, gazebo posts. Same idea as a building:
  // solid footprint, walk around them.
  for (const mark of LANDMARKS) {
    for (let y = mark.ty; y < mark.ty + mark.h; y += 1) {
      for (let x = mark.tx; x < mark.tx + mark.w; x += 1) {
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) blocked[y][x] = true;
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
  // The post blocks feet. The mat does not, so activationTiles paints
  // the gold square on the mat only. Both tiles answer A with the same
  // menu: face the post, or stand on the mat and look anywhere.
  blocked[ACTIVITY_BOARD.kiosk.ty][ACTIVITY_BOARD.kiosk.tx] = true;
  interact[ACTIVITY_BOARD.kiosk.ty][ACTIVITY_BOARD.kiosk.tx] = ACTIVITY_BOARD.id;
  interact[ACTIVITY_BOARD.mat.ty][ACTIVITY_BOARD.mat.tx] = ACTIVITY_BOARD.id;

  return {
    id: "brick-city",
    info: CITY_INFO,
    ground,
    blocked,
    interact,
    npcs: NPCS,
    buildings: BUILDINGS,
    places: PLACES,
    signs: CITY_SIGNS,
    landmarks: LANDMARKS,
    mountainOpen,
    mountainTrail,
    activityBoard: ACTIVITY_BOARD,
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
  .map((city) => ({ id: city.id, name: city.name, clinic: city.clinic, cafe: city.cafe }));

/**
 * Every town overworld the game can build. The sign test loops this list,
 * so a new city is checked on the day it is added here. Road maps are
 * separate (activeWorld) and are not required to have a city plaque.
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
    {
      id: RIDGEVIEW_INFO.id,
      info: RIDGEVIEW_INFO,
      signs: RIDGEVIEW_SIGNS,
      places: RIDGEVIEW_PLACES,
      build: buildRidgeviewWorld,
    },
    {
      id: FLATLAND_INFO.id,
      info: FLATLAND_INFO,
      signs: FLATLAND_SIGNS,
      places: FLATLAND_PLACES,
      build: buildFlatlandWorld,
    },
  ];
}

/**
 * Build the overworld the runner is standing on (town or road).
 * Brick City still uses buildWorld; other maps live under src/game/maps/.
 */
export function buildActiveWorld(state) {
  const mapId = currentMapId(state);
  if (mapId === "ridgeview") return buildRidgeviewWorld(state);
  if (mapId === "flatland") return buildFlatlandWorld(state);
  if (mapId === ROAD_BRICK_RIDGEVIEW) return buildBrickRidgeRoadWorld(state);
  if (mapId === ROAD_RIDGEVIEW_FLATLAND) return buildRidgeFlatRoadWorld(state);
  return buildWorld(state);
}

/** Home / inn spawn for the current town map. Roads use roadWestSpawn. */
export function homeSpawnFor(mapId) {
  if (mapId === "ridgeview") return ridgeviewHomeSpawn();
  if (mapId === "flatland") return flatlandHomeSpawn();
  if (mapId === ROAD_BRICK_RIDGEVIEW || mapId === ROAD_RIDGEVIEW_FLATLAND) {
    return roadWestSpawn();
  }
  return homeSpawn();
}

export function roadArrivalSpawn(mapId, side = "east") {
  if (side === "west") return roadWestSpawn();
  return roadEastSpawn();
}

/**
 * Places list for the pause-map panel on the current overworld.
 */
export function placesFor(state) {
  const mapId = currentMapId(state);
  if (mapId === "ridgeview") return RIDGEVIEW_PLACES;
  if (mapId === "flatland") return FLATLAND_PLACES;
  if (mapId === ROAD_BRICK_RIDGEVIEW || mapId === ROAD_RIDGEVIEW_FLATLAND) {
    return buildActiveWorld(state).places;
  }
  return PLACES;
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
