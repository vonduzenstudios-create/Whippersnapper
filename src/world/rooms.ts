// Room layouts for the demo level. Every room is a whole number of map cells
// (24 x 14 tiles). Doors sit on tile rows 8-11 of a cell; shafts use columns 10-13.
//
// The layouts below are the originals, built in code. The map editor (F2 in game,
// or editor.html) saves changes to room_edits.json, and buildRooms() applies those
// on top. Delete a room's entry from that file to get the code version back.
import { SCREEN_COLS as SC, SCREEN_ROWS as SR } from '../config';
import ROOM_EDITS from './room_edits.json';
import ABBEY_EDITS from './room_edits_abbey.json';
import { buildExpansionRooms } from './rooms_expansion';
import { buildLibraryRooms } from './rooms_library';
import { buildDepthRooms } from './rooms_depths';
import { buildAbbeyRooms } from './rooms_abbey';
import { RB } from './rb';
export { RB };

/**
 * The game has two separate maps. 'ash' is the original game (Vael Keep). 'abbey' is
 * NEW GAME +: the Drowned Abbey, a new story on its own map (rooms_abbey.ts), with its own
 * save slot and its own editor file (room_edits_abbey.json).
 */
export type World = 'ash' | 'abbey';
export const WORLDS: World[] = ['ash', 'abbey'];

export const THEMES = [
  'outdoor', 'courtyard', 'hall', 'stair', 'catacomb', 'flooded', 'shrine', 'chasm', 'lair', 'snow', 'ice',
  'garden', 'rooftop', 'belfry', 'aqueduct', 'library',
  'graveyard', 'deeps', 'temple', 'gaol', 'forge', 'crystal',
  'docks', 'cloister', 'seacave', // NEW GAME + (the Drowned Abbey)
] as const;
export const ZONES = ['pass', 'castle', 'catacombs', 'lair', 'undervault', 'kennels', 'belfry', 'aqueduct', 'library',
  'lichyard', 'deeps', 'temple', 'gaol', 'forge', 'vault', 'heights', 'archive', 'lab',
  // NEW GAME + (the Drowned Abbey)
  'strand', 'causeway', 'cloister', 'undercroft', 'scriptorium', 'belltower', 'gardens', 'seacaves', 'penance', 'saltworks', 'glasschoir'] as const;
/** Theme: the backdrop and tile art. */
export type Theme = (typeof THEMES)[number];
/** Zone: the music, map color and area banner. */
export type Zone = (typeof ZONES)[number];

/** Per zone: the banner shown on entering, the auto-map color, and the song ('' = silence). */
export const ZONE_INFO: Record<Zone, { name: string; color: string; music: string }> = {
  pass: { name: 'Hollowcrown Pass', color: '#4a6a8a', music: 'pass' },
  castle: { name: 'Castle Entrance', color: '#3a4a8a', music: 'castle' },
  catacombs: { name: 'The Catacombs', color: '#5a4a2a', music: 'catacombs' },
  lair: { name: 'Ossuary Lair', color: '#7a1a1a', music: '' },
  undervault: { name: 'The Undervault', color: '#4a3a6a', music: 'undervault' },
  kennels: { name: 'Kennel Yards', color: '#3a5a2a', music: 'kennels' },
  belfry: { name: 'The Belfry', color: '#6a4a2a', music: 'belfry' },
  aqueduct: { name: 'Rimeworks Aqueduct', color: '#2a5a6a', music: 'aqueduct' },
  library: { name: 'The Ashen Library', color: '#6a3a5a', music: 'library' },
  lichyard: { name: 'The Lichyard', color: '#4a5a4a', music: 'lichyard' },
  deeps: { name: 'The Drowned Deeps', color: '#1a4a5a', music: 'deeps' },
  temple: { name: 'The Serpent Temple', color: '#5a6a2a', music: 'temple' },
  gaol: { name: "The Warden's Gaol", color: '#5a4a4a', music: 'gaol' },
  forge: { name: 'The Cinderworks', color: '#8a3a1a', music: 'forge' },
  vault: { name: 'The Mirror Vault', color: '#6a4a9a', music: 'vault' },
  heights: { name: 'Rimecrown Heights', color: '#7a9aba', music: 'heights' },
  archive: { name: "The Archivist's Wing", color: '#7a3a4a', music: 'library' },
  lab: { name: 'Test Chamber', color: '#5a5a5a', music: 'undervault' }, // the #lab debug room only
  // NEW GAME + (the Drowned Abbey). They borrow the old songs for now.
  strand: { name: 'Gullmouth Strand', color: '#3a5a7a', music: 'pass' },
  causeway: { name: 'The Drowned Causeway', color: '#2a4a6a', music: 'aqueduct' },
  cloister: { name: "Saint Calder's Cloister", color: '#7a7a5a', music: 'castle' },
  undercroft: { name: 'The Undercroft', color: '#5a4a3a', music: 'catacombs' },
  scriptorium: { name: 'The Scriptorium', color: '#6a3a5a', music: 'library' },
  belltower: { name: 'The Bell Tower', color: '#6a4a2a', music: 'belfry' },
  gardens: { name: 'The Tithe Gardens', color: '#3a5a2a', music: 'kennels' },
  seacaves: { name: 'The Sea Caves', color: '#1a4a5a', music: 'deeps' },
  penance: { name: "The Penitents' Gaol", color: '#5a4a4a', music: 'gaol' },
  saltworks: { name: 'The Saltworks', color: '#8a3a1a', music: 'forge' },
  glasschoir: { name: 'The Glass Choir', color: '#6a4a9a', music: 'vault' },
};

