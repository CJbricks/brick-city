/**
 * watches.js
 * Rare running watches found from Ridgeview onward.
 *
 * Owning any watch unlocks the GPS overview map and segment logging.
 * The run club does not hand out a watch — segments are a Ridgeview-
 * and-later feature. Club tips mention segments once you own one.
 *
 * Names are original. No real brand logos.
 */

/** Watch product rows. unlockCity gates which tall-grass table can drop them. */
export const WATCHES = {
  "trail-pulse": {
    id: "trail-pulse",
    name: "Trail Pulse 1",
    blurb: "A chunky GPS watch. Unlocks the overview map and segment logging.",
    unlockCity: "ridgeview",
  },
  "ridge-chrono": {
    id: "ridge-chrono",
    name: "Ridge Chrono X",
    blurb: "A brighter face for long mountain days. Same GPS features.",
    unlockCity: "ridgeview",
  },
  "yard-beacon": {
    id: "yard-beacon",
    name: "Yard Beacon",
    blurb: "Flatland's favorite backyard timer. GPS + segments.",
    unlockCity: "flatland",
  },
};

export const WATCH_IDS = Object.keys(WATCHES);

/** Relative weight inside a Ridgeview/Flatland forage table. Rare. */
export const WATCH_FIND_WEIGHT = 3;

export function watchById(id) {
  return WATCHES[id] || null;
}

export function ownedWatches(state) {
  const list = state?.gear?.ownedWatches;
  if (!Array.isArray(list)) return [];
  return list.filter((id) => Boolean(WATCHES[id]));
}

export function hasWatch(state) {
  return ownedWatches(state).length > 0;
}

export function equippedWatch(state) {
  const id = state?.gear?.watch;
  if (id && WATCHES[id] && ownedWatches(state).includes(id)) return id;
  const owned = ownedWatches(state);
  return owned[0] || null;
}

/**
 * Grant a watch into the closet. Duplicates become a gel (same idea as
 * forage socks). Mutates the cloned save.
 */
export function grantWatch(state, watchId) {
  const row = watchById(watchId);
  if (!row) return "You found something strange, then lost it in the grass.";
  if (!state.gear) state.gear = {};
  if (!Array.isArray(state.gear.ownedWatches)) state.gear.ownedWatches = [];
  if (state.gear.ownedWatches.includes(watchId)) {
    state.gels = (state.gels || 0) + 1;
    return `You found another ${row.name}! You already have that, so you pocket a gel.`;
  }
  state.gear.ownedWatches = [...state.gear.ownedWatches, watchId];
  if (!state.gear.watch) state.gear.watch = watchId;
  return `You found a ${row.name}! GPS map and segments are unlocked.`;
}

/**
 * Club tip once you own a watch. Replaces RUN_CLUB_SEGMENT_HOOK.
 */
export function runClubSegmentTip(state) {
  if (!hasWatch(state)) {
    return "Local segments need a running watch. Hunt tall grass in Ridgeview and later towns.";
  }
  return "With your watch on, club routes can log Cornerstone segments. Beat a Local Legend time for coins and a title.";
}

/**
 * Fill missing watch fields on load. Version stays 1.
 * Missing means no watches owned and no watch equipped.
 */
export function normalizeWatches(data) {
  if (!data.gear || typeof data.gear !== "object") return data;
  if (!Array.isArray(data.gear.ownedWatches)) data.gear.ownedWatches = [];
  else {
    data.gear.ownedWatches = data.gear.ownedWatches.filter((id) => Boolean(WATCHES[id]));
  }
  if (data.gear.watch && !data.gear.ownedWatches.includes(data.gear.watch)) {
    data.gear.watch = data.gear.ownedWatches[0] || null;
  }
  if (data.gear.watch == null) data.gear.watch = null;
  return data;
}
