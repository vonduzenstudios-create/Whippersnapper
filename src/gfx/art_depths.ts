// Art for the 0.18.0 expansion: the Temple Asp, the storybook figures the Head Archivist
// writes into his room, and the bosses' dialogue portraits. (The bosses themselves were
// redrawn in 0.19.0: see art_bosses2.ts.)
// Everything faces right, like the rest of the art.
import { PixelCanvas, SheetBuilder, hex, RGBA, mix } from './pixel';
import { FormCanvas, ramp } from './form';

const INK = hex('#0c0810');
const WHITE = hex('#f4f0e4');

/** A limb or body drawn as a line that changes thickness from r0 to r1. */
function taper(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: RGBA) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, c);
  }
}

// ---------------------------------------------------------------- Temple Asp

const ASP = ramp('#10240e', '#24481e', '#3a6e2e', '#4a8a3a', '#72b058');
const ASP_BELLY = ramp('#7a7438', '#c8c070', '#eee8a0');
const ASP_MOUTH = ramp('#3a0810', '#7a1020', '#d03040');
const ASP_EYE = ramp('#a07010', '#ffd040');
const FANG = ramp('#a8a498', '#f4f0e4');

/**
 * A green temple snake, form shaded (0.24.0). 40x32 cell, anchored at the bottom middle (the
 * floor is row 31). `slither` is an 8-frame loop; the other poses are single frames.
 */
export function buildSerpentSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 32, 20, 31);
  /** `wave`: phase of the slither. `up`: how high the neck is raised (0 flat .. 1 reared). `reach`: head thrown forward. */
  const draw = (wave: number, up: number, reach = 0, mouth = false) => {
    const f = new FormCanvas(40, 32);
    // the body along the floor: a sine wave from the tail to the neck, banded dark and light
    let px = 4, py = 28;
    for (let x = 5; x <= 24; x++) {
      const y = 27 + Math.sin(x * 0.5 + wave) * 1.6;
      f.limb(px, py, x, y, 1.2 + (x - 5) * 0.09, 1.3 + (x - 5) * 0.09, ASP, 1, () => (x % 6 < 3 ? 0 : -0.22));
      px = x;
      py = y;
    }
    // the neck and head, a pale belly showing up the front of the neck
    const hx = 27 + reach * 9 - up * 3, hy = 25 - up * 15;
    f.limb(24, 27, hx, hy, 3, 2.5, ASP);
    if (up > 0.5) {
      // the hood, spread when it rears
      f.bias = -0.14;
      f.ball(hx - 1, hy + 4, 4.5, 5, ASP);
      f.bias = 0;
    }
    f.next();
    f.limb(24.6, 28, hx + 0.8, hy + 1.6, 1, 1, ASP_BELLY, 0.7);
    f.next();
    f.ball(hx + 2, hy, 4, 2.6, ASP);
    f.dot(hx + 3, hy - 1, ASP_EYE, 0.9);
    if (mouth) {
      f.next();
      f.poly([[hx + 3, hy + 1], [hx + 8, hy], [hx + 7, hy + 4]], ASP_MOUTH, 0.5);
      f.stroke(hx + 6, hy + 1, hx + 6, hy + 3, FANG, 0.9);
    } else f.stroke(hx + 6, hy + 1, hx + 9, hy + 2, ASP_MOUTH, 0.9); // a flick of its tongue
    return f.resolve();
  };
  b.add('slither', ...Array.from({ length: 8 }, (_, i) => draw((i / 8) * Math.PI * 2, 0.15 + 0.05 * Math.sin((i / 8) * Math.PI * 2))));
  b.add('coil', draw(0, 0.5, -0.4));
  b.add('strike', draw(2, 0.1, 1, true));
  b.add('rear', draw(1, 1, 0, true));
  return b;
}

// ---------------------------------------------------------------- storybook figures

/**
 * The figures that step out of the Archivist's books, one per genre:
 *   pirate  (Adventure)  a hook-handed captain with a cutlass
 *   duelist (Romance)    a masked swordsman with a rapier and a rose
 *   golem   (Horror)     a stitched giant made of the dead
 *   sleuth  (Mystery)    a lantern detective in a long coat
 * Each has a 2-frame walk and an attack pose: `<name>` and `<name>_atk`. 56x64, anchored bottom middle.
 */
