// More of the castle's creatures, redrawn with form shading (0.24.0): the Rot Ooze, the Grave
// Grub and its moth, the Gravehand, the Rustling Tome, the Restless Chair and the Gallows
// Spider. See art_beasts.ts for how the redraw keeps each enemy's timing.
import { SheetBuilder, PixelCanvas } from './pixel';
import { FormCanvas, ramp, Ramp, V } from './form';

const TAU = Math.PI * 2;
const cycle = (n: number, draw: (t: number) => PixelCanvas) => Array.from({ length: n }, (_, i) => draw(i / n));

const BONE = ramp('#342c2a', '#665e50', '#9a927a', '#c4bc9e', '#e2dabc', '#f8f4e0');
const DARK = ramp('#0a0408', '#1c0a10', '#4a0a10');
const DIRT = ramp('#160e08', '#3a2a1c', '#5a4030', '#7a5a40', '#987650');
const EYE_R = ramp('#901010', '#ff4040', '#ffb0a0');
const EYE_Y = ramp('#a07010', '#ffd040', '#fff4b0');

/** Churned earth: a low mound on the floor line `y`, `w` half wide. */
function earth(f: FormCanvas, y: number, w: number, h = 3) {
  f.next();
  f.ball(16, y, w, h, DIRT, 0, 0.9);
}

// ---------------------------------------------------------------- rot ooze

const SLIME = ramp('#10200c', '#285018', '#4a8424', '#7ab838', '#b0e058', '#e8ffa8');

/**
 * Three sizes of ooze (big, mid, small): a glowing bead of gel with no limbs at all. Each has a
 * resting and a squashed frame (`<size>`), a midair stretch (`<size>Air`) and a slow pulse
 * while it sits (`<size>Pulse`). It is drawn lit from inside (a bright core, a darker skin, the
 * things it has swallowed hanging in it); the Ooze itself is shown a little see-through and
 * glowing by its sprite (enemies_extra.ts).
 */
export function buildOozeSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 28, 16, 26);
  const draw = (r: number, squash: number) => {
    const f = new FormCanvas(32, 28);
    f.clipY = 26;
    const rx = r * (1 + squash * 0.25), ry = r * (0.8 - squash * 0.2), cy = 26 - ry;
    // it is thick and slow: where it rests, its own weight piles it up in rolls on the floor,
    // each sagging out a little wider than the one above (more of them the harder it lands)
    if (squash > -0.5) {
      const sag = 1 + Math.max(0, squash) * 0.12;
      f.bias = -0.3;
      f.ball(16, 26 - ry * 0.08, Math.min(15, rx * 1.2 * sag), ry * 0.17 + 0.6, SLIME);
      f.next();
      f.bias = -0.24;
      f.ball(16 + rx * 0.04, 26 - ry * 0.3, rx * 1.1 * sag, ry * 0.2 + 0.5, SLIME);
      f.next();
      f.bias = -0.2;
      f.ball(16 - rx * 0.03, 26 - ry * 0.52, rx * 1.03, ry * 0.24, SLIME);
      f.next();
    }
    // the skin of it
    f.bias = -0.16;
    f.ball(16, cy - (squash > -0.5 ? ry * 0.12 : 0), rx * (squash > -0.5 ? 0.96 : 1), ry * (squash > -0.5 ? 0.9 : 1), SLIME);
    // the glow inside: paler toward the middle, as light passes through it
    f.next();
    f.bias = 0.06;
    f.ball(16, cy + ry * 0.12, rx * 0.72, ry * 0.68, SLIME, 0, 0.45);
    f.bias = 0.22;
    f.ball(16 - rx * 0.05, cy + ry * 0.2, rx * 0.42, ry * 0.4, SLIME, 0, 0.3);
    f.bias = 0;
    // things caught inside, hanging in the gel: a little skull and a bone
    if (r > 6) {
      f.next();
      f.bias = -0.1;
      f.ball(13, cy + 1, r * 0.24, r * 0.24, BONE);
      f.limb(17, cy + 3, 20, cy + 1, 0.6, 0.6, BONE);
      f.bias = 0;
      f.dot(12, cy + 1, SLIME, 0.1);
      f.dot(14, cy + 1, SLIME, 0.1);
    }
    // bubbles rising in it, a wet highlight, two eyes
    f.next();
    f.dot(16 + rx * 0.3, cy + ry * 0.45, SLIME, 0.99);
    if (r > 4.5) f.dot(16 - rx * 0.5, cy + ry * 0.1, SLIME, 0.9);
    f.stroke(16 - rx * 0.45, cy - ry * 0.62, 16 - rx * 0.1, cy - ry * 0.74, SLIME, 0.99);
    f.dot(16 + rx * 0.35, cy - ry * 0.2, EYE_Y, 0.95);
    f.dot(16 + rx * 0.55, cy - ry * 0.2, EYE_Y, 0.95);
    return f.resolve({ ink: SLIME[0] });
  };
  const sizes: [string, number][] = [['big', 11], ['mid', 7.5], ['small', 4.5]];
  for (const [name, r] of sizes) {
    b.add(name, draw(r, 0), draw(r, 1));
    b.add(name + 'Air', draw(r, -0.8));
    b.add(name + 'Pulse', ...cycle(8, (t) => draw(r, 0.22 * Math.sin(t * TAU)))); // swelling and settling as it sits
  }
  return b;
}

