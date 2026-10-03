// A jointed puppet for upright figures (0.27.0), built on the form-shading tools in form.ts.
//
// The Bell-Mother's sheet showed the way: don't draw frames, pose a skeleton from a clock and
// let the computer draw every in-between. This file is that idea made reusable:
//   - a `Pose` is a flat list of numbers (joint angles in degrees, a few offsets)
//   - `solve()` turns a pose into joint positions, standing the figure on the floor of its cell
//   - a `Rig` draws limbs, torso and anything else between those joints
//   - `keyed()` blends between key poses, and `bake()` renders an animation into a sheet,
//     adding the lag (`sway`) that makes cloth, hair and chains trail behind the motion
// Each boss's art file supplies the proportions (`Build`), the materials and the drawing order.
import { FormCanvas, Ramp } from './form';
import { PixelCanvas, SheetBuilder, RGBA } from './pixel';

export const DEG = Math.PI / 180;
export const TAU = Math.PI * 2;
export type V = [number, number];
/** Joint angles are degrees on screen for a figure facing right: 0 = forward, 90 = down, -90 = up. */
export type Pose = Record<string, number>;

/** A relaxed standing pose: every animation starts from this and changes what it needs. */
export const STAND: Pose = {
  ox: 0, oy: 0, air: 0, // where the hips sit in the cell (px), and how far the feet are off the floor
  lean: 0, head: 0, mouth: 0, // body pitch (positive = forward), head tilt, jaw 0..1
  an1: 82, an2: 62, af1: 100, af2: 78, // near arm (upper, fore), far arm; measured in the body's frame
  ln1: 100, ln2: 90, lf1: 80, lf2: 92, // near leg (thigh, shin), far leg; measured on screen
  sway: 0, breath: 0, // how far loose things hang off true (-1..1), chest swell 0..1
  a: 0, b: 0, c: 0, // spare channels: each boss says what they mean (a weapon's angle, a glow...)
};

/** A figure's proportions, in units of `k` pixels. */
export interface Build {
  k: number;
  torso: number; // hips to shoulders
  hipR: number;
  chestR: number;
  neck: number;
  headR: number;
  /** [upper length, lower length, radius at the top, radius at the end] */
  arm: [number, number, number, number];
  leg: [number, number, number, number];
  foot: number;
  /** Half the gap between the two shoulders / hips as seen from the side. */
  shoulder: number;
  hipW: number;
}
export interface Cell {
  w: number;
  h: number;
  ax: number;
  ay: number;
}
export interface Joints {
  pelvis: V; chest: V; neck: V; head: V;
  shN: V; elN: V; handN: V; shF: V; elF: V; handF: V;
  hipN: V; kneeN: V; footN: V; hipF: V; kneeF: V; footF: V;
  /** The body's pitch and the head's, in radians. */
  lean: number;
  tilt: number;
}

const dir = (deg: number, len: number): V => [Math.cos(deg * DEG) * len, Math.sin(deg * DEG) * len];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];

/** Where every joint is for pose P. The lower foot stands on the cell's floor line (unless `air`). */
export function solve(P: Pose, B: Build, cell: Cell): Joints {
  const k = B.k;
  const kneeN = dir(P.ln1, B.leg[0] * k), footN = add(kneeN, dir(P.ln2, B.leg[1] * k));
  const kneeF = dir(P.lf1, B.leg[0] * k), footF = add(kneeF, dir(P.lf2, B.leg[1] * k));
  const drop = Math.max(footN[1], footF[1]);
  const pelvis: V = [cell.ax + P.ox, cell.ay - drop - B.foot * k * 0.5 - P.air + P.oy];
  const lean = P.lean * DEG, c = Math.cos(lean), s = Math.sin(lean);
  const body = (x: number, y: number): V => [pelvis[0] + (x * c - y * s) * k, pelvis[1] + (x * s + y * c) * k];
  const chest = body(0, -B.torso), neck = body(0.3, -B.torso - B.neck);
  const tilt = lean + P.head * DEG;
  const head: V = [neck[0] + (Math.cos(tilt) * 0.25 + Math.sin(tilt) * 0.85) * B.headR * k, neck[1] + (Math.sin(tilt) * 0.25 - Math.cos(tilt) * 0.85) * B.headR * k];
  const hipN: V = [pelvis[0] - B.hipW * k, pelvis[1]], hipF: V = [pelvis[0] + B.hipW * k, pelvis[1]];
  const shN = body(-B.shoulder, 0.6 - B.torso), shF = body(B.shoulder, 0.3 - B.torso);
  const elN = add(shN, dir(P.an1 + P.lean, B.arm[0] * k)), elF = add(shF, dir(P.af1 + P.lean, B.arm[0] * k));
  return {
    pelvis, chest, neck, head, lean, tilt,
    shN, elN, handN: add(elN, dir(P.an2 + P.lean, B.arm[1] * k)),
    shF, elF, handF: add(elF, dir(P.af2 + P.lean, B.arm[1] * k)),
    hipN, kneeN: add(hipN, kneeN), footN: add(hipN, footN),
    hipF, kneeF: add(hipF, kneeF), footF: add(hipF, footF),
  };
}

