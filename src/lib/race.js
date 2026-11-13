/**
 * race.js
 * Race readiness, gear, and the bonk / DNF rule.
 *
 * Fitness alone does not finish a race. The readiness screen compares your
 * Endurance meter and Peak meter with the mix that race wants, then checks
 * fuel and sleep. Low nutrition AND poor sleep is a sure bonk (DNF, no
 * prize). Only one of the two being low is a chance, and a Stride Fuel gel
 * removes that chance. A gel cannot save the sure thing.
 *
 * A 5K that only *chances* a bonk becomes a slow finish (you do cross the
 * line, for half credit). A 10K that chances a bonk is a DNF. The sure
 * bonk is a DNF at either distance. That matches the design note that a
 * short race can be "just slow" while an under-fueled, under-slept start
 * ends the race.
 */

import { SHOE_REPLACE_RATIO, STARTER_REPLACE_COST } from "@/lib/constants";
import { attributeLevel, levelFromXp } from "@/lib/xp";

export const SHOES = {
  starter: {
    id: "starter",
    name: "Brickside Trainers",
    price: 0,
    maxMiles: 80,
    blurb: "The pair you showed up in. Honest, and they wear out.",
  },
  road: {
    id: "road",
    name: "Tempo Daybreak",
    price: 80,
    maxMiles: 140,
    blurb: "Light road racers. Quick on the track, slick in the mud.",
  },
  trail: {
    id: "trail",
    name: "Peakline Lugger",
    price: 90,
    maxMiles: 120,
    blurb: "Grippy lugs for the dirt loop and the ridge.",
  },
  hybrid: {
    id: "hybrid",
    name: "Switchback Hybrid",
    price: 85,
    maxMiles: 130,
    blurb: "Road-to-trail. A little slow at the sharp end, stuck nowhere.",
  },
};

/**
 * Style bonus (+) or penalty (-) as a fraction of pace.
 * Worn-out shoes stack a flat penalty on top, in shoeWearMod.
 */
const SHOE_STYLE = {
  starter: { road: 0, trail: 0, versatile: 0 },
  road: { road: 0.08, trail: -0.05, versatile: 0 },
  trail: { road: -0.05, trail: 0.08, versatile: 0 },
  hybrid: { road: -0.03, trail: -0.03, versatile: 0.07 },
};

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

export function shoeById(id) {
  return SHOES[id] || SHOES.starter;
}

export function shoeMiles(gear, id = gear.equipped) {
  return gear.miles?.[id] || 0;
}

export function shoeWear(gear, id = gear.equipped) {
  const shoe = shoeById(id);
  const miles = shoeMiles(gear, id);
  const ratio = miles / shoe.maxMiles;
  if (ratio >= 1) return { label: "worn out", mod: -0.08, ratio };
  if (ratio >= 0.75) return { label: "worn", mod: -0.04, ratio };
  return { label: "fresh", mod: 0, ratio };
}

export function replaceCost(id) {
  const shoe = shoeById(id);
  if (shoe.price <= 0) return STARTER_REPLACE_COST;
  return Math.round(shoe.price * SHOE_REPLACE_RATIO);
}

/**
 * style is "road", "trail", or "versatile".
 * The fraction comes back as gearMod (0.08 means +8%).
 */
export function gearModForStyle(gear, style) {
  const shoe = shoeById(gear.equipped);
  const wear = shoeWear(gear);
  const row = SHOE_STYLE[shoe.id] || SHOE_STYLE.starter;
  const mod = (row[style] || 0) + wear.mod;
  return { mod, wear: wear.label, name: shoe.name, shoe };
}

export function gearLine(gear, style) {
  const info = gearModForStyle(gear, style);
  const pct = Math.round(info.mod * 100);
  if (pct === 0) return `${info.name} (${info.wear}): no pace change`;
  const signed = pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
  return `${info.name} (${info.wear}): ${signed} ${style} pace`;
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
  const gear = gearModForStyle(state.gear, race.style);
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
    gearText: gearLine(state.gear, race.style),
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
  const player =
    speed * 8 +
    mental * 2 +
    state.condition.peak * 0.35 +
    state.condition.endurance * 0.12 -
    state.condition.fatigue * 0.3 -
    blister +
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
