// The Stitchwork Brute: a giant sewn together from what the anatomists threw out. The near arm is
// enormous and grey-green, the far one pale and human; every seam is stitched with black thread.
// Iron bolts in its neck, a plate riveted over the top of its skull, one great eye and a mouth sewn
// half shut. Two copper electrodes stand out of its back and spit sparks.
// Channels: `b` = the sparks' flicker (0..1), `c` = 1 while it holds a block of masonry overhead.
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose } from '../puppet';
import { IRON, LEATHER, INK, RIM, rng, toward, angle } from './common';

export const BRUTE_CELL: Cell = { w: 196, h: 156, ax: 90, ay: 150 };
const BUILD: Build = { k: 2, torso: 15, hipR: 5.4, chestR: 10, neck: 1.6, headR: 3, arm: [9.4, 9, 4.2, 3.6], leg: [7.2, 7, 4, 3.2], foot: 4.6, shoulder: 2.6, hipW: 1.8 };

const GREY = ramp('#141a14', '#26322a', '#3e4e40', '#5a6c58', '#7c8c74', '#a4b098');
const PINK = ramp('#2a1416', '#583034', '#8a5a58', '#b88478', '#dcac9a', '#f4d0bc');
const CLOTH = ramp('#0e0a08', '#201812', '#36281c', '#4e3a28', '#6a5036');
const COPPER = ramp('#2a0e04', '#5a2a10', '#8e4a1c', '#c07a34', '#eab060');
const SPARK = ramp('#2050c0', '#60a0ff', '#c0e8ff', '#ffffff');
const EYE = ramp('#5a4a10', '#c8b030', '#fff4a0');
const STONE = ramp('#1e1a20', '#3a3640', '#58525c', '#7a7480', '#a09aa4');

const BASE: Pose = pose(STAND, { lean: 18, head: -12, an1: 18, an2: 60, af1: 60, af2: 80, ln1: 98, lf1: 80, b: 0, c: 0 });

/** A stitched seam from a to b: a dark line crossed by short black stitches. */
function seam(R: Rig, a: V, b: V, n = 4) {
  R.groove(a, b, -0.22);
  const ang = angle(a, b);
  for (let i = 0; i <= n; i++) {
    const m: V = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n];
    R.f.stroke(...toward(m, ang + 90, 1.6), ...toward(m, ang - 90, 1.6), INK, 0, 1);
  }
}

