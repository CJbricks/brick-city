/**
 * activities.js
 * What you can do in town, and the pure functions that apply a choice to
 * a save. React calls these and then stores the returned state. Nothing
 * in here reads the clock. When a race needs luck, the screen passes a
 * roll in, so tests can force a win, a loss, or a bonk. Sponsor offers
 * use a second function, rng, for the same reason.
 *
 * A returned object always has { ok, state, lines, ticker }. `ok: false`
 * means the day was too short or the coins weren't there, and `state` is
 * the same object you passed in.
 *
 * Shoes, belts, vests, and sponsor deals are applied here too. The numbers
 * live in catalog.js and sponsors.js. This file only decides what a button
 * does to the save: buy, equip, sign, skip, sleep, run, race.
 */

import { formatWhen, isSunday, sleepPlan, slotFromEnergy, summarizeWeek } from "@/lib/calendar";
import {
  GEL_ENERGY,
  GEL_NUTRITION,
  HARD_WEEK_AVG_FATIGUE,
  MAX_ENERGY,
  NAP_FATIGUE_RELIEF,
  NAP_PEAK_LOSS_IF_DETRAINING,
  OVERNIGHT_NUTRITION_DRAIN,
  RECOVERY_WEEK_AVG_FATIGUE,
  RECOVERY_WEEK_BONUS_XP,
  RECOVERY_WEEK_MIN_MILES,
  START_COINS,
  START_ENDURANCE,
  START_FATIGUE,
  START_MEAL,
  START_MEAL_QUALITY,
  START_NUTRITION,
  START_PEAK,
  START_SLEEP_HOURS,
  START_SLEEP_QUALITY,
} from "@/lib/constants";
import { clampMeter, formatTicker, meterDelta, readMeters, slotDrain } from "@/lib/condition";
import { detrainingDelta, detrainingNote } from "@/lib/detrain";
import {
  carryById,
  carryNutrition,
  carryTradeText,
  CARRY,
  isKnownShoe,
  maxNutritionFromGear,
  shoeTradeText,
  shoesOfStyle,
  styleLabel,
  wearPercent,
} from "@/lib/catalog";
import {
  RACES,
  RIVAL,
  combinedMod,
  finishQuality,
  flavorTime,
  gearModForStyle,
  judgeBonk,
  rivalScores,
  shoeById,
  shoeWear,
} from "@/lib/race";
import {
  COOLDOWN_LEAVE,
  COOLDOWN_PASS,
  NUTRITION_SPONSOR_IDS,
  SHOE_SPONSOR_IDS,
  STANDING_ACCEPT,
  STANDING_DROP,
  STANDING_SKIP,
  STANDING_START,
  STANDING_WARN,
  clampStanding,
  emptySponsors,
  gateStatus,
  nutritionPerkText,
  nutritionTuning,
  planObligation,
  pricedCarry,
  pricedGel,
  pricedShoe,
  shoeDealNumbers,
  shoePerkText,
  sponsorById,
  sponsorPace,
  sponsorSummaryLines,
  standingOf,
} from "@/lib/sponsors";
import { deliverMail, expireOffers, liveOffer, rollOffers, setCooldown } from "@/lib/offers";
import {
  describeNeeds,
  halfStatus,
  isMountainOpen,
  isTenKOpen,
  milestoneTags,
  mountainStatus,
  runnerLevel,
  tenKStatus,
} from "@/lib/unlocks";
import { levelFromXp } from "@/lib/xp";
import { TILE, homeSpawn } from "@/game/town";

const XP_KEYS = ["overall", "trail", "marathon", "ultra", "versatile"];

export const JOBS = {
  shoes: {
    id: "shoes",
    label: "Help a customer",
    detail: "1 energy · shoe advice",
    speaker: "Customer",
    text: "I'm running the park dirt loop today. What should I buy?",
    choices: [
      {
        id: "trail",
        label: "Trail shoes",
        coins: 22,
        reply: "They buy the Peakline Luggers. The till is heavier for it.",
      },
      {
        id: "flats",
        label: "Racing flats",
        coins: 11,
        reply: "They glance at the mud and buy them anyway. Smaller sale.",
      },
    ],
  },
  stock: {
    id: "stock",
    label: "Stock the gel wall",
    detail: "1 energy · shelf work",
    speaker: "Manager Nia",
    text: "The gel wall is a mess before the lunch crowd. How do you sort it?",
    choices: [
      {
        id: "flavor",
        label: "By flavor",
        coins: 16,
        reply: "It looks nice. Someone still asks where the caffeinated ones are.",
      },
      {
        id: "caffeine",
        label: "By caffeine",
        coins: 20,
        reply: "Nia nods. The morning crowd finds what they need.",
      },
    ],
  },
  gait: {
    id: "gait",
    label: "Run a gait check",
    detail: "1 energy · fitting stool",
    speaker: "Manager Nia",
    text: "A runner wants a gait check. What do you watch first?",
    choices: [
      {
        id: "wear",
        label: "Sole wear",
        coins: 21,
        reply: "The outer heel is chewed up. You point them at a stable shoe.",
      },
      {
        id: "speed",
        label: "How fast they look",
        coins: 12,
        reply: "They already know they're fast. They wanted the worn heel noticed.",
      },
    ],
  },
};

export const SHOP = {
  meal: {
    id: "meal",
    label: "Healthy meal",
    detail: "18 coins · 0 energy · pasta and greens",
    cost: 18,
    nutrition: 32,
    mealName: "Pasta and greens",
    mealQuality: "good",
    junk: false,
    lines: ["A real plate. The Nutrition bar climbs and it should hold."],
  },
  snack: {
    id: "snack",
    label: "Quick snack",
    detail: "7 coins · 0 energy · counter pastry",
    cost: 7,
    nutrition: 14,
    mealName: "Counter pastry",
    mealQuality: "poor",
    junk: true,
    lines: ["Sweet, fast, and gone. The next run will burn it quicker."],
  },
  gel: {
    id: "gel",
    label: "Stride Fuel gel",
    detail: "12 coins · 0 energy",
    cost: 12,
    energy: 0,
    lines: ["You tuck a gel in the pocket. It costs no energy. Eat it from Inventory for +1 block, or save it for a bonk."],
  },
};

const RUNS = {
  "easy-run": {
    id: "easy-run",
    name: "Easy Recovery Run",
    slots: 1,
    miles: 2,
    fatigue: -10,
    nutrition: -6,
    peak: 1,
    endurance: 2,
    xp: { overall: 12, versatile: 4 },
    attributes: { recovery: 8, endurance: 2 },
    hard: false,
    training: true,
    style: "road",
    lines: [
      "You jog the park paths easy enough to talk.",
      "Shoulders drop. Fatigue eases off.",
    ],
  },
  "long-run": {
    id: "long-run",
    name: "Long Run",
    slots: 2,
    miles: 8,
    fatigue: 18,
    nutrition: -16,
    peak: 1,
    endurance: 7,
    xp: { overall: 30, ultra: 18, versatile: 4 },
    attributes: { endurance: 10, mental: 3 },
    hard: true,
    training: true,
    style: "road",
    progress: "longRuns",
    lines: [
      "You settle into the long loop and stay there.",
      "This is the work that builds Overall Endurance.",
    ],
    // Marathon shoes add fatigue here. A 5K does not count as a long ultra.
    longUltra: true,
  },
  "park-trail": {
    id: "park-trail",
    name: "Park Trail Loop",
    slots: 1,
    miles: 4,
    fatigue: 12,
    nutrition: -10,
    peak: 1,
    endurance: 4,
    xp: { overall: 20, trail: 16, ultra: 4 },
    attributes: { strength: 6, endurance: 4 },
    hard: true,
    training: true,
    style: "trail",
    progress: "parkTrailRuns",
    lines: [
      "Dirt, roots, and a short rise behind the pond.",
      "The trail count ticks up. The mountain is listening.",
    ],
  },
  yards: {
    id: "yards",
    name: "Backyard Practice Yards",
    slots: 1,
    miles: 4.2,
    fatigue: 14,
    nutrition: -12,
    peak: 0,
    endurance: 4,
    xp: { overall: 18, ultra: 8, versatile: 14 },
    attributes: { mental: 8, endurance: 4 },
    hard: true,
    training: true,
    style: "versatile",
    progress: "yards",
    lines: [
      "One yard. 4.2 miles. You finish with the bell still in your ears.",
      "Versatile Running likes a runner who can do a bit of everything.",
    ],
  },
  intervals: {
    id: "intervals",
    name: "Track Intervals",
    slots: 1,
    miles: 3,
    fatigue: 15,
    nutrition: -9,
    peak: 8,
    endurance: 1,
    xp: { overall: 22, marathon: 16 },
    attributes: { speed: 10, mental: 2 },
    hard: true,
    training: true,
    style: "road",
    progress: "trackRuns",
    lines: [
      "Fast, jog, fast, jog. The oval rings.",
      "Peak Fitness jumps. That's the sharp stuff.",
    ],
  },
  treadmill: {
    id: "treadmill",
    name: "Treadmill Run",
    slots: 1,
    miles: 5,
    fatigue: 10,
    nutrition: -8,
    peak: 3,
    endurance: 4,
    xp: { overall: 20, marathon: 14 },
    attributes: { endurance: 6, speed: 3 },
    hard: false,
    training: true,
    style: "road",
    progress: "treadmillRuns",
    lines: [
      "The belt hums. Pace stays honest, weather stays outside.",
      "Marathon Running takes the miles either way.",
    ],
  },
  strength: {
    id: "strength",
    name: "Strength Session",
    slots: 1,
    miles: 0,
    fatigue: 8,
    nutrition: -6,
    peak: 0,
    endurance: 1,
    xp: { overall: 12, versatile: 2 },
    attributes: { strength: 10, recovery: 2 },
    hard: true,
    training: true,
    style: "trail",
    lines: [
      "Squats, carries, and a slow calf raise that humbles you.",
      "Injury resistance is a habit, not a speech.",
    ],
  },
  "ridge-repeats": {
    id: "ridge-repeats",
    name: "Ridge Repeats",
    slots: 2,
    miles: 6,
    fatigue: 18,
    nutrition: -14,
    peak: 2,
    endurance: 5,
    xp: { overall: 34, trail: 28, ultra: 8 },
    attributes: { strength: 12, endurance: 6, mental: 3 },
    hard: true,
    training: true,
    style: "trail",
    progress: "mountainRuns",
    lines: [
      "The gate creaks and the grade starts immediately.",
      "Climbing XP, and a view of Brick City the size of a postage stamp.",
    ],
    longUltra: true,
  },
};

