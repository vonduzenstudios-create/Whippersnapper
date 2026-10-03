// The Gale Miller: a huge flour-pale man in a leather cap and apron, with a great bellows
// strapped to his back, a brass valve on top of it and a horn-mouthed hose in his fists.
// Puppet channels: `a` = the nozzle's angle, `b` = how far the bellows is squeezed shut (0..1).
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose, bust } from './puppet';

export const MILLER_CELL: Cell = { w: 168, h: 132, ax: 84, ay: 122 };
const BUILD: Build = { k: 1.5, torso: 11.5, hipR: 5.2, chestR: 7, neck: 1.4, headR: 4.2, arm: [9, 9, 3.5, 2.9], leg: [9, 9, 3.3, 2.5], foot: 4.4, shoulder: 1.9, hipW: 1.4 };

const SKIN = ramp('#3a3038', '#6c5c60', '#a08e8a', '#c8b8ac', '#e6dccc', '#f8f4ea');
const APRON = ramp('#3a3428', '#6e6650', '#a49a7c', '#d0c8a8', '#f0ead0');
const SHIRT = ramp('#0e1418', '#1e2a32', '#34464e', '#50666e');
const LEATHER = ramp('#180c06', '#38200e', '#5e3a1a', '#86582c', '#ac7c48');
const BRASS = ramp('#241206', '#4c2a0c', '#7c4e16', '#aa7a28', '#d4a848', '#f6dc90');
const BELLOW = ramp('#1c060a', '#421018', '#6e1c24', '#963434');
const DARK = ramp('#06040a', '#16101a');
const RIM = hex('#a0c0e0');

const BASE: Pose = pose(STAND, { an1: 50, an2: 0, af1: 70, af2: 10, a: 16, b: 0.3, ln1: 100, lf1: 82 });

export function miller(P: Pose, cell: Cell = MILLER_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  R.dim(-0.16, () => {
    R.leg('F', SHIRT, LEATHER);
    R.arm('F', SKIN, SKIN);
  });
  // the bellows pack: two boards, pleats that close as it is squeezed, the valve on top
  f.next();
  const open = 1 - P.b * 0.6;
  for (let i = 0; i < 5; i++) {
    const y = -13 + i * 2.6 * open + (1 - open) * 5;
    R.limb(R.body(-11.5, y), R.body(-5, y - 0.4), 1.6, 1.9, i % 2 ? BELLOW : LEATHER, 0.8);
  }
  R.limb(R.body(-12, -14.4 + (1 - open) * 5), R.body(-4.6, -14.8 + (1 - open) * 5), 1, 1, LEATHER, 0.7);
  R.limb(R.body(-12, -0.6), R.body(-4.6, -1), 1.2, 1.2, LEATHER, 0.7);
  const valve = R.body(-8, -16.6 + (1 - open) * 5);
  R.ball(valve, 2.2, 1.8, BRASS);
  R.limb(valve, [valve[0], valve[1] - 2.6 * k], 0.9, 1.3, BRASS);
  // the hose, sagging from the pack round to his hands
  const hose0 = R.body(-9, -1), sag: V = [(hose0[0] + J.handN[0]) / 2 - 3 * k, Math.max(hose0[1], J.handN[1]) + 5 * k];
  R.limb(hose0, sag, 1.3, 1.3, LEATHER, 0.8);
  R.limb(sag, J.handN, 1.3, 1.3, LEATHER, 0.8);
  // trunk, straps, apron
  R.torso(SHIRT, SKIN);
  f.next();
  R.limb(R.body(-4.6, -11), R.body(5, -3), 1, 1, LEATHER, 0.7);
  f.next();
  R.limb(R.body(1.8, -9.4), R.body(1.6, 1), 5, 5.4, APRON, 0.8);
  R.limb(R.body(1.6, 1), R.body(1.4 - P.sway * 2, 9.5), 5.4, 4.4, APRON, 0.8);
  R.limb(R.body(-5, -0.8), R.body(6.6, -1.4), 1.1, 1.1, LEATHER, 0.7);
  for (let i = 0; i < 3; i++) R.groove(R.body(0 + i * 2, 2), R.body(-0.4 + i * 2 - P.sway, 9), -0.1);
  R.leg('N', SHIRT, LEATHER);
  // head: a leather cap with ear flaps, a moustache like a broom, small hard eyes
  f.next();
  R.ball(J.head, 4.2, 4.2, SKIN, P.lean + P.head);
  R.ball(R.face(1.6, 2.8 + P.mouth * 0.6), 3.2, 2.6, SKIN);
  R.dot(R.face(2.6, -0.6), DARK, 0.1);
  R.limb(R.face(1.4, -2), R.face(4, -1.2 - P.mouth), 0.6, 0.5, LEATHER, 0.6);
  R.ball(R.face(4.4, 0.6), 1.2, 1, SKIN);
  f.next();
  R.limb(R.face(1.4, 2), R.face(5.6, 3.4), 1.3, 0.5, APRON);
  R.limb(R.face(1.4, 2), R.face(0.4, 4.4), 1.2, 0.5, APRON);
  if (P.mouth > 0.5) R.limb(R.face(2.4, 3.4), R.face(3.6, 4.4), 1, 0.9, DARK);
  f.next();
  R.ball(R.face(-0.6, -2.2), 4.4, 3.4, LEATHER, P.lean + P.head - 10);
  R.limb(R.face(-3, -1), R.face(-3.6 - P.sway, 4), 1.6, 1.1, LEATHER);
  R.limb(R.face(-0.4, -3.4), R.face(4.6, -2.6), 0.9, 0.7, LEATHER, 0.7);
  // the nozzle: a brass horn
  f.next();
  R.limb(J.handN, R.at(J.handN, P.a, 9), 1.4, 3.6, BRASS);
  const mouth = R.at(J.handN, P.a, 9);
  f.disc(mouth[0], mouth[1], 2.4 * k, DARK, 0.1);
  R.arm('N', SKIN, SKIN);
  f.next();
  R.limb(R.at(J.elN, P.an2 + P.lean, 2.5), R.at(J.elN, P.an2 + P.lean, 5.5), 3.1, 3, LEATHER, 0.8); // a wrist brace
  return { f, head: J.head };
}

