// A tiny software pixel painter used to generate every sprite procedurally.
export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();
export function hex(h: string, a = 255): RGBA {
  const key = h + a;
  const c = cache.get(key);
  if (c) return c;
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  const v: RGBA = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), a];
  cache.set(key, v);
  return v;
}
export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}
export function shade(c: RGBA, f: number): RGBA {
  return [Math.min(255, Math.round(c[0] * f)), Math.min(255, Math.round(c[1] * f)), Math.min(255, Math.round(c[2] * f)), c[3]];
}

export class PixelCanvas {
  data: Uint8ClampedArray;
  constructor(public w: number, public h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  inb(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, c: RGBA) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inb(x, y) || c[3] === 0) return;
    const i = (y * this.w + x) * 4;
    if (c[3] >= 255) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
    } else {
      const a = c[3] / 255;
      const da = this.data[i + 3] / 255;
      const oa = a + da * (1 - a);
      if (oa <= 0) return;
      for (let k = 0; k < 3; k++) this.data[i + k] = (c[k] * a + this.data[i + k] * da * (1 - a)) / oa;
      this.data[i + 3] = oa * 255;
    }
  }
  get(x: number, y: number): RGBA {
    if (!this.inb(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  alpha(x: number, y: number) {
    if (!this.inb(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }
  clear(x: number, y: number) {
    if (!this.inb(x, y)) return;
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }
  rect(x: number, y: number, w: number, h: number, c: RGBA) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  circle(cx: number, cy: number, r: number, c: RGBA) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.set(x, y, c);
      }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }
  /** Thick line made of stamped discs (thick<=1 → bresenham). */
  line(x0: number, y0: number, x1: number, y1: number, c: RGBA, thick = 1) {
    const len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    const steps = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (thick <= 1) this.set(x, y, c);
      else this.circle(x, y, thick / 2, c);
    }
  }
  poly(pts: [number, number][], c: RGBA) {
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
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
          xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  /** Adds a 1px outline around all opaque pixels. */
  outline(c: RGBA, diag = false) {
    const mark: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        if (
          this.alpha(x - 1, y) > 0 || this.alpha(x + 1, y) > 0 || this.alpha(x, y - 1) > 0 || this.alpha(x, y + 1) > 0 ||
          (diag && (this.alpha(x - 1, y - 1) > 0 || this.alpha(x + 1, y + 1) > 0 || this.alpha(x + 1, y - 1) > 0 || this.alpha(x - 1, y + 1) > 0))
        )
          mark.push(x, y);
      }
    for (let i = 0; i < mark.length; i += 2) this.set(mark[i], mark[i + 1], c);
  }
  /** Replace every opaque pixel's color via a function. */
  map(fn: (c: RGBA, x: number, y: number) => RGBA | null) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        const n = fn(c, x, y);
        const i = (y * this.w + x) * 4;
        if (!n) {
          this.data[i + 3] = 0;
          continue;
        }
        this.data[i] = n[0];
        this.data[i + 1] = n[1];
        this.data[i + 2] = n[2];
        this.data[i + 3] = n[3];
      }
  }
  blit(src: PixelCanvas, dx: number, dy: number, flip = false) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flip ? src.w - 1 - x : x, y);
        if (c[3]) this.set(dx + x, dy + y, c);
      }
  }
  clone() {
    const p = new PixelCanvas(this.w, this.h);
    p.data.set(this.data);
    return p;
  }
  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

/** Packs equal-sized frames into a grid canvas and remembers named animations. */
export class SheetBuilder {
  frames: PixelCanvas[] = [];
  anims: Record<string, number[]> = {};
  meta: Record<number, any> = {};
  /**
   * Animations drawn with in-betweens: `rate[name]` = how many frames there are now for each
   * one the game's timing was written for. Sprite.anim() plays those that many times faster,
   * so a smoother cycle still takes the same time.
   */
  rate: Record<string, number> = {};
  constructor(public cw: number, public ch: number, public ax: number, public ay: number) {}
  add(name: string, ...frames: PixelCanvas[]) {
    const idx: number[] = [];
    for (const f of frames) {
      idx.push(this.frames.length);
      this.frames.push(f);
    }
    this.anims[name] = idx;
    return idx;
  }
  /** Add a looping animation that has `rate` times the frames its playback speed was tuned for. */
  smooth(name: string, rate: number, ...frames: PixelCanvas[]) {
    this.rate[name] = rate;
    return this.add(name, ...frames);
  }
  canvas() {
    return new PixelCanvas(this.cw, this.ch);
  }
}
