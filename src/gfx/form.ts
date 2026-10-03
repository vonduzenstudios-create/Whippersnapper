// Form shading: the 16-bit look for big sprites.
//
// PixelCanvas paints flat colors. A FormCanvas paints *forms* instead: every pixel remembers
// which material it is and how much light falls on it, and only at the end (`resolve`) does
// that become a color, picked from the material's ramp (a short list of colors from deep
// shadow to highlight, hue-shifted by hand: shadows lean cool, highlights lean warm).
//
// So a limb is drawn once, as a rounded volume, and comes out with a lit side, a core shadow
// and the right colors. On top of that `resolve` adds what a pixel artist adds by hand:
//   - a contact shadow where one part overlaps another (so feathers and limbs separate)
//   - a cool rim light on the silhouette's edge away from the key light
//   - an outline tinted by the material it borders, lighter on the lit side
import { PixelCanvas, RGBA, hex, mix } from './pixel';

/** A material's colors, darkest first. */
export type Ramp = RGBA[];
export const ramp = (...h: string[]): Ramp => h.map((s) => hex(s));

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface ResolveOpts {
  /** The outline's darkest color. */
  ink?: RGBA;
  /** The rim light's color (omit for no rim light). */
  rim?: RGBA;
  /**
   * How much darker a part gets right beside any part lying over it, whichever side the light
   * is on: the dark line a pixel artist puts round an arm that crosses a body of the same color.
   */
  contour?: number;
  /** false leaves the shape without an outline (flames, glows). */
  outline?: boolean;
}

export class FormCanvas {
  private mat: Int16Array; // ramp number + 1 (0 = empty)
  private lit: Float32Array; // light on the pixel, 0..1
  private part: Int32Array; // the part that painted it (later parts lie on top)
  private hgt: Float32Array; // how far it bulges toward the viewer, within its part
  private ramps: Ramp[] = [];
  private cur = 1;
  /** Unit vector toward the key light (x right, y down, z toward the viewer). */
  L: [number, number, number];
  /** Added to the light of everything drawn from now on (negative for far-side limbs). */
  bias = 0;
  /** Rows below this one are never drawn (a floor to lie on). */
  clipY = Infinity;
  constructor(public w: number, public h: number, light: [number, number, number] = [0.5, -0.65, 0.57]) {
    const n = w * h;
    this.mat = new Int16Array(n);
    this.lit = new Float32Array(n);
    this.part = new Int32Array(n);
    this.hgt = new Float32Array(n);
    const len = Math.hypot(...light);
    this.L = [light[0] / len, light[1] / len, light[2] / len];
  }
  /**
   * Start a new part. Shapes of one part melt together (the higher surface wins); a new part
   * lies on top of everything before it and drops a contact shadow on it.
   */
  next() {
    this.cur++;
  }
  private id(r: Ramp) {
    let i = this.ramps.indexOf(r);
    if (i < 0) i = this.ramps.push(r) - 1;
    return i + 1;
  }
  private put(x: number, y: number, m: number, lit: number, h: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || y > this.clipY) return;
    const i = y * this.w + x;
    if (this.part[i] === this.cur && this.mat[i] && this.hgt[i] > h) return;
    this.mat[i] = m;
    this.lit[i] = clamp01(lit + this.bias);
    this.part[i] = this.cur;
    this.hgt[i] = h;
  }
  /** Light on a surface whose normal is (nx, ny, nz): half-Lambert, so shadows keep some shape. */
  private light(nx: number, ny: number, nz: number) {
    return 0.5 + 0.5 * (nx * this.L[0] + ny * this.L[1] + nz * this.L[2]);
  }
  filled(x: number, y: number) {
    x = Math.round(x);
    y = Math.round(y);
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.mat[y * this.w + x] > 0;
  }

  // ------------------------------------------------------------ volumes

  /** A rounded lump (an ellipsoid seen from the front), turned by `rot`. `flat` < 1 flattens its shading. */
  ball(cx: number, cy: number, rx: number, ry: number, r: Ramp, rot = 0, flat = 1) {
    const m = this.id(r), R = Math.max(rx, ry), c = Math.cos(rot), s = Math.sin(rot);
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x - cx, dy = y - cy;
        const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
        const q = u * u + v * v;
        if (q > 1) continue;
        const nz = Math.sqrt(1 - q * flat * flat);
        const lx = u * flat, ly = v * flat;
        this.put(x, y, m, this.light(lx * c - ly * s, lx * s + ly * c, nz), nz * Math.min(rx, ry));
      }
  }
  /**
   * A limb: a round bar from (x0, y0) to (x1, y1) whose radius goes from r0 to r1.
   * `tone(t)` adds light along its length (t = 0 at the start, 1 at the end).
   */
  limb(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, r: Ramp, flat = 1, tone?: (t: number) => number) {
    const m = this.id(r), R = Math.max(r0, r1);
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++)
      for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
        const t = clamp01(((x - x0) * dx + (y - y0) * dy) / l2);
        const rad = r0 + (r1 - r0) * t;
        const ox = x - (x0 + dx * t), oy = y - (y0 + dy * t);
        const d = Math.hypot(ox, oy);
        if (d > rad) continue;
        const k = flat / (rad || 1);
        const nz = Math.sqrt(Math.max(0, 1 - d * d * k * k));
        this.put(x, y, m, this.light(ox * k, oy * k, nz) + (tone ? tone(t) : 0), nz * rad);
      }
  }
  /** A flat disc at a fixed light (a glow, a flame's heart). */
  disc(cx: number, cy: number, rad: number, r: Ramp, lit: number) {
    const m = this.id(r);
    for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++)
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) this.put(x, y, m, lit, 0);
  }
  /** A flat shape. `lit` is its light: one number, or a function of the pixel for a gradient. */
  poly(pts: [number, number][], r: Ramp, lit: number | ((x: number, y: number) => number)) {
    const m = this.id(r);
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      const sy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.put(x, y, m, typeof lit === 'number' ? lit : lit(x, y), 0);
    }
  }

  // ------------------------------------------------------------ details

  /** One pixel of a material at a given light (an eye, a tooth, a glint). */
  dot(x: number, y: number, r: Ramp, lit: number) {
    this.put(Math.round(x), Math.round(y), this.id(r), lit, 99);
  }
  /** A line of a material at a given light (a hair strand, a claw, a chain). */
  stroke(x0: number, y0: number, x1: number, y1: number, r: Ramp, lit: number, thick = 1) {
    const m = this.id(r);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (thick <= 1) this.put(Math.round(x), Math.round(y), m, lit, 99);
      else {
        const rr = thick / 2;
        for (let j = Math.floor(y - rr); j <= Math.ceil(y + rr); j++)
          for (let i = Math.floor(x - rr); i <= Math.ceil(x + rr); i++) if ((i - x) ** 2 + (j - y) ** 2 <= rr * rr) this.put(i, j, m, lit, 99);
      }
    }
  }
  /** Lighten (d > 0) or darken what is already drawn along a line: a rib, a fold, a feather's shaft. */
  groove(x0: number, y0: number, x1: number, y1: number, d: number) {
    const seen = new Set<number>();
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
      const i = y * this.w + x;
      if (!this.mat[i] || seen.has(i)) continue;
      seen.add(i);
      this.lit[i] = clamp01(this.lit[i] + d);
    }
  }

  // ------------------------------------------------------------ to pixels

  resolve(o: ResolveOpts = {}): PixelCanvas {
    const { w, h, mat, lit, part } = this;
    const ink = o.ink || hex('#0a0810');
    const out = new PixelCanvas(w, h);
    // which way the light comes from on screen
    const sx = this.L[0] >= 0 ? 1 : -1, sy = this.L[1] >= 0 ? 1 : -1;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
    const over = (i: number, x: number, y: number) => {
      const j = at(x, y);
      return j >= 0 && mat[j] > 0 && part[j] > part[i];
    };
    const empty = (x: number, y: number) => {
      const j = at(x, y);
      return j < 0 || mat[j] === 0;
    };
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mat[i]) continue;
        const r = this.ramps[mat[i] - 1], n = r.length;
        let l = lit[i];
        // a part lying over this one, on the side the light comes from, shades it
        if (over(i, x + sx, y) || over(i, x, y + sy) || over(i, x + sx, y + sy)) l -= 0.26;
        else if (over(i, x + 2 * sx, y + 2 * sy) || over(i, x + 2 * sx, y) || over(i, x, y + 2 * sy)) l -= 0.12;
        if (o.contour && (over(i, x - sx, y) || over(i, x, y - sy))) l -= o.contour;
        let band = Math.max(0, Math.min(n - 1, Math.floor(clamp01(l) * n)));
        let c = r[band];
        // rim light: the silhouette's edge that faces away from the key light
        if (o.rim && empty(x - sx, y) && band < n - 1) {
          band = Math.min(n - 1, band + 1);
          c = mix(r[band], o.rim, 0.3);
        }
        out.set(x, y, c);
      }
    if (o.outline === false) return out;
    // the outline, tinted by what it borders and lighter where the light hits
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (mat[y * w + x]) continue;
        let best = -1, lightSide = false;
        for (const [dx, dy] of [[-sx, 0], [0, -sy], [sx, 0], [0, sy]]) {
          const j = at(x + dx, y + dy);
          if (j < 0 || !mat[j]) continue;
          if (best < 0) {
            best = j;
            // the filled pixel lies away from the light, so this edge of it is the lit one
            lightSide = dx === -sx || dy === -sy;
          }
        }
        if (best < 0) continue;
        const r = this.ramps[mat[best] - 1];
        out.set(x, y, mix(ink, r[0], lightSide ? 0.75 : 0.3));
      }
    return out;
  }
}

