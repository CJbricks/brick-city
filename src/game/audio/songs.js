/**
 * songs.js
 * The five Brick City tunes, and nothing that plays them.
 *
 * The palette is a Game Boy one: two pulse channels, a wave-channel
 * bass, and noise drums, on a strict 16th-note grid. Every melody,
 * bass line, and chord loop below was written for this game. Do not
 * replace a pattern with a Nintendo or Game Freak tune, or with a
 * lightly changed copy of one.
 *
 * To add a song, copy a block, keep every channel the same number of
 * bars, and register it in SONGS. docs/NOTES.md walks through that.
 * bars() throws if a line is not exactly 16 sixteenths, so a short
 * bar cannot silently shove the drums out of time.
 */

import { bars, parsePattern, repeat } from "@/game/audio/pattern";

const WALK_BEAT = "kick.2 hat.2 snare.2 hat.2 kick.2 hat.2 snare.2 hat.2";
const DRIVE_BEAT = "kick.1 hat.1 hat.1 hat.1 snare.1 hat.1 hat.1 hat.1 kick.1 hat.1 hat.1 hat.1 snare.1 hat.1 hat.1 hat.1";
const BATTLE_BEAT = "kick.1 hat.1 hat.1 hat.1 snare.1 hat.1 hat.1 hat.1 kick.1 hat.1 snare.1 hat.1 kick.1 hat.1 hat.1 hat.1";

function compileSong(draft) {
  const channels = draft.channels.map((channel) => {
    const parsed = parsePattern(channel.pattern);
    return {
      id: channel.id,
      kind: channel.kind,
      duty: channel.duty,
      volume: channel.volume,
      envelope: channel.envelope,
      vibrato: channel.vibrato || null,
      notes: parsed.notes,
      steps: parsed.steps,
    };
  });
  const length = channels[0]?.steps || 0;
  if (!length || channels.some((channel) => channel.steps !== length)) {
    const sizes = channels.map((channel) => `${channel.id}:${channel.steps}`).join(", ");
    throw new Error(`${draft.id} channels disagree (${sizes})`);
  }
  const song = {
    id: draft.id,
    title: draft.title,
    mood: draft.mood,
    key: draft.key,
    bpm: draft.bpm,
    stepsPerBeat: 4,
    loop: draft.loop,
    loopStart: draft.loopStart,
    length,
    channels,
  };
  assertPlayable(song);
  return song;
}

function assertPlayable(song) {
  if (song.loopStart < 0 || song.loopStart > song.length) {
    throw new Error(`${song.id} has a loop start outside the song`);
  }
  if (song.loop && song.loopStart === song.length) {
    throw new Error(`${song.id} loops an empty region`);
  }
  for (const channel of song.channels) {
    const notes = [...channel.notes].sort((a, b) => a.step - b.step);
    for (let i = 1; i < notes.length; i += 1) {
      if (notes[i - 1].step + notes[i - 1].length > notes[i].step) {
        throw new Error(`${song.id} ${channel.id} overlaps at step ${notes[i].step}`);
      }
    }
    for (const note of notes) {
      if (note.step + note.length > song.length) {
        throw new Error(`${song.id} ${channel.id} runs past the end at step ${note.step}`);
      }
    }
  }
}

const leadVibrato = { depth: 6, rate: 5.5, delay: 0.12 };
const tenseVibrato = { depth: 7, rate: 6.5, delay: 0.08 };

/**
 * Title. Bb major, 128 BPM.
 * Four bars of fanfare play once. The next eight bars loop.
 * The call is straight quarters and eighths, not a dotted brass leap.
 */
