/**
 * save.js
 * Browser save for v1. The whole runner is one JSON blob in localStorage
 * under brick-city-save-v1. There is no account and no Strava token.
 * Never put a secret in this file.
 *
 * serialize / deserialize are pure so tests can round-trip a state without
 * a browser. loadSave / writeSave / clearSave are the thin localStorage
 * wrappers the screens call after mount (never during server render).
 *
 * The version number stays 1 on purpose. Brand shoes, belts, vests, and
 * sponsors were added later, but an older blob is still this save. We fill
 * the new fields instead of rejecting the file. A wrong version (not 1)
 * still means "no save", so the title screen offers New Game.
 *
 * Daily meal, snack, and nap counts were added on this same key. A blob
 * from before those counts existed still loads. Missing numbers become 0,
 * or 1 when the older yes/no flag says that plate or nap was already used.
 *
 * The Run Store deck keeps shiftCursor and shiftsToday on the calendar.
 * Both arrived on this same key. A blob from before the deck has neither.
 * The shift code treats a missing cursor as "start from the day number"
 * and a missing count as zero. Resume does not need a new save version,
 * and an old job id (shoes, stock, gait) still names its original scene.
 *
 * v2 widened every tile from 16px to 32px. A position is stored in pixels,
 * so an old save's x/y would land on the wrong half of the new tile and
 * often inside a wall. New games stamp tileSize: 32. A save without that
 * stamp is treated as 16px and doubled once on load.
 */

import { MAX_ENERGY, SAVE_KEY, SAVE_VERSION } from "@/lib/constants";
import { slotFromEnergy } from "@/lib/calendar";
import { TILE } from "@/game/town";
import { maxNutritionFromGear, normalizeGear } from "@/lib/catalog";
import { normalizeSponsors } from "@/lib/sponsors";

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(raw) {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    if (!data.runner || typeof data.runner.name !== "string") return null;
    if (data.runner.gender !== "male" && data.runner.gender !== "female") return null;
    if (!data.xp || !data.condition || !data.calendar || !data.gear) return null;
    // Saves written before energy existed still load. A missing bar means
    // a full day, and the clock is pulled back in line with that bar so
    // the sky and the blocks don't disagree.
    if (typeof data.energy !== "number") {
      data.energy = MAX_ENERGY;
      data.calendar.slot = slotFromEnergy(MAX_ENERGY);
    }
    if (typeof data.nappedToday !== "boolean") data.nappedToday = false;
    if (typeof data.gels !== "number") data.gels = 0;
    if (typeof data.calendar.homeMealUsed !== "boolean") data.calendar.homeMealUsed = false;
    if (typeof data.calendar.homeSnackUsed !== "boolean") data.calendar.homeSnackUsed = false;
    // The counts are newer than the yes/no flags. An old brick-city-save-v1
    // file has the flags and not the numbers. Missing means "start from the
    // flag": true is 1 (they already used the old once-a-day plate or nap),
    // false or absent is 0. Leaving the number missing would make the Home
    // menu print "Meals undefined/3".
    if (typeof data.napsToday !== "number") data.napsToday = data.nappedToday ? 1 : 0;
    if (typeof data.calendar.homeMeals !== "number") {
      data.calendar.homeMeals = data.calendar.homeMealUsed ? 1 : 0;
    }
    if (typeof data.calendar.homeSnacks !== "number") {
      data.calendar.homeSnacks = data.calendar.homeSnackUsed ? 1 : 0;
    }
    // Gear and sponsors are filled in, not required. A v1 closet that only
    // knows starter / road / trail / hybrid still loads. The house ids are
    // aliases, so those pairs stay equipped. Nutrition is pulled back
    // inside the cap the equipped belt or vest actually allows.
    data.gear = normalizeGear(data.gear);
    data.sponsors = normalizeSponsors(data.sponsors);
    if (typeof data.condition.nutrition === "number") {
      const cap = maxNutritionFromGear(data.gear);
      data.condition.nutrition = Math.max(0, Math.min(cap, Math.round(data.condition.nutrition)));
    }
    // Doubling keeps the runner on the same tile. floor(old / 16) is the
    // same tile as floor((old * 2) / 32). Saves that already say tileSize
    // 32 are left alone, or Resume would walk them through a wall.
    if (data.tileSize !== TILE) {
      if (data.position && typeof data.position.x === "number" && typeof data.position.y === "number") {
        data.position = {
          ...data.position,
          x: Math.round(data.position.x * (TILE / 16)),
          y: Math.round(data.position.y * (TILE / 16)),
        };
      }
      data.tileSize = TILE;
    }
    return data;
  } catch {
    return null;
  }
}

export function loadSave() {
  if (typeof localStorage === "undefined") return null;
  return deserialize(localStorage.getItem(SAVE_KEY));
}

export function writeSave(state) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SAVE_KEY, serialize(state));
}

export function clearSave() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

export function saveSummary(state) {
  if (!state) return null;
  return {
    name: state.runner.name,
    gender: state.runner.gender,
    level: state.level || null,
    day: state.calendar.day,
    weekday: state.calendar.weekday,
    slot: state.calendar.slot,
  };
}
