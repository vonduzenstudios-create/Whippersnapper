// Step sequencer + synthesized instruments + original compositions.
import type { AudioEngine } from './audio';

interface Note {
  s: number; // start step
  n: number; // midi note (or drum id)
  d: number; // length in steps
  v: number;
}
interface Track {
  inst: string;
  vol: number;
  notes: Note[];
  rev?: number;
}
export interface Song {
  name: string;
  bpm: number;
  steps: number;
  loop: boolean;
  tracks: Track[];
}

const NOTE: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function midi(tok: string) {
  const m = /^([a-g])(#?)(\d)$/.exec(tok);
  if (!m) throw new Error('bad note ' + tok);
  return 12 * (parseInt(m[3]) + 1) + NOTE[m[1]] + (m[2] ? 1 : 0);
}
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Parse a melody string: one token per 16th step. '-' holds, '.' rests. */
function seq(str: string, offset = 0, v = 0.8): Note[] {
  const toks = str.trim().split(/\s+/);
  const out: Note[] = [];
  let cur: Note | null = null;
  toks.forEach((t, i) => {
    if (t === '-') {
      if (cur) cur.d++;
    } else if (t === '.') cur = null;
    else {
      const chord = t.split('+');
      cur = null;
      for (const c of chord) {
        const n: Note = { s: offset + i, n: midi(c), d: 1, v };
        out.push(n);
        cur = n;
      }
      // all chord members share holds
      if (chord.length > 1) {
        const group = out.slice(-chord.length);
        cur = new Proxy(group[0], {
          set(_t, p, val) {
            for (const g of group) (g as any)[p] = val;
            return true;
          },
          get(_t, p) {
            return (group[0] as any)[p];
          },
        });
      }
    }
  });
  return out;
}
/** Drum pattern: k kick, s snare, h hat, o open hat, c crash, t tom, x kick+crash. */
function drums(str: string, offset = 0): Note[] {
  const map: Record<string, number[]> = { k: [0], s: [1], h: [2], o: [3], c: [4], t: [5], x: [0, 4], K: [0, 2], S: [1, 2] };
  const out: Note[] = [];
  str.trim().split(/\s+/).forEach((t, i) => {
    for (const id of map[t] || []) out.push({ s: offset + i, n: id, d: 1, v: t === t.toUpperCase() && t !== 'x' ? 1 : 0.8 });
  });
  return out;
}

const CHORDS: Record<string, number[]> = { m: [0, 3, 7], M: [0, 4, 7], d: [0, 3, 6], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10] };
function chord(name: string, oct: number): number[] {
  const m = /^([A-G])(#?)(m7|m|M|d|7)?$/.exec(name)!;
  const root = 12 * (oct + 1) + NOTE[m[1].toLowerCase()] + (m[2] ? 1 : 0);
  return CHORDS[m[3] || 'M'].map((i) => root + i);
}
/** Arpeggiate one chord per bar using an index pattern (indices wrap up an octave). */
function arp(chords: string[], pattern: number[], oct: number, v = 0.6, len = 1): Note[] {
  const out: Note[] = [];
  chords.forEach((c, bar) => {
    const tones = chord(c, oct);
    pattern.forEach((idx, i) => {
      if (idx < 0) return;
      const o = Math.floor(idx / tones.length);
      out.push({ s: bar * 16 + i * (16 / pattern.length), n: tones[idx % tones.length] + o * 12, d: len, v });
    });
  });
  return out;
}
function pads(chords: string[], oct: number, v = 0.5, bars = 1): Note[] {
  const out: Note[] = [];
  chords.forEach((c, bar) => chord(c, oct).forEach((n) => out.push({ s: bar * 16 * bars, n, d: 16 * bars, v })));
  return out;
}
function bassLine(chords: string[], pattern: string, oct: number, v = 0.8): Note[] {
  // pattern tokens: r root, R root+octave, f fifth, '.' rest, '-' hold
  const out: Note[] = [];
  const toks = pattern.trim().split(/\s+/);
  chords.forEach((c, bar) => {
    const root = chord(c, oct)[0];
    let cur: Note | null = null;
    toks.forEach((t, i) => {
      if (t === '-') {
        if (cur) cur.d++;
        return;
      }
      if (t === '.') {
        cur = null;
        return;
      }
      const n = t === 'r' ? root : t === 'R' ? root + 12 : root + 7;
      cur = { s: bar * 16 + i, n, d: 1, v };
      out.push(cur);
    });
  });
  return out;
}

// ---------------------------------------------------------------- compositions (all original)

function songCastle(): Song {
  const A = ['Dm', 'A#M', 'CM', 'AM', 'Dm', 'A#M', 'Gm', 'AM'];
  const B = ['Gm', 'Dm', 'D#M', 'A#M', 'Gm', 'Dm', 'Ed', 'A7'];
  const all = [...A, ...B];
  const melA = `
    d5 - - - a4 - - - d5 - e5 - f5 - - -
    g5 - f5 - e5 - d5 - f5 - - - - - . .
    e5 - - - c5 - - - e5 - f5 - g5 - - -
    a5 - - - g5 f5 e5 - c#5 - - - - - . .
    d5 - - - a4 - d5 - f5 - a5 - - - d6 -
    c6 - a#5 - a5 - g5 - f5 - g5 - a5 - - -
    a#5 - - - a5 - g5 - f5 - e5 - d5 - e5 -
    c#5 - - - - - - - e5 - - - a5 - - -`;
  const melB = `
    g5 - - - d5 - g5 - a#5 - a5 - g5 - - -
    f5 - - - a5 - - - d5 - - - . . . .
    d#5 - - - g5 - - - a#5 - - - g5 - d#5 -
    f5 - - - - - d5 - f5 - a#5 - d6 - - -
    d6 - c6 - a#5 - a5 - g5 - - - d5 - g5 -
    a5 - - - f5 - - - d5 - e5 - f5 - a5 -
    g5 - - - a#5 - - - e5 - - - g5 - a#5 -
    a5 - - - c#6 - - - e6 - - - . . . .`;
  const beat = 'k . h . s . h . k . h k s . h h';
  const fill = 'k . h . s . h . k . s s s s s s';
  let dr: Note[] = [];
  for (let b = 0; b < 16; b++) dr = dr.concat(drums(b % 8 === 7 ? fill : b % 8 === 0 ? 'x . h . s . h . k . h k s . h h' : beat, b * 16));
  return {
    name: 'castle',
    bpm: 150,
    steps: 256,
    loop: true,
    tracks: [
      { inst: 'guitar', vol: 0.16, notes: seq(melA + melB, 0, 0.85), rev: 0.4 },
      { inst: 'harpsi', vol: 0.11, notes: arp(all, [0, 1, 2, 3, 2, 1, 0, 1, 3, 2, 1, 2, 4, 2, 3, 1], 4, 0.6) },
      { inst: 'bass', vol: 0.22, notes: bassLine(all, 'r . r R r . r . r . R . r . f .', 2) },
      { inst: 'organ', vol: 0.05, notes: pads(B, 4, 0.5).map((n) => ({ ...n, s: n.s + 128 })) },
      { inst: 'drums', vol: 0.5, notes: dr },
    ],
  };
}

function songCatacombs(): Song {
  const C = ['Em', 'FM', 'Em', 'Dm', 'Em', 'FM', 'GM', 'FM'];
  const mel = `
    e5 - - - - - - - g5 - - - f#5 - - -
    f5 - - - - - - - e5 - - - c5 - - -
    b4 - - - - - - - e5 - - - g5 - - -
    a5 - - - - - - - f5 - - - d5 - - -
    e5 - - - b5 - - - a5 - g5 - f#5 - - -
    f5 - - - c6 - - - a5 - - - f5 - - -
    g5 - - - b5 - d6 - b5 - - - g5 - - -
    a5 - - - g5 - f5 - e5 - - - - - - -`;
  let dr: Note[] = [];
  for (let b = 0; b < 8; b++) dr = dr.concat(drums('k . . . . . h . t . . . . . h .', b * 16));
  const ost = `e4 . b4 . e5 . b4 . g4 . b4 . f#4 . b4 .`;
  let ostN: Note[] = [];
  for (let b = 0; b < 8; b++) {
    const shift = [0, 1, 0, -2, 0, 1, 3, 1][b];
    ostN = ostN.concat(seq(ost, b * 16, 0.5).map((n) => ({ ...n, n: n.n + shift })));
  }
  return {
    name: 'catacombs',
    bpm: 104,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.13, notes: seq(mel, 0, 0.8), rev: 0.7 },
      { inst: 'harpsi', vol: 0.08, notes: ostN, rev: 0.5 },
      { inst: 'organ', vol: 0.06, notes: pads(C, 3, 0.6), rev: 0.6 },
      { inst: 'choir', vol: 0.07, notes: pads(C, 4, 0.5), rev: 0.8 },
      { inst: 'bass', vol: 0.16, notes: bassLine(C, 'r - - - - - - - r - - - f - - -', 2, 0.6) },
      { inst: 'drums', vol: 0.35, notes: dr },
    ],
  };
}

