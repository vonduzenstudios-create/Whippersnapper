// What the newer bosses share. Since 0.19.0 none of them is a health bar to grind down:
// each fight is a cycle the hero has to work (drain the pool, turn the gaze, crack the ice...)
// that opens a short window, and only blows landed in a window count. So a boss's HP is a
// number of SEGMENTS of 100, and a blow takes a fixed bite out of the current one (`strike`).
import * as THREE from 'three';
import { Sprite, Sheet } from '../gfx/view';
import { Ent, HitKind, Boss } from './ent';
import type { Game } from './game';
import { ENEMY } from './data';
import { EnemyShot, Rockfall } from './objects';
import { Shockwave } from './enemies_expansion';
import { rand, Box } from '../core/util';

/** One HP segment: a boss's HP is a whole number of these. */
export const SEG = 100;
/** Blows it takes to empty a segment during a window. */
export const BLOWS = 4;

/** Something the whip can strike that belongs to a boss: a body part or a prop of its arena. */
export interface Target {
  id: string;
  x: number;
  y: number;
  r: number;
}

/** A prop sprite from the 'props' (48x48, centered) or 'tallprops' (56x96, bottom middle) sheet. */
export function prop(g: Game, sheet: 'props' | 'tallprops', anim: string, x: number, y: number, order = 7, frame = 0) {
  const s = new Sprite(g.sheets[sheet], g.view.sprites, order);
  s.setFrame(g.sheets[sheet].anims[anim][frame]);
  s.place(x, y);
  return s;
}