function clone(state) {
  return structuredClone(state);
}

function emptyXp() {
  return { overall: 0, trail: 0, marathon: 0, ultra: 0, versatile: 0 };
}

export function createNewGame({ name, gender }) {
  const clean = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 10);
  const condition = {
    endurance: START_ENDURANCE,
    peak: START_PEAK,
    fatigue: START_FATIGUE,
    nutrition: START_NUTRITION,
    mealName: START_MEAL,
    mealQuality: START_MEAL_QUALITY,
    junk: false,
    sleepHours: START_SLEEP_HOURS,
    sleepQuality: START_SLEEP_QUALITY,
    sore: false,
    injury: null,
  };
  const state = {
    version: 1,
    runner: { name: clean || "RUNNER", gender: gender === "female" ? "female" : "male" },
    xp: emptyXp(),
    attributes: { speed: 0, endurance: 0, strength: 0, recovery: 0, mental: 0 },
    condition,
    yesterday: readMeters(condition),
    calendar: {
      day: 1,
      weekday: 0,
      slot: 0,
      weekIndex: 1,
      weekMiles: 0,
      weekXp: emptyXp(),
      fatigueSamples: [START_FATIGUE],
      nutritionSamples: [START_NUTRITION],
      sleepSamples: [],
      homeMealUsed: false,
      homeSnackUsed: false,
      trainedToday: false,
      daysSinceRun: 0,
      hardWeeks: 0,
      weekPeakLost: 0,
      weekEnduranceLost: 0,
    },
    coins: START_COINS,
    gear: {
      equipped: "starter",
      owned: ["starter"],
      miles: { starter: 0 },
      // One fuel slot. null means pockets only, max nutrition 100.
      carry: null,
      ownedCarry: [],
    },
    // No deal on day one. The Sponsors menu explains what is still locked.
    sponsors: emptySponsors(),
    gels: 0,
    energy: MAX_ENERGY,
    nappedToday: false,
    progress: {
      parkTrailRuns: 0,
      trackRuns: 0,
      treadmillRuns: 0,
      longRuns: 0,
      yards: 0,
      mountainRuns: 0,
      fiveKFinished: false,
      tenKFinished: false,
      rivalWins: 0,
      rivalLosses: 0,
      totalMiles: 0,
    },
    milestones: [],
    weeklyHistory: [],
    pendingSummary: null,
    // Pixel size of one tile when this save was written. loadSave uses it
    // to tell a v2 position (already 32px) from a v1 position (16px).
    tileSize: TILE,
    position: homeSpawn(),
    lastTicker: "",
  };
  state.milestones = milestoneTags(state);
  return state;
}

function refuse(state, lines) {
  return { ok: false, state, lines, ticker: "", summary: null };
}

function finish(before, state, lines) {
  state.milestones = milestoneTags(state);
  const ticker = formatTicker(meterDelta(readMeters(before.condition), readMeters(state.condition)));
  state.lastTicker = ticker;
  const levelBefore = levelFromXp(before.xp.overall);
  const levelAfter = runnerLevel(state);
  if (levelAfter > levelBefore) {
    lines.push(`You reached level ${levelAfter}.`);
  }
  if (!isTenKOpen(before) && isTenKOpen(state)) {
    lines.push("A notice goes up at the track: the Community 10K is open.");
  }
  if (!isMountainOpen(before) && isMountainOpen(state)) {
    lines.push("Ranger Quill radios the gate. The mountain trail is open.");
  }
  return { ok: true, state, lines, ticker, summary: state.pendingSummary };
}

function sample(state) {
  state.calendar.fatigueSamples.push(state.condition.fatigue);
  state.calendar.nutritionSamples.push(state.condition.nutrition);
}

export function readEnergy(state) {
  return typeof state.energy === "number" ? state.energy : MAX_ENERGY;
}

const LOW_ENERGY = "Not enough energy. Sleep at Home, or eat a gel.";

/**
 * Spending a block is what moves the clock. Two blocks is one step of the
 * day (Morning toward Night). Nutrition still drains once per block on a
 * real effort, because the old "each slot makes you hungrier" rule now
 * follows energy instead of a separate slot counter. A gel purchase passes
 * cost 0 and leaves both the bar and the clock alone.
 */
/**
 * Nutrition uses the belt/vest cap. Every other meter stays at 100.
 * A nutrition sponsor lowers the per-block drain. It does not raise the cap.
 */
function clampFood(state, value) {
  return clampMeter(value, maxNutritionFromGear(state.gear));
}

function hungerDrain(state) {
  const cut = nutritionTuning(state).drainCut;
  return Math.max(0, slotDrain(state.condition) - cut);
}

function spendEnergy(state, cost, drain) {
  const have = readEnergy(state);
  if (cost > 0 && have < cost) return false;
  state.energy = have - cost;
  if (drain && cost > 0) {
    for (let i = 0; i < cost; i += 1) {
      state.condition.nutrition = clampFood(state, state.condition.nutrition - hungerDrain(state));
    }
    if (state.condition.junk) state.condition.junk = false;
  }
  state.calendar.slot = slotFromEnergy(state.energy);
  return true;
}

const STYLE_TRACKS = {
  road: ["marathon"],
  trail: ["trail"],
  versatile: ["versatile"],
};

/**
 * Shoe and sponsor percents land on the specialty track for this effort.
 * Overall XP is left alone so a pair of shoes cannot skip the level gates.
 * A negative shoe mod is pace only. It is not also subtracted from XP,
 * because worn-out pace and the readiness card already show that cost.
 */
function grantXp(state, xp, style) {
  const tuned = { ...(xp || {}) };
  if (style) {
    const shoe = shoeById(state.gear?.equipped);
    const shoeBoost = Math.max(0, shoe.mods?.[style] || 0);
    const factor = 1 + shoeBoost + sponsorPace(state, style).mod;
    if (factor !== 1) {
      for (const key of STYLE_TRACKS[style] || []) {
        if (tuned[key]) tuned[key] = Math.max(1, Math.round(tuned[key] * factor));
      }
    }
  }
  addXp(state, tuned);
}

function applyShoeSideEffects(state, activity) {
  const shoe = shoeById(state.gear?.equipped);
  const mods = shoe.mods || {};
  if (activity.longUltra && mods.ultraFatigue) {
    state.condition.fatigue = clampMeter(state.condition.fatigue + mods.ultraFatigue);
  }
  const extra = {};
  if (activity.style === "trail" && mods.climbing && activity.attributes?.strength) {
    extra.strength = Math.max(1, Math.round(activity.attributes.strength * mods.climbing));
  }
  if (activity.style === "road" && mods.speed && activity.attributes?.speed) {
    extra.speed = Math.max(1, Math.round(activity.attributes.speed * mods.speed));
  }
  if (Object.keys(extra).length) addAttributes(state, extra);
}

function addXp(state, xp) {
  for (const key of XP_KEYS) {
    const amount = xp[key] || 0;
    if (!amount) continue;
    state.xp[key] += amount;
    state.calendar.weekXp[key] += amount;
  }
}

function addAttributes(state, attributes) {
  for (const [key, amount] of Object.entries(attributes || {})) {
    state.attributes[key] += amount;
  }
}

function addMiles(state, miles) {
  if (miles <= 0) return;
  state.progress.totalMiles = round1(state.progress.totalMiles + miles);
  state.calendar.weekMiles = round1(state.calendar.weekMiles + miles);
  const equipped = state.gear.equipped;
  // Miles land on the pair you actually wore. Worn-out shoes are what
  // nextSoreness looks at, so this is also the injury system.
  state.gear.miles[equipped] = round1((state.gear.miles[equipped] || 0) + miles);
}

function markTraining(state, activity) {
  if (activity.training) state.calendar.trainedToday = true;
  if (activity.progress) state.progress[activity.progress] += 1;
}

/**
 * Soreness is a warning, not a coin-flip. Two strikes (tired, hungry,
 * worn-out shoes, already sore, or a hard session) light the warning.
 * Training again while sore, with another strike still true, becomes a blister.
 */
