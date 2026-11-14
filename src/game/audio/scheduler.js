/**
 * scheduler.js
 * Turns a song into note times. No audio objects live here, which is
 * why the tests can run in Node.
 *
 * Time is seconds from the moment the song started. The window is
 * half-open: a note that lands exactly on the end belongs to the next
 * window. Adjacent windows therefore never schedule the same note twice.
 *
 * A looping song has an intro (steps before loopStart) that plays once,
 * then a region that repeats. A note in the loop at step S happens at
 * S, then at S + loopLength, then S + 2 * loopLength, and so on. The
 * intro notes are not in that list, so they do not come back.
 */

import { secondsPerStep } from "@/game/audio/theory";

function loopLength(song) {
  return song.length - song.loopStart;
}

function timesFor(song, note, fromSec, toSec, stepSec) {
  const times = [];
  const introOnly = song.loop && note.step < song.loopStart;
  const loopingNote = song.loop && note.step >= song.loopStart;
  if (!loopingNote) {
    const time = note.step * stepSec;
    if (time >= fromSec && time < toSec) times.push(time);
    if (introOnly || !song.loop) return times;
  }
  const span = loopLength(song);
  if (span <= 0) return times;
  // k = 0 is the first time through. The smallest k whose time is still
  // inside the window, then the largest k that is still strictly before
  // toSec. Subtracting a tiny epsilon keeps an exact boundary on the
  // correct side of the half-open window.
  const minK = Math.ceil((fromSec / stepSec - note.step) / span - 1e-9);
  const maxK = Math.floor((toSec / stepSec - note.step) / span - 1e-9);
  for (let k = Math.max(0, minK); k <= maxK; k += 1) {
    times.push((note.step + k * span) * stepSec);
  }
  return times;
}

export function notesInRange(song, fromSec, toSec) {
  if (toSec <= fromSec) return [];
  const stepSec = secondsPerStep(song);
  const events = [];
  for (const channel of song.channels) {
    for (const note of channel.notes) {
      for (const time of timesFor(song, note, fromSec, toSec, stepSec)) {
        events.push({
          songId: song.id,
          channelId: channel.id,
          kind: channel.kind,
          duty: channel.duty,
          volume: channel.volume,
          envelope: channel.envelope,
          vibrato: channel.vibrato || null,
          pitch: note.pitch,
          step: note.step,
          length: note.length,
          time,
          duration: note.length * stepSec,
        });
      }
    }
  }
  events.sort((a, b) => a.time - b.time || a.channelId.localeCompare(b.channelId));
  return events;
}
