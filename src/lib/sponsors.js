/**
 * sponsors.js
 * Shoe deals, nutrition deals, and gear deals.
 *
 * You can hold one shoe sponsor, one nutrition sponsor, and one gear
 * sponsor at the same time. Signing a second sponsor of the same kind
 * ends the first deal of that kind. It does not take shoes, belts, or
 * vests out of the closet. Nutrition deals stack with a belt or a vest:
 * they change the floor and the drain, not the max of 100 / 105 / 110.
 * A gear deal is the belt and the vest together. Nathan's deal discounts
 * both the Nathan belt and the Nathan vest. A brand that only sells a
 * vest (Naked, for example) still uses this same slot.
 *
 * Obligations are the cost of the deal. Accepting a shoe or nutrition
 * note spends an energy block and pays better than a Run Store shift.
 * A gear note is different: wear that brand's belt or vest in your next
 * race. Skipping drops standing. Standing under STANDING_DROP ends that
 * deal. The brand then waits COOLDOWN_LEAVE days before they will offer
 * again. You do not sign yourself from a list. offers.js is what lets a
 * brand ask, including the quiet days between offers. The rules here are
 * pure. activities.js is what writes them onto a save.
 */

/**
 * Offer timing and the caps on a scaled contract.
 * OFFER_DAYS is how long a note stays on the table.
 * COOLDOWN_PASS is the wait after a decline or an expiry.
 * COOLDOWN_LEAVE is the longer wait after you leave them, or they drop you.
 * Discount and race coins grow with level, then stop at the caps so a
 * high level is better without becoming a free store.
 */

import { CARRY, styleLabel, shoeById, carryById, replaceCost } from "@/lib/catalog";
import { levelFromXp } from "@/lib/xp";

export const STANDING_START = 80;
export const STANDING_ACCEPT = 12;
export const STANDING_SKIP = 22;
export const STANDING_WARN = 45;
export const STANDING_DROP = 25;

export const OFFER_DAYS = 3;
export const COOLDOWN_PASS = 7;
export const COOLDOWN_LEAVE = 14;
export const DISCOUNT_STEP = 0.02;
export const DISCOUNT_CAP = 0.55;
export const RACE_COIN_STEP = 2;
export const RACE_COIN_CAP = 36;
export const POACH_DISCOUNT = 0.05;
export const POACH_COINS = 4;

function roadGates(levelNeeded) {
  return [
    {
      label: `Reach level ${levelNeeded}`,
      met: (state, level) => level >= levelNeeded,
      have: (state, level) => `Lv ${level}`,
    },
    {
      label: "Finish the 5K or the 10K",
      met: (state) => Boolean(state.progress.fiveKFinished || state.progress.tenKFinished),
      have: (state) => {
        if (state.progress.tenKFinished) return "10K done";
        if (state.progress.fiveKFinished) return "5K done";
        return "no road race yet";
      },
    },
  ];
}

function dirtGates(levelNeeded) {
  return [
    {
      label: `Reach level ${levelNeeded}`,
      met: (state, level) => level >= levelNeeded,
      have: (state, level) => `Lv ${level}`,
    },
    {
      // A park trail, a ridge session, or a practice yard. Big brands do
      // not use this gate. Boutique brands do, because that is the work
      // they showed up to see.
      label: "Finish a trail run or a backyard yard",
      met: (state) => {
        const trails = (state.progress.parkTrailRuns || 0) + (state.progress.mountainRuns || 0);
        return trails >= 1 || (state.progress.yards || 0) >= 1;
      },
      have: (state) => `${state.progress.parkTrailRuns || 0} trail · ${state.progress.yards || 0} yards`,
    },
  ];
}

