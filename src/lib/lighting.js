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
 * Window rectangles live here, and art.js paints the glass at the same
 * spots. One list means the glow cannot drift off the pane.
 */

import { TILE } from "@/game/town";

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
 * Pixel positions for the night layer. Lamp y is the base of the post
 * (where it meets the grass). The bulb sits about 28px above that.
 */
export function townLights() {
  const T = TILE;
  const home = { x: 2 * T, y: 2 * T };
  const grocery = { x: 14 * T, y: 2 * T };
  const gym = { x: 2 * T, y: 11 * T };
  const store = { x: 2 * T, y: 23 * T };
  return {
    windows: [
      window("home", home.x + 62, home.y + 70, 22, 18),
      window("home", home.x + 136, home.y + 70, 22, 18),
      window("grocery", grocery.x + 46, grocery.y + 54, 28, 16),
      window("grocery", grocery.x + 176, grocery.y + 54, 28, 16),
      window("gym", gym.x + 46, gym.y + 78, 26, 18),
      window("gym", gym.x + 96, gym.y + 78, 26, 18),
      window("store", store.x + 36, store.y + 22, 26, 16),
      window("store", store.x + 156, store.y + 22, 26, 16),
    ],
    lanterns: [
      { id: "home", x: home.x + 112, y: home.y + 108, r: 14 },
      { id: "grocery", x: grocery.x + 128, y: grocery.y + 96, r: 18 },
      { id: "store", x: store.x + 112, y: store.y + 8, r: 16 },
      { id: "gym", x: gym.x + 198, y: gym.y + 108, r: 16 },
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
    ],
  };
}

export function glowAnchors() {
  const lights = townLights();
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
