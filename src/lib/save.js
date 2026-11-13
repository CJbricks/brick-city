/**
 * save.js
 * Browser save for v1. The whole runner is one JSON blob in localStorage.
 * There is no account and no Strava token. Never put a secret in this file.
 *
 * serialize / deserialize are pure so tests can round-trip a state without
 * a browser. loadSave / writeSave / clearSave are the thin localStorage
 * wrappers the screens call after mount (never during server render).
 *
 * v2 widened every tile from 16px to 32px. A position is stored in pixels,
 * so an old save's x/y would land on the wrong half of the new tile and
 * often inside a wall. New games stamp tileSize: 32. A save without that
 * stamp is treated as 16px and doubled once on load.
 */

import { MAX_ENERGY, SAVE_KEY, SAVE_VERSION } from "@/lib/constants";
import { slotFromEnergy } from "@/lib/calendar";
import { TILE } from "@/game/town";

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
