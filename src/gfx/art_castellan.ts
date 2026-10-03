// The Pendulum Castellan: a clockwork knight in blued steel and brass. A dial ticks in his
// chest, a winding key turns in his back, and he carries a halberd taller than he is.
// A puppet (see puppet.ts): channel `a` is the halberd's angle, `b` the key's turn (degrees),
// `c` the chest dial's hands.
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose, bust } from './puppet';

export const CASTELLAN_CELL: Cell = { w: 184, h: 140, ax: 84, ay: 128 };
const BUILD: Build = { k: 1.5, torso: 12, hipR: 4.6, chestR: 6.2, neck: 2, headR: 4.4, arm: [8.5, 8, 2.6, 2], leg: [9.5, 9.5, 3.2, 2.4], foot: 4.2, shoulder: 1.6, hipW: 1.2 };

const STEEL = ramp('#0e1020', '#1e2440', '#343e66', '#56648e', '#8494b8', '#c4d0e6');
const BRASS = ramp('#2a1608', '#5c3410', '#96621c', '#c89638', '#f0cc68', '#fff2b8');
const WOOD = ramp('#1c0e08', '#3c2010', '#5e3a1c', '#84582c');
const DIAL = ramp('#4a4438', '#8c8468', '#c8c0a0', '#f2ecd4');
const RED = ramp('#2c0810', '#5c1018', '#962028', '#c84838');
const GLOW = ramp('#a04808', '#ffa020', '#fff0a0');
const INK = ramp('#06040a', '#14101c');
const RIM = hex('#7aa0e8');

const BASE: Pose = pose(STAND, { an1: 58, an2: 4, af1: 40, af2: -20, a: -82 });

/** Draw him in pose P. Returns the canvas and where his head is (for the portrait). */
export function castellan(P: Pose, cell: Cell = CASTELLAN_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  // far limbs
  R.dim(-0.18, () => {
    R.leg('F', STEEL, BRASS, BRASS);
    R.arm('F', STEEL, BRASS, BRASS);
  });
  // the winding key in his back: a stem and two brass loops that narrow as it turns edge-on
  f.next();
  const stem = R.body(-5, -8), tip = R.body(-9.5, -8.4), wide = Math.abs(Math.cos(P.b * DEG)) * 3.6 + 0.5;
  R.limb(stem, tip, 1, 0.8, BRASS);
  for (const s of [-1, 1]) {
    const c = R.body(-10, -8.4 + s * 3.4);
    R.ball(c, wide, 3.2, BRASS, P.lean + 90);
    if (wide > 1.6) R.ball(c, wide * 0.45, 1.5, INK, P.lean + 90);
  }
  // cuirass, a red sash, the chest dial
  R.torso(STEEL);
  R.groove(R.body(-3.6, -3), R.body(4.2, -3.4), -0.2);
  R.groove(R.body(-4, -9.5), R.body(4.8, -10), 0.16);
  f.next();
  R.limb(R.body(-4.4, -1.6), R.body(4.6, -2), 1.3, 1.3, RED);
  R.limb(R.body(-3.4, -1), R.body(-5 - P.sway * 2.4, 6), 1.2, 0.5, RED);
  f.next();
  const dial = R.body(1.6, -7.4);
  R.ball(dial, 3.5, 3.5, BRASS);
  f.disc(dial[0], dial[1], 2.5 * k, DIAL, 0.82);
  for (const [ang, len] of [[P.c, 2.2], [P.c * 12, 1.5]]) R.stroke(dial, R.at(dial, ang - 90, len), INK, 0.2);
  // tassets over the hips, then the near leg
  f.next();
  for (let i = 0; i < 3; i++) R.limb(R.body(-3 + i * 3, 0), R.body(-3.6 + i * 3.4 - P.sway, 5.2), 2, 1.5, i % 2 ? BRASS : STEEL, 0.8);
  R.leg('N', STEEL, BRASS, BRASS);
  // helm: a barrel of steel, a brass comb, a slit of furnace light
  f.next();
  R.ball(J.head, 4.5, 4.9, STEEL, P.lean + P.head);
  R.limb(R.face(-3.4, -4.2), R.face(3, -5), 1.1, 0.8, BRASS);
  for (let i = 0; i < 4; i++) R.stroke(R.face(-2.6 + i * 1.6, -5), R.face(-3.6 + i * 1.6 - P.sway, -8.2 - (i % 2)), RED, 0.5 + i * 0.1, 2);
  R.limb(R.face(0.4, -0.6), R.face(4.6, -0.4), 1, 1, INK);
  R.dot(R.face(3.2, -0.6), GLOW, 0.6 + P.mouth * 0.4);
  R.dot(R.face(4.2, -0.5), GLOW, 0.95);
  R.limb(R.face(2, 2.2), R.face(4.2, 4.4), 1.6, 0.9, STEEL); // the beak of the visor
  R.groove(R.face(-2, 1.4), R.face(3.6, 1.8), -0.2);
  // the halberd: shaft, axe blade, spike and back-hook
  f.next();
  const ux = Math.cos(P.a * DEG), uy = Math.sin(P.a * DEG);
  const along = (d: number, side = 0): V => [J.handN[0] + (ux * d - uy * side) * k, J.handN[1] + (uy * d + ux * side) * k];
  R.limb(along(-18), along(31), 0.9, 0.9, WOOD);
  R.limb(along(31), along(40), 1, 0.2, STEEL);
  f.poly([along(26, 1), along(29, 9.5), along(36, 8), along(37, 1)], STEEL, (x, y) => 0.45 + ((x * 0.7 + y) % 5) * 0.07);
  f.poly([along(28, -1), along(30, -5.5), along(33, -1)], STEEL, 0.4);
  R.ball(along(27.5), 1.6, 1.6, BRASS);
  R.ball(along(-18), 1.3, 1.3, BRASS);
  // near arm over the shaft, and a brass pauldron
  R.arm('N', STEEL, BRASS, BRASS);
  f.next();
  R.ball(J.shN, 3.7, 3.3, BRASS, P.lean);
  R.groove(R.at(J.shN, 200, 3), R.at(J.shN, -20, 3), -0.18);
  return { f, head: J.head };
}

