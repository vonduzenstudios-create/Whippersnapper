// The Headsman: a towering executioner in a black hood. Bare scarred chest, a blood-stiff
// leather apron, a crescent axe, and a gibbet cage swinging on a chain from his other hand.
// Channels: `a` = the axe's angle (degrees on screen, 0 = forward), `b` = how far the cage
// swings off plumb, `c` = 1 once the cage has left his hand (the AI draws it in flight).
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose } from '../puppet';
import { IRON, STEEL, WOOD, LEATHER, BLOOD, INK, RIM, rng } from './common';

export const HEADSMAN_CELL: Cell = { w: 150, h: 112, ax: 66, ay: 106 };
const BUILD: Build = { k: 1.3, torso: 13, hipR: 5.6, chestR: 8.2, neck: 1.6, headR: 4.6, arm: [8.6, 8.2, 3.3, 2.7], leg: [9, 9, 3.7, 2.9], foot: 4.6, shoulder: 2.2, hipW: 1.4 };

const HOOD = ramp('#07050a', '#141019', '#241e2c', '#383040', '#4e4458');
const SKIN = ramp('#2a1410', '#5a2e22', '#8a5038', '#b4745a', '#d49a7a', '#ecc0a0');
const APRON = ramp('#0e0604', '#22120a', '#3a2212', '#56361e', '#74502c');
const EMBER = ramp('#601008', '#c03010', '#ff8040', '#ffd0a0');
const CLOTH = ramp('#08070c', '#16141e', '#26232f', '#3a3644', '#524c5c');

const BASE: Pose = pose(STAND, { an1: 64, an2: 4, af1: 84, af2: 34, a: -78, b: 0, c: 0, ln1: 104, lf1: 76 });

/** The gibbet cage, hanging from (x, y) and swung `swing` degrees off plumb. Also used for the thrown cage. */
export function drawCage(f: FormCanvas, x: number, y: number, swing: number, k: number) {
  const u = (swing + 90) * DEG, dx = Math.cos(u), dy = Math.sin(u); // down the cage
  const at = (along: number, side: number): V => [x + (dx * along - dy * side) * k, y + (dy * along + dx * side) * k];
  f.next();
  f.limb(...at(0, 0), ...at(2, 0), 0.6 * k, 0.6 * k, IRON); // the hook
  f.next();
  // bars: a bulb that bellies out, with a ring top and bottom
  for (let i = -2; i <= 2; i++) {
    const s = i * 1.5, belly = i * 0.6;
    f.limb(...at(2.6, s * 0.5), ...at(6, s + belly), 0.45 * k, 0.45 * k, IRON);
    f.limb(...at(6, s + belly), ...at(10, s * 0.8), 0.45 * k, 0.45 * k, IRON);
  }
  f.limb(...at(2.6, -1.6), ...at(2.6, 1.6), 0.7 * k, 0.7 * k, IRON);
  f.limb(...at(6, -4.4), ...at(6, 4.4), 0.55 * k, 0.55 * k, IRON);
  f.limb(...at(10, -3.4), ...at(10, 3.4), 0.8 * k, 0.8 * k, IRON);
  // a skull rattling inside
  f.next();
  f.ball(...at(7.6, 0.6), 1.5 * k, 1.3 * k, ramp('#3a3030', '#7a6e60', '#b8aa88', '#e0d6bc'));
  f.dot(...at(7.4, 1.4), INK, 0);
}

