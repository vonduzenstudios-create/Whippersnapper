// Procedural character art: a tiny 2D skeletal rig rasterised into pixel frames.
import { PixelCanvas, SheetBuilder, RGBA, hex, shade, mix } from './pixel';
import { deg } from '../core/util';

export interface Pose {
  hx: number;
  hy: number;
  lean: number; // torso angle, + leans forward (right)
  fl: [number, number]; // front leg [thigh angle from down (+ forward), knee bend]
  bl: [number, number];
  fa: [number, number]; // front arm [shoulder angle from down (+ forward), elbow bend]
  ba: [number, number];
  coat?: number; // coat tail flare in px
  hair?: number; // ponytail lift in px
  scarf?: number; // scarf flutter phase
  headDy?: number;
  mouth?: number;
}

interface Style {
  o: RGBA; // outline
  skin: RGBA;
  skinD: RGBA;
  hair: RGBA;
  hairL: RGBA;
  top: RGBA;
  topD: RGBA;
  topL: RGBA;
  pants: RGBA;
  pantsD: RGBA;
  boot: RGBA;
  bootD: RGBA;
  glove: RGBA;
  belt?: RGBA;
  metal?: RGBA;
  eye: RGBA;
  head: 'hunter' | 'hunterM' | 'skull' | 'helm' | 'zombie' | 'drowned';
  coat: boolean;
  scarf: boolean;
  bones?: boolean;
  armor?: boolean;
  thigh: number;
  shin: number;
  torso: number;
  upper: number;
  fore: number;
  legW: number;
  armW: number;
  sw: number; // shoulder half width
  ww: number; // waist half width
}

const dirv = (a: number): [number, number] => [Math.sin(deg(a)), Math.cos(deg(a))];

function limb(p: PixelCanvas, a: [number, number], b: [number, number], c: [number, number], w: number, col: RGBA, dark: RGBA) {
  p.line(a[0], a[1], b[0], b[1], dark, w);
  p.line(b[0], b[1], c[0], c[1], dark, w);
  if (w > 1.5) {
    p.line(a[0] + 0.4, a[1] - 0.4, b[0] + 0.4, b[1] - 0.4, col, w - 1);
    p.line(b[0] + 0.4, b[1] - 0.4, c[0] + 0.4, c[1] - 0.4, col, w - 1);
  }
}

export interface RigOut {
  hand: [number, number];
  backHand: [number, number];
  head: [number, number];
  shoulder: [number, number];
}

