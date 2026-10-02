// Procedural art for the expansion bosses (preview them all on /bosses.html):
//   Gnarlfang, first form ("flayed"): skinned red muscle, bulging purple veins, bone spurs, chains.
//   Gnarlfang, second form ("cinder"): what rises after you "kill" it. Black bloated hide,
//     veins of fire, horns, an open ribcage, and a second head that is only a burning skull.
//   The Bell-Mother: a gaunt ash-grey harpy crone with a hooked beak and tattered bone wings.
// Everything faces right; sprites are mirrored in game.
import { PixelCanvas, SheetBuilder, RGBA, hex, shade, mix } from './pixel';

// ---------------------------------------------------------------- helpers

/** Small seeded random generator, so veins land in the same place every frame. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const same = (a: RGBA, b: RGBA) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] > 0;
const alpha = (c: RGBA, a: number): RGBA => [c[0], c[1], c[2], a];

/** A stroke that tapers from radius r0 to r1 (a limb, a neck, a horn). */
function taper(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: RGBA) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = r0 + (r1 - r0) * t, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (r < 0.8) p.set(x, y, c);
    else p.circle(x, y, r, c);
  }
}

/** Two-bone IK: where the middle joint sits for a limb reaching from (rx,ry) to (fx,fy). bend +1 = joint points back. */
function ik(rx: number, ry: number, fx: number, fy: number, l1: number, l2: number, bend: number) {
  const dx = fx - rx, dy = fy - ry;
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx);
  const off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const k = a + off * bend;
  const kx = rx + Math.cos(k) * l1, ky = ry + Math.sin(k) * l1;
  // where the foot really ends up if the target was out of reach
  const e = Math.atan2(fy - ky, fx - kx);
  return { kx, ky, fx: kx + Math.cos(e) * l2, fy: ky + Math.sin(e) * l2 };
}

/**
 * Wandering veins. Walks from (x,y), only over pixels for which `skin` is true, and stops at
 * anything else (eyes, bone, other veins). `hi` is the lit top edge of a bulging vein; `glow`
 * spills a soft halo onto the skin around it (for burning veins).
 */
function veins(p: PixelCanvas, rnd: () => number, x: number, y: number, len: number, ang: number, skin: (c: RGBA) => boolean, vein: RGBA, hi: RGBA, glow?: RGBA, depth = 0) {
  for (let i = 0; i < len; i++) {
    ang += (rnd() - 0.5) * 1.1;
    x += Math.cos(ang);
    y += Math.sin(ang);
    const rx = Math.round(x), ry = Math.round(y);
    if (!skin(p.get(rx, ry))) return;
    p.set(rx, ry, vein);
    // near the root a vein is two pixels thick, so it bulges
    if (depth === 0 && i < len * 0.6 && skin(p.get(rx, ry + 1))) p.set(rx, ry + 1, vein);
    if (skin(p.get(rx, ry - 1))) p.set(rx, ry - 1, hi);
    if (glow) for (const [gx, gy] of [[1, 0], [-1, 0], [0, 1]]) if (skin(p.get(rx + gx, ry + gy))) p.set(rx + gx, ry + gy, glow);
    if (depth < 2 && rnd() < 0.14) veins(p, rnd, x, y, len * 0.45, ang + (rnd() < 0.5 ? 1 : -1) * 0.9, skin, vein, hi, glow, depth + 1);
  }
}

// ---------------------------------------------------------------- the two-headed hound

interface HoundPal {
  hide: RGBA; hideD: RGBA; hideL: RGBA; hideH: RGBA; // body: base, shadow, light, specular
  ridge: RGBA; ridgeL: RGBA; // matted fur / scale along the spine
  bone: RGBA; boneD: RGBA;
  vein: RGBA; veinH: RGBA; veinGlow?: RGBA;
  eye: RGBA; mouth: RGBA; gum: RGBA; tooth: RGBA;
  iron: RGBA; ironL: RGBA; drool: RGBA;
}
const dimPal = (P: HoundPal, f: number): HoundPal => {
  const o: any = {};
  for (const [k, v] of Object.entries(P)) o[k] = k === 'eye' || k === 'veinGlow' || k === 'drool' ? v : shade(v as RGBA, f);
  return o;
};

interface HeadOpts { blind?: boolean; horns?: boolean; skull?: boolean; collar?: boolean; ears?: boolean }

