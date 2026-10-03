// The Bell-Mother, redrawn as a jointed puppet (0.20.0).
//
// She is not drawn frame by frame. She has a skeleton (spine, neck, two arms, two bird legs,
// and two wings of three bones each) and a `Pose` that says where every joint is. `harpy()`
// draws one pose with the form-shading tools in form.ts; the animations at the bottom are
// just poses computed from a clock, so a wing beat can have as many in-betweens as we like
// and everything that hangs off her (hair, tail, legs, feather tips) lags behind the motion.
// Everything faces right.
import { SheetBuilder, hex } from './pixel';
import { FormCanvas, ramp, Ramp } from './form';
import { hash2 } from '../core/util';

export const BM_CELL = { w: 192, h: 152, ax: 96, ay: 80 };
const DEG = Math.PI / 180;
/** Her body is drawn in small units; this is how many pixels one of them is. */
const K = 1.3;
type V = [number, number];

// Each material, deep shadow to highlight. Shadows lean toward violet, lights toward warm.
const SKIN = ramp('#3e2c50', '#6a5480', '#9a84a8', '#c2aec8', '#e2d2e2', '#f8f0f4');
const PLUME = ramp('#0c0816', '#181026', '#261c3a', '#382c52', '#504270', '#7466a0'); // body feathers
const FLIGHT = ramp('#0c0814', '#181024', '#261c3a', '#3a2e54', '#544874', '#766a98'); // wing feathers
const ASH = ramp('#2a2434', '#4a4258', '#787088', '#a8a0b0', '#d4ccd4'); // the pale tips of her feathers
const HAIR = ramp('#0c0816', '#1a1228', '#2c2040', '#4a3a62', '#7a68a0');
const SCALE = ramp('#2a1e1c', '#4e3c2c', '#7e6840', '#aa9460', '#d6c490'); // shins and toes
const BONE = ramp('#3a3040', '#6e6470', '#a8a090', '#d8d0b8', '#f6f2e6'); // claws and talons
const BRONZE = ramp('#2e180c', '#603814', '#a06a28', '#d8a650', '#fff0b0');
const DARK = ramp('#08040a', '#1a0a14', '#5a1626'); // eye socket, mouth
const GOLD = ramp('#a06810', '#f0c030', '#fff4a0'); // her eyes

interface Wing {
  /** +1 reaches to screen right, -1 to screen left. */
  dir: number;
  /** Bone angles in degrees from the horizontal, pointing outward: upper arm, forearm, hand. Negative is up. */
  a1: number;
  a2: number;
  a3: number;
  /** How far the feathers are blown off their rest angle (degrees; positive = dragged upward). */
  bend: number;
}

export interface Pose {
  near: Wing;
  far: Wing;
  /** Body pitch in degrees (positive leans her forward) and where her chest sits in the cell. */
  lean: number;
  ox: number;
  oy: number;
  /** Arm angles in the body's frame, degrees: 0 = straight ahead, 90 = down. [upper arm, forearm]. */
  armN: [number, number];
  armF: [number, number];
  /** Legs: thigh and shin angles (same convention), and how open the talons are (0 curled, 1 spread). */
  legs: [number, number];
  toes: number;
  /** Head tilt in degrees (negative = thrown back), jaw 0..1, eyes open. */
  head: number;
  mouth: number;
  eyes: boolean;
  /** Chest swell 0..1 and how far hair, tail and bell hang off true (-1..1). */
  breath: number;
  sway: number;
  /** Nothing is drawn below this cell row (the floor she lies on). */
  floor?: number;
}

const lerp = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** One feather: a flat blade from `base`, `len` long, darker at the root and ash-pale at the tip. */
function feather(f: FormCanvas, base: V, ang: number, len: number, wide: number, r: Ramp, tip = 0.14) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const end: V = [base[0] + dx * len, base[1] + dy * len];
  f.next();
  f.limb(base[0], base[1], end[0], end[1], wide * 0.6, wide, r, 0.6, (t) => -0.42 + t * 0.3);
  if (tip > 0) {
    const from = lerp(base, end, 1 - tip);
    f.limb(from[0], from[1], end[0], end[1], wide * 0.95, wide, ASH, 0.6, () => -0.3);
  }
  f.groove(base[0], base[1], end[0], end[1], 0.12); // the shaft catches a little light
}

