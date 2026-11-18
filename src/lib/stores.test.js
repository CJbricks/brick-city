/**
 * stores.test.js
 * The deeper catalog has to stay inside the old stat box, every town
 * shelf has to name a real product, and the ids a v1 save already wrote
 * have to resolve to the same pairs.
 */

import { describe, expect, it } from "vitest";
import { HAT_COLORS } from "@/game/brandColors";
import {
  BELT_IDS,
  CARRY,
  HATS,
  NUTRITION,
  SHOE_LIMITS,
  SHOES,
  SOCKS,
  VEST_IDS,
  hatById,
  isHouseShoe,
  itemMinLevel,
  resolveShoeId,
  shoeById,
  sockById,
} from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import { deserialize } from "@/lib/save";
import {
  CITY_STORES,
  STORE_CATEGORIES,
  scaleAmount,
  storeFor,
  storeStock,
} from "@/lib/stores";
import {
  applyBuyFuel,
  applyShoe,
  createNewGame,
  fuelShopItems,
  menuFor,
  productDetail,
  shoeStyleItems,
} from "@/lib/activities";
import { GEAR_SPONSORS, SHOE_SPONSORS, starterCarryId } from "@/lib/sponsors";
import { xpToReachLevel } from "@/lib/xp";

const HEX = /^#[0-9a-fA-F]{6}$/;