const SHOE_DEAL_LIST = [
  {
    id: "nike",
    name: "Nike",
    brands: ["Nike"],
    styles: ["road", "trail"],
    shoes: ["Nike Alphafly", "Nike ACG Ultrafly"],
    discount: 0.35,
    boost: 0.05,
    penalty: -0.03,
    shortRoad: 0,
    raceCoins: 10,
    // The biggest road brand. Level 5 is 220 overall XP, a few races
    // past the first 5K, so Nike is early but not the first handshake.
    minLevel: 5,
    gates: roadGates(5),
  },
  {
    id: "adidas",
    name: "Adidas",
    brands: ["Adidas"],
    styles: ["road", "trail", "versatile"],
    shoes: ["Adidas Adizero Adios Pro", "Adidas Terrex Agravic Speed Ultra", "Adidas Terrex Ultra Hybrid"],
    discount: 0.25,
    boost: 0.04,
    penalty: 0,
    shortRoad: -0.02,
    raceCoins: 8,
    minLevel: 4,
    gates: roadGates(4),
  },
  {
    id: "hoka",
    name: "Hoka",
    brands: ["Hoka"],
    styles: ["road", "trail", "versatile"],
    shoes: ["Hoka Cielo X1", "Hoka Tecton X", "Hoka Challenger"],
    discount: 0.25,
    boost: 0.04,
    penalty: 0,
    shortRoad: -0.02,
    raceCoins: 8,
    // Level 3 is 70 overall XP. One 5K is 46, so Hoka shows up once a
    // second race or a bit of training has you at level 3 with a finish.
    minLevel: 3,
    gates: roadGates(3),
  },
  {
    id: "brooks",
    name: "Brooks",
    brands: ["Brooks"],
    styles: ["road"],
    shoes: ["Brooks Hyperion Elite"],
    discount: 0.4,
    boost: 0.08,
    penalty: -0.05,
    shortRoad: 0,
    raceCoins: 8,
    minLevel: 3,
    gates: roadGates(3),
  },
  {
    id: "norda",
    name: "Norda",
    brands: ["Norda"],
    styles: ["trail", "versatile"],
    shoes: ["Norda 001", "Norda 005"],
    discount: 0.3,
    boost: 0.06,
    penalty: -0.04,
    shortRoad: 0,
    raceCoins: 12,
    // Level 6 is 325 overall XP, well past the 10K. Boutique brands wait
    // for that plus a trail or a yard, which is when those results exist.
    minLevel: 6,
    gates: dirtGates(6),
  },
  {
    id: "speedland",
    name: "Speedland",
    brands: ["Speedland"],
    styles: ["trail", "versatile"],
    shoes: ["Speedland GS:TAM", "Speedland GL:PDX"],
    discount: 0.3,
    boost: 0.06,
    penalty: -0.04,
    shortRoad: 0,
    raceCoins: 12,
    minLevel: 6,
    gates: dirtGates(6),
  },
  {
    id: "mount-to-coast",
    name: "Mount to Coast",
    brands: ["Mount to Coast"],
    styles: ["trail", "versatile"],
    shoes: ["Mount to Coast T1", "Mount to Coast R1"],
    discount: 0.3,
    boost: 0.06,
    penalty: -0.03,
    shortRoad: 0,
    raceCoins: 12,
    minLevel: 7,
    gates: dirtGates(7),
  },
  {
    id: "salomon",
    name: "Salomon",
    brands: ["Salomon"],
    styles: ["trail", "versatile"],
    shoes: ["Salomon S/Lab Ultra Glide", "Salomon Genesis"],
    discount: 0.3,
    boost: 0.06,
    penalty: -0.04,
    shortRoad: 0,
    raceCoins: 12,
    minLevel: 7,
    gates: dirtGates(7),
  },
  {
    id: "satisfy",
    name: "Satisfy",
    brands: ["Satisfy"],
    styles: ["trail"],
    shoes: ["Satisfy TheROCKER"],
    discount: 0.35,
    boost: 0.07,
    penalty: -0.04,
    shortRoad: 0,
    raceCoins: 10,
    minLevel: 8,
    gates: dirtGates(8),
  },
];

