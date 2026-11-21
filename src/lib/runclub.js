/**
 * runclub.js
 * Cornerstone Pace Club: invite rules, weekly group run numbers, and
 * the tiny pace bump that comes with membership.
 *
 * Why a separate file: every bonus is a named constant so CJ can retune
 * the club without reading activities.js. The invite still lives on the
 * same brick-city-save-v1 key. Missing fields mean "not invited yet."
 *
 * TODO(segments): Local-legend / Strava-style segments need a running
 * watch. Do not invent segment PRs here. When a watch exists, hang the
 * club segment board off RUN_CLUB_SEGMENT_HOOK below.
 */

/** Display name. Original. Not a real club brand. */
export const RUN_CLUB_NAME = "Cornerstone Pace Club";

/** Total Tangentline Wi-Fi hours needed (not consecutive). */
export const RUN_CLUB_WIFI_TURNS = 5;

/**
 * Group run energy. Matches a normal easy run after the +1 energy bump
 * (easy-run slots = 3). Keep this in sync when run costs change.
 */
export const RUN_CLUB_GROUP_ENERGY = 3;

/** Miles logged on a group run. */
export const RUN_CLUB_GROUP_MILES = 3.2;

/** Fatigue and food hit for the group run. Soft, like a social easy. */
export const RUN_CLUB_GROUP_FATIGUE = 8;
export const RUN_CLUB_GROUP_NUTRITION = -8;

/** XP granted on a finished group run. */
export const RUN_CLUB_GROUP_XP = { overall: 20, versatile: 6, marathon: 4 };
export const RUN_CLUB_GROUP_ATTRIBUTES = { endurance: 3, mental: 2 };

/**
 * Permanent pace bump once you join (fraction of race/road pace).
 * Small on purpose: the club is a habit, not a win button.
 */
export const RUN_CLUB_JOIN_PACE = 0.01;

/**
 * Extra temporary pace after a group run. Spent after this many days,
 * or on the next race if that comes first (see clubPaceMod).
 */
export const RUN_CLUB_GROUP_PACE = 0.015;
export const RUN_CLUB_GROUP_PACE_DAYS = 3;

/**
 * Side quest: talk to Pia at the garden, then finish this many park
 * trail loops. Reward is a small coin tip, not a gate.
 */
export const RUN_CLUB_GARDEN_PARK_RUNS = 3;
export const RUN_CLUB_GARDEN_COIN_REWARD = 12;

/**
 * Side quest: after joining, finish one night city run and report back
 * to Lina. Reward coins.
 */
export const RUN_CLUB_NIGHT_CITY_COIN_REWARD = 18;

/**
 * Club tip about segments. The watch unlocks logging; the club does not
 * hand out a watch. See watches.js / segments.js.
 */
export const RUN_CLUB_SEGMENT_HOOK =
  "Local segments need a running watch from Ridgeview tall grass. Once you have one, club routes can log Cornerstone segments.";

/**
 * True when the runner has earned the invite. Old saves missing
 * wifiTurns count as 0, so they still need five real Wi-Fi hours
 * from now on (we do not invent past study sessions).
 */
export function runClubInviteReady(state) {
  const five = Boolean(state?.progress?.fiveKFinished);
  const ten = Boolean(state?.progress?.tenKFinished);
  const wifi = readWifiTurns(state);
  return five && ten && wifi >= RUN_CLUB_WIFI_TURNS;
}

export function readWifiTurns(state) {
  const value = state?.wifiTurns;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function isRunClubMember(state) {
  return Boolean(state?.runClub?.member);
}

/**
 * Pace fraction from the club. Join bump is permanent. Group bump lasts
 * RUN_CLUB_GROUP_PACE_DAYS calendar days after the last group run.
 */
export function clubPaceMod(state) {
  if (!isRunClubMember(state)) return 0;
  let mod = RUN_CLUB_JOIN_PACE;
  const until = state?.runClub?.groupPaceUntilDay;
  const day = state?.calendar?.day;
  if (typeof until === "number" && typeof day === "number" && day <= until) {
    mod += RUN_CLUB_GROUP_PACE;
  }
  return mod;
}

/**
 * Whether the weekly group run is still open this in-game week.
 * weekIndex is the same counter sleep / the calendar already use.
 */
export function groupRunAvailable(state) {
  if (!isRunClubMember(state)) return false;
  const week = state?.calendar?.weekIndex;
  const last = state?.runClub?.lastGroupWeek;
  if (typeof week !== "number") return false;
  if (typeof last === "number" && last === week) return false;
  return true;
}

export function runClubMeetingPlace() {
  return {
    id: "club",
    name: RUN_CLUB_NAME,
    // Mat in front of the gazebo on the expanded east plaza.
    tx: 50,
    ty: 28,
    facing: "down",
  };
}