export function nextSoreness(state, activity) {
  const worn = shoeWear(state.gear).label === "worn out";
  const strikes = [
    state.condition.fatigue >= 70,
    state.condition.nutrition < 30,
    worn,
    Boolean(activity.hard),
    state.calendar.hardWeeks >= 2,
  ].filter(Boolean).length;
  if (state.condition.sore && strikes >= 2) {
    return {
      sore: true,
      injury: {
        id: "blister",
        name: "Blister",
        daysLeft: 2,
        note: "Small speed penalty until it calms down.",
      },
    };
  }
  if (strikes >= 2) {
    return { sore: true, injury: state.condition.injury };
  }
  return { sore: state.condition.sore && strikes >= 1, injury: state.condition.injury };
}

function applyBody(state, activity) {
  state.condition.fatigue = clampMeter(state.condition.fatigue + activity.fatigue);
  state.condition.peak = clampMeter(state.condition.peak + (activity.peak || 0));
  state.condition.endurance = clampMeter(state.condition.endurance + (activity.endurance || 0));
  state.condition.nutrition = clampFood(state, state.condition.nutrition + (activity.nutrition || 0));
  // High fatigue blunts the peak you just earned. The design is explicit:
  // peak drops when fatigue stays high.
  if (state.condition.fatigue >= 75 && (activity.peak || 0) > 0) {
    state.condition.peak = clampMeter(state.condition.peak - 2);
  }
}

const LETTER_STYLES = {
  "park-trail": "trail",
  "ridge-repeats": "trail",
  yards: "versatile",
};

export function applyRun(state, runId, rng = Math.random) {
  const activity = RUNS[runId];
  if (!activity) return refuse(state, ["That session isn't on the board."]);
  if (runId === "ridge-repeats" && !isMountainOpen(state)) {
    return refuse(state, ["The ranger hasn't opened the gate."]);
  }
  const energyCost = activity.id === "long-run" || activity.id === "ridge-repeats" ? 2 : 1;
  if (readEnergy(state) < energyCost) {
    return refuse(state, [LOW_ENERGY]);
  }
  if (state.condition.injury && (runId === "intervals" || runId === "ridge-repeats")) {
    return refuse(state, [`Your ${state.condition.injury.name.toLowerCase()} says no to that session.`]);
  }
  const before = state;
  const next = clone(state);
  const lines = [...activity.lines];
  if (next.condition.nutrition <= 0) {
    next.condition.fatigue = clampMeter(next.condition.fatigue + 6);
    lines.push("You start on empty. The workout turns into a shuffle.");
  }
  applyBody(next, activity);
  addMiles(next, activity.miles);
  grantXp(next, activity.xp, activity.style);
  addAttributes(next, activity.attributes);
  applyShoeSideEffects(next, activity);
  markTraining(next, activity);
  const sore = nextSoreness(next, activity);
  next.condition.sore = sore.sore;
  next.condition.injury = sore.injury;
  if (sore.injury && !before.condition.injury) {
    lines.push("A hot spot becomes a blister. Ease off speed work for a couple of days.");
  } else if (sore.sore && !before.condition.sore) {
    lines.push("Something feels sore. A rest day now beats a week off later.");
  }
  const gear = gearModForStyle(next.gear, activity.style || "road");
  if (gear.wear === "worn out" && activity.miles > 0) {
    lines.push(`${gear.name} are worn out. Replace them at the Run Store.`);
  }
  spendEnergy(next, energyCost, true);
  sample(next);
  if (activity.miles > 0) {
    lines.push(`${round1(activity.miles)} miles in the book.`);
  }
  // Trail loops and yards do not have a finish banner. If a brand cares,
  // the note waits until tomorrow morning instead of interrupting the run.
  const letterStyle = LETTER_STYLES[activity.id];
  if (letterStyle) {
    rollOffers(next, { style: letterStyle, quality: "finish", channel: "letter" }, rng);
  }
  return finish(before, next, lines);
}

export function applySleep(state) {
  const before = state;
  const next = clone(state);
  const plan = sleepPlan(next.calendar.slot);
  const wasSunday = isSunday(next.calendar.weekday);
  next.condition.fatigue = clampMeter(next.condition.fatigue - plan.relief);
  let overnight = OVERNIGHT_NUTRITION_DRAIN;
  if (next.condition.junk) overnight += 4;
  next.condition.junk = false;
  next.condition.nutrition = clampFood(next, next.condition.nutrition - overnight);
  // The floor is a minimum after sleep, not a free refill up to the vest
  // cap. A belt still decides the cap. The sponsor only stops the morning
  // from opening under its promised line.
  const floor = nutritionTuning(next).floor;
  if (floor > 0 && next.condition.nutrition < floor) {
    next.condition.nutrition = clampFood(next, floor);
  }
  next.condition.sleepHours = plan.hours;
  next.condition.sleepQuality = plan.quality;
  if (next.condition.injury) {
    next.condition.injury = { ...next.condition.injury, daysLeft: next.condition.injury.daysLeft - 1 };
    if (next.condition.injury.daysLeft <= 0) {
      next.condition.injury = null;
      next.condition.sore = false;
    }
  } else if (next.condition.sore && plan.quality !== "poor") {
    next.condition.sore = false;
  }

  if (!next.calendar.trainedToday) next.calendar.daysSinceRun += 1;
  else next.calendar.daysSinceRun = 0;

  const loss = detrainingDelta(next.calendar.daysSinceRun);
  next.condition.peak = clampMeter(next.condition.peak + loss.peak);
  next.condition.endurance = clampMeter(next.condition.endurance + loss.endurance);
  next.calendar.weekPeakLost += loss.peak;
  next.calendar.weekEnduranceLost += loss.endurance;

  // Yesterday's arrows compare against the meters you went to bed with,
  // which are still on `before`. Then we store this morning as the new baseline
  // only after the HUD has had a chance... The snapshot is bedtime, so the
  // morning arrow shows the sleep. The next activities compare with bedtime
  // until the following night replaces it.
  next.yesterday = readMeters(before.condition);

  next.calendar.sleepSamples.push(plan.hours);
  sample(next);

  const lines = [
    `You sleep ${plan.hours}h. Quality: ${plan.quality}.`,
    loss.active ? detrainingNote(next.calendar.daysSinceRun) : "You wake up in Brick City.",
  ];

  let summary = null;
  if (wasSunday) {
    summary = summarizeWeek({
      weekIndex: next.calendar.weekIndex,
      miles: next.calendar.weekMiles,
      xp: next.calendar.weekXp,
      fatigueSamples: next.calendar.fatigueSamples,
      nutritionSamples: next.calendar.nutritionSamples,
      sleepSamples: next.calendar.sleepSamples,
      hardLine: HARD_WEEK_AVG_FATIGUE,
      recoveryLine: RECOVERY_WEEK_AVG_FATIGUE,
      recoveryMiles: RECOVERY_WEEK_MIN_MILES,
      peakLost: next.calendar.weekPeakLost,
      enduranceLost: next.calendar.weekEnduranceLost,
      detrainingNote:
        next.calendar.weekPeakLost < 0
          ? `Detraining this week: Peak ${next.calendar.weekPeakLost}, Endurance ${next.calendar.weekEnduranceLost}.`
          : "No detraining this week.",
    });
    if (summary.recoveryWeek) {
      next.calendar.hardWeeks = 0;
      addXp(next, { overall: RECOVERY_WEEK_BONUS_XP, versatile: 4 });
      summary.bonusXp = RECOVERY_WEEK_BONUS_XP;
      lines.push("A real recovery week. Bonus XP for not frying yourself.");
    } else if (summary.hardWeek) {
      next.calendar.hardWeeks += 1;
      summary.bonusXp = 0;
      lines.push("That was a hard week. String a few of these together and injury risk climbs.");
    } else {
      summary.bonusXp = 0;
    }
    summary.hardWeeks = next.calendar.hardWeeks;
    next.weeklyHistory = [...next.weeklyHistory, summary].slice(-8);
    next.pendingSummary = summary;
    next.calendar.weekIndex += 1;
    next.calendar.weekMiles = 0;
    next.calendar.weekXp = emptyXp();
    next.calendar.fatigueSamples = [];
    next.calendar.nutritionSamples = [];
    next.calendar.sleepSamples = [];
    next.calendar.weekPeakLost = 0;
    next.calendar.weekEnduranceLost = 0;
  } else {
    next.pendingSummary = null;
  }

  next.calendar.day += 1;
  next.calendar.weekday = (next.calendar.weekday + 1) % 7;
  // Sleep is the only full refill. The clock goes back to Morning with it.
  next.energy = MAX_ENERGY;
  next.nappedToday = false;
  next.calendar.homeMealUsed = false;
  next.calendar.homeSnackUsed = false;
  next.calendar.slot = slotFromEnergy(MAX_ENERGY);
  next.calendar.trainedToday = false;
  lines.push("Energy is back to 10/10.");
  // The new morning is when a 3-day offer can die, and when a letter
  // from yesterday's trail run is sitting on the table.
  lines.push(...expireOffers(next));
  lines.push(...deliverMail(next));
  const note = planObligation(next);
  if (note) {
    const brand = sponsorById(note.kind, note.sponsorId);
    next.sponsors.obligation = note;
    next.sponsors.seenObligation = true;
    lines.push(`${brand ? brand.name : "A sponsor"} left a note: ${note.label}. Open Sponsors to accept or skip.`);
  }
  sample(next);

  const result = finish(before, next, lines);
  result.summary = summary;
  return result;
}

