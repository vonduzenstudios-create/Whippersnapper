// The Ossified Bull: a minotaur put together from the bones of a cathedral's crypt and bound with
// iron bands. Its ribcage is open, and a coal of a heart smoulders inside. A bull's skull with
// sweeping horns and an iron ring through the nose; hooves of black horn; a maul with a femur
// for a haft and an iron reliquary for a head.
// Channels: `a` = the maul's angle, `b` = the heart's glow (0..1).
import { SheetBuilder } from '../pixel';
import { FormCanvas, ramp } from '../form';
import { Rig, Build, Cell, Pose, STAND, V, DEG, keyed, bake, wave, pose } from '../puppet';
import { IRON, GOLD, INK, RIM, toward } from './common';

export const BULL_CELL: Cell = { w: 250, h: 170, ax: 112, ay: 164 };
const BUILD: Build = { k: 2.05, torso: 12, hipR: 4.6, chestR: 8.4, neck: 2, headR: 4, arm: [8, 7.6, 3.8, 3], leg: [7.4, 7.4, 4, 2.4], foot: 5, shoulder: 2.6, hipW: 1.5 };

const BONE = ramp('#241a18', '#4e4038', '#7c6c58', '#a8987a', '#cfc2a2', '#efe6cc');
const OLD = ramp('#1e1612', '#3e3026', '#62503c', '#8a7454', '#ae9870'); // yellowed, deeper bone
const HORN = ramp('#0a0808', '#1e1a18', '#38302a', '#584a3c', '#7a6850');
const PIT = ramp('#060304', '#160806', '#2a0e08');
const COAL = ramp('#4a0c04', '#a02808', '#ff6a10', '#ffc040', '#fff0b0');

const BASE: Pose = pose(STAND, { lean: 12, head: 10, an1: 96, an2: -64, af1: 70, af2: 60, ln1: 60, ln2: 118, lf1: 74, lf2: 124, a: -124, b: 0.5 });

/** A bone limb: a shaft with knobbed ends, bound by an iron band. */
function boneLimb(R: Rig, a: V, b: V, r0: number, r1: number, mat = BONE) {
  R.f.next();
  // thick bones lashed side by side, so the limb has bulk
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;
  R.limb(a, b, r0 * 0.85, r1 * 0.8, mat);
  R.groove(toward(a, ang + 90, r0 * 0.3 * R.k), toward(b, ang + 90, r1 * 0.3 * R.k), -0.22);
  R.ball(a, r0, r0 * 0.9, mat);
  R.ball(b, r1, r1 * 0.9, mat);
  const m: V = [(a[0] * 0.55 + b[0] * 0.45), (a[1] * 0.55 + b[1] * 0.45)];
  R.limb(toward(m, ang, -0.6), toward(m, ang, 0.6), r0 * 0.92, r0 * 0.92, IRON);
}

function bullLeg(R: Rig, side: 'N' | 'F', P: Pose) {
  const J = R.J, k = R.k;
  const hip = side === 'N' ? J.hipN : J.hipF, knee = side === 'N' ? J.kneeN : J.kneeF, hock = side === 'N' ? J.footN : J.footF;
  const up = P.air > 2, shin = side === 'N' ? P.ln2 : P.lf2;
  const hoof: V = up ? toward(hock, shin - 30, 4 * k) : [hock[0] + 1.4 * k, R.cell.ay - 2.6 * k];
  boneLimb(R, hip, knee, 3.4, 2.6, OLD);
  boneLimb(R, knee, hock, 2.4, 1.8);
  R.f.next();
  R.limb(hock, hoof, 1.8, 1.6, BONE);
  // a split hoof of black horn
  R.f.next();
  const toe = toward(hoof, up ? shin - 20 : 0, 2.6 * k);
  R.f.poly([toward(hoof, -60, 1.6 * k), toward(toe, -40, 1.2 * k), [toe[0], toe[1] + 2.2 * k], [hoof[0] - 1.8 * k, hoof[1] + 2.4 * k]], HORN, 0.45);
  R.groove(toward(hoof, 10, 1.4 * k), toward(toe, 70, 2 * k), -0.3);
}

