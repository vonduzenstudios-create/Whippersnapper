// The room builder every hand-made room uses: fill tiles, cut doors and holes, place
// entities, then build() a RoomDef. Lives apart from rooms.ts so the room files that
// extend it (abbey_kit.ts) don't run into an import loop.
import { SCREEN_COLS as SC, SCREEN_ROWS as SR } from '../config';
import type { RoomDef, EntDef, Zone, Theme } from './rooms';

/** Room builder: fill tiles, cut doors and holes, place entities, then build() a RoomDef. */
export class RB {
  g: string[][];
  ents: EntDef[] = [];
  W: number;
  H: number;
  constructor(public cw: number, public ch: number) {
    this.W = cw * SC;
    this.H = ch * SR;
    this.g = [];
    for (let y = 0; y < this.H; y++) this.g.push(new Array(this.W).fill('.'));
  }
  fill(x: number, y: number, w: number, h: number, c = '#') {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < this.W && j < this.H) this.g[j][i] = c;
    return this;
  }
  /** Outer walls: 1 tile sides & ceiling, 2-tile floor at the bottom. */
  shell(top = true) {
    this.fill(0, 0, 1, this.H);
    this.fill(this.W - 1, 0, 1, this.H);
    if (top) this.fill(0, 0, this.W, 1);
    this.fill(0, this.H - 2, this.W, 2);
    return this;
  }
  door(side: 'L' | 'R', cy: number) {
    const x = side === 'L' ? 0 : this.W - 1;
    this.fill(x, cy * SR + 8, 1, 4, '.');
    return this;
  }
  hole(side: 'T' | 'B', cx: number) {
    if (side === 'T') this.fill(cx * SC + 10, 0, 4, 1, '.');
    else this.fill(cx * SC + 10, this.H - 2, 4, 2, '.');
    return this;
  }
  e(x: number, y: number, t: string, arg?: string) {
    this.ents.push({ x, y, t, arg });
    return this;
  }
  /**
   * Grow an outdoor room upward by one map cell of open sky (call after laying out the
   * room as usual; build() then places it one cell higher). Everything already placed moves
   * down 14 rows. Columns that are solid in the old top row (cliffs, towers) keep rising
   * through the new cell. Fills after this use the new rows: 0-13 is the sky cell.
   */
  sky() {
    const top = this.g[0];
    const add = Array.from({ length: SR }, () => top.map((c) => (c === '#' ? '#' : '.')));
    this.g = [...add, ...this.g];
    for (const e of this.ents) e.y += SR;
    this.ch++;
    this.H += SR;
    this.skyCells++;
    return this;
  }
  skyCells = 0;
  build(id: string, name: string, zone: Zone, theme: Theme, gx: number, gy: number, extra: Partial<RoomDef> = {}): RoomDef {
    return { id, name, zone, theme, gx, gy: gy - this.skyCells, w: this.cw, h: this.ch, tiles: this.g.map((r) => r.join('')), ents: this.ents, ...extra };
  }
}