export function drawHumanoid(p: PixelCanvas, s: Style, q: Pose, back = true): RigOut {
  const hip: [number, number] = [q.hx, q.hy];
  const up = [Math.sin(deg(q.lean)), -Math.cos(deg(q.lean))];
  const n = [Math.cos(deg(q.lean)), Math.sin(deg(q.lean))]; // forward perpendicular
  const sh: [number, number] = [hip[0] + up[0] * s.torso, hip[1] + up[1] * s.torso];
  const headC: [number, number] = [sh[0] + up[0] * 4.5, sh[1] + up[1] * 4.5 + (q.headDy || 0)];
  const legPts = (L: [number, number], off: number) => {
    const h: [number, number] = [hip[0] + off, hip[1]];
    const d1 = dirv(L[0]);
    const k: [number, number] = [h[0] + d1[0] * s.thigh, h[1] + d1[1] * s.thigh];
    const d2 = dirv(L[0] - L[1]);
    const f: [number, number] = [k[0] + d2[0] * s.shin, k[1] + d2[1] * s.shin];
    return [h, k, f] as [number, number][];
  };
  const armPts = (A: [number, number], off: number) => {
    const so: [number, number] = [sh[0] + n[0] * off, sh[1] + n[1] * off + 1];
    const d1 = dirv(A[0]);
    const e: [number, number] = [so[0] + d1[0] * s.upper, so[1] + d1[1] * s.upper];
    const d2 = dirv(A[0] + A[1]);
    const h: [number, number] = [e[0] + d2[0] * s.fore, e[1] + d2[1] * s.fore];
    return [so, e, h] as [number, number][];
  };
  const drawLeg = (L: [number, number], off: number, dim: number) => {
    const [h, k, f] = legPts(L, off);
    if (s.bones) {
      limb(p, h, k, f, 2, shade(s.pants, dim), shade(s.pantsD, dim));
      p.set(k[0], k[1], shade(s.pantsD, dim));
    } else {
      limb(p, h, k, f, s.legW, shade(s.pants, dim), shade(s.pantsD, dim));
      // boot: lower part of shin + foot
      const bt: [number, number] = [k[0] + (f[0] - k[0]) * 0.45, k[1] + (f[1] - k[1]) * 0.45];
      p.line(bt[0], bt[1], f[0], f[1], shade(s.bootD, dim), s.legW + 0.6);
      p.line(bt[0] + 0.4, bt[1], f[0] + 0.4, f[1] - 0.5, shade(s.boot, dim), s.legW - 0.4);
    }
    // foot
    p.rect(Math.round(f[0]) - 1, Math.round(f[1]) - 1, 4, 2, shade(s.bones ? s.pants : s.boot, dim));
    p.set(Math.round(f[0]) + 3, Math.round(f[1]), shade(s.bones ? s.pantsD : s.bootD, dim));
  };
  const drawArm = (A: [number, number], off: number, dim: number) => {
    const [so, e, h] = armPts(A, off);
    if (s.bones) {
      limb(p, so, e, h, 2, shade(s.pants, dim), shade(s.pantsD, dim));
    } else {
      limb(p, so, e, h, s.armW, shade(s.top, dim), shade(s.topD, dim));
      if (s.armor && s.metal) p.circle(so[0], so[1], 2.2, shade(s.metal, dim));
    }
    p.circle(h[0], h[1], 1.3, shade(s.glove, dim));
    return h;
  };

  // --- back limbs
  let backHand: [number, number] = [0, 0];
  if (back) {
    backHand = drawArm(q.ba, -1.5, 0.72);
    drawLeg(q.bl, -1, 0.72);
  }
  // --- coat back tail
  if (s.coat) {
    const fl = q.coat || 0;
    p.poly(
      [
        [hip[0] - s.ww - 1, hip[1] - 3],
        [hip[0] + s.ww, hip[1] - 3],
        [hip[0] + s.ww - 1 + fl * 0.2, hip[1] + 9],
        [hip[0] - 2 - fl * 0.6, hip[1] + 12 - fl * 0.35],
        [hip[0] - s.ww - 3 - fl, hip[1] + 10 - fl * 0.6],
      ],
      s.topD,
    );
    p.line(hip[0] - s.ww - 3 - fl, hip[1] + 10 - fl * 0.6, hip[0] - 2 - fl * 0.6, hip[1] + 12 - fl * 0.35, shade(s.topD, 0.7));
  }
  // --- torso
  const S1: [number, number] = [sh[0] + n[0] * s.sw, sh[1] + n[1] * s.sw];
  const S2: [number, number] = [sh[0] - n[0] * s.sw, sh[1] - n[1] * s.sw];
  const H1: [number, number] = [hip[0] + n[0] * s.ww, hip[1] + n[1] * s.ww];
  const H2: [number, number] = [hip[0] - n[0] * s.ww, hip[1] - n[1] * s.ww];
  if (s.bones) {
    // spine + ribs
    p.line(hip[0], hip[1], sh[0], sh[1], s.pantsD, 2);
    for (let i = 0; i < 4; i++) {
      const t = 0.35 + i * 0.17;
      const cx = hip[0] + (sh[0] - hip[0]) * t, cy = hip[1] + (sh[1] - hip[1]) * t;
      const w = 2.5 + i * 0.5;
      p.line(cx - w, cy + 1, cx + w, cy + 1, s.pants);
      p.set(cx - w, cy + 2, s.pantsD);
      p.set(cx + w, cy + 2, s.pantsD);
    }
    p.line(hip[0] - 3, hip[1], hip[0] + 3, hip[1], s.pants, 2); // pelvis
  } else {
    p.poly([S2, S1, H1, H2], s.topD);
    p.poly([[sh[0], sh[1]], S1, H1, [hip[0], hip[1]]], s.top);
    p.line(S1[0], S1[1] + 1, H1[0], H1[1] - 1, s.topL);
    if (s.armor && s.metal) {
      p.line(sh[0] + up[0] * -4, sh[1] + 4, hip[0], hip[1] - 3, shade(s.metal, 1.15));
    }
    if (s.belt) {
      p.line(H2[0], H2[1] - 1, H1[0], H1[1] - 1, s.belt, 2);
      p.set(Math.round(hip[0] + n[0] * 1.5), Math.round(hip[1] - 1), hex('#d8c070'));
    }
  }
  // --- scarf (behind head, flowing back)
  if (s.scarf) {
    const ph = q.scarf || 0;
    const sx = sh[0] - 1, sy = sh[1] - 1;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 5; i++) pts.push([sx - i * 2.2, sy + i * 0.8 + Math.sin(ph + i * 0.9) * (i * 0.35)]);
    for (let i = 0; i < pts.length - 1; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i % 2 ? hex('#9a6a18') : hex('#d8a030'), 2.2 - i * 0.2);
  }
  // --- front leg
  drawLeg(q.fl, 1, 1);
  if (s.coat) {
    // front coat flap over thigh
    p.poly(
      [
        [hip[0] - 1, hip[1] - 2],
        [hip[0] + s.ww + 1, hip[1] - 2],
        [hip[0] + s.ww + 1 + (q.coat || 0) * 0.1, hip[1] + 6],
        [hip[0] + 1, hip[1] + 5],
      ],
      s.top,
    );
    p.line(hip[0] + s.ww + 1, hip[1] - 2, hip[0] + s.ww + 1, hip[1] + 6, s.topL);
  }
  // --- head
  const [hx, hy] = headC;
  switch (s.head) {
    case 'hunter': {
      // ponytail
      const lift = q.hair || 0;
      p.line(hx - 2, hy - 3, hx - 7, hy - 1 - lift, s.hair, 2.4);
      p.line(hx - 7, hy - 1 - lift, hx - 10, hy + 2 - lift * 1.3, s.hair, 1.6);
      p.circle(hx - 0.5, hy - 0.5, 4, s.hair);
      p.ellipse(hx + 1.2, hy + 0.8, 2.8, 3.3, s.skin);
      p.set(hx - 1, hy + 2, s.skinD);
      p.set(hx, hy + 3, s.skinD);
      // fringe
      p.rect(Math.round(hx - 3), Math.round(hy - 4), 7, 2, s.hair);
      p.set(Math.round(hx + 3), Math.round(hy - 2), s.hair);
      p.set(Math.round(hx - 1), Math.round(hy - 4), s.hairL);
      p.set(Math.round(hx), Math.round(hy - 4), s.hairL);
      // headband
      p.line(hx - 4, hy - 2, hx + 3, hy - 3, hex('#b02a3a'));
      p.set(Math.round(hx + 2), Math.round(hy), s.eye);
      break;
    }
    case 'hunterM': {
      // short swept-back hair with a couple of spikes that lift when moving, no ponytail
      const lift = q.hair || 0;
      p.circle(hx - 0.5, hy - 0.8, 4, s.hair);
      p.line(hx - 3, hy - 3, hx - 6, hy - 2 - lift * 0.6, s.hair, 2);
      p.line(hx - 3, hy - 1, hx - 6, hy + 1 - lift * 0.4, s.hair, 1.6);
      p.ellipse(hx + 1.2, hy + 1, 2.8, 3.3, s.skin);
      p.set(hx - 1, hy + 2, s.skinD);
      p.set(hx, hy + 3, s.skinD);
      p.set(Math.round(hx + 2), Math.round(hy + 3), s.skinD); // squarer jaw
      // short fringe swept to the front
      p.rect(Math.round(hx - 3), Math.round(hy - 5), 7, 2, s.hair);
      p.set(Math.round(hx + 4), Math.round(hy - 4), s.hair);
      p.set(Math.round(hx), Math.round(hy - 5), s.hairL);
      p.set(Math.round(hx + 1), Math.round(hy - 5), s.hairL);
      // headband, eye and brow
      p.line(hx - 4, hy - 2, hx + 3, hy - 3, hex('#b02a3a'));
      p.set(Math.round(hx + 2), Math.round(hy), s.eye);
      p.set(Math.round(hx + 2), Math.round(hy - 1), s.hair);
      break;
    }
    case 'skull': {
      p.circle(hx, hy - 0.5, 3.6, s.pants);
      p.rect(Math.round(hx - 1), Math.round(hy + 2), 5, 2, s.pants);
      p.set(Math.round(hx + 1), Math.round(hy), s.eye);
      p.set(Math.round(hx + 2), Math.round(hy), s.eye);
      p.set(Math.round(hx - 1), Math.round(hy), s.pantsD);
      p.set(Math.round(hx + 3), Math.round(hy + 2), s.pantsD);
      p.set(Math.round(hx + 1), Math.round(hy + 3), s.pantsD);
      break;
    }
    case 'helm': {
      const m = s.metal!;
      p.circle(hx, hy, 4, shade(m, 0.8));
      p.ellipse(hx + 0.5, hy - 0.5, 3.5, 3.6, m);
      p.line(hx - 1, hy, hx + 4, hy, hex('#120a10'));
      p.set(Math.round(hx + 3), Math.round(hy), hex('#ff4040'));
      // plume
      p.line(hx, hy - 4, hx - 4, hy - 7, hex('#a01c2c'), 2);
      p.line(hx - 4, hy - 7, hx - 8, hy - 4, hex('#701020'), 2);
      break;
    }
    case 'zombie': {
      p.circle(hx, hy, 3.6, s.skin);
      p.set(Math.round(hx + 2), Math.round(hy), s.eye);
      p.set(Math.round(hx + 1), Math.round(hy + 2), s.skinD);
      p.set(Math.round(hx + 2), Math.round(hy + 2), s.skinD);
      p.line(hx - 3, hy - 3, hx + 2, hy - 4, s.hair, 1.6);
      p.line(hx - 4, hy - 2, hx - 4, hy + 2, s.hair, 1.4);
      break;
    }
    case 'drowned': {
      p.ellipse(hx, hy, 4, 3.8, s.skin);
      p.set(Math.round(hx + 2), Math.round(hy - 1), s.eye);
      p.set(Math.round(hx + 3), Math.round(hy - 1), s.eye);
      if (q.mouth) p.rect(Math.round(hx + 1), Math.round(hy + 1), 3, 2, hex('#1a0a10'));
      for (let i = -3; i <= 1; i += 2) p.line(hx + i, hy - 3, hx + i - 1, hy + 4 + (i & 1), s.hair, 1.2);
      break;
    }
  }
  // --- front arm (on top)
  const hand = drawArm(q.fa, 1.5, 1);
  return { hand, backHand, head: headC, shoulder: sh };
}

