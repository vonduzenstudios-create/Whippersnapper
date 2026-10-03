// Enemies of the Ashen Library: the Rustling Tome, the Restless Chair (plus the prop
// chair it hides among) and the Bone Librarian.
// Like the other enemies it reads speed/ranges/abilities through num()/can(), so
// enemy-editor variants work.
import type { Game } from './game';
import { Enemy, Skeleton } from './enemies';
import { Ent, HitKind } from './ent';
import { EnemyShot } from './objects';
import { Sprite } from '../gfx/view';
import { moveBody } from '../world/room';
import { clamp, rand, sign } from '../core/util';
import { TILE } from '../config';

/**
 * A grimoire that sleeps spine-out inside a bookcase. Walk near and it rattles, tears loose
 * and flaps at you, circling overhead; now and then it stops, opens wide and spits a fan of
 * its own pages at you (0.24.1; it used to dive). One book waking rouses the
 * rest of its shelf, so they come out together.
 *
 * Place it inside the bookcase tiles (the 'H' blocks of library rooms): while it is shelved it
 * can't hurt you or be hit, and when it bursts out it flies through the wood.
 */
export class Tome extends Enemy {
  state: 'shelved' | 'rattle' | 'burst' | 'flap' | 'wind' | 'spew' = 'shelved';
  st = 0;
  /** Frames until a shelved tome starts to rattle (-1 = still asleep). */
  wake = -1;
  cool: number;
  orbit = rand(0, Math.PI * 2);
  spin = Math.random() < 0.5 ? -1 : 1;
  homeX: number;
  homeY: number;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    // placed on a tile: the book sits at the tile's center
    super(g, kind, x, bottom - 1, 8, 7);
    this.homeX = x;
    this.homeY = this.y;
    this.hostile = false;
    this.whipTarget = false;
    this.cool = (60 + Math.random() * 60) * this.num('cooldown');
  }
  set(st: Tome['state']) {
    this.state = st;
    this.st = 0;
  }
  /** Move, bouncing off walls (a book can't pass through stone, only out of its own shelf). */
  fly(g: Game, phase = true) {
    const nx = this.x + this.vx, ny = this.y + this.vy;
    if (phase || !g.room.solidPx(nx + sign(this.vx) * this.hw, this.y)) this.x = nx;
    else this.vx *= -0.3;
    if (phase || !g.room.solidPx(this.x, ny + sign(this.vy) * this.hh)) this.y = ny;
    else this.vy *= -0.3;
    // stay inside the room walls (a tile thick) and clear of its ceiling and floor
    this.x = clamp(this.x, TILE + this.hw, g.room.W - TILE - this.hw);
    this.y = clamp(this.y, TILE + this.hh, g.room.H - 2 * TILE - this.hh);
  }
  /**
   * Launch out of whatever it is stuck in (its bookcase, or a wall after a bad bounce): head
   * toward the hunter if that way leads out of the wood soon, otherwise the nearest way out.
   */
  tearLoose(g: Game, dx: number, dy: number) {
    const base = Math.atan2(dy, dx);
    const out = (a: number) => {
      for (let r = 6; r <= 90; r += 4) if (!g.room.solidPx(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r)) return r;
      return -1;
    };
    let best = base, bestR = Infinity;
    for (const turn of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
      const r = out(base + turn);
      if (r >= 0 && r <= 56) {
        best = base + turn;
        break;
      }
      if (r >= 0 && r < bestR) {
        best = base + turn;
        bestR = r;
      }
    }
    const sp = 2.4 * this.num('speed');
    this.vx = Math.cos(best) * sp;
    this.vy = Math.sin(best) * sp;
    this.set('burst');
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    const spd = this.num('speed');
    const dx = p.x - this.x, dy = p.y - 4 - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    let ox = 0; // sprite shake
    s.mesh.rotation.z = 0;

    switch (this.state) {
      case 'shelved': {
        s.setFrame(A.shelf[0]);
        const sight = this.num('sight');
        if (this.wake < 0 && p.alive && this.t > 45 && Math.abs(dx) < 130 * sight && Math.abs(p.y - this.y) < 100 * sight) {
          this.wake = 8 + Math.floor(rand(0, 10));
          // the whole shelf stirs together
          for (const e of g.ents)
            if (e instanceof Tome && e !== this && e.state === 'shelved' && e.wake < 0 && Math.hypot(e.x - this.x, e.y - this.y) < 110)
              e.wake = 12 + Math.floor(rand(0, 40));
        }
        if (this.wake > 0 && --this.wake === 0) this.set('rattle');
        break;
      }
      case 'rattle':
        // shaking loose: spine glows, dust and pages shake out of the shelf
        s.setFrame(A.peek[0]);
        ox = this.st % 4 < 2 ? -1 : 1;
        if (this.st === 1) g.audio.play('pages');
        if (this.st % 7 === 0) g.fx.burst(this.x, this.y + 4, 'dust', 1, 3);
        if (this.st % 9 === 0) g.fx.burst(this.x, this.y, 'page', 1, 4, { vy: -0.3, grav: 0.03, life: 40, rot: 0.15, fade: true });
        if (this.st >= 26) {
          this.hostile = true;
          this.whipTarget = true;
          this.faceToward(p.x);
          this.tearLoose(g, dx, dy);
          g.audio.play('pages');
          g.fx.burst(this.x, this.y, 'page', 5, 6, { speed: 1.6, grav: 0.03, life: 50, rot: 0.2, fade: true });
          g.fx.burst(this.x, this.y, 'puff', 1, 3, { life: 18, fade: true });
        }
        break;
      case 'burst': {
        // out of the shelf, through the wood, toward the hunter
        s.anim('flap', this.t / 60, 16);
        this.fly(g, true);
        if (this.st > 10 && !g.room.solidPx(this.x, this.y)) {
          this.set('flap');
          this.cool = (40 + Math.random() * 40) * this.num('cooldown');
        } else if (this.st > 60) this.tearLoose(g, dx, dy); // still in the wood: try another way out
        break;
      }
      case 'flap': {
        // circle above the hunter, covers beating
        this.orbit += 0.025 * this.spin * spd;
        const tx = p.x + Math.cos(this.orbit) * (62 + 18 * Math.sin(this.t * 0.04));
        const ty = p.y - 32 + Math.sin(this.orbit * 1.7) * 18;
        if (this.stun <= 0) {
          this.vx = clamp(this.vx + clamp((tx - this.x) / 40, -1, 1) * 0.09 * spd, -1.9 * spd, 1.9 * spd);
          this.vy = clamp(this.vy + clamp((ty - this.y) / 40, -1, 1) * 0.09 * spd, -1.6 * spd, 1.6 * spd);
          this.vx *= 0.97;
          this.vy *= 0.96;
          this.faceToward(p.x);
        } else this.vy *= 0.9;
        this.fly(g, false);
        s.anim('flap', this.t / 60, 11);
        s.mesh.rotation.z = -this.vx * 0.06 * (this.facing < 0 ? -1 : 1);
        if (this.t % 18 === 0) g.fx.burst(this.x, this.y + 6, 'page', 1, 3, { vy: 0.3, grav: 0.015, life: 36, rot: 0.1, fade: true });
        if (this.stun <= 0 && p.alive && --this.cool <= 0) {
          if (this.can('spew') && dist < 200) this.set('wind');
          else this.cool = 50;
        }
        break;
      }
      case 'wind':
        // rears back, shuddering, its pages starting to glow: the tell before it spits
        this.vx = -(dx / dist) * 0.9;
        this.vy = -0.5;
        this.faceToward(p.x);
        this.fly(g, false);
        s.anim('spew', this.t / 60, 12);
        ox = this.st % 4 < 2 ? -1 : 1;
        if (this.stun > 0) this.set('flap');
        else if (this.st >= 22) this.set('spew');
        break;
      case 'spew':
        // hangs where it is and spits pages: five of them, fanned round where the hunter stands
        this.vx *= 0.85;
        this.vy *= 0.85;
        this.fly(g, false);
        this.faceToward(p.x);
        s.anim('spew', this.t / 60, 16);
        s.glow = 0.25;
        if (this.st % 7 === 1 && this.st <= 5 * 7) {
          const n = (this.st - 1) / 7, a = Math.atan2(dy, dx) + (n - 2) * 0.2 + rand(-0.05, 0.05);
          const sp = 2.5 * spd;
          g.spawn(new EnemyShot(g, this.x + this.facing * 4, this.y, Math.cos(a) * sp, Math.sin(a) * sp, 'page', Math.max(1, Math.round(this.atk * 0.6)), 0.015));
          g.audio.play('pages');
          // each page it spits kicks it back a little
          this.vx -= Math.cos(a) * 0.5;
          this.vy -= Math.sin(a) * 0.5;
        }
        if (this.stun > 0 || this.st > 5 * 7 + 16) {
          s.glow = 0;
          this.set('flap');
          this.cool = (100 + Math.random() * 60) * this.num('cooldown');
        }
        break;
    }
    // wedged into stone after a bounce: tear loose again
    if (this.state !== 'spew') s.glow = 0;
    if ((this.state === 'flap' || this.state === 'wind' || this.state === 'spew') && g.room.solidPx(this.x, this.y)) this.tearLoose(g, dx, dy);
    s.place(this.x + ox, this.y, this.facing < 0);
  }
  die(g: Game) {
    super.die(g);
    g.fx.burst(this.x, this.y, 'page', 8, 6, { speed: 1.8, grav: 0.03, life: 50, rot: 0.2, fade: true });
  }
}