/** Drawing tools for one pose of one figure. Lengths and radii are in units of `k`. */
export class Rig {
  k: number;
  J: Joints;
  constructor(public f: FormCanvas, public P: Pose, public B: Build, public cell: Cell) {
    this.k = B.k;
    this.J = solve(P, B, cell);
  }
  /** The point `len` units from `p` along screen angle `deg`. */
  at(p: V, deg: number, len: number): V {
    return [p[0] + Math.cos(deg * DEG) * len * this.k, p[1] + Math.sin(deg * DEG) * len * this.k];
  }
  /** A point in the body's frame: origin at the hips, x forward, y down, turned by the lean. */
  body(x: number, y: number): V {
    const c = Math.cos(this.J.lean), s = Math.sin(this.J.lean), p = this.J.pelvis;
    return [p[0] + (x * c - y * s) * this.k, p[1] + (x * s + y * c) * this.k];
  }
  /** A point in the head's frame: origin at the middle of the head, x toward the face. */
  face(x: number, y: number): V {
    const c = Math.cos(this.J.tilt), s = Math.sin(this.J.tilt), p = this.J.head;
    return [p[0] + (x * c - y * s) * this.k, p[1] + (x * s + y * c) * this.k];
  }
  limb(a: V, b: V, r0: number, r1: number, r: Ramp, flat = 1, tone?: (t: number) => number) {
    this.f.limb(a[0], a[1], b[0], b[1], r0 * this.k, r1 * this.k, r, flat, tone);
  }
  ball(p: V, rx: number, ry: number, r: Ramp, rotDeg = 0, flat = 1) {
    this.f.ball(p[0], p[1], rx * this.k, ry * this.k, r, rotDeg * DEG, flat);
  }
  stroke(a: V, b: V, r: Ramp, lit: number, thick = 1) {
    this.f.stroke(a[0], a[1], b[0], b[1], r, lit, thick);
  }
  groove(a: V, b: V, d: number) {
    this.f.groove(a[0], a[1], b[0], b[1], d);
  }
  dot(p: V, r: Ramp, lit: number) {
    this.f.dot(p[0], p[1], r, lit);
  }
  /** Draw `fn` dimmer (a far-side limb) or brighter. */
  dim(by: number, fn: () => void) {
    this.f.bias += by;
    fn();
    this.f.bias -= by;
  }
  /** A leg: thigh, shin and a foot that lies flat when it is on the floor. `joint` draws a ball at the knee. */
  leg(side: 'N' | 'F', mat: Ramp, shoe: Ramp, joint?: Ramp) {
    const J = this.J, [, , r0, r1] = this.B.leg;
    const hip = side === 'N' ? J.hipN : J.hipF, knee = side === 'N' ? J.kneeN : J.kneeF, foot = side === 'N' ? J.footN : J.footF;
    const shin = side === 'N' ? this.P.ln2 : this.P.lf2;
    this.f.next();
    this.limb(hip, knee, r0, (r0 + r1) / 2, mat);
    this.limb(knee, foot, (r0 + r1) / 2, r1, mat);
    if (joint) this.ball(knee, r0 * 0.8, r0 * 0.8, joint);
    const grounded = foot[1] >= this.cell.ay - this.B.foot * this.k - 1.5 && !this.P.air;
    const toe = grounded ? this.at(foot, 0, this.B.foot) : this.at(foot, shin - 62, this.B.foot);
    this.limb(foot, toe, r1 * 1.1, r1 * 0.8, shoe);
  }
  /** An arm: upper arm, forearm, a hand. `joint` draws a ball at the elbow. */
  arm(side: 'N' | 'F', mat: Ramp, hand: Ramp, joint?: Ramp) {
    const J = this.J, [, , r0, r1] = this.B.arm;
    const sh = side === 'N' ? J.shN : J.shF, el = side === 'N' ? J.elN : J.elF, h = side === 'N' ? J.handN : J.handF;
    this.f.next();
    this.limb(sh, el, r0, (r0 + r1) / 2, mat);
    this.limb(el, h, (r0 + r1) / 2, r1, mat);
    if (joint) this.ball(el, r0 * 0.75, r0 * 0.75, joint);
    this.ball(h, r1 * 1.25, r1 * 1.25, hand);
  }
  /** The trunk: hips, a waist, the ribcage, the neck. */
  torso(mat: Ramp, neckMat: Ramp = mat) {
    const B = this.B, J = this.J;
    this.f.next();
    this.ball(J.pelvis, B.hipR, B.hipR * 0.8, mat, this.P.lean);
    this.limb(J.pelvis, J.chest, B.hipR * 0.82, B.chestR * 0.9, mat);
    this.ball(this.body(0.2, -B.torso + 0.6), B.chestR + this.P.breath * 0.35, B.chestR * 0.95, mat, this.P.lean);
    this.limb(J.chest, J.neck, B.chestR * 0.36, B.chestR * 0.32, neckMat);
  }
  /**
   * A skirt, robe or coat tail: a cone from the waist to a hem `len` units down, `wide` across
   * at the hem, its folds swung by the pose's sway. Hides whatever legs are under it.
   */
  robe(mat: Ramp, len: number, wide: number, top = this.B.hipR, folds = 5) {
    const p = this.J.pelvis, sway = this.P.sway;
    this.f.next();
    for (let i = 0; i < folds; i++) {
      const u = folds === 1 ? 0 : (i / (folds - 1)) * 2 - 1;
      const hem: V = [p[0] + (u * wide - sway * (1.5 + Math.abs(u))) * this.k, Math.min(this.cell.ay - 1, p[1] + len * this.k)];
      this.limb([p[0] + u * top * 0.5 * this.k, p[1] - this.k], hem, top * 0.7, wide / folds + 0.9, mat, 0.8, () => (i % 2 ? -0.08 : 0.04));
    }
  }
}

