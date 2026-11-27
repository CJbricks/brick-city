/**
 * flatland.js
 * Flatland town map — farm / backyard ultra town at TOWN_MAP size.
 *
 * Layout lives in layouts/flatlandLayout.js (country crossroads, small
 * building cluster, long farm roads, field patches, practice yard).
 * This file only assembles that data into a walkable world.
 *
 * See "Town layouts" in docs/NOTES.md.
 */

import { CITIES } from "@/lib/constants";
import { assembleWorld, spawnAt } from "@/game/maps/shared";
import { applyLayout } from "@/game/maps/layoutEngine";
import {
  FLATLAND_ACTIVITY_BOARD,
  FLATLAND_BUILDINGS,
  FLATLAND_LANDMARKS,
  FLATLAND_LAYOUT,
  FLATLAND_NPCS,
  FLATLAND_PLACES,
  FLATLAND_SIGNS,
  FLATLAND_TRACK_SIGNS,
} from "@/game/maps/layouts/flatlandLayout";

export const FLATLAND_INFO = CITIES.flatland;

export {
  FLATLAND_BUILDINGS,
  FLATLAND_LANDMARKS,
  FLATLAND_PLACES,
  FLATLAND_SIGNS,
};

export function buildFlatlandWorld() {
  const ground = applyLayout(FLATLAND_LAYOUT);
  return assembleWorld({
    id: "flatland",
    info: FLATLAND_INFO,
    ground,
    buildings: FLATLAND_BUILDINGS,
    places: FLATLAND_PLACES,
    npcs: FLATLAND_NPCS,
    signs: FLATLAND_SIGNS,
    landmarks: FLATLAND_LANDMARKS,
    activityBoard: FLATLAND_ACTIVITY_BOARD,
    trackSigns: FLATLAND_TRACK_SIGNS,
    mountainOpen: true,
    mountainTrail: [],
  });
}

export function flatlandHomeSpawn() {
  return spawnAt(5, 9, "up");
}