// ---------------------------------------------------------------- styles

const O = hex('#120a12');
export const HERO: Style = {
  o: O, skin: hex('#eab89a'), skinD: hex('#b97c66'), hair: hex('#b8b4c8'), hairL: hex('#f0eef8'),
  top: hex('#6a1a2c'), topD: hex('#40101c'), topL: hex('#9a3048'), pants: hex('#2e2a42'), pantsD: hex('#1c1a2a'),
  boot: hex('#5a3a26'), bootD: hex('#2e1e14'), glove: hex('#6e4a2c'), belt: hex('#3a2416'), eye: hex('#201020'),
  head: 'hunter', coat: true, scarf: true, thigh: 7, shin: 7, torso: 11, upper: 6, fore: 6, legW: 3, armW: 2.6, sw: 3.5, ww: 3,
};
/** Anzel, Vesna's twin: same silver hair and gold scarf, a slate-blue coat and a broader build. Same height, so hitboxes match. */
export const HERO_M: Style = {
  ...HERO,
  skin: hex('#e2ae90'), skinD: hex('#a87060'),
  top: hex('#24365a'), topD: hex('#141e36'), topL: hex('#3e5888'), pants: hex('#2a2a32'), pantsD: hex('#18181e'),
  boot: hex('#4a3020'), bootD: hex('#261810'),
  head: 'hunterM', legW: 3.2, armW: 2.9, sw: 4.2, ww: 3.3,
};
const ZOMBIE: Style = {
  o: O, skin: hex('#86a070'), skinD: hex('#566a48'), hair: hex('#2a2420'), hairL: hex('#3a3430'),
  top: hex('#5a4634'), topD: hex('#3a2c22'), topL: hex('#6e5844'), pants: hex('#3a3646'), pantsD: hex('#24222e'),
  boot: hex('#3a3646'), bootD: hex('#24222e'), glove: hex('#86a070'), eye: hex('#ffe060'),
  head: 'zombie', coat: false, scarf: false, thigh: 7, shin: 7, torso: 11, upper: 6, fore: 6, legW: 3, armW: 2.6, sw: 3.5, ww: 3,
};
const SKELETON: Style = {
  o: O, skin: hex('#dcd4b4'), skinD: hex('#9a927a'), hair: hex('#000'), hairL: hex('#000'),
  top: hex('#dcd4b4'), topD: hex('#9a927a'), topL: hex('#fff'), pants: hex('#dcd4b4'), pantsD: hex('#8a826c'),
  boot: hex('#dcd4b4'), bootD: hex('#8a826c'), glove: hex('#dcd4b4'), eye: hex('#ff3030'),
  head: 'skull', coat: false, scarf: false, bones: true, thigh: 7, shin: 7, torso: 11, upper: 6, fore: 6, legW: 2, armW: 2, sw: 3, ww: 2,
};
const KNIGHT: Style = {
  o: O, skin: hex('#8a8ea0'), skinD: hex('#4a4e60'), hair: hex('#000'), hairL: hex('#000'),
  top: hex('#7a7e92'), topD: hex('#44485a'), topL: hex('#c8ccd8'), pants: hex('#5a5e70'), pantsD: hex('#34384a'),
  boot: hex('#7a7e92'), bootD: hex('#34384a'), glove: hex('#5a5e70'), metal: hex('#a8acbc'), belt: hex('#5a1820'), eye: hex('#f00'),
  head: 'helm', coat: false, scarf: false, armor: true, thigh: 8, shin: 8, torso: 12, upper: 7, fore: 6, legW: 3.6, armW: 3.2, sw: 4.5, ww: 3.5,
};
const DROWNED: Style = {
  o: O, skin: hex('#86b0a6'), skinD: hex('#527a72'), hair: hex('#2f5a2a'), hairL: hex('#4a7a3a'),
  top: hex('#4a5a56'), topD: hex('#2e3a38'), topL: hex('#6a7a76'), pants: hex('#3a4846'), pantsD: hex('#222e2c'),
  boot: hex('#86b0a6'), bootD: hex('#527a72'), glove: hex('#86b0a6'), eye: hex('#f0f070'),
  head: 'drowned', coat: false, scarf: false, thigh: 7, shin: 6, torso: 12, upper: 7, fore: 7, legW: 3.4, armW: 3, sw: 4.5, ww: 4,
};

