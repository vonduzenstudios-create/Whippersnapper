// The Censer Saint: a gaunt priest in ash-white vestments and a tall mitre, eyes bound, embers
// glowing in his collar. His censer and its chain are drawn by the game; here he only holds it.
// Puppet channel `b` = how hot the embers at his throat burn (0..1).
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Rig, Build, Cell, Pose, STAND, V, bake, wave, pose, bust } from './puppet';

export const SAINT_CELL: Cell = { w: 152, h: 152, ax: 76, ay: 142 };
const BUILD: Build = { k: 1.5, torso: 12.5, hipR: 3.8, chestR: 4.6, neck: 2.6, headR: 3.9, arm: [9, 9, 2.6, 2.2], leg: [10, 10, 2, 1.6], foot: 3, shoulder: 1.4, hipW: 1 };

const ROBE = ramp('#2a2634', '#544e60', '#8a8490', '#b8b2b4', '#dcd6d0', '#f6f2e8');
const STOLE = ramp('#24060c', '#4e0c16', '#841822', '#b43030', '#dc6048');
const GOLD = ramp('#3a2008', '#7a4c10', '#b88424', '#e4bc50', '#fff0a8');
const SKIN = ramp('#2e2a38', '#565064', '#847c8a', '#aaa2a8', '#ccc4c0');
const DARK = ramp('#06040a', '#16101a', '#2a2030');
const EMBER = ramp('#7a1c08', '#e85a10', '#ffb030', '#fff4b0');
const RIM = hex('#e09060');

const BASE: Pose = pose(STAND, { an1: 70, an2: 30, af1: 96, af2: 70, b: 0.4 });

export function saint(P: Pose, cell: Cell = SAINT_CELL, k = BUILD.k): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, { ...BUILD, k }, cell), J = R.J;
  /** A wide sleeve that hangs open at the wrist, and a thin grey hand. */
  const sleeve = (sh: V, el: V, hand: V, fore: number) => {
    f.next();
    R.limb(sh, el, 2.8, 3, ROBE);
    R.limb(el, hand, 3, 3.9, ROBE, 0.9);
    const cuff = R.at(hand, fore + P.lean + 90, 3.4 + P.sway);
    R.limb(hand, cuff, 2.6, 1.2, ROBE, 0.8, () => -0.14);
    R.limb(hand, R.at(hand, fore + P.lean, 0.5), 3.6, 3.6, GOLD, 0.6);
    f.next();
    R.limb(hand, R.at(hand, fore + P.lean, 3), 1.3, 1, SKIN);
  };
  R.dim(-0.16, () => sleeve(J.shF, J.elF, J.handF, P.af2));
  // the vestment: one long fall of cloth to the floor, then the chasuble over the chest
  R.robe(ROBE, 21, 7.5, 4.4, 6);
  R.torso(ROBE, SKIN);
  f.next();
  R.limb(R.body(0.8, -11.5), R.body(0.4 - P.sway * 1.6, 9), 1.9, 2.3, STOLE, 0.7); // the stole down his front
  for (let i = 0; i < 3; i++) R.dot(R.body(0.6 - P.sway * (i * 0.4), -4 + i * 5), GOLD, 0.9);
  R.limb(R.body(-0.4, 9.2), R.body(1.6 - P.sway * 1.6, 9.4), 1.2, 1.2, GOLD, 0.7);
  f.next();
  R.limb(R.body(-3.8, -11), R.body(4.4, -11.4), 1.7, 1.7, GOLD); // a collar of gold
  for (let i = 0; i < 4; i++) R.dot(R.body(-2.4 + i * 1.9, -11.2), EMBER, 0.3 + P.b * 0.7 - (i % 2) * 0.2);
  // head: hollow cheeks, bound eyes, an open black mouth when he chants
  f.next();
  R.ball(J.head, 3.6, 4.2, SKIN, P.lean + P.head);
  R.ball(R.face(2, 2.6 + P.mouth * 0.9), 2, 1.9, SKIN);
  R.limb(R.face(-3.4, -0.9), R.face(3.9, -0.5), 1.1, 1.1, DARK);
  R.dot(R.face(2.6, -0.6), EMBER, 0.2 + P.b * 0.6);
  R.dot(R.face(4.4, 0.8), SKIN, 0.75);
  if (P.mouth > 0.4) R.limb(R.face(2.8, 2.6), R.face(3.4, 2.8 + P.mouth * 1.4), 0.9, 0.8, DARK);
  else R.stroke(R.face(2.4, 2.8), R.face(3.8, 2.9), DARK, 0.3);
  R.groove(R.face(0.6, 0.8), R.face(1.8, 3.4), -0.2);
  // the mitre: two tall leaves of white and gold, lappets trailing behind
  f.next();
  for (const s of [0, 1]) R.limb(R.face(-2.6, -2), R.face(-5.4 - P.sway * 2.4 - s, 5 + s * 2.4), 0.9, 0.6, STOLE);
  f.next();
  R.limb(R.face(-0.4, -3), R.face(0.2, -12.5), 4.2, 0.9, ROBE, 0.8);
  R.limb(R.face(-3.6, -3.2), R.face(3.8, -2.8), 1.2, 1.2, GOLD);
  R.limb(R.face(0, -4), R.face(0.2, -11), 0.7, 0.4, GOLD, 0.6);
  R.dot(R.face(0.1, -7.5), EMBER, 0.5 + P.b * 0.5);
  sleeve(J.shN, J.elN, J.handN, P.an2);
  return { f, head: J.head };
}