export function headsman(P: Pose, cell: Cell = HEADSMAN_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  const rnd = rng(7);
  // far leg, far arm and the cage it holds
  R.dim(-0.2, () => {
    R.leg('F', CLOTH, LEATHER);
    R.arm('F', SKIN, SKIN);
    f.next();
    R.limb(R.at(J.elF, P.af2 + P.lean, 3), J.handF, 2.6, 2.6, LEATHER); // bracer
    if (P.c < 0.5) {
      // three links of chain, then the cage
      const top = J.handF, hang = toward2(top, 90 + P.b, 2.5 * k);
      R.stroke(top, hang, IRON, 0.5, 1.5);
      drawCage(f, hang[0], hang[1], P.b, k * 0.8);
    }
  });
  // the body: a heavy bare trunk
  R.torso(SKIN);
  // pectorals, the gut, and a ridge of old scars sewn shut
  R.groove(R.body(-1, -10.4), R.body(5.6, -9.2), -0.16);
  R.groove(R.body(-2, -5.6), R.body(5, -5.2), -0.12);
  R.groove(R.body(4.6, -13), R.body(5.8, -6.2), 0.1);
  for (let s = 0; s < 3; s++) {
    const a0 = R.body(-3 + s * 2.6, -12 + rnd() * 2), a1 = R.body(-1 + s * 2.6, -7 + rnd() * 2);
    R.groove(a0, a1, -0.24);
    for (let i = 1; i < 4; i++) {
      const m: V = [a0[0] + ((a1[0] - a0[0]) * i) / 4, a0[1] + ((a1[1] - a0[1]) * i) / 4];
      R.groove([m[0] - 1.5, m[1]], [m[0] + 1.5, m[1]], -0.18);
    }
  }
  // belt and its ring of keys
  f.next();
  R.limb(R.body(-5.4, -1.6), R.body(5.6, -1.8), 1.4, 1.4, LEATHER);
  R.ball(R.body(4.2, -1.8), 1.3, 1.3, IRON);
  f.next();
  const ring = R.body(-3.6, 0.6), keys = toward2(ring, 100 - P.sway * 18, 4 * k);
  R.stroke(ring, keys, IRON, 0.55, 1);
  R.ball(ring, 1.2, 1.2, IRON, 0, 0.6);
  R.stroke(keys, toward2(keys, 70, 2.2 * k), IRON, 0.7, 1);
  R.stroke(keys, toward2(keys, 120, 2.6 * k), IRON, 0.6, 1);
  // near leg, then the apron over both
  R.leg('N', CLOTH, LEATHER);
  R.robe(APRON, 9.5, 4.6, BUILD.hipR * 0.8, 4);
  // stains on the apron
  for (let i = 0; i < 5; i++) {
    const s = R.body(-2 + rnd() * 7, 4 + rnd() * 8);
    if (f.filled(...s)) R.ball(s, 0.8 + rnd() * 1.1, 0.7 + rnd() * 0.9, BLOOD, 0, 0.4);
  }
  // the hood and its mantle over the shoulders
  f.next();
  for (let i = 0; i < 4; i++) {
    const u = i / 3; // from the nape round to the near shoulder: the chest stays bare
    R.limb(R.body(-2.6 + u * 4, -BUILD.torso - 0.8), R.body(-4.2 + u * 4.6 - P.sway * 1.4, -BUILD.torso + 3.6 + u * 0.8), 2.4, 1.6, HOOD, 0.8, () => (i % 2 ? -0.08 : 0.04));
  }
  f.next();
  R.ball(J.head, 4.9, 5.2, HOOD, P.lean + P.head);
  R.limb(R.face(-1.4, -3.8), R.face(-5.6 - P.sway * 1.2, -6.4), 2.6, 0.5, HOOD); // the hood's peak, slumped back
  R.groove(R.face(-2.6, -3), R.face(2.2, 3.8), -0.16);
  // eye holes, each with a low ember of an eye
  for (const [x, y] of [[2.4, -0.6], [4.2, -0.4]] as V[]) {
    R.ball(R.face(x, y), 0.9, 0.7, INK, 0, 0.2);
    R.dot(R.face(x + 0.1, y), EMBER, 0.45 + P.mouth * 0.45);
  }
  // the axe: haft, crescent blade, back spike
  f.next();
  const ux = Math.cos(P.a * DEG), uy = Math.sin(P.a * DEG);
  const along = (d: number, side = 0): V => [J.handN[0] + (ux * d - uy * side) * k, J.handN[1] + (uy * d + ux * side) * k];
  R.limb(along(-6), along(25), 0.95, 0.95, WOOD);
  for (let s = 0; s < 4; s++) R.groove(along(-3.5 + s * 2.2), along(-2.6 + s * 2.2), -0.25); // the grip's wrapping
  R.ball(along(-6), 1.2, 1.2, IRON);
  // the blade's light runs from the dark spine to the bright honed edge
  const sx = -uy, sy = ux, o = J.handN;
  const depth = (x: number, y: number) => ((x - o[0]) * sx + (y - o[1]) * sy) / k;
  f.poly([along(17, 0.6), along(14.6, 5), along(16.4, 9), along(21.4, 10.2), along(26.4, 9), along(28, 5), along(25.6, 0.6)], STEEL, (x, y) => 0.22 + Math.max(0, depth(x, y)) * 0.055);
  R.groove(along(17.6, 3.4), along(25, 3.4), 0.12); // the bevel
  R.stroke(along(15, 5.6), along(16.8, 9.4), STEEL, 1, 1); // the honed edge
  R.stroke(along(16.8, 9.6), along(21.4, 10.6), STEEL, 1, 1);
  R.stroke(along(21.4, 10.6), along(26.6, 9.2), STEEL, 0.92, 1);
  R.ball(along(19.5, 8.4), 1.1, 0.9, BLOOD, 0, 0.5);
  R.ball(along(23, 9.4), 0.8, 0.6, BLOOD, 0, 0.5);
  R.stroke(along(19.5, 8.6), along(19, 5.6), BLOOD, 0.4, 1); // a run of it down the steel
  f.poly([along(19, -0.6), along(21.4, -4.6), along(23.4, -0.6)], STEEL, 0.4);
  R.ball(along(21.2, 0), 1.3, 1.3, IRON);
  // near arm over the haft, a bracer, a big shoulder
  R.arm('N', SKIN, SKIN);
  f.next();
  R.limb(R.at(J.elN, P.an2 + P.lean, 3), J.handN, 2.8, 2.8, LEATHER);
  R.groove(R.at(J.elN, P.an2 + P.lean, 4.5), R.at(J.elN, P.an2 + P.lean, 5), -0.2);
  f.next();
  R.ball(J.shN, 3.3, 3, SKIN, P.lean);
  return f;
}
const toward2 = (p: V, deg: number, len: number): V => [p[0] + Math.cos(deg * DEG) * len, p[1] + Math.sin(deg * DEG) * len];

