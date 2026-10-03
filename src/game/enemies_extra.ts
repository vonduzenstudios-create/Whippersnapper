// Experimental enemies (0.4.0), not placed in the world yet. Try them in the test chamber (#test=<id>).
//   Hookjaw (h)      throws a chain hook that drags you to its cleaver
//   Mire Eel (e)     hunts swimmers, lunges underwater, leaps at you from the surface
//   Gloomcaster (m)  teleports around and casts a slow, homing hex that slows you and pops wards
//   Rot Ooze (o)     hops after you and splits into smaller oozes when killed
//   Grave Grub (u)   travels under the floor as a mound, bursts up beneath you, then lies stranded
//   Gravehand (x)    swims unseen under the floor after you: grabs your ankles (mash free), trips you if you run
//   Devourer (v)     a stronger Hookjaw: its hook drags you into its jaws, which bite until you mash free
// Like the other enemies they read speed/ranges/abilities through num()/can(), so
// enemy-editor variants work.
import { Sprite } from '../gfx/view';
import { Ent, HitKind } from './ent';
import type { Game } from './game';
import { Enemy } from './enemies';
import { groundAt, moveBody } from '../world/room';
import { floorBelow } from './enemies_expansion';
import { clamp, rand, overlap } from '../core/util';
import { GRAVITY, MAX_FALL, TILE } from '../config';
import type { Holder } from './player';

// ---------------------------------------------------------------- hookjaw

const HOOK_RANGE = 176; // how far the chain reaches
const HOOK_LINKS = 10;
const TONGUE_SEGS = 22;
const CHOP_WIND = 24; // frames a normal chop is raised before it falls
const QUICK_WIND = 8; // ...and after the hook drags her in (counted from when she arrives)
const CLOSE = 30; // it walks up to this far from her...
const CHOP_REACH = 40; // ...and swings at anything this close (more than CLOSE, so it never stalls between the two)
const HOOK_MIN = 48; // the hook is only thrown from farther away than this
const SWAT_KNOCK = [3.4, -4]; // a cleaver hit (or a Devourer's slap) throws her back this fast: out to hook range again

/** The thrown hook and its chain. It isn't hostile itself: it yanks the hero instead of hurting her. */
export class HookChain extends Ent {
  t = 0;
  len = 0;
  out = true; // flying out (false = reeling back in)
  caught = false; // reeling the hero in
  dx: number;
  dy: number;
  links: Sprite[] = [];
  constructor(g: Game, public owner: Hookjaw, angle: number) {
    super();
    this.dx = Math.cos(angle);
    this.dy = Math.sin(angle);
    this.hw = this.hh = 5;
    this.whipTarget = true; // whip it out of the air
    const A = g.sheets.fx.anims, tongue = owner.tongue;
    this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 14);
    this.sprite.setFrame((tongue ? A.tongueTip : A.hook)[0]);
    // a tongue needs more, overlapping segments to read as one piece of flesh
    for (let i = 0; i < (tongue ? TONGUE_SEGS : HOOK_LINKS); i++) {
      const s = new Sprite(g.sheets.fx, g.view.sprites, 13);
      s.setFrame((tongue ? A.tongueSeg : A.link)[0]);
      if (!tongue) s.tint(0.8, 0.7, 0.65); // rusty
      this.links.push(s);
    }
  }
  /** Where the chain leaves the Hookjaw's hand (or the tongue its mouth). */
  origin(): [number, number] {
    return this.owner.hookFrom();
  }
  onHit(g: Game) {
    if (!this.out) return;
    this.out = false;
    this.whipTarget = false;
    g.audio.play('clink');
    g.fx.burst(this.x, this.y, 'spark', 1, 2);
  }
  update(g: Game) {
    this.t++;
    const p = g.player, o = this.owner;
    if (o.dead) {
      this.dead = true;
      return;
    }
    const [ox, oy] = this.origin();
    if (this.caught) {
      // the tip rides on the hero while she's dragged in
      this.x = p.x;
      this.y = p.y - 4;
      this.len = Math.hypot(this.x - ox, this.y - oy);
      if (p.state !== 'yank') {
        this.caught = false;
        this.out = false;
      }
    } else if (this.out) {
      this.len += 5.5;
      this.x = ox + this.dx * this.len;
      this.y = oy + this.dy * this.len;
      if (g.room.solidPx(this.x, this.y) || this.len >= HOOK_RANGE) {
        this.out = false;
        this.whipTarget = false;
        if (this.len < HOOK_RANGE) g.audio.play('clink');
      } else if (p.alive && p.invuln <= 0 && (overlap(this, { x: p.x, y: p.y, hw: p.hw, hh: p.hh - 2 }) || (p.guarding && overlap(this, p.shieldBox())))) {
        this.out = false;
        this.whipTarget = false;
        if (p.wardT > 0) p.blockHit(this.x, this.y);
        else if (p.shieldFaces(-this.dx, -this.dy)) p.shieldClank(this.y); // knocked aside by the shield
        else if (p.yank(o.pullTo())) {
          this.caught = true;
          o.reelIn(g);
        }
      }
    } else {
      // reel back in along the line to the hand
      this.len -= 7;
      if (this.len <= 0) {
        this.dead = true;
        return;
      }
      const d = Math.hypot(this.x - ox, this.y - oy) || 1;
      this.x = ox + ((this.x - ox) / d) * this.len;
      this.y = oy + ((this.y - oy) / d) * this.len;
    }
    // draw the chain from the hand to the tip
    const n = this.links.length;
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / (n + 1);
      this.links[i].place(ox + (this.x - ox) * f, oy + (this.y - oy) * f + Math.sin(f * Math.PI) * 3);
    }
    const s = this.sprite!;
    s.place(this.x, this.y);
    s.mesh.rotation.z = -Math.atan2(this.y - oy, this.x - ox);
    if (this.t % 6 === 0 && this.out) g.audio.play(this.owner.tongue ? 'squelch' : 'chain');
  }
  destroy() {
    for (const l of this.links) l.dispose();
    this.links = [];
    super.destroy();
  }
}

/** Hookjaw states, plus the Devourer's (jaws open, biting, knocked back). */
type HookState = 'walk' | 'wind' | 'throw' | 'chop' | 'rest' | 'jaws' | 'bite' | 'reel' | 'whirl';