const draw = (P: Pose) => castellan(P).f.resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.6, an2: 4 + wave(t, 0.1) * 3, head: wave(t, 0.2) * 2, b: t * 360, c: t * 30, a: -82 + wave(t, 0.15) * 1.5 });
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, {
    ln1: 92 + s * 24, ln2: 100 + s * 16 + Math.max(0, c) * 24, lf1: 92 - s * 24, lf2: 100 - s * 16 + Math.max(0, -c) * 24,
    lean: 5, oy: Math.abs(c) * -1.2, an1: 62 - s * 6, af1: 44 + s * 8, a: -74 + s * 3, b: t * 720, c: t * 60, head: -c * 2,
  });
};
const chop = keyed(BASE, [
  [0, {}],
  [0.3, { an1: -118, an2: -84, af1: -100, af2: -70, a: -128, lean: -10, head: -8, ln1: 106, lf1: 76, mouth: 1 }],
  [0.55, { an1: -124, an2: -92, af1: -104, af2: -76, a: -140, lean: -13, head: -10, ln1: 108, lf1: 74, mouth: 1 }],
  [0.72, { an1: 26, an2: 30, af1: 18, af2: 20, a: 40, lean: 26, head: 12, ln1: 112, ln2: 96, lf1: 62, lf2: 100, ox: 5, mouth: 1 }],
  [1, { an1: 30, an2: 34, af1: 22, af2: 24, a: 42, lean: 24, head: 10, ln1: 112, ln2: 96, lf1: 62, lf2: 100, ox: 5 }],
]);
const stuck = (t: number): Pose => pose(BASE, { an1: 30 - wave(t) * 6, an2: 34, af1: 22, af2: 24, a: 42, lean: 20 - wave(t) * 7, head: 6 + wave(t, 0.2) * 8, ln1: 112, ln2: 96, lf1: 64, lf2: 100 + wave(t) * 4, ox: 5 - wave(t) * 2, b: t * 90 });
const sweep = keyed(BASE, [
  [0, {}],
  [0.3, { an1: 150, an2: 168, af1: 130, af2: 150, a: 172, lean: -6, head: 6, ln1: 104, lf1: 78, mouth: 1 }],
  [0.45, { an1: 154, an2: 172, af1: 134, af2: 154, a: 178, lean: -8, head: 8, ln1: 106, lf1: 76, mouth: 1 }],
  [0.7, { an1: 24, an2: 12, af1: 10, af2: 0, a: 12, lean: 16, head: -4, ln1: 110, lf1: 66, lf2: 100, ox: 4, mouth: 1 }],
  [1, { an1: -30, an2: -50, af1: -40, af2: -60, a: -48, lean: 6, head: -6, ln1: 104, lf1: 74 }],
]);
const thrust = keyed(BASE, [
  [0, {}],
  [0.4, { an1: 160, an2: 190, af1: 60, af2: 10, a: 2, lean: -10, ox: -5, ln1: 112, ln2: 100, lf1: 70, mouth: 1 }],
  [0.6, { an1: 8, an2: 2, af1: 20, af2: 4, a: 2, lean: 22, ox: 8, ln1: 122, ln2: 104, lf1: 56, lf2: 104, mouth: 1 }],
  [1, { an1: 10, an2: 4, af1: 22, af2: 6, a: 3, lean: 20, ox: 8, ln1: 120, ln2: 104, lf1: 58, lf2: 104 }],
]);
const stun = (t: number): Pose => pose(BASE, { lean: 34 + wave(t) * 2, head: 34 + wave(t, 0.2) * 3, an1: 96 + wave(t, 0.3) * 4, an2: 100, af1: 92, af2: 96, a: 64, ln1: 76, ln2: 118, lf1: 64, lf2: 112, c: 200, mouth: -1 });
const shift = (t: number): Pose => pose(BASE, { an1: -96, an2: -84 + wave(t) * 4, af1: -70, af2: -96, a: -90, lean: -8, head: -14, b: t * 1440, c: t * 720, mouth: 1, breath: 1, oy: wave(t) * 1 });

