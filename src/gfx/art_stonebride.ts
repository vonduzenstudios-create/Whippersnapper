// Ysolde, the Stone Bride, as a jointed puppet (0.27.0, the Sunken Rotunda trial fight), in
// the Bell-Mother's style. A woman's body on a serpent's: the tail is a chain of segments laid
// along a curve that a clock bends, seven asps for hair that each sway on their own, two thin
// arms, a tattered bridal bodice and (until she tears it) a veil. `bride()` draws one pose;
// every animation is a pose computed from a clock. With `stone` every material is the same
// grey rock. Everything faces right.
import { SheetBuilder, hex } from './pixel';
import { FormCanvas, ramp, Ramp, V } from './form';
import { hash2 } from '../core/util';

export const SB_CELL = { w: 192, h: 160, ax: 96, ay: 156 };
const GY = SB_CELL.ay;
const DEG = Math.PI / 180, TAU = Math.PI * 2;

const SCALE = ramp('#06181a', '#0e3432', '#1c5a4c', '#3a8664', '#74b888', '#b8e4b0');
const BELLY = ramp('#3a3a24', '#6e6a40', '#a8a064', '#d4cc90', '#f2ecc0');
const SKIN = ramp('#2c3a3a', '#52686a', '#84a09a', '#b4ccc0', '#deeee0');
const DRESS = ramp('#3a3440', '#6a6272', '#a09aa4', '#d0ccd0', '#f6f4f2');
const VEIL = ramp('#5a5a70', '#8c8ea4', '#bcc0d0', '#e6eaf2');
const ASP = ramp('#06140e', '#103020', '#20543a', '#3e8258', '#7ab884');
const GOLD = ramp('#4a2c08', '#96641c', '#d8a63c', '#ffe890');
const EYE = ramp('#b07010', '#ffd030', '#fffac0');
const MAW = ramp('#14040a', '#4a0c18', '#8a1c2a');
const STONE = ramp('#1e2224', '#3a4042', '#5c6462', '#848c88', '#aeb6b0', '#d4dad2');

export interface Pose {
  /** How high she rears on her coils, her body's pitch, her head's tilt. */
  rear: number;
  lean: number;
  head: number;
  /** Arms: upper arm and forearm, screen angles in degrees (0 = ahead, 90 = down). */
  armN: V;
  armF: V;
  /** The tail's clock (0..1, it undulates), and how far it is whipped round in front of her (0..1). */
  tail: number;
  lash: number;
  /** The asps: their clock, and how far they stand out from her head (0 hanging .. 1 all straining forward). */
  hair: number;
  flare: number;
  /** Eyes: 0 shut/veiled, 1 open, 2 the gaze (blazing). Mouth 0..1. */
  eyes: number;
  mouth: number;
  /** Cracks in the stone (0..2), when she is drawn as stone. */
  cracks?: number;
  /** The tail's end jammed into a step (0..1): it kinks up and strains. */
  jam?: number;
}

