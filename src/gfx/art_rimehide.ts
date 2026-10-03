// Old Rimehide, redrawn as a jointed puppet (0.27.0) in the Bell-Mother's style: a skeleton
// (hips, a leaning torso, a head, two arms of two bones, two legs solved from where the feet
// stand) and a `Pose` for it. `rimehide()` draws one pose with the form-shading tools; every
// animation below is a pose computed from a clock, so each has as many in-betweens as we like.
// He can hold a weapon in his near fist (a pillar of ice, or a mammoth's tusk): the armed
// animations are the same puppet with `club` set. Everything faces right.
import { SheetBuilder, hex } from './pixel';
import { FormCanvas, ramp, Ramp, V } from './form';
import { hash2 } from '../core/util';

export const RH_CELL = { w: 176, h: 144, ax: 88, ay: 140 };
const GY = RH_CELL.ay; // the ground row
const DEG = Math.PI / 180, TAU = Math.PI * 2;

const FUR = ramp('#3c4a70', '#62749a', '#8ea2c4', '#b8c6de', '#dde6f4', '#ffffff');
const FACE = ramp('#121a34', '#22325c', '#3a548c', '#5c7cb4', '#88a8d8');
const HORN = ramp('#1e1814', '#3e342a', '#6a5a48', '#988468', '#c8b690');
const ICE = ramp('#2a5a8c', '#4e8cc4', '#84c4ee', '#bce8ff', '#f0fcff');
const CLAW = ramp('#0c0e18', '#2a2e3c', '#565c70');
const MAW = ramp('#16040a', '#4a0c16', '#8a1c24');
const TUSK = ramp('#4a3c34', '#86745c', '#b8a888', '#e0d6b8', '#fbf6e4');
const EYE = ramp('#a02008', '#ff5a30', '#ffd080');
const SNOW = ramp('#7088b0', '#a0b4d4', '#c8d6ea', '#e8f0fa', '#ffffff');
const MEAT = ramp('#2a1018', '#5a1c26', '#8a3038', '#b85a58', '#d8948a');
const ROCK = ramp('#14161e', '#2a2e3c', '#444a5c', '#666e84', '#8c96ac');
const GLOW = ramp('#c03a10', '#ff8a30', '#ffe080', '#ffffff');

export type Weapon = '' | 'ice' | 'tusk';

export interface Pose {
  /** Where the hips are, off their rest place (oy > 0 = lower), and the torso's pitch in degrees (positive = forward). */
  ox: number;
  oy: number;
  lean: number;
  /** Each foot: x from the middle of the cell, and how high it is lifted. */
  footN: V;
  footF: V;
  /** Each arm: upper arm and forearm, screen angles in degrees (0 = ahead, 90 = down, -90 = up). */
  armN: V;
  armF: V;
  /** Head tilt in degrees (negative = thrown back), jaw 0..1, and how far the fur is blown off true (-1..1). */
  head: number;
  jaw: number;
  sway: number;
  /** The weapon's angle in his near fist, if he holds one. */
  club?: number;
  /** A snow boulder of this radius held up between his fists. */
  ball?: number;
  /** Nothing is drawn below this row (the ice he has fallen through). */
  clip?: number;
}

const at = (p: V, a: number, len: number): V => [p[0] + Math.cos(a * DEG) * len, p[1] + Math.sin(a * DEG) * len];
const mixn = (a: number, b: number, t: number) => a + (b - a) * t;
const mixv = (a: V, b: V, t: number): V => [mixn(a[0], b[0], t), mixn(a[1], b[1], t)];
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Where the knee is, given the hip, the foot and the two bone lengths (it bends forward). */
function knee(hip: V, foot: V, l1: number, l2: number): V {
  const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
  const d = Math.min(l1 + l2 - 0.5, Math.max(4, Math.hypot(dx, dy)));
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx);
  return [hip[0] + Math.cos(base - a) * l1, hip[1] + Math.sin(base - a) * l1];
}

