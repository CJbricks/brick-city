/**
 * engine.js
 * The player and the synth. Songs live in songs.js. This file only
 * turns those notes into sound, and only after the player has tapped
 * or pressed a key.
 *
 * Browsers block audio that starts by itself. We do not even build an
 * AudioContext until that first gesture. Until then the screen can
 * still say which song it wants. The gesture plays whatever is waiting.
 *
 * One song is current. A scene change fades the old song out over a
 * short moment and fades the new one in. The old scheduler is stopped
 * immediately, so it cannot keep stacking notes on top of the new song.
 * The victory fanfare ignores a request for the town theme until the
 * fanfare ends, then the town theme comes back. A real scene change
 * (the title, or another race) may cut the fanfare off.
 */

import { trackForScene } from "@/game/audio/cues";
import { DEFAULT_VOLUME, readAudioPrefs, writeAudioPrefs } from "@/game/audio/prefs";
import { notesInRange } from "@/game/audio/scheduler";
import { SONGS } from "@/game/audio/songs";
import { isNoiseHit, pitchToHz, songDuration } from "@/game/audio/theory";

const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const FADE = 0.14;

const ENVELOPES = {
  // Fast attack, short decay, a little body left so a long note can wobble.
  pluck: { attack: 0.005, decay: 0.11, sustain: 0.16, release: 0.035 },
  soft: { attack: 0.008, decay: 0.14, sustain: 0.4, release: 0.04 },
  // Bass punches and then holds. A fully decaying bass disappears on a phone.
  bass: { attack: 0.003, decay: 0.07, sustain: 0.58, release: 0.03 },
  // Fanfare notes have to stay up for the last held chord.
  hold: { attack: 0.008, decay: 0.06, sustain: 0.7, release: 0.08 },
};

// 32 steps, 16 levels. That is the size of the Game Boy wave channel.
// A smooth triangle oscillator would sound like a synth, not a handheld.
const WAVE_TRIANGLE = [
  0, 2, 4, 6, 8, 10, 12, 14,
  15, 14, 12, 10, 8, 6, 4, 2,
  0, 2, 4, 6, 8, 10, 12, 14,
  15, 14, 12, 10, 8, 6, 4, 2,
];

const state = {
  installed: false,
  unlocked: false,
  ctx: null,
  master: null,
  muted: false,
  volume: DEFAULT_VOLUME,
  cue: null,
  currentId: null,
  victoryLock: false,
  generation: 0,
  timer: 0,
  origin: 0,
  nextSchedule: 0,
  songGain: null,
  nodes: [],
  waves: new Map(),
  noise: new Map(),
};

const listeners = new Set();

function snapshot() {
  return {
    muted: state.muted,
    volume: state.volume,
    cue: state.cue,
    currentId: state.currentId,
    unlocked: state.unlocked,
  };
}

function emit() {
  const value = snapshot();
  for (const listener of listeners) listener(value);
}

export function subscribeAudio(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

export function getAudioState() {
  return snapshot();
}

export { trackForScene };

function audible() {
  return state.muted ? 0.0001 : state.volume;
}

function applyMaster(when) {
  if (!state.master || !state.ctx) return;
  const now = when ?? state.ctx.currentTime;
  const target = audible();
  state.master.gain.cancelScheduledValues(now);
  const current = Math.max(0.0001, state.master.gain.value || 0.0001);
  state.master.gain.setValueAtTime(current, now);
  state.master.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), now + 0.04);
}

function persist() {
  writeAudioPrefs({ muted: state.muted, volume: state.volume });
  applyMaster();
  emit();
}

export function toggleMuted() {
  state.muted = !state.muted;
  persist();
}

export function setMuted(muted) {
  state.muted = Boolean(muted);
  persist();
}

/**
 * The JavaScript timer is only a reminder. The audio clock is the one
 * that places the note. We look a tenth of a second ahead so a late
 * timer still hits the right sample. That is why the music stays in
 * time when the town is also drawing frames.
 */
