// The Umbral Stalker: a lank four-legged thing of shadow with a bone mask for a face, ember
// eyes, a mane of smoke and a long whip of a tail. Its own puppet (a quadruped, so not the
// upright Rig): a spine between hips and chest, four legs of two bones, a neck, a jaw.
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Cell, Pose, V, DEG, keyed, bake, wave, pose, bust } from './puppet';

export const STALKER_CELL: Cell = { w: 184, h: 116, ax: 92, ay: 104 };

const SHADE = ramp('#030208', '#0a0616', '#150e28', '#241a40', '#3a2c5e', '#5a4a86');
const BONE = ramp('#2e2838', '#665e68', '#a09888', '#d2cab0', '#f2ecd8');
const EMBER = ramp('#8a1c08', '#f06010', '#ffc040', '#fff8c0');
const MAW = ramp('#12040a', '#4a0c18', '#8a1a24');
const RIM = hex('#6a58c0');

/**
 * Angles are degrees on screen (90 = straight down). f = front legs, b = back legs, 1 = upper
 * bone, 2 = lower; N = near side, F = far. `pitch` tips the spine (positive = head down).
 */
const BASE: Pose = {
  ox: 0, oy: 0, air: 0, pitch: 0, neck: -28, head: 10, jaw: 0.1, eye: 0.7,
  fN1: 78, fN2: 100, fF1: 96, fF2: 96, bN1: 112, bN2: 70, bF1: 94, bF2: 74,
  tail: 0, sway: 0, mane: 0.5,
};

