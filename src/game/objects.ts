import * as THREE from 'three';
import { Sprite } from '../gfx/view';
import { Ent, HitKind, DmgType } from './ent';
import type { Game } from './game';
import { moveBody } from '../world/room';
import { ITEMS, ENEMY, dropChance } from './data';
import { TILE } from '../config';
import { overlap, rand } from '../core/util';
import { HINTS, LORE, RELIC_TEXT } from './story';

// ---------------------------------------------------------------- candle
export class Candle extends Ent {
  t = Math.random() * 10;
  constructor(g: Game, x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.hw = 5;
    this.hh = 10;
    this.whipTarget = true;
    this.sprite = new Sprite(g.sheets.candle, g.view.sprites, 8);
    this.sprite.place(x, y + 4);
  }
  update(g: Game) {
    this.t += 1 / 60;
    this.sprite!.anim('candle', this.t, 9);
  }
  onHit(g: Game) {
    this.dead = true;
    g.audio.play('candle');
    g.fx.burst(this.x, this.y - 6, 'burst', 1);
    g.fx.burst(this.x, this.y - 6, 'ember', 5, 2, { speed: 1.5, grav: 0.05, life: 30 });
    const r = Math.random() * 100 - g.hunter.lck * 0.3;
    const drop = r < 4 ? 'potion' : r < 9 ? 'meat' : r < 22 ? 'heartB' : r < 34 ? 'gold' : 'heartS';
    const p = new Pickup(g, this.x, this.y - 6, drop, '', true);
    if (drop === 'gold') p.amount = 1 + Math.floor(Math.random() * 4);
    g.spawn(p);
  }
}

// ---------------------------------------------------------------- pickups
export class Pickup extends Ent {
  vx = 0;
  vy = -2.6;
  onGround = false;
  t = 0;
  life: number;
  /** If set, a placed pickup drifts down to this y (boss rewards appearing). */
  sinkTo?: number;
  /** Column of light over a boss reward, so it can't be missed (see setBeacon). */
  beam: THREE.Mesh | null = null;
  /** How many coins a 'gold' pickup is worth. */
  amount = 1;
  constructor(g: Game, x: number, y: number, public kind: string, public key = '', dropped = false) {
    super();
    this.x = x;
    this.y = y;
    this.hw = 5;
    this.hh = 5;
    this.life = dropped ? 720 : Infinity;
    if (!dropped) this.vy = 0;
    const frame = ITEMS[kind] ? ITEMS[kind].icon : kind;
    this.sprite = new Sprite(g.sheets.items, g.view.sprites, 9);
    this.sprite.setFrame(g.sheets.items.anims[frame][0]);
    if (kind === 'heartS') this.vy = -1.5;
  }
  /** Mark this pickup as a boss reward: a pulsing column of light, rising sparkles and a HUD arrow. */
  setBeacon(g: Game) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { t: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `
        varying vec2 vUv; uniform float t;
        void main(){
          float x = abs(vUv.x - 0.5) * 2.0;
          float a = (1.0 - x * x) * pow(1.0 - vUv.y, 0.6) * (0.55 + 0.25 * sin(t * 4.0 + vUv.y * 9.0));
          a = floor(a * 6.0) / 6.0;
          gl_FragColor = vec4(vec3(1.0, 0.85, 0.45) * a, 1.0);
        }`,
    });
    this.beam = new THREE.Mesh(new THREE.PlaneGeometry(26, 220), mat);
    this.beam.renderOrder = 8;
    this.beam.frustumCulled = false;
    g.view.sprites.add(this.beam);
    g.beacons.push(this);
  }
  destroy() {
    if (this.beam) {
      this.beam.removeFromParent();
      this.beam.geometry.dispose();
      (this.beam.material as THREE.Material).dispose();
      this.beam = null;
    }
    super.destroy();
  }
  update(g: Game) {
    this.t++;
    if (this.beam) {
      // the beam stands on the item and reaches up past the top of the screen
      this.beam.position.set(this.x, -(this.y - 102), 0);
      (this.beam.material as THREE.ShaderMaterial).uniforms.t.value = this.t / 60;
      if (this.t % 5 === 0) g.fx.burst(this.x + rand(-8, 8), this.y + 4, 'mote', 1, 0, { vy: -1.2, life: 50, fade: true, glow: 1 });
      if (this.t % 90 === 1) g.audio.play('chime');
    }
    const placed = this.life === Infinity;
    if (!placed) {
      if (this.kind === 'heartS' && !this.onGround) {
        // small hearts sway down like leaves
        this.vy = Math.min(this.vy + 0.08, 0.7);
        this.vx = Math.sin(this.t * 0.08) * 0.8;
      } else this.vy = Math.min(this.vy + 0.18, 4);
      if (this.kind === 'shard' && this.t > 30 && g.player.alive) {
        // a soul shard rises off the floor and floats to her, quicker as it closes in
        const p = g.player, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(4, 0.6 + (this.t - 30) * 0.03);
        this.x += (dx / d) * sp;
        this.y += (dy / d) * sp;
        this.vx = this.vy = 0;
        if (this.t % 4 === 0) g.fx.burst(this.x, this.y, 'mote', 1, 0, { life: 18, fade: true, glow: 1 });
      } else moveBody(g.room, this, true);
      if (this.onGround) this.vx = 0;
    }
    if (this.sinkTo !== undefined && this.y < this.sinkTo) this.y = Math.min(this.sinkTo, this.y + 0.8);
    if (this.t > this.life) this.dead = true;
    const bob = placed ? Math.sin(this.t * 0.08) * 1.5 : 0;
    this.sprite!.place(this.x, this.y + bob);
    this.sprite!.visible = !(this.life - this.t < 120 && Math.floor(this.t / 4) % 2 === 0);
    if (placed && ITEMS[this.kind]) this.sprite!.glow = 0.25 + Math.sin(this.t * 0.1) * 0.25;
    const p = g.player;
    if (p.alive && overlap(this, { x: p.x, y: p.y, hw: p.hw + 2, hh: p.hh })) this.collect(g);
  }
  collect(g: Game) {
    this.dead = true;
    const h = g.hunter;
    if (this.key) h.collected.push(this.key);
    switch (this.kind) {
      case 'heartS':
        h.hearts = Math.min(h.maxHearts, h.hearts + 1);
        g.audio.play('heart');
        return;
      case 'heartB':
        h.hearts = Math.min(h.maxHearts, h.hearts + 5);
        g.audio.play('heart');
        return;
      case 'meat':
        h.hp = Math.min(h.maxHp, h.hp + 30);
        g.damageNumber(g.player.x, g.player.y - 24, 30, '#60ff80');
        g.audio.play('item');
        return;
      case 'gold':
        h.gold += this.amount;
        g.damageNumber(g.player.x, g.player.y - 24, this.amount, '#f0d060');
        g.audio.play('coin');
        return;
      case 'shard':
        h.shards++;
        g.message('SOUL SHARD');
        g.audio.play('chime');
        return;
    }
    const it = ITEMS[this.kind];
    if (!it) return;
    h.addItem(this.kind);
    g.audio.play(it.slot === 'relic' ? 'relic' : 'item');
    let note = '';
    if (it.slot === 'whip') {
      const cur = ITEMS[h.equip.whip];
      if ((it.atk || 0) > (cur.atk || 0)) {
        h.equip.whip = it.id;
        note = 'EQUIPPED';
      }
    } else if (it.slot === 'armor') {
      const cur = ITEMS[h.equip.armor];
      if ((it.def || 0) > (cur.def || 0)) {
        h.equip.armor = it.id;
        note = 'EQUIPPED';
      }
    } else if (it.slot === 'acc') {
      if (!h.equip.acc1) {
        h.equip.acc1 = it.id;
        note = 'EQUIPPED';
      } else if (!h.equip.acc2) {
        h.equip.acc2 = it.id;
        note = 'EQUIPPED';
      }
    }
    if (it.slot === 'relic') {
      g.showDialog(RELIC_TEXT[it.id] || [it.name.toUpperCase(), '', it.desc]);
    } else if (it.slot === 'sub') {
      const lines = [it.name.toUpperCase(), '', it.desc, 'Press SUB-WEAPON (C / L / PAD Y) to throw.'];
      if (h.subs.length > 1) lines.push('Q / E or LB / RB switch sub-weapons.');
      g.showDialog(lines);
    } else g.message(`${it.name}${note ? ' - ' + note : ''}`, 150);
  }
}

