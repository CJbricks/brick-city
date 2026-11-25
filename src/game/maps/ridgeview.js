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
 *
 * Roads: stampCoreTown lays only the shared door grid. This file adds a
 * dirt trail out to the Flatland exit post and keeps a short asphalt
 * spur at the map edge. Do not re-extend y=8 / y=20 across the meadow —
 * that was the leftover-grid look CJ screenshotted.
 *
 * Look: townThemes.js gives Ridgeview alpine grass, conifers, Chamonix
 * chalets, and Auburn false-front shops. Landmarks here add a plaza
 * church (reverent landmark only — not a shop), a race arch, rock piles,
 * and trail posts. Door tiles and building footprints stay put.
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
  // Plaza church between the upper street and the square. Landmark only —
  // not in PLACES, not a race menu. Keep clear of Dylan (16,13) and the
  // activity board (20,13). Footprint sits on grass north of the plaza.
  { id: "church", tx: 15, ty: 9, w: 4, h: 3 },
  // Race start/finish arch on the north lip of the plaza (paint + block).
  { id: "race-arch", tx: 14, ty: 12, w: 4, h: 1 },
  // Granite piles and trail markers (mountain-town flavor).
  { id: "rock-pile-a", tx: 38, ty: 22, w: 2, h: 2 },
  { id: "rock-pile-b", tx: 6, ty: 26, w: 2, h: 1 },
  { id: "trail-post-a", tx: 29, ty: 7, w: 1, h: 1 },
  { id: "trail-post-b", tx: 32, ty: 30, w: 1, h: 1 },
  { id: "wood-fence-a", tx: 2, ty: 18, w: 3, h: 1 },
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
    // Stand north of the exit asphalt. Sitting on y=18 used to split the
    // spur into two dead ends (you could not walk past the post).
    id: "road-block-rv",
    name: "Trail Post",
    tx: 60,
    ty: 17,
    facing: "down",
    palette: "ranger",
    gender: "female",
    location: "road-exit-flatland",
    stand: { tx: 60, ty: 18 },
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
  // Mountain path east of gate (pebble dirt, not asphalt).
  hRoad(ground, 6, 30, 55, "x");
  vRoad(ground, 45, 2, 8, "x");
  fillRect(ground, 40, 2, 14, 5, "h");
  // Granite outcrops (o) and a few border pines (t)
  fillRect(ground, 33, 3, 2, 2, "o");
  fillRect(ground, 50, 4, 2, 2, "o");
  fillRect(ground, 42, 24, 2, 2, "o");
  fillRect(ground, 3, 32, 1, 2, "t");
  fillRect(ground, 5, 40, 1, 2, "t");
  // Dirt trail from the east end of the lower street out to the Flatland
  // exit. A mountain town should read as trail, not a boulevard across
  // the meadow. Short asphalt only at the map-edge spur by the Trail Post.
  // Loop north around the kiln stack (52–54, 20–21) so the path stays open.
  hRoad(ground, 20, 42, 51, "x");
  vRoad(ground, 51, 19, 20, "x");
  hRoad(ground, 19, 51, 55, "x");
  vRoad(ground, 55, 18, 19, "x");
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
