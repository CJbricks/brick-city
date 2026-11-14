/**
 * songs.test.js
 * The note data itself: five songs, legal duties, real pitches, a
 * one-shot victory, and a title whose intro does not come back when
 * the loop wraps.
 */

import { describe, expect, it } from "vitest";
import { notesInRange } from "@/game/audio/scheduler";
import { SONGS, SONG_IDS } from "@/game/audio/songs";
import { isNoiseHit, pitchToHz, PULSE_DUTIES, secondsPerStep, songDuration } from "@/game/audio/theory";

describe("song data", () => {
  it("has the five scene songs", () => {
    expect(Object.keys(SONGS)).toEqual(SONG_IDS);
    expect(SONGS.town.bpm).toBeGreaterThan(90);
    expect(SONGS.town.bpm).toBeLessThan(140);
    expect(SONGS.race.bpm).toBeGreaterThan(SONGS.town.bpm);
    expect(SONGS.battle.bpm).toBeGreaterThan(SONGS.race.bpm);
  });

  it("keeps the title intro out of the loop and does not loop the victory", () => {
    expect(SONGS.title.loop).toBe(true);
    expect(SONGS.title.loopStart).toBe(64);
    expect(SONGS.title.length).toBe(192);
    expect(SONGS.victory.loop).toBe(false);
    expect(songDuration(SONGS.victory)).toBeGreaterThan(3);
    expect(songDuration(SONGS.victory)).toBeLessThan(8);

    const step = secondsPerStep(SONGS.title);
    const span = songDuration(SONGS.title) + step;
    const intro = SONGS.title.channels[0].notes.find((note) => note.step < 64);
    const looped = SONGS.title.channels[0].notes.find((note) => note.step >= 64);
    const events = notesInRange(SONGS.title, 0, span);
    const introHits = events.filter((event) => event.channelId === "pulse1" && event.step === intro.step && event.pitch === intro.pitch);
    const loopHits = events.filter((event) => event.channelId === "pulse1" && event.step === looped.step && event.pitch === looped.pitch);
    expect(introHits).toHaveLength(1);
    expect(loopHits.length).toBeGreaterThanOrEqual(2);
  });

  it("uses Game Boy duties and notes the synth can play", () => {
    for (const song of Object.values(SONGS)) {
      expect(song.stepsPerBeat).toBe(4);
      expect(song.channels.map((channel) => channel.id)).toEqual(["pulse1", "pulse2", "wave", "noise"]);
      for (const channel of song.channels) {
        if (channel.kind === "pulse") expect(PULSE_DUTIES).toContain(channel.duty);
        for (const note of channel.notes) {
          if (channel.kind === "noise") expect(isNoiseHit(note.pitch)).toBe(true);
          else expect(pitchToHz(note.pitch)).toBeGreaterThan(20);
        }
      }
    }
  });
});
