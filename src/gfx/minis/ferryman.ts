// The Ferryman: the boatman of the castle's drowned undercroft. Tall and gaunt in a rotted
// grey-green robe and deep hood, two coins where his eyes should be, grey hands all knuckle. He
// carries a long punt-oar with a lantern of cold green flame hanging from its top, and a purse.
// Channels: `a` = the oar's angle (toward its blade end), `b` = the lantern's swing on its chain
// (degrees), `c` = a coin glinting in his palm (0..1), `d` = which hand holds the oar (0 near .. 1 far).
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose } from '../puppet';
import { IRON, WOOD, LEATHER, GOLD, INK, RIM, toward, lerpV } from './common';

export const FERRYMAN_CELL: Cell = { w: 200, h: 150, ax: 92, ay: 142 };
const BUILD: Build = { k: 1.35, torso: 14, hipR: 3.4, chestR: 4.4, neck: 2, headR: 3.4, arm: [10, 9.6, 1.8, 1.4], leg: [11, 11, 2, 1.6], foot: 3.4, shoulder: 1.4, hipW: 1 };

const ROBE = ramp('#060908', '#0e1512', '#18221d', '#24322b', '#36483d', '#506656');
const SKIN = ramp('#1e2022', '#3a3e40', '#5a6062', '#7e8486', '#a2a8a8');
const FLAME = ramp('#0a3a20', '#1a8a40', '#50e070', '#b0ffb0', '#f0fff0');

const BASE: Pose = pose(STAND, { lean: 6, head: 6, an1: 40, an2: -30, af1: 60, af2: -10, a: 82, b: 0, c: 0, d: 0, ln1: 96, lf1: 84 });

/** A little lantern of cold green flame (also used, without its cage, for the flames he leaves). */
function lantern(f: FormCanvas, p: V, k: number) {
  f.next();
  f.ball(p[0], p[1] + 0.2 * k, 2.4 * k, 2.9 * k, FLAME, 0, 0.35); // the cold flame
  f.ball(p[0], p[1] + 0.8 * k, 1.2 * k, 1.5 * k, FLAME, 0, 0.2);
  f.dot(p[0], p[1] + 0.8 * k, FLAME, 1);
  f.next();
  f.limb(p[0] - 2.6 * k, p[1] - 3.4 * k, p[0] + 2.6 * k, p[1] - 3.4 * k, 0.7 * k, 0.7 * k, IRON); // cap
  f.limb(p[0] - 2.2 * k, p[1] + 3.2 * k, p[0] + 2.2 * k, p[1] + 3.2 * k, 0.6 * k, 0.6 * k, IRON); // base
  for (const s of [-1, 1]) f.stroke(p[0] + s * 2.4 * k, p[1] - 3.4 * k, p[0] + s * 2.2 * k, p[1] + 3.2 * k, IRON, 0.5, 1); // bars
}

