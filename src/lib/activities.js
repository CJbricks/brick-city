/**
 * activities.js
 * What you can do in town, and the pure functions that apply a choice to
 * a save. React calls these and then stores the returned state. Nothing
 * in here reads the clock or Math.random. When a race needs luck, the
 * screen passes a roll in, so tests can force a win, a loss, or a bonk.
 *
 * A returned object always has { ok, state, lines, ticker }. `ok: false`
 * means the day was too short or the coins weren't there, and `state` is
 * the same object you passed in.
 */

import { canFit, formatWhen, isSunday, sleepPlan, summarizeWeek } from "@/lib/calendar";
import {
  HARD_WEEK_AVG_FATIGUE,
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
  RACES,
  RIVAL,
  SHOES,
  flavorTime,
  gearModForStyle,
  judgeBonk,
  rivalScores,
  shoeById,
  shoeWear,
  replaceCost,
} from "@/lib/race";
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
import { homeSpawn } from "@/game/town";

const XP_KEYS = ["overall", "trail", "marathon", "ultra", "versatile"];

export const JOBS = {
  shoes: {
    id: "shoes",
    label: "Help a customer",
    detail: "1 slot · shoe advice",
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
    detail: "1 slot · shelf work",
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
    detail: "1 slot · fitting stool",
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
    detail: "18 coins · pasta and greens",
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
    detail: "7 coins · counter pastry",
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
    detail: "12 coins · race pocket",
    cost: 12,
    lines: ["You tuck a gel in the pocket of your shorts. It can cover one shaky start."],
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
    },
    gels: 0,
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

function consumeSlots(state, cost, drain) {
  for (let i = 0; i < cost; i += 1) {
    if (drain) {
      state.condition.nutrition = clampMeter(state.condition.nutrition - slotDrain(state.condition));
    }
    state.calendar.slot += 1;
  }
  // A snack's junk flag only taxes the next effort, then it's gone.
  if (drain && state.condition.junk) state.condition.junk = false;
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
  state.condition.nutrition = clampMeter(state.condition.nutrition + (activity.nutrition || 0));
  // High fatigue blunts the peak you just earned. The design is explicit:
  // peak drops when fatigue stays high.
  if (state.condition.fatigue >= 75 && (activity.peak || 0) > 0) {
    state.condition.peak = clampMeter(state.condition.peak - 2);
  }
}

export function applyRun(state, runId) {
  const activity = RUNS[runId];
  if (!activity) return refuse(state, ["That session isn't on the board."]);
  if (runId === "ridge-repeats" && !isMountainOpen(state)) {
    return refuse(state, ["The ranger hasn't opened the gate."]);
  }
  if (!canFit(state.calendar.slot, activity.slots)) {
    return refuse(state, ["That would run past the end of the night. Sleep, or pick something shorter."]);
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
  addXp(next, activity.xp);
  addAttributes(next, activity.attributes);
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
  consumeSlots(next, activity.slots, true);
  sample(next);
  if (activity.miles > 0) {
    lines.push(`${round1(activity.miles)} miles in the book.`);
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
  next.condition.nutrition = clampMeter(next.condition.nutrition - overnight);
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
  next.calendar.slot = 0;
  next.calendar.trainedToday = false;
  sample(next);

  const result = finish(before, next, lines);
  result.summary = summary;
  return result;
}

export function applyNap(state) {
  if (state.calendar.slot >= 3) {
    return refuse(state, ["Too late for a nap. Sleep will end the day instead."]);
  }
  if (!canFit(state.calendar.slot, 1)) {
    return refuse(state, ["The day is already spent."]);
  }
  const before = state;
  const next = clone(state);
  next.condition.fatigue = clampMeter(next.condition.fatigue - NAP_FATIGUE_RELIEF);
  const lines = ["You stretch out on the couch. A short nap, not a new day."];
  if (next.calendar.daysSinceRun >= 3) {
    next.condition.peak = clampMeter(next.condition.peak - NAP_PEAK_LOSS_IF_DETRAINING);
    lines.push("Extra rest while you are already detraining nicks Peak Fitness.");
  }
  consumeSlots(next, 1, true);
  sample(next);
  return finish(before, next, lines);
}

export function applyPurchase(state, itemId) {
  const item = SHOP[itemId];
  if (!item) return refuse(state, ["The shelf doesn't have that."]);
  if (!canFit(state.calendar.slot, 1)) {
    return refuse(state, ["The grocer is closing. Sleep and come back."]);
  }
  if (state.coins < item.cost) {
    return refuse(state, [`You need ${item.cost} coins. A shift at the Run Store would cover it.`]);
  }
  const before = state;
  const next = clone(state);
  next.coins -= item.cost;
  if (itemId === "gel") {
    next.gels += 1;
  } else {
    next.condition.nutrition = clampMeter(next.condition.nutrition + item.nutrition);
    next.condition.mealName = item.mealName;
    next.condition.mealQuality = item.mealQuality;
    next.condition.junk = item.junk;
  }
  consumeSlots(next, 1, false);
  sample(next);
  return finish(before, next, [...item.lines]);
}

export function applyShoe(state, shoeId) {
  const shoe = shoeById(shoeId);
  const owned = state.gear.owned.includes(shoeId);
  const cost = owned ? replaceCost(shoeId) : shoe.price;
  if (!owned && shoe.price <= 0) {
    return refuse(state, ["You already own the trainers you arrived in."]);
  }
  if (state.coins < cost) {
    return refuse(state, [`${shoe.name} costs ${cost} coins.`]);
  }
  const before = state;
  const next = clone(state);
  next.coins -= cost;
  if (!owned) next.gear.owned = [...next.gear.owned, shoeId];
  next.gear.miles[shoeId] = 0;
  next.gear.equipped = shoeId;
  const lines = owned
    ? [`You replace your ${shoe.name}. Miles reset, boosts come back.`]
    : [`You buy the ${shoe.name} and put them on.`];
  return finish(before, next, lines);
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
  if (!canFit(state.calendar.slot, 1)) {
    return refuse(state, ["The store is locking up. Come back tomorrow."]);
  }
  const before = state;
  const next = clone(state);
  next.coins += choice.coins;
  next.condition.fatigue = clampMeter(next.condition.fatigue + 4);
  consumeSlots(next, 1, true);
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

export function applyRace(state, raceId, roll = 0.5) {
  const race = RACES[raceId];
  if (!race) return refuse(state, ["That race isn't on the calendar."]);
  if (raceId === "10k" && !isTenKOpen(state)) {
    return refuse(state, [`The Community 10K is still locked. ${describeNeeds(tenKStatus(state).needs)}`]);
  }
  if (!canFit(state.calendar.slot, race.slots)) {
    return refuse(state, ["There isn't enough day left to toe the line."]);
  }
  const before = state;
  const next = clone(state);
  const verdict = judgeBonk({
    nutrition: next.condition.nutrition,
    sleepQuality: next.condition.sleepQuality,
    fatigue: next.condition.fatigue,
    gels: next.gels,
    roll,
    km: race.km,
  });
  if (verdict.usedGel) next.gels -= 1;
  const lines = [];
  if (verdict.reason === "low-fuel-poor-sleep") {
    lines.push("Your stomach drops halfway down Brick Street.");
    lines.push("The world narrows to your shoes. You walk. DNF.");
    lines.push("Fitness was never the problem. Fuel and sleep were.");
    addXp(next, race.dnfXp);
    next.condition.fatigue = clampMeter(next.condition.fatigue + race.dnfFatigue);
    next.condition.nutrition = clampMeter(next.condition.nutrition - 12);
    addMiles(next, round1(race.miles / 2));
  } else if (verdict.slowFinish) {
    lines.push("You bonk with the finish banner in sight and jog it in.");
    lines.push(`${flavorTime(race, 0, true)}. It counts, barely. Half credit, no prize purse.`);
    addXp(next, scaleXp(race.xp, 0.5));
    addAttributes(next, scaleAttributes(race.attributes, 0.5));
    next.condition.fatigue = clampMeter(next.condition.fatigue + race.fatigue);
    next.condition.nutrition = clampMeter(next.condition.nutrition + race.nutrition);
    next.condition.peak = clampMeter(next.condition.peak + Math.round(race.peak / 2));
    next.condition.endurance = clampMeter(next.condition.endurance + 1);
    addMiles(next, race.miles);
    if (raceId === "5k") next.progress.fiveKFinished = true;
    if (raceId === "10k") next.progress.tenKFinished = true;
  } else if (verdict.dnf) {
    lines.push("The bonk hits and you step off. DNF.");
    addXp(next, race.dnfXp);
    next.condition.fatigue = clampMeter(next.condition.fatigue + race.dnfFatigue);
    next.condition.nutrition = clampMeter(next.condition.nutrition - 12);
    addMiles(next, round1(race.miles / 2));
  } else {
    const form = raceFormScore(next, race);
    const time = flavorTime(race, form, false);
    lines.push(`You finish the ${race.name} in ${time}.`);
    if (verdict.usedGel) lines.push("The gel keeps the wheels on when your legs argue.");
    lines.push("The result board gets your name, and your pockets get coins.");
    addXp(next, race.xp);
    addAttributes(next, race.attributes);
    next.coins += race.coins;
    next.condition.fatigue = clampMeter(next.condition.fatigue + race.fatigue);
    next.condition.nutrition = clampMeter(next.condition.nutrition + race.nutrition);
    next.condition.peak = clampMeter(next.condition.peak + race.peak);
    next.condition.endurance = clampMeter(next.condition.endurance + race.endurance);
    addMiles(next, race.miles);
    if (raceId === "5k") next.progress.fiveKFinished = true;
    if (raceId === "10k") next.progress.tenKFinished = true;
  }
  next.calendar.trainedToday = true;
  const sore = nextSoreness(next, { hard: true });
  next.condition.sore = sore.sore;
  next.condition.injury = sore.injury;
  consumeSlots(next, race.slots, true);
  sample(next);
  return finish(before, next, lines);
}

function scaleAttributes(attributes, factor) {
  const scaled = {};
  for (const [key, amount] of Object.entries(attributes)) {
    scaled[key] = Math.max(1, Math.round(amount * factor));
  }
  return scaled;
}

function raceFormScore(state, race) {
  return (
    state.condition.endurance * race.ideal.endurance +
    state.condition.peak * race.ideal.peak -
    state.condition.fatigue * 0.3
  );
}

export function applyRival(state, roll = 0.5) {
  if (!canFit(state.calendar.slot, RIVAL.slots)) {
    return refuse(state, ["Remy looks at the sky. Too late to race tonight."]);
  }
  const before = state;
  const next = clone(state);
  const verdict = judgeBonk({
    nutrition: next.condition.nutrition,
    sleepQuality: next.condition.sleepQuality,
    fatigue: next.condition.fatigue,
    gels: next.gels,
    roll,
    km: 5,
  });
  if (verdict.usedGel) next.gels -= 1;
  const lines = [`Remy Calder, ${RIVAL.title}, toes the line beside you.`];
  let win = false;
  if (verdict.dnf || verdict.reason === "low-fuel-poor-sleep") {
    lines.push("You bonk before the second bend. Remy jogs it in and waits, arms folded.");
    lines.push("DNF. Remy doesn't gloat. Much.");
    addXp(next, RIVAL.loseXp);
    next.progress.rivalLosses += 1;
  } else {
    const scores = rivalScores(next, roll);
    win = scores.win && !verdict.slowFinish;
    if (verdict.slowFinish) {
      lines.push("You bonk on the last straight and Remy nips you at the line.");
      win = false;
    }
    if (win) {
      lines.push("You hold the bend and kick past the kicker. Remy laughs, out of breath.");
      lines.push("A win. Coins, pride, and a little Marathon XP.");
      addXp(next, RIVAL.winXp);
      addAttributes(next, RIVAL.winAttributes);
      next.coins += RIVAL.coins;
      next.progress.rivalWins += 1;
    } else if (!verdict.slowFinish) {
      lines.push("Remy kicks with 100 meters left and you don't have an answer.");
      lines.push("A loss still teaches. A little XP, and a reason to come back.");
      addXp(next, RIVAL.loseXp);
      addAttributes(next, RIVAL.loseAttributes);
      next.progress.rivalLosses += 1;
    } else {
      addXp(next, RIVAL.loseXp);
      next.progress.rivalLosses += 1;
    }
  }
  next.condition.fatigue = clampMeter(next.condition.fatigue + RIVAL.fatigue);
  next.condition.nutrition = clampMeter(next.condition.nutrition + RIVAL.nutrition);
  next.condition.peak = clampMeter(next.condition.peak + (win ? RIVAL.peak : 1));
  addMiles(next, RIVAL.miles);
  next.calendar.trainedToday = true;
  consumeSlots(next, RIVAL.slots, true);
  sample(next);
  return finish(before, next, lines);
}

export function acknowledgeWeek(state) {
  if (!state.pendingSummary) return state;
  const next = clone(state);
  next.pendingSummary = null;
  return next;
}

export function perform(state, action, roll = 0.5) {
  switch (action.type) {
    case "run":
      return applyRun(state, action.id);
    case "sleep":
      return applySleep(state);
    case "nap":
      return applyNap(state);
    case "buy":
      return applyPurchase(state, action.id);
    case "shoe":
      return applyShoe(state, action.id);
    case "equip":
      return applyEquip(state, action.id);
    case "shift":
      return applyShift(state, action.job, action.choice);
    case "race":
      return applyRace(state, action.id, roll);
    case "rival":
      return applyRival(state, roll);
    default:
      return refuse(state, ["Nothing happens."]);
  }
}

function item(label, detail, action, disabled, disabledReason) {
  return { label, detail, action, disabled: Boolean(disabled), disabledReason: disabledReason || "" };
}

function runItem(state, runId) {
  const run = RUNS[runId];
  const late = !canFit(state.calendar.slot, run.slots);
  const miles = run.miles > 0 ? `${round1(run.miles)} mi · ` : "";
  return item(
    run.name,
    `${miles}${run.slots} slot${run.slots > 1 ? "s" : ""}`,
    { type: "run", id: runId },
    late,
    "Too late today.",
  );
}

export function menuFor(locationId, state) {
  const lateNap = state.calendar.slot >= 3;
  switch (locationId) {
    case "home":
      return {
        title: "Home",
        speaker: "Home",
        intro: "Shoes by the door. The couch knows your name.",
        items: [
          item("Sleep", "End the day and shed fatigue", { type: "sleep" }),
          item(
            "Daytime Nap",
            "A short rest, not a new day",
            { type: "nap" },
            lateNap,
            "Naps are for daytime. Sleep instead.",
          ),
          item("Swap Shoes", "Closet", { type: "open-gear" }),
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
            item(job.label, job.detail, { type: "open-shift", job: job.id }, !canFit(state.calendar.slot, 1), "Shop's closing."),
          ),
          item("Shop shoes", "Road, trail, and hybrid", { type: "open-shop" }),
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
          item(SHOP.gel.label, `${SHOP.gel.detail} · held ${state.gels}`, { type: "buy", id: "gel" }, state.coins < SHOP.gel.cost, "Not enough coins."),
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

export function shoeShopItems(state) {
  const rows = [];
  for (const shoe of Object.values(SHOES)) {
    const owned = state.gear.owned.includes(shoe.id);
    if (!owned && shoe.price <= 0) continue;
    const worn = shoeWear(state.gear, shoe.id);
    if (!owned) {
      rows.push(
        item(
          `Buy ${shoe.name}`,
          `${shoe.price} coins · ${shoe.blurb}`,
          { type: "shoe", id: shoe.id },
          state.coins < shoe.price,
          `Need ${shoe.price} coins.`,
        ),
      );
      continue;
    }
    const on = state.gear.equipped === shoe.id;
    if (!on) {
      rows.push(
        item(
          `Wear ${shoe.name}`,
          `${worn.label} · free to swap`,
          { type: "equip", id: shoe.id },
        ),
      );
    }
    const cost = replaceCost(shoe.id);
    rows.push(
      item(
        `Replace ${shoe.name}`,
        `${cost} coins · ${worn.label} · ${Math.round(state.gear.miles[shoe.id] || 0)} mi`,
        { type: "shoe", id: shoe.id },
        state.coins < cost,
        `Need ${cost} coins.`,
      ),
    );
  }
  return rows;
}

export function closetItems(state) {
  return state.gear.owned.map((id) => {
    const shoe = shoeById(id);
    const worn = shoeWear(state.gear, id);
    const on = state.gear.equipped === id;
    return item(
      on ? `${shoe.name} (on)` : shoe.name,
      `${worn.label} · ${Math.round(state.gear.miles[id] || 0)} / ${shoe.maxMiles} mi`,
      { type: "equip", id },
      on,
      "Already wearing these.",
    );
  });
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
  };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

export { RUNS, formatWhen };
