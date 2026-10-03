// Gnarlfang, the two-headed hound, redrawn as a form-shaded puppet (0.22.0).
//   First form ("flayed"): skinned red muscle, bulging purple veins, bone spurs, a collar and chain.
//   Second form ("cinder"): what rises after you "kill" it. Black bloated hide, veins of fire,
//     horns, an open ribcage over embers, and a second head that is only a burning skull.
//
// Like the Bell-Mother, it is a skeleton and a `Pose`: hips, a hump of shoulder, four legs
// placed by their feet (two-bone IK finds the knees), two necks, two heads that tilt and gape,
// a tail. The animations at the bottom are poses computed from a clock, so the walk, the
// gallop and the howl have in-betweens, and it breathes while it stands. Everything faces right.
import { SheetBuilder } from './pixel';
import { FormCanvas, ramp, Ramp, turned, V } from './form';

const CELL = { w: 152, h: 112, ax: 76, ay: 78 };
const FLOOR = CELL.ay + 28; // the floor line in the cell (Hound.update places the anchor 28 px above its feet)
const K = 0.9; // the hound is described full size, then drawn at this scale
const DEG = Math.PI / 180;

const BONE = ramp('#2a1c22', '#5a4a48', '#8a7a62', '#b8aa88', '#dcd0b4', '#f6eed8');
const IRON = ramp('#0e0e14', '#24242c', '#3e3e4a', '#70707e', '#a8a8b8');
const MAW = ramp('#0c0206', '#2a060c', '#5a1018');
const FIRE = ramp('#a02408', '#ff5a10', '#ffb030', '#ffe890');

interface HeadOpts { blind?: boolean; horns?: boolean; skull?: boolean; collar?: boolean }

interface Style {
  hide: Ramp; // the body: deep shadow to highlight
  fur: Ramp; // matted fur, the ears, the nose
  gum: Ramp;
  vein: Ramp; // drawn at a fixed light, so burning veins stay bright in shadow
  veinLit: number;
  eye: Ramp;
  drool: Ramp;
  seed: number;
  head1: HeadOpts;
  head2: HeadOpts;
  spurs: 'bone' | 'spikes';
  tail: 'whip' | 'bone';
  /** Extra dressing over the hide, before the near legs and the front head. */
  dress: (f: FormCanvas, d: ReturnType<typeof turned>, S: V, H: V) => void;
}

interface Pose {
  x: number; y: number; // body offset from standing
  feet: V[]; // [forward, lift] for back far, back near, front far, front near
  head: [number, number, number, number]; // front head: offset from the shoulder, jaw 0..1.3, tilt in degrees (negative = thrown back)
  head2: [number, number, number, number]; // back head
  tail: number;
  breathe: number; // swells the chest
  dizzy?: number; // stars circling its head, at this phase 0..1
}

/** Small seeded random generator, so veins land in the same place every frame. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

/** A vein wandering over whatever is already drawn, branching, with a lit upper edge so it bulges. */
function vein(f: FormCanvas, st: Style, rnd: () => number, x: number, y: number, len: number, ang: number, depth = 0) {
  for (let i = 0; i < len; i++) {
    ang += (rnd() - 0.5) * 1.1;
    x += Math.cos(ang);
    y += Math.sin(ang);
    if (!f.filled(x, y) || !f.filled(x, y + 2) || !f.filled(x, y - 2)) return;
    f.dot(x, y, st.vein, st.veinLit);
    f.groove(x, y - 1, x, y - 1, 0.16);
    if (depth < 2 && rnd() < 0.14) vein(f, st, rnd, x, y, len * 0.45, ang + (rnd() < 0.5 ? 1 : -1) * 0.9, depth + 1);
  }
}

/**
 * A huge snarling dog head. (cx, cy) is the skull's center on the canvas, r its size in pixels,
 * jaw 0..1.3 how wide it gapes, tilt turns the whole head (negative = muzzle up).
 */