// ---------------------------------------------------------------- grapple ring
export class RingAnchor extends Ent {
  t = 0;
  constructor(g: Game, x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.sprite = new Sprite(g.sheets.items, g.view.sprites, 7);
    this.sprite.setFrame(g.sheets.items.anims.ringAnchor[0]);
    this.sprite.place(x, y - 1);
    g.rings.push(this);
  }
  update(g: Game) {
    this.t++;
    const p = g.player;
    const near = g.hunter.grapple && Math.hypot(p.x - this.x, p.y - 20 - this.y) < g.hunter.whipLen + 16;
    this.sprite!.glow = near ? 0.3 + Math.sin(this.t * 0.2) * 0.3 : 0;
  }
}

// ---------------------------------------------------------------- save altar
export class Altar extends Ent {
  t = 0;
  cool = 0;
  constructor(g: Game, x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.hw = 14;
    this.hh = 16;
    this.sprite = new Sprite(g.sheets.candle, g.view.sprites, 8);
    this.sprite.place(x, y);
  }
  update(g: Game) {
    this.t += 1 / 60;
    if (this.cool > 0) this.cool--;
    this.sprite!.anim('altar', this.t, 5);
    this.sprite!.glow = 0.2 + Math.sin(this.t * 3) * 0.2;
    const p = g.player;
    const near = Math.abs(p.x - this.x) < 18 && Math.abs(p.bottom - (this.y + 16)) < 20 && p.onGround;
    if (near) {
      g.hint = 'UP: REST AND SAVE';
      if (g.input.pressed('up') && this.cool === 0 && p.state === 'normal') {
        this.cool = 60;
        const h = g.hunter;
        h.hp = h.maxHp;
        h.hearts = Math.max(h.hearts, Math.min(h.maxHearts, h.hearts + 10));
        const ok = !g.testRun && h.save(g.room.def.id); // test rooms never touch the real save
        g.audio.play('save');
        g.fx.burst(this.x, this.y - 8, 'mote', 16, 10, { vy: -0.8, life: 60, fade: true, glow: 1 });
        g.message(ok ? 'HP RESTORED - GAME SAVED' : g.testRun ? 'HP RESTORED (TEST ROOM - NOT SAVED)' : 'HP RESTORED (SAVE UNAVAILABLE)', 150);
      }
    }
  }
}

