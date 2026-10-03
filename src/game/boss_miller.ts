// The Gale Miller (trial boss, 0.27.0). A mill loft with the sails turning through it.
//
// He fights with wind: a GUST that shoves you back and carries chaff with it, an INHALE that
// drags you (and anything rolling) toward him, and a MILLSTONE bowled along the floor. Two
// attacks build more pressure than his bellows can hold, and then he must VENT. To open him:
//   - while he vents, strike the valve on top of the pack FROM ABOVE: glide on the updraft
//     that the venting makes (hold jump over him), or double jump and whip downward
//   - whip the sail brake by the left wall: the axle slips, the sails sweep the floor for a
//     moment, and one clips him if he is under them (keep clear yourself)
//   - bowl-back: if he inhales while his own millstone is still rolling, it comes back at him
// The sails always hurt anything that jumps into them. Phase two: a crosswind blows through
// the torn roof and changes side on a tell, and he LEAPS, catching a sail and dropping on you;
// the landing leaves him winded and venting.
import type { Game } from './game';
import { DmgType, HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target, distToSegment } from './boss_base';
import { TrialBoss, Bullet, AX0, AX1, AMID } from './boss_kit';
import { lazySheet } from '../gfx/lazy';
import { buildMillerSheet, buildMillProps, buildSails } from '../gfx/art_miller';
import { clamp, lerp } from '../core/util';

const BLADE = 134;
const BRAKE_X = AX0 + 24;
const BRAKE_BACK = 700;

