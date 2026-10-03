// The twin hunters, Anzel and Vesna, as form-shaded puppets (Anzel 0.23.0, Vesna 0.25.0).
// Both sheets have the same animation names and frames, so the game treats them alike.
//
// The skeleton and its `Pose` are the old rig's (a hip, a leaning spine, two legs and two arms
// given as joint angles), so every pose the game already had still means the same thing. On it:
//   - they are drawn as shaded volumes in hand-picked ramps (form.ts), not flat lines
//   - animations are poses computed from a clock, so there are in-betweens: a breathing idle
//     with a blink, 12-frame walk and sprint cycles, a wind-up and a follow-through on every
//     whip stroke, a three-stage jump and landing
//   - coat, scarf and hair are loose things that trail behind the motion
//   - the double jump's somersault is drawn turned (12 frames), not rotated by the GPU
// They are twins, and dressed apart (`Look`): Anzel in a slate-blue coat with two tails and
// short swept-back hair; Vesna slighter, in a crimson jacket with a flared skirt, boots to the
// thigh, and a long ponytail that streams behind her the way his scarf does.
// The cell (48x48), the anchor and the feet line are the old ones, so hitboxes and the whip's
// hand point (`meta.hand`) work as before. Everything faces right.
import { SheetBuilder } from './pixel';
import { FormCanvas, ramp, Ramp, turned, V } from './form';
import { Pose, HERO_W, HERO_H, HERO_AX, HERO_AY, ATTACK_DIRS } from './art_chars';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// Each material, deep shadow to highlight.
const SKIN = ramp('#5c3432', '#8e584a', '#bc8468', '#e2ae90', '#f8d6b8');
const HAIR = ramp('#46445c', '#7a7690', '#b4b0c6', '#dcdaea', '#fbfaff');
const SCARF = ramp('#5c3608', '#9a6a18', '#d8a030', '#f6cc5a', '#fff2a8');
const GLOVE = ramp('#2a180e', '#4a301c', '#6e4a2c', '#96683e');
const BAND = ramp('#5a0e1a', '#8a1c2a', '#b83040', '#de5a62'); // the red band both wear in their hair
const BELT = ramp('#140c08', '#2e1c10', '#4a3018');
const GOLD = ramp('#8a6018', '#d8c070', '#fff4b0');
const INK = ramp('#160c14', '#2a1a24');

/** What sets one twin apart from the other. Heights are shared, so the hitbox fits both. */
interface Look {
  /** Vesna's cut: the flared skirt, thigh boots, ponytail and softer face. */
  her: boolean;
  coat: Ramp;
  pants: Ramp;
  boot: Ramp;
  /** Half widths at the shoulders and waist, and how thick the arms and legs are. */
  sw: number;
  ww: number;
  arm: number;
  leg: number;
}
const ANZEL: Look = {
  her: false,
  coat: ramp('#0a1020', '#15203c', '#243860', '#3c588c', '#6688bc', '#a0bce2'),
  pants: ramp('#12101a', '#201d2c', '#322e44', '#4a4660'),
  boot: ramp('#160c08', '#2a180e', '#44291a', '#62402a', '#845c3c'),
  sw: 4.1, ww: 3.2, arm: 1.8, leg: 2,
};
const VESNA: Look = {
  her: true,
  coat: ramp('#1a050c', '#360c16', '#5a1624', '#84283a', '#b04a58', '#dc8a90'),
  pants: ramp('#100c16', '#1c1826', '#2c2638', '#423c52'),
  boot: ramp('#120a08', '#24140e', '#3a2218', '#563626', '#785038'),
  sw: 3.5, ww: 2.7, arm: 1.55, leg: 1.85,
};

// their build, in pixels (the old rig's heights)
const THIGH = 7, SHIN = 7, TORSO = 11, UPPER = 6, FORE = 6;