/** A huge snarling dog head facing right. (hx,hy) is the skull center, r its size, jaw 0..1.2 how wide it gapes. */
function houndHead(p: PixelCanvas, P: HoundPal, hx: number, hy: number, r: number, jaw: number, o: HeadOpts = {}) {
  const Hx = hx - r * 0.1, Hy = hy + r * 0.35; // jaw hinge
  const rot = (x: number, y: number, a: number): [number, number] => {
    const dx = x - Hx, dy = y - Hy, c = Math.cos(a), s = Math.sin(a);
    return [Hx + dx * c - dy * s, Hy + dx * s + dy * c];
  };
  const au = -jaw * 0.22, al = jaw * 0.55;
  const U = (x: number, y: number) => rot(hx + x * r, hy + y * r, au);
  const Lw = (x: number, y: number) => rot(hx + x * r, hy + y * r, al);
  const skin = o.skull ? P.bone : P.hide, skinD = o.skull ? P.boneD : P.hideD;

  // horns sweep back over the skull
  if (o.horns) {
    const pts: [number, number][] = [[-0.2, -0.6], [-0.9, -1.2], [-1.7, -1.4], [-2.3, -1.0], [-2.5, -0.4]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      taper(p, hx + ax * r, hy + ay * r, hx + bx * r, hy + by * r, r * (0.32 - i * 0.07), r * (0.25 - i * 0.06), i % 2 ? P.boneD : P.bone);
    }
  }
  // lower jaw, then the open mouth, then skull and muzzle over them
  p.poly([Lw(-0.3, 0.2), Lw(1.9, 0.35), Lw(1.85, 0.8), Lw(0.7, 1.05), Lw(-0.2, 0.85)], skinD);
  p.poly([Lw(0, 0.35), Lw(1.8, 0.45), Lw(1.75, 0.7), Lw(0.4, 0.8)], skin);
  if (jaw > 0.15) {
    p.poly([[Hx, Hy], U(2.05, 0.38), Lw(1.85, 0.4), Lw(0.3, 0.45)], P.mouth);
    p.poly([[Hx, Hy], U(0.9, 0.42), Lw(0.9, 0.45)], P.gum);
  }
  if (!o.skull && o.ears !== false) p.poly([[hx - 0.3 * r, hy - 0.4 * r], [hx - 1.5 * r, hy - 1.25 * r], [hx - 1.0 * r, hy - 0.95 * r], [hx - 0.9 * r, hy - 1.15 * r], [hx, hy - 0.8 * r]], P.hideD);
  p.ellipse(hx, hy, r * 1.05, r * 0.88, skinD);
  p.ellipse(hx + 0.6, hy - 0.8, r * 0.9, r * 0.7, skin);
  p.poly([U(0.2, -0.78), U(1.5, -0.5), U(2.15, -0.1), U(2.15, 0.4), U(0, 0.45)], skinD);
  p.poly([U(0.3, -0.68), U(1.5, -0.42), U(2.0, -0.1), U(1.95, 0.2), U(0.4, 0.25)], skin);
  // snarl wrinkles bunching up the muzzle, and the light along its ridge
  if (!o.skull) for (let k = 0; k < 3; k++) {
    const [ax, ay] = U(0.75 + k * 0.32, -0.55 + k * 0.1), [bx, by] = U(0.9 + k * 0.32, -0.05);
    p.line(ax, ay, bx, by, P.hideD);
  }
  { const [ax, ay] = U(0.3, -0.7), [bx, by] = U(1.6, -0.45); p.line(ax, ay, bx, by, o.skull ? mix(P.bone, P.hideH, 0.3) : P.hideL); }
  // nose
  { const [nx, ny] = U(2.05, -0.12); p.rect(nx - 1, ny, 2, 2, hex('#0a0406')); }
  // teeth: a row along both jaws and two long fangs on each
  for (let t = 0.55; t < 2.0; t += 2.2 / r) {
    const [ux, uy] = U(t, 0.36), [lx, ly] = Lw(t - 0.05, 0.42);
    p.set(ux, uy + 1, P.tooth);
    if (jaw > 0.15) p.set(lx, ly - 1, P.tooth);
  }
  for (const f of [1.75, 1.15]) {
    const [ux, uy] = U(f, 0.32);
    p.line(ux, uy, ux + 0.5, uy + r * 0.38 + (jaw < 0.15 ? 1 : 0), P.tooth);
    p.set(ux - 1, uy + 1, mix(P.tooth, P.gum, 0.4));
    if (jaw > 0.15) {
      const [lx, ly] = Lw(f - 0.15, 0.42);
      p.line(lx, ly, lx - 0.5, ly - r * 0.3, P.tooth);
    }
  }
  // heavy brow over a sunken, glowing eye
  const [ex, ey] = U(0.55, -0.32);
  p.line(ex - r * 0.6, ey - 2, ex + r * 0.35, ey - 1.5, skinD, 2.4);
  p.line(ex - r * 0.6, ey - 3, ex + r * 0.3, ey - 2.5, o.skull ? P.bone : P.hideL);
  if (o.blind) {
    p.line(ex - 2, ey - 2, ex + 2, ey + 2, P.gum);
    p.line(ex - 2, ey + 2, ex + 2, ey - 2, shade(P.gum, 0.7));
  } else {
    if (o.skull) p.ellipse(ex, ey, 2, 1.6, hex('#080204'));
    p.circle(ex, ey, 2.4, alpha(P.eye, 70));
    p.set(ex, ey, P.eye);
    p.set(ex + 1, ey, mix(P.eye, hex('#ffffff'), 0.5));
    p.set(ex - 1, ey, shade(P.eye, 0.6));
  }
  // drool strings from the lower jaw
  if (jaw > 0.3 && !o.skull) for (const [t, n] of [[1.5, 5 + jaw * 3], [0.9, 3 + jaw * 2]]) {
    const [dx, dy] = Lw(t, 0.95);
    p.line(dx, dy, dx - 0.5, dy + n, P.drool);
  }
  if (o.collar) {
    const cx = hx - r * 0.9, cy = hy + r * 0.3;
    p.line(cx, cy - r * 0.9, cx - 1, cy + r * 0.8, P.iron, 3);
    p.line(cx + 1, cy - r * 0.9, cx, cy + r * 0.8, P.ironL);
    for (let k = -1; k <= 1; k++) p.set(cx + 2, cy + k * r * 0.5, P.ironL); // spikes
  }
}

interface HoundPose {
  x: number; y: number; // body offset from standing
  feet: [number, number][]; // [dx, lift] for back far, back near, front far, front near
  head: [number, number, number]; // front head: offset from shoulder, jaw
  head2: [number, number, number]; // back head
  tail: number;
  breathe?: number; // swells the chest
}

interface HoundStyle {
  pal: HoundPal;
  seed: number;
  skin: (c: RGBA) => boolean;
  /** extra body dressing drawn after the hide but before the near legs and the front head */
  dress: (p: PixelCanvas, S: [number, number], H: [number, number], q: HoundPose) => void;
  head1: HeadOpts;
  head2: HeadOpts;
  spurs: 'bone' | 'spikes';
  tail: 'whip' | 'bone';
}

