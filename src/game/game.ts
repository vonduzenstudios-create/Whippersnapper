import * as THREE from 'three';
import { View, buildSheet, Sheet, makeTexture, disposeTree, recolorSheet, sheetColors, shiftColor } from '../gfx/view';
import { Input } from '../core/input';
import { AudioEngine } from '../audio/audio';
import { Music } from '../audio/music';
import { buildZombieSheet, buildSkeletonSheet, buildKnightSheet, buildDrownedSheet, buildBatSheet, buildWispSheet, buildLibrarianSheet } from '../gfx/art_folk';
import { buildWyrmSheet, buildWyrmBodySheet } from '../gfx/art_wyrm';
import { buildDogSheet, buildHarpySheet, buildWraithSheet, buildCrawlerSheet, buildHookjawSheet, buildDevourerSheet, buildEelSheet, buildCasterSheet, buildOozeSheet, buildGrubSheet, buildHandSheet, buildTomeSheet, buildChairSheet, buildSpiderSheet, buildMothSheet } from '../gfx/art_beasts';
import { buildHoundSheet, buildCinderHoundSheet } from '../gfx/art_hound';
import { buildAnzelSheet, buildVesnaSheet } from '../gfx/art_hunter';
import { buildBellMotherSheet } from '../gfx/art_bellmother';
import { buildSerpentSheet, buildFigureSheet } from '../gfx/art_depths';
import { buildLeviathanSheet, buildGorgonSheet, buildColossusSheet, buildYetiSheet, buildArchivistSheet, buildPropSheet, buildTallPropSheet } from '../gfx/art_bosses2';
import { buildItemSheet, buildCandleSheet, buildFxSheet, buildFireSheet, buildRelicFxSheet, buildRingSheet } from '../gfx/art_items';
import { paintTiles } from '../gfx/tiles';
import { buildBackdrop, buildWaterFront, Backdrop, WaterFront } from '../gfx/backdrops';
import { buildRooms, RoomDef, Zone, CHASE_FLAG, ZONE_INFO, World } from '../world/rooms';
import { Room, FURNITURE } from '../world/room';
import { Player } from './player';
import { Ent, HitKind, Boss } from './ent';
import { BOSSES } from './bosses';
import { FX } from './fx';
import { Hunter } from './stats';
import { Candle, Pickup, RingAnchor, Altar, EnemyShot, Lever, Sign, Merchant, WhipDrop, Warp } from './objects';
import { Avalanche, LEASH } from './avalanche';
import { Cutscene } from './cutscene';
import { spawnEnemy } from './spawn';
import { ChairProp } from './enemies_library';
import { ENEMY } from './data';
import { HeroId, heroText, Line, SCENES, setStoryWorld, ABBEY_OPENING } from './story';
import { buildPortraitSheet, buildPellSheet } from '../gfx/art_portraits';
import { trialSheet } from '../gfx/art_trials';
import { UI } from '../ui/ui';
import { Editor } from '../editor/editor';
import { VW, VH, TILE, CELL_W, CELL_H, STEP, SCREEN_COLS, SCREEN_ROWS } from '../config';
import { clamp, overlap, rand, Box } from '../core/util';

export type GState = 'title' | 'select' | 'intro' | 'play' | 'pause' | 'map' | 'dialog' | 'talk' | 'shop' | 'transition' | 'gameover' | 'edit';

export interface Sheets {
  /** The current hero (one of heroes.vesna / heroes.anzel, swapped by applyHero()). */
  hero: Sheet;
  zombie: Sheet;
  skeleton: Sheet;
  knight: Sheet;
  drowned: Sheet;
  bat: Sheet;
  wisp: Sheet;
  wyrm: Sheet;
  wyrmBody: Sheet;
  dog: Sheet;
  harpy: Sheet;
  wraith: Sheet;
  crawler: Sheet;
  hookjaw: Sheet;
  devourer: Sheet;
  eel: Sheet;
  caster: Sheet;
  ooze: Sheet;
  grub: Sheet;
  hand: Sheet;
  tome: Sheet;
  chair: Sheet;
  librarian: Sheet;
  spider: Sheet;
  moth: Sheet;
  hound: Sheet;
  houndCinder: Sheet;
  bellmother: Sheet;
  serpent: Sheet;
  leviathan: Sheet;
  gorgon: Sheet;
  colossus: Sheet;
  yeti: Sheet;
  archivist: Sheet;
  /** The Mirror Heart as the bestiary shows it (in a fight it copies the twin you play: mirrorSheets). */
  mirror: Sheet;
  /** The storybook figures the Head Archivist writes into the room. */
  figures: Sheet;
  /** Arena props the boss fights are played with (48x48, centered), and the tall ones (56x96, bottom middle). */
  props: Sheet;
  tallprops: Sheet;
  items: Sheet;
  candle: Sheet;
  fx: Sheet;
  fire: Sheet;
  /** Glide wings and the shield bubble worn by the hero. */
  relicfx: Sheet;
  ring: Sheet;
  portraits: Sheet;
  pell: Sheet;
}

/** The room a new game starts in, per map (the opening cinematic plays on the Ridge). */
const START_ROOM: Record<World, string> = { ash: 'ridge', abbey: 'st_landing' };
/** Frames for one full tide cycle in tidal rooms (low, rise, high, fall). */
const TIDE_PERIOD = 900;
/** Frames a boss's freeze frame holds on its pose before the talking starts. */
const FREEZE = 45;

