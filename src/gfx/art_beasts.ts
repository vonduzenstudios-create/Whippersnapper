// Procedural art for the creatures of the castle expansion: wild dogs, harpies, bell
// wraiths and frost crawlers. The expansion bosses are in art_bosses.ts.
// Everything faces right; sprites are mirrored in game.
import { PixelCanvas, SheetBuilder, RGBA, hex, shade } from './pixel';

const O = hex('#120a12');
const fin = (p: PixelCanvas, o: RGBA = O) => {
  p.outline(o);
  return p;
};

// ---------------------------------------------------------------- shared: a four-legged beast

interface BeastStyle {
  fur: RGBA;
  furD: RGBA;
  furL: RGBA;
  eye: RGBA;
  claw: RGBA;
}
interface BeastPose {
  bx: number; // body center
  by: number;
  len: number; // body half length
  tall: number; // body half height
  legs: [number, number, number, number]; // leg angles (deg from straight down, + = forward): back far, back near, front far, front near
  legLen: number;
  head: [number, number]; // head center
  jaw: number; // 0 closed .. 1 wide open
  tail: number; // tail lift
}

function quadruped(p: PixelCanvas, s: BeastStyle, q: BeastPose, headR = 4) {
  const leg = (x: number, y: number, a: number, dim: number, w: number) => {
    const r = (a * Math.PI) / 180;
    const kx = x + Math.sin(r) * q.legLen * 0.5, ky = y + Math.cos(r) * q.legLen * 0.5;
    const fx = kx + Math.sin(r * 0.4) * q.legLen * 0.55, fy = ky + q.legLen * 0.5;
    p.line(x, y, kx, ky, shade(s.furD, dim), w + 0.6);
    p.line(kx, ky, fx, fy, shade(s.furD, dim), w);
    p.line(fx, fy, fx + 2, fy, s.claw, 1);
  };
  const by = q.by, bx = q.bx;
  // far legs
  leg(bx - q.len * 0.6, by + 1, q.legs[0], 0.7, 2.2);
  leg(bx + q.len * 0.6, by + 1, q.legs[2], 0.7, 2.2);
  // tail
  p.line(bx - q.len, by - 1, bx - q.len - 6, by - 3 - q.tail, s.furD, 2.4);
  p.line(bx - q.len - 6, by - 3 - q.tail, bx - q.len - 9, by - 1 - q.tail * 1.4, s.fur, 1.6);
  // body
  p.ellipse(bx, by, q.len, q.tall, s.furD);
  p.ellipse(bx + 1, by - 1, q.len - 1, q.tall - 1.2, s.fur);
  p.line(bx - q.len + 3, by - q.tall + 1, bx + q.len - 3, by - q.tall + 1, s.furL); // back highlight
  // ribs show through the mangy fur
  for (let k = 0; k < 3; k++) p.line(bx - 2 + k * 3, by, bx - 1 + k * 3, by + q.tall - 1, s.furD);
  // near legs
  leg(bx - q.len * 0.5, by + 2, q.legs[1], 1, 2.4);
  leg(bx + q.len * 0.7, by + 2, q.legs[3], 1, 2.4);
  // neck + head
  const [hx, hy] = q.head;
  p.line(bx + q.len - 2, by - 1, hx - 1, hy + 1, s.fur, q.tall * 1.1);
  p.ellipse(hx, hy, headR + 0.5, headR * 0.8, s.furD);
  p.ellipse(hx + 0.5, hy - 0.5, headR, headR * 0.7, s.fur);
  // ears
  p.poly([[hx - 3, hy - 2], [hx - 1, hy - headR - 3], [hx + 1, hy - 2]], s.furD);
  // snout and jaw
  const open = q.jaw * 3;
  p.poly([[hx + 1, hy - 2], [hx + headR + 5, hy - 0.5 - open * 0.3], [hx + headR + 5, hy + 1 - open * 0.3], [hx + 1, hy + 2]], s.fur);
  p.poly([[hx + 1, hy + 1.5], [hx + headR + 4, hy + 2 + open], [hx + headR + 3, hy + 3 + open], [hx, hy + 3]], s.furD);
  if (q.jaw > 0.2) {
    p.line(hx + 3, hy + 1.5, hx + headR + 4, hy + 1.5 + open * 0.5, hex('#4a0a10'));
    p.set(hx + headR + 3, hy + 1, hex('#f0e8d0'));
    p.set(hx + headR + 2, hy + 2 + open, hex('#f0e8d0'));
  }
  p.set(hx + headR + 5, hy - 1, hex('#100808')); // nose
  p.set(hx + 1, hy - 1, s.eye);
  p.set(hx + 2, hy - 1, shade(s.eye, 0.7));
}

