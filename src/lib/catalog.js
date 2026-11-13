/**
 * catalog.js
 * The shoe closet and the fuel-carry rack.
 *
 * Shoes decide which style of running you are good at. A belt or a vest
 * decides how much food you can carry. You wear one pair and, optionally,
 * one fuel item. Sponsors (src/lib/sponsors.js) discount this list. They
 * do not replace it.
 *
 * The house pairs `road`, `trail`, and `hybrid` stay in the catalog so a
 * save from before the brand shoes existed still names a real pair.
 * `resolveShoeId` is the alias table. New games can still buy those
 * house pairs. The starter trainers are not for sale.
 */

import {
  BELT_NUTRITION,
  MAX_NUTRITION,
  SHOE_REPLACE_RATIO,
  STARTER_REPLACE_COST,
  VEST_NUTRITION,
} from "@/lib/constants";

/**
 * Old saves wrote these ids. They still point at the house pairs below.
 * An id this map does not know, and that is not in SHOES, becomes starter
 * on load so a typo cannot crash the closet.
 */
export const LEGACY_SHOE_IDS = {
  road: "road",
  trail: "trail",
  hybrid: "hybrid",
};

const HOUSE = {
  starter: {
    id: "starter",
    name: "Brickside Trainers",
    brand: "Brickside",
    style: "basic",
    price: 0,
    maxMiles: 80,
    blurb: "The pair you showed up in. Honest, and they wear out.",
    mods: { road: 0, trail: 0, versatile: 0 },
  },
  road: {
    id: "road",
    name: "Tempo Daybreak",
    brand: "Tempo",
    style: "road",
    price: 80,
    maxMiles: 140,
    blurb: "House road racers. Quick on the track, slick in the mud.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.05, ultraFatigue: 3 },
  },
  trail: {
    id: "trail",
    name: "Peakline Lugger",
    brand: "Peakline",
    style: "trail",
    price: 90,
    maxMiles: 120,
    blurb: "House lugs for the dirt loop and the ridge.",
    mods: { road: -0.05, trail: 0.08, versatile: 0, climbing: 0.06 },
  },
  hybrid: {
    id: "hybrid",
    name: "Switchback Hybrid",
    brand: "Switchback",
    style: "versatile",
    price: 85,
    maxMiles: 130,
    blurb: "House road-to-trail. A little slow at the sharp end.",
    mods: { road: -0.03, trail: -0.03, versatile: 0.07 },
  },
};

/**
 * Brand shoes. Numbers are fractions of pace (0.08 means +8%).
 * climbing and speed add attribute points on matching sessions.
 * ultraFatigue is extra fatigue points on long ultras, not a percent.
 * shortRoad and steepTrail apply only in those situations, so a backyard
 * shoe is not punished on an easy jog or a flat park trail.
 */
