/**
 * offers.test.js
 * Brands ask. The player does not sign from a list.
 * These tests force the random roll so a win, a miss, and a cooldown
 * happen the same way every time.
 */

import { describe, expect, it } from "vitest";
import {
  applyDeclineOffer,
  applyRace,
  applyRun,
  applySignSponsor,
  applySleep,
  createNewGame,
  sponsorMenuItems,
} from "@/lib/activities";
import {
  CHANCE_FINISH,
  CHANCE_PODIUM,
  CHANCE_WIN,
  MAX_PENDING_OFFERS,
  OFFER_GAP_DAYS,
  RESULT_BRANDS,
  deliverMail,
  grantOffer,
  makeRng,
  rollOffers,
  scaledTerms,
} from "@/lib/offers";
import { GEAR_SPONSOR_IDS, NUTRITION_SPONSOR_IDS, SHOE_SPONSOR_IDS, gateStatus, sponsorById } from "@/lib/sponsors";
import { finishQuality } from "@/lib/race";
import { xpToReachLevel } from "@/lib/xp";

function primed(level) {
  const state = createNewGame({ name: "Ada", gender: "female" });
  state.xp.overall = xpToReachLevel(level);
  state.progress.fiveKFinished = true;
  state.progress.tenKFinished = true;
  state.progress.parkTrailRuns = 2;
  state.progress.mountainRuns = 1;
  state.progress.yards = 2;
  state.progress.longRuns = 1;
  state.progress.totalMiles = 30;
  return state;
}

function silence(state, ids) {
  for (const id of ids) state.sponsors.cooldowns[id] = 999;
}

function except(state, keep) {
  const held = new Set(keep);
  silence(state, [...SHOE_SPONSOR_IDS, ...NUTRITION_SPONSOR_IDS, ...GEAR_SPONSOR_IDS].filter((id) => !held.has(id)));
}