/** Set once the avalanche has buried the mountain pass. While unset, `chase` rooms have an avalanche. */
export const CHASE_FLAG = 'pass_buried';

export interface EntDef {
  x: number;
  y: number;
  t: string;
  arg?: string;
}
export interface RoomDef {
  id: string;
  name: string;
  zone: Zone;
  theme: Theme;
  gx: number;
  gy: number;
  w: number; // in cells
  h: number;
  tiles: string[];
  ents: EntDef[];
  save?: boolean;
  /** Boss id (a BOSSES key in game/bosses.ts). Items ('i') in a boss room only appear once it is beaten. */
  boss?: string;
  /** Gate tiles ('G') in this room open once this Hunter flag is set. */
  gateFlag?: string;
  /** The room's water drains away once this Hunter flag is set. */
  drainFlag?: string;
  /** Snow-seal tiles ('N') are open until this flag is set, then solid. */
  sealFlag?: string;
  /**
   * Avalanche rooms (only while CHASE_FLAG is unset). 'run': it chases the hero and
   * restarts the room if it catches her. 'end': it slams into the left door and sets sealFlag.
   */
  chase?: 'run' | 'end';
  /**
   * Tidal water (the Aqueduct): the water fills the room from its floor up to a surface
   * that rises from tile row `low` to row `high` and back, over and over (see Game.updateTide).
   * Rooms with a tide use no '~' tiles. Swimming up and leaping out at high tide reaches
   * ledges a normal jump can't.
   */
  tide?: { low: number; high: number };
  /**
   * A glowing breach at tile (x, y) that carries the hero to tile (tx, ty) of room `to` (UP to
   * step through). In a boss room it only appears once the boss is dead. Used to leave the
   * inside of the Colossus.
   */
  warp?: { x: number; y: number; to: string; tx: number; ty: number };
  /** The Mirror Vault's trick: while the hero is in this room, LEFT and RIGHT are swapped. */
  mirror?: boolean;
}

/**
 * What goes in the sky cell added above an outdoor room by RB.sky(): a short climb of
 * secret ledges up from the room's highest spot, usually needing the double jump, to a
 * minor upgrade or a hidden pocket. Coordinates are after sky(): rows 0-13 are the sky cell.
 * Rooms whose layout lives in room_edits.json had the same secrets written into the JSON.
 */
