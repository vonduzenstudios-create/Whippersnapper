// The Ossuary Wyrm: a segmented bone serpent that burrows through the arena walls.
import { Sprite } from '../gfx/view';
import { Ent, HitKind, Boss } from './ent';
import type { Game } from './game';
import { ENEMY } from './data';
import { rand, clamp, pointInBox } from '../core/util';
import { EnemyShot } from './objects';
import type { Box } from '../core/util';

const SEGS = 15;
const GAP0 = 30;
const GAP = 17;

type Pattern = 'enter' | 'lunge' | 'weave' | 'rain' | 'coil' | 'perch' | 'retreat' | 'ignite' | 'dying' | 'gone';

export class Wyrm extends Ent implements Boss {
  label = 'WYRM';
  get showBar() {
    return this.pat !== 'gone' && this.pat !== 'enter';
  }
  get gone() {
    return this.pat === 'gone';
  }
  hp: number;
  maxHp: number;
  atk: number;
  hx: number;
  hy: number;
  dir = Math.PI;
  trail: { x: number; y: number }[] = [];
  segs: { x: number; y: number; a: number; s: Sprite; r: number }[] = [];
  head: Sprite;
  pat: Pattern = 'enter';
  pt = 0;
  phase = 1;
  flashT = 0;
  jaw = 0;
  hitSeg = -1;
  lastPats: Pattern[] = [];
  side = 1;
  data: any = {};
  deathT = 0;
  constructor(private g: Game) {
    super();
    const st = ENEMY.wyrm;
    this.hp = this.maxHp = st.hp;
    this.atk = st.atk;
    this.def = st.def;
    this.touchDmg = st.atk;
    this.whipTarget = true;
    this.hostile = true;
    const W = g.room.W;
    this.hx = W + 80;
    this.hy = 300;
    // trail seeded far outside the right wall
    for (let i = 0; i < 400; i++) this.trail.push({ x: W + 80 + (400 - i) * 2, y: 300 });
    const sh = g.sheets.wyrm;
    for (let i = 0; i < SEGS; i++) {
      const s = new Sprite(sh, g.view.sprites, 5);
      const last = i === SEGS - 1;
      s.setFrame(last ? sh.anims.tail[0] : sh.anims.vert[i % 3 === 0 ? 0 : 1]);
      const sc = last ? 1 : 1 - i * 0.035;
      s.mesh.scale.set(sh.cw * sc, sh.ch * sc, 1);
      this.segs.push({ x: this.hx, y: this.hy, a: 0, s, r: last ? 8 : 12 * sc });
    }
    this.head = new Sprite(sh, g.view.sprites, 5);
    this.x = this.hx;
    this.y = this.hy;
    this.hw = 22;
    this.hh = 14;
  }

  get W() {
    return this.g.room.W;
  }
  get H() {
    return this.g.room.H;
  }

  setPat(p: Pattern) {
    this.pat = p;
    this.pt = 0;
    this.data = {};
    this.lastPats.push(p);
    if (this.lastPats.length > 3) this.lastPats.shift();
  }

  nextPattern() {
    const opts: Pattern[] = this.phase === 1 ? ['lunge', 'weave', 'rain', 'lunge', 'coil'] : ['lunge', 'perch', 'coil', 'lunge', 'rain', 'perch', 'weave'];
    let p: Pattern;
    let guard = 0;
    do {
      p = opts[Math.floor(Math.random() * opts.length)];
      guard++;
    } while (guard < 10 && this.lastPats[this.lastPats.length - 1] === p);
    this.setPat(p);
  }

  moveToward(tx: number, ty: number, speed: number, turn = 0.08) {
    const want = Math.atan2(ty - this.hy, tx - this.hx);
    let d = want - this.dir;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.dir += clamp(d, -turn, turn);
    this.hx += Math.cos(this.dir) * speed;
    this.hy += Math.sin(this.dir) * speed;
  }

  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player;
    const W = this.W, H = this.H;
    const floor = H - 32;
    const spd = this.phase === 2 ? 1.25 : 1;
    this.jaw = Math.max(0, this.jaw - 0.05);

