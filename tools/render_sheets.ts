// Renders a mini-boss sheet to a PNG contact sheet, for checking puppet art without a browser.
// Usage (from the repo root):
//   node_modules/.bin/esbuild tools/render_sheets.ts --bundle --platform=node --outfile=tools/out/render.cjs
//   OUT=tools/out node tools/out/render.cjs <id> [zoom] [cols] [anim,anim,...] [props]
// Blue bar = the hero's height (36 px), brown line = the floor (the sheet's anchor row).
import * as zlib from 'zlib';
import * as fs from 'fs';
import { MINI_ART } from '../src/gfx/minis/index';
import { buildCastellanSheet } from '../src/gfx/art_castellan';

// castellan is here as the quality reference
const MINI_BUILDERS: Record<string, [() => any, () => any]> = { castellan: [buildCastellanSheet, buildCastellanSheet] };
for (const [id, a] of Object.entries(MINI_ART)) MINI_BUILDERS[id] = [a.sheet, a.props];

function crc32(buf: Uint8Array) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(w: number, h: number, rgba: Uint8Array) {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const [name, zs, cs, filt, which] = process.argv.slice(2);
const zoom = +(zs || 2), cols = +(cs || 6);
const sb = (which === 'props' ? MINI_BUILDERS[name][1] : MINI_BUILDERS[name][0])();
const list: number[] = [];
for (const [a, idx] of Object.entries(sb.anims)) if (!filt || filt.split(',').some((f) => a === f)) list.push(...idx);
const cw = sb.cw, ch = sb.ch, W = Math.min(cols, list.length) * cw * zoom, H = Math.ceil(list.length / cols) * ch * zoom;
const out = new Uint8Array(W * H * 4);
list.forEach((fi, n) => {
  const fr = sb.frames[fi], ox = (n % cols) * cw * zoom, oy = Math.floor(n / cols) * ch * zoom;
  for (let y = 0; y < ch * zoom; y++) for (let x = 0; x < cw * zoom; x++) {
    const sx = Math.floor(x / zoom), sy = Math.floor(y / zoom), i = (sy * cw + sx) * 4, o = ((oy + y) * W + ox + x) * 4;
    let r = n % 2 ? 46 : 54, g = n % 2 ? 40 : 46, b = n % 2 ? 58 : 66;
    if (sy === sb.ay) { r = 90; g = 70; b = 60; } // floor line
    if (sx >= 2 && sx < 5 && sy < sb.ay && sy >= sb.ay - 36) { r = 120; g = 160; b = 220; } // hero height (36 px)
    const a = fr.data[i + 3] / 255;
    out[o] = r * (1 - a) + fr.data[i] * a; out[o + 1] = g * (1 - a) + fr.data[i + 1] * a; out[o + 2] = b * (1 - a) + fr.data[i + 2] * a; out[o + 3] = 255;
  }
});
const file = `${process.env.OUT}/${name}${which === 'props' ? '_props' : ''}${filt ? '_' + filt.replace(/,/g, '-') : ''}.png`;
fs.writeFileSync(file, png(W, H, out));
console.log(file, list.length, 'frames', W + 'x' + H);