describe("offer triggers", () => {
  it("maps the fast clock to a win and the next clock to a podium", () => {
    expect(finishQuality(55)).toBe("win");
    expect(finishQuality(40)).toBe("podium");
    expect(finishQuality(39)).toBe("finish");
    expect(CHANCE_WIN).toBe(1);
    expect(CHANCE_PODIUM).toBeGreaterThan(CHANCE_FINISH);
    expect(CHANCE_PODIUM).toBeGreaterThan(0.2);
    expect(CHANCE_PODIUM).toBeLessThan(0.7);
    expect(CHANCE_FINISH).toBeLessThan(0.18);
    expect(OFFER_GAP_DAYS).toBeGreaterThanOrEqual(5);
    expect(MAX_PENDING_OFFERS).toBe(1);
  });

  it("draws a road brand from a road win and not from a trail result", () => {
    const road = primed(3);
    except(road, ["brooks"]);
    road.condition.endurance = 90;
    road.condition.peak = 90;
    road.condition.fatigue = 5;
    const won = applyRace(road, "5k", 0.9, undefined, () => 0.99);
    expect(won.celebrate).toBe(true);
    expect(won.state.sponsors.offers.shoe.id).toBe("brooks");
    expect(won.lines.join(" ")).toMatch(/40%/);
    expect(won.lines.join(" ")).toMatch(/finish line/i);

    const trail = primed(8);
    except(trail, ["brooks", "norda"]);
    const rolled = structuredClone(trail);
    rollOffers(rolled, { style: "trail", quality: "win", channel: "finish" }, () => 0.99);
    expect(rolled.sponsors.offers.shoe.id).toBe("norda");
    expect(rolled.sponsors.offers.shoe.id).not.toBe("brooks");
  });

  it("draws trail brands from trail results and backyard brands from yards", () => {
    const trail = primed(8);
    except(trail, ["norda"]);
    const ran = applyRun(trail, "park-trail", () => 0);
    expect(ran.state.sponsors.offers.shoe).toBeNull();
    expect(ran.state.sponsors.mailbox[0].id).toBe("norda");
    expect(ran.lines.join(" ")).not.toMatch(/Norda/);
    const morning = applySleep(ran.state);
    expect(morning.state.sponsors.offers.shoe.id).toBe("norda");
    expect(morning.lines.join(" ")).toMatch(/Norda/);
    expect(morning.lines.join(" ")).toMatch(/kitchen table/);

    const yard = primed(8);
    except(yard, ["speedland"]);
    const yards = applyRun(yard, "yards", () => 0);
    expect(yards.state.sponsors.mailbox[0].id).toBe("speedland");
  });

  it("guarantees an offer on a win and only sometimes on a plain finish", () => {
    const base = primed(3);
    except(base, ["brooks"]);
    const missed = applyRace(structuredClone(base), "5k", 0.9, undefined, () => 0.5);
    expect(missed.celebrate).toBeFalsy();
    expect(missed.state.sponsors.offers.shoe).toBeNull();

    const small = applyRace(structuredClone(base), "5k", 0.9, undefined, () => 0);
    expect(small.celebrate).toBeFalsy();
    expect(small.state.sponsors.offers.shoe.id).toBe("brooks");

    const peaked = structuredClone(base);
    peaked.condition.endurance = 90;
    peaked.condition.peak = 90;
    peaked.condition.fatigue = 5;
    const won = applyRace(peaked, "5k", 0.99, undefined, () => 0.99);
    expect(won.celebrate).toBe(true);
    expect(won.state.sponsors.offers.shoe.id).toBe("brooks");
  });

  it("gives a top-3 finish a strong chance and a miss when the roll is high", () => {
    const state = primed(3);
    except(state, ["brooks"]);
    state.condition.endurance = 55;
    state.condition.peak = 50;
    state.condition.fatigue = 10;
    const missed = applyRace(structuredClone(state), "5k", 0.9, undefined, () => 0.95);
    expect(missed.state.sponsors.offers.shoe).toBeNull();
    const hit = applyRace(structuredClone(state), "5k", 0.9, undefined, () => 0.2);
    expect(hit.state.sponsors.offers.shoe.id).toBe("brooks");
    expect(hit.celebrate).toBeFalsy();
  });

  it("keeps big brands behind level 3 to 5 and boutique brands behind dirt", () => {
    const early = createNewGame({ name: "Ada", gender: "female" });
    early.xp.overall = xpToReachLevel(2);
    early.progress.fiveKFinished = true;
    expect(gateStatus(early, sponsorById("shoe", "hoka")).open).toBe(false);
    expect(gateStatus(early, sponsorById("shoe", "brooks")).open).toBe(false);

    const road = primed(3);
    expect(gateStatus(road, sponsorById("shoe", "hoka")).open).toBe(true);
    expect(gateStatus(road, sponsorById("shoe", "brooks")).open).toBe(true);
    expect(gateStatus(road, sponsorById("shoe", "nike")).open).toBe(false);
    expect(gateStatus(primed(5), sponsorById("shoe", "nike")).open).toBe(true);
    expect(gateStatus(primed(4), sponsorById("shoe", "adidas")).open).toBe(true);
    expect(gateStatus(primed(3), sponsorById("nutrition", "honey-stinger")).open).toBe(true);
    expect(gateStatus(primed(4), sponsorById("nutrition", "bpn")).open).toBe(true);

    const noDirt = primed(8);
    noDirt.progress.parkTrailRuns = 0;
    noDirt.progress.mountainRuns = 0;
    noDirt.progress.yards = 0;
    expect(gateStatus(noDirt, sponsorById("shoe", "norda")).open).toBe(false);
    expect(gateStatus(primed(6), sponsorById("shoe", "norda")).open).toBe(true);
    expect(gateStatus(primed(6), sponsorById("shoe", "speedland")).open).toBe(true);
    expect(gateStatus(primed(7), sponsorById("shoe", "mount-to-coast")).open).toBe(true);
    expect(gateStatus(primed(7), sponsorById("shoe", "salomon")).open).toBe(true);
    expect(gateStatus(primed(8), sponsorById("shoe", "satisfy")).open).toBe(true);
    expect(gateStatus(primed(5), sponsorById("shoe", "satisfy")).open).toBe(false);
    expect(gateStatus(primed(6), sponsorById("nutrition", "maurten")).open).toBe(true);
    expect(gateStatus(primed(7), sponsorById("nutrition", "precision")).open).toBe(true);
  });

  it("expires an offer after 3 mornings and cools the brand down for 7 days", () => {
    let state = grantOffer(primed(3), "shoe", "brooks").state;
    const started = state.calendar.day;
    expect(state.sponsors.offers.shoe.expiresOn).toBe(started + 3);
    state = applySleep(state).state;
    expect(state.sponsors.offers.shoe.id).toBe("brooks");
    state = applySleep(state).state;
    expect(state.sponsors.offers.shoe.id).toBe("brooks");
    state = applySleep(state).state;
    expect(state.calendar.day).toBe(started + 3);
    expect(state.sponsors.offers.shoe).toBeNull();
    expect(state.sponsors.cooldowns.brooks).toBe(state.calendar.day + 7);
    const blocked = structuredClone(state);
    blocked.condition.endurance = 90;
    blocked.condition.peak = 90;
    blocked.condition.fatigue = 5;
    except(blocked, ["brooks"]);
    const raced = applyRace(blocked, "5k", 0.9, undefined, () => 0);
    expect(raced.state.sponsors.offers.shoe).toBeNull();
  });

  it("starts a 7-day cooldown when the offer is declined", () => {
    const offered = grantOffer(primed(3), "shoe", "brooks").state;
    const declined = applyDeclineOffer(offered, "shoe");
    expect(declined.ok).toBe(true);
    expect(declined.state.sponsors.offers.shoe).toBeNull();
    expect(declined.state.sponsors.cooldowns.brooks).toBe(offered.calendar.day + 7);
    expect(grantOffer(declined.state, "shoe", "brooks").ok).toBe(false);
  });

  it("lets a rival poach on a win, keeps the closet, and cools the old brand for 14 days", () => {
    const signed = applySignSponsor(grantOffer(primed(3), "shoe", "brooks").state, "shoe", "brooks");
    expect(signed.state.sponsors.shoe).toBe("brooks");
    expect(signed.state.gear.owned).toContain("starter");
    const later = signed.state;
    later.xp.overall = xpToReachLevel(8);
    later.condition.endurance = 90;
    later.condition.peak = 90;
    later.condition.fatigue = 5;
    except(later, ["hoka"]);
    // Signing today started the global gap. A same-day win must not
    // poach. The rival can ask once OFFER_GAP_DAYS have passed.
    const tooSoon = structuredClone(later);
    const early = applyRace(tooSoon, "5k", 0.9, undefined, () => 0);
    expect(early.state.sponsors.offers.shoe).toBeNull();
    later.calendar.day += OFFER_GAP_DAYS;
    const poached = applyRace(later, "5k", 0.9, undefined, () => 0);
    expect(poached.state.sponsors.offers.shoe.poach).toBe(true);
    expect(poached.state.sponsors.offers.shoe.id).toBe("hoka");
    expect(poached.state.sponsors.offers.shoe.raceCoins).toBeGreaterThan(signed.state.sponsors.shoeTerms.raceCoins);
    expect(poached.lines.join(" ")).toMatch(/14 days/);
    const accepted = applySignSponsor(poached.state, "shoe", "hoka");
    expect(accepted.state.sponsors.shoe).toBe("hoka");
    expect(accepted.state.sponsors.cooldowns.brooks).toBe(accepted.state.calendar.day + 14);
    expect(accepted.state.gear.owned).toEqual(signed.state.gear.owned);
    expect(accepted.state.gear.equipped).toBe("starter");
  });

  it("scales discount and race coins with level and stops at the cap", () => {
    const brooks = sponsorById("shoe", "brooks");
    expect(scaledTerms(brooks, 3)).toEqual({ discount: 0.4, raceCoins: 8 });
    const higher = scaledTerms(brooks, 8);
    expect(higher.discount).toBeGreaterThan(0.4);
    expect(higher.raceCoins).toBeGreaterThan(8);
    expect(higher.discount).toBeLessThanOrEqual(0.55);
    const capped = scaledTerms(brooks, 40);
    expect(capped.discount).toBe(0.55);
    expect(capped.raceCoins).toBe(36);
    const poach = scaledTerms(brooks, 3, { poach: true });
    expect(poach.discount).toBeGreaterThan(0.4);
    expect(poach.raceCoins).toBeGreaterThan(8);
  });

  it("repeats the same offer for the same seed", () => {
    const first = primed(5);
    except(first, ["nike", "hoka", "adidas", "brooks"]);
    const second = structuredClone(first);
    rollOffers(first, { style: "road", quality: "win", channel: "finish" }, makeRng(7));
    rollOffers(second, { style: "road", quality: "win", channel: "finish" }, makeRng(7));
    expect(first.sponsors.offers.shoe.id).toBe(second.sponsors.offers.shoe.id);
    expect(["nike", "hoka", "adidas", "brooks"]).toContain(first.sponsors.offers.shoe.id);
  });

  it("shows accept and decline instead of a sign button", () => {
    const state = grantOffer(primed(3), "shoe", "brooks").state;
    const labels = sponsorMenuItems(state).map((row) => row.label);
    expect(labels).toContain("Accept Brooks");
    expect(labels).toContain("Decline Brooks");
    expect(labels.some((label) => label.startsWith("Sign"))).toBe(false);
    expect(labels.some((label) => label.includes("not interested yet"))).toBe(true);
    expect(labels.some((label) => label.startsWith("Gear sponsor:"))).toBe(true);
  });
});