// ---------------------------------------------------------------- grave grub

const FLESH = ramp('#4a2c28', '#8a6050', '#b89078', '#d8b8a0', '#f2dcc8');
const SILK = ramp('#3e3a34', '#6a6458', '#928c7e', '#b8b0a0', '#dcd6c8');
const SICK = ramp('#5a8020', '#c8f070'); // the glow inside a splitting cocoon

export function buildGrubSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 40, 16, 36);
  // the hump of earth that shows where it is digging
  const mound = (i: number) => {
    const f = new FormCanvas(32, 40);
    f.ball(16, 36, 9 + i, 4 - i * 0.5, DIRT, 0, 0.9);
    for (let k = 0; k < 3; k++) f.dot(9 + k * 6 + i, 33 - (k % 2), DIRT, 0.75); // clods
    return f.resolve();
  };
  /** The grub reared up: `h` = how far out of the ground (0..1), `open` mouth. */
  const rear = (h: number, open: boolean) => {
    const f = new FormCanvas(32, 40);
    const segs = 6, top = 36 - h * 30;
    // fat segments, each its own ring so the creases between them show
    for (let k = 0; k <= segs; k++) {
      const y = 36 - (k / segs) * (36 - top);
      f.next();
      f.ball(16 + Math.sin(k * 0.8) * 1.5, y, 5 - Math.abs(k - 2) * 0.4, 3.4, FLESH);
    }
    f.next();
    if (open) {
      // a ring of teeth round a red throat
      f.disc(16, top, 4, DARK, 0.5);
      for (let k = 0; k < 8; k++) f.dot(16 + Math.cos((k / 8) * TAU) * 3.5, top + Math.sin((k / 8) * TAU) * 3.5, BONE, 0.95);
    } else f.stroke(14, top - 1, 18, top - 1, DARK, 0.5);
    earth(f, 36, 10); // churned earth at the hole
    return f.resolve();
  };
  /** Lying stranded on the surface, curling. */
  const flop = (ph: number) => {
    const f = new FormCanvas(32, 40);
    for (let k = 0; k <= 6; k++) {
      f.next();
      f.ball(5 + k * 3.6, 32 - Math.sin(k * 0.6 + ph) * 2 - (k === 6 ? 1 : 0), 2.6, 3.6, FLESH);
    }
    const lift = Math.sin(ph) * 1.2;
    f.next();
    f.disc(28, 30 - lift, 2.4, DARK, 0.5);
    f.dot(29, 29 - lift, BONE, 0.95);
    f.dot(27, 31 - lift, BONE, 0.95);
    return f.resolve();
  };
  b.add('mound', mound(0), mound(1));
  b.add('burst', rear(1, true));
  b.add('dig', rear(0.4, false));
  b.smooth('wriggle', 2, ...cycle(4, (t) => flop(t * TAU)));
  /** Left stranded too long, it wraps itself in grey silk: a lumpy cocoon that swells and splits (`i` = 0..2). */
  const cocoon = (i: number) => {
    const f = new FormCanvas(32, 40);
    const h = 13 + i * 2, w = 7 + i;
    f.ball(16, 36 - h / 2, w, h / 2, SILK);
    // the threads wound round it, and lumps moving under the silk
    for (let k = 0; k < 5; k++) {
      const y = 36 - h + 3 + k * (h / 5);
      f.groove(16 - w + 1, y, 16 + w - 1, y + 2, -0.18);
    }
    f.groove(13 + i, 30 - i * 2, 14 + i, 30 - i * 2, 0.2);
    f.groove(18 - i, 27, 18 - i, 28, 0.2);
    if (i === 2) {
      // it splits, and something glows inside
      f.stroke(16, 36 - h + 2, 15, 36 - h / 2, DARK, 0.3, 1.5);
      f.dot(16, 36 - h + 5, SICK, 0.9);
      f.dot(15, 36 - h + 8, SICK, 0.9);
    }
    f.next();
    f.ball(16, 36, w + 2, 2, DIRT, 0, 0.9);
    return f.resolve();
  };
  b.add('cocoon', cocoon(0), cocoon(1), cocoon(2));
  return b;
}