function songBoss(): Song {
  const A = ['Cm', 'Cm', 'G#M', 'A#M', 'Cm', 'Cm', 'C#M', 'GM'];
  const B = ['Fm', 'Cm', 'G#M', 'GM', 'Fm', 'G#M', 'Bd', 'GM'];
  const all = [...A, ...B];
  const mel = `
    c5 - - - g5 - - - f5 - d#5 - d5 - c5 -
    d5 - d#5 - f5 - g5 - - - - - . . . .
    g#5 - - - g5 - f5 - d#5 - - - c5 - - -
    d5 - - - a#4 - - - d5 - f5 - a#5 - - -
    c6 - - - g5 - - - d#5 - - - c5 - d5 -
    d#5 - f5 - g5 - g#5 - g5 - f5 - d#5 - d5 -
    c#5 - - - f5 - - - g#5 - - - c#6 - - -
    b5 - - - - - - - g5 - - - d5 - b4 -
    f5 - g#5 - c6 - - - a#5 - g#5 - g5 - f5 -
    g5 - - - - - - - d#5 - - - c5 - - -
    c6 - - - a#5 - g#5 - g5 - - - d#5 - - -
    d5 - - - b4 - d5 - g5 - - - b5 - - -
    c6 - - - g#5 - f5 - g#5 - c6 - f6 - - -
    d#6 - - - c6 - g#5 - d#5 - - - c6 - - -
    d6 - - - b5 - - - g#5 - - - f5 - - -
    g5 - - - - - - - b5 - - - d6 - - -`;
  let dr: Note[] = [];
  for (let b = 0; b < 16; b++)
    dr = dr.concat(drums(b % 4 === 0 ? 'x k h k s k h k k k h k s k s s' : 'k k h k s k h k k k h k s k h h', b * 16));
  return {
    name: 'boss',
    bpm: 168,
    steps: 256,
    loop: true,
    tracks: [
      { inst: 'guitar', vol: 0.15, notes: seq(mel, 0, 0.9), rev: 0.3 },
      { inst: 'harpsi', vol: 0.09, notes: arp(all, [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 4, 3], 4, 0.55) },
      { inst: 'bass', vol: 0.24, notes: bassLine(all, 'r r R r r r R r r r R r f f R r', 2, 0.8) },
      { inst: 'choir', vol: 0.06, notes: pads(B, 4, 0.6).map((n) => ({ ...n, s: n.s + 128 })), rev: 0.7 },
      { inst: 'organ', vol: 0.05, notes: pads(A, 3, 0.6) },
      { inst: 'drums', vol: 0.55, notes: dr },
    ],
  };
}