// ---------------------------------------------------------------- wild dog

const DOG: BeastStyle = { fur: hex('#5a4a40'), furD: hex('#3a2e28'), furL: hex('#7a6a58'), eye: hex('#ff3030'), claw: hex('#d8d0c0') };

export function buildDogSheet(): SheetBuilder {
  const b = new SheetBuilder(44, 28, 22, 14);
  const pose = (o: Partial<BeastPose>): BeastPose => ({
    bx: 20, by: 15, len: 9, tall: 4.2, legs: [0, 0, 0, 0], legLen: 9, head: [31, 11], jaw: 0, tail: 2, ...o,
  });
  const draw = (q: BeastPose) => {
    const p = b.canvas();
    quadruped(p, DOG, q, 3.6);
    return fin(p);
  };
  // gallop: legs swing in pairs, the body rocks
  b.add('run', ...[0, 1, 2, 3].map((i) => {
    const t = (i / 4) * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
    return draw(pose({ by: 15 + (i % 2 ? -1 : 0), legs: [-35 * s, -30 * s + 10, 35 * s, 30 * s - 10], head: [31, 11 + (i % 2)], tail: 3 + c, jaw: 0.3 }));
  }));
  b.add('stand', draw(pose({ legs: [-5, 5, -5, 5], tail: 1 })));
  b.add('crouch', draw(pose({ by: 18, tall: 3.8, legs: [-60, -50, 40, 50], legLen: 7, head: [31, 16], jaw: 0.6, tail: -1 })));
  b.add('leap', draw(pose({ by: 13, len: 10, legs: [-80, -70, 75, 85], head: [33, 10], jaw: 1, tail: 4 })));
  return b;
}

// ---------------------------------------------------------------- harpy

interface HarpyStyle {
  skin: RGBA;
  skinD: RGBA;
  hair: RGBA;
  wing: RGBA;
  wingD: RGBA;
  wingL: RGBA;
  eye: RGBA;
  talon: RGBA;
}
const HARPY: HarpyStyle = {
  skin: hex('#b8aab8'), skinD: hex('#7a6a80'), hair: hex('#d8d0e0'),
  wing: hex('#4a3050'), wingD: hex('#2a1a30'), wingL: hex('#6a4a72'), eye: hex('#ffe040'), talon: hex('#c8b070'),
};

