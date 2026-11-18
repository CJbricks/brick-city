/**
 * stores.js
 * Which catalog ids each town actually sells, and how the price tag feels.
 *
 * The products live in src/lib/catalog.js. This file is only the shelf.
 * Brick City is the only walkable Run Store. The other five towns are
 * the same kind of record the clinic and the coffee shop already keep:
 * design data a later map can hang a door on. Summit Hollow stocks the
 * whole catalog and multiplies the tag, which is why its clinic and its
 * coffee shop were already the expensive ones.
 *
 * A model can be missing from a town on purpose. Ridgeview leans trail.
 * Lakeport leans marathon. Flatland leans backyard and a cheaper tag.
 * Mesa Verde leans long miles, cushion, and hats (the motto is short
 * shade). Brick City's wall is the deep mixed one you can actually shop.
 *
 * priceScale is applied in activities.js when a button charges you.
 * Scale 1 is Brick City, so a save that never left town still pays the
 * number printed on the product. Do not bake a town's price into the
 * catalog or the house trail pair stops costing 90.
 */

import {
  BELT_IDS,
  HAT_IDS,
  NUTRITION_IDS,
  SHOES,
  SOCK_IDS,
  VEST_IDS,
} from "@/lib/catalog";

function sellableShoeIds() {
  return Object.values(SHOES).filter((shoe) => shoe.price > 0).map((shoe) => shoe.id);
}

/**
 * Hand-picked shelves. Summit is not in this object: it is the full
 * catalog, built below, so a new product is for sale there on the day
 * it is added to catalog.js. The other towns have to be edited.
 */