// ---------------------------------------------------------------- signposts and lore stones
/**
 * 'T' entities. If the arg is a HINTS key it's a signpost that shows a control hint
 * while the hero is nearby. If it's a LORE key it's a stone she can read with UP.
 */
export class Sign extends Ent {
  t = 0;
  lore: boolean;
  constructor(g: Game, x: number, private bottom: number, public key: string) {
    super();
    this.x = x;
    this.y = bottom - 16;
    this.lore = !!LORE[key];
    this.sprite = new Sprite(g.sheets.candle, g.view.sprites, 7);
    this.sprite.setFrame(g.sheets.candle.anims[this.lore ? 'stone' : 'sign'][0]);
    this.sprite.place(x, bottom - 16);
  }
  update(g: Game) {
    this.t++;
    const p = g.player, dx = Math.abs(p.x - this.x), dy = Math.abs(p.bottom - this.bottom);
    if (this.lore) {
      this.sprite!.glow = 0.15 + Math.sin(this.t * 0.06) * 0.15;
      if (dx < 20 && dy < 24 && p.onGround) {
        g.hint = `${g.input.label('up')}: READ`;
        if (g.input.pressed('up') && p.state === 'normal') {
          g.audio.play('confirm');
          g.showDialog(LORE[this.key]);
        }
      }
    } else if (dx < 36 && dy < 48 && HINTS[this.key]) g.hint = HINTS[this.key]((a) => g.input.label(a));
  }
}

// ---------------------------------------------------------------- holy water
export class HolyFlask extends Ent {
  vx: number;
  vy = -3.4;
  onGround = false;
  constructor(g: Game, x: number, y: number, dir: number) {
    super();
    this.x = x;
    this.y = y;
    this.hw = 3;
    this.hh = 3;
    this.vx = dir * 2.5;
    this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 14);
    this.sprite.setFrame(g.sheets.fx.anims.holyfly[0]);
  }
  update(g: Game) {
    this.vy = Math.min(this.vy + 0.22, 5);
    const r = moveBody(g.room, this, true);
    this.sprite!.place(this.x, this.y);
    this.sprite!.mesh.rotation.z -= 0.25 * Math.sign(this.vx || 1);
    let hitEnemy = false;
    for (const e of g.ents) if (e.hostile && e.whipTarget && overlap(this, e)) hitEnemy = true;
    if (r.hitX || r.hitY || hitEnemy || this.y > g.room.H) {
      this.dead = true;
      g.audio.play('glass');
      g.fx.burst(this.x, this.y, 'glass', 4, 4, { speed: 2, grav: 0.2, life: 25 });
      // find floor below
      let fy = -1;
      for (let y = this.y; y < this.y + 64; y += 4) {
        const tx = Math.floor(this.x / TILE), ty = Math.floor(y / TILE);
        if (g.room.floorAt(tx, ty)) {
          fy = ty * TILE;
          break;
        }
      }
      if (fy >= 0) g.spawn(new HolyFire(g, this.x, fy));
    }
  }
}

export class HolyFire extends Ent {
  t = 0;
  flames: Sprite[] = [];
  hid = 0;
  constructor(g: Game, x: number, floorY: number) {
    super();
    this.x = x;
    this.y = floorY - 14;
    this.hw = 20;
    this.hh = 14;
    for (let i = 0; i < 3; i++) {
      const s = new Sprite(g.sheets.fire, g.view.sprites, 15);
      s.place(x + (i - 1) * 14, floorY);
      this.flames.push(s);
    }
    g.audio.play('fire');
  }
  update(g: Game) {
    this.t++;
    this.flames.forEach((s, i) => {
      s.anim('holyfire', this.t / 60 + i * 0.13, 14);
      const grow = Math.min(1, this.t / 8) * (this.t > 70 ? Math.max(0, (90 - this.t) / 20) : 1);
      s.mesh.scale.y = 32 * grow;
      s.mesh.position.y = -(this.y + 14) + 16 * grow;
      s.glow = 0.3;
    });
    if (this.t % 10 === 1) this.hid = g.newHitId();
    g.attackBox(this, this.hid, 5 + g.hunter.str * 0.7, this.x, 'holy');
    if (this.t % 6 === 0) g.fx.burst(this.x + rand(-16, 16), this.y - 10, 'ember', 1, 0, { vy: -1, life: 24, tint: [0.6, 0.8, 1.6] });
    if (this.t >= 90) this.dead = true;
  }
  destroy() {
    for (const s of this.flames) s.dispose();
    super.destroy();
  }
}

