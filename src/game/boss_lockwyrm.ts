// The Sump Leviathan (0.27.0 trial fight: the Sunken Lock). Test chamber only.
//
// A lock at the bottom of a flooded well: two basins either side of a stone weir, a gap under
// the weir it swims through, and the well shaft going up into the dark above.
//
// FIRST HALF, the lock. It patrols both basins, lunges out of the water at you (a long tell)
// and spits brine. Its hide is armor everywhere. Three ways to open it up:
//   - drain it: a sluice wheel on each wall, three whip strokes each. With both open the pool
//     empties and it lies stranded until it hauls the flood valve open again.
//   - beach it: a lunge that carries it over the top of the weir leaves it lying across the
//     stone (stand on the weir when it commits, and get off).
//   - the lock gate: knock out the pawl on top of the weir (two strokes) and the gate drops
//     through the gap. If its body is in the gap, it is pinned.
// SECOND HALF, the well (a scene at half health): it breaks the weir, and the water starts to
// climb the shaft with you. It comes up under you (bubbles mark where), and throws fans of
// brine. Three ways again:
//   - the chains: two great chains hang down the shaft. A rise that goes up through one tangles it.
//   - the counterweight: knock out the winch pawl on the west ledge (two strokes) and the
//     weight falls down the middle of the shaft: time it for when the beast is passing under.
//   - the harpoon: catch the ring on the shaft in its back and you ride it. Lean it into a
//     spike rack on the wall (they come within reach as the water rises).
import { Sprite, Sheet } from '../gfx/view';
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import { BossBase, Target, Beam, SEG } from './boss_base';
import { EnemyShot } from './objects';
import { lazySheet } from '../gfx/lazy';
import { buildLockWyrmSheet, buildLockWyrmBodySheet, buildLockPropSheet, lwDir } from '../gfx/art_lockwyrm';
import { clamp, rand } from '../core/util';
import { TILE } from '../config';

const SEGS = 9, GAP = 10;
const FULL = 33 * TILE + 4; // the pool's surface in the first half
const DEEP = 13 * TILE + 4; // as high as the well floods in the second
const WEIR_X = 384, WEIR_TOP = 30 * TILE, GAP_Y = 36.5 * TILE;
const WHEEL_TURNS = 3;
const CHAINS = [216, 552];
const WEIGHT_REST = 100;
const WINDOWS = ['stranded', 'beached', 'pinned', 'tangled'];

