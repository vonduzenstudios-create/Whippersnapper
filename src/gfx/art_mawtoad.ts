// The Mawtoad: a toad the size of a cart, warty olive back, pale belly, a throat sac that
// swells before it strikes, and a mouth that is most of its head. Its own puppet (not the
// upright Rig): body, jaws, throat, an eye, a forearm, a folded hind leg. Bloated, it is a
// ball, drawn again for each heading so its light never turns with it.
import { SheetBuilder, PixelCanvas, hex } from './pixel';
import { FormCanvas, ramp } from './form';
import { Cell, Pose, V, DEG, keyed, bake, wave, pose, bust } from './puppet';

export const MAWTOAD_CELL: Cell = { w: 184, h: 132, ax: 88, ay: 120 };

const BACK = ramp('#0c1208', '#1c2a10', '#30441a', '#4a6226', '#6a8438', '#94a85a');
const BELLY = ramp('#3a3420', '#6a6238', '#9a9258', '#c4bc80', '#e6e0ac', '#f8f4d4');
const MAW = ramp('#1a040a', '#4a0c18', '#8a1a28', '#c0404a');
const EYE = ramp('#7a5a08', '#d0a418', '#f8e060');
const INK = ramp('#040604', '#101408');
const RIM = hex('#80c0a0');

const BASE: Pose = { ox: 0, oy: 0, air: 0, squat: 0.2, mouth: 0, throat: 0.3, eye: 1, arm: 78, reach: 0, tongue: 0, tilt: 0 };

export function mawtoad(P: Pose, cell: Cell = MAWTOAD_CELL, k = 1.5): { f: FormCanvas; head: V } {
  const f = new FormCanvas(cell.w, cell.h);
  const floor = cell.ay - P.air;
  const ry = 17 - P.squat * 4, c = Math.cos(P.tilt * DEG), s = Math.sin(P.tilt * DEG);
  const C: V = [cell.ax + P.ox, floor - (ry + 3) * k + P.oy];
  const B = (x: number, y: number): V => [C[0] + (x * c - y * s) * k, C[1] + (x * s + y * c) * k];
  const limb = (a: V, b: V, r0: number, r1: number, m = BACK, flat = 1) => f.limb(a[0], a[1], b[0], b[1], r0 * k, r1 * k, m, flat);
  const ball = (p: V, rx: number, ry2: number, m = BACK, flat = 1) => f.ball(p[0], p[1], rx * k, ry2 * k, m, P.tilt * DEG, flat);
  // far hind leg and forearm, dim
  f.bias = -0.16;
  ball(B(-13, 4), 9, 7);
  limb(B(12, 6), [B(15, 6)[0], floor - 2 * k], 3, 2.2);
  f.bias = 0;
  // the body, and the pale belly under it
  f.next();
  ball(B(-2, 0), 24, ry);
  for (const [wx, wy, wr] of [[-14, -9, 1.8], [-6, -13, 2.2], [3, -12, 1.6], [-18, -2, 1.5], [-9, -5, 1.3], [8, -8, 1.4]]) ball(B(wx, wy + P.squat * 3), wr, wr, BACK, 0.6); // warts
  f.next();
  ball(B(4, ry * 0.52), 17, ry * 0.5, BELLY);
  // the near hind leg: a great folded thigh, or flung out straight behind in a leap
  f.next();
  const hip = B(-13, 5), knee: V = [hip[0] - (6 + P.reach * 12) * k, hip[1] + (6 - P.reach * 4) * k];
  ball(hip, 11 - P.reach * 3, 8.5 - P.reach * 2);
  const foot: V = P.reach > 0.5 ? [knee[0] - 12 * k, knee[1] + 4 * k] : [hip[0] - 2 * k, floor - 2 * k];
  limb(knee, foot, 4, 2.4);
  for (let i = 0; i < 3; i++) limb(foot, [foot[0] + (P.reach > 0.5 ? -7 : 9 + i) * k, foot[1] + (i - 1) * 1.6 * k], 1.5, 0.8);
  // throat sac
  f.next();
  ball(B(17, 7 + P.throat * 2), 6 + P.throat * 6, 5 + P.throat * 5, BELLY);
  // jaws: the lower one drops, the inside is dark red
  const gape = P.mouth * 8;
  if (P.mouth > 0.15) {
    f.next();
    f.poly([B(9, -1), B(29, -3 - gape * 0.5), B(27, 5 + gape), B(10, 4)], MAW, (x) => 0.2 + (x - C[0]) * 0.006);
    if (P.tongue > 0) limb(B(14, 3 + gape * 0.5), B(24 + P.tongue * 8, 6 + gape + P.tongue * 5), 3, 2.4, MAW);
  }
  f.next();
  limb(B(8, 4), B(27, 5 + gape), 6, 3.4, BELLY);
  f.next();
  limb(B(6, -6), B(29, -3 - gape * 0.5), 9.5, 5, BACK);
  f.dot(...B(30, -5 - gape * 0.5), INK, 0.1); // nostril
  // the eye: a dome on top of the head, a gold iris, a slit
  f.next();
  const eye = B(11, -15 + P.squat * 3);
  ball(eye, 5.4, 5);
  if (P.eye > 0.3) {
    f.disc(eye[0] + k, eye[1], 3.3 * k, EYE, 0.7);
    f.stroke(eye[0] - 1.5 * k, eye[1], eye[0] + 3.5 * k, eye[1], INK, 0.1, 2);
    f.dot(eye[0], eye[1] - 2, EYE, 1);
  } else f.groove(eye[0] - 3 * k, eye[1] + k, eye[0] + 4 * k, eye[1] + k, -0.4);
  // near forearm: elbow out, hand flat on the ground (or reaching in a leap)
  f.next();
  const sh = B(13, 7), el: V = [sh[0] + Math.cos(P.arm * DEG) * 8 * k, sh[1] + Math.sin(P.arm * DEG) * 8 * k];
  const hand: V = P.air > 2 ? [el[0] + 8 * k, el[1] + 2 * k] : [el[0] + 3 * k, floor - 2 * k];
  limb(sh, el, 4, 3);
  limb(el, hand, 3, 2.2);
  for (let i = 0; i < 3; i++) limb(hand, [hand[0] + (6 + i) * k, hand[1] + (i - 1) * 1.5 * k], 1.3, 0.7);
  return { f, head: B(16, -6) };
}