// ---------------------------------------------------------------- cross
export class CrossProj extends Ent {
  vx: number;
  t = 0;
  dir: number;
  hid = 0;
  constructor(g: Game, x: number, y: number, dir: number) {
    super();
    this.x = x;
    this.y = y;
    this.hw = 7;
    this.hh = 7;
    this.dir = dir;
    this.vx = dir * 5.6;
    this.sprite = new Sprite(g.sheets.items, g.view.sprites, 14);
    this.sprite.setFrame(g.sheets.items.anims.cross[0]);
  }
  update(g: Game) {
    this.t++;
    this.vx -= this.dir * 0.15;
    this.x += this.vx;
    const p = g.player;
    if (this.t > 30) this.y += Math.sign(p.y - 4 - this.y) * 0.6;
    this.sprite!.place(this.x, this.y);
    this.sprite!.mesh.rotation.z += 0.35 * this.dir;
    this.sprite!.glow = 0.2;
    if (this.t % 14 === 1) {
      this.hid = g.newHitId();
      if (this.t % 28 === 1) g.audio.play('cross');
    }
    g.attackBox(this, this.hid, 10 + g.hunter.str * 0.9, this.x - this.vx, 'cross');
    if (this.t > 30 && overlap(this, p)) this.dead = true;
    if (this.t > 200 || this.x < -64 || this.x > g.room.W + 64) this.dead = true;
  }
}

// ---------------------------------------------------------------- throwing knife
/**
 * A fast, straight dagger with a streak behind it. Weak, but it marks what it hits: the
 * next other hit on that enemy ignores half its DEF (see Enemy.onHit and Game.dealHit).
 * It stops at the first thing it hits.
 */
export class KnifeProj extends Ent {
  t = 0;
  hid: number;
  constructor(g: Game, x: number, y: number, public dir: number) {
    super();
    this.x = x;
    this.y = y;
    this.hw = 6;
    this.hh = 2;
    this.hid = g.newHitId();
    this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 14);
    this.sprite.setFrame(g.sheets.fx.anims.knife[0]);
  }
  update(g: Game) {
    this.t++;
    const step = this.dir * 7.5;
    this.x += step;
    this.sprite!.place(this.x, this.y, this.dir < 0);
    // a fading streak along its path (two per frame so it doesn't break up at this speed)
    for (const k of [0.25, 0.75]) g.fx.burst(this.x - step * k - this.dir * 6, this.y, 'streak', 1, 0, { life: 9, fade: true, order: 13, glow: 0.4 });
    if (g.attackBox(this, this.hid, 3 + g.hunter.str * 0.4, this.x - step, 'knife')) {
      this.dead = true;
      return;
    }
    if (g.room.solidPx(this.x + this.dir * 5, this.y)) {
      this.dead = true;
      g.audio.play('clink');
      g.fx.burst(this.x + this.dir * 4, this.y, 'spark', 1, 0);
    }
    if (this.t > 90 || this.x < -32 || this.x > g.room.W + 32) this.dead = true;
  }
}

// ---------------------------------------------------------------- enemy projectiles
/**
 * A boss shakes the ceiling loose: `count` stones (or burning cinders) drop one after another
 * over `over` frames, spread across what the camera shows, and every third one aimed right
 * where the hero is standing. Each gives a short warning first: grit trickling down from the
 * spot it will fall from. Stones fall from the ceiling, or the top of the screen if the
 * ceiling is out of sight.
 */
export class Rockfall extends Ent {
  t = 0;
  drops: { x: number; at: number; warned: boolean }[] = [];
  constructor(
    g: Game,
    count: number,
    public kind: 'rock' | 'fireball' | 'bone' | 'icicle' = 'rock',
    public dmg = 16,
    over = 70,
  ) {
    super();
    for (let i = 0; i < count; i++) drops(this, g, i, count, over);
  }
  update(g: Game) {
    this.t++;
    const v = g.view, top = Math.max(24, v.camY - 6);
    for (const d of this.drops) {
      if (this.t >= d.at - WARN && this.t < d.at && this.t % 4 === 0) {
        g.fx.burst(d.x, top, 'dust', 1, 3, { vy: 0.8, life: 18, fade: true });
        if (!d.warned) {
          d.warned = true;
          g.fx.burst(d.x, top, 'mote', 3, 4, { vy: 1.2, life: 26, fade: true, tint: [0.8, 0.75, 0.7] });
        }
      }
      if (this.t === d.at) g.spawn(new EnemyShot(g, d.x, top, 0, 0.6, this.kind, this.dmg, 0.16));
    }
    if (this.t > Math.max(...this.drops.map((d) => d.at))) this.dead = true;
  }
}
const WARN = 30; // frames of trickling grit before each stone drops
function drops(rf: Rockfall, g: Game, i: number, count: number, over: number) {
  const v = g.view, p = g.player, W = g.room.W;
  const l = Math.max(24, v.camX + 12), r = Math.min(W - 24, v.camX + v.viewW - 12);
  const x = i % 3 === 0 ? p.x + rand(-14, 14) : rand(l, r);
  rf.drops.push({ x: Math.max(l, Math.min(r, x)), at: WARN + Math.round((i / Math.max(1, count - 1)) * over), warned: false });
}

