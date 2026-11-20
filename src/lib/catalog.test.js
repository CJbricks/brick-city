/**
 * catalog.test.js
 * The deeper shelf: every product is a real row, every unlock city is a
 * real town, the rack only grows as you reach towns, and the ids a save
 * already wrote still name the same products.
 */

import { describe, expect, it } from "vitest";
import {
  arriveInCity,
  applyBuyCarry,
  applyPurchase,
  applyShoe,
  applySignSponsor,
  createNewGame,
  menuFor,
  presentShop,
} from "@/lib/activities";
import {
  CARRY,
  CITY_UNLOCK_ORDER,
  FUEL,
  HATS,
  SHOES,
  SOCKS,
  citiesReached,
  hatById,
  isUnlocked,
  shoeById,
  unlockCityOf,
} from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import { deserialize, serialize } from "@/lib/save";
import {
  GEAR_SPONSOR_IDS,
  SHOE_SPONSOR_IDS,
  sponsorById,
  starterCarryId,
} from "@/lib/sponsors";
import { xpToReachLevel } from "@/lib/xp";

const HOUSE = new Set(["Brickside", "Tempo", "Peakline", "Switchback"]);

const ORIGINAL_SHOES = {
  trail: ["nike-acg", "norda-001", "speedland-gstam", "hoka-tecton", "mtc-t1", "adidas-agravic", "salomon-ultra", "satisfy-rocker"],
  road: ["hoka-cielo", "adidas-adios", "nike-alphafly", "brooks-hyperion"],
  versatile: ["norda-005", "speedland-glpdx", "mtc-r1", "adidas-hybrid", "hoka-challenger", "salomon-genesis"],
};

const ORIGINAL_NAMES = {
  starter: "Brickside Trainers",
  road: "Tempo Daybreak",
  trail: "Peakline Lugger",
  hybrid: "Switchback Hybrid",
  "nike-acg": "Nike ACG Ultrafly",
  "nike-alphafly": "Nike Alphafly",
  "norda-001": "Norda 001",
  "nathan-belt": "Nathan Zipster Race Belt",
  "naked-vest": "Naked Running Vest",
  ciele: "Ciele GOCap",
  "darn-tough": "Darn Tough Run",
  gel: "Stride Fuel gel",
  "bpn-gel": "BPN gel",
  shake: "Protein shake",
};

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

function modValue(shoe, key) {
  return shoe.mods?.[key] || 0;
}

function rangeOf(values) {
  return { min: Math.min(...values), max: Math.max(...values) };
}