/**
 * A wing: three bones from the shoulder, flight feathers hanging from them (short at the body,
 * longest on the hand), a row of coverts over their roots, then the arm of the wing itself.
 */
function wing(f: FormCanvas, root: V, w: Wing, size: number, seed: number) {
  const seg = (p: V, a: number, len: number): V => [p[0] + w.dir * Math.cos(a * DEG) * len * size, p[1] + Math.sin(a * DEG) * len * size];
  const E = seg(root, w.a1, 14), W = seg(E, w.a2, 15), T = seg(W, w.a3, 13);
  // a feather's direction: `off` degrees round from its bone toward the trailing edge
  const dir = (bone: number, off: number, along: number) => {
    const a = (bone + off - w.bend * (0.35 + 0.65 * along)) * DEG;
    return Math.atan2(Math.sin(a), w.dir * Math.cos(a));
  };
  interface F { base: V; ang: number; len: number; wide: number }
  const flight: F[] = [], coverts: F[] = [];
  const row = (a: V, b: V, bone: number, n: number, off0: number, off1: number, len0: number, len1: number, at0: number, at1: number) => {
    for (let k = 0; k < n; k++) {
      const s = (k + 0.5) / n, along = at0 + (at1 - at0) * s;
      const ragged = hash2(k, n, seed);
      if (ragged < 0.08 && along < 0.9) continue; // a feather long since lost
      const base = lerp(a, b, s);
      const ang = dir(bone, off0 + (off1 - off0) * s, along);
      const len = (len0 + (len1 - len0) * Math.sin(s * Math.PI * 0.5)) * (0.86 + hash2(k, seed, n) * 0.24) * size;
      flight.push({ base, ang, len, wide: (2.3 + along * 0.5) * size });
      coverts.push({ base, ang, len: len * 0.42, wide: 2.1 * size });
    }
  };
  row(root, E, w.a1, 4, 112, 100, 11, 16, 0, 0.25); // tertials, at the body
  row(E, W, w.a2, 7, 98, 82, 17, 22, 0.25, 0.6); // secondaries
  row(W, T, w.a3, 8, 76, 14, 23, 31, 0.6, 1); // primaries, fanning round to the tip
  // outermost first, so each feather tucks under its inner neighbor
  for (let i = flight.length - 1; i >= 0; i--) {
    const q = flight[i];
    feather(f, q.base, q.ang, q.len, q.wide, FLIGHT);
  }
  // the arm of the wing: feathered, thick at the shoulder, a bone claw at the wrist
  f.next();
  const dark = () => -0.2;
  f.limb(root[0], root[1], E[0], E[1], 3.6 * size, 3 * size, PLUME, 1, dark);
  f.limb(E[0], E[1], W[0], W[1], 3 * size, 2.4 * size, PLUME, 1, dark);
  f.limb(W[0], W[1], T[0], T[1], 2.4 * size, 1.2 * size, PLUME, 1, dark);
  const claw = seg(W, w.a2 - 70, 5);
  f.stroke(W[0], W[1], claw[0], claw[1], BONE, 0.8);
  // two rows of coverts lap over the arm and the roots of the flight feathers
  for (const [part, lift] of [[1, 0], [0.5, 0.16]]) {
    for (let i = coverts.length - 1; i >= 0; i--) {
      const q = coverts[i];
      f.bias += lift;
      feather(f, q.base, q.ang, q.len * part, q.wide, PLUME, 0);
      f.bias -= lift;
    }
  }
}