const NUTRITION_DEAL_LIST = [
  {
    id: "bpn",
    name: "BPN",
    sleepFloor: 46,
    drainCut: 1,
    gelDiscount: 0.25,
    raceFuel: 0,
    gelBonus: 0,
    minLevel: 4,
    gates: roadGates(4),
  },
  {
    id: "honey-stinger",
    name: "Honey Stinger",
    sleepFloor: 42,
    drainCut: 1,
    gelDiscount: 0.35,
    raceFuel: 6,
    gelBonus: 2,
    minLevel: 3,
    gates: roadGates(3),
  },
  {
    id: "maurten",
    name: "Maurten",
    sleepFloor: 52,
    drainCut: 2,
    gelDiscount: 0.1,
    raceFuel: 8,
    gelBonus: 4,
    minLevel: 6,
    gates: dirtGates(6),
  },
  {
    id: "precision",
    name: "Precision",
    sleepFloor: 44,
    drainCut: 1,
    gelDiscount: 0.2,
    raceFuel: 4,
    gelBonus: 6,
    minLevel: 7,
    gates: dirtGates(7),
  },
];

/**
 * The free item on signing is the belt when this brand sells one.
 * CamelBak, Naked, and Satisfy only sell a vest, so the vest is the
 * gift. Nathan, REI, and Salomon sell both, and the belt is what you
 * put on. The discount still applies to the other piece.
 */
export function starterCarryId(brand) {
  const items = Object.values(CARRY).filter((item) => item.brand === brand);
  const belt = items.find((item) => item.kind === "belt");
  const vest = items.find((item) => item.kind === "vest");
  return (belt || vest)?.id || null;
}

/**
 * One gear sponsor covers that brand's belt and vest. The id is not
 * always the shoe id: Salomon and Satisfy already have shoe deals, and
 * standing and cooldowns are stored by id. Sharing "salomon" would make
 * a shoe cooldown block the belt deal.
 * Naked is a brand name, same as Nathan or Osprey.
 */
const GEAR_DEAL_LIST = [
  {
    id: "nathan",
    name: "Nathan",
    brands: ["Nathan"],
    starter: starterCarryId("Nathan"),
    discount: 0.25,
    raceCoins: 4,
    minLevel: 3,
    gates: roadGates(3),
  },
  {
    id: "rei",
    name: "REI",
    brands: ["REI"],
    starter: starterCarryId("REI"),
    discount: 0.3,
    raceCoins: 4,
    minLevel: 3,
    gates: roadGates(3),
  },
  {
    id: "osprey",
    name: "Osprey",
    brands: ["Osprey"],
    starter: starterCarryId("Osprey"),
    discount: 0.28,
    raceCoins: 5,
    minLevel: 4,
    gates: roadGates(4),
  },
  {
    id: "camelbak",
    name: "CamelBak",
    brands: ["CamelBak"],
    starter: starterCarryId("CamelBak"),
    discount: 0.25,
    raceCoins: 6,
    minLevel: 5,
    gates: dirtGates(5),
  },
  {
    id: "dera",
    name: "Dera",
    brands: ["Dera"],
    starter: starterCarryId("Dera"),
    discount: 0.3,
    raceCoins: 6,
    minLevel: 6,
    gates: dirtGates(6),
  },
  {
    id: "salomon-gear",
    name: "Salomon",
    brands: ["Salomon"],
    starter: starterCarryId("Salomon"),
    discount: 0.28,
    raceCoins: 6,
    minLevel: 6,
    gates: dirtGates(6),
  },
  {
    id: "naked",
    name: "Naked",
    brands: ["Naked"],
    starter: starterCarryId("Naked"),
    discount: 0.3,
    raceCoins: 6,
    minLevel: 7,
    gates: dirtGates(7),
  },
  {
    id: "satisfy-gear",
    name: "Satisfy",
    brands: ["Satisfy"],
    starter: starterCarryId("Satisfy"),
    discount: 0.32,
    raceCoins: 5,
    minLevel: 8,
    gates: dirtGates(8),
  },
];

function indexById(list) {
  const table = {};
  for (const entry of list) table[entry.id] = entry;
  return table;
}

export const SHOE_SPONSORS = indexById(SHOE_DEAL_LIST);
export const NUTRITION_SPONSORS = indexById(NUTRITION_DEAL_LIST);
export const GEAR_SPONSORS = indexById(GEAR_DEAL_LIST);
export const SHOE_SPONSOR_IDS = SHOE_DEAL_LIST.map((entry) => entry.id);
export const NUTRITION_SPONSOR_IDS = NUTRITION_DEAL_LIST.map((entry) => entry.id);
export const GEAR_SPONSOR_IDS = GEAR_DEAL_LIST.map((entry) => entry.id);

