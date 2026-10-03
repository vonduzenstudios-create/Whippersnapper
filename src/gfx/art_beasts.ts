// The castle's creatures, redrawn with form shading (0.24.0): wild dogs, harpies, bell
// wraiths, frost crawlers, the Hookjaw, the Devourer, the mire eel and the Gloomcaster here;
// the ooze, grub, moth, Gravehand, tome, chair and spider in art_beasts2.ts.
//
// Each keeps its old cell, anchor, animation names and design. What the game plays as a loop
// (a run, a flap, a crawl) has twice the frames it had: `SheetBuilder.smooth` records that,
// and Sprite.anim() plays those twice as fast, so no enemy's timing changed. What the game
// picks by number (a wind-up, a bite) has the same frames as before.
// Everything faces right; sprites are mirrored in game.
import { SheetBuilder, PixelCanvas } from './pixel';
import { FormCanvas, ramp, Ramp, V } from './form';

export * from './art_beasts2';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** `n` frames of a loop: draw(t) for t = 0, 1/n, ... */
const cycle = (n: number, draw: (t: number) => PixelCanvas) => Array.from({ length: n }, (_, i) => draw(i / n));
/** The light a round body of radius R centered on (cx, cy) gets at a pixel: for flat shapes that should look round. */
const round = (cx: number, cy: number, R: number) => (x: number, y: number) => {
  const nx = (x - cx) / R, ny = (y - cy) / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return 0.5 + 0.5 * (nx * 0.5 - ny * 0.65 + nz * 0.57);
};

const BONE = ramp('#342c2a', '#665e50', '#9a927a', '#c4bc9e', '#e2dabc', '#f8f4e0');
const IRON = ramp('#101016', '#26262e', '#3e404c', '#70747e', '#a4a8b4');
const DARK = ramp('#0a0408', '#1c0a10', '#4a0a10'); // mouths, sockets
const EYE_R = ramp('#901010', '#ff3030', '#ffb0a0');
const EYE_Y = ramp('#a07010', '#ffd040', '#fff4b0');
const BRONZE = ramp('#2e1c0c', '#6a4a20', '#b08840', '#dcb860', '#fff0b0');

// ---------------------------------------------------------------- shared: a four-legged beast

interface BeastPose {
  bx: number; // body center
  by: number;
  len: number; // body half length
  tall: number; // body half height
  legs: [number, number, number, number]; // leg angles (deg from straight down, + = forward): back far, back near, front far, front near
  legLen: number;
  head: V; // head center
  jaw: number; // 0 closed .. 1 wide open
  tail: number; // tail lift
  /**
   * Walking: where each foot is, as [forward of its hip, lifted off the ground], in the same
   * order as `legs`. Given this, the legs are placed by their feet (the knees found by IK)
   * and `legs` is ignored, so each leg steps on its own.
   */
  feet?: V[];
}

/** Two-bone IK: the middle joint of a limb from (rx, ry) to (fx, fy). `bend` +1 or -1 picks which way it folds. */
function knee(rx: number, ry: number, fx: number, fy: number, l1: number, l2: number, bend: number): V {
  const dx = fx - rx, dy = fy - ry;
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx) + Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) * bend;
  return [rx + Math.cos(a) * l1, ry + Math.sin(a) * l1];
}

function quadruped(f: FormCanvas, fur: Ramp, eye: Ramp, q: BeastPose, headR = 4) {
  const leg = (i: number, x: number, y: number, dim: number, w: number) => {
    let kx: number, ky: number, fx: number, fy: number;
    if (q.feet) {
      // stepping: the paw goes where the stride puts it, and the leg folds to reach it
      // (a hind leg's hock points back, a foreleg's elbow too)
      fx = x + q.feet[i][0];
      fy = q.by + q.legLen + 1.5 - q.feet[i][1];
      [kx, ky] = knee(x, y, fx, fy, q.legLen * 0.56, q.legLen * 0.56, i < 2 ? 1 : -1);
    } else {
      const r = q.legs[i] * DEG;
      kx = x + Math.sin(r) * q.legLen * 0.5;
      ky = y + Math.cos(r) * q.legLen * 0.5;
      fx = kx + Math.sin(r * 0.4) * q.legLen * 0.55;
      fy = ky + q.legLen * 0.5;
    }
    f.bias = dim;
    f.next();
    f.limb(x, y, kx, ky, w * 0.6 + 0.3, w * 0.5, fur);
    f.limb(kx, ky, fx, fy, w * 0.5, w * 0.4, fur);
    f.limb(fx, fy, fx + 1.8, fy + 0.2, w * 0.42, w * 0.34, fur); // the paw
    f.dot(fx + 2.6, fy + 0.4, BONE, 0.8 + dim); // claws
    f.bias = 0;
  };
  const { bx, by } = q;
  leg(0, bx - q.len * 0.6, by + 1, -0.26, 2.2);
  leg(2, bx + q.len * 0.6, by + 1, -0.26, 2.2);
  f.next();
  f.limb(bx - q.len, by - 1, bx - q.len - 6, by - 3 - q.tail, 1.3, 1, fur);
  f.limb(bx - q.len - 6, by - 3 - q.tail, bx - q.len - 9, by - 1 - q.tail * 1.4, 1, 0.4, fur);
  // the body, ribs showing through the mangy fur
  f.next();
  f.ball(bx, by, q.len, q.tall, fur);
  for (let k = 0; k < 3; k++) f.groove(bx - 2 + k * 3, by, bx - 1 + k * 3, by + q.tall - 1, -0.2);
  leg(1, bx - q.len * 0.5, by + 2, 0, 2.4);
  leg(3, bx + q.len * 0.7, by + 2, 0, 2.4);
  // neck, head, a torn ear
  const [hx, hy] = q.head, open = q.jaw * 3;
  f.next();
  f.limb(bx + q.len - 2, by - 1, hx - 1, hy + 1, q.tall * 0.62, headR * 0.7, fur);
  f.bias = -0.16;
  f.limb(hx + 0.5, hy + 2.2, hx + headR + 3.5, hy + 2.6 + open, 1.2, 0.8, fur); // lower jaw
  f.bias = 0;
  if (q.jaw > 0.2) {
    f.stroke(hx + 3, hy + 1.5, hx + headR + 4, hy + 1.5 + open * 0.5, DARK, 0.9);
    f.dot(hx + headR + 2, hy + 2 + open, BONE, 0.9);
  }
  f.next();
  f.ball(hx, hy, headR + 0.5, headR * 0.8, fur);
  f.limb(hx + 1, hy - 0.4, hx + headR + 4.4, hy + 0.2 - open * 0.3, 1.9, 1.2, fur); // snout
  f.limb(hx - 1.6, hy - 2, hx - 1, hy - headR - 3, 1.3, 0.3, fur);
  if (q.jaw > 0.2) f.dot(hx + headR + 3, hy + 1.4 - open * 0.2, BONE, 0.95); // a fang
  f.dot(hx + headR + 5, hy - 0.6 - open * 0.3, DARK, 0); // nose
  f.dot(hx + 1, hy - 1, eye, 0.6);
  f.dot(hx + 2, hy - 1, eye, 0.1);
}

// ---------------------------------------------------------------- wild dog

const DOG_FUR = ramp('#1a120e', '#3a2e28', '#5a4a40', '#7a6a58', '#9c8a74');

