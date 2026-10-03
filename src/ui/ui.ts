// HUD, menus, title, map and end screens — all drawn on the 2D overlay canvas.
import type { Game } from '../game/game';
import { drawText, drawBigText, textWidth } from '../gfx/font';
import { VW, VH, SCREEN_COLS, SCREEN_ROWS } from '../config';
import { ITEMS, ENEMY, PICKUP_NAMES, dropChance, DIFFICULTIES, SHOP } from '../game/data';
import { drawHud, HUD_STYLES, HudStyle, loadHudStyle, saveHudStyle } from './hud';
import { Hunter } from '../game/stats';
import { REBINDABLE, keyLabel, PAD_NAMES, Action, ACTION_LABEL } from '../core/input';
import type { Sheet } from '../gfx/view';
import { clamp } from '../core/util';
import { INTRO, CINE, HEROES, HeroId, heroText, SPEAKERS, Line, Face } from '../game/story';
import { ZONE_INFO } from '../world/rooms';
import { startTest, testEntries, TestEntry } from '../game/test_chamber';

/** The equipment slots on the EQUIP page, top to bottom. */
type EquipSlot = 'whip' | 'shield' | 'armor' | 'acc1' | 'acc2';

const ROOM_ROWS = 12; // rooms shown at once in the TEST ROOM list
const TALK_SPEED = 1.2; // characters a frame the dialogue types out
const TALK_BOX = { x: 8, y: VH - 62, w: VW - 16, h: 56 }; // the dialogue box
const INTRO_SPEED = 0.45; // px per frame the crawl scrolls up
const INTRO_FRAMES = Math.ceil((VH + INTRO.length * 14 + 30) / INTRO_SPEED);

/** Where the map grid is drawn (inside the map panel), and the largest zoom in px per cell. */
const MAP_AREA = { x: 10, y: 24, w: VW - 20, h: VH - 58 };
const MAP_MAX_CW = 40;

const GOLD = '#d8b060';
const PALE = '#e8dcc8';
const DIM = '#8a7a90';
const RED = '#e04050';

type PauseTab = 'status' | 'equip' | 'items' | 'relics' | 'bestiary' | 'map' | 'controls' | 'sound' | 'title';
const TABS: { id: PauseTab; label: string }[] = [
  { id: 'status', label: 'STATUS' },
  { id: 'equip', label: 'EQUIP' },
  { id: 'items', label: 'ITEMS' },
  { id: 'relics', label: 'RELICS' },
  { id: 'bestiary', label: 'BESTIARY' },
  { id: 'map', label: 'MAP' },
  { id: 'controls', label: 'CONTROLS' },
  { id: 'sound', label: 'OPTIONS' },
  { id: 'title', label: 'QUIT TO TITLE' },
];

export class UI {
  ctx: CanvasRenderingContext2D;
  t = 0;
  /** Which status display to draw (OPTIONS > HUD STYLE, see hud.ts). */
  hudStyle: HudStyle = loadHudStyle();
  // title
  titleSel = 0;
  titleOpts: string[] = [];
  titleControls = false;
  roomPick = false; // TEST ROOM: the room list is open
  roomSel = 0; // index into g.defs
  enemyPick: TestEntry[] | null = null; // TEST ENEMY: the enemy list, while it's open
  enemySel = 0;
  heroSel = 0; // character select: 0 = Vesna, 1 = Anzel
  selStep: 'hero' | 'difficulty' = 'hero'; // the select screen asks for the twin, then the difficulty
  diffSel = 0; // index into DIFFICULTIES
  introT = 0;
  // pause
  tab = 0;
  focus: 'tabs' | 'panel' | 'pick' | 'capture' = 'tabs';
  sel = 0;
  pickSel = 0;
  capturePad = false;
  quitConfirm = false;
  // end screens
  endSel = 0;
  endT = 0;
  mapFromPause = false;
  mapZoom = 1; // 1 = the whole world fits; zooming in multiplies the cell size
  mapCur = { x: 0, y: 0 }; // map cursor, in map cells

  constructor(private g: Game) {
    this.ctx = g.view.ctx;
  }

  // ================================================================ flow

  enterTitle() {
    const g = this.g;
    g.state = 'title';
    g.hunter = new Hunter();
    g.zone = '';
    g.cutscene = null;
    g.input.script = null;
    const start = g.defs[0];
    g.loadRoom(start, 60 * 16, start.h * SCREEN_ROWS * 16 - 2 * 16); // on the floor of the bottom cell
    g.view.camX = g.room.W - VW;
    g.view.camY = g.room.H - VH;
    g.player.sprite.visible = false;
    g.banner.t = 0;
    this.titleOpts = Hunter.hasSave() ? ['CONTINUE', 'NEW GAME', 'TEST ROOM', 'TEST ENEMY', 'CONTROLS'] : ['NEW GAME', 'TEST ROOM', 'TEST ENEMY', 'CONTROLS'];
    this.titleSel = 0;
    this.titleControls = false;
    this.roomPick = false;
    this.enemyPick = null;
    if (g.audio.ctx) g.music.play('title');
    else g.music.stop();
  }

  openPause() {
    const g = this.g;
    g.state = 'pause';
    this.tab = 0;
    this.focus = 'tabs';
    this.sel = 0;
    this.quitConfirm = false;
    g.audio.play('pause');
  }
  openMap() {
    this.g.state = 'map';
    this.mapFromPause = false;
    this.g.audio.play('pause');
    this.resetMapCursor();
  }
  /** Put the map cursor on the hero's cell (called whenever the map opens). */
  resetMapCursor() {
    const g = this.g, r = g.room;
    this.mapCur = { x: r.def.gx + g.player.x / (SCREEN_COLS * 16), y: r.def.gy + g.player.y / (SCREEN_ROWS * 16) };
  }

