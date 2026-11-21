/**
 * segments.js
 * Named course segments (original naming — not Strava) and Local Legend.
 *
 * Each town has several segments tied to existing run routes. When you
 * own a watch and finish a matching run, the game logs a time from your
 * pace/stats + a little randomness. Beating the local-legend NPC time
 * makes you Local Legend of that segment (coins + XP + a title).
 *
 * PRs live on state.segments[segmentId] = { bestSeconds, legend: bool }.
 * An old save has no segments object; Resume fills {}.
 */

import { hasWatch } from "@/lib/watches";
import { levelFromXp } from "@/lib/xp";

/** Coins for becoming Local Legend on a segment. */
export const SEGMENT_LEGEND_COINS = 24;

/** Overall XP for a new Local Legend title. */
export const SEGMENT_LEGEND_XP = 18;

/** How much randomness (± fraction) jitters a logged segment time. */
export const SEGMENT_TIME_JITTER = 0.08;

/**
 * Segments per town. runIds are RUNS / race ids that cover this segment.
 * legendSeconds is the NPC time to beat (lower is faster).
 */
export const SEGMENTS = [
  // Brick City
  {
    id: "bc-pond-loop",
    city: "brick-city",
    name: "Pond Loop Kick",
    blurb: "Dirt half-lap around the park pond.",
    runIds: ["park-trail", "easy-run", "zone-2", "night-park"],
    legendSeconds: 312,
    legendName: "Otto Venn",
  },
  {
    id: "bc-brick-street",
    city: "brick-city",
    name: "Brick Street Dash",
    blurb: "Plaza to grocery sidewalk.",
    runIds: ["neighborhood-easy", "neighborhood-speed", "neighborhood-5k", "night-city"],
    legendSeconds: 198,
    legendName: "Tess Quay",
  },
  {
    id: "bc-track-straight",
    city: "brick-city",
    name: "Track Home Straight",
    blurb: "West rail to the finish chalk.",
    runIds: ["intervals", "threshold", "interval-run"],
    legendSeconds: 54,
    legendName: "Remy Calder",
  },
  {
    id: "bc-ridge-climb",
    city: "brick-city",
    name: "Gate Climb",
    blurb: "First pitch past the mountain gate.",
    runIds: ["ridge-repeats", "night-trail"],
    legendSeconds: 420,
    legendName: "Mara Flint",
  },
  // Ridgeview
  {
    id: "rv-switchback",
    city: "ridgeview",
    name: "Switchback Spur",
    blurb: "Steep dirt above the depot.",
    runIds: ["park-trail", "ridge-repeats", "night-trail", "ridge-50k", "ridge-100k"],
    legendSeconds: 480,
    legendName: "Dylan Broman",
  },
  {
    id: "rv-skyline",
    city: "ridgeview",
    name: "Skyline Cut",
    blurb: "Exposed ridge with the wind in your face.",
    runIds: ["ridge-repeats", "ridge-50k", "ridge-100k", "ridge-100m", "ridge-200m"],
    legendSeconds: 610,
    legendName: "Cedar Pike",
  },
  {
    id: "rv-town-mile",
    city: "ridgeview",
    name: "Ridgeview Town Mile",
    blurb: "Cafe to clinic on the main street.",
    runIds: ["easy-run", "neighborhood-easy", "night-city"],
    legendSeconds: 360,
    legendName: "Nessa Quill",
  },
  // Flatland
  {
    id: "fl-barn-loop",
    city: "flatland",
    name: "Barn Loop",
    blurb: "One backyard practice loop past the barn.",
    runIds: ["yards", "backyard-practice", "bigs-backyard", "bpn-go-one-more", "storm-city-backyard"],
    legendSeconds: 2550,
    legendName: "Dark Mowdle",
  },
  {
    id: "fl-fence-line",
    city: "flatland",
    name: "Fence Line Tempo",
    blurb: "Straight gravel along the south fence.",
    runIds: ["zone-2", "long-run", "neighborhood-speed"],
    legendSeconds: 540,
    legendName: "Pax Hollis",
  },
  {
    id: "fl-silo-out",
    city: "flatland",
    name: "Silo Out-and-Back",
    blurb: "Road to the silo and home.",
    runIds: ["easy-run", "long-run", "night-city"],
    legendSeconds: 720,
    legendName: "Remy Noct",
  },
];

export function segmentById(id) {
  return SEGMENTS.find((row) => row.id === id) || null;
}

export function segmentsForCity(cityId) {
  return SEGMENTS.filter((row) => row.city === cityId);
}

