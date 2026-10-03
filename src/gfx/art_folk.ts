// The castle's two-legged dead, the bat and the wisp, redrawn with form shading (0.24.0):
// the Risen (zombie), the Bone Thrower (skeleton), the Bone Librarian, the Hollow Knight and
// the Drowned.
//
// They share one puppet, `figure()`: the same joints and `Pose` as the old rig in art_chars.ts
// (so their poses still mean what they meant), drawn as shaded volumes. Their walks have twice
// the frames they had; `SheetBuilder.smooth` records that, and Sprite.anim() plays them twice
// as fast, so the enemy code and its timing did not have to change. Everything faces right.
import { SheetBuilder, PixelCanvas } from './pixel';
import { FormCanvas, ramp, Ramp, V } from './form';
import type { Pose } from './art_chars';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const dirv = (a: number): V => [Math.sin(a * DEG), Math.cos(a * DEG)];

const BONE = ramp('#342c2a', '#665e50', '#9a927a', '#c4bc9e', '#e2dabc', '#f8f4e0');
const STEEL = ramp('#141622', '#2c3046', '#4c5068', '#72768e', '#9ea2b6', '#d4d8e6');
const WOOD = ramp('#2a1a0e', '#4a321c', '#6a4a2a', '#8a6840');
const RED = ramp('#3e0a14', '#701020', '#a01c2c', '#cc4450');
const GOLD = ramp('#8a6018', '#d8c070', '#fff4b0');
const DARK = ramp('#0c0608', '#1e1014', '#3a2a1c');
const GLOW_R = ramp('#901010', '#ff3030', '#ffb0a0'); // red eyes
const GLOW_Y = ramp('#a08010', '#f0f070', '#ffffd0'); // yellow eyes

interface Folk {
  kind: 'zombie' | 'skeleton' | 'knight' | 'drowned';
  skin: Ramp;
  top: Ramp;
  pants: Ramp;
  thigh: number; shin: number; torso: number; upper: number; fore: number;
  leg: number; arm: number; // limb radii
  sw: number; ww: number; // shoulder and waist half widths
}
interface Rig { hand: V; backHand: V; head: V; shoulder: V }

const ZOMBIE: Folk = {
  kind: 'zombie',
  skin: ramp('#1e2c1c', '#3a4e32', '#566a48', '#86a070', '#aec494'),
  top: ramp('#1c140e', '#3a2c22', '#5a4634', '#6e5844', '#8c765c'),
  pants: ramp('#14121a', '#24222e', '#3a3646', '#524e62'),
  thigh: 7, shin: 7, torso: 11, upper: 6, fore: 6, leg: 1.7, arm: 1.5, sw: 3.6, ww: 3,
};
const SKELETON: Folk = { ...ZOMBIE, kind: 'skeleton', skin: BONE, top: BONE, pants: BONE, leg: 1, arm: 1, sw: 3, ww: 2 };
const KNIGHT: Folk = {
  kind: 'knight',
  skin: STEEL,
  top: STEEL,
  pants: ramp('#161824', '#34384a', '#5a5e70', '#7c8094'),
  thigh: 8, shin: 8, torso: 12, upper: 7, fore: 6, leg: 2, arm: 1.8, sw: 4.6, ww: 3.6,
};
const DROWNED: Folk = {
  kind: 'drowned',
  skin: ramp('#1c3230', '#36544e', '#527a72', '#86b0a6', '#b6d6ca'),
  top: ramp('#141c1a', '#2e3a38', '#4a5a56', '#6a7a76'),
  pants: ramp('#101816', '#222e2c', '#3a4846', '#54645e'),
  thigh: 7, shin: 6, torso: 12, upper: 7, fore: 7, leg: 1.9, arm: 1.7, sw: 4.5, ww: 4,
};
const WEED = ramp('#122a0e', '#2f5a2a', '#4a7a3a'); // the Drowned's hair

