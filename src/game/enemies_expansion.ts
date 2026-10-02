// Enemies of the castle expansion: Wild Dog, Harpy, Bell Wraith and Frost Crawler,
// plus the floor shockwave that bell tolls and heavy landings send out.
// Like the older enemies, they read speed/ranges/abilities through num()/can() so
// enemy-editor variants work.
import { Sprite } from '../gfx/view';
import { Ent } from './ent';
import type { Game } from './game';
import { Enemy } from './enemies';
import { groundAt } from '../world/room';
import { EnemyShot } from './objects';
import { clamp, rand } from '../core/util';
import { TILE } from '../config';

// ---------------------------------------------------------------- shockwave

/** A low wave that runs along the floor until it hits a wall or a drop. Jump over it. */
export class Shockwave extends Ent {
  t = 0;
  constructor(g: Game, x: number, floorY: number, public vx: number, dmg: number, private life = 220) {
    super();
    this.x = x;
    this.y = floorY - 7;
    this.hw = 6;
    this.hh = 7;
    this.hostile = true;
    this.touchDmg = dmg;
    this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 14);
  }
  update(g: Game) {
    this.t++;
    this.x += this.vx;
    const ahead = this.x + Math.sign(this.vx) * 8;
    if (this.t > this.life || g.room.solidPx(ahead, this.y) || !groundAt(g.room, ahead, this.y + 7)) {
      this.dead = true;
      g.fx.burst(this.x, this.y + 4, 'dust', 2, 4);
      return;
    }
    const s = this.sprite!;
    s.anim('shock', this.t / 60, 12);
    s.place(this.x, this.y, this.vx < 0);
    s.glow = 0.4;
    if (this.t % 6 === 0) g.fx.burst(this.x, this.y + 6, 'dust', 1, 2, { vy: -0.5 });
  }
}

/** The floor y (top of the first solid or one-way tile) at or below (x, y), or -1. */
export function floorBelow(g: Game, x: number, y: number, maxTiles = 20) {
  const tx = Math.floor(x / TILE);
  for (let ty = Math.floor(y / TILE); ty < Math.floor(y / TILE) + maxTiles; ty++) {
    if (g.room.floorAt(tx, ty)) return ty * TILE;
  }
  return -1;
}

/** Send a pair of shockwaves left and right from (x, floorY). */
export function shockPair(g: Game, x: number, floorY: number, speed: number, dmg: number) {
  g.spawn(new Shockwave(g, x - 8, floorY, -speed, dmg));
  g.spawn(new Shockwave(g, x + 8, floorY, speed, dmg));
}

// ---------------------------------------------------------------- wild dog

export class Dog extends Enemy {
  state: 'prowl' | 'crouch' | 'run' | 'pounce' | 'skid' = 'prowl';
  st = 0;
  cool = 30;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 9, 7);
    this.feet = 11;
    this.facing = Math.random() < 0.5 ? -1 : 1;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    this.st++;
    if (this.cool > 0) this.cool--;
    const dx = p.x - this.x, adx = Math.abs(dx), dy = Math.abs(p.bottom - this.bottom);
    const spd = this.num('speed');
    const A = this.anims, s = this.sprite!;
    const set = (st: Dog['state']) => {
      this.state = st;
      this.st = 0;
    };
    if (this.stun <= 0)
      switch (this.state) {
        case 'prowl':
          this.patrolTurn(g, 0.55 * spd);
          s.anim('run', this.t / 60, 6);
          if (p.alive && this.cool <= 0 && adx < 170 * this.num('sight') && dy < 56) {
            this.faceToward(p.x);
            set('crouch');
            g.audio.play('growl');
          }
          break;
        case 'crouch':
          this.vx = 0;
          s.setFrame(A.crouch[0]);
          if (this.st > 18) set('run');
          break;
        case 'run': {
          this.vx = this.facing * 2.5 * spd;
          s.anim('run', this.t / 60, 14);
          const ahead = this.x + this.facing * (this.hw + 4);
          const blocked = g.room.solidPx(ahead, this.y) || (this.onGround && !groundAt(g.room, ahead, this.bottom));
          if (blocked) {
            set('skid');
            break;
          }
          if (this.can('pounce') && this.onGround && adx < 70 && Math.sign(dx) === this.facing) {
            set('pounce');
            this.vy = -4.4;
            this.vx = this.facing * 3.2 * spd;
            g.audio.play('bark');
          } else if (Math.sign(dx) !== this.facing && adx > 48) set('skid'); // ran past you
          break;
        }
        case 'pounce':
          s.setFrame(A.leap[0]);
          if (this.onGround && this.st > 4) set('skid');
          break;
        case 'skid':
          this.vx *= 0.86;
          s.setFrame(A.stand[0]);
          if (this.st % 5 === 0 && Math.abs(this.vx) > 0.6) g.fx.burst(this.x - this.facing * 6, this.bottom - 2, 'dust', 1, 0);
          if (this.st > 26) {
            set('prowl');
            this.cool = 50 * this.num('cooldown');
            this.faceToward(p.x);
          }
          break;
      }
    this.physics(g);
    this.place();
  }
}

