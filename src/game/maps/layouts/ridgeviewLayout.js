/**
 * ridgeviewLayout.js
 * Data-only street plan for Ridgeview (mountain / trail town).
 *
 * Shape (read this before editing tiles):
 *   - A winding valley main street jogs east along the floor, not a grid.
 *   - Compact plaza with the white church + race arch at start/finish.
 *   - Gold Rush storefronts (grocery, run store) on one historic stretch.
 *   - Chalets (inn, gym, clinic, cafe) tucked on the slopes.
 *   - Switchback dirt trails climb north; park loops wander south.
 *   - East dirt then a short asphalt spur reaches the Flatland exit.
 *
 * Door orientations match the art drawers: home/grocery face south,
 * gym faces east, store/clinic/cafe face north. Mats sit on sidewalk
 * ("s") directly in front of the door brick — never on asphalt.
 *
 * Rule: never paint "s" on a cell that must stay "r". Sidewalks stop
 * one tile before they meet a street so curbs stay continuous.
 *
 * Tweak roads[] / buildings / places here; ridgeview.js assembles the
 * world. See "Town layouts" in docs/NOTES.md.
 */

/** Valley winding street + plaza + trails + exit. */
export const RIDGEVIEW_LAYOUT = {
  ringTrees: true,
  track: { tx: 44, ty: 32 },
  roads: [
    // --- Valley floor (asphalt), west approach into the jog ---
    { type: "h", y: 24, x0: 2, x1: 20, code: "r", width: 2 },
    { type: "v", x: 18, y0: 16, y1: 25, code: "r", width: 2 },
    // Historic Gold Rush street (storefronts face this)
    { type: "h", y: 16, x0: 18, x1: 42, code: "r", width: 2 },
    // Jog south then east toward the exit spur
    { type: "v", x: 40, y0: 16, y1: 28, code: "r", width: 2 },
    { type: "h", y: 28, x0: 40, x1: 70, code: "r", width: 2 },

    // Plaza dirt south of historic street (church / arch / depot)
    { type: "rect", x: 22, y: 18, w: 14, h: 7, code: "d" },

    // Inn sidewalk — mat at (6,9); (5,9) continues to the city sign pad.
    { type: "h", y: 9, x0: 5, x1: 11, code: "s", width: 1 },
    { type: "v", x: 11, y0: 9, y1: 23, code: "s", width: 1 },
    // Historic street sidewalks (north for grocery, south for store).
    // Stop before the asphalt jog at x=40.
    { type: "h", y: 15, x0: 18, x1: 38, code: "s", width: 1 },
    { type: "h", y: 18, x0: 30, x1: 39, code: "s", width: 1 },
    // West spine down to gym / park (dirt, not asphalt boulevard)
    { type: "v", x: 12, y0: 25, y1: 42, code: "x", width: 2 },
    // Gym mat column (east of gym) — stop before the dirt spine at x=12
    { type: "v", x: 11, y0: 34, y1: 40, code: "s", width: 1 },
    // Mat column only (door brick stays building footprint, not sidewalk).
    { type: "h", y: 38, x0: 10, x1: 11, code: "s", width: 1 },
    // Clinic / cafe mats only (54 / 55); vertical spine ties them to the street.
    { type: "h", y: 11, x0: 50, x1: 54, code: "s", width: 1 },
    { type: "h", y: 20, x0: 50, x1: 55, code: "s", width: 1 },
    { type: "v", x: 49, y0: 11, y1: 27, code: "s", width: 1 },
    // Track booth approach ends on the track mat (43,34).
    { type: "v", x: 43, y0: 30, y1: 34, code: "s", width: 1 },
    // Join east terrace sidewalk to valley jog without eating asphalt
    { type: "h", y: 27, x0: 42, x1: 49, code: "s", width: 1 },

    // Switchback dirt trails up the north slope from trail head (east of grocery)
    {
      type: "poly",
      code: "x",
      points: [
        [28, 15],
        [28, 8],
        [34, 8],
        [34, 4],
        [44, 4],
        [44, 2],
        [54, 2],
      ],
    },
    {
      type: "poly",
      code: "x",
      points: [
        [34, 8],
        [38, 8],
        [38, 6],
        [48, 6],
      ],
    },
    // Tall grass pockets beside switchbacks
    { type: "rect", x: 34, y: 2, w: 8, h: 3, code: "h" },
    { type: "rect", x: 44, y: 3, w: 6, h: 2, code: "h" },
    // Granite outcrops
    { type: "rect", x: 28, y: 3, w: 2, h: 2, code: "o" },
    { type: "rect", x: 48, y: 4, w: 2, h: 2, code: "o" },
    { type: "rect", x: 6, y: 14, w: 2, h: 2, code: "o" },

    // South park / trail loops (dirt, intentional dead-end tips)
    {
      type: "poly",
      code: "x",
      points: [
        [12, 42],
        [12, 50],
        [22, 50],
        [22, 56],
        [14, 56],
        [14, 60],
        [24, 60],
      ],
    },
    { type: "ortho", x0: 22, y0: 50, x1: 30, y1: 50, code: "x" },
    { type: "ortho", x0: 18, y0: 56, x1: 18, y1: 58, code: "x" },
    // Meadow touches the west dirt spine so tall grass is not an island.
    { type: "rect", x: 12, y: 44, w: 10, h: 4, code: "h" },
    // South hollow grass sits on the trail loop (poly already visits y=50 / 56).
    { type: "rect", x: 10, y: 50, w: 4, h: 7, code: "h" },
    // Small pond in the south hollow
    { type: "rect", x: 16, y: 46, w: 4, h: 3, code: "w" },
  ],
  scatters: [
    // Trail head mat / approach (east of grocery footprint x=20..27)
    { tx: 28, ty: 15, code: "s" },
    { tx: 28, ty: 14, code: "s" },
    // Depot + activity mats on plaza dirt (west of the run store)
    { tx: 28, ty: 22, code: "s" },
    { tx: 22, ty: 22, code: "s" },
    // City sign pad (solid post); gives (5,9) a second pavement neighbor.
    { tx: 5, ty: 10, code: "s" },
    // Shade pines on the slopes
    { tx: 5, ty: 18, code: "t" },
    { tx: 8, ty: 20, code: "t" },
    { tx: 54, ty: 8, code: "t" },
    { tx: 62, ty: 22, code: "t" },
    { tx: 8, ty: 46, code: "t" },
    { tx: 28, ty: 54, code: "t" },
  ],
};

