/**
 * gear.test.js
 * The brand closet, the fuel rack, and the mountain's trail-shoe rule.
 * Legacy house pairs stay here too, because old saves still equip them.
 */

import { describe, expect, it } from "vitest";
import {
  BELT_IDS,
  CARRY,
  ROAD_SHOE_IDS,
  TRAIL_SHOE_IDS,
  VERSATILE_SHOE_IDS,
  carryNutrition,
  maxNutritionFromGear,
  shoeById,
} from "@/lib/catalog";
import { BELT_NUTRITION, MAX_NUTRITION, VEST_NUTRITION } from "@/lib/constants";
import {
  applyBuyHat,
  applyBuySock,
  applyEquipHat,
  applyEquipSock,
  applyProtein,
  applyPurchase,
  applyRun,
  applyUnequipCarry,
  applyUnequipHat,
  applyUnequipSock,
  createNewGame,
  menuFor,
  perform,
} from "@/lib/activities";
import { HAT_IDS, SOCK_IDS, hatById, sockById } from "@/lib/catalog";
import { runnerLook } from "@/game/art";
import { HAT_COLORS } from "@/game/brandColors";
import { RACES, gearLine, gearModForStyle, readiness } from "@/lib/race";
import { isMountainOpen } from "@/lib/unlocks";
import { xpToReachLevel } from "@/lib/xp";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

function gateReady() {
  const state = fresh();
  state.xp.overall = xpToReachLevel(8);
  state.progress.parkTrailRuns = 5;
  return state;
}