const HF = 90; // floor line inside the frame (anchor y + 28, matching Hound.update's place())
const HOUND_SCALE = 0.9; // the hound is drawn full size, then shrunk by this much

/** A massive, hunched two-headed hound. Shoulders tower over narrow hips like a bull. */
function brute(p: PixelCanvas, st: HoundStyle, q: HoundPose) {
  const P = st.pal, Pd = dimPal(P, 0.62);
  const S: [number, number] = [74 + q.x, HF - 42 + q.y]; // shoulder hump
  const H: [number, number] = [42 + q.x, HF - 34 + q.y * 0.8]; // hips
  const sw = q.breathe ?? 0;

  const leg = (front: boolean, near: boolean, foot: [number, number]) => {
    const pal = near ? P : Pd;
    const rx = front ? S[0] + (near ? 6 : 0) : H[0] + (near ? 0 : -5);
    const ry = front ? S[1] + 10 : H[1] + 6;
    const l1 = front ? 17 : 15, l2 = front ? 17 : 16;
    const j = ik(rx, ry, rx + (front ? 2 : -2) + foot[0], HF - 3 - foot[1], l1, l2, front ? 1 : -1);
    if (front) {
      taper(p, rx, ry, j.kx, j.ky, 7, 5, pal.hideD); // upper arm, all muscle
      taper(p, j.kx, j.ky, j.fx, j.fy, 5, 3.2, pal.hideD);
      taper(p, rx + 1, ry - 1, j.kx + 0.6, j.ky - 0.5, 5.6, 3.8, pal.hide);
      taper(p, j.kx + 0.6, j.ky, j.fx + 0.5, j.fy - 0.5, 3.8, 2.2, pal.hide);
      p.ellipse((rx + j.kx) / 2 + 1.5, (ry + j.ky) / 2 - 1, 3, 5, pal.hideL); // bulging bicep
      p.ellipse((j.kx + j.fx) / 2 + 1, (j.ky + j.fy) / 2 - 2, 1.4, 3.2, pal.hideL);
    } else {
      // haunch, then a long hock
      p.ellipse(rx + 1, ry - 2, 9, 11, pal.hideD);
      p.ellipse(rx + 2, ry - 3, 7.5, 9.5, pal.hide);
      p.ellipse(rx + 3, ry - 6, 4, 4, pal.hideL);
      taper(p, rx, ry + 2, j.kx, j.ky, 5.5, 3, pal.hideD);
      taper(p, j.kx, j.ky, j.fx, j.fy, 3, 2.2, pal.hideD);
      taper(p, rx + 0.6, ry + 1, j.kx + 0.5, j.ky - 0.5, 4, 2, pal.hide);
      p.line(j.kx, j.ky - 1, j.fx + 0.5, j.fy - 1, pal.hide);
    }
    // a broad paw with hooked claws
    p.ellipse(j.fx + 1.5, j.fy + 1, front ? 4.5 : 3.5, 2.2, pal.hideD);
    p.ellipse(j.fx + 2, j.fy, front ? 3 : 2.2, 1.4, pal.hide);
    for (let c = 0; c < 3; c++) {
      const cx = j.fx + 2 + c * 1.6;
      p.line(cx, j.fy + 1, cx + 1.5, j.fy + 3, pal.bone);
    }
  };

  const neck = (pal: HoundPal, hx: number, hy: number, back: boolean) => {
    const nx = S[0] + (back ? 0 : 10), ny = S[1] + (back ? -12 : -2);
    taper(p, nx, ny, hx - 3, hy + 1, back ? 9 : 11, back ? 6 : 7.5, pal.hideD);
    taper(p, nx + 1, ny - 1, hx - 2, hy, back ? 7.5 : 9.5, back ? 5 : 6.5, pal.hide);
    taper(p, nx + 2, ny - (back ? 5 : 7), hx - 2, hy - 4, 2.2, 1.6, pal.hideL); // the lit top of the neck
  };

  // ── far side and the back head
  leg(false, false, q.feet[0]);
  leg(true, false, q.feet[2]);
  const h2x = S[0] + q.head2[0], h2y = S[1] + q.head2[1];
  neck(Pd, h2x, h2y, true);
  houndHead(p, Pd, h2x, h2y, 9, q.head2[2], st.head2);

  // ── tail
  const tx = H[0] - 13, ty = H[1] - 6;
  if (st.tail === 'whip') {
    taper(p, tx, ty, tx - 8, ty - 4 - q.tail, 3, 1.6, P.hideD);
    taper(p, tx - 8, ty - 4 - q.tail, tx - 15, ty + 1 - q.tail * 1.5, 1.6, 0.5, P.hideD);
    for (let k = 0; k < 3; k++) p.set(tx - 4 - k * 4, ty - 6 - q.tail * (0.6 + k * 0.3), P.bone);
  } else {
    for (let k = 0; k < 6; k++) {
      const x = tx - k * 3, y = ty - 2 - q.tail * (k / 4) + k * 0.6;
      p.circle(x, y, 2.2 - k * 0.25, k % 2 ? P.boneD : P.bone);
    }
    p.poly([[tx - 17, ty - q.tail * 1.5 + 1], [tx - 23, ty - q.tail * 1.5 - 2], [tx - 18, ty - q.tail * 1.5 + 4]], P.bone); // barb
  }

  // ── the body: small hips, a long sloping back, an enormous hump of shoulder and chest
  const sil: RGBA = P.hideD;
  p.ellipse(H[0], H[1], 15, 13, sil);
  p.poly([[H[0] - 4, H[1] - 13], [S[0] - 8, S[1] - 19], [S[0] + 10, S[1] + 15], [H[0] + 6, H[1] + 11]], sil);
  p.ellipse(S[0], S[1], 21 + sw * 0.5, 19 + sw, sil);
  p.ellipse(S[0] + 11, S[1] + 6, 11 + sw, 12 + sw, sil);
  // base tone
  p.ellipse(H[0] + 1, H[1] - 1.5, 13.5, 11, P.hide);
  p.poly([[H[0] - 2, H[1] - 11.5], [S[0] - 7, S[1] - 17], [S[0] + 8, S[1] + 11], [H[0] + 6, H[1] + 8]], P.hide);
  p.ellipse(S[0] + 1, S[1] - 1.5, 19.5 + sw * 0.5, 17 + sw, P.hide);
  p.ellipse(S[0] + 12, S[1] + 4.5, 9.5 + sw, 10.5 + sw, P.hide);
  // light on the top of the hump, the chest and the haunch
  p.ellipse(S[0] + 2, S[1] - 9, 12, 7, P.hideL);
  p.ellipse(S[0] + 14, S[1] + 2, 5.5, 6, P.hideL);
  p.ellipse(H[0] + 2, H[1] - 7, 8, 4, P.hideL);
  p.ellipse(S[0] + 4, S[1] - 12, 5, 2.5, P.hideH);
  p.ellipse(S[0] + 15, S[1], 2, 2.5, P.hideH);
  // the muscle splits: shoulder blade, the pectoral seam, a gaunt belly line
  p.line(S[0] - 10, S[1] - 6, S[0] + 2, S[1] + 6, P.hideD);
  p.line(S[0] + 2, S[1] + 6, S[0] + 4, S[1] + 15, P.hideD);
  p.line(S[0] + 6, S[1] - 4, S[0] + 9, S[1] + 9, P.hideD);
  p.line(H[0] + 8, H[1] + 6, S[0] - 6, S[1] + 13, P.hideD);
  for (let k = 0; k < 3; k++) p.line(S[0] - 14 - k * 4, S[1] + 2 + k, S[0] - 12 - k * 4, S[1] + 10, P.hideD); // ribs under the hide

  st.dress(p, S, H, q);

  // ── bulging veins over the hide (same seed each frame so they ride along with the body)
  const rnd = rng(st.seed);
  const starts: [number, number, number, number][] = [
    [S[0] - 4, S[1] - 4, 16, 0.6], [S[0] + 8, S[1] - 6, 14, 1.4], [S[0] - 12, S[1] + 2, 14, 0.2], [S[0] + 12, S[1] + 8, 10, 1.8],
    [S[0] - 2, S[1] + 10, 12, -0.4], [H[0] + 2, H[1] - 4, 14, 0.8], [H[0] - 6, H[1] + 2, 10, 1.6], [S[0] + 4, S[1] - 14, 10, 0.3],
    [S[0] - 16, S[1] - 8, 14, 0.9], [S[0] + 16, S[1] - 4, 10, 2.2], [H[0] + 10, H[1] - 8, 12, -0.6], [S[0] - 6, S[1] + 4, 10, 2.6],
  ];
  for (const [x, y, n, a] of starts) veins(p, rnd, x, y, n, a, st.skin, P.vein, P.veinH, P.veinGlow);

  // ── near legs (over the body)
  leg(false, true, q.feet[1]);
  leg(true, true, q.feet[3]);
  const legRnd = rng(st.seed + 7);
  veins(p, legRnd, S[0] + 7, S[1] + 14, 12, 1.5, st.skin, P.vein, P.veinH, P.veinGlow);
  veins(p, legRnd, H[0] + 2, H[1] + 2, 10, 1.4, st.skin, P.vein, P.veinH, P.veinGlow);

  // ── spine: spurs climbing from the hips to a crest over the hump
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const x = H[0] - 6 + (S[0] + 8 - (H[0] - 6)) * t;
    const y = H[1] - 12 + (S[1] - 19 - (H[1] - 12)) * Math.min(1, t * 1.3) + Math.max(0, t - 0.77) * 18;
    const h = 4 + Math.sin(t * Math.PI) * 7 + (k % 2) * 2;
    if (st.spurs === 'bone') {
      p.poly([[x - 2.2, y + 2], [x - 1.5 - h * 0.35, y - h], [x + 2, y + 2]], P.boneD);
      p.line(x - 1, y, x - 1.2 - h * 0.3, y - h + 1, P.bone);
      // matted fur between the spurs
      p.line(x + 1, y + 1, x - 3, y - 3, P.ridge, 1.6);
    } else {
      p.line(x, y + 2, x - h * 0.4, y - h, P.iron, 2);
      p.line(x + 0.5, y + 1, x - h * 0.4 + 0.5, y - h + 1, P.ironL);
      p.set(x - 1, y + 2, P.veinGlow ?? P.vein); // the wound glows where the spike goes in
    }
  }

  // ── the front head, the bigger of the two
  const h1x = S[0] + q.head[0], h1y = S[1] + q.head[1];
  neck(P, h1x, h1y, false);
  veins(p, rng(st.seed + 3), S[0] + 14, S[1] - 6, 12, -0.4, st.skin, P.vein, P.veinH, P.veinGlow);
  houndHead(p, P, h1x, h1y, 10, q.head[2], st.head1);
}

