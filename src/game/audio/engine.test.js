/**
 * engine.test.js
 * The unlock path, without a speaker. Browsers only start audio inside
 * a user gesture, and iOS Safari ignores resume() unless it is called
 * synchronously from touchend or click. These fakes record that order.
 */

import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_VOLUME } from "@/game/audio/prefs";
import {
  UNLOCK_EVENTS,
  getAudioState,
  installAudio,
  resetAudioForTests,
  setMusicCue,
  unlockAudio,
} from "@/game/audio/engine";
import { shouldIgnoreGameHotkey } from "@/lib/keyboard";

function param() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}

class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = {};
    this.log = [];
    this.gains = [];
    this.onstatechange = null;
    // Resolved later so a test can prove resume() itself was synchronous.
    this.holdResume = false;
    this.release = null;
  }

  resume() {
    this.log.push("resume");
    if (this.holdResume) {
      return new Promise((resolve) => {
        this.release = () => {
          this.state = "running";
          if (this.onstatechange) this.onstatechange();
          resolve();
        };
      });
    }
    this.state = "running";
    if (this.onstatechange) this.onstatechange();
    return Promise.resolve();
  }

  createGain() {
    const node = { gain: param(), connect() {}, disconnect() {} };
    this.gains.push(node);
    return node;
  }

  createBuffer(_channels, length) {
    this.log.push(`buffer:${length}`);
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  }

  createBufferSource() {
    const ctx = this;
    const source = {
      buffer: null,
      loop: false,
      playbackRate: param(),
      connect() {},
      start() {
        ctx.log.push(`start:${source.buffer ? source.buffer.length : 0}`);
      },
      stop() {},
      disconnect() {},
      onended: null,
    };
    return source;
  }

  createOscillator() {
    return {
      type: "",
      frequency: param(),
      setPeriodicWave() {},
      connect() {},
      start() {},
      stop() {},
      disconnect() {},
      onended: null,
    };
  }

  createBiquadFilter() {
    return {
      type: "",
      frequency: param(),
      Q: param(),
      connect() {},
      disconnect() {},
    };
  }

  createDynamicsCompressor() {
    return {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect() {},
      disconnect() {},
    };
  }

  createPeriodicWave() {
    return {};
  }
}

function makeHost() {
  const listeners = new Map();
  let contexts = 0;
  const intervals = [];
  class CountingContext extends FakeAudioContext {
    constructor() {
      super();
      contexts += 1;
      host.context = this;
    }
  }
  const host = {
    AudioContext: CountingContext,
    context: null,
    intervals,
    document: {
      hidden: false,
      addEventListener() {},
      removeEventListener() {},
      querySelector() {
        return null;
      },
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((item) => item !== fn));
    },
    setInterval(fn) {
      intervals.push(fn);
      return intervals.length;
    },
    clearInterval() {},
    setTimeout() {
      return 0;
    },
    dispatch(type, event = {}) {
      const payload = {
        code: "KeyA",
        repeat: false,
        preventDefault() {},
        stopPropagation() {},
        ...event,
      };
      for (const fn of listeners.get(type) || []) fn(payload);
    },
    listenerTypes() {
      return [...listeners.keys()];
    },
    get contexts() {
      return contexts;
    },
  };
  return host;
}

describe("audio unlock", () => {
  afterEach(() => {
    resetAudioForTests();
  });

  it("starts silent, unmuted, and only builds a context inside the gesture", () => {
    const host = makeHost();
    installAudio({ host, storage: { getItem() { return null; } } });
    expect(getAudioState()).toMatchObject({ muted: false, volume: DEFAULT_VOLUME, unlocked: false });
    for (const type of ["pointerdown", "touchstart", "touchend", "click", "keydown"]) {
      expect(UNLOCK_EVENTS).toContain(type);
      expect(host.listenerTypes()).toContain(type);
    }
    setMusicCue("title");
    expect(host.intervals).toHaveLength(0);
    expect(host.context).toBeNull();

    host.dispatch("pointerdown");
    expect(host.contexts).toBe(1);
    expect(host.context.log[0]).toBe("resume");
    expect(host.context.log).toContain("buffer:1");
    expect(host.context.log).toContain("start:1");
    expect(host.context.gains[0].gain.value).toBeGreaterThan(0.2);
    expect(getAudioState().unlocked).toBe(true);
    expect(getAudioState().currentId).toBe("title");
    expect(host.intervals.length).toBeGreaterThan(0);
  });

  it("calls resume synchronously from touchend while the context is suspended", async () => {
    const host = makeHost();
    installAudio({ host, storage: { getItem() { return null; } } });
    setMusicCue("town");
    host.dispatch("pointerdown");
    host.context.holdResume = true;
    host.context.state = "suspended";
    const before = host.context.log.filter((entry) => entry === "resume").length;
    host.dispatch("touchend");
    const after = host.context.log.filter((entry) => entry === "resume").length;
    expect(after).toBeGreaterThan(before);
    // The silent buffer is started before the resume promise runs.
    expect(host.context.log).toContain("buffer:1");
    expect(host.context.state).toBe("suspended");
    host.context.release();
    await Promise.resolve();
    expect(host.context.state).toBe("running");
    expect(getAudioState().currentId).toBe("town");
  });

  it("unlocks from a click and a key before any await", () => {
    const host = makeHost();
    installAudio({ host, storage: { getItem() { return null; } } });
    setMusicCue("race");
    unlockAudio();
    // No host gesture yet: unlockAudio uses the installed host.
    expect(host.context).not.toBeNull();
    expect(host.context.log[0]).toBe("resume");
    host.context.state = "running";
    const resumes = host.context.log.filter((entry) => entry === "resume").length;
    host.dispatch("click");
    expect(host.context.log.filter((entry) => entry === "resume").length).toBe(resumes);
    host.context.state = "suspended";
    host.dispatch("keydown", { code: "KeyZ" });
    expect(host.context.log.filter((entry) => entry === "resume").length).toBeGreaterThan(resumes);
  });

  it("does not mute on M while a text field is focused", () => {
    const host = makeHost();
    host.document.activeElement = { tagName: "INPUT", isContentEditable: false };
    expect(shouldIgnoreGameHotkey(host.document)).toBe(true);
    installAudio({ host, storage: { getItem() { return null; } } });
    expect(getAudioState().muted).toBe(false);
    let prevented = false;
    host.dispatch("keydown", {
      code: "KeyM",
      preventDefault() {
        prevented = true;
      },
    });
    expect(getAudioState().muted).toBe(false);
    expect(prevented).toBe(false);
  });

  it("still mutes on M when nothing is typing", () => {
    const host = makeHost();
    host.document.activeElement = { tagName: "BODY", isContentEditable: false };
    installAudio({ host, storage: { getItem() { return null; } } });
    expect(getAudioState().muted).toBe(false);
    host.dispatch("keydown", { code: "KeyM" });
    expect(getAudioState().muted).toBe(true);
  });
});
