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
    delete state.calendar.homeMealUsed;
    delete state.calendar.homeSnackUsed;
    state.calendar.slot = 4;
    const copy = deserialize(serialize(state));
    expect(copy.energy).toBe(10);
    expect(copy.nappedToday).toBe(false);
    expect(copy.calendar.slot).toBe(0);
    expect(copy.calendar.homeMealUsed).toBe(false);
    expect(copy.calendar.homeSnackUsed).toBe(false);
    expect(copy.runner.name).toBe("ADA");
  });

  it("doubles a v1 16px position and leaves a 32px position alone", () => {
    const modern = createNewGame({ name: "Ada", gender: "female" });
    expect(modern.tileSize).toBe(32);
    expect(modern.position).toMatchObject({ x: 176, y: 240, facing: "up" });

    const legacy = createNewGame({ name: "Ada", gender: "female" });
    delete legacy.tileSize;
    // Home mat in the old 16px map: tile (5, 7), center (5.5 * 16, 7.5 * 16).
    legacy.position = { x: 88, y: 120, facing: "up" };
    const migrated = deserialize(serialize(legacy));
    expect(migrated.tileSize).toBe(32);
    expect(migrated.position).toEqual({ x: 176, y: 240, facing: "up" });

    const stamped = createNewGame({ name: "Ada", gender: "male" });
    stamped.tileSize = 16;
    stamped.position = { x: 40, y: 50, facing: "left" };
    const fromSixteen = deserialize(serialize(stamped));
    expect(fromSixteen.position).toEqual({ x: 80, y: 100, facing: "left" });
    expect(fromSixteen.tileSize).toBe(32);

    const kept = deserialize(serialize(modern));
    expect(kept.position).toEqual(modern.position);
    expect(kept.tileSize).toBe(32);
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