/** Draw her in one pose. */
export function harpy(P: Pose): FormCanvas {
  const f = new FormCanvas(BM_CELL.w, BM_CELL.h);
  if (P.floor !== undefined) f.clipY = P.floor;
  const lean = P.lean * DEG, cl = Math.cos(lean), sl = Math.sin(lean);
  // body space (origin mid-chest, x forward, y down) to the cell
  const B = (x: number, y: number): V => [BM_CELL.ax + P.ox + (x * cl - y * sl) * K, BM_CELL.ay + P.oy + (x * sl + y * cl) * K];
  // a point `len` from `p` along a body-space angle (degrees)
  const reach = (p: V, a: number, len: number): V => [p[0] + Math.cos(a * DEG + lean) * len * K, p[1] + Math.sin(a * DEG + lean) * len * K];
  const limb = (a: V, b: V, r0: number, r1: number, r: Ramp, flat = 1) => f.limb(a[0], a[1], b[0], b[1], r0 * K, r1 * K, r, flat);
  const ball = (x: number, y: number, rx: number, ry: number, r: Ramp, flat = 1) => {
    const c = B(x, y);
    f.ball(c[0], c[1], rx * K, ry * K, r, lean, flat);
  };
  const sway = P.sway, swell = P.breath;

  // ── wings, behind everything: the far one first and dimmer
  f.bias = -0.16;
  wing(f, B(4, -11), P.far, 0.92, 11);
  f.bias = 0;
  wing(f, B(-4.5, -10.5), P.near, 1, 5);

  // ── tail: a fan of long feathers behind her hips
  for (let k = 0; k < 5; k++) {
    const a = (118 + k * 11 + sway * 9) * DEG + lean;
    feather(f, B(-3, 9), a, (15 + (k % 2) * 3 + (k === 2 ? 3 : 0)) * K, 2.6, FLIGHT);
  }

  // ── a leg: plumed thigh, bare scaled shin, four hooked toes
  const leg = (hip: V, dim: number, fwd: number) => {
    f.bias = dim;
    const hock = reach(hip, P.legs[0] - fwd, 11), ankle = reach(hock, P.legs[1] - fwd * 0.5, 10);
    f.next();
    f.bias = dim - 0.2;
    limb(hip, hock, 4.6, 2.2, PLUME);
    f.bias = dim;
    // ragged plumes at the hock
    for (let k = 0; k < 3; k++) {
      const q = reach(hock, P.legs[0] + 150 + k * 30, 2);
      f.stroke(hock[0], hock[1], q[0], q[1], PLUME, 0.3 + dim, 2);
    }
    f.next();
    limb(hock, ankle, 1.7, 1.4, SCALE);
    const open = P.toes;
    for (const [off, len] of [[-34, 5], [0, 6], [34, 5], [165, 3]] as V[]) {
      const a = P.legs[1] - 55 + off * (0.5 + open * 0.5);
      const knuckle = reach(ankle, a, len), tip = reach(knuckle, a + 70 - open * 30, 2.6);
      f.stroke(ankle[0], ankle[1], knuckle[0], knuckle[1], SCALE, 0.5 + dim, 1.8);
      f.stroke(knuckle[0], knuckle[1], tip[0], tip[1], BONE, 0.85 + dim);
    }
    f.bias = 0;
  };
  // ── an arm: gaunt, with a clawed hand
  const arm = (sh: V, a: [number, number], dim: number) => {
    f.bias = dim;
    const el = reach(sh, a[0], 9), hand = reach(el, a[1], 9);
    f.next();
    limb(sh, el, 2.3, 1.8, SKIN);
    limb(el, hand, 1.8, 1.4, SKIN);
    f.ball(hand[0], hand[1], 1.7 * K, 1.7 * K, SKIN);
    for (const off of [-34, 0, 34]) {
      const tip = reach(hand, a[1] + off, 4.5);
      f.stroke(hand[0], hand[1], tip[0], tip[1], BONE, 0.9 + dim);
    }
    f.bias = 0;
  };

  leg(B(3, 9), -0.2, 10);
  arm(B(5, -11), P.armF, -0.14);

  // ── hair down her back, in heavy locks that trail behind the motion
  f.next();
  for (let k = 0; k < 4; k++) {
    const top = B(1 - k * 0.8, -25 + k), mid = B(-4 - k - sway * 2, -15 + k * 2), end = B(-5 - k * 1.2 - sway * 5, -3 + k * 3 - Math.abs(sway));
    limb(top, mid, 2.6, 2.2, HAIR);
    limb(mid, end, 2.2, 0.8, HAIR);
  }

  // ── torso: ribcage, a narrow waist, the swell of the belly
  f.next();
  ball(1, -7, 6 + swell * 0.6, 7.2, SKIN);
  limb(B(0.6, -3), B(0.2, 6), 4.6, 4.9, SKIN);
  limb(B(1.5, -13), B(3, -18.5), 2.4, 2, SKIN); // neck
  // collarbones, the hollow of the throat, ribs under the skin
  f.groove(...B(-2, -12), ...B(3, -12.6), 0.14);
  f.groove(...B(4, -12.6), ...B(6.5, -11.8), 0.14);
  f.groove(...B(3.4, -13.6), ...B(3.8, -15.5), -0.16);
  for (let k = 0; k < 3; k++) f.groove(...B(1.5, 0.5 + k * 1.8), ...B(5, k * 1.8), -0.14);

  // ── a bodice of small feathers over her breast (far side first), ragged along its lower edge
  f.next();
  f.bias = -0.14;
  ball(5.6, -6.6 - swell * 0.5, 3.1, 3.3, PLUME);
  ball(2.2, -6 - swell * 0.5, 3.9 + swell * 0.4, 3.7, PLUME);
  ball(-2.6, -6.5, 3.2, 4.2, PLUME);
  f.bias = 0;
  for (let k = 0; k < 6; k++) {
    const b = B(-4 + k * 2, -3.4 + (k % 2) * 0.6);
    f.stroke(b[0], b[1], b[0] - sl * 2.6, b[1] + cl * 2.6, PLUME, k % 2 ? 0.34 : 0.5, 1.6);
  }
  f.groove(...B(4.2, -8.5), ...B(4, -4.5), -0.2); // the cleft between
  // ── a skirt of plumage from the hips: rows of small feathers, ragged at the hem
  f.next();
  f.bias = -0.24;
  ball(-0.2, 9, 6.6, 4.8, PLUME);
  f.bias = 0;
  for (let row = 0; row < 2; row++)
    for (let k = 0; k < 6; k++) {
      const b = B(-4.6 + k * 1.9 + row * 0.9, 6.6 + row * 2.6);
      f.groove(b[0], b[1], b[0] - sl * 2, b[1] + cl * 2, k % 2 ? 0.2 : -0.16);
    }
  for (let k = 0; k < 7; k++) {
    const b = B(-5.6 + k * 1.9, 11), a = (96 + (k - 3) * 9 + sway * 6) * DEG + lean, len = (4 + ((k * 5) % 4)) * K;
    f.stroke(b[0], b[1], b[0] + Math.cos(a) * len, b[1] + Math.sin(a) * len, k % 2 ? PLUME : FLIGHT, k % 2 ? 0.42 : 0.3, 2.2);
  }

  leg(B(-1.8, 9.5), 0, 0);

  // ── the bronze bell on a chain at her throat
  f.next();
  const bell = B(3.4 + sway * 1.2, -9.6);
  f.stroke(...B(1.4, -14), bell[0], bell[1] - 3, BRONZE, 0.55);
  f.stroke(...B(5, -14.4), bell[0], bell[1] - 3, BRONZE, 0.55);
  f.ball(bell[0], bell[1], 2.3, 2.6, BRONZE);
  f.stroke(bell[0] - 2.6, bell[1] + 2.4, bell[0] + 2.6, bell[1] + 2.4, BRONZE, 0.45);
  f.dot(bell[0], bell[1] + 3.4, BRONZE, 0.15);

  // ── head: it turns about the top of the neck
  const tilt = P.head * DEG, ct = Math.cos(tilt), st = Math.sin(tilt);
  const H = (x: number, y: number): V => B(3 + x * ct - y * st, -18.5 + x * st + y * ct); // head space: origin at the neck
  const hrot = lean + tilt;
  // a crest of feathers rising behind her head
  for (let k = 0; k < 5; k++) {
    const a = (-152 + k * 17 + sway * 6) * DEG + hrot;
    feather(f, H(-1.5, -6), a, (10 + (k % 2) * 3 + (k === 2 ? 2 : 0)) * K, 1.9, FLIGHT, 0.1);
  }
  f.next();
  { const c = H(-0.6, -5.4); f.ball(c[0], c[1], 5.6 * K, 5.2 * K, HAIR, hrot); } // the mass of her hair
  f.next();
  { const c = H(2.6, -4.6); f.ball(c[0], c[1], 3.7 * K, 4.5 * K, SKIN, hrot); } // face
  { const c = H(3.6, -1.6 + P.mouth * 1.2); f.ball(c[0], c[1], 2.6 * K, 2.1 * K, SKIN, hrot); } // jaw
  f.dot(...H(6.4, -3.8), SKIN, 0.7); // nose
  // a deep-set eye, gold when open
  f.dot(...H(3.6, -5.2), DARK, 0.1);
  f.dot(...H(4.6, -5.2), P.eyes ? GOLD : DARK, P.eyes ? 0.6 : 0.1);
  f.groove(...H(2.8, -6.4), ...H(5.6, -6), -0.22); // brow
  f.groove(...H(2.4, -2.8), ...H(3.4, -1.6), -0.14); // hollow cheek
  // dark lips; open, a red mouth with fangs
  if (P.mouth > 0.3) {
    const m0 = H(4.2, -1.9), m1 = H(5.6, -1.9 + P.mouth * 2.2);
    f.stroke(m0[0], m0[1], m1[0], m1[1], DARK, 0.9, 2);
    f.dot(...H(5.2, -2.4), BONE, 0.95);
  } else f.stroke(...H(4.4, -1.9), ...H(5.8, -2), DARK, 0.5);
  // hair over the brow and a lock falling past her cheek
  f.next();
  f.stroke(...H(0.4, -9.4), ...H(4.8, -8.2), HAIR, 0.62, 2);
  f.stroke(...H(0.2, -7), ...H(0.6 - sway, 0.6), HAIR, 0.5, 2);
  f.stroke(...H(1.4, -8.6), ...H(4.4, -7.6), HAIR, 0.85);

  // ── near arm, and the tuft of feathers on her near shoulder
  arm(B(-4, -11), P.armN, 0);
  f.next();
  ball(-4.6, -11.6, 3.3, 3, PLUME);
  for (let k = 0; k < 3; k++) {
    const b = B(-6.4 + k * 1.8, -10);
    f.stroke(b[0], b[1], b[0] - sl * 3, b[1] + cl * 3, PLUME, k % 2 ? 0.55 : 0.4, 1.6);
  }
  return f;
}

