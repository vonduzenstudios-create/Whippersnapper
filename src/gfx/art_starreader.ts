// The Star-Reader: a stooped astrologer in a midnight robe sewn with constellations, a beard
// to his belt, a tall bent hat, and a staff topped with a little armillary sphere.
// Puppet channels: `a` = the staff's angle, `b` = how brightly its star burns (0..1).
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, bake, wave, pose, bust } from './puppet';

export const STARREADER_CELL: Cell = { w: 160, h: 160, ax: 78, ay: 150 };
const BUILD: Build = { k: 1.5, torso: 11, hipR: 4, chestR: 4.8, neck: 1.8, headR: 4, arm: [8.5, 8.5, 2.4, 1.9], leg: [9.5, 9.5, 2, 1.6], foot: 3, shoulder: 1.4, hipW: 1 };

const ROBE = ramp('#04040e', '#0a0c22', '#141a3c', '#20305c', '#30487e', '#5070a8');
const GOLD = ramp('#3a2008', '#7a4c10', '#b88424', '#e4bc50', '#fff0a8');
const SKIN = ramp('#3a2c34', '#6c5658', '#a08478', '#c8ac98', '#e4d0bc');
const BEARD = ramp('#3c3a4c', '#6e6c80', '#a4a2b0', '#d4d2da', '#f6f6f8');
const STAR = ramp('#3a60c0', '#80b0ff', '#d0e8ff', '#ffffff');
const DARK = ramp('#04020a', '#100c1c');
const RIM = hex('#80a0ff');

const BASE: Pose = pose(STAND, { lean: 12, head: -6, an1: 50, an2: -10, af1: 100, af2: 60, a: -84, b: 0.5 });

export function starreader(P: Pose, cell: Cell = STARREADER_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  const sleeve = (sh: V, el: V, hand: V, fore: number) => {
    f.next();
    R.limb(sh, el, 2.6, 2.8, ROBE);
    R.limb(el, hand, 2.8, 4.2, ROBE, 0.9);
    R.limb(hand, R.at(hand, fore + P.lean + 96, 4.6 + P.sway), 2.8, 1, ROBE, 0.8, () => -0.14);
    R.limb(R.at(hand, fore + P.lean - 90, 3.6), R.at(hand, fore + P.lean + 90, 3.6), 0.7, 0.7, GOLD, 0.6);
    f.next();
    R.limb(hand, R.at(hand, fore + P.lean, 2.6), 1.2, 0.9, SKIN);
  };
  R.dim(-0.18, () => sleeve(J.shF, J.elF, J.handF, P.af2));
  R.robe(ROBE, 20, 8, 4.4, 6);
  R.torso(ROBE, SKIN);
  // constellations stitched in gold thread
  const stars: V[] = [[-2.5, -8], [1.5, -5.5], [3.5, -9], [-1, -1.5], [2.5, 2.5], [-3, 5], [1, 8.5], [4.5, 12], [-2, 14]];
  stars.forEach((s, i) => {
    const p = R.body(s[0] - P.sway * Math.max(0, s[1]) * 0.12, s[1]);
    if (i) R.groove(R.body(stars[i - 1][0] - P.sway * Math.max(0, stars[i - 1][1]) * 0.12, stars[i - 1][1]), p, 0.1);
    R.dot(p, GOLD, 0.7 + (i % 2) * 0.3);
  });
  R.limb(R.body(-4.6, 19.4), R.body(5 - P.sway * 2, 19.6), 0.8, 0.8, GOLD, 0.6);
  // the beard: one long tapering fall, swinging a beat behind him
  f.next();
  const chin = R.face(2.4, 3.2);
  R.limb(chin, R.body(3.4 - P.sway * 1.2, -5), 2.6, 2.2, BEARD);
  R.limb(R.body(3.4 - P.sway * 1.2, -5), R.body(3 - P.sway * 3, 2.5), 2.2, 0.5, BEARD);
  // head: a hooked nose, a white brow, eyes lost in shadow
  f.next();
  R.ball(J.head, 3.8, 4, SKIN, P.lean + P.head);
  R.limb(R.face(3.4, -0.4), R.face(5.6, 1.4), 1.1, 0.6, SKIN);
  R.limb(R.face(0.8, -1.8), R.face(4, -1.2 - P.mouth * 0.6), 0.9, 0.6, BEARD);
  R.dot(R.face(2.8, -0.2), P.b > 0.8 ? STAR : DARK, P.b > 0.8 ? 0.9 : 0.1);
  if (P.mouth > 0.5) R.limb(R.face(3, 2.6), R.face(3.6, 3.6), 0.8, 0.6, DARK);
  // the hat: a tall cone that folds over near the top, a star hanging from the tip
  f.next();
  R.limb(R.face(-5.4, -2.4), R.face(5.6, -3), 1.2, 1.1, ROBE, 0.7);
  const mid = R.face(-1.6, -11), tip = R.at(mid, -150 - P.sway * 24, 6.5);
  R.limb(R.face(-0.2, -3.4), mid, 3.8, 1.8, ROBE);
  R.limb(mid, tip, 1.8, 0.6, ROBE);
  R.limb(R.face(-3.6, -3.6), R.face(3.6, -4), 0.8, 0.8, GOLD, 0.6);
  R.dot(R.face(0.4, -7), GOLD, 0.9);
  R.stroke(tip, [tip[0], tip[1] + 3 * k], GOLD, 0.6);
  R.dot([tip[0], tip[1] + 4 * k], STAR, 0.5 + P.b * 0.5);
  // the staff and its armillary: two rings round a point of light
  f.next();
  const top = R.at(J.handN, P.a, 24), foot = R.at(J.handN, P.a + 180, 14);
  R.limb(foot, top, 0.8, 0.7, GOLD);
  const orb = R.at(top, P.a, 4);
  R.ball(orb, 4, 4, GOLD, 0, 0.5);
  f.disc(orb[0], orb[1], 2.9 * k, DARK, 0.3);
  R.limb(R.at(orb, 20, 3.6), R.at(orb, 200, 3.6), 0.5, 0.5, GOLD, 0.5);
  f.disc(orb[0], orb[1], (0.9 + P.b * 0.9) * k, STAR, 0.4 + P.b * 0.6);
  sleeve(J.shN, J.elN, J.handN, P.an2);
  return { f, head: J.head };
}

