// The Censer Saint (trial boss, 0.27.0). A bullet-hell sermon, fed by four hanging censers.
//
// Every pattern comes from him and from the censers that are lit (never from the sky):
//   SPIRAL  two turning arms of cinders from his hands
//   RINGS   a ring from him and from each lit censer, three times
//   FANS    the lit censers throw fans at where you stand
//   SWING   he whirls his own censer round on its chain (close range)
// To open him up:
//   - snuff all four hanging censers (two blows each; they relight in time): he chokes
//   - strike his own censer as it comes round to the front of its swing (it flashes white):
//     it flies back into his face
// Fewer lit censers also means thinner patterns. Phase two: he walks, the spiral turns both
// ways at once, the rings come four times, and the censers relight sooner.
import type { Game } from './game';
import { HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target } from './boss_base';
import { TrialBoss, Bullet, Chain, AX0, AX1, AMID } from './boss_kit';
import { lazySheet } from '../gfx/lazy';
import { buildSaintSheet, buildSaintProps, buildRoseWindow } from '../gfx/art_saint';
import { clamp } from '../core/util';
import { TILE } from '../config';

const CEIL = 10 * TILE;
const CX = [AX0 + 80, AX0 + 192, AX1 - 192, AX1 - 80];
const SWING_LEN = 72;

interface Censer { x: number; y: number; hits: number; out: number; s: Sprite; chain: Chain }