// ---------------------------------------------------------------- harpy

export class Harpy extends Enemy {
  state: 'idle' | 'stalk' | 'swoop' | 'throw' = 'idle';
  st = 0;
  cool: number;
  side = Math.random() < 0.5 ? -1 : 1;
  homeX: number;
  homeY: number;
  constructor(g: Game, kind: string, x: number, y: number) {
    super(g, kind, x, y + 8, 8, 8);
    this.homeX = x;
    this.homeY = y;
    this.cool = (80 + Math.random() * 60) * this.num('cooldown');
  }
  /** Move without entering walls (harpies fly but don't pass through stone). */
  fly(g: Game) {
    const nx = this.x + this.vx, ny = this.y + this.vy;
    if (!g.room.solidPx(nx + Math.sign(this.vx) * this.hw, this.y)) this.x = nx;
    else this.vx = 0;
    if (!g.room.solidPx(this.x, ny + Math.sign(this.vy) * this.hh)) this.y = ny;
    else this.vy = 0;
    this.x = clamp(this.x, 8, g.room.W - 8);
    this.y = clamp(this.y, 8, g.room.H - 8);
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    const spd = this.num('speed');
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    const set = (st: Harpy['state']) => {
      this.state = st;
      this.st = 0;
    };
    if (this.stun > 0) {
      this.vy *= 0.9;
      this.fly(g);
    } else
      switch (this.state) {
        case 'idle':
          this.vx = Math.cos(this.t * 0.02) * 0.4;
          this.vy = (this.homeY + Math.sin(this.t * 0.05) * 6 - this.y) * 0.05;
          this.fly(g);
          if (p.alive && d < 210 * this.num('sight')) {
            set('stalk');
            g.audio.play('harpy');
          }
          break;
        case 'stalk': {
          // hover up and to one side of the hunter
          const tx = p.x + this.side * 72, ty = p.y - 64 + Math.sin(this.t * 0.06) * 8;
          this.vx = clamp(this.vx + Math.sign(tx - this.x) * 0.08 * spd, -1.5 * spd, 1.5 * spd);
          this.vy = clamp(this.vy + Math.sign(ty - this.y) * 0.08 * spd, -1.2 * spd, 1.2 * spd);
          this.fly(g);
          this.faceToward(p.x);
          if (--this.cool <= 0 && p.alive) {
            const canSwoop = this.can('swoop'), canDart = this.can('darts');
            if (canSwoop && (!canDart || Math.random() < 0.6)) {
              set('swoop');
              this.vx = clamp((p.x - this.x) / 40, -3.6, 3.6) * spd;
              this.vy = 3.4 * spd;
              g.audio.play('harpy');
            } else if (canDart) set('throw');
            else this.cool = 60;
          }
          break;
        }
        case 'swoop':
          // a U-shaped dive: down at the hunter, then back up the far side
          this.vy -= 0.13 * this.num('speed');
          this.fly(g);
          if (this.st > 52) {
            set('stalk');
            this.side = -this.side;
            this.cool = (90 + Math.random() * 50) * this.num('cooldown');
          }
          break;
        case 'throw':
          this.vx *= 0.9;
          this.vy *= 0.9;
          this.fly(g);
          this.faceToward(p.x);
          if (this.st === 14) {
            const a = Math.atan2(p.y - 6 - this.y, p.x - this.x);
            g.spawn(new EnemyShot(g, this.x, this.y, Math.cos(a) * 2.8, Math.sin(a) * 2.8, 'feather', this.atk));
            g.audio.play('throw');
          }
          if (this.st > 26) {
            set('stalk');
            this.cool = (100 + Math.random() * 50) * this.num('cooldown');
          }
          break;
      }
    if (this.state === 'swoop') s.setFrame(A.dive[0]);
    else s.anim('fly', this.t / 60, 9);
    s.place(this.x, this.y, this.facing < 0);
  }
}

// ---------------------------------------------------------------- bell wraith

