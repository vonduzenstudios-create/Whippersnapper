// The Hollow Colossus, walking (0.27.0 trial fight: the Foundry). Test chamber only.
//
// A suit of plate four times her height, with a greatsword and a kite shield. Steel only rings
// under the chain, so the Foundry gives three ways to open him up:
//   - the grate: his overhead cleave comes down where she stood. If that is the iron grate in
//     the middle of the floor, the blade goes through it and sticks, and he bends over it hauling.
//   - the ladle: a crane ladle of slag travels the rail overhead. Whip the ring under it and it
//     pours for a moment: on him, it blinds his visor (he kneels) and leaves his plate glowing hot.
//   - the trough: plate that is hot (from the slag, or from wading the molten channel in a
//     shield rush) cracks when he steps into the quench trough. That window is twice as long.
// His blows: a low sweep (jump it), the cleave (step aside), a stamp (two shockwaves), a shield
// rush (crouch or slide under the shield), and sparks dragged off the floor.
//
// Second half (a scene at half health): the plate bursts and the fire that wore it fights on,
// faster. A rising cut throws waves of flame along the floor, his chest throws rings of embers
// to weave through, and the floor itself heats up a third at a time (take to the catwalks).
// The same three tricks still work: the grate holds the blade, slag hardens on him, the trough douses him.
import { Sprite, Sheet } from '../gfx/view';
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import { BossBase, Target, Beam, SEG, frameAt, frameLoop } from './boss_base';
import { EnemyShot } from './objects';
import { Shockwave } from './enemies_expansion';
import { lazySheet } from '../gfx/lazy';
import { buildIronKnightSheet, buildFoundrySheet } from '../gfx/art_ironknight';
import { clamp, rand } from '../core/util';

const TROUGH_X = 256, TROUGH_R = 48;
const GRATE_X0 = 496, GRATE_X1 = 656;
const CHANNEL_X = 832, CHANNEL_R = 30;
const RAIL_X0 = 350, RAIL_X1 = 810, LADLE_Y = 196; // the ladle's ring hangs at LADLE_Y
const POUR = 80; // frames the slag runs
const REFILL = 600;

