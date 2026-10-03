// Enemy test chambers (0.10.0, replaces the old #lab room). The title menu's TEST ENEMY list
// (0.12.0) starts one directly. The enemy editor's TEST button opens the game with #test=<enemy id> (a base enemy or a variant): the hero
// starts in a sealed room with that enemy, set up where it belongs (eels in the pool,
// tomes in a bookcase, spiders and crawlers under a ceiling). It comes back a moment
// after it dies. #test=boss:<id> starts that boss's real fight instead, and plain #test
// (or #lab) opens the chamber empty.
//
// The editor's unsaved changes come along through localStorage (TEST_EDITS_KEY), so you
// can try a change before saving it.
//
// Keys while inside:
//   R      another one of the tested enemy
//   [ ]    switch to the previous / next enemy in the list (clears the room)
//   6      clear all enemies
//   7-9    toggle the Duskwing Shroud / Undertow Pearl / Ashglass Ward
//   0      refill HP and hearts
import { RB, RoomDef } from '../world/rooms';
import type { Game } from './game';
import { Hunter } from './stats';
import { Enemy } from './enemies';
import { spawnEnemy } from './spawn';
import { ENEMY, ENEMY_LETTER, EnemyEdits, buildEnemies } from './data';
import { BOSSES } from './bosses';
import { TRIAL_ROOMS } from '../world/rooms_trials';
import { TILE, TEST_EDITS_KEY } from '../config';

export const LAB_ID = 'lab';
const RESPAWN = 120; // frames after the last tested enemy dies before a new one appears

/**
 * 3 x 2 cells. Left: a deep pool (eels, drowned, the Undertow Pearl). Middle: a pillar
 * to jump off and a spike trench that only a glide (or the grapple rings) gets you across.
 * Right: the arena, with a stone slab overhead (spiders, crawlers and bats hang under it),
 * a reading table (chairs) and a bookcase (tomes).
 */
export function buildLabRoom(): RoomDef {
  const b = new RB(3, 2).shell(); // 72 x 28 tiles, floor rows 26-27
  b.fill(24, 18, 47, 8); // raised floor right of the pool (top at row 18)
  b.fill(1, 19, 23, 7, '~'); // the pool, its surface just below that floor
  b.fill(22, 11, 4, 1, '=').fill(25, 14, 4, 1, '='); // ledges up to the pillar
  b.fill(29, 8, 4, 10); // the pillar (top at row 8)
  b.fill(38, 18, 14, 1, '.').fill(38, 19, 14, 1, '^'); // spike trench
  b.e(42, 14, 'O').e(48, 14, 'O'); // grapple rings over the trench
  b.fill(55, 9, 12, 2); // the slab over the arena (underside at row 11)
  b.fill(60, 17, 3, 1, 'D'); // reading table
  b.fill(67, 14, 3, 4, 'K'); // bookcase
  b.e(54, 17, 'P');
  return b.build(LAB_ID, 'Test Chamber', 'lab', 'flooded', 40, 40);
}

/** Where an enemy of base kind `base` starts in the chamber: [x, bottom] in px. */
function spawnSpot(base: string): [number, number] {
  const T = TILE;
  switch (base) {
    case 'eel':
      return [12 * T, 24 * T]; // in the pool
    case 'drowned':
      return [14 * T, 26 * T]; // on the pool floor, lurking
    case 'tome':
      return [68 * T + 8, 16 * T]; // asleep in the bookcase
    case 'crawler':
      return [61 * T + 8, 11 * T + 12]; // clinging under the slab
    case 'spider':
    case 'bat':
      return [61 * T + 8, 12 * T]; // they find the slab above on their own
    case 'chair':
      return [58 * T + 8, 18 * T]; // beside the table, facing it
    default:
      return [63 * T + 8, 18 * T];
  }
}
/** Water enemies start the hero at the pool's edge instead of in the arena. */
const NEAR_POOL = ['eel', 'drowned'];

