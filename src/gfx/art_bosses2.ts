// The 0.19.0 redraw of the six newer bosses, and the props their fights use. Each sheet is
// drawn as flat shapes first, then `relief()` gives every form a lit top-left edge, a shaded
// bottom-right edge and a little grain, so the big sprites don't read as flat cut-outs.
// Everything faces right.
import { PixelCanvas, SheetBuilder, hex, RGBA, shade, mix } from './pixel';
import { hash2 } from '../core/util';

const INK = hex('#0a0810');
const WHITE = hex('#f6f2e6');

/** A limb or body drawn as a line that changes thickness from r0 to r1. */
function taper(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: RGBA) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, c);
  }
}

/**
 * Shade a flat drawing: pixels on an upper or left edge catch the light, pixels on a lower or
 * right edge fall into shadow (two pixels deep), and everything gets a faint grain. Colors
 * named in `keep` (eyes, glows) are left alone. Then a dark outline.
 */
function relief(p: PixelCanvas, strength = 1, keep: RGBA[] = [], seed = 1) {
  const src = p.clone();
  const solid = (x: number, y: number) => src.alpha(x, y) > 200;
  const kept = (c: RGBA) => keep.some((k) => k[0] === c[0] && k[1] === c[1] && k[2] === c[2]);
  p.map((c, x, y) => {
    if (c[3] < 200 || kept(c)) return c;
    let f = 1;
    if (!solid(x, y - 1) || !solid(x - 1, y)) f += 0.3 * strength;
    else if (!solid(x, y - 2) || !solid(x - 2, y)) f += 0.14 * strength;
    if (!solid(x, y + 1) || !solid(x + 1, y)) f -= 0.3 * strength;
    else if (!solid(x, y + 2) || !solid(x + 2, y)) f -= 0.16 * strength;
    f += (hash2(x, y, seed) - 0.5) * 0.1 * strength;
    return shade(c, f);
  });
  p.outline(INK);
}

// ---------------------------------------------------------------- the Sump Leviathan

/**
 * An armored eel the size of a barge: barnacled iron-grey plates over a pale soft belly, a
 * blind scarred eye, and a broken harpoon standing in its back with a ring on the shaft.
 * 96x80 cells anchored at the center. `head` 0-2 (jaws shut to wide), `seg` (plain, finned,
 * small), `tail`, and `harpoon` (drawn over the first segment in phase 2).
 */
export function buildLeviathanSheet(): SheetBuilder {
  const b = new SheetBuilder(96, 80, 48, 40);
  const plate = hex('#4c5c66'), plateD = hex('#28343c'), plateL = hex('#7e929c'), belly = hex('#c2cfc2'), bellyD = hex('#8a9c94');
  const gum = hex('#7a1626'), barn = hex('#a8a48c'), scar = hex('#b06a6a'), eye = hex('#e4ecdc');
  /** Overlapping armor plates along the top of a body ellipse. */
  const plates = (p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const x = cx - rx + ((i + 0.5) / n) * rx * 2;
      const top = cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
      p.poly([[x - rx / n - 1, top + 1], [x + rx / n + 1, top + 1], [x + rx / n - 2, cy + 2], [x - rx / n + 2, cy + 2]], i % 2 ? plate : plateD);
      p.line(x - rx / n, top + 2, x + rx / n, top + 2, plateL);
      if (hash2(i, n, 7) < 0.5) p.circle(x + 1, top + 6 + hash2(i, n, 8) * 6, 1.6, barn); // barnacles
    }
  };
  const head = (open: number) => {
    const p = b.canvas();
    // skull and jowl
    p.ellipse(34, 40, 30, 24, plate);
    p.ellipse(32, 52, 27, 13, belly);
    p.ellipse(28, 56, 20, 7, bellyD);
    plates(p, 30, 38, 26, 22, 5);
    // the long upper jaw, a bony ridge down it
    p.poly([[46, 22], [90, 30 - open * 5], [92, 38 - open * 3], [46, 42]], plate);
    p.poly([[46, 22], [90, 30 - open * 5], [70, 30 - open * 3]], plateL);
    p.line(52, 26, 86, 31 - open * 5, plateD, 2);
    // lower jaw
    p.poly([[42, 46], [88, 44 + open * 9], [84, 54 + open * 10], [40, 60]], belly);
    p.poly([[42, 56], [84, 52 + open * 10], [84, 55 + open * 10], [40, 60]], bellyD);
    if (open > 0.1) p.poly([[48, 42], [90, 38 - open * 3], [88, 44 + open * 9], [48, 46]], gum);
    // teeth: long, uneven, some broken
    for (let i = 0; i < 9; i++) {
      const x = 52 + i * 4.4, len = 4 + ((i * 5) % 4);
      if (i === 5) continue;
      p.poly([[x, 40 - open * 3 - (i / 9) * 2], [x + 3, 40 - open * 3 - (i / 9) * 2], [x + 1.5, 40 - open * 3 + len]], WHITE);
      if (i % 2 === 0) p.poly([[x + 1, 45 + open * 9], [x + 4, 45 + open * 9], [x + 2.5, 45 + open * 9 - len + 1]], WHITE);
    }
    // the blind eye in a scarred socket, gill slits, whisker barbels
    p.ellipse(50, 28, 6, 5, plateD);
    p.circle(50, 28, 3.6, eye);
    p.line(43, 21, 57, 35, scar, 2);
    p.line(46, 19, 58, 31, scar);
    for (let i = 0; i < 4; i++) p.line(16 + i * 5, 34, 13 + i * 5, 48, plateD, 1.6);
    taper(p, 82, 48 + open * 9, 94, 58 + open * 8, 1.4, 0.6, bellyD);
    taper(p, 76, 50 + open * 9, 84, 64 + open * 8, 1.4, 0.6, bellyD);
    // a torn dorsal crest
    p.poly([[6, 26], [14, 6], [20, 22], [28, 4], [34, 18], [40, 8], [42, 20]], plateD);
    relief(p, 1, [eye, WHITE, gum], 3);
    return p;
  };
  const seg = (r: number, fin: boolean, k: number) => {
    const p = b.canvas();
    p.ellipse(48, 40, r + 14, r, plate);
    p.ellipse(48, 40 + r * 0.5, r + 11, r * 0.52, belly);
    p.ellipse(48, 40 + r * 0.72, r + 4, r * 0.25, bellyD);
    plates(p, 48, 40, r + 12, r, 4 + (k % 2));
    if (fin) {
      p.poly([[30, 40 - r + 2], [44, 40 - r - 16], [50, 40 - r - 4], [58, 40 - r - 12], [66, 40 - r + 2]], plateD);
      for (let i = 0; i < 4; i++) p.line(36 + i * 7, 40 - r + 1, 42 + i * 5, 40 - r - 11, plateL);
    }
    // a side fin and old scars
    p.poly([[40, 40 + r * 0.3], [28, 40 + r + 8], [52, 40 + r * 0.6]], bellyD);
    p.line(56, 34, 66, 40, scar);
    relief(p, 1, [], 5 + k);
    return p;
  };
  const tail = () => {
    const p = b.canvas();
    taper(p, 84, 40, 40, 40, 14, 5, plate);
    taper(p, 84, 46, 44, 43, 7, 2, belly);
    p.poly([[42, 40], [6, 12], [18, 38], [4, 66], [40, 44]], plateD);
    for (let i = 0; i < 5; i++) p.line(40, 40, 10 + i * 2, 16 + i * 11, plateL);
    relief(p, 1, [], 9);
    return p;
  };
  const harpoon = () => {
    const p = b.canvas();
    const iron = hex('#6a6058'), rust = hex('#8a4a2a'), gold = hex('#e8c860');
    p.line(46, 34, 56, 4, iron, 3);
    p.line(47, 30, 55, 8, rust);
    p.circle(57, 2, 0.1, iron);
    // the ring you catch, with a glint
    p.circle(58, 6, 7, gold);
    p.circle(58, 6, 4.4, [0, 0, 0, 0] as RGBA);
    for (let y = 1; y <= 11; y++) for (let x = 53; x <= 63; x++) if (Math.hypot(x - 58, y - 6) < 4.4) p.clear(x, y);
    p.set(54, 3, WHITE);
    // a trailing length of rotten rope
    p.line(48, 30, 38, 26, hex('#7a6a4a'));
    p.line(38, 26, 34, 32, hex('#7a6a4a'));
    p.outline(INK);
    return p;
  };
  b.add('head', head(0), head(0.5), head(1));
  b.add('seg', seg(22, false, 0), seg(22, true, 1), seg(16, false, 2));
  b.add('tail', tail());
  b.add('harpoon', harpoon());
  b.add('swim', head(0), head(0.5), head(1), head(0.5));
  return b;
}

