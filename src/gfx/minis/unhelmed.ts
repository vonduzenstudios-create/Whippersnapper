// The Unhelmed: a knight in blackened plate with gilt edges and a torn cape, and no head. Cold blue
// fire burns up out of his gorget. He carries his own head in an iron lantern in his far hand,
// its eyes still open, and a long sword in the near one.
// Channels: `a` = the sword's angle, `b` = the neck fire's flicker (0..1, loops),
// `c` = 1 while the head is away from his hand (thrown, rolling: the AI draws it).
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose } from '../puppet';
import { IRON, STEEL, GOLD, LEATHER, INK, RIM, toward } from './common';

export const UNHELMED_CELL: Cell = { w: 168, h: 112, ax: 72, ay: 106 };
const BUILD: Build = { k: 1.35, torso: 12.5, hipR: 4.6, chestR: 6.6, neck: 1.4, headR: 3.4, arm: [8.4, 8, 2.8, 2.2], leg: [9.6, 9.4, 3.2, 2.4], foot: 4.4, shoulder: 1.8, hipW: 1.3 };

const PLATE = ramp('#07080c', '#12141c', '#20232e', '#343846', '#525868', '#8088a0');
const CAPE = ramp('#120406', '#28080c', '#420e14', '#5e1a1e', '#7a2a28');
const FIRE = ramp('#0c2a6a', '#1e5ad0', '#5aa8ff', '#bfe8ff', '#ffffff');
const FACE = ramp('#2a2a34', '#5a5a66', '#8a8894', '#b4b0b4', '#d6d0cc');
const HAIR = ramp('#141016', '#2a2428', '#463c3c', '#625650');

const BASE: Pose = pose(STAND, { an1: 70, an2: 50, af1: 84, af2: 40, a: 66, b: 0, c: 0, ln1: 102, lf1: 78 });

/** The head in its lantern: an iron cage with a ring on top, the dead face inside. `roll` turns all of it. */
export function drawHead(f: FormCanvas, x: number, y: number, roll: number, k: number, lit = 0.6) {
  const c = Math.cos(roll * DEG), s = Math.sin(roll * DEG);
  const at = (u: number, v: number): V => [x + (u * c - v * s) * k, y + (u * s + v * c) * k];
  f.next();
  f.ball(...at(0, 0), 3.4 * k, 3.6 * k, FACE, roll * DEG);
  // long dead hair falling back, a beard, closed lips
  f.limb(...at(-1.2, -2.6), ...at(-3.6, 1.4), 1.6 * k, 0.8 * k, HAIR);
  f.limb(...at(0.6, 1.8), ...at(1.4, 4), 1.4 * k, 0.4 * k, HAIR);
  f.groove(...at(1.2, 1.6), ...at(2.8, 1.4), -0.3);
  // eyes: still open, lit from inside with the same cold fire
  f.dot(...at(1.6, -0.6), FIRE, lit + 0.3);
  f.dot(...at(2.6, -0.6), FIRE, lit);
  f.groove(...at(1, -1.4), ...at(3, -1.2), -0.25); // the brow
  f.next();
  // the cage bars over it, and the ring
  for (const i of [-2, 0, 2]) f.limb(...at(i * 1.7, -3.8), ...at(i * 1.8, 3.8), 0.3 * k, 0.3 * k, IRON);
  f.limb(...at(-3.8, -3.6), ...at(3.8, -3.6), 0.6 * k, 0.6 * k, IRON);
  f.limb(...at(-3.8, 3.8), ...at(3.8, 3.8), 0.7 * k, 0.7 * k, IRON);
  f.ball(...at(0, -5.4), 1.3 * k, 1.1 * k, IRON, roll * DEG, 0.6);
  f.dot(...at(0, -5.4), INK, 0);
}

/** Cold fire licking up out of an open collar at `p`, leaning `lean` degrees. */
function neckFire(R: Rig, p: V, lean: number, flick: number, big = 1) {
  const f = R.f;
  f.next();
  for (let i = 0; i < 5; i++) {
    const ph = (flick + i * 0.23) % 1, u = i / 4 - 0.5;
    const base: V = [p[0] + u * 4 * R.k, p[1]];
    const h = (4.5 + Math.sin(ph * Math.PI * 2) * 1.6 + (i === 2 ? 2.4 : 0)) * big;
    const tip = toward(base, -90 + lean * 0.6 + u * 30 + Math.sin((ph + 0.3) * Math.PI * 2) * 12, h * R.k);
    f.limb(base[0], base[1], tip[0], tip[1], 1.4 * R.k, 0.2, FIRE, 1, (t) => 0.2 + t * 0.4 - 0.3);
  }
  f.disc(p[0], p[1] - 1, 1.8 * R.k, FIRE, 0.9);
}

