// The Plague Warden: the castle's last physician. A long beaked mask with round green lenses, a
// wide hat, a tarred oilcloth coat to the floor, a bandolier of green vials. He leans on a
// censer-cane that never stops smoking, and carries a bone saw.
// Channels: `a` = the saw's angle, `b` = how far the censer swings on its chain (degrees),
// `c` = 1 when a vial is in his throwing hand.
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose } from '../puppet';
import { IRON, STEEL, WOOD, LEATHER, GOLD, BONE, INK, RIM, toward } from './common';

export const WARDEN_CELL: Cell = { w: 150, h: 104, ax: 66, ay: 98 };
const BUILD: Build = { k: 1.3, torso: 12, hipR: 4, chestR: 5.4, neck: 1.8, headR: 3.4, arm: [8, 7.6, 2.2, 1.8], leg: [9.4, 9.2, 2.6, 2], foot: 4, shoulder: 1.6, hipW: 1.1 };

const COAT = ramp('#06070a', '#111418', '#1c2228', '#2a3238', '#3e484c', '#56605c');
const MASK = ramp('#1a1208', '#3a2814', '#5e4224', '#86603a', '#ac8456', '#d0ae80');
const GLASS = ramp('#0a2a10', '#1a6a20', '#50c040', '#b0ff80', '#f0ffd0');
const SMOKE = ramp('#1a2410', '#34481e', '#587030', '#88a050');

const BASE: Pose = pose(STAND, { lean: 10, head: 4, an1: 60, an2: 10, af1: 40, af2: 70, a: -30, b: 0, c: 0, ln1: 100, lf1: 80 });

/** A stoppered vial of green poison (also the thrown one). */
export function drawVial(f: FormCanvas, x: number, y: number, rot: number, k: number) {
  const u = rot * DEG, at = (d: number): V => [x + Math.cos(u) * d * k, y + Math.sin(u) * d * k];
  f.next();
  f.ball(...at(0), 1.9 * k, 1.9 * k, GLASS);
  f.limb(...at(1.6), ...at(3), 0.8 * k, 0.7 * k, GLASS);
  f.limb(...at(3), ...at(3.8), 0.9 * k, 0.9 * k, WOOD);
  f.dot(x - 0.6 * k, y - 0.6 * k, GLASS, 1);
}

export function warden(P: Pose, cell: Cell = WARDEN_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  // far side: the arm and the censer-cane it leans on
  R.dim(-0.18, () => {
    R.leg('F', COAT, LEATHER);
    R.arm('F', COAT, LEATHER);
  });
  f.next();
  const caneTop = toward(J.handF, -90, 3 * k), caneFoot: V = [J.handF[0] + 3 * k, cell.ay - 1];
  R.limb(caneTop, caneFoot, 0.7, 0.6, WOOD);
  R.ball(caneTop, 1.1, 1.1, GOLD);
  // the censer swinging under the cane's crook
  const crook = toward(caneTop, 0, 2.4 * k);
  R.limb(caneTop, crook, 0.6, 0.6, GOLD);
  const cen = toward(crook, 90 + P.b, 3.4 * k);
  R.stroke(crook, cen, IRON, 0.5, 1);
  f.next();
  R.ball(cen, 2, 1.7, GOLD, P.b);
  for (let i = -1; i <= 1; i++) R.groove(toward(cen, 180 + P.b, 1.6 * k + i), toward(cen, P.b, 1.6 * k + i), -0.22);
  R.dot(toward(cen, 90 + P.b, 0.8 * k), GLASS, 0.9);
  // the long coat: legs only show at the slit
  R.leg('N', COAT, LEATHER);
  R.torso(COAT);
  R.robe(COAT, 15.6, 6.4, BUILD.hipR, 5);
  f.next();
  // a cape over the shoulders
  for (let i = 0; i < 4; i++) R.limb(R.body(-2.6 + i * 1.6, -BUILD.torso + 0.4), R.body(-3.6 + i * 2.2 - P.sway * 1.6, -BUILD.torso + 6 + (i % 2)), 2.2, 1.6, COAT, 0.8, () => (i % 2 ? -0.06 : 0.05));
  // belt and the bandolier of vials
  f.next();
  R.limb(R.body(-3.6, -1), R.body(4, -1.2), 1, 1, LEATHER);
  R.ball(R.body(2.8, -1.2), 0.9, 0.9, GOLD);
  R.limb(R.body(-3, -BUILD.torso + 1), R.body(3.8, -2), 0.8, 0.8, LEATHER);
  for (let i = 0; i < 4; i++) {
    const p = R.body(-1.8 + i * 1.6, -BUILD.torso + 2.4 + i * 2.2);
    R.ball(p, 1, 1.2, GLASS);
    R.dot(p, GLASS, 0.95);
  }
  // the head: a hood, the beaked mask, round lenses, and the hat
  f.next();
  R.ball(J.head, 3.6, 3.8, COAT, P.lean + P.head);
  R.ball(R.face(1.4, 0), 2.8, 3, MASK, P.lean + P.head);
  // the beak: long, curving down, stitched along its ridge
  const tip = R.face(9.4, 4.6);
  f.poly([R.face(2.4, -0.6), R.face(6, 0.4), tip, R.face(5.4, 2.6), R.face(2.4, 2.4)], MASK, (x, y) => 0.62 - (y - J.head[1]) * 0.02);
  R.groove(R.face(2.6, -0.4), R.face(8.6, 3.8), 0.18);
  for (let i = 0; i < 4; i++) R.groove(R.face(3.4 + i * 1.4, 0.1 + i * 0.7), R.face(3.4 + i * 1.4, 0.9 + i * 0.7), -0.25);
  R.groove(R.face(2.4, 1.6), R.face(7.8, 3.6), -0.22);
  // lenses ringed in brass
  for (const [x, y, r] of [[2.4, -0.8, 1.3], [3.6, -0.6, 1.1]] as [number, number, number][]) {
    R.ball(R.face(x, y), r, r, GOLD);
    R.ball(R.face(x, y), r * 0.65, r * 0.65, GLASS, 0, 0.3);
    R.dot(R.face(x - 0.3, y - 0.3), GLASS, 1);
  }
  // the hat: a wide brim and a flat crown
  f.next();
  R.limb(R.face(-5.6, -3), R.face(6.2, -2.6), 1, 0.9, COAT, 0.7);
  R.limb(R.face(-2.6, -5.8), R.face(3, -5.6), 2.8, 2.6, COAT);
  R.limb(R.face(-2.6, -3.8), R.face(3, -3.6), 0.7, 0.7, LEATHER); // the band
  // the bone saw: a long toothed blade of bone on an iron spine
  f.next();
  const ux = Math.cos(P.a * DEG), uy = Math.sin(P.a * DEG);
  const along = (d: number, side = 0): V => [J.handN[0] + (ux * d - uy * side) * k, J.handN[1] + (uy * d + ux * side) * k];
  R.limb(along(-2.6), along(1.6), 0.9, 0.8, WOOD);
  f.poly([along(1.6, -1.2), along(13, -0.8), along(13.6, 1.6), along(1.6, 2.2)], BONE, 0.55);
  R.limb(along(1.6, -1.4), along(13, -1), 0.5, 0.5, IRON);
  for (let i = 0; i < 9; i++) R.stroke(along(2.4 + i * 1.25, 2), along(2.9 + i * 1.25, 3), BONE, 0.9);
  R.dot(along(10, 1.2), ramp('#3e060a', '#7a1010'), 0.6);
  if (P.c > 0.5) drawVial(f, ...along(-0.4, -2.4), P.a - 90, k * 0.8);
  // near arm in its gauntlet, the cuff
  R.arm('N', COAT, LEATHER);
  f.next();
  R.limb(R.at(J.elN, P.an2 + P.lean, 3.6), R.at(J.elN, P.an2 + P.lean, 5.6), 2.2, 2.2, LEATHER);
  void STEEL;
  return f;
}

