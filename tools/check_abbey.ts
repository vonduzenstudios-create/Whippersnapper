// Can the Drowned Abbey (NEW GAME +) be finished? (npm run check:abbey)
//
// Plays the whole map with a small copy of the hero's physics (the real tile collision from
// world/room.ts, the real jump/swim/glide/slide numbers from game/player.ts, and a rough model
// of the grapple ring). From the start it finds every spot the hero can stand on, picks up
// what she can reach, and when that gives her a relic it goes again with the new ability.
// It prints each round ("sphere"): the relic(s) found and the rooms that opened up. At the
// end it lists items, rooms and levers that were never reached.
//
//   npm run check:abbey            the progression report
//   npm run check:abbey -- <room>  also print that room with the reached standing spots marked
import { buildRooms, RoomDef } from '../src/world/rooms';
import { Room, moveBody, Body } from '../src/world/room';
import { TILE, SCREEN_COLS as SC, SCREEN_ROWS as SR, CELL_W, CELL_H, GRAVITY, MAX_FALL } from '../src/config';

// ------------------------------------------------------------------ the hero's numbers
const WALK = 1.65, RUN = 1.5, JUMP_V = -7.1, DJUMP_V = -6.2, SWIM_V = -2.4, FREE_SWIM_V = 2.2;
const GLIDE_FALL = 0.75, GLIDE_MUL = 1.2, SLIDE_V = 4.4, SLIDE_MIN = 1.6;
const SWING_G = GRAVITY * 0.65, SWING_MAX_V = 4.8, HAND_DY = 24;
const LAUNCH_MUL = 1.35, LAUNCH_MAX_X = 4.8, LAUNCH_KICK = 2.2, LAUNCH_UP = 1.2, LAUNCH_MAX_Y = 8.4, SLING_V = 12;
const REACH = 74;
let TRACE = false; // a ring is caught from this far (whip 56 + 22, less a little for aiming)

type Abil = { grapple: boolean; coil: boolean; dj: boolean; slide: boolean; glide: boolean; swim: boolean };
const RELIC: Record<string, keyof Abil | 'ward'> = {
  relic_grapple: 'grapple', relic_sinew: 'coil', relic_mantle: 'dj', relic_greaves: 'slide', relic_shroud: 'glide', relic_pearl: 'swim', relic_ward: 'ward',
};

const defs = buildRooms('abbey');
const byId = new Map(defs.map((d) => [d.id, d]));
const grid = new Map<string, RoomDef>();
for (const d of defs) for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) grid.set(`${d.gx + x},${d.gy + y}`, d);

// ------------------------------------------------------------------ the world as it stands
let flags = new Set<string>();
/** Tiles as the hero meets them: cracked stones count as broken, gates open with their flag. */
function live(d: RoomDef, tx: number, ty: number) {
  const c = d.tiles[ty]?.[tx] ?? '#';
  if (c === 'B') return '.';
  if (c === 'G') return d.gateFlag && flags.has(d.gateFlag) ? '.' : 'G';
  if (c === 'N') return '.';
  return c;
}
function outside(gtx: number, gty: number) {
  const d = grid.get(`${Math.floor(gtx / SC)},${Math.floor(gty / SR)}`);
  return d ? live(d, gtx - d.gx * SC, gty - d.gy * SR) : '';
}
/** Rooms for this flag state. A tidal room comes twice: at low and at high tide. */
let rooms = new Map<string, Room[]>();
function makeRooms() {
  rooms = new Map();
  for (const d of defs) {
    const copy: RoomDef = { ...d, tiles: d.tiles.map((row, y) => [...row].map((_, x) => live(d, x, y)).join('')) };
    const r = new Room(copy, outside);
    const list = [r];
    if (d.tide) {
      const lo = new Room(copy, outside);
      lo.water = lo.tideRect(d.tide.low * TILE + 4);
      list.push(lo);
    }
    rooms.set(d.id, list);
  }
}

