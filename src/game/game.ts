import * as THREE from 'three';
import { View, buildSheet, Sheet, makeTexture, disposeTree, recolorSheet } from '../gfx/view';
import { Input } from '../core/input';
import { AudioEngine } from '../audio/audio';
import { Music } from '../audio/music';
import { HERO, HERO_M, buildHeroSheet, buildZombieSheet, buildSkeletonSheet, buildKnightSheet, buildDrownedSheet, buildBatSheet, buildWispSheet, buildWyrmSheet, buildLibrarianSheet } from '../gfx/art_chars';
import { buildDogSheet, buildHarpySheet, buildWraithSheet, buildCrawlerSheet, buildHookjawSheet, buildEelSheet, buildCasterSheet, buildOozeSheet, buildGrubSheet, buildHandSheet, buildTomeSheet, buildChairSheet } from '../gfx/art_beasts';
import { buildHoundSheet, buildCinderHoundSheet, buildBellMotherSheet } from '../gfx/art_bosses';
import { buildItemSheet, buildCandleSheet, buildFxSheet, buildFireSheet, buildRelicFxSheet } from '../gfx/art_items';
import { paintTiles } from '../gfx/tiles';
import { buildBackdrop, buildWaterFront, Backdrop, WaterFront } from '../gfx/backdrops';
import { buildRooms, RoomDef, Zone, CHASE_FLAG, ZONE_INFO } from '../world/rooms';
import { Room, FURNITURE } from '../world/room';
import { Player } from './player';
import { Ent, HitKind, Boss } from './ent';
import { BOSSES } from './bosses';
import { FX } from './fx';
import { Hunter } from './stats';
import { Candle, Pickup, RingAnchor, Altar, EnemyShot, Lever, Sign } from './objects';
import { Avalanche, LEASH } from './avalanche';
import { Cutscene } from './cutscene';
import { spawnEnemy } from './spawn';
import { ChairProp } from './enemies_library';
import { ENEMY } from './data';
import { HeroId, heroText } from './story';
import { UI } from '../ui/ui';
import { Editor } from '../editor/editor';
import { VW, VH, TILE, CELL_W, CELL_H, STEP, SCREEN_COLS, SCREEN_ROWS } from '../config';
import { clamp, overlap, rand, Box } from '../core/util';

export type GState = 'title' | 'select' | 'intro' | 'play' | 'pause' | 'map' | 'dialog' | 'transition' | 'gameover' | 'victory' | 'edit';

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
  dog: Sheet;
  harpy: Sheet;
  wraith: Sheet;
  crawler: Sheet;
  hookjaw: Sheet;
  eel: Sheet;
  caster: Sheet;
  ooze: Sheet;
  grub: Sheet;
  hand: Sheet;
  tome: Sheet;
  chair: Sheet;
  librarian: Sheet;
  hound: Sheet;
  houndCinder: Sheet;
  bellmother: Sheet;
  items: Sheet;
  candle: Sheet;
  fx: Sheet;
  fire: Sheet;
  /** Glide wings and the shield bubble worn by the hero. */
  relicfx: Sheet;
}

/** The room a new game starts in (the opening cinematic plays there). */
const START_ROOM = 'ridge';
/** Frames for one full tide cycle in tidal rooms (low, rise, high, fall). */
const TIDE_PERIOD = 900;

export class Game {
  view = new View();
  input = new Input();
  audio = new AudioEngine();
  music = new Music(this.audio);
  sheets: Sheets;
  heroSheets: Record<HeroId, Sheet>;
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
  touring = false;
  bossName = 0;
  deathT = 0;
  victoryT = 0;
  zone: Zone | '' = '';
  lastTime = 0;
  acc = 0;
  visited = new Set<string>();

