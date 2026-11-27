/**
 * art.js
 * All of Brick City's pixels are drawn here, from scratch. Nothing is
 * traced from a Nintendo or Game Freak sprite, and nothing is loaded
 * from a PNG. Runners, tiles, buildings, the brick logo, and the
 * title-screen wave are functions, so a color tweak is a palette change
 * instead of a new file. A shoe sponsor swaps the cap, jacket, and shorts
 * through runnerPalette. A gear sponsor does not recolor the clothes.
 * It tints the belt or vest (letter v) with one brand color, and only
 * when that brand's item is on. The drawing stays the same. Only the
 * colors change. There is no logo on the clothes or on the carry item.
 *
 * v2 is 32×32 tiles and 32×40 runner frames (v1 was 16×16 and 16×20).
 * Canvases are still painted at 1x: one rectangle = one pixel. Pixi and
 * CSS scale them with nearest-neighbor filtering. That is what keeps the
 * edges crisp instead of blurry.
 *
 * Town look comes from townThemes.js. renderWorld sets activeTheme from
 * the current map id. Brick City keeps the original lawn and building
 * drawers. Ridgeview swaps alpine grass, conifers, Chamonix chalets,
 * and Auburn false-front shops — same door pixels, different paint.
 * See "Town themes and palettes" in docs/NOTES.md.
 *
 * The blue-striped "BC" post is the town welcome sign. town.js lists
 * exactly one, beside Home. The HOME / GROCERY / GYM boards (and PARK,
 * TRACK, MOUNTAIN, DEPOT) are a different picture: they name that
 * building, they do not say the city motto, and they do not block a tile.
 *
 * sceneryLayout() is the list of those boards and every wooden fence.
 * renderWorld paints fences first and boards after, and the rectangles
 * do not share a tile. The 5K board used to sit under the west rail of
 * the track, which also hid the gate onto the oval.
 *
 * Gold mats are not a second map. paintActivationPads reads
 * activationTiles() from town.js, which is the same grid A checks.
 * A mat is only drawn where you can stand and press A.
 *
 * The activity board is an original kiosk: a cedar post, a plywood
 * face, and three painted stripes for the three neighborhood runs.
 * It is not a badge, a logo, or a sign copied from another game.
 * sceneryLayout owns its rectangle so the picture stays on the post.
 *
 * Tile and prop detail (garden beds, shed, scarecrow, planters, benches,
 * mailboxes, bike racks) is also original fillRect art. Solid footprints
 * live in LANDMARKS in town.js so collision and paint stay on the same
 * tiles. Pure decoration (a mailbox beside a door, a bench under a cafe
 * window) is drawn inside the building rectangle and does not block a
 * tile. See "Tile and prop detail" in docs/NOTES.md.
 *
 * Runner letters (the pictures are drawn as text so the outline is easy
 * to see in the source):
 *   o outline   C cap   P panel   B brim   H hair
 *   s skin      Q cheek w eye-white  z highlight  e pupil  m mouth
 *   N collar    T shirt R stripe     D shorts
 *   k shoe      L lace  l sole
 * Light and dark letters (p, c, u, t, d, K) are the same part, just the
 * lit edge and the shaded edge. That is the 3-tone shading.
 */

import { ACTIVITY_BOARD, BUILDINGS, CITY_SIGNS, COLS, LANDMARKS, ROWS, TILE, activationTiles, buildActiveWorld, buildWorld } from "@/game/town";
import { townLights } from "@/lib/lighting";
import { applyBrandOutfit, gearTint, hatColors } from "@/game/brandColors";
import { BRICK_CITY_THEME, themeFor } from "@/game/townThemes";

/** Set once per renderWorld so tile and building drawers share one look. */
let activeTheme = BRICK_CITY_THEME;
import { hatById } from "@/lib/catalog";
import { sponsoredCarry } from "@/lib/sponsors";

export const RUNNER_W = 32;
export const RUNNER_H = 40;
export const RUNNER_FRAMES = 12;

export const PALETTES = {
  male: {
    cap: "#e23b3b",
    panel: "#f4f7fb",
    hair: "#2a2140",
    skin: "#f3c7a4",
    eye: "#1c1c1c",
    mouth: "#d06558",
    shirt: "#f7f7f7",
    stripe: "#d23b3b",
    trim: "#2c4f8f",
    shorts: "#24366b",
    shoe: "#f7f7f7",
    sole: "#c0392b",
    lace: "#e23b3b",
  },
  female: {
    cap: "#2aa6a0",
    panel: "#2aa6a0",
    hair: "#24182f",
    skin: "#f3c7a4",
    eye: "#1c1c1c",
    mouth: "#d06558",
    shirt: "#e15b4c",
    stripe: "#e15b4c",
    trim: "#f6d3c4",
    shorts: "#242424",
    shoe: "#f7f7f7",
    sole: "#14988e",
    lace: "#2aa6a0",
  },
  rival: {
    cap: "#f2c14e",
    panel: "#fff4c2",
    hair: "#3a2418",
    skin: "#e8b48a",
    eye: "#1c1c1c",
    mouth: "#c45b4a",
    shirt: "#3d9a4a",
    stripe: "#f2f2f2",
    trim: "#214e28",
    shorts: "#1c1c1c",
    shoe: "#f7f7f7",
    sole: "#f2c14e",
    lace: "#3d9a4a",
  },
  ranger: {
    cap: "#8a5a32",
    panel: "#c4a06a",
    hair: "#3a2418",
    skin: "#e8b48a",
    eye: "#1c1c1c",
    mouth: "#c45b4a",
    shirt: "#6d7c3e",
    stripe: "#c4a06a",
    trim: "#3e4a22",
    shorts: "#c2a36b",
    shoe: "#6b4a32",
    sole: "#3a2418",
    lace: "#c4a06a",
  },
  jogger: {
    cap: "#e56aa0",
    panel: "#e56aa0",
    hair: "#24182f",
    skin: "#f3c7a4",
    eye: "#1c1c1c",
    mouth: "#d06558",
    shirt: "#f7f7f7",
    stripe: "#e56aa0",
    trim: "#f6d3c4",
    shorts: "#2a4f8f",
    shoe: "#f7f7f7",
    sole: "#e56aa0",
    lace: "#2a4f8f",
  },
  coach: {
    cap: "#f4f4f4",
    panel: "#24366b",
    hair: "#3a2418",
    skin: "#e0b090",
    eye: "#1c1c1c",
    mouth: "#c45b4a",
    shirt: "#24366b",
    stripe: "#f2c14e",
    trim: "#f4f4f4",
    shorts: "#5c6168",
    shoe: "#f7f7f7",
    sole: "#24366b",
    lace: "#f2c14e",
  },
};