// ------------------------------------------------------------------ simulation
interface Prog {
  jump: boolean; // jump at the start (else: walk off / drop / slide)
  d0: number;
  d1: number;
  k: number; // frame the direction switches from d0 to d1
  run: boolean;
  hold: number; // frames JUMP is held (999 = whole time)
  dj: number; // frame of the double jump (-1 = none)
  glide: boolean;
  swim: number; // in water, press JUMP every this many frames (0 = never)
  up: boolean; // hold UP (Pearl swimming)
  down: boolean; // hold DOWN (Pearl swimming)
  drop: boolean; // Down + Jump through a one-way ledge
  slide: boolean;
}
const P = (o: Partial<Prog>): Prog => ({ jump: true, d0: 0, d1: 0, k: 999, run: false, hold: 999, dj: -1, glide: false, swim: 0, up: false, down: false, drop: false, slide: false, ...o });

function groundProgs(a: Abil): Prog[] {
  const out: Prog[] = [];
  const switches = (d0: number): [number, number][] => {
    const s: [number, number][] = [[999, d0]];
    for (const k of [6, 12, 20, 28, 36]) for (const d1 of [-1, 0, 1]) if (d1 !== d0) s.push([k, d1]);
    return s;
  };
  for (const d0 of [-1, 0, 1])
    for (const run of d0 ? [false, true] : [false])
      for (const [k, d1] of switches(d0)) {
        out.push(P({ d0, d1, k, run }));
        if (d0 && k === 999) out.push(P({ d0, d1, k, run, hold: 6 }));
        if (a.dj) for (const dj of [12, 22, 32]) out.push(P({ d0, d1, k, run, dj }));
        if (a.glide && d0) out.push(P({ d0, d1, k, run, glide: true, dj: a.dj ? 22 : -1 }));
      }
  // walking off a ledge, steering after a while
  for (const d0 of [-1, 1])
    for (const run of [false, true])
      for (const [k, d1] of [[999, d0], [4, 0], [4, -d0], [10, 0], [10, -d0], [20, -d0]] as [number, number][]) {
        out.push(P({ jump: false, d0, d1, k, run }));
        if (a.dj) out.push(P({ jump: false, d0, d1, k, run, dj: 16 }));
        if (a.glide) out.push(P({ jump: false, d0, d1, k, run, glide: true, hold: 999, dj: -1 }));
      }
  for (const d0 of [-1, 0, 1]) out.push(P({ jump: false, drop: true, d0, d1: d0 }));
  if (a.slide) for (const d0 of [-1, 1]) out.push(P({ jump: false, slide: true, d0, d1: d0 }));
  return out;
}
function waterProgs(a: Abil): Prog[] {
  const out: Prog[] = [];
  for (const d0 of [-1, 0, 1]) {
    for (const swim of [6, 14]) out.push(P({ jump: true, d0, d1: d0, swim, hold: 999 }));
    out.push(P({ jump: false, d0, d1: d0 }));
    if (a.swim) {
      out.push(P({ jump: false, d0, d1: d0, up: true }));
      out.push(P({ jump: false, d0, d1: d0, down: true }));
      out.push(P({ jump: false, d0, d1: d0, up: true, swim: 10 }));
    }
  }
  if (a.swim && a.slide) for (const d0 of [-1, 1]) out.push(P({ jump: false, slide: true, d0, d1: d0 }));
  return out;
}

/** A spot the hero stands on: room, tile column, floor row. */
type Spot = { room: string; tx: number; row: number };
const key = (s: Spot) => `${s.room}:${s.tx},${s.row}`;

interface Sim {
  room: Room;
  b: Body;
  djumped: boolean;
  launched: boolean;
}
const approach = (v: number, t: number, s: number) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));

/** Move to the neighbouring room if the body's center left this one. False if there is none. */
function cross(s: Sim): boolean {
  const r = s.room, b = s.b;
  if (b.x >= 0 && b.x < r.W && b.y >= 0 && b.y < r.H) return true;
  const gx = r.ox + b.x, gy = r.oy + b.y;
  const d = grid.get(`${Math.floor(gx / CELL_W)},${Math.floor(gy / CELL_H)}`);
  if (!d) return b.y < 0 && b.x >= 0 && b.x < r.W; // open sky above
  const n = rooms.get(d.id)![0];
  s.room = n;
  b.x = gx - n.ox;
  b.y = gy - n.oy;
  return true;
}
function hurts(r: Room, b: Body) {
  const l = Math.floor((b.x - b.hw) / TILE), rr = Math.floor((b.x + b.hw - 0.01) / TILE);
  const t = Math.floor((b.y - b.hh) / TILE), bt = Math.floor((b.y + b.hh - 0.01) / TILE);
  for (let y = t; y <= bt; y++) for (let x = l; x <= rr; x++) if (r.tile(x, y) === '^') return true;
  return false;
}
function fits(r: Room, x: number, bottom: number, hh: number) {
  const l = Math.floor((x - 6) / TILE), rr = Math.floor((x + 6 - 0.01) / TILE);
  const t = Math.floor((bottom - hh * 2) / TILE), b = Math.floor((bottom - 0.01) / TILE);
  for (let y = t; y <= b; y++) for (let i = l; i <= rr; i++) if (r.blocks(i, y, bottom)) return false;
  return true;
}