export class EnemyShot extends Ent {
  vx: number;
  vy: number;
  grav: number;
  t = 0;
  frames: number[];
  constructor(g: Game, x: number, y: number, vx: number, vy: number, kind: 'bone' | 'fireball' | 'bigfire' | 'feather' | 'rock' | 'book' | 'web' | 'icicle' | 'glass' | 'slime', dmg: number, grav = 0) {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.grav = grav;
    this.hw = kind === 'bigfire' ? 8 : 5;
    this.hh = this.hw;
    this.touchDmg = dmg;
    this.hostile = true;
    const sheetName = 'fx';
    this.sprite = new Sprite(g.sheets[sheetName], g.view.sprites, 14);
    this.frames = g.sheets.fx.anims[kind === 'bigfire' ? 'fireball' : kind];
    if (kind === 'bigfire') this.sprite.mesh.scale.set(24, 24, 1);
    this.kind = kind;
  }
  kind: string;
  /** Fire is magic (the shield can't stop it); bones, books, feathers, rocks and webs are physical. */
  hitType(): DmgType {
    return this.kind === 'fireball' || this.kind === 'bigfire' ? 'magic' : 'shot';
  }
  /** It reached the hero. `hurt` is false if the shield or a ward stopped it. */
  strike(g: Game, hurt: boolean) {
    this.dead = true;
    if (this.kind === 'web') {
      g.fx.burst(this.x, this.y, 'web', 1, 0, { life: 14, fade: true });
      if (hurt) g.player.web(150);
    } else if (this.kind === 'slime') {
      // venom: a poison that eats at her for four seconds
      g.fx.burst(this.x, this.y, 'slime', 3, 6, { life: 20, fade: true });
      if (hurt) g.player.poison(240, 2);
    } else g.fx.burst(this.x, this.y, 'burst', 1);
  }
  update(g: Game) {
    this.t++;
    this.vy += this.grav;
    this.x += this.vx;
    this.y += this.vy;
    this.sprite!.setFrame(this.frames[Math.floor(this.t / 5) % this.frames.length]);
    const fiery = this.kind === 'fireball' || this.kind === 'bigfire';
    if (this.kind === 'feather' || this.kind === 'glass') {
      // darts and glass splinters point along their flight
      this.sprite!.place(this.x, this.y);
      this.sprite!.mesh.rotation.z = -Math.atan2(this.vy, this.vx);
    } else this.sprite!.place(this.x, this.y, this.vx < 0);
    // tumbling shots spin; a book thrown in an arc tumbles, one thrown straight just flaps
    const spins = this.kind === 'bone' || this.kind === 'rock' || (this.kind === 'book' && this.grav > 0);
    if (spins) this.sprite!.mesh.rotation.z += (this.kind === 'book' ? 0.2 : 0.3) * (Math.sign(this.vx) || 1);
    if (fiery && this.t % 4 === 0) g.fx.burst(this.x, this.y, 'ember', 1, 2, { life: 16, vy: -0.3 });
    if (this.t > 360 || this.y > g.room.H + 32 || this.x < -32 || this.x > g.room.W + 32) this.dead = true;
    if (this.kind !== 'bone' && this.kind !== 'bigfire' && g.room.solidPx(this.x, this.y)) {
      this.dead = true;
      if (this.kind === 'web') g.fx.burst(this.x, this.y, 'web', 1, 0, { life: 30, fade: true });
      else if (this.kind === 'book') g.fx.burst(this.x, this.y, 'page', 4, 4, { speed: 1.2, grav: 0.03, life: 40, rot: 0.2, fade: true });
      else if (this.kind === 'icicle' || this.kind === 'glass') g.fx.burst(this.x, this.y, 'glass', 3, 4, { speed: 1.2, grav: 0.1, life: 24, fade: true });
      else g.fx.burst(this.x, this.y, fiery ? 'burst' : 'dust', 1);
    }
  }
}

/** Roll the enemy's drop table (ENEMY[kind].drops). At most one item drops. */
export function rollEnemyDrop(g: Game, kind: string, x: number, y: number) {
  dropGold(g, kind, x, y);
  const drops = ENEMY[kind]?.drops || [];
  // one roll against stacked chances; rarer items are checked first
  const sorted = [...drops].sort((a, b) => a.chance - b.chance);
  let r = Math.random() * 100;
  for (const d of sorted) {
    r -= dropChance(d.chance, g.hunter.lck);
    if (r < 0) {
      g.spawn(new Pickup(g, x, y, d.item, '', true));
      return;
    }
  }
}

/** Chance (%) an enemy drops coins, and a soul shard (luck raises both). */
const GOLD_CHANCE = 55;
const SHARD_CHANCE = 1.5;

/**
 * Coins (and, rarely, a soul shard) from a kill, rolled apart from its drop table. Tougher
 * enemies (more XP) drop more: about half to all of their XP in gold, a pile past 10.
 */
