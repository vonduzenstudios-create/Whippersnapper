// Lady Marrow: a life-size porcelain dancer on strings, ball joints at knee and elbow, a
// cracked cheek, a bladed fan in each hand. And the white-gloved hands of whoever works her.
// Puppet channels: `a` = how far the fans are open (0..1), `b` = how far the skirt flares (0..1).
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose, bust } from './puppet';

export const MARIONETTE_CELL: Cell = { w: 168, h: 156, ax: 84, ay: 144 };
const BUILD: Build = { k: 1.4, torso: 10, hipR: 3, chestR: 3.8, neck: 2.6, headR: 4.3, arm: [8, 8, 1.5, 1.1], leg: [10.5, 10.5, 2, 1.3], foot: 3.4, shoulder: 1.1, hipW: 0.8 };

const PORCELAIN = ramp('#4a4460', '#8a8298', '#bcb4c0', '#dcd4d4', '#f2ece4', '#fffcf6');
const DRESS = ramp('#1c0818', '#3c1028', '#641a3a', '#8e2c4c', '#b84e64', '#dc8a8c');
const LACE = ramp('#5a5068', '#9a90a0', '#cec6cc', '#f0eae8');
const HAIR = ramp('#08060e', '#14101e', '#241c34', '#3c3052');
const JOINT = ramp('#2a1a10', '#5a3a1c', '#8c6430', '#bc9450');
const BLADE = ramp('#20243a', '#4a5474', '#8c98b4', '#d8e0f0');
const RED = ramp('#4a0a14', '#9a1826', '#d83a3a');
const INK = ramp('#08040c', '#1c1420');
const RIM = hex('#b89ae0');

const BASE: Pose = pose(STAND, { an1: 120, an2: 70, af1: 60, af2: 20, ln1: 96, ln2: 92, lf1: 86, lf2: 92, air: 3 });

export function marionette(P: Pose, cell: Cell = MARIONETTE_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  /** A fan of blades in a hand, opening round the direction the forearm points. */
  const fan = (hand: V, fore: number) => {
    f.next();
    for (let i = -2; i <= 2; i++) R.limb(hand, R.at(hand, fore + P.lean + i * (4 + P.a * 17), 7.5), 0.5, 1.1, BLADE, 0.6);
    R.ball(hand, 1.1, 1.1, JOINT);
  };
  R.dim(-0.16, () => {
    R.leg('F', PORCELAIN, DRESS, JOINT);
    fan(J.handF, P.af2);
    R.arm('F', PORCELAIN, PORCELAIN, JOINT);
  });
  // hair: a tight bun and two ribbons that trail behind the motion
  f.next();
  R.ball(R.face(-4.4, -2.6), 2.8, 2.8, HAIR);
  for (const s of [0, 1]) R.limb(R.face(-4.6, -1.6), R.face(-7 - P.sway * 3 - s * 1.5, 4 + s * 3), 0.8, 0.4, RED);
  // bodice and neck
  R.torso(DRESS, PORCELAIN);
  R.groove(R.body(-2.6, -5), R.body(3, -5.4), 0.16);
  for (let i = 0; i < 3; i++) R.dot(R.body(1.4, -3.4 - i * 2), LACE, 0.9);
  f.next();
  R.limb(R.body(-2.8, -9.6), R.body(3.2, -9.8), 1.1, 1.1, LACE); // a lace collar
  // the skirt: stiff petals that lift as she spins
  f.next();
  const p = J.pelvis;
  for (let i = 0; i < 9; i++) {
    const u = i / 8 - 0.5, ang = 90 + u * (70 + P.b * 86) - P.sway * 8;
    R.limb([p[0] + u * 5 * k, p[1] - k], R.at([p[0] + u * 5 * k, p[1]], ang, 7.5 + (i % 2) * 1.2), 1.6, 2.1, i % 2 ? LACE : DRESS, 0.8, (t) => t * 0.14 - 0.06);
  }
  R.leg('N', PORCELAIN, DRESS, JOINT);
  // head: porcelain, a painted face, a crack down one cheek
  f.next();
  R.ball(J.head, 4.2, 4.6, PORCELAIN, P.lean + P.head);
  f.next();
  R.ball(R.face(-1.4, -2.4), 4, 3.3, HAIR, P.lean + P.head - 20);
  R.limb(R.face(-0.6, -4.4), R.face(3.4, -2.6), 1.3, 0.6, HAIR);
  R.dot(R.face(2.4, -0.4), INK, 0.1);
  R.dot(R.face(3.2, -0.4), P.mouth > 0.5 ? RED : INK, P.mouth > 0.5 ? 0.9 : 0.1);
  R.stroke(R.face(1.6, -1.6), R.face(4, -1.2 - P.mouth * 0.8), INK, 0.2);
  R.dot(R.face(2.6, 1.3), RED, 0.5); // a painted cheek
  R.dot(R.face(3.6, 2.4), RED, 0.8);
  if (P.mouth > 0.5) R.stroke(R.face(2.8, 2.6), R.face(3.8, 3.2), INK, 0.1);
  R.groove(R.face(0.8, 0.2), R.face(1.8, 2.2), -0.34);
  R.groove(R.face(1.8, 2.2), R.face(1.2, 4), -0.34);
  fan(J.handN, P.an2);
  R.arm('N', PORCELAIN, PORCELAIN, JOINT);
  f.next();
  R.ball(J.shN, 1.9, 1.9, DRESS); // a puffed sleeve
  return { f, head: J.head };
}

