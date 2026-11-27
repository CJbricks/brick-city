/**
 * buildingKit.js
 * One composition per building type: roof, wall, door, windows, awning.
 *
 * Why this file exists: building drawers used to mix relative offsets
 * (ox, oy) with absolute window lists from lighting.js (panes()). After
 * towns got their own layouts, those absolute panes landed on the wrong
 * wall — stacked on top of the relative windows, or floating beside the
 * door. PR #31's Ridgeview drawers added a second set of pieces on top
 * of the same idea. This kit is the single source of truth.
 *
 * Every rect is in pixels relative to the building origin (ox, oy).
 * facing: which side the door sits on (mat is one step outside).
 * Tests assert: exactly one door, no overlapping windows, all parts
 * inside the tile footprint.
 *
 * See "Building composition" in docs/NOTES.md.
 */

import { TILE } from "@/game/maps/shared";

/** Pixel rects overlap if their interiors intersect (touching edges OK). */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when rect sits fully inside the building's tile footprint. */
export function rectInsideFootprint(rect, tilesW, tilesH, pad = 0) {
  const maxW = tilesW * TILE;
  const maxH = tilesH * TILE;
  return (
    rect.x >= -pad
    && rect.y >= -pad
    && rect.x + rect.w <= maxW + pad
    && rect.y + rect.h <= maxH + pad
  );
}

/**
 * Shared compositions. Brick City and Ridgeview drawers read the same
 * door / window / roof boxes; only the paint (brick vs chalet) changes.
 */
export const BUILDING_COMPOSITIONS = {
  home: {
    tilesW: 7,
    tilesH: 5,
    facing: "south",
    roof: { x: 36, y: 26, w: 156, h: 46 },
    wall: { x: 48, y: 64, w: 132, h: 56 },
    door: { x: 100, y: 112, w: 26, h: 32 },
    windows: [
      { x: 62, y: 70, w: 22, h: 18 },
      { x: 136, y: 70, w: 22, h: 18 },
    ],
  },
  grocery: {
    tilesW: 8,
    tilesH: 5,
    facing: "south",
    roof: { x: 28, y: 16, w: 200, h: 40 },
    wall: { x: 36, y: 48, w: 184, h: 78 },
    awning: { x: 24, y: 86, w: 208, h: 18 },
    door: { x: 100, y: 5 * TILE - 36, w: 24, h: 36 },
    windows: [
      { x: 46, y: 54, w: 28, h: 16 },
      { x: 176, y: 54, w: 28, h: 16 },
    ],
  },
  gym: {
    tilesW: 7,
    tilesH: 7,
    facing: "east",
    // Roof and wall share left edge + width so shingles never overhang
    // one side and fall short on the other.
    roof: { x: 36, y: 28, w: 188, h: 52 },
    wall: { x: 36, y: 72, w: 188, h: 100 },
    door: { x: 7 * TILE - 28, y: 100, w: 24, h: 40 },
    windows: [
      { x: 46, y: 78, w: 26, h: 18 },
      { x: 96, y: 78, w: 26, h: 18 },
    ],
  },
  store: {
    tilesW: 7,
    tilesH: 5,
    facing: "north",
    // Door on the north lip (street). Awning just above the door head.
    // Roof/wall below the awning — never a floating piece above the mat.
    door: { x: 100, y: 0, w: 24, h: 32 },
    awning: { x: 20, y: 34, w: 184, h: 14 },
    roof: { x: 28, y: 48, w: 168, h: 36 },
    wall: { x: 36, y: 78, w: 152, h: 5 * TILE - 88 },
    windows: [
      { x: 40, y: 86, w: 26, h: 16 },
      { x: 156, y: 86, w: 26, h: 16 },
    ],
  },
  clinic: {
    tilesW: 6,
    tilesH: 4,
    facing: "north",
    roof: { x: 20, y: 36, w: 152, h: 40 },
    wall: { x: 28, y: 68, w: 136, h: 56 },
    door: { x: 72, y: 2, w: 28, h: 32 },
    windows: [
      { x: 108, y: 78, w: 28, h: 22 },
    ],
  },
  cafe: {
    tilesW: 8,
    tilesH: 4,
    facing: "north",
    roof: { x: 16, y: 20, w: 224, h: 28 },
    wall: { x: 20, y: 42, w: 216, h: 80 },
    door: { x: 100, y: 2, w: 26, h: 30 },
    // One wide shop window (roaster sits inside). Not two stacked panes.
    windows: [
      { x: 30, y: 50, w: 88, h: 44 },
    ],
  },
};

export function compositionFor(id) {
  return BUILDING_COMPOSITIONS[id] || null;
}

export function knownBuildingIds() {
  return Object.keys(BUILDING_COMPOSITIONS);
}

/**
 * Validate a composition. Returns a list of problem strings (empty = ok).
 * Used by tests and as a checklist when editing a building.
 */
export function auditComposition(id, comp = compositionFor(id)) {
  const problems = [];
  if (!comp) {
    problems.push(`${id}: missing composition`);
    return problems;
  }
  if (!comp.door) problems.push(`${id}: missing door`);
  if (comp.door) {
    const doors = [comp.door];
    if (doors.length !== 1) problems.push(`${id}: expected exactly one door`);
    if (!rectInsideFootprint(comp.door, comp.tilesW, comp.tilesH, 4)) {
      problems.push(`${id}: door outside footprint`);
    }
  }
  const windows = comp.windows || [];
  for (let i = 0; i < windows.length; i += 1) {
    if (!rectInsideFootprint(windows[i], comp.tilesW, comp.tilesH, 4)) {
      problems.push(`${id}: window ${i} outside footprint`);
    }
    for (let j = i + 1; j < windows.length; j += 1) {
      if (rectsOverlap(windows[i], windows[j])) {
        problems.push(`${id}: windows ${i} and ${j} overlap`);
      }
    }
    if (comp.door && rectsOverlap(windows[i], comp.door)) {
      problems.push(`${id}: window ${i} overlaps door`);
    }
  }
  if (comp.roof && comp.wall) {
    // Roof should cover the wall width (allow 8px eave slack).
    const roofLeft = comp.roof.x;
    const roofRight = comp.roof.x + comp.roof.w;
    const wallLeft = comp.wall.x;
    const wallRight = comp.wall.x + comp.wall.w;
    if (roofLeft > wallLeft + 8 || roofRight < wallRight - 8) {
      problems.push(`${id}: roof not aligned to wall width`);
    }
  }
  for (const part of ["roof", "wall", "awning"]) {
    if (!comp[part]) continue;
    if (!rectInsideFootprint(comp[part], comp.tilesW, comp.tilesH, 12)) {
      problems.push(`${id}: ${part} outside footprint`);
    }
  }
  return problems;
}

export function auditAllCompositions() {
  const all = [];
  for (const id of knownBuildingIds()) {
    all.push(...auditComposition(id));
  }
  return all;
}