export function brute(P: Pose, cell: Cell = BRUTE_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  // far side: the small pale human arm, the far leg
  R.dim(-0.2, () => {
    R.leg('F', CLOTH, LEATHER);
    f.next();
    R.limb(J.shF, J.elF, 2.6, 2.2, PINK);
    R.limb(J.elF, J.handF, 2.2, 1.8, PINK);
    R.ball(J.handF, 2.2, 2, PINK);
  });
  // the electrodes in its back, sparking between their tips
  f.next();
  const e1 = R.body(-6.2, -9), e2 = R.body(-5.6, -4);
  const t1 = toward(e1, -150 + P.lean, 7 * k), t2 = toward(e2, -165 + P.lean, 7 * k);
  for (const [a, t] of [[e1, t1], [e2, t2]] as [V, V][]) {
    R.limb(a, t, 1, 0.7, COPPER);
    for (let i = 1; i < 4; i++) R.groove(toward(a, angle(a, t), (i * 1.6) * k), toward(a, angle(a, t), (i * 1.6 + 0.4) * k), 0.25);
    R.ball(t, 1.2, 1.2, COPPER);
  }
  if (P.b > 0.4) {
    // a zigzag arc between the tips
    let p = t1;
    for (let i = 1; i <= 4; i++) {
      const q: V = [t1[0] + ((t2[0] - t1[0]) * i) / 4 + (i % 2 ? 2.4 : -2.4) * (P.b - 0.4) * 3, t1[1] + ((t2[1] - t1[1]) * i) / 4];
      R.stroke(p, q, SPARK, 1, 1);
      p = q;
    }
  }
  // the trunk: a swollen gut, a grey chest grafted onto pink, seams everywhere
  R.torso(PINK);
  f.next();
  R.ball(R.body(2.4, -8.6), 4.6, 4.2, GREY, P.lean - 10); // a grafted patch of grey hide
  R.ball(R.body(2.6, -2.6), 6, 5.4, PINK, P.lean); // the belly
  seam(R, R.body(-4, -5.6), R.body(6.4, -4.4), 6);
  seam(R, R.body(2.4, -13.6), R.body(4.4, -6), 4);
  seam(R, R.body(-1.4, -2), R.body(3.6, 3), 3);
  // ragged breeches held up with a rope
  f.next();
  R.ball(J.pelvis, BUILD.hipR * 0.9, BUILD.hipR * 0.7, CLOTH, P.lean);
  R.limb(R.body(-5.4, -0.6), R.body(6, -0.8), 0.8, 0.8, LEATHER);
  R.leg('N', CLOTH, LEATHER);
  // tatters at the knees
  for (const kn of [J.kneeN]) for (let i = 0; i < 3; i++) R.stroke(kn, toward(kn, 100 + i * 20, 3 * k), CLOTH, 0.3, 2);
  // bolts in the neck
  f.next();
  for (const s of [-1, 1]) R.limb(R.body(-0.4 + s * 2.6, -BUILD.torso - 0.2), R.body(-0.4 + s * 4.4, -BUILD.torso - 1), 0.9, 0.9, IRON);
  // the block of masonry it lifts
  if (P.c > 0.5) {
    f.next();
    const mid: V = [(J.handN[0] + J.handF[0]) / 2, Math.min(J.handN[1], J.handF[1]) - 5 * k];
    f.poly([[mid[0] - 8 * k, mid[1] - 5 * k], [mid[0] + 7 * k, mid[1] - 6 * k], [mid[0] + 8 * k, mid[1] + 5 * k], [mid[0] - 7 * k, mid[1] + 6 * k]], STONE, (x, y) => 0.6 - (y - mid[1]) * 0.03 + (x - mid[0]) * 0.008);
    R.groove([mid[0] - 7 * k, mid[1]], [mid[0] + 7 * k, mid[1] - 1 * k], -0.3);
    R.groove([mid[0], mid[1] - 5 * k], [mid[0] + 0.6 * k, mid[1]], -0.3);
  }
  // the great grey arm
  f.next();
  R.limb(J.shN, J.elN, 4.6, 4, GREY);
  R.limb(J.elN, J.handN, 4, 3.6, GREY);
  R.ball(J.handN, 4.2, 3.8, GREY);
  for (let i = 0; i < 4; i++) R.groove(R.at(J.handN, P.an2 + P.lean - 50 + i * 30, 1.8), R.at(J.handN, P.an2 + P.lean - 50 + i * 30, 4), -0.25); // knuckles
  seam(R, R.at(J.shN, P.an1 + P.lean, 2), R.at(J.shN, P.an1 + P.lean + 20, 6), 3);
  R.limb(R.at(J.elN, P.an2 + P.lean, 1), R.at(J.elN, P.an2 + P.lean, 3), 4.2, 4.2, IRON); // an iron cuff
  f.next();
  R.ball(J.shN, 4.4, 3.8, GREY, P.lean);
  seam(R, R.at(J.shN, 200 + P.lean, 4.6), R.at(J.shN, -20 + P.lean, 4.6), 5);
  const rnd = rng(5);
  for (let i = 0; i < 3; i++) R.dot(R.at(J.shN, rnd() * 360, rnd() * 3), INK, 0); // pores, scars
  // the head last: sunk low between the shoulders, but thrust forward of them
  {
  f.next();
  R.ball(J.head, 3.4, 3.2, PINK, P.lean + P.head);
  R.limb(R.face(-3.4, -2.6), R.face(2.8, -3.4), 1.6, 1.4, IRON); // the skull plate
  for (const x of [-2.4, 0, 2]) R.dot(R.face(x, -3.2), IRON, 0.95);
  seam(R, R.face(-2.6, -1.4), R.face(-0.4, 2.4), 3);
  // one huge eye, a little one
  R.ball(R.face(1.8, -0.6), 1.4, 1.3, ramp('#e8e0c8', '#fffaf0'), 0, 0.5);
  R.dot(R.face(2.2, -0.6), EYE, 0.6);
  R.dot(R.face(2.3, -0.6), INK, 0);
  R.dot(R.face(3.1, -0.4), INK, 0);
  // the mouth sewn half shut
  R.groove(R.face(1.2, 1.8), R.face(3.2, 1.6 + P.mouth), -0.35);
  for (let i = 0; i < 3; i++) R.f.stroke(...R.face(1.4 + i * 0.6, 1.2), ...R.face(1.4 + i * 0.6, 2.4), INK, 0, 1);
  }
  return f;
}

const draw = (P: Pose) => brute(P).resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

