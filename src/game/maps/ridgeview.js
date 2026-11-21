/**
 * ridgeview.js
 * Ridgeview town map — trail / mountain town at TOWN_MAP size.
 *
 * Same core training locations every town has, plus mountain flavor,
 * Dylan Broman (city guide), and a few trail NPCs. Tall grass east of
 * the trail head can hide a running watch (forage area "ridgeview").
 *
 * RIDGEVIEW_LANDMARKS holds a small trail-side garden (beds, can,
 * scarecrow) and the kiln stack. art.js paints those ids the same way
 * as Brick City. Keep the footprints off doors and the main roads.
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

export const RIDGEVIEW_INFO = CITIES.ridgeview;

export const RIDGEVIEW_SIGNS = [{ id: "sign-city", tx: 4, ty: 7 }];

export const RIDGEVIEW_BUILDINGS = CORE_BUILDINGS.map((b) => ({ ...b }));

export const RIDGEVIEW_PLACES = corePlaces("Good Neighbor Roasting", "Mountain Trails");

export const RIDGEVIEW_LANDMARKS = [
  // Small trail-side garden plot (cheap detail pass).
  { id: "garden-bed-a", tx: 48, ty: 12, w: 2, h: 1 },
  { id: "garden-bed-b", tx: 51, ty: 12, w: 1, h: 1 },
  { id: "garden-bed-c", tx: 48, ty: 13, w: 2, h: 1 },
  { id: "garden-can", tx: 51, ty: 13, w: 1, h: 1 },
  { id: "garden-scarecrow", tx: 52, ty: 12, w: 1, h: 1 },
  { id: "kiln-stack", tx: 52, ty: 20, w: 3, h: 2 },
];

const RIDGEVIEW_NPCS = [
  {
    id: "dylan",
    name: "Dylan Broman",
    tx: 16,
    ty: 13,
    facing: "down",
    palette: "ranger",
    gender: "male",
    location: "guide-dylan",
    stand: { tx: 16, ty: 14 },
  },
  {
    id: "cedar",
    name: "Cedar Pike",
    tx: 31,
    ty: 7,
    facing: "left",
    palette: "rival",
    gender: "male",
    location: "race-cedar",
  },
  {
    id: "nessa",
    name: "Nessa Quill",
    tx: 41,
    ty: 15,
    facing: "left",
    palette: "female",
    gender: "female",
    location: "chat-nessa",
  },
  {
    id: "road-block-rv",
    name: "Trail Post",
    tx: 60,
    ty: 18,
    facing: "left",
    palette: "ranger",
    gender: "female",
    location: "road-exit-flatland",
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

function createRidgeviewGround() {
  const ground = emptyGround("g");
  stampCoreTown(ground);
  // Mountain path east of gate
  hRoad(ground, 6, 30, 55, "x");
  vRoad(ground, 45, 2, 8, "x");
  fillRect(ground, 40, 2, 14, 5, "h");
  // Rocks
  fillRect(ground, 33, 3, 2, 2, "t");
  fillRect(ground, 50, 4, 2, 2, "t");
  // Road exit east toward Flatland
  hRoad(ground, 18, 55, 70, "r");
  // Small track oval
  fillRect(ground, 27, 11, 7, 8, "k");
  fillRect(ground, 28, 12, 5, 6, "i");
  return ground;
}

const MOUNTAIN_TRAIL = [
  { tx: 30, ty: 6 },
  { tx: 31, ty: 6 },
  { tx: 32, ty: 6 },
];

export function buildRidgeviewWorld(state) {
  const ground = createRidgeviewGround();
  return assembleWorld({
    id: "ridgeview",
    info: RIDGEVIEW_INFO,
    ground,
    buildings: RIDGEVIEW_BUILDINGS,
    places: RIDGEVIEW_PLACES,
    npcs: RIDGEVIEW_NPCS,
    signs: RIDGEVIEW_SIGNS,
    landmarks: RIDGEVIEW_LANDMARKS,
    activityBoard: ACTIVITY_BOARD,
    trackSigns: TRACK_SIGNS,
    mountainOpen: true,
    mountainTrail: MOUNTAIN_TRAIL,
  });
}

export function ridgeviewHomeSpawn() {
  return spawnAt(5, 7, "up");
}