/** Draw one of them in a pose. Returns where its hands, head and shoulder ended up. */
function figure(f: FormCanvas, s: Folk, q: Pose): Rig {
  const hip: V = [q.hx, q.hy];
  const up: V = [Math.sin(q.lean * DEG), -Math.cos(q.lean * DEG)];
  const n: V = [Math.cos(q.lean * DEG), Math.sin(q.lean * DEG)];
  const sh: V = [hip[0] + up[0] * s.torso, hip[1] + up[1] * s.torso];
  const head: V = [sh[0] + up[0] * 4.5, sh[1] + up[1] * 4.5 + (q.headDy || 0)];
  const bones = s.kind === 'skeleton', knight = s.kind === 'knight';
  const limb = (a: V, b: V, r0: number, r1: number, r: Ramp) => f.limb(a[0], a[1], b[0], b[1], r0, r1, r);

  const leg = (L: V, off: number, dim: number) => {
    const h: V = [hip[0] + off, hip[1]];
    const d1 = dirv(L[0]), d2 = dirv(L[0] - L[1]);
    const k: V = [h[0] + d1[0] * s.thigh, h[1] + d1[1] * s.thigh];
    const foot: V = [k[0] + d2[0] * s.shin, k[1] + d2[1] * s.shin];
    f.bias = dim;
    f.next();
    limb(h, k, s.leg, s.leg * 0.85, s.pants);
    limb(k, foot, s.leg * 0.85, s.leg * 0.75, knight ? s.top : s.pants);
    if (bones || knight) f.ball(k[0], k[1], s.leg + 0.4, s.leg + 0.4, s.top); // a knob of a knee, or a knee cop
    // the foot: bare and rotten, a bone, or a boot
    limb([foot[0] - 0.4, foot[1] - 0.8], [foot[0] + 2.8, foot[1] - 0.5], bones ? 0.9 : 1.3, bones ? 0.7 : 1.1, s.kind === 'knight' ? s.top : s.kind === 'zombie' ? s.pants : s.skin);
    f.bias = 0;
  };
  const arm = (A: V, off: number, dim: number): V => {
    const so: V = [sh[0] + n[0] * off, sh[1] + n[1] * off + 1];
    const d1 = dirv(A[0]), d2 = dirv(A[0] + A[1]);
    const e: V = [so[0] + d1[0] * s.upper, so[1] + d1[1] * s.upper];
    const h: V = [e[0] + d2[0] * s.fore, e[1] + d2[1] * s.fore];
    f.bias = dim;
    f.next();
    limb(so, e, s.arm, s.arm * 0.85, s.top);
    limb(e, h, s.arm * 0.85, s.arm * 0.75, bones || knight ? s.top : s.skin); // the living-ish ones have bare forearms
    if (bones) f.ball(e[0], e[1], 1.3, 1.3, s.top);
    if (knight) f.ball(so[0], so[1], 2.4, 2.3, s.top); // pauldron
    f.ball(h[0], h[1], 1.4, 1.4, knight ? s.pants : s.skin);
    f.bias = 0;
    return h;
  };

  const backHand = arm(q.ba, -1.5, -0.24);
  leg(q.bl, -1, -0.24);

  // ── torso
  f.next();
  if (bones) {
    limb(hip, sh, 1, 1, s.top); // spine
    for (let i = 0; i < 4; i++) {
      const t = 0.35 + i * 0.17, cx = hip[0] + (sh[0] - hip[0]) * t, cy = hip[1] + (sh[1] - hip[1]) * t, w = 2.4 + i * 0.5;
      f.stroke(cx - w, cy + 1, cx + w + 0.6, cy + 0.4, s.top, i % 2 ? 0.75 : 0.9);
      f.dot(cx - w, cy + 2, s.top, 0.3);
    }
    f.ball(hip[0], hip[1], 3.2, 1.7, s.top); // pelvis
  } else {
    limb(hip, [sh[0] - up[0] * (s.sw - 1), sh[1] - up[1] * (s.sw - 1)], s.ww, s.sw, s.top);
    if (knight) {
      // a ridge down the breastplate, a red belt with a gold buckle
      f.groove(sh[0] + n[0] * 1.5 - up[0] * 3, sh[1] + n[1] * 1.5 - up[1] * 3, hip[0] + n[0] * 1.2 + up[0] * 3, hip[1] + n[1] * 1.2 + up[1] * 3, 0.16);
      f.stroke(hip[0] - n[0] * s.ww, hip[1] - n[1] * s.ww - 1, hip[0] + n[0] * s.ww, hip[1] + n[1] * s.ww - 1, RED, 0.45, 2);
      f.dot(hip[0] + n[0] * 1.6, hip[1] + n[1] * 1.6 - 1, GOLD, 0.6);
    } else {
      // a torn hem, and the shadow of a sunken chest
      for (let k = -1; k <= 1; k++) f.stroke(hip[0] + k * 2, hip[1], hip[0] + k * 2 - 0.5, hip[1] + 2 + (k & 1), s.top, 0.3);
      f.groove(sh[0] - up[0] * 4 - n[0], sh[1] - up[1] * 4 - n[1], hip[0] + up[0] * 2 - n[0], hip[1] + up[1] * 2 - n[1], -0.16);
    }
  }
  leg(q.fl, 1, 0);

  // ── head
  const [hx, hy] = head;
  f.next();
  if (s.kind !== 'skeleton') limb([sh[0] + up[0], sh[1] + up[1]], head, 1.4, 1.4, s.skin); // neck
  f.next();
  switch (s.kind) {
    case 'skeleton':
      f.ball(hx, hy - 0.5, 3.7, 3.6, BONE);
      f.ball(hx + 1.2, hy + 2.4, 2.4, 1.5, BONE); // jaw
      f.next();
      f.ball(hx + 1.6, hy - 0.2, 1.5, 1.4, DARK); // socket
      f.dot(hx + 2, hy, GLOW_R, 0.6);
      f.dot(hx + 3.4, hy + 1.2, DARK, 0.2); // nose hole
      for (let k = 0; k < 3; k++) f.dot(hx + 0.6 + k * 1.2, hy + 2.6, DARK, 0.3); // gaps between its teeth
      break;
    case 'knight':
      f.ball(hx, hy, 4.1, 4, STEEL);
      f.next();
      f.stroke(hx - 0.5, hy, hx + 4, hy, DARK, 0.2); // visor slit, an eye burning in it
      f.dot(hx + 3, hy, GLOW_R, 0.6);
      f.groove(hx - 3, hy + 2, hx + 3, hy + 2.4, -0.18);
      // plume, streaming back from the crown
      f.next();
      limb([hx, hy - 4], [hx - 4, hy - 7], 1.3, 1.2, RED);
      limb([hx - 4, hy - 7], [hx - 8.4, hy - 4], 1.2, 0.5, RED);
      break;
    case 'zombie':
      f.ball(hx, hy, 3.7, 3.6, s.skin);
      f.ball(hx + 1.6, hy + 2.2, 2, 1.5, s.skin); // slack jaw
      f.next();
      f.stroke(hx - 3, hy - 3, hx + 2.4, hy - 4, DARK, 0.7, 1.6); // a few hanks of hair
      f.stroke(hx - 4, hy - 2, hx - 4, hy + 2, DARK, 0.5, 1.4);
      f.dot(hx + 1.4, hy - 0.2, DARK, 0.2); // sunken socket
      f.dot(hx + 2.2, hy, GLOW_Y, 0.6);
      f.stroke(hx + 1.2, hy + 2.2, hx + 2.8, hy + 2.2, DARK, 0.25);
      break;
    case 'drowned':
      f.ball(hx, hy, 4.1, 3.9, s.skin);
      f.next();
      f.dot(hx + 2, hy - 1, GLOW_Y, 0.6);
      f.dot(hx + 3, hy - 1, GLOW_Y, 0.95);
      if (q.mouth) f.stroke(hx + 1.5, hy + 1.6, hx + 3.5, hy + 2.2, DARK, 0.2, 2);
      else f.stroke(hx + 1.6, hy + 2, hx + 3.2, hy + 2, DARK, 0.4);
      for (let i = -3; i <= 1; i += 2) f.stroke(hx + i, hy - 3.4, hx + i - 1, hy + 4 + (i & 1), WEED, i === -1 ? 0.8 : 0.5, 1.3); // weed for hair
      break;
  }
  const hand = arm(q.fa, 1.5, 0);
  return { hand, backHand, head, shoulder: sh };
}

