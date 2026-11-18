/**
 * sponsors.test.js
 * One shoe deal, one nutrition deal, one gear deal, the stack with a
 * vest, and what happens when you skip the photo shoot or the wear
 * note too many times.
 */

import { describe, expect, it } from "vitest";
import {
  applyBuyCarry,
  applyEatGel,
  applyObligation,
  applyPurchase,
  applyRace,
  applyRun,
  applyShoe,
  applySignSponsor,
  applySleep,
  applyUnequipCarry,
  createNewGame,
  sponsorMenuItems,
} from "@/lib/activities";
import { CARRY } from "@/lib/catalog";
import {
  GEAR_SPONSOR_IDS,
  NUTRITION_SPONSOR_IDS,
  SHOE_SPONSOR_IDS,
  gearPerkText,
  normalizeSponsors,
  nutritionTuning,
  pricedCarry,
  sponsorById,
  sponsorSummaryLines,
  starterCarryId,
} from "@/lib/sponsors";
import { grantOffer } from "@/lib/offers";
import { xpToReachLevel } from "@/lib/xp";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

function atLevel(level) {
  const state = fresh();
  state.xp.overall = xpToReachLevel(level);
  return state;
}

function primed(level) {
  const state = atLevel(level);
  state.progress.fiveKFinished = true;
  state.progress.tenKFinished = true;
  state.progress.parkTrailRuns = 2;
  state.progress.mountainRuns = 1;
  state.progress.yards = 1;
  state.progress.longRuns = 1;
  state.progress.totalMiles = 20;
  state.condition.mealQuality = "good";
  return state;
}

function accept(state, kind, id) {
  const offered = grantOffer(state, kind, id);
  if (!offered.ok) return offered;
  return applySignSponsor(offered.state, kind, id);
}

describe("nutrition sponsors", () => {
  it("has BPN, Honey Stinger, Maurten, and Precision", () => {
    expect(NUTRITION_SPONSOR_IDS).toEqual(["bpn", "honey-stinger", "maurten", "precision"]);
    for (const id of NUTRITION_SPONSOR_IDS) {
      const deal = sponsorById("nutrition", id);
      expect(deal.sleepFloor).toBeGreaterThan(40);
      expect(deal.drainCut).toBeGreaterThan(0);
      expect(deal.gelDiscount + deal.raceFuel + deal.gelBonus).toBeGreaterThan(0);
    }
  });

  it("stacks a sleep floor and a slower drain on top of a vest without raising the cap", () => {
    const state = primed(6);
    state.gear.carry = "naked-vest";
    state.gear.ownedCarry = ["naked-vest"];
    const signed = accept(state, "nutrition", "maurten");
    expect(signed.ok).toBe(true);
    expect(signed.state.sponsors.nutrition).toBe("maurten");
    signed.state.condition.nutrition = 20;
    const morning = applySleep(signed.state);
    expect(morning.state.condition.nutrition).toBe(52);
    expect(morning.state.gear.carry).toBe("naked-vest");

    const hungry = primed(4);
    const bpn = accept(hungry, "nutrition", "bpn");
    const run = applyRun(bpn.state, "easy-run");
    expect(run.state.condition.nutrition).toBe(58);
    expect(nutritionTuning(run.state).drainCut).toBe(1);
  });

  it("discounts Honey Stinger gels and adds Precision gel food", () => {
    const honey = primed(3);
    const signed = accept(honey, "nutrition", "honey-stinger");
    const bought = applyPurchase(signed.state, "gel");
    expect(bought.state.gels).toBe(1);
    expect(bought.state.coins).toBe(40);

    const precise = primed(7);
    const deal = accept(precise, "nutrition", "precision");
    deal.state.energy = 8;
    deal.state.condition.nutrition = 40;
    deal.state.gels = 1;
    const eaten = applyEatGel(deal.state);
    expect(eaten.ok).toBe(true);
    expect(eaten.state.condition.nutrition).toBe(58);
    expect(eaten.state.gels).toBe(0);
    const gel = applyPurchase(fresh(), "gel");
    expect(gel.state.coins).toBe(36);
  });

  it("lets Honey Stinger fuel turn a sure bonk into a finish", () => {
    const state = primed(3);
    const signed = accept(state, "nutrition", "honey-stinger").state;
    signed.condition.nutrition = 34;
    signed.condition.sleepQuality = "poor";
    const raced = applyRace(signed, "5k", 0.99);
    expect(raced.state.progress.fiveKFinished).toBe(true);
    expect(raced.lines.join(" ")).toMatch(/Honey Stinger/);
  });
});