// ---------------------------------------------------------------- Ysolde, the Stone Bride

/**
 * A gorgon bride: grey-green skin, a tattered veil and bodice, a wreath of asps, on a thick
 * banded serpent body. 112x120 cells anchored at the bottom middle.
 *   idle (4)   swaying
 *   charge     reared back, arms crossed over her face, the veil lifting
 *   beam       arms flung wide, eyes blazing
 *   whip       the tail lashed out along the floor
 *   stone (3)  turned to stone by her own gaze: whole, cracked, crumbling
 */
export function buildGorgonSheet(): SheetBuilder {
  const b = new SheetBuilder(112, 120, 56, 119);
  const scale = hex('#3c7a50'), scaleD = hex('#1c4430'), scaleL = hex('#74b47c'), band = hex('#c8a040'), belly = hex('#cdbf82');
  const skin = hex('#aebca2'), skinD = hex('#74866e'), veil = hex('#ece6da'), veilD = hex('#b0a89c'), gold = hex('#e0b040'), eyeC = hex('#fff6a0');
  const lace = hex('#8a2a3c');
  type Pose = { sway: number; arms: 'down' | 'cross' | 'wide'; gaze?: boolean; whip?: boolean; hair: number; rear?: number };
  const draw = (q: Pose) => {
    const p = b.canvas();
    const s = q.sway, rear = q.rear || 0;
    // the coils: three stacked loops with gold bands and belly plates
    const coil = (cx: number, cy: number, rx: number, ry: number) => {
      p.ellipse(cx, cy, rx, ry, scaleD);
      p.ellipse(cx, cy - 2, rx - 1, ry - 1, scale);
      for (let x = cx - rx + 4; x < cx + rx - 2; x += 7) {
        p.line(x, cy - ry * 0.3, x + 3, cy + ry * 0.7, scaleD);
        p.set(x + 4, cy - ry * 0.5, scaleL);
      }
      p.line(cx - rx * 0.5, cy - ry + 1, cx - rx * 0.3, cy + ry - 2, band, 2);
      p.line(cx + rx * 0.4, cy - ry + 1, cx + rx * 0.6, cy + ry - 2, band, 2);
    };
    coil(56, 108, 40, 11);
    coil(50, 98, 30, 9);
    coil(56, 90, 20, 7);
    // the tail: curled up behind her at rest, or lashed out flat along the floor
    if (q.whip) taper(p, 84, 110, 111, 114, 8, 1.5, scale);
    else {
      taper(p, 90, 104, 102, 82, 7, 4, scale);
      taper(p, 102, 82, 96, 66, 4, 1.2, scale);
      p.line(92, 100, 100, 84, band);
    }
    // the rising body
    taper(p, 54, 88, 56 + s, 60 - rear, 12, 9, scale);
    taper(p, 58, 88, 59 + s, 62 - rear, 5, 4, belly);
    for (let y = 64 - rear; y < 88; y += 5) p.line(54 + s, y, 63 + s, y, hex('#a89858'));
    // torso in a ruined wedding bodice
    const tx = 57 + s, ty = 46 - rear;
    p.poly([[tx - 11, ty + 16], [tx - 12, ty - 6], [tx + 12, ty - 6], [tx + 11, ty + 16]], veil);
    p.poly([[tx - 11, ty + 16], [tx - 12, ty - 6], [tx - 6, ty - 6], [tx - 7, ty + 16]], veilD);
    for (let y = ty - 2; y < ty + 14; y += 4) {
      p.line(tx - 2, y, tx + 2, y + 2, lace);
      p.line(tx + 2, y, tx - 2, y + 2, lace);
    }
    p.rect(tx - 11, ty + 12, 22, 3, gold);
    p.poly([[tx - 12, ty - 6], [tx + 12, ty - 6], [tx + 8, ty - 11], [tx - 8, ty - 11]], skin); // shoulders
    // the veil: a torn train down her back
    p.poly([[tx - 10, ty - 14], [tx - 26, ty + 30], [tx - 18, ty + 22], [tx - 20, ty + 38], [tx - 10, ty + 24], [tx - 8, ty + 4]], veil);
    p.poly([[tx - 10, ty - 14], [tx - 20, ty + 16], [tx - 12, ty + 6]], veilD);
    // arms
    const arm = (sx: number, dir: number) => {
      if (q.arms === 'cross') {
        taper(p, sx, ty - 4, sx + dir * 4, ty + 6, 3, 2.5, skin);
        taper(p, sx + dir * 4, ty + 6, tx + 1 - dir * 2, ty - 16, 2.5, 2, skin);
      } else if (q.arms === 'wide') {
        taper(p, sx, ty - 4, sx + dir * 14, ty - 10, 3, 2.5, skin);
        taper(p, sx + dir * 14, ty - 10, sx + dir * 22, ty - 20, 2.5, 2, skin);
        for (let k = -1; k <= 1; k++) p.line(sx + dir * 22, ty - 20, sx + dir * (25 + k), ty - 25 + Math.abs(k), skinD); // clawed fingers
      } else {
        taper(p, sx, ty - 4, sx + dir * 5, ty + 10, 3, 2.5, skin);
        taper(p, sx + dir * 5, ty + 10, sx + dir * 3, ty + 22, 2.5, 2, skin);
      }
      p.rect(sx - 2 + dir * 3, ty + 2, 5, 2, gold); // armlet
    };
    arm(tx - 12, -1);
    arm(tx + 12, 1);
    // head, and the wreath of asps
    const hx = tx + 1, hy = ty - 20;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 1.02 + (i / 8) * Math.PI * 1.04 + Math.sin(q.hair + i * 1.7) * 0.18;
      const len = 14 + ((i * 5) % 5);
      const mx = hx + Math.cos(a) * len * 0.6, my = hy - 3 + Math.sin(a) * len * 0.6 - 2;
      const ex = hx + Math.cos(a + Math.sin(q.hair + i) * 0.3) * len, ey = hy - 3 + Math.sin(a) * len;
      taper(p, hx, hy - 4, mx, my, 2.4, 2, scale);
      taper(p, mx, my, ex, ey, 2, 1.4, i % 2 ? scale : scaleD);
      p.circle(ex, ey, 1.8, scaleL);
      p.set(ex + 1, ey, hex('#ffd040'));
      p.line(ex + 2, ey + 1, ex + 4, ey + 2, hex('#d03040'));
    }
    p.ellipse(hx, hy, 8, 9.5, skin);
    p.ellipse(hx - 3, hy + 2, 4, 6, skinD);
    p.rect(hx - 8, hy - 8, 16, 3, gold);
    p.circle(hx, hy - 7, 2, lace);
    p.line(hx - 3, hy + 5, hx + 3, hy + 5, lace);
    p.set(hx, hy + 2, skinD);
    if (q.gaze) {
      p.circle(hx - 3, hy - 1, 2.4, eyeC);
      p.circle(hx + 4, hy - 1, 2.4, eyeC);
    } else if (q.arms !== 'cross') {
      p.line(hx - 5, hy - 2, hx - 2, hy - 1, INK);
      p.line(hx + 2, hy - 1, hx + 5, hy - 2, INK);
      p.set(hx - 3, hy, hex('#e8d040'));
      p.set(hx + 4, hy, hex('#e8d040'));
    }
    relief(p, 1, [eyeC], 11);
    return p;
  };
  const idle = (i: number) => draw({ sway: [0, 1, 0, -1][i], arms: 'down', hair: i * 1.5 });
  b.add('idle', idle(0), idle(1), idle(2), idle(3));
  b.add('charge', draw({ sway: -2, arms: 'cross', hair: 2, rear: 6 }));
  b.add('beam', draw({ sway: 2, arms: 'wide', gaze: true, hair: 4, rear: 8 }));
  b.add('whip', draw({ sway: -3, arms: 'wide', whip: true, hair: 3 }));
  // turned to stone: the beam pose in grey, with more cracks and missing pieces each stage
  const stone = (stage: number) => {
    const p = draw({ sway: 2, arms: 'wide', gaze: false, hair: 4, rear: 8 });
    const lo = hex('#3a3c3a'), hi = hex('#c4c8c0');
    p.map((c, x, y) => {
      const l = (c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1) / 255;
      // stage 2 has lost chips from its edges
      if (stage === 2 && hash2(x >> 2, y >> 2, 31) < 0.14) return null;
      const m = mix(lo, hi, Math.min(1, l * 1.1));
      return [m[0], m[1], m[2], c[3]];
    });
    for (let k = 0; k < stage * 4; k++) {
      let x = 30 + hash2(k, 1, 33) * 56, y = 14 + hash2(k, 2, 33) * 30;
      for (let i = 0; i < 9; i++) {
        const nx = x + (hash2(k, i, 34) - 0.5) * 6, ny = y + 4;
        if (p.alpha(Math.round(nx), Math.round(ny)) > 0) p.line(x, y, nx, ny, hex('#1a1c1a'));
        x = nx;
        y = ny;
      }
    }
    return p;
  };
  b.add('stone', stone(0), stone(1), stone(2));
  return b;
}