  constructor() {
    const t0 = performance.now();
    this.heroSheets = { vesna: buildSheet(buildHeroSheet(HERO)), anzel: buildSheet(buildHeroSheet(HERO_M)) };
    this.sheets = {
      hero: this.heroSheets.vesna,
      zombie: buildSheet(buildZombieSheet()),
      skeleton: buildSheet(buildSkeletonSheet()),
      knight: buildSheet(buildKnightSheet()),
      drowned: buildSheet(buildDrownedSheet()),
      bat: buildSheet(buildBatSheet()),
      wisp: buildSheet(buildWispSheet()),
      wyrm: buildSheet(buildWyrmSheet()),
      dog: buildSheet(buildDogSheet()),
      harpy: buildSheet(buildHarpySheet()),
      wraith: buildSheet(buildWraithSheet()),
      crawler: buildSheet(buildCrawlerSheet()),
      hookjaw: buildSheet(buildHookjawSheet()),
      eel: buildSheet(buildEelSheet()),
      caster: buildSheet(buildCasterSheet()),
      ooze: buildSheet(buildOozeSheet()),
      grub: buildSheet(buildGrubSheet()),
      hand: buildSheet(buildHandSheet()),
      tome: buildSheet(buildTomeSheet()),
      chair: buildSheet(buildChairSheet()),
      librarian: buildSheet(buildLibrarianSheet()),
      hound: buildSheet(buildHoundSheet()),
      houndCinder: buildSheet(buildCinderHoundSheet()), // Gnarlfang's second form
      bellmother: buildSheet(buildBellMotherSheet()),
      items: buildSheet(buildItemSheet()),
      candle: buildSheet(buildCandleSheet()),
      fx: buildSheet(buildFxSheet()),
      fire: buildSheet(buildFireSheet()),
      relicfx: buildSheet(buildRelicFxSheet()),
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
    this.hunter = new Hunter();
    this.hunter.hero = this.heroChoice;
    this.hunter.difficulty = this.difficultyChoice;
    this.applyHero();
    this.visited = new Set();
    this.boss = null;
    this.trans = null;
    this.fade = 0;
    const start = this.defs.find((d) => d.id === START_ROOM) || this.defs[0];
    const p = start.ents.find((e) => e.t === 'P')!;
    this.cutscene = new Cutscene(this); // set before loadRoom so the avalanche waits for its cue
    this.loadRoom(start, p.x * TILE + 8, (p.y + 1) * TILE);
    this.state = 'play';
    this.cutscene.begin();
  }

  continueGame() {
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

  /** One sheet per ENEMY entry: variants get a recolored copy of their base enemy's sheet. */
  buildEnemySheets() {
    this.enemySheets = {};
    for (const [id, st] of Object.entries(ENEMY)) {
      const base = (this.sheets as any)[st.base || id] as Sheet | undefined;
      if (!base) continue;
      this.enemySheets[id] = st.colors && Object.keys(st.colors).length ? recolorSheet(base, st.colors) : base;
    }
  }
  enemySheet(kind: string): Sheet {
    return this.enemySheets[kind] || (this.sheets as any)[ENEMY[kind]?.base || kind];
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
    for (const e of this.ents) e.destroy();
    this.ents = [];
    this.rings = [];
    this.beacons = [];
    this.boss = null;
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
        case 'W':
        case 'P':
          break;
        default: {
          const en = spawnEnemy(this, e.t, x, bottom, e.arg);
          if (en) this.ents.push(en);
        }
      }
    }
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
    const dmg = Math.max(1, Math.round(raw - e.def));
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

  attackBox(b: Box, hitId: number, base: number, fromX: number, kind: HitKind) {
    for (const e of this.ents) {
      if (!e.whipTarget || e.dead || e.lastHit === hitId || e === (b as any)) continue;
      const any = e as any;
      if (any.hitBox ? any.hitBox(b) : overlap(b, e)) {
        e.lastHit = hitId;
        this.dealHit(e, base, fromX, kind);
      }
    }
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
    if (info?.victory) this.victoryT = 1;
    else {
      this.music.play(ZONE_INFO[this.room.def.zone]?.music || 'save', 2);
      this.banner = { text: 'Victory', sub: `${info?.name || 'the beast'} is slain`, t: 200 };
    }
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
      case 'victory':
        this.ui.update();
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
    else if (p.alive && this.deathT === 0 && this.victoryT === 0) {
      if (inp.pressed('pause')) {
        this.ui.openPause();
        return;
      }
      if (inp.pressed('map')) {
        this.ui.openMap();
        return;
      }
    }
    if (this.hitstopT > 0) {
      this.hitstopT--;
      return;
    }
    this.hunter.time++;
    this.hint = '';
    p.update();
    if (this.drainT > 0) this.updateDrain();
    if (this.room.def.tide) this.updateTide();
    for (let i = 0; i < this.ents.length; i++) {
      const e = this.ents[i];
      if (!e.dead) e.update(this);
    }
    // contact damage
    if (p.alive && p.invuln <= 0 && p.state !== 'dead') {
      const pb = { x: p.x, y: p.y, hw: p.hw - 1, hh: p.hh - 2 };
      for (const e of this.ents) {
        if (!e.hostile || e.dead) continue;
        const any = e as any;
        if (any.touches ? any.touches(pb) : overlap(e, pb)) {
          p.takeDamage(e.touchDmg, e.x);
          if (e instanceof EnemyShot) {
            e.dead = true;
            this.fx.burst(e.x, e.y, 'burst', 1);
          }
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
    this.fx.update();
    // boss trigger
    // boss trigger: once the hero is a few tiles inside the arena
    const rd = this.room.def;
    if (rd.boss && !this.boss && !this.hunter.beaten(rd.boss) && p.x > 72 && p.x < this.room.W - 72 && p.y > 48) this.startBoss();
    // death / victory timers
    if (this.deathT > 0 && ++this.deathT > 170) {
      this.deathT = 0;
      this.ui.openGameOver();
      return;
    }
    if (this.victoryT > 0 && ++this.victoryT > 200) {
      this.victoryT = 0;
      this.ui.openVictory();
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
  }

  updateCamera() {
    const p = this.player, r = this.room, v = this.view;
    const tx = clamp(p.x - VW / 2, 0, Math.max(0, r.W - VW));
    const ty = clamp(p.y - VH / 2 - 8, 0, Math.max(0, r.H - VH));
    if (!this.cutscene?.holdCam) {
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