    switch (this.pat) {
      case 'enter': {
        if (this.pt < 70) {
          if (this.pt % 6 === 0) {
            g.fx.burst(W - 20, 300 + rand(-20, 20), 'dust', 2, 6, { vx: -1 });
            g.shake(2, 6);
          }
          if (this.pt === 1) g.audio.play('crumble');
        } else if (this.pt < 140) {
          this.moveToward(W - 220, 260, 3, 0.1);
        } else if (this.pt === 140) {
          g.audio.play('roar');
          g.shake(5, 50);
          this.jaw = 1.2;
          g.bossIntro();
        } else if (this.pt > 200) this.nextPattern();
        else this.moveToward(W - 240 + Math.sin(this.pt * 0.1) * 20, 250, 1, 0.1);
        break;
      }
      case 'lunge': {
        const d = this.data;
        if (this.pt === 1) {
          // relocate inside a side wall at the player's height
          this.side = p.x < W / 2 ? 1 : -1;
          d.y = clamp(p.y - 10, 120, floor - 30);
          this.hx = this.side > 0 ? W + 70 : -70;
          this.hy = d.y;
          this.dir = this.side > 0 ? Math.PI : 0;
          this.resetTrail();
          g.audio.play('crumble');
        }
        if (this.pt < 45) {
          if (this.pt % 5 === 0) g.fx.burst(this.side > 0 ? W - 14 : 14, d.y + rand(-10, 10), 'dust', 2, 4, { vx: -this.side });
          if (this.pt % 10 === 0) g.shake(1.5, 6);
        } else {
          if (this.pt === 45) {
            g.audio.play('roar');
            this.jaw = 1;
          }
          const sp = 4.6 * spd;
          this.hx += Math.cos(this.dir) * sp;
          // slight homing early on
          if (Math.abs(this.hx - (this.side > 0 ? W : 0)) < W * 0.4) this.hy += clamp(p.y - 10 - this.hy, -0.8, 0.8);
          this.jaw = Math.max(this.jaw, 0.6);
          if (this.side > 0 ? this.hx < -160 : this.hx > W + 160) {
            if (this.trailClear()) this.nextPattern();
          }
        }
        break;
      }
      case 'weave': {
        const d = this.data;
        if (this.pt === 1) {
          this.side = Math.random() < 0.5 ? 1 : -1;
          this.hx = this.side > 0 ? -70 : W + 70;
          this.hy = 140;
          this.dir = this.side > 0 ? 0 : Math.PI;
          this.resetTrail();
          d.base = rand(170, 260);
        }
        const sp = 2.6 * spd;
        const ny = d.base + Math.sin((this.hx / W) * Math.PI * 3) * 90;
        this.moveToward(this.hx + this.side * 40, ny, sp, 0.09);
        if (this.pt % 70 === 35 && this.phase === 2) this.breathe(1);
        if (this.side > 0 ? this.hx > W + 160 : this.hx < -160) {
          if (this.trailClear()) this.nextPattern();
        }
        break;
      }
      case 'rain': {
        const d = this.data;
        if (this.pt === 1) {
          d.x = clamp(p.x + rand(-80, 80), 120, W - 120);
          this.hx = d.x;
          this.hy = -60;
          this.dir = Math.PI / 2;
          this.resetTrail(-1);
        }
        if (this.pt < 50) this.moveToward(d.x, 80, 2.2, 0.1);
        else if (this.pt < 170) {
          this.hx += Math.sin(this.pt * 0.05) * 0.6;
          this.dir = Math.PI / 2 + Math.sin(this.pt * 0.05) * 0.3;
          if (this.pt === 56) {
            g.audio.play('roar');
            g.shake(4, 40);
            this.jaw = 1.2;
          }
          if (this.pt > 60 && this.pt % (this.phase === 2 ? 9 : 13) === 0) {
            const bx = rand(32, W - 32);
            g.spawn(new EnemyShot(g, bx, 24, 0, 0.5, 'bone', 14, 0.12));
            g.fx.burst(bx, 20, 'dust', 1, 4);
          }
        } else {
          this.dir = -Math.PI / 2;
          this.hy -= 2.5;
          if (this.hy < -160 && this.trailClear()) this.nextPattern();
        }
        break;
      }
      case 'coil': {
        const d = this.data;
        if (this.pt === 1) {
          this.side = Math.random() < 0.5 ? 1 : -1;
          this.hx = this.side > 0 ? -70 : W + 70;
          this.hy = floor - 120;
          this.dir = this.side > 0 ? 0 : Math.PI;
          this.resetTrail();
          d.cx = W / 2;
          d.cy = floor - 140;
          d.ang = this.side > 0 ? Math.PI : 0;
        }
        if (this.pt < 360) {
          d.ang += 0.022 * this.side * spd;
          const tx = d.cx + Math.cos(d.ang) * 170, ty = d.cy + Math.sin(d.ang) * 105;
          this.moveToward(tx, ty, 3.2 * spd, 0.12);
          if (this.pt % 80 === 40) this.spitAt(p.x, p.y);
        } else {
          this.moveToward(this.side > 0 ? W + 300 : -300, d.cy, 3.5, 0.06);
          if ((this.hx < -150 || this.hx > W + 150) && this.trailClear()) this.nextPattern();
        }
        break;
      }
      case 'perch': {
        const d = this.data;
        if (this.pt === 1) {
          d.x = [14, 24, 34][Math.floor(Math.random() * 3)] * 16 + 8;
          this.hx = d.x;
          this.hy = -70;
          this.dir = Math.PI / 2;
          this.resetTrail(-1);
        }
        if (this.pt < 50) this.moveToward(d.x, 56, 2.4, 0.1);
        else if (this.pt < 230) {
          // sweeping fire breath down at the arena
          const sweep = Math.sin((this.pt - 50) * 0.03);
          this.dir = Math.PI / 2 + sweep * 0.9;
          this.hx = d.x + sweep * 10;
          if (this.pt === 60) {
            g.audio.play('roar');
            this.jaw = 1.2;
          }
          if (this.pt > 80 && this.pt < 200 && this.pt % 5 === 0) {
            this.jaw = 1.1;
            this.breathe(0);
            if (this.pt % 20 === 0) g.audio.play('breath');
          }
        } else {
          this.dir = -Math.PI / 2;
          this.hy -= 2.5;
          if (this.hy < -160 && this.trailClear()) this.nextPattern();
        }
        break;
      }
      case 'retreat': {
        // Phase change, part 1: shriek, then flee off screen along the current heading.
        // Only once the whole body is out of view does 'ignite' bring it back burning.
        const d = this.data;
        if (this.pt === 1) {
          // keep going the way it was already heading: sideways patterns exit through
          // a side wall, the ceiling patterns (rain/perch) back up into the ceiling
          d.horiz = Math.abs(Math.cos(this.dir)) > 0.5;
          d.side = Math.cos(this.dir) >= 0 ? 1 : -1;
          g.audio.play('screech');
          g.shake(7, 110);
          g.fadeFlash = 18;
          this.jaw = 1.3;
          this.flashT = 30;
          for (const e of g.ents) if (e instanceof EnemyShot) e.dead = true;
          g.message('THE WYRM SHRIEKS IN AGONY!', 140);
        }
        // writhe in place for a moment, then bolt
        if (this.pt < 50) {
          this.jaw = Math.max(this.jaw, 1);
          this.dir += Math.sin(this.pt * 0.4) * 0.06;
          this.hx += Math.cos(this.dir) * 0.6;
          this.hy += Math.sin(this.dir) * 0.6;
          if (this.pt % 6 === 0) {
            const s = this.segs[Math.floor(Math.random() * SEGS)];
            if (!this.hidden(s.x, s.y)) g.fx.burst(s.x, s.y, 'ember', 3, 6, { speed: 2, grav: 0.05, life: 30 });
          }
        } else {
          const tx = d.horiz ? (d.side > 0 ? W + 400 : -400) : this.hx;
          const ty = d.horiz ? this.hy : -400;
          this.moveToward(tx, ty, 5, 0.07);
          if (this.trailClear() || this.pt > 600) this.setPat('ignite');
        }
        break;
      }
      case 'ignite': {
        if (this.pt === 1) {
          this.hx = W / 2;
          this.hy = -70;
          this.dir = Math.PI / 2;
          this.resetTrail(-1);
        }
        if (this.pt < 60) this.moveToward(W / 2, 120, 2.5, 0.1);
        else if (this.pt === 60) {
          g.audio.play('roar');
          g.audio.play('fire');
          g.shake(6, 70);
          this.jaw = 1.3;
          g.message('THE WYRM IGNITES!', 120);
          for (const s of this.segs) g.fx.burst(s.x, s.y, 'fire', 2, 8, { sheet: 'fire', life: 30 });
        } else if (this.pt < 140) {
          this.dir = Math.PI / 2 + Math.sin(this.pt * 0.2) * 0.2;
        } else {
          this.dir = -Math.PI / 2;
          this.hy -= 3;
          if (this.hy < -160 && this.trailClear()) this.nextPattern();
        }
        break;
      }
      case 'dying': {
        this.deathT++;
        this.hx += Math.sin(this.deathT * 0.5) * 1.5;
        this.hy += 0.2;
        const k = Math.floor(this.deathT / 9);
        if (this.deathT % 9 === 0) {
          const i = SEGS - k; // k starts at 1, so the tail (SEGS - 1) blows up first
          if (i >= 0) {
            const s = this.segs[i];
            s.s.visible = false;
            g.fx.burst(s.x, s.y, 'burst', 2, 10, { fps: 10 });
            g.fx.burst(s.x, s.y, 'fire', 2, 10, { sheet: 'fire', life: 30 });
            g.audio.play('explode');
            g.shake(4, 10);
          } else if (i === -2) {
            this.head.visible = false;
            g.fx.burst(this.hx, this.hy, 'burst', 6, 24, { fps: 8 });
            g.fx.burst(this.hx, this.hy, 'smoke', 10, 30, { vy: -0.6, fps: 6, life: 70 });
            g.fx.burst(this.hx, this.hy, 'ember', 30, 10, { speed: 3.5, grav: 0.06, life: 70 });
            g.audio.play('explode');
            g.audio.play('roar');
            g.shake(8, 60);
            g.flashWhite = 20;
          } else if (i < -10) {
            // make sure nothing of the body is left on screen, then remove the boss
            for (const s of this.segs) s.s.visible = false;
            this.head.visible = false;
            this.pat = 'gone';
            this.dead = true;
            g.onBossDefeated();
            return;
          }
        }
        this.render();
        return;
      }
      case 'gone':
        return;
    }