/**
 * Building footprints. Door brick is on the facing edge; matching place
 * mat is one step outside on sidewalk.
 */
export const RIDGEVIEW_BUILDINGS = [
  // Inn on the NW hillside (chalet). Door south onto mat (6, 9).
  { id: "home", x: 3, y: 4, w: 7, h: 5, door: { x: 6, y: 8 } },
  // Grocery false-front on the historic street, north side.
  // Door at x=24 so it does not share the trail-head column (x=26).
  { id: "grocery", x: 20, y: 10, w: 8, h: 5, door: { x: 24, y: 14 } },
  // Run store false-front, south of historic street (door faces north).
  // Kept at x>=30 so the plaza (church / depot / board) stays clear.
  { id: "store", x: 32, y: 19, w: 7, h: 5, door: { x: 35, y: 19 } },
  // Gym chalet on the SW slope, door east.
  { id: "gym", x: 3, y: 34, w: 7, h: 7, door: { x: 9, y: 38 } },
  // Clinic on the east terrace, door north.
  { id: "clinic", x: 52, y: 12, w: 6, h: 4, door: { x: 54, y: 12 } },
  // Cafe south of clinic, door north.
  { id: "cafe", x: 52, y: 21, w: 8, h: 4, door: { x: 55, y: 21 } },
];

