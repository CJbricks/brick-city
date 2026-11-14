/**
 * scheduler.test.js
 * The clock math, without an AudioContext. A note on the boundary of a
 * window belongs to the later window, an intro plays once, and a loop
 * note keeps coming back on time.
 */

import { describe, expect, it } from "vitest";
import { notesInRange } from "@/game/audio/scheduler";
import { secondsPerStep } from "@/game/audio/theory";

function song(overrides = {}) {
  return {
    id: "tiny",
    bpm: 120,
    stepsPerBeat: 4,
    loop: true,
    loopStart: 4,
    length: 8,
    channels: [
      {
        id: "pulse1",
        kind: "pulse",
        duty: 0.5,
        volume: 0.2,
        envelope: "pluck",
        notes: [
          { step: 0, pitch: "C4", length: 2 },
          { step: 4, pitch: "E4", length: 2 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("note scheduler", () => {
  it("uses a 16th-note step at the song tempo", () => {
    expect(secondsPerStep(song())).toBeCloseTo(0.125, 6);
  });

  it("plays an intro note once and a loop note on every pass", () => {
    const tune = song();
    const step = secondsPerStep(tune);
    const first = notesInRange(tune, 0, 8 * step);
    const pitches = first.map((event) => `${event.pitch}@${event.time.toFixed(3)}`);
    expect(pitches.filter((item) => item.startsWith("C4"))).toHaveLength(1);
    expect(pitches.filter((item) => item.startsWith("E4"))).toHaveLength(1);

    const secondPass = notesInRange(tune, 8 * step, 12 * step);
    expect(secondPass.map((event) => event.pitch)).toEqual(["E4"]);
    expect(secondPass[0].time).toBeCloseTo(8 * step, 6);
  });

  it("does not schedule the same note in two adjacent windows", () => {
    const tune = song();
    const step = secondsPerStep(tune);
    const seen = new Set();
    for (let index = 0; index < 20; index += 1) {
      const from = index * step;
      const events = notesInRange(tune, from, from + step);
      for (const event of events) {
        const key = `${event.pitch}:${event.time}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("does not repeat a one-shot fanfare", () => {
    const fanfare = song({
      id: "victory",
      loop: false,
      loopStart: 0,
      length: 4,
      channels: [
        {
          id: "pulse1",
          kind: "pulse",
          notes: [{ step: 0, pitch: "C5", length: 4 }],
        },
      ],
    });
    const step = secondsPerStep(fanfare);
    expect(notesInRange(fanfare, 0, step * 4).map((event) => event.pitch)).toEqual(["C5"]);
    expect(notesInRange(fanfare, step * 4, step * 12)).toEqual([]);
  });

  it("places a note at step times its step length", () => {
    const tune = song({ loop: false, loopStart: 0, length: 8 });
    const step = secondsPerStep(tune);
    const events = notesInRange(tune, 0, 1);
    expect(events[0].time).toBeCloseTo(0, 6);
    expect(events[0].duration).toBeCloseTo(2 * step, 6);
    expect(events[1].time).toBeCloseTo(4 * step, 6);
  });
});