// ---------------------------------------------------------------- Old Rimehide

/**
 * The snow beast: a mountain of shaggy white fur with a slate-blue face, curled ram's horns,
 * and ice crusted on its shoulders and forearms. 120x108 cells anchored at the bottom middle.
 *   idle (2), walk (4), lift, throw, squat, leap, guard (forearm up), stuck (2: chest-deep, flailing)
 */
export function buildYetiSheet(): SheetBuilder {
  const b = new SheetBuilder(120, 108, 60, 107);
  const fur = hex('#dde6f2'), furD = hex('#9eb0cc'), furS = hex('#62749a'), face = hex('#46649e'), faceD = hex('#2a3e6a');
  const horn = hex('#84725e'), hornD = hex('#4e4236'), ice = hex('#a8e0ff'), eye = hex('#ff5a30'), claw = hex('#2a2e3c');
  type Pose = { crouch: number; armL: [number, number]; armR: [number, number]; mouth: number; step: number; lean: number; sunk?: number };
  /** Shaggy strokes hanging off a shape's lower edge. */
  const shag = (p: PixelCanvas, x0: number, x1: number, y: number, len: number, c: RGBA, seed: number) => {
    for (let x = x0; x <= x1; x += 2) p.line(x, y, x - 1 + hash2(x, seed) * 2, y + len * (0.5 + hash2(x, seed + 1) * 0.7), c);
  };
  const draw = (q: Pose) => {
    const p = b.canvas();
    const sunk = q.sunk || 0;
    const cy = 56 + q.crouch + sunk, cx = 58 + q.lean;
    // legs (hidden when it has fallen through the ice)
    if (!sunk) {
      taper(p, cx - 13, cy + 20, cx - 18 - q.step, 100, 11, 9, furD);
      taper(p, cx + 13, cy + 20, cx + 18 + q.step, 100, 11, 9, fur);
      shag(p, cx - 26 - q.step, cx - 10 - q.step, 92, 6, furS, 1);
      shag(p, cx + 10 + q.step, cx + 28 + q.step, 92, 6, furD, 2);
      for (const [fx, c] of [[cx - 20 - q.step, furS], [cx + 21 + q.step, furD]] as [number, RGBA][]) {
        p.ellipse(fx, 103, 11, 4, c);
        for (let k = -1; k <= 1; k++) p.line(fx + 6 + k * 3, 103, fx + 9 + k * 3, 106, claw);
      }
    }
    // an arm: upper arm, a forearm crusted in ice, a clawed fist
    const arm = (sx: number, sy: number, d: [number, number], c: RGBA, cd: RGBA) => {
      const ex = sx + d[0] * 0.55, ey = sy + d[1] * 0.55, hx = sx + d[0], hy = sy + d[1];
      taper(p, sx, sy, ex, ey, 10, 8, c);
      taper(p, ex, ey, hx, hy, 8, 7, c);
      shag(p, Math.min(sx, ex) - 6, Math.max(sx, ex) + 6, Math.max(sy, ey) + 4, 5, cd, sx);
      p.poly([[ex - 5, ey - 4], [ex + 1, ey - 12], [ex + 5, ey - 3]], ice); // ice spurs
      p.poly([[ex + 3, ey - 2], [ex + 8, ey - 8], [ex + 10, ey]], ice);
      p.circle(hx, hy, 8, cd);
      for (let k = -1; k <= 1; k++) p.line(hx + k * 4, hy + 5, hx + k * 5, hy + 10, claw, 1.6);
    };
    arm(cx - 24, cy - 12, q.armL, furD, furS);
    // the body: a barrel of fur, darker toward the back, a paler chest
    p.ellipse(cx, cy, 30, 30, fur);
    p.ellipse(cx - 9, cy + 4, 21, 24, furD);
    p.ellipse(cx + 7, cy + 8, 17, 17, fur);
    shag(p, cx - 26, cx + 26, cy + 20, 9, furD, 3);
    shag(p, cx - 12, cx + 20, cy + 6, 6, furD, 4);
    shag(p, cx - 22, cx + 6, cy - 8, 6, furS, 5);
    // ice across the shoulders
    for (let i = 0; i < 5; i++) p.poly([[cx - 22 + i * 10, cy - 24], [cx - 18 + i * 10, cy - 34 - (i % 2) * 5], [cx - 14 + i * 10, cy - 23]], ice);
    arm(cx + 24, cy - 12, q.armR, fur, furD);
    // head: sunk between the shoulders
    const hx = cx + 12, hy = cy - 30;
    p.ellipse(hx, hy, 15, 14, fur);
    shag(p, hx - 14, hx + 12, hy + 8, 6, furD, 6);
    p.ellipse(hx + 4, hy + 2, 10, 10, face);
    p.ellipse(hx + 6, hy + 6, 7, 5, faceD);
    // ram's horns curling back and down, ridged
    const hornAt = (sx: number, dir: number, c: RGBA) => {
      taper(p, sx, hy - 9, sx + dir * 12, hy - 18, 5, 4, c);
      taper(p, sx + dir * 12, hy - 18, sx + dir * 20, hy - 8, 4, 3, c);
      taper(p, sx + dir * 20, hy - 8, sx + dir * 14, hy + 2, 3, 1.2, c);
      for (let k = 0; k < 5; k++) p.line(sx + dir * (3 + k * 3), hy - 13 - Math.sin(k) * 3, sx + dir * (4 + k * 3), hy - 8 - Math.sin(k) * 3, hornD);
    };
    hornAt(hx - 9, -1, hornD);
    hornAt(hx + 7, 1, horn);
    // brow, eyes, a wide mouth with tusks
    p.line(hx - 3, hy - 4, hx + 3, hy - 1, INK, 2);
    p.line(hx + 6, hy - 1, hx + 12, hy - 4, INK, 2);
    p.circle(hx + 1, hy + 1, 1.6, eye);
    p.circle(hx + 9, hy + 1, 1.6, eye);
    if (q.mouth > 0) {
      p.ellipse(hx + 5, hy + 8 + q.mouth, 6, 2 + q.mouth * 3, hex('#3a0a14'));
      for (const x of [hx + 1, hx + 9]) p.poly([[x - 1, hy + 6], [x + 2, hy + 6], [x, hy + 11 + q.mouth]], WHITE);
      for (const x of [hx + 3, hx + 7]) p.line(x, hy + 9 + q.mouth * 3, x, hy + 11 + q.mouth * 3, WHITE);
    } else {
      p.line(hx, hy + 8, hx + 10, hy + 8, INK);
      for (const x of [hx + 1, hx + 9]) p.poly([[x - 1, hy + 8], [x + 2, hy + 8], [x, hy + 4]], WHITE); // tusks
    }
    if (sunk) {
      // chest-deep in the lake: broken ice round it
      for (let i = 0; i < 9; i++) p.poly([[cx - 40 + i * 9, 107], [cx - 36 + i * 9, 96 - (i % 3) * 3], [cx - 30 + i * 9, 107]], ice);
      for (let y = 100; y < 108; y++) for (let x = 0; x < 120; x++) if (hash2(x, y, 9) < 0.5 && p.alpha(x, y) > 0 && y > 103) p.set(x, y, hex('#3a6a98'));
    }
    relief(p, 1, [eye, ice], 13);
    return p;
  };
  const rest: Pose = { crouch: 0, armL: [-8, 32], armR: [8, 32], mouth: 0, step: 0, lean: 0 };
  b.add('idle', draw(rest), draw({ ...rest, crouch: 1, armL: [-8, 31], armR: [8, 31] }));
  b.add('walk', draw({ ...rest, step: 5, lean: 2, armL: [-2, 32], armR: [14, 28] }), draw(rest), draw({ ...rest, step: -4, lean: 2, armL: [-14, 28], armR: [2, 32] }), draw(rest));
  b.add('lift', draw({ ...rest, armL: [2, -34], armR: [4, -34], mouth: 0.5, lean: -2 }));
  b.add('throw', draw({ ...rest, armL: [22, 4], armR: [28, 0], mouth: 1, lean: 6 }));
  b.add('squat', draw({ ...rest, crouch: 9, armL: [-14, 28], armR: [14, 28] }));
  b.add('leap', draw({ ...rest, crouch: -6, armL: [-14, -24], armR: [16, -24], mouth: 1 }));
  b.add('guard', draw({ ...rest, crouch: 3, armL: [-6, 30], armR: [16, -18], lean: -3 }));
  b.add('stuck', draw({ ...rest, sunk: 44, armL: [-26, -8], armR: [28, -14], mouth: 1 }), draw({ ...rest, sunk: 44, armL: [-28, -16], armR: [26, -6], mouth: 0.6 }));
  return b;
}

