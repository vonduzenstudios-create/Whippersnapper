// The Sump Leviathan (the Black Cistern). An armored eel in a pool it keeps full.
//
// Part one: drain it. Two sluice wheels hang on the walls. Three whip strokes open one; with
// both open the pool empties, and the beast lies stranded with its belly up: strike it. It
// drags itself to the flood valve, the pool refills, and the wheels are somewhere harder to
// reach. Three drains.
//
// Part two (a scene): it smashes both wheels and floods the cistern nearly to the roof, for
// good. A broken harpoon stands in its back with a ring on the shaft. Catch the ring with the
// whip and you ride it: LEFT/RIGHT/UP/DOWN lean it where you want, JUMP lets go. Drive it
// head-first into the three spike racks (one on each wall, one in the roof) to finish it.
import { Sprite } from '../gfx/view';
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import { BossBase, Target, SEG, prop } from './boss_base';
import { EnemyShot } from './objects';
import { clamp, rand } from '../core/util';
import { TILE } from '../config';

const SEGS = 8; // body segments behind the head
const GAP = 11; // trail steps between segments
const FULL = 14 * TILE + 4; // the pool's surface while it's full (part one)
const DEEP = 8 * TILE + 4; // ...and after it floods the room for good (part two)
const WHEEL_TURNS = 3; // whip strokes to open a wheel

interface Wheel {
  s: Sprite;
  x: number;
  y: number;
  turns: number;
  spin: number;
}
interface Rack {
  s: Sprite;
  x: number;
  y: number;
  broken: boolean;
}

/** Where the two wheels hang in each of the three rounds (tile coordinates): each round one is harder to reach. */
const WHEEL_SPOTS: [number, number][][] = [
  [[4, 11], [43, 11]],
  [[4, 11], [44, 4]],
  [[5, 22], [44, 4]],
];