function finish(p: PixelCanvas, o: RGBA) {
  p.outline(o);
  return p;
}

// ---------------------------------------------------------------- hero sheet

export const HERO_W = 48, HERO_H = 48, HERO_AX = 24, HERO_AY = 28, HERO_FEET = 46;
export const ATTACK_DIRS = [90, 135, 178, 45, 4]; // fwd, upfwd, up, downfwd, down

const STAND = (o: Partial<Pose> = {}): Pose => ({
  hx: 24, hy: 32, lean: 2, fl: [8, 6], bl: [-6, 4], fa: [12, 22], ba: [-12, 18], coat: 0, hair: 0, scarf: 0, ...o,
});

/** Builds a hero sheet. Pass HERO (Vesna) or HERO_M (Anzel); both share every pose. */
export function buildHeroSheet(st: Style = HERO): SheetBuilder {
  const b = new SheetBuilder(HERO_W, HERO_H, HERO_AX, HERO_AY);
  const frame = (q: Pose, extra?: (p: PixelCanvas, r: RigOut) => void) => {
    const p = b.canvas();
    const r = drawHumanoid(p, st, q);
    if (extra) extra(p, r);
    finish(p, st.o);
    return { p, r };
  };
  const add = (name: string, poses: Pose[], extra?: (p: PixelCanvas, r: RigOut) => void) => {
    const fr = poses.map((q) => frame(q, extra));
    const idx = b.add(name, ...fr.map((f) => f.p));
    idx.forEach((id, k) => (b.meta[id] = { hand: [fr[k].r.hand[0] - HERO_AX, fr[k].r.hand[1] - HERO_AY] }));
  };

  add('idle', [0, 1, 2, 3].map((i) => STAND({ hy: 32 + (i >= 2 ? 1 : 0), scarf: i * 1.5, fa: [12 + (i >= 2 ? 3 : 0), 22], hair: i % 2 })));
  add(
    'walk',
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const t = (i / 8) * Math.PI * 2;
      const s = Math.sin(t);
      return STAND({
        hy: 32 + (Math.abs(Math.cos(t)) < 0.5 ? 1 : 0),
        lean: 6,
        fl: [26 * s, 8 + 26 * Math.max(0, Math.cos(t))],
        bl: [-26 * s, 8 + 26 * Math.max(0, -Math.cos(t))],
        fa: [-22 * s + 8, 25],
        ba: [22 * s - 8, 20],
        coat: 2 + Math.abs(s) * 2,
        scarf: i,
        hair: 1,
      });
    }),
  );
  add('jump', [STAND({ hy: 30, lean: 4, fl: [50, 80], bl: [-5, 60], fa: [70, 40], ba: [-50, 30], coat: -2, hair: -1, scarf: 1 })]);
  add('fall', [0, 1].map((i) => STAND({ hy: 30, lean: 0, fl: [18, 22], bl: [-14, 12], fa: [120 + i * 10, 20], ba: [-120 - i * 10, 20], coat: 5, hair: 3, scarf: i * 2 })));
  add('crouch', [STAND({ hy: 37, lean: 18, fl: [72, 82], bl: [8, 92], fa: [40, 30], ba: [-10, 20], coat: 3 })]);
  add('land', [STAND({ hy: 35, lean: 12, fl: [40, 60], bl: [-10, 50], fa: [30, 30], ba: [-20, 20], coat: 3 })]);
  add('dash', [0, 1].map((i) => STAND({ hy: 33, lean: -10, fl: [30, 20 + i * 10], bl: [-22, 18], fa: [40, 30], ba: [-40, 20], coat: -3, hair: 2, scarf: i * 3 })));
  add('hurt', [STAND({ hy: 31, lean: -25, fl: [35, 40], bl: [-10, 30], fa: [150, 20], ba: [-150, 20], coat: 6, hair: 4, headDy: 1 })]);
  add('dead', [STAND()]);
  // dead frame: lying pose drawn horizontally
  {
    const p = b.canvas();
    const q: Pose = { hx: 30, hy: 43, lean: -88, fl: [92, 4], bl: [86, 10], fa: [30, 10], ba: [0, 0], coat: 0 };
    drawHumanoid(p, st, q);
    finish(p, st.o);
    b.frames[b.anims.dead[0]] = p;
  }
  add('throw', [STAND({ lean: -6, fa: [-150, 40], ba: [-10, 20], fl: [20, 10], bl: [-20, 10] }), STAND({ lean: 12, fa: [105, 0], ba: [-30, 20], fl: [25, 10], bl: [-22, 12], coat: 2 })]);
  add('hang', [STAND({ hy: 34, lean: 0, fa: [176, 0], ba: [168, 8], fl: [10, 20], bl: [-8, 28], coat: 1, hair: -1 })]);
  add('swingF', [STAND({ hy: 34, lean: 14, fa: [168, 0], ba: [160, 8], fl: [40, 30], bl: [20, 40], coat: -3, hair: 3 })]);
  add('swingB', [STAND({ hy: 34, lean: -14, fa: [-176, 0], ba: [-168, 8], fl: [-20, 10], bl: [-30, 20], coat: 6, hair: -2 })]);
  add('victory', [STAND({ fa: [170, 0], ba: [-20, 10], lean: -4, hair: 2, scarf: 2 })]);
  // slide: leaning far back, front leg shot out along the ground, back hand trailing
  add('slide', [STAND({ hx: 25, hy: 42, lean: -62, fl: [86, 2], bl: [40, 100], fa: [100, 30], ba: [-80, 10], coat: 6, hair: 3, scarf: 3 })]);
  // double jump: knees tucked (the player spins this frame)
  add('tuck', [STAND({ hy: 31, lean: 20, fl: [100, 135], bl: [75, 125], fa: [60, 70], ba: [20, 80], coat: 2, hair: 2, scarf: 1 })]);
  // easter egg: 0 = bent over and straining, 1 = startled hop, 2-3 = fanning the air behind her
  add('toot', [
    STAND({ hy: 35, lean: 34, fl: [34, 40], bl: [-24, 30], fa: [70, 50], ba: [40, 60], coat: 7, hair: 1 }),
    STAND({ hy: 31, lean: -14, fl: [24, 46], bl: [-28, 36], fa: [155, 30], ba: [-150, 30], coat: 6, hair: 4, scarf: 3, headDy: -1 }),
    STAND({ lean: 4, fa: [130, 120], ba: [-70, 50], coat: 2, hair: 1 }),
    STAND({ lean: 4, fa: [130, 120], ba: [-35, 80], coat: 3, hair: 1, scarf: 2 }),
  ]);

  // attack frames: stance x dir x phase
  const stances: Record<string, Partial<Pose>> = {
    stand: { hy: 33, fl: [22, 10], bl: [-22, 10] },
    crouch: { hy: 37, fl: [72, 82], bl: [8, 92] },
    air: { hy: 30, fl: [45, 75], bl: [-8, 55], coat: -2 },
  };
  for (const st of Object.keys(stances)) {
    ATTACK_DIRS.forEach((a, d) => {
      const leanW = st === 'crouch' ? 12 : -10;
      const leanS = st === 'crouch' ? 20 : d === 2 ? -4 : d === 4 || d === 3 ? 14 : 10;
      add(`atk_${st}_${d}_0`, [STAND({ ...stances[st], lean: leanW, fa: [-140, 40], ba: [10, 30], coat: 2, hair: 1 })]);
      add(`atk_${st}_${d}_1`, [STAND({ ...stances[st], lean: leanS, fa: [a, 0], ba: [-30, 20], coat: 3, hair: 2, scarf: 2 })]);
    });
  }
  return b;
}