function songTitle(): Song {
  const C = ['Dm', 'A#M', 'Gm', 'AM', 'Dm', 'FM', 'Gm', 'Dm'];
  const mel = `
    a4 - - - d5 - - - f5 - - - e5 - d5 -
    d5 - - - - - - - c5 - - - a#4 - - -
    a#4 - - - d5 - - - g5 - - - f5 - e5 -
    e5 - - - - - - - c#5 - - - - - - -
    d5 - - - f5 - - - a5 - - - g5 - f5 -
    a5 - - - - - - - c6 - - - a5 - - -
    g5 - - - a#5 - - - a5 - - - c#5 - e5 -
    d5 - - - - - - - - - - - . . . .`;
  return {
    name: 'title',
    bpm: 72,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.14, notes: seq(mel, 0, 0.8), rev: 0.8 },
      { inst: 'organ', vol: 0.08, notes: pads(C, 3, 0.6), rev: 0.8 },
      { inst: 'choir', vol: 0.08, notes: pads(C, 4, 0.6), rev: 0.9 },
      { inst: 'bass', vol: 0.14, notes: bassLine(C, 'r - - - - - - - - - - - - - - -', 2, 0.6) },
      { inst: 'harpsi', vol: 0.05, notes: arp(C, [0, 1, 2, 3, 4, 3, 2, 1], 4, 0.4), rev: 0.6 },
    ],
  };
}

function songSave(): Song {
  const C = ['FM', 'CM', 'Dm', 'A#M'];
  const mel = `
    c5 - - - f5 - - - a5 - - - g5 - - -
    g5 - - - e5 - - - c5 - - - - - - -
    d5 - - - f5 - - - a5 - - - c6 - - -
    a#5 - - - a5 - - - f5 - - - - - - -`;
  return {
    name: 'save',
    bpm: 80,
    steps: 64,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.11, notes: seq(mel, 0, 0.7), rev: 0.8 },
      { inst: 'harpsi', vol: 0.07, notes: arp(C, [0, 1, 2, 3, 2, 1, 2, 3], 4, 0.4), rev: 0.6 },
      { inst: 'choir', vol: 0.07, notes: pads(C, 4, 0.5), rev: 0.9 },
    ],
  };
}

function songVictory(): Song {
  const mel = `d5 . d5 . d5 . a5 - - - g5 - f5 - g5 - a5 - - - - - - - f5 - g5 - a5 - d6 - - - - - - - - - - -`;
  const ch = `d4+f4+a4 - - - - - - - - - - - a#3+d4+f4 - - - - - - - c4+e4+g4 - - - - - - - d4+f#4+a4 - - - - - - - - - - -`;
  return {
    name: 'victory',
    bpm: 120,
    steps: 48,
    loop: false,
    tracks: [
      { inst: 'guitar', vol: 0.16, notes: seq(mel, 0, 0.9), rev: 0.6 },
      { inst: 'organ', vol: 0.09, notes: seq(ch, 0, 0.7), rev: 0.8 },
      { inst: 'drums', vol: 0.5, notes: drums('x . . . s . . . k . . . s . . . k . . . s . s s x') },
    ],
  };
}

function songGameOver(): Song {
  const mel = `a4 - - - f4 - - - d4 - - - c#4 - - - d4 - - - - - - - - - - -`;
  return {
    name: 'gameover',
    bpm: 70,
    steps: 32,
    loop: false,
    tracks: [
      { inst: 'organ', vol: 0.12, notes: seq(mel, 0, 0.8), rev: 0.9 },
      { inst: 'choir', vol: 0.08, notes: pads(['Dm', 'Dm'], 3, 0.6), rev: 0.9 },
    ],
  };
}

/** Hollowcrown Pass: cold and lonely. Slow bells over a choir, a sparse harpsichord. */
function songPass(): Song {
  const C = ['Am', 'FM', 'CM', 'GM', 'Am', 'FM', 'Dm', 'EM'];
  const mel = `
    a4 - - - c5 - - - e5 - - - d5 - c5 -
    c5 - - - - - - - a4 - - - f4 - - -
    g4 - - - c5 - - - e5 - - - g5 - - -
    d5 - - - b4 - - - d5 - - - g5 - - -
    e5 - - - - - - - a5 - - - g5 - e5 -
    f5 - - - - - - - c5 - - - a4 - - -
    d5 - - - f5 - - - a5 - - - f5 - d5 -
    e5 - - - - - - - g#4 - - - b4 - - -`;
  return {
    name: 'pass',
    bpm: 84,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.12, notes: seq(mel, 0, 0.75), rev: 0.85 },
      { inst: 'choir', vol: 0.07, notes: pads(C, 3, 0.55), rev: 0.9 },
      { inst: 'harpsi', vol: 0.05, notes: arp(C, [0, -1, 2, -1, 1, -1, 3, -1], 4, 0.4), rev: 0.7 },
      { inst: 'bass', vol: 0.12, notes: bassLine(C, 'r - - - - - - - f - - - - - - -', 2, 0.5) },
    ],
  };
}

