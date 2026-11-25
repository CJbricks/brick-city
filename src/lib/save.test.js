/**
 * save.test.js
 * A save is just JSON. Bad data, the wrong version, and broken text must
 * come back as "no save" so the title screen offers New Game instead of
 * crashing on Resume.
 *
 * Version stays 1. A closet from before belts and sponsors existed is
 * filled in here, and the old shoe ids still resolve. A save from before
 * daily meal, snack, and nap counts existed still loads too. The missing
 * numbers default to 0. A save from before the activity board has no 5K
 * personal best, and a save from before the offer gap has no last day.
 */

import { describe, expect, it } from "vitest";
import { createNewGame, applyRun } from "@/lib/activities";
import { shoeById } from "@/lib/catalog";
import { deserialize, serialize } from "@/lib/save";
import { buildWorld, isBlocked, TILE } from "@/game/town";

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
    // Home mat in 16px space. Doubling must land on a walkable tile, or
    // safePlayerPosition would move the runner to the town square.
    stamped.position = { x: 88, y: 120, facing: "left" };
    const fromSixteen = deserialize(serialize(stamped));
    expect(fromSixteen.position).toEqual({ x: 176, y: 240, facing: "left" });
    expect(fromSixteen.tileSize).toBe(32);

    // A doubled pixel that lands inside a wall nudges to the nearest
    // walkable tile (facing kept). Town square is only the last fallback.
    const trapped = createNewGame({ name: "Ada", gender: "female" });
    trapped.tileSize = 16;
    trapped.position = { x: 8, y: 8, facing: "up" };
    const rescued = deserialize(serialize(trapped));
    expect(rescued.position.facing).toBe("up");
    const rtx = Math.floor(rescued.position.x / TILE);
    const rty = Math.floor(rescued.position.y / TILE);
    const world = buildWorld(rescued);
    expect(isBlocked(world, rtx, rty)).toBe(false);
    expect(rescued.position.x).toBe((rtx + 0.5) * TILE);
    expect(rescued.position.y).toBe((rty + 0.5) * TILE);

    const kept = deserialize(serialize(modern));
    expect(kept.position).toEqual(modern.position);
    expect(kept.tileSize).toBe(32);
  });

  it("fills belts, sponsors, and legacy shoe ids on an old v1 blob", () => {
    const legacy = createNewGame({ name: "Ada", gender: "female" });
    delete legacy.sponsors;
    delete legacy.gear.carry;
    delete legacy.gear.ownedCarry;
    legacy.gear.equipped = "trail";
    legacy.gear.owned = ["starter", "road", "trail", "hybrid", "made-up"];
    legacy.gear.miles = { trail: 12, road: 4, hybrid: 1 };
    legacy.condition.nutrition = 140;
    const migrated = deserialize(serialize(legacy));
    expect(migrated.gear.equipped).toBe("trail");
    expect(shoeById(migrated.gear.equipped).style).toBe("trail");
    expect(migrated.gear.owned).toEqual(["starter", "road", "trail", "hybrid"]);
    expect(migrated.gear.miles.trail).toBe(12);
    expect(migrated.gear.carry).toBeNull();
    expect(migrated.gear.ownedCarry).toEqual([]);
    expect(migrated.sponsors.shoe).toBeNull();
    expect(migrated.sponsors.nutrition).toBeNull();
    expect(migrated.sponsors.gear).toBeNull();
    expect(migrated.sponsors.obligation).toBeNull();
    expect(migrated.sponsors.offers).toEqual({ shoe: null, nutrition: null, gear: null });
    expect(migrated.sponsors.cooldowns).toEqual({});
    expect(migrated.sponsors.mailbox).toEqual([]);
    expect(migrated.sponsors.shoeTerms).toBeNull();
    expect(migrated.sponsors.gearTerms).toBeNull();
    expect(migrated.condition.nutrition).toBe(100);
    expect(migrated.version).toBe(1);
  });

  it("keeps an active sponsor from a save that predates offers", () => {
    const legacy = createNewGame({ name: "Ada", gender: "male" });
    legacy.sponsors = {
      shoe: "nike",
      nutrition: "bpn",
      standing: { nike: 66, bpn: 80 },
      obligation: null,
      seenObligation: true,
    };
    const migrated = deserialize(serialize(legacy));
    expect(migrated.sponsors.shoe).toBe("nike");
    expect(migrated.sponsors.nutrition).toBe("bpn");
    expect(migrated.sponsors.gear).toBeNull();
    expect(migrated.sponsors.gearTerms).toBeNull();
    expect(migrated.sponsors.standing.nike).toBe(66);
    expect(migrated.sponsors.shoeTerms).toBeNull();
    expect(migrated.sponsors.offers.shoe).toBeNull();
    expect(migrated.sponsors.offers.gear).toBeNull();
    expect(migrated.sponsors.cooldowns).toEqual({});
    expect(migrated.version).toBe(1);
  });

  it("loads an old save that has no meal, snack, or nap counters", () => {
    const legacy = createNewGame({ name: "Ada", gender: "female" });
    delete legacy.napsToday;
    delete legacy.nappedToday;
    delete legacy.calendar.homeMeals;
    delete legacy.calendar.homeSnacks;
    delete legacy.calendar.homeMealUsed;
    delete legacy.calendar.homeSnackUsed;
    const loaded = deserialize(serialize(legacy));
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(1);
    expect(loaded.napsToday).toBe(0);
    expect(loaded.nappedToday).toBe(false);
    expect(loaded.calendar.homeMeals).toBe(0);
    expect(loaded.calendar.homeSnacks).toBe(0);
    expect(loaded.calendar.homeMealUsed).toBe(false);
    expect(loaded.calendar.homeSnackUsed).toBe(false);

    const used = createNewGame({ name: "Ada", gender: "male" });
    delete used.napsToday;
    delete used.calendar.homeMeals;
    delete used.calendar.homeSnacks;
    used.nappedToday = true;
    used.calendar.homeMealUsed = true;
    used.calendar.homeSnackUsed = true;
    const migrated = deserialize(serialize(used));
    expect(migrated.napsToday).toBe(1);
    expect(migrated.calendar.homeMeals).toBe(1);
    expect(migrated.calendar.homeSnacks).toBe(1);
    expect(migrated.version).toBe(1);
  });

  it("loads an old save with no 5K best and no offer gap", () => {
    const legacy = createNewGame({ name: "Ada", gender: "female" });
    delete legacy.records;
    delete legacy.sponsors.lastOfferDay;
    const loaded = deserialize(serialize(legacy));
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(1);
    expect(loaded.records.fiveK).toBeNull();
    expect(loaded.sponsors.lastOfferDay).toBeNull();

    const kept = createNewGame({ name: "Ada", gender: "male" });
    kept.records.fiveK = "23:55";
    kept.sponsors.lastOfferDay = 4;
    const round = deserialize(serialize(kept));
    expect(round.records.fiveK).toBe("23:55");
    expect(round.sponsors.lastOfferDay).toBe(4);

    const junk = createNewGame({ name: "Ada", gender: "female" });
    junk.records.fiveK = "not a time";
    junk.sponsors.lastOfferDay = -3;
    const cleaned = deserialize(serialize(junk));
    expect(cleaned.records.fiveK).toBeNull();
    expect(cleaned.sponsors.lastOfferDay).toBeNull();
  });

  it("loads an old save from before half and marathon finish flags", () => {
    const legacy = createNewGame({ name: "Ada", gender: "female" });
    delete legacy.progress.halfFinished;
    delete legacy.progress.marathonFinished;
    // Mimic a blob that never knew those races existed.
    const raw = JSON.parse(serialize(legacy));
    delete raw.progress.halfFinished;
    delete raw.progress.marathonFinished;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(1);
    expect(loaded.progress.halfFinished).toBe(false);
    expect(loaded.progress.marathonFinished).toBe(false);
    expect(loaded.progress.fiveKFinished).toBe(false);

    const finished = createNewGame({ name: "Ada", gender: "male" });
    finished.progress.halfFinished = true;
    finished.progress.marathonFinished = true;
    const round = deserialize(serialize(finished));
    expect(round.progress.halfFinished).toBe(true);
    expect(round.progress.marathonFinished).toBe(true);
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