// ---------------------------------------------------------------- grave moth

const M_WING = ramp('#262422', '#4a4640', '#8a8478', '#b2ac9e');
const M_BODY = ramp('#2e261e', '#6a5a48', '#a89a80');
const SPOT = ramp('#3a5010', '#a8e050');

/**
 * A Grave Moth, hatched from a grub left too long on the surface. Ragged grey wings with
 * sickly green eyespots and a fat, dusty body. Frames: `fly` (a wing beat) and `dive` (wings
 * swept back). AI in game/enemies_extra.ts.
 */
export function buildMothSheet(): SheetBuilder {
  const b = new SheetBuilder(24, 20, 12, 10);
  /** `lift`: how far the wings are raised (-1 down .. 1 up); `swept`: folded back for a dive. */
  const draw = (lift: number, swept = false) => {
    const f = new FormCanvas(24, 20);
    const cx = 12, cy = 11;
    // the far wing, darker, behind the body
    const tipY = cy - lift * 8, tipX = swept ? cx - 9 : cx - 2;
    f.poly([[cx, cy - 1], [tipX - 3, tipY - 1], [tipX + 1, tipY + 2], [cx + 2, cy + 1]], M_WING, 0.3);
    // the body: a fat dusty abdomen in stripes, a fuzzy head with red eyes and feathery antennae
    f.next();
    f.ball(cx - 2, cy + 1, 4.5, 2.5, M_BODY);
    for (let k = 0; k < 3; k++) f.groove(cx - 5 + k * 2, cy - 1, cx - 5 + k * 2, cy + 3, 0.18);
    f.next();
    f.ball(cx + 3, cy, 2.2, 2.2, M_BODY);
    f.dot(cx + 4, cy - 1, EYE_R, 0.6);
    f.stroke(cx + 4, cy - 2, cx + 7, cy - 5, M_WING, 0.3);
    f.stroke(cx + 3, cy - 2, cx + 5, cy - 6, M_WING, 0.3);
    // the near wing, ragged at the edge, with its eyespot
    const nx = swept ? cx - 10 : cx - 4, ny = cy - lift * 9 + (lift < 0 ? 3 : 0);
    f.next();
    f.poly([[cx + 1, cy], [nx - 4, ny - 1], [nx - 2, ny + 4], [nx + 2, ny + 5], [cx + 2, cy + 2]], M_WING, (x, y) => 0.5 + (x - nx) * 0.035 - (y - ny) * 0.03);
    const sx = (cx + nx) / 2 - 1, sy = (cy + ny) / 2 + 1;
    f.dot(sx, sy, SPOT, 0.9);
    f.dot(sx + 1, sy, SPOT, 0.9);
    f.dot(sx, sy + 1, SPOT, 0.1);
    f.dot(nx - 3, ny + 1, M_WING, 0.1); // a tatter
    return f.resolve();
  };
  b.smooth('fly', 2, ...cycle(6, (t) => draw(0.1 + 0.9 * Math.cos(t * TAU))));
  b.add('dive', draw(0.3, true));
  return b;
}

// ---------------------------------------------------------------- gravehand

const DEAD = ramp('#283626', '#586a52', '#84987a', '#a8b898', '#cadab8');
const NAIL = ramp('#8a8260', '#d8d0a8');