/** The old pose, plus what the loose parts of him are doing. */
export interface HunterPose extends Pose {
  /** Turn the whole figure about his middle (radians): the somersault. */
  spin?: number;
  /** Which way the scarf and hair stream, as a direction (default: hanging down his back). */
  wind?: V;
  /** Eyes shut. */
  blink?: boolean;
}

const dirv = (a: number): V => [Math.sin(a * DEG), Math.cos(a * DEG)];

/** Draw one of the twins in one pose. Returns the drawing and where the whip hand ended up in the cell. */
export function hunter(q: HunterPose, L: Look = ANZEL): { f: FormCanvas; hand: V } {
  const f = new FormCanvas(HERO_W, HERO_H);
  // everything is drawn through `d`, so a spin turns the whole figure about his middle
  const PX = 24, PY = q.spin === undefined ? 31 : 25; // a somersault turns about the cell's middle, so nothing leaves it
  const d = turned(f, PX, PY, q.spin || 0, false);
  const C = (p: V): V => [p[0] - PX, p[1] - PY];
  const limb = (a: V, b: V, r0: number, r1: number, r: Ramp, flat = 1) => d.limb(C(a), C(b), r0, r1, r, flat);
  const ball = (p: V, rx: number, ry: number, r: Ramp, flat = 1) => d.ball(p[0] - PX, p[1] - PY, rx, ry, r, flat);
  const stroke = (a: V, b: V, r: Ramp, lit: number, thick = 1) => d.stroke(C(a), C(b), r, lit, thick);
  const dot = (p: V, r: Ramp, lit: number) => d.dot(p[0] - PX, p[1] - PY, r, lit);
  const groove = (a: V, b: V, by: number) => d.groove(C(a), C(b), by);

  const hip: V = [q.hx, q.hy];
  const up: V = [Math.sin(q.lean * DEG), -Math.cos(q.lean * DEG)]; // along his spine
  const n: V = [Math.cos(q.lean * DEG), Math.sin(q.lean * DEG)]; // out of his chest
  const sh: V = [hip[0] + up[0] * TORSO, hip[1] + up[1] * TORSO];
  const headC: V = [sh[0] + up[0] * 4.5, sh[1] + up[1] * 4.5 + (q.headDy || 0)];
  const wind: V = q.wind || [-0.35, 0.94];
  const flare = q.coat || 0, lift = q.hair || 0, wave = q.scarf || 0;

  const leg = (lg: V, off: number, dim: number) => {
    const h: V = [hip[0] + off, hip[1]];
    const d1 = dirv(lg[0]), d2 = dirv(lg[0] - lg[1]);
    const k: V = [h[0] + d1[0] * THIGH, h[1] + d1[1] * THIGH];
    const foot: V = [k[0] + d2[0] * SHIN, k[1] + d2[1] * SHIN];
    const cuff: V = [k[0] + d2[0] * SHIN * 0.12, k[1] + d2[1] * SHIN * 0.12]; // where the boot starts, just under the knee
    const heel: V = [foot[0] - d2[0] * 1.2, foot[1] - d2[1] * 1.2];
    f.bias = dim;
    f.next();
    limb(h, k, L.leg, L.leg * 0.85, L.pants);
    limb(k, cuff, L.leg * 0.85, L.leg * 0.8, L.pants);
    f.next();
    if (L.her) {
      // her boots come up over the knee, with a paler cuff at the thigh
      const top: V = [h[0] + d1[0] * THIGH * 0.55, h[1] + d1[1] * THIGH * 0.55];
      limb(top, k, L.leg + 0.1, L.leg * 0.9, L.boot);
      limb(k, heel, L.leg * 0.9, L.leg * 0.8, L.boot);
      groove([top[0] - 1.6, top[1]], [top[0] + 1.6, top[1]], 0.22);
    } else {
      limb(cuff, heel, L.leg, L.leg * 0.85, L.boot);
      groove([cuff[0] - 1.6, cuff[1]], [cuff[0] + 1.6, cuff[1]], 0.16); // the turned-down top of the boot
    }
    limb(heel, [heel[0] + d2[1] * 2.8, heel[1] - d2[0] * 2.8], L.her ? 1.3 : 1.5, 1.1, L.boot); // the foot points where the shin's front faces
    f.bias = 0;
  };
  const arm = (A: V, off: number, dim: number): V => {
    const so: V = [sh[0] + n[0] * off, sh[1] + n[1] * off + 1];
    const d1 = dirv(A[0]), d2 = dirv(A[0] + A[1]);
    const e: V = [so[0] + d1[0] * UPPER, so[1] + d1[1] * UPPER];
    const h: V = [e[0] + d2[0] * FORE, e[1] + d2[1] * FORE];
    f.bias = dim - 0.06;
    f.next();
    limb(so, e, L.arm, L.arm * 0.84, L.coat);
    limb(e, [e[0] + d2[0] * FORE * 0.7, e[1] + d2[1] * FORE * 0.7], L.arm * 0.84, L.arm * 0.78, L.coat);
    f.next();
    ball(h, L.her ? 1.45 : 1.6, L.her ? 1.45 : 1.6, GLOVE);
    dot([e[0] + d2[0] * FORE * 0.72, e[1] + d2[1] * FORE * 0.72], GOLD, 0.5); // a brass cuff button
    f.bias = 0;
    return d.T(...C(h));
  };

  // ── far arm and leg
  arm(q.ba, -1.5, -0.24);
  leg(q.bl, -1, -0.24);

  // ── the scarf's tail, streaming from the back of the neck
  {
    let p: V = [sh[0] + up[0] * 2 - n[0] * 2, sh[1] + up[1] * 2 - n[1] * 2];
    f.next();
    for (let i = 0; i < (L.her ? 3 : 6); i++) { // hers is short: her ponytail is what streams
      const w = Math.sin(wave + i * 0.9) * (0.25 + i * 0.16);
      // each link follows the wind, and waves across it more the further out it is
      const nx = wind[0] - wind[1] * w, ny = wind[1] + wind[0] * w, len = 2.3;
      const e: V = [p[0] + nx * len, p[1] + ny * len];
      d.limb(C(p), C(e), 1.5 - i * 0.14, 1.4 - i * 0.16, SCARF, 0.8, () => (i % 2 ? -0.16 : 0.04));
      p = e;
    }
  }
  // ── behind the legs: his coat's two tails, or the back of her flared skirt
  f.next();
  f.bias = -0.3;
  if (L.her) {
    limb([hip[0] - n[0] * 1.8, hip[1] - 1.5], [hip[0] - 4.4 - flare * 0.7, hip[1] + 5.6 - flare * 0.35], 2.5, 2, L.coat, 0.8);
    limb([hip[0] - n[0] * 0.6, hip[1] - 1], [hip[0] - 1.6 - flare * 0.3, hip[1] + 6.2 - flare * 0.15], 2.3, 1.8, L.coat, 0.8);
  } else {
    limb([hip[0] - n[0] * 2.2, hip[1] - 2], [hip[0] - 4.6 - flare * 0.8, hip[1] + 9.5 - flare * 0.45], 2.4, 1.3, L.coat, 0.8);
    limb([hip[0] - n[0] * 1.4, hip[1] - 1], [hip[0] - 2.6 - flare * 0.4, hip[1] + 10.5 - flare * 0.2], 2, 1.1, L.coat, 0.8);
  }
  f.bias = 0;

  // ── torso: waist to chest, his belt, the coat's edge and collar
  f.next();
  f.bias = -0.12;
  limb(hip, [sh[0] - up[0] * (L.sw - 0.8), sh[1] - up[1] * (L.sw - 0.8)], L.ww, L.sw, L.coat);
  f.bias = 0;
  groove([sh[0] + n[0] * 1.4 - up[0] * 2, sh[1] + n[1] * 1.4 - up[1] * 2], [hip[0] + n[0] * 1.2 + up[0] * 2, hip[1] + n[1] * 1.2 + up[1] * 2], -0.2);
  groove([sh[0] + n[0] * 2.4 - up[0] * 2, sh[1] + n[1] * 2.4 - up[1] * 2], [hip[0] + n[0] * 2.2 + up[0] * 2, hip[1] + n[1] * 2.2 + up[1] * 2], 0.1);
  stroke([hip[0] - n[0] * L.ww, hip[1] - n[1] * L.ww - 1], [hip[0] + n[0] * L.ww, hip[1] + n[1] * L.ww - 1], L.her ? GOLD : BELT, L.her ? 0.3 : 0.5, L.her ? 1 : 2); // his belt, her gold sash
  dot([hip[0] + n[0] * 1.6, hip[1] + n[1] * 1.6 - 1], GOLD, 0.6);

  // ── near leg (his coat is cut away in front, so the legs read clearly when he runs),
  // and over hers the front of the skirt: a short panel that kicks out as she moves
  leg(q.fl, 1, 0);
  if (L.her) {
    f.next();
    limb([hip[0] + 1, hip[1] - 1], [hip[0] + 2.6 + flare * 0.25, hip[1] + 4.4 - Math.abs(flare) * 0.1], 2.4, 1.8, L.coat, 0.8);
    groove([hip[0] + 0.4, hip[1] + 1], [hip[0] + 1.2 + flare * 0.2, hip[1] + 5], -0.18); // a pleat
  }

  // ── head: it tips with the spine, but less (all the way when he is lying down)
  const ha = (Math.abs(q.lean) > 45 ? q.lean : q.lean * 0.5) * DEG, hc = Math.cos(ha), hs = Math.sin(ha);
  const Hd = (x: number, y: number): V => [headC[0] + x * hc - y * hs, headC[1] + x * hs + y * hc];
  f.next();
  f.bias = -0.16;
  limb([sh[0] + up[0], sh[1] + up[1]], headC, 1.5, 1.5, SKIN); // neck
  f.bias = 0;
  if (L.her) {
    // her ponytail: tied high with the red band, long, each link following the wind and
    // waving across it more the further out it is (it is heavier than a scarf, so it hangs
    // lower and swings slower)
    let p = Hd(-3, -2.6);
    f.next();
    for (let i = 0; i < 7; i++) {
      const w = Math.sin(wave * 0.7 + i * 0.8 + 1) * (0.2 + i * 0.12);
      const hx = wind[0] * 0.8 - 0.1, hy = wind[1] * 0.8 + 0.35, hl = Math.hypot(hx, hy) || 1; // the wind, pulled down by its weight
      const e: V = [p[0] + (hx / hl - (hy / hl) * w) * 2.2, p[1] + (hy / hl + (hx / hl) * w) * 2.2 - (i < 2 ? lift * 0.3 : 0)];
      limb(p, e, 1.7 - i * 0.16, 1.6 - i * 0.18, HAIR);
      p = e;
    }
    ball(Hd(-0.5, -0.9), 3.8, 3.7, HAIR);
    f.next();
    ball(Hd(-3.2, -2.6), 1.1, 1.1, BAND); // the tie
  } else {
    // his swept-back hair: three spikes that lift when he moves, over the mass of it
    f.next();
    limb(Hd(-2.4, -2.6), Hd(-6.4, -1.6 - lift * 0.6), 1.4, 0.4, HAIR);
    limb(Hd(-2.8, -0.6), Hd(-6.2, 1.4 - lift * 0.45), 1.2, 0.3, HAIR);
    limb(Hd(-2.2, 1.0), Hd(-4.8, 3.4 - lift * 0.3), 1.0, 0.3, HAIR);
    ball(Hd(-0.5, -0.9), 3.9, 3.8, HAIR);
    // the headband's knot, its ends blowing back
    stroke(Hd(-3.8, -1.8), Hd(-6.2, -0.2 + Math.sin(wave) * 0.8 - lift * 0.4), BAND, 0.3);
  }
  // face in profile: his with a brow and a square jaw, hers finer
  f.next();
  ball(Hd(1.3, 0.8), L.her ? 2.6 : 2.7, 3.1, SKIN);
  ball(L.her ? Hd(1.7, 2.5) : Hd(1.9, 2.5), L.her ? 1.6 : 1.9, L.her ? 1.3 : 1.5, SKIN);
  dot(Hd(4.1, 0.9), SKIN, 0.72); // nose
  dot(Hd(-0.9, 0.9), SKIN, 0.3); // ear, under the hair
  dot(Hd(2.7, 0.1), q.blink ? SKIN : INK, q.blink ? 0.25 : 0.2); // eye
  if (!L.her) dot(Hd(2.7, -1.0), HAIR, 0.05); // brow
  else if (!q.blink) dot(Hd(1.8, -0.2), INK, 0.9); // the sweep of her lashes
  f.next();
  if (L.her) {
    // a fringe swept across her brow to one side, and a long lock falling past her cheek
    stroke(Hd(-2, -4.2), Hd(3.4, -2.4), HAIR, 0.72, 2);
    stroke(Hd(0.6, -4.8), Hd(3.6, -3.4), HAIR, 0.95);
    stroke(Hd(3.8, -2.8), Hd(4.2, -1.4), HAIR, 0.6);
    stroke(Hd(0, -2.4), Hd(-0.2 + Math.sin(wave) * 0.4, 3.6), HAIR, 0.62, 1.5);
  } else {
    // the headband, and a fringe of spikes falling over it toward his brow
    stroke(Hd(-3.6, -1.9), Hd(3.6, -2.7), BAND, 0.62);
    stroke(Hd(-1.6, -4.4), Hd(1.2, -2.2), HAIR, 0.5);
    stroke(Hd(0.4, -4.6), Hd(2.8, -2.0), HAIR, 0.72);
    stroke(Hd(1.8, -4.4), Hd(4.2, -2.6), HAIR, 0.95);
    stroke(Hd(-1.0, -4.9), Hd(2.4, -4.8), HAIR, 0.95);
  }
  // the scarf wound round the neck, under the chin
  f.next();
  {
    const c: V = [sh[0] + up[0] * 1.5 + n[0] * 0.4, sh[1] + up[1] * 1.5 + n[1] * 0.4];
    d.ball(c[0] - PX, c[1] - PY, 2.9, 1.5, SCARF);
    groove([c[0] - 2, c[1] + 0.6], [c[0] + 2.4, c[1] + 0.2], -0.2);
  }

  // ── near arm on top: the whip hand
  const hand = arm(q.fa, 1.5, 0);
  return { f, hand };
}

