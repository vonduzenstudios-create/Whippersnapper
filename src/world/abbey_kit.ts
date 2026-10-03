// The kit the Drowned Abbey (NEW GAME +) is built with.
//
// The abbey is big (120 rooms), so instead of cutting every doorway by hand, a room is
// declared as a rectangle on the map grid, and the doorways come from a list of links
// between neighbours: each link cuts a matching doorway on both sides, so they always
// line up. Then the room's own build() lays out its interior, and finally auto() gives
// every doorway that is still unserved a landing and a climb of ledges up from the floor.
//
// Ability gates live on the links: a link can carry a gate (double jump, grapple ring,
// slide, Sinew Coil, breakable wall, lever gate, one-way drop) that shapes the doorway on
// one side. tools/check_abbey.ts plays every room with a small physics model to prove the
// map can be finished, in order.
import type { RoomDef, Zone, Theme, EntDef } from './rooms';
import { RB } from './rb';
import { SCREEN_COLS as SC, SCREEN_ROWS as SR } from '../config';

export type Side = 'L' | 'R' | 'T' | 'B';
/**
 * What a doorway needs (on the side of the room that holds the gate):
 * - ''       open: a landing and a climb of ledges are added if the doorway is up high
 * - 'dj'     the climb stops 7 rows short of the landing (Raven Mantle); on a ceiling hole,
 *            the only ledge under it is 6 rows over the floor and 8 under the hole
 * - 'ring'   the climb stops 8 rows under the landing, with a grapple ring over the gap
 *            (the Gallery of Wisps pattern: Chain Grapple)
 * - 'coil'   ceiling hole only: a ring under the hole, too low for a swing and a double jump
 *            to reach the grate over it in the room above (Sinew Coil: stretch and sling up)
 * - 'slide'  a one-tile crawlspace through the doorway (Frostrunner Greaves)
 * - 'break'  cracked stones fill the doorway (whip them)
 * - 'lever:<flag>' a gate fills the doorway until the flag is set (a lever somewhere)
 * - 'drop'   one way: no climb on this side (ceiling hole: you fall in and can't climb back;
 *            side doorway: a ledge you can only drop off)
 * - 'manual' the room's build() makes its own way to this doorway
 */
export type Gate = '' | 'dj' | 'ring' | 'coil' | 'slide' | 'break' | 'drop' | 'manual' | `lever:${string}`;

export interface Door {
  side: Side;
  /** Cell index along the room's edge (row for L/R, column for T/B). */
  cell: number;
  to: string;
  gate: Gate;
}

export interface Spec {
  id: string;
  name: string;
  zone: Zone;
  theme: Theme;
  /** [gx, gy, w, h] in map cells. */
  at: [number, number, number, number];
  /** No ceiling: open to the sky (outdoor rooms). */
  open?: boolean;
  save?: boolean;
  extra?: Partial<RoomDef>;
  build?: (k: Kit) => void;
}

/** [room a, room b, options]. `at` picks the shared cell (a global row for side doors, a global column for holes). */
export type Link = [string, string, { at?: number; gate?: Gate; in?: string }?];

export class Kit extends RB {
  doors: Door[] = [];
  /** The floor's top row (the standing row of the bottom cell). */
  F: number;
  gateFlag = '';
  constructor(public spec: Spec) {
    super(spec.at[2], spec.at[3]);
    this.shell(!spec.open);
    this.F = this.H - 2;
  }
  get id() {
    return this.spec.id;
  }

  // ---------------------------------------------------------------- doorways

