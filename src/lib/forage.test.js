/**
 * forage.test.js
 * Tall-grass finds. The roll is a function, so the same seed does the
 * same thing. The daily cap is what stops a player walking in circles.
 */

import { describe, expect, it } from "vitest";
import { applySleep, createNewGame } from "@/lib/activities";
import { FINDS_PER_DAY } from "@/lib/constants";
import { FIND_CHANCE, LOOT, applyForage, pickLoot } from "@/lib/forage";
import { deserialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

/** First call is the encounter, second is the table. */
function scripted(values) {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

describe("tall grass finds", () => {
  it("gives the mountain a better chance and a heavier rare end", () => {
    expect(FIND_CHANCE.mountain).toBeGreaterThan(FIND_CHANCE.park);
    const weight = (area, id) => LOOT[area].find((row) => row.id === id).weight;
    expect(weight("mountain", "shake")).toBeGreaterThan(weight("park", "shake"));
    expect(weight("mountain", "generic-vest")).toBeGreaterThan(weight("park", "generic-vest"));
  });

  it("rolls the same item from the same numbers", () => {
    expect(pickLoot("park", 0)).toBe("gel");
    expect(pickLoot("park", 0.9)).toBe("shake");
    expect(pickLoot("park", 0.99)).toBe("generic-vest");
    expect(pickLoot("mountain", 0.99)).toBe("generic-vest");
    const park = applyForage(fresh(), "park", scripted([0, 0]));
    expect(park.found).toBe(true);
    expect(park.line).toBe("You found a gel!");
    expect(park.state.gels).toBe(1);
    expect(park.state.calendar.findsToday).toBe(1);
    const socks = applyForage(fresh(), "park", scripted([0, 0.5]));
    expect(socks.line).toBe("You found running socks!");
    expect(socks.state.gear.ownedSocks).toEqual(["socks-generic"]);
    expect(socks.state.gear.socks).toBeNull();
  });

  it("misses when the roll is above the park chance but still hits on the mountain", () => {
    const roll = FIND_CHANCE.park + 0.01;
    expect(roll).toBeLessThan(FIND_CHANCE.mountain);
    const park = applyForage(fresh(), "park", scripted([roll, 0]));
    expect(park.found).toBe(false);
    expect(park.state.gels).toBe(0);
    const mountain = applyForage(fresh(), "mountain", scripted([roll, 0]));
    expect(mountain.found).toBe(true);
    expect(mountain.state.gels).toBe(1);
  });

  it("stops at the daily cap and lets sleep open it again", () => {
    let state = fresh();
    for (let i = 0; i < FINDS_PER_DAY; i += 1) {
      const found = applyForage(state, "park", scripted([0, 0]));
      expect(found.found).toBe(true);
      state = found.state;
    }
    expect(state.gels).toBe(FINDS_PER_DAY);
    const blocked = applyForage(state, "mountain", scripted([0, 0.9]));
    expect(blocked.found).toBe(false);
    expect(blocked.state).toBe(state);
    const slept = applySleep(state);
    expect(slept.state.calendar.findsToday).toBe(0);
    const again = applyForage(slept.state, "park", scripted([0, 0.9]));
    expect(again.found).toBe(true);
    expect(again.state.shakes).toBe(1);
  });

  it("turns a duplicate plain belt into a gel", () => {
    const state = fresh();
    state.gear.ownedCarry = ["generic-belt"];
    const found = applyForage(state, "mountain", scripted([0, 0.9]));
    expect(found.found).toBe(true);
    expect(found.state.gels).toBe(1);
    expect(found.state.gear.ownedCarry).toEqual(["generic-belt"]);
    expect(found.line).toMatch(/generic belt/);
    expect(found.line).toMatch(/gel/);
  });

  it("loads an old save with zero finds", () => {
    const legacy = fresh();
    delete legacy.calendar.findsToday;
    delete legacy.shakes;
    delete legacy.flasks;
    delete legacy.flaskReady;
    const loaded = deserialize(JSON.stringify(legacy));
    expect(loaded.calendar.findsToday).toBe(0);
    expect(loaded.shakes).toBe(0);
    expect(loaded.flasks).toBe(0);
    expect(loaded.flaskReady).toBe(0);
  });
});
