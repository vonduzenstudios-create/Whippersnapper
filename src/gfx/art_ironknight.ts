// The Hollow Colossus as a walking knight (0.27.0, the Foundry trial fight): a jointed puppet
// in the Bell-Mother's style. Hips, a leaning torso, a helm, a sword arm and a shield arm of
// two bones each, legs solved from where the feet stand. `knight()` draws one pose; every
// animation is a pose computed from a clock. With `bare` the plate is gone and what wore it
// shows: a cage of iron bands round a furnace fire. Everything faces right.
import { SheetBuilder, hex } from './pixel';
import { FormCanvas, ramp, Ramp, V } from './form';
import { hash2 } from '../core/util';

export const IK_CELL = { w: 240, h: 208, ax: 120, ay: 204 };
const GY = IK_CELL.ay;
const DEG = Math.PI / 180, TAU = Math.PI * 2;

const STEEL = ramp('#0c0e18', '#1e2434', '#343e54', '#56637c', '#8694ac', '#c4d0e0');
const DARK = ramp('#06060c', '#12141e', '#222634', '#363c4e', '#505870');
const BRASS = ramp('#2a1608', '#5c3812', '#a06c24', '#d8a84c', '#fff0b0');
const CLOTH = ramp('#1c060c', '#3e0c16', '#681622', '#92262c', '#b8463c');
const BLADE = ramp('#1a2030', '#3c4860', '#70809c', '#a8b8cc', '#e4eef8', '#ffffff');
const FIRE = ramp('#7a1404', '#d03a0c', '#ff7a1c', '#ffc040', '#fff2a8', '#ffffff');
const SOOT = ramp('#040406', '#0e0c10', '#1c181c', '#2c262a');

export interface Pose {
  ox: number;
  oy: number;
  lean: number;
  footN: V;
  footF: V;
  /** Sword arm and shield arm: upper arm and forearm, screen angles in degrees (0 = ahead, 90 = down). */
  armN: V;
  armF: V;
  /** The blade's angle from his fist. */
  sw: number;
  head: number;
  /** How far cloth and plume hang off true (-1..1), and the flicker of the fire (0..1). */
  sway: number;
  flick: number;
  /** The far hand is on the hilt too (the shield hangs at his back). */
  grip?: boolean;
}

const at = (p: V, a: number, len: number): V => [p[0] + Math.cos(a * DEG) * len, p[1] + Math.sin(a * DEG) * len];
const mixn = (a: number, b: number, t: number) => a + (b - a) * t;
const mixv = (a: V, b: V, t: number): V => [mixn(a[0], b[0], t), mixn(a[1], b[1], t)];
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function knee(hip: V, foot: V, l1: number, l2: number): V {
  const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
  const d = Math.min(l1 + l2 - 0.5, Math.max(6, Math.hypot(dx, dy)));
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx);
  return [hip[0] + Math.cos(base - a) * l1, hip[1] + Math.sin(base - a) * l1];
}

