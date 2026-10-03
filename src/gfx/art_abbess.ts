// The Rose Abbess: a tall nun in a habit the green-black of old leaves, a white wimple, a
// crown of thorns, roses opening on her shoulders, roots where her feet should be, and in
// place of one hand a long thorned briar she uses as a whip.
// Puppet channels: `a` = the briar's angle, `b` = how far it is thrown out (0 coiled .. 1 straight),
// `c` = how far her roses are open (0..1).
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, keyed, bake, wave, pose, bust } from './puppet';

export const ABBESS_CELL: Cell = { w: 208, h: 156, ax: 92, ay: 146 };
const BUILD: Build = { k: 1.5, torso: 12, hipR: 3.8, chestR: 4.6, neck: 2.2, headR: 3.9, arm: [9, 9, 2.3, 1.7], leg: [10, 10, 2, 1.6], foot: 3, shoulder: 1.4, hipW: 1 };

const HABIT = ramp('#04080a', '#0a1614', '#142822', '#203c32', '#305446', '#4a7460');
const LINEN = ramp('#4a4858', '#8a8894', '#bebcc0', '#e2e0dc', '#fafaf4');
const SKIN = ramp('#2c3430', '#566058', '#869080', '#b0b8a4', '#d4d8c4');
const THORN = ramp('#100c06', '#2a2010', '#4a3a1c', '#6c582c', '#8e7a44');
const ROSE = ramp('#2c0410', '#5e0a1c', '#9a142a', '#cc3040', '#ec6c6c', '#fcb0a8');
const DARK = ramp('#040406', '#101014');
const RIM = hex('#c06080');

const BASE: Pose = pose(STAND, { an1: 70, an2: 40, af1: 100, af2: 74, a: 70, b: 0.15, c: 0.4 });