function head(f: FormCanvas, st: Style, cx: number, cy: number, r: number, jaw: number, tilt: number, o: HeadOpts, dim: number) {
  const d = turned(f, cx, cy, tilt * DEG, false, r); // head space is in skull radii
  const skin = o.skull ? BONE : st.hide;
  const hinge: V = [-0.1, 0.35];
  const about = (x: number, y: number, a: number): V => {
    const dx = x - hinge[0], dy = y - hinge[1], c = Math.cos(a), s = Math.sin(a);
    return [hinge[0] + dx * c - dy * s, hinge[1] + dx * s + dy * c];
  };
  const U = (x: number, y: number) => about(x, y, -jaw * 0.22); // on the upper jaw
  const L = (x: number, y: number) => about(x, y, jaw * 0.55); // on the lower jaw
  f.bias = dim;
  if (o.horns) {
    f.next();
    const pts: V[] = [[-0.2, -0.6], [-0.9, -1.2], [-1.7, -1.4], [-2.3, -1.0], [-2.5, -0.4]];
    for (let i = 0; i + 1 < pts.length; i++) d.limb(pts[i], pts[i + 1], 0.32 - i * 0.07, 0.25 - i * 0.06, BONE);
  }
  if (!o.skull) {
    // a torn ear laid back
    f.next();
    f.bias = dim - 0.1;
    d.limb([-0.3, -0.6], [-1.35, -1.25], 0.42, 0.1, st.fur);
    f.bias = dim;
  }
  if (jaw > 0.15) {
    // the dark of the mouth, and the tongue lying in it
    f.next();
    f.poly([hinge, U(2.0, 0.38), L(1.85, 0.45), L(0.3, 0.5)].map((p) => d.T(...p)), MAW, 0.3);
    if (!o.skull) d.limb(L(0.3, 0.42), L(1.45, 0.4), 0.2, 0.12, st.gum);
  }
  // lower jaw and its teeth
  f.next();
  f.bias = dim - 0.14;
  d.limb(L(-0.2, 0.62), L(1.85, 0.64), 0.34, 0.2, skin);
  f.bias = dim;
  for (let t = 0.6; t < 1.5; t += 0.3) d.stroke(L(t, 0.42), L(t - 0.02, 0.24), BONE, 0.9);
  d.stroke(L(1.62, 0.48), L(1.56, 0.02), BONE, 0.95, 1.7);
  // skull, the long muzzle, a heavy brow
  f.next();
  d.ball(0, 0, 1.05, 0.9, skin);
  d.limb(U(0.4, -0.18), U(1.82, 0.02), 0.54, 0.35, skin);
  d.limb(U(0.0, -0.66), U(0.95, -0.46), 0.22, 0.14, skin);
  if (o.skull) {
    d.groove(U(-0.6, -0.5), U(-0.2, -0.1), -0.2); // cracks in the bone
    d.groove(U(-0.2, -0.1), U(-0.4, 0.3), -0.2);
  } else for (let k = 0; k < 3; k++) d.groove(U(0.78 + k * 0.3, -0.5 + k * 0.1), U(0.92 + k * 0.3, -0.02), -0.2); // the snarl bunching up its muzzle
  d.groove(U(0.5, -0.5), U(1.7, -0.3), 0.12);
  // upper teeth and two long fangs
  for (let t = 0.6; t < 1.6; t += 0.28) d.stroke(U(t, 0.34), U(t + 0.02, 0.5), BONE, 0.9);
  d.stroke(U(1.76, 0.3), U(1.8, 0.82), BONE, 0.98, 1.7);
  d.stroke(U(1.16, 0.32), U(1.19, 0.68), BONE, 0.95, 1.4);
  f.next();
  d.ball(...U(2.08, -0.06), 0.2, 0.2, o.skull ? MAW : st.fur); // nose (a hole, on the skull)
  // a sunken eye that burns
  const [ex, ey] = d.T(...U(0.56, -0.26));
  if (o.blind) {
    f.stroke(ex - 2, ey - 2, ex + 2, ey + 2, st.gum, 0.7);
    f.stroke(ex - 2, ey + 2, ex + 2, ey - 2, st.gum, 0.3);
  } else {
    d.ball(...U(0.56, -0.26), 0.3, 0.24, MAW);
    f.next();
    f.dot(ex, ey, st.eye, 0.6);
    f.dot(ex + 1, ey, st.eye, 0.95);
    f.dot(ex - 1, ey, st.eye, 0.1);
  }
  // drool strings from the lower jaw
  if (jaw > 0.3 && !o.skull)
    for (const [t, n] of [[1.5, 3 + jaw * 2], [0.9, 2 + jaw]]) {
      const [x, y] = d.T(...L(t, 0.92));
      f.stroke(x, y, x - 0.5, y + n, st.drool, 0.4);
    }
  if (o.collar) {
    f.next();
    d.limb([-1.0, -0.75], [-1.1, 1.0], 0.2, 0.2, IRON);
    for (let k = -1; k <= 1; k++) d.dot(-0.82, k * 0.5 + 0.1, IRON, 0.95); // spikes
  }
  f.bias = 0;
}