interface Hit {
  spots: Spot[];
  rings: string[];
}
/**
 * Run one program from a state. Calls back with every ring she passes close to, and returns
 * where she lands (null if she gets hurt, leaves the map or never lands).
 */
function run(start: Sim, p: Prog, a: Abil, hit: Hit, maxF = 260) {
  const s: Sim = { room: start.room, b: { ...start.b }, djumped: start.djumped, launched: start.launched };
  const b = s.b;
  let state: 'normal' | 'slide' = 'normal', slideT = 0, facing = p.d0 || 1, dropT = 0, airborne = !b.onGround;
  for (let f = 0; f < maxF; f++) {
    const r = s.room;
    const inW = r.inWater(b.x, b.y + 4);
    const free = inW && a.swim;
    const dir = f < p.k ? p.d0 : p.d1;
    if (dir) facing = dir;
    const held = f < p.hold;
    let pressed = (f === 0 && p.jump) || f === p.dj || (p.swim > 0 && inW && f > 0 && f % p.swim === 0);
    if (state === 'slide') {
      const roomy = fits(r, b.x, b.y + b.hh, 18);
      b.vx = approach(b.vx, 0, 0.13);
      slideT++;
      const done = slideT > 20 || Math.abs(b.vx) < SLIDE_MIN || !b.onGround;
      if (done && roomy) {
        state = 'normal';
        b.y -= 18 - b.hh;
        b.hh = 18;
        if (b.onGround) return land(s, hit);
      } else if (done) b.vx = facing * SLIDE_MIN;
    } else {
      if (f === 0 && p.slide && b.onGround && (!inW || free)) {
        state = 'slide';
        b.y += 18 - 7;
        b.hh = 7;
        b.vx = facing * SLIDE_V;
        pressed = false;
      } else if (f === 0 && p.drop) {
        pressed = false;
        dropT = 10;
        b.y += 2;
      } else {
        const glide = a.glide && p.glide && !b.onGround && !inW && held && b.vy > 0;
        const wmul = inW && !free ? 0.6 : 1;
        const target = dir * WALK * (p.run ? RUN : 1) * (glide ? GLIDE_MUL : 1) * wmul;
        if (!b.onGround && Math.abs(b.vx) > Math.max(WALK, Math.abs(target)) + 0.1) b.vx = approach(b.vx, target, dir && Math.sign(dir) !== Math.sign(b.vx) ? 0.12 : 0.035);
        else b.vx = target;
        if (pressed && b.onGround) b.vy = JUMP_V * (inW && !free ? 0.85 : 1);
        else if (pressed && inW && r.water) b.vy = b.y - b.hh <= r.water.y + 6 ? JUMP_V * 1.1 : Math.min(b.vy, SWIM_V * (free ? 1.4 : 1));
        else if (pressed && a.dj && !s.djumped && !inW && !b.onGround) {
          s.djumped = true;
          b.vy = DJUMP_V;
        }
        if (s.launched && (b.vy >= 0 || b.onGround)) s.launched = false;
        if (!held && b.vy < -2.5 && !s.launched) b.vy = -2.5;
        if (free && (p.up || p.down)) b.vy = approach(b.vy, p.up ? -FREE_SWIM_V : FREE_SWIM_V, 0.25);
      }
    }
    let grav = inW ? GRAVITY * 0.55 : GRAVITY, maxFall = inW ? 2.5 : MAX_FALL;
    if (free) {
      grav = GRAVITY * 0.2;
      maxFall = 1.2;
    }
    if (a.glide && p.glide && !b.onGround && !inW && held && b.vy > 0 && state === 'normal') {
      grav = GRAVITY * 0.3;
      maxFall = GLIDE_FALL;
    }
    b.vy = Math.min(b.vy + grav, maxFall);
    const wasGround = b.onGround;
    moveBody(r, b, true, dropT > 0);
    if (dropT > 0) dropT--;
    if (!cross(s)) return;
    if (hurts(s.room, b)) return;
    if (!b.onGround) airborne = true;
    if (TRACE) console.log(f, b.x.toFixed(1), b.y.toFixed(1), b.vy.toFixed(2), inW, pressed);
    if (a.grapple) for (const [i, rg] of ringsOf(s.room.def.id)) if (Math.hypot(b.x - rg.x, b.y - 12 - rg.y) <= REACH) hit.rings.push(`${s.room.def.id}#${i}`);
    if (state === 'normal' && b.onGround && airborne && f > 0) return land(s, hit);
    if (state === 'normal' && b.onGround && !airborne && f > 40) return land(s, hit); // walked, never left the ground
    if (wasGround && !b.onGround) airborne = true;
  }
}
function land(s: Sim, hit: Hit) {
  const b = s.b;
  hit.spots.push({ room: s.room.def.id, tx: Math.floor(b.x / TILE), row: Math.round((b.y + b.hh) / TILE) });
}

