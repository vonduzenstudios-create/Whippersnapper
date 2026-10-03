// The Head Archivist (the Forbidden Section). He can't be struck: he is the author.
//
// He stands at his lectern in the middle of the room and WRITES what happens next. A page appears in
// the room and the sentence writes itself out, one letter at a time:
//     A PIRATE CUT THE HUNTER DOWN
// The victim's name glows while the ink is wet. Whip that word and it is blotted and
// rewritten: A PIRATE CUT THE ARCHIVIST DOWN. Then the story happens, to whoever it now names.
// Each sentence turned on him tears out one of his six chapters. Miss the word and it happens
// to you (every one of them can still be dodged).
//
// After three chapters (a scene) he writes faster, hangs his pages higher, and names himself
// in the sentence too: THE ARCHIVIST SMILED AS THE HUNTER BURNED. Blot the wrong name and the
// line reads THE HUNTER ... THE HUNTER, and it comes twice as hard.
import { Sprite } from '../gfx/view';
import type { Game } from './game';
import { Ent, DmgType, HitKind } from './ent';
import { BossBase, Target, SEG } from './boss_base';
import { EnemyShot } from './objects';
import { Shockwave } from './enemies_expansion';
import { drawText, textWidth } from '../gfx/font';
import { clamp, rand, overlap } from '../core/util';

type Tale = 'books' | 'pirate' | 'fire' | 'duelist' | 'golem' | 'dark';
/** The sentences. '@' is where the victim's name goes; '#' (part two only) where his own does. */
const TALES: Record<Tale, [string, string]> = {
  books: ['A SHELF OF BOOKS FELL ON THE @', 'THE # LAUGHED AS BOOKS BURIED THE @'],
  pirate: ['A PIRATE CUT THE @ DOWN', 'THE # WATCHED A PIRATE RUN THE @ THROUGH'],
  fire: ['FLAMES ROSE UNDER THE @', 'THE # SMILED AS THE @ BURNED'],
  duelist: ['THE DUELIST LUNGED AT THE @', 'THE # APPLAUDED AS THE DUELIST PIERCED THE @'],
  golem: ['THE GOLEM STRUCK THE @ FLAT', 'THE # NODDED AS THE GOLEM CRUSHED THE @'],
  dark: ['THE LAMPS WENT OUT AROUND THE @', 'THE # SAW CLEARLY WHILE THE @ WENT BLIND'],
};
const ORDER: Tale[] = ['books', 'pirate', 'fire', 'duelist', 'golem', 'dark'];
const WET = [170, 120]; // frames the name stays wet (part one, part two)
const LINE_W = 150; // a page's text wraps at this many pixels

/**
 * A storybook figure acting out a sentence: it appears, crosses the floor (or the gallery,
 * when the story has been turned on its author) doing its one thing, and bursts into pages.
 */
