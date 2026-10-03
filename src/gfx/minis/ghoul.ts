// The Antlered Ghoul: something that starved in the castle's game larder and kept going. Grey-white
// skin over every rib, arms far too long with hooked black claws, and for a face the skull of a
// stag, antlers and all: black eye pits with a pinprick of light in each, and a jaw that unhinges.
// Channels: `mouth` = the jaw (0 shut .. 1 unhinged), `a` = how far the claws are hooked (0 open .. 1 curled).
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose } from '../puppet';
import { BONE, INK, RIM } from './common';

export const GHOUL_CELL: Cell = { w: 210, h: 156, ax: 94, ay: 148 };
const BUILD: Build = { k: 1.8, torso: 12, hipR: 3.2, chestR: 4.8, neck: 2.4, headR: 3, arm: [11, 11, 2, 1.4], leg: [9, 10, 2.4, 1.6], foot: 3.6, shoulder: 1.6, hipW: 1 };

const SKIN = ramp('#121014', '#26242a', '#403e44', '#605e64', '#888688', '#b2b0aa');
const CLAW = ramp('#040306', '#100c12', '#221a20');
const EYE = ramp('#7a1010', '#ff6040', '#fff0d0');

const BASE: Pose = pose(STAND, { lean: 38, head: -30, an1: 40, an2: 30, af1: 50, af2: 40, ln1: 70, ln2: 120, lf1: 60, lf2: 115, mouth: 0, a: 0.6 });

export function ghoul(P: Pose, cell: Cell = GHOUL_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J;
  /** A long-fingered claw: three hooked black talons. */
  const claw = (hand: V, dirDeg: number) => {
    f.next();
    for (let i = 0; i < 3; i++) {
      const a = dirDeg - 24 + i * 22, mid = R.at(hand, a, 2.6), tip = R.at(mid, a + 50 * P.a + 20, 2.4);
      R.limb(hand, mid, 0.5, 0.36, SKIN);
      R.limb(mid, tip, 0.34, 0.12, CLAW);
    }
  };
  R.dim(-0.22, () => {
    R.leg('F', SKIN, SKIN);
    R.arm('F', SKIN, SKIN);
    claw(J.handF, P.af2 + P.lean);
  });
  R.leg('N', SKIN, SKIN);
  R.torso(SKIN);
  // the ribs: grooves across the chest, and a hollow belly under them
  for (let i = 0; i < 5; i++) R.groove(R.body(-3.2, -BUILD.torso + 2 + i * 1.6), R.body(3.6, -BUILD.torso + 2.6 + i * 1.8), -0.24);
  R.groove(R.body(0.4, -BUILD.torso + 1), R.body(0.8, -3), -0.16); // the breastbone
  R.groove(R.body(-2.6, -2), R.body(2.6, -1.6), -0.3);
  // the spine knuckles along the back
  for (let i = 0; i < 5; i++) R.dot(R.body(-BUILD.chestR + 0.4, -BUILD.torso + 1 + i * 2.2), SKIN, 0.85);
  // the head: a stag's skull, long in the snout, set low on the neck
  f.next();
  const snout = R.face(5.6, 2), jawEnd = R.face(5 - P.mouth * 1.6, 4.2 + P.mouth * 4.6);
  R.ball(J.head, 2.8, 2.6, BONE, P.lean + P.head);
  R.limb(R.face(0.6, 0.4), snout, 2.2, 1.1, BONE);
  R.limb(R.face(0.4, 2.2), jawEnd, 1.3, 0.6, BONE); // the lower jaw
  if (P.mouth > 0.2) {
    R.limb(R.face(1.6, 2), R.face(4.2 - P.mouth, 3 + P.mouth * 2), 0.9, 0.5, INK); // the black of the open maw
    for (let i = 0; i < 3; i++) R.stroke(R.face(2 + i * 1.2, 1.9), R.face(2 + i * 1.2, 2.6), BONE, 1);
  }
  R.ball(R.face(1, -0.6), 1, 0.9, INK); // the eye pit
  R.dot(R.face(1.1, -0.6), EYE, 1);
  R.groove(R.face(1.6, 0.8), R.face(5, 1.2), -0.18);
  R.dot(R.face(5.2, 1.6), INK, 0.4); // a nostril
  // antlers: two branching racks swept back from the brow
  for (const [dim, lift] of [[-0.2, 8], [0, 0]] as [number, number][]) {
    f.bias = dim;
    f.next();
    const root = R.face(-0.6, -2.2), main = (u: number) => R.face(-1.4 - u * 10 + lift * 0.05, -2.6 - u * 6 - Math.sin(u * 3) * 1.6 + lift * 0.1);
    let prev = root;
    for (let i = 1; i <= 5; i++) {
      const p = main(i / 5);
      R.limb(prev, p, 0.7 - i * 0.08, 0.6 - i * 0.08, BONE);
      if (i > 1 && i < 5) R.limb(p, R.at(p, -60 - i * 8 + P.lean * 0.4, 2.4 + (i % 2)), 0.4, 0.16, BONE); // tines
      prev = p;
    }
    f.bias = 0;
  }
  // near arm: long, thin, knotted at the elbow
  R.arm('N', SKIN, SKIN, SKIN);
  claw(J.handN, P.an2 + P.lean);
  return f;
}