// ---------------------------------------------------------------- the animations

const TAU = Math.PI * 2;

/** The wing beat at phase t (0..1): a hard stroke down with the wing spread, then it folds at the wrist and lifts. */
function beat(t: number, dir: number, high = 0, reach = 1): Wing {
  const stroke = Math.cos(t * TAU); // 1 = raised, -1 = down
  const vel = Math.sin(t * TAU); // > 0 on the way down
  const down = Math.max(0, vel), fold = Math.max(0, -vel);
  const a1 = -8 - high - stroke * 46 * reach;
  const a2 = a1 - down * 14 + fold * 38;
  const a3 = a2 - down * 14 + fold * 26;
  return { dir, a1, a2, a3, bend: vel * 13 };
}

/** Hovering: the wing beat, with her body riding it and everything loose trailing behind. */
function flyPose(t: number): Pose {
  const late = (d: number) => Math.sin((t - d) * TAU);
  return {
    near: beat(t, -1),
    far: beat(t - 0.04, 1),
    lean: 6 + late(0.1) * 2,
    ox: 0,
    oy: Math.cos((t - 0.1) * TAU) * 2.5,
    armN: [118 + late(0.2) * 5, 74 + late(0.3) * 8],
    armF: [18 + late(0.2) * 4, -48 + late(0.3) * 7],
    legs: [62 + late(0.25) * 7, 122 + late(0.35) * 9],
    toes: 0.35,
    head: late(0.15) * 3,
    mouth: 0,
    eyes: true,
    breath: 0.5 + late(0.5) * 0.5,
    sway: late(0.3),
  };
}