/** The avalanche chase: fast and driving, guitar over pounding drums. */
function songChase(): Song {
  const C = ['Em', 'Em', 'CM', 'DM', 'Em', 'Em', 'CM', 'B7'];
  const mel = `
    e5 - e5 - g5 - e5 - b5 - - - a5 - g5 -
    f#5 - g5 - a5 - g5 - f#5 - e5 - d5 - - -
    e5 - - - c5 - e5 - g5 - - - e5 - c5 -
    d5 - f#5 - a5 - - - d6 - - - c6 - a5 -
    b5 - - - g5 - b5 - e6 - - - d6 - b5 -
    c6 - b5 - a5 - g5 - f#5 - g5 - a5 - - -
    g5 - - - e5 - g5 - c6 - - - b5 - a5 -
    b5 - - - - - - - d#5 - - - f#5 - a5 -`;
  let dr: Note[] = [];
  for (let b = 0; b < 8; b++)
    dr = dr.concat(drums(b === 0 ? 'x . h k s . h k k . h k s k h h' : b === 7 ? 'k . h k s . h k s s s s s s s s' : 'k . h k s . h k k . h k s k h h', b * 16));
  return {
    name: 'chase',
    bpm: 172,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'guitar', vol: 0.15, notes: seq(mel, 0, 0.85), rev: 0.3 },
      { inst: 'harpsi', vol: 0.08, notes: arp(C, [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3], 4, 0.5) },
      { inst: 'bass', vol: 0.24, notes: bassLine(C, 'r r R r r r R r r r R r f f R r', 2, 0.8) },
      { inst: 'organ', vol: 0.04, notes: pads(C, 3, 0.5) },
      { inst: 'drums', vol: 0.5, notes: dr },
    ],
  };
}

/** The Undervault: slow organ and choir over a heartbeat of toms. */
function songUndervault(): Song {
  const C = ['Dm', 'Dm', 'A#M', 'AM', 'Gm', 'Ed', 'A7', 'Dm'];
  const mel = `
    d5 - - - - - - - a4 - - - d5 - e5 -
    f5 - - - e5 - - - d5 - - - - - - -
    d5 - - - f5 - - - a#5 - - - a5 - g5 -
    a5 - - - - - - - c#5 - - - e5 - - -
    g5 - - - - - - - d5 - - - a#4 - - -
    a#4 - - - g4 - - - e4 - - - g4 - a#4 -
    a4 - - - c#5 - - - e5 - - - g5 - - -
    f5 - - - - - - - d5 - - - - - - -`;
  let dr: Note[] = [];
  for (let b = 0; b < 8; b++) dr = dr.concat(drums('t . . t . . . . . . . . . . . .', b * 16));
  return {
    name: 'undervault',
    bpm: 88,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'organ', vol: 0.09, notes: seq(mel, 0, 0.75), rev: 0.8 },
      { inst: 'choir', vol: 0.08, notes: pads(C, 3, 0.55), rev: 0.9 },
      { inst: 'harpsi', vol: 0.05, notes: arp(C, [0, -1, 1, -1, 2, -1, 1, -1], 3, 0.4), rev: 0.6 },
      { inst: 'bass', vol: 0.15, notes: bassLine(C, 'r - - - - - - - r - - - - - - -', 1, 0.6) },
      { inst: 'drums', vol: 0.3, notes: dr },
    ],
  };
}

/** Kennel Yards: a galloping hunt in G minor. */
function songKennels(): Song {
  const C = ['Gm', 'Gm', 'D#M', 'FM', 'Gm', 'Cm', 'DM', 'DM'];
  const mel = `
    g4 - a#4 - d5 - - - g5 - f5 - d5 - c5 -
    a#4 - - - g4 - - - d5 - - - . . . .
    d#5 - - - g5 - d#5 - a#4 - - - d#5 - f5 -
    f5 - - - a5 - f5 - c5 - - - a4 - c5 -
    d5 - g5 - a#5 - - - a5 - g5 - f5 - d5 -
    d#5 - - - c5 - - - g5 - - - d#5 - c5 -
    d5 - f#5 - a5 - - - c6 - a5 - f#5 - d5 -
    a5 - - - - - - - f#5 - - - d5 - - -`;
  let dr: Note[] = [];
  for (let b = 0; b < 8; b++)
    dr = dr.concat(drums(b === 0 ? 'x . k k s . k k k . k k s . h h' : b === 7 ? 'k . k k s . k k s s s . s s s s' : 'k . k k s . k k k . k k s . h h', b * 16));
  return {
    name: 'kennels',
    bpm: 138,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'guitar', vol: 0.14, notes: seq(mel, 0, 0.85), rev: 0.35 },
      { inst: 'harpsi', vol: 0.08, notes: arp(C, [0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3], 4, 0.5) },
      { inst: 'bass', vol: 0.22, notes: bassLine(C, 'r . r r R . r r r . r r f . R .', 2, 0.8) },
      { inst: 'organ', vol: 0.04, notes: pads(C, 3, 0.5) },
      { inst: 'drums', vol: 0.45, notes: dr },
    ],
  };
}

/** The Belfry: bells everywhere, a great bell tolling each bar. */
function songBelfry(): Song {
  const C = ['Bm', 'GM', 'Em', 'F#M', 'Bm', 'DM', 'Em', 'F#7'];
  const mel = `
    b4 - - - d5 - - - f#5 - - - e5 - d5 -
    d5 - - - - - - - b4 - - - g4 - - -
    e5 - - - g5 - - - b5 - - - a5 - g5 -
    f#5 - - - - - - - c#5 - - - a#4 - - -
    b5 - - - a5 - - - f#5 - - - d5 - f#5 -
    a5 - - - - - - - f#5 - - - d5 - - -
    g5 - - - e5 - - - b4 - - - e5 - g5 -
    f#5 - - - - - - - - - - - . . . .`;
  // the great bell: each chord's root, low, on the first beat of the bar
  const toll: Note[] = C.map((c, bar) => ({ s: bar * 16, n: chord(c, 2)[0], d: 12, v: 0.9 }));
  let dr: Note[] = [];
  for (let b = 0; b < 8; b++) dr = dr.concat(drums('k . . . t . . . k . t . t . . .', b * 16));
  return {
    name: 'belfry',
    bpm: 100,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.13, notes: seq(mel, 0, 0.8), rev: 0.8 },
      { inst: 'bell', vol: 0.12, notes: toll, rev: 0.9 },
      { inst: 'harpsi', vol: 0.07, notes: arp(C, [0, 2, 1, 2, 0, 2, 1, 2], 4, 0.45), rev: 0.5 },
      { inst: 'organ', vol: 0.06, notes: pads(C, 3, 0.55), rev: 0.7 },
      { inst: 'choir', vol: 0.06, notes: pads(C, 4, 0.5), rev: 0.9 },
      { inst: 'bass', vol: 0.16, notes: bassLine(C, 'r - - - - - - - f - - - r - - -', 2, 0.6) },
      { inst: 'drums', vol: 0.32, notes: dr },
    ],
  };
}