export function stalker(P: Pose, cell: Cell = STALKER_CELL, k = 1.5): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const at = (p: V, deg: number, len: number): V => [p[0] + Math.cos(deg * DEG) * len * k, p[1] + Math.sin(deg * DEG) * len * k];
  const UP = 10, LO = 11; // leg bones
  const legEnd = (a1: number, a2: number) => Math.sin(a1 * DEG) * UP + Math.sin(a2 * DEG) * LO;
  // the spine: hips behind, chest ahead, tipped by the pitch; then stand it on its lowest foot
  const half = 12, c = Math.cos(P.pitch * DEG), s = Math.sin(P.pitch * DEG);
  const drop = Math.max(legEnd(P.fN1, P.fN2) + s * half, legEnd(P.fF1, P.fF2) + s * half, legEnd(P.bN1, P.bN2) - s * half, legEnd(P.bF1, P.bF2) - s * half);
  const mid: V = [cell.ax + P.ox, cell.ay - (drop + 2.5) * k - P.air + P.oy];
  const chest: V = [mid[0] + c * half * k, mid[1] + s * half * k], hips: V = [mid[0] - c * half * k, mid[1] - s * half * k];
  const limb = (a: V, b: V, r0: number, r1: number, m = SHADE, flat = 1, tone?: (t: number) => number) => f.limb(a[0], a[1], b[0], b[1], r0 * k, r1 * k, m, flat, tone);
  const leg = (root: V, a1: number, a2: number, thick: number) => {
    const knee = at(root, a1, UP), foot = at(knee, a2, LO);
    f.next();
    limb(root, knee, thick, thick * 0.6);
    limb(knee, foot, thick * 0.6, thick * 0.42);
    const toe = at(foot, 8, 3.4);
    limb(foot, toe, 1.5, 1.1);
    for (let i = 0; i < 3; i++) f.stroke(toe[0] - i * 1.6 * k, toe[1] - 1, toe[0] - i * 1.6 * k + 2.2 * k, toe[1] + 1.4 * k, BONE, 0.85); // claws
  };
  // far legs, dimmer
  f.bias = -0.14;
  leg([hips[0] + 2 * k, hips[1]], P.bF1, P.bF2, 3.2);
  leg([chest[0] + 2 * k, chest[1] + k], P.fF1, P.fF2, 2.6);
  f.bias = 0;
  // the tail: three bones, each lagging the one before
  f.next();
  let tp = at(hips, 180 + P.pitch, 3), ta = 200 + P.pitch + P.tail * 20;
  for (let i = 0; i < 4; i++) {
    const nx = at(tp, ta, 8);
    limb(tp, nx, 1.6 - i * 0.34, 1.3 - i * 0.34);
    tp = nx;
    ta += -24 + P.tail * 26 + P.sway * 14 * (i + 1) * 0.4;
  }
  // trunk: a deep chest, a tucked waist, lean hips
  f.next();
  f.ball(hips[0], hips[1], 6.6 * k, 5.4 * k, SHADE, P.pitch * DEG);
  limb(hips, chest, 4.4, 5.6);
  f.ball(chest[0], chest[1] + k, 7.4 * k, 7 * k, SHADE, P.pitch * DEG);
  for (let i = 0; i < 4; i++) f.groove(chest[0] - (2 + i * 2.6) * k, chest[1] - 3 * k, chest[0] - (3.4 + i * 2.6) * k, chest[1] + 5 * k, -0.16); // ribs
  // the mane: smoke standing off the spine, blown back by the motion
  for (let i = 0; i < 9; i++) {
    const u = i / 8, root: V = [hips[0] + (chest[0] - hips[0]) * (0.2 + u * 0.95), hips[1] + (chest[1] - hips[1]) * (0.2 + u * 0.95) - 4.6 * k];
    const len = (3.5 + ((i * 7) % 5) + P.mane * 4) * (i > 5 ? 1.25 : 1);
    const tip = at(root, -100 - P.sway * 32 - (i % 3) * 9 + Math.sin(P.mane * 6 + i) * 10, len);
    f.next();
    limb(root, tip, 1.5, 0.3, SHADE, 0.7, (t) => t * 0.3 - 0.1);
  }
  // near legs
  leg([hips[0] - k, hips[1] + k], P.bN1, P.bN2, 3.6);
  leg([chest[0] - 2 * k, chest[1] + 2 * k], P.fN1, P.fN2, 3);
  // neck and head: the skull is a mask of old bone over the dark
  f.next();
  const nk = at(chest, P.neck + P.pitch, 9), ha = P.head + P.pitch;
  limb([chest[0] + 2 * k, chest[1] - 3 * k], nk, 4.2, 2.8);
  const snout = at(nk, ha, 11), jaw = at(at(nk, ha + 70, 2.4), ha + 12 + P.jaw * 34, 9.5);
  f.next();
  limb(at(nk, ha + 70, 2.4), jaw, 2, 0.9, MAW, 0.8); // the lower jaw
  if (P.jaw > 0.3) for (let i = 1; i < 4; i++) {
    const q = at(at(nk, ha + 70, 2.4), ha + 12 + P.jaw * 34, i * 2.6);
    f.stroke(q[0], q[1], q[0] + Math.sin(ha * DEG) * 2 * k, q[1] - Math.cos(ha * DEG) * 2 * k, BONE, 0.9);
  }
  f.next();
  f.ball(nk[0], nk[1], 4.8 * k, 4.2 * k, BONE, ha * DEG);
  limb(nk, snout, 3.6, 1.7, BONE);
  for (let i = 1; i < 4; i++) {
    const q = at(nk, ha + 14, 2.5 + i * 2.4);
    f.stroke(q[0], q[1], q[0] - Math.sin(ha * DEG) * 2.4 * k, q[1] + Math.cos(ha * DEG) * 2.4 * k, BONE, 0.95); // fangs
  }
  // horns swept back, a cracked brow, the eye
  for (const d of [0, 1]) limb(at(nk, ha - 120 - d * 20, 3), at(nk, ha - 160 - d * 12 - P.sway * 6, 12 - d * 3), 1.3, 0.3, BONE);
  f.groove(...at(nk, ha - 60, 3.6), ...at(nk, ha - 20, 7), -0.3);
  const eye = at(nk, ha - 26, 4.4);
  f.disc(eye[0], eye[1], 1.5 * k, MAW, 0.1);
  f.dot(eye[0], eye[1], EMBER, 0.3 + P.eye * 0.7);
  f.dot(eye[0] + 1, eye[1], EMBER, P.eye);
  return { f, head: at(nk, ha, 3) };
}

const draw = (P: Pose) => stalker(P).f.resolve({ rim: RIM, contour: 0.14 });