const draw = (P: Pose) => saint(P).f.resolve({ rim: RIM, contour: 0.1 });

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.7, head: wave(t, 0.2) * 3, an2: 30 + wave(t, 0.15) * 4, af2: 70 + wave(t, 0.3) * 4, sway: wave(t, 0.3) * 0.35, b: 0.4 + wave(t) * 0.2 });
const walk = (t: number): Pose => pose(BASE, { lean: 5 + wave(t) * 1.5, oy: Math.abs(wave(t)) * -1.6, head: -2 + wave(t, 0.2) * 3, an1: 64 + wave(t) * 6, af1: 100 - wave(t) * 6, sway: 0.5 + wave(t * 2, 0.2) * 0.5, b: 0.6 });
const cast = (t: number): Pose => pose(BASE, { lean: -7 + wave(t) * 1.5, head: -18 + wave(t, 0.2) * 3, an1: -128 + wave(t) * 5, an2: -86 + wave(t, 0.2) * 7, af1: -48 + wave(t) * 5, af2: -80 + wave(t, 0.2) * 7, mouth: 0.8 + wave(t) * 0.2, breath: 1, oy: wave(t) * 1.2, sway: wave(t, 0.3) * 0.6, b: 1 });
/** The near arm goes round once (the game picks the frame that matches the censer's angle). */
const swing = (t: number): Pose => pose(BASE, { an1: t * 360 - 90, an2: t * 360 - 78, lean: Math.cos(t * Math.PI * 2) * 5, head: -6, mouth: 1, af1: 120, af2: 100, b: 0.8, sway: Math.sin(t * Math.PI * 2) * 0.6 });
const stun = (t: number): Pose => pose(BASE, { lean: 46 + wave(t) * 5, head: 26 + wave(t * 2) * 8, an1: 40, an2: -50 + wave(t * 2) * 6, af1: 30, af2: -60, mouth: 1, oy: 3, b: 0, sway: -0.4 });

export function buildSaintSheet(): SheetBuilder {
  const C = SAINT_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'cast', 8, cast, draw);
  bake(b, 'swing', 12, swing, draw);
  bake(b, 'stun', 8, stun, draw);
  return b;
}

export function saintPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => saint(pose(BASE, { mouth: angry ? 1 : 0, head: angry ? -8 : 0, an1: 100, an2: 100, af1: 100, af2: 100, b: angry ? 1 : 0.3 }), cell, 3.6), RIM, -8);
}

/** 48x48, centered: `lit` (4 frames, the coals pulsing), `out` (cold, a thread of smoke). */
export function buildSaintProps(): SheetBuilder {
  const b = new SheetBuilder(48, 48, 24, 26);
  const censer = (heat: number) => {
    const f = new FormCanvas(48, 48);
    f.limb(24, 2, 24, 12, 1, 1, GOLD);
    f.limb(18, 13, 30, 13, 2, 2, GOLD, 0.8);
    f.ball(24, 26, 11, 12, GOLD);
    f.limb(18, 38, 30, 38, 2.4, 2.4, GOLD, 0.8);
    f.next();
    // pierced slots: the fire inside shows through
    for (let i = 0; i < 5; i++) {
      const x = 16 + i * 4;
      if (heat >= 0) f.limb(x, 21 + (i % 2) * 2, x, 30 - (i % 2) * 2, 1.2, 1.2, EMBER, 0.5, () => heat * 0.4 - (i % 2) * 0.12);
      else f.limb(x, 21 + (i % 2) * 2, x, 30 - (i % 2) * 2, 1.2, 1.2, DARK, 0.5);
    }
    return f.resolve({ rim: RIM });
  };
  b.add('lit', censer(0.2), censer(0.6), censer(1), censer(0.6));
  b.add('out', censer(-1));
  return b;
}

/** The chapel's rose window (144x144, centered), dim behind the smoke. */
export function buildRoseWindow(): SheetBuilder {
  const b = new SheetBuilder(144, 144, 72, 72), p = new PixelCanvas(144, 144);
  p.circle(72, 72, 70, hex('#16101c'));
  const glass = ['#5a1420', '#6a4410', '#1c3458', '#3a1c50', '#14403a'];
  for (let ring = 0; ring < 3; ring++)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + ring * 0.26, r = 20 + ring * 19;
      p.ellipse(72 + Math.cos(a) * r, 72 + Math.sin(a) * r, 7 - ring * 0.5, 7 - ring * 0.5, hex(glass[(i + ring * 2) % glass.length]));
    }
  p.circle(72, 72, 11, hex('#7a5a18'));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    p.line(72 + Math.cos(a) * 12, 72 + Math.sin(a) * 12, 72 + Math.cos(a) * 68, 72 + Math.sin(a) * 68, hex('#16101c'), 2);
  }
  b.add('rose', p);
  return b;
}