/**
 * Which way a library chair faces: toward a table ('D') beside it on its own row, if
 * there is one within three tiles (nearest first), else right. Used by the prop chair and
 * the Restless Chair alike, so the two always look the same.
 */
export function chairFacing(g: Game, x: number, bottom: number) {
  const tx = Math.floor(x / TILE), ty = Math.floor((bottom - 1) / TILE);
  for (let d = 1; d <= 3; d++) {
    if (g.room.tile(tx + d, ty) === 'D') return 1;
    if (g.room.tile(tx - d, ty) === 'D') return -1;
  }
  return 1;
}

/** A plain library chair: scenery, drawn behind the hero (entity 'n'). */
export class ChairProp extends Ent {
  constructor(g: Game, x: number, bottom: number) {
    super();
    this.x = x;
    this.y = bottom - 16;
    const sheet = g.sheets.chair;
    this.sprite = new Sprite(sheet, g.view.sprites, 5);
    this.sprite.setFrame(sheet.anims.sit[0]);
    this.sprite.place(x, bottom - 16, chairFacing(g, x, bottom) < 0);
  }
  update() {}
}

/**
 * The Restless Chair (entity 'a'): stands among the prop chairs looking exactly like them,
 * until you come close. Then it creaks, hops, and floats after you, keeping a little way
 * off. Now and then it tips back and spins straight at you (charge), or rises over you and
 * drops legs first (stomp).
 */