/** Bloated into a ball and rolling: `roll` degrees round. */
function ballForm(roll: number): PixelCanvas {
  const C = MAWTOAD_CELL, f = new FormCanvas(C.w, C.h), R = 44, cx = C.ax, cy = C.ay - R - 2;
  const at = (deg: number, r: number): V => [cx + Math.cos((deg + roll) * DEG) * r, cy + Math.sin((deg + roll) * DEG) * r];
  // four useless limbs sticking out
  for (const a of [70, 110, 200, 240]) {
    const p = at(a, R + 3);
    f.ball(p[0], p[1], 7, 7, BACK);
  }
  f.next();
  f.ball(cx, cy, R, R, BACK, 0, 0.9);
  for (const [a, r, wr] of [[150, 30, 4], [190, 22, 3], [230, 34, 3.4], [270, 26, 2.6], [120, 36, 2.4]]) f.ball(...at(a, r), wr, wr, BACK, 0, 0.6);
  f.next();
  const belly = at(60, 16);
  f.ball(belly[0], belly[1], 27, 27, BELLY, 0, 0.5);
  // a mouth pressed shut by the pressure, cheeks puffed, both eyes bulging
  f.next();
  for (let i = 0; i < 9; i++) f.limb(...at(-34 + i * 7, 38), ...at(-27 + i * 7, 38), 1.6, 1.6, MAW, 0.6);
  for (const a of [-52, -74]) {
    const e = at(a, 36);
    f.next();
    f.ball(e[0], e[1], 7, 7, BACK);
    f.disc(e[0], e[1], 4.4, EYE, 0.75);
    f.dot(e[0], e[1], INK, 0.1);
    f.dot(e[0] + 1, e[1], INK, 0.1);
  }
  return f.resolve({ rim: RIM, contour: 0.12 });
}

const draw = (P: Pose) => mawtoad(P).f.resolve({ rim: RIM, contour: 0.14 });