  /**
   * Map controls: the stick / d-pad / arrows move a cursor, the right stick (or Q / E)
   * zooms, and JUMP drops a marker (an X) under the cursor, or removes the one already there.
   */
  updateMapCursor() {
    const g = this.g, inp = g.input, h = g.hunter;
    const b = this.mapBounds();
    // zoom: cell width in screen pixels, from "whole world fits" up to MAP_MAX_CW
    const zoom = (inp.rStickY < 0 || inp.down('subNext') ? 1 : 0) - (inp.rStickY > 0 || inp.down('subPrev') ? 1 : 0);
    if (zoom) this.mapZoom = clamp(this.mapZoom * (zoom > 0 ? 1.03 : 1 / 1.03), 1, MAP_MAX_CW / b.fitCW);
    const cw = this.mapCW(b);
    // the cursor moves at a steady speed on screen, whatever the zoom
    const dx = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    const dy = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
    const cur = this.mapCur;
    cur.x = clamp(cur.x + (dx * 2.2) / cw, b.minX, b.maxX + 1);
    cur.y = clamp(cur.y + (dy * 2.2) / (cw * 0.8), b.minY, b.maxY + 1);
    if (inp.pressed('jump')) {
      // remove a marker near the cursor, or place a new one
      const near = h.marks.findIndex(([mx, my]) => Math.abs(mx - cur.x) * cw < 6 && Math.abs(my - cur.y) * cw * 0.8 < 6);
      if (near >= 0) h.marks.splice(near, 1);
      else h.marks.push([Math.round(cur.x * 100) / 100, Math.round(cur.y * 100) / 100]);
      g.audio.play('mark');
    }
  }
  /** The world's extent in map cells, and the cell width that fits all of it in the panel. */
  mapBounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of this.g.defs) {
      minX = Math.min(minX, d.gx);
      maxX = Math.max(maxX, d.gx + d.w - 1);
      minY = Math.min(minY, d.gy);
      maxY = Math.max(maxY, d.gy + d.h - 1);
    }
    const fitCW = Math.min(20, (MAP_AREA.w - 4) / (maxX - minX + 1), (MAP_AREA.h - 4) / ((maxY - minY + 1) * 0.8));
    return { minX, maxX, minY, maxY, fitCW };
  }
  mapCW(b: { fitCW: number }) {
    return Math.max(1, Math.round(b.fitCW * this.mapZoom));
  }
  openGameOver() {
    this.g.state = 'gameover';
    this.endSel = 0;
    this.endT = 0;
    this.g.music.play('gameover');
  }

  // ================================================================ update

  update() {
    this.t++;
    const g = this.g, inp = g.input;
    switch (g.state) {
      case 'title':
        return this.updateTitle();
      case 'select':
        return this.updateSelect();
      case 'intro':
        this.introT++;
        if (inp.confirm || inp.cancel || this.introT > INTRO_FRAMES) {
          g.audio.play('confirm');
          g.newGame();
          inp.flush();
        }
        return;
      case 'pause':
        return this.updatePause();
      case 'map':
        if (inp.cancel || inp.pressed('map') || inp.pressed('pause')) {
          g.audio.play('cancel');
          if (this.mapFromPause) {
            g.state = 'pause';
            this.focus = 'tabs';
          } else g.state = 'play';
          inp.flush();
          return;
        }
        this.updateMapCursor();
        return;
      case 'gameover':
        this.endT++;
        if (this.endT < 60) return;
        if (inp.mUp || inp.mDown) {
          this.endSel = 1 - this.endSel;
          g.audio.play('menu');
        }
        if (inp.confirm) {
          g.audio.play('confirm');
          // a test run restarts in its test room instead of loading the real save
          const test = g.testRun && g.defs.find((d) => d.id === g.testRun);
          if (this.endSel === 0) test ? g.testRoom(test) : g.continueGame();
          else this.enterTitle();
          inp.flush();
        }
        return;
    }
  }

  updateTitle() {
    const g = this.g, inp = g.input;
    if (!g.audio.ctx) return; // waiting for first key
    if (this.titleControls) {
      if (inp.cancel || inp.confirm) {
        this.titleControls = false;
        g.audio.play('cancel');
      }
      return;
    }
    if (this.roomPick) return this.updateRoomPick();
    if (this.enemyPick) return this.updateEnemyPick();
    if (inp.mUp) {
      this.titleSel = (this.titleSel + this.titleOpts.length - 1) % this.titleOpts.length;
      g.audio.play('menu');
    }
    if (inp.mDown) {
      this.titleSel = (this.titleSel + 1) % this.titleOpts.length;
      g.audio.play('menu');
    }
    if (inp.confirm) {
      const o = this.titleOpts[this.titleSel];
      g.audio.play('confirm');
      if (o === 'NEW GAME') {
        g.state = 'select';
        this.selStep = 'hero';
        this.heroSel = g.heroChoice === 'anzel' ? 1 : 0;
      } else if (o === 'CONTINUE') {
        g.continueGame();
      } else if (o === 'TEST ROOM') {
        this.roomPick = true;
      } else if (o === 'TEST ENEMY') {
        this.enemyPick = testEntries();
        this.enemySel = clamp(this.enemySel, 0, this.enemyPick.length - 1);
      } else this.titleControls = true;
      inp.flush();
    }
  }

  /**
   * TEST ROOM list: up/down picks a room, left/right jumps a page, confirm starts
   * there with every power (Game.testRoom), cancel goes back to the title menu.
   */
  updateRoomPick() {
    const g = this.g, inp = g.input, n = g.defs.length;
    const step = inp.mUp ? -1 : inp.mDown ? 1 : inp.mLeft ? -ROOM_ROWS : inp.mRight ? ROOM_ROWS : 0;
    if (step) {
      // up/down wrap around the list, page jumps stop at its ends
      this.roomSel = Math.abs(step) === 1 ? (this.roomSel + step + n) % n : clamp(this.roomSel + step, 0, n - 1);
      g.audio.play('menu');
    }
    if (inp.cancel) {
      this.roomPick = false;
      g.audio.play('cancel');
      inp.flush();
    } else if (inp.confirm) {
      g.audio.play('confirm');
      this.roomPick = false;
      g.testRoom(g.defs[this.roomSel]);
      inp.flush();
    }
  }

  /**
   * TEST ENEMY list: the same controls as TEST ROOM. Confirm starts the enemy test chamber
   * with that enemy, or a boss's real fight in its arena (see game/test_chamber.ts).
   */
  updateEnemyPick() {
    const g = this.g, inp = g.input, list = this.enemyPick!, n = list.length;
    const step = inp.mUp ? -1 : inp.mDown ? 1 : inp.mLeft ? -ROOM_ROWS : inp.mRight ? ROOM_ROWS : 0;
    if (step) {
      this.enemySel = Math.abs(step) === 1 ? (this.enemySel + step + n) % n : clamp(this.enemySel + step, 0, n - 1);
      g.audio.play('menu');
    }
    if (inp.cancel) {
      this.enemyPick = null;
      g.audio.play('cancel');
      inp.flush();
    } else if (inp.confirm) {
      g.audio.play('confirm');
      this.enemyPick = null;
      startTest(g, list[this.enemySel].arg);
      inp.flush();
    }
  }

  /**
   * Character select (after NEW GAME): left/right picks a twin, confirm moves on to the
   * difficulty list (up/down), and confirm there starts the intro. Cancel steps back.
   */
  updateSelect() {
    const g = this.g, inp = g.input;
    if (this.selStep === 'difficulty') {
      if (inp.mUp || inp.mDown) {
        this.diffSel = (this.diffSel + (inp.mDown ? 1 : DIFFICULTIES.length - 1)) % DIFFICULTIES.length;
        g.audio.play('menu');
      }
      if (inp.cancel) {
        this.selStep = 'hero';
        g.audio.play('cancel');
        inp.flush();
      } else if (inp.confirm) {
        g.difficultyChoice = this.diffSel;
        g.audio.play('confirm');
        g.state = 'intro';
        this.introT = 0;
        inp.flush();
      }
      return;
    }
    if (inp.mLeft || inp.mRight) {
      this.heroSel = 1 - this.heroSel;
      g.audio.play('menu');
    }
    if (inp.cancel) {
      g.state = 'title';
      g.audio.play('cancel');
      inp.flush();
    } else if (inp.confirm) {
      g.heroChoice = this.heroSel ? 'anzel' : 'vesna';
      g.audio.play('confirm');
      this.selStep = 'difficulty';
      this.diffSel = g.difficultyChoice;
      inp.flush();
    }
  }

  updatePause() {
    const g = this.g, inp = g.input, h = g.hunter;
    const tab = TABS[this.tab].id;
    if (this.focus === 'capture') return; // waiting on input.captureNext
    if (this.focus === 'tabs') {
      if ((inp.pressed('pause') && !inp.confirm) || inp.cancel) {
        g.state = 'play';
        g.audio.play('cancel');
        inp.flush();
        return;
      }
      if (inp.mUp) {
        this.tab = (this.tab + TABS.length - 1) % TABS.length;
        g.audio.play('menu');
        this.quitConfirm = false;
      }
      if (inp.mDown) {
        this.tab = (this.tab + 1) % TABS.length;
        g.audio.play('menu');
        this.quitConfirm = false;
      }
      if (inp.confirm || inp.mRight) {
        if (tab === 'map') {
          g.state = 'map';
          this.mapFromPause = true;
          this.resetMapCursor();
          g.audio.play('confirm');
          return;
        }
        if (tab === 'title') {
          if (!inp.confirm) return;
          if (this.quitConfirm) {
            this.enterTitle();
            inp.flush();
          } else this.quitConfirm = true;
          g.audio.play('confirm');
          return;
        }
        if (tab === 'status') return;
        this.focus = 'panel';
        this.sel = 0;
        g.audio.play('confirm');
      }
      return;
    }
    // inside a panel
    const back = () => {
      this.focus = 'tabs';
      g.audio.play('cancel');
    };
    if (tab === 'equip') {
      const slots = ['whip', 'shield', 'armor', 'acc1', 'acc2'] as const;
      if (this.focus === 'panel') {
        if (inp.cancel || inp.mLeft) return back();
        if (inp.mUp) this.sel = (this.sel + slots.length - 1) % slots.length;
        if (inp.mDown) this.sel = (this.sel + 1) % slots.length;
        if (inp.mUp || inp.mDown) g.audio.play('menu');
        if (inp.confirm) {
          this.focus = 'pick';
          this.pickSel = 0;
          g.audio.play('confirm');
        }
      } else if (this.focus === 'pick') {
        const list = this.equipChoices(slots[this.sel]);
        if (inp.cancel) {
          this.focus = 'panel';
          g.audio.play('cancel');
          return;
        }
        if (inp.mUp) this.pickSel = (this.pickSel + list.length - 1) % list.length;
        if (inp.mDown) this.pickSel = (this.pickSel + 1) % list.length;
        if (inp.mUp || inp.mDown) g.audio.play('menu');
        if (inp.confirm) {
          const id = list[this.pickSel];
          const slot = slots[this.sel];
          if (slot === 'acc1' && id && h.equip.acc2 === id) h.equip.acc2 = '';
          if (slot === 'acc2' && id && h.equip.acc1 === id) h.equip.acc1 = '';
          (h.equip as any)[slot] = id;
          this.focus = 'panel';
          g.audio.play('item');
        }
      }
      return;
    }
    if (tab === 'items') {
      const list = Object.keys(h.inv).filter((k) => h.inv[k] > 0);
      if (inp.cancel || inp.mLeft) return back();
      if (!list.length) return;
      if (inp.mUp) this.sel = (this.sel + list.length - 1) % list.length;
      if (inp.mDown) this.sel = (this.sel + 1) % list.length;
      if (inp.mUp || inp.mDown) g.audio.play('menu');
      this.sel = Math.min(this.sel, list.length - 1);
      if (inp.confirm) {
        const id = list[this.sel];
        const it = ITEMS[id];
        if (it.heal && h.hp < h.maxHp) {
          h.hp = Math.min(h.maxHp, h.hp + it.heal);
          h.inv[id]--;
          g.audio.play('heart');
        } else g.audio.play('cancel');
      }
      return;
    }
    if (tab === 'relics') {
      // switch a found relic on or off
      const list = h.relicsFound;
      if (inp.cancel || inp.mLeft) return back();
      if (!list.length) return;
      if (inp.mUp) this.sel = (this.sel + list.length - 1) % list.length;
      if (inp.mDown) this.sel = (this.sel + 1) % list.length;
      if (inp.mUp || inp.mDown) g.audio.play('menu');
      this.sel = Math.min(this.sel, list.length - 1);
      if (inp.confirm) {
        h.toggleRelic(list[this.sel]);
        g.audio.play(h.relicOff.includes(list[this.sel]) ? 'cancel' : 'confirm');
      }
      return;
    }
    if (tab === 'bestiary') {
      const n = Object.keys(ENEMY).length;
      if (inp.cancel || inp.mLeft) return back();
      if (inp.mUp) this.sel = (this.sel + n - 1) % n;
      if (inp.mDown) this.sel = (this.sel + 1) % n;
      if (inp.mUp || inp.mDown) g.audio.play('menu');
      return;
    }
    if (tab === 'controls') {
      const n = REBINDABLE.length + 1;
      if (inp.cancel || inp.mLeft) return back();
      if (inp.mUp) this.sel = (this.sel + n - 1) % n;
      if (inp.mDown) this.sel = (this.sel + 1) % n;
      if (inp.mUp || inp.mDown) g.audio.play('menu');
      if (inp.confirm) {
        if (this.sel === REBINDABLE.length) {
          inp.resetBinds();
          g.audio.play('confirm');
          return;
        }
        const action = REBINDABLE[this.sel] as Action;
        this.focus = 'capture';
        g.audio.play('confirm');
        // wait a moment so the confirm press itself isn't captured
        setTimeout(() => {
          inp.captureNext((b) => {
            if (b.type === 'key') {
              if (b.code !== 'Escape') {
                inp.bindKeys[action] = [b.code, ...inp.bindKeys[action].filter((k) => k !== b.code)].slice(0, 2);
              }
            } else {
              inp.bindPad[action] = [b.btn];
            }
            inp.saveBinds();
            this.focus = 'panel';
            g.audio.play('item');
            inp.flush();
          });
        }, 150);
      }
      return;
    }
    if (tab === 'sound') {
      // OPTIONS: music volume, effects volume, difficulty, HUD style
      if (inp.cancel) return back();
      if (inp.mUp || inp.mDown) {
        this.sel = (this.sel + (inp.mDown ? 1 : 3)) % 4;
        g.audio.play('menu');
      }
      const d = (inp.mRight ? 1 : 0) - (inp.mLeft ? 1 : 0);
      if (d) {
        const vol = (v: number) => Math.max(0, Math.min(1, Math.round((v + d * 0.1) * 10) / 10));
        if (this.sel === 0) g.audio.setMusicVol(vol(g.audio.musicVol));
        else if (this.sel === 1) g.audio.setSfxVol(vol(g.audio.sfxVol));
        else if (this.sel === 2) h.difficulty = clamp(h.difficulty + d, 0, DIFFICULTIES.length - 1);
        else {
          const n = HUD_STYLES.length, k = HUD_STYLES.findIndex((s) => s.id === this.hudStyle);
          this.hudStyle = HUD_STYLES[(k + d + n) % n].id;
          saveHudStyle(this.hudStyle);
        }
        g.audio.play('menu');
      }
    }
  }

  equipChoices(slot: EquipSlot): string[] {
    const h = this.g.hunter;
    const want = slot === 'acc1' || slot === 'acc2' ? 'acc' : slot;
    const list = h.owned.filter((id) => ITEMS[id] && ITEMS[id].slot === want);
    if (want === 'acc' || want === 'shield') list.unshift('');
    return list;
  }

  // ================================================================ drawing helpers

  panel(x: number, y: number, w: number, h: number, alpha = 0.92) {
    const c = this.ctx;
    c.fillStyle = `rgba(10,6,18,${alpha})`;
    c.fillRect(x, y, w, h);
    c.fillStyle = '#6a4a2a';
    c.fillRect(x, y, w, 1);
    c.fillRect(x, y + h - 1, w, 1);
    c.fillRect(x, y, 1, h);
    c.fillRect(x + w - 1, y, 1, h);
    c.fillStyle = GOLD;
    c.fillRect(x + 2, y + 2, w - 4, 1);
    c.fillRect(x + 2, y + h - 3, w - 4, 1);
    c.fillRect(x + 2, y + 2, 1, h - 4);
    c.fillRect(x + w - 3, y + 2, 1, h - 4);
    // corner studs
    c.fillStyle = RED;
    for (const [cx, cy] of [[x + 1, y + 1], [x + w - 4, y + 1], [x + 1, y + h - 4], [x + w - 4, y + h - 4]]) c.fillRect(cx, cy, 3, 3);
  }

  icon(sheet: Sheet, frame: string, x: number, y: number) {
    const img = sheet.tex.image as HTMLCanvasElement;
    const idx = sheet.anims[frame]?.[0];
    if (idx === undefined) return;
    const cx = (idx % sheet.cols) * sheet.cw, cy = Math.floor(idx / sheet.cols) * sheet.ch;
    this.ctx.drawImage(img, cx, cy, sheet.cw, sheet.ch, Math.round(x), Math.round(y), sheet.cw, sheet.ch);
  }

  /** A small coin, centered on (x, y), for gold counts. */
  coin(x: number, y: number) {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(x - 3, y - 2, 6, 5);
    c.fillRect(x - 2, y - 3, 4, 7);
    c.fillStyle = '#d8b040';
    c.fillRect(x - 2, y - 2, 4, 5);
    c.fillStyle = '#f0d060';
    c.fillRect(x - 1, y - 1, 2, 3);
  }

  bar(x: number, y: number, w: number, h: number, frac: number, col: string, back = '#2a0e18') {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = back;
    c.fillRect(x, y, w, h);
    c.fillStyle = col;
    c.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), 1);
  }

  fmtTime(frames: number) {
    const s = Math.floor(frames / 60);
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  explored() {
    let total = 0;
    for (const d of this.g.defs) total += d.w * d.h;
    return Math.floor((this.g.visited.size / total) * 100);
  }

  // ================================================================ draw

  draw() {
    const g = this.g, c = this.ctx;
    c.clearRect(0, 0, VW, VH);
    switch (g.state) {
      case 'title':
        this.drawTitle();
        break;
      case 'select':
        this.drawSelect();
        break;
      case 'intro':
        this.drawIntro();
        break;
      case 'edit':
        g.editor.draw(c);
        break;
      default:
        this.drawHUD();
    }
    if (g.state === 'pause') this.drawPause();
    if (g.state === 'map') this.drawMap(true);
    if (g.state === 'dialog') this.drawDialog();
    if (g.state === 'talk') this.drawTalk();
    if (g.state === 'shop') this.drawShop();
    if (g.state === 'gameover') this.drawGameOver();
    if (g.fade > 0) {
      c.fillStyle = `rgba(0,0,0,${g.fade})`;
      c.fillRect(0, 0, VW, VH);
    }
    if (g.fadeFlash > 0) {
      c.fillStyle = `rgba(160,0,20,${g.fadeFlash / 24})`;
      c.fillRect(0, 0, VW, VH);
    }
    if (g.flashWhite > 0) {
      c.fillStyle = `rgba(255,255,255,${g.flashWhite / 20})`;
      c.fillRect(0, 0, VW, VH);
    }
  }

  drawHUD() {
    const g = this.g, c = this.ctx, h = g.hunter;
    // damage numbers
    for (const d of g.dmgNums) {
      const x = g.view.sx(d.x), y = g.view.sy(d.y) - Math.min(d.t, 20) * 0.6;
      if (d.t > 40 && d.t % 4 < 2) continue;
      drawText(c, d.v, x, y, d.c, '#000', 'center');
    }
    if (g.state === 'title' || g.state === 'intro') return;
    if (g.cutscene) return this.drawCutscene();
    if (g.bossShow) {
      // a boss scene: letterbox bars and its name, nothing else. On its freeze frame (and
      // while it talks) the screen darkens round it, so it stands out.
      if (g.freezeT > 0 || g.state === 'talk') this.drawVignette();
      c.fillStyle = '#000';
      c.fillRect(0, 0, VW, 18);
      c.fillRect(0, VH - 18, VW, 18);
      return this.drawBanner();
    }
    drawHud({ ctx: c, items: g.sheets.items, t: this.t }, h, this.hudStyle);
    if (g.editor.standalone && g.state === 'play') drawText(c, 'TEST PLAY - F2 TO EDIT', VW - 6, 6, GOLD, '#000', 'right');
    this.drawBeaconArrows();
    // hint & messages
    if (g.hint) {
      const w = textWidth(g.hint) + 12;
      c.fillStyle = 'rgba(6,4,12,0.7)';
      c.fillRect(Math.round(VW / 2 - w / 2), VH - 33, w, 13);
      drawText(c, g.hint, VW / 2, VH - 30, GOLD, '#000', 'center');
    }
    if (g.msg.t > 0) {
      const w = textWidth(g.msg.text) + 16;
      this.panel(VW / 2 - w / 2, 40, w, 17, 0.85);
      drawText(c, g.msg.text, VW / 2, 45, PALE, '#000', 'center');
    }
    this.drawBanner();
    // boss bar
    this.drawBossBar();
  }

  /**
   * The big title across the screen. A boss's name fades in across the lower third while the
   * camera shows it off (the camera keeps the boss in the top two thirds, see Game.updateCamera).
   * A boss on the floor of its arena can't be lifted that high (the camera stops at the room's
   * floor), so then the name goes up top instead. Picked once as it appears, so it doesn't jump.
   */
  private bannerFor: object | null = null;
  private bannerTop = false;
  drawBanner() {
    const g = this.g, c = this.ctx;
    if (g.banner.t > 0) {
      const a = Math.min(1, g.banner.t / 30, (220 - g.banner.t) / 30);
      const h = g.banner.sub ? 40 : 30;
      if (this.bannerFor !== g.banner) {
        this.bannerFor = g.banner;
        this.bannerTop = !!g.boss && g.view.sy(g.boss.y) > VH * 0.6;
      }
      const y = !g.boss ? 74 : this.bannerTop ? 24 : VH - 26 - h;
      c.globalAlpha = Math.max(0, a);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(0, y, VW, h);
      drawBigText(c, g.banner.text, VW / 2, y + 6, 2, GOLD, '#3a0a10');
      if (g.banner.sub) drawText(c, g.banner.sub, VW / 2, y + 26, PALE, '#000', 'center');
      c.globalAlpha = 1;
    }
  }

  /** A boss's freeze frame: a white flash fading into a dark red vignette centered on it. */
  drawVignette() {
    const g = this.g, c = this.ctx, b = g.boss;
    if (!b) return;
    const x = g.view.sx(b.x), y = g.view.sy(b.y);
    const grad = c.createRadialGradient(x, y, 30, x, y, 230);
    grad.addColorStop(0, 'rgba(20,0,6,0)');
    grad.addColorStop(1, 'rgba(24,0,6,0.85)');
    c.fillStyle = grad;
    c.fillRect(0, 0, VW, VH);
  }

  drawBossBar() {
    const g = this.g, c = this.ctx;
    const b = g.boss;
    if (b && b.showBar) {
      // along the bottom with the classic HUD; along the top with the orbs, which hold the bottom-left
      const y = this.hudStyle === 'classic' ? VH - 20 : 4;
      this.panel(60, y, VW - 120, 16, 0.8);
      const lw = textWidth(b.label) + 10;
      drawText(c, b.label, 66, y + 5, GOLD);
      this.bar(66 + lw, y + 6, VW - 136 - lw, 5, Math.max(0, b.hp) / b.maxHp, b.phase === 2 ? '#ff7020' : '#c02030');
    }
  }

  /**
   * A bouncing gold arrow over each boss reward still waiting to be picked up.
   * If the reward is off screen, the arrow sits at the screen edge and points toward it.
   */
  drawBeaconArrows() {
    const g = this.g, c = this.ctx;
    for (const b of g.beacons) {
      if (b.dead) continue;
      const bob = Math.sin(this.t * 0.15) * 3;
      let x = g.view.sx(b.x), y = g.view.sy(b.y) - 22 + bob;
      const off = x < 8 || x > VW - 8 || y < 8 || y > VH - 8;
      x = clamp(x, 10, VW - 10);
      y = clamp(y, 40, VH - 14);
      c.fillStyle = this.t % 20 < 10 ? '#ffe070' : '#d8a030';
      if (off) {
        // a triangle pointing at the reward from the screen edge
        const a = Math.atan2(g.view.sy(b.y) - y, g.view.sx(b.x) - x);
        c.beginPath();
        c.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
        c.lineTo(x + Math.cos(a + 2.4) * 6, y + Math.sin(a + 2.4) * 6);
        c.lineTo(x + Math.cos(a - 2.4) * 6, y + Math.sin(a - 2.4) * 6);
        c.fill();
      } else {
        // a down arrow, pixel by pixel so it stays crisp
        for (let i = 0; i < 5; i++) c.fillRect(Math.round(x - 4 + i), Math.round(y + i), 9 - i * 2, 1);
        c.fillRect(Math.round(x - 1), Math.round(y - 5), 3, 5);
      }
    }
  }

  drawTitle() {
    const g = this.g, c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(0, 0, VW, VH);
    const pulse = Math.sin(this.t * 0.03) * 0.5 + 0.5;
    drawText(c, '~ A GOTHIC TECH DEMO ~', VW / 2, 30, DIM, '#000', 'center');
    drawBigText(c, 'NOCTURNE', VW / 2, 44, 4, '#c02030', '#200408');
    drawBigText(c, 'OF ASH', VW / 2, 80, 3, GOLD, '#2a1408');
    // ornament
    c.fillStyle = GOLD;
    c.fillRect(VW / 2 - 70, 107, 140, 1);
    c.fillStyle = '#c02030';
    c.fillRect(VW / 2 - 2, 105, 5, 5);
    if (this.titleControls) return this.drawControlsCard(VW / 2 - 110, 116);
    if (this.roomPick) return this.drawRoomPick();
    if (this.enemyPick) return this.drawEnemyPick();
    if (!g.audio.ctx) {
      if (this.t % 60 < 40) drawText(c, 'PRESS ANY KEY', VW / 2, 140, PALE, '#000', 'center');
    } else {
      this.titleOpts.forEach((o, i) => {
        const sel = i === this.titleSel;
        drawText(c, (sel ? '> ' : '  ') + o + (sel ? ' <' : '  '), VW / 2, 128 + i * 13, sel ? `rgb(255,${200 + pulse * 55},${120 + pulse * 80})` : DIM, '#000', 'center');
      });
    }
    drawText(c, 'EVERY PIXEL AND NOTE GENERATED BY CODE', VW / 2, VH - 22, DIM, '#000', 'center');
    drawText(c, 'KEYBOARD OR GAMEPAD', VW / 2, VH - 12, '#5a4a60', '#000', 'center');
  }

  /** The TEST ROOM list: one line per room (zone, name), scrolled to keep the cursor in view. */
  drawRoomPick() {
    const g = this.g, c = this.ctx, defs = g.defs;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, VW, VH);
    const w = 300, x = VW / 2 - w / 2, y = 8, rowH = 13;
    this.panel(x, y, w, 30 + ROOM_ROWS * rowH);
    drawText(c, `TEST ROOM  ${this.roomSel + 1}/${defs.length}`, VW / 2, y + 7, GOLD, '#000', 'center');
    const top = clamp(this.roomSel - Math.floor(ROOM_ROWS / 2), 0, Math.max(0, defs.length - ROOM_ROWS));
    for (let i = 0; i < ROOM_ROWS && top + i < defs.length; i++) {
      const d = defs[top + i], sel = top + i === this.roomSel, ry = y + 22 + i * rowH;
      const zone = ZONE_INFO[d.zone];
      c.fillStyle = zone ? zone.color : DIM;
      c.fillRect(x + 8, ry + 1, 4, 6); // zone color swatch, as on the map
      drawText(c, (sel ? '> ' : '  ') + d.name.toUpperCase(), x + 16, ry, sel ? GOLD : PALE);
      drawText(c, (zone ? zone.name : d.zone).toUpperCase(), x + w - 8, ry, DIM, '#000', 'right');
    }
    drawText(c, 'UP/DOWN: ROOM   LEFT/RIGHT: PAGE   CONFIRM: GO   CANCEL: BACK', VW / 2, VH - 14, DIM, '#000', 'center');
  }

  /** The TEST ENEMY list: bosses first, then every enemy and variant. */
  drawEnemyPick() {
    const c = this.ctx, list = this.enemyPick!;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, VW, VH);
    const w = 300, x = VW / 2 - w / 2, y = 8, rowH = 13;
    this.panel(x, y, w, 30 + ROOM_ROWS * rowH);
    drawText(c, `TEST ENEMY  ${this.enemySel + 1}/${list.length}`, VW / 2, y + 7, GOLD, '#000', 'center');
    const top = clamp(this.enemySel - Math.floor(ROOM_ROWS / 2), 0, Math.max(0, list.length - ROOM_ROWS));
    for (let i = 0; i < ROOM_ROWS && top + i < list.length; i++) {
      const e = list[top + i], sel = top + i === this.enemySel, ry = y + 22 + i * rowH;
      drawText(c, (sel ? '> ' : '  ') + e.name.toUpperCase(), x + 10, ry, sel ? GOLD : PALE);
      if (e.tag) drawText(c, e.tag, x + w - 8, ry, e.tag === 'BOSS' ? '#e07060' : DIM, '#000', 'right');
    }
    drawText(c, 'UP/DOWN: ENEMY   LEFT/RIGHT: PAGE   CONFIRM: GO   CANCEL: BACK', VW / 2, VH - 24, DIM, '#000', 'center');
    drawText(c, 'F3 IN GAME OPENS THE ENEMY EDITOR', VW / 2, VH - 13, '#5a4a60', '#000', 'center');
  }

  drawSelect() {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, VW, VH);
    drawBigText(c, 'CHOOSE YOUR HUNTER', VW / 2, 18, 2, GOLD, '#2a1408');
    const ids: HeroId[] = ['vesna', 'anzel'];
    ids.forEach((id, i) => {
      const sel = i === this.heroSel;
      const cx = VW / 2 + (i ? 70 : -70), top = 34;
      this.panel(cx - 64, top, 128, 152, sel ? 0.95 : 0.6);
      if (sel) {
        c.strokeStyle = GOLD;
        c.strokeRect(cx - 62.5, top + 2.5, 125, 147);
      }
      // the chosen twin walks in place, the other stands idle and dimmed.
      // Drawn at 3x from the middle 40x40 of the 48x48 frame.
      const s = this.g.heroSheets[id];
      const a = sel ? s.anims.walk : s.anims.idle;
      const f = a[Math.floor(this.t / (sel ? 6 : 20)) % a.length];
      c.globalAlpha = sel ? 1 : 0.45;
      c.drawImage(s.tex.image as HTMLCanvasElement, (f % s.cols) * s.cw + 4, Math.floor(f / s.cols) * s.ch + 6, 40, 40, cx - 60, top + 4, 120, 120);
      c.globalAlpha = 1;
      drawText(c, `${HEROES[id].name} KORDER`, cx, top + 126, sel ? GOLD : DIM, '#000', 'center');
      drawText(c, i ? "ILSABET'S SON" : "ILSABET'S DAUGHTER", cx, top + 138, sel ? PALE : DIM, '#000', 'center');
    });
    if (this.selStep === 'difficulty') return this.drawDifficulty();
    drawText(c, 'LEFT / RIGHT: CHOOSE    CONFIRM: NEXT    CANCEL: BACK', VW / 2, VH - 22, DIM, '#000', 'center');
  }

  /** The difficulty list, drawn over the character select once a twin is chosen. */
  drawDifficulty() {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, VW, VH);
    const w = 220, h = 30 + DIFFICULTIES.length * 24, x = VW / 2 - w / 2, y = 52;
    this.panel(x, y, w, h);
    drawText(c, 'DIFFICULTY', VW / 2, y + 8, GOLD, '#000', 'center');
    DIFFICULTIES.forEach((d, i) => {
      const sel = i === this.diffSel, yy = y + 26 + i * 24;
      if (sel) {
        c.fillStyle = '#4a1828';
        c.fillRect(x + 6, yy - 3, w - 12, 22);
      }
      drawText(c, (sel ? '> ' : '  ') + d.name, x + 14, yy, sel ? PALE : DIM);
      drawText(c, d.desc, x + 26, yy + 10, sel ? GOLD : '#5a4a60');
    });
    drawText(c, 'UP / DOWN: CHOOSE    CONFIRM: BEGIN    CANCEL: BACK', VW / 2, VH - 22, DIM, '#000', 'center');
    drawText(c, 'CAN BE CHANGED LATER IN PAUSE > OPTIONS', VW / 2, VH - 34, '#5a4a60', '#000', 'center');
  }

  drawControlsCard(x: number, y: number) {
    const c = this.ctx;
    this.panel(x, y, 220, 100);
    const rows = [
      ['MOVE', 'ARROWS / WASD', 'D-PAD / STICK'],
      ['JUMP', 'Z / K', 'A'],
      ['WHIP', 'X / J  (+DIR)', 'X'],
      ['SUB-WEAPON', 'C / L', 'Y'],
      ['RUN', 'HOLD SHIFT', 'RT'],
      ['SHIELD', 'HOLD F / I', 'LT'],
      ['BACKDASH', 'V', 'B'],
      ['MENU', 'ENTER / ESC', 'START'],
      ['MAP', 'TAB / M', 'BACK'],
    ];
    drawText(c, 'ACTION', x + 8, y + 7, GOLD);
    drawText(c, 'KEYS', x + 82, y + 7, GOLD);
    drawText(c, 'PAD', x + 170, y + 7, GOLD);
    rows.forEach((r, i) => {
      drawText(c, r[0], x + 8, y + 18 + i * 9, PALE);
      drawText(c, r[1], x + 82, y + 18 + i * 9, DIM);
      drawText(c, r[2], x + 170, y + 18 + i * 9, DIM);
    });
  }

  drawIntro() {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.82)';
    c.fillRect(0, 0, VW, VH);
    const y0 = VH - this.introT * INTRO_SPEED;
    INTRO.forEach((l, i) => {
      const y = y0 + i * 14;
      if (y < -10 || y > VH) return;
      const a = Math.min(1, (y - 10) / 40, (VH - y) / 40);
      c.globalAlpha = Math.max(0, a);
      drawText(c, heroText(l.text, this.g.heroChoice), VW / 2, y, l.gold ? GOLD : PALE, '#000', 'center');
    });
    c.globalAlpha = 1;
    if (this.t % 60 < 40) drawText(c, 'PRESS JUMP TO BEGIN', VW - 8, VH - 12, DIM, '#000', 'right');
  }

  /** Letterbox bars and captions over the opening cinematic. */
  drawCutscene() {
    const c = this.ctx, cs = this.g.cutscene!;
    const bar = Math.round(28 * cs.bars);
    c.fillStyle = '#000';
    c.fillRect(0, 0, VW, bar);
    c.fillRect(0, VH - bar, VW, bar);
    const cap = cs.caption;
    if (cap) {
      // fade in over 30 frames, out after 170
      const a = Math.max(0, Math.min(1, cap.t / 30, (200 - cap.t) / 30));
      c.globalAlpha = a;
      const lines = cap.lines.map((l) => this.g.text(l));
      if (cap.big) {
        drawBigText(c, lines[0], VW / 2, 44, 2, GOLD, '#2a1408');
        drawText(c, lines[1], VW / 2, 66, PALE, '#000', 'center');
      } else lines.forEach((l, i) => drawText(c, l, VW / 2, VH - 24 + i * 10, PALE, '#000', 'center'));
      c.globalAlpha = 1;
    }
    if (cs.shout > 0) {
      const jx = (Math.random() - 0.5) * 3, jy = (Math.random() - 0.5) * 3;
      drawBigText(c, CINE.shout, VW / 2 + jx, 70 + jy, 4, '#e03040', '#200408');
    }
    if (this.t % 60 < 40) drawText(c, 'CONFIRM: SKIP', VW - 6, 4, '#5a4a60', null, 'right');
  }

  // ================================================================ talk

  /**
   * Dialogue: CONFIRM finishes typing the line, then moves to the next one; CANCEL skips
   * the rest of the conversation.
   */
  updateTalk() {
    const g = this.g, inp = g.input, T = g.talkState;
    if (!T) {
      g.state = 'play';
      return;
    }
    const text = g.text(T.lines[T.i].text);
    const before = Math.floor(T.shown);
    T.shown = Math.min(text.length, T.shown + TALK_SPEED);
    if (Math.floor(T.shown) !== before && before % 3 === 0 && text[before] !== ' ') g.audio.play('talk');
    let end = inp.cancel;
    if (inp.confirm) {
      if (T.shown < text.length) T.shown = text.length;
      else if (++T.i >= T.lines.length) end = true;
      else {
        T.shown = 0;
        g.audio.play('menu');
      }
    }
    if (end) {
      g.talkState = null;
      g.state = 'play';
      inp.flush();
      T.done?.();
    }
  }

  /** Word-wrap upper-case text to lines no wider than `w` px. */
  wrap(text: string, w: number) {
    const lines: string[] = [];
    let cur = '';
    for (const word of text.split(' ')) {
      const next = cur ? cur + ' ' + word : word;
      if (textWidth(next) > w && cur) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** A dialogue portrait, mirrored to face left when `flip`, darkened when someone else is speaking. */
  portrait(who: Line['who'], face: Face, x: number, y: number, flip: boolean, lit: boolean) {
    const g = this.g, c = this.ctx, sh = g.sheets.portraits;
    const key = who === 'hero' ? g.hunter.hero : who;
    const idx = sh.anims[`${key}_${face}`]?.[0] ?? sh.anims[`${key}_neutral`]?.[0];
    if (idx === undefined) return;
    const img = sh.tex.image as HTMLCanvasElement;
    c.save();
    if (!lit) c.filter = 'brightness(45%)';
    c.translate(Math.round(x) + (flip ? sh.cw : 0), Math.round(y));
    if (flip) c.scale(-1, 1);
    c.drawImage(img, (idx % sh.cols) * sh.cw, Math.floor(idx / sh.cols) * sh.ch, sh.cw, sh.ch, 0, 0, sh.cw, sh.ch);
    c.restore();
  }

  drawTalk() {
    const g = this.g, c = this.ctx, T = g.talkState;
    if (!T) return;
    const line = T.lines[T.i], B = TALK_BOX;
    // who stands where: the hero on the left, whoever she is talking to on the right. Each
    // shows the face of their latest line so far (or of their first, before they've spoken).
    const faceOf = (left: boolean) => {
      const mine = (l: Line) => (SPEAKERS[l.who].side === 'left') === left;
      const said = T.lines.slice(0, T.i + 1).filter(mine);
      return said[said.length - 1] || T.lines.find(mine);
    };
    for (const left of [true, false]) {
      const l = faceOf(left);
      if (!l) continue;
      const lit = l === line;
      this.portrait(l.who, l.face || 'neutral', left ? B.x + 6 : B.x + B.w - 70, B.y - 58 - (lit ? 2 : 0), !left, lit);
    }
    this.panel(B.x, B.y, B.w, B.h, 0.94);
    // the speaker's name plate, on their side of the box
    const left = SPEAKERS[line.who].side === 'left';
    const name = g.text(SPEAKERS[line.who].name), nw = textWidth(name) + 12;
    const nx = left ? B.x + 76 : B.x + B.w - 76 - nw;
    const ny = B.y - 9; // on the box's edge next to the portraits
    this.panel(nx, ny, nw, 13, 1);
    drawText(c, name, nx + 6, ny + 3, GOLD);
    // the line so far
    const text = g.text(line.text).slice(0, Math.floor(T.shown));
    this.wrap(text, B.w - 20).slice(0, 4).forEach((l, i) => drawText(c, l, B.x + 10, B.y + 9 + i * 11, PALE));
    if (T.shown >= g.text(line.text).length && Math.floor(g.frame / 20) % 2) drawText(c, T.i < T.lines.length - 1 ? 'v' : 'x', B.x + B.w - 12, B.y + B.h - 11, GOLD);
  }

  // ================================================================ shop

  shopSel = 0;
  /** Pell's face on the shop screen, and how long until it goes back to a smile. */
  shopFace: Face = 'smile';
  shopFaceT = 0;
  openShop() {
    const g = this.g;
    g.state = 'shop';
    this.shopSel = 0;
    this.shopFace = 'smile';
    g.input.flush();
  }
  /** How many of a shop item are left. */
  shopLeft(i: number) {
    const e = SHOP[i];
    return e.stock - (this.g.hunter.bought[e.item] || 0);
  }
  updateShop() {
    const g = this.g, inp = g.input, h = g.hunter;
    if (this.shopFaceT > 0 && --this.shopFaceT === 0) this.shopFace = 'smile';
    // (ENTER is both CONFIRM and PAUSE, so a pause press only leaves when it isn't a confirm)
    if (inp.cancel || (inp.pressed('pause') && !inp.confirm)) {
      g.state = 'play';
      g.audio.play('cancel');
      inp.flush();
      return;
    }
    if (inp.mUp) this.shopSel = (this.shopSel + SHOP.length - 1) % SHOP.length;
    if (inp.mDown) this.shopSel = (this.shopSel + 1) % SHOP.length;
    if (inp.mUp || inp.mDown) g.audio.play('menu');
    if (inp.confirm) {
      const e = SHOP[this.shopSel];
      if (this.shopLeft(this.shopSel) <= 0) g.audio.play('cancel');
      else if (h.gold < e.price) {
        g.audio.play('cancel');
        this.shopFace = 'sad';
        this.shopFaceT = 60;
      } else {
        h.gold -= e.price;
        h.bought[e.item] = (h.bought[e.item] || 0) + 1;
        h.addItem(e.item);
        g.audio.play('coin');
        this.shopFace = 'surprised';
        this.shopFaceT = 40;
      }
    }
  }
  drawShop() {
    const g = this.g, c = this.ctx, h = g.hunter;
    const x = 84, y = 14, w = VW - 96, hgt = VH - 28;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, VW, VH);
    this.portrait('pell', this.shopFace, 12, 40, false, true);
    drawText(c, 'PELL', 44, 108, GOLD, '#000', 'center');
    this.panel(x, y, w, hgt);
    drawText(c, "PELL'S STALL", x + 10, y + 10, GOLD);
    this.coin(x + w - 50, y + 13);
    drawText(c, String(h.gold), x + w - 10, y + 10, '#f0d060', '#000', 'right');
    SHOP.forEach((e, i) => {
      const yy = y + 26 + i * 22, it = ITEMS[e.item], left = this.shopLeft(i);
      if (i === this.shopSel) {
        c.fillStyle = '#4a1828';
        c.fillRect(x + 6, yy - 3, w - 12, 20);
      }
      c.globalAlpha = left > 0 ? 1 : 0.4;
      this.icon(g.sheets.items, it.icon, x + 10, yy - 1);
      drawText(c, it.name.toUpperCase(), x + 30, yy + 4, left > 0 ? PALE : DIM);
      drawText(c, left > 0 ? `X${left}` : 'SOLD OUT', x + w - 64, yy + 4, DIM, '#000', 'right');
      drawText(c, String(e.price), x + w - 12, yy + 4, h.gold >= e.price ? '#f0d060' : RED, '#000', 'right');
      c.globalAlpha = 1;
    });
    const sel = ITEMS[SHOP[this.shopSel].item];
    this.wrap(sel.desc.toUpperCase(), w - 20).slice(0, 2).forEach((l, i) => drawText(c, l, x + 10, y + hgt - 40 + i * 11, DIM));
    drawText(c, 'CONFIRM: BUY   CANCEL: LEAVE', x + w / 2, y + hgt - 14, GOLD, '#000', 'center');
  }

  drawDialog() {
    const g = this.g, c = this.ctx;
    const lines = g.dialog;
    const w = Math.max(...lines.map((l) => textWidth(l))) + 24;
    const hgt = lines.length * 11 + 24;
    const x = VW / 2 - w / 2, y = VH / 2 - hgt / 2 - 10;
    this.panel(x, y, w, hgt);
    lines.forEach((l, i) => drawText(c, l, VW / 2, y + 10 + i * 11, i === 0 ? GOLD : PALE, '#000', 'center'));
    if (this.t % 50 < 35) drawText(c, '#', x + w - 12, y + hgt - 11, RED, null);
  }

  // ---------------------------------------------------------------- pause

  drawPause() {
    const g = this.g, c = this.ctx, h = g.hunter;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, VW, VH);
    this.panel(8, 8, 96, VH - 16);
    drawText(c, 'PAUSED', 56, 16, GOLD, '#000', 'center');
    TABS.forEach((tb, i) => {
      const sel = i === this.tab;
      if (sel) {
        c.fillStyle = this.focus === 'tabs' ? '#4a1828' : '#2a1020';
        c.fillRect(13, 31 + i * 15, 86, 12);
      }
      drawText(c, tb.label, 18, 34 + i * 15, sel ? PALE : DIM);
    });
    if (this.quitConfirm) drawText(c, 'CONFIRM AGAIN', 56, 34 + TABS.length * 15 + 2, RED, '#000', 'center');
    drawText(c, 'TIME ' + this.fmtTime(h.time), 56, VH - 34, DIM, '#000', 'center');
    drawText(c, `EXPLORED ${this.explored()}%`, 56, VH - 22, DIM, '#000', 'center');
    const px = 110, py = 8, pw = VW - 118, ph = VH - 16;
    this.panel(px, py, pw, ph);
    const tab = TABS[this.tab].id;
    switch (tab) {
      case 'status':
        return this.drawStatus(px, py);
      case 'equip':
        return this.drawEquip(px, py, pw);
      case 'items':
        return this.drawItems(px, py, pw);
      case 'relics':
        return this.drawRelics(px, py, pw);
      case 'bestiary':
        return this.drawBestiary(px, py, pw);
      case 'map':
        drawText(c, 'PRESS CONFIRM TO VIEW THE CASTLE MAP', px + pw / 2, py + 90, DIM, '#000', 'center');
        return;
      case 'controls':
        return this.drawControls(px, py, pw);
      case 'sound':
        return this.drawSound(px, py);
      case 'title':
        drawText(c, 'RETURN TO THE TITLE SCREEN?', px + pw / 2, py + 80, PALE, '#000', 'center');
        drawText(c, 'UNSAVED PROGRESS WILL BE LOST.', px + pw / 2, py + 95, DIM, '#000', 'center');
        return;
    }
  }

  drawStatus(x: number, y: number) {
    const c = this.ctx, h = this.g.hunter;
    // portrait and name
    this.panel(x + 10, y + 12, 52, 56, 1);
    const hero = this.g.sheets.hero;
    const img = hero.tex.image as HTMLCanvasElement;
    const f = hero.anims.idle[Math.floor(this.t / 20) % 4];
    c.drawImage(img, (f % hero.cols) * hero.cw, Math.floor(f / hero.cols) * hero.ch, 48, 48, x + 12, y + 16, 48, 48);
    drawText(c, this.g.text('{NAME} KORDER'), x + 72, y + 14, GOLD);
    drawText(c, 'CHAIN-HUNTER', x + 72, y + 25, DIM);
    /** Label on the left, value right-aligned at `right`. */
    const row = (label: string, value: string, lx: number, right: number, ry: number, col = PALE) => {
      drawText(c, label, lx, ry, DIM);
      drawText(c, value, right, ry, col, '#000', 'right');
    };
    // level and vitals, then the stats beside them
    const left: [string, string][] = [
      ['LEVEL', String(h.level)],
      ['EXP', String(h.xp)],
      ['NEXT', String(Math.max(0, h.nextXp - h.xp))],
      ['HP', `${h.hp}/${h.maxHp}`],
      ['HEARTS', `${h.hearts}/${h.maxHearts}`],
    ];
    left.forEach(([l, v], i) => row(l, v, x + 72, x + 160, y + 40 + i * 11));
    const right: [string, number][] = [
      ['STR', h.str],
      ['CON', h.con],
      ['LCK', h.lck],
      ['ATK', h.atk],
      ['DEF', h.def],
    ];
    right.forEach(([l, v], i) => row(l, String(v), x + 180, x + 240, y + 40 + i * 11));
    // a rule, then the tally
    c.fillStyle = '#4a2a3a';
    c.fillRect(x + 12, y + 102, 228, 1);
    row('SUB-WEAPON', h.sub ? ITEMS[h.sub].name.toUpperCase() : '---', x + 12, x + 240, y + 110);
    row('GOLD', String(h.gold), x + 12, x + 240, y + 122, '#f0d060');
    row('SOUL SHARDS', String(h.shards), x + 12, x + 240, y + 134, '#c8b0ff');
    row('ENEMIES SLAIN', String(h.kills), x + 12, x + 240, y + 146);
  }

  /** Found relics, each with its icon, what it does, and whether it's switched on. */
  drawRelics(x: number, y: number, w: number) {
    const c = this.ctx, h = this.g.hunter;
    drawText(c, 'RELICS', x + 10, y + 10, GOLD);
    const list = h.relicsFound;
    if (!list.length) {
      drawText(c, 'NO RELICS FOUND YET.', x + 10, y + 30, DIM);
      return;
    }
    list.forEach((id, i) => {
      const yy = y + 23 + i * 24, it = ITEMS[id], on = !h.relicOff.includes(id);
      const sel = this.focus === 'panel' && i === this.sel;
      if (sel) {
        c.fillStyle = '#4a1828';
        c.fillRect(x + 6, yy, w - 12, 22);
      }
      c.globalAlpha = on ? 1 : 0.4;
      this.icon(this.g.sheets.items, it.icon, x + 10, yy + 3);
      drawText(c, it.name.toUpperCase(), x + 30, yy + 3, on ? PALE : DIM);
      drawText(c, it.desc.toUpperCase(), x + 30, yy + 13, DIM);
      c.globalAlpha = 1;
      drawText(c, on ? 'ON' : 'OFF', x + w - 12, yy + 8, on ? GOLD : RED, '#000', 'right');
    });
    if (this.focus === 'panel') drawText(c, 'CONFIRM: SWITCH ON / OFF', x + w / 2, y + 190, GOLD, '#000', 'center');
  }

  drawEquip(x: number, y: number, w: number) {
    const c = this.ctx, h = this.g.hunter;
    const slots: [string, EquipSlot][] = [['WHIP', 'whip'], ['SHIELD', 'shield'], ['ARMOR', 'armor'], ['ACC 1', 'acc1'], ['ACC 2', 'acc2']];
    drawText(c, 'EQUIPMENT', x + 10, y + 10, GOLD);
    slots.forEach(([lab, key], i) => {
      const sel = this.focus !== 'tabs' && i === this.sel;
      if (sel) {
        c.fillStyle = this.focus === 'panel' ? '#4a1828' : '#2a1020';
        c.fillRect(x + 6, y + 23 + i * 18, w - 12, 16);
      }
      drawText(c, lab, x + 10, y + 28 + i * 18, DIM);
      const id = h.equip[key];
      if (id) {
        this.icon(this.g.sheets.items, ITEMS[id].icon, x + 54, y + 23 + i * 18);
        drawText(c, ITEMS[id].name.toUpperCase(), x + 74, y + 28 + i * 18, PALE);
      } else drawText(c, '---', x + 74, y + 28 + i * 18, DIM);
    });
    drawText(c, `ATK ${h.atk}   DEF ${h.def}   STR ${h.str}   CON ${h.con}   LCK ${h.lck}`, x + 10, y + 120, PALE);
    if (this.focus === 'pick') {
      const list = this.equipChoices(slots[this.sel][1]);
      const bx = x + 20, by = y + 128;
      this.panel(bx, by, w - 40, Math.min(list.length, 4) * 12 + 14, 1);
      const start = Math.max(0, Math.min(this.pickSel - 1, list.length - 4));
      list.slice(start, start + 4).forEach((id, j) => {
        const i = start + j;
        const sel = i === this.pickSel;
        drawText(c, (sel ? '> ' : '  ') + (id ? ITEMS[id].name.toUpperCase() : 'NONE'), bx + 8, by + 8 + j * 12, sel ? PALE : DIM);
      });
      const id = list[this.pickSel];
      if (id) drawText(c, ITEMS[id].desc.toUpperCase(), x + w / 2, y + 196, GOLD, '#000', 'center');
    } else if (this.focus === 'panel') drawText(c, 'CONFIRM: CHANGE   CANCEL: BACK', x + w / 2, y + 190, DIM, '#000', 'center');
  }

  drawItems(x: number, y: number, w: number) {
    const c = this.ctx, h = this.g.hunter;
    drawText(c, 'ITEMS', x + 10, y + 10, GOLD);
    const list = Object.keys(h.inv).filter((k) => h.inv[k] > 0);
    if (!list.length) drawText(c, 'YOU CARRY NOTHING USEFUL.', x + 10, y + 30, DIM);
    list.forEach((id, i) => {
      const sel = this.focus === 'panel' && i === this.sel;
      if (sel) {
        c.fillStyle = '#4a1828';
        c.fillRect(x + 6, y + 23 + i * 18, w - 12, 16);
      }
      this.icon(this.g.sheets.items, ITEMS[id].icon, x + 10, y + 23 + i * 18);
      drawText(c, ITEMS[id].name.toUpperCase(), x + 30, y + 28 + i * 18, PALE);
      drawText(c, `X${h.inv[id]}`, x + w - 12, y + 28 + i * 18, PALE, '#000', 'right');
    });
    if (this.focus === 'panel' && list[this.sel]) drawText(c, ITEMS[list[this.sel]].desc.toUpperCase() + '  CONFIRM: USE', x + w / 2, y + 190, GOLD, '#000', 'center');
  }

  /** Enemy list on the left, details of the selected one on the right. Stats unlock after the first kill. */
  drawBestiary(x: number, y: number, w: number) {
    const c = this.ctx, g = this.g, h = g.hunter;
    const kinds = Object.keys(ENEMY);
    const found = kinds.filter((k) => h.bestiary[k]).length;
    drawText(c, 'BESTIARY', x + 10, y + 10, GOLD);
    drawText(c, `${found}/${kinds.length} RECORDED`, x + w - 10, y + 10, DIM, '#000', 'right');
    const cur = Math.min(this.sel, kinds.length - 1);
    // the list scrolls once enemy-editor variants make it longer than the panel
    const ROWS = 11, first = clamp(cur - 5, 0, Math.max(0, kinds.length - ROWS));
    kinds.slice(first, first + ROWS).forEach((k, n) => {
      const i = first + n, yy = y + 26 + n * 13;
      const sel = i === cur;
      if (sel) {
        c.fillStyle = this.focus === 'panel' ? '#4a1828' : '#2a1020';
        c.fillRect(x + 6, yy - 3, 98, 12);
      }
      const seen = !!h.bestiary[k];
      drawText(c, seen ? ENEMY[k].name : '?????', x + 10, yy, sel ? PALE : seen ? DIM : '#4a3a50');
    });
    const k = kinds[cur], e = ENEMY[k], seen = !!h.bestiary[k];
    const dx = x + 112;
    // portrait
    this.panel(dx, y + 22, 86, 62, 1);
    // scroll hints at the right end of the first and last rows
    if (first > 0) drawText(c, '^', x + 97, y + 26, DIM);
    if (first + ROWS < kinds.length) drawText(c, 'v', x + 97, y + 26 + (ROWS - 1) * 13, DIM);
    const sheet = g.enemySheet(k);
    if (seen && sheet) {
      const anim = sheet.anims[e.portrait] || [0];
      this.drawFrame(sheet, anim[Math.floor(this.t / 10) % anim.length], dx + 3, y + 25, 80, 56);
    } else drawBigText(c, '?', dx + 43, y + 40, 3, '#4a3a50', '#000');
    // stats column
    const stats: [string, string][] = [
      ['HP', String(e.hp)],
      ['ATK', String(e.atk)],
      ['DEF', String(e.def)],
      ['EXP', String(e.xp)],
      ['SLAIN', String(h.bestiary[k] || 0)],
    ];
    stats.forEach(([lab, v], i) => {
      drawText(c, lab, dx + 92, y + 26 + i * 12, DIM);
      drawText(c, seen || lab === 'SLAIN' ? v : '??', x + w - 10, y + 26 + i * 12, PALE, '#000', 'right');
    });
    // drops, with the hunter's current luck applied
    drawText(c, 'DROPS', dx, y + 90, GOLD);
    if (seen) drawText(c, `LCK ${h.lck}`, x + w - 10, y + 90, DIM, '#000', 'right');
    if (!seen) drawText(c, '???', dx + 4, y + 104, DIM);
    else if (!e.drops.length) drawText(c, 'NOTHING', dx + 4, y + 104, DIM);
    else
      e.drops.forEach((d, i) => {
        const ry = y + 98 + i * 17;
        this.icon(g.sheets.items, ITEMS[d.item]?.icon || d.item, dx, ry);
        drawText(c, ITEMS[d.item]?.name || PICKUP_NAMES[d.item] || d.item, dx + 18, ry + 5, PALE);
        const pct = dropChance(d.chance, h.lck);
        drawText(c, `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`, x + w - 10, ry + 5, DIM, '#000', 'right');
      });
    // description, wrapped across the full panel width
    const desc = seen ? e.desc : 'DEFEAT ONE TO RECORD ITS SECRETS.';
    wrapText(desc, Math.floor((w - 20) / 6)).slice(0, 3).forEach((line, i) => drawText(c, line, x + 10, y + 172 + i * 11, seen ? PALE : DIM));
  }

  /** Draw one sprite-sheet frame centered in a box, scaled up by whole pixels when it fits. */
  drawFrame(sheet: Sheet, idx: number, bx: number, by: number, bw: number, bh: number) {
    const img = sheet.tex.image as HTMLCanvasElement;
    const sx = (idx % sheet.cols) * sheet.cw, sy = Math.floor(idx / sheet.cols) * sheet.ch;
    const s = Math.max(1, Math.floor(Math.min(bw / sheet.cw, bh / sheet.ch)));
    // crop frames bigger than the box so they never spill out
    const cw = Math.min(sheet.cw, bw / s), ch = Math.min(sheet.ch, bh / s);
    const cx = sx + (sheet.cw - cw) / 2, cy = sy + (sheet.ch - ch) / 2;
    this.ctx.drawImage(img, cx, cy, cw, ch, Math.round(bx + (bw - cw * s) / 2), Math.round(by + (bh - ch * s) / 2), cw * s, ch * s);
  }

  drawControls(x: number, y: number, w: number) {
    const c = this.ctx, inp = this.g.input;
    const ROW = 11; // row height, tight enough to fit every action above the footer
    drawText(c, 'CONTROLS', x + 10, y + 10, GOLD);
    drawText(c, 'KEYS', x + 110, y + 10, DIM);
    drawText(c, 'PAD', x + 200, y + 10, DIM);
    REBINDABLE.forEach((a, i) => {
      const sel = this.focus !== 'tabs' && i === this.sel;
      const yy = y + 24 + i * ROW;
      if (sel) {
        c.fillStyle = this.focus === 'capture' ? '#6a1828' : '#4a1828';
        c.fillRect(x + 6, yy - 2, w - 12, 11);
      }
      drawText(c, ACTION_LABEL[a] || a.toUpperCase(), x + 10, yy, sel ? PALE : DIM);
      drawText(c, inp.bindKeys[a].map(keyLabel).join(' / '), x + 110, yy, PALE);
      drawText(c, inp.bindPad[a].map((b) => (PAD_NAMES[b] || 'PAD ' + b).replace(/^PAD /, '')).join('/'), x + 200, yy, PALE);
    });
    const ry = y + 24 + REBINDABLE.length * ROW;
    const rsel = this.focus !== 'tabs' && this.sel === REBINDABLE.length;
    if (rsel) {
      c.fillStyle = '#4a1828';
      c.fillRect(x + 6, ry - 2, w - 12, 11);
    }
    drawText(c, 'RESET TO DEFAULTS', x + 10, ry, rsel ? PALE : DIM);
    if (this.focus === 'capture') drawText(c, 'PRESS A KEY OR PAD BUTTON...', x + w / 2, y + ph(y), RED, '#000', 'center');
    else drawText(c, inp.padConnected ? 'GAMEPAD CONNECTED' : 'NO GAMEPAD DETECTED', x + w / 2, y + 194, DIM, '#000', 'center');
  }

  drawSound(x: number, y: number) {
    const c = this.ctx, a = this.g.audio, h = this.g.hunter;
    drawText(c, 'OPTIONS', x + 10, y + 10, GOLD);
    [['MUSIC', a.musicVol], ['EFFECTS', a.sfxVol]].forEach(([l, v], i) => {
      const sel = this.focus === 'panel' && i === this.sel;
      drawText(c, (sel ? '> ' : '  ') + l, x + 10, y + 34 + i * 20, sel ? PALE : DIM);
      this.bar(x + 90, y + 35 + i * 20, 120, 5, v as number, '#c8a040', '#201820');
    });
    const sel = this.focus === 'panel' && this.sel === 2;
    const diff = DIFFICULTIES[h.difficulty] || DIFFICULTIES[0];
    drawText(c, (sel ? '> ' : '  ') + 'DIFFICULTY', x + 10, y + 74, sel ? PALE : DIM);
    drawText(c, `< ${diff.name} >`, x + 90, y + 74, sel ? GOLD : DIM);
    drawText(c, diff.desc, x + 22, y + 86, '#5a4a60');
    const hsel = this.focus === 'panel' && this.sel === 3;
    const hud = HUD_STYLES.find((s) => s.id === this.hudStyle) || HUD_STYLES[0];
    drawText(c, (hsel ? '> ' : '  ') + 'HUD STYLE', x + 10, y + 106, hsel ? PALE : DIM);
    drawText(c, `< ${hud.name} >`, x + 90, y + 106, hsel ? GOLD : DIM);
    drawText(c, hud.desc, x + 22, y + 118, '#5a4a60');
    drawText(c, 'LEFT / RIGHT TO ADJUST', x + 10, y + 142, DIM);
  }

  // ---------------------------------------------------------------- map

  /** A 5x5 pixel X with a dark outline, for map markers. */
  drawX(x: number, y: number, col: string) {
    const c = this.ctx;
    for (const [color, grow] of [['#000', 1], [col, 0]] as [string, number][]) {
      c.fillStyle = color;
      for (let i = -2; i <= 2; i++) {
        c.fillRect(x + i - grow, y + i - grow, 1 + grow * 2, 1 + grow * 2);
        c.fillRect(x + i - grow, y - i - grow, 1 + grow * 2, 1 + grow * 2);
      }
    }
  }

  drawMap(full: boolean) {
    const g = this.g, c = this.ctx;
    c.fillStyle = 'rgba(4,2,8,0.92)';
    c.fillRect(0, 0, VW, VH);
    this.panel(6, 6, VW - 12, VH - 12);
    drawText(c, 'MAP OF VAEL KEEP', VW / 2, 13, GOLD, '#000', 'center');
    const b = this.mapBounds(), { minX, minY } = b;
    // cell size from the zoom; at zoom 1 the whole world fits the panel
    const CW = this.mapCW(b), CH = Math.max(1, Math.round(CW * 0.8));
    const gap = Math.max(2, Math.round(CW * 0.3)); // length of the wall stubs beside a doorway
    // scroll so the cursor stays in view; along an axis where the world fits, center it instead
    const A = MAP_AREA, cur = this.mapCur;
    const worldW = (b.maxX - minX + 1) * CW, worldH = (b.maxY - minY + 1) * CH;
    const viewX = worldW <= A.w ? worldW / 2 : clamp((cur.x - minX) * CW, A.w / 2, worldW - A.w / 2);
    const viewY = worldH <= A.h ? worldH / 2 : clamp((cur.y - minY) * CH, A.h / 2, worldH - A.h / 2);
    const ox = Math.round(A.x + A.w / 2 - viewX), oy = Math.round(A.y + A.h / 2 - viewY);
    const toScreen = (gx: number, gy: number): [number, number] => [ox + (gx - minX) * CW, oy + (gy - minY) * CH];
    c.save();
    c.beginPath();
    c.rect(A.x, A.y, A.w, A.h);
    c.clip();
    for (const d of g.defs) {
      for (let cy = 0; cy < d.h; cy++)
        for (let cx = 0; cx < d.w; cx++) {
          const gx = d.gx + cx, gy = d.gy + cy;
          if (!g.visited.has(`${gx},${gy}`)) continue;
          const x = ox + (gx - minX) * CW, y = oy + (gy - minY) * CH;
          c.fillStyle = d.save ? '#9a1a2a' : ZONE_INFO[d.zone]?.color || '#3a3a3a';
          c.fillRect(x, y, CW, CH);
          c.fillStyle = '#e8dcc8';
          const tiles = d.tiles;
          const isOpen = (tx: number, ty: number) => {
            const ch = tiles[ty]?.[tx];
            if (ch === 'N' && d.sealFlag && g.hunter.flags.includes(d.sealFlag)) return false; // buried
            return ch !== undefined && ch !== '#' && ch !== 'B' && ch !== 'H';
          };
          // left edge
          if (cx === 0) {
            if (!isOpen(0, cy * SCREEN_ROWS + 9)) c.fillRect(x, y, 1, CH);
            else {
              c.fillRect(x, y, 1, gap);
              c.fillRect(x, y + CH - gap, 1, gap);
            }
          }
          if (cx === d.w - 1) {
            const tx = d.w * SCREEN_COLS - 1;
            if (!isOpen(tx, cy * SCREEN_ROWS + 9)) c.fillRect(x + CW - 1, y, 1, CH);
            else {
              c.fillRect(x + CW - 1, y, 1, gap);
              c.fillRect(x + CW - 1, y + CH - gap, 1, gap);
            }
          }
          if (cy === 0) {
            if (!isOpen(cx * SCREEN_COLS + 11, 0)) c.fillRect(x, y, CW, 1);
            else {
              c.fillRect(x, y, gap, 1);
              c.fillRect(x + CW - gap, y, gap, 1);
            }
          }
          if (cy === d.h - 1) {
            const ty = d.h * SCREEN_ROWS - 1;
            if (!isOpen(cx * SCREEN_COLS + 11, ty)) c.fillRect(x, y + CH - 1, CW, 1);
            else {
              c.fillRect(x, y + CH - 1, gap, 1);
              c.fillRect(x + CW - gap, y + CH - 1, gap, 1);
            }
          }
          if (d.boss && cx === d.w - 1 && cy === 0) drawText(c, '*', x + CW / 2 - 3, y + CH / 2 - 4, g.hunter.beaten(d.boss) ? DIM : RED, null);
        }
    }
    // player marker
    const r = g.room;
    const pgx = r.def.gx + Math.floor(g.player.x / (SCREEN_COLS * 16)), pgy = r.def.gy + Math.floor(g.player.y / (SCREEN_ROWS * 16));
    if (this.t % 40 < 26) {
      c.fillStyle = '#ffffff';
      c.fillRect(ox + (pgx - minX) * CW + CW / 2 - 2, oy + (pgy - minY) * CH + CH / 2 - 2, 4, 4);
    }
    // the player's own markers: small X's
    for (const [mx, my] of g.hunter.marks) {
      const [sx, sy] = toScreen(mx, my);
      this.drawX(Math.round(sx), Math.round(sy), '#ffd040');
    }
    // the cursor: a blinking crosshair
    {
      const [sx, sy] = toScreen(cur.x, cur.y);
      const x = Math.round(sx), y = Math.round(sy);
      c.fillStyle = this.t % 30 < 20 ? '#ffffff' : '#a0a0c0';
      c.fillRect(x - 6, y, 4, 1);
      c.fillRect(x + 3, y, 4, 1);
      c.fillRect(x, y - 6, 1, 4);
      c.fillRect(x, y + 3, 1, 4);
    }
    c.restore();
    drawText(c, 'MOVE: CURSOR   JUMP: MARK X   R-STICK / Q E: ZOOM', VW / 2, VH - 31, '#6a5a70', '#000', 'center');
    drawText(c, `EXPLORED ${this.explored()}%`, 14, VH - 20, PALE);
    drawText(c, r.def.name.toUpperCase(), VW - 14, VH - 20, GOLD, '#000', 'right');
    // legend
    c.fillStyle = '#9a1a2a';
    c.fillRect(VW / 2 - 30, VH - 20, 6, 6);
    drawText(c, 'SAVE', VW / 2 - 20, VH - 20, DIM);
    void full;
  }

  // ---------------------------------------------------------------- end screens

  drawGameOver() {
    const c = this.ctx;
    const a = Math.min(1, this.endT / 60);
    c.fillStyle = `rgba(20,0,4,${0.8 * a})`;
    c.fillRect(0, 0, VW, VH);
    c.globalAlpha = a;
    drawBigText(c, 'YOUR HUNT', VW / 2, 60, 3, '#c02030', '#200408');
    drawBigText(c, 'HAS ENDED', VW / 2, 90, 3, '#c02030', '#200408');
    if (this.endT >= 60) {
      ['CONTINUE FROM LAST REST', 'RETURN TO TITLE'].forEach((o, i) => {
        const sel = i === this.endSel;
        drawText(c, (sel ? '> ' : '  ') + o, VW / 2, 140 + i * 14, sel ? PALE : DIM, '#000', 'center');
      });
    }
    c.globalAlpha = 1;
  }
}

function ph(_y: number) {
  return 194;
}

/** Split text into lines of at most `max` characters, breaking at spaces. */
function wrapText(s: string, max: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