const draw = (P: Pose) => warden(P).resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.4, b: wave(t) * 14, head: 4 + wave(t, 0.3) * 3, a: -30 + wave(t, 0.2) * 3 });
/** A limp: the cane takes his weight every other step. */
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 94 + s * 18, ln2: 100 + Math.max(0, c) * 18, lf1: 94 - s * 18, lf2: 100 + Math.max(0, -c) * 18, lean: 12 + Math.max(0, s) * 6, oy: Math.abs(c) * -1 + Math.max(0, -s) * 1.2, b: -s * 22, head: 4 - c * 2 });
};
/** A vial from the bandolier, lobbed overhand. */
const lob = keyed(BASE, [
  [0, {}],
  [0.25, { an1: -60, an2: -150, a: -170, c: 1, lean: 2, head: -6 }],
  [0.5, { an1: -140, an2: -160, a: -200, c: 1, lean: -6, head: -10, ln1: 108, lf1: 72 }],
  [0.68, { an1: -20, an2: 0, a: 20, c: 0, lean: 16, head: 4, ox: 2, ln1: 104, lf1: 76 }],
  [1, {}],
]);
/** Three quick cuts with the bone saw, stepping in. */
const saw = keyed(BASE, [
  [0, {}],
  [0.15, { an1: -90, an2: -60, a: -60, lean: 4 }],
  [0.3, { an1: 30, an2: 30, a: 40, lean: 20, ox: 3 }],
  [0.45, { an1: -60, an2: -30, a: -40, lean: 14, ox: 4 }],
  [0.6, { an1: 40, an2: 40, a: 30, lean: 24, ox: 6 }],
  [0.75, { an1: -20, an2: 20, a: -10, lean: 22, ox: 7 }],
  [0.88, { an1: 10, an2: -6, a: -8, lean: 26, ox: 9, ln1: 112, lf1: 70 }],
  [1, {}],
]);
/** He raises the censer-cane and swings it hard: the choking cloud pours out. */
const vent = (t: number): Pose => pose(BASE, { af1: -90, af2: -110, b: wave(t) * 60, lean: -6, head: -10, oy: wave(t) * 0.5, an1: 80, an2: 30 });

export function buildWardenSheet(): SheetBuilder {
  const C = WARDEN_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'lob', 10, lob, draw, false);
  bake(b, 'saw', 14, saw, draw, false);
  bake(b, 'vent', 6, vent, draw);
  return b;
}

/** 24x24: `vial` (4 frames tumbling), `puddle` (3 frames of a bubbling green pool, 32 wide drawn in the middle). */
export function buildWardenProps(): SheetBuilder {
  const b = new SheetBuilder(32, 24, 16, 12);
  b.add('vial', ...[0, 90, 180, 270].map((r) => {
    const f = new FormCanvas(32, 24);
    drawVial(f, 16, 12, r, 1.6);
    return f.resolve({ rim: RIM });
  }));
  b.add('puddle', ...[0, 1, 2].map((i) => {
    const f = new FormCanvas(32, 24);
    f.ball(16, 20, 14, 3, GLASS, 0, 0.3);
    f.ball(16, 20, 10, 2, SMOKE, 0, 0.3);
    for (let j = 0; j < 3; j++) f.ball(8 + j * 8 + ((i + j) % 2) * 2, 18 - ((i + j) % 3), 1.4, 1.4, GLASS);
    return f.resolve({ rim: RIM, outline: false });
  }));
  return b;
}
