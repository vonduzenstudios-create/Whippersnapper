// Paints a whole room's foreground tile layer into one canvas.
import { PixelCanvas, hex, RGBA, shade, mix } from './pixel';
import { hash2 } from '../core/util';
import type { Theme } from '../world/rooms';
import { TILE } from '../config';

interface TilePal {
  base: RGBA;
  mortar: RGBA;
  hl: RGBA;
  top: RGBA;
  top2: RGBA;
  rough: boolean;
  plat: RGBA;
  platD: RGBA;
}

export function paletteFor(theme: Theme): TilePal {
  switch (theme) {
    case 'outdoor':
    case 'courtyard':
      return { base: hex('#4a4e68'), mortar: hex('#22243a'), hl: hex('#7078a0'), top: hex('#3a6040'), top2: hex('#5a8a50'), rough: false, plat: hex('#6a5a50'), platD: hex('#3a3030') };
    case 'hall':
    case 'stair':
    case 'shrine':
      return { base: hex('#3c4058'), mortar: hex('#1c1e30'), hl: hex('#6a70a0'), top: hex('#7a2030'), top2: hex('#a83848'), rough: false, plat: hex('#5a5468'), platD: hex('#2a2638') };
    case 'catacomb':
    case 'flooded':
    case 'chasm':
      return { base: hex('#4c4238'), mortar: hex('#241c18'), hl: hex('#76685a'), top: hex('#3a5a30'), top2: hex('#5a7a40'), rough: true, plat: hex('#cfc4a4'), platD: hex('#7c7058') };
    case 'lair':
      return { base: hex('#4a2c2c'), mortar: hex('#1e0e10'), hl: hex('#7a4a44'), top: hex('#b8ac8a'), top2: hex('#e2d8b8'), rough: true, plat: hex('#cfc4a4'), platD: hex('#7c7058') };
    case 'snow':
      return { base: hex('#545c72'), mortar: hex('#262a3a'), hl: hex('#8a96b4'), top: hex('#c8d6f0'), top2: hex('#f4f8ff'), rough: true, plat: hex('#7a5a40'), platD: hex('#3e2c20') };
    case 'ice':
      return { base: hex('#3e5a78'), mortar: hex('#18243a'), hl: hex('#78a8d0'), top: hex('#a8d0f0'), top2: hex('#e4f4ff'), rough: true, plat: hex('#9ad0f0'), platD: hex('#4a7aa0') };
    case 'garden': // mossy garden walls and clipped hedge tops
      return { base: hex('#3c4838'), mortar: hex('#182016'), hl: hex('#68785a'), top: hex('#2a5226'), top2: hex('#46803a'), rough: false, plat: hex('#6a5038'), platD: hex('#382818') };
    case 'rooftop': // slate roofs with a dusting of frost
      return { base: hex('#3a3e54'), mortar: hex('#181a28'), hl: hex('#6a7090'), top: hex('#a8b4d0'), top2: hex('#e0e8f8'), rough: false, plat: hex('#5a4838'), platD: hex('#2e241c') };
    case 'belfry': // old stone and dark timber
      return { base: hex('#4a3e36'), mortar: hex('#1e1612'), hl: hex('#7a6a5a'), top: hex('#5a3a20'), top2: hex('#8a6038'), rough: false, plat: hex('#7a5a38'), platD: hex('#3a2a18') };
    case 'aqueduct': // frost-rimed masonry
      return { base: hex('#465668'), mortar: hex('#1a2230'), hl: hex('#86a0b8'), top: hex('#aecce4'), top2: hex('#e8f4ff'), rough: true, plat: hex('#9ab8d0'), platD: hex('#4a6a88') };
  }
}

const SNOWY: Theme[] = ['snow', 'ice', 'rooftop', 'aqueduct'];
/** Themes whose floors get a carpet/trim stripe instead of grass tufts. */
const TRIMMED: Theme[] = ['hall', 'stair', 'shrine', 'belfry'];