// ---------------------------------------------------------------- the Hollow Colossus

/**
 * A suit of armor five times the height of a man, blackened steel with brass fittings and
 * furnace light in every seam. The boss stacks these pieces (96x96 cells, anchored at the center):
 *   torso (3: whole, cracked, burst open)   helm (2: whole, cracked)   fist (2: whole, cracked)
 *   legs (2: standing, kneeling)            door (2: the glowing breach in its chest)
 *   idle: the whole suit, small, for the bestiary
 * The game heats a piece by tinting and glowing it, so there are no separate "hot" frames.
 */
export function buildColossusSheet(): SheetBuilder {
  const b = new SheetBuilder(96, 96, 48, 48);
  const steel = hex('#565c70'), steelD = hex('#262a38'), steelL = hex('#9aa2bc'), brass = hex('#b88c3c'), brassD = hex('#6e4e1c');
  const fire = hex('#ff8a20'), fireL = hex('#ffe890'), soot = hex('#16141c');
  const rivets = (p: PixelCanvas, pts: [number, number][]) => pts.forEach(([x, y]) => {
    p.set(x, y, steelL);
    p.set(x + 1, y + 1, steelD);
  });
  const seam = (p: PixelCanvas, x0: number, y0: number, x1: number, y1: number) => {
    p.line(x0, y0, x1, y1, soot);
    p.line(x0 + 1, y0, x1 + 1, y1, fire);
  };
  const crack = (p: PixelCanvas, x: number, y: number, len: number, seed: number) => {
    let cx = x, cy = y;
    for (let i = 0; i < len; i++) {
      const nx = cx + (hash2(i, seed) - 0.5) * 7, ny = cy + 3.5;
      p.line(cx, cy, nx, ny, fireL);
      p.line(cx + 1, cy, nx + 1, ny, fire);
      cx = nx;
      cy = ny;
    }
  };
  const torso = (stage: number) => {
    const p = b.canvas();
    // the breastplate: a keeled chest narrowing to the waist
    p.poly([[12, 16], [84, 16], [76, 78], [20, 78]], steel);
    p.poly([[12, 16], [30, 16], [32, 78], [20, 78]], steelD);
    p.poly([[48, 18], [58, 18], [54, 76], [48, 76]], steelL);
    // layered pauldrons with brass rims
    for (const [x, d] of [[2, 1], [94, -1]] as [number, number][]) {
      p.poly([[x, 12], [x + d * 30, 6], [x + d * 32, 26], [x + d * 4, 30]], steelL);
      p.poly([[x + d * 4, 22], [x + d * 30, 18], [x + d * 31, 30], [x + d * 6, 34]], steel);
      p.line(x + d * 4, 30, x + d * 32, 26, brass, 2);
      p.poly([[x + d * 8, 10], [x + d * 12, 0], [x + d * 16, 9]], brass); // a spike
    }
    // gorget, belt and tassets
    p.rect(30, 12, 36, 6, steelD);
    p.rect(30, 16, 36, 2, brass);
    p.rect(20, 72, 56, 7, brass);
    p.rect(20, 77, 56, 2, brassD);
    for (let i = 0; i < 4; i++) p.poly([[22 + i * 14, 79], [34 + i * 14, 79], [32 + i * 14, 92], [24 + i * 14, 92]], i % 2 ? steel : steelD);
    // plate seams lit from inside, and rivets
    for (let y = 30; y < 70; y += 11) seam(p, 26, y, 70, y);
    rivets(p, [[24, 22], [70, 22], [24, 66], [70, 66], [36, 44], [60, 44]]);
    if (stage < 2) {
      // the furnace door in its chest, shut: a brass grille over the glow
      p.ellipse(48, 46, 11, 13, brassD);
      p.ellipse(48, 46, 8, 10, fire);
      for (let x = 42; x <= 54; x += 4) p.line(x, 37, x, 55, brassD, 1.6);
      p.line(40, 46, 56, 46, brassD, 1.6);
    } else {
      // burst open: a ragged hole into the furnace
      p.poly([[30, 28], [44, 22], [58, 26], [68, 36], [66, 60], [54, 70], [38, 68], [28, 54]], soot);
      p.ellipse(48, 46, 14, 17, hex('#8a2408'));
      p.ellipse(48, 48, 9, 11, fire);
      p.ellipse(48, 50, 4, 6, fireL);
      for (const [x, y, dx, dy] of [[30, 28, -5, -4], [68, 36, 6, -3], [28, 54, -6, 3], [54, 70, 3, 6]]) p.poly([[x, y], [x + dx, y + dy], [x + dx * 0.3 + 3, y + dy * 0.3 + 3]], steelL); // bent-out plate
    }
    if (stage >= 1) {
      crack(p, 34, 20, 8, 1);
      crack(p, 64, 26, 7, 2);
    }
    relief(p, 1, [fire, fireL], 21);
    return p;
  };
  const helm = (cracked: boolean) => {
    const p = b.canvas();
    p.poly([[28, 74], [26, 38], [36, 22], [60, 22], [70, 38], [68, 74]], steel);
    p.poly([[28, 74], [26, 38], [36, 22], [42, 22], [38, 74]], steelD);
    p.poly([[46, 22], [52, 22], [51, 74], [47, 74]], steelL); // the keel
    // crest and swept-back horns
    p.poly([[42, 22], [48, 2], [54, 22]], brass);
    p.poly([[45, 20], [48, 8], [51, 20]], hex('#8a1a2a'));
    for (const d of [-1, 1]) {
      taper(p, 48 + d * 20, 34, 48 + d * 36, 20, 6, 3, steelL);
      taper(p, 48 + d * 36, 20, 48 + d * 40, 4, 3, 1, steelL);
    }
    // the visor: a slit with the fire behind it, and breaths below
    p.rect(30, 40, 36, 8, soot);
    p.rect(32, 42, 32, 4, hex('#a02a10'));
    p.rect(35, 43, 9, 2, fireL);
    p.rect(52, 43, 9, 2, fireL);
    p.poly([[30, 48], [66, 48], [62, 54], [34, 54]], steelD);
    for (let x = 34; x <= 62; x += 5) p.line(x, 57, x, 70, soot, 1.6);
    p.rect(27, 72, 42, 4, brass);
    rivets(p, [[30, 36], [64, 36], [30, 60], [64, 60]]);
    if (cracked) {
      crack(p, 56, 24, 9, 3);
      crack(p, 38, 50, 6, 4);
    }
    relief(p, 1, [fireL, hex('#a02a10')], 23);
    return p;
  };
  const fist = (cracked: boolean) => {
    const p = b.canvas();
    // cuff, back of the hand, four articulated fingers and a thumb
    p.poly([[6, 30], [26, 26], [26, 70], [6, 66]], steelD);
    p.rect(8, 30, 6, 38, brass);
    p.rect(20, 28, 4, 42, brass);
    p.poly([[26, 24], [64, 22], [70, 32], [70, 64], [64, 74], [26, 72]], steel);
    p.poly([[26, 24], [64, 22], [66, 28], [26, 32]], steelL);
    for (let i = 0; i < 4; i++) {
      const y = 26 + i * 12;
      p.poly([[62, y], [86, y + 1], [90, y + 6], [86, y + 10], [62, y + 10]], i % 2 ? steel : steelD);
      p.line(74, y + 1, 74, y + 10, soot);
      p.circle(64, y + 5, 3, steelL); // knuckle
      p.set(63, y + 4, WHITE);
    }
    p.poly([[40, 70], [60, 72], [64, 82], [46, 84]], steelD); // thumb
    seam(p, 30, 48, 60, 48);
    rivets(p, [[30, 30], [58, 30], [30, 66], [58, 66]]);
    if (cracked) {
      crack(p, 44, 24, 9, 5);
      crack(p, 72, 34, 6, 6);
    }
    relief(p, 1, [fire, fireL], 25);
    return p;
  };
  const legs = (kneel: boolean) => {
    const p = b.canvas();
    for (const [x, d] of [[22, 0], [56, 1]] as [number, number][]) {
      const c = d ? steel : steelD;
      if (kneel) {
        // folded: thigh forward, shin flat on the floor
        p.poly([[x, 40], [x + 20, 40], [x + 30, 66], [x + 8, 70]], c);
        p.poly([[x + 6, 68], [x + 36, 64], [x + 40, 90], [x - 2, 90]], c);
        p.circle(x + 20, 66, 8, steelL);
      } else {
        p.poly([[x, 4], [x + 18, 4], [x + 20, 44], [x - 2, 44]], c); // cuisse
        p.circle(x + 9, 46, 9, steelL); // poleyn
        p.poly([[x - 1, 50], [x + 19, 50], [x + 17, 82], [x + 1, 82]], c); // greave
        p.poly([[x - 6, 94], [x - 2, 82], [x + 20, 82], [x + 28, 94]], steelL); // sabaton
        p.rect(x - 1, 60, 20, 3, brass);
      }
      p.rect(x - 1, kneel ? 44 : 20, 20, 3, brass);
    }
    relief(p, 1, [], 27);
    return p;
  };
  const door = (i: number) => {
    const p = b.canvas();
    p.ellipse(48, 48, 14 + i, 18 + i, hex('#ff8a20', 110));
    p.ellipse(48, 48, 10, 14, hex('#ffd060', 190));
    p.ellipse(48, 48, 5, 9, fireL);
    return p;
  };
  const whole = () => {
    const p = b.canvas();
    const put = (src: PixelCanvas, dx: number, dy: number, s: number, flip = false) => {
      for (let y = 0; y < 96 * s; y++) for (let x = 0; x < 96 * s; x++) {
        const sx = Math.floor(x / s), c = src.get(flip ? 95 - sx : sx, Math.floor(y / s));
        if (c[3]) p.set(dx + x, dy + y, c);
      }
    };
    put(legs(false), 27, 52, 0.44);
    put(torso(0), 22, 20, 0.54);
    put(helm(false), 31, 0, 0.36);
    put(fist(false), 0, 40, 0.3);
    put(fist(false), 67, 40, 0.3, true);
    return p;
  };
  b.add('torso', torso(0), torso(1), torso(2));
  b.add('helm', helm(false), helm(true));
  b.add('fist', fist(false), fist(true));
  b.add('legs', legs(false), legs(true));
  b.add('door', door(0), door(2));
  b.add('idle', whole());
  return b;
}

