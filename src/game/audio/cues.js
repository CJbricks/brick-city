/**
 * cues.js
 * Which song the screen is asking for. The engine decides whether it
 * can start yet (a browser will not play until the first tap or key).
 *
 * Remy Calder is a real rival race, separate from the 5K and the 10K.
 * His dialogue, his start line, and a bonk choice in his mile use the
 * battle theme. Every other race uses the race theme. Menus, the map,
 * and walking stay on the town theme. The victory fanfare is not a
 * scene. The screen asks for it once, when a finish is a win.
 */

const BATTLE_RACE_IDS = new Set(["rival"]);

export function trackForScene({ screen, panel }) {
  if (screen === "title" || screen === "gender" || screen === "name") return "title";
  if (screen !== "play") return null;
  if (panel?.type === "race") {
    return BATTLE_RACE_IDS.has(panel.id) ? "battle" : "race";
  }
  if (panel?.type === "bonk") {
    return panel.action?.type === "rival" ? "battle" : "race";
  }
  if (panel?.type === "dialogue" && panel.music === "battle") return "battle";
  if (panel?.type === "dialogue" && panel.music === "race") return "race";
  return "town";
}
