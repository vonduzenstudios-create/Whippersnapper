// The beast mini-bosses (0.31.0): the Moonrot Lycan, the Ossified Bull, the Rookery Gargoyle,
// the Stitchwork Brute and the Antlered Ghoul. Each is a MiniBoss (kit.ts): a few telegraphed
// attacks, each switched on or off in the enemy editor.
import type { Game } from '../game';
import type { HitKind } from '../ent';
import type { Holder } from '../player';
import { MiniBoss, Bit } from './kit';
import { Bullet } from '../boss_kit';
import { EnemyShot } from '../objects';
import { miniProps } from '../../gfx/minis';
import { clamp, rand } from '../../core/util';

// ---------------------------------------------------------------- the Moonrot Lycan
// gallop  on all fours when she is far, then a two-hit rake
// leap    crouches and leaps at her; a leap into a wall clings to it, then kicks off back at her
// lash    the length of shackle chain on its wrist, swung at mid range
export class Lycan extends MiniBoss {
  lunges = ['leap'];
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 12, 22);
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    switch (this.st) {
      case 'idle': {
        if (!this.sees(g, 260)) {
          this.patrolTurn(g, 0.6 * this.num('speed'));
          this.loop('prowl', 7);
          break;
        }
        const far = dist > 90;
        if (this.approach(g, far ? 2.2 : 0.8, 26)) this.loop(far ? 'run' : 'prowl', far ? 4 : 7);
        else this.loop('idle', 8);
        if (this.cool > 0) break;
        if (dist < 40) this.set('rake');
        else if (dist < 120 && this.can('lash') && Math.random() < 0.5) this.set('lash');
        else if (dist < 170 && this.can('leap')) this.set('crouch');
        break;
      }
      case 'rake': {
        this.vx = this.facing * 0.6;
        const k = this.once('rake', 32);
        if (this.stT === 10 || this.stT === 20) {
          g.audio.play('whip');
          this.hit(g, this.front(22, 22, 18, 18), Math.round(this.atk * 0.7));
        }
        if (k >= 1) this.rest(60);
        break;
      }
      case 'lash': {
        this.vx = 0;
        if (this.stT < 10) this.faceToward(p.x);
        const k = this.once('lash', 36);
        if (this.stT === 18) g.audio.play('chain');
        if (k > 0.5 && k < 0.7) this.hit(g, this.front(56, 24, 46, 10), this.atk);
        if (k >= 1) this.rest(80);
        break;
      }
      case 'crouch':
        this.vx = 0;
        this.faceToward(p.x);
        this.loop('crouch', 6);
        if (this.stT > 16) {
          this.vy = -5.2;
          this.vx = this.facing * clamp(dist / 34, 1.8, 4) * this.num('speed');
          this.onGround = false;
          g.audio.play('growl');
          this.set('leap');
        }
        break;
      case 'leap':
        this.loop('leap', 6);
        this.hit(g, this.front(10, 22, 16, 18), this.atk);
        if (this.bumped && !this.onGround) {
          this.set('wall');
          this.facing = -this.facing; // facing out from the wall
        } else if (this.onGround && this.stT > 4) this.set('land');
        break;
      case 'wall':
        // it clings, then kicks off back at her
        this.vx = 0;
        this.vy = 0;
        this.loop('wall', 6);
        if (this.stT > 26) {
          this.faceToward(p.x);
          this.vx = this.facing * 3.6;
          this.vy = -3.6;
          g.audio.play('jump');
          this.set('leap');
        }
        break;
      case 'land':
        this.vx *= 0.7;
        if (this.once('land', 16) >= 1) this.rest(70);
        break;
    }
  }
}