// ---------------------------------------------------------------- the Head Archivist

/**
 * The dead head librarian at his lectern: a tall skeleton in a claret robe with an ermine
 * mantle and a chain of office, round spectacles lit from behind, a long quill in his hand.
 * 88x112 cells anchored at the bottom middle. idle (4), write (2), recoil (struck by his own story).
 */
export function buildArchivistSheet(): SheetBuilder {
  const b = new SheetBuilder(88, 112, 44, 111);
  const robe = hex('#6a1a2c'), robeD = hex('#32101c'), robeL = hex('#963a4a'), ermine = hex('#e6e0d2'), gold = hex('#d0aa50');
  const bone = hex('#dcd4bc'), boneD = hex('#8c8268'), lens = hex('#7ae4ff'), wood = hex('#5a3a22'), woodD = hex('#2e1c10'), paper = hex('#f0e8d0');
  const draw = (bob: number, arm: 'rest' | 'write' | 'up', lean = 0) => {
    const p = b.canvas();
    const y = bob;
    // the lectern: a carved stand with an open ledger on it
    p.poly([[40, 111], [44, 74], [70, 74], [76, 111]], woodD);
    p.poly([[46, 111], [48, 78], [66, 78], [70, 111]], wood);
    p.poly([[36, 76], [80, 68], [82, 74], [38, 82]], wood);
    p.poly([[40, 72], [58, 68], [60, 74], [42, 78]], paper);
    p.poly([[60, 68], [78, 64], [80, 70], [61, 74]], paper);
    for (let i = 0; i < 3; i++) p.line(44, 73 + i * 2 - i, 56, 70 + i * 2 - i, boneD);
    p.rect(54, 86, 6, 12, gold); // a brass plate
    // the robe: tall and narrow, falling in folds, tattered at the hem
    const rx = 28 + lean;
    p.poly([[rx - 10, 40 + y], [rx + 12, 40 + y], [rx + 16, 96], [rx + 12, 110], [rx + 6, 100], [rx, 111], [rx - 6, 100], [rx - 12, 110], [rx - 16, 96]], robe);
    p.poly([[rx - 10, 40 + y], [rx - 4, 40 + y], [rx - 6, 100], [rx - 12, 110], [rx - 16, 96]], robeD);
    for (let i = 0; i < 4; i++) p.line(rx - 4 + i * 5, 52 + y, rx - 6 + i * 6, 104, i % 2 ? robeD : robeL);
    // ermine mantle with black tails, and the chain of office
    p.poly([[rx - 14, 36 + y], [rx + 16, 36 + y], [rx + 18, 48 + y], [rx - 16, 48 + y]], ermine);
    for (let i = 0; i < 6; i++) p.line(rx - 12 + i * 5, 42 + y, rx - 12 + i * 5, 45 + y, INK);
    p.line(rx - 8, 48 + y, rx + 1, 58 + y, gold);
    p.line(rx + 10, 48 + y, rx + 1, 58 + y, gold);
    p.circle(rx + 1, 60 + y, 3, gold);
    // skull: long jaw, round spectacles, a scholar's square cap with a tassel
    const hx = rx + 2, hy = 24 + y;
    p.ellipse(hx, hy, 9, 10, bone);
    p.poly([[hx - 5, hy + 6], [hx + 7, hy + 6], [hx + 5, hy + 15], [hx - 3, hy + 15]], bone);
    p.ellipse(hx - 4, hy + 2, 3, 6, boneD);
    for (let x = hx - 2; x <= hx + 5; x += 2) p.line(x, hy + 9, x, hy + 12, boneD);
    p.poly([[hx + 1, hy + 2], [hx + 3, hy + 2], [hx + 2, hy + 6]], INK);
    for (const ex of [hx - 2, hx + 6]) {
      p.circle(ex, hy - 1, 4, gold);
      p.circle(ex, hy - 1, 3, INK);
      p.circle(ex, hy - 1, 1.6, lens);
    }
    p.line(hx + 1, hy - 1, hx + 3, hy - 1, gold);
    p.poly([[hx - 13, hy - 9], [hx + 14, hy - 12], [hx + 12, hy - 17], [hx - 11, hy - 14]], robeD);
    p.rect(hx - 8, hy - 10, 17, 3, robe);
    p.line(hx + 12, hy - 14, hx + 18, hy - 4, gold);
    p.circle(hx + 18, hy - 3, 1.6, gold);
    // arms: the near one holds the quill
    taper(p, rx - 12, 44 + y, rx - 14, 66 + y, 3.5, 2.5, robeD);
    p.circle(rx - 14, 68 + y, 2.5, bone);
    const [ex, ey] = arm === 'up' ? [rx + 26, 16 + y] : arm === 'write' ? [rx + 26, 66 + y] : [rx + 22, 58 + y];
    taper(p, rx + 13, 44 + y, (rx + 13 + ex) / 2 + 3, (44 + y + ey) / 2 + 4, 3.5, 3, robe);
    taper(p, (rx + 13 + ex) / 2 + 3, (44 + y + ey) / 2 + 4, ex, ey, 3, 2, robe);
    p.circle(ex, ey, 2.5, bone);
    p.line(ex, ey, ex + 5, ey + 7, paper); // the quill's nib end
    taper(p, ex, ey, ex - 3, ey - 16, 1, 3, paper); // and its feather
    p.line(ex - 1, ey - 4, ex - 3, ey - 15, boneD);
    relief(p, 1, [lens], 31);
    return p;
  };
  b.add('idle', draw(0, 'rest'), draw(-1, 'rest'), draw(-1, 'write'), draw(0, 'write'));
  b.add('write', draw(0, 'write'), draw(-1, 'write', 1));
  b.add('point', draw(-1, 'up'));
  b.add('recoil', draw(1, 'up', -4));
  return b;
}

