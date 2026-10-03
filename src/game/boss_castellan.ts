// The Pendulum Castellan (trial boss, 0.27.0). A clockwork knight under the tower's pendulum.
//
// Three ways to open him up:
//   - bait his overhead CHOP onto one of the two floor gears: the halberd jams in the teeth
//   - be near the middle when he attacks: the pendulum hits him while he is committed to a swing
//   - his SWEEP spins him round and leaves his back to you: three blows on the winding key
// The pendulum hurts you too (crouch under it). Phase two: it swings faster and wider, the
// gears grind in turns (no jamming a grinding gear, and don't stand on it), and his thrust
// springs back the other way.
import type { Game } from './game';
import { DmgType, HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target } from './boss_base';
import { TrialBoss, Cord, AX0, AX1, AMID } from './boss_kit';
import { lazySheet } from '../gfx/lazy';
import { buildCastellanSheet, buildCastellanProps, buildClockFace } from '../gfx/art_castellan';
import { clamp } from '../core/util';
import { TILE } from '../config';

const PIVOT_Y = 11 * TILE; // the ceiling the pendulum hangs from
const LEN = 196;
const GEARS = [AX0 + 72, AX1 - 72];
const GRIND = 420; // phase two: frames in a gear's slow / warn / grind cycle

export class Castellan extends TrialBoss {
  label = 'CASTELLAN';
  swingT = 0;
  bob = { x: AMID, y: PIVOT_Y + LEN };
  unwound = 0;
  rod: Cord;
  hands: Cord[];
  bobS: Sprite;
  gears: Sprite[];
  constructor(g: Game, x: number) {
    super(g, 'castellan', lazySheet('castellan', buildCastellanSheet), 16, 30, x);
    const props = lazySheet('castellanProps', buildCastellanProps);
    const face = new Sprite(lazySheet('clockFace', buildClockFace), g.view.sprites, 2);
    face.place(AMID, PIVOT_Y + 96);
    this.hands = [new Cord(g, '#c8b070', 3), new Cord(g, '#c8b070', 3)];
    this.rod = new Cord(g, '#6a5a3a', 8);
    this.bobS = new Sprite(props, g.view.sprites, 9);
    this.bobS.setFrame(props.anims.bob[0]);
    this.gears = GEARS.map((gx) => {
      const s = new Sprite(props, g.view.sprites, 5);
      s.place(gx, this.floorY + 6);
      return s;
    });
    this.props.push(face, this.bobS, ...this.gears);
    this.gear.push(this.rod, ...this.hands);
    this.facing = -1;
  }
  hitType(): DmgType {
    return 'touch';
  }
  /** Is gear `i` grinding (phase two)? 0 = turning slowly, 1 = about to, 2 = grinding. */
  grind(i: number) {
    if (this.phase < 2) return 0;
    const t = (this.g.frame + i * (GRIND / 2)) % GRIND;
    return t < 250 ? 0 : t < 310 ? 1 : 2;
  }
  targets(): Target[] {
    return [
      { id: 'key', x: this.x - this.facing * 15, y: this.y - 8, r: 9 },
      { id: 'body', x: this.x, y: this.y - 4, r: 24 },
    ];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    const behind = Math.sign(g.player.x - this.x) === -this.facing;
    if (t.id === 'key' && behind && this.vulnT <= 0) {
      this.unwound++;
      g.audio.play('tingle');
      g.fx.burst(t.x, t.y, 'spark', 5, 6, { speed: 1.5, life: 20 });
      g.damageNumber(t.x, t.y - 12, `${this.unwound}/3`, '#f0cc68');
      if (this.unwound >= 3) {
        this.unwound = 0;
        this.stun(g, 280, 'HIS SPRING RUNS DOWN: STRIKE');
      }
      return;
    }
    this.bodyHit(g, t, kind);
  }
  onShift(g: Game) {
    g.audio.play('toll');
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    const ground = this.floorY - this.hh;
    this.y = ground;
    // ── the pendulum: it never stops, and it does not care whom it hits
    this.swingT += two ? 0.034 : 0.024;
    const th = Math.sin(this.swingT) * (two ? 0.9 : 0.74);
    this.bob = { x: AMID + Math.sin(th) * LEN, y: PIVOT_Y + Math.cos(th) * LEN };
    this.rod.set(AMID, PIVOT_Y, this.bob.x, this.bob.y - 10, 2);
    this.bobS.place(this.bob.x, this.bob.y);
    const clock = g.frame / 60;
    this.hands[0].set(AMID, PIVOT_Y + 96, AMID + Math.sin(clock * 0.8) * 50, PIVOT_Y + 96 - Math.cos(clock * 0.8) * 50, 2);
    this.hands[1].set(AMID, PIVOT_Y + 96, AMID + Math.sin(clock * 0.07) * 34, PIVOT_Y + 96 - Math.cos(clock * 0.07) * 34, 3);
    if (this.pat !== 'enter' && this.pat !== 'shift') {
      this.hit(g, { x: this.bob.x, y: this.bob.y + 8, hw: 14, hh: 16 }, this.atk + 4, 'melee', this.bob.x - Math.cos(this.swingT) * 20);
      const committed = (this.pat === 'chop' && this.pt > 12) || this.pat === 'sweep' || this.pat === 'thrust';
      if (committed && Math.abs(this.bob.x - this.x) < 22 && this.bob.y + 14 > this.y - this.hh) {
        this.stun(g, 280, 'THE PENDULUM STRIKES HIM: STRIKE');
        g.audio.play('dong');
      }
    }
    // ── the floor gears
    const GA = this.gears[0].sheet.anims.gear;
    this.gears.forEach((s, i) => {
      const gr = this.grind(i);
      s.setFrame(GA[Math.floor(g.frame / (gr === 2 ? 1 : 6)) % GA.length]);
      s.glow = gr === 2 ? 0.5 : gr === 1 ? (g.frame % 8 < 4 ? 0.4 : 0) : 0;
      if (gr && g.frame % 5 === 0) g.fx.burst(GEARS[i] + (Math.random() - 0.5) * 40, this.floorY - 4, 'spark', 1, 2, { vy: -1.5, life: 14 });
      if (gr === 2 && p.onGround && Math.abs(p.x - GEARS[i]) < 26 && this.pat !== 'shift') this.hit(g, { x: GEARS[i], y: this.floorY - 10, hw: 26, hh: 14 }, this.atk - 6, 'touch', GEARS[i]);
    });
    switch (this.pat) {
      case 'enter':
        this.fr = this.pt < 50 ? this.A.stun[0] : 0;
        if (this.pt >= 50) this.loop('shift', 5);
        if (this.pt === 50) g.audio.play('creak');
        this.enterBeats(g, 60, 130);
        break;
      case 'shift':
        this.loop('shift', 3);
        if (this.pt % 24 === 1 && this.pt < 100) {
          g.audio.play('dong');
          g.shake(3, 12);
        }
        this.shiftBeats(g, 110);
        break;
      case 'idle': {
        this.look();
        const far = Math.abs(this.dx) > 64;
        if (far) this.x += this.facing * (two ? 1.25 : 0.9);
        if (far) this.loop('walk', 5);
        else this.loop('idle', 7);
        if (this.pt > (two ? 46 : 70)) this.pick(far ? (Math.abs(this.dx) < 190 ? 'thrust' : 'idle') : this.choose(['chop', 'sweep', 'chop']));
        break;
      }
      case 'chop': {
        const tell = two ? 30 : 38;
        if (this.pt === 1) g.audio.play('creak');
        this.once('chop', this.pt, tell + 16);
        if (this.pt === tell + 6) {
          const hx = this.x + this.facing * 48;
          g.audio.play('clink');
          g.shake(5, 14);
          g.fx.burst(hx, this.floorY - 2, 'dust', 6, 10, { vy: -0.6 });
          this.hit(g, { x: this.x + this.facing * 40, y: this.floorY - 26, hw: 26, hh: 30 }, this.atk + 6);
          const i = GEARS.findIndex((gx) => Math.abs(gx - hx) < 24);
          if (i >= 0 && this.grind(i) < 2) {
            this.stun(g, 300, 'THE HALBERD IS JAMMED: STRIKE');
            this.data.jam = true;
            g.fx.burst(hx, this.floorY - 6, 'spark', 12, 10, { speed: 2.5, life: 26 });
          }
        }
        if (this.pt > tell + 44) this.pick('idle');
        break;
      }
      case 'sweep': {
        const wind = two ? 20 : 26;
        if (this.pt <= wind + 14) this.once('sweep', this.pt, wind + 14);
        if (this.pt === wind) g.audio.play('whip');
        if (this.pt > wind && this.pt <= wind + 10) this.hit(g, { x: this.x + this.facing * 34, y: this.floorY - 12, hw: 46, hh: 12 }, this.atk);
        if (this.pt === wind + 14) this.facing = -this.facing; // the swing carries him right round
        if (this.pt > wind + 14) this.loop('stuck', 9); // catching his balance, back turned
        if (this.pt > wind + (two ? 62 : 84)) this.pick('idle');
        break;
      }
      case 'thrust': {
        const tell = two ? 22 : 28;
        this.once('thrust', this.pt, tell + 20);
        if (this.pt < tell) this.look();
        if (this.pt === tell) g.audio.play('dash');
        if (this.pt >= tell && this.pt < tell + 18) {
          this.x += this.facing * 5.2;
          this.hit(g, { x: this.x + this.facing * 40, y: this.y - 4, hw: 30, hh: 10 }, this.atk);
          if (this.pt % 3 === 0) g.fx.burst(this.x, this.floorY - 2, 'dust', 1, 3);
        }
        if (this.pt > tell + 40) {
          // phase two: the spring throws him straight back the other way, once
          if (two && !d.again) {
            const again = this.dx * this.facing < 0;
            this.set('thrust');
            this.data.again = true;
            if (again) this.pt = 8;
            else this.pick('idle');
          } else this.pick('idle');
        }
        break;
      }
      case 'stun':
        this.loop(d.jam ? 'stuck' : 'stun', 8);
        break;
    }
    this.x = clamp(this.x, AX0 + 26, AX1 - 26);
  }
}