export class Miller extends TrialBoss {
  label = 'GALE MILLER';
  sails: Sprite;
  brake: Sprite;
  turn = 0;
  /** Frames left of the axle's slip (the sails hang low), and until the brake can be pulled again. */
  slip = 0;
  brakeT = 0;
  /** Attacks since he last vented. */
  pressure = 0;
  /** Sideways push on her and on rolling stones this frame (px/frame). */
  wind = 0;
  /** Phase two's crosswind: its direction, and frames until it changes. */
  cross = 0;
  crossT = 0;
  constructor(g: Game, x: number) {
    super(g, 'miller', lazySheet('miller', buildMillerSheet), 18, 29, x);
    const props = this.propSheet;
    this.sails = new Sprite(lazySheet('sails', buildSails), g.view.sprites, 3);
    this.brake = new Sprite(props, g.view.sprites, 7);
    this.brake.place(BRAKE_X, this.floorY - 22);
    this.props.push(this.sails, this.brake);
    this.facing = -1;
  }
  get propSheet() {
    return lazySheet('millProps', buildMillProps);
  }
  /** The axle: it sags while the brake has slipped. */
  get hub() {
    const sag = this.slip > 0 ? Math.sin(Math.min(1, (150 - this.slip) / 20, this.slip / 20) * Math.PI / 2) * 58 : 0;
    return { x: AMID, y: this.floorY - 204 + sag };
  }
  hitType(): DmgType {
    return this.pat === 'leap' ? 'melee' : 'touch';
  }
  targets(): Target[] {
    const out: Target[] = [{ id: 'brake', x: BRAKE_X, y: this.floorY - 22, r: 13 }];
    if (this.pat === 'vent') out.push({ id: 'valve', x: this.x - this.facing * 18, y: this.y - 20, r: 12 });
    out.push({ id: 'body', x: this.x, y: this.y, r: 24 });
    return out;
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id === 'brake') {
      if (this.brakeT > 0) return this.clank(g, t.x, t.y);
      this.brakeT = BRAKE_BACK;
      this.slip = 150;
      g.audio.play('lever');
      g.audio.play('creak');
      g.shake(4, 30);
      g.message('THE AXLE SLIPS: KEEP CLEAR OF THE SAILS', 120);
      return;
    }
    if (t.id === 'valve') {
      if (g.player.y > this.y - 34) {
        g.message('THE VALVE IS ON TOP: STRIKE IT FROM ABOVE', 90);
        return this.clank(g, t.x, t.y);
      }
      g.audio.play('glass');
      return this.stun(g, 300, 'THE VALVE BREAKS: STRIKE');
    }
    this.bodyHit(g, t, kind);
  }
  endStun(g: Game) {
    super.endStun(g);
    this.pressure = 0;
  }
  onShift(g: Game) {
    g.audio.play('rumble');
    this.cross = 1;
    this.crossT = 300;
  }
  stone(g: Game) {
    g.spawn(new Bullet(g, this.x + this.facing * 26, this.floorY - 13, this.facing * 2.5, 0, this.atk, {
      sheet: this.propSheet, anim: 'stone', per: 4, r: 12, type: 'shot', solid: false, life: 900,
      tick: (b) => {
        b.vx = clamp(b.vx + this.wind * 0.07, -5, 5);
        const s = b as any;
        if (b.x < AX0 + 14 || b.x > AX1 - 14) {
          // one bounce off a wall, then it breaks
          if (s.bounced) return b.strike(g, false);
          s.bounced = true;
          b.vx = -b.vx;
          b.x = clamp(b.x, AX0 + 14, AX1 - 14);
          g.audio.play('knock');
        }
        if (this.pat === 'inhale') s.drawn = true; // his own breath is pulling it back
        if (b.t > 40 && Math.abs(b.x - this.x) < 22 && this.y > this.floorY - 60) {
          // a stone that only bounced back he stops with his boot; one he drew in hits him
          b.strike(g, false);
          if (s.drawn) this.stun(g, 300, 'HIS OWN MILLSTONE: STRIKE');
        }
        if (g.frame % 6 === 0) g.fx.burst(b.x, this.floorY - 2, 'dust', 1, 2);
      },
      end: (b) => {
        g.audio.play('crumble');
        g.fx.burst(b.x, b.y, 'dust', 6, 8, { speed: 1.6, grav: 0.1, life: 26 });
      },
    }));
  }
  /** Streaks of air and flour along the floor, moving with the wind. */
  gale(g: Game, dir: number, strength: number) {
    if (g.frame % 2) return;
    const x = AX0 + Math.random() * (AX1 - AX0), y = this.floorY - 8 - Math.random() * 70;
    g.fx.burst(x, y, 'streak', 1, 0, { vx: dir * (3 + strength * 2), life: 16, fade: true });
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    const ground = this.floorY - this.hh;
    if (this.pat !== 'leap') this.y = ground;
    this.wind = 0;
    // ── the sails
    if (this.slip > 0) this.slip--;
    if (this.brakeT > 0) this.brakeT--;
    this.turn += two ? 0.019 : 0.013;
    const hub = this.hub, SA = this.sails.sheet.anims.sails;
    const q = ((this.turn % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    this.sails.setFrame(SA[Math.floor((q / (Math.PI / 2)) * SA.length) % SA.length]);
    this.sails.place(hub.x, hub.y);
    this.brake.setFrame(this.propSheet.anims.brake[this.brakeT > 0 ? 1 : 0]);
    const snap = Math.floor((q / (Math.PI / 2)) * SA.length) * (Math.PI / 2 / SA.length); // the drawn angle
    for (let k = 0; k < 4; k++) {
      const a = snap + k * (Math.PI / 2), tx = hub.x + Math.cos(a) * BLADE, ty = hub.y + Math.sin(a) * BLADE;
      if (this.pat !== 'enter' && this.pat !== 'shift' && p.alive && p.invuln <= 0 && distToSegment(p.x, p.y, hub.x + Math.cos(a) * 30, hub.y + Math.sin(a) * 30, tx, ty) < 12) p.takeDamage(this.atk - 6, tx, false, true, 'melee', ty);
      if (this.slip > 0 && this.vulnT <= 0 && this.pat !== 'leap' && distToSegment(this.x, this.y, hub.x, hub.y, tx, ty) < 20) {
        g.audio.play('knock');
        this.stun(g, 300, 'A SAIL CLIPS HIM: STRIKE');
      }
    }
    // ── phase two: the crosswind
    if (two && this.pat !== 'shift') {
      if (--this.crossT === 70) g.message(`THE WIND IS TURNING ${this.cross > 0 ? 'WEST' : 'EAST'}`, 70);
      if (this.crossT <= 0) {
        this.cross = -this.cross;
        this.crossT = 300;
        g.audio.play('breath');
      }
      this.wind = this.cross * 0.75;
      this.gale(g, this.cross, 0.2);
    }
    switch (this.pat) {
      case 'enter':
        this.loop(this.pt < 60 ? 'idle' : 'inhale', 6);
        if (this.pt === 60) g.audio.play('breath');
        if (this.pt > 60) this.gale(g, -1, 1);
        this.enterBeats(g, 62, 128);
        break;
      case 'shift':
        this.loop('inhale', 4);
        this.gale(g, 1, 1);
        if (this.pt % 20 === 1) g.shake(4, 16);
        this.shiftBeats(g, 106);
        break;
      case 'idle': {
        this.look();
        const far = Math.abs(this.dx) > 130;
        if (far) this.x += this.facing * 0.85;
        this.loop(far ? 'walk' : 'idle', far ? 6 : 7);
        if (this.pt > (two ? 50 : 72)) {
          if (this.pressure >= 2) this.pick('vent');
          else {
            this.pressure++;
            this.pick(two && this.last !== 'leap' && Math.random() < 0.4 ? 'leap' : this.choose(['gust', 'stone', 'inhale']));
          }
        }
        break;
      }
      case 'gust': {
        this.once('gust', this.pt, 44);
        if (this.pt === 24) g.audio.play('breath');
        if (this.pt >= 24 && this.pt < 120) {
          this.wind = this.facing * 1.7;
          this.gale(g, this.facing, 1);
          // chaff and grit come with it: one low, one high
          if (this.pt % 28 === 30 % 28) g.spawn(new Bullet(g, this.x + this.facing * 30, this.floorY - (this.pt % 56 < 28 ? 10 : 42), this.facing * 4.2, 0, Math.round(this.atk * 0.6), { anim: 'rock', r: 5, type: 'shot', spin: 0.3, life: 160 }));
        }
        if (this.pt > 130) this.pick('idle');
        break;
      }
      case 'inhale': {
        this.loop('inhale', 5);
        if (this.pt === 1) g.audio.play('breath');
        if (this.pt >= 20 && this.pt < 130) {
          this.wind = -Math.sign(p.x - this.x) * 1.5;
          this.gale(g, -Math.sign(p.x - this.x) || -this.facing, 0.8);
          if (Math.abs(this.dx) < 34 && this.hit(g, { x: this.x + this.facing * 18, y: this.y, hw: 22, hh: 24 }, this.atk + 4)) this.pick('idle');
        }
        if (this.pt > 140) this.pick('idle');
        break;
      }
      case 'stone':
        this.once('heave', this.pt, 46);
        if (this.pt < 20) this.look();
        if (this.pt === 28) {
          g.audio.play('throw');
          this.stone(g);
        }
        if (this.pt > 84) this.pick('idle');
        break;
      case 'vent': {
        // the pack blows off straight up: an updraft a glider can ride
        this.loop('vent', 7);
        if (this.pt === 1) {
          g.audio.play('breath');
          g.message('HE HAS TO VENT', 90);
        }
        const vx = this.x - this.facing * 18;
        if (g.frame % 2 === 0) g.fx.burst(vx + (Math.random() - 0.5) * 30, this.y - 30, 'puff', 1, 4, { vy: -3, life: 26, fade: true });
        if (Math.abs(p.x - vx) < 56 && p.gliding && p.y > this.y - 130) p.vy = Math.max(-2.8, p.vy - 0.5);
        if (this.pt > 190) {
          this.pressure = 0;
          this.pick('idle');
        }
        break;
      }
      case 'leap': {
        // up onto a sail, carried round a little way, then down on her
        const UP = 34, RIDE = 60, FALL = 22;
        this.loop('jump', 6);
        if (this.pt <= UP) {
          if (this.pt === 1) {
            d.x0 = this.x;
            g.audio.play('jump');
          }
          const t = this.pt / UP;
          this.x = lerp(d.x0, hub.x + (d.x0 < hub.x ? -70 : 70), t);
          this.y = lerp(ground, hub.y + 60, Math.sin(t * Math.PI / 2));
        } else if (this.pt <= UP + RIDE) {
          const t = (this.pt - UP) / RIDE;
          this.x = lerp(this.x, clamp(p.x, AX0 + 30, AX1 - 30), 0.06);
          this.y = hub.y + 60 - Math.sin(t * Math.PI) * 26;
          if (this.pt === UP + RIDE) {
            d.x0 = this.x;
            d.y0 = this.y;
            g.audio.play('dash');
          }
        } else if (this.pt <= UP + RIDE + FALL) {
          const t = (this.pt - UP - RIDE) / FALL;
          this.y = lerp(d.y0, ground, t * t);
          if (t >= 1) {
            this.y = ground;
            g.audio.play('rumble');
            g.shake(6, 22);
            g.fx.burst(this.x, this.floorY - 2, 'dust', 12, 26, { speed: 2, life: 30, fade: true });
            this.hit(g, { x: this.x, y: this.floorY - 20, hw: 34, hh: 22 }, this.atk + 6);
            this.pressure = 2;
          }
        } else {
          this.y = ground;
          this.loop('vent', 7);
          if (this.pt > UP + RIDE + FALL + 30) this.pick('vent');
        }
        break;
      }
      case 'stun':
        this.loop('stun', 7);
        break;
    }
    // the wind on her: only while she has her feet or is in the air under her own control
    if (this.wind && p.alive && this.pat !== 'shift') p.pushV = this.wind;
    this.x = clamp(this.x, AX0 + 26, AX1 - 26);
  }
}