const ringCache = new Map<string, { x: number; y: number }[]>();
function ringsOf(id: string): [number, { x: number; y: number }][] {
  let r = ringCache.get(id);
  if (!r) {
    r = byId.get(id)!.ents.filter((e) => e.t === 'O').map((e) => ({ x: e.x * TILE + 8, y: e.y * TILE + 8 }));
    ringCache.set(id, r);
  }
  return [...r.entries()];
}

/** Every way off a ring: swing releases at many points of the arc, hops, and (Sinew Coil) slings. */
function ringLaunches(id: string, a: Abil): Hit {
  const [rid, si] = id.split('#');
  const rg = ringsOf(rid)[+si][1];
  const room = rooms.get(rid)![0];
  const hit: Hit = { spots: [], rings: [] };
  const fly = (x: number, y: number, vx: number, vy: number, launched: boolean) => {
    const b: Body = { x, y, hw: 6, hh: 18, vx, vy, onGround: false };
    if (fits(room, x, y + 18, 18) === false) return;
    for (const d0 of [-1, 0, 1])
      for (const [k, d1] of [[999, d0], [10, 0], [20, -d0], [20, 0]] as [number, number][]) {
        const st: Sim = { room, b, djumped: false, launched };
        const base = { jump: false, d0, d1, k, hold: 999 };
        run(st, P(base), a, hit);
        if (a.dj) for (const dj of [6, 14, 24, 34]) run(st, P({ ...base, dj }), a, hit);
        if (a.glide) run(st, P({ ...base, glide: true }), a, hit);
      }
  };
  for (const len of [20, 33, 46])
    for (let deg = -75; deg <= 75; deg += 15) {
      const th = (deg * Math.PI) / 180;
      const v2 = SWING_MAX_V ** 2 - 2 * SWING_G * len * (1 - Math.cos(th));
      const x = rg.x + len * Math.sin(th), y = rg.y + len * Math.cos(th) + HAND_DY;
      for (const v of v2 > 0 ? [Math.sqrt(v2), 0] : [0])
        for (const dir of [-1, 1]) {
          let vx = dir * v * Math.cos(th), vy = -dir * v * Math.sin(th);
          const sp = Math.hypot(vx, vy);
          // let go
          let lvx = Math.max(-LAUNCH_MAX_X, Math.min(LAUNCH_MAX_X, vx * LAUNCH_MUL)), lvy = vy, launched = false;
          if (lvy < 1) {
            lvy = Math.max(Math.min(lvy, 0) - LAUNCH_KICK - sp * LAUNCH_UP * 0.5, -LAUNCH_MAX_Y);
            launched = true;
          }
          fly(x, y, lvx, lvy, launched);
          // hop off with JUMP
          if (sp < 0.5) fly(x, y, vx, -5.2, false);
          else fly(x, y, vx * 1.02 + (vx / sp) * 2.1, vy * 1.02 + (vy / sp) * 2.1 - 2.7, false);
        }
    }
  if (a.coil)
    for (const len of [52, 65, 78])
      for (let deg = -30; deg <= 30; deg += 10) {
        const th = (deg * Math.PI) / 180;
        fly(rg.x + len * Math.sin(th), rg.y + len * Math.cos(th) + HAND_DY, -SLING_V * Math.sin(th), -SLING_V * Math.cos(th), true);
      }
  return hit;
}