/** Draw the hound in one pose. */
function hound(st: Style, q: Pose): FormCanvas {
  const f = new FormCanvas(CELL.w, CELL.h);
  f.clipY = FLOOR;
  // body space: origin on the floor under its middle, y up is negative
  const d = turned(f, CELL.ax, FLOOR, 0, false, K);
  const S: V = [6 + q.x, -42 + q.y]; // shoulder hump
  const H: V = [-26 + q.x, -34 + q.y * 0.8]; // hips
  const sw = q.breathe;

  const leg = (front: boolean, near: boolean, foot: V) => {
    f.bias = near ? 0 : -0.24;
    const rx = front ? S[0] + (near ? 6 : 0) : H[0] + (near ? 0 : -5);
    const ry = front ? S[1] + 10 : H[1] + 6;
    const j = ik(rx, ry, rx + (front ? 2 : -2) + foot[0], -3 - foot[1], front ? 17 : 15, front ? 17 : 16, front ? 1 : -1);
    f.next();
    if (front) {
      d.limb([rx, ry], [j.kx, j.ky], 7.2, 5, st.hide); // upper arm, all muscle
      d.limb([j.kx, j.ky], [j.fx, j.fy], 4.8, 3, st.hide);
      d.groove([rx - 2, ry + 2], [j.kx - 1, j.ky - 3], -0.16); // the split of the muscle
    } else {
      d.ball(rx + 1, ry - 2, 9, 11, st.hide); // haunch, then a long hock
      d.limb([rx, ry + 2], [j.kx, j.ky], 5.5, 3, st.hide);
      d.limb([j.kx, j.ky], [j.fx, j.fy], 3, 2.2, st.hide);
    }
    // a broad paw with hooked claws
    d.ball(j.fx + 1.5, j.fy + 0.6, front ? 4.6 : 3.6, 2.4, st.hide);
    for (let c = 0; c < 3; c++) d.stroke([j.fx + 2 + c * 1.7, j.fy + 0.8], [j.fx + 3.6 + c * 1.7, j.fy + 2.8], BONE, 0.85);
    f.bias = 0;
  };
  const neck = (hx: number, hy: number, back: boolean) => {
    f.next();
    f.bias = back ? -0.2 : 0;
    d.limb([S[0] + (back ? 0 : 10), S[1] + (back ? -12 : -2)], [hx - 3, hy + 1], back ? 9 : 11, back ? 6 : 7.5, st.hide);
    f.bias = 0;
  };

  // ── far side and the back head
  leg(false, false, q.feet[0]);
  leg(true, false, q.feet[2]);
  const h2: V = [S[0] + q.head2[0], S[1] + q.head2[1]];
  neck(h2[0], h2[1], true);
  head(f, st, ...d.T(...h2), 9 * K, q.head2[2], q.head2[3], st.head2, -0.2);

  // ── tail
  const tx = H[0] - 13, ty = H[1] - 6;
  f.next();
  if (st.tail === 'whip') {
    d.limb([tx, ty], [tx - 8, ty - 4 - q.tail], 3, 1.7, st.hide);
    d.limb([tx - 8, ty - 4 - q.tail], [tx - 16, ty + 1 - q.tail * 1.5], 1.7, 0.6, st.hide);
    for (let k = 0; k < 3; k++) d.dot(tx - 4 - k * 4, ty - 6 - q.tail * (0.6 + k * 0.3), BONE, 0.8);
  } else {
    for (let k = 0; k < 6; k++) d.ball(tx - k * 3.2, ty - 2 - q.tail * (k / 4) + k * 0.6, 2.4 - k * 0.25, 2.4 - k * 0.25, BONE);
    d.limb([tx - 17, ty - q.tail * 1.5 + 1], [tx - 24, ty - q.tail * 1.5 - 2], 2, 0.4, BONE); // barb
  }

  // ── the body, one mass: small hips, a long sloping back, an enormous hump of shoulder and chest
  f.next();
  d.ball(H[0], H[1], 15, 13, st.hide);
  d.limb([H[0] + 2, H[1] - 1], [S[0] - 6, S[1] - 2], 12, 16, st.hide);
  d.ball(S[0], S[1], 21 + sw * 0.5, 19 + sw, st.hide);
  d.ball(S[0] + 11, S[1] + 6, 11 + sw, 12 + sw, st.hide);
  // the muscle splits: shoulder blade, the pectoral seam, a gaunt belly line, ribs under the hide
  d.groove([S[0] - 10, S[1] - 6], [S[0] + 2, S[1] + 6], -0.2);
  d.groove([S[0] + 2, S[1] + 6], [S[0] + 4, S[1] + 15], -0.2);
  d.groove([S[0] + 6, S[1] - 4], [S[0] + 9, S[1] + 9], -0.18);
  d.groove([H[0] + 8, H[1] + 6], [S[0] - 6, S[1] + 13], -0.18);
  for (let k = 0; k < 3; k++) {
    d.groove([S[0] - 14 - k * 4, S[1] + 2 + k], [S[0] - 12 - k * 4, S[1] + 10], -0.2);
    d.groove([S[0] - 13 - k * 4, S[1] + 2 + k], [S[0] - 11 - k * 4, S[1] + 10], 0.1);
  }
  // bulging veins over the hide (the same seed each frame, so they ride along with the body)
  const rnd = rng(st.seed);
  const starts: [number, number, number, number][] = [
    [S[0] - 4, S[1] - 4, 16, 0.6], [S[0] + 8, S[1] - 6, 14, 1.4], [S[0] - 12, S[1] + 2, 14, 0.2], [S[0] + 12, S[1] + 8, 10, 1.8],
    [S[0] - 2, S[1] + 10, 12, -0.4], [H[0] + 2, H[1] - 4, 14, 0.8], [H[0] - 6, H[1] + 2, 10, 1.6], [S[0] + 4, S[1] - 14, 10, 0.3],
    [S[0] - 16, S[1] - 8, 14, 0.9], [S[0] + 16, S[1] - 4, 10, 2.2], [H[0] + 10, H[1] - 8, 12, -0.6], [S[0] - 6, S[1] + 4, 10, 2.6],
  ];
  for (const [x, y, n, a] of starts) vein(f, st, rnd, ...d.T(x, y), n * K, a);

  st.dress(f, d, S, H);

  // ── near legs (over the body), a vein down each
  leg(false, true, q.feet[1]);
  leg(true, true, q.feet[3]);
  const legRnd = rng(st.seed + 7);
  vein(f, st, legRnd, ...d.T(S[0] + 7, S[1] + 14), 11, 1.5);
  vein(f, st, legRnd, ...d.T(H[0] + 2, H[1] + 2), 9, 1.4);

  // ── spine: spurs climbing from the hips to a crest over the hump
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const x = H[0] - 6 + (S[0] + 8 - (H[0] - 6)) * t;
    const y = H[1] - 12 + (S[1] - 19 - (H[1] - 12)) * Math.min(1, t * 1.3) + Math.max(0, t - 0.77) * 18;
    const h = 4 + Math.sin(t * Math.PI) * 7 + (k % 2) * 2;
    f.next();
    if (st.spurs === 'bone') {
      d.stroke([x + 1, y + 1], [x - 3, y - 3], st.fur, 0.3, 2); // matted fur between the spurs
      d.limb([x, y + 2], [x - 1.5 - h * 0.35, y - h], 2.2, 0.4, BONE);
    } else {
      d.limb([x, y + 2], [x - h * 0.4, y - h], 1.3, 0.5, IRON);
      d.dot(x - 1, y + 2, st.vein, st.veinLit); // the wound glows where the spike goes in
    }
  }

  // ── the front head, the bigger of the two
  const h1: V = [S[0] + q.head[0], S[1] + q.head[1]];
  neck(h1[0], h1[1], false);
  vein(f, st, rng(st.seed + 3), ...d.T(S[0] + 14, S[1] - 6), 11, -0.4);
  head(f, st, ...d.T(...h1), 10 * K, q.head[2], q.head[3], st.head1, 0);

  // stars circling its heads while it is dazed
  if (q.dizzy !== undefined) {
    f.next();
    for (let k = 0; k < 3; k++) {
      const a = (q.dizzy + k / 3) * Math.PI * 2;
      const [x, y] = d.T(h1[0] + 2 + Math.cos(a) * 11, h1[1] - 15 + Math.sin(a) * 3);
      f.dot(x, y, FIRE, 0.99);
      if (Math.sin(a) > 0) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) f.dot(x + ox, y + oy, FIRE, 0.7); // bigger in front
    }
  }
  return f;
}