/** A winged woman: `flap` -1 (wings down) .. 1 (up); `k` scales the whole figure. */
function harpy(p: PixelCanvas, s: HarpyStyle, cx: number, cy: number, flap: number, k: number, opts: { dive?: boolean; arms?: boolean; crown?: boolean } = {}) {
  const lean = opts.dive ? 0.6 : 0.1;
  const sx = cx, sy = cy - 5 * k; // shoulders
  // wings (one behind, one in front), feathered trailing edge
  const wing = (dir: number, dim: number) => {
    const tipY = opts.dive ? sy - 10 * k : sy - flap * 14 * k; // diving: swept back and up
    const tipX = opts.dive ? sx - 18 * k : sx + dir * 2 * k - 16 * k * (opts.dive ? 1 : 0.9);
    const midX = sx - 8 * k, midY = sy - flap * 7 * k;
    const c = shade(s.wing, dim), cd = shade(s.wingD, dim);
    p.poly([[sx, sy], [midX, midY - 3 * k], [tipX, tipY], [tipX + 4 * k, tipY + 6 * k], [midX + 2 * k, sy + 6 * k], [sx + 1, sy + 4 * k]], c);
    for (let f = 0; f < 5; f++) {
      const t = f / 5;
      const fx = tipX + (sx - tipX) * t + 2 * k, fy = tipY + (sy + 5 * k - tipY) * t + 4 * k;
      p.line(fx, fy, fx - 2 * k, fy + 5 * k, cd, 1.5 * k);
    }
    p.line(sx, sy, tipX, tipY, shade(s.wingL, dim), Math.max(1, k));
  };
  wing(-1, 0.7);
  // legs: feathered thighs and taloned feet hanging below
  const hip = cy + 5 * k;
  p.line(cx - 1, hip, cx - 2 + lean * 6, hip + 7 * k, s.wingD, 2.4 * k);
  p.line(cx + 2, hip, cx + 2 + lean * 6, hip + 7 * k, s.wing, 2.4 * k);
  for (const fx of [cx - 2 + lean * 6, cx + 2 + lean * 6]) {
    p.line(fx, hip + 7 * k, fx + 2 * k, hip + 10 * k, s.talon, Math.max(1, k * 0.9));
    p.line(fx, hip + 7 * k, fx - 1.5 * k, hip + 10 * k, s.talon, Math.max(1, k * 0.9));
  }
  // torso
  p.poly([[sx - 3 * k, sy], [sx + 3 * k, sy], [cx + 2.5 * k + lean * 3, hip], [cx - 2.5 * k + lean * 3, hip]], s.skinD);
  p.poly([[sx - 2 * k, sy], [sx + 3 * k, sy], [cx + 2.5 * k + lean * 3, hip], [cx - 0.5 * k + lean * 3, hip]], s.skin);
  p.line(cx - 3 * k + lean * 3, hip - 1, cx + 3 * k + lean * 3, hip - 1, s.wing, 2 * k); // feathered skirt
  // head with long streaming hair
  const hx = sx + 1 * k + lean * 4, hy = sy - 4 * k;
  p.line(hx - 1, hy - 1, hx - 9 * k, hy + 4 * k + flap * 2, s.hair, 2.6 * k);
  p.line(hx - 6 * k, hy + 2 * k, hx - 11 * k, hy + 7 * k + flap * 2, shade(s.hair, 0.8), 1.6 * k);
  p.circle(hx, hy, 3.2 * k, s.hair);
  p.ellipse(hx + 1 * k, hy + 0.5 * k, 2.2 * k, 2.6 * k, s.skin);
  p.set(hx + 2 * k, hy, s.eye);
  if (k > 1.5) p.set(hx + 2 * k + 1, hy, s.eye);
  p.set(hx + 2 * k, hy + 2 * k, s.skinD); // mouth
  if (opts.crown) {
    // a crest of tall feathers
    for (let f = 0; f < 5; f++) p.line(hx - 2 * k + f * k, hy - 3 * k, hx - 4 * k + f * 1.6 * k, hy - 9 * k + Math.abs(f - 2) * 1.5 * k, f % 2 ? s.wingL : s.talon, Math.max(1, k * 0.8));
  }
  // arms
  if (opts.arms) {
    p.line(sx + 2 * k, sy + 1, sx + 7 * k, sy - 7 * k, s.skinD, 1.8 * k);
    p.line(sx - 2 * k, sy + 1, sx - 6 * k, sy - 6 * k, s.skinD, 1.6 * k);
  } else p.line(sx + 2 * k, sy + 1, sx + 5 * k, sy + 5 * k, s.skinD, 1.6 * k);
  wing(1, 1);
}

