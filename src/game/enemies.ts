import { Sprite } from '../gfx/view';
import { Ent, HitKind, DmgType } from './ent';
import type { Game } from './game';
import { moveBody, groundAt } from '../world/room';
import { ENEMY, Tune, defaultTune } from './data';
import { sign, clamp, rand, overlap } from '../core/util';
import { GRAVITY, MAX_FALL } from '../config';
import { EnemyShot, rollEnemyDrop } from './objects';

/** Frames a Throwing Knife's mark lasts if nothing else hits the enemy (5 s). */
const EXPOSE_TIME = 300;

export abstract class Enemy extends Ent {
  hp: number;
  maxHp: number;
  atk: number;
  xp: number;
  vx = 0;
  vy = 0;
  onGround = false;
  facing = -1;
  stun = 0;
  flashT = 0;
  t = 0;
  heavy = false;
  feet = 18; // sprite anchor to bottom offset
  /** Behavior knobs from the enemy editor (see ENEMY_TUNING in data.ts). */
  tune: Tune;
  /**
   * States that are deliberate lunges (a pounce, a dive, a charge). Touching the enemy in
   * one of them counts as a melee blow, so the hero's shield can block it. Any other
   * touch is plain contact, which goes through the shield.
   */
  lunges: string[] = [];
  private markGlow = false; // the knife-mark glow is showing
  /** Carries a shield of its own: a Throwing Knife can't mark it. */
  get shielded() {
    return false;
  }
  /** `kind` is the ENEMY id: a base enemy like 'drowned' or a variant made in the enemy editor. */
  constructor(g: Game, public kind: string, x: number, bottom: number, hw: number, hh: number) {
    super();
    const st = ENEMY[kind];
    this.tune = { ...defaultTune(st.base || kind), ...st.tune };
    this.hp = this.maxHp = st.hp;
    this.atk = st.atk;
    this.def = st.def;
    this.xp = st.xp;
    this.x = x;
    this.hw = hw;
    this.hh = hh;
    this.y = bottom - hh;
    this.whipTarget = true;
    this.hostile = true;
    this.touchDmg = this.atk;
    this.sprite = new Sprite(g.enemySheet(kind), g.view.sprites, 10);
  }
  get anims() {
    return this.sprite!.sheet.anims;
  }
  /** A number knob (speed, sight, cooldown); 1 means unchanged. */
  num(key: string) {
    const v = this.tune[key];
    return typeof v === 'number' ? v : 1;
  }
  /** An ability switch; abilities are on unless the editor turned them off. */
  can(key: string) {
    return this.tune[key] !== false;
  }
  get bottom() {
    return this.y + this.hh;
  }
  faceToward(px: number) {
    this.facing = px < this.x ? -1 : 1;
  }
  hitType(): DmgType {
    return this.lunges.includes((this as any).state) ? 'melee' : 'touch';
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    // a Throwing Knife marks it (see Game.dealHit): it glows until the next hit lands
    if (kind === 'knife' && !this.shielded) this.exposedT = EXPOSE_TIME;
    this.hp -= dmg;
    this.flashT = 8;
    g.damageNumber(this.x, this.y - this.hh - 4, dmg, crit ? '#ffe040' : '#ffffff');
    g.audio.play('hit');
    if (!this.heavy && kind !== 'dangle') {
      this.vx = sign(this.x - fromX || 1) * 1.8;
      this.stun = 12;
    }
    if (kind === 'whip') g.hitstop(3);
    if (g.hunter.fireWhip && kind !== 'holy' && kind !== 'cross') g.fx.burst(this.x, this.y, 'fire', 1, 4, { sheet: 'fire', life: 20 });
    if (this.hp <= 0) this.die(g);
  }
  die(g: Game) {
    this.dead = true;
    const h = g.hunter;
    h.kills++;
    h.bestiary[this.kind] = (h.bestiary[this.kind] || 0) + 1;
    const ups = h.gainXp(this.xp);
    g.audio.play('enemyDie');
    g.fx.burst(this.x, this.y, 'burst', 3, 8, { fps: 12 });
    g.fx.burst(this.x, this.y, 'smoke', 4, 10, { vy: -0.5, fps: 8, life: 40 });
    g.fx.burst(this.x, this.y, 'ember', 8, 4, { speed: 2.5, grav: 0.08, life: 35 });
    if (ups) g.levelUp();
    rollEnemyDrop(g, this.kind, this.x, this.y);
  }
  physics(g: Game, gravity = true) {
    if (gravity) this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    return moveBody(g.room, this, true);
  }
  baseUpdate(g: Game) {
    this.t++;
    if (this.flashT > 0) this.flashT--;
    if (this.stun > 0) {
      this.stun--;
      this.vx *= 0.85;
    }
    const s = this.sprite!;
    s.flash = this.flashT > 0 ? (this.flashT % 4 < 2 ? 0.9 : 0.4) : 0;
    // marked by a knife: a slow pale pulse
    if (this.exposedT > 0) {
      this.exposedT--;
      s.glow = this.exposedT > 0 ? 0.3 + Math.sin(this.t * 0.2) * 0.2 : 0;
    } else if (this.markGlow) s.glow = 0; // the mark was used up by a hit
    this.markGlow = this.exposedT > 0;
  }
  place() {
    // all character art is drawn facing right, so mirror when facing left
    this.sprite!.place(this.x, this.bottom - this.feet, this.facing < 0);
  }
  /** Turn around at walls and ledges. */
  patrolTurn(g: Game, speed: number) {
    const ahead = this.x + this.facing * (this.hw + 2);
    const wall = g.room.solidPx(ahead, this.y);
    const ledge = this.onGround && !groundAt(g.room, ahead, this.bottom);
    if (wall || ledge) this.facing = -this.facing;
    this.vx = this.facing * speed;
  }
}