const draw = (P: Pose) => miller(P).f.resolve({ rim: RIM, contour: 0.12 });

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.6, head: wave(t, 0.2) * 2, b: 0.3 + wave(t) * 0.25, a: 16 + wave(t, 0.1) * 3 });
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 94 + s * 22, ln2: 100 + s * 14 + Math.max(0, c) * 20, lf1: 92 - s * 22, lf2: 100 - s * 14 + Math.max(0, -c) * 20, lean: 8, oy: Math.abs(c) * -1.5, head: -c * 3, b: 0.3 + c * 0.2, a: 20 + s * 4 });
};
const gust = keyed(BASE, [
  [0, {}],
  [0.35, { a: -2, an1: 30, an2: -4, af1: 40, af2: 4, lean: -10, head: -8, b: 0, ln1: 108, lf1: 74, mouth: 1 }],
  [0.6, { a: 0, an1: 20, an2: 0, af1: 30, af2: 6, lean: 16, head: 6, b: 1, ln1: 118, ln2: 100, lf1: 64, lf2: 100, ox: 3, mouth: 1 }],
  [1, { a: 0, an1: 22, an2: 0, af1: 32, af2: 6, lean: 18, head: 6, b: 1, ln1: 118, ln2: 100, lf1: 64, lf2: 100, ox: 3, mouth: 1 }],
]);
const inhale = (t: number): Pose => pose(BASE, { a: -2, an1: 24, an2: 0, af1: 34, af2: 6, lean: -12 + wave(t) * 2, head: -12, b: 0.1 + wave(t) * 0.1, ln1: 96, lf1: 70, lf2: 96, mouth: 1, breath: 1 });
const heave = keyed(BASE, [
  [0, {}],
  [0.45, { an1: -110, an2: -90, af1: -96, af2: -80, lean: -14, head: -12, ln1: 104, lf1: 78, mouth: 1, a: -80 }],
  [0.65, { an1: -10, an2: 10, af1: -4, af2: 14, lean: 22, head: 8, ln1: 116, lf1: 62, lf2: 102, ox: 4, mouth: 1, a: 30 }],
  [1, { an1: 40, an2: 30, af1: 46, af2: 30, lean: 14 }],
]);
/** Too much pressure: bent over, hands on knees, the valve hissing. */
const vent = (t: number): Pose => pose(BASE, { lean: 42 + wave(t) * 2, head: 22 + wave(t, 0.2) * 3, an1: 76, an2: 96, af1: 70, af2: 96, a: 96, ln1: 108, ln2: 82, lf1: 70, lf2: 100, b: 1 - Math.abs(wave(t * 2)) * 0.2, mouth: 1 });
const stun = (t: number): Pose => pose(BASE, { ln1: 70, ln2: 172, lf1: 40, lf2: 150, lean: 26 + wave(t) * 4, head: 30 + wave(t, 0.2) * 6, an1: 96, an2: 100, af1: 90, af2: 96, a: 100, b: 1, mouth: 1 });
const jump = (t: number): Pose => pose(BASE, { air: 6, ln1: 60 + wave(t) * 6, ln2: 130, lf1: 40, lf2: 120, an1: -100, an2: -80, af1: -80, af2: -100, lean: 10, head: 10, a: -70, b: 0.5, mouth: 1 });

