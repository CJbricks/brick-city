/**
 * clinic.test.js
 * PT visits. Treatment spends coins only when there is an injury.
 * One a day. Soft tissue clears the sore flag. Blister care clears a
 * blister and does not charge when there is none. An old save has
 * never been treated today. The blister price is city data, not a
 * field on the save.
 */

import { describe, expect, it } from "vitest";
import {
  applyClinicBlister,
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
    expect(once.state.energy).toBe(8);
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

  it("dresses a blister for the city price and refuses when there is none", () => {
    const state = hurt(2);
    const energy = state.energy;
    const done = applyClinicBlister(state);
    expect(done.ok).toBe(true);
    expect(done.state.condition.injury).toBeNull();
    expect(done.state.condition.sore).toBe(false);
    expect(done.state.energy).toBe(energy);
    expect(done.state.coins).toBe(fresh().coins - clinicRates("brick-city").blister);
    expect(done.state.calendar.clinicTreated).toBe(false);

    const again = applyClinicBlister(done.state);
    expect(again.ok).toBe(false);
    expect(again.state.coins).toBe(done.state.coins);
    expect(again.lines[0]).toMatch(/keep your coins/);

    const broke = hurt(2);
    broke.coins = clinicRates("brick-city").blister - 1;
    const refused = applyClinicBlister(broke);
    expect(refused.ok).toBe(false);
    expect(refused.state.coins).toBe(broke.coins);
    expect(refused.state.condition.injury.id).toBe("blister");

    const summit = hurt(2);
    summit.city = "summit-hollow";
    const billed = applyClinicBlister(summit);
    expect(billed.state.coins).toBe(fresh().coins - clinicRates("summit-hollow").blister);
    expect(clinicRates("summit-hollow").blister).toBeGreaterThan(clinicRates("brick-city").blister);
    const prices = ["brick-city", "ridgeview", "lakeport", "mesa-verde-flats", "flatland", "summit-hollow"]
      .map((id) => clinicRates(id).blister);
    expect(clinicRates("summit-hollow").blister).toBe(Math.max(...prices));
    for (const id of ["brick-city", "ridgeview", "lakeport", "mesa-verde-flats", "flatland", "summit-hollow"]) {
      expect(clinicRates(id).blister).toBeLessThan(clinicRates(id).tissue);
    }
  });

  it("shows the clinic rows and a free screen", () => {
    const menu = menuFor("clinic", hurt(2));
    expect(menu.testId).toBe("clinic-menu");
    expect(menu.items.map((row) => row.label)).toEqual([
      "Treatment session",
      "Soft tissue work",
      "Blister care",
      "Injury screen",
    ]);
    const healthy = menuFor("clinic", fresh());
    const row = healthy.items.find((entry) => entry.action.type === "clinic-blister");
    expect(row.disabled).toBe(true);
    expect(row.detail).toMatch(/No blister/);
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