export function buildDogSheet(): SheetBuilder {
  const b = new SheetBuilder(44, 28, 22, 14);
  const pose = (o: Partial<BeastPose>): BeastPose => ({
    bx: 20, by: 15, len: 9, tall: 4.2, legs: [0, 0, 0, 0], legLen: 9, head: [31, 11], jaw: 0, tail: 2, ...o,
  });
  const draw = (q: BeastPose) => {
    const f = new FormCanvas(44, 28);
    quadruped(f, DOG_FUR, EYE_R, q, 3.6);
    return f.resolve({ contour: 0.2 });
  };
  // a four-beat lope: each paw lifts, swings forward and plants in its own turn (hind far,
  // fore far, hind near, fore near), the spine rocking and the head bobbing against it
  b.smooth('run', 3, ...cycle(12, (t) => {
    const a = t * TAU, bob = 0.5 - 0.5 * Math.cos(a * 2);
    const foot = (ph: number): V => {
      const u = a + ph * TAU;
      return [Math.sin(u) * 5, Math.max(0, Math.cos(u)) * 3.2]; // lifted while it swings forward
    };
    return draw(pose({ by: 15 - bob * 0.8, feet: [foot(0), foot(0.5), foot(0.25), foot(0.75)], head: [31, 11 + bob], tail: 3 + Math.cos(a), jaw: 0.3 + 0.1 * Math.sin(a) }));
  }));
  b.add('stand', draw(pose({ legs: [-5, 5, -5, 5], tail: 1 })));
  b.add('crouch', draw(pose({ by: 18, tall: 3.8, legs: [-60, -50, 40, 50], legLen: 7, head: [31, 16], jaw: 0.6, tail: -1 })));
  b.add('leap', draw(pose({ by: 13, len: 10, legs: [-80, -70, 75, 85], head: [33, 10], jaw: 1, tail: 4 })));
  return b;
}

// ---------------------------------------------------------------- harpy

const H_SKIN = ramp('#3e3048', '#7a6a80', '#b8aab8', '#dcd0dc');
const H_WING = ramp('#120a18', '#2a1a30', '#4a3050', '#6a4a72', '#8c6a94');
const H_HAIR = ramp('#8a8298', '#d8d0e0', '#f8f4fc');
const TALON = ramp('#6a5628', '#c8b070');

/** A winged woman: `flap` -1 (wings down) .. 1 (up). */
function harpy(f: FormCanvas, cx: number, cy: number, flap: number, dive: boolean, swing = 0) {
  const lean = dive ? 0.6 : 0.1;
  const sx = cx, sy = cy - 5; // shoulders
  // a wing: the arm of it, and a row of flight feathers hanging from the arm
  const wing = (dir: number, dim: number) => {
    const tipY = dive ? sy - 10 : sy - flap * 14, tipX = dive ? sx - 18 : sx + dir * 2 - 14.4; // diving: swept back and up
    const midX = sx - 8, midY = sy - flap * 7 - 3;
    f.bias = dim;
    for (let k = 6; k >= 0; k--) {
      const t = k / 6;
      // along the arm: shoulder to wrist, wrist to tip
      const bx = t < 0.5 ? sx + (midX - sx) * t * 2 : midX + (tipX - midX) * (t * 2 - 1);
      const by = t < 0.5 ? sy + (midY - sy) * t * 2 : midY + (tipY - midY) * (t * 2 - 1);
      const len = 5 + Math.sin(t * Math.PI) * 3, a = (100 + t * 40 - flap * 14) * DEG; // feathers trail, more at the tip
      f.next();
      f.limb(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, 1.2, 1.7, H_WING, 0.6, (u) => -0.3 + u * 0.3);
    }
    f.next();
    f.limb(sx, sy, midX, midY, 1.6, 1.3, H_WING);
    f.limb(midX, midY, tipX, tipY, 1.3, 0.7, H_WING);
    f.bias = 0;
  };
  wing(-1, -0.24);
  // legs: feathered thighs and taloned feet hanging below
  const hip = cy + 5;
  // (they hang loose: a feathered thigh, a bare shank that trails behind the beat, toes that curl and open)
  for (const [x, dim, late] of [[cx - 1.5, -0.2, 0.5], [cx + 2, 0, 0]]) {
    const sw = dive ? -1.4 : Math.sin(swing - late), sw2 = dive ? -1.8 : Math.sin(swing - late - 0.9);
    const kx = x + lean * 3 + 1.5 + sw * 1.6, ky = hip + 4 - Math.abs(sw) * 0.5; // knee, carried forward
    const ax = kx - 1.2 + sw2 * 2.4, ay = ky + 4.2; // ankle, swinging under it
    const open = 0.5 + 0.5 * sw2;
    f.bias = dim;
    f.next();
    f.limb(x, hip, kx, ky, 1.7, 1.1, H_WING);
    f.limb(kx, ky, ax, ay, 0.8, 0.7, TALON);
    f.stroke(ax, ay, ax + 1.6 + open, ay + 2.4 - open * 0.6, TALON, 0.8);
    f.stroke(ax, ay, ax - 1.4 - open * 0.6, ay + 2.2, TALON, 0.3);
    f.stroke(ax, ay, ax + 0.2, ay + 2.8, TALON, 0.8);
  }
  f.bias = 0;
  // torso, a feathered skirt
  f.next();
  f.limb(cx + lean * 3, hip - 1, sx, sy + 1.5, 2.6, 3, H_SKIN);
  f.next();
  f.ball(cx + lean * 3, hip - 0.5, 3.4, 1.6, H_WING);
  // head with long streaming hair
  const hx = sx + 1 + lean * 4, hy = sy - 4;
  f.next();
  f.limb(hx - 1, hy - 1, hx - 9, hy + 4 + flap * 2, 1.5, 1, H_HAIR);
  f.limb(hx - 6, hy + 2, hx - 11, hy + 7 + flap * 2, 1, 0.4, H_HAIR);
  f.ball(hx, hy, 3.3, 3.2, H_HAIR);
  f.next();
  f.ball(hx + 1, hy + 0.5, 2.3, 2.7, H_SKIN);
  f.dot(hx + 2, hy, EYE_Y, 0.6);
  f.dot(hx + 2, hy + 2, H_SKIN, 0.1); // mouth
  // an arm, then the near wing over everything
  f.next();
  f.limb(sx + 2, sy + 1, sx + 5, sy + 5, 1, 0.8, H_SKIN);
  wing(1, 0);
}

export function buildHarpySheet(): SheetBuilder {
  const b = new SheetBuilder(48, 40, 24, 20);
  const draw = (flap: number, dive = false, swing = 0) => {
    const f = new FormCanvas(48, 40);
    harpy(f, 26, 20, flap, dive, swing);
    return f.resolve({ contour: 0.15 });
  };
  b.smooth('fly', 2, ...cycle(8, (t) => draw(0.1 + 0.9 * Math.cos(t * TAU), false, t * TAU - 1.2)));
  b.add('dive', draw(0, true));
  return b;
}

// ---------------------------------------------------------------- bell wraith

const ROBE = ramp('#0c0a14', '#221e2e', '#3a3448', '#5a5270', '#7c7494');
const COLD = ramp('#3a90b0', '#a8f0ff', '#ffffff');