const at = (p: V, a: number, len: number): V => [p[0] + Math.cos(a * DEG) * len, p[1] + Math.sin(a * DEG) * len];
const mixn = (a: number, b: number, t: number) => a + (b - a) * t;
const mixv = (a: V, b: V, t: number): V => [mixn(a[0], b[0], t), mixn(a[1], b[1], t)];
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function bride(P: Pose, veil: boolean, stone = false): FormCanvas {
  const f = new FormCanvas(SB_CELL.w, SB_CELL.h);
  const R = (r: Ramp) => (stone ? STONE : r);
  const cx = SB_CELL.ax;
  const limb = (a: V, b: V, r0: number, r1: number, r: Ramp, flat = 1, tone?: (t: number) => number) => f.limb(a[0], a[1], b[0], b[1], r0, r1, R(r), flat, tone);
  const tw = (d = 0) => Math.sin((P.tail - d) * TAU), hw = (d = 0) => Math.sin((P.hair - d) * TAU);

  // ── the tail: sixteen segments from under her, back along the floor in a slow S with one
  // raised loop; whipped (`lash`), it straightens and swings round in front of her
  const N = 16;
  const seg = (i: number): V => {
    const u = i / (N - 1);
    const back: V = [cx - 8 - u * 74 + Math.sin(u * 5 + P.tail * TAU) * 4, GY - 9 - Math.sin(Math.min(1, u * 2.2) * Math.PI) * 15 * (1 - u * 0.4) - Math.max(0, tw(u)) * 3 * u];
    const jam = P.jam || 0, kink = Math.max(0, (u - 0.62) / 0.38); // the last third bends up into the stone
    const front: V = [cx + 12 + u * 84 - kink * kink * 14 * jam, GY - 8 - Math.sin(u * Math.PI) * 9 * (1 - P.lash) - (1 - u) * 6 - kink * kink * 26 * jam + Math.sin(u * 9 + P.tail * TAU) * 2.5 * jam * (1 - kink)];
    return mixv(back, front, P.lash);
  };
  for (let i = N - 1; i > 0; i--) {
    const a = seg(i), b = seg(i - 1), r0 = 2 + (1 - i / N) * 12, r1 = 2 + (1 - (i - 1) / N) * 12;
    f.next();
    limb(a, b, r0, r1, SCALE, 1, () => (i % 2 ? 0.05 : -0.04));
    // the pale belly along the underside, and a ridge of scales along the back
    f.groove(a[0], a[1] + r0 * 0.7, b[0], b[1] + r1 * 0.7, 0.3);
    if (i % 2 === 0) f.groove(a[0], a[1] - r0 * 0.6, a[0] + 2, a[1] - r0 * 0.1, -0.2);
  }
  // the rattle of bone rings at the tip
  { const t = seg(N - 1), t2 = seg(N - 2); f.next(); limb(t, [t[0] * 2 - t2[0], t[1] * 2 - t2[1]], 2.6, 1, GOLD); }

  // ── the column of her body rising off the coils
  const base: V = [cx - 2, GY - 12];
  const waist: V = [cx + 3 + P.lean * 0.3, GY - 56 - P.rear];
  const ln = P.lean * DEG, cl = Math.cos(ln), sl = Math.sin(ln);
  const B = (x: number, y: number): V => [waist[0] + x * cl - y * sl, waist[1] + x * sl + y * cl]; // torso space: origin at the waist
  f.next();
  limb(base, mixv(base, waist, 0.55), 14.5, 12, SCALE);
  limb(mixv(base, waist, 0.55), waist, 12, 9, SCALE);
  for (let k = 0; k < 6; k++) {
    const p = mixv(base, waist, 0.1 + k * 0.15);
    f.groove(p[0] + 2, p[1] - 1, p[0] + 11, p[1] + 1, 0.26); // belly plates
  }

  const arm = (sh: V, a: V, dim: number) => {
    const el = at(sh, a[0], 17), hand = at(el, a[1], 16);
    f.next();
    f.bias = dim;
    limb(sh, el, 3.6, 2.8, SKIN);
    limb(el, hand, 2.8, 2.2, SKIN);
    f.ball(hand[0], hand[1], 3, 3, R(SKIN));
    for (const off of [-30, 0, 30]) { const tip = at(hand, a[1] + off, 5.5); f.stroke(hand[0], hand[1], tip[0], tip[1], R(DRESS), 0.9 + dim); }
    // a gold bangle
    const w = mixv(el, hand, 0.7);
    f.stroke(...at(w, a[1] + 90, 3), ...at(w, a[1] - 90, 3), R(GOLD), 0.7 + dim, 2);
    f.bias = 0;
  };
  arm(B(7, -30), P.armF, -0.16);

  // ── the veil down her back (the first half of the fight), or its torn ends
  const hc = B(5, -44), hr = P.head * DEG + ln, ch = Math.cos(hr), sh = Math.sin(hr);
  const H = (x: number, y: number): V => [hc[0] + x * ch - y * sh, hc[1] + x * sh + y * ch];
  if (veil) {
    f.next();
    const top = H(-5, -8), sway = hw(0.3) * 4;
    f.poly([top, H(-11, 0), [waist[0] - 22 - sway, waist[1] + 4], [waist[0] - 30 - sway * 1.5, waist[1] + 34], [waist[0] - 12, waist[1] + 26], [waist[0] - 8, waist[1] - 12]], R(VEIL), (x, y) => 0.5 + (x - waist[0]) * 0.012 - (y - waist[1]) * 0.004);
    for (let k = 0; k < 4; k++) f.groove(top[0] - 4 - k * 2, top[1] + 8, waist[0] - 14 - k * 5 - sway, waist[1] + 28, k % 2 ? 0.18 : -0.18); // folds
  } else {
    for (let k = 0; k < 3; k++) {
      const top = H(-6 - k, -6 + k * 2), end = at(top, 120 + k * 16 + hw(0.2 + k * 0.1) * 12, 16 + k * 6);
      f.next();
      limb(top, end, 2.4, 0.8, VEIL, 0.6);
    }
  }

  // ── torso: a narrow waist, a boned bridal bodice gone grey, bare shoulders
  f.next();
  limb(B(0, 0), B(1, -14), 8.5, 9.5, DRESS);
  { const c = B(2, -22); f.ball(c[0], c[1], 10.5, 9, R(DRESS), ln); }
  for (let k = 0; k < 4; k++) f.groove(...B(-5 + k * 3.4, -26), ...B(-4 + k * 3, -2), k % 2 ? -0.16 : 0.12); // the boning
  f.stroke(...B(-8, -1), ...B(9, -2), R(GOLD), 0.65, 2); // a girdle
  for (let k = 0; k < 7; k++) { const p = B(-8 + k * 2.8, 0); const q = at(p, 92 + (k - 3) * 8 + tw(0.2) * 6, 7 + ((k * 5) % 6)); f.stroke(p[0], p[1], q[0], q[1], R(DRESS), k % 2 ? 0.5 : 0.36, 2); } // tatters over the scales
  f.next();
  { const c = B(2, -30); f.ball(c[0], c[1], 9.5, 5, R(SKIN), ln); } // shoulders
  limb(B(3, -32), B(4.5, -38), 3, 2.6, SKIN); // neck
  f.groove(...B(-3, -29), ...B(7, -30), 0.14); // collarbones
  f.dot(...B(4, -27), R(GOLD), 0.9); // a pendant

  // ── the asps: far ones first. Each is two bones and a wedge of a head, and sways on its own clock
  const asp = (k: number, dim: number) => {
    const root = H(-6 + k * 1.6, -6 - Math.sin((k / 6) * Math.PI) * 3);
    const out = -150 + k * 22; // where it points at rest: fanned over the back of her head
    const a0 = mixn(out + hw(k * 0.13) * 16, -30 + (k - 3) * 16 + hw(k * 0.13) * 8, P.flare);
    const mid = at(root, a0, 9 + (k % 3) * 2), tip = at(mid, a0 + 34 * (1 - P.flare) + hw(k * 0.13 + 0.25) * 22, 9 + ((k * 2) % 3) * 2);
    f.next();
    f.bias = dim;
    limb(root, mid, 2.6, 2.1, ASP);
    limb(mid, tip, 2.1, 1.7, ASP);
    f.ball(tip[0], tip[1], 2.8, 2.2, R(ASP));
    f.dot(tip[0] + 1, tip[1] - 1, R(EYE), 0.9);
    f.bias = 0;
  };
  for (const k of [1, 3, 5]) asp(k, -0.18);

  // ── head: a narrow face, heavy lids, a circlet. The gaze fills her eyes with gold
  f.next();
  f.ball(hc[0], hc[1], 8, 8.6, R(SKIN), hr);
  { const c = H(3.4, 4.6 + P.mouth * 1.2); f.ball(c[0], c[1], 4.6, 3.4, R(SKIN), hr); } // jaw
  f.dot(...H(8, 0.5), R(SKIN), 0.75); // nose
  f.groove(...H(2, -3.4), ...H(8, -2.6), -0.26); // brow
  if (P.eyes >= 2 && !stone) {
    f.stroke(...H(3, -1), ...H(7.6, -0.6), EYE, 0.95, 3);
    f.disc(...H(5.4, -0.8), 2.2, EYE, 1);
  } else {
    f.stroke(...H(3.4, -1), ...H(7, -0.7), R(MAW), 0.2, 1.6);
    if (P.eyes >= 1) f.dot(...H(5.6, -0.9), R(EYE), 0.7);
  }
  if (P.mouth > 0.3) {
    f.stroke(...H(4.4, 3.6), ...H(7.2, 3.6 + P.mouth * 2.4), R(MAW), 0.6, 2.4);
    f.dot(...H(6.4, 3.2), R(DRESS), 0.95); // a fang
    f.dot(...H(5, 3.2), R(DRESS), 0.95);
  } else f.stroke(...H(4.8, 3.8), ...H(7.4, 3.6), R(MAW), 0.5);
  f.stroke(...H(-3, -5.6), ...H(7, -6.2), R(GOLD), 0.75, 2); // circlet
  f.dot(...H(6, -6.4), R(EYE), 0.95);
  if (veil && P.eyes < 2 && !stone) {
    // the first half: a lace veil hangs from the circlet over her face (she lifts it to gaze)
    f.next();
    for (let k = 0; k < 4; k++) f.stroke(...H(1 + k * 2.6, -5.4), ...H(2.4 + k * 2.8, 9 + (k % 2) * 1.5), VEIL, 0.22 + (k % 2) * 0.1, 1);
    f.stroke(...H(1, 9.2), ...H(10.6, 10.2), VEIL, 0.4, 1); // its hem
  }
  for (const k of [0, 2, 4, 6]) asp(k, 0);

  // ── near arm, in front of everything
  arm(B(-4, -30), P.armN, 0);

  if (stone) for (let k = 0; k < (P.cracks || 0) * 5; k++) {
    // the stone crumbling: cracks run through her
    const p: V = [cx - 14 + hash2(k, 7) * 36, GY - 110 + hash2(k, 8) * 96];
    const q = at(p, hash2(k, 9) * 360, 8 + hash2(k, 10) * 10), r = at(q, hash2(k, 11) * 360, 7);
    f.groove(p[0], p[1], q[0], q[1], -0.4);
    f.groove(q[0], q[1], r[0], r[1], -0.4);
  }
  return f;
}