export class Chair extends Enemy {
  state: 'still' | 'wake' | 'float' | 'wind' | 'charge' | 'rise' | 'drop' | 'rest' = 'still';
  lunges = ['charge', 'drop'];
  st = 0;
  cool = 0;
  spin = 0;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 7, 13);
    this.feet = 16;
    this.hostile = false;
    this.whipTarget = false;
    this.facing = chairFacing(g, x, bottom);
    this.sprite!.mesh.renderOrder = 5; // with the prop chairs, behind the hero, until it wakes
  }
  set(st: Chair['state']) {
    this.state = st;
    this.st = 0;
  }
  /** Back to hovering, with a pause before the next attack. */
  float(cool: number) {
    this.set('float');
    this.cool = cool * this.num('cooldown');
  }
  /** Spun or stamped into the shield: it bounces off and goes back to hovering. */
  onBlocked(g: Game) {
    super.onBlocked(g);
    if (this.state === 'drop') this.vy = -3;
    this.float(70);
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    const spd = this.num('speed');
    const dx = p.x - this.x, dy = p.y - this.y;
    let ox = 0; // sprite shake
    let tilt = 0; // + tips the chair back
    switch (this.state) {
      case 'still': {
        s.setFrame(A.sit[0]);
        const sight = this.num('sight');
        if (p.alive && this.t > 30 && Math.abs(dx) < 64 * sight && Math.abs(p.bottom - this.bottom) < 48 * sight) {
          this.set('wake');
          this.whipTarget = true;
          s.mesh.renderOrder = 10;
          g.audio.play('creak');
        }
        break;
      }
      case 'wake':
        // rattles on its legs and hops twice, eyes lit
        s.setFrame(A.wake[0]);
        ox = this.st % 4 < 2 ? -1 : 1;
        if ((this.st === 12 || this.st === 26) && this.onGround) {
          this.vy = -1.8;
          g.audio.play('knock');
        }
        this.vx = 0;
        this.physics(g);
        if (this.st >= 40) {
          this.hostile = true;
          this.faceToward(p.x);
          this.vy = -2;
          this.float(50);
        }
        break;
      case 'float': {
        // hover at the hunter's height, a little way off to the side, bobbing
        const tx = p.x - (dx < 0 ? -1 : 1) * 46;
        const ty = p.y - 4 + Math.sin(this.t * 0.06) * 6;
        if (this.stun <= 0) {
          this.vx = clamp(this.vx + clamp((tx - this.x) / 30, -1, 1) * 0.12 * spd, -1.6 * spd, 1.6 * spd) * 0.96;
          this.vy = clamp(this.vy + clamp((ty - this.y) / 30, -1, 1) * 0.1 * spd, -1.2 * spd, 1.2 * spd) * 0.95;
          this.faceToward(p.x);
        } else this.vy *= 0.9;
        moveBody(g.room, this, true);
        s.anim('float', this.t / 60, 6);
        tilt = Math.sin(this.t * 0.1) * 0.08;
        if (this.stun <= 0 && p.alive && --this.cool <= 0) {
          if (this.can('stomp') && Math.abs(dx) < 80 && Math.random() < 0.5) this.set('rise');
          else if (this.can('charge') && Math.abs(dx) < 180) {
            this.set('wind');
            g.audio.play('creak');
          } else this.cool = 40;
        }
        break;
      }
      case 'wind':
        // tips back and shivers: the tell before a charge
        s.setFrame(A.charge[0]);
        this.vx = -this.facing * 0.5;
        this.vy = -0.2;
        moveBody(g.room, this, true);
        tilt = Math.min(this.st / 16, 1) * 0.5;
        ox = this.st % 4 < 2 ? -1 : 1;
        if (this.stun > 0) this.float(40);
        else if (this.st >= 20) {
          this.set('charge');
          this.spin = 0;
          this.vx = this.facing * 3.4 * spd;
          this.vy = clamp(dy / 30, -0.8, 0.8);
          g.audio.play('dash');
        }
        break;
      case 'charge': {
        // cartwheels straight ahead until it hits a wall or runs out of steam
        s.setFrame(A.charge[0]);
        this.spin += 0.35;
        const r = moveBody(g.room, this, true);
        if (this.t % 4 === 0) g.fx.burst(this.x, this.y, 'dust', 1, 3, { life: 18, fade: true });
        if (r.hitX) {
          g.audio.play('knock');
          g.shake(1, 4);
          this.vx = -this.facing * 1.2;
          this.float(90);
        } else if (this.stun > 0 || this.st > 50) this.float(70);
        break;
      }
      case 'rise':
        // climbs over the hunter's head, then shivers there
        this.vx = clamp((p.x - this.x) / 12, -2.2, 2.2) * spd;
        this.vy = clamp((p.y - 72 - this.y) / 12, -2, 2) * spd;
        moveBody(g.room, this, true);
        s.anim('float', this.t / 60, 10);
        if (this.st > 36) ox = this.st % 4 < 2 ? -1 : 1;
        if (this.stun > 0) this.float(40);
        else if (this.st >= 48) {
          this.set('drop');
          this.vx = 0;
          this.vy = 1;
        }
        break;
      case 'drop': {
        // legs first, as hard as it can (onBlocked bounces it back up if it lands on the shield)
        s.setFrame(A.charge[0]);
        this.vx = 0;
        this.vy = Math.min(this.vy + 0.45, 7);
        const r = moveBody(g.room, this, true);
        if (r.hitY && this.onGround) {
          this.set('rest');
          g.audio.play('knock');
          g.shake(2, 8);
          g.fx.burst(this.x, this.bottom - 2, 'dust', 6, 10, { speed: 1.5, life: 24, fade: true });
        } else if (this.st > 90) this.float(40);
        break;
      }
      case 'rest':
        // stands a moment after landing: the time to hit it
        s.setFrame(A.wake[0]);
        this.vx = 0;
        this.physics(g);
        if (this.st >= 40) {
          this.vy = -2.2;
          this.float(60);
        }
        break;
    }
    // the art faces right with its back on the left, so tipping back turns it counterclockwise
    s.mesh.rotation.z = this.state === 'charge' ? -this.spin * this.facing : tilt * this.facing;
    s.place(this.x + ox, this.bottom - this.feet, this.facing < 0);
  }
  die(g: Game) {
    super.die(g);
    // it comes apart in splinters
    g.fx.burst(this.x, this.y, 'dust', 8, 8, { speed: 2, grav: 0.1, life: 30, fade: true });
    g.audio.play('crumble');
  }
}