/** Rimeworks Aqueduct: cold and still. Glassy arpeggios, a slow bell, no drums. */
function songAqueduct(): Song {
  const C = ['Fm', 'Fm', 'C#M', 'D#M', 'Fm', 'A#m', 'CM', 'CM'];
  const mel = `
    c5 - - - - - - - g#4 - - - f4 - - -
    g4 - - - g#4 - - - c5 - - - - - - -
    c#5 - - - - - - - f5 - - - g#5 - - -
    g5 - - - - - - - d#5 - - - a#4 - - -
    c5 - - - f5 - - - g#5 - - - c6 - - -
    a#5 - - - - - - - g#5 - - - f5 - - -
    g5 - - - - - - - e5 - - - c5 - - -
    e5 - - - - - - - . . . . . . . .`;
  return {
    name: 'aqueduct',
    bpm: 76,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.12, notes: seq(mel, 0, 0.75), rev: 0.9 },
      { inst: 'harpsi', vol: 0.06, notes: arp(C, [0, 1, 2, 3, 4, 3, 2, 1], 5, 0.35), rev: 0.8 },
      { inst: 'choir', vol: 0.08, notes: pads(C, 3, 0.55), rev: 0.95 },
      { inst: 'bass', vol: 0.12, notes: bassLine(C, 'r - - - - - - - - - - - - - - -', 2, 0.5) },
    ],
  };
}

/** The Ashen Library: a hushed music box over slow organ, a dry clock-tick underneath. */
function songLibrary(): Song {
  const C = ['Dm', 'Dm', 'A#M', 'FM', 'Gm', 'Dm', 'A7', 'A7'];
  const mel = `
    d5 - - - f5 - - - a5 - - - g5 - f5 -
    e5 - - - d5 - - - c5 - - - d5 - - -
    f5 - - - a#5 - - - d6 - - - c6 - a#5 -
    a5 - - - - - - - g5 - - - f5 - - -
    g5 - - - a#5 - - - d6 - - - c6 - a#5 -
    a5 - - - g5 - f5 - e5 - - - d5 - - -
    c#5 - - - e5 - - - g5 - - - a5 - g5 -
    e5 - - - - - - - c#5 - - - a4 - . .`;
  let dr: Note[] = [];
  for (let b = 0; b < 8; b++) dr = dr.concat(drums('t . . . h . . . t . . . h . . .', b * 16).map((n) => ({ ...n, v: n.v * 0.55 })));
  return {
    name: 'library',
    bpm: 84,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.1, notes: seq(mel, 0, 0.75), rev: 0.85 },
      { inst: 'harpsi', vol: 0.06, notes: arp(C, [0, 2, 1, 2, 0, 2, 1, 2], 4, 0.4), rev: 0.6 },
      { inst: 'organ', vol: 0.07, notes: pads(C, 3, 0.5), rev: 0.8 },
      { inst: 'choir', vol: 0.05, notes: pads(C, 4, 0.45), rev: 0.9 },
      { inst: 'bass', vol: 0.13, notes: bassLine(C, 'r - - - - - - - f - - - r - - -', 2, 0.6) },
      { inst: 'drums', vol: 0.25, notes: dr },
    ],
  };
}

// ---------------------------------------------------------------- the 0.18.0 zones

/** One bar's drum pattern repeated for `bars` bars, at volume `v`. */
function drumLoop(pat: string, bars = 8, v = 1): Note[] {
  let out: Note[] = [];
  for (let b = 0; b < bars; b++) out = out.concat(drums(pat, b * 16).map((n) => ({ ...n, v: n.v * v })));
  return out;
}

/** The Lichyard: a slow graveside waltz feel in E minor, a lone bell over low organ. */
function songLichyard(): Song {
  const C = ['Em', 'Em', 'CM', 'Bm', 'Em', 'Am', 'F#d', 'BM'];
  const mel = `
    e5 - - - - - g5 - b5 - - - - - a5 -
    g5 - - - - - e5 - f#5 - - - - - . .
    e5 - - - - - g5 - c6 - - - - - b5 -
    a5 - - - - - f#5 - d5 - - - - - . .
    b5 - - - - - e6 - d6 - - - - - b5 -
    c6 - - - - - a5 - e5 - - - - - . .
    f#5 - - - - - a5 - c6 - - - - - a5 -
    b5 - - - - - - - d#5 - - - f#5 - - -`;
  return {
    name: 'lichyard',
    bpm: 72,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.11, notes: seq(mel, 0, 0.75), rev: 0.9 },
      { inst: 'organ', vol: 0.07, notes: pads(C, 3, 0.5), rev: 0.8 },
      { inst: 'choir', vol: 0.06, notes: pads(C, 4, 0.45), rev: 0.95 },
      { inst: 'harpsi', vol: 0.05, notes: arp(C, [0, -1, 1, -1, 2, -1, 1, -1], 4, 0.4), rev: 0.6 },
      { inst: 'bass', vol: 0.14, notes: bassLine(C, 'r - - - - - f - - - - - r - - -', 2, 0.55) },
      { inst: 'drums', vol: 0.2, notes: drumLoop('t . . . . . . . . . . . . . . .', 8, 0.5) },
    ],
  };
}