describe("brand shoes", () => {
  it("keeps the starter pair and the house ids", () => {
    expect(shoeById("starter").name).toBe("Brickside Trainers");
    expect(shoeById("trail").name).toBe("Peakline Lugger");
    expect(shoeById("trail").style).toBe("trail");
    expect(shoeById("road").style).toBe("road");
    expect(shoeById("hybrid").style).toBe("versatile");
    expect(shoeById("not-a-shoe").id).toBe("starter");
  });

  it("gives every trail shoe a climb bonus and a road penalty", () => {
    expect(TRAIL_SHOE_IDS).toEqual(expect.arrayContaining([
      "nike-acg", "norda-001", "speedland-gstam", "hoka-tecton", "mtc-t1", "adidas-agravic", "salomon-ultra", "satisfy-rocker",
    ]));
    expect(TRAIL_SHOE_IDS.length).toBeGreaterThan(8);
    for (const id of TRAIL_SHOE_IDS) {
      const shoe = shoeById(id);
      expect(shoe.style).toBe("trail");
      expect(shoe.mods.trail).toBeGreaterThan(0);
      expect(shoe.mods.road).toBeLessThan(0);
      expect(shoe.mods.climbing).toBeGreaterThan(0);
      expect(shoe.price).toBeGreaterThan(0);
    }
    const names = TRAIL_SHOE_IDS.map((id) => shoeById(id).name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every marathon shoe road speed and an ultra fatigue tax", () => {
    expect(ROAD_SHOE_IDS).toEqual(expect.arrayContaining([
      "hoka-cielo", "adidas-adios", "nike-alphafly", "brooks-hyperion",
    ]));
    expect(ROAD_SHOE_IDS.length).toBeGreaterThan(4);
    for (const id of ROAD_SHOE_IDS) {
      const shoe = shoeById(id);
      expect(shoe.style).toBe("road");
      expect(shoe.mods.road).toBeGreaterThan(0);
      expect(shoe.mods.speed).toBeGreaterThan(0);
      expect(shoe.mods.trail).toBeLessThan(0);
      expect(shoe.mods.ultraFatigue).toBeGreaterThan(0);
    }
  });

  it("gives every backyard shoe versatile pace and short-road and steep penalties", () => {
    expect(VERSATILE_SHOE_IDS).toEqual(expect.arrayContaining([
      "norda-005", "speedland-glpdx", "mtc-r1", "adidas-hybrid", "hoka-challenger", "salomon-genesis",
    ]));
    expect(VERSATILE_SHOE_IDS.length).toBeGreaterThan(6);
    for (const id of VERSATILE_SHOE_IDS) {
      const shoe = shoeById(id);
      expect(shoe.style).toBe("versatile");
      expect(shoe.mods.versatile).toBeGreaterThan(0);
      expect(shoe.mods.shortRoad).toBeLessThan(0);
      expect(shoe.mods.steepTrail).toBeLessThan(0);
    }
  });

  it("opens the mountain for any trail shoe and keeps other styles shut", () => {
    for (const id of [...TRAIL_SHOE_IDS, "trail"]) {
      const state = gateReady();
      state.gear.equipped = id;
      expect(isMountainOpen(state), id).toBe(true);
    }
    for (const id of [...ROAD_SHOE_IDS, ...VERSATILE_SHOE_IDS, "starter", "road", "hybrid"]) {
      const state = gateReady();
      state.gear.equipped = id;
      expect(isMountainOpen(state), id).toBe(false);
    }
  });

  it("still describes the house trail pair the way the old card did", () => {
    const state = fresh();
    state.gear.equipped = "trail";
    state.gear.owned = ["starter", "trail"];
    state.gear.miles.trail = 0;
    expect(gearLine(state.gear, "road")).toBe("Peakline Lugger (fresh): −5% road pace");
    expect(gearModForStyle(state.gear, "trail").mod).toBeCloseTo(0.08);
    state.gear.miles.trail = 120;
    expect(gearLine(state.gear, "road")).toBe("Peakline Lugger (worn out): −13% road pace");
  });

  it("adds climbing on dirt and extra fatigue on a long run in marathon shoes", () => {
    const plainTrail = applyRun(fresh(), "park-trail");
    const geared = fresh();
    geared.gear.equipped = "nike-acg";
    geared.gear.owned = ["starter", "nike-acg"];
    geared.gear.miles["nike-acg"] = 0;
    const trail = applyRun(geared, "park-trail");
    expect(plainTrail.state.attributes.strength).toBe(6);
    expect(trail.state.attributes.strength).toBeGreaterThan(6);

    const plainLong = applyRun(fresh(), "long-run");
    const fast = fresh();
    fast.gear.equipped = "nike-alphafly";
    fast.gear.owned = ["starter", "nike-alphafly"];
    fast.gear.miles["nike-alphafly"] = 0;
    const long = applyRun(fast, "long-run");
    expect(long.state.condition.fatigue).toBe(plainLong.state.condition.fatigue + shoeById("nike-alphafly").mods.ultraFatigue);
  });
});

describe("belts and vests", () => {
  it("lists five belts at +5 and six vests at +10", () => {
    expect(BELT_IDS).toEqual(expect.arrayContaining([
      "nathan-belt", "osprey-belt", "rei-belt", "salomon-belt", "dera-b01",
    ]));
    expect(BELT_IDS.length).toBeGreaterThan(5);
    expect(Object.values(CARRY).filter((item) => item.kind === "vest" && !item.wild).length).toBeGreaterThan(6);
    expect(Object.values(CARRY).filter((item) => item.kind === "vest" && !item.wild).map((item) => item.id))
      .toEqual(expect.arrayContaining(["camelbak-vest", "nathan-vest", "salomon-vest", "naked-vest", "rei-vest", "satisfy-vest"]));
    expect(carryNutrition(CARRY["generic-belt"])).toBe(3);
    expect(carryNutrition(CARRY["generic-vest"])).toBe(7);
    expect(CARRY["generic-vest"].shortRoad).toBeLessThan(CARRY["camelbak-vest"].shortRoad);
    for (const id of BELT_IDS) {
      expect(CARRY[id].kind).toBe("belt");
      expect(carryNutrition(CARRY[id])).toBe(BELT_NUTRITION);
      expect(CARRY[id].shortRoad).toBe(0);
    }
    for (const id of Object.keys(CARRY).filter((key) => CARRY[key].kind === "vest" && !CARRY[key].wild)) {
      expect(carryNutrition(CARRY[id])).toBe(VEST_NUTRITION);
      expect(CARRY[id].shortRoad).toBeLessThan(0);
    }
  });

  it("raises the nutrition cap to 105 or 110 and clamps meals to it", () => {
    const bare = fresh();
    expect(maxNutritionFromGear(bare.gear)).toBe(MAX_NUTRITION);
    bare.gear.carry = "nathan-belt";
    expect(maxNutritionFromGear(bare.gear)).toBe(105);
    bare.gear.carry = "salomon-vest";
    expect(maxNutritionFromGear(bare.gear)).toBe(110);

    const eating = fresh();
    eating.gear.carry = "salomon-vest";
    eating.gear.ownedCarry = ["salomon-vest"];
    eating.condition.nutrition = 90;
    eating.coins = 40;
    const meal = applyPurchase(eating, "meal");
    expect(meal.state.condition.nutrition).toBe(110);

    const off = applyUnequipCarry(meal.state);
    expect(off.state.gear.carry).toBeNull();
    expect(off.state.condition.nutrition).toBe(100);
    expect(maxNutritionFromGear(off.state.gear)).toBe(100);
  });

  it("taxes a vest on the 5K and not on an easy run, and a belt taxes neither", () => {
    const vested = fresh();
    vested.gear.carry = "camelbak-vest";
    vested.gear.ownedCarry = ["camelbak-vest"];
    expect(readiness(vested, RACES["5k"]).gearMod).toBeCloseTo(-0.04);
    const easy = applyRun(vested, "easy-run");
    expect(easy.state.condition.nutrition).toBe(56);
    expect(easy.state.condition.peak).toBe(21);

    const belted = fresh();
    belted.gear.carry = "dera-b01";
    expect(readiness(belted, RACES["5k"]).gearMod).toBeCloseTo(0);
    expect(maxNutritionFromGear(belted.gear)).toBe(105);
  });
});

describe("socks, hats, shakes, and BPN gels", () => {
  it("sells socks and hats, and equips and unequips them", () => {
    const store = menuFor("store", fresh());
    expect(store.items.map((row) => row.label)).toEqual(expect.arrayContaining(["Socks", "Hats", "Nutrition"]));
    const buyer = fresh();
    buyer.coins = 80;
    const socks = applyBuySock(buyer, "darn-tough");
    expect(socks.ok).toBe(true);
    expect(socks.state.gear.socks).toBe("darn-tough");
    expect(socks.state.gear.ownedSocks).toContain("darn-tough");
    expect(socks.state.coins).toBe(80 - sockById("darn-tough").price);
    const off = applyUnequipSock(socks.state);
    expect(off.state.gear.socks).toBeNull();
    expect(off.state.gear.ownedSocks).toContain("darn-tough");
    const on = applyEquipSock(off.state, "darn-tough");
    expect(on.state.gear.socks).toBe("darn-tough");

    const hat = applyBuyHat(on.state, "ciele");
    expect(hat.state.gear.hat).toBe("ciele");
    expect(applyUnequipHat(hat.state).state.gear.hat).toBeNull();
    expect(applyEquipHat(applyUnequipHat(hat.state).state, "ciele").state.gear.hat).toBe("ciele");

    const broke = fresh();
    broke.coins = 1;
    expect(applyBuySock(broke, "balega").ok).toBe(false);
    expect(broke.coins).toBe(1);
    expect(applyBuyHat(broke, "rnnr").ok).toBe(false);
  });

  it("cuts long-ultra fatigue with socks and tiring-run fatigue with a hat", () => {
    const plain = applyRun(fresh(), "long-run");
    const socked = fresh();
    socked.gear.socks = "darn-tough";
    socked.gear.ownedSocks = ["darn-tough"];
    const long = applyRun(socked, "long-run");
    expect(plain.state.condition.fatigue - long.state.condition.fatigue).toBe(sockById("darn-tough").ultraFatigueCut);

    const bare = applyRun(fresh(), "park-trail");
    const hatted = fresh();
    hatted.gear.hat = "ciele";
    hatted.gear.ownedHats = ["ciele"];
    const trail = applyRun(hatted, "park-trail");
    expect(bare.state.condition.fatigue - trail.state.condition.fatigue).toBe(hatById("ciele").heatCut);

    const easyBare = applyRun(fresh(), "easy-run");
    const easyHat = applyRun(hatted, "easy-run");
    expect(easyHat.state.condition.fatigue).toBe(easyBare.state.condition.fatigue);
  });

  it("paints the hat color on the cap and leaves the shirt alone", () => {
    expect(HAT_IDS).toEqual(expect.arrayContaining(["ciele", "bandit", "nike-acg-hat", "rnnr", "bpn-hat"]));
    expect(SOCK_IDS).toContain("injinji");
    const state = fresh();
    state.gear.hat = "ciele";
    state.sponsors.shoe = "nike";
    const look = runnerLook(state);
    expect(look.cap).toBe(HAT_COLORS.ciele.color);
    expect(look.panel).toBe(HAT_COLORS.ciele.panel);
    expect(look.shirt).not.toBe(HAT_COLORS.ciele.color);
  });

  it("drinks a protein shake for fatigue and soreness at no energy cost", () => {
    const state = fresh();
    state.shakes = 1;
    state.condition.fatigue = 40;
    state.condition.sore = true;
    const drunk = applyProtein(state);
    expect(drunk.ok).toBe(true);
    expect(drunk.state.condition.fatigue).toBe(24);
    expect(drunk.state.condition.sore).toBe(false);
    expect(drunk.state.shakes).toBe(0);
    expect(drunk.state.energy).toBe(state.energy);
    expect(applyProtein(drunk.state).ok).toBe(false);
  });

  it("sells a BPN gel at the sponsor discount, same as other gels", () => {
    const grocery = menuFor("grocery", fresh());
    expect(grocery.items.map((row) => row.action.id)).toContain("bpn-gel");
    const full = applyPurchase(fresh(), "bpn-gel");
    expect(full.state.gels).toBe(1);
    expect(full.state.coins).toBe(48 - 14);
    const sponsored = fresh();
    sponsored.sponsors.nutrition = "bpn";
    const deal = applyPurchase(sponsored, "bpn-gel");
    expect(deal.state.coins).toBe(48 - Math.round(14 * 0.75));
    expect(deal.lines.join(" ")).toMatch(/BPN/);
    const shake = perform(fresh(), { type: "buy", id: "shake" });
    expect(shake.ok).toBe(true);
    expect(shake.state.shakes).toBe(1);
    expect(shake.state.energy).toBe(10);
  });
});