const MINI = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  K: ["101", "110", "100", "110", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["110", "101", "101", "101", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "010"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  Y: ["101", "101", "010", "010", "010"],
  "5": ["111", "100", "111", "001", "111"],
  " ": ["000", "000", "000", "000", "000"],
};

const OUTLINE = "#1c140f";

function ink(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  const channel = (value) => Math.max(0, Math.min(255, value | 0)).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mix(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  return rgbToHex(
    pa[0] + (pb[0] - pa[0]) * t,
    pa[1] + (pb[1] - pa[1]) * t,
    pa[2] + (pb[2] - pa[2]) * t,
  );
}

function tones(hex) {
  return {
    light: mix(hex, "#fff8ea", 0.46),
    base: hex,
    dark: mix(hex, "#1c140f", 0.42),
  };
}

function paintMap(pal) {
  const cap = tones(pal.cap);
  const shirt = tones(pal.shirt);
  const skin = tones(pal.skin);
  const hair = tones(pal.hair);
  const shorts = tones(pal.shorts);
  const shoe = tones(pal.shoe);
  const sole = tones(pal.sole);
  const panel = pal.panel.toLowerCase() === pal.cap.toLowerCase() ? cap.light : pal.panel;
  return {
    o: OUTLINE,
    C: cap.base,
    c: cap.dark,
    p: cap.light,
    P: panel,
    B: cap.dark,
    H: hair.base,
    h: hair.light,
    s: skin.base,
    S: skin.dark,
    q: skin.light,
    Q: mix(pal.skin, pal.mouth, 0.45),
    w: "#f7fbff",
    z: "#ffffff",
    e: pal.eye,
    m: pal.mouth,
    N: pal.trim,
    T: shirt.base,
    t: shirt.dark,
    u: shirt.light,
    R: pal.stripe,
    D: shorts.base,
    d: shorts.dark,
    k: shoe.base,
    K: shoe.dark,
    L: pal.lace,
    l: sole.base,
    f: sole.dark,
    // Belt or vest. Missing means those pixels are not drawn, so a
    // runner with no sponsored carry item keeps the plain shirt.
    v: pal.carry,
  };
}

function shirtXs(chars) {
  const xs = [];
  chars.forEach((ch, x) => {
    if (ch === "T" || ch === "t" || ch === "u" || ch === "R") xs.push(x);
  });
  return xs;
}

function dyeShirtRow(rows, y) {
  if (!rows[y]) return;
  const chars = rows[y].split("");
  const xs = shirtXs(chars);
  if (xs.length < 3) return;
  // Leave the outer shirt pixel. It is the edge of the torso, and
  // painting it makes the belt look wider than the body.
  for (let i = 1; i < xs.length - 1; i += 1) chars[xs[i]] = "v";
  rows[y] = chars.join("");
}

function dyeStraps(rows, y) {
  if (!rows[y]) return;
  const chars = rows[y].split("");
  const xs = shirtXs(chars);
  if (xs.length < 6) return;
  chars[xs[1]] = "v";
  chars[xs[2]] = "v";
  chars[xs[xs.length - 3]] = "v";
  chars[xs[xs.length - 2]] = "v";
  rows[y] = chars.join("");
}

/**
 * A belt is the waist row. A vest adds two straps on the chest.
 * Letter v is the gear-sponsor tint. No wordmark, no logo shape.
 */
function stampCarry(rows, kind, band) {
  if ((kind !== "belt" && kind !== "vest") || !band) return;
  dyeShirtRow(rows, band.waist);
  if (kind !== "vest") return;
  for (let y = band.chestTop; y <= band.chestBottom; y += 1) dyeStraps(rows, y);
}

function newRows(height) {
  return Array.from({ length: height }, () => ".".repeat(RUNNER_W));
}

function stamp(rows, x, y, body) {
  if (y < 0 || y >= rows.length || !body) return;
  const chars = rows[y].split("");
  for (let i = 0; i < body.length; i += 1) {
    const xx = x + i;
    if (xx < 0 || xx >= RUNNER_W) continue;
    if (body[i] !== ".") chars[xx] = body[i];
  }
  rows[y] = chars.join("");
}

function stampBlock(rows, x, y, lines) {
  lines.forEach((line, index) => stamp(rows, x, y + index, line));
}

function writeCentered(rows, y, body) {
  const pad = Math.max(0, RUNNER_W - body.length);
  stamp(rows, Math.floor(pad / 2), y, body);
}

/**
 * The walk is four frames: idle, strideA, idle, strideB.
 * Frame 0 and frame 2 share the idle drawing. Stride A (frame 1) puts
 * the screen-left leg forward. Stride B (frame 3) swaps them. The whole
 * body then lifts one pixel on the stride frames so the step has weight.
 * phase 1 / -1 is that left-forward / right-forward choice.
 */
function phaseOf(frame) {
  const cycle = ((frame % 4) + 4) % 4;
  if (cycle === 1) return 1;
  if (cycle === 3) return -1;
  return 0;
}

function plantFeet(rows) {
  let lowest = 0;
  rows.forEach((line, y) => {
    if ([...line].some((ch) => ch !== ".")) lowest = y;
  });
  const shift = rows.length - 2 - lowest;
  if (shift === 0) return rows;
  const next = newRows(rows.length);
  rows.forEach((line, y) => {
    const ny = y + shift;
    if (ny >= 0 && ny < rows.length) next[ny] = line;
  });
  return next;
}

function applyBob(rows, bob) {
  if (!bob) return rows;
  const next = newRows(rows.length);
  rows.forEach((line, y) => {
    const ny = y + bob;
    if (ny >= 0 && ny < rows.length) next[ny] = line;
  });
  return next;
}

function stampArm(rows, x, top, reach) {
  const len = reach > 0 ? 8 : reach < 0 ? 5 : 6;
  const y0 = top + (reach > 0 ? 1 : reach < 0 ? -1 : 0);
  for (let i = 0; i < len; i += 1) {
    const hand = i >= len - 2;
    const cuff = i === len - 3;
    const mid = hand ? "s" : cuff ? "N" : i === 1 ? "u" : "T";
    stamp(rows, x, y0 + i, `o${mid}${i > len - 4 ? "t" : "T"}o`);
  }
  stamp(rows, x, y0 + len, "oooo");
}

function stampShoe(rows, x, y) {
  stamp(rows, x, y, "okkkkko");
  stamp(rows, x, y + 1, "oKLLKKo");
  stamp(rows, x, y + 2, "olllllo");
  stamp(rows, x, y + 3, "offfffo");
  stamp(rows, x, y + 4, "ooooooo");
}

function stampLeg(rows, x, y, forward) {
  const len = forward ? 5 : 4;
  const y0 = y + (forward ? 1 : 0);
  const x0 = x + (forward ? -1 : 0);
  for (let i = 0; i < len; i += 1) stamp(rows, x0 + 1, y0 + i, i === 0 ? "oso" : "oso");
  stampShoe(rows, x0, y0 + len - 1);
}

function stampLegs(rows, y, phase) {
  const leftForward = phase === 1;
  const rightForward = phase === -1;
  stampLeg(rows, 8, y + (rightForward ? -1 : 0), leftForward);
  stampLeg(rows, 17, y + (leftForward ? -1 : 0), rightForward);
}

function stampPonytail(rows, pose, y) {
  if (pose === "up") {
    stampBlock(rows, 13, y + 8, ["oHHHHo", "oHHHHo", "ohHHHho", ".oHHHo", "..oHHo", "...oHo"]);
    return;
  }
  if (pose === "side") {
    stampBlock(rows, 2, y + 6, ["oHHHo", "oHHHHo", ".oHHHo", "..oHHo", "...oHo", "....oH"]);
    return;
  }
  // Hangs off the right side of the head, the way the concept sheet draws it.
  stampBlock(rows, 22, y + 5, ["oHHo", "oHHHo", "ohHHo", ".oHHo", "..oHo", "...oH"]);
}

function frontBody(rows, y0) {
  // Each string is centered on the 32px frame. The eyes are two 4px
  // whites with a pupil and a one-pixel highlight, under a brim, not a
  // solid hair bar (that read as a unibrow).
  const lines = [
    [0, "opCCCCCCCCco"],
    [1, "opCCCCCCCCCCco"],
    [2, "oCCPPPPPPPPCCCo"],
    [3, "oCCPPPPPPPPCCCo"],
    [4, "ooCCCCCCCCCCCCoo"],
    [5, "oBBBBBBBBBBBBBBBBo"],
    [6, "oooooooooooooooooo"],
    [7, "oHHssssssssssssHHo"],
    [8, "osssssssssssssssso"],
    [9, "osswweessswweessso"],
    [10, "osswzeessswzeessso"],
    [11, "ossseeeessseeeesso"],
    [12, "osssssssssssssssso"],
    [13, "osQsssmmmmsssQsso"],
    [14, "oossssssssssssssoo"],
    [15, "oNNTTTTTTTTTTTTNNo"],
    [16, "ouTTTTTTTTTTTTTTto"],
    [17, "oTTTTTRRRRRRRTTTTTo"],
    [18, "oTTTTTTTTTTTTTTTTTo"],
    [19, "otTTTTTTTTTTTTTTTto"],
    [20, "ooTTTTTTTTTTTTTToo"],
    [21, "ouDDDDDDDDDDDDDDto"],
    [22, "oDDDDDDDDDDDDDDDDo"],
    [23, "oDddddddddddddddDo"],
    [24, "odDDDDDDDDDDDDDDto"],
  ];
  for (const [dy, body] of lines) writeCentered(rows, y0 + dy, body);
}

function buildFront(frame, gender, { wave = false, height = RUNNER_H, y0 = 2, carryKind = null } = {}) {
  const phase = wave ? 0 : phaseOf(frame);
  const rows = newRows(height);
  const armY = y0 + 16;
  // Arms go down first. The shirt is stamped after them so it covers the
  // inner outline and the sleeves look attached instead of floating.
  if (!wave) {
    const leftReach = phase === 1 ? -1 : phase === -1 ? 1 : 0;
    const rightReach = -leftReach;
    stampArm(rows, 5 + (leftReach > 0 ? -1 : 0), armY, leftReach);
    stampArm(rows, 23 + (rightReach > 0 ? 1 : 0), armY, rightReach);
  } else {
    stampArm(rows, 5, armY, 0);
  }
  frontBody(rows, y0);
  if (wave) {
    // Drawn after the body so the shirt does not erase it. The hand sits
    // above the cap and bobs between the two title frames.
    const lift = frame % 2 === 0 ? 0 : -3;
    const top = y0 + lift;
    stampBlock(rows, 21, top, [
      "oooooo",
      "osssso",
      "osssso",
      "oooooo",
    ]);
    for (let i = 0; i < 8; i += 1) stamp(rows, 22, top + 4 + i, "oTTo");
    stamp(rows, 22, top + 8, "oNNo");
  }
  stampLegs(rows, y0 + 24, phase);
  if (gender === "female") stampPonytail(rows, "down", y0);
  // After the shirt, before the feet are planted, so the belt stays on
  // the waist when the whole body shifts down to the frame.
  stampCarry(rows, carryKind, { waist: y0 + 20, chestTop: y0 + 16, chestBottom: y0 + 19 });
  return applyBob(plantFeet(rows), wave ? 0 : phase === 0 ? 0 : -1);
}

function buildUp(frame, gender, carryKind) {
  const phase = phaseOf(frame);
  const rows = newRows(RUNNER_H);
  const leftReach = phase === 1 ? -1 : phase === -1 ? 1 : 0;
  stampArm(rows, 5, 16, leftReach);
  stampArm(rows, 23, 16, -leftReach);
  const lines = [
    [0, "opCCCCCCCCco"],
    [1, "opCCCCCCCCCCco"],
    [2, "oCCCCCCCCCCCCCCo"],
    [3, "oCCPPPPPPPPPPCCCo"],
    [4, "ooCCCCCCCCCCCCoo"],
    [5, "oBBBBBBBBBBBBBBBo"],
    [6, "ohHHHHHHHHHHHHHhc"],
    [7, "oHHHHHHHHHHHHHHHHo"],
    [8, "oHHHHHHHHHHHHHHHHo"],
    [9, "ohHHHHHHHHHHHHHHho"],
    [10, "ooHHHHHHHHHHHHHoo"],
    [13, "oNNTTTTTTTTTTTTNNo"],
    [14, "ouTTTTTTTTTTTTTTto"],
    [15, "oTTTTTRRRRRRRTTTTTo"],
    [16, "oTTTTTTTTTTTTTTTTTo"],
    [17, "otTTTTTTTTTTTTTTTto"],
    [18, "ooTTTTTTTTTTTTTToo"],
    [19, "ouDDDDDDDDDDDDDDto"],
    [20, "oDDDDDDDDDDDDDDDDo"],
    [21, "oDddddddddddddddDo"],
    [22, "odDDDDDDDDDDDDDDto"],
  ];
  for (const [dy, body] of lines) writeCentered(rows, 2 + dy, body);
  stampLegs(rows, 24, phase);
  if (gender === "female") stampPonytail(rows, "up", 2);
  stampCarry(rows, carryKind, { waist: 20, chestTop: 16, chestBottom: 19 });
  return applyBob(plantFeet(rows), phase === 0 ? 0 : -1);
}

function buildSide(frame, gender, carryKind) {
  const phase = phaseOf(frame);
  const rows = newRows(RUNNER_H);
  const y0 = 4;
  stampBlock(rows, 12, y0, [
    ".opCCCCco",
    "opCCCCCCCco",
    "oCCPPPPCCCo",
    "oCCCCCCCCCoo",
    "oBBBBBBBBBBco",
    "ohHHHHHHHhc",
    "osssssssso",
    "osswzeeesso",
    "ossseeeesso",
    "osssmmssso",
    "oossssssoo",
    ".oNTTTTo",
    "ouTTTTTTTto",
    "oTTTRRRTTTo",
    "oTTTTTTTTTo",
    "otTTTTTTTto",
    ".oDDDDDDo",
    ".oDDDDDDo",
    ".odddddo",
    ".oDDDDDo",
  ]);
  // Near leg (screen-right) and far leg. phase 1 steps forward, phase -1 back.
  if (phase === 0) {
    stampBlock(rows, 13, y0 + 20, ["oso", "oso", "oso", "oso"]);
    stampShoe(rows, 12, y0 + 23);
    stampBlock(rows, 18, y0 + 20, ["oso", "oso", "oso"]);
    stampShoe(rows, 17, y0 + 22);
  } else if (phase === 1) {
    stampBlock(rows, 12, y0 + 19, ["oso", "oso", "oso"]);
    stampShoe(rows, 11, y0 + 21);
    stampBlock(rows, 18, y0 + 20, ["oso", "oso", "oso", "oso"]);
    stampShoe(rows, 19, y0 + 23);
  } else {
    stampBlock(rows, 18, y0 + 19, ["oso", "oso", "oso"]);
    stampShoe(rows, 17, y0 + 21);
    stampBlock(rows, 10, y0 + 20, ["oso", "oso", "oso", "oso"]);
    stampShoe(rows, 8, y0 + 23);
  }
  const armReach = phase === 1 ? 1 : phase === -1 ? -1 : 0;
  stampArm(rows, 11, y0 + 12, armReach);
  if (gender === "female") stampPonytail(rows, "side", y0);
  // Last shirt row of the side body is the waist. The three rows above
  // it are the chest, where a vest's straps sit.
  stampCarry(rows, carryKind, { waist: y0 + 15, chestTop: y0 + 12, chestBottom: y0 + 14 });
  return applyBob(plantFeet(rows), phase === 0 ? 0 : -1);
}

function buildRunnerRows(pose, frame, gender, carryKind) {
  if (pose === "wave") return buildFront(frame, gender, { wave: true, height: 48, y0: 10, carryKind });
  if (pose === "up") return buildUp(frame, gender, carryKind);
  if (pose === "side") return buildSide(frame, gender, carryKind);
  return buildFront(frame, gender, { carryKind });
}

function resolvePalette(palette, gender) {
  if (palette && typeof palette === "object") return palette;
  if (typeof palette === "string" && PALETTES[palette]) return PALETTES[palette];
  return PALETTES[gender] || PALETTES.male;
}

/**
 * Default clothes, unless a shoe sponsor is on the save. The same object
 * is what the walk sheet, the HUD portrait, and the title wave paint, so
 * a new deal recolors every frame at once. Nutrition sponsors do not
 * change clothes. A gear tint is a separate field: carry and carryKind.
 * It does not replace the shirt color. The v pixels read it.
 */
export function runnerPalette(gender, sponsorId, carry, hat) {
  const base = PALETTES[gender === "female" ? "female" : "male"] || PALETTES.male;
  // Copy before a hat recolor. applyBrandOutfit returns the original
  // object when there is no shoe deal, and that object is the shared
  // male or female palette. Editing it would recolor every runner.
  let painted = { ...applyBrandOutfit(base, sponsorId) };
  if (hat?.color) {
    painted = { ...painted, cap: hat.color, panel: hat.panel || hat.color };
  }
  if (!carry?.carry) return painted;
  return { ...painted, carry: carry.carry, carryKind: carry.carryKind || "belt" };
}

/**
 * Shoe sponsor on the clothes, gear sponsor on the belt or vest.
 * The tint is looked up from the deal id. It is not stored in the save.
 * Wearing a different brand's item leaves the shirt alone.
 */
export function runnerLook(state) {
  const worn = sponsoredCarry(state);
  const tint = worn ? gearTint(worn.id) : null;
  const carry = tint ? { carry: tint, carryKind: worn.kind } : null;
  // The cap pixels are the running hat when one is equipped. The shoe
  // sponsor still owns the shirt. No logo is drawn, only the brand color.
  const hatItem = hatById(state?.gear?.hat);
  const hat = hatItem ? hatColors(hatItem.colorKey) : null;
  return runnerPalette(state?.runner?.gender, state?.sponsors?.shoe || null, carry, hat);
}

function blitRows(ctx, ox, oy, rows, palette, gender) {
  const colors = paintMap(resolvePalette(palette, gender));
  for (let y = 0; y < rows.length; y += 1) {
    const line = rows[y];
    for (let x = 0; x < line.length; x += 1) {
      const color = colors[line[x]];
      if (!color) continue;
      ink(ctx, ox + x, oy + y, 1, 1, color);
    }
  }
}

/**
 * One runner frame, 32 by 40 (the wave pose is taller). pose is "down",
 * "up", or "side". The side pose faces right; the overworld flips the
 * sprite for left. frame 0 and 2 are idle, 1 is stride A, 3 is stride B.
 */
export function drawRunnerSprite(ctx, ox, oy, pose, frame, palette, gender) {
  const pal = resolvePalette(palette, gender);
  blitRows(ctx, ox, oy, buildRunnerRows(pose, frame, gender, pal.carryKind), pal, gender);
}

/** Twelve frames: 4 down, 4 up, 4 side. Each four is idle, strideA, idle, strideB. */
export function makeRunnerSheet(palette, gender) {
  const canvas = document.createElement("canvas");
  canvas.width = RUNNER_W * RUNNER_FRAMES;
  canvas.height = RUNNER_H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const poses = ["down", "up", "side"];
  poses.forEach((pose, poseIndex) => {
    for (let frame = 0; frame < 4; frame += 1) {
      drawRunnerSprite(ctx, (poseIndex * 4 + frame) * RUNNER_W, 0, pose, frame, palette, gender);
    }
  });
  return canvas;
}

/**
 * Title-screen runner. Same outlined body as the overworld sprite, with
 * one arm up. Frame 1 lifts the hand so the wave reads at a glance.
 * The 3× blow-up is still nearest-neighbor: we draw the tiny picture
 * first, then scale that canvas, so the blocks stay square.
 */
export function paintWave(canvas, gender, frame, palette) {
  const scale = 3;
  const pal = resolvePalette(palette, gender);
  const rows = buildRunnerRows("wave", frame, gender, pal.carryKind);
  const tiny = document.createElement("canvas");
  tiny.width = RUNNER_W;
  tiny.height = rows.length;
  const tinyCtx = tiny.getContext("2d");
  tinyCtx.imageSmoothingEnabled = false;
  blitRows(tinyCtx, 0, 0, rows, palette || gender, gender);
  canvas.width = RUNNER_W * scale;
  canvas.height = rows.length * scale;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, canvas.width, canvas.height);
}

const GLYPHS = {
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
};

function wordCells(word) {
  const cells = [];
  let cursor = 0;
  for (const letter of word) {
    const glyph = GLYPHS[letter];
    glyph.forEach((glyphRow, y) => {
      [...glyphRow].forEach((bit, x) => {
        if (bit === "1") cells.push([cursor + x, y]);
      });
    });
    cursor += 6;
  }
  return { cells, width: cursor - 1 };
}

function paintBrickCell(ctx, x, y, size) {
  ink(ctx, x, y, size, size, "#c44732");
  ink(ctx, x, y, size, 1, "#f0d7b8");
  ink(ctx, x, y, 1, size, "#f0d7b8");
  ink(ctx, x + 1, y + size - 2, size - 2, 1, "#8d2e22");
  if (size > 4) ink(ctx, x + 2, y + 2, Math.max(1, size - 4), 1, "#e07a5f");
}

/**
 * Stacked BRICK / CITY. Each letter pixel is a tiny brick, then a blue
 * outline is stamped around the whole word. Straight baseline, not an arch.
 */
export function paintLogo(canvas) {
  const cell = 7;
  const brick = wordCells("BRICK");
  const city = wordCells("CITY");
  const pad = cell;
  const rowH = 7 * cell;
  const gap = cell + 2;
  const width = Math.max(brick.width, city.width) * cell + pad * 2;
  canvas.width = width;
  canvas.height = rowH * 2 + gap + pad * 2;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawBrickWord(ctx, brick, (width - brick.width * cell) / 2, pad, cell);
  drawBrickWord(ctx, city, (width - city.width * cell) / 2, pad + rowH + gap, cell);
}

function drawBrickWord(ctx, word, originX, originY, cell) {
  const set = new Set(word.cells.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of word.cells) {
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (set.has(`${x + ox},${y + oy}`)) continue;
        ink(ctx, originX + (x + ox) * cell, originY + (y + oy) * cell, cell, cell, "#1d4ed8");
      }
    }
  }
  for (const [x, y] of word.cells) {
    paintBrickCell(ctx, originX + x * cell, originY + y * cell, cell);
  }
}