export function buildFigureSheet(): SheetBuilder {
  const b = new SheetBuilder(56, 64, 28, 63);
  type Kind = 'pirate' | 'duelist' | 'golem' | 'sleuth';
  const LOOK: Record<Kind, { coat: string; coatD: string; skin: string; legs: string; h: number; w: number }> = {
    pirate: { coat: '#8a2030', coatD: '#4a1018', skin: '#c89870', legs: '#2a2430', h: 0, w: 8 },
    duelist: { coat: '#2a2a48', coatD: '#141428', skin: '#e0c0a0', legs: '#c8c0b0', h: 0, w: 6 },
    golem: { coat: '#5a6a4a', coatD: '#2e3a28', skin: '#8aa07a', legs: '#3a3428', h: -8, w: 11 },
    sleuth: { coat: '#6a5a40', coatD: '#3a3020', skin: '#d8b898', legs: '#2a2a30', h: 0, w: 7 },
  };
  const draw = (kind: Kind, step: number, atk: boolean) => {
    const p = b.canvas();
    const L = LOOK[kind];
    const coat = hex(L.coat), coatD = hex(L.coatD), skin = hex(L.skin), legs = hex(L.legs);
    const top = 26 + L.h, cx = 26;
    // legs
    taper(p, cx - 3, 46, cx - 5 - step, 61, 3, 2.5, legs);
    taper(p, cx + 3, 46, cx + 5 + step, 61, 3, 2.5, legs);
    p.rect(cx - 8 - step, 61, 6, 2, INK);
    p.rect(cx + 3 + step, 61, 6, 2, INK);
    // coat
    p.poly([[cx - L.w, top], [cx + L.w, top], [cx + L.w + 2, 50], [cx - L.w - 2, 50]], coat);
    p.poly([[cx - L.w, top], [cx - L.w + 4, top], [cx - L.w + 2, 50], [cx - L.w - 2, 50]], coatD);
    // head
    const hy = top - 7;
    p.ellipse(cx + 1, hy, 5 + (kind === 'golem' ? 1 : 0), 6, skin);
    p.set(cx + 3, hy - 1, INK);
    // arms and what they hold
    const ax = cx + L.w, ay = top + 3;
    const ex = atk ? ax + 12 : ax + 5, ey = atk ? ay - 2 : ay + 9;
    taper(p, cx - L.w, ay, cx - L.w - 3, ay + 11, 2.5, 2, coatD);
    taper(p, ax, ay, ex, ey, 2.5, 2, coat);
    if (kind === 'pirate') {
      p.poly([[cx - 9, hy - 5], [cx + 11, hy - 5], [cx + 7, hy - 11], [cx - 5, hy - 11]], INK); // the hat
      p.rect(cx - 3, hy - 9, 8, 2, hex('#c8a850'));
      p.rect(cx + 2, hy - 1, 5, 1, INK); // eye patch
      p.rect(cx - 2, hy + 3, 7, 4, hex('#3a2418')); // beard
      p.line(ex, ey, atk ? ex + 14 : ex + 6, atk ? ey - 3 : ey - 12, hex('#d8dce8'), 2); // cutlass
      p.line(cx - L.w - 3, ay + 11, cx - L.w - 1, ay + 15, hex('#b8bcc8')); // the hook
      p.line(cx - L.w - 1, ay + 15, cx - L.w - 5, ay + 15, hex('#b8bcc8'));
    } else if (kind === 'duelist') {
      p.rect(cx - 4, hy - 2, 10, 3, INK); // mask
      p.set(cx + 3, hy - 1, WHITE);
      p.poly([[cx - 8, hy - 5], [cx + 10, hy - 5], [cx + 6, hy - 8], [cx - 4, hy - 8]], hex('#141428')); // wide hat
      p.line(cx + 6, hy - 8, cx + 12, hy - 14, hex('#c03040')); // feather
      p.line(ex, ey, atk ? ex + 18 : ex + 8, atk ? ey : ey - 12, hex('#e8ecf8')); // rapier
      p.circle(cx - L.w - 3, ay + 11, 2, hex('#c03040')); // the rose
      p.poly([[cx - L.w, top], [cx - L.w - 8, 48], [cx - L.w + 1, 44]], hex('#7a1828')); // cape
    } else if (kind === 'golem') {
      p.rect(cx - 5, hy - 7, 12, 3, hex('#2e3a28')); // flat skull top
      p.line(cx - 3, hy - 3, cx + 5, hy - 5, INK); // stitches
      for (let i = 0; i < 4; i++) p.line(cx - 2 + i * 2, hy - 5, cx - 2 + i * 2, hy - 2, INK);
      p.line(cx - 6, top + 8, cx + 8, top + 12, INK);
      p.rect(cx - 8, hy + 2, 2, 2, hex('#b8bcc8')); // neck bolts
      p.rect(cx + 8, hy + 2, 2, 2, hex('#b8bcc8'));
      p.circle(ex, ey, 4, skin); // great fists
      p.circle(cx - L.w - 3, ay + 12, 4, skin);
    } else {
      p.poly([[cx - 7, hy - 4], [cx + 10, hy - 4], [cx + 5, hy - 9], [cx - 3, hy - 9]], coatD); // cap
      p.poly([[cx - L.w - 2, 50], [cx + L.w + 2, 50], [cx + L.w + 3, 56], [cx - L.w - 3, 56]], coat); // long coat
      p.line(cx + 5, hy + 2, cx + 9, hy + 3, hex('#3a2418')); // pipe
      p.rect(ex - 2, ey, 5, 6, hex('#3a3a40')); // lantern
      p.rect(ex - 1, ey + 1, 3, 4, hex('#ffe080'));
      if (atk) for (let i = 0; i < 4; i++) p.line(ex + 3, ey + 3, ex + 14, ey - 3 + i * 4, hex('#ffe080', 150));
    }
    p.outline(INK);
    return p;
  };
  for (const k of ['pirate', 'duelist', 'golem', 'sleuth'] as Kind[]) {
    b.add(k, draw(k, 2, false), draw(k, -2, false));
    b.add(k + '_atk', draw(k, 3, true));
  }
  return b;
}

