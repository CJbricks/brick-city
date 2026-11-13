/**
 * race.js
 * Race readiness, gear pace, and the bonk / DNF rule.
 *
 * Fitness alone does not finish a race. The readiness screen compares your
 * Endurance meter and Peak meter with the mix that race wants, then checks
 * fuel and sleep. Low nutrition AND poor sleep is a sure bonk (DNF, no
 * prize). Only one of the two being low is a chance. Eating a gel is a
 * choice the player makes after the warning, so a pocket gel can still
 * save the day.
 *
 * A 5K that only *chances* a bonk becomes a slow finish (you do cross the
 * line, for half credit). A 10K that chances a bonk is a DNF. The sure
 * bonk is a DNF at either distance. That matches the design note that a
 * short race can be "just slow" while an under-fueled, under-slept start
 * ends the race.
 *
 * Shoe stats live in catalog.js. This file turns them into a pace percent
 * for the race in front of you, then adds the sponsor and the vest.
 */

import { attributeLevel, levelFromXp } from "@/lib/xp";
import {
  carryById,
  carryTradeText,
  maxNutritionFromGear,
  shoeById,
  shoeTradeText,
  shoeWear,
  styleLabel,
} from "@/lib/catalog";
import { nutritionTuning, sponsorPace, sponsorSummaryLines } from "@/lib/sponsors";

export { shoeById, shoeMiles, shoeWear } from "@/lib/catalog";
export { SHOES, CARRY, replaceCost } from "@/lib/catalog";

export const RACES = {
  "5k": {
    id: "5k",
    name: "Brick City 5K",
    km: 5,
    miles: 3.1,
    slots: 1,
    style: "road",
    ideal: { endurance: 0.35, peak: 0.65 },
    idealLabel: "35% Endurance / 65% Peak",
    xp: { overall: 46, marathon: 30, versatile: 6 },
    attributes: { speed: 8, endurance: 4, mental: 2 },
    coins: 28,
    energy: 1,
    peak: 6,
    endurance: 2,
    fatigue: 16,
    nutrition: -14,
    dnfXp: { overall: 8, marathon: 4 },
    dnfFatigue: 14,
  },
  "10k": {
    id: "10k",
    name: "Community 10K",
    km: 10,
    miles: 6.2,
    slots: 2,
    style: "road",
    ideal: { endurance: 0.45, peak: 0.55 },
    idealLabel: "45% Endurance / 55% Peak",
    xp: { overall: 70, marathon: 48, ultra: 10, versatile: 8 },
    attributes: { speed: 8, endurance: 10, mental: 4 },
    coins: 46,
    energy: 2,
    peak: 5,
    endurance: 5,
    fatigue: 22,
    nutrition: -18,
    dnfXp: { overall: 12, marathon: 6 },
    dnfFatigue: 16,
  },
};

export const RIVAL = {
  id: "remy",
  name: "Remy Calder",
  title: "the track kicker",
  base: 26,
  slots: 1,
  energy: 1,
  miles: 1,
  winXp: { overall: 24, marathon: 14, versatile: 4 },
  winAttributes: { speed: 6, mental: 3 },
  loseXp: { overall: 8, marathon: 4 },
  loseAttributes: { speed: 2, mental: 1 },
  coins: 16,
  fatigue: 12,
  nutrition: -8,
  peak: 4,
};

/**
 * style is "road", "trail", or "versatile" — the thing you are about to do,
 * not the shoe's category. Worn-out shoes stack a flat penalty on top.
 * shortRoad and steepTrail stay off unless the caller says this effort is
 * one of those. An easy jog is not a 5K, and a park trail is not the ridge.
 */
export function gearModForStyle(gear, style, options = {}) {
  const shoe = shoeById(gear?.equipped);
  const wear = shoeWear(gear, shoe.id);
  const row = shoe.mods || {};
  let mod = (row[style] || 0) + wear.mod;
  if (options.shortRoad) mod += row.shortRoad || 0;
  if (options.steep) mod += row.steepTrail || 0;
  return { mod, wear: wear.label, name: shoe.name, shoe, wearMod: wear.mod };
}

/**
 * Shoes, plus the vest's short-road tax, plus the shoe sponsor.
 * gearModForStyle stays shoe-only so a test can still read the pair by itself.
 */
export function combinedMod(state, style, options = {}) {
  const gear = gearModForStyle(state.gear, style, options);
  let mod = gear.mod;
  const carry = carryById(state.gear?.carry);
  if (options.shortRoad && carry?.shortRoad) mod += carry.shortRoad;
  const deal = sponsorPace(state, style, options);
  mod += deal.mod;
  return { ...gear, mod, carry, sponsorMod: deal.mod, sponsorName: deal.name };
}

export function gearLine(gear, style, options) {
  const info = gearModForStyle(gear, style, options);
  const pct = Math.round(info.mod * 100);
  if (pct === 0) return `${info.name} (${info.wear}): no pace change`;
  const signed = pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
  return `${info.name} (${info.wear}): ${signed} ${style} pace`;
}