export function paintMiniText(ctx, text, x, y, color, scale = 1) {
  let cursor = 0;
  const pixels = text.toUpperCase();
  for (const ch of pixels) {
    const glyph = MINI[ch] || MINI[" "];
    glyph.forEach((glyphRow, yy) => {
      [...glyphRow].forEach((bit, xx) => {
        if (bit === "1") ink(ctx, x + (cursor + xx) * scale, y + yy * scale, scale, scale, color);
      });
    });
    cursor += 4;
  }
  return cursor * scale;
}

function paintOutlinedText(ctx, text, x, y, color, scale = 1) {
  // One source pixel of shadow, not `scale` pixels. A 2px shadow on a
  // 2× letter turns HOME into a black rectangle.
  paintMiniText(ctx, text, x + 1, y + 1, "#6b4428", scale);
  return paintMiniText(ctx, text, x, y, color, scale);
}

function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function drawFlower(ctx, x, y, salt) {
  const colors = ["#f4f6ef", "#f2c14e", "#e56aa0", "#7ec8ea", "#e15b4c"];
  const color = colors[salt % colors.length];
  ink(ctx, x, y + 2, 1, 3, "#245c22");
  ink(ctx, x - 1, y, 3, 2, OUTLINE);
  ink(ctx, x, y - 1, 1, 2, color);
  ink(ctx, x - 1, y, 1, 1, color);
  ink(ctx, x + 1, y, 1, 1, color);
  ink(ctx, x, y + 1, 1, 1, "#fff4c2");
}

function drawDeepGrass(ctx, px, py, x, y) {
  // Darker and taller than the town lawn, so a step reads as wild grass
  // the way a handheld RPG's tall grass does. These pixels are original.
  // They are not a copy of any other game's grass tile.
  const theme = activeTheme;
  const n = hash(x, y);
  const base = (x + y) % 2 === 0 ? theme.deepGrassA : theme.deepGrassB;
  ink(ctx, px, py, TILE, TILE, base);
  const blades = [[3, 4], [9, 12], [16, 6], [24, 14], [7, 20], [20, 22], [13, 8]];
  blades.forEach(([bx, by], index) => {
    const height = 9 + (index % 3) * 2;
    ink(ctx, px + bx, py + by, 2, height, theme.deepBlade);
    ink(ctx, px + bx, py + by, 1, height - 3, theme.deepLit);
    if (index % 2 === 0) ink(ctx, px + bx + 2, py + by + 3, 1, height - 4, theme.deepShade);
  });
  if (n % 3 === 0) ink(ctx, px + 8, py + 5, 2, 2, theme.deepSeedA);
  if (n % 4 === 0) ink(ctx, px + 22, py + 16, 2, 2, theme.deepSeedB);
}

function drawGrass(ctx, px, py, x, y) {
  const theme = activeTheme;
  const n = hash(x, y);
  // Ridgeview: cooler alpine base, with golden meadow patches by salt.
  let base = (x + y) % 2 === 0 ? theme.grassA : theme.grassB;
  if (theme.id === "ridgeview" && n % 7 === 0) base = "#c4a24a";
  if (theme.id === "ridgeview" && n % 11 === 0) base = "#b87838";
  ink(ctx, px, py, TILE, TILE, base);
  ink(ctx, px + (n % 18), py + ((n >>> 3) % 16), 4, 2, theme.grassLit);
  ink(ctx, px + ((n >>> 6) % 20), py + ((n >>> 9) % 18), 3, 2, theme.grassShade);
  const blades = [[3, 7], [12, 20], [22, 8], [8, 26], [26, 18]];
  blades.forEach(([bx, by], index) => {
    if ((n >>> index) & 1) return;
    ink(ctx, px + bx, py + by, 1, 3, theme.grassBlade);
    ink(ctx, px + bx + 1, py + by + 1, 1, 2, theme.grassTip);
  });
  if (n % 6 === 0) drawFlower(ctx, px + 8 + (n % 10), py + 8 + ((n >>> 4) % 12), n);
  if (n % 9 === 0) drawFlower(ctx, px + 18, py + 22, n >>> 2);
}

function drawFlowerBed(ctx, px, py, x, y) {
  drawGrass(ctx, px, py, x, y);
  drawFlower(ctx, px + 8, py + 10, x + y);
  drawFlower(ctx, px + 18, py + 8, x * 2 + y);
  drawFlower(ctx, px + 14, py + 20, x + y * 3);
  drawFlower(ctx, px + 24, py + 16, y + 4);
}

function isRoad(code) {
  return code === "r" || code === "x";
}

function drawRoad(ctx, px, py, x, y, ground) {
  const n = hash(x, y);
  ink(ctx, px, py, TILE, TILE, "#7d858e");
  ink(ctx, px + (n % 22), py + ((n >>> 4) % 20), 3, 2, "#9aa3ac");
  ink(ctx, px + ((n >>> 8) % 24), py + ((n >>> 11) % 18), 4, 1, "#5c646c");
  const at = (dx, dy) => ground[y + dy]?.[x + dx];
  const up = isRoad(at(0, -1));
  const down = isRoad(at(0, 1));
  const left = isRoad(at(-1, 0));
  const right = isRoad(at(1, 0));
  // A curb on every edge that leaves the asphalt, so the road reads as a
  // slab sitting on the grass instead of a gray square.
  if (!up) {
    ink(ctx, px, py, TILE, 3, "#4a515a");
    ink(ctx, px, py, TILE, 1, "#c5ccd4");
  }
  if (!down) {
    ink(ctx, px, py + TILE - 3, TILE, 3, "#4a515a");
    ink(ctx, px, py + TILE - 1, TILE, 1, "#9aa3ab");
  }
  if (!left) {
    ink(ctx, px, py, 3, TILE, "#4a515a");
    ink(ctx, px, py, 1, TILE, "#c5ccd4");
  }
  if (!right) {
    ink(ctx, px + TILE - 3, py, 3, TILE, "#4a515a");
    ink(ctx, px + TILE - 1, py, 1, TILE, "#9aa3ab");
  }
  // A straight road is two tiles wide, so each lane has three road
  // neighbors. The crossing is the only place with four. Stripes go
  // there. Dashes stay on the straight sections, on one lane only, so
  // the center line is a single row of marks instead of two stacked.
  if (up && down && left && right) {
    for (let i = 2; i < TILE; i += 8) ink(ctx, px + 2, py + i, TILE - 4, 3, "#f7f4ea");
  } else if (left && right && down && !up && x % 2 === 0) {
    ink(ctx, px + 8, py + TILE - 5, 16, 3, "#f4f1e4");
  } else if (up && down && right && !left && y % 2 === 0) {
    ink(ctx, px + TILE - 5, py + 8, 3, 16, "#f4f1e4");
  }
}

function drawPebble(ctx, px, py, x, y) {
  const theme = activeTheme;
  const n = hash(x, y);
  ink(ctx, px, py, TILE, TILE, theme.pebbleBase);
  ink(ctx, px, py + TILE - 3, TILE, 3, theme.pebbleEdge);
  const stones = [[4, 6], [14, 8], [22, 18], [8, 20], [18, 24]];
  stones.forEach(([sx, sy], index) => {
    const tone = (n + index) % 3;
    const color = theme.pebbleStones[tone] || theme.pebbleStones[0];
    ink(ctx, px + sx, py + sy, 5, 4, OUTLINE);
    ink(ctx, px + sx + 1, py + sy + 1, 3, 2, color);
  });
  if ((n + x) % 4 === 0) {
    ink(ctx, px + 2, py + 2, 1, 2, theme.pebbleMoss);
    ink(ctx, px + TILE - 4, py + TILE - 6, 1, 2, theme.pebbleMoss);
  }
}

function drawCobble(ctx, px, py, x, y) {
  ink(ctx, px, py, TILE, TILE, "#8f8578");
  const stones = [
    [1, 1, 9, 7], [11, 1, 10, 7], [22, 1, 9, 7],
    [1, 9, 12, 7], [14, 9, 8, 7], [23, 9, 8, 7],
    [1, 17, 8, 7], [10, 17, 11, 7], [22, 17, 9, 7],
    [1, 25, 14, 6], [16, 25, 15, 6],
  ];
  for (const [sx, sy, sw, sh] of stones) {
    const tone = (x + y + sx + sy) % 3;
    const fill = tone === 0 ? "#e4d9cc" : tone === 1 ? "#cbbba8" : "#b3a494";
    const dark = tone === 0 ? "#8d8276" : "#6e655c";
    ink(ctx, px + sx, py + sy, sw, sh, OUTLINE);
    if (sw > 2 && sh > 2) {
      ink(ctx, px + sx + 1, py + sy + 1, sw - 2, sh - 2, fill);
      ink(ctx, px + sx + 1, py + sy + 1, sw - 3, 1, "#f4efe8");
      ink(ctx, px + sx + 1, py + sy + sh - 2, sw - 2, 1, dark);
    }
  }
}

function drawSidewalk(ctx, px, py, x, y) {
  // Pale slabs, lighter than the asphalt and the cobble plaza, so the
  // walk reads as a path from the curb to the door.
  const n = hash(x, y);
  ink(ctx, px, py, TILE, TILE, "#d7d0c3");
  ink(ctx, px, py, TILE, 1, "#f6f1e6");
  ink(ctx, px, py + TILE - 2, TILE, 2, "#a9a193");
  ink(ctx, px + 15, py + 2, 2, TILE - 4, "#b7b0a2");
  ink(ctx, px + 2, py + 15, TILE - 4, 2, "#b7b0a2");
  ink(ctx, px + 3 + (n % 8), py + 5, 4, 1, "#eee8dc");
  ink(ctx, px + 18, py + 22, 5, 1, "#c4bdb0");
}

function drawStep(ctx, px, py) {
  ink(ctx, px, py, TILE, TILE, "#b7aa9a");
  ink(ctx, px, py, TILE, TILE, "#cfc4b4");
  ink(ctx, px + 2, py + 4, TILE - 4, 2, "#f4f0e8");
  ink(ctx, px + 2, py + 14, TILE - 4, 2, "#8d8478");
  ink(ctx, px + 2, py + 22, TILE - 4, 2, "#f4f0e8");
  ink(ctx, px, py + TILE - 3, TILE, 3, "#6e6860");
}

function dirtStyle(x, y) {
  if (x >= 12 && x <= 23 && y >= 10 && y <= 19) return "cobble";
  // Park loop, the south trail, and the mountain path are the same pebble
  // dirt. The old check only knew the three gate tiles at x=30.
  if (y >= 22 && x >= 14) return "pebble";
  if (y <= 7 && x >= 27) return "pebble";
  if (x === 26 && y >= 11 && y <= 18) return "pebble";
  return "step";
}

function drawDirt(ctx, px, py, x, y) {
  const style = dirtStyle(x, y);
  if (style === "cobble") drawCobble(ctx, px, py, x, y);
  else if (style === "pebble") drawPebble(ctx, px, py, x, y);
  else drawStep(ctx, px, py);
}

function drawTree(ctx, px, py, x, y) {
  drawGrass(ctx, px, py, x, y);
  const theme = activeTheme;
  if (theme.treeShape === "conifer") {
    drawConifer(ctx, px, py, x, y);
    return;
  }
  const cx = px + 16;
  const top = py + 3;
  const bands = [8, 12, 16, 20, 22, 24, 24, 22, 18, 14];
  bands.forEach((w, i) => {
    ink(ctx, cx - (w + 2) / 2, top + i * 2, w + 2, 2, OUTLINE);
  });
  bands.forEach((w, i) => {
    const color = i > 7 ? theme.treeBands[2] : i < 3 ? theme.treeBands[0] : theme.treeBands[1];
    ink(ctx, cx - w / 2, top + i * 2, w, 2, color);
  });
  ink(ctx, cx - 5, top + 4, 6, 3, theme.treeHighlight);
  ink(ctx, cx - 3, top + 18, 6, 10, OUTLINE);
  ink(ctx, cx - 2, top + 19, 4, 8, theme.treeTrunk);
  ink(ctx, cx - 2, top + 19, 1, 8, theme.treeTrunkLit);
}

/** Tall spruce / pine. Denser and pointier than Brick City's round trees. */
function drawConifer(ctx, px, py, x, y) {
  const theme = activeTheme;
  const cx = px + 16;
  const top = py + 1;
  // Three stacked triangles, dark teal-green with near-black shadow.
  const tiers = [
    { y: 0, w: 10 },
    { y: 6, w: 16 },
    { y: 14, w: 22 },
    { y: 22, w: 26 },
  ];
  for (const tier of tiers) {
    const mid = top + tier.y;
    ink(ctx, cx - tier.w / 2 - 1, mid, tier.w + 2, 8, OUTLINE);
    ink(ctx, cx - tier.w / 2, mid + 1, tier.w, 6, theme.treeBands[1]);
    ink(ctx, cx - tier.w / 2 + 2, mid + 1, Math.max(2, tier.w / 2 - 2), 3, theme.treeBands[0]);
    ink(ctx, cx + 1, mid + 3, Math.max(2, tier.w / 2 - 2), 3, theme.treeBands[2]);
  }
  ink(ctx, cx - 2, top + 2, 3, 2, theme.treeHighlight);
  ink(ctx, cx - 2, top + 28, 4, 4, OUTLINE);
  ink(ctx, cx - 1, top + 28, 2, 3, theme.treeTrunk);
}