export class Hookjaw extends Enemy {
  state: HookState = 'walk';
  st = 0;
  cool = 40;
  hook: HookChain | null = null;
  quick = false; // this chop follows a hook: it falls soon after she arrives
  tongue = false; // its "hook" is a tongue (the Devourer)
  melee: HookState = 'chop'; // its close-up attack (the Devourer whirls instead)
  swung = false; // its last attack was a close-up swing, so it hooks again sooner
  constructor(g: Game, kind: string, x: number, bottom: number, hw = 8, hh = 18) {
    super(g, kind, x, bottom, hw, hh);
    this.heavy = true; // no flinching: stop the hook instead
  }
  /** A close-up hit landed: throw her back out to hook range (`mul` scales the throw). */
  swat(g: Game, mul: number) {
    const p = g.player;
    if (p.state !== 'hurt' || g.hunter.noKnock) return;
    const dir = p.x < this.x ? -1 : 1;
    p.vx = dir * SWAT_KNOCK[0] * mul;
    p.vy = SWAT_KNOCK[1];
  }
  set(st: HookState) {
    this.state = st;
    this.st = 0;
  }
  /** Where the hook's chain leaves it: the hook hand. */
  hookFrom(): [number, number] {
    return [this.x + this.facing * 10, this.y - 4];
  }
  /** Where the hook drags the hero to. */
  pullTo() {
    return this.x + this.facing * 22;
  }
  /** The hook caught the hero: raise the cleaver, and bring it down as soon as she arrives. */
  reelIn(g: Game) {
    this.set('chop');
    this.st = CHOP_WIND - QUICK_WIND;
    this.quick = true;
    g.audio.play('growl');
  }
  /** States a subclass adds (the Devourer's bite). */
  special(_g: Game) {}
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, A = this.anims, s = this.sprite!;
    this.st++;
    if (this.cool > 0) this.cool--;
    const dx = p.x - this.x, adx = Math.abs(dx), dy = Math.abs(p.y - this.y);
    const sees = p.alive && adx < 200 * this.num('sight') && dy < 64;
    switch (this.state) {
      case 'walk': {
        if (sees && this.st % 30 === 1) this.faceToward(p.x);
        // lumber toward the hero, but never off a ledge
        const want = sees && adx > CLOSE ? 0.45 * this.num('speed') : 0;
        const ahead = this.x + this.facing * (this.hw + 4);
        const blocked = g.room.solidPx(ahead, this.y) || (this.onGround && !groundAt(g.room, ahead, this.bottom));
        this.vx = blocked ? 0 : this.facing * want;
        if (this.vx) s.anim('walk', this.t / 60, 5);
        else s.setFrame(A.walk[0]);
        if (sees && this.can('chop') && adx < CHOP_REACH && dy < 30) {
          this.faceToward(p.x);
          this.set(this.melee);
        } else if (sees && this.can('hook') && this.cool <= 0 && adx > HOOK_MIN && adx < HOOK_RANGE - 10) {
          this.faceToward(p.x);
          this.set('wind');
        }
        break;
      }
      case 'wind':
        // whirls the chain overhead, then lets fly
        this.vx = 0;
        s.setFrame(A.wind[0]);
        if (this.st % 8 === 1) g.audio.play(this.tongue ? 'squelch' : 'chain');
        if (this.st >= 26) {
          const [hx, hy] = [this.x + this.facing * 10, this.y - 4];
          let a = Math.atan2(p.y - 4 - hy, p.x - hx);
          // aim at the hero, but only within ~35 degrees of straight ahead
          const fwd = this.facing > 0 ? 0 : Math.PI;
          let off = Math.atan2(Math.sin(a - fwd), Math.cos(a - fwd));
          off = clamp(off, -0.6, 0.6);
          a = fwd + off;
          this.hook = new HookChain(g, this, a);
          g.spawn(this.hook);
          g.audio.play('throw');
          this.set('throw');
        }
        break;
      case 'throw':
        s.setFrame(A.throw[0]);
        if (!this.hook || this.hook.dead) {
          this.hook = null;
          this.set('rest');
        }
        break;
      case 'chop': {
        // raise the cleaver, then bring it down in front. After a hook it hangs raised
        // while she's dragged in, then falls QUICK_WIND frames after she lands at its feet.
        this.vx = 0;
        const WIND = CHOP_WIND;
        if (this.quick && p.state === 'yank') this.st = WIND - QUICK_WIND;
        s.setFrame(A.chop[this.st < WIND ? 0 : 1]);
        if (this.st === WIND) {
          g.audio.play('whip');
          g.shake(1.5, 6);
          g.fx.burst(this.x + this.facing * 24, this.bottom - 2, 'dust', 2, 6);
        }
        if (this.st >= WIND && this.st < WIND + 6) {
          const blade = { x: this.x + this.facing * 20, y: this.y - 2, hw: 14, hh: 16 };
          if (p.alive && overlap(blade, p) && p.invuln <= 0) {
            p.takeDamage(this.atk + 4, this.x, false, true, 'melee', blade.y);
            this.swat(g, 1);
          }
        }
        if (this.st > WIND + 22) {
          this.quick = false;
          this.set('rest');
          this.swung = true;
        }
        break;
      }
      case 'rest':
        this.vx = 0;
        s.setFrame(A.walk[0]);
        if (this.st > 30) {
          // after a swing it reaches for the hook again soon: that's what the knockback was for
          this.cool = (this.swung ? 40 : 110) * this.num('cooldown');
          this.swung = false;
          this.set('walk');
        }
        break;
      default:
        this.special(g);
    }
    this.physics(g);
    this.place();
  }
  die(g: Game) {
    if (this.hook) this.hook.dead = true;
    super.die(g);
  }
}

// ---------------------------------------------------------------- devourer

const BITE_DX = 16; // her center sits this far in front of the Devourer's while it has her head
const BITE_EVERY = 24; // frames between bites (0.4 s)
const WHIRL_WIND = 18; // frames it coils its tentacles before the whirl (the warning)...
const WHIRL_SPIN = 26; // ...and spins, slapping anything within reach on either side

/**
 * A stronger Hookjaw: a great round mouth on legs. Its "hook" is its barbed tongue, which drags
 * the hero into its open body, and it clamps down over her head: she's held in place, bitten every 0.4 s, and can't
 * attack until she mashes LEFT/RIGHT/JUMP free (`mash` presses). Tearing free knocks it
 * reeling back, open to a few hits. Up close it whirls its tentacles round and slaps her
 * far away, out to tongue range again.
 */
