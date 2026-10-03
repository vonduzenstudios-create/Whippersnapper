// The humanoid mini-bosses (0.31.0): the Headsman, the Unhelmed, the Plague Warden, the
// Sanguine Duchess and the Ferryman. Each is a MiniBoss (kit.ts): a few telegraphed attacks,
// each switched on or off in the enemy editor.
import type { Game } from '../game';
import type { HitKind } from '../ent';
import type { Holder } from '../player';
import { MiniBoss, Bit } from './kit';
import { Bullet, Chain } from '../boss_kit';
import { miniProps } from '../../gfx/minis';
import { clamp, rand } from '../../core/util';

// ---------------------------------------------------------------- the Headsman
// chop    the axe comes down in front of him and bites into the floor: stuck there a moment (punish him)
// cage    a gibbet cage hurled on a chain: if it catches her he reels her in and chops
// barge   a shoulder charge (a lunge: the shield blocks it)
export class Headsman extends MiniBoss implements Holder {
  lunges = ['barge'];
  chain: Chain;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 13, 28);
    this.chain = new Chain(g, 'link', 11, 5);
    this.gear.push(this.chain);
  }
  released(mashed: boolean) {
    if (this.st === 'reel') mashed ? this.rest(80) : this.set('chop');
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    if (this.st !== 'hurl' && this.st !== 'reel') this.chain.hide();
    switch (this.st) {
      case 'idle':
        if (!this.sees(g)) {
          this.patrolTurn(g, 0.4 * this.num('speed'));
          this.loop('walk', 8);
          break;
        }
        if (this.approach(g, 0.7, 34)) this.loop('walk', 8);
        else this.loop('idle', 8);
        if (this.cool > 0) break;
        if (dist < 56 && this.can('chop')) this.set('chop');
        else if (dist > 90 && dist < 200 && this.can('cage')) this.set('hurl');
        else if (dist > 60 && dist < 150 && this.can('barge')) this.set('barge');
        break;
      case 'chop': {
        this.vx = 0;
        const k = this.once('chop', 54);
        if (this.stT === 1) g.audio.play('creak');
        if (this.stT === 34) {
          g.audio.play('rumble');
          g.shake(4, 12);
          g.fx.burst(this.x + this.facing * 34, this.bottom - 2, 'dust', 6, 10, { vy: -0.6 });
          this.hit(g, this.front(32, 26, 22, 26), this.atk + 6);
        }
        if (k >= 1) this.set('stuck');
        break;
      }
      case 'stuck':
        // the blade is bitten into the boards: he hauls at it
        this.vx = 0;
        this.loop('stuck', 8);
        if (this.stT > 60) this.set('yank');
        break;
      case 'yank':
        if (this.once('yank', 22) >= 1) this.rest(70);
        break;
      case 'hurl': {
        this.vx = 0;
        this.faceToward(p.x);
        const k = this.once('hurl', 40);
        const hand = { x: this.x + this.facing * 16, y: this.bottom - 40 };
        if (this.stT === 24) {
          g.audio.play('chain');
          // aimed to arc onto her: it gets there in T frames, falling on the way
          const T = Math.max(8, Math.abs(p.x - hand.x) / 4.4), G = 0.06;
          const vy = clamp((p.y - hand.y - 0.5 * G * T * T) / T, -3, 2);
          this.data.cage = new Bullet(g, hand.x, hand.y, this.facing * 4.4, vy, Math.round(this.atk * 0.7), {
            sheet: miniProps('headsman'), anim: 'cage', grav: G, r: 9, type: 'shot', life: 70,
            end: (_b, gg, hurt) => {
              if (hurt && this.st === 'hurl' && gg.player.grab(this, this.num('mash'), 150, true)) {
                this.set('reel');
                gg.message('CAUGHT IN THE CAGE: MASH TO BREAK FREE', 90);
              }
            },
          });
          g.spawn(this.data.cage);
        }
        const c = this.data.cage as Bullet | undefined;
        if (c && !c.dead) this.chain.set(hand.x, hand.y, c.x, c.y);
        else if (this.stT > 24) this.chain.hide();
        if (k > 1.6 && this.st === 'hurl') this.rest(90);
        break;
      }
      case 'reel': {
        // hauling her in on the chain
        this.vx = 0;
        this.loop('reel', 6);
        const hand = { x: this.x + this.facing * 16, y: this.bottom - 40 };
        if (Math.abs(p.x - this.x) > 30) p.x += Math.sign(this.x - p.x) * 2.2;
        this.chain.set(hand.x, hand.y, p.x, p.y - 6);
        if (Math.abs(p.x - this.x) <= 32) {
          p.holdT = 1; // she is in reach: let go of the chain and chop
          this.set('chop');
        }
        if (this.stT > 240) this.rest(60);
        break;
      }
      case 'barge': {
        if (this.stT < 18) {
          this.vx = 0;
          this.faceToward(p.x);
          this.once('barge', 18);
          if (this.stT === 1) g.audio.play('growl');
          break;
        }
        this.loop('barge', 4);
        this.vx = this.facing * 3.6 * this.num('speed');
        this.hit(g, this.front(14, 30, 16, 26), this.atk);
        if (this.stT % 8 === 0) g.fx.burst(this.x, this.bottom - 2, 'dust', 1, 4);
        if (this.stT > 50 || g.room.solidPx(this.x + this.facing * (this.hw + 3), this.y)) this.rest(80);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- the Unhelmed
// bowl    he rolls his own head along the floor at her. While it is gone he is blind: he swings at
//         wherever she last made a noise (moving, jumping, striking). Standing still keeps him lost.
//         Whip the rolling head and it flies back at him: he staggers (an opening).
// slash   up close, a sweep of the sword
export class Unhelmed extends MiniBoss {
  head: Bullet | null = null;
  heard = 0; // where he last heard her
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 12, 28);
  }
  /** Is she making a noise he can hear? */
  noisy(g: Game) {
    const p = g.player;
    return Math.abs(p.vx) > 0.3 || !p.onGround || p.state === 'attack';
  }
  bowl(g: Game) {
    const back = { hit: false };
    this.head = new Bullet(g, this.x + this.facing * 18, this.bottom - 10, this.facing * 3 * this.num('speed'), 0, this.atk, {
      sheet: miniProps('unhelmed'), anim: 'head', per: 3, r: 8, type: 'shot', solid: false, life: 400,
      tick: (b) => {
        b.y = this.bottom - 10;
        // off a wall it comes rolling back
        if (g.room.solidPx(b.x + Math.sign(b.vx) * 10, b.y)) b.vx = -b.vx;
        if (b.t > 30 && Math.abs(b.x - this.x) < 16) {
          b.dead = true;
          this.head = null;
          if (back.hit) this.set('stagger');
          else this.set('catch');
        }
      },
      whip: (b) => {
        // struck back at him, fast
        back.hit = true;
        b.vx = Math.sign(this.x - b.x) * 6;
        g.audio.play('clink');
      },
      end: () => {
        if (this.head && this.st === 'blind') this.set('catch'); // it hit her: it rolls back to him on its own
        this.head = null;
      },
    });
    g.spawn(this.head);
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    switch (this.st) {
      case 'idle':
        if (!this.sees(g)) {
          this.patrolTurn(g, 0.4 * this.num('speed'));
          this.loop('walk', 8);
          break;
        }
        if (this.approach(g, 0.65, 30)) this.loop('walk', 8);
        else this.loop('idle', 8);
        if (this.cool > 0) break;
        if (dist < 48 && this.can('slash')) this.set('slash');
        else if (dist > 70 && this.can('bowl')) this.set('bowl');
        break;
      case 'bowl':
        this.vx = 0;
        this.faceToward(p.x);
        if (this.stT === 18) {
          g.audio.play('throw');
          this.bowl(g);
        }
        if (this.once('bowl', 30) >= 1) {
          this.heard = p.x;
          this.set('blind');
        }
        break;
      case 'blind': {
        // headless: he gropes after the last noise she made
        this.loop('blind', 8);
        if (this.noisy(g)) this.heard = p.x;
        const to = this.heard - this.x;
        this.facing = to < 0 ? -1 : 1;
        this.vx = Math.abs(to) > 20 ? this.facing * 0.55 * this.num('speed') : 0;
        if (Math.abs(to) <= 20 && this.cool <= 0 && this.can('slash')) this.set('slash');
        if (!this.head && this.stT > 400) this.set('catch');
        break;
      }
      case 'catch':
        this.vx = 0;
        if (this.once('catch', 24) >= 1) this.rest(60);
        break;
      case 'stagger':
        this.vx = 0;
        this.loop('stagger', 8);
        if (this.stT === 1) {
          g.audio.play('clink');
          g.shake(3, 10);
        }
        if (this.stT > 100) this.set('catch');
        break;
      case 'slash': {
        this.vx = 0;
        const k = this.once('slash', 34);
        if (this.stT === 1) g.audio.play('creak');
        if (this.stT === 16) g.audio.play('whip');
        if (k > 0.45 && k < 0.65) this.hit(g, this.front(30, 26, 26, 20));
        if (k >= 1) {
          this.cool = 50 * this.num('cooldown');
          this.set(this.head ? 'blind' : 'idle');
        }
        break;
      }
    }
  }
  destroy() {
    if (this.head) this.head.dead = true;
    super.destroy();
  }
}

// ---------------------------------------------------------------- the Plague Warden
// lob     keeps his distance and lobs vials: they burst into poison puddles that linger
// saw     three quick cuts with the bone saw when she comes close
// vent    swings his censer: a choking cloud hangs round him for a while (poison while she stays in it)
export class Warden extends MiniBoss {
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 11, 22);
  }
  poisonFor() {
    return Math.round(240 * this.num('poisonTime'));
  }
  puddle(g: Game, x: number) {
    const fy = this.bottom;
    g.spawn(new Bit(g, miniProps('warden'), 'puddle', x, fy - 2, 240, {
      per: 8, order: 6,
      tick: (b, gg) => {
        const q = gg.player;
        if (q.onGround && Math.abs(q.x - b.x) < 14 && Math.abs(q.bottom - fy) < 6) q.poison(this.poisonFor(), 2);
      },
    }));
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    switch (this.st) {
      case 'idle':
        if (!this.sees(g)) {
          this.patrolTurn(g, 0.35 * this.num('speed'));
          this.loop('walk', 9);
          break;
        }
        this.faceToward(p.x);
        // he likes a gap of about 110 px
        if (dist < 90 && !(dist < 44 && this.can('saw'))) {
          this.vx = -this.facing * 0.6 * this.num('speed');
          this.loop('walk', 9);
        } else if (dist > 150) {
          this.vx = this.facing * 0.6 * this.num('speed');
          this.loop('walk', 9);
        } else {
          this.vx = 0;
          this.loop('idle', 8);
        }
        if (this.cool > 0) break;
        if (dist < 44 && this.can('saw')) this.set('saw');
        else if (this.can('vent') && Math.random() < 0.3 && dist < 120) this.set('vent');
        else if (this.can('vials')) this.set('lob');
        break;
      case 'lob': {
        this.vx = 0;
        this.faceToward(p.x);
        const k = this.once('lob', 40);
        if (this.stT === 26) {
          g.audio.play('throw');
          const T = 50, vx = clamp((p.x - this.x) / T, -4, 4);
          g.spawn(new Bullet(g, this.x + this.facing * 8, this.bottom - 46, vx, -3.6, Math.round(this.atk * 0.5), {
            sheet: miniProps('warden'), anim: 'vial', per: 4, r: 5, grav: 0.15, type: 'shot', life: 200,
            end: (b, gg) => {
              gg.audio.play('glass');
              gg.fx.burst(b.x, b.y, 'glass', 4, 4, { speed: 1.5, grav: 0.2, life: 20 });
              this.puddle(gg, b.x);
            },
          }));
        }
        if (k >= 1) this.rest(110);
        break;
      }
      case 'saw': {
        this.vx = this.stT < 50 ? this.facing * 0.5 : 0;
        const k = this.once('saw', 56);
        for (const at of [0.3, 0.6, 0.88]) if (Math.abs(k - at) < 0.02) {
          g.audio.play('whip');
          this.hit(g, this.front(24, 22, 18, 16), Math.round(this.atk * 0.6));
        }
        if (k >= 1) this.rest(70);
        break;
      }
      case 'vent':
        this.vx = 0;
        this.loop('vent', 6);
        if (this.stT === 20) {
          g.audio.play('breath');
          const cx = this.x, cy = this.bottom - 22;
          // the choke cloud: a ring of smoke that hangs where he stood
          g.spawn(new Bit(g, miniProps('warden'), 'puddle', cx, this.bottom - 2, 300, {
            per: 10, order: 6,
            tick: (b, gg) => {
              if (b.t % 6 === 0) gg.fx.burst(cx + rand(-40, 40), cy + rand(-18, 18), 'smoke', 1, 4, { vy: -0.2, life: 50, fade: true, tint: [0.6, 1.1, 0.5] });
              const q = gg.player;
              if (Math.abs(q.x - cx) < 44 && Math.abs(q.y - cy) < 32) q.poison(this.poisonFor(), 2);
            },
          }));
        }
        if (this.stT > 60) this.rest(140);
        break;
    }
  }
}

