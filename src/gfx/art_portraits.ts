// Dialogue portraits: anime-style busts, 64x64, drawn in code. One frame per speaker and
// expression, named `<speaker>_<face>` (e.g. 'vesna_angry'). Faces are drawn looking
// slightly to the right; the dialogue box mirrors the ones that stand on the right.
import { PixelCanvas, SheetBuilder, RGBA, hex, shade } from './pixel';

export type Face = 'neutral' | 'smile' | 'angry' | 'surprised' | 'sad';
export const PORTRAIT = 64;

const INK = hex('#140a14'); // lines and outlines
const WHITE = hex('#fffaf0');

/** Colors and hair of one human(ish) character. */
interface Look {
  skin: RGBA;
  skinD: RGBA;
  hair: RGBA;
  hairD: RGBA;
  hairL: RGBA;
  iris: RGBA;
  irisD: RGBA;
  cloth: RGBA;
  clothD: RGBA;
  /** Behind the head (long hair, ponytails, feather crowns). */
  back?: (p: PixelCanvas) => void;
  /** Over the forehead and down the sides of the face. */
  front: (p: PixelCanvas) => void;
  /** Clothes, collars, jewelry: drawn after the body, before the head. */
  dress?: (p: PixelCanvas) => void;
  /** Anything on top of the finished face (spectacles, a headband). */
  extra?: (p: PixelCanvas, face: Face) => void;
  /** Slit pupils (the Bell-Mother's raptor eyes). */
  slit?: boolean;
}

// ---------------------------------------------------------------- the face

/** One big anime eye centered on (x, y). `side` -1 = her right eye (screen left), 1 = left. */
function eye(p: PixelCanvas, L: Look, x: number, y: number, side: number, face: Face) {
  if (face === 'smile') {
    // closed, curved up: ^
    p.line(x - 3, y + 1, x, y - 1, INK, 1.4);
    p.line(x, y - 1, x + 3, y + 1, INK, 1.4);
    return;
  }
  if (face === 'surprised') {
    // wide open: white all round a small iris
    p.rect(x - 3, y - 3, 7, 8, WHITE);
    p.rect(x - 1, y - 1, 3, 4, L.iris);
    p.set(x, y, INK);
    p.line(x - 3, y - 4, x + 3, y - 4, INK);
    return;
  }
  // the usual eye: a dark upper lid, a tall iris darker at the top, and a bright catchlight
  p.set(x + side * 3, y + 1, WHITE);
  p.set(x + side * 3, y + 2, WHITE);
  p.rect(x - 2, y - 2, 5, 3, L.irisD);
  p.rect(x - 2, y + 1, 5, 3, L.iris);
  if (L.slit) p.line(x, y - 2, x, y + 3, INK);
  else p.rect(x - 1, y - 1, 3, 3, shade(L.irisD, 0.6));
  p.set(x - 1, y - 1, WHITE);
  p.set(x + 1, y + 2, shade(WHITE, 0.85));
  // the lid: level, or slanted in toward the nose (angry) or up toward it (sad)
  const inner = -side; // toward the middle of the face
  const tilt = face === 'angry' ? 2 : face === 'sad' ? -1 : 0;
  p.line(x - 3, y - 3 + (inner < 0 ? tilt : 0), x + 3, y - 3 + (inner > 0 ? tilt : 0), INK, 1.6);
  if (face === 'angry') p.line(x - 2, y - 2 + (inner < 0 ? 1 : 0), x + 2, y - 2 + (inner > 0 ? 1 : 0), INK); // narrowed
  p.set(x + side * 4, y - 3, INK); // the outer lash flick
}

function brow(p: PixelCanvas, L: Look, x: number, y: number, side: number, face: Face) {
  const inner = -side;
  const lift = face === 'surprised' ? -2 : 0;
  const tilt = face === 'angry' ? 2 : face === 'sad' ? -2 : 0; // + = inner end lower
  const xi = x + inner * 3, xo = x - inner * 3;
  p.line(xo, y + lift, xi, y + lift + tilt, L.hairD, 1.3);
}

