// Lady Marrow, the Marionette (trial boss, 0.27.0). A porcelain dancer worked from the gantry.
//
// Part one, on her strings. To open her up:
//   - her strings pull taut (and glow) when she is hoisted for the KICK and while she bows for
//     the CURTSEY: whip a taut string and she drops in a heap
//   - whip a sandbag's rope so it falls on her
// Part two: the strings are gone and the puppeteer's two hands come down. One carries her and
// swings her at you; the other slams and sweeps. After a SLAM the fist rests on the stage:
// three blows on it (or a sandbag) and the other hand lets her go.
import type { Game } from './game';
import { HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target } from './boss_base';
import { TrialBoss, Cord, AX0, AX1, AMID } from './boss_kit';
import { lazySheet } from '../gfx/lazy';
import { buildMarionetteSheet, buildHandSheet, buildStageProps, buildCurtain } from '../gfx/art_marionette';
import { clamp, lerp } from '../core/util';
import { TILE } from '../config';

const GANTRY = 11 * TILE;
const BAG_X = [AX0 + 112, AX1 - 112];
const BAG_BACK = 520; // frames until a fallen sandbag is hoisted again

interface Bag { x: number; y: number; vy: number; state: 'hang' | 'fall' | 'gone'; t: number; s: Sprite; rope: Cord }
interface Hand { x: number; y: number; s: Sprite; arm: Cord }

