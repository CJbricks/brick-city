/**
 * prefs.js
 * Mute and volume, stored on their own.
 *
 * This is not brick-city-save-v1. A runner saved before music existed
 * has no audio fields, and we never add any. Missing, broken, or
 * unavailable storage means the same thing: sound on, at a moderate
 * volume. 0.38 is loud enough to follow a melody and quiet enough that
 * two pulse waves plus a drum do not shout.
 */

export const AUDIO_KEY = "brick-city-audio-v1";

export const DEFAULT_VOLUME = 0.38;

export function defaultAudioPrefs() {
  return { muted: false, volume: DEFAULT_VOLUME };
}

export function normalizeAudioPrefs(value) {
  const base = defaultAudioPrefs();
  if (!value || typeof value !== "object") return base;
  const muted = typeof value.muted === "boolean" ? value.muted : base.muted;
  const volume = typeof value.volume === "number" && Number.isFinite(value.volume)
    ? Math.min(1, Math.max(0, value.volume))
    : base.volume;
  return { muted, volume };
}

function storageOr(storage) {
  if (storage) return storage;
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function readAudioPrefs(storage) {
  const store = storageOr(storage);
  if (!store) return defaultAudioPrefs();
  try {
    const raw = store.getItem(AUDIO_KEY);
    if (!raw) return defaultAudioPrefs();
    return normalizeAudioPrefs(JSON.parse(raw));
  } catch {
    return defaultAudioPrefs();
  }
}

export function writeAudioPrefs(prefs, storage) {
  const store = storageOr(storage);
  if (!store) return;
  try {
    store.setItem(AUDIO_KEY, JSON.stringify(normalizeAudioPrefs(prefs)));
  } catch {
    // A full or blocked localStorage should not take the game down.
    // The toggle still works until the tab closes.
  }
}