export function applyNap(state) {
  // Daytime is Morning through Afternoon (slot 0-2), which is 5 or more
  // energy blocks left. One nap a day. It spends a block and does not
  // give any back. That is the difference between a nap and sleep.
  if (slotFromEnergy(readEnergy(state)) >= 3) {
    return refuse(state, ["Too late for a nap. Sleep will end the day instead."]);
  }
  if (state.nappedToday) {
    return refuse(state, ["You already napped today. Sleep will refill energy."]);
  }
  if (readEnergy(state) < 1) {
    return refuse(state, [LOW_ENERGY]);
  }
  const before = state;
  const next = clone(state);
  next.condition.fatigue = clampMeter(next.condition.fatigue - NAP_FATIGUE_RELIEF);
  next.nappedToday = true;
  const lines = ["You stretch out on the couch. A short nap, not a new day. Energy stays spent."];
  if (next.calendar.daysSinceRun >= 3) {
    next.condition.peak = clampMeter(next.condition.peak - NAP_PEAK_LOSS_IF_DETRAINING);
    lines.push("Extra rest while you are already detraining nicks Peak Fitness.");
  }
  spendEnergy(next, 1, true);
  sample(next);
  return finish(before, next, lines);
}

export function applyPurchase(state, itemId) {
  const item = SHOP[itemId];
  if (!item) return refuse(state, ["The shelf doesn't have that."]);
  // Food, gels, and gear are fueling. They cost coins, never an energy block,
  // so eating cannot make you too tired to eat. A nutrition sponsor can
  // discount the gel. The meal prices stay put.
  const price = itemId === "gel" ? pricedGel(state, item.cost) : { cost: item.cost, name: null };
  if (state.coins < price.cost) {
    return refuse(state, [`You need ${price.cost} coins. A shift at the Run Store would cover it.`]);
  }
  const before = state;
  const next = clone(state);
  next.coins -= price.cost;
  const lines = [...item.lines];
  if (itemId === "gel") {
    next.gels += 1;
    if (price.name) lines.push(`${price.name} covers part of the gel. You pay ${price.cost} coins.`);
  } else {
    next.condition.nutrition = clampFood(next, next.condition.nutrition + item.nutrition);
    next.condition.mealName = item.mealName;
    next.condition.mealQuality = item.mealQuality;
    next.condition.junk = item.junk;
  }
  sample(next);
  return finish(before, next, lines);
}

const HOME_FOOD = {
  meal: {
    nutrition: 24,
    mealName: "Kitchen oatmeal",
    mealQuality: "good",
    junk: false,
    flag: "homeMealUsed",
    used: "Already ate your home meal today.",
    lines: ["Kitchen oatmeal. Free, and it is a real meal."],
  },
  snack: {
    nutrition: 12,
    mealName: "Pantry snack",
    mealQuality: "poor",
    junk: true,
    flag: "homeSnackUsed",
    used: "Already had your home snack today.",
    lines: ["A pantry snack. It fills you, then it fades."],
  },
};

/**
 * The kitchen is free and costs no energy, once a day for each dish.
 * The grocery stays useful because it is not limited to one plate, and
 * because a gel still has to be bought. Sleep clears both flags.
 */
export function applyHomeFood(state, kind) {
  const food = HOME_FOOD[kind];
  if (!food) return refuse(state, ["The kitchen does not have that."]);
  if (state.calendar[food.flag]) {
    return refuse(state, [food.used]);
  }
  const before = state;
  const next = clone(state);
  next.condition.nutrition = clampFood(next, next.condition.nutrition + food.nutrition);
  next.condition.mealName = food.mealName;
  next.condition.mealQuality = food.mealQuality;
  next.condition.junk = food.junk;
  next.calendar[food.flag] = true;
  sample(next);
  return finish(before, next, [...food.lines]);
}

/**
 * Eating a gel outside a race. The rule is strict on purpose: you need a
 * gel, and you need an empty block. At 10/10 the gel stays in the pocket
 * for a bonk. Nutrition still rises by 12 when the gel goes down.
 */
export function canEatGel(state) {
  if ((state.gels || 0) <= 0) return { ok: false, reason: "No Stride Fuel gels in the pocket." };
  if (readEnergy(state) >= MAX_ENERGY) return { ok: false, reason: "Energy is already 10/10. Save the gel for a bonk." };
  return { ok: true, reason: "" };
}

export function applyEatGel(state) {
  const check = canEatGel(state);
  if (!check.ok) return refuse(state, [check.reason]);
  const before = state;
  const next = clone(state);
  next.gels -= 1;
  next.energy = Math.min(MAX_ENERGY, readEnergy(next) + GEL_ENERGY);
  const bonus = nutritionTuning(next).gelBonus;
  const gain = GEL_NUTRITION + bonus;
  next.condition.nutrition = clampFood(next, next.condition.nutrition + gain);
  next.calendar.slot = slotFromEnergy(next.energy);
  const extra = bonus ? ` ${nutritionTuning(next).name} adds ${bonus} more.` : "";
  return finish(before, next, [`You eat a Stride Fuel gel. +${GEL_ENERGY} energy, +${gain} nutrition.${extra}`]);
}

export function applyShoe(state, shoeId) {
  if (!isKnownShoe(shoeId)) return refuse(state, ["The shelf doesn't have that pair."]);
  const shoe = shoeById(shoeId);
  const owned = state.gear.owned.includes(shoeId);
  const wornOut = shoeWear(state.gear, shoeId).ratio >= 1;
  const price = pricedShoe(state, shoeId, owned, wornOut);
  if (!owned && shoe.price <= 0) {
    return refuse(state, ["You already own the trainers you arrived in."]);
  }
  if (state.coins < price.cost) {
    return refuse(state, [`${shoe.name} costs ${price.cost} coins.`]);
  }
  const before = state;
  const next = clone(state);
  next.coins -= price.cost;
  if (!owned) next.gear.owned = [...next.gear.owned, shoeId];
  next.gear.miles[shoeId] = 0;
  next.gear.equipped = shoeId;
  const dealNote = price.free
    ? " Your sponsor replaces them for free."
    : price.deal
      ? ` Sponsor price: ${price.cost} coins.`
      : "";
  const lines = owned
    ? [`You replace your ${shoe.name}. Miles reset, boosts come back.${dealNote}`]
    : [`You buy the ${shoe.name} and put them on.${dealNote}`];
  return finish(before, next, lines);
}

export function applyBuyCarry(state, carryId) {
  const item = carryById(carryId);
  if (!item) return refuse(state, ["The rack doesn't have that."]);
  const owned = (state.gear.ownedCarry || []).includes(carryId);
  const price = pricedCarry(state, carryId);
  if (owned) return refuse(state, ["You already own that. Equip it from the closet."]);
  if (state.coins < price.cost) {
    return refuse(state, [`${item.name} costs ${price.cost} coins.`]);
  }
  const before = state;
  const next = clone(state);
  next.coins -= price.cost;
  next.gear.ownedCarry = [...(next.gear.ownedCarry || []), carryId];
  next.gear.carry = carryId;
  // Switching to a smaller carry (vest to belt) has to pull nutrition
  // back under the new cap or the bar would sit past its maximum.
  next.condition.nutrition = clampFood(next, next.condition.nutrition);
  const dealNote = price.deal ? ` Sponsor price: ${price.cost} coins.` : "";
  return finish(before, next, [
    `You buy the ${item.name} and put it on. ${carryTradeText(item)}.${dealNote}`,
  ]);
}

export function applyEquipCarry(state, carryId) {
  const item = carryById(carryId);
  if (!item || !(state.gear.ownedCarry || []).includes(carryId)) {
    return refuse(state, ["That isn't in the closet."]);
  }
  if (state.gear.carry === carryId) return refuse(state, ["You're already wearing that."]);
  const before = state;
  const next = clone(state);
  next.gear.carry = carryId;
  next.condition.nutrition = clampFood(next, next.condition.nutrition);
  return finish(before, next, [`You put on the ${item.name}. ${carryTradeText(item)}.`]);
}

export function applyUnequipCarry(state) {
  if (!state.gear?.carry) return refuse(state, ["You aren't wearing a belt or a vest."]);
  const item = carryById(state.gear.carry);
  const before = state;
  const next = clone(state);
  next.gear.carry = null;
  next.condition.nutrition = clampFood(next, next.condition.nutrition);
  return finish(before, next, [`You take off the ${item ? item.name : "fuel carry"}. Max nutrition is 100 again.`]);
}

export function applyEquip(state, shoeId) {
  if (!state.gear.owned.includes(shoeId)) {
    return refuse(state, ["Those aren't in the closet."]);
  }
  if (state.gear.equipped === shoeId) {
    return refuse(state, ["You're already wearing those."]);
  }
  const before = state;
  const next = clone(state);
  next.gear.equipped = shoeId;
  return finish(before, next, [`You lace up the ${shoeById(shoeId).name}.`]);
}

export function applyShift(state, jobId, choiceId) {
  const job = JOBS[jobId];
  if (!job) return refuse(state, ["That shift isn't on the board."]);
  const choice = job.choices.find((item) => item.id === choiceId);
  if (!choice) return refuse(state, ["Pick one of the options."]);
  if (readEnergy(state) < 1) {
    return refuse(state, [LOW_ENERGY]);
  }
  const before = state;
  const next = clone(state);
  next.coins += choice.coins;
  next.condition.fatigue = clampMeter(next.condition.fatigue + 4);
  spendEnergy(next, 1, true);
  sample(next);
  return finish(before, next, [choice.reply, `You earn ${choice.coins} coins.`]);
}

