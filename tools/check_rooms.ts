// A map sanity check (run with: npm run check:rooms).
//   - no two rooms share a map cell
//   - every doorway on a room's edge is open on the other side too (gates count as open)
//   - every sign, item and enemy a room places exists
// Prints the problems it finds and the world map by zone.
import { buildRooms, RoomDef } from '../src/world/rooms';
import { ENEMY, ENEMY_LETTER, ITEMS } from '../src/game/data';
import { HINTS, LORE } from '../src/game/story';
import { BOSSES_IDS } from './check_rooms_ids';

// --abbey checks NEW GAME +'s map (the Drowned Abbey) instead of the original one
const world = process.argv.includes('--abbey') ? 'abbey' : 'ash';
const rooms = buildRooms(world);
const grid = new Map<string, RoomDef>();
const problems: string[] = [];
for (const r of rooms)
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      const k = `${r.gx + x},${r.gy + y}`;
      if (grid.has(k)) problems.push(`OVERLAP ${r.id} and ${grid.get(k)!.id} at ${k}`);
      grid.set(k, r);
    }

const OPEN = '.=~GN';
const tileAt = (gtx: number, gty: number) => {
  const d = grid.get(`${Math.floor(gtx / 24)},${Math.floor(gty / 14)}`);
  return d ? { d, c: d.tiles[gty - d.gy * 14][gtx - d.gx * 24] } : null;
};
for (const r of rooms) {
  const W = r.w * 24, H = r.h * 14;
  const seen = new Set<string>();
  const edge = (x: number, y: number, ox: number, oy: number) => {
    const c = r.tiles[y][x];
    if (!OPEN.includes(c)) return;
    const n = tileAt(r.gx * 24 + x + ox, r.gy * 14 + y + oy);
    if (n && n.d === r) return;
    const where = `${r.id} ${ox < 0 ? 'L' : ox > 0 ? 'R' : oy < 0 ? 'T' : 'B'} cell ${Math.floor(x / 24)},${Math.floor(y / 14)}`;
    if (seen.has(where)) return;
    if (!n) {
      // open sky above an outdoor room is fine; anything else leads nowhere
      if (oy < 0) return;
      seen.add(where);
      problems.push(`NOWHERE  ${where}`);
    } else if (!OPEN.includes(n.c)) {
      seen.add(where);
      problems.push(`WALLED   ${where} -> ${n.d.id}`);
    }
  };
  for (let y = 0; y < H; y++) {
    edge(0, y, -1, 0);
    edge(W - 1, y, 1, 0);
  }
  for (let x = 0; x < W; x++) {
    edge(x, 0, 0, -1);
    edge(x, H - 1, 0, 1);
  }
  const letters = Object.fromEntries(Object.entries(ENEMY_LETTER).map(([k, v]) => [v, k]));
  for (const e of r.ents) {
    if (e.x < 0 || e.y < 0 || e.x >= W || e.y >= H) problems.push(`OUTSIDE  ${r.id} entity ${e.t} at ${e.x},${e.y}`);
    if (e.t === 'T' && !HINTS[e.arg || ''] && !LORE[e.arg || '']) problems.push(`NO TEXT  ${r.id} sign '${e.arg}'`);
    if (e.t === 'i' && !ITEMS[e.arg || '']) problems.push(`NO ITEM  ${r.id} item '${e.arg}'`);
    if (letters[e.t] && e.arg && ENEMY[e.arg]?.base !== letters[e.t]) problems.push(`NO ENEMY ${r.id} ${letters[e.t]} variant '${e.arg}'`);
    // things that stand on something should have a floor under them
    if ('CSTLi'.includes(e.t) || (letters[e.t] && !'bwyfrpec'.includes(e.t))) {
      const under = r.tiles[e.y + 1]?.[e.x];
      if (under !== undefined && !'#=BHKD/\\G'.includes(under) && !(e.t === 'i' && r.boss)) problems.push(`FLOATING ${r.id} ${e.t}${e.arg ? ':' + e.arg : ''} at ${e.x},${e.y} (over '${under}')`);
    }
  }
  if (r.warp && !rooms.some((x) => x.id === r.warp!.to)) problems.push(`NO ROOM  ${r.id} warp to '${r.warp.to}'`);
  if (r.boss && !BOSSES_IDS.includes(r.boss)) problems.push(`NO BOSS  ${r.id} '${r.boss}'`);
}

console.log(problems.length ? problems.join('\n') : 'no problems found');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (arg) {
  const d = rooms.find((r) => r.id === arg);
  if (d) {
    const g = d.tiles.map((row) => row.split(''));
    for (const e of d.ents) if (g[e.y]?.[e.x] !== undefined) g[e.y][e.x] = e.t;
    console.log(`\n${d.id} "${d.name}" (${d.gx},${d.gy}) ${d.w}x${d.h}`);
    console.log(g.map((row, y) => String(y).padStart(2) + ' ' + row.join('')).join('\n'));
  }
}
console.log(`\n${rooms.length} rooms, ${grid.size} map cells`);