function mouth(p: PixelCanvas, L: Look, face: Face, open = false) {
  const x = 32, y = 40;
  switch (face) {
    case 'smile':
      p.set(x - 3, y - 1, INK);
      p.line(x - 2, y, x + 2, y, INK);
      p.set(x + 3, y - 1, INK);
      break;
    case 'angry':
      if (open) {
        p.rect(x - 3, y - 1, 7, 4, hex('#4a0a14'));
        p.line(x - 3, y - 1, x + 3, y - 1, WHITE);
      } else {
        p.line(x - 3, y, x + 3, y, INK);
        p.set(x - 3, y + 1, INK);
        p.set(x + 3, y + 1, INK);
      }
      break;
    case 'surprised':
      p.rect(x - 1, y - 1, 3, 3, hex('#4a0a14'));
      p.set(x - 1, y - 1, INK);
      break;
    case 'sad':
      p.line(x - 2, y + 1, x, y, INK);
      p.line(x, y, x + 2, y + 1, INK);
      break;
    default:
      p.line(x - 2, y, x + 1, y, shade(L.skinD, 0.75));
  }
}

/** A whole bust: shoulders, neck, face, features, hair. */
function bust(L: Look, face: Face, open = false) {
  const p = new PixelCanvas(PORTRAIT, PORTRAIT);
  L.back?.(p);
  // shoulders and chest
  p.poly([[4, 64], [8, 55], [20, 50], [44, 50], [56, 55], [60, 64]], L.clothD);
  p.poly([[10, 64], [13, 56], [22, 51], [42, 51], [51, 56], [54, 64]], L.cloth);
  // neck, shadowed under the jaw
  p.rect(28, 41, 9, 11, L.skin);
  p.rect(28, 41, 9, 4, L.skinD);
  L.dress?.(p);
  // the face: wide at the cheekbones, tapering to a small pointed chin
  p.poly([[19, 17], [45, 17], [46, 30], [43, 37], [37, 43], [32, 45], [27, 43], [21, 37], [18, 30]], L.skin);
  p.poly([[18, 30], [21, 37], [27, 43], [30, 44], [24, 37], [21, 30]], L.skinD); // jaw shade
  p.rect(16, 27, 3, 6, L.skinD); // ears
  p.rect(45, 27, 3, 6, L.skin);
  // features
  eye(p, L, 26, 30, -1, face);
  eye(p, L, 38, 30, 1, face);
  brow(p, L, 26, 24, -1, face);
  brow(p, L, 38, 24, 1, face);
  p.set(33, 35, L.skinD); // nose
  p.set(33, 36, shade(L.skinD, 0.85));
  mouth(p, L, face, open);
  if (face === 'smile') {
    p.rect(21, 35, 3, 1, hex('#f0a0a8'));
    p.rect(41, 35, 3, 1, hex('#f0a0a8'));
  }
  L.front(p);
  L.extra?.(p, face);
  p.outline(INK);
  return p;
}

// ---------------------------------------------------------------- the cast

/** Bangs: a row of pointed locks hanging from the hairline (x0..x1) down to about y. */
function bangs(p: PixelCanvas, c: RGBA, cL: RGBA, x0: number, x1: number, y: number, n: number) {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w, tip = y + ((i * 7) % 3) - 1;
    p.poly([[a - 1, 14], [a + w + 1, 14], [a + w * 0.6, tip]], c);
    p.line(a + w * 0.3, 15, a + w * 0.5, tip - 3, cL);
  }
}

const SILVER = { hair: hex('#b8b4c8'), hairD: hex('#7a7690'), hairL: hex('#f0eef8') };