const FLAYED: HoundPal = {
  hide: hex('#7a2a2e'), hideD: hex('#3e1018'), hideL: hex('#a64444'), hideH: hex('#d4766a'),
  ridge: hex('#1e1214'), ridgeL: hex('#3a2a2a'),
  bone: hex('#dcd0b4'), boneD: hex('#8a7a62'),
  vein: hex('#2a0828'), veinH: hex('#b8506a'),
  eye: hex('#ffe040'), mouth: hex('#160206'), gum: hex('#8a1a2c'), tooth: hex('#f0e8cc'),
  iron: hex('#34343e'), ironL: hex('#70707e'), drool: hex('#d8e0c8', 170),
};
const CINDER: HoundPal = {
  hide: hex('#2c2426'), hideD: hex('#120c0e'), hideL: hex('#463a3a'), hideH: hex('#6e5a54'),
  ridge: hex('#0c0808'), ridgeL: hex('#2a1e1e'),
  bone: hex('#e0d4b8'), boneD: hex('#8a7c64'),
  vein: hex('#ff6a10'), veinH: hex('#ffd860'), veinGlow: hex('#c83a10', 110),
  eye: hex('#ff3018'), mouth: hex('#2a0604'), gum: hex('#ff5a10'), tooth: hex('#e8dcc0'),
  iron: hex('#2a2a32'), ironL: hex('#5a5a68'), drool: hex('#ff8a30', 150),
};

