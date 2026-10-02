import { TILE, SCREEN_COLS, SCREEN_ROWS, CELL_W, CELL_H } from '../config';
import type { RoomDef } from './rooms';

/** Furniture tiles: walk-through, with a standable top (see Room.oneWayAt). */
export const FURNITURE = 'KD';
/** Ramp tiles ('/' rises to the right, '\' to the left). */
export const isRamp = (c: string) => c === '/' || c === '\\';
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class Room {
  tiles: string[][];
  cols: number;
  rows: number;
  W: number;
  H: number;
  ox: number; // global pixel origin
  oy: number;
  water: { x: number; y: number; w: number; h: number } | null = null;
  gateClosed = false;
  /** Where the snow-seal tiles ('N') go, so unseal() can clear them and seal() bring them back. */
  private sealTiles: [number, number][] = [];
  /**
   * `outside(gtx, gty)` gives the tile at a global tile position outside this room: the
   * neighbor room's tile there, or '' where there is no room (see Game.tileOutside).
   */
  constructor(public def: RoomDef, private outside: (gtx: number, gty: number) => string) {
    this.tiles = def.tiles.map((r) => r.split(''));
    this.tiles.forEach((row, y) => row.forEach((c, x) => c === 'N' && this.sealTiles.push([x, y])));
    this.rows = this.tiles.length;
    this.cols = this.tiles[0].length;
    this.W = this.cols * TILE;
    this.H = this.rows * TILE;
    this.ox = def.gx * CELL_W;
    this.oy = def.gy * CELL_H;
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++)
        if (this.tiles[y][x] === '~') {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
    if (maxX >= 0) this.water = { x: minX * TILE, y: minY * TILE + 4, w: (maxX - minX + 1) * TILE, h: (maxY - minY + 1) * TILE - 4 };
    // tidal rooms: water across the whole room, from the floor up; starts at high tide
    // (the size the water's front layer is built at) and Game.updateTide moves the surface
    if (def.tide) this.water = this.tideRect(def.tide.high * TILE + 4);
  }
  /** The water of a tidal room with its surface at y: inside the side walls, down to the floor. */
  tideRect(y: number) {
    const floor = this.H - 2 * TILE;
    return { x: TILE, y, w: this.W - 2 * TILE, h: Math.max(0, floor - y) };
  }
  tile(tx: number, ty: number): string {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) {
      const c = this.outside(this.def.gx * SCREEN_COLS + tx, this.def.gy * SCREEN_ROWS + ty);
      // '' = no room there. Above an open-topped room that's open sky (no invisible
      // ceiling); anywhere else it's solid.
      if (c === '') return ty < 0 && tx >= 0 && tx < this.cols ? '.' : '#';
      return c;
    }
    return this.tiles[ty][tx];
  }
  solidAt(tx: number, ty: number) {
    const c = this.tile(tx, ty);
    return c === '#' || c === 'B' || c === 'H' || c === 'G' || c === 'N';
  }
  /**
   * Tiles you can stand on but pass through from below and from the sides: one-way ledges,
   * and the top row of furniture (bookcases 'K', tables 'D'). Walking in front of furniture
   * doesn't touch it; only its top surface holds you up.
   */
  oneWayAt(tx: number, ty: number) {
    const c = this.tile(tx, ty);
    if (c === '=') return true;
    if (FURNITURE.includes(c)) return this.tile(tx, ty - 1) !== c;
    return false;
  }
  /** Anything that holds you up: solid, one-way, or a ramp. */
  floorAt(tx: number, ty: number) {
    return this.solidAt(tx, ty) || this.oneWayAt(tx, ty) || isRamp(this.tile(tx, ty));
  }
  /**
   * The ramp surface in tile (tx, ty), as px below the tile's top at its left and right edge,
   * or null if it is not a ramp. Ramps rise one tile every two: '/' climbs to the right and
   * '\' to the left. Along a row of ramp tiles they pair up, counting from the low end: the
   * first of each pair is the low half, the second the high half.
   */
  rampAt(tx: number, ty: number): [number, number] | null {
    const c = this.tile(tx, ty);
    if (!isRamp(c)) return null;
    const dir = c === '/' ? -1 : 1; // which way is downhill
    let k = 0; // tiles between this one and the low end of the run
    while (k < 64 && this.tile(tx + dir * (k + 1), ty) === c) k++;
    const high = k % 2 === 1;
    if (c === '/') return high ? [8, 0] : [16, 8];
    return high ? [0, 8] : [8, 16];
  }
  /** The y of the ramp surface at pixel column px in tile (tx, ty), or null. */
  rampY(tx: number, ty: number, px: number) {
    const r = this.rampAt(tx, ty);
    if (!r) return null;
    const f = clamp01((px - tx * TILE) / TILE);
    return ty * TILE + r[0] + (r[1] - r[0]) * f;
  }
  /** The solid fill right under a ramp. A body on the ramp may overlap its corner. */
  rampFill(tx: number, ty: number) {
    return isRamp(this.tile(tx, ty - 1)) && this.solidAt(tx, ty);
  }
  /**
   * Does tile (tx, ty) stop a body whose feet are at `feet` from moving sideways into it?
   * Solid tiles do, except ramp fill level with the feet (the slope you're walking up), and,
   * for a body on the ground, a lip at most 8 px high with open space over it (where a ramp
   * meets a landing): it steps up onto that. On flat floors the feet sit exactly on a tile
   * top, so a wall's lowest tile is always a full 16 px up and still blocks.
   */
  blocks(tx: number, ty: number, feet: number, grounded = false) {
    if (!this.solidAt(tx, ty)) return false;
    const top = ty * TILE;
    if (this.rampFill(tx, ty) && top >= feet - 12) return false;
    if (grounded && top < feet && top >= feet - 8 && !this.solidAt(tx, ty - 1)) return false;
    return true;
  }
  /** Fill the snow-seal tiles (after the room's sealFlag is set). */
  seal() {
    for (const [x, y] of this.sealTiles) this.tiles[y][x] = 'N';
  }
  /** Clear the snow-seal tiles so the doorway is open. */
  unseal() {
    for (const [x, y] of this.sealTiles) this.tiles[y][x] = '.';
  }
  /** Remove all water from the room (after its drain lever is pulled). */
  drain() {
    this.water = null;
    this.replaceAll('~', '.');
  }
  /** Open every gate tile ('G') in the room. */
  openGates() {
    this.replaceAll('G', '.');
  }
  private replaceAll(from: string, to: string) {
    for (const row of this.tiles) for (let x = 0; x < row.length; x++) if (row[x] === from) row[x] = to;
  }
  solidPx(px: number, py: number) {
    return this.solidAt(Math.floor(px / TILE), Math.floor(py / TILE));
  }
  inWater(px: number, py: number) {
    const w = this.water;
    return !!w && px >= w.x && px < w.x + w.w && py >= w.y && py < w.y + w.h;
  }
  set(tx: number, ty: number, c: string) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return;
    this.tiles[ty][tx] = c;
  }
}

