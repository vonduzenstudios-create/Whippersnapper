// The Rookery Gargoyle: a living rain-spout come down off the cathedral roof. Slate-blue hide,
// bat wings, ram horns, a grimacing spout of a mouth, a long tail with a spade blade. When it
// drops on you it sets hard into pale granite; hit enough, cracks open all over it with ember
// light inside.
// Extra pose channels: `wing` (0 folded .. 1 spread), `tail` (the tail's sweep, degrees),
// `stone` (0 living .. 1 granite). Every animation is baked three times, once per crack level:
// `idle`, `idle_1`, `idle_2`...
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp, Ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose } from '../puppet';
import { BONE, INK, RIM, rng, toward } from './common';

export const GARGOYLE_CELL: Cell = { w: 184, h: 132, ax: 84, ay: 126 };
const BUILD: Build = { k: 1.55, torso: 11, hipR: 4.4, chestR: 7.4, neck: 1.6, headR: 3.8, arm: [7.4, 7, 3, 2.4], leg: [7, 7, 3.6, 2.4], foot: 4.6, shoulder: 2, hipW: 1.4 };

const HIDE = ramp('#0c1016', '#1a2230', '#2c3a4c', '#465a6c', '#64808e', '#90aab0');
const BELLY = ramp('#1a1a20', '#363844', '#565a64', '#7a7e84');
const WINGM = ramp('#0a0c12', '#161c26', '#242e3c', '#34424e');
const STONE = ramp('#2a2620', '#4c463c', '#726a5c', '#9a9280', '#c2baa4', '#e2dccc');
const EYE = ramp('#7a3008', '#e08018', '#ffe070');
const EMBER = ramp('#5a1004', '#c04010', '#ff9030', '#ffe0a0');
const MOSS = ramp('#10180a', '#24341a', '#3c5228');

const BASE: Pose = pose(STAND, {
  lean: 22, head: -14, an1: 50, an2: 70, af1: 60, af2: 80, ln1: 44, ln2: 130, lf1: 56, lf2: 136, oy: 3,
  wing: 0, tail: 0, stone: 0,
});

/** Living hide, or granite (`stone` past one half). */
const mat = (P: Pose, live: Ramp) => (P.stone > 0.5 ? STONE : live);

function wingDraw(R: Rig, P: Pose, side: 'N' | 'F') {
  const J = R.J, k = R.k, f = R.f;
  const root = side === 'N' ? R.body(-2.2, -BUILD.torso + 1.6) : R.body(-1.2, -BUILD.torso + 1.2);
  const spread = P.wing;
  // folded, the wing's elbow juts up over the shoulder and the fingers hang down its back like a cloak
  const up = -118 + P.lean * 0.3 - spread * 22 + (side === 'F' ? 16 : 0);
  const elbow = toward(root, up, (10 - spread * 1) * k);
  const wrist = toward(elbow, up + 40 - spread * 60, (4 + spread * 5) * k);
  // finger spokes fanning back from the wrist, the membrane hung between them
  const tips: V[] = [];
  for (let i = 0; i < 4; i++) tips.push(toward(wrist, up + 150 + i * 16 - spread * (90 - i * 10) - P.sway * 8, (9 + spread * 7 - i * 1.2) * k));
  f.next();
  const m = mat(P, WINGM);
  f.bias += 0.12; // a little lighter than the hide behind it, so the folded wing reads
  const edge: V[] = [root, elbow, wrist, ...tips, R.body(-4, -2)];
  f.poly(edge, m, (x, y) => 0.28 + ((x + y) % 7) * 0.01);
  for (let i = 0; i < tips.length - 1; i++) {
    const mid: V = [(tips[i][0] + tips[i + 1][0]) / 2, (tips[i][1] + tips[i + 1][1]) / 2];
    f.poly([wrist, tips[i], toward(mid, -90, -1.4 * k), tips[i + 1]], m, 0.36);
  }
  f.next();
  const bone = mat(P, HIDE);
  R.limb(root, elbow, 1.6, 1.2, bone);
  R.limb(elbow, wrist, 1.2, 0.9, bone);
  for (const t of tips) R.limb(wrist, t, 0.7, 0.3, bone);
  f.bias -= 0.12;
  R.stroke(wrist, toward(wrist, up - 40, 2.4 * k), BONE, 0.8); // the thumb claw
  void J;
}