const title = compileSong({
  id: "title",
  title: "Every New Mile",
  mood: "Heroic fanfare that settles into a bright loop",
  key: "Bb major",
  bpm: 128,
  loop: true,
  loopStart: 64,
  channels: [
    {
      id: "pulse1",
      kind: "pulse",
      duty: 0.5,
      volume: 0.18,
      envelope: "hold",
      vibrato: leadVibrato,
      pattern: bars([
        "Bb4.4 F5.4 D5.2 Eb5.2 F5.4",
        "G5.4 F5.4 Eb5.4 D5.4",
        "C5.2 D5.2 Eb5.4 G5.2 F5.2 D5.4",
        "F5.4 Eb5.4 Bb4.8",
        "D5.2 r.2 F5.2 D5.2 Eb5.4 C5.4",
        "Bb4.2 C5.2 D5.4 G4.4 F4.4",
        "Eb5.2 D5.2 C5.2 Bb4.2 A4.4 G4.4",
        "F4.4 G4.4 A4.4 F4.4",
        "Bb4.2 D5.2 F5.4 Eb5.2 D5.2 C5.4",
        "A4.4 Bb4.2 C5.2 D5.4 C5.4",
        "Eb5.4 D5.2 C5.2 Bb4.4 A4.4",
        "Bb4.4 F4.4 Bb4.8",
      ]),
    },
    {
      id: "pulse2",
      kind: "pulse",
      duty: 0.25,
      volume: 0.1,
      envelope: "soft",
      pattern: bars([
        "D4.4 Bb4.4 F4.4 D4.4",
        "Eb4.4 D5.4 C5.4 Bb4.4",
        "A4.2 Bb4.2 C5.4 Eb5.2 D5.2 Bb4.4",
        "D5.4 C5.4 F4.8",
        "Bb4.4 r.4 G4.4 r.4",
        "F4.4 r.4 D4.4 r.4",
        "G4.4 r.4 Eb4.4 r.4",
        "C4.4 F4.4 C4.8",
        "Eb4.4 G4.4 Bb4.4 G4.4",
        "F4.4 r.4 E4.4 r.4",
        "Ab4.4 G4.4 F4.4 Eb4.4",
        "D4.4 F4.4 Bb3.8",
      ]),
    },
    {
      id: "wave",
      kind: "wave",
      volume: 0.24,
      envelope: "bass",
      pattern: bars([
        "Bb2.8 F2.8",
        "C3.8 Bb2.8",
        "Eb2.8 F2.8",
        "Bb2.16",
        "Bb2.8 F2.4 Bb2.4",
        "G2.8 D3.4 G2.4",
        "Eb2.8 Bb2.4 Eb2.4",
        "F2.8 C3.4 F2.4",
        "C3.8 G2.4 C3.4",
        "Ab2.8 Eb2.4 Ab2.4",
        "Bb2.8 F2.4 D3.4",
        "F2.8 F2.8",
      ]),
    },
    {
      id: "noise",
      kind: "noise",
      volume: 0.12,
      envelope: "hit",
      pattern: [
        bars([
          "kick.2 r.6 snare.2 r.6",
          "kick.2 r.6 snare.2 r.6",
          "kick.2 r.6 snare.2 r.6",
          "kick.2 hat.2 hat.2 hat.2 snare.2 hat.2 hat.2 hat.2",
        ]),
        repeat(WALK_BEAT, 8),
      ].join(" "),
    },
  ],
});

/**
 * Town. G major, 116 BPM. A walking loop, cheerful, short notes.
 * Chords move I IV vi I V ii IV I, then a second half that passes
 * through iii instead of sitting on one four-bar loop.
 */