/** Draw him in one pose. */
export function rimehide(P: Pose, weapon: Weapon = ''): FormCanvas {
  const f = new FormCanvas(RH_CELL.w, RH_CELL.h);
  if (P.clip !== undefined) f.clipY = P.clip;
  const hip: V = [RH_CELL.ax + P.ox, GY - 44 + P.oy];
  const ln = P.lean * DEG, cl = Math.cos(ln), sl = Math.sin(ln);
  // body space (origin at the hips, x forward, y down) to the cell
  const B = (x: number, y: number): V => [hip[0] + x * cl - y * sl, hip[1] + x * sl + y * cl];
  const limb = (a: V, b: V, r0: number, r1: number, r: Ramp, flat = 1, tone?: (t: number) => number) => f.limb(a[0], a[1], b[0], b[1], r0, r1, r, flat, tone);
  const sway = P.sway;
  /** Shaggy locks hanging off the line a-b. */
  const shag = (a: V, b: V, n: number, len: number, lit: number, seed: number) => {
    for (let k = 0; k < n; k++) {
      const p = mixv(a, b, (k + 0.5) / n), l = len * (0.6 + hash2(k, seed) * 0.7);
      const q = at(p, 90 + sway * 16 + (hash2(k, seed, 3) - 0.5) * 20, l);
      f.stroke(p[0], p[1], q[0], q[1], FUR, lit + (k % 2 ? 0.1 : 0), 2);
    }
  };

  const leg = (h: V, foot: V, dim: number, seed: number) => {
    const ft: V = [RH_CELL.ax + foot[0], GY - 5 - foot[1]];
    const kn = knee(h, ft, 23, 23);
    f.next();
    f.bias = dim;
    limb(h, kn, 12, 9, FUR);
    limb(kn, ft, 9, 7, FUR);
    shag(mixv(h, kn, 0.3), kn, 4, 7, 0.34 + dim, seed);
    shag(kn, ft, 3, 6, 0.3 + dim, seed + 1);
    // a broad foot with three black claws
    f.next();
    f.ball(ft[0] + 5, ft[1] + 1, 11, 5, FUR);
    for (let k = 0; k < 3; k++) f.stroke(ft[0] + 9 + k * 3, ft[1] + 1, ft[0] + 13 + k * 3, ft[1] + 4, CLAW, 0.5, 2);
    f.bias = 0;
  };
  /** An arm from shoulder `sh`. Returns the fist's place; `fist(...)` draws it (after the weapon, so it grips it). */
  const arm = (sh: V, a: V, dim: number, seed: number) => {
    const el = at(sh, a[0], 25), hand = at(el, a[1], 24);
    f.next();
    f.bias = dim;
    limb(sh, el, 10.5, 8.5, FUR);
    limb(el, hand, 8.5, 8, FUR);
    shag(sh, el, 4, 7, 0.34 + dim, seed);
    shag(el, hand, 4, 6, 0.3 + dim, seed + 1);
    // spurs of ice grown from the elbow
    limb(el, at(el, a[0] + 150, 9), 3, 0.4, ICE);
    limb(el, at(el, a[0] + 190, 6), 2.4, 0.4, ICE);
    f.bias = 0;
    return hand;
  };
  const fist = (hand: V, a: number, dim: number) => {
    f.next();
    f.bias = dim - 0.1;
    f.ball(hand[0], hand[1], 9.5, 9, FUR);
    f.bias = 0;
    for (let k = -1; k <= 1; k++) {
      const q = at(hand, a + k * 28, 9), tip = at(q, a + k * 28 + 40, 5);
      f.stroke(q[0], q[1], tip[0], tip[1], CLAW, 0.5, 2);
    }
  };

  // ── far side first: the far arm and leg, dimmer
  const shF = B(14, -44), shN = B(-8, -42);
  const handF = arm(shF, P.armF, -0.18, 31);
  fist(handF, P.armF[1], -0.18);
  leg(B(8, 0), P.footF, -0.18, 41);

  // ── the far horn, curling back behind the head
  const hc = B(21, -53);
  const hr = P.head * DEG + ln, ch = Math.cos(hr), sh2 = Math.sin(hr);
  const Hd = (x: number, y: number): V => [hc[0] + x * ch - y * sh2, hc[1] + x * sh2 + y * ch];
  const hornAt = (pts: V[], dim: number) => {
    f.next();
    f.bias = dim;
    for (let k = 0; k + 1 < pts.length; k++) limb(Hd(...pts[k]), Hd(...pts[k + 1]), 5.4 - k * 1.3, 4.1 - k * 1.3, HORN);
    for (let k = 0; k < 6; k++) {
      const i = Math.min(pts.length - 2, Math.floor(k / 2)), p = mixv(Hd(...pts[i]), Hd(...pts[i + 1]), (k % 2) * 0.5 + 0.2);
      f.groove(p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3, -0.2);
    }
    f.bias = 0;
  };
  hornAt([[2, -10], [10, -19], [19, -15], [20, -5]], -0.2);

  // ── torso: belly, a barrel chest, the hump of the shoulders
  f.next();
  { const c = B(0, -12); f.ball(c[0], c[1], 22, 20, FUR, ln); }
  { const c = B(4, -33); f.ball(c[0], c[1], 27, 23, FUR, ln); }
  { const c = B(-5, -45); f.ball(c[0], c[1], 21, 13, FUR, ln); }
  // a paler chest, and rows of shag down the body
  f.bias = 0.1;
  { const c = B(14, -27); f.ball(c[0], c[1], 12, 15, FUR, ln, 0.7); }
  f.bias = 0;
  shag(B(-20, -4), B(20, -2), 9, 10, 0.4, 51);
  shag(B(-22, -22), B(24, -18), 9, 8, 0.5, 52);
  shag(B(-24, -38), B(8, -34), 7, 7, 0.55, 53);
  // a ridge of ice across the shoulders
  f.next();
  for (let k = 0; k < 6; k++) {
    const b0 = B(-22 + k * 6.5, -54 + Math.abs(k - 2) * 1.5), tip = at(b0, -100 - k * 6 + ln / DEG, 8 + (k % 2) * 5);
    limb(b0, tip, 3.4, 0.4, ICE);
  }

  // ── head, sunk between the shoulders: fur, a bare blue face, a heavy jaw with tusks
  f.next();
  f.ball(hc[0], hc[1], 14.5, 13.5, FUR, hr);
  shag(Hd(-12, 4), Hd(4, 10), 5, 6, 0.4, 61);
  f.next();
  { const c = Hd(6, 1); f.ball(c[0], c[1], 9.5, 9.5, FACE, hr); }
  const jy = 8 + P.jaw * 6;
  if (P.jaw > 0.2) f.poly([Hd(0, 5), Hd(13, 5), Hd(13, jy), Hd(1, jy)], MAW, 0.5);
  { const c = Hd(7, jy); f.ball(c[0], c[1], 8, 4, FACE, hr); }
  f.groove(...Hd(1, -4), ...Hd(7, -2), -0.3); // the brow, drawn down
  f.groove(...Hd(8, -2), ...Hd(14, -4), -0.3);
  for (const ex of [3.5, 10.5]) {
    f.stroke(...Hd(ex, -0.5), ...Hd(ex + 2, -0.5), EYE, 0.6, 2.4); // ember eyes under the brow
    f.dot(...Hd(ex + 1.5, -0.5), EYE, 0.95);
  }
  f.dot(...Hd(9, 4), FACE, 0.05); // nostril
  for (const x of [1.5, 12.5]) f.stroke(...Hd(x, jy - 1), ...Hd(x + 0.4, jy - 5.5), TUSK, 0.92, 2.2); // tusks from the lower jaw
  if (P.jaw > 0.2) for (const x of [5, 8]) f.stroke(...Hd(x, 5), ...Hd(x, 7.5), TUSK, 0.85); // upper teeth

  hornAt([[-5, -9], [-15, -17], [-23, -8], [-18, 3]], 0);

  // ── near leg, near arm, and whatever is in its fist
  leg(B(-8, 0), P.footN, 0, 71);
  const handN = arm(shN, P.armN, 0, 81);
  if (weapon && P.club !== undefined) {
    f.next();
    const a = P.club;
    if (weapon === 'ice') {
      // a pillar of ice torn from the falls: thick, faceted, jagged at the far end
      const p0 = at(handN, a + 180, 10), p1 = at(handN, a, 64);
      limb(p0, p1, 5, 9.5, ICE, 0.8);
      for (const off of [-24, 0, 22]) limb(p1, at(p1, a + off, 13 - Math.abs(off) * 0.2), 5, 0.5, ICE);
      for (let k = 0; k < 4; k++) {
        const q = at(handN, a, 12 + k * 13);
        f.groove(...at(q, a + 110, 7), ...at(q, a - 60, 7), k % 2 ? 0.22 : -0.2);
      }
    } else {
      // a mammoth's tusk, held by the root: it curves up toward the point
      const p0 = at(handN, a + 180, 9), p1 = at(handN, a, 36), p2 = at(p1, a - 24, 26), p3 = at(p2, a - 50, 14);
      limb(p0, p1, 6.5, 5.5, TUSK);
      limb(p1, p2, 5.5, 3.6, TUSK);
      limb(p2, p3, 3.6, 0.6, TUSK);
      for (let k = 0; k < 5; k++) {
        const q = at(handN, a, 4 + k * 7);
        f.groove(...at(q, a + 90, 5), ...at(q, a - 90, 5), -0.16);
      }
    }
  }
  fist(handN, P.armN[1], 0);
  if (P.ball) {
    // the boulder of packed snow, between his fists
    const c = mixv(handN, handF, 0.5);
    f.next();
    f.ball(c[0], c[1] - P.ball * 0.6, P.ball, P.ball, SNOW);
    for (let k = 0; k < 5; k++) f.dot(c[0] + (hash2(k, 5) - 0.5) * P.ball * 1.2, c[1] - P.ball * 0.6 + (hash2(k, 6) - 0.5) * P.ball * 1.2, SNOW, 0.2);
  }
  return f;
}

