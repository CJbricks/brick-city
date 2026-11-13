/**
 * sponsors.js
 * Shoe deals and nutrition deals.
 *
 * You can hold one shoe sponsor and one nutrition sponsor at the same
 * time. Signing a second shoe sponsor ends the first shoe deal. It does
 * not take shoes out of the closet. Nutrition deals stack with a belt or
 * a vest: they change the floor and the drain, not the max of 100 / 105 /
 * 110.
 *
 * Obligations are the cost of the deal. Accepting one spends an energy
 * block and pays better than a Run Store shift. Skipping drops standing.
 * Standing under STANDING_DROP ends that deal until you sign again.
 * The rules here are pure. activities.js is what writes them onto a save.
 */

import { styleLabel, shoeById, carryById, replaceCost } from "@/lib/catalog";
import { levelFromXp } from "@/lib/xp";

export const STANDING_START = 80;
export const STANDING_ACCEPT = 12;
export const STANDING_SKIP = 22;
export const STANDING_WARN = 45;
export const STANDING_DROP = 25;

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
    // Level 2 is one good session past the first easy runs, so the first
    // deal shows up before the player forgets the Sponsors menu exists.
    gates: [
      { label: "Reach level 2", met: (state, level) => level >= 2, have: (state, level) => `Lv ${level}` },
      {
        label: "Finish a track workout or the 5K",
        met: (state) => state.progress.trackRuns >= 1 || state.progress.fiveKFinished,
        have: (state) => state.progress.fiveKFinished ? "5K done" : `${state.progress.trackRuns}/1 track`,
      },
    ],
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
    gates: [
      {
        label: "Reach level 3 or finish the 5K",
        met: (state, level) => level >= 3 || state.progress.fiveKFinished,
        have: (state, level) => state.progress.fiveKFinished ? `5K done · Lv ${level}` : `Lv ${level}`,
      },
    ],
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
    gates: [
      { label: "Reach level 2", met: (state, level) => level >= 2, have: (state, level) => `Lv ${level}` },
      { label: "Log 4 miles", met: (state) => state.progress.totalMiles >= 4, have: (state) => `${state.progress.totalMiles}/4 mi` },
    ],
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
    gates: [
      { label: "Reach level 2", met: (state, level) => level >= 2, have: (state, level) => `Lv ${level}` },
    ],
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
    gates: [
      { label: "Reach level 3", met: (state, level) => level >= 3, have: (state, level) => `Lv ${level}` },
      { label: "Finish 1 park trail run", met: (state) => state.progress.parkTrailRuns >= 1, have: (state) => `${state.progress.parkTrailRuns}/1` },
    ],
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
    gates: [
      { label: "Reach level 3", met: (state, level) => level >= 3, have: (state, level) => `Lv ${level}` },
      { label: "Finish 1 park trail run", met: (state) => state.progress.parkTrailRuns >= 1, have: (state) => `${state.progress.parkTrailRuns}/1` },
    ],
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
    gates: [
      { label: "Reach level 3", met: (state, level) => level >= 3, have: (state, level) => `Lv ${level}` },
      { label: "Finish 2 park trail runs", met: (state) => state.progress.parkTrailRuns >= 2, have: (state) => `${state.progress.parkTrailRuns}/2` },
    ],
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
    gates: [
      { label: "Reach level 4", met: (state, level) => level >= 4, have: (state, level) => `Lv ${level}` },
      { label: "Finish 2 park trail runs", met: (state) => state.progress.parkTrailRuns >= 2, have: (state) => `${state.progress.parkTrailRuns}/2` },
    ],
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
    gates: [
      { label: "Reach level 4", met: (state, level) => level >= 4, have: (state, level) => `Lv ${level}` },
      { label: "Finish 1 park trail run", met: (state) => state.progress.parkTrailRuns >= 1, have: (state) => `${state.progress.parkTrailRuns}/1` },
    ],
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
    gates: [
      { label: "Reach level 2", met: (state, level) => level >= 2, have: (state, level) => `Lv ${level}` },
      { label: "Log 2 miles", met: (state) => state.progress.totalMiles >= 2, have: (state) => `${state.progress.totalMiles}/2 mi` },
    ],
  },
  {
    id: "honey-stinger",
    name: "Honey Stinger",
    sleepFloor: 42,
    drainCut: 1,
    gelDiscount: 0.35,
    raceFuel: 6,
    gelBonus: 2,
    gates: [
      { label: "Reach level 2", met: (state, level) => level >= 2, have: (state, level) => `Lv ${level}` },
      {
        label: "Eat a real meal or carry a gel",
        met: (state) => state.condition.mealQuality === "good" || (state.gels || 0) >= 1,
        have: (state) => (state.gels || 0) >= 1 ? "gel in pocket" : state.condition.mealQuality,
      },
    ],
  },
  {
    id: "maurten",
    name: "Maurten",
    sleepFloor: 52,
    drainCut: 2,
    gelDiscount: 0.1,
    raceFuel: 8,
    gelBonus: 4,
    gates: [
      { label: "Reach level 3", met: (state, level) => level >= 3, have: (state, level) => `Lv ${level}` },
      {
        label: "Finish the Brick City 5K",
        met: (state) => Boolean(state.progress.fiveKFinished),
        have: (state) => state.progress.fiveKFinished ? "done" : "not yet",
      },
    ],
  },
  {
    id: "precision",
    name: "Precision",
    sleepFloor: 44,
    drainCut: 1,
    gelDiscount: 0.2,
    raceFuel: 4,
    gelBonus: 6,
    gates: [
      { label: "Reach level 3", met: (state, level) => level >= 3, have: (state, level) => `Lv ${level}` },
      { label: "Finish 1 long run", met: (state) => state.progress.longRuns >= 1, have: (state) => `${state.progress.longRuns}/1` },
    ],
  },
];