export class IronKnight extends BossBase {
  label = 'COLOSSUS';
  sheet: Sheet;
  propSheet: Sheet;
  ladle = { x: 580, dir: 1, pour: 0, empty: 0, s: null as unknown as Sprite };
  channel: Sprite;
  slag: Beam;
  hot = 0; // frames his plate stays glowing
  quenchCool = 0;
  heat = { t: 0, zone: -1 }; // the floor's heat (second half)
  get camZoom() {
    return 1.3;
  }
  constructor(g: Game, x: number) {
    const sheet = lazySheet('ironknight', buildIronKnightSheet);
    super(g, 'colossus2', sheet, 30, 76, 11);
    this.sheet = sheet;
    this.propSheet = lazySheet('foundry', buildFoundrySheet);
    this.x = x;
    this.y = this.floorY - 76;
    this.facing = -1;
    this.put('trough', TROUGH_X, this.floorY, 7);
    for (const gx of [GRATE_X0 + 40, GRATE_X0 + 120]) this.put('grate', gx, this.floorY + 6, 7);
    this.channel = this.put('channel', CHANNEL_X, this.floorY + 7, 7);
    this.ladle.s = this.put('ladle', this.ladle.x, LADLE_Y + 6, 5);
    this.slag = new Beam(g, '#ff7a20', 13);
  }
  put(anim: string, x: number, bottom: number, order: number) {
    const s = new Sprite(this.propSheet, this.g.view.sprites, order);
    s.setFrame(this.propSheet.anims[anim][0]);
    s.place(x, bottom);
    this.props.push(s);
    return s;
  }
  A(name: string) {
    return this.sheet.anims[(this.phase === 2 ? 'bare_' : '') + name];
  }
  get held() {
    return this.pat === 'held';
  }
  hitType(): DmgType {
    return 'melee';
  }
  targets(): Target[] {
    const out: Target[] = [];
    if (!this.ladle.empty) out.push({ id: 'ladle', x: this.ladle.x, y: LADLE_Y, r: 14 });
    // kneeling or bent over his blade, all of him is in reach; standing, it's his legs and belt
    out.push(this.held ? { id: 'body', x: this.x + this.facing * 26, y: this.floorY - 58, r: 46 } : { id: 'body', x: this.x, y: this.floorY - 60, r: 42 });
    return out;
  }
  hurtZones(): Target[] {
    // his legs, except when he is down or rushing (so she can slide between them)
    return this.held || this.pat === 'bash' || this.pat === 'enter' ? [] : [{ id: 'legs', x: this.x, y: this.floorY - 34, r: 16 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id === 'ladle') {
      // the ring under the ladle: it tips
      if (this.ladle.pour || this.ladle.empty) return;
      this.ladle.pour = POUR;
      g.audio.play('chain');
      g.audio.play('flame');
      return;
    }
    if (this.held) {
      g.fx.burst(t.x, t.y, 'ember', 5, 14, { speed: 2, grav: 0.1, life: 30 });
      if (this.strike(g, t.x, this.floorY - 70, kind) && this.held) this.release(g);
      return;
    }
    // plate rings; the bare fire can be chipped at
    if (this.phase === 2) this.chip(g, t.x, t.y);
    else this.clank(g, t.x, t.y);
  }
  hold(g: Game, anim: string, frames: number, msg: string, cap = SEG) {
    this.set('held');
    this.data = { anim, len: frames };
    this.windowDmg = SEG - cap;
    this.clearShots(g);
    g.message(msg, 160);
    g.audio.play('creak');
    g.shake(6, 24);
  }
  release(g: Game) {
    g.shake(5, 24);
    if (this.hp <= this.maxHp / 2 && this.phase === 1) {
      g.bossScene();
      return this.pick('rage');
    }
    g.audio.play('roar');
    this.pick('walk');
  }
  destroy() {
    super.destroy();
    this.slag.dispose();
  }
  /** The Foundry's machinery, every frame. */
  arena(g: Game) {
    const p = g.player, L = this.ladle, fy = this.floorY;
    const live = this.pat !== 'enter' && this.pat !== 'dying' && this.pat !== 'rage';
    // the ladle rides its rail back and forth; struck, it stops and pours
    if (L.pour > 0) {
      L.pour--;
      this.slag.set(L.x, LADLE_Y - 40, L.x, fy, 12 + Math.sin(g.frame * 0.6) * 3);
      if (g.frame % 2 === 0) g.fx.burst(L.x + rand(-10, 10), fy - 4, 'ember', 1, 4, { speed: 2, vy: -1.5, grav: 0.1, life: 30 });
      this.smite(g, { x: L.x, y: (LADLE_Y + fy) / 2, hw: 10, hh: (fy - LADLE_Y) / 2 }, 'magic', Math.round(this.atk * 0.7));
      if (live && !this.held && Math.abs(this.x - L.x) < 42) {
        this.hot = 900;
        this.hold(g, 'kneel', 300, this.phase === 2 ? 'THE SLAG SETS HARD ROUND HIM: STRIKE' : 'SLAG BLINDS HIS VISOR: STRIKE');
      }
      if (L.pour === 0) L.empty = REFILL;
    } else {
      this.slag.hide();
      if (L.empty > 0) L.empty--;
      else {
        L.x += L.dir * 0.7;
        if (L.x > RAIL_X1) L.dir = -1;
        if (L.x < RAIL_X0) L.dir = 1;
      }
    }
    L.s.setFrame(this.propSheet.anims.ladle[L.empty || L.pour ? 1 : 0]);
    L.s.place(L.x, LADLE_Y + 6);
    L.s.glow = L.empty || L.pour ? 0 : 0.25 + Math.sin(g.frame * 0.1) * 0.1;
    // the molten channel: it burns her feet, and heats his greaves when he wades it
    this.channel.setFrame(this.propSheet.anims.channel[Math.floor(g.frame / 10) % 2]);
    this.channel.glow = 0.4;
    if (g.frame % 8 === 0) g.fx.burst(CHANNEL_X + rand(-24, 24), fy - 2, 'ember', 1, 2, { vy: -0.9, life: 34 });
    if (p.onGround && Math.abs(p.x - CHANNEL_X) < CHANNEL_R && p.bottom > fy - 4) this.smite(g, { x: CHANNEL_X, y: fy - 8, hw: CHANNEL_R, hh: 12 }, 'magic', Math.round(this.atk * 0.5));
    if (live && Math.abs(this.x - CHANNEL_X) < CHANNEL_R + 10 && this.phase === 1) this.hot = Math.max(this.hot, 600);
    // the quench trough: hot plate cracks in it (and the bare fire is doused by it)
    if (this.hot > 0) this.hot--;
    if (this.quenchCool > 0) this.quenchCool--;
    const inTrough = Math.abs(this.x - TROUGH_X) < TROUGH_R;
    if (live && !this.held && inTrough && this.quenchCool === 0 && (this.hot > 0 || this.phase === 2)) {
      const cracked = this.phase === 1;
      this.hot = 0;
      this.quenchCool = 900;
      g.audio.play('flame');
      g.flashWhite = 6;
      for (let k = 0; k < 24; k++) g.fx.burst(this.x + rand(-40, 40), fy - rand(0, 90), 'smoke', 1, 6, { vy: -rand(1, 3), life: 50, fade: true, tint: [1.5, 1.5, 1.6] });
      this.hold(g, 'kneel', cracked ? 420 : 300, cracked ? 'THE STEAM CRACKS HIS PLATE: STRIKE' : 'THE WATER CHOKES HIS FIRE: STRIKE', cracked ? SEG * 2 : SEG);
    }
    // second half: the floor heats a third at a time. A long warning, then it burns
    if (this.phase === 2 && live) {
      const H = this.heat, W = g.room.W, third = (W - 96) / 3;
      H.t++;
      if (H.t >= 430) {
        H.t = 0;
        H.zone = Math.floor(clamp((p.x - 48) / third, 0, 2)); // under her feet
      }
      if (H.zone >= 0 && H.t < 230) {
        const x0 = 48 + H.zone * third, burning = H.t >= 90;
        if (H.t === 90) g.audio.play('flame');
        for (let k = 0; k < (burning ? 3 : 1); k++) g.fx.burst(x0 + rand(0, third), fy - (burning ? rand(0, 14) : 2), burning ? 'fire' : 'ember', 1, 2, burning ? { sheet: 'fire', vy: -1.2, life: 22 } : { vy: -0.6, life: 26 });
        if (burning && p.onGround && p.bottom > fy - 4 && p.x > x0 && p.x < x0 + third) this.smite(g, { x: p.x, y: fy - 8, hw: 8, hh: 12 }, 'magic', Math.round(this.atk * 0.5));
      }
    }
  }
  next(g: Game) {
    const d = Math.abs(g.player.x - this.x);
    if (this.phase === 1) this.pick(d < 190 ? this.choose(['sweep', 'cleave', 'stomp', 'cleave']) : this.choose(['bash', 'scrape', 'cleave', 'bash']));
    else this.pick(d < 190 ? this.choose(['sweep', 'cleave', 'ring', 'wave']) : this.choose(['wave', 'bash', 'ring', 'cleave']));
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    this.arena(g); // (first: the machinery may put him in a window, which replaces `data`)
    const p = g.player, s = this.sprite!, d = this.data, W = g.room.W, fy = this.floorY;
    const fast = this.phase === 2 ? 1.3 : 1;
    const dx = p.x - this.x;
    let frame = frameLoop(this.A('idle'), g.frame, 9);
    switch (this.pat) {
      case 'enter':
        // a dead suit kneeling by the forge: the slit lights, and it stands
        frame = this.pt < 80 ? this.A('kneel')[0] : this.pt < 150 ? frameLoop(this.A('roar'), this.pt, 6) : frame;
        if (this.pt === 30) g.audio.play('fire');
        if (this.pt === 80) {
          g.audio.play('roar');
          g.shake(5, 50);
          g.bossIntro();
        }
        if (this.pt === 150) g.bossTalk();
        if (this.pt > 150) this.pick('walk');
        break;
      case 'walk':
        this.facing = dx < 0 ? -1 : 1;
        if (Math.abs(dx) > 120) this.x += this.facing * 0.85 * fast;
        frame = frameLoop(this.A('walk'), this.pt, Math.round(7 / fast));
        if (this.pt % Math.round(28 / fast) === 0) {
          g.shake(2, 5);
          g.audio.play('knock');
        }
        if (this.pt > 90 / fast) this.next(g);
        break;
      case 'sweep': {
        // the blade scythes round at knee height: jump it
        const len = 72 / fast, k = this.pt / len;
        frame = frameAt(this.A('sweep'), k);
        if (this.pt === 1) {
          this.facing = dx < 0 ? -1 : 1;
          g.audio.play('creak');
        }
        if (!d.sw && k >= 0.42) {
          d.sw = true;
          g.audio.play('whip');
        }
        if (k > 0.44 && k < 0.66) this.smite(g, { x: this.x + this.facing * 100, y: fy - 20, hw: 78, hh: 15 });
        if (k > 1.35) this.pick('walk');
        break;
      }
      case 'cleave': {
        // up over his head, a held breath, then down on the spot where she stood when it rose
        const len = 84 / fast, k = this.pt / len;
        frame = frameAt(this.A('cleave'), k);
        if (this.pt === 1) {
          this.facing = dx < 0 ? -1 : 1;
          d.tx = clamp(p.x - this.facing * 118, 80, W - 80); // he strides to put that spot at his sword's length
          g.audio.play('creak');
        }
        if (k < 0.5) this.x += clamp(d.tx - this.x, -2.4 * fast, 2.4 * fast);
        if (!d.hit && k >= 0.64) {
          d.hit = true;
          const ix = this.x + this.facing * 118;
          g.audio.play('rumble');
          g.shake(7, 20);
          g.fx.burst(ix, fy, 'spark', 10, 12, { speed: 2.5, grav: 0.1, life: 24 });
          this.smite(g, { x: ix, y: fy - 60, hw: 18, hh: 60 });
          if (ix > GRATE_X0 && ix < GRATE_X1) {
            this.hold(g, 'wedged', 300, 'HIS BLADE IS FAST IN THE GRATE: STRIKE');
            g.audio.play('clink');
          } else if (this.phase === 2) for (const dir of [-1, 1]) g.spawn(new Shockwave(g, ix + dir * 16, fy, dir * 2.4, 16, 160));
        }
        if (this.pat === 'cleave' && k > 1.4) this.pick('walk');
        break;
      }
      case 'stomp': {
        const len = 62 / fast, k = this.pt / len;
        frame = frameAt(this.A('stomp'), k);
        if (this.pt === 1) this.facing = dx < 0 ? -1 : 1;
        if (!d.hit && k >= 0.62) {
          d.hit = true;
          g.audio.play('rumble');
          g.shake(7, 24);
          for (const dir of [-1, 1]) g.spawn(new Shockwave(g, this.x + dir * 24, fy, dir * 2.5, 16, 260));
          this.smite(g, { x: this.x + this.facing * 14, y: fy - 14, hw: 26, hh: 14 });
        }
        if (k > 1.4) this.pick('walk');
        break;
      }
      case 'bash': {
        // sets his shield and runs her down: crouch or slide under it
        if (this.pt <= 44) {
          if (this.pt === 1) {
            this.facing = dx < 0 ? -1 : 1;
            g.audio.play('growl');
          }
          frame = frameLoop(this.A('brace'), this.pt, 8);
          break;
        }
        this.x += this.facing * 3.5 * fast;
        frame = frameLoop(this.A('bash'), this.pt, 4);
        if (this.pt % 9 === 0) {
          g.shake(3, 5);
          g.audio.play('knock');
        }
        this.smite(g, { x: this.x + this.facing * 42, y: fy - 72, hw: 34, hh: 46 });
        const done = this.pt > 44 + 120 / fast || this.x < 100 || this.x > W - 100;
        if (done) {
          this.x = clamp(this.x, 100, W - 100);
          this.pick('walk');
        }
        break;
      }
      case 'scrape': {
        // the point dragged along the floor at her: a spray of sparks
        const k = (this.pt - 20) / 26;
        frame = frameAt(this.A('scrape'), k);
        if (this.pt === 1) this.facing = dx < 0 ? -1 : 1;
        if (this.pt === 34) {
          g.audio.play('clink');
          for (let i = 0; i < 4; i++) g.spawn(new EnemyShot(g, this.x + this.facing * 90, fy - 10, this.facing * (1.6 + i * 0.9), -3.2 - (i % 2) * 1.2, 'fireball', 13, 0.12));
        }
        if (this.pt > 80) this.pick('walk');
        break;
      }
      case 'wave': {
        // a rising cut: a wave of flame runs the floor, and a slower one after it
        const len = 60, k = this.pt / len;
        frame = frameAt(this.A('wave'), k);
        if (this.pt === 1) this.facing = dx < 0 ? -1 : 1;
        if (this.pt === 30 || this.pt === 46) {
          const w = new Shockwave(g, this.x + this.facing * 60, fy, this.facing * (this.pt === 30 ? 3.4 : 2.2), 16, 300);
          w.sprite!.tint(1.6, 0.8, 0.3);
          g.spawn(w);
          g.audio.play('flame');
        }
        if (k > 1.5) this.pick('walk');
        break;
      }
      case 'ring': {
        // the fire throws rings of embers from his chest: each has gaps, and the second is turned
        if (this.pt === 1) this.facing = dx < 0 ? -1 : 1;
        frame = frameLoop(this.A('roar'), this.pt, 6);
        for (const [at, off] of [[30, 0], [70, 0.5], [110, 0.25]] as [number, number][]) {
          if (this.pt !== at) continue;
          const n = 14;
          for (let i = 0; i < n; i++) {
            if (i % 7 === 3) continue; // the gaps
            const a = ((i + off) / n) * Math.PI * 2;
            g.spawn(new EnemyShot(g, this.x, fy - 96, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 'fireball', 12));
          }
          g.audio.play('fire');
        }
        if (this.pt > 150) this.pick('walk');
        break;
      }
      case 'held':
        frame = frameLoop(this.A(d.anim), this.pt, 10);
        if (this.pt > d.len) this.release(g);
        break;
      case 'rage':
        // the scene: the plate bursts off him, and what wore it stands there burning
        frame = this.pt < 50 ? frameLoop(this.sheet.anims.kneel, this.pt, 8) : frameLoop(this.sheet.anims.bare_roar, this.pt, 5);
        if (this.pt === 50) {
          this.phase = 2;
          this.hot = 0;
          g.audio.play('explode');
          g.shake(8, 50);
          g.fadeFlash = 12;
          g.fx.burst(this.x, fy - 80, 'rock', 18, 30, { speed: 3.5, grav: 0.15, life: 70, rot: 0.3 });
          g.fx.burst(this.x, fy - 80, 'burst', 6, 30, { fps: 10 });
        }
        if (this.pt === 130) g.bossTalk('boss_colossus2_phase2');
        if (this.pt > 130) this.pick('walk');
        break;
      case 'dying':
        frame = frameLoop(this.A('kneel'), this.pt, 10);
        this.slag.hide();
        if (this.dyingTick(g, 170, 44)) return;
        break;
    }
    this.x = clamp(this.x, 70, W - 70);
    s.setFrame(frame);
    s.place(this.x, fy, this.facing < 0);
    this.showFlash();
    // heat shows on the plate: orange, then a glow
    const k = this.phase === 1 ? Math.min(1, this.hot / 200) : 0;
    s.tint(1 + k * 0.5, 1 - k * 0.2, 1 - k * 0.55);
    s.glow = this.phase === 2 ? 0.15 + Math.sin(g.frame * 0.2) * 0.05 : k * 0.3;
  }
  hitSpot(): [number, number] {
    return [this.x, this.floorY - 70];
  }
}