// ---------------------------------------------------------------- the poses

const REST: Pose = { ox: 0, oy: 0, lean: 8, footN: [-12, 0], footF: [14, 0], armN: [100, 82], armF: [84, 70], head: 0, jaw: 0, sway: 0 };
const UP_N: V = [-75, -100], UP_F: V = [-68, -86]; // both fists over his head
const w = (t: number, d = 0) => Math.sin((t - d) * TAU);

/** Each animation: [name, frames, pose at t (0..1)]. Loops wrap; one-shots run 0 to 1 once. */
const ANIMS: [string, number, (t: number) => Pose][] = [
  ['idle', 6, (t) => ({ ...REST, oy: w(t) * 1.4, lean: 8 + w(t, 0.1), armN: [100 + w(t, 0.2) * 2, 82 + w(t, 0.3) * 3], armF: [84 + w(t, 0.2) * 2, 70 + w(t, 0.3) * 3], head: w(t, 0.15) * 2, sway: w(t, 0.3) * 0.5 })],
  ['walk', 8, (t) => {
    const c = Math.cos(t * TAU), s = Math.sin(t * TAU);
    return { ...REST, oy: 1 - Math.abs(c) * 2.5, lean: 13, footN: [-6 + c * 17, Math.max(0, s) * 8], footF: [10 - c * 17, Math.max(0, -s) * 8], armN: [96 - c * 24, 80 - c * 20], armF: [88 + c * 24, 72 + c * 20], head: w(t * 2, 0.1) * 2, sway: s };
  }],
  ['roar', 4, (t) => ({ ...REST, oy: -2, lean: -10 + w(t) * 1.5, armN: [152 + w(t) * 4, 118], armF: [-28 - w(t) * 4, -62], head: -26 + w(t) * 2, jaw: 1, sway: w(t) })],
  // lifting a boulder of snow over his head, then hurling it
  ['lift', 4, (t) => { const k = ease(t); return { ...REST, lean: mixn(8, -6, k), armN: mixv([100, 82], UP_N, k), armF: mixv([84, 70], UP_F, k), head: -8 * k, jaw: 0.4 * k, ball: 4 + k * 10 }; }],
  ['throw', 4, (t) => { const k = ease(t); return { ...REST, lean: mixn(-6, 24, k), armN: mixv(UP_N, [28, 8], k), armF: mixv(UP_F, [18, -2], k), head: mixn(-8, 10, k), jaw: 1, sway: -k, footN: [-16, 0], footF: [18, 0] }; }],
  ['squat', 2, (t) => ({ ...REST, oy: 14 + w(t), lean: 22, footN: [-17, 0], footF: [19, 0], armN: [124, 100], armF: [112, 96], head: -12, jaw: 0.3 })],
  ['leap', 2, (t) => ({ ...REST, oy: -4, lean: 18, footN: [-14, 14 + w(t)], footF: [10, 20 - w(t)], armN: [-42, -62], armF: [-30, -50], head: -6, jaw: 1, sway: 1 })],
  // the two-fisted slam: both fists up, a held breath, then down into the ground ahead of him
  ['slam', 8, (t) => {
    const up = ease(t / 0.4), down = ease((t - 0.5) / 0.14);
    return { ...REST, oy: mixn(-2 * up, 20, down), lean: mixn(mixn(8, -12, up), 44, down), armN: mixv(mixv([100, 82], UP_N, up), [58, 78], down), armF: mixv(mixv([84, 70], UP_F, up), [50, 70], down), head: mixn(-10 * up, 16, down), jaw: up, footN: [-16, 0], footF: [18, 0], sway: down ? -1 + (t - 0.64) * 3 : up * 0.5 };
  }],
  ['swipe', 6, (t) => {
    const k = ease((t - 0.3) / 0.3), back = ease(t / 0.3);
    return { ...REST, lean: mixn(mixn(8, -6, back), 26, k), armN: mixv(mixv([100, 82], [172, 200], back), [-12, -34], k), armF: [96, 80], head: mixn(0, 8, k), jaw: 0.3 + k * 0.7, footN: [-14, 0], footF: [16 + k * 4, 0], sway: -k };
  }],
  // down on all fours, galloping
  ['charge', 6, (t) => {
    const c = Math.cos(t * TAU), s = Math.sin(t * TAU);
    return { ox: -6, oy: 12 + s * 2, lean: 62, footN: [-34 + c * 13, Math.max(0, s) * 9], footF: [-18 - c * 13, Math.max(0, -s) * 9], armN: [56 + c * 30, 78 + c * 26], armF: [58 - c * 30, 80 - c * 26], head: -44, jaw: 0.7, sway: 1 };
  }],
  // through the ice to his chest, arms thrashing
  ['stuck', 4, (t) => ({ ...REST, oy: 40, lean: 0, footN: [-12, -44], footF: [14, -44], armN: [-150 + w(t) * 22, -112 + w(t) * 10], armF: [-30 - w(t) * 22, -70 - w(t) * 10], head: -16 + w(t, 0.2) * 6, jaw: 0.6 + w(t) * 0.4, clip: GY, sway: w(t) })],
  // scalded: hopping from foot to foot, arms over his face
  ['scald', 4, (t) => ({ ...REST, oy: -Math.abs(w(t)) * 5, lean: -6, footN: [-12, Math.max(0, w(t)) * 12], footF: [14, Math.max(0, -w(t)) * 12], armN: [-22, -84 + w(t) * 8], armF: [-10, -72 - w(t) * 8], head: -10, jaw: 1, sway: w(t) })],
  ['eat', 4, (t) => ({ ...REST, oy: 17, lean: 56, footN: [-18, 0], footF: [8, 0], armN: [62, 84], armF: [56, 76], head: 28 + w(t) * 9, jaw: 0.5 + w(t) * 0.5 })],
  ['breath', 4, (t) => ({ ...REST, oy: 4, lean: 30 + w(t), footN: [-18, 0], footF: [18, 0], armN: [150, 132], armF: [140, 120], head: -12 + w(t) * 2, jaw: 1, sway: -1 })],
  // a fist jammed in the ground (or between two ribs), hauling at it
  ['wedged', 4, (t) => ({ ...REST, oy: 12 + w(t) * 1.5, lean: 40 + w(t) * 3, footN: [-20, 0], footF: [10, 0], armN: [66, 82], armF: [142 + w(t) * 10, 100], head: w(t) * 7, jaw: 0.6 })],
  ['daze', 4, (t) => ({ ...REST, oy: 6, lean: -4 + w(t) * 2, armN: [96, 90], armF: [88, 84], head: 20 + w(t) * 10, jaw: 0.4, sway: w(t) * 0.6 })],
];