export function buildWraithSheet(): SheetBuilder {
  const b = new SheetBuilder(36, 44, 18, 22);
  /** `ph`: how the frayed hem is blowing; `ring`: 0 bell lowered, 1 and 2 raised and swinging each way. */
  const draw = (ph: number, ring: number) => {
    const f = new FormCanvas(36, 44);
    const cx = 16, top = 6;
    // the robe frays into wisps: a row of tatters that sway out of step
    for (let k = 0; k <= 6; k++) {
      const x = cx + 8 - k * 2.6, len = 7 + Math.sin(k * 1.7 + ph) * 3 + (k % 2) * 3;
      f.next();
      f.bias = -0.2;
      f.limb(x, top + 20, x + Math.sin(k * 2.1 + ph) * 1.5, top + 24 + len, 2.2, 0.4, ROBE, 0.7);
    }
    f.bias = 0;
    // the body of the robe, a fold catching the light down its front
    f.next();
    f.limb(cx + 0.5, top + 6, cx, top + 17, 4.6, 7.6, ROBE, 0.8);
    f.groove(cx + 4, top + 8, cx + 6, top + 24, 0.16);
    f.groove(cx - 1, top + 10, cx - 3, top + 26, -0.14);
    // hood with an empty face and two cold eyes
    f.next();
    f.ball(cx + 1, top + 4, 5.2, 5.2, ROBE);
    f.next();
    f.poly([[cx + 0.5, top + 3], [cx + 5, top + 2.5], [cx + 5.6, top + 6], [cx + 3, top + 8.4], [cx + 0.5, top + 7]], DARK, 0.1);
    f.dot(cx + 2, top + 4, COLD, 0.6);
    f.dot(cx + 4, top + 4, COLD, 0.6);
    // an arm raising a hand bell
    const lift = ring ? -6 - ring * 2 : 0, hx = cx + 9, hy = top + 14 + lift;
    const sw = ring === 1 ? 2 : ring === 2 ? -2 : 0;
    f.next();
    f.limb(cx + 4, top + 9, hx, hy, 1.5, 1.1, ROBE);
    f.next();
    f.stroke(hx, hy, hx, hy + 2, BRONZE, 0.3);
    f.poly([[hx - 2 + sw, hy + 2], [hx + 2 + sw, hy + 2], [hx + 4 + sw, hy + 8], [hx - 4 + sw, hy + 8]], BRONZE, (x) => 0.3 + (x - (hx - 4 + sw)) * 0.085);
    f.stroke(hx - 4 + sw, hy + 8, hx + 4 + sw, hy + 8, BRONZE, 0.25);
    f.dot(hx + sw, hy + 9, BRONZE, 0.5); // clapper
    return f.resolve();
  };
  b.smooth('float', 2, ...cycle(8, (t) => draw(t * TAU, 0)));
  b.add('ring', draw(0, 1), draw(1.6, 2));
  return b;
}

// ---------------------------------------------------------------- frost crawler

const SLUG = ramp('#0c1a2a', '#1e3c58', '#3e6e98', '#6a9cc4', '#a0cce8', '#dcf2ff');
const SLUG_FOOT = ramp('#2e5a7c', '#7eb4d4', '#cdeaf8'); // the pale skirt it glides on
const ICE = ramp('#35709c', '#62a4d0', '#9cd2f0', '#d8f2ff', '#ffffff');
const EYE_C = ramp('#20a0b0', '#60ffff', '#e0ffff');

/**
 * The Frost Crawler: a slug of living meltwater (0.24.2; it used to be a six-legged beetle).
 * It moves the way a slug does: it stretches out along the surface, then draws its tail up
 * behind it, a swell running down its body from tail to head. Instead of spikes it carries a
 * crest of ice that has half melted and flows: tendrils that curl back, sway and bead at the
 * tips. Two eye stalks feel ahead of it. The surface it clings to is row 20 of the cell.
 */
export function buildCrawlerSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 22, 16, 11);
  /** A tendril of the crest from (x, y), `len` long, leaning back and swaying by `sway`. */
  const tendril = (f: FormCanvas, x: number, y: number, len: number, sway: number) => {
    // it rises, leans back, then curls over like the lip of a wave, a bead hanging from the lip
    const mx = x - 1 + sway * 1, my = y - len * 0.6;
    const tx = mx - 2.2 + sway * 1.6, ty = my - len * 0.3;
    const bx = tx - 1.6 + sway * 0.6, by = ty + 1.3;
    f.next();
    f.limb(x, y, mx, my, 1.9, 1.3, ICE, 0.9, (u) => -0.4 + u * 0.22); // dark where it joins the body
    f.limb(mx, my, tx, ty, 1.3, 0.9, ICE, 1, () => -0.1);
    f.limb(tx, ty, bx, by, 0.9, 0.7, ICE);
    f.ball(bx, by + 0.6, 1, 1.1, ICE);
  };
  const draw = (ph: number) => {
    const f = new FormCanvas(32, 22);
    f.clipY = 20;
    const s = Math.sin(ph), stretch = 1 + 0.15 * s; // long while it surges, bunched while it gathers
    const x0 = 15 - 11 * stretch, x1 = 15 + 8.5 * stretch, n = 16;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      // a teardrop: a thin tail, a hump behind the middle, a blunt head; a swell rides along it
      const swell = 0.5 + 0.5 * Math.sin(u * 6.5 - ph);
      const r = ((1 + 4.6 * Math.pow(Math.sin(Math.min(1, u * 1.08) * Math.PI * 0.86 + 0.16), 0.9)) * (0.86 + 0.24 * swell)) / Math.sqrt(stretch);
      pts.push([x0 + (x1 - x0) * u, 20 - r * 0.72, r]);
    }
    // the foot: a pale frill along the floor that ripples as it glides
    for (let k = 0; k <= n; k += 2) f.ball(pts[k][0], 19.4, pts[k][2] * 0.45 + 1.6 + Math.sin(k * 1.3 - ph * 2) * 0.5, 1.2, SLUG_FOOT);
    // the body, wet and banded
    f.next();
    for (const [x, y, r] of pts) f.ball(x, y, r, r, SLUG);
    for (let k = 3; k < n - 2; k += 3) f.groove(pts[k][0], pts[k][1] - pts[k][2] * 0.5, pts[k][0] - 0.6, 19, -0.14);
    for (let k = 4; k < n - 3; k += 4) f.dot(pts[k][0] + 1, pts[k][1] - pts[k][2] * 0.55, SLUG, 0.99); // the shine on it
    // head: two eye stalks swaying ahead, two short feelers under them
    const [hx, hy] = pts[n];
    f.next();
    for (const [dx, lift, late, dim] of [[0.5, 6.4, 0.8, -0.2], [2.6, 5.6, 0, 0]]) {
      const sw = Math.sin(ph - late) * 1.2;
      f.bias = dim;
      f.limb(hx + dx * 0.4, hy - 1, hx + dx + 1.6 + sw, hy - lift, 0.9, 0.6, SLUG);
      f.bias = 0;
      f.dot(hx + dx + 1.8 + sw, hy - lift - 0.6, EYE_C, dim ? 0.6 : 0.95);
    }
    f.stroke(hx + 2, hy + 1.6, hx + 4 + Math.sin(ph) * 0.6, hy + 2.6, SLUG, 0.7);
    // the crest: half-melted ice flowing off its back
    for (let k = 0; k < 5; k++) {
      const [x, y, r] = pts[3 + k * 2];
      tendril(f, x, y - r * 0.7, 3.6 + (k % 2) * 1.6 + Math.sin(ph + k) * 0.5, Math.sin(ph - k * 1.1));
    }
    // meltwater running down its flank
    f.dot(pts[6][0] + 1, pts[6][1] + 1 + ((ph / (Math.PI * 2)) * 4) % 4, ICE, 0.9);
    return f.resolve({ contour: 0.14 });
  };
  // dropping from a ceiling: drawn up into a ball, the crest streaming above it
  const curled = () => {
    const f = new FormCanvas(32, 22);
    f.ball(15, 13, 7.4, 6.2, SLUG);
    f.groove(11, 10, 18, 17, -0.14);
    f.dot(13, 10, SLUG, 0.99);
    f.next();
    f.ball(20, 15, 3, 2.8, SLUG);
    f.dot(21, 14, EYE_C, 0.95);
    for (let k = 0; k < 5; k++) tendril(f, 10 + k * 2.4, 9 - Math.sin((k / 4) * Math.PI) * 2, 3.4 + (k % 2) * 1.4, 0.4 - k * 0.2);
    return f.resolve({ contour: 0.14 });
  };
  b.smooth('crawl', 3, ...cycle(12, (t) => draw(t * TAU)));
  b.add('drop', curled());
  return b;
}