export class Saint extends TrialBoss {
  label = 'CENSER SAINT';
  censers: Censer[];
  own: Sprite;
  ownChain: Chain;
  /** Where his own censer is, and whether it is at the front of its swing. */
  ownAt = { x: 0, y: 0 };
  ripe = false;
  constructor(g: Game, x: number) {
    super(g, 'saint', lazySheet('saint', buildSaintSheet), 14, 30, x);
    const props = lazySheet('saintProps', buildSaintProps);
    const rose = new Sprite(lazySheet('roseWindow', buildRoseWindow), g.view.sprites, 2);
    rose.place(AMID, CEIL + 84);
    this.censers = CX.map((cx) => {
      const c: Censer = { x: cx, y: this.floorY - 100, hits: 0, out: 9999, s: new Sprite(props, g.view.sprites, 9), chain: new Chain(g, 'link', 8, 6) };
      c.chain.set(cx, CEIL, cx, c.y - 22);
      this.gear.push(c.chain);
      return c;
    });
    this.own = new Sprite(props, g.view.sprites, 12);
    this.ownChain = new Chain(g, 'link', 12, 5);
    this.gear.push(this.ownChain);
    this.props.push(rose, this.own, ...this.censers.map((c) => c.s));
    this.x = AMID;
    this.facing = -1;
  }
  get lit() {
    return this.censers.filter((c) => c.out <= 0);
  }
  targets(): Target[] {
    const out: Target[] = this.lit.map((c) => ({ id: `c${this.censers.indexOf(c)}`, x: c.x, y: c.y, r: 12 }));
    if (this.pat === 'swing') out.push({ id: 'own', x: this.ownAt.x, y: this.ownAt.y, r: 11 });
    out.push({ id: 'body', x: this.x, y: this.y, r: 22 });
    return out;
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id === 'own') {
      if (!this.ripe) return this.clank(g, t.x, t.y);
      g.audio.play('dong');
      g.fx.burst(this.x, this.y - 30, 'ember', 14, 10, { speed: 2.4, life: 30, glow: 1 });
      return this.stun(g, 300, 'HIS OWN CENSER STRIKES HIM: STRIKE');
    }
    if (t.id[0] === 'c') {
      const c = this.censers[+t.id.slice(1)];
      g.audio.play('clink');
      g.fx.burst(c.x, c.y, 'ember', 5, 6, { speed: 1.4, life: 22, glow: 1 });
      if (++c.hits >= 2) {
        c.hits = 0;
        c.out = this.phase === 2 ? 360 : 540;
        g.audio.play('flame');
        g.fx.burst(c.x, c.y - 8, 'smoke', 4, 6, { vy: -0.6, life: 40, fade: true });
        if (!this.lit.length) this.stun(g, 320, 'THE CENSERS ARE OUT. HE CHOKES: STRIKE');
      }
      return;
    }
    this.bodyHit(g, t, kind);
  }
  endStun(g: Game) {
    super.endStun(g);
    for (const c of this.censers) c.out = Math.min(c.out, 60); // his breath back, the coals catch again
  }
  /** One cinder. */
  shoot(g: Game, x: number, y: number, ang: number, speed: number) {
    g.spawn(new Bullet(g, x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, Math.round(this.atk * 0.55), { anim: 'ember', scale: 1.7, glow: 0.8, r: 3, life: 300, type: 'magic' }));
  }
  run(g: Game) {
    const p = g.player, two = this.phase === 2;
    this.y = this.floorY - this.hh;
    const hand = { x: this.x + this.facing * 11, y: this.y - 10 };
    // ── the hanging censers
    const CA = this.censers[0].s.sheet.anims;
    for (const c of this.censers) {
      if (c.out > 0 && this.pat !== 'enter' && --c.out === 0) {
        g.audio.play('fire');
        g.fx.burst(c.x, c.y, 'ember', 6, 6, { speed: 1.2, life: 24, glow: 1 });
      }
      const lit = c.out <= 0;
      c.s.setFrame(lit ? CA.lit[Math.floor(g.frame / 8) % 4] : CA.out[0]);
      c.s.place(c.x, c.y);
      c.s.glow = lit ? 0.25 : 0;
      if (!lit && g.frame % 14 === 0) g.fx.burst(c.x, c.y - 12, 'smoke', 1, 2, { vy: -0.4, life: 36, fade: true });
    }
    // ── his own censer: it hangs from his hand unless a pattern says otherwise
    let ox = hand.x + Math.sin(g.frame * 0.07) * 6, oy = hand.y + 24;
    this.ripe = false;
    switch (this.pat) {
      case 'enter':
        this.loop(this.pt > 90 ? 'cast' : 'idle', 7);
        if (this.pt % 20 === 0 && this.pt <= 80) {
          const c = this.censers[this.pt / 20 - 1];
          c.out = 0;
          g.audio.play('fire');
          g.fx.burst(c.x, c.y, 'ember', 8, 6, { speed: 1.4, life: 26, glow: 1 });
        }
        this.enterBeats(g, 92, 150);
        break;
      case 'shift':
        this.loop('cast', 5);
        if (this.pt % 16 === 0) {
          g.audio.play('fire');
          for (const c of this.censers) {
            c.out = 0;
            g.fx.burst(c.x, c.y, 'ember', 4, 8, { speed: 2, life: 26, glow: 1 });
          }
        }
        this.shiftBeats(g, 100);
        break;
      case 'idle': {
        this.look();
        const walk = two && Math.abs(this.dx) > 90;
        if (walk) this.x += this.facing * 0.55;
        this.loop(walk ? 'walk' : 'idle', 7);
        if (this.pt > (two ? 50 : 76)) this.pick(Math.abs(this.dx) < 130 ? this.choose(['swing', 'spiral', 'swing', 'rings']) : this.choose(['spiral', 'rings', 'fans']));
        break;
      }
      case 'spiral': {
        this.loop('cast', 6);
        if (this.pt === 1) g.audio.play('breath');
        if (this.pt > 24 && this.pt % 6 === 0) {
          const a = this.pt * 0.085;
          for (let k = 0; k < 2; k++) this.shoot(g, this.x, this.y - 34, a + k * Math.PI, 1.5);
          if (two) for (let k = 0; k < 2; k++) this.shoot(g, this.x, this.y - 34, -a + k * Math.PI + 0.5, 1.2);
        }
        if (this.pt > (two ? 190 : 160)) this.pick('idle');
        break;
      }
      case 'rings': {
        this.loop('cast', 6);
        const every = 46, n = two ? 4 : 3;
        if (this.pt % every === 20 && this.pt < every * n) {
          g.audio.play('fire');
          const gap = Math.random() * Math.PI * 2;
          for (let k = 0; k < 12; k++) {
            const a = gap + (k / 12) * Math.PI * 2;
            if (k > 1) this.shoot(g, this.x, this.y - 30, a, 1.35); // two missing: the way through
          }
          for (const c of this.lit) {
            const off = Math.random() * Math.PI;
            for (let k = 0; k < 7; k++) this.shoot(g, c.x, c.y, off + (k / 7) * Math.PI * 2, 1.15);
          }
        }
        if (this.pt > every * n + 30) this.pick('idle');
        break;
      }
      case 'fans': {
        this.loop('cast', 6);
        if (this.pt % 34 === 16 && this.pt < 34 * 3) {
          g.audio.play('fire');
          const from = this.lit.length ? this.lit : [{ x: this.x, y: this.y - 34 }];
          for (const c of from) {
            const a = Math.atan2(p.y - c.y, p.x - c.x);
            for (let k = -2; k <= 2; k++) if (k) this.shoot(g, c.x, c.y, a + k * 0.24, 1.9);
          }
        }
        if (this.pt > 34 * 3 + 30) this.pick('idle');
        break;
      }
      case 'swing': {
        // a wind-up, then round and round; the censer leads with the side he faces
        const wind = 30, turn = two ? 40 : 50, turns = two ? 3 : 2;
        if (this.pt < wind) this.look();
        const k = Math.max(0, this.pt - wind) / turn;
        const a = -Math.PI / 2 + k * Math.PI * 2 * this.facing;
        const len = SWING_LEN * Math.min(1, this.pt / wind);
        ox = hand.x + Math.cos(a) * len;
        oy = hand.y - 8 + Math.sin(a) * len;
        const A = this.A.swing;
        this.fr = A[Math.floor(((k % 1) + 1) * A.length) % A.length];
        if (this.pt >= wind) {
          const front = Math.cos(a) * this.facing;
          this.ripe = front > 0.86;
          this.hit(g, { x: ox, y: oy, hw: 9, hh: 9 }, this.atk, 'melee', ox - this.facing * 10);
          if (this.pt % turn === wind % turn) g.audio.play('whip');
          if (g.frame % 3 === 0) g.fx.burst(ox, oy, 'ember', 1, 3, { life: 16, glow: 1 });
        }
        if (k >= turns) this.pick('idle');
        break;
      }
      case 'stun':
        this.loop('stun', 6);
        ox = this.x + this.facing * 26;
        oy = this.floorY - 9;
        break;
    }
    this.x = clamp(this.x, AX0 + 60, AX1 - 60);
    this.ownAt = { x: ox, y: oy };
    this.own.setFrame(CA.lit[Math.floor(g.frame / 6) % 4]);
    this.own.place(ox, oy);
    this.own.flash = this.ripe && g.frame % 4 < 2 ? 0.8 : 0;
    this.own.glow = 0.3;
    this.ownChain.set(hand.x, hand.y, ox, oy - 12);
  }
}