export const SKY_SECRETS: Record<string, (b: RB) => void> = {
  // from the dead-end bridge, two ledges up the mountainside to a potion (mind the avalanche)
  slope: (b) => {
    b.fill(58, 14, 6, 1, '=').fill(61, 10, 5, 1, '=');
    b.e(63, 9, 'i', 'potion');
  },
  // double jump off the candle ledge, then up to a rock outcrop with a Might Seed
  pilgrim: (b) => {
    b.fill(3, 14, 8, 1, '=').fill(12, 10, 6, 1, '=').fill(19, 6, 7, 1);
    b.e(22, 5, 'i', 'str_up').e(20, 5, 'C');
  },
  // double jump off the ledge by the save altar, then a ledge under the cliff shoulder
  cliffs: (b) => {
    b.fill(8, 15, 5, 1, '=').fill(2, 11, 6, 1, '=');
    b.e(4, 10, 'i', 'con_up').e(6, 10, 'C');
  },
  // double jump off the gate steps to a ledge, then whip open a cracked window in the facade
  drawbridge: (b) => {
    b.fill(55, 16, 6, 1, '=');
    b.fill(63, 9, 3, 4, '.').fill(62, 9, 1, 4, 'B'); // hollow behind cracked stones
    b.e(64, 12, 'i', 'heart_up');
  },
  // from the gable-top prize, two more ledges into the clouds
  spire: (b) => {
    b.fill(28, 13, 5, 1, '=').fill(33, 9, 6, 1, '=');
    b.e(37, 8, 'i', 'con_up').e(34, 8, 'C');
  },
  // from the merlon-top ledge, two more ledges above the walls
  rampart: (b) => {
    b.fill(17, 15, 6, 1, '=').fill(11, 11, 6, 1, '=');
    b.e(13, 10, 'i', 'str_up').e(15, 10, 'C');
  },
};

/** Room settings the editor can change besides tiles and entities. */
export const META_KEYS = ['name', 'zone', 'theme', 'gx', 'gy', 'w', 'h', 'save', 'gateFlag', 'drainFlag', 'sealFlag'] as const;
export type RoomMeta = Partial<Pick<RoomDef, (typeof META_KEYS)[number]>>;

/**
 * What the editor saves per room: the full tile grid and entity list, plus any
 * settings that differ from the code (all of them for rooms made in the editor).
 */
export interface RoomEdit extends RoomMeta {
  tiles: string[];
  ents: EntDef[];
}
export type RoomEdits = Record<string, RoomEdit>;

/** The rooms of a world with the editor's saved changes applied. */
export function buildRooms(world: World = 'ash'): RoomDef[] {
  return applyEdits(buildBaseRooms(world), worldEdits(world));
}
/** The editor's saved changes for a world (each world has its own file). */
export function worldEdits(world: World): RoomEdits {
  return (world === 'abbey' ? ABBEY_EDITS : ROOM_EDITS) as unknown as RoomEdits;
}

const sizeMatches = (tiles: string[], w: number, h: number) => tiles.length === h * SR && tiles.every((r) => r.length === w * SC);

/**
 * Apply saved edits. An edit for an existing room replaces its tiles/ents and settings.
 * An edit whose id has no room in code is a room made in the editor, and is added at the end.
 * Edits whose tile grid doesn't match the room size are skipped.
 */
export function applyEdits(defs: RoomDef[], edits: RoomEdits): RoomDef[] {
  for (const [id, e] of Object.entries(edits)) {
    let d = defs.find((x) => x.id === id);
    if (!d) {
      if (e.name === undefined || e.zone === undefined || e.theme === undefined || e.gx === undefined || e.gy === undefined || !e.w || !e.h) {
        console.warn(`[rooms] ignoring saved room "${id}": it is missing its settings`);
        continue;
      }
      d = { id, name: e.name, zone: e.zone, theme: e.theme, gx: e.gx, gy: e.gy, w: e.w, h: e.h, tiles: [], ents: [] };
      defs.push(d);
    }
    if (!sizeMatches(e.tiles, e.w ?? d.w, e.h ?? d.h)) {
      console.warn(`[rooms] ignoring saved edit for "${id}": its size doesn't match the room`);
      if (!d.tiles.length) defs.splice(defs.indexOf(d), 1);
      continue;
    }
    for (const k of META_KEYS) if (e[k] !== undefined) (d as any)[k] = e[k];
    d.tiles = [...e.tiles];
    d.ents = e.ents.map((x) => ({ ...x }));
  }
  return defs;
}

