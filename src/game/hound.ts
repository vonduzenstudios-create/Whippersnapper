// Gnarlfang, the two-headed hound of the Kennel Yards (boss of the Hound Pit).
//   stalk  - walks at you; snaps if you get close (bite)
//   charge - crouches and growls, then bolts across the pit until it slams into a wall
//            and reels, dazed (takes 50% more damage while dazed); masonry falls
//   leap   - pounces at where you stand; the landing sends shockwaves both ways
//   howl   - below half HP: calls two wild dogs into the pit
// It fights first as a flayed, vein-covered brute. When that HP runs out it collapses and the
// music dies as if you'd won (fakeout); then embers stir and it rises as the Cinder Mastiff
// (rise) with a second, shorter HP bar. That form is faster, howls from the start, and adds:
//   spit   - the skull head coughs up a fan of fireballs
// and its wall slams rain fire instead of masonry, and its landings throw burning cinders.
import { Sprite } from '../gfx/view';
import { Ent, HitKind, Boss } from './ent';
import type { Game } from './game';
import { ENEMY } from './data';
import { moveBody } from '../world/room';
import { EnemyShot } from './objects';
import { Dog, shockPair, Shockwave } from './enemies_expansion';
import { clamp, rand, sign } from '../core/util';
import { GRAVITY, MAX_FALL } from '../config';

type Pat = 'enter' | 'stalk' | 'bite' | 'charge' | 'stun' | 'leap' | 'howl' | 'spit' | 'fakeout' | 'rise' | 'dying';

/** The second form's HP, as a fraction of the first form's. */
const CINDER_HP = 0.8;

