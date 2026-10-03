// The Umbral Stalker (trial boss, 0.27.0). A crypt of four hanging lanterns and the dark between.
//
// In the dark it is a shadow with two ember eyes, and the chain passes through it. In the
// light it is solid, and light that falls on it by surprise leaves it cowering. To open it up:
//   - whip a lantern so it swings: if the moving pool of light crosses the beast, it is caught
//   - stand in a lit pool when it lunges: it lands in the light
//   - holy water: the flames are a light of their own
// (Walking through a still pool only shows it for a moment: you can chip it there.)
// Phase two: it leaps up and bites lanterns dark (two blows relight one), and its lunge
// becomes a feint and then the real thing.
import type { Game } from './game';
import { DmgType, HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target } from './boss_base';
import { TrialBoss, Cord, AX0, AX1 } from './boss_kit';
import { HolyFire } from './objects';
import { lazySheet } from '../gfx/lazy';
import { buildStalkerSheet, buildLanternSheet } from '../gfx/art_stalker';
import { clamp, lerp } from '../core/util';
import { TILE, VW, VH } from '../config';

const CEIL = 13 * TILE;
const ROPE = 100;
const LX = [AX0 + 72, AX0 + 200, AX1 - 200, AX1 - 72];
const POOL = 30; // half the width of a lantern's pool of light on the floor
const DARK = [AX0 + 22, (LX[0] + LX[1]) / 2, (LX[1] + LX[2]) / 2, (LX[2] + LX[3]) / 2, AX1 - 22];

interface Lantern { x: number; th: number; w: number; lit: boolean; hits: number; s: Sprite; rope: Cord }