// ---------------------------------------------------------------- animation

const smooth = (t: number) => t * t * (3 - 2 * t);
export const wave = (t: number, late = 0) => Math.sin((t - late) * TAU);
export const pose = (base: Pose, o: Partial<Pose>): Pose => ({ ...base, ...o }) as Pose;

/**
 * An animation from key poses: `[time 0..1, what differs from base]`, eased from one to the next.
 * Before the first key and after the last it holds them.
 */
export function keyed(base: Pose, ks: [number, Partial<Pose>][]): (t: number) => Pose {
  const full = ks.map(([t, o]) => [t, pose(base, o)] as [number, Pose]);
  return (t) => {
    if (t <= full[0][0]) return { ...full[0][1] };
    for (let i = 1; i < full.length; i++) {
      if (t > full[i][0]) continue;
      const [t0, a] = full[i - 1], [t1, b] = full[i];
      const u = smooth((t - t0) / (t1 - t0 || 1));
      const out: Pose = {};
      for (const key of Object.keys(a)) out[key] = a[key] + (b[key] - a[key]) * u;
      return out;
    }
    return { ...full[full.length - 1][1] };
  };
}

/**
 * Render `n` frames of an animation into a sheet. A looping one covers t = 0..1 without
 * repeating its first frame; a one-shot runs from 0 to 1 inclusive. Loose things lag: each
 * frame's `sway` gets a push from how the body moved since a moment before.
 */
export function bake(b: SheetBuilder, name: string, n: number, fn: (t: number) => Pose, draw: (P: Pose) => PixelCanvas, loop = true) {
  const frames: PixelCanvas[] = [];
  for (let i = 0; i < n; i++) {
    const t = loop ? i / n : n === 1 ? 0 : i / (n - 1);
    const P = fn(t), before = fn(loop ? (t + 0.92) % 1 : Math.max(0, t - 0.08));
    const push = (before.ox - P.ox) * 0.22 + (before.lean - P.lean) * 0.05 + (P.air - before.air) * 0.08;
    P.sway = Math.max(-1.4, Math.min(1.4, (P.sway || 0) + push));
    frames.push(draw(P));
  }
  return b.add(name, ...frames);
}

/** A 64x64 dialogue portrait: the figure drawn large (in a 280px scratch cell), cut out round its head. */
export function bust(render: (cell: Cell) => { f: FormCanvas; head: V }, rim?: RGBA, dy = 2): PixelCanvas {
  const { f, head } = render({ w: 280, h: 280, ax: 130, ay: 270 });
  const big = f.resolve({ rim }), out = new PixelCanvas(64, 64);
  const x0 = Math.round(head[0]) - 30, y0 = Math.round(head[1]) - 30 + dy;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) out.set(x, y, big.get(x0 + x, y0 + y));
  return out;
}