const town = compileSong({
  id: "town",
  title: "Morning on Brick Street",
  mood: "Cheerful walk through town",
  key: "G major",
  bpm: 116,
  loop: true,
  loopStart: 0,
  channels: [
    {
      id: "pulse1",
      kind: "pulse",
      duty: 0.125,
      volume: 0.17,
      envelope: "pluck",
      vibrato: leadVibrato,
      pattern: bars([
        "B4.2 r.2 D5.2 B4.2 A4.2 G4.2 B4.4",
        "A4.2 r.2 C5.2 A4.2 G4.2 F#4.2 A4.4",
        "G4.2 A4.2 B4.4 E5.2 D5.2 B4.4",
        "C5.4 A4.4 B4.4 G4.4",
        "D5.2 r.2 F#5.2 D5.2 B4.4 A4.4",
        "G4.2 A4.2 B4.2 D5.2 C5.4 A4.4",
        "B4.2 C5.2 D5.4 E5.2 D5.2 C5.2 B4.2",
        "A4.4 G4.4 F#4.4 G4.4",
        "B4.2 D5.2 G5.4 F#5.2 E5.2 D5.4",
        "E5.2 D5.2 C5.4 B4.2 A4.2 G4.4",
        "A4.2 B4.2 C5.4 D5.2 E5.2 F#5.4",
        "G5.2 F#5.2 E5.2 D5.2 B4.4 G4.4",
        "D5.2 r.2 D5.2 E5.2 D5.4 B4.2 G4.2",
        "A4.4 F#4.4 G4.2 A4.2 B4.4",
        "C5.2 B4.2 A4.2 G4.2 A4.4 F#4.4",
        "G4.4 D4.4 G4.8",
      ]),
    },
    {
      id: "pulse2",
      kind: "pulse",
      duty: 0.25,
      volume: 0.09,
      envelope: "soft",
      pattern: bars([
        "G4.4 r.4 D4.4 r.4",
        "E4.4 r.4 C4.4 r.4",
        "B3.4 r.4 E4.4 r.4",
        "A3.4 D4.4 G3.8",
        "F#4.4 r.4 D4.4 r.4",
        "E4.4 r.4 C4.4 r.4",
        "G4.4 r.4 E4.4 r.4",
        "D4.8 G3.8",
        "G4.4 B4.4 A4.4 G4.4",
        "G4.4 E4.4 D4.4 B3.4",
        "C4.4 E4.4 D4.4 A3.4",
        "B3.4 D4.4 G4.8",
        "F#4.4 r.4 G4.4 r.4",
        "E4.4 D4.4 B3.8",
        "C4.4 A3.4 D4.8",
        "B3.4 D4.4 G3.8",
      ]),
    },
    {
      id: "wave",
      kind: "wave",
      volume: 0.22,
      envelope: "bass",
      pattern: bars([
        "G2.4 D2.2 G2.2 B2.4 G2.4",
        "C2.4 G2.2 C2.2 E2.4 C2.4",
        "E2.4 B2.2 E2.2 G2.4 E2.4",
        "G2.4 D2.4 B1.4 G2.4",
        "D2.4 A2.2 D2.2 F#2.4 D2.4",
        "A2.4 E2.2 A2.2 C3.4 A2.4",
        "C2.4 G2.2 C2.2 E2.4 C2.4",
        "G2.4 D2.4 G2.8",
        "G2.4 B2.4 D3.4 G2.4",
        "C2.4 E2.4 G2.4 E2.4",
        "A2.4 C3.4 E3.4 C3.4",
        "G2.4 B2.4 D3.4 G2.4",
        "D2.4 F#2.4 A2.4 F#2.4",
        "B2.4 D3.4 F#2.4 D3.4",
        "A2.4 E2.4 C3.4 A2.4",
        "G2.4 D2.4 G2.8",
      ]),
    },
    {
      id: "noise",
      kind: "noise",
      volume: 0.11,
      envelope: "hit",
      pattern: repeat(WALK_BEAT, 16),
    },
  ],
});

/**
 * Race. E minor, 160 BPM. Driving eighth-note bass, not the battle's
 * 16th-note arpeggios. The chords borrow a major II and a major V
 * so the loop leans forward.
 */
