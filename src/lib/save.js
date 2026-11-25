/**
 * save.js
 * Browser save for v1. The whole runner is one JSON blob in localStorage
 * under brick-city-save-v1. There is no account and no Strava token.
 * Never put a secret in this file.
 *
 * serialize / deserialize are pure so tests can round-trip a state without
 * a browser. loadSave / writeSave / clearSave are the thin localStorage
 * wrappers the screens call after mount (never during server render).
 *
 * The version number stays 1 on purpose. Brand shoes, belts, vests, and
 * sponsors were added later, but an older blob is still this save. We fill
 * the new fields instead of rejecting the file. A wrong version (not 1)
 * still means "no save", so the title screen offers New Game.
 *
 * Daily meal, snack, and nap counts were added on this same key. A blob
 * from before those counts existed still loads. Missing numbers become 0,
 * or 1 when the older yes/no flag says that plate or nap was already used.
 *
 * Socks, hats, shakes, flasks, tall-grass finds, and the PT visit flag
 * arrived on this same key too. A missing pocket is empty. A missing
 * counter is zero. The version stays 1.
 *
 * Race IQ, the coffee cup count, the Wi-Fi flag, and the leftover cup
 * note arrived on this same key too. A blob from before the coffee shop
 * has none of them. Race IQ becomes 0. The cup count becomes 0. Wi-Fi
 * is unused today. There is no pace note waiting. The version stays 1.
 * The shop name is not a field. The map door is the id "cafe", so
 * renaming the sign does not change what an old blob has to load.
 *
 * Which cities have opened the Run Store shelf lives on this same key,
 * as citiesReached. An old blob has no list. Resume fills ['brick-city'].
 * state.city is not that list. It is only the town whose cafe and clinic
 * prices you are using, and the other towns are not reachable yet.
 * The version stays 1.
 *
 * The Run Store deck keeps shiftCursor and shiftsToday on the calendar.
 * Both arrived on this same key. A blob from before the deck has neither.
 * The shift code treats a missing cursor as "start from the day number"
 * and a missing count as zero. Resume does not need a new save version,
 * and an old job id (shoes, stock, gait) still names its original scene.
 *
 * The neighborhood 5K personal best arrived on this same key too. A blob
 * from before the activity board has no records.fiveK. That loads as no
 * PB, not as a time you never ran. The offer gap's lastOfferDay is the
 * same idea: missing means brands may still ask, because inventing a
 * recent offer would silence a mailbox the player never saw. The version
 * stays 1.
 *
 * The rare morning sickness (condition.sickness and
 * calendar.lastIllnessDay) arrived on this same key too. A blob from
 * before that event has neither. Missing means healthy, and the gap is
 * open so the first eligible week can still roll. The version stays 1.
 *
 * Half and marathon finish flags (progress.halfFinished,
 * progress.marathonFinished) arrived on this same key too. A blob from
 * before those races were playable has neither. Missing means not
 * finished, so the unlock checks stay locked until you earn them. The
 * version stays 1.
 *
 * Total cafe Wi-Fi hours (wifiTurns), Cornerstone Pace Club membership
 * (runClub), street-race rematch timers (rematches), and garden / club
 * side-quest flags arrived on this same key too. A blob from before the
 * bigger map has none of them. Missing means 0 Wi-Fi hours, not a
 * member, empty rematch book, and quests not started. The version
 * stays 1.
 *
 * City travel (mapId), weather, segments, watches, Ridgeview/Flatland
 * race flags, and backyard session also arrived on this same key.
 * Missing means Brick City map, clear weather, empty segments, no
 * watches, unfinished premiers, and no backyard session. Version stays 1.
 *
 * v2 widened every tile from 16px to 32px. A position is stored in pixels,
 * so an old save's x/y would land on the wrong half of the new tile and
 * often inside a wall. New games stamp tileSize: 32. A save without that
 * stamp is treated as 16px and doubled once on load.
 *
 * The map then grew again (~2× area), and later road cleanups turned
 * some asphalt into grass. A pixel that now sits out of bounds or
 * inside a wall is nudged to the nearest walkable tile (town square
 * only if nothing nearby is open) so Resume never traps the runner.
 */

