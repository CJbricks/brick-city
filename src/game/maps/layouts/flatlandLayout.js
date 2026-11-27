/**
 * flatlandLayout.js
 * Data-only street plan for Flatland (farm / backyard ultra town).
 *
 * Shape:
 *   - One big country crossroads near the middle of the map.
 *   - A small building cluster on the northwest corner of that cross.
 *   - Long straight farm roads in the cardinal directions.
 *   - Open field patches (tall grass) in the four quadrants.
 *   - Practice yard east along the farm spur.
 *
 * Same door-facing rules as Ridgeview / Brick City art drawers.
 * Sidewalks never replace asphalt. See "Town layouts" in docs/NOTES.md.
 */

export const FLATLAND_LAYOUT = {
  ringTrees: true,
  track: { tx: 18, ty: 14 },
  roads: [
    // Long country crossroads (the town's spine)
    { type: "h", y: 30, x0: 2, x1: 70, code: "r", width: 2 },
    { type: "v", x: 32, y0: 2, y1: 64, code: "r", width: 2 },

    // Compact farm-town cluster NW of the cross (short streets only)
    { type: "h", y: 10, x0: 4, x1: 32, code: "r", width: 2 },
    { type: "v", x: 10, y0: 10, y1: 30, code: "r", width: 2 },
    { type: "h", y: 20, x0: 4, x1: 32, code: "r", width: 2 },

    // Plaza dirt at the cluster center
    { type: "rect", x: 14, y: 12, w: 10, h: 7, code: "d" },

    // Door sidewalks — stop before asphalt; tips end on mats, not grass.
    { type: "h", y: 9, x0: 5, x1: 20, code: "s", width: 1 },
    { type: "v", x: 9, y0: 12, y1: 19, code: "s", width: 1 },
    { type: "h", y: 19, x0: 5, x1: 9, code: "s", width: 1 },
    { type: "h", y: 22, x0: 5, x1: 9, code: "s", width: 1 },
    // Clinic / cafe mats (40 / 41) tied to the vertical spine at x=36.
    { type: "h", y: 14, x0: 36, x1: 40, code: "s", width: 1 },
    { type: "h", y: 23, x0: 36, x1: 41, code: "s", width: 1 },
    { type: "v", x: 36, y0: 14, y1: 29, code: "s", width: 1 },
    // Track booth west of oval — stop before the lower cluster street
    { type: "v", x: 17, y0: 14, y1: 19, code: "s", width: 1 },
    // Depot / activity on plaza
    { type: "h", y: 17, x0: 16, x1: 22, code: "s", width: 1 },

    // Practice yard spur east of the cross (farm road, then yard pad)
    { type: "h", y: 30, x0: 34, x1: 58, code: "r", width: 2 },
    { type: "v", x: 50, y0: 30, y1: 42, code: "r", width: 2 },
    { type: "rect", x: 46, y: 34, w: 12, h: 10, code: "x" },
    { type: "rect", x: 48, y: 36, w: 8, h: 6, code: "h" },

    // Field patches touch a road or dirt so tall grass is not an island.
    { type: "rect", x: 4, y: 32, w: 12, h: 14, code: "h" },
    { type: "rect", x: 34, y: 4, w: 18, h: 8, code: "h" },
    { type: "rect", x: 34, y: 48, w: 20, h: 8, code: "h" },
    { type: "rect", x: 4, y: 48, w: 12, h: 8, code: "h" },
    // Dirt links so SW/SE meadows meet the farm loop / country road.
    { type: "h", y: 48, x0: 14, x1: 26, code: "x", width: 1 },
    { type: "h", y: 48, x0: 28, x1: 34, code: "x", width: 1 },

    // Short north trail head spur (dirt beside the country road, not on it)
    {
      type: "poly",
      code: "x",
      points: [
        [30, 10],
        [30, 6],
        [26, 6],
        [26, 3],
      ],
    },
    { type: "rect", x: 27, y: 3, w: 4, h: 3, code: "h" },

    // Farm loop / park south of the cluster
    {
      type: "poly",
      code: "x",
      points: [
        [16, 31],
        [16, 40],
        [26, 40],
        [26, 48],
        [14, 48],
        [14, 54],
      ],
    },
    // Touches the farm-loop corner at x=26 so the meadow is not an island.
    { type: "rect", x: 18, y: 42, w: 9, h: 4, code: "h" },
    { type: "rect", x: 18, y: 34, w: 4, h: 3, code: "w" },
  ],
  scatters: [
    { tx: 18, ty: 17, code: "s" },
    { tx: 20, ty: 16, code: "s" },
    { tx: 50, ty: 34, code: "s" },
    { tx: 30, ty: 9, code: "s" },
    { tx: 6, ty: 34, code: "t" },
    { tx: 28, ty: 36, code: "t" },
    // East of the clinic block, clear of the sidewalk tip.
    { tx: 46, ty: 12, code: "t" },
    { tx: 56, ty: 44, code: "t" },
  ],
};