function pump(gen) {
  if (gen !== state.generation || !state.ctx || !state.currentId) return;
  const song = SONGS[state.currentId];
  const now = state.ctx.currentTime;
  const horizon = now + LOOKAHEAD - state.origin;
  const from = state.nextSchedule;
  const to = Math.max(from, horizon);
  if (to > from) {
    const events = notesInRange(song, from, to);
    for (const event of events) {
      try {
        playEvent(event);
      } catch {
        // One note failing should not kill the scheduler.
      }
    }
    state.nextSchedule = to;
  }
  if (!song.loop && now >= state.origin + songDuration(song) + 0.12) {
    finishSong(gen);
  }
}

function finishSong(gen) {
  if (gen !== state.generation) return;
  if (state.currentId !== "victory") return;
  state.victoryLock = false;
  const next = state.cue && state.cue !== "victory" ? state.cue : "town";
  state.cue = next;
  startPlayback(next);
}

function stopScheduler() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = 0;
  }
}

function silence(nodes, gain) {
  const ctx = state.ctx;
  if (!ctx) return;
  const now = ctx.currentTime;
  if (gain) {
    const current = Math.max(0.0001, gain.gain.value || 0.0001);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(current, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE);
  }
  // Stopping at once would click. The fade hides the cut, then we
  // actually stop the oscillators so a hidden song cannot keep running.
  window.setTimeout(() => {
    for (const node of nodes) {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
    }
    try {
      gain?.disconnect();
    } catch {
      // Already disconnected.
    }
  }, FADE * 1000 + 40);
}

function startPlayback(id) {
  if (!state.ctx || !state.unlocked) return;
  const previousGain = state.songGain;
  const previousNodes = state.nodes;
  stopScheduler();
  state.generation += 1;
  const gen = state.generation;
  if (previousGain || previousNodes.length) silence(previousNodes, previousGain);
  state.nodes = [];
  state.songGain = null;
  state.currentId = id;
  if (!id || !SONGS[id]) {
    emit();
    return;
  }
  const ctx = state.ctx;
  const songGain = ctx.createGain();
  const now = ctx.currentTime;
  songGain.gain.setValueAtTime(0.0001, now);
  songGain.gain.exponentialRampToValueAtTime(1, now + FADE);
  songGain.connect(state.master);
  state.songGain = songGain;
  // A few milliseconds in the future so the first note is not already late.
  state.origin = now + 0.03;
  state.nextSchedule = 0;
  state.timer = window.setInterval(() => pump(gen), TICK_MS);
  pump(gen);
  emit();
}

export function setMusicCue(next) {
  state.cue = next;
  if (state.victoryLock) {
    if (next === "town" || next === "victory" || next == null) return;
    state.victoryLock = false;
  }
  if (!state.unlocked) return;
  if (next === state.currentId) return;
  startPlayback(next);
}

export function playVictory() {
  state.victoryLock = true;
  if (!state.cue || state.cue === "victory") state.cue = "town";
  if (!state.unlocked) return;
  startPlayback("victory");
}