export function paintTiles(tiles: string[][], theme: Theme): PixelCanvas {
  const rows = tiles.length, cols = tiles[0].length;
  const p = new PixelCanvas(cols * TILE, rows * TILE);
  const pal = paletteFor(theme);
  const snowy = SNOWY.includes(theme);
  const solid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return true;
    const c = tiles[y][x];
    return c === '#' || c === 'B' || c === 'H' || c === 'N';
  };
  // distance from open space, used to darken deep wall interiors
  const depth: number[][] = [];
  for (let y = 0; y < rows; y++) {
    depth.push([]);
    for (let x = 0; x < cols; x++) {
      if (!solid(x, y)) {
        depth[y].push(0);
        continue;
      }
      let d = 4;
      for (let r = 1; r <= 3 && d === 4; r++)
        for (let j = -r; j <= r && d === 4; j++)
          for (let i = -r; i <= r; i++) {
            const xx = x + i, yy = y + j;
            if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
            if (!solid(xx, yy)) {
              d = r;
              break;
            }
          }
      depth[y].push(d);
    }
  }

  for (let ty = 0; ty < rows; ty++)
    for (let tx = 0; tx < cols; tx++) {
      const c = tiles[ty][tx];
      const ox = tx * TILE, oy = ty * TILE;
      if (c === '#' || c === 'B') {
        const dk = [1, 1, 0.78, 0.58, 0.42][depth[ty][tx]];
        for (let y = 0; y < TILE; y++)
          for (let x = 0; x < TILE; x++) {
            const gx = ox + x, gy = oy + y;
            const brickH = pal.rough ? 8 : 8;
            const row = Math.floor(gy / brickH);
            const bw = pal.rough ? 12 + Math.floor(hash2(row, 7) * 8) : 16;
            const off = row % 2 ? bw / 2 : 0;
            const bx = Math.floor((gx + off) / bw);
            const lx = (gx + off) % bw, ly = gy % brickH;
            let col: RGBA;
            const v = hash2(bx, row, 3);
            if (ly === 0 || lx === 0) col = pal.mortar;
            else {
              col = shade(pal.base, 0.86 + v * 0.28);
              if (ly === 1 || lx === 1) col = mix(col, pal.hl, 0.35);
              if (ly === brickH - 1 || lx === bw - 1) col = shade(col, 0.78);
              const n = hash2(gx, gy, 11);
              if (n < 0.06) col = shade(col, 0.8);
              else if (n > 0.96) col = mix(col, pal.hl, 0.4);
              if (pal.rough && hash2(bx, row, 5) < 0.04 && lx > 3 && lx < bw - 3 && ly > 1 && ly < 7) {
                // embedded skull
                const sx = lx - bw / 2, sy = ly - 4;
                if (sx * sx + sy * sy < 7) col = hex('#cfc4a4');
                if ((sx === -1 || sx === 1) && sy === 0) col = hex('#1a1210');
              }
            }
            p.set(gx, gy, shade(col, dk));
          }
        // exposed edges
        if (!solid(tx, ty - 1) && snowy) {
          // a thick, lumpy snow cap that spills a little over the edge
          for (let x = 0; x < TILE; x++) {
            const gx = ox + x;
            const deep = 3 + Math.round(2 * Math.sin(gx * 0.35 + ty) + hash2(gx >> 2, ty, 21) * 2);
            for (let y = 0; y < deep; y++) p.set(gx, oy + y, y === 0 ? pal.top2 : y === deep - 1 ? pal.top : mix(pal.top2, pal.top, y / deep));
            if (hash2(gx, oy, 22) < 0.35) p.set(gx, oy - 1, pal.top2);
          }
        } else if (!solid(tx, ty - 1)) {
          for (let x = 0; x < TILE; x++) {
            p.set(ox + x, oy, pal.hl);
            p.set(ox + x, oy + 1, mix(pal.base, pal.hl, 0.5));
            const h = hash2(ox + x, oy, 9);
            if (!TRIMMED.includes(theme)) {
              if (h < 0.5) p.set(ox + x, oy, pal.top2);
              if (h < 0.3) p.set(ox + x, oy + 1, pal.top);
              if (h < 0.12) p.set(ox + x, oy + 2, pal.top);
              if (h > 0.85) p.set(ox + x, oy - 1, pal.top2);
            } else {
              // carpet runner / trim
              p.set(ox + x, oy, pal.top2);
              p.set(ox + x, oy + 1, pal.top);
              p.set(ox + x, oy + 2, shade(pal.top, 0.6));
            }
          }
        }
        if (!solid(tx, ty + 1)) {
          for (let x = 0; x < TILE; x++) {
            p.set(ox + x, oy + TILE - 1, shade(pal.mortar, 0.6));
            p.set(ox + x, oy + TILE - 2, shade(pal.base, 0.6));
          }
          if (snowy) {
            // icicles hanging from overhangs
            for (let k = 0; k < 3; k++) {
              if (hash2(tx * 3 + k, ty, 23) < 0.45) continue;
              const ix = ox + 2 + k * 5 + Math.floor(hash2(tx, k, 24) * 3), len = 3 + Math.floor(hash2(tx, ty + k, 25) * 6);
              p.poly([[ix - 1.5, oy + TILE], [ix + 1.5, oy + TILE], [ix, oy + TILE + len]], pal.top);
              p.line(ix - 0.5, oy + TILE, ix - 0.5, oy + TILE + len * 0.6, pal.top2);
            }
          }
        }
        if (!solid(tx - 1, ty)) for (let y = 0; y < TILE; y++) p.set(ox, oy + y, mix(pal.base, pal.hl, 0.6));
        if (!solid(tx + 1, ty)) for (let y = 0; y < TILE; y++) p.set(ox + TILE - 1, oy + y, shade(pal.base, 0.55));
        if (c === 'B') {
          // cracked stones: hint that they can be broken
          const crack = hex('#0c0a10');
          p.line(ox + 3, oy + 2, ox + 7, oy + 7, crack);
          p.line(ox + 7, oy + 7, ox + 5, oy + 12, crack);
          p.line(ox + 7, oy + 7, ox + 12, oy + 9, crack);
          p.line(ox + 12, oy + 9, ox + 13, oy + 14, crack);
        }
      } else if (c === 'H') {
        for (let y = 0; y < TILE; y++)
          for (let x = 0; x < TILE; x++) {
            const gx = ox + x;
            const plank = Math.floor(gx / 6);
            let col = shade(hex('#6a4a30'), 0.85 + hash2(plank, 1) * 0.3);
            if (gx % 6 === 0) col = hex('#2a1a10');
            if (y < 2) col = mix(col, hex('#a07a50'), 0.5);
            if (y > 9) col = shade(col, 0.6);
            if (y === 5 && gx % 6 === 3) col = hex('#8a8a9a'); // nails
            if (y > 11) col = y % 2 ? hex('#2a1a10') : [0, 0, 0, 0];
            p.set(gx, oy + y, col);
          }
        // iron band
        for (let x = 0; x < TILE; x++) p.set(ox + x, oy + 8, hex('#3a3440'));
      } else if (c === '=') {
        const lw = 6;
        for (let y = 0; y < lw; y++)
          for (let x = 0; x < TILE; x++) {
            let col = y === 0 ? mix(pal.plat, hex('#ffffff'), 0.25) : y === lw - 1 ? pal.platD : pal.plat;
            if (pal.rough) {
              // bone/plank ledge
              if ((ox + x) % 8 === 0) col = pal.platD;
            } else if ((ox + x) % 16 === 0) col = pal.platD;
            p.set(ox + x, oy + y, shade(col, 0.92 + hash2(ox + x, oy, 4) * 0.12));
          }
        // brackets under the ledge
        if (tx % 2 === 0) {
          p.line(ox + 4, oy + lw, ox + 8, oy + lw + 4, pal.platD, 2);
        }
      } else if (c === 'G') {
        // iron portcullis: see-through bars, a beam on top, spiked feet at the bottom
        const iron = hex('#4a4a5a'), ironHl = hex('#8a8ea0'), ironD = hex('#22222c');
        const isTop = tiles[ty - 1]?.[tx] !== 'G', isBottom = tiles[ty + 1]?.[tx] !== 'G';
        for (let k = 0; k < 4; k++) {
          const bx = ox + 1 + k * 4;
          p.rect(bx, oy, 2, isBottom ? 12 : TILE, iron);
          p.rect(bx, oy, 1, isBottom ? 12 : TILE, ironHl);
          if (isBottom) p.poly([[bx - 0.5, oy + 12], [bx + 1, oy + 15], [bx + 2.5, oy + 12]], ironHl);
        }
        for (const y of [3, 11]) {
          p.rect(ox, oy + y, TILE, 2, iron);
          p.rect(ox, oy + y, TILE, 1, ironHl);
          p.rect(ox, oy + y + 2, TILE, 1, ironD);
        }
        if (isTop) {
          p.rect(ox, oy, TILE, 3, ironD);
          p.rect(ox, oy, TILE, 1, iron);
        }
      } else if (c === '^' && snowy) {
        // jagged ice shards
        for (let k = 0; k < 4; k++) {
          const sx = ox + k * 4, h = 9 + Math.floor(hash2(tx * 4 + k, ty, 26) * 4);
          p.poly([[sx, oy + 16], [sx + 2, oy + 16 - h], [sx + 4, oy + 16]], hex('#6aa0d0'));
          p.line(sx + 1.5, oy + 17 - h, sx + 1.5, oy + 15, hex('#d8f0ff'));
          p.set(sx + 2, oy + 16 - h, hex('#ffffff'));
        }
        p.rect(ox, oy + 13, 16, 3, hex('#2a3a50'));
      } else if (c === '^') {
        for (let k = 0; k < 4; k++) {
          const sx = ox + k * 4;
          p.poly([[sx, oy + 16], [sx + 2, oy + 4], [sx + 4, oy + 16]], hex('#9a9ab0'));
          p.line(sx + 2, oy + 4, sx + 2, oy + 15, hex('#d8d8e8'));
          p.set(sx + 2, oy + 4, hex('#ffffff'));
        }
        p.rect(ox, oy + 13, 16, 3, hex('#3a2a2a'));
        if (hash2(tx, ty) < 0.3) p.set(ox + 6, oy + 9, hex('#a01020'));
      } else if (c === 'N') {
        // packed avalanche snow with a few buried stones
        for (let y = 0; y < TILE; y++)
          for (let x = 0; x < TILE; x++) {
            const gx = ox + x, gy = oy + y;
            const v = Math.sin(gx * 0.5 + gy * 0.3) + hash2(gx >> 1, gy >> 1, 27) * 1.2;
            let col = v > 1.2 ? hex('#a8b8d8') : v > 0.4 ? hex('#d4def0') : hex('#eef4ff');
            if (hash2(gx >> 2, gy >> 2, 28) > 0.93) col = hex('#5a6070');
            p.set(gx, gy, col);
          }
      }
    }
  return p;
}