const CONTOUR = { contour: 0.2 };

// ---------------------------------------------------------------- zombie

export function buildZombieSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 48, 20, 28);
  const pose = (t: number): Pose => {
    const s = Math.sin(t * TAU);
    return { hx: 18, hy: 32 + Math.abs(Math.cos(t * TAU)) * 0.6, lean: 22 + Math.sin(t * TAU * 2) * 1.5, fl: [18 * s, 12], bl: [-18 * s, 12], fa: [78 + s * 6, 10], ba: [70 - s * 6, 14], headDy: 1 };
  };
  b.smooth('walk', 2, ...Array.from({ length: 8 }, (_, i) => {
    const f = new FormCanvas(40, 48);
    figure(f, ZOMBIE, pose(i / 8));
    return f.resolve(CONTOUR);
  }));
  // rising from the ground: clawing its way up out of a mound of dirt
  b.smooth('rise', 2, ...Array.from({ length: 10 }, (_, k) => {
    const f = new FormCanvas(40, 48);
    const off = (1 - k / 9) * 34;
    f.clipY = 45;
    const q = pose(0);
    figure(f, ZOMBIE, { ...q, hy: q.hy + off, fa: [150 - k * 3, 10], ba: [140 + Math.sin(k) * 8, 10], lean: 10 });
    f.clipY = Infinity;
    f.next();
    f.ball(19, 46, 9, 2.6 + (k < 9 ? 1 : 0), DARK, 0, 0.6);
    f.bias = 0.25;
    f.ball(19, 45.2, 6, 1.5, DARK, 0, 0.6);
    f.bias = 0;
    return f.resolve(CONTOUR);
  }));
  return b;
}

// ---------------------------------------------------------------- skeleton and librarian

/** Book covers the librarian handles (the first is the one it throws). */
const BOOKS = [ramp('#4a141a', '#7a2a30', '#a84a50'), ramp('#162c44', '#2a4a6a', '#4a7096'), ramp('#3a2e0c', '#5a4a1a', '#806c30')];
const PAGE = ramp('#a09878', '#efe4c4');
const CAP = ramp('#160e20', '#22182e', '#3a2a4a', '#56426c');