const idle = (t: number): Pose => pose(BASE, { oy: wave(t) * 0.8, head: 10 + wave(t, 0.2) * 5, tail: wave(t, 0.1) * 0.6, mane: 0.5 + wave(t) * 0.3, jaw: 0.1 + Math.max(0, wave(t)) * 0.15, eye: 0.7 + wave(t * 2) * 0.3 });
/** A stalking walk: diagonal pairs, shoulders low, head lower. */
const prowl = (t: number): Pose => {
  const s = wave(t), q = wave(t, 0.25);
  return pose(BASE, {
    pitch: 5 + q * 2, neck: -8, head: 16 + s * 3, oy: Math.abs(q) * -1,
    fN1: 84 + s * 24, fN2: 98 + s * 14 + Math.max(0, q) * 20, fF1: 84 - s * 24, fF2: 98 - s * 14 + Math.max(0, -q) * 20,
    bN1: 108 - s * 20, bN2: 72 - s * 10 - Math.max(0, -q) * 16, bF1: 108 + s * 20, bF2: 72 + s * 10 - Math.max(0, q) * 16,
    tail: s * 0.8, mane: 0.5 + q * 0.4, sway: 0.4, eye: 0.9,
  });
};
/** The tell before a lunge: haunches up, chest to the floor, jaw wide. */
const crouch = keyed(BASE, [
  [0, {}],
  [0.6, { pitch: 20, neck: -4, head: -6, jaw: 1, fN1: 40, fN2: 120, fF1: 52, fF2: 118, bN1: 122, bN2: 62, bF1: 110, bF2: 66, tail: -1, mane: 1, eye: 1, ox: -4 }],
  [1, { pitch: 23, neck: -2, head: -8, jaw: 1, fN1: 36, fN2: 124, fF1: 48, fF2: 122, bN1: 126, bN2: 58, bF1: 114, bF2: 62, tail: -1, mane: 1, eye: 1, ox: -7 }],
]);
const leap = (t: number): Pose => pose(BASE, { air: 6, pitch: -10 + t * 22, neck: -10, head: 4, jaw: 1, fN1: 12 + wave(t) * 4, fN2: 28, fF1: 24, fF2: 40, bN1: 158, bN2: 150, bF1: 148, bF2: 140, tail: 0.6, sway: 1, mane: 1, eye: 1 });
/** Reared on its hind legs, one forepaw coming down. */
const rake = keyed(BASE, [
  [0, {}],
  [0.35, { pitch: -34, neck: -30, head: 34, jaw: 0.8, fN1: -70, fN2: -30, fF1: -20, fF2: 30, bN1: 100, bN2: 84, bF1: 84, bF2: 90, eye: 1, mane: 1 }],
  [0.6, { pitch: -8, neck: -16, head: 20, jaw: 1, fN1: 30, fN2: 60, fF1: -30, fF2: 10, bN1: 108, bN2: 76, bF1: 90, bF2: 84, eye: 1, mane: 1, ox: 4 }],
  [0.8, { pitch: 4, neck: -14, head: 16, jaw: 1, fN1: 70, fN2: 96, fF1: 40, fF2: 70, eye: 1, mane: 0.8, ox: 5 }],
  [1, {}],
]);
/** Caught in the light: flattened, head turned under a foreleg, shaking. */
const stun = (t: number): Pose => pose(BASE, { pitch: 10 + wave(t * 2) * 2, neck: 30, head: 60 + wave(t * 2) * 6, jaw: 0.6, fN1: 20, fN2: 150, fF1: 30, fF2: 140, bN1: 150, bN2: 20, bF1: 140, bF2: 30, tail: -1, mane: 0.1, eye: 0.15, ox: wave(t * 3) * 1.2 });

export function buildStalkerSheet(): SheetBuilder {
  const C = STALKER_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'prowl', 10, prowl, draw);
  bake(b, 'crouch', 6, crouch, draw, false);
  bake(b, 'leap', 4, leap, draw, false);
  bake(b, 'rake', 10, rake, draw, false);
  bake(b, 'stun', 6, stun, draw);
  return b;
}

export function stalkerPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => stalker(pose(BASE, { jaw: angry ? 1 : 0.15, head: angry ? -4 : 10, eye: 1, mane: 1, ox: -30 }), cell, 3), RIM, 4);
}

/** 40x56, anchored at the lantern's ring: `lit` (4 frames), `dark`. */
export function buildLanternSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 56, 20, 6);
  const IRON = ramp('#0c0a12', '#22202c', '#403c4c', '#68647a');
  const lantern = (heat: number) => {
    const f = new FormCanvas(40, 56);
    f.ball(20, 6, 3.4, 3.4, IRON);
    f.poly([[10, 14], [30, 14], [24, 8], [16, 8]], IRON, 0.5);
    f.limb(11, 15, 29, 15, 1.6, 1.6, IRON, 0.8);
    f.next();
    if (heat > 0) {
      f.poly([[12, 17], [28, 17], [26, 40], [14, 40]], EMBER, (_x, y) => heat * (0.35 + (y - 17) * 0.02));
      f.ball(20, 31 - heat * 2, 3.4, 5 + heat * 2, EMBER, 0, 0.3);
    } else f.poly([[12, 17], [28, 17], [26, 40], [14, 40]], SHADE, 0.3);
    f.next();
    for (const x of [12, 20, 28]) f.limb(x, 16, x === 20 ? 20 : x + (x < 20 ? 2 : -2), 41, 0.9, 0.9, IRON, 0.8);
    f.limb(13, 42, 27, 42, 2, 2, IRON, 0.8);
    return f.resolve({ rim: RIM });
  };
  b.add('lit', lantern(0.7), lantern(1), lantern(0.85), lantern(1));
  b.add('dark', lantern(0));
  return b;
}