/** Singing, casting, tolling: arms flung up, head back, mouth wide, a higher and shallower beat. */
function castPose(t: number): Pose {
  const late = (d: number) => Math.sin((t - d) * TAU);
  return {
    near: beat(t, -1, 22, 0.6),
    far: beat(t - 0.04, 1, 22, 0.6),
    lean: -6 + late(0.1) * 1.5,
    ox: 0,
    oy: Math.cos((t - 0.1) * TAU) * 1.5,
    armN: [-132 + late(0.2) * 4, -84 + late(0.3) * 6],
    armF: [-42 + late(0.2) * 4, -76 + late(0.3) * 6],
    legs: [80 + late(0.25) * 5, 104 + late(0.35) * 7],
    toes: 0.8,
    head: -16 + late(0.2) * 3,
    mouth: 0.8 + late(0) * 0.2,
    eyes: true,
    breath: 0.5 + late(0) * 0.5,
    sway: late(0.3) * 0.7,
  };
}

/** The swoop: flat out, wings swept back and shivering in the wind, claws leading. */
function divePose(t: number): Pose {
  const shiver = Math.sin(t * TAU);
  return {
    near: { dir: -1, a1: -28 + shiver * 3, a2: -12 + shiver * 4, a3: -2 + shiver * 5, bend: 10 + shiver * 6 },
    far: { dir: -1, a1: -62 - shiver * 3, a2: -44 - shiver * 4, a3: -30 - shiver * 5, bend: 10 - shiver * 6 },
    lean: 60,
    ox: 0,
    oy: 0,
    armN: [-28, -52 + shiver * 4],
    armF: [-46, -68 - shiver * 4],
    legs: [96, 78 + shiver * 4],
    toes: 1,
    head: -44,
    mouth: 1,
    eyes: true,
    breath: 0.5,
    sway: 0.9 + shiver * 0.2,
  };
}