describe("offer spacing", () => {
  function countOffers(state) {
    return ["shoe", "nutrition", "gear"].filter((kind) => state.sponsors.offers[kind]).length
      + state.sponsors.mailbox.length;
  }

  it("gives a win one offer, not one per category", () => {
    const state = primed(8);
    const rolled = rollOffers(state, { style: "road", quality: "win", channel: "finish" }, () => 0);
    expect(rolled.created).toHaveLength(1);
    expect(countOffers(state)).toBe(1);
    expect(state.sponsors.offers.shoe).not.toBeNull();
    expect(state.sponsors.offers.nutrition).toBeNull();
    expect(state.sponsors.offers.gear).toBeNull();
    expect(state.sponsors.lastOfferDay).toBe(state.calendar.day);
  });

  it("holds every category until the gap has passed, including a win", () => {
    const state = primed(8);
    rollOffers(state, { style: "road", quality: "win", channel: "finish" }, () => 0);
    const offered = state.sponsors.offers.shoe.id;
    state.sponsors.offers.shoe = null;
    const soon = rollOffers(state, { style: "road", quality: "win", channel: "finish" }, () => 0);
    expect(soon.created).toEqual([]);
    expect(countOffers(state)).toBe(0);
    state.calendar.day += OFFER_GAP_DAYS - 1;
    const still = rollOffers(state, { style: "road", quality: "win", channel: "finish" }, () => 0);
    expect(still.created).toEqual([]);
    state.calendar.day += 1;
    const again = rollOffers(state, { style: "road", quality: "win", channel: "finish" }, () => 0);
    expect(again.created).toHaveLength(1);
    expect(state.sponsors.offers.shoe.id).toBe(offered);
  });

  it("will not stack a second note while one is still on the table", () => {
    const state = primed(8);
    rollOffers(state, { style: "road", quality: "win", channel: "finish" }, () => 0);
    const first = state.sponsors.offers.shoe.id;
    state.sponsors.lastOfferDay = state.calendar.day - OFFER_GAP_DAYS;
    const blocked = rollOffers(state, { style: "trail", quality: "win", channel: "finish" }, () => 0);
    expect(blocked.created).toEqual([]);
    expect(state.sponsors.offers.shoe.id).toBe(first);
    expect(state.sponsors.offers.nutrition).toBeNull();
    expect(state.sponsors.offers.gear).toBeNull();
  });

  it("delivers one letter and holds the next while that note is live", () => {
    const state = primed(8);
    state.sponsors.mailbox = [
      { id: "norda", kind: "shoe", offeredOn: 1, expiresOn: 4, discount: 0.4, raceCoins: 8, poach: false, arrivesOn: 1 },
      { id: "maurten", kind: "nutrition", offeredOn: 1, expiresOn: 4, discount: 0, raceCoins: 0, poach: false, arrivesOn: 1 },
    ];
    const lines = deliverMail(state);
    expect(lines).toHaveLength(1);
    expect(state.sponsors.offers.shoe.id).toBe("norda");
    expect(state.sponsors.offers.nutrition).toBeNull();
    expect(state.sponsors.mailbox).toHaveLength(1);
    expect(state.sponsors.mailbox[0].id).toBe("maurten");
    expect(state.sponsors.mailbox[0].arrivesOn).toBe(state.calendar.day + 1);
  });
});

