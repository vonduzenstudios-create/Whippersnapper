// The Sump Leviathan, redrawn with form shading (0.27.0, the Sunken Lock trial fight).
//
// Like the Wyrm it is a puppet the boss strings along its own path: a head, a chain of body
// segments and a tail fin. And like the Wyrm's, every piece is drawn again for each of 16
// headings, so nothing is rotated at run time and the light always falls from the same side.
// The segments also come in two fin beats, so the fins ripple down its length as it swims.
import { SheetBuilder, hex } from './pixel';
import { FormCanvas, ramp, turned, V } from './form';

export const LW_DIRS = 16;
/** The frame number (0..LW_DIRS-1) for a heading in radians (0 = right, clockwise on screen). */
export const lwDir = (a: number) => ((Math.round((a / (Math.PI * 2)) * LW_DIRS) % LW_DIRS) + LW_DIRS) % LW_DIRS;
/** Segment sizes down the body ('seg0' is the thickest). */
export const LW_SIZES = [1, 0.84, 0.64];
const JAWS = [0, 0.5, 1];

const HIDE = ramp('#04101c', '#0a2236', '#143c54', '#24607a', '#4a90a0', '#8cc8c8');
const BELLY = ramp('#3a4640', '#6e7e6c', '#a4b498', '#d0dcc0', '#f0f6e0');
const PLATE = ramp('#06080e', '#141c28', '#26343f', '#3e525c', '#607a80');
const FIN = ramp('#0a2a30', '#14505a', '#2a8088', '#5cb8b0', '#a4e8d8');
const MAW = ramp('#12040a', '#3e0a14', '#761824', '#b03a3a');
const TOOTH = ramp('#6a6a5a', '#b4b49c', '#f2f2dc');
const EYE = ramp('#7a8a90', '#c8d8dc', '#ffffff'); // blind, milk-white
const IRON = ramp('#0e0e14', '#262830', '#484c58', '#747a88', '#a8b0bc');
const RUST = ramp('#3a1408', '#7a2c10', '#c0541c', '#f09040'); // the pawl's catch, so it reads against the iron
const WOOD = ramp('#1a100a', '#382414', '#5c3e22', '#84603a', '#aa8658');

const HEAD = 112, SEG = 64;

/** The head, side on: an armored brow, a blind eye, a long jaw of needle teeth, barbels trailing. */
function head(a: number, open: number): FormCanvas {
  const f = new FormCanvas(HEAD, HEAD);
  const d = turned(f, HEAD / 2, HEAD / 2, a, true, 1);
  const ja = open * 0.6, jc = Math.cos(ja), js = Math.sin(ja);
  const J = (x: number, y: number): V => [-10 + x * jc - y * js, 6 + x * js + y * jc]; // jaw space: the hinge is behind the eye
  // gill frills fanning back from the cheek (far ones dim)
  for (let k = 0; k < 4; k++) {
    f.next();
    f.bias = -0.1;
    d.limb([-14, -2 + k * 3], [-34 - k * 2, -14 + k * 9], 3, 0.6, FIN, 0.6);
  }
  f.bias = 0;
  if (open > 0.2) {
    f.next();
    f.poly([d.T(-6, 4), d.T(34, 3), d.T(...J(40, 2)), d.T(...J(2, 3))], MAW, 0.45);
  }
  // lower jaw
  f.next();
  f.bias = -0.12;
  d.limb(J(0, 2), J(22, 5), 8, 6, BELLY);
  d.limb(J(22, 5), J(44, 2), 6, 3, BELLY);
  f.bias = 0;
  for (let i = 0; i < 7; i++) {
    const x = 12 + i * 4.6, len = 4 + (i % 2) * 2 + (i === 6 ? 2 : 0);
    d.stroke(J(x, 1), J(x + 0.8, 1 - len), TOOTH, 0.9, 1.5);
  }
  // barbels from the chin
  for (const [x, l] of [[30, 16], [36, 12]]) d.stroke(J(x, 5), J(x - 8, 5 + l), FIN, 0.6);
  // skull and snout
  f.next();
  d.ball(-8, -3, 17, 14, HIDE);
  d.limb([0, -4], [30, -3], 11, 6.5, HIDE);
  d.limb([30, -3], [42, -1], 6.5, 4, HIDE);
  for (let i = 0; i < 7; i++) {
    const x = 14 + i * 4.4, len = 4 + (i % 2) * 2;
    d.stroke([x, 3], [x + 0.6, 3 + len], TOOTH, 0.92, 1.5);
  }
  d.groove([8, 3], [40, 3], -0.2); // the lip
  // armor: three brow plates lapping back over the skull, a horn off the last
  for (let k = 0; k < 3; k++) {
    f.next();
    d.ball(8 - k * 11, -10 - (k === 1 ? 1 : 0), 8.5, 5.5, PLATE);
    d.groove([3 - k * 11, -7], [14 - k * 11, -8], -0.2);
  }
  d.limb([-18, -12], [-32, -22], 3.4, 0.6, PLATE);
  // the eye: blind
  f.next();
  d.ball(10, -3, 3.4, 3.2, EYE);
  d.dot(11, -3.6, EYE, 1);
  d.dot(39, -3, HIDE, 0.05); // nostril
  return f;
}

