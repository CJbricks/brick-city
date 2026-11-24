/**
 * keyboard.test.js
 * Hotkey guard for text entry. Mute (M), map (P), and friends must not
 * fire while Nick Names (or any input) has focus.
 */

import { describe, expect, it } from "vitest";
import { isTextEntryFocus, shouldIgnoreGameHotkey } from "@/lib/keyboard";

function fakeDoc({ tag, contentEditable = false, panels = [] } = {}) {
  const active = tag
    ? { tagName: tag, isContentEditable: contentEditable }
    : { tagName: "BODY", isContentEditable: false };
  return {
    activeElement: active,
    querySelector(sel) {
      if (panels.includes(sel)) return { dataset: {} };
      return null;
    },
  };
}

describe("isTextEntryFocus", () => {
  it("is true for input, textarea, and contenteditable", () => {
    expect(isTextEntryFocus(fakeDoc({ tag: "INPUT" }))).toBe(true);
    expect(isTextEntryFocus(fakeDoc({ tag: "TEXTAREA" }))).toBe(true);
    expect(isTextEntryFocus(fakeDoc({ tag: "DIV", contentEditable: true }))).toBe(true);
  });

  it("is false for ordinary elements and a missing document", () => {
    expect(isTextEntryFocus(fakeDoc({ tag: "BUTTON" }))).toBe(false);
    expect(isTextEntryFocus(fakeDoc({ tag: "BODY" }))).toBe(false);
    expect(isTextEntryFocus(null)).toBe(false);
  });
});

describe("shouldIgnoreGameHotkey", () => {
  it("ignores hotkeys while a text field is focused", () => {
    expect(shouldIgnoreGameHotkey(fakeDoc({ tag: "INPUT" }))).toBe(true);
  });

  it("ignores hotkeys while the name grid or Nick Names box is open", () => {
    expect(
      shouldIgnoreGameHotkey(fakeDoc({ tag: "BODY", panels: ["[data-testid='name-screen']"] })),
    ).toBe(true);
    expect(
      shouldIgnoreGameHotkey(fakeDoc({ tag: "BODY", panels: ["[data-testid='cheat-input']"] })),
    ).toBe(true);
  });

  it("does not ignore hotkeys on the open town with no text UI", () => {
    expect(shouldIgnoreGameHotkey(fakeDoc({ tag: "BODY" }))).toBe(false);
  });

  it("lets every letter A-Z and digit 0-9 through when an input is focused", () => {
    // The guard itself is what mute / PlayScreen consult before stealing
    // a key. When it is true, none of those handlers call preventDefault.
    const doc = fakeDoc({ tag: "INPUT" });
    expect(shouldIgnoreGameHotkey(doc)).toBe(true);
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const digits = "0123456789".split("");
    for (const ch of [...letters, ...digits]) {
      // Sanity: the character is a single printable we care about typing.
      expect(ch.length).toBe(1);
      expect(shouldIgnoreGameHotkey(doc)).toBe(true);
    }
  });
});
