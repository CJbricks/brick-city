/**
 * cafe.test.js
 * Cups, pastries, Wi-Fi, and what Race IQ is allowed to do in a race.
 * An old brick-city-save-v1 blob has no Race IQ. Loading it must not
 * invent a studied runner.
 */

import { describe, expect, it } from "vitest";
import {
  applyCafeCoffee,
  applyCafePastry,
  applyCafeWifi,
  applyRace,
  applyRun,
  applySleep,
  createNewGame,
  menuFor,
} from "@/lib/activities";
import {
  bonkThreshold,
  courseHint,
  raceIqLift,
  wifiGain,
} from "@/lib/cafe";
import {
  CITIES,
  COFFEE_CUPS_BEFORE_JITTER,
  HOME_SNACK_NUTRITION,
  PASTRY_NUTRITION,
  RACE_IQ_HINT_FIRST,
  RACE_IQ_LIFT_CAP,
  cafeRates,
} from "@/lib/constants";
import { finishScore, flavorTime, judgeBonk, readiness } from "@/lib/race";
import { RACES } from "@/lib/race";
import { deserialize, serialize } from "@/lib/save";

function fresh() {
  return createNewGame({ name: "Ada", gender: "female" });
}

describe("coffee shop", () => {
  it("gives two cups a pace bump and the third cup jitters instead", () => {
    const start = fresh();
    start.energy = 8;
    const first = applyCafeCoffee(start);
    expect(first.ok).toBe(true);
    expect(first.state.energy).toBe(9);
    expect(first.state.calendar.coffeesToday).toBe(1);
    expect(first.state.condition.coffeeNext).toBe("boost");
    expect(first.state.coins).toBe(start.coins - cafeRates("brick-city").coffee);
    expect(first.state.calendar.slot).toBe(start.calendar.slot);

    const second = applyCafeCoffee(first.state);
    expect(second.state.energy).toBe(10);
    expect(second.state.calendar.coffeesToday).toBe(2);
    expect(second.state.condition.coffeeNext).toBe("boost");

    const third = applyCafeCoffee(second.state);
    expect(third.ok).toBe(true);
    expect(third.state.energy).toBe(10);
    expect(third.state.calendar.coffeesToday).toBe(3);
    expect(third.state.condition.coffeeNext).toBe("jitter");
    expect(third.state.coins).toBe(start.coins - cafeRates("brick-city").coffee * 3);
    expect(third.lines.join(" ")).toMatch(/jitter/i);

    const fourth = applyCafeCoffee(third.state);
    expect(fourth.state.condition.coffeeNext).toBe("jitter");
    expect(fourth.state.calendar.coffeesToday).toBe(4);
  });

  it("spends the bump on the next run and the jitters on the one after", () => {
    const plain = applyRun(fresh(), "easy-run");
    const boosted = applyCafeCoffee(fresh());
    const smooth = applyRun(boosted.state, "easy-run");
    expect(smooth.state.condition.coffeeNext).toBeNull();
    expect(smooth.state.condition.fatigue).toBe(plain.state.condition.fatigue - 2);
    expect(smooth.lines.join(" ")).toMatch(/pace/i);

    let jittery = fresh();
    for (let cup = 0; cup < COFFEE_CUPS_BEFORE_JITTER + 1; cup += 1) {
      jittery = applyCafeCoffee(jittery).state;
    }
    expect(jittery.condition.coffeeNext).toBe("jitter");
    const rough = applyRun(jittery, "easy-run");
    expect(rough.state.condition.coffeeNext).toBeNull();
    expect(rough.state.condition.fatigue).toBe(plain.state.condition.fatigue + 2);
    expect(rough.lines.join(" ")).toMatch(/jitter/i);
  });

  it("refuses a cup when the coins are short and does not count it", () => {
    const broke = fresh();
    broke.coins = cafeRates("brick-city").coffee - 1;
    const skipped = applyCafeCoffee(broke);
    expect(skipped.ok).toBe(false);
    expect(skipped.state).toBe(broke);
    expect(broke.calendar.coffeesToday).toBe(0);
    expect(broke.condition.coffeeNext).toBeNull();
  });

  it("sells a pastry for more food than a home snack and no energy", () => {
    expect(PASTRY_NUTRITION).toBeGreaterThan(HOME_SNACK_NUTRITION);
    const start = fresh();
    const eaten = applyCafePastry(start);
    expect(eaten.ok).toBe(true);
    expect(eaten.state.condition.nutrition).toBe(start.condition.nutrition + PASTRY_NUTRITION);
    expect(eaten.state.energy).toBe(start.energy);
    expect(eaten.state.calendar.slot).toBe(start.calendar.slot);
    expect(eaten.state.coins).toBe(start.coins - cafeRates("brick-city").pastryCost);
    expect(eaten.state.condition.mealName).toBe("Cold-brew brownie");
    expect(eaten.state.condition.junk).toBe(false);
  });

  it("raises Race IQ from Wi-Fi once a day, then less the next morning", () => {
    const start = fresh();
    const first = applyCafeWifi(start);
    expect(first.ok).toBe(true);
    expect(first.state.raceIq).toBe(wifiGain(0));
    expect(first.state.raceIq).toBeGreaterThan(0);
    expect(first.state.energy).toBe(start.energy);
    expect(first.state.calendar.slot).toBe(start.calendar.slot + 1);
    expect(first.state.calendar.wifiToday).toBe(true);

    const again = applyCafeWifi(first.state);
    expect(again.ok).toBe(false);
    expect(again.state.raceIq).toBe(first.state.raceIq);
    expect(again.state.calendar.slot).toBe(first.state.calendar.slot);

    const slept = applySleep(first.state);
    expect(slept.state.raceIq).toBe(first.state.raceIq);
    expect(slept.state.calendar.wifiToday).toBe(false);
    expect(slept.state.calendar.coffeesToday).toBe(0);
    expect(slept.state.condition.coffeeNext).toBeNull();

    const second = applyCafeWifi(slept.state);
    expect(second.ok).toBe(true);
    expect(wifiGain(first.state.raceIq)).toBeLessThan(wifiGain(0));
    expect(wifiGain(first.state.raceIq)).toBeGreaterThanOrEqual(1);
    expect(second.state.raceIq).toBe(first.state.raceIq + wifiGain(first.state.raceIq));
    expect(wifiGain(500)).toBe(1);
  });

  it("prices Summit Hollow above every other shop and keeps each pastry name", () => {
    const names = Object.values(CITIES).map((city) => city.cafe.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(expect.arrayContaining([
      "Ravenline Roasters",
      "Good Neighbor Roasting",
      "Inkline Coffee Bar",
      "Teal & Butter Bakeshop",
      "Captain's 43rd Bakery",
      "Old Post Books & Coffee",
    ]));
    const blob = JSON.stringify(CITIES);
    expect(blob).not.toMatch(/corvus|jubilee|procession|rockman|quack|first light/i);

    const summit = cafeRates("summit-hollow");
    for (const city of Object.values(CITIES)) {
      expect(summit.coffee).toBeGreaterThanOrEqual(city.cafe.coffee);
      expect(summit.pastryCost).toBeGreaterThanOrEqual(city.cafe.pastryCost);
    }
    const state = fresh();
    state.city = "summit-hollow";
    const billed = applyCafeCoffee(state);
    expect(billed.state.coins).toBe(fresh().coins - summit.coffee);

    const lake = fresh();
    lake.city = "lakeport";
    const menu = menuFor("cafe", lake);
    expect(menu.title).toBe("Inkline Coffee Bar");
    expect(menu.intro).toMatch(/tattoo/i);
    expect(menu.intro).toMatch(/drip is free for life/i);
    expect(menu.intro).toMatch(/rosemary maple latte/i);
    expect(menu.items.map((row) => row.label)).toEqual([
      "Coffee",
      "Rosemary maple bar",
      "Use the Wi-Fi",
    ]);

    const brick = menuFor("cafe", fresh());
    expect(brick.testId).toBe("cafe-menu");
    expect(brick.title).toBe("Ravenline Roasters");
    expect(brick.items[1].label).toBe("Cold-brew brownie");
    expect(brick.items[1].detail).toMatch(new RegExp(`\\+${PASTRY_NUTRITION} FOOD`));

    const mesa = fresh();
    mesa.city = "mesa-verde-flats";
    const bakeshop = menuFor("cafe", mesa);
    expect(bakeshop.items[1].label).toBe("Lemon meringue croissant");
    expect(bakeshop.intro).toMatch(/kouign-amann/);
    const flat = fresh();
    flat.city = "flatland";
    expect(menuFor("cafe", flat).intro).toMatch(/kolache/i);
  });
});

describe("Race IQ in a race", () => {
  it("lowers maybe-bonk chance up to a cap and leaves a sure bonk alone", () => {
    expect(bonkThreshold(0)).toBeCloseTo(0.45);
    expect(bonkThreshold(1000)).toBeGreaterThan(0.3);
    expect(bonkThreshold(1000)).toBeLessThan(0.45);
    expect(bonkThreshold(1000)).toBeCloseTo(bonkThreshold(80));

    const roll = 0.4;
    const shared = {
      nutrition: 20,
      sleepQuality: "good",
      fatigue: 10,
      roll,
      km: 5,
    };
    expect(judgeBonk({ ...shared, chance: bonkThreshold(0) }).bonk).toBe(true);
    expect(judgeBonk({ ...shared, chance: bonkThreshold(80) }).bonk).toBe(false);

    const sure = judgeBonk({
      nutrition: 10,
      sleepQuality: "poor",
      fatigue: 10,
      roll: 0.99,
      km: 5,
      chance: bonkThreshold(1000),
    });
    expect(sure).toMatchObject({ bonk: true, dnf: true, reason: "low-fuel-poor-sleep" });

    const tired = fresh();
    tired.condition.nutrition = 20;
    tired.condition.sleepQuality = "good";
    tired.condition.fatigue = 10;
    const dull = applyRace(tired, "5k", roll);
    expect(dull.lines.join(" ")).toMatch(/bonk/i);
    const studied = { ...tired, raceIq: 80, condition: { ...tired.condition }, calendar: { ...tired.calendar } };
    const smart = applyRace(studied, "5k", roll);
    expect(smart.lines.join(" ")).not.toMatch(/bonk/i);
  });

  it("adds a capped finish bump and unlocks one course line at a time", () => {
    expect(raceIqLift(20, 0)).toBe(0);
    expect(raceIqLift(100, 4)).toBeGreaterThan(0);
    expect(raceIqLift(100, 999)).toBeLessThanOrEqual(RACE_IQ_LIFT_CAP);
    expect(raceIqLift(-10, 999)).toBeLessThanOrEqual(RACE_IQ_LIFT_CAP);

    const state = fresh();
    const plain = finishScore(state, RACES["5k"]);
    state.raceIq = 999;
    const smart = finishScore(state, RACES["5k"]);
    expect(smart).toBeGreaterThan(plain);
    expect(smart - plain).toBeLessThanOrEqual(RACE_IQ_LIFT_CAP + 0.001);

    const slow = fresh();
    slow.condition.endurance = 10;
    slow.condition.peak = 8;
    slow.condition.fatigue = 40;
    slow.raceIq = 999;
    expect(flavorTime(RACES["5k"], finishScore(slow, RACES["5k"]), false)).toBe("29:05");

    const close = fresh();
    close.condition.endurance = 30;
    close.condition.peak = 36;
    close.condition.fatigue = 20;
    const before = finishScore(close, RACES["5k"]);
    expect(before).toBeLessThan(28);
    close.raceIq = 999;
    const after = finishScore(close, RACES["5k"]);
    expect(after).toBeGreaterThanOrEqual(28);
    expect(after - before).toBeLessThanOrEqual(RACE_IQ_LIFT_CAP + 0.001);
    expect(flavorTime(RACES["5k"], before, false)).not.toBe(flavorTime(RACES["5k"], after, false));

    expect(courseHint(0)).toBe("");
    expect(courseHint(RACE_IQ_HINT_FIRST - 1)).toBe("");
    expect(courseHint(RACE_IQ_HINT_FIRST)).toMatch(/fountain/);
    expect(readiness(fresh(), RACES["5k"]).hint).toBe("");
    const learned = fresh();
    learned.raceIq = RACE_IQ_HINT_FIRST;
    expect(readiness(learned, RACES["5k"]).hint).toMatch(/fountain/);
    learned.raceIq = 24;
    expect(readiness(learned, RACES["5k"]).hint).toMatch(/halfway/);
    expect(readiness(learned, RACES["5k"]).hint).not.toMatch(/fountain/);
  });

  it("loads an old save with Race IQ at 0 and no cup waiting", () => {
    const legacy = fresh();
    delete legacy.raceIq;
    delete legacy.calendar.coffeesToday;
    delete legacy.calendar.wifiToday;
    delete legacy.condition.coffeeNext;
    const loaded = deserialize(JSON.stringify(legacy));
    expect(loaded.raceIq).toBe(0);
    expect(loaded.calendar.coffeesToday).toBe(0);
    expect(loaded.calendar.wifiToday).toBe(false);
    expect(loaded.condition.coffeeNext).toBeNull();
    expect(loaded.version).toBe(1);

    const current = fresh();
    current.raceIq = 7.8;
    current.calendar.coffeesToday = 1;
    current.calendar.wifiToday = true;
    current.condition.coffeeNext = "boost";
    const round = deserialize(serialize(current));
    expect(round.raceIq).toBe(7);
    expect(round.calendar.coffeesToday).toBe(1);
    expect(round.calendar.wifiToday).toBe(true);
    expect(round.condition.coffeeNext).toBe("boost");
  });
});
