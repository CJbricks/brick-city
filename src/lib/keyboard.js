/**
 * keyboard.js
 * Shared "is the player typing?" check for global hotkeys.
 *
 * Mute (M), map (P), inventory (I), WASD, and Z/X live on window
 * listeners. Without this guard they steal letters from Nick Names
 * and any other text field. Keep the rule in one place so audio and
 * the play screen stay in sync.
 */

/**
 * True when the focused element is a native text field.
 * contenteditable is included for completeness; Brick City does not
 * use it today.
 */
export function isTextEntryFocus(doc) {
  if (!doc || !doc.activeElement) return false;
  const el = doc.activeElement;
  const tag = String(el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * True when game / audio hotkeys must ignore this keydown.
 * Why: the mute handler runs in the capture phase and used to eat M
 * before the Nick Names <input> could receive it. Also covers the
 * name grid (no native input) and an open cheat box before focus lands.
 *
 * @param {Document | { activeElement?: Element | null, querySelector?: Function } | null} doc
 */
export function shouldIgnoreGameHotkey(doc) {
  if (!doc) return false;
  if (isTextEntryFocus(doc)) return true;
  // Name grid types letters with its own window handler, not an <input>.
  if (typeof doc.querySelector === "function" && doc.querySelector("[data-testid='name-screen']")) {
    return true;
  }
  // Cheat box open: skip hotkeys even if focus has not reached the field yet.
  if (typeof doc.querySelector === "function" && doc.querySelector("[data-testid='cheat-input']")) {
    return true;
  }
  return false;
}