/** A glowing straight beam between two world points (a gaze, a flame jet). Call set() every frame it shows. */
export class Beam {
  mesh: THREE.Mesh;
  core: THREE.Mesh;
  constructor(g: Game, color: string, order = 15) {
    const mk = (c: string, o: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
      m.renderOrder = o;
      m.frustumCulled = false;
      m.visible = false;
      g.view.sprites.add(m);
      return m;
    };
    this.mesh = mk(color, order);
    this.core = mk('#ffffff', order + 1);
  }
  set(x0: number, y0: number, x1: number, y1: number, width: number, alpha = 1) {
    const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(-(y1 - y0), x1 - x0);
    for (const [m, w, op] of [[this.mesh, width, 0.55 * alpha], [this.core, width * 0.35, 0.8 * alpha]] as [THREE.Mesh, number, number][]) {
      m.visible = alpha > 0.01;
      m.position.set((x0 + x1) / 2, -(y0 + y1) / 2, 0);
      m.rotation.z = a;
      m.scale.set(len, w, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = op;
    }
  }
  hide() {
    this.mesh.visible = this.core.visible = false;
  }
  dispose() {
    for (const m of [this.mesh, this.core]) {
      m.removeFromParent();
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  }
}

/** How far point (px, py) is from the segment (x0, y0)-(x1, y1). */
export function distToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

export abstract class BossBase extends Ent implements Boss {
  abstract label: string;
  hp: number;
  maxHp: number;
  atk: number;
  phase = 1;
  /** The current pattern and how many frames it has run. 'enter' and 'dying' are common to all. */
  pat = 'enter';
  pt = 0;
  last = '';
  vx = 0;
  vy = 0;
  facing = -1;
  flashT = 0;
  deathT = 0;
  done = false;
  /** Scratch values for the current pattern (cleared by set()). */
  data: any = {};
  /** Other things this boss owns (actors, shots of its own): they die with it. */
  minions: Ent[] = [];
  /** Prop sprites it put in the arena: disposed with it. */
  props: Sprite[] = [];
  /** What the last whip test touched (see targets()). */
  struck: Target | null = null;
  /** Damage taken in the current window, so a window closes after one segment. */
  windowDmg = 0;
  private clankT = 0;
  get showBar() {
    return this.pat !== 'enter' && !this.done;
  }
  get gone() {
    return this.done;
  }
  constructor(protected g: Game, public id: string, sheet: Sheet, hw: number, hh: number, order = 11) {
    super();
    const st = ENEMY[id];
    this.hp = this.maxHp = st.hp;
    this.atk = st.atk;
    this.def = st.def;
    this.touchDmg = st.atk;
    this.hostile = true;
    this.whipTarget = true;
    this.hw = hw;
    this.hh = hh;
    this.sprite = new Sprite(sheet, g.view.sprites, order);
  }
  /** The y of the arena floor (the top of the room's two-row floor). */
  get floorY() {
    return this.g.room.H - 32;
  }
  set(p: string) {
    this.pat = p;
    this.pt = 0;
    this.data = {};
  }
  pick(p: string) {
    this.last = p;
    this.set(p);
  }
  /** One of `opts`, avoiding the last pattern most of the time. */
  choose(opts: string[]) {
    let n: string;
    do n = opts[Math.floor(Math.random() * opts.length)];
    while (n === this.last && Math.random() < 0.8);
    return n;
  }
  /** Patterns during which nothing can be struck (entrances, scenes, dying). */
  get shielded() {
    return this.pat === 'enter' || this.pat === 'dying' || this.pat === 'rage';
  }

  // ------------------------------------------------------------ what the whip can strike

  /** Everything of this boss the whip can touch right now: body parts and props alike. */
  targets(): Target[] {
    return [{ id: 'body', x: this.x, y: this.y, r: Math.max(this.hw, this.hh) }];
  }
  /** The parts of it that hurt to touch. */
  hurtZones(): Target[] {
    return [{ id: 'body', x: this.x, y: this.y, r: Math.min(this.hw, this.hh) }];
  }
  private test(hit: (t: Target) => boolean) {
    for (const t of this.targets())
      if (hit(t)) {
        this.struck = t;
        return true;
      }
    return false;
  }
  hitAt(x: number, y: number, r: number) {
    return this.test((t) => Math.hypot(x - t.x, y - t.y) < t.r + r);
  }
  hitBox(b: Box) {
    return this.test((t) => Math.abs(b.x - t.x) < b.hw + t.r && Math.abs(b.y - t.y) < b.hh + t.r);
  }
  touches(b: Box) {
    return this.hostile && this.hurtZones().some((t) => Math.abs(b.x - t.x) < b.hw + t.r && Math.abs(b.y - t.y) < b.hh + t.r);
  }
  onHit(g: Game, _dmg: number, fromX: number, _crit: boolean, kind: HitKind) {
    const t = this.struck;
    if (this.shielded || !t) return;
    this.onStrike(g, t, fromX, kind);
  }
  /** The whip touched target `t`. Each boss decides what that does: call strike() or clank(). */
  abstract onStrike(g: Game, t: Target, fromX: number, kind: HitKind): void;

  /** A blow that doesn't count: armor, a cold piece, a shut wheel. A clink and sparks. */
  clank(g: Game, x: number, y: number) {
    if (g.frame - this.clankT < 10) return;
    this.clankT = g.frame;
    g.audio.play('clink');
    g.fx.burst(x, y, 'spark', 2, 8);
  }
  /**
   * A blow that counts: it takes `amount` HP (a quarter of a segment by default). Returns true
   * when the current window's segment is used up (the boss should end the window), and starts
   * the death sequence when HP runs out.
   */
  strike(g: Game, x: number, y: number, kind: HitKind, amount = SEG / BLOWS) {
    amount = Math.min(amount, SEG - this.windowDmg, this.hp);
    this.hp -= amount;
    this.windowDmg += amount;
    this.flashT = 8;
    g.damageNumber(x, y - 16, Math.round(amount), '#ffe040');
    g.audio.play('bossHit');
    g.fx.burst(x, y, 'spark', 3, 8);
    if (kind === 'whip') g.hitstop(4);
    if (this.hp <= 0) {
      this.startDying(g);
      return true;
    }
    return this.windowDmg >= SEG;
  }
  /** Remove its projectiles from the room (and its own actors too, when it dies). */
  clearShots(g: Game, minions = false) {
    for (const e of g.ents) if (e instanceof EnemyShot || e instanceof Shockwave || e instanceof Rockfall) e.dead = true;
    if (minions) for (const m of this.minions) m.dead = true;
  }
  startDying(g: Game) {
    this.hp = 0;
    this.set('dying');
    this.hostile = false;
    this.whipTarget = false;
    g.music.stop(1.5);
    this.clearShots(g, true);
  }
  /** Where the death explosions happen. */
  hitSpot(): [number, number] {
    return [this.x, this.y];
  }
  /**
   * One frame of the death sequence: explosions, then, after `len` frames, a white flash and
   * Game.onBossDefeated(). Returns true on the frame it ends (the boss is `dead` from then on,
   * so update() stops being called).
   */
  dyingTick(g: Game, len = 150, spread = 28) {
    this.deathT++;
    const [x, y] = this.hitSpot();
    if (this.deathT % 7 === 0) {
      g.fx.burst(x + rand(-spread, spread), y + rand(-spread, spread), 'burst', 2, 8, { fps: 10 });
      g.audio.play('explode');
      g.shake(3, 8);
    }
    if (this.sprite) this.sprite.opacity = Math.max(0, 1 - this.deathT / len);
    if (this.deathT < len) return false;
    g.flashWhite = 16;
    if (this.sprite) this.sprite.visible = false;
    this.done = true;
    this.dead = true; // stops update(), or the death explosions would go on forever
    g.onBossDefeated();
    return true;
  }
  showFlash(s: Sprite = this.sprite!) {
    s.flash = this.flashT > 0 ? (this.flashT % 4 < 2 ? 0.9 : 0.4) : 0;
  }
  destroy() {
    super.destroy();
    for (const s of this.props) s.dispose();
    this.props = [];
  }
}
