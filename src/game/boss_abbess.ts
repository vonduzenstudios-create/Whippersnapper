// The Rose Abbess (trial boss, 0.27.0). A glasshouse: a planter with a crawlspace under it, a
// grapple ring by the trellis, and walls of briar that creep in from both sides all fight long
// (touching one hurts and throws you back out; they draw back while she is stunned).
//
// Phase one, rooted at her marker. Three root-hearts feed her, two blows each, and a withered
// heart grows back after a while. All three withered at once = she is open:
//   - high: over the middle, reached from the ring or with a double jump
//   - low: in the crawlspace under the planter (crouch-whip or slide in)
//   - behind a thorn curtain: six blows hack through it, or holy water burns it
// She LASHES (crouch under it), lobs seed PODS that leave thorns on the floor, and SURGES
// (the walls jump inward).
// Phase two, uprooted: the hearts are dead and she walks. Two openings:
//   - whip her (or her briar) while the lash is out: the whips tangle. Mash free in time and
//     her briar tears off; too slow and she reels you in for a blow
//   - holy water on her while she casts her pods, blooms open
import type { Game } from './game';
import { DmgType, HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target } from './boss_base';
import { TrialBoss, Bullet, Chain, Cord, AX0, AX1, AMID } from './boss_kit';
import { HolyFire } from './objects';
import type { Holder } from './player';
import { lazySheet } from '../gfx/lazy';
import { buildAbbessSheet, buildGlasshouseProps } from '../gfx/art_abbess';
import { clamp } from '../core/util';
import { TILE } from '../config';

const CEIL = 11 * TILE; // the first open row of the chamber
const MAX_CREEP = 150;
const WITHER = 720; // frames a withered heart stays withered
const CURTAIN_X = AX0 + 170;
const CURTAIN_OPEN = 500; // frames a hacked or burnt curtain stays open
const LASH_TELL = 30, LASH_LEN = 52; // the briar is out from LASH_TELL to LASH_TELL + 10

interface Heart { id: string; x: number; y: number; hp: number; wither: number; s: Sprite }
interface Patch { x: number; t: number; s: Sprite }

