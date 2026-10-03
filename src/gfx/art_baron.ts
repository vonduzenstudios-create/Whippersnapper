// The Powder Baron: a stout old gunner in a brass-buttoned greatcoat and a tricorn, a peg for
// one leg, a bandolier of bombs across his belly and a hand mortar on his shoulder.
// Puppet channels: `a` = the mortar's pitch (degrees), `b` = how brightly its touch-hole glows.
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose, bust } from './puppet';

export const BARON_CELL: Cell = { w: 160, h: 128, ax: 78, ay: 118 };
const BUILD: Build = { k: 1.5, torso: 10.5, hipR: 5.6, chestR: 6.6, neck: 1.4, headR: 4.4, arm: [8, 8, 2.8, 2.3], leg: [8, 8.5, 3.2, 2.5], foot: 4.2, shoulder: 1.8, hipW: 1.5 };

const COAT = ramp('#060c14', '#0e1c2c', '#183248', '#264c66', '#3c6c86', '#6898ac');
const BRASS = ramp('#241206', '#4c2a0c', '#7c4e16', '#aa7a28', '#d4a848', '#f6dc90');
const SKIN = ramp('#3a1818', '#6e3028', '#a05040', '#c87c5c', '#e4a888');
const BEARD = ramp('#34323c', '#66626c', '#9c98a0', '#ccc8cc', '#f0eeee');
const IRON = ramp('#08080c', '#18181e', '#2c2c36', '#484856', '#70707e');
const WOOD = ramp('#1a0e08', '#3a2212', '#5e3c20', '#825a34');
const RED = ramp('#2c0810', '#5c1018', '#962028', '#c84838');
const SPARK = ramp('#f06010', '#ffc040', '#fff8c0');
const RIM = hex('#e0a060');

const BASE: Pose = pose(STAND, { an1: 10, an2: -60, af1: 96, af2: 70, a: -24, ln1: 98, lf1: 84 });