export function buildHarpySheet(): SheetBuilder {
  const b = new SheetBuilder(48, 40, 24, 20);
  const draw = (flap: number, dive = false) => {
    const p = b.canvas();
    harpy(p, HARPY, 26, 20, flap, 1, { dive });
    return fin(p);
  };
  b.add('fly', draw(1), draw(0.3), draw(-0.8), draw(0));
  b.add('dive', draw(0, true));
  return b;
}

// ---------------------------------------------------------------- bell wraith

export function buildWraithSheet(): SheetBuilder {
  const b = new SheetBuilder(36, 44, 18, 22);
  const robe = hex('#3a3448'), robeD = hex('#221e2e'), robeL = hex('#5a5270'), glow = hex('#a8f0ff');
  const bronze = hex('#b08840'), bronzeD = hex('#6a4a20');
  const draw = (i: number, ring: number) => {
    const p = b.canvas();
    const cx = 16, top = 6;
    // flowing robe that frays into wisps
    const pts: [number, number][] = [[cx - 4, top + 4], [cx + 5, top + 4], [cx + 8, top + 22]];
    for (let k = 0; k <= 6; k++) {
      const x = cx + 8 - k * 2.6;
      pts.push([x, top + 30 + Math.sin(k * 1.7 + i * 1.6) * 3 + (k % 2) * 3]);
    }
    pts.push([cx - 8, top + 22]);
    p.poly(pts, robeD);
    p.poly([[cx - 2, top + 4], [cx + 5, top + 4], [cx + 7, top + 22], [cx + 2, top + 30], [cx - 3, top + 22]], robe);
    p.line(cx + 5, top + 6, cx + 7, top + 22, robeL);
    // hood with an empty face and two cold eyes
    p.circle(cx + 1, top + 4, 5, robeD);
    p.circle(cx + 1.5, top + 4, 4.2, robe);
    p.ellipse(cx + 3, top + 5, 2.6, 3, hex('#06040a'));
    p.set(cx + 2, top + 4, glow);
    p.set(cx + 4, top + 4, glow);
    // arm raising a hand bell
    const lift = ring ? -6 - ring * 2 : 0;
    const hx = cx + 9, hy = top + 14 + lift;
    p.line(cx + 4, top + 9, hx, hy, robe, 2.2);
    p.line(hx, hy, hx, hy + 2, robeD, 1);
    const sw = ring === 1 ? 2 : ring === 2 ? -2 : 0;
    p.poly([[hx - 2 + sw, hy + 2], [hx + 2 + sw, hy + 2], [hx + 4 + sw, hy + 8], [hx - 4 + sw, hy + 8]], bronze);
    p.line(hx - 4 + sw, hy + 8, hx + 4 + sw, hy + 8, bronzeD, 1.5);
    p.set(hx + sw, hy + 9, bronzeD);
    return fin(p, hex('#0a0810'));
  };
  b.add('float', draw(0, 0), draw(1, 0), draw(2, 0), draw(3, 0));
  b.add('ring', draw(0, 1), draw(1, 2));
  return b;
}

// ---------------------------------------------------------------- frost crawler

export function buildCrawlerSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 22, 16, 11);
  const shell = hex('#4a7aa0'), shellD = hex('#22405a'), ice = hex('#c8ecff'), eye = hex('#60ffff');
  const draw = (i: number, curled = false) => {
    const p = b.canvas();
    const cx = 15, cy = 12;
    // six legs
    for (let k = 0; k < 3; k++) {
      const lx = cx - 6 + k * 6, ph = Math.sin(i * 1.6 + k * 2) * 2;
      if (curled) p.line(lx, cy + 2, lx + 1, cy + 4, shellD, 1.4);
      else {
        p.line(lx, cy + 2, lx - 2 + ph, cy + 5, shellD, 1.4);
        p.line(lx - 2 + ph, cy + 5, lx - 3 + ph, cy + 8, shellD, 1);
      }
    }
    // shell with ice spikes along its back
    p.ellipse(cx, cy, 10, 5, shellD);
    p.ellipse(cx, cy - 1, 9, 4, shell);
    for (let k = 0; k < 4; k++) {
      const sx = cx - 6 + k * 4;
      p.poly([[sx - 2, cy - 3], [sx + 0.5, cy - 9 - (k % 2) * 2], [sx + 2, cy - 3]], ice);
      p.line(sx, cy - 4, sx + 0.5, cy - 8 - (k % 2) * 2, hex('#ffffff'));
    }
    // head and mandibles
    p.circle(cx + 9, cy + 1, 3, shellD);
    p.set(cx + 10, cy, eye);
    p.set(cx + 11, cy + 1, eye);
    const m = i % 2;
    p.line(cx + 11, cy + 3, cx + 14, cy + 2 + m, ice);
    p.line(cx + 11, cy + 3, cx + 14, cy + 4 - m, ice);
    return fin(p, hex('#0a1420'));
  };
  b.add('crawl', draw(0), draw(1), draw(2), draw(3));
  b.add('drop', draw(0, true));
  return b;
}