/** A closed room shell of w x h cells, for rooms made in the editor. */
export function emptyRoomTiles(w: number, h: number): string[] {
  return new RB(w, h).shell().g.map((r) => r.join(''));
}

/**
 * Change a room's cell rectangle. The old tiles stay where they were in the world;
 * new space is open, with walls round the new outer edge. Entities move with the tiles,
 * and any that end up outside are dropped (locked ones are pulled back inside).
 */
export function resizeRoom(d: RoomDef, gx: number, gy: number, w: number, h: number, keep = 'PRWL') {
  const b = new RB(w, h).shell();
  const ox = (d.gx - gx) * SC, oy = (d.gy - gy) * SR;
  d.tiles.forEach((row, y) => [...row].forEach((c, x) => {
    const nx = x + ox, ny = y + oy;
    if (nx >= 0 && ny >= 0 && nx < b.W && ny < b.H) b.g[ny][nx] = c;
  }));
  d.ents = d.ents
    .map((e) => ({ ...e, x: e.x + ox, y: e.y + oy }))
    .filter((e) => keep.includes(e.t) || (e.x >= 0 && e.y >= 0 && e.x < b.W && e.y < b.H))
    .map((e) => ({ ...e, x: Math.max(1, Math.min(b.W - 2, e.x)), y: Math.max(1, Math.min(b.H - 3, e.y)) }));
  Object.assign(d, { gx, gy, w, h, tiles: b.g.map((r) => r.join('')) });
}