export function baron(P: Pose, cell: Cell = BARON_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  // the far leg is a turned wooden peg below the knee
  R.dim(-0.16, () => {
    f.next();
    R.limb(J.hipF, J.kneeF, 3.2, 2.6, COAT);
    R.limb(J.kneeF, [J.footF[0], J.footF[1] + BUILD.foot * 0.5 * k], 1.5, 0.9, WOOD);
    R.ball(J.kneeF, 2.2, 1.6, BRASS);
    R.arm('F', COAT, SKIN);
  });
  // coat skirts
  f.next();
  for (let i = 0; i < 4; i++) R.limb(R.body(-4 + i * 2.6, 0), R.body(-6 + i * 3.4 - P.sway * 2.4, 8.5 + (i % 2)), 3, 2.2, COAT, 0.8, () => (i % 2 ? -0.08 : 0.02));
  // trunk and a proud belly
  R.torso(COAT, SKIN);
  f.next();
  R.ball(R.body(2.4, -4), 6 + P.breath * 0.4, 5.6, COAT, P.lean);
  for (let i = 0; i < 4; i++) R.dot(R.body(5.2 - i * 0.2, -8 + i * 2.6), BRASS, 0.95);
  f.next();
  R.limb(R.body(-4.4, -10), R.body(6.6, -1.6), 1.2, 1.2, WOOD, 0.7); // the bandolier
  for (let i = 0; i < 3; i++) {
    const c = R.body(-1.4 + i * 3, -7 + i * 2.3);
    R.ball(c, 1.7, 1.7, IRON);
    R.dot([c[0], c[1] - 2.4 * k], SPARK, 0.3);
  }
  R.limb(R.body(-5.4, -0.8), R.body(7, -1.2), 1.3, 1.3, RED, 0.7);
  R.leg('N', COAT, IRON);
  R.groove(R.at(J.kneeN, 180, 2.6), R.at(J.kneeN, 0, 2.6), 0.2); // the boot top
  // head: red face, a white beard like a shovel, a patch, the tricorn
  f.next();
  R.ball(J.head, 4.2, 4.2, SKIN, P.lean + P.head);
  R.dot(R.face(4.6, 0.4), SKIN, 0.9);
  R.ball(R.face(4, 0.6), 1.3, 1.1, SKIN);
  R.dot(R.face(2.6, -1), IRON, 0.1);
  R.limb(R.face(0.2, -2.6), R.face(3.6, -0.6), 0.5, 0.5, IRON, 0.5);
  f.next();
  R.ball(R.face(1.4, 3.6 + P.mouth * 0.6), 4, 3.6, BEARD, P.lean + P.head + 10);
  for (let i = 0; i < 4; i++) R.stroke(R.face(-0.6 + i * 1.3, 4.6), R.face(-0.2 + i * 1.5 - P.sway, 8.4 + (i % 2)), BEARD, 0.5 + (i % 2) * 0.3, 2);
  if (P.mouth > 0.5) R.limb(R.face(2.4, 2.4), R.face(3.8, 2.8), 0.9, 0.7, RED);
  R.limb(R.face(1.6, 1.4), R.face(5, 2), 0.9, 0.5, BEARD);
  f.next();
  R.limb(R.face(-7, -3 + P.sway * 0.6), R.face(7.6, -3.8), 1.4, 1.2, COAT, 0.7);
  R.limb(R.face(-3.4, -4.4), R.face(3.6, -5), 2.8, 2.4, COAT);
  R.groove(R.face(-6, -3.6), R.face(7, -4.4), 0.2);
  R.limb(R.face(-3.6, -5.6), R.face(-6.6 - P.sway * 1.6, -9.6), 1, 0.3, RED); // a cockade feather
  // the mortar on his near shoulder
  f.next();
  const m0 = R.at(J.shN, P.a + 180, 3), m1 = R.at(J.shN, P.a, 13);
  R.limb(m0, m1, 3.6, 4, IRON);
  for (const d of [2, 8, 13]) R.limb(R.at(R.at(J.shN, P.a, d), P.a - 90, 3.8), R.at(R.at(J.shN, P.a, d), P.a + 90, 3.8), 0.9, 0.9, BRASS, 0.7);
  f.disc(...m1, 2.6 * k, IRON, 0.05);
  R.dot(R.at(m0, P.a - 90, 3.4), SPARK, 0.2 + P.b * 0.8);
  R.arm('N', COAT, SKIN);
  f.next();
  R.ball(R.at(J.shN, 100, 1), 3.2, 2.6, BRASS, P.lean); // an epaulette
  return { f, head: J.head };
}

const draw = (P: Pose) => baron(P).f.resolve({ rim: RIM, contour: 0.12 });

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.5, head: wave(t, 0.2) * 3, a: -24 + wave(t, 0.1) * 2, af2: 70 + wave(t, 0.3) * 4 });
/** A hobble: the peg swings stiff, the good leg does the work. */
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 94 + s * 22, ln2: 100 + s * 14 + Math.max(0, c) * 20, lf1: 90 - s * 16, lf2: 90 - s * 16, lean: 4 + c * 3, oy: Math.abs(s) * -1.6, head: -c * 4, a: -22 + c * 4, af1: 96 - s * 10 });
};
const toss = keyed(BASE, [
  [0, {}],
  [0.4, { af1: 210, af2: 250, lean: -10, head: -8, mouth: 1 }],
  [0.62, { af1: -40, af2: -30, lean: 12, head: 4, mouth: 1, ox: 2 }],
  [1, { af1: 20, af2: 10, lean: 6 }],
]);
const kick = keyed(BASE, [
  [0, {}],
  [0.4, { ln1: 130, ln2: 150, lean: -8, lf1: 86, lf2: 90, mouth: 1 }],
  [0.65, { ln1: 12, ln2: 6, lean: -16, lf1: 88, lf2: 90, mouth: 1, ox: 2 }],
  [1, {}],
]);
const fire = keyed(BASE, [
  [0, {}],
  [0.5, { a: -4, an1: 0, an2: -40, lean: 8, ln1: 110, lf1: 72, head: 6, b: 1, mouth: 1 }],
  [0.62, { a: -4, an1: 0, an2: -40, lean: 10, ln1: 112, lf1: 70, head: 6, b: 1, mouth: 1 }],
  [0.74, { a: -40, an1: -16, an2: -70, lean: -16, ln1: 96, lf1: 96, head: -10, ox: -6, b: 0, mouth: 1 }],
  [1, {}],
]);
/** Sat down hard, soot-black, the mortar in his lap. */
const stun = (t: number): Pose => pose(BASE, { ln1: 8, ln2: 2, lf1: -6, lf2: 0, lean: -10 + wave(t) * 3, head: 14 + wave(t * 2) * 8, a: 60, an1: 60, an2: 30, af1: 110, af2: 60, mouth: 1 });
const shift = (t: number): Pose => pose(BASE, { af1: -100, af2: -80 + wave(t) * 8, lean: -8 + wave(t * 2) * 3, head: -14, mouth: 1, a: -50, b: 1, oy: Math.abs(wave(t * 2)) * -2 });

