// The Harvest Reaper: a scarecrow in a ragged coat and a wide hat, a stitched sack for a face,
// straw at every cuff, a lantern at his belt and a scythe as long as he is tall.
// Puppet channels: `a` = the scythe's angle, `b` = how hot his eyes and lantern burn (0..1).
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose, bust } from './puppet';

export const REAPER_CELL: Cell = { w: 200, h: 150, ax: 100, ay: 138 };
const BUILD: Build = { k: 1.5, torso: 12, hipR: 3.6, chestR: 5, neck: 2, headR: 4.2, arm: [10, 10, 1.9, 1.4], leg: [10.5, 10.5, 2.3, 1.6], foot: 3.6, shoulder: 1.6, hipW: 1 };

const SACK = ramp('#2a1e12', '#544024', '#846838', '#b09454', '#d4bc7c', '#eedca4');
const COAT = ramp('#08060a', '#16101a', '#261c28', '#3a2c38', '#54424e');
const STRAW = ramp('#5a3c08', '#9a7010', '#d0a428', '#f4d858');
const BLADE = ramp('#14161e', '#343a4c', '#6a7488', '#aab4c4', '#eef2f8');
const WOOD = ramp('#1a0e08', '#3a2212', '#5e3c20', '#825a34');
const EMBER = ramp('#7a1c08', '#f06010', '#ffc040', '#fff8c0');
const DARK = ramp('#040206', '#120a10');
const RIM = hex('#d05a40');

const BASE: Pose = pose(STAND, { an1: 60, an2: 0, af1: 30, af2: -30, a: -74, b: 0.5 });

export function reaper(P: Pose, cell: Cell = REAPER_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  /** Straw bursting out of a cuff. */
  const tuft = (p: V, ang: number, n = 4) => {
    for (let i = 0; i < n; i++) R.stroke(p, R.at(p, ang + (i - n / 2) * 22 + P.sway * 10, 2.6 + (i % 2)), STRAW, 0.5 + (i % 3) * 0.2);
  };
  R.dim(-0.18, () => {
    R.leg('F', COAT, COAT);
    R.arm('F', COAT, SACK);
    tuft(J.handF, P.af2 + P.lean);
  });
  // coat tails: ragged strips that trail behind him
  f.next();
  for (let i = 0; i < 5; i++) R.limb(R.body(-3 + i * 1.5, -1), R.body(-5.5 + i * 2 - P.sway * (3 + i * 0.5), 10 + (i % 2) * 2.5), 1.8, 1, COAT, 0.8, () => (i % 2 ? -0.1 : 0));
  R.torso(COAT, SACK);
  R.groove(R.body(1.6, -10), R.body(1.2, -1), 0.14);
  f.next();
  R.limb(R.body(-3.6, -1.4), R.body(4, -1.8), 0.8, 0.8, STRAW, 0.6); // a rope belt
  tuft(R.body(0.6, -11), -90, 6);
  // the lantern at his hip
  const lan = R.body(3.4 - P.sway * 1.4, 3.6);
  R.stroke(R.body(3, -1.4), lan, WOOD, 0.5);
  R.ball(lan, 2, 2.5, EMBER, 0, 0.4);
  f.dot(lan[0], lan[1], EMBER, 0.5 + P.b * 0.5);
  R.leg('N', COAT, COAT);
  tuft(J.footN, 200, 3);
  // the head: a sack tied at the neck, two burnt eye holes, a stitched grin
  f.next();
  R.ball(J.head, 4.2, 4.5, SACK, P.lean + P.head);
  R.limb(R.face(-1.6, 4), R.face(1.6, 4.2), 2, 2.4, SACK, 0.8);
  R.groove(R.face(-3, -1), R.face(-1.6, 3.6), -0.16);
  for (const [ex, ey] of [[1.2, -0.8], [3.4, -0.6]]) {
    f.disc(...R.face(ex, ey), 1.1 * k, DARK, 0.1);
    R.dot(R.face(ex + 0.2, ey), EMBER, 0.25 + P.b * 0.75);
  }
  R.stroke(R.face(0.6, 2), R.face(4, 1.6 + P.mouth * 0.8), DARK, 0.2);
  for (let i = 0; i < 4; i++) R.stroke(R.face(1 + i * 0.9, 1.3), R.face(1 + i * 0.9, 2.7 + P.mouth * 0.6), DARK, 0.3);
  // the hat: a drooping brim and a crooked crown
  f.next();
  R.limb(R.face(-8, -2.6 + P.sway), R.face(8.4, -3.4), 1.3, 1.1, COAT, 0.7);
  R.limb(R.face(-0.6, -3.6), R.face(-2.2 - P.sway, -9.6), 3.6, 1.2, COAT);
  R.limb(R.face(-3.4, -4.2), R.face(3.2, -4.6), 1, 1, STRAW, 0.6);
  tuft(R.face(-3.6, -1.6), 150, 4);
  // the scythe: a long snath, a blade that curves down and back
  f.next();
  const ux = Math.cos(P.a * DEG), uy = Math.sin(P.a * DEG);
  const al = (d: number, side = 0): V => [J.handN[0] + (ux * d - uy * side) * k, J.handN[1] + (uy * d + ux * side) * k];
  R.limb(al(-14), al(30), 0.9, 0.8, WOOD);
  f.poly([al(30, -1.2), al(31.5, 1), al(27, 10), al(18, 18), al(8, 21), al(17, 15), al(24, 8), al(27.5, 0)], BLADE, (x, y) => 0.4 + ((x + y * 2) % 6) * 0.07);
  R.ball(al(29.5), 1.3, 1.3, BLADE);
  R.arm('N', COAT, SACK);
  tuft(J.handN, P.an2 + P.lean + 180);
  return { f, head: J.head };
}

