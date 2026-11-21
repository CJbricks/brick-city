/**
 * weather.test.js
 * Daily weather rolls, cold-season ice, and save defaults.
 */

import { describe, expect, it } from "vitest";
import {
  WEATHER_CLEAR,
  WEATHER_HEAT,
  WEATHER_ICE,
  advanceWeather,
  coldSeason,
  normalizeWeather,
  pickWeather,
  weatherInjuryBonus,
  weatherLabel,
} from "@/lib/weather";
import { createNewGame, applySleep, perform } from "@/lib/activities";
import { deserialize, serialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("weather", () => {
  it("picks clear for a low roll and labels every id", () => {
    expect(pickWeather(1, 0)).toBe(WEATHER_CLEAR);
    expect(weatherLabel(WEATHER_HEAT)).toBe("Heat wave");
    expect(weatherInjuryBonus(WEATHER_ICE)).toBeGreaterThan(weatherInjuryBonus(WEATHER_CLEAR));
  });

  it("treats early days of a 60-day cycle as cold season", () => {
    expect(coldSeason(1)).toBe(true);
    expect(coldSeason(20)).toBe(true);
    expect(coldSeason(21)).toBe(false);
  });

  it("advances tomorrow into today on sleep", () => {
    const state = fresh();
    state.weather = { today: WEATHER_CLEAR, tomorrow: WEATHER_HEAT };
    const slept = applySleep(state, () => 0);
    expect(slept.state.weather.today).toBe(WEATHER_HEAT);
    expect(slept.lines.join(" ")).toMatch(/weather/i);
  });

  it("loads an old save without weather as clear / clear", () => {
    const state = fresh();
    delete state.weather;
    const raw = JSON.parse(serialize(state));
    delete raw.weather;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.weather).toEqual({ today: WEATHER_CLEAR, tomorrow: WEATHER_CLEAR });
  });

  it("serves a forecast from the cafe board", () => {
    const state = fresh();
    state.weather = { today: WEATHER_HEAT, tomorrow: WEATHER_CLEAR };
    const result = perform(state, { type: "open-forecast" });
    expect(result.ok).toBe(true);
    expect(result.lines.join(" ")).toMatch(/Heat wave/);
  });

  it("normalizeWeather fixes junk ids", () => {
    const data = { weather: { today: "lava", tomorrow: null } };
    normalizeWeather(data);
    expect(data.weather.today).toBe(WEATHER_CLEAR);
    expect(data.weather.tomorrow).toBe(WEATHER_CLEAR);
  });
});