const SHOULDER: V = [-58, -128]; // the weapon carried on his shoulder: arm bent up, club back over it
/** The armed animations (prefixed 'ice_' or 'tusk_' in the sheet). */
const ARMED: [string, number, (t: number) => Pose][] = [
  ['idle', 6, (t) => ({ ...REST, oy: w(t) * 1.4, lean: 8 + w(t, 0.1), armN: [SHOULDER[0], SHOULDER[1] + w(t, 0.2) * 3], armF: [84 + w(t, 0.2) * 2, 70], head: w(t, 0.15) * 2, sway: w(t, 0.3) * 0.5, club: -122 + w(t, 0.2) * 3 })],
  ['walk', 8, (t) => {
    const c = Math.cos(t * TAU), s = Math.sin(t * TAU);
    return { ...REST, oy: 1 - Math.abs(c) * 2.5, lean: 13, footN: [-6 + c * 17, Math.max(0, s) * 8], footF: [10 - c * 17, Math.max(0, -s) * 8], armN: [SHOULDER[0], SHOULDER[1] + c * 4], armF: [88 + c * 24, 72 + c * 20], head: 0, sway: s, club: -122 + c * 5 };
  }],
  // overhead: the club goes back behind his head, then comes down flat on the ground
  ['slam', 8, (t) => {
    const up = ease(t / 0.4), down = ease((t - 0.5) / 0.14);
    return { ...REST, oy: mixn(-2 * up, 14, down), lean: mixn(mixn(8, -14, up), 38, down), armN: mixv(mixv(SHOULDER, [-96, -118], up), [40, 34], down), armF: mixv(mixv([84, 70], [-80, -100], up), [46, 40], down), head: mixn(-10 * up, 14, down), jaw: up, footN: [-16, 0], footF: [18, 0], club: mixn(mixn(-122, -160, up), 22, down), sway: -down };
  }],
  // a flat swing, shoulder high, all the way round
  ['sweep', 8, (t) => {
    const back = ease(t / 0.35), k = ease((t - 0.42) / 0.3);
    return { ...REST, lean: mixn(mixn(8, -4, back), 20, k), armN: mixv(mixv(SHOULDER, [168, 196], back), [-6, -20], k), armF: [96, 80], head: mixn(0, 6, k), jaw: 0.3 + k * 0.7, footN: [-15, 0], footF: [17 + k * 4, 0], club: mixn(mixn(-122, -168, back), -4, k), sway: -k };
  }],
  ['leap', 2, (t) => ({ ...REST, oy: -4, lean: 18, footN: [-14, 14 + w(t)], footF: [10, 20 - w(t)], armN: [-80, -102], armF: [-30, -50], head: -6, jaw: 1, sway: 1, club: -124 })],
  ['wedged', 4, (t) => ({ ...REST, oy: 12 + w(t) * 1.5, lean: 36 + w(t) * 3, footN: [-20, 0], footF: [10, 0], armN: [44, 38], armF: [50 + w(t) * 4, 44], head: w(t) * 7, jaw: 0.6, club: 26 })],
  ['roar', 4, (t) => ({ ...REST, oy: -2, lean: -10 + w(t) * 1.5, armN: [-70, -96 + w(t) * 3], armF: [-28 - w(t) * 4, -62], head: -26 + w(t) * 2, jaw: 1, sway: w(t), club: -100 + w(t) * 4 })],
];