export const OBLIGATIONS = [
  { id: "photo", label: "Photo shoot", pay: 46 },
  { id: "store", label: "Store appearance", pay: 52 },
  { id: "expo", label: "Expo booth", pay: 48 },
  { id: "community", label: "Community run", pay: 44 },
];

// Gear does not use the photo-shoot list. The cost of that deal is
// showing up to the next race in their belt or vest. Pay is still
// better than a Run Store shift, and it is smaller than a shoe
// appearance because the race was already the day's effort.
export const GEAR_OBLIGATION = {
  id: "wear",
  label: "Wear their belt or vest in your next race",
  pay: 40,
};

export function emptySponsors() {
  return {
    shoe: null,
    nutrition: null,
    gear: null,
    standing: {},
    obligation: null,
    // The first morning after a deal is signed always brings one note,
    // so the player meets the loop before the every-fourth-day cadence.
    seenObligation: false,
    // offers: the note on the table. mailbox: a letter that arrives
    // tomorrow morning. cooldowns: the day a brand may ask again.
    // shoeTerms and gearTerms are the contracts you actually signed.
    // Null means "use the catalog numbers", which is how an old save
    // keeps a shoe deal and how a save from before gear existed loads
    // with no gear deal at all.
    offers: { shoe: null, nutrition: null, gear: null },
    cooldowns: {},
    mailbox: [],
    shoeTerms: null,
    gearTerms: null,
    // Day the last new offer was created, any category. Null means
    // there has not been one. An old save has no memory of it, and
    // offers.js treats null as "the gap is already open".
    lastOfferDay: null,
  };
}

export function runnerLevelOf(state) {
  return levelFromXp(state?.xp?.overall || 0);
}

export function activeShoeSponsor(state) {
  return SHOE_SPONSORS[state?.sponsors?.shoe] || null;
}

export function activeNutritionSponsor(state) {
  return NUTRITION_SPONSORS[state?.sponsors?.nutrition] || null;
}

export function activeGearSponsor(state) {
  return GEAR_SPONSORS[state?.sponsors?.gear] || null;
}

export function sponsorById(kind, id) {
  if (kind === "nutrition") return NUTRITION_SPONSORS[id] || null;
  if (kind === "gear") return GEAR_SPONSORS[id] || null;
  return SHOE_SPONSORS[id] || null;
}

export function gateStatus(state, sponsor) {
  const level = runnerLevelOf(state);
  const needs = (sponsor.gates || []).map((gate) => ({
    label: gate.label,
    ok: Boolean(gate.met(state, level)),
    have: gate.have(state, level),
  }));
  return { open: needs.every((need) => need.ok), needs, level };
}

export function shoePerkText(sponsor, terms) {
  const covered = sponsor.styles.map((style) => styleLabel(style)).join(" + ");
  const boost = Math.round(sponsor.boost * 100);
  let trade = "";
  if (sponsor.penalty) {
    trade = ` −${Math.round(Math.abs(sponsor.penalty) * 100)}% on other styles.`;
  } else if (sponsor.shortRoad) {
    trade = ` −${Math.round(Math.abs(sponsor.shortRoad) * 100)}% in short road races.`;
  }
  // terms is the signed or offered contract. Without it, the catalog
  // numbers are the deal you would get at the brand's minimum level.
  const discount = typeof terms?.discount === "number" ? terms.discount : sponsor.discount;
  const raceCoins = typeof terms?.raceCoins === "number" ? terms.raceCoins : sponsor.raceCoins;
  const off = Math.round(discount * 100);
  return `+${boost}% ${covered}.${trade} ${off}% off ${sponsor.brands.join("/")} gear. +${raceCoins} coins on a clean finish. Worn-out matching shoes are free to replace.`;
}

