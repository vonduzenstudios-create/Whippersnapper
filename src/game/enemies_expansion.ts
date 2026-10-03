// Enemies of the castle expansion: Wild Dog, Harpy, Bell Wraith and Frost Crawler,
// plus the floor shockwave that bell tolls and heavy landings send out, and the ring of
// sound right around a tolling bell.
// Like the older enemies, they read speed/ranges/abilities through num()/can() so
// enemy-editor variants work.
import { Sprite } from '../gfx/view';
import { Ent, DmgType, HitKind } from './ent';
import type { Game } from './game';
import { Enemy } from './enemies';
import { groundAt, moveBody } from '../world/room';
import { EnemyShot } from './objects';
import { clamp, rand } from '../core/util';
import { TILE } from '../config';
import { RING_RADII } from '../gfx/art_items';

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
  /** A wave of force, not a thing you can catch on a shield. */
  hitType(): DmgType {
    return 'magic';
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

const RING_LIFE = 18; // frames a toll's ring of sound takes to spread to its full size
const RING_ART = RING_RADII[RING_RADII.length - 1]; // the radius the ring art is drawn at
export const TOLL_RADIUS = 72; // a Bell Wraith's own toll reaches this far
/** Struck, a Bell Wraith's bell rings back out to this share of her whip's reach: strike from the very tip of it to stay clear. */
export const REVERB_SHARE = 0.8;

/**
 * The ring of sound around a tolling bell: it spreads out to `maxR` in RING_LIFE frames and
 * hurts the hero once if it reaches her. Stand back from the bell.
 */
export class TollRing extends Ent {
  t = 0;
  hit = false;
  constructor(g: Game, x: number, y: number, private dmg: number, private maxR = RING_ART) {
    super();
    this.x = x;
    this.y = y;
    this.sprite = new Sprite(g.sheets.ring, g.view.sprites, 14);
    // the ring art is drawn at RING_ART: stretch it to this ring's size
    const k = maxR / RING_ART, sh = g.sheets.ring;
    this.sprite.mesh.scale.set(sh.cw * k, sh.ch * k, 1);
  }
  get radius() {
    return this.maxR * Math.min(1, this.t / RING_LIFE);
  }
  update(g: Game) {
    this.t++;
    const s = this.sprite!, p = g.player;
    s.setFrame(s.sheet.anims.ring[Math.min(RING_RADII.length - 1, Math.floor((this.t / RING_LIFE) * RING_RADII.length))]);
    s.place(this.x, this.y);
    s.glow = 0.5;
    s.opacity = this.t > RING_LIFE ? Math.max(0, 1 - (this.t - RING_LIFE) / 8) : 1;
    // the nearest point of her body to the bell is inside the ring: it hits her
    const nx = clamp(this.x, p.x - p.hw, p.x + p.hw), ny = clamp(this.y, p.y - p.hh, p.y + p.hh);
    if (!this.hit && p.alive && this.t <= RING_LIFE && Math.hypot(nx - this.x, ny - this.y) < this.radius) {
      this.hit = true;
      p.takeDamage(this.dmg, this.x, false, true, 'magic', this.y);
    }
    if (this.t > RING_LIFE + 8) this.dead = true;
  }
}

/** Send a pair of shockwaves left and right from (x, floorY). */
export function shockPair(g: Game, x: number, floorY: number, speed: number, dmg: number) {
  g.spawn(new Shockwave(g, x - 8, floorY, -speed, dmg));
  g.spawn(new Shockwave(g, x + 8, floorY, speed, dmg));
}

// ---------------------------------------------------------------- wild dog

export class Dog extends Enemy {
  state: 'prowl' | 'crouch' | 'run' | 'pounce' | 'skid' | 'tumble' = 'prowl';
  lunges = ['pounce'];
  st = 0;
  cool = 30;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 9, 7);
    this.feet = 11;
    this.facing = Math.random() < 0.5 ? -1 : 1;
  }
  /** Its pounce hit the shield: it bounces off, tumbling, and has to scramble back up. */
  onBlocked(g: Game) {
    this.state = 'tumble';
    this.st = 0;
    this.vx = -this.facing * 2;
    this.vy = -2.6;
    this.onGround = false;
    g.audio.play('bark');
    g.fx.burst(this.x + this.facing * this.hw, this.y, 'spark', 1, 2);
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player;
    this.st++;
    if (this.cool > 0) this.cool--;
    const dx = p.x - this.x, adx = Math.abs(dx), dy = Math.abs(p.bottom - this.bottom);
    const spd = this.num('speed');
    this.sprite!.mesh.rotation.z = 0;
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
        case 'tumble':
          // head over heels in the air, then sprawled on its side until it scrambles up
          if (!this.onGround || this.st < 4) {
            s.setFrame(A.leap[0]);
            s.mesh.rotation.z = this.st * 0.4 * this.facing;
          } else {
            this.vx *= 0.8;
            s.setFrame(A.crouch[0]);
            if (this.st < 40) s.mesh.rotation.z = (Math.PI / 2) * this.facing; // on its side
            if (this.st % 10 === 0) g.fx.burst(this.x, this.bottom - 2, 'dust', 1, 2);
          }
          if (this.st > 55 && this.onGround) {
            set('prowl');
            this.cool = 40 * this.num('cooldown');
            this.faceToward(p.x);
          }
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
  reverbT = 0; // frames before a blow can make its bell ring back again
  constructor(g: Game, kind: string, x: number, y: number) {
    super(g, kind, x, y + 12, 7, 12);
    this.cool = (90 + Math.random() * 60) * this.num('cooldown');
  }
  /**
   * Any blow sets its bell ringing: a quick, smaller ring of sound out to REVERB_SHARE of her
   * whip's reach. Whip it from the tip and you're clear; any closer and the reverb hits you.
   */
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    super.onHit(g, dmg, fromX, crit, kind);
    if (this.dead || !this.can('reverb') || this.reverbT > 0) return;
    this.reverbT = 20;
    g.audio.play('handbell');
    // her farthest strike reaches about whipLen + 18 px from the near edge of her body to its middle
    g.spawn(new TollRing(g, this.x, this.y, Math.round(this.atk * 0.7), (g.hunter.whipLen + 18) * REVERB_SHARE));
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    if (this.reverbT > 0) this.reverbT--;
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
      // a quiet tinkle as it lifts the bell: the warning
      if (this.st === 1) g.audio.play('handbell');
      if (this.st === 30) {
        // DONG: the sound itself hurts up close, and the floor carries it on as shockwaves
        g.audio.play('dong');
        g.shake(3, 14);
        g.spawn(new TollRing(g, this.x + this.facing * 6, this.y, this.atk, TOLL_RADIUS));
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

const ICE_LIFE = 360; // frames a patch of ice trail lasts (6 s); it fades over the last 2
const ICE_STEP = 8; // px a crawler walks between patches
const ICICLE_EVERY = [90, 150]; // frames between icicles growing from a crawler's ceiling trail
const ICICLE_GROW = 50; // frames an icicle grows (and wobbles at the end) before it falls

/**
 * A patch of a Frost Crawler's ice trail, on a floor or (`ceil`) a ceiling. Standing on
 * floor ice chills the hero (see Player.chill): she slows down, then freezes solid. Ceiling
 * ice grows icicles that fall and leave more floor ice (see Crawler.dripIcicle). It thaws
 * away after a while. `surfY` is the floor's or ceiling's y.
 */
export class IcePatch extends Ent {
  t = 0;
  icicle = false; // an icicle is growing from it (ceiling ice only)
  constructor(g: Game, x: number, public surfY: number, public ceil = false, public owner: Crawler | null = null) {
    super();
    this.x = x;
    this.y = ceil ? surfY + 2 : surfY - 2;
    this.hw = 5;
    this.hh = 2;
    const s = (this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 7)); // over the tiles, under everyone
    s.setFrame(g.sheets.fx.anims.iceSlick[Math.random() < 0.5 ? 0 : 1]);
    // the glaze is drawn on the cell's bottom rows; turned over, it hangs from a ceiling
    if (ceil) s.mesh.rotation.z = Math.PI;
    s.place(x, ceil ? surfY + 8 - 1 : surfY - 8 + 1, Math.random() < 0.5);
  }
  update(g: Game) {
    const p = g.player;
    if (++this.t >= ICE_LIFE) this.dead = true;
    this.sprite!.opacity = Math.min(1, this.t / 10, (ICE_LIFE - this.t) / 120) * 0.9;
    // her feet are on it
    if (!this.ceil && p.onGround && Math.abs(p.bottom - this.surfY) < 3 && Math.abs(p.x - this.x) < this.hw + 2) p.onIce = true;
  }
}

/**
 * An icicle grown from a Frost Crawler's ceiling ice: it grows and wobbles, drops, hurts
 * whatever it falls on (a physical shot, so the shield stops it), and shatters into
 * a spread of floor ice where it lands.
 */
export class Icicle extends Ent {
  t = 0;
  vx = 0;
  vy = 0;
  onGround = false;
  falling = false;
  constructor(g: Game, private from: IcePatch, dmg: number) {
    super();
    this.x = from.x + rand(-2, 2);
    this.y = from.surfY + 7;
    this.hw = 2;
    this.hh = 6;
    this.touchDmg = dmg;
    this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 9);
    this.sprite.setFrame(g.sheets.fx.anims.icicle[0]);
    from.icicle = true;
  }
  hitType(): DmgType {
    return 'shot';
  }
  update(g: Game) {
    this.t++;
    const s = this.sprite!, top = this.from.surfY;
    if (!this.falling) {
      // grows down from the ceiling; shivers just before it lets go
      const grow = Math.min(1, this.t / (ICICLE_GROW - 14));
      const shake = this.t > ICICLE_GROW - 14 ? (this.t % 4 < 2 ? -1 : 1) : 0;
      s.place(this.x + shake, top + 8);
      s.mesh.scale.y = 16 * grow;
      s.mesh.position.y = -(top + 8 * grow);
      if (this.t >= ICICLE_GROW) {
        this.falling = true;
        this.hostile = true;
        this.from.icicle = false;
        s.mesh.scale.y = 16;
        g.audio.play('skitter');
      }
      return;
    }
    this.vy = Math.min(this.vy + 0.2, 5);
    const r = moveBody(g.room, this, true);
    s.place(this.x, this.y - this.hh + 8);
    if (g.room.inWater(this.x, this.y)) {
      this.dead = true;
      g.fx.burst(this.x, this.y, 'splash', 1, 0);
    } else if (r.landed || this.onGround || r.hitX || this.y > g.room.H + 16) {
      // shatters, glazing the floor where it lands
      this.dead = true;
      const floor = this.y + this.hh;
      g.audio.play('glass');
      g.fx.burst(this.x, floor - 3, 'glass', 5, 4, { speed: 1.6, grav: 0.2, life: 22, tint: [0.8, 1, 1.4] });
      if (r.landed || this.onGround) for (const dx of [-8, 0, 8]) if (groundAt(g.room, this.x + dx, floor)) g.spawn(new IcePatch(g, this.x + dx, floor));
    }
  }
}