export function bull(P: Pose, cell: Cell = BULL_CELL): FormCanvas {
  const f = new FormCanvas(cell.w, cell.h);
  const R = new Rig(f, P, BUILD, cell), J = R.J, k = BUILD.k;
  // a tail of vertebrae
  f.next();
  let tp = R.body(-4, -0.4), ta = 150 - P.sway * 20;
  for (let i = 0; i < 6; i++) {
    const q = toward(tp, ta, 1.9 * k);
    R.ball(q, 1.3 - i * 0.14, 1.1 - i * 0.12, BONE);
    tp = q;
    ta -= 8 + P.sway * 6;
  }
  R.dim(-0.2, () => {
    bullLeg(R, 'F', P);
    boneLimb(R, J.shF, J.elF, 3, 2.4, OLD);
    boneLimb(R, J.elF, J.handF, 2.4, 2);
    R.ball(J.handF, 2.4, 2.2, BONE);
  });
  // the pelvis: a broad bone basin
  f.next();
  R.ball(J.pelvis, 5, 3.6, OLD, P.lean);
  R.groove(R.body(-3, 0.6), R.body(3, 0.6), -0.25);
  // the spine, a column of knuckled vertebrae up the back
  f.next();
  for (let i = 0; i < 6; i++) R.ball(R.body(-3.8 + i * 0.2, -1.6 - i * 1.9), 1.6, 1.2, BONE, P.lean);
  // the open ribcage: dark inside, a coal of a heart, ribs arched over it
  f.next();
  const cc = R.body(0.8, -7.4);
  R.ball(cc, 6.2, 6.4, PIT, P.lean, 0.3);
  f.next();
  const glow = 0.55 + P.b * 0.45;
  R.ball(cc, 2.6 + P.b * 0.5, 2.8 + P.b * 0.5, COAL, 0, 0.3);
  f.dot(cc[0], cc[1], COAL, glow);
  f.disc(cc[0] - 0.6 * k, cc[1] - 0.6 * k, 1.2 * k, COAL, glow);
  f.next();
  for (let i = 0; i < 5; i++) {
    const y = -11.6 + i * 2.2, back = R.body(-3.6, y), front = R.body(4.2 - i * 0.3, y + 1.6 + i * 0.3), mid = R.body(1, y - 1.4 + i * 0.2);
    R.limb(back, mid, 0.85, 0.75, BONE);
    R.limb(mid, front, 0.75, 0.6, BONE);
  }
  R.limb(R.body(3.8, -12), R.body(4.4, -3.8), 0.9, 0.7, OLD); // the breastbone
  // a gilt reliquary plate strapped over the collarbone
  f.next();
  R.limb(R.body(-3, -12.4), R.body(4, -12.8), 1.1, 1.1, IRON);
  R.ball(R.body(2.6, -12.8), 1.5, 1.3, GOLD);
  bullLeg(R, 'N', P);
  // the bull's skull
  f.next();
  R.limb(J.neck, J.head, 3, 2.6, OLD);
  // far horn
  R.dim(-0.15, () => {
    f.next();
    let hp = R.face(-0.6, -2.6), ha = -150 + P.head;
    for (let i = 0; i < 5; i++) {
      const q = toward(hp, ha + P.lean, 1.8 * k);
      R.limb(hp, q, 1.4 - i * 0.24, 1.2 - i * 0.24, BONE);
      hp = q;
      ha += 34;
    }
  });
  f.next();
  R.ball(J.head, 4.2, 3.8, BONE, P.lean + P.head);
  R.limb(R.face(0.6, -0.4), R.face(4, 2.6), 3.2, 2.5, BONE); // the broad, heavy face
  R.ball(R.face(-0.4, -2.6), 3, 1.6, OLD, P.lean + P.head); // the poll, a ridge between the horns
  R.groove(R.face(1, -2.2), R.face(4.4, 1.2), 0.15);
  // a jaw that drops when it bellows
  f.next();
  R.limb(R.face(0, 2.6), R.face(3.6 - P.mouth * 0.6, 4.8 + P.mouth * 2), 1.6, 1.2, OLD);
  // eye sockets with a red spark deep in each
  R.ball(R.face(1.6, -0.6), 1.2, 1, PIT, 0, 0.3);
  R.dot(R.face(1.8, -0.5), COAL, 0.7);
  R.groove(R.face(3.6, 2.2), R.face(4.6, 3.2), -0.35); // nostril
  // the nose ring
  f.next();
  const ring = R.face(4.4, 4.6);
  R.ball(ring, 1.5, 1.7, IRON, 0, 0.6);
  R.ball(ring, 0.8, 1, INK, 0, 0.2);
  // near horn, sweeping out and forward
  f.next();
  let hp = R.face(-0.2, -2.8), ha = -160 + P.head;
  for (let i = 0; i < 6; i++) {
    const q = toward(hp, ha + P.lean, 1.9 * k);
    R.limb(hp, q, 1.6 - i * 0.24, 1.4 - i * 0.24, i < 2 ? OLD : BONE);
    if (i < 3) R.groove(toward(hp, ha + P.lean + 90, 1), toward(hp, ha + P.lean - 90, 1), -0.2);
    hp = q;
    ha += 36;
  }
  // the maul: femur haft, reliquary head
  f.next();
  const ux = Math.cos(P.a * DEG), uy = Math.sin(P.a * DEG);
  const along = (d: number, side = 0): V => [J.handN[0] + (ux * d - uy * side) * k, J.handN[1] + (uy * d + ux * side) * k];
  R.limb(along(-4), along(18), 1.1, 1, BONE);
  R.ball(along(-4.4), 1.8, 1.6, BONE);
  f.next();
  f.poly([along(16, -5), along(24, -5), along(24, 5), along(16, 5)], IRON, (x, y) => {
    const d = ((x - J.handN[0]) * ux + (y - J.handN[1]) * uy) / k;
    return 0.3 + (d - 16) * 0.05;
  });
  R.limb(along(15.6, -5.4), along(15.6, 5.4), 0.7, 0.7, IRON);
  R.limb(along(24.4, -5.4), along(24.4, 5.4), 0.7, 0.7, IRON);
  R.ball(along(20, 0), 1.8, 1.8, GOLD);
  R.dot(along(20, 0), COAL, 0.4 + P.b * 0.4);
  for (const s of [-3.6, 3.6]) for (const d of [17.2, 22.8]) R.dot(along(d, s), GOLD, 0.8); // rivets
  // the near arm, a great shoulder of a vertebra
  boneLimb(R, J.shN, J.elN, 3.2, 2.6, OLD);
  boneLimb(R, J.elN, J.handN, 2.6, 2.1);
  f.next();
  R.ball(J.handN, 2.6, 2.4, BONE);
  for (let i = 0; i < 3; i++) R.groove(R.at(J.handN, P.an2 + P.lean - 40 + i * 30, 0.8), R.at(J.handN, P.an2 + P.lean - 40 + i * 30, 2.4), -0.25);
  f.next();
  R.ball(J.shN, 3.8, 3.2, BONE, P.lean);
  R.limb(R.at(J.shN, -120 + P.lean, 2), R.at(J.shN, -150 + P.lean, 5), 1.2, 0.3, BONE); // a spur
  R.groove(R.at(J.shN, 150 + P.lean, 3), R.at(J.shN, 30 + P.lean, 3), -0.2);
  return f;
}