// ================================================================ experimental enemies (0.4.0)
// Hookjaw, Mire Eel, Gloomcaster, Rot Ooze, Grave Grub. AI in game/enemies_extra.ts.

// ---------------------------------------------------------------- hookjaw

interface HookjawPose {
  step: number; // -1..1 stride
  arm: 'down' | 'wind' | 'throw'; // the hook arm (front)
  cleaver: 0 | 1 | 2; // 0 lowered, 1 raised, 2 chopped down in front
}

export function buildHookjawSheet(): SheetBuilder {
  const b = new SheetBuilder(44, 42, 20, 22);
  const skin = hex('#6a7058'), skinD = hex('#3e4234'), skinL = hex('#8a9070');
  const leather = hex('#4a3424'), leatherD = hex('#2a1c14');
  const iron = hex('#7a7e8a'), ironD = hex('#3a3c46'), rust = hex('#8a4a2a');
  const draw = (q: HookjawPose) => {
    const p = b.canvas();
    const gx = 20, ground = 40;
    // legs
    p.line(gx - 3, 29, gx - 5 - q.step * 3, ground - 1, skinD, 3.2);
    p.line(gx + 3, 29, gx + 4 + q.step * 3, ground - 1, skin, 3.4);
    p.rect(gx - 8 - q.step * 3, ground - 2, 5, 2, leatherD);
    p.rect(gx + 2 + q.step * 3, ground - 2, 6, 2, leatherD);
    // cleaver arm (behind)
    const cl = q.cleaver;
    const hand: [number, number] = cl === 0 ? [gx - 7, 28] : cl === 1 ? [gx - 9, 6] : [gx + 13, 26];
    p.line(gx - 3, 15, hand[0], hand[1], skinD, 3);
    if (cl === 0) p.poly([[hand[0] - 2, hand[1]], [hand[0] + 2, hand[1]], [hand[0] + 3, hand[1] + 9], [hand[0] - 4, hand[1] + 9]], iron);
    else if (cl === 1) p.poly([[hand[0] - 1, hand[1] - 1], [hand[0] + 6, hand[1] - 3], [hand[0] + 7, hand[1] - 11], [hand[0], hand[1] - 9]], iron);
    else p.poly([[hand[0], hand[1] - 2], [hand[0] + 10, hand[1] - 1], [hand[0] + 10, hand[1] + 5], [hand[0], hand[1] + 3]], iron);
    // hunched torso with a leather apron
    p.poly([[gx - 8, 14], [gx + 6, 11], [gx + 10, 18], [gx + 7, 30], [gx - 7, 30], [gx - 10, 21]], skinD);
    p.poly([[gx - 6, 14], [gx + 5, 12], [gx + 8, 18], [gx + 5, 28], [gx - 5, 28], [gx - 7, 20]], skin);
    p.line(gx - 5, 15, gx + 4, 13, skinL, 1.5);
    p.poly([[gx - 6, 22], [gx + 7, 21], [gx + 6, 33], [gx - 5, 33]], leather);
    p.line(gx - 6, 22, gx + 7, 21, leatherD, 1.5);
    // a loop of chain over the shoulder
    for (let k = 0; k < 6; k++) p.set(gx - 6 + k * 2, 16 + Math.abs(k - 2.5) * 1.6, iron);
    // head pushed forward and low, caged in an iron muzzle
    const hx = gx + 9, hy = 12;
    p.circle(hx, hy, 4.5, skinD);
    p.circle(hx + 0.5, hy - 0.5, 3.8, skin);
    p.rect(hx + 1, hy - 1, 6, 6, ironD);
    for (let k = 0; k < 3; k++) p.line(hx + 2 + k * 2, hy - 1, hx + 2 + k * 2, hy + 4, iron);
    p.line(hx + 1, hy + 2, hx + 7, hy + 2, rust);
    p.set(hx + 1, hy - 2, hex('#ffd040')); // eye
    p.set(hx + 2, hy - 2, hex('#ffd040'));
    // hook arm (front)
    if (q.arm === 'down') {
      p.line(gx + 4, 15, gx + 8, 25, skin, 3);
      p.line(gx + 8, 25, gx + 9, 31, ironD); // the hook hanging on a short chain
      p.line(gx + 9, 31, gx + 12, 29, iron, 1.5);
    } else if (q.arm === 'wind') {
      p.line(gx + 4, 15, gx - 4, 8, skin, 3);
      p.line(gx - 4, 8, gx - 12, 4, ironD); // chain whirled over the head
      p.line(gx - 12, 4, gx - 15, 1, iron, 1.5);
      p.line(gx - 15, 1, gx - 13, -1, iron, 1.5);
    } else p.line(gx + 4, 15, gx + 15, 15, skin, 3);
    return fin(p);
  };
  b.add('walk', ...[0, 1, 0, -1].map((s) => draw({ step: s, arm: 'down', cleaver: 0 })));
  b.add('wind', draw({ step: 0, arm: 'wind', cleaver: 0 }));
  b.add('throw', draw({ step: 0.5, arm: 'throw', cleaver: 0 }));
  b.add('chop', draw({ step: 0, arm: 'down', cleaver: 1 }), draw({ step: 1, arm: 'down', cleaver: 2 }));
  return b;
}