const draw = (P: Pose) => starreader(P).f.resolve({ rim: RIM, contour: 0.1 });

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.6, head: -6 + wave(t, 0.2) * 3, a: -84 + wave(t, 0.1) * 2, sway: wave(t, 0.3) * 0.5, b: 0.5 + wave(t * 2) * 0.2 });
const cast = (t: number): Pose => pose(BASE, { lean: 2 + wave(t) * 2, head: -16 + wave(t, 0.2) * 3, an1: -70 + wave(t) * 6, an2: -84, a: -96 + wave(t, 0.15) * 8, af1: 20 + wave(t) * 8, af2: -30, mouth: 1, b: 1, oy: wave(t) * 1.2, sway: wave(t, 0.3) * 0.8 });
const nova = (t: number): Pose => pose(BASE, { lean: -8 + wave(t) * 2, head: -26, an1: -110 + wave(t) * 4, an2: -96, af1: -64 - wave(t) * 4, af2: -88, a: -90, mouth: 1, b: 1, oy: wave(t * 2) * 1.4, sway: wave(t * 2) * 1 });
/** His stars gone out: sat on the floor, hat over his eyes, the staff across his knees. */
const stun = (t: number): Pose => pose(BASE, { lean: -4 + wave(t) * 3, head: 34 + wave(t, 0.2) * 5, an1: 70, an2: 20, af1: 80, af2: 30, a: 10, oy: 9, b: 0, sway: 1 });

export function buildStarReaderSheet(): SheetBuilder {
  const C = STARREADER_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'cast', 8, cast, draw);
  bake(b, 'nova', 6, nova, draw);
  bake(b, 'stun', 6, stun, draw);
  return b;
}

export function starreaderPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => starreader(pose(BASE, { lean: 4, mouth: angry ? 1 : 0, head: angry ? -12 : -2, b: angry ? 1 : 0.4, an1: 100, an2: 100, af1: 100, af2: 100, a: 90 }), cell, 3.6), RIM, -6);
}

/** 48x48, centered: `planet0..2` (lit, stopped), `lens` (bright x2, dark, cracked). */
export function buildOrreryProps(): SheetBuilder {
  const b = new SheetBuilder(48, 48, 24, 24);
  const WORLDS = [ramp('#3a1408', '#8a3418', '#d0703a', '#f4b880'), ramp('#0a2a24', '#1c6450', '#48a884', '#a0e4c4'), ramp('#2a1a44', '#5a3c8c', '#9470c8', '#d0b8f0')];
  const ICE = ramp('#283848', '#587088', '#98b0c4', '#e0ecf4');
  WORLDS.forEach((w, i) => {
    const planet = (stopped: boolean) => {
      const f = new FormCanvas(48, 48), r = 9 + i * 1.5;
      if (i === 2) f.limb(6, 28, 42, 20, 1.6, 1.6, stopped ? ICE : GOLD, 0.5); // a ringed world
      f.next();
      f.ball(24, 24, r, r, stopped ? ICE : w);
      for (let s = 0; s < 3; s++) f.groove(24 - r, 20 + s * 4, 24 + r, 18 + s * 4, s % 2 ? 0.12 : -0.14);
      f.next();
      f.limb(24 - r - 3, 24, 24 + r + 3, 24, 0.8, 0.8, GOLD, 0.5); // the brass arm that carries it
      return f.resolve({ rim: RIM });
    };
    b.add(`planet${i}`, planet(false), planet(true));
  });
  const lens = (lit: number, cracked = false) => {
    const f = new FormCanvas(48, 48);
    f.ball(24, 24, 15, 15, GOLD, 0, 0.5);
    f.next();
    f.ball(24, 24, 11, 11, lit > 0 ? STAR : ROBE, 0, 0.7);
    if (lit > 0) f.disc(24, 24, 5 + lit * 3, STAR, 0.6 + lit * 0.4);
    if (cracked) for (const [x, y] of [[16, 18], [30, 16], [33, 31], [18, 32]]) f.groove(24, 24, x, y, 0.4);
    return f.resolve({ rim: RIM });
  };
  b.add('lens', lens(0.5), lens(1), lens(0), lens(0, true));
  return b;
}

/** The orrery's brass tracks (336x336, centered): three orbits and the spokes that hold them. */
export function buildOrbits(): SheetBuilder {
  const b = new SheetBuilder(336, 336, 168, 168), p = new PixelCanvas(336, 336);
  const brass = hex('#5c3c14'), dim = hex('#3a2610');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    p.line(168, 168, 168 + Math.cos(a) * 160, 168 + Math.sin(a) * 160, dim);
  }
  for (const r of [60, 105, 150])
    for (let s = 0; s < 720; s++) {
      const a = (s / 720) * Math.PI * 2;
      p.set(168 + Math.cos(a) * r, 168 + Math.sin(a) * r, brass);
      if (s % 30 === 0) p.set(168 + Math.cos(a) * (r + 1), 168 + Math.sin(a) * (r + 1), hex('#aa7a28'));
    }
  b.add('orbits', p);
  return b;
}