export class Stalker extends TrialBoss {
  label = 'UMBRAL STALKER';
  lanterns: Lantern[];
  /** Frames before the light can catch it again. */
  wary = 0;
  seen = false;
  shade: HTMLCanvasElement;
  overlay: (c: CanvasRenderingContext2D) => void;
  constructor(g: Game, x: number) {
    super(g, 'stalker', lazySheet('stalker', buildStalkerSheet), 30, 18, x);
    const sheet = lazySheet('lantern', buildLanternSheet);
    this.lanterns = LX.map((lx) => {
      const l: Lantern = { x: lx, th: 0, w: 0, lit: true, hits: 0, s: new Sprite(sheet, g.view.sprites, 9), rope: new Cord(g, '#403c4c', 8) };
      this.props.push(l.s);
      this.gear.push(l.rope);
      return l;
    });
    this.facing = -1;
    // the dark itself: painted over the play field, with holes where there is light
    this.shade = document.createElement('canvas');
    this.shade.width = VW;
    this.shade.height = VH;
    this.overlay = (c) => this.drawDark(c);
    g.overlays.push(this.overlay);
  }
  /** Where lantern `l` hangs, and where its light lands on the floor. */
  at(l: Lantern) {
    return { x: l.x + Math.sin(l.th) * ROPE, y: CEIL + Math.cos(l.th) * ROPE, pool: l.x + Math.tan(l.th) * (this.floorY - CEIL) };
  }
  /** Is floor position x lit? Returns 2 if the light there is moving (a swinging lantern, or fire). */
  lightAt(x: number) {
    let lit = 0;
    for (const l of this.lanterns) {
      if (!l.lit || Math.abs(x - this.at(l).pool) > POOL) continue;
      lit = Math.max(lit, Math.abs(l.w) > 0.006 || Math.abs(l.th) > 0.08 ? 2 : 1);
    }
    for (const e of this.g.ents) if (e instanceof HolyFire && !e.dead && Math.abs(e.x - x) < 40) lit = 2;
    return lit;
  }
  drawDark(c: CanvasRenderingContext2D) {
    const g = this.g, v = g.view, d = this.shade.getContext('2d')!;
    const fade = this.pat === 'dying' ? Math.max(0, 1 - this.deathT / 120) : 1;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, VW, VH);
    d.fillStyle = `rgba(3,2,10,${0.72 * fade})`;
    d.fillRect(0, 0, VW, VH);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, r: number, a: number) => {
      const gr = d.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr;
      d.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const z = v.zoom, fy = v.sy(this.floorY);
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const a = this.at(l), sx = v.sx(a.x), sy = v.sy(a.y + 26), px = v.sx(a.pool);
      hole(sx, sy, 34 / z, 0.95);
      // the cone down to the floor
      d.fillStyle = 'rgba(0,0,0,0.8)';
      d.beginPath();
      d.moveTo(sx - 5 / z, sy);
      d.lineTo(sx + 5 / z, sy);
      d.lineTo(px + POOL / z, fy);
      d.lineTo(px - POOL / z, fy);
      d.fill();
      hole(px, fy, (POOL + 14) / z, 0.7);
    }
    for (const e of g.ents) if (e instanceof HolyFire && !e.dead) hole(v.sx(e.x), v.sy(e.y), 46 / z, 0.9);
    hole(v.sx(g.player.x), v.sy(g.player.y), 30 / z, 0.55); // she can always see herself
    c.drawImage(this.shade, 0, 0);
  }
  hitType(): DmgType {
    return this.pat === 'lunge' || this.pat === 'rake' ? 'melee' : 'touch';
  }
  targets(): Target[] {
    const out: Target[] = this.lanterns.map((l, i) => ({ id: `l${i}`, x: this.at(l).x, y: this.at(l).y + 24, r: 13 }));
    out.push({ id: 'body', x: this.x, y: this.y, r: 26 });
    return out;
  }
  onStrike(g: Game, t: Target, fromX: number, kind: HitKind) {
    if (t.id[0] === 'l') {
      const l = this.lanterns[+t.id.slice(1)];
      l.w += (t.x >= fromX ? 1 : -1) * 0.055;
      g.audio.play('clink');
      if (!l.lit && ++l.hits >= 2) {
        l.lit = true;
        l.hits = 0;
        g.audio.play('fire');
        g.fx.burst(t.x, t.y, 'ember', 8, 6, { speed: 1.4, life: 26, glow: 1 });
      }
      return;
    }
    if (this.vulnT <= 0 && !this.seen) {
      // nothing there to strike: the chain goes through smoke
      g.fx.burst(t.x, t.y, 'smoke', 2, 8, { life: 20, fade: true });
      return;
    }
    this.bodyHit(g, t, kind);
  }
  endStun(g: Game) {
    super.endStun(g);
    this.wary = 150;
  }
  destroy() {
    super.destroy();
    const i = this.g.overlays.indexOf(this.overlay);
    if (i >= 0) this.g.overlays.splice(i, 1);
  }
  /** Bite a lantern dark (phase two). */
  snuff(g: Game, l: Lantern) {
    l.lit = false;
    l.hits = 0;
    l.w += 0.03 * this.facing;
    g.audio.play('glass');
    g.fx.burst(this.at(l).x, this.at(l).y + 24, 'glass', 8, 8, { speed: 2, grav: 0.1, life: 30, fade: true });
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    const ground = this.floorY - this.hh;
    if (this.wary > 0) this.wary--;
    // ── the lanterns swing like any weight on a rope
    const LA = this.lanterns[0].s.sheet.anims;
    for (const l of this.lanterns) {
      l.w += -0.0042 * Math.sin(l.th);
      l.w *= 0.992;
      l.th += l.w;
      const a = this.at(l);
      l.rope.set(l.x, CEIL, a.x, a.y, 1.5);
      l.s.setFrame(l.lit ? LA.lit[Math.floor(g.frame / 7) % 4] : LA.dark[0]);
      l.s.place(a.x, a.y);
      l.s.glow = l.lit ? 0.3 : 0;
    }
    const light = this.lightAt(this.x), grounded = this.y >= ground - 1;
    this.seen = light > 0 || this.vulnT > 0;
    const busy = this.pat === 'enter' || this.pat === 'shift' || this.pat === 'stun' || this.pat === 'snuff';
    if (!busy && grounded && this.wary <= 0 && (light === 2 || (light === 1 && d.landed))) {
      g.audio.play('screech');
      this.stun(g, 270, 'CAUGHT IN THE LIGHT: STRIKE');
    }
    d.landed = false;
    switch (this.pat) {
      case 'enter':
        this.y = ground;
        this.x -= this.pt < 50 ? 0.8 : 0;
        this.loop(this.pt < 50 ? 'prowl' : 'idle', 5);
        if (this.pt >= 60 && this.pt < 110) this.once('crouch', this.pt - 60, 30);
        if (this.pt === 62) g.audio.play('growl');
        this.enterBeats(g, 62, 124);
        break;
      case 'shift': {
        // it goes for the nearest lantern
        if (this.pt === 1) {
          g.audio.play('howl');
          d.l = this.lanterns.filter((l) => l.lit).sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0];
          d.x0 = this.x;
        }
        if (this.pt < 40 || !d.l) this.once('crouch', this.pt, 40);
        else if (this.pt <= 70) {
          const t = (this.pt - 40) / 30, a = this.at(d.l);
          this.x = lerp(d.x0, a.x, t);
          this.y = ground - Math.sin(t * Math.PI) * (ground - a.y - 10);
          this.once('leap', this.pt - 40, 30);
          if (this.pt === 55) this.snuff(g, d.l);
        } else {
          this.y = ground;
          this.loop('idle', 6);
        }
        this.shiftBeats(g, 104);
        break;
      }
      case 'idle': {
        // slink to a patch of dark near her, then choose
        this.y = ground;
        if (this.pt === 1) {
          const want = p.x + (p.x > this.x ? -1 : 1) * 84;
          d.to = [...DARK].sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
        }
        const off = d.to - this.x;
        if (Math.abs(off) > 3) {
          this.facing = off < 0 ? -1 : 1;
          this.x += this.facing * (two ? 1.8 : 1.4);
          this.loop('prowl', 4);
        } else {
          this.look();
          this.loop('idle', 7);
        }
        if (this.pt > (two ? 70 : 96) && Math.abs(off) <= 3) {
          const lit = this.lanterns.filter((l) => l.lit);
          if (two && lit.length > 1 && this.last !== 'snuff' && Math.random() < 0.45) this.pick('snuff');
          else this.pick(Math.abs(this.dx) < 66 ? 'rake' : 'lunge');
        }
        break;
      }
      case 'lunge': {
        const tell = d.second ? 20 : 40, fly = 26;
        if (this.pt <= tell) {
          this.y = ground;
          this.look();
          this.once('crouch', this.pt, tell);
          if (this.pt === 1) g.audio.play('growl');
          if (this.pt === tell) {
            d.x0 = this.x;
            // phase two: the first spring stops short, the second is the real one
            const short = two && !d.second ? 70 : 0;
            d.tx = clamp(p.x - this.facing * short, AX0 + 30, AX1 - 30);
            g.audio.play('dash');
          }
        } else if (this.pt <= tell + fly) {
          const t = (this.pt - tell) / fly;
          this.x = lerp(d.x0, d.tx, t);
          this.y = ground - Math.sin(t * Math.PI) * 44;
          this.once('leap', this.pt - tell, fly);
          this.hit(g, { x: this.x + this.facing * 14, y: this.y, hw: 24, hh: 16 }, this.atk);
          if (t >= 1) {
            this.y = ground;
            d.landed = true;
            g.fx.burst(this.x, this.floorY - 2, 'dust', 5, 10, { vy: -0.5 });
            if (two && !d.second) {
              this.set('lunge');
              this.data.second = true;
              this.data.landed = true;
            }
          }
        } else {
          this.y = ground;
          this.loop('idle', 6);
          if (this.pt > tell + fly + 34) this.pick('idle');
        }
        break;
      }
      case 'rake':
        this.y = ground;
        if (this.pt < 12) this.look();
        this.once('rake', this.pt, 54);
        if (this.pt === 24) g.audio.play('whip');
        if (this.pt >= 26 && this.pt <= 36) this.hit(g, { x: this.x + this.facing * 34, y: this.y - 8, hw: 26, hh: 24 }, this.atk);
        if (this.pt > 64) this.pick('idle');
        break;
      case 'snuff': {
        if (this.pt === 1) {
          d.l = this.lanterns.filter((l) => l.lit).sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0];
          d.x0 = this.x;
          if (d.l) this.facing = d.l.x < this.x ? -1 : 1;
        }
        if (!d.l) {
          this.pick('idle');
          break;
        }
        if (this.pt < 30) this.once('crouch', this.pt, 30);
        else if (this.pt <= 62) {
          const t = (this.pt - 30) / 32, a = this.at(d.l);
          this.x = lerp(d.x0, a.x, t);
          this.y = ground - Math.sin(t * Math.PI) * (ground - a.y - 10);
          this.once('leap', this.pt - 30, 32);
          if (this.pt === 46) this.snuff(g, d.l);
        } else {
          this.y = ground;
          this.pick('idle');
        }
        break;
      }
      case 'stun':
        this.y = Math.min(ground, this.y + 5);
        this.loop('stun', 5);
        break;
    }
    this.x = clamp(this.x, AX0 + 20, AX1 - 20);
    // in the dark there is only the pair of eyes
    const s = this.sprite!;
    s.opacity = this.seen ? 1 : 0.22;
    s.tint(this.seen ? 1 : 0.3, this.seen ? 1 : 0.3, this.seen ? 1 : 0.5);
    if (!this.seen && g.frame % 3 === 0) g.fx.burst(this.x + this.facing * 34, this.y - 12, 'ember', 1, 1, { life: 7, glow: 1 });
  }
}
