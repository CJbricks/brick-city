/**
 * art.js
 * All of Brick City's pixels are drawn here, from scratch. Nothing is
 * traced from a Nintendo or Game Freak sprite, and nothing is loaded
 * from a PNG. Runners, tiles, buildings, the brick logo, and the
 * title-screen wave are functions, so a color tweak is a palette change
 * instead of a new file.
 *
 * v2 is 32×32 tiles and 32×40 runner frames (v1 was 16×16 and 16×20).
 * Canvases are still painted at 1x: one rectangle = one pixel. Pixi and
 * CSS scale them with nearest-neighbor filtering. That is what keeps the
 * edges crisp instead of blurry.
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

import { BUILDINGS, CITY_SIGNS, COLS, ROWS, TILE, buildWorld } from "@/game/town";
import { townLights } from "@/lib/lighting";

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
  };
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

function buildFront(frame, gender, { wave = false, height = RUNNER_H, y0 = 2 } = {}) {
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
  return applyBob(plantFeet(rows), wave ? 0 : phase === 0 ? 0 : -1);
}

function buildUp(frame, gender) {
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
  return applyBob(plantFeet(rows), phase === 0 ? 0 : -1);
}

function buildSide(frame, gender) {
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
  return applyBob(plantFeet(rows), phase === 0 ? 0 : -1);
}

function buildRunnerRows(pose, frame, gender) {
  if (pose === "wave") return buildFront(frame, gender, { wave: true, height: 48, y0: 10 });
  if (pose === "up") return buildUp(frame, gender);
  if (pose === "side") return buildSide(frame, gender);
  return buildFront(frame, gender);
}

function blitRows(ctx, ox, oy, rows, palette) {
  const colors = paintMap(PALETTES[palette] || PALETTES.male);
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
  blitRows(ctx, ox, oy, buildRunnerRows(pose, frame, gender), palette || gender);
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
export function paintWave(canvas, gender, frame) {
  const scale = 3;
  const rows = buildRunnerRows("wave", frame, gender);
  const tiny = document.createElement("canvas");
  tiny.width = RUNNER_W;
  tiny.height = rows.length;
  const tinyCtx = tiny.getContext("2d");
  tinyCtx.imageSmoothingEnabled = false;
  blitRows(tinyCtx, 0, 0, rows, gender);
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

function drawGrass(ctx, px, py, x, y) {
  const n = hash(x, y);
  const base = (x + y) % 2 === 0 ? "#4ea33b" : "#59b246";
  ink(ctx, px, py, TILE, TILE, base);
  ink(ctx, px + (n % 18), py + ((n >>> 3) % 16), 4, 2, "#78d15e");
  ink(ctx, px + ((n >>> 6) % 20), py + ((n >>> 9) % 18), 3, 2, "#3b8a2e");
  const blades = [[3, 7], [12, 20], [22, 8], [8, 26], [26, 18]];
  blades.forEach(([bx, by], index) => {
    if ((n >>> index) & 1) return;
    ink(ctx, px + bx, py + by, 1, 3, "#245c22");
    ink(ctx, px + bx + 1, py + by + 1, 1, 2, "#b6e88a");
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
  const n = hash(x, y);
  ink(ctx, px, py, TILE, TILE, "#c4a36a");
  ink(ctx, px, py + TILE - 3, TILE, 3, "#a8844e");
  const stones = [[4, 6], [14, 8], [22, 18], [8, 20], [18, 24]];
  stones.forEach(([sx, sy], index) => {
    const tone = (n + index) % 3;
    const color = tone === 0 ? "#e6d0a4" : tone === 1 ? "#8d6b3e" : "#f2e2c0";
    ink(ctx, px + sx, py + sy, 5, 4, OUTLINE);
    ink(ctx, px + sx + 1, py + sy + 1, 3, 2, color);
  });
  if ((n + x) % 4 === 0) {
    ink(ctx, px + 2, py + 2, 1, 2, "#3b8a2e");
    ink(ctx, px + TILE - 4, py + TILE - 6, 1, 2, "#3b8a2e");
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
  if ((y >= 22 && x >= 14) || (x === 30 && y >= 3 && y <= 8)) return "pebble";
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
  const cx = px + 16;
  const top = py + 3;
  const bands = [8, 12, 16, 20, 22, 24, 24, 22, 18, 14];
  bands.forEach((w, i) => {
    ink(ctx, cx - (w + 2) / 2, top + i * 2, w + 2, 2, OUTLINE);
  });
  bands.forEach((w, i) => {
    const color = i > 7 ? "#1e5a28" : i < 3 ? "#4ea84a" : "#2f7a32";
    ink(ctx, cx - w / 2, top + i * 2, w, 2, color);
  });
  ink(ctx, cx - 5, top + 4, 6, 3, "#b6e88a");
  ink(ctx, cx - 3, top + 18, 6, 10, OUTLINE);
  ink(ctx, cx - 2, top + 19, 4, 8, "#6b4428");
  ink(ctx, cx - 2, top + 19, 1, 8, "#a07848");
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
  ink(ctx, px, py, TILE, TILE, "#3f8f45");
  ink(ctx, px + 6, py + 10, 3, 2, "#67b84c");
  ink(ctx, px + 18, py + 20, 4, 2, "#2f7a32");
  if (hash(x, y) % 5 === 0) drawFlower(ctx, px + 14, py + 14, x + y);
}

function drawRock(ctx, px, py, x, y, ground) {
  const rock = (dx, dy) => ground[y + dy]?.[x + dx] === "o";
  const buried = rock(0, -1) && rock(0, 1) && rock(-1, 0) && rock(1, 0);
  if (buried) ink(ctx, px, py, TILE, TILE, "#6a737c");
  else drawGrass(ctx, px, py, x, y);
  const shift = (x + y) % 3;
  const tone = (x * 2 + y) % 3;
  const fill = tone === 0 ? "#aeb6be" : tone === 1 ? "#8d959e" : "#7a848e";
  ink(ctx, px + 2 + shift, py + 5, 26, 22, OUTLINE);
  ink(ctx, px + 3 + shift, py + 6, 24, 20, fill);
  ink(ctx, px + 5 + shift, py + 7, 10, 4, "#e4ebf0");
  ink(ctx, px + 8 + shift, py + 16, 12, 3, "#4e565e");
  ink(ctx, px + 6 + shift, py + 20, 16, 4, "#5c656e");
}

function drawTile(ctx, code, x, y, ground, waterFrame) {
  const px = x * TILE;
  const py = y * TILE;
  switch (code) {
    case "r":
    case "x":
      drawRoad(ctx, px, py, x, y, ground);
      break;
    case "d":
      drawDirt(ctx, px, py, x, y);
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

function drawHome(ctx, ox, oy) {
  drawVFence(ctx, ox + 4, oy + 100, 52);
  drawVFence(ctx, ox + 7 * TILE - 20, oy + 100, 52);
  drawHFence(ctx, ox + 4, oy + 5 * TILE - 18, 92);
  drawHFence(ctx, ox + 128, oy + 5 * TILE - 18, 7 * TILE - 136);
  shingles(ctx, ox + 36, oy + 26, 156, 46, "#b33a32", "#7a241c", "#d45a48");
  chimney(ctx, ox + 156, oy + 8);
  woodSiding(ctx, ox + 48, oy + 64, 132, 62);
  for (const pane of panes("home")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  doorPanel(ctx, ox + 100, oy + 90, 26, 36, "#2f6b3a");
  box(ctx, ox + 92, oy + 124, 42, 6, "#d9d0c4", "#f4f0e8", "#8a8478");
  box(ctx, ox + 88, oy + 130, 50, 6, "#cfc6b8", "#f4f0e8", "#6e6860");
  drawLantern(ctx, ox + 112, oy + 108);
  labeledSign(ctx, ox + 70, oy + 2, "HOME");
  drawFlower(ctx, ox + 40, oy + 120, 1);
  drawFlower(ctx, ox + 176, oy + 118, 4);
}

function drawGrocery(ctx, ox, oy) {
  shingles(ctx, ox + 28, oy + 16, 200, 40, "#8d3a32", "#5e221c", "#c45a48");
  brickCourses(ctx, ox + 36, oy + 48, 184, 78);
  stripedAwning(ctx, ox + 24, oy + 86, 208, 18, "#2f7a45", "#f4f7f2");
  for (const pane of panes("grocery")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  doorPanel(ctx, ox + 100, oy + 100, 24, 32, "#214e8f");
  crate(ctx, ox + 32, oy + 112, ["#e23d3d", "#f2c14e", "#3d9a4a", "#e23d3d", "#f2c14e", "#7ec85a"]);
  crate(ctx, ox + 196, oy + 112, ["#3d9a4a", "#e23d3d", "#f2c14e", "#7ec85a", "#e23d3d", "#f2c14e"]);
  drawLantern(ctx, ox + 128, oy + 96);
  labeledSign(ctx, ox + 78, oy + 24, "GROCERY");
}

function drawDumbbell(ctx, x, y) {
  ink(ctx, x, y + 2, 22, 12, OUTLINE);
  ink(ctx, x + 1, y + 3, 6, 10, "#d0d4da");
  ink(ctx, x + 15, y + 3, 6, 10, "#d0d4da");
  ink(ctx, x + 6, y + 6, 10, 4, "#f7f7f7");
  ink(ctx, x + 2, y + 4, 2, 2, "#ffffff");
}

function drawGym(ctx, ox, oy) {
  shingles(ctx, ox + 28, oy + 28, 168, 52, "#3c4654", "#232a33", "#6a7380");
  brickCourses(ctx, ox + 36, oy + 72, 140, 96);
  for (const pane of panes("gym")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  doorPanel(ctx, ox + 178, oy + 96, 18, 40, "#214e8f");
  doorPanel(ctx, ox + 196, oy + 96, 18, 40, "#1a3f78");
  ink(ctx, ox + 182, oy + 102, 10, 14, "#9fd8ea");
  ink(ctx, ox + 200, oy + 102, 10, 14, "#9fd8ea");
  box(ctx, ox + 70, oy + 18, 28, 18, "#f3e2c0", "#fff8ea", "#6b4428");
  drawDumbbell(ctx, ox + 73, oy + 21);
  drawLantern(ctx, ox + 198, oy + 108);
  labeledSign(ctx, ox + 78, oy + 8, "GYM");
  drawHFence(ctx, ox + 16, oy + 7 * TILE - 20, 70);
  drawFlower(ctx, ox + 24, oy + 180, 2);
}

function drawSneaker(ctx, x, y) {
  box(ctx, x, y, 26, 16, "#f3e2c0", "#fff8ea", "#6b4428");
  ink(ctx, x + 4, y + 7, 14, 5, "#f7f7f7");
  ink(ctx, x + 14, y + 5, 7, 5, "#2aa6a0");
  ink(ctx, x + 4, y + 11, 16, 2, OUTLINE);
  ink(ctx, x + 6, y + 8, 4, 1, "#e23b3b");
}

function drawStore(ctx, ox, oy) {
  stripedAwning(ctx, ox + 20, oy + 2, 184, 16, "#2a4f8f", "#f7f7f7");
  shingles(ctx, ox + 28, oy + 36, 168, 40, "#b33a32", "#7a241c", "#d45a48");
  brickCourses(ctx, ox + 36, oy + 70, 152, 70);
  for (const pane of panes("store")) windowPane(ctx, pane.x, pane.y, pane.w, pane.h);
  doorPanel(ctx, ox + 100, oy + 18, 24, 28, "#214e8f");
  drawSneaker(ctx, ox + 70, oy + 46);
  crate(ctx, ox + 28, oy + 20, ["#f7f7f7", "#2aa6a0", "#e23b3b"]);
  crate(ctx, ox + 164, oy + 20, ["#24366b", "#f7f7f7", "#2aa6a0"]);
  drawLantern(ctx, ox + 112, oy + 8);
  labeledSign(ctx, ox + 48, oy + 78, "RUN STORE");
  drawHFence(ctx, ox + 16, oy + 5 * TILE - 20, 7 * TILE - 40);
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

function drawGate(ctx, open) {
  const x = 30 * TILE;
  const y = 6 * TILE;
  box(ctx, x - 8, y - 2, 12, 36, "#9aa3ab", "#d5dee6", "#5c656e");
  box(ctx, x + 28, y - 2, 12, 36, "#9aa3ab", "#d5dee6", "#5c656e");
  if (!open) {
    box(ctx, x + 2, y + 6, 28, 6, "#c4956a", "#e8d0a4", "#6b4428");
    box(ctx, x + 2, y + 18, 28, 6, "#c4956a", "#e8d0a4", "#6b4428");
    ink(ctx, x + 14, y + 4, 4, 24, "#6b4428");
  } else {
    box(ctx, x - 6, y + 4, 8, 22, "#c4956a", "#e8d0a4", "#6b4428");
    box(ctx, x + 30, y + 4, 8, 22, "#c4956a", "#e8d0a4", "#6b4428");
    drawPebble(ctx, x, y, 30, 6);
  }
  labeledSign(ctx, x - 36, y - 30, "MOUNTAIN");
}

function drawParkSign(ctx) {
  labeledSign(ctx, 18 * TILE - 20, 22 * TILE - 18, "PARK");
}

function drawTrackSign(ctx) {
  labeledSign(ctx, 27 * TILE, 10 * TILE - 18, "TRACK");
  box(ctx, 26 * TILE + 4, 11 * TILE + 4, 24, 22, "#f3e2c0", "#fff8ea", "#6b4428");
  paintOutlinedText(ctx, "5K", 26 * TILE + 8, 11 * TILE + 8, "#1c140f", 2);
}

function drawCityPost(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  box(ctx, x + 13, y + 18, 6, 14, "#6b4428", "#c4956a", "#3e2614");
  box(ctx, x + 1, y + 1, 30, 20, "#f7f1e4", "#fff8ea", "#6b4428");
  ink(ctx, x + 2, y + 2, 28, 4, "#1d4ed8");
  paintOutlinedText(ctx, "BC", x + 7, y + 8, "#1c140f", 2);
}

function drawDepot(ctx) {
  const x = 19 * TILE;
  const y = 16 * TILE;
  box(ctx, x + 2, y + 8, 8, 28, "#6b4428", "#c4956a", "#3e2614");
  box(ctx, x + 54, y + 8, 8, 28, "#6b4428", "#c4956a", "#3e2614");
  shingles(ctx, x, y, 64, 16, "#8d3a32", "#5e221c", "#c45a48");
  box(ctx, x + 14, y + 16, 36, 22, "#f3e2c0", "#fff8ea", "#6b4428");
  windowPane(ctx, x + 18, y + 20, 12, 10);
  paintOutlinedText(ctx, "DEPOT", x + 8, y + 4, "#fff8ea", 1);
}

function drawLampPost(ctx, x, y) {
  box(ctx, x - 2, y - 28, 5, 28, "#3a4048", "#8b949e", "#23282e");
  box(ctx, x - 7, y - 34, 15, 8, "#2a241c", "#f2c14e", "#8a5a20");
  ink(ctx, x - 4, y - 32, 9, 4, "#fff1c2");
}

function drawBanner(ctx) {
  const x = 27 * TILE + 4;
  const y = 12 * TILE;
  ink(ctx, x, y, 4, 28, "#f4f4f4");
  ink(ctx, x + 4, y, 22, 10, "#e23b3b");
  ink(ctx, x + 4, y + 10, 18, 8, "#f2c14e");
  paintOutlinedText(ctx, "5K", x + 6, y + 2, "#fff8ea", 1);
}

function drawTrailMarker(ctx) {
  ink(ctx, 16 * TILE + 8, 23 * TILE - 16, 4, 18, "#6b4428");
  box(ctx, 16 * TILE + 2, 23 * TILE - 22, 16, 10, "#f2c14e", "#fff1c2", "#8a5a20");
}

function drawParkFence(ctx) {
  const x0 = 15 * TILE + 8;
  const x1 = 31 * TILE - 8;
  const yNorth = 22 * TILE + 18;
  const ySouth = 28 * TILE + 4;
  drawHFence(ctx, x0, yNorth, 2 * TILE);
  drawHFence(ctx, 21 * TILE, yNorth, x1 - 21 * TILE);
  drawHFence(ctx, x0, ySouth, x1 - x0);
  drawVFence(ctx, x0, 23 * TILE, 5 * TILE);
  drawVFence(ctx, 31 * TILE - 4, 23 * TILE, 5 * TILE);
}

function drawTrackFence(ctx) {
  drawHFence(ctx, 27 * TILE, 10 * TILE + 8, 6 * TILE);
  drawHFence(ctx, 27 * TILE, 19 * TILE - 4, 6 * TILE);
  drawVFence(ctx, 34 * TILE - 8, 11 * TILE, 7 * TILE);
  drawVFence(ctx, 26 * TILE + 10, 11 * TILE, 2 * TILE);
  drawVFence(ctx, 26 * TILE + 10, 16 * TILE, 3 * TILE);
}

/**
 * The whole town, painted once. Overworld turns this into a Pixi texture.
 * Water has two frames so the pond and the fountain can blink without
 * redrawing the buildings. Streetlamps are drawn here too; their glow is
 * a separate layer that only turns on at dusk.
 */