// ---------------------------------------------------------------- enemy sheets

export function buildZombieSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 48, 20, 28);
  const pose = (i: number): Pose => {
    const t = (i / 4) * Math.PI * 2;
    const s = Math.sin(t);
    return { hx: 18, hy: 32, lean: 22, fl: [18 * s, 12], bl: [-18 * s, 12], fa: [78 + s * 6, 10], ba: [70 - s * 6, 14], headDy: 1 };
  };
  const walk: PixelCanvas[] = [];
  for (let i = 0; i < 4; i++) {
    const p = b.canvas();
    drawHumanoid(p, ZOMBIE, pose(i));
    // rags
    p.set(15, 36, hex('#3a2c22'));
    p.set(21, 37, hex('#3a2c22'));
    walk.push(finish(p, O));
  }
  b.add('walk', ...walk);
  // rising from the ground
  const rise: PixelCanvas[] = [];
  for (let k = 0; k < 5; k++) {
    const p = b.canvas();
    const src = b.canvas();
    drawHumanoid(src, ZOMBIE, { ...pose(0), fa: [150, 10], ba: [140, 10], lean: 10 });
    finish(src, O);
    const off = Math.round((1 - k / 4) * 34);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 40; x++) {
        const yy = y - off;
        if (yy < 0) continue;
        const c = src.get(x, yy);
        if (c[3] && y <= 45) p.set(x, y, c);
      }
    // dirt mound
    p.ellipse(19, 46, 9, 2.5 + (k < 4 ? 1 : 0), hex('#3a2a1c'));
    p.ellipse(19, 45, 6, 1.5, hex('#5a4430'));
    rise.push(p);
  }
  b.add('rise', ...rise);
  return b;
}