const draw = (P: Pose) => reaper(P).f.resolve({ rim: RIM, contour: 0.12 });

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.6, head: wave(t, 0.2) * 3, a: -74 + wave(t, 0.1) * 2, sway: wave(t, 0.3) * 0.5, b: 0.5 + wave(t * 2) * 0.2 });
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 92 + s * 26, ln2: 100 + s * 16 + Math.max(0, c) * 22, lf1: 92 - s * 26, lf2: 100 - s * 16 + Math.max(0, -c) * 22, lean: 9, oy: Math.abs(c) * -1.4, head: 6 - c * 3, an1: 64 - s * 5, a: -66 + s * 4, b: 0.7 });
};
/** Lost her: the scythe on his shoulder, the head swinging slowly from side to side. */
const search = (t: number): Pose => pose(BASE, { an1: -30, an2: -100, af1: 96, af2: 80, a: -160, lean: 6 + wave(t) * 3, head: wave(t) * 20, ln1: 98, lf1: 82, oy: wave(t * 2) * 0.5, b: 0.3 + Math.max(0, wave(t)) * 0.3 });
const reap = keyed(BASE, [
  [0, {}],
  [0.3, { an1: -150, an2: -120, af1: -120, af2: -90, a: -200, lean: -12, head: -8, ln1: 106, lf1: 76, mouth: 1, b: 1 }],
  [0.5, { an1: -156, an2: -126, af1: -124, af2: -94, a: -208, lean: -14, head: -10, ln1: 108, lf1: 74, mouth: 1, b: 1 }],
  [0.68, { an1: 10, an2: 20, af1: 4, af2: 14, a: 30, lean: 24, head: 10, ln1: 116, ln2: 98, lf1: 60, lf2: 102, ox: 6, mouth: 1, b: 1 }],
  [0.82, { an1: 60, an2: 96, af1: 50, af2: 80, a: 110, lean: 20, head: 8, ln1: 114, ln2: 98, lf1: 62, lf2: 102, ox: 6, mouth: 1, b: 0.8 }],
  [1, {}],
]);
const hurl = keyed(BASE, [
  [0, {}],
  [0.4, { af1: 200, af2: 240, lean: -12, head: -6, an1: 70, an2: 20, mouth: 1, b: 1 }],
  [0.6, { af1: -10, af2: -4, lean: 18, head: 6, an1: 80, an2: 40, ox: 3, mouth: 1, b: 1 }],
  [1, { af1: 0, af2: 6, lean: 12, an1: 76, an2: 30 }],
]);
const whirl = (t: number): Pose => pose(BASE, { an1: wave(t) > 0 ? 0 : 180, an2: wave(t) > 0 ? 0 : 180, af1: wave(t) > 0 ? 180 : 0, af2: wave(t) > 0 ? 180 : 0, a: wave(t) > 0 ? 6 : 174, lean: wave(t, 0.25) * 10, head: wave(t) * 12, ln1: 100, lf1: 80, oy: -1, mouth: 1, b: 1, sway: wave(t) * 1.2 });
const stun = (t: number): Pose => pose(BASE, { lean: -14 + wave(t) * 5, head: -22 + wave(t, 0.2) * 8, an1: -40 + wave(t) * 30, an2: -80, af1: 150 - wave(t) * 30, af2: 120, a: 100, ln1: 104 + wave(t) * 6, lf1: 76 - wave(t) * 6, ox: wave(t) * 2, mouth: 1, b: 0.15 });

