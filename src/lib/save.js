/**
 * save.js
 * Browser save for v1. The whole runner is one JSON blob in localStorage.
 * There is no account and no Strava token. Never put a secret in this file.
 *
 * serialize / deserialize are pure so tests can round-trip a state without
 * a browser. loadSave / writeSave / clearSave are the thin localStorage
 * wrappers the screens call after mount (never during server render).
 */

import { MAX_ENERGY, SAVE_KEY, SAVE_VERSION } from "@/lib/constants";
import { slotFromEnergy } from "@/lib/calendar";

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