// ---------------------------------------------------------------- props

/**
 * Things in the boss arenas that the fights are played with. 48x48 cells anchored at the center.
 *   wheel (4)     a sluice wheel, turning                  rack (2)     a rack of iron spikes, whole and broken
 *   bellows (2)   up, and squashed flat                    anvil        the forge's anvil
 *   bell (3)      a small bell in three metals             bellLit (3)  the same, ringing
 *   anchor (2)    a chain anchor ring, whole and snapped   crystal (3)  a crystal growth, budding to full
 *   mark (2)      a glowing spot on the floor              vent (2)     a floor vent, cold and about to blow
 *   crack (3)     cracks over an ice slab, 1 and 2, and a snow shadow where the beast will land
 */
export function buildPropSheet(): SheetBuilder {
  const b = new SheetBuilder(48, 48, 24, 24);
  const iron = hex('#5a5e6c'), ironD = hex('#2a2c38'), ironL = hex('#9aa0b4'), rust = hex('#8a4a2a'), brass = hex('#c09848'), wood = hex('#6a4426');
  const wheel = (rot: number) => {
    const p = b.canvas();
    p.circle(24, 24, 20, ironD);
    p.circle(24, 24, 17, iron);
    for (let y = 8; y < 41; y++) for (let x = 8; x < 41; x++) if (Math.hypot(x - 24, y - 24) < 13) p.clear(x, y);
    for (let k = 0; k < 6; k++) {
      const a = rot + (k * Math.PI) / 3;
      p.line(24, 24, 24 + Math.cos(a) * 16, 24 + Math.sin(a) * 16, iron, 3);
      p.circle(24 + Math.cos(a) * 20, 24 + Math.sin(a) * 20, 2.6, brass); // handles
    }
    p.circle(24, 24, 5, brass);
    p.circle(24, 24, 2, ironD);
    relief(p, 1, [], 41);
    return p;
  };
  const rack = (broken: boolean) => {
    const p = b.canvas();
    p.rect(2, 2, 8, 44, ironD);
    p.rect(4, 2, 3, 44, iron);
    for (let i = 0; i < 5; i++) {
      const y = 6 + i * 9;
      if (broken && i % 2 === 0) {
        p.poly([[10, y - 2], [18, y], [10, y + 3]], rust);
        continue;
      }
      p.poly([[10, y - 3], [44, y], [10, y + 3]], ironL);
      p.line(10, y + 2, 40, y + 1, iron);
      p.line(10, y, 20, y, rust);
    }
    relief(p, 0.8, [], 42);
    return p;
  };
  const bellows = (down: boolean) => {
    const p = b.canvas();
    const top = down ? 30 : 14;
    p.poly([[4, 42], [44, 42], [40, 46], [8, 46]], wood); // base board
    p.poly([[6, top], [42, top], [44, top + 5], [4, top + 5]], wood); // top board
    for (let y = top + 5; y < 42; y += 4) {
      p.poly([[6, y], [42, y], [44, y + 2], [4, y + 2]], hex('#7a3a2a'));
      p.line(4, y + 2, 44, y + 2, hex('#3a1a14'));
    }
    p.rect(20, top - 3, 8, 3, brass);
    p.poly([[44, 38], [48, 36], [48, 44], [44, 42]], iron); // nozzle
    relief(p, 0.8, [], 43);
    return p;
  };
  const anvil = () => {
    const p = b.canvas();
    p.poly([[2, 14], [40, 12], [46, 18], [30, 22], [8, 22]], ironL); // face and horn
    p.poly([[8, 22], [30, 22], [26, 32], [12, 32]], iron);
    p.poly([[6, 46], [10, 32], [28, 32], [32, 46]], ironD);
    p.rect(4, 44, 30, 3, wood);
    relief(p, 1, [], 44);
    return p;
  };
  const bell = (k: number, lit: boolean) => {
    const p = b.canvas();
    const c = [hex('#c0903c'), hex('#b8bcc8'), hex('#5aa08c')][k];
    p.line(24, 0, 24, 12, hex('#6a5a40'), 2); // rope
    p.poly([[16, 12], [32, 12], [38, 34], [10, 34]], c);
    p.ellipse(24, 34, 15, 4, shade(c, 0.7));
    p.rect(14, 14, 20, 2, shade(c, 1.3));
    p.circle(24, 40, 3, shade(c, 0.6)); // clapper
    relief(p, 1, [], 45 + k);
    if (lit) {
      p.map((col) => shade(col, 1.5));
      for (const d of [-1, 1]) for (let i = 0; i < 3; i++) p.line(24 + d * (18 + i * 3), 18 + i * 2, 24 + d * (19 + i * 3), 30 - i * 2, WHITE);
    }
    return p;
  };
  const anchor = (snapped: boolean) => {
    const p = b.canvas();
    p.rect(18, 18, 12, 12, ironD);
    p.circle(24, 24, 7, brass);
    for (let y = 18; y < 31; y++) for (let x = 18; x < 31; x++) if (Math.hypot(x - 24, y - 24) < 4) p.clear(x, y);
    if (!snapped) for (let i = 0; i < 4; i++) p.circle(24, 6 + i * 5 - 4, 2.4, iron);
    else p.poly([[20, 28], [28, 28], [24, 36]], rust);
    relief(p, 0.8, [], 48);
    return p;
  };
  const crystal = (stage: number) => {
    const p = b.canvas();
    const c = hex('#b89cff'), cl = hex('#eee4ff'), cd = hex('#5a3ea8');
    const h = [10, 24, 40][stage];
    for (const [x, k] of [[24, 1], [14, 0.6], [34, 0.7], [19, 0.4], [30, 0.45]] as [number, number][]) {
      const top = 47 - h * k;
      p.poly([[x - 4, 47], [x, top], [x + 4, 47]], c);
      p.poly([[x - 4, 47], [x, top], [x - 1, 47]], cd);
      p.line(x + 1, top + 3, x + 2, 44, cl);
    }
    p.outline(hex('#1a1040'));
    return p;
  };
  const mark = (i: number) => {
    const p = b.canvas();
    p.ellipse(24, 42, 14 + i * 3, 4 + i, hex('#c8a8ff', 120));
    p.ellipse(24, 42, 8 + i * 2, 2, hex('#ffffff', 200));
    for (let k = -2; k <= 2; k++) p.line(24 + k * 5, 40, 24 + k * 6, 30 - i * 4 - Math.abs(k) * 2, hex('#d8c0ff', 110));
    return p;
  };
  const vent = (hot: boolean) => {
    const p = b.canvas();
    p.rect(6, 40, 36, 6, ironD);
    for (let x = 10; x < 40; x += 6) p.rect(x, 41, 3, 4, hot ? hex('#ffb040') : hex('#3a1408'));
    if (hot) for (let x = 12; x < 38; x += 5) p.line(x, 38, x + (hash2(x, 1) - 0.5) * 4, 30, hex('#ff8a20', 160));
    return p;
  };
  const crackIce = (stage: number) => {
    const p = b.canvas();
    if (stage === 2) {
      p.ellipse(24, 40, 20, 5, hex('#102040', 120)); // the shadow of something about to land
      return p;
    }
    const c = hex('#e8f6ff'), d = hex('#3a6a98');
    for (let k = 0; k <= stage * 2; k++) {
      let x = 6 + k * 12 + hash2(k, stage) * 6, y = 34;
      for (let i = 0; i < 4; i++) {
        const nx = x + (hash2(k, i, 5) - 0.5) * 10, ny = y + 3.5;
        p.line(x, y, nx, ny, d);
        p.line(x + 1, y, nx + 1, ny, c);
        x = nx;
        y = ny;
      }
    }
    return p;
  };
  b.add('wheel', wheel(0), wheel(0.26), wheel(0.52), wheel(0.78));
  b.add('rack', rack(false), rack(true));
  b.add('bellows', bellows(false), bellows(true));
  b.add('anvil', anvil());
  b.add('bell', bell(0, false), bell(1, false), bell(2, false));
  b.add('bellLit', bell(0, true), bell(1, true), bell(2, true));
  b.add('anchor', anchor(false), anchor(true));
  b.add('crystal', crystal(0), crystal(1), crystal(2));
  b.add('mark', mark(0), mark(1));
  b.add('vent', vent(false), vent(true));
  b.add('crack', crackIce(0), crackIce(1), crackIce(2));
  return b;
}