describe("shoe sponsors", () => {
  it("lists every shoe brand from the prototype", () => {
    expect(SHOE_SPONSOR_IDS).toEqual([
      "nike",
      "adidas",
      "hoka",
      "brooks",
      "norda",
      "speedland",
      "mount-to-coast",
      "salomon",
      "satisfy",
    ]);
  });

  it("refuses a locked deal and keeps only one shoe sponsor at a time", () => {
    expect(applySignSponsor(fresh(), "shoe", "brooks").ok).toBe(false);
    expect(applySignSponsor(primed(3), "shoe", "brooks").ok).toBe(false);
    const brooks = accept(primed(3), "shoe", "brooks");
    expect(brooks.state.sponsors.shoe).toBe("brooks");
    const hoka = accept(brooks.state, "shoe", "hoka");
    expect(hoka.ok).toBe(true);
    expect(hoka.state.sponsors.shoe).toBe("hoka");
    expect(hoka.state.sponsors.nutrition).toBeNull();
    expect(hoka.lines.join(" ")).toMatch(/Brooks deal ends/);
  });

  it("keeps bought shoes when you switch and discounts the active brand", () => {
    const state = primed(5);
    state.coins = 200;
    const nike = accept(state, "shoe", "nike");
    const bought = applyShoe(nike.state, "nike-acg");
    expect(bought.ok).toBe(true);
    expect(bought.state.gear.owned).toContain("nike-acg");
    expect(bought.state.coins).toBe(200 - Math.round(150 * 0.65));
    const brooks = accept(bought.state, "shoe", "brooks");
    expect(brooks.state.sponsors.shoe).toBe("brooks");
    expect(brooks.state.gear.owned).toContain("nike-acg");
    expect(brooks.state.gear.equipped).toBe("nike-acg");
  });

  it("pays bonus coins on a clean finish and replaces a worn-out pair for free", () => {
    const state = primed(3);
    state.coins = 200;
    const signed = accept(state, "shoe", "brooks").state;
    const raced = applyRace(signed, "5k", 0.9);
    expect(raced.state.coins).toBe(200 + 28 + 8);

    const worn = accept(primed(3), "shoe", "brooks").state;
    worn.coins = 108;
    const bought = applyShoe(worn, "brooks-hyperion");
    expect(bought.state.coins).toBe(0);
    bought.state.gear.miles["brooks-hyperion"] = 140;
    const replaced = applyShoe(bought.state, "brooks-hyperion");
    expect(replaced.ok).toBe(true);
    expect(replaced.state.coins).toBe(0);
    expect(replaced.state.gear.miles["brooks-hyperion"]).toBe(0);
  });

  it("lets you hold a nutrition sponsor beside the shoe sponsor", () => {
    const shoe = accept(primed(4), "shoe", "brooks");
    const food = accept(shoe.state, "nutrition", "bpn");
    expect(food.state.sponsors.shoe).toBe("brooks");
    expect(food.state.sponsors.nutrition).toBe("bpn");
  });
});

