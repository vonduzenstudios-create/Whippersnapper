// The Gallows Spider (p, 0.10.0). It waits up by the ceiling, lowers itself on a silk
// line when the hero passes underneath, and hangs at her height spitting web globs
// that slow her (physical shots, so a raised shield stops them). After a while it
// climbs back up and waits again. Any hit on the thread cuts it: the spider drops to
// the floor and scuttles after her from then on.
//
// Like the other enemies it reads speed/ranges/abilities through num()/can(), so
// enemy-editor variants work.
import { Sprite } from '../gfx/view';
import type { Game } from './game';
import { Enemy } from './enemies';
import { EnemyShot } from './objects';
import { TILE } from '../config';
import type { Box } from '../core/util';

const PERCH_LEN = 6; // thread length while it waits at the ceiling
const DROP_SPEED = 3.2; // px/frame lowering itself
const CLIMB_SPEED = 1.1; // px/frame climbing back up
const HANG_TIME = 330; // frames it stays down before climbing back (5.5 s)
const REST_TIME = 100; // frames at the top before it can drop again
const SPIT_WIND = 18; // frames of fangs-open warning before a spit

export class Spider extends Enemy {
  state: 'perch' | 'drop' | 'hang' | 'spit' | 'climb' | 'fall' | 'crawl' = 'perch';
  st = 0;
  /** Where the silk is fixed to the ceiling. */
  ax: number;
  ay: number;
  len = PERCH_LEN;
  cool: number;
  thread: Sprite;
  constructor(private g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 7, 8);
    this.feet = 11;
    this.ax = x;
    // find the ceiling above the placement (the room top if there is none)
    let ty = Math.floor((bottom - 1) / TILE);
    while (ty > 0 && !g.room.solidAt(Math.floor(x / TILE), ty - 1)) ty--;
    this.ay = ty * TILE;
    this.cool = 30;
    this.thread = new Sprite(g.sheets.fx, g.view.sprites, 9);
    this.thread.setFrame(g.sheets.fx.anims.silk[0]);
    this.hangAt();
  }
  set(st: Spider['state']) {
    this.state = st;
    this.st = 0;
  }
  get onThread() {
    return this.state !== 'fall' && this.state !== 'crawl';
  }
  /** Put the body at the end of the thread, swaying a little once it's long. */
  hangAt() {
    const sway = Math.sin(this.t * 0.05) * Math.min(5, this.len * 0.04);
    this.x = this.ax + sway;
    this.y = this.ay + this.len + this.hh;
  }
  /** Lowest the thread can reach before the body would touch the floor below it. */
  maxLen(g: Game) {
    const tx = Math.floor(this.ax / TILE);
    let ty = Math.floor(this.ay / TILE);
    while (ty < g.room.rows && !g.room.solidAt(tx, ty) && !g.room.oneWayAt(tx, ty)) ty++;
    return ty * TILE - this.ay - this.hh * 2 - 2;
  }

  // ------------------------------------------------------------ hits: the body, or the thread

  /** Distance from (px, py) to the thread (the line from the anchor to the body's top). */
  private threadDist(px: number, py: number) {
    const top = this.y - this.hh;
    if (py < this.ay || py > top) return Infinity;
    return Math.abs(px - (this.ax + (this.x - this.ax) * ((py - this.ay) / Math.max(1, top - this.ay))));
  }
  hitAt(px: number, py: number, r: number) {
    if (Math.abs(px - this.x) < this.hw + r && Math.abs(py - this.y) < this.hh + r) return true;
    if (this.onThread && this.len > 16 && this.threadDist(px, py) < r) this.cut(this.g);
    return false;
  }
  hitBox(b: Box) {
    if (Math.abs(b.x - this.x) < this.hw + b.hw && Math.abs(b.y - this.y) < this.hh + b.hh) return true;
    if (this.onThread && this.len > 16) {
      const top = this.y - this.hh;
      const y = Math.max(this.ay, Math.min(top, b.y));
      if (Math.abs(b.y - y) <= b.hh && this.threadDist(b.x, y) < b.hw + 1) this.cut(this.g);
    }
    return false;
  }
  /** The silk snaps: it falls and fights on the floor from now on. */
  cut(g: Game) {
    if (!this.onThread) return;
    this.set('fall');
    this.vy = 0;
    this.vx = 0;
    this.thread.visible = false;
    g.audio.play('snap');
    g.fx.burst(this.x, this.y - this.hh - 4, 'mote', 3, 3, { vy: 0.4, life: 24, fade: true, tint: [1.2, 1.2, 1.1] });
  }

  // ------------------------------------------------------------ behavior

  update(g: Game) {
    this.baseUpdate(g);
    this.st++;
    const p = g.player, s = this.sprite!, A = this.anims;
    const dx = p.x - this.x, sight = this.num('sight');
    if (this.cool > 0) this.cool--;
    switch (this.state) {
      case 'perch':
        this.len = PERCH_LEN;
        if (this.cool <= 0 && p.alive && Math.abs(p.x - this.ax) < 56 * sight && p.y > this.ay && p.y - this.ay < 240 * sight) {
          this.set('drop');
          g.audio.play('skitter');
        }
        break;
      case 'drop': {
        // down to her chest height, or as far as the floor allows
        const want = Math.min(this.maxLen(g), p.y - 4 - this.ay - this.hh);
        this.len = Math.min(want, this.len + DROP_SPEED * this.num('speed'));
        if (this.len >= want - 0.5) {
          this.set('hang');
          this.cool = 40;
        }
        break;
      }
      case 'hang': {
        // creep up or down the line to keep level with her
        const want = Math.max(PERCH_LEN, Math.min(this.maxLen(g), p.y - 4 - this.ay - this.hh));
        this.len += Math.max(-0.5, Math.min(0.5, want - this.len)) * this.num('speed');
        if (this.can('spit') && this.cool <= 0 && p.alive && Math.abs(dx) < 170 * sight) this.set('spit');
        else if (this.can('climb') && this.st > HANG_TIME) this.set('climb');
        break;
      }
      case 'spit':
        if (this.st === SPIT_WIND) {
          const ox = this.x, oy = this.y + 6, tx = p.x - ox, ty = p.y - 4 - oy, d = Math.hypot(tx, ty) || 1;
          g.spawn(new EnemyShot(g, ox, oy, (tx / d) * 2.6, (ty / d) * 2.6, 'web', Math.round(this.atk * 0.5)));
          g.audio.play('spit');
        }
        if (this.st > SPIT_WIND + 12) {
          this.set('hang');
          this.cool = 110 * this.num('cooldown');
        }
        break;
      case 'climb':
        this.len -= CLIMB_SPEED * this.num('speed');
        if (this.len <= PERCH_LEN) {
          this.set('perch');
          this.cool = REST_TIME;
        }
        break;
      case 'fall': {
        const r = this.physics(g);
        s.setFrame(A.fall[0]);
        if (r.landed || this.onGround) {
          this.set('crawl');
          g.fx.burst(this.x, this.bottom - 2, 'dust', 2, 4);
          g.shake(1, 6);
          this.faceToward(p.x);
        }
        this.place();
        return;
      }
      case 'crawl': {
        if (this.stun <= 0) {
          const near = Math.abs(dx) < 160 * sight && Math.abs(p.bottom - this.bottom) < 40;
          if (near && this.st % 24 === 0) this.faceToward(p.x);
          this.patrolTurn(g, (near ? 1.1 : 0.6) * this.num('speed'));
        }
        this.physics(g);
        s.anim('crawl', this.t / 60, 14);
        this.place();
        return;
      }
    }
    // still on the thread
    this.hangAt();
    this.facing = dx < 0 ? -1 : 1;
    if (this.state === 'spit') s.setFrame(A.spit[0]);
    else s.anim('hang', this.t / 60, this.state === 'drop' || this.state === 'climb' ? 10 : 3);
    s.place(this.x, this.y, this.facing < 0);
    const th = this.thread;
    th.visible = true;
    th.place(this.ax, this.ay + this.len / 2);
    th.mesh.scale.y = Math.max(1, this.len + 2);
  }
  die(g: Game) {
    this.thread.visible = false;
    super.die(g);
  }
  destroy() {
    this.thread.dispose();
    super.destroy();
  }
}