export type V = [number, number];

/**
 * Drawing tools for one piece of a puppet: the piece is described in its own space (x toward
 * its nose, y toward its belly, in units of `k` pixels) and turned by `a` radians onto the
 * canvas at (cx, cy). With `mirror`, a piece heading left is flipped top to bottom, so what
 * is on top of it stays on top.
 */
export function turned(f: FormCanvas, cx: number, cy: number, a: number, mirror: boolean, k = 1) {
  const c = Math.cos(a), s = Math.sin(a), m = mirror && c < 0 ? -1 : 1;
  const T = (x: number, y: number): V => [cx + (x * c - y * m * s) * k, cy + (x * s + y * m * c) * k];
  return {
    T,
    limb(a0: V, a1: V, r0: number, r1: number, r: Ramp, flat = 1, tone?: (t: number) => number) {
      const p = T(...a0), q = T(...a1);
      f.limb(p[0], p[1], q[0], q[1], r0 * k, r1 * k, r, flat, tone);
    },
    ball(x: number, y: number, rx: number, ry: number, r: Ramp, flat = 1) {
      const p = T(x, y);
      f.ball(p[0], p[1], rx * k, ry * k, r, a, flat);
    },
    stroke(a0: V, a1: V, r: Ramp, lit: number, thick = 1) {
      const p = T(...a0), q = T(...a1);
      f.stroke(p[0], p[1], q[0], q[1], r, lit, thick);
    },
    groove(a0: V, a1: V, d: number) {
      const p = T(...a0), q = T(...a1);
      f.groove(p[0], p[1], q[0], q[1], d);
    },
    dot(x: number, y: number, r: Ramp, lit: number) {
      f.dot(...T(x, y), r, lit);
    },
  };
}