export function renderWorld(state, waterFrame = 0) {
  const world = buildWorld(state);
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
  for (const building of BUILDINGS) {
    const px = building.x * TILE;
    const py = building.y * TILE;
    if (building.id === "home") drawHome(ctx, px, py);
    if (building.id === "grocery") drawGrocery(ctx, px, py);
    if (building.id === "gym") drawGym(ctx, px, py);
    if (building.id === "store") drawStore(ctx, px, py);
  }
  drawFountain(ctx, waterFrame);
  drawGate(ctx, world.mountainOpen);
  drawParkSign(ctx);
  drawTrackSign(ctx);
  drawDepot(ctx);
  for (const sign of CITY_SIGNS) drawCityPost(ctx, sign.tx, sign.ty);
  for (const lamp of townLights().lamps) drawLampPost(ctx, lamp.x, lamp.y);
  drawParkFence(ctx);
  drawTrackFence(ctx);
  if (state?.milestones?.includes("banner")) drawBanner(ctx);
  if (state?.milestones?.includes("flowers")) {
    drawFlowerBed(ctx, 13 * TILE, 12 * TILE, 13, 12);
    drawFlowerBed(ctx, 22 * TILE, 17 * TILE, 22, 17);
    drawFlowerBed(ctx, 14 * TILE, 18 * TILE, 14, 18);
  }
  if (state?.milestones?.includes("trail-marker")) drawTrailMarker(ctx);
  return canvas;
}