const CURATED = {
  "brick-city": {
    menuTitle: "Run Store",
    priceScale: 1,
    feel: "Deep mixed wall at the sticker price.",
    intro: "Manager Nia is lacing a demo shoe on the stool.\nTrail, marathon, and backyard each have their own page. A long page scrolls.",
    shoes: [
      "trail", "road", "hybrid",
      "nike-acg", "nike-acg-daily", "nike-acg-fly",
      "norda-001", "norda-005",
      "speedland-gstam", "speedland-glpdx",
      "hoka-tecton", "hoka-speedgoat", "hoka-zinal", "hoka-cielo", "hoka-rocket", "hoka-mach", "hoka-bondi", "hoka-challenger", "hoka-transport",
      "mtc-t1", "mtc-r1",
      "adidas-agravic", "adidas-soulstride", "adidas-adios", "adidas-boston", "adidas-hybrid", "adidas-door",
      "salomon-ultra", "salomon-speedcross", "salomon-genesis", "salomon-aero",
      "satisfy-rocker",
      "nike-alphafly", "nike-vaporfly", "nike-vomero",
      "brooks-hyperion", "brooks-ghost", "brooks-glycerin",
    ],
    belts: [
      "nathan-belt", "nathan-race", "nathan-trailmix",
      "osprey-belt", "osprey-duro-light",
      "rei-belt", "rei-trail-belt", "rei-race-belt",
      "salomon-belt", "salomon-sense-belt",
      "dera-b01",
    ],
    vests: [
      "camelbak-vest", "camelbak-ultra",
      "nathan-vest", "nathan-pinnacle-12",
      "salomon-vest", "salomon-adv-12",
      "naked-vest",
      "rei-vest", "rei-swift-vest",
      "satisfy-vest",
    ],
    socks: [
      "socks-generic", "balega", "balega-blister", "darn-tough", "darn-tough-micro",
      "feetures", "feetures-max", "injinji", "injinji-trail",
    ],
    hats: [
      "ciele", "ciele-sc", "bandit", "bandit-trail", "nike-acg-hat", "nike-acg-sun",
      "rnnr", "rnnr-distance", "bpn-hat", "bpn-trail-hat",
    ],
    nutrition: [
      "gel", "stride-citrus", "stride-cola", "stride-berry",
      "bpn-gel", "bpn-citrus", "bpn-berry",
      "honey-gold", "honey-smoothie",
      "maurten-100",
      "shake", "bpn-gim",
      "flask", "nathan-flask",
    ],
  },
  ridgeview: {
    menuTitle: "Ridgeview Store",
    priceScale: 1.12,
    feel: "Trail wall, vests, and a higher tag than Brick City.",
    intro: "The ridge shop. Lugs and vests first. The tags sit a little above Brick City.",
    shoes: [
      "nike-acg", "nike-acg-fly",
      "norda-001", "norda-002", "norda-daily", "norda-005",
      "speedland-gstam", "speedland-plate", "speedland-daily",
      "hoka-tecton", "hoka-mafate", "hoka-mach",
      "mtc-t1", "mtc-ridge", "mtc-r1",
      "adidas-agravic", "adidas-agravic-speed",
      "salomon-ultra", "salomon-pulsar", "salomon-speedcross", "salomon-genesis",
      "satisfy-rocker", "satisfy-daily", "satisfy-mud",
      "brooks-ghost",
    ],
    belts: ["dera-b01", "dera-b02", "dera-race", "salomon-belt", "osprey-belt", "osprey-duro-dyna"],
    vests: [
      "salomon-vest", "salomon-adv-12", "salomon-sense-pro",
      "nathan-vest", "nathan-vaporhowe",
      "camelbak-vest", "camelbak-ultra",
      "naked-vest", "naked-hc",
      "satisfy-vest", "satisfy-race",
    ],
    socks: ["darn-tough", "darn-tough-micro", "injinji", "injinji-trail"],
    hats: ["nike-acg-hat", "nike-acg-trail-hat", "ciele", "ciele-trk"],
    nutrition: ["honey-gold", "honey-cherry", "maurten-100", "maurten-caf", "shake", "salomon-flask", "flask"],
  },
  lakeport: {
    menuTitle: "Lakeport Store",
    priceScale: 1.06,
    feel: "Marathon wall. A little above the Brick City sticker.",
    intro: "Road shoes, race belts, and the fast gels. Dirt is a side rack.",
    shoes: [
      "hoka-cielo", "hoka-rocket", "hoka-mach", "hoka-bondi", "hoka-zinal", "hoka-transport",
      "adidas-adios", "adidas-takumi", "adidas-boston", "adidas-primex", "adidas-agravic-speed", "adidas-hybrid",
      "nike-alphafly", "nike-vaporfly", "nike-streakfly", "nike-vomero",
      "brooks-hyperion", "brooks-hyperion-max", "brooks-ghost", "brooks-glycerin",
      "mtc-r1",
    ],
    belts: ["nathan-belt", "nathan-race", "nathan-trailmix", "rei-belt", "rei-race-belt"],
    vests: ["nathan-vest", "nathan-vaporhowe", "rei-vest"],
    socks: ["feetures", "feetures-max", "feetures-merino", "balega"],
    hats: ["rnnr", "rnnr-distance", "bandit", "bandit-trail", "bpn-hat", "bpn-race-hat"],
    nutrition: [
      "gel", "stride-citrus", "bpn-gel", "bpn-citrus", "bpn-berry",
      "precision-30", "precision-caf", "shake", "bpn-gim", "nathan-flask",
    ],
  },
  "mesa-verde-flats": {
    menuTitle: "Mesa Verde Store",
    priceScale: 0.95,
    feel: "Long miles, cushion, and every hat. A notch under Brick City.",
    intro: "Shade is short out here, so the hat wall is the long one. Cushion shoes and flasks fill the rest.",
    shoes: [
      "hoka-speedgoat", "hoka-bondi", "hoka-challenger", "hoka-transport", "hoka-skyward",
      "mtc-t1", "mtc-cushion", "mtc-r1", "mtc-road-cushion", "mtc-allday",
      "salomon-sense", "salomon-genesis", "salomon-allday",
      "norda-005-cushion", "norda-allday",
      "adidas-longday", "adidas-soulstride",
      "nike-vomero", "brooks-glycerin",
    ],
    belts: ["osprey-belt", "osprey-duro-light", "rei-trail-belt", "rei-belt"],
    vests: ["camelbak-vest", "camelbak-ultra", "camelbak-circuit", "salomon-adv-12", "rei-swift-vest"],
    socks: ["darn-tough", "injinji", "injinji-trail", "balega-blister", "feetures-merino", "socks-generic"],
    hats: [...HAT_IDS],
    nutrition: ["honey-gold", "honey-smoothie", "honey-cherry", "shake", "flask", "camelbak-flask", "nathan-flask"],
  },
  flatland: {
    menuTitle: "Flatland Store",
    priceScale: 0.88,
    feel: "Backyard ultras and the cheapest tags in the circuit.",
    intro: "Last one standing. Belts, long-day shoes, and prices under every other town.",
    shoes: [
      "norda-005", "norda-005-cushion", "norda-allday",
      "speedland-glpdx", "speedland-gl-daily", "speedland-gl-cushion",
      "mtc-r1", "mtc-road-cushion", "mtc-allday",
      "adidas-hybrid", "adidas-door", "adidas-longday",
      "hoka-challenger", "hoka-transport", "hoka-skyward", "hoka-speedgoat",
      "salomon-genesis", "salomon-aero", "salomon-allday",
      "brooks-ghost", "adidas-boston",
    ],
    belts: [
      "rei-trail-belt", "rei-belt", "rei-race-belt",
      "nathan-belt", "nathan-race",
      "osprey-belt", "osprey-duro-light",
      "salomon-belt", "dera-b01", "dera-race",
    ],
    vests: ["rei-swift-vest", "nathan-pinnacle-12", "camelbak-ultra", "salomon-adv-12", "satisfy-long", "naked-hc"],
    socks: ["socks-generic", "balega", "balega-enduro", "feetures", "darn-tough-light"],
    hats: ["bandit", "bandit-race", "rnnr", "rnnr-race", "ciele-trk"],
    nutrition: ["gel", "stride-cola", "stride-berry", "honey-gold", "shake", "flask"],
  },
};