describe("obligations and standing", () => {
  it("leaves a note the morning after you sign, and paying it raises standing", () => {
    const signed = accept(primed(3), "shoe", "brooks");
    const morning = applySleep(signed.state);
    expect(morning.state.sponsors.obligation.sponsorId).toBe("brooks");
    expect(morning.state.sponsors.obligation.label).toBeTruthy();
    const done = applyObligation(morning.state, "accept");
    expect(done.ok).toBe(true);
    expect(done.state.energy).toBe(9);
    expect(done.state.sponsors.obligation).toBeNull();
    expect(done.state.sponsors.standing.brooks).toBe(92);
    expect(done.state.coins).toBe(48 + morning.state.sponsors.obligation.pay);
    expect(done.state.sponsors.shoe).toBe("brooks");
  });

  it("drops the deal after repeated skips and lets you sign again", () => {
    let state = accept(primed(3), "shoe", "brooks").state;
    for (let i = 0; i < 3; i += 1) {
      state.sponsors.obligation = {
        id: `skip-${i}`,
        sponsorId: "brooks",
        kind: "shoe",
        task: "photo",
        label: "Photo shoot",
        pay: 46,
      };
      state = applyObligation(state, "skip").state;
    }
    expect(state.sponsors.shoe).toBeNull();
    expect(state.sponsors.standing.brooks).toBeLessThan(25);
    expect(state.sponsors.cooldowns.brooks).toBe(state.calendar.day + 14);
    expect(grantOffer(state, "shoe", "brooks").ok).toBe(false);
    state.calendar.day += 14;
    const again = accept(state, "shoe", "brooks");
    expect(again.ok).toBe(true);
    expect(again.state.sponsors.shoe).toBe("brooks");
    expect(again.state.sponsors.standing.brooks).toBe(80);
  });

  it("warns before the standing is low enough to drop the deal", () => {
    const state = accept(primed(3), "shoe", "brooks").state;
    state.sponsors.standing.brooks = 50;
    state.sponsors.obligation = {
      id: "warn",
      sponsorId: "brooks",
      kind: "shoe",
      task: "store",
      label: "Store appearance",
      pay: 52,
    };
    const skipped = applyObligation(state, "skip");
    expect(skipped.state.sponsors.shoe).toBe("brooks");
    expect(skipped.state.sponsors.standing.brooks).toBe(28);
    expect(skipped.lines.join(" ")).toMatch(/warns you/);
  });
});

