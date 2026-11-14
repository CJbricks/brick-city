/**
 * offers.js
 * Brands make the offer. The player does not pick a logo off a list.
 *
 * A result in a style can attract the brands of that style. A win (or a
 * boss win) is a sure offer when somebody eligible is free. A top-3
 * finish is a strong chance. A plain finish is a small chance. The roll
 * is a function the caller passes in, so a test can force the offer
 * without touching Math.random.
 *
 * One shoe offer and one nutrition offer can be pending. Each lasts 3
 * in-game days. Decline or expiry waits 7 days before that brand asks
 * again. Leaving a shoe brand (you accepted a rival, or they dropped you)
 * waits 14 days. A rival shoe brand can poach on a strong result, and
 * the new terms have to beat the contract you already signed.
 */

import {
  COOLDOWN_LEAVE,
  COOLDOWN_PASS,
  DISCOUNT_CAP,
  DISCOUNT_STEP,
  OFFER_DAYS,
  POACH_COINS,
  POACH_DISCOUNT,
  RACE_COIN_CAP,
  RACE_COIN_STEP,
  gateStatus,
  nutritionPerkText,
  runnerLevelOf,
  shoeDealNumbers,
  sponsorById,
} from "@/lib/sponsors";

// Win is certain. Top 3 is likely. Just finishing is a long shot, so a
// jog-in does not fill the mailbox every afternoon.
export const CHANCE_WIN = 1;
export const CHANCE_PODIUM = 0.7;
export const CHANCE_FINISH = 0.18;

/**
 * Who a result can attract. Trail results include the trail lines of
 * Nike, Adidas, and Hoka. Road races are the marathon brands. Backyard
 * yards are the versatile list. Brooks stays a road brand. Satisfy stays
 * a trail brand. Nutrition follows the same split: the early fuel brands
 * watch road races, and Maurten and Precision watch dirt and yards.
 */
export const RESULT_BRANDS = {
  road: {
    shoe: ["nike", "adidas", "brooks", "hoka"],
    nutrition: ["bpn", "honey-stinger"],
  },
  trail: {
    shoe: ["norda", "speedland", "mount-to-coast", "satisfy", "salomon", "nike", "adidas", "hoka"],
    nutrition: ["maurten", "precision"],
  },
  versatile: {
    shoe: ["norda", "speedland", "mount-to-coast", "adidas", "hoka", "salomon"],
    nutrition: ["maurten", "precision"],
  },
};