describe("the city shelf", () => {
  it("keeps every original id pointed at the same product, unlocked in Brick City", () => {
    for (const [id, name] of Object.entries(ORIGINAL_NAMES)) {
      const item = SHOES[id] || CARRY[id] || HATS[id] || SOCKS[id] || FUEL[id];
      expect(item, id).toBeTruthy();
      expect(item.name).toBe(name);
      expect(item.id).toBe(id);
      expect(unlockCityOf(item)).toBe("brick-city");
      expect(shoeById(id).id === id || !SHOES[id]).toBe(true);
    }
    expect(shoeById("trail").name).toBe("Peakline Lugger");
    expect(shoeById("not-a-shoe").id).toBe("starter");
    expect(hatById("ciele").name).toBe("Ciele GOCap");
  });

  it("gives every sold product a real city, a name, and a brand the game already had", () => {
    const shoeBrands = new Set([
      "Nike", "Norda", "Speedland", "Hoka", "Mount to Coast", "Adidas", "Salomon", "Satisfy", "Brooks",
    ]);
    const seen = new Set();
    for (const [id, shoe] of Object.entries(SHOES)) {
      expect(shoe.id).toBe(id);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      expect(shoe.name).toBeTruthy();
      expect(shoe.blurb).toBeTruthy();
      expect(CITIES[unlockCityOf(shoe)]).toBeTruthy();
      expect(shoe.price).toBeGreaterThanOrEqual(0);
      expect(shoe.maxMiles).toBeGreaterThan(0);
      if (!HOUSE.has(shoe.brand) && shoe.id !== "starter") expect(shoeBrands.has(shoe.brand)).toBe(true);
    }
    for (const table of [CARRY, SOCKS, HATS, FUEL]) {
      for (const [id, item] of Object.entries(table)) {
        expect(item.id).toBe(id);
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
        expect(item.name).toBeTruthy();
        if (item.wild) {
          expect(unlockCityOf(item)).toBeNull();
          continue;
        }
        expect(CITIES[unlockCityOf(item)], id).toBeTruthy();
      }
    }
  });

  it("stocks at least 5 models of each brand in each style it sells", () => {
    const expected = {
      trail: ["Nike", "Norda", "Speedland", "Hoka", "Mount to Coast", "Adidas", "Salomon", "Satisfy"],
      road: ["Hoka", "Adidas", "Nike", "Brooks", "Mount to Coast"],
      versatile: ["Norda", "Speedland", "Mount to Coast", "Adidas", "Hoka", "Salomon"],
    };
    for (const [style, brands] of Object.entries(expected)) {
      const found = new Set();
      for (const brand of brands) {
        const models = Object.values(SHOES).filter((shoe) => shoe.style === style && shoe.brand === brand);
        expect(models.length, `${brand} ${style}`).toBeGreaterThanOrEqual(5);
        found.add(brand);
      }
      const extras = Object.values(SHOES).filter((shoe) => shoe.style === style && !HOUSE.has(shoe.brand));
      for (const shoe of extras) expect(found.has(shoe.brand), shoe.id).toBe(true);
    }
  });

  it("puts Mount to Coast H1 on Trail and Backyard, and C1 on Marathon, from Brick City", () => {
    const trailH1 = Object.values(SHOES).filter((shoe) => shoe.name === "Mount to Coast H1" && shoe.style === "trail");
    const yardH1 = Object.values(SHOES).filter((shoe) => shoe.name === "Mount to Coast H1" && shoe.style === "versatile");
    const c1 = Object.values(SHOES).filter((shoe) => shoe.name === "Mount to Coast C1" && shoe.style === "road");
    expect(trailH1).toHaveLength(1);
    expect(yardH1).toHaveLength(1);
    expect(c1).toHaveLength(1);
    expect(trailH1[0].id).toBe("mtc-h1");
    expect(yardH1[0].id).toBe("mtc-h1-yard");
    expect(c1[0].id).toBe("mtc-c1");
    expect(unlockCityOf(trailH1[0])).toBe("brick-city");
    expect(unlockCityOf(yardH1[0])).toBe("brick-city");
    expect(unlockCityOf(c1[0])).toBe("brick-city");
    const freshState = fresh();
    expect(isUnlocked(trailH1[0], freshState)).toBe(true);
    expect(isUnlocked(yardH1[0], freshState)).toBe(true);
    expect(isUnlocked(c1[0], freshState)).toBe(true);
  });

  it("keeps later models inside the original stat ranges and prices Summit Hollow higher", () => {
    for (const [style, ids] of Object.entries(ORIGINAL_SHOES)) {
      const originals = ids.map((id) => SHOES[id]);
      const keys = new Set(originals.flatMap((shoe) => Object.keys(shoe.mods)));
      const miles = rangeOf(originals.map((shoe) => shoe.maxMiles));
      const prices = rangeOf(originals.map((shoe) => shoe.price));
      const later = Object.values(SHOES).filter((shoe) => shoe.style === style && !ids.includes(shoe.id) && !HOUSE.has(shoe.brand));
      for (const shoe of later) {
        expect(shoe.maxMiles).toBeGreaterThanOrEqual(miles.min);
        expect(shoe.maxMiles).toBeLessThanOrEqual(miles.max);
        for (const key of Object.keys(shoe.mods)) expect(keys.has(key), shoe.id).toBe(true);
        for (const key of keys) {
          const span = rangeOf(originals.map((item) => modValue(item, key)));
          const value = modValue(shoe, key);
          expect(value).toBeGreaterThanOrEqual(span.min);
          expect(value).toBeLessThanOrEqual(span.max);
        }
        if (shoe.unlock === "summit-hollow") expect(shoe.price).toBeGreaterThan(prices.max);
        else expect(shoe.price).toBeLessThanOrEqual(prices.max);
      }
    }
  });

  it("grows the unlocked set with each city and does not drop models when you go back", () => {
    let state = fresh();
    let previous = new Set();
    for (const cityId of CITY_UNLOCK_ORDER) {
      const arrived = arriveInCity(state, cityId);
      expect(arrived.ok, cityId).toBe(true);
      state = arrived.state;
      const unlocked = new Set(
        [...Object.values(SHOES), ...Object.values(CARRY), ...Object.values(SOCKS), ...Object.values(HATS), ...Object.values(FUEL)]
          .filter((item) => !item.wild && isUnlocked(item, state))
          .map((item) => item.id),
      );
      for (const id of previous) expect(unlocked.has(id), id).toBe(true);
      if (cityId !== "brick-city") {
        expect(unlocked.size).toBeGreaterThan(previous.size);
        expect(arrived.lines.join(" ")).toMatch(/NEW/);
      }
      previous = unlocked;
    }
    expect(citiesReached(state)).toEqual(CITY_UNLOCK_ORDER);
    expect(state.city).toBe("brick-city");
    const still = presentShop({ type: "open-shop-style", style: "trail" }, state);
    expect(still.items.some((row) => row.label.startsWith("NEW"))).toBe(true);
    expect(menuFor("store", state).intro).toMatch(/Summit Hollow/);
    expect(menuFor("store", fresh()).intro).not.toMatch(/NEW/);

    const pricedOnly = fresh();
    pricedOnly.city = "summit-hollow";
    expect(citiesReached(pricedOnly)).toEqual(["brick-city"]);
    expect(isUnlocked(SHOES["nike-acg-summit"], pricedOnly)).toBe(false);
  });

  it("hides a locked model from the counter and still lets a sponsor hand one over", () => {
    const locked = Object.values(SHOES).find((shoe) => shoe.unlock === "summit-hollow");
    const buyer = fresh();
    buyer.coins = 1000;
    expect(applyShoe(buyer, locked.id).ok).toBe(false);
    expect(buyer.coins).toBe(1000);
    const there = arriveInCity(buyer, "summit-hollow").state;
    there.coins = 1000;
    const bought = applyShoe(there, locked.id);
    expect(bought.ok).toBe(true);
    expect(bought.state.gear.owned).toContain(locked.id);

    const belt = CARRY["osprey-belt"];
    const previous = belt.unlock;
    belt.unlock = "summit-hollow";
    try {
      const broke = applyBuyCarry(fresh(), "osprey-belt");
      expect(broke.ok).toBe(false);
      const runner = fresh();
      runner.xp.overall = xpToReachLevel(4);
      runner.progress.fiveKFinished = true;
      runner.sponsors.offers.gear = {
        id: "osprey",
        kind: "gear",
        offeredOn: runner.calendar.day,
        expiresOn: runner.calendar.day + 3,
        discount: 0.28,
        raceCoins: 5,
      };
      const signed = applySignSponsor(runner, "gear", "osprey");
      expect(signed.ok).toBe(true);
      expect(signed.state.gear.carry).toBe("osprey-belt");
    } finally {
      belt.unlock = previous;
    }
  });

  it("points every sponsor gift and shoe name at a real catalog row", () => {
    expect(starterCarryId("Nathan")).toBe("nathan-belt");
    expect(starterCarryId("Osprey")).toBe("osprey-belt");
    expect(starterCarryId("Naked")).toBe("naked-vest");
    expect(starterCarryId("CamelBak")).toBe("camelbak-vest");
    for (const id of SHOE_SPONSOR_IDS) {
      const deal = sponsorById("shoe", id);
      for (const name of deal.shoes) {
        expect(Object.values(SHOES).some((shoe) => shoe.name === name), name).toBe(true);
      }
    }
    for (const id of GEAR_SPONSOR_IDS) {
      const deal = sponsorById("gear", id);
      expect(CARRY[deal.starter], id).toBeTruthy();
    }
  });

  it("pages a long gel case and opens an item detail", () => {
    const home = presentShop({ type: "open-shop-style", style: "trail" }, fresh());
    expect(home.tabs.map((tab) => tab.label)).toEqual(["Trail", "Marathon", "Backyard"]);
    expect(home.items.some((row) => row.label.includes("Nike"))).toBe(true);
    expect(home.items.some((row) => row.label.startsWith("NEW"))).toBe(false);
    const nike = home.items.find((row) => row.label.includes("Nike"));
    const models = presentShop(nike.action, fresh());
    expect(models.items.length).toBeGreaterThan(0);
    const detail = presentShop(models.items[0].action, fresh());
    expect(detail.testId).toBe("item-detail");
    expect(detail.intro).toMatch(/miles/);
    expect(detail.items[0].action.type).toBe("shoe");

    const summit = arriveInCity(fresh(), "summit-hollow").state;
    const gels = presentShop({ type: "open-fuel-kind", kind: "gel", page: 0 }, summit);
    expect(gels.tabs.map((tab) => tab.label)).toEqual(["Gels", "Shakes", "Flasks"]);
    expect(gels.items.some((row) => row.label === "Next page")).toBe(true);
    const pageTwo = presentShop({ type: "open-fuel-kind", kind: "gel", page: 1 }, summit);
    expect(pageTwo.items.some((row) => row.action?.type === "open-gear-detail" || row.action?.type === "buy" || row.label === "Previous page")).toBe(true);
    const earlyGel = applyPurchase(fresh(), "gel");
    expect(earlyGel.ok).toBe(true);
    expect(applyPurchase(fresh(), "maurten-caf").ok).toBe(false);
  });

  it("loads an old save as Brick City with the original shelf", () => {
    const legacy = fresh();
    delete legacy.citiesReached;
    legacy.city = "summit-hollow";
    legacy.gear.equipped = "nike-acg";
    legacy.gear.owned = ["starter", "nike-acg"];
    const loaded = deserialize(serialize(legacy));
    expect(loaded.city).toBe("summit-hollow");
    expect(loaded.citiesReached).toEqual(["brick-city"]);
    expect(loaded.gear.equipped).toBe("nike-acg");
    expect(shoeById(loaded.gear.equipped).name).toBe("Nike ACG Ultrafly");
    const shelf = presentShop({ type: "open-shop-style", style: "trail" }, loaded);
    expect(shelf.items.some((row) => row.label.startsWith("NEW"))).toBe(false);
    expect(isUnlocked(SHOES["nike-acg-summit"], loaded)).toBe(false);
    expect(isUnlocked(SHOES["nike-acg"], loaded)).toBe(true);
  });
});
