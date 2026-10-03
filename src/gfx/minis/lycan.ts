// The Moonrot Lycan: a mangy grey werewolf, hunched, on wolf's legs (it stands on its toes, the
// heel raised high). Torn iron shackles on both wrists; from the near one trails a length of
// chain it swings like a flail. Bald patches of raw skin show through the fur.
// Channels: `a` = the chain's angle (degrees on screen), `b` = how far it is paid out (0..1),
// `c` = 1 while it runs on all fours (the front paws reach the floor).
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose } from '../puppet';
import { IRON, BONE, INK, RIM, rng, toward } from './common';

export const LYCAN_CELL: Cell = { w: 196, h: 124, ax: 92, ay: 118 };
const BUILD: Build = { k: 1.6, torso: 12, hipR: 4.4, chestR: 7.2, neck: 3.2, headR: 3.6, arm: [9, 8.6, 2.9, 2.0], leg: [7.4, 7.8, 3.6, 2.0], foot: 5.6, shoulder: 2, hipW: 1.2 };

const FUR = ramp('#121216', '#26252e', '#403e4a', '#5e5b68', '#83808e', '#b2aeb8');
const PALE = ramp('#2a2830', '#56525c', '#86808a', '#b2aab0', '#d8d0cc');
const MANGE = ramp('#3a1a1e', '#682e30', '#925650', '#b8806e');
const EYE = ramp('#806010', '#e0c020', '#fff8a0');
const MAW = ramp('#0c0206', '#2a060c', '#5a1018', '#8a2a30');

const BASE: Pose = pose(STAND, { lean: 34, head: -30, an1: 30, an2: 66, af1: 44, af2: 80, ln1: 58, ln2: 122, lf1: 70, lf2: 128, a: 100, b: 0, c: 0 });

/** A wolf's leg: thigh, shin, then the raised heel (the hock) down to a clawed paw on the floor. */
function wolfLeg(R: Rig, side: 'N' | 'F', P: Pose) {
  const J = R.J, k = R.k;
  const hip = side === 'N' ? J.hipN : J.hipF, knee = side === 'N' ? J.kneeN : J.kneeF, hock = side === 'N' ? J.footN : J.footF;
  const floor = R.cell.ay - 1, up = P.air > 2;
  const paw: V = up ? toward(hock, (side === 'N' ? P.ln2 : P.lf2) - 40, 5 * k) : [hock[0] + 2.4 * k, floor - 1];
  R.f.next();
  R.limb(hip, knee, 4.2, 3, FUR);
  R.limb(knee, hock, 2.6, 1.7, FUR);
  R.limb(hock, paw, 1.6, 1.4, FUR);
  const toe = toward(paw, up ? (side === 'N' ? P.ln2 : P.lf2) - 30 : 0, 2.4 * k);
  R.limb(paw, toe, 1.5, 1.1, FUR);
  for (let i = 0; i < 2; i++) R.stroke(toe, toward(toe, 20 + i * 30, 1.6 * k), BONE, 0.85);
  // a ragged tuft at the back of the thigh
  R.stroke(R.at(hip, 160, 2), R.at(hip, 140 - P.sway * 10, 6), FUR, 0.25, 2);
}

