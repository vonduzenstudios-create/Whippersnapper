// What the ten mini-bosses share (0.31.0). They are enemies, not bosses: no health bar, no
// phases, no sealed doors. Each is bigger and heavier than a normal monster (blows don't push
// it back), has a handful of telegraphed attacks, and dies with a bigger bang.
//
// A mini-boss is a puppet sheet (gfx/minis/) plus a `run()` method: one switch over its states
// that sets `vx`/`vy` and picks the frame to show (`fr`). Speed, sight range, cooldown and each
// attack are knobs in the enemy editor (ENEMY_TUNING in data.ts), read through num() and can().
import { Sprite, Sheet } from '../../gfx/view';
import { Ent, DmgType } from '../ent';
import type { Game } from '../game';
import { Enemy } from '../enemies';
import { groundAt } from '../../world/room';
import { Box, overlap } from '../../core/util';

export abstract class MiniBoss extends Enemy {
  /** The current state and how many frames it has run. */
  st = 'idle';
  stT = 0;
  /** Frames until it may start another attack. */
  cool = 50;
  /** Scratch values for the current state (cleared by set()). */
  data: any = {};
  /** The frame to show this tick (run() sets it). */
  fr = 0;
  A: Record<string, number[]>;
  /** Its last move ran into a wall. */
  bumped = false;
  /** Chains and the like it owns: disposed with it. */
  gear: { dispose(): void }[] = [];
  constructor(g: Game, kind: string, x: number, bottom: number, hw: number, hh: number) {
    super(g, kind, x, bottom, hw, hh);
    this.heavy = true;
    this.feet = 0;
    this.A = this.sprite!.sheet.anims;
    this.fr = this.A.idle[0];
    this.facing = g.player.x < x ? -1 : 1;
  }
  /** One frame of its behavior: set velocities and `fr`. Called between baseUpdate and physics. */
  abstract run(g: Game): void;
  set(s: string) {
    this.st = s;
    this.stT = 0;
    this.data = {};
  }
  /** Does it see the hero: within `range` px (times the sight knob) and roughly level with it? */
  sees(g: Game, range = 220, dy = 90) {
    const p = g.player;
    return p.alive && Math.abs(p.x - this.x) < range * this.num('sight') && Math.abs(p.y - this.y) < dy;
  }
  /** Is there a drop just ahead of it (it is on the ground, and there is none in front)? */
  ledge(g: Game) {
    return this.onGround && !groundAt(g.room, this.x + this.facing * (this.hw + 4), this.bottom);
  }
  /** Walk toward the hero at `speed` (times the speed knob), stopping `stop` px short. Returns true while walking. */
  approach(g: Game, speed: number, stop = 0) {
    this.faceToward(g.player.x);
    if (Math.abs(g.player.x - this.x) <= stop || this.ledge(g)) {
      this.vx = 0;
      return false;
    }
    this.vx = this.facing * speed * this.num('speed');
    return true;
  }
  /** A looping animation, `per` game frames for each of its frames. */
  loop(name: string, per = 6, t = this.t) {
    const a = this.A[name];
    this.fr = a[Math.floor(t / per) % a.length];
  }
  /** A one-shot animation stretched over `dur` frames of the current state. Returns how far through it is (0..1+). */
  once(name: string, dur: number, t = this.stT) {
    const a = this.A[name], k = t / dur;
    this.fr = a[Math.max(0, Math.min(a.length - 1, Math.floor(k * a.length)))];
    return k;
  }
  /** A box in front of it: `ahead` px from its middle, `up` px above its feet. */
  front(ahead: number, up: number, hw: number, hh: number): Box {
    return { x: this.x + this.facing * ahead, y: this.bottom - up, hw, hh };
  }
  /** Hurt the hero if she is inside `box`. Returns true if she was hurt. */
  hit(g: Game, box: Box, dmg = this.atk, type: DmgType = 'melee', fromX = this.x) {
    const p = g.player;
    if (!p.alive || p.invuln > 0 || !overlap(box, p)) return false;
    const hp0 = g.hunter.hp;
    p.takeDamage(dmg, fromX, false, true, type, box.y); // (it returns true only when the blow kills her)
    return g.hunter.hp < hp0 && !p.justBlocked;
  }
  /** Start an attack's cooldown: `frames` times the cooldown knob. */
  rest(frames: number) {
    this.cool = frames * this.num('cooldown');
    this.set('idle');
  }
  update(g: Game) {
    this.baseUpdate(g);
    this.stT++;
    if (this.cool > 0) this.cool--;
    this.run(g);
    this.bumped = !!this.physics(g).hitX;
    this.sprite!.setFrame(this.fr);
    this.place();
  }
  die(g: Game) {
    super.die(g);
    g.shake(5, 20);
    g.fx.burst(this.x, this.y, 'burst', 6, this.hh, { fps: 10 });
    g.fx.burst(this.x, this.bottom - 4, 'dust', 8, this.hw * 2, { speed: 1.6, grav: 0.05, life: 30 });
    g.audio.play('explode');
  }
  destroy() {
    super.destroy();
    for (const d of this.gear) d.dispose();
    this.gear = [];
  }
}

export interface BitOpts {
  /** Frames per animation frame. */
  per?: number;
  order?: number;
  /** Called every frame; return false to end it early. */
  tick?: (b: Bit, g: Game) => boolean | void;
  flip?: boolean;
}

/**
 * A short-lived thing a mini-boss leaves in the room (a poison puddle, a choke cloud, a blood
 * spike, a coin flying home): a sprite that animates for `life` frames and does what its
 * `tick` says. It never hurts anyone by touch on its own; `tick` decides that.
 */
export class Bit extends Ent {
  t = 0;
  frames: number[];
  constructor(g: Game, sheet: Sheet, anim: string, x: number, y: number, public life: number, public o: BitOpts = {}) {
    super();
    this.x = x;
    this.y = y;
    this.sprite = new Sprite(sheet, g.view.sprites, o.order ?? 9);
    this.frames = sheet.anims[anim];
    this.sprite.setFrame(this.frames[0]);
    this.sprite.place(x, y, !!o.flip);
  }
  update(g: Game) {
    this.t++;
    if (this.o.tick?.(this, g) === false || this.t >= this.life) {
      this.dead = true;
      return;
    }
    const s = this.sprite!;
    s.setFrame(this.frames[Math.floor(this.t / (this.o.per || 6)) % this.frames.length]);
    s.place(this.x, this.y, !!this.o.flip);
    if (this.life - this.t < 20) s.opacity = (this.life - this.t) / 20;
  }
}