// ================================================================ experimental enemies (0.4.0)
// Hookjaw, Mire Eel, Gloomcaster, Rot Ooze, Grave Grub, Gravehand. AI in game/enemies_extra.ts.

// ---------------------------------------------------------------- hookjaw

interface HookjawPose {
  step: number; // -1..1 stride
  arm: 'down' | 'wind' | 'throw'; // the hook arm (front)
  cleaver: 0 | 1 | 2; // 0 lowered, 1 raised, 2 chopped down in front
}
const HJ_SKIN = ramp('#1a1c1a', '#34403a', '#56685c', '#7e9282', '#a8bca8'); // drowned-grey flesh
const SACK = ramp('#2a2218', '#52442e', '#7e6c48', '#a89464', '#c8b684'); // the stitched hood
const LEATHER = ramp('#140c08', '#2a1c14', '#4a3424', '#6a4e36');
const BLOOD = ramp('#3a0810', '#7a1420', '#a82a30');

/**
 * The Hookjaw (redesigned in 0.24.1): a gaunt butcher, bent double under his own shoulders.
 * A stitched sack hides his head, all but the jaw: a great underslung jawbone with two tusks
 * that hook up past where his eyes should be. Long arms, a bloodied apron, a cleaver in the
 * back hand and a chained meat hook in the front one.
 */
export function buildHookjawSheet(): SheetBuilder {
  const b = new SheetBuilder(44, 42, 20, 22);
  const draw = (q: HookjawPose) => {
    const f = new FormCanvas(44, 42);
    const gx = 20, ground = 40;
    /** A two-part limb from `a` through joint `j` to `e`. */
    const bent = (a: V, j: V, e: V, r: number, ramp2: Ramp = HJ_SKIN) => {
      f.limb(a[0], a[1], j[0], j[1], r, r * 0.85, HJ_SKIN);
      f.limb(j[0], j[1], e[0], e[1], r * 0.85, r * 0.75, ramp2);
    };
    // legs: bent at the knee, lifting as he steps, in heavy boots
    const leg = (hipX: number, st: number, dim: number) => {
      const foot: V = [hipX + st * 4 - 0.5, ground - 1.6 - Math.max(0, st) * 1.2];
      const k = knee(hipX, 29, foot[0], foot[1], 6.2, 6.2, -1);
      f.bias = dim;
      f.next();
      bent([hipX, 29], k, foot, 2);
      f.next();
      f.limb(foot[0] - 1.6, foot[1] + 0.6, foot[0] + 3, foot[1] + 0.6, 1.4, 1.2, LEATHER);
      f.limb(k[0] * 0.3 + foot[0] * 0.7, k[1] * 0.3 + foot[1] * 0.7, foot[0], foot[1], 1.9, 1.7, LEATHER); // the boot's shaft
      f.bias = 0;
    };
    leg(gx - 2.5, -q.step, -0.24);
    // cleaver arm (behind): the hand is where the old sprite had it, so the chop still lands
    const cl = q.cleaver;
    const hand: V = cl === 0 ? [gx - 7, 28] : cl === 1 ? [gx - 9, 6] : [gx + 13, 26];
    const elbow: V = cl === 0 ? [gx - 8, 22] : cl === 1 ? [gx - 10, 13] : [gx + 5, 23];
    f.bias = -0.2;
    f.next();
    bent([gx - 2, 16], elbow, hand, 1.7, SACK); // forearm wrapped in rags
    f.bias = 0;
    f.next();
    // the cleaver: a broad nicked blade with a bright edge
    const dir: V = cl === 0 ? [0.1, 1] : cl === 1 ? [0.35, -0.94] : [1, 0.12], nrm: V = [-dir[1], dir[0]];
    const at = (k: number, w: number): V => [hand[0] + dir[0] * k + nrm[0] * w, hand[1] + dir[1] * k + nrm[1] * w];
    f.poly([at(2, -1), at(11, -1.5), at(11, 4.5), at(3, 4)], IRON, (x, y) => {
      const w = (x - hand[0]) * nrm[0] + (y - hand[1]) * nrm[1];
      return w > 3 ? 0.95 : 0.42 + w * 0.06;
    });
    f.dot(...at(9, 0.5), IRON, 0.1); // the hole to hang it by
    f.dot(...at(7, 3), BLOOD, 0.5);
    f.dot(...at(8, 4), BLOOD, 0.8);
    // torso: narrow hips, a rack of ribs, shoulders humped up above the head
    f.next();
    f.limb(gx, 28, gx + 1.5, 19, 3.4, 4.8, HJ_SKIN);
    f.ball(gx + 1, 15.5, 6.4, 4.6, HJ_SKIN);
    for (let k = 0; k < 3; k++) f.groove(gx + 1, 19 + k * 2, gx + 5, 18.4 + k * 2, -0.2);
    f.groove(gx - 3, 13.4, gx + 4, 12.6, 0.14);
    // a butcher's apron, stained, hung from a strap over one shoulder
    f.next();
    f.poly([[gx - 3.4, 23], [gx + 5.4, 22.4], [gx + 6.4, 34], [gx - 3, 34.6]], LEATHER, (x, y) => 0.5 + (x - gx) * 0.035 - (y - 23) * 0.015);
    f.stroke(gx - 3.4, 23, gx + 5.4, 22.4, LEATHER, 0.85);
    f.stroke(gx + 3, 22.6, gx - 1, 13, LEATHER, 0.5);
    for (const [x, y] of [[gx + 2, 27], [gx + 3, 28], [gx + 2, 29], [gx - 1, 31], [gx + 4, 32]]) f.dot(x, y, BLOOD, 0.5);
    leg(gx + 2.5, q.step, 0);
    // the head, thrust forward and low: a stitched sack with one eyehole
    const hx = gx + 8.5, hy = 12.5;
    f.next();
    f.limb(gx + 4, 14, hx - 2, hy + 1, 2.6, 2.4, HJ_SKIN); // neck
    f.next();
    f.ball(hx, hy - 1, 4, 3.8, SACK);
    f.groove(hx - 1, hy - 4.6, hx - 0.4, hy + 1.6, -0.22); // a seam, cross-stitched
    for (let k = 0; k < 3; k++) f.groove(hx - 2, hy - 3.4 + k * 2, hx + 0.6, hy - 3.4 + k * 2, -0.14);
    f.dot(hx + 1.8, hy - 1.6, DARK, 0);
    f.dot(hx + 2.6, hy - 1.6, EYE_Y, 0.6);
    f.stroke(hx - 3, hy + 2, hx + 2.4, hy + 2.2, LEATHER, 0.3); // the cord that ties it at his throat
    // the jaw: a heavy underslung bone jutting past the sack, two tusks hooking up from it
    f.next();
    f.bias = -0.12;
    f.limb(hx, hy + 3.2, hx + 4.8, hy + 3.4, 1.6, 1.2, BONE);
    f.bias = 0;
    f.stroke(hx + 1, hy + 2.2, hx + 4, hy + 2.2, DARK, 0.3); // the dark of his mouth, pegs of teeth in it
    f.dot(hx + 2, hy + 2.2, BONE, 0.95);
    f.dot(hx + 3.4, hy + 2.2, BONE, 0.95);
    f.next();
    f.limb(hx + 4.8, hy + 2.8, hx + 5.8, hy + 0.2, 0.9, 0.6, BONE);
    f.limb(hx + 5.8, hy + 0.2, hx + 4.8, hy - 1.6, 0.6, 0.3, BONE);
    f.limb(hx + 0.8, hy + 2.4, hx + 1, hy + 0.6, 0.7, 0.3, BONE);
    // a loop of chain over the shoulder
    for (let k = 0; k < 6; k++) f.dot(gx - 5 + k * 2, 13 + Math.abs(k - 2.5) * 1.5, IRON, k % 2 ? 0.9 : 0.6);
    // hook arm (front), ending where the chain is thrown from
    f.next();
    if (q.arm === 'down') {
      bent([gx + 4, 15], [gx + 5.4, 21], [gx + 8, 25], 1.9, SACK);
      f.stroke(gx + 8, 25, gx + 9, 31, IRON, 0.4); // the hook hanging on a short chain
      f.stroke(gx + 9, 31, gx + 12, 32, IRON, 0.8, 1.5);
      f.stroke(gx + 12, 32, gx + 13, 29, IRON, 0.8, 1.5);
    } else if (q.arm === 'wind') {
      bent([gx + 4, 15], [gx + 1, 9], [gx - 4, 8], 1.9, SACK);
      f.stroke(gx - 4, 8, gx - 12, 4, IRON, 0.4); // chain whirled over the head
      f.stroke(gx - 12, 4, gx - 15, 1, IRON, 0.8, 1.5);
      f.stroke(gx - 15, 1, gx - 13, -1, IRON, 0.8, 1.5);
    } else bent([gx + 4, 15], [gx + 9, 16.5], [gx + 15, 15], 1.9, SACK);
    return f.resolve({ contour: 0.2 });
  };
  b.smooth('walk', 2, ...cycle(8, (t) => draw({ step: Math.sin(t * TAU), arm: 'down', cleaver: 0 })));
  b.add('wind', draw({ step: 0, arm: 'wind', cleaver: 0 }));
  b.add('throw', draw({ step: 0.5, arm: 'throw', cleaver: 0 }));
  b.add('chop', draw({ step: 0, arm: 'down', cleaver: 1 }), draw({ step: 1, arm: 'down', cleaver: 2 }));
  return b;
}