function dropGold(g: Game, kind: string, x: number, y: number) {
  const lck = g.hunter.lck;
  if (Math.random() * 100 < dropChance(SHARD_CHANCE, lck)) g.spawn(new Pickup(g, x, y - 4, 'shard', '', true));
  if (Math.random() * 100 >= dropChance(GOLD_CHANCE, lck)) return;
  const amount = Math.max(1, Math.round((ENEMY[kind]?.xp || 4) * (0.5 + Math.random() * 0.5)));
  const p = new Pickup(g, x + rand(-4, 4), y, 'gold', '', true);
  p.amount = amount;
  if (amount > 10) p.sprite!.setFrame(g.sheets.items.anims.goldPile[0]);
  p.vx = rand(-0.6, 0.6);
  g.spawn(p);
}

// ---------------------------------------------------------------- lever (opens gates, drains water)
export class Lever extends Ent {
  t = 0;
  pulled: boolean;
  constructor(g: Game, x: number, bottom: number, public flag: string) {
    super();
    this.x = x;
    this.hw = 7;
    this.hh = 14; // taller than the art so a standing whip strike connects
    this.y = bottom - this.hh;
    this.pulled = g.hunter.flags.includes(flag);
    this.whipTarget = !this.pulled;
    this.sprite = new Sprite(g.sheets.candle, g.view.sprites, 8);
    this.sprite.place(x, bottom - 16);
  }
  update(g: Game) {
    this.t++;
    const A = g.sheets.candle.anims.lever;
    this.sprite!.setFrame(A[this.pulled ? 1 : 0]);
    // the unpulled lever's gem pulses so it reads as "hit me"
    this.sprite!.glow = this.pulled ? 0 : 0.2 + Math.sin(this.t * 0.12) * 0.2;
  }
  onHit(g: Game) {
    if (this.pulled) return;
    this.pulled = true;
    this.whipTarget = false;
    g.audio.play('lever');
    g.fx.burst(this.x, this.y - 4, 'spark', 1, 2);
    g.shake(2, 10);
    g.setFlag(this.flag);
  }
}

export type { HitKind };

// ---------------------------------------------------------------- dropped shield
/**
 * The hero's shield knocked out of her hand (a touch or magic hit while it's on cooldown):
 * it flies off behind her, bounces on the floor, blinks and fades. Only for show: it tells
 * the player why the shield won't come up for a moment.
 */
export class ShieldDrop extends Ent {
  t = 0;
  vx: number;
  vy = -2.6;
  bounces = 0;
  onGround = false;
  constructor(g: Game, x: number, y: number, dir: number, frame: number, private flip: boolean) {
    super();
    this.x = x;
    this.y = y;
    this.hw = 4;
    this.hh = 4;
    this.vx = dir * 1.3;
    this.sprite = new Sprite(g.sheets.relicfx, g.view.sprites, 13);
    this.sprite.setFrame(frame);
  }
  update(g: Game) {
    this.t++;
    this.vy = Math.min(this.vy + 0.22, 5);
    const falling = this.vy;
    const r = moveBody(g.room, this, true);
    if (r.landed) {
      // a couple of shrinking bounces, then it lies flat
      if (this.bounces < 2 && falling > 1) {
        this.vy = -falling * 0.45;
        this.vx *= 0.6;
        this.bounces++;
        g.audio.play('clink');
      }
    }
    if (this.onGround) this.vx *= 0.85; // scrapes to a stop
    if (r.hitX) this.vx = -this.vx * 0.5;
    const s = this.sprite!;
    // tumbling while airborne, settled flat once it's down
    s.mesh.rotation.z = this.bounces < 2 ? -this.t * 0.25 * Math.sign(this.vx || 1) : Math.PI / 2;
    s.place(this.x, this.y, this.flip);
    // blinks out over its last half second (the shield cooldown is 1.5 s)
    if (this.t > 50) s.visible = Math.floor(this.t / 4) % 2 === 0;
    if (this.t > 80) this.dead = true;
  }
}

// ---------------------------------------------------------------- the hexed whip

/** Something holding the hero's whip away from her: it settles up when she leaves the room. */
export interface WhipHolder extends Ent {
  leaveRoom(g: Game): void;
}

/**
 * Where something dropped at (x, y) comes to rest: the first floor straight below with room
 * above it (not spikes), or failing that the nearest such floor to the side. [x, floorY].
 */
function floorSpot(g: Game, x: number, y: number): [number, number] {
  const r = g.room;
  const down = (cx: number) => {
    const tx = Math.floor(cx / TILE);
    for (let ty = Math.max(1, Math.floor(y / TILE)); ty < r.rows; ty++) {
      if (!r.floorAt(tx, ty) || r.solidAt(tx, ty - 1)) continue;
      return r.tile(tx, ty - 1) === '^' ? -1 : ty * TILE;
    }
    return -1;
  };
  for (let d = 0; d < r.W; d += TILE)
    for (const cx of d ? [x - d, x + d] : [x]) {
      if (cx < TILE || cx > r.W - TILE) continue;
      const fy = down(cx);
      if (fy >= 0) return [cx, fy];
    }
  return [x, y];
}

/**
 * A Gloomcaster's hex tore the whip from her hand and sealed it in a violet bubble that
 * drifts about at random. Touching it pops it and she has her whip back. Left alone, it
 * pops by itself after `life` frames: softcore, the whip flies back to her (WhipReturn);
 * hardcore, it drops to the floor and stays there until she picks it up (WhipDrop).
 */