function unlock() {
  if (state.unlocked) {
    if (state.ctx && state.ctx.state === "suspended") {
      state.ctx.resume().catch(() => {});
    }
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  // Build the context inside the gesture. If this browser has no Web
  // Audio, leave the flag unset so a later tap can try again, and do
  // not let the error swallow the click that opened the game.
  try {
    const ctx = new AudioCtx();
    state.ctx = ctx;
    state.unlocked = true;
    buildOutput(ctx);
    applyMaster(ctx.currentTime);
    if (state.cue) startPlayback(state.victoryLock ? "victory" : state.cue);
    emit();
  } catch {
    state.unlocked = false;
    state.ctx = null;
  }
}

function onMuteKey(event) {
  if (event.code !== "KeyM" || event.repeat) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  // The name grid needs the letter M. Everywhere else, M is mute.
  if (document.querySelector("[data-testid='name-screen']")) return;
  event.preventDefault();
  event.stopPropagation();
  toggleMuted();
}

function onVisibility() {
  if (!state.ctx || !state.unlocked) return;
  if (document.hidden) {
    // suspend freezes the audio clock, so a hidden tab does not play
    // the rest of the loop in the background and then skip ahead.
    state.ctx.suspend().catch(() => {});
    return;
  }
  state.ctx.resume().catch(() => {});
}

export function installAudio() {
  if (state.installed || typeof window === "undefined") return;
  state.installed = true;
  const saved = readAudioPrefs();
  state.muted = saved.muted;
  state.volume = saved.volume;
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
  window.addEventListener("keydown", onMuteKey, { capture: true });
  document.addEventListener("visibilitychange", onVisibility);
  emit();
}

function buildOutput(ctx) {
  const master = ctx.createGain();
  master.gain.value = audible();
  // Square waves are bright past what a Game Boy speaker could do.
  // The lowpass takes that edge off before the compressor catches
  // the moments when a chord and a drum land together.
  const color = ctx.createBiquadFilter();
  color.type = "lowpass";
  color.frequency.value = 7200;
  color.Q.value = 0.5;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.12;
  master.connect(color);
  color.connect(comp);
  comp.connect(ctx.destination);
  state.master = master;
}

function track(node) {
  state.nodes.push(node);
  // Ended notes leave the list. A looping town theme would otherwise
  // keep every oscillator that already finished.
  node.onended = () => {
    const index = state.nodes.indexOf(node);
    if (index >= 0) state.nodes.splice(index, 1);
  };
  return node;
}

function pulseWave(ctx, duty) {
  const key = String(duty);
  const cached = state.waves.get(key);
  if (cached) return cached;
  // A browser square oscillator is stuck at 50% duty. The other Game Boy
  // duties are a sum of harmonics: narrower duties keep more of the high
  // ones. We leave normalization on so the thin 12.5% lead is not a
  // whisper next to the 50% one. real[0] stays 0 so there is no DC thud.
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i += 1) {
    real[i] = Math.sin(i * Math.PI * duty) / (i * Math.PI);
  }
  const wave = ctx.createPeriodicWave(real, imag);
  state.waves.set(key, wave);
  return wave;
}

function shapeGain(gain, when, duration, peak, env) {
  const attack = Math.min(env.attack, Math.max(0.002, duration * 0.25));
  const sustain = Math.max(0.0001, peak * env.sustain);
  const decayEnd = Math.min(when + duration, when + attack + env.decay);
  const releaseAt = Math.max(decayEnd, when + duration);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + attack);
  if (decayEnd > when + attack + 0.004) {
    gain.gain.exponentialRampToValueAtTime(sustain, decayEnd);
  }
  if (env.sustain > 0 && releaseAt > decayEnd + 0.004) {
    gain.gain.setValueAtTime(sustain, releaseAt);
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, releaseAt + env.release);
  return releaseAt + env.release;
}

function playEvent(event) {
  const ctx = state.ctx;
  const dest = state.songGain;
  if (!ctx || !dest) return;
  const when = Math.max(state.origin + event.time, ctx.currentTime);
  if (event.kind === "noise") {
    playNoise(ctx, dest, event, when);
    return;
  }
  const freq = pitchToHz(event.pitch);
  if (!freq) return;
  if (event.kind === "wave") playWave(ctx, dest, event, when, freq);
  else playPulse(ctx, dest, event, when, freq);
}

function playPulse(ctx, dest, event, when, freq) {
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(pulseWave(ctx, event.duty || 0.5));
  osc.frequency.setValueAtTime(freq, when);
  const env = ENVELOPES[event.envelope] || ENVELOPES.pluck;
  const gain = ctx.createGain();
  const stopAt = shapeGain(gain, when, event.duration, event.volume, env);
  addVibrato(ctx, osc.frequency, when, event.duration, event.vibrato);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(stopAt + 0.02);
  track(osc);
}

