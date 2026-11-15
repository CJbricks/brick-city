/**
 * clinic.test.js
 * PT visits. Treatment spends coins only when there is an injury.
 * One a day. Soft tissue clears the sore flag. An old save has
 * never been treated today.
 */

import { describe, expect, it } from "vitest";
import {
  applyClinicScreen,
  applyClinicTissue,
  applyClinicTreat,
  applySleep,
  createNewGame,
  menuFor,
} from "@/lib/activities";
import { clinicRates } from "@/lib/constants";
import { deserialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

function hurt(daysLeft = 4) {
  const state = fresh();
  state.condition.injury = {
    id: "blister",
    name: "Blister",
    daysLeft,
    note: "Small speed penalty until it calms down.",
  };
  state.condition.sore = true;
  state.condition.fatigue = 40;
  return state;
}

describe("PT clinic", () => {
  it("cuts nights off an injury and clears it at zero", () => {
    const once = applyClinicTreat(hurt(4));
    expect(once.ok).toBe(true);
    expect(once.state.condition.injury.daysLeft).toBe(2);
    expect(once.state.coins).toBe(fresh().coins - clinicRates("brick-city").treatment);
    expect(once.state.energy).toBe(9);
    expect(once.state.calendar.clinicTreated).toBe(true);

    const cleared = applyClinicTreat(hurt(2));
    expect(cleared.state.condition.injury).toBeNull();
    expect(cleared.state.condition.sore).toBe(false);
  });

  it("refuses a second treatment the same day and a visit with no injury", () => {
    const first = applyClinicTreat(hurt(4));
    const coins = first.state.coins;
    const second = applyClinicTreat(first.state);
    expect(second.ok).toBe(false);
    expect(second.state.coins).toBe(coins);
    expect(second.state.condition.injury.daysLeft).toBe(2);

    const healthy = fresh();
    const skipped = applyClinicTreat(healthy);
    expect(skipped.ok).toBe(false);
    expect(skipped.state.coins).toBe(healthy.coins);
    expect(skipped.state.calendar.clinicTreated).toBe(false);
    expect(skipped.lines[0]).toMatch(/keep your coins/);
  });

  it("lets sleep book another treatment", () => {
    const first = applyClinicTreat(hurt(4));
    const slept = applySleep(first.state);
    expect(slept.state.calendar.clinicTreated).toBe(false);
    const second = applyClinicTreat(slept.state);
    expect(second.ok).toBe(true);
    expect(second.state.condition.injury).toBeNull();
  });

  it("clears soreness with soft tissue and does not spend energy", () => {
    const state = hurt(3);
    const energy = state.energy;
    const done = applyClinicTissue(state);
    expect(done.ok).toBe(true);
    expect(done.state.condition.sore).toBe(false);
    expect(done.state.condition.fatigue).toBe(40 - 12);
    expect(done.state.condition.injury.daysLeft).toBe(3);
    expect(done.state.energy).toBe(energy);
    expect(done.state.coins).toBe(fresh().coins - clinicRates("brick-city").tissue);
  });

  it("prices Summit Hollow above every other town", () => {
    const summit = clinicRates("summit-hollow").treatment;
    expect(summit).toBeGreaterThan(clinicRates("brick-city").treatment);
    expect(summit).toBeGreaterThan(clinicRates("ridgeview").treatment);
    const state = hurt(4);
    state.city = "summit-hollow";
    const billed = applyClinicTreat(state);
    expect(billed.state.coins).toBe(fresh().coins - summit);
  });

  it("shows the three rows and a free screen", () => {
    const menu = menuFor("clinic", hurt(2));
    expect(menu.testId).toBe("clinic-menu");
    expect(menu.items.map((row) => row.label)).toEqual([
      "Treatment session",
      "Soft tissue work",
      "Injury screen",
    ]);
    const screen = applyClinicScreen(hurt(2));
    expect(screen.ok).toBe(true);
    expect(screen.state.coins).toBe(fresh().coins);
    expect(screen.lines.join(" ")).toMatch(/Blister/);
    expect(screen.lines.join(" ")).toMatch(/sore/i);
  });

  it("loads an old save as never treated", () => {
    const legacy = fresh();
    delete legacy.calendar.clinicTreated;
    delete legacy.gear.socks;
    delete legacy.gear.ownedSocks;
    delete legacy.gear.hat;
    delete legacy.gear.ownedHats;
    const loaded = deserialize(JSON.stringify(legacy));
    expect(loaded.calendar.clinicTreated).toBe(false);
    expect(loaded.gear.socks).toBeNull();
    expect(loaded.gear.ownedSocks).toEqual([]);
    expect(loaded.gear.hat).toBeNull();
    expect(loaded.gear.ownedHats).toEqual([]);
  });
});
