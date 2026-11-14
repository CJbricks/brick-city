/**
 * confetti.js
 * Falling squares after a race win.
 *
 * The motion is the celebration overlay from Marathon City:
 * src/components/game/CityView.js (the `bits` loop and the CONFETTI
 * colors) and the count in src/lib/rules.js (`raceDay.confetti`, 36).
 * There, confetti falls all day on a saved race date and is drawn in
 * screen pixels on top of the city, so the skyline texture is not
 * repainted.
 *
 * Brick City uses the same fall-and-wrap, but only for 30 seconds after
 * a 1st-place finish (including a boss duel). Ordinary finishes stay
 * quiet. The pieces are drawn by the town ticker, not by this file, so
 * tests can move the bits without starting Pixi.
 *
 * prefers-reduced-motion gets zero pieces. The win still counts. The
 * screen just does not shower.
 */

// Same six colors CityView.js uses for its confetti squares.
export const CONFETTI_COLORS = [0xfdd835, 0xd62828, 0xffffff, 0xf57c00, 0x43a047, 0x1e88e5];

// Marathon City's raceDay.confetti count. Enough to read as a shower,
// few enough that a phone GPU is not filling the screen with sprites.
export const CONFETTI_COUNT = 36;

export const CONFETTI_REDUCED_COUNT = 0;

// A win celebration, not an all-day parade. 30 seconds, then the ticker
// drops the array and clears the graphics so nothing is left running.
export const CONFETTI_MS = 30000;

export function pieceCount(reducedMotion) {
  return reducedMotion ? CONFETTI_REDUCED_COUNT : CONFETTI_COUNT;
}

/**
 * rng is injectable so a test can place every piece on purpose.
 * vy matches CityView: 0.8 to 2.2 pixels per frame.
 */
export function spawnPieces(count, width, height, rng = Math.random) {
  const bits = [];
  const across = Math.max(1, width);
  const down = Math.max(1, height);
  for (let i = 0; i < count; i += 1) {
    bits.push({
      x: rng() * across,
      y: rng() * down,
      vy: 0.8 + rng() * 1.4,
      c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    });
  }
  return bits;
}

/**
 * One frame of the Marathon City fall. y grows by vy, x wobbles with
 * sin(y), and a piece that leaves the bottom comes back at the top.
 * Wrapping is why the shower lasts the whole 30 seconds instead of
 * one pass. rng only picks the new x on a wrap.
 */
export function stepPieces(bits, width, height, rng = Math.random) {
  const across = Math.max(1, width);
  for (const bit of bits) {
    bit.y += bit.vy;
    bit.x += Math.sin(bit.y * 0.08) * 0.4;
    if (bit.y > height) {
      bit.y = -4;
      bit.x = rng() * across;
    }
  }
  return bits;
}