const BRAND_SHOES = {
  "nike-acg": {
    id: "nike-acg",
    name: "Nike ACG Ultrafly",
    brand: "Nike",
    style: "trail",
    price: 150,
    maxMiles: 160,
    blurb: "Trail racer. Grippy on the ridge, heavy on the track.",
    mods: { road: -0.06, trail: 0.09, versatile: 0, climbing: 0.1 },
  },
  "norda-001": {
    id: "norda-001",
    name: "Norda 001",
    brand: "Norda",
    style: "trail",
    price: 210,
    maxMiles: 220,
    blurb: "Stiff trail shoe. The climb likes it. The oval does not.",
    mods: { road: -0.07, trail: 0.1, versatile: 0, climbing: 0.12 },
  },
  "speedland-gstam": {
    id: "speedland-gstam",
    name: "Speedland GS:TAM",
    brand: "Speedland",
    style: "trail",
    price: 190,
    maxMiles: 180,
    blurb: "A trail plate. Fast on dirt, clumsy on the track.",
    mods: { road: -0.05, trail: 0.09, versatile: 0, climbing: 0.11 },
  },
  "hoka-tecton": {
    id: "hoka-tecton",
    name: "Hoka Tecton X",
    brand: "Hoka",
    style: "trail",
    price: 160,
    maxMiles: 170,
    blurb: "Light trail racer. Still a trail shoe when the road starts.",
    mods: { road: -0.05, trail: 0.08, versatile: 0, climbing: 0.08 },
  },
  "mtc-t1": {
    id: "mtc-t1",
    name: "Mount to Coast T1",
    brand: "Mount to Coast",
    style: "trail",
    price: 170,
    maxMiles: 200,
    blurb: "Long-trail cushion. The ridge feels shorter. The track does not.",
    mods: { road: -0.04, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "adidas-agravic": {
    id: "adidas-agravic",
    name: "Adidas Terrex Agravic Speed Ultra",
    brand: "Adidas",
    style: "trail",
    price: 165,
    maxMiles: 180,
    blurb: "Terrex trail racer. Mud first, marathon pace second.",
    mods: { road: -0.06, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "salomon-ultra": {
    id: "salomon-ultra",
    name: "Salomon S/Lab Ultra Glide",
    brand: "Salomon",
    style: "trail",
    price: 185,
    maxMiles: 190,
    blurb: "Lab trail shoe. Climbs well. The road penalty is the bill.",
    mods: { road: -0.05, trail: 0.09, versatile: 0, climbing: 0.1 },
  },
  "satisfy-rocker": {
    id: "satisfy-rocker",
    name: "Satisfy TheROCKER",
    brand: "Satisfy",
    style: "trail",
    price: 200,
    maxMiles: 150,
    blurb: "A rockered trail shoe. Helpful on climbs, sloppy on the oval.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.07 },
  },
  "hoka-cielo": {
    id: "hoka-cielo",
    name: "Hoka Cielo X1",
    brand: "Hoka",
    style: "road",
    price: 220,
    maxMiles: 110,
    blurb: "Marathon racer. Springy on the road, fragile in the mud.",
    mods: { road: 0.1, trail: -0.07, versatile: 0, speed: 0.08, ultraFatigue: 5 },
  },
  "adidas-adios": {
    id: "adidas-adios",
    name: "Adidas Adizero Adios Pro",
    brand: "Adidas",
    style: "road",
    price: 200,
    maxMiles: 120,
    blurb: "Road marathon shoe. The rods like pavement, not roots.",
    mods: { road: 0.09, trail: -0.06, versatile: 0, speed: 0.08, ultraFatigue: 4 },
  },
  "nike-alphafly": {
    id: "nike-alphafly",
    name: "Nike Alphafly",
    brand: "Nike",
    style: "road",
    price: 240,
    maxMiles: 100,
    blurb: "The fast marathon pair. Long ultras collect a fatigue tax.",
    mods: { road: 0.1, trail: -0.08, versatile: 0, speed: 0.1, ultraFatigue: 6 },
  },
  "brooks-hyperion": {
    id: "brooks-hyperion",
    name: "Brooks Hyperion Elite",
    brand: "Brooks",
    style: "road",
    price: 180,
    maxMiles: 140,
    blurb: "Marathon racer. Honest speed, unhappy on a wet trail.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "norda-005": {
    id: "norda-005",
    name: "Norda 005",
    brand: "Norda",
    style: "versatile",
    price: 200,
    maxMiles: 240,
    blurb: "Backyard and road-ultra shoe. A bit dull in a short road race.",
    mods: { road: 0, trail: 0, versatile: 0.08, shortRoad: -0.04, steepTrail: -0.04 },
  },
  "speedland-glpdx": {
    id: "speedland-glpdx",
    name: "Speedland GL:PDX",
    brand: "Speedland",
    style: "versatile",
    price: 185,
    maxMiles: 220,
    blurb: "All-day shoe for yards and road ultras. Not a 5K spike.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.04 },
  },
  "mtc-r1": {
    id: "mtc-r1",
    name: "Mount to Coast R1",
    brand: "Mount to Coast",
    style: "versatile",
    price: 170,
    maxMiles: 230,
    blurb: "Road ultra cruiser. The steep ridge still wants lugs.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "adidas-hybrid": {
    id: "adidas-hybrid",
    name: "Adidas Terrex Ultra Hybrid",
    brand: "Adidas",
    style: "versatile",
    price: 160,
    maxMiles: 210,
    blurb: "Terrex hybrid for backyards. Short road races feel the weight.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "hoka-challenger": {
    id: "hoka-challenger",
    name: "Hoka Challenger",
    brand: "Hoka",
    style: "versatile",
    price: 150,
    maxMiles: 220,
    blurb: "Door-to-trail cushion. Fine for yards, soft on a steep climb.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
  "salomon-genesis": {
    id: "salomon-genesis",
    name: "Salomon Genesis",
    brand: "Salomon",
    style: "versatile",
    price: 165,
    maxMiles: 230,
    blurb: "A versatile trail-road shoe. The backyard likes it more than a 5K does.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.03 },
  },
};

export const SHOES = { ...HOUSE, ...BRAND_SHOES };

export const TRAIL_SHOE_IDS = [
  "nike-acg",
  "norda-001",
  "speedland-gstam",
  "hoka-tecton",
  "mtc-t1",
  "adidas-agravic",
  "salomon-ultra",
  "satisfy-rocker",
];

export const ROAD_SHOE_IDS = [
  "hoka-cielo",
  "adidas-adios",
  "nike-alphafly",
  "brooks-hyperion",
];

export const VERSATILE_SHOE_IDS = [
  "norda-005",
  "speedland-glpdx",
  "mtc-r1",
  "adidas-hybrid",
  "hoka-challenger",
  "salomon-genesis",
];

/**
 * Belts are light: +5 max nutrition, no pace penalty, any style.
 * Vests carry more and cost a little speed in a short road race only.
 * The bonus number comes from the kind, not from a per-item field, so a
 * new vest cannot accidentally ship as +7.
 */
export const CARRY = {
  "nathan-belt": {
    id: "nathan-belt",
    name: "Nathan Zipster Race Belt",
    brand: "Nathan",
    kind: "belt",
    price: 36,
    shortRoad: 0,
    blurb: "A light belt. +5 max nutrition. No speed penalty.",
  },
  "osprey-belt": {
    id: "osprey-belt",
    name: "Osprey Duro Solo Belt",
    brand: "Osprey",
    kind: "belt",
    price: 42,
    shortRoad: 0,
    blurb: "Soft flask belt. +5 max nutrition. Works on any course.",
  },
  "rei-belt": {
    id: "rei-belt",
    name: "REI Co-op Swiftland Belt",
    brand: "REI",
    kind: "belt",
    price: 32,
    shortRoad: 0,
    blurb: "The cheap belt. +5 max nutrition. No road penalty.",
  },
  "salomon-belt": {
    id: "salomon-belt",
    name: "Salomon Pulse Belt",
    brand: "Salomon",
    kind: "belt",
    price: 48,
    shortRoad: 0,
    blurb: "Snug race belt. +5 max nutrition. No speed penalty.",
  },
  "dera-b01": {
    id: "dera-b01",
    name: "Dera B01 Dial-Fit Trail Belt",
    brand: "Dera",
    kind: "belt",
    price: 54,
    shortRoad: 0,
    blurb: "Dial-fit trail belt. +5 max nutrition. Still no pace tax.",
  },
  "camelbak-vest": {
    id: "camelbak-vest",
    name: "CamelBak Chase Vest",
    brand: "CamelBak",
    kind: "vest",
    price: 84,
    shortRoad: -0.04,
    blurb: "Hydration vest. +10 max nutrition. −speed in short road races.",
  },
  "nathan-vest": {
    id: "nathan-vest",
    name: "Nathan Pinnacle 4L",
    brand: "Nathan",
    kind: "vest",
    price: 96,
    shortRoad: -0.03,
    blurb: "Race vest. +10 max nutrition. A small 5K penalty.",
  },
  "salomon-vest": {
    id: "salomon-vest",
    name: "Salomon Adv Skin 5",
    brand: "Salomon",
    kind: "vest",
    price: 110,
    shortRoad: -0.04,
    blurb: "The classic vest. +10 max nutrition. Short road races feel it.",
  },
  "naked-vest": {
    id: "naked-vest",
    name: "Naked Running Vest",
    brand: "Naked",
    kind: "vest",
    price: 120,
    shortRoad: -0.03,
    blurb: "Stretch vest. +10 max nutrition. Light, but not weightless.",
  },
  "rei-vest": {
    id: "rei-vest",
    name: "REI Co-op Flash 10 Vest",
    brand: "REI",
    kind: "vest",
    price: 78,
    shortRoad: -0.03,
    blurb: "House vest. +10 max nutrition. Small short-road penalty.",
  },
  "satisfy-vest": {
    id: "satisfy-vest",
    name: "Satisfy TechSilk Drift Vest",
    brand: "Satisfy",
    kind: "vest",
    price: 130,
    shortRoad: -0.05,
    blurb: "Silk vest. +10 max nutrition. The 5K notices the bottles.",
  },
};

export const BELT_IDS = [
  "nathan-belt",
  "osprey-belt",
  "rei-belt",
  "salomon-belt",
  "dera-b01",
];

export const VEST_IDS = [
  "camelbak-vest",
  "nathan-vest",
  "salomon-vest",
  "naked-vest",
  "rei-vest",
  "satisfy-vest",
];

export const STYLE_LABELS = {
  basic: "Trainer",
  trail: "Trail",
  road: "Marathon",
  versatile: "Backyard Ultra",
};

export function styleLabel(style) {
  return STYLE_LABELS[style] || "Trainer";
}

export function isKnownShoe(id) {
  return Boolean(id && SHOES[id]);
}

export function resolveShoeId(id) {
  if (isKnownShoe(id)) return id;
  const alias = LEGACY_SHOE_IDS[id];
  if (alias && isKnownShoe(alias)) return alias;
  return "starter";
}

export function shoeById(id) {
  return SHOES[resolveShoeId(id)];
}

export function isTrailShoe(id) {
  return shoeById(id).style === "trail";
}

export function shoesOfStyle(style) {
  return Object.values(SHOES).filter((shoe) => shoe.style === style);
}

export function carryById(id) {
  if (!id || !CARRY[id]) return null;
  return CARRY[id];
}

export function isKnownCarry(id) {
  return Boolean(carryById(id));
}

/** Kind is the source of truth. A belt is always +5 and a vest always +10. */
export function carryNutrition(item) {
  if (!item) return 0;
  if (item.kind === "vest") return VEST_NUTRITION;
  if (item.kind === "belt") return BELT_NUTRITION;
  return 0;
}

export function carryBonus(gear) {
  return carryNutrition(carryById(gear?.carry));
}

export function maxNutritionFromGear(gear) {
  return MAX_NUTRITION + carryBonus(gear);
}

export function shoeMiles(gear, id = gear?.equipped) {
  return gear?.miles?.[id] || 0;
}

export function shoeWear(gear, id = gear?.equipped) {
  const shoe = shoeById(id);
  const miles = shoeMiles(gear, id);
  const ratio = miles / shoe.maxMiles;
  if (ratio >= 1) return { label: "worn out", mod: -0.08, ratio };
  if (ratio >= 0.75) return { label: "worn", mod: -0.04, ratio };
  return { label: "fresh", mod: 0, ratio };
}

export function wearPercent(gear, id) {
  return Math.min(100, Math.round(shoeWear(gear, id).ratio * 100));
}

export function replaceCost(id) {
  const shoe = shoeById(id);
  if (shoe.price <= 0) return STARTER_REPLACE_COST;
  return Math.round(shoe.price * SHOE_REPLACE_RATIO);
}

/**
 * A save from v1 has shoes and nothing else. Fill the new pockets without
 * throwing away a pair the player already paid for. Unknown ids are
 * dropped, except the equipped pair, which falls back through the alias
 * table to starter if we truly do not know it.
 */
export function normalizeGear(gear) {
  const source = gear && typeof gear === "object" ? gear : {};
  const equipped = resolveShoeId(source.equipped);
  const owned = [];
  const rawOwned = Array.isArray(source.owned) ? source.owned : [];
  for (const id of rawOwned) {
    if (!isKnownShoe(id) && !LEGACY_SHOE_IDS[id]) continue;
    const resolved = resolveShoeId(id);
    if (!owned.includes(resolved)) owned.push(resolved);
  }
  if (!owned.includes("starter")) owned.unshift("starter");
  if (!owned.includes(equipped)) owned.push(equipped);

  const miles = {};
  if (source.miles && typeof source.miles === "object") {
    for (const [id, value] of Object.entries(source.miles)) {
      if (!isKnownShoe(id) && !LEGACY_SHOE_IDS[id]) continue;
      const resolved = resolveShoeId(id);
      const numeric = Number(value);
      miles[resolved] = Number.isFinite(numeric) ? numeric : 0;
    }
  }
  if (typeof miles[equipped] !== "number") miles[equipped] = 0;

  const carry = isKnownCarry(source.carry) ? source.carry : null;
  const ownedCarry = [];
  if (Array.isArray(source.ownedCarry)) {
    for (const id of source.ownedCarry) {
      if (isKnownCarry(id) && !ownedCarry.includes(id)) ownedCarry.push(id);
    }
  }
  if (carry && !ownedCarry.includes(carry)) ownedCarry.push(carry);

  return { equipped, owned, miles, carry, ownedCarry };
}

export function signedPercent(fraction) {
  const pct = Math.round(fraction * 100);
  if (pct === 0) return "0%";
  if (pct > 0) return `+${pct}%`;
  return `−${Math.abs(pct)}%`;
}

/** One line a menu can show under a shoe name. */
export function shoeTradeText(shoe) {
  const mods = shoe?.mods || {};
  const parts = [];
  if (mods.trail) parts.push(`${signedPercent(mods.trail)} trail`);
  if (mods.road) parts.push(`${signedPercent(mods.road)} road`);
  if (mods.versatile) parts.push(`${signedPercent(mods.versatile)} backyard`);
  if (mods.climbing) parts.push(`${signedPercent(mods.climbing)} climbing`);
  if (mods.speed) parts.push(`${signedPercent(mods.speed)} speed`);
  if (mods.shortRoad) parts.push(`${signedPercent(mods.shortRoad)} short road`);
  if (mods.steepTrail) parts.push(`${signedPercent(mods.steepTrail)} steep trail`);
  if (mods.ultraFatigue) parts.push(`+${mods.ultraFatigue} fatigue on long ultras`);
  return parts.join(" · ") || "No pace change";
}

export function carryTradeText(item) {
  if (!item) return "No belt or vest. Max nutrition 100.";
  const bonus = carryNutrition(item);
  // The name has to be in the line. "Belt" alone does not tell you which
  // one is on, and the race card is where you check that before the gun.
  if (item.kind === "belt") return `${item.name} · Belt · +${bonus} max nutrition · no speed penalty`;
  const pace = signedPercent(item.shortRoad || 0);
  return `${item.name} · Vest · +${bonus} max nutrition · ${pace} short road races`;
}