// ---------------------------------------------------------------- the two forms

const FLAYED: Style = {
  hide: ramp('#1c040c', '#3a0c16', '#5e1820', '#842a2c', '#a8443c', '#cc705e'),
  fur: ramp('#0a0608', '#1e1214', '#32262a', '#4a3c3c'),
  gum: ramp('#4a0c18', '#8a1a2c', '#b83a48'),
  vein: ramp('#22061e', '#3c0e38', '#6a2450'),
  veinLit: 0.1,
  eye: ramp('#a07010', '#ffe040', '#fff8c0'),
  drool: ramp('#8a9a88', '#d8e0c8'),
  seed: 11,
  head1: { collar: true },
  head2: { blind: true },
  spurs: 'bone',
  tail: 'whip',
  dress(f, d, S, H) {
    // muscle fibres striping the shoulder
    for (let k = 0; k < 5; k++) d.groove([S[0] - 8 + k * 3, S[1] - 13 + k], [S[0] - 6 + k * 3.5, S[1] - 3 + k], k % 2 ? -0.14 : 0.1);
    // a patch of mangy hide still clinging to the hips
    f.next();
    f.bias = -0.1;
    d.ball(H[0] - 3, H[1] - 5, 8, 6, this.fur, 0.7);
    for (let k = 0; k < 6; k++) d.stroke([H[0] - 9 + k * 2.6, H[1] + 1], [H[0] - 10 + k * 2.6, H[1] + 4 + (k % 2) * 2], this.fur, 0.3);
    f.bias = 0;
    // a broken chain from the collar trails down the chest
    f.next();
    for (let k = 0; k < 4; k++) d.ball(S[0] + 17 - k, S[1] + 6 + k * 3, k % 2 ? 1.1 : 1.8, k % 2 ? 1.8 : 1.1, IRON);
    // a stitched scar across the haunch
    d.groove([H[0] + 4, H[1] - 10], [H[0] + 12, H[1] + 2], -0.25);
    for (let k = 0; k < 4; k++) d.stroke([H[0] + 3 + k * 2, H[1] - 9 + k * 3], [H[0] + 5 + k * 2, H[1] - 10 + k * 3], BONE, 0.6);
  },
};