// ---------------------------------------------------------------- the poses

const REST: Pose = { rear: 0, lean: 2, head: 0, armN: [78, 40], armF: [70, 30], tail: 0, lash: 0, hair: 0, flare: 0, eyes: 1, mouth: 0 };
const w = (t: number, d = 0) => Math.sin((t - d) * TAU);

/** [name, frames, loops?, pose at t]. One-shots run 0 to 1 once. */
const ANIMS: [string, number, boolean, (t: number) => Pose][] = [
  ['idle', 8, true, (t) => ({ ...REST, rear: w(t) * 2, lean: 2 + w(t, 0.1) * 1.5, head: w(t, 0.2) * 3, armN: [78 + w(t, 0.2) * 4, 40 + w(t, 0.3) * 8], armF: [70 + w(t, 0.25) * 4, 30 + w(t, 0.35) * 8], tail: t, hair: t })],
  ['slither', 8, true, (t) => ({ ...REST, rear: -3 + w(t * 2) * 1.5, lean: 12 + w(t) * 2, head: -6, armN: [40 + w(t) * 10, 10 + w(t, 0.1) * 10], armF: [30 - w(t) * 10, -4 - w(t, 0.1) * 10], tail: t * 2, hair: t, flare: 0.25 })],
  // the tell before the gaze: she rears and hides her face in her hands, the asps rising
  ['cover', 4, true, (t) => ({ ...REST, rear: 10 + w(t), lean: -6, head: 14, armN: [-30, -112 + w(t) * 4], armF: [-16, -100 - w(t) * 4], tail: t, hair: t * 2, flare: 0.4 + w(t) * 0.1, eyes: 0 })],
  // the gaze: arms flung wide, every asp straining forward
  ['gaze', 4, true, (t) => ({ ...REST, rear: 14 + w(t), lean: 4, head: -4 + w(t), armN: [150, 190 + w(t) * 5], armF: [-40, -70 - w(t) * 5], tail: t, hair: t * 2, flare: 1, eyes: 2, mouth: 1 })],
  // the tail: she coils back, then it comes round along the floor like a whip
  ['lash', 8, false, (t) => { const back = ease(t / 0.4), k = ease((t - 0.45) / 0.16); return { ...REST, rear: mixn(back * 8, 2, k), lean: mixn(mixn(2, -12, back), 16, k), head: mixn(0, 8, k), armN: mixv([78, 40], [130, 150], back), armF: [60 - k * 40, 20 - k * 40], tail: t, lash: k, hair: t, flare: back * 0.5, mouth: back }; }],
  // venom: her head goes back, then the asps all spit at once
  ['spit', 4, false, (t) => { const k = ease(t); return { ...REST, rear: 6, lean: mixn(-10, 12, k), head: mixn(-16, 8, k), armN: [110, 130], armF: [100, 120], tail: t * 0.5, hair: t, flare: mixn(0.2, 1, k), mouth: 1 }; }],
  // the second half's spiral: arms up, turning her head as the asps spray
  ['cast', 6, true, (t) => ({ ...REST, rear: 12 + w(t), lean: w(t) * 4, head: w(t, 0.1) * 12, armN: [-110 + w(t) * 6, -70], armF: [-70 - w(t) * 6, -100], tail: t, hair: t * 2, flare: 0.7 + w(t * 2) * 0.3, mouth: 1 })],
  // her tail is caught fast in front of her: she hauls back on it
  ['stuck', 4, true, (t) => ({ ...REST, rear: 2 + w(t) * 2, lean: -14 + w(t) * 4, head: 10 + w(t, 0.2) * 6, armN: [60, 30 + w(t) * 10], armF: [50, 10 - w(t) * 10], tail: t, lash: 1, jam: 1, hair: t * 2, flare: 0.3, mouth: 0.8 })],
];
const STONED: Pose = { ...REST, rear: 14, lean: 4, head: -4, armN: [150, 190], armF: [-40, -70], flare: 1, eyes: 0, mouth: 1 };