class Actor extends Ent {
  t = 0;
  facing = 1;
  constructor(g: Game, private kind: 'pirate' | 'duelist' | 'golem', x: number, private floor: number, private target: number, dmg: number, private harmless: boolean) {
    super();
    this.x = x;
    this.hw = kind === 'golem' ? 12 : 9;
    this.hh = kind === 'golem' ? 26 : 20;
    this.y = floor - this.hh;
    this.facing = target < x ? -1 : 1;
    this.hostile = !harmless;
    this.touchDmg = dmg;
    this.sprite = new Sprite(g.sheets.figures, g.view.sprites, 10);
  }
  hitType(): DmgType {
    return 'melee';
  }
  update(g: Game) {
    this.t++;
    const s = this.sprite!, A = s.sheet.anims;
    const tell = this.kind === 'golem' ? 50 : 34;
    let atk = false;
    if (this.t === 1) g.fx.burst(this.x, this.y, 'page', 8, 12, { speed: 1.6, grav: 0.03, life: 40, rot: 0.2, fade: true });
    if (this.kind === 'golem') {
      // stands where it appeared, raises its fists, and brings them down: a wave each way
      atk = this.t > tell;
      if (this.t === tell) {
        g.audio.play('rumble');
        g.shake(5, 16);
        if (!this.harmless) {
          g.spawn(new Shockwave(g, this.x - 16, this.floor, -2.4, this.touchDmg, 120));
          g.spawn(new Shockwave(g, this.x + 16, this.floor, 2.4, this.touchDmg, 120));
        }
      }
      if (this.t > tell + 40) this.leave(g);
    } else {
      // the pirate walks in swinging; the duelist stands, then lunges the whole way
      const speed = this.kind === 'pirate' ? 2.4 : this.t < tell ? 0 : 5.2;
      atk = this.kind === 'pirate' ? this.t % 30 > 14 : this.t >= tell;
      this.x += this.facing * speed;
      if (this.t === tell && this.kind === 'duelist') g.audio.play('dash');
      if ((this.facing > 0 ? this.x > this.target : this.x < this.target) || this.t > 400) this.leave(g);
    }
    s.opacity = Math.min(1, this.t / 14);
    s.setFrame(atk ? A[this.kind + '_atk'][0] : A[this.kind][Math.floor(this.t / 8) % 2]);
    s.place(this.x, this.floor, this.facing < 0);
  }
  leave(g: Game) {
    this.dead = true;
    g.fx.burst(this.x, this.y, 'page', 10, 12, { speed: 1.8, grav: 0.03, life: 50, rot: 0.2, fade: true });
  }
}