export function unhelmed(P: Pose, cell: Cell = UNHELMED_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  // the cape, torn into tongues at the hem, behind everything
  f.next();
  for (let i = 0; i < 5; i++) {
    const top = R.body(-2.4 + i * 0.4, -BUILD.torso + 0.6), hem = R.body(-4.2 - i * 1.3 - P.sway * (2 + i * 0.8), 6 + (i % 2) * 3 - i * 0.6);
    R.limb(top, hem, 2, 1.2 + (i % 2) * 0.6, CAPE, 0.8, () => (i % 2 ? -0.06 : 0.04));
  }
  // far side: leg, arm, and the lantern with his head in it
  R.dim(-0.18, () => {
    R.leg('F', PLATE, PLATE, PLATE);
    R.arm('F', PLATE, PLATE, PLATE);
  });
  if (P.c < 0.5) {
    const hang = toward(J.handF, 90, 2.4 * k);
    R.stroke(J.handF, hang, IRON, 0.5, 1);
    drawHead(f, hang[0], hang[1] + 5 * k, P.lean * 0.4 - P.sway * 10, k * 0.9);
  }
  // the cuirass: ridged plate with gilt edges, a tabard of the cape's red under it
  f.next();
  R.limb(R.body(0.2, -1), R.body(1.6 - P.sway * 0.8, 9), 3, 3.4, CAPE, 0.8);
  R.groove(R.body(0.8, 1), R.body(1.5, 8.6), -0.2);
  R.torso(PLATE);
  R.groove(R.body(1.6, -BUILD.torso + 1), R.body(3.4, -4), 0.2); // the ridge down the breastplate
  for (const y of [-4, -2.4, -0.8]) R.groove(R.body(-3.6, y), R.body(4.4, y - 0.4), -0.22); // the faulds
  R.stroke(R.body(-3.4, -4.2), R.body(4.4, -4.6), GOLD, 0.7, 1);
  // the gorget, open, and the fire coming out of it
  f.next();
  R.ball(J.neck, 3.2, 1.8, PLATE, P.lean);
  R.stroke(R.at(J.neck, 180 + P.lean, 3), R.at(J.neck, P.lean, 3), GOLD, 0.75, 1);
  neckFire(R, R.at(J.neck, -90 + P.lean, 0.6), P.lean, P.b, P.c > 0.5 ? 1.4 : 1);
  // near leg, tassets over the hips
  R.leg('N', PLATE, PLATE, PLATE);
  f.next();
  for (let i = 0; i < 2; i++) R.limb(R.body(-1.8 + i * 3, -0.4), R.body(-2.2 + i * 3.2 - P.sway, 5), 2.2, 1.7, PLATE, 0.8);
  R.stroke(R.body(-4, 4.6 - P.sway * 0.2), R.body(3.2, 4.6), GOLD, 0.6, 1);
  // the sword: a long straight blade, a crossguard, a wheel pommel
  f.next();
  const ux = Math.cos(P.a * DEG), uy = Math.sin(P.a * DEG);
  const along = (d: number, side = 0): V => [J.handN[0] + (ux * d - uy * side) * k, J.handN[1] + (uy * d + ux * side) * k];
  R.limb(along(-3.4), along(1.6), 0.7, 0.7, LEATHER);
  R.ball(along(-3.8), 1, 1, GOLD);
  R.limb(along(1.8, -2.4), along(1.8, 2.4), 0.7, 0.7, GOLD);
  f.poly([along(2.4, -1.1), along(25, -0.8), along(28, 0), along(25, 0.8), along(2.4, 1.1)], STEEL, (x, y) => {
    const side = ((x - J.handN[0]) * -uy + (y - J.handN[1]) * ux) / k;
    return side < 0 ? 0.78 : 0.42;
  });
  R.stroke(along(3, 0), along(24, 0), STEEL, 0.25, 1); // the fuller
  // near arm, a fluted pauldron
  R.arm('N', PLATE, PLATE, PLATE);
  f.next();
  R.ball(J.shN, 3.8, 3.2, PLATE, P.lean);
  R.groove(R.at(J.shN, 200 + P.lean, 3.4), R.at(J.shN, -20 + P.lean, 3.4), -0.2);
  R.stroke(R.at(J.shN, 160 + P.lean, 3.6), R.at(J.shN, 20 + P.lean, 3.6), GOLD, 0.7, 1);
  return f;
}

