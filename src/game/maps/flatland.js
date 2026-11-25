/**
 * flatland.js
 * Flatland town map — farm / backyard ultra town at TOWN_MAP size.
 *
 * Same core training locations, farm flavor, Dark Mowdle (city guide),
 * and a practice yard landmark. Tall grass near the barn can hide a watch.
 *
 * FLATLAND_LANDMARKS is a farm garden (beds, shed, tools, scarecrow)
 * beside the yard road. Column x=48 is the road to the yard mat — do
 * not place a landmark on that column or the yard walk breaks.
 *
 * Roads: stampCoreTown stops the shared grid at the door block. This
 * file extends the lower street east only as far as the farm / yard
 * spur. That replaces the old full-width y=20 asphalt across empty
 * grass east of the clinic.
 */

import { CITIES } from "@/lib/constants";
import {
  CORE_BUILDINGS,
  assembleWorld,
  corePlaces,
  emptyGround,
  fillRect,
  hRoad,
  spawnAt,
  stampCoreTown,
  vRoad,
} from "@/game/maps/shared";

export const FLATLAND_INFO = CITIES.flatland;

export const FLATLAND_SIGNS = [{ id: "sign-city", tx: 4, ty: 7 }];

export const FLATLAND_BUILDINGS = CORE_BUILDINGS.map((b) => ({ ...b }));

export const FLATLAND_PLACES = [
  ...corePlaces("Captain's 43rd Bakery", "Farm Loops"),
  { id: "yard", name: "Practice Yard", tx: 48, ty: 22, facing: "up" },
];

export const FLATLAND_LANDMARKS = [
  // Farm garden beside the practice yard. Leave x=48 open — that column
  // is the north-south farm road to the yard mat.
  { id: "garden-bed-a", tx: 44, ty: 18, w: 3, h: 1 },
  { id: "garden-bed-b", tx: 50, ty: 18, w: 2, h: 1 },
  { id: "garden-bed-c", tx: 44, ty: 19, w: 2, h: 1 },
  { id: "garden-bed-d", tx: 50, ty: 19, w: 2, h: 1 },
  { id: "garden-shed", tx: 52, ty: 18, w: 2, h: 2 },
  { id: "garden-tools", tx: 43, ty: 18, w: 1, h: 1 },
  { id: "garden-scarecrow", tx: 51, ty: 20, w: 1, h: 1 },
  { id: "kiln-stack", tx: 54, ty: 16, w: 3, h: 2 },
];

const FLATLAND_NPCS = [
  {
    id: "dark",
    name: "Dark Mowdle",
    tx: 16,
    ty: 13,
    facing: "down",
    palette: "rival",
    gender: "male",
    location: "guide-dark",
    stand: { tx: 16, ty: 14 },
  },
  {
    id: "pax",
    name: "Pax Hollis",
    tx: 48,
    ty: 21,
    facing: "down",
    palette: "ranger",
    gender: "female",
    location: "yard",
  },
  {
    id: "remy-noct",
    name: "Remy Noct",
    tx: 25,
    ty: 30,
    facing: "up",
    palette: "male",
    gender: "male",
    location: "race-noct",
  },
];

const ACTIVITY_BOARD = {
  id: "activity",
  kiosk: { tx: 20, ty: 13 },
  mat: { tx: 20, ty: 14 },
};

const TRACK_SIGNS = [
  { id: "track", tx: 27, ty: 9 },
  { id: "track", tx: 28, ty: 9 },
];

function createFlatlandGround() {
  const ground = emptyGround("g");
  stampCoreTown(ground);
  // Farm fields and barn loop
  fillRect(ground, 42, 20, 16, 14, "x");
  fillRect(ground, 44, 24, 10, 8, "h");
  // Extend the shared lower street only as far as the yard spur — not
  // across the rest of the east meadow (stampCoreTown already stops at 42).
  hRoad(ground, 20, 40, 58, "r");
  hRoad(ground, 22, 40, 58, "r");
  // Join the shared y=20 town street; starting at 18 left a dead spur.
  vRoad(ground, 48, 20, 34, "r");
  // Silo path
  hRoad(ground, 40, 22, 50, "s");
  // Track oval
  fillRect(ground, 27, 11, 7, 8, "k");
  fillRect(ground, 28, 12, 5, 6, "i");
  return ground;
}

export function buildFlatlandWorld() {
  const ground = createFlatlandGround();
  return assembleWorld({
    id: "flatland",
    info: FLATLAND_INFO,
    ground,
    buildings: FLATLAND_BUILDINGS,
    places: FLATLAND_PLACES,
    npcs: FLATLAND_NPCS,
    signs: FLATLAND_SIGNS,
    landmarks: FLATLAND_LANDMARKS,
    activityBoard: ACTIVITY_BOARD,
    trackSigns: TRACK_SIGNS,
    mountainOpen: true,
    mountainTrail: [],
  });
}

export function flatlandHomeSpawn() {
  return spawnAt(5, 7, "up");
}
