// What the ten trial bosses (0.27.0) share, on top of BossBase.
//
// Their damage rule is "chip + bonus": the whip always takes a little (CHIP), but each boss can
// be forced into a vulnerable state (`stun`) in more than one way, and blows landed there take
// a quarter of a segment each, as in BossBase. A fight is 3 + 3 such openings: at half HP the
// boss plays its `shift` scene and comes back with a second set of patterns.
//
// A trial boss is a puppet sheet (gfx/puppet.ts) plus a `run()` method: one switch over its
// patterns that moves it and picks the frame to show (`fr`). Every attack ends by going back
// to 'idle', which is the only pattern the phase change interrupts.
import * as THREE from 'three';
import { Sprite, Sheet } from '../gfx/view';
import { DmgType, HitKind } from './ent';
import type { Game } from './game';
import { BossBase, Target } from './boss_base';
import { EnemyShot } from './objects';
import { Box, overlap } from '../core/util';
import { TILE } from '../config';

/** Every trial chamber is 48 x 28 tiles with walls eight tiles thick: the arena is columns 8-39. */
export const AX0 = 8 * TILE, AX1 = 40 * TILE, AMID = (AX0 + AX1) / 2;
/** What a blow takes outside a vulnerable state. */
export const CHIP = 5;

export interface BulletOpts {
  /** Frames from the fx sheet (or from `sheet`). */
  anim?: string;
  sheet?: Sheet;
  tint?: [number, number, number];
  scale?: number;
  glow?: number;
  grav?: number;
  life?: number;
  /** Radius of its hitbox. */
  r?: number;
  type?: DmgType;
  /** Radians a frame it turns (flat-shaded sprites only). */
  spin?: number;
  /** false = it flies through walls. */
  solid?: boolean;
  /** Frames per animation frame. */
  per?: number;
  /** Called every frame (steering, trails). */
  tick?: (b: Bullet, g: Game) => void;
  /** Called when it ends: on the hero (`hurt` if it got through), on a wall, or when its time is up. */
  end?: (b: Bullet, g: Game, hurt: boolean) => void;
  /** If set, the whip can strike it. */
  whip?: (b: Bullet, g: Game, fromX: number) => void;
}

/** A boss's projectile with its own look and rules. It is an EnemyShot, so shields and clearShots treat it as one. */
export class Bullet extends EnemyShot {
  life: number;
  constructor(g: Game, x: number, y: number, vx: number, vy: number, dmg: number, public o: BulletOpts = {}) {
    super(g, x, y, vx, vy, 'rock', dmg, o.grav || 0);
    const sheet = o.sheet || g.sheets.fx, s = this.sprite!;
    if (o.sheet) s.setSheet(sheet);
    this.frames = sheet.anims[o.anim || 'fireball'];
    s.setFrame(this.frames[0]);
    if (o.scale) s.mesh.scale.set(sheet.cw * o.scale, sheet.ch * o.scale, 1);
    if (o.tint) s.tint(...o.tint);
    s.glow = o.glow || 0;
    this.hw = this.hh = o.r || 4;
    this.life = o.life || 420;
    this.whipTarget = !!o.whip;
    this.kind = 'bullet';
  }
  hitType(): DmgType {
    return this.o.type || 'magic';
  }
  onHit(g: Game, _dmg: number, fromX: number) {
    this.o.whip?.(this, g, fromX);
  }
  strike(g: Game, hurt: boolean) {
    if (this.dead) return;
    this.dead = true;
    g.fx.burst(this.x, this.y, 'spark', 1, 2);
    this.o.end?.(this, g, hurt);
  }
  update(g: Game) {
    this.t++;
    this.vy += this.grav;
    this.x += this.vx;
    this.y += this.vy;
    this.o.tick?.(this, g);
    const s = this.sprite!;
    s.setFrame(this.frames[Math.floor(this.t / (this.o.per || 5)) % this.frames.length]);
    s.place(this.x, this.y, this.vx < 0 && !this.o.spin);
    if (this.o.spin) s.mesh.rotation.z -= this.o.spin * (Math.sign(this.vx) || 1);
    const out = this.x < -40 || this.x > g.room.W + 40 || this.y > g.room.H + 40 || this.y < -200;
    if (this.t > this.life || out || (this.o.solid !== false && g.room.solidPx(this.x, this.y))) this.strike(g, false);
  }
}