export class WhipBubble extends Ent implements WhipHolder {
  t = 0;
  vx: number;
  vy = -1.6;
  turnT = 20; // frames to its next change of course
  whip: Sprite;
  constructor(g: Game, x: number, y: number, dir: number, private hard: boolean, private life = rand(180, 300)) {
    super();
    this.x = x;
    this.y = y;
    this.hw = this.hh = 10;
    this.vx = dir * 1.4;
    this.whip = new Sprite(g.sheets.items, g.view.sprites, 13);
    this.whip.setFrame(g.sheets.items.anims.whip[0]);
    this.sprite = new Sprite(g.sheets.relicfx, g.view.sprites, 14);
    this.sprite.glow = 0.3;
  }
  update(g: Game) {
    this.t++;
    const r = g.room, p = g.player;
    // an erratic drift: a fresh random heading every so often, with a nervous wobble on top
    if (--this.turnT <= 0) {
      this.turnT = rand(15, 40);
      const a = rand(0, Math.PI * 2), sp = rand(0.5, 1.6);
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp * 0.7;
    }
    const wob = Math.sin(this.t * 0.3) * 0.4;
    const nx = this.x + this.vx + wob, ny = this.y + this.vy + Math.cos(this.t * 0.23) * 0.3;
    // bounce off walls and stay well inside the room
    if (nx < 16 || nx > r.W - 16 || r.solidPx(nx + Math.sign(this.vx) * 10, this.y)) this.vx = -this.vx;
    else this.x = nx;
    if (ny < 20 || ny > r.H - 24 || r.solidPx(this.x, ny + Math.sign(this.vy) * 10)) this.vy = -this.vy;
    else this.y = ny;
    const s = this.sprite!;
    s.anim('hexBubble', this.t / 60, 8);
    s.place(this.x, this.y);
    this.whip.mesh.rotation.z = Math.sin(this.t * 0.05) * 0.6;
    this.whip.place(this.x, this.y);
    if (this.t % 8 === 0) g.fx.burst(this.x + rand(-9, 9), this.y + rand(-9, 9), 'mote', 1, 0, { life: 20, fade: true, tint: [1.3, 0.6, 1.6], glow: 0.8 });
    // the last second it shivers and blinks: about to pop
    if (this.life - this.t < 60) s.visible = Math.floor(this.t / 3) % 2 === 0;
    if (this.t > 20 && p.alive && overlap(this, p)) return this.pop(g, true);
    if (this.t >= this.life) this.pop(g, false);
  }
  /** Burst: `touched` = she popped it and takes the whip straight back. */
  pop(g: Game, touched: boolean) {
    this.dead = true;
    g.audio.play('glass');
    g.fx.burst(this.x, this.y, 'star', 8, 10, { speed: 1.6, life: 26, fade: true, tint: [1.3, 0.7, 1.6] });
    const p = g.player;
    if (touched) {
      p.whipEnt = null;
      g.audio.play('item');
      return;
    }
    const next = this.hard ? new WhipDrop(g, this.x, this.y, false) : new WhipReturn(g, this.x, this.y);
    p.whipEnt = this.hard ? null : (next as WhipReturn);
    g.spawn(next);
  }
  /** She left the room before it popped. Hardcore, the whip falls where the bubble was. */
  leaveRoom(g: Game) {
    if (!this.hard) return;
    const [x, fy] = floorSpot(g, this.x, this.y);
    g.hunter.lostWhip = { room: g.room.def.id, x, y: fy - 4 };
  }
  destroy() {
    this.whip.dispose();
    super.destroy();
  }
}

/** Softcore: the whip, freed from its bubble, flies back to her hand. */
export class WhipReturn extends Ent implements WhipHolder {
  t = 0;
  constructor(g: Game, x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.sprite = new Sprite(g.sheets.items, g.view.sprites, 13);
    this.sprite.setFrame(g.sheets.items.anims.whip[0]);
    this.sprite.glow = 0.5;
  }
  update(g: Game) {
    this.t++;
    const p = g.player, dx = p.x - this.x, dy = p.y - 6 - this.y, d = Math.hypot(dx, dy);
    const sp = Math.min(7, 1 + this.t * 0.15);
    if (d < sp + 4 || !p.alive) {
      this.dead = true;
      p.whipEnt = null;
      g.audio.play('item');
      g.fx.burst(p.x, p.y - 6, 'star', 5, 6, { life: 20, fade: true });
      return;
    }
    this.x += (dx / d) * sp;
    this.y += (dy / d) * sp;
    const s = this.sprite!;
    s.mesh.rotation.z = this.t * 0.4;
    s.place(this.x, this.y);
    if (this.t % 3 === 0) g.fx.burst(this.x, this.y, 'mote', 1, 0, { life: 14, fade: true, glow: 1 });
  }
  leaveRoom() {} // it reached her on the way out
}

/**
 * Hardcore: the whip lies on the floor where it fell (Hunter.lostWhip remembers the spot,
 * even across rooms and saves) until she walks over it. `placed` = loaded from that spot.
 */