const CRAWL_SPEED = 0.6; // px a frame it creeps along any surface
const CRAWL_LIFT = 9; // its sprite's middle sits this far off the surface it clings to

/**
 * A Frost Crawler goes its own way and pays the hero no mind. It clings to whatever it walks
 * on and follows it round every corner: up a wall, across the ceiling, down the far side,
 * round and round a block. It only turns back at water and at the room's edges (doorways
 * and holes out of the room). On a ceiling it lets go when she passes below.
 *
 * It tracks a "foot" point (fx, fy) half a pixel off its surface, `nx, ny` pointing into the
 * surface and `tx, ty` the way it's walking along it.
 */
export class Crawler extends Enemy {
  mode: 'cling' | 'fall' = 'cling';
  fx: number;
  fy: number;
  nx = 0;
  ny = 1;
  tx: number;
  ty = 0;
  rot = 0; // the sprite's drawn angle, easing round corners
  iceX = NaN; // where it laid its last patch of ice
  icicleT = rand(ICICLE_EVERY[0], ICICLE_EVERY[1]); // frames to the next icicle
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 8, 6);
    this.feet = 9;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.tx = this.facing;
    this.fx = x;
    this.fy = bottom - 0.5;
    // placed right under a ceiling: cling to it
    const top = this.y - this.hh;
    if (g.room.solidPx(x, top - 6)) {
      this.fy = (Math.floor((top - 6) / TILE) + 1) * TILE + 0.5;
      this.nx = 0;
      this.ny = -1;
      this.rot = Math.PI;
    } else if (!g.room.solidPx(x, bottom + 0.5)) this.mode = 'fall';
    this.syncBody();
  }
  get onCeiling() {
    return this.ny < 0;
  }
  /** Its hitbox: centered just off the surface, turned on its side on a wall. */
  syncBody() {
    this.x = this.fx - this.nx * 6;
    this.y = this.fy - this.ny * 6;
    this.hw = this.nx ? 6 : 8;
    this.hh = this.nx ? 8 : 6;
  }
  /** A step to (x, y) would take it out of the room (a doorway or a hole), or into water. */
  stopsAt(g: Game, x: number, y: number) {
    const r = g.room;
    return x < 2 || x > r.W - 2 || y < 2 || y > r.H - 2 || r.inWater(x, y);
  }
  turnBack() {
    this.tx = -this.tx;
    this.ty = -this.ty;
  }
  /** Creep `dist` px along its surface, following it round corners. */
  crawl(g: Game, dist: number) {
    const r = g.room;
    for (let left = dist, turns = 0; left > 0 && turns < 4; ) {
      const step = Math.min(1, left);
      // a wall ahead (an inside corner): climb it
      if (r.solidPx(this.fx + this.tx * step, this.fy + this.ty * step)) {
        [this.nx, this.ny, this.tx, this.ty] = [this.tx, this.ty, -this.nx, -this.ny];
        turns++;
        continue;
      }
      const nx = this.fx + this.tx * step, ny = this.fy + this.ty * step;
      if (this.stopsAt(g, nx, ny)) {
        this.turnBack();
        turns++;
        continue;
      }
      this.fx = nx;
      this.fy = ny;
      left -= step;
      // the surface ran out under it (an outside corner): wrap round the edge onto its side
      if (!r.solidPx(this.fx + this.nx, this.fy + this.ny)) {
        const [ox, oy] = [this.nx, this.ny];
        [this.nx, this.ny, this.tx, this.ty] = [-this.tx, -this.ty, ox, oy];
        const wx = this.fx + this.tx, wy = this.fy + this.ty;
        if (this.stopsAt(g, wx, wy)) {
          // wrapping would take it out of the room: back up and turn round instead
          [this.nx, this.ny, this.tx, this.ty] = [ox, oy, this.nx, this.ny];
          this.fx -= this.tx * step;
          this.fy -= this.ty * step;
          this.turnBack();
        } else {
          this.fx = wx;
          this.fy = wy;
        }
        turns++;
      }
    }
  }
  /** Lay a patch of ice trail at surface y `surfY` every ICE_STEP px it walks (floors and ceilings only). */
  layIce(g: Game, surfY: number, ceil: boolean) {
    if (!this.can('trail') || Math.abs(this.x - this.iceX) < ICE_STEP) return;
    this.iceX = this.x;
    g.spawn(new IcePatch(g, this.x, surfY, ceil, this));
  }
  /** Every so often an icicle grows from a bit of its ceiling trail (not right where it is). */
  dripIcicle(g: Game) {
    if (!this.can('trail') || --this.icicleT > 0) return;
    this.icicleT = rand(ICICLE_EVERY[0], ICICLE_EVERY[1]);
    const spots = g.ents.filter((e): e is IcePatch => e instanceof IcePatch && e.owner === this && e.ceil && !e.icicle && e.t > 30 && e.t < ICE_LIFE - ICICLE_GROW && Math.abs(e.x - this.x) > 12);
    if (spots.length) g.spawn(new Icicle(g, spots[Math.floor(Math.random() * spots.length)], Math.max(1, Math.round(this.atk * 0.6))));
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    if (this.mode === 'fall') {
      this.iceX = NaN; // a fresh trail where it lands
      this.hw = 8;
      this.hh = 6;
      const r = this.physics(g);
      s.setFrame(A.drop[0]);
      if (r.landed || this.onGround) {
        this.mode = 'cling';
        this.fx = this.x;
        this.fy = this.bottom - 0.5;
        [this.nx, this.ny, this.tx, this.ty] = [0, 1, this.facing, 0];
        this.rot = 0;
        this.vx = 0;
        g.fx.burst(this.x, this.bottom - 2, 'puff', 2, 4, { life: 18, fade: true });
        g.shake(1, 6);
      }
      s.mesh.rotation.z = 0;
      this.place();
      return;
    }
    if (this.stun <= 0) this.crawl(g, CRAWL_SPEED * this.num('speed'));
    this.syncBody();
    this.vx = this.tx * CRAWL_SPEED; // (for anything that reads which way it's going)
    if (this.onCeiling && this.can('drop') && p.alive && Math.abs(p.x - this.x) < 18 && p.y > this.y && p.y - this.y < 200 * this.num('sight')) {
      this.mode = 'fall';
      this.vy = 0;
      this.vx = 0;
      this.facing = this.tx < 0 ? -1 : 1;
      g.audio.play('bone');
    }
    // its ice trail on floors (not in water) and ceilings; walls stay bare
    if (this.ny > 0 && !g.room.inWater(this.x, this.fy - 2)) this.layIce(g, Math.round(this.fy), false);
    else if (this.ny < 0) this.layIce(g, Math.round(this.fy), true);
    this.dripIcicle(g);
    // the sprite stands on the surface: turned so its feet point into it, easing round corners
    const want = Math.atan2(this.nx, this.ny); // 0 on a floor, pi on a ceiling, +-pi/2 on a wall
    this.rot += Math.atan2(Math.sin(want - this.rot), Math.cos(want - this.rot)) * 0.35;
    this.rot = Math.atan2(Math.sin(this.rot), Math.cos(this.rot)); // kept in -pi..pi as it circles
    const c = Math.cos(this.rot), sn = Math.sin(this.rot);
    // its local "right" on screen is (cos, -sin) in game coordinates (three.js is y-up)
    const flip = this.tx * c - this.ty * sn < 0;
    this.facing = flip ? -1 : 1;
    s.anim('crawl', this.t / 60, 10);
    s.mesh.rotation.z = this.rot;
    s.place(this.fx - sn * CRAWL_LIFT, this.fy - c * CRAWL_LIFT, flip);
  }
}