// ---------------------------------------------------------------- devourer

interface DevourerPose {
  step: number; // -1..1 stride
  /**
   * Tentacles: undefined = walking on them; 'coil' = drawn in tight under it (the whirl's
   * warning); a number = whirling round, flung out flat, turned by that many radians.
   */
  whirl?: 'coil' | number;
  /** How far the body's two halves gape (radians, 0 = shut). */
  open: number;
  /** The whole body tipped forward (+) or back (-), radians. A bite pitches it mouth-down. */
  pitch?: number;
  /** Where the body's hinge (the back of the mouth) sits, if not the standing spot. */
  hinge?: V;
  /** The barbed tongue (its "hook") curled out of its mouth, getting ready to lash. */
  tongueOut?: boolean;
  /** Phase (0..1) of the ripple running down every tentacle as it walks. */
  slither?: number;
  /** Phase (0..1) of its front tentacles thrashing in the air (while it has her in its jaws). */
  flail?: number;
}

/** The Devourer's cell is this much wider on each side than its body needs, to hold the whirl. */
const DEV_PAD = 26;

const DEV_R = 14; // the body's radius: the whole body is the mouth
const D_SKIN = ramp('#1a141e', '#362c3a', '#5e5262', '#857688', '#aa9aac');
const D_BELLY = ramp('#342a2a', '#5a4c4c', '#8a7a78', '#b2a29e');
const D_LEG = ramp('#140e18', '#2e2434', '#56485e', '#786a82');
const GUM = ramp('#4a0c18', '#8a1c2c', '#b83a48');
const MOUTH = ramp('#12040a', '#2a0610');
const TONGUE = ramp('#7a2030', '#c04050', '#e4788a');
const SUCKER = ramp('#6a5660', '#a89098');
const EYE_O = ramp('#a03010', '#ff5a30', '#ffc0a0');

/**
 * The Devourer: nothing but a great round mouth on tentacles. Up close it spins and lashes
 * its tentacles out flat, far past its body (`whirl`). Its "hook" is its long barbed tongue
 * (the HookChain, drawn as tongue). The top and bottom halves of its body are its jaws, hinged
 * at the back. Its `bite` frames tip the whole body forward, mouth down, over the spot where
 * the hero's head is when she's held BITE_DX (16 px) in front of it, and are drawn over her.
 * AI in game/enemies_extra.ts.
 */