const idle = (t: number): Pose => pose(BASE, { throat: 0.35 + wave(t) * 0.3, oy: wave(t) * 0.5, eye: t > 0.8 && t < 0.9 ? 0 : 1, squat: 0.2 + wave(t, 0.1) * 0.06 });
/** The tell before the tongue: it sinks, the sac fills, the mouth comes open. */
const tell = keyed(BASE, [
  [0, {}],
  [0.6, { squat: 0.7, throat: 1, mouth: 0.25, tilt: -4 }],
  [1, { squat: 0.6, throat: 0.9, mouth: 1, tilt: -7, ox: 2 }],
]);
const lash = (t: number): Pose => pose(BASE, { squat: 0.4, throat: 0.1, mouth: 1, tilt: -6 + wave(t) * 1.5, ox: 4 });
const crouch = keyed(BASE, [[0, {}], [1, { squat: 1, throat: 0.6, tilt: 8, arm: 60 }]]);
const leap = (t: number): Pose => pose(BASE, { air: 6, squat: 0, reach: 1, tilt: -22 + t * 44, arm: 20, mouth: 0.3, throat: 0.2 });
const spit = keyed(BASE, [
  [0, {}],
  [0.4, { throat: 1, squat: 0.5, tilt: -10, mouth: 0.1 }],
  [0.6, { throat: 0, squat: 0.2, tilt: -14, mouth: 1, ox: 3 }],
  [1, {}],
]);
/** Emptied out: flat on its belly, one eye shut, the tongue on the floor. */
const stun = (t: number): Pose => pose(BASE, { squat: 1, throat: 0.05 + Math.abs(wave(t)) * 0.2, mouth: 0.5, tongue: 1, eye: 0, tilt: 5, oy: 1.5 });
const swell = keyed(BASE, [
  [0, {}],
  [0.5, { throat: 1, squat: 0, mouth: 0, oy: -3 }],
  [1, { throat: 1, squat: -0.6, mouth: 0, oy: -8, tilt: -6 }],
]);

export function buildMawtoadSheet(): SheetBuilder {
  const C = MAWTOAD_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 10, idle, draw);
  bake(b, 'tell', 6, tell, draw, false);
  bake(b, 'lash', 2, lash, draw);
  bake(b, 'crouch', 4, crouch, draw, false);
  bake(b, 'leap', 4, leap, draw, false);
  bake(b, 'spit', 8, spit, draw, false);
  bake(b, 'swell', 6, swell, draw, false);
  b.add('ball', ...Array.from({ length: 16 }, (_, i) => ballForm((i / 16) * 360)));
  bake(b, 'stun', 6, stun, draw);
  return b;
}

export function mawtoadPortrait(angry: boolean): PixelCanvas {
  return bust((cell) => mawtoad(pose(BASE, { mouth: angry ? 1 : 0, throat: angry ? 1 : 0.4, ox: -22 }), cell, 2.4), RIM, 6);
}

/** 48x80, anchored bottom middle: `pod` (2, a gas pod swaying on its reed), `reed` (bare), `fallen` (the pod on the mud), `stump` (thorns). */
export function buildBogProps(): SheetBuilder {
  const b = new SheetBuilder(48, 80, 24, 80);
  const REED = ramp('#141c0c', '#2c3c14', '#4a5c20', '#6c8030'), POD = ramp('#3a1c40', '#6c3478', '#a05cb0', '#d498dc', '#f4d0f4');
  const THORN = ramp('#140c08', '#30201a', '#503830', '#74584a');
  const reed = (f: FormCanvas, bend: number) => {
    f.limb(24, 80, 24 + bend, 30, 1.6, 1.2, REED);
    f.limb(24 + bend, 30, 30 + bend * 2, 14, 1.2, 0.9, REED);
    for (const y of [64, 48]) f.limb(24, y, 13 - (y % 3), y - 12, 1, 0.4, REED);
    return [30 + bend * 2, 14] as V;
  };
  b.add('pod', ...[-1, 1].map((bend) => {
    const f = new FormCanvas(48, 80), tip = reed(f, bend);
    f.next();
    f.ball(tip[0] + 1, tip[1] + 9, 7, 8.5, POD);
    f.groove(tip[0] - 2, tip[1] + 3, tip[0] - 3, tip[1] + 15, -0.16);
    f.groove(tip[0] + 3, tip[1] + 3, tip[0] + 4, tip[1] + 15, 0.14);
    return f.resolve({ rim: RIM });
  }));
  const bare = new FormCanvas(48, 80);
  reed(bare, 0);
  b.add('reed', bare.resolve({ rim: RIM }));
  const fallen = new FormCanvas(48, 80);
  fallen.ball(24, 72, 8.5, 7, POD);
  fallen.groove(20, 67, 19, 77, -0.16);
  fallen.groove(28, 67, 29, 77, 0.14);
  b.add('fallen', fallen.resolve({ rim: RIM }));
  const st = new FormCanvas(48, 80);
  st.limb(24, 80, 24, 56, 9, 7, THORN);
  for (const [x, y, a] of [[16, 58, -130], [32, 58, -50], [24, 50, -90], [12, 68, -165], [36, 68, -15], [20, 52, -110], [29, 52, -70]]) {
    st.next();
    st.limb(x, y, x + Math.cos(a * DEG) * 13, y + Math.sin(a * DEG) * 13, 2, 0.3, THORN);
  }
  b.add('stump', st.resolve({ rim: RIM }));
  return b;
}