export function segmentsCoveredByRun(runId) {
  return SEGMENTS.filter((row) => row.runIds.includes(runId));
}

/**
 * Estimate a segment time in seconds from level, fatigue, and a roll.
 * Lower is better. Pure for tests.
 */
export function estimateSegmentSeconds(state, segment, roll = 0.5) {
  const level = levelFromXp(state?.xp?.overall || 0);
  const fatigue = state?.condition?.fatigue || 0;
  const base = segment.legendSeconds * 1.12;
  // Higher level → faster. High fatigue → slower.
  const levelFactor = Math.max(0.72, 1.05 - level * 0.012);
  const fatigueFactor = 1 + Math.max(0, fatigue - 40) * 0.002;
  const jitter = 1 + (roll - 0.5) * 2 * SEGMENT_TIME_JITTER;
  return Math.max(20, Math.round(base * levelFactor * fatigueFactor * jitter));
}

export function formatSegmentTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function segmentRecord(state, segmentId) {
  const bag = state?.segments;
  if (!bag || typeof bag !== "object") return null;
  const row = bag[segmentId];
  if (!row || typeof row !== "object") return null;
  return row;
}

/**
 * After a run that covers segments, log PRs if a watch is owned.
 * Mutates state. Returns dialogue lines (may be empty).
 */
export function logSegmentsForRun(state, runId, rng = Math.random) {
  if (!hasWatch(state)) return [];
  const covered = segmentsCoveredByRun(runId);
  if (!covered.length) return [];
  if (!state.segments || typeof state.segments !== "object") state.segments = {};
  const lines = [];
  for (const segment of covered) {
    const seconds = estimateSegmentSeconds(state, segment, rng());
    const prev = segmentRecord(state, segment.id);
    const best = prev && typeof prev.bestSeconds === "number" ? prev.bestSeconds : null;
    const isPr = best == null || seconds < best;
    if (isPr) {
      const legend = seconds < segment.legendSeconds;
      const wasLegend = Boolean(prev?.legend);
      state.segments[segment.id] = {
        bestSeconds: seconds,
        legend: legend || wasLegend,
      };
      lines.push(`${segment.name}: ${formatSegmentTime(seconds)}${isPr && best != null ? " (PR)" : ""}`);
      if (legend && !wasLegend) {
        state.segments[segment.id].legend = true;
        state.coins = (state.coins || 0) + SEGMENT_LEGEND_COINS;
        // XP is applied by the caller via addXp if available; stash a flag.
        lines.push(
          `Local Legend of ${segment.name}! You beat ${segment.legendName}'s ${formatSegmentTime(segment.legendSeconds)}. +${SEGMENT_LEGEND_COINS} coins.`,
        );
        if (!state._segmentLegendXp) state._segmentLegendXp = 0;
        state._segmentLegendXp += SEGMENT_LEGEND_XP;
      }
    } else {
      lines.push(`${segment.name}: ${formatSegmentTime(seconds)} (PR ${formatSegmentTime(best)})`);
    }
  }
  return lines;
}

/** Menu rows: your PR vs legend time. */
export function segmentMenuLines(state) {
  const city = state?.city || "brick-city";
  const rows = segmentsForCity(city);
  if (!hasWatch(state)) {
    return ["Segments need a running watch. Find one in Ridgeview tall grass."];
  }
  if (!rows.length) return ["No segments listed for this town yet."];
  return rows.map((segment) => {
    const rec = segmentRecord(state, segment.id);
    const pr = rec?.bestSeconds != null ? formatSegmentTime(rec.bestSeconds) : "—";
    const legend = formatSegmentTime(segment.legendSeconds);
    const title = rec?.legend ? " ★ Local Legend" : "";
    return `${segment.name}: PR ${pr} / Legend ${legend} (${segment.legendName})${title}`;
  });
}

/**
 * Fill missing segments on load. Version stays 1.
 */
export function normalizeSegments(data) {
  if (!data.segments || typeof data.segments !== "object" || Array.isArray(data.segments)) {
    data.segments = {};
    return data;
  }
  const clean = {};
  for (const [id, row] of Object.entries(data.segments)) {
    if (!segmentById(id)) continue;
    if (!row || typeof row !== "object") continue;
    const best = row.bestSeconds;
    if (typeof best !== "number" || !Number.isFinite(best) || best <= 0) continue;
    clean[id] = { bestSeconds: Math.floor(best), legend: Boolean(row.legend) };
  }
  data.segments = clean;
  return data;
}