export function abbess(P: Pose, cell: Cell = ABBESS_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  const rose = (p: V, size: number) => {
    f.next();
    R.ball(p, size, size, ROSE);
    if (size > 1.4) {
      R.groove(R.at(p, 200, size * 0.7), R.at(p, 20, size * 0.7), -0.22);
      R.groove(R.at(p, 110, size * 0.7), R.at(p, -70, size * 0.7), -0.16);
      R.dot(p, ROSE, 1);
    }
  };
  const sleeve = (sh: V, el: V, hand: V, fore: number) => {
    f.next();
    R.limb(sh, el, 2.6, 2.8, HABIT);
    R.limb(el, hand, 2.8, 3.8, HABIT, 0.9);
    R.limb(hand, R.at(hand, fore + P.lean + 94, 4 + P.sway), 2.6, 1, HABIT, 0.8, () => -0.14);
  };
  R.dim(-0.18, () => {
    sleeve(J.shF, J.elF, J.handF, P.af2);
    f.next();
    R.limb(J.handF, R.at(J.handF, P.af2 + P.lean, 2.8), 1.2, 0.9, SKIN);
  });
  // roots: they spread across the floor where the habit ends, and writhe with her
  f.next();
  for (let i = 0; i < 6; i++) {
    const u = i / 5 - 0.5, from: V = [J.pelvis[0] + u * 9 * k, cell.ay - 5 * k];
    const out: V = [from[0] + (u * 16 + Math.sin(P.sway * 2 + i) * 2.4) * k, cell.ay - 1];
    R.limb(from, [(from[0] + out[0]) / 2, cell.ay - (3 + (i % 2) * 2) * k], 1.6, 1.2, THORN);
    R.limb([(from[0] + out[0]) / 2, cell.ay - (3 + (i % 2) * 2) * k], out, 1.2, 0.4, THORN);
  }
  R.robe(HABIT, 20, 7.6, 4.4, 6);
  R.torso(HABIT, SKIN);
  f.next();
  R.limb(R.body(0.8, -10), R.body(0.6 - P.sway * 1.4, 10), 2.6, 3, HABIT, 0.6, () => 0.1); // the scapular
  R.stroke(R.body(0.8, -8), R.body(1 - P.sway * 0.5, -1), THORN, 0.7);
  rose(R.body(1 - P.sway * 0.5, -0.4), 1 + P.c * 0.9);
  // head: a still pale face in white linen, a black veil behind, thorns for a crown
  f.next();
  R.limb(R.face(-2, -3), R.face(-5.6 - P.sway * 2.6, 9), 3.6, 2.4, HABIT);
  f.next();
  R.ball(R.face(-0.4, 0), 4.6, 4.9, LINEN, P.lean + P.head);
  R.limb(R.face(-1, 3.6), R.face(2, 5.4), 3, 2.6, LINEN);
  f.next();
  R.ball(R.face(1.4, 0.4), 3.2, 3.8, SKIN, P.lean + P.head);
  if (P.mouth > 0.5) {
    R.dot(R.face(2.6, -0.4), ROSE, 0.9);
    R.dot(R.face(3.4, -0.3), ROSE, 1);
    R.limb(R.face(2.6, 2.6), R.face(3.4, 3.2), 0.8, 0.7, DARK);
  } else {
    R.stroke(R.face(2, -0.2), R.face(3.8, -0.4), DARK, 0.2); // eyes closed
    R.stroke(R.face(2.4, 2.6), R.face(3.6, 2.5), ROSE, 0.3);
  }
  R.dot(R.face(4.4, 1), SKIN, 0.8);
  f.next();
  for (let i = 0; i < 7; i++) {
    const p = R.face(-3.6 + i * 1.3, -3.9 - Math.sin(i * 1.3) * 0.6);
    R.stroke(p, R.at(p, -110 + i * 12, 2.4), THORN, 0.5 + (i % 2) * 0.3);
  }
  R.limb(R.face(-4, -3.6), R.face(4.4, -3.4), 0.8, 0.8, THORN, 0.7);
  // near arm: a sleeve, and out of it the briar
  sleeve(J.shN, J.elN, J.handN, P.an2);
  f.next();
  let p = J.handN, ang = P.a + P.lean;
  const curl = (1 - P.b) * 52, seg = 7 + P.b * 6;
  for (let i = 0; i < 6; i++) {
    const q = R.at(p, ang, seg);
    R.limb(p, q, 1.3 - i * 0.16, 1.15 - i * 0.16, THORN);
    const t = R.at(p, ang, seg * 0.5);
    R.stroke(t, R.at(t, ang + (i % 2 ? 80 : -80), 2), THORN, 0.8);
    p = q;
    ang += curl * (i % 2 ? 0.7 : 1) + P.sway * 6;
  }
  rose(p, 1.2 + P.c * 0.5);
  // roses on her shoulders
  rose(R.at(J.shN, -110, 2), 1.3 + P.c * 1.5);
  rose(R.at(J.shF, -80, 2.4), 1 + P.c * 1.2);
  return { f, head: J.head };
}

const draw = (P: Pose) => abbess(P).f.resolve({ rim: RIM, contour: 0.1 });

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.6, head: wave(t, 0.2) * 3, a: 70 + wave(t, 0.1) * 6, b: 0.15 + wave(t, 0.3) * 0.06, c: 0.4 + wave(t) * 0.1, sway: wave(t, 0.3) * 0.5 });
const walk = (t: number): Pose => pose(BASE, { lean: 6 + wave(t) * 2, oy: Math.abs(wave(t)) * -1.6, head: -2 + wave(t, 0.2) * 3, a: 60 + wave(t) * 8, b: 0.2, c: 0.6, sway: wave(t * 2) * 0.9, mouth: 1 });
const lash = keyed(BASE, [
  [0, {}],
  [0.3, { an1: -150, an2: -170, a: -160, b: 0.5, lean: -12, head: -8, mouth: 1, c: 0.8 }],
  [0.5, { an1: -156, an2: -178, a: -170, b: 0.6, lean: -14, head: -10, mouth: 1, c: 0.8 }],
  [0.62, { an1: -10, an2: 0, a: 2, b: 1, lean: 18, head: 6, mouth: 1, c: 1, ox: 3 }],
  [0.8, { an1: 0, an2: 6, a: 6, b: 1, lean: 16, head: 6, mouth: 1, c: 1, ox: 3 }],
  [1, {}],
]);
const cast = (t: number): Pose => pose(BASE, { lean: -6 + wave(t) * 1.5, head: -14 + wave(t, 0.2) * 3, an1: -40 + wave(t) * 5, an2: -70, af1: -130 + wave(t) * 5, af2: -100, a: -80 + wave(t, 0.2) * 14, b: 0.5, c: 1, mouth: 1, oy: wave(t) * 1.2, sway: wave(t, 0.3) * 0.8 });
/** Cut off from her roots: bowed over, the roses shut, the briar slack on the floor. */
const stun = (t: number): Pose => pose(BASE, { lean: 40 + wave(t) * 3, head: 30 + wave(t, 0.2) * 4, an1: 88, an2: 92, af1: 84, af2: 90, a: 60, b: 0.9, c: 0, oy: 2, sway: -0.5 });