// ---------------------------------------------------------------- portraits

const PORTRAIT = 64;

/** The new bosses' dialogue portraits (64x64, facing right): `<id>_neutral` and `<id>_angry`. */
export function depthPortraits(): Record<string, PixelCanvas> {
  const out: Record<string, PixelCanvas> = {};
  const both = (id: string, f: (angry: boolean) => PixelCanvas) => {
    out[`${id}_neutral`] = f(false);
    out[`${id}_angry`] = f(true);
  };
  both('leviathan', (angry) => {
    const p = new PixelCanvas(PORTRAIT, PORTRAIT);
    const skin = hex('#56707a'), pale = hex('#b8ccc4'), o = angry ? 7 : 2;
    p.ellipse(28, 34, 26, 24, skin);
    p.ellipse(26, 46, 22, 12, pale);
    p.poly([[30, 20], [62, 26 - o], [62, 34 - o], [30, 36]], skin);
    p.poly([[28, 38], [60, 38 + o], [58, 46 + o], [26, 50]], pale);
    p.poly([[32, 36], [61, 34 - o], [60, 38 + o], [32, 39]], hex('#7a1828'));
    for (let x = 36; x <= 58; x += 5) {
      p.poly([[x, 34 - o], [x + 3, 34 - o], [x + 1, 39 - o]], WHITE);
      p.poly([[x - 2, 39 + o], [x + 1, 39 + o], [x, 34 + o]], WHITE);
    }
    p.circle(34, 22, 5, hex('#d8e0d8'));
    p.line(29, 17, 39, 27, hex('#26383e'), 2);
    p.poly([[4, 18], [14, 2], [20, 14], [28, 4], [30, 14]], hex('#26383e'));
    p.outline(INK);
    return p;
  });
  both('gorgon', (angry) => {
    const p = new PixelCanvas(PORTRAIT, PORTRAIT);
    const skin = hex('#b8c4a8'), scale = hex('#3e7a4a');
    p.poly([[6, 64], [12, 52], [52, 52], [58, 64]], hex('#e8e4d8'));
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI, len = 22 + (i % 3) * 4;
      const ex = 32 + Math.cos(a) * len, ey = 28 + Math.sin(a) * len;
      taper(p, 32, 26, ex, ey, 4, 2, scale);
      p.set(ex, ey, hex('#ffd040'));
      p.set(ex + 1, ey + 1, hex('#d03040'));
    }
    p.ellipse(32, 34, 14, 17, skin);
    p.rect(18, 22, 28, 3, hex('#d8a838'));
    const eye = angry ? hex('#fff8a0') : hex('#e8d040');
    for (const x of [25, 39]) {
      p.ellipse(x, 32, 4, angry ? 3.5 : 2, INK);
      p.circle(x, 32, angry ? 2.5 : 1.2, eye);
    }
    p.line(30, 38, 32, 41, hex('#7a8a72'));
    if (angry) {
      p.ellipse(32, 46, 5, 3, hex('#3a0810'));
      p.line(29, 44, 29, 47, WHITE);
      p.line(35, 44, 35, 47, WHITE);
    } else p.line(27, 45, 37, 45, hex('#6a1a2a'));
    p.outline(INK);
    return p;
  });
  both('colossus', (angry) => {
    const p = new PixelCanvas(PORTRAIT, PORTRAIT);
    const steel = hex('#5a6072'), steelD = hex('#2a2e3c'), fire = angry ? hex('#ffe080') : hex('#ff8a20');
    p.poly([[10, 64], [8, 28], [20, 10], [44, 10], [56, 28], [54, 64]], steel);
    p.poly([[10, 64], [8, 28], [20, 10], [26, 10], [20, 64]], steelD);
    p.poly([[28, 10], [32, 0], [36, 10]], hex('#b88a3a'));
    p.poly([[4, 24], [0, 4], [14, 18]], hex('#98a0b8'));
    p.poly([[60, 24], [64, 4], [50, 18]], hex('#98a0b8'));
    p.rect(14, 28, 36, 8, INK);
    p.rect(16, 30, 32, 4, hex('#a02a10'));
    p.rect(20, 31, 8, 2, fire);
    p.rect(36, 31, 8, 2, fire);
    for (let x = 18; x <= 46; x += 7) p.line(x, 42, x, 60, steelD, 2);
    p.outline(INK);
    return p;
  });
  both('yeti', (angry) => {
    const p = new PixelCanvas(PORTRAIT, PORTRAIT);
    const fur = hex('#dfe8f4'), furD = hex('#94a8c8'), face = hex('#4a6aa8');
    p.ellipse(32, 54, 30, 16, furD);
    p.ellipse(32, 32, 22, 22, fur);
    p.ellipse(32, 36, 14, 15, face);
    taper(p, 14, 18, 2, 8, 6, 3, hex('#7a6a58'));
    taper(p, 2, 8, 6, 26, 3, 2, hex('#7a6a58'));
    taper(p, 50, 18, 62, 8, 6, 3, hex('#7a6a58'));
    taper(p, 62, 8, 58, 26, 3, 2, hex('#7a6a58'));
    for (const x of [25, 39]) p.circle(x, 31, 2.5, hex('#ff5030'));
    p.line(20, angry ? 24 : 27, 29, 28, INK, 2);
    p.line(44, angry ? 24 : 27, 35, 28, INK, 2);
    if (angry) {
      p.ellipse(32, 44, 8, 6, hex('#3a0810'));
      for (const x of [26, 30, 34, 38]) p.line(x, 39, x, 42, WHITE);
    } else p.line(25, 44, 39, 44, INK, 2);
    p.outline(INK);
    return p;
  });
  both('archivist', (angry) => {
    const p = new PixelCanvas(PORTRAIT, PORTRAIT);
    const bone = hex('#d8d0b8'), boneD = hex('#8a8068'), robe = hex('#5a1a2a');
    p.poly([[4, 64], [10, 50], [54, 50], [60, 64]], robe);
    p.rect(8, 52, 48, 3, hex('#c8a850'));
    p.ellipse(32, 28, 15, 17, bone);
    p.rect(23, 40, 18, 9, bone);
    for (let x = 25; x <= 39; x += 3) p.line(x, 43, x, 48, boneD);
    for (const x of [25, 39]) {
      p.circle(x, 27, 6, hex('#c8a850'));
      p.circle(x, 27, 5, INK);
      p.circle(x, 27, angry ? 3 : 1.5, hex('#70e0ff'));
    }
    p.line(31, 27, 33, 27, hex('#c8a850'));
    p.poly([[31, 33], [33, 33], [32, 38]], INK);
    p.poly([[10, 14], [54, 14], [50, 4], [14, 4]], hex('#2a0c16'));
    p.rect(8, 13, 48, 3, hex('#c8a850'));
    p.line(52, 6, 60, 20, hex('#c8a850'), 2);
    if (angry) p.line(18, 18, 30, 21, INK, 2);
    if (angry) p.line(46, 18, 34, 21, INK, 2);
    p.outline(INK);
    return p;
  });
  return out;
}

/** Turn a hero portrait to violet glass (the Mirror Heart speaks with your own face). */
export function glassPortrait(src: PixelCanvas): PixelCanvas {
  const p = src.clone();
  const lo = hex('#1a1040'), hi = hex('#d8f0ff');
  p.map((c) => {
    const l = (c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1) / 255;
    const m = mix(lo, hi, Math.min(1, l * 1.25));
    return [m[0], m[1], m[2], c[3]];
  });
  return p;
}