import { MAX_ENERGY, SAVE_KEY, SAVE_VERSION } from "@/lib/constants";
import { slotFromEnergy } from "@/lib/calendar";
import { TILE, safePlayerPosition } from "@/game/town";
import { normalizeFiveKTime } from "@/lib/activities";
import { maxNutritionFromGear, normalizeCitiesReached, normalizeGear } from "@/lib/catalog";
import { normalizeSickness } from "@/lib/sickness";
import { normalizeSponsors } from "@/lib/sponsors";
import { normalizeRematches } from "@/lib/streetRaces";
import { readWifiTurns } from "@/lib/runclub";
import { normalizeWeather } from "@/lib/weather";
import { normalizeWatches } from "@/lib/watches";
import { normalizeSegments } from "@/lib/segments";

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(raw) {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    if (!data.runner || typeof data.runner.name !== "string") return null;
    if (data.runner.gender !== "male" && data.runner.gender !== "female") return null;
    if (!data.xp || !data.condition || !data.calendar || !data.gear) return null;
    // Saves written before energy existed still load. A missing bar means
    // a full day, and the clock is pulled back in line with that bar so
    // the sky and the blocks don't disagree.
    if (typeof data.energy !== "number") {
      data.energy = MAX_ENERGY;
      data.calendar.slot = slotFromEnergy(MAX_ENERGY);
    }
    if (typeof data.nappedToday !== "boolean") data.nappedToday = false;
    if (typeof data.gels !== "number") data.gels = 0;
    if (typeof data.shakes !== "number" || data.shakes < 0) data.shakes = 0;
    if (typeof data.flasks !== "number" || data.flasks < 0) data.flasks = 0;
    if (typeof data.flaskReady !== "number" || data.flaskReady < 0) data.flaskReady = 0;
    if (typeof data.calendar.findsToday !== "number" || data.calendar.findsToday < 0) {
      data.calendar.findsToday = 0;
    }
    if (typeof data.calendar.clinicTreated !== "boolean") data.calendar.clinicTreated = false;
    // Race IQ is a new stat on the same save. Missing, negative, or
    // not a number means the runner has never studied a race report.
    if (typeof data.raceIq !== "number" || !Number.isFinite(data.raceIq) || data.raceIq < 0) {
      data.raceIq = 0;
    } else {
      data.raceIq = Math.floor(data.raceIq);
    }
    if (typeof data.calendar.coffeesToday !== "number" || !Number.isFinite(data.calendar.coffeesToday) || data.calendar.coffeesToday < 0) {
      data.calendar.coffeesToday = 0;
    } else {
      data.calendar.coffeesToday = Math.floor(data.calendar.coffeesToday);
    }
    if (typeof data.calendar.wifiToday !== "boolean") data.calendar.wifiToday = false;
    // Lifetime Wi-Fi hours for the run-club invite. Missing means 0.
    // We do not invent past study sessions on an old save.
    if (typeof data.wifiTurns !== "number" || !Number.isFinite(data.wifiTurns) || data.wifiTurns < 0) {
      data.wifiTurns = 0;
    } else {
      data.wifiTurns = Math.floor(data.wifiTurns);
    }
    // Cornerstone Pace Club. Missing means not invited / not a member.
    if (!data.runClub || typeof data.runClub !== "object" || Array.isArray(data.runClub)) {
      data.runClub = {
        member: false,
        invited: false,
        lastGroupWeek: null,
        groupPaceUntilDay: null,
        gardenQuest: null,
        gardenStartParks: null,
        nightQuest: null,
        nightCityDone: false,
      };
    } else {
      data.runClub.member = Boolean(data.runClub.member);
      data.runClub.invited = Boolean(data.runClub.invited);
      if (typeof data.runClub.lastGroupWeek !== "number") data.runClub.lastGroupWeek = null;
      if (typeof data.runClub.groupPaceUntilDay !== "number") data.runClub.groupPaceUntilDay = null;
      if (data.runClub.gardenQuest !== "started" && data.runClub.gardenQuest !== "done") {
        data.runClub.gardenQuest = null;
      }
      if (typeof data.runClub.gardenStartParks !== "number") data.runClub.gardenStartParks = null;
      if (data.runClub.nightQuest !== "started" && data.runClub.nightQuest !== "done") {
        data.runClub.nightQuest = null;
      }
      data.runClub.nightCityDone = Boolean(data.runClub.nightCityDone);
    }
    normalizeRematches(data);
    // Only the two cup notes are real. Anything else (including a missing
    // field on an old save) is "no coffee waiting".
    if (data.condition.coffeeNext !== "boost" && data.condition.coffeeNext !== "jitter") {
      data.condition.coffeeNext = null;
    }
    // Rare morning sickness. Missing means healthy; do not invent a gap
    // that would silence the first roll on an old save.
    normalizeSickness(data);
    // Half / marathon finish flags. Missing on an old save means false.
    // Do not invent a finish the player never earned.
    if (!data.progress || typeof data.progress !== "object" || Array.isArray(data.progress)) {
      data.progress = {};
    }
    if (typeof data.progress.halfFinished !== "boolean") data.progress.halfFinished = false;
    if (typeof data.progress.marathonFinished !== "boolean") data.progress.marathonFinished = false;
    // Ridgeview / Flatland race flags. Missing on an old save means false / 0.
    if (typeof data.progress.ridge50kFinished !== "boolean") data.progress.ridge50kFinished = false;
    if (typeof data.progress.ridge100kFinished !== "boolean") data.progress.ridge100kFinished = false;
    if (typeof data.progress.ridge100mFinished !== "boolean") data.progress.ridge100mFinished = false;
    if (typeof data.progress.ridge200mFinished !== "boolean") data.progress.ridge200mFinished = false;
    if (typeof data.progress.backyardPracticeBest !== "number") data.progress.backyardPracticeBest = 0;
    if (typeof data.progress.bigsBackyardFinished !== "boolean") data.progress.bigsBackyardFinished = false;
    if (typeof data.progress.bpnGoOneMoreFinished !== "boolean") data.progress.bpnGoOneMoreFinished = false;
    if (typeof data.progress.stormCityBackyardFinished !== "boolean") data.progress.stormCityBackyardFinished = false;
    // mapId: overworld you walk. Missing means the city you are in, or Brick City.
    if (typeof data.mapId !== "string" || !data.mapId) {
      data.mapId = typeof data.city === "string" && data.city ? data.city : "brick-city";
    }
    if (data.backyardSession != null && (typeof data.backyardSession !== "object" || Array.isArray(data.backyardSession))) {
      data.backyardSession = null;
    }
    normalizeWeather(data);
    normalizeWatches(data);
    normalizeSegments(data);
    // No records object, or a best that is not a 5K clock, means you
    // have not run the neighborhood time trial. Do not invent a time.
    if (!data.records || typeof data.records !== "object" || Array.isArray(data.records)) {
      data.records = {};
    }
    data.records.fiveK = normalizeFiveKTime(data.records.fiveK);
    if (typeof data.calendar.homeMealUsed !== "boolean") data.calendar.homeMealUsed = false;
    if (typeof data.calendar.homeSnackUsed !== "boolean") data.calendar.homeSnackUsed = false;
    // The counts are newer than the yes/no flags. An old brick-city-save-v1
    // file has the flags and not the numbers. Missing means "start from the
    // flag": true is 1 (they already used the old once-a-day plate or nap),
    // false or absent is 0. Leaving the number missing would make the Home
    // menu print "Meals undefined/3".
    if (typeof data.napsToday !== "number") data.napsToday = data.nappedToday ? 1 : 0;
    if (typeof data.calendar.homeMeals !== "number") {
      data.calendar.homeMeals = data.calendar.homeMealUsed ? 1 : 0;
    }
    if (typeof data.calendar.homeSnacks !== "number") {
      data.calendar.homeSnacks = data.calendar.homeSnackUsed ? 1 : 0;
    }
    // Gear and sponsors are filled in, not required. A v1 closet that only
    // knows starter / road / trail / hybrid still loads. The house ids are
    // aliases, so those pairs stay equipped. Nutrition is pulled back
    // inside the cap the equipped belt or vest actually allows.
    data.gear = normalizeGear(data.gear);
    data.sponsors = normalizeSponsors(data.sponsors);
    // The shelf list is its own field. A missing one is Brick City only.
    // Do not copy state.city into it. A save that set city for a price
    // table (or a future town) must not unlock that town's models.
    data.citiesReached = normalizeCitiesReached(data.citiesReached);
    if (typeof data.condition.nutrition === "number") {
      const cap = maxNutritionFromGear(data.gear);
      data.condition.nutrition = Math.max(0, Math.min(cap, Math.round(data.condition.nutrition)));
    }
    // Doubling keeps the runner on the same tile. floor(old / 16) is the
    // same tile as floor((old * 2) / 32). Saves that already say tileSize
    // 32 are left alone, or Resume would walk them through a wall.
    if (data.tileSize !== TILE) {
      if (data.position && typeof data.position.x === "number" && typeof data.position.y === "number") {
        data.position = {
          ...data.position,
          x: Math.round(data.position.x * (TILE / 16)),
          y: Math.round(data.position.y * (TILE / 16)),
        };
      }
      data.tileSize = TILE;
    }
    // After tile scaling, a grown map (or a road cleanup that turned
    // asphalt into grass) may put old pixels in a wall. Nudge to the
    // nearest walkable tile; town square is only the last fallback.
    // Save key and fields stay brick-city-save-v1.
    data.position = safePlayerPosition(data);
    // Touch wifiTurns through the helper so a weird NaN cannot linger.
    data.wifiTurns = readWifiTurns(data);
    return data;
  } catch {
    return null;
  }
}

export function loadSave() {
  if (typeof localStorage === "undefined") return null;
  return deserialize(localStorage.getItem(SAVE_KEY));
}

export function writeSave(state) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SAVE_KEY, serialize(state));
}

export function clearSave() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

export function saveSummary(state) {
  if (!state) return null;
  return {
    name: state.runner.name,
    gender: state.runner.gender,
    level: state.level || null,
    day: state.calendar.day,
    weekday: state.calendar.weekday,
    slot: state.calendar.slot,
  };
}
