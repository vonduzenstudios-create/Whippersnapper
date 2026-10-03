// The Powder Baron (trial boss, 0.27.0). A gun battery on the east rampart.
//
// Everything he throws can be sent back:
//   - TOSS: fused bombs. Whip one and it flies off the way you struck it; a bomb that bursts
//     beside him opens him up
//   - KEG: a powder keg rolled along the floor. Whip it and it rolls back to him
//   - CANNON: a ball at chest height (duck, jump or block it). Put the powder store between
//     you and him and the ball sets it off; if he is near it, he is caught in it
// Up close he just boots you away. Phase two: he pours a line of powder and lights it (jump
// the flame as it runs), fires chain-shot that tumbles as it flies, and tosses three bombs.
import type { Game } from './game';
import { HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target } from './boss_base';
import { TrialBoss, Bullet, AX0, AX1, AMID } from './boss_kit';
import { lazySheet } from '../gfx/lazy';
import { buildBaronSheet, buildBaronProps } from '../gfx/art_baron';
import { clamp } from '../core/util';

const STACK_BACK = 900;

export class Baron extends TrialBoss {
  label = 'POWDER BARON';
  stack: Sprite;
  stackT = 0; // frames until the powder store is restocked (0 = it is there)
  trail: Sprite[] = [];
  constructor(g: Game, x: number) {
    super(g, 'baron', lazySheet('baron', buildBaronSheet), 17, 27, x);
    const props = this.propSheet;
    this.stack = new Sprite(props, g.view.sprites, 9);
    this.stack.setFrame(props.anims.stack[0]);
    this.stack.place(AMID, this.floorY - 24);
    this.props.push(this.stack);
    this.facing = -1;
  }
  get propSheet() {
    return lazySheet('baronProps', buildBaronProps);
  }
  targets(): Target[] {
    return [{ id: 'body', x: this.x, y: this.y - 2, r: 24 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    this.bodyHit(g, t, kind);
  }
  /** A burst at (x, y): hurts her inside `r`, and catches him if he is inside it too. */
  blast(g: Game, x: number, y: number, r = 40, msg = 'HOIST BY HIS OWN PETARD: STRIKE') {
    g.audio.play('explode');
    g.shake(5, 14);
    g.fx.burst(x, y, 'burst', 5, r * 0.5, { fps: 10 });
    g.fx.burst(x, y, 'smoke', 4, r * 0.5, { vy: -0.5, life: 36, fade: true });
    const p = g.player;
    if (p.alive && p.invuln <= 0 && Math.hypot(p.x - x, p.y - y) < r) p.takeDamage(this.atk, x, false, true, 'magic', y);
    if (Math.hypot(this.x - x, this.y - y) < r + 12 && this.pat !== 'enter') this.stun(g, 300, msg);
  }
  bomb(g: Game, tx: number, fuse: number) {
    const T = 60, floor = this.floorY - 7;
    const b = new Bullet(g, this.x + this.facing * 8, this.y - 34, (tx - this.x) / T, -4.8, 6, {
      sheet: this.propSheet, anim: 'bomb', per: 4, r: 7, grav: 0.16, type: 'magic', solid: false, life: fuse,
      tick: (b) => {
        if (b.y > floor) {
          b.y = floor;
          b.vy = b.vy > 1.5 ? -b.vy * 0.35 : 0;
          b.vx *= 0.7;
          b.grav = b.vy ? 0.16 : 0;
        }
        if (b.x < AX0 + 8 || b.x > AX1 - 8) b.vx = -b.vx;
        if (b.life - b.t < 40) b.sprite!.flash = b.t % 6 < 3 ? 0.7 : 0; // about to go
        if (g.frame % 5 === 0) g.fx.burst(b.x + 3, b.y - 12, 'spark', 1, 1, { life: 8 });
      },
      end: (b) => this.blast(g, b.x, b.y),
      whip: (b, _g, fromX) => {
        b.vx = (b.x >= fromX ? 1 : -1) * 4.4;
        b.vy = -3.2;
        b.grav = 0.16;
        g.audio.play('clink');
      },
    });
    g.spawn(b);
  }
  keg(g: Game) {
    const k = new Bullet(g, this.x + this.facing * 26, this.floorY - 11, this.facing * 2.3, 0, this.atk - 4, {
      sheet: this.propSheet, anim: 'keg', per: 5, r: 10, type: 'shot', solid: false, life: 600,
      tick: (b) => {
        if (b.x < AX0 + 12 || b.x > AX1 - 12) b.strike(g, false);
        else if ((b as any).back && Math.abs(b.x - this.x) < 22) b.strike(g, false);
        if (g.frame % 6 === 0) g.fx.burst(b.x, this.floorY - 2, 'dust', 1, 2);
      },
      end: (b) => this.blast(g, b.x, b.y - 6, 44),
      whip: (b, _g, fromX) => {
        b.vx = (b.x >= fromX ? 1 : -1) * 3.4;
        (b as any).back = true;
        g.audio.play('knock');
      },
    });
    g.spawn(k);
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    this.y = this.floorY - this.hh;
    // the powder store
    if (this.stackT > 0 && --this.stackT === 0) g.fx.burst(AMID, this.floorY - 24, 'smoke', 4, 10, { life: 24, fade: true });
    this.stack.visible = this.stackT <= 0;
    for (const s of this.trail) s.visible = this.pat === 'trail';
    switch (this.pat) {
      case 'enter':
        this.loop(this.pt < 60 ? 'idle' : 'shift', 6);
        if (this.pt === 60) g.audio.play('roar');
        this.enterBeats(g, 62, 126);
        break;
      case 'shift':
        this.loop('shift', 5);
        if (this.pt % 26 === 1) this.blast(g, AX0 + 40 + Math.random() * (AX1 - AX0 - 80), this.floorY - 150, 0);
        this.shiftBeats(g, 104);
        break;
      case 'idle': {
        this.look();
        const far = Math.abs(this.dx) > 190;
        if (far) this.x += this.facing * 0.7;
        this.loop(far ? 'walk' : 'idle', 7);
        if (Math.abs(this.dx) < 54 && this.pt > 16) this.pick('boot');
        else if (this.pt > (two ? 52 : 78)) this.pick(this.choose(two ? ['toss', 'keg', 'cannon', 'trail', 'chain'] : ['toss', 'keg', 'cannon']));
        break;
      }
      case 'boot':
        this.once('kick', this.pt, 34);
        if (this.pt >= 16 && this.pt <= 24) this.hit(g, { x: this.x + this.facing * 28, y: this.y + 4, hw: 20, hh: 18 }, this.atk);
        if (this.pt > 50) this.pick('idle');
        break;
      case 'toss':
        this.once('toss', this.pt, 44);
        if (this.pt === 26) {
          g.audio.play('throw');
          const n = two ? 3 : this.opened > 0 ? 2 : 1;
          for (let i = 0; i < n; i++) this.bomb(g, clamp(p.x + (i - (n - 1) / 2) * 56, AX0 + 20, AX1 - 20), (two ? 120 : 150) + i * 14);
        }
        if (this.pt > 90) this.pick('idle');
        break;
      case 'keg':
        this.once('kick', this.pt, 36);
        if (this.pt === 20) {
          g.audio.play('knock');
          this.keg(g);
        }
        if (this.pt > 80) this.pick('idle');
        break;
      case 'cannon': {
        const tell = two ? 28 : 38;
        this.once('fire', this.pt, tell * 2);
        if (this.pt < tell && g.frame % 4 === 0) g.fx.burst(this.x - this.facing * 6, this.y - 30, 'spark', 1, 2, { life: 10 });
        if (this.pt === Math.round(tell * 1.24)) {
          g.audio.play('explode');
          g.shake(3, 8);
          this.x -= this.facing * 5;
          g.fx.burst(this.x + this.facing * 26, this.y - 16, 'smoke', 3, 4, { life: 26, fade: true });
          g.spawn(new Bullet(g, this.x + this.facing * 26, this.floorY - 32, this.facing * 5.6, 0, this.atk + 2, {
            sheet: this.propSheet, anim: 'ball', r: 5, type: 'shot', life: 200,
            tick: (b) => {
              // the powder store is in the way
              if (this.stackT <= 0 && Math.abs(b.x - AMID) < 18) {
                b.dead = true;
                this.stackT = STACK_BACK;
                this.blast(g, AMID, this.floorY - 26, 110, 'THE POWDER STORE GOES UP: STRIKE');
                g.shake(8, 26);
              }
            },
          }));
        }
        if (this.pt > tell * 2 + 30) this.pick('idle');
        break;
      }
      case 'trail': {
        // pour a line of powder toward her, then put the match to it
        const POUR = 56, dir = this.facing, PA = this.propSheet.anims.powder[0];
        if (this.pt === 1) d.len = 0;
        if (this.pt < POUR) {
          this.once('toss', this.pt, POUR * 1.6);
          d.len = Math.min((dir > 0 ? AX1 - this.x : this.x - AX0) - 20, this.pt * 9);
          const n = Math.ceil(d.len / 48);
          while (this.trail.length < n) {
            const s = new Sprite(this.propSheet, g.view.sprites, 9);
            s.setFrame(PA);
            this.trail.push(s);
            this.props.push(s);
          }
          this.trail.forEach((s, i) => {
            s.visible = i < n;
            s.place(this.x + dir * (20 + i * 48 + 24), this.floorY - 26);
          });
        } else {
          this.once('fire', this.pt - POUR, 30);
          if (this.pt === POUR) g.audio.play('fire');
          const fx = this.x + dir * (20 + (this.pt - POUR) * 4.6);
          this.trail.forEach((s, i) => (s.visible = dir * (s.mesh.position.x - fx) > 0 && i < Math.ceil(d.len / 48)));
          g.fx.burst(fx, this.floorY - 6, 'fire', 1, 3, { sheet: 'fire', life: 14, vy: -0.6, order: 14 });
          this.hit(g, { x: fx, y: this.floorY - 10, hw: 8, hh: 11 }, this.atk - 4, 'magic', fx - dir * 10);
          if ((this.pt - POUR) * 4.6 > d.len) this.pick('idle');
        }
        break;
      }
      case 'chain': {
        const tell = 30;
        this.once('fire', this.pt, tell * 2);
        if (this.pt === Math.round(tell * 1.24)) {
          g.audio.play('explode');
          // two balls on a chain, turning round each other as they fly
          const c = { x: this.x + this.facing * 30, y: this.floorY - 36, vx: this.facing * 2.5, a: 0 };
          for (const s of [0, Math.PI])
            g.spawn(new Bullet(g, c.x, c.y, 0, 0, this.atk, {
              sheet: this.propSheet, anim: 'ball', r: 5, type: 'shot', solid: false, life: 260,
              tick: (b) => {
                if (!s) {
                  c.x += c.vx;
                  c.a += 0.12;
                }
                b.x = c.x + Math.cos(c.a + s) * 24;
                b.y = c.y + Math.sin(c.a + s) * 24;
                if (c.x < AX0 + 6 || c.x > AX1 - 6) b.dead = true;
              },
            }));
        }
        if (this.pt > tell * 2 + 40) this.pick('idle');
        break;
      }
      case 'stun':
        this.loop('stun', 7);
        break;
    }
    this.x = clamp(this.x, AX0 + 26, AX1 - 26);
  }
}