/** The rooms of a world exactly as written in code, without editor changes. */
export function buildBaseRooms(world: World = 'ash'): RoomDef[] {
  if (world === 'abbey') return buildAbbeyRooms();
  const R: RoomDef[] = [];

  // 1 ── Drawbridge (outdoor; the title screen shows this room, so it stays first)
  {
    const b = new RB(3, 1);
    b.fill(0, 0, 3, 3).fill(0, 3, 2, 5).door('L', 0); // cliff shoulder, with the road from the mountain pass below it
    b.fill(0, 12, 18, 2);
    b.fill(18, 12, 32, 1, 'H'); // drawbridge planks
    b.fill(50, 12, 22, 2);
    b.fill(62, 0, 10, 8); // castle facade over the gate
    b.fill(71, 0, 1, 14).door('R', 0);
    b.fill(52, 11, 3, 1); // steps
    b.fill(56, 10, 3, 2);
    b.e(3, 11, 'P');
    b.e(9, 11, 'C').e(22, 11, 'C').e(34, 11, 'C').e(46, 11, 'C').e(60, 9, 'C');
    b.e(28, 11, 'z').e(40, 11, 'z').e(53, 11, 'z').e(66, 11, 'z');
    b.e(44, 3, 'b').e(58, 5, 'b');
    b.sky(); // open night sky above, with a secret in the castle facade
    SKY_SECRETS.drawbridge(b);
    R.push(b.build('drawbridge', 'Moonlit Drawbridge', 'castle', 'outdoor', 0, 2));
  }
  // 2 ── Courtyard
  {
    const b = new RB(2, 1);
    b.shell(false).door('L', 0).door('R', 0);
    b.fill(20, 10, 8, 2); // fountain base
    b.fill(22, 8, 4, 2);
    b.fill(6, 8, 6, 1, '=').fill(36, 8, 6, 1, '=');
    // high ledge over the left platform: 6 rows up, so only a double jump reaches it.
    // From there you can jump out of the open top onto the Rampart Walk above.
    b.fill(10, 2, 4, 1, '=');
    b.hole('B', 1).fill(34, 12, 4, 1, '='); // a rusted grate (Down + Jump): the gravediggers' way down to the Lichyard
    b.e(30, 11, 'T', 'lore_grate');
    b.e(8, 7, 'C').e(39, 7, 'C').e(16, 11, 'C').e(31, 11, 'C');
    b.e(23, 7, 'i', 'sub_holy').e(41, 7, 'i', 'acc_garnet');
    b.e(13, 11, 'z').e(33, 11, 'z').e(43, 11, 'z');
    b.e(24, 3, 'b').e(42, 2, 'b');
    R.push(b.build('courtyard', 'Ruined Courtyard', 'castle', 'courtyard', 3, 2));
  }
  // 3 ── Great Hall
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(7, 10, 2, 2).fill(10, 7, 11, 1, '=');
    b.fill(42, 10, 2, 2).fill(44, 7, 13, 1, '=');
    b.fill(26, 9, 3, 1, '=');
    b.fill(64, 4, 1, 1); // little shelf with a hidden potion behind breakable stones
    b.fill(64, 5, 7, 1).fill(64, 2, 1, 3, 'B').fill(58, 6, 4, 1, '=');
    b.e(4, 11, 'C').e(13, 6, 'C').e(24, 11, 'C').e(40, 11, 'C').e(54, 6, 'C').e(61, 11, 'C');
    b.e(50, 6, 'i', 'sub_cross');
    b.e(68, 4, 'i', 'heart_up');
    b.e(34, 11, 'k').e(16, 6, 'k').e(62, 11, 'z');
    b.e(30, 3, 'b');
    R.push(b.build('greathall', 'Great Hall', 'castle', 'hall', 5, 2));
  }
  // 4 ── Grand Stairwell (1 x 4)
  {
    const b = new RB(1, 4);
    b.shell().door('L', 2).door('R', 0).door('R', 2).door('R', 3).hole('B', 0); // the lowest east door: the Gaol's Oubliette (its gate opens from inside)
    b.fill(14, 12, 9, 2); // armory landing
    b.fill(1, 40, 15, 2).fill(20, 40, 3, 2); // great-hall floor, gap at 16-19
    // climbing platforms (great hall floor → armory landing)
    const plats: [number, number, number][] = [[2, 36, 5], [8, 32, 5], [14, 28, 5], [8, 24, 5], [2, 20, 5], [8, 16, 5]];
    for (const [x, y, w] of plats) b.fill(x, y, w, 1, '=');
    // lower section (cell 3)
    b.fill(18, 51, 4, 1, '=').fill(14, 47, 5, 1, '=').fill(15, 44, 5, 1, '=');
    b.e(4, 35, 'C').e(16, 27, 'C').e(4, 19, 'C').e(18, 11, 'C').e(20, 50, 'C').e(4, 53, 'C');
    b.e(12, 24, 'b').e(6, 10, 'b').e(18, 34, 'b');
    b.e(6, 53, 's').e(21, 11, 'i', 'acc_blood');
    R.push(b.build('stairwell', 'Grand Stairwell', 'castle', 'stair', 8, 0));
  }
  // 5 ── Armory (dead end with the Iron Chain)
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0);
    b.fill(14, 9, 2, 3).fill(30, 8, 2, 4);
    b.fill(20, 6, 6, 1, '=');
    b.fill(40, 1, 1, 7).fill(40, 8, 1, 4, 'B');
    b.door('R', 0).fill(46, 8, 1, 4, 'B'); // cracked stones before the far door: a hidden way to the Bellfoot Court
    b.e(10, 11, 'C').e(22, 5, 'C').e(36, 11, 'C');
    b.e(44, 11, 'i', 'whip_iron');
    b.e(24, 11, 'k').e(36, 11, 's');
    R.push(b.build('armory', 'Abandoned Armory', 'castle', 'hall', 9, 0));
  }
  // 6 ── Castle save room
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(23, 8, 1, 4, 'G'); // shortcut gate, raised by the lever in the Servants' Gallery
    b.e(12, 11, 'S').e(5, 11, 'C').e(19, 11, 'C');
    R.push(b.build('save1', 'Sanctum of Rest', 'castle', 'shrine', 9, 2, { save: true, gateFlag: 'servants_gate' }));
  }
  // 7 ── Ossuary Shaft (1 x 2)
  {
    const b = new RB(1, 2);
    b.shell().hole('T', 0).door('L', 1).door('R', 1);
    // zigzag climb: 4 rows up off the floor, then 3-row steps with a 1-tile gap.
    // The top ledge sits right under the entry hole (the ceiling blocks a jump onto it
    // from the side), so the last step is a straight jump up from the ledge below it.
    const plats: [number, number, number][] = [
      [10, 22, 6], [3, 19, 6], [10, 16, 6], [17, 13, 6], [10, 10, 6], [3, 7, 6], [10, 4, 6], [10, 2, 4],
    ];
    for (const [x, y, w] of plats) b.fill(x, y, w, 1, '=');
    b.e(5, 6, 'C').e(14, 9, 'C').e(5, 18, 'C').e(14, 15, 'C').e(18, 12, 'C').e(19, 25, 'C');
    b.e(19, 6, 'b').e(6, 18, 'w'); // bat hangs off to the side, not over the entry hole
    b.e(4, 25, 's').e(21, 12, 'i', 'life_up');
    R.push(b.build('shaft', 'Ossuary Shaft', 'catacombs', 'catacomb', 8, 4));
  }
  // 8 ── Bone Corridor (grate in the floor leads down to the Wisp Gallery)
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(34, 12, 4, 2, '.').fill(34, 12, 4, 1, '=');
    b.fill(14, 10, 4, 2).fill(22, 8, 6, 1, '=').fill(46, 9, 5, 3).fill(54, 7, 7, 1, '=');
    b.e(10, 11, 'C').e(25, 7, 'C').e(41, 11, 'C').e(60, 11, 'C').e(30, 11, 'C');
    b.e(57, 6, 'i', 'armor_mail');
    b.e(21, 11, 's').e(48, 8, 's').e(66, 11, 's');
    b.e(30, 4, 'w');
    R.push(b.build('bonecorr', 'Corridor of Bones', 'catacombs', 'catacomb', 5, 5));
  }
  // 9 ── Flooded Crypt (2 x 2)
  // The lower door is a sunken gate. A lever on the floor in the bottom-left corner
  // drains the water and raises the gate into the Gallery of Wisps.
  {
    const b = new RB(2, 2);
    b.shell().door('R', 0).door('R', 1);
    b.fill(47, 22, 1, 4, 'G'); // sunken gate
    b.fill(1, 12, 23, 2, '.'); // upper floor only on the right half
    b.fill(24, 12, 23, 2);
    b.fill(1, 19, 46, 7, '~'); // water
    b.e(3, 25, 'L', 'crypt_drained');
    b.fill(6, 21, 4, 5); // pillar out of the water
    b.fill(12, 17, 5, 1, '=').fill(18, 14, 5, 1, '=');
    b.fill(17, 9, 6, 1, '=').fill(9, 6, 6, 1, '=');
    b.e(11, 5, 'i', 'whip_barbed');
    b.e(20, 25, 'i', 'potion').e(44, 25, 'i', 'armor_bone');
    b.e(30, 11, 'C').e(42, 11, 'C').e(19, 8, 'C').e(8, 20, 'C');
    b.e(14, 24, 'd').e(30, 24, 'd').e(40, 24, 'd');
    b.e(30, 3, 'b').e(10, 3, 'b');
    R.push(b.build('flooded', 'Flooded Crypt', 'catacombs', 'flooded', 3, 5, { gateFlag: 'crypt_drained', drainFlag: 'crypt_drained' }));
  }
  // 10 ── Wisp Gallery
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0).hole('T', 1);
    b.fill(0, 8, 1, 4, 'G'); // other side of the Flooded Crypt's sunken gate
    b.fill(30, 6, 4, 6); // tall block below the grapple ring
    b.fill(25, 9, 4, 1, '=');
    b.fill(60, 4, 11, 1); // high ledge (needs the grapple)
    b.fill(10, 9, 5, 1, '=').fill(46, 9, 5, 1, '=');
    b.e(35, 1, 'O').e(53, 3, 'O');
    b.e(66, 3, 'i', 'whip_ember');
    b.e(12, 8, 'C').e(24, 11, 'C').e(48, 8, 'C').e(42, 11, 'C').e(63, 3, 'C');
    b.e(20, 5, 'w').e(46, 5, 'w').e(62, 8, 'w');
    b.e(14, 11, 's').e(52, 11, 's');
    R.push(b.build('wispgal', 'Gallery of Wisps', 'catacombs', 'catacomb', 5, 6, { gateFlag: 'crypt_drained' }));
  }
  // 11 ── Shrine of the Chain
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0);
    b.fill(10, 12, 4, 2, 'B'); // cracked floor over the Forgotten Drain: whip downward in a jump
    b.fill(14, 11, 5, 1);
    b.e(16, 10, 'R');
    b.e(14, 10, 'i', 'relic_sinew'); // Sinew Coil, beside the Chain Grapple for now
    b.e(6, 11, 'C').e(21, 11, 'C');
    R.push(b.build('shrine', 'Shrine of the Chain', 'catacombs', 'shrine', 8, 6));
  }
  // 12 ── The Chasm
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(4, 12, 40, 2, '.').fill(4, 13, 40, 1, '^');
    b.fill(22, 10, 3, 4);
    b.e(10, 4, 'O').e(17, 4, 'O').e(29, 4, 'O').e(38, 4, 'O');
    b.e(2, 11, 'C').e(45, 11, 'C').e(22, 9, 'C').e(24, 9, 'i', 'acc_moon');
    b.e(14, 6, 'b').e(33, 6, 'b');
    R.push(b.build('chasm', 'The Chasm', 'catacombs', 'chasm', 9, 5));
  }
  // 13 ── Antechamber (save before the boss)
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0).door('R', 0);
    b.e(11, 11, 'S').e(4, 11, 'C').e(19, 11, 'C');
    R.push(b.build('antechamber', 'Antechamber', 'catacombs', 'shrine', 11, 5, { save: true }));
  }
  // 14 ── Lair of the Ossuary Wyrm (2 x 2)
  {
    const b = new RB(2, 2);
    b.shell().door('L', 1);
    b.fill(47, 22, 1, 4, 'G'); // gate to the Undervault, opens when the Wyrm dies
    // symmetric tiers, each reachable by a normal jump: 4 rows off the floor, then 3-row steps
    b.fill(5, 22, 7, 1, '=').fill(36, 22, 7, 1, '=');
    b.fill(13, 19, 6, 1, '=').fill(29, 19, 6, 1, '=');
    b.fill(20, 16, 8, 1, '=');
    b.fill(13, 13, 6, 1, '=').fill(29, 13, 6, 1, '='); // under the side grapple rings
    b.e(14, 7, 'O').e(24, 6, 'O').e(34, 7, 'O');
    b.e(24, 14, 'W');
    R.push(b.build('lair', 'Ossuary Lair', 'lair', 'lair', 12, 4, { boss: 'wyrm', gateFlag: 'wyrm_slain' }));
  }

  // ══ Prelude: the Hollowcrown Pass, west of the drawbridge ══
  // An avalanche chases the hero through the first two rooms and buries the way back
  // in the third. Each room teaches a control or two through signposts ('T' + HINTS key).
  // Where two outdoor rooms meet, the sky above the door is open on both sides. Where
  // one side is a cliff or cave, both sides are solid above the door rows.

  // P1 ── Hollowcrown Ridge (the opening cinematic plays here, then the chase starts)
  {
    const b = new RB(3, 1);
    b.fill(0, 0, 1, 14); // the mountain behind her
    b.fill(0, 12, 72, 2);
    b.fill(18, 11, 2, 1); // rock: first jump
    b.fill(26, 10, 3, 2); // taller rock
    b.fill(34, 12, 4, 2, '.').fill(34, 13, 4, 1, '^'); // icy crevasse
    b.fill(42, 9, 8, 3); // shelf
    b.fill(54, 12, 3, 2, '.').fill(54, 13, 3, 1, '^');
    b.fill(61, 11, 2, 1).fill(66, 10, 2, 2);
    b.e(3, 11, 'P');
    b.e(8, 11, 'T', 'move').e(15, 11, 'T', 'jump').e(31, 11, 'T', 'gap');
    R.push(b.build('ridge', 'Hollowcrown Ridge', 'pass', 'snow', -10, 2, { chase: 'run' }));
  }
  // P2 ── Shattered Slope (thin ledges up a cliff, then a ledge bridge you must drop through)
  {
    const b = new RB(3, 1);
    b.fill(0, 12, 72, 2);
    b.fill(9, 10, 6, 2).fill(15, 8, 6, 4); // rising steps
    b.fill(21, 12, 10, 2, '.').fill(21, 13, 10, 1, '^'); // spiked gully
    b.fill(23, 8, 3, 1, '=').fill(27, 7, 3, 1, '='); // ledges across it
    b.fill(40, 4, 16, 8); // cliff face
    b.fill(33, 9, 6, 1, '=').fill(35, 6, 5, 1, '='); // climb up through these
    b.fill(56, 4, 10, 1, '='); // bridge that dead-ends into rock: drop through it
    b.fill(66, 0, 6, 8).door('R', 0);
    b.e(32, 11, 'T', 'ledge').e(52, 3, 'T', 'drop');
    b.sky();
    SKY_SECRETS.slope(b);
    R.push(b.build('slope', 'Shattered Slope', 'pass', 'snow', -7, 2, { chase: 'run' }));
  }
  // P3 ── Frostbite Hollow (ice cave: the avalanche seals the entrance; whip through the ice)
  {
    const b = new RB(1, 1);
    b.shell().fill(1, 1, 22, 2).door('L', 0).door('R', 0);
    b.fill(0, 8, 1, 4, 'N'); // buried by the avalanche
    b.fill(21, 8, 1, 4, 'B'); // cracked ice wall
    b.fill(4, 9, 4, 1, '=');
    b.e(5, 8, 'C').e(14, 11, 'C');
    b.e(10, 11, 'T', 'lore_ice').e(15, 11, 'T', 'whip').e(19, 11, 'T', 'crack');
    R.push(b.build('hollow', 'Frostbite Hollow', 'pass', 'ice', -4, 2, { chase: 'end', sealFlag: CHASE_FLAG }));
  }
  // P4 ── Pilgrim's Road (whip directions, backdash, the first enemies)
  {
    const b = new RB(2, 1);
    b.fill(0, 0, 2, 8).fill(2, 0, 1, 5).door('L', 0); // the mountain the cave came out of
    b.fill(0, 12, 48, 2);
    b.fill(8, 8, 3, 1, '='); // candle up high: whip upward to reach it
    b.fill(22, 11, 4, 1);
    b.fill(42, 10, 3, 2);
    b.e(9, 7, 'C').e(15, 11, 'C').e(40, 11, 'C').e(43, 9, 'C');
    b.e(5, 11, 'T', 'candle').e(14, 11, 'T', 'diag').e(25, 10, 'T', 'dash').e(32, 11, 'T', 'lore_pilgrim');
    b.e(34, 11, 'i', 'potion');
    b.e(19, 2, 'b').e(29, 11, 'z').e(38, 11, 'z');
    b.sky();
    SKY_SECRETS.pilgrim(b);
    R.push(b.build('pilgrim', "Pilgrim's Road", 'pass', 'snow', -3, 2));
  }
  // P5 ── Ravenwatch Cliffs (a save altar before the keep)
  {
    const b = new RB(1, 1);
    b.fill(21, 0, 3, 3).fill(22, 3, 2, 5).door('R', 0); // cliff shoulder, matching the drawbridge's wall
    b.fill(0, 12, 24, 2);
    b.fill(14, 9, 4, 1, '=');
    b.e(5, 11, 'S').e(11, 11, 'T', 'lore_gate').e(19, 11, 'T', 'menu');
    b.e(2, 11, 'C').e(15, 8, 'C');
    b.sky();
    SKY_SECRETS.cliffs(b);
    R.push(b.build('cliffs', 'Ravenwatch Cliffs', 'pass', 'snow', -1, 2, { save: true }));
  }

  // ══ After the Wyrm: the Undervault and the regions beyond it (rooms_expansion.ts) ══
  R.push(...buildExpansionRooms());
  R.push(...buildLibraryRooms());
  R.push(...buildDepthRooms());
  return R;
}