export function buildDevourerSheet(): SheetBuilder {
  const b = new SheetBuilder(64 + DEV_PAD * 2, 58, 28 + DEV_PAD, 34); // feet 22: the ground is row 56
  const draw = (q: DevourerPose) => {
    const f = new FormCanvas(64 + DEV_PAD * 2, 58);
    const gx = 26 + DEV_PAD, G = 56, R = DEV_R;
    const pitch = q.pitch || 0;
    const [hx, hy] = q.hinge ? [q.hinge[0] + DEV_PAD, q.hinge[1]] : [gx - 12, 30]; // hinges are given in the old 64-wide cell
    /** A point given in the body's own frame (x forward from the hinge, y down), turned by `a`. */
    const at = (lx: number, ly: number, a: number): V => [hx + lx * Math.cos(a) - ly * Math.sin(a), hy + lx * Math.sin(a) + ly * Math.cos(a)];
    const upA = pitch - q.open, lowA = pitch + q.open;
    /** One half of the round body (a half disk on the hinge line). */
    const half = (upper: boolean, a: number) => {
      const pts: V[] = [];
      for (let k = 0; k <= 16; k++) {
        const th = (upper ? Math.PI : 0) + (k / 16) * Math.PI;
        pts.push(at(R + R * Math.cos(th), R * Math.sin(th), a));
      }
      return pts;
    };
    /** A tapering tentacle through `pts`. */
    const tentacle = (pts: V[], w0: number, r: Ramp, dim: number, suckers: boolean) => {
      const n = pts.length - 1;
      f.bias = dim;
      f.next();
      for (let i = 1; i <= n; i++) f.limb(...pts[i - 1], ...pts[i], Math.max(0.5, (w0 / 2) * (1 - (i - 1) / (n + 4))), Math.max(0.5, (w0 / 2) * (1 - i / (n + 4))), r);
      f.bias = 0;
      if (suckers) for (let i = 3; i < n - 1; i += 3) f.dot(pts[i][0], pts[i][1] + 1, SUCKER, 0.8);
    };
    const center = at(R, 0, pitch); // middle of the body, for the legs and arms
    // tentacle legs: a row of them along its underside, each a tapering S-curve that bows
    // out past the body, comes back in and curls its tip against the floor. They turn with
    // the body, so when it tips forward to bite they sprout from its back, behind her, and
    // reach down to the floor. `step` sways them, back to front. Coiled, they're drawn in
    // under it; whirling, only the back row stands and the front row is flung out (`flung`).
    const LEGS = 8;
    const whirling = typeof q.whirl === 'number';
    const spread = q.whirl === 'coil' ? 16 : whirling ? 26 : 40; // how far apart the feet stand
    for (const back of [true, false]) {
      if (!back && whirling) continue;
      for (let k = back ? 1 : 0; k < LEGS; k += 2) {
        const u = k / (LEGS - 1); // 0 = rear leg .. 1 = front leg
        const lx = R + (u - 0.5) * R * 1.4;
        const hip = at(lx, Math.sqrt(R * R - (lx - R) ** 2) * 0.75, pitch);
        const sway = Math.sin(u * Math.PI * 2 + q.step * Math.PI);
        const out = u < 0.5 ? -1 : 1;
        const foot: V = [gx + 2 + (u - 0.5) * spread + sway * 2.5, G - 1];
        // control points: bow outward and up first, then sweep back down to the foot
        const c1: V = [hip[0] + out * ((q.whirl === 'coil' ? 2 : 6) + Math.abs(u - 0.5) * 10) + sway * 2, hip[1] - 2];
        const c2: V = [foot[0] - out * 5 - sway * 3, foot[1] - 9];
        const n = 14, pts: V[] = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n, v = 1 - t;
          // a ripple runs down each tentacle from the hip to the tip, each one out of step
          // with its neighbors, strongest in the middle of its length
          const rip = q.slither === undefined ? 0 : Math.sin(t * 7 - q.slither * TAU + k * 1.9) * 2.2 * Math.sin(t * Math.PI * 0.9);
          pts.push([
            v * v * v * hip[0] + 3 * v * v * t * c1[0] + 3 * v * t * t * c2[0] + t * t * t * foot[0] + rip,
            v * v * v * hip[1] + 3 * v * v * t * c1[1] + 3 * v * t * t * c2[1] + t * t * t * foot[1] + rip * 0.25,
          ]);
        }
        pts.push([foot[0] + out * 2.5, foot[1] - 2]); // the tip curls up and outward off the floor
        if (q.flail !== undefined && !back) {
          // feeding: this one lets go of the floor and thrashes in the air, coiling and
          // snapping straight, each out of time with the others
          const w = q.flail * TAU + k * 2.1, reachOut = 15 + Math.sin(w) * 5;
          const up = -0.9 + Math.sin(w + 1) * 0.9; // from straight out to reaching overhead
          const aim = out > 0 ? up : Math.PI - up;
          pts.length = 0;
          for (let i = 0; i <= 12; i++) {
            const t = i / 12, curl = Math.sin(w + t * 4) * 1.4 * t; // the curl travels out to the tip
            const ang = aim + curl;
            const prev: V = i ? pts[i - 1] : hip;
            pts.push(i ? [prev[0] + Math.cos(ang) * (reachOut / 12) * 1.6, prev[1] + Math.sin(ang) * (reachOut / 12) * 1.6] : hip);
          }
        }
        tentacle(pts, back ? 2.6 : 3, D_LEG, back ? -0.26 : 0, !back);
      }
    }
    /**
     * Whirling: six tentacles flung out flat as it spins, seen side-on. Each one's angle round
     * the spin sets how far it reaches left or right (cos) and whether it's on the near side
     * of the body (sin > 0, drawn over it) or the far side (drawn behind, darker). Each
     * trails a bend against the spin.
     */
    const flung = (near: boolean) => {
      if (!whirling) return;
      for (let i = 0; i < 6; i++) {
        const a = (q.whirl as number) + (i * Math.PI) / 3;
        if (Math.sin(a) > 0 !== near) continue;
        const y0 = center[1] + 5 + ((i % 3) - 1) * 3;
        const root: V = [center[0] + Math.cos(a) * R * 0.5, y0];
        const tip: V = [center[0] + Math.cos(a) * 50, y0 + 4 + ((i % 2) * 2 - 1) * 3]; // flung far out past the body
        const bend = Math.sin(a) * 11; // trailing against the spin
        const mid: V = [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2 - bend];
        const n = 16, pts: V[] = [];
        for (let j = 0; j <= n; j++) {
          const t = j / n, v = 1 - t;
          pts.push([v * v * root[0] + 2 * v * t * mid[0] + t * t * tip[0], v * v * root[1] + 2 * v * t * mid[1] + t * t * tip[1]]);
        }
        pts.push([tip[0] + Math.cos(a) * 2.5, tip[1] - 3 * Math.sin(a) - 1]); // the tip whips round
        tentacle(pts, 5, D_LEG, near ? 0 : -0.26, near);
      }
    };
    flung(false);
    // the inside of the mouth, between the halves
    if (q.open > 0.02) {
      f.next();
      f.poly([at(-1, 0, pitch), at(2 * R + 1, 0, upA), at(2 * R + 1, 0, lowA)], MOUTH, 0.6);
      if (q.open > 0.3) f.limb(...at(3, 1, pitch), ...at(2 * R - 5, 1, lowA - 0.15), 1.4, 1, TONGUE);
    }
    if (q.tongueOut) {
      // the tongue curled out past its teeth and up over its head, barb first
      const pts: V[] = [at(4, 1, pitch), at(2 * R + 4, 2, pitch), at(2 * R + 8, -4, pitch), at(2 * R + 4, -12, pitch), at(2 * R - 4, -R - 4, pitch)];
      f.next();
      for (let k = 1; k < pts.length; k++) f.limb(...pts[k - 1], ...pts[k], 1.6 - k * 0.15, 1.5 - k * 0.15, TONGUE);
      const tip = pts[pts.length - 1];
      f.poly([[tip[0] - 3, tip[1] + 1], [tip[0] - 1, tip[1] - 4], [tip[0] + 2, tip[1] + 1]], BONE, 0.9); // the barb
    }
    // the lower jaw: a pale, scarred belly. The upper: the hide, a ridge of bony knobs, the eyes.
    // Both are halves of one ball, so they are lit as one.
    const lit = round(center[0], center[1], R);
    f.next();
    f.poly(half(false, lowA), D_BELLY, lit);
    for (let k = 0; k < 3; k++) f.groove(...at(R - 6 + k * 4, 5, lowA), ...at(R - 4 + k * 4, 10, lowA), -0.2); // old scars
    f.stroke(...at(1, 0.6, lowA), ...at(2 * R - 1, 0.6, lowA), GUM, 0.5, 1.4);
    for (let k = 3; k < 2 * R - 1; k += 3) f.stroke(...at(k, -0.5, lowA), ...at(k + 0.8, -3, lowA), BONE, 0.9); // teeth point up
    f.next();
    f.poly(half(true, upA), D_SKIN, lit);
    for (let k = 2; k < 15; k += 3) {
      const th = Math.PI + (k / 16) * Math.PI;
      const [x, y] = at(R + (R - 3) * Math.cos(th), (R - 3) * Math.sin(th), upA);
      f.groove(x, y, x, y, 0.2);
      f.groove(x, y + 1, x, y + 1, -0.16);
    }
    f.stroke(...at(1, -0.6, upA), ...at(2 * R - 1, -0.6, upA), GUM, 0.5, 1.4);
    for (let k = 2; k < 2 * R - 1; k += 3) f.stroke(...at(k, 0.5, upA), ...at(k + 0.8, 3, upA), BONE, 0.9); // teeth point down
    for (const [ex, ey] of [[2 * R - 7, -6], [2 * R - 11, -8.5], [2 * R - 4, -3]]) {
      const [x, y] = at(ex, ey, upA);
      f.dot(x, y, EYE_O, 0.6);
      f.dot(x + 1, y, EYE_O, 0.95);
    }
    flung(true);
    return f.resolve({ contour: 0.16 });
  };
  b.smooth('walk', 2, ...cycle(8, (t) => draw({ step: Math.sin(t * TAU), open: 0.03 + 0.02 * Math.sin(t * TAU * 2), slither: t })));
  // rears back with its tongue curled out, then lashes it (the tongue itself is the HookChain)
  b.add('wind', draw({ step: 0, open: 0.35, pitch: -0.2, hinge: [13, 31], tongueOut: true }));
  b.add('throw', draw({ step: 0.5, open: 0.45, pitch: 0.1 }));
  // the whirl: tentacles drawn in tight (the warning), then flung out flat as it spins
  b.add('coil', draw({ step: 0, open: 0.1, whirl: 'coil', hinge: [14, 33] }));
  b.add('whirl', ...[0, 1, 2, 3].map((k) => draw({ step: 0, open: 0.2, whirl: (k * Math.PI) / 6, hinge: [14, 27] })));
  // waiting for her: the whole body gapes open
  b.add('jaws', draw({ step: 0.5, open: 0.75, pitch: 0.15 }));
  // tipped forward and mouth down over her head, its front tentacles thrashing: four frames
  // of chewing (a crack open), then four clamped shut (Devourer.special picks the half)
  const biteHinge: V = [31, 7];
  b.add('bite',
    ...cycle(4, (t) => draw({ step: 0.5, open: 0.18, pitch: 1.05, hinge: biteHinge, flail: t })),
    ...cycle(4, (t) => draw({ step: 0.5, open: 0.04, pitch: 1.05, hinge: biteHinge, flail: t })));
  b.add('reel', draw({ step: -1, open: 0.5, pitch: -0.35, hinge: [12, 30] }));
  return b;
}