/** The Drowned Deeps: slow rolling arpeggios like water, C# minor, a choir far off. */
function songDeeps(): Song {
  const C = ['C#m', 'AM', 'F#m', 'G#M', 'C#m', 'EM', 'F#m', 'G#7'];
  const mel = `
    g#4 - - - - - - - c#5 - - - e5 - - -
    e5 - - - - - - - c#5 - - - a4 - - -
    f#5 - - - - - - - a5 - - - g#5 - f#5 -
    d#5 - - - - - - - . . . . g#4 - - -
    c#5 - - - e5 - - - g#5 - - - - - - -
    b5 - - - - - - - g#5 - - - e5 - - -
    a5 - - - - - - - f#5 - - - c#5 - - -
    d#5 - - - - - - - . . . . . . . .`;
  return {
    name: 'deeps',
    bpm: 66,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.1, notes: seq(mel, 0, 0.7), rev: 0.95 },
      { inst: 'harpsi', vol: 0.06, notes: arp(C, [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 1, 2, 3, 2, 1], 3, 0.35, 2), rev: 0.85 },
      { inst: 'choir', vol: 0.09, notes: pads(C, 3, 0.55), rev: 0.95 },
      { inst: 'bass', vol: 0.14, notes: bassLine(C, 'r - - - - - - - - - - - f - - -', 1, 0.6) },
    ],
  };
}

/** The Serpent Temple: hand drums and a winding line on a raised-fourth scale in A. */
function songTemple(): Song {
  const C = ['Am', 'Am', 'A#M', 'Am', 'Dm', 'Am', 'A#M', 'EM'];
  const mel = `
    a4 - a#4 - c#5 - d5 - e5 - - - d5 - c#5 -
    a#4 - a4 - - - . . e5 - f5 - e5 - - -
    d5 - f5 - a5 - a#5 - a5 - - - f5 - d5 -
    e5 - - - c#5 - a4 - - - . . a4 - c#5 -
    d5 - - - f5 - a5 - g5 - f5 - e5 - d5 -
    c#5 - e5 - a5 - - - g#5 - a5 - e5 - - -
    f5 - d5 - a#4 - d5 - f5 - a#5 - a5 - f5 -
    e5 - - - g#5 - b5 - e6 - - - . . . .`;
  return {
    name: 'temple',
    bpm: 104,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'guitar', vol: 0.11, notes: seq(mel, 0, 0.8), rev: 0.5 },
      { inst: 'harpsi', vol: 0.06, notes: arp(C, [0, 2, 1, 2, 0, 2, 1, 2], 3, 0.45), rev: 0.4 },
      { inst: 'organ', vol: 0.05, notes: pads(C, 3, 0.5), rev: 0.7 },
      { inst: 'bass', vol: 0.18, notes: bassLine(C, 'r . . r . . r . f . . r . . R .', 2, 0.7) },
      { inst: 'drums', vol: 0.36, notes: drumLoop('t . h t . . t h t . h t . t t h', 8, 0.8) },
    ],
  };
}

/** The Warden's Gaol: a trudging march in C minor, chains for a hi-hat. */
function songGaol(): Song {
  const C = ['Cm', 'Cm', 'G#M', 'GM', 'Cm', 'Fm', 'Dd', 'G7'];
  const mel = `
    c5 - - - d#5 - - - g5 - - - f5 - d#5 -
    d5 - - - - - - - c5 - - - . . . .
    g#4 - - - c5 - - - d#5 - - - d5 - c5 -
    b4 - - - - - - - d5 - - - g4 - - -
    c5 - - - g5 - - - d#5 - - - c6 - - -
    g#5 - - - f5 - - - c5 - - - f5 - - -
    d5 - - - f5 - - - g#5 - - - f5 - d5 -
    b4 - - - d5 - - - g5 - - - . . . .`;
  return {
    name: 'gaol',
    bpm: 88,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'organ', vol: 0.09, notes: seq(mel, 0, 0.8), rev: 0.6 },
      { inst: 'harpsi', vol: 0.05, notes: arp(C, [0, 1, 2, 1], 3, 0.45, 4), rev: 0.4 },
      { inst: 'choir', vol: 0.05, notes: pads(C, 3, 0.5), rev: 0.9 },
      { inst: 'bass', vol: 0.2, notes: bassLine(C, 'r - - - r - - - f - - - r - - -', 2, 0.75) },
      { inst: 'drums', vol: 0.36, notes: drumLoop('k . h . s . h . k . h h s . h .', 8, 0.8) },
    ],
  };
}

/** The Cinderworks: hammer-blows on every beat, a driving riff in D minor. */
function songForge(): Song {
  const C = ['Dm', 'Dm', 'A#M', 'CM', 'Dm', 'Gm', 'A#M', 'AM'];
  const mel = `
    d5 - d5 - f5 - d5 - a5 - - - g5 - f5 -
    e5 - d5 - - - . . a4 - d5 - f5 - - -
    a#4 - d5 - f5 - a#5 - a5 - - - f5 - d5 -
    e5 - g5 - c6 - - - a#5 - g5 - e5 - - -
    d5 - f5 - a5 - d6 - c6 - a5 - f5 - a5 -
    g5 - a#5 - d6 - - - a#5 - g5 - d5 - - -
    f5 - d5 - a#4 - d5 - f5 - a#5 - d6 - a#5 -
    a5 - - - c#6 - - - e6 - - - . . . .`;
  return {
    name: 'forge',
    bpm: 132,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'guitar', vol: 0.13, notes: seq(mel, 0, 0.85), rev: 0.3 },
      { inst: 'harpsi', vol: 0.06, notes: arp(C, [0, 1, 2, 3, 2, 1, 0, 1], 4, 0.45), rev: 0.3 },
      { inst: 'organ', vol: 0.05, notes: pads(C, 3, 0.5) },
      { inst: 'bass', vol: 0.22, notes: bassLine(C, 'r . r . R . r . r . r . f . R .', 2, 0.8) },
      { inst: 'drums', vol: 0.45, notes: drumLoop('x . h . s . h . k k h . s . t t', 8, 0.9) },
    ],
  };
}