export const FLATLAND_BUILDINGS = [
  { id: "home", x: 3, y: 4, w: 7, h: 5, door: { x: 5, y: 8 } },
  { id: "grocery", x: 14, y: 4, w: 8, h: 5, door: { x: 17, y: 8 } },
  { id: "gym", x: 2, y: 12, w: 7, h: 7, door: { x: 8, y: 16 } },
  { id: "store", x: 2, y: 23, w: 7, h: 5, door: { x: 5, y: 23 } },
  { id: "clinic", x: 38, y: 15, w: 6, h: 4, door: { x: 40, y: 15 } },
  { id: "cafe", x: 38, y: 24, w: 8, h: 4, door: { x: 41, y: 24 } },
];

export const FLATLAND_PLACES = [
  { id: "home", name: "Inn", tx: 5, ty: 9, facing: "up" },
  { id: "grocery", name: "Grocery", tx: 17, ty: 9, facing: "up" },
  { id: "gym", name: "Gym", tx: 9, ty: 16, facing: "left" },
  { id: "store", name: "Run Store", tx: 5, ty: 22, facing: "down" },
  { id: "park", name: "Farm Loops", tx: 16, ty: 34, facing: "down" },
  { id: "track", name: "Local Track", tx: 17, ty: 16, facing: "right" },
  { id: "mountain", name: "Trail Head", tx: 30, ty: 9, facing: "up" },
  { id: "depot", name: "World Depot", tx: 18, ty: 17, facing: "up" },
  { id: "clinic", name: "PT Clinic", tx: 40, ty: 14, facing: "down" },
  { id: "cafe", name: "Captain's 43rd Bakery", tx: 41, ty: 23, facing: "down" },
  { id: "activity", name: "Activity Board", tx: 20, ty: 16, facing: "up" },
  { id: "yard", name: "Practice Yard", tx: 50, ty: 34, facing: "up" },
];

export const FLATLAND_SIGNS = [{ id: "sign-city", tx: 4, ty: 9 }];

export const FLATLAND_ACTIVITY_BOARD = {
  id: "activity",
  kiosk: { tx: 20, ty: 15 },
  mat: { tx: 20, ty: 16 },
};

export const FLATLAND_TRACK_SIGNS = [
  { id: "track", tx: 18, ty: 13 },
  { id: "track", tx: 19, ty: 13 },
];

export const FLATLAND_LANDMARKS = [
  // Farm garden beside the practice yard. Leave x=50 open for the road.
  { id: "garden-bed-a", tx: 46, ty: 32, w: 3, h: 1 },
  { id: "garden-bed-b", tx: 52, ty: 32, w: 2, h: 1 },
  { id: "garden-bed-c", tx: 46, ty: 33, w: 2, h: 1 },
  { id: "garden-bed-d", tx: 52, ty: 33, w: 2, h: 1 },
  { id: "garden-shed", tx: 54, ty: 32, w: 2, h: 2 },
  { id: "garden-tools", tx: 45, ty: 32, w: 1, h: 1 },
  { id: "garden-scarecrow", tx: 53, ty: 34, w: 1, h: 1 },
  { id: "kiln-stack", tx: 56, ty: 28, w: 3, h: 2 },
];

export const FLATLAND_NPCS = [
  {
    id: "dark",
    name: "Dark Mowdle",
    tx: 16,
    ty: 14,
    facing: "down",
    palette: "rival",
    gender: "male",
    location: "guide-dark",
    stand: { tx: 16, ty: 15 },
  },
  {
    id: "pax",
    name: "Pax Hollis",
    tx: 50,
    ty: 33,
    facing: "down",
    palette: "ranger",
    gender: "female",
    location: "yard",
  },
  {
    id: "remy-noct",
    name: "Remy Noct",
    // Beside the farm-loop corner, not on it — standing on (26,40) sealed
    // the southern dirt loop behind an NPC wall.
    tx: 25,
    ty: 41,
    facing: "up",
    palette: "male",
    gender: "male",
    location: "race-noct",
  },
];
