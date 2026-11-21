/**
 * travel.test.js
 * Road unlocks, depot destinations, and first-arrival greetings.
 */

import { describe, expect, it } from "vitest";
import { createNewGame, arriveInCity, menuFor, perform } from "@/lib/activities";
import {
  FAST_TRAVEL_ENERGY,
  ROAD_BRICK_RIDGEVIEW,
  cityGuideGreeting,
  depotDestinations,
  flatlandRoadOpen,
  ridgeviewRoadOpen,
} from "@/lib/travel";
import { applyEnterRoad, applyArriveFromRoad, applyFastTravel } from "@/lib/travelActions";
import { citiesReached } from "@/lib/catalog";
import { buildActiveWorld, cityMaps } from "@/game/town";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("city travel", () => {
  it("keeps the ridge road locked until half and marathon are finished", () => {
    const state = fresh();
    expect(ridgeviewRoadOpen(state)).toBe(false);
    state.progress.halfFinished = true;
    expect(ridgeviewRoadOpen(state)).toBe(false);
    state.progress.marathonFinished = true;
    expect(ridgeviewRoadOpen(state)).toBe(true);
  });

  it("opens Flatland only after all four Ridgeview premiers", () => {
    const state = fresh();
    expect(flatlandRoadOpen(state)).toBe(false);
    state.progress.ridge50kFinished = true;
    state.progress.ridge100kFinished = true;
    state.progress.ridge100mFinished = true;
    expect(flatlandRoadOpen(state)).toBe(false);
    state.progress.ridge200mFinished = true;
    expect(flatlandRoadOpen(state)).toBe(true);
  });

  it("walks the road to Ridgeview and greets with Dylan Broman on first arrival", () => {
    const state = fresh();
    state.progress.halfFinished = true;
    state.progress.marathonFinished = true;
    const road = applyEnterRoad(state, ROAD_BRICK_RIDGEVIEW);
    expect(road.ok).toBe(true);
    expect(road.state.mapId).toBe(ROAD_BRICK_RIDGEVIEW);
    const arrive = applyArriveFromRoad(road.state, ROAD_BRICK_RIDGEVIEW);
    expect(arrive.ok).toBe(true);
    expect(arrive.state.city).toBe("ridgeview");
    expect(arrive.state.mapId).toBe("ridgeview");
    expect(citiesReached(arrive.state)).toContain("ridgeview");
    expect(arrive.speaker).toBe("Dylan Broman");
    expect(arrive.lines.join(" ")).toMatch(/Dylan Broman/i);
  });

  it("offers depot fast travel only between discovered cities", () => {
    let state = fresh();
    expect(depotDestinations(state)).toEqual([]);
    state = arriveInCity(state, "ridgeview").state;
    state.city = "brick-city";
    expect(depotDestinations(state)).toEqual(["ridgeview"]);
    const bus = applyFastTravel(state, "ridgeview");
    expect(bus.ok).toBe(true);
    expect(bus.state.city).toBe("ridgeview");
    expect(bus.state.energy).toBe(10 - FAST_TRAVEL_ENERGY);
  });

  it("builds Ridgeview and Flatland in cityMaps with one welcome sign each", () => {
    const maps = cityMaps();
    expect(maps.map((m) => m.id)).toEqual(["brick-city", "ridgeview", "flatland"]);
    for (const entry of maps) {
      expect(entry.signs).toHaveLength(1);
      const world = entry.build(fresh());
      expect(world.signs).toHaveLength(1);
    }
  });

  it("builds the active world for Ridgeview", () => {
    const state = fresh();
    state.city = "ridgeview";
    state.mapId = "ridgeview";
    const world = buildActiveWorld(state);
    expect(world.id).toBe("ridgeview");
    expect(world.places.some((p) => p.id === "depot")).toBe(true);
    expect(world.npcs.some((n) => n.id === "dylan")).toBe(true);
  });

  it("lists depot travel rows after the road unlocks", () => {
    const state = fresh();
    state.progress.halfFinished = true;
    state.progress.marathonFinished = true;
    const menu = menuFor("depot", state);
    expect(menu.testId).toBe("depot-menu");
    expect(menu.items.some((row) => row.action?.type === "enter-road")).toBe(true);
  });

  it("returns Dylan greeting only before citiesReached includes Ridgeview", () => {
    const state = fresh();
    const greet = cityGuideGreeting("ridgeview", state);
    expect(greet.speaker).toBe("Dylan Broman");
    const there = arriveInCity(state, "ridgeview").state;
    expect(cityGuideGreeting("ridgeview", there)).toBe(null);
  });

  it("performs enter-road through the action dispatch", () => {
    const state = fresh();
    state.progress.halfFinished = true;
    state.progress.marathonFinished = true;
    const result = perform(state, { type: "enter-road", id: ROAD_BRICK_RIDGEVIEW });
    expect(result.ok).toBe(true);
    expect(result.state.mapId).toBe(ROAD_BRICK_RIDGEVIEW);
  });
});
