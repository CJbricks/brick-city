/**
 * runclub.test.js
 * Invite rules, Wi-Fi counter, group run, and old-save defaults for
 * Cornerstone Pace Club.
 */

import { describe, expect, it } from "vitest";
import {
  applyCafeWifi,
  applyRunClubGroup,
  applyRunClubJoin,
  createNewGame,
  perform,
} from "@/lib/activities";
import { deserialize, serialize } from "@/lib/save";
import {
  RUN_CLUB_GROUP_ENERGY,
  RUN_CLUB_JOIN_PACE,
  RUN_CLUB_NAME,
  RUN_CLUB_WIFI_TURNS,
  clubPaceMod,
  groupRunAvailable,
  isRunClubMember,
  readWifiTurns,
  runClubInviteReady,
} from "@/lib/runclub";

function eligible(state) {
  state.progress.fiveKFinished = true;
  state.progress.tenKFinished = true;
  state.wifiTurns = RUN_CLUB_WIFI_TURNS;
  return state;
}

describe("Cornerstone Pace Club", () => {
  it("names the club and keeps invite numbers in constants", () => {
    expect(RUN_CLUB_NAME).toBe("Cornerstone Pace Club");
    expect(RUN_CLUB_WIFI_TURNS).toBe(5);
    expect(RUN_CLUB_GROUP_ENERGY).toBe(3);
    expect(RUN_CLUB_JOIN_PACE).toBe(0.01);
  });

  it("counts Wi-Fi hours across days and defaults missing to 0", () => {
    let state = createNewGame({ name: "Ada", gender: "female" });
    expect(readWifiTurns(state)).toBe(0);
    for (let i = 0; i < 3; i += 1) {
      const wifi = applyCafeWifi(state);
      expect(wifi.ok).toBe(true);
      state = wifi.state;
      // Sleep clears wifiToday so another hour can count.
      state.calendar.wifiToday = false;
    }
    expect(state.wifiTurns).toBe(3);

    const legacy = createNewGame({ name: "Ada", gender: "male" });
    delete legacy.wifiTurns;
    delete legacy.runClub;
    delete legacy.rematches;
    const loaded = deserialize(serialize(legacy));
    expect(loaded.wifiTurns).toBe(0);
    expect(loaded.runClub.member).toBe(false);
    expect(loaded.rematches).toEqual({});
  });

  it("invites only after 5K, 10K, and five Wi-Fi hours", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    expect(runClubInviteReady(state)).toBe(false);
    state.progress.fiveKFinished = true;
    expect(runClubInviteReady(state)).toBe(false);
    state.progress.tenKFinished = true;
    state.wifiTurns = 4;
    expect(runClubInviteReady(state)).toBe(false);
    state.wifiTurns = 5;
    expect(runClubInviteReady(state)).toBe(true);
  });

  it("joins, grants permanent pace, and limits the group run to once a week", () => {
    let state = eligible(createNewGame({ name: "Ada", gender: "female" }));
    const join = applyRunClubJoin(state);
    expect(join.ok).toBe(true);
    expect(isRunClubMember(join.state)).toBe(true);
    expect(clubPaceMod(join.state)).toBe(RUN_CLUB_JOIN_PACE);
    state = join.state;

    expect(groupRunAvailable(state)).toBe(true);
    const group = applyRunClubGroup(state);
    expect(group.ok).toBe(true);
    expect(group.state.energy).toBe(state.energy - RUN_CLUB_GROUP_ENERGY);
    expect(groupRunAvailable(group.state)).toBe(false);

    const again = applyRunClubGroup(group.state);
    expect(again.ok).toBe(false);

    // Next calendar week unlocks another group run.
    group.state.calendar.weekIndex += 1;
    expect(groupRunAvailable(group.state)).toBe(true);
  });

  it("delivers the invite line when the fifth Wi-Fi hour lands", () => {
    let state = createNewGame({ name: "Ada", gender: "female" });
    state.progress.fiveKFinished = true;
    state.progress.tenKFinished = true;
    state.wifiTurns = 4;
    const wifi = applyCafeWifi(state);
    expect(wifi.ok).toBe(true);
    expect(wifi.state.wifiTurns).toBe(5);
    expect(wifi.state.runClub.invited).toBe(true);
    expect(wifi.lines.some((line) => line.includes(RUN_CLUB_NAME))).toBe(true);
  });

  it("refuses a group run through perform when not a member", () => {
    const state = createNewGame({ name: "Ada", gender: "female" });
    const result = perform(state, { type: "run-club-group" });
    expect(result.ok).toBe(false);
  });
});