const VESNA: Look = {
  skin: hex('#f6d2b8'), skinD: hex('#d8a088'), ...SILVER,
  iris: hex('#c04060'), irisD: hex('#601838'),
  cloth: hex('#8a2238'), clothD: hex('#4a1020'),
  back: (p) => {
    p.ellipse(32, 22, 17, 13, SILVER.hairD);
    // the ponytail sweeping down behind her right shoulder
    p.poly([[40, 12], [52, 14], [58, 30], [56, 46], [50, 56], [48, 40], [44, 24]], SILVER.hair);
    p.line(50, 18, 54, 44, SILVER.hairL);
    p.poly([[18, 20], [14, 34], [16, 46], [21, 40], [22, 26]], SILVER.hairD); // hair behind her cheek
  },
  front: (p) => {
    p.ellipse(32, 15, 16, 7, SILVER.hair);
    bangs(p, SILVER.hair, SILVER.hairL, 18, 46, 25, 6);
    // side locks framing the face
    p.poly([[17, 16], [21, 18], [22, 34], [19, 42], [17, 30]], SILVER.hair);
    p.poly([[47, 16], [43, 18], [43, 30], [46, 38], [48, 28]], SILVER.hair);
    p.line(19, 20, 19, 36, SILVER.hairL);
  },
  dress: (p) => {
    // high coat collar and the gold scarf wound round her neck
    p.poly([[22, 51], [27, 45], [37, 45], [42, 51], [36, 56], [28, 56]], hex('#d8a030'));
    p.line(24, 50, 40, 50, hex('#9a6a18'));
    p.poly([[38, 52], [44, 52], [42, 63], [37, 60]], hex('#d8a030')); // the scarf's tail
    p.line(16, 57, 22, 52, hex('#b84058'));
  },
  extra: (p) => {
    // the red headband across her bangs, its knot to one side
    p.line(18, 17, 46, 15, hex('#b02a3a'), 2);
    p.rect(14, 16, 4, 3, hex('#b02a3a'));
    p.line(12, 17, 9, 22, hex('#8a1a28'), 1.5);
  },
};

const ANZEL: Look = {
  ...VESNA,
  skin: hex('#f0c8ac'), skinD: hex('#c89078'),
  iris: hex('#4a70c0'), irisD: hex('#1a2a60'),
  cloth: hex('#2e4470'), clothD: hex('#141e36'),
  back: (p) => p.ellipse(32, 21, 17, 12, SILVER.hairD),
  front: (p) => {
    // short and swept, with a few spikes standing up
    p.ellipse(32, 15, 17, 7, SILVER.hair);
    for (const [x, h] of [[20, 7], [27, 9], [35, 8], [42, 6]] as [number, number][]) p.poly([[x - 4, 12], [x + 2, 2 + (9 - h)], [x + 4, 12]], SILVER.hair);
    bangs(p, SILVER.hair, SILVER.hairL, 19, 45, 22, 5);
    p.poly([[17, 16], [21, 18], [21, 30], [18, 32]], SILVER.hair);
    p.poly([[47, 16], [43, 18], [44, 28], [47, 30]], SILVER.hair);
  },
  dress: VESNA.dress,
  extra: VESNA.extra,
};

/** Pell, the Archivist's last apprentice: a ghost in spectacles and an ink-stained scholar's robe. */
const PELL: Look = {
  skin: hex('#dceaf6'), skinD: hex('#a4bcd8'),
  hair: hex('#2e3650'), hairD: hex('#181c30'), hairL: hex('#4e5a80'),
  iris: hex('#7ad0d8'), irisD: hex('#2a6878'),
  cloth: hex('#3a4a6e'), clothD: hex('#1e2840'),
  back: (p) => p.ellipse(32, 21, 17, 13, hex('#181c30')),
  front: (p) => {
    // an untidy mop, one lock always in his eyes
    p.ellipse(32, 15, 17, 8, hex('#2e3650'));
    bangs(p, hex('#2e3650'), hex('#4e5a80'), 17, 47, 24, 7);
    p.poly([[30, 16], [36, 16], [31, 30]], hex('#2e3650'));
    p.poly([[16, 16], [20, 18], [20, 32], [17, 30]], hex('#2e3650'));
    p.poly([[48, 16], [44, 18], [45, 30], [48, 28]], hex('#2e3650'));
    // a quill tucked behind his ear
    p.line(47, 22, 56, 8, hex('#e8e0c8'), 1.5);
    p.line(52, 13, 56, 8, hex('#c8c0a8'), 2);
  },
  dress: (p) => {
    // a white scholar's band at the throat, and ink spattered down the robe
    p.poly([[26, 50], [32, 47], [38, 50], [35, 58], [29, 58]], hex('#e8eef8'));
    p.line(32, 50, 32, 57, hex('#a4b4c8'));
    for (const [x, y] of [[16, 58], [19, 60], [46, 57], [44, 61], [48, 60]] as [number, number][]) p.set(x, y, hex('#0e1020'));
  },
  extra: (p) => {
    // round spectacles
    const rim = hex('#c8a850');
    for (const cx of [26, 38]) {
      p.line(cx - 4, 27, cx + 4, 27, rim);
      p.line(cx - 4, 34, cx + 4, 34, rim);
      p.line(cx - 5, 28, cx - 5, 33, rim);
      p.line(cx + 5, 28, cx + 5, 33, rim);
    }
    p.line(31, 29, 33, 29, rim);
    p.set(23, 28, WHITE); // a glint
  },
};

