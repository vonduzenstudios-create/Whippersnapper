// The Ossuary Wyrm, redrawn with form shading (0.21.0).
//
// The Wyrm was always a puppet: a skull and a chain of vertebrae that the boss strings along
// its path. But its pieces used to be one drawing each, turned by the GPU, which smears the
// pixels and turns the shading with them (lit from below when it swims upside down).
// Now every piece is drawn again for each of 32 headings, so the pixels stay crisp and the
// light always falls from the same side of the screen. The boss just picks the frame nearest
// to a piece's heading (`wyrmDir`), and never rotates or scales a sprite.
import { SheetBuilder } from './pixel';
import { FormCanvas, ramp, turned, V } from './form';

/** How many headings each piece is drawn for. */
export const WYRM_DIRS = 32;
/** The frame number (0..WYRM_DIRS-1) for a heading in radians (0 = right, clockwise on screen). */
export const wyrmDir = (a: number) => ((Math.round((a / (Math.PI * 2)) * WYRM_DIRS) % WYRM_DIRS) + WYRM_DIRS) % WYRM_DIRS;
/** The vertebrae get smaller down the body: these are the sizes they are drawn at. */
export const WYRM_SIZES = [1, 0.86, 0.72, 0.58];
/** How far the jaw hangs open in each `jaw<n>` animation. */
const JAWS = [0, 0.35, 0.7, 1.1];

// old bone: warm ivory in the light, falling to a bruised violet-brown
const BONE = ramp('#24161e', '#4c3840', '#80695a', '#b09c7c', '#dccfae', '#f8f2dc');
const HORN = ramp('#1a1016', '#382828', '#5c483c', '#867058', '#b4a07c');
const MAW = ramp('#10040a', '#34080e', '#6a1216'); // inside the mouth and the sockets
const FIRE = ramp('#b01c08', '#ff4018', '#ffb040', '#fff2a8'); // the light burning in its eye

const SKULL = 96; // the skull's cell
const BODY = 56; // a vertebra's cell

/** The skull, side on: horns swept back, a long toothed snout, a hinged jaw, a fire in the socket. */
function skull(a: number, open: number): FormCanvas {
  const f = new FormCanvas(SKULL, SKULL);
  const d = turned(f, SKULL / 2, SKULL / 2, a, true, 1.1);
  // the far horn, in shadow
  f.bias = -0.18;
  d.limb([-8, -7], [-23, -14], 3, 2, HORN);
  d.limb([-23, -14], [-32, -9], 2, 0.7, HORN);
  f.bias = 0;
  // the lower jaw swings from a hinge behind the eye
  const ja = open * 0.5, jc = Math.cos(ja), js = Math.sin(ja);
  const J = (x: number, y: number): V => [-9 + x * jc - y * js, 5 + x * js + y * jc]; // jaw space: origin at the hinge
  if (open > 0.2) {
    // the dark of its throat between the jaws
    f.next();
    const top: V[] = [[-4, 4], [30, 4]], low = [J(36, 1), J(4, 2)];
    f.poly([...top, ...low].map((p) => d.T(...p)), MAW, 0.45);
  }
  f.next();
  f.bias = -0.2;
  d.limb(J(0, 0), J(8, 4), 4, 3.2, BONE); // the ramus, up to the hinge
  d.limb(J(8, 4), J(38, 2), 3.2, 1.6, BONE);
  f.bias = 0;
  for (let i = 0; i < 6; i++) {
    const x = 13 + i * 4.4, len = i === 5 ? 6 : 3 + (i % 2);
    d.stroke(J(x, 1), J(x + 0.6, 1 - len), BONE, 0.92, i === 5 ? 2 : 1.5);
  }
  // cranium, brow, the long snout and its bulb of a nose
  f.next();
  f.bias = -0.13;
  d.ball(-7, -3, 12.5, 10, BONE);
  d.limb([-2, -2.5], [29, 0], 7.5, 3.6, BONE);
  d.ball(30, -0.5, 4, 3.8, BONE);
  d.ball(2, -8, 6.5, 3.6, BONE);
  d.limb([-12, 4], [9, 4.5], 2.6, 2, BONE); // cheekbone
  f.bias = 0;
  // old damage: cracks over the dome and down the snout
  d.groove([-15, -7], [-10, -3], -0.22);
  d.groove([-10, -3], [-12, 1], -0.22);
  d.groove([11, -6], [17, -4], -0.2);
  d.groove([17, -4], [19, -1], -0.2);
  d.groove([8, -4], [26, -2.6], 0.12); // the ridge of the snout catches the light
  // upper teeth, a long fang at the front
  for (let i = 0; i < 7; i++) {
    const x = 5 + i * 3.9, len = i === 6 ? 7 : 3 + ((i * 2) % 3);
    d.stroke([x, 4.5], [x + 0.8, 4.5 + len], BONE, 0.95, i === 6 ? 2 : 1.5);
  }
  // the socket, and the fire that lives in it
  f.next();
  d.ball(3, -2.6, 4.6, 3.6, MAW);
  d.ball(27, -1.6, 1.6, 1.1, MAW); // nostril
  f.next();
  d.ball(3.6, -2.4, 2.2, 2, FIRE, 0.5);
  d.dot(4.2, -3, FIRE, 0.99);
  // the near horn, ringed, sweeping back over the skull
  f.next();
  d.limb([-4, -9], [-17, -20], 3.4, 2.3, HORN);
  d.limb([-17, -20], [-29, -21], 2.3, 0.7, HORN);
  for (let i = 0; i < 4; i++) d.groove([-6 - i * 3.4, -8 - i * 3.6], [-9 - i * 3.4, -13 - i * 2.6], -0.2);
  // a row of spurs down the back of the skull
  d.limb([-15, -9], [-21, -11], 1.8, 0.5, BONE);
  d.limb([-18, -3], [-24, -3.5], 1.8, 0.5, BONE);
  return f;
}

