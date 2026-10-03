// The Harvest Reaper (trial boss, 0.27.0). A wheat field under a red moon.
//
// Crouch in tall wheat and he loses you: he walks to where he last saw you and stands there
// turning his head. To open him up:
//   - strike him from behind while he SEARCHES (an ambush)
//   - holy water sets tall wheat alight; if he stands in the fire, his straw catches
// But every REAP cuts the wheat in front of him, so your cover runs out, and a blow from the
// front while he searches only tells him where you are.
// Phase two: he burns the field down to three sheaves, which grow back after he cuts them; two
// lines of fire creep along the stubble; and he WHIRLS across the field. The whirl leaves him
// dizzy: any blow then counts as an ambush.
import type { Game } from './game';
import { DmgType, HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target } from './boss_base';
import { TrialBoss, Bullet, AX0, AX1, AMID } from './boss_kit';
import { HolyFire } from './objects';
import { lazySheet } from '../gfx/lazy';
import { buildReaperSheet, buildFieldProps, buildSickle, buildMoon } from '../gfx/art_reaper';
import { clamp } from '../core/util';
import { TILE } from '../config';

const CELLS = (AX1 - AX0) / TILE;
const SHEAVES = [5, 6, 15, 16, 25, 26]; // the cells that grow back in phase two
const REGROW = 420;

interface Wheat { tall: boolean; burn: number; back: number; s: Sprite }

