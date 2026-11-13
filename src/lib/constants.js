/**
 * constants.js
 * Every number the simulation uses lives here so you can tune Brick City
 * without hunting through the rules. If a run feels too tiring, or level 8
 * (the mountain) feels too far away, this is the file to edit.
 * See docs/NOTES.md for what each group actually does in play.
 */

export const SAVE_KEY = "brick-city-save-v1";
export const SAVE_VERSION = 1;

export const SLOTS = ["Morning", "Midday", "Afternoon", "Evening", "Night"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
