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

// Each setting has its own stone, so areas read apart at a glance.
export function paletteFor(theme: Theme): TilePal {
  switch (theme) {
    case 'outdoor': // moonlit blue-grey granite
      return { base: hex('#4a4e68'), mortar: hex('#22243a'), hl: hex('#7078a0'), top: hex('#3a6040'), top2: hex('#5a8a50'), rough: false, plat: hex('#6a5a50'), platD: hex('#3a3030') };
    case 'courtyard': // weathered mauve stone
      return { base: hex('#58505e'), mortar: hex('#241e2a'), hl: hex('#8a7e92'), top: hex('#3a6040'), top2: hex('#5a8a50'), rough: false, plat: hex('#6a5a50'), platD: hex('#3a3030') };
    case 'hall': // cold blue-grey, a red runner
      return { base: hex('#3c4058'), mortar: hex('#1c1e30'), hl: hex('#6a70a0'), top: hex('#7a2030'), top2: hex('#a83848'), rough: false, plat: hex('#5a5468'), platD: hex('#2a2638') };
    case 'stair': // dusky violet
      return { base: hex('#463c58'), mortar: hex('#1e1a2c'), hl: hex('#7a6a9e'), top: hex('#7a2030'), top2: hex('#a83848'), rough: false, plat: hex('#5a5468'), platD: hex('#2a2638') };
    case 'shrine': // old blue-green stone, a blue runner
      return { base: hex('#36484e'), mortar: hex('#141e22'), hl: hex('#62848c'), top: hex('#24386a'), top2: hex('#3a58a0'), rough: false, plat: hex('#4a5a62'), platD: hex('#1e2a30') };
    case 'catacomb': // brown earth-stone with bones
    case 'chasm':
      return { base: hex('#4c4238'), mortar: hex('#241c18'), hl: hex('#76685a'), top: hex('#3a5a30'), top2: hex('#5a7a40'), rough: true, plat: hex('#cfc4a4'), platD: hex('#7c7058') };
    case 'flooded': // damp, algae-stained
      return { base: hex('#3e4a40'), mortar: hex('#18201a'), hl: hex('#68806a'), top: hex('#3a5a30'), top2: hex('#5a7a40'), rough: true, plat: hex('#cfc4a4'), platD: hex('#7c7058') };
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
    case 'library': // warm tan-gold sandstone, a green reading carpet, oak shelf boards
      return { base: hex('#6a5a3c'), mortar: hex('#241a0e'), hl: hex('#a89062'), top: hex('#1e5a46'), top2: hex('#3a8a68'), rough: false, plat: hex('#8a6434'), platD: hex('#4a3016') };
  }
}

const SNOWY: Theme[] = ['snow', 'ice', 'rooftop', 'aqueduct'];
/** Themes whose floors get a carpet/trim stripe instead of grass tufts. */
const TRIMMED: Theme[] = ['hall', 'stair', 'shrine', 'belfry', 'library'];

/** Book cover colors for the library's bookcases. */
const BOOKS = ['#7a1e34', '#2e4a3a', '#3a3a68', '#8a5a2a', '#5a2a5a', '#6a6a3a', '#2a5a68', '#8a3a2a'].map((c) => hex(c));

/**
 * One bookcase tile ('K'): a dark oak frame and two bays of spines. Spine colors come from
 * the global pixel position, so neighbouring tiles line up.
 */