export function nutritionPerkText(sponsor) {
  const parts = [
    `sleep floor ${sponsor.sleepFloor}`,
    `drain −${sponsor.drainCut}`,
  ];
  if (sponsor.gelDiscount) parts.push(`gels ${Math.round(sponsor.gelDiscount * 100)}% off`);
  if (sponsor.raceFuel) parts.push(`+${sponsor.raceFuel} nutrition on race morning`);
  if (sponsor.gelBonus) parts.push(`gels fill +${sponsor.gelBonus} extra`);
  return parts.join(" · ");
}

/** "Nathan belts and vests", or "Naked vests" when that brand has no belt. */
export function gearCoverPhrase(sponsor) {
  const brand = sponsor?.brands?.[0];
  const items = Object.values(CARRY).filter((item) => item.brand === brand);
  const hasBelt = items.some((item) => item.kind === "belt");
  const hasVest = items.some((item) => item.kind === "vest");
  const name = sponsor?.name || brand || "their";
  if (hasBelt && hasVest) return `${name} belts and vests`;
  if (hasVest) return `${name} vests`;
  return `${name} belts`;
}

export function gearPerkText(sponsor, terms) {
  const discount = typeof terms?.discount === "number" ? terms.discount : sponsor.discount;
  const raceCoins = typeof terms?.raceCoins === "number" ? terms.raceCoins : sponsor.raceCoins;
  const off = Math.round(discount * 100);
  const gift = carryById(sponsor.starter);
  const free = gift ? ` Includes a ${gift.name} when you sign.` : "";
  return `${off}% off ${gearCoverPhrase(sponsor)}. +${raceCoins} coins on a clean finish.${free} Obligation: ${GEAR_OBLIGATION.label.toLowerCase()}.`;
}

export function standingOf(state, id) {
  const value = state?.sponsors?.standing?.[id];
  return typeof value === "number" ? value : STANDING_START;
}