// ---------------------------------------------------------------- the Ossified Bull
// charge  paws the floor, then charges across the room. Into a wall it crashes and is dazed
// slam    brings its maul down: bone shards burst out of the floor in a fan
// toss    an uppercut when she is close in front
export class Bull extends MiniBoss {
  lunges = ['charge'];
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 20, 32);
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    switch (this.st) {
      case 'idle':
        if (!this.sees(g, 260)) {
          this.patrolTurn(g, 0.4 * this.num('speed'));
          this.loop('walk', 8);
          break;
        }
        if (this.approach(g, 0.6, 40)) this.loop('walk', 8);
        else this.loop('idle', 8);
        if (this.cool > 0) break;
        if (dist < 50 && this.can('toss')) this.set('toss');
        else if (dist > 90 && this.can('charge')) this.set('paw');
        else if (this.can('slam')) this.set('slam');
        break;
      case 'paw':
        this.vx = 0;
        this.faceToward(p.x);
        this.loop('paw', 6);
        if (this.stT % 12 === 1) g.fx.burst(this.x - this.facing * 10, this.bottom - 2, 'dust', 2, 6, { vy: -0.5 });
        if (this.stT === 1) g.audio.play('growl');
        if (this.stT > 40) {
          g.audio.play('roar');
          this.set('charge');
        }
        break;
      case 'charge':
        this.loop('charge', 3);
        this.vx = this.facing * 4.4 * this.num('speed');
        this.hit(g, this.front(18, 34, 22, 28), this.atk + 4);
        if (this.stT % 6 === 0) {
          g.fx.burst(this.x, this.bottom - 2, 'dust', 1, 6);
          g.shake(1.5, 4);
        }
        if (this.ledge(g)) {
          this.vx = 0; // digs in at the edge
          this.rest(70);
        } else if (this.bumped) {
          g.audio.play('rumble');
          g.shake(7, 22);
          g.fx.burst(this.x + this.facing * this.hw, this.y, 'rock', 8, 16, { speed: 2.4, grav: 0.15, life: 40, rot: 0.3 });
          this.set('crash');
        } else if (this.stT > 120) this.rest(70);
        break;
      case 'crash':
        // horns in the stone: dazed
        this.vx = 0;
        this.loop('crash', 8);
        if (this.stT > 90) this.rest(60);
        break;
      case 'slam': {
        this.vx = 0;
        this.faceToward(p.x);
        const k = this.once('slam', 46);
        if (this.stT === 28) {
          g.audio.play('rumble');
          g.shake(6, 18);
          const fx = this.x + this.facing * 40;
          this.hit(g, { x: fx, y: this.bottom - 16, hw: 22, hh: 16 }, this.atk + 4);
          // the floor bursts: shards thrown out ahead of the blow
          for (let i = 0; i < 5; i++) {
            g.spawn(new Bullet(g, fx, this.bottom - 6, this.facing * (0.8 + i * 0.7), -3.6 - (i % 2) * 1.4, Math.round(this.atk * 0.5), {
              sheet: miniProps('bull'), anim: 'shard', per: 4, r: 4, grav: 0.18, type: 'shot', life: 160, spin: 0.2,
            }));
          }
        }
        if (k >= 1) this.rest(100);
        break;
      }
      case 'toss': {
        this.vx = 0;
        const k = this.once('toss', 34);
        if (this.stT === 18) {
          g.audio.play('whip');
          if (this.hit(g, this.front(26, 30, 22, 28), this.atk + 2)) g.player.vy = -5;
        }
        if (k >= 1) this.rest(60);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- the Rookery Gargoyle
// dive    crouches, leaps at her, turns to stone at the top and drops like a block: rubble skids out
//         both ways along the floor. As stone it can't be hurt, and it stays stone a moment after,
//         then wakes (open)
// stab    its spade-tailed whip, up close or at her if she gets behind it
// It cracks as it is hurt (the _1 and _2 sheets).
export class Gargoyle extends MiniBoss {
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 12, 22);
  }
  /** The animation for how cracked it is. */
  an(name: string) {
    const f = this.hp / this.maxHp, n = f > 0.66 ? name : `${name}_${f > 0.33 ? 1 : 2}`;
    return this.A[n] ? n : name;
  }
  get stone() {
    return this.st === 'dive' || this.st === 'stuck';
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    const behind = Math.sign(p.x - this.x) === -this.facing;
    switch (this.st) {
      case 'idle':
        if (!this.sees(g, 240, 140)) {
          this.vx = 0;
          this.loop(this.an('idle'), 9);
          break;
        }
        if (dist < 48 && behind && this.can('stab') && this.cool <= 0) {
          this.set('stab');
          break;
        }
        if (this.approach(g, 0.6, 34)) this.loop(this.an('walk'), 8);
        else this.loop(this.an('idle'), 9);
        if (this.cool > 0) break;
        if (dist < 44 && this.can('stab')) this.set('stab');
        else if (this.can('dive')) this.set('crouch');
        break;
      case 'crouch':
        this.vx = 0;
        this.faceToward(p.x);
        this.loop(this.an('crouch'), 6);
        if (this.stT > 18) {
          this.vy = -6.4;
          this.vx = this.facing * clamp(dist / 40, 0.8, 3.2) * this.num('speed');
          this.onGround = false;
          g.audio.play('flutter');
          this.set('leap');
        }
        break;
      case 'leap':
        this.loop(this.an('leap'), 5);
        if (this.vy >= 0) {
          g.audio.play('crumble');
          this.set('dive');
        }
        break;
      case 'dive':
        // stone: it drops straight down
        this.vx *= 0.9;
        this.vy = Math.max(this.vy, 6);
        this.loop(this.an('dive'), 6);
        this.hit(g, { x: this.x, y: this.bottom - 10, hw: 16, hh: 12 }, this.atk + 4);
        if (this.onGround) {
          g.audio.play('rumble');
          g.shake(6, 18);
          for (const dir of [-1, 1]) for (const v of [1.6, 2.8]) {
            g.spawn(new Bullet(g, this.x + dir * 12, this.bottom - 5, dir * v, -1.2, Math.round(this.atk * 0.5), {
              sheet: miniProps('gargoyle'), anim: 'rubble', per: 4, r: 4, grav: 0.16, type: 'shot', life: 120,
            }));
          }
          g.fx.burst(this.x, this.bottom - 4, 'dust', 8, 18, { speed: 1.4 });
          this.set('stuck');
        }
        break;
      case 'stuck':
        this.vx = 0;
        this.loop(this.an('stuck'), 8);
        if (this.stT > 40) this.set('wake');
        break;
      case 'wake':
        this.vx = 0;
        if (this.once(this.an('wake'), 24) >= 1) this.rest(90);
        break;
      case 'stab': {
        this.vx = 0;
        if (this.stT === 1) this.data.back = behind; // the tail goes where she is
        const k = this.once(this.an('stab'), 28);
        if (this.stT === 14) {
          g.audio.play('whip');
          const dir = this.data.back ? -this.facing : this.facing;
          this.hit(g, { x: this.x + dir * 30, y: this.bottom - 16, hw: 22, hh: 12 }, this.atk);
        }
        if (k >= 1) this.rest(60);
        break;
      }
    }
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    if (this.stone) {
      // granite: the chain rings off it
      g.audio.play('clink');
      g.fx.burst(this.x, this.y, 'spark', 2, 8);
      return;
    }
    super.onHit(g, dmg, fromX, crit, kind);
  }
}

