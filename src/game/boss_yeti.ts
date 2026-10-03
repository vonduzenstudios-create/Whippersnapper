// Old Rimehide (Rimecrown Summit). The den's floor is a frozen lake, and the beast is too
// heavy for it.
//
// The floor is eight slabs of ice. Each takes three blows before it gives way:
//   - a snow boulder cracks the slab it lands on (he throws it at where you stand)
//   - his leap cracks the slab he lands on (he jumps at where you stand; a shadow shows where)
// He shrugs off the chain (his forearm comes up). So: let his boulders weaken a slab, stand on
// it to bait the leap, and step off. When a slab breaks under him he drops through to the
// chest and is stuck: that's the window. Then he hauls himself out, and that slab stays open
// water for twenty seconds. Fall in yourself and the cold eats at you.
// After the first dunking he stamps twice where he lands.
import type { Game } from './game';
import { Ent, DmgType, HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { BossBase, Target, prop } from './boss_base';
import { clamp, rand, overlap } from '../core/util';
import { TILE } from '../config';

const SLABS = 8;
const SLAB_W = 5; // tiles
const SLAB_X0 = 4; // first slab's left tile
const REFREEZE = 1200; // frames until open water freezes over again
const STUCK = 380; // frames he's stuck in the hole

/** A boulder of packed snow: an arc, then it bursts on the ice and cracks the slab under it. */
class Snowball extends Ent {
  t = 0;
  constructor(g: Game, x: number, y: number, public vx: number, public vy: number, private boss: Yeti) {
    super();
    this.x = x;
    this.y = y;
    this.hw = this.hh = 9;
    this.hostile = true;
    this.touchDmg = 18;
    this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 14);
    this.sprite.setFrame(g.sheets.fx.anims.rock[0]);
    this.sprite.mesh.scale.multiplyScalar(2.2);
    this.sprite.tint(1.7, 1.8, 2);
  }
  hitType(): DmgType {
    return 'shot';
  }
  update(g: Game) {
    this.t++;
    this.vy += 0.17;
    this.x += this.vx;
    this.y += this.vy;
    this.sprite!.place(this.x, this.y);
    this.sprite!.mesh.rotation.z += 0.15;
    if (this.y >= this.boss.floorY - 8) {
      this.dead = true;
      g.audio.play('crumble');
      g.fx.burst(this.x, this.boss.floorY - 6, 'flake', 10, 12, { speed: 2, grav: 0.08, life: 36, fade: true });
      this.boss.crack(g, this.boss.slabAt(this.x), 1);
    }
    if (this.t > 300) this.dead = true;
  }
}