/** A body segment: a thick ring of hide, a pale belly, a dorsal spine and fin, a side fin that beats. */
function segment(a: number, size: number, beat: number, plated: boolean): FormCanvas {
  const f = new FormCanvas(SEG, SEG);
  const d = turned(f, SEG / 2, SEG / 2, a, true, size);
  const fl = beat ? 1 : -1;
  // dorsal fin
  f.next();
  d.limb([4, -12], [-12, -24 - fl * 2], 4, 0.5, FIN, 0.6);
  d.limb([-2, -12], [-16, -19 - fl * 2], 3, 0.5, FIN, 0.6);
  f.next();
  d.ball(0, 0, 17, 15, HIDE);
  d.ball(0, 7, 13, 8, BELLY, 0.8);
  d.groove([-14, 4], [14, 4], -0.16);
  for (const x of [-8, 0, 8]) d.groove([x, 8], [x + 1, 14], -0.14); // belly plates
  if (plated) {
    f.next();
    d.ball(0, -9, 12, 6, PLATE);
    d.groove([-9, -6], [9, -7], -0.2);
  }
  // side fin
  f.next();
  d.limb([2, 4], [-12, 14 + fl * 5], 3.4, 0.6, FIN, 0.6);
  d.limb([-2, 5], [-14, 9 + fl * 5], 2.6, 0.5, FIN, 0.6);
  return f;
}

function tail(a: number, beat: number): FormCanvas {
  const f = new FormCanvas(SEG, SEG);
  const d = turned(f, SEG / 2, SEG / 2, a, true, 1);
  const fl = beat ? 5 : -5;
  for (const [y, len] of [[-16, 24], [-8, 28], [0, 30], [8, 28], [16, 24]] as V[]) {
    f.next();
    d.limb([4, y * 0.3], [-len, y + fl * (y / 16)], 3.2, 0.5, FIN, 0.6);
  }
  f.next();
  d.limb([18, 0], [0, 0], 8, 4, HIDE);
  return f;
}

const RIM = hex('#60e0d0'); // the cistern's cold light

export function buildLockWyrmSheet(): SheetBuilder {
  const b = new SheetBuilder(HEAD, HEAD, HEAD / 2, HEAD / 2);
  const each = <T>(fn: (a: number) => T) => Array.from({ length: LW_DIRS }, (_, i) => fn((i / LW_DIRS) * Math.PI * 2));
  JAWS.forEach((open, j) => b.add('jaw' + j, ...each((a) => head(a, open).resolve({ rim: RIM, contour: 0.1 }))));
  return b;
}

