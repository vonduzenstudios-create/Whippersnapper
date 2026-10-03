// The Mawtoad (trial boss, 0.27.0). A bog hollow, four reeds with gas pods, a thorn stump by
// each wall.
//
// Its TONGUE takes the first thing it touches. To open it up:
//   - whip a pod off its reed so it lies on the mud between you: the tongue takes the pod, the
//     toad swallows it, and the gas does the rest
//   - stand by a thorn stump and get out of the way: the tongue sticks in the thorns
// It also HOPS at you (the landing throws mud both ways) and SPITS mud in arcs.
// Phase two: it swallows air and ROLLS round the hollow as a ball, bouncing off the walls.
// Blows shove the ball, and a fallen pod under it takes the bounce out of it. A ball that
// reaches a wall low enough to meet the thorns bursts.
import type { Game } from './game';
import { DmgType, HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target, distToSegment } from './boss_base';
import { TrialBoss, Bullet, Chain, AX0, AX1 } from './boss_kit';
import { lazySheet } from '../gfx/lazy';
import { buildMawtoadSheet, buildBogProps } from '../gfx/art_mawtoad';
import { clamp, lerp } from '../core/util';

const POD_X = [AX0 + 72, AX0 + 176, AX1 - 176, AX1 - 72];
const STUMP_X = [AX0 + 22, AX1 - 22];
const REACH = 210;
const BALL_R = 42;

interface Pod { x: number; state: 'up' | 'down' | 'none'; t: number; reed: Sprite; lying: Sprite }