export class Archivist extends BossBase {
  label = 'ARCHIVIST';
  told = 0;
  /** The page being written (world position of its top middle). */
  page: { x: number; y: number; tale: Tale; text: string; shown: number; state: 'write' | 'wet' | 'turned' | 'dry' | 'wrong'; t: number } | null = null;
  /** Where the glowing names sit in the page, in world pixels: [x, y, width, kind]. */
  words: [number, number, number, '@' | '#'][] = [];
  dark = 0; // frames of darkness left
  blind = 0; // frames his next page stays wet twice as long (the dark turned on him)
  recoil = 0;
  constructor(g: Game, x: number, bottom: number) {
    super(g, 'archivist', g.sheets.archivist, 14, 40, 5);
    this.x = x;
    this.y = bottom - 40;
    this.sprite!.opacity = 0;
    g.overlays.push((c) => this.drawPage(c));
  }
  targets(): Target[] {
    const out: Target[] = [{ id: 'self', x: this.x, y: this.y, r: 26 }];
    if (this.page?.state === 'wet') for (const [x, y, w, k] of this.words) out.push({ id: k, x: x + w / 2, y: y + 4, r: w / 2 + 6 });
    return out.reverse(); // the words first: they matter more than the ghost behind them
  }
  hurtZones(): Target[] {
    return [];
  }
  onStrike(g: Game, t: Target) {
    const pg = this.page;
    if (t.id === 'self' || !pg || pg.state !== 'wet') {
      // the chain passes through him
      g.fx.burst(t.x, t.y, 'page', 2, 8, { life: 24, fade: true, rot: 0.2 });
      return;
    }
    g.audio.play('squelch');
    g.fx.burst(t.x, t.y, 'smoke', 3, 6, { life: 24, tint: [0.1, 0.1, 0.2] });
    pg.t = 0;
    if (t.id === '@') {
      pg.state = 'turned';
      pg.text = pg.text.replace('HUNTER', 'ARCHIVIST');
    } else {
      // blotted his name: now the line names the hunter twice
      pg.state = 'wrong';
      pg.text = pg.text.replace('ARCHIVIST', 'HUNTER');
      g.message('THE WRONG NAME', 110);
    }
  }
  /** Where the pages hang: over the tall cases, between them, and (part two) higher still. */
  pageSpot(): [number, number] {
    const low: [number, number][] = [[192, 268], [336, 268], [480, 268], [624, 268], [264, 330], [552, 330], [96, 330]];
    const high: [number, number][] = [[192, 200], [480, 200], [336, 190], [624, 190], [96, 230]];
    const spots = this.phase === 2 ? [...low.slice(0, 4), ...high] : low;
    return spots[Math.floor(Math.random() * spots.length)];
  }
  /** Begin writing the next sentence. */
  write(g: Game) {
    const tale = ORDER[this.told++ % ORDER.length];
    const [x, y] = this.pageSpot();
    const text = TALES[tale][this.phase === 2 ? 1 : 0].replace('@', 'HUNTER').replace('#', 'ARCHIVIST');
    this.page = { x, y, tale, text, shown: 0, state: 'write', t: 0 };
    g.audio.play('pages');
    g.fx.burst(x, y + 10, 'page', 6, 20, { speed: 1.2, grav: 0.02, life: 40, rot: 0.2, fade: true });
  }
  /** Break the page's text into lines of at most LINE_W pixels. */
  lines(text: string) {
    const out: string[] = [];
    let cur = '';
    for (const w of text.split(' ')) {
      if (cur && textWidth(cur + ' ' + w) > LINE_W) {
        out.push(cur);
        cur = w;
      } else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) out.push(cur);
    return out;
  }
  /** Where the names sit on the page, in world pixels (the same layout drawPage uses), for the whip. */
  findWords() {
    const pg = this.page;
    this.words = [];
    if (!pg || pg.state !== 'wet') return;
    const w = LINE_W + 14;
    this.lines(pg.text).forEach((line, li) => {
      let x = pg.x - w / 2 + Math.round((w - textWidth(line)) / 2);
      for (const word of line.split(' ')) {
        if (word === 'HUNTER' || word === 'ARCHIVIST') this.words.push([x, pg.y + 6 + li * 10, textWidth(word), word === 'HUNTER' ? '@' : '#']);
        x += textWidth(word) + 6;
      }
    });
  }
  /** Draw the page on the HUD canvas. */
  drawPage(c: CanvasRenderingContext2D) {
    const g = this.g, pg = this.page;
    if (this.dark > 0) {
      // the lamps are out: only a pool of light round the hunter
      const px = g.view.sx(g.player.x), py = g.view.sy(g.player.y);
      const grad = c.createRadialGradient(px, py, 20, px, py, 110);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.94, this.dark / 30)})`);
      c.fillStyle = grad;
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    }
    if (!pg) return;
    const lines = this.lines(pg.text);
    const w = LINE_W + 14, h = lines.length * 10 + 10;
    const sx = Math.round(g.view.sx(pg.x) - w / 2), sy = Math.round(g.view.sy(pg.y));
    // parchment
    c.fillStyle = '#2a1c10';
    c.fillRect(sx - 1, sy - 1, w + 2, h + 2);
    c.fillStyle = pg.state === 'turned' ? '#f4e0c0' : pg.state === 'wrong' ? '#e0b8b0' : '#e8dcc0';
    c.fillRect(sx, sy, w, h);
    c.fillStyle = '#c8b890';
    c.fillRect(sx, sy + h - 2, w, 2);
    let n = 0;
    lines.forEach((line, li) => {
      const lw = textWidth(line);
      let x = sx + Math.round((w - lw) / 2);
      const y = sy + 6 + li * 10;
      for (const word of line.split(' ')) {
        const vis = clamp(Math.floor(pg.shown) - n, 0, word.length);
        const name = word === 'HUNTER' || word === 'ARCHIVIST';
        const done = vis === word.length;
        if (name && done && pg.state === 'wet') {
          // wet ink: the name pulses gold, with a drying bar under it
          const pulse = 0.6 + Math.sin(g.frame * 0.3) * 0.4;
          c.fillStyle = `rgba(255,200,60,${0.35 + pulse * 0.4})`;
          c.fillRect(x - 2, y - 2, textWidth(word) + 4, 11);
          const left = 1 - pg.t / this.wetTime();
          c.fillStyle = '#7a1a2a';
          c.fillRect(x, y + 8, Math.round(textWidth(word) * left), 1);
        }
        const rewritten = (pg.state === 'turned' && word === 'ARCHIVIST') || (pg.state === 'wrong' && word === 'HUNTER');
        drawText(c, word.slice(0, vis), x, y, rewritten ? '#a01828' : name ? '#5a2a10' : '#2a2018', null);
        x += textWidth(word) + 6;
        n += word.length + 1;
      }
    });
  }
  wetTime() {
    return WET[this.phase - 1] * (this.blind > 0 ? 2 : 1);
  }
  /** The sentence is finished and happens: to the hunter (`times` 1 or 2), or to its author. */
  happen(g: Game, tale: Tale, onHim: boolean, times = 1) {
    const p = g.player, W = g.room.W, fy = this.floorY;
    const gallery = this.y + 40;
    if (onHim) {
      // the story turns on him: the same thing, at his own lectern, and a chapter torn out
      if (tale === 'pirate' || tale === 'duelist' || tale === 'golem') {
        const a = new Actor(g, tale, this.x - 70, gallery, this.x, 0, true);
        this.minions.push(a);
        g.spawn(a);
      } else if (tale === 'books') {
        for (let i = 0; i < 5; i++) g.fx.burst(this.x + rand(-20, 20), this.y - 60 - i * 8, 'page', 3, 8, { vy: 2, life: 40, rot: 0.3 });
      } else if (tale === 'fire') {
        for (let i = 0; i < 8; i++) g.fx.burst(this.x + rand(-16, 16), this.y + rand(0, 40), 'fire', 1, 4, { sheet: 'fire', vy: -1, life: 30 });
      } else this.blind = 400;
      this.recoil = 50;
      g.audio.play('screech');
      g.shake(4, 20);
      this.windowDmg = 0;
      this.strike(g, this.x, this.y - 20, 'whip', SEG);
      if (this.hp > 0 && this.phase === 1 && this.hp <= this.maxHp / 2) {
        this.phase = 2;
        g.bossScene();
        this.pick('rage');
      }
      return;
    }
    const dmg = this.atk;
    if (tale === 'books') {
      // books fly out of both walls at her height, one after another
      for (let i = 0; i < 4 * times; i++) {
        const left = i % 2 === 0;
        const shot = new EnemyShot(g, left ? 16 : W - 16, clamp(p.y - 20 + (i >> 1) * 22, 40, fy - 12), (left ? 1 : -1) * (2.6 + i * 0.25), 0, 'book', 14);
        g.spawn(shot);
      }
    } else if (tale === 'pirate' || tale === 'duelist') {
      for (let k = 0; k < times; k++) {
        const fromLeft = (p.x > W / 2) !== (k === 1);
        const a = new Actor(g, tale, fromLeft ? 30 : W - 30, fy, fromLeft ? W - 30 : 30, dmg, false);
        this.minions.push(a);
        g.spawn(a);
      }
    } else if (tale === 'golem') {
      for (let k = 0; k < times; k++) {
        const a = new Actor(g, 'golem', clamp(p.x + (k ? -70 : 60), 40, W - 40), fy, 0, dmg, false);
        this.minions.push(a);
        g.spawn(a);
      }
    } else if (tale === 'fire') {
      this.data.fire = { x: p.x, t: 0, wide: 26 * times };
    } else this.dark = 330 * times;
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    if (this.recoil > 0) this.recoil--;
    if (this.dark > 0) this.dark--;
    if (this.blind > 0) this.blind--;
    const p = g.player, A = g.sheets.archivist.anims, s = this.sprite!, d = this.data, pg = this.page;
    this.minions = this.minions.filter((m) => !m.dead);
    this.findWords();
    let frame = A.idle[Math.floor(g.frame / 12) % 4];
    switch (this.pat) {
      case 'enter':
        s.opacity = Math.min(1, this.pt / 60);
        if (this.pt === 80) {
          g.audio.play('pages');
          g.bossIntro();
        }
        if (this.pt > 80) frame = A.point[0];
        if (this.pt === 130) g.bossTalk();
        if (this.pt > 130) {
          this.pick('story');
          g.message('BLOT YOUR NAME WHILE THE INK IS WET', 240);
        }
        break;
      case 'story':
        // between sentences: a pause, then the next one
        if (!pg && this.pt > (this.phase === 2 ? 60 : 100) && !this.minions.length && !d.fire) this.write(g);
        if (pg) {
          pg.t++;
          frame = A.write[Math.floor(g.frame / 8) % 2];
          if (pg.state === 'write') {
            pg.shown += this.phase === 2 ? 0.6 : 0.4;
            if (Math.floor(pg.shown) % 3 === 0 && g.frame % 4 === 0) g.audio.play('talk');
            if (pg.shown >= pg.text.length) {
              pg.state = 'wet';
              pg.t = 0;
            }
          } else if (pg.state === 'wet') {
            if (pg.t > this.wetTime()) {
              pg.state = 'dry';
              pg.t = 0;
            }
          } else if (pg.t === 36) {
            // read out, and done
            this.happen(g, pg.tale, pg.state === 'turned', pg.state === 'wrong' ? 2 : 1);
          } else if (pg.t > 70) {
            this.page = null;
            if (this.pat === 'story') this.pt = 0;
          }
        }
        break;
      case 'rage':
        frame = A.point[0];
        s.glow = 0.5;
        this.page = null;
        if (this.pt === 30) {
          g.audio.play('pages');
          g.shake(5, 50);
          for (let i = 0; i < 4; i++) g.fx.burst(192 + i * 144, this.floorY - 80, 'page', 10, 16, { speed: 2, grav: 0.03, life: 60, rot: 0.2, fade: true });
        }
        if (this.pt === 90) g.bossTalk('boss_archivist_phase2');
        if (this.pt > 90) this.pick('story');
        break;
      case 'dying':
        frame = A.recoil[0];
        this.page = null;
        this.dark = 0;
        if (this.deathT % 4 === 0) g.fx.burst(this.x + rand(-14, 14), this.y + rand(-30, 30), 'page', 2, 8, { speed: 1.4, grav: 0.03, life: 50, rot: 0.2, fade: true });
        if (this.dyingTick(g, 150, 24)) return;
        break;
    }
    // a fire the story lit under the hunter: a flickering tell, then a column of flame
    const f = d.fire;
    if (f) {
      f.t++;
      if (f.t < 60) {
        if (f.t % 4 === 0) g.fx.burst(f.x + rand(-f.wide, f.wide), this.floorY - 2, 'ember', 1, 2, { vy: -0.6, life: 20 });
      } else if (f.t < 130) {
        if (f.t === 60) g.audio.play('flame');
        if (f.t % 2 === 0) g.fx.burst(f.x + rand(-f.wide, f.wide), this.floorY - rand(0, 70), 'fire', 1, 4, { sheet: 'fire', vy: -1.6, life: 22 });
        if (p.alive && p.invuln <= 0 && overlap({ x: f.x, y: this.floorY - 40, hw: f.wide, hh: 40 }, p)) p.takeDamage(this.atk, f.x, false, true, 'magic');
      } else d.fire = null;
    }
    if (this.recoil > 0) frame = A.recoil[0];
    if (this.pat !== 'rage') s.glow = 0;
    s.setFrame(frame);
    s.place(this.x, this.y + 40);
    this.showFlash();
  }
  hitSpot(): [number, number] {
    return [this.x, this.y - 10];
  }
}