// ---------------------------------------------------------------- zombie
export class Zombie extends Enemy {
  state: 'buried' | 'rise' | 'walk' = 'buried';
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 6, 17);
    this.hostile = false;
    this.whipTarget = false;
    this.sprite!.visible = false;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    if (this.state === 'buried') {
      const sight = this.num('sight');
      if (Math.abs(p.x - this.x) < 150 * sight && Math.abs(p.y - this.y) < 80 * sight) {
        this.state = 'rise';
        this.t = 0;
        this.sprite!.visible = true;
        this.faceToward(p.x);
        g.audio.play('crumble');
      }
      return;
    }
    if (this.state === 'rise') {
      this.sprite!.anim('rise', this.t / 60, 7, false);
      if (this.t % 8 === 0) g.fx.burst(this.x + rand(-8, 8), this.bottom - 2, 'dust', 1, 0, { vy: -0.4 });
      if (this.t > 42) {
        this.state = 'walk';
        this.hostile = true;
        this.whipTarget = true;
      }
      this.place();
      return;
    }
    if (this.stun <= 0) {
      if (this.t % 90 === 0) this.faceToward(p.x);
      this.patrolTurn(g, 0.42 * this.num('speed'));
    }
    this.physics(g);
    this.sprite!.anim('walk', this.t / 60, 4);
    this.place();
  }
}

// ---------------------------------------------------------------- bat
export class Bat extends Enemy {
  state: 'hang' | 'fly' = 'hang';
  baseY: number;
  constructor(g: Game, kind: string, x: number, y: number) {
    super(g, kind, x, y + 6, 5, 4);
    this.feet = 4;
    this.baseY = y;
    // stick to the ceiling above
    let cy = y;
    while (cy > 0 && !g.room.solidPx(x, cy - 8)) cy -= 8;
    this.y = cy + 4;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    if (this.state === 'hang') {
      this.sprite!.setFrame(this.anims.hang[0]);
      // short grace period after the room loads so a bat never wakes on top of you
      const sight = this.num('sight');
      if (this.t > 45 && Math.abs(p.x - this.x) < 120 * sight && p.y > this.y - 20 && p.y - this.y < 160 * sight) {
        this.state = 'fly';
        this.faceToward(p.x);
        this.t = 0;
        this.baseY = p.y - 10;
      }
      this.sprite!.place(this.x, this.y + 2);
      return;
    }
    if (this.stun <= 0) {
      this.vx = this.facing * 1.35 * this.num('speed');
      this.baseY += sign(p.y - 8 - this.baseY) * 0.5;
      this.vy = (this.baseY + Math.sin(this.t * 0.09) * 20 - this.y) * 0.08;
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.t > 60 && Math.abs(p.x - this.x) > 140 && Math.sign(p.x - this.x) !== this.facing && this.t % 60 === 0) this.faceToward(p.x);
    this.sprite!.anim('fly', this.t / 60, 12);
    this.sprite!.place(this.x, this.y, false);
    if (this.x < -40 || this.x > g.room.W + 40) this.dead = true;
  }
}