/** The librarian's little cap: a soft square scholar's cap with a gold tassel. */
function cap(f: FormCanvas, hx: number, hy: number, fromBehind: boolean) {
  f.next();
  f.ball(hx, hy - 4.2, 4.3, 1.4, CAP); // the band, sitting on the crown of the skull
  f.ball(hx, hy - 6, 3.2, 1.5, CAP); // the soft top
  f.dot(hx, hy - 7, GOLD, 0.6);
  if (fromBehind) f.stroke(hx, hy - 6, hx, hy - 2, GOLD, 0.6); // from the back the tassel hangs down the middle
  else {
    f.stroke(hx - 1, hy - 7, hx - 5, hy - 5, GOLD, 0.6);
    f.stroke(hx - 5, hy - 5, hx - 5, hy - 2, GOLD, 0.35);
  }
}
/** A closed book held in a hand, cover out, pages showing along the top. */
function book(f: FormCanvas, x: number, y: number, cover: Ramp, w = 5, h = 6) {
  const bx = Math.round(x) - 2, by = Math.round(y) - 5;
  f.next();
  f.poly([[bx, by], [bx + w, by], [bx + w, by + h], [bx, by + h]], cover, (px) => (px === bx ? 0.2 : px === bx + w - 1 ? 0.85 : 0.55));
  f.stroke(bx, by, bx + w - 1, by, PAGE, 0.9);
  f.dot(bx + 2, by + 3, GOLD, 0.6);
}

export function buildSkeletonSheet(librarian = false): SheetBuilder {
  const b = new SheetBuilder(40, 48, 20, 28);
  const base = (o: Partial<Pose>): Pose => ({ hx: 20, hy: 32, lean: 4, fl: [10, 6], bl: [-10, 6], fa: [20, 30], ba: [-15, 20], ...o });
  const draw = (q: Pose, held = false) => {
    const f = new FormCanvas(40, 48);
    const r = figure(f, SKELETON, q);
    if (librarian) cap(f, r.head[0], r.head[1], false);
    if (held && librarian) book(f, r.hand[0], r.hand[1], BOOKS[0]);
    else if (held) {
      // the bone it is about to throw
      f.next();
      f.limb(r.hand[0] - 3, r.hand[1] - 2, r.hand[0] + 3, r.hand[1] + 2, 1, 1, BONE);
      f.ball(r.hand[0] - 3, r.hand[1] - 2, 1.5, 1.5, BONE);
      f.ball(r.hand[0] + 3, r.hand[1] + 2, 1.5, 1.5, BONE);
    }
    return f.resolve(CONTOUR);
  };
  // a rattling walk: the whole frame jolts at each footfall
  b.smooth('walk', 2, ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * TAU, s = Math.sin(a);
    return draw(base({ hy: 32 + Math.abs(Math.cos(a)) * 0.7, fl: [20 * s, 10], bl: [-20 * s, 10], fa: [-15 * s + 10, 30], ba: [15 * s - 10, 20], headDy: Math.abs(s) < 0.3 ? 1 : 0 }));
  }));
  b.add('throw', draw(base({ fa: [-150, 30], lean: -6 }), true), draw(base({ fa: [120, 0], lean: 12 }), true));
  b.add('hop', draw(base({ hy: 30, fl: [40, 60], bl: [0, 50], fa: [60, 30], ba: [-60, 30] })));
  return b;
}

/**
 * The librarian from behind, facing its bookshelf, at point `u` (0..4) of one loop of shelving:
 * 0 push a book in with the right hand, 1 it is in, 2 pull one out with the left, 3 look it over.
 */