export class Hound extends Ent implements Boss {
  label = 'GNARLFANG';
  hp: number;
  maxHp: number;
  atk: number;
  phase = 1;
  form = 1; // 1 = flayed, 2 = cinder (after it rises)
  pat: Pat = 'enter';
  pt = 0;
  vx = 0;
  vy = 0;
  onGround = false;
  facing = -1;
  flashT = 0;
  deathT = 0;
  done = false;
  data: any = {};
  get showBar() {
    return this.pat !== 'enter' && this.pat !== 'fakeout' && !this.done; // no bar while it plays dead
  }
  get gone() {
    return this.done;
  }
  constructor(private g: Game, x: number) {
    super();
    const st = ENEMY.hound;
    this.hp = this.maxHp = st.hp;
    this.atk = st.atk;
    this.def = st.def;
    this.touchDmg = st.atk;
    this.hostile = true;
    this.whipTarget = true;
    this.hw = 27; // the redrawn hound is much bulkier than the first one
    this.hh = 22;
    // starts on the floor at the far side from the hero
    const p = g.player;
    this.x = p.x < g.room.W / 2 ? g.room.W - 90 : 90;
    this.y = g.room.H - 32 - this.hh;
    this.facing = p.x < this.x ? -1 : 1;
    void x;
    this.sprite = new Sprite(g.sheets.hound, g.view.sprites, 10);
  }
  get bottom() {
    return this.y + this.hh;
  }
  set(p: Pat) {
    this.pat = p;
    this.pt = 0;
    this.data = {};
  }
  face() {
    this.facing = this.g.player.x < this.x ? -1 : 1;
  }
  /** Pick the next attack. */
  next() {
    const g = this.g, p = g.player;
    const dogs = g.ents.filter((e) => e instanceof Dog && !e.dead).length;
    if (this.phase === 2 && dogs < 1 && Math.random() < 0.3) return this.set('howl');
    const opts: Pat[] = ['charge', 'leap', 'stalk', 'charge', 'leap'];
    if (this.form === 2) opts.push('spit', 'spit');
    let n = opts[Math.floor(Math.random() * opts.length)];
    if (Math.abs(p.x - this.x) < 90 && Math.random() < 0.5) n = 'bite';
    this.set(n);
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, A = g.sheets.hound.anims, s = this.sprite!;
    const fast = this.form === 2 ? 1.35 : this.phase === 2 ? 1.25 : 1;
    let frame = A.walk[Math.floor(g.frame / 8) % 4];
    switch (this.pat) {
      case 'enter':
        this.vx = 0;
        frame = A.howl[0];
        if (this.pt === 20) {
          g.audio.play('howl');
          g.shake(3, 40);
        }
        if (this.pt === 60) g.bossIntro();
        if (this.pt > 110) this.set('stalk');
        break;
      case 'stalk':
        this.face();
        this.vx = this.facing * 1.0 * fast;
        frame = A.walk[Math.floor(this.pt / 7) % 4];
        if (Math.abs(p.x - this.x) < 70 && this.pt > 20) this.set('bite');
        else if (this.pt > 90) this.next();
        break;
      case 'bite':
        if (this.pt < 22) {
          this.vx = 0;
          this.face();
          frame = A.crouch[0];
          if (this.pt === 1) g.audio.play('growl');
        } else if (this.pt < 32) {
          if (this.pt === 22) g.audio.play('bark');
          this.vx = this.facing * 4.2;
          frame = A.bite[0];
        } else {
          this.vx *= 0.8;
          frame = A.walk[0];
          if (this.pt > 54) this.next();
        }
        break;
      case 'charge':
        if (this.pt < 40) {
          this.vx = 0;
          this.face();
          frame = A.crouch[0];
          if (this.pt === 1) g.audio.play('growl');
          if (this.pt % 6 === 0) g.fx.burst(this.x - this.facing * 20, this.bottom - 2, 'dust', 1, 4);
        } else {
          if (this.pt === 40) g.audio.play('roar');
          this.vx = this.facing * 6 * fast;
          frame = A.charge[Math.floor(this.pt / 4) % 2];
          if (this.pt % 3 === 0) g.fx.burst(this.x - this.facing * 24, this.bottom - 3, 'dust', 1, 4);
          // slammed into the wall: reel, and shake masonry loose from the ceiling
          if (this.data.hit || this.pt > 240) {
            g.shake(7, 30);
            g.audio.play('explode');
            // the cinder form brings down burning debris instead of stone
            for (let i = 0; i < (this.phase === 2 ? 7 : 5); i++)
              g.spawn(new EnemyShot(g, rand(40, g.room.W - 40), 24 + rand(0, 20), 0, 0.5, this.form === 2 ? 'fireball' : 'rock', 16, 0.14));
            this.set('stun');
          }
        }
        break;
      case 'stun':
        this.vx = 0;
        frame = A.stun[0];
        if (this.pt > 80) this.next();
        break;
      case 'leap':
        if (this.pt < 18) {
          this.vx = 0;
          this.face();
          frame = A.crouch[0];
        } else if (this.pt === 18) {
          this.vy = -8.4;
          this.vx = clamp((p.x - this.x) / 46, -5, 5);
          this.onGround = false;
          g.audio.play('bark');
          frame = A.leap[0];
        } else if (!this.data.landed) {
          frame = A.leap[0];
          if (this.onGround) {
            this.data.landed = true;
            this.vx = 0;
            g.shake(5, 20);
            g.audio.play('gate');
            shockPair(g, this.x, this.bottom, 2.4 * fast, 16);
            // the cinder form throws two burning cinders up and out
            if (this.form === 2) for (const d of [-1, 1]) g.spawn(new EnemyShot(g, this.x, this.bottom - 12, d * 2.2, -4, 'fireball', 14, 0.18));
          }
        } else {
          frame = A.crouch[0];
          this.data.rest = (this.data.rest || 0) + 1;
          if (this.data.rest > 26) this.next();
        }
        break;
      case 'howl':
        this.vx = 0;
        frame = A.howl[0];
        if (this.pt === 10) {
          g.audio.play('howl');
          g.shake(3, 50);
        }
        if (this.pt === 50) {
          const floor = g.room.H - 32;
          for (const x of [40, g.room.W - 40]) {
            const d = new Dog(g, 'dog', x, floor);
            d.cool = 0;
            g.spawn(d);
            g.fx.burst(x, floor - 10, 'smoke', 4, 8, { vy: -0.5, fps: 8, life: 40 });
          }
        }
        if (this.pt > 90) this.next();
        break;
      case 'spit': {
        // rear back, then the skull head coughs up two fans of fire aimed at you
        this.vx = 0;
        if (this.pt === 1) {
          this.face();
          g.audio.play('growl');
        }
        frame = this.pt < 26 ? A.crouch[0] : A.bite[0];
        if (this.pt === 26 || this.pt === 40) {
          g.audio.play('fire');
          const mx = this.x + this.facing * 40, my = this.y - 20;
          const base = Math.atan2(p.y - my, p.x - mx);
          for (const da of [-0.28, 0, 0.28]) {
            const a = base + da + (this.pt === 40 ? 0.14 : 0);
            g.spawn(new EnemyShot(g, mx, my, Math.cos(a) * 2.8, Math.sin(a) * 2.8, 'fireball', 16));
          }
        }
        if (this.pt > 70) this.next();
        break;
      }
      case 'fakeout': {
        // the first form "dies": it slumps, smoulders and goes dark, and the music stops...
        this.vx = 0;
        frame = A.down[0];
        if (this.pt < 90 && this.pt % 10 === 0) {
          g.fx.burst(this.x + rand(-30, 30), this.y + rand(-16, 16), 'burst', 2, 8, { fps: 10 });
          g.audio.play('explode');
          g.shake(3, 8);
        }
        // ...a long silence, then embers stir in the body and something like a heartbeat
        if (this.pt > 150 && this.pt % 12 === 0) g.fx.burst(this.x + rand(-28, 28), this.y + rand(-10, 18), 'spark', 1, 4);
        if (this.pt === 170 || this.pt === 196) {
          g.audio.play('growl');
          g.shake(2, 10);
        }
        if (this.pt === 220) {
          // it rises, burning
          this.form = 2;
          this.phase = 2;
          this.sprite!.setSheet(g.sheets.houndCinder);
          this.maxHp = Math.round(ENEMY.hound.hp * CINDER_HP);
          this.hp = 0;
          g.flashWhite = 16;
          g.shake(8, 50);
          g.audio.play('roar');
          g.fx.burst(this.x, this.y, 'burst', 10, 26, { fps: 10 });
          g.fx.burst(this.x, this.y, 'smoke', 10, 30, { vy: -0.8, fps: 6, life: 70 });
          g.music.play('boss', 0.1);
          g.banner = { text: 'Gnarlfang', sub: 'risen from its own ashes', t: 200 };
          this.set('rise');
        }
        break;
      }
      case 'rise':
        // howling while its HP bar fills back up; can't be hurt until it's done
        this.vx = 0;
        frame = A.howl[0];
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp / 60);
        if (this.pt % 6 === 0) g.fx.burst(this.x + rand(-30, 30), this.y + rand(-20, 10), 'spark', 1, 4);
        if (this.pt > 80) {
          this.hostile = true;
          this.whipTarget = true;
          this.set('stalk');
        }
        break;
      case 'dying': {
        this.deathT++;
        this.vx = 0;
        frame = A.stun[0];
        if (this.deathT % 8 === 0) {
          g.fx.burst(this.x + rand(-26, 26), this.y + rand(-16, 16), 'burst', 2, 8, { fps: 10 });
          g.audio.play('explode');
          g.shake(3, 8);
        }
        s.opacity = Math.max(0, 1 - this.deathT / 150);
        if (this.deathT === 150) {
          g.fx.burst(this.x, this.y, 'smoke', 12, 30, { vy: -0.6, fps: 6, life: 70 });
          g.audio.play('roar');
          g.flashWhite = 16;
          s.visible = false;
          this.done = true;
          this.dead = true; // stops update(), or the death explosions would go on forever
          g.onBossDefeated();
          return;
        }
        break;
      }
    }
    // physics: the hound ignores one-way ledges and always falls to the floor
    if (this.pat !== 'dying' || !this.onGround) {
      this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
      const r = moveBody(g.room, this, false);
      if (r.hitX && this.pat === 'charge' && this.pt > 40) this.data.hit = true;
    }
    s.setFrame(frame);
    s.place(this.x, this.bottom - 28, this.facing < 0);
    s.flash = this.flashT > 0 ? (this.flashT % 4 < 2 ? 0.9 : 0.4) : 0;
    if (this.pat === 'fakeout') {
      const k = Math.max(0.4, 1 - this.pt / 90); // goes dark like a dead thing
      s.tint(k, k, k);
    } else if (this.form === 1 && this.phase === 2) s.tint(1.25, 0.85, 0.8);
    else s.tint(1, 1, 1);
  }

  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    if (this.pat === 'dying' || this.pat === 'enter' || this.pat === 'fakeout' || this.pat === 'rise') return;
    const real = this.pat === 'stun' ? Math.round(dmg * 1.5) : dmg;
    this.hp -= real;
    this.flashT = 8;
    g.damageNumber(this.x, this.y - this.hh - 8, real, crit ? '#ffe040' : this.pat === 'stun' ? '#ffb060' : '#ffffff');
    g.audio.play('bossHit');
    g.fx.burst(this.x + sign(fromX - this.x) * 16, this.y - 4, 'spark', 1, 4);
    if (kind === 'whip') g.hitstop(4);
    if (this.phase === 1 && this.hp > 0 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      g.message('GNARLFANG HOWLS FOR ITS PACK!', 140);
      this.set('howl');
    }
    if (this.hp <= 0) {
      this.hp = 0;
      // the first death is a lie: it plays dead, then rises in its cinder form
      this.set(this.form === 1 ? 'fakeout' : 'dying');
      this.hostile = false;
      this.whipTarget = false;
      g.music.stop(1.5);
      g.audio.play('roar');
      for (const e of g.ents) if (e instanceof EnemyShot || e instanceof Shockwave || e instanceof Dog) e.dead = true;
    }
  }
}