export class Abbess extends TrialBoss implements Holder {
  label = 'ABBESS';
  creep = 0;
  hearts: Heart[];
  curtainHp = 6;
  curtainT = 0; // frames left of the curtain being open
  curtain: Sprite;
  patches: Patch[] = [];
  walls: Cord[];
  wallS: Sprite[][];
  tangle: Chain;
  /** 'held' while the whips are tangled, then how it ended. */
  tie: '' | 'held' | 'free' | 'caught' = '';
  constructor(g: Game, x: number) {
    super(g, 'abbess', lazySheet('abbess', buildAbbessSheet), 14, 28, x);
    const props = lazySheet('glasshouseProps', buildGlasshouseProps);
    const mk = (anim: string, px: number, py: number, order = 7) => {
      const s = new Sprite(props, g.view.sprites, order);
      s.setFrame(props.anims[anim][0]);
      s.place(px, py);
      this.props.push(s);
      return s;
    };
    const fy = this.floorY;
    this.hearts = [
      { id: 'high', x: AMID, y: fy - 150, hp: 2, wither: 0, s: mk('heart', AMID, fy - 150) },
      { id: 'low', x: 448, y: fy - 8, hp: 2, wither: 0, s: mk('heart', 448, fy - 8) },
      { id: 'back', x: CURTAIN_X, y: fy - 16, hp: 2, wither: 0, s: mk('heart', CURTAIN_X, fy - 16, 6) },
    ];
    this.curtain = mk('curtain', CURTAIN_X, fy - 28, 8);
    this.walls = [new Cord(g, '#1a1408', 4), new Cord(g, '#1a1408', 4)];
    const rows = Math.ceil((fy - CEIL) / 56);
    this.wallS = [0, 1].map(() => Array.from({ length: rows }, () => mk('wall', 0, 0, 5)));
    this.tangle = new Chain(g, 'link', 12, 5, [0.5, 0.4, 0.2]);
    this.gear.push(...this.walls, this.tangle);
    this.facing = -1;
  }
  hitType(): DmgType {
    return this.pat === 'lash' ? 'melee' : 'touch';
  }
  /** Is the briar out (the lash's active frames)? */
  get lashOut() {
    return this.pat === 'lash' && this.pt >= LASH_TELL - 2 && this.pt <= LASH_TELL + 12;
  }
  get hand() {
    return { x: this.x + this.facing * 14, y: this.y - 14 };
  }
  targets(): Target[] {
    const out: Target[] = [];
    if (this.phase === 1)
      for (const h of this.hearts) if (h.wither <= 0 && (h.id !== 'back' || this.curtainT > 0)) out.push({ id: h.id, x: h.x, y: h.y, r: 12 });
    if (this.phase === 1 && this.curtainT <= 0) out.push({ id: 'curtain', x: CURTAIN_X, y: this.floorY - 24, r: 16 });
    if (this.phase === 2 && this.lashOut) out.push({ id: 'briar', x: this.x + this.facing * 60, y: this.y - 12, r: 18 });
    out.push({ id: 'body', x: this.x, y: this.y, r: 26 });
    return out;
  }
  hurtZones(): Target[] {
    return this.vulnT > 0 ? [] : [{ id: 'body', x: this.x, y: this.y, r: 16 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    const h = this.hearts.find((q) => q.id === t.id);
    if (h) {
      h.hp--;
      this.flashT = 4;
      g.audio.play('squelch');
      g.fx.burst(h.x, h.y, 'spark', 3, 6, { tint: [1.4, 0.4, 0.5] });
      if (h.hp <= 0) {
        h.wither = WITHER;
        g.audio.play('crumble');
        const left = this.hearts.filter((q) => q.wither <= 0).length;
        if (left === 0) this.stun(g, 300, 'HER ROOTS ARE STARVED: STRIKE');
        else g.message(`A ROOT-HEART WITHERS (${3 - left}/3)`, 90);
      }
      return;
    }
    if (t.id === 'curtain') {
      if (kind === 'holy') return this.openCurtain(g, true);
      this.curtainHp--;
      g.audio.play('snap');
      g.fx.burst(t.x, t.y, 'dust', 2, 8);
      g.damageNumber(t.x, t.y - 14, `${6 - this.curtainHp}/6`, '#a8c070');
      if (this.curtainHp <= 0) this.openCurtain(g, false);
      return;
    }
    // phase two: her whip and yours tangle, or holy water into her open blooms
    if (this.phase === 2 && this.vulnT <= 0 && kind === 'whip' && this.lashOut && !this.tie) return this.catchWhip(g);
    if (t.id === 'briar') return;
    if (this.phase === 2 && kind === 'holy' && this.pat === 'pods' && this.pt < 72) return this.stun(g, 300, 'THE HOLY WATER SCALDS HER BLOOMS: STRIKE');
    this.bodyHit(g, t, kind);
  }
  openCurtain(g: Game, burnt: boolean) {
    if (this.curtainT > 0) return;
    this.curtainT = CURTAIN_OPEN;
    this.curtainHp = 6;
    g.audio.play(burnt ? 'fire' : 'snap');
    g.fx.burst(CURTAIN_X, this.floorY - 28, burnt ? 'ember' : 'dust', 10, 18, { vy: -0.8, life: 30, fade: true });
    g.message(burnt ? 'THE CURTAIN BURNS AWAY' : 'YOU HACK THROUGH THE CURTAIN', 90);
  }
  catchWhip(g: Game) {
    const p = g.player;
    if (!p.grab(this, 10, 150, true)) return;
    this.tie = 'held';
    this.set('tangle');
    g.audio.play('chain');
    g.message('THE WHIPS TANGLE: MASH TO TEAR FREE', 110);
  }
  released(mashed: boolean) {
    if (this.tie !== 'held') return;
    this.tie = mashed ? 'free' : 'caught';
  }
  endStun(g: Game) {
    super.endStun(g);
    // the garden heals while she was down
    for (const h of this.hearts) {
      h.hp = 2;
      h.wither = 0;
    }
    this.curtainT = 0;
  }
  onShift(g: Game) {
    g.audio.play('crumble');
    for (const h of this.hearts) h.wither = 1e9;
    this.curtainT = 0;
  }
  whileDying() {
    this.creep = Math.max(0, this.creep - 2);
    this.drawWalls();
    this.tangle.hide();
  }
  pod(g: Game, vx: number) {
    g.spawn(new Bullet(g, this.x + this.facing * 10, this.y - 40, vx, -4.4, Math.round(this.atk * 0.5), {
      anim: 'slime', tint: [0.6, 0.9, 0.4], grav: 0.16, r: 5, type: 'shot', life: 300,
      end: (b, gg) => {
        // thorns spring up where it lands
        if (b.y < this.floorY - 24 || this.dead) return;
        const s = new Sprite(this.curtain.sheet, gg.view.sprites, 8);
        s.setFrame(this.curtain.sheet.anims.patch[0]);
        s.place(b.x, this.floorY - 28);
        this.props.push(s);
        this.patches.push({ x: b.x, t: 240, s });
      },
    }));
  }
  drawWalls() {
    const fy = this.floorY, w = Math.max(1, this.creep);
    const edges = [AX0 + this.creep, AX1 - this.creep];
    this.walls[0].set(AX0 - 8, (CEIL + fy) / 2, edges[0], (CEIL + fy) / 2, fy - CEIL);
    this.walls[1].set(edges[1], (CEIL + fy) / 2, AX1 + 8, (CEIL + fy) / 2, fy - CEIL);
    const WA = this.curtain.sheet.anims.wall;
    this.wallS.forEach((col, side) =>
      col.forEach((s, i) => {
        s.visible = w > 2;
        s.setFrame(WA[Math.floor(this.g.frame / 20 + i) % 2]);
        s.place(edges[side] + (side ? 8 : -8), fy - 28 - i * 56, side === 1);
      }),
    );
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    const fy = this.floorY;
    this.y = fy - this.hh;
    // ── the briar walls: they creep in, and draw back while she is down
    if (this.pat === 'stun') this.creep = Math.max(0, this.creep - 1.5);
    else if (this.pat !== 'enter' && this.pat !== 'shift') this.creep = Math.min(MAX_CREEP, this.creep + (two ? 0.16 : 0.11));
    this.drawWalls();
    const L = AX0 + this.creep, R = AX1 - this.creep;
    if (this.pat !== 'enter' && this.pat !== 'shift' && p.alive) {
      if (p.x - p.hw < L) {
        p.x = L + p.hw;
        if (p.invuln <= 0) p.takeDamage(Math.round(this.atk * 0.6), L - 20, false, true, 'touch', p.y);
      } else if (p.x + p.hw > R) {
        p.x = R - p.hw;
        if (p.invuln <= 0) p.takeDamage(Math.round(this.atk * 0.6), R + 20, false, true, 'touch', p.y);
      }
    }
    // ── hearts, the curtain and the thorn patches
    for (const h of this.hearts) {
      if (h.wither > 0 && --h.wither === 0) h.hp = 2;
      const HA = h.s.sheet.anims;
      h.s.setFrame(h.wither > 0 ? HA.dead[0] : HA.heart[Math.floor(g.frame / 20) % 2]);
      h.s.visible = h.id !== 'back' || this.curtainT > 0 || two;
    }
    if (this.curtainT > 0) this.curtainT--;
    if (!two && this.curtainT <= 0 && g.ents.some((e) => e instanceof HolyFire && Math.abs(e.x - CURTAIN_X) < 30)) this.openCurtain(g, true);
    const CA = this.curtain.sheet.anims.curtain;
    this.curtain.setFrame(CA[this.curtainT > 0 ? 1 : 0]);
    this.curtain.opacity = this.curtainT > 0 ? 0.6 : 1;
    this.patches = this.patches.filter((q) => {
      if (--q.t > 0) {
        q.s.opacity = Math.min(1, q.t / 30);
        if (p.onGround && Math.abs(p.x - q.x) < 18 && p.bottom > fy - 4) this.hit(g, { x: q.x, y: fy - 8, hw: 18, hh: 8 }, Math.round(this.atk * 0.5), 'touch', q.x);
        return true;
      }
      q.s.dispose();
      this.props = this.props.filter((s) => s !== q.s);
      return false;
    });
    if (this.pat !== 'tangle' && this.pat !== 'reel') this.tangle.hide();
    switch (this.pat) {
      case 'enter':
        this.once('cast', this.pt, 120);
        if (this.pt === 40) g.audio.play('creak');
        this.enterBeats(g, 60, 130);
        break;
      case 'shift':
        // she tears herself out of the floor
        this.loop('stun', 4);
        if (this.pt % 20 === 1 && this.pt < 90) {
          g.audio.play('crumble');
          g.shake(3, 12);
          g.fx.burst(this.x, fy - 2, 'dust', 6, 16, { vy: -0.8 });
        }
        this.shiftBeats(g, 100);
        break;
      case 'idle': {
        this.look();
        const near = Math.abs(this.dx) < 130;
        if (two && Math.abs(this.dx) > 70) {
          this.x += this.facing * 0.7;
          this.loop('walk', 6);
        } else this.loop('idle', 7);
        if (this.pt > (two ? 50 : 70)) {
          const surge = this.creep < MAX_CREEP - 40 && this.last !== 'surge' && Math.random() < 0.25;
          this.pick(surge ? 'surge' : near ? this.choose(['lash', 'lash', 'pods']) : this.choose(['pods', two ? 'idle' : 'pods']));
        }
        break;
      }
      case 'lash': {
        if (this.pt < LASH_TELL - 6) this.look();
        if (this.pt === 1) g.audio.play('growl');
        this.once('lash', this.pt, LASH_LEN);
        if (this.pt === LASH_TELL) g.audio.play('whip');
        // chest height: crouch under it
        if (this.lashOut && this.pt >= LASH_TELL) this.hit(g, { x: this.x + this.facing * 60, y: this.y - 12, hw: 60, hh: 12 }, this.atk);
        if (this.pt > LASH_LEN + 16) this.pick('idle');
        break;
      }
      case 'tangle': {
        // the whips are wound together: a tug of war
        this.fr = this.A.lash[Math.floor(this.A.lash.length * 0.7)];
        const h = this.hand;
        this.tangle.set(h.x + this.facing * 40, h.y, p.x, p.y - 6);
        if (this.pt % 10 === 0) g.fx.burst((h.x + p.x) / 2, (h.y + p.y) / 2, 'spark', 1, 4);
        if (this.tie === 'free') {
          this.tie = '';
          g.audio.play('snap');
          g.fx.burst(h.x + this.facing * 30, h.y, 'dust', 8, 14, { speed: 2, life: 26 });
          this.stun(g, 300, 'HER BRIAR TEARS AWAY: STRIKE');
        } else if (this.tie === 'caught' || !p.alive || this.pt > 200) {
          this.tie = '';
          this.set('reel');
          p.yank(this.x + this.facing * 36);
        }
        break;
      }
      case 'reel': {
        this.loop('idle', 4);
        const h = this.hand;
        if (this.pt < 18) this.tangle.set(h.x, h.y, p.x, p.y - 6);
        else this.tangle.hide();
        if (this.pt === 18) {
          g.audio.play('whip');
          this.hit(g, { x: this.x + this.facing * 30, y: this.y - 8, hw: 34, hh: 24 }, this.atk + 6);
        }
        if (this.pt > 50) this.pick('idle');
        break;
      }
      case 'pods': {
        // blooms open, then three seeds lobbed short, at her, and long
        this.loop('cast', 6);
        if (this.pt < 20) this.look();
        if (this.pt === 1) g.audio.play('breath');
        if (this.pt === 40) {
          g.audio.play('spit');
          const reach = clamp(Math.abs(this.dx), 50, 260) / 55; // ~55 frames in the air
          for (const k of [0.6, 1, 1.4]) this.pod(g, this.facing * reach * k);
        }
        if (this.pt > 80) this.pick('idle');
        break;
      }
      case 'surge':
        this.loop('cast', 3);
        if (this.pt % 10 === 1 && this.pt < 40) {
          g.audio.play('rumble');
          g.shake(2, 10);
        }
        if (this.pt === 44) {
          this.creep = Math.min(MAX_CREEP, this.creep + 30);
          g.audio.play('crumble');
          g.shake(5, 16);
        }
        if (this.pt > 70) this.pick('idle');
        break;
      case 'stun':
        this.loop('stun', 8);
        break;
    }
    // phase one she is rooted at her marker; phase two she stays out of her own walls
    this.x = clamp(this.x, L + 20, R - 20);
  }
  destroy() {
    super.destroy();
    this.patches = [];
  }
}