// ---------------------------------------------------------------- the animations

const STAND = (o: Partial<HunterPose> = {}): HunterPose => ({
  hx: 24, hy: 32, lean: 2, fl: [8, 6], bl: [-6, 4], fa: [12, 22], ba: [-12, 18], coat: 0, hair: 0, scarf: 0, ...o,
});
const mixN = (a: number, b: number, t: number) => a + (b - a) * t;
const mixV = (a: V, b: V, t: number): V => [mixN(a[0], b[0], t), mixN(a[1], b[1], t)];
/** A pose part-way between two others (for wind-ups and recoveries). */
function between(a: HunterPose, b: HunterPose, t: number): HunterPose {
  return {
    ...b,
    hx: mixN(a.hx, b.hx, t), hy: mixN(a.hy, b.hy, t), lean: mixN(a.lean, b.lean, t),
    fl: mixV(a.fl, b.fl, t), bl: mixV(a.bl, b.bl, t), fa: mixV(a.fa, b.fa, t), ba: mixV(a.ba, b.ba, t),
    coat: mixN(a.coat || 0, b.coat || 0, t), hair: mixN(a.hair || 0, b.hair || 0, t),
  };
}

// where the loose things stream
const BACK: V = [-0.96, 0.28], FAST: V = [-1, 0.05], UP: V = [-0.45, -0.89], DOWN: V = [-0.2, 0.98], FWD: V = [0.9, 0.44];

