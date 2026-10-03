// Map editor. Press F2 during play to edit the current room, F2 again to test it.
// editor.html opens the same editor straight away, with a room picker.
//
// Two modes:
// - room: paint tiles and place entities in one room. The tool bar is split into tabs.
// - map:  the world map. Move and resize rooms, and create new ones (MAP button or M).
//
// Edits change the live RoomDefs in Game.defs, so test play uses them immediately.
// SAVE posts every room that differs from its code version (and every room made here)
// to the dev server, which writes src/world/room_edits.json (see vite.config.ts).
// buildRooms() applies that file.
import type { Game, Sheets } from '../game/game';
import { Room } from '../world/room';
import { buildBaseRooms, World, RoomDef, EntDef, RoomEdits, RoomEdit, RoomMeta, META_KEYS, THEMES, ZONES, ZONE_INFO, Theme, Zone, emptyRoomTiles, resizeRoom } from '../world/rooms';
import { paintTiles } from '../gfx/tiles';
import { drawText, textWidth } from '../gfx/font';
import { disposeTree, Sheet } from '../gfx/view';
import { VW, VH, TILE, SCREEN_COLS as SC, SCREEN_ROWS as SR } from '../config';
import { ITEMS, ENEMY, BASE_ENEMIES, ENEMY_LETTER } from '../game/data';
import { HINTS, LORE } from '../game/story';
import { Hunter } from '../game/stats';
import { clamp } from '../core/util';
import { formDialog, Field } from './dialog';

interface Tool {
  id: string; // tile character, entity letter, or 'door'
  kind: 'tile' | 'ent' | 'door';
  label: string;
  /** Entity arg this tool places: an item id, or an enemy variant id. */
  arg?: string;
}

type Cat = 'tiles' | 'doors' | 'enemies' | 'objects' | 'items';
const CATS: [Cat, string][] = [
  ['tiles', 'MAP TILES'],
  ['doors', 'DOORS'],
  ['enemies', 'ENEMIES'],
  ['objects', 'OBJECTS'],
  ['items', 'ITEMS'],
];

/** Items the item tools place (relics are placed by code). */
const ITEM_IDS = Object.keys(ITEMS).filter((id) => ITEMS[id].slot !== 'relic');
const ENEMY_HINT: Record<string, string> = {
  bat: ' (HANGS FROM THE CEILING)', drowned: ' (PUT IT IN WATER)', harpy: ' (FLIES)', wraith: ' (FLOATS)',
  crawler: ' (CRAWLS ROUND WALLS AND CEILINGS. RIGHT UNDER A CEILING: STARTS ON IT)', eel: ' (PUT IT IN WATER)', grub: ' (PUT IT ON A FLOOR)', hand: ' (PUT IT ON A FLOOR)',
  tome: ' (PUT IT INSIDE A BOOKCASE: SLEEPS UNTIL YOU PASS)',
  chair: ' (LOOKS LIKE A PROP CHAIR UNTIL YOU COME CLOSE)',
  librarian: ' (ON THE FLOOR IN FRONT OF A BOOKCASE: SHELVES BOOKS UNTIL YOU COME CLOSE)',
};

/** The tool palette, one list per tab. Enemy variants from the enemy editor sit after their base enemy. */
function buildTools(): Record<Cat, Tool[]> {
  const enemies: Tool[] = [];
  for (const base of BASE_ENEMIES) {
    const id = ENEMY_LETTER[base], baseName = ENEMY[base].name.toUpperCase();
    enemies.push({ id, kind: 'ent', label: baseName + (ENEMY_HINT[base] || '') });
    for (const [vid, st] of Object.entries(ENEMY))
      if (vid !== base && st.base === base) enemies.push({ id, kind: 'ent', arg: vid, label: `${st.name.toUpperCase()} (${baseName} VARIANT)` });
  }
  return {
    tiles: [
      { id: '.', kind: 'tile', label: 'EMPTY (ERASE TILE)' },
      { id: '#', kind: 'tile', label: 'WALL' },
      { id: 'B', kind: 'tile', label: 'BREAKABLE WALL' },
      { id: 'H', kind: 'tile', label: 'WOOD PLANK' },
      { id: '=', kind: 'tile', label: 'ONE-WAY LEDGE' },
      { id: '/', kind: 'tile', label: 'RAMP UP TO THE RIGHT (1 TILE UP EVERY 2: LAY THEM IN PAIRS)' },
      { id: '\\', kind: 'tile', label: 'RAMP UP TO THE LEFT (1 TILE UP EVERY 2: LAY THEM IN PAIRS)' },
      { id: 'K', kind: 'tile', label: 'BOOKCASE (WALK THROUGH, STAND ON TOP)' },
      { id: 'D', kind: 'tile', label: 'TABLE (WALK THROUGH, STAND ON TOP)' },
      { id: '^', kind: 'tile', label: 'SPIKES' },
      { id: '~', kind: 'tile', label: 'WATER' },
    ],
    doors: [
      { id: 'door', kind: 'door', label: 'DOOR: CLICK AN EDGE TO OPEN, RIGHT-CLICK TO WALL UP' },
      { id: 'G', kind: 'tile', label: "GATE (OPENS WITH THE ROOM'S FLAG)" },
      { id: 'N', kind: 'tile', label: "SNOW SEAL (FILLS WITH THE ROOM'S SEAL FLAG)" },
    ],
    enemies,
    objects: [
      { id: 'C', kind: 'ent', label: 'CANDLE' },
      { id: 'O', kind: 'ent', label: 'GRAPPLE RING' },
      { id: 'S', kind: 'ent', label: 'SAVE ALTAR' },
      { id: 'T', kind: 'ent', label: 'SIGN / LORE STONE (DOUBLE-CLICK: TEXT)' },
      { id: 'L', kind: 'ent', label: 'LEVER (DOUBLE-CLICK: SET ITS FLAG)' },
      { id: 'n', kind: 'ent', label: 'CHAIR (FACES A TABLE NEXT TO IT)' },
      { id: 'M', kind: 'ent', label: 'MERCHANT (PELL AND HIS SHOP)' },
    ],
    items: ITEM_IDS.map((id) => ({ id: 'i', kind: 'ent' as const, arg: id, label: `ITEM: ${ITEMS[id].name.toUpperCase()}` })),
  };
}

/** Entities the level depends on (start, relic, boss): they can be moved but not deleted. */
const LOCKED = 'PRW';
/** Entities drawn two tiles tall, so you can grab them by their upper half too. */
const TALL = 'zksdlPS';
/** Tools whose arg is set per placed entity (double-click), not part of the tool itself. */
const ARGLESS = 'TL';
const sameTool = (a: Tool, b: Tool) => a.id === b.id && a.kind === b.kind && (ARGLESS.includes(a.id) || (a.arg || '') === (b.arg || ''));
/** Tiles that block a doorway. Gates and snow seals count as doors. */
const SOLID = '#BH';

/** How each entity letter is drawn: which sheet and animation, and how far above the tile bottom its anchor sits. */
const MARKERS: Record<string, { sheet: keyof Sheets; anim: string; dy: number }> = {
  z: { sheet: 'zombie', anim: 'walk', dy: 18 },
  b: { sheet: 'bat', anim: 'hang', dy: 8 },
  k: { sheet: 'knight', anim: 'walk', dy: 19 },
  s: { sheet: 'skeleton', anim: 'walk', dy: 18 },
  w: { sheet: 'wisp', anim: 'float', dy: 8 },
  d: { sheet: 'drowned', anim: 'walk', dy: 18 },
  g: { sheet: 'dog', anim: 'stand', dy: 11 },
  y: { sheet: 'harpy', anim: 'fly', dy: 8 },
  r: { sheet: 'wraith', anim: 'float', dy: 16 },
  c: { sheet: 'crawler', anim: 'crawl', dy: 9 },
  h: { sheet: 'hookjaw', anim: 'walk', dy: 18 },
  v: { sheet: 'devourer', anim: 'walk', dy: 22 },
  e: { sheet: 'eel', anim: 'swim', dy: 4 },
  m: { sheet: 'caster', anim: 'idle', dy: 18 },
  o: { sheet: 'ooze', anim: 'big', dy: 0 },
  u: { sheet: 'grub', anim: 'mound', dy: 0 },
  x: { sheet: 'hand', anim: 'reach', dy: 0 },
  f: { sheet: 'moth', anim: 'fly', dy: 8 },
  t: { sheet: 'tome', anim: 'shelf', dy: 8 },
  a: { sheet: 'chair', anim: 'sit', dy: 8 },
  n: { sheet: 'chair', anim: 'sit', dy: 8 },
  l: { sheet: 'librarian', anim: 'tend', dy: 18 },
  C: { sheet: 'candle', anim: 'candle', dy: 16 },
  S: { sheet: 'candle', anim: 'altar', dy: 16 },
  L: { sheet: 'candle', anim: 'lever', dy: 16 },
  O: { sheet: 'items', anim: 'ringAnchor', dy: 9 },
  i: { sheet: 'items', anim: 'potion', dy: 8 },
  R: { sheet: 'items', anim: 'relic', dy: 10 },
  W: { sheet: 'wyrm', anim: 'skull', dy: 8 },
  P: { sheet: 'hero', anim: 'idle', dy: 18 },
  T: { sheet: 'candle', anim: 'sign', dy: 16 },
};

const ZONE_COL: Record<string, string> = Object.fromEntries(Object.entries(ZONE_INFO).map(([z, i]) => [z, i.color]));
const ZONE_HELP: Record<string, string> = Object.fromEntries(
  Object.entries(ZONE_INFO).map(([z, i]) => [z, `${i.music ? i.music + ' music' : 'no music'}, "${i.name}" banner`]),
);

const TOP_H = 14; // top bar height
const BOTTOM_H = 44; // info line + category tabs + tool bar
const GOLD = '#d8b060';
const PALE = '#e8dcc8';
const DIM = '#8a7a90';
const MAP_ZOOMS = [8, 12, 16, 24, 32, 48]; // world map: pixels per map cell, across
const MARGIN = 20; // room view: how far the camera may scroll past the room's edges
const STRIP = 16; // the grow strip just outside each room edge