function playWave(ctx, dest, event, when, freq) {
  const source = ctx.createBufferSource();
  source.buffer = waveBuffer(ctx);
  source.loop = true;
  // playbackRate is how many buffer-lengths play per second. The buffer
  // is one cycle, so rate = frequency * cycleLength / sampleRate.
  const rate = (freq * WAVE_TRIANGLE.length) / ctx.sampleRate;
  source.playbackRate.setValueAtTime(rate, when);
  const env = ENVELOPES[event.envelope] || ENVELOPES.bass;
  const gain = ctx.createGain();
  const stopAt = shapeGain(gain, when, event.duration, event.volume, env);
  addVibrato(ctx, source.playbackRate, when, event.duration, event.vibrato, rate / freq);
  source.connect(gain);
  gain.connect(dest);
  source.start(when);
  source.stop(stopAt + 0.02);
  track(source);
}

function addVibrato(ctx, param, when, duration, vibrato, scale = 1) {
  if (!vibrato || duration < vibrato.delay + 0.06) return;
  // A square LFO, not a sine. Game Boy vibrato was the driver stepping
  // the pitch up and down, so the wobble is abrupt on purpose.
  const lfo = ctx.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = vibrato.rate;
  const depth = ctx.createGain();
  const amount = vibrato.depth * scale;
  depth.gain.setValueAtTime(0, when);
  depth.gain.setValueAtTime(0, when + vibrato.delay);
  depth.gain.linearRampToValueAtTime(amount, when + vibrato.delay + 0.06);
  lfo.connect(depth);
  depth.connect(param);
  lfo.start(when);
  lfo.stop(when + duration + 0.05);
  track(lfo);
}

function waveBuffer(ctx) {
  const cached = state.waves.get("triangle-buffer");
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, WAVE_TRIANGLE.length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < WAVE_TRIANGLE.length; i += 1) {
    data[i] = WAVE_TRIANGLE[i] / 7.5 - 1;
  }
  state.waves.set("triangle-buffer", buffer);
  return buffer;
}

function noiseBuffer(ctx, type) {
  const cached = state.noise.get(type);
  if (cached) return cached;
  const seconds = type === "hat" ? 0.08 : 0.25;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // The noise channel is a clocked shift register, not a recording.
  // Hats use the short 7-bit mode, which repeats so fast it sounds metallic.
  writeLfsr(data, {
    width: type === "hat" ? 7 : 15,
    interval: type === "hat" ? 4 : type === "snare" ? 16 : 48,
  });
  state.noise.set(type, buffer);
  return buffer;
}

function writeLfsr(data, { width, interval }) {
  let reg = 0x7fff;
  let hold = 0;
  let counter = 0;
  for (let i = 0; i < data.length; i += 1) {
    if (counter <= 0) {
      const bit = ((reg >> 1) ^ reg) & 1;
      reg >>= 1;
      reg |= bit << 14;
      if (width === 7) reg = (reg & ~(1 << 6)) | (bit << 6);
      hold = bit ? 0.65 : -0.65;
      counter = interval;
    }
    counter -= 1;
    data[i] = hold;
  }
}

function playNoise(ctx, dest, event, when) {
  const type = isNoiseHit(event.pitch) ? event.pitch : "snare";
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, type);
  const filter = ctx.createBiquadFilter();
  if (type === "kick") {
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, when);
  } else if (type === "hat") {
    filter.type = "highpass";
    filter.frequency.setValueAtTime(4200, when);
  } else {
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600, when);
    filter.Q.setValueAtTime(0.7, when);
  }
  const gain = ctx.createGain();
  const decay = type === "hat" ? 0.035 : type === "kick" ? 0.08 : 0.1;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(event.volume, when + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start(when);
  source.stop(when + decay + 0.02);
  track(source);
  if (type === "kick") {
    // A noise tick has no thump on a phone speaker. A short falling
    // tone, made here, is what makes the downbeat feel like a kick.
    const body = ctx.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(150, when);
    body.frequency.exponentialRampToValueAtTime(48, when + 0.07);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, when);
    bodyGain.gain.exponentialRampToValueAtTime(event.volume * 0.85, when + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
    body.connect(bodyGain);
    bodyGain.connect(dest);
    body.start(when);
    body.stop(when + 0.1);
    track(body);
  }
}
