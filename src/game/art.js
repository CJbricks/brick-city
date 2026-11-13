/**
 * art.js
 * All of Brick City's pixels are drawn here, from scratch. Nothing is
 * traced from a Nintendo or Game Freak sprite. Runners, tiles, buildings,
 * the brick logo, and the title-screen wave are functions, so a color
 * tweak is a palette change instead of a new file.
 *
 * Canvases are painted at 1x (one rectangle = one pixel). Pixi and CSS
 * scale them with nearest-neighbor filtering. That is what keeps the
 * edges crisp instead of blurry.
 */

import { BUILDINGS, CITY_SIGNS, COLS, ROWS, TILE, buildWorld } from "@/game/town";

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

function ink(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/**
 * One runner, 16 by 20 pixels. pose is "down", "up", or "side" (the side
 * pose faces right; the overworld flips it for left). frame 0 and 1 are
 * the two steps of the walk cycle.
 */
export function drawRunnerSprite(ctx, ox, oy, pose, frame, palette, gender) {
  const colors = PALETTES[palette] || (gender === "female" ? PALETTES.female : PALETTES.male);
  const step = frame % 2;
  const p = (x, y, w, h, color) => ink(ctx, ox + x, oy + y, w, h, color);
  const ponytail = gender === "female";

  if (pose === "up") {
    p(4, 1, 8, 3, colors.cap);
    p(5, 1, 6, 1, colors.panel);
    p(4, 4, 8, 2, colors.hair);
    p(3, 8, 10, 1, colors.trim);
    p(4, 9, 8, 5, colors.shirt);
    p(4, 12, 8, 1, colors.stripe);
    p(2, 9 + step, 2, 3, colors.skin);
    p(12, 9 + (1 - step), 2, 3, colors.skin);
    p(4, 14, 8, 3, colors.shorts);
    p(4 + step, 17, 3, 2, colors.skin);
    p(9 - step, 17, 3, 2, colors.skin);
    p(4 + step, 19, 3, 1, colors.sole);
    p(9 - step, 19, 3, 1, colors.sole);
    if (ponytail) p(6, 6, 4, 2, colors.hair);
    return;
  }

  if (pose === "side") {
    p(5, 1, 7, 2, colors.cap);
    p(11, 2, 3, 1, colors.cap);
    p(6, 2, 3, 1, colors.panel);
    p(5, 3, 7, 2, colors.hair);
    p(6, 5, 6, 4, colors.skin);
    p(9, 6, 2, 2, colors.eye);
    p(9, 6, 1, 1, "#ffffff");
    p(8, 8, 2, 1, colors.mouth);
    p(6, 9, 6, 1, colors.trim);
    p(6, 10, 6, 4, colors.shirt);
    p(6, 12, 6, 1, colors.stripe);
    p(4, 10 + step, 2, 3, colors.skin);
    p(6, 14, 6, 3, colors.shorts);
    if (step === 0) {
      p(6, 17, 2, 2, colors.skin);
      p(9, 17, 2, 2, colors.skin);
      p(5, 19, 3, 1, colors.shoe);
      p(9, 19, 3, 1, colors.sole);
    } else {
      p(7, 17, 2, 2, colors.skin);
      p(5, 18, 2, 1, colors.skin);
      p(8, 19, 3, 1, colors.sole);
      p(4, 19, 3, 1, colors.shoe);
    }
    if (ponytail) {
      p(3, 4, 2, 1, colors.hair);
      p(2, 5, 2, 4, colors.hair);
    }
    return;
  }

  p(4, 1, 8, 1, colors.cap);
  p(3, 2, 10, 2, colors.cap);
  p(5, 2, 4, 1, colors.panel);
  p(4, 4, 8, 1, colors.hair);
  p(4, 5, 8, 4, colors.skin);
  p(5, 6, 2, 2, colors.eye);
  p(9, 6, 2, 2, colors.eye);
  p(5, 6, 1, 1, "#ffffff");
  p(9, 6, 1, 1, "#ffffff");
  p(7, 8, 2, 1, colors.mouth);
  p(3, 9, 10, 1, colors.trim);
  p(4, 10, 8, 4, colors.shirt);
  p(4, 12, 8, 1, colors.stripe);
  p(2, 10 + step, 2, 3, colors.skin);
  p(12, 10 + ((step + 1) % 2), 2, 3, colors.skin);
  p(4, 14, 8, 3, colors.shorts);
  if (step === 0) {
    p(4, 17, 3, 2, colors.skin);
    p(9, 17, 3, 2, colors.skin);
    p(3, 19, 4, 1, colors.shoe);
    p(9, 19, 4, 1, colors.shoe);
    p(3, 19, 2, 1, colors.sole);
    p(11, 19, 2, 1, colors.sole);
  } else {
    p(3, 17, 3, 2, colors.skin);
    p(10, 17, 3, 2, colors.skin);
    p(2, 19, 4, 1, colors.shoe);
    p(10, 19, 4, 1, colors.shoe);
    p(2, 19, 2, 1, colors.sole);
    p(12, 19, 2, 1, colors.sole);
  }
  if (ponytail) {
    p(12, 4, 2, 1, colors.hair);
    p(13, 5, 2, 4, colors.hair);
    p(14, 9, 1, 2, colors.hair);
  }
}

/** Six frames in a row: down, down-step, up, up-step, side, side-step. */
export function makeRunnerSheet(palette, gender) {
  const canvas = document.createElement("canvas");
  canvas.width = 16 * 6;
  canvas.height = 20;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const poses = ["down", "down", "up", "up", "side", "side"];
  poses.forEach((pose, index) => {
    drawRunnerSprite(ctx, index * 16, 0, pose, index % 2, palette, gender);
  });
  return canvas;
}

/**
 * Title-screen runner, bigger on purpose, one arm up. Frame 1 lifts the
 * hand a pixel so the wave reads at a glance.
 */
export function paintWave(canvas, gender, frame) {
  const scale = 3;
  const w = 24;
  const h = 32;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const tiny = document.createElement("canvas");
  tiny.width = w;
  tiny.height = h;
  const t = tiny.getContext("2d");
  const pal = gender === "female" ? PALETTES.female : PALETTES.male;
  const p = (x, y, ww, hh, color) => ink(t, x, y, ww, hh, color);
  const lift = frame % 2 === 0 ? 0 : -1;
  p(6, 2, 12, 2, pal.cap);
  p(5, 4, 14, 3, pal.cap);
  p(8, 4, 6, 2, pal.panel);
  p(7, 7, 10, 2, pal.hair);
  p(7, 9, 10, 6, pal.skin);
  p(9, 11, 2, 2, pal.eye);
  p(13, 11, 2, 2, pal.eye);
  p(9, 11, 1, 1, "#ffffff");
  p(13, 11, 1, 1, "#ffffff");
  p(11, 14, 3, 1, pal.mouth);
  p(6, 15, 12, 2, pal.trim);
  p(7, 17, 10, 6, pal.shirt);
  p(7, 20, 10, 2, pal.stripe);
  p(4, 18, 3, 4, pal.skin);
  p(17, 12 + lift, 3, 5, pal.skin);
  p(18, 8 + lift, 3, 4, pal.skin);
  p(18, 7 + lift, 3, 2, pal.skin);
  p(7, 23, 10, 4, pal.shorts);
  p(8, 27, 3, 3, pal.skin);
  p(13, 27, 3, 3, pal.skin);
  p(7, 30, 4, 2, pal.shoe);
  p(13, 30, 4, 2, pal.shoe);
  p(7, 31, 4, 1, pal.sole);
  p(13, 31, 4, 1, pal.sole);
  if (gender === "female") {
    p(16, 8, 3, 2, pal.hair);
    p(18, 10, 3, 5, pal.hair);
  }
  ctx.drawImage(tiny, 0, 0, w * scale, h * scale);
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
    const rows = GLYPHS[letter];
    rows.forEach((row, y) => {
      [...row].forEach((bit, x) => {
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
  ctx.fillStyle = "#1d4ed8";
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
    const rows = MINI[ch] || MINI[" "];
    rows.forEach((row, yy) => {
      [...row].forEach((bit, xx) => {
        if (bit === "1") ink(ctx, x + (cursor + xx) * scale, y + yy * scale, scale, scale, color);
      });
    });
    cursor += 4;
  }
  return cursor * scale;
}

function tileVariant(x, y) {
  return (x * 13 + y * 7) % 5;
}

function drawGrass(ctx, px, py, x, y) {
  ink(ctx, px, py, 16, 16, (x + y) % 2 === 0 ? "#5eae45" : "#67b84c");
  ink(ctx, px + 2, py + 3, 2, 2, "#4c9838");
  ink(ctx, px + 11, py + 9, 2, 1, "#8ed36a");
  if (tileVariant(x, y) === 0) ink(ctx, px + 7, py + 12, 1, 2, "#d7e48a");
}

function drawRoad(ctx, px, py, x, y, ground) {
  ink(ctx, px, py, 16, 16, "#8d929a");
  ink(ctx, px, py, 16, 16, "#9aa0a8");
  const neighbor = (dx, dy) => {
    const code = ground[y + dy]?.[x + dx];
    return code === "r" || code === "x" || code === "d";
  };
  ink(ctx, px + 1, py + 1, 14, 14, "#8e949c");
  if (!neighbor(0, -1)) ink(ctx, px, py, 16, 2, "#5e646c");
  if (!neighbor(0, 1)) ink(ctx, px, py + 14, 16, 2, "#5e646c");
  if (!neighbor(-1, 0)) ink(ctx, px, py, 2, 16, "#5e646c");
  if (!neighbor(1, 0)) ink(ctx, px + 14, py, 2, 16, "#5e646c");
  const horizontal = neighbor(-1, 0) && neighbor(1, 0);
  const vertical = neighbor(0, -1) && neighbor(0, 1);
  if (horizontal && !vertical && x % 2 === 0) ink(ctx, px + 4, py + 7, 8, 2, "#f2f2ea");
  if (vertical && !horizontal && y % 2 === 0) ink(ctx, px + 7, py + 4, 2, 8, "#f2f2ea");
}

function drawDirt(ctx, px, py, x, y) {
  ink(ctx, px, py, 16, 16, "#c4a36a");
  ink(ctx, px + ((x * 3) % 10), py + ((y * 5) % 10), 2, 2, "#a8844e");
  ink(ctx, px + 12, py + 4, 2, 1, "#ddc08a");
}

function drawTree(ctx, px, py) {
  drawGrass(ctx, px, py, 1, 1);
  ink(ctx, px + 6, py + 9, 4, 6, "#6b4428");
  ink(ctx, px + 2, py + 3, 12, 8, "#2f7a32");
  ink(ctx, px + 4, py + 1, 8, 4, "#3e9440");
  ink(ctx, px + 5, py + 4, 3, 2, "#8ed36a");
}

function drawFlowers(ctx, px, py, x, y) {
  drawGrass(ctx, px, py, x, y);
  const colors = ["#f2f2f2", "#f2c14e", "#e15b4c", "#d6e27a"];
  ink(ctx, px + 3, py + 8, 2, 2, colors[(x + y) % 4]);
  ink(ctx, px + 9, py + 5, 2, 2, colors[(x * 2 + y) % 4]);
  ink(ctx, px + 6, py + 11, 2, 2, colors[(x + y * 3) % 4]);
}

function drawWater(ctx, px, py, frame) {
  ink(ctx, px, py, 16, 16, frame ? "#3f92c8" : "#327fba");
  const shift = frame ? 4 : 0;
  ink(ctx, px + 2 + shift, py + 4, 6, 2, "#8fd0ea");
  ink(ctx, px + 8 - shift, py + 10, 5, 2, "#d4f2fb");
}

function drawTrack(ctx, px, py, x, y) {
  ink(ctx, px, py, 16, 16, "#d24b45");
  ink(ctx, px, py + 14, 16, 2, "#f4f4f4");
  if ((x + y) % 2 === 0) ink(ctx, px + 2, py + 3, 3, 1, "#f0b4b0");
}

function drawInfield(ctx, px, py) {
  ink(ctx, px, py, 16, 16, "#3f8f45");
  ink(ctx, px + 4, py + 6, 2, 2, "#67b84c");
}

function drawRock(ctx, px, py, x, y) {
  ink(ctx, px, py, 16, 16, "#7d868e");
  ink(ctx, px + 2, py + 3, 10, 8, (x + y) % 2 ? "#9aa3ab" : "#6c757d");
  ink(ctx, px + 4, py + 5, 4, 2, "#c5ced6");
  ink(ctx, px + 3, py + 12, 8, 2, "#5c656d");
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
      drawTree(ctx, px, py);
      break;
    case "f":
      drawFlowers(ctx, px, py, x, y);
      break;
    case "w":
      drawWater(ctx, px, py, waterFrame);
      break;
    case "k":
      drawTrack(ctx, px, py, x, y);
      break;
    case "i":
      drawInfield(ctx, px, py);
      break;
    case "o":
      drawRock(ctx, px, py, x, y);
      break;
    case "n":
      drawDirt(ctx, px, py, x, y);
      break;
    default:
      drawGrass(ctx, px, py, x, y);
  }
}

function drawSign(ctx, x, y, text) {
  const width = text.length * 4 + 6;
  ink(ctx, x, y, width, 9, "#6b4428");
  ink(ctx, x + 1, y + 1, width - 2, 7, "#f3e2c0");
  paintMiniText(ctx, text, x + 3, y + 2, "#2a2118", 1);
}

function brickWall(ctx, x, y, w, h, mortar = "#e7c9a4") {
  ink(ctx, x, y, w, h, "#c46a4a");
  for (let row = 0; row < h; row += 4) {
    ink(ctx, x, y + row, w, 1, mortar);
    const offset = (row / 4) % 2 === 0 ? 0 : 4;
    for (let col = offset; col < w; col += 8) ink(ctx, x + col, y + row, 1, 4, mortar);
  }
}

function roof(ctx, x, y, w, h, color, dark) {
  ink(ctx, x, y, w, h, color);
  for (let row = 0; row < h; row += 4) ink(ctx, x, y + row, w, 1, dark);
  for (let col = 0; col < w; col += 6) ink(ctx, x + col, y, 1, h, dark);
}

function windowPane(ctx, x, y) {
  ink(ctx, x, y, 10, 8, "#9fd8ea");
  ink(ctx, x + 4, y, 2, 8, "#f7fbfc");
  ink(ctx, x, y + 3, 10, 2, "#f7fbfc");
}

function drawHome(ctx, originX, originY) {
  ink(ctx, originX, originY, 112, 80, "#6fbf4e");
  ink(ctx, originX + 6, originY + 10, 100, 64, "#d8b072");
  ink(ctx, originX + 6, originY + 10, 100, 3, "#8a6238");
  ink(ctx, originX + 6, originY + 71, 100, 3, "#8a6238");
  ink(ctx, originX + 6, originY + 10, 3, 64, "#8a6238");
  ink(ctx, originX + 103, originY + 10, 3, 64, "#8a6238");
  roof(ctx, originX + 28, originY + 16, 58, 18, "#b33a32", "#7d241e");
  ink(ctx, originX + 48, originY + 8, 6, 12, "#6e5444");
  brickWall(ctx, originX + 32, originY + 32, 50, 34, "#f0d2b4");
  ink(ctx, originX + 50, originY + 46, 14, 20, "#2f6b3a");
  ink(ctx, originX + 60, originY + 54, 2, 2, "#f2d56a");
  windowPane(ctx, originX + 36, originY + 40);
  drawSign(ctx, originX + 40, originY + 4, "HOME");
}

function drawGrocery(ctx, originX, originY) {
  ink(ctx, originX, originY, 128, 80, "#67b84c");
  roof(ctx, originX + 16, originY + 8, 96, 16, "#8d3a32", "#5e221c");
  brickWall(ctx, originX + 20, originY + 24, 88, 40, "#f3d7c0");
  ink(ctx, originX + 18, originY + 40, 92, 8, "#2f6b3a");
  ink(ctx, originX + 18, originY + 48, 92, 8, "#f4f4f4");
  ink(ctx, originX + 18, originY + 40, 92, 2, "#f4f4f4");
  ink(ctx, originX + 54, originY + 52, 16, 12, "#214e8f");
  ink(ctx, originX + 28, originY + 56, 16, 8, "#c44732");
  ink(ctx, originX + 30, originY + 54, 4, 4, "#e23d3d");
  ink(ctx, originX + 36, originY + 54, 4, 4, "#f2c14e");
  ink(ctx, originX + 86, originY + 56, 16, 8, "#3d9a4a");
  drawSign(ctx, originX + 36, originY + 18, "GROCERY");
}

function drawGym(ctx, originX, originY) {
  ink(ctx, originX, originY, 112, 112, "#5eae45");
  roof(ctx, originX + 14, originY + 18, 84, 16, "#3c4654", "#232a33");
  brickWall(ctx, originX + 18, originY + 34, 76, 58, "#e7c2a4");
  ink(ctx, originX + 46, originY + 62, 20, 30, "#2a4f8f");
  ink(ctx, originX + 54, originY + 74, 2, 2, "#f2d56a");
  windowPane(ctx, originX + 26, originY + 48);
  windowPane(ctx, originX + 74, originY + 48);
  ink(ctx, originX + 78, originY + 28, 16, 6, "#d0d4da");
  ink(ctx, originX + 84, originY + 24, 4, 14, "#d0d4da");
  drawSign(ctx, originX + 44, originY + 6, "GYM");
}

function drawStore(ctx, originX, originY) {
  ink(ctx, originX, originY, 112, 80, "#67b84c");
  roof(ctx, originX + 16, originY + 6, 80, 16, "#b33a32", "#7d241e");
  brickWall(ctx, originX + 20, originY + 22, 72, 42, "#f0d2b4");
  for (let i = 0; i < 8; i += 1) {
    ink(ctx, originX + 18 + i * 10, originY + 36, 8, 8, i % 2 ? "#2a4f8f" : "#f4f4f4");
  }
  ink(ctx, originX + 46, originY + 46, 18, 18, "#214e8f");
  ink(ctx, originX + 28, originY + 48, 12, 6, "#f7f7f7");
  ink(ctx, originX + 30, originY + 46, 8, 3, "#2aa6a0");
  drawSign(ctx, originX + 28, originY + 24, "RUN STORE");
}

function drawFountain(ctx) {
  const x = 17 * TILE;
  const y = 14 * TILE;
  ink(ctx, x + 4, y + 4, 24, 24, "#cfc6b8");
  ink(ctx, x + 8, y + 8, 16, 16, "#d9d2c6");
  drawWater(ctx, x + 8, y + 8, 0);
  ink(ctx, x + 14, y + 2, 4, 8, "#9aa3ab");
}

function drawGate(ctx, open) {
  const x = 30 * TILE;
  const y = 6 * TILE;
  ink(ctx, x, y, 16, 16, open ? "#c4a36a" : "#6b4428");
  if (!open) {
    ink(ctx, x + 2, y + 2, 5, 12, "#8a6238");
    ink(ctx, x + 9, y + 2, 5, 12, "#8a6238");
    ink(ctx, x + 2, y + 4, 12, 2, "#d8b072");
    ink(ctx, x + 2, y + 10, 12, 2, "#d8b072");
  } else {
    ink(ctx, x, y + 2, 4, 12, "#8a6238");
    ink(ctx, x + 12, y + 2, 4, 12, "#8a6238");
  }
  drawSign(ctx, 27 * TILE + 2, 2 * TILE, "MOUNTAIN");
}

function drawParkSign(ctx) {
  drawSign(ctx, 18 * TILE - 8, 22 * TILE - 10, "PARK");
}

function drawTrackSign(ctx) {
  drawSign(ctx, 27 * TILE, 10 * TILE - 8, "TRACK");
  ink(ctx, 26 * TILE + 2, 11 * TILE + 2, 12, 14, "#6b4428");
  ink(ctx, 26 * TILE + 4, 11 * TILE + 4, 8, 8, "#f3e2c0");
  paintMiniText(ctx, "5K", 26 * TILE + 4, 11 * TILE + 6, "#2a2118", 1);
}

function drawCityPost(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ink(ctx, x + 7, y + 6, 3, 10, "#6b4428");
  ink(ctx, x + 2, y + 1, 12, 8, "#f3e2c0");
  ink(ctx, x + 2, y + 1, 12, 2, "#1d4ed8");
  paintMiniText(ctx, "BC", x + 4, y + 4, "#1c1a16", 1);
}

function drawDepot(ctx) {
  const x = 19 * TILE + 2;
  const y = 16 * TILE;
  ink(ctx, x + 6, y, 3, 16, "#6b4428");
  ink(ctx, x, y, 22, 10, "#f3e2c0");
  ink(ctx, x, y, 22, 2, "#6b4428");
  paintMiniText(ctx, "DEPOT", x + 2, y + 3, "#2a2118", 1);
}

function drawBanner(ctx) {
  const x = 27 * TILE;
  const y = 12 * TILE;
  ink(ctx, x + 2, y, 2, 16, "#f4f4f4");
  ink(ctx, x + 4, y, 10, 6, "#e23b3b");
  ink(ctx, x + 4, y + 6, 8, 4, "#f2c14e");
}

function drawExtraFlowers(ctx) {
  drawFlowers(ctx, 13 * TILE, 12 * TILE, 13, 12);
  drawFlowers(ctx, 22 * TILE, 17 * TILE, 22, 17);
  drawFlowers(ctx, 14 * TILE, 18 * TILE, 14, 18);
}

function drawTrailMarker(ctx) {
  ink(ctx, 16 * TILE + 4, 23 * TILE - 6, 3, 8, "#6b4428");
  ink(ctx, 16 * TILE + 2, 23 * TILE - 8, 8, 5, "#f2c14e");
}

/**
 * The whole town, painted once. Overworld turns this into a Pixi texture.
 * Water has two frames so the pond can blink without redrawing buildings.
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
  drawFountain(ctx);
  drawGate(ctx, world.mountainOpen);
  drawParkSign(ctx);
  drawTrackSign(ctx);
  drawDepot(ctx);
  for (const sign of CITY_SIGNS) drawCityPost(ctx, sign.tx, sign.ty);
  if (state?.milestones?.includes("banner")) drawBanner(ctx);
  if (state?.milestones?.includes("flowers")) drawExtraFlowers(ctx);
  if (state?.milestones?.includes("trail-marker")) drawTrailMarker(ctx);
  return canvas;
}