const FLAYED_STYLE: HoundStyle = {
  pal: FLAYED,
  seed: 11,
  skin: (c) => same(c, FLAYED.hide) || same(c, FLAYED.hideL),
  head1: { collar: true },
  head2: { blind: true },
  spurs: 'bone',
  tail: 'whip',
  dress(p, S, H) {
    const P = FLAYED;
    // muscle fibres striping the shoulder
    for (let k = 0; k < 5; k++) p.line(S[0] - 8 + k * 3, S[1] - 13 + k, S[0] - 6 + k * 3.5, S[1] - 3 + k, mix(P.hide, P.hideD, 0.5));
    // patches of mangy hide still clinging to the hips and back
    p.ellipse(H[0] - 3, H[1] - 5, 8, 6, P.ridge);
    p.ellipse(H[0] - 2, H[1] - 6, 6, 4, P.ridgeL);
    for (let k = 0; k < 6; k++) p.line(H[0] - 9 + k * 2.6, H[1] + 1, H[0] - 10 + k * 2.6, H[1] + 4 + (k % 2) * 2, P.ridge);
    // a broken chain from the collar trails down the chest
    for (let k = 0; k < 4; k++) {
      const x = S[0] + 17 - k, y = S[1] + 6 + k * 3;
      p.ellipse(x, y, k % 2 ? 1 : 1.6, k % 2 ? 1.6 : 1, P.iron);
      p.set(x, y - 1, P.ironL);
    }
    // stitched scar across the haunch
    p.line(H[0] + 4, H[1] - 10, H[0] + 12, H[1] + 2, P.hideD);
    for (let k = 0; k < 4; k++) p.line(H[0] + 4 + k * 2 - 1, H[1] - 9 + k * 3, H[0] + 4 + k * 2 + 1, H[1] - 9 + k * 3 - 1, P.boneD);
  },
};

const CINDER_STYLE: HoundStyle = {
  pal: CINDER,
  seed: 23,
  skin: (c) => same(c, CINDER.hide) || same(c, CINDER.hideL) || same(c, CINDER.hideD),
  head1: { horns: true },
  head2: { skull: true, horns: true },
  spurs: 'spikes',
  tail: 'bone',
  dress(p, S, H) {
    const P = CINDER;
    // the flank is torn open: a ribcage over embers
    const rx = (S[0] + H[0]) / 2 + 2, ry = S[1] + 5;
    p.ellipse(rx, ry, 9, 6, hex('#1a0404'));
    p.ellipse(rx, ry + 1, 6, 3.5, hex('#7a1a08'));
    p.ellipse(rx, ry + 1.5, 3, 1.5, hex('#ff7a20'));
    for (let k = 0; k < 4; k++) {
      const x = rx - 7 + k * 4.4;
      p.line(x, ry - 6 + Math.abs(k - 1.5), x + 2, ry + 5 - Math.abs(k - 1.5), P.bone, 1.5);
      p.set(x + 1, ry - 1, P.boneD);
    }
    // cracked hide over the shoulder, lit from inside
    p.line(S[0] - 6, S[1] - 14, S[0] - 2, S[1] - 6, hex('#ff8a20'));
    p.line(S[0] - 2, S[1] - 6, S[0] - 5, S[1] + 1, hex('#c83a10'));
    // a shackle on the near foreleg's root
    p.line(S[0] + 2, S[1] + 15, S[0] + 12, S[1] + 15, P.iron, 2.5);
    p.line(S[0] + 2, S[1] + 14, S[0] + 12, S[1] + 14, P.ironL);
  },
};