export function buildReaperSheet(): SheetBuilder {
  const C = REAPER_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'search', 8, search, draw);
  bake(b, 'reap', 12, reap, draw, false);
  bake(b, 'hurl', 8, hurl, draw, false);
  bake(b, 'whirl', 6, whirl, draw);
  bake(b, 'stun', 6, stun, draw);
  return b;
}

export function reaperPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => reaper(pose(BASE, { mouth: angry ? 1 : 0, head: angry ? -6 : 4, b: angry ? 1 : 0.4, an1: 100, an2: 100, af1: 100, af2: 100, a: 80 }), cell, 3.5), RIM);
}

/** 24x56, anchored bottom middle: `tall` (6 frames of wheat swaying) and `stub`. */
export function buildFieldProps(): SheetBuilder {
  const b = new SheetBuilder(24, 56, 12, 56);
  const stalks = (bend: number, cut: boolean) => {
    const p = new PixelCanvas(24, 56);
    for (let i = 0; i < 7; i++) {
      const x = 2 + i * 3.2, h = cut ? 5 + (i % 3) * 2 : 34 + ((i * 7) % 9);
      const tipX = x + bend * (cut ? 0 : 5 + (i % 3)) + ((i % 2) - 0.5) * 2;
      p.line(x, 56, tipX, 56 - h, hex(i % 2 ? '#7a5a10' : '#a07c18'));
      if (!cut) {
        p.line(tipX, 56 - h, tipX + bend * 1.5, 56 - h - 8, hex(i % 2 ? '#d0a428' : '#e8c444'), 2);
        p.set(tipX + bend * 1.5, 56 - h - 9, hex('#f4d858'));
      }
    }
    return p;
  };
  b.add('tall', ...Array.from({ length: 6 }, (_, i) => stalks(Math.sin((i / 6) * Math.PI * 2), false)));
  b.add('stub', stalks(0, true));
  return b;
}

/** His thrown sickle (24x24, centered): four quarter turns. */
export function buildSickle(): SheetBuilder {
  const b = new SheetBuilder(24, 24, 12, 12);
  b.add('sickle', ...[0, 1, 2, 3].map((q) => {
    const p = new PixelCanvas(24, 24), a = (q * Math.PI) / 2, cx = 12, cy = 12;
    for (let s = 0; s <= 20; s++) {
      const t = a + (s / 20) * Math.PI * 1.25;
      p.circle(cx + Math.cos(t) * 8, cy + Math.sin(t) * 8, 1.4 - s * 0.03, hex(s % 4 < 2 ? '#aab4c4' : '#eef2f8'));
    }
    p.line(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, cx + Math.cos(a - 0.5) * 3, cy + Math.sin(a - 0.5) * 3, hex('#825a34'), 2);
    p.outline(hex('#14161e'));
    return p;
  }));
  return b;
}

/** The harvest moon (112x112, centered): huge, low and red. */
export function buildMoon(): SheetBuilder {
  const b = new SheetBuilder(112, 112, 56, 56), p = new PixelCanvas(112, 112);
  p.circle(56, 56, 54, hex('#3a0c10'));
  p.circle(56, 56, 50, hex('#8a1c18'));
  p.circle(54, 54, 46, hex('#b83424'));
  p.circle(50, 50, 38, hex('#d0503a'));
  for (const [x, y, r] of [[40, 40, 9], [66, 52, 12], [48, 72, 7], [76, 30, 5], [30, 62, 5]]) p.circle(x, y, r, hex('#a82c20'));
  b.add('moon', p);
  return b;
}
