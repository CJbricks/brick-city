/**
 * travelActions.js
 * Apply depot fast travel and road enter / arrive.
 *
 * Kept separate from activities.js so the travel rules stay readable.
 * Callers still go through perform() in activities.js.
 *
 * Does not import activities.js (that would be a circular dependency).
 * City shelf unlocks use the same catalog helpers arriveInCity uses.
 */

import {
  catalogArrivalMessage,
  citiesReached,
  normalizeCitiesReached,
  CITY_UNLOCK_ORDER,
} from "@/lib/catalog";
import { clampMeter } from "@/lib/condition";
import { maxNutritionFromGear } from "@/lib/catalog";
import {
  FAST_TRAVEL_ENERGY,
  FAST_TRAVEL_FATIGUE,
  FAST_TRAVEL_NUTRITION,
  ROAD_BRICK_RIDGEVIEW,
  ROAD_RIDGEVIEW_FLATLAND,
  cityGuideGreeting,
  depotDestinations,
  flatlandRoadOpen,
  ridgeviewRoadOpen,
  roadExitBlockedMessage,
} from "@/lib/travel";
import { homeSpawnFor, roadArrivalSpawn } from "@/game/town";

function clone(state) {
  return structuredClone(state);
}

function readEnergy(state) {
  return typeof state.energy === "number" ? state.energy : 10;
}

function refuse(state, lines) {
  return { ok: false, state, lines, ticker: "" };
}

function finish(before, next, lines, extra = {}) {
  return { ok: true, state: next, lines, ticker: "", ...extra };
}

/** Same shelf write as arriveInCity, without importing activities.js. */
function markReached(state, cityId) {
  if (!CITY_UNLOCK_ORDER.includes(cityId)) return [];
  const before = citiesReached(state);
  if (before.includes(cityId)) return [];
  state.citiesReached = normalizeCitiesReached([...(state.citiesReached || []), cityId]);
  const msg = catalogArrivalMessage(state);
  return msg ? [msg] : [];
}

function cityLabel(cityId) {
  if (cityId === "brick-city") return "Brick City";
  if (cityId === "ridgeview") return "Ridgeview";
  if (cityId === "flatland") return "Flatland";
  return cityId;
}

/**
 * Bus between discovered cities. Sets city + mapId and teleports home.
 */
export function applyFastTravel(state, cityId) {
  const allowed = depotDestinations(state);
  if (!allowed.includes(cityId)) {
    return refuse(state, ["That depot route is not open yet. Discover the city on foot first."]);
  }
  if (readEnergy(state) < FAST_TRAVEL_ENERGY) {
    return refuse(state, [`The bus needs ${FAST_TRAVEL_ENERGY} energy.`]);
  }
  const next = clone(state);
  next.energy = readEnergy(next) - FAST_TRAVEL_ENERGY;
  next.condition.fatigue = clampMeter(next.condition.fatigue + FAST_TRAVEL_FATIGUE);
  const cap = maxNutritionFromGear(next.gear);
  next.condition.nutrition = Math.max(0, Math.min(cap, next.condition.nutrition + FAST_TRAVEL_NUTRITION));
  next.city = cityId;
  next.mapId = cityId;
  next.position = homeSpawnFor(cityId);
  const lines = [
    `Bus to ${cityLabel(cityId)}.`,
    `−${FAST_TRAVEL_ENERGY} energy. A short ride.`,
    ...markReached(next, cityId),
  ];
  return finish(state, next, lines);
}

/**
 * Step onto the road map from a town exit (or blocked message).
 * side: "west" means leaving the western town toward the east;
 * "east" means leaving the eastern town back toward the west.
 */
export function applyEnterRoad(state, roadId, side = "west") {
  if (roadId === ROAD_BRICK_RIDGEVIEW) {
    if (!ridgeviewRoadOpen(state)) {
      return refuse(state, [roadExitBlockedMessage("brick-city")]);
    }
    const next = clone(state);
    next.mapId = ROAD_BRICK_RIDGEVIEW;
    // From Brick City start at west; from Ridgeview returning start at east.
    next.position = roadArrivalSpawn(ROAD_BRICK_RIDGEVIEW, side === "east" ? "east" : "west");
    return finish(state, next, [
      side === "east"
        ? "You leave Ridgeview west on the ridge road."
        : "You leave Brick City on the ridge road. Optional racers wait on the shoulder — talk or walk past.",
    ]);
  }
  if (roadId === ROAD_RIDGEVIEW_FLATLAND) {
    if (side !== "east" && !flatlandRoadOpen(state)) {
      return refuse(state, [roadExitBlockedMessage("ridgeview")]);
    }
    const next = clone(state);
    next.mapId = ROAD_RIDGEVIEW_FLATLAND;
    next.position = roadArrivalSpawn(ROAD_RIDGEVIEW_FLATLAND, side === "east" ? "east" : "west");
    return finish(state, next, [
      side === "east"
        ? "You leave Flatland west on the farm road."
        : "You leave Ridgeview toward Flatland. Optional challengers on the gravel — race or skip.",
    ]);
  }
  return refuse(state, ["That road is not on the map."]);
}

/**
 * Reach the east end of a road and enter the destination town.
 */
export function applyArriveFromRoad(state, roadId) {
  const next = clone(state);
  let cityId = null;
  if (roadId === ROAD_BRICK_RIDGEVIEW) cityId = "ridgeview";
  if (roadId === ROAD_RIDGEVIEW_FLATLAND) cityId = "flatland";
  if (!cityId) return refuse(state, ["Nowhere to arrive."]);

  const first = !citiesReached(next).includes(cityId);
  next.city = cityId;
  next.mapId = cityId;
  next.position = homeSpawnFor(cityId);
  const lines = [...markReached(next, cityId)];
  const guide = cityGuideGreeting(cityId, state);
  if (first && guide) {
    lines.push(...guide.lines);
    return finish(state, next, lines, { speaker: guide.speaker });
  }
  lines.push(`You walk into ${cityLabel(cityId)}.`);
  return finish(state, next, lines);
}

/**
 * Walk west on a road back to the origin town.
 */
export function applyReturnFromRoad(state, roadId) {
  const next = clone(state);
  let cityId = "brick-city";
  if (roadId === ROAD_BRICK_RIDGEVIEW) cityId = "brick-city";
  if (roadId === ROAD_RIDGEVIEW_FLATLAND) cityId = "ridgeview";
  next.city = cityId;
  next.mapId = cityId;
  next.position = homeSpawnFor(cityId);
  return finish(state, next, [`Back in ${cityLabel(cityId)}.`]);
}