/** The Bell-Mother: a harpy queen with a crown of feathers, raptor eyes and a bell at her throat. */
const BELLMOTHER: Look = {
  skin: hex('#e2d2e2'), skinD: hex('#a890b0'),
  hair: hex('#4a3a62'), hairD: hex('#261c38'), hairL: hex('#7a68a0'),
  iris: hex('#f0c030'), irisD: hex('#a06810'),
  cloth: hex('#3a2e4a'), clothD: hex('#1c1428'),
  slit: true,
  back: (p) => {
    // a great fan of feathers rising behind her head
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.05 + (i / 8) * 0.9), x = 32 - Math.cos(a) * 30, y = 26 - Math.sin(a) * 26;
      p.poly([[32 - Math.cos(a) * 8, 24 - Math.sin(a) * 6], [x - 3, y + 2], [x, y - 2], [x + 3, y + 2]], i % 2 ? hex('#4a3a62') : hex('#261c38'));
      p.line(32 - Math.cos(a) * 10, 24 - Math.sin(a) * 8, x, y, hex('#7a68a0'));
    }
  },
  front: (p) => {
    p.ellipse(32, 15, 16, 7, hex('#4a3a62'));
    bangs(p, hex('#4a3a62'), hex('#7a68a0'), 18, 46, 23, 6);
    p.poly([[16, 16], [21, 18], [20, 40], [15, 46], [16, 30]], hex('#4a3a62'));
    p.poly([[48, 16], [43, 18], [44, 40], [49, 46], [48, 30]], hex('#4a3a62'));
  },
  dress: (p) => {
    // feathered shoulders, and a bronze bell on a chain at her throat
    for (let i = 0; i < 6; i++) {
      p.poly([[4 + i * 4, 64], [8 + i * 3, 52 + i], [12 + i * 4, 64]], i % 2 ? hex('#261c38') : hex('#4a3a62'));
      p.poly([[60 - i * 4, 64], [56 - i * 3, 52 + i], [52 - i * 4, 64]], i % 2 ? hex('#261c38') : hex('#4a3a62'));
    }
    p.line(27, 47, 32, 52, hex('#a08040'));
    p.line(37, 47, 32, 52, hex('#a08040'));
    p.poly([[29, 53], [35, 53], [37, 60], [27, 60]], hex('#b07830'));
    p.poly([[30, 54], [32, 54], [31, 59], [28, 59]], hex('#e0b060'));
    p.rect(31, 60, 2, 2, hex('#5a3a18'));
  },
  extra: (p, face) => {
    // dark lips, and fangs when she screams
    if (face === 'angry') {
      p.set(30, 41, WHITE);
      p.set(34, 41, WHITE);
    }
  },
};

// ---------------------------------------------------------------- monsters