export class Devourer extends Hookjaw implements Holder {
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 10, 22);
    this.feet = 22;
    this.tongue = true;
    this.melee = 'whirl';
  }
  /** The tongue leaves from the front of its mouth. */
  hookFrom(): [number, number] {
    return [this.x + this.facing * 14, this.y - 4];
  }
  pullTo() {
    return this.x + this.facing * BITE_DX;
  }
  /** The hook caught her: open wide and wait for her to arrive. */
  reelIn(g: Game) {
    this.set('jaws');
    g.audio.play('growl');
  }
  released(mashed: boolean) {
    if (!mashed) return this.set('rest'); // she died in its jaws
    // torn free: it reels back, stunned
    this.set('reel');
    this.vx = -this.facing * 3;
    this.vy = -1.5;
    this.flashT = 8;
  }
  special(g: Game) {
    const p = g.player, A = this.anims, s = this.sprite!;
    switch (this.state) {
      case 'whirl': {
        this.vx = 0;
        if (this.st < WHIRL_WIND) {
          // tentacles drawn in tight, quivering: the warning
          s.setFrame(A.coil[0]);
          if (this.st === 1) g.audio.play('squelch');
          break;
        }
        const k = this.st - WHIRL_WIND;
        s.setFrame(A.whirl[Math.floor(k / 3) % A.whirl.length]);
        if (k % 8 === 0) g.audio.play('whip');
        if (k % 3 === 0) g.fx.burst(this.x + rand(-26, 26), this.bottom - 4, 'dust', 1, 3, { vy: -0.6 });
        const reach = { x: this.x, y: this.y, hw: CHOP_REACH - 6, hh: 20 }; // as far as it whirls for (her half-width is 6)
        if (p.alive && p.invuln <= 0 && overlap(reach, p)) {
          p.takeDamage(this.atk, this.x, false, true, 'melee', this.y);
          this.swat(g, 1.25);
        }
        if (k >= WHIRL_SPIN) {
          this.swung = true;
          this.set('rest');
        }
        break;
      }
      case 'jaws':
        // jaws hinged open to the chest, waiting for her
        this.vx = 0;
        s.setFrame(A.jaws[0]);
        if (p.state === 'yank') this.st = 1;
        else if (this.st > 2 && p.alive && Math.abs(p.x - this.pullTo()) < 14 && Math.abs(p.bottom - this.bottom) < 30 && p.grab(this, this.num('mash'), 1e9, true)) {
          this.set('bite');
          this.st = BITE_EVERY - 1; // the first bite lands at once
        } else if (this.st > 30) this.set('rest'); // she got away (or never arrived)
        break;
      case 'bite': {
        this.vx = 0;
        if (p.holdBy !== this) {
          this.set('rest');
          break;
        }
        // holds her head in its jaws, drawn over her
        const tx = this.pullTo();
        if (!g.room.solidPx(tx, p.y)) p.x = tx;
        p.facing = -this.facing as 1 | -1;
        const chomp = this.st % BITE_EVERY;
        // the sheet's bite is two halves, chewing then clamped, each a loop of its tentacles thrashing
        const half = A.bite.length / 2;
        s.setFrame(A.bite[(chomp < 8 ? half : 0) + (Math.floor(this.st / 4) % half)]);
        if (chomp === 0) {
          p.chew(Math.round(this.atk * 0.4));
          g.audio.play('bite');
          g.fx.burst(tx, p.y - 12, 'ember', 3, 4, { speed: 1.2, grav: 0.15, life: 20, tint: [1.2, 0.2, 0.2] });
        }
        break;
      }
      case 'reel':
        // knocked back by her escape: easy pickings for a moment
        this.vx *= 0.88;
        s.setFrame(A.reel[0]);
        if (this.st > 60) {
          this.cool = 140 * this.num('cooldown');
          this.set('walk');
        }
        break;
    }
  }
  update(g: Game) {
    super.update(g);
    // over her while it bites, so its jaws close round her head
    this.sprite!.mesh.renderOrder = this.state === 'bite' ? 13 : 10;
  }
  die(g: Game) {
    const p = g.player;
    if (p.holdBy === this) {
      p.holdT = 0;
      p.holdBy = null;
      p.holdLock = false;
      p.freeT = 60;
    }
    super.die(g);
  }
}

// ---------------------------------------------------------------- mire eel

export class Eel extends Enemy {
  state: 'swim' | 'chase' | 'lunge' | 'leap' | 'flop' = 'swim';
  lunges = ['lunge', 'leap'];
  st = 0;
  cool = 40;
  lost = 0; // frames since the hero left the water
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom - 4, 12, 5);
    this.facing = Math.random() < 0.5 ? -1 : 1;
  }
  set(st: Eel['state']) {
    this.state = st;
    this.st = 0;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, room = g.room, water = room.water;
    this.st++;
    if (this.cool > 0) this.cool--;
    const sp = this.num('speed');
    const inW = room.inWater(this.x, this.y);
    const pIn = p.alive && room.inWater(p.x, p.y);
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    if (!inW && this.state !== 'leap') this.state = 'flop';
    switch (this.state) {
      case 'swim': {
        // drift back and forth, turning at walls and at the edges of the water
        const ahead = this.x + this.facing * (this.hw + 4);
        if (room.solidPx(ahead, this.y) || !room.inWater(ahead, this.y)) this.facing = -this.facing;
        this.vx = this.facing * 0.5 * sp;
        this.vy = Math.sin(this.t * 0.04) * 0.3;
        if (pIn && d < 200 * this.num('sight')) this.set('chase');
        else if (water && this.can('leap') && this.cool <= 0 && p.alive && !pIn && Math.abs(dx) < 44 &&
          p.bottom <= water.y + 6 && p.bottom > water.y - 64 && this.y - water.y < 96) {
          // the hero is standing at the water's edge above: jump out at her
          this.set('leap');
          this.y = Math.max(this.y, water.y + this.hh + 2);
          this.vy = -6.4;
          this.vx = 0; // straight up first (so it clears the rim), then it steers in the air
          this.facing = dx < 0 ? -1 : 1;
          g.audio.play('splash');
          g.fx.burst(this.x, water.y - 6, 'splash', 2, 6);
        }
        break;
      }
      case 'chase': {
        // eels are faster than a swimming hunter (unless she has the Undertow Pearl)
        const max = 1.7 * sp;
        this.vx = clamp(this.vx + (dx / d) * 0.12 * sp, -max, max);
        this.vy = clamp(this.vy + (dy / d) * 0.12 * sp, -max, max);
        this.facing = this.vx < 0 ? -1 : 1;
        if (this.can('lunge') && this.cool <= 0 && d < 60) {
          this.set('lunge');
          this.vx = (dx / d) * 3.8 * sp;
          this.vy = (dy / d) * 3.8 * sp;
          g.audio.play('bite');
        }
        this.lost = pIn ? 0 : this.lost + 1;
        if (this.lost > 60 || !p.alive) this.set('swim');
        break;
      }
      case 'lunge':
        if (this.st > 18) {
          this.cool = 70 * this.num('cooldown');
          this.set('chase');
        }
        break;
      case 'leap':
        this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
        this.vx = clamp(this.vx + Math.sign(dx) * 0.18, -2.2, 2.2);
        this.facing = this.vx < 0 ? -1 : 1;
        if (inW && this.vy > 0 && this.st > 6) {
          g.audio.play('splash');
          if (water) g.fx.burst(this.x, water.y - 6, 'splash', 2, 6);
          this.cool = 120 * this.num('cooldown');
          this.set('swim');
        } else if (this.onGround && this.st > 6) this.set('flop'); // overshot onto dry land
        break;
      case 'flop':
        // stranded out of the water (drained pool, low tide, a leap gone long): it
        // thrashes toward the water if there is any, otherwise every which way
        this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
        if (this.onGround) {
          this.vx *= 0.8;
          if (this.st % 40 === 0) {
            const home = water && water.h > 4 ? Math.sign(water.x + water.w / 2 - this.x) : 0;
            this.vy = -2.4;
            this.vx = (home || (Math.random() < 0.5 ? -1 : 1)) * (home ? 1.4 : 0.8);
            this.facing = this.vx < 0 ? -1 : 1;
          }
        }
        if (inW) this.set('swim');
        break;
    }
    if (this.stun > 0 && this.state !== 'flop' && this.state !== 'leap') this.vy *= 0.85;
    moveBody(room, this, false);
    // stay under the surface while swimming
    if (water && inW && this.state !== 'leap' && this.state !== 'flop' && this.y - this.hh < water.y + 3) {
      this.y = water.y + 3 + this.hh;
      this.vy = Math.max(this.vy, 0);
    }
    if (this.state === 'lunge' || this.state === 'leap') s.setFrame(this.anims.bite[0]);
    else s.anim('swim', this.t / 60, this.state === 'chase' ? 12 : this.state === 'flop' ? 16 : 6);
    s.place(this.x, this.y, this.facing < 0);
    s.mesh.rotation.z = -Math.atan2(this.vy, Math.abs(this.vx) + 0.5) * 0.6 * this.facing;
    if (inW && this.t % 24 === 0) g.fx.burst(this.x + this.facing * 12, this.y - 2, 'bubble', 1, 2, { vy: -0.7, life: 40, fade: true });
  }
}