/** A dead hand clawing out of the ground. AI in game/enemies_extra.ts. */
export function buildHandSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 40, 16, 36);
  /** The warning: bony fingertips poking through the soil. */
  const tips = (i: number) => {
    const f = new FormCanvas(32, 40);
    earth(f, 36, 11);
    f.next();
    for (let k = 0; k < 4; k++) {
      const x = 9 + k * 4.5, top = 32 - ((k + i) % 2) * 3;
      f.limb(x, 36, x + (k - 1.5) * 0.4, top, 0.8, 0.6, DEAD);
      f.dot(x + (k - 1.5) * 0.4, top, NAIL, 0.9);
    }
    return f.resolve();
  };
  /** The whole hand reared up. `curl` 0 = fingers spread, 1 = clenched; `lean` tilts it. */
  const hand = (reach: number, curl: number, lean: number) => {
    const f = new FormCanvas(32, 40);
    const wristY = 36 - reach, palmY = wristY - 4, px = 16 + lean * (reach / 36);
    f.limb(16, 36, px, wristY, 3, 2.6, DEAD); // the forearm, tendons standing out
    f.groove(15, 35, px - 1, wristY + 1, -0.16);
    f.next();
    f.ball(px, palmY, 6, 5, DEAD);
    f.groove(px - 3, palmY + 1, px + 2, palmY - 1, -0.16); // the crease of the palm
    for (let k = 0; k < 5; k++) {
      // spread open or bent inward over the palm; the outer two are the thumb and little finger
      const open = -0.95 + k * 0.475;
      const ang = open * (1 - 0.75 * curl);
      const len = (k === 0 || k === 4 ? 7 : 9.5) * (1 - 0.35 * curl);
      const bx = px + (k - 2) * 2.4, by = palmY - 3;
      const tx = bx + Math.sin(ang) * len, ty = by - Math.cos(ang) * len;
      f.next();
      f.limb(bx, by, tx, ty, 1.2, 0.8, DEAD);
      f.dot(tx, ty, NAIL, 0.9);
    }
    earth(f, 36, 11);
    return f.resolve({ contour: 0.16 });
  };
  /** The warning: the dirt heaving under her feet, clods jumping, a fingertip breaking through. */
  const rumble = (i: number) => {
    const f = new FormCanvas(32, 40);
    f.ball(16, 36, 10 + i, 2.5 + i * 0.5, DIRT, 0, 0.9);
    for (let k = 0; k < 4; k++) f.dot(8 + k * 5 + i * 2, 32 - ((k + i) % 2) * 2, DIRT, k % 2 ? 0.75 : 0.5); // flying clods
    if (i) {
      f.next();
      f.limb(15, 36, 15, 33, 0.8, 0.6, DEAD);
      f.dot(15, 33, NAIL, 0.9);
    }
    return f.resolve();
  };
  /**
   * Closed round her ankles, drawn IN FRONT of her: a wrist rising straight up out of the
   * dirt, a palm cupped under her ankles, and four fingers reaching UP round her shins with
   * their tips curling in over them (the gaps between the fingers let her legs show).
   * The thumb hooks across the front. `sq` squeezes it a pixel tighter.
   */
  const fist = (sq: number) => {
    const f = new FormCanvas(32, 40);
    f.ball(16, 36, 10, 2, DIRT, 0, 0.9);
    // the wrist, straight up out of the ground (narrower than the hand)
    f.next();
    f.limb(16, 36, 16, 30, 1.5, 1.5, DEAD);
    // the palm, cupped under her ankles
    f.ball(16, 29, 4, 1.6, DEAD);
    // four long fingers reaching straight up her shins, only the tips hooking in over them
    for (let k = 0; k < 4; k++) {
      const bx = 10.5 + k * 3.6, inward = k < 2 ? 1 : -1;
      const top = 21 + sq + (k === 0 || k === 3 ? 1.5 : 0);
      f.stroke(bx, 28, bx + inward * 0.4, top + 2, DEAD, 0.7);
      f.stroke(bx + inward * 0.4, top + 2, bx + inward * (1.6 + sq), top, DEAD, 0.7); // the hooked tip
      f.dot(bx, 25.5, DEAD, 0.95); // knuckle
      f.dot(bx + inward * (1.6 + sq), top + 1, NAIL, 0.9);
    }
    // the thumb hooks across the front of her ankles
    f.stroke(11, 29.5, 16 - sq, 27.5, DEAD, 0.7);
    f.dot(16.5 - sq, 28, NAIL, 0.9);
    return f.resolve();
  };
  /** Swimming under the floor after her: a mound of soil pushed along, broken earth behind it. */
  const furrow = (i: number) => {
    const f = new FormCanvas(32, 40);
    for (let k = 0; k < 6; k++) f.disc(12 - k * 2 + i, 36 - ((k + i) % 2), 1.2, DIRT, k % 2 ? 0.7 : 0.45); // broken earth behind
    f.next();
    f.ball(20, 36, 8, 3.5 + i * 0.5, DIRT, 0, 0.9);
    f.dot(22, 33 - i, NAIL, 0.9); // a fingernail scraping through the soil
    if (i) f.disc(28, 33, 1.2, DIRT, 0.7); // a clod thrown up ahead
    return f.resolve();
  };
  b.add('tips', tips(0), tips(1));
  b.add('furrow', furrow(0), furrow(1));
  b.add('rumble', rumble(0), rumble(1));
  b.smooth('fist', 2, ...cycle(4, (t) => fist(0.5 - 0.5 * Math.cos(t * TAU))));
  // groping for her: the fingers flex and the wrist sways
  b.smooth('reach', 2, ...cycle(4, (t) => hand(18, 0.075 - 0.075 * Math.cos(t * TAU), 0.5 - 0.5 * Math.cos(t * TAU))));
  b.add('grip', hand(15, 1, 0), hand(15, 1, 1.5));
  b.add('low', hand(7, 0.5, 0));
  return b;
}