const draw = (P: Pose) => marionette(P).f.resolve({ rim: RIM, contour: 0.1 });

const idle = (t: number): Pose => pose(BASE, { air: 3 + wave(t) * 1.4, head: 6 + wave(t, 0.2) * 5, an1: 120 + wave(t, 0.15) * 6, an2: 74 + wave(t, 0.3) * 8, af2: 20 + wave(t, 0.25) * 8, ln2: 94 + wave(t, 0.3) * 5, lf2: 92 + wave(t, 0.4) * 5, lean: wave(t, 0.1) * 2, a: 0.25, b: 0.1 });
const dance = (t: number): Pose => {
  const s = wave(t);
  return pose(BASE, { air: 2 + Math.abs(s) * 3, ln1: 92 + s * 18, ln2: 96 + s * 10 + Math.max(0, s) * 16, lf1: 90 - s * 18, lf2: 94 - s * 10 + Math.max(0, -s) * 16, an1: -70 + s * 12, an2: -110, af1: -100 - s * 12, af2: -70, head: s * 6, lean: 4 + s * 2, a: 0.6, b: 0.35 + Math.abs(s) * 0.2 });
};
const spin = (t: number): Pose => pose(BASE, { air: 4, an1: 176 + wave(t) * 14, an2: 184 + wave(t, 0.1) * 18, af1: 4 - wave(t) * 14, af2: -4 - wave(t, 0.1) * 18, lf1: 24, lf2: 128, ln1: 92, ln2: 90, head: wave(t) * 10, lean: wave(t, 0.25) * 4, a: 1, b: 1, mouth: 1 });
const rise = keyed(BASE, [
  [0, {}],
  [1, { air: 8, an1: -84, an2: -96, af1: -100, af2: -88, head: -22, lean: -6, ln1: 98, ln2: 96, lf1: 92, lf2: 100, a: 0.2, b: 0, mouth: 1 }],
]);
const kick = keyed(BASE, [
  [0, { air: 8, an1: -84, an2: -96, af1: -100, af2: -88, head: -22, lean: -6 }],
  [1, { air: 6, lean: -34, ln1: 34, ln2: 34, lf1: -8, lf2: 112, an1: 190, an2: 210, af1: 160, af2: 190, head: 26, a: 1, b: 0.8, mouth: 1 }],
]);
const curtsey = keyed(BASE, [
  [0, {}],
  [0.35, { air: 0, lean: 40, head: 22, an1: 150, an2: 176, af1: 30, af2: 8, ln1: 112, ln2: 74, lf1: 62, lf2: 110, a: 0.6, b: 0.5 }],
  [0.6, { air: 0, lean: 44, head: 26, an1: 156, an2: 180, af1: 26, af2: 4, ln1: 114, ln2: 72, lf1: 60, lf2: 112, a: 1, b: 0.5, mouth: 1 }],
  [0.8, { air: 1, lean: 22, head: -4, an1: 8, an2: -2, af1: -6, af2: -12, ln1: 132, ln2: 120, lf1: 58, lf2: 104, ox: 9, a: 1, b: 0.7, mouth: 1 }],
  [1, { air: 1, lean: 20, head: -4, an1: 10, an2: 0, af1: -4, af2: -10, ln1: 130, ln2: 118, lf1: 60, lf2: 104, ox: 9, a: 1, b: 0.6, mouth: 1 }],
]);
const heap = (t: number): Pose => pose(BASE, { air: 0, lean: 52 + wave(t) * 2, head: 38 + wave(t, 0.2) * 4, an1: 100, an2: 60 + wave(t, 0.3) * 4, af1: 84, af2: 30, ln1: 12, ln2: 6, lf1: -4, lf2: 24, a: 0, b: 0.2 });
const held = (t: number): Pose => pose(BASE, { air: 6, an1: -86, an2: -92, af1: -94, af2: -88, head: 20 + wave(t) * 6, lean: wave(t) * 5, ln1: 96 + wave(t, 0.2) * 6, ln2: 100 + wave(t, 0.3) * 8, lf1: 88 + wave(t, 0.25) * 6, lf2: 96 + wave(t, 0.35) * 8, a: 0.3, b: 0.15 });

export function buildMarionetteSheet(): SheetBuilder {
  const C = MARIONETTE_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'dance', 8, dance, draw);
  bake(b, 'spin', 8, spin, draw);
  bake(b, 'rise', 5, rise, draw, false);
  bake(b, 'kick', 4, kick, draw, false);
  bake(b, 'curtsey', 10, curtsey, draw, false);
  bake(b, 'stun', 6, heap, draw);
  bake(b, 'held', 8, held, draw);
  return b;
}