function signedPace(fraction) {
  const pct = Math.round(fraction * 100);
  if (pct === 0) return "no change";
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

/**
 * The block the readiness screen and the status sheet both print.
 * One number at the bottom is the sum, so a vest and a sponsor cannot
 * hide inside the shoe line.
 */
export function describeLoadout(state, style = "road", options = {}) {
  const shoe = shoeById(state.gear?.equipped);
  const wear = shoeWear(state.gear, shoe.id);
  const info = combinedMod(state, style, options);
  const max = maxNutritionFromGear(state.gear);
  const food = nutritionTuning(state);
  const lines = [
    `${shoe.name} · ${styleLabel(shoe.style)} · ${wear.label} · ${shoeTradeText(shoe)}`,
    carryTradeText(info.carry),
    `Nutrition ${state.condition?.nutrition ?? 0} / ${max}`,
    ...sponsorSummaryLines(state),
  ];
  if (food.name) {
    lines.push(`${food.name}: sleep floor ${food.floor}, drain −${food.drainCut}${food.raceFuel ? `, +${food.raceFuel} at the gun` : ""}`);
  }
  lines.push(`Combined ${styleLabel(style)} pace: ${signedPace(info.mod)}`);
  return { lines, mod: info.mod, max, shoe, wear };
}

export function fuelState(condition) {
  const lowFuel = condition.nutrition < 40;
  const poorSleep = condition.sleepQuality === "poor" || condition.fatigue >= 80;
  return { lowFuel, poorSleep };
}

/**
 * Copy for the readiness screen. Severe means both sides are bad.
 */
export function fuelWarning(condition) {
  const { lowFuel, poorSleep } = fuelState(condition);
  if (lowFuel && poorSleep) {
    return {
      severe: true,
      partial: false,
      text: "⚠ Low fuel + poor sleep: high DNF risk",
    };
  }
  if (lowFuel || poorSleep) {
    return {
      severe: false,
      partial: true,
      text: lowFuel
        ? "Nutrition is low. A bonk is possible. A gel would help."
        : "Sleep was poor. A bonk is possible. A gel would help.",
    };
  }
  return { severe: false, partial: false, text: "Fuel and sleep look steady." };
}

/**
 * roll is a number from 0 to 1. Tests pass it in so a bonk is reproducible.
 * The UI passes Math.random() once, when you confirm, and reuses that same
 * roll if you then choose to eat a gel or tough it out.
 *
 * This function only decides whether a bonk is coming. It does not eat a
 * gel. Eating one is a choice the player makes after this returns bonk,
 * in applyRace / applyRival, so a pocket gel can still save a sure DNF.
 */
export function judgeBonk({ nutrition, sleepQuality, fatigue, roll, km }) {
  const { lowFuel, poorSleep } = fuelState({ nutrition, sleepQuality, fatigue });
  if (lowFuel && poorSleep) {
    return { bonk: true, dnf: true, slowFinish: false, reason: "low-fuel-poor-sleep" };
  }
  if ((lowFuel || poorSleep) && roll < 0.45) {
    const dnf = km >= 8;
    return {
      bonk: true,
      dnf,
      slowFinish: !dnf,
      reason: "chance-bonk",
    };
  }
  return { bonk: false, dnf: false, slowFinish: false, reason: "ok" };
}

export function readiness(state, race) {
  const endurance = state.condition.endurance;
  const peak = state.condition.peak;
  const total = Math.max(1, endurance + peak);
  const endShare = endurance / total;
  const mismatch = Math.abs(endShare - race.ideal.endurance);
  const options = { shortRoad: (race.km || 0) <= 5.5 && race.style === "road" };
  const gear = combinedMod(state, race.style, options);
  const loadout = describeLoadout(state, race.style, options);
  const balance = endurance * race.ideal.endurance + peak * race.ideal.peak;
  const blister = state.condition.injury ? 4 : 0;
  const score =
    balance * (1 - mismatch * 0.5) * (1 + gear.mod) -
    state.condition.fatigue * 0.35 -
    blister;
  return {
    score,
    endShare,
    peakShare: 1 - endShare,
    mismatch,
    gearMod: gear.mod,
    gearText: gearLine(state.gear, race.style, options),
    loadout: loadout.lines,
    warning: fuelWarning(state.condition),
    idealLabel: race.idealLabel,
  };
}

/**
 * Remy scales a little as you level, so the first win doesn't end the rivalry.
 * Luck is the roll, centered on 0.5. A fresh runner should lose a fair roll.
 */
export function rivalScores(state, roll) {
  const speed = attributeLevel(state.attributes.speed);
  const mental = attributeLevel(state.attributes.mental);
  const blister = state.condition.injury ? 4 : 0;
  // The mile is a short road race, so a vest or a backyard shoe shows up
  // here. Starter shoes and an empty sponsor slot add zero, which keeps
  // a fresh runner's result the same as before the gear rack existed.
  const pace = combinedMod(state, "road", { shortRoad: true }).mod;
  const player =
    speed * 8 +
    mental * 2 +
    state.condition.peak * 0.35 +
    state.condition.endurance * 0.12 -
    state.condition.fatigue * 0.3 -
    blister +
    pace * 20 +
    (roll - 0.5) * 8;
  const rival = RIVAL.base + Math.max(0, levelFromXp(state.xp.overall) - 1) * 1.5;
  return { player, rival, win: player >= rival };
}

export function flavorTime(race, score, slow) {
  if (slow) return race.id === "5k" ? "31:40" : "1:18:00";
  if (score >= 55) return race.id === "5k" ? "21:10" : "45:30";
  if (score >= 40) return race.id === "5k" ? "23:55" : "51:20";
  if (score >= 28) return race.id === "5k" ? "26:40" : "57:10";
  return race.id === "5k" ? "29:05" : "1:04:00";
}
