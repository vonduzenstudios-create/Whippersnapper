// Exports a boss's generated sprite sheet to PNG files, so an outside artist (or another AI)
// can study it and draw a replacement. Runs the game's own art code in Node, so the PNGs are
// pixel-identical to what the game draws.
//
//   npm run export:sprites            (writes art_exchange/bellmother/reference/)
//
// The folder's README.md is the hand-written brief; this script only rewrites reference/.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PixelCanvas, SheetBuilder, RGBA } from '../src/gfx/pixel';
import { buildBellMotherSheet } from '../src/gfx/art_bosses';
import { buildPortraitSheet } from '../src/gfx/art_portraits';
import { buildHeroSheet } from '../src/gfx/art_chars';

// ---------------------------------------------------------------- a tiny PNG writer

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** A 32-bit RGBA PNG of a PixelCanvas. */
function png(p: PixelCanvas): Buffer {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(p.w, 0);
  head.writeUInt32BE(p.h, 4);
  head[8] = 8; // bits per channel
  head[9] = 6; // RGBA
  const raw = Buffer.alloc((p.w * 4 + 1) * p.h);
  for (let y = 0; y < p.h; y++) {
    raw[y * (p.w * 4 + 1)] = 0; // no filter
    Buffer.from(p.data.buffer, y * p.w * 4, p.w * 4).copy(raw, y * (p.w * 4 + 1) + 1);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- helpers

/** The sheet exactly as the game packs it (view.ts buildSheet: up to 16 frames per row). */
function packSheet(b: SheetBuilder) {
  const cols = Math.min(16, b.frames.length), rows = Math.ceil(b.frames.length / cols);
  const big = new PixelCanvas(cols * b.cw, rows * b.ch);
  b.frames.forEach((f, i) => big.blit(f, (i % cols) * b.cw, Math.floor(i / cols) * b.ch));
  return big;
}

/** Nearest-neighbor upscale, over an optional solid background (easier to look at). */
function scale(p: PixelCanvas, k: number, bg?: RGBA) {
  const out = new PixelCanvas(p.w * k, p.h * k);
  if (bg) out.rect(0, 0, out.w, out.h, bg);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const c = p.get(x, y);
      if (c[3]) out.rect(x * k, y * k, k, k, c);
    }
  return out;
}

const hex6 = (c: RGBA) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');

/** Every opaque color, most-used first. */
function palette(p: PixelCanvas) {
  const counts = new Map<string, number>();
  for (let i = 0; i < p.data.length; i += 4) {
    if (!p.data[i + 3]) continue;
    const h = hex6([p.data[i], p.data[i + 1], p.data[i + 2], 255]);
    counts.set(h, (counts.get(h) || 0) + 1);
  }
  return [...counts].map(([hex, count]) => ({ hex, count })).sort((a, b) => b.count - a.count);
}

/** A strip of 16x16 swatches, one per palette color, most-used first. */
function swatches(colors: { hex: string }[]) {
  const per = 16, s = 16;
  const p = new PixelCanvas(per * s, Math.ceil(colors.length / per) * s);
  colors.forEach((c, i) => {
    const n = parseInt(c.hex.slice(1), 16);
    p.rect((i % per) * s, Math.floor(i / per) * s, s - 1, s - 1, [n >> 16, (n >> 8) & 255, n & 255, 255]);
  });
  return p;
}

// ---------------------------------------------------------------- the Bell-Mother

const OUT = join('art_exchange', 'bellmother', 'reference');
rmSync(OUT, { recursive: true, force: true });
for (const d of ['frames', 'frames_x4', 'portraits']) mkdirSync(join(OUT, d), { recursive: true });
const save = (name: string, p: PixelCanvas) => writeFileSync(join(OUT, name), png(p));

const b = buildBellMotherSheet();
const sheet = packSheet(b);
save('bellmother_sheet.png', sheet);
save('bellmother_sheet_x4.png', scale(sheet, 4, [40, 36, 48, 255]));

// each frame alone, at 1x and 4x, named after its animation
const names: string[] = [];
for (const [anim, idx] of Object.entries(b.anims))
  idx.forEach((fi, k) => {
    names[fi] = `${anim}_${k}`;
    save(`frames/${anim}_${k}.png`, b.frames[fi]);
    save(`frames_x4/${anim}_${k}.png`, scale(b.frames[fi], 4, [40, 36, 48, 255]));
  });

// a guide: the anchor (cyan cross) and the hitbox (magenta box) drawn over every frame
const HW = 20, HH = 24; // BellMother.hw / hh in game/bellmother.ts
const guide = scale(sheet, 4, [40, 36, 48, 255]);
const cyan: RGBA = [0, 255, 255, 255], magenta: RGBA = [255, 0, 255, 255], grid: RGBA = [90, 84, 100, 255];
b.frames.forEach((_, i) => {
  const ox = i * b.cw * 4;
  guide.rect(ox, 0, 1, guide.h, grid); // cell edges
  const ax = ox + b.ax * 4, ay = b.ay * 4;
  guide.rect(ax - 8, ay, 18, 2, cyan);
  guide.rect(ax, ay - 8, 2, 18, cyan);
  const l = ax - HW * 4, t = ay - HH * 4, w = HW * 8, h = HH * 8;
  guide.rect(l, t, w, 2, magenta);
  guide.rect(l, t + h, w, 2, magenta);
  guide.rect(l, t, 2, h, magenta);
  guide.rect(l + w, t, 2, h + 2, magenta);
});
save('bellmother_guide_x4.png', guide);

// the palette actually in the sheet
const pal = palette(sheet);
save('bellmother_palette.png', swatches(pal));

// her dialogue portraits (a separate 64x64 sheet shared by every speaker)
const pb = buildPortraitSheet();
const faces: string[] = [];
for (const [name, idx] of Object.entries(pb.anims))
  if (name.startsWith('bellmother_')) {
    faces.push(name);
    save(`portraits/${name}.png`, pb.frames[idx[0]]);
    save(`portraits/${name}_x4.png`, scale(pb.frames[idx[0]], 4, [40, 36, 48, 255]));
  }

// the hunter at the same scale, to show how big the boss is next to the player
const hero = buildHeroSheet();
const side = new PixelCanvas(b.cw + 8 + hero.cw, b.ch);
side.blit(b.frames[b.anims.fly[0]], 0, 0);
side.blit(hero.frames[hero.anims.idle?.[0] ?? 0], b.cw + 8, b.ch - hero.ch);
save('scale_vs_hero_x4.png', scale(side, 4, [40, 36, 48, 255]));

writeFileSync(
  join(OUT, 'sheet.json'),
  JSON.stringify(
    {
      image: 'bellmother_sheet.png',
      cell: { w: b.cw, h: b.ch },
      anchor: { x: b.ax, y: b.ay, note: 'the boss position in the world lands on this pixel of every frame' },
      hitbox: { halfW: HW, halfH: HH, note: 'centered on the anchor: a 40x48 box' },
      columns: Math.min(16, b.frames.length),
      frames: names.map((n, i) => ({ index: i, name: n, x: (i % 16) * b.cw, y: Math.floor(i / 16) * b.ch })),
      animations: b.anims,
      facing: 'right (the game mirrors it to face left)',
      palette: pal,
      portraits: { size: 64, faces },
    },
    null,
    2,
  ),
);

console.log(`Wrote ${OUT}: ${b.frames.length} frames (${b.cw}x${b.ch}), ${pal.length} colors, ${faces.length} portraits.`);
