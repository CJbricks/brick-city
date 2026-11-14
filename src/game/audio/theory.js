/**
 * theory.js
 * Pitch names, duties, and the seconds-per-step math the songs share.
 *
 * A song never stores a frequency. It stores a name like "C5" or "kick".
 * This file is the only place that turns a name into a Hertz value, so a
 * new song can stay readable.
 */

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Game Boy pulse duties. 75% is the upside-down twin of 25% and sounds
// the same, but it is still a legal channel setting, so songs may use it.
export const PULSE_DUTIES = [0.125, 0.25, 0.5, 0.75];

export const NOISE_HITS = ["kick", "snare", "hat"];

export function isNoiseHit(pitch) {
  return NOISE_HITS.includes(pitch);
}

/**
 * A4 is 440. Each semitone is the twelfth root of two. "C#4" and "Db4"
 * are the same pitch, written whichever way reads better in the key.
 * Noise hits are not pitches, so they come back null.
 */
export function pitchToHz(pitch) {
  if (isNoiseHit(pitch)) return null;
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(pitch);
  if (!match) return null;
  let semi = SEMI[match[1]];
  if (match[2] === "#") semi += 1;
  if (match[2] === "b") semi -= 1;
  const midi = (Number(match[3]) + 1) * 12 + semi;
  return 440 * 2 ** ((midi - 69) / 12);
}

export function secondsPerStep(song) {
  return 60 / song.bpm / song.stepsPerBeat;
}

export function songDuration(song) {
  return song.length * secondsPerStep(song);
}