/** A hunter with every relic and sub-weapon, every shield and the Rootstone, and plenty of HP. */
function testHunter(hero: Hunter['hero']) {
  const h = new Hunter();
  h.hero = hero;
  h.hp = h.maxHp = 999;
  h.hearts = h.maxHearts = 99;
  h.grapple = h.doubleJump = h.slide = true;
  h.glide = h.swim = h.ward = h.elastic = true;
  h.subs = ['sub_holy', 'sub_cross', 'sub_knife'];
  h.sub = 'sub_knife';
  for (const id of ['shield_heater', 'shield_ossuary', 'shield_ashen', 'acc_rootstone']) h.owned.push(id);
  h.flags.push('wyrm_slain', 'pass_buried');
  return h;
}

/**
 * Use the enemy editor's unsaved working copy, if it left one for this test. The copy is
 * stamped with the `?t=` of the URL its TEST button opened, so a test opened any other
 * way (or an older copy) uses the saved enemies.
 */
function applyEditorCopy(g: Game) {
  try {
    const raw = localStorage.getItem(TEST_EDITS_KEY);
    const t = new URLSearchParams(location.search).get('t');
    if (!raw || !t) return;
    const copy = JSON.parse(raw) as { t: string; edits: EnemyEdits };
    if (copy.t !== t) return;
    const fresh = buildEnemies(copy.edits);
    for (const k of Object.keys(ENEMY)) delete ENEMY[k];
    Object.assign(ENEMY, fresh);
    g.buildEnemySheets();
  } catch {
    /* storage unavailable or bad data: test with the saved enemies */
  }
}

/** Every enemy id that can be tested in the chamber (bases and variants), in bestiary order. */
/** Every enemy and variant the chamber can spawn, in alphabetical order by name ('The Drowned' files under D). */
function testable() {
  const key = (id: string) => ENEMY[id].name.replace(/^the /i, '');
  return Object.keys(ENEMY).filter((id) => ENEMY_LETTER[ENEMY[id].base || id]).sort((a, b) => key(a).localeCompare(key(b)));
}

/** One line of the title menu's TEST ENEMY list. `arg` is what startTest() takes. */
export interface TestEntry {
  arg: string;
  name: string;
  tag: string; // BOSS, VARIANT, or blank
}
/** Everything the TEST ENEMY list offers: the bosses first, then every enemy and variant, each group in alphabetical order. */
export function testEntries(): TestEntry[] {
  const bosses = Object.keys(BOSSES).map((id) => ({ arg: `boss:${id}`, name: ENEMY[id]?.name || BOSSES[id].name, tag: 'BOSS' }));
  const enemies = testable().map((id) => ({ arg: id, name: ENEMY[id].name, tag: ENEMY[id].base && ENEMY[id].base !== id ? 'VARIANT' : '' }));
  const key = (e: TestEntry) => e.name.replace(/^the /i, ''); // 'The Drowned' files under D
  const byName = (a: TestEntry, b: TestEntry) => key(a).localeCompare(key(b));
  return [...bosses.sort(byName), ...enemies.sort(byName)];
}

/**
 * Open a test: `<enemy id>`, `boss:<boss id>` or '' (the empty chamber). Called from the
 * URL hash (`#test=...`) and from the title menu's TEST ENEMY list.
 */
export function startTest(g: Game, arg: string) {
  applyEditorCopy(g);
  g.hunter = testHunter(g.heroChoice);
  g.applyHero();
  g.testRun = 'test';
  g.testTick = null;
  g.visited = new Set();
  g.cutscene = null;
  g.input.script = null;
  g.boss = null;
  g.trans = null;
  g.fade = 0;
  g.state = 'play';
  if (arg.startsWith('boss:')) return startBossTest(g, arg.slice(5));
  startChamber(g, ENEMY[arg] ? arg : '');
}

/** The boss's own arena, fought for real (but with the test hunter's 999 HP). */
function startBossTest(g: Game, id: string) {
  let def = g.defs.find((d) => d.boss === id);
  if (!def && TRIAL_ROOMS[id]) {
    // a trial boss: its chamber is not part of the world, so it is built here, off the map
    def = TRIAL_ROOMS[id]();
    g.defs.push(def);
    g.rebuildGrid();
  }
  def = def || g.defs.find((d) => d.boss === 'wyrm')!;
  const at = def.ents.find((e) => e.t === 'P');
  g.loadRoom(def, at ? at.x * TILE + 8 : 200, at ? (at.y + 1) * TILE : def.h * 14 * TILE - 32);
  g.startBoss();
  g.message(`TEST: ${(BOSSES[def.boss!]?.name || id).toUpperCase()}`, 240);
}