  /** The doorway on this side (and cell, if the side has several). */
  d(side: Side, cell?: number) {
    return this.doors.find((x) => x.side === side && (cell === undefined || x.cell === cell));
  }
  /** Top row of a side doorway's floor (rows 8-11 are the opening). */
  doorFloor(cell: number) {
    return cell * SR + 12;
  }
  /** First column of a hole in cell column `cell`. */
  holeX(cell: number) {
    return cell * SC + 10;
  }
  cut(dr: Door) {
    if (dr.side === 'L' || dr.side === 'R') this.door(dr.side, dr.cell);
    else this.hole(dr.side, dr.cell);
  }
  /** Shape a doorway for its gate (only on the room that holds it). Runs before build(). */
  shape(dr: Door) {
    const g = dr.gate;
    if (dr.side === 'L' || dr.side === 'R') {
      const y = dr.cell * SR + 8, x = dr.side === 'L' ? 0 : this.W - 1;
      const inward = dr.side === 'L' ? 1 : -1;
      if (g === 'slide') {
        // a crawlspace: solid over a one-tile gap at the floor, four tiles deep
        for (let i = 0; i < 4; i++) this.fill(x + inward * i, y, 1, 3);
      } else if (g === 'break') this.fill(x, y, 1, 4, 'B');
      else if (g.startsWith('lever:')) {
        this.fill(x, y, 1, 4, 'G');
        this.setGateFlag(g.slice(6));
      }
    } else {
      const x = this.holeX(dr.cell);
      if (g === 'break') this.fill(x, dr.side === 'T' ? 0 : this.H - 2, 4, dr.side === 'T' ? 1 : 2, 'B');
      else if (g.startsWith('lever:')) {
        this.fill(x, dr.side === 'T' ? 0 : this.H - 2, 4, 1, 'G');
        this.setGateFlag(g.slice(6));
      }
    }
  }
  setGateFlag(f: string) {
    if (this.gateFlag && this.gateFlag !== f) throw new Error(`${this.id}: two gate flags (${this.gateFlag}, ${f})`);
    this.gateFlag = f;
  }

  // ---------------------------------------------------------------- building blocks