export class WhipDrop extends Ent {
  t = 0;
  vy = 0;
  landed: boolean;
  constructor(g: Game, x: number, y: number, placed: boolean) {
    super();
    this.hw = this.hh = 5;
    this.landed = placed;
    if (placed) {
      this.x = x;
      this.y = y;
    } else {
      // it falls straight down (or, over a pit or water, to the nearest floor beside it)
      const [fx, fy] = floorSpot(g, x, y);
      this.x = fx;
      this.y = fx === x ? y : Math.min(y, fy - 4);
      this.floorY = fy - 4;
      g.hunter.lostWhip = { room: g.room.def.id, x: fx, y: fy - 4 };
    }
    this.sprite = new Sprite(g.sheets.items, g.view.sprites, 9);
    this.sprite.setFrame(g.sheets.items.anims.whip[0]);
  }
  floorY = 0;
  update(g: Game) {
    this.t++;
    if (!this.landed) {
      this.vy = Math.min(this.vy + 0.25, 5);
      this.y += this.vy;
      if (this.y >= this.floorY) {
        this.y = this.floorY;
        this.landed = true;
        g.audio.play('clink');
        g.fx.burst(this.x, this.y + 3, 'dust', 2, 4);
      }
    }
    const s = this.sprite!;
    s.glow = 0.2 + Math.sin(this.t * 0.1) * 0.2;
    s.place(this.x, this.y);
    const p = g.player;
    if (this.landed && p.alive && overlap(this, { x: p.x, y: p.y, hw: p.hw + 2, hh: p.hh })) {
      this.dead = true;
      g.hunter.lostWhip = null;
      g.audio.play('item');
      g.message('WHIP RECOVERED', 120);
    }
  }
}

// ---------------------------------------------------------------- merchant

/**
 * Pell, the ghost who keeps a shop in the Reader's Nook. The first time the hero comes
 * near, he introduces himself (the 'met_pell' flag); after that, UP by him talks and
 * opens the shop (UI.openShop).
 */
export class Merchant extends Ent {
  t = 0;
  bottom: number;
  constructor(g: Game, x: number, bottom: number) {
    super();
    this.x = x;
    this.bottom = bottom;
    this.hw = 8;
    this.hh = 16;
    this.y = bottom - 20;
    this.sprite = new Sprite(g.sheets.pell, g.view.sprites, 9);
  }
  update(g: Game) {
    this.t++;
    const p = g.player, h = g.hunter, s = this.sprite!;
    const dx = Math.abs(p.x - this.x), dy = Math.abs(p.bottom - this.bottom);
    const free = p.alive && p.onGround && p.state === 'normal';
    if (!h.flags.includes('met_pell')) {
      // the first meeting starts by itself as she walks up
      if (free && dx < 80 && dy < 40) {
        h.flags.push('met_pell');
        g.talk('pell_meet', () => g.ui.openShop());
      }
    } else if (dx < 22 && dy < 30) {
      g.hint = `${g.input.label('up')}: TALK`;
      if (free && g.input.pressed('up')) g.talk('pell_again', () => g.ui.openShop());
    }
    // he reads until she comes close, then looks up at her
    const near = dx < 70 && dy < 40;
    s.anim(near ? 'turn' : 'idle', this.t / 60, 3);
    s.place(this.x, this.bottom - 4 + Math.sin(this.t * 0.05) * 2, near && p.x < this.x);
    s.glow = 0.25;
    if (this.t % 18 === 0) g.fx.burst(this.x + rand(-6, 6), this.bottom - 6, 'mote', 1, 0, { vy: -0.4, life: 30, fade: true, glow: 0.5, tint: [0.8, 1, 1.3] });
  }
}

// ---------------------------------------------------------------- warp (RoomDef.warp)

/** A glowing breach the hero steps through with UP: it carries her to another room (the way out of the Colossus). */
export class Warp extends Ent {
  t = 0;
  constructor(g: Game, private w: { x: number; y: number; to: string; tx: number; ty: number }) {
    super();
    this.x = w.x * TILE + 8;
    this.y = (w.y + 1) * TILE - 24;
    this.hw = 12;
    this.hh = 24;
    this.sprite = new Sprite(g.sheets.colossus, g.view.sprites, 7);
  }
  update(g: Game) {
    this.t++;
    const s = this.sprite!, p = g.player;
    s.setFrame(g.sheets.colossus.anims.door[Math.floor(this.t / 10) % 2]);
    s.place(this.x, this.y);
    s.glow = 0.4 + Math.sin(this.t * 0.1) * 0.2;
    if (this.t % 12 === 0) g.fx.burst(this.x + rand(-8, 8), this.y + rand(-16, 16), 'ember', 1, 3, { vy: -0.5, life: 30 });
    if (!p.alive || !overlap(this, p)) return;
    g.hint = `${g.input.label('up')}: LEAVE`;
    const to = g.defs.find((d) => d.id === this.w.to);
    if (to && g.input.pressed('up') && g.state === 'play') {
      g.audio.play('fire');
      g.trans = { t: 0, to, x: this.w.tx * TILE + 8, y: (this.w.ty + 1) * TILE - p.hh, vx: 0, vy: 0 };
      g.state = 'transition';
    }
  }
}
