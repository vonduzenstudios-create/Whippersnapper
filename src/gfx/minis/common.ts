// What the ten mini-bosses' art shares (0.28.0): common materials, a seeded random, and the
// small props sheet each one keeps for its projectiles.
//
// Each mini-boss is a puppet (see ../puppet.ts): a Build, a draw function for one Pose, and
// animations made of key poses. Its file exports `build<Name>Sheet()` (the body, faces right)
// and `build<Name>Props()` (cages, vials, flames... small things the AI throws around).
import { hex } from '../pixel';
import { ramp } from '../form';
import { V, DEG } from '../puppet';

export const IRON = ramp('#0c0c12', '#1e1e28', '#363644', '#585868', '#8a8a9c', '#c4c4d2');
export const STEEL = ramp('#0e1218', '#242a34', '#424a58', '#6a7484', '#a2acbc', '#e2eaf4');
export const WOOD = ramp('#1a0e06', '#36200e', '#583818', '#7c5426', '#a07438');
export const BONE = ramp('#2a1c22', '#5a4a48', '#8a7a62', '#b8aa88', '#dcd0b4', '#f6eed8');
export const LEATHER = ramp('#140a06', '#2c1810', '#4a2c18', '#6e4626', '#946238');
export const BLOOD = ramp('#1c0204', '#3e060a', '#6a0e12', '#9a1c1c', '#c83a2c');
export const INK = ramp('#06040a', '#14101c');
export const GOLD = ramp('#2a1608', '#5c3410', '#96621c', '#c89638', '#f0cc68', '#fff2b8');
/** The cool rim light most of them share. */
export const RIM = hex('#8ea4d8');

/** A small seeded random, so scars and cracks land in the same place every frame. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The point `len` px from `p` along screen angle `deg`. */
export const toward = (p: V, deg: number, len: number): V => [p[0] + Math.cos(deg * DEG) * len, p[1] + Math.sin(deg * DEG) * len];
/** Linear blend between two points. */
export const lerpV = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Screen angle (degrees) from a to b. */
export const angle = (a: V, b: V) => Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;