  /** A one-way ledge. */
  ledge(x: number, y: number, w: number) {
    return this.fill(x, y, w, 1, '=');
  }
  ledges(list: [number, number, number][]) {
    for (const [x, y, w] of list) this.ledge(x, y, w);
    return this;
  }
  /** Solid block. */
  block(x: number, y: number, w: number, h: number) {
    return this.fill(x, y, w, h, '#');
  }
  /** Water over the open tiles of a rectangle (a room has one pool at most: its water is one box). */
  pool(x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.g[j]?.[i] === '.') this.g[j][i] = '~';
    return this;
  }
  /** A spike pit in the floor: columns x..x+w-1, spikes on the bottom row. */
  pit(x: number, w: number) {
    return this.fill(x, this.F, w, 2, '.').fill(x, this.F + 1, w, 1, '^');
  }
  /**
   * A walled-off cell standing on the floor (columns x..x+w-1, `h` rows tall) whose only way
   * in is a one-tile gap at the floor through its wall on `side`: a slide pocket. The inside
   * is w-4 wide and h-1 tall (keep h >= 4 so you can stand up in it).
   */
  pocket(x: number, w: number, h: number, side: 'L' | 'R') {
    const top = this.F - h;
    this.block(x, top, w, h).fill(x + 2, top + 1, w - 4, h - 1, '.');
    return this.fill(side === 'L' ? x : x + w - 2, this.F - 1, 2, 1, '.');
  }
  /** Candles: [x, y] pairs. */
  candles(...list: [number, number][]) {
    for (const [x, y] of list) this.e(x, y, 'C');
    return this;
  }
  /** Enemies: a string like 'z12 z30 b20@4' = letter, column, and @row (default: standing on the floor). Variant: 'k30:knight_glass'. */
  foes(spec: string) {
    for (const tok of spec.split(/\s+/).filter(Boolean)) {
      const m = /^([a-zA-Z])(\d+)(?:@(\d+))?(?::(\w+))?$/.exec(tok);
      if (!m) throw new Error(`${this.id}: bad foe "${tok}"`);
      this.e(+m[2], m[3] !== undefined ? +m[3] : this.F - 1, m[1], m[4]);
    }
    return this;
  }
  /** An item standing at (x, y) (y = the row just above what it stands on). */
  item(x: number, y: number, id: string) {
    return this.e(x, y, 'i', id);
  }
  sign(x: number, y: number, key: string) {
    return this.e(x, y, 'T', key);
  }
  /**
   * A climb of one-way ledges from a standing row up to a target row, zig-zagging between
   * two columns: `x` (the upper ledge, beside whatever is at the top) and `x2`. Each step is
   * at most 4 rows. Returns this.
   */
  climb(x: number, x2: number, from: number, to: number, w = 6) {
    const d = from - to;
    if (d <= 4) return this;
    const n = Math.ceil(d / 4) - 1;
    for (let i = 1; i <= n; i++) {
      const row = to + Math.round((d * i) / (n + 1));
      this.soft(i % 2 ? x : x2, row, w);
    }
    return this;
  }
  /** A ledge that only goes into open space (never over walls, water edges are fine). */
  soft(x: number, y: number, w: number, c = '=') {
    for (let i = x; i < x + w; i++) if (this.g[y]?.[i] === '.' || this.g[y]?.[i] === '~') this.g[y][i] = c;
    return this;
  }

  // ---------------------------------------------------------------- automatic ways in

  /**
   * Give every doorway that build() didn't take care of a way in: landings for doorways up a
   * wall, ledges under ceiling holes, and a climb from the floor to each of them, shaped by
   * the doorway's gate.
   */
  auto() {
    for (const dr of this.doors) {
      if (dr.gate === 'manual') continue;
      if (dr.side === 'L' || dr.side === 'R') this.autoSide(dr);
      else if (dr.side === 'T') this.autoTop(dr);
    }
  }
  private autoSide(dr: Door) {
    const T = this.doorFloor(dr.cell);
    if (T >= this.F) return; // the bottom cell: the doorway opens onto the floor
    const L = dr.side === 'L';
    // a landing: solid, two rows thick, five tiles out from the wall
    const lx = L ? 1 : this.W - 6;
    this.fill(lx, T, 5, 2);
    if (dr.gate === 'drop') return;
    const near = L ? 6 : this.W - 12; // the column band right beside the landing
    const far = L ? 12 : this.W - 18;
    if (dr.gate === 'dj') {
      this.soft(near, T + 7, 6);
      this.climb(far, near, this.F, T + 7);
    } else if (dr.gate === 'ring') {
      // stand under the ring 8 rows below the landing; the ring is 7 tiles out, a row above it
      const rx = L ? 12 : this.W - 13;
      this.soft(L ? 8 : this.W - 17, T + 8, 9);
      this.e(rx, T - 1, 'O');
      this.climb(L ? 17 : this.W - 23, L ? 8 : this.W - 17, this.F, T + 8);
    } else {
      this.climb(near, far, this.F, T);
    }
  }
  private autoTop(dr: Door) {
    const hx = this.holeX(dr.cell);
    if (dr.gate === 'coil') {
      // a ring 6 rows under the hole and a ledge 11 rows under the ring: a swing and a
      // double jump fall short of the grate above, a sling (and a double jump) clears it
      this.e(hx + 1, 6, 'O');
      this.soft(hx - 2, 17, 8);
      this.climb(hx + 6, hx - 8, this.F, 17);
      return;
    }
    if (dr.gate === 'drop') return;
    if (dr.gate === 'dj') {
      this.soft(hx, 6, 4);
      return;
    }
    // the Ossuary Shaft pattern: a ledge 4 rows down beside the hole, one 2 rows down under it
    const side = hx + 9 < this.W - 1 ? 'R' : 'L';
    const lx = side === 'R' ? hx : hx - 2;
    this.soft(lx, 4, 6).soft(hx, 2, 4);
    const nx = side === 'R' ? hx + 6 : hx - 8;
    this.climb(side === 'R' ? hx + 3 : hx - 5, nx, this.F, 4);
  }

  finish(): RoomDef {
    // candles, signs, levers and casters set down a little high settle onto what's under them
    const open = (x: number, y: number) => this.g[y]?.[x] === '.' || this.g[y]?.[x] === '~';
    for (const e of this.ents) if ('CTLm'.includes(e.t)) while (e.y < this.F - 1 && open(e.x, e.y + 1)) e.y++;
    const s = this.spec;
    const [gx, gy] = s.at;
    return this.build(s.id, s.name, s.zone, s.theme, gx, gy, {
      ...(s.save ? { save: true } : {}),
      ...(this.gateFlag ? { gateFlag: this.gateFlag } : {}),
      ...s.extra,
    });
  }
}