// ---------------------------------------------------------------- gloomcaster

/** The Gloomcaster's hex: slow, curves after the hero, slows her on a hit and breaks a ward bubble. */
export class HexBolt extends Ent {
  t = 0;
  /** `disarm`: a hit also seals her whip in a bubble ('hard': if it pops by itself, the whip drops). */
  constructor(g: Game, x: number, y: number, public vx: number, public vy: number, private dmg: number, private homing: boolean, private disarm: '' | 'soft' | 'hard' = '') {
    super();
    this.x = x;
    this.y = y;
    this.hw = this.hh = 4;
    this.whipTarget = true; // whip it to break it
    this.sprite = new Sprite(g.sheets.fx, g.view.sprites, 14);
    this.sprite.glow = 0.5;
  }
  onHit(g: Game) {
    this.dead = true;
    g.audio.play('glass');
    g.fx.burst(this.x, this.y, 'star', 6, 4, { speed: 1.5, life: 24, fade: true, tint: [1.2, 0.6, 1.6] });
  }
  update(g: Game) {
    this.t++;
    const p = g.player;
    if (this.homing && this.t < 110 && p.alive) {
      // turn a little toward the hero each frame
      const want = Math.atan2(p.y - 6 - this.y, p.x - this.x), cur = Math.atan2(this.vy, this.vx);
      const turn = clamp(Math.atan2(Math.sin(want - cur), Math.cos(want - cur)), -0.035, 0.035);
      const sp = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(cur + turn) * sp;
      this.vy = Math.sin(cur + turn) * sp;
    }
    this.x += this.vx;
    this.y += this.vy;
    const s = this.sprite!;
    s.setFrame(g.sheets.fx.anims.hex[Math.floor(this.t / 4) % 2]);
    s.place(this.x, this.y);
    if (this.t % 5 === 0) g.fx.burst(this.x, this.y, 'mote', 1, 1, { life: 20, fade: true, tint: [1.3, 0.5, 1.6], glow: 0.8 });
    if (this.t > 260 || g.room.solidPx(this.x, this.y)) {
      this.dead = true;
      g.fx.burst(this.x, this.y, 'star', 4, 3, { life: 20, fade: true, tint: [1.2, 0.6, 1.6] });
      return;
    }
    if (p.alive && p.invuln <= 0 && overlap(this, { x: p.x, y: p.y, hw: p.hw - 1, hh: p.hh - 2 })) {
      this.dead = true;
      if (p.wardT > 0) p.popWard(); // hexes shatter the Ashglass Ward instead of being blocked
      else if (p.takeDamage(this.dmg, this.x, false, true, 'magic', this.y) === false && p.state === 'hurt') {
        p.hex(200);
        if (this.disarm) p.disarm(this.disarm === 'hard');
      }
      g.fx.burst(this.x, this.y, 'star', 8, 5, { speed: 1.8, life: 30, fade: true, tint: [1.2, 0.6, 1.6] });
    }
  }
}

