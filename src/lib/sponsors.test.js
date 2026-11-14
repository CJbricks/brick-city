/**
 * sponsors.test.js
 * One shoe deal, one nutrition deal, the stack with a vest, and what
 * happens when you skip the photo shoot too many times.
 */

import { describe, expect, it } from "vitest";
import {
  applyEatGel,
  applyObligation,
  applyPurchase,
  applyRace,
  applyRun,
  applyShoe,
  applySignSponsor,
  applySleep,
  createNewGame,
} from "@/lib/activities";
import { NUTRITION_SPONSOR_IDS, SHOE_SPONSOR_IDS, nutritionTuning, sponsorById } from "@/lib/sponsors";
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
    expect(run.state.condition.nutrition).toBe(61);
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