/** The wrist chain: oval links following a sagging arc from the hand. */
function chain(f: FormCanvas, from: V, deg: number, len: number, sag: number) {
  let p = from, a = deg;
  const n = Math.max(2, Math.round(len / 2.6));
  for (let i = 0; i < n; i++) {
    a += sag;
    const q = toward(p, a, 2.6);
    f.next();
    f.ball((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 1.9, i % 2 ? 0.8 : 1.2, IRON, a * DEG, 0.7);
    if (i % 2 === 0) f.dot((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, INK, 0);
    p = q;
  }
  return p;
}

export function lycan(P: Pose, cell: Cell = LYCAN_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  const rnd = rng(11);
  // the tail, bushy and low, swinging behind
  f.next();
  // a heavy brush: thick in the middle, ragged at the end, hanging low
  let tp = R.body(-3.4, -0.6), ta = 150 + P.lean * 0.2 - P.sway * 14;
  const thick = [1.8, 2.6, 3.1, 3, 2.4, 1.4];
  for (let i = 0; i < 6; i++) {
    const q = toward(tp, ta, 2.1 * k);
    R.limb(tp, q, thick[i], thick[i + 1] || 0.6, FUR, 0.9, () => (i > 3 ? 0.1 : 0));
    if (i > 1) for (const s of [-1, 1]) R.stroke(q, toward(q, ta + s * 50 + 180, (1.6 + i * 0.2) * k), FUR, i > 4 ? 0.45 : 0.25, 1);
    tp = q;
    ta -= 14 + P.sway * 4;
  }
  // far side
  R.dim(-0.2, () => {
    wolfLeg(R, 'F', P);
    R.arm('F', FUR, FUR);
    f.next();
    R.limb(R.at(J.handF, P.af2 + P.lean, -1.4), R.at(J.handF, P.af2 + P.lean, 0.6), 1.9, 1.9, IRON); // its shackle
    for (let i = 0; i < 3; i++) R.stroke(J.handF, toward(J.handF, P.af2 + P.lean + 40 + i * 25, (2 + i) * k), BONE, 0.7);
    chain(f, R.at(J.handF, P.af2 + P.lean, -1), 100 - P.sway * 20, 7, 4);
  });
  // the body: a deep chest over a narrow waist
  R.torso(FUR);
  f.next();
  R.ball(R.body(1.6, -7.6), 4.8, 5.4, PALE, P.lean); // the paler chest ruff
  for (let i = 0; i < 6; i++) R.groove(R.body(0 + i * 0.7, -11 + i * 1.4), R.body(3.2 + i * 0.4, -10 + i * 1.6), -0.14);
  R.groove(R.body(0.4, -3.4), R.body(3.6, -3.8), -0.18); // ribs under the thin belly
  R.groove(R.body(0.2, -1.8), R.body(3.2, -2.2), -0.18);
  // bald, raw patches
  for (const [x, y, r] of [[-2.6, -6, 1.6], [-1.2, -1.2, 1.2], [-3.4, -10, 1]] as [number, number, number][]) {
    R.ball(R.body(x, y), r * 1.2, r, MANGE, P.lean, 0.6);
    R.groove(R.body(x - r, y), R.body(x + r, y + 0.4), 0.1);
  }
  // a mane of spikes along the hunched back and neck
  f.next();
  for (let i = 0; i < 11; i++) {
    const base = R.body(-3.8 + i * 0.6, -2 - i * 1.3), len = 2.8 + rnd() * 1.8 + (i > 5 ? 2 : 0);
    R.limb(base, toward(base, 200 + P.lean + i * 3 - P.sway * 12, len * k), 1.7 + (i > 5 ? 0.6 : 0), 0.3, FUR, 0.8, () => -0.08 + (i % 2) * 0.1);
  }
  wolfLeg(R, 'N', P);
  // the head: skull, long muzzle, a jaw that drops, ears laid back
  f.next();
  R.limb(R.face(-1.2, -2.2), R.face(-3.2, -4.8 - P.sway), 1.2, 0.3, FUR); // far ear
  R.limb(J.neck, J.head, 3.4, 3.2, FUR);
  R.ball(J.head, 3.8, 3.4, FUR, P.lean + P.head);
  const jaw = P.mouth;
  if (jaw > 0.1) {
    f.next();
    f.poly([R.face(0.6, 0.6), R.face(7.2, 0.4 + jaw * 0.6), R.face(6.4, 1.4 + jaw * 2.6), R.face(0.6, 1.8)], MAW, 0.3);
  }
  f.next();
  R.limb(R.face(0.6, 1.6 + jaw * 0.6), R.face(6.4, 1.5 + jaw * 2.8), 1.3, 0.7, FUR); // lower jaw
  R.stroke(R.face(5.6, 1 + jaw * 2.2), R.face(5.7, 0.2 + jaw * 2), BONE, 0.9); // lower fang
  f.next();
  R.limb(R.face(0.6, -0.8), R.face(7.4, 0.2), 2.4, 0.9, FUR); // a long tapering muzzle
  R.ball(R.face(7.5, 0), 0.8, 0.7, INK, 0, 0.5); // nose
  R.groove(R.face(1.6, -1.6), R.face(6.4, -0.5), 0.14);
  for (let i = 0; i < 3; i++) R.groove(R.face(3.4 + i * 0.8, -1.2), R.face(3.6 + i * 0.8, -0.1), -0.2); // the snarl wrinkling its muzzle
  R.groove(R.face(1.6, 0.6), R.face(6.6, 0.8), -0.25); // the lip line
  R.stroke(R.face(6.2, 0.8), R.face(6.3, 2.2), BONE, 1, 1.3); // the long fang
  R.stroke(R.face(4.6, 0.8), R.face(4.7, 1.5), BONE, 0.85);
  R.ball(R.face(1.4, -1.6), 1.6, 0.9, FUR, P.lean + P.head - 10); // brow
  R.dot(R.face(2.2, -0.9), EYE, 0.95);
  R.dot(R.face(2.9, -0.9), EYE, 0.6);
  R.limb(R.face(-0.4, -2.6), R.face(-2.6, -5.2 - P.sway * 1.4), 1.4, 0.3, FUR); // near ear, laid back
  R.groove(R.face(-0.8, -2.8), R.face(-2, -4.4), -0.24);
  // cheek ruff
  for (let i = 0; i < 3; i++) R.limb(R.face(-0.6, 0.4 + i), R.face(-3.4 - P.sway, 1.6 + i * 1.6), 1.2, 0.3, PALE, 0.8);
  // near arm: long, with a shackle and the flail chain
  R.arm('N', FUR, FUR);
  f.next();
  R.ball(J.shN, 3.4, 3, FUR, P.lean);
  R.limb(R.at(J.handN, P.an2 + P.lean, -1.6), R.at(J.handN, P.an2 + P.lean, 0.6), 2, 2, IRON);
  R.groove(R.at(J.handN, P.an2 + P.lean, -0.6), R.at(J.handN, P.an2 + P.lean, -0.4), 0.3);
  for (let i = 0; i < 4; i++) R.stroke(R.at(J.handN, P.an2 + P.lean, 1.2), toward(J.handN, P.an2 + P.lean - 30 + i * 20, 3.6 * k), BONE, 0.9); // claws
  chain(f, R.at(J.handN, P.an2 + P.lean, -1), P.a, 6 + P.b * 40, P.b > 0.5 ? 1.5 - P.sway * 2 : 7);
  return f;
}

const draw = (P: Pose) => lycan(P).resolve({ rim: RIM, contour: 0.1 });

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.8, lean: 34 + wave(t) * 2, head: -30 + wave(t, 0.3) * 4, an1: 30 + wave(t, 0.1) * 4, a: 100 + wave(t, 0.2) * 10, mouth: 0.2 + wave(t, 0.4) * 0.15 });
/** Upright prowl on its toes. */
const prowl = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 58 + s * 22, ln2: 122 + Math.max(0, c) * 22, lf1: 58 - s * 22, lf2: 122 + Math.max(0, -c) * 22, oy: Math.abs(c) * -1.4, an1: 30 - s * 20, af1: 44 + s * 20, head: -30 - c * 3, a: 100 - s * 20, mouth: 0.3 });
};
/** On all fours: the gallop, front paws on the floor in turn. */
const run = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, {
    lean: 66 + c * 6, head: -60 - c * 6, oy: 4 - Math.abs(c) * 3, ox: 2,
    ln1: 40 + s * 40, ln2: 120 + s * 10, lf1: 44 + s * 36, lf2: 126 + s * 10,
    an1: -20 - s * 44, an2: 10 - s * 30, af1: -10 - s * 40, af2: 20 - s * 30, c: 1, a: 160, mouth: 0.6,
  });
};
/** Sinks down, ready to spring. */
const crouch = (t: number): Pose => pose(BASE, { lean: 50, head: -46, oy: 6 + wave(t) * 0.6, ln1: 24, ln2: 150, lf1: 30, lf2: 156, an1: 10, an2: 40, af1: 20, af2: 50, mouth: 0.6, a: 140 });
/** In the air, stretched out, claws forward. */
const leap = (t: number): Pose => pose(BASE, { air: 8, lean: 58, head: -50, ln1: 120, ln2: 150, lf1: 110, lf2: 140, an1: -60 + wave(t) * 6, an2: -50, af1: -50, af2: -40, mouth: 1, a: 190, oy: -2 });
/** Two rakes, high then low. */
const rake = keyed(BASE, [
  [0, {}],
  [0.15, { an1: -130, an2: -110, lean: 22, head: -20, mouth: 1, ln1: 50, lf1: 80 }],
  [0.3, { an1: 20, an2: 50, lean: 44, head: -40, ox: 4, mouth: 1, ln1: 70, lf1: 60 }],
  [0.5, { af1: -120, af2: -100, an1: 60, an2: 90, lean: 30, head: -30, mouth: 1 }],
  [0.68, { af1: 30, af2: 60, an1: 70, an2: 90, lean: 48, head: -44, ox: 6, mouth: 1, ln1: 74, lf1: 58 }],
  [1, {}],
]);
/** The chain whipped overhead and down in front. */
const lash = keyed(BASE, [
  [0, { b: 0 }],
  [0.3, { an1: -150, an2: -150, a: -140, b: 0.6, lean: 18, head: -20, ox: -2 }],
  [0.45, { an1: -110, an2: -100, a: -80, b: 1, lean: 24, head: -24 }],
  [0.62, { an1: 10, an2: 20, a: 6, b: 1, lean: 44, head: -40, ox: 4, mouth: 1 }],
  [0.8, { an1: 20, an2: 30, a: 30, b: 0.9, lean: 42, head: -38, ox: 4, mouth: 1 }],
  [1, { b: 0 }],
]);
/** Clinging to a wall for a heartbeat before it kicks off (it faces away from the wall). */
const wall = (t: number): Pose => pose(BASE, { air: 10, lean: -10, head: -6, ln1: 170, ln2: 120, lf1: 180, lf2: 130, an1: -40, an2: -20, af1: -60, af2: -40, mouth: 0.8 + wave(t) * 0.2, a: 130 });
const land = keyed(BASE, [
  [0, { lean: 54, head: -48, oy: 7, ln1: 22, ln2: 152, lf1: 28, lf2: 156, an1: 0, an2: 30 }],
  [1, {}],
]);

export function buildLycanSheet(): SheetBuilder {
  const C = LYCAN_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'prowl', 8, prowl, draw);
  bake(b, 'run', 8, run, draw);
  bake(b, 'crouch', 2, crouch, draw);
  bake(b, 'leap', 2, leap, draw);
  bake(b, 'rake', 12, rake, draw, false);
  bake(b, 'lash', 12, lash, draw, false);
  bake(b, 'wall', 2, wall, draw);
  bake(b, 'land', 4, land, draw, false);
  return b;
}

/** 24x24: `link` (one loose chain link, for the shackle bits it sheds). */
export function buildLycanProps(): SheetBuilder {
  const b = new SheetBuilder(24, 24, 12, 12);
  const f = new FormCanvas(24, 24);
  f.ball(12, 12, 5, 3, IRON, 0.4, 0.7);
  f.dot(12, 12, INK, 0);
  b.add('link', f.resolve({ rim: RIM }));
  return b;
}