export class Game {
  view = new View();
  input = new Input();
  audio = new AudioEngine();
  music = new Music(this.audio);
  /** A second, quiet music player: the save theme heard through a save room's door (see updateSaveAura). */
  saveMusic = new Music(this.audio);
  /** Doorways of the current room that lead into a save room (pixel positions), for the aura. */
  saveDoors: { x: number; y: number }[] = [];
  sheets: Sheets;
  heroSheets: Record<HeroId, Sheet>;
  /** Each twin's sprite sheet recolored as violet glass: what the Mirror Heart wears. */
  mirrorSheets: Record<HeroId, Sheet>;
  /** The twin picked on the character select screen, used by the next newGame(). */
  heroChoice: HeroId = 'vesna';
  /** The difficulty picked after character select (index into DIFFICULTIES), used by the next newGame(). */
  difficultyChoice = 0;
  /** Sprite sheet for each enemy kind, including recolored variants (see enemySheet()). */
  enemySheets: Record<string, Sheet> = {};
  fx: FX;
  ui: UI;
  editor: Editor;
  hunter = new Hunter();
  /** Which map is loaded: the original game, or NEW GAME + (see setWorld). */
  world: World = 'ash';
  player!: Player;
  defs: RoomDef[];
  grid = new Map<string, RoomDef>();
  room!: Room;
  ents: Ent[] = [];
  rings: { x: number; y: number }[] = [];
  /** Boss rewards waiting to be picked up; the HUD draws an arrow to each. */
  beacons: Pickup[] = [];
  backdrop: Backdrop | null = null;
  waterFront: WaterFront | null = null;
  drainT = 0; // frames into the current drain animation (0 = not draining)
  tideLevel = -1; // tidal rooms: 0 = low tide .. 1 = high tide (-1 = just entered)
  /** A boss has taken over this room's water (the Leviathan): the tide clock is ignored, see setWater. */
  tideHold = false;
  /** The song's volume while nothing else is ducking it (1 = full). A boss lowers it so its bells can be heard. */
  musicDuck = 1;
  /** Extra things drawn on the HUD canvas in world space during play (a boss's written words). Cleared with the room. */
  overlays: ((c: CanvasRenderingContext2D) => void)[] = [];
  tileCanvas: HTMLCanvasElement | null = null;
  tileTex: THREE.Texture | null = null;
  state: GState = 'title';
  frame = 0;
  hitCounter = 0;
  hitstopT = 0;
  shakeT = 0;
  shakeAmt = 0;
  dmgNums: { x: number; y: number; v: string; c: string; t: number }[] = [];
  msg = { text: '', t: 0 };
  banner = { text: '', sub: '', t: 0 };
  dialog: string[] = [];
  /** The conversation on screen (state 'talk'): its lines, the current one, how much of it has typed out, and what to do after. */
  talkState: { lines: Line[]; i: number; shown: number; done?: () => void } | null = null;
  /**
   * A boss scene is playing (its entrance, or a change of phase mid-fight): the hero waits
   * and can't be hurt, the camera watches the boss, letterbox bars. See bossScene/bossTalk.
   */
  bossShow = false;
  /** Frames left of a boss's freeze frame (everything holds still on its pose), then `freezeScene` plays. */
  freezeT = 0;
  freezeScene = '';
  hint = '';
  fade = 0; // 0..1 black overlay
  fadeFlash = 0;
  flashWhite = 0;
  trans: { t: number; to: RoomDef; x: number; y: number; vx: number; vy: number } | null = null;
  boss: Boss | null = null;
  /** Doorway tiles walled up while a boss fight runs, reopened when it dies. */
  sealedDoors: [number, number][] = [];
  avalanche: Avalanche | null = null;
  cutscene: Cutscene | null = null;
  /** Where the hero entered the current room; the avalanche restarts her here. */
  entry = { x: 0, bottom: 0 };
  /** The hunter as she walked into this room (a JSON copy), for RETRY ROOM on the game-over screen (debug). */
  roomStart: { id: string; x: number; bottom: number; hunter: string; visited: string[] } | null = null;
  touring = false;
  /** Id of the room picked from TEST ROOM on the title ('' = a normal game). Blocks saving. */
  testRun = '';
  /** Extra per-frame logic of the enemy test chamber (game/test_chamber.ts); null in normal play. */
  testTick: (() => void) | null = null;
  bossName = 0;
  deathT = 0;
  zone: Zone | '' = '';
  lastTime = 0;
  acc = 0;
  visited = new Set<string>();

  constructor() {
    const t0 = performance.now();
    this.heroSheets = { vesna: buildSheet(buildVesnaSheet()), anzel: buildSheet(buildAnzelSheet()) };
    const glass = (s: Sheet) => recolorSheet(s, Object.fromEntries(sheetColors(s).map((c) => [c.hex, shiftColor(c.hex, { glass: true })])));
    this.mirrorSheets = { vesna: glass(this.heroSheets.vesna), anzel: glass(this.heroSheets.anzel) };
    this.sheets = {
      hero: this.heroSheets.vesna,
      zombie: buildSheet(buildZombieSheet()),
      skeleton: buildSheet(buildSkeletonSheet()),
      knight: buildSheet(buildKnightSheet()),
      drowned: buildSheet(buildDrownedSheet()),
      bat: buildSheet(buildBatSheet()),
      wisp: buildSheet(buildWispSheet()),
      wyrm: buildSheet(buildWyrmSheet()),
      wyrmBody: buildSheet(buildWyrmBodySheet()),
      dog: buildSheet(buildDogSheet()),
      harpy: buildSheet(buildHarpySheet()),
      wraith: buildSheet(buildWraithSheet()),
      crawler: buildSheet(buildCrawlerSheet()),
      hookjaw: buildSheet(buildHookjawSheet()),
      devourer: buildSheet(buildDevourerSheet()),
      eel: buildSheet(buildEelSheet()),
      caster: buildSheet(buildCasterSheet()),
      ooze: buildSheet(buildOozeSheet()),
      grub: buildSheet(buildGrubSheet()),
      hand: buildSheet(buildHandSheet()),
      tome: buildSheet(buildTomeSheet()),
      chair: buildSheet(buildChairSheet()),
      librarian: buildSheet(buildLibrarianSheet()),
      spider: buildSheet(buildSpiderSheet()),
      moth: buildSheet(buildMothSheet()),
      hound: buildSheet(buildHoundSheet()),
      houndCinder: buildSheet(buildCinderHoundSheet()), // Gnarlfang's second form
      bellmother: buildSheet(buildBellMotherSheet()),
      serpent: buildSheet(buildSerpentSheet()),
      leviathan: buildSheet(buildLeviathanSheet()),
      gorgon: buildSheet(buildGorgonSheet()),
      colossus: buildSheet(buildColossusSheet()),
      yeti: buildSheet(buildYetiSheet()),
      archivist: buildSheet(buildArchivistSheet()),
      mirror: this.mirrorSheets.vesna,
      figures: buildSheet(buildFigureSheet()),
      props: buildSheet(buildPropSheet()),
      tallprops: buildSheet(buildTallPropSheet()),
      items: buildSheet(buildItemSheet()),
      candle: buildSheet(buildCandleSheet()),
      fx: buildSheet(buildFxSheet()),
      fire: buildSheet(buildFireSheet()),
      relicfx: buildSheet(buildRelicFxSheet()),
      ring: buildSheet(buildRingSheet()),
      portraits: buildSheet(buildPortraitSheet()),
      pell: buildSheet(buildPellSheet()),
    };
    console.log(`[nocturne] sprites generated in ${(performance.now() - t0).toFixed(0)}ms`);
    this.buildEnemySheets();
    this.fx = new FX(this.view.sprites, { fx: this.sheets.fx, fire: this.sheets.fire });
    this.defs = buildRooms();
    this.rebuildGrid();
    this.ui = new UI(this);
    this.editor = new Editor(this);
    this.input.onFirstGesture = () => {
      this.audio.init();
      this.input.onFirstGesture = null;
      if (this.state === 'title') this.music.play('title');
    };
    (window as any).game = this; // handy for debugging from the console
  }

  start() {
    this.ui.enterTitle();
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      if (!this.lastTime) this.lastTime = now;
      this.acc += Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      let n = 0;
      while (this.acc >= STEP && n < 5) {
        this.acc -= STEP;
        this.tick();
        n++;
      }
      if (n === 5) this.acc = 0;
      this.render();
    };
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ game flow

  /** Show the twin stored in the save (sprite, portrait and story text all follow hunter.hero). */
  applyHero() {
    this.sheets.hero = this.heroSheets[this.hunter.hero] || this.heroSheets.vesna;
    if (this.player && this.player.sprite.sheet !== this.sheets.hero) this.player.sprite.setSheet(this.sheets.hero);
  }
  /** Story text with the current hero's name and pronouns filled in. */
  text(s: string) {
    return heroText(s, this.hunter.hero);
  }

