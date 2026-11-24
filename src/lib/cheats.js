/**
 * cheats.js
 * Developer "Nick Names" codes for faster testing. CJ will likely delete
 * this before launch, so everything lives here: normalize, the code table,
 * and the handlers. The pause-menu entry and the GBC text box are the only
 * other touch points (PlayScreen + CheatInput). No new save fields.
 *
 * How to add a code: append a row to CHEAT_CODES with `code` and `apply`.
 * How to remove the feature: see docs/NOTES.md → "Cheat codes (Nick Names)".
 */

import { SICKNESS_DURATION_DAYS } from "@/lib/sickness";
import {
  isHalfOpen,
  isMarathonOpen,
  isMountainOpen,
  isTenKOpen,
  milestoneTags,
  runnerLevel,
} from "@/lib/unlocks";
import { levelFromXp } from "@/lib/xp";

/** Dialogue line when the typed string is not in the table. */
export const UNKNOWN_CHEAT_MESSAGE = "Nothing happened...";

/**
 * Trim + uppercase so " gimme05 " and "GIMME05" are the same code.
 * Matching is case-insensitive on purpose; codes are easy to mistype.
 */
export function normalizeCheatCode(raw) {
  return String(raw ?? "").trim().toUpperCase();
}

function dayOf(state) {
  const day = state?.calendar?.day;
  if (typeof day !== "number" || !Number.isFinite(day)) return 1;
  return Math.max(1, Math.floor(day));
}

/**
 * Same XP bookkeeping as activities.addXp for overall points, then the
 * same level-up / unlock lines finish() would append. We do not import
 * those private helpers so this file stays deletable without editing
 * activities.js. weekXp tracks the Sunday summary the same way a run would.
 */
function grantOverallXp(state, amount) {
  const lines = [];
  // Snapshot unlock flags before we mutate XP. finish() compares a
  // frozen "before" save to the new one; we only have one object here.
  const levelBefore = levelFromXp(state.xp?.overall || 0);
  const tenKBefore = isTenKOpen(state);
  const halfBefore = isHalfOpen(state);
  const marathonBefore = isMarathonOpen(state);
  const mountainBefore = isMountainOpen(state);

  if (!state.xp) state.xp = { overall: 0 };
  if (!state.calendar) state.calendar = {};
  if (!state.calendar.weekXp) state.calendar.weekXp = { overall: 0 };

  state.xp.overall = (state.xp.overall || 0) + amount;
  state.calendar.weekXp.overall = (state.calendar.weekXp.overall || 0) + amount;

  state.milestones = milestoneTags(state);

  const levelAfter = runnerLevel(state);
  if (levelAfter > levelBefore) {
    lines.push(`You reached level ${levelAfter}.`);
  }
  // Unlock notices mirror finish() so a lucky +5 near a gate still posts
  // the track notice the player would see after a real run.
  if (!tenKBefore && isTenKOpen(state)) {
    lines.push("A notice goes up at the track: the Community 10K is open.");
  }
  if (!halfBefore && isHalfOpen(state)) {
    lines.push("The track booth posts a new sheet: the Brick City Half is open.");
  }
  if (!marathonBefore && isMarathonOpen(state)) {
    lines.push("A marathon banner goes up by the track. Brick City's full distance is open.");
  }
  if (!mountainBefore && isMountainOpen(state)) {
    lines.push("Ranger Quill radios the gate. The mountain trail is open.");
  }

  const message = [`+${amount} XP.`, ...lines].join(" ");
  return message;
}

/**
 * Same shape rollSicknessOnWake writes on a hit: daysLeft, note, and
 * lastIllnessDay. No Peak cut here — that only happens on recovery.
 */
function applySickNow(state) {
  state.condition = state.condition || {};
  state.calendar = state.calendar || {};
  state.condition.sickness = {
    daysLeft: SICKNESS_DURATION_DAYS,
    note: "Rest until it passes, or see the clinic.",
  };
  state.calendar.lastIllnessDay = dayOf(state);
  return "You feel sick all of a sudden...";
}

/**
 * Instant clinic-style clear without coins or Peak loss.
 * Clears sickness and the chart injury (plus the sore flag the clinic
 * clears when the injury is gone). Does not touch fatigue or Peak.
 */
function applyShamanCure(state) {
  state.condition = state.condition || {};
  state.condition.sickness = null;
  state.condition.injury = null;
  state.condition.sore = false;
  return "The shaman clears every ache. Sickness and injuries are gone.";
}

/**
 * Data-driven table. Add a row here to teach the menu a new code.
 * `apply` mutates the cloned state and returns the success dialogue line.
 */
export const CHEAT_CODES = [
  {
    code: "GIMME05",
    apply: (state) => grantOverallXp(state, 5),
  },
  {
    code: "SICKONE",
    apply: (state) => applySickNow(state),
  },
  {
    code: "SHAMAN",
    apply: (state) => applyShamanCure(state),
  },
];

const CHEAT_BY_CODE = new Map(CHEAT_CODES.map((entry) => [entry.code, entry]));

/**
 * Apply one typed code to a runner save.
 * Returns a new state (structuredClone) plus a short dialogue message.
 * Unknown codes leave state unchanged and say "Nothing happened...".
 * No save-format fields are added.
 */
export function applyCheatCode(state, rawCode) {
  const code = normalizeCheatCode(rawCode);
  const entry = CHEAT_BY_CODE.get(code);
  if (!entry) {
    return {
      known: false,
      state,
      message: UNKNOWN_CHEAT_MESSAGE,
    };
  }
  const next = structuredClone(state);
  const message = entry.apply(next);
  return {
    known: true,
    state: next,
    message,
  };
}
