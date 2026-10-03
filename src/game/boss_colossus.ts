// The Hollow Colossus (the Great Forge), in two rooms.
//
// OUTSIDE (class Colossus): you are the smith. The armor never walks, and cold steel only
// clanks. To break a piece you have to forge it:
//   1. stoke the furnace: jump on the two bellows (each landing is a pump). The heat fades.
//   2. while the furnace is hot, the gauntlets hanging over it start to glow.
//   3. a gauntlet slams down on wherever you stand. Stand on the anvil and step off: a hot
//      gauntlet that lands on the anvil lies there, soft. Three blows shatter it.
// Both gauntlets, then the helm (he bows to strike with it, same rule). Then the breastplate
// bursts open (a scene), the armor sinks to its knees, and the furnace door in its chest
// stands open: walk into it.
//
// INSIDE (class FurnaceHeart, the room 'fg_heart'): the core hangs from four chains. A jet of
// flame turns round it like a clock hand, and the floor vents blow in turn. Whip the four chain
// anchors on the walls (two strokes each) and the core drops to the floor: strike it. It hauls
// itself back up on new chains, faster. Three drops.
import { Sprite } from '../gfx/view';
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import { BossBase, Target, Beam, SEG, prop, distToSegment } from './boss_base';
import { clamp, rand, overlap } from '../core/util';

export const COLOSSUS_OPEN = 'colossus_open'; // flag: the breastplate is already burst (so a return visit skips the forging)

const ANVIL_X = 330;
const BELLOWS_X = [88, 232];
const PUMP = 30; // heat one landing on a bellows adds
const HOT = 55; // furnace heat at which the pieces start to take it up
const SOFT = 70; // a piece this hot can be forged
const SOFT_TIME = 300; // frames a hot piece lies on the anvil

interface Piece {
  name: 'fistL' | 'fistR' | 'helm';
  s: Sprite;
  x: number;
  y: number;
  r: number;
  alive: boolean;
  blows: number; // hammer blows it has taken (3 shatter it)
  temp: number; // 0 cold .. 100 white hot
  st: 'home' | 'aim' | 'slam' | 'rest' | 'back';
  t: number;
  onAnvil: boolean;
}