// ---------------------------------------------------------------- the Stitchwork Brute
// arc     punches the floor: a crawl of lightning runs along it toward her
// throw   rips up a block of masonry, holds it overhead, hurls it: it breaks into rocks where it lands
// grab    a lunge with its great hand: caught, she is lifted overhead and slammed down unless she
//         mashes free first (then it reels, open)
export class Brute extends MiniBoss implements Holder {
  lunges = ['grab'];
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 18, 34);
  }
  released(mashed: boolean) {
    if (this.st === 'lift' && mashed) this.set('reel');
  }
  hand() {
    return { x: this.x + this.facing * 8, y: this.bottom - 86 };
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    switch (this.st) {
      case 'idle':
        if (!this.sees(g, 240)) {
          this.patrolTurn(g, 0.35 * this.num('speed'));
          this.loop('walk', 9);
          break;
        }
        if (this.approach(g, 0.5, 40)) this.loop('walk', 9);
        else this.loop('idle', 9);
        if (this.cool > 0) break;
        if (dist < 64 && this.can('grab')) this.set('grab');
        else if (dist > 90 && this.can('throw') && Math.random() < 0.5) this.set('rip');
        else if (this.can('arc')) this.set('punch');
        break;
      case 'punch': {
        this.vx = 0;
        this.faceToward(p.x);
        const k = this.once('punch', 44);
        if (this.stT === 30) {
          g.audio.play('rumble');
          g.audio.play('sting');
          g.shake(5, 16);
          this.hit(g, this.front(34, 14, 20, 14), this.atk);
          g.spawn(new Bullet(g, this.x + this.facing * 40, this.bottom - 10, this.facing * 2.4, 0, Math.round(this.atk * 0.7), {
            sheet: miniProps('brute'), anim: 'arc', per: 2, r: 8, type: 'magic', life: 200, glow: 0.7,
            tick: (b) => (b.y = this.bottom - 10 + rand(-1, 1)),
          }));
        }
        if (k >= 1) this.rest(90);
        break;
      }
      case 'rip':
        this.vx = 0;
        if (this.stT === 20) {
          g.audio.play('crumble');
          g.fx.burst(this.x + this.facing * 14, this.bottom - 4, 'rock', 6, 10, { speed: 2, grav: 0.15, life: 30, rot: 0.3 });
        }
        if (this.once('rip', 40) >= 1) this.set('hold');
        break;
      case 'hold':
        this.vx = 0;
        this.faceToward(p.x);
        this.loop('hold', 8);
        if (this.stT > 24) this.set('toss');
        break;
      case 'toss': {
        this.vx = 0;
        const k = this.once('toss', 28);
        if (this.stT === 12) {
          g.audio.play('throw');
          const T = 48, vx = clamp((p.x - this.x) / T, -4.5, 4.5), h = this.hand();
          g.spawn(new Bullet(g, h.x, h.y, vx, -3.4, this.atk + 2, {
            sheet: miniProps('brute'), anim: 'block', r: 10, grav: 0.15, type: 'shot', life: 200,
            end: (b, gg) => {
              gg.audio.play('crumble');
              gg.shake(3, 10);
              for (const v of [-2, -1, 1, 2]) gg.spawn(new EnemyShot(gg, b.x, b.y - 4, v, -2.4 - Math.abs(v) * 0.4, 'rock', Math.round(this.atk * 0.4), 0.18));
            },
          }));
        }
        if (k >= 1) this.rest(110);
        break;
      }
      case 'grab': {
        const k = this.once('grab', 34);
        this.vx = k > 0.35 && k < 0.7 ? this.facing * 2.6 * this.num('speed') : 0;
        if (this.stT === 10) g.audio.play('growl');
        const box = this.front(30, 40, 16, 26);
        if (k > 0.4 && k < 0.75 && p.alive && p.invuln <= 0 && !this.data.missed && Math.abs(p.x - box.x) < box.hw + p.hw && Math.abs(p.y - box.y) < box.hh + p.hh) {
          if (p.grab(this, this.num('mash'), 200, true)) {
            g.audio.play('bite');
            this.set('lift');
            break;
          }
          this.data.missed = true;
        }
        if (k >= 1) this.rest(80);
        break;
      }
      case 'lift': {
        // she is held up over its head, kicking
        this.vx = 0;
        this.loop('lift', 6);
        const h = this.hand();
        p.x = h.x;
        p.y = h.y - 4;
        p.vx = p.vy = 0;
        if (this.stT > 70) this.set('slam');
        break;
      }
      case 'slam': {
        this.vx = 0;
        const k = this.once('slam', 30);
        if (k < 0.55 && p.holdBy === this) {
          const h = this.hand();
          p.x = this.x + this.facing * (8 + k * 50);
          p.y = h.y + k * 140;
          p.vx = p.vy = 0;
        }
        if (this.stT === 17) {
          g.audio.play('rumble');
          g.shake(8, 24);
          if (p.holdBy === this) {
            p.holdT = 1;
            p.y = this.bottom - p.hh;
            p.takeDamage(this.atk * 2, this.x, false, true, 'melee', p.y);
          }
        }
        if (k >= 1) this.rest(100);
        break;
      }
      case 'reel':
        // she tore free: it staggers back, clutching its hand
        this.vx = -this.facing * 0.3;
        this.loop('reel', 8);
        if (this.stT > 90) this.rest(60);
        break;
    }
  }
}

