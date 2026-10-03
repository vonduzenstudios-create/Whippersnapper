// The Sanguine Duchess: a vampire noblewoman. Skin like candle wax, red eyes, black hair pinned
// high, a stiff winged collar framing her head, a gown of black and wine red with a gold-laced
// bodice. A lace fan in one hand; from the other a lash of her own blood uncoils.
// Channels: `a` = the lash's angle, `b` = how far it is paid out (0..1), `c` = the fan open (0..1).
// `dissolve` frames are her bursting into bats: pixels drop away by a fixed noise.
import { SheetBuilder, PixelCanvas } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose } from '../puppet';
import { GOLD, INK, RIM, toward } from './common';

export const DUCHESS_CELL: Cell = { w: 196, h: 108, ax: 70, ay: 102 };
const BUILD: Build = { k: 1.3, torso: 12.5, hipR: 3.8, chestR: 4.8, neck: 2.4, headR: 3.2, arm: [7.6, 7.2, 1.7, 1.3], leg: [9.6, 9.4, 2.2, 1.6], foot: 3.6, shoulder: 1.4, hipW: 1 };

const SKIN = ramp('#3a3040', '#6a5c6c', '#a092a0', '#cec2c8', '#ece4e4', '#fffafa');
const GOWN = ramp('#08040a', '#160a14', '#24101e', '#36182a', '#4c2236');
const WINE = ramp('#1a0208', '#3c0612', '#640c1c', '#8e1828', '#b82e38');
const HAIR = ramp('#060408', '#120c14', '#201824', '#302636');
const BLOOD = ramp('#2a0004', '#5c0410', '#9a0a18', '#d02030', '#ff6060');
const EYE = ramp('#600008', '#e01020', '#ff9090');
const LACE = ramp('#2a2228', '#5a4e56', '#8e8288', '#c2b6b8');

const BASE: Pose = pose(STAND, { lean: -2, head: -4, an1: 70, an2: 40, af1: 50, af2: -20, a: 100, b: 0, c: 0.4, ln1: 96, lf1: 84 });

/** The blood lash: a tapering crimson whip following an arc from the hand, with droplets flying off. */
function lash(R: Rig, from: V, deg: number, len: number, curl: number) {
  const f = R.f;
  let p = from, a = deg;
  const n = Math.max(2, Math.round(len / 3));
  f.next();
  for (let i = 0; i < n; i++) {
    a += curl;
    const q = toward(p, a, 3);
    const r = 1.1 - (i / n) * 0.8;
    f.limb(p[0], p[1], q[0], q[1], r * R.k, r * R.k * 0.9, BLOOD, 1, () => 0.1);
    if (i % 4 === 3 && len > 20) f.dot(...toward(q, a + 90, 2.4), BLOOD, 0.8);
    p = q;
  }
  f.dot(...p, BLOOD, 1);
}

export function duchess(P: Pose, cell: Cell = DUCHESS_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  // the gown's train behind her
  f.next();
  for (let i = 0; i < 4; i++) R.limb(R.body(-2, 2 + i * 2), [J.pelvis[0] - (8 + i * 3 + P.sway * 3) * k, cell.ay - 1 - i * 0.6], 1.8 + i * 0.4, 1.6, GOWN, 0.8, () => (i % 2 ? -0.05 : 0.04));
  // far arm and the lace fan
  R.dim(-0.16, () => {
    R.arm('F', GOWN, SKIN);
  });
  f.next();
  const fh = J.handF, open = P.c;
  for (let i = 0; i < 7; i++) {
    const ang = -110 + P.lean + (i - 3) * (6 + open * 16);
    const tip = toward(fh, ang, 7 * k);
    f.poly([fh, toward(fh, ang - 3 - open * 6, 7 * k), tip, toward(fh, ang + 3 + open * 6, 7 * k)], i % 2 ? LACE : WINE, 0.5 + (i % 2) * 0.15);
  }
  R.ball(fh, 1, 1, GOLD);
  // the skirt: a full bell of black over a wine-red underskirt
  R.robe(WINE, 16.6, 7.6, BUILD.hipR * 1.2, 5);
  R.robe(GOWN, 16, 6.6, BUILD.hipR * 1.1, 6);
  // the bodice, laced with gold, a ruby at the throat
  R.torso(GOWN, SKIN);
  f.next();
  R.ball(R.body(1, -BUILD.torso + 1.6), 3, 1.6, SKIN, P.lean); // bare shoulders and collarbone
  for (let i = 0; i < 4; i++) R.stroke(R.body(1.4, -9 + i * 2), R.body(3.6, -8 + i * 2), GOLD, 0.7);
  R.stroke(R.body(-3.6, -1), R.body(3.6, -1), GOLD, 0.6, 1);
  R.ball(R.at(J.neck, 90 + P.lean, 1.4), 0.9, 0.9, BLOOD);
  // the high winged collar standing up behind her head
  f.next();
  const back = R.body(-1.4, -BUILD.torso - 0.6);
  for (let i = 0; i < 5; i++) {
    const ang = -150 + i * 24 + P.lean;
    f.poly([back, toward(back, ang - 9, 6.6 * k), toward(back, ang, 8.2 * k), toward(back, ang + 9, 6.6 * k)], i % 2 ? WINE : GOWN, 0.4 + i * 0.04);
  }
  // head: pale, sharp, hair pinned high, red eyes
  f.next();
  R.ball(J.head, 3.2, 3.6, SKIN, P.lean + P.head);
  R.limb(R.face(1.6, 1.6), R.face(2.8, 3.2), 1.4, 0.7, SKIN); // a sharp chin
  R.dot(R.face(2.2, -0.4), EYE, 0.95);
  R.dot(R.face(2.9, -0.4), EYE, 0.7);
  R.groove(R.face(1.6, -1.2), R.face(3, -1.4), -0.3); // the brow
  R.groove(R.face(2.2, 2), R.face(3, 2), -0.35); // lips
  R.dot(R.face(2.6, 2.1), BLOOD, 0.7);
  if (P.mouth > 0.5) R.stroke(R.face(2.4, 2.2), R.face(2.5, 2.9), ramp('#f0f0f0', '#ffffff'), 1); // a fang
  f.next();
  R.ball(R.face(-1.2, -2.4), 3.2, 2.6, HAIR, P.lean + P.head);
  R.ball(R.face(-2.4, -5.4), 2.2, 2.4, HAIR, P.lean + P.head); // the pinned coil
  R.limb(R.face(0.6, -3.2), R.face(2.4, -1.4), 1.4, 0.6, HAIR); // swept over the brow
  R.stroke(R.face(-3, -1), R.face(-4.4 - P.sway * 2, 4), HAIR, 0.4, 1); // a loose strand
  R.ball(R.face(-2.2, -7.4), 0.8, 0.8, GOLD); // a pin
  // near arm: a long glove, and the lash
  R.arm('N', GOWN, SKIN);
  if (P.b > 0.02) lash(R, J.handN, P.a, 6 + P.b * 66, P.b > 0.7 ? 1 - P.sway * 3 : 9);
  else R.ball(J.handN, 1.3, 1.3, BLOOD); // a bead of it in her palm
  void INK;
  return f;
}

