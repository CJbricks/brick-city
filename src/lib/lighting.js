/**
 * lighting.js
 * How Brick City looks at each time of day.
 *
 * The calendar still has the gameplay names (Morning, Midday, Afternoon,
 * Evening, Night, and a "spent" night when energy hits 0). This file is
 * only the paint. Slot 3 is Evening on the HUD and a golden sunset on
 * the map. Slot 4 is the late evening the HUD calls Night; we paint it
 * as dusk. Slot 5 is the spent night.
 *
 * Overworld draws two layers from this:
 * 1. A vertical grade over the whole screen (sky color at the top, ground
 *    color at the bottom). That is the mood.
 * 2. On dusk and night only, warm glows for windows, storefront lanterns,
 *    and streetlamps. Those glows are drawn AFTER the grade and added
 *    on top, so the dark wash does not swallow the lamps.
 *
 * Window rectangles come from buildingKit.js compositions, offset by
 * each building's map origin. That keeps the night glow on the same
 * pane art.js paints — absolute panes() lists were the stacked-window
 * bug when towns moved their footprints.
 */

import { TILE, BUILDINGS } from "@/game/town";
import { compositionFor, knownBuildingIds } from "@/game/buildingKit";

export const MOODS = [
  {
    name: "Morning",
    sky: "rgba(186, 224, 252, 0.18)",
    mid: "rgba(255, 248, 230, 0.05)",
    ground: "rgba(255, 255, 255, 0)",
    glow: false,
    strength: 0,
  },
  {
    name: "Midday",
    sky: "rgba(255, 246, 214, 0.12)",
    mid: "rgba(255, 236, 190, 0.06)",
    ground: "rgba(255, 228, 170, 0.08)",
    glow: false,
    strength: 0,
  },
  {
    name: "Afternoon",
    sky: "rgba(255, 206, 140, 0.18)",
    mid: "rgba(255, 186, 110, 0.12)",
    ground: "rgba(244, 160, 80, 0.14)",
    glow: false,
    strength: 0,
  },
  {
    name: "Golden Sunset",
    sky: "rgba(255, 132, 54, 0.30)",
    mid: "rgba(232, 96, 40, 0.22)",
    ground: "rgba(176, 54, 24, 0.26)",
    glow: false,
    strength: 0,
  },
  {
    name: "Dusk",
    sky: "rgba(36, 42, 110, 0.40)",
    mid: "rgba(22, 26, 78, 0.46)",
    ground: "rgba(10, 14, 42, 0.52)",
    glow: true,
    strength: 0.8,
  },
  {
    name: "Night",
    sky: "rgba(8, 12, 36, 0.55)",
    mid: "rgba(6, 8, 28, 0.62)",
    ground: "rgba(3, 5, 16, 0.70)",
    glow: true,
    strength: 1,
  },
];

export function lightingForSlot(slot) {
  const index = Number.isFinite(slot) ? slot : 0;
  const safe = Math.max(0, Math.min(MOODS.length - 1, index));
  return MOODS[safe];
}

function window(id, x, y, w, h) {
  return { id, x, y, w, h, r: Math.round(Math.max(w, h) * 0.85) };
}

/**
 * Pixel positions for the night layer. Pass the active world's buildings
 * so Ridgeview / Flatland glows sit on their moved footprints. Defaults
 * to Brick City BUILDINGS.
 */
export function townLights(buildings = BUILDINGS) {
  const byId = Object.fromEntries((buildings || []).map((b) => [b.id, b]));
  const windows = [];
  for (const id of knownBuildingIds()) {
    const building = byId[id];
    const comp = compositionFor(id);
    if (!building || !comp) continue;
    const ox = building.x * TILE;
    const oy = building.y * TILE;
    for (const pane of comp.windows || []) {
      windows.push(window(id, ox + pane.x, oy + pane.y, pane.w, pane.h));
    }
  }

  const home = byId.home || { x: 2, y: 2 };
  const grocery = byId.grocery || { x: 14, y: 2 };
  const gym = byId.gym || { x: 2, y: 11 };
  const store = byId.store || { x: 2, y: 23 };
  const T = TILE;
  return {
    windows,
    lanterns: [
      { id: "home", x: home.x * T + 112, y: home.y * T + 108, r: 14 },
      { id: "grocery", x: grocery.x * T + 128, y: grocery.y * T + 96, r: 18 },
      { id: "store", x: store.x * T + 112, y: store.y * T + 48, r: 16 },
      { id: "gym", x: gym.x * T + 188, y: gym.y * T + 108, r: 16 },
    ],
    lamps: [
      { x: 9 * T + 16, y: 7 * T + 28, r: 30 },
      { x: 12 * T + 16, y: 7 * T + 28, r: 30 },
      { x: 23 * T + 16, y: 7 * T + 28, r: 30 },
      { x: 26 * T + 16, y: 7 * T + 28, r: 30 },
      { x: 9 * T + 16, y: 19 * T + 28, r: 30 },
      { x: 12 * T + 16, y: 22 * T + 28, r: 30 },
      { x: 23 * T + 16, y: 19 * T + 28, r: 30 },
      { x: 26 * T + 16, y: 22 * T + 28, r: 30 },
      { x: 48 * T + 16, y: 7 * T + 28, r: 30 },
      { x: 52 * T + 16, y: 13 * T + 28, r: 28 },
      { x: 50 * T + 16, y: 28 * T + 28, r: 30 },
      { x: 58 * T + 16, y: 23 * T + 28, r: 28 },
    ],
  };
}

export function glowAnchors(buildings = BUILDINGS) {
  const lights = townLights(buildings);
  return {
    windows: lights.windows.map((pane) => ({
      x: pane.x + pane.w / 2,
      y: pane.y + pane.h / 2,
      r: pane.r,
    })),
    lanterns: lights.lanterns.map((lantern) => ({ x: lantern.x, y: lantern.y, r: lantern.r })),
    lamps: lights.lamps.map((lamp) => ({
      x: lamp.x,
      y: lamp.y - 28,
      r: lamp.r,
    })),
  };
}