// ---------------------------------------------------------------- mire eel

export function buildEelSheet(): SheetBuilder {
  const b = new SheetBuilder(52, 22, 26, 11);
  const back = hex('#5a5a48'), belly = hex('#c8c4a8'), fin_ = hex('#7a7a60'), gill = hex('#a04040');
  const draw = (ph: number, bite: number) => {
    const p = b.canvas();
    const cy = 11, n = 22;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const f = k / n; // 0 tail .. 1 head
      const x = 4 + f * 38;
      const y = cy + Math.sin(f * 7 - ph) * 3.5 * (1 - f * 0.8);
      pts.push([x, y, 1.2 + Math.sin(f * Math.PI * 0.85) * 3.6]);
    }
    // ribbon fin along the back
    for (const [x, y, r] of pts) p.line(x, y - r - 1.5, x, y, fin_);
    for (const [x, y, r] of pts) p.circle(x, y, r, back);
    for (const [x, y, r] of pts) if (r > 1.5) p.line(x, y + r * 0.2, x, y + r - 0.5, belly);
    // head with a wide, needle-toothed mouth
    const [hx, hy] = pts[n];
    const open = bite * 4;
    p.poly([[hx - 2, hy - 3], [hx + 8, hy - 2 - open * 0.5], [hx + 7, hy], [hx - 2, hy + 1]], back);
    p.poly([[hx - 2, hy + 1], [hx + 7, hy + 1 + open], [hx + 6, hy + 3 + open], [hx - 2, hy + 3]], belly);
    if (bite) for (let k = 0; k < 3; k++) {
      p.set(hx + 1 + k * 2, hy - 1, hex('#f0ece0'));
      p.set(hx + 1 + k * 2, hy + open, hex('#f0ece0'));
    }
    p.line(hx - 3, hy - 2, hx - 3, hy + 2, gill);
    p.set(hx + 2, hy - 2, hex('#e8f0f0')); // a milky blind eye
    return fin(p, hex('#0a0c08'));
  };
  b.add('swim', draw(0, 0), draw(1.6, 0), draw(3.2, 0), draw(4.8, 0));
  b.add('bite', draw(0.8, 1));
  return b;
}