// ---------------------------------------------------------------- spear knight
export class Knight extends Enemy {
  state: 'walk' | 'ready' | 'thrust' | 'cool' = 'walk';
  st = 0;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 8, 19);
    this.heavy = true;
    this.feet = 19;
  }
  get shielded() {
    return this.can('shield');
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    // shield blocks hits from the front at half damage
    const front = this.can('shield') && sign(fromX - this.x) === this.facing && this.state !== 'thrust';
    super.onHit(g, front ? Math.max(1, Math.floor(dmg * 0.5)) : dmg, fromX, crit, kind);
    if (front) {
      g.audio.play('clink');
      g.fx.burst(this.x + this.facing * 8, this.y - 4, 'spark', 1);
    }
    this.vx = sign(this.x - fromX) * 0.8;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    this.st++;
    const A = this.anims;
    switch (this.state) {
      case 'walk':
        this.patrolTurn(g, 0.5 * this.num('speed'));
        this.sprite!.anim('walk', this.t / 60, 5);
        if (this.can('thrust') && Math.abs(p.x - this.x) < 96 * this.num('sight') && Math.abs(p.y - this.y) < 28 && p.alive) {
          this.faceToward(p.x);
          this.state = 'ready';
          this.st = 0;
        }
        break;
      case 'ready':
        this.vx = 0;
        this.sprite!.setFrame(A.ready[0]);
        if (this.st > 28) {
          this.state = 'thrust';
          this.st = 0;
          g.audio.play('dash');
        }
        break;
      case 'thrust': {
        this.vx = this.st < 6 ? this.facing * 2.6 : 0;
        this.sprite!.setFrame(A.thrust[this.st < 4 ? 0 : 1]);
        const spear = { x: this.x + this.facing * 36, y: this.y - 2, hw: 15, hh: 4 };
        if (p.alive && overlap(spear, p)) p.takeDamage(this.atk + 2, this.x, false, true, 'melee', this.y - 2);
        if (this.st > 22) {
          this.state = 'cool';
          this.st = 0;
        }
        break;
      }
      case 'cool':
        this.vx = 0;
        this.sprite!.setFrame(A.ready[0]);
        if (this.st > 40 * this.num('cooldown')) {
          this.state = 'walk';
          this.st = 0;
        }
        break;
    }
    this.physics(g);
    this.place();
  }
}

// ---------------------------------------------------------------- skeleton
export class Skeleton extends Enemy {
  state: 'walk' | 'throw' | 'hop' = 'walk';
  st = 0;
  cool: number;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 6, 17);
    this.cool = (60 + Math.random() * 60) * this.num('cooldown');
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    const dx = p.x - this.x, adx = Math.abs(dx);
    this.st++;
    if (this.cool > 0) this.cool--;
    const A = this.anims;
    if (this.stun <= 0)
      switch (this.state) {
        case 'walk':
          this.faceToward(p.x);
          if (this.can('hop') && adx < 64 && this.onGround && Math.abs(p.y - this.y) < 40) {
            this.state = 'hop';
            this.vy = -3.4;
            this.vx = -this.facing * 1.6;
            this.st = 0;
            g.audio.play('bone');
          } else if (this.can('throw') && this.cool <= 0 && adx < 240 * this.num('sight') && Math.abs(p.y - this.y) < 120) {
            this.state = 'throw';
            this.st = 0;
            this.vx = 0;
          } else {
            // keeps its distance while it can throw; without bones it walks up to you
            const want = adx > (this.can('throw') ? 130 : 8) ? this.facing * 0.5 * this.num('speed') : 0;
            this.vx = want;
            if (want && (g.room.solidPx(this.x + this.facing * 10, this.y) || !groundAt(g.room, this.x + this.facing * 10, this.bottom))) this.vx = 0;
          }
          if (Math.abs(this.vx) > 0) this.sprite!.anim('walk', this.t / 60, 6);
          else this.sprite!.setFrame(A.walk[0]);
          break;
        case 'throw':
          this.sprite!.setFrame(A.throw[this.st < 12 ? 0 : 1]);
          if (this.st === 12) this.throwShot(g, adx);
          if (this.st > 26) {
            this.state = 'walk';
            this.cool = (100 + Math.random() * 60) * this.num('cooldown');
          }
          break;
        case 'hop':
          this.sprite!.setFrame(A.hop[0]);
          if (this.onGround && this.st > 4) {
            this.state = 'walk';
            this.vx = 0;
          }
          break;
      }
    this.physics(g);
    this.place();
  }
  /** Let go of the throw: a bone lobbed in an arc that lands near the hunter (`adx` px away). */
  throwShot(g: Game, adx: number) {
    const d = clamp(adx / 55, 1, 3.4);
    g.spawn(new EnemyShot(g, this.x + this.facing * 6, this.y - 14, this.facing * d, -4.4, 'bone', this.atk, 0.16));
    g.audio.play('bone');
  }
}