export class Colossus extends BossBase {
  label = 'COLOSSUS';
  pieces: Piece[] = [];
  legs: Sprite;
  door: Sprite;
  bellows: Sprite[] = [];
  bellowsT = [0, 0];
  cx: number;
  heat = 0;
  sink = 0; // how far the body has sunk to its knees
  wasGround = true;
  get camZoom() {
    return 1.2;
  }
  constructor(g: Game, x: number) {
    super(g, 'colossus', g.sheets.colossus, 30, 40, 8);
    const sh = g.sheets.colossus, A = sh.anims;
    this.cx = this.x = x;
    this.y = this.floorY - 110;
    this.legs = new Sprite(sh, g.view.sprites, 8);
    this.door = new Sprite(sh, g.view.sprites, 9);
    this.door.visible = false;
    const mk = (name: Piece['name'], frame: number, r: number, order: number): Piece => {
      const s = new Sprite(sh, g.view.sprites, order);
      s.setFrame(frame);
      return { name, s, x: 0, y: 0, r, alive: true, blows: 0, temp: 0, st: 'home', t: 0, onAnvil: false };
    };
    this.pieces = [mk('fistL', A.fist[0], 26, 12), mk('fistR', A.fist[0], 26, 12), mk('helm', A.helm[0], 24, 9)];
    for (const q of this.pieces) [q.x, q.y] = this.home(q);
    this.props.push(prop(g, 'props', 'anvil', ANVIL_X, this.floorY - 24, 7));
    for (const bx of BELLOWS_X) {
      const s = prop(g, 'props', 'bellows', bx, this.floorY - 24, 7);
      this.bellows.push(s);
      this.props.push(s);
    }
    if (g.hunter.flags.includes(COLOSSUS_OPEN)) {
      // already forged open on an earlier try: only the breach is left to do
      for (const q of this.pieces) {
        q.alive = false;
        q.s.visible = false;
      }
      this.hp = this.maxHp / 2;
      this.sink = 50;
      this.phase = 2;
      this.data.skip = true;
    }
  }
  piece(name: Piece['name']) {
    return this.pieces.find((q) => q.name === name)!;
  }
  /** Where a piece sits when it's part of the suit. */
  home(q: Piece): [number, number] {
    const fy = this.floorY + this.sink;
    if (q.name === 'fistL') return [this.cx - 84, fy - 120];
    if (q.name === 'fistR') return [this.cx - 40, fy - 104];
    return [this.cx - 4, fy - 176];
  }
  /** The piece whose turn it is: the gauntlets first, then the helm. */
  get turn(): Piece[] {
    const fists = this.pieces.filter((q) => q.alive && q.name !== 'helm');
    return fists.length ? fists : this.pieces.filter((q) => q.alive);
  }
  targets(): Target[] {
    return this.pieces.filter((q) => q.alive).map((q) => ({ id: q.name, x: q.x, y: q.y, r: q.r }));
  }
  hurtZones(): Target[] {
    // a piece in the air hurts; one lying soft on the anvil doesn't
    return this.pieces.filter((q) => q.alive && (q.st === 'slam' || q.st === 'aim')).map((q) => ({ id: q.name, x: q.x, y: q.y, r: q.r - 8 }));
  }
  hitType(): DmgType {
    return 'melee';
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    const q = this.piece(t.id as Piece['name']);
    if (!(q.st === 'rest' && q.onAnvil && q.temp >= SOFT)) return this.clank(g, q.x, q.y);
    // a hammer blow on hot steel
    q.blows++;
    g.audio.play('note', 0.6 + q.blows * 0.15);
    g.fx.burst(q.x, q.y - 10, 'ember', 14, 12, { speed: 3, grav: 0.1, life: 40 });
    g.shake(3, 8);
    this.windowDmg = 0;
    this.strike(g, q.x, q.y, kind, SEG / 3 + 0.01);
    if (q.blows < 3) return;
    q.alive = false;
    q.s.visible = false;
    g.audio.play('explode');
    g.shake(7, 30);
    g.fx.burst(q.x, q.y, 'burst', 6, 22, { fps: 10 });
    g.fx.burst(q.x, q.y, 'rock', 10, 16, { speed: 3, grav: 0.15, life: 50, rot: 0.3 });
    if (!this.pieces.some((x) => x.alive)) {
      this.phase = 2;
      g.bossScene();
      this.pick('rage');
    } else if (!this.turn.some((x) => x.name !== 'helm')) g.message('THE HELM BOWS TO STRIKE', 150);
  }
  destroy() {
    super.destroy();
    this.legs.dispose();
    this.door.dispose();
    for (const q of this.pieces) q.s.dispose();
  }
  /** One piece's frame: wait at its place, rise over the hunter, slam, lie there, go back. */
  move(g: Game, q: Piece, quick: number) {
    const p = g.player, [hx, hy] = this.home(q);
    const reach = q.name === 'helm' ? 210 : 420; // the helm can only bow so far
    q.t++;
    if (q.st === 'home') {
      q.x += (hx - q.x) * 0.1;
      q.y += (hy + Math.sin(g.frame * 0.05 + hx) * 4 - q.y) * 0.1;
    } else if (q.st === 'aim') {
      q.x += (clamp(p.x, this.cx - reach, this.cx - 30) - q.x) * 0.09;
      q.y += (this.floorY - 180 - q.y) * 0.1;
      if (q.t > 50 / quick) {
        q.st = 'slam';
        q.t = 0;
        g.audio.play('creak');
      }
    } else if (q.st === 'slam') {
      q.y += 3 + q.t * 0.9;
      const over = Math.abs(q.x - ANVIL_X) < 26;
      const stop = over ? this.floorY - 52 : this.floorY - 24;
      if (q.y >= stop) {
        q.y = stop;
        q.st = 'rest';
        q.t = 0;
        q.onAnvil = over;
        g.shake(5, 16);
        if (over) {
          q.x = ANVIL_X;
          g.audio.play('note', 0.5);
          g.fx.burst(q.x, q.y + 20, 'spark', 8, 14);
          if (q.temp >= SOFT) g.message('IT LIES SOFT ON THE ANVIL: STRIKE', 130);
        } else {
          g.audio.play('rumble');
          g.fx.burst(q.x, this.floorY, 'dust', 6, 16, { vy: -0.5, life: 26 });
        }
      }
    } else if (q.st === 'rest') {
      const soft = q.onAnvil && q.temp >= SOFT;
      if (q.t > (soft ? SOFT_TIME : 70) / (soft ? 1 : quick)) {
        q.st = 'back';
        q.t = 0;
      }
    } else {
      q.x += (hx - q.x) * 0.07;
      q.y += (hy - q.y) * 0.07;
      if (Math.hypot(hx - q.x, hy - q.y) < 6) q.st = 'home';
    }
  }
  update(g: Game) {
    this.pt++;
    const p = g.player, A = g.sheets.colossus.anims, d = this.data;
    // the bellows: every landing on one is a pump
    const landed = p.onGround && !this.wasGround;
    this.wasGround = p.onGround;
    BELLOWS_X.forEach((bx, i) => {
      if (this.bellowsT[i] > 0) this.bellowsT[i]--;
      if (landed && Math.abs(p.x - bx) < 22 && this.pat === 'forge') {
        this.heat = Math.min(100, this.heat + PUMP);
        this.bellowsT[i] = 16;
        g.audio.play('breath');
        g.fx.burst(bx + 26, this.floorY - 8, 'ember', 8, 6, { vx: 2, vy: -1, life: 30 });
      }
      this.bellows[i].setFrame(g.sheets.props.anims.bellows[this.bellowsT[i] > 0 ? 1 : 0]);
    });
    this.heat = Math.max(0, this.heat - (this.pieces.filter((q) => q.alive).length === 1 ? 0.1 : 0.07));
    let lit = 1;
    switch (this.pat) {
      case 'enter':
        // a dead suit of armor: then the furnace inside it catches
        lit = d.skip ? 1 : clamp((this.pt - 30) / 80, 0.25, 1);
        if (d.skip) {
          if (this.pt === 20) g.bossIntro();
          if (this.pt === 40) g.bossTalk('none');
          if (this.pt > 40) this.pick('breach');
          break;
        }
        if (this.pt === 40) g.audio.play('fire');
        if (this.pt === 110) {
          g.audio.play('roar');
          g.shake(5, 50);
          g.bossIntro();
        }
        if (this.pt === 160) g.bossTalk();
        if (this.pt > 160) {
          this.pick('forge');
          g.message('COLD STEEL ONLY RINGS. STOKE THE BELLOWS', 220);
        }
        break;
      case 'forge': {
        const mine = this.turn;
        const quick = mine.length === 1 ? 1.3 : 1;
        for (const q of this.pieces) if (q.alive) this.move(g, q, quick);
        // the pieces whose turn it is take up the furnace's heat (and lose it again)
        for (const q of this.pieces) q.temp = clamp(q.temp + (this.heat >= HOT && mine.includes(q) ? 0.55 : -0.2), 0, 100);
        // send one down whenever none is busy
        if (mine.every((q) => q.st === 'home') && this.pt > 70 / quick) {
          const q = mine[Math.floor(Math.random() * mine.length)];
          q.st = 'aim';
          q.t = 0;
          this.pt = 0;
        }
        break;
      }
      case 'rage':
        // the scene: the breastplate bursts open and the armor drops to its knees
        this.sink += (50 - this.sink) * 0.06;
        if (this.pt === 20) {
          g.audio.play('explode');
          g.shake(7, 40);
          g.fadeFlash = 10;
          g.fx.burst(this.cx, this.floorY - 110, 'rock', 12, 22, { speed: 3, grav: 0.15, life: 60, rot: 0.3 });
          g.setFlag(COLOSSUS_OPEN);
        }
        if (this.pt === 100) g.bossTalk('boss_colossus_phase2');
        if (this.pt > 100) {
          this.pick('breach');
          g.message('ITS CHEST STANDS OPEN: GO IN', 200);
        }
        break;
      case 'breach': {
        // kneeling, its chest a doorway. Step into the glow to go inside
        this.sink += (50 - this.sink) * 0.06;
        const dx = this.cx, dy = this.floorY - 34;
        if (this.pt % 10 === 0) g.fx.burst(dx + rand(-10, 10), dy + rand(-14, 14), 'ember', 1, 4, { vy: -0.6, life: 30 });
        if (this.pt > 30 && p.alive && overlap({ x: dx, y: dy, hw: 12, hh: 22 }, p)) {
          const to = g.defs.find((r) => r.id === 'fg_heart')!;
          g.audio.play('fire');
          g.trans = { t: 0, to, x: 60, y: to.h * 224 - 32 - p.hh, vx: 0, vy: 0 };
          g.state = 'transition';
          return;
        }
        break;
      }
    }
    // lay the suit out
    const fy = this.floorY + this.sink;
    const open = this.phase === 2 && (this.pat !== 'rage' || this.pt >= 20);
    this.y = fy - 110;
    this.legs.setFrame(A.legs[this.sink > 25 ? 1 : 0]);
    this.legs.place(this.cx, this.floorY - 46);
    this.sprite!.setFrame(A.torso[open ? 2 : this.pieces.filter((q) => !q.alive).length ? 1 : 0]);
    this.sprite!.place(this.cx, fy - 116);
    this.door.visible = this.pat === 'breach';
    this.door.setFrame(A.door[Math.floor(g.frame / 10) % 2]);
    this.door.place(this.cx, this.floorY - 40);
    this.door.glow = 0.5;
    const furnace = this.heat / 100;
    for (const q of this.pieces) {
      if (!q.alive) continue;
      q.s.setFrame((q.name === 'helm' ? A.helm : A.fist)[q.blows > 0 ? 1 : 0]);
      q.s.place(q.x, q.y, q.name !== 'helm'); // the gauntlets reach out to the left, toward the forge floor
      // heat shows: cold grey, then orange, then a white-hot glow
      const k = q.temp / 100;
      q.s.tint(lit * (1 + k * 0.7), lit * (1 - k * 0.3), lit * (1 - k * 0.78));
      q.s.glow = k > 0.7 ? (k - 0.7) * 2.2 + Math.sin(g.frame * 0.3) * 0.08 : 0;
    }
    this.sprite!.tint(lit * (1 + furnace * 0.25), lit, lit * (1 - furnace * 0.15));
    this.sprite!.glow = furnace * 0.25;
    this.legs.tint(lit, lit, lit);
    if (this.heat > 20 && g.frame % 5 === 0) g.fx.burst(this.cx - 60 + rand(-50, 50), this.floorY - 4, 'ember', 1, 4, { vy: -1.2 - furnace, life: 40 });
  }
}