function paintBookcase(p: PixelCanvas, ox: number, oy: number, tx: number, ty: number, tiles: string[][]) {
  const oak = hex('#4a2c1a'), oakL = hex('#8a5a32'), oakD = hex('#24120a'), back = hex('#1a0e0c');
  const same = (x: number, y: number) => tiles[y]?.[x] === 'K';
  p.rect(ox, oy, TILE, TILE, back);
  for (const [bayTop, bayBase] of [[0, 6], [9, 14]]) {
    for (let x = 0; x < TILE; x++) {
      const gx = ox + x, k = Math.floor(gx / 3);
      const h = hash2(k, ty * 2 + (bayTop ? 1 : 0), 31);
      if (h < 0.09) continue; // a gap where a book is missing
      const col = BOOKS[Math.floor(hash2(k, ty * 2 + (bayTop ? 1 : 0), 32) * BOOKS.length)];
      const height = 3 + Math.floor(h * 3.2); // 3..6 tall, books lean at different heights
      const edge = gx % 3;
      for (let y = 0; y < height; y++) p.set(gx, oy + bayBase - y, edge === 0 ? shade(col, 1.35) : edge === 2 ? shade(col, 0.7) : col);
      if (height > 4 && edge === 1) p.set(gx, oy + bayBase - 2, hex('#c8a040')); // a gilt band
    }
    // the shelf board under each bay
    for (let x = 0; x < TILE; x++) {
      p.set(ox + x, oy + bayBase + 1, oakL);
      p.set(ox + x, oy + bayBase + 2 > oy + TILE - 1 ? oy + TILE - 1 : oy + bayBase + 2, oakD);
    }
  }
  if (!same(tx, ty - 1)) for (let x = 0; x < TILE; x++) for (let y = 0; y < 2; y++) p.set(ox + x, oy + y, y ? oak : oakL); // cornice
  if (!same(tx - 1, ty)) for (let y = 0; y < TILE; y++) p.set(ox, oy + y, y % 4 === 0 ? oakD : oak);
  if (!same(tx + 1, ty)) for (let y = 0; y < TILE; y++) p.set(ox + TILE - 1, oy + y, oakD);
  if (!same(tx, ty + 1)) for (let x = 0; x < TILE; x++) p.set(ox + x, oy + TILE - 1, oakD);
}

/**
 * One table tile ('D'): a walnut top with an apron, legs at the two ends of the run, and
 * whatever a reader left on it (books, an open folio, an inkwell), drawn just above the top.
 */
function paintTable(p: PixelCanvas, ox: number, oy: number, tx: number, ty: number, tiles: string[][]) {
  const wood = hex('#5a3420'), woodL = hex('#94603a'), woodD = hex('#2a160c');
  const leftEnd = tiles[ty]?.[tx - 1] !== 'D', rightEnd = tiles[ty]?.[tx + 1] !== 'D';
  // the top: a light lip, the board, its shadowed edge
  p.rect(ox, oy, TILE, 1, woodL);
  p.rect(ox, oy + 1, TILE, 2, wood);
  p.rect(ox, oy + 3, TILE, 1, woodD);
  // the apron under it, with a carved groove
  p.rect(ox + (leftEnd ? 1 : 0), oy + 4, TILE - (leftEnd ? 1 : 0) - (rightEnd ? 1 : 0), 3, shade(wood, 0.8));
  for (let x = 0; x < TILE; x += 2) p.set(ox + x, oy + 5, woodD);
  // turned legs at the ends
  const leg = (x: number) => {
    p.rect(x, oy + 4, 3, 12, wood);
    p.rect(x, oy + 4, 1, 12, woodL);
    p.rect(x + 2, oy + 4, 1, 12, woodD);
    p.rect(x - 1, oy + 9, 5, 1, woodD); // the turned ring
    p.rect(x - 1, oy + 15, 5, 1, woodD); // the foot
  };
  if (leftEnd) leg(ox + 1);
  if (rightEnd) leg(ox + TILE - 4);
  if (leftEnd) p.set(ox, oy + 1, woodD);
  if (rightEnd) p.set(ox + TILE - 1, oy + 1, woodD);
  // clutter on top
  const h = hash2(tx, ty, 61);
  const cx = ox + 3 + Math.floor(hash2(tx, ty, 62) * 6);
  if (h < 0.3) {
    // a stack of books
    for (let k = 0; k < 2 + Math.floor(h * 6) % 2; k++) {
      const col = BOOKS[Math.floor(hash2(tx, k, 63) * BOOKS.length)];
      const w = 7 - k, x = cx + (k % 2);
      p.rect(x, oy - 2 - k * 2, w, 2, col);
      p.rect(x, oy - 2 - k * 2, w, 1, shade(col, 1.3));
      p.set(x + w - 1, oy - 1 - k * 2, hex('#e8dcb8')); // page edges
    }
  } else if (h < 0.5) {
    // an open folio
    p.poly([[cx, oy], [cx + 4, oy - 2], [cx + 8, oy]], hex('#e8dcb8'));
    p.line(cx + 4, oy - 2, cx + 4, oy - 1, hex('#a89870'));
    p.set(cx + 2, oy - 1, hex('#5a4a3a'));
    p.set(cx + 6, oy - 1, hex('#5a4a3a'));
  } else if (h < 0.64) {
    // an inkwell and a quill
    p.rect(cx, oy - 3, 3, 3, hex('#1a1a2a'));
    p.set(cx + 1, oy - 4, hex('#3a3a5a'));
    p.line(cx + 2, oy - 4, cx + 6, oy - 9, hex('#e8e0d0'));
    p.set(cx + 5, oy - 8, hex('#c8c0b0'));
  }
}