// ---------------------------------------------------------------- mire eel

const EEL = ramp('#1c1c14', '#3a3a2c', '#5a5a48', '#7a7a60', '#9c9c7e');
const EEL_BELLY = ramp('#7a765c', '#c8c4a8', '#eeeacc');
const GILL = ramp('#601c1c', '#a04040');

export function buildEelSheet(): SheetBuilder {
  const b = new SheetBuilder(52, 22, 26, 11);
  const draw = (ph: number, bite: number) => {
    const f = new FormCanvas(52, 22);
    const cy = 11, n = 22;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n; // 0 tail .. 1 head
      pts.push([4 + u * 38, cy + Math.sin(u * 7 - ph) * 3.5 * (1 - u * 0.8), 1.2 + Math.sin(u * Math.PI * 0.85) * 3.6]);
    }
    // ribbon fin along the back
    for (let k = 1; k <= n; k++) f.limb(pts[k - 1][0], pts[k - 1][1] - pts[k - 1][2] - 0.6, pts[k][0], pts[k][1] - pts[k][2] - 0.6, 1, 1, EEL, 0.5, () => (k % 3 ? 0 : -0.2));
    // the body: one long muscle, dark on top and pale underneath
    f.next();
    for (const [x, y, r] of pts) f.ball(x, y, r, r, EEL);
    f.next();
    for (let k = 1; k <= n; k++) {
      const [x0, y0, r0] = pts[k - 1], [x1, y1, r1] = pts[k];
      if (r0 > 1.5 && r1 > 1.5) f.limb(x0, y0 + r0 * 0.62, x1, y1 + r1 * 0.62, r0 * 0.36, r1 * 0.36, EEL_BELLY, 0.6);
    }
    // head with a wide, needle-toothed mouth
    const [hx, hy] = pts[n], open = bite * 4;
    f.next();
    f.limb(hx - 1.5, hy + 2, hx + 6.4, hy + 2 + open, 1.4, 1, EEL_BELLY);
    f.next();
    f.limb(hx - 1.5, hy - 1, hx + 7, hy - 1 - open * 0.5, 2, 1.2, EEL);
    if (bite) {
      f.stroke(hx + 0.5, hy + 0.4, hx + 6.5, hy + open * 0.5, DARK, 0.2);
      for (let k = 0; k < 3; k++) {
        f.dot(hx + 1 + k * 2, hy - 1 + (k ? 0 : 1), BONE, 0.95);
        f.dot(hx + 1 + k * 2, hy + open, BONE, 0.95);
      }
    }
    f.stroke(hx - 3, hy - 2, hx - 3, hy + 2, GILL, 0.6);
    f.dot(hx + 2, hy - 2, BONE, 0.99); // a milky blind eye
    return f.resolve();
  };
  b.smooth('swim', 2, ...cycle(8, (t) => draw(t * TAU, 0)));
  b.add('bite', draw(0.8, 1));
  return b;
}

// ---------------------------------------------------------------- gloomcaster

const C_ROBE = ramp('#08060e', '#16101e', '#2a2238', '#4a3a5e', '#6a5884');
const C_SKIN = ramp('#5a4a50', '#a8a098', '#d0c8c0');
const HEX = ramp('#5a1a8a', '#c060ff', '#f0c8ff', '#ffffff'); // its magic
const WOOD = ramp('#1e140c', '#4a3424', '#6a4e36', '#8a6c4c');
const GILT = ramp('#6a4c14', '#c89838', '#ffe890');

/**
 * The Gloomcaster (0.24.2): a thin figure in a narrow gown that widens only at the hem, where
 * it breaks into points hung with beaded tassels. A peaked hood, a short pointed mantle,
 * sleeves that trail to a point, a sash with long ends: everything on it hangs and sways.
 */