export class Wraith extends Enemy {
  state: 'drift' | 'ring' = 'drift';
  st = 0;
  cool: number;
  constructor(g: Game, kind: string, x: number, y: number) {
    super(g, kind, x, y + 12, 7, 12);
    this.cool = (90 + Math.random() * 60) * this.num('cooldown');
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    const dx = p.x - this.x, dy = p.y - 4 - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const sight = 240 * this.num('sight'), sp = this.num('speed');
    if (this.state === 'drift') {
      if (d < sight && this.stun <= 0) {
        // drifts slowly toward the hunter but keeps a little distance
        const want = d > 70 ? 1 : -0.5;
        this.vx = clamp(this.vx + (dx / d) * 0.02 * sp * want, -0.45 * sp, 0.45 * sp);
        this.vy = clamp(this.vy + (dy / d) * 0.02 * sp, -0.35 * sp, 0.35 * sp);
        if (this.can('toll') && --this.cool <= 0) {
          this.state = 'ring';
          this.st = 0;
        }
      } else {
        this.vx *= 0.96;
        this.vy *= 0.96;
      }
      this.facing = dx < 0 ? -1 : 1;
      s.anim('float', this.t / 60, 6);
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
      s.setFrame(A.ring[Math.floor(this.st / 6) % 2]);
      s.glow = 0.2 + (this.st / 40) * 0.5;
      if (this.st === 30) {
        g.audio.play('handbell');
        g.shake(1.5, 10);
        const fy = floorBelow(g, this.x, this.y + this.hh);
        if (fy > 0) shockPair(g, this.x, fy, 2.0, this.atk);
        g.fx.burst(this.x + this.facing * 10, this.y - 2, 'spark', 1, 2);
      }
      if (this.st > 50) {
        this.state = 'drift';
        this.cool = (170 + Math.random() * 60) * this.num('cooldown');
      }
    }
    if (this.state === 'drift') s.glow = 0.15;
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.t * 0.05) * 0.2;
    s.opacity = 0.8 + Math.sin(this.t * 0.07) * 0.15;
    s.place(this.x, this.y, this.facing < 0);
    if (this.t % 14 === 0) g.fx.burst(this.x + rand(-5, 5), this.y + 14, 'mote', 1, 0, { vy: 0.3, life: 30, fade: true, glow: 0.5 });
  }
}

// ---------------------------------------------------------------- frost crawler

export class Crawler extends Enemy {
  mode: 'floor' | 'ceil' | 'fall' = 'floor';
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 8, 6);
    this.feet = 9;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    // placed right under a ceiling: cling to it
    const top = this.y - this.hh;
    if (g.room.solidPx(x, top - 6)) {
      this.mode = 'ceil';
      const ceil = (Math.floor((top - 6) / TILE) + 1) * TILE;
      this.y = ceil + this.hh;
    }
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    const sp = this.num('speed');
    if (this.mode === 'ceil') {
      if (this.stun <= 0) {
        const ahead = this.x + this.facing * (this.hw + 2);
        const wall = g.room.solidPx(ahead, this.y);
        const ceilAhead = g.room.solidPx(ahead, this.y - this.hh - 4);
        if (wall || !ceilAhead) this.facing = -this.facing;
        this.vx = this.facing * 0.5 * sp;
        this.x += this.vx;
      } else this.x += this.vx;
      if (this.can('drop') && p.alive && Math.abs(p.x - this.x) < 18 && p.y > this.y && p.y - this.y < 200 * this.num('sight')) {
        this.mode = 'fall';
        this.vy = 0;
        this.vx = 0;
        g.audio.play('bone');
      }
      s.anim('crawl', this.t / 60, 8);
      s.mesh.rotation.z = Math.PI; // upside down on the ceiling
      s.place(this.x, this.y - this.hh + 9, this.facing > 0);
      return;
    }
    s.mesh.rotation.z = 0;
    if (this.mode === 'fall') {
      const r = this.physics(g);
      s.setFrame(A.drop[0]);
      if (r.landed || this.onGround) {
        this.mode = 'floor';
        g.fx.burst(this.x, this.bottom - 2, 'puff', 2, 4, { life: 18, fade: true });
        g.shake(1, 6);
      }
      this.place();
      return;
    }
    if (this.stun <= 0) {
      const near = Math.abs(p.x - this.x) < 140 * this.num('sight') && Math.abs(p.bottom - this.bottom) < 32;
      if (near && this.t % 30 === 0) this.faceToward(p.x);
      this.patrolTurn(g, (near ? 0.95 : 0.5) * sp);
    }
    this.physics(g);
    s.anim('crawl', this.t / 60, 10);
    this.place();
  }
}