/** The Ossuary Wyrm's skull, head on: horns, burning sockets, rows of teeth. `open` drops the jaw. */
function wyrmFace(open: boolean) {
  const p = new PixelCanvas(PORTRAIT, PORTRAIT);
  const bone = hex('#e2d8b8'), boneM = hex('#b8ac8a'), boneD = hex('#7c7058'), dark = hex('#1a0e10');
  // vertebrae trailing down behind the skull
  for (let i = 0; i < 3; i++) p.ellipse(32, 52 + i * 6, 9 - i, 4, i % 2 ? boneM : boneD);
  // horns sweeping out and up
  p.poly([[18, 16], [4, 4], [2, 12], [14, 24]], boneM);
  p.poly([[46, 16], [60, 4], [62, 12], [50, 24]], boneM);
  p.line(16, 17, 5, 6, bone);
  p.line(48, 17, 59, 6, bone);
  // the lower jaw (dropped when it roars)
  const jy = open ? 8 : 0;
  p.poly([[20, 38 + jy], [44, 38 + jy], [40, 50 + jy], [24, 50 + jy]], boneM);
  if (open) p.rect(22, 38, 20, jy + 2, dark);
  for (let x = 23; x <= 41; x += 3) p.poly([[x, 38 + jy], [x + 2, 38 + jy], [x + 1, 34 + jy]], WHITE); // lower fangs
  // the cranium
  p.ellipse(32, 24, 17, 15, bone);
  p.poly([[16, 26], [48, 26], [44, 40], [20, 40]], bone);
  p.line(17, 28, 21, 39, boneD);
  p.line(32, 10, 32, 20, boneM); // a seam
  // sockets with a red light burning deep inside
  for (const [cx, s] of [[25, -1], [39, 1]] as [number, number][]) {
    p.poly([[cx - 6, 24], [cx + 5 * s, 22], [cx + 6 * -s * -1, 30], [cx - 4, 31]], dark);
    p.ellipse(cx, 27, 5, 4, dark);
    p.ellipse(cx, 27, 2.5, 2, hex('#ff3020'));
    p.set(cx - 1, 26, hex('#ffd0a0'));
  }
  // nose cavity and the upper teeth
  p.poly([[30, 31], [34, 31], [32, 36]], dark);
  for (let x = 21; x <= 41; x += 3) p.poly([[x, 39], [x + 2, 39], [x + 1, 43]], WHITE);
  p.outline(INK);
  return p;
}

/** Gnarlfang's two heads, side by side, snarling. `open` bares the jaws. */
function houndFace(open: boolean) {
  const p = new PixelCanvas(PORTRAIT, PORTRAIT);
  const fur = hex('#5a4638'), furD = hex('#2e2420'), furL = hex('#8a7460');
  // the shared shoulders and a spiked collar
  p.poly([[0, 64], [6, 46], [32, 40], [58, 46], [64, 64]], furD);
  p.rect(14, 46, 36, 4, hex('#3a3440'));
  for (let x = 16; x <= 48; x += 6) p.poly([[x, 46], [x + 2, 41], [x + 4, 46]], hex('#a8acbc'));
  /** One head, its muzzle pointing out to side `s`. */
  const head = (cx: number, cy: number, s: number) => {
    p.poly([[cx - 6 * s, cy - 8], [cx - 2 * s, cy - 20], [cx + 2 * s, cy - 9]], furD); // ears
    p.poly([[cx + 4 * s, cy - 9], [cx + 9 * s, cy - 19], [cx + 10 * s, cy - 6]], furD);
    p.ellipse(cx, cy, 11, 10, fur);
    // the muzzle, and the jaw under it
    const mx = cx + 10 * s, jy = open ? 5 : 1;
    p.poly([[cx + 2 * s, cy - 2], [mx + 6 * s, cy + 1], [mx + 5 * s, cy + 5], [cx + 2 * s, cy + 6]], fur);
    p.poly([[cx + 2 * s, cy + 6], [mx + 4 * s, cy + 5 + jy], [cx + 1 * s, cy + 10 + jy]], furD);
    if (open) p.poly([[cx + 3 * s, cy + 6], [mx + 4 * s, cy + 5], [mx + 3 * s, cy + 5 + jy]], hex('#6a0a14'));
    p.set(mx + 6 * s, cy + 1, INK); // nose
    p.set(mx + 5 * s, cy + 1, INK);
    // fangs
    p.line(cx + 5 * s, cy + 6, cx + 5 * s, cy + 9, WHITE);
    p.line(mx + 2 * s, cy + 5, mx + 2 * s, cy + 8, WHITE);
    // a slanted, glowing red eye, and a scar of lighter fur over it
    p.line(cx + 1 * s, cy - 5, cx + 6 * s, cy - 3, hex('#ff4030'), 2);
    p.set(cx + 2 * s, cy - 5, hex('#ffd0a0'));
    p.line(cx - 1 * s, cy - 8, cx + 7 * s, cy - 5, furL);
  };
  head(19, 28, -1);
  head(45, 26, 1);
  p.outline(INK);
  return p;
}

// ---------------------------------------------------------------- the sheet