export const RIDGEVIEW_PLACES = [
  { id: "home", name: "Inn", tx: 6, ty: 9, facing: "up" },
  { id: "grocery", name: "Grocery", tx: 24, ty: 15, facing: "up" },
  { id: "gym", name: "Gym", tx: 10, ty: 38, facing: "left" },
  { id: "store", name: "Run Store", tx: 35, ty: 18, facing: "down" },
  { id: "park", name: "Mountain Trails", tx: 12, ty: 36, facing: "down" },
  { id: "track", name: "Local Track", tx: 43, ty: 34, facing: "right" },
  { id: "mountain", name: "Trail Head", tx: 28, ty: 14, facing: "up" },
  { id: "depot", name: "World Depot", tx: 28, ty: 22, facing: "up" },
  { id: "clinic", name: "PT Clinic", tx: 54, ty: 11, facing: "down" },
  { id: "cafe", name: "Good Neighbor Roasting", tx: 55, ty: 20, facing: "down" },
  { id: "activity", name: "Activity Board", tx: 22, ty: 22, facing: "up" },
];

// Beside the inn sidewalk, not on it — a post on (5,9) used to cut the
// mat row and leave unreachable sidewalk tips west of the sign.
export const RIDGEVIEW_SIGNS = [{ id: "sign-city", tx: 5, ty: 10 }];

export const RIDGEVIEW_ACTIVITY_BOARD = {
  id: "activity",
  kiosk: { tx: 22, ty: 21 },
  mat: { tx: 22, ty: 22 },
};

export const RIDGEVIEW_TRACK_SIGNS = [
  { id: "track", tx: 44, ty: 31 },
  { id: "track", tx: 45, ty: 31 },
];

export const RIDGEVIEW_LANDMARKS = [
  // Plaza church — race start/finish backdrop. Landmark only.
  { id: "church", tx: 24, ty: 18, w: 4, h: 3 },
  { id: "race-arch", tx: 24, ty: 21, w: 4, h: 1 },
  { id: "rock-pile-a", tx: 46, ty: 24, w: 2, h: 2 },
  { id: "rock-pile-b", tx: 8, ty: 28, w: 2, h: 1 },
  { id: "trail-post-a", tx: 29, ty: 13, w: 1, h: 1 },
  { id: "trail-post-b", tx: 22, ty: 44, w: 1, h: 1 },
  { id: "wood-fence-a", tx: 3, ty: 32, w: 3, h: 1 },
  // Trail-side garden east of clinic
  { id: "garden-bed-a", tx: 60, ty: 13, w: 2, h: 1 },
  { id: "garden-bed-b", tx: 63, ty: 13, w: 1, h: 1 },
  { id: "garden-bed-c", tx: 60, ty: 14, w: 2, h: 1 },
  { id: "garden-can", tx: 63, ty: 14, w: 1, h: 1 },
  { id: "garden-scarecrow", tx: 64, ty: 13, w: 1, h: 1 },
  { id: "kiln-stack", tx: 58, ty: 26, w: 3, h: 2 },
];

export const RIDGEVIEW_NPCS = [
  {
    id: "dylan",
    name: "Dylan Broman",
    tx: 26,
    ty: 22,
    facing: "down",
    palette: "ranger",
    gender: "male",
    location: "guide-dylan",
    stand: { tx: 26, ty: 23 },
  },
  {
    id: "cedar",
    name: "Cedar Pike",
    tx: 29,
    ty: 14,
    facing: "left",
    palette: "rival",
    gender: "male",
    location: "race-cedar",
  },
  {
    id: "nessa",
    name: "Nessa Quill",
    // On the cafe sidewalk tip east of the mat — not on grass beside the
    // footprint, where every neighbor was a wall or lawn.
    tx: 56,
    ty: 20,
    facing: "left",
    palette: "female",
    gender: "female",
    location: "chat-nessa",
  },
  {
    id: "road-block-rv",
    name: "Trail Post",
    tx: 64,
    ty: 27,
    facing: "down",
    palette: "ranger",
    gender: "female",
    location: "road-exit-flatland",
    stand: { tx: 64, ty: 28 },
  },
];

export const RIDGEVIEW_MOUNTAIN_TRAIL = [
  { tx: 28, ty: 8 },
  { tx: 28, ty: 9 },
  { tx: 28, ty: 10 },
];