const CINDER: Style = {
  hide: ramp('#060405', '#120c0e', '#221a1c', '#382e2e', '#564844', '#7c6a60'),
  fur: ramp('#040304', '#0c0808', '#1c1414', '#2a1e1e'),
  gum: FIRE,
  vein: FIRE,
  veinLit: 0.6,
  eye: ramp('#901008', '#ff3018', '#ffb080'),
  drool: FIRE,
  seed: 23,
  head1: { horns: true },
  head2: { skull: true, horns: true },
  spurs: 'spikes',
  tail: 'bone',
  dress(f, d, S, H) {
    // the flank is torn open: a ribcage over embers
    const rx = (S[0] + H[0]) / 2 + 2, ry = S[1] + 5;
    f.next();
    d.ball(rx, ry, 9, 6, MAW, 0.5);
    f.next();
    d.ball(rx, ry + 1, 6, 3.5, FIRE, 0.9);
    for (let k = 0; k < 4; k++) {
      f.next();
      d.limb([rx - 7 + k * 4.4, ry - 6 + Math.abs(k - 1.5)], [rx - 5 + k * 4.4, ry + 5 - Math.abs(k - 1.5)], 1, 0.8, BONE);
    }
    // cracked hide over the shoulder, lit from inside
    d.stroke([S[0] - 6, S[1] - 14], [S[0] - 2, S[1] - 6], FIRE, 0.7);
    d.stroke([S[0] - 2, S[1] - 6], [S[0] - 5, S[1] + 1], FIRE, 0.4);
    // a shackle on the near foreleg's root
    f.next();
    d.limb([S[0] + 2, S[1] + 15], [S[0] + 12, S[1] + 15], 1.6, 1.6, IRON);
  },
};

