/**
 * constants.js
 * Every number the simulation uses lives here so you can tune Brick City
 * without hunting through the rules. If a run feels too tiring, or level 8
 * (the mountain) feels too far away, this is the file to edit.
 * See docs/NOTES.md for what each group actually does in play.
 *
 * Nutrition caps live here too. The bar starts at 100. A running belt adds
 * 5 and a trail vest adds 10. Sponsors do not raise this cap. They raise
 * the floor and slow the drain, which is a different knob.
 */

export const SAVE_KEY = "brick-city-save-v1";
export const SAVE_VERSION = 1;

export const SLOTS = ["Morning", "Midday", "Afternoon", "Evening", "Night"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A day is 10 energy blocks, not 5 action slots. Sleep fills the bar
 * back to 10. Time of day is derived from how many blocks are left, so
 * the sky still moves from morning to night as you spend the day.
 */
export const MAX_ENERGY = 10;
export const GEL_ENERGY = 1;
export const GEL_NUTRITION = 12;
/** BPN gel on the grocery and Run Store lineup. Same pocket as other gels. */
export const BPN_GEL_COST = 14;
/** Protein shake. 0 energy. Eases fatigue and clears the sore flag. */
export const SHAKE_COST = 16;
export const PROTEIN_FATIGUE_RELIEF = 16;
/** Soft-tissue visit at the PT clinic. Clears soreness and eases fatigue. */
export const TISSUE_FATIGUE_RELIEF = 12;
/** How many nights of an injury one treatment session removes. */
export const CLINIC_TREATMENT_NIGHTS = 2;
/**
 * Coffee at a shop. Two cups a day leave a small pace bump on the next
 * run or race. The third cup still gives the energy, but the bump
 * becomes a jitter penalty. Sleep puts the cup count back to zero.
 * The bump is a fraction of pace, same units as a shoe mod.
 */
export const COFFEE_ENERGY = 1;
export const COFFEE_CUPS_BEFORE_JITTER = 2;
export const COFFEE_PACE_BUMP = 0.02;
export const COFFEE_JITTER_PACE = -0.025;
/** Runs have no finish clock, so the same cup eases or adds this much fatigue. */
export const COFFEE_FATIGUE_SWING = 2;
/**
 * A shop pastry. More FOOD than the home pantry snack (12) and the
 * grocery counter pastry (14). It is real bakery food, so it does not
 * set the junk flag the pantry snack sets.
 */
export const PASTRY_NUTRITION = 16;
/**
 * One hour on the shop Wi-Fi. The first hour is worth this many Race IQ
 * points. Later hours are worth less (see wifiGain). Never below the floor.
 * One hour a day. Sleep is what allows another.
 */
export const WIFI_GAIN_START = 4;
export const WIFI_GAIN_FLOOR = 1;
export const WIFI_GAIN_SLOW = 12;
/**
 * Race IQ in a race. The pace percent and the flat study bonus share
 * one cap, so a huge number cannot turn a bad day into a win.
 * Bonk chance drops a little and then stops dropping. A sure bonk
 * (empty and underslept) is not a chance, so Race IQ does not touch it.
 */
export const RACE_IQ_PACE_PER = 0.001;
export const RACE_IQ_PACE_CAP = 0.03;
export const RACE_IQ_SCORE_PER = 0.15;
export const RACE_IQ_SCORE_CAP = 4;
export const RACE_IQ_LIFT_CAP = 4;
export const RACE_IQ_BONK_PER = 0.004;
export const RACE_IQ_BONK_CAP = 0.12;
/** Course-note thresholds. The first hour of Wi-Fi is enough for the first line. */
export const RACE_IQ_HINT_FIRST = 4;
export const RACE_IQ_HINT_SECOND = 12;
export const RACE_IQ_HINT_THIRD = 24;
/** Tall-grass finds per morning. Sleep puts this back to zero. */
export const FINDS_PER_DAY = 3;
/** A soft flask arms this much nutrition for the next race, then it is gone. */
export const FLASK_RACE_BONUS = 2;

/**
 * One record per town. Brick City is the only map you can walk.
 * The others are the design for later maps: same kinds of buildings,
 * including a PT clinic and a coffee shop. Summit Hollow's clinic and
 * its coffee shop cost the most, the same idea as its store (higher
 * prices than every other city). The welcome sign reads name and motto.
 * Prices are coins. Shop names are original. They are not the real
 * cafes they are loosely inspired by, and they do not use those logos.
 */
export const CITIES = {
  "brick-city": {
    id: "brick-city",
    name: "Brick City",
    motto: "Every Mile Lays a Brick",
    built: true,
    clinic: { name: "Brick City PT", treatment: 22, tissue: 10 },
    cafe: {
      // Display name only. The door id on the map is "cafe", and
      // brick-city-save-v1 does not store this string, so a rename
      // does not need a migration from the old name.
      name: "Tangentline Roasters",
      pastry: "Cold-brew brownie",
      coffee: 8,
      pastryCost: 9,
      look: "Matte black walls, white trim, concrete and steel. The roaster is visible through the window.",
      blurb: "Nitro on tap. Bags of beans by the steel counter.",
    },
  },
  ridgeview: {
    id: "ridgeview",
    name: "Ridgeview",
    motto: "The Ridge Keeps the Receipt",
    built: false,
    clinic: { name: "Ridgeview PT", treatment: 26, tissue: 12 },
    cafe: {
      name: "Good Neighbor Roasting",
      pastry: "Garden crumb cake",
      coffee: 10,
      pastryCost: 11,
      look: "A plant-filled warehouse with garage-door windows and a garden patio.",
      blurb: "The garage door is the window. The patio is the other room.",
    },
  },
  lakeport: {
    id: "lakeport",
    name: "Lakeport",
    motto: "Hold the Pace Through the Streets",
    built: false,
    clinic: { name: "Lakeport PT", treatment: 24, tissue: 11 },
    cafe: {
      name: "Inkline Coffee Bar",
      pastry: "Rosemary maple bar",
      coffee: 9,
      pastryCost: 10,
      look: "A small red-brick corner bar. Dark blue and green paint, chrome trim.",
      blurb: "The rosemary maple latte is the house pour.",
      joke: "Get the logo tattooed and the drip is free for life. We have not had a taker.",
    },
  },
  "mesa-verde-flats": {
    id: "mesa-verde-flats",
    name: "Mesa Verde Flats",
    motto: "Long Miles, Short Shade",
    built: false,
    clinic: { name: "Mesa Verde PT", treatment: 20, tissue: 9 },
    cafe: {
      name: "Teal & Butter Bakeshop",
      pastry: "Lemon meringue croissant",
      also: "kouign-amann",
      coffee: 7,
      pastryCost: 8,
      look: "Teal, coral, and mustard. A mid-century awning.",
      blurb: "The lemon meringue croissant is the one people wait for.",
    },
  },
  flatland: {
    id: "flatland",
    name: "Flatland",
    motto: "Last One Standing",
    built: false,
    clinic: { name: "Flatland PT", treatment: 18, tissue: 8 },
    cafe: {
      name: "Captain's 43rd Bakery",
      pastry: "Cinnamon roll",
      also: "kolache",
      coffee: 6,
      pastryCost: 7,
      look: "A colorful bohemian bakery on a neighborhood corner.",
      blurb: "Cinnamon rolls in the morning. Kolaches once the first tray is gone.",
    },
  },
  "summit-hollow": {
    id: "summit-hollow",
    name: "Summit Hollow",
    motto: "Nothing Left but the Work",
    built: false,
    clinic: { name: "Summit Hollow PT", treatment: 40, tissue: 20 },
    cafe: {
      name: "Old Post Books & Coffee",
      pastry: "Window nook bun",
      coffee: 16,
      pastryCost: 18,
      look: "A bookstore cafe in an old post office. Oak shelves and a stained-glass nook.",
      blurb: "Books in the front. The kettle is in the back. The prices match the altitude.",
    },
  },
};
export const CITY_INFO = CITIES["brick-city"];

export function cityById(id) {
  return CITIES[id] || CITIES["brick-city"];
}

/** Coins for a PT visit in that town. Unknown ids use Brick City. */
export function clinicRates(cityId) {
  return cityById(cityId).clinic;
}

/** Coffee, pastry, and the words on that town's shop. Unknown ids use Brick City. */
export function cafeRates(cityId) {
  return cityById(cityId).cafe;
}

export const START_COINS = 48;
export const START_ENDURANCE = 24;
export const START_PEAK = 20;
export const START_FATIGUE = 12;
export const START_NUTRITION = 70;
export const START_SLEEP_HOURS = 8;
export const START_SLEEP_QUALITY = "good";
export const START_MEAL = "Kitchen oatmeal";
export const START_MEAL_QUALITY = "ok";

/** Overall XP spent to step from level (n-1) to n grows by this much. */
export const LEVEL_STEP_START = 25;
export const LEVEL_STEP_GROWTH = 20;

/** Attribute points needed for each new attribute level. */
export const ATTRIBUTE_POINTS_PER_LEVEL = 20;

/** Specialty-track points per displayed rank (the panel, not a gate). */
export const TRACK_POINTS_PER_RANK = 40;

/**
 * Base nutrition cap. Belts and vests add BELT_NUTRITION or VEST_NUTRITION
 * on top. Do not bake 105 or 110 in anywhere else, or the HUD and the
 * meal clamp will disagree.
 */
export const MAX_NUTRITION = 100;
export const BELT_NUTRITION = 5;
export const VEST_NUTRITION = 10;

/** Passive nutrition lost each time slot, before extras. */
export const SLOT_NUTRITION_DRAIN = 4;
/** Extra drain when fatigue is at or above TIRED_FATIGUE. A tired runner needs more food. */
export const TIRED_EXTRA_DRAIN = 2;
export const TIRED_FATIGUE = 60;
/** Extra drain on the next run after a quick snack. */
export const JUNK_EXTRA_DRAIN = 3;

export const FATIGUE_YELLOW = 40;
export const FATIGUE_RED = 70;

/** Meter must move by at least this much before the HUD arrow flips off "steady". */
export const TREND_THRESHOLD = 2;

/**
 * Bonk line. Below this nutrition counts as "low fuel".
 * Poor sleep is sleepQuality === "poor" OR fatigue at or above POOR_SLEEP_FATIGUE.
 */
export const LOW_NUTRITION = 40;
export const POOR_SLEEP_FATIGUE = 80;
/** When only one of fuel/sleep is bad, a roll under this bonks (unless you packed a gel). */
export const BONK_CHANCE = 0.45;

/** Detraining stays off for the first two days without a run. */
export const DETRAIN_FREE_DAYS = 2;
export const ENDURANCE_DETRAIN_DAY = 6;
export const PEAK_DETRAIN_STEP = 2;
export const PEAK_DETRAIN_CAP = 12;
export const ENDURANCE_DETRAIN_CAP = 6;

export const OVERNIGHT_NUTRITION_DRAIN = 8;
export const NAP_FATIGUE_RELIEF = 14;
export const NAP_PEAK_LOSS_IF_DETRAINING = 1;

/**
 * Free food at Home. Sleep is what puts these back to zero. Coins can
 * buy more after the free ones are gone. Naps do not have a paid extra.
 * A home meal is one third of the FOOD cap (see homeMealPortion). The
 * snack number is the old pantry snack, kept as-is: +12, and the next
 * effort still burns a little faster.
 */
export const FREE_HOME_MEALS = 3;
export const FREE_HOME_SNACKS = 2;
export const HOME_SNACK_NUTRITION = 12;
export const NAPS_PER_DAY = 2;
/** Blocks a nap puts back. The bar never goes past MAX_ENERGY. */
export const NAP_ENERGY = 3;

/**
 * What an extra plate costs once the free kitchen is used up. These are
 * the same prices as the grocery, so eating at Home is not a discount.
 */
export const MEAL_COIN_COST = 18;
export const SNACK_COIN_COST = 7;

export const HARD_WEEK_AVG_FATIGUE = 60;
export const RECOVERY_WEEK_AVG_FATIGUE = 35;
export const RECOVERY_WEEK_MIN_MILES = 6;
export const RECOVERY_WEEK_BONUS_XP = 15;

export const SHOE_REPLACE_RATIO = 0.6;
export const STARTER_REPLACE_COST = 20;

export const NAME_MAX = 10;

export const METER_KEYS = ["endurance", "peak", "fatigue", "nutrition"];

export const METER_LABELS = {
  endurance: "Endurance",
  peak: "Peak",
  fatigue: "Fatigue",
  nutrition: "Nutrition",
};

export const ATTRIBUTES = [
  { id: "speed", name: "Speed" },
  { id: "endurance", name: "Endurance" },
  { id: "strength", name: "Strength / Climbing" },
  { id: "recovery", name: "Recovery" },
  { id: "mental", name: "Mental Toughness" },
];

export const TRACKS = [
  { id: "overall", name: "Overall" },
  { id: "trail", name: "Trail Running" },
  { id: "marathon", name: "Marathon Running" },
  { id: "ultra", name: "Ultra Running" },
  { id: "versatile", name: "Versatile Running" },
];