// ------------------------------------------------------------------ standing spots
function standable(r: Room, tx: number, row: number) {
  if (!r.floorAt(tx, row)) return false;
  if (r.solidAt(tx, row - 1) || r.solidAt(tx, row - 2) || r.solidAt(tx, row - 3)) return false;
  for (const y of [row - 1, row - 2, row - 3]) if (r.tile(tx, y) === '^') return false;
  return true;
}

/** Everything reachable with these abilities: standing spots, rings. */
function explore(a: Abil, start: Spot) {
  makeRooms();
  const gp = groundProgs(a), wp = waterProgs(a);
  const seen = new Set<string>([key(start)]);
  const spots: Spot[] = [start];
  const ringsSeen = new Set<string>();
  const queue: (Spot | string)[] = [start];
  const add = (s: Spot) => {
    const r = rooms.get(s.room)?.[0];
    if (!r) return;
    const k = key(s);
    if (seen.has(k)) return;
    seen.add(k);
    spots.push(s);
    queue.push(s);
  };
  const addRing = (id: string) => {
    if (ringsSeen.has(id)) return;
    ringsSeen.add(id);
    queue.push(id);
  };
  while (queue.length) {
    const q = queue.pop()!;
    if (typeof q === 'string') {
      const h = ringLaunches(q, a);
      h.spots.forEach(add);
      h.rings.forEach(addRing);
      continue;
    }
    for (const r of rooms.get(q.room)!) {
      if (!standable(r, q.tx, q.row)) continue;
      // walk to the neighbouring columns
      for (const dx of [-1, 1]) {
        const nx = q.tx + dx;
        if (nx >= 0 && nx < r.cols && standable(r, nx, q.row)) add({ room: q.room, tx: nx, row: q.row });
      }
      const x = q.tx * TILE + 8, bottom = q.row * TILE;
      const inW = r.inWater(x, bottom - 18 + 4);
      const st: Sim = { room: r, b: { x, y: bottom - 18, hw: 6, hh: 18, vx: 0, vy: 0, onGround: true }, djumped: false, launched: false };
      const hit: Hit = { spots: [], rings: [] };
      for (const p of inW ? [...gp, ...wp] : gp) run(st, p, a, hit);
      hit.spots.forEach(add);
      hit.rings.forEach(addRing);
    }
  }
  return { spots, seen, rings: ringsSeen };
}

// DEBUG_SPOT=room,tx,row[,abilities]: print where every program from that spot lands
if (process.env.DEBUG_SPOT) {
  const [room, tx, row, ab = ''] = process.env.DEBUG_SPOT.split(',');
  const a: Abil = { grapple: false, coil: false, dj: false, slide: false, glide: false, swim: false };
  for (const k of ab.split('+').filter(Boolean)) (a as any)[k] = true;
  makeRooms();
  for (const [vi, r] of rooms.get(room)!.entries()) {
    const x = +tx * TILE + 8, bottom = +row * TILE;
    const st: Sim = { room: r, b: { x, y: bottom - 18, hw: 6, hh: 18, vx: 0, vy: 0, onGround: true }, djumped: false, launched: false };
    const inW = r.inWater(x, bottom - 18 + 4);
    const out = new Set<string>();
    for (const p of inW ? [...groundProgs(a), ...waterProgs(a)] : groundProgs(a)) {
      const hit: Hit = { spots: [], rings: [] };
      TRACE = !!process.env.TRACE && p.swim === 6 && p.d0 === 0;
      run(st, p, a, hit);
      for (const s of hit.spots) out.add(key(s));
    }
    console.log(`variant ${vi} (in water: ${inW}, water ${JSON.stringify(r.water)}):`, [...out].join(' '));
  }
  process.exit(0);
}

// ------------------------------------------------------------------ progression
const startDef = defs.find((d) => d.ents.some((e) => e.t === 'P'))!;
const p = startDef.ents.find((e) => e.t === 'P')!;
const start: Spot = { room: startDef.id, tx: p.x, row: p.y + 1 };