function scaleXp(xp, factor) {
  const scaled = {};
  for (const key of XP_KEYS) {
    if (xp[key]) scaled[key] = Math.max(1, Math.round(xp[key] * factor));
  }
  return scaled;
}

const BONK_PROMPT = "You're starting to bonk! Eat a Stride Fuel gel before the bonk completes?";

function gelChoicePending(state, threat, choice) {
  return Boolean(threat.bonk && (state.gels || 0) > 0 && choice !== "eat" && choice !== "decline");
}

/**
 * The gel goes down after the effort is paid, then gives one block back
 * (never past 10) and 12 nutrition. Calling it only on the "eat" choice
 * keeps the decline path a pure bonk.
 */
function applyRescueGel(state) {
  state.gels -= 1;
  const bonus = nutritionTuning(state).gelBonus;
  state.condition.nutrition = clampFood(state, state.condition.nutrition + GEL_NUTRITION + bonus);
  state.energy = Math.min(MAX_ENERGY, readEnergy(state) + GEL_ENERGY);
  state.calendar.slot = slotFromEnergy(state.energy);
}

function addRaceFuel(state) {
  const bonus = nutritionTuning(state).raceFuel;
  if (!bonus) return 0;
  state.condition.nutrition = clampFood(state, state.condition.nutrition + bonus);
  return bonus;
}

function raceStartNutrition(state) {
  const bonus = nutritionTuning(state).raceFuel;
  if (!bonus) return state.condition.nutrition;
  return Math.min(maxNutritionFromGear(state.gear), state.condition.nutrition + bonus);
}

export function applyRace(state, raceId, roll = 0.5, choice, rng = Math.random) {
  const race = RACES[raceId];
  if (!race) return refuse(state, ["That race isn't on the calendar."]);
  if (raceId === "10k" && !isTenKOpen(state)) {
    return refuse(state, [`The Community 10K is still locked. ${describeNeeds(tenKStatus(state).needs)}`]);
  }
  const energyCost = race.energy || 1;
  if (readEnergy(state) < energyCost) {
    return refuse(state, [LOW_ENERGY]);
  }
  const threat = judgeBonk({
    nutrition: raceStartNutrition(state),
    sleepQuality: state.condition.sleepQuality,
    fatigue: state.condition.fatigue,
    roll,
    km: race.km,
  });
  if (gelChoicePending(state, threat, choice)) {
    return { ok: true, needsChoice: true, state, lines: [BONK_PROMPT], ticker: "", summary: null };
  }
  const rescued = Boolean(threat.bonk && choice === "eat" && (state.gels || 0) > 0);
  const before = state;
  const next = clone(state);
  const lines = [];
  let celebrate = false;
  let speaker = null;
  let quality = null;
  const fuel = addRaceFuel(next);
  if (fuel) lines.push(`${nutritionTuning(next).name} tops you up with ${fuel} nutrition at the gun.`);
  if (threat.bonk && !rescued && threat.dnf) {
    lines.push("Your stomach drops halfway down Brick Street.");
    lines.push("The world narrows to your shoes. You walk. DNF.");
    lines.push("Fitness was never the problem. Fuel and sleep were.");
    if ((state.gels || 0) === 0) lines.push("A Stride Fuel gel could have saved this.");
    addXp(next, race.dnfXp);
    next.condition.fatigue = clampMeter(next.condition.fatigue + race.dnfFatigue);
    next.condition.nutrition = clampFood(next, next.condition.nutrition - 12);
    addMiles(next, round1(race.miles / 2));
  } else if (threat.bonk && !rescued && threat.slowFinish) {
    lines.push("You bonk with the finish banner in sight and jog it in.");
    lines.push(`${flavorTime(race, 0, true)}. It counts, barely. Half credit, no prize purse.`);
    grantXp(next, scaleXp(race.xp, 0.5), race.style);
    addAttributes(next, scaleAttributes(race.attributes, 0.5));
    next.condition.fatigue = clampMeter(next.condition.fatigue + race.fatigue);
    next.condition.nutrition = clampFood(next, next.condition.nutrition + race.nutrition);
    next.condition.peak = clampMeter(next.condition.peak + Math.round(race.peak / 2));
    next.condition.endurance = clampMeter(next.condition.endurance + 1);
    addMiles(next, race.miles);
    if (raceId === "5k") next.progress.fiveKFinished = true;
    if (raceId === "10k") next.progress.tenKFinished = true;
    if ((state.gels || 0) === 0) lines.push("A Stride Fuel gel could have saved this.");
    // Jogging it in is a finish, not a win. No confetti.
    quality = "finish";
  } else {
    const form = raceFormScore(next, race);
    quality = finishQuality(form);
    const time = flavorTime(race, form, false);
    lines.push(rescued
      ? `The gel hits before the bonk does. You finish the ${race.name} in ${time}.`
      : `You finish the ${race.name} in ${time}.`);
    lines.push("The result board gets your name, and your pockets get coins.");
    grantXp(next, race.xp, race.style);
    addAttributes(next, race.attributes);
    next.coins += race.coins;
    const deal = shoeDealNumbers(next);
    if (deal?.raceCoins) {
      next.coins += deal.raceCoins;
      lines.push(`${deal.name} adds ${deal.raceCoins} coins for the finish.`);
    }
    next.condition.fatigue = clampMeter(next.condition.fatigue + race.fatigue);
    next.condition.nutrition = clampFood(next, next.condition.nutrition + race.nutrition);
    next.condition.peak = clampMeter(next.condition.peak + race.peak);
    next.condition.endurance = clampMeter(next.condition.endurance + race.endurance);
    addMiles(next, race.miles);
    if (raceId === "5k") next.progress.fiveKFinished = true;
    if (raceId === "10k") next.progress.tenKFinished = true;
  }
  if (quality) {
    const notice = noticeBrands(next, lines, { style: race.style, quality, channel: "finish" }, rng);
    speaker = notice.speaker;
    celebrate = quality === "win";
  }
  next.calendar.trainedToday = true;
  const sore = nextSoreness(next, { hard: true });
  next.condition.sore = sore.sore;
  next.condition.injury = sore.injury;
  spendEnergy(next, energyCost, true);
  if (rescued) applyRescueGel(next);
  sample(next);
  return withNotice(finish(before, next, lines), celebrate, speaker);
}

function noticeBrands(state, lines, event, rng) {
  const rolled = rollOffers(state, event, rng);
  lines.push(...rolled.lines);
  if (rolled.created.length === 1) {
    const sponsor = sponsorById(rolled.created[0].kind, rolled.created[0].id);
    return { speaker: sponsor ? `${sponsor.name} rep` : "Finish line" };
  }
  if (rolled.created.length > 1) return { speaker: "Finish line" };
  return { speaker: null };
}

function withNotice(result, celebrate, speaker) {
  if (celebrate) result.celebrate = true;
  if (speaker) result.speaker = speaker;
  return result;
}

function scaleAttributes(attributes, factor) {
  const scaled = {};
  for (const [key, amount] of Object.entries(attributes)) {
    scaled[key] = Math.max(1, Math.round(amount * factor));
  }
  return scaled;
}

function raceFormScore(state, race) {
  const pace = combinedMod(state, race.style, {
    shortRoad: race.style === "road" && (race.km || 0) <= 5.5,
  }).mod;
  return (
    (state.condition.endurance * race.ideal.endurance +
      state.condition.peak * race.ideal.peak -
      state.condition.fatigue * 0.3) *
    (1 + pace)
  );
}

export function applyRival(state, roll = 0.5, choice, rng = Math.random) {
  const energyCost = RIVAL.energy || 1;
  if (readEnergy(state) < energyCost) {
    return refuse(state, [LOW_ENERGY]);
  }
  const threat = judgeBonk({
    nutrition: raceStartNutrition(state),
    sleepQuality: state.condition.sleepQuality,
    fatigue: state.condition.fatigue,
    roll,
    km: 5,
  });
  if (gelChoicePending(state, threat, choice)) {
    return { ok: true, needsChoice: true, state, lines: [BONK_PROMPT], ticker: "", summary: null };
  }
  const rescued = Boolean(threat.bonk && choice === "eat" && (state.gels || 0) > 0);
  const before = state;
  const next = clone(state);
  const lines = [`Remy Calder, ${RIVAL.title}, toes the line beside you.`];
  let speaker = null;
  const fuel = addRaceFuel(next);
  if (fuel) lines.push(`${nutritionTuning(next).name} tops you up with ${fuel} nutrition at the gun.`);
  let win = false;
  if (threat.bonk && !rescued && threat.dnf) {
    lines.push("You bonk before the second bend. Remy jogs it in and waits, arms folded.");
    lines.push("DNF. Remy doesn't gloat. Much.");
    if ((state.gels || 0) === 0) lines.push("A Stride Fuel gel could have saved this.");
    addXp(next, RIVAL.loseXp);
    next.progress.rivalLosses += 1;
  } else if (threat.bonk && !rescued) {
    lines.push("You bonk on the last straight and Remy nips you at the line.");
    if ((state.gels || 0) === 0) lines.push("A Stride Fuel gel could have saved this.");
    addXp(next, RIVAL.loseXp);
    next.progress.rivalLosses += 1;
  } else {
    const scores = rivalScores(next, roll);
    win = scores.win;
    if (rescued) lines.push("The gel lands before your stomach does. The mile is a race again.");
    if (win) {
      lines.push("You hold the bend and kick past the kicker. Remy laughs, out of breath.");
      lines.push("A win. Coins, pride, and a little Marathon XP.");
      grantXp(next, RIVAL.winXp, "road");
      addAttributes(next, RIVAL.winAttributes);
      next.coins += RIVAL.coins;
      const deal = shoeDealNumbers(next);
      if (deal?.raceCoins) {
        next.coins += deal.raceCoins;
        lines.push(`${deal.name} adds ${deal.raceCoins} coins for the finish.`);
      }
      next.progress.rivalWins += 1;
    } else {
      lines.push("Remy kicks with 100 meters left and you don't have an answer.");
      lines.push("A loss still teaches. A little XP, and a reason to come back.");
      addXp(next, RIVAL.loseXp);
      addAttributes(next, RIVAL.loseAttributes);
      next.progress.rivalLosses += 1;
    }
  }
  next.condition.fatigue = clampMeter(next.condition.fatigue + RIVAL.fatigue);
  next.condition.nutrition = clampFood(next, next.condition.nutrition + RIVAL.nutrition);
  next.condition.peak = clampMeter(next.condition.peak + (win ? RIVAL.peak : 1));
  addMiles(next, RIVAL.miles);
  next.calendar.trainedToday = true;
  spendEnergy(next, energyCost, true);
  if (rescued) applyRescueGel(next);
  sample(next);
  // Beating Remy is a boss win. The offer is guaranteed when a road
  // brand is eligible. A loss does not draw anybody.
  if (win) {
    speaker = noticeBrands(next, lines, { style: "road", quality: "win", channel: "finish" }, rng).speaker;
  }
  return withNotice(finish(before, next, lines), win, speaker);
}