/** Standing: two slow breaths and a blink. */
function idle(t: number): HunterPose {
  const br = 0.5 - 0.5 * Math.cos(t * TAU * 2);
  return STAND({ hy: 32 + br * 0.7, fl: [8, 6 + br * 4], bl: [-6, 4 + br * 4], fa: [12 + br * 3, 22], ba: [-12 - br * 2, 18], scarf: t * TAU, hair: br * 0.4, coat: br * 0.5, blink: t > 0.8 && t < 0.87 });
}
function walk(t: number): HunterPose {
  const a = t * TAU, s = Math.sin(a), c = Math.cos(a);
  return STAND({
    hy: 32 + s * s * 0.9, lean: 6,
    fl: [26 * s, 8 + 26 * Math.max(0, c)], bl: [-26 * s, 8 + 26 * Math.max(0, -c)],
    fa: [-22 * s + 8, 25], ba: [22 * s - 8, 20],
    coat: 2.5 + Math.sin(a * 2 - 0.8) * 1.5, scarf: a * 2, hair: 1 + Math.sin(a * 2 - 1.2) * 0.5, wind: BACK,
  });
}
/** The sprint: leaning hard into it, knees driving high, arms pumping, everything streaming behind. */
function sprint(t: number): HunterPose {
  const a = t * TAU, s = Math.sin(a), c = Math.cos(a);
  return STAND({
    hy: 32 + 0.6 * Math.cos(a * 2), lean: 16,
    fl: [38 * s + 6, 14 + 50 * Math.max(0, c)], bl: [-38 * s + 6, 14 + 50 * Math.max(0, -c)],
    fa: [-48 * s + 20, 70], ba: [48 * s + 4, 64],
    coat: 6.5 + Math.sin(a * 2 - 0.8) * 1.5, scarf: a * 3, hair: 3 + Math.sin(a * 2 - 1.2) * 0.6, wind: FAST,
  });
}
// the jump in three stages (by how fast he is rising), then a fluttering fall
const JUMP: HunterPose[] = [
  STAND({ hy: 31, lean: 7, fl: [22, 12], bl: [-18, 26], fa: [60, 50], ba: [-40, 30], coat: 1, hair: -1, wind: DOWN }),
  STAND({ hy: 30, lean: 4, fl: [50, 80], bl: [-5, 60], fa: [70, 40], ba: [-50, 30], coat: -1, hair: -1, scarf: 1, wind: DOWN }),
  STAND({ hy: 30, lean: 2, fl: [42, 70], bl: [4, 50], fa: [84, 30], ba: [-64, 22], coat: 2, hair: 1, scarf: 2, wind: BACK }),
];
function fall(t: number): HunterPose {
  const s = Math.sin(t * TAU);
  return STAND({ hy: 30, lean: 0, fl: [18, 22 + s * 3], bl: [-14, 12 - s * 3], fa: [125 + s * 6, 20], ba: [-125 - s * 6, 20], coat: 5.5 + s, hair: 3 + s * 0.5, scarf: t * TAU, wind: UP });
}
function crouch(t: number): HunterPose {
  const br = 0.5 - 0.5 * Math.cos(t * TAU);
  return STAND({ hy: 37 + br * 0.4, lean: 18, fl: [72, 82], bl: [8, 92], fa: [40 + br * 3, 30], ba: [-10, 20], coat: 3, scarf: t * TAU });
}
// landing: deep in the knees, then up
const LAND: HunterPose[] = [
  STAND({ hy: 36, lean: 16, fl: [52, 76], bl: [-4, 66], fa: [36, 34], ba: [-28, 24], coat: -2, hair: -2, wind: UP }),
  STAND({ hy: 35, lean: 12, fl: [40, 60], bl: [-10, 50], fa: [30, 30], ba: [-20, 20], coat: 3 }),
  STAND({ hy: 33.5, lean: 7, fl: [24, 30], bl: [-8, 24], fa: [20, 26], ba: [-16, 18], coat: 2 }),
];
const DASH = [0, 1].map((i) => STAND({ hy: 33, lean: -10, fl: [30, 20 + i * 10], bl: [-22, 18], fa: [40, 30], ba: [-40, 20], coat: -3, hair: 2, scarf: i * 3, wind: FWD }));
const HURT = [0, 1].map((i) => STAND({ hy: 31, lean: -25 - i * 4, fl: [35, 40 + i * 6], bl: [-10, 30], fa: [150 + i * 8, 20], ba: [-150 - i * 8, 20], coat: -4, hair: -3, headDy: 1, scarf: i * 2, wind: FWD, blink: true }));
function hang(t: number): HunterPose {
  const s = Math.sin(t * TAU);
  return STAND({ hy: 34, lean: s * 1.5, fa: [176, 0], ba: [168, 8], fl: [10 + s * 3, 20], bl: [-8 + s * 3, 28], coat: 1 + s, hair: -1, scarf: t * TAU, wind: DOWN });
}
function victory(t: number): HunterPose {
  const s = Math.sin(t * TAU);
  return STAND({ fa: [170, 0], ba: [-20, 10], lean: -4, hair: 2 + s * 0.5, scarf: t * TAU, coat: 1 + s, wind: BACK });
}
/** The slide: leaning far back, front leg shot out along the ground, everything streaming. */
function slide(t: number): HunterPose {
  const s = Math.sin(t * TAU);
  return STAND({ hx: 25, hy: 42, lean: -62, fl: [86, 2], bl: [40, 100], fa: [100, 30], ba: [-80, 10], coat: 6 + s, hair: 3 + s * 0.5, scarf: t * TAU, wind: FAST });
}
/** The double jump's somersault: knees tucked, turning once. */
function tuck(t: number): HunterPose {
  return STAND({ hy: 29, lean: 20, fl: [100, 135], bl: [75, 125], fa: [60, 70], ba: [20, 80], coat: 2, hair: 2, scarf: t * TAU * 2, spin: t * TAU, wind: BACK });
}