// ---------------------------------------------------------------- the Sanguine Duchess
// crack   a lash of her own blood at mid range (the hitbox follows the drawn lash, ~90 px)
// bats    she bursts into bats, and re-forms behind her for a lash
// spikes  a line of blood spikes rising one after another toward her
export class Duchess extends MiniBoss {
  bats: Bit[] = [];
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 9, 21);
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    switch (this.st) {
      case 'idle':
        if (!this.sees(g, 240)) {
          this.patrolTurn(g, 0.35 * this.num('speed'));
          this.loop('walk', 9);
          break;
        }
        if (this.approach(g, 0.55, 70)) this.loop('walk', 9);
        else this.loop('idle', 8);
        if (this.cool > 0) break;
        if (dist < 100 && this.can('lash')) this.set(this.can('bats') && Math.random() < 0.3 ? 'burst' : 'crack');
        else if (this.can('spikes')) this.set('spikes');
        else if (this.can('bats')) this.set('burst');
        break;
      case 'crack': {
        this.vx = 0;
        if (this.stT < 10) this.faceToward(p.x);
        const k = this.once('crack', 36);
        if (this.stT === 14) g.audio.play('whip');
        // the lash unrolls: its reach grows with the swing
        if (k > 0.4 && k < 0.7) {
          const reach = 20 + (k - 0.4) / 0.3 * 70;
          this.hit(g, this.front(reach / 2 + 8, 22, reach / 2, 8), this.atk);
        }
        if (k >= 1) this.rest(70);
        break;
      }
      case 'burst':
        this.vx = 0;
        if (this.once('burst', 22) >= 1) {
          // gone: a flock of bats, and nothing to strike
          g.audio.play('flutter');
          this.sprite!.visible = false;
          this.hostile = this.whipTarget = false;
          for (let i = 0; i < 6; i++) {
            const vx = rand(-1.6, 1.6), vy = rand(-1.8, -0.6);
            const b = new Bit(g, g.sheets.bat, 'fly', this.x, this.y, 50, {
              per: 3, order: 12, tick: (bb) => {
                bb.x += vx;
                bb.y += vy;
              },
            });
            b.sprite!.tint(0.9, 0.4, 0.45);
            g.spawn(b);
          }
          this.set('away');
        }
        break;
      case 'away':
        if (this.stT > 50) {
          // back behind her
          const side = p.facing > 0 ? -1 : 1;
          this.x = clamp(p.x + side * 48, 24, g.room.W - 24);
          if (g.room.solidPx(this.x, this.y)) this.x = p.x - side * 48;
          this.faceToward(p.x);
          this.sprite!.visible = true;
          this.hostile = this.whipTarget = true;
          g.fx.burst(this.x, this.y, 'smoke', 4, 10, { life: 24, fade: true, tint: [1.2, 0.3, 0.3] });
          this.set('reform');
        }
        break;
      case 'reform':
        if (this.once('reform', 22) >= 1) this.set('crack');
        break;
      case 'spikes': {
        this.vx = 0;
        this.faceToward(p.x);
        const k = this.once('spikes', 40);
        if (this.stT === 24) {
          g.audio.play('sting');
          const fy = this.bottom, dir = this.facing;
          for (let i = 0; i < 7; i++) {
            const x = this.x + dir * (30 + i * 22);
            if (g.room.solidPx(x, fy - 8)) break;
            // each spike waits its turn, rises, and stands a moment
            g.spawn(new Bit(g, miniProps('duchess'), 'spike', x, fy, 40 + i * 6, {
              per: 4, order: 11,
              tick: (b, gg) => {
                const up = b.t > i * 6;
                b.sprite!.visible = up;
                if (up && b.t < i * 6 + 24) this.hit(gg, { x: b.x, y: fy - 16, hw: 7, hh: 16 }, Math.round(this.atk * 0.8), 'magic', b.x);
              },
            }));
          }
        }
        if (k >= 1) this.rest(110);
        break;
      }
    }
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    if (this.st === 'away') return;
    super.onHit(g, dmg, fromX, crit, kind);
  }
}

