/**
 * forage.js
 * What you can pick up by walking through deep grass.
 *
 * A step into a tall-grass tile rolls once. The roll is a function the
 * caller passes in, same idea as a race, so a test can force a gel or a
 * miss without Math.random. Park grass is stingy. The mountain trail is
 * a little more generous and a little more likely to hand you a shake
 * or a piece of plain gear.
 *
 * Three finds end the day. Sleep is what puts the counter back to zero.
 * There is no clock that resets it at midnight.
 *
 * Gels join the same pocket as a store gel (they give +1 energy when
 * eaten). Socks and plain belts or vests go to the closet. A second copy
 * of something you already own becomes a gel instead, so a find is never
 * thrown away and the closet does not grow duplicate rows.
 */

import { FINDS_PER_DAY } from "@/lib/constants";

/**
 * Chance a single step into deep grass finds anything.
 * 0.045 is about 1 in 22 steps on the park. 0.07 is about 1 in 14 on
 * the mountain. Both stay rare next to a shop.
 */
export const FIND_CHANCE = {
  park: 0.045,
  mountain: 0.07,
};

/**
 * Weights are relative, not percents. Park totals 100 so the gel is
 * a bit under half of finds. The mountain shifts weight toward the
 * shake and the plain gear, and its chance above is higher too.
 */
export const LOOT = {
  park: [
    { id: "gel", weight: 46 },
    { id: "socks", weight: 28 },
    { id: "flask", weight: 14 },
    { id: "shake", weight: 8 },
    { id: "generic-belt", weight: 2 },
    { id: "generic-vest", weight: 2 },
  ],
  mountain: [
    { id: "gel", weight: 30 },
    { id: "socks", weight: 22 },
    { id: "flask", weight: 18 },
    { id: "shake", weight: 16 },
    { id: "generic-belt", weight: 7 },
    { id: "generic-vest", weight: 7 },
  ],
};

const NAMES = {
  gel: "a gel",
  socks: "running socks",
  flask: "a soft flask",
  shake: "a protein shake",
  "generic-belt": "a generic belt",
  "generic-vest": "a generic hydration vest",
};

export function findsToday(state) {
  const value = state?.calendar?.findsToday;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  return 0;
}

/**
 * Deep grass only exists in two places. North of the upper road, east
 * of the gate rocks, is the mountain. South of the lower road is the
 * park. Anywhere else is not a find, even if a tile were mistyped.
 */
export function forageArea(tx, ty) {
  if (ty <= 6 && tx >= 27) return "mountain";
  if (ty >= 22 && tx >= 14) return "park";
  return null;
}

export function pickLoot(area, roll) {
  const table = LOOT[area] || LOOT.park;
  const total = table.reduce((sum, row) => sum + row.weight, 0);
  let cursor = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const row of table) {
    cursor -= row.weight;
    if (cursor < 0) return row.id;
  }
  return table[table.length - 1].id;
}

function alreadyOwned(state, id) {
  if (id === "socks") return (state.gear.ownedSocks || []).includes("socks-generic");
  if (id === "generic-belt" || id === "generic-vest") {
    return (state.gear.ownedCarry || []).includes(id);
  }
  return false;
}

/**
 * Put the find in the closet or the pocket. A duplicate sock or a
 * duplicate plain belt becomes a gel so the step still pays.
 * Returns the words for the dialogue box.
 */
function grantFind(state, id) {
  if ((id === "socks" || id === "generic-belt" || id === "generic-vest") && alreadyOwned(state, id)) {
    state.gels = (state.gels || 0) + 1;
    return `You found ${NAMES[id]}! You already have that, so you pocket a gel.`;
  }
  if (id === "gel") {
    state.gels = (state.gels || 0) + 1;
  } else if (id === "socks") {
    state.gear.ownedSocks = [...(state.gear.ownedSocks || []), "socks-generic"];
  } else if (id === "flask") {
    state.flasks = (state.flasks || 0) + 1;
  } else if (id === "shake") {
    state.shakes = (state.shakes || 0) + 1;
  } else if (id === "generic-belt" || id === "generic-vest") {
    state.gear.ownedCarry = [...(state.gear.ownedCarry || []), id];
  }
  return `You found ${NAMES[id] || "something"}!`;
}

/**
 * One step onto deep grass. rng() is called once for "did anything
 * happen?" and, only on a hit, once more for which row of the table.
 * A miss does not consume the second roll, so a scripted list can be
 * [0.9] for a miss and [0, 0] for the first item.
 */
export function applyForage(state, area, rng = Math.random) {
  if (!LOOT[area]) return { found: false, state, line: "" };
  if (findsToday(state) >= FINDS_PER_DAY) return { found: false, state, line: "" };
  const chance = FIND_CHANCE[area];
  if (rng() >= chance) return { found: false, state, line: "" };
  const id = pickLoot(area, rng());
  const next = structuredClone(state);
  if (!next.calendar) next.calendar = {};
  next.calendar.findsToday = findsToday(next) + 1;
  if (typeof next.gels !== "number") next.gels = 0;
  if (typeof next.flasks !== "number") next.flasks = 0;
  if (typeof next.shakes !== "number") next.shakes = 0;
  const line = grantFind(next, id);
  return { found: true, state: next, line, id };
}

export function findName(id) {
  return NAMES[id] || id;
}