/**
 * Paint a room's tiles. `layer` picks what goes in: 'main' is everything except furniture,
 * 'furniture' is only the bookcases and tables (drawn behind the hero and enemies, since you
 * walk in front of them), 'all' is both (the editor's palette previews).
 */
export function paintTiles(tiles: string[][], theme: Theme, layer: 'all' | 'main' | 'furniture' = 'all'): PixelCanvas {
  const rows = tiles.length, cols = tiles[0].length;
  const p = new PixelCanvas(cols * TILE, rows * TILE);
  const pal = paletteFor(theme);
  const snowy = SNOWY.includes(theme);
  const ramp = (c: string | undefined) => c === '/' || c === '\\';
  // "solid" for the art: a ramp counts, so the stone under it gets no floor trim of its own
  const solid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return true;
    const c = tiles[y][x];
    return c === '#' || c === 'B' || c === 'H' || c === 'N' || ramp(c);
  };
  /** The color of the stone wall at a pixel (bricks, mortar, the odd skull in rough walls). */
  const brick = (gx: number, gy: number): RGBA => {
    const brickH = 8;
    const row = Math.floor(gy / brickH);
    const bw = pal.rough ? 12 + Math.floor(hash2(row, 7) * 8) : 16;
    const off = row % 2 ? bw / 2 : 0;
    const bx = Math.floor((gx + off) / bw);
    const lx = (gx + off) % bw, ly = gy % brickH;
    if (ly === 0 || lx === 0) return pal.mortar;
    const v = hash2(bx, row, 3);
    let col = shade(pal.base, 0.86 + v * 0.28);
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
    return col;
  };
  const trimmed = TRIMMED.includes(theme);
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
      const isFurniture = c === 'K' || c === 'D';
      if (layer === 'main' && isFurniture) continue;
      if (layer === 'furniture' && !isFurniture) continue;
      if (c === 'K') {
        paintBookcase(p, ox, oy, tx, ty, tiles);
      } else if (c === 'D') {
        paintTable(p, ox, oy, tx, ty, tiles);
      } else if (ramp(c)) {
        // A ramp: you walk it as a smooth slope, but it's drawn as little steps (8 px deep,
        // 4 px high) with the runner over each tread. Same pairing rule as Room.rampAt.
        const down = c === '/' ? -1 : 1;
        let k = 0;
        while (k < 64 && tiles[ty][tx + down * (k + 1)] === c) k++;
        const [a, b] = c === '/' ? (k % 2 ? [8, 0] : [16, 8]) : k % 2 ? [0, 8] : [8, 16];
        const tread = (x: number) => Math.round(a + ((b - a) * (Math.floor(x / 8) * 8 + 4)) / TILE);
        for (let x = 0; x < TILE; x++) {
          const s = tread(x);
          // the riser: the downhill edge of each step
          const riser = down < 0 ? x % 8 === 0 : x % 8 === 7;
          for (let y = s; y < TILE; y++) {
            let col = brick(ox + x, oy + y);
            if (riser && y < s + 5) col = shade(col, 0.7);
            if (y - s === 0) col = pal.top2;
            else if (y - s === 1) col = trimmed ? pal.top : mix(pal.base, pal.hl, 0.5);
            else if (y - s === 2 && trimmed) col = shade(pal.top, 0.6);
            p.set(ox + x, oy + y, col);
          }
        }
      } else if (c === '#' || c === 'B') {
        const dk = [1, 1, 0.78, 0.58, 0.42][depth[ty][tx]];
        for (let y = 0; y < TILE; y++)
          for (let x = 0; x < TILE; x++) p.set(ox + x, oy + y, shade(brick(ox + x, oy + y), dk));
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
            if (!trimmed) {
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