/** A twin's sheet. Both have the same animations and frames; only the look differs. */
function hunterSheet(look: Look): SheetBuilder {
  const b = new SheetBuilder(HERO_W, HERO_H, HERO_AX, HERO_AY);
  const add = (name: string, poses: HunterPose[]) => {
    const drawn = poses.map((q) => hunter(q, look));
    const idx = b.add(name, ...drawn.map((o) => o.f.resolve({ contour: 0.22 })));
    idx.forEach((id, k) => (b.meta[id] = { hand: [drawn[k].hand[0] - HERO_AX, drawn[k].hand[1] - HERO_AY] }));
  };
  const cycle = (pose: (t: number) => HunterPose, n: number) => Array.from({ length: n }, (_, i) => pose(i / n));

  add('idle', cycle(idle, 16));
  add('walk', cycle(walk, 12));
  add('sprint', cycle(sprint, 12));
  add('jump', JUMP);
  add('fall', cycle(fall, 4));
  add('crouch', cycle(crouch, 4));
  add('land', LAND);
  add('dash', DASH);
  add('hurt', HURT);
  add('dead', [{ hx: 30, hy: 43, lean: -88, fl: [92, 4], bl: [86, 10], fa: [30, 10], ba: [0, 0], coat: 0, wind: [-1, 0], blink: true }]);
  // tripped by a Gravehand: pitching forward with his arms flung out, then flat on his face
  add('trip', [
    STAND({ hy: 33, lean: 50, fl: [-10, 20], bl: [-45, 30], fa: [120, 10], ba: [100, 10], coat: -4, hair: -3, scarf: 2, wind: BACK }),
    { hx: 17, hy: 43, lean: 88, fl: [-92, 6], bl: [-84, 14], fa: [150, 20], ba: [120, 10], coat: 0, wind: [-1, 0], blink: true },
  ]);
  add('throw', [STAND({ lean: -6, fa: [-150, 40], ba: [-10, 20], fl: [20, 10], bl: [-20, 10] }), STAND({ lean: 12, fa: [105, 0], ba: [-30, 20], fl: [25, 10], bl: [-22, 12], coat: 2, wind: BACK })]);
  add('hang', cycle(hang, 4));
  add('swingF', [STAND({ hy: 34, lean: 14, fa: [168, 0], ba: [160, 8], fl: [40, 30], bl: [20, 40], coat: -3, hair: 3, wind: BACK })]);
  add('swingB', [STAND({ hy: 34, lean: -14, fa: [-176, 0], ba: [-168, 8], fl: [-20, 10], bl: [-30, 20], coat: 6, hair: -2, wind: FWD })]);
  add('victory', cycle(victory, 4));
  add('slide', cycle(slide, 4));
  add('tuck', cycle(tuck, 12));
  // easter egg: bent over and straining, a startled hop, then fanning the air behind him
  add('toot', [
    STAND({ hy: 35, lean: 34, fl: [34, 40], bl: [-24, 30], fa: [70, 50], ba: [40, 60], coat: 7, hair: 1 }),
    STAND({ hy: 31, lean: -14, fl: [24, 46], bl: [-28, 36], fa: [155, 30], ba: [-150, 30], coat: 6, hair: 4, scarf: 3, headDy: -1, wind: UP }),
    STAND({ lean: 4, fa: [130, 120], ba: [-70, 50], coat: 2, hair: 1 }),
    STAND({ lean: 4, fa: [130, 120], ba: [-35, 80], coat: 3, hair: 1, scarf: 2 }),
  ]);

  // the whip: for each stance and direction, a wind-up (`_0`: two frames, the arm drawn back
  // behind his head) and the stroke (`_1`: three frames, an overshoot that settles)
  const stances: Record<string, Partial<HunterPose>> = {
    stand: { hy: 33, fl: [22, 10], bl: [-22, 10] },
    crouch: { hy: 37, fl: [72, 82], bl: [8, 92] },
    air: { hy: 30, fl: [45, 75], bl: [-8, 55], coat: -2 },
  };
  for (const st of Object.keys(stances)) {
    ATTACK_DIRS.forEach((a, dir) => {
      const leanW = st === 'crouch' ? 12 : -10;
      const leanS = st === 'crouch' ? 20 : dir === 2 ? -4 : dir === 4 || dir === 3 ? 14 : 10;
      const rest = STAND({ ...stances[st], lean: st === 'crouch' ? 16 : 2 });
      const wind = STAND({ ...stances[st], lean: leanW, fa: [-140, 40], ba: [10, 30], coat: 2, hair: 1 });
      const hit = STAND({ ...stances[st], lean: leanS, fa: [a, 0], ba: [-30, 20], coat: 3, hair: 2, scarf: 2, wind: BACK });
      add(`atk_${st}_${dir}_0`, [between(rest, wind, 0.6), wind]);
      add(`atk_${st}_${dir}_1`, [
        { ...hit, lean: leanS + 5, fa: [a + 6, 0], ba: [-44, 24], coat: 5, hair: 3 },
        hit,
        { ...hit, lean: leanS - 2, fa: [a - 3, 6], ba: [-24, 20], coat: 1.5, hair: 1, scarf: 3 },
      ]);
    });
  }
  return b;
}

export const buildAnzelSheet = () => hunterSheet(ANZEL);
export const buildVesnaSheet = () => hunterSheet(VESNA);