/** The Mirror Vault: a phrase and then the same phrase backwards, glassy bells in B minor. */
function songVault(): Song {
  const C = ['Bm', 'GM', 'Em', 'F#M', 'F#M', 'Em', 'GM', 'Bm'];
  const fwd = ['b4 - - - d5 - - - f#5 - - - b5 - - -', 'a5 - - - g5 - - - d5 - - - b4 - - -', 'e5 - - - g5 - - - b5 - - - e6 - - -', 'c#6 - - - a#5 - - - f#5 - - - c#5 - - -'];
  // the second half is the first played back to front, note for note
  const back = fwd.map((bar) => bar.split(' ').filter((t) => t !== '-').reverse().join(' - - - ') + ' - - -').reverse();
  return {
    name: 'vault',
    bpm: 80,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'bell', vol: 0.11, notes: seq([...fwd, ...back].join('\n'), 0, 0.75), rev: 0.95 },
      { inst: 'harpsi', vol: 0.05, notes: arp(C, [0, 1, 2, 3, 3, 2, 1, 0], 5, 0.35), rev: 0.9 },
      { inst: 'choir', vol: 0.08, notes: pads(C, 4, 0.5), rev: 0.95 },
      { inst: 'bass', vol: 0.12, notes: bassLine(C, 'r - - - - - - - R - - - - - - -', 2, 0.5) },
    ],
  };
}

/** Rimecrown Heights: wide and windy, a horn-like line over a slow march in G minor. */
function songHeights(): Song {
  const C = ['Gm', 'D#M', 'A#M', 'FM', 'Gm', 'Cm', 'D#M', 'DM'];
  const mel = `
    g4 - - - - - d5 - - - - - g5 - - -
    f5 - - - d#5 - - - a#4 - - - - - . .
    d5 - - - - - f5 - - - - - a#5 - - -
    a5 - - - - - f5 - c5 - - - - - . .
    g5 - - - - - a#5 - - - - - d6 - - -
    c6 - - - - - g5 - d#5 - - - - - g5 -
    a#5 - - - g5 - - - d#5 - - - g5 - a#5 -
    a5 - - - - - - - f#5 - - - d5 - - -`;
  return {
    name: 'heights',
    bpm: 92,
    steps: 128,
    loop: true,
    tracks: [
      { inst: 'organ', vol: 0.1, notes: seq(mel, 0, 0.8), rev: 0.8 },
      { inst: 'bell', vol: 0.06, notes: arp(C, [0, -1, -1, -1, 2, -1, -1, -1], 5, 0.5), rev: 0.9 },
      { inst: 'choir', vol: 0.08, notes: pads(C, 3, 0.55), rev: 0.95 },
      { inst: 'bass', vol: 0.17, notes: bassLine(C, 'r - - - f - - - r - - - f - - -', 2, 0.65) },
      { inst: 'drums', vol: 0.3, notes: drumLoop('k . . . t . . . k . . t t . . .', 8, 0.7) },
    ],
  };
}

export const SONGS: Record<string, () => Song> = {
  lichyard: songLichyard,
  deeps: songDeeps,
  temple: songTemple,
  gaol: songGaol,
  forge: songForge,
  vault: songVault,
  heights: songHeights,
  library: songLibrary,
  undervault: songUndervault,
  kennels: songKennels,
  belfry: songBelfry,
  aqueduct: songAqueduct,
  pass: songPass,
  chase: songChase,
  castle: songCastle,
  catacombs: songCatacombs,
  boss: songBoss,
  title: songTitle,
  save: songSave,
  victory: songVictory,
  gameover: songGameOver,
};

// ---------------------------------------------------------------- instruments

type InstFn = (a: AudioEngine, out: AudioNode, t: number, f: number, dur: number, v: number) => void;

let organWave: PeriodicWave | null = null;