export function buildSkeletonSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 48, 20, 28);
  const base = (o: Partial<Pose>): Pose => ({ hx: 20, hy: 32, lean: 4, fl: [10, 6], bl: [-10, 6], fa: [20, 30], ba: [-15, 20], ...o });
  const frames = (name: string, poses: Pose[], bone = false) =>
    b.add(
      name,
      ...poses.map((q) => {
        const p = b.canvas();
        const r = drawHumanoid(p, SKELETON, q);
        if (bone) {
          p.line(r.hand[0] - 3, r.hand[1] - 2, r.hand[0] + 3, r.hand[1] + 2, hex('#e8e0c0'), 2);
        }
        return finish(p, O);
      }),
    );
  frames('walk', [0, 1, 2, 3].map((i) => {
    const s = Math.sin((i / 4) * Math.PI * 2);
    return base({ fl: [20 * s, 10], bl: [-20 * s, 10], fa: [-15 * s + 10, 30], ba: [15 * s - 10, 20] });
  }));
  frames('throw', [base({ fa: [-150, 30], lean: -6 }), base({ fa: [120, 0], lean: 12 })], true);
  frames('hop', [base({ hy: 30, fl: [40, 60], bl: [0, 50], fa: [60, 30], ba: [-60, 30] })]);
  return b;
}

