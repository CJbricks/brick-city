/**
 * pattern.js
 * The shorthand songs are written in.
 *
 * A token is PITCH.LENGTH. Length is in steps, and a step is one 16th
 * note when stepsPerBeat is 4. "E5.4" is an E for a quarter note.
 * "r.4" is a quarter rest. "|" is a bar line you can look at; the
 * parser ignores it. A bar in this game is 16 steps long.
 */

export function parsePattern(pattern) {
  const notes = [];
  let step = 0;
  const tokens = String(pattern).trim().split(/\s+/);
  for (const token of tokens) {
    if (!token || token === "|") continue;
    const dot = token.lastIndexOf(".");
    if (dot <= 0) {
      throw new Error(`Note "${token}" needs a length, like C5.4`);
    }
    const pitch = token.slice(0, dot);
    const length = Number(token.slice(dot + 1));
    if (!Number.isInteger(length) || length <= 0) {
      throw new Error(`Note "${token}" has a bad length`);
    }
    if (pitch !== "r" && pitch !== "R") {
      notes.push({ step, pitch, length });
    }
    step += length;
  }
  return { notes, steps: step };
}

export function repeat(pattern, times) {
  return new Array(times).fill(String(pattern).trim()).join(" ");
}

/**
 * Each string must be exactly one 4/4 bar (16 sixteenths). Checking it
 * here means a dropped note fails as soon as the song file loads,
 * instead of drifting the drums off the melody.
 */
export function bars(lines) {
  lines.forEach((line, index) => {
    const { steps } = parsePattern(line);
    if (steps !== 16) {
      throw new Error(`Bar ${index + 1} is ${steps} steps, not 16: ${line}`);
    }
  });
  return lines.map((line) => line.trim()).join(" ");
}