export class Reaper extends TrialBoss {
  label = 'HARVEST REAPER';
  field: Wheat[] = [];
  /** Where he last saw her. */
  lastX = AMID;
  wary = 0;
  fronts: { x: number; dir: number }[] = [];
  constructor(g: Game, x: number) {
    super(g, 'reaper', lazySheet('reaper', buildReaperSheet), 15, 30, x);
    const props = lazySheet('fieldProps', buildFieldProps);
    const moon = new Sprite(lazySheet('moon', buildMoon), g.view.sprites, 2);
    moon.place(AMID + 90, this.floorY - 190);
    this.props.push(moon);
    for (let i = 0; i < CELLS; i++) {
      // drawn in front of everyone: the wheat is what hides her
      const s = new Sprite(props, g.view.sprites, 13);
      s.place(AX0 + i * TILE + 8, this.floorY);
      this.props.push(s);
      this.field.push({ tall: true, burn: 0, back: 0, s });
    }
    this.facing = -1;
  }
  cell(x: number): Wheat | undefined {
    return this.field[Math.floor((x - AX0) / TILE)];
  }
  /** She is crouched in standing wheat. */
  get hidden() {
    const p = this.g.player;
    return p.crouch && p.onGround && !!this.cell(p.x)?.tall;
  }
  cut(g: Game, x0: number, x1: number) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += TILE) {
      const c = this.cell(x);
      if (!c?.tall) continue;
      c.tall = false;
      c.burn = 0;
      c.back = REGROW;
      g.fx.burst(x, this.floorY - 20, 'dust', 2, 8, { speed: 1.4, grav: 0.06, life: 26, fade: true, tint: [1.4, 1.2, 0.5] });
    }
  }
  hitType(): DmgType {
    return this.pat === 'reap' || this.pat === 'whirl' ? 'melee' : 'touch';
  }
  targets(): Target[] {
    return [{ id: 'body', x: this.x, y: this.y - 2, r: 22 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (this.vulnT <= 0) {
      const behind = Math.sign(g.player.x - this.x) === -this.facing;
      if (this.data.dizzy || (this.pat === 'search' && behind)) return this.stun(g, 300, this.data.dizzy ? 'DIZZY: STRIKE' : 'AMBUSHED: STRIKE');
      if (this.pat === 'search') {
        // from the front: now he knows
        this.look();
        this.pick('reap');
        this.data.quick = true;
      }
    }
    this.bodyHit(g, t, kind);
  }
  endStun(g: Game) {
    super.endStun(g);
    this.wary = 200;
  }
  onShift(g: Game) {
    g.audio.play('fire');
    for (const [i, c] of this.field.entries()) if (c.tall && !SHEAVES.includes(i)) c.burn = 1 + Math.floor(Math.random() * 40);
    this.fronts = [{ x: AX0 + 12, dir: 1 }, { x: AX1 - 12, dir: -1 }];
  }
  /** The wheat: swaying, burning, growing back. */
  updateField(g: Game) {
    const p = g.player, WA = this.field[0].s.sheet.anims, two = this.phase === 2;
    for (const e of g.ents) {
      if (!(e instanceof HolyFire) || e.dead) continue;
      const c = this.cell(e.x);
      if (c?.tall && !c.burn && !(two && SHEAVES.includes(this.field.indexOf(c)))) c.burn = 1;
    }
    this.field.forEach((c, i) => {
      const x = AX0 + i * TILE + 8;
      if (c.burn > 0) {
        c.burn++;
        if (g.frame % 4 === 0) g.fx.burst(x + (Math.random() - 0.5) * 12, this.floorY - 6 - Math.random() * 20, 'fire', 1, 0, { sheet: 'fire', life: 18, vy: -0.5, order: 14 });
        if (c.burn === 24) for (const n of [this.field[i - 1], this.field[i + 1]]) if (n?.tall && !n.burn && !(two && SHEAVES.includes(this.field.indexOf(n)))) n.burn = 1;
        if (Math.abs(p.x - x) < 10 && p.bottom > this.floorY - 20) this.hit(g, { x, y: this.floorY - 14, hw: 8, hh: 14 }, Math.round(this.atk * 0.4), 'magic', x);
        if (Math.abs(this.x - x) < 10 && this.wary <= 0 && this.pat !== 'enter') this.stun(g, 300, 'HIS STRAW CATCHES: STRIKE');
        if (c.burn > 100) {
          c.burn = 0;
          c.tall = false;
          c.back = REGROW;
        }
      } else if (!c.tall && two && SHEAVES.includes(i) && --c.back <= 0) c.tall = true;
      // wheat bends away from whoever pushes through it
      const push = Math.abs(p.x - x) < 14 || Math.abs(this.x - x) < 18;
      c.s.setFrame(c.tall ? WA.tall[(Math.floor(g.frame / 9) + i * 2 + (push ? 2 : 0)) % WA.tall.length] : WA.stub[0]);
      c.s.tint(c.burn ? 1.6 : 1, c.burn ? 0.8 : 1, c.burn ? 0.4 : 1);
    });
    // phase two: lines of fire crawling along the stubble (jump them)
    for (const fr of this.fronts) {
      fr.x += fr.dir * 1.15;
      if (fr.x < AX0 + 10 || fr.x > AX1 - 10) fr.dir = -fr.dir;
      if (g.frame % 3 === 0) g.fx.burst(fr.x, this.floorY - 8, 'fire', 1, 3, { sheet: 'fire', life: 16, vy: -0.4, order: 14 });
      if (this.pat !== 'shift') this.hit(g, { x: fr.x, y: this.floorY - 9, hw: 6, hh: 9 }, Math.round(this.atk * 0.5), 'magic', fr.x - fr.dir * 10);
    }
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    this.y = this.floorY - this.hh;
    if (this.wary > 0) this.wary--;
    this.updateField(g);
    const hidden = this.hidden;
    if (!hidden) this.lastX = p.x;
    if (hidden && this.pat !== 'stun') g.hint = 'HIDDEN IN THE WHEAT';
    switch (this.pat) {
      case 'enter':
        this.loop(this.pt < 70 ? 'search' : 'idle', 7);
        if (this.pt === 70) g.audio.play('creak');
        this.enterBeats(g, 72, 130);
        break;
      case 'shift':
        this.loop('whirl', 4);
        if (this.pt % 20 === 1) g.shake(2, 10);
        this.shiftBeats(g, 110);
        break;
      case 'idle': {
        if (hidden) {
          this.pick('search');
          break;
        }
        this.look();
        const far = Math.abs(this.dx) > 74;
        if (far) this.x += this.facing * (two ? 1.35 : 1);
        this.loop(far ? 'walk' : 'idle', far ? 5 : 7);
        if (!far && this.pt > 20) this.pick('reap');
        else if (this.pt > (two ? 70 : 100)) this.pick(two && this.last !== 'whirl' ? this.choose(['whirl', 'sickle']) : 'sickle');
        break;
      }
      case 'search': {
        // to where he saw her last; then he stands and turns his head, one way and the other
        const off = this.lastX - this.x;
        if (!d.there && Math.abs(off) > 44) {
          this.facing = off < 0 ? -1 : 1;
          this.x += this.facing * 0.8;
          this.loop('walk', 7);
        } else {
          d.there = true;
          d.t = (d.t || 0) + 1;
          if (d.t % 64 === 0) this.facing = -this.facing;
          this.loop('search', 8);
        }
        const seesHer = !hidden || (Math.abs(this.dx) < 40 && Math.sign(this.dx) === this.facing && d.t > 30);
        if (seesHer) {
          g.audio.play('growl');
          this.look();
          this.pick('reap');
          this.data.quick = true;
        } else if (d.t > 250) this.pick('reap'); // he cuts where he stands, to flush her out
        break;
      }
      case 'reap': {
        const tell = d.quick ? 16 : two ? 24 : 32;
        this.once('reap', this.pt * (d.quick ? 1.5 : 1), tell * 3.2);
        if (this.pt === tell) {
          g.audio.play('whip');
          this.cut(g, this.x + this.facing * 4, this.x + this.facing * 86);
        }
        if (this.pt >= tell && this.pt < tell + 10) this.hit(g, { x: this.x + this.facing * 42, y: this.floorY - 20, hw: 44, hh: 24 }, this.atk + 4);
        if (this.pt > tell + 50) this.pick('idle');
        break;
      }
      case 'sickle': {
        this.once('hurl', this.pt, 44);
        if (this.pt < 20) this.look();
        if (this.pt === 24) {
          // out along the ground or at head height, and back to his hand
          const low = Math.random() < 0.5, dir = this.facing;
          g.audio.play('throw');
          g.spawn(new Bullet(g, this.x + dir * 16, this.floorY - (low ? 9 : 30), dir * 4.4, 0, this.atk - 4, {
            sheet: lazySheet('sickle', buildSickle), anim: 'sickle', per: 3, r: 7, type: 'shot', solid: false, life: 400,
            tick: (b) => {
              if (b.t < 46) return;
              b.vx += Math.sign(this.x - b.x) * 0.2; // it turns round
              b.vx = clamp(b.vx, -5, 5);
              if (b.t > 60 && Math.abs(b.x - this.x) < 16) b.dead = true;
            },
          }));
        }
        if (this.pt > 110) this.pick('idle');
        break;
      }
      case 'whirl': {
        if (this.pt < 28) {
          this.look();
          this.loop('whirl', 6);
          if (this.pt === 1) g.audio.play('creak');
          d.dir = this.facing;
        } else if (this.pt < 118) {
          this.x += d.dir * 3.3;
          if (this.x < AX0 + 24 || this.x > AX1 - 24) d.dir = -d.dir;
          this.loop('whirl', 2);
          this.facing = d.dir;
          this.cut(g, this.x - 30, this.x + 30);
          this.hit(g, { x: this.x, y: this.y, hw: 36, hh: 26 }, this.atk);
          if (this.pt % 10 === 0) g.audio.play('whip');
        } else {
          // spun out: he reels, and has no idea where anything is
          d.dizzy = true;
          this.loop('stun', 7);
          if (this.pt > 200) this.pick('idle');
        }
        break;
      }
      case 'stun':
        this.loop('stun', 6);
        break;
    }
    this.x = clamp(this.x, AX0 + 20, AX1 - 20);
    if (two) this.sprite!.tint(1.25, 0.9, 0.75);
  }
}