function librarianBack(u: number): PixelCanvas {
  const f = new FormCanvas(40, 48);
  const cx = 20;
  const k = Math.floor(u) % 4, t = u - Math.floor(u), k2 = (k + 1) % 4;
  const mix = (a: number, c: number) => a + (c - a) * t;
  const sway = mix(k === 3 ? 1 : 0, k2 === 3 ? 1 : 0); // leans to read the book in its hand
  // legs and pelvis
  f.next();
  for (const s of [-1, 1]) {
    f.limb(cx + s * 2, 32, cx + s * 3, 45, 1, 0.9, BONE);
    f.limb(cx + s * 3 - 1.5, 45.2, cx + s * 3 + 1.5, 45.2, 0.8, 0.8, BONE);
  }
  f.ball(cx, 32, 3.6, 1.7, BONE);
  // spine and ribs (symmetric from behind), shoulders
  f.next();
  f.limb(cx, 32, cx + sway, 21, 1, 1, BONE);
  for (let i = 0; i < 4; i++) {
    const y = 29 - i * 2, w = 2.5 + i * 0.6;
    f.stroke(cx - w + sway * 0.5, y, cx + w + sway * 0.5, y, BONE, i % 2 ? 0.7 : 0.85);
  }
  f.limb(cx - 4 + sway, 21, cx + 4 + sway, 21, 1.1, 1.1, BONE);
  // arms: [elbow, hand] for the right then the left at each step of the loop
  const R: V[][] = [[[cx + 7, 16], [cx + 6, 9]], [[cx + 7, 16], [cx + 6, 10]], [[cx + 6, 26], [cx + 5, 31]], [[cx + 6, 26], [cx + 5, 31]]];
  const L: V[][] = [[[cx - 6, 26], [cx - 5, 31]], [[cx - 6, 26], [cx - 5, 31]], [[cx - 7, 16], [cx - 6, 10]], [[cx - 5, 22], [cx - 1, 20]]];
  const arm = (sx: number, A: V[][]): V => {
    const e: V = [mix(A[k][0][0], A[k2][0][0]) + sway, mix(A[k][0][1], A[k2][0][1])];
    const h: V = [mix(A[k][1][0], A[k2][1][0]) + sway, mix(A[k][1][1], A[k2][1][1])];
    f.next();
    f.limb(sx + sway, 22, e[0], e[1], 1, 0.9, BONE);
    f.limb(e[0], e[1], h[0], h[1], 0.9, 0.8, BONE);
    f.ball(h[0], h[1], 1.3, 1.3, BONE);
    return h;
  };
  const rh = arm(cx + 4, R), lh = arm(cx - 4, L);
  // the books: the one being shelved, and the one pulled out
  if (k === 0) book(f, rh[0], rh[1] - 1, BOOKS[1], 4, 5);
  if (k === 2) book(f, lh[0], lh[1] - 1, BOOKS[2], 4, 5);
  // back of the skull and the cap
  f.next();
  f.ball(cx + sway, 16.5, 3.7, 3.6, BONE);
  f.groove(cx - 2 + sway, 18, cx + 2 + sway, 18, -0.2);
  cap(f, cx + sway, 16.5, true);
  // reading: just the edges of the open book show either side of the skull
  if (k === 3) {
    f.next();
    for (const s of [-1, 1]) f.poly([[cx + s * 4.5 + sway - 1, 17], [cx + s * 4.5 + sway + 1, 17], [cx + s * 4.5 + sway + 1, 21], [cx + s * 4.5 + sway - 1, 21]], BOOKS[2], 0.6);
  }
  return f.resolve(CONTOUR);
}

/** The Bone Librarian: the skeleton with a cap and books, plus 'tend' (from behind, shelving) and 'turn' (startled). */
export function buildLibrarianSheet(): SheetBuilder {
  const b = buildSkeletonSheet(true);
  b.smooth('tend', 2, ...Array.from({ length: 8 }, (_, i) => librarianBack(i / 2)));
  // startled: half turned, an arm still raised toward the shelf
  const f = new FormCanvas(40, 48);
  const r = figure(f, SKELETON, { hx: 20, hy: 31, lean: -8, fl: [14, 10], bl: [-12, 8], fa: [150, 10], ba: [-20, 20], headDy: -1 });
  cap(f, r.head[0], r.head[1], false);
  b.add('turn', f.resolve(CONTOUR));
  return b;
}

// ---------------------------------------------------------------- hollow knight

/**
 * A poleaxe gripped at (gx, gy), pointing at `a` degrees (0 = straight up, 90 = forward,
 * 180 = down). The blade sits on side `side` of the haft (+1 = clockwise of the point), the
 * side that leads the swing. `ext` lengthens the haft (it reaches further on the chop).
 */
function poleaxe(f: FormCanvas, gx: number, gy: number, a: number, side: number, ext = 0) {
  const d: V = [Math.sin(a * DEG), -Math.cos(a * DEG)];
  const n: V = [Math.sin((a + 90 * side) * DEG), -Math.cos((a + 90 * side) * DEG)];
  /** A point `k` px along the haft and `w` px out to the blade side. */
  const at = (k: number, w = 0): V => {
    if (k > 0) k += ext;
    return [gx + d[0] * k + n[0] * w, gy + d[1] * k + n[1] * w];
  };
  f.next();
  f.limb(...at(-12), ...at(17), 0.8, 0.8, WOOD);
  f.next();
  f.limb(...at(16), ...at(23), 1.7, 0.3, STEEL, 0.7); // the spike on the end (what it jabs with)
  f.poly([at(11.5), at(12.5, -4), at(13.5)], STEEL, 0.35); // a hooked back spike
  // the axe blade: a crescent flaring out from the haft, bright along its edge
  f.poly([at(9.5), at(8, 4.5), at(12, 7), at(16.5, 5), at(15)], STEEL, 0.25);
  f.poly([at(10.5, 1), at(9.5, 4), at(12, 6), at(15, 4.5), at(14.5, 1)], STEEL, 0.72);
  f.dot(...at(12, 6.5), STEEL, 0.99);
  f.dot(...at(8.5, -1), RED, 0.6); // the red tassel under the head
}
/** The knight's shield: red with a gold cross. `w` narrows it. */
function shield(f: FormCanvas, x: number, y: number, w = 7) {
  const x0 = Math.round(x - Math.floor(w / 2)), y0 = Math.round(y - 6);
  f.next();
  f.poly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + 12], [x0, y0 + 12]], STEEL, 0.45);
  f.poly([[x0 + 1, y0 + 1], [x0 + w - 1, y0 + 1], [x0 + w - 1, y0 + 11], [x0 + 1, y0 + 11]], RED, (px, py) => 0.7 - (px - x0) * 0.04 - (py - y0) * 0.03);
  f.stroke(x + 0.5, y - 4, x + 0.5, y + 4, GOLD, 0.6);
  f.stroke(x - 1.5, y - 1, x + 2.5, y - 1, GOLD, 0.6);
}

