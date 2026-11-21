/**
 * roads.js
 * Walkable road maps between towns.
 *
 * First trip Brick City → Ridgeview and Ridgeview → Flatland. Each road
 * has optional street-race challengers you can race or walk past.
 * Arriving at the far end calls arriveInCity from the travel flow.
 */

import {
  ROAD_BRICK_RIDGEVIEW,
  ROAD_RIDGEVIEW_FLATLAND,
} from "@/lib/travel";
import {
  assembleWorld,
  emptyGround,
  fillRect,
  hRoad,
  spawnAt,
  vRoad,
  MAP_COLS,
  MAP_ROWS,
} from "@/game/maps/shared";

function createRoadGround() {
  const ground = emptyGround("g");
  // Tree edges
  for (let x = 0; x < MAP_COLS; x += 1) {
    ground[0][x] = "t";
    ground[MAP_ROWS - 1][x] = "t";
  }
  for (let y = 0; y < MAP_ROWS; y += 1) {
    ground[y][0] = "t";
    ground[y][MAP_COLS - 1] = "t";
  }
  // Long east-west road through the middle
  hRoad(ground, 32, 1, MAP_COLS - 2, "r");
  hRoad(ground, 33, 1, MAP_COLS - 2, "r");
  hRoad(ground, 31, 1, MAP_COLS - 2, "s");
  hRoad(ground, 34, 1, MAP_COLS - 2, "s");
  // Side pullouts with tall grass
  fillRect(ground, 18, 28, 6, 3, "h");
  fillRect(ground, 40, 35, 8, 4, "h");
  fillRect(ground, 55, 28, 5, 3, "h");
  // A short north spur
  vRoad(ground, 36, 20, 31, "x");
  return ground;
}

const BRICK_RIDGE_NPCS = [
  {
    id: "joss",
    name: "Joss Ember",
    tx: 22,
    ty: 31,
    facing: "down",
    palette: "rival",
    gender: "female",
    location: "race-joss",
    stand: { tx: 22, ty: 32 },
  },
  {
    id: "quill",
    name: "Quill March",
    tx: 48,
    ty: 33,
    facing: "up",
    palette: "male",
    gender: "male",
    location: "race-quill",
    stand: { tx: 48, ty: 32 },
  },
];

const RIDGE_FLAT_NPCS = [
  {
    id: "soren",
    name: "Soren Vale",
    tx: 20,
    ty: 31,
    facing: "down",
    palette: "ranger",
    gender: "male",
    location: "race-soren",
    stand: { tx: 20, ty: 32 },
  },
  {
    id: "breeze",
    name: "Breeze Dalton",
    tx: 50,
    ty: 33,
    facing: "up",
    palette: "female",
    gender: "female",
    location: "race-breeze",
    stand: { tx: 50, ty: 32 },
  },
];

export function buildBrickRidgeRoadWorld() {
  const ground = createRoadGround();
  const places = [
    { id: "road-west", name: "Back to Brick City", tx: 3, ty: 32, facing: "left" },
    { id: "road-east", name: "Into Ridgeview", tx: 68, ty: 32, facing: "right" },
  ];
  return assembleWorld({
    id: ROAD_BRICK_RIDGEVIEW,
    info: { id: ROAD_BRICK_RIDGEVIEW, name: "Ridge Road", motto: "Walk it once" },
    ground,
    buildings: [],
    places,
    npcs: BRICK_RIDGE_NPCS,
    signs: [{ id: "sign-city", tx: 10, ty: 31 }],
    landmarks: [],
    activityBoard: null,
    trackSigns: [],
    mountainOpen: true,
    mountainTrail: [],
  });
}

export function buildRidgeFlatRoadWorld() {
  const ground = createRoadGround();
  const places = [
    { id: "road-west", name: "Back to Ridgeview", tx: 3, ty: 32, facing: "left" },
    { id: "road-east", name: "Into Flatland", tx: 68, ty: 32, facing: "right" },
  ];
  return assembleWorld({
    id: ROAD_RIDGEVIEW_FLATLAND,
    info: { id: ROAD_RIDGEVIEW_FLATLAND, name: "Farm Road", motto: "Open sky" },
    ground,
    buildings: [],
    places,
    npcs: RIDGE_FLAT_NPCS,
    signs: [{ id: "sign-city", tx: 10, ty: 31 }],
    landmarks: [],
    activityBoard: null,
    trackSigns: [],
    mountainOpen: true,
    mountainTrail: [],
  });
}

export function roadWestSpawn() {
  return spawnAt(4, 32, "right");
}

export function roadEastSpawn() {
  return spawnAt(67, 32, "left");
}
