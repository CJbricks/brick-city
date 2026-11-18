/**
 * catalog.js
 * The shoe closet, the fuel-carry rack, socks, hats, and the fuel pocket.
 *
 * Shoes decide which style of running you are good at. A belt or a vest
 * decides how much food you can carry. Socks trim a little fatigue on a
 * long run. A hat trims a little fatigue on any hard run (the stand-in
 * for sun, because the game has no weather meter). You wear one pair of
 * shoes, optionally one fuel item, one pair of socks, and one hat.
 * Sponsors (src/lib/sponsors.js) discount shoes, belts, vests, and gels.
 * They do not replace this list.
 *
 * The house pairs `road`, `trail`, and `hybrid` stay in the catalog so a
 * save from before the brand shoes existed still names a real pair.
 * `resolveShoeId` is the alias table. New games can still buy those
 * house pairs. The starter trainers are not for sale.
 *
 * Each brand that already had a shoe, a belt, a vest, a hat, or a sock
 * has more models here. No new brands. A later model is not allowed to
 * beat the old best numbers: SHOE_LIMITS is that fence, and a higher
 * price or a minLevel is how a sharp pair stays out of a day-one closet.
 * Which town actually hangs a model on the wall is src/lib/stores.js.
 * Gels, shakes, and flasks are flavors of three pockets, not three new
 * effects, so a Maurten gel cannot outrun a bonk the house gel would not.
 */

import {
  BELT_NUTRITION,
  BPN_GEL_COST,
  MAX_NUTRITION,
  SHAKE_COST,
  SHOE_REPLACE_RATIO,
  STARTER_REPLACE_COST,
  VEST_NUTRITION,
} from "@/lib/constants";

/**
 * Old saves wrote these ids. They still point at the house pairs below.
 * An id this map does not know, and that is not in SHOES, becomes starter
 * on load so a typo cannot crash the closet.
 */
export const LEGACY_SHOE_IDS = {
  road: "road",
  trail: "trail",
  hybrid: "hybrid",
};

const HOUSE = {
  starter: {
    id: "starter",
    name: "Brickside Trainers",
    brand: "Brickside",
    style: "basic",
    price: 0,
    maxMiles: 80,
    blurb: "The pair you showed up in. Honest, and they wear out.",
    mods: { road: 0, trail: 0, versatile: 0 },
  },
  road: {
    id: "road",
    name: "Tempo Daybreak",
    brand: "Tempo",
    style: "road",
    price: 80,
    maxMiles: 140,
    blurb: "House road racers. Quick on the track, slick in the mud.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.05, ultraFatigue: 3 },
  },
  trail: {
    id: "trail",
    name: "Peakline Lugger",
    brand: "Peakline",
    style: "trail",
    price: 90,
    maxMiles: 120,
    blurb: "House lugs for the dirt loop and the ridge.",
    mods: { road: -0.05, trail: 0.08, versatile: 0, climbing: 0.06 },
  },
  hybrid: {
    id: "hybrid",
    name: "Switchback Hybrid",
    brand: "Switchback",
    style: "versatile",
    price: 85,
    maxMiles: 130,
    blurb: "House road-to-trail. A little slow at the sharp end.",
    mods: { road: -0.03, trail: -0.03, versatile: 0.07 },
  },
};

/**
 * Brand shoes. Numbers are fractions of pace (0.08 means +8%).
 * climbing and speed add attribute points on matching sessions.
 * ultraFatigue is extra fatigue points on long ultras, not a percent.
 * shortRoad and steepTrail apply only in those situations, so a backyard
 * shoe is not punished on an easy jog or a flat park trail.
 */