export function buildCasterSheet(): SheetBuilder {
  const b = new SheetBuilder(36, 44, 16, 22);
  /** `t`: where it is in its loop (0..1): the hem and tassels sway, the orb pulses, sparks drift round it. */
  const draw = (t: number, cast: boolean) => {
    const f = new FormCanvas(36, 44);
    const cx = 15, top = 5, ground = 40, a = t * TAU;
    const pulse = 0.5 - 0.5 * Math.cos(a);
    const wave = (k: number) => Math.sin(a - k * 0.9);
    /** A flat pointed strip of cloth. */
    const pennant = (pts: V[], lit: number) => f.poly(pts, C_ROBE, lit);
    // the staff: gnarled wood bound in gilt, its head a claw of two horns cradling the orb,
    // a charm swinging from it on a thread
    const sx = cx + 10, sy = cast ? top + 5 : top + 9, oy = sy - 4;
    f.limb(sx + 0.6, sy + 2, sx - 0.4, sy + 14, 0.9, 1, WOOD);
    f.limb(sx - 0.4, sy + 14, sx - 1, ground - 1, 1, 0.7, WOOD);
    f.dot(sx, sy + 8, GILT, 0.6);
    f.dot(sx - 1, sy + 8, GILT, 0.95);
    f.dot(sx, sy + 20, GILT, 0.6);
    f.next();
    f.limb(sx, sy + 1, sx - 3.4, sy - 2, 1, 0.8, WOOD);
    f.limb(sx - 3.4, sy - 2, sx - 2.4, sy - 6.4, 0.8, 0.3, WOOD);
    f.limb(sx, sy + 1, sx + 3.2, sy - 2.4, 1, 0.8, WOOD);
    f.limb(sx + 3.2, sy - 2.4, sx + 2, sy - 6.6, 0.8, 0.3, WOOD);
    f.stroke(sx + 2.6, sy - 0.6, sx + 3.2 + Math.sin(a) * 0.8, sy + 3, GILT, 0.3);
    f.dot(sx + 3.2 + Math.sin(a) * 0.8, sy + 4, HEX, 0.6);
    f.next();
    f.disc(sx, oy, (cast ? 3 : 2.2) + pulse * 0.7, HEX, 0.3);
    f.disc(sx, oy, (cast ? 1.9 : 1.2) + pulse * 0.5, HEX, 0.6);
    f.dot(sx, oy, HEX, 0.99);
    // the sash's long ends, trailing behind
    f.next();
    f.limb(cx - 2, top + 18, cx - 5.6 + wave(1) * 1.2, top + 25, 0.8, 0.6, GILT);
    f.limb(cx - 5.6 + wave(1) * 1.2, top + 25, cx - 7.4 + wave(2) * 2, top + 31, 0.6, 0.3, GILT);
    f.limb(cx - 1.4, top + 18, cx - 3.4 + wave(0) * 1, top + 27, 0.7, 0.3, GILT);
    // the gown: narrow all the way down, widening only at the hem, which breaks into points
    const hem: V[] = [];
    for (let k = 0; k <= 8; k++) hem.push([cx - 8 + k * 2.3 + wave(k) * 1.2, ground - 4 - (k % 2 ? 0 : 3) - Math.max(0, wave(k)) * 1.4]);
    const waistY = top + 17, span = ground - waistY;
    f.next();
    f.poly([[cx - 2.6, waistY], [cx + 3, waistY], ...hem.slice().reverse()], C_ROBE, (x, y) => {
      const d = (y - waistY) / span, u = (x - cx) / (3 + d * 7); // -1..1 across the cloth at this height
      return 0.46 + u * 0.2 + Math.sin(u * 6 + a * 0.5) * 0.13 * d; // folds that deepen toward the hem
    });
    for (let k = 1; k <= 7; k += 2) f.groove(cx - 1.6 + k * 0.5, waistY + 3, hem[k][0], hem[k][1] - 1, -0.16);
    // a beaded tassel hangs from each point of the hem and swings behind it
    for (let k = 1; k <= 7; k += 2) {
      const [x, y] = hem[k], sw = wave(k + 1.5) * 1.6;
      f.stroke(x, y, x + sw * 0.5, y + 2, GILT, 0.5);
      f.stroke(x + sw * 0.5, y + 2, x + sw, y + 3.6, GILT, 0.3);
      f.dot(x + sw, y + 4.4, HEX, cast ? 0.9 : 0.6);
    }
    // a thin body, the sash knotted at its waist, a stitched sigil on its chest
    f.next();
    f.limb(cx + 0.4, top + 9.5, cx + 0.2, waistY + 0.6, 2.8, 2.7, C_ROBE);
    f.stroke(cx - 2.6, waistY, cx + 3, waistY - 0.4, GILT, 0.6);
    f.dot(cx + 1, top + 13, HEX, cast ? 0.9 : 0.4);
    f.dot(cx, top + 14, HEX, cast ? 0.6 : 0.3);
    f.dot(cx + 2, top + 14, HEX, cast ? 0.6 : 0.3);
    // a short mantle over the shoulders, cut in points
    f.next();
    pennant([[cx - 3.6, top + 8], [cx + 4.4, top + 8], [cx + 5.4, top + 12], [cx + 3, top + 10.8], [cx + 1.6, top + 13.4], [cx, top + 11], [cx - 1.8, top + 13.2], [cx - 2.8, top + 10.8], [cx - 4.8, top + 12.4]], 0.68);
    // a peaked hood, its long tip falling down the back, and a pale hollow-eyed face in it
    f.next();
    f.limb(cx - 1.4, top + 1.4, cx - 6.2 + wave(0) * 0.8, top + 3.4, 2, 0.6, C_ROBE);
    f.limb(cx - 6.2 + wave(0) * 0.8, top + 3.4, cx - 7.8 + wave(1) * 1.4, top + 8, 0.6, 0.2, C_ROBE);
    f.ball(cx + 1, top + 4.2, 4.6, 4.8, C_ROBE);
    f.dot(cx - 7.8 + wave(1) * 1.4, top + 9, HEX, 0.6); // a bead on the hood's tip
    f.next();
    f.ball(cx + 3, top + 5, 2.3, 3, C_SKIN);
    f.dot(cx + 3, top + 4, DARK, 0);
    f.dot(cx + 4, top + 4, cast ? HEX : DARK, cast ? 0.7 : 0);
    f.dot(cx + 3, top + 7, C_SKIN, 0.1);
    // thin arms in sleeves that trail to a point: one on the staff, the other raised when casting
    f.next();
    f.limb(cx + 2, top + 10, sx, sy + 4, 1.2, 1, C_ROBE);
    pennant([[cx + 5, top + 10.6 + (sy + 4 - top - 10) * 0.4], [sx - 0.4, sy + 5], [sx - 3 + wave(2), sy + 12]], 0.4);
    f.ball(sx, sy + 4, 1.3, 1.3, C_SKIN);
    f.next();
    if (cast) {
      f.limb(cx - 1, top + 10, cx - 6, top + 3, 1.2, 1, C_ROBE);
      pennant([[cx - 2.4, top + 9.4], [cx - 5.6, top + 4.4], [cx - 8.4 + wave(3), top + 11]], 0.36);
      f.ball(cx - 6.4, top + 1, 1.4, 1.4, C_SKIN);
      f.disc(cx - 6.4, top - 1.6, 2.2 + pulse * 0.6, HEX, 0.35);
      f.dot(cx - 6.4, top - 1.6, HEX, 0.8);
    } else {
      f.limb(cx - 1, top + 10, cx - 3, top + 17.4, 1.2, 1, C_ROBE);
      pennant([[cx - 2.4, top + 13], [cx - 2.4, top + 18], [cx - 5 + wave(3), top + 23]], 0.36);
    }
    const p = f.resolve({ contour: 0.14 });
    // sparks: motes circling the orb and drifting up off the gown, each twinkling in its turn
    // (drawn after the outline, so they are bare points of light)
    const spark = (x: number, y: number, ph: number) => {
      const tw = Math.sin(a * 2 + ph);
      if (tw < -0.3) return;
      x = Math.round(x);
      y = Math.round(y);
      p.set(x, y, tw > 0.5 ? HEX[3] : HEX[2]);
      if (tw > 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(x + dx, y + dy, HEX[1]);
    };
    const n = cast ? 7 : 4;
    for (let k = 0; k < n; k++) {
      const o = a + (k / n) * TAU, r = (cast ? 6.5 : 5) + (k % 2) * 2;
      spark(sx + Math.cos(o) * r, oy + Math.sin(o) * r * 0.8, k * 1.7);
    }
    for (let k = 0; k < (cast ? 6 : 3); k++) {
      const rise = (t + k / 3) % 1;
      spark(cx - 8 + ((k * 7.3) % 18) + Math.sin(a + k) * 1.5, ground - 6 - rise * 22, k * 2.3 + 1);
    }
    return p;
  };
  b.smooth('idle', 4, ...cycle(8, (t) => draw(t, false)));
  b.smooth('cast', 4, ...cycle(8, (t) => draw(t, true)));
  return b;
}