  newGame() {
    this.testRun = '';
    this.testTick = null;
    this.hunter = new Hunter();
    this.hunter.hero = this.heroChoice;
    this.hunter.difficulty = this.difficultyChoice;
    this.applyHero();
    this.visited = new Set();
    this.boss = null;
    this.trans = null;
    this.fade = 0;
    const start = this.defs.find((d) => d.id === START_ROOM[this.world]) || this.defs[0];
    const p = start.ents.find((e) => e.t === 'P')!;
    if (this.world === 'abbey') {
      // NEW GAME +: no cinematic, a few words on the beach instead
      this.cutscene = null;
      this.loadRoom(start, p.x * TILE + 8, (p.y + 1) * TILE);
      this.state = 'play';
      this.talk(ABBEY_OPENING);
      return;
    }
    this.cutscene = new Cutscene(this); // set before loadRoom so the avalanche waits for its cue
    this.loadRoom(start, p.x * TILE + 8, (p.y + 1) * TILE);
    this.state = 'play';
    this.cutscene.begin();
  }

  /**
   * Switch maps: 'ash' is the original game, 'abbey' is NEW GAME + (the Drowned Abbey). Each
   * has its own rooms, save slot and story text. Call before newGame/continueGame.
   */
  setWorld(w: World) {
    Hunter.world = w;
    setStoryWorld(w);
    if (this.world === w) return;
    this.world = w;
    this.defs = buildRooms(w);
    this.rebuildGrid();
    this.visited = new Set();
    this.editor.setWorld(w);
  }

  /**
   * TEST ROOM (title menu): drop a fresh hero into any room with every relic and
   * sub-weapon, for trying rooms out. The world is untouched (no levers or bosses done),
   * and save points don't write over the real save while testRun is on.
   */
  testRoom(def: RoomDef) {
    const h = new Hunter();
    h.hero = this.heroChoice;
    h.hp = h.maxHp = 9999;
    h.hearts = h.maxHearts = 99;
    h.grapple = h.doubleJump = h.slide = true;
    h.glide = h.swim = h.ward = h.elastic = true;
    h.subs = ['sub_holy', 'sub_cross', 'sub_knife'];
    h.sub = 'sub_holy';
    for (const id of ['shield_heater', 'shield_ossuary', 'shield_ashen', 'acc_rootstone']) h.owned.push(id);
    this.hunter = h;
    this.testRun = def.id;
    this.testTick = null;
    this.applyHero();
    this.visited = new Set();
    this.cutscene = null;
    this.input.script = null;
    this.boss = null;
    this.trans = null;
    this.fade = 0;
    const s = this.editor.findStart(def);
    this.loadRoom(def, s.x, s.bottom);
    this.state = 'play';
  }

  continueGame() {
    this.testRun = '';
    this.testTick = null;
    this.cutscene = null;
    this.input.script = null;
    this.trans = null;
    this.fade = 0;
    const h = Hunter.load();
    if (!h) return this.newGame();
    this.hunter = h;
    this.applyHero();
    this.visited = new Set(h.visited);
    const def = this.defs.find((d) => d.id === h.saveRoom) || this.defs[0];
    const alt = def.ents.find((e) => e.t === 'S') || def.ents.find((e) => e.t === 'P') || { x: 3, y: 11 };
    h.hp = h.maxHp;
    this.loadRoom(def, alt.x * TILE + 8 + 20, (alt.y + 1) * TILE);
    this.state = 'play';
  }

  /**
   * RETRY ROOM (debug, game-over screen): rewind to the moment the hero walked into the
   * room she died in. Everything in the hunter (HP, items, flags, bosses) goes back too,
   * so a boss fight starts over.
   */
  retryRoom() {
    const r = this.roomStart, def = r && this.defs.find((d) => d.id === r.id);
    if (!r || !def) return this.continueGame();
    this.cutscene = null;
    this.input.script = null;
    this.trans = null;
    this.fade = 0;
    const h = new Hunter();
    Object.assign(h, JSON.parse(r.hunter));
    this.hunter = h;
    this.applyHero();
    this.visited = new Set(r.visited);
    this.loadRoom(def, r.x, r.bottom);
    this.state = 'play';
  }

  /** Swap to the other twin (STATUS page). Only the looks and the story text change. */
  switchHero() {
    this.hunter.hero = this.hunter.hero === 'vesna' ? 'anzel' : 'vesna';
    this.heroChoice = this.hunter.hero;
    this.applyHero();
  }

  /** One sheet per ENEMY entry: variants get a recolored copy of their base enemy's sheet. */
  buildEnemySheets() {
    this.enemySheets = {};
    for (const [id, st] of Object.entries(ENEMY)) {
      const base = (this.sheets as any)[st.base || id] as Sheet | undefined;
      if (!base) continue;
      if (st.colors && Object.keys(st.colors).length) this.enemySheets[id] = recolorSheet(base, st.colors);
      else if (st.shift) {
        // a code variant: every color of the base sheet, turned and scaled the same way
        const sh = st.shift;
        this.enemySheets[id] = recolorSheet(base, Object.fromEntries(sheetColors(base).map((c) => [c.hex, shiftColor(c.hex, sh)])));
      } else this.enemySheets[id] = base;
    }
  }
  enemySheet(kind: string): Sheet {
    return this.enemySheets[kind] || (this.sheets as any)[ENEMY[kind]?.base || kind] || trialSheet(kind);
  }