export function marionettePortrait(angry: boolean): PixelCanvas {
  return bust((cell) => marionette(pose(BASE, { air: 0, mouth: angry ? 1 : 0, head: angry ? -4 : 8, an1: 100, an2: 100, af1: 100, af2: 100, a: 0 }), cell, 3.7), RIM);
}

// ---------------------------------------------------------------- the puppeteer's hands, and the stage

const GLOVE = ramp('#3a3448', '#6c6478', '#a49cac', '#d4ccd4', '#f6f0f0');
const CUFF = ramp('#14060e', '#32101e', '#5a1a30', '#842a44');

/** One gloved hand, fingers down. `curl` 0 = open, 1 = a fist; `spread` fans the fingers; `flat` lays it on the floor. */
function hand(curl: number, spread: number, wig = 0): PixelCanvas {
  const f = new FormCanvas(120, 120);
  f.limb(60, 0, 60, 26, 15, 13, CUFF); // the sleeve, running up out of the cell
  f.limb(47, 26, 73, 26, 4, 4, GLOVE, 0.8);
  f.next();
  f.ball(60, 46, 21, 19, GLOVE);
  for (let i = 0; i < 3; i++) f.groove(46 + i * 9, 34, 48 + i * 9, 56, -0.12);
  for (let i = 0; i < 4; i++) {
    const bx = 43 + i * 11.5, by = 60;
    const a = (90 + (i - 1.5) * (5 + spread * 9) + Math.sin(wig + i) * 4 * (1 - curl)) * (Math.PI / 180);
    const l1 = 17 * (1 - curl * 0.45), l2 = 15 * (1 - curl * 0.75);
    const mx = bx + Math.cos(a) * l1, my = by + Math.sin(a) * l1;
    f.next();
    f.limb(bx, by, mx, my, 5.4, 4.8, GLOVE);
    f.limb(mx, my, mx + Math.cos(a) * l2 * (1 - curl), my + Math.sin(a) * l2 - curl * 5, 4.8, 4, GLOVE);
  }
  // the thumb comes across the palm as the hand closes
  f.next();
  const ta = (160 - curl * 80) * (Math.PI / 180);
  f.limb(40, 48, 40 + Math.cos(ta) * 15, 48 + Math.sin(ta) * 15 + curl * 6, 5.6, 4.4, GLOVE);
  return f.resolve({ rim: RIM, contour: 0.12 });
}

/** 120x120, centered on the palm: `open` (8, fingers idling), `fist` (2), `grip` (2, holding her strings). */
export function buildHandSheet(): SheetBuilder {
  const b = new SheetBuilder(120, 120, 60, 46);
  b.add('open', ...Array.from({ length: 8 }, (_, i) => hand(0.08, 0.7, (i / 8) * Math.PI * 2)));
  b.add('fist', hand(0.85, 0), hand(1, 0));
  b.add('grip', hand(0.6, 0.2, 0), hand(0.66, 0.2, 2));
  return b;
}

/** 48x56, centered: `bag` (a sandbag on its rope), and 96x224 `curtain` is its own sheet. */
export function buildStageProps(): SheetBuilder {
  const b = new SheetBuilder(48, 56, 24, 30);
  const SACK = ramp('#2a2014', '#5a4628', '#8a7040', '#b89c60', '#dcc890');
  const f = new FormCanvas(48, 56);
  f.limb(24, 0, 24, 14, 1.4, 1.4, JOINT);
  f.ball(24, 34, 15, 18, SACK);
  f.limb(15, 16, 33, 16, 3, 3, JOINT, 0.8);
  f.ball(24, 12, 5, 4, SACK);
  for (let i = 0; i < 4; i++) f.groove(13 + i * 6, 24, 15 + i * 6, 48, i % 2 ? -0.14 : 0.1);
  b.add('bag', f.resolve({ rim: RIM }));
  return b;
}

/** A stage curtain (96x240, anchored top middle), drawn flat: heavy red folds and a gold fringe. */
export function buildCurtain(): SheetBuilder {
  const b = new SheetBuilder(96, 240, 48, 0), p = new PixelCanvas(96, 240);
  const cols = ['#2a0810', '#4a0e1a', '#6e1626', '#8e2030', '#6e1626', '#4a0e1a'];
  for (let x = 0; x < 96; x++) {
    const fold = cols[Math.floor(((x + Math.sin(x * 0.4) * 2) / 8) % cols.length)];
    const len = 214 + Math.sin(x * 0.3) * 6 - Math.abs(x - 48) * 0.3;
    for (let y = 0; y < len; y++) p.set(x, y, hex(fold));
    for (let y = Math.floor(len); y < len + 5; y++) p.set(x, y, hex(x % 3 ? '#c89638' : '#7c4e16'));
  }
  b.add('curtain', p);
  return b;
}