// ---------------------------------------------------------------- inside

const CORE_HANG = 120; // the core's y while it hangs
const ANCHORS: [number, number][] = [[30, 150], [354, 150], [30, 290], [354, 290]];
const VENTS = [72, 192, 312];
const EXPOSED = 320; // frames the fallen core lies open

export class FurnaceHeart extends BossBase {
  label = 'FURNACE HEART';
  anchors: { s: Sprite; x: number; y: number; hits: number }[] = [];
  vents: Sprite[] = [];
  jet: Beam;
  jet2: Beam;
  chains: Beam[] = [];
  round = 0;
  angle = 0;
  constructor(g: Game) {
    super(g, 'colossus', g.sheets.tallprops, 20, 20, 11);
    this.hp = this.maxHp / 2; // the armor's half is already done
    this.x = g.room.W / 2;
    this.y = CORE_HANG;
    this.jet = new Beam(g, '#ff7a20');
    this.jet2 = new Beam(g, '#ff7a20');
    for (const [x, y] of ANCHORS) {
      const s = prop(g, 'props', 'anchor', x, y, 7);
      this.props.push(s);
      this.anchors.push({ s, x, y, hits: 0 });
      this.chains.push(new Beam(g, '#6a6470', 6));
    }
    for (const x of VENTS) {
      const s = prop(g, 'props', 'vent', x, this.floorY - 22, 7);
      this.vents.push(s);
      this.props.push(s);
    }
  }
  get hanging() {
    return this.pat === 'hang' || this.pat === 'enter' || this.pat === 'rise';
  }
  targets(): Target[] {
    const out: Target[] = [{ id: 'core', x: this.x, y: this.y, r: 24 }];
    if (this.pat === 'hang') this.anchors.forEach((a, i) => a.hits < 2 && out.push({ id: 'anchor' + i, x: a.x, y: a.y, r: 14 }));
    return out;
  }
  hurtZones(): Target[] {
    return [{ id: 'core', x: this.x, y: this.y, r: 16 }];
  }
  hitType(): DmgType {
    return 'magic';
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id === 'core') {
      if (this.pat !== 'down') return this.clank(g, t.x, t.y);
      if (this.strike(g, t.x, t.y, kind) && this.pat === 'down') this.pick('rise');
      return;
    }
    const a = this.anchors[Number(t.id.slice(6))];
    a.hits++;
    g.audio.play('chain');
    g.fx.burst(a.x, a.y, 'spark', 3, 8);
    if (a.hits < 2) return;
    a.s.setFrame(g.sheets.props.anims.anchor[1]);
    g.audio.play('snap');
    if (this.anchors.every((x) => x.hits >= 2)) {
      this.windowDmg = 0;
      this.pick('fall');
    }
  }
  destroy() {
    super.destroy();
    this.jet.dispose();
    this.jet2.dispose();
    for (const c of this.chains) c.dispose();
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, s = this.sprite!, A = g.sheets.tallprops.anims;
    const speed = 0.011 + this.round * 0.004;
    const floorRest = this.floorY - 34;
    switch (this.pat) {
      case 'enter':
        if (this.pt === 30) {
          g.audio.play('fire');
          g.shake(4, 40);
          g.bossIntro();
        }
        if (this.pt === 80) g.bossTalk('boss_colossus_inside');
        if (this.pt > 80) this.pick('hang');
        break;
      case 'hang':
        this.y = CORE_HANG + Math.sin(this.pt * 0.05) * 3;
        this.angle += speed;
        break;
      case 'fall':
        this.vy = Math.min(this.vy + 0.4, 8);
        this.y += this.vy;
        if (this.y >= floorRest) {
          this.y = floorRest;
          this.vy = 0;
          g.shake(6, 24);
          g.audio.play('explode');
          g.fx.burst(this.x, this.floorY, 'ember', 16, 20, { speed: 3, grav: 0.1, life: 40 });
          g.message('THE HEART IS DOWN: STRIKE', 130);
          this.pick('down');
        }
        break;
      case 'down':
        if (this.pt > EXPOSED) this.pick('rise');
        break;
      case 'rise':
        // new chains haul it back up, and everything runs faster
        if (this.pt === 1) {
          this.round++;
          for (const a of this.anchors) {
            a.hits = 0;
            a.s.setFrame(g.sheets.props.anims.anchor[0]);
          }
          g.audio.play('chain');
        }
        this.y += (CORE_HANG - this.y) * 0.05;
        if (Math.abs(this.y - CORE_HANG) < 3) this.pick('hang');
        break;
      case 'dying':
        this.jet.hide();
        this.jet2.hide();
        for (const c of this.chains) c.hide();
        if (this.dyingTick(g, 150, 30)) return;
        break;
    }
    // the turning jets of flame (only while it hangs)
    const jets = this.pat === 'hang';
    for (const [beam, off] of [[this.jet, 0], [this.jet2, Math.PI]] as [Beam, number][]) {
      if (!jets) {
        beam.hide();
        continue;
      }
      const a = this.angle + off, len = 150;
      const x1 = this.x + Math.cos(a) * len, y1 = this.y + Math.sin(a) * len;
      beam.set(this.x + Math.cos(a) * 22, this.y + Math.sin(a) * 22, x1, y1, 9 + Math.sin(g.frame * 0.5) * 2);
      if (g.frame % 3 === 0) g.fx.burst(x1, y1, 'ember', 1, 4, { life: 20 });
      if (p.alive && p.invuln <= 0 && distToSegment(p.x, p.y, this.x, this.y, x1, y1) < 11) p.takeDamage(Math.round(this.atk * 0.7), this.x, false, true, 'magic');
    }
    // the chains
    this.anchors.forEach((a, i) => {
      if (a.hits >= 2 || this.pat === 'dying' || this.pat === 'down' || this.pat === 'fall') this.chains[i].hide();
      else this.chains[i].set(a.x, a.y, this.x, this.y - 20, 3, 0.9);
    });
    // floor vents blow in turn: a warning glow, then a column of flame
    const cycle = Math.max(150, 240 - this.round * 40), V = g.sheets.props.anims.vent;
    VENTS.forEach((vx, i) => {
      const t = (g.frame + i * Math.floor(cycle / 3)) % cycle;
      const warn = t > cycle - 110 && t <= cycle - 50, blow = t > cycle - 50;
      this.vents[i].setFrame(V[warn || blow ? 1 : 0]);
      if (blow && this.pat !== 'dying') {
        if (t % 3 === 0) g.fx.burst(vx + rand(-6, 6), this.floorY - rand(0, 110), 'fire', 1, 4, { sheet: 'fire', vy: -2, life: 22 });
        if (t === cycle - 49) g.audio.play('flame');
        if (p.alive && p.invuln <= 0 && overlap({ x: vx, y: this.floorY - 60, hw: 12, hh: 60 }, p)) p.takeDamage(Math.round(this.atk * 0.7), vx, false, true, 'magic');
      }
    });
    s.setFrame(A.core[Math.floor(g.frame / 6) % 4]);
    s.place(this.x, this.y + 34);
    s.glow = this.pat === 'down' ? 0.2 : 0.5 + Math.sin(g.frame * 0.2) * 0.2;
    this.showFlash();
  }
  hitSpot(): [number, number] {
    return [this.x, this.y];
  }
}