export function clampStanding(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Covered styles get the boost. Everything else gets the penalty.
 * shortRoad is an extra tax for the all-style deals, and only on a short
 * road race, so Hoka is not a free upgrade at the 5K.
 */
/**
 * The contract on the save wins over the catalog. An old save has a
 * sponsor and no shoeTerms, so the catalog discount and race coins
 * stay in force and the deal is not rewritten.
 */
function withStoredTerms(deal, stored) {
  if (!deal) return null;
  return {
    ...deal,
    discount: typeof stored?.discount === "number" ? stored.discount : deal.discount,
    raceCoins: typeof stored?.raceCoins === "number" ? stored.raceCoins : deal.raceCoins,
  };
}

export function shoeDealNumbers(state) {
  return withStoredTerms(activeShoeSponsor(state), state?.sponsors?.shoeTerms);
}

export function gearDealNumbers(state) {
  return withStoredTerms(activeGearSponsor(state), state?.sponsors?.gearTerms);
}

export function sponsorPace(state, style, options = {}) {
  const deal = activeShoeSponsor(state);
  if (!deal) return { mod: 0, name: null, deal: null };
  let mod = deal.styles.includes(style) ? deal.boost : deal.penalty;
  if (options.shortRoad && deal.shortRoad) mod += deal.shortRoad;
  return { mod, name: deal.name, deal };
}

/** Specialty XP uses the style boost or penalty, not the short-road extra. */
export function sponsorXpFactor(state, style) {
  return 1 + sponsorPace(state, style).mod;
}

export function brandDiscount(deal, brand) {
  if (!deal || !brand) return 0;
  return deal.brands.includes(brand) ? deal.discount : 0;
}

export function pricedShoe(state, shoeId, owned, wornOut) {
  const shoe = shoeById(shoeId);
  const base = owned ? replaceCost(shoeId) : shoe.price;
  const deal = shoeDealNumbers(state);
  if (!brandDiscount(deal, shoe.brand)) {
    return { cost: base, base, deal: false, free: false };
  }
  // A worn-out pair from your sponsor is the free replacement. A fresh
  // pair is only discounted, or a sponsor would hand you infinite shoes.
  if (owned && wornOut) return { cost: 0, base, deal: true, free: true };
  return {
    cost: Math.round(base * (1 - deal.discount)),
    base,
    deal: true,
    free: false,
  };
}

/**
 * A shoe deal still discounts that brand's belt or vest. A gear deal
 * discounts the same rack. If both name the brand (Salomon shoes and
 * the Salomon gear deal), use the better of the two. Adding the
 * percents would step past the cap on either contract.
 */
export function carryDiscount(state, brand) {
  return Math.max(
    brandDiscount(shoeDealNumbers(state), brand),
    brandDiscount(gearDealNumbers(state), brand),
  );
}

export function pricedCarry(state, carryId) {
  const item = carryById(carryId);
  if (!item) return { cost: 0, base: 0, deal: false };
  const discount = carryDiscount(state, item.brand);
  if (!discount) return { cost: item.price, base: item.price, deal: false };
  return {
    cost: Math.round(item.price * (1 - discount)),
    base: item.price,
    deal: true,
  };
}

/**
 * The worn belt or vest, when it belongs to the active gear sponsor.
 * Used to tint that item and to settle the wear note. A different
 * brand's belt does not count, and no item means no tint.
 */
export function sponsoredCarry(state) {
  const deal = activeGearSponsor(state);
  const item = carryById(state?.gear?.carry);
  if (!deal || !item) return null;
  if (!deal.brands.includes(item.brand)) return null;
  return { id: deal.id, kind: item.kind, item };
}

export function pricedGel(state, baseCost) {
  const deal = activeNutritionSponsor(state);
  if (!deal?.gelDiscount) return { cost: baseCost, discount: 0, name: null };
  return {
    cost: Math.max(1, Math.round(baseCost * (1 - deal.gelDiscount))),
    discount: deal.gelDiscount,
    name: deal.name,
  };
}

export function nutritionTuning(state) {
  const deal = activeNutritionSponsor(state);
  return {
    floor: deal?.sleepFloor || 0,
    drainCut: deal?.drainCut || 0,
    raceFuel: deal?.raceFuel || 0,
    gelBonus: deal?.gelBonus || 0,
    name: deal?.name || null,
  };
}

export function activeDeals(state) {
  const deals = [];
  if (state?.sponsors?.shoe && SHOE_SPONSORS[state.sponsors.shoe]) {
    deals.push({ id: state.sponsors.shoe, kind: "shoe", name: SHOE_SPONSORS[state.sponsors.shoe].name });
  }
  if (state?.sponsors?.nutrition && NUTRITION_SPONSORS[state.sponsors.nutrition]) {
    deals.push({
      id: state.sponsors.nutrition,
      kind: "nutrition",
      name: NUTRITION_SPONSORS[state.sponsors.nutrition].name,
    });
  }
  if (state?.sponsors?.gear && GEAR_SPONSORS[state.sponsors.gear]) {
    deals.push({
      id: state.sponsors.gear,
      kind: "gear",
      name: GEAR_SPONSORS[state.sponsors.gear].name,
    });
  }
  return deals;
}

/**
 * Returns the next note, or null if today is not a sponsor day.
 * Does not write the save. The first note ignores the calendar so a new
 * deal is visible the next morning. After that, every 4th day.
 */
export function planObligation(state) {
  if (state?.sponsors?.obligation) return null;
  const deals = activeDeals(state);
  if (deals.length === 0) return null;
  const day = state.calendar?.day || 1;
  const seen = Boolean(state.sponsors?.seenObligation);
  if (seen && day % 4 !== 0) return null;
  const pick = deals[day % deals.length];
  // Shoe and nutrition notes are appearances. A gear note is the race
  // itself: wear their belt or vest. It still uses the same calendar,
  // so the morning after you sign is the first one.
  const task = pick.kind === "gear" ? GEAR_OBLIGATION : OBLIGATIONS[day % OBLIGATIONS.length];
  return {
    id: `${pick.id}-${task.id}-${day}`,
    sponsorId: pick.id,
    kind: pick.kind,
    task: task.id,
    label: task.label,
    pay: task.pay,
  };
}

export function obligationStillValid(sponsors, obligation) {
  if (!obligation || typeof obligation !== "object") return false;
  if (obligation.kind === "nutrition") return sponsors.nutrition === obligation.sponsorId;
  if (obligation.kind === "gear") return sponsors.gear === obligation.sponsorId;
  if (obligation.kind === "shoe") return sponsors.shoe === obligation.sponsorId;
  return false;
}

function knownBrand(id) {
  return Boolean(SHOE_SPONSORS[id] || NUTRITION_SPONSORS[id] || GEAR_SPONSORS[id]);
}

function normalizeOffer(raw, kind) {
  if (!raw || typeof raw !== "object") return null;
  const sponsor = sponsorById(kind, raw.id);
  if (!sponsor) return null;
  const expiresOn = Number(raw.expiresOn);
  if (!Number.isFinite(expiresOn)) return null;
  const offeredOn = Number(raw.offeredOn);
  const discount = Number(raw.discount);
  const raceCoins = Number(raw.raceCoins);
  // Nutrition offers do not carry a discount or race-coin term.
  // Shoe and gear offers do. A missing number falls back to the
  // catalog so a half-written note still has a contract.
  const priced = kind === "shoe" || kind === "gear";
  return {
    id: raw.id,
    kind,
    offeredOn: Number.isFinite(offeredOn) ? Math.round(offeredOn) : Math.round(expiresOn) - OFFER_DAYS,
    expiresOn: Math.round(expiresOn),
    discount: Number.isFinite(discount)
      ? Math.max(0, Math.min(DISCOUNT_CAP, discount))
      : priced ? sponsor.discount : 0,
    raceCoins: Number.isFinite(raceCoins)
      ? Math.max(0, Math.min(RACE_COIN_CAP, Math.round(raceCoins)))
      : priced ? sponsor.raceCoins : 0,
    poach: Boolean(raw.poach),
  };
}

/**
 * Old saves have no sponsors object. Missing fields become "no deal"
 * instead of a crash. A deal id we do not sell anymore is cleared, and
 * its obligation goes with it, because you cannot work for a brand that
 * is not in the catalog.
 *
 * A save that already has a shoe or nutrition sponsor keeps that id.
 * shoeTerms stays null when the old file never stored a contract, and
 * the catalog numbers keep working. A save from before gear sponsors
 * has no `gear` field. That loads as no gear deal, not as a crash and
 * not as a brand picked for you. Offers, cooldowns, and the mailbox
 * default to empty so a new field cannot crash Resume.
 */
function readStoredTerms(raw) {
  if (!raw || typeof raw !== "object") return null;
  const discount = Number(raw.discount);
  const raceCoins = Number(raw.raceCoins);
  if (!Number.isFinite(discount) || !Number.isFinite(raceCoins)) return null;
  return {
    discount: Math.max(0, Math.min(DISCOUNT_CAP, discount)),
    raceCoins: Math.max(0, Math.min(RACE_COIN_CAP, Math.round(raceCoins))),
  };
}

export function normalizeSponsors(raw) {
  const empty = emptySponsors();
  if (!raw || typeof raw !== "object") return empty;
  const shoe = SHOE_SPONSORS[raw.shoe] ? raw.shoe : null;
  const nutrition = NUTRITION_SPONSORS[raw.nutrition] ? raw.nutrition : null;
  const gear = GEAR_SPONSORS[raw.gear] ? raw.gear : null;
  const standing = {};
  if (raw.standing && typeof raw.standing === "object") {
    for (const [id, value] of Object.entries(raw.standing)) {
      if (!knownBrand(id)) continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) continue;
      standing[id] = clampStanding(numeric);
    }
  }
  const cooldowns = {};
  if (raw.cooldowns && typeof raw.cooldowns === "object") {
    for (const [id, value] of Object.entries(raw.cooldowns)) {
      if (!knownBrand(id)) continue;
      const day = Number(value);
      if (!Number.isFinite(day)) continue;
      cooldowns[id] = Math.max(0, Math.round(day));
    }
  }
  const offers = {
    shoe: normalizeOffer(raw.offers?.shoe, "shoe"),
    nutrition: normalizeOffer(raw.offers?.nutrition, "nutrition"),
    gear: normalizeOffer(raw.offers?.gear, "gear"),
  };
  const mailbox = [];
  if (Array.isArray(raw.mailbox)) {
    for (const letter of raw.mailbox) {
      const kind = letter?.kind === "nutrition" || letter?.kind === "gear" || letter?.kind === "shoe"
        ? letter.kind
        : null;
      const offer = kind ? normalizeOffer(letter, kind) : null;
      const arrivesOn = Number(letter?.arrivesOn);
      if (!offer || !Number.isFinite(arrivesOn)) continue;
      mailbox.push({ ...offer, arrivesOn: Math.round(arrivesOn) });
    }
  }
  // No stored contract (an old shoe save, or a save with no gear
  // field) stays null. The catalog numbers apply, and we do not invent
  // a gear discount the player never signed.
  const shoeTerms = shoe ? readStoredTerms(raw.shoeTerms) : null;
  const gearTerms = gear ? readStoredTerms(raw.gearTerms) : null;
  // Missing, negative, or not a number means "no recent offer". A day
  // number is kept so Resume does not hand the player a brand the gap
  // was still holding off.
  // Number(null) is 0, and 0 would look like an offer on a day that
  // never happened. Only a real day number counts. Anything else,
  // including a missing field on an old save, stays null.
  const lastRaw = raw.lastOfferDay;
  const lastOfferDay = typeof lastRaw === "number" && Number.isFinite(lastRaw) && lastRaw >= 0
    ? Math.round(lastRaw)
    : null;
  const next = {
    shoe,
    nutrition,
    gear,
    standing,
    obligation: null,
    seenObligation: Boolean(raw.seenObligation),
    offers,
    cooldowns,
    mailbox,
    shoeTerms,
    gearTerms,
    lastOfferDay,
  };
  if (obligationStillValid(next, raw.obligation)) {
    // "wear" is not in the photo-shoot list. Falling back to the first
    // appearance would turn a gear note into a store visit on Resume.
    const task = raw.obligation.task === GEAR_OBLIGATION.id
      ? GEAR_OBLIGATION
      : (OBLIGATIONS.find((item) => item.id === raw.obligation.task) || OBLIGATIONS[0]);
    next.obligation = {
      id: String(raw.obligation.id || `${raw.obligation.sponsorId}-${task.id}`),
      sponsorId: raw.obligation.sponsorId,
      kind: raw.obligation.kind,
      task: task.id,
      label: raw.obligation.label || task.label,
      pay: Number(raw.obligation.pay) || task.pay,
    };
  }
  return next;
}