const SUMMIT_SCALE = 1.4;

export const CITY_STORES = {
  ...CURATED,
  "summit-hollow": {
    menuTitle: "Summit Store",
    priceScale: SUMMIT_SCALE,
    feel: "Every product, at the highest tag on the map.",
    intro: "The Summit Store hangs the whole catalog. Nothing is missing. Nothing is cheap.",
    shoes: sellableShoeIds(),
    belts: [...BELT_IDS],
    vests: [...VEST_IDS],
    socks: [...SOCK_IDS],
    hats: [...HAT_IDS],
    nutrition: [...NUTRITION_IDS],
  },
};

export const STORE_CATEGORIES = ["shoes", "belts", "vests", "socks", "hats", "nutrition"];

export function storeCityId(state) {
  const id = state?.city;
  if (id && CITY_STORES[id]) return id;
  return "brick-city";
}

export function storeFor(cityId) {
  return CITY_STORES[cityId] || CITY_STORES["brick-city"];
}

export function storeStock(cityId, category) {
  const shop = storeFor(cityId);
  const list = shop[category];
  return Array.isArray(list) ? list : [];
}

export function storeSells(state, category, id) {
  return storeStock(storeCityId(state), category).includes(id);
}

export function scaleAmount(cityId, amount) {
  const base = Number(amount);
  if (!Number.isFinite(base)) return 0;
  return Math.max(0, Math.round(base * storeFor(cityId).priceScale));
}

/**
 * A sponsor quote is { cost, base, deal, free }. Brick City's scale is
 * 1, so the object comes back untouched and an old test still sees the
 * catalog coin. Other towns scale the tag first, then keep the same
 * discount fraction, so "was 210" matches the number on the shelf.
 */
export function scaleQuote(cityId, quote) {
  if (!quote || quote.free || !(quote.base > 0)) return quote;
  if (storeFor(cityId).priceScale === 1) return quote;
  const base = scaleAmount(cityId, quote.base);
  if (!quote.deal) return { ...quote, base, cost: base };
  const ratio = quote.cost / quote.base;
  return { ...quote, base, cost: Math.max(0, Math.round(base * ratio)) };
}

export function cityIds() {
  return Object.keys(CITIES);
}