const race = compileSong({
  id: "race",
  title: "White Line",
  mood: "Fast and driving",
  key: "E minor",
  bpm: 160,
  loop: true,
  loopStart: 0,
  channels: [
    {
      id: "pulse1",
      kind: "pulse",
      duty: 0.25,
      volume: 0.17,
      envelope: "pluck",
      vibrato: leadVibrato,
      pattern: bars([
        "E5.2 G5.2 B5.2 G5.2 A5.2 G5.2 E5.4",
        "D5.2 E5.2 G5.4 F#5.2 E5.2 D5.4",
        "C5.2 D5.2 E5.4 G5.2 F#5.2 E5.4",
        "D5.4 B4.4 E5.8",
        "G5.2 A5.2 B5.4 A5.2 G5.2 E5.4",
        "F#5.2 G5.2 A5.4 G5.2 F#5.2 E5.4",
        "D5.2 E5.2 F#5.4 A5.2 G5.2 F#5.2 E5.2",
        "E5.4 B4.4 E5.8",
      ]),
    },
    {
      id: "pulse2",
      kind: "pulse",
      duty: 0.5,
      volume: 0.09,
      envelope: "soft",
      pattern: bars([
        "B4.4 r.4 E5.4 r.4",
        "G4.4 r.4 B4.4 r.4",
        "A4.4 r.4 C5.4 r.4",
        "B4.4 F#4.4 G4.8",
        "B4.4 r.4 C5.4 r.4",
        "A4.4 r.4 B4.4 r.4",
        "A4.4 r.4 D5.4 r.4",
        "G#4.4 B4.4 E4.8",
      ]),
    },
    {
      id: "wave",
      kind: "wave",
      volume: 0.22,
      envelope: "bass",
      pattern: bars([
        "E2.2 E3.2 B2.2 E3.2 E2.2 E3.2 B2.2 E3.2",
        "C2.2 C3.2 G2.2 C3.2 C2.2 C3.2 G2.2 C3.2",
        "G2.2 G3.2 D3.2 G3.2 G2.2 G3.2 D3.2 G3.2",
        "D2.2 D3.2 A2.2 D3.2 D2.2 D3.2 A2.2 D3.2",
        "A2.2 A3.2 E3.2 A3.2 A2.2 A3.2 E3.2 A3.2",
        "E2.2 E3.2 B2.2 E3.2 E2.2 E3.2 B2.2 E3.2",
        "D2.2 F#2.2 A2.2 D3.2 D2.2 F#2.2 A2.2 D3.2",
        "B2.2 F#2.2 B2.2 D3.2 F#2.4 B2.4",
      ]),
    },
    {
      id: "noise",
      kind: "noise",
      volume: 0.12,
      envelope: "hit",
      pattern: repeat(DRIVE_BEAT, 8),
    },
  ],
});

/**
 * Battle. D minor, 172 BPM. Used for Remy Calder.
 * The bass is a new 16th-note arpeggio (root, third, fifth, octave),
 * and the chords change every bar, including a chromatic E major.
 */
const battle = compileSong({
  id: "battle",
  title: "Last Straight",
  mood: "Tense, high-energy rival battle",
  key: "D minor",
  bpm: 172,
  loop: true,
  loopStart: 0,
  channels: [
    {
      id: "pulse1",
      kind: "pulse",
      duty: 0.125,
      volume: 0.16,
      envelope: "pluck",
      vibrato: tenseVibrato,
      pattern: bars([
        "A4.2 r.2 A4.1 C5.1 D5.4 F5.2 E5.2 D5.2",
        "C#5.2 D5.2 A4.2 r.2 C5.2 D5.2 E5.4",
        "F5.2 r.2 D5.2 F5.2 E5.4 C5.4",
        "E5.2 C#5.2 D5.4 A4.4 G4.4",
        "A4.2 C5.2 D5.4 F5.2 E5.2 D5.2 C5.2",
        "Bb4.2 r.2 D5.2 Bb4.2 A4.4 G4.4",
        "G#4.2 B4.2 E5.4 D5.2 B4.2 G#4.4",
        "A4.2 C#5.2 E5.4 E5.2 D5.2 A4.4",
      ]),
    },
    {
      id: "pulse2",
      kind: "pulse",
      duty: 0.25,
      volume: 0.09,
      envelope: "pluck",
      pattern: bars([
        "D4.2 r.2 F4.2 r.2 A4.4 r.4",
        "E4.2 r.2 A4.2 r.2 G4.4 r.4",
        "C4.2 r.2 E4.2 r.2 G4.4 r.4",
        "A3.2 r.2 C#4.2 r.2 E4.8",
        "D4.4 r.4 A4.4 r.4",
        "G4.4 r.4 Bb4.4 r.4",
        "B3.4 r.4 E4.4 r.4",
        "A3.4 C#4.4 E4.8",
      ]),
    },
    {
      id: "wave",
      kind: "wave",
      volume: 0.2,
      envelope: "bass",
      pattern: bars([
        "D2.1 F2.1 A2.1 D3.1 F2.1 A2.1 D3.1 A2.1 D2.1 F2.1 A2.1 D3.1 A2.1 D3.1 F3.1 A2.1",
        "Bb2.1 D3.1 F3.1 Bb3.1 D3.1 F3.1 Bb3.1 F3.1 Bb2.1 D3.1 F3.1 Bb3.1 F3.1 Bb3.1 D4.1 F3.1",
        "C2.1 E2.1 G2.1 C3.1 E2.1 G2.1 C3.1 G2.1 C2.1 E2.1 G2.1 C3.1 G2.1 C3.1 E3.1 G2.1",
        "A2.1 C#3.1 E3.1 A3.1 C#3.1 E3.1 A3.1 E3.1 A2.1 C#3.1 E3.1 A3.1 E3.1 A3.1 C#4.1 E3.1",
        "D2.1 F2.1 A2.1 D3.1 F2.1 A2.1 D3.1 A2.1 D2.1 F2.1 A2.1 D3.1 A2.1 D3.1 F3.1 A2.1",
        "G2.1 Bb2.1 D3.1 G3.1 Bb2.1 D3.1 G3.1 D3.1 G2.1 Bb2.1 D3.1 G3.1 D3.1 G3.1 Bb3.1 D3.1",
        "E2.1 G#2.1 B2.1 E3.1 G#2.1 B2.1 E3.1 B2.1 E2.1 G#2.1 B2.1 E3.1 B2.1 E3.1 G#3.1 B2.1",
        "A2.1 C#3.1 E3.1 A3.1 C#3.1 E3.1 A3.1 E3.1 A2.1 C#3.1 E3.1 A3.1 E3.1 A3.1 C#4.1 E3.1",
      ]),
    },
    {
      id: "noise",
      kind: "noise",
      volume: 0.11,
      envelope: "hit",
      pattern: repeat(BATTLE_BEAT, 8),
    },
  ],
});