export function ferryman(P: Pose, cell: Cell = FERRYMAN_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  // the oar's line through the hand that holds it
  const grip = lerpV(J.handN, J.handF, P.d);
  const ux = Math.cos(P.a * DEG), uy = Math.sin(P.a * DEG);
  const along = (d: number, side = 0): V => [grip[0] + (ux * d - uy * side) * k, grip[1] + (uy * d + ux * side) * k];
  const top = along(-24), blade = along(30);
  // far arm and leg, behind everything
  R.dim(-0.2, () => {
    R.leg('F', ROBE, INK);
    R.arm('F', ROBE, SKIN);
  });
  // the lantern hangs from the oar's top on a short chain, swinging
  const lant = toward(top, 90 + P.b, 5 * k);
  R.stroke(top, lant, IRON, 0.5, 1);
  lantern(f, lant, k);
  // the oar: a pale weathered shaft and a broad blade, banded with iron at the grip
  f.next();
  R.limb(top, blade, 0.8, 0.7, WOOD);
  f.poly([along(22, -1.4), along(31, -2.6), along(34, 0), along(31, 2.6), along(22, 1.4)], WOOD, 0.5);
  R.groove(along(23, 0), along(32.6, 0), -0.16);
  R.limb(along(-1.4), along(1.4), 1, 1, IRON);
  R.limb(along(-23), along(-21.6), 1, 1, IRON);
  // the robe to the floor, rotted into strips at the hem
  R.leg('N', ROBE, INK);
  R.torso(ROBE);
  R.robe(ROBE, 22, 8, BUILD.hipR, 6);
  f.next();
  for (let i = 0; i < 7; i++) {
    const x = J.pelvis[0] + (-7 + i * 2.4 - P.sway * 1.8) * k, y = cell.ay - 2 - (i % 3) * 2;
    R.stroke([x, y - 4 * k], [x - P.sway * 2 + (i % 2 ? 1 : -1), y + 1], ROBE, 0.25 + (i % 2) * 0.1, 2);
  }
  // a rope belt and the coin purse
  f.next();
  R.limb(R.body(-3.6, -1), R.body(4, -1.4), 0.7, 0.7, LEATHER);
  const purse = R.body(3.4, 1.6);
  R.ball(purse, 1.6, 1.9, LEATHER);
  R.groove(R.at(purse, -150, 1.2), R.at(purse, -30, 1.2), -0.2);
  R.dot(R.at(purse, 90, 1.4), GOLD, 0.9);
  // a mantle over his narrow shoulders
  for (let i = 0; i < 4; i++) R.limb(R.body(-2.6 + i * 1.8, -BUILD.torso + 0.2), R.body(-3 + i * 2.2 - P.sway * 1.4, -BUILD.torso + 5.4 + (i % 2)), 2, 1.4, ROBE, 0.8, () => (i % 2 ? -0.07 : 0.05));
  // the hood: deep, its mouth black, and two coins shining in the dark where the eyes are
  f.next();
  R.ball(R.face(-1.2, -0.6), 4.4, 4.6, ROBE, P.lean + P.head);
  R.limb(R.face(-2.6, -3.8), R.face(-6.4 - P.sway * 2, 3), 2.6, 1.2, ROBE, 0.8); // the hood's point, hanging back
  R.ball(R.face(1.8, 0.4), 2.6, 3.2, INK, P.lean + P.head);
  R.ball(R.face(2.4, 2.4), 1.6, 1.4, SKIN, P.lean + P.head); // a sunken chin
  for (const [x, y] of [[2.2, -0.6], [3.6, -0.4]] as V[]) {
    R.ball(R.face(x, y), 0.7, 0.7, GOLD);
    R.dot(R.face(x - 0.2, y - 0.2), GOLD, 1);
  }
  R.groove(R.face(-1.8, -4.4), R.face(4.4, -2.2), -0.2); // the hood's rim
  // near arm: bony, the sleeve hanging off it; the open palm with a coin when he tolls
  R.arm('N', ROBE, SKIN);
  f.next();
  R.limb(R.at(J.elN, P.an2 + P.lean, 4), R.at(J.elN, P.an2 + P.lean + 30, 7), 2.4, 0.8, ROBE, 0.7); // the sleeve's droop
  for (const h of [J.handN, J.handF]) for (let i = 0; i < 3; i++) R.stroke(h, R.at(h, (h === J.handN ? P.an2 : P.af2) + P.lean - 20 + i * 20, 2.2), SKIN, 0.6); // long fingers
  if (P.c > 0.05) {
    const coin = R.at(J.handN, P.an2 + P.lean - 70, 2);
    R.ball(coin, 1.3, 1.3, GOLD);
    R.dot(coin, GOLD, 0.4 + P.c * 0.6);
    if (P.c > 0.6) for (const a of [0, 90, 180, 270]) R.stroke(R.at(coin, a + 45, 1.8), R.at(coin, a + 45, 3.4), GOLD, 1);
  }
  return f;
}

const draw = (P: Pose) => ferryman(P).resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