  /** Map cell → room lookup. Call again after rooms move or change size. */
  rebuildGrid() {
    this.grid.clear();
    for (const d of this.defs) for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) this.grid.set(`${d.gx + x},${d.gy + y}`, d);
  }

  roomAt(gx: number, gy: number) {
    return this.grid.get(`${gx},${gy}`);
  }

  /** The tile at a global tile position, from whichever room is there ('' if none). Rooms use this past their edges. */
  tileOutside(gtx: number, gty: number) {
    const d = this.roomAt(Math.floor(gtx / SCREEN_COLS), Math.floor(gty / SCREEN_ROWS));
    return d ? this.liveTile(d, gtx - d.gx * SCREEN_COLS, gty - d.gy * SCREEN_ROWS) : '';
  }
  /** A room's tile as it stands now: gates raised, seals packed, water drained and stones broken by flags. */
  liveTile(d: RoomDef, tx: number, ty: number) {
    const c = d.tiles[ty]?.[tx] ?? '#';
    const h = this.hunter, f = h.flags;
    if (c === 'G' && d.gateFlag && f.includes(d.gateFlag)) return '.';
    if (c === 'N' && !(d.sealFlag && f.includes(d.sealFlag))) return '.';
    if (c === '~' && d.drainFlag && f.includes(d.drainFlag)) return '.';
    if (c === 'B' && h.broken.includes(`${d.id}:${tx},${ty}`)) return '.';
    return c;
  }

  loadRoom(def: RoomDef, px: number, pbottom: number, keepVel?: { vx: number; vy: number }) {
    if (this.player) {
      // her whip was still away from her (a Gloomcaster's hex): walking out settles it, while
      // a new game or a reload simply hands it back, along with a clean bill of health
      if (this.state === 'transition') this.player.whipEnt?.leaveRoom(this);
      else this.player.poisonT = 0;
      this.player.whipEnt = null;
    }
    for (const e of this.ents) e.destroy();
    this.ents = [];
    this.rings = [];
    this.beacons = [];
    this.boss = null;
    if (this.bossShow) {
      // left (or died) mid-entrance: give the controls back
      this.bossShow = false;
      this.input.script = null;
    }
    this.freezeT = 0;
    this.tideHold = false;
    this.musicDuck = 1;
    this.overlays = [];
    this.view.roll = 0;
    if (this.player) this.player.mount = null;
    this.fx.clear();
    this.dmgNums = [];
    this.view.clearWorld();
    this.room = new Room(def, (x, y) => this.tileOutside(x, y));
    const room = this.room;
    this.drainT = 0;
    this.sealedDoors = [];
    // switches flipped earlier stay flipped, and broken stones stay broken
    const flags = this.hunter.flags;
    if (def.drainFlag && flags.includes(def.drainFlag)) room.drain();
    if (def.gateFlag && flags.includes(def.gateFlag)) room.openGates();
    if (!def.sealFlag || !flags.includes(def.sealFlag)) room.unseal();
    for (const k of this.hunter.broken) {
      if (!k.startsWith(def.id + ':')) continue;
      const [x, y] = k.slice(def.id.length + 1).split(',').map(Number);
      room.set(x, y, '.');
    }
    const bossAlive = !!def.boss && !this.hunter.beaten(def.boss);
    // tiles
    this.paintRoomTiles();
    // backdrop
    this.backdrop = buildBackdrop(room, this.sheets.candle);
    this.view.world.add(this.backdrop.group);
    this.view.scene.fog = this.backdrop.fog;
    this.view.scene.background = this.backdrop.bg;
    this.waterFront = buildWaterFront(room);
    if (this.waterFront) this.view.world.add(this.waterFront.mesh);
    this.tideLevel = -1;
    if (def.tide) this.updateTide();
    // entities
    for (const e of def.ents) {
      const x = e.x * TILE + 8, bottom = (e.y + 1) * TILE;
      switch (e.t) {
        case 'C':
          this.ents.push(new Candle(this, x, bottom - 20));
          break;
        case 'S':
          this.ents.push(new Altar(this, x, bottom - 16));
          break;
        case 'O':
          this.ents.push(new RingAnchor(this, x, e.y * TILE + 8));
          break;
        case 'i': {
          // a boss room's items are its reward: they appear when it dies (spawnBossRewards)
          const key = `${def.id}:${e.x},${e.y}`;
          if (!bossAlive && !this.hunter.collected.includes(key)) {
            const item = new Pickup(this, x, bottom - 8, e.arg!, key);
            if (def.boss) item.setBeacon(this); // a boss reward left behind keeps its beacon
            this.ents.push(item);
          }
          break;
        }
        case 'R':
          if (!this.hunter.grapple) this.ents.push(new Pickup(this, x, bottom - 10, 'relic_grapple', `${def.id}:relic`));
          break;
        case 'L':
          this.ents.push(new Lever(this, x, bottom, e.arg || ''));
          break;
        case 'T':
          this.ents.push(new Sign(this, x, bottom, e.arg || ''));
          break;
        case 'n':
          this.ents.push(new ChairProp(this, x, bottom));
          break;
        case 'M':
          this.ents.push(new Merchant(this, x, bottom));
          break;
        case 'W':
        case 'P':
          break;
        default: {
          const en = spawnEnemy(this, e.t, x, bottom, e.arg);
          if (en) this.ents.push(en);
        }
      }
    }
    if (def.warp && (!def.boss || this.hunter.beaten(def.boss))) this.ents.push(new Warp(this, def.warp));
    // her whip, lying where a hardcore hex dropped it
    const lost = this.hunter.lostWhip;
    if (lost && lost.room === def.id) this.ents.push(new WhipDrop(this, lost.x, lost.y, true));
    // player
    if (!this.player) this.player = new Player(this);
    const p = this.player;
    p.x = px;
    p.y = pbottom - p.hh;
    if (keepVel) {
      p.vx = keepVel.vx;
      p.vy = keepVel.vy;
    } else {
      p.vx = p.vy = 0;
      p.set('normal');
      p.facing = 1;
    }
    p.ring = null;
    for (const e of p.echoes) e.age = 99; // afterimages belong to the old room
    if (p.state === 'hang' || p.state === 'attack') p.set('normal');
    p.lastSafe = { x: p.x, y: p.y };
    this.entry = { x: px, bottom: pbottom };
    this.roomStart = { id: def.id, x: px, bottom: pbottom, hunter: JSON.stringify(this.hunter.serialize()), visited: [...this.visited] };
    // the avalanche follows the hero through the chase rooms until it buries the pass
    this.avalanche = null;
    const chasing = !!def.chase && !this.touring && !flags.includes(CHASE_FLAG);
    if (chasing) {
      // during the cinematic it waits off screen for its cue
      const av = new Avalanche(this, this.cutscene ? -400 : px - LEASH, !this.cutscene, def.chase === 'end' ? TILE + 4 : null);
      this.ents.push(av);
      this.avalanche = av;
    }
    this.snapCamera();
    // the Mirror Vault: in a `mirror` room LEFT is RIGHT
    const wasMirror = this.input.mirror;
    this.input.mirror = !!def.mirror;
    if (def.mirror && !wasMirror) this.message('IN THIS HALL, LEFT IS RIGHT', 200);
    this.findSaveDoors();
    // music: silence before a boss, the save theme at altars, otherwise the zone's song
    const song = ZONE_INFO[def.zone]?.music || '';
    if (bossAlive) this.music.stop(1.2);
    else if (def.zone === 'pass') this.music.play(chasing ? 'chase' : 'pass');
    else if (def.save) this.music.play('save');
    else if (song) this.music.play(song);
    else this.music.stop();
    if (this.zone !== def.zone) {
      this.zone = def.zone;
      this.banner = { text: ZONE_INFO[def.zone]?.name || def.name, sub: '', t: 200 };
    }
    this.markVisited();
  }

  /**
   * The doorways of this room that open straight into a save room. Near one, the save
   * theme leaks through (updateSaveAura), so you can tell a rest is close, and likely
   * something dangerous after it.
   */
  findSaveDoors() {
    const r = this.room, def = r.def;
    this.saveDoors = [];
    if (def.save) return;
    const seen = new Set<string>();
    const check = (tx: number, ty: number, ox: number, oy: number) => {
      if (r.solidAt(tx, ty)) return;
      const to = this.roomAt(Math.floor((def.gx * SCREEN_COLS + tx + ox) / SCREEN_COLS), Math.floor((def.gy * SCREEN_ROWS + ty + oy) / SCREEN_ROWS));
      if (!to?.save || to === def) return;
      // one aura per doorway: group its tiles by the cell edge they sit on
      const key = `${to.id}:${ox ? Math.floor(ty / SCREEN_ROWS) : Math.floor(tx / SCREEN_COLS)}:${ox},${oy}`;
      if (seen.has(key)) return;
      seen.add(key);
      // the first open tile found is the doorway's top (or left) one: aim at its middle
      this.saveDoors.push({ x: tx * TILE + (ox ? 8 : 32), y: ty * TILE + (ox ? 32 : 8) });
    };
    for (let y = 0; y < r.rows; y++) {
      check(0, y, -1, 0);
      check(r.cols - 1, y, 1, 0);
    }
    for (let x = 0; x < r.cols; x++) {
      check(x, 0, 0, -1);
      check(x, r.rows - 1, 0, 1);
    }
  }

  /**
   * The hint that a save room is next door: a slow drift of pale blue motes out of its
   * doorway, and as the hero comes within about 10 tiles the area's song dips while the save
   * theme fades in underneath it.
   */
  updateSaveAura() {
    const p = this.player;
    let near = 0;
    for (const d of this.saveDoors) {
      near = Math.max(near, clamp(1 - Math.hypot(p.x - d.x, p.y - d.y) / 170, 0, 1));
      if (this.frame % 9 === 0) this.fx.burst(d.x + rand(-4, 4), d.y + rand(-26, 26), 'mote', 1, 2, { vx: rand(-0.3, 0.3), vy: -0.35, life: 70, fade: true, glow: 0.8, tint: [0.6, 0.85, 1.4] });
      if (this.frame % 40 === 0) this.fx.burst(d.x, d.y + rand(-20, 20), 'star', 1, 3, { vy: -0.2, life: 50, fade: true, glow: 1, tint: [0.7, 0.9, 1.5] });
    }
    // no leak while a boss fight or its silence is on
    if (this.boss || !this.music.current) near = 0;
    if (near > 0.02) {
      if (!this.saveMusic.current) {
        this.saveMusic.vol = 0.0001;
        this.saveMusic.play('save', 0.3);
      }
      this.saveMusic.setVolume(0.75 * near, 0.25);
      this.music.setVolume(1 - 0.55 * near, 0.25);
    } else {
      if (this.saveMusic.current) this.saveMusic.stop(0.8);
      this.music.setVolume(this.musicDuck, 0.12);
    }
  }

  /**
   * Two layers of tiles: the walls and floors (renderOrder 6, over every sprite but the
   * effects), and the furniture (bookcases and tables, renderOrder 4) which sits behind
   * the hero and enemies, since they walk in front of it.
   */
  paintRoomTiles() {
    const room = this.room;
    this.tileCanvas = paintTiles(room.tiles, room.def.theme, 'main').toCanvas();
    if (this.tileTex) this.tileTex.dispose();
    this.tileTex = makeTexture(this.tileCanvas);
    this.addTileMesh('tiles', this.tileTex, 6);
    const hasFurniture = room.tiles.some((row) => row.some((c) => FURNITURE.includes(c)));
    this.addTileMesh('furniture', hasFurniture ? makeTexture(paintTiles(room.tiles, room.def.theme, 'furniture').toCanvas()) : null, 4);
  }
  /** Replace the named tile-layer mesh (none if `tex` is null). */
  addTileMesh(name: string, tex: THREE.Texture | null, order: number) {
    const room = this.room;
    const old = this.view.world.getObjectByName(name) as THREE.Mesh | undefined;
    if (old) {
      this.view.world.remove(old);
      old.geometry.dispose();
      const mat = old.material as THREE.MeshBasicMaterial;
      if (mat.map && mat.map !== this.tileTex) mat.map.dispose();
      mat.dispose();
    }
    if (!tex) return;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthTest: false, depthWrite: false, fog: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(room.W, room.H), mat);
    m.name = name;
    m.position.set(room.W / 2, -room.H / 2, 0);
    m.renderOrder = order;
    m.frustumCulled = false;
    this.view.world.add(m);
  }

  breakTile(tx: number, ty: number) {
    this.room.set(tx, ty, '.');
    const key = `${this.room.def.id}:${tx},${ty}`;
    if (!this.hunter.broken.includes(key)) this.hunter.broken.push(key);
    const ctx = this.tileCanvas!.getContext('2d')!;
    ctx.clearRect(tx * TILE, ty * TILE, TILE, TILE);
    this.tileTex!.needsUpdate = true;
    this.audio.play('crumble');
    const cx = tx * TILE + 8, cy = ty * TILE + 8;
    this.fx.burst(cx, cy, 'smoke', 3, 6, { fps: 8, life: 30 });
    this.fx.burst(cx, cy, 'dust', 4, 6, { speed: 2, grav: 0.2, life: 30 });
    this.shake(2, 6);
    if (Math.random() < 0.12) this.spawn(new Pickup(this, cx, cy, 'meat', '', true));
  }

  snapCamera() {
    const p = this.player, r = this.room;
    this.view.zoom = 1;
    this.view.camX = clamp(p.x - VW / 2, 0, Math.max(0, r.W - VW));
    this.view.camY = clamp(p.y - VH / 2 - 8, 0, Math.max(0, r.H - VH));
  }

  markVisited() {
    const p = this.player, r = this.room;
    const gx = r.def.gx + clamp(Math.floor(p.x / CELL_W), 0, r.def.w - 1);
    const gy = r.def.gy + clamp(Math.floor(p.y / CELL_H), 0, r.def.h - 1);
    const k = `${gx},${gy}`;
    if (!this.visited.has(k)) {
      this.visited.add(k);
      this.hunter.visited = [...this.visited];
    }
  }

  spawn(e: Ent) {
    this.ents.push(e);
  }

  // ------------------------------------------------------------ combat helpers

  newHitId() {
    return ++this.hitCounter;
  }

  private dealHit(e: Ent, base: number, fromX: number, kind: HitKind) {
    const crit = Math.random() < this.hunter.lck / 160;
    const raw = base * rand(0.9, 1.1) * (crit ? 1.5 : 1);
    // a Throwing Knife's mark: this hit ignores half the DEF, and uses the mark up
    let def = e.def;
    if (e.exposedT > 0 && kind !== 'knife') {
      def *= 0.5;
      e.exposedT = 0;
    }
    const dmg = Math.max(1, Math.round(raw - def));
    e.onHit?.(this, dmg, fromX, crit, kind);
  }

  attackPoints(pts: [number, number][], r: number, hitId: number, base: number, fromX: number, kind: HitKind) {
    for (const e of this.ents) {
      if (!e.whipTarget || e.dead || e.lastHit === hitId) continue;
      let hit = false;
      const any = e as any;
      for (const [px, py] of pts) {
        if (any.hitAt ? any.hitAt(px, py, r) : Math.abs(px - e.x) < e.hw + r && Math.abs(py - e.y) < e.hh + r) {
          hit = true;
          break;
        }
      }
      if (hit) {
        e.lastHit = hitId;
        const [px, py] = pts[pts.length - 1];
        this.fx.burst((px + e.x) / 2, (py + e.y) / 2, 'spark', 1, 2);
        this.dealHit(e, base, fromX, kind);
      }
    }
  }

  /** Hit everything overlapping box `b` (once per hitId). Returns how many things it hit. */
  attackBox(b: Box, hitId: number, base: number, fromX: number, kind: HitKind) {
    let n = 0;
    for (const e of this.ents) {
      if (!e.whipTarget || e.dead || e.lastHit === hitId || e === (b as any)) continue;
      const any = e as any;
      if (any.hitBox ? any.hitBox(b) : overlap(b, e)) {
        e.lastHit = hitId;
        this.dealHit(e, base, fromX, kind);
        n++;
      }
    }
    return n;
  }

  damageNumber(x: number, y: number, v: number | string, c: string) {
    this.dmgNums.push({ x, y, v: String(v), c, t: 0 });
  }
  message(text: string, frames = 120) {
    this.msg = { text, t: frames };
  }
  showDialog(lines: string[]) {
    this.dialog = lines.map((l) => this.text(l));
    this.state = 'dialog';
  }
  /**
   * Start a conversation with portraits (a SCENES key, or lines). Play pauses until the last
   * line is dismissed, then `done` runs.
   */
  talk(scene: string | Line[], done?: () => void) {
    const lines = typeof scene === 'string' ? SCENES[scene] : scene;
    if (!lines?.length) return done?.();
    this.talkState = { lines, i: 0, shown: 0, done };
    this.state = 'talk';
    this.hint = '';
    this.input.flush();
  }
  /**
   * A boss starts a scene mid-fight (its change of phase, or rising from the dead): the hero
   * stops where she is and can't be hurt, and the camera turns to the boss. The boss plays
   * out the change, strikes a pose and ends the scene with bossTalk(scene).
   */
  bossScene() {
    this.bossShow = true;
    this.input.script = {};
    this.player.invuln = Math.max(this.player.invuln, 99999);
    this.msg.t = 0;
  }
  /**
   * Called by a boss once it strikes its pose, at the end of its entrance or of a bossScene:
   * a freeze frame, then the exchange (`scene`, its pre-fight `boss_<id>` by default), then
   * the hero gets her controls back.
   */
  bossTalk(scene = `boss_${this.room.def.boss}`) {
    this.banner.t = 0; // its name has had its moment
    this.freezeT = FREEZE;
    this.freezeScene = scene;
    this.flashWhite = 8;
    this.audio.play('sting');
  }
  /** The freeze frame is over: the talking, then back to the fight. */
  endFreeze() {
    this.talk(this.freezeScene, () => {
      this.bossShow = false;
      this.input.script = null;
      const p = this.player;
      if (p.invuln > 60) p.invuln = 60; // a moment's grace to get her bearings
    });
  }
  shake(amt: number, frames: number) {
    if (amt >= this.shakeAmt || this.shakeT <= 0) {
      this.shakeAmt = amt;
      this.shakeT = frames;
    }
  }
  hitstop(frames: number) {
    this.hitstopT = Math.max(this.hitstopT, frames);
  }
  levelUp() {
    this.audio.play('levelUp');
    this.message(`LEVEL UP!  LV ${this.hunter.level}`, 150);
    this.fx.burst(this.player.x, this.player.y, 'star', 20, 14, { vy: -1, life: 50, fade: true, glow: 1 });
  }
  /** Boss music and name banner. Bosses call this when their entrance finishes. */
  bossIntro() {
    const info = BOSSES[this.room.def.boss || ''];
    this.music.play('boss', 0.1);
    if (info) this.banner = { text: info.name, sub: info.sub, t: 220 };
  }
  /** Flip a persistent world switch (levers). Drains water and opens gates tied to it. */
  setFlag(flag: string) {
    const h = this.hunter, def = this.room.def;
    if (!flag || h.flags.includes(flag)) return;
    h.flags.push(flag);
    if (def.drainFlag === flag && this.room.water) {
      this.drainT = 1; // updateDrain() lowers the water, then opens the gates
      this.message('THE SLUICE GROANS OPEN...', 150);
    } else if (def.gateFlag === flag) this.openGates();
    if (def.sealFlag === flag) {
      // the avalanche has packed the doorway with snow
      this.room.seal();
      this.paintRoomTiles();
      this.message('THE WAY BACK IS BURIED', 180);
      this.music.play('pass', 2);
    }
  }

  /** Caught by the avalanche: fade out and start the room again from where she came in. */
  restartRoom() {
    const e = this.entry, p = this.player;
    const x = clamp(e.x, 24, this.room.W - 24); // never on the edge, or she'd walk straight out
    this.trans = { t: 0, to: this.room.def, x, y: e.bottom - p.hh, vx: 0, vy: 0 };
    this.state = 'transition';
    p.invuln = 90;
  }

  openGates() {
    this.room.openGates();
    this.paintRoomTiles();
    this.audio.play('gate');
    this.shake(4, 30);
  }

  /**
   * Tidal rooms: the surface eases between the room's low and high rows on a fixed
   * cycle (TIDE_PERIOD frames), resting a few seconds at each end. It follows the play
   * clock, so the tide keeps its rhythm when you leave and come back.
   */
  updateTide() {
    const tide = this.room.def.tide!, room = this.room;
    const phase = (this.hunter.time % TIDE_PERIOD) / TIDE_PERIOD;
    const f = clamp(0.5 - 0.75 * Math.cos(phase * Math.PI * 2), 0, 1); // 0 = low, 1 = high, flat at both ends
    const y = (tide.low + (tide.high - tide.low) * f) * TILE + 4;
    room.water = room.tideRect(y);
    this.waterFront?.setRect(room.water);
    // the water starting to move: a rumble and slosh so you know it's coming
    const moving = f > 0.01 && f < 0.99;
    if (moving && this.tideLevel >= 0 && (this.tideLevel <= 0.01 || this.tideLevel >= 0.99)) {
      this.audio.play('tide');
      this.shake(1, 40);
      this.message(f > this.tideLevel ? 'THE WATER IS RISING' : 'THE WATER RECEDES', 120);
    }
    this.tideLevel = f;
  }

  /** Put a tidal room's surface at pixel row y (a boss that runs its own water calls this every frame). */
  setWater(y: number) {
    const room = this.room;
    room.water = room.tideRect(y);
    this.waterFront?.setRect(room.water);
    const tide = room.def.tide;
    if (tide) this.tideLevel = clamp((tide.low * TILE + 4 - y) / ((tide.low - tide.high) * TILE), 0, 1);
  }

  /** Lower the water a little each frame; when it's gone, open the gate. */
  updateDrain() {
    const w = this.room.water;
    if (!w) return;
    this.drainT++;
    const speed = 0.45;
    w.y += speed;
    w.h -= speed;
    if (this.drainT % 24 === 1) {
      this.audio.play('drain');
      this.shake(1.5, 12);
    }
    if (this.drainT % 3 === 0) this.fx.burst(rand(w.x + 8, w.x + w.w - 8), w.y - 2, 'splash', 1, 0, { life: 18 });
    if (w.h > 2) {
      this.waterFront?.setRect(w);
      this.backdrop?.setWaterLevel?.(w.y);
      return;
    }
    // fully drained
    this.drainT = 0;
    this.room.drain();
    if (this.waterFront) {
      this.view.world.remove(this.waterFront.mesh);
      disposeTree(this.waterFront.mesh);
      this.waterFront = null;
    }
    this.openGates();
    this.message('A GATE GRINDS OPEN IN THE DEPTHS', 180);
  }

  /** Called by a boss when its death animation ends. */
  onBossDefeated() {
    const id = this.room.def.boss || '';
    const info = BOSSES[id];
    const h = this.hunter;
    this.musicDuck = 1;
    if (!h.flags.includes(`boss_${id}`)) h.flags.push(`boss_${id}`);
    if (id === 'wyrm') h.bossDefeated = true;
    // bosses never go through Enemy.die(), so award XP and the bestiary entry here
    h.kills++;
    h.bestiary[id] = (h.bestiary[id] || 0) + 1;
    if (ENEMY[id] && h.gainXp(ENEMY[id].xp)) this.levelUp();
    // reopen the doors walled up when the fight began
    for (const [x, y] of this.sealedDoors) this.room.set(x, y, '.');
    this.sealedDoors = [];
    this.paintRoomTiles();
    this.audio.play('gate');
    if (info?.flag) this.setFlag(info.flag);
    this.spawnBossRewards();
    if (this.room.def.warp) this.spawn(new Warp(this, this.room.def.warp)); // the way out opens
    this.music.play(ZONE_INFO[this.room.def.zone]?.music || 'save', 2);
    this.banner = { text: 'Victory', sub: `${info?.name || 'the beast'} is slain`, t: 200 };
    if (info?.after) this.message(info.after, 240);
  }

  /**
   * A boss room's items drop in from above once the boss is dead. They float down a short
   * way from the hero (not at their placed spot, which may be across the arena), inside a
   * beacon of light, and the HUD points at them until they're picked up.
   */
  spawnBossRewards() {
    const def = this.room.def, p = this.player;
    let n = 0;
    for (const e of def.ents) {
      const key = `${def.id}:${e.x},${e.y}`;
      if (e.t !== 'i' || this.hunter.collected.includes(key)) continue;
      // a couple of tiles in front of the hero (toward the middle of the room), on the floor below
      const toMid = p.x < this.room.W / 2 ? 1 : -1;
      const x = clamp(p.x + toMid * (40 + n * 24), 40, this.room.W - 40);
      const bottom = this.floorBelow(x, p.y);
      const item = new Pickup(this, x, bottom - 8 - 70, e.arg!, key);
      item.sinkTo = bottom - 8; // floats down into place
      item.setBeacon(this);
      this.spawn(item);
      this.fx.burst(x, bottom - 70, 'star', 16, 12, { vy: -0.5, life: 60, fade: true, glow: 1 });
      n++;
    }
    if (n) {
      this.audio.play('relic');
      this.message('A RELIC FALLS FROM THE BEAST', 220);
    }
  }
  /** The y of the first floor (solid or one-way) at or below y in column x. */
  floorBelow(x: number, y: number) {
    const tx = Math.floor(x / TILE);
    for (let ty = Math.max(0, Math.floor(y / TILE)); ty < this.room.rows; ty++) {
      if (this.room.floorAt(tx, ty)) return ty * TILE;
    }
    return this.room.H - 2 * TILE;
  }
  onPlayerDeath() {
    this.deathT = 1;
    this.music.stop(2);
    this.saveMusic.stop(1);
    this.input.mirror = false;
  }

  /** Debug tour (open the page with #tour): visits every map cell of every room. */
  startTour() {
    this.touring = true;
    this.hunter = new Hunter();
    this.hunter.hp = this.hunter.maxHp = 99999;
    this.hunter.grapple = true;
    const stops: { d: RoomDef; cx: number; cy: number }[] = [];
    for (const d of this.defs) for (let cy = 0; cy < d.h; cy++) for (let cx = 0; cx < d.w; cx++) stops.push({ d, cx, cy });
    let i = 0;
    const next = () => {
      const s = stops[i % stops.length];
      i++;
      this.state = 'play';
      this.loadRoom(s.d, s.cx * CELL_W + CELL_W / 2, s.cy * CELL_H + CELL_H - 2 * TILE);
      this.player.invuln = 99999;
      this.message(`${s.d.id} ${s.cx},${s.cy}`, 200);
      if (s.d.boss && !this.boss) {
        this.player.x = 200;
        this.startBoss();
      }
    };
    next();
    setInterval(next, 3000);
  }

  // ------------------------------------------------------------ tick

  tick() {
    this.frame++;
    this.input.update();
    switch (this.state) {
      case 'title':
      case 'select':
      case 'intro':
      case 'pause':
      case 'map':
      case 'gameover':
        this.ui.update();
        break;
      case 'talk':
        this.ui.updateTalk();
        break;
      case 'shop':
        this.ui.updateShop();
        break;
      case 'dialog':
        if (this.input.confirm || this.input.cancel) {
          this.state = 'play';
          this.dialog = [];
          this.audio.play('confirm');
          this.input.flush();
        }
        break;
      case 'transition':
        this.updateTransition();
        break;
      case 'play':
        this.updatePlay();
        break;
      case 'edit':
        this.editor.update();
        break;
    }
    // ambient visuals keep animating
    const t = this.frame / 60;
    if (this.backdrop) this.backdrop.update(t, this.view.camX, this.view.camY);
    if (this.waterFront) this.waterFront.update(t);
  }

  updatePlay() {
    const inp = this.input, p = this.player;
    if (this.cutscene) this.cutscene.update();
    else if (p.alive && this.deathT === 0) {
      if (inp.pressed('pause')) {
        this.ui.openPause();
        return;
      }
      if (inp.pressed('map')) {
        this.ui.openMap();
        return;
      }
    }
    if (this.freezeT > 0) {
      // a boss's freeze frame: everything holds still on its pose (only the camera settles)
      if (this.flashWhite > 0) this.flashWhite--;
      this.updateCamera();
      if (--this.freezeT === 0) this.endFreeze();
      return;
    }
    if (this.hitstopT > 0) {
      this.hitstopT--;
      return;
    }
    this.hunter.time++;
    this.hint = '';
    this.testTick?.();
    p.update();
    if (this.drainT > 0) this.updateDrain();
    if (this.room.def.tide && !this.tideHold) this.updateTide();
    for (let i = 0; i < this.ents.length; i++) {
      const e = this.ents[i];
      if (!e.dead) e.update(this);
    }
    // the raised shield stops physical shots that fly into it from the side it faces
    if (p.guarding) {
      const sb = p.shieldBox();
      for (const e of this.ents) {
        if (!e.hostile || e.dead || e.hitType() !== 'shot' || !overlap(e, sb)) continue;
        // judge it by the way it's flying (back along its path), or by where it is if it isn't moving
        const v = e as any, vx = v.vx || 0, vy = v.vy || 0;
        if (!(vx || vy ? p.shieldFaces(-vx, -vy) : p.shieldFaces(e.x - p.x, e.y - p.y))) continue;
        p.shieldClank(e.y);
        if (e instanceof EnemyShot) e.strike(this, false);
        else e.dead = true;
      }
    }
    // contact damage
    if (p.alive && p.invuln <= 0 && p.state !== 'dead') {
      const pb = { x: p.x, y: p.y, hw: p.hw - 1, hh: p.hh - 2 };
      for (const e of this.ents) {
        if (!e.hostile || e.dead) continue;
        const any = e as any;
        if (any.touches ? any.touches(pb) : overlap(e, pb)) {
          // a shot "comes from" back along its flight, so the shield judges its real angle
          const type = e.hitType();
          const shot = type === 'shot' && any.vx !== undefined;
          const fx = shot ? e.x - any.vx * 8 : e.x;
          let fy = shot ? e.y - any.vy * 8 : e.y;
          // a lunge that runs into the raised shield itself (a pounce arcing in high) is judged
          // where it meets the shield, not by where its center happens to be
          if (type === 'melee' && p.guarding && overlap(e, p.shieldBox())) fy = p.shieldBox().y;
          const hp = this.hunter.hp;
          p.takeDamage(e.touchDmg, fx, false, true, type, fy);
          if (p.justBlocked) e.onBlocked?.(this); // a lunge into the shield stops dead
          if (e instanceof EnemyShot) e.strike(this, this.hunter.hp < hp);
          break;
        }
      }
    }
    // cleanup
    if (this.beacons.length) this.beacons = this.beacons.filter((b) => !b.dead);
    for (let i = this.ents.length - 1; i >= 0; i--)
      if (this.ents[i].dead && !(this.ents[i] === this.boss && !this.boss.gone)) {
        this.ents[i].destroy();
        this.ents.splice(i, 1);
      }
    this.updateSaveAura();
    this.fx.update();
    // boss trigger
    // boss trigger: once the hero is a few tiles inside the arena
    const rd = this.room.def;
    if (rd.boss && !this.boss && !this.hunter.beaten(rd.boss) && p.x > 72 && p.x < this.room.W - 72 && p.y > 48) this.startBoss();
    // death timer
    if (this.deathT > 0 && ++this.deathT > 170) {
      this.deathT = 0;
      this.ui.openGameOver();
      return;
    }
    // room exits
    if (p.alive) this.checkExit();
    this.markVisited();
    this.updateCamera();
    if (this.msg.t > 0) this.msg.t--;
    if (this.banner.t > 0) this.banner.t--;
    for (const d of this.dmgNums) d.t++;
    this.dmgNums = this.dmgNums.filter((d) => d.t < 50);
    if (this.fadeFlash > 0) this.fadeFlash--;
    if (this.flashWhite > 0) this.flashWhite--;
  }

  startBoss() {
    const def = this.room.def, info = BOSSES[def.boss || ''];
    if (!info) return;
    // wall up every open tile on the room's outer edge (its doorways) until the boss dies
    const r = this.room;
    this.sealedDoors = [];
    for (let y = 0; y < r.rows; y++)
      for (let x = 0; x < r.cols; x++) {
        const edge = x === 0 || y === 0 || x === r.cols - 1 || y === r.rows - 1;
        if (edge && !r.solidAt(x, y)) {
          r.set(x, y, '#');
          this.sealedDoors.push([x, y]);
        }
      }
    this.paintRoomTiles();
    this.audio.play('gate');
    this.shake(4, 20);
    const w = def.ents.find((e) => e.t === 'W');
    this.boss = info.make(this, w ? w.x * TILE + 8 : r.W / 2, w ? (w.y + 1) * TILE : r.H - 2 * TILE);
    this.ents.push(this.boss);
    // the hero stops and watches it make its entrance (see bossTalk for the end of it)
    this.bossScene();
  }

  updateCamera() {
    // how much room the camera leaves round the boss and the hero when it frames them both
    const BOSS_PAD_X = 64, BOSS_PAD_Y = 60, HERO_PAD_X = 48, HERO_PAD_Y = 44;
    const p = this.player, r = this.room, v = this.view;
    // a boss can ask for the camera to pull back a touch while you fight it (Boss.camZoom);
    // it eases there slowly, keeping the middle of the view where it is
    const b = this.boss && !this.boss.dead ? this.boss : null;
    let wantZ = b ? b.camZoom || 1 : 1;
    // ...and the boss never leaves the picture (0.27.0): the camera pulls back as far as it
    // must to hold the hero and the boss together, up to the whole room
    const frame = b && !this.bossShow && !b.camFree ? { x: clamp(b.x, 0, r.W), y: clamp(b.y, 0, r.H) } : null;
    if (frame) {
      const cap = Math.max(wantZ, Math.min(2.2, Math.max(r.W / VW, r.H / VH)));
      wantZ = clamp(Math.max((Math.abs(frame.x - p.x) + BOSS_PAD_X + HERO_PAD_X) / VW, (Math.abs(frame.y - p.y) + BOSS_PAD_Y + HERO_PAD_Y) / VH), wantZ, cap);
    }
    if (v.zoom !== wantZ) {
      // out quickly (so a lunge can't outrun it), back in slowly
      const z = Math.abs(wantZ - v.zoom) < 0.002 ? wantZ : v.zoom + (wantZ - v.zoom) * (wantZ > v.zoom ? 0.08 : 0.02);
      v.camX -= (VW * z - v.viewW) / 2;
      v.camY -= (VH * z - v.viewH) / 2;
      v.zoom = z;
    }
    const VWz = v.viewW, VHz = v.viewH;
    // the hero stays in the middle when the boss fits beside her; otherwise the view slides
    // just far enough toward the boss to take it in
    let fx = p.x, fy = p.y - 8;
    if (frame) {
      const rx = Math.max(0, VWz / 2 - BOSS_PAD_X), ry = Math.max(0, VHz / 2 - BOSS_PAD_Y);
      fx = clamp(fx, frame.x - rx, frame.x + rx);
      fy = clamp(fy, frame.y - ry, frame.y + ry);
    }
    const tx = clamp(fx - VWz / 2, 0, Math.max(0, r.W - VWz));
    const ty = clamp(fy - VHz / 2, 0, Math.max(0, r.H - VHz));
    if (this.bossShow && this.boss) {
      // the camera follows the boss while it shows itself off, keeping it in the top two
      // thirds of the screen: its name goes across the lower third, the dialogue at the bottom
      const b = this.boss, bx = clamp(b.x - VWz / 2, 0, Math.max(0, r.W - VWz)), by = clamp(b.y - VHz / 3, 0, Math.max(0, r.H - VHz));
      v.camX += (bx - v.camX) * 0.05;
      v.camY += (by - v.camY) * 0.05;
    } else if (!this.cutscene?.holdCam) {
      v.camX += (tx - v.camX) * 0.25;
      v.camY += (ty - v.camY) * 0.14;
      if (Math.abs(tx - v.camX) < 0.5) v.camX = tx;
      if (Math.abs(ty - v.camY) < 0.5) v.camY = ty;
    }
    if (this.shakeT > 0) {
      this.shakeT--;
      v.shakeX = rand(-1, 1) * this.shakeAmt;
      v.shakeY = rand(-1, 1) * this.shakeAmt;
      v.camX = clamp(v.camX, -this.shakeAmt, r.W);
    } else {
      v.shakeX = v.shakeY = 0;
      this.shakeAmt = 0;
    }
  }

  checkExit() {
    const p = this.player, r = this.room;
    let out = false;
    if (p.x < 0 || p.x > r.W || p.y < -4 || p.y > r.H) out = true;
    if (!out) return;
    const gx = r.ox + p.x, gy = r.oy + p.y;
    const cx = Math.floor(gx / CELL_W), cy = Math.floor(gy / CELL_H);
    const to = this.roomAt(cx, cy);
    if (!to) {
      // no room there. Sideways and down that's a wall; above an open-topped room it's
      // open sky, so the hero may fly up out of view and fall back (no invisible ceiling)
      p.x = clamp(p.x, 4, r.W - 4);
      p.y = clamp(p.y, -CELL_H / 2, r.H - 4);
      return;
    }
    let vy = p.vy;
    if (p.y < 0) vy = Math.min(vy, -5.5); // pop up through holes
    this.trans = { t: 0, to, x: gx - to.gx * CELL_W, y: gy - to.gy * CELL_H, vx: p.vx, vy };
    this.state = 'transition';
  }

  updateTransition() {
    const tr = this.trans!;
    tr.t++;
    if (tr.t <= 8) this.fade = tr.t / 8;
    if (tr.t === 8) {
      const p = this.player;
      const keep = { vx: tr.vx, vy: tr.vy };
      const st = p.state;
      this.loadRoom(tr.to, tr.x, tr.y + p.hh, keep);
      // a slide carries on through the doorway (it may be a one-tile tunnel on the other side too)
      if (st === 'hurt' || st === 'normal' || st === 'dash' || st === 'yank') p.set('normal');
      // nudge out of solids
      for (let i = 0; i < 24 && p.overlapsSolid(); i++) p.y -= 2;
    }
    if (tr.t > 8) this.fade = Math.max(0, 1 - (tr.t - 8) / 8);
    if (tr.t >= 16) {
      this.fade = 0;
      this.trans = null;
      this.state = 'play';
    }
  }

  // ------------------------------------------------------------ render

  render() {
    if (this.room && this.player) {
      if (this.state === 'edit') this.player.hide(); // the editor draws a ghost instead
      else if (this.state !== 'title' && this.state !== 'select' && this.state !== 'intro') {
        this.player.render();
        this.player.sprite.visible = true;
      }
    }
    this.view.render();
    this.ui.draw();
  }
}