/** Body pieces (64x64, centered): 'seg0'..'seg2' and 'tail', each LW_DIRS headings x 2 fin beats (frame = heading * 2 + beat); 'harpoon'. */
export function buildLockWyrmBodySheet(): SheetBuilder {
  const b = new SheetBuilder(SEG, SEG, SEG / 2, SEG / 2);
  const each = (fn: (a: number, beat: number) => FormCanvas) => Array.from({ length: LW_DIRS * 2 }, (_, i) => fn((Math.floor(i / 2) / LW_DIRS) * Math.PI * 2, i % 2).resolve({ rim: RIM, contour: 0.1 }));
  LW_SIZES.forEach((s, k) => b.add('seg' + k, ...each((a, beat) => segment(a, s, beat, k === 0))));
  b.add('tail', ...each((a, beat) => tail(a, beat)));
  // the broken harpoon standing in its back: a shaft, a ring to catch
  const h = new FormCanvas(SEG, SEG);
  h.limb(32, 44, 34, 12, 2.2, 2.2, WOOD);
  h.limb(31, 46, 30, 52, 2.6, 1, IRON);
  h.next();
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; h.dot(34 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, IRON, 0.7); h.dot(34 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, IRON, 0.5); }
  b.add('harpoon', h.resolve({ rim: RIM }));
  return b;
}

// ---------------------------------------------------------------- the Lock's props

export const LK_CELL = { w: 80, h: 96, ax: 40, ay: 95 };

/** The Sunken Lock's machinery (80x96, anchored bottom middle). */
export function buildLockPropSheet(): SheetBuilder {
  const b = new SheetBuilder(LK_CELL.w, LK_CELL.h, LK_CELL.ax, LK_CELL.ay);
  const cx = LK_CELL.ax, by = LK_CELL.ay;
  const mk = (draw: (f: FormCanvas) => void) => {
    const f = new FormCanvas(LK_CELL.w, LK_CELL.h);
    draw(f);
    return f.resolve({ rim: RIM });
  };
  // the lock gate: a slab of black oak bound in iron, toothed along its foot
  b.add('gate', mk((f) => {
    f.poly([[cx - 30, by - 92], [cx + 30, by - 92], [cx + 30, by - 8], [cx - 30, by - 8]], WOOD, (x, y) => 0.35 + (x - cx) * 0.004 + Math.sin(x * 0.9) * 0.08 - (y - by + 50) * 0.002);
    for (const y of [86, 52, 18]) { f.next(); f.poly([[cx - 32, by - y - 5], [cx + 32, by - y - 5], [cx + 32, by - y + 3], [cx - 32, by - y + 3]], IRON, 0.5); for (let k = 0; k < 5; k++) f.dot(cx - 26 + k * 13, by - y - 1, IRON, 0.9); }
    f.next();
    for (let k = 0; k < 6; k++) f.limb(cx - 26 + k * 10.4, by - 9, cx - 26 + k * 10.4, by, 4, 0.6, IRON);
  }));
  // the counterweight: a block of iron on a ring
  b.add('weight', mk((f) => {
    f.poly([[cx - 22, by - 44], [cx + 22, by - 44], [cx + 26, by], [cx - 26, by]], IRON, (x, y) => 0.3 + (x - cx) * 0.006 - (y - by + 20) * 0.004);
    f.next();
    for (const y of [36, 10]) f.poly([[cx - 26, by - y - 3], [cx + 26, by - y - 3], [cx + 26, by - y + 2], [cx - 26, by - y + 2]], IRON, 0.62);
    for (let k = 0; k < 4; k++) f.limb(cx - 18 + k * 12, by, cx - 18 + k * 12, by + 0.5, 4, 3, IRON);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; f.dot(cx + Math.cos(a) * 6, by - 52 + Math.sin(a) * 6, IRON, 0.7); }
  }));
  // a winch pawl: a ratchet wheel and its catch, set (0) or knocked out (1)
  const pawl = (out: boolean) => mk((f) => {
    f.ball(cx, by - 14, 12, 12, IRON, 0, 0.6);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; f.limb(cx + Math.cos(a) * 10, by - 14 + Math.sin(a) * 10, cx + Math.cos(a + 0.3) * 15, by - 14 + Math.sin(a + 0.3) * 15, 2.4, 0.6, IRON); }
    f.next();
    f.disc(cx, by - 14, 3, WOOD, 0.4);
    f.limb(cx + 14, by - 30, out ? cx + 26 : cx + 8, out ? by - 20 : by - 22, 2.6, 2, RUST);
  });
  b.add('pawl', pawl(false), pawl(true));
  return b;
}