const RIM = hex('#ffd880'); // the gold light of the court behind her

export function buildStoneBrideSheet(): SheetBuilder {
  const b = new SheetBuilder(SB_CELL.w, SB_CELL.h, SB_CELL.ax, SB_CELL.ay);
  for (const veil of [true, false])
    for (const [name, n, loop, pose] of ANIMS)
      b.add((veil ? '' : 'torn_') + name, ...Array.from({ length: n }, (_, i) => bride(pose(loop ? i / n : i / (n - 1)), veil).resolve({ rim: RIM, contour: 0.1 })));
  // turned to stone by her own gaze, crumbling a little more each time
  b.add('stone', ...[0, 1, 2].map((c) => bride({ ...STONED, cracks: c }, false, true).resolve({ contour: 0.1 })));
  return b;
}

// ---------------------------------------------------------------- the Rotunda's props

export const RT_CELL = { w: 64, h: 96, ax: 32, ay: 95 };

/** The Rotunda's props (64x96, anchored bottom middle). */
export function buildRotundaSheet(): SheetBuilder {
  const b = new SheetBuilder(RT_CELL.w, RT_CELL.h, RT_CELL.ax, RT_CELL.ay);
  const cx = RT_CELL.ax, by = RT_CELL.ay;
  const BRONZE = ramp('#2a1608', '#5e3a12', '#a06c26', '#d8a850', '#fff2b4', '#ffffff');
  const DULL = ramp('#141a16', '#2c3a30', '#4a6050', '#6e8872');
  const MARBLE = ramp('#2a2e30', '#4e5654', '#7c8680', '#aab4aa', '#d6dcd0');
  const mk = (draw: (f: FormCanvas) => void) => {
    const f = new FormCanvas(RT_CELL.w, RT_CELL.h);
    draw(f);
    return f.resolve({ rim: RIM });
  };
  // a bronze mirror disc on its bracket (the disc's middle is 30 px above the anchor):
  // 0 turned away (its green back), 1 edge-on (turning), 2 its bright face, 3 its face blackened
  const disc = (st: number) => mk((f) => {
    f.limb(cx, by, cx, by - 12, 3, 3, MARBLE); // the bracket
    f.limb(cx - 8, by - 12, cx + 8, by - 12, 2.4, 2.4, BRONZE);
    f.next();
    const cy = by - 30;
    if (st === 1) f.ball(cx, cy, 4, 17, BRONZE);
    else {
      f.ball(cx, cy, 17, 17, st === 2 ? BRONZE : DULL, 0, st === 2 ? 0.5 : 0.8);
      f.next();
      if (st === 2) {
        f.disc(cx, cy, 12, BRONZE, 0.78);
        f.disc(cx - 3, cy - 3, 5, BRONZE, 1);
        for (let k = 0; k < 8; k++) { const a = k * 45; f.dot(...at([cx, cy], a, 15), BRONZE, 0.3); }
      } else if (st === 3) {
        f.disc(cx, cy, 12, DULL, 0.05);
        f.groove(cx - 8, cy - 6, cx + 6, cy + 8, 0.3);
      } else for (let k = 0; k < 3; k++) f.groove(cx - 12 + k * 4, cy - 10, cx - 4 + k * 6, cy + 12, -0.2);
    }
  });
  b.add('disc', disc(0), disc(1), disc(2), disc(3));
  // one drum of a fluted marble column (it stacks)
  b.add('pillar', mk((f) => {
    f.limb(cx, by + 4, cx, by - 100, 13, 13, MARBLE, 0.9);
    for (const x of [-8, -3, 2, 7]) f.groove(cx + x, by - 96, cx + x, by, x < 0 ? -0.14 : 0.12);
    f.groove(cx - 13, by - 48, cx + 13, by - 48, -0.2);
  }));
  // the floor turning to stone: cracks spreading (0), then a bed of stone thorns (1)
  b.add('thorns', mk((f) => {
    for (let k = 0; k < 7; k++) {
      const x = cx - 28 + k * 9 + hash2(k, 3) * 4;
      f.stroke(x, by, x + (hash2(k, 4) - 0.5) * 10, by - 4 - hash2(k, 5) * 4, MARBLE, 0.7, 1.6);
    }
  }), mk((f) => {
    for (let k = 0; k < 8; k++) {
      const x = cx - 28 + k * 8 + hash2(k, 3) * 3, h = 10 + hash2(k, 6) * 12;
      f.next();
      f.limb(x, by, x + (hash2(k, 4) - 0.5) * 8, by - h, 4, 0.5, MARBLE, 0.9);
    }
  }));
  return b;
}