/** A chain, rope or tongue: fx-sheet links laid along a straight line between two points. */
export class Chain {
  links: Sprite[] = [];
  constructor(private g: Game, private anim = 'link', private order = 9, private gap = 5, private tint?: [number, number, number]) {}
  set(x0: number, y0: number, x1: number, y1: number) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / this.gap));
    const fx = this.g.sheets.fx;
    while (this.links.length < n) {
      const s = new Sprite(fx, this.g.view.sprites, this.order);
      s.setFrame(fx.anims[this.anim][0]);
      if (this.tint) s.tint(...this.tint);
      this.links.push(s);
    }
    this.links.forEach((s, i) => {
      s.visible = i < n;
      if (i < n) s.place(x0 + ((x1 - x0) * (i + 0.5)) / n, y0 + ((y1 - y0) * (i + 0.5)) / n);
    });
  }
  hide() {
    for (const s of this.links) s.visible = false;
  }
  dispose() {
    for (const s of this.links) s.dispose();
    this.links = [];
  }
}

/** A thin plain line (a puppet string, a pendulum rod, a clock hand). */
export class Cord {
  mesh: THREE.Mesh;
  constructor(g: Game, color: string, order = 5, opacity = 1) {
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, fog: false }));
    this.mesh.renderOrder = order;
    this.mesh.frustumCulled = false;
    g.view.sprites.add(this.mesh);
  }
  set(x0: number, y0: number, x1: number, y1: number, width = 1) {
    this.mesh.visible = true;
    this.mesh.position.set((x0 + x1) / 2, -(y0 + y1) / 2, 0);
    this.mesh.rotation.z = Math.atan2(-(y1 - y0), x1 - x0);
    this.mesh.scale.set(Math.hypot(x1 - x0, y1 - y0) || 1, width, 1);
  }
  color(c: string) {
    (this.mesh.material as THREE.MeshBasicMaterial).color.set(c);
  }
  hide() {
    this.mesh.visible = false;
  }
  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export abstract class TrialBoss extends BossBase {
  /** Frames left of the vulnerable state. */
  vulnT = 0;
  /** How many times it has been opened up (bosses get quicker with it). */
  opened = 0;
  /** The sheet frame to show this tick (run() sets it). */
  fr = 0;
  A: Record<string, number[]>;
  /** Chains, cords and beams it owns: disposed with it. */
  gear: { dispose(): void }[] = [];
  constructor(g: Game, id: string, sheet: Sheet, hw: number, hh: number, x: number, order = 11) {
    super(g, id, sheet, hw, hh, order);
    this.A = sheet.anims;
    this.x = x;
    this.y = this.floorY - hh;
    this.fr = sheet.anims.idle[0];
  }
  /** One frame of the fight: move, attack, and set `fr`. Handles every pattern but 'dying'. */
  abstract run(g: Game): void;
  /** The pose it dies in. */
  dyingFrame() {
    return (this.A.stun || this.A.idle)[0];
  }
  get shielded() {
    return this.pat === 'enter' || this.pat === 'dying' || this.pat === 'shift';
  }
  get dx() {
    return this.g.player.x - this.x;
  }
  /** Turn to face the hero. */
  look() {
    this.facing = this.dx < 0 ? -1 : 1;
  }
  /** A looping animation, `per` game frames for each of its frames. */
  loop(name: string, per = 6, t = this.g.frame) {
    const a = this.A[name];
    this.fr = a[Math.floor(t / per) % a.length];
  }
  /** A one-shot animation stretched over `dur` game frames, `t` frames in. */
  once(name: string, t: number, dur: number) {
    const a = this.A[name];
    this.fr = a[Math.max(0, Math.min(a.length - 1, Math.floor((t / dur) * a.length)))];
  }
  /** Hurt the hero if she is inside `box`. */
  hit(g: Game, box: Box, dmg = this.atk, type: DmgType = 'melee', fromX = this.x) {
    const p = g.player;
    if (!p.alive || p.invuln > 0 || !overlap(box, p)) return false;
    p.takeDamage(dmg, fromX, false, true, type, box.y);
    return true;
  }
  /** A blow outside a vulnerable state: a little damage. */
  chip(g: Game, x: number, y: number, amount = CHIP) {
    if (g.frame === this.data.chipF) return;
    this.data.chipF = g.frame;
    this.hp -= amount;
    this.flashT = 5;
    g.damageNumber(x, y - 14, amount, '#c8c8c8');
    g.audio.play('hit');
    if (this.hp <= 0) this.startDying(g);
  }
  /**
   * The default for a blow on the body: a full blow while vulnerable, a chip otherwise. Holy
   * fire only ever chips: it can open a boss up, but it keeps burning, and it would otherwise
   * use up the whole window by itself.
   */
  bodyHit(g: Game, t: Target, kind: HitKind) {
    if (this.vulnT > 0) {
      if (this.strike(g, t.x, t.y, kind, kind === 'holy' ? CHIP : undefined) && this.hp > 0) this.endStun(g);
    } else this.chip(g, t.x, t.y);
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    this.bodyHit(g, t, kind);
  }
  hurtZones(): Target[] {
    return this.vulnT > 0 ? [] : super.hurtZones();
  }
  /** Force it into its vulnerable state for `frames`. */
  stun(g: Game, frames: number, msg = 'IT IS OPEN: STRIKE') {
    if (this.vulnT > 0 || this.shielded) return;
    this.vulnT = frames;
    this.windowDmg = 0;
    this.opened++;
    this.clearShots(g);
    this.pick('stun');
    g.message(msg, 130);
    g.audio.play('bossHit');
    g.hitstop(6);
    g.shake(4, 14);
    g.fx.burst(this.x, this.y - this.hh, 'star', 10, 16, { vy: -0.6, life: 40, fade: true, glow: 1 });
  }
  endStun(_g: Game) {
    this.vulnT = 0;
    this.pick('idle');
  }
  /** The entrance's fixed beats: music and name at `introAt`, the freeze and the talk at `talkAt`. */
  enterBeats(g: Game, introAt: number, talkAt: number) {
    if (this.pt === introAt) g.bossIntro();
    if (this.pt === talkAt) g.bossTalk();
    if (this.pt > talkAt) this.pick('idle');
  }
  /** The same for the change of phase (`boss_<id>_phase2`). */
  shiftBeats(g: Game, talkAt: number) {
    if (this.pt === talkAt) g.bossTalk(`boss_${this.id}_phase2`);
    if (this.pt > talkAt) this.pick('idle');
  }
  /** Called every frame of the death sequence (props settling, hands withdrawing). */
  whileDying(_g: Game) {}
  /** Called once, on the frame phase two's scene begins. */
  onShift(_g: Game) {}
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    if (this.pat === 'dying') {
      this.fr = this.dyingFrame();
      this.y = Math.min(this.floorY - this.hh, this.y + 3); // killed mid-leap, it falls to the floor
      this.whileDying(g);
      this.show();
      this.dyingTick(g, 150, 30);
      return;
    }
    if (this.vulnT > 0 && --this.vulnT === 0 && this.pat === 'stun') this.endStun(g);
    if (this.phase === 1 && this.hp <= this.maxHp / 2 && this.vulnT <= 0 && this.pat === 'idle') {
      this.phase = 2;
      g.bossScene();
      this.clearShots(g);
      this.set('shift');
      this.onShift(g);
    }
    this.run(g);
    this.show();
  }
  show() {
    const s = this.sprite!;
    s.setFrame(this.fr);
    s.place(this.x, this.y + this.hh, this.facing < 0);
    this.showFlash();
    s.glow = this.vulnT > 0 ? 0.18 + Math.sin(this.g.frame * 0.25) * 0.12 : 0;
  }
  destroy() {
    super.destroy();
    for (const d of this.gear) d.dispose();
    this.gear = [];
  }
}