// ---------------------------------------------------------------- wisp
export class Wisp extends Enemy {
  constructor(g: Game, kind: string, x: number, y: number) {
    super(g, kind, x, y + 8, 6, 7);
    this.feet = 7;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    const dx = p.x - this.x, dy = p.y - 6 - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 260 * this.num('sight') && this.stun <= 0) {
      const sp = this.num('speed'), max = 0.85 * sp;
      this.vx = clamp(this.vx + (dx / d) * 0.035 * sp, -max, max);
      this.vy = clamp(this.vy + (dy / d) * 0.035 * sp, -max, max);
    } else {
      this.vx *= 0.97;
      this.vy *= 0.97;
    }
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.t * 0.07) * 0.3;
    this.facing = this.vx > 0 ? 1 : -1;
    const s = this.sprite!;
    s.anim('float', this.t / 60, 8);
    s.opacity = 0.65 + Math.sin(this.t * 0.05) * 0.25;
    s.glow = 0.3;
    s.place(this.x, this.y, false);
    if (this.t % 10 === 0) g.fx.burst(this.x + rand(-4, 4), this.y + 4, 'mote', 1, 0, { vy: -0.5, life: 30, fade: true, glow: 0.5 });
  }
}

// ---------------------------------------------------------------- drowned
export class Drowned extends Enemy {
  state: 'lurk' | 'leap' | 'walk' | 'spit' = 'lurk';
  lunges = ['leap'];
  st = 0;
  cool: number;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 7, 18);
    this.cool = 80 * this.num('cooldown');
    if (this.can('leap')) {
      // hidden under the water until the hunter comes close
      this.hostile = false;
      this.whipTarget = false;
      this.sprite!.visible = false;
    } else this.state = 'walk';
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    this.st++;
    const A = this.anims;
    const water = g.room.water;
    const inW = g.room.inWater(this.x, this.y);
    const sight = this.num('sight'), speed = this.num('speed');
    switch (this.state) {
      case 'lurk':
        if (Math.abs(p.x - this.x) < 110 * sight && this.st > 30) {
          this.state = 'leap';
          this.st = 0;
          this.sprite!.visible = true;
          this.hostile = true;
          this.whipTarget = true;
          if (water) this.y = water.y + 6;
          this.vy = -7.2;
          this.faceToward(p.x);
          this.vx = this.facing * 1.1;
          g.audio.play('splash');
          g.fx.burst(this.x, water ? water.y - 6 : this.y, 'splash', 2, 6);
        }
        return;
      case 'leap':
        this.sprite!.setFrame(A.leap[0]);
        if (this.onGround && this.st > 6) {
          this.state = 'walk';
          this.st = 0;
        }
        break;
      case 'walk':
        if (this.stun <= 0) {
          if (this.st % 60 === 1) this.faceToward(p.x);
          this.patrolTurn(g, (inW ? 0.3 : 0.45) * speed);
        }
        this.cool--;
        this.sprite!.anim('walk', this.t / 60, 5);
        if (this.can('spit') && this.cool <= 0 && Math.abs(p.y - this.y) < 50 && Math.abs(p.x - this.x) < 220 * sight) {
          this.faceToward(p.x);
          this.state = 'spit';
          this.st = 0;
        }
        break;
      case 'spit':
        this.vx = 0;
        this.sprite!.setFrame(A.spit[0]);
        if (this.st === 14) {
          g.spawn(new EnemyShot(g, this.x + this.facing * 10, this.y - 12, this.facing * 2.2, 0, 'fireball', this.atk));
          g.audio.play('spit');
        }
        if (this.st > 30) {
          this.state = 'walk';
          this.cool = 130 * this.num('cooldown');
          this.st = 0;
        }
        break;
    }
    const grav = inW ? 0.5 : 1;
    this.vy = Math.min(this.vy + GRAVITY * grav, inW ? 2 : MAX_FALL);
    moveBody(g.room, this, true);
    this.place();
  }
}