const draw = (P: Pose) => bull(P).resolve({ rim: RIM, contour: 0.12 });

// ---------------------------------------------------------------- animations

const idle = (t: number): Pose => pose(BASE, { breath: 0.5 + wave(t) * 0.5, oy: wave(t) * 0.7, b: 0.5 + wave(t) * 0.5, head: 10 + wave(t, 0.2) * 3, a: -124 + wave(t, 0.1) * 3 });
const walk = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, { ln1: 60 + s * 22, ln2: 118 + Math.max(0, c) * 20, lf1: 60 - s * 22, lf2: 118 + Math.max(0, -c) * 20, lean: 14, oy: Math.abs(c) * -1.6, head: 10 - c * 3, af1: 70 + s * 12, a: -120 + s * 4, b: 0.5 + c * 0.4 });
};
/** Head down, scraping a hoof back along the floor. */
const paw = (t: number): Pose => {
  const s = wave(t);
  return pose(BASE, { lean: 30, head: 30, ln1: 70 + s * 30, ln2: 130 + Math.max(0, s) * 20, lf1: 64, lf2: 120, an1: 80, an2: 60, a: 160, af1: 80, af2: 70, mouth: 0.4, b: 0.7 + s * 0.3, oy: 1 });
};
/** The charge: horns low, maul trailing. */
const charge = (t: number): Pose => {
  const s = wave(t), c = wave(t, 0.25);
  return pose(BASE, {
    lean: 38, head: 34, ln1: 44 + s * 40, ln2: 120 + Math.max(0, c) * 30, lf1: 44 - s * 40, lf2: 120 + Math.max(0, -c) * 30,
    oy: Math.abs(c) * -2.4, an1: 100, an2: 120, a: 150, af1: 40 - s * 30, af2: 30, mouth: 0.8, b: 1,
  });
};
/** Dazed after hitting a wall: it reels, its skull hangs. */
const crash = (t: number): Pose => pose(BASE, { lean: -10 + wave(t) * 6, head: 34 + wave(t, 0.25) * 10, ox: -3, an1: 110, an2: 120, a: 100, af1: 100, af2: 110, ln1: 50, lf1: 90, lf2: 110, mouth: 0.6, b: 0.1 });
/** The maul overhead, then down on the floor in front of it. */
const slam = keyed(BASE, [
  [0, {}],
  [0.35, { an1: -100, an2: -100, af1: -90, af2: -90, a: -110, lean: -12, head: -10, mouth: 1, ln1: 66, lf1: 80, b: 0.8 }],
  [0.6, { an1: -108, an2: -108, af1: -96, af2: -98, a: -118, lean: -14, head: -12, mouth: 1, ln1: 68, lf1: 82, b: 1 }],
  [0.74, { an1: 36, an2: 20, af1: 40, af2: 30, a: 22, lean: 34, head: 20, ox: 4, mouth: 1, ln1: 50, ln2: 130, lf1: 80, lf2: 120, b: 1 }],
  [1, { an1: 38, an2: 22, af1: 42, af2: 32, a: 24, lean: 32, head: 18, ox: 4, ln1: 52, ln2: 128, lf1: 78, b: 0.6 }],
]);
/** A sudden toss of the head: the horns sweep up through whatever is in front of it. */
const toss = keyed(BASE, [
  [0, {}],
  [0.35, { lean: 34, head: 40, ln1: 50, lf1: 80, oy: 2, mouth: 0.3 }],
  [0.6, { lean: -8, head: -40, ln1: 70, lf1: 66, oy: -2, mouth: 1, an1: 20, a: -100 }],
  [1, {}],
]);

export function buildBullSheet(): SheetBuilder {
  const C = BULL_CELL, b = new SheetBuilder(C.w, C.h, C.ax, C.ay);
  bake(b, 'idle', 8, idle, draw);
  bake(b, 'walk', 8, walk, draw);
  bake(b, 'paw', 6, paw, draw);
  bake(b, 'charge', 6, charge, draw);
  bake(b, 'crash', 6, crash, draw);
  bake(b, 'slam', 12, slam, draw, false);
  bake(b, 'toss', 8, toss, draw, false);
  return b;
}

/** 24x24: `shard` (4 frames of a spinning bone splinter, thrown up out of the floor). */
export function buildBullProps(): SheetBuilder {
  const b = new SheetBuilder(24, 24, 12, 12);
  b.add('shard', ...[0, 45, 90, 135].map((a) => {
    const f = new FormCanvas(24, 24);
    const p = toward([12, 12], a, 6), q = toward([12, 12], a + 180, 6);
    f.limb(p[0], p[1], q[0], q[1], 2.2, 0.6, BONE);
    f.ball(p[0], p[1], 2.4, 2, BONE);
    return f.resolve({ rim: RIM });
  }));
  return b;
}
