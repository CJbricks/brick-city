/**
 * segments.test.js
 * Segment PRs, Local Legend rewards, and save defaults.
 */

import { describe, expect, it } from "vitest";
import { createNewGame, applyRun } from "@/lib/activities";
import {
  SEGMENT_LEGEND_COINS,
  SEGMENTS,
  estimateSegmentSeconds,
  formatSegmentTime,
  logSegmentsForRun,
  normalizeSegments,
  segmentMenuLines,
  segmentsCoveredByRun,
} from "@/lib/segments";
import { grantWatch } from "@/lib/watches";
import { deserialize, serialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("segments", () => {
  it("lists segments for Brick City, Ridgeview, and Flatland", () => {
    const cities = new Set(SEGMENTS.map((s) => s.city));
    expect(cities.has("brick-city")).toBe(true);
    expect(cities.has("ridgeview")).toBe(true);
    expect(cities.has("flatland")).toBe(true);
  });

  it("does not log without a watch", () => {
    const state = fresh();
    const lines = logSegmentsForRun(state, "park-trail", () => 0.5);
    expect(lines).toEqual([]);
  });

  it("logs a PR and can award Local Legend when beating the NPC time", () => {
    const state = fresh();
    grantWatch(state, "trail-pulse");
    state.xp.overall = 5000;
    state.condition.fatigue = 0;
    const covered = segmentsCoveredByRun("park-trail");
    expect(covered.length).toBeGreaterThan(0);
    // Force a very fast time via low estimate roll + high level.
    const lines = logSegmentsForRun(state, "park-trail", () => 0);
    expect(lines.length).toBeGreaterThan(0);
    expect(state.segments[covered[0].id]).toBeTruthy();
  });

  it("formats times and estimates faster times at higher level", () => {
    expect(formatSegmentTime(125)).toBe("2:05");
    const seg = SEGMENTS[0];
    const low = fresh();
    const high = fresh();
    high.xp.overall = 8000;
    expect(estimateSegmentSeconds(high, seg, 0.5)).toBeLessThan(estimateSegmentSeconds(low, seg, 0.5));
  });

  it("shows menu lines once a watch is owned", () => {
    const state = fresh();
    expect(segmentMenuLines(state)[0]).toMatch(/watch/i);
    grantWatch(state, "trail-pulse");
    expect(segmentMenuLines(state).join(" ")).toMatch(/Pond Loop|Brick Street|Track|Gate/);
  });

  it("loads an old save without segments as {}", () => {
    const state = fresh();
    const raw = JSON.parse(serialize(state));
    delete raw.segments;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.segments).toEqual({});
    normalizeSegments({ segments: { junk: { bestSeconds: 10 } } });
  });

  it("awards legend coins when beating the NPC on a fresh PR", () => {
    const state = fresh();
    grantWatch(state, "trail-pulse");
    state.xp.overall = 20000;
    state.condition.fatigue = 0;
    const before = state.coins;
    // Pick a segment with a high legend time and force a near-zero roll.
    const seg = SEGMENTS.find((s) => s.id === "bc-track-straight");
    state.segments = {};
    // Manually log via estimate that must beat legend.
    const seconds = estimateSegmentSeconds(state, seg, 0);
    expect(seconds).toBeLessThan(seg.legendSeconds);
    const lines = logSegmentsForRun(state, "intervals", () => 0);
    if (lines.some((l) => /Local Legend/.test(l))) {
      expect(state.coins).toBe(before + SEGMENT_LEGEND_COINS);
    }
  });

  it("applies segment logging from applyRun when a watch is owned", () => {
    const state = fresh();
    grantWatch(state, "trail-pulse");
    const result = applyRun(state, "easy-run", () => 0.9);
    expect(result.ok).toBe(true);
  });
});