describe("gear sponsors", () => {
  it("covers the catalog belt and vest brands, and treats Naked as a normal name", () => {
    expect(GEAR_SPONSOR_IDS).toEqual([
      "nathan",
      "rei",
      "osprey",
      "camelbak",
      "dera",
      "salomon-gear",
      "naked",
      "satisfy-gear",
    ]);
    // Wild finds are unbranded. They are not a sponsor, so they are not
    // part of this list. A store belt or vest still has to match a deal.
    const brands = new Set(Object.values(CARRY).filter((item) => !item.wild).map((item) => item.brand));
    expect(GEAR_SPONSOR_IDS.map((id) => sponsorById("gear", id).name).sort()).toEqual([...brands].sort());
    for (const id of GEAR_SPONSOR_IDS) {
      const deal = sponsorById("gear", id);
      expect(deal.name).not.toMatch(/joke|naked runner/i);
      expect(deal.starter).toBe(starterCarryId(deal.brands[0]));
      const items = Object.values(CARRY).filter((item) => item.brand === deal.brands[0]);
      const belt = items.find((item) => item.kind === "belt");
      expect(deal.starter).toBe((belt || items[0]).id);
      expect(deal.brands).toEqual([deal.name]);
    }
    expect(sponsorById("gear", "naked").name).toBe("Naked");
    expect(sponsorById("gear", "salomon-gear").name).toBe("Salomon");
    expect(sponsorById("shoe", "salomon").id).not.toBe(sponsorById("gear", "salomon-gear").id);
  });

  it("signs one gear deal beside shoe and nutrition and gives the free belt", () => {
    const state = primed(4);
    const before = state.coins;
    const shoe = accept(state, "shoe", "brooks");
    const food = accept(shoe.state, "nutrition", "bpn");
    const gear = accept(food.state, "gear", "osprey");
    expect(gear.ok).toBe(true);
    expect(gear.state.sponsors.shoe).toBe("brooks");
    expect(gear.state.sponsors.nutrition).toBe("bpn");
    expect(gear.state.sponsors.gear).toBe("osprey");
    expect(gear.state.sponsors.gearTerms.discount).toBe(0.28);
    expect(gear.state.gear.carry).toBe("osprey-belt");
    expect(gear.state.gear.ownedCarry).toEqual(["osprey-belt"]);
    expect(gear.state.coins).toBe(before);
    expect(gear.lines.join(" ")).toMatch(/Osprey Duro Solo Belt/);
    expect(gear.lines.join(" ")).toMatch(/Only one gear sponsor/);

    const second = accept(gear.state, "gear", "nathan");
    expect(second.state.sponsors.gear).toBe("nathan");
    expect(second.state.sponsors.shoe).toBe("brooks");
    expect(second.state.gear.ownedCarry).toEqual(["osprey-belt", "nathan-belt"]);
    expect(second.state.gear.carry).toBe("nathan-belt");
    expect(second.state.sponsors.cooldowns.osprey).toBe(second.state.calendar.day + 14);
  });

  it("discounts that brand's belt and vest, and keeps a better shoe discount", () => {
    const nathan = accept(primed(3), "gear", "nathan").state;
    const ownVest = pricedCarry(nathan, "nathan-vest");
    expect(ownVest.deal).toBe(true);
    expect(ownVest.cost).toBe(Math.round(96 * 0.75));
    expect(pricedCarry(nathan, "osprey-belt").deal).toBe(false);
    expect(pricedCarry(nathan, "nathan-belt").cost).toBe(Math.round(36 * 0.75));

    const both = accept(accept(primed(8), "shoe", "salomon").state, "gear", "salomon-gear").state;
    const shoeOnly = accept(primed(8), "shoe", "salomon").state;
    expect(pricedCarry(both, "salomon-vest").cost).toBeLessThanOrEqual(pricedCarry(shoeOnly, "salomon-vest").cost);
    expect(pricedCarry(both, "salomon-belt").deal).toBe(true);
    expect(gearPerkText(sponsorById("gear", "naked"), null)).toMatch(/Naked vests/);
    expect(gearPerkText(sponsorById("gear", "nathan"), null)).toMatch(/belts and vests/);
  });

  it("pays a small race-coin bonus and a free vest from a vest-only brand", () => {
    const signed = accept(primed(7), "gear", "naked");
    expect(signed.state.gear.carry).toBe("naked-vest");
    expect(signed.state.gear.ownedCarry).toEqual(["naked-vest"]);
    signed.state.coins = 100;
    const raced = applyRace(signed.state, "5k", 0.9);
    expect(raced.state.coins).toBe(100 + 28 + signed.state.sponsors.gearTerms.raceCoins);
    expect(raced.lines.join(" ")).toMatch(/Naked adds/);
  });

  it("buys the other piece at the gear price", () => {
    const signed = accept(primed(3), "gear", "rei").state;
    signed.coins = 200;
    const bought = applyBuyCarry(signed, "rei-vest");
    expect(bought.ok).toBe(true);
    expect(bought.state.coins).toBe(200 - pricedCarry(signed, "rei-vest").cost);
    expect(bought.state.gear.carry).toBe("rei-vest");
    expect(bought.state.gear.ownedCarry).toContain("rei-belt");
  });

  it("settles the wear note when the next race is in their kit", () => {
    const signed = accept(primed(3), "gear", "nathan");
    const morning = applySleep(signed.state);
    expect(morning.state.sponsors.obligation.kind).toBe("gear");
    expect(morning.state.sponsors.obligation.task).toBe("wear");
    expect(morning.state.sponsors.obligation.label).toBe("Wear their belt or vest in your next race");
    expect(applyObligation(morning.state, "accept").ok).toBe(false);
    expect(applyObligation(morning.state, "accept").state.sponsors.obligation.task).toBe("wear");
    const labels = sponsorMenuItems(morning.state).map((row) => row.label);
    expect(labels).toContain("Nathan kit is on");
    expect(labels).toContain("Skip the wear note");
    expect(labels.some((label) => label.startsWith("Gear sponsor: Nathan"))).toBe(true);

    morning.state.coins = 80;
    const raced = applyRace(morning.state, "5k", 0.9);
    expect(raced.state.sponsors.obligation).toBeNull();
    expect(raced.state.sponsors.standing.nathan).toBe(92);
    expect(raced.state.sponsors.gear).toBe("nathan");
    expect(raced.state.coins).toBe(80 + 28 + morning.state.sponsors.gearTerms.raceCoins + morning.state.sponsors.obligation.pay);
    expect(raced.lines.join(" ")).toMatch(/Wear obligation done/);
  });

  it("drops standing when the race is run without their belt or vest", () => {
    const signed = accept(primed(3), "gear", "nathan").state;
    signed.sponsors.obligation = {
      id: "wear-1",
      sponsorId: "nathan",
      kind: "gear",
      task: "wear",
      label: "Wear their belt or vest in your next race",
      pay: 40,
    };
    const bare = applyUnequipCarry(signed);
    expect(bare.state.gear.carry).toBeNull();
    const raced = applyRace(bare.state, "5k", 0.9);
    expect(raced.state.sponsors.gear).toBe("nathan");
    expect(raced.state.sponsors.standing.nathan).toBe(58);
    expect(raced.state.sponsors.obligation).toBeNull();
    expect(raced.lines.join(" ")).toMatch(/without a Nathan belt or vest/);
  });

  it("ends the gear deal after repeated skips and blocks a new offer for 14 days", () => {
    let state = accept(primed(3), "gear", "rei").state;
    for (let i = 0; i < 3; i += 1) {
      state.sponsors.obligation = {
        id: `skip-${i}`,
        sponsorId: "rei",
        kind: "gear",
        task: "wear",
        label: "Wear their belt or vest in your next race",
        pay: 40,
      };
      state = applyObligation(state, "skip").state;
    }
    expect(state.sponsors.gear).toBeNull();
    expect(state.sponsors.gearTerms).toBeNull();
    expect(state.sponsors.standing.rei).toBeLessThan(25);
    expect(state.sponsors.cooldowns.rei).toBe(state.calendar.day + 14);
    expect(state.gear.ownedCarry).toContain("rei-belt");
    expect(grantOffer(state, "gear", "rei").ok).toBe(false);
  });

  it("loads an old save with no gear field as no gear sponsor", () => {
    const legacy = {
      shoe: "nike",
      nutrition: "bpn",
      standing: { nike: 70, bpn: 80 },
      obligation: null,
      seenObligation: true,
    };
    const loaded = normalizeSponsors(legacy);
    expect(loaded.gear).toBeNull();
    expect(loaded.gearTerms).toBeNull();
    expect(loaded.offers).toEqual({ shoe: null, nutrition: null, gear: null });
    expect(loaded.shoe).toBe("nike");
    expect(loaded.nutrition).toBe("bpn");
    expect(loaded.standing.nike).toBe(70);
    expect(normalizeSponsors(null).gear).toBeNull();
    const summary = sponsorSummaryLines({ sponsors: loaded, calendar: { day: 1 } });
    expect(summary[0]).toMatch(/^Shoe sponsor: Nike/);
    expect(summary[1]).toMatch(/^Nutrition sponsor: BPN/);
    expect(summary[2]).toBe("Gear sponsor: none");
  });
});