// ---------------------------------------------------------------- the animations

const TAU = Math.PI * 2;
const stand = (o: Partial<Pose>): Pose => ({ x: 0, y: 0, feet: [[0, 0], [0, 0], [0, 0], [0, 0]], head: [31, 0, 0.3, 0], head2: [16, -28, 0.2, -8], tail: 3, breathe: 0, ...o });
const mixV = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** A heavy prowl: diagonal pairs of legs, the hump rolling, the heads swinging out of step. */
function walk(t: number): Pose {
  const a = t * TAU, s = Math.sin(a), c = Math.cos(a);
  const foot = (ph: number): V => [7 * Math.sin(a + ph), Math.max(0, Math.cos(a + ph)) * 4];
  const bob = 0.5 - 0.5 * Math.cos(a * 2);
  return stand({
    y: bob,
    feet: [foot(Math.PI), foot(0), foot(0), foot(Math.PI)],
    head: [31, bob + s * 1.5, 0.3 + 0.12 * s, 4 + s * 4],
    head2: [16, -28 - bob - c * 1.5, 0.4 - 0.2 * c, -8 + c * 5],
    tail: 3 + s * 2.5,
    breathe: 0.5 + 0.5 * c,
  });
}
/** Coiled to spring, growling: low on its haunches, shaking with it. */
function crouch(t: number): Pose {
  const s = Math.sin(t * TAU), q = Math.sin(t * TAU * 2);
  return stand({ y: 7 + s * 0.6, x: -2, feet: [[-6, 0], [-4, 0], [8, 0], [10, 0]], head: [33, 9 + q * 0.6, 0.75 + q * 0.12, 8], head2: [18, -18 + s * 0.8, 0.85 - q * 0.12, 0], tail: -2 + q, breathe: 0.6 + s * 0.6 });
}
/** The charge: a gallop, gathering and stretching. */
function charge(t: number): Pose {
  const u = 0.5 - 0.5 * Math.cos(t * TAU); // 0 = gathered, 1 = stretched
  const A: V[] = [[8, 0], [10, 4], [-6, 3], [-4, 0]], B: V[] = [[-14, 3], [-10, 0], [14, 0], [16, 5]];
  return stand({ x: 2, y: 3 - u * 2.5, feet: A.map((p, i) => mixV(p, B[i], u)), head: [34, 5 - u * 2, 1 + 0.1 * Math.sin(t * TAU * 2), 6 - u * 6], head2: [20, -22 - u * 2, 1.1, -4 - u * 6], tail: 3 + u * 5, breathe: u });
}
/** In the air: every leg flung out, the tail streaming. */
function leap(t: number): Pose {
  const s = Math.sin(t * TAU);
  return stand({ y: -4, feet: [[-16, 8 + s], [-12, 6 - s], [16, 10 - s], [18, 12 + s]], head: [33, -3, 1.1 + s * 0.1, -6], head2: [18, -30, 0.9 - s * 0.1, -14], tail: 7 + s * 2 });
}
/** Both heads thrown back, howling: the muzzles point at the sky and the chest heaves. */
function howl(t: number): Pose {
  const s = Math.sin(t * TAU), q = Math.sin(t * TAU * 3);
  return stand({ y: 1, feet: [[-2, 0], [2, 0], [2, 0], [6, 0]], head: [25, -16 - s, 1.1 + q * 0.1, -52 + s * 4], head2: [7, -32 + s, 1.15 - q * 0.1, -60 - s * 4], tail: 8 + s * 2, breathe: 1.4 + s * 0.8 });
}
/** The snap: jaws wide, then shut hard on nothing. */
function bite(t: number): Pose {
  const jaw = t < 0.5 ? 1.3 - t * 0.4 : 1.1 - (t - 0.5) * 2;
  return stand({ x: 3 + t * 2, y: 2, feet: [[-8, 0], [-4, 0], [10, 0], [13, 0]], head: [36 + t * 2, 5, jaw, 4], head2: [16 + t, -26, 0.3 + (1 - t) * 0.6, -6] });
}
/** Dazed against the wall: sagging, the heads rolling, stars round them. */
function stun(t: number): Pose {
  const s = Math.sin(t * TAU), c = Math.cos(t * TAU);
  return stand({ y: 8 + s * 0.7, x: s * 1.2, feet: [[-8, 0], [-12, 0], [10, 0], [6, 0]], head: [28 + c, 12 + s, 0.5, 14 + s * 8], head2: [12 - c, -12 - s, 0.4, 10 - s * 10], tail: -4, breathe: 0.5 + c * 0.5, dizzy: t });
}
/** Collapsed on its side, legs splayed, both heads on the floor: it looks dead. */
const DOWN = stand({ y: 14, x: -2, feet: [[-14, 0], [-18, 0], [16, 0], [20, 0]], head: [30, 17, 0.6, 16], head2: [6, 14, 0.4, 20], tail: -6 });

function houndSheet(st: Style): SheetBuilder {
  const b = new SheetBuilder(CELL.w, CELL.h, CELL.ax, CELL.ay);
  const cycle = (pose: (t: number) => Pose, n: number) => Array.from({ length: n }, (_, i) => hound(st, pose(i / n)).resolve());
  b.add('walk', ...cycle(walk, 12));
  b.add('crouch', ...cycle(crouch, 6));
  b.add('charge', ...cycle(charge, 8));
  b.add('leap', ...cycle(leap, 4));
  b.add('howl', ...cycle(howl, 8));
  b.add('bite', ...cycle(bite, 4));
  b.add('stun', ...cycle(stun, 8));
  b.add('down', hound(st, DOWN).resolve());
  return b;
}

export const buildHoundSheet = () => houndSheet(FLAYED);
export const buildCinderHoundSheet = () => houndSheet(CINDER);