/** px the poleaxe is held further out along the haft while it swings round (the chop reaches further). */
const KNIGHT_REACH = 7;
/**
 * The knight's about-face, frame by frame (Knight.update plays these):
 * [turned toward the camera 0..1, poleaxe angle, blade side, frames shown].
 */
export const KNIGHT_TURN_FRAMES: [number, number, number, number][] = [
  // the slow rise: it turns toward the camera as the poleaxe climbs over its head
  [0.1, 78, -1, 12], [0.35, 58, -1, 12], [0.65, 36, -1, 12], [0.9, 14, -1, 12],
  // now facing the other way, the fast fall: it whips round and chops down in front
  [0.85, 20, 1, 3], [0.45, 70, 1, 3], [0.1, 118, 1, 3], [0, 138, 1, 15],
];

/**
 * The knight partway through its about-face: `t` turns it from profile (0) to facing the
 * camera (1), and the poleaxe points at `a` degrees with its blade on `side`. Hip at (hx, hy).
 */
function knightTurning(f: FormCanvas, hx: number, hy: number, t: number, a: number, side: number) {
  const s = KNIGHT, o = 1 - t; // o: how much profile it still shows
  const lerp = (u: number, v: number) => u + (v - u) * t;
  // legs: from a narrow step in profile to planted apart, facing out
  for (const [lx, dim] of [[hx - lerp(1, 3.5), -0.22], [hx + lerp(2, 3.5), 0]]) {
    f.bias = dim;
    f.next();
    f.limb(lx, hy, lx, hy + 8, s.leg, s.leg * 0.9, s.pants);
    f.limb(lx, hy + 8, lx, hy + 15, s.leg * 0.95, s.leg * 0.8, STEEL);
    f.ball(lx, hy + 8, s.leg + 0.4, s.leg + 0.4, STEEL);
    f.limb(lx - 0.6, hy + 15.4, lx + lerp(2.6, 1.2), hy + 15.6, 1.3, 1.1, STEEL);
  }
  f.bias = 0;
  // torso: a breastplate that widens as it comes round to face out
  const sy = hy - s.torso, sw = lerp(4.5, 6.5), ww = lerp(3.5, 4.5), c = hx + o * 1.5;
  f.next();
  f.limb(hx, hy, hx, sy + sw - 1.5, ww, sw, STEEL);
  f.groove(c, sy + 2, c, hy - 2, 0.16);
  f.stroke(hx - ww, hy - 1, hx + ww, hy - 1, RED, 0.45, 2);
  f.dot(c, hy - 1, GOLD, 0.6);
  f.bias = -0.18;
  f.ball(hx - sw + 0.5, sy + 1, 2.4, 2.3, STEEL);
  f.bias = 0;
  f.ball(hx + sw - 0.5, sy + 1, 2.4, 2.3, STEEL);
  // shield on the off arm: swings from across its front out to its side
  shield(f, hx + lerp(1, -8.5), hy - 6, Math.round(lerp(5, 7)));
  // helm: the visor slit and eyes slide round from the side to the front
  const kx = hx + o, ky = sy - 4.5;
  f.next();
  f.ball(kx, ky, 4.1, 4, STEEL);
  f.next();
  f.stroke(kx - 1 - 2 * t, ky, kx + 4 - t, ky, DARK, 0.2);
  f.dot(kx + 3 - 1.5 * t, ky, GLOW_R, 0.6);
  if (t > 0.45) f.dot(kx - 1.5, ky, GLOW_R, 0.6);
  // plume: streams back in profile, stands up as a crest from the front
  f.next();
  f.limb(kx, ky - 4, kx - 4 * o, ky - 7 - t, 1.3, 1.2, RED);
  f.limb(kx - 4 * o, ky - 7 - t, kx - 8 * o, ky - 4 - t * 4, 1.2, 0.5, RED);
  // weapon arm: held out along the haft as the poleaxe sweeps round like a clock hand
  const shx = hx + lerp(2.5, 4), shy = sy + 1;
  const gx = shx + Math.sin(a * DEG) * 9, gy = shy - Math.cos(a * DEG) * 9;
  poleaxe(f, gx, gy, a, side, KNIGHT_REACH);
  f.next();
  f.limb(shx, shy, gx, gy, s.arm, s.arm * 0.8, STEEL);
  f.ball(gx, gy, 1.5, 1.5, s.pants);
}

