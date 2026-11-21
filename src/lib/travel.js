/**
 * travel.js
 * Walking roads between towns, and the depot bus once a city is found.
 *
 * Brick City stays home until you finish both the Half and the Marathon.
 * Then the road to Ridgeview opens. Finishing all four Ridgeview premier
 * mountain races opens the road to Flatland. The first trip is always a
 * walkable road map with optional street-race challengers. After you have
 * arrived once (citiesReached), every town depot can fast-travel you for
 * a small energy cost.
 *
 * Why a separate file: unlock rules and costs are named constants so CJ
 * can retune travel without reading activities.js or the map grids.
 */

import { citiesReached } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";

/** Energy spent on a depot bus ride between discovered cities. */
export const FAST_TRAVEL_ENERGY = 2;

/**
 * Fatigue from a fast-travel hop. Small on purpose: the walk is the long
 * adventure; the bus is the convenience after you have already scouted.
 */
export const FAST_TRAVEL_FATIGUE = 4;

/** Food burned on the bus (a short trip snack). */
export const FAST_TRAVEL_NUTRITION = -4;

/** Road map ids. These are overworlds, not CITIES entries. */
export const ROAD_BRICK_RIDGEVIEW = "road-brick-ridgeview";
export const ROAD_RIDGEVIEW_FLATLAND = "road-ridgeview-flatland";

/** Towns that have a walkable map in this update. */
export const BUILT_TRAVEL_CITIES = ["brick-city", "ridgeview", "flatland"];

/**
 * Road unlock: Half + Marathon both finished. Missing either keeps the
 * Brick City road exit blocked with a sign / NPC line.
 */
export function ridgeviewRoadOpen(state) {
  return Boolean(state?.progress?.halfFinished) && Boolean(state?.progress?.marathonFinished);
}

/**
 * Flatland road: all four Ridgeview premier finishes.
 * Flags live on progress; missing on an old save means false.
 */
export function flatlandRoadOpen(state) {
  const p = state?.progress || {};
  return Boolean(p.ridge50kFinished)
    && Boolean(p.ridge100kFinished)
    && Boolean(p.ridge100mFinished)
    && Boolean(p.ridge200mFinished);
}

/** Which overworld map the runner is standing on. */
export function currentMapId(state) {
  const id = state?.mapId;
  if (typeof id === "string" && id.length > 0) return id;
  const city = state?.city;
  if (city && CITIES[city]) return city;
  return "brick-city";
}

/**
 * Depot destinations you can bus to right now.
 * Only discovered cities (citiesReached), never the town you are in,
 * and never a town that is not built yet.
 */
export function depotDestinations(state) {
  const here = state?.city || "brick-city";
  const reached = citiesReached(state);
  return BUILT_TRAVEL_CITIES.filter((id) => id !== here && reached.includes(id));
}

export function roadExitBlockedMessage(fromCity) {
  if (fromCity === "brick-city") {
    return "The road to Ridgeview stays shut until you finish the Brick City Half and the Brick City Marathon.";
  }
  if (fromCity === "ridgeview") {
    return "The road to Flatland opens after you finish all four Ridgeview premier trail races: 50K, 100K, 100 Mile, and 200 Mile.";
  }
  return "That road is not open yet.";
}

/**
 * First-arrival greeting for a city guide. Empty if you have been here.
 */
export function cityGuideGreeting(cityId, state) {
  const reached = citiesReached(state);
  if (reached.includes(cityId)) return null;
  if (cityId === "ridgeview") {
    return {
      speaker: "Dylan Broman",
      lines: [
        "Welcome to Ridgeview. I'm Dylan Broman, the city guide.",
        "Trails climb from here. The premier races are 50K, 100K, 100 Mile, then 200 Mile — finish one to open the next.",
        "Find a running watch in the tall grass if you want GPS segments. The depot will bus you back once you've arrived.",
      ],
    };
  }
  if (cityId === "flatland") {
    return {
      speaker: "Dark Mowdle",
      lines: [
        "Flatland. I'm Dark Mowdle. Last one standing is the only rule that matters here.",
        "Backyard ultras: 4.167 miles every hour on the bell. Keep going until you stop or miss a loop.",
        "Big's Backyard, BPN Go One More, and Storm City Backyard are the premier yards. There is a practice yard too.",
      ],
    };
  }
  return null;
}

export function isBuiltTravelCity(cityId) {
  return BUILT_TRAVEL_CITIES.includes(cityId);
}