export class Caster extends Enemy {
  state: 'idle' | 'cast' | 'fade' | 'appear' = 'idle';
  st = 0;
  cool: number;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 6, 17);
    this.cool = 40 + Math.random() * 40;
  }
  set(st: Caster['state']) {
    this.state = st;
    this.st = 0;
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    super.onHit(g, dmg, fromX, crit, kind);
    // struck mid-spell: the spell fizzles and it steps away through the shadows
    if (!this.dead && this.state === 'cast') {
      g.fx.burst(this.x, this.y - 10, 'star', 6, 6, { life: 20, fade: true, tint: [1.2, 0.6, 1.6] });
      if (this.can('blink')) this.set('fade');
      else {
        this.set('idle');
        this.cool = 60 * this.num('cooldown');
      }
    }
  }
  /** Find a spot on the floor near the hero (but not on top of her) to reappear at. */
  blinkSpot(g: Game): [number, number] | null {
    const p = g.player, room = g.room;
    for (let i = 0; i < 16; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = clamp(p.x + side * rand(70, 170), 24, room.W - 24);
      if (Math.abs(x - p.x) < 60) continue;
      const fy = floorBelow(g, x, p.y - 40, 10);
      if (fy < 0) continue;
      const clear = !room.solidPx(x, fy - 8) && !room.solidPx(x, fy - 24) && !room.solidPx(x, fy - 34);
      const safe = room.tile(Math.floor(x / TILE), Math.floor((fy - 8) / TILE)) !== '^' && !room.inWater(x, fy - 8);
      if (clear && safe) return [x, fy];
    }
    return null;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    const dx = p.x - this.x, dy = p.y - this.y;
    const sees = p.alive && Math.abs(dx) < 230 * this.num('sight') && Math.abs(dy) < 100;
    s.opacity = 1;
    switch (this.state) {
      case 'idle':
        this.vx = 0;
        if (sees) this.faceToward(p.x);
        s.anim('idle', this.t / 60, 3);
        if (sees && --this.cool <= 0) {
          this.set('cast');
          g.audio.play('hex');
        }
        break;
      case 'cast':
        s.anim('cast', this.t / 60, 6);
        s.glow = 0.2 + (this.st / 40) * 0.4;
        if (this.st % 4 === 0) {
          // shadows gather at the staff
          const a = rand(0, Math.PI * 2);
          g.fx.burst(this.x + this.facing * 9 + Math.cos(a) * 12, this.y - 17 + Math.sin(a) * 12, 'mote', 1, 0,
            { vx: -Math.cos(a) * 0.6, vy: -Math.sin(a) * 0.6, life: 20, fade: true, tint: [1.3, 0.5, 1.6], glow: 1 });
        }
        if (this.st === 36) {
          const hx = this.x + this.facing * 9, hy = this.y - 19;
          const a = Math.atan2(p.y - 6 - hy, p.x - hx);
          const disarm = !this.can('disarm') ? '' : this.can('hardcore') ? 'hard' : 'soft';
          g.spawn(new HexBolt(g, hx, hy, Math.cos(a) * 1.7, Math.sin(a) * 1.7, this.atk, this.can('homing'), disarm));
          g.audio.play('spit');
        }
        if (this.st >= 50) {
          s.glow = 0;
          if (this.can('blink')) this.set('fade');
          else {
            this.set('idle');
            this.cool = 110 * this.num('cooldown');
          }
        }
        break;
      case 'fade':
        // sinks into shadow; harmless and untouchable once mostly gone
        s.setFrame(A.idle[0]);
        s.opacity = 1 - this.st / 18;
        if (this.st === 6) {
          this.hostile = false;
          this.whipTarget = false;
        }
        if (this.st >= 18) {
          const spot = this.blinkSpot(g);
          if (spot) {
            this.x = spot[0];
            this.y = spot[1] - this.hh;
            this.vy = 0;
          }
          g.audio.play('blink');
          this.faceToward(p.x);
          this.set('appear');
        }
        break;
      case 'appear':
        s.setFrame(A.idle[0]);
        s.opacity = this.st / 18;
        if (this.st % 3 === 0) g.fx.burst(this.x + rand(-6, 6), this.y + rand(-14, 14), 'smoke', 1, 0, { vy: -0.4, life: 20, fade: true, tint: [0.6, 0.4, 0.8] });
        if (this.st >= 18) {
          this.hostile = true;
          this.whipTarget = true;
          this.cool = 50 * this.num('cooldown');
          this.set('idle');
        }
        break;
    }
    this.physics(g);
    this.place();
  }
}

// ---------------------------------------------------------------- rot ooze

/** Hitbox half-size, HP share and XP share per size (3 = big, 1 = smallest). */
const OOZE = [
  { hw: 0, hh: 0, hp: 0, xp: 0, anim: '' },
  { hw: 4, hh: 4, hp: 0.3, xp: 0.5, anim: 'small' },
  { hw: 7, hh: 6, hp: 0.55, xp: 0.75, anim: 'mid' },
  { hw: 10, hh: 9, hp: 1, xp: 1, anim: 'big' },
];

export class Ooze extends Enemy {
  hopT = 30;
  landT = 0;
  constructor(g: Game, kind: string, x: number, bottom: number, public size = 3) {
    super(g, kind, x, bottom, OOZE[size].hw, OOZE[size].hh);
    this.feet = 0; // the sheet's anchor is the bottom of the blob
    this.hp = this.maxHp = Math.max(1, Math.round(this.hp * OOZE[size].hp));
    this.xp = Math.max(1, Math.round(this.xp * OOZE[size].xp));
    this.hopT = 20 + Math.random() * 40;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims, name = OOZE[this.size].anim;
    const sees = p.alive && Math.abs(p.x - this.x) < 200 * this.num('sight') && Math.abs(p.y - this.y) < 90;
    const wasGround = this.onGround;
    if (this.onGround && this.stun <= 0) {
      this.vx *= 0.75;
      if (--this.hopT <= 0) {
        // hop after the hero (smaller pieces hop faster and higher)
        if (sees) this.faceToward(p.x);
        else if (Math.random() < 0.3) this.facing = -this.facing;
        const ahead = this.x + this.facing * (this.hw + 6);
        if (g.room.solidPx(ahead, this.y)) this.facing = -this.facing;
        this.vy = -[0, 3.8, 3.3, 2.9][this.size];
        this.vx = this.facing * (0.8 + (3 - this.size) * 0.4) * this.num('speed');
        this.hopT = (sees ? 34 : 70) + Math.random() * 30 + this.size * 8;
        g.audio.play('squelch');
      }
    }
    this.physics(g);
    if (this.onGround && !wasGround) {
      this.landT = 8;
      g.fx.burst(this.x, this.bottom - 2, 'slime', 2, this.hw, { vy: -1, grav: 0.15, life: 18 });
    }
    if (this.landT > 0) this.landT--;
    // squashed as it lands and as it gathers to hop; otherwise it sits and pulses
    const pulse = A[name + 'Pulse'];
    if (!this.onGround) s.setFrame(A[name + 'Air'][0]);
    else if (this.landT > 0 || this.hopT < 8) s.setFrame(A[name][1]);
    else s.setFrame(pulse[Math.floor(this.t / 5) % pulse.length]);
    // a bead of gel: a little see-through, with a slow glow from inside
    s.opacity = 0.84;
    s.glow = 0.2 + 0.12 * Math.sin(this.t * 0.09);
    this.place();
  }
  die(g: Game) {
    if (this.size <= 1 || !this.can('split')) return super.die(g);
    // split in two. Only the smallest pieces roll for drops.
    this.dead = true;
    const h = g.hunter;
    h.kills++;
    h.bestiary[this.kind] = (h.bestiary[this.kind] || 0) + 1;
    if (h.gainXp(this.xp)) g.levelUp();
    g.audio.play('squelch');
    g.fx.burst(this.x, this.y, 'slime', 8, this.hw, { speed: 2, grav: 0.15, life: 26 });
    for (const dir of [-1, 1]) {
      const kid = new Ooze(g, this.kind, this.x + dir * this.hw * 0.5, this.bottom, this.size - 1);
      kid.vx = dir * 1.4;
      kid.vy = -3;
      kid.facing = dir;
      kid.hopT = 40 + Math.random() * 20;
      kid.lastHit = this.lastHit; // the blow that split it can't hit the pieces too
      g.spawn(kid);
    }
  }
}