export function knight(P: Pose, bare: boolean): FormCanvas {
  const f = new FormCanvas(IK_CELL.w, IK_CELL.h);
  const hip: V = [IK_CELL.ax + P.ox, GY - 68 + P.oy];
  const ln = P.lean * DEG, cl = Math.cos(ln), sl = Math.sin(ln);
  const B = (x: number, y: number): V => [hip[0] + x * cl - y * sl, hip[1] + x * sl + y * cl];
  const limb = (a: V, b: V, r0: number, r1: number, r: Ramp, flat = 1, tone?: (t: number) => number) => f.limb(a[0], a[1], b[0], b[1], r0, r1, r, flat, tone);
  const PL = bare ? DARK : STEEL; // the plate: blackened and broken once the fire is out in the open
  const fl = P.flick;
  /** A tongue of flame from p, `len` long, leaning with the motion. */
  const flame = (p: V, len: number, wide: number, seed: number) => {
    const a = -90 - P.sway * 30 + (hash2(seed, 1) - 0.5) * 40 + Math.sin((fl + hash2(seed, 2)) * TAU) * 14;
    const l = len * (0.7 + 0.5 * Math.abs(Math.sin((fl + hash2(seed, 3)) * TAU)));
    const mid = at(p, a, l * 0.5), tip = at(mid, a + 20 * Math.sin((fl + seed) * TAU), l * 0.5);
    limb(p, mid, wide, wide * 0.7, FIRE, 0.5, (t) => 0.1 - t * 0.2);
    limb(mid, tip, wide * 0.7, 0.4, FIRE, 0.5, (t) => -0.1 - t * 0.3);
  };
  /** A rivet line or a band across the plate between a and b. */
  const band = (a: V, b: V) => {
    f.groove(a[0], a[1], b[0], b[1], -0.24);
    f.groove(a[0], a[1] + 1, b[0], b[1] + 1, 0.16);
  };

  const leg = (h: V, foot: V, dim: number) => {
    const ft: V = [IK_CELL.ax + foot[0], GY - 7 - foot[1]];
    const kn = knee(h, ft, 35, 34);
    f.next();
    f.bias = dim;
    limb(h, kn, 13, 10, PL); // cuisse
    limb(kn, ft, 10, 8.5, PL); // greave
    band(mixv(h, kn, 0.45), [mixv(h, kn, 0.45)[0] + 12, mixv(h, kn, 0.45)[1] + 3]);
    f.groove(kn[0] + 2, kn[1] + 6, ft[0] + 2, ft[1] - 6, 0.14); // the greave's ridge
    f.next();
    f.ball(kn[0] + 2, kn[1], 9, 9, bare ? PL : BRASS); // poleyn
    if (bare) f.disc(kn[0] + 2, kn[1], 3, FIRE, 0.5 + fl * 0.3);
    // sabaton: a long plated foot
    f.next();
    limb([ft[0] - 6, ft[1] + 1], [ft[0] + 15, ft[1] + 2], 7, 4.5, PL, 0.9);
    for (let k = 0; k < 3; k++) f.groove(ft[0] + k * 5, ft[1] - 4, ft[0] + 2 + k * 5, ft[1] + 5, -0.2);
    f.bias = 0;
  };
  const arm = (sh: V, a: V, dim: number, pauldron: boolean) => {
    const el = at(sh, a[0], 31), hand = at(el, a[1], 29);
    f.next();
    f.bias = dim;
    limb(sh, el, 11, 9, PL);
    limb(el, hand, 9.5, 8.5, PL); // vambrace
    band(mixv(el, hand, 0.3), at(mixv(el, hand, 0.3), a[1] + 90, 9));
    f.next();
    f.ball(el[0], el[1], 8, 8, bare ? PL : BRASS); // couter
    if (bare) f.disc(el[0], el[1], 2.5, FIRE, 0.5 + fl * 0.3);
    if (pauldron) {
      // a great layered pauldron, edged in brass
      f.next();
      f.ball(sh[0] - 1, sh[1] - 3, 17, 14, PL, ln);
      f.ball(sh[0] - 2, sh[1] + 5, 14, 9, PL, ln);
      f.groove(sh[0] - 15, sh[1] + 2, sh[0] + 13, sh[1] + 3, -0.24);
      f.stroke(sh[0] - 15, sh[1] + 11, sh[0] + 10, sh[1] + 12, BRASS, 0.7, 2);
      limb([sh[0] - 4, sh[1] - 13], [sh[0] - 8, sh[1] - 24], 3.4, 0.6, PL); // a spike off its crown
    }
    f.bias = 0;
    return hand;
  };
  const gauntlet = (hand: V, dim: number) => {
    f.next();
    f.bias = dim;
    f.ball(hand[0], hand[1], 10, 9.5, PL);
    f.groove(hand[0] - 7, hand[1] - 2, hand[0] + 7, hand[1] - 3, -0.22);
    f.groove(hand[0] - 6, hand[1] + 3, hand[0] + 6, hand[1] + 2, -0.2);
    f.bias = 0;
  };
  const shF = B(16, -52), shN = B(-10, -50);

  // ── far side: the shield arm, the shield (or the shield slung at his back), the far leg
  const handF = P.grip ? at(at(shN, P.armN[0], 31), P.armN[1], 22) : arm(shF, P.armF, -0.2, false);
  if (P.grip) {
    f.next();
    f.bias = -0.2;
    limb(shF, mixv(shF, handF, 0.5), 11, 9, PL);
    limb(mixv(shF, handF, 0.5), handF, 9.5, 8.5, PL);
    f.bias = 0;
  }
  {
    // a kite shield, its face toward us: steel, a brass rim and boss, an old device in red
    const c: V = P.grip ? B(-18, -30) : at(handF, P.armF[1] - 30, 6), a = (P.grip ? 80 : P.armF[1] + 75) * DEG + (P.grip ? ln : 0);
    const S = (x: number, y: number): V => [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
    f.next();
    f.bias = P.grip ? -0.3 : -0.06;
    f.poly([S(-30, -17), S(-30, 17), S(6, 19), S(40, 0), S(6, -19)], bare ? DARK : STEEL, (x, y) => 0.36 + ((x - c[0]) * 0.5 - (y - c[1])) * 0.006);
    f.poly([S(-22, -10), S(-22, 10), S(4, 11), S(24, 0), S(4, -11)], bare ? SOOT : CLOTH, (x, y) => 0.4 + ((x - c[0]) * 0.5 - (y - c[1])) * 0.008);
    for (const [p, q] of [[S(-30, -17), S(-30, 17)], [S(-30, 17), S(6, 19)], [S(6, 19), S(40, 0)], [S(40, 0), S(6, -19)], [S(6, -19), S(-30, -17)]] as [V, V][]) f.stroke(p[0], p[1], q[0], q[1], BRASS, 0.62, 2);
    f.ball(...S(-4, 0), 5, 5, BRASS);
    if (bare) for (let k = 0; k < 3; k++) f.groove(...S(-24 + k * 16, -14), ...S(-14 + k * 16, 14), 0.3); // cracks, glowing
    f.bias = 0;
  }
  if (!P.grip) gauntlet(handF, -0.2);
  leg(B(9, 0), P.footF, -0.2);

  // ── a tabard hanging from the belt (it burns away with the plate)
  if (!bare) {
    f.next();
    for (let k = 0; k < 5; k++) {
      const top = B(-12 + k * 6, 2), end = at(top, 92 + P.sway * 16 + (k - 2) * 3, 34 + (k % 2) * 7);
      limb(top, end, 4.6, 3.4, CLOTH, 0.7, (t) => -0.1 - t * 0.2);
    }
  }
  // ── torso
  if (bare) {
    // the fire that wore the armor: a furnace heart, in a cage of the suit's iron bands
    f.next();
    { const c = B(3, -34); f.ball(c[0], c[1], 22, 24, FIRE, ln, 0.6); f.disc(c[0], c[1], 9 + fl * 3, FIRE, 0.95); }
    for (let k = 0; k < 5; k++) flame(B(-12 + k * 7, -52), 20 + (k % 2) * 8, 6, k + 10);
    f.next();
    for (let k = 0; k < 4; k++) {
      const y = -52 + k * 12;
      limb(B(-19, y), B(24, y - 2), 3, 3, DARK, 0.9);
    }
    for (const x of [-17, 3, 22]) limb(B(x, -56), B(x - 2, -10), 2.6, 2.6, DARK, 0.9);
    { const c = B(1, -8); f.ball(c[0], c[1], 19, 11, DARK, ln); } // what is left of the fauld
  } else {
    f.next();
    { const c = B(1, -8); f.ball(c[0], c[1], 20, 12, STEEL, ln); } // fauld
    { const c = B(3, -34); f.ball(c[0], c[1], 26, 27, STEEL, ln); } // breastplate
    { const c = B(-4, -50); f.ball(c[0], c[1], 22, 12, STEEL, ln); }
    band(B(-20, -2), B(22, -4));
    band(B(-21, -14), B(25, -16));
    f.groove(...B(8, -56), ...B(10, -14), 0.2); // the breastplate's keel
    for (let k = 0; k < 3; k++) f.groove(...B(-14, -40 + k * 9), ...B(-2, -38 + k * 9), -0.16); // flutes
    // the furnace door in his chest, shut: light leaks round it
    f.next();
    { const c = B(14, -34); f.ball(c[0], c[1], 8, 10, BRASS, ln, 0.5); f.disc(c[0], c[1], 3.5, FIRE, 0.5 + fl * 0.3); }
    f.stroke(...B(-18, -8), ...B(22, -10), BRASS, 0.6, 2); // belt
  }
  // gorget
  f.next();
  limb(B(-2, -58), B(10, -60), 8, 8, PL);

  // ── the helm: a great helm with a visor slit, a crest of horn, a plume (or a crown of fire)
  const hc = B(6, -72), hr = P.head * DEG + ln, ch = Math.cos(hr), sh2 = Math.sin(hr);
  const H = (x: number, y: number): V => [hc[0] + x * ch - y * sh2, hc[1] + x * sh2 + y * ch];
  if (bare) for (let k = 0; k < 5; k++) flame(H(-8 + k * 4, -9), 18 + (k % 2) * 10, 5, k + 30);
  else {
    f.next();
    for (let k = 0; k < 5; k++) {
      const top = H(-6 - k * 1.5, -13), end = at(top, 150 + k * 9 + P.sway * 18 + hr / DEG, 20 + k * 3);
      limb(top, end, 3.4, 1.6, CLOTH, 0.7);
    }
  }
  f.next();
  f.ball(hc[0], hc[1], 13, 14, PL, hr);
  { const c = H(6, 5); f.ball(c[0], c[1], 9, 8, PL, hr); } // the snout of the visor
  limb(H(-4, -13), H(8, -15), 3, 2.4, bare ? PL : BRASS); // comb
  f.groove(...H(-12, 4), ...H(2, 8), -0.22);
  f.next();
  f.stroke(...H(2, -3), ...H(13, -2), SOOT, 0.1, 3); // the slit
  f.stroke(...H(5, -3), ...H(11, -2.4), FIRE, 0.6 + fl * 0.35, bare ? 2.4 : 1.4); // and what looks out of it
  for (const k of [0, 1, 2]) f.dot(...H(7 + k * 2.4, 5 + (k % 2)), SOOT, 0.1); // breaths
  // horns sweeping back from the temples
  f.next();
  limb(H(-6, -7), H(-18, -14), 4, 2.6, bare ? DARK : BRASS);
  limb(H(-18, -14), H(-24, -25), 2.6, 0.5, bare ? DARK : BRASS);

  // ── near leg, then the sword arm, the sword, the fist that holds it
  leg(B(-9, 0), P.footN, 0);
  const handN = arm(shN, P.armN, 0, !bare);
  if (bare) {
    f.next();
    for (let k = 0; k < 3; k++) flame([shN[0] - 4 + k * 4, shN[1] - 6], 14 + k * 3, 5, k + 50);
  }
  {
    const a = P.sw, p0 = at(handN, a + 180, 16), g0 = at(handN, a, 9), tip = at(handN, a, 104);
    f.next();
    limb(p0, handN, 2.6, 2.6, BRASS); // grip
    f.ball(p0[0], p0[1], 4.4, 4.4, BRASS); // pommel
    limb(at(g0, a + 90, 15), at(g0, a - 90, 15), 3.2, 3.2, BRASS, 0.9); // the cross
    f.next();
    const BL = bare ? FIRE : BLADE;
    limb(g0, at(handN, a, 92), 7, 6, BL, 0.55, bare ? (t) => 0.1 - t * 0.2 + fl * 0.1 : undefined);
    limb(at(handN, a, 92), tip, 6, 0.6, BL, 0.55);
    f.groove(...at(handN, a, 14), ...at(handN, a, 90), bare ? 0.3 : -0.2); // the fuller
    if (bare) for (let k = 0; k < 4; k++) flame(at(handN, a, 24 + k * 20), 12, 4, k + 70);
  }
  gauntlet(handN, 0);
  return f;
}

// ---------------------------------------------------------------- the poses

const REST: Pose = { ox: 0, oy: 0, lean: 4, footN: [-17, 0], footF: [19, 0], armN: [102, 70], armF: [62, 8], sw: 58, head: 0, sway: 0, flick: 0 };
const w = (t: number, d = 0) => Math.sin((t - d) * TAU);

/** [name, frames, loops?, pose at t]. One-shots run 0 to 1 once. */
const ANIMS: [string, number, boolean, (t: number) => Pose][] = [
  ['idle', 6, true, (t) => ({ ...REST, oy: w(t) * 1.2, lean: 4 + w(t, 0.1) * 0.8, armN: [102 + w(t, 0.2) * 2, 70 + w(t, 0.3) * 2], armF: [62, 8 + w(t, 0.25) * 3], head: w(t, 0.15) * 2, sway: w(t, 0.3) * 0.4, flick: t })],
  ['walk', 8, true, (t) => {
    const c = Math.cos(t * TAU), s = Math.sin(t * TAU);
    return { ...REST, oy: 1 - Math.abs(c) * 3, lean: 8, footN: [-4 + c * 24, Math.max(0, s) * 11], footF: [8 - c * 24, Math.max(0, -s) * 11], armN: [100 - c * 10, 72 - c * 8], armF: [62 + c * 6, 8 + c * 8], sw: 58 - c * 6, head: w(t * 2, 0.1) * 1.5, sway: s, flick: t };
  }],
  // a low sweep along the floor: the blade goes back, then scythes round at knee height
  ['sweep', 8, false, (t) => {
    const back = ease(t / 0.36), k = ease((t - 0.42) / 0.2);
    return { ...REST, oy: mixn(back * 6, 20, k), lean: mixn(mixn(4, -4, back), 30, k), footN: [-24, 0], footF: [24 + k * 6, 0], armN: mixv(mixv([102, 70], [150, 170], back), [66, 40], k), armF: [80, 40], sw: mixn(mixn(58, 176, back), 8 - (t - 0.62) * 60 * (t > 0.62 ? 1 : 0), k), head: mixn(0, 10, k), sway: -k, flick: t };
  }],
  // the cleave: both hands on the hilt, up over his head, a held breath, then straight down
  ['cleave', 8, false, (t) => {
    const up = ease(t / 0.42), down = ease((t - 0.52) / 0.12);
    return { ...REST, oy: mixn(-3 * up, 16, down), lean: mixn(mixn(4, -12, up), 32, down), footN: [-22, 0], footF: [24, 0], armN: mixv(mixv([102, 70], [-70, -96], up), [50, 40], down), armF: [60, 20], sw: mixn(mixn(58, -118, up), 36, down), head: mixn(-8 * up, 12, down), sway: down ? -1 : up * 0.5, flick: t, grip: true };
  }],
  ['wedged', 4, true, (t) => ({ ...REST, oy: 16 + w(t) * 2, lean: 32 + w(t) * 3, footN: [-26, 0], footF: [20, 0], armN: [50 + w(t) * 2, 40], armF: [60, 20], sw: 36, head: 12 + w(t, 0.2) * 5, sway: w(t) * 0.5, flick: t, grip: true })],
  // behind the shield, set to run
  ['brace', 2, true, (t) => ({ ...REST, oy: 12 + w(t), lean: 16, footN: [-26, 0], footF: [16, 0], armN: [130, 150], armF: [20, -50], sw: 170, head: 6, flick: t })],
  ['bash', 4, true, (t) => {
    const c = Math.cos(t * TAU), s = Math.sin(t * TAU);
    return { ...REST, oy: 8 - Math.abs(c) * 3, lean: 22, footN: [-8 + c * 26, Math.max(0, s) * 12], footF: [8 - c * 26, Math.max(0, -s) * 12], armN: [130, 150], armF: [16, -54], sw: 168, head: 8, sway: 1, flick: t };
  }],
  // the stamp: a knee comes up to his chest, and the foot goes through the floor
  ['stomp', 6, false, (t) => {
    const up = ease(t / 0.45), down = ease((t - 0.52) / 0.1);
    return { ...REST, oy: mixn(-2 * up, 8, down), lean: mixn(mixn(4, -8, up), 14, down), footN: [mixn(-17, 14, up), mixn(44 * up, 0, down)], footF: [10, 0], armN: [102 + up * 30, 70 + up * 40], sw: 58 + up * 50, armF: [62, 8 - up * 30], head: -6 * up, sway: down ? -1 : 0, flick: t };
  }],
  // dragging the point along the floor toward her, throwing sparks
  ['scrape', 4, false, (t) => { const k = ease(t); return { ...REST, oy: 10, lean: mixn(10, 28, k), footN: [-24, 0], footF: [24, 0], armN: mixv([150, 150], [40, 30], k), armF: [70, 30], sw: mixn(120, 30, k), head: 8, sway: -k, flick: t }; }],
  // down on one knee, leaning on the blade
  ['kneel', 4, true, (t) => ({ ...REST, oy: 36 + w(t), lean: 20 + w(t) * 2, footN: [-46, 0], footF: [20, 0], armN: [70, 60], armF: [96, 92], sw: 84, head: 22 + w(t, 0.2) * 4, sway: w(t) * 0.4, flick: t })],
  ['roar', 4, true, (t) => ({ ...REST, oy: -2, lean: -10 + w(t), footN: [-24, 0], footF: [24, 0], armN: [-36, -66 + w(t) * 3], armF: [150, 190], sw: -78 + w(t) * 3, head: -18 + w(t) * 2, sway: w(t), flick: t })],
  // a rising cut that throws a wave of fire along the floor (the second half)
  ['wave', 6, false, (t) => { const back = ease(t / 0.4), k = ease((t - 0.45) / 0.2); return { ...REST, oy: mixn(10 * back, 0, k), lean: mixn(mixn(4, 20, back), -8, k), footN: [-22, 0], footF: [24, 0], armN: mixv(mixv([102, 70], [130, 110], back), [-30, -50], k), armF: [70, 30], sw: mixn(mixn(58, 110, back), -60, k), head: mixn(6, -10, k), sway: k, flick: t }; }],
];

const RIM = hex('#ff8a40'); // forge light behind him

export function buildIronKnightSheet(): SheetBuilder {
  const b = new SheetBuilder(IK_CELL.w, IK_CELL.h, IK_CELL.ax, IK_CELL.ay);
  for (const bare of [false, true])
    for (const [name, n, loop, pose] of ANIMS)
      b.add((bare ? 'bare_' : '') + name, ...Array.from({ length: n }, (_, i) => knight(pose(loop ? i / n : i / (n - 1)), bare).resolve({ rim: RIM, contour: 0.12 })));
  return b;
}

// ---------------------------------------------------------------- the Foundry's props

export const FP_CELL = { w: 112, h: 96, ax: 56, ay: 95 };

/** The Foundry's machinery (112x96, anchored bottom middle). */
export function buildFoundrySheet(): SheetBuilder {
  const b = new SheetBuilder(FP_CELL.w, FP_CELL.h, FP_CELL.ax, FP_CELL.ay);
  const cx = FP_CELL.ax, by = FP_CELL.ay;
  const mk = (draw: (f: FormCanvas) => void) => {
    const f = new FormCanvas(FP_CELL.w, FP_CELL.h);
    draw(f);
    return f.resolve({ rim: RIM });
  };
  // the crane's ladle on its trolley: brim-full of slag (0), or poured out (1)
  const ladle = (full: boolean) => mk((f) => {
    f.limb(cx - 30, by - 90, cx + 30, by - 90, 4, 4, DARK, 0.9); // trolley
    for (const x of [-22, 22]) f.ball(cx + x, by - 92, 5, 5, STEEL);
    for (const x of [-20, 20]) f.stroke(cx + x, by - 86, cx + x * 1.1, by - 52, STEEL, 0.5, 2); // chains
    f.next();
    f.poly([[cx - 26, by - 54], [cx + 26, by - 54], [cx + 19, by - 16], [cx - 19, by - 16]], DARK, (x, y) => 0.3 + (x - cx) * 0.008 - (y - by + 30) * 0.004);
    f.stroke(cx - 27, by - 54, cx + 27, by - 54, STEEL, 0.6, 3);
    f.stroke(cx - 22, by - 34, cx + 22, by - 34, STEEL, 0.5, 2);
    if (full) {
      f.next();
      f.stroke(cx - 22, by - 56, cx + 22, by - 56, FIRE, 0.75, 3);
      for (const x of [-12, 4, 16]) f.disc(cx + x, by - 58, 3, FIRE, 0.9);
    }
    // the tip chain and its ring, hanging under the bowl
    f.next();
    f.stroke(cx, by - 16, cx, by - 5, STEEL, 0.6, 2);
    f.ball(cx, by - 3, 3.5, 3.5, BRASS);
  });
  b.add('ladle', ladle(true), ladle(false));
  // the quench trough: a long stone basin of black water
  b.add('trough', mk((f) => {
    f.poly([[cx - 54, by - 20], [cx + 54, by - 20], [cx + 50, by], [cx - 50, by]], STEEL, (x, y) => 0.3 + (by - y) * 0.012);
    f.next();
    f.poly([[cx - 49, by - 20], [cx + 49, by - 20], [cx + 49, by - 15], [cx - 49, by - 15]], ramp('#06141c', '#0e2c3a', '#2a6a80', '#8ad0e0'), (x) => 0.3 + Math.sin(x * 0.4) * 0.25);
    for (let k = 0; k < 6; k++) f.groove(cx - 44 + k * 18, by - 13, cx - 46 + k * 18, by - 1, -0.2);
  }));
  // an iron grate let into the floor (one length of it)
  b.add('grate', mk((f) => {
    f.poly([[cx - 56, by - 7], [cx + 56, by - 7], [cx + 56, by], [cx - 56, by]], DARK, 0.45);
    for (let k = 0; k < 14; k++) f.stroke(cx - 52 + k * 8, by - 6, cx - 52 + k * 8, by - 1, SOOT, 0.1, 3);
    f.stroke(cx - 56, by - 7, cx + 56, by - 7, STEEL, 0.7);
  }));
  // the molten channel: a gutter of slag crossing the floor
  b.add('channel', mk((f) => {
    f.poly([[cx - 36, by - 8], [cx + 36, by - 8], [cx + 32, by], [cx - 32, by]], DARK, 0.3);
    f.next();
    f.poly([[cx - 31, by - 7], [cx + 31, by - 7], [cx + 29, by - 2], [cx - 29, by - 2]], FIRE, (x) => 0.55 + Math.sin(x * 0.5) * 0.25);
  }), mk((f) => {
    f.poly([[cx - 36, by - 8], [cx + 36, by - 8], [cx + 32, by], [cx - 32, by]], DARK, 0.3);
    f.next();
    f.poly([[cx - 31, by - 7], [cx + 31, by - 7], [cx + 29, by - 2], [cx - 29, by - 2]], FIRE, (x) => 0.6 + Math.cos(x * 0.5) * 0.25);
  }));
  return b;
}