const spark = (t: number) => ((t * 7.3) % 1 > 0.5 ? 1 : 0.2);
const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 1, b: spark(t), head: -12 + wave(t, 0.3) * 4, an1: 18 + wave(t, 0.1) * 4 });
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 94 + s * 20, ln2: 100 + Math.max(0, c) * 22, lf1: 94 - s * 20, lf2: 100 + Math.max(0, -c) * 22, lean: 16 + s * 3, oy: Math.abs(c) * -2, an1: 18 - s * 14, af1: 60 + s * 14, head: -12 - c * 4, b: spark(t) });
};
/** The great fist raised, then driven into the floor. */
const punch = keyed(BASE, [
  [0, {}],
  [0.4, { an1: -130, an2: -100, lean: -4, head: -6, mouth: 1, b: 1, ln1: 104, lf1: 76 }],
  [0.6, { an1: -134, an2: -104, lean: -6, head: -8, mouth: 1, b: 1 }],
  [0.72, { an1: 60, an2: 80, lean: 40, head: 20, ox: 6, ln1: 120, ln2: 100, lf1: 66, lf2: 104, b: 1, oy: 4 }],
  [1, { an1: 62, an2: 82, lean: 38, head: 18, ox: 6, ln1: 118, lf1: 66, b: 0.2, oy: 4 }],
]);
/** It digs its fingers into the floor and heaves a block of masonry over its head. */
const rip = keyed(BASE, [
  [0, {}],
  [0.4, { lean: 50, head: 30, an1: 50, an2: 60, af1: 40, af2: 60, oy: 8, ln1: 70, ln2: 130, lf1: 70, lf2: 130 }],
  [0.55, { lean: 50, head: 30, an1: 50, an2: 60, af1: 40, af2: 60, oy: 8, ln1: 70, ln2: 130, lf1: 70, lf2: 130, c: 1 }],
  [1, { lean: -6, head: -6, an1: -120, an2: -110, af1: -110, af2: -100, c: 1, mouth: 1 }],
]);
const hold = (t: number): Pose => pose(BASE, { lean: -6, head: -6, an1: -120, an2: -110, af1: -110, af2: -100, c: 1, mouth: 1, oy: wave(t) * 0.8, b: spark(t) });
const toss = keyed(pose(BASE, { c: 1 }), [
  [0, { lean: -6, head: -6, an1: -120, an2: -110, af1: -110, af2: -100, c: 1 }],
  [0.3, { lean: -14, head: -10, an1: -150, an2: -150, af1: -140, af2: -140, c: 1 }],
  [0.5, { lean: 20, head: 8, an1: -20, an2: -10, af1: -10, af2: 0, c: 0, ox: 4 }],
  [1, { c: 0 }],
]);
/** The great hand flung out to snatch. */
const grab = keyed(BASE, [
  [0, {}],
  [0.4, { an1: 120, an2: 140, lean: 4, ox: -3 }],
  [0.6, { an1: -6, an2: -10, lean: 30, ox: 8, ln1: 122, ln2: 100, lf1: 60, lf2: 104, mouth: 1 }],
  [1, { an1: -4, an2: -8, lean: 26, ox: 7, ln1: 120, lf1: 62 }],
]);
/** Holding its catch up at arm's length, then smashing it down. */
const lift = (t: number): Pose => pose(BASE, { an1: -80 + wave(t) * 4, an2: -80, lean: -4, head: -10, mouth: 1, b: spark(t), oy: wave(t) * 0.6 });
const slam = keyed(BASE, [
  [0, { an1: -80, an2: -80, lean: -4, head: -10 }],
  [0.3, { an1: -120, an2: -120, lean: -10, head: -12, mouth: 1 }],
  [0.6, { an1: 70, an2: 80, lean: 40, head: 16, ox: 5, oy: 4, b: 1 }],
  [1, { an1: 70, an2: 80, lean: 36, head: 14, ox: 5, oy: 4 }],
]);
/** Staggered when the hero tears free. */
const reel = (t: number): Pose => pose(BASE, { lean: -14 + wave(t) * 4, head: -20, ox: -4, an1: 130, an2: 150, af1: 120, ln1: 84, lf1: 104, mouth: 1, b: spark(t) });

export function buildBruteSheet(): SheetBuilder {
  const C = BRUTE_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'punch', 12, punch, draw, false);
  bake(b, 'rip', 10, rip, draw, false);
  bake(b, 'hold', 4, hold, draw);
  bake(b, 'toss', 8, toss, draw, false);
  bake(b, 'grab', 8, grab, draw, false);
  bake(b, 'lift', 4, lift, draw);
  bake(b, 'slam', 8, slam, draw, false);
  bake(b, 'reel', 4, reel, draw);
  return b;
}

/** `block` (48x40: the thrown masonry, 4 frames tumbling), `arc` (lightning crawling along the floor, 4 frames, 48 wide). */
export function buildBruteProps(): SheetBuilder {
  const b = new SheetBuilder(48, 40, 24, 20);
  b.add('block', ...[0, 1, 2, 3].map((i) => {
    const f = new FormCanvas(48, 40);
    const a = (i * Math.PI) / 2 + 0.3, c = Math.cos(a), s = Math.sin(a);
    const pt = (x: number, y: number): [number, number] => [24 + x * c - y * s, 20 + x * s + y * c];
    f.poly([pt(-14, -10), pt(13, -11), pt(14, 10), pt(-13, 11)], STONE, (x, y) => 0.6 - (y - 20) * 0.02);
    f.groove(...pt(-13, 0), ...pt(13, -1), -0.3);
    return f.resolve({ rim: RIM });
  }));
  b.add('arc', ...[0, 1, 2, 3].map((i) => {
    const f = new FormCanvas(48, 40);
    const r = rng(i + 3);
    let p: [number, number] = [2, 36];
    while (p[0] < 46) {
      const q: [number, number] = [p[0] + 3 + r() * 3, 36 - r() * (10 + i * 2)];
      f.stroke(p[0], p[1], q[0], q[1], SPARK, 1, 1.4);
      p = q;
    }
    f.disc(24, 37, 3, SPARK, 0.7);
    return f.resolve({ outline: false });
  }));
  return b;
}