// ================================================================ the Ashen Library (0.6.0)

// ---------------------------------------------------------------- rustling tome

const COVER = ramp('#2a0812', '#4a1020', '#7a1e34', '#b03a52', '#d8627c');
const GILT = ramp('#6a4c14', '#a07828', '#e0b850', '#fff0a0');
const PAGE = ramp('#8a7c58', '#c8b890', '#efe4c4', '#fffaf0');
const INK = ramp('#1a1020', '#3a2a40');
const RIBBON = ramp('#7a1420', '#d03040');

/**
 * A grimoire that learned to fly. 40x32 cells, anchored at the center.
 *   shelf / peek  spine out, sleeping among the other books (peek has glowing eyes)
 *   flap          wide open and beating its two halves like wings, seen from the pages
 *   spew          held open, glowing at the gutter, leaves tearing loose: it is spitting pages
 */
export function buildTomeSheet(): SheetBuilder {
  const b = new SheetBuilder(40, 32, 20, 16);
  const rect = (f: FormCanvas, x: number, y: number, w: number, h: number, r: Ramp, lit: number | ((x: number, y: number) => number)) =>
    f.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r, lit);
  /** The spine: rounded like a bar, with three gilt bands. */
  const spine = (f: FormCanvas, x: number, y: number, w: number, h: number) => {
    f.next();
    rect(f, x, y, w, h, COVER, (px) => 0.82 - ((px - x) / w) * 0.6);
    for (const by of [y + 2, y + Math.floor(h / 2), y + h - 3]) f.stroke(x, by, x + w - 1, by, GILT, 0.6);
  };
  const ribbonTail = (f: FormCanvas, x: number, y: number) => {
    f.stroke(x, y, x + 1, y + 4, RIBBON, 0.7, 1.4);
    f.dot(x, y + 5, RIBBON, 0.7);
    f.dot(x + 2, y + 5, RIBBON, 0.3);
  };

  // asleep on a shelf: a tall spine with a ribbon
  const shelf = (peek: boolean) => {
    const f = new FormCanvas(40, 32);
    spine(f, 17, 8, 6, 16);
    ribbonTail(f, 21, 24);
    if (peek) {
      rect(f, 18, 12, 2, 2, INK, 0.2);
      rect(f, 21, 12, 2, 2, INK, 0.2);
      f.dot(19, 12, EYE_Y, 0.6);
      f.dot(22, 12, EYE_Y, 0.6);
    }
    return f.resolve();
  };
  b.add('shelf', shelf(false));
  b.add('peek', shelf(true));

  /**
   * Open, seen from the page side: two blocks of pages meeting at the gutter, the boards of
   * the cover showing only as a rim round them. `u` raises (1) or lowers (-1) the outer edges
   * like wings. `spew` 0..1 opens a glowing maw along the gutter and tears leaves loose.
   */
  const open = (u: number, spew = -1) => {
    const f = new FormCanvas(40, 32);
    const W = 15 - Math.abs(u) * 3, oy = -u * 7, spewing = spew >= 0;
    for (const dir of [-1, 1]) {
      const ox = 20 + dir * W;
      // the cover's board, a pixel proud of the pages all round, gilt at its corners
      f.next();
      f.poly([[20, 8.6], [ox + dir, 7.4 + oy], [ox + dir, 25.6 + oy], [20, 25.4]], COVER, dir < 0 ? 0.3 : 0.5);
      f.dot(ox, 8 + oy, GILT, 0.6);
      f.dot(ox, 25 + oy, GILT, 0.6);
      // the block of pages: bright where it bows up, falling into shadow at the gutter
      f.next();
      f.poly([[20, 10], [ox - dir * 0.5, 9 + oy], [ox - dir * 0.5, 24 + oy], [20, 24]], PAGE, (px) => {
        const d = Math.abs(px - 20) / W;
        return 0.3 + Math.sin(Math.min(1, d * 1.15) * Math.PI * 0.6) * 0.6 - (dir < 0 ? 0.1 : 0);
      });
      // lines of writing, and the page edges fanned along the outer side
      for (let k = 0; k < 4; k++) {
        const y = 12.5 + k * 3, sl = (oy / W) * 1;
        f.groove(20 + dir * 3, y + sl * 3, 20 + dir * (W - 3), y + sl * (W - 3), -0.24);
      }
      f.groove(ox - dir * 1.5, 10 + oy, ox - dir * 1.5, 23 + oy, -0.14);
    }
    // the gutter where the leaves meet, and the ribbon hanging out of it
    f.next();
    f.stroke(20, 10, 20, 24, PAGE, 0.02);
    ribbonTail(f, 20, 25);
    if (spewing) {
      // a maw opens down the gutter, lit from inside, with a row of teeth each side
      const w = 1.2 + spew * 1.8;
      f.next();
      f.poly([[20, 11], [20 + w + 1, 17], [20, 23], [20 - w - 1, 17]], INK, 0.2);
      f.poly([[20, 13], [20 + w, 17], [20, 21], [20 - w, 17]], GILT, 0.95);
      for (let k = 0; k < 3; k++) {
        f.dot(20 - w - 0.4 + k * 0.5, 14 + k * 1.2, BONE, 0.95);
        f.dot(20 + w + 0.4 - k * 0.5, 14 + k * 1.2, BONE, 0.95);
        f.dot(20 - w - 0.4 + k * 0.5, 20 - k * 1.2, BONE, 0.8);
        f.dot(20 + w + 0.4 - k * 0.5, 20 - k * 1.2, BONE, 0.8);
      }
      // leaves tearing loose and lifting off both pages
      for (let k = 0; k < 4; k++) {
        const side = k % 2 ? 1 : -1, r = ((spew + k * 0.27) % 1) * 9;
        const x = 20 + side * (5 + r), y = 14 + (k - 1.5) * 2.2 + oy * 0.3 - r * 0.5;
        f.next();
        f.poly([[x - 2, y - 1], [x + 1.6, y - 2], [x + 2, y + 1], [x - 1.4, y + 2]], PAGE, k % 2 ? 0.95 : 0.75);
      }
    }
    // two angry ink eyes, one on each page
    for (const dir of [-1, 1]) {
      const ex = 20 + dir * 6, ey = 14 + oy * 0.25;
      f.next();
      f.disc(ex, ey, spewing ? 2 : 1.6, INK, 0.2);
      f.dot(ex, ey, EYE_Y, spewing ? 0.95 : 0.6);
      f.stroke(ex - dir * 2.6, ey - 3.2, ex + dir * 1.6, ey - 1.6, INK, 0.2); // a scowl
    }
    return f.resolve();
  };
  b.smooth('flap', 2, ...cycle(8, (t) => open(0.1 + 0.9 * Math.cos(t * TAU))));
  // spitting pages: held wide and shuddering, the maw working
  b.add('spew', ...cycle(6, (t) => open(0.55 + 0.12 * Math.sin(t * TAU * 2), t)));
  return b;
}