/** Leaning on the planted oar, the lantern swaying over his hood. */
const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.5, b: wave(t) * 16, head: 6 + wave(t, 0.3) * 3, a: 82 + wave(t, 0.2) * 2 });
/** Punting: he plants the oar ahead, leans on it and pushes himself along. */
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 96 + s * 14, ln2: 92 + Math.max(0, c) * 14, lf1: 84 - s * 14, lf2: 92 + Math.max(0, -c) * 14, lean: 10 + s * 4, a: 72 - s * 14, an1: 30 + s * 16, an2: -36 + s * 10, oy: Math.abs(c) * -1, b: -s * 26, head: 4 - c * 2 });
};
/** A wide oar arc: up behind him, over his head and down in front, covering the air above. */
const sweep = keyed(BASE, [
  [0, {}],
  [0.3, { a: -150, an1: -120, an2: -150, af1: -100, af2: -130, d: 0.5, lean: -10, head: -8, b: 40 }],
  [0.5, { a: -90, an1: -110, an2: -100, af1: -90, af2: -90, d: 0.5, lean: -4, head: -6, b: 10 }],
  [0.66, { a: 0, an1: -20, an2: -10, af1: -10, af2: 0, d: 0.5, lean: 18, head: 4, ox: 4, b: -50, ln1: 108, lf1: 70 }],
  [0.8, { a: 30, an1: 10, an2: 20, af1: 20, af2: 30, d: 0.5, lean: 22, head: 6, ox: 5, b: -30, ln1: 108, lf1: 70 }],
  [1, {}],
]);
/** The lantern swung forward on the oar's end: its flames spill out and drift. */
const swing = keyed(BASE, [
  [0, {}],
  [0.3, { a: 50, an1: 60, an2: 20, lean: 0, head: 0, b: -30 }],
  [0.6, { a: 168, an1: -40, an2: -70, lean: 14, head: 2, ox: 3, b: 60 }],
  [0.75, { a: 175, an1: -46, an2: -76, lean: 16, head: 2, ox: 3, b: 40 }],
  [1, {}],
]);
/** The toll: the oar passes to his far hand, and he holds out a palm with a coin in it. */
const toll = (t: number): Pose => pose(BASE, { d: 1, a: 84, af1: 50, af2: -20, an1: -10, an2: -20, lean: 2, head: 8 + wave(t, 0.2) * 2, c: 0.5 + wave(t) * 0.5, b: wave(t) * 8, oy: wave(t) * 0.4 });
/** Struck: rocks back on his heels. */
const hit = keyed(BASE, [
  [0, { lean: -14, head: -12, ox: -3, b: 30, a: 92 }],
  [1, {}],
]);

export function buildFerrymanSheet(): SheetBuilder {
  const C = FERRYMAN_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'sweep', 14, sweep, draw, false);
  bake(b, 'swing', 12, swing, draw, false);
  bake(b, 'toll', 6, toll, draw);
  bake(b, 'hit', 4, hit, draw, false);
  return b;
}

/** 24x24, centered: `flame` (4 frames, a drifting will-o flame), `coin` (4 frames, spinning). */
export function buildFerrymanProps(): SheetBuilder {
  const b = new SheetBuilder(24, 24, 12, 12);
  b.add('flame', ...[0, 1, 2, 3].map((i) => {
    const f = new FormCanvas(24, 24), w = Math.sin((i / 4) * Math.PI * 2);
    f.ball(12, 13, 5, 5.6, FLAME, 0, 0.3);
    f.limb(12, 12, 12 + w * 2, 3, 3.6, 0.6, FLAME, 0.4);
    f.next();
    f.ball(12, 14, 2.4, 2.8, FLAME, 0, 0.2);
    f.dot(12, 14, FLAME, 1);
    return f.resolve({ rim: RIM, outline: false });
  }));
  b.add('coin', ...[1, 0.6, 0.15, 0.6].map((w) => {
    const f = new FormCanvas(24, 24);
    f.ball(12, 12, 4 * w + 0.6, 4, GOLD);
    if (w > 0.5) f.groove(12 - 2 * w, 12, 12 + 2 * w, 12, -0.2);
    f.dot(12 - w, 11, GOLD, 1);
    return f.resolve({ rim: RIM });
  }));
  return b;
}