export class LockLeviathan extends BossBase {
  label = 'LEVIATHAN';
  headSheet: Sheet;
  body: Sheet;
  propSheet: Sheet;
  segs: Sprite[] = [];
  harpoon: Sprite;
  trail: { x: number; y: number }[] = [];
  mouth = 0;
  dir = -Math.PI / 2;
  level = FULL;
  want = FULL;
  wheels: { s: Sprite; x: number; y: number; turns: number; spin: number }[] = [];
  gate: { s: Sprite; y: number; st: 'up' | 'down'; t: number };
  pawl: { s: Sprite; hits: number };
  weight: { s: Sprite; y: number; vy: number; st: 'hang' | 'fall' | 'rise' };
  pawl2: { s: Sprite; hits: number };
  racks: { s: Sprite; x: number; y: number; broken: boolean }[] = [];
  chains: Beam[] = [];
  rope: Beam;
  beachCool = 0;
  heading = 0;
  riding = false;
  ring = { x: 0, y: 0, release: () => this.thrown() };
  get camZoom() {
    return 1.2;
  }
  constructor(g: Game) {
    const sheet = lazySheet('lockwyrm', buildLockWyrmSheet);
    super(g, 'leviathan2', sheet, 26, 18, 11);
    this.headSheet = sheet;
    this.body = lazySheet('lockwyrmBody', buildLockWyrmBodySheet);
    this.propSheet = lazySheet('lockprops', buildLockPropSheet);
    const W = g.room.W;
    for (let i = 0; i < SEGS; i++) this.segs.push(new Sprite(this.body, g.view.sprites, 10));
    this.harpoon = new Sprite(this.body, g.view.sprites, 9);
    this.harpoon.setFrame(this.body.anims.harpoon[0]);
    this.x = 200;
    this.y = g.room.H + 60;
    for (let i = 0; i < SEGS * GAP + 2; i++) this.trail.push({ x: this.x, y: this.y + i * 3 });
    const put = (anim: string, x: number, bottom: number, order: number) => {
      const s = new Sprite(this.propSheet, g.view.sprites, order);
      s.setFrame(this.propSheet.anims[anim][0]);
      s.place(x, bottom);
      this.props.push(s);
      return s;
    };
    for (const x of [56, W - 56]) {
      const s = new Sprite(g.sheets.props, g.view.sprites, 7);
      this.props.push(s);
      this.wheels.push({ s, x, y: 27 * TILE + 8, turns: 0, spin: 0 });
    }
    this.gate = { s: put('gate', WEIR_X, 568, 5), y: 568, st: 'up', t: 0 };
    this.pawl = { s: put('pawl', WEIR_X, WEIR_TOP, 7), hits: 0 };
    this.weight = { s: put('weight', WEIR_X, WEIGHT_REST, 7), y: WEIGHT_REST, vy: 0, st: 'hang' };
    this.pawl2 = { s: put('pawl', 40, 15 * TILE, 7), hits: 0 };
    for (const [x, y] of [[26, 480], [W - 26, 352], [26, 224]]) {
      const s = new Sprite(g.sheets.props, g.view.sprites, 7);
      s.setFrame(g.sheets.props.anims.rack[0]);
      s.place(x, y, x > W / 2);
      s.visible = false;
      this.props.push(s);
      this.racks.push({ s, x, y, broken: false });
    }
    for (let k = 0; k < 2; k++) this.chains.push(new Beam(g, '#6a7078', 5));
    this.rope = new Beam(g, '#6a7078', 5);
    g.tideHold = true;
    g.setWater(this.level);
  }
  get inWindow() {
    return WINDOWS.includes(this.pat);
  }
  circles(): [number, number, number][] {
    const out: [number, number, number][] = [[this.x, this.y, 20]];
    for (let i = 0; i < SEGS - 1; i += 2) {
      const t = this.trail[(i + 1) * GAP];
      out.push([t.x, t.y, 15]);
    }
    return out;
  }
  targets(): Target[] {
    const out: Target[] = [];
    if (this.phase === 1) {
      this.wheels.forEach((w, i) => out.push({ id: 'wheel' + i, x: w.x, y: w.y, r: 18 }));
      out.push({ id: 'pawl', x: WEIR_X, y: WEIR_TOP - 14, r: 14 });
    } else {
      if (this.weight.st === 'hang') out.push({ id: 'pawl2', x: 40, y: 15 * TILE - 14, r: 14 });
      if (!this.riding) out.push({ id: 'ring', x: this.ring.x, y: this.ring.y, r: 16 });
    }
    for (const [x, y, r] of this.circles()) out.push({ id: 'body', x, y, r });
    return out;
  }
  hurtZones(): Target[] {
    if (this.inWindow || this.riding || this.pat === 'reel') return [];
    return this.circles().map(([x, y, r]) => ({ id: 'body', x, y, r: r - 6 }));
  }
  hitType(): DmgType {
    return this.pat === 'lunge' || this.pat === 'rise' ? 'melee' : 'touch';
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
    } else if (t.id === 'pawl') {
      if (this.gate.st === 'down') return;
      g.audio.play('chain');
      g.fx.burst(t.x, t.y, 'spark', 3, 8);
      if (++this.pawl.hits >= 2) {
        this.gate.st = 'down';
        this.gate.t = 0;
        g.audio.play('snap');
        g.message('THE LOCK GATE DROPS', 90);
      }
    } else if (t.id === 'pawl2') {
      g.audio.play('chain');
      g.fx.burst(t.x, t.y, 'spark', 3, 8);
      if (++this.pawl2.hits >= 2) {
        this.weight.st = 'fall';
        this.weight.vy = 0;
        g.audio.play('snap');
        g.message('THE COUNTERWEIGHT FALLS', 90);
      }
    } else if (t.id === 'ring') {
      if (!g.hunter.grapple) return this.clank(g, t.x, t.y);
      this.riding = true;
      this.heading = this.dir;
      g.player.mount = this.ring;
      g.audio.play('grapple');
      g.message('LEAN IT INTO THE SPIKES', 150);
      this.pick('ridden');
    } else if (this.inWindow) {
      if (this.strike(g, t.x, t.y, kind) && this.inWindow) this.close(g);
    } else this.clank(g, t.x, t.y);
  }
  /** It is helpless: blows count until a segment is spent. */
  window(g: Game, pat: string, msg: string) {
    this.windowDmg = 0;
    this.clearShots(g);
    g.message(msg, 150);
    g.shake(5, 24);
    this.pick(pat);
  }
  /** A window ends: back to the hunt, or (at half health) the scene that floods the well. */
  close(g: Game) {
    const was = this.pat;
    g.audio.play('roar');
    g.shake(5, 30);
    if (was === 'pinned') this.gate.st = 'up';
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      g.bossScene();
      return this.pick('rage');
    }
    if (this.phase === 2) return this.pick('cruise');
    if (was === 'beached') this.beachCool = 2;
    this.pick(was === 'stranded' ? 'flood' : 'hunt');
  }
  thrown() {
    this.riding = false;
    if (this.pat === 'ridden') this.pick('cruise');
  }
  destroy() {
    super.destroy();
    for (const s of this.segs) s.dispose();
    this.harpoon.dispose();
    for (const c of this.chains) c.dispose();
    this.rope.dispose();
    if (this.g.player.mount === this.ring) this.g.player.mount = null;
  }
  swimTo(tx: number, ty: number, speed: number, turn = 0.06) {
    const a = Math.atan2(ty - this.y, tx - this.x);
    this.vx += (Math.cos(a) * speed - this.vx) * turn;
    this.vy += (Math.sin(a) * speed - this.vy) * turn;
    this.x += this.vx;
    this.y += this.vy;
  }
  /** The lock's and the well's machinery, every frame. */
  arena(g: Game) {
    const P = this.propSheet.anims;
    // the gate: down through the gap, and up again after a while
    const G = this.gate;
    const gy = G.st === 'down' ? 608 : 568;
    if (G.y !== gy) {
      G.y += clamp(gy - G.y, -1, 5);
      if (G.y === 568) this.pawl.hits = 0; // winched back up: the pawl is set again
      if (G.y === 608) {
        g.audio.play('gate');
        g.shake(5, 16);
        const caught = this.circles().some(([x, y]) => Math.abs(x - WEIR_X) < 34 && Math.abs(y - GAP_Y) < 34);
        if (caught && this.phase === 1 && !this.inWindow && ['hunt', 'lunge', 'spit'].includes(this.pat)) this.window(g, 'pinned', 'THE GATE HAS IT BY THE NECK: STRIKE');
      }
    }
    if (G.st === 'down' && this.pat !== 'pinned' && ++G.t > 200) G.st = 'up';
    G.s.place(WEIR_X, G.y);
    this.pawl.s.setFrame(P.pawl[G.st === 'down' ? 1 : 0]);
    // the counterweight: it falls down the middle of the shaft, and is winched back up
    const Wt = this.weight;
    if (Wt.st === 'fall') {
      Wt.vy = Math.min(Wt.vy + 0.4, 9);
      Wt.y += Wt.vy;
      this.smite(g, { x: WEIR_X, y: Wt.y - 22, hw: 22, hh: 22 }, 'shot', 24);
      const hit = this.phase === 2 && !this.inWindow && this.pat !== 'reel' && !this.riding && this.circles().some(([x, y]) => Math.abs(x - WEIR_X) < 40 && Math.abs(y - (Wt.y - 20)) < 40);
      if (hit) {
        g.audio.play('explode');
        g.shake(8, 30);
        g.fx.burst(WEIR_X, Wt.y, 'burst', 5, 20, { fps: 10 });
        this.windowDmg = 0;
        this.strike(g, this.x, this.y, 'whip', SEG);
        if (this.pat !== 'dying') this.pick('reel');
        Wt.st = 'rise';
      } else if (Wt.y > Math.min(this.floorY, this.level + 70)) {
        g.audio.play('splash');
        g.fx.burst(WEIR_X, this.level, 'splash', 8, 20, { life: 26 });
        Wt.st = 'rise';
      }
    } else if (Wt.st === 'rise') {
      Wt.y -= 0.7;
      if (Wt.y <= WEIGHT_REST) {
        Wt.y = WEIGHT_REST;
        Wt.st = 'hang';
        this.pawl2.hits = 0;
      }
    }
    Wt.s.place(WEIR_X, Wt.y);
    this.pawl2.s.setFrame(P.pawl[Wt.st === 'hang' ? 0 : 1]);
    const well = this.phase === 2;
    Wt.s.visible = this.pawl2.s.visible = well;
    if (well) {
      this.rope.set(WEIR_X, 0, WEIR_X, Wt.y - 56, 3, 0.9);
      CHAINS.forEach((x, k) => this.chains[k].set(x + Math.sin(g.frame * 0.02 + k) * 1.5, 16, x, WEIR_TOP, 4, 0.9));
    }
    // sluice wheels
    const WA = g.sheets.props.anims.wheel;
    for (const w of this.wheels) {
      if (w.spin > 0) w.spin--;
      w.s.setFrame(WA[(w.turns + (w.spin > 0 ? Math.floor(w.spin / 4) : 0)) % 4]);
      w.s.place(w.x, w.y);
      w.s.glow = w.turns >= WHEEL_TURNS ? 0.5 : 0;
    }
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    this.arena(g);
    const p = g.player, W = g.room.W, d = this.data, fy = this.floorY;
    this.mouth = 0;
    // the water eases to where it is meant to be (in the second half it only ever climbs)
    if (this.phase === 2 && this.pat !== 'rage' && this.pat !== 'dying') this.want = Math.max(DEEP, this.want - 0.14);
    if (this.level !== this.want) {
      this.level += clamp(this.want - this.level, -1.2, 1.2);
      if (g.frame % 5 === 0) g.fx.burst(rand(20, W - 20), this.level, 'splash', 1, 0, { life: 16 });
    }
    g.setWater(this.level);
    const opened = this.wheels.every((w) => w.turns >= WHEEL_TURNS);
    switch (this.pat) {
      case 'enter':
        // the west basin heaves, and it rears out of it
        if (this.pt < 90) this.swimTo(200, this.level - 64, 2.4);
        else this.swimTo(260, this.level + 50, 1.4);
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
        // back and forth through the gap under the weir
        if (this.pt === 1) d.dir = this.x < W / 2 ? 1 : -1;
        if (this.x > W - 90) d.dir = -1;
        if (this.x < 90) d.dir = 1;
        const nearGap = Math.abs(this.x - WEIR_X) < 110;
        this.swimTo(this.x + d.dir * 90, nearGap ? GAP_Y : GAP_Y - 14 + Math.sin(this.pt * 0.05) * 10, 1.9, nearGap ? 0.1 : 0.06);
        if (opened) this.pick('drain');
        else if (this.pt > 170 && !nearGap) {
          if (this.beachCool > 0) this.beachCool--;
          const onWeir = Math.abs(p.x - WEIR_X) < 40 && p.y < WEIR_TOP;
          this.pick(onWeir && this.beachCool > 0 ? 'spit' : this.choose(['lunge', 'spit', 'lunge']));
        }
        break;
      }
      case 'lunge': {
        // it rears out of the water with its jaws wide (the tell), then goes straight through where she stood
        const tell = 46;
        if (this.pt < tell) {
          this.swimTo(clamp(p.x + (this.x < p.x ? -130 : 130), 60, W - 60), this.level - 6, 2.2);
          this.mouth = this.pt > 20 ? 2 : 1;
          if (this.pt === 20) g.audio.play('roar');
        } else {
          if (this.pt === tell) {
            const a = Math.atan2(p.y - this.y, p.x - this.x);
            d.vx = Math.cos(a) * 5.2;
            d.vy = Math.sin(a) * 5.2;
            g.audio.play('bite');
          }
          this.x += this.vx = d.vx;
          this.y += this.vy = d.vy;
          this.mouth = 2;
          // over the top of the weir, and it stays there
          if (Math.abs(this.x - WEIR_X) < 30 && this.y < WEIR_TOP + 14 && this.y > WEIR_TOP - 50 && this.level > WEIR_TOP) {
            this.window(g, 'beached', 'IT LIES BEACHED ON THE WEIR: STRIKE');
            break;
          }
          if (this.pt > tell + 44 || this.x < 30 || this.x > W - 30 || this.y < 40) this.pick('hunt');
        }
        if (opened && this.pt < tell) this.pick('drain');
        break;
      }
      case 'spit': {
        this.swimTo(clamp(p.x + (p.x < W / 2 ? 150 : -150), 60, W - 60), this.level - 12, 2);
        this.mouth = this.pt > 40 ? 2 : 0;
        if (this.pt === 50 || this.pt === 74) {
          for (const off of [-1, 0, 1]) {
            const shot = new EnemyShot(g, this.x, this.y - 6, clamp((p.x - this.x) / 52, -4.5, 4.5) + off * 0.9, -4.4, 'rock', 14, 0.16);
            shot.sprite!.tint(0.6, 0.9, 1.4);
            g.spawn(shot);
          }
          g.audio.play('spit');
        }
        if (this.pt > 100) this.pick('hunt');
        if (opened) this.pick('drain');
        break;
      }
      case 'drain':
        if (this.pt === 1) {
          this.want = fy;
          g.audio.play('drain');
          g.shake(3, 60);
        }
        this.swimTo(this.x < W / 2 ? 190 : W - 190, Math.min(fy - 22, this.level + 30), 1.6);
        this.mouth = 1;
        if (this.level >= fy - 20) this.window(g, 'stranded', 'IT IS STRANDED: STRIKE THE BELLY');
        break;
      case 'stranded':
        this.vy = Math.min(this.vy + 0.3, 5);
        this.y = Math.min(fy - 16, this.y + this.vy);
        this.vx *= 0.9;
        this.x = clamp(this.x + this.vx + Math.sin(this.pt * 0.22) * 0.9, 60, W - 60);
        this.mouth = Math.floor(this.pt / 14) % 2 ? 2 : 1;
        if (this.pt > 400) this.close(g);
        break;
      case 'flood':
        // it hauls the valve open: the water comes back and the wheels are shut again
        this.mouth = 2;
        this.y = Math.min(fy - 16, this.y + 2);
        if (this.pt === 1) {
          for (const w of this.wheels) w.turns = 0;
          this.want = FULL;
          g.audio.play('tide');
        }
        if (this.level <= FULL + 2) this.pick('hunt');
        break;
      case 'beached':
        // across the top of the weir, gasping
        this.x += (WEIR_X - this.x) * 0.1;
        this.y += (WEIR_TOP - 16 - this.y) * 0.2;
        this.x += Math.sin(this.pt * 0.25) * 0.8;
        this.mouth = Math.floor(this.pt / 14) % 2 ? 2 : 1;
        if (this.pt > 280) this.close(g);
        break;
      case 'pinned':
        // the gate across its body: the head thrashes, going nowhere
        this.x += Math.sin(this.pt * 0.3) * 1.2;
        this.y += Math.cos(this.pt * 0.23) * 0.8;
        this.mouth = Math.floor(this.pt / 10) % 2 ? 2 : 1;
        if (this.pt > 300) this.close(g);
        break;
      case 'rage':
        // the scene: it goes through the weir, and the well begins to fill
        this.swimTo(WEIR_X, GAP_Y - 30, 2.6, 0.1);
        this.mouth = 2;
        if (this.pt === 30) {
          this.phase = 2;
          for (let x = 22; x <= 25; x++) for (let y = 30; y <= 39; y++) g.room.set(x, y, '.');
          g.paintRoomTiles();
          for (const w of this.wheels) w.s.visible = false;
          this.gate.s.visible = this.pawl.s.visible = false;
          for (const r of this.racks) r.s.visible = true;
          g.fx.burst(WEIR_X, 560, 'rock', 24, 50, { speed: 4, grav: 0.15, life: 70, rot: 0.3 });
          g.audio.play('explode');
          g.audio.play('tide');
          g.shake(8, 70);
          this.want = this.level; // (the climb starts once the scene is over)
        }
        if (this.pt === 140) g.bossTalk('boss_leviathan2_phase2');
        if (this.pt > 140) this.pick('cruise');
        break;
      case 'cruise': {
        // circling under the surface, the harpoon's ring riding above the water
        if (d.ph === undefined) d.ph = rand(0, 6);
        const cx = W / 2 + Math.cos(this.pt * 0.014 + d.ph) * (W / 2 - 110);
        this.swimTo(cx, this.level + 24 + Math.sin(this.pt * 0.03) * 8, 1.8, 0.04);
        if (this.pt > 280) this.pick(this.last === 'rise' ? 'fan' : 'rise');
        break;
      }
      case 'rise': {
        // it goes deep under her, bubbles mark the spot, and it comes straight up through it
        const tell = 60;
        if (this.pt < tell) {
          if (this.pt < 34) d.tx = clamp(p.x, 50, W - 50);
          this.swimTo(d.tx, this.level + 80, 2.6, 0.12);
          if (this.pt % 4 === 0) g.fx.burst(d.tx + rand(-10, 10), this.level + rand(0, 30), 'bubble', 1, 2, { vy: -1, life: 30, fade: true });
          this.mouth = 1;
          if (this.pt === 34) g.audio.play('roar');
        } else {
          if (this.pt === tell) {
            this.x = d.tx;
            this.vx = 0;
            this.vy = -7.6;
            g.audio.play('bite');
            g.fx.burst(this.x, this.level, 'splash', 8, 14, { life: 26 });
          }
          this.vy += 0.17;
          this.y += this.vy;
          this.mouth = 2;
          const chain = CHAINS.find((x) => Math.abs(x - this.x) < 18);
          if (chain && this.vy < 1 && this.y < this.level - 50 && this.y < WEIR_TOP) {
            this.x = chain;
            g.audio.play('chain');
            this.window(g, 'tangled', 'IT IS TANGLED IN THE CHAIN: STRIKE');
            break;
          }
          if (this.vy > 0 && this.y > this.level + 50) this.pick('cruise');
        }
        break;
      }
      case 'tangled':
        // hanging in the chain by its jaw and its gills, twisting
        this.vx = this.vy = 0;
        this.x += Math.sin(this.pt * 0.2) * 0.9;
        this.mouth = Math.floor(this.pt / 12) % 2 ? 2 : 1;
        if (this.pt % 20 === 0) g.audio.play('chain');
        if (this.pt > 290) this.close(g);
        break;
      case 'fan': {
        // it surfaces across the well from her and throws brine up in a fan, twice
        this.swimTo(clamp(p.x + (p.x < W / 2 ? 210 : -210), 70, W - 70), this.level - 10, 2.2);
        this.mouth = this.pt > 40 ? 2 : 0;
        if (this.pt === 56 || this.pt === 96) {
          const toward = p.x < this.x ? -1 : 1;
          for (let i = 0; i < 7; i++) {
            const a = -Math.PI / 2 + toward * (0.15 + i * 0.16) + (this.pt === 96 ? toward * 0.08 : 0);
            const shot = new EnemyShot(g, this.x, this.y - 8, Math.cos(a) * 4.4, Math.sin(a) * 4.4, 'rock', 13, 0.1);
            shot.sprite!.tint(0.6, 0.9, 1.4);
            g.spawn(shot);
          }
          g.audio.play('spit');
        }
        if (this.pt > 130) this.pick('cruise');
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
        this.x += this.vx = Math.cos(this.heading) * 3.3;
        this.y += this.vy = Math.sin(this.heading) * 3.3;
        this.mouth = 1;
        p.invuln = Math.max(p.invuln, 2);
        for (const r of this.racks) {
          if (r.broken || Math.hypot(this.x - r.x, this.y - r.y) > 36) continue;
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
        if (this.pat === 'ridden') {
          // walls, the floor and the air turn it (it can breach a little way out of the water)
          const top = Math.max(34, this.level - 50);
          if (this.x < 40 || this.x > W - 40) this.heading = Math.PI - this.heading;
          if (this.y < top || this.y > fy - 20) this.heading = -this.heading;
          this.x = clamp(this.x, 40, W - 40);
          this.y = clamp(this.y, top, fy - 20);
          if (this.pt > 520) {
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
        this.mouth = 2;
        this.swimTo(W / 2, this.level + 90, 1.5);
        if (this.pt > 130) this.pick('cruise');
        break;
      case 'dying':
        this.y = Math.min(fy - 16, this.y + 0.9);
        this.mouth = 2;
        this.want = fy; // the well empties as it dies
        this.level = Math.min(fy, this.level + 2);
        for (const s of this.segs) s.opacity = Math.max(0, 1 - this.deathT / 150);
        this.harpoon.visible = false;
        if (this.dyingTick(g)) {
          for (const s of this.segs) s.visible = false;
          return;
        }
        break;
    }
    // the head turns to the way it swims; the body follows the path the head took
    if (Math.hypot(this.vx, this.vy) > 0.3 && !this.inWindow) this.dir = Math.atan2(this.vy, this.vx);
    this.trail.unshift({ x: this.x, y: this.y });
    this.trail.length = SEGS * GAP + 2;
    const s = this.sprite!, B = this.body.anims;
    s.setFrame(this.headSheet.anims['jaw' + this.mouth][lwDir(this.dir)]);
    s.place(this.x, this.y);
    this.showFlash();
    const soft = this.inWindow;
    for (let i = 0; i < SEGS; i++) {
      const t = this.trail[(i + 1) * GAP], prev = this.trail[i * GAP];
      const a = Math.hypot(prev.x - t.x, prev.y - t.y) > 0.5 ? Math.atan2(prev.y - t.y, prev.x - t.x) : this.dir;
      const seg = this.segs[i], beat = Math.floor(g.frame / 9 + i) % 2;
      seg.setFrame((i === SEGS - 1 ? B.tail : B['seg' + (i < 3 ? 0 : i < 6 ? 1 : 2)])[lwDir(a) * 2 + beat]);
      seg.place(t.x, t.y);
      seg.flash = this.flashT > 0 ? 0.5 : 0;
      if (soft) seg.tint(1.25, 1.05, 1);
      else seg.tint(1, 1, 1);
    }
    const back = this.trail[GAP];
    this.ring.x = back.x;
    this.ring.y = back.y - 36;
    this.harpoon.visible = this.pat !== 'dying';
    this.harpoon.place(back.x - 2, back.y - 12);
    this.harpoon.glow = this.phase === 2 && !this.riding ? 0.4 + Math.sin(g.frame * 0.2) * 0.3 : 0;
  }
}
