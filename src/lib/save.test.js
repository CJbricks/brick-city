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