/**
 * Tall props, 56x96 cells anchored at the bottom middle.
 *   statue (3)   one of Ysolde's petrified suitors: whole, cracked, rubble
 *   mirror (3)   a standing mirror: clear, cracked, shattered (the game draws what's in the glass)
 *   core (4)     the Colossus's furnace heart, pulsing, with the stubs of its chains
 */
export function buildTallPropSheet(): SheetBuilder {
  const b = new SheetBuilder(56, 96, 28, 95);
  const st = hex('#8a9088'), stD = hex('#4e544e'), stL = hex('#c0c6bc');
  const statue = (stage: number) => {
    const p = b.canvas();
    if (stage === 2) {
      // rubble: the plinth and a heap of pieces
      p.rect(12, 84, 32, 11, stD);
      for (let i = 0; i < 9; i++) p.circle(14 + hash2(i, 1, 51) * 28, 80 - hash2(i, 2, 51) * 10, 3 + hash2(i, 3, 51) * 3, i % 2 ? st : stD);
      p.ellipse(34, 76, 5, 6, stL); // a head on its side
      relief(p, 1, [], 52);
      return p;
    }
    // a nobleman caught mid-step, one arm thrown up across his eyes
    p.rect(12, 84, 32, 11, stD);
    p.rect(10, 82, 36, 4, st);
    taper(p, 22, 60, 20, 82, 5, 4, st);
    taper(p, 34, 60, 37, 82, 5, 4, st);
    p.poly([[16, 34], [40, 34], [42, 64], [14, 64]], st); // coat
    p.poly([[16, 34], [24, 34], [22, 64], [14, 64]], stD);
    p.poly([[14, 60], [42, 60], [46, 72], [10, 72]], st); // coat skirts
    taper(p, 18, 38, 10, 54, 4, 3, stD);
    taper(p, 38, 36, 44, 24, 4, 3, st);
    taper(p, 44, 24, 32, 16, 3, 3, st); // the arm across the face
    p.ellipse(28, 22, 7, 8, stL);
    p.poly([[20, 18], [36, 16], [34, 11], [22, 12]], stD); // hair
    p.rect(20, 46, 16, 2, stD);
    if (stage === 1) {
      for (let k = 0; k < 4; k++) {
        let x = 16 + k * 7, y = 18 + k * 9;
        for (let i = 0; i < 7; i++) {
          const nx = x + (hash2(k, i, 53) - 0.5) * 7, ny = y + 4;
          if (p.alpha(Math.round(nx), Math.round(ny)) > 0) p.line(x, y, nx, ny, hex('#1c201c'));
          x = nx;
          y = ny;
        }
      }
      for (let y = 30; y < 44; y++) for (let x = 6; x < 14; x++) p.clear(x, y + 14); // the lowered arm has broken off
    }
    relief(p, 1, [], 54);
    return p;
  };
  const mirror = (stage: number) => {
    const p = b.canvas();
    const fr = hex('#8a6ad0'), frD = hex('#3a2a70'), frL = hex('#d8c4ff'), glass = hex('#b8dcff', 70);
    p.poly([[6, 95], [6, 20], [28, 2], [50, 20], [50, 95]], frD);
    p.poly([[9, 92], [9, 22], [28, 6], [47, 22], [47, 92]], fr);
    // the glass: hollow, so the game can draw a figure behind it; a faint sheen
    for (let y = 12; y < 89; y++) for (let x = 13; x < 44; x++) {
      const inside = y > 26 ? true : Math.abs(x - 28) < (y - 10) * 0.95;
      if (inside) {
        p.clear(x, y);
        if (stage < 2 && (x + y) % 23 < 3) p.set(x, y, glass);
      }
    }
    p.circle(28, 8, 4, frL);
    p.rect(4, 90, 48, 5, frD);
    for (const y of [36, 60, 80]) {
      p.set(8, y, frL);
      p.set(48, y, frL);
    }
    if (stage >= 1) {
      const c = hex('#ffffff');
      for (const [x, y, dx, dy] of [[28, 44, -12, -22], [28, 44, 13, -16], [28, 44, -10, 24], [28, 44, 12, 30], [28, 44, 2, -30]]) p.line(x, y, x + dx, y + dy, c);
      if (stage === 2) for (let i = 0; i < 14; i++) p.poly([[16 + hash2(i, 1, 55) * 22, 20 + hash2(i, 2, 55) * 60], [20 + hash2(i, 3, 55) * 22, 24 + hash2(i, 4, 55) * 60], [14 + hash2(i, 5, 55) * 26, 30 + hash2(i, 6, 55) * 56]], hex('#1a1030'));
    }
    p.outline(INK);
    return p;
  };
  const core = (i: number) => {
    const p = b.canvas();
    const fire = hex('#ff8a20'), fireL = hex('#fff0a0'), cage = hex('#3a3440');
    const r = 20 + (i % 2);
    p.circle(28, 62, r + 3, hex('#7a1c08'));
    p.circle(28, 62, r - 2, fire);
    p.circle(28, 62, r - 9, fireL);
    for (let k = 0; k < 8; k++) {
      const a = k * 0.785 + i * 0.4;
      p.line(28 + Math.cos(a) * 8, 62 + Math.sin(a) * 8, 28 + Math.cos(a) * (r - 3), 62 + Math.sin(a) * (r - 3), hex('#ffb040'));
    }
    // an iron cage round it
    for (const a of [-0.9, -0.3, 0.3, 0.9]) {
      const x = 28 + Math.sin(a) * (r + 2);
      p.line(x, 62 - Math.cos(a) * (r + 3), x, 62 + Math.cos(a) * (r + 3), cage, 2);
    }
    p.ellipse(28, 62 - r - 2, r * 0.7, 3, cage);
    p.ellipse(28, 62 + r + 2, r * 0.7, 3, cage);
    p.circle(28, 62 - r - 6, 3, hex('#c09848'));
    p.outline(INK);
    return p;
  };
  b.add('statue', statue(0), statue(1), statue(2));
  b.add('mirror', mirror(0), mirror(1), mirror(2));
  b.add('core', core(0), core(1), core(2), core(3));
  return b;
}