type Side = 'L' | 'R' | 'T' | 'B';
const SIDE_NAME: Record<Side, string> = { L: 'LEFT', R: 'RIGHT', T: 'TOP', B: 'BOTTOM' };
/** A rectangle in room pixels. */
interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** A doorway spot on this room's edge where a neighbor room touches it. */
interface Doorway {
  side: Side;
  n: RoomDef;
  here: boolean; // open on this room's side
  there: boolean; // open on the neighbor's side
  hint: PxRect; // the colored bar along the edge
  arrow: PxRect; // the "go there" button in the margin (only when both sides are open)
  /** Where to put the ghost hero in the neighbor (room pixels of the neighbor), or null to use findStart. */
  to: { x: number; bottom: number } | null;
  /** The doorway's spot in the neighbor (room pixels), where the view centers after going through. */
  look: { x: number; bottom: number };
}
const inRect = (r: PxRect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

type Drag =
  | { mode: 'paint' | 'erase'; last: [number, number] }
  | { mode: 'move'; ent: EntDef | 'start' }
  | { mode: 'pan'; sx: number; sy: number; cx: number; cy: number; moved: boolean; pick: [number, number] | null }
  | { mode: 'mapMove'; def: RoomDef; ox: number; oy: number; gx: number; gy: number }
  | { mode: 'mapSize'; def: RoomDef; l: boolean; r: boolean; t: boolean; b: boolean; rect: Rect }
  | null;

interface Rect {
  gx: number;
  gy: number;
  w: number;
  h: number;
}
interface Button {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tool?: Tool;
  cat?: Cat;
}
/** World-map undo: a room's state before an edit, a room that was created, or one that was deleted. */
type MapUndo = { kind: 'edit'; id: string; snap: string } | { kind: 'create'; id: string } | { kind: 'delete'; def: string; index: number };

function roomMeta(d: RoomDef): RoomMeta {
  const m: any = {};
  for (const k of META_KEYS) if (d[k] !== undefined) m[k] = d[k];
  return m;
}
/** Everything the editor changes in a room, as a comparable string (also used for undo). */
const snap = (d: RoomDef) => JSON.stringify({ tiles: d.tiles, ents: d.ents, ...roomMeta(d) });
/** Put a snap() back into a room. */
function applySnap(d: RoomDef, s: string) {
  const v = JSON.parse(s);
  for (const k of META_KEYS) if (!(k in v)) delete (d as any)[k];
  Object.assign(d, v);
}
const sameRect = (a: Rect, b: Rect) => a.gx === b.gx && a.gy === b.gy && a.w === b.w && a.h === b.h;

export class Editor {
  active = false;
  standalone = false;
  mode: 'room' | 'map' = 'room';
  tools = buildTools();
  cat: Cat = 'tiles';
  tool: Tool = this.tools.tiles[1];
  page: Record<Cat, number> = { tiles: 0, doors: 0, enemies: 0, objects: 0, items: 0 };
  picker = false;
  help = true;
  grid = true;
  modal = false; // an HTML dialog is open
  mouse = { x: -1, y: -1 };
  drag: Drag = null;
  undo = new Map<string, string[]>(); // per room id
  base = new Map<string, string>(); // room id → the code-built version
  baseDefs = new Map<string, RoomDef>();
  saved = new Map<string, string>(); // room id → version on disk
  start = { x: 0, bottom: 0 }; // where test play begins (the ghost hero)
  status = { text: '', t: 0 };
  tilesDirty = false;
  resetArm = 0;
  deleteArm = 0;
  /** A lever waiting for a second right-click before it is deleted. */
  leverArm: EntDef | null = null;
  /** A side waiting for a second right-click before its outer cells are removed. */
  shrinkArm: { side: Side | ''; t: number } = { side: '', t: 0 };
  // world map
  mapZoom = 2; // index into MAP_ZOOMS
  mapX = 0; // top-left of the map view, in map pixels
  mapY = 0;
  selected: RoomDef | null = null;
  placing: RoomDef | null = null; // a new room following the mouse
  mapUndo: MapUndo[] = [];
  mapChanged = false; // rooms moved/resized/deleted: reload the current room on the way out
  private previews = new Map<string, HTMLCanvasElement>();
  private bounds = new Map<string, [number, number, number, number]>();
  private thumbs = new Map<RoomDef, { key: string; cv: HTMLCanvasElement }>();

  constructor(private g: Game) {
    this.setWorld('ash');
    const hud = g.view.hud;
    hud.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    hud.addEventListener('dblclick', (e) => this.onDouble(e));
    hud.addEventListener('contextmenu', (e) => this.active && e.preventDefault());
    hud.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  get def() {
    return this.g.room.def;
  }

  /** Which map is being edited: each has its own code rooms and its own edits file. */
  world: World = 'ash';
  setWorld(w: World) {
    this.world = w;
    this.base.clear();
    this.baseDefs.clear();
    this.saved.clear();
    this.undo.clear();
    for (const d of buildBaseRooms(w)) {
      this.base.set(d.id, snap(d));
      this.baseDefs.set(d.id, d);
    }
    for (const d of this.g.defs) this.saved.set(d.id, snap(d));
  }
  /** The edits file of the current map (for messages). */
  get editsFile() {
    return this.world === 'abbey' ? 'ROOM_EDITS_ABBEY.JSON' : 'ROOM_EDITS.JSON';
  }

  // ================================================================ enter / leave

  /** editor.html: a sturdy test hero with everything unlocked, and the room picker open. */
  openStandalone() {
    const g = this.g;
    this.standalone = true;
    const h = new Hunter();
    h.hp = h.maxHp = 9999;
    h.hearts = h.maxHearts = 99;
    h.grapple = h.doubleJump = h.slide = true;
    h.glide = h.swim = h.ward = h.elastic = true;
    h.subs = ['sub_holy', 'sub_cross'];
    h.sub = 'sub_holy';
    g.hunter = h;
    g.visited = new Set();
    const def = g.defs[0];
    const s = this.findStart(def);
    g.loadRoom(def, s.x, s.bottom);
    this.enter();
    this.picker = true;
  }

  enter() {
    const g = this.g, p = g.player;
    this.active = true;
    this.mode = 'room';
    g.state = 'edit';
    this.start = { x: p.x, bottom: p.bottom };
    this.prepareRoom();
    this.fitCamera();
    g.view.hud.style.cursor = 'crosshair';
  }

  /** One-screen-tall rooms: center them between the bars, so the floor row isn't hidden. */
  fitCamera() {
    const r = this.g.room;
    if (r.rows <= SR) this.g.view.camY = Math.round((r.H - (VH - TOP_H - BOTTOM_H)) / 2 - TOP_H);
    this.clampCamera();
  }

  /** Clear live entities and show the room as authored: gates shut, water in, broken blocks back. */
  prepareRoom() {
    const g = this.g;
    for (const e of g.ents) e.destroy();
    g.ents = [];
    g.rings = [];
    g.boss = null;
    g.fx.clear();
    g.dmgNums = [];
    g.drainT = 0;
    g.shakeT = 0;
    g.view.shakeX = g.view.shakeY = 0;
    g.fade = g.fadeFlash = g.flashWhite = 0;
    if (g.waterFront) {
      g.view.world.remove(g.waterFront.mesh);
      disposeTree(g.waterFront.mesh);
      g.waterFront = null;
    }
    g.room = new Room(g.room.def, (x, y) => g.tileOutside(x, y));
    g.paintRoomTiles();
    g.player.hide();
    g.view.camX = Math.round(g.view.camX);
    g.view.camY = Math.round(g.view.camY);
  }

  /** Leave the editor and play the current room from the ghost hero's spot. */
  play() {
    const g = this.g;
    if (this.mode === 'map') this.leaveMap();
    this.active = false;
    this.picker = false;
    this.drag = null;
    g.view.hud.style.cursor = '';
    g.state = 'play';
    g.loadRoom(this.def, this.start.x, this.start.bottom);
    const p = g.player;
    for (let i = 0; i < 40 && p.overlapsSolid(); i++) p.y -= 4; // don't start inside a wall
    p.invuln = 60;
    g.input.flush();
  }

  switchRoom(def: RoomDef) {
    const s = this.findStart(def);
    this.g.loadRoom(def, s.x, s.bottom);
    this.start = s;
    this.prepareRoom();
    this.fitCamera();
    this.picker = false;
  }

  /** Rebuild the current room (backdrop too) after its theme or size changed, keeping the view. */
  reloadRoom() {
    const v = this.g.view, cam = { x: v.camX, y: v.camY }, d = this.def;
    const start = { x: clamp(this.start.x, 8, d.w * SC * TILE - 8), bottom: clamp(this.start.bottom, TILE, d.h * SR * TILE) };
    this.g.loadRoom(d, start.x, start.bottom);
    this.start = start;
    this.prepareRoom();
    v.camX = cam.x;
    v.camY = cam.y;
  }

  /** A spot to stand in a room: its start/altar entity, else the lowest open floor from the left. */
  findStart(def: RoomDef) {
    const e = def.ents.find((x) => x.t === 'P') || def.ents.find((x) => x.t === 'S');
    if (e) return { x: e.x * TILE + 8 + (e.t === 'S' ? 20 : 0), bottom: (e.y + 1) * TILE };
    const t = def.tiles;
    const open = (x: number, y: number) => y >= 0 && !'#BHG'.includes(t[y]?.[x] ?? '#');
    const floor = (x: number, y: number) => '#BH='.includes(t[y]?.[x] ?? '.');
    for (let y = t.length - 2; y > 2; y--)
      for (let x = 1; x < t[0].length - 1; x++) if (open(x, y) && open(x, y - 1) && open(x, y - 2) && floor(x, y + 1)) return { x: x * TILE + 8, bottom: (y + 1) * TILE };
    return { x: 3 * TILE, bottom: 12 * TILE };
  }

  // ================================================================ per-frame

  update() {
    const g = this.g, k = g.input.keys, v = g.view;
    if (this.status.t > 0) this.status.t--;
    if (this.resetArm > 0) this.resetArm--;
    if (this.deleteArm > 0) this.deleteArm--;
    if (this.shrinkArm.t > 0) this.shrinkArm.t--;
    const ctrl = k.has('ControlLeft') || k.has('ControlRight');
    if (!this.picker && !ctrl && !this.modal) {
      const sp = k.has('ShiftLeft') || k.has('ShiftRight') ? 10 : 4;
      const dx = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
      const dy = (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
      if (this.mode === 'map') {
        this.mapX += dx * sp;
        this.mapY += dy * sp;
      } else {
        v.camX += dx * sp;
        v.camY += dy * sp;
      }
    }
    this.clampCamera();
    // repaint at most once per frame, however many tiles a drag touched
    if (this.tilesDirty) {
      this.tilesDirty = false;
      g.paintRoomTiles();
    }
  }

  clampCamera() {
    const v = this.g.view, r = this.g.room;
    // slack past the edges: the bars never hide the outer tiles, and the margin holds
    // the grow strips and door arrows (see edgeAction)
    v.camX = Math.round(clamp(v.camX, -MARGIN, Math.max(-MARGIN, r.W - VW + MARGIN)));
    v.camY = Math.round(clamp(v.camY, -TOP_H - MARGIN, Math.max(-TOP_H - MARGIN, r.H - VH + BOTTOM_H + MARGIN)));
  }

  // ================================================================ editing

  pushUndo(d = this.def) {
    const s = snap(d);
    const list = this.undo.get(d.id) || [];
    if (list[list.length - 1] === s) return; // e.g. a click that changed nothing
    list.push(s);
    if (list.length > 100) list.shift();
    this.undo.set(d.id, list);
  }

  doUndo() {
    if (this.mode === 'map') return this.doMapUndo();
    const list = this.undo.get(this.def.id), s = list?.pop();
    if (!s) return this.say('NOTHING TO UNDO');
    if (!this.restore(s)) return list!.push(s);
    this.say('UNDONE');
  }

  /**
   * Put a snapshot back into the current room, reloading it if its look or size changed.
   * Returns false (and changes nothing) if the old size would overlap another room now.
   */
  restore(s: string) {
    const d = this.def, v = JSON.parse(s) as RoomDef, before = { theme: d.theme, gx: d.gx, gy: d.gy, w: d.w, h: d.h };
    if (!sameRect(v, d) && this.overlaps(v, d)) {
      this.say("CAN'T UNDO THAT: ANOTHER ROOM IS IN THE WAY NOW");
      return false;
    }
    applySnap(d, s);
    if (!sameRect(before, d)) this.geometryChanged(before);
    else if (before.theme !== d.theme) this.reloadRoom();
    else this.prepareRoom();
    return true;
  }

  /**
   * The current room moved or changed size. Tiles stay put in the world, so shift the
   * camera and ghost hero with them (growing left/up adds space before x/y 0), then reload.
   */
  geometryChanged(before: Rect) {
    const d = this.def, v = this.g.view;
    const dx = (before.gx - d.gx) * SC * TILE, dy = (before.gy - d.gy) * SR * TILE;
    v.camX += dx;
    v.camY += dy;
    this.start = { x: this.start.x + dx, bottom: this.start.bottom + dy };
    this.g.rebuildGrid();
    this.reloadRoom();
  }

  /** Grow (+1) or shrink (-1) the current room by one cell on one side. */
  growRoom(side: Side, delta: 1 | -1) {
    const d = this.def;
    const r: Rect = { gx: d.gx, gy: d.gy, w: d.w, h: d.h };
    if (side === 'L') (r.gx -= delta), (r.w += delta);
    if (side === 'R') r.w += delta;
    if (side === 'T') (r.gy -= delta), (r.h += delta);
    if (side === 'B') r.h += delta;
    if (r.w < 1 || r.h < 1) return this.say('A ROOM NEEDS AT LEAST ONE CELL');
    if (r.w > 8 || r.h > 8) return this.say('ROOMS ARE AT MOST 8 CELLS EACH WAY');
    if (this.overlaps(r, d)) return this.say(`ANOTHER ROOM IS IN THE WAY ON THE ${SIDE_NAME[side]}`);
    if (delta < 0 && (this.shrinkArm.side !== side || this.shrinkArm.t <= 0)) {
      // removing a cell throws away its tiles and entities, so it takes a second click
      this.shrinkArm = { side, t: 150 };
      return this.say(`RIGHT-CLICK AGAIN TO REMOVE THE ${SIDE_NAME[side]} CELLS`);
    }
    this.shrinkArm = { side: '', t: 0 };
    this.pushUndo();
    const before = { gx: d.gx, gy: d.gy, w: d.w, h: d.h };
    resizeRoom(d, r.gx, r.gy, r.w, r.h, LOCKED + 'L');
    this.geometryChanged(before);
    this.say(`${delta > 0 ? 'ADDED' : 'REMOVED'} A CELL ON THE ${SIDE_NAME[side]}: NOW ${d.w}X${d.h} (CTRL+Z TO UNDO)`);
  }

  /** Every place a neighbor room touches this room's edge at a doorway spot. */
  doorways(): Doorway[] {
    const g = this.g, d = this.def, W = d.w * SC * TILE, H = d.h * SR * TILE, out: Doorway[] = [];
    const openIn = (r: RoomDef, x: number, y: number) => {
      const ch = r.tiles[y]?.[x];
      return ch !== undefined && !SOLID.includes(ch);
    };
    // a point in this room's pixels, in the neighbor's pixels
    const cross = (n: RoomDef, x: number, bottom: number) => ({ x: x + (d.gx - n.gx) * SC * TILE, bottom: bottom + (d.gy - n.gy) * SR * TILE });
    for (let i = 0; i < d.h; i++) {
      const y = (i * SR + 8) * TILE;
      for (const side of ['L', 'R'] as const) {
        const n = g.roomAt(side === 'L' ? d.gx - 1 : d.gx + d.w, d.gy + i);
        if (!n) continue;
        const ny = (d.gy + i - n.gy) * SR + 9, nx = side === 'L' ? n.w * SC - 1 : 0;
        out.push({
          side, n,
          here: openIn(d, side === 'L' ? 0 : d.w * SC - 1, i * SR + 9),
          there: openIn(n, nx, ny),
          hint: { x: side === 'L' ? 0 : W - 3, y, w: 3, h: 4 * TILE },
          arrow: { x: side === 'L' ? -15 : W + 3, y: y + 24, w: 12, h: 16 },
          to: cross(n, side === 'L' ? -40 : W + 40, (i * SR + 12) * TILE),
          look: cross(n, side === 'L' ? -40 : W + 40, (i * SR + 12) * TILE),
        });
      }
    }
    for (let i = 0; i < d.w; i++) {
      const x = (i * SC + 10) * TILE;
      for (const side of ['T', 'B'] as const) {
        const n = g.roomAt(d.gx + i, side === 'T' ? d.gy - 1 : d.gy + d.h);
        if (!n) continue;
        const nx = (d.gx + i - n.gx) * SC + 11, ny = side === 'T' ? n.h * SR - 1 : 0;
        out.push({
          side, n,
          here: openIn(d, i * SC + 11, side === 'T' ? 0 : d.h * SR - 1),
          there: openIn(n, nx, ny),
          hint: { x, y: side === 'T' ? 0 : H - 3, w: 4 * TILE, h: 3 },
          arrow: { x: x + 24, y: side === 'T' ? -15 : H + 3, w: 16, h: 12 },
          // going down: start just inside the neighbor's top and fall; going up there's no floor at the hole
          to: side === 'B' ? cross(n, x + 32, H + 3 * TILE) : null,
          look: cross(n, x + 32, side === 'B' ? H + 3 * TILE : -3 * TILE),
        });
      }
    }
    return out;
  }

  /**
   * What the margin outside the room does at this screen point: a green doorway's arrow
   * (go to that room), or the grow strip of one side.
   */
  edgeAction(sx: number, sy: number): { door: Doorway } | { side: Side } | null {
    if (!this.inWorld(sy)) return null;
    const v = this.g.view, d = this.def, wx = sx + v.camX, wy = sy + v.camY;
    const W = d.w * SC * TILE, H = d.h * SR * TILE;
    const door = this.doorways().find((w) => w.here && w.there && inRect({ x: w.arrow.x - 2, y: w.arrow.y - 2, w: w.arrow.w + 4, h: w.arrow.h + 4 }, wx, wy));
    if (door) return { door };
    if (wx >= -STRIP && wx < 0 && wy >= 0 && wy < H) return { side: 'L' };
    if (wx >= W && wx < W + STRIP && wy >= 0 && wy < H) return { side: 'R' };
    if (wy >= -STRIP && wy < 0 && wx >= 0 && wx < W) return { side: 'T' };
    if (wy >= H && wy < H + STRIP && wx >= 0 && wx < W) return { side: 'B' };
    return null;
  }

  /** Go through a doorway: edit the neighbor room, with the ghost hero and view at the matching door. */
  goThrough(w: Doorway) {
    const g = this.g, v = g.view, n = w.n;
    const s = w.to || this.findStart(n);
    g.loadRoom(n, s.x, s.bottom);
    this.start = { x: clamp(s.x, 8, n.w * SC * TILE - 8), bottom: clamp(s.bottom, TILE, n.h * SR * TILE) };
    this.prepareRoom();
    // center the view on the doorway we came through
    v.camX = Math.round(w.look.x - VW / 2);
    v.camY = Math.round(w.look.bottom - 24 - (VH + TOP_H - BOTTOM_H) / 2);
    this.clampCamera();
    this.say(`NOW EDITING ${n.name.toUpperCase()}`);
  }

  setTile(tx: number, ty: number, c: string) {
    const d = this.def, r = this.g.room;
    if (tx < 0 || ty < 0 || tx >= r.cols || ty >= r.rows) return;
    const row = d.tiles[ty];
    if (row[tx] === c) return;
    d.tiles[ty] = row.slice(0, tx) + c + row.slice(tx + 1);
    r.tiles[ty][tx] = c;
    this.tilesDirty = true;
  }

  /** Apply fn to every tile on the line between two tiles, so fast drags leave no gaps. */
  line(a: [number, number], b: [number, number], fn: (x: number, y: number) => void) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let i = 0; i <= n; i++) fn(Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n));
  }

  /** The entity (or the ghost hero) whose grab area covers this tile. */
  entAt(tx: number, ty: number): EntDef | 'start' | null {
    const sx = Math.floor(this.start.x / TILE), sy = Math.floor((this.start.bottom - 1) / TILE);
    if (tx === sx && (ty === sy || ty === sy - 1)) return 'start';
    const ents = this.def.ents;
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (e.x === tx && (e.y === ty || (TALL.includes(e.t) && e.y - 1 === ty))) return e;
    }
    return null;
  }

  /** Right-click: remove the entity here, else clear the tile. `fresh` is false while dragging. */
  eraseAt(tx: number, ty: number, fresh: boolean) {
    const e = this.entAt(tx, ty);
    if (e && e !== 'start') {
      if (LOCKED.includes(e.t)) return fresh && this.say('THAT ONE CAN ONLY BE MOVED, NOT DELETED');
      if (e.t === 'L') {
        // levers open gates the level may depend on, so they take a second click
        if (!fresh) return;
        if (this.leverArm !== e) {
          this.leverArm = e;
          return this.say('RIGHT-CLICK THE LEVER AGAIN TO DELETE IT');
        }
      }
      this.leverArm = null;
      this.def.ents.splice(this.def.ents.indexOf(e), 1);
      return;
    }
    if (!e) this.setTile(tx, ty, '.');
  }

  place(tx: number, ty: number) {
    const r = this.g.room;
    if (tx < 0 || ty < 0 || tx >= r.cols || ty >= r.rows) return;
    if (this.def.ents.some((e) => e.x === tx && e.y === ty)) return;
    const e: EntDef = { x: tx, y: ty, t: this.tool.id };
    if (this.tool.arg) e.arg = this.tool.arg;
    else if (this.tool.id === 'T') e.arg = 'move'; // double-click the sign to change its text
    else if (this.tool.id === 'L') e.arg = this.def.gateFlag || this.def.drainFlag || `${this.def.id}_lever`;
    this.def.ents.push(e);
  }

  /**
   * Door tool: open (or wall up) the doorway on the room edge nearest the clicked tile.
   * Side doors use tile rows 8-11 of a map cell, holes use columns 10-13, so rooms line up.
   */
  door(tx: number, ty: number, open: boolean) {
    const d = this.def, W = d.w * SC, H = d.h * SR;
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
    const cx = Math.floor(tx / SC), cy = Math.floor(ty / SR), lx = tx - cx * SC, ly = ty - cy * SR;
    const edges: [string, number][] = [];
    if (cx === 0) edges.push(['L', lx / SC]);
    if (cx === d.w - 1) edges.push(['R', (SC - 1 - lx) / SC]);
    if (cy === 0) edges.push(['T', ly / SR]);
    if (cy === d.h - 1) edges.push(['B', (SR - 1 - ly) / SR]);
    if (!edges.length) return this.say("DOORS GO ON THE ROOM'S OUTER EDGE");
    const side = edges.sort((a, b) => a[1] - b[1])[0][0];
    const solid = (x: number, y: number) => SOLID.includes(d.tiles[y][x]);
    // open: dig in from the edge through the whole wall (up to 8 tiles thick)
    const dig = (x0: number, y0: number, sx: number, sy: number) => {
      for (let i = 0, x = x0, y = y0; i < 8 && x >= 0 && y >= 0 && x < W && y < H && solid(x, y); i++, x += sx, y += sy) this.setTile(x, y, '.');
    };
    if (side === 'L' || side === 'R') {
      const x = side === 'L' ? 0 : W - 1;
      for (let y = cy * SR + 8; y <= cy * SR + 11; y++) open ? dig(x, y, side === 'L' ? 1 : -1, 0) : this.setTile(x, y, '#');
    } else {
      for (let x = cx * SC + 10; x <= cx * SC + 13; x++) {
        if (side === 'T') open ? dig(x, 0, 0, 1) : this.setTile(x, 0, '#');
        else if (open) dig(x, H - 1, 0, -1);
        else {
          this.setTile(x, H - 1, '#');
          this.setTile(x, H - 2, '#');
        }
      }
    }
    const what = side === 'L' || side === 'R' ? 'DOOR' : 'HOLE';
    this.say(open ? `${what} OPENED` : `${what} WALLED UP`);
  }

  /** Middle click: make the tile or entity under the mouse the current tool. */
  pickAt(tx: number, ty: number) {
    const d = this.def;
    if (tx < 0 || ty < 0 || tx >= d.w * SC || ty >= d.h * SR) return;
    const e = this.entAt(tx, ty);
    let want: Tool | null = null;
    if (e && e !== 'start') want = { id: e.t, kind: 'ent', label: '', arg: e.arg };
    else if (!e) want = { id: d.tiles[ty][tx], kind: 'tile', label: '' };
    for (const [cat] of CATS) {
      const t = want && this.tools[cat].find((x) => sameTool(x, want!));
      if (!t) continue;
      this.selectTool(cat, ARGLESS.includes(t.id) && e && e !== 'start' ? { ...t, arg: e.arg } : t);
      return this.say(`PICKED: ${t.label}`);
    }
    this.say("THAT ONE CAN'T BE PLACED FROM THE TOOL BAR");
  }

  selectTool(cat: Cat, t: Tool) {
    this.cat = cat;
    this.tool = t;
    // flip to the page that shows it
    const i = this.tools[cat].findIndex((x) => sameTool(x, t)), per = this.toolsPerPage(cat);
    if (i >= 0) this.page[cat] = Math.floor(i / per);
  }

  resetRoom() {
    if (!this.base.has(this.def.id)) return this.say('THIS ROOM WAS MADE IN THE EDITOR: IT HAS NO CODE VERSION');
    if (this.resetArm <= 0) {
      this.resetArm = 150;
      return this.say('CLICK RESET AGAIN TO RESTORE THE CODE VERSION');
    }
    this.resetArm = 0;
    this.pushUndo();
    if (!this.restore(this.base.get(this.def.id)!)) return this.undo.get(this.def.id)!.pop();
    this.say('ROOM RESET TO ITS CODE VERSION (CTRL+Z TO UNDO)');
  }

  /** Has anything changed since the last save (including rooms added or deleted)? */
  worldDirty() {
    const defs = this.g.defs;
    return defs.length !== this.saved.size || defs.some((d) => snap(d) !== this.saved.get(d.id));
  }

  async save() {
    const edits: RoomEdits = {};
    for (const d of this.g.defs) {
      const s = snap(d), b = this.baseDefs.get(d.id);
      if (s === this.base.get(d.id)) continue;
      const e: RoomEdit = { tiles: d.tiles, ents: d.ents };
      const m = roomMeta(d) as any, bm = (b ? roomMeta(b) : {}) as any;
      // only the settings that differ from the code, so later code changes still apply
      for (const k of META_KEYS) if (m[k] !== bm[k]) (e as any)[k] = m[k] ?? (typeof bm[k] === 'boolean' ? false : '');
      edits[d.id] = e;
    }
    const n = Object.keys(edits).length;
    try {
      const res = await fetch(this.world === 'abbey' ? '/__editor/save?world=abbey' : '/__editor/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edits) });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || res.statusText);
      this.saved.clear();
      for (const d of this.g.defs) this.saved.set(d.id, snap(d));
      this.say(n ? `SAVED ${n} EDITED ROOM${n === 1 ? '' : 'S'} TO ${this.editsFile}` : 'SAVED: NO ROOMS DIFFER FROM THE CODE');
    } catch {
      // production builds have no save endpoint: hand the data over instead
      try {
        await navigator.clipboard.writeText(JSON.stringify(edits, null, 2));
        this.say('NO DEV SERVER: EDITS COPIED TO THE CLIPBOARD');
      } catch {
        this.say('SAVE FAILED. RUN NPM RUN DEV AND TRY AGAIN');
      }
    }
  }

  say(text: string) {
    this.status = { text, t: 180 };
  }

  /** Show an HTML form; the editor ignores input while it is open. */
  async ask(title: string, fields: Field[], ok?: string) {
    this.modal = true;
    this.drag = null;
    const v = await formDialog(title, fields, ok);
    this.modal = false;
    this.g.input.flush();
    return v;
  }

  // ================================================================ room settings

  themeOptions(): [string, string][] {
    return THEMES.map((t) => {
      const eg = [...this.baseDefs.values()].find((d) => d.theme === t);
      return [t, eg ? `${t} (like ${eg.name})` : t];
    });
  }
  zoneOptions(): [string, string][] {
    return ZONES.map((z) => [z, `${z} (${ZONE_HELP[z]})`]);
  }

  /** Change a room setting, leaving optional ones unset when they are blank. */
  setMeta(d: RoomDef, k: (typeof META_KEYS)[number], v: unknown) {
    const b = this.baseDefs.get(d.id) as any;
    if ((v === '' || v === false) && (!b || b[k] === undefined)) delete (d as any)[k];
    else (d as any)[k] = v;
  }

  async editProps(d: RoomDef) {
    const v = await this.ask(`Room settings: ${d.name}`, [
      { key: 'name', label: 'Name', type: 'text', value: d.name },
      { key: 'theme', label: 'Setting', type: 'select', value: d.theme, options: this.themeOptions(), help: 'Backdrop and tile art' },
      { key: 'zone', label: 'Zone', type: 'select', value: d.zone, options: this.zoneOptions(), help: 'Music, map color and area banner' },
      { key: 'save', label: 'Save room', type: 'check', value: !!d.save, help: 'Plays the save-room music; red on the map' },
      { key: 'gateFlag', label: 'Gate flag', type: 'text', value: d.gateFlag || '', help: 'G tiles open once a lever sets this flag' },
      { key: 'drainFlag', label: 'Drain flag', type: 'text', value: d.drainFlag || '', help: 'Water drains once this flag is set' },
      { key: 'sealFlag', label: 'Seal flag', type: 'text', value: d.sealFlag || '', help: 'N tiles turn to snow once this flag is set' },
    ], 'Apply');
    if (!v) return;
    if (this.mode === 'map') this.mapUndo.push({ kind: 'edit', id: d.id, snap: snap(d) });
    else this.pushUndo();
    const theme = d.theme;
    d.name = v.name || d.name;
    d.theme = v.theme as Theme;
    d.zone = v.zone as Zone;
    for (const k of ['save', 'gateFlag', 'drainFlag', 'sealFlag'] as const) this.setMeta(d, k, v[k]);
    if (d === this.def) {
      if (this.mode === 'map') this.mapChanged = true;
      else if (theme !== d.theme) this.reloadRoom();
    }
    this.say('ROOM SETTINGS CHANGED');
  }

  /** Double-click an entity to set what it does: a sign's text, a lever's flag, an item, an enemy variant. */
  async editEntity(e: EntDef) {
    let field: Field | null = null;
    if (e.t === 'T') {
      const keys: [string, string][] = [...Object.keys(HINTS).map((k): [string, string] => [k, `${k} (signpost hint)`]), ...Object.keys(LORE).map((k): [string, string] => [k, `${k} (lore stone)`])];
      field = { key: 'arg', label: 'Text', type: 'select', value: e.arg || '', options: keys, help: 'Text lives in src/game/story.ts (HINTS and LORE)' };
    } else if (e.t === 'L') {
      field = { key: 'arg', label: 'Flag', type: 'text', value: e.arg || '', help: "Set when whipped. Put the same flag in a room's gate or drain flag (PROPS)" };
    } else if (e.t === 'i') {
      field = { key: 'arg', label: 'Item', type: 'select', value: e.arg || '', options: ITEM_IDS.map((id) => [id, ITEMS[id].name]) };
    } else {
      const base = Object.keys(ENEMY_LETTER).find((k) => ENEMY_LETTER[k] === e.t);
      if (!base) return;
      const opts: [string, string][] = Object.entries(ENEMY).filter(([, st]) => st.base === base).map(([id, st]) => [id === base ? '' : id, st.name]);
      if (opts.length < 2) return this.say('NO VARIANTS OF THIS ENEMY YET. MAKE ONE IN ENEMIES.HTML');
      field = { key: 'arg', label: 'Enemy', type: 'select', value: e.arg || '', options: opts, help: 'Variants come from the enemy editor (enemies.html)' };
    }
    const v = await this.ask('Entity settings', [field], 'Apply');
    if (!v) return;
    this.pushUndo();
    if (v.arg) e.arg = v.arg;
    else delete e.arg;
  }

  // ================================================================ world map

  get mz() {
    return MAP_ZOOMS[this.mapZoom];
  }
  get mzh() {
    return Math.round((this.mz * 7) / 12); // keeps a map cell's 24:14 shape
  }

  openMap() {
    this.mode = 'map';
    this.picker = false;
    this.drag = null;
    this.selected = this.def;
    this.centerMapOn(this.def);
  }

  centerMapOn(d: RoomDef) {
    this.mapX = Math.round((d.gx + d.w / 2) * this.mz - VW / 2);
    this.mapY = Math.round((d.gy + d.h / 2) * this.mzh - (VH + TOP_H - BOTTOM_H) / 2);
  }

  leaveMap() {
    this.mode = 'room';
    this.placing = null;
    this.drag = null;
    if (!this.g.defs.includes(this.def)) this.switchRoom(this.g.defs[0]);
    else if (this.mapChanged) this.reloadRoom();
    this.mapChanged = false;
  }

  /** The map cell under a screen point. */
  mapCell(sx: number, sy: number): [number, number] {
    return [Math.floor((sx + this.mapX) / this.mz), Math.floor((sy + this.mapY) / this.mzh)];
  }
  mapRect(r: Rect) {
    return { x: r.gx * this.mz - this.mapX, y: r.gy * this.mzh - this.mapY, w: r.w * this.mz, h: r.h * this.mzh };
  }
  mapRoomAt(sx: number, sy: number) {
    const [gx, gy] = this.mapCell(sx, sy);
    return this.g.roomAt(gx, gy) || null;
  }
  /** Would this rectangle overlap any room other than `except`? */
  overlaps(r: Rect, except: RoomDef | null) {
    return this.g.defs.some((d) => d !== except && r.gx < d.gx + d.w && d.gx < r.gx + r.w && r.gy < d.gy + d.h && d.gy < r.gy + r.h);
  }
  /** Which edges of the selected room the mouse is on (for resizing). */
  edgeAt(sx: number, sy: number) {
    const d = this.selected;
    if (!d) return null;
    const r = this.mapRect(d), m = 3;
    if (sx < r.x - m || sx > r.x + r.w + m || sy < r.y - m || sy > r.y + r.h + m) return null;
    const e = { l: Math.abs(sx - r.x) <= m, r: Math.abs(sx - (r.x + r.w)) <= m, t: Math.abs(sy - r.y) <= m, b: Math.abs(sy - (r.y + r.h)) <= m };
    return e.l || e.r || e.t || e.b ? e : null;
  }

  uniqueId(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'room';
    let id = slug;
    for (let i = 2; this.g.defs.some((d) => d.id === id) || this.base.has(id); i++) id = `${slug}_${i}`;
    return id;
  }

  async newRoom() {
    const v = await this.ask('New room', [
      { key: 'name', label: 'Name', type: 'text', value: 'New Room' },
      { key: 'theme', label: 'Setting', type: 'select', value: this.def.theme, options: this.themeOptions(), help: 'Backdrop and tile art' },
      { key: 'zone', label: 'Zone', type: 'select', value: this.def.zone, options: this.zoneOptions(), help: 'Music, map color and area banner' },
      { key: 'w', label: 'Width (cells)', type: 'number', value: 1, min: 1, max: 8, help: 'One cell = 24 x 14 tiles, one screen' },
      { key: 'h', label: 'Height (cells)', type: 'number', value: 1, min: 1, max: 8 },
    ], 'Create');
    if (!v) return;
    const w = Math.round(v.w), h = Math.round(v.h), name = v.name || 'New Room';
    this.placing = { id: this.uniqueId(name), name, zone: v.zone, theme: v.theme, gx: 0, gy: 0, w, h, tiles: emptyRoomTiles(w, h), ents: [] };
    if (this.mode !== 'map') this.openMap();
    this.selected = null;
    this.say('CLICK AN EMPTY SPOT ON THE MAP TO PLACE IT (RIGHT-CLICK: CANCEL)');
  }

  /** Where the room being placed would go: its top-left cell follows the mouse. */
  placingRect(): Rect {
    const p = this.placing!, [gx, gy] = this.mapCell(this.mouse.x, this.mouse.y);
    return { gx, gy, w: p.w, h: p.h };
  }

  dropPlacing() {
    const p = this.placing!, r = this.placingRect();
    if (this.overlaps(r, null)) return this.say("ROOMS CAN'T OVERLAP");
    p.gx = r.gx;
    p.gy = r.gy;
    this.g.defs.push(p);
    this.g.rebuildGrid();
    this.mapUndo.push({ kind: 'create', id: p.id });
    this.selected = p;
    this.placing = null;
    this.mapChanged = true;
    this.say('PLACED. DOUBLE-CLICK IT TO EDIT, THEN USE THE DOOR TOOL');
  }

  deleteRoom() {
    const d = this.selected;
    if (!d) return this.say('SELECT A ROOM FIRST');
    if (this.base.has(d.id)) return this.say('ONLY ROOMS MADE IN THE EDITOR CAN BE DELETED');
    if (this.deleteArm <= 0) {
      this.deleteArm = 150;
      return this.say(`CLICK DELETE AGAIN TO DELETE ${d.name.toUpperCase()}`);
    }
    this.deleteArm = 0;
    const defs = this.g.defs, i = defs.indexOf(d);
    this.mapUndo.push({ kind: 'delete', def: JSON.stringify(d), index: i });
    defs.splice(i, 1);
    this.g.rebuildGrid();
    this.selected = null;
    this.mapChanged = true;
    this.say('ROOM DELETED (CTRL+Z TO UNDO)');
  }

  doMapUndo() {
    const u = this.mapUndo.pop();
    if (!u) return this.say('NOTHING TO UNDO');
    const defs = this.g.defs;
    if (u.kind === 'create') {
      const i = defs.findIndex((d) => d.id === u.id);
      if (i >= 0) defs.splice(i, 1);
      if (this.selected?.id === u.id) this.selected = null;
    } else if (u.kind === 'delete') {
      const d = JSON.parse(u.def) as RoomDef;
      defs.splice(u.index, 0, d);
      this.selected = d;
    } else {
      const d = defs.find((x) => x.id === u.id);
      if (d) applySnap(d, u.snap);
    }
    this.g.rebuildGrid();
    this.mapChanged = true;
    this.say('UNDONE');
  }

  /** Finish a room move or resize: keep it if it fits, otherwise snap back. */
  commitMapDrag(d: Exclude<Drag, null>) {
    if (d.mode === 'mapMove') {
      const r = { gx: d.gx, gy: d.gy, w: d.def.w, h: d.def.h };
      if (sameRect(r, d.def)) return;
      if (this.overlaps(r, d.def)) return this.say("ROOMS CAN'T OVERLAP");
      this.mapUndo.push({ kind: 'edit', id: d.def.id, snap: snap(d.def) });
      d.def.gx = r.gx;
      d.def.gy = r.gy;
    } else if (d.mode === 'mapSize') {
      if (sameRect(d.rect, d.def)) return;
      if (this.overlaps(d.rect, d.def)) return this.say("ROOMS CAN'T OVERLAP");
      this.mapUndo.push({ kind: 'edit', id: d.def.id, snap: snap(d.def) });
      this.pushUndo(d.def); // so Ctrl+Z in that room's view can step back too
      resizeRoom(d.def, d.rect.gx, d.rect.gy, d.rect.w, d.rect.h, LOCKED + 'L');
      this.say(`RESIZED TO ${d.rect.w}X${d.rect.h} CELLS`);
    } else return;
    this.g.rebuildGrid();
    this.mapChanged = true;
  }

  // ================================================================ input

  private toScreen(e: { clientX: number; clientY: number }): [number, number] {
    const r = this.g.view.hud.getBoundingClientRect();
    return [((e.clientX - r.left) * VW) / r.width, ((e.clientY - r.top) * VH) / r.height];
  }
  private tileAt(sx: number, sy: number): [number, number] {
    const v = this.g.view;
    return [Math.floor((sx + v.camX) / TILE), Math.floor((sy + v.camY) / TILE)];
  }
  private inWorld(sy: number) {
    return sy >= TOP_H && sy < VH - BOTTOM_H;
  }

  onKey(e: KeyboardEvent) {
    const g = this.g;
    if (this.modal) return;
    if (e.code === 'F2') {
      e.preventDefault();
      if (this.active) this.play();
      else if (g.state === 'play' && !g.cutscene && g.player.alive && g.deathT === 0) this.enter();
      return;
    }
    if (!this.active) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.code === 'KeyZ') {
      e.preventDefault();
      this.doUndo();
    } else if (ctrl && e.code === 'KeyS') {
      e.preventDefault();
      this.save();
    } else if (e.code === 'Tab') {
      e.preventDefault();
      if (this.mode === 'map') this.leaveMap();
      this.picker = !this.picker;
    } else if (e.code === 'Escape') {
      if (this.placing) this.placing = null;
      else if (this.picker) this.picker = false;
      else if (this.mode === 'map') this.leaveMap();
    } else if (e.code === 'KeyM' && !ctrl) {
      if (this.mode === 'map') this.leaveMap();
      else this.openMap();
    } else if (e.code === 'KeyH' && !ctrl) this.help = !this.help;
    else if (this.mode === 'map') {
      if (e.code === 'Delete') this.deleteRoom();
    } else if (e.code === 'KeyG' && !ctrl) this.grid = !this.grid;
    else if (/^Digit[1-9]$/.test(e.code) && !ctrl) {
      const t = this.tools[this.cat][this.page[this.cat] * this.toolsPerPage(this.cat) + Number(e.code[5]) - 1];
      if (t) this.tool = t;
    }
  }

  onDown(e: PointerEvent) {
    if (!this.active || this.modal) return;
    e.preventDefault();
    this.help = false;
    const [sx, sy] = this.toScreen(e);
    if (this.picker) return this.clickPicker(sx, sy);
    if (e.button === 0) {
      const b = this.buttons().find((b) => sx >= b.x && sx < b.x + b.w && sy >= b.y && sy < b.y + b.h);
      if (b) return this.clickButton(b);
    }
    if (!this.inWorld(sy)) return;
    if (this.mode === 'map') return this.mapDown(e, sx, sy);
    // the margin outside the room: door arrows and grow strips
    const edge = e.button !== 1 && !this.g.input.keys.has('Space') ? this.edgeAction(sx, sy) : null;
    if (edge) {
      if ('door' in edge) return e.button === 0 && this.goThrough(edge.door);
      return this.growRoom(edge.side, e.button === 0 ? 1 : -1);
    }
    const t = this.tileAt(sx, sy);
    const v = this.g.view;
    if (e.button === 1 || (e.button === 0 && this.g.input.keys.has('Space'))) {
      // a middle click that doesn't move picks the tile under it; a middle drag pans
      this.drag = { mode: 'pan', sx, sy, cx: v.camX, cy: v.camY, moved: false, pick: e.button === 1 ? t : null };
    } else if (e.button === 0) {
      const hit = this.entAt(t[0], t[1]);
      this.pushUndo();
      if (hit) this.drag = { mode: 'move', ent: hit };
      else if (this.tool.kind === 'door') this.door(t[0], t[1], true);
      else if (this.tool.kind === 'tile') {
        this.setTile(t[0], t[1], this.tool.id);
        this.drag = { mode: 'paint', last: t };
      } else this.place(t[0], t[1]);
    } else if (e.button === 2) {
      this.pushUndo();
      if (this.tool.kind === 'door' && !this.entAt(t[0], t[1])) return this.door(t[0], t[1], false);
      this.eraseAt(t[0], t[1], true);
      this.drag = { mode: 'erase', last: t };
    }
  }

  mapDown(e: PointerEvent, sx: number, sy: number) {
    if (this.placing) {
      if (e.button === 0) this.dropPlacing();
      else if (e.button === 2) {
        this.placing = null;
        this.say('CANCELLED');
      }
      return;
    }
    const pan = () => (this.drag = { mode: 'pan', sx, sy, cx: this.mapX, cy: this.mapY, moved: false, pick: null });
    if (e.button === 1 || (e.button === 0 && this.g.input.keys.has('Space'))) return pan();
    if (e.button !== 0) return;
    const edge = this.edgeAt(sx, sy), sel = this.selected;
    if (edge && sel) {
      this.drag = { mode: 'mapSize', def: sel, ...edge, rect: { gx: sel.gx, gy: sel.gy, w: sel.w, h: sel.h } };
      return;
    }
    const d = this.mapRoomAt(sx, sy);
    this.selected = d;
    if (!d) return pan();
    const [gx, gy] = this.mapCell(sx, sy);
    this.drag = { mode: 'mapMove', def: d, ox: gx - d.gx, oy: gy - d.gy, gx: d.gx, gy: d.gy };
  }

  onMove(e: PointerEvent) {
    if (!this.active) return;
    const [sx, sy] = this.toScreen(e);
    this.mouse = { x: sx, y: sy };
    const d = this.drag;
    if (!d) return;
    const v = this.g.view, r = this.g.room;
    if (d.mode === 'pan') {
      if (Math.abs(sx - d.sx) + Math.abs(sy - d.sy) > 2) d.moved = true;
      if (!d.moved) return;
      if (this.mode === 'map') {
        this.mapX = d.cx - (sx - d.sx);
        this.mapY = d.cy - (sy - d.sy);
      } else {
        v.camX = d.cx - (sx - d.sx);
        v.camY = d.cy - (sy - d.sy);
        this.clampCamera();
      }
      return;
    }
    if (d.mode === 'mapMove') {
      const [gx, gy] = this.mapCell(sx, sy);
      d.gx = gx - d.ox;
      d.gy = gy - d.oy;
      return;
    }
    if (d.mode === 'mapSize') {
      // dragged edges follow the mouse's nearest cell line; rooms stay at least 1x1 cells
      const def = d.def, lx = Math.round((sx + this.mapX) / this.mz), ly = Math.round((sy + this.mapY) / this.mzh);
      let x0 = def.gx, x1 = def.gx + def.w, y0 = def.gy, y1 = def.gy + def.h;
      if (d.l) x0 = Math.min(lx, x1 - 1);
      if (d.r) x1 = Math.max(lx, x0 + 1);
      if (d.t) y0 = Math.min(ly, y1 - 1);
      if (d.b) y1 = Math.max(ly, y0 + 1);
      d.rect = { gx: x0, gy: y0, w: Math.min(8, x1 - x0), h: Math.min(8, y1 - y0) };
      return;
    }
    const t = this.tileAt(sx, sy);
    if (d.mode === 'paint') {
      this.line(d.last, t, (x, y) => this.setTile(x, y, this.tool.id));
      d.last = t;
    } else if (d.mode === 'erase') {
      this.line(d.last, t, (x, y) => this.eraseAt(x, y, false));
      d.last = t;
    } else if (d.mode === 'move') {
      const tx = clamp(t[0], 0, r.cols - 1), ty = clamp(t[1], 0, r.rows - 1);
      if (d.ent === 'start') this.start = { x: tx * TILE + 8, bottom: (ty + 1) * TILE };
      else {
        d.ent.x = tx;
        d.ent.y = ty;
      }
    }
  }

  onUp(e: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    if (!d || !this.active) return;
    if (d.mode === 'pan' && d.pick && !d.moved && e.button === 1) this.pickAt(d.pick[0], d.pick[1]);
    else if (d.mode === 'mapMove' || d.mode === 'mapSize') this.commitMapDrag(d);
  }

  onDouble(e: MouseEvent) {
    if (!this.active || this.modal || this.picker || e.button !== 0) return;
    const [sx, sy] = this.toScreen(e);
    if (!this.inWorld(sy)) return;
    if (this.mode === 'map') {
      const d = this.mapRoomAt(sx, sy);
      if (d && !this.placing) {
        this.leaveMap();
        if (d !== this.def) this.switchRoom(d);
      }
      return;
    }
    const [tx, ty] = this.tileAt(sx, sy);
    const ent = this.entAt(tx, ty);
    if (ent && ent !== 'start') this.editEntity(ent);
  }

  onWheel(e: WheelEvent) {
    if (!this.active || this.modal) return;
    e.preventDefault();
    if (this.mode === 'map') {
      // zoom around the mouse
      const [sx, sy] = [this.mouse.x, this.mouse.y];
      const fx = (sx + this.mapX) / this.mz, fy = (sy + this.mapY) / this.mzh;
      this.mapZoom = clamp(this.mapZoom + (e.deltaY < 0 ? 1 : -1), 0, MAP_ZOOMS.length - 1);
      this.mapX = Math.round(fx * this.mz - sx);
      this.mapY = Math.round(fy * this.mzh - sy);
      return;
    }
    const v = this.g.view;
    if (e.shiftKey) v.camX += e.deltaY * 0.5;
    else {
      v.camX += e.deltaX * 0.5;
      v.camY += e.deltaY * 0.5;
    }
    this.clampCamera();
  }

  // ================================================================ buttons

  toolsPerPage(cat: Cat) {
    const all = Math.floor((VW - 8) / 18);
    return this.tools[cat].length <= all ? all : Math.floor((VW - 8 - 28) / 18);
  }

  /** Top bar actions, category tabs and the tool palette, laid out once for both drawing and clicking. */
  buttons(): Button[] {
    const out: Button[] = [];
    const acts: [string, string][] = this.mode === 'map'
      ? [
        ['back', 'EDIT ROOM'],
        ['save', 'SAVE'],
        ['undo', 'UNDO'],
        ['delete', this.deleteArm > 0 ? 'SURE?' : 'DELETE'],
        ['props', 'PROPS'],
        ['new', 'NEW ROOM'],
      ]
      : [
        ['play', 'PLAY'],
        ['reset', this.resetArm > 0 ? 'SURE?' : 'RESET'],
        ['save', 'SAVE'],
        ['undo', 'UNDO'],
        ['props', 'PROPS'],
        ['map', 'MAP'],
        ['rooms', 'ROOMS'],
      ];
    let x = VW - 2;
    for (const [id, label] of acts) {
      const w = textWidth(label) + 8;
      x -= w;
      out.push({ id, label, x, y: 1, w, h: 12 });
      x -= 3;
    }
    if (this.mode === 'map') return out;
    // category tabs
    let tx = 4;
    for (const [cat, label] of CATS) {
      const w = textWidth(label) + 8;
      out.push({ id: 'cat', label, x: tx, y: VH - BOTTOM_H + 12, w, h: 10, cat });
      tx += w + 2;
    }
    // this tab's tools, a page at a time
    const tools = this.tools[this.cat], per = this.toolsPerPage(this.cat);
    const pages = Math.ceil(tools.length / per), page = Math.min(this.page[this.cat], pages - 1);
    const shown = tools.slice(page * per, page * per + per);
    const y = VH - 19;
    tx = pages > 1 ? 18 : 4;
    if (pages > 1) {
      out.push({ id: 'prev', label: 'PREVIOUS PAGE', x: 2, y, w: 12, h: 17 });
      out.push({ id: 'next', label: 'NEXT PAGE', x: VW - 14, y, w: 12, h: 17 });
    }
    for (const tool of shown) {
      out.push({ id: 'tool', label: tool.label, x: tx, y, w: 17, h: 17, tool });
      tx += 18;
    }
    return out;
  }

  clickButton(b: Button) {
    if (b.tool) {
      this.tool = b.tool;
      return;
    }
    if (b.cat) {
      this.cat = b.cat;
      return;
    }
    const pages = Math.ceil(this.tools[this.cat].length / this.toolsPerPage(this.cat));
    if (b.id === 'prev') this.page[this.cat] = (this.page[this.cat] + pages - 1) % pages;
    else if (b.id === 'next') this.page[this.cat] = (this.page[this.cat] + 1) % pages;
    else if (b.id === 'play') this.play();
    else if (b.id === 'reset') this.resetRoom();
    else if (b.id === 'save') this.save();
    else if (b.id === 'undo') this.doUndo();
    else if (b.id === 'rooms') this.picker = true;
    else if (b.id === 'map') this.openMap();
    else if (b.id === 'back') this.leaveMap();
    else if (b.id === 'new') this.newRoom();
    else if (b.id === 'delete') this.deleteRoom();
    else if (b.id === 'props') {
      const d = this.mode === 'map' ? this.selected : this.def;
      if (d) this.editProps(d);
      else this.say('SELECT A ROOM FIRST');
    }
  }

  pickerRows() {
    // enough columns that every room fits on screen
    const defs = this.g.defs, cols = Math.max(2, Math.ceil(defs.length / 13));
    const per = Math.ceil(defs.length / cols), w = (VW - 88 - (cols - 2) * 4) / cols;
    return defs.map((d, i) => ({ d, x: 42 + Math.floor(i / per) * (w + 4), y: 34 + (i % per) * 12, w, h: 11, per }));
  }
  clickPicker(sx: number, sy: number) {
    const row = this.pickerRows().find((r) => sx >= r.x && sx < r.x + r.w && sy >= r.y - 2 && sy < r.y - 2 + r.h);
    if (row) this.switchRoom(row.d);
    else this.picker = false;
  }

  // ================================================================ drawing (HUD canvas)

  draw(c: CanvasRenderingContext2D) {
    if (this.mode === 'map') this.drawMap(c);
    else this.drawRoom(c);
    if (this.picker) this.drawPicker(c);
    else if (this.help) this.drawHelp(c);
    if (this.status.t > 0) {
      const w = textWidth(this.status.text) + 12;
      c.fillStyle = 'rgba(10,6,18,0.9)';
      c.fillRect(VW / 2 - w / 2, TOP_H + 4, w, 13);
      drawText(c, this.status.text, VW / 2, TOP_H + 7, GOLD, '#000', 'center');
    }
  }

  drawRoom(c: CanvasRenderingContext2D) {
    const g = this.g, r = g.room, def = r.def;
    const cx = Math.round(g.view.camX), cy = Math.round(g.view.camY);
    const tx0 = Math.max(0, Math.floor(cx / TILE)), tx1 = Math.min(r.cols - 1, Math.floor((cx + VW) / TILE));
    const ty0 = Math.max(0, Math.floor(cy / TILE)), ty1 = Math.min(r.rows - 1, Math.floor((cy + VH) / TILE));
    // outside the room
    c.fillStyle = 'rgba(0,0,0,0.65)';
    if (cx < 0) c.fillRect(0, 0, -cx, VH);
    if (cy < 0) c.fillRect(0, 0, VW, -cy);
    if (cx + VW > r.W) c.fillRect(r.W - cx, 0, cx + VW - r.W, VH);
    if (cy + VH > r.H) c.fillRect(0, r.H - cy, VW, cy + VH - r.H);
    // water is invisible in the tile layer, so tint it here
    c.fillStyle = 'rgba(60,150,220,0.35)';
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (r.tiles[ty][tx] === '~') c.fillRect(tx * TILE - cx, ty * TILE - cy, TILE, TILE);
    // tile grid, with map-cell borders in gold
    if (this.grid) {
      for (let tx = tx0; tx <= tx1 + 1; tx++) {
        c.fillStyle = tx % SC === 0 ? 'rgba(216,176,96,0.5)' : 'rgba(255,255,255,0.07)';
        c.fillRect(tx * TILE - cx, Math.max(0, -cy), 1, Math.min(VH, r.H - cy));
      }
      for (let ty = ty0; ty <= ty1 + 1; ty++) {
        c.fillStyle = ty % SR === 0 ? 'rgba(216,176,96,0.5)' : 'rgba(255,255,255,0.07)';
        c.fillRect(Math.max(0, -cx), ty * TILE - cy, Math.min(VW, r.W - cx), 1);
      }
    }
    this.drawGrowStrips(c, cx, cy);
    this.drawDoorHints(c, cx, cy);
    // entities, then the ghost hero where test play starts
    for (const e of def.ents) this.drawMarker(c, e, cx, cy, 1);
    this.drawMarker(c, { x: Math.floor(this.start.x / TILE), y: Math.floor((this.start.bottom - 1) / TILE), t: 'P' }, cx, cy, 0.45, true);
    // hover
    const [hx, hy] = this.tileAt(this.mouse.x, this.mouse.y);
    if (!this.picker && this.inWorld(this.mouse.y) && hx >= 0 && hy >= 0 && hx < r.cols && hy < r.rows) {
      const over = this.entAt(hx, hy);
      this.outline(c, hx * TILE - cx, hy * TILE - cy, 16, 16, over ? '#60e0ff' : '#ffffff');
    }
    this.drawBars(c, hx, hy);
  }

  /**
   * Where this room touches a neighbor, mark the doorway spot on the edge:
   * green = open on both sides, red = open on one side only, dim = both walled.
   */
  drawDoorHints(c: CanvasRenderingContext2D, cx: number, cy: number) {
    const hover = this.edgeAction(this.mouse.x, this.mouse.y);
    for (const w of this.doorways()) {
      const { hint: h, arrow: a } = w;
      c.fillStyle = w.here && w.there ? 'rgba(80,230,120,0.85)' : w.here || w.there ? 'rgba(255,70,70,0.9)' : 'rgba(216,176,96,0.35)';
      c.fillRect(h.x - cx, h.y - cy, h.w, h.h);
      if (!(w.here && w.there)) continue;
      // a finished doorway: an arrow in the margin that jumps to the next room
      const on = !!hover && 'door' in hover && hover.door.hint === h;
      c.fillStyle = on ? GOLD : '#6a4a2a';
      c.fillRect(a.x - cx, a.y - cy, a.w, a.h);
      const glyph = { L: '<', R: '>', T: '^', B: 'v' }[w.side];
      drawText(c, glyph, a.x - cx + Math.floor(a.w / 2) - 2, a.y - cy + Math.floor(a.h / 2) - 3, on ? '#000' : PALE, null);
    }
  }

  /** The grow strips just outside each edge: faint '+' marks, lit up under the mouse. */
  drawGrowStrips(c: CanvasRenderingContext2D, cx: number, cy: number) {
    const d = this.def, W = d.w * SC * TILE, H = d.h * SR * TILE;
    const hover = this.edgeAction(this.mouse.x, this.mouse.y);
    const strips: [Side, PxRect][] = [
      ['L', { x: -STRIP, y: 0, w: STRIP, h: H }],
      ['R', { x: W, y: 0, w: STRIP, h: H }],
      ['T', { x: 0, y: -STRIP, w: W, h: STRIP }],
      ['B', { x: 0, y: H, w: W, h: STRIP }],
    ];
    for (const [side, r] of strips) {
      const on = !!hover && 'side' in hover && hover.side === side;
      const armed = this.shrinkArm.side === side && this.shrinkArm.t > 0;
      if (on || armed) {
        c.fillStyle = armed ? 'rgba(255,70,70,0.25)' : 'rgba(216,176,96,0.18)';
        c.fillRect(r.x - cx, r.y - cy, r.w, r.h);
      }
      // one '+' per map cell along the edge, kept clear of the doorway spots (and their arrows)
      const vertical = side === 'L' || side === 'R', n = vertical ? d.h : d.w;
      for (let i = 0; i < n; i++) {
        const px = vertical ? r.x + 5 : (i + 0.25) * SC * TILE - 2, py = vertical ? (i + 0.3) * SR * TILE - 3 : r.y + 4;
        drawText(c, '+', px - cx, py - cy, on ? GOLD : 'rgba(216,176,96,0.45)', null);
      }
    }
  }

  drawMarker(c: CanvasRenderingContext2D, e: EntDef, cx: number, cy: number, alpha: number, ghost = false) {
    const m = MARKERS[e.t];
    const x = e.x * TILE + 8, bottom = (e.y + 1) * TILE;
    if (m) {
      // enemy variants show in their own colors
      const sheet = e.arg && ENEMY[e.arg] && 'zbkswdl'.includes(e.t) ? this.g.enemySheet(e.arg) : this.g.sheets[m.sheet];
      const anim = e.t === 'i' ? ITEMS[e.arg || '']?.icon || 'potion' : m.anim;
      const idx = sheet.anims[anim]?.[0] ?? 0;
      const img = sheet.tex.image as HTMLCanvasElement;
      c.globalAlpha = alpha;
      c.drawImage(img, (idx % sheet.cols) * sheet.cw, Math.floor(idx / sheet.cols) * sheet.ch, sheet.cw, sheet.ch,
        Math.round(x - sheet.ax - cx), Math.round(bottom - m.dy - sheet.ay - cy), sheet.cw, sheet.ch);
      c.globalAlpha = 1;
    }
    // the grab tile, colored by role: hostile red, locked cyan, everything else gold
    const col = ghost ? '#ffffff' : LOCKED.includes(e.t) || e.t === 'L' ? '#60e0ff' : 'zbkswdl'.includes(e.t) ? '#ff5060' : GOLD;
    this.outline(c, e.x * TILE - cx + 1, e.y * TILE - cy + 1, 14, 14, col, 0.7);
    drawText(c, ghost ? 'START' : e.t + (e.arg && 'zbkswdl'.includes(e.t) ? '*' : ''), e.x * TILE - cx + (ghost ? -6 : 2), e.y * TILE - cy + 2, col, '#000');
  }

  outline(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string, a = 1) {
    c.globalAlpha = a;
    c.fillStyle = col;
    c.fillRect(x, y, w, 1);
    c.fillRect(x, y + h - 1, w, 1);
    c.fillRect(x, y, 1, h);
    c.fillRect(x + w - 1, y, 1, h);
    c.globalAlpha = 1;
  }

  /** Bar backgrounds, title and top-bar buttons (shared by both modes). Returns the hovered button. */
  drawFrame(c: CanvasRenderingContext2D, title: string, dirty: boolean) {
    c.fillStyle = 'rgba(10,6,18,0.88)';
    c.fillRect(0, 0, VW, TOP_H);
    c.fillRect(0, VH - BOTTOM_H, VW, BOTTOM_H);
    c.fillStyle = '#6a4a2a';
    c.fillRect(0, TOP_H, VW, 1);
    c.fillRect(0, VH - BOTTOM_H - 1, VW, 1);
    drawText(c, `${title}${dirty ? ' *' : ''}`, 4, 4, dirty ? '#ffb080' : GOLD);
    const btns = this.buttons();
    const hover = btns.find((b) => this.mouse.x >= b.x && this.mouse.x < b.x + b.w && this.mouse.y >= b.y && this.mouse.y < b.y + b.h);
    for (const b of btns) {
      const on = b.tool ? sameTool(b.tool, this.tool) : b.cat === this.cat;
      c.fillStyle = on ? '#6a2030' : b === hover ? '#3a2030' : '#1e1424';
      c.fillRect(b.x, b.y, b.w, b.h);
      if (b.tool) {
        this.drawToolIcon(c, b.tool, b.x + 1, b.y + 1);
        if (on) this.outline(c, b.x - 1, b.y - 1, b.w + 2, b.h + 2, GOLD);
      } else if (b.id === 'prev' || b.id === 'next') drawText(c, b.id === 'prev' ? '<' : '>', b.x + 4, b.y + 5, b === hover ? PALE : DIM, null);
      else drawText(c, b.label, b.x + 4, b.y + (b.cat ? 2 : 3), on || b === hover ? PALE : DIM, null);
    }
    return hover;
  }

  drawBars(c: CanvasRenderingContext2D, hx: number, hy: number) {
    const def = this.def;
    const hover = this.drawFrame(c, def.name, snap(def) !== this.saved.get(def.id));
    // info line: what the tool / button under the mouse does, and the hovered tile
    const edge = hover ? null : this.edgeAction(this.mouse.x, this.mouse.y);
    let info = hover && hover.id !== 'cat' ? hover.label : this.tool.label;
    if (edge && 'door' in edge) info = `CLICK: GO TO ${edge.door.n.name.toUpperCase()}`;
    else if (edge) info = `CLICK: ADD A CELL ${SIDE_NAME[edge.side]}  RIGHT-CLICK: REMOVE ONE`;
    drawText(c, info, 6, VH - BOTTOM_H + 3, PALE);
    if (this.inWorld(this.mouse.y)) drawText(c, `X${hx} Y${hy}`, VW - 6, VH - BOTTOM_H + 3, DIM, '#000', 'right');
  }

  drawToolIcon(c: CanvasRenderingContext2D, tool: Tool, x: number, y: number) {
    if (tool.kind === 'door') {
      // an arched doorway
      c.fillStyle = '#6a5a70';
      c.fillRect(x + 1, y + 1, 13, 14);
      c.fillStyle = '#0a0610';
      c.fillRect(x + 4, y + 6, 7, 9);
      c.fillRect(x + 5, y + 4, 5, 2);
      c.fillStyle = GOLD;
      c.fillRect(x + 9, y + 10, 1, 1);
      return;
    }
    if (tool.kind === 'tile') {
      if (tool.id === '.') {
        c.fillStyle = '#c03040';
        for (let i = 2; i < 13; i++) {
          c.fillRect(x + i, y + i, 2, 1);
          c.fillRect(x + 14 - i, y + i, 2, 1);
        }
      } else if (tool.id === '~') {
        c.fillStyle = '#3c78b0';
        c.fillRect(x + 1, y + 4, 14, 11);
        c.fillStyle = '#a0d8f0';
        c.fillRect(x + 1, y + 4, 14, 1);
      } else c.drawImage(this.tilePreview(tool.id), x, y);
      return;
    }
    const m = MARKERS[tool.id];
    const sheet = tool.arg && ENEMY[tool.arg] ? this.g.enemySheet(tool.arg) : this.g.sheets[m.sheet];
    const anim = tool.id === 'i' ? ITEMS[tool.arg || 'potion'].icon : m.anim;
    this.fitFrame(c, sheet, sheet.anims[anim][0], x, y, 15);
  }

  /** The room's own tile art for one tile type, so the palette matches the theme. */
  tilePreview(ch: string) {
    const key = `${this.def.theme}:${ch}`;
    let cv = this.previews.get(key);
    if (!cv) {
      cv = paintTiles([[ch]], this.def.theme).toCanvas();
      this.previews.set(key, cv);
    }
    return cv;
  }

  /** Draw a frame's visible pixels shrunk (or grown by whole pixels) to fit a square. */
  fitFrame(c: CanvasRenderingContext2D, sheet: Sheet, idx: number, x: number, y: number, size: number) {
    const img = sheet.tex.image as HTMLCanvasElement;
    const [bx, by, bw, bh] = this.opaqueBounds(sheet, idx);
    let s = Math.min(size / bw, size / bh);
    if (s > 1) s = Math.floor(s);
    const w = Math.max(1, Math.round(bw * s)), h = Math.max(1, Math.round(bh * s));
    c.drawImage(img, bx, by, bw, bh, x + Math.floor((size - w) / 2), y + Math.floor((size - h) / 2), w, h);
  }

  /** Tight box around a frame's non-transparent pixels (cached). */
  opaqueBounds(sheet: Sheet, idx: number): [number, number, number, number] {
    const key = `${sheet.tex.uuid}:${idx}`;
    let b = this.bounds.get(key);
    if (b) return b;
    const img = sheet.tex.image as HTMLCanvasElement;
    const fx = (idx % sheet.cols) * sheet.cw, fy = Math.floor(idx / sheet.cols) * sheet.ch;
    const data = img.getContext('2d')!.getImageData(fx, fy, sheet.cw, sheet.ch).data;
    let x0 = sheet.cw, y0 = sheet.ch, x1 = -1, y1 = -1;
    for (let y = 0; y < sheet.ch; y++)
      for (let x = 0; x < sheet.cw; x++)
        if (data[(y * sheet.cw + x) * 4 + 3] > 0) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    b = x1 < 0 ? [fx, fy, sheet.cw, sheet.ch] : [fx + x0, fy + y0, x1 - x0 + 1, y1 - y0 + 1];
    this.bounds.set(key, b);
    return b;
  }

  // ---------------------------------------------------------------- world map drawing

  /** One pixel per tile: walls light, ledges mid, spikes red, water blue, gates orange. */
  thumb(d: RoomDef) {
    const key = d.tiles.join('');
    const hit = this.thumbs.get(d);
    if (hit && hit.key === key) return hit.cv;
    const cv = document.createElement('canvas');
    cv.width = d.w * SC;
    cv.height = d.h * SR;
    const ctx = cv.getContext('2d')!;
    const col: Record<string, string> = { '#': '#c8bca8', B: '#a08a70', H: '#8a6a40', K: '#6a4a30', D: '#5a3420', '/': '#a89c88', '\\': '#a89c88', '=': '#706050', '^': '#e04040', '~': '#3c78b0', G: '#e09030', N: '#d0e8f0' };
    d.tiles.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!col[ch]) return;
      ctx.fillStyle = col[ch];
      ctx.fillRect(x, y, 1, 1);
    }));
    this.thumbs.set(d, { key, cv });
    return cv;
  }

  drawRoomBox(c: CanvasRenderingContext2D, d: RoomDef, r: Rect, border: string, alpha = 1) {
    const s = this.mapRect(r);
    c.globalAlpha = alpha;
    c.fillStyle = d.save ? '#5a1a2a' : ZONE_COL[d.zone] || '#3a3a3a';
    c.fillRect(s.x, s.y, s.w, s.h);
    // smoothing keeps 1-tile walls visible when the thumbnail shrinks
    c.imageSmoothingEnabled = true;
    c.drawImage(this.thumb(d), s.x, s.y, s.w, s.h);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    this.outline(c, s.x, s.y, s.w, s.h, border);
    if (textWidth(d.name) + 6 <= s.w && s.h >= 11) {
      c.fillStyle = 'rgba(10,6,18,0.7)';
      c.fillRect(s.x + 1, s.y + 1, textWidth(d.name) + 4, 9);
      drawText(c, d.name, s.x + 3, s.y + 2, PALE, null);
    }
  }

  drawMap(c: CanvasRenderingContext2D) {
    const g = this.g, mz = this.mz, mzh = this.mzh;
    c.fillStyle = '#0a0610';
    c.fillRect(0, 0, VW, VH);
    // cell grid
    c.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = -((this.mapX % mz) + mz) % mz; x < VW; x += mz) c.fillRect(x, 0, 1, VH);
    for (let y = -((this.mapY % mzh) + mzh) % mzh; y < VH; y += mzh) c.fillRect(0, y, VW, 1);
    const d = this.drag;
    for (const r of g.defs) {
      const moving = d && (d.mode === 'mapMove' || d.mode === 'mapSize') && d.def === r;
      this.drawRoomBox(c, r, r, r === this.selected ? '#ffffff' : r === this.def ? GOLD : '#6a4a2a', moving ? 0.35 : 1);
    }
    // the room being moved, resized or placed, green if it fits and red if not
    let ghost: { def: RoomDef; rect: Rect } | null = null;
    if (d?.mode === 'mapMove') ghost = { def: d.def, rect: { gx: d.gx, gy: d.gy, w: d.def.w, h: d.def.h } };
    else if (d?.mode === 'mapSize') ghost = { def: d.def, rect: d.rect };
    else if (this.placing && this.inWorld(this.mouse.y)) ghost = { def: this.placing, rect: this.placingRect() };
    if (ghost) {
      const ok = !this.overlaps(ghost.rect, ghost.def === this.placing ? null : ghost.def);
      const s = this.mapRect(ghost.rect);
      c.fillStyle = ok ? 'rgba(80,230,120,0.25)' : 'rgba(255,70,70,0.3)';
      c.fillRect(s.x, s.y, s.w, s.h);
      this.outline(c, s.x, s.y, s.w, s.h, ok ? '#60f080' : '#ff5050');
    }
    // resize handles on the selected room
    const sel = this.selected;
    if (sel && !d && !this.placing) {
      const e = this.edgeAt(this.mouse.x, this.mouse.y), s = this.mapRect(sel);
      c.fillStyle = GOLD;
      if (e?.l) c.fillRect(s.x - 1, s.y, 3, s.h);
      if (e?.r) c.fillRect(s.x + s.w - 2, s.y, 3, s.h);
      if (e?.t) c.fillRect(s.x, s.y - 1, s.w, 3);
      if (e?.b) c.fillRect(s.x, s.y + s.h - 2, s.w, 3);
    }
    // bars
    const hover = this.drawFrame(c, 'WORLD MAP', this.worldDirty());
    const [gx, gy] = this.mapCell(this.mouse.x, this.mouse.y);
    const y0 = VH - BOTTOM_H + 3;
    if (hover) drawText(c, hover.label, 6, y0, PALE);
    else if (this.placing) drawText(c, `PLACING ${this.placing.name} (${this.placing.w}X${this.placing.h} CELLS)`, 6, y0, PALE);
    else if (ghost) drawText(c, `${ghost.def.name}  CELL ${ghost.rect.gx},${ghost.rect.gy}  SIZE ${ghost.rect.w}X${ghost.rect.h}`, 6, y0, PALE);
    else if (sel) drawText(c, `${sel.name} (${sel.id})  CELL ${sel.gx},${sel.gy}  SIZE ${sel.w}X${sel.h}${this.base.has(sel.id) ? '' : '  NEW'}`, 6, y0, PALE);
    else drawText(c, 'CLICK A ROOM TO SELECT IT', 6, y0, DIM);
    if (this.inWorld(this.mouse.y)) drawText(c, `CELL ${gx},${gy}`, VW - 6, y0, DIM, '#000', 'right');
    drawText(c, 'DRAG: MOVE   DRAG AN EDGE: RESIZE   DOUBLE-CLICK: EDIT', 6, y0 + 13, DIM);
    drawText(c, 'WHEEL: ZOOM   MIDDLE DRAG / WASD: PAN   M / ESC: BACK', 6, y0 + 25, DIM);
  }

  drawPicker(c: CanvasRenderingContext2D) {
    const rows = this.pickerRows();
    const top = rows[0].y - 18, h = rows[0].per * 12 + 26;
    c.fillStyle = 'rgba(10,6,18,0.95)';
    c.fillRect(40, top, VW - 80, h);
    this.outline(c, 40, top, VW - 80, h, GOLD);
    drawText(c, 'CHOOSE A ROOM TO EDIT', VW / 2, top + 5, GOLD, '#000', 'center');
    for (const r of rows) {
      const hover = this.mouse.x >= r.x && this.mouse.x < r.x + r.w && this.mouse.y >= r.y - 2 && this.mouse.y < r.y - 2 + r.h;
      const cur = r.d === this.def;
      if (hover || cur) {
        c.fillStyle = hover ? '#4a1828' : '#2a1020';
        c.fillRect(r.x, r.y - 2, r.w, r.h);
      }
      const edited = snap(r.d) !== this.base.get(r.d.id);
      const name = r.d.name.slice(0, Math.floor((r.w - 30) / 6)) + (edited ? ' *' : '');
      drawText(c, name, r.x + 4, r.y, hover ? PALE : edited ? '#ffb080' : DIM, null);
      drawText(c, `${r.d.w}X${r.d.h}`, r.x + r.w - 4, r.y, DIM, null, 'right');
    }
  }

  drawHelp(c: CanvasRenderingContext2D) {
    const lines = this.mode === 'map'
      ? [
        'WORLD MAP',
        'CLICK, DRAG      SELECT, MOVE A ROOM',
        'DRAG AN EDGE     RESIZE THE SELECTED ROOM',
        'DOUBLE-CLICK     EDIT THAT ROOM',
        'NEW ROOM         CREATE, THEN CLICK TO PLACE',
        'WHEEL            ZOOM (MIDDLE DRAG PANS)',
        'DELETE           DELETE A ROOM MADE HERE',
        'M  ESC           BACK TO THE ROOM',
      ]
      : [
        'MAP EDITOR',
        'LEFT CLICK      PAINT TILE / PLACE / DRAG',
        'RIGHT CLICK     ERASE',
        'MIDDLE CLICK    PICK THE TILE UNDER THE MOUSE',
        'DOUBLE-CLICK    SET A SIGN, LEVER OR ENEMY',
        'ROOM EDGES      +: GROW   ARROW: NEXT ROOM',
        'WASD, WHEEL     SCROLL  (MIDDLE DRAG PANS)',
        '1-9             PICK A TOOL IN THIS TAB',
        'CTRL+Z  CTRL+S  UNDO, SAVE TO THE PROJECT',
        'TAB  M  G  H    ROOMS, WORLD MAP, GRID, HELP',
        'F2              PLAY FROM THE GHOST HERO',
        '* MARKS UNSAVED CHANGES',
      ];
    const w = 280, h = lines.length * 11 + 10, x = VW / 2 - w / 2, y = 30;
    c.fillStyle = 'rgba(10,6,18,0.92)';
    c.fillRect(x, y, w, h);
    this.outline(c, x, y, w, h, GOLD);
    lines.forEach((l, i) => drawText(c, l, x + 8, y + 6 + i * 11, i === 0 ? GOLD : PALE));
  }
}