/** Her figure with pixels falling away: `d` 0 = whole, 1 = gone. */
function dissolved(P: Pose, d: number): PixelCanvas {
  const pc = duchess(P).resolve({ rim: RIM, contour: 0.1 });
  if (d <= 0) return pc;
  for (let y = 0; y < pc.h; y++)
    for (let x = 0; x < pc.w; x++) {
      const n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      const r = (n % 1000) / 1000, rise = (pc.h - y) / pc.h; // the top goes first
      if (r * 0.7 + (1 - rise) * 0.3 < d) pc.data[(y * pc.w + x) * 4 + 3] = 0;
    }
  return pc;
}

const draw = (P: Pose) => dissolved(P, 0);

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.5, c: 0.6 + wave(t) * 0.4, af1: 50 + wave(t) * 6, head: -4 + wave(t, 0.3) * 2 });
/** She doesn't walk so much as drift: the hem sways, the head stays level. */
const walk = (t: number): Pose => pose(BASE, { lean: 4, oy: wave(t) * 0.6, ln1: 92 + wave(t) * 10, lf1: 88 - wave(t) * 10, c: 0.2, an1: 74 + wave(t) * 4 });
/** Raised, flung, and cracked out along the floor. */
const crack = keyed(BASE, [
  [0, { b: 0.05 }],
  [0.3, { an1: -150, an2: -160, a: -150, b: 0.3, lean: -8, head: -10, c: 0 }],
  [0.5, { an1: -100, an2: -80, a: -60, b: 0.8, lean: -2, c: 0 }],
  [0.65, { an1: 10, an2: 0, a: 4, b: 1, lean: 10, head: 0, ox: 3, mouth: 1, c: 0 }],
  [0.85, { an1: 14, an2: 6, a: 10, b: 0.9, lean: 8, ox: 3, mouth: 1, c: 0 }],
  [1, { b: 0.05 }],
]);
/** Palm up, then pressed to the floor: the spikes come up out of the stone. */
const spikes = keyed(BASE, [
  [0, {}],
  [0.35, { an1: -40, an2: -80, lean: -10, head: -14, c: 1, mouth: 1 }],
  [0.65, { an1: 70, an2: 90, lean: 30, head: 10, oy: 6, ln1: 60, ln2: 150, lf1: 80, lf2: 150, c: 1, mouth: 1 }],
  [1, { an1: 70, an2: 90, lean: 28, head: 8, oy: 6, ln1: 60, ln2: 150, lf1: 80, lf2: 150, c: 0.6 }],
]);
const burst = (t: number) => pose(BASE, { an1: -60, an2: -100, af1: -60, af2: -100, lean: -6, head: -16, mouth: 1, c: 1, oy: -t * 2 });

export function buildDuchessSheet(): SheetBuilder {
  const C = DUCHESS_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'crack', 12, crack, draw, false);
  bake(b, 'spikes', 8, spikes, draw, false);
  // bursting into bats, and back: the same frames played forward and backward
  const frames = [0, 0.2, 0.4, 0.6, 0.8, 0.95].map((d, i) => dissolved(burst(i / 5), d));
  b.add('burst', ...frames);
  b.add('reform', ...[...frames].reverse());
  return b;
}

/** 24x48 with the anchor at the bottom: `spike` (5 frames of a blood spike growing out of the floor and drying). */
export function buildDuchessProps(): SheetBuilder {
  const b = new SheetBuilder(24, 48, 12, 47);
  b.add('spike', ...[0.3, 0.7, 1, 1, 0.6].map((h, i) => {
    const f = new FormCanvas(24, 48);
    const top = 47 - h * 40;
    f.poly([[6, 47], [12, top], [18, 47]], i === 4 ? WINE : BLOOD, (x) => 0.35 + (x - 6) * 0.04);
    f.poly([[3, 47], [7, 47 - h * 18], [10, 47]], BLOOD, 0.4);
    f.poly([[14, 47], [17, 47 - h * 22], [21, 47]], BLOOD, 0.55);
    f.stroke(12, top + 2, 11, top + 14, BLOOD, 1);
    return f.resolve({ rim: RIM });
  }));
  return b;
}