// ---------------------------------------------------------------- gloomcaster

export function buildCasterSheet(): SheetBuilder {
  const b = new SheetBuilder(36, 44, 16, 22);
  const robe = hex('#2a2238'), robeD = hex('#16101e'), robeL = hex('#4a3a5e');
  const skin = hex('#a8a098'), glow = hex('#c060ff'), glowL = hex('#f0c8ff'), wood = hex('#4a3424');
  const draw = (sway: number, cast: number) => {
    const p = b.canvas();
    const cx = 16, top = 5, ground = 40;
    // staff held out front
    const sx = cx + 9, sy = cast ? top + 4 : top + 8;
    p.line(sx, sy, sx - 1, ground - 1, wood, 1.5);
    p.circle(sx, sy - 2, cast ? 3 : 2, glow);
    p.set(sx, sy - 2, glowL);
    // long robe, hem dragging
    const hem: [number, number][] = [];
    for (let k = 0; k <= 5; k++) hem.push([cx + 8 - k * 3.4, ground - (k % 2) + sway * (k / 5)]);
    p.poly([[cx - 4, top + 7], [cx + 4, top + 7], [cx + 8, ground], ...hem, [cx - 9, ground]], robeD);
    p.poly([[cx - 2, top + 7], [cx + 4, top + 7], [cx + 7, ground - 1], [cx + 1, ground - 1], [cx - 3, top + 20]], robe);
    p.line(cx + 4, top + 8, cx + 7, ground - 2, robeL);
    // sigil stitched on the chest
    p.set(cx + 1, top + 14, glow);
    p.set(cx, top + 15, glow);
    p.set(cx + 2, top + 15, glow);
    // deep hood with a pale, hollow-eyed face
    p.circle(cx + 1, top + 4, 5.5, robeD);
    p.circle(cx + 1.5, top + 4.5, 4.5, robe);
    p.ellipse(cx + 3, top + 5, 2.4, 3, skin);
    p.set(cx + 3, top + 4, hex('#100818'));
    p.set(cx + 4, top + 4, cast ? glowL : hex('#100818'));
    p.set(cx + 3, top + 7, hex('#5a4a50'));
    // arms: one on the staff, the other raised when casting
    p.line(cx + 2, top + 10, sx, sy + 4, robe, 2.2);
    p.circle(sx, sy + 4, 1.2, skin);
    if (cast) {
      p.line(cx - 1, top + 10, cx - 6, top + 2, robe, 2.2);
      p.circle(cx - 6, top + 1, 1.3, skin);
      p.circle(cx - 6, top - 1, 2.2, glow);
    } else p.line(cx - 1, top + 10, cx - 3, top + 18, robe, 2.2);
    return fin(p, hex('#08040c'));
  };
  b.add('idle', draw(0, 0), draw(1, 0));
  b.add('cast', draw(0, 1), draw(1, 1));
  return b;
}

// ---------------------------------------------------------------- rot ooze