const RIM = hex('#a8d8ff'); // cold light off the ice behind him

export function buildRimehideSheet(): SheetBuilder {
  const b = new SheetBuilder(RH_CELL.w, RH_CELL.h, RH_CELL.ax, RH_CELL.ay);
  const run = (name: string, n: number, pose: (t: number) => Pose, wpn: Weapon, loop: boolean) =>
    b.add(name, ...Array.from({ length: n }, (_, i) => rimehide(pose(loop ? i / n : i / (n - 1)), wpn).resolve({ rim: RIM, contour: 0.1 })));
  const ONCE = ['lift', 'throw', 'slam', 'swipe', 'sweep'];
  for (const [name, n, pose] of ANIMS) run(name, n, pose, '', !ONCE.includes(name));
  // armed: his own weapon animations, and the rest of his poses with the weapon still in his fist
  const CARRY = ['squat', 'charge', 'stuck', 'scald', 'eat', 'breath', 'daze'];
  for (const wpn of ['ice', 'tusk'] as Weapon[]) {
    for (const [name, n, pose] of ARMED) run(`${wpn}_${name}`, n, pose, wpn, !ONCE.includes(name));
    for (const [name, n, pose] of ANIMS) if (CARRY.includes(name)) run(`${wpn}_${name}`, n, (t) => { const q = pose(t); return { ...q, club: q.armN[1] - 24 }; }, wpn, true);
  }
  return b;
}