function houndSheet(st: HoundStyle): SheetBuilder {
  // bigger than the old 104x72 frame; the anchor keeps the floor at anchor y + 28 like before
  const b = new SheetBuilder(136, 96, 68, HF - 28);
  const pose = (o: Partial<HoundPose>): HoundPose => ({
    x: 0, y: 0, feet: [[0, 0], [0, 0], [0, 0], [0, 0]], head: [31, 0, 0.3], head2: [16, -28, 0.2], tail: 3, ...o,
  });
  const draw = (q: HoundPose, dizzy = false) => {
    const big = b.canvas();
    brute(big, st, q);
    if (dizzy) for (let k = 0; k < 3; k++) big.set(74 + q.head[0] - 4 + k * 4, HF - 42 + q.y + q.head[1] - 14 - (k % 2) * 2, hex('#ffe060'));
    // shrink toward the point between its feet, so it stays standing on the floor line
    const p = b.canvas();
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) p.set(x, y, big.get(Math.round(68 + (x - 68) / HOUND_SCALE), Math.round(HF + (y - HF) / HOUND_SCALE)));
    p.outline(hex('#060204'));
    return p;
  };
  b.add('walk', ...[0, 1, 2, 3].map((i) => {
    const t = (i / 4) * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
    const f = (ph: number): [number, number] => [7 * Math.sin(t + ph), Math.max(0, Math.cos(t + ph)) * 4];
    return draw(pose({ y: i % 2, feet: [f(Math.PI), f(0), f(0), f(Math.PI)], head: [31, i % 2, 0.3 + 0.1 * s], head2: [16, -28 - (i % 2), 0.4 - 0.2 * c], tail: 3 + s * 2, breathe: 0.5 + 0.5 * c }));
  }));
  b.add('crouch', draw(pose({ y: 7, x: -2, feet: [[-6, 0], [-4, 0], [8, 0], [10, 0]], head: [33, 9, 0.8], head2: [18, -18, 0.9], tail: -2 })));
  b.add('charge', ...[0, 1].map((i) => draw(pose({ x: 2, y: 2, feet: i ? [[-14, 3], [-10, 0], [14, 0], [16, 5]] : [[8, 0], [10, 4], [-6, 3], [-4, 0]], head: [34, 5, 1], head2: [20, -22, 1.1], tail: 5 }))));
  b.add('leap', draw(pose({ y: -4, feet: [[-16, 8], [-12, 6], [16, 10], [18, 12]], head: [33, -3, 1.1], head2: [18, -30, 0.9], tail: 7 })));
  b.add('howl', draw(pose({ y: 1, feet: [[-2, 0], [2, 0], [2, 0], [6, 0]], head: [26, -18, 1.1], head2: [8, -34, 1.2], tail: 8, breathe: 1.5 })));
  b.add('bite', draw(pose({ x: 3, y: 2, feet: [[-8, 0], [-4, 0], [10, 0], [13, 0]], head: [36, 5, 1.2], head2: [16, -26, 0.3] })));
  b.add('stun', draw(pose({ y: 8, feet: [[-8, 0], [-12, 0], [10, 0], [6, 0]], head: [28, 12, 0.5], head2: [12, -12, 0.4], tail: -4 }), true));
  // collapsed on its side, legs splayed, both heads on the floor: it looks dead
  b.add('down', draw(pose({ y: 14, x: -2, feet: [[-14, 0], [-18, 0], [16, 0], [20, 0]], head: [30, 17, 0.6], head2: [6, 14, 0.4], tail: -6 })));
  return b;
}

export const buildHoundSheet = () => houndSheet(FLAYED_STYLE);
export const buildCinderHoundSheet = () => houndSheet(CINDER_STYLE);

// ---------------------------------------------------------------- boss: the Bell-Mother

/** The Bell-Mother's colors: ash-grey corpse skin, black hair and feathers, bone, rust. */
const BM = {
  skin: hex('#a6a2aa'), skinD: hex('#666072'), skinL: hex('#d2ced4'), skinS: hex('#3a3242'),
  nipple: hex('#4a2236'), areola: hex('#7a5866'), vein: hex('#7a7092'),
  hair: hex('#1c1820'), hairD: hex('#0a080c'),
  wing: hex('#1e1a20'), wingD: hex('#0c0a0e'), wingL: hex('#3a3440'), wingU: hex('#2e2630'),
  scale: hex('#3a3632'), talon: hex('#b0a080'), bone: hex('#d8ccb4'),
  beak: hex('#2e262c'), beakL: hex('#6e6068'), mouth: hex('#140408'), tooth: hex('#e8e0d0'),
  eye: hex('#ff2020'), rust: hex('#6a4a34'), rustD: hex('#3a2a22'),
};

type MPose = 'fly' | 'dive' | 'cast';

/**
 * The harpy queen, a gaunt corpse-grey crone: bare to the hips, where ragged black plumage
 * takes over and runs down to scaled bird legs. Her face draws out into a hooked beak lined
 * with needle teeth; her wings are tattered feathers on bare bone. Facing right.
 * `flap` -1 (wings down) .. 1 (up).
 */