export function buildAbbessSheet(): SheetBuilder {
  const C = ABBESS_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'lash', 12, lash, draw, false);
  bake(b, 'cast', 8, cast, draw);
  bake(b, 'stun', 6, stun, draw);
  return b;
}

export function abbessPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => abbess(pose(BASE, { mouth: angry ? 1 : 0, head: angry ? -6 : 4, c: angry ? 1 : 0.5, an1: 100, an2: 100, af1: 100, af2: 100, a: 100, b: 0.1 }), cell, 3.6), RIM);
}

/** 48x56, centered: `heart` (2, beating), `dead`, `wall` (2, a column of briar), `curtain` (whole, burnt), `patch` (thorns on the floor). */
export function buildGlasshouseProps(): SheetBuilder {
  const b = new SheetBuilder(48, 56, 24, 28);
  const heart = (beat: number, dead = false) => {
    const f = new FormCanvas(48, 56), m = dead ? THORN : ROSE, r = 8 + beat;
    for (const [dx, dy] of [[-12, -10], [12, -11], [-10, 12], [11, 12]]) f.limb(24, 28, 24 + dx, 28 + dy, 2, 0.6, THORN); // roots holding it
    f.next();
    f.ball(20, 26, r * 0.72, r * 0.8, m);
    f.ball(28, 26, r * 0.72, r * 0.8, m);
    f.limb(24, 28, 24, 36 + beat, r * 0.6, 1, m);
    if (dead) for (const x of [19, 27]) f.groove(x, 20, x + 2, 36, -0.3);
    return f.resolve({ rim: RIM });
  };
  b.add('heart', heart(0), heart(1.6));
  b.add('dead', heart(-1.5, true));
  const briar = (shift: number, burnt = false) => {
    const f = new FormCanvas(48, 56), m = burnt ? DARK : THORN;
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 10.5;
      f.next();
      for (let y = 0; y < 56; y += 14) {
        const x0 = x + Math.sin((y + shift * 9 + i * 20) * 0.11) * 5, x1 = x + Math.sin((y + 14 + shift * 9 + i * 20) * 0.11) * 5;
        if (burnt && (y + i * 14) % 28) continue;
        f.limb(x0, y, x1, y + 14, 3, 3, m);
        f.stroke(x0, y + 4, x0 + (i % 2 ? 6 : -6), y + 1, m, 0.8);
        f.stroke(x1, y + 11, x1 + (i % 2 ? -6 : 6), y + 8, m, 0.8);
      }
    }
    if (!burnt) for (const [x, y] of [[12, 12], [34, 30], [20, 46]]) {
      f.next();
      f.ball(x + shift, y, 3.4, 3.4, ROSE);
    }
    return f.resolve({ rim: RIM });
  };
  b.add('wall', briar(0), briar(1));
  b.add('curtain', briar(0.5), briar(0.5, true));
  const patch = new FormCanvas(48, 56);
  for (let i = 0; i < 7; i++) {
    patch.next();
    patch.limb(6 + i * 6, 54, 4 + i * 6 + (i % 3) * 3, 40 - (i % 2) * 5, 2, 0.3, THORN);
  }
  b.add('patch', patch.resolve({ rim: RIM }));
  return b;
}