function drawWater(ctx, px, py, x, y, frame, ground) {
  ink(ctx, px, py, TILE, TILE, frame ? "#2f86c8" : "#2676b4");
  const shift = frame ? 4 : 0;
  ink(ctx, px + 3 + shift, py + 7, 12, 2, "#8fd0ea");
  ink(ctx, px + 14 - shift, py + 16, 10, 2, "#d4f2fb");
  ink(ctx, px + 6, py + 24, 8, 1, "#1d5e96");
  const shore = (dx, dy) => ground[y + dy]?.[x + dx] !== "w";
  if (shore(0, -1)) ink(ctx, px, py, TILE, 2, "#1a4e78");
  if (shore(0, 1)) ink(ctx, px, py + TILE - 2, TILE, 2, "#143e60");
  if (shore(-1, 0)) ink(ctx, px, py, 2, TILE, "#1a4e78");
  if (shore(1, 0)) ink(ctx, px + TILE - 2, py, 2, TILE, "#1a4e78");
  if (hash(x, y) % 3 === 0) {
    ink(ctx, px + 8, py + 10, 16, 2, OUTLINE);
    ink(ctx, px + 6, py + 12, 20, 6, OUTLINE);
    ink(ctx, px + 8, py + 18, 16, 2, OUTLINE);
    ink(ctx, px + 10, py + 12, 12, 6, "#3f9a45");
    ink(ctx, px + 8, py + 14, 16, 2, "#2f7a32");
    ink(ctx, px + 14, py + 13, 3, 2, "#8ed36a");
    ink(ctx, px + 18, py + 10, 2, 2, "#f2c14e");
  }
}

function drawTrack(ctx, px, py, x, y, ground) {
  const n = hash(x, y);
  ink(ctx, px, py, TILE, TILE, (x + y) % 2 === 0 ? "#d0453c" : "#c43c34");
  ink(ctx, px + (n % 20), py + 6, 6, 2, "#e86a62");
  ink(ctx, px + 4, py + 22, 8, 2, "#a32e28");
  const at = (dx, dy) => ground[y + dy]?.[x + dx];
  // White only on an edge that leaves the lane. Neighboring "k" tiles
  // share that edge, so a corner stays one curve instead of a loose square.
  const edge = (code) => code !== "k";
  if (edge(at(0, -1))) ink(ctx, px, py, TILE, 3, "#f7f7f7");
  if (edge(at(0, 1))) ink(ctx, px, py + TILE - 3, TILE, 3, "#f7f7f7");
  if (edge(at(-1, 0))) ink(ctx, px, py, 3, TILE, "#f7f7f7");
  if (edge(at(1, 0))) ink(ctx, px + TILE - 3, py, 3, TILE, "#f7f7f7");
  const boundaries = [edge(at(0, -1)), edge(at(0, 1)), edge(at(-1, 0)), edge(at(1, 0))].filter(Boolean).length;
  if (boundaries === 2 && edge(at(0, -1)) && edge(at(0, 1))) {
    ink(ctx, px + 4, py + 15, TILE - 8, 2, "#f7f7f7");
  } else if (boundaries === 2 && edge(at(-1, 0)) && edge(at(1, 0))) {
    ink(ctx, px + 15, py + 4, 2, TILE - 8, "#f7f7f7");
  }
}

function drawInfield(ctx, px, py, x, y) {
  const theme = activeTheme;
  ink(ctx, px, py, TILE, TILE, theme.infield);
  ink(ctx, px + 6, py + 10, 3, 2, theme.infieldLit);
  ink(ctx, px + 18, py + 20, 4, 2, theme.infieldShade);
  if (hash(x, y) % 5 === 0) drawFlower(ctx, px + 14, py + 14, x + y);
}

function drawRock(ctx, px, py, x, y, ground) {
  const theme = activeTheme;
  const rock = (dx, dy) => ground[y + dy]?.[x + dx] === "o";
  const buried = rock(0, -1) && rock(0, 1) && rock(-1, 0) && rock(1, 0);
  if (buried) ink(ctx, px, py, TILE, TILE, theme.rockFill[2] || "#6a737c");
  else drawGrass(ctx, px, py, x, y);
  const shift = (x + y) % 3;
  const tone = (x * 2 + y) % 3;
  const fill = theme.rockFill[tone] || theme.rockFill[0];
  ink(ctx, px + 2 + shift, py + 5, 26, 22, OUTLINE);
  ink(ctx, px + 3 + shift, py + 6, 24, 20, fill);
  ink(ctx, px + 5 + shift, py + 7, 10, 4, theme.rockLit);
  ink(ctx, px + 8 + shift, py + 16, 12, 3, theme.rockShade);
  ink(ctx, px + 6 + shift, py + 20, 16, 4, theme.rockShade);
}

function drawTile(ctx, code, x, y, ground, waterFrame) {
  const px = x * TILE;
  const py = y * TILE;
  switch (code) {
    case "r":
      drawRoad(ctx, px, py, x, y, ground);
      break;
    case "x":
      // Shared stamp uses "x" for park / trail pads. On Ridgeview those
      // read as dusty tan pebble paths, not leftover asphalt.
      if (activeTheme.id === "ridgeview") drawPebble(ctx, px, py, x, y);
      else drawRoad(ctx, px, py, x, y, ground);
      break;
    case "d":
      drawDirt(ctx, px, py, x, y);
      break;
    case "h":
      drawDeepGrass(ctx, px, py, x, y);
      break;
    case "s":
      drawSidewalk(ctx, px, py, x, y);
      break;
    case "t":
      drawTree(ctx, px, py, x, y);
      break;
    case "f":
      drawFlowerBed(ctx, px, py, x, y);
      break;
    case "w":
      drawWater(ctx, px, py, x, y, waterFrame, ground);
      break;
    case "k":
      drawTrack(ctx, px, py, x, y, ground);
      break;
    case "i":
      drawInfield(ctx, px, py, x, y);
      break;
    case "o":
      drawRock(ctx, px, py, x, y, ground);
      break;
    case "n":
      drawCobble(ctx, px, py, x, y);
      break;
    default:
      drawGrass(ctx, px, py, x, y);
  }
}

