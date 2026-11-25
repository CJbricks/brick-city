/**
 * townThemes.js
 * Per-town ground palette and building style.
 *
 * Brick City keeps the bright lawn / round-tree look painted in art.js
 * since the start. Ridgeview is a mountain town (Chamonix + Auburn
 * mood): alpine greens, golden meadow, conifers, slate roofs, cream
 * chalets, and Gold Rush false-front shops. Flatland stays closer to
 * Brick City for now, with a slightly warmer farm lawn.
 *
 * art.js reads themeFor(mapId) once per renderWorld pass. Building door
 * pixel positions stay the same as the shared footprints so warps and
 * collision do not move. Original pixels only — no real logos.
 *
 * See "Town themes and palettes" in docs/NOTES.md.
 */

/** Bright brick-town lawn and warm wood / brick buildings. */
export const BRICK_CITY_THEME = {
  id: "brick-city",
  label: "Brick City",
  // Ground
  grassA: "#4ea33b",
  grassB: "#59b246",
  grassBlade: "#245c22",
  grassLit: "#78d15e",
  grassShade: "#3b8a2e",
  grassTip: "#b6e88a",
  deepGrassA: "#1b5c24",
  deepGrassB: "#14491c",
  deepBlade: "#0c3014",
  deepLit: "#3d8f3a",
  deepShade: "#163e18",
  deepSeedA: "#d7e27a",
  deepSeedB: "#e6d27a",
  treeBands: ["#4ea84a", "#2f7a32", "#1e5a28"],
  treeHighlight: "#b6e88a",
  treeTrunk: "#6b4428",
  treeTrunkLit: "#a07848",
  treeShape: "round",
  pebbleBase: "#c4a36a",
  pebbleEdge: "#a8844e",
  pebbleStones: ["#e6d0a4", "#8d6b3e", "#f2e2c0"],
  pebbleMoss: "#3b8a2e",
  infield: "#3f8f45",
  infieldLit: "#67b84c",
  infieldShade: "#2f7a32",
  rockFill: ["#aeb6be", "#8d959e", "#7a848e"],
  rockLit: "#e4ebf0",
  rockShade: "#4e565e",
  // Buildings: existing Brick City drawers
  buildingStyle: "brick-city",
  // Accents (unused by Brick City drawers; documented for parity)
  accentTeal: "#2aa6a0",
  accentWhite: "#f7f7f7",
  accentBlack: "#141414",
};

/**
 * Alpine / trail-town mood. Greens are cooler pine; meadow patches go
 * gold-ochre. Buildings mix Chamonix chalets and Auburn false fronts.
 */
export const RIDGEVIEW_THEME = {
  id: "ridgeview",
  label: "Ridgeview",
  // Cooler alpine lawn with golden meadow speckles
  grassA: "#3d6b4a",
  grassB: "#4a7a52",
  grassBlade: "#1e3a28",
  grassLit: "#c4a24a",
  grassShade: "#2a4a32",
  grassTip: "#e0c878",
  deepGrassA: "#1a3a28",
  deepGrassB: "#0f2818",
  deepBlade: "#081810",
  deepLit: "#2a5a38",
  deepShade: "#0c2014",
  deepSeedA: "#d4923a",
  deepSeedB: "#c87828",
  // Tall spruce / pine bands (dark teal-green)
  treeBands: ["#1a4a3a", "#0e3028", "#061810"],
  treeHighlight: "#2a6a58",
  treeTrunk: "#2a1c10",
  treeTrunkLit: "#5a4030",
  treeShape: "conifer",
  // Dusty tan trail
  pebbleBase: "#c4a878",
  pebbleEdge: "#8a7048",
  pebbleStones: ["#e8d4a8", "#9a7850", "#f0e4c4"],
  pebbleMoss: "#4a6a3a",
  infield: "#3a5a42",
  infieldLit: "#5a7a58",
  infieldShade: "#2a3a28",
  // Gray granite
  rockFill: ["#9aa4ae", "#7a848e", "#5c656e"],
  rockLit: "#d8dee4",
  rockShade: "#3a4048",
  buildingStyle: "ridgeview",
  // Trail-runner accents
  accentTeal: "#5ec4b0",
  accentWhite: "#f7f7f7",
  accentBlack: "#1a1c1f",
  // Chamonix chalet materials
  chaletWall: "#f4f1ea",
  chaletWallLit: "#fffaf2",
  chaletWallShade: "#c8c0b4",
  chaletWood: "#3e2a18",
  chaletWoodLit: "#6b4428",
  slateRoof: "#3a4048",
  slateRoofDark: "#1a1c1f",
  slateRoofLit: "#8a9098",
  // Auburn Gold Rush storefront
  auburnBrick: "#a84828",
  auburnBrickLit: "#c86840",
  auburnBrickShade: "#6a2818",
  auburnFalse: "#e8dcc8",
  auburnBoardwalk: "#8a6840",
  churchWall: "#f7f7f7",
  churchDome: "#5ec4b0",
  churchSlate: "#3a4048",
};

/** Mild farm tint; buildings still use the Brick City drawers. */
export const FLATLAND_THEME = {
  ...BRICK_CITY_THEME,
  id: "flatland",
  label: "Flatland",
  grassA: "#5aaa3e",
  grassB: "#6ab84a",
  deepGrassA: "#246828",
  deepGrassB: "#1a501c",
  buildingStyle: "brick-city",
};

const THEMES = {
  "brick-city": BRICK_CITY_THEME,
  ridgeview: RIDGEVIEW_THEME,
  flatland: FLATLAND_THEME,
};

/**
 * Theme for a town or road map. Roads and unknown ids fall back to
 * Brick City so a missing entry never blanks the palette.
 */
export function themeFor(mapId) {
  if (mapId && THEMES[mapId]) return THEMES[mapId];
  return BRICK_CITY_THEME;
}

export function knownThemeIds() {
  return Object.keys(THEMES);
}
