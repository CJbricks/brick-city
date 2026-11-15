/**
 * cafe.js
 * The coffee shop menu, and what Race IQ does in a race.
 *
 * Every town has the same three buttons: a cup, a pastry, and an hour
 * of Wi-Fi. The prices and the pastry name change with the town. Those
 * records live on each city in constants.js. This file turns a save
 * into the numbers the buttons need.
 *
 * A cup is not a time slot. It gives one energy block and a pace note
 * for the next run or race only. Two cups help. A third still wakes you
 * up, but the note becomes "jittery" (a small pace penalty) instead of
 * a bump. Sleep throws the cup count and the leftover note away. Caffeine
 * does not keep overnight, and the morning starts at zero cups.
 *
 * Wi-Fi is the opposite trade. It spends one step of the day and no
 * energy. It raises Race IQ. The first hour teaches the most. Later
 * hours teach less, and only one hour a day counts. Race IQ is not an
 * attribute level. It does not fall when you rest. It only matters when
 * you race: a little less chance of a maybe-bonk, a small capped bump
 * on the finish score, and a course sentence once you have studied enough.
 * A sure bonk (empty and underslept) is not a chance, so studying does
 * not erase it.
 */

import {
  BONK_CHANCE,
  CITIES,
  COFFEE_CUPS_BEFORE_JITTER,
  COFFEE_FATIGUE_SWING,
  COFFEE_JITTER_PACE,
  COFFEE_PACE_BUMP,
  PASTRY_NUTRITION,
  RACE_IQ_BONK_CAP,
  RACE_IQ_BONK_PER,
  RACE_IQ_HINT_FIRST,
  RACE_IQ_HINT_SECOND,
  RACE_IQ_HINT_THIRD,
  RACE_IQ_LIFT_CAP,
  RACE_IQ_PACE_CAP,
  RACE_IQ_PACE_PER,
  RACE_IQ_SCORE_CAP,
  RACE_IQ_SCORE_PER,
  WIFI_GAIN_FLOOR,
  WIFI_GAIN_SLOW,
  WIFI_GAIN_START,
  cafeRates,
} from "@/lib/constants";

export { cafeRates, PASTRY_NUTRITION };

export function cafeCityId(state) {
  const id = state?.city;
  if (id && CITIES[id]) return id;
  return "brick-city";
}

export function cafeFor(state) {
  return cafeRates(cafeCityId(state));
}

/**
 * Missing means zero. An old brick-city-save-v1 file has no Race IQ.
 * A broken number is the same as never having studied.
 */
export function readRaceIq(state) {
  const value = state?.raceIq;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function coffeeCount(state) {
  const value = state?.calendar?.coffeesToday;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function cafeIntro(shop) {
  const lines = [`${shop.name}. ${shop.blurb}`];
  if (shop.also) lines.push(`The case also has ${shop.also}.`);
  if (shop.joke) lines.push(shop.joke);
  return lines.join("\n");
}

export function pastryDetail(shop) {
  const extra = shop.also ? ` · also ${shop.also}` : "";
  return `${shop.pastryCost} coins · +${PASTRY_NUTRITION} FOOD · 0 energy${extra}`;
}

/** +pace on a helpful cup, −pace when jittery, 0 when the last cup is already used. */
export function coffeePaceMod(state) {
  if (state?.condition?.coffeeNext === "boost") return COFFEE_PACE_BUMP;
  if (state?.condition?.coffeeNext === "jitter") return COFFEE_JITTER_PACE;
  return 0;
}

/**
 * Training runs do not have a finish clock. The pace note still has to
 * change the run, so a helpful cup takes a little fatigue off and a
 * jittery cup adds the same amount back. Races use coffeePaceMod on the
 * score instead, and do not also swing fatigue.
 */
export function coffeeFatigueDelta(state) {
  if (state?.condition?.coffeeNext === "boost") return -COFFEE_FATIGUE_SWING;
  if (state?.condition?.coffeeNext === "jitter") return COFFEE_FATIGUE_SWING;
  return 0;
}

export function coffeeEffectLine(state) {
  if (state?.condition?.coffeeNext === "boost") {
    return "The coffee holds a smoother pace on this one. It is spent.";
  }
  if (state?.condition?.coffeeNext === "jitter") {
    return "The jitters nick the pace on this one. It is spent.";
  }
  return "";
}

export function clearCoffee(state) {
  if (state?.condition) state.condition.coffeeNext = null;
}

/**
 * The next cup is jittery once today's count is already at the limit.
 * The caller adds one after this check, so cups 0 and 1 are still boosts.
 */
export function nextCupJitters(state) {
  return coffeeCount(state) >= COFFEE_CUPS_BEFORE_JITTER;
}

/**
 * First hour is WIFI_GAIN_START. Each chunk of Race IQ you already have
 * (WIFI_GAIN_SLOW points) shrinks the next hour. The floor is 1, so a
 * long study habit still moves the number, just slowly.
 */
export function wifiGain(raceIq) {
  const iq = readRaceIq({ raceIq });
  const raw = Math.round(WIFI_GAIN_START / (1 + iq / WIFI_GAIN_SLOW));
  return Math.max(WIFI_GAIN_FLOOR, raw);
}

/**
 * Maybe-bonk line. Starts at BONK_CHANCE and steps down until the cap.
 * Pass this into judgeBonk as `chance`. Leave it off and the old 0.45
 * line is what the race uses.
 */
export function bonkThreshold(raceIq) {
  const iq = readRaceIq({ raceIq });
  const cut = Math.min(RACE_IQ_BONK_CAP, iq * RACE_IQ_BONK_PER);
  return BONK_CHANCE - cut;
}

/**
 * Points added to a finish score. The percent and the flat study bonus
 * share RACE_IQ_LIFT_CAP, so stacking both cannot exceed it. A negative
 * base does not get a percent (that would shrink the help). The flat
 * part still applies, and the cap still holds.
 */
export function raceIqLift(base, raceIq) {
  const iq = readRaceIq({ raceIq });
  if (iq <= 0) return 0;
  const fromPace = Math.max(0, base) * Math.min(RACE_IQ_PACE_CAP, iq * RACE_IQ_PACE_PER);
  const fromStudy = Math.min(RACE_IQ_SCORE_CAP, iq * RACE_IQ_SCORE_PER);
  return Math.min(RACE_IQ_LIFT_CAP, fromPace + fromStudy);
}

const HINTS = [
  {
    at: RACE_IQ_HINT_FIRST,
    line: "Course note: the 5K bends at the fountain. Save the kick for after Brick Street.",
  },
  {
    at: RACE_IQ_HINT_SECOND,
    line: "Course note: even splits. A hot first mile is how this course bonks people.",
  },
  {
    at: RACE_IQ_HINT_THIRD,
    line: "Course note: if halfway is fast, ease one breath. That gap is a walk or a finish.",
  },
];

/** The best note you have unlocked, or "" before the first threshold. */
export function courseHint(raceIq) {
  const iq = readRaceIq({ raceIq });
  let line = "";
  for (const hint of HINTS) {
    if (iq >= hint.at) line = hint.line;
  }
  return line;
}