function sponsorField(kind) {
  return kind === "nutrition" ? "nutrition" : "shoe";
}

export function applySignSponsor(state, kind, id) {
  const sponsor = sponsorById(kind, id);
  if (!sponsor) return refuse(state, ["That brand is not offering a deal."]);
  const before = state;
  const next = clone(state);
  if (!next.sponsors) next.sponsors = emptySponsors();
  // A note that already aged out cannot be accepted. Expiry also starts
  // the short cooldown, same as letting it sit.
  const expired = expireOffers(next);
  const offer = liveOffer(next, kind);
  if (!offer || offer.id !== id) {
    const why = expired[0] || "They have not made an offer. Brands ask you. You do not sign from the list.";
    // An expired note has to stay expired. refuse(state) would throw
    // the cooldown away because it hands back the object from before.
    return refuse(expired.length ? next : state, [why]);
  }
  const status = gateStatus(next, sponsor);
  if (!status.open) {
    return refuse(state, [`Not yet. ${status.needs.filter((need) => !need.ok).map((need) => `${need.label} (${need.have})`).join(" ")}`]);
  }
  const field = sponsorField(kind);
  if (next.sponsors[field] === id) {
    return refuse(state, [`You already have a ${sponsor.name} deal.`]);
  }
  const previous = sponsorById(kind, next.sponsors[field]);
  next.sponsors[field] = id;
  next.sponsors.offers[kind] = null;
  if (field === "shoe") {
    next.sponsors.shoeTerms = { discount: offer.discount, raceCoins: offer.raceCoins };
  }
  // Leaving a brand for another one is the long cooldown. The closet
  // stays. They just will not call for two weeks.
  if (previous && previous.id !== id) {
    setCooldown(next, previous.id, COOLDOWN_LEAVE);
  }
  // A dropped deal sits under STANDING_DROP. Signing again starts clean.
  // Switching back to a deal you only paused keeps the standing you had.
  const previousStanding = next.sponsors.standing?.[id];
  if (typeof previousStanding !== "number" || previousStanding < STANDING_DROP) {
    next.sponsors.standing[id] = STANDING_START;
  }
  if (next.sponsors.obligation && next.sponsors.obligation.kind === field && next.sponsors.obligation.sponsorId !== id) {
    next.sponsors.obligation = null;
  }
  const lines = [];
  if (previous) {
    lines.push(`The ${previous.name} deal ends. Gear you already own stays in the closet. ${previous.name} will not offer again for ${COOLDOWN_LEAVE} days.`);
  }
  lines.push(`You accept ${sponsor.name}. Standing is ${next.sponsors.standing[id]}. Only one ${field === "shoe" ? "shoe" : "nutrition"} sponsor at a time.`);
  lines.push(field === "nutrition" ? nutritionPerkText(sponsor) : shoePerkText(sponsor, next.sponsors.shoeTerms));
  return finish(before, next, lines);
}

export function applyDeclineOffer(state, kind) {
  const before = state;
  const next = clone(state);
  if (!next.sponsors) next.sponsors = emptySponsors();
  const expired = expireOffers(next);
  const offer = liveOffer(next, kind);
  if (!offer) {
    return refuse(expired.length ? next : state, [expired[0] || "No offer to decline."]);
  }
  const sponsor = sponsorById(kind, offer.id);
  next.sponsors.offers[kind] = null;
  setCooldown(next, offer.id, COOLDOWN_PASS);
  return finish(before, next, [`You decline ${sponsor?.name || "the offer"}. They will not ask again for ${COOLDOWN_PASS} days.`]);
}

export function applyEndSponsor(state, kind) {
  const field = sponsorField(kind);
  const current = sponsorById(kind, state.sponsors?.[field]);
  if (!current) return refuse(state, ["You don't have that kind of deal."]);
  const before = state;
  const next = clone(state);
  next.sponsors[field] = null;
  if (field === "shoe") next.sponsors.shoeTerms = null;
  if (next.sponsors.obligation?.kind === field) next.sponsors.obligation = null;
  // Ending it yourself is the short wait, not the 14-day leave. They
  // can come back after a week if a result earns it.
  setCooldown(next, current.id, COOLDOWN_PASS);
  return finish(before, next, [`You end the ${current.name} deal. Your closet stays as it is. They can offer again in ${COOLDOWN_PASS} days.`]);
}

export function applyObligation(state, choice) {
  const job = state.sponsors?.obligation;
  if (!job) return refuse(state, ["No sponsor obligation today."]);
  const sponsor = sponsorById(job.kind, job.sponsorId);
  if (!sponsor) return refuse(state, ["That deal already ended."]);
  if (choice === "accept") {
    if (readEnergy(state) < 1) return refuse(state, [LOW_ENERGY]);
    const before = state;
    const next = clone(state);
    const standing = clampStanding(standingOf(next, job.sponsorId) + STANDING_ACCEPT);
    next.sponsors.standing[job.sponsorId] = standing;
    next.sponsors.obligation = null;
    next.coins += job.pay;
    next.condition.fatigue = clampMeter(next.condition.fatigue + 3);
    spendEnergy(next, 1, true);
    sample(next);
    return finish(before, next, [
      `${job.label} for ${sponsor.name} is done.`,
      `You earn ${job.pay} coins. Deal standing is ${standing}.`,
    ]);
  }
  if (choice === "skip") {
    const before = state;
    const next = clone(state);
    const standing = clampStanding(standingOf(next, job.sponsorId) - STANDING_SKIP);
    next.sponsors.standing[job.sponsorId] = standing;
    next.sponsors.obligation = null;
    const lines = [`You skip the ${job.label.toLowerCase()}. ${sponsor.name} standing falls to ${standing}.`];
    if (standing < STANDING_DROP) {
      const field = sponsorField(job.kind);
      next.sponsors[field] = null;
      if (field === "shoe") next.sponsors.shoeTerms = null;
      // Being dropped is the long cooldown, same as leaving them for a rival.
      setCooldown(next, job.sponsorId, COOLDOWN_LEAVE);
      lines.push(`${sponsor.name} drops the deal. They will not offer again for ${COOLDOWN_LEAVE} days.`);
    } else if (standing < STANDING_WARN) {
      lines.push(`${sponsor.name} warns you. Skip another and they may walk.`);
    }
    return finish(before, next, lines);
  }
  return refuse(state, ["Accept the obligation, or skip it."]);
}

export function acknowledgeWeek(state) {
  if (!state.pendingSummary) return state;
  const next = clone(state);
  next.pendingSummary = null;
  return next;
}

export function perform(state, action, roll = 0.5, rng = Math.random) {
  switch (action.type) {
    case "run":
      return applyRun(state, action.id, rng);
    case "sleep":
      return applySleep(state);
    case "nap":
      return applyNap(state);
    case "buy":
      return applyPurchase(state, action.id);
    case "home-food":
      return applyHomeFood(state, action.id);
    case "shoe":
      return applyShoe(state, action.id);
    case "equip":
      return applyEquip(state, action.id);
    case "buy-carry":
      return applyBuyCarry(state, action.id);
    case "equip-carry":
      return applyEquipCarry(state, action.id);
    case "unequip-carry":
      return applyUnequipCarry(state);
    case "sign-sponsor":
      return applySignSponsor(state, action.kind, action.id);
    case "decline-offer":
      return applyDeclineOffer(state, action.kind);
    case "end-sponsor":
      return applyEndSponsor(state, action.kind);
    case "obligation":
      return applyObligation(state, action.choice);
    case "shift":
      return applyShift(state, action.job, action.choice);
    case "race":
      return applyRace(state, action.id, roll, action.choice, rng);
    case "rival":
      return applyRival(state, roll, action.choice, rng);
    case "eat-gel":
      return applyEatGel(state);
    default:
      return refuse(state, ["Nothing happens."]);
  }
}