export function buildKnightSheet(): SheetBuilder {
  const b = new SheetBuilder(92, 80, 28, 58); // big: the poleaxe swings up over its head and the jab reaches far
  const base = (o: Partial<Pose>): Pose => ({ hx: 28, hy: 61, lean: 4, fl: [12, 8], bl: [-12, 8], fa: [60, 30], ba: [20, 60], ...o });
  /** A side-view frame: poleaxe held level in the front hand (spike `out` px further forward), shield on the back hand. */
  const draw = (q: Pose, out: number) => {
    const f = new FormCanvas(92, 80);
    const r = figure(f, KNIGHT, q);
    poleaxe(f, r.hand[0] + out, r.hand[1], 90, 1);
    shield(f, r.backHand[0] + 3, r.backHand[1] - 4);
    return f.resolve(CONTOUR);
  };
  // a heavy tread: the whole suit drops onto each step
  b.smooth('walk', 3, ...Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU, s = Math.sin(a);
    const c = Math.cos(a);
    // each knee folds as its leg swings forward and straightens to take the weight
    return draw(base({ fl: [18 * s, 6 + 30 * Math.max(0, c)], bl: [-18 * s, 6 + 30 * Math.max(0, -c)], hy: 61 + s * s * 0.9, fa: [60 + s * 2, 30] }), 0);
  }));
  b.add('ready', draw(base({ lean: -6, fa: [50, 50], fl: [25, 15], bl: [-25, 10] }), -8));
  b.add('thrust', draw(base({ lean: 14, fa: [88, 0], fl: [30, 10], bl: [-30, 10] }), 6), draw(base({ lean: 16, fa: [90, 0], fl: [32, 10], bl: [-32, 10] }), 14));
  // the about-face, which is also its wind-up and overhead chop
  b.add('turn', ...KNIGHT_TURN_FRAMES.map(([t, a, side]) => {
    const f = new FormCanvas(92, 80);
    knightTurning(f, 28, 61, t, a, side);
    return f.resolve(CONTOUR);
  }));
  return b;
}

// ---------------------------------------------------------------- the drowned

export function buildDrownedSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 48, 20, 28);
  const base = (o: Partial<Pose>): Pose => ({ hx: 19, hy: 33, lean: 12, fl: [10, 8], bl: [-10, 8], fa: [40, 30], ba: [20, 30], ...o });
  const draw = (q: Pose) => {
    const f = new FormCanvas(40, 48);
    figure(f, DROWNED, q);
    return f.resolve(CONTOUR);
  };
  // a waterlogged shamble, arms groping ahead of it
  b.smooth('walk', 2, ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * TAU, s = Math.sin(a);
    return draw(base({ hy: 33 + Math.abs(Math.cos(a)) * 0.7, lean: 12 + Math.sin(a * 2) * 1.5, fl: [18 * s, 12], bl: [-18 * s, 12], fa: [40 - 10 * s, 30], ba: [20 + 10 * s, 30] }));
  }));
  b.add('leap', draw(base({ hy: 30, lean: 20, fl: [50, 90], bl: [10, 80], fa: [150, 10], ba: [140, 10] })));
  b.add('spit', draw(base({ lean: 24, fa: [60, 30], ba: [40, 30], mouth: 1, headDy: 1 })));
  return b;
}

// ---------------------------------------------------------------- bat

const FUR = ramp('#140c18', '#2a1a30', '#3a2440', '#54385c', '#745480');
const MEMBRANE = ramp('#1e0c1a', '#3a1a30', '#5c2c4c', '#804466');

