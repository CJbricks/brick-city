/**
 * theory.test.js
 * Pitch names become frequencies. A4 is the reference. Sharps and flats
 * that name the same key are the same number. Drums are not pitches.
 */

import { describe, expect, it } from "vitest";
import { pitchToHz } from "@/game/audio/theory";

describe("pitches", () => {
  it("maps note names onto equal temperament", () => {
    expect(pitchToHz("A4")).toBeCloseTo(440, 5);
    expect(pitchToHz("A5")).toBeCloseTo(880, 5);
    expect(pitchToHz("C4")).toBeCloseTo(261.6256, 3);
    expect(pitchToHz("F#4")).toBeCloseTo(pitchToHz("Gb4"), 5);
    expect(pitchToHz("Bb4")).toBeCloseTo(466.164, 2);
  });

  it("does not invent a frequency for a drum or a typo", () => {
    expect(pitchToHz("kick")).toBeNull();
    expect(pitchToHz("snare")).toBeNull();
    expect(pitchToHz("hat")).toBeNull();
    expect(pitchToHz("H4")).toBeNull();
    expect(pitchToHz("C")).toBeNull();
  });
});