export class Yeti extends BossBase {
  label = 'RIMEHIDE';
  /** Blows each slab has taken (3 = broken), frames until a broken one refreezes, and its crack overlay. */
  slabs: { hits: number; thaw: number; s: Sprite }[] = [];
  shadow: Sprite;
  guardT = 0;
  dunked = 0;
  get camZoom() {
    return 1.15;
  }
  constructor(g: Game) {
    super(g, 'yeti', g.sheets.yeti, 26, 36, 11);
    this.x = g.room.W / 2 + 80;
    this.y = -80;
    for (let i = 0; i < SLABS; i++) {
      const s = prop(g, 'props', 'crack', (SLAB_X0 + i * SLAB_W + SLAB_W / 2) * TILE, this.floorY - 14, 7);
      s.mesh.scale.set(SLAB_W * TILE, 48, 1); // stretched across the slab
      s.visible = false;
      this.props.push(s);
      this.slabs.push({ hits: 0, thaw: 0, s });
    }
    this.shadow = prop(g, 'props', 'crack', 0, 0, 7, 2);
    this.shadow.visible = false;
    this.props.push(this.shadow);
  }
  /** Which slab is under pixel column x (-1 = the solid rim at either end). */
  slabAt(x: number) {
    const i = Math.floor((x / TILE - SLAB_X0) / SLAB_W);
    return i >= 0 && i < SLABS ? i : -1;
  }
  slabMid(i: number) {
    return (SLAB_X0 + i * SLAB_W + SLAB_W / 2) * TILE;
  }
  /** The ice of slab i is there or not: change the room's tiles and repaint. */
  setIce(g: Game, i: number, solid: boolean) {
    for (let k = 0; k < SLAB_W; k++) g.room.set(SLAB_X0 + i * SLAB_W + k, g.room.rows - 2, solid ? '#' : '.');
    g.paintRoomTiles();
  }
  /** A slab takes `n` blows. Returns true if it broke. */
  crack(g: Game, i: number, n: number) {
    const sl = this.slabs[i];
    if (i < 0 || !sl || sl.hits >= 3) return false;
    sl.hits = Math.min(3, sl.hits + n);
    g.audio.play('glass');
    if (sl.hits < 3) return false;
    sl.thaw = REFREEZE;
    this.setIce(g, i, false);
    g.shake(5, 20);
    g.audio.play('splash');
    g.fx.burst(this.slabMid(i), this.floorY, 'glass', 12, 30, { speed: 2.5, grav: 0.12, life: 44, fade: true });
    g.fx.burst(this.slabMid(i), this.floorY + 6, 'splash', 5, 24, { life: 24 });
    return true;
  }
  hitType(): DmgType {
    return this.pat === 'leap' ? 'melee' : 'touch';
  }
  targets(): Target[] {
    return [{ id: 'body', x: this.x, y: this.y - 4, r: 34 }];
  }
  hurtZones(): Target[] {
    return this.pat === 'stuck' ? [] : [{ id: 'body', x: this.x, y: this.y, r: 24 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (this.pat === 'stuck') {
      if (this.strike(g, this.x, this.y - 20, kind) && this.pat === 'stuck') this.climbOut(g);
      return;
    }
    // anywhere else his forearm takes it
    this.guardT = 16;
    this.clank(g, t.x, t.y - 10);
  }
  /** Out of the hole, onto the nearest slab that still holds. */
  climbOut(g: Game) {
    this.dunked++;
    this.phase = 2;
    let best = -1;
    for (let i = 0; i < SLABS; i++) if (this.slabs[i].hits < 3 && (best < 0 || Math.abs(this.slabMid(i) - this.x) < Math.abs(this.slabMid(best) - this.x))) best = i;
    this.x = best >= 0 ? this.slabMid(best) : this.x < g.room.W / 2 ? 40 : g.room.W - 40;
    this.y = this.floorY - this.hh;
    g.audio.play('roar');
    g.shake(5, 30);
    g.fx.burst(this.x, this.floorY, 'flake', 12, 20, { vy: -1, life: 36, fade: true });
    this.pick('walk');
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    if (this.guardT > 0) this.guardT--;
    const p = g.player, W = g.room.W, A = g.sheets.yeti.anims, s = this.sprite!, d = this.data;
    const fast = this.phase === 2 ? 1.25 : 1;
    const ground = this.floorY - this.hh;
    const dx = p.x - this.x;
    let frame = A.idle[Math.floor(g.frame / 20) % 2];
    this.shadow.visible = false;
    // the lake: broken slabs freeze over again in time, and its water is deadly cold
    const CR = g.sheets.props.anims.crack;
    this.slabs.forEach((sl, i) => {
      if (sl.hits >= 3 && --sl.thaw <= 0 && this.pat !== 'stuck' && this.pat !== 'dying') {
        sl.hits = 0;
        this.setIce(g, i, true);
        g.fx.burst(this.slabMid(i), this.floorY, 'flake', 8, 30, { vy: -0.4, life: 30, fade: true });
      }
      sl.s.visible = sl.hits === 1 || sl.hits === 2;
      if (sl.s.visible) sl.s.setFrame(CR[sl.hits - 1]);
    });
    if (p.alive && p.bottom > this.floorY + 6 && g.frame % 20 === 0) p.poison(60, 3); // in the water
    switch (this.pat) {
      case 'enter':
        // it drops from the dark above (onto the solid rim, so the ice holds) and roars
        if (this.y < ground) {
          this.vy = Math.min(this.vy + 0.35, 7);
          this.y = Math.min(ground, this.y + this.vy);
          frame = A.leap[0];
          if (this.y >= ground) {
            g.audio.play('rumble');
            g.shake(6, 30);
            d.landed = this.pt;
          }
        } else if (d.landed) {
          const t = this.pt - d.landed;
          frame = t < 20 ? A.squat[0] : t < 90 ? A.lift[0] : A.idle[0];
          if (t === 24) {
            g.audio.play('roar');
            g.shake(5, 50);
            g.bossIntro();
          }
          if (t === 100) g.bossTalk();
          if (t > 100) this.pick('walk');
        }
        this.facing = dx < 0 ? -1 : 1;
        break;
      case 'walk': {
        this.facing = dx < 0 ? -1 : 1;
        // he won't walk onto open water
        const ahead = this.slabAt(this.x + this.facing * 44);
        const open = ahead >= 0 && this.slabs[ahead].hits >= 3;
        if (Math.abs(dx) > 90 && !open) this.x += this.facing * 1.1 * fast;
        frame = A.walk[Math.floor(this.pt / 9) % 4];
        if (this.pt > 80 / fast) this.pick(this.last === 'snowball' ? 'leap' : this.choose(['snowball', 'snowball', 'leap']));
        break;
      }
      case 'snowball': {
        this.facing = dx < 0 ? -1 : 1;
        frame = this.pt < 36 ? A.lift[0] : A.throw[0];
        if (this.pt === 36) {
          // aimed to come down where she stands now
          const vy = -5, time = 2 * 5 / 0.17 + 8;
          g.spawn(new Snowball(g, this.x + this.facing * 12, this.y - 50, clamp(dx / time, -6, 6), vy, this));
          g.audio.play('throw');
        }
        if (this.pt > 70) this.pick('walk');
        break;
      }
      case 'leap': {
        const tell = 34;
        if (this.pt <= tell) {
          frame = A.squat[0];
          this.facing = dx < 0 ? -1 : 1;
          if (this.pt === 1) {
            d.x0 = this.x;
            d.tx = clamp(p.x, 50, W - 50);
            g.audio.play('growl');
          }
          this.shadow.visible = true;
          this.shadow.place(d.tx, this.floorY - 22);
        } else {
          const len = 50 / fast, t = Math.min(1, (this.pt - tell) / len);
          this.x = d.x0 + (d.tx - d.x0) * t;
          this.y = ground - Math.sin(t * Math.PI) * 140;
          frame = A.leap[0];
          this.shadow.visible = true;
          this.shadow.place(d.tx, this.floorY - 22);
          if (t >= 1) {
            this.y = ground;
            g.audio.play('rumble');
            g.shake(6, 24);
            g.fx.burst(this.x, this.floorY, 'flake', 10, 24, { vy: -0.8, life: 30, fade: true });
            // the landing itself hurts anyone still under it
            if (p.alive && p.invuln <= 0 && overlap({ x: this.x, y: this.floorY - 20, hw: 34, hh: 22 }, p)) p.takeDamage(this.atk, this.x, false, true, 'melee');
            const i = this.slabAt(this.x);
            if (i >= 0 && this.crack(g, i, this.phase === 2 ? 2 : 1)) {
              // through the ice
              this.windowDmg = 0;
              this.x = this.slabMid(i);
              g.message('THE ICE GIVES WAY: STRIKE', 150);
              this.pick('stuck');
            } else this.pick('walk');
          }
        }
        break;
      }
      case 'stuck':
        frame = A.stuck[Math.floor(this.pt / 12) % 2];
        this.y = ground;
        if (this.pt % 30 === 0) g.fx.burst(this.x + rand(-30, 30), this.floorY + 4, 'splash', 1, 0, { life: 18 });
        if (this.pt > STUCK) this.climbOut(g);
        break;
      case 'dying':
        frame = A.stuck[0];
        this.y = Math.min(ground + 30, this.y + 0.3); // he goes under
        if (this.dyingTick(g, 160, 34)) return;
        break;
    }
    if (this.guardT > 0 && (this.pat === 'walk' || this.pat === 'snowball')) frame = A.guard[0];
    this.x = clamp(this.x, 40, W - 40);
    s.setFrame(frame);
    s.place(this.x, this.y + this.hh, this.facing < 0);
    this.showFlash();
    if (this.phase === 2) s.tint(1.12, 0.96, 0.96);
  }
}