// ---------------------------------------------------------------- grave grub

const GRUB_STRANDED = 110; // frames it flops about on the surface before it digs back in (or cocoons)
const GRUB_COCOON = 100; // frames its cocoon takes to hatch
const SWARM = 3; // moths in a hatching

export class Grub extends Enemy {
  state: 'under' | 'tremble' | 'burst' | 'stranded' | 'dig' | 'cocoon' = 'under';
  st = 0;
  cool = 30;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 6, 13);
    this.feet = 0;
    this.hide(true);
  }
  set(st: Grub['state']) {
    this.state = st;
    this.st = 0;
  }
  /** The cocoon splits: a swarm of Grave Moths bursts out, and the grub is gone (no XP for that). */
  hatch(g: Game) {
    this.dead = true;
    g.audio.play('crumble');
    g.fx.burst(this.x, this.bottom - 10, 'mote', 10, 10, { speed: 1.4, life: 30, fade: true, tint: [0.9, 1.4, 0.6], glow: 0.6 });
    g.fx.burst(this.x, this.bottom - 8, 'dust', 4, 6, { vy: -0.6 });
    for (let i = 0; i < SWARM; i++) {
      const m = new Moth(g, 'moth', this.x + (i - 1) * 6, this.bottom - 14);
      m.vx = (i - 1) * 1.6;
      m.vy = -2 - Math.random();
      g.spawn(m);
    }
  }
  /** Underground it can't hurt you and can't be hit. */
  hide(under: boolean) {
    this.hostile = !under;
    this.whipTarget = !under;
  }
  onHit(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind) {
    // stranded on the surface (or wrapped in its cocoon), it's soft and helpless
    const soft = this.state === 'stranded' || this.state === 'cocoon';
    super.onHit(g, soft ? Math.round(dmg * 1.5) : dmg, fromX, crit, kind);
    if (soft) this.vx = 0;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    if (this.cool > 0) this.cool--;
    const dx = p.x - this.x;
    const sees = p.alive && Math.abs(dx) < 180 * this.num('sight') && p.bottom <= this.bottom + 4 && this.bottom - p.bottom < 90;
    let shakeX = 0;
    switch (this.state) {
      case 'under': {
        // a mound of earth that creeps along the floor toward the hero
        if (sees) this.faceToward(p.x);
        const ahead = this.x + this.facing * 10;
        const blocked = g.room.solidPx(ahead, this.bottom - 4) || !groundAt(g.room, ahead, this.bottom);
        this.vx = sees && Math.abs(dx) > 4 && !blocked ? this.facing * 0.9 * this.num('speed') : 0;
        s.anim('mound', this.t / 60, this.vx ? 8 : 2);
        if (this.vx && this.t % 10 === 0) g.fx.burst(this.x - this.facing * 6, this.bottom - 2, 'dust', 1, 2, { vy: -0.4 });
        if (sees && this.cool <= 0 && Math.abs(dx) < 10 && this.bottom - p.bottom < 60) {
          this.set('tremble');
          g.audio.play('burrow');
        }
        break;
      }
      case 'tremble':
        // the warning: the mound shakes and spits dirt. Move!
        this.vx = 0;
        s.setFrame(A.mound[1]);
        shakeX = (this.st % 4 < 2 ? -1 : 1);
        if (this.st % 3 === 0) g.fx.burst(this.x + rand(-6, 6), this.bottom - 3, 'dust', 1, 2, { vy: -1.2 });
        if (this.st >= 26) {
          this.set('burst');
          this.hide(false);
          this.vy = -5.4;
          g.audio.play('crumble');
          g.shake(2, 8);
          g.fx.burst(this.x, this.bottom - 4, 'dust', 6, 8, { speed: 2.2, grav: 0.2, life: 30 });
        }
        break;
      case 'burst':
        this.vx = 0;
        s.setFrame(A.burst[0]);
        if (this.onGround && this.st > 4) {
          this.set('stranded');
          g.fx.burst(this.x, this.bottom - 2, 'dust', 3, 6);
        }
        break;
      case 'stranded':
        // flops about on the surface, helpless for a while
        this.vx = this.can('burrow') ? 0 : this.facing * 0.3;
        if (!this.can('burrow')) this.patrolTurn(g, 0.3 * this.num('speed'));
        s.anim('wriggle', this.t / 60, 5);
        if (this.st > GRUB_STRANDED) {
          if (this.can('evolve')) {
            // left alone too long, it spins a cocoon: kill it before it hatches
            this.set('cocoon');
            this.hostile = false;
            g.audio.play('squelch');
          } else if (this.can('burrow')) {
            this.set('dig');
            g.audio.play('burrow');
          }
        }
        break;
      case 'cocoon': {
        // it swells and splits, shaking harder and harder, then three moths burst out
        this.vx = 0;
        const k = Math.min(2, Math.floor((this.st / GRUB_COCOON) * 3));
        s.setFrame(A.cocoon[k]);
        if (this.st > GRUB_COCOON / 2) shakeX = this.st % (k === 2 ? 3 : 6) < 2 ? -1 : 1;
        if (this.st % 20 === 0) g.audio.play('squelch');
        if (this.st >= GRUB_COCOON) this.hatch(g);
        break;
      }
      case 'dig':
        this.vx = 0;
        s.setFrame(this.st < 14 ? A.dig[0] : A.mound[0]);
        if (this.st === 10) this.hide(true);
        if (this.st % 4 === 0) g.fx.burst(this.x + rand(-5, 5), this.bottom - 3, 'dust', 1, 2, { vy: -0.8 });
        if (this.st >= 26) {
          this.cool = 80 * this.num('cooldown');
          this.set('under');
        }
        break;
    }
    this.physics(g);
    this.sprite!.place(this.x + shakeX, this.bottom, this.facing < 0);
  }
}

// ---------------------------------------------------------------- grave moth

const MOTH_POISON = 300; // frames of poison a moth's powder leaves on her (5 s)...
const MOTH_DIVE = 28; // frames a dive lasts

/**
 * A Grave Moth, hatched from a grub left on the surface too long (they come in threes). It
 * flutters at the hero in jittery zigzags, now and then darting straight at her. When it
 * touches her it bursts into a cloud of powder: a little damage, and a poison that eats
 * her HP for a while (see Player.poison). A single hit kills one.
 */