/**
 * A vertebra, seen flat like a snake's skeleton: the spool of the spine with a knob of bone on
 * it, and on both sides either a long rib swept back (`rib`) or a short spur.
 */
function vertebra(a: number, rib: boolean, size: number): FormCanvas {
  const f = new FormCanvas(BODY, BODY);
  const d = turned(f, BODY / 2, BODY / 2, a, false, size);
  f.bias = -0.12;
  for (const s of [-1, 1]) {
    f.next();
    if (rib) {
      d.limb([2, s * 5], [-3, s * 14], 2.4, 1.9, BONE);
      d.limb([-3, s * 14], [-10, s * 20], 1.9, 0.7, BONE);
    } else {
      d.limb([1, s * 5], [-3, s * 11], 2.2, 0.7, BONE);
    }
  }
  // the knuckles where it meets its neighbors
  f.next();
  f.bias = -0.3;
  d.ball(9, 0, 3.4, 4.6, BONE);
  d.ball(-9, 0, 3.4, 4.6, BONE);
  // the spool of the spine, a flange at each end
  f.next();
  f.bias = -0.16;
  d.ball(0, 0, 8.4, 6.6, BONE);
  d.groove([5, -4], [5, 4], -0.2);
  d.groove([-5, -4], [-5, 4], -0.2);
  f.next();
  f.bias = -0.04;
  d.limb([3, 0], [-9, 0], 3.2, 1.2, BONE); // the spine's ridge, a blunt spike pointing back
  f.bias = 0;
  return f;
}

/** The tail's last bone: a barbed blade. */
function tail(a: number): FormCanvas {
  const f = new FormCanvas(BODY, BODY);
  const d = turned(f, BODY / 2, BODY / 2, a, false);
  // the body is ahead of it, so the blade points back along -x
  for (const s of [-1, 1]) {
    f.next();
    d.limb([-2, s * 3], [6, s * 10], 2, 0.5, BONE);
  }
  f.next();
  f.bias = -0.14;
  d.ball(6, 0, 5, 5, BONE);
  d.limb([4, 0], [-22, 0], 4.6, 0.6, BONE, 0.8);
  d.groove([2, 0], [-18, 0], 0.14);
  return f;
}

const headings = (draw: (a: number) => FormCanvas) => Array.from({ length: WYRM_DIRS }, (_, i) => draw((i / WYRM_DIRS) * Math.PI * 2).resolve());

/** The skull: `jaw0`..`jaw3` (shut to wide), each WYRM_DIRS headings. `skull` is the four jaws facing right. */
export function buildWyrmSheet(): SheetBuilder {
  const b = new SheetBuilder(SKULL, SKULL, SKULL / 2, SKULL / 2);
  JAWS.forEach((open, j) => b.add('jaw' + j, ...headings((a) => skull(a, open))));
  b.anims.skull = JAWS.map((_, j) => b.anims['jaw' + j][0]);
  return b;
}

/** The body: `rib<size>` and `plain<size>` for each of WYRM_SIZES, and `tail`, each WYRM_DIRS headings. */
export function buildWyrmBodySheet(): SheetBuilder {
  const b = new SheetBuilder(BODY, BODY, BODY / 2, BODY / 2);
  WYRM_SIZES.forEach((size, k) => {
    b.add('rib' + k, ...headings((a) => vertebra(a, true, size)));
    b.add('plain' + k, ...headings((a) => vertebra(a, false, size)));
  });
  b.add('tail', ...headings(tail));
  return b;
}