export interface Body {
  x: number;
  y: number;
  hw: number;
  hh: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export interface MoveResult {
  hitX: boolean;
  hitY: boolean;
  landed: boolean;
  ceiling: boolean;
}

const EPS = 0.001;

/**
 * Axis-separated tile collision. One-way tiles ('=' and furniture tops) only block downward
 * motion. Ramps: a body whose center is over a ramp tile stands on its sloped surface (and
 * may overlap the solid fill under the next ramp tile); walking downhill keeps it glued on.
 */
export function moveBody(room: Room, b: Body, oneWay = true, dropThrough = false): MoveResult {
  const r: MoveResult = { hitX: false, hitY: false, landed: false, ceiling: false };
  const wasGround = b.onGround;
  // X
  if (b.vx !== 0) {
    const nx = b.x + b.vx;
    const feet = b.y + b.hh;
    const top = Math.floor((b.y - b.hh) / TILE), bot = Math.floor((feet - EPS) / TILE);
    if (b.vx > 0) {
      const tx = Math.floor((nx + b.hw - EPS) / TILE);
      let hit = false;
      for (let ty = top; ty <= bot; ty++) if (room.blocks(tx, ty, feet, b.onGround)) hit = true;
      if (hit) {
        b.x = tx * TILE - b.hw;
        b.vx = 0;
        r.hitX = true;
      } else b.x = nx;
    } else {
      const tx = Math.floor((nx - b.hw) / TILE);
      let hit = false;
      for (let ty = top; ty <= bot; ty++) if (room.blocks(tx, ty, feet, b.onGround)) hit = true;
      if (hit) {
        b.x = (tx + 1) * TILE + b.hw;
        b.vx = 0;
        r.hitX = true;
      } else b.x = nx;
    }
  }
  // Y
  const left = Math.floor((b.x - b.hw) / TILE), right = Math.floor((b.x + b.hw - EPS) / TILE);
  const ny = b.y + b.vy;
  b.onGround = false;
  if (b.vy >= 0) {
    const prevBottom = b.y + b.hh;
    const ty = Math.floor((ny + b.hh) / TILE);
    // over a ramp its surface decides (below), not the corners of the fill beside it
    const cx = Math.floor(b.x / TILE);
    const overRamp = isRamp(room.tile(cx, ty)) || isRamp(room.tile(cx, ty - 1));
    let hit = false;
    for (let tx = left; tx <= right; tx++) {
      if (room.solidAt(tx, ty)) {
        if (!(overRamp && room.rampFill(tx, ty))) hit = true;
      } else if (oneWay && !dropThrough && room.oneWayAt(tx, ty) && prevBottom <= ty * TILE + EPS * 10) hit = true;
    }
    if (hit) {
      b.y = ty * TILE - b.hh;
      r.landed = b.vy > 0.5;
      b.vy = 0;
      b.onGround = true;
      r.hitY = true;
    } else b.y = ny;
    // ramps
    const foot = b.y + b.hh, fty = Math.floor(foot / TILE);
    for (let ry = fty - 1; ry <= fty + 1; ry++) {
      const s = room.rampY(cx, ry, b.x);
      if (s === null) continue;
      const sink = foot - s;
      // sunk into the slope (walking uphill, or landing on it), or just above it while walking down
      if ((sink >= -EPS && sink <= TILE) || (wasGround && sink < 0 && sink > -10)) {
        b.y = s - b.hh;
        r.landed = r.landed || b.vy > 0.5;
        b.vy = 0;
        b.onGround = true;
        r.hitY = true;
        break;
      }
    }
  } else {
    const ty = Math.floor((ny - b.hh) / TILE);
    let hit = false;
    for (let tx = left; tx <= right; tx++) if (room.solidAt(tx, ty)) hit = true;
    if (hit) {
      b.y = (ty + 1) * TILE + b.hh;
      b.vy = 0;
      r.hitY = true;
      r.ceiling = true;
    } else b.y = ny;
  }
  return r;
}

/** True if there is ground directly under the body (used for edge detection by enemies). */
export function groundAt(room: Room, x: number, footY: number) {
  const tx = Math.floor(x / TILE), ty = Math.floor((footY + 1) / TILE);
  return room.floorAt(tx, ty);
}
