/**
 * weather.js
 * Daily weather for runs, the HUD, and the cafe / TV forecast.
 *
 * Each morning (applySleep) rolls today's weather and peeks at tomorrow.
 * Clear is the common day. Heat, storm, ice, and high wind are rarer and
 * raise injury chance on runs (see injuries.js). Ice is rarer still in
 * cold season (calendar day modulo a long cycle stands in for seasons).
 *
 * Why named weights: CJ can retune frequencies without reading sleep code.
 * An old brick-city-save-v1 has no weather fields; Resume fills clear /
 * clear so nothing breaks.
 */

/** Ids shown in the HUD and morning message. */
export const WEATHER_CLEAR = "clear";
export const WEATHER_HEAT = "heat";
export const WEATHER_STORM = "storm";
export const WEATHER_ICE = "ice";
export const WEATHER_WIND = "wind";

export const WEATHER_LABELS = {
  clear: "Clear",
  heat: "Heat wave",
  storm: "Storm",
  ice: "Ice",
  wind: "High wind",
};

/**
 * Relative weights for a normal day. Clear dominates (~70%).
 * Heat / storm / wind share most of the rest. Ice is rare outside
 * cold season (see coldSeason).
 */
export const WEATHER_WEIGHTS = {
  clear: 70,
  heat: 10,
  storm: 8,
  wind: 9,
  ice: 3,
};

/** Cold-season ice weight bump. Days 1–20 of each 60-day cycle. */
export const COLD_SEASON_CYCLE = 60;
export const COLD_SEASON_LENGTH = 20;
export const COLD_SEASON_ICE_WEIGHT = 12;

/** How much each weather adds to run injury chance (0–1 scale add). */
export const WEATHER_INJURY_CHANCE = {
  clear: 0,
  heat: 0.04,
  storm: 0.05,
  ice: 0.07,
  wind: 0.03,
};

export function coldSeason(day) {
  const d = typeof day === "number" && Number.isFinite(day) ? Math.max(1, Math.floor(day)) : 1;
  const into = ((d - 1) % COLD_SEASON_CYCLE) + 1;
  return into <= COLD_SEASON_LENGTH;
}

function weightsForDay(day) {
  const weights = { ...WEATHER_WEIGHTS };
  if (coldSeason(day)) weights.ice = COLD_SEASON_ICE_WEIGHT;
  return weights;
}

/**
 * Pick a weather id from a 0..1 roll. Pure so tests can force outcomes.
 */
export function pickWeather(day, roll = 0.5) {
  const weights = weightsForDay(day);
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let cursor = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const [id, weight] of entries) {
    cursor -= weight;
    if (cursor < 0) return id;
  }
  return WEATHER_CLEAR;
}

export function weatherLabel(id) {
  return WEATHER_LABELS[id] || WEATHER_LABELS.clear;
}

export function weatherInjuryBonus(id) {
  return WEATHER_INJURY_CHANCE[id] || 0;
}

export function todaysWeather(state) {
  const id = state?.weather?.today;
  if (id && WEATHER_LABELS[id]) return id;
  return WEATHER_CLEAR;
}

export function tomorrowsWeather(state) {
  const id = state?.weather?.tomorrow;
  if (id && WEATHER_LABELS[id]) return id;
  return WEATHER_CLEAR;
}

export function weatherHudLine(state) {
  return `Weather: ${weatherLabel(todaysWeather(state))}`;
}

export function forecastLines(state) {
  return [
    `Today: ${weatherLabel(todaysWeather(state))}.`,
    `Tomorrow: ${weatherLabel(tomorrowsWeather(state))}.`,
  ];
}

/**
 * Advance weather on sleep. Tomorrow becomes today; a new tomorrow rolls.
 * Mutates the cloned save the caller already owns.
 */
export function advanceWeather(state, rng = Math.random) {
  const day = typeof state?.calendar?.day === "number" ? state.calendar.day : 1;
  const today = state?.weather?.tomorrow && WEATHER_LABELS[state.weather.tomorrow]
    ? state.weather.tomorrow
    : pickWeather(day, rng());
  const tomorrow = pickWeather(day + 1, rng());
  state.weather = { today, tomorrow };
  return { today, tomorrow };
}

/**
 * Fill missing weather on load. Version stays 1.
 * Missing means clear today and clear tomorrow (safe default).
 */
export function normalizeWeather(data) {
  if (!data.weather || typeof data.weather !== "object" || Array.isArray(data.weather)) {
    data.weather = { today: WEATHER_CLEAR, tomorrow: WEATHER_CLEAR };
    return data;
  }
  if (!WEATHER_LABELS[data.weather.today]) data.weather.today = WEATHER_CLEAR;
  if (!WEATHER_LABELS[data.weather.tomorrow]) data.weather.tomorrow = WEATHER_CLEAR;
  return data;
}