export class Mawtoad extends TrialBoss {
  label = 'MAWTOAD';
  pods: Pod[];
  tongue: Chain;
  tip: Sprite;
  vy2 = 0;
  rollA = 0;
  constructor(g: Game, x: number) {
    super(g, 'mawtoad', lazySheet('mawtoad', buildMawtoadSheet), 34, 22, x);
    const props = lazySheet('bogProps', buildBogProps);
    for (const sx of STUMP_X) {
      const s = new Sprite(props, g.view.sprites, 7);
      s.setFrame(props.anims.stump[0]);
      s.place(sx, this.floorY, sx > x);
      this.props.push(s);
    }
    this.pods = POD_X.map((px) => {
      const reed = new Sprite(props, g.view.sprites, 7), lying = new Sprite(props, g.view.sprites, 9);
      reed.place(px, this.floorY);
      lying.setFrame(props.anims.fallen[0]);
      lying.place(px, this.floorY);
      this.props.push(reed, lying);
      return { x: px, state: 'up' as const, t: 0, reed, lying };
    });
    this.tongue = new Chain(g, 'tongueSeg', 12, 5);
    this.tip = new Sprite(g.sheets.fx, g.view.sprites, 12);
    this.tip.setFrame(g.sheets.fx.anims.tongueTip[0]);
    this.tip.visible = false;
    this.props.push(this.tip);
    this.gear.push(this.tongue);
    this.facing = -1;
  }
  get rolling() {
    return this.pat === 'roll';
  }
  get mouth() {
    return { x: this.x + this.facing * 36, y: this.y + 4 };
  }
  hitType(): DmgType {
    return this.pat === 'hop' ? 'melee' : 'touch';
  }
  targets(): Target[] {
    const out: Target[] = [];
    this.pods.forEach((p, i) => p.state === 'up' && out.push({ id: `pod${i}`, x: p.x + 6, y: this.floorY - 58, r: 12 }));
    out.push({ id: 'body', x: this.x, y: this.y, r: this.rolling ? BALL_R : 30 });
    return out;
  }
  hurtZones(): Target[] {
    return this.vulnT > 0 ? [] : [{ id: 'body', x: this.x, y: this.y, r: this.rolling ? BALL_R - 6 : 22 }];
  }
  onStrike(g: Game, t: Target, fromX: number, kind: HitKind) {
    if (t.id.startsWith('pod')) {
      const p = this.pods[+t.id.slice(3)];
      p.state = 'down';
      p.t = 0;
      g.audio.play('snap');
      g.fx.burst(p.x, this.floorY - 8, 'dust', 3, 6);
      return;
    }
    if (this.rolling) {
      // a blow shoves the ball, and one from above knocks it down
      this.vx = clamp(this.vx + (this.x >= fromX ? 1 : -1) * 0.9, -4.2, 4.2);
      if (g.player.y < this.y - 20) this.vy2 = Math.max(this.vy2, 3.5);
    }
    this.bodyHit(g, t, kind);
  }
  endStun(g: Game) {
    super.endStun(g);
    this.hh = 22;
  }
  mud(g: Game, x: number, y: number, vx: number, vy: number) {
    g.spawn(new Bullet(g, x, y, vx, vy, Math.round(this.atk * 0.55), { anim: 'slime', grav: 0.14, r: 5, type: 'shot', tint: [0.9, 0.7, 0.4], life: 240 }));
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    if (!this.rolling) this.hh = 22;
    const ground = this.floorY - this.hh;
    // ── the reeds and their pods
    const PA = this.pods[0].reed.sheet.anims;
    for (const pod of this.pods) {
      pod.t++;
      if (pod.state === 'down' && pod.t > 460) (pod.state = 'none'), (pod.t = 0);
      else if (pod.state === 'none' && pod.t > 480) pod.state = 'up';
      pod.reed.setFrame(pod.state === 'up' ? PA.pod[Math.floor(g.frame / 30) % 2] : PA.reed[0]);
      pod.lying.visible = pod.state === 'down';
    }
    this.tongue.hide();
    this.tip.visible = false;
    switch (this.pat) {
      case 'enter':
        // what looked like a mound of mud opens an eye
        this.y = ground;
        this.fr = this.pt < 50 ? this.A.stun[0] : this.A.idle[0];
        if (this.pt >= 50) this.once('tell', this.pt - 50, 40);
        if (this.pt === 80) g.audio.play('roar');
        this.enterBeats(g, 80, 130);
        break;
      case 'shift':
        this.y = ground;
        this.once('swell', this.pt, 90);
        if (this.pt % 18 === 1) g.audio.play('breath');
        this.shiftBeats(g, 100);
        break;
      case 'idle':
        this.y = ground;
        this.look();
        this.loop('idle', 6);
        if (this.pt > (two ? 46 : 74)) {
          if (two && this.last !== 'roll') this.pick('roll');
          else this.pick(Math.abs(this.dx) < REACH ? this.choose(['tongue', 'hop', 'tongue', 'spit']) : this.choose(['hop', 'spit']));
        }
        break;
      case 'tongue': {
        this.y = ground;
        const TELL = two ? 28 : 36, m = this.mouth;
        if (this.pt <= TELL) {
          this.look();
          this.once('tell', this.pt, TELL);
          if (this.pt === 1) g.audio.play('growl');
          if (this.pt === TELL) {
            // aimed at where she is now; it goes that way whatever she does next
            const a = Math.atan2(clamp(p.y - m.y, -30, 14), p.x - m.x);
            d.ux = Math.cos(a);
            d.uy = Math.sin(a);
            d.len = 0;
            d.back = false;
            g.audio.play('spit');
          }
          break;
        }
        this.loop('lash', 4);
        if (!d.back) {
          d.len += 13;
          const tx = m.x + d.ux * d.len, ty = Math.min(this.floorY - 5, m.y + d.uy * d.len);
          const pod = this.pods.find((q) => q.state === 'down' && distToSegment(q.x, this.floorY - 8, m.x, m.y, tx, ty) < 15);
          const stump = STUMP_X.find((sx) => Math.abs(tx - sx) < 16 && ty > this.floorY - 44);
          if (pod) {
            pod.state = 'none';
            pod.t = 0;
            d.back = true;
            d.pod = true;
          } else if (stump !== undefined) {
            d.len = Math.hypot(stump - m.x, ty - m.y);
            this.stun(g, 290, 'ITS TONGUE IS STUCK IN THE THORNS: STRIKE');
            this.data.pin = { x: stump, y: ty };
            break;
          } else if (p.alive && p.invuln <= 0 && distToSegment(p.x, p.y, m.x, m.y, tx, ty) < 11) {
            if (p.takeDamage(this.atk, m.x, false, true, 'melee', p.y) !== false && !p.justBlocked) p.yank(this.x + this.facing * 58);
            d.back = true;
          } else if (d.len >= REACH || tx < AX0 + 6 || tx > AX1 - 6) d.back = true;
        } else {
          d.len -= 15;
          if (d.len <= 0) {
            if (d.pod) {
              // a gulp, a moment's doubt, and the pod goes off inside it
              g.audio.play('squelch');
              this.set('gulp');
            } else this.pick('idle');
            break;
          }
        }
        this.tongue.set(m.x, m.y, m.x + d.ux * d.len, Math.min(this.floorY - 5, m.y + d.uy * d.len));
        this.tip.visible = true;
        this.tip.place(m.x + d.ux * d.len, Math.min(this.floorY - 5, m.y + d.uy * d.len), this.facing < 0);
        break;
      }
      case 'gulp':
        this.y = ground;
        this.once('swell', this.pt, 80);
        if (this.pt === 34) {
          g.audio.play('explode');
          g.fx.burst(this.x, this.y - 10, 'puff', 10, 20, { vy: -1, life: 40, fade: true, tint: [1.2, 0.8, 1.4] });
          this.stun(g, 300, 'IT SWALLOWED THE GAS POD: STRIKE');
        }
        break;
      case 'hop': {
        const TELL = 28, FLY = 44;
        if (this.pt <= TELL) {
          this.y = ground;
          this.look();
          this.once('crouch', this.pt, TELL);
          if (this.pt === TELL) {
            d.x0 = this.x;
            d.tx = clamp(p.x, AX0 + 60, AX1 - 60);
            g.audio.play('jump');
          }
        } else if (this.pt <= TELL + FLY) {
          const t = (this.pt - TELL) / FLY;
          this.x = lerp(d.x0, d.tx, t);
          this.y = ground - Math.sin(t * Math.PI) * 96;
          this.once('leap', this.pt - TELL, FLY);
          if (t >= 1) {
            this.y = ground;
            g.audio.play('splash');
            g.shake(6, 20);
            g.fx.burst(this.x, this.floorY - 2, 'splash', 6, 30, { life: 24 });
            this.hit(g, { x: this.x, y: this.floorY - 16, hw: 40, hh: 18 }, this.atk + 4);
            for (const s of [-1, 1]) for (const v of [1.5, 2.8]) this.mud(g, this.x + s * 30, this.floorY - 12, s * v, -3.6);
          }
        } else {
          this.y = ground;
          this.loop('idle', 6);
          if (this.pt > TELL + FLY + 40) this.pick('idle');
        }
        break;
      }
      case 'spit': {
        this.y = ground;
        this.once('spit', this.pt, 40);
        if (this.pt < 16) this.look();
        if (this.pt === 24) {
          g.audio.play('spit');
          const m = this.mouth;
          for (const [k, vy] of [[0.7, -4.6], [1, -3.8], [1.3, -3]]) this.mud(g, m.x, m.y - 6, clamp(((p.x - m.x) / (-2 * vy / 0.14)) * k, -5, 5), vy);
        }
        if (this.pt > 76) this.pick('idle');
        break;
      }
      case 'roll': {
        // phase two: a ball of toad, bouncing wall to wall
        this.hh = BALL_R + 2;
        const rest = this.floorY - this.hh;
        if (this.pt === 1) {
          this.vx = (this.dx < 0 ? -1 : 1) * 2.7;
          this.vy2 = -6;
          this.y = Math.min(this.y, rest);
          d.bounce = 0;
        }
        this.vy2 += 0.24;
        this.y += this.vy2;
        this.x += this.vx;
        if (this.y >= rest) {
          this.y = rest;
          if (this.vy2 > 1) {
            g.shake(2, 6);
            g.fx.burst(this.x, this.floorY - 2, 'splash', 2, 14, { life: 16 });
          }
          // high, low, then a roll along the floor: jump the roll, run under the high one
          this.vy2 = d.flat ? 0 : -[6.6, 4, 0][d.bounce++ % 3];
        }
        const pod = this.pods.find((q) => q.state === 'down' && Math.abs(q.x - this.x) < 26 && this.y > rest - 12);
        if (pod) {
          pod.state = 'none';
          pod.t = 0;
          d.flat = true; // the gas takes the bounce out of it
          g.audio.play('squelch');
          g.fx.burst(pod.x, this.floorY - 10, 'puff', 6, 12, { vy: -1, life: 30, fade: true, tint: [1.2, 0.8, 1.4] });
        }
        if (this.x < AX0 + BALL_R || this.x > AX1 - BALL_R) {
          this.x = clamp(this.x, AX0 + BALL_R, AX1 - BALL_R);
          if (this.y > rest - 14) {
            g.audio.play('explode');
            g.fx.burst(this.x, this.y, 'puff', 14, 30, { speed: 2, life: 36, fade: true });
            this.stun(g, 300, 'IT BURSTS ON THE THORNS: STRIKE');
            this.hh = 22;
            this.y = this.floorY - 22;
            break;
          }
          this.vx = -this.vx;
          g.audio.play('knock');
        }
        this.rollA += this.vx / BALL_R;
        const A = this.A.ball;
        this.fr = A[((Math.floor((this.rollA / (Math.PI * 2)) * A.length) % A.length) + A.length) % A.length];
        this.facing = 1;
        if (this.pt > 520) {
          this.hh = 22;
          this.y = this.floorY - 22;
          this.pick('idle');
        }
        break;
      }
      case 'stun': {
        this.y = Math.min(ground, this.y + 5);
        this.loop('stun', 8);
        const pin = d.pin;
        if (pin) {
          const m = this.mouth;
          this.tongue.set(m.x, m.y + 6, pin.x, pin.y);
          this.tip.visible = true;
          this.tip.place(pin.x, pin.y, this.facing < 0);
        }
        break;
      }
    }
    this.x = clamp(this.x, AX0 + 36, AX1 - 36);
  }
}