// ---------------------------------------------------------------- restless chair

const C_WOOD = ramp('#160a06', '#2a160c', '#5a3420', '#94603a', '#ba8858');
const VELVET = ramp('#2a060e', '#4a0e18', '#7a1e2a', '#b0384a', '#d46070');
const HOLE = ramp('#140a08', '#241410');

/**
 * A high-backed reading chair, three-quarter view, 32x32, anchored at the cell center (the
 * legs end on the bottom row, so `feet` is 16). The plain chair is also the library's prop
 * chair, so the enemy looks exactly like the furniture until it wakes.
 *   sit     an ordinary chair
 *   wake    the same, with two eyes lit in the carved backrest
 *   float   hovering, legs kicking
 *   charge  legs swept back, eyes narrowed
 */
export function buildChairSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 32, 16, 16);
  /** `kick` swings the legs (-1 back .. 1 forward); `eyes`: 0 none, 1 open, 2 narrowed. */
  const chair = (kick: number, eyes: number) => {
    const f = new FormCanvas(32, 32);
    // turned legs: the far pair first (darker), a stretcher between them, then the near pair
    f.bias = -0.26;
    for (const x of [11, 21]) f.limb(x, 21, x + kick * 4, 30, 1.1, 0.9, C_WOOD);
    f.stroke(9 + kick * 2, 26, 22 + kick * 2, 26, C_WOOD, 0.4);
    f.bias = 0;
    f.next();
    for (const x of [8, 24]) f.limb(x, 21, x + kick * 4, 31, 1.2, 1, C_WOOD);
    // the tall back: a frame round a carved splat with a quatrefoil cut through it
    f.next();
    f.poly([[6, 3], [13, 3], [13, 18], [6, 18]], C_WOOD, (x) => 0.78 - (x - 6) * 0.08);
    f.poly([[7, 1], [12, 1], [12, 3], [7, 3]], C_WOOD, (_x, y) => (y < 2 ? 0.8 : 0.5)); // crest rail
    f.dot(6, 1, C_WOOD, 0.8); // finials
    f.dot(12, 1, C_WOOD, 0.3);
    f.poly([[8, 5], [11, 5], [11, 15], [8, 15]], C_WOOD, 0.42);
    for (const [x, y] of [[9, 8], [8, 9], [10, 9], [9, 10], [9, 9], [9, 12]]) f.dot(x, y, HOLE, 0.2);
    if (eyes) {
      // two eyes in the carving, under a scowl when it charges
      f.dot(8, 9, EYE_Y, eyes === 2 ? 0.95 : 0.6);
      f.dot(10, 9, EYE_Y, eyes === 2 ? 0.95 : 0.6);
      if (eyes === 2) {
        f.dot(8, 8, C_WOOD, 0.1);
        f.dot(10, 8, C_WOOD, 0.1);
      }
    }
    // seat frame, and the velvet cushion on it with its button
    f.next();
    f.poly([[7, 18], [26, 18], [26, 21], [8, 22]], C_WOOD, (_x, y) => (y > 20 ? 0.3 : 0.55));
    f.dot(8, 21, C_WOOD, 0.85);
    f.dot(24, 21, C_WOOD, 0.85);
    f.next();
    f.poly([[8, 15], [25, 15], [26, 18], [7, 18]], VELVET, (x, y) => 0.8 - (y - 15) * 0.14 + (x - 16) * 0.008);
    f.dot(16, 16, VELVET, 0.2);
    return f.resolve();
  };
  b.add('sit', chair(0, 0));
  b.add('wake', chair(0, 1));
  b.smooth('float', 2, ...cycle(4, (t) => chair(0.05 + 0.55 * Math.cos(t * TAU), 1)));
  b.add('charge', chair(-1, 2));
  return b;
}

