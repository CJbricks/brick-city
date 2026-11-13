/**
 * save.test.js
 * A save is just JSON. Bad data, the wrong version, and broken text must
 * come back as "no save" so the title screen offers New Game instead of
 * crashing on Resume.
 */

import { describe, expect, it } from "vitest";
import { createNewGame, applyRun } from "@/lib/activities";
import { deserialize, serialize } from "@/lib/save";

describe("save serialization", () => {
  it("round-trips a runner who has already trained", () => {
    const state = applyRun(createNewGame({ name: "ada", gender: "female" }), "easy-run").state;
    const copy = deserialize(serialize(state));
    expect(copy).toEqual(state);
    expect(copy.runner.name).toBe("ADA");
    expect(copy.version).toBe(1);
    expect(copy.xp.overall).toBeGreaterThan(0);
  });

  it("gives an older v1 save a full energy bar when the field is missing", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    delete state.energy;
    delete state.nappedToday;
    state.calendar.slot = 4;
    const copy = deserialize(serialize(state));
    expect(copy.energy).toBe(10);
    expect(copy.nappedToday).toBe(false);
    expect(copy.calendar.slot).toBe(0);
    expect(copy.runner.name).toBe("ADA");
  });

  it("rejects junk instead of loading a half save", () => {
    expect(deserialize("")).toBeNull();
    expect(deserialize("not json")).toBeNull();
    expect(deserialize("null")).toBeNull();
    expect(deserialize(JSON.stringify({ version: 2 }))).toBeNull();
    expect(deserialize(JSON.stringify({ version: 1, runner: { name: "A", gender: "nope" } }))).toBeNull();
    expect(deserialize(JSON.stringify({
      version: 1,
      runner: { name: "A", gender: "male" },
    }))).toBeNull();
  });
});