const INST: Record<string, InstFn> = {
  harpsi: (a, out, t, f, dur, v) => {
    const ctx = a.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(7000, t);
    lp.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
    const rel = Math.min(dur + 0.35, 1.0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(v * 0.25, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rel);
    for (const [type, mul, det] of [['sawtooth', 1, -4], ['square', 2, 5]] as [OscillatorType, number, number][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + rel + 0.05);
    }
    lp.connect(g).connect(out);
  },
  organ: (a, out, t, f, dur, v) => {
    const ctx = a.ctx!;
    if (!organWave) {
      const real = new Float32Array([0, 1, 0.7, 0.45, 0.35, 0, 0.25, 0, 0.18]);
      organWave = ctx.createPeriodicWave(real, new Float32Array(real.length));
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.04);
    g.gain.setValueAtTime(v, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    for (const det of [-3, 3]) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(organWave);
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.3);
    }
    g.connect(out);
  },
  bass: (a, out, t, f, dur, v) => {
    const ctx = a.ctx!;
    const ws = ctx.createWaveShaper();
    ws.curve = a.distCurve(6) as any;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.005);
    g.gain.setTargetAtTime(v * 0.6, t + 0.02, 0.1);
    g.gain.setValueAtTime(v * 0.6, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
    for (const [type, mul] of [['sawtooth', 1], ['square', 0.5]] as [OscillatorType, number][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      o.connect(ws);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    ws.connect(lp).connect(g).connect(out);
  },
  guitar: (a, out, t, f, dur, v) => {
    const ctx = a.ctx!;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 180;
    const ws = ctx.createWaveShaper();
    ws.curve = a.distCurve(30) as any;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.setTargetAtTime(v * 0.75, t + 0.05, 0.2);
    g.gain.setValueAtTime(v * 0.75, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(dur > 0.3 ? 14 : 0, t + Math.min(0.3, dur));
    lfo.connect(lg);
    for (const det of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      lg.connect(o.detune);
      o.connect(hp);
      o.start(t);
      o.stop(t + dur + 0.15);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.15);
    hp.connect(ws).connect(lp).connect(g).connect(out);
  },
  choir: (a, out, t, f, dur, v) => {
    const ctx = a.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.35);
    g.gain.setValueAtTime(v, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
    const mixN = ctx.createGain();
    for (const det of [-12, 0, 11]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(mixN);
      o.start(t);
      o.stop(t + dur + 0.6);
    }
    for (const [ff, q, gg] of [[730, 8, 1], [1090, 8, 0.6], [2440, 10, 0.25]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = ff;
      bp.Q.value = q;
      const bg = ctx.createGain();
      bg.gain.value = gg * 2.5;
      mixN.connect(bp).connect(bg).connect(g);
    }
    g.connect(out);
  },
  bell: (a, out, t, f, dur, v) => {
    const ctx = a.ctx!;
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 3.5;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.1, t + 1.2);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    const rel = Math.max(1.2, dur + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rel);
    car.connect(g).connect(out);
    car.start(t);
    mod.start(t);
    car.stop(t + rel + 0.05);
    mod.stop(t + rel + 0.05);
  },
  drums: (a, out, t, id, _dur, v) => {
    const ctx = a.ctx!;
    const noise = (dur: number, type: BiquadFilterType, freq: number, vol: number, q = 1) => {
      const src = ctx.createBufferSource();
      src.buffer = a.noiseBuf;
      const fl = ctx.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = freq;
      fl.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(fl).connect(g).connect(out);
      src.start(t, Math.random());
      src.stop(t + dur + 0.02);
    };
    const tone = (f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    switch (id) {
      case 0: tone(150, 42, 0.22, 1.0 * v); noise(0.02, 'highpass', 3000, 0.2 * v); break;
      case 1: noise(0.16, 'bandpass', 1900, 0.7 * v, 0.8); tone(200, 140, 0.08, 0.4 * v, 'triangle'); break;
      case 2: noise(0.035, 'highpass', 8000, 0.25 * v); break;
      case 3: noise(0.22, 'highpass', 7000, 0.22 * v); break;
      case 4: noise(1.3, 'highpass', 4500, 0.35 * v); break;
      case 5: tone(120, 70, 0.3, 0.6 * v); break;
    }
  },
};

// ---------------------------------------------------------------- sequencer

export class Music {
  private song: Song | null = null;
  private t0 = 0;
  private nextStep = 0;
  private timer: any = null;
  private gain: GainNode | null = null;
  private wet: GainNode | null = null;
  private byStep: Map<number, { tr: Track; n: Note }[]> = new Map();
  current = '';
  /** This player's own volume (1 = full). See setVolume. */
  vol = 1;
  constructor(private a: AudioEngine) {}

  /** Ease this player's volume to `v` (0..1): used to duck the area's song near a save room. */
  setVolume(v: number, ease = 0.4) {
    if (Math.abs(v - this.vol) < 0.01) return;
    this.vol = v;
    const ctx = this.a.ctx;
    if (ctx && this.gain) this.gain.gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, ease);
  }

  play(name: string, fade = 0.6) {
    if (name === this.current) return;
    this.stop(fade);
    this.current = name;
    const a = this.a;
    if (!a.ctx) return;
    const song = SONGS[name]();
    this.song = song;
    this.byStep = new Map();
    for (const tr of song.tracks)
      for (const n of tr.notes) {
        if (!this.byStep.has(n.s)) this.byStep.set(n.s, []);
        this.byStep.get(n.s)!.push({ tr, n });
      }
    const ctx = a.ctx;
    this.gain = ctx.createGain();
    this.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.vol), ctx.currentTime + 0.25);
    this.gain.connect(a.musicBus);
    this.wet = ctx.createGain();
    this.wet.gain.value = 1;
    this.wet.connect(a.musicVerb);
    this.t0 = ctx.currentTime + 0.1;
    this.nextStep = 0;
    const gainNode = this.gain, wetNode = this.wet;
    const trackOut = new Map<Track, GainNode>();
    for (const tr of song.tracks) {
      const bus = ctx.createGain();
      bus.gain.value = tr.vol;
      bus.connect(gainNode);
      const w = ctx.createGain();
      w.gain.value = tr.inst === 'drums' ? 0.08 : tr.rev ?? 0.25;
      bus.connect(w).connect(wetNode);
      trackOut.set(tr, bus);
    }
    const stepDur = 60 / song.bpm / 4;
    const tick = () => {
      if (!this.song || this.song !== song) return;
      const horizon = ctx.currentTime + 0.2;
      while (this.t0 + this.nextStep * stepDur < horizon) {
        const step = this.nextStep;
        const local = step % song.steps;
        if (!song.loop && step >= song.steps) {
          clearInterval(this.timer);
          this.timer = null;
          return;
        }
        const t = this.t0 + step * stepDur;
        const evs = this.byStep.get(local);
        if (evs)
          for (const { tr, n } of evs) {
            const f = tr.inst === 'drums' ? n.n : mtof(n.n);
            INST[tr.inst](a, trackOut.get(tr)!, t, f, n.d * stepDur, n.v);
          }
        this.nextStep++;
      }
    };
    tick();
    this.timer = setInterval(tick, 40);
  }

  stop(fade = 0.5) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    this.current = '';
    const ctx = this.a.ctx;
    if (ctx && this.gain) {
      const g = this.gain, w = this.wet!;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
      w.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
      setTimeout(() => {
        g.disconnect();
        w.disconnect();
      }, fade * 1000 + 3000);
    }
    this.gain = null;
  }
}