// ================================================================ Gallows Spider
// A big ash-grey spider with ember eyes and a pale skull marking on its back. It hangs
// head-down on a silk line ('hang', 'spit') and scuttles on the floor once cut ('crawl').
// The thread itself is the fx sheet's 'silk' frame, stretched in game (enemies_spider.ts).

const S_BODY = ramp('#12101a', '#2a2430', '#4a4450', '#6e6878', '#928c9c');
const S_LEG = ramp('#0a080e', '#1e1a24', '#3e3846', '#6a6276');
const EMBER = ramp('#a02810', '#ff5030', '#ffb890');

export function buildSpiderSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 28, 16, 14);
  /** The skull marking on its abdomen. */
  const skull = (f: FormCanvas, x: number, y: number, r: number) => {
    f.next();
    f.disc(x, y, r, BONE, 0.8);
    f.dot(x - 1, y, DARK, 0.1);
    f.dot(x + 1, y, DARK, 0.1);
  };
  /** Hanging head-down: abdomen on top (where the silk attaches), legs spread to both sides. */
  const hang = (twitch: number, open: boolean) => {
    const f = new FormCanvas(32, 28);
    const cx = 16;
    // four legs a side, each bent at the knee and curling inward at the tip
    for (let k = 0; k < 4; k++) {
      const y = 13 + k * 2, out = 7 + (k === 1 || k === 2 ? 2 : 0), up = (k < 2 ? -5 : 4) + (k % 2 ? twitch : -twitch);
      for (const s of [-1, 1]) {
        const kx = cx + s * out, ky = y + up;
        f.next();
        f.limb(cx + s * 2, y, kx, ky, 0.8, 0.7, S_LEG);
        f.limb(kx, ky, kx + s * 4, ky + 5, 0.7, 0.4, S_LEG);
      }
    }
    // abdomen with the skull marking, then the head below it
    f.next();
    f.ball(cx, 8, 5.5, 6.5, S_BODY);
    skull(f, cx, 7, 2);
    f.stroke(cx - 1, 9, cx + 1, 9, BONE, 0.8);
    f.next();
    f.ball(cx, 16, 3.5, 3, S_BODY);
    for (const x of [cx - 2, cx - 1, cx + 1, cx + 2]) f.dot(x, 17, EMBER, 0.6);
    // fangs: together, or spread wide to spit
    const w = open ? 2.5 : 1;
    f.stroke(cx - 1, 19, cx - w, 21 + (open ? 1 : 0), BONE, 0.7);
    f.stroke(cx + 1, 19, cx + w, 21 + (open ? 1 : 0), BONE, 0.9);
    return f.resolve({ contour: 0.16 });
  };
  /**
   * On the floor, side view facing right. Four legs on each side arch up to a high knee and
   * come down to a fine foot, two reaching ahead and two trailing; they step in two sets, each
   * foot lifting as it swings forward (`ph` is the stride's phase).
   */
  const crawl = (ph: number) => {
    const f = new FormCanvas(32, 28);
    const cx = 17, cy = 17, floor = 26;
    const leg = (k: number, near: boolean) => {
      // k = 0 (rearmost) .. 3 (foremost): where it joins the body, and where its foot rests
      const hipX = cx - 2 + k * 1.6, rest = [-11, -5.5, 5, 10.5][k];
      const u = ph + (k % 2 ? Math.PI : 0) + (near ? 0 : Math.PI); // alternate legs, and the far side out of step
      const fx = hipX + rest + Math.sin(u) * 2.2, fy = floor - Math.max(0, Math.cos(u)) * 2.6;
      const kx = hipX + rest * 0.5 + Math.sin(u) * 1, ky = cy - 8.5 + Math.abs(k - 1.5) * 1.3 - Math.max(0, Math.cos(u)) * 1.2;
      f.bias = near ? 0.2 : -0.22;
      f.next();
      f.limb(hipX, cy, kx, ky, 0.9, 0.8, S_LEG);
      f.limb(kx, ky, fx, fy, 0.8, 0.4, S_LEG);
      f.ball(kx, ky, 1.1, 1.1, S_LEG); // the knuckle of the knee
      f.bias = 0;
    };
    for (let k = 0; k < 4; k++) leg(k, false);
    // the abdomen, fat and held high behind, with the skull on it; then the head and its fangs
    f.next();
    f.ball(cx - 7.5, cy - 2.5, 6.6, 5.4, S_BODY);
    f.groove(cx - 12, cy - 0.5, cx - 4, cy + 1.5, -0.16);
    skull(f, cx - 8, cy - 3.5, 2.2);
    f.stroke(cx - 9, cy - 1, cx - 7, cy - 1, BONE, 0.8);
    f.next();
    f.ball(cx + 1.5, cy - 0.5, 4, 3.2, S_BODY);
    f.dot(cx + 3, cy - 2, EMBER, 0.6);
    f.dot(cx + 4.4, cy - 1.2, EMBER, 0.95);
    f.dot(cx + 2, cy - 0.6, EMBER, 0.6);
    f.stroke(cx + 4.6, cy + 1, cx + 6, cy + 3.4, BONE, 0.9);
    f.stroke(cx + 3.4, cy + 1.6, cx + 4.4, cy + 3.8, BONE, 0.6);
    // the near legs go over the body
    for (let k = 0; k < 4; k++) leg(k, true);
    return f.resolve({ contour: 0.2 });
  };

  b.smooth('hang', 2, ...cycle(4, (t) => hang(0.5 - 0.5 * Math.cos(t * TAU), false)));
  b.add('spit', hang(0, true));
  b.smooth('crawl', 2, ...cycle(8, (t) => crawl(t * TAU)));
  b.add('fall', hang(2, true));
  return b;
}