export function gargoyle(P: Pose, cracks: number, cell: Cell = GARGOYLE_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  const hide = mat(P, HIDE), belly = mat(P, BELLY);
  R.dim(-0.22, () => wingDraw(R, P, 'F'));
  // the tail: a long whip over the back, ending in a spade
  f.next();
  // `tail` swings the whole tail up and over; at rest it trails low in a lazy S
  let tp = R.body(-3.6, -0.6), ta = 160 + P.tail - P.sway * 10;
  for (let i = 0; i < 8; i++) {
    const q = toward(tp, ta, 2.2 * k);
    R.limb(tp, q, 1.7 - i * 0.16, 1.5 - i * 0.16, hide);
    tp = q;
    ta += (i < 4 ? -6 : 14) + P.tail * 0.08;
  }
  f.poly([toward(tp, ta - 90, 2.2 * k), toward(tp, ta, 4.2 * k), toward(tp, ta + 90, 2.2 * k), toward(tp, ta + 180, 0.8 * k)], P.stone > 0.5 ? STONE : BONE, 0.6);
  R.dim(-0.22, () => {
    R.leg('F', hide, hide);
    R.arm('F', hide, hide);
  });
  // body
  R.torso(hide);
  f.next();
  R.ball(R.body(1.8, -6.4), 4.4, 5.4, belly, P.lean, 0.8);
  for (let i = 0; i < 4; i++) R.groove(R.body(0.4, -9 + i * 2), R.body(4.4, -9.4 + i * 2), -0.18); // plated belly
  R.leg('N', hide, hide);
  // talons on the near foot
  for (let i = 0; i < 3; i++) R.stroke(R.at(J.footN, 0, BUILD.foot - 0.6), R.at(J.footN, 0 + (i - 1) * 30 + 30, BUILD.foot + 1.6), BONE, 0.85);
  // the head: horns, a heavy brow, a gaping spout of a mouth
  f.next();
  R.limb(R.face(-1, -2.4), R.face(-4, -3), 1.4, 1, hide);
  let hp = R.face(-2.6, -2.8), ha = -160 + P.lean + P.head;
  for (let i = 0; i < 5; i++) {
    const q = toward(hp, ha, 1.6 * k);
    R.limb(hp, q, 1.3 - i * 0.2, 1.1 - i * 0.2, P.stone > 0.5 ? STONE : BONE);
    hp = q;
    ha -= 40;
  }
  f.next();
  R.ball(J.head, 4, 3.6, hide, P.lean + P.head);
  R.limb(R.face(0.4, 0.2), R.face(4.4, 0.8), 2.6, 2, hide); // snout
  f.next();
  f.poly([R.face(1, 1), R.face(5.2, 0.8 + P.mouth * 0.4), R.face(4.6, 2.4 + P.mouth * 1.8), R.face(1, 2.2)], INK, 0.2); // the spout mouth, always open
  for (let t = 1.6; t < 4.8; t += 1) R.stroke(R.face(t, 1.1), R.face(t, 1.8), BONE, 0.85);
  f.next();
  R.limb(R.face(0.6, 2.6), R.face(4.4, 2.6 + P.mouth * 2), 1.2, 1, hide); // jaw
  R.ball(R.face(1.6, -1.8), 2.4, 1.1, hide, P.lean + P.head - 6); // brow
  if (P.stone < 0.5) {
    R.dot(R.face(2.2, -0.8), EYE, 0.95);
    R.dot(R.face(2.9, -0.8), EYE, 0.7);
  } else R.groove(R.face(1.8, -0.8), R.face(3.2, -0.8), -0.3);
  R.limb(R.face(-0.6, -1), R.face(-2.6, -0.4), 1.2, 0.3, hide); // a frilled ear
  // near arm and wing
  R.arm('N', hide, hide);
  for (let i = 0; i < 3; i++) R.stroke(R.at(J.handN, P.an2 + P.lean, 0.8), R.at(J.handN, P.an2 + P.lean - 30 + i * 30, 2.8), BONE, 0.9);
  f.next();
  R.ball(J.shN, 3.2, 2.8, hide, P.lean);
  wingDraw(R, P, 'N');
  // moss in the hollows (only while it is living stone)
  const rnd = rng(31);
  if (P.stone < 0.5)
    for (let i = 0; i < 4; i++) {
      const p = R.body(-3 + rnd() * 4, -2 - rnd() * 8);
      if (f.filled(...p)) R.ball(p, 1 + rnd(), 0.6 + rnd() * 0.5, MOSS, 0, 0.4);
    }
  // cracks with ember light in them, more of them the more it has been hurt
  if (cracks > 0) {
    const crk = rng(77);
    const n = cracks === 1 ? 3 : 7;
    for (let c = 0; c < n; c++) {
      let p = R.body(-3 + crk() * 7, -1 - crk() * 11), a = crk() * 360;
      for (let s = 0; s < 6 + cracks * 2; s++) {
        a += (crk() - 0.5) * 70;
        const q = toward(p, a, 1.6);
        if (f.filled(...q)) {
          f.dot(...q, INK, 0);
          if (s % 2 === 0) f.dot(q[0] + 1, q[1], EMBER, 0.55 + cracks * 0.15);
        }
        p = q;
      }
    }
  }
  return f;
}

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: 3 + wave(t) * 0.6, head: -14 + wave(t, 0.3) * 3, tail: wave(t, 0.2) * 12, wing: 0.05 + wave(t, 0.1) * 0.05 });
/** Knuckling along, hunched, wings half open for balance. */
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 44 + s * 24, ln2: 130 + Math.max(0, c) * 20, lf1: 44 - s * 24, lf2: 130 + Math.max(0, -c) * 20, lean: 30, an1: 20 - s * 30, an2: 50, af1: 20 + s * 30, af2: 50, oy: 3 - Math.abs(c) * 1.6, wing: 0.2, tail: s * 14, head: -20 });
};
const crouch = (t: number): Pose => pose(BASE, { lean: 36, head: -30, oy: 9 + wave(t) * 0.6, ln1: 18, ln2: 158, lf1: 24, lf2: 160, an1: 40, an2: 80, wing: 0.4, tail: 20, mouth: 0.5 });
/** Wings flung up, rising. */
const leap = (t: number): Pose => pose(BASE, { air: 6, lean: 10, head: -10, ln1: 120, ln2: 110, lf1: 110, lf2: 100, an1: -40, an2: -30, af1: -30, af2: -20, wing: 0.8 + wave(t) * 0.2, tail: -40, mouth: 1 });
/** Set into granite, wings wrapped, dropping like a stone. */
const dive = (t: number): Pose => pose(BASE, { air: 6, stone: 1, lean: 40, head: 10, ln1: 30, ln2: 150, lf1: 40, lf2: 154, an1: 100, an2: 140, af1: 100, af2: 140, wing: 0, tail: -20 - wave(t) * 4 });
/** Landed and still stone, sunk into a crouch. */
const stuck = (t: number): Pose => pose(BASE, { stone: 1, lean: 40, head: 16, oy: 9, ln1: 16, ln2: 160, lf1: 22, lf2: 162, an1: 70, an2: 100, af1: 70, af2: 100, wing: 0.1, tail: 10 + wave(t) * 0.5 });
/** Shaking the stone off. */
const wake = keyed(pose(BASE, { stone: 1 }), [
  [0, { lean: 40, head: 16, oy: 9, ln1: 16, ln2: 160, lf1: 22, lf2: 162, an1: 70, an2: 100, af1: 70, af2: 100, wing: 0.1 }],
  [0.45, { lean: 30, head: -30, oy: 6, ln1: 26, lf1: 30, wing: 0.9, mouth: 1, stone: 1 }],
  [0.55, { lean: 30, head: -30, oy: 6, ln1: 26, lf1: 30, wing: 0.9, mouth: 1, stone: 0 }],
  [1, { stone: 0 }],
]);
/** The tail whipped up over its shoulder and stabbed forward. */
const stab = keyed(BASE, [
  [0, {}],
  [0.35, { tail: 70, lean: 26, head: -24, wing: 0.3 }],
  [0.55, { tail: 170, lean: 44, head: -30, ox: 3, mouth: 1, wing: 0.5 }],
  [0.75, { tail: 176, lean: 44, head: -30, ox: 3, mouth: 1, wing: 0.5 }],
  [1, {}],
]);