export function makeRng(seed) {
  // Numerical Recipes LCG. Same seed, same sequence, in every browser.
  let value = Number(seed) >>> 0;
  if (value === 0) value = 1;
  return function rng() {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function chanceFor(quality) {
  if (quality === "win") return CHANCE_WIN;
  if (quality === "podium") return CHANCE_PODIUM;
  return CHANCE_FINISH;
}

/**
 * Terms at the brand's own minimum level match the catalog. Each level
 * past that adds a little discount and a few race coins, then stops at
 * the cap so level 40 is not a free store.
 * A poach adds a bump on top so the rival's note is actually better
 * than staying put.
 */
export function scaledTerms(sponsor, level, options = {}) {
  const anchor = sponsor.minLevel || 3;
  const steps = Math.max(0, (level || 1) - anchor);
  let discount = sponsor.discount + steps * DISCOUNT_STEP;
  let raceCoins = sponsor.raceCoins + steps * RACE_COIN_STEP;
  if (options.poach) {
    discount += POACH_DISCOUNT;
    raceCoins += POACH_COINS;
  }
  return {
    discount: Math.round(Math.min(DISCOUNT_CAP, discount) * 100) / 100,
    raceCoins: Math.min(RACE_COIN_CAP, Math.round(raceCoins)),
  };
}

export function ensureSponsors(state) {
  if (!state.sponsors || typeof state.sponsors !== "object") return;
  if (!state.sponsors.offers) state.sponsors.offers = { shoe: null, nutrition: null };
  if (!state.sponsors.cooldowns || typeof state.sponsors.cooldowns !== "object") state.sponsors.cooldowns = {};
  if (!Array.isArray(state.sponsors.mailbox)) state.sponsors.mailbox = [];
  if (!("shoeTerms" in state.sponsors)) state.sponsors.shoeTerms = null;
}

function dayOf(state) {
  return state.calendar?.day || 1;
}

export function isCooled(state, id) {
  const until = state.sponsors?.cooldowns?.[id] || 0;
  return dayOf(state) >= until;
}

function offerIsCurrent(state, offer) {
  if (!offer) return false;
  return dayOf(state) < offer.expiresOn;
}

export function liveOffer(state, kind) {
  const offer = state?.sponsors?.offers?.[kind];
  return offerIsCurrent(state, offer) ? offer : null;
}

function beatsContract(offerTerms, current) {
  if (!current) return true;
  return offerTerms.discount > current.discount + 0.001 || offerTerms.raceCoins > current.raceCoins;
}

function buildOffer(state, kind, id, poach) {
  const sponsor = sponsorById(kind, id);
  const level = runnerLevelOf(state);
  const day = dayOf(state);
  const terms = kind === "shoe"
    ? scaledTerms(sponsor, level, { poach })
    : { discount: 0, raceCoins: 0 };
  return {
    id,
    kind,
    offeredOn: day,
    expiresOn: day + OFFER_DAYS,
    discount: terms.discount,
    raceCoins: terms.raceCoins,
    poach: Boolean(poach),
  };
}

function eligibleIds(state, kind, style, poach) {
  const pool = RESULT_BRANDS[style]?.[kind] || [];
  const current = state.sponsors?.[kind] || null;
  const ids = [];
  for (const id of pool) {
    if (id === current) continue;
    if (!isCooled(state, id)) continue;
    const sponsor = sponsorById(kind, id);
    if (!sponsor || !gateStatus(state, sponsor).open) continue;
    if (poach) {
      if (kind !== "shoe") continue;
      const terms = scaledTerms(sponsor, runnerLevelOf(state), { poach: true });
      if (!beatsContract(terms, shoeDealNumbers(state))) continue;
    }
    ids.push(id);
  }
  return ids;
}

/**
 * A plain finish does not poach. You already have a deal, and jogging
 * it in is not the moment a rival spends the money. A win still
 * guarantees a poach when a better rival is actually eligible.
 */
function considerKind(state, kind, event, rng) {
  if (liveOffer(state, kind)) return null;
  const poach = kind === "shoe" && Boolean(state.sponsors?.shoe);
  if (poach && event.quality === "finish") return null;
  if (kind === "nutrition" && state.sponsors?.nutrition) return null;
  const ids = eligibleIds(state, kind, event.style, poach);
  if (ids.length === 0) return null;
  // A win skips the roll. Calling rng here would make a "sure thing"
  // depend on the same number the brand picker needs.
  if (chanceFor(event.quality) < 1 && rng() >= chanceFor(event.quality)) return null;
  const index = Math.min(ids.length - 1, Math.floor(rng() * ids.length));
  return buildOffer(state, kind, ids[index], poach);
}

function article(name) {
  return /^[aeiou]/i.test(name) ? "an" : "a";
}

export function offerSentence(offer, state, where) {
  const sponsor = sponsorById(offer.kind, offer.id);
  const name = sponsor?.name || "A brand";
  const intro = where === "letter"
    ? `A letter from ${name} is on the kitchen table.`
    : `At the finish line, ${article(name)} ${name} rep steps up.`;
  if (offer.kind === "nutrition") {
    return `${intro} ${nutritionPerkText(sponsor)} The offer lasts ${OFFER_DAYS} days. Open Sponsors to accept or decline.`;
  }
  const pct = Math.round(offer.discount * 100);
  let extra = "";
  if (offer.poach && state.sponsors?.shoe && state.sponsors.shoe !== offer.id) {
    const current = sponsorById("shoe", state.sponsors.shoe);
    const left = current?.name || "Your current brand";
    extra = ` That beats the ${left} deal. Accepting ends it. Shoes you already own stay in the closet, and ${left} will not call for ${COOLDOWN_LEAVE} days.`;
  }
  return `${intro} ${pct}% off ${name} gear, plus ${offer.raceCoins} coins on a clean finish.${extra} The offer lasts ${OFFER_DAYS} days. Open Sponsors to accept or decline.`;
}

/**
 * Mutates state.sponsors. Race results use channel "finish" and come
 * back as dialogue lines. Trail runs and yards use channel "letter":
 * the note waits in the mailbox until the next morning, so the rep is
 * not standing on the dirt loop.
 */
export function rollOffers(state, event, rng = Math.random) {
  ensureSponsors(state);
  expireOffers(state);
  const lines = [];
  const created = [];
  const style = event?.style;
  const quality = event?.quality || "finish";
  const channel = event?.channel === "letter" ? "letter" : "finish";
  if (!RESULT_BRANDS[style]) return { lines, created };
  for (const kind of ["shoe", "nutrition"]) {
    const offer = considerKind(state, kind, { style, quality }, rng);
    if (!offer) continue;
    if (channel === "letter") {
      const waiting = state.sponsors.mailbox.some((item) => item.kind === kind);
      if (waiting) continue;
      state.sponsors.mailbox.push({ ...offer, arrivesOn: dayOf(state) + 1 });
      created.push(offer);
      continue;
    }
    state.sponsors.offers[kind] = offer;
    created.push(offer);
    lines.push(offerSentence(offer, state, "finish"));
  }
  return { lines, created };
}

/**
 * Place an offer by hand (the Accept tests, and a dev who wants a
 * specific rep). Still respects gates and cooldowns. Does not roll.
 */
export function grantOffer(state, kind, id, options = {}) {
  const sponsor = sponsorById(kind, id);
  if (!sponsor) return { ok: false, state, lines: ["That brand is not in the book."] };
  const next = structuredClone(state);
  ensureSponsors(next);
  expireOffers(next);
  if (!gateStatus(next, sponsor).open) return { ok: false, state, lines: ["Not yet."] };
  if (!isCooled(next, id)) return { ok: false, state, lines: ["That brand is waiting out a cooldown."] };
  const offer = buildOffer(next, kind, id, Boolean(options.poach));
  next.sponsors.offers[kind] = offer;
  return { ok: true, state: next, offer, lines: [offerSentence(offer, next, "finish")] };
}

export function expireOffers(state) {
  ensureSponsors(state);
  const lines = [];
  const day = dayOf(state);
  for (const kind of ["shoe", "nutrition"]) {
    const offer = state.sponsors.offers[kind];
    if (!offer || day < offer.expiresOn) continue;
    const sponsor = sponsorById(kind, offer.id);
    state.sponsors.offers[kind] = null;
    state.sponsors.cooldowns[offer.id] = day + COOLDOWN_PASS;
    lines.push(`${sponsor?.name || "A brand"} waited ${OFFER_DAYS} days and moved on. They will not ask again for ${COOLDOWN_PASS} days.`);
  }
  return lines;
}

export function deliverMail(state) {
  ensureSponsors(state);
  const day = dayOf(state);
  const lines = [];
  const keep = [];
  for (const letter of state.sponsors.mailbox) {
    if ((letter.arrivesOn || day) > day) {
      keep.push(letter);
      continue;
    }
    // One pending offer per kind. A letter that shows up while that
    // slot is full waits for the next morning instead of being thrown out.
    if (state.sponsors.offers[letter.kind]) {
      keep.push({ ...letter, arrivesOn: day + 1 });
      continue;
    }
    const offer = {
      id: letter.id,
      kind: letter.kind,
      offeredOn: day,
      expiresOn: day + OFFER_DAYS,
      discount: letter.discount,
      raceCoins: letter.raceCoins,
      poach: Boolean(letter.poach),
    };
    state.sponsors.offers[letter.kind] = offer;
    lines.push(offerSentence(offer, state, "letter"));
  }
  state.sponsors.mailbox = keep;
  return lines;
}

export function setCooldown(state, id, days) {
  ensureSponsors(state);
  state.sponsors.cooldowns[id] = dayOf(state) + days;
}