export function buildMillerSheet(): SheetBuilder {
  const C = MILLER_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'gust', 8, gust, draw, false);
  bake(b, 'inhale', 6, inhale, draw);
  bake(b, 'heave', 8, heave, draw, false);
  bake(b, 'vent', 6, vent, draw);
  bake(b, 'jump', 4, jump, draw);
  bake(b, 'stun', 6, stun, draw);
  return b;
}

export function millerPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => miller(pose(BASE, { mouth: angry ? 1 : 0, head: angry ? -6 : 2, an1: 100, an2: 100, af1: 100, af2: 100, a: 90 }), cell, 3.5), RIM);
}

/** 48x48, centered: `stone` (4, a millstone rolling), `brake` (the sail brake: set, pulled). */
export function buildMillProps(): SheetBuilder {
  const b = new SheetBuilder(48, 48, 24, 24);
  const STONE = ramp('#1c1a20', '#3c3a42', '#62606a', '#8c8a92', '#b8b6ba');
  b.add('stone', ...[0, 1, 2, 3].map((i) => {
    const f = new FormCanvas(48, 48), a = (i / 4) * (Math.PI / 4);
    f.ball(24, 24, 13, 13, STONE, 0, 0.5);
    for (let s = 0; s < 8; s++) f.groove(24 + Math.cos(a + s * 0.785) * 4, 24 + Math.sin(a + s * 0.785) * 4, 24 + Math.cos(a + s * 0.785 + 0.3) * 12, 24 + Math.sin(a + s * 0.785 + 0.3) * 12, -0.2);
    f.disc(24, 24, 3, DARK, 0.1);
    return f.resolve({ rim: RIM });
  }));
  b.add('brake', ...[0, 1].map((pulled) => {
    const f = new FormCanvas(48, 48);
    f.limb(18, 44, 30, 44, 3, 3, LEATHER, 0.8);
    f.next();
    f.limb(24, 42, pulled ? 38 : 14, 18, 1.6, 1.3, LEATHER);
    f.ball(pulled ? 38 : 14, 16, 3.4, 3.4, BRASS);
    return f.resolve({ rim: RIM });
  }));
  return b;
}

/** The sails (312x312, centered on the axle): six frames cover a quarter turn, then it repeats. */
export function buildSails(): SheetBuilder {
  const b = new SheetBuilder(312, 312, 156, 156);
  const wood = hex('#3a2616'), woodL = hex('#5e4026'), cloth = hex('#6e664e'), clothD = hex('#4a4434');
  b.add('sails', ...Array.from({ length: 6 }, (_, i) => {
    const p = new PixelCanvas(312, 312);
    for (let s = 0; s < 4; s++) {
      const a = (i / 6) * (Math.PI / 2) + s * (Math.PI / 2), ux = Math.cos(a), uy = Math.sin(a);
      const at = (d: number, side: number): [number, number] => [156 + ux * d - uy * side, 156 + uy * d + ux * side];
      // canvas stretched on one side of the stock, in four panels
      for (let k = 0; k < 4; k++) p.poly([at(34 + k * 25, 2), at(57 + k * 25, 2), at(57 + k * 25, 26), at(34 + k * 25, 26)], k % 2 ? cloth : clothD);
      for (let k = 0; k <= 4; k++) p.line(...at(34 + k * 25, 0), ...at(34 + k * 25, 26), wood);
      p.line(...at(34, 26), ...at(134, 26), wood);
      p.line(...at(8, 0), ...at(136, 0), woodL, 3);
    }
    p.circle(156, 156, 10, wood);
    p.circle(156, 156, 5, woodL);
    return p;
  }));
  return b;
}