    // trail bookkeeping
    const last = this.trail[this.trail.length - 1];
    if (Math.hypot(this.hx - last.x, this.hy - last.y) > 1.5) {
      this.trail.push({ x: this.hx, y: this.hy });
      if (this.trail.length > 600) this.trail.shift();
    }
    this.layoutSegments();
    this.x = this.hx + Math.cos(this.dir) * 12;
    this.y = this.hy;
    if (this.phase === 2 && this.pt % 3 === 0) {
      const s = this.segs[Math.floor(Math.random() * SEGS)];
      if (!this.hidden(s.x, s.y)) g.fx.burst(s.x + rand(-6, 6), s.y + rand(-6, 6), 'ember', 1, 0, { vy: -0.8, life: 30 });
    }
    this.render();
  }

  breathe(mode: number) {
    const g = this.g;
    const a = this.dir + (mode ? rand(-0.15, 0.15) : rand(-0.08, 0.08));
    const mx = this.hx + Math.cos(this.dir) * 30, my = this.hy + Math.sin(this.dir) * 30;
    const shot = new EnemyShot(g, mx, my, Math.cos(a) * 3.4, Math.sin(a) * 3.4, 'bigfire', 18, 0.02);
    g.spawn(shot);
  }

  spitAt(tx: number, ty: number) {
    const g = this.g;
    const a = Math.atan2(ty - this.hy, tx - this.hx);
    const mx = this.hx + Math.cos(this.dir) * 26, my = this.hy + Math.sin(this.dir) * 26;
    const n = this.phase === 2 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const aa = a + (i - (n - 1) / 2) * 0.25;
      g.spawn(new EnemyShot(g, mx, my, Math.cos(aa) * 2.6, Math.sin(aa) * 2.6, 'fireball', 16));
    }
    this.jaw = 1;
    g.audio.play('spit');
  }

  resetTrail(vertical = 0) {
    // lay the body straight behind the head, out of sight in the wall/ceiling
    this.trail = [];
    const bx = vertical ? 0 : -Math.cos(this.dir), by = vertical ? -1 : -Math.sin(this.dir);
    for (let i = 300; i > 0; i--) this.trail.push({ x: this.hx + bx * i * 2, y: this.hy + by * i * 2 });
    this.trail.push({ x: this.hx, y: this.hy });
  }

  /** True once every segment is out of view, so the next pattern can teleport. */
  trailClear() {
    for (const s of this.segs) if (s.x > -40 && s.x < this.W + 40 && s.y > -40 && s.y < this.H + 40) return false;
    return true;
  }

  layoutSegments() {
    let idx = this.trail.length - 1;
    let px = this.hx, py = this.hy;
    let need = GAP0;
    for (let i = 0; i < SEGS; i++) {
      let acc = 0;
      let cx = px, cy = py;
      while (idx > 0) {
        const t = this.trail[idx - 1];
        const d = Math.hypot(t.x - cx, t.y - cy);
        if (acc + d >= need) {
          const f = (need - acc) / d;
          cx += (t.x - cx) * f;
          cy += (t.y - cy) * f;
          acc = need;
          break;
        }
        acc += d;
        cx = t.x;
        cy = t.y;
        idx--;
      }
      const s = this.segs[i];
      s.a = Math.atan2(py - cy, px - cx);
      s.x = cx;
      s.y = cy;
      px = cx;
      py = cy;
      need = GAP;
    }
  }

  hidden(x: number, y: number) {
    const r = this.g.room;
    return x < 4 || x > r.W - 4 || y < 4 || y > r.H - 4 || r.solidPx(x, y);
  }

  render() {
    const sh = this.g.sheets.wyrm;
    const burn = this.phase === 2;
    const fl = this.flashT > 0 ? (this.flashT % 4 < 2 ? 0.9 : 0.3) : 0;
    for (let i = 0; i < SEGS; i++) {
      const s = this.segs[i];
      if (this.pat !== 'dying' || s.s.visible) s.s.visible = true;
      s.s.place(s.x, s.y);
      s.s.mesh.rotation.z = -s.a;
      s.s.flash = this.hitSeg === i ? fl : fl * 0.3;
      if (burn) s.s.tint(1.25, 0.8, 0.6);
    }
    const flip = Math.cos(this.dir) < 0;
    const f = sh.anims.skull[this.jaw > 0.9 ? 2 : this.jaw > 0.3 ? 1 : 0];
    this.head.setFrame(f);
    this.head.place(this.hx, this.hy, flip);
    this.head.mesh.rotation.z = flip ? -(this.dir - Math.PI) : -this.dir;
    this.head.flash = this.hitSeg === -1 ? fl : 0;
    if (burn) {
      this.head.tint(1.3, 0.85, 0.65);
      this.head.glow = 0.15;
    }
  }

  // ------------------------------------------------------------- hits

  vulnerable() {
    return this.pat !== 'dying' && this.pat !== 'gone' && this.pat !== 'enter' && this.pat !== 'retreat';
  }

  /** Returns true if (x,y) with radius r touches a visible part; records which. */
  hitAt(x: number, y: number, r: number) {
    if (!this.vulnerable()) return false;
    if (!this.hidden(this.hx, this.hy) && Math.hypot(x - (this.hx + Math.cos(this.dir) * 8), y - this.hy) < 20 + r) {
      this.hitSeg = -1;
      return true;
    }
    for (let i = 0; i < SEGS; i++) {
      const s = this.segs[i];
      if (this.hidden(s.x, s.y)) continue;
      if (Math.hypot(x - s.x, y - s.y) < s.r + r) {
        this.hitSeg = i;
        return true;
      }
    }
    return false;
  }
  hitBox(b: Box) {
    if (!this.vulnerable()) return false;
    if (!this.hidden(this.hx, this.hy) && pointInBox(this.hx, this.hy, b, 18)) {
      this.hitSeg = -1;
      return true;
    }
    for (let i = 0; i < SEGS; i++) {
      const s = this.segs[i];
      if (!this.hidden(s.x, s.y) && pointInBox(s.x, s.y, b, s.r)) {
        this.hitSeg = i;
        return true;
      }
    }
    return false;
  }
  touches(p: Box) {
    if (this.pat === 'dying' || this.pat === 'gone') return false;
    if (!this.hidden(this.hx, this.hy) && pointInBox(this.hx, this.hy, p, 16)) return true;
    for (const s of this.segs) if (!this.hidden(s.x, s.y) && pointInBox(s.x, s.y, p, s.r * 0.8)) return true;
    return false;
  }

  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    const head = this.hitSeg === -1;
    const tail = this.hitSeg === SEGS - 1;
    if (tail) {
      g.audio.play('clink');
      g.fx.burst(this.segs[SEGS - 1].x, this.segs[SEGS - 1].y, 'spark', 1);
      return;
    }
    const real = head ? dmg : Math.max(1, Math.round(dmg * 0.3));
    this.hp -= real;
    this.flashT = 10;
    const px = head ? this.hx : this.segs[this.hitSeg].x, py = head ? this.hy : this.segs[this.hitSeg].y;
    g.damageNumber(px, py - 16, real, crit ? '#ffe040' : head ? '#ffffff' : '#b0a890');
    g.audio.play(head ? 'bossHit' : 'hit');
    g.fx.burst(px, py, 'spark', 1, 4);
    if (kind === 'whip') g.hitstop(head ? 5 : 2);
    if (head) g.shake(2, 6);
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      this.setPat('retreat'); // shriek and flee off screen, then 'ignite'
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.pat = 'dying';
      this.deathT = 0;
      this.hostile = false;
      this.whipTarget = false;
      g.audio.play('roar');
      g.music.stop(1.5);
      for (const e of g.ents) if (e instanceof EnemyShot) e.dead = true;
    }
  }

  destroy() {
    for (const s of this.segs) s.s.dispose();
    this.head.dispose();
  }
}