// ---------------------------------------------------------------- the Antlered Ghoul
// skitter  scuttles at her in jerks, never in a straight line
// leap     crouches and springs at her
// rake     three slashes, stepping in with each
// scream   rears up and screams: up close it slows her
export class Ghoul extends MiniBoss {
  lunges = ['leap'];
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 11, 22);
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    switch (this.st) {
      case 'idle':
        if (!this.sees(g, 240)) {
          this.vx = 0;
          this.loop('idle', 7);
          break;
        }
        // erratic: a burst one way, a pause, a burst again, mostly toward her
        if (this.stT % 30 === 1) this.data.dir = Math.random() < 0.75 ? Math.sign(p.x - this.x) || 1 : -Math.sign(p.x - this.x) || 1;
        if (this.stT % 30 < 20 && dist > 26) {
          if (this.ledge(g)) this.data.dir = -(this.data.dir || 1);
          this.facing = this.data.dir || 1;
          this.vx = this.facing * 2 * this.num('speed');
          this.loop('skitter', 3);
        } else {
          this.vx = 0;
          this.faceToward(p.x);
          this.loop('idle', 6);
        }
        if (this.cool > 0) break;
        if (dist < 40 && this.can('rake')) this.set('rake');
        else if (dist < 130 && this.can('scream') && Math.random() < 0.3) this.set('scream');
        else if (dist < 170 && this.can('leap')) this.set('crouch');
        break;
      case 'crouch':
        this.vx = 0;
        this.faceToward(p.x);
        this.loop('crouch', 5);
        if (this.stT > 14) {
          this.vy = -5;
          this.vx = this.facing * clamp(dist / 32, 1.6, 4.2) * this.num('speed');
          this.onGround = false;
          g.audio.play('screech');
          this.set('leap');
        }
        break;
      case 'leap':
        this.loop('leap', 5);
        this.hit(g, this.front(8, 20, 16, 16), this.atk);
        if (this.onGround && this.stT > 4) this.set('land');
        break;
      case 'land':
        this.vx *= 0.7;
        if (this.once('land', 18) >= 1) this.rest(50);
        break;
      case 'rake': {
        const k = this.once('rake', 48);
        this.vx = this.facing * 0.9;
        for (const at of [0.26, 0.54, 0.82]) if (Math.abs(k - at) < 0.011) {
          g.audio.play('whip');
          this.hit(g, this.front(22, 20, 18, 18), Math.round(this.atk * 0.6));
        }
        if (k >= 1) this.rest(60);
        break;
      }
      case 'scream':
        this.vx = 0;
        this.loop('scream', 4);
        if (this.stT === 12) {
          g.audio.play('screech');
          g.shake(5, 30);
          for (let i = 0; i < 3; i++) {
            const ring = new Bit(g, miniProps('ghoul'), 'ring', this.x + this.facing * 10, this.bottom - 46, 24 + i * 8, {
              per: 8, order: 12, tick: (b) => {
                b.sprite!.mesh.scale.set(32 * (1 + b.t * 0.12), 32 * (1 + b.t * 0.12), 1);
              },
            });
            g.spawn(ring);
          }
          if (Math.abs(p.x - this.x) < 120 && Math.abs(p.y - this.y) < 80) p.hex(180);
        }
        if (this.stT > 60) this.rest(140);
        break;
    }
  }
}