const HUMANS: Record<string, [Look, Face[]]> = {
  vesna: [VESNA, ['neutral', 'smile', 'angry', 'surprised', 'sad']],
  anzel: [ANZEL, ['neutral', 'smile', 'angry', 'surprised', 'sad']],
  pell: [PELL, ['neutral', 'smile', 'surprised', 'sad']],
  bellmother: [BELLMOTHER, ['neutral', 'smile', 'angry']],
};

export function buildPortraitSheet(): SheetBuilder {
  const b = new SheetBuilder(PORTRAIT, PORTRAIT, PORTRAIT / 2, PORTRAIT / 2);
  const put = (name: string, src: PixelCanvas) => {
    const p = b.canvas();
    p.blit(src, 0, 0);
    b.add(name, p);
  };
  for (const [who, [look, faces]] of Object.entries(HUMANS)) if (who !== 'pell') for (const f of faces) put(`${who}_${f}`, bust(look, f, true));
  // Pell is a ghost: he fades out below the chest, and the rest is a little see-through
  for (const f of HUMANS.pell[1]) {
    const p = b.canvas();
    p.blit(bust(PELL, f), 0, 0);
    p.map((c, _x, y) => [c[0], c[1], c[2], Math.round(c[3] * Math.min(0.9, (64 - y) / 14))]);
    b.add(`pell_${f}`, p);
  }
  put('wyrm_neutral', wyrmFace(false));
  put('wyrm_angry', wyrmFace(true));
  put('hound_neutral', houndFace(false));
  put('hound_angry', houndFace(true));
  return b;
}

/**
 * Pell in the world: a small floating ghost scholar reading a book, his robe trailing off
 * into wisps. Faces right, anchored at the bottom middle of a 32x44 cell. 'idle' bobs and
 * sways; 'turn' looks up from the book.
 */
export function buildPellSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 44, 16, 43);
  const robe = hex('#3a4a6e'), robeD = hex('#1e2840'), skin = hex('#dceaf6'), skinD = hex('#a4bcd8');
  const hair = hex('#2e3650'), glint = hex('#c8a850');
  const frame = (i: number, look: boolean) => {
    const p = b.canvas();
    const bob = [0, -1, -1, 0][i], sway = [0, 1, 2, 1][i];
    // the robe, narrowing into three trailing wisps
    p.poly([[10, 18 + bob], [22, 18 + bob], [24, 32 + bob], [20, 36 + bob], [12, 36 + bob], [8, 32 + bob]], robe);
    p.poly([[10, 18 + bob], [14, 18 + bob], [13, 36 + bob], [8, 32 + bob]], robeD);
    for (const [x, len] of [[11, 6], [16, 8], [20, 5]] as [number, number][]) p.line(x, 35 + bob, x - sway + 1, 35 + bob + len, robeD, 2);
    // the white scholar's band
    p.rect(14, 18 + bob, 4, 3, hex('#e8eef8'));
    // head: pale, with the untidy mop and spectacles
    const hy = 12 + bob + (look ? -1 : 0);
    p.circle(16, hy, 5, skin);
    p.set(14, hy + 3, skinD);
    p.ellipse(15, hy - 3, 5.5, 3, hair);
    p.poly([[10, hy - 3], [13, hy - 4], [12, hy + 2]], hair);
    p.set(18, hy - 1 + (look ? 0 : 1), glint);
    p.set(20, hy - 1 + (look ? 0 : 1), glint);
    p.set(19, hy + (look ? -1 : 1), hex('#140a14')); // eyes on the book, or up at you
    // the open book in both hands
    p.poly([[18, 23 + bob], [25, 21 + bob], [26, 26 + bob], [19, 28 + bob]], hex('#6a3a24'));
    p.poly([[19, 23 + bob], [24, 22 + bob], [25, 25 + bob], [20, 27 + bob]], hex('#f0e8d0'));
    p.line(21, 24 + bob, 23, 23 + bob, hex('#8a8070'));
    p.circle(18, 26 + bob, 1.3, skin);
    p.outline(hex('#0e1428'));
    // a ghost: slightly see-through all over
    p.map((c) => [c[0], c[1], c[2], Math.round(c[3] * 0.85)]);
    return p;
  };
  b.add('idle', ...[0, 1, 2, 3].map((i) => frame(i, false)));
  b.add('turn', ...[0, 1, 2, 3].map((i) => frame(i, true)));
  return b;
}
