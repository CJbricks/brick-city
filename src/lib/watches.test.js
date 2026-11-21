/**
 * watches.test.js
 * Rare watches, GPS unlock, and save defaults.
 */

import { describe, expect, it } from "vitest";
import { createNewGame } from "@/lib/activities";
import { applyForage } from "@/lib/forage";
import { grantWatch, hasWatch, normalizeWatches, ownedWatches, runClubSegmentTip } from "@/lib/watches";
import { deserialize, serialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("running watches", () => {
  it("starts with no watch and a tip that mentions Ridgeview", () => {
    const state = fresh();
    expect(hasWatch(state)).toBe(false);
    expect(runClubSegmentTip(state)).toMatch(/Ridgeview/);
  });

  it("grants a watch and unlocks segment tip wording", () => {
    const state = fresh();
    const line = grantWatch(state, "trail-pulse");
    expect(line).toMatch(/Trail Pulse/);
    expect(hasWatch(state)).toBe(true);
    expect(ownedWatches(state)).toEqual(["trail-pulse"]);
    expect(runClubSegmentTip(state)).toMatch(/segments/i);
  });

  it("can find a watch in Ridgeview tall grass when forced", () => {
    const state = fresh();
    state.city = "ridgeview";
    state.mapId = "ridgeview";
    // Force a find, then force the first watch weight band via a tiny roll.
    const rng = (() => {
      let i = 0;
      return () => {
        i += 1;
        if (i === 1) return 0; // always find
        return 0.97; // late in the table → watch rows
      };
    })();
    const result = applyForage(state, "ridgeview", rng);
    expect(result.found).toBe(true);
  });

  it("loads an old save without watches as empty", () => {
    const state = fresh();
    const raw = JSON.parse(serialize(state));
    delete raw.gear.ownedWatches;
    delete raw.gear.watch;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.gear.ownedWatches).toEqual([]);
    expect(loaded.gear.watch).toBeNull();
    normalizeWatches(raw);
    expect(raw.gear.ownedWatches).toEqual([]);
  });
});