export class Leviathan extends BossBase {
  label = 'LEVIATHAN';
  segs: Sprite[] = [];
  harpoon: Sprite;
  trail: { x: number; y: number }[] = [];
  mouth = 0;
  wheels: Wheel[] = [];
  racks: Rack[] = [];
  round = 0;
  /** The surface right now, and where it's heading (pixels). */
  level = FULL;
  want = FULL;
  heading = 0; // radians: the way it swims while ridden
  /** The point on its harpoon the hero hangs from (Player.mount reads it every frame). */
  ring = { x: 0, y: 0, release: () => this.thrown() };
  riding = false;
  constructor(g: Game) {
    super(g, 'leviathan', g.sheets.leviathan, 26, 18, 11);
    const A = g.sheets.leviathan.anims, W = g.room.W;
    for (let i = 0; i < SEGS; i++) {
      const s = new Sprite(g.sheets.leviathan, g.view.sprites, 10);
      s.setFrame(i === SEGS - 1 ? A.tail[0] : A.seg[i > 4 ? 2 : i % 2]);
      this.segs.push(s);
    }
    this.harpoon = new Sprite(g.sheets.leviathan, g.view.sprites, 9);
    this.harpoon.setFrame(A.harpoon[0]);
    this.x = W / 2;
    this.y = g.room.H + 80;
    for (let i = 0; i < SEGS * GAP + 2; i++) this.trail.push({ x: this.x, y: this.y + i * 3 });
    for (let i = 0; i < 2; i++) {
      const s = prop(g, 'props', 'wheel', 0, 0, 7);
      this.props.push(s);
      this.wheels.push({ s, x: 0, y: 0, turns: 0, spin: 0 });
    }
    for (const [x, y] of [[26, 330], [W - 26, 330], [W / 2, 40]]) {
      const s = prop(g, 'props', 'rack', x, y, 7);
      if (x > W / 2) s.place(x, y, true);
      if (y < 100) s.mesh.rotation.z = -Math.PI / 2; // the roof rack points down
      s.visible = false;
      this.props.push(s);
      this.racks.push({ s, x, y, broken: false });
    }
    this.placeWheels();
    g.tideHold = true;
    g.setWater(this.level);
  }
  placeWheels() {
    const spots = WHEEL_SPOTS[Math.min(this.round, 2)];
    this.wheels.forEach((w, i) => {
      w.x = spots[i][0] * TILE + 8;
      w.y = spots[i][1] * TILE + 8;
      w.turns = 0;
    });
  }
  get stranded() {
    return this.level >= this.floorY - 20;
  }
  /** The head and every other body segment, as circles. */
  body(): [number, number, number][] {
    const out: [number, number, number][] = [[this.x, this.y, 20]];
    for (let i = 0; i < SEGS - 1; i += 2) {
      const t = this.trail[(i + 1) * GAP];
      out.push([t.x, t.y, 16]);
    }
    return out;
  }
  targets(): Target[] {
    const out: Target[] = [];
    if (this.phase === 1) this.wheels.forEach((w, i) => out.push({ id: 'wheel' + i, x: w.x, y: w.y, r: 18 }));
    else if (!this.riding) out.push({ id: 'ring', x: this.ring.x, y: this.ring.y, r: 16 });
    for (const [x, y, r] of this.body()) out.push({ id: 'body', x, y, r });
    return out;
  }
  hurtZones(): Target[] {
    // stranded or ridden, it can't bite
    if (this.pat === 'stranded' || this.riding) return [];
    return this.body().map(([x, y, r]) => ({ id: 'body', x, y, r: r - 6 }));
  }
  hitType(): DmgType {
    return this.pat === 'lunge' ? 'melee' : 'touch';
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id.startsWith('wheel')) {
      const w = this.wheels[Number(t.id.slice(5))];
      if (w.turns >= WHEEL_TURNS || this.pat === 'stranded' || this.pat === 'flood') return;
      w.turns++;
      w.spin = 20;
      g.audio.play('creak');
      g.fx.burst(w.x, w.y, 'spark', 2, 10);
      if (w.turns === WHEEL_TURNS) {
        g.audio.play('lever');
        g.message(this.wheels.every((x) => x.turns >= WHEEL_TURNS) ? 'THE SLUICES ROAR OPEN' : 'ONE SLUICE STANDS OPEN', 120);
      }
    } else if (t.id === 'ring') {
      // caught the harpoon's ring: she's riding it now
      if (!g.hunter.grapple) return this.clank(g, t.x, t.y);
      this.riding = true;
      this.heading = this.facing > 0 ? 0 : Math.PI;
      g.player.mount = this.ring;
      g.audio.play('grapple');
      g.message('LEAN IT INTO THE SPIKES', 150);
      this.pick('ridden');
    } else if (this.pat === 'stranded') {
      if (this.strike(g, t.x, t.y, kind) && this.pat === 'stranded') this.pick('flood');
    } else this.clank(g, t.x, t.y);
  }
  /** She's off its back (she let go, or it rammed something). */
  thrown() {
    this.riding = false;
    if (this.pat === 'ridden') this.pick('cruise');
  }
  destroy() {
    super.destroy();
    for (const s of this.segs) s.dispose();
    this.harpoon.dispose();
    if (this.g.player.mount === this.ring) this.g.player.mount = null;
  }
  /** Swim toward a point, turning smoothly. */
  swimTo(tx: number, ty: number, speed: number, turn = 0.06) {
    const a = Math.atan2(ty - this.y, tx - this.x);
    this.vx += (Math.cos(a) * speed - this.vx) * turn;
    this.vy += (Math.sin(a) * speed - this.vy) * turn;
    this.x += this.vx;
    this.y += this.vy;
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, W = g.room.W, d = this.data;
    const fy = this.floorY;
    this.mouth = 0;
    // the water eases toward where it's meant to be
    if (this.level !== this.want) {
      this.level += clamp(this.want - this.level, -1.2, 1.2);
      if (g.frame % 4 === 0) g.fx.burst(rand(20, W - 20), this.level, 'splash', 1, 0, { life: 16 });
    }
    g.setWater(this.level);
    const opened = this.wheels.every((w) => w.turns >= WHEEL_TURNS);
    switch (this.pat) {
      case 'enter':
        // it rises out of the middle of the pool, roars, and sinks back
        if (this.pt < 90) this.swimTo(W / 2, this.level - 70, 2.4);
        else this.swimTo(W / 2 + 80, this.level + 40, 1.4);
        if (this.pt === 60) {
          g.audio.play('roar');
          g.shake(5, 50);
          g.bossIntro();
        }
        if (this.pt > 50 && this.pt < 120) this.mouth = 2;
        if (this.pt === 120) g.bossTalk();
        if (this.pt > 120) this.pick('hunt');
        break;
      case 'hunt': {
        // patrols under the surface; now and then it comes for her, or spits
        if (this.pt === 1) d.dir = this.x < W / 2 ? 1 : -1;
        if (this.x > W - 90) d.dir = -1;
        if (this.x < 90) d.dir = 1;
        const depth = clamp(this.level + 40 + Math.sin(this.pt * 0.05) * 16, 60, fy - 20);
        this.swimTo(this.x + d.dir * 90, depth, 1.9);
        if (opened) this.pick('drain');
        else if (this.pt > 150) this.pick(this.choose(['lunge', 'spit', 'lunge']));
        break;
      }
      case 'lunge': {
        // a long tell (it rears out of the water, jaws wide), then a straight dash through
        // the spot where she stood when it committed
        const tell = 46;
        if (this.pt < tell) {
          this.swimTo(clamp(p.x + (this.x < p.x ? -130 : 130), 60, W - 60), this.level - 6, 2);
          this.mouth = this.pt > 20 ? 2 : 1;
          this.facing = p.x < this.x ? -1 : 1;
          if (this.pt === 20) g.audio.play('roar');
        } else {
          if (this.pt === tell) {
            const a = Math.atan2(p.y - this.y, p.x - this.x);
            d.vx = Math.cos(a) * 5.2;
            d.vy = Math.sin(a) * 5.2;
            g.audio.play('bite');
          }
          this.vx = d.vx;
          this.vy = d.vy;
          this.x += this.vx;
          this.y += this.vy;
          this.mouth = 2;
          if (this.pt > tell + 44 || this.x < 30 || this.x > W - 30) this.pick('hunt');
        }
        if (opened && this.pt < tell) this.pick('drain');
        break;
      }
      case 'spit': {
        // lifts its head near a wheel she's working on and lobs brine at her
        this.swimTo(clamp(p.x + (p.x < W / 2 ? 150 : -150), 60, W - 60), this.level - 12, 2);
        this.mouth = this.pt > 40 ? 2 : 0;
        this.facing = p.x < this.x ? -1 : 1;
        if (this.pt === 50 || this.pt === 74) {
          const shot = new EnemyShot(g, this.x, this.y - 6, clamp((p.x - this.x) / 52, -4.5, 4.5), -4.4, 'rock', 14, 0.16);
          shot.sprite!.tint(0.6, 0.9, 1.4);
          g.spawn(shot);
          g.audio.play('spit');
        }
        if (this.pt > 100) this.pick('hunt');
        if (opened) this.pick('drain');
        break;
      }
      case 'drain':
        // the sluices are open: the pool runs out from under it
        if (this.pt === 1) {
          this.want = fy;
          g.audio.play('drain');
          g.shake(3, 60);
        }
        this.swimTo(W / 2, Math.min(fy - 22, this.level + 30), 1.6);
        this.mouth = 1;
        if (this.stranded) {
          this.windowDmg = 0;
          this.pick('stranded');
          g.message('IT IS STRANDED: STRIKE THE BELLY', 150);
        }
        break;
      case 'stranded':
        // on the bare floor, gasping. The window closes after one segment, or when it has
        // thrashed its way to the flood valve
        this.vy = Math.min(this.vy + 0.3, 5);
        this.y = Math.min(fy - 16, this.y + this.vy);
        this.vx *= 0.9;
        this.x = clamp(this.x + this.vx + Math.sin(this.pt * 0.22) * 0.9, 60, W - 60);
        this.mouth = Math.floor(this.pt / 14) % 2 ? 2 : 1;
        if (this.pt > 400) this.pick('flood');
        break;
      case 'flood':
        // it hauls the valve open: the water comes back, and the wheels are shut again
        this.mouth = 2;
        this.y = Math.min(fy - 16, this.y + 2);
        if (this.pt === 1) {
          g.audio.play('roar');
          g.shake(5, 40);
          if (this.hp <= this.maxHp / 2) {
            // three drains done: no more of that
            this.phase = 2;
            g.bossScene();
            return this.pick('rage');
          }
          this.round++;
          this.placeWheels();
          this.want = FULL;
          g.audio.play('tide');
        }
        if (this.level <= FULL + 2) this.pick('hunt');
        break;
      case 'rage':
        // the scene: it breaks both wheels and floods the cistern almost to the roof
        this.swimTo(W / 2, Math.min(this.level - 30, fy - 120), 2.2);
        this.mouth = 2;
        if (this.pt === 20) {
          this.want = DEEP;
          for (const w of this.wheels) {
            w.s.visible = false;
            g.fx.burst(w.x, w.y, 'rock', 8, 14, { speed: 3, grav: 0.15, life: 50, rot: 0.3 });
            g.fx.burst(w.x, w.y, 'burst', 3, 10);
          }
          for (const r of this.racks) r.s.visible = true;
          g.audio.play('explode');
          g.shake(7, 70);
        }
        if (this.pt === 150) g.bossTalk('boss_leviathan_phase2');
        if (this.pt > 150) this.pick('cruise');
        break;
      case 'cruise': {
        // part two, nobody on its back: it circles just under the surface, the harpoon's ring
        // riding above the water, and lunges at her if she takes too long
        const cx = W / 2 + Math.cos(this.pt * 0.012) * (W / 2 - 110);
        this.swimTo(cx, this.level + 22 + Math.sin(this.pt * 0.03) * 8, 1.7, 0.04);
        if (this.pt > 420) this.pick('lunge2');
        break;
      }
      case 'lunge2': {
        const tell = 50;
        if (this.pt < tell) {
          this.swimTo(clamp(p.x + (this.x < p.x ? -130 : 130), 60, W - 60), this.level - 4, 2);
          this.mouth = 2;
          this.facing = p.x < this.x ? -1 : 1;
          if (this.pt === 20) g.audio.play('roar');
        } else {
          if (this.pt === tell) {
            const a = Math.atan2(p.y - this.y, p.x - this.x);
            d.vx = Math.cos(a) * 5.4;
            d.vy = Math.sin(a) * 5.4;
          }
          this.x += this.vx = d.vx;
          this.y += this.vy = d.vy;
          this.mouth = 2;
          if (this.pt > tell + 40 || this.x < 30 || this.x > W - 30) this.pick('cruise');
        }
        break;
      }
      case 'ridden': {
        // she steers: it swims the way she leans, fast, and can't turn sharply
        const inp = g.input;
        const ix = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0), iy = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
        if (ix || iy) {
          let da = Math.atan2(iy, ix) - this.heading;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          this.heading += clamp(da, -0.05, 0.05);
        }
        const speed = 3.3;
        this.vx = Math.cos(this.heading) * speed;
        this.vy = Math.sin(this.heading) * speed;
        this.x += this.vx;
        this.y += this.vy;
        this.mouth = 1;
        p.invuln = Math.max(p.invuln, 2);
        // into a spike rack, head first?
        for (const r of this.racks) {
          if (r.broken || Math.hypot(this.x - r.x, this.y - r.y) > 34) continue;
          r.broken = true;
          r.s.setFrame(g.sheets.props.anims.rack[1]);
          g.shake(8, 40);
          g.audio.play('explode');
          g.fx.burst(r.x, r.y, 'burst', 5, 16, { fps: 10 });
          g.fx.burst(r.x, r.y, 'blood', 10, 14, { speed: 3, grav: 0.1, life: 50 });
          this.windowDmg = 0;
          this.strike(g, this.x, this.y, 'whip', SEG);
          p.mount = null;
          p.vy = -5;
          p.invuln = 90;
          this.riding = false;
          if (this.pat === 'ridden') this.pick('reel');
          break;
        }
        // walls and floor turn it; it throws her if she can't find a rack in time
        if (this.pat === 'ridden') {
          if (this.x < 40 || this.x > W - 40) this.heading = Math.PI - this.heading;
          if (this.y < 34 || this.y > fy - 20) this.heading = -this.heading;
          this.x = clamp(this.x, 40, W - 40);
          this.y = clamp(this.y, 34, fy - 20);
          if (this.pt > 600) {
            p.mount = null;
            p.vy = -6;
            this.riding = false;
            g.message('IT THROWS YOU OFF', 90);
            this.pick('cruise');
          }
        }
        break;
      }
      case 'reel':
        // it backs off the spikes, thrashing
        this.mouth = 2;
        this.swimTo(W / 2, Math.min(fy - 60, this.level + 80), 1.5);
        if (this.pt > 120) this.pick('cruise');
        break;
      case 'dying':
        this.y = Math.min(fy - 16, this.y + 0.7);
        this.want = fy;
        this.level = Math.min(fy, this.level + 2); // the pool empties for good as it dies
        this.mouth = 2;
        for (const s of this.segs) s.opacity = Math.max(0, 1 - this.deathT / 150);
        this.harpoon.visible = false;
        if (this.dyingTick(g)) {
          for (const s of this.segs) s.visible = false;
          return;
        }
        break;
    }
    if (Math.abs(this.vx) > 0.2) this.facing = this.vx < 0 ? -1 : 1;
    // the body follows the path the head took
    this.trail.unshift({ x: this.x, y: this.y });
    this.trail.length = SEGS * GAP + 2;
    const A = g.sheets.leviathan.anims, s = this.sprite!;
    s.setFrame(A.head[this.mouth]);
    s.place(this.x, this.y, this.facing < 0);
    this.showFlash();
    const soft = this.pat === 'stranded';
    for (let i = 0; i < SEGS; i++) {
      const t = this.trail[(i + 1) * GAP], prev = this.trail[i * GAP];
      const seg = this.segs[i];
      seg.place(t.x, t.y, prev.x < t.x);
      seg.flash = this.flashT > 0 ? 0.5 : 0;
      if (soft) seg.tint(1.25, 1.05, 1);
      else seg.tint(1, 1, 1);
    }
    // the harpoon stands in the first segment; its ring is what she catches and hangs from
    const back = this.trail[GAP];
    this.ring.x = back.x + (this.facing > 0 ? 10 : -10);
    this.ring.y = back.y - 34;
    this.harpoon.visible = this.pat !== 'dying';
    this.harpoon.place(back.x, back.y, this.facing < 0);
    this.harpoon.glow = this.phase === 2 && !this.riding ? 0.4 + Math.sin(g.frame * 0.2) * 0.3 : 0;
    // wheels: turned ones stand open, and creak round when struck
    const WA = g.sheets.props.anims.wheel;
    for (const w of this.wheels) {
      if (w.spin > 0) w.spin--;
      w.s.setFrame(WA[(w.turns + (w.spin > 0 ? Math.floor(w.spin / 4) : 0)) % 4]);
      w.s.place(w.x, w.y);
      w.s.glow = w.turns >= WHEEL_TURNS ? 0.5 : 0;
      if (w.turns >= WHEEL_TURNS && g.frame % 6 === 0 && this.phase === 1) g.fx.burst(w.x, w.y + 14, 'splash', 1, 4, { vy: 1.5, life: 20 });
    }
  }
}