/** The chamber's state. A module-level object, so a second test (from the title) reuses the room and keys. */
const lab = {
  kind: '', // the enemy being tested ('' = none)
  mine: [] as Enemy[], // the tested enemies currently alive
  respawnT: 0,
  keysBound: false,
};

function chamberDef(g: Game) {
  let def = g.defs.find((d) => d.id === LAB_ID);
  if (!def) {
    def = buildLabRoom();
    g.defs.push(def);
    g.rebuildGrid();
  }
  return def;
}

function enterChamber(g: Game) {
  const def = chamberDef(g);
  const base = ENEMY[lab.kind]?.base || lab.kind;
  const p = def.ents.find((e) => e.t === 'P')!;
  const x = NEAR_POOL.includes(base) ? 27 * TILE : p.x * TILE + 8;
  g.loadRoom(def, x, (p.y + 1) * TILE);
  lab.mine = [];
  lab.respawnT = 0;
  if (lab.kind) spawnOne(g);
  g.message(lab.kind ? `TEST: ${ENEMY[lab.kind].name.toUpperCase()}` : 'TEST CHAMBER', 180);
}

function spawnOne(g: Game) {
  const base = ENEMY[lab.kind].base || lab.kind;
  const [x, bottom] = spawnSpot(base);
  const en = spawnEnemy(g, ENEMY_LETTER[base], x, bottom, lab.kind);
  if (!(en instanceof Enemy)) return;
  g.spawn(en);
  lab.mine.push(en);
  g.fx.burst(x, bottom - 12, 'smoke', 4, 8, { vy: -0.5, life: 30, fade: true });
  g.audio.play('blink');
}

function clearChamber(g: Game) {
  for (const en of g.ents) if (en instanceof Enemy) en.dead = true;
  lab.mine = [];
}

function startChamber(g: Game, first: string) {
  lab.kind = first;
  // per-frame: bring the enemy back after it dies, and keep the key help on screen
  g.testTick = () => {
    if (g.room.def.id !== LAB_ID) return;
    lab.mine = lab.mine.filter((en) => !en.dead);
    if (lab.kind && !lab.mine.length && ++lab.respawnT >= RESPAWN) {
      lab.respawnT = 0;
      spawnOne(g);
    } else if (lab.mine.length) lab.respawnT = 0;
    g.hint = lab.kind ? 'R: ANOTHER   [ ]: SWITCH   6: CLEAR   0: REFILL' : '[ ]: PICK AN ENEMY   0: REFILL';
  };
  if (!lab.keysBound) {
    lab.keysBound = true;
    window.addEventListener('keydown', (e) => chamberKey(g, e));
  }
  enterChamber(g);
}

function chamberKey(g: Game, e: KeyboardEvent) {
  if (g.state !== 'play' || g.room.def.id !== LAB_ID) return;
  const h = g.hunter;
  if (e.code === 'KeyR' && lab.kind) spawnOne(g);
  else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
    const list = testable();
    const i = list.indexOf(lab.kind), d = e.code === 'BracketRight' ? 1 : -1;
    lab.kind = list[(i + d + list.length) % list.length];
    clearChamber(g);
    enterChamber(g);
  } else if (e.code === 'Digit6') {
    clearChamber(g);
    lab.respawnT = -9999; // stays empty until R or a switch
    g.message('ENEMIES CLEARED', 90);
  } else if (e.code === 'Digit7') {
    h.glide = !h.glide;
    g.message(`DUSKWING SHROUD ${h.glide ? 'ON' : 'OFF'}`, 90);
  } else if (e.code === 'Digit8') {
    h.swim = !h.swim;
    g.message(`UNDERTOW PEARL ${h.swim ? 'ON' : 'OFF'}`, 90);
  } else if (e.code === 'Digit9') {
    h.ward = !h.ward;
    g.message(`ASHGLASS WARD ${h.ward ? 'ON' : 'OFF'}`, 90);
  } else if (e.code === 'Digit0') {
    h.hp = h.maxHp;
    h.hearts = h.maxHearts;
    g.message('HP AND HEARTS REFILLED', 90);
  }
}