/** Build every room: cut the linked doorways, shape the gates, run each build(), then auto(). */
export function buildWorld(specs: Spec[], links: Link[]): RoomDef[] {
  const kits = new Map<string, Kit>();
  for (const s of specs) {
    if (kits.has(s.id)) throw new Error(`abbey: duplicate room id ${s.id}`);
    kits.set(s.id, new Kit(s));
  }
  for (const [a, b, o = {}] of links) {
    const A = kits.get(a), B = kits.get(b);
    if (!A || !B) throw new Error(`abbey: link ${a} - ${b}: no such room`);
    const holder = o.in ?? b;
    const gate = o.gate ?? '';
    const [ax, ay, aw, ah] = A.spec.at, [bx, by, bw, bh] = B.spec.at;
    let da: Door, db: Door;
    if (ax + aw === bx || bx + bw === ax) {
      // side by side: a doorway on a shared cell row
      const lo = Math.max(ay, by), hi = Math.min(ay + ah, by + bh) - 1;
      if (lo > hi) throw new Error(`abbey: ${a} and ${b} don't share a wall`);
      const row = o.at ?? hi;
      if (row < lo || row > hi) throw new Error(`abbey: ${a} - ${b}: row ${row} is not on their shared wall (${lo}..${hi})`);
      const aLeft = ax + aw === bx;
      da = { side: aLeft ? 'R' : 'L', cell: row - ay, to: b, gate: '' };
      db = { side: aLeft ? 'L' : 'R', cell: row - by, to: a, gate: '' };
    } else if (ay + ah === by || by + bh === ay) {
      const lo = Math.max(ax, bx), hi = Math.min(ax + aw, bx + bw) - 1;
      if (lo > hi) throw new Error(`abbey: ${a} and ${b} don't share a floor`);
      const col = o.at ?? Math.floor((lo + hi) / 2);
      if (col < lo || col > hi) throw new Error(`abbey: ${a} - ${b}: column ${col} is not on their shared edge (${lo}..${hi})`);
      const aTop = ay + ah === by;
      da = { side: aTop ? 'B' : 'T', cell: col - ax, to: b, gate: '' };
      db = { side: aTop ? 'T' : 'B', cell: col - bx, to: a, gate: '' };
    } else throw new Error(`abbey: ${a} and ${b} are not neighbours`);
    if (holder === a) da.gate = gate;
    else if (holder === b) db.gate = gate;
    else throw new Error(`abbey: link ${a} - ${b}: gate holder ${holder} is neither`);
    A.doors.push(da);
    B.doors.push(db);
    // a coil gate's hole gets a grate in the room above, so the sling lands on it
    if (gate === 'coil') {
      const below = da.side === 'T' && holder === a ? A : db.side === 'T' && holder === b ? B : null;
      if (!below) throw new Error(`abbey: coil gate ${a} - ${b} must be on the lower room's ceiling hole`);
    }
  }
  for (const k of kits.values()) {
    for (const dr of k.doors) k.cut(dr);
    for (const dr of k.doors) if (dr.gate) k.shape(dr);
  }
  // grates over the holes that coil gates climb through
  for (const k of kits.values())
    for (const dr of k.doors)
      if (dr.side === 'T' && dr.gate === 'coil') {
        const up = kits.get(dr.to)!, ux = k.spec.at[0] + dr.cell - up.spec.at[0];
        up.fill(up.holeX(ux), up.H - 2, 4, 1, '=');
      }
  for (const k of kits.values()) {
    k.spec.build?.(k);
    k.auto();
  }
  return [...kits.values()].map((k) => k.finish());
}

export type { EntDef };