export function buildKnightSheet(): SheetBuilder {
  const b = new SheetBuilder(72, 52, 28, 30);
  const base = (o: Partial<Pose>): Pose => ({ hx: 28, hy: 33, lean: 4, fl: [12, 8], bl: [-12, 8], fa: [60, 30], ba: [20, 60], ...o });
  const draw = (q: Pose, spearOut: number) => {
    const p = b.canvas();
    const r = drawHumanoid(p, KNIGHT, q);
    // spear held in front hand, pointing forward
    const hx = r.hand[0], hy = r.hand[1];
    p.line(hx - 14 + spearOut, hy, hx + 16 + spearOut, hy, hex('#6a4a2a'), 1.6);
    p.poly([[hx + 16 + spearOut, hy - 2.5], [hx + 23 + spearOut, hy], [hx + 16 + spearOut, hy + 2.5]], hex('#d0d4e0'));
    p.set(hx + 15 + spearOut, hy - 1, hex('#a01c2c'));
    // shield on back hand
    const bx = r.backHand[0] + 3, by = r.backHand[1] - 4;
    p.rect(Math.round(bx - 3), Math.round(by - 6), 7, 12, hex('#5a5e70'));
    p.rect(Math.round(bx - 2), Math.round(by - 5), 5, 10, hex('#7a1a28'));
    p.line(bx + 0.5, by - 4, bx + 0.5, by + 4, hex('#d8c070'));
    p.line(bx - 1.5, by - 1, bx + 2.5, by - 1, hex('#d8c070'));
    return finish(p, O);
  };
  b.add('walk', ...[0, 1, 2, 3].map((i) => {
    const s = Math.sin((i / 4) * Math.PI * 2);
    return draw(base({ fl: [16 * s, 10], bl: [-16 * s, 10], hy: 33 + (i % 2) }), 0);
  }));
  b.add('ready', draw(base({ lean: -6, fa: [50, 50], fl: [25, 15], bl: [-25, 10] }), -8));
  b.add('thrust', draw(base({ lean: 14, fa: [88, 0], fl: [30, 10], bl: [-30, 10] }), 6), draw(base({ lean: 16, fa: [90, 0], fl: [32, 10], bl: [-32, 10] }), 14));
  return b;
}

export function buildDrownedSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 48, 20, 28);
  const base = (o: Partial<Pose>): Pose => ({ hx: 19, hy: 33, lean: 12, fl: [10, 8], bl: [-10, 8], fa: [40, 30], ba: [20, 30], ...o });
  const draw = (q: Pose) => {
    const p = b.canvas();
    drawHumanoid(p, DROWNED, q);
    return finish(p, O);
  };
  b.add('walk', ...[0, 1, 2, 3].map((i) => {
    const s = Math.sin((i / 4) * Math.PI * 2);
    return draw(base({ fl: [18 * s, 12], bl: [-18 * s, 12], fa: [40 - 10 * s, 30], ba: [20 + 10 * s, 30] }));
  }));
  b.add('leap', draw(base({ hy: 30, lean: 20, fl: [50, 90], bl: [10, 80], fa: [150, 10], ba: [140, 10] })));
  b.add('spit', draw(base({ lean: 24, fa: [60, 30], ba: [40, 30], mouth: 1, headDy: 1 })));
  return b;
}

export function buildBatSheet(): SheetBuilder {
  const b = new SheetBuilder(28, 20, 14, 10);
  const body = hex('#3a2440'), wing = hex('#5c2c4c'), wingD = hex('#3a1a30'), eye = hex('#ff3040');
  const draw = (w: number) => {
    const p = b.canvas();
    const cx = 14, cy = 10;
    const wy = cy - 6 * w;
    for (const s of [-1, 1]) {
      p.poly([[cx + s * 2, cy - 2], [cx + s * 13, wy], [cx + s * 10, cy + 2 - w * 2], [cx + s * 7, cy + 1], [cx + s * 4, cy + 3]], wing);
      p.line(cx + s * 2, cy - 2, cx + s * 13, wy, wingD);
      p.line(cx + s * 7, cy - 1 - w * 2, cx + s * 7, cy + 1, wingD);
    }
    p.ellipse(cx, cy, 3, 3.5, body);
    p.set(cx - 2, cy - 4, body);
    p.set(cx + 2, cy - 4, body);
    p.set(cx - 1, cy - 1, eye);
    p.set(cx + 1, cy - 1, eye);
    p.set(cx, cy + 2, hex('#e8e0d0'));
    return finish(p, O);
  };
  b.add('fly', draw(1), draw(0.4), draw(-0.6), draw(0.1));
  {
    // hanging: folded upside-down
    const p = b.canvas();
    p.ellipse(14, 9, 3.5, 5, wingD);
    p.ellipse(14, 9, 2.5, 4, body);
    p.set(13, 12, eye);
    p.set(15, 12, eye);
    p.line(14, 3, 14, 4, hex('#888'));
    b.add('hang', finish(p, O));
  }
  return b;
}

export function buildWispSheet(): SheetBuilder {
  const b = new SheetBuilder(24, 28, 12, 15);
  const frames: PixelCanvas[] = [];
  for (let i = 0; i < 4; i++) {
    const p = b.canvas();
    const cx = 12, cy = 16;
    const tip = Math.sin(i * 1.6) * 3;
    p.poly([[cx - 7, cy], [cx + tip, cy - 13], [cx + 7, cy], [cx + 5, cy + 6], [cx - 5, cy + 6]], hex('#2c6c8c'));
    p.circle(cx, cy + 1, 6.5, hex('#2c6c8c'));
    p.poly([[cx - 5, cy], [cx + tip * 0.7, cy - 9], [cx + 5, cy], [cx + 3, cy + 5], [cx - 3, cy + 5]], hex('#58b8d8'));
    p.circle(cx, cy + 1, 4.5, hex('#58b8d8'));
    p.circle(cx, cy + 2, 3, hex('#c8f0ff'));
    p.set(cx - 2, cy + 1, hex('#102030'));
    p.set(cx + 2, cy + 1, hex('#102030'));
    p.rect(cx - 1, cy + 4, 3, 1, hex('#102030'));
    frames.push(finish(p, hex('#0a2030')));
  }
  b.add('float', ...frames);
  return b;
}

