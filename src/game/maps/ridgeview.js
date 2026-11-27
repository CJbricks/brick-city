/**
 * ridgeview.js
 * Ridgeview town map — trail / mountain town at TOWN_MAP size.
 *
 * Layout lives in layouts/ridgeviewLayout.js (winding valley street,
 * plaza church, hillside chalets, Gold Rush storefronts, switchbacks).
 * This file only assembles that data into a walkable world.
 *
 * Look: townThemes.js gives Ridgeview alpine grass, conifers, Chamonix
 * chalets, and Auburn false-front shops. Original pixels only.
 *
 * See "Town layouts" and "Town themes and palettes" in docs/NOTES.md.
 */

import { CITIES } from "@/lib/constants";
import { assembleWorld, spawnAt } from "@/game/maps/shared";
import { applyLayout } from "@/game/maps/layoutEngine";
import {
  RIDGEVIEW_ACTIVITY_BOARD,
  RIDGEVIEW_BUILDINGS,
  RIDGEVIEW_LANDMARKS,
  RIDGEVIEW_LAYOUT,
  RIDGEVIEW_MOUNTAIN_TRAIL,
  RIDGEVIEW_NPCS,
  RIDGEVIEW_PLACES,
  RIDGEVIEW_SIGNS,
  RIDGEVIEW_TRACK_SIGNS,
} from "@/game/maps/layouts/ridgeviewLayout";

export const RIDGEVIEW_INFO = CITIES.ridgeview;

export {
  RIDGEVIEW_BUILDINGS,
  RIDGEVIEW_LANDMARKS,
  RIDGEVIEW_PLACES,
  RIDGEVIEW_SIGNS,
};

export function buildRidgeviewWorld() {
  const ground = applyLayout(RIDGEVIEW_LAYOUT);
  return assembleWorld({
    id: "ridgeview",
    info: RIDGEVIEW_INFO,
    ground,
    buildings: RIDGEVIEW_BUILDINGS,
    places: RIDGEVIEW_PLACES,
    npcs: RIDGEVIEW_NPCS,
    signs: RIDGEVIEW_SIGNS,
    landmarks: RIDGEVIEW_LANDMARKS,
    activityBoard: RIDGEVIEW_ACTIVITY_BOARD,
    trackSigns: RIDGEVIEW_TRACK_SIGNS,
    mountainOpen: true,
    mountainTrail: RIDGEVIEW_MOUNTAIN_TRAIL,
  });
}

export function ridgeviewHomeSpawn() {
  return spawnAt(6, 9, "up");
}