/** Three sizes of ooze (big, mid, small), each with a resting and a squashed frame, plus a midair stretch. */
export function buildOozeSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 28, 16, 26);
  const slime = hex('#5a7a2a'), slimeD = hex('#34481a'), slimeL = hex('#a0c050'), bone = hex('#d8d0b0');
  const draw = (r: number, squash: number) => {
    const p = b.canvas();
    const rx = r * (1 + squash * 0.25), ry = r * (0.8 - squash * 0.2);
    const cy = 26 - ry;
    p.ellipse(16, cy, rx, ry, slimeD);
    p.ellipse(16, cy - 0.5, rx - 1, ry - 1, slime);
    // drips along the base
    for (let k = -1; k <= 1; k++) p.circle(16 + k * rx * 0.6, 25.5, Math.max(1, r * 0.18), slimeD);
    // things caught inside: a little skull and a bone
    if (r > 6) {
      p.circle(13, cy + 1, r * 0.22, bone);
      p.set(12, cy + 1, slimeD);
      p.set(14, cy + 1, slimeD);
      p.line(17, cy + 3, 20, cy + 1, bone);
    }
    p.ellipse(16 - rx * 0.35, cy - ry * 0.45, rx * 0.25, ry * 0.22, slimeL);
    // eyes
    p.set(16 + rx * 0.35, cy - ry * 0.2, hex('#f8f080'));
    p.set(16 + rx * 0.55, cy - ry * 0.2, hex('#f8f080'));
    return fin(p, hex('#0e1408'));
  };
  const sizes: [string, number][] = [['big', 11], ['mid', 7.5], ['small', 4.5]];
  for (const [name, r] of sizes) {
    b.add(name, draw(r, 0), draw(r, 1));
    b.add(name + 'Air', draw(r, -0.8));
  }
  return b;
}

// ---------------------------------------------------------------- grave grub

export function buildGrubSheet(): SheetBuilder {
  const b = new SheetBuilder(32, 40, 16, 36);
  const flesh = hex('#d8b8a0'), fleshD = hex('#8a6050'), dirt = hex('#5a4030'), dirtL = hex('#7a5a40');
  const mouth = hex('#3a0a10'), tooth = hex('#f0e8d0');
  // the hump of earth that shows where it is digging
  const mound = (i: number) => {
    const p = b.canvas();
    p.ellipse(16, 36, 9 + i, 4 - i * 0.5, dirt);
    p.ellipse(15, 35, 6, 2, dirtL);
    for (let k = 0; k < 3; k++) p.set(9 + k * 6 + i, 33 - (k % 2), dirtL);
    return fin(p, hex('#1a1008'));
  };
  /** The grub reared up: `h` = how far out of the ground (0..1), `open` mouth. */
  const rear = (h: number, open: boolean) => {
    const p = b.canvas();
    const segs = 6, top = 36 - h * 30;
    for (let k = segs; k >= 0; k--) {
      const y = 36 - (k / segs) * (36 - top);
      if (y > 36) continue;
      const r = 5 - Math.abs(k - 2) * 0.4;
      p.circle(16 + Math.sin(k * 0.8) * 1.5, y, r, fleshD);
      p.circle(16 + Math.sin(k * 0.8) * 1.5 - 0.5, y - 0.5, r - 1, flesh);
    }
    if (open) {
      p.circle(16, top, 4, mouth);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        p.set(16 + Math.cos(a) * 3.5, top + Math.sin(a) * 3.5, tooth);
      }
    } else p.line(14, top - 1, 18, top - 1, mouth);
    p.ellipse(16, 36, 10, 3, dirt); // churned earth at the hole
    p.ellipse(16, 35.5, 7, 1.5, dirtL);
    return fin(p, hex('#1a1008'));
  };
  /** Lying stranded on the surface, curling. */
  const flop = (i: number) => {
    const p = b.canvas();
    for (let k = 0; k <= 6; k++) {
      const x = 5 + k * 3.6, y = 32 - Math.sin(k * 0.6 + i) * 2 - (k === 6 ? 1 : 0);
      p.circle(x, y, 3.6, fleshD);
      p.circle(x - 0.3, y - 0.5, 2.8, flesh);
    }
    p.circle(28, 30 - i, 2.4, mouth);
    p.set(29, 29 - i, tooth);
    p.set(27, 31 - i, tooth);
    return fin(p, hex('#1a1008'));
  };
  b.add('mound', mound(0), mound(1));
  b.add('burst', rear(1, true));
  b.add('dig', rear(0.4, false));
  b.add('wriggle', flop(0), flop(1.5));
  return b;
}