function inBand(value, band) {
  return typeof value === "number" && value >= band[0] && value <= band[1];
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

const TABLES = {
  shoes: SHOES,
  belts: CARRY,
  vests: CARRY,
  socks: SOCKS,
  hats: HATS,
  nutrition: NUTRITION,
};

describe("catalog items", () => {
  it("keeps every brand shoe inside the old stat box", () => {
    const ids = new Set();
    const names = new Set();
    for (const [id, shoe] of Object.entries(SHOES)) {
      expect(shoe.id).toBe(id);
      expect(ids.has(id)).toBe(false);
      ids.add(id);
      expect(names.has(shoe.name)).toBe(false);
      names.add(shoe.name);
      expect(shoe.blurb.length).toBeGreaterThan(8);
      if (isHouseShoe(shoe)) continue;
      const box = SHOE_LIMITS[shoe.style];
      expect(box, shoe.id).toBeTruthy();
      expect(inBand(shoe.price, box.price), shoe.id).toBe(true);
      expect(inBand(shoe.maxMiles, box.maxMiles), shoe.id).toBe(true);
      expect(itemMinLevel(shoe)).toBeGreaterThanOrEqual(1);
      for (const [key, band] of Object.entries(box)) {
        if (key === "price" || key === "maxMiles") continue;
        expect(inBand(shoe.mods[key], band), `${shoe.id} ${key}`).toBe(true);
      }
    }
  });

  it("gives each shoe brand 2 to 4 models in each style it already covered", () => {
    const expected = {
      trail: ["Nike", "Norda", "Speedland", "Hoka", "Mount to Coast", "Adidas", "Salomon", "Satisfy"],
      road: ["Hoka", "Adidas", "Nike", "Brooks"],
      versatile: ["Norda", "Speedland", "Mount to Coast", "Adidas", "Hoka", "Salomon"],
    };
    const brandShoes = Object.values(SHOES).filter((shoe) => !isHouseShoe(shoe));
    for (const [style, brands] of Object.entries(expected)) {
      const counts = countBy(brandShoes.filter((shoe) => shoe.style === style), (shoe) => shoe.brand);
      expect(Object.keys(counts).sort()).toEqual([...brands].sort());
      for (const brand of brands) {
        expect(counts[brand], `${brand} ${style}`).toBeGreaterThanOrEqual(2);
        expect(counts[brand], `${brand} ${style}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("gives belts, vests, hats, and socks several models without new brands", () => {
    const belts = countBy(BELT_IDS.map((id) => CARRY[id]), (item) => item.brand);
    const vests = countBy(VEST_IDS.map((id) => CARRY[id]), (item) => item.brand);
    expect(Object.keys(belts).sort()).toEqual(["Dera", "Nathan", "Osprey", "REI", "Salomon"]);
    expect(Object.keys(vests).sort()).toEqual(["CamelBak", "Naked", "Nathan", "REI", "Salomon", "Satisfy"]);
    for (const count of [...Object.values(belts), ...Object.values(vests)]) {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
    }
    const hats = countBy(Object.values(HATS), (item) => item.brand);
    expect(Object.keys(hats).sort()).toEqual(["BPN", "Bandit", "Ciele", "Nike ACG", "rnnr"]);
    for (const count of Object.values(hats)) {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
    }
    for (const hat of Object.values(HATS)) {
      expect(hat.heatCut === 1 || hat.heatCut === 2).toBe(true);
      expect(HAT_COLORS[hat.colorKey]).toBeTruthy();
    }
    const socks = countBy(
      Object.values(SOCKS).filter((item) => item.brand !== "Brickside"),
      (item) => item.brand,
    );
    expect(Object.keys(socks).sort()).toEqual(["Balega", "Darn Tough", "Feetures", "Injinji"]);
    for (const sock of Object.values(SOCKS)) {
      expect(sock.ultraFatigueCut).toBeGreaterThanOrEqual(2);
      expect(sock.ultraFatigueCut).toBeLessThanOrEqual(4);
      expect(HEX.test(sock.color)).toBe(true);
    }
  });

  it("keeps gels, shakes, and flasks as flavors of the old pockets", () => {
    const kinds = countBy(Object.values(NUTRITION), (item) => item.kind);
    expect(kinds.gel).toBeGreaterThanOrEqual(8);
    expect(kinds.shake).toBeGreaterThanOrEqual(2);
    expect(kinds.flask).toBeGreaterThanOrEqual(3);
    const gelBrands = new Set(Object.values(NUTRITION).filter((item) => item.kind === "gel").map((item) => item.brand));
    expect([...gelBrands].sort()).toEqual(["BPN", "Honey Stinger", "Maurten", "Precision", "Stride Fuel"]);
    for (const item of Object.values(NUTRITION)) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.price).toBeLessThanOrEqual(22);
      expect(item.id).toBeTruthy();
      expect(NUTRITION[item.id]).toBe(item);
    }
    expect(NUTRITION.gel.price).toBe(12);
    expect(NUTRITION["bpn-gel"].price).toBe(14);
    expect(NUTRITION.shake.price).toBe(16);
  });
});

describe("town shelves", () => {
  it("gives every city a shelf of real ids, and Summit the whole catalog", () => {
    expect(Object.keys(CITY_STORES).sort()).toEqual(Object.keys(CITIES).sort());
    const sellableShoes = Object.values(SHOES).filter((shoe) => shoe.price > 0).map((shoe) => shoe.id);
    for (const cityId of Object.keys(CITIES)) {
      const shop = storeFor(cityId);
      expect(shop.priceScale).toBeGreaterThan(0);
      expect(shop.menuTitle.length).toBeGreaterThan(0);
      for (const category of STORE_CATEGORIES) {
        const stock = storeStock(cityId, category);
        expect(stock.length, `${cityId} ${category}`).toBeGreaterThan(0);
        expect(new Set(stock).size).toBe(stock.length);
        for (const id of stock) {
          expect(TABLES[category][id], `${cityId} ${category} ${id}`).toBeTruthy();
          if (category === "belts") expect(CARRY[id].kind).toBe("belt");
          if (category === "vests") expect(CARRY[id].kind).toBe("vest");
        }
      }
    }
    expect(storeStock("summit-hollow", "shoes").sort()).toEqual([...sellableShoes].sort());
    expect(storeStock("summit-hollow", "belts")).toEqual(BELT_IDS);
    expect(storeStock("summit-hollow", "vests")).toEqual(VEST_IDS);
    expect(storeStock("summit-hollow", "nutrition").sort()).toEqual(Object.keys(NUTRITION).sort());
  });

  it("leans trail, road, or backyard by town, and prices Summit above the rest", () => {
    function styles(cityId) {
      const counts = { trail: 0, road: 0, versatile: 0 };
      for (const id of storeStock(cityId, "shoes")) counts[shoeById(id).style] += 1;
      return counts;
    }
    const ridge = styles("ridgeview");
    const lake = styles("lakeport");
    const flats = styles("flatland");
    const brick = styles("brick-city");
    expect(ridge.trail).toBeGreaterThan(ridge.road);
    expect(lake.road).toBeGreaterThan(lake.trail);
    expect(flats.versatile).toBeGreaterThan(flats.trail);
    expect(brick.trail).toBeGreaterThan(8);
    expect(brick.road).toBeGreaterThan(4);
    expect(brick.versatile).toBeGreaterThan(6);
    expect(storeStock("mesa-verde-flats", "hats")).toEqual(Object.keys(HATS));

    const scales = Object.values(CITY_STORES).map((shop) => shop.priceScale);
    expect(storeFor("summit-hollow").priceScale).toBe(Math.max(...scales));
    expect(storeFor("flatland").priceScale).toBe(Math.min(...scales));
    const prices = [
      ...Object.values(SHOES).map((shoe) => shoe.price),
      ...Object.values(CARRY).map((item) => item.price),
      ...Object.values(SOCKS).map((item) => item.price),
      ...Object.values(HATS).map((item) => item.price),
      ...Object.values(NUTRITION).map((item) => item.price),
    ];
    for (const price of prices) {
      if (price <= 0) continue;
      const summit = scaleAmount("summit-hollow", price);
      for (const cityId of Object.keys(CITIES)) {
        expect(summit).toBeGreaterThanOrEqual(scaleAmount(cityId, price));
      }
      expect(summit).toBeGreaterThan(scaleAmount("brick-city", price));
    }
  });

  it("shows Brick City's deeper trail wall as pages, then an item detail", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    const menu = menuFor("store", state);
    expect(menu.items.map((row) => row.label)).toEqual(expect.arrayContaining([
      "Shoes", "Belts", "Vests", "Socks", "Hats", "Nutrition",
    ]));
    const trail = shoeStyleItems(state, "trail");
    const names = trail.filter((row) => !row.header).map((row) => row.label);
    expect(names).toEqual(expect.arrayContaining(["Nike ACG Ultrafly", "Hoka Speedgoat", "Salomon Speedcross"]));
    expect(names).not.toContain("Norda 002");
    expect(trail.find((row) => row.label === "Nike ACG Ultrafly").action).toEqual({ type: "inspect", kind: "shoe", id: "nike-acg" });
    const detail = productDetail(state, "shoe", "nike-acg");
    expect(detail.title).toBe("Nike ACG Ultrafly");
    expect(detail.intro).toMatch(/Trail/);
    expect(detail.items[0].action).toEqual({ type: "shoe", id: "nike-acg" });
    const gels = fuelShopItems(state, "gel").filter((row) => !row.header);
    expect(gels.length).toBeGreaterThan(2);
    expect(gels.map((row) => row.label)).toContain("BPN gel");
  });
});

describe("old ids and the level gate", () => {
  it("resolves the ids a v1 closet already wrote", () => {
    for (const id of ["starter", "road", "trail", "hybrid", "nike-acg", "norda-001", "hoka-cielo", "brooks-hyperion", "norda-005"]) {
      expect(resolveShoeId(id)).toBe(id);
      expect(shoeById(id).id).toBe(id);
    }
    expect(resolveShoeId("not-a-shoe")).toBe("starter");
    expect(shoeById("nike-acg").price).toBe(150);
    expect(shoeById("nike-alphafly").mods.speed).toBe(0.1);
    expect(CARRY["nathan-belt"].price).toBe(36);
    expect(CARRY["salomon-vest"].price).toBe(110);
    expect(sockById("darn-tough").ultraFatigueCut).toBe(4);
    expect(hatById("ciele").heatCut).toBe(2);
    expect(NUTRITION.gel.id).toBe("gel");
    expect(NUTRITION["bpn-gel"].id).toBe("bpn-gel");
    expect(NUTRITION.shake.id).toBe("shake");

    for (const deal of Object.values(SHOE_SPONSORS)) {
      for (const name of deal.shoes) {
        expect(Object.values(SHOES).some((shoe) => shoe.name === name), name).toBe(true);
      }
    }
    for (const deal of Object.values(GEAR_SPONSORS)) {
      expect(CARRY[deal.starter].brand).toBe(deal.brands[0]);
      expect(deal.starter).toBe(starterCarryId(deal.brands[0]));
    }

    const legacy = {
      version: 1,
      runner: { name: "Ada", gender: "female" },
      xp: { overall: 0, trail: 0, marathon: 0, ultra: 0, versatile: 0 },
      condition: { nutrition: 70, fatigue: 12, endurance: 24, peak: 20, sleepQuality: "good", sleepHours: 8 },
      calendar: { day: 1, slot: 0 },
      gear: { equipped: "trail", owned: ["starter", "trail"], miles: { trail: 12 } },
      coins: 48,
    };
    const loaded = deserialize(JSON.stringify(legacy));
    expect(loaded.gear.equipped).toBe("trail");
    expect(loaded.gear.miles.trail).toBe(12);
    expect(shoeById(loaded.gear.equipped).name).toBe("Peakline Lugger");
  });

  it("refuses a later pair until the level, and a pair this town does not stock", () => {
    const poor = createNewGame({ name: "Ada", gender: "female" });
    poor.coins = 400;
    const early = applyShoe(poor, "nike-acg-fly");
    expect(early.ok).toBe(false);
    expect(early.state.coins).toBe(400);
    expect(early.state.gear.equipped).toBe("starter");

    const ready = createNewGame({ name: "Ada", gender: "female" });
    ready.xp.overall = xpToReachLevel(4);
    ready.coins = 400;
    const bought = applyShoe(ready, "nike-acg-fly");
    expect(bought.ok).toBe(true);
    expect(bought.state.gear.equipped).toBe("nike-acg-fly");
    expect(bought.state.coins).toBe(400 - shoeById("nike-acg-fly").price);

    const high = createNewGame({ name: "Ada", gender: "female" });
    high.xp.overall = xpToReachLevel(8);
    high.coins = 400;
    const elsewhere = applyShoe(high, "norda-002");
    expect(elsewhere.ok).toBe(false);
    expect(elsewhere.state.gear.owned).toEqual(["starter"]);

    const fuel = applyBuyFuel(poor, "maurten-160");
    expect(fuel.ok).toBe(false);
    const houseGel = applyBuyFuel(poor, "gel");
    expect(houseGel.ok).toBe(true);
    expect(houseGel.state.gels).toBe(1);
    expect(houseGel.state.coins).toBe(400 - 12);
  });
});