/** Her voice broken, falling: wings torn upward by the air, limbs loose. */
function fallPose(t: number): Pose {
  const shiver = Math.sin(t * TAU);
  return {
    near: { dir: -1, a1: -62 + shiver * 4, a2: -76 + shiver * 6, a3: -84 + shiver * 8, bend: -14 },
    far: { dir: 1, a1: -58 - shiver * 4, a2: -74 - shiver * 6, a3: -86 - shiver * 8, bend: -14 },
    lean: -24,
    ox: 0,
    oy: 0,
    armN: [-150 + shiver * 6, -110],
    armF: [-60 - shiver * 6, -88],
    legs: [40, 96 + shiver * 6],
    toes: 1,
    head: 14,
    mouth: 1,
    eyes: false,
    breath: 0.5,
    sway: -1,
  };
}

/** Stunned: slumped on the floor (22 px under her center), wings spilled out either side, heaving for breath. */
function stunPose(t: number): Pose {
  const b = Math.sin(t * TAU);
  return {
    near: { dir: -1, a1: 14 - b * 2, a2: 30 - b * 2, a3: 4, bend: -20 },
    far: { dir: 1, a1: 10 - b * 2, a2: 32 - b * 2, a3: 4, bend: -20 },
    lean: 26 + b * 2,
    ox: -2,
    oy: 5 + b * 0.8,
    armN: [100, 62],
    armF: [70, 96],
    legs: [8, 172],
    toes: 0.2,
    head: 30 - b * 3,
    mouth: 0.5 + b * 0.3,
    eyes: false,
    breath: 0.5 + b * 0.5,
    sway: 0.2,
    floor: BM_CELL.ay + 21,
  };
}

const RIM = hex('#8aa0e0'); // moonlight from behind

export function buildBellMotherSheet(): SheetBuilder {
  const b = new SheetBuilder(BM_CELL.w, BM_CELL.h, BM_CELL.ax, BM_CELL.ay);
  const cycle = (pose: (t: number) => Pose, n: number) => Array.from({ length: n }, (_, i) => harpy(pose(i / n)).resolve({ rim: RIM }));
  b.add('fly', ...cycle(flyPose, 12));
  b.add('cast', ...cycle(castPose, 12));
  b.add('dive', ...cycle(divePose, 4));
  b.add('fall', ...cycle(fallPose, 4));
  b.add('stunned', ...cycle(stunPose, 8));
  return b;
}