const BRAND_SHOES = {
  "nike-acg": {
    id: "nike-acg",
    name: "Nike ACG Ultrafly",
    brand: "Nike",
    style: "trail",
    price: 150,
    maxMiles: 160,
    blurb: "Trail racer. Grippy on the ridge, heavy on the track.",
    mods: { road: -0.06, trail: 0.09, versatile: 0, climbing: 0.1 },
  },
  "norda-001": {
    id: "norda-001",
    name: "Norda 001",
    brand: "Norda",
    style: "trail",
    price: 210,
    maxMiles: 220,
    blurb: "Stiff trail shoe. The climb likes it. The oval does not.",
    mods: { road: -0.07, trail: 0.1, versatile: 0, climbing: 0.12 },
  },
  "speedland-gstam": {
    id: "speedland-gstam",
    name: "Speedland GS:TAM",
    brand: "Speedland",
    style: "trail",
    price: 190,
    maxMiles: 180,
    blurb: "A trail plate. Fast on dirt, clumsy on the track.",
    mods: { road: -0.05, trail: 0.09, versatile: 0, climbing: 0.11 },
  },
  "hoka-tecton": {
    id: "hoka-tecton",
    name: "Hoka Tecton X",
    brand: "Hoka",
    style: "trail",
    price: 160,
    maxMiles: 170,
    blurb: "Light trail racer. Still a trail shoe when the road starts.",
    mods: { road: -0.05, trail: 0.08, versatile: 0, climbing: 0.08 },
  },
  "mtc-t1": {
    id: "mtc-t1",
    name: "Mount to Coast T1",
    brand: "Mount to Coast",
    style: "trail",
    price: 170,
    maxMiles: 200,
    blurb: "Long-trail cushion. The ridge feels shorter. The track does not.",
    mods: { road: -0.04, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "adidas-agravic": {
    id: "adidas-agravic",
    name: "Adidas Terrex Agravic Speed Ultra",
    brand: "Adidas",
    style: "trail",
    price: 165,
    maxMiles: 180,
    blurb: "Terrex trail racer. Mud first, marathon pace second.",
    mods: { road: -0.06, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "salomon-ultra": {
    id: "salomon-ultra",
    name: "Salomon S/Lab Ultra Glide",
    brand: "Salomon",
    style: "trail",
    price: 185,
    maxMiles: 190,
    blurb: "Lab trail shoe. Climbs well. The road penalty is the bill.",
    mods: { road: -0.05, trail: 0.09, versatile: 0, climbing: 0.1 },
  },
  "satisfy-rocker": {
    id: "satisfy-rocker",
    name: "Satisfy TheROCKER",
    brand: "Satisfy",
    style: "trail",
    price: 200,
    maxMiles: 150,
    blurb: "A rockered trail shoe. Helpful on climbs, sloppy on the oval.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.07 },
  },
  "hoka-cielo": {
    id: "hoka-cielo",
    name: "Hoka Cielo X1",
    brand: "Hoka",
    style: "road",
    price: 220,
    maxMiles: 110,
    blurb: "Marathon racer. Springy on the road, fragile in the mud.",
    mods: { road: 0.1, trail: -0.07, versatile: 0, speed: 0.08, ultraFatigue: 5 },
  },
  "adidas-adios": {
    id: "adidas-adios",
    name: "Adidas Adizero Adios Pro",
    brand: "Adidas",
    style: "road",
    price: 200,
    maxMiles: 120,
    blurb: "Road marathon shoe. The rods like pavement, not roots.",
    mods: { road: 0.09, trail: -0.06, versatile: 0, speed: 0.08, ultraFatigue: 4 },
  },
  "nike-alphafly": {
    id: "nike-alphafly",
    name: "Nike Alphafly",
    brand: "Nike",
    style: "road",
    price: 240,
    maxMiles: 100,
    blurb: "The fast marathon pair. Long ultras collect a fatigue tax.",
    mods: { road: 0.1, trail: -0.08, versatile: 0, speed: 0.1, ultraFatigue: 6 },
  },
  "brooks-hyperion": {
    id: "brooks-hyperion",
    name: "Brooks Hyperion Elite",
    brand: "Brooks",
    style: "road",
    price: 180,
    maxMiles: 140,
    blurb: "Marathon racer. Honest speed, unhappy on a wet trail.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "norda-005": {
    id: "norda-005",
    name: "Norda 005",
    brand: "Norda",
    style: "versatile",
    price: 200,
    maxMiles: 240,
    blurb: "Backyard and road-ultra shoe. A bit dull in a short road race.",
    mods: { road: 0, trail: 0, versatile: 0.08, shortRoad: -0.04, steepTrail: -0.04 },
  },
  "speedland-glpdx": {
    id: "speedland-glpdx",
    name: "Speedland GL:PDX",
    brand: "Speedland",
    style: "versatile",
    price: 185,
    maxMiles: 220,
    blurb: "All-day shoe for yards and road ultras. Not a 5K spike.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.04 },
  },
  "mtc-r1": {
    id: "mtc-r1",
    name: "Mount to Coast R1",
    brand: "Mount to Coast",
    style: "versatile",
    price: 170,
    maxMiles: 230,
    blurb: "Road ultra cruiser. The steep ridge still wants lugs.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "adidas-hybrid": {
    id: "adidas-hybrid",
    name: "Adidas Terrex Ultra Hybrid",
    brand: "Adidas",
    style: "versatile",
    price: 160,
    maxMiles: 210,
    blurb: "Terrex hybrid for backyards. Short road races feel the weight.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "hoka-challenger": {
    id: "hoka-challenger",
    name: "Hoka Challenger",
    brand: "Hoka",
    style: "versatile",
    price: 150,
    maxMiles: 220,
    blurb: "Door-to-trail cushion. Fine for yards, soft on a steep climb.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
  "salomon-genesis": {
    id: "salomon-genesis",
    name: "Salomon Genesis",
    brand: "Salomon",
    style: "versatile",
    price: 165,
    maxMiles: 230,
    blurb: "A versatile trail-road shoe. The backyard likes it more than a 5K does.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.03 },
  },
};

/**
 * More models for brands that already had one pair in a style.
 * The ids above this object are the ones old saves already wrote.
 * They stay put. These ids are new, so a v1 closet that never saw
 * them simply does not own them.
 *
 * Numbers stay inside SHOE_LIMITS (the old best and the old worst).
 * A race pair spends miles faster or taxes the wrong surface. A
 * cushion pair lasts longer and gives less pace. minLevel, when it
 * is above 1, is the other price: you cannot buy it on day one.
 */
const MORE_SHOES = {
  "nike-acg-fly": {
    id: "nike-acg-fly",
    name: "Nike ACG Mountain Fly",
    brand: "Nike",
    style: "trail",
    price: 175,
    maxMiles: 150,
    minLevel: 4,
    blurb: "Lighter ACG trail shoe. The climb likes it. The miles do not.",
    mods: { road: -0.07, trail: 0.08, versatile: 0, climbing: 0.11 },
  },
  "nike-acg-daily": {
    id: "nike-acg-daily",
    name: "Nike ACG Trail Trainer",
    brand: "Nike",
    style: "trail",
    price: 145,
    maxMiles: 200,
    blurb: "Daily ACG trainer. More miles, less snap on a steep pitch.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.07 },
  },
  "norda-002": {
    id: "norda-002",
    name: "Norda 002",
    brand: "Norda",
    style: "trail",
    price: 205,
    maxMiles: 220,
    minLevel: 6,
    blurb: "Cushioned Norda. The ridge feels shorter. It is not the 001's plate.",
    mods: { road: -0.05, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "norda-daily": {
    id: "norda-daily",
    name: "Norda Daily Trail",
    brand: "Norda",
    style: "trail",
    price: 175,
    maxMiles: 210,
    minLevel: 5,
    blurb: "The everyday Norda. Honest lugs, none of the 001's sting.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.08 },
  },
  "speedland-plate": {
    id: "speedland-plate",
    name: "Speedland Trail Plate",
    brand: "Speedland",
    style: "trail",
    price: 200,
    maxMiles: 160,
    minLevel: 7,
    blurb: "A second trail plate. Fast while it lasts, clumsy on the oval.",
    mods: { road: -0.06, trail: 0.09, versatile: 0, climbing: 0.1 },
  },
  "speedland-daily": {
    id: "speedland-daily",
    name: "Speedland Daily Trail",
    brand: "Speedland",
    style: "trail",
    price: 165,
    maxMiles: 200,
    minLevel: 4,
    blurb: "Daily Speedland. The plate is gone, so the miles last longer.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.08 },
  },
  "hoka-speedgoat": {
    id: "hoka-speedgoat",
    name: "Hoka Speedgoat",
    brand: "Hoka",
    style: "trail",
    price: 155,
    maxMiles: 220,
    minLevel: 2,
    blurb: "Max-cushion trail. The long ridge likes it. A short climb wants less shoe.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.07 },
  },
  "hoka-zinal": {
    id: "hoka-zinal",
    name: "Hoka Zinal",
    brand: "Hoka",
    style: "trail",
    price: 150,
    maxMiles: 155,
    minLevel: 3,
    blurb: "Light Hoka trail racer. Quick, and it wears out sooner.",
    mods: { road: -0.06, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "hoka-mafate": {
    id: "hoka-mafate",
    name: "Hoka Mafate Speed",
    brand: "Hoka",
    style: "trail",
    price: 175,
    maxMiles: 180,
    minLevel: 5,
    blurb: "A plated trail Hoka under the Tecton. Climbs well, still a dirt shoe.",
    mods: { road: -0.05, trail: 0.08, versatile: 0, climbing: 0.1 },
  },
  "mtc-cushion": {
    id: "mtc-cushion",
    name: "Mount to Coast Trail Cushion",
    brand: "Mount to Coast",
    style: "trail",
    price: 180,
    maxMiles: 220,
    minLevel: 5,
    blurb: "More foam than the T1. The long trail shrinks. The track does not.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.08 },
  },
  "mtc-ridge": {
    id: "mtc-ridge",
    name: "Mount to Coast Ridge Racer",
    brand: "Mount to Coast",
    style: "trail",
    price: 195,
    maxMiles: 160,
    minLevel: 8,
    blurb: "The sharp Mount to Coast trail pair. Fewer miles, more climb.",
    mods: { road: -0.06, trail: 0.09, versatile: 0, climbing: 0.1 },
  },
  "adidas-agravic-speed": {
    id: "adidas-agravic-speed",
    name: "Adidas Terrex Agravic Speed",
    brand: "Adidas",
    style: "trail",
    price: 155,
    maxMiles: 160,
    minLevel: 3,
    blurb: "The shorter Agravic. Mud first, and it is done sooner than the Ultra.",
    mods: { road: -0.05, trail: 0.08, versatile: 0, climbing: 0.08 },
  },
  "adidas-soulstride": {
    id: "adidas-soulstride",
    name: "Adidas Terrex Soulstride",
    brand: "Adidas",
    style: "trail",
    price: 150,
    maxMiles: 210,
    minLevel: 2,
    blurb: "Daily Terrex. The lugs stay, the race snap does not.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.07 },
  },
  "salomon-speedcross": {
    id: "salomon-speedcross",
    name: "Salomon Speedcross",
    brand: "Salomon",
    style: "trail",
    price: 160,
    maxMiles: 170,
    minLevel: 4,
    blurb: "Deep lugs. Mud and climbs. The road penalty is the bill.",
    mods: { road: -0.07, trail: 0.09, versatile: 0, climbing: 0.11 },
  },
  "salomon-pulsar": {
    id: "salomon-pulsar",
    name: "Salomon Pulsar",
    brand: "Salomon",
    style: "trail",
    price: 170,
    maxMiles: 155,
    minLevel: 6,
    blurb: "Light Salomon racer. Fast on dirt, finished early.",
    mods: { road: -0.06, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "salomon-sense": {
    id: "salomon-sense",
    name: "Salomon Sense Ride",
    brand: "Salomon",
    style: "trail",
    price: 155,
    maxMiles: 210,
    minLevel: 3,
    blurb: "Daily Salomon trail shoe. More miles, a softer climb.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.08 },
  },
  "satisfy-daily": {
    id: "satisfy-daily",
    name: "Satisfy Trail Daily",
    brand: "Satisfy",
    style: "trail",
    price: 185,
    maxMiles: 170,
    minLevel: 6,
    blurb: "The everyday Satisfy. Less rocker than TheROCKER, more miles.",
    mods: { road: -0.04, trail: 0.07, versatile: 0, climbing: 0.07 },
  },
  "satisfy-mud": {
    id: "satisfy-mud",
    name: "Satisfy Mud Shoe",
    brand: "Satisfy",
    style: "trail",
    price: 210,
    maxMiles: 150,
    minLevel: 8,
    blurb: "A muddy Satisfy. Grip up, lifespan down, price at the ceiling.",
    mods: { road: -0.06, trail: 0.08, versatile: 0, climbing: 0.09 },
  },
  "hoka-rocket": {
    id: "hoka-rocket",
    name: "Hoka Rocket X",
    brand: "Hoka",
    style: "road",
    price: 200,
    maxMiles: 120,
    minLevel: 4,
    blurb: "Road racer under the Cielo. Less fragile, a little less wild.",
    mods: { road: 0.09, trail: -0.06, versatile: 0, speed: 0.08, ultraFatigue: 4 },
  },
  "hoka-mach": {
    id: "hoka-mach",
    name: "Hoka Mach X",
    brand: "Hoka",
    style: "road",
    price: 180,
    maxMiles: 130,
    minLevel: 3,
    blurb: "A plated trainer. Speed without the Cielo's short life.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "hoka-bondi": {
    id: "hoka-bondi",
    name: "Hoka Bondi",
    brand: "Hoka",
    style: "road",
    price: 165,
    maxMiles: 140,
    blurb: "Max cushion for the road. It lasts. It does not spike.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "adidas-takumi": {
    id: "adidas-takumi",
    name: "Adidas Adizero Takumi Sen",
    brand: "Adidas",
    style: "road",
    price: 190,
    maxMiles: 100,
    minLevel: 5,
    blurb: "Short-road Adidas. Sharp, and the foam is done quickly.",
    mods: { road: 0.09, trail: -0.07, versatile: 0, speed: 0.09, ultraFatigue: 5 },
  },
  "adidas-boston": {
    id: "adidas-boston",
    name: "Adidas Adizero Boston",
    brand: "Adidas",
    style: "road",
    price: 160,
    maxMiles: 140,
    minLevel: 2,
    blurb: "The trainer under the Adios Pro. More days, less pop.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "adidas-primex": {
    id: "adidas-primex",
    name: "Adidas Adizero Prime X",
    brand: "Adidas",
    style: "road",
    price: 230,
    maxMiles: 105,
    minLevel: 6,
    blurb: "The tall Adidas racer. Fast, expensive, and unhappy in mud.",
    mods: { road: 0.1, trail: -0.07, versatile: 0, speed: 0.09, ultraFatigue: 5 },
  },
  "nike-vaporfly": {
    id: "nike-vaporfly",
    name: "Nike Vaporfly",
    brand: "Nike",
    style: "road",
    price: 220,
    maxMiles: 110,
    minLevel: 5,
    blurb: "Marathon racer. A step under the Alphafly, and a little tougher.",
    mods: { road: 0.1, trail: -0.07, versatile: 0, speed: 0.09, ultraFatigue: 5 },
  },
  "nike-streakfly": {
    id: "nike-streakfly",
    name: "Nike Streakfly",
    brand: "Nike",
    style: "road",
    price: 180,
    maxMiles: 100,
    minLevel: 4,
    blurb: "A short-race Nike. The speed is there. The miles are not.",
    mods: { road: 0.09, trail: -0.08, versatile: 0, speed: 0.1, ultraFatigue: 6 },
  },
  "nike-vomero": {
    id: "nike-vomero",
    name: "Nike Vomero",
    brand: "Nike",
    style: "road",
    price: 150,
    maxMiles: 140,
    blurb: "Daily Nike. The pair you can actually train in.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "brooks-hyperion-max": {
    id: "brooks-hyperion-max",
    name: "Brooks Hyperion Max",
    brand: "Brooks",
    style: "road",
    price: 190,
    maxMiles: 120,
    minLevel: 4,
    blurb: "Sharper than the Ghost, a step under the Elite.",
    mods: { road: 0.09, trail: -0.06, versatile: 0, speed: 0.08, ultraFatigue: 4 },
  },
  "brooks-ghost": {
    id: "brooks-ghost",
    name: "Brooks Ghost",
    brand: "Brooks",
    style: "road",
    price: 140,
    maxMiles: 140,
    blurb: "The workhorse. It lasts. It does not win a kick.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "brooks-glycerin": {
    id: "brooks-glycerin",
    name: "Brooks Glycerin",
    brand: "Brooks",
    style: "road",
    price: 155,
    maxMiles: 140,
    minLevel: 2,
    blurb: "Soft Brooks trainer. Cushion first, marathon snap second.",
    mods: { road: 0.08, trail: -0.05, versatile: 0, speed: 0.07, ultraFatigue: 3 },
  },
  "norda-005-cushion": {
    id: "norda-005-cushion",
    name: "Norda 005 Cushion",
    brand: "Norda",
    style: "versatile",
    price: 200,
    maxMiles: 240,
    minLevel: 7,
    blurb: "More foam on the 005. All-day miles, duller when the road gets short.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "norda-allday": {
    id: "norda-allday",
    name: "Norda All Day",
    brand: "Norda",
    style: "versatile",
    price: 175,
    maxMiles: 230,
    minLevel: 5,
    blurb: "The quieter Norda ultra shoe. Fine for yards, soft on a steep ridge.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
  "speedland-gl-daily": {
    id: "speedland-gl-daily",
    name: "Speedland GL Daily",
    brand: "Speedland",
    style: "versatile",
    price: 170,
    maxMiles: 230,
    minLevel: 5,
    blurb: "Daily GL. Less plate than the PDX, more days on the shoe.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
  "speedland-gl-cushion": {
    id: "speedland-gl-cushion",
    name: "Speedland GL Cushion",
    brand: "Speedland",
    style: "versatile",
    price: 200,
    maxMiles: 240,
    minLevel: 7,
    blurb: "The long GL. Backyard miles, and a 5K feels the weight.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.04 },
  },
  "mtc-road-cushion": {
    id: "mtc-road-cushion",
    name: "Mount to Coast Road Cushion",
    brand: "Mount to Coast",
    style: "versatile",
    price: 185,
    maxMiles: 240,
    minLevel: 6,
    blurb: "More foam than the R1. The long road shrinks. A steep trail still wants lugs.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
  "mtc-allday": {
    id: "mtc-allday",
    name: "Mount to Coast All Day",
    brand: "Mount to Coast",
    style: "versatile",
    price: 160,
    maxMiles: 220,
    minLevel: 4,
    blurb: "The everyday Mount to Coast. Yards yes, spikes no.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "adidas-door": {
    id: "adidas-door",
    name: "Adidas Terrex Door-to-Trail",
    brand: "Adidas",
    style: "versatile",
    price: 155,
    maxMiles: 220,
    minLevel: 3,
    blurb: "Door to dirt. Light for a Terrex hybrid, still not a 5K shoe.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
  "adidas-longday": {
    id: "adidas-longday",
    name: "Adidas Terrex Long Day",
    brand: "Adidas",
    style: "versatile",
    price: 175,
    maxMiles: 230,
    minLevel: 5,
    blurb: "The long Terrex day. Backyard pace, and the steep ridge notices.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "hoka-transport": {
    id: "hoka-transport",
    name: "Hoka Transport",
    brand: "Hoka",
    style: "versatile",
    price: 155,
    maxMiles: 220,
    minLevel: 2,
    blurb: "Door-to-trail Hoka. Easy miles. A steep pitch wants lugs.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
  "hoka-skyward": {
    id: "hoka-skyward",
    name: "Hoka Skyward X",
    brand: "Hoka",
    style: "versatile",
    price: 200,
    maxMiles: 210,
    minLevel: 5,
    blurb: "Tall cushion for a long day. The 5K and the steep trail both feel it.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.04, steepTrail: -0.04 },
  },
  "salomon-aero": {
    id: "salomon-aero",
    name: "Salomon Aero Glide",
    brand: "Salomon",
    style: "versatile",
    price: 160,
    maxMiles: 220,
    minLevel: 4,
    blurb: "A smooth Salomon for long road and easy dirt. Not a spike.",
    mods: { road: 0, trail: 0, versatile: 0.07, shortRoad: -0.03, steepTrail: -0.03 },
  },
  "salomon-allday": {
    id: "salomon-allday",
    name: "Salomon All-Day Glide",
    brand: "Salomon",
    style: "versatile",
    price: 150,
    maxMiles: 240,
    minLevel: 2,
    blurb: "The long Salomon day. Miles over snap.",
    mods: { road: 0, trail: 0, versatile: 0.06, shortRoad: -0.02, steepTrail: -0.03 },
  },
};

export const SHOES = { ...HOUSE, ...BRAND_SHOES, ...MORE_SHOES };

const HOUSE_BRANDS = new Set(["Brickside", "Tempo", "Peakline", "Switchback"]);

export function isHouseShoe(shoe) {
  return Boolean(shoe && HOUSE_BRANDS.has(shoe.brand));
}

/**
 * The old best and the old worst, per style. Brand shoes have to land
 * inside these boxes. A new pair can be cushion or speed, not both at
 * a number the closet has never seen, or a day-one runner could skip
 * the shoes the game was balanced on.
 * Price tops are the old most expensive pair in that style (Norda 001,
 * Nike Alphafly, Norda 005). Hitting the ceiling is allowed. Passing
 * it is not.
 */
export const SHOE_LIMITS = {
  trail: {
    price: [140, 210],
    maxMiles: [150, 220],
    trail: [0.07, 0.1],
    road: [-0.08, -0.04],
    climbing: [0.07, 0.12],
  },
  road: {
    price: [140, 240],
    maxMiles: [100, 140],
    road: [0.08, 0.1],
    speed: [0.07, 0.1],
    trail: [-0.08, -0.05],
    ultraFatigue: [3, 6],
  },
  versatile: {
    price: [150, 200],
    maxMiles: [210, 240],
    versatile: [0.06, 0.08],
    shortRoad: [-0.04, -0.02],
    steepTrail: [-0.04, -0.03],
  },
};

export function itemMinLevel(item) {
  const level = item?.minLevel;
  if (typeof level !== "number" || level <= 1) return 1;
  return Math.round(level);
}

function brandShoeIds(style) {
  return Object.values(SHOES)
    .filter((shoe) => shoe.style === style && !isHouseShoe(shoe))
    .map((shoe) => shoe.id);
}

export const TRAIL_SHOE_IDS = brandShoeIds("trail");
export const ROAD_SHOE_IDS = brandShoeIds("road");
export const VERSATILE_SHOE_IDS = brandShoeIds("versatile");

/**
 * Belts are light: +5 max nutrition, no pace penalty, any style.
 * Vests carry more and cost a little speed in a short road race only.
 * The bonus number comes from the kind, not from a per-item field, so a
 * new vest cannot accidentally ship as +7.
 */
export const CARRY = {
  "nathan-belt": {
    id: "nathan-belt",
    name: "Nathan Zipster Race Belt",
    brand: "Nathan",
    kind: "belt",
    price: 36,
    shortRoad: 0,
    blurb: "A light belt. +5 max nutrition. No speed penalty.",
  },
  "osprey-belt": {
    id: "osprey-belt",
    name: "Osprey Duro Solo Belt",
    brand: "Osprey",
    kind: "belt",
    price: 42,
    shortRoad: 0,
    blurb: "Soft flask belt. +5 max nutrition. Works on any course.",
  },
  "rei-belt": {
    id: "rei-belt",
    name: "REI Co-op Swiftland Belt",
    brand: "REI",
    kind: "belt",
    price: 32,
    shortRoad: 0,
    blurb: "The cheap belt. +5 max nutrition. No road penalty.",
  },
  "salomon-belt": {
    id: "salomon-belt",
    name: "Salomon Pulse Belt",
    brand: "Salomon",
    kind: "belt",
    price: 48,
    shortRoad: 0,
    blurb: "Snug race belt. +5 max nutrition. No speed penalty.",
  },
  "dera-b01": {
    id: "dera-b01",
    name: "Dera B01 Dial-Fit Trail Belt",
    brand: "Dera",
    kind: "belt",
    price: 54,
    shortRoad: 0,
    blurb: "Dial-fit trail belt. +5 max nutrition. Still no pace tax.",
  },
  "camelbak-vest": {
    id: "camelbak-vest",
    name: "CamelBak Chase Vest",
    brand: "CamelBak",
    kind: "vest",
    price: 84,
    shortRoad: -0.04,
    blurb: "Hydration vest. +10 max nutrition. −speed in short road races.",
  },
  "nathan-vest": {
    id: "nathan-vest",
    name: "Nathan Pinnacle 4L",
    brand: "Nathan",
    kind: "vest",
    price: 96,
    shortRoad: -0.03,
    blurb: "Race vest. +10 max nutrition. A small 5K penalty.",
  },
  "salomon-vest": {
    id: "salomon-vest",
    name: "Salomon Adv Skin 5",
    brand: "Salomon",
    kind: "vest",
    price: 110,
    shortRoad: -0.04,
    blurb: "The classic vest. +10 max nutrition. Short road races feel it.",
  },
  "naked-vest": {
    id: "naked-vest",
    name: "Naked Running Vest",
    brand: "Naked",
    kind: "vest",
    price: 120,
    shortRoad: -0.03,
    blurb: "Stretch vest. +10 max nutrition. Light, but not weightless.",
  },
  "rei-vest": {
    id: "rei-vest",
    name: "REI Co-op Flash 10 Vest",
    brand: "REI",
    kind: "vest",
    price: 78,
    shortRoad: -0.03,
    blurb: "House vest. +10 max nutrition. Small short-road penalty.",
  },
  "satisfy-vest": {
    id: "satisfy-vest",
    name: "Satisfy TechSilk Drift Vest",
    brand: "Satisfy",
    kind: "vest",
    price: 130,
    shortRoad: -0.05,
    blurb: "Silk vest. +10 max nutrition. The 5K notices the bottles.",
  },
  // More models of the same brands. The nutrition bonus still comes from
  // the kind (+5 belt, +10 vest). A belt cannot grow a secret pocket.
  // A vest's only trade is how much a short road race notices it, the
  // price, and the level. New ids sit after the originals so the free
  // sponsor gift stays the first belt (or the only vest) the brand had.
  "nathan-trailmix": {
    id: "nathan-trailmix",
    name: "Nathan TrailMix Belt",
    brand: "Nathan",
    kind: "belt",
    price: 44,
    shortRoad: 0,
    minLevel: 3,
    blurb: "A deeper Nathan belt. Still +5. Still no pace tax.",
  },
  "nathan-race": {
    id: "nathan-race",
    name: "Nathan Race Belt",
    brand: "Nathan",
    kind: "belt",
    price: 40,
    shortRoad: 0,
    minLevel: 2,
    blurb: "A stripped Nathan belt. +5 max nutrition. No speed penalty.",
  },
  "osprey-duro-light": {
    id: "osprey-duro-light",
    name: "Osprey Duro Light Belt",
    brand: "Osprey",
    kind: "belt",
    price: 46,
    shortRoad: 0,
    minLevel: 3,
    blurb: "A lighter Duro. +5 max nutrition. Any course.",
  },
  "osprey-duro-dyna": {
    id: "osprey-duro-dyna",
    name: "Osprey Duro Dyna Belt",
    brand: "Osprey",
    kind: "belt",
    price: 58,
    shortRoad: 0,
    minLevel: 5,
    blurb: "The flask-ready Duro. +5, and it costs more than the Solo.",
  },
  "rei-trail-belt": {
    id: "rei-trail-belt",
    name: "REI Co-op Trail Belt",
    brand: "REI",
    kind: "belt",
    price: 28,
    shortRoad: 0,
    blurb: "The cheaper co-op belt. +5 max nutrition. No road penalty.",
  },
  "rei-race-belt": {
    id: "rei-race-belt",
    name: "REI Co-op Race Belt",
    brand: "REI",
    kind: "belt",
    price: 40,
    shortRoad: 0,
    minLevel: 3,
    blurb: "A snugger co-op belt. Same +5. It just costs more.",
  },
  "salomon-sense-belt": {
    id: "salomon-sense-belt",
    name: "Salomon Sense Belt",
    brand: "Salomon",
    kind: "belt",
    price: 54,
    shortRoad: 0,
    minLevel: 4,
    blurb: "Sense-line belt. +5 max nutrition. No speed penalty.",
  },
  "salomon-adv-belt": {
    id: "salomon-adv-belt",
    name: "Salomon Adv Skin Belt",
    brand: "Salomon",
    kind: "belt",
    price: 62,
    shortRoad: 0,
    minLevel: 6,
    blurb: "The race-day Salomon belt. Still +5. The tag is the difference.",
  },
  "dera-b02": {
    id: "dera-b02",
    name: "Dera B02 Dial-Fit Belt",
    brand: "Dera",
    kind: "belt",
    price: 62,
    shortRoad: 0,
    minLevel: 7,
    blurb: "The next dial belt. +5 max nutrition. No pace tax.",
  },
  "dera-race": {
    id: "dera-race",
    name: "Dera Race Belt",
    brand: "Dera",
    kind: "belt",
    price: 50,
    shortRoad: 0,
    minLevel: 5,
    blurb: "A lighter Dera. +5, and it unlocks before the B02.",
  },
  "nathan-vaporhowe": {
    id: "nathan-vaporhowe",
    name: "Nathan VaporHowe",
    brand: "Nathan",
    kind: "vest",
    price: 115,
    shortRoad: -0.03,
    minLevel: 5,
    blurb: "Race vest. +10 max nutrition. A small 5K penalty, like the Pinnacle.",
  },
  "nathan-pinnacle-12": {
    id: "nathan-pinnacle-12",
    name: "Nathan Pinnacle 12L",
    brand: "Nathan",
    kind: "vest",
    price: 90,
    shortRoad: -0.05,
    minLevel: 3,
    blurb: "The bigger Pinnacle. +10, and a short road race feels the bottles.",
  },
  "camelbak-ultra": {
    id: "camelbak-ultra",
    name: "CamelBak Ultra Pro Vest",
    brand: "CamelBak",
    kind: "vest",
    price: 96,
    shortRoad: -0.05,
    minLevel: 4,
    blurb: "Long-haul vest. +10. Heavier in a 5K than the Chase.",
  },
  "camelbak-circuit": {
    id: "camelbak-circuit",
    name: "CamelBak Circuit Vest",
    brand: "CamelBak",
    kind: "vest",
    price: 108,
    shortRoad: -0.03,
    minLevel: 5,
    blurb: "Lighter CamelBak. +10, and the 5K penalty is the small one.",
  },
  "salomon-adv-12": {
    id: "salomon-adv-12",
    name: "Salomon Adv Skin 12",
    brand: "Salomon",
    kind: "vest",
    price: 100,
    shortRoad: -0.05,
    minLevel: 4,
    blurb: "The big Adv Skin. +10, and it is slower in a short road race.",
  },
  "salomon-sense-pro": {
    id: "salomon-sense-pro",
    name: "Salomon Sense Pro 5",
    brand: "Salomon",
    kind: "vest",
    price: 135,
    shortRoad: -0.03,
    minLevel: 6,
    blurb: "The light Salomon vest. +10. The 5K penalty stays small.",
  },
  "naked-hc": {
    id: "naked-hc",
    name: "Naked HC Vest",
    brand: "Naked",
    kind: "vest",
    price: 115,
    shortRoad: -0.05,
    minLevel: 6,
    blurb: "High-capacity Naked. +10, and a short road race notices.",
  },
  "naked-race": {
    id: "naked-race",
    name: "Naked Race Vest",
    brand: "Naked",
    kind: "vest",
    price: 140,
    shortRoad: -0.03,
    minLevel: 8,
    blurb: "The light Naked. +10. You pay more to keep the penalty small.",
  },
  "rei-swift-vest": {
    id: "rei-swift-vest",
    name: "REI Co-op Swiftland Vest",
    brand: "REI",
    kind: "vest",
    price: 72,
    shortRoad: -0.04,
    blurb: "The cheap co-op vest. +10, with a middling 5K penalty.",
  },
  "rei-trail-vest": {
    id: "rei-trail-vest",
    name: "REI Co-op Trail Vest",
    brand: "REI",
    kind: "vest",
    price: 95,
    shortRoad: -0.03,
    minLevel: 4,
    blurb: "A lighter co-op vest. +10. The short-road penalty is the small one.",
  },
  "satisfy-race": {
    id: "satisfy-race",
    name: "Satisfy Drift Race Vest",
    brand: "Satisfy",
    kind: "vest",
    price: 150,
    shortRoad: -0.03,
    minLevel: 8,
    blurb: "The light silk vest. +10. The 5K penalty is smaller, and the tag is not.",
  },
  "satisfy-long": {
    id: "satisfy-long",
    name: "Satisfy Long Silk Vest",
    brand: "Satisfy",
    kind: "vest",
    price: 118,
    shortRoad: -0.05,
    minLevel: 6,
    blurb: "The long-day silk vest. +10. A short road race feels the bottles.",
  },
  // Wild finds only. Weaker than the store rack on purpose: a belt the
  // shop sells is +5, this one is +3. A store vest is +10, this one is +7
  // and a little slower in a short road race. `wild` keeps them off the shelf.
  "generic-belt": {
    id: "generic-belt",
    name: "Generic running belt",
    brand: "Plain",
    kind: "belt",
    price: 0,
    nutrition: 3,
    shortRoad: 0,
    wild: true,
    blurb: "Unbranded belt from the grass. +3 max nutrition. No speed penalty.",
  },
  "generic-vest": {
    id: "generic-vest",
    name: "Generic hydration vest",
    brand: "Plain",
    kind: "vest",
    price: 0,
    nutrition: 7,
    shortRoad: -0.05,
    wild: true,
    blurb: "Unbranded vest from the grass. +7 max nutrition. A little slow in a short road race.",
  },
};

/**
 * Socks. ultraFatigueCut is points taken off the fatigue a long ultra
 * adds (the long run, ridge repeats, yards). blisterShield drops the
 * worn-out-shoe strike that leads to a blister. The numbers are small
 * on purpose. color is a brand color for the menu, never a logo.
 * The Run Store shift already has a sock-wall question. This is that wall.
 */
export const SOCKS = {
  "socks-generic": {
    id: "socks-generic",
    name: "Running socks",
    brand: "Brickside",
    price: 8,
    ultraFatigueCut: 2,
    blisterShield: false,
    color: "#f4f4f4",
    blurb: "Plain pair. −2 fatigue on a long ultra.",
  },
  balega: {
    id: "balega",
    name: "Balega Hidden Comfort",
    brand: "Balega",
    price: 16,
    ultraFatigueCut: 3,
    blisterShield: false,
    color: "#f2c14e",
    blurb: "Padded pair. −3 fatigue on a long ultra.",
  },
  "darn-tough": {
    id: "darn-tough",
    name: "Darn Tough Run",
    brand: "Darn Tough",
    price: 22,
    ultraFatigueCut: 4,
    blisterShield: true,
    color: "#6b4428",
    blurb: "Merino pair. −4 fatigue on a long ultra, and worn shoes blister less.",
  },
  feetures: {
    id: "feetures",
    name: "Feetures Elite Light",
    brand: "Feetures",
    price: 18,
    ultraFatigueCut: 3,
    blisterShield: false,
    color: "#2aa6a0",
    blurb: "Light pair. −3 fatigue on a long ultra.",
  },
  injinji: {
    id: "injinji",
    name: "Injinji Run Lightweight",
    brand: "Injinji",
    price: 20,
    ultraFatigueCut: 3,
    blisterShield: true,
    color: "#1d4ed8",
    blurb: "Toe pair. −3 fatigue on a long ultra, and worn shoes blister less.",
  },
  // Variants stay inside the old sock box: fatigue cut 2 to 4, and a
  // blister shield is a yes or a no. Nothing here cuts more than Darn
  // Tough's 4, or a long run would stop feeling long.
  "balega-enduro": {
    id: "balega-enduro",
    name: "Balega Enduro",
    brand: "Balega",
    price: 14,
    ultraFatigueCut: 2,
    blisterShield: false,
    color: "#e0a82e",
    blurb: "A thinner Balega. −2 fatigue on a long ultra. Less pad, fewer coins.",
  },
  "balega-blister": {
    id: "balega-blister",
    name: "Balega Blister Resist",
    brand: "Balega",
    price: 22,
    minLevel: 3,
    ultraFatigueCut: 3,
    blisterShield: true,
    color: "#f2c14e",
    blurb: "Padded Balega with a blister shield. −3 on a long ultra.",
  },
  "darn-tough-light": {
    id: "darn-tough-light",
    name: "Darn Tough Run Light",
    brand: "Darn Tough",
    price: 16,
    ultraFatigueCut: 2,
    blisterShield: false,
    color: "#8a6244",
    blurb: "The thin merino pair. −2 on a long ultra. No blister shield.",
  },
  "darn-tough-micro": {
    id: "darn-tough-micro",
    name: "Darn Tough Run No-Show",
    brand: "Darn Tough",
    price: 20,
    minLevel: 2,
    ultraFatigueCut: 3,
    blisterShield: true,
    color: "#6b4428",
    blurb: "A shorter merino pair. −3 on a long ultra, and worn shoes blister less.",
  },
  "feetures-max": {
    id: "feetures-max",
    name: "Feetures Elite Max Cushion",
    brand: "Feetures",
    price: 24,
    minLevel: 4,
    ultraFatigueCut: 4,
    blisterShield: false,
    color: "#1f8a86",
    blurb: "The thick Feetures. −4 on a long ultra. Blisters are still your problem.",
  },
  "feetures-merino": {
    id: "feetures-merino",
    name: "Feetures Merino",
    brand: "Feetures",
    price: 22,
    minLevel: 3,
    ultraFatigueCut: 3,
    blisterShield: true,
    color: "#2aa6a0",
    blurb: "Merino Feetures. −3 on a long ultra, and worn shoes blister less.",
  },
  "injinji-light": {
    id: "injinji-light",
    name: "Injinji Run Mini",
    brand: "Injinji",
    price: 16,
    ultraFatigueCut: 2,
    blisterShield: true,
    color: "#3b6fd4",
    blurb: "A thinner toe pair. −2 on a long ultra, and worn shoes blister less.",
  },
  "injinji-trail": {
    id: "injinji-trail",
    name: "Injinji Trail Midweight",
    brand: "Injinji",
    price: 26,
    minLevel: 5,
    ultraFatigueCut: 4,
    blisterShield: true,
    color: "#1d4ed8",
    blurb: "Trail toe pair. −4 on a long ultra, and worn shoes blister less.",
  },
};

export const SOCK_IDS = Object.keys(SOCKS);

/**
 * Hats. heatCut is points taken off fatigue after a run that adds fatigue.
 * There is no sun meter, so this small cut is the heat resistance.
 * colorKey looks up HAT_COLORS. The sprite's cap pixels wear that color.
 */
export const HATS = {
  ciele: {
    id: "ciele",
    name: "Ciele GOCap",
    brand: "Ciele",
    price: 28,
    heatCut: 2,
    colorKey: "ciele",
    blurb: "Bright cap. −2 fatigue on a run that tires you out.",
  },
  bandit: {
    id: "bandit",
    name: "Bandit Superlight",
    brand: "Bandit",
    price: 26,
    heatCut: 1,
    colorKey: "bandit",
    blurb: "Light cap. −1 fatigue on a tiring run.",
  },
  "nike-acg-hat": {
    id: "nike-acg-hat",
    name: "Nike ACG Cap",
    brand: "Nike ACG",
    price: 32,
    heatCut: 2,
    colorKey: "nike-acg",
    blurb: "Trail cap. −2 fatigue on a tiring run.",
  },
  rnnr: {
    id: "rnnr",
    name: "rnnr Pace Hat",
    brand: "rnnr",
    price: 24,
    heatCut: 1,
    colorKey: "rnnr",
    blurb: "Race cap. −1 fatigue on a tiring run.",
  },
  "bpn-hat": {
    id: "bpn-hat",
    name: "BPN Run Hat",
    brand: "BPN",
    price: 30,
    heatCut: 2,
    colorKey: "bpn",
    blurb: "Green cap. −2 fatigue on a tiring run.",
  },
  // Heat cut stays 1 or 2. A third point would double the best hat.
  // colorKey reuses the brand's cap colors. No new logo, no new hex book.
  "ciele-sc": {
    id: "ciele-sc",
    name: "Ciele GOCap SC",
    brand: "Ciele",
    price: 34,
    minLevel: 3,
    heatCut: 2,
    colorKey: "ciele",
    blurb: "The race GOCap. −2 fatigue. It costs more than the standard cap.",
  },
  "ciele-trk": {
    id: "ciele-trk",
    name: "Ciele TRKCap",
    brand: "Ciele",
    price: 26,
    heatCut: 1,
    colorKey: "ciele",
    blurb: "Trail cap. −1 fatigue. Lighter help, lighter tag.",
  },
  "bandit-race": {
    id: "bandit-race",
    name: "Bandit Race Cap",
    brand: "Bandit",
    price: 22,
    heatCut: 1,
    colorKey: "bandit",
    blurb: "A cheaper Bandit. −1 fatigue on a tiring run.",
  },
  "bandit-trail": {
    id: "bandit-trail",
    name: "Bandit Trail Cap",
    brand: "Bandit",
    price: 34,
    minLevel: 4,
    heatCut: 2,
    colorKey: "bandit",
    blurb: "The hotter Bandit. −2 fatigue, and it unlocks later.",
  },
  "nike-acg-trail-hat": {
    id: "nike-acg-trail-hat",
    name: "Nike ACG Trail Cap",
    brand: "Nike ACG",
    price: 36,
    minLevel: 4,
    heatCut: 2,
    colorKey: "nike-acg",
    blurb: "A later ACG cap. −2 fatigue. The khaki is the brand color, not a mark.",
  },
  "nike-acg-sun": {
    id: "nike-acg-sun",
    name: "Nike ACG Sun Cap",
    brand: "Nike ACG",
    price: 28,
    heatCut: 1,
    colorKey: "nike-acg",
    blurb: "A lighter ACG brim. −1 fatigue on a tiring run.",
  },
  "rnnr-distance": {
    id: "rnnr-distance",
    name: "rnnr Distance Hat",
    brand: "rnnr",
    price: 32,
    minLevel: 3,
    heatCut: 2,
    colorKey: "rnnr",
    blurb: "The long-run rnnr. −2 fatigue. More hat than the pace cap.",
  },
  "rnnr-race": {
    id: "rnnr-race",
    name: "rnnr Race Cap",
    brand: "rnnr",
    price: 20,
    heatCut: 1,
    colorKey: "rnnr",
    blurb: "A thin race cap. −1 fatigue. The cheap rnnr.",
  },
  "bpn-trail-hat": {
    id: "bpn-trail-hat",
    name: "BPN Trail Hat",
    brand: "BPN",
    price: 36,
    minLevel: 4,
    heatCut: 2,
    colorKey: "bpn",
    blurb: "Trail BPN cap. −2 fatigue. Later, and it costs more.",
  },
  "bpn-race-hat": {
    id: "bpn-race-hat",
    name: "BPN Race Cap",
    brand: "BPN",
    price: 24,
    minLevel: 2,
    heatCut: 1,
    colorKey: "bpn",
    blurb: "A light BPN cap. −1 fatigue on a tiring run.",
  },
};

export const HAT_IDS = Object.keys(HATS);

export const BELT_IDS = Object.values(CARRY).filter((item) => item.kind === "belt" && !item.wild).map((item) => item.id);
export const VEST_IDS = Object.values(CARRY).filter((item) => item.kind === "vest" && !item.wild).map((item) => item.id);

/**
 * Fuel you buy and then pocket as a count. Three pockets already exist
 * on the save: gels, shakes, flasks. A flavor is another way to fill
 * the same pocket. Eating any gel is still +1 energy and +12 food.
 * Any shake is still the protein drink. Any flask is still +2 at the
 * next start. A pricier name is the brand and the level, not a bigger
 * number, or Maurten would rewrite the bonk rule.
 * ids gel, bpn-gel, and shake are the ones the grocery and the old
 * Run Store button already used.
 */
export const NUTRITION = {
  gel: {
    id: "gel",
    name: "Stride Fuel gel",
    brand: "Stride Fuel",
    kind: "gel",
    price: 12,
    blurb: "House gel. Eat it for +1 energy. The flavor is not a stat.",
  },
  "stride-citrus": {
    id: "stride-citrus",
    name: "Stride Fuel Citrus",
    brand: "Stride Fuel",
    kind: "gel",
    price: 12,
    blurb: "Bright house gel. Same pocket as the plain one.",
  },
  "stride-cola": {
    id: "stride-cola",
    name: "Stride Fuel Cola",
    brand: "Stride Fuel",
    kind: "gel",
    price: 12,
    blurb: "House cola gel. It still only buys +1 energy.",
  },
  "stride-berry": {
    id: "stride-berry",
    name: "Stride Fuel Berry",
    brand: "Stride Fuel",
    kind: "gel",
    price: 12,
    blurb: "House berry gel. The pocket does not care which flavor.",
  },
  "bpn-gel": {
    id: "bpn-gel",
    name: "BPN gel",
    brand: "BPN",
    kind: "gel",
    price: BPN_GEL_COST,
    blurb: "BPN gel. Same pocket as Stride Fuel. A nutrition deal discounts it.",
  },
  "bpn-citrus": {
    id: "bpn-citrus",
    name: "BPN Citrus gel",
    brand: "BPN",
    kind: "gel",
    price: 14,
    minLevel: 2,
    blurb: "Citrus BPN. It is not a stronger gel.",
  },
  "bpn-berry": {
    id: "bpn-berry",
    name: "BPN Berry gel",
    brand: "BPN",
    kind: "gel",
    price: 14,
    minLevel: 2,
    blurb: "Berry BPN. Same eat, different sticker.",
  },
  "honey-gold": {
    id: "honey-gold",
    name: "Honey Stinger Gold",
    brand: "Honey Stinger",
    kind: "gel",
    price: 12,
    blurb: "The gold honey gel. Same +1 energy as the house gel.",
  },
  "honey-smoothie": {
    id: "honey-smoothie",
    name: "Honey Stinger Fruit Smoothie",
    brand: "Honey Stinger",
    kind: "gel",
    price: 13,
    minLevel: 2,
    blurb: "Fruit smoothie gel. Still one pocket.",
  },
  "honey-cherry": {
    id: "honey-cherry",
    name: "Honey Stinger Organic Cherry",
    brand: "Honey Stinger",
    kind: "gel",
    price: 15,
    minLevel: 3,
    blurb: "Cherry gel. The extra coins are the flavor, not more food.",
  },
  "maurten-100": {
    id: "maurten-100",
    name: "Maurten Gel 100",
    brand: "Maurten",
    kind: "gel",
    price: 16,
    minLevel: 5,
    blurb: "Gel 100. It fills the same as a house gel. The tag is the difference.",
  },
  "maurten-caf": {
    id: "maurten-caf",
    name: "Maurten Gel 100 CAF",
    brand: "Maurten",
    kind: "gel",
    price: 18,
    minLevel: 6,
    blurb: "Caffeinated Gel 100. The buzz is on the box. The pocket is still +1 energy.",
  },
  "maurten-160": {
    id: "maurten-160",
    name: "Maurten Gel 160",
    brand: "Maurten",
    kind: "gel",
    price: 18,
    minLevel: 7,
    blurb: "The bigger Maurten box. In this game it is still one gel.",
  },
  "precision-30": {
    id: "precision-30",
    name: "Precision PF 30 Gel",
    brand: "Precision",
    kind: "gel",
    price: 15,
    minLevel: 5,
    blurb: "PF 30. A later gel, not a stronger one.",
  },
  "precision-caf": {
    id: "precision-caf",
    name: "Precision PF 30 Caffeine",
    brand: "Precision",
    kind: "gel",
    price: 17,
    minLevel: 6,
    blurb: "PF 30 with caffeine on the label. Same pocket.",
  },
  shake: {
    id: "shake",
    name: "Protein shake",
    brand: "Brickside",
    kind: "shake",
    price: SHAKE_COST,
    blurb: "House shake. Eases fatigue and clears soreness. Not a blister cure.",
  },
  "bpn-gim": {
    id: "bpn-gim",
    name: "BPN G.1.M Sport",
    brand: "BPN",
    kind: "shake",
    price: 22,
    minLevel: 4,
    blurb: "The BPN shake. It drinks like the house shake. You pay for the tub.",
  },
  flask: {
    id: "flask",
    name: "Soft flask",
    brand: "Brickside",
    kind: "flask",
    price: 10,
    blurb: "A plain flask. +2 nutrition at the next start, then it is empty.",
  },
  "nathan-flask": {
    id: "nathan-flask",
    name: "Nathan Soft Flask",
    brand: "Nathan",
    kind: "flask",
    price: 12,
    minLevel: 2,
    blurb: "Nathan flask. Same +2 at the gun as the plain one.",
  },
  "salomon-flask": {
    id: "salomon-flask",
    name: "Salomon Soft Flask",
    brand: "Salomon",
    kind: "flask",
    price: 14,
    minLevel: 3,
    blurb: "Salomon flask. The bonus does not grow with the name.",
  },
  "camelbak-flask": {
    id: "camelbak-flask",
    name: "CamelBak Soft Flask",
    brand: "CamelBak",
    kind: "flask",
    price: 14,
    minLevel: 3,
    blurb: "CamelBak flask. Still +2, then gone.",
  },
};

export const NUTRITION_IDS = Object.keys(NUTRITION);

export function nutritionById(id) {
  if (!id || !NUTRITION[id]) return null;
  return NUTRITION[id];
}

export const STYLE_LABELS = {
  basic: "Trainer",
  trail: "Trail",
  road: "Marathon",
  versatile: "Backyard Ultra",
};

export function styleLabel(style) {
  return STYLE_LABELS[style] || "Trainer";
}

export function isKnownShoe(id) {
  return Boolean(id && SHOES[id]);
}

export function resolveShoeId(id) {
  if (isKnownShoe(id)) return id;
  const alias = LEGACY_SHOE_IDS[id];
  if (alias && isKnownShoe(alias)) return alias;
  return "starter";
}

export function shoeById(id) {
  return SHOES[resolveShoeId(id)];
}

export function isTrailShoe(id) {
  return shoeById(id).style === "trail";
}

export function shoesOfStyle(style) {
  return Object.values(SHOES).filter((shoe) => shoe.style === style);
}

export function carryById(id) {
  if (!id || !CARRY[id]) return null;
  return CARRY[id];
}

export function isKnownCarry(id) {
  return Boolean(carryById(id));
}

export function sockById(id) {
  if (!id || !SOCKS[id]) return null;
  return SOCKS[id];
}

export function isKnownSock(id) {
  return Boolean(sockById(id));
}

export function hatById(id) {
  if (!id || !HATS[id]) return null;
  return HATS[id];
}

export function isKnownHat(id) {
  return Boolean(hatById(id));
}

/**
 * Kind is the source of truth for shop belts and vests: +5 and +10.
 * A wild generic piece sets its own `nutrition` so it can be weaker
 * without inventing a third kind.
 */
export function carryNutrition(item) {
  if (!item) return 0;
  if (typeof item.nutrition === "number") return item.nutrition;
  if (item.kind === "vest") return VEST_NUTRITION;
  if (item.kind === "belt") return BELT_NUTRITION;
  return 0;
}

export function carryBonus(gear) {
  return carryNutrition(carryById(gear?.carry));
}

export function maxNutritionFromGear(gear) {
  return MAX_NUTRITION + carryBonus(gear);
}

export function shoeMiles(gear, id = gear?.equipped) {
  return gear?.miles?.[id] || 0;
}

export function shoeWear(gear, id = gear?.equipped) {
  const shoe = shoeById(id);
  const miles = shoeMiles(gear, id);
  const ratio = miles / shoe.maxMiles;
  if (ratio >= 1) return { label: "worn out", mod: -0.08, ratio };
  if (ratio >= 0.75) return { label: "worn", mod: -0.04, ratio };
  return { label: "fresh", mod: 0, ratio };
}

export function wearPercent(gear, id) {
  return Math.min(100, Math.round(shoeWear(gear, id).ratio * 100));
}

export function replaceCost(id) {
  const shoe = shoeById(id);
  if (shoe.price <= 0) return STARTER_REPLACE_COST;
  return Math.round(shoe.price * SHOE_REPLACE_RATIO);
}

/**
 * A save from v1 has shoes and nothing else. Fill the new pockets without
 * throwing away a pair the player already paid for. Unknown ids are
 * dropped, except the equipped pair, which falls back through the alias
 * table to starter if we truly do not know it.
 */
export function normalizeGear(gear) {
  const source = gear && typeof gear === "object" ? gear : {};
  const equipped = resolveShoeId(source.equipped);
  const owned = [];
  const rawOwned = Array.isArray(source.owned) ? source.owned : [];
  for (const id of rawOwned) {
    if (!isKnownShoe(id) && !LEGACY_SHOE_IDS[id]) continue;
    const resolved = resolveShoeId(id);
    if (!owned.includes(resolved)) owned.push(resolved);
  }
  if (!owned.includes("starter")) owned.unshift("starter");
  if (!owned.includes(equipped)) owned.push(equipped);

  const miles = {};
  if (source.miles && typeof source.miles === "object") {
    for (const [id, value] of Object.entries(source.miles)) {
      if (!isKnownShoe(id) && !LEGACY_SHOE_IDS[id]) continue;
      const resolved = resolveShoeId(id);
      const numeric = Number(value);
      miles[resolved] = Number.isFinite(numeric) ? numeric : 0;
    }
  }
  if (typeof miles[equipped] !== "number") miles[equipped] = 0;

  const carry = isKnownCarry(source.carry) ? source.carry : null;
  const ownedCarry = [];
  if (Array.isArray(source.ownedCarry)) {
    for (const id of source.ownedCarry) {
      if (isKnownCarry(id) && !ownedCarry.includes(id)) ownedCarry.push(id);
    }
  }
  if (carry && !ownedCarry.includes(carry)) ownedCarry.push(carry);

  // Socks and hats arrived on the same save key. A blob from before
  // them has neither pocket. Missing means empty, not a free pair.
  const socks = isKnownSock(source.socks) ? source.socks : null;
  const ownedSocks = [];
  if (Array.isArray(source.ownedSocks)) {
    for (const id of source.ownedSocks) {
      if (isKnownSock(id) && !ownedSocks.includes(id)) ownedSocks.push(id);
    }
  }
  if (socks && !ownedSocks.includes(socks)) ownedSocks.push(socks);

  const hat = isKnownHat(source.hat) ? source.hat : null;
  const ownedHats = [];
  if (Array.isArray(source.ownedHats)) {
    for (const id of source.ownedHats) {
      if (isKnownHat(id) && !ownedHats.includes(id)) ownedHats.push(id);
    }
  }
  if (hat && !ownedHats.includes(hat)) ownedHats.push(hat);

  return { equipped, owned, miles, carry, ownedCarry, socks, ownedSocks, hat, ownedHats };
}

export function signedPercent(fraction) {
  const pct = Math.round(fraction * 100);
  if (pct === 0) return "0%";
  if (pct > 0) return `+${pct}%`;
  return `−${Math.abs(pct)}%`;
}

/** One line a menu can show under a shoe name. */
export function shoeTradeText(shoe) {
  const mods = shoe?.mods || {};
  const parts = [];
  if (mods.trail) parts.push(`${signedPercent(mods.trail)} trail`);
  if (mods.road) parts.push(`${signedPercent(mods.road)} road`);
  if (mods.versatile) parts.push(`${signedPercent(mods.versatile)} backyard`);
  if (mods.climbing) parts.push(`${signedPercent(mods.climbing)} climbing`);
  if (mods.speed) parts.push(`${signedPercent(mods.speed)} speed`);
  if (mods.shortRoad) parts.push(`${signedPercent(mods.shortRoad)} short road`);
  if (mods.steepTrail) parts.push(`${signedPercent(mods.steepTrail)} steep trail`);
  if (mods.ultraFatigue) parts.push(`+${mods.ultraFatigue} fatigue on long ultras`);
  return parts.join(" · ") || "No pace change";
}

export function carryTradeText(item) {
  if (!item) return "No belt or vest. Max nutrition 100.";
  const bonus = carryNutrition(item);
  // The name has to be in the line. "Belt" alone does not tell you which
  // one is on, and the race card is where you check that before the gun.
  if (item.kind === "belt") return `${item.name} · Belt · +${bonus} max nutrition · no speed penalty`;
  const pace = signedPercent(item.shortRoad || 0);
  return `${item.name} · Vest · +${bonus} max nutrition · ${pace} short road races`;
}

export function sockTradeText(sock) {
  if (!sock) return "No socks. Long ultras feel the full fatigue.";
  const shield = sock.blisterShield ? " · worn shoes blister less" : "";
  return `${sock.name} · −${sock.ultraFatigueCut} fatigue on long ultras${shield}`;
}

export function hatTradeText(hat) {
  if (!hat) return "No hat. Hot runs feel the full fatigue.";
  return `${hat.name} · −${hat.heatCut} fatigue on a tiring run`;
}