/**
 * Victory. C major, 144 BPM. Three bars, about five seconds, no loop.
 * Straight eighths up the triad, a turn through F and G, then a held
 * tonic. It does not use a dotted fanfare rhythm.
 */
const victory = compileSong({
  id: "victory",
  title: "Tape Break",
  mood: "Short triumphant fanfare",
  key: "C major",
  bpm: 144,
  loop: false,
  loopStart: 0,
  channels: [
    {
      id: "pulse1",
      kind: "pulse",
      duty: 0.5,
      volume: 0.18,
      envelope: "hold",
      vibrato: leadVibrato,
      pattern: bars([
        "G4.2 C5.2 E5.2 G5.2 E5.4 C5.4",
        "F5.2 E5.2 D5.2 F5.2 E5.4 G5.4",
        "E5.2 D5.2 C5.2 D5.2 C5.8",
      ]),
    },
    {
      id: "pulse2",
      kind: "pulse",
      duty: 0.25,
      volume: 0.1,
      envelope: "hold",
      pattern: bars([
        "E4.2 G4.2 C5.2 E5.2 C5.4 G4.4",
        "A4.2 G4.2 F4.2 A4.2 G4.4 B4.4",
        "G4.2 F4.2 E4.2 F4.2 E4.8",
      ]),
    },
    {
      id: "wave",
      kind: "wave",
      volume: 0.22,
      envelope: "hold",
      pattern: bars([
        "C3.4 G2.4 E3.4 G2.4",
        "F2.4 C3.4 G2.4 B2.4",
        "C3.4 G2.4 C3.8",
      ]),
    },
    {
      id: "noise",
      kind: "noise",
      volume: 0.12,
      envelope: "hit",
      pattern: bars([
        "kick.2 snare.2 kick.2 snare.2 kick.2 hat.2 snare.2 hat.2",
        "kick.2 snare.2 kick.2 snare.2 kick.4 snare.4",
        "kick.2 hat.2 snare.2 hat.2 kick.8",
      ]),
    },
  ],
});

export const SONGS = { title, town, race, battle, victory };

export const SONG_IDS = ["title", "town", "race", "battle", "victory"];
