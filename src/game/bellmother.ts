// The Bell-Mother, matriarch of the harpies (boss of the Great Belfry).
//   hover    - circles above the hunter
//   swoop    - screeches from one side of the belfry, then dives across at your height
//   feathers - three fans of feather darts from above
//   toll     - rings the great bell: shockwaves roll in from both walls along the floor
//              (twice, with falling masonry, below half HP)
//   rage     - at half HP (a scene): she shrieks and rings the bell with her own body, twice
//   summon   - below half HP: calls two harpies
import { Sprite } from '../gfx/view';
import { Ent, HitKind, Boss } from './ent';
import type { Game } from './game';
import { ENEMY } from './data';
import { EnemyShot } from './objects';
import { Harpy, Shockwave } from './enemies_expansion';
import { clamp, rand, sign } from '../core/util';

type Pat = 'enter' | 'hover' | 'swoop' | 'feathers' | 'toll' | 'summon' | 'rage' | 'dying';

export class BellMother extends Ent implements Boss {
  label = 'BELL-MOTHER';
  hp: number;
  maxHp: number;
  atk: number;
  phase = 1;
  pat: Pat = 'enter';
  pt = 0;
  vx = 0;
  vy = 0;
  facing = -1;
  flashT = 0;
  deathT = 0;
  done = false;
  data: any = {};
  last: Pat = 'hover';
  get showBar() {
    return this.pat !== 'enter' && !this.done;
  }
  get gone() {
    return this.done;
  }
  constructor(private g: Game) {
    super();
    const st = ENEMY.bellmother;
    this.hp = this.maxHp = st.hp;
    this.atk = st.atk;
    this.def = st.def;
    this.touchDmg = st.atk;
    this.hostile = true;
    this.whipTarget = true;
    this.hw = 20;
    this.hh = 24;
    this.x = g.room.W / 2;
    this.y = -80;
    this.sprite = new Sprite(g.sheets.bellmother, g.view.sprites, 11);
  }
  get floorY() {
    return this.g.room.H - 32;
  }
  set(p: Pat) {
    this.pat = p;
    this.pt = 0;
    this.data = {};
  }
  next() {
    const harpies = this.g.ents.filter((e) => e instanceof Harpy && !e.dead).length;
    if (this.phase === 2 && harpies === 0 && this.last !== 'summon' && Math.random() < 0.35) return this.pick('summon');
    const opts: Pat[] = ['swoop', 'feathers', 'toll', 'swoop', 'feathers'];
    let n: Pat;
    do n = opts[Math.floor(Math.random() * opts.length)];
    while (n === this.last && Math.random() < 0.8);
    this.pick(n);
  }
  pick(p: Pat) {
    this.last = p;
    this.set(p);
  }
  /** Steer toward a point with a little inertia (damped, so she settles instead of circling). */
  steer(tx: number, ty: number, max: number, acc = 0.12) {
    this.vx = clamp((this.vx + Math.sign(tx - this.x) * acc) * 0.94, -max, max);
    this.vy = clamp((this.vy + Math.sign(ty - this.y) * acc) * 0.94, -max, max);
    if (Math.abs(tx - this.x) < 12) this.vx *= 0.85;
    if (Math.abs(ty - this.y) < 12) this.vy *= 0.85;
    this.x += this.vx;
    this.y += this.vy;
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, A = g.sheets.bellmother.anims, s = this.sprite!;
    const W = g.room.W;
    const fast = this.phase === 2 ? 1.25 : 1;
    let frame = A.fly[Math.floor(g.frame / 7) % 4];
    switch (this.pat) {
      case 'enter':
        this.y += (110 - this.y) * 0.03;
        if (this.pt === 40) {
          g.audio.play('screech');
          g.shake(4, 60);
        }
        if (this.pt === 80) g.bossIntro();
        if (this.pt > 100 && this.pt < 230) {
          const a = (this.pt - 100) * 0.05;
          this.steer(W / 2 + Math.sin(a) * (W / 2 - 90), 100 + Math.sin(a * 2) * 34, 3, 0.2);
          this.facing = this.vx < 0 ? -1 : 1;
        }
        if (this.pt === 240) {
          // a single toll of her bell
          g.audio.play('toll');
          g.shake(4, 50);
          frame = A.cast[0];
        }
        if (this.pt > 240 && this.pt <= 280) frame = A.cast[0]; // held for the freeze frame
        if (this.pt === 280) g.bossTalk();
        if (this.pt > 280) this.pick('hover');
        break;
      case 'hover': {
        const tx = clamp(p.x + Math.sin(this.pt * 0.02) * 140, 60, W - 60), ty = 100 + Math.sin(this.pt * 0.05) * 16;
        this.steer(tx, ty, 2 * fast);
        this.facing = p.x < this.x ? -1 : 1;
        if (this.pt > (this.phase === 2 ? 70 : 100)) this.next();
        break;
      }
      case 'swoop': {
        const d = this.data;
        if (this.pt === 1) {
          d.side = p.x < W / 2 ? 1 : -1; // start on the side away from the hunter
          d.sx = d.side > 0 ? W - 60 : 60;
        }
        if (this.pt < 60) {
          this.steer(d.sx, 90, 4);
          this.facing = -d.side;
          if (this.pt === 40) g.audio.play('screech');
        } else {
          if (this.pt === 60) {
            d.x0 = this.x;
            d.y0 = this.y;
            d.low = clamp(p.y - 4, 140, this.floorY - 26); // dives to your height
            d.len = 80 / fast;
          }
          const t = Math.min(1, (this.pt - 60) / d.len);
          const x1 = d.side > 0 ? 60 : W - 60;
          this.x = d.x0 + (x1 - d.x0) * t;
          this.y = d.y0 + (d.low - d.y0) * Math.sin(t * Math.PI);
          frame = A.dive[0];
          if (this.pt % 4 === 0) g.fx.burst(this.x - this.facing * 20, this.y, 'smoke', 1, 6, { life: 20, fade: true });
          if (t >= 1) this.pick('hover');
        }
        break;
      }
      case 'feathers': {
        this.steer(clamp(p.x, 80, W - 80), 80, 2.4);
        this.facing = p.x < this.x ? -1 : 1;
        frame = A.cast[0];
        const every = this.phase === 2 ? 26 : 34;
        if (this.pt % every === 0 && this.pt <= every * 3) {
          const base = Math.atan2(p.y - this.y, p.x - this.x);
          const n = this.phase === 2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.22;
            g.spawn(new EnemyShot(g, this.x, this.y + 6, Math.cos(a) * 2.6, Math.sin(a) * 2.6, 'feather', 16));
          }
          g.audio.play('harpy');
        }
        if (this.pt > every * 3 + 30) this.pick('hover');
        break;
      }
      case 'toll': {
        this.steer(W / 2, 70, 3);
        frame = A.cast[0];
        s.glow = this.pt < 50 ? (this.pt / 50) * 0.6 : 0.2;
        const rings = this.phase === 2 ? 2 : 1;
        for (let k = 0; k < rings; k++) {
          if (this.pt === 50 + k * 70) {
            g.audio.play('toll');
            g.shake(6, 50);
            g.fadeFlash = 8;
            g.spawn(new Shockwave(g, 28, this.floorY, 2.3 * fast, 18, 400));
            g.spawn(new Shockwave(g, W - 28, this.floorY, -2.3 * fast, 18, 400));
            if (this.phase === 2) for (let i = 0; i < 5; i++) g.spawn(new EnemyShot(g, rand(40, W - 40), 24 + rand(0, 20), 0, 0.5, 'rock', 16, 0.14));
          }
        }
        if (this.pt > 50 + rings * 70 + 30) this.pick('hover');
        break;
      }
      case 'rage':
        // her second wind (a scene): she rises to the middle of the belfry, shrieks, then
        // throws herself against the great bell twice. It ends frozen on her, mid-toll
        this.steer(W / 2, 80, 2.5);
        this.facing = p.x < this.x ? -1 : 1;
        frame = this.pt < 50 ? A.fly[Math.floor(g.frame / 5) % 4] : A.cast[0];
        if (this.pt === 30) {
          g.audio.play('screech');
          g.shake(5, 40);
          g.fadeFlash = 12;
        }
        if (this.pt === 60 || this.pt === 95) {
          g.audio.play('toll');
          g.shake(6, 40);
          this.flashT = 10;
          g.fx.burst(this.x, this.y - 10, 'spark', 6, 16, { speed: 2, life: 26 });
        }
        s.glow = this.pt > 50 ? 0.5 : 0;
        if (this.pt === 110) g.bossTalk('boss_bellmother_phase2');
        if (this.pt > 110) this.pick('summon');
        break;
      case 'summon':
        this.steer(W / 2, 90, 2);
        frame = A.cast[0];
        if (this.pt === 20) g.audio.play('screech');
        if (this.pt === 50)
          for (const x of [60, W - 60]) {
            g.spawn(new Harpy(g, 'harpy', x, 60));
            g.fx.burst(x, 60, 'smoke', 4, 10, { vy: -0.4, fps: 8, life: 40 });
          }
        if (this.pt > 80) this.pick('hover');
        break;
      case 'dying': {
        this.deathT++;
        this.y = Math.min(this.floorY - 20, this.y + 0.8);
        frame = A.dive[0];
        s.mesh.rotation.z = Math.sin(this.deathT * 0.3) * 0.2;
        if (this.deathT % 7 === 0) {
          g.fx.burst(this.x + rand(-24, 24), this.y + rand(-24, 24), 'burst', 2, 8, { fps: 10 });
          g.fx.burst(this.x, this.y, 'smoke', 2, 16, { vy: 0.8, life: 40, fade: true }); // falling feathers
          g.audio.play('explode');
          g.shake(3, 8);
        }
        s.opacity = Math.max(0, 1 - this.deathT / 160);
        if (this.deathT === 160) {
          g.audio.play('toll');
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
    this.x = clamp(this.x, 24, W - 24);
    s.setFrame(frame);
    s.place(this.x, this.y, this.facing < 0);
    s.flash = this.flashT > 0 ? (this.flashT % 4 < 2 ? 0.9 : 0.4) : 0;
    if (this.phase === 2) s.tint(1.2, 0.9, 0.85);
    if (this.pat !== 'toll' && this.pat !== 'rage') s.glow = 0;
  }

  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    if (this.pat === 'dying' || this.pat === 'enter' || this.pat === 'rage') return;
    this.hp -= dmg;
    this.flashT = 8;
    g.damageNumber(this.x, this.y - this.hh - 8, dmg, crit ? '#ffe040' : '#ffffff');
    g.audio.play('bossHit');
    g.fx.burst(this.x + sign(fromX - this.x) * 12, this.y, 'spark', 1, 4);
    if (kind === 'whip') g.hitstop(4);
    if (this.phase === 1 && this.hp > 0 && this.hp <= this.maxHp / 2) {
      // half dead, she rages: a scene (see 'rage'), then she calls her daughters
      this.phase = 2;
      for (const e of g.ents) if (e instanceof EnemyShot || e instanceof Shockwave) e.dead = true;
      g.bossScene();
      this.pick('rage');
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.set('dying');
      this.hostile = false;
      this.whipTarget = false;
      g.music.stop(1.5);
      g.audio.play('screech');
      for (const e of g.ents) if (e instanceof EnemyShot || e instanceof Shockwave || e instanceof Harpy) e.dead = true;
    }
  }
}