function item(label, detail, action, disabled, disabledReason) {
  return { label, detail, action, disabled: Boolean(disabled), disabledReason: disabledReason || "" };
}

function runEnergyCost(runId) {
  return runId === "long-run" || runId === "ridge-repeats" ? 2 : 1;
}

function runItem(state, runId) {
  const run = RUNS[runId];
  const cost = runEnergyCost(runId);
  const tired = readEnergy(state) < cost;
  const miles = run.miles > 0 ? `${round1(run.miles)} mi · ` : "";
  return item(
    run.name,
    `${miles}${cost} energy`,
    { type: "run", id: runId },
    tired,
    LOW_ENERGY,
  );
}

export function menuFor(locationId, state) {
  const tooLateToNap = slotFromEnergy(readEnergy(state)) >= 3;
  const alreadyNapped = Boolean(state.nappedToday);
  const napBlocked = tooLateToNap || alreadyNapped || readEnergy(state) < 1;
  const napReason = alreadyNapped
    ? "You already napped today. Sleep will refill energy."
    : tooLateToNap
      ? "Naps are for daytime. Sleep instead."
      : LOW_ENERGY;
  switch (locationId) {
    case "home":
      return {
        title: "Home",
        speaker: "Home",
        intro: "Shoes by the door. The couch knows your name.",
        items: [
          item("Sleep", "End the day · refill energy to 10/10", { type: "sleep" }),
          item(
            "Daytime Nap",
            "1 energy · sheds fatigue · does not refill energy",
            { type: "nap" },
            napBlocked,
            napReason,
          ),
          item(
            "Eat healthy meal",
            state.calendar.homeMealUsed ? "Used today" : "Free · +24 Nutrition (1/day)",
            { type: "home-food", id: "meal" },
            Boolean(state.calendar.homeMealUsed),
            "Already ate your home meal today.",
          ),
          item(
            "Eat quick snack",
            state.calendar.homeSnackUsed ? "Used today" : "Free · +12 Nutrition (1/day)",
            { type: "home-food", id: "snack" },
            Boolean(state.calendar.homeSnackUsed),
            "Already had your home snack today.",
          ),
          item("Closet", "Shoes, belts, vests", { type: "open-gear" }),
          item("Sponsors", "Offers, deals, obligations", { type: "open-sponsors" }),
          item("Save Game", "This browser only", { type: "save" }),
        ],
      };
    case "gym":
      return {
        title: "Gym",
        speaker: "Gym",
        intro: "Rubber floors and a row of treadmills facing a brick wall.",
        items: [
          runItem(state, "treadmill"),
          runItem(state, "strength"),
        ],
      };
    case "store":
      return {
        title: "Run Store",
        speaker: "Run Store",
        intro: "Manager Nia is lacing a demo shoe on the stool.",
        items: [
          ...Object.values(JOBS).map((job) =>
            item(job.label, job.detail, { type: "open-shift", job: job.id }, readEnergy(state) < 1, LOW_ENERGY),
          ),
          item("Shop shoes", "Trail, Marathon, Backyard", { type: "open-shoe-categories" }),
          item("Belts & vests", "+5 or +10 max nutrition", { type: "open-carry-shop" }),
          item("Sponsors", "Offers, deals, obligations", { type: "open-sponsors" }),
        ],
      };
    case "grocery":
      return {
        title: "Grocery",
        speaker: "Grocery",
        intro: "The produce is better than the pastry case. Both are for sale.",
        items: [
          item(SHOP.meal.label, SHOP.meal.detail, { type: "buy", id: "meal" }, state.coins < SHOP.meal.cost, "Not enough coins."),
          item(SHOP.snack.label, SHOP.snack.detail, { type: "buy", id: "snack" }, state.coins < SHOP.snack.cost, "Not enough coins."),
          item(
            SHOP.gel.label,
            gelMenuDetail(state),
            { type: "buy", id: "gel" },
            state.coins < pricedGel(state, SHOP.gel.cost).cost,
            "Not enough coins.",
          ),
        ],
      };
    case "park":
      return {
        title: "Park",
        speaker: "Park",
        intro: "A dirt loop circles the pond. The grass is for picnics, the path is for you.",
        items: [
          runItem(state, "easy-run"),
          runItem(state, "long-run"),
          runItem(state, "park-trail"),
          runItem(state, "yards"),
        ],
      };
    case "track":
      return {
        title: "Local Track",
        speaker: "Track booth",
        intro: "Lanes are open. The 5K board is nailed to the booth.",
        items: [
          runItem(state, "intervals"),
          item("Brick City 5K", "Open · race readiness", { type: "open-race", id: "5k" }),
          item(
            "Community 10K",
            isTenKOpen(state) ? "Open · race readiness" : describeNeeds(tenKStatus(state).needs),
            { type: "open-race", id: "10k" },
            !isTenKOpen(state),
            describeNeeds(tenKStatus(state).needs),
          ),
          item(
            "Brick City Half",
            halfStatus(state).ready
              ? "Requirements met. The race arrives in a later season."
              : describeNeeds(halfStatus(state).needs),
            { type: "noop" },
            true,
            halfStatus(state).ready
              ? "The half marathon arrives in a later season. You're on the list."
              : describeNeeds(halfStatus(state).needs),
          ),
        ],
      };
    case "mountain": {
      const status = mountainStatus(state);
      return {
        title: "Mountain Gate",
        speaker: "Ranger Inez Quill",
        intro: status.open
          ? "The gate is swung back. The ridge starts steep and stays that way."
          : "I'm Ranger Inez Quill. The high trail stays shut until you're ready.",
        items: status.open
          ? [runItem(state, "ridge-repeats")]
          : status.needs.map((need) =>
              item(need.label, need.have, { type: "noop" }, true, need.ok ? "Already done." : `Still need this. ${need.have}.`),
            ),
      };
    }
    default:
      return null;
  }
}

export function jobScript(jobId) {
  return JOBS[jobId] || null;
}

function headerItem(label, detail) {
  return { label, detail: detail || "", action: { type: "noop" }, disabled: false, disabledReason: "", header: true };
}

function gelMenuDetail(state) {
  const price = pricedGel(state, SHOP.gel.cost);
  const discount = price.name ? ` · ${price.name} deal` : "";
  return `${price.cost} coins · 0 energy · held ${state.gels || 0}${discount}`;
}

function shoePriceDetail(state, shoe, owned) {
  const worn = shoeWear(state.gear, shoe.id);
  const price = pricedShoe(state, shoe.id, owned, worn.ratio >= 1);
  const tag = `[${styleLabel(shoe.style)}]`;
  const wear = `${wearPercent(state.gear, shoe.id)}% wear`;
  if (!owned) {
    const costText = price.deal ? `${price.cost} coins (was ${price.base})` : `${price.cost} coins`;
    return {
      label: `Buy ${tag} ${shoe.name}`,
      detail: `${costText} · ${shoeTradeText(shoe)}`,
      cost: price.cost,
    };
  }
  const costText = price.free ? "free replacement" : price.deal ? `${price.cost} coins (sponsor)` : `${price.cost} coins`;
  return {
    label: `Replace ${tag} ${shoe.name}`,
    detail: `${costText} · ${worn.label} · ${wear} · ${Math.round(state.gear.miles[shoe.id] || 0)}/${shoe.maxMiles} mi`,
    cost: price.cost,
  };
}

export function shoeCategoryItems() {
  return [
    item("Trail shoes", "Dirt and climbing. −Marathon and track pace", { type: "open-shop-style", style: "trail" }),
    item("Marathon shoes", "Road pace and speed. −Trail, more long-ultra fatigue", { type: "open-shop-style", style: "road" }),
    item("Backyard Ultra shoes", "Versatile. −Speed in short road races, −Trail on steep ridges", { type: "open-shop-style", style: "versatile" }),
  ];
}

export function shoeStyleItems(state, style) {
  const rows = [headerItem(styleLabel(style), "Boosts this style. The other lines are the cost.")];
  for (const shoe of shoesOfStyle(style)) {
    const owned = state.gear.owned.includes(shoe.id);
    if (!owned && shoe.price <= 0) continue;
    const worn = shoeWear(state.gear, shoe.id);
    const priced = shoePriceDetail(state, shoe, owned);
    if (!owned) {
      rows.push(item(
        priced.label,
        priced.detail,
        { type: "shoe", id: shoe.id },
        state.coins < priced.cost,
        `Need ${priced.cost} coins.`,
      ));
      continue;
    }
    const on = state.gear.equipped === shoe.id;
    if (!on) {
      rows.push(item(
        `Wear [${styleLabel(shoe.style)}] ${shoe.name}`,
        `${worn.label} · ${wearPercent(state.gear, shoe.id)}% wear · free to swap`,
        { type: "equip", id: shoe.id },
      ));
    }
    rows.push(item(
      priced.label,
      priced.detail,
      { type: "shoe", id: shoe.id },
      state.coins < priced.cost,
      `Need ${priced.cost} coins.`,
    ));
  }
  return rows;
}

export function shoeShopItems(state) {
  const rows = [...shoeCategoryItems()];
  const equipped = shoeById(state.gear.equipped);
  const priced = shoePriceDetail(state, equipped, true);
  rows.unshift(item(
    priced.label,
    priced.detail,
    { type: "shoe", id: equipped.id },
    state.coins < priced.cost,
    `Need ${priced.cost} coins.`,
  ));
  return rows;
}