export function buildCastellanSheet(): SheetBuilder {
  const C = CASTELLAN_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'chop', 10, chop, draw, false);
  bake(b, 'stuck', 6, stuck, draw);
  bake(b, 'sweep', 10, sweep, draw, false);
  bake(b, 'thrust', 8, thrust, draw, false);
  bake(b, 'stun', 6, stun, draw);
  bake(b, 'shift', 6, shift, draw);
  return b;
}

export function castellanPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => castellan(pose(BASE, { mouth: angry ? 1 : 0, head: angry ? -6 : 0, an1: 100, an2: 100, a: -86, b: 30, c: angry ? 140 : 20 }), cell, 3.6), RIM);
}

// ---------------------------------------------------------------- the clock tower's props

/** 64x64, centered: `gear` (8 frames, one tooth of turn), `bob` (the pendulum's weight and blade), `face` is separate. */
export function buildCastellanProps(): SheetBuilder {
  const b = new SheetBuilder(64, 64, 32, 32);
  const TEETH = 12;
  b.add('gear', ...Array.from({ length: 8 }, (_, i) => {
    const f = new FormCanvas(64, 64), turn = ((i / 8) * 360) / TEETH;
    for (let t = 0; t < TEETH; t++) {
      const a = (turn + (t * 360) / TEETH) * DEG;
      f.limb(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28, 4, 3, BRASS, 0.7);
    }
    f.ball(32, 32, 23, 23, BRASS, 0, 0.5);
    f.next();
    f.ball(32, 32, 15, 15, STEEL, 0, 0.4);
    for (let s = 0; s < 4; s++) {
      const a = (turn * 3 + s * 90) * DEG;
      f.limb(32, 32, 32 + Math.cos(a) * 15, 32 + Math.sin(a) * 15, 2.4, 2.4, BRASS, 0.8);
    }
    f.ball(32, 32, 5, 5, BRASS);
    return f.resolve({ rim: RIM });
  }));
  const f = new FormCanvas(64, 64);
  f.poly([[8, 34], [56, 34], [44, 54], [32, 60], [20, 54]], STEEL, (x, y) => 0.3 + (y - 34) * 0.022 + (x % 7) * 0.012); // the blade under the weight
  f.next();
  f.ball(32, 26, 16, 16, BRASS, 0, 0.7);
  f.ball(32, 26, 8, 8, STEEL, 0, 0.6);
  f.dot(32, 26, GLOW, 0.9);
  b.add('bob', f.resolve({ rim: RIM }));
  return b;
}

/** The great clock face behind the arena (160x160, centered), drawn flat and dim so it sits back. */
export function buildClockFace(): SheetBuilder {
  const b = new SheetBuilder(160, 160, 80, 80), p = new PixelCanvas(160, 160);
  p.circle(80, 80, 78, hex('#1a1626'));
  p.circle(80, 80, 72, hex('#2c2638'));
  p.circle(80, 80, 66, hex('#3a3444'));
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU_, big = i % 5 === 0;
    p.line(80 + Math.cos(a) * (big ? 52 : 60), 80 + Math.sin(a) * (big ? 52 : 60), 80 + Math.cos(a) * 64, 80 + Math.sin(a) * 64, hex(big ? '#8a7a50' : '#5a5060'), big ? 3 : 1);
  }
  p.circle(80, 80, 6, hex('#8a7a50'));
  b.add('face', p);
  return b;
}
const TAU_ = Math.PI * 2;
