/**
 * streetRaces.js
 * Casual town / trail race opponents and the rematch timer.
 *
 * Remy Calder at the track is the story rival. These runners are optional
 * "see you on the block" races. After you finish one, they offer a
 * just-for-fun rematch about 1–2 in-game weeks later. Rematches never
 * unlock the mountain, the 10K, or the club.
 *
 * Names are original. No Nintendo / Game Freak characters.
 */

/** Days after a race before that opponent offers a rematch (~1.5 weeks). */
export const REMATCH_COOLDOWN_DAYS = 10;

/** Energy for a street / trail duel. Same as Remy's mile (2 under +1 costs). */
export const STREET_RACE_ENERGY = 2;

/** Shared duel numbers. Tuned softer than Remy so a new runner can win some. */
export const STREET_RACE = {
  miles: 1,
  fatigue: 10,
  nutrition: -6,
  peak: 2,
  winXp: { overall: 14, versatile: 3 },
  winAttributes: { speed: 3, mental: 1 },
  loseXp: { overall: 5 },
  loseAttributes: { speed: 1 },
  coins: 8,
  /** Base score the opponent holds. Player score uses finishScore-style form. */
  base: 18,
  /** How much the opponent grows per player level past 1. */
  levelScale: 1.1,
};

/**
 * Race opponents placed on the bigger map. id matches the NPC id in town.js.
 * location is the interact key PlayScreen opens.
 */
export const STREET_OPPONENTS = [
  {
    id: "tess",
    name: "Tess Quay",
    title: "the brick-block sprinter",
    location: "race-tess",
    blurb: "She warms up on the grocery sidewalk and talks in short sentences.",
    style: "road",
  },
  {
    id: "kit",
    name: "Kit Solano",
    title: "the plaza pacer",
    location: "race-kit",
    blurb: "Kit jogs circles around the fountain and times everything.",
    style: "road",
  },
  {
    id: "otto",
    name: "Otto Venn",
    title: "the pond-loop hobbyist",
    location: "race-otto",
    blurb: "Otto lives on the park dirt. Soft shoes. Soft voice. Hard kick.",
    style: "trail",
  },
  {
    id: "mara",
    name: "Mara Flint",
    title: "the ridge hobbyist",
    location: "race-mara",
    blurb: "Mara waits on the mountain path and races whoever makes the climb.",
    style: "trail",
  },
];

export function streetOpponentById(id) {
  return STREET_OPPONENTS.find((row) => row.id === id || row.location === id) || null;
}

export function streetOpponentByLocation(locationId) {
  return STREET_OPPONENTS.find((row) => row.location === locationId) || null;
}

/**
 * Rematch bookkeeping lives on state.rematches[opponentId].
 * Missing means never raced. An old save has no rematches object.
 */
export function rematchRecord(state, opponentId) {
  const bag = state?.rematches;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  const row = bag[opponentId];
  if (!row || typeof row !== "object") return null;
  return row;
}

export function daysSinceRace(state, opponentId) {
  const row = rematchRecord(state, opponentId);
  if (!row || typeof row.lastRaceDay !== "number") return null;
  const day = state?.calendar?.day;
  if (typeof day !== "number") return null;
  return Math.max(0, day - row.lastRaceDay);
}

/**
 * Rematch is optional and forever available once the cooldown is done,
 * until you race them again (which restarts the timer).
 */
export function rematchReady(state, opponentId) {
  const days = daysSinceRace(state, opponentId);
  if (days == null) return false;
  return days >= REMATCH_COOLDOWN_DAYS;
}

export function hasRacedBefore(state, opponentId) {
  return rematchRecord(state, opponentId) != null;
}

/**
 * Stamp a race finish. Mutates a cloned save the caller already owns.
 */
export function noteStreetRace(state, opponentId) {
  if (!state.rematches || typeof state.rematches !== "object" || Array.isArray(state.rematches)) {
    state.rematches = {};
  }
  const day = typeof state.calendar?.day === "number" ? state.calendar.day : 1;
  state.rematches[opponentId] = {
    lastRaceDay: day,
    readyDay: day + REMATCH_COOLDOWN_DAYS,
  };
}

/**
 * Fill missing rematch bookkeeping on load. Version stays 1.
 */
export function normalizeRematches(data) {
  if (!data.rematches || typeof data.rematches !== "object" || Array.isArray(data.rematches)) {
    data.rematches = {};
    return data;
  }
  const clean = {};
  for (const [id, row] of Object.entries(data.rematches)) {
    if (!row || typeof row !== "object") continue;
    const last = row.lastRaceDay;
    if (typeof last !== "number" || !Number.isFinite(last) || last < 1) continue;
    const ready = typeof row.readyDay === "number" && Number.isFinite(row.readyDay)
      ? Math.floor(row.readyDay)
      : Math.floor(last) + REMATCH_COOLDOWN_DAYS;
    clean[id] = { lastRaceDay: Math.floor(last), readyDay: ready };
  }
  data.rematches = clean;
  return data;
}

/**
 * Simple score duel. Player form uses meters + a roll. Opponent scales
 * a little with level so day-one wins stay rare but not impossible.
 */
export function streetRaceScores(state, opponent, roll = 0.5) {
  const endurance = state?.condition?.endurance ?? 0;
  const peak = state?.condition?.peak ?? 0;
  const fatigue = state?.condition?.fatigue ?? 0;
  const level = Math.max(1, Math.floor((state?.xp?.overall || 0) / 25) + 1);
  const luck = 0.85 + (Number(roll) || 0) * 0.3;
  const player = (endurance * 0.35 + peak * 0.55 - fatigue * 0.08) * luck;
  const rival = STREET_RACE.base + Math.max(0, level - 1) * STREET_RACE.levelScale;
  return { player, rival, win: player >= rival };
}