// ---------------------------------------------------------------- boss (Ossuary Wyrm)

export function buildWyrmSheet(): SheetBuilder {
  const b = new SheetBuilder(80, 56, 40, 28);
  const bone = hex('#e2d8b8'), boneM = hex('#b8ac8a'), boneD = hex('#7c7058'), dark = hex('#1a0e10');
  const skull = (open: number) => {
    const p = b.canvas();
    const cx = 36, cy = 26;
    // horns sweeping back
    p.line(cx - 6, cy - 9, cx - 22, cy - 18, boneM, 4);
    p.line(cx - 22, cy - 18, cx - 30, cy - 14, boneD, 3);
    p.line(cx - 2, cy - 10, cx - 12, cy - 22, bone, 3);
    // lower jaw
    const ja = open * 0.5;
    const jx = cx + 30 * Math.cos(ja), jy = cy + 6 + 30 * Math.sin(ja);
    p.poly([[cx - 10, cy + 3], [jx, jy - 3], [jx - 2, jy + 2], [cx - 8, cy + 10]], boneM);
    for (let i = 0; i < 6; i++) {
      const t = 0.25 + i * 0.12;
      const tx = cx - 10 + (jx - cx + 10) * t, ty = cy + 3 + (jy - 3 - cy - 3) * t;
      p.line(tx, ty, tx + 1, ty - 3, bone);
    }
    // cranium + snout
    p.ellipse(cx - 6, cy - 2, 13, 10, boneM);
    p.ellipse(cx - 6, cy - 4, 12, 8, bone);
    p.poly([[cx - 2, cy - 9], [cx + 32, cy - 2], [cx + 33, cy + 3], [cx + 26, cy + 6], [cx - 6, cy + 6]], boneM);
    p.poly([[cx - 2, cy - 9], [cx + 32, cy - 2], [cx + 26, cy + 1], [cx - 4, cy + 1]], bone);
    // upper teeth
    for (let i = 0; i < 7; i++) p.line(cx + 2 + i * 4, cy + 5, cx + 3 + i * 4, cy + 8, bone);
    // eye socket + nostril
    p.ellipse(cx + 2, cy - 2, 4, 3, dark);
    p.circle(cx + 3, cy - 2, 1.5, hex('#ff3018'));
    p.set(cx + 3, cy - 3, hex('#ffd060'));
    p.ellipse(cx + 28, cy - 1, 1.5, 1, dark);
    // cracks
    p.line(cx - 14, cy - 6, cx - 9, cy - 2, boneD);
    p.line(cx - 9, cy - 2, cx - 11, cy + 2, boneD);
    p.line(cx + 10, cy - 6, cx + 16, cy - 4, boneD);
    if (open > 0.5) {
      p.ellipse(cx + 14, cy + 9, 9, 3 * open, hex('#5a0a10'));
    }
    return finish(p, hex('#120808'));
  };
  b.add('skull', skull(0), skull(0.6), skull(1.1));
  const vert = (rib: boolean) => {
    const p = b.canvas();
    const cx = 40, cy = 28;
    if (rib) {
      for (const s of [-1, 1]) {
        p.line(cx + s * 4, cy + 4, cx + s * 12, cy + 12, boneM, 2.5);
        p.line(cx + s * 12, cy + 12, cx + s * 12, cy + 20, boneD, 2);
      }
    }
    p.poly([[cx - 3, cy - 6], [cx + 1, cy - 18], [cx + 4, cy - 6]], boneM); // dorsal spike
    p.line(cx + 1, cy - 17, cx + 2, cy - 7, bone);
    p.ellipse(cx, cy, 9, 7, boneM);
    p.ellipse(cx, cy - 1, 8, 5.5, bone);
    p.rect(cx - 10, cy - 1, 3, 3, boneD);
    p.rect(cx + 8, cy - 1, 3, 3, boneD);
    p.circle(cx, cy, 2, boneD);
    return finish(p, hex('#120808'));
  };
  b.add('vert', vert(true), vert(false));
  {
    const p = b.canvas();
    const cx = 40, cy = 28;
    p.poly([[cx - 8, cy - 5], [cx + 22, cy], [cx - 8, cy + 5]], boneM);
    p.poly([[cx - 8, cy - 4], [cx + 20, cy], [cx - 8, cy]], bone);
    p.ellipse(cx - 8, cy, 5, 5, boneM);
    p.poly([[cx - 4, cy - 4], [cx + 2, cy - 12], [cx + 4, cy - 2]], boneD);
    b.add('tail', finish(p, hex('#120808')));
  }
  return b;
}

/** Recolors a canvas for the burning second phase (unused if tint suffices). */
export function emberize(p: PixelCanvas) {
  p.map((c) => mix(c, hex('#ff7020'), 0.35));
  return p;
}