export function buildBatSheet(): SheetBuilder {
  const b = new SheetBuilder(28, 20, 14, 10);
  /** `w`: the wings' height, 1 = raised, -1 = down. */
  const draw = (w: number) => {
    const f = new FormCanvas(28, 20);
    const cx = 14, cy = 10, wy = cy - 6 * w;
    for (const s of [-1, 1]) {
      // membrane stretched between the finger bones, darker toward the trailing edge
      f.next();
      f.poly([[cx + s * 2, cy - 2], [cx + s * 13, wy], [cx + s * 10, cy + 2 - w * 2], [cx + s * 7, cy + 1], [cx + s * 4, cy + 3]], MEMBRANE, (_x, y) => 0.75 - (y - Math.min(wy, cy - 2)) * 0.07);
      f.stroke(cx + s * 2, cy - 2, cx + s * 13, wy, MEMBRANE, 0.2);
      f.stroke(cx + s * 7, cy - 1 - w * 2, cx + s * 7, cy + 1, MEMBRANE, 0.2);
    }
    f.next();
    f.ball(cx, cy, 3.1, 3.6, FUR);
    f.dot(cx - 2, cy - 4, FUR, 0.5); // ears
    f.dot(cx + 2, cy - 4, FUR, 0.7);
    f.dot(cx - 1, cy - 1, GLOW_R, 0.6);
    f.dot(cx + 1, cy - 1, GLOW_R, 0.6);
    f.dot(cx, cy + 2, BONE, 0.9); // a fang
    return f.resolve();
  };
  // one beat: a quick stroke down, a slower lift
  b.smooth('fly', 2, ...Array.from({ length: 8 }, (_, i) => draw(0.2 + 0.8 * Math.cos((i / 8) * TAU))));
  // hanging: folded upside-down
  const f = new FormCanvas(28, 20);
  f.ball(14, 9, 3.6, 5.1, MEMBRANE);
  f.next();
  f.ball(14, 9, 2.4, 4, FUR);
  f.dot(13, 12, GLOW_R, 0.6);
  f.dot(15, 12, GLOW_R, 0.6);
  f.stroke(14, 3, 14, 4, BONE, 0.5);
  b.add('hang', f.resolve());
  return b;
}

// ---------------------------------------------------------------- wisp

// Fire is not a lit surface: these are drawn at fixed brightnesses, dark at the edge, pale at the core.
const WISP = ramp('#0a2030', '#2c6c8c', '#58b8d8', '#c8f0ff');
const WISP_INK = WISP[0];

export function buildWispSheet(): SheetBuilder {
  const b = new SheetBuilder(24, 28, 12, 15);
  b.smooth('float', 2, ...Array.from({ length: 8 }, (_, i) => {
    const f = new FormCanvas(24, 28);
    const cx = 12, cy = 16, a = (i / 8) * TAU;
    const tip = Math.sin(a) * 3, lick = Math.cos(a) * 1.5; // the flame's tip sways, a tongue licks up its side
    f.poly([[cx - 7, cy], [cx + tip, cy - 13], [cx + 7, cy], [cx + 5, cy + 6], [cx - 5, cy + 6]], WISP, 0.3);
    f.poly([[cx - 6.5, cy + 1], [cx - 5 - lick, cy - 7 - lick], [cx - 2, cy]], WISP, 0.3);
    f.disc(cx, cy + 1, 6.5, WISP, 0.3);
    f.poly([[cx - 5, cy], [cx + tip * 0.7, cy - 9], [cx + 5, cy], [cx + 3, cy + 5], [cx - 3, cy + 5]], WISP, 0.6);
    f.next();
    f.poly([[cx - 4.5, cy + 1], [cx, cy - 4 + lick * 0.4], [cx + 4.5, cy + 1], [cx, cy + 5.5]], WISP, 0.6);
    f.poly([[cx - 3, cy + 2], [cx, cy - 1], [cx + 3, cy + 2], [cx, cy + 5]], WISP, 0.95);
    // a little face in the fire
    f.dot(cx - 2, cy + 1, WISP, 0);
    f.dot(cx + 2, cy + 1, WISP, 0);
    f.stroke(cx - 1, cy + 4, cx + 1, cy + 4, WISP, 0);
    return f.resolve({ ink: WISP_INK });
  }));
  // the flames it drips, in its own colors (so palette-swapped variants match): a falling
  // drop, then a small fire burning on the floor (its base on the frame's bottom row)
  const drop = new FormCanvas(24, 28);
  drop.poly([[12, 11], [14.5, 15], [12, 17.5], [9.5, 15]], WISP, 0.6);
  drop.dot(12, 15, WISP, 0.95);
  b.add('drip', drop.resolve({ ink: WISP_INK }));
  b.smooth('flame', 2, ...Array.from({ length: 8 }, (_, i) => {
    const f = new FormCanvas(24, 28);
    const a = (i / 8) * TAU, s = Math.sin(a) * 1.5, h = 17 + Math.sin(a * 2 + 1) * 2;
    f.poly([[5, 28], [7 + s, 27 - h * 0.6], [12 + s, 27 - h], [16 + s * 0.5, 27 - h * 0.55], [19, 28]], WISP, 0.3);
    f.poly([[7, 28], [9 + s, 27 - h * 0.5], [12 + s, 27 - h * 0.8], [15, 27 - h * 0.4], [17, 28]], WISP, 0.6);
    f.poly([[9, 28], [12 + s * 0.5, 27 - h * 0.45], [15, 28]], WISP, 0.95);
    return f.resolve({ outline: false });
  }));
  return b;
}