export class Moth extends Enemy {
  state: 'flutter' | 'dive' = 'flutter';
  st = 0;
  cool = rand(50, 110);
  jitter = 0; // the current zigzag, flipped every few frames
  constructor(g: Game, kind: string, x: number, y: number) {
    super(g, kind, x, y + 6, 6, 6);
    this.feet = 6;
    this.hostile = false; // it hurts by bursting (below), not by plain contact
    this.lunges = ['dive'];
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims, r = g.room;
    this.st++;
    const dx = p.x - this.x, dy = p.y - 6 - this.y, d = Math.hypot(dx, dy) || 1;
    const sp = this.num('speed'), sees = p.alive && d < 260 * this.num('sight');
    if (this.state === 'flutter') {
      // erratic: steer toward her, with a sideways zigzag that flips at random
      if (this.st % 8 === 0) this.jitter = rand(-1.6, 1.6);
      const ax = sees ? (dx / d) * 0.09 : 0, ay = sees ? (dy / d) * 0.09 : 0.02;
      this.vx = clamp(this.vx + ax + (-dy / d) * this.jitter * 0.08 + rand(-0.12, 0.12), -1.4 * sp, 1.4 * sp);
      this.vy = clamp(this.vy + ay + (dx / d) * this.jitter * 0.08 + rand(-0.15, 0.15), -1.3 * sp, 1.3 * sp);
      s.anim('fly', this.t / 60, 14);
      if (sees && this.stun <= 0 && --this.cool <= 0 && d < 90) {
        this.state = 'dive';
        this.st = 0;
        this.vx = (dx / d) * 2.8 * sp;
        this.vy = (dy / d) * 2.8 * sp;
        g.audio.play('flutter');
      }
    } else {
      s.setFrame(A.dive[0]);
      if (this.st > MOTH_DIVE) {
        this.state = 'flutter';
        this.st = 0;
        this.cool = rand(70, 130) * this.num('cooldown');
      }
    }
    if (this.stun > 0) this.vy -= 0.05; // knocked about by a hit, but it stays aloft
    // it bounces off walls, and stays inside the room
    const nx = this.x + this.vx, ny = this.y + this.vy;
    if (r.solidPx(nx + Math.sign(this.vx) * this.hw, this.y) || nx < 8 || nx > r.W - 8) this.vx = -this.vx;
    else this.x = nx;
    if (r.solidPx(this.x, ny + Math.sign(this.vy) * this.hh) || ny < 8 || ny > r.H - 8) this.vy = -this.vy;
    else this.y = ny;
    this.facing = this.vx < 0 ? -1 : 1;
    s.place(this.x, this.y, this.facing < 0);
    if (this.t % 10 === 0) g.fx.burst(this.x, this.y + 2, 'mote', 1, 2, { vy: 0.3, life: 20, fade: true, tint: [0.9, 1.3, 0.6] });
    // it touches her: it bursts into poison powder
    if (p.alive && p.invuln <= 0 && overlap(this, p)) this.burst(g);
  }
  burst(g: Game) {
    const p = g.player;
    this.dead = true;
    g.audio.play('powder');
    g.fx.burst(this.x, this.y, 'smoke', 6, 10, { vy: -0.3, fps: 8, life: 40, tint: [0.7, 1.2, 0.5] });
    g.fx.burst(this.x, this.y, 'mote', 10, 8, { speed: 1.2, life: 36, fade: true, tint: [0.9, 1.5, 0.5], glow: 0.6 });
    const killed = p.takeDamage(this.atk, this.x, false, true, this.state === 'dive' ? 'melee' : 'touch', this.y);
    if (!killed && !p.justBlocked && this.can('poison')) p.poison(MOTH_POISON * this.num('poisonTime'), Math.max(1, Math.round(this.atk * 0.25)));
  }
}

// ---------------------------------------------------------------- gravehand

// It stalks: once it senses her it holds a fixed distance from her (wherever she goes) for
// a moment, so she can see it, then it rushes in, faster and faster, until it's under her
// feet: two or three seconds in all. It only senses her through the floor, so a jump throws
// it off, and it starts the stalk over when she lands.
const HAND_HOLD = 90; // frames it keeps its distance once it senses her (1.5 s)...
const HAND_HOLD_SPEED = 5; // (fast enough to keep that distance even if she runs)
const HAND_MIN = 0.8; // ...then it rushes in from this speed...
const HAND_ACCEL = 0.12; // ...speeding up by this much each frame...
const HAND_MAX = 4.5; // ...up to this, far faster than a run (2.5)
const HAND_WARN_TRACK = 2.6; // how fast the rumble follows her feet before it strikes
const HAND_WARN = 20; // the dirt rumbles under her feet this long (1/3 s) before it strikes
const HAND_SNAP = 8; // frames after bursting up that it can still close on her
const HAND_RESTED = 600; // after she mashes free it lies quiet for 10 s
const HAND_TRIP_DMG = 10; // what a face-first fall costs

/**
 * A dead hand that swims under the floor after the hero. Its furrow of pushed-up soil and
 * the scrape of its nails give it away before it reaches her: it holds its distance for a
 * moment, then rushes in. When it's under her feet the dirt rumbles for a third of a second, then it bursts up: standing or
 * walking, it closes around her ankles and holds her (mash LEFT/RIGHT/JUMP to break free,
 * see Player.grab); running, it trips her flat. Jumping at the rumble makes it miss.
 * It deals no damage of its own, and it can only be hit while it's up.
 */