const draw = (P: Pose) => headsman(P).resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.5, b: wave(t, 0.2) * 9, head: wave(t, 0.3) * 2, a: -80 + wave(t, 0.1) * 2, an2: -40 + wave(t, 0.1) * 2 });
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, {
    ln1: 92 + s * 22, ln2: 100 + s * 14 + Math.max(0, c) * 22, lf1: 92 - s * 22, lf2: 100 - s * 14 + Math.max(0, -c) * 22,
    lean: 6, oy: Math.abs(c) * -1.4, af1: 92 + s * 10, b: -s * 16, a: -76 + s * 3, head: -c * 2,
  });
};
/** Up, a held breath at the top, and down into the floor. */
const chop = keyed(BASE, [
  [0, {}],
  [0.35, { an1: -112, an2: -100, af1: 110, af2: 96, a: -128, lean: -12, head: -10, ln1: 108, lf1: 72, mouth: 1, b: -10 }],
  [0.6, { an1: -118, an2: -106, af1: 114, af2: 100, a: -136, lean: -14, head: -12, ln1: 110, lf1: 70, mouth: 1, b: -14 }],
  [0.74, { an1: 34, an2: 30, af1: 70, af2: 80, a: 30, lean: 30, head: 14, ln1: 116, ln2: 98, lf1: 60, lf2: 102, ox: 5, mouth: 1, b: 26 }],
  [1, { an1: 36, an2: 32, af1: 74, af2: 84, a: 32, lean: 28, head: 12, ln1: 116, ln2: 98, lf1: 60, lf2: 102, ox: 5, b: 8 }],
]);
/** The blade bit deep: he hauls at it. */
const stuck = (t: number): Pose => pose(BASE, { an1: 36 - wave(t) * 6, an2: 32, af1: 74 - wave(t) * 6, af2: 84, a: 32, lean: 24 - wave(t) * 8, head: 8 + wave(t, 0.2) * 8, ln1: 112, ln2: 98, lf1: 64, lf2: 102 + wave(t) * 4, ox: 5 - wave(t) * 2.5, b: wave(t, 0.1) * 14, mouth: 0.5 + wave(t) * 0.5 });
const yank = keyed(BASE, [
  [0, { an1: 36, an2: 32, af1: 74, af2: 84, a: 32, lean: 20, ln1: 112, lf1: 64, ox: 4 }],
  [0.4, { an1: 100, an2: 20, af1: 104, af2: 30, a: -10, lean: -16, head: -8, ln1: 100, lf1: 84, ox: -3, mouth: 1, b: -20 }],
  [1, {}],
]);
/** The cage swung back low, then hurled forward on its chain. */
const hurl = keyed(BASE, [
  [0, {}],
  [0.4, { af1: 150, af2: 160, lean: -8, ox: -3, b: 40, ln1: 108, lf1: 72, head: -4 }],
  [0.62, { af1: -20, af2: -30, lean: 18, ox: 4, b: -40, ln1: 110, lf1: 66, mouth: 1, c: 1 }],
  [1, { af1: 0, af2: -6, lean: 14, ox: 4, ln1: 108, lf1: 68, c: 1 }],
]);
/** Hauling the chain back hand over hand. */
const reel = (t: number): Pose => pose(BASE, { c: 1, lean: -10 + wave(t) * 4, ox: -2, af1: 60 + wave(t) * 40, af2: 20 + wave(t) * 30, an1: 70, ln1: 96, lf1: 82, head: -4, mouth: 0.6 });
/** Shoulder down, charging. */
const barge = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, {
    ln1: 86 + s * 34, ln2: 104 + s * 18 + Math.max(0, c) * 30, lf1: 86 - s * 34, lf2: 104 - s * 18 + Math.max(0, -c) * 30,
    lean: 26, head: 10, oy: Math.abs(c) * -2, an1: 110, an2: 60, a: -150, af1: 40, af2: 60, b: 30, ox: 3, mouth: 1,
  });
};

export function buildHeadsmanSheet(): SheetBuilder {
  const C = HEADSMAN_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'chop', 12, chop, draw, false);
  bake(b, 'stuck', 6, stuck, draw);
  bake(b, 'yank', 6, yank, draw, false);
  bake(b, 'hurl', 10, hurl, draw, false);
  bake(b, 'reel', 6, reel, draw);
  bake(b, 'barge', 6, barge, draw);
  return b;
}

/** 40x40, centered: `cage` (4 frames of the thrown cage tumbling). */
export function buildHeadsmanProps(): SheetBuilder {
  const b = new SheetBuilder(40, 40, 20, 20);
  b.add('cage', ...[-30, -10, 10, 30].map((sw) => {
    const f = new FormCanvas(40, 40);
    drawCage(f, 20, 6, sw, 2);
    return f.resolve({ rim: RIM });
  }));
  return b;
}