// ---------------------------------------------------------------- the Ferryman
// sweep   a wide arc of the oar that also covers the air above him
// flames  he swings his lantern: three slow flames drift after her for a while (whip them to pop them)
// toll    every blow he lands takes 3 of her hearts (the coins fly to him) and mends him a little
export class Ferryman extends MiniBoss {
  hitT = 0;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 11, 29);
  }
  /** One of his blows landed: his fee. */
  toll(g: Game) {
    if (!this.can('toll')) return;
    const p = g.player, take = Math.min(3, g.hunter.hearts);
    g.hunter.hearts -= take;
    this.hp = Math.min(this.maxHp, this.hp + 8);
    g.audio.play('coin');
    for (let i = 0; i < Math.max(1, take); i++) {
      const sx = p.x, sy = p.y - 8;
      g.spawn(new Bit(g, miniProps('ferryman'), 'coin', sx, sy, 40, {
        per: 3, order: 13, tick: (b) => {
          const u = b.t / 40;
          b.x = sx + (this.x - sx) * u + Math.sin(u * Math.PI) * (i - 1) * 14;
          b.y = sy + (this.bottom - 40 - sy) * u - Math.sin(u * Math.PI) * 30;
        },
      }));
    }
    this.set('toll');
  }
  strikeAt(g: Game, box: Parameters<MiniBoss['hit']>[1], dmg = this.atk) {
    if (this.hit(g, box, dmg)) this.toll(g);
  }
  run(g: Game) {
    const p = g.player, dist = Math.abs(p.x - this.x);
    if (this.hitT > 0) this.hitT--;
    switch (this.st) {
      case 'idle':
        if (!this.sees(g, 240)) {
          this.vx = 0;
          this.loop('idle', 9);
          break;
        }
        if (this.approach(g, 0.5, 46)) this.loop('walk', 10);
        else this.loop(this.hitT > 0 ? 'hit' : 'idle', 9);
        if (this.cool > 0) break;
        if (dist < 70 && this.can('sweep')) this.set('sweep');
        else if (this.can('flames')) this.set('swing');
        break;
      case 'sweep': {
        this.vx = 0;
        if (this.stT < 8) this.faceToward(p.x);
        const k = this.once('sweep', 50);
        if (this.stT === 12) g.audio.play('whip');
        // the oar comes over his head and down in front: the box sweeps with it
        if (k > 0.28 && k < 0.5) this.strikeAt(g, { x: this.x + this.facing * 10, y: this.bottom - 66, hw: 40, hh: 18 });
        if (k >= 0.5 && k < 0.78) this.strikeAt(g, this.front(44, 30, 36, 24));
        if (k >= 1 && this.st === 'sweep') this.rest(70);
        break;
      }
      case 'swing': {
        this.vx = 0;
        this.faceToward(p.x);
        const k = this.once('swing', 44);
        if (this.stT === 26) {
          g.audio.play('fire');
          for (let i = 0; i < 3; i++) {
            g.spawn(new Bullet(g, this.x + this.facing * 40, this.bottom - 66, this.facing * (0.6 + i * 0.3), -0.6 + i * 0.5, Math.round(this.atk * 0.6), {
              sheet: miniProps('ferryman'), anim: 'flame', per: 5, r: 5, type: 'magic', solid: false, life: 240, glow: 0.6,
              tick: (b, gg) => {
                // drifting after her, slowly
                const q = gg.player, a = Math.atan2(q.y - 6 - b.y, q.x - b.x);
                b.vx += Math.cos(a) * 0.035;
                b.vy += Math.sin(a) * 0.035;
                const v = Math.hypot(b.vx, b.vy), max = 1.1;
                if (v > max) (b.vx *= max / v), (b.vy *= max / v);
              },
              end: (b, gg, hurt) => {
                gg.fx.burst(b.x, b.y, 'ember', 4, 4, { life: 20, tint: [0.5, 1.4, 0.6] });
                if (hurt) this.toll(gg);
              },
              whip: (b) => b.strike(g, false),
            }));
          }
        }
        if (k >= 1 && this.st === 'swing') this.rest(150);
        break;
      }
      case 'toll':
        this.vx = 0;
        this.loop('toll', 7);
        if (this.stT > 40) this.rest(50);
        break;
    }
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    super.onHit(g, dmg, fromX, crit, kind);
    this.hitT = 12;
  }
}