type Thing = { id: string; room: string; x: number; y: number; t: string; arg: string };
const things: Thing[] = [];
for (const d of defs) for (const e of d.ents) if ('iRL'.includes(e.t)) things.push({ id: `${d.id}:${e.x},${e.y}`, room: d.id, x: e.x, y: e.y, t: e.t, arg: e.t === 'R' ? 'relic_grapple' : e.arg || '' });

const abil: Abil = { grapple: false, coil: false, dj: false, slide: false, glide: false, swim: false };
const got = new Set<string>();
let roomsBefore = new Set<string>();
let res = explore(abil, start);
for (let sphere = 0; sphere < 20; sphere++) {
  const reachedRooms = new Set(res.spots.map((s) => s.room));
  const newRooms = [...reachedRooms].filter((r) => !roomsBefore.has(r));
  roomsBefore = reachedRooms;
  // what can she pick up or pull from the spots she reached?
  const bySpot = new Set(res.seen);
  const found: Thing[] = [];
  for (const t of things) {
    if (got.has(t.id)) continue;
    let ok = false;
    if (t.t === 'L') {
      // a lever: whipped from up to 4 tiles away, a few rows up or down
      for (let dx = -4; dx <= 4 && !ok; dx++) for (let dr = 0; dr <= 6 && !ok; dr++) if (bySpot.has(`${t.room}:${t.x + dx},${t.y + dr}`)) ok = true;
    } else for (let dx = -1; dx <= 1 && !ok; dx++) for (const dr of [1, 2]) if (bySpot.has(`${t.room}:${t.x + dx},${t.y + dr}`)) ok = true;
    if (ok) found.push(t);
  }
  const relics = found.filter((t) => RELIC[t.arg]);
  console.log(`\n== sphere ${sphere}: ${[...Object.entries(abil)].filter(([, v]) => v).map(([k]) => k).join(' ') || 'no abilities'}${flags.size ? ' | flags ' + [...flags].join(' ') : ''}`);
  console.log(`   ${reachedRooms.size} rooms (+${newRooms.length}): ${newRooms.join(' ')}`);
  console.log(`   picked up: ${found.map((t) => `${t.arg}@${t.room}`).join(' ') || '-'}`);
  for (const t of found) {
    got.add(t.id);
    if (t.t === 'L') flags.add(t.arg);
  }
  const before = JSON.stringify(abil) + flags.size;
  for (const t of relics) {
    const k = RELIC[t.arg];
    if (k !== 'ward') abil[k] = true;
  }
  if (JSON.stringify(abil) + flags.size === before && !found.some((t) => t.t === 'L')) break;
  res = explore(abil, start);
}

const allRooms = new Set(res.spots.map((s) => s.room));
const missRooms = defs.filter((d) => !allRooms.has(d.id)).map((d) => d.id);
const missThings = things.filter((t) => !got.has(t.id));
console.log(`\n== end: ${allRooms.size}/${defs.length} rooms reached`);
if (missRooms.length) console.log(`   never entered: ${missRooms.join(' ')}`);
if (missThings.length) console.log(`   never reached: ${missThings.map((t) => `${t.t === 'L' ? 'lever ' : ''}${t.arg}@${t.id}`).join(' ')}`);
const rel = things.filter((t) => RELIC[t.arg]);
console.log(`   relics placed: ${rel.map((t) => `${t.arg}@${t.room}`).join(' ')}`);

const show = process.argv[2];
if (show) {
  const d = byId.get(show);
  if (!d) console.log(`no room ${show}`);
  else {
    const g = d.tiles.map((r) => r.split(''));
    for (const s of res.spots) if (s.room === d.id && g[s.row - 1]?.[s.tx] === '.') g[s.row - 1][s.tx] = '·';
    for (const e of d.ents) if (g[e.y]?.[e.x] !== undefined) g[e.y][e.x] = e.t;
    console.log(`\n${d.id} "${d.name}" (${d.gx},${d.gy}) ${d.w}x${d.h}   · = reached standing spot`);
    console.log(g.map((row, y) => String(y).padStart(2) + ' ' + row.join('')).join('\n'));
  }
}