function bellMother(p: PixelCanvas, flap: number, pose: MPose) {
  const P = BM;
  // diving shears the body so the legs trail back behind her
  const lean = pose === 'dive' ? -0.5 : 0;
  const X = (x: number, y: number) => x + lean * (y - 34);
  const Q = (pts: [number, number][]) => pts.map(([x, y]) => [X(x, y), y] as [number, number]);
  const L = (x0: number, y0: number, x1: number, y1: number, c: RGBA, w = 1) => p.line(X(x0, y0), y0, X(x1, y1), y1, c, w);
  const T = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: RGBA) => taper(p, X(x0, y0), y0, X(x1, y1), y1, r0, r1, c);
  const E = (x: number, y: number, rx: number, ry: number, c: RGBA) => p.ellipse(X(x, y), y, rx, ry, c);
  const D = (x: number, y: number, c: RGBA) => p.set(X(x, y), y, c);

  // ── wings, both behind her; the far one darker and higher
  const wing = (dim: number, dx: number, dy: number) => {
    const sx = X(56, 31) + dx, sy = 31 + dy;
    const up = pose === 'cast' ? 1.25 : flap;
    const [tipX, tipY, midX, midY] = pose === 'dive'
      ? [2 + dx, 10 + dy, 28 + dx, 18 + dy]
      : [6 + dx + Math.abs(up) * 3, 34 - up * 30 + dy, 30 + dx, 32 - up * 15 + dy];
    const c = shade(P.wing, dim), cd = shade(P.wingD, dim), cu = shade(P.wingU, dim), bone = shade(P.bone, dim * 0.9);
    p.poly([[sx, sy - 2], [midX, midY - 4], [tipX, tipY], [tipX + 8, tipY + 10], [midX + 6, sy + 12], [sx + 2, sy + 9]], c);
    // flight feathers hanging from the arm of the wing, uneven, with gaps where they've rotted out
    for (let f = 0; f < 10; f++) {
      if (f % 4 === 2) continue;
      const t = f / 10;
      const ex = tipX + (midX - tipX) * Math.min(1, t * 2) + (sx - midX) * Math.max(0, t * 2 - 1);
      const ey = tipY + (midY - tipY) * Math.min(1, t * 2) + (sy - midY) * Math.max(0, t * 2 - 1);
      const len = 15 - f * 1.4 + ((f * 7) % 3) * 3;
      const fx = ex + (pose === 'dive' ? -6 : -1), fy = ey + 3 + len;
      p.line(ex + 2, ey + 3, fx, fy, f % 2 ? cd : cu, 2);
      p.line(fx, fy, fx - 1, fy + 2, cd); // ragged tips
    }
    // bare bone along the leading edge, a knuckle at the wrist, clawed fingers
    p.line(sx, sy - 2, midX, midY - 4, bone, 2);
    p.line(midX, midY - 4, tipX, tipY, bone, 1.4);
    p.circle(midX, midY - 4, 1.8, shade(P.bone, dim));
    for (let k = 0; k < 3; k++) p.line(midX, midY - 4, midX - 2 + k * 2, midY - 9 + Math.abs(k - 1), shade(P.bone, dim));
  };
  wing(0.55, -6, -3);
  wing(1, 0, 0);

  // ── lank black hair down her back
  p.poly(Q([[55, 12], [62, 11], [60, 26], [57, 40], [52, 50], [49, 44], [51, 28]]), P.hairD);
  p.poly(Q([[56, 12], [62, 12], [59, 24], [56, 36], [53, 42], [53, 28]]), P.hair);
  for (let k = 0; k < 4; k++) L(53 + k, 30 + k * 3, 51 + k, 46 + k * 2, P.hairD);

  // ── legs: plumed thighs, scaled shins, hooked talons
  for (const [hx, kx, ax, dim] of [[57, 55, 56, 0.65], [62, 63, 64, 1]] as [number, number, number, number][]) {
    const fd = shade(P.wing, dim), sc = shade(P.scale, dim), tl = shade(P.talon, dim);
    const tuck = pose === 'dive' ? -4 : 0;
    T(hx, 50, kx + tuck, 62, 4, 3, fd);
    T(kx + tuck, 62, ax + tuck * 1.5, 72, 1.6, 1.2, sc);
    for (let k = 0; k < 3; k++) D(kx + tuck + (ax - kx) * (k / 3) + 1, 64 + k * 3, shade(P.scale, dim * 1.4)); // scale glints
    const fx = ax + tuck * 1.5;
    L(fx, 72, fx + 5, 74, tl);
    L(fx + 5, 74, fx + 6, 77, tl);
    L(fx, 72, fx + 1, 77, tl);
    L(fx, 72, fx - 3, 75, tl);
  }

  // ── torso: a gaunt hourglass in 3/4 view, front edge to the right
  p.poly(Q([[54, 30], [65, 30], [66, 34], [65, 40], [63, 45], [67, 51], [54, 51], [57, 45], [55, 40], [53, 34]]), P.skin);
  L(54, 31, 56, 41, P.skinD); // the turned-away side in shadow
  L(57, 44, 55, 50, P.skinD);
  L(64, 46, 66, 50, P.skinL); // light on the near hip
  D(61, 47, P.skinS); // navel
  for (let k = 0; k < 3; k++) L(56 + k * 0.4, 44 + k * 1.5, 59 + k * 0.4, 43.5 + k * 1.5, P.skinD); // ribs
  L(58, 31, 65, 31, P.skinL); // collarbone

  // ── breasts, bare and the same size: the near one in profile, jutting past the line of
  // the chest, the far one facing you, a shadowed cleavage between them
  const bR = 3.7, bY = 37, sag = 1.15;
  for (const cx of [60, 66.5]) {
    E(cx, bY + 0.8, bR + 0.5, bR * sag + 0.4, P.skinD);
    E(cx, bY, bR, bR * sag, P.skin);
    E(cx + 0.3, bY - bR * 0.45, bR * 0.5, bR * 0.28, P.skinL); // light on the top curve
    L(cx - bR * 0.7, bY + bR * sag, cx + bR * 0.6, bY + bR * sag + 0.5, P.skinS); // shadow beneath
  }
  L(63.2, bY - 1, 63.2, bY + 2.5, P.skinS); // cleavage
  // nipples: a darker point in a small areola
  const ny = bY + 1.2;
  for (const [nx, profile] of [[66.5 + bR - 0.6, true], [61, false]] as [number, boolean][]) {
    D(nx, ny - 1, P.areola);
    D(nx, ny + 1, P.areola);
    D(nx - 1, ny, P.areola);
    if (!profile) D(nx + 1, ny, P.areola);
    D(nx, ny, P.nipple);
  }
  // faint veins showing through the grey skin
  L(65.5, bY - 2, 64.5, bY - 6, P.vein);
  L(59, bY - 1, 58, bY - 5, P.vein);
  L(62, 44, 60, 49, P.vein);

  // ── plumage from the hips down, ragged at the edges, covering her loins
  p.poly(Q([[53, 49], [68, 49], [70, 55], [67, 60], [64, 57], [61, 62], [58, 57], [55, 61], [52, 55]]), P.wingD);
  p.poly(Q([[54, 49], [67, 49], [68, 54], [65, 56], [61, 58], [57, 55], [54, 54]]), P.wing);
  for (let i = 0; i < 7; i++) L(54 + i * 2.2, 49.5, 53 + i * 2.2 + (i % 2), 55 + ((i * 3) % 4), i % 2 ? P.wingD : P.wingU);
  L(54, 49, 68, 49, P.wingL); // a ridge of down at her waist
  // her rusted iron bell, hung from a cord at the near hip
  L(65, 49, 67, 53, P.rustD);
  const bx = X(67, 55), by = 55;
  p.poly([[bx - 1.5, by - 1.5], [bx + 1.5, by - 1.5], [bx + 2.5, by + 2], [bx - 2.5, by + 2]], P.rust);
  p.set(bx + 1, by - 1, shade(P.rust, 1.5));
  p.set(bx, by + 3, P.rustD);

  // ── arms: long and bony, with hooked claws
  const arm = (sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, c: RGBA, near: boolean) => {
    T(sx, sy, ex, ey, near ? 2.2 : 1.8, near ? 1.6 : 1.4, c);
    T(ex, ey, hx, hy, near ? 1.6 : 1.4, 1.1, c);
    if (near) L(sx + 0.5, sy - 1, ex + 0.5, ey - 1, P.skinL);
    const ang = Math.atan2(hy - ey, hx - ex);
    for (let k = -1; k <= 1; k++) L(hx, hy, hx + Math.cos(ang + k * 0.4) * 5, hy + Math.sin(ang + k * 0.4) * 5, P.bone);
  };
  if (pose === 'cast') {
    arm(54, 31, 49, 22, 53, 12, P.skinD, false);
    arm(66, 31, 71, 22, 68, 11, P.skin, true);
  } else if (pose === 'dive') {
    arm(54, 31, 52, 39, 46, 44, P.skinD, false);
    arm(66, 31, 66, 40, 59, 46, P.skin, true);
  } else {
    arm(54, 31, 51, 40, 53, 47, P.skinD, false);
    arm(65, 31, 72, 33, 78, 30 - flap * 2, P.skin, true); // reaching out, claws spread
  }

  // ── neck and head
  p.rect(Math.round(X(59, 26)), 23, 4, 8, P.skin);
  L(59, 24, 59, 30, P.skinD);
  const hx = X(61, 18), hy = 18;
  const open = pose === 'cast' ? 3 : 0; // how far the lower beak drops
  p.ellipse(hx - 2, hy - 2, 4.8, 4.8, P.hair); // back of the head
  p.ellipse(hx + 1, hy, 3, 4.2, P.skin); // a narrow skull
  // the face draws forward into a long hooked beak: skin at the root, dark horn at the tip
  if (open) {
    p.poly([[hx + 1, hy + 2.5], [hx + 8, hy + 3], [hx + 6, hy + 4 + open], [hx + 1, hy + 5]], P.mouth);
    for (let k = 0; k < 3; k++) p.set(hx + 3 + k * 1.5, hy + 3.5, P.tooth);
  }
  p.poly([[hx + 1, hy + 3], [hx + 7.5, hy + 3.2 + open], [hx + 5.5, hy + 5 + open], [hx + 1, hy + 5.5]], P.skinD); // lower beak
  p.poly([[hx + 6, hy + 3.4 + open], [hx + 7.5, hy + 3.2 + open], [hx + 6.5, hy + 4.4 + open]], P.beak);
  p.poly([[hx + 1, hy - 3], [hx + 5, hy - 1.5], [hx + 10, hy + 2], [hx + 10, hy + 4.5], [hx + 8.5, hy + 3], [hx + 1, hy + 3]], P.skin); // upper beak
  p.poly([[hx + 5.5, hy - 1], [hx + 10, hy + 2], [hx + 10, hy + 4.5], [hx + 8.5, hy + 3], [hx + 5.5, hy + 3]], P.beak);
  p.line(hx + 2, hy - 2.5, hx + 9.5, hy + 1.8, P.beakL); // light along the ridge
  p.line(hx + 2, hy + 3, hx + 8.5, hy + 3, P.skinS); // the seam of the beak
  // a hollow black eye with a red pinpoint, under a brow that slopes down into the beak
  p.rect(hx + 1, hy - 1, 3, 2, hex('#060406'));
  p.set(hx + 3, hy - 1, P.eye);
  p.line(hx, hy - 2.5, hx + 4, hy - 1.5, P.skinD);
  p.line(hx + 1, hy + 1.5, hx + 3, hy + 2, P.skinD); // sunken cheek
  // lank hair falling beside her face
  p.line(hx - 1, hy - 4, hx - 3, hy + 10, P.hairD, 1.6);
  p.line(hx, hy - 4, hx - 1, hy + 7, P.hair);
  // a crown of antler and bone
  for (let f = 0; f < 4; f++) {
    const cx = hx - 4 + f * 2.4, cy = hy - 4.5;
    p.line(cx, cy, cx - 2 + f * 0.6, cy - 7 - (f % 2) * 3, P.bone);
    p.set(cx - 2 + f * 0.6 - 1, cy - 4 - (f % 2) * 2, P.bone);
  }
}

export function buildBellMotherSheet(): SheetBuilder {
  // a little bigger than the old 100x84 frame, still anchored at the center
  const b = new SheetBuilder(112, 96, 56, 48);
  const draw = (flap: number, pose: MPose = 'fly') => {
    const p = b.canvas();
    bellMother(p, flap, pose);
    p.outline(hex('#08040a'));
    return p;
  };
  b.add('fly', draw(1), draw(0.3), draw(-0.8), draw(0));
  b.add('dive', draw(0, 'dive'));
  b.add('cast', draw(1.25, 'cast'));
  return b;
}