export class Gravehand extends Enemy implements Holder {
  state: 'under' | 'warn' | 'reach' | 'hold' | 'sink' = 'under';
  st = 0;
  cool = 30;
  homeX: number; // where it was placed (the leash is measured from here)
  senseT = -1; // frames since it sensed her through the floor (-1 = it can't)
  spd = 0; // how fast it's swimming after her
  lastX: number; // where it last sensed her
  gap = 0; // the distance it holds from her, and on which side (+ = to her right)
  trailD = 0; // px swum since the last clod of the trail
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 7, 14);
    this.feet = 0;
    this.homeX = x;
    this.lastX = x;
    this.hostile = false; // contact never hurts, the grab is its only attack
    this.touchDmg = 0;
    this.atk = 0;
    this.whipTarget = false;
    this.sprite!.visible = false;
  }
  set(st: Gravehand['state']) {
    this.state = st;
    this.st = 0;
  }
  /** Only a hand that's out of the ground can be hit. */
  up(on: boolean) {
    this.whipTarget = on;
  }
  /** The hero got loose (Player.updateHold): mashed free = it sulks for a long while. */
  released(mashed: boolean) {
    this.set('sink');
    this.cool = mashed ? HAND_RESTED : 150 * this.num('cooldown');
  }
  /** Swim under the floor toward `tx` at up to `speed`, staying on this floor and inside the leash. Returns the px moved. */
  track(g: Game, tx: number, speed: number) {
    const leash = this.num('leash') * TILE;
    if (leash > 0) tx = clamp(tx, this.homeX - leash, this.homeX + leash);
    const step = clamp(tx - this.x, -speed, speed);
    if (!step) return 0;
    const nx = this.x + step, lead = nx + Math.sign(step) * 4;
    // the floor has to carry on there, with no wall in the way
    if (!groundAt(g.room, lead, this.bottom) || g.room.solidPx(lead, this.bottom - 4)) return 0;
    this.x = nx;
    this.facing = step < 0 ? -1 : 1;
    // its trail: clods of stirred earth that linger on the floor behind it
    this.trailD += Math.abs(step);
    if (this.trailD >= 5) {
      this.trailD = 0;
      g.fx.burst(this.x - this.facing * 8, this.bottom - 2, 'dust', 1, 1, { vy: -0.1, life: 90, fade: true, tint: [0.75, 0.55, 0.42] });
    }
    return Math.abs(step);
  }
  /** It feels her through the floor: she's standing on it, close enough. Off the ground, it loses her. */
  senses(g: Game) {
    const p = g.player;
    return p.alive && p.onGround && p.state !== 'trip' && Math.abs(p.bottom - this.bottom) < 6 && Math.abs(p.x - this.x) < 260 * this.num('sight');
  }
  /** Swimming after her (the 'under' state): hold its distance, then rush in. */
  stalk(g: Game) {
    const p = g.player, s = this.sprite!, A = this.anims;
    let tx = this.lastX;
    if (this.senses(g)) {
      if (this.senseT < 0) {
        this.senseT = 0;
        this.gap = this.x - p.x;
      }
      this.senseT++;
      this.lastX = p.x;
      if (this.senseT <= HAND_HOLD) {
        // keeping its distance: it moves when she moves, and waits when she waits
        tx = p.x + this.gap;
        this.spd = HAND_HOLD_SPEED;
      } else {
        tx = p.x;
        this.spd = this.senseT === HAND_HOLD + 1 ? HAND_MIN : Math.min(HAND_MAX, this.spd + HAND_ACCEL);
      }
    } else {
      // lost her: it slows and stops where it last felt her
      if (this.senseT >= 0) this.spd = Math.min(this.spd, HAND_MAX);
      this.senseT = -1;
      this.spd *= 0.92;
    }
    const moved = this.track(g, tx, this.spd);
    // the furrow it pushes along: always there to see, plainer as it closes in
    s.visible = true;
    s.setFrame(A.furrow[Math.floor(this.t / (moved > 1.5 ? 4 : 9)) % 2]);
    s.opacity = moved > 0.1 ? 1 : 0.5;
    // the scrape of its nails, quickening (and louder) as it speeds up
    const rush = Math.min(1, moved / HAND_MAX), every = Math.round(30 - rush * 22);
    if (moved > 0.1 && this.t % every === 0) g.audio.play('scrape', rush);
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, s = this.sprite!, A = this.anims;
    this.st++;
    if (this.cool > 0) this.cool--;
    const onIt = p.alive && p.onGround && Math.abs(p.bottom - this.bottom) < 6;
    let shakeX = 0;
    s.mesh.renderOrder = 10;
    s.opacity = 1;
    switch (this.state) {
      case 'under':
        if (this.cool > 0) {
          // resting after an attack: it lies still deep down, with no furrow to give it away
          s.visible = false;
          this.senseT = -1;
          this.spd = 0;
          break;
        }
        this.stalk(g);
        if (onIt && p.holdT <= 0 && p.freeT <= 0 && Math.abs(p.x - this.x) < 6) {
          this.set('warn');
          g.audio.play('burrow');
        }
        break;
      case 'warn':
        // the warning: the dirt heaves under her feet, following her. Jump!
        if (this.senses(g)) this.track(g, p.x, HAND_WARN_TRACK);
        s.visible = true;
        s.setFrame(A.rumble[Math.floor(this.st / 3) % 2]);
        shakeX = this.st % 4 < 2 ? -1 : 1;
        if (this.st % 3 === 0) g.fx.burst(this.x + rand(-7, 7), this.bottom - 2, 'dust', 1, 2, { vy: -1.2 });
        if (this.st >= HAND_WARN) {
          this.set('reach');
          this.up(true);
          g.audio.play('crumble');
          g.fx.burst(this.x, this.bottom - 4, 'dust', 5, 8, { speed: 1.8, grav: 0.2, life: 26 });
        }
        break;
      case 'reach': {
        // bursts up and snaps shut on whatever stands there; it lingers a moment if it misses
        s.anim('reach', this.t / 60, 7);
        const close = onIt && Math.abs(p.x - this.x) < 12;
        if (close && this.st <= HAND_SNAP) {
          if (p.running && this.can('trip')) {
            if (p.trip(HAND_TRIP_DMG)) {
              g.audio.play('growl');
              this.cool = 150 * this.num('cooldown');
              this.set('sink');
            }
          } else if (p.grab(this, this.num('mash'))) {
            this.set('hold');
            g.audio.play('growl');
          }
        } else if (this.st > 36) {
          this.cool = 60 * this.num('cooldown');
          this.set('sink');
        }
        break;
      }
      case 'hold':
        // a fist closed round her ankles, drawn in front of her
        if (p.holdBy !== this) {
          this.set('sink');
          break;
        }
        this.x = p.x;
        s.mesh.renderOrder = 13;
        s.anim('fist', this.t / 60, 12);
        break;
      case 'sink':
        s.setFrame(A.low[0]);
        if (this.st === 1) this.up(false);
        if (this.st % 4 === 0) g.fx.burst(this.x + rand(-5, 5), this.bottom - 3, 'dust', 1, 2, { vy: -0.8 });
        if (this.st >= 16) {
          this.cool = Math.max(this.cool, 60);
          this.senseT = -1; // it starts its stalk over
          this.spd = 0;
          this.set('under');
        }
        break;
    }
    this.vx = 0;
    this.physics(g);
    // the fist turns with her, so the fingers wrap round the front of her boots
    const flip = this.state === 'hold' ? p.facing < 0 : this.facing < 0;
    s.place(this.x + shakeX, this.bottom, flip);
  }
  die(g: Game) {
    // killing it frees her, with the usual grace so a neighbor can't grab right back
    const p = g.player;
    if (p.holdBy === this) {
      p.holdT = 0;
      p.holdBy = null;
      p.freeT = 60;
    }
    super.die(g);
  }
}