const BELT_GEAR = ["nathan", "osprey", "rei", "dera"];
const VEST_GEAR = ["camelbak", "naked", "satisfy-gear", "salomon-gear"];

function weight(list, ids) {
  return ids.reduce((sum, id) => sum + list.filter((entry) => entry === id).length, 0);
}

describe("gear offers", () => {
  it("leans road results toward belts and trail or ultra results toward vests", () => {
    for (const id of GEAR_SPONSOR_IDS) {
      expect(RESULT_BRANDS.road.gear).toContain(id);
      expect(RESULT_BRANDS.trail.gear).toContain(id);
      expect(RESULT_BRANDS.versatile.gear).toContain(id);
    }
    expect(weight(RESULT_BRANDS.road.gear, BELT_GEAR)).toBeGreaterThan(weight(RESULT_BRANDS.road.gear, VEST_GEAR));
    expect(weight(RESULT_BRANDS.trail.gear, VEST_GEAR)).toBeGreaterThan(weight(RESULT_BRANDS.trail.gear, BELT_GEAR));
    expect(weight(RESULT_BRANDS.versatile.gear, VEST_GEAR)).toBeGreaterThan(weight(RESULT_BRANDS.versatile.gear, BELT_GEAR));

    const road = primed(8);
    except(road, ["osprey", "camelbak"]);
    rollOffers(road, { style: "road", quality: "win", channel: "finish" }, () => 0);
    expect(road.sponsors.offers.gear.id).toBe("osprey");

    const trail = primed(8);
    except(trail, ["osprey", "camelbak"]);
    rollOffers(trail, { style: "trail", quality: "win", channel: "finish" }, () => 0);
    expect(trail.sponsors.offers.gear.id).toBe("camelbak");

    const ultra = primed(8);
    except(ultra, ["osprey", "naked"]);
    rollOffers(ultra, { style: "versatile", quality: "win", channel: "finish" }, () => 0);
    expect(ultra.sponsors.offers.gear.id).toBe("naked");
  });

  it("offers, expires, and declines a gear deal on the shoe timetable", () => {
    let state = grantOffer(primed(3), "gear", "nathan").state;
    expect(state.sponsors.offers.gear.id).toBe("nathan");
    expect(state.sponsors.offers.gear.discount).toBe(0.25);
    expect(state.sponsors.offers.gear.raceCoins).toBe(4);
    const started = state.calendar.day;
    state = applySleep(state).state;
    state = applySleep(state).state;
    state = applySleep(state).state;
    expect(state.calendar.day).toBe(started + 3);
    expect(state.sponsors.offers.gear).toBeNull();
    expect(state.sponsors.cooldowns.nathan).toBe(state.calendar.day + 7);

    const offered = grantOffer(primed(4), "gear", "osprey").state;
    const declined = applyDeclineOffer(offered, "gear");
    expect(declined.state.sponsors.offers.gear).toBeNull();
    expect(declined.state.sponsors.cooldowns.osprey).toBe(offered.calendar.day + 7);
    expect(grantOffer(declined.state, "gear", "osprey").ok).toBe(false);
    expect(grantOffer(declined.state, "shoe", "brooks").ok).toBe(true);
  });

  it("lets a rival gear brand poach, keeps the closet, and cools the old brand for 14 days", () => {
    const signed = applySignSponsor(grantOffer(primed(4), "gear", "osprey").state, "gear", "osprey");
    expect(signed.state.gear.carry).toBe("osprey-belt");
    const later = signed.state;
    later.xp.overall = xpToReachLevel(8);
    later.condition.endurance = 90;
    later.condition.peak = 90;
    later.condition.fatigue = 5;
    except(later, ["nathan"]);
    later.calendar.day += OFFER_GAP_DAYS;
    const poached = applyRace(later, "5k", 0.9, undefined, () => 0);
    expect(poached.state.sponsors.offers.gear.poach).toBe(true);
    expect(poached.state.sponsors.offers.gear.id).toBe("nathan");
    expect(poached.state.sponsors.offers.gear.discount).toBeGreaterThan(signed.state.sponsors.gearTerms.discount);
    expect(poached.lines.join(" ")).toMatch(/14 days/);
    expect(poached.lines.join(" ")).toMatch(/Nathan Zipster/);
    const accepted = applySignSponsor(poached.state, "gear", "nathan");
    expect(accepted.state.sponsors.gear).toBe("nathan");
    expect(accepted.state.sponsors.cooldowns.osprey).toBe(accepted.state.calendar.day + 14);
    expect(accepted.state.gear.ownedCarry).toEqual(["osprey-belt", "nathan-belt"]);
    expect(accepted.state.gear.carry).toBe("nathan-belt");
    expect(accepted.state.gear.equipped).toBe("starter");
  });

  it("does not let a Salomon shoe cooldown block the Salomon gear deal", () => {
    const offered = grantOffer(primed(7), "shoe", "salomon").state;
    const declined = applyDeclineOffer(offered, "shoe");
    expect(declined.state.sponsors.cooldowns.salomon).toBe(offered.calendar.day + 7);
    const gear = grantOffer(declined.state, "gear", "salomon-gear");
    expect(gear.ok).toBe(true);
    expect(gear.state.sponsors.offers.gear.id).toBe("salomon-gear");
  });

  it("scales a gear contract the same way as a shoe contract", () => {
    const osprey = sponsorById("gear", "osprey");
    expect(scaledTerms(osprey, 4)).toEqual({ discount: 0.28, raceCoins: 5 });
    const higher = scaledTerms(osprey, 8);
    expect(higher.discount).toBeGreaterThan(0.28);
    expect(higher.raceCoins).toBeGreaterThan(5);
    expect(higher.discount).toBeLessThanOrEqual(0.55);
    const capped = scaledTerms(osprey, 40);
    expect(capped.discount).toBe(0.55);
    expect(capped.raceCoins).toBe(36);
  });
});