const ANIMS: [string, number, (t: number) => Pose, boolean][] = [
  ['idle', 6, idle, true], ['walk', 8, walk, true], ['crouch', 2, crouch, true], ['leap', 2, leap, true],
  ['dive', 2, dive, true], ['stuck', 2, stuck, true], ['wake', 6, wake, false], ['stab', 8, stab, false],
];

export function buildGargoyleSheet(): SheetBuilder {
  const C = GARGOYLE_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  for (let cr = 0; cr < 3; cr++)
    for (const [name, n, fn, loop] of ANIMS) {
      const draw = (P: Pose) => gargoyle(P, cr).resolve({ rim: RIM, contour: 0.12 });
      bake(b, cr ? `${name}_${cr}` : name, n, fn, draw, loop);
    }
  return b;
}

/** 20x20: `chip` (a stone flake, 2 frames), `rubble` (a lump knocked loose by its landing). */
export function buildGargoyleProps(): SheetBuilder {
  const b = new SheetBuilder(20, 20, 10, 10);
  b.add('chip', ...[0, 1].map((i) => {
    const f = new FormCanvas(20, 20);
    f.poly(i ? [[5, 8], [14, 5], [15, 12], [8, 15]] : [[6, 6], [13, 7], [12, 14], [5, 12]], STONE, (x, y) => 0.4 + (x - y) * 0.03);
    return f.resolve({ rim: RIM });
  }));
  const f = new FormCanvas(20, 20);
  f.ball(10, 11, 6, 5, STONE, 0.3, 0.8);
  f.groove(6, 10, 13, 13, -0.3);
  b.add('rubble', f.resolve({ rim: RIM }));
  return b;
}