function slotLine(label, deal, state, withTerms) {
  if (!deal) return `${label}: none`;
  const standing = `standing ${standingOf(state, deal.id)}`;
  if (!withTerms) return `${label}: ${deal.name} · ${standing}`;
  return `${label}: ${deal.name} · ${standing} · ${Math.round(deal.discount * 100)}% off · +${deal.raceCoins} coins`;
}

/** The three slots, and nothing else. The sponsor menu prints these first. */
export function sponsorSlotLines(state) {
  return [
    slotLine("Shoe sponsor", shoeDealNumbers(state), state, true),
    slotLine("Nutrition sponsor", activeNutritionSponsor(state), state, false),
    slotLine("Gear sponsor", gearDealNumbers(state), state, true),
  ];
}

export function sponsorSummaryLines(state) {
  const lines = sponsorSlotLines(state);
  const day = state?.calendar?.day || 1;
  for (const kind of ["shoe", "nutrition", "gear"]) {
    const offer = state?.sponsors?.offers?.[kind];
    if (!offer || day >= offer.expiresOn) continue;
    const name = sponsorById(kind, offer.id)?.name || offer.id;
    const title = kind === "shoe" ? "Shoe" : kind === "nutrition" ? "Nutrition" : "Gear";
    lines.push(`${title} offer: ${name} until day ${offer.expiresOn}`);
  }
  const job = state?.sponsors?.obligation;
  if (job) lines.push(`Obligation: ${job.label} for ${sponsorById(job.kind, job.sponsorId)?.name || "a sponsor"}`);
  return lines;
}
