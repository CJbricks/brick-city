/**
 * prefs.test.js
 * Mute memory is its own localStorage key. A missing or broken value
 * is "sound on, moderate volume", and writing it must not touch the
 * runner save.
 */

import { describe, expect, it } from "vitest";
import { SAVE_KEY } from "@/lib/constants";
import {
  AUDIO_KEY,
  DEFAULT_VOLUME,
  normalizeAudioPrefs,
  readAudioPrefs,
  writeAudioPrefs,
} from "@/game/audio/prefs";

function memory(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
    dump: data,
  };
}

describe("audio prefs", () => {
  it("defaults to unmuted at a moderate volume", () => {
    expect(readAudioPrefs(memory())).toEqual({ muted: false, volume: DEFAULT_VOLUME });
    expect(DEFAULT_VOLUME).toBeGreaterThan(0.2);
    expect(DEFAULT_VOLUME).toBeLessThan(0.6);
  });

  it("round-trips mute without touching the runner save", () => {
    const store = memory({ [SAVE_KEY]: "{\"version\":1,\"runner\":{\"name\":\"ADA\"}}" });
    writeAudioPrefs({ muted: true, volume: 0.5 }, store);
    expect(readAudioPrefs(store)).toEqual({ muted: true, volume: 0.5 });
    expect(store.dump[SAVE_KEY]).toBe("{\"version\":1,\"runner\":{\"name\":\"ADA\"}}");
    expect(store.dump[AUDIO_KEY]).toContain("\"muted\":true");
  });

  it("ignores broken storage and clamps a wild volume", () => {
    expect(readAudioPrefs(memory({ [AUDIO_KEY]: "not-json" }))).toEqual({
      muted: false,
      volume: DEFAULT_VOLUME,
    });
    expect(normalizeAudioPrefs({ muted: "yes", volume: 4 })).toEqual({
      muted: false,
      volume: 1,
    });
    expect(normalizeAudioPrefs({ muted: true, volume: 9 })).toEqual({ muted: true, volume: 1 });
    expect(normalizeAudioPrefs({ muted: false, volume: -3 })).toEqual({ muted: false, volume: 0 });
  });

  it("keeps the default when storage itself throws", () => {
    const broken = {
      getItem() {
        throw new Error("blocked");
      },
    };
    expect(readAudioPrefs(broken)).toEqual({ muted: false, volume: DEFAULT_VOLUME });
    expect(() => writeAudioPrefs({ muted: true, volume: 0.4 }, {
      setItem() {
        throw new Error("full");
      },
    })).not.toThrow();
  });
});