// ---------------------------------------------------------------- his two dens' props

export const RP_CELL = { w: 128, h: 128, ax: 64, ay: 127 };

/** Things standing in his dens (128x128, anchored bottom middle). */
export function buildRimePropSheet(): SheetBuilder {
  const b = new SheetBuilder(RP_CELL.w, RP_CELL.h, RP_CELL.ax, RP_CELL.ay);
  const cx = RP_CELL.ax, by = RP_CELL.ay;
  const mk = (draw: (f: FormCanvas) => void, outline = true) => {
    const f = new FormCanvas(RP_CELL.w, RP_CELL.h);
    draw(f);
    return f.resolve({ rim: RIM, outline });
  };
  // a boulder of snow, in two turns (the game scales and steps it as it rolls)
  const boulder = (turn: number) => mk((f) => {
    f.ball(cx, by - 26, 24, 24, SNOW);
    for (let k = 0; k < 9; k++) {
      const a = turn + k * 0.7, r = 6 + hash2(k, 3) * 14;
      f.dot(cx + Math.cos(a) * r, by - 26 + Math.sin(a) * r, SNOW, 0.15);
      f.groove(cx + Math.cos(a) * r, by - 26 + Math.sin(a) * r, cx + Math.cos(a + 0.5) * (r + 3), by - 26 + Math.sin(a + 0.5) * (r + 3), -0.16);
    }
  });
  b.add('boulder', boulder(0), boulder(1.6));
  // one storey of the frozen waterfall: columns of ice run together (it stacks)
  b.add('falls', mk((f) => {
    for (let k = 0; k < 9; k++) {
      const x = 12 + k * 13 + hash2(k, 11) * 5, r = 6 + hash2(k, 12) * 5;
      f.next();
      f.limb(x, -8, x + (hash2(k, 13) - 0.5) * 6, 136, r, r * 0.9, ICE, 0.8, (t) => Math.sin(t * 9 + k) * 0.08);
      f.groove(x - 2, 4, x - 2, 124, 0.2);
    }
  }));
  // the heap of broken ice that buries him
  b.add('rubble', mk((f) => {
    for (let k = 0; k < 16; k++) {
      const x = cx - 52 + hash2(k, 21) * 104, h = 14 + hash2(k, 22) * 30 * (1 - Math.abs(x - cx) / 70);
      f.next();
      f.limb(x, by, x + (hash2(k, 23) - 0.5) * 16, by - h, 9, 2, ICE, 0.8);
    }
  }));
  // a pillar of ice (and the stump he leaves when he tears it out)
  b.add('pillar', mk((f) => {
    f.limb(cx, by, cx + 3, by - 96, 12, 8, ICE, 0.8);
    for (const off of [-8, 8]) f.limb(cx + off, by, cx + off * 1.6, by - 26, 7, 1, ICE, 0.8);
    for (let k = 0; k < 6; k++) f.groove(cx - 9, by - 12 - k * 15, cx + 8, by - 20 - k * 15, k % 2 ? 0.2 : -0.2);
  }), mk((f) => {
    f.limb(cx, by, cx + 1, by - 16, 12, 9, ICE, 0.8);
    for (const off of [-7, 0, 6]) f.limb(cx + off, by - 14, cx + off * 1.5, by - 26 - Math.abs(off), 4, 0.5, ICE);
  }));
  // a hot spring's vent: a ring of dark stone, cold (0) or about to blow (1)
  const vent = (hot: boolean) => mk((f) => {
    for (let k = 0; k < 7; k++) {
      f.next();
      f.ball(cx - 24 + k * 8, by - 4 - Math.sin((k / 6) * Math.PI) * 3, 6.5, 5 + hash2(k, 31) * 3, ROCK);
    }
    if (hot) {
      f.next();
      f.disc(cx, by - 9, 8, GLOW, 0.5);
      f.disc(cx, by - 9, 4, GLOW, 0.9);
    }
  });
  b.add('vent', vent(false), vent(true));
  // a mammoth's rib standing out of the ice, arching over to the right; and one snapped off
  const rib = (broken: boolean) => mk((f) => {
    const pts: V[] = [[cx - 6, by], [cx - 12, by - 36], [cx - 8, by - 72], [cx + 8, by - 100], [cx + 30, by - 116]];
    const n = broken ? 2 : pts.length - 1;
    for (let k = 0; k < n; k++) f.limb(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 8 - k * 1.3, 6.7 - k * 1.3, TUSK, 0.9);
    if (broken) for (const off of [-4, 2]) f.limb(pts[2][0] + off, pts[2][1], pts[2][0] + off * 2, pts[2][1] - 9, 3, 0.5, TUSK);
    for (let k = 0; k < (broken ? 4 : 9); k++) f.groove(cx - 16, by - 8 - k * 11, cx + 2, by - 12 - k * 11, -0.14);
    // ice round its foot
    f.next();
    for (const off of [-12, 0, 11]) f.limb(cx - 6 + off, by, cx - 6 + off * 1.4, by - 14 + Math.abs(off) * 0.4, 5, 0.6, ICE);
  });
  b.add('rib', rib(false), rib(true));
  // the tusk hanging point-down from the spine by a strap of sinew (the game hides the strap when it falls)
  b.add('tusk', mk((f) => {
    f.stroke(cx, by - 126, cx, by - 96, MEAT, 0.5, 3);
    f.next();
    f.limb(cx, by - 100, cx - 4, by - 60, 8, 6.5, TUSK);
    f.limb(cx - 4, by - 60, cx + 2, by - 26, 6.5, 4, TUSK);
    f.limb(cx + 2, by - 26, cx + 12, by - 4, 4, 0.6, TUSK);
    for (let k = 0; k < 6; k++) f.groove(cx - 10, by - 94 + k * 9, cx + 8, by - 96 + k * 9, -0.16);
  }));
  // a frozen haunch on a hook (0), and lying on the floor (1)
  b.add('carcass', mk((f) => {
    f.stroke(cx, by - 126, cx, by - 84, ROCK, 0.7, 2);
    f.stroke(cx, by - 84, cx + 5, by - 78, ROCK, 0.8, 2);
    f.next();
    f.limb(cx + 2, by - 80, cx - 2, by - 40, 9, 15, MEAT);
    f.ball(cx - 2, by - 30, 17, 14, MEAT);
    f.limb(cx + 2, by - 84, cx + 3, by - 92, 3.5, 4.5, TUSK); // the bone end
    for (let k = 0; k < 4; k++) f.groove(cx - 14, by - 62 + k * 10, cx + 12, by - 58 + k * 10, 0.18); // rime
    f.next();
    for (const off of [-9, 1, 10]) f.limb(cx + off, by - 18, cx + off, by - 6 + Math.abs(off) * 0.3, 2.6, 0.4, ICE); // icicles off it
  }), mk((f) => {
    f.limb(cx - 28, by - 8, cx + 4, by - 12, 8, 14, MEAT);
    f.ball(cx + 12, by - 13, 16, 13, MEAT);
    f.limb(cx - 30, by - 8, cx - 38, by - 9, 3.5, 4.5, TUSK);
    for (let k = 0; k < 4; k++) f.groove(cx - 20 + k * 10, by - 22, cx - 16 + k * 10, by - 4, 0.18);
  }));
  // the mammoth's skull, facing left: a dome, a deep socket, the stumps of its tusks
  b.add('skull', mk((f) => {
    f.ball(cx + 8, by - 52, 46, 40, TUSK);
    f.ball(cx - 26, by - 30, 26, 30, TUSK);
    f.next();
    f.ball(cx - 12, by - 54, 12, 13, MAW, 0, 0.4);
    f.ball(cx - 44, by - 34, 6, 9, MAW, 0, 0.4);
    f.next();
    f.limb(cx - 36, by - 14, cx - 50, by + 2, 9, 7, TUSK);
    f.limb(cx - 14, by - 10, cx - 22, by + 2, 9, 7, TUSK);
    for (let k = 0; k < 5; k++) f.groove(cx - 10 + k * 12, by - 88 + k * 3, cx - 4 + k * 12, by - 64 + k * 4, -0.12);
    f.groove(cx + 8, by - 90, cx + 14, by - 20, -0.18); // the seam of the skull
  }));
  return b;
}
