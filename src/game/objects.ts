import * as THREE from 'three';
import { Sprite } from '../gfx/view';
import { Ent, HitKind } from './ent';
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
    const drop = r < 4 ? 'potion' : r < 9 ? 'meat' : r < 22 ? 'heartB' : 'heartS';
    g.spawn(new Pickup(g, this.x, this.y - 6, drop, '', true));
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
      moveBody(g.room, this, true);
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
        g.audio.play('heart');
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
    const near = g.hunter.grapple && Math.hypot(p.x - this.x, p.y - 20 - this.y) < g.hunter.whipLen + 24;
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

// ---------------------------------------------------------------- enemy projectiles
export class EnemyShot extends Ent {
  vx: number;
  vy: number;
  grav: number;
  t = 0;
  frames: number[];
  constructor(g: Game, x: number, y: number, vx: number, vy: number, kind: 'bone' | 'fireball' | 'bigfire' | 'feather' | 'rock' | 'book', dmg: number, grav = 0) {
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
  update(g: Game) {
    this.t++;
    this.vy += this.grav;
    this.x += this.vx;
    this.y += this.vy;
    this.sprite!.setFrame(this.frames[Math.floor(this.t / 5) % this.frames.length]);
    const fiery = this.kind === 'fireball' || this.kind === 'bigfire';
    if (this.kind === 'feather') {
      // darts point along their flight
      this.sprite!.place(this.x, this.y);
      this.sprite!.mesh.rotation.z = -Math.atan2(this.vy, this.vx);
    } else this.sprite!.place(this.x, this.y, this.vx < 0);
    // tumbling shots spin; a book thrown in an arc tumbles, one thrown straight just flaps
    const spins = this.kind === 'bone' || this.kind === 'rock' || (this.kind === 'book' && this.grav > 0);
    if (spins) this.sprite!.mesh.rotation.z += (this.kind === 'book' ? 0.2 : 0.3) * (Math.sign(this.vx) || 1);
    if (fiery && this.t % 4 === 0) g.fx.burst(this.x, this.y, 'ember', 1, 2, { life: 16, vy: -0.3 });
    if (this.t > 360 || this.y > g.room.H + 32 || this.x < -32 || this.x > g.room.W + 32) this.dead = true;
    if ((this.kind === 'fireball' || this.kind === 'feather' || this.kind === 'rock' || this.kind === 'book') && g.room.solidPx(this.x, this.y)) {
      this.dead = true;
      if (this.kind === 'book') g.fx.burst(this.x, this.y, 'page', 4, 4, { speed: 1.2, grav: 0.03, life: 40, rot: 0.2, fade: true });
      else g.fx.burst(this.x, this.y, fiery ? 'burst' : 'dust', 1);
    }
  }
}

/** Roll the enemy's drop table (ENEMY[kind].drops). At most one item drops. */
export function rollEnemyDrop(g: Game, kind: string, x: number, y: number) {
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
