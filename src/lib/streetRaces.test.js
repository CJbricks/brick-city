/**
 * streetRaces.test.js
 * Optional town / trail opponents and the rematch cooldown.
 */

import { describe, expect, it } from "vitest";
import { applyStreetRace, createNewGame, streetRaceChat } from "@/lib/activities";
import { deserialize, serialize } from "@/lib/save";
import {
  REMATCH_COOLDOWN_DAYS,
  STREET_OPPONENTS,
  STREET_RACE_ENERGY,
  hasRacedBefore,
  rematchReady,
} from "@/lib/streetRaces";

describe("street races and rematches", () => {
  it("lists original opponents and a 1–2 week rematch gap", () => {
    expect(STREET_OPPONENTS.map((row) => row.id)).toEqual(["tess", "kit", "otto", "mara"]);
    expect(REMATCH_COOLDOWN_DAYS).toBe(10);
    expect(STREET_RACE_ENERGY).toBe(2);
  });

  it("races once, then waits for the cooldown before rematch choices", () => {
    let state = createNewGame({ name: "Ada", gender: "female" });
    const firstChat = streetRaceChat("race-tess", state);
    expect(firstChat.canRace).toBe(true);
    expect(firstChat.choices.some((c) => c.id === "street-race")).toBe(true);

    const raced = applyStreetRace(state, "tess", 0.9);
    expect(raced.ok).toBe(true);
    expect(hasRacedBefore(raced.state, "tess")).toBe(true);
    expect(rematchReady(raced.state, "tess")).toBe(false);
    state = raced.state;

    const waiting = streetRaceChat("race-tess", state);
    expect(waiting.canRace).toBe(false);

    state.calendar.day += REMATCH_COOLDOWN_DAYS;
    expect(rematchReady(state, "tess")).toBe(true);
    const ready = streetRaceChat("race-tess", state);
    expect(ready.canRace).toBe(true);
    expect(ready.choices.some((c) => c.label === "Rematch")).toBe(true);
  });

  it("loads an old save with empty rematch timers", () => {
    const legacy = createNewGame({ name: "Ada", gender: "male" });
    delete legacy.rematches;
    const loaded = deserialize(serialize(legacy));
    expect(loaded.rematches).toEqual({});
    expect(hasRacedBefore(loaded, "otto")).toBe(false);
  });
});