const draw = (P: Pose) => unhelmed(P).resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.5, b: t, a: 66 + wave(t, 0.1) * 3, af1: 84 + wave(t, 0.3) * 3 });
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 92 + s * 22, ln2: 100 + s * 14 + Math.max(0, c) * 22, lf1: 92 - s * 22, lf2: 100 - s * 14 + Math.max(0, -c) * 22, lean: 4, oy: Math.abs(c) * -1.2, af1: 84 + s * 8, an1: 60 - s * 6, b: t * 2 % 1, a: 62 + s * 4 });
};
/** Bowling the head: swung far back, then low and forward along the floor. */
const bowl = keyed(BASE, [
  [0, {}],
  [0.4, { af1: 160, af2: 170, lean: 14, ox: -2, ln1: 112, lf1: 70, a: -20, an1: 30 }],
  [0.62, { af1: 30, af2: 40, lean: 26, ox: 5, ln1: 120, ln2: 100, lf1: 60, lf2: 104, c: 1, a: 0, an1: 50 }],
  [1, { af1: 40, af2: 50, lean: 20, ox: 4, ln1: 114, lf1: 66, c: 1 }],
]);
/** A two-handed overhead cut. */
const slash = keyed(BASE, [
  [0, {}],
  [0.35, { an1: -120, an2: -110, a: -150, lean: -10, ln1: 108, lf1: 74 }],
  [0.55, { an1: -124, an2: -116, a: -160, lean: -12, ln1: 110, lf1: 72 }],
  [0.7, { an1: 30, an2: 20, a: 30, lean: 24, ox: 6, ln1: 118, ln2: 100, lf1: 60, lf2: 102 }],
  [1, { an1: 40, an2: 30, a: 40, lean: 20, ox: 5, ln1: 116, lf1: 62 }],
]);
/** Headless and blind: stumbling, the sword swept wildly back and forth. */
const blind = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, {
    c: 1, b: (t * 3) % 1, lean: 10 + s * 8, ln1: 92 + s * 24, ln2: 100 + Math.max(0, c) * 22, lf1: 92 - s * 24, lf2: 100 + Math.max(0, -c) * 22,
    an1: -40 + s * 90, an2: -20 + s * 90, a: -60 + s * 110, af1: -40 - s * 30, af2: -60, oy: Math.abs(c) * -1.2,
  });
};
/** The far hand up, catching the lantern as it comes back. */
const caught = keyed(BASE, [
  [0, { c: 1, af1: -70, af2: -80, lean: -6 }],
  [0.3, { c: 0, af1: -60, af2: -70, lean: -8 }],
  [1, {}],
]);
/** Staggered: his head was struck while it was away. */
const stagger = (t: number): Pose => pose(BASE, { c: 1, b: (t * 2) % 1, lean: -14 + wave(t) * 4, ox: -3, an1: 120, an2: 140, a: 100, af1: -40, af2: -10, ln1: 84, lf1: 104, lf2: 70 });

export function buildUnhelmedSheet(): SheetBuilder {
  const C = UNHELMED_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'bowl', 10, bowl, draw, false);
  bake(b, 'slash', 10, slash, draw, false);
  bake(b, 'blind', 8, blind, draw);
  bake(b, 'catch', 5, caught, draw, false);
  bake(b, 'stagger', 4, stagger, draw);
  return b;
}

/** 36x36, centered: `head` (8 frames of the lantern rolling over). */
export function buildUnhelmedProps(): SheetBuilder {
  const b = new SheetBuilder(36, 36, 18, 18);
  b.add('head', ...Array.from({ length: 8 }, (_, i) => {
    const f = new FormCanvas(36, 36);
    drawHead(f, 18, 18, i * 45, 1.6, 0.6 + (i % 2) * 0.2);
    return f.resolve({ rim: RIM });
  }));
  return b;
}