export function carryShopItems(state) {
  const rows = [
    headerItem("Running belts", "+5 max nutrition. No speed penalty. Any style."),
  ];
  const belts = Object.values(CARRY).filter((entry) => entry.kind === "belt");
  const vests = Object.values(CARRY).filter((entry) => entry.kind === "vest");
  for (const entry of belts) rows.push(carryRow(state, entry));
  rows.push(headerItem("Trail hydration vests", "+10 max nutrition. Small −speed in short road races."));
  for (const entry of vests) rows.push(carryRow(state, entry));
  return rows;
}

function carryRow(state, entry) {
  const owned = (state.gear.ownedCarry || []).includes(entry.id);
  const on = state.gear.carry === entry.id;
  const price = pricedCarry(state, entry.id);
  if (!owned) {
    const costText = price.deal ? `${price.cost} coins (was ${price.base})` : `${price.cost} coins`;
    return item(
      `Buy ${entry.name}`,
      `${costText} · +${carryNutrition(entry)} max nutrition · ${entry.kind === "belt" ? "no speed penalty" : "−speed in short road races"}`,
      { type: "buy-carry", id: entry.id },
      state.coins < price.cost,
      `Need ${price.cost} coins.`,
    );
  }
  if (on) {
    return item(`Unequip ${entry.name}`, carryTradeText(entry), { type: "unequip-carry" });
  }
  return item(`Wear ${entry.name}`, carryTradeText(entry), { type: "equip-carry", id: entry.id });
}

export function closetItems(state) {
  const rows = [];
  const eat = canEatGel(state);
  rows.push(item(
    eat.ok ? "Eat 1 gel (+1 energy)" : "Eat a gel",
    eat.ok ? "0 coins · +1 energy · +12 nutrition" : eat.reason,
    { type: "eat-gel" },
    !eat.ok,
    eat.reason,
  ));
  rows.push(headerItem("Shoes", "One pair at a time."));
  for (const id of state.gear.owned || []) {
    const shoe = shoeById(id);
    const worn = shoeWear(state.gear, id);
    const on = state.gear.equipped === id;
    rows.push(item(
      on ? `[${styleLabel(shoe.style)}] ${shoe.name} (on)` : `Equip [${styleLabel(shoe.style)}] ${shoe.name}`,
      `${shoeTradeText(shoe)} · ${worn.label} · ${wearPercent(state.gear, id)}% wear · ${Math.round(state.gear.miles[id] || 0)}/${shoe.maxMiles} mi`,
      { type: "equip", id },
      on,
      "Already wearing these.",
    ));
  }
  rows.push(headerItem("Belts & vests", "One fuel-carry item. Belts +5, vests +10."));
  const ownedCarry = state.gear.ownedCarry || [];
  if (state.gear.carry) {
    const wornItem = carryById(state.gear.carry);
    rows.push(item(
      `Unequip ${wornItem ? wornItem.name : "fuel carry"}`,
      wornItem ? carryTradeText(wornItem) : "Back to max nutrition 100",
      { type: "unequip-carry" },
    ));
  }
  if (ownedCarry.length === 0) {
    rows.push(item("No belt or vest yet", "The Run Store sells them", { type: "noop" }, true, "Buy one at the Run Store."));
  }
  for (const id of ownedCarry) {
    if (id === state.gear.carry) continue;
    const entry = carryById(id);
    if (!entry) continue;
    rows.push(item(
      `Equip ${entry.name}`,
      carryTradeText(entry),
      { type: "equip-carry", id },
    ));
  }
  rows.push(item("Sponsors", "Deals, standing, obligations", { type: "open-sponsors" }));
  return rows;
}

function offerTermsDetail(kind, sponsor, offer) {
  if (kind === "nutrition") return nutritionPerkText(sponsor);
  return shoePerkText(sponsor, offer);
}

function sponsorRows(state, kind, ids) {
  const field = kind === "nutrition" ? "nutrition" : "shoe";
  const activeId = state.sponsors?.[field] || null;
  const pending = liveOffer(state, kind);
  const rows = [];
  if (activeId) {
    const sponsor = sponsorById(kind, activeId);
    if (sponsor) {
      const terms = kind === "shoe" ? shoeDealNumbers(state) : null;
      const perk = kind === "nutrition" ? nutritionPerkText(sponsor) : shoePerkText(sponsor, terms);
      rows.push(item(
        `End ${sponsor.name} deal`,
        `Standing ${standingOf(state, sponsor.id)}. ${perk}`,
        { type: "end-sponsor", kind },
      ));
    }
  } else {
    rows.push(item(
      kind === "shoe" ? "No shoe sponsor" : "No nutrition sponsor",
      "Brands offer when a result in their style is good enough.",
      { type: "noop" },
      true,
      "No deal yet.",
    ));
  }
  if (pending) {
    const sponsor = sponsorById(kind, pending.id);
    if (sponsor) {
      const perk = offerTermsDetail(kind, sponsor, pending);
      rows.push(item(
        `Accept ${sponsor.name}`,
        perk,
        { type: "sign-sponsor", kind, id: pending.id },
      ));
      rows.push(item(
        `Decline ${sponsor.name}`,
        `They wait ${COOLDOWN_PASS} days before asking again.`,
        { type: "decline-offer", kind },
      ));
    }
  }
  const locked = [];
  const watching = [];
  for (const id of ids) {
    if (id === activeId || id === pending?.id) continue;
    const sponsor = sponsorById(kind, id);
    const status = gateStatus(state, sponsor);
    if (!status.open) {
      const needs = status.needs.filter((need) => !need.ok).map((need) => need.label).join(" · ");
      locked.push(item(
        `${sponsor.name} · not interested yet`,
        needs,
        { type: "noop" },
        true,
        `${sponsor.name} is not interested yet.`,
      ));
      continue;
    }
    watching.push(item(
      `${sponsor.name} · watching`,
      "No offer right now.",
      { type: "noop" },
      true,
      "They have not made an offer.",
    ));
  }
  rows.push(...watching);
  rows.push(...locked);
  return rows;
}

export function sponsorMenuItems(state) {
  const rows = [];
  const job = state.sponsors?.obligation;
  if (job) {
    const brand = sponsorById(job.kind, job.sponsorId);
    const name = brand ? brand.name : "your sponsor";
    const tired = readEnergy(state) < 1;
    rows.push(item(
      `Do ${job.label}`,
      `1 energy · +${job.pay} coins · ${name} standing up`,
      { type: "obligation", choice: "accept" },
      tired,
      LOW_ENERGY,
    ));
    rows.push(item(
      `Skip ${job.label}`,
      `${name} standing goes down. Too many skips ends the deal.`,
      { type: "obligation", choice: "skip" },
    ));
  } else if ((state.sponsors?.shoe || state.sponsors?.nutrition)) {
    rows.push(headerItem("No obligation today", "The next note shows up after you sleep."));
  }
  rows.push(headerItem("Shoe deals", "One shoe sponsor. Rivals can offer better terms."));
  rows.push(...sponsorRows(state, "shoe", SHOE_SPONSOR_IDS));
  rows.push(headerItem("Nutrition deals", "One fuel deal. Stacks with a belt or vest. No speed penalty."));
  rows.push(...sponsorRows(state, "nutrition", NUTRITION_SPONSOR_IDS));
  return rows;
}

export function chatLines(locationId) {
  if (locationId === "chat-juniper") {
    return {
      speaker: "Juniper Hale",
      lines: [
        "The dirt loop is kind until it isn't.",
        "Five of those and the ranger starts to know your name.",
      ],
    };
  }
  if (locationId === "chat-bram") {
    return {
      speaker: "Coach Bram",
      lines: [
        "Easy days are still training days.",
        "Peak gets you the 5K. Endurance gets you home after.",
      ],
    };
  }
  if (locationId === "depot") {
    return {
      speaker: "Sam Hollis",
      lines: [
        "Brick City stays this size on purpose.",
        "Finish the races here and the depot opens new towns: Ridgeview, Lakeport, Mesa Verde Flats, Flatland, then Summit Hollow.",
        "Same training spots in every city. Different races, different trouble. Not this season, though. The bus is still in the shop.",
      ],
    };
  }
  if (locationId === "rival") {
    return {
      speaker: "Remy Calder",
      lines: ["You again. One mile, no excuses. Readiness board is right there if you want the truth first."],
    };
  }
  return null;
}

export function calendarView(state) {
  return {
    when: formatWhen(state.calendar),
    weekIndex: state.calendar.weekIndex,
    weekMiles: state.calendar.weekMiles,
    weekXp: state.calendar.weekXp,
    daysSinceRun: state.calendar.daysSinceRun,
    hardWeeks: state.calendar.hardWeeks,
    races: [
      { name: "Brick City 5K", status: "Open", detail: "Local Track" },
      {
        name: "Community 10K",
        status: isTenKOpen(state) ? "Open" : "Locked",
        detail: isTenKOpen(state) ? "Local Track" : describeNeeds(tenKStatus(state).needs),
      },
      {
        name: "Brick City Half",
        status: "Locked",
        detail: halfStatus(state).ready
          ? "Requirements met. Coming in a later build."
          : describeNeeds(halfStatus(state).needs),
      },
      {
        name: "Mountain trail",
        status: isMountainOpen(state) ? "Open" : "Locked",
        detail: describeNeeds(mountainStatus(state).needs),
      },
    ],
    history: state.weeklyHistory,
    sponsorNotes: sponsorSummaryLines(state),
  };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

export { RUNS, formatWhen };