export class Marionette extends TrialBoss {
  label = 'LADY MARROW';
  /** How far she is hoisted off the stage (part one). */
  lift = 0;
  taut = false;
  strings: Cord[];
  bags: Bag[];
  hands: Hand[] = [];
  /** Part two: the carrying hand has her. */
  carried = false;
  knuckles = 0;
  constructor(g: Game, x: number) {
    super(g, 'marionette', lazySheet('marionette', buildMarionetteSheet), 12, 26, x);
    const curtain = lazySheet('curtain', buildCurtain), props = lazySheet('stageProps', buildStageProps);
    for (const cx of [AX0 + 30, AX1 - 30]) {
      const c = new Sprite(curtain, g.view.sprites, 3);
      c.place(cx, GANTRY, cx > AMID);
      this.props.push(c);
    }
    this.strings = [0, 1, 2].map(() => new Cord(g, '#d8d0c0', 9, 0.7));
    this.bags = BAG_X.map((bx) => {
      const s = new Sprite(props, g.view.sprites, 9);
      this.props.push(s);
      return { x: bx, y: this.bagY, vy: 0, state: 'hang' as const, t: 0, s, rope: new Cord(g, '#8c6430', 8) };
    });
    this.gear.push(...this.strings, ...this.bags.map((b) => b.rope));
    this.facing = -1;
    this.lift = 240;
  }
  get bagY() {
    return this.floorY - 92;
  }
  get ground() {
    return this.floorY - this.hh;
  }
  /** The hand that strikes (part two), while its fist lies on the stage. */
  get resting() {
    return this.pat === 'slam' && this.data.rest ? this.hands[1] : null;
  }
  targets(): Target[] {
    const out: Target[] = [];
    this.bags.forEach((b, i) => b.state === 'hang' && out.push({ id: `bag${i}`, x: b.x, y: b.y - 6, r: 14 }));
    if (this.taut) for (const dy of [44, 66, 88, 110]) out.push({ id: 'string', x: this.x, y: this.y - dy, r: 10 });
    const h = this.resting;
    if (h) out.push({ id: 'hand', x: h.x, y: h.y + 12, r: 24 });
    out.push({ id: 'body', x: this.x, y: this.y, r: 20 });
    return out;
  }
  hurtZones(): Target[] {
    return this.vulnT > 0 ? [] : [{ id: 'body', x: this.x, y: this.y, r: 13 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id.startsWith('bag')) {
      const b = this.bags[+t.id.slice(3)];
      b.state = 'fall';
      b.vy = 0;
      g.audio.play('snap');
    } else if (t.id === 'string') {
      g.audio.play('snap');
      g.fx.burst(t.x, t.y, 'spark', 6, 6, { speed: 1.6, life: 20 });
      this.stun(g, 300, 'A STRING SNAPS: STRIKE');
    } else if (t.id === 'hand') {
      this.knuckles++;
      g.audio.play('hit');
      g.fx.burst(t.x, t.y, 'spark', 4, 10);
      g.damageNumber(t.x, t.y - 24, `${this.knuckles}/3`, '#f0cc68');
      this.hands[1].s.flash = 0.8;
      if (this.knuckles >= 3) this.dropDoll(g, 'THE HAND LETS HER GO: STRIKE');
    } else this.bodyHit(g, t, kind);
  }
  dropDoll(g: Game, msg: string) {
    this.knuckles = 0;
    this.carried = false;
    this.stun(g, 300, msg);
  }
  endStun(g: Game) {
    super.endStun(g);
    if (this.phase === 2 && this.hands.length) {
      // the carrying hand reaches down and takes her up again
      this.hands[0].x = this.x;
      this.hands[0].y = this.y - 60;
      this.carried = true;
    }
  }
  onShift(g: Game) {
    g.audio.play('snap');
    for (const s of this.strings) s.hide();
    this.taut = false;
  }
  whileDying() {
    for (const h of this.hands) {
      h.y -= 2.5;
      this.drawHand(h);
    }
    this.y = Math.min(this.ground, this.y + 4);
  }
  drawHand(h: Hand) {
    h.s.place(h.x, h.y);
    h.arm.set(h.x, h.y - 40, h.x, Math.min(h.y - 41, GANTRY - 40), 26);
  }
  updateBags(g: Game) {
    for (const b of this.bags) {
      if (b.state === 'fall') {
        b.vy += 0.34;
        b.y += b.vy;
        this.hit(g, { x: b.x, y: b.y, hw: 13, hh: 16 }, this.atk - 4, 'shot', b.x);
        const h = this.resting;
        if (h && Math.abs(b.x - h.x) < 34 && b.y > h.y - 30) this.dropDoll(g, 'THE SANDBAG BREAKS ITS GRIP: STRIKE');
        else if (this.vulnT <= 0 && !this.shielded && Math.abs(b.x - this.x) < 26 && b.y > this.y - this.hh - 8 && b.y < this.y + this.hh) {
          if (this.phase === 2) this.dropDoll(g, 'FLATTENED: STRIKE');
          else this.stun(g, 300, 'FLATTENED: STRIKE');
        }
        if (b.y >= this.floorY - 14 || this.vulnT === 300) {
          b.state = 'gone';
          b.t = 0;
          g.audio.play('crumble');
          g.shake(3, 10);
          g.fx.burst(b.x, Math.min(b.y, this.floorY - 8), 'dust', 8, 12, { speed: 1.6, grav: 0.08, life: 30, fade: true });
        }
      } else if (b.state === 'gone' && ++b.t > BAG_BACK) {
        b.state = 'hang';
        b.y = this.bagY;
      }
      b.s.visible = b.state !== 'gone';
      b.s.place(b.x, b.y);
      if (b.state === 'hang') b.rope.set(b.x, GANTRY, b.x, b.y - 26, 1.5);
      else b.rope.hide();
    }
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2 && this.hands.length > 0;
    this.updateBags(g);
    this.taut = false;
    if (two && this.pat !== 'shift') this.runHands(g);
    else
      switch (this.pat) {
        case 'enter':
          // lowered onto the stage from the dark of the flies
          this.lift = Math.max(0, this.lift - 3.4);
          if (this.lift > 0) this.loop('held', 6);
          else if (this.pt < 130) this.once('curtsey', Math.max(0, this.pt - 84), 100);
          else this.loop('idle', 7);
          this.enterBeats(g, 84, 150);
          break;
        case 'shift': {
          // every string lets go at once; then the hands come down for her
          this.lift = Math.max(0, this.lift - 6);
          this.loop('stun', 8);
          if (this.pt === 36) {
            const sheet = lazySheet('puppetHand', buildHandSheet);
            this.hands = [AMID - 90, AMID + 90].map((hx) => {
              const h: Hand = { x: hx, y: GANTRY - 80, s: new Sprite(sheet, g.view.sprites, 12), arm: new Cord(g, '#32101e', 12) };
              this.props.push(h.s);
              this.gear.push(h.arm);
              return h;
            });
            g.audio.play('rumble');
            g.shake(3, 40);
          }
          for (const h of this.hands) {
            h.y = Math.min(this.floorY - 150, h.y + 2.6);
            h.s.setFrame(h.s.sheet.anims.open[Math.floor(g.frame / 6) % 8]);
            this.drawHand(h);
          }
          this.shiftBeats(g, 116);
          if ((this.pat as string) === 'idle') this.endStun(g); // the scene is over: the hand takes her up
          break;
        }
        case 'idle': {
          this.look();
          this.lift = Math.max(0, this.lift - 4);
          const far = Math.abs(this.dx) > 70;
          if (far) this.x += this.facing * 1.05;
          this.loop(far ? 'dance' : 'idle', far ? 5 : 7);
          if (this.pt > 64) this.pick(Math.abs(this.dx) < 120 ? this.choose(['curtsey', 'pirouette', 'kick']) : this.choose(['kick', 'pirouette']));
          break;
        }
        case 'pirouette': {
          if (this.pt === 1) d.dir = this.facing;
          if (this.pt < 22) this.loop('spin', 6, this.pt);
          else {
            this.x += d.dir * 2.7;
            if (this.x < AX0 + 22 || this.x > AX1 - 22) d.dir = -d.dir;
            this.loop('spin', 3, this.pt);
            this.facing = Math.floor(this.pt / 6) % 2 ? 1 : -1; // she turns as she goes
            this.hit(g, { x: this.x, y: this.y - 2, hw: 24, hh: 22 });
            if (this.pt % 12 === 0) g.audio.play('whip');
          }
          if (this.pt > 112) this.pick('idle');
          break;
        }
        case 'kick': {
          if (this.pt <= 44) {
            // hoisted: the strings are as tight as they get
            this.lift = Math.sin(Math.min(1, this.pt / 34) * Math.PI / 2) * 72;
            this.once('rise', this.pt, 34);
            this.taut = this.pt > 5;
            this.look();
            if (this.pt === 1) g.audio.play('creak');
            if (this.pt === 44) {
              d.x0 = this.x;
              d.tx = clamp(p.x, AX0 + 20, AX1 - 20);
              g.audio.play('dash');
            }
          } else if (this.pt <= 60) {
            const t = (this.pt - 44) / 16;
            this.x = lerp(d.x0, d.tx, t);
            this.lift = 72 * (1 - t * t);
            this.once('kick', this.pt - 44, 8);
            this.hit(g, { x: this.x + this.facing * 8, y: this.y + 6, hw: 16, hh: 20 }, this.atk + 4);
            if (this.pt === 60) {
              g.shake(3, 10);
              g.fx.burst(this.x, this.floorY - 2, 'dust', 6, 10, { vy: -0.5 });
            }
          } else {
            this.loop('idle', 7);
            if (this.pt > 96) this.pick('idle');
          }
          break;
        }
        case 'curtsey': {
          this.once('curtsey', this.pt, 62);
          this.taut = this.pt > 6 && this.pt < 38;
          if (this.pt === 38) g.audio.play('dash');
          if (this.pt >= 38 && this.pt < 52) {
            this.x += this.facing * 5.6;
            this.hit(g, { x: this.x + this.facing * 24, y: this.y - 2, hw: 24, hh: 16 });
          }
          if (this.pt > 88) this.pick('idle');
          break;
        }
        case 'stun':
          this.lift = Math.max(0, this.lift - 7);
          this.loop('stun', 8);
          break;
      }
    this.x = clamp(this.x, AX0 + 18, AX1 - 18);
    if (!two) {
      this.y = this.ground - this.lift;
      // her strings: slack and pale, or taut and bright
      const show = this.pat !== 'stun' && this.pat !== 'shift' && this.phase === 1;
      const ends: [number, number][] = [[this.x, this.y - this.hh + 2], [this.x + this.facing * 13, this.y - 8], [this.x - this.facing * 11, this.y - 6]];
      this.strings.forEach((s, i) => {
        if (!show) return s.hide();
        const jit = this.taut ? Math.sin(g.frame * 1.7 + i) * 0.8 : 0;
        s.color(this.taut ? '#ffe070' : '#d8d0c0');
        s.set(ends[i][0] + jit, ends[i][1], ends[i][0] * 0.8 + AMID * 0.2 + (i - 1) * 10, GANTRY, this.taut ? 2 : 1);
      });
    }
  }
  /** Part two: the two hands and the doll that hangs from one of them. */
  runHands(g: Game) {
    const p = g.player, d = this.data, [carry, fist] = this.hands;
    const HOVER = this.floorY - 150, CARRY = this.floorY - 112, HA = fist.s.sheet.anims;
    let fistFrame = HA.open[Math.floor(g.frame / 6) % 8];
    fist.s.flash = 0;
    // where the doll hangs under the carrying hand (fling swings her out on her strings)
    let swing = 0;
    switch (this.pat) {
      case 'idle': {
        const side = p.x < AMID ? 1 : -1;
        carry.x += (clamp(p.x + side * 116, AX0 + 30, AX1 - 30) - carry.x) * 0.04;
        carry.y += (CARRY - carry.y) * 0.08;
        fist.x += (clamp(p.x - side * 40, AX0 + 30, AX1 - 30) - fist.x) * 0.03;
        fist.y += (HOVER - fist.y) * 0.08;
        this.facing = p.x < carry.x ? -1 : 1;
        if (this.pt > 56) this.pick(this.choose(['slam', 'sweep', 'fling']));
        break;
      }
      case 'slam': {
        fistFrame = HA.fist[this.pt < 30 ? 0 : 1];
        if (this.pt < 44) {
          fist.x += (p.x - fist.x) * 0.12;
          fist.y += (HOVER + Math.sin(this.pt * 0.6) * 3 - fist.y) * 0.2;
          if (this.pt === 20) g.audio.play('creak');
        } else if (this.pt < 52) fist.y = lerp(HOVER, this.floorY - 26, (this.pt - 43) / 8);
        else if (this.pt === 52) {
          fist.y = this.floorY - 26;
          g.audio.play('rumble');
          g.shake(6, 20);
          g.fx.burst(fist.x, this.floorY - 2, 'dust', 10, 20, { speed: 1.8, life: 30, fade: true });
          this.hit(g, { x: fist.x, y: this.floorY - 22, hw: 28, hh: 24 }, this.atk + 6, 'melee', fist.x);
          d.rest = true;
        } else if (this.pt > 140) {
          d.rest = false;
          fist.y -= 4;
          if (fist.y <= HOVER) this.pick('idle');
        }
        break;
      }
      case 'sweep': {
        if (this.pt === 1) d.from = p.x < AMID ? AX1 - 34 : AX0 + 34;
        const dir = d.from > AMID ? -1 : 1;
        if (this.pt < 44) {
          fist.x += (d.from - fist.x) * 0.1;
          fist.y += (this.floorY - 30 - fist.y) * 0.1;
        } else {
          if (this.pt === 44) g.audio.play('dash');
          fist.x += dir * 4.4;
          fist.y = this.floorY - 30;
          this.hit(g, { x: fist.x, y: this.floorY - 24, hw: 24, hh: 24 }, this.atk, 'melee', fist.x - dir * 20);
          if (this.pt % 4 === 0) g.fx.burst(fist.x, this.floorY - 2, 'dust', 1, 6);
          if (dir > 0 ? fist.x > AX1 - 34 : fist.x < AX0 + 34) this.pick('idle');
        }
        break;
      }
      case 'fling': {
        if (this.pt < 34) {
          carry.x += (clamp(p.x - this.facing * 64, AX0 + 30, AX1 - 30) - carry.x) * 0.1;
          carry.y += (CARRY - 26 - carry.y) * 0.1;
          this.facing = p.x < carry.x ? -1 : 1;
          if (this.pt === 20) g.audio.play('creak');
        } else {
          const t = (this.pt - 34) / 46;
          swing = Math.sin(t * Math.PI) * 1.35 * this.facing;
          carry.y += (CARRY - carry.y) * 0.2;
          if (this.pt === 36) g.audio.play('whip');
          if (t >= 1) this.pick('idle');
        }
        break;
      }
      case 'stun':
        // she lies where she fell; the hands draw back and wring themselves
        this.y = Math.min(this.ground, this.y + 5);
        this.loop('stun', 8);
        for (const h of this.hands) h.y += (HOVER - 30 - h.y) * 0.06;
        break;
    }
    if (this.carried && this.pat !== 'stun') {
      this.x = carry.x + Math.sin(swing) * 62;
      this.y = carry.y + Math.cos(swing) * 62;
      if (swing) {
        this.fr = this.A.kick[this.A.kick.length - 1];
        this.hit(g, { x: this.x + this.facing * 8, y: this.y + 4, hw: 18, hh: 20 }, this.atk + 2);
      } else this.loop('held', 6);
      this.strings.forEach((s, i) => (i < 2 ? s.set(carry.x + (i ? 8 : -8), carry.y + 22, this.x + (i ? 5 : -5), this.y - this.hh + 6, 1) : s.hide()));
    } else for (const s of this.strings) s.hide();
    carry.s.setFrame(HA.grip[Math.floor(g.frame / 20) % 2]);
    fist.s.setFrame(fistFrame);
    for (const h of this.hands) this.drawHand(h);
  }
}