function indexById(list) {
  const table = {};
  for (const entry of list) table[entry.id] = entry;
  return table;
}

export const SHOE_SPONSORS = indexById(SHOE_DEAL_LIST);
export const NUTRITION_SPONSORS = indexById(NUTRITION_DEAL_LIST);
export const SHOE_SPONSOR_IDS = SHOE_DEAL_LIST.map((entry) => entry.id);
export const NUTRITION_SPONSOR_IDS = NUTRITION_DEAL_LIST.map((entry) => entry.id);

export const OBLIGATIONS = [
  { id: "photo", label: "Photo shoot", pay: 46 },
  { id: "store", label: "Store appearance", pay: 52 },
  { id: "expo", label: "Expo booth", pay: 48 },
  { id: "community", label: "Community run", pay: 44 },
];

export function emptySponsors() {
  return {
    shoe: null,
    nutrition: null,
    standing: {},
    obligation: null,
    // The first morning after a deal is signed always brings one note,
    // so the player meets the loop before the every-fourth-day cadence.
    seenObligation: false,
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

export function sponsorById(kind, id) {
  if (kind === "nutrition") return NUTRITION_SPONSORS[id] || null;
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

export function shoePerkText(sponsor) {
  const covered = sponsor.styles.map((style) => styleLabel(style)).join(" + ");
  const boost = Math.round(sponsor.boost * 100);
  let trade = "";
  if (sponsor.penalty) {
    trade = ` −${Math.round(Math.abs(sponsor.penalty) * 100)}% on other styles.`;
  } else if (sponsor.shortRoad) {
    trade = ` −${Math.round(Math.abs(sponsor.shortRoad) * 100)}% in short road races.`;
  }
  const off = Math.round(sponsor.discount * 100);
  return `+${boost}% ${covered}.${trade} ${off}% off ${sponsor.brands.join("/")} gear. +${sponsor.raceCoins} coins on a clean finish. Worn-out matching shoes are free to replace.`;
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
  const deal = activeShoeSponsor(state);
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

export function pricedCarry(state, carryId) {
  const item = carryById(carryId);
  if (!item) return { cost: 0, base: 0, deal: false };
  const deal = activeShoeSponsor(state);
  if (!brandDiscount(deal, item.brand)) return { cost: item.price, base: item.price, deal: false };
  return {
    cost: Math.round(item.price * (1 - deal.discount)),
    base: item.price,
    deal: true,
  };
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
  const task = OBLIGATIONS[day % OBLIGATIONS.length];
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
  if (obligation.kind === "shoe") return sponsors.shoe === obligation.sponsorId;
  return false;
}

/**
 * Old saves have no sponsors object. Missing fields become "no deal"
 * instead of a crash. A deal id we do not sell anymore is cleared, and
 * its obligation goes with it, because you cannot work for a brand that
 * is not in the catalog.
 */
export function normalizeSponsors(raw) {
  const empty = emptySponsors();
  if (!raw || typeof raw !== "object") return empty;
  const shoe = SHOE_SPONSORS[raw.shoe] ? raw.shoe : null;
  const nutrition = NUTRITION_SPONSORS[raw.nutrition] ? raw.nutrition : null;
  const standing = {};
  if (raw.standing && typeof raw.standing === "object") {
    for (const [id, value] of Object.entries(raw.standing)) {
      if (!SHOE_SPONSORS[id] && !NUTRITION_SPONSORS[id]) continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) continue;
      standing[id] = clampStanding(numeric);
    }
  }
  const next = {
    shoe,
    nutrition,
    standing,
    obligation: null,
    seenObligation: Boolean(raw.seenObligation),
  };
  if (obligationStillValid(next, raw.obligation)) {
    const task = OBLIGATIONS.find((item) => item.id === raw.obligation.task) || OBLIGATIONS[0];
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

export function sponsorSummaryLines(state) {
  const shoe = activeShoeSponsor(state);
  const food = activeNutritionSponsor(state);
  const lines = [];
  lines.push(shoe ? `Shoe sponsor: ${shoe.name} · standing ${standingOf(state, shoe.id)}` : "Shoe sponsor: none");
  lines.push(food ? `Nutrition sponsor: ${food.name} · standing ${standingOf(state, food.id)}` : "Nutrition sponsor: none");
  const job = state?.sponsors?.obligation;
  if (job) lines.push(`Obligation: ${job.label} for ${sponsorById(job.kind, job.sponsorId)?.name || "a sponsor"}`);
  return lines;
}