const draw = (P: Pose) => ghoul(P).resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

/** Hunched, breathing, the head twitching in little jerks. */
const idle = (t: number): Pose => {
  const jerk = Math.round(wave(t * 3) * 2) * 3;
  return pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.6, head: -30 + jerk, an2: 30 + wave(t, 0.2) * 6, af2: 40 - wave(t, 0.3) * 6, a: 0.6 + wave(t) * 0.2 });
};
/** Low on all fours, scuttling: long arms reach and pull like a second pair of legs. */
const skitter = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { lean: 66, head: -60, oy: Math.abs(c) * -1.6, an1: 22 + s * 26, an2: 30 + Math.max(0, c) * 20, af1: 22 - s * 26, af2: 30 + Math.max(0, -c) * 20, ln1: 60 - s * 20, ln2: 120, lf1: 60 + s * 20, lf2: 120, a: 0.9 });
};
/** Coiled to spring: everything folded tight. */
const crouch = (t: number): Pose => pose(BASE, { lean: 58, head: -50, oy: wave(t) * -0.6, an1: 20, an2: -40, af1: 30, af2: -30, ln1: 40, ln2: 140, lf1: 30, lf2: 140, a: 1 });
/** In the air, stretched out, claws first. */
const leap = (t: number): Pose => pose(BASE, { lean: 30, head: -24, air: 10, an1: -30 + wave(t) * 6, an2: -20, af1: -20, af2: -10, ln1: 140, ln2: 110, lf1: 130, lf2: 100, a: 0.2, mouth: 0.6 });
/** Three slashes, stepping in with each. */
const rake = keyed(BASE, [
  [0, {}],
  [0.12, { an1: -90, an2: -70, lean: 22, a: 0.2 }],
  [0.26, { an1: 60, an2: 70, lean: 44, ox: 4, a: 1 }],
  [0.4, { af1: -80, af2: -60, an1: 50, lean: 30, ox: 5, a: 0.2 }],
  [0.54, { af1: 70, af2: 80, an1: 40, lean: 48, ox: 9, a: 1 }],
  [0.68, { an1: -100, an2: -80, af1: 60, lean: 26, ox: 10, a: 0.2, mouth: 0.4 }],
  [0.82, { an1: 70, an2: 80, af1: 60, lean: 52, ox: 14, a: 1, mouth: 0.8 }],
  [1, {}],
]);
/** It rears up to its full height, arms flung wide, and the jaw drops open. */
const scream = (t: number): Pose => pose(BASE, { lean: -4 + wave(t * 3) * 1.5, head: -40 + wave(t * 4) * 3, an1: -60 + wave(t * 2) * 6, an2: -80, af1: -40, af2: -60, ln1: 96, ln2: 92, lf1: 82, lf2: 94, mouth: 1, a: 0, oy: wave(t * 4) * 0.6 });
/** Landing: it takes the drop all the way down, then rises. */
const land = keyed(BASE, [
  [0, { lean: 62, head: -54, ln1: 36, ln2: 144, lf1: 28, lf2: 144, an1: 10, an2: -40, af1: 20, af2: -30, a: 1 }],
  [1, {}],
]);

export function buildGhoulSheet(): SheetBuilder {
  const C = GHOUL_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'skitter', 8, skitter, draw);
  bake(b, 'crouch', 4, crouch, draw);
  bake(b, 'leap', 4, leap, draw);
  bake(b, 'rake', 16, rake, draw, false);
  bake(b, 'scream', 6, scream, draw);
  bake(b, 'land', 5, land, draw, false);
  return b;
}

/** 32x32: `ring` (3 frames, a shock ring for the scream). */
export function buildGhoulProps(): SheetBuilder {
  const b = new SheetBuilder(32, 32, 16, 16);
  b.add('ring', ...[6, 10, 14].map((r) => {
    const f = new FormCanvas(32, 32);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, a2 = ((i + 0.6) / 24) * Math.PI * 2;
      f.stroke(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, 16 + Math.cos(a2) * r, 16 + Math.sin(a2) * r, SKIN, 0.95, 1);
    }
    return f.resolve({ outline: false });
  }));
  return b;
}