export function buildBaronSheet(): SheetBuilder {
  const C = BARON_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'toss', 8, toss, draw, false);
  bake(b, 'kick', 8, kick, draw, false);
  bake(b, 'fire', 10, fire, draw, false);
  bake(b, 'stun', 6, stun, draw);
  bake(b, 'shift', 6, shift, draw);
  return b;
}

export function baronPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => baron(pose(BASE, { mouth: angry ? 1 : 0, head: angry ? -6 : 2, a: -70, an1: 100, an2: 100, af1: 100, af2: 100 }), cell, 3.4), RIM);
}

/** 48x48, centered: `bomb` (2, the fuse spitting), `keg` (4, rolling), `ball`, `stack` (the powder store), `powder` (a spilled line). */
export function buildBaronProps(): SheetBuilder {
  const b = new SheetBuilder(48, 48, 24, 24);
  b.add('bomb', ...[0, 1].map((i) => {
    const f = new FormCanvas(48, 48);
    f.ball(24, 26, 8, 8, IRON);
    f.limb(24, 18, 24, 15, 2, 2, BRASS, 0.8);
    f.stroke(24, 15, 27, 11, WOOD, 0.6);
    f.dot(27 + i, 10 - i, SPARK, 0.9);
    f.dot(28 - i, 9 + i, SPARK, 0.4);
    return f.resolve({ rim: RIM });
  }));
  b.add('keg', ...[0, 1, 2, 3].map((i) => {
    // seen end-on as it rolls: staves round a head, the bung going round
    const f = new FormCanvas(48, 48), a = (i / 4) * Math.PI * 2;
    f.ball(24, 24, 11, 11, WOOD, 0, 0.5);
    f.next();
    f.ball(24, 24, 8, 8, WOOD, 0, 0.3);
    for (let s = 0; s < 4; s++) f.groove(24, 24, 24 + Math.cos(a + s * 1.57) * 8, 24 + Math.sin(a + s * 1.57) * 8, -0.2);
    f.ball(24 + Math.cos(a) * 5, 24 + Math.sin(a) * 5, 1.6, 1.6, IRON);
    return f.resolve({ rim: RIM, ink: hex('#1a0e08') });
  }));
  const ball = new FormCanvas(48, 48);
  ball.ball(24, 24, 5, 5, IRON);
  b.add('ball', ball.resolve({ rim: RIM }));
  const st = new FormCanvas(48, 48);
  for (const [x, y] of [[13, 36], [35, 36], [24, 20]]) {
    st.next();
    st.limb(x, y - 8, x, y + 6, 9.5, 9.5, WOOD, 0.8);
    for (const dy of [-6, 4]) st.limb(x - 9, y + dy, x + 9, y + dy, 1, 1, IRON, 0.7);
  }
  b.add('stack', st.resolve({ rim: RIM }));
  const pw = new PixelCanvas(48, 48);
  for (let x = 0; x < 48; x++) if ((x * 7) % 5 < 3) pw.set(x, 24 + ((x * 3) % 2), hex(x % 3 ? '#18181e' : '#484856'));
  b.add('powder', pw);
  return b;
}