/**
 * The Bone Librarian (entity 'l'): a Bone Thrower in a little cap that throws books. Until
 * you come within range (or hit it) it stands with its back to you, shelving books; place it
 * on the floor in front of a bookcase. Once it notices you it turns, hops, and from then on
 * fights exactly like a skeleton, except each book is either lobbed in an arc or thrown
 * straight at you (50/50).
 */
export class Librarian extends Skeleton {
  mode: 'tend' | 'turn' | 'awake' = 'tend';
  mt = 0;
  /** Offsets the shelving loop so a row of librarians doesn't move in step. */
  phase = rand(0, 60);
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom);
    this.hostile = false; // busy with its shelf: brushing past it doesn't hurt yet
  }
  /** Notice the hunter: turn around (only from the tending state). */
  wake(g: Game) {
    if (this.mode !== 'tend') return;
    this.mode = 'turn';
    this.mt = 0;
    g.audio.play('pages');
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    super.onHit(g, dmg, fromX, crit, kind);
    if (!this.dead) this.wake(g);
  }
  update(g: Game) {
    if (this.mode === 'awake') return super.update(g);
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!;
    this.mt++;
    if (this.mode === 'tend') {
      s.anim('tend', (this.t + this.phase) / 60, 2.5);
      const sight = this.num('sight');
      if (p.alive && this.t > 30 && Math.abs(p.x - this.x) < 110 * sight && Math.abs(p.y - this.y) < 56 * sight) this.wake(g);
    } else {
      // startled: looks over its shoulder and hops round to face you
      s.setFrame(this.anims.turn[0]);
      this.faceToward(p.x);
      if (this.mt === 2 && this.onGround) this.vy = -1.6;
      if (this.mt >= 22) {
        this.mode = 'awake';
        this.hostile = true;
        this.state = 'walk';
        this.cool = 20 * this.num('cooldown'); // the first book comes quickly
      }
    }
    this.physics(g);
    this.place();
  }
  /** Half the books are lobbed like bones, half thrown straight at the hunter. */
  throwShot(g: Game, adx: number) {
    const x = this.x + this.facing * 6, y = this.y - 14;
    if (Math.random() < 0.5) {
      const d = clamp(adx / 55, 1, 3.4);
      g.spawn(new EnemyShot(g, x, y, this.facing * d, -4.4, 'book', this.atk, 0.16));
    } else {
      const p = g.player, dx = p.x - x, dy = p.y - y, dist = Math.hypot(dx, dy) || 1;
      g.spawn(new EnemyShot(g, x, y, (dx / dist) * 2.8, (dy / dist) * 2.8, 'book', this.atk));
    }
    g.audio.play('pages');
  }
  die(g: Game) {
    super.die(g);
    g.fx.burst(this.x, this.y - 6, 'page', 6, 6, { speed: 1.6, grav: 0.03, life: 50, rot: 0.2, fade: true });
  }
}