function box(ctx, x, y, w, h, fill, light, dark) {
  ink(ctx, x, y, w, h, OUTLINE);
  if (w <= 2 || h <= 2) return;
  ink(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  if (w > 5 && h > 5) {
    ink(ctx, x + 2, y + 2, w - 5, 1, light);
    ink(ctx, x + 2, y + h - 2, w - 4, 1, dark);
    ink(ctx, x + w - 2, y + 2, 1, h - 4, dark);
  }
}

function shingles(ctx, x, y, w, h, base, dark, light) {
  box(ctx, x, y, w, h, base, light, dark);
  for (let row = 3; row < h - 2; row += 5) {
    ink(ctx, x + 1, y + row, w - 2, 1, dark);
    const offset = Math.floor(row / 5) % 2 === 0 ? 3 : 7;
    for (let col = offset; col < w - 2; col += 8) ink(ctx, x + col, y + row, 1, 4, dark);
  }
  // Roof drip edge: a dark lip plus a light ridge so the eave reads.
  ink(ctx, x + 1, y + h - 3, w - 2, 2, dark);
  ink(ctx, x + 2, y + 2, w - 4, 1, light);
}

function brickCourses(ctx, x, y, w, h) {
  box(ctx, x, y, w, h, "#c45a3c", "#e07a5c", "#8d3a28");
  for (let row = 3; row < h - 2; row += 6) {
    ink(ctx, x + 1, y + row, w - 2, 1, "#f0d2b4");
    const offset = Math.floor(row / 6) % 2 === 0 ? 2 : 8;
    for (let col = offset; col < w - 2; col += 12) ink(ctx, x + col, y + row, 1, 6, "#f0d2b4");
  }
}

function woodSiding(ctx, x, y, w, h) {
  box(ctx, x, y, w, h, "#e4c08a", "#f6e2bc", "#a87848");
  for (let row = 4; row < h - 2; row += 5) ink(ctx, x + 2, y + row, w - 4, 1, "#b8884e");
  ink(ctx, x + 2, y + h - 8, w - 4, 6, "#c45a3c");
  for (let col = 4; col < w - 4; col += 10) ink(ctx, x + col, y + h - 8, 1, 6, "#f0d2b4");
}

function windowPane(ctx, x, y, w, h) {
  // Wood frame around the glass so panes read as windows, not blue boxes.
  // lighting.js uses the same (x, y, w, h) for the night glow, so the
  // frame sits outside that rectangle and the glow stays on the glass.
  ink(ctx, x - 2, y - 2, w + 4, h + 4, "#3e2614");
  ink(ctx, x - 1, y - 1, w + 2, h + 2, "#c4956a");
  box(ctx, x, y, w, h, "#1c3c55", "#9fd8ea", "#163044");
  ink(ctx, x + 2, y + 2, w - 4, Math.floor(h * 0.45), "#d8f4ff");
  ink(ctx, x + 2, y + 2 + Math.floor(h * 0.45), w - 4, h - 4 - Math.floor(h * 0.45), "#6eb4d4");
  ink(ctx, x + Math.floor(w / 2) - 1, y + 2, 2, h - 4, "#f7fbfc");
  ink(ctx, x + 2, y + Math.floor(h / 2) - 1, w - 4, 2, "#f7fbfc");
  ink(ctx, x + 3, y + 3, 2, 2, "#ffffff");
  ink(ctx, x - 1, y + h, w + 2, 2, "#6b4428");
}

function doorPanel(ctx, x, y, w, h, color) {
  const tone = tones(color);
  box(ctx, x, y, w, h, tone.base, tone.light, tone.dark);
  ink(ctx, x + 3, y + 4, w - 6, 1, tone.dark);
  ink(ctx, x + 3, y + Math.floor(h * 0.55), w - 6, 1, tone.dark);
  ink(ctx, x + w - 7, y + Math.floor(h * 0.48), 3, 3, "#f2c14e");
}

/** Two shallow steps under a door. Drawn inside the building footprint. */
function doorSteps(ctx, x, y, w) {
  ink(ctx, x - 4, y, w + 8, 6, "#cfc6b8");
  ink(ctx, x - 4, y, w + 8, 1, "#f6f1e6");
  ink(ctx, x - 6, y + 6, w + 12, 5, "#b8b0a2");
  ink(ctx, x - 6, y + 10, w + 12, 1, "#8d877c");
}

function planterBox(ctx, x, y, salt = 0) {
  box(ctx, x, y, 18, 10, "#6b4428", "#c4956a", "#3e2614");
  ink(ctx, x + 2, y + 2, 14, 4, "#3d6b3a");
  drawFlower(ctx, x + 5, y + 1, salt);
  drawFlower(ctx, x + 11, y, salt + 2);
}

function mailbox(ctx, x, y) {
  // Small roadside box. Original pixels, no postal logo.
  box(ctx, x + 4, y + 10, 4, 12, "#6b4428", "#c4956a", "#3e2614");
  box(ctx, x, y, 16, 12, "#214e8f", "#4a7ec4", "#163044");
  ink(ctx, x + 2, y + 3, 8, 2, "#9fd8ea");
  ink(ctx, x + 12, y + 4, 3, 4, "#f2c14e");
}

function bench(ctx, x, y) {
  ink(ctx, x + 2, y + 10, 4, 8, "#6b4428");
  ink(ctx, x + 26, y + 10, 4, 8, "#6b4428");
  box(ctx, x, y + 4, 32, 8, "#c4956a", "#e8d0a4", "#6b4428");
  ink(ctx, x + 2, y + 2, 28, 3, "#a07848");
}

function bikeRack(ctx, x, y) {
  // Three steel loops. Not a brand mark.
  ink(ctx, x, y + 14, 36, 2, "#5c656e");
  for (let i = 0; i < 3; i += 1) {
    const bx = x + 2 + i * 12;
    ink(ctx, bx, y + 2, 2, 14, "#8a9098");
    ink(ctx, bx + 8, y + 2, 2, 14, "#8a9098");
    ink(ctx, bx, y, 10, 2, "#c5ccd2");
  }
}

function stripedAwning(ctx, x, y, w, h, a, b) {
  ink(ctx, x, y, w, h, OUTLINE);
  for (let i = 1; i < w - 1; i += 8) {
    const color = Math.floor(i / 8) % 2 === 0 ? a : b;
    ink(ctx, x + i, y + 1, Math.min(8, w - 1 - i), h - 5, color);
  }
  for (let i = 2; i < w - 4; i += 8) {
    ink(ctx, x + i, y + h - 5, 6, 2, a);
    ink(ctx, x + i, y + h - 3, 6, 3, OUTLINE);
  }
}

function crate(ctx, x, y, fruits) {
  box(ctx, x, y, 30, 20, "#c4956a", "#e8d0a4", "#6b4428");
  fruits.forEach((color, index) => {
    const fx = x + 4 + (index % 3) * 8;
    const fy = y + 4 + Math.floor(index / 3) * 7;
    ink(ctx, fx, fy, 6, 6, OUTLINE);
    ink(ctx, fx + 1, fy + 1, 4, 4, color);
    ink(ctx, fx + 2, fy + 2, 1, 1, "#fff4c2");
  });
}

function drawLantern(ctx, x, y) {
  ink(ctx, x, y - 8, 1, 8, OUTLINE);
  box(ctx, x - 4, y - 2, 9, 10, "#f2c14e", "#fff1c2", "#8a5a20");
  ink(ctx, x - 2, y + 1, 5, 4, "#fff6d0");
}

function drawHFence(ctx, x, y, length) {
  if (length < 8) return;
  ink(ctx, x, y + 4, length, 4, OUTLINE);
  ink(ctx, x, y + 5, length, 2, "#e2c090");
  ink(ctx, x, y + 10, length, 4, OUTLINE);
  ink(ctx, x, y + 11, length, 2, "#a07848");
  const posts = Math.max(1, Math.round(length / 16));
  for (let i = 0; i <= posts; i += 1) {
    const px = x + Math.round((i * (length - 4)) / posts);
    box(ctx, px, y, 5, 18, "#6b4428", "#c4956a", "#3e2614");
  }
}

function drawVFence(ctx, x, y, length) {
  if (length < 8) return;
  ink(ctx, x + 4, y, 4, length, OUTLINE);
  ink(ctx, x + 5, y, 2, length, "#e2c090");
  ink(ctx, x + 10, y, 4, length, OUTLINE);
  ink(ctx, x + 11, y, 2, length, "#a07848");
  const posts = Math.max(1, Math.round(length / 16));
  for (let i = 0; i <= posts; i += 1) {
    const py = y + Math.round((i * (length - 4)) / posts);
    box(ctx, x, py, 18, 5, "#6b4428", "#c4956a", "#3e2614");
  }
}

function paintFence(ctx, fence) {
  if (!fence) return;
  if (fence.kind === "h") drawHFence(ctx, fence.x, fence.y, fence.w);
  else drawVFence(ctx, fence.x, fence.y, fence.h);
}

function paintBoard(ctx, sign) {
  if (!sign) return;
  labeledSign(ctx, sign.x, sign.y, sign.text);
}

function scenePart(scene, id) {
  return scene.signs.find((item) => item.id === id) || scene.fences.find((item) => item.id === id);
}

function boardRect(id, text, x, y) {
  // Same size labeledSign paints: 2× mini font, plus the wooden frame.
  const scale = 2;
  return {
    id,
    kind: "board",
    text,
    x,
    y,
    w: text.length * 4 * scale + 12,
    h: 5 * scale + 12,
  };
}

function hFence(id, x, y, length) {
  // Posts are 18px tall. The rect is the whole rail, not just the boards,
  // so a sign that clips a post still counts as an overlap.
  return { id, kind: "h", x, y, w: length, h: 18 };
}

function vFence(id, x, y, length) {
  return { id, kind: "v", x, y, w: 18, h: length };
}

function buildingOrigin(id) {
  const building = BUILDINGS.find((item) => item.id === id);
  return { x: building.x * TILE, y: building.y * TILE };
}

/**
 * Every name board and every wooden fence, in pixels. Tests compare these
 * rectangles to each other and to the walk grid. Draw functions read the
 * same objects, so a moved sign cannot forget to move its hit box.
 *
 * The 5K board is inset on sidewalk tile (26, 11). The track's west rail
 * used to be painted on that same tile, after the sign, so the letters
 * disappeared and the gate looked shut. Corner posts now sit on the grass
 * tiles beside the oval, and the gate tiles in town.js stay empty.
 */
export function sceneryLayout() {
  const home = buildingOrigin("home");
  const gym = buildingOrigin("gym");
  const store = buildingOrigin("store");
  const grocery = buildingOrigin("grocery");
  const signs = [
    boardRect("home", "HOME", home.x + 70, home.y + 2),
    boardRect("grocery", "GROCERY", grocery.x + 78, grocery.y + 24),
    boardRect("gym", "GYM", gym.x + 78, gym.y + 8),
    boardRect("store", "RUN STORE", store.x + 48, store.y + 78),
    boardRect("clinic", "PT", buildingOrigin("clinic").x + 108, buildingOrigin("clinic").y + 4),
    // TANGENTLINE is 12 letters. It sits on the black wall to the right of
    // the roaster window, and it stops at the wall's right edge.
    boardRect("cafe", "TANGENTLINE", buildingOrigin("cafe").x + 122, buildingOrigin("cafe").y + 42),
    boardRect("mountain", "MOUNTAIN", 30 * TILE - 36, 6 * TILE - 30),
    // Road row above the park fence. The old y crossed into the rail's tile.
    boardRect("park", "PARK", 18 * TILE - 22, 21 * TILE + 4),
    // East-west road, one tile above the track's north rail.
    boardRect("track", "TRACK", 27 * TILE + 6, 9 * TILE + 6),
    boardRect("5k", "5K", 26 * TILE + 2, 11 * TILE + 6),
    // East expansion landmarks. Original boards, brand colors only.
    // Garden board on grass west of the beds (tiles 48–49, y=9). Keeps
    // clear of the north rail and the gate path at x=52.
    boardRect("garden", "GARDEN", 48 * TILE + 4, 9 * TILE + 4),
    boardRect("library", "NOOK", 54 * TILE + 8, 5 * TILE + 4),
    boardRect("kiln", "KILN", 57 * TILE + 8, 20 * TILE + 4),
    boardRect("club", "CLUB", 49 * TILE + 10, 25 * TILE + 4),
    {
      id: "depot",
      kind: "label",
      text: "DEPOT",
      x: 19 * TILE + 8,
      y: 16 * TILE + 2,
      w: 5 * 4,
      h: 5,
    },
    {
      id: "banner-5k",
      kind: "banner",
      text: "5K",
      x: 27 * TILE + 4,
      y: 12 * TILE + 2,
      w: 26,
      h: 28,
    },
    ...CITY_SIGNS.map((sign) => ({
      id: sign.id,
      kind: "city",
      text: "BC",
      x: sign.tx * TILE,
      y: sign.ty * TILE,
      w: TILE,
      h: TILE,
    })),
    {
      id: "activity",
      kind: "kiosk",
      text: "RUN",
      x: ACTIVITY_BOARD.kiosk.tx * TILE,
      y: ACTIVITY_BOARD.kiosk.ty * TILE,
      w: TILE,
      h: TILE,
    },
  ];
  const parkX0 = 15 * TILE + 8;
  const parkX1 = 31 * TILE - 8;
  const fences = [
    vFence("home-west", home.x + 4, home.y + 96, 40),
    vFence("home-east", home.x + 7 * TILE - 20, home.y + 96, 40),
    hFence("gym-fence", gym.x + 16, gym.y + 7 * TILE - 20, 70),
    hFence("store-fence", store.x + 16, store.y + 5 * TILE - 20, 7 * TILE - 40),
    hFence("park-north-west", parkX0, 22 * TILE + 18, 2 * TILE),
    hFence("park-north-east", 21 * TILE, 22 * TILE + 18, parkX1 - 21 * TILE),
    // Gap at the south rail where the trail leaves the pond loop (tile x=22).
    // One solid rail used to read as a fence across the path.
    hFence("park-south-west", parkX0, 28 * TILE + 4, 22 * TILE - 8 - parkX0),
    hFence("park-south-east", 23 * TILE + 8, 28 * TILE + 4, parkX1 - (23 * TILE + 8)),
    vFence("park-west", parkX0, 23 * TILE, 5 * TILE),
    vFence("park-east", 31 * TILE - 4, 23 * TILE, 5 * TILE),
    hFence("track-north", 27 * TILE + 2, 10 * TILE + 7, 7 * TILE - 8),
    hFence("track-south", 27 * TILE + 2, 19 * TILE + 6, 7 * TILE - 8),
    vFence("track-east", 34 * TILE + 8, 11 * TILE + 2, 8 * TILE - 4),
    vFence("track-west-north", 27 * TILE + 8, 11 * TILE + 2, TILE - 4),
    vFence("track-west-south", 27 * TILE + 8, 18 * TILE + 2, TILE - 4),
    // Community garden rail. Gap at tile x=52 is the gate onto the path.
    // Collision comes from LANDMARKS beds, not from these painted rails.
    hFence("garden-north", 50 * TILE, 9 * TILE + 22, 5 * TILE),
    hFence("garden-south-west", 50 * TILE, 13 * TILE - 6, TILE + 8),
    hFence("garden-south-east", 53 * TILE + 8, 13 * TILE - 6, 2 * TILE),
    vFence("garden-west", 49 * TILE + 14, 10 * TILE, 3 * TILE - 4),
    vFence("garden-east", 57 * TILE - 6, 10 * TILE, 3 * TILE - 4),
  ];
  return { signs, fences };
}

/** Tiles a rectangle paints on. A 1px spill still counts. */
export function tilesTouchedBy(rect) {
  const tiles = [];
  const x0 = Math.floor(rect.x / TILE);
  const y0 = Math.floor(rect.y / TILE);
  const x1 = Math.floor((rect.x + rect.w - 1) / TILE);
  const y1 = Math.floor((rect.y + rect.h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) tiles.push({ tx, ty });
  }
  return tiles;
}

function labeledSign(ctx, x, y, text) {
  const scale = 2;
  const width = text.length * 4 * scale + 12;
  const height = 5 * scale + 12;
  box(ctx, x, y, width, height, "#f7f1e4", "#fff8ea", "#6b4428");
  ink(ctx, x + 2, y + 2, width - 4, 4, "#1d4ed8");
  paintOutlinedText(ctx, text, x + 6, y + 8, "#1c140f", scale);
}

function chimney(ctx, x, y) {
  brickCourses(ctx, x, y, 16, 28);
  ink(ctx, x - 1, y, 18, 4, "#4a4038");
  ink(ctx, x + 4, y + 8, 4, 2, "#2a241c");
}

function panes(id) {
  return townLights().windows.filter((pane) => pane.id === id);
}

function drawStretchFigure(ctx, x, y) {
  // A runner folded forward, hands toward the feet. A clinic mark, not a
  // cross. The body is original pixels in the same outline style as the
  // townspeople.
  ink(ctx, x + 10, y, 8, 8, OUTLINE);
  ink(ctx, x + 11, y + 1, 6, 6, "#f3c7a4");
  ink(ctx, x + 12, y + 2, 2, 2, "#1c1c1c");
  ink(ctx, x + 6, y + 8, 16, 6, OUTLINE);
  ink(ctx, x + 7, y + 9, 14, 4, "#1f6f78");
  ink(ctx, x + 4, y + 12, 6, 10, OUTLINE);
  ink(ctx, x + 5, y + 13, 4, 8, "#1f6f78");
  ink(ctx, x + 16, y + 12, 6, 12, OUTLINE);
  ink(ctx, x + 17, y + 13, 4, 10, "#24366b");
  ink(ctx, x + 8, y + 18, 8, 4, OUTLINE);
  ink(ctx, x + 9, y + 19, 6, 2, "#f3c7a4");
}

function drawRoaster(ctx, x, y) {
  // Hopper, a steel drum full of beans, and a warm glow in the drum.
  // Original pixels. Not a bird and not a wordmark.
  ink(ctx, x + 10, y, 24, 6, "#8a9098");
  ink(ctx, x + 14, y + 5, 16, 6, "#2a2e33");
  ink(ctx, x + 4, y + 10, 36, 20, "#c5ccd2");
  ink(ctx, x + 6, y + 12, 32, 16, "#3a4048");
  ink(ctx, x + 8, y + 14, 28, 12, "#1a1c1f");
  ink(ctx, x + 12, y + 16, 16, 8, "#8a4b1a");
  ink(ctx, x + 16, y + 18, 8, 4, "#e07a32");
  ink(ctx, x + 18, y + 30, 6, 6, "#8a9098");
}

/**
 * Steep slate gable + cream plaster + dark wood shutters (Chamonix mood).
 * Door pixel positions match the Brick City drawers so mats stay lined up.
 */
function drawChaletShell(ctx, ox, oy, bodyW, bodyH, roofH, door) {
  const theme = activeTheme;
  // Steep gable roof
  shingles(ctx, ox + 20, oy + 20, bodyW - 40, roofH, theme.slateRoof, theme.slateRoofDark, theme.slateRoofLit);
  // Peak triangle overhang
  ink(ctx, ox + bodyW / 2 - 8, oy + 8, 16, 14, theme.slateRoofDark);
  ink(ctx, ox + bodyW / 2 - 6, oy + 10, 12, 10, theme.slateRoof);
  // Cream plaster walls
  box(ctx, ox + 28, oy + 20 + roofH - 4, bodyW - 56, bodyH, theme.chaletWall, theme.chaletWallLit, theme.chaletWallShade);
  // Dark wood balcony rail
  ink(ctx, ox + 36, oy + 20 + roofH + 20, bodyW - 72, 4, theme.chaletWood);
  ink(ctx, ox + 36, oy + 20 + roofH + 24, bodyW - 72, 2, theme.chaletWoodLit);
  for (let i = 0; i < 5; i += 1) {
    ink(ctx, ox + 40 + i * Math.floor((bodyW - 80) / 5), oy + 20 + roofH + 16, 3, 10, theme.chaletWood);
  }
  // Shutters beside a center window
  const wx = ox + bodyW / 2 - 16;
  const wy = oy + 20 + roofH + 32;
  ink(ctx, wx - 10, wy, 8, 18, theme.chaletWood);
  ink(ctx, wx + 24, wy, 8, 18, theme.chaletWood);
  windowPane(ctx, wx, wy, 24, 18);
  doorPanel(ctx, door.x, door.y, door.w, door.h, theme.chaletWood);
  if (door.steps) doorSteps(ctx, door.x, door.y + door.h, door.w);
}

/** Auburn Gold Rush false-front: tall board parapet, brick face, boardwalk. */
function drawAuburnStorefront(ctx, ox, oy, bodyW, bodyH, door) {
  const theme = activeTheme;
  // False front parapet above the roof line
  box(ctx, ox + 16, oy + 8, bodyW - 32, 28, theme.auburnFalse, "#fff8ea", "#8a6840");
  ink(ctx, ox + 20, oy + 12, bodyW - 40, 4, theme.accentTeal);
  ink(ctx, ox + 20, oy + 20, bodyW - 40, 2, theme.chaletWood);
  // Brick courses
  box(ctx, ox + 24, oy + 36, bodyW - 48, bodyH, theme.auburnBrick, theme.auburnBrickLit, theme.auburnBrickShade);
  for (let row = 40; row < 36 + bodyH - 4; row += 6) {
    ink(ctx, ox + 26, oy + row, bodyW - 52, 1, "#f0d2b4");
  }
  // Boardwalk porch lip (still on the building footprint)
  ink(ctx, ox + 20, oy + 36 + bodyH - 10, bodyW - 40, 10, theme.auburnBoardwalk);
  ink(ctx, ox + 20, oy + 36 + bodyH - 10, bodyW - 40, 2, "#c4a878");
  windowPane(ctx, ox + 40, oy + 48, 28, 22);
  windowPane(ctx, ox + bodyW - 72, oy + 48, 28, 22);
  doorPanel(ctx, door.x, door.y, door.w, door.h, theme.chaletWood);
  if (door.steps) doorSteps(ctx, door.x, door.y + door.h, door.w);
}

function drawRidgeHome(ctx, ox, oy, scene) {
  const foot = 5 * TILE;
  paintFence(ctx, scenePart(scene, "home-west"));
  paintFence(ctx, scenePart(scene, "home-east"));
  drawChaletShell(ctx, ox, oy, 7 * TILE, 56, 46, {
    x: ox + 100,
    y: oy + 112,
    w: 26,
    h: 32,
    steps: false,
  });
  ink(ctx, ox + 88, oy + 144, 50, 16, "#d7d0c3");
  ink(ctx, ox + 84, oy + foot - 8, 58, 8, "#cfc6b8");
  drawLantern(ctx, ox + 112, oy + 108);
  mailbox(ctx, ox + 70, oy + 120);
  paintBoard(ctx, scenePart(scene, "home"));
}

function drawRidgeGrocery(ctx, ox, oy, scene) {
  drawAuburnStorefront(ctx, ox, oy, 8 * TILE, 78, {
    x: ox + 100,
    y: oy + 5 * TILE - 36,
    w: 24,
    h: 36,
    steps: true,
  });
  crate(ctx, ox + 32, oy + 5 * TILE - 28, ["#e23d3d", "#f2c14e", "#3d9a4a"]);
  paintBoard(ctx, scenePart(scene, "grocery"));
}

function drawRidgeGym(ctx, ox, oy, scene) {
  const theme = activeTheme;
  shingles(ctx, ox + 28, oy + 24, 168, 56, theme.slateRoof, theme.slateRoofDark, theme.slateRoofLit);
  box(ctx, ox + 36, oy + 72, 188, 96, theme.chaletWall, theme.chaletWallLit, theme.chaletWallShade);
  ink(ctx, ox + 44, oy + 90, 160, 4, theme.chaletWood);
  for (const pane of panes("gym")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  doorPanel(ctx, ox + 188, oy + 96, 18, 32, theme.chaletWood);
  doorPanel(ctx, ox + 206, oy + 96, 18, 32, theme.chaletWoodLit);
  ink(ctx, ox + 222, oy + 118, 10, 40, "#cfc6b8");
  bikeRack(ctx, ox + 48, oy + 7 * TILE - 28);
  paintFence(ctx, scenePart(scene, "gym-fence"));
  paintBoard(ctx, scenePart(scene, "gym"));
}

function drawRidgeStore(ctx, ox, oy, scene) {
  stripedAwning(ctx, ox + 20, oy - 12, 184, 16, activeTheme.accentTeal, activeTheme.accentWhite);
  drawAuburnStorefront(ctx, ox, oy + 20, 7 * TILE, 70, {
    x: ox + 100,
    y: oy,
    w: 24,
    h: 32,
    steps: true,
  });
  drawSneaker(ctx, ox + 70, oy + 46);
  paintFence(ctx, scenePart(scene, "store-fence"));
  paintBoard(ctx, scenePart(scene, "store"));
}

function drawRidgeClinic(ctx, ox, oy, scene) {
  const theme = activeTheme;
  shingles(ctx, ox + 20, oy + 36, 152, 40, theme.slateRoof, theme.slateRoofDark, theme.slateRoofLit);
  box(ctx, ox + 28, oy + 68, 136, 56, theme.chaletWall, theme.chaletWallLit, theme.chaletWallShade);
  doorPanel(ctx, ox + 72, oy + 2, 28, 32, theme.accentTeal);
  doorSteps(ctx, ox + 72, oy + 34, 28);
  drawStretchFigure(ctx, ox + 36, oy + 78);
  windowPane(ctx, ox + 108, oy + 78, 28, 22);
  paintBoard(ctx, scenePart(scene, "clinic"));
}

function drawRidgeCafe(ctx, ox, oy, scene) {
  const theme = activeTheme;
  shingles(ctx, ox + 16, oy + 20, 224, 28, theme.slateRoof, theme.slateRoofDark, theme.slateRoofLit);
  box(ctx, ox + 20, oy + 42, 216, 80, theme.chaletWall, theme.chaletWallLit, theme.chaletWallShade);
  ink(ctx, ox + 28, oy + 60, 200, 4, theme.chaletWood);
  doorPanel(ctx, ox + 100, oy + 2, 26, 30, theme.accentWhite);
  doorSteps(ctx, ox + 100, oy + 32, 26);
  windowPane(ctx, ox + 30, oy + 50, 88, 44);
  drawRoaster(ctx, ox + 42, oy + 52);
  bench(ctx, ox + 130, oy + 100);
  planterBox(ctx, ox + 48, oy + 102, 3);
  paintBoard(ctx, scenePart(scene, "cafe"));
}

function drawCafe(ctx, ox, oy, scene) {
  // Matte black, white trim, a concrete base, steel posts. The door sits
  // on the north edge so it meets the sidewalk. The roaster is in the
  // south window, which is the face the town sees. No logo.
  ink(ctx, ox + 16, oy + 20, 224, 14, "#2a2e33");
  ink(ctx, ox + 16, oy + 20, 224, 3, "#b7bcc2");
  ink(ctx, ox + 20, oy + 32, 216, 90, "#f7f7f7");
  ink(ctx, ox + 26, oy + 38, 204, 70, "#141414");
  ink(ctx, ox + 26, oy + 96, 204, 20, "#8d8680");
  ink(ctx, ox + 26, oy + 96, 204, 3, "#d4cdc4");
  ink(ctx, ox + 40, oy + 42, 6, 62, "#8a9098");
  ink(ctx, ox + 210, oy + 42, 6, 62, "#8a9098");
  ink(ctx, ox + 40, oy + 42, 176, 4, "#c5ccd2");
  doorPanel(ctx, ox + 100, oy + 2, 26, 30, "#f4f4f4");
  doorSteps(ctx, ox + 100, oy + 32, 26);
  ink(ctx, ox + 106, oy + 6, 14, 10, "#9fd8ea");
  windowPane(ctx, ox + 30, oy + 50, 88, 44);
  drawRoaster(ctx, ox + 42, oy + 52);
  ink(ctx, ox + 34, oy + 52, 80, 2, "#d8f4ff");
  ink(ctx, ox + 150, oy + 80, 22, 16, "#6b4428");
  ink(ctx, ox + 154, oy + 84, 14, 6, "#c4a574");
  ink(ctx, ox + 176, oy + 82, 18, 16, "#5c4030");
  ink(ctx, ox + 206, oy + 78, 8, 18, "#c5ccd2");
  ink(ctx, ox + 202, oy + 74, 16, 6, "#8a9098");
  ink(ctx, ox + 208, oy + 94, 4, 6, "#1a1c1f");
  // Bench and planter under the south face — still on the building tile.
  bench(ctx, ox + 130, oy + 100);
  planterBox(ctx, ox + 48, oy + 102, 3);
  paintBoard(ctx, scenePart(scene, "cafe"));
}

function drawClinic(ctx, ox, oy, scene) {
  // Pale walls, a teal roof, a PT board, and the stretch figure. The door
  // sits on the north edge so it meets the sidewalk. No red cross.
  shingles(ctx, ox + 20, oy + 36, 152, 40, "#2f6f78", "#1a454c", "#7eb8c4");
  box(ctx, ox + 28, oy + 68, 136, 56, "#f4f1e8", "#fffaf2", "#8a8174");
  doorPanel(ctx, ox + 72, oy + 2, 28, 32, "#1f6f78");
  doorSteps(ctx, ox + 72, oy + 34, 28);
  ink(ctx, ox + 76, oy + 8, 20, 16, "#d8f4ff");
  ink(ctx, ox + 84, oy + 10, 4, 8, "#1f6f78");
  drawStretchFigure(ctx, ox + 36, oy + 78);
  windowPane(ctx, ox + 108, oy + 78, 28, 22);
  planterBox(ctx, ox + 40, oy + 108, 1);
  planterBox(ctx, ox + 140, oy + 108, 4);
  paintBoard(ctx, scenePart(scene, "clinic"));
}

function drawHome(ctx, ox, oy, scene) {
  const foot = 5 * TILE;
  // Fences before the name board. sceneryLayout owns the rectangles so
  // a later edit cannot put a rail on top of the letters.
  paintFence(ctx, scenePart(scene, "home-west"));
  paintFence(ctx, scenePart(scene, "home-east"));
  shingles(ctx, ox + 36, oy + 26, 156, 46, "#b33a32", "#7a241c", "#d45a48");
  chimney(ctx, ox + 156, oy + 8);
  woodSiding(ctx, ox + 48, oy + 64, 132, 56);
  for (const pane of panes("home")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  // The door and its last step end on the south edge of the building,
  // which is the north edge of the sidewalk tile. No grass strip between.
  doorPanel(ctx, ox + 100, oy + 112, 26, 32, "#2f6b3a");
  ink(ctx, ox + 88, oy + 144, 50, 16, "#d7d0c3");
  ink(ctx, ox + 88, oy + 144, 50, 1, "#f6f1e6");
  ink(ctx, ox + 84, oy + foot - 8, 58, 8, "#cfc6b8");
  ink(ctx, ox + 84, oy + foot - 2, 58, 2, "#8d877c");
  drawLantern(ctx, ox + 112, oy + 108);
  mailbox(ctx, ox + 70, oy + 120);
  planterBox(ctx, ox + 36, oy + 118, 1);
  planterBox(ctx, ox + 170, oy + 118, 4);
  paintBoard(ctx, scenePart(scene, "home"));
  drawFlower(ctx, ox + 40, oy + 108, 1);
  drawFlower(ctx, ox + 176, oy + 108, 4);
}

function drawGrocery(ctx, ox, oy, scene) {
  shingles(ctx, ox + 28, oy + 16, 200, 40, "#8d3a32", "#5e221c", "#c45a48");
  brickCourses(ctx, ox + 36, oy + 48, 184, 78);
  stripedAwning(ctx, ox + 24, oy + 86, 208, 18, "#2f7a45", "#f4f7f2");
  for (const pane of panes("grocery")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  doorPanel(ctx, ox + 100, oy + 5 * TILE - 36, 24, 36, "#214e8f");
  doorSteps(ctx, ox + 100, oy + 5 * TILE - 2, 24);
  crate(ctx, ox + 32, oy + 5 * TILE - 28, ["#e23d3d", "#f2c14e", "#3d9a4a", "#e23d3d", "#f2c14e", "#7ec85a"]);
  crate(ctx, ox + 196, oy + 5 * TILE - 28, ["#3d9a4a", "#e23d3d", "#f2c14e", "#7ec85a", "#e23d3d", "#f2c14e"]);
  // Window boxes under the glass — still on the brick face, not the mat.
  planterBox(ctx, ox + 48, oy + 72, 2);
  planterBox(ctx, ox + 178, oy + 72, 5);
  drawLantern(ctx, ox + 128, oy + 96);
  paintBoard(ctx, scenePart(scene, "grocery"));
}

function drawDumbbell(ctx, x, y) {
  ink(ctx, x, y + 2, 22, 12, OUTLINE);
  ink(ctx, x + 1, y + 3, 6, 10, "#d0d4da");
  ink(ctx, x + 15, y + 3, 6, 10, "#d0d4da");
  ink(ctx, x + 6, y + 6, 10, 4, "#f7f7f7");
  ink(ctx, x + 2, y + 4, 2, 2, "#ffffff");
}

function drawGym(ctx, ox, oy, scene) {
  shingles(ctx, ox + 28, oy + 28, 168, 52, "#3c4654", "#232a33", "#6a7380");
  brickCourses(ctx, ox + 36, oy + 72, 188, 96);
  for (const pane of panes("gym")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  // Double doors end on the east edge of the gym (local x = 7 tiles),
  // flush with the sidewalk on tile x = 9.
  doorPanel(ctx, ox + 188, oy + 96, 18, 32, "#214e8f");
  doorPanel(ctx, ox + 206, oy + 96, 18, 32, "#1a3f78");
  // East-facing stoop onto the sidewalk (door faces right, not down).
  ink(ctx, ox + 222, oy + 118, 10, 40, "#cfc6b8");
  ink(ctx, ox + 222, oy + 118, 10, 1, "#f6f1e6");
  ink(ctx, ox + 230, oy + 120, 6, 36, "#b8b0a2");
  ink(ctx, ox + 192, oy + 102, 10, 14, "#9fd8ea");
  ink(ctx, ox + 210, oy + 102, 10, 14, "#9fd8ea");
  box(ctx, ox + 70, oy + 18, 28, 18, "#f3e2c0", "#fff8ea", "#6b4428");
  drawDumbbell(ctx, ox + 73, oy + 21);
  drawLantern(ctx, ox + 214, oy + 88);
  // Bike rack along the south wall, inside the fence (building tile).
  bikeRack(ctx, ox + 48, oy + 7 * TILE - 28);
  planterBox(ctx, ox + 140, oy + 7 * TILE - 24, 2);
  paintFence(ctx, scenePart(scene, "gym-fence"));
  paintBoard(ctx, scenePart(scene, "gym"));
  drawFlower(ctx, ox + 24, oy + 180, 2);
}

function drawSneaker(ctx, x, y) {
  box(ctx, x, y, 26, 16, "#f3e2c0", "#fff8ea", "#6b4428");
  ink(ctx, x + 4, y + 7, 14, 5, "#f7f7f7");
  ink(ctx, x + 14, y + 5, 7, 5, "#2aa6a0");
  ink(ctx, x + 4, y + 11, 16, 2, OUTLINE);
  ink(ctx, x + 6, y + 8, 4, 1, "#e23b3b");
}

function drawStore(ctx, ox, oy, scene) {
  // Awning hangs a few pixels onto the sidewalk. The door itself starts
  // on the north edge of the building, flush with tile y = 22.
  stripedAwning(ctx, ox + 20, oy - 12, 184, 16, "#2a4f8f", "#f7f7f7");
  shingles(ctx, ox + 28, oy + 36, 168, 40, "#b33a32", "#7a241c", "#d45a48");
  brickCourses(ctx, ox + 36, oy + 70, 152, 70);
  for (const pane of panes("store")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  doorPanel(ctx, ox + 100, oy, 24, 32, "#214e8f");
  doorSteps(ctx, ox + 100, oy + 32, 24);
  drawSneaker(ctx, ox + 70, oy + 46);
  crate(ctx, ox + 28, oy + 4, ["#f7f7f7", "#2aa6a0", "#e23b3b"]);
  crate(ctx, ox + 164, oy + 4, ["#24366b", "#f7f7f7", "#2aa6a0"]);
  mailbox(ctx, ox + 48, oy + 8);
  planterBox(ctx, ox + 150, oy + 52, 3);
  drawLantern(ctx, ox + 112, oy - 4);
  paintFence(ctx, scenePart(scene, "store-fence"));
  paintBoard(ctx, scenePart(scene, "store"));
}

function drawFountain(ctx, frame) {
  const x = 17 * TILE;
  const y = 14 * TILE;
  box(ctx, x + 2, y + 2, 60, 60, "#d9d2c6", "#f7f3ec", "#7a746c");
  ink(ctx, x + 8, y + 8, 48, 48, frame ? "#3a92cc" : "#2d7eb8");
  ink(ctx, x + 12, y + 14 + (frame ? 2 : 0), 14, 2, "#d4f2fb");
  ink(ctx, x + 34, y + 30 - (frame ? 2 : 0), 12, 2, "#8fd0ea");
  box(ctx, x + 18, y + 18, 28, 28, "#cfc6b8", "#f7f3ec", "#6e6860");
  ink(ctx, x + 22, y + 22, 20, 20, frame ? "#7ec4e6" : "#5aadd4");
  box(ctx, x + 26, y + 10, 12, 18, "#b7aa9c", "#f4f0e8", "#6e6860");
  ink(ctx, x + 28, y + 16, 8, 6, "#eaf8ff");
  const spark = frame ? 3 : 0;
  ink(ctx, x + 14 + spark, y + 12, 2, 2, "#ffffff");
  ink(ctx, x + 44 - spark, y + 40, 2, 2, "#ffffff");
  ink(ctx, x + 30, y + 8 + spark, 2, 2, "#fff6d0");
}

function drawGate(ctx, open, scene) {
  const x = 30 * TILE;
  const y = 6 * TILE;
  box(ctx, x - 8, y, 12, TILE, "#9aa3ab", "#d5dee6", "#5c656e");
  box(ctx, x + 28, y, 12, TILE, "#9aa3ab", "#d5dee6", "#5c656e");
  if (!open) {
    box(ctx, x + 2, y + 6, 28, 6, "#c4956a", "#e8d0a4", "#6b4428");
    box(ctx, x + 2, y + 18, 28, 6, "#c4956a", "#e8d0a4", "#6b4428");
    ink(ctx, x + 14, y + 4, 4, 24, "#6b4428");
  } else {
    box(ctx, x - 6, y + 4, 8, 22, "#c4956a", "#e8d0a4", "#6b4428");
    box(ctx, x + 30, y + 4, 8, 22, "#c4956a", "#e8d0a4", "#6b4428");
    drawPebble(ctx, x, y, 30, 6);
  }
  paintBoard(ctx, scenePart(scene, "mountain"));
}

function drawParkAndTrackSigns(ctx, scene) {
  // After the fences. These three used to be painted first, and the
  // west track rail then covered the 5K letters.
  for (const id of ["park", "track", "5k"]) paintBoard(ctx, scenePart(scene, id));
  // East expansion name boards.
  for (const id of ["garden", "library", "kiln", "club"]) {
    const sign = scenePart(scene, id);
    if (sign) paintBoard(ctx, sign);
  }
}

/**
 * Crop / flower salt for a garden bed id. Different beds get different
 * plant colors so the rows read as mixed plantings, not one green slab.
 */
function gardenCropSalt(id) {
  if (id.endsWith("-a")) return 0;
  if (id.endsWith("-b")) return 2;
  if (id.endsWith("-c")) return 1;
  if (id.endsWith("-d")) return 3;
  if (id.endsWith("-e")) return 4;
  return 1;
}

function drawRaisedBed(ctx, x, y, w, h, salt) {
  // Wood frame, dark soil, then a few crop / flower pixels.
  box(ctx, x + 1, y + 2, w - 2, h - 4, "#6b4428", "#c4956a", "#3e2614");
  ink(ctx, x + 3, y + 4, w - 6, h - 8, "#3a2818");
  ink(ctx, x + 3, y + 4, w - 6, 2, "#5a4030");
  const crops = ["#3d9a4a", "#e23b3b", "#f2c14e", "#e56aa0", "#7ec85a"];
  const leaves = ["#245c22", "#3d6b3a", "#1b5c24"];
  for (let row = 0; row < Math.max(1, Math.floor((h - 10) / 8)); row += 1) {
    for (let col = 0; col < Math.max(1, Math.floor((w - 10) / 8)); col += 1) {
      const cx = x + 5 + col * 8 + ((row + salt) % 2);
      const cy = y + 6 + row * 8;
      ink(ctx, cx, cy + 2, 1, 3, leaves[(salt + col) % leaves.length]);
      ink(ctx, cx - 1, cy, 3, 2, crops[(salt + col + row) % crops.length]);
      ink(ctx, cx, cy - 1, 1, 1, "#fff4c2");
    }
  }
}

function drawGardenShed(ctx, x, y, w, h) {
  // Small tool shed: shingled roof, wood door, one tiny window.
  shingles(ctx, x + 2, y, w - 4, 14, "#8d3a32", "#5e221c", "#c45a48");
  box(ctx, x + 4, y + 12, w - 8, h - 14, "#c4956a", "#e8d0a4", "#6b4428");
  doorPanel(ctx, x + Math.floor(w / 2) - 8, y + 18, 16, h - 24, "#6b4428");
  windowPane(ctx, x + 8, y + 18, 10, 10);
  ink(ctx, x + 6, y + h - 4, w - 12, 3, "#8d877c");
}

function drawScarecrow(ctx, x, y) {
  // Stick figure with a straw hat. Original pixels, not a borrowed sprite.
  ink(ctx, x + 14, y + 20, 4, 12, "#6b4428");
  ink(ctx, x + 6, y + 22, 20, 3, "#c4956a");
  box(ctx, x + 10, y + 10, 12, 12, "#e23b3b", "#f06a5a", "#8d221c");
  ink(ctx, x + 12, y + 12, 3, 3, "#1c1c1c");
  ink(ctx, x + 17, y + 12, 3, 3, "#1c1c1c");
  box(ctx, x + 8, y + 4, 16, 8, "#f2c14e", "#fff1c2", "#8a5a20");
  ink(ctx, x + 6, y + 10, 20, 2, "#c4956a");
}

function drawWateringCan(ctx, x, y) {
  box(ctx, x + 6, y + 10, 16, 12, "#5c656e", "#a0a8b0", "#2a2e33");
  ink(ctx, x + 10, y + 6, 8, 6, "#8a9098");
  ink(ctx, x + 20, y + 12, 8, 3, "#8a9098");
  ink(ctx, x + 26, y + 10, 3, 6, "#5c656e");
  ink(ctx, x + 8, y + 12, 4, 2, "#d8f4ff");
}

function drawToolRack(ctx, x, y) {
  box(ctx, x + 4, y + 4, 24, 6, "#6b4428", "#c4956a", "#3e2614");
  ink(ctx, x + 8, y + 8, 2, 18, "#8a9098");
  ink(ctx, x + 14, y + 8, 2, 18, "#c4956a");
  ink(ctx, x + 20, y + 8, 2, 18, "#8a9098");
  ink(ctx, x + 6, y + 8, 6, 4, "#3d6b3a");
  ink(ctx, x + 18, y + 8, 6, 4, "#3d6b3a");
}

/** Dirt path through the garden gate. Visual only — tiles stay walkable. */
function drawGardenPath(ctx) {
  // drawPebble paints a full tile using (tx, ty) only for the stone salt.
  for (const [tx, ty] of [[52, 10], [52, 11], [52, 12], [51, 12]]) {
    drawPebble(ctx, tx * TILE, ty * TILE, tx, ty);
  }
}

/**
 * Solid east-expansion props. Footprints come from LANDMARKS in town.js
 * so collision and paint stay on the same tiles.
 */
function drawLandmarks(ctx) {
  drawGardenPath(ctx);
  for (const mark of LANDMARKS) {
    const x = mark.tx * TILE;
    const y = mark.ty * TILE;
    const w = mark.w * TILE;
    const h = mark.h * TILE;
    if (mark.id.startsWith("garden-bed")) {
      drawRaisedBed(ctx, x, y, w, h, gardenCropSalt(mark.id));
    } else if (mark.id === "garden-shed") {
      drawGardenShed(ctx, x, y, w, h);
    } else if (mark.id === "garden-scarecrow") {
      drawScarecrow(ctx, x, y);
    } else if (mark.id === "garden-can") {
      drawWateringCan(ctx, x, y);
    } else if (mark.id === "garden-tools") {
      drawToolRack(ctx, x, y);
    } else if (mark.id.startsWith("library")) {
      box(ctx, x + 2, y + 2, w - 4, h - 4, "#6b4428", "#c4956a", "#3e2614");
      ink(ctx, x + 8, y + 8, w - 16, 4, "#1d4ed8");
      ink(ctx, x + 8, y + 16, w - 16, 4, "#f7f1e4");
      ink(ctx, x + 8, y + 24, w - 16, 4, "#e23b3b");
      planterBox(ctx, x + 4, y + h - 12, 2);
    } else if (mark.id.startsWith("kiln")) {
      box(ctx, x + 4, y + 2, w - 8, h - 4, "#8d3a32", "#c45a48", "#5e221c");
      ink(ctx, x + w / 2 - 4, y - 6, 8, 10, "#5c656e");
      // Warm ember glow in the kiln mouth.
      ink(ctx, x + 12, y + h - 18, w - 24, 10, "#3a1c10");
      ink(ctx, x + 16, y + h - 14, w - 32, 4, "#e07a32");
    } else if (mark.id.startsWith("club-post")) {
      box(ctx, x + 10, y + 4, 12, h - 6, "#6b4428", "#c4956a", "#3e2614");
      ink(ctx, x + 8, y + 2, 16, 6, "#f2c14e");
    }
  }
}

function drawActivityBoard(ctx, scene) {
  // Drawn from the same rectangle as the solid post in town.js. The
  // board sits in the top of the tile so a runner standing on the mat
  // below does not cover the word. The three stripes are the menu:
  // easy, speed, and the 5K clock. Original pixels, no borrowed mark.
  const sign = scenePart(scene, "activity");
  if (!sign) return;
  const x = sign.x;
  const y = sign.y;
  box(ctx, x + 14, y + 20, 4, 12, "#6b4428", "#c4956a", "#3e2614");
  box(ctx, x + 3, y + 2, 26, 20, "#f3e2c0", "#fff8ea", "#6b4428");
  ink(ctx, x + 6, y + 1, 8, 3, "#8d6a3a");
  ink(ctx, x + 8, y + 0, 4, 2, "#c4a574");
  paintOutlinedText(ctx, "RUN", x + 8, y + 5, "#1c140f", 1);
  ink(ctx, x + 6, y + 12, 20, 2, "#3d9a4a");
  ink(ctx, x + 6, y + 15, 20, 2, "#e07a32");
  ink(ctx, x + 6, y + 18, 20, 2, "#1d4ed8");
}

function drawCityPost(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  const theme = activeTheme;
  const initials = theme.id === "ridgeview"
    ? "RV"
    : theme.id === "flatland"
      ? "FL"
      : "BC";
  const stripe = theme.id === "ridgeview" ? theme.accentTeal : "#1d4ed8";
  box(ctx, x + 13, y + 18, 6, 14, theme.chaletWood || "#6b4428", theme.chaletWoodLit || "#c4956a", "#3e2614");
  box(ctx, x + 1, y + 1, 30, 20, "#f7f1e4", "#fff8ea", "#6b4428");
  ink(ctx, x + 2, y + 2, 28, 4, stripe);
  paintOutlinedText(ctx, initials, x + 7, y + 8, "#1c140f", 2);
}

function drawDepot(ctx, scene) {
  const x = 19 * TILE;
  const y = 16 * TILE;
  box(ctx, x + 2, y + 4, 8, TILE - 4, "#6b4428", "#c4956a", "#3e2614");
  box(ctx, x + 54, y + 4, 8, TILE - 4, "#6b4428", "#c4956a", "#3e2614");
  shingles(ctx, x, y, 64, 16, "#8d3a32", "#5e221c", "#c45a48");
  box(ctx, x + 14, y + 14, 36, 18, "#f3e2c0", "#fff8ea", "#6b4428");
  windowPane(ctx, x + 18, y + 16, 12, 10);
  ink(ctx, x + 8, y + TILE - 4, 48, 4, "#d7d0c3");
  const label = scenePart(scene, "depot");
  paintOutlinedText(ctx, label.text, label.x, label.y, "#fff8ea", 1);
}

function drawLampPost(ctx, x, y) {
  box(ctx, x - 2, y - 28, 5, 28, "#3a4048", "#8b949e", "#23282e");
  box(ctx, x - 7, y - 34, 15, 8, "#2a241c", "#f2c14e", "#8a5a20");
  ink(ctx, x - 4, y - 32, 9, 4, "#fff1c2");
}

function drawBanner(ctx, scene) {
  const sign = scenePart(scene, "banner-5k");
  const x = sign.x;
  const y = sign.y;
  ink(ctx, x, y, 4, 28, "#f4f4f4");
  ink(ctx, x + 4, y, 22, 10, "#e23b3b");
  ink(ctx, x + 4, y + 10, 18, 8, "#f2c14e");
  paintOutlinedText(ctx, "5K", x + 6, y + 2, "#fff8ea", 1);
}

function drawTrailMarker(ctx) {
  ink(ctx, 16 * TILE + 8, 23 * TILE - 16, 4, 18, "#6b4428");
  box(ctx, 16 * TILE + 2, 23 * TILE - 22, 16, 10, "#f2c14e", "#fff1c2", "#8a5a20");
}

/**
 * A warm paver, one tile, original pixels. Sidewalk is pale gray
 * (#d7d0c3). This is brick red with a gold lip so it still reads when
 * the dusk wash darkens the whole map: the lip is light gold, and the
 * courses stay darker than that lip in every slot.
 */
function drawActivationPad(ctx, tx, ty) {
  const px = tx * TILE;
  const py = ty * TILE;
  ink(ctx, px, py, TILE, TILE, "#3e1c10");
  ink(ctx, px + 2, py + 2, TILE - 4, TILE - 4, "#f2c14e");
  ink(ctx, px + 4, py + 4, TILE - 8, TILE - 8, "#c4512c");
  ink(ctx, px + 4, py + 14, TILE - 8, 2, "#8d3a28");
  ink(ctx, px + 4, py + 24, TILE - 8, 2, "#8d3a28");
  ink(ctx, px + 14, py + 4, 2, 10, "#8d3a28");
  ink(ctx, px + 22, py + 16, 2, 8, "#8d3a28");
  ink(ctx, px + 6, py + 6, 10, 2, "#fff1c2");
  ink(ctx, px + 6, py + 8, 2, 4, "#f6d7a2");
}

/**
 * Paint every stand-here square. Returns the same list the grid uses,
 * so a test can compare the rects to the interaction tiles.
 */
export function paintActivationPads(ctx, world) {
  const tiles = activationTiles(world);
  for (const tile of tiles) drawActivationPad(ctx, tile.tx, tile.ty);
  return tiles;
}

function drawAreaFences(ctx, scene) {
  for (const fence of scene.fences) {
    if (
      fence.id.startsWith("park")
      || fence.id.startsWith("track")
      || fence.id.startsWith("garden")
    ) {
      paintFence(ctx, fence);
    }
  }
}

/**
 * The whole town, painted once. Overworld turns this into a Pixi texture.
 * Water has two frames so the pond and the fountain can blink without
 * redrawing the buildings. Streetlamps are drawn here too; their glow is
 * a separate layer that only turns on at dusk.
 */
export function renderWorld(state, waterFrame = 0) {
  // Active map: Brick City, Ridgeview, Flatland, or a road between towns.
  const world = buildActiveWorld(state);
  activeTheme = themeFor(world.id);
  const isBrick = world.id === "brick-city" || !world.id;
  const isRidge = world.id === "ridgeview";
  const scene = isBrick ? sceneryLayout() : sceneryLayoutForWorld(world);
  const canvas = document.createElement("canvas");
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      drawTile(ctx, world.ground[y][x], x, y, world.ground, waterFrame);
    }
  }
  // After the ground, before buildings and signs. The 5K letters paint
  // later, so they sit on the mat instead of hiding under it.
  paintActivationPads(ctx, world);
  const buildings = world.buildings || BUILDINGS;
  const ridgeBuildings = activeTheme.buildingStyle === "ridgeview";
  for (const building of buildings) {
    const px = building.x * TILE;
    const py = building.y * TILE;
    if (ridgeBuildings) {
      if (building.id === "home") drawRidgeHome(ctx, px, py, scene);
      if (building.id === "grocery") drawRidgeGrocery(ctx, px, py, scene);
      if (building.id === "gym") drawRidgeGym(ctx, px, py, scene);
      if (building.id === "store") drawRidgeStore(ctx, px, py, scene);
      if (building.id === "clinic") drawRidgeClinic(ctx, px, py, scene);
      if (building.id === "cafe") drawRidgeCafe(ctx, px, py, scene);
    } else {
      if (building.id === "home") drawHome(ctx, px, py, scene);
      if (building.id === "grocery") drawGrocery(ctx, px, py, scene);
      if (building.id === "gym") drawGym(ctx, px, py, scene);
      if (building.id === "store") drawStore(ctx, px, py, scene);
      if (building.id === "clinic") drawClinic(ctx, px, py, scene);
      if (building.id === "cafe") drawCafe(ctx, px, py, scene);
    }
  }
  if (isBrick) {
    drawFountain(ctx, waterFrame);
    drawLandmarks(ctx);
    drawActivityBoard(ctx, scene);
    drawGate(ctx, world.mountainOpen, scene);
    drawDepot(ctx, scene);
    for (const lamp of townLights().lamps) drawLampPost(ctx, lamp.x, lamp.y);
    drawAreaFences(ctx, scene);
    drawParkAndTrackSigns(ctx, scene);
  } else {
    drawLandmarksFrom(ctx, world.landmarks || []);
    drawDepotAt(ctx, world);
    if (world.activityBoard) drawActivityBoardAt(ctx, world.activityBoard);
    if (isRidge) {
      drawRidgePlazaExtras(ctx);
      drawGate(ctx, world.mountainOpen, scene);
    }
  }
  // One welcome post per map.
  const signs = world.signs || CITY_SIGNS;
  for (const sign of signs) drawCityPost(ctx, sign.tx, sign.ty);
  if (isBrick && state?.milestones?.includes("banner")) drawBanner(ctx, scene);
  if (isBrick && state?.milestones?.includes("flowers")) {
    drawFlowerBed(ctx, 13 * TILE, 12 * TILE, 13, 12);
    drawFlowerBed(ctx, 22 * TILE, 17 * TILE, 22, 17);
    drawFlowerBed(ctx, 14 * TILE, 18 * TILE, 14, 18);
  }
  if (isBrick && state?.milestones?.includes("trail-marker")) drawTrailMarker(ctx);
  return canvas;
}

/** Generic scenery boards for non–Brick City maps (same building drawers). */
function sceneryLayoutForWorld(world) {
  const buildings = world.buildings || [];
  const origin = (id) => {
    const building = buildings.find((item) => item.id === id);
    if (!building) return { x: 0, y: 0 };
    return { x: building.x * TILE, y: building.y * TILE };
  };
  const home = origin("home");
  const gym = origin("gym");
  const store = origin("store");
  const grocery = origin("grocery");
  const clinic = origin("clinic");
  const cafe = origin("cafe");
  const depot = (world.places || []).find((p) => p.id === "depot");
  const initials = (world.info?.name || "??").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
  return {
    signs: [
      boardRect("home", "INN", home.x + 70, home.y + 2),
      boardRect("grocery", "GROCERY", grocery.x + 78, grocery.y + 24),
      boardRect("gym", "GYM", gym.x + 78, gym.y + 8),
      boardRect("store", "RUN STORE", store.x + 48, store.y + 78),
      boardRect("clinic", "PT", clinic.x + 108, clinic.y + 4),
      boardRect("cafe", "CAFE", cafe.x + 122, cafe.y + 42),
      {
        id: "depot",
        kind: "label",
        text: "DEPOT",
        x: (depot?.tx ?? 19) * TILE + 8,
        y: ((depot?.ty ?? 17) - 1) * TILE + 2,
        w: 5 * 4,
        h: 5,
      },
      ...(world.signs || []).map((sign) => ({
        id: sign.id,
        kind: "city",
        text: initials,
        x: sign.tx * TILE,
        y: sign.ty * TILE,
        w: TILE,
        h: TILE,
      })),
    ],
    fences: [],
  };
}

function drawLandmarksFrom(ctx, landmarks) {
  for (const mark of landmarks) {
    const x = mark.tx * TILE;
    const y = mark.ty * TILE;
    const w = mark.w * TILE;
    const h = mark.h * TILE;
    if (mark.id.startsWith("garden-bed")) {
      drawRaisedBed(ctx, x, y, w, h, gardenCropSalt(mark.id));
    } else if (mark.id === "garden-shed") {
      drawGardenShed(ctx, x, y, w, h);
    } else if (mark.id === "garden-scarecrow") {
      drawScarecrow(ctx, x, y);
    } else if (mark.id === "garden-can") {
      drawWateringCan(ctx, x, y);
    } else if (mark.id === "garden-tools") {
      drawToolRack(ctx, x, y);
    } else if (mark.id.startsWith("kiln")) {
      box(ctx, x + 4, y + 2, w - 8, h - 4, "#8d3a32", "#c45a48", "#5e221c");
      ink(ctx, x + 12, y + h - 18, w - 24, 10, "#3a1c10");
      ink(ctx, x + 16, y + h - 14, w - 32, 4, "#e07a32");
    } else if (mark.id === "church") {
      drawChurch(ctx, x, y, w, h);
    } else if (mark.id === "race-arch") {
      drawRaceArch(ctx, x, y, w, h);
    } else if (mark.id.startsWith("rock-pile")) {
      drawRockPile(ctx, x, y, w, h);
    } else if (mark.id.startsWith("trail-post")) {
      drawTrailPost(ctx, x, y);
    } else if (mark.id.startsWith("wood-fence")) {
      drawHFence(ctx, x + 2, y + Math.floor(h / 2) - 2, w - 4);
    }
  }
}

/**
 * White church with a steeple and a small onion-dome cap. Landmark only —
 * not a shop, not a race menu. Original design; no real parish mark.
 */
function drawChurch(ctx, x, y, w, h) {
  const theme = activeTheme;
  const bodyH = Math.max(24, h - 36);
  shingles(ctx, x + 4, y + 28, w - 8, 18, theme.churchSlate || theme.slateRoof, theme.slateRoofDark, theme.slateRoofLit);
  box(ctx, x + 8, y + 42, w - 16, bodyH, theme.churchWall || "#f7f7f7", "#ffffff", "#c8c0b4");
  // Steeple
  ink(ctx, x + w / 2 - 8, y + 8, 16, 24, theme.churchSlate || theme.slateRoof);
  ink(ctx, x + w / 2 - 6, y + 10, 12, 20, theme.slateRoofLit || "#8a9098");
  // Onion-dome cap (seafoam accent, not a copied silhouette)
  ink(ctx, x + w / 2 - 10, y + 2, 20, 10, theme.churchDome || theme.accentTeal);
  ink(ctx, x + w / 2 - 6, y, 12, 6, theme.accentWhite);
  ink(ctx, x + w / 2 - 2, y - 4, 4, 6, theme.accentBlack);
  windowPane(ctx, x + w / 2 - 10, y + 52, 20, 28);
  doorPanel(ctx, x + w / 2 - 10, y + h - 28, 20, 24, theme.chaletWood || "#3e2a18");
}

/** Race start/finish arch over the plaza. Original text only. */
function drawRaceArch(ctx, x, y, w, h) {
  const theme = activeTheme;
  ink(ctx, x + 4, y + 8, 6, h - 8, theme.chaletWood || "#3e2a18");
  ink(ctx, x + w - 10, y + 8, 6, h - 8, theme.chaletWood || "#3e2a18");
  box(ctx, x + 2, y, w - 4, 16, theme.accentTeal, theme.accentWhite, theme.accentBlack);
  paintOutlinedText(ctx, "RIDGE", x + Math.max(4, w / 2 - 18), y + 4, "#1c140f", 1);
}

function drawRockPile(ctx, x, y, w, h) {
  const theme = activeTheme;
  const fills = theme.rockFill || ["#aeb6be", "#8d959e", "#7a848e"];
  ink(ctx, x + 4, y + h - 18, w - 8, 14, OUTLINE);
  ink(ctx, x + 6, y + h - 16, w - 12, 10, fills[1]);
  ink(ctx, x + 10, y + h - 28, Math.floor(w / 2), 14, OUTLINE);
  ink(ctx, x + 12, y + h - 26, Math.floor(w / 2) - 4, 10, fills[0]);
  ink(ctx, x + 8, y + h - 24, 8, 3, theme.rockLit || "#e4ebf0");
}

function drawTrailPost(ctx, x, y) {
  const theme = activeTheme;
  ink(ctx, x + 14, y + 8, 4, 24, theme.chaletWood || "#3e2a18");
  box(ctx, x + 4, y + 4, 24, 12, "#f2c14e", "#fff1c2", "#8a5a20");
  paintOutlinedText(ctx, "TRAIL", x + 6, y + 6, "#1c140f", 1);
}

/** Plaza paint that is not a solid landmark: distant slate peaks hint. */
function drawRidgePlazaExtras(ctx) {
  // Pale slate / blue-gray mountain silhouette along the far north edge
  // (inside the tree border). Decoration only — no collision.
  for (let i = 0; i < 5; i += 1) {
    const bx = (8 + i * 12) * TILE;
    const peak = 6 + (i % 3) * 4;
    ink(ctx, bx, peak, 40, 10, "#6a7380");
    ink(ctx, bx + 8, peak - 6, 24, 10, "#8a949e");
    ink(ctx, bx + 16, peak - 10, 10, 8, "#b0b8c0");
  }
}

function drawDepotAt(ctx, world) {
  const depot = (world.places || []).find((p) => p.id === "depot");
  if (!depot) return;
  const theme = activeTheme;
  const x = depot.tx * TILE;
  const y = (depot.ty - 1) * TILE;
  if (theme.buildingStyle === "ridgeview") {
    box(ctx, x + 2, y + 4, 8, TILE - 4, theme.chaletWood, theme.chaletWoodLit, "#1a1008");
    box(ctx, x + 54, y + 4, 8, TILE - 4, theme.chaletWood, theme.chaletWoodLit, "#1a1008");
    shingles(ctx, x, y, 64, 16, theme.slateRoof, theme.slateRoofDark, theme.slateRoofLit);
    box(ctx, x + 14, y + 14, 36, 18, theme.chaletWall, theme.chaletWallLit, theme.chaletWallShade);
  } else {
    box(ctx, x + 2, y + 4, 8, TILE - 4, "#6b4428", "#c4956a", "#3e2614");
    box(ctx, x + 54, y + 4, 8, TILE - 4, "#6b4428", "#c4956a", "#3e2614");
    shingles(ctx, x, y, 64, 16, "#8d3a32", "#5e221c", "#c45a48");
    box(ctx, x + 14, y + 14, 36, 18, "#f3e2c0", "#fff8ea", "#6b4428");
  }
  paintOutlinedText(ctx, "DEPOT", x + 8, y + 2, "#fff8ea", 1);
}

function drawActivityBoardAt(ctx, board) {
  const x = board.kiosk.tx * TILE;
  const y = board.kiosk.ty * TILE;
  box(ctx, x + 14, y + 20, 4, 12, "#6b4428", "#c4956a", "#3e2614");
  box(ctx, x + 3, y + 2, 26, 20, "#f3e2c0", "#fff8ea", "#6b4428");
  paintOutlinedText(ctx, "RUN", x + 8, y + 5, "#1c140f", 1);
}
