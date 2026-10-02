export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const approach = (v: number, target: number, step: number) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);
export const deg = (d: number) => (d * Math.PI) / 180;
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);

/** Small deterministic PRNG (mulberry32) so generated art is stable between runs. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash two ints to [0,1) — used for stable per-tile variation. */
export function hash2(x: number, y: number, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

export function rand(a = 0, b = 1) {
  return a + Math.random() * (b - a);
}
export function randInt(a: number, b: number) {
  return Math.floor(rand(a, b + 1));
}
export function chance(p: number) {
  return Math.random() < p;
}

export interface Box {
  x: number; // center
  y: number; // center
  hw: number;
  hh: number;
}
export function overlap(a: Box, b: Box) {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
}
export function pointInBox(px: number, py: number, b: Box, pad = 0) {
  return Math.abs(px - b.x) < b.hw + pad && Math.abs(py - b.y) < b.hh + pad;
}
