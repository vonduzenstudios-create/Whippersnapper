// Old Rimehide, the trial fights (0.27.0). Two dens to try him in, both test-chamber only:
//
//   RimehideFalls  (The Frozen Falls)      a cave under a frozen waterfall: thin lake ice, two
//                                          hot-spring vents, and the falls themselves
//   RimehideBones  (The Mammoth Boneyard)  his den inside a frozen ribcage: ribs to wedge an arm
//                                          in, a tusk hanging from the spine, carcasses on hooks
//
// He is one puppet (gfx/art_rimehide.ts) and one set of blows in both (the class Rimehide):
// walk, swipe, the two-fisted slam, the leap, a thrown boulder or bone. His fur turns the chain
// (a blow only chips), so each den gives three ways to put him where a blow counts: see the
// two classes. At half health he arms himself (a scene) and the den changes.
import { Sprite, Sheet } from '../gfx/view';
import type { Game } from './game';
import { Ent, DmgType, HitKind } from './ent';
import { BossBase, Target, SEG, frameAt, frameLoop } from './boss_base';
import { EnemyShot } from './objects';
import { Shockwave } from './enemies_expansion';
import { lazySheet } from '../gfx/lazy';
import { buildRimehideSheet, buildRimePropSheet, Weapon } from '../gfx/art_rimehide';
import { clamp, rand } from '../core/util';
import { TILE } from '../config';

const HH = 44; // half his height

/** A boulder of packed snow, thrown in an arc. `land` is told where it burst. */
class Snowball extends Ent {
  t = 0;
  constructor(g: Game, sheet: Sheet, x: number, y: number, public vx: number, public vy: number, private floorY: number, private land: (x: number) => void) {
    super();
    this.x = x;
    this.y = y;
    this.hw = this.hh = 10;
    this.hostile = true;
    this.touchDmg = 18;
    this.sprite = new Sprite(sheet, g.view.sprites, 14);
    this.sprite.mesh.scale.multiplyScalar(0.5);
  }
  hitType(): DmgType {
    return 'shot';
  }
  update(g: Game) {
    this.t++;
    this.vy += 0.17;
    this.x += this.vx;
    this.y += this.vy;
    const s = this.sprite!;
    s.setFrame(s.sheet.anims.boulder[Math.floor(this.t / 6) % 2]);
    s.mesh.position.set(Math.round(this.x), -Math.round(this.y - 37 * 0.5), 0); // the boulder sits 37 px below the middle of its cell
    if (this.y >= this.floorY - 8 || this.t > 300) {
      this.dead = true;
      g.audio.play('crumble');
      g.fx.burst(this.x, this.floorY - 6, 'flake', 10, 12, { speed: 2, grav: 0.08, life: 36, fade: true });
      this.land(this.x);
    }
  }
}

/** A snowball kicked along the floor: it grows as it rolls. `roll` is told each frame where it is, and says if it should stop. */
class SnowRoll extends Ent {
  t = 0;
  r = 12;
  constructor(g: Game, sheet: Sheet, x: number, private floorY: number, public vx: number, private roll: (x: number) => boolean) {
    super();
    this.x = x;
    this.hostile = true;
    this.touchDmg = 20;
    this.sprite = new Sprite(sheet, g.view.sprites, 14);
  }
  hitType(): DmgType {
    return 'shot';
  }
  update(g: Game) {
    this.t++;
    this.x += this.vx;
    this.r = Math.min(30, this.r + 0.09);
    this.hw = this.hh = this.r - 3;
    this.y = this.floorY - this.r;
    const s = this.sprite!, k = this.r / 24;
    s.setFrame(s.sheet.anims.boulder[Math.floor(this.t / 5) % 2]);
    s.mesh.scale.set(s.sheet.cw * k, s.sheet.ch * k, 1);
    // the boulder sits 37 px below the middle of its cell: keep it on (x, y) at any size
    s.mesh.position.set(Math.round(this.x), -Math.round(this.y - 37 * k), 0);
    if (this.t % 5 === 0) g.fx.burst(this.x - Math.sign(this.vx) * this.r, this.floorY - 3, 'flake', 1, 3, { vy: -0.5, life: 20, fade: true });
    if (this.roll(this.x) || this.x < 30 || this.x > g.room.W - 30 || this.t > 600) {
      this.dead = true;
      g.audio.play('crumble');
      g.fx.burst(this.x, this.y, 'flake', 14, this.r, { speed: 2.4, grav: 0.08, life: 40, fade: true });
    }
  }
}

export abstract class Rimehide extends BossBase {
  label = 'RIMEHIDE';
  weapon: Weapon = '';
  sheet: Sheet;
  propSheet: Sheet;
  shadow: Sprite;
  get camZoom() {
    return 1.15;
  }
  constructor(g: Game, id: string) {
    const sheet = lazySheet('rimehide', buildRimehideSheet);
    super(g, id, sheet, 26, HH, 11);
    this.sheet = sheet;
    this.propSheet = lazySheet('rimeprops', buildRimePropSheet);
    this.x = g.room.W / 2 + 130;
    this.y = -100;
    this.shadow = new Sprite(g.sheets.props, g.view.sprites, 7);
    this.shadow.setFrame(g.sheets.props.anims.crack[2]);
    this.shadow.visible = false;
    this.props.push(this.shadow);
  }
  /** A prop of his den (the rimeprops sheet, anchored bottom middle). */
  put(anim: string, x: number, bottom: number, order = 7, frame = 0) {
    const s = new Sprite(this.propSheet, this.g.view.sprites, order);
    s.setFrame(this.propSheet.anims[anim][frame]);
    s.place(x, bottom);
    this.props.push(s);
    return s;
  }
  /** An animation's frames: the armed version while he holds a weapon. */
  A(name: string) {
    const a = this.sheet.anims;
    return (this.weapon && a[`${this.weapon}_${name}`]) || a[name];
  }
  get held() {
    return this.pat === 'held';
  }
  get ground() {
    return this.floorY - HH;
  }
  hitType(): DmgType {
    return this.pat === 'leap' || this.pat === 'charge' ? 'melee' : 'touch';
  }
  targets(): Target[] {
    return [{ id: 'body', x: this.x, y: this.y - 6, r: 36 }];
  }
  hurtZones(): Target[] {
    return this.held ? [] : [{ id: 'body', x: this.x, y: this.y, r: 24 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id !== 'body') return this.onProp(g, t);
    if (this.held) {
      if (this.strike(g, this.x, this.y - 20, kind) && this.held) this.release(g);
      return;
    }
    this.chip(g, t.x, t.y - 10); // the fur takes it
  }
  /** The whip touched something of the den's (see targets() in the two fights). */
  onProp(_g: Game, _t: Target) {}

  /**
   * He is helpless: `anim` plays for `frames`, and blows count until a segment is spent
   * (or `cap` HP, for a heavier fall).
   */
  hold(g: Game, anim: string, frames: number, msg: string, cap = SEG) {
    this.set('held');
    this.data = { anim, len: frames };
    this.windowDmg = SEG - cap;
    this.y = this.ground;
    g.message(msg, 150);
    g.audio.play('roar');
    g.shake(5, 24);
  }
  /** The window is over: he pulls himself together, or starts the second half. */
  release(g: Game) {
    this.freed(g);
    g.shake(5, 30);
    g.fx.burst(this.x, this.floorY, 'flake', 12, 20, { vy: -1, life: 36, fade: true });
    if (this.hp <= this.maxHp / 2 && this.phase === 1) {
      this.phase = 2;
      g.bossScene();
      return this.pick('rage');
    }
    g.audio.play('roar');
    this.pick('walk');
  }

  // ------------------------------------------------------------ what each den decides
  /** Every frame, before he acts: the den's own machinery (ice, vents, props). */
  abstract arena(g: Game): void;
  /** Pick his next attack (he is in 'walk'). */
  abstract next(g: Game): void;
  /** Patterns only this den has. Returns the frame to show. */
  abstract special(g: Game): number;
  /** His fists or weapon hit the ground at x. */
  abstract onSlam(g: Game, x: number): void;
  /** He lands from a leap. Return true if the den took over (he fell through, got stuck). */
  abstract onLand(g: Game): boolean;
  /** The end of the throw's wind-up: let fly. */
  abstract hurl(g: Game): void;
  /** The second half begins (during the scene). */
  abstract enrage(g: Game): void;
  /** He comes out of a window. */
  freed(_g: Game) {}
  /** Where a leap may come down. */
  leapTo(x: number) {
    return clamp(x, 60, this.g.room.W - 60);
  }

  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    this.shadow.visible = false;
    this.arena(g); // (first: the den may put him in a window, which replaces `data`)
    const p = g.player, s = this.sprite!, d = this.data;
    const fast = this.phase === 2 ? 1.2 : 1;
    const dx = p.x - this.x, ground = this.ground;
    let frame = frameLoop(this.A('idle'), g.frame, 8);
    switch (this.pat) {
      case 'enter':
        // he drops out of the dark above, lands in a crouch, rises and roars
        if (this.y < ground) {
          this.vy = Math.min(this.vy + 0.35, 7);
          this.y = Math.min(ground, this.y + this.vy);
          frame = frameLoop(this.A('leap'), this.pt, 6);
          if (this.y >= ground) {
            g.audio.play('rumble');
            g.shake(7, 30);
            g.fx.burst(this.x, this.floorY, 'flake', 16, 26, { vy: -1, life: 36, fade: true });
            d.landed = this.pt;
          }
        } else if (d.landed) {
          const t = this.pt - d.landed;
          frame = t < 24 ? frameLoop(this.A('squat'), t, 8) : t < 96 ? frameLoop(this.A('roar'), t, 5) : frame;
          if (t === 24) {
            g.audio.play('roar');
            g.shake(5, 50);
            g.bossIntro();
          }
          if (t === 100) g.bossTalk();
          if (t > 100) this.pick('walk');
        }
        this.facing = dx < 0 ? -1 : 1;
        break;
      case 'walk': {
        this.facing = dx < 0 ? -1 : 1;
        if (Math.abs(dx) > 84 && this.canStep(this.x + this.facing * 44)) this.x += this.facing * 1.15 * fast;
        frame = frameLoop(this.A('walk'), this.pt, 6);
        if (this.pt % 24 === 12) g.shake(1, 4);
        if (this.pt > 76 / fast) this.next(g);
        break;
      }
      case 'swipe': {
        // a backhand across the floor in front of him (or, armed, a flat swing you can duck)
        const armed = !!this.weapon, len = (armed ? 58 : 44) / fast, k = this.pt / len;
        frame = frameAt(this.A(armed ? 'sweep' : 'swipe'), k);
        if (this.pt === 1) g.audio.play('growl');
        if (Math.abs(k - 0.45) < 0.5 / len) g.audio.play('whip');
        if (k > 0.45 && k < 0.72) this.smite(g, armed ? { x: this.x + this.facing * 62, y: this.floorY - 44, hw: 52, hh: 12 } : { x: this.x + this.facing * 46, y: this.floorY - 28, hw: 34, hh: 28 });
        if (k >= 1.25) {
          // armed, he steps in and swings a second time
          if (armed && !d.again && Math.abs(dx) < 170) {
            this.set('swipe');
            this.data.again = true;
            this.facing = dx < 0 ? -1 : 1;
            this.x = clamp(this.x + this.facing * 26, 60, g.room.W - 60);
          } else this.pick('walk');
        }
        break;
      }
      case 'slam': {
        const len = 64 / fast, k = this.pt / len;
        frame = frameAt(this.A('slam'), k);
        if (this.pt === 1) g.audio.play('growl');
        if (!d.hit && k >= 0.64) {
          d.hit = true;
          const ix = this.x + this.facing * (this.weapon ? 70 : 52);
          g.audio.play('rumble');
          g.shake(6, 20);
          g.fx.burst(ix, this.floorY, 'flake', 10, 16, { vy: -1, speed: 1.5, life: 30, fade: true });
          this.smite(g, { x: ix, y: this.floorY - 20, hw: this.weapon ? 26 : 30, hh: 24 });
          this.onSlam(g, ix);
        }
        if (this.pat === 'slam' && k > 1.4) this.pick('walk');
        break;
      }
      case 'leap': {
        const tell = 34;
        if (this.pt <= tell) {
          frame = frameLoop(this.A('squat'), this.pt, 8);
          this.facing = dx < 0 ? -1 : 1;
          if (this.pt === 1) {
            d.x0 = this.x;
            d.tx = this.leapTo(p.x);
            g.audio.play('growl');
          }
        } else {
          const len = 50 / fast, t = Math.min(1, (this.pt - tell) / len);
          this.x = d.x0 + (d.tx - d.x0) * t;
          this.y = ground - Math.sin(t * Math.PI) * 140;
          frame = frameLoop(this.A('leap'), this.pt, 6);
          if (t >= 1) {
            this.y = ground;
            g.audio.play('rumble');
            g.shake(6, 24);
            g.fx.burst(this.x, this.floorY, 'flake', 10, 24, { vy: -0.8, life: 30, fade: true });
            this.smite(g, { x: this.x, y: this.floorY - 20, hw: 34, hh: 22 });
            if (!this.onLand(g)) this.pick('walk');
          }
        }
        if (this.pat === 'leap') {
          this.shadow.visible = true;
          this.shadow.place(d.tx, this.floorY - 22);
        }
        break;
      }
      case 'throw': {
        this.facing = dx < 0 ? -1 : 1;
        frame = this.pt < 36 ? frameAt(this.A('lift'), this.pt / 36) : frameAt(this.A('throw'), (this.pt - 36) / 16);
        if (this.pt === 40) {
          this.hurl(g);
          g.audio.play('throw');
        }
        if (this.pt > 74) this.pick('walk');
        break;
      }
      case 'held':
        frame = frameLoop(this.A(d.anim), this.pt, 9);
        this.y = ground;
        if (this.pt % 26 === 0) g.fx.burst(this.x + rand(-20, 20), this.y - 50, 'star', 1, 4, { life: 24, fade: true });
        if (this.pt > d.len) this.release(g);
        break;
      case 'rage':
        // the scene: he roars the den down round him and arms himself
        this.y = ground;
        frame = frameLoop(this.A('roar'), this.pt, 5);
        if (this.pt === 1) {
          g.audio.play('roar');
          g.shake(6, 60);
        }
        if (this.pt === 40) {
          this.enrage(g);
          g.fadeFlash = 10;
          g.audio.play('crumble');
        }
        if (this.pt === 120) g.bossTalk(`boss_${this.id}_phase2`);
        if (this.pt > 120) this.pick('walk');
        break;
      case 'dying':
        frame = frameLoop(this.A('daze'), this.pt, 8);
        this.y = Math.min(ground + 20, this.y + 0.2);
        if (this.dyingTick(g, 160, 36)) return;
        break;
      default:
        frame = this.special(g);
    }
    this.x = clamp(this.x, 44, g.room.W - 44);
    s.setFrame(frame);
    s.place(this.x, this.y + HH, this.facing < 0);
    this.showFlash();
    if (this.phase === 2) s.tint(1.1, 0.95, 0.95);
  }
  /** May he walk onto x? (Not onto open water.) */
  canStep(_x: number) {
    return true;
  }
}

// ---------------------------------------------------------------- the Frozen Falls

const SLABS = 6;
const SLAB_W = 4; // tiles
const SLAB_X0 = 26; // the first slab's left tile
const REFREEZE = 900;
const VENT_CYCLE = 360;
const FALLS_X = 96; // where a charge meets the frozen falls

/**
 * The Frozen Falls. Three ways to open him up:
 *   - thin ice: the six slabs in the middle take two blows each (a boulder is one, a leap one,
 *     later two). Under his leap, his club or his own charge a broken slab swallows him.
 *   - the falls: bait a charge so it ends against the frozen waterfall, and it comes down on him.
 *   - the vents: two hot springs blow in turn. If he is standing over one when it goes, he is scalded.
 * Second half: he tears a pillar of ice out of the falls. Club slams send shockwaves and shards,
 * a flat swing (duck it) comes twice, he kicks snowballs along the floor that crack the ice
 * they cross, and his breath shoves you back toward the water.
 */
export class RimehideFalls extends Rimehide {
  slabs: { hits: number; thaw: number; s: Sprite }[] = [];
  vents: { x: number; s: Sprite }[] = [];
  rubble: Sprite;
  pillar: Sprite;
  constructor(g: Game) {
    super(g, 'yeti2');
    for (let k = 0; k < 4; k++) this.put('falls', 40, 128 * (k + 1) - 60, 5);
    this.pillar = this.put('pillar', 130, this.floorY, 5);
    this.rubble = this.put('rubble', FALLS_X, this.floorY, 12);
    this.rubble.visible = false;
    for (const tx of [54, 64]) {
      const x = tx * TILE + 8;
      this.vents.push({ x, s: this.put('vent', x, this.floorY + 2, 7) });
    }
    const CR = g.sheets.props;
    for (let i = 0; i < SLABS; i++) {
      const s = new Sprite(CR, g.view.sprites, 7);
      s.place(this.slabMid(i), this.floorY - 14);
      s.mesh.scale.set(SLAB_W * TILE, 48, 1);
      s.visible = false;
      this.props.push(s);
      this.slabs.push({ hits: 0, thaw: 0, s });
    }
  }
  slabAt(x: number) {
    const i = Math.floor((x / TILE - SLAB_X0) / SLAB_W);
    return i >= 0 && i < SLABS ? i : -1;
  }
  slabMid(i: number) {
    return (SLAB_X0 + i * SLAB_W + SLAB_W / 2) * TILE;
  }
  open(i: number) {
    return i >= 0 && this.slabs[i].hits >= 2;
  }
  setIce(g: Game, i: number, solid: boolean) {
    for (let k = 0; k < SLAB_W; k++) g.room.set(SLAB_X0 + i * SLAB_W + k, g.room.rows - 2, solid ? '#' : '.');
    g.paintRoomTiles();
  }
  /** A slab takes `n` blows. Returns true if it broke. */
  crack(g: Game, i: number, n: number) {
    const sl = this.slabs[i];
    if (i < 0 || !sl || sl.hits >= 2) return false;
    sl.hits = Math.min(2, sl.hits + n);
    g.audio.play('glass');
    if (sl.hits < 2) return false;
    sl.thaw = REFREEZE;
    this.setIce(g, i, false);
    g.shake(5, 20);
    g.audio.play('splash');
    g.fx.burst(this.slabMid(i), this.floorY, 'glass', 12, 26, { speed: 2.5, grav: 0.12, life: 44, fade: true });
    g.fx.burst(this.slabMid(i), this.floorY + 6, 'splash', 5, 20, { life: 24 });
    return true;
  }
  /** Through the ice at slab i. */
  plunge(g: Game, i: number) {
    this.x = this.slabMid(i);
    this.hold(g, 'stuck', 380, 'THE ICE GIVES WAY: STRIKE');
  }
  canStep(x: number) {
    return !this.open(this.slabAt(x));
  }
  freed(g: Game) {
    // out of the hole onto the nearest slab that holds; out of the rubble, which scatters
    this.rubble.visible = false;
    if (this.data.anim === 'stuck' && !this.data.buried) {
      let best = -1;
      for (let i = 0; i < SLABS; i++) if (!this.open(i) && (best < 0 || Math.abs(this.slabMid(i) - this.x) < Math.abs(this.slabMid(best) - this.x))) best = i;
      this.x = best >= 0 ? this.slabMid(best) : SLAB_X0 * TILE - 40;
    }
  }
  arena(g: Game) {
    const p = g.player, CR = g.sheets.props.anims.crack;
    this.slabs.forEach((sl, i) => {
      if (sl.hits >= 2 && --sl.thaw <= 0 && !this.held && this.pat !== 'dying') {
        sl.hits = 0;
        this.setIce(g, i, true);
        g.fx.burst(this.slabMid(i), this.floorY, 'flake', 8, 26, { vy: -0.4, life: 30, fade: true });
      }
      sl.s.visible = sl.hits === 1;
      if (sl.s.visible) sl.s.setFrame(CR[1]);
    });
    if (p.alive && p.bottom > this.floorY + 6 && g.frame % 20 === 0) p.poison(60, 3); // the lake is deadly cold
    // the hot springs blow in turn: a glow, then a column of steam
    const VA = this.propSheet.anims.vent;
    this.vents.forEach((v, i) => {
      const t = (g.frame + i * (VENT_CYCLE / 2)) % VENT_CYCLE;
      const warn = t >= VENT_CYCLE - 130 && t < VENT_CYCLE - 70, blow = t >= VENT_CYCLE - 70;
      v.s.setFrame(VA[warn || blow ? 1 : 0]);
      v.s.glow = warn ? 0.3 + Math.sin(g.frame * 0.4) * 0.2 : blow ? 0.6 : 0;
      if (warn && t % 12 === 0) g.fx.burst(v.x + rand(-6, 6), this.floorY - 6, 'smoke', 1, 2, { vy: -0.6, life: 24, fade: true });
      if (!blow || this.pat === 'dying' || this.pat === 'enter') return;
      if (t === VENT_CYCLE - 70) g.audio.play('flame');
      if (t % 2 === 0) g.fx.burst(v.x + rand(-7, 7), this.floorY - rand(0, 20), 'smoke', 1, 3, { vy: -3.4, life: 30, fade: true, tint: [1.4, 1.5, 1.6] });
      this.smite(g, { x: v.x, y: this.floorY - 56, hw: 11, hh: 56 }, 'magic', Math.round(this.atk * 0.6));
      const standing = ['walk', 'swipe', 'slam', 'throw', 'breath', 'roll'].includes(this.pat) || (this.pat === 'charge' && this.pt > 40);
      if (standing && Math.abs(this.x - v.x) < 32) this.hold(g, 'scald', 300, 'THE STEAM SCALDS HIM: STRIKE');
    });
  }
  next(g: Game) {
    const near = Math.abs(g.player.x - this.x) < 100;
    if (this.phase === 1) this.pick(near ? this.choose(['swipe', 'slam', 'leap']) : this.choose(['throw', 'leap', 'charge', 'throw']));
    else this.pick(near ? this.choose(['swipe', 'slam', 'breath']) : this.choose(['roll', 'leap', 'charge', 'breath', 'slam']));
  }
  hurl(g: Game) {
    const dx = g.player.x - this.x, time = (2 * 5) / 0.17 + 8;
    g.spawn(new Snowball(g, this.propSheet, this.x + this.facing * 12, this.y - 56, clamp(dx / time, -7, 7), -5, this.floorY, (x) => this.crack(g, this.slabAt(x), 1)));
  }
  onLand(g: Game) {
    const i = this.slabAt(this.x);
    if (i >= 0 && this.crack(g, i, this.phase === 2 ? 2 : 1)) {
      this.plunge(g, i);
      return true;
    }
    return false;
  }
  onSlam(g: Game, x: number) {
    if (!this.weapon) return;
    // the club: a shockwave each way, a burst of shards, and it cracks the ice it lands on
    for (const dir of [-1, 1]) g.spawn(new Shockwave(g, x + dir * 20, this.floorY, dir * 2.6, 16, 200));
    for (let k = 0; k < 4; k++) g.spawn(new EnemyShot(g, x, this.floorY - 16, (k - 1.5) * 1.5, -3.6 - (k % 2), 'icicle', 12, 0.14));
    const i = this.slabAt(x);
    if (i >= 0 && this.crack(g, i, 1) && Math.abs(this.slabMid(i) - this.x) < 60) this.plunge(g, i); // the floor goes under his own feet
  }
  enrage(g: Game) {
    this.weapon = 'ice';
    this.pillar.setFrame(this.propSheet.anims.pillar[1]);
    g.fx.burst(130, this.floorY - 50, 'glass', 16, 30, { speed: 3, grav: 0.12, life: 50, fade: true });
    this.x = 190;
    this.facing = 1;
  }
  special(g: Game): number {
    const p = g.player, d = this.data, fast = this.phase === 2 ? 1.15 : 1;
    switch (this.pat) {
      case 'charge': {
        // paws the ground, then runs flat out until something stops him
        if (this.pt <= 40) {
          if (this.pt === 1) {
            this.facing = p.x < this.x ? -1 : 1;
            g.audio.play('growl');
          }
          if (this.pt % 12 === 0) g.fx.burst(this.x - this.facing * 20, this.floorY, 'flake', 3, 6, { vx: -this.facing, vy: -0.6, life: 20, fade: true });
          return frameLoop(this.A('squat'), this.pt, 6);
        }
        this.x += this.facing * 4.3 * fast;
        if (this.pt % 4 === 0) g.fx.burst(this.x - this.facing * 24, this.floorY, 'flake', 1, 4, { vy: -0.5, life: 20, fade: true });
        const i = this.slabAt(this.x);
        if (this.open(i)) this.plunge(g, i);
        else if (this.x <= FALLS_X) {
          // into the frozen falls: the ice comes down and buries him to the neck
          this.x = FALLS_X;
          this.facing = 1;
          this.hold(g, 'stuck', 360, 'THE FALLS BURY HIM: STRIKE');
          this.data.buried = true;
          this.rubble.visible = true;
          g.audio.play('explode');
          g.shake(8, 40);
          g.fx.burst(60, this.floorY - 120, 'glass', 24, 60, { speed: 3, grav: 0.14, life: 60, fade: true });
        } else if (this.x >= g.room.W - 70) {
          g.audio.play('rumble');
          g.shake(6, 24);
          this.pick('daze');
        }
        return frameLoop(this.A(this.weapon ? 'walk' : 'charge'), this.pt, 3);
      }
      case 'daze':
        // he hit bare rock: a moment on his heels, nothing more
        if (this.pt > 90) this.pick('walk');
        return frameLoop(this.A('daze'), this.pt, 8);
      case 'roll': {
        // kicks a boulder along the floor at her: it grows, and cracks the thin ice it crosses
        if (this.pt === 1) this.facing = p.x < this.x ? -1 : 1;
        if (this.pt === 30) {
          const seen = new Set<number>();
          g.spawn(new SnowRoll(g, this.propSheet, this.x + this.facing * 44, this.floorY, this.facing * 2.7, (x) => {
            const i = this.slabAt(x);
            if (i < 0) return false;
            if (this.open(i)) return true; // into the water
            if (!seen.has(i) && Math.abs(x - this.slabMid(i)) < 6) {
              seen.add(i);
              return this.crack(g, i, 1);
            }
            return false;
          }));
          g.audio.play('throw');
        }
        if (this.pt > 70) this.pick('walk');
        return frameAt(this.A(this.weapon ? 'sweep' : 'swipe'), (this.pt - 14) / 30);
      }
      case 'breath': {
        // a blizzard out of his lungs: it shoves her back, and bites up close
        if (this.pt === 1) {
          this.facing = p.x < this.x ? -1 : 1;
          g.audio.play('roar');
        }
        if (this.pt > 30 && this.pt < 170) {
          const ahead = (p.x - this.x) * this.facing;
          if (ahead > 0 && ahead < 420 && Math.abs(p.y - this.y) < 90) p.pushV = this.facing * 1.7;
          for (let k = 0; k < 2; k++) g.fx.burst(this.x + this.facing * 34, this.y - 46 + rand(-8, 8), 'flake', 1, 4, { vx: this.facing * rand(4, 7), vy: rand(-0.6, 0.9), life: 50, fade: true });
          this.smite(g, { x: this.x + this.facing * 70, y: this.y - 20, hw: 40, hh: 30 }, 'magic', Math.round(this.atk * 0.6));
        }
        if (this.pt > 190) this.pick('walk');
        return frameLoop(this.A('breath'), this.pt, 5);
      }
    }
    return frameLoop(this.A('idle'), g.frame, 8);
  }
}

// ---------------------------------------------------------------- the Mammoth Boneyard

const RIB_X = [20, 36, 52].map((t) => t * TILE);
const TUSK_X = 632;
const TUSK_BOTTOM = 252; // where the hanging tusk's point is
const SKULL_L = 63 * TILE; // the skull's left face
const MEAT_X = [10, 58].map((t) => t * TILE + 8);
const MEAT_BOTTOM = 12 * TILE + 126;

/**
 * The Mammoth Boneyard. Three ways to open him up:
 *   - the ribs: a slam that lands at the foot of a standing rib jams his arm between the bones
 *     (the rib snaps when he tears free: three ribs). Later any stump holds his tusk.
 *   - the hanging tusk: three strokes on its sinew drop it. Under it, he is felled for twice as long.
 *   - the carcasses: whip one off its hook and he can't help himself: he goes to it and eats, his back to you.
 *   - and a leap that comes down against the skull leaves his horns stuck in it.
 * Second half: he breaks the spine (the high ribs fall and lie lower) and takes up the tusk:
 * a flat double swing, and a slam that throws a ring of ice shards.
 */
export class RimehideBones extends Rimehide {
  ribs: { x: number; s: Sprite; broken: boolean }[] = [];
  tusk: { s: Sprite; y: number; vy: number; hits: number; st: 'hang' | 'fall' | 'down' | 'gone' };
  meat: { x: number; y: number; vy: number; s: Sprite; st: 'hang' | 'fall' | 'down' | 'gone' }[] = [];
  constructor(g: Game) {
    super(g, 'yeti3');
    this.put('skull', SKULL_L + 44, this.floorY, 7);
    for (const x of RIB_X) this.ribs.push({ x, s: this.put('rib', x, this.floorY, 5), broken: false });
    this.tusk = { s: this.put('tusk', TUSK_X, TUSK_BOTTOM, 7), y: TUSK_BOTTOM, vy: 0, hits: 0, st: 'hang' };
    for (const x of MEAT_X) this.meat.push({ x, y: MEAT_BOTTOM, vy: 0, s: this.put('carcass', x, MEAT_BOTTOM, 7), st: 'hang' });
  }
  targets(): Target[] {
    const out = super.targets();
    if (this.tusk.st === 'hang') out.unshift({ id: 'sinew', x: TUSK_X, y: TUSK_BOTTOM - 112, r: 14 });
    this.meat.forEach((m, i) => m.st === 'hang' && out.unshift({ id: 'meat' + i, x: m.x, y: m.y - 44, r: 18 }));
    return out;
  }
  onProp(g: Game, t: Target) {
    if (t.id === 'sinew') {
      const k = this.tusk;
      k.hits++;
      g.audio.play('snap');
      g.fx.burst(t.x, t.y, 'blood', 3, 6, { speed: 1.5, grav: 0.1, life: 30 });
      if (k.hits >= 3) {
        k.st = 'fall';
        g.message('THE TUSK FALLS', 90);
      }
    } else {
      const m = this.meat[Number(t.id.slice(4))];
      m.st = 'fall';
      g.audio.play('snap');
    }
  }
  leapTo(x: number) {
    return clamp(x, 60, SKULL_L - 34);
  }
  arena(g: Game) {
    // the tusk, falling: it fells him if he is under it
    const k = this.tusk;
    if (k.st === 'fall') {
      k.vy = Math.min(k.vy + 0.4, 9);
      k.y += k.vy;
      const under = Math.abs(this.x - TUSK_X) < 50 && k.y > this.y - 40 && !this.held && this.pat !== 'leap' && this.pat !== 'enter';
      if (under) {
        k.st = 'down';
        k.y = this.floorY;
        g.audio.play('explode');
        this.hold(g, 'daze', 420, 'THE TUSK FELLS HIM: STRIKE', SEG * 2);
      } else if (k.y >= this.floorY) {
        k.st = 'down';
        k.y = this.floorY;
        g.audio.play('rumble');
        g.shake(5, 20);
        g.fx.burst(TUSK_X, this.floorY, 'flake', 10, 16, { vy: -1, life: 30, fade: true });
      }
      this.smite(g, { x: TUSK_X, y: k.y - 30, hw: 10, hh: 30 }, 'shot', 20);
      k.s.place(TUSK_X, k.y);
    }
    for (const m of this.meat) {
      if (m.st !== 'fall') continue;
      m.vy = Math.min(m.vy + 0.4, 8);
      m.y += m.vy;
      if (m.y >= this.floorY) {
        m.y = this.floorY;
        m.st = 'down';
        m.s.setFrame(this.propSheet.anims.carcass[1]);
        g.audio.play('squelch');
      }
      m.s.place(m.x, m.y);
    }
  }
  next(g: Game) {
    // meat on the floor comes before anything else
    if (this.meat.some((m) => m.st === 'down')) return this.pick('feast');
    const near = Math.abs(g.player.x - this.x) < 100;
    if (this.phase === 1) this.pick(near ? this.choose(['swipe', 'slam', 'slam']) : this.choose(['throw', 'leap', 'slam', 'leap']));
    else this.pick(near ? this.choose(['swipe', 'slam']) : this.choose(['leap', 'slam', 'swipe', 'leap']));
  }
  hurl(g: Game) {
    // a rib bone, spinning end over end
    const dx = g.player.x - this.x, time = (2 * 4.6) / 0.15 + 6;
    for (const off of this.phase === 2 ? [-1, 0, 1] : [0]) g.spawn(new EnemyShot(g, this.x + this.facing * 12, this.y - 56, clamp(dx / time, -6, 6) + off * 1.1, -4.6, 'bone', 16, 0.15));
  }
  onLand(g: Game) {
    if (this.x < SKULL_L - 50) return false;
    this.x = SKULL_L - 34;
    this.facing = 1;
    g.audio.play('explode');
    this.hold(g, 'wedged', 250, 'HIS HORNS ARE FAST IN THE SKULL: STRIKE');
    return true;
  }
  onSlam(g: Game, x: number) {
    const rib = this.ribs.find((r) => Math.abs(r.x - x) < 30 && (this.weapon || !r.broken));
    if (rib) {
      this.hold(g, 'wedged', 270, this.weapon ? 'THE TUSK IS JAMMED IN THE RIBS: STRIKE' : 'HIS ARM IS JAMMED IN THE RIBS: STRIKE');
      this.data.rib = rib;
      return;
    }
    if (!this.weapon) return;
    // the tusk on bare ice: a ring of shards
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      g.spawn(new EnemyShot(g, x, this.floorY - 10, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 'icicle', 12));
    }
    g.audio.play('glass');
  }
  freed(g: Game) {
    const rib = this.data.rib as { x: number; s: Sprite; broken: boolean } | undefined;
    if (rib && !rib.broken) {
      rib.broken = true;
      rib.s.setFrame(this.propSheet.anims.rib[1]);
      g.audio.play('snap');
      g.fx.burst(rib.x, this.floorY - 70, 'bone', 6, 16, { speed: 2.4, grav: 0.14, life: 50, rot: 0.3 });
    }
    for (const m of this.meat)
      if (m.st === 'down' && this.data.anim === 'eat') {
        m.st = 'gone';
        m.s.visible = false;
      }
  }
  enrage(g: Game) {
    // the spine goes: the high ribs drop to lie lower, and the tusk is in his fist
    const r = g.room;
    for (const [x0, x1] of [[31, 36], [42, 47]]) for (let x = x0; x <= x1; x++) {
      r.set(x, 14, '.');
      r.set(x - 2, 22, '=');
    }
    g.paintRoomTiles();
    for (const x of [540, 720]) g.fx.burst(x, 230, 'bone', 8, 30, { speed: 2, grav: 0.14, life: 70, rot: 0.3 });
    this.tusk.st = 'gone';
    this.tusk.s.visible = false;
    this.weapon = 'tusk';
  }
  special(g: Game): number {
    if (this.pat === 'feast') {
      // he goes to the meat, whatever she is doing
      const m = this.meat.find((q) => q.st === 'down');
      if (!m) {
        this.pick('walk');
        return frameLoop(this.A('idle'), g.frame, 8);
      }
      const stop = m.x + (this.x < m.x ? -44 : 44);
      this.facing = m.x < this.x ? -1 : 1;
      if (Math.abs(this.x - stop) > 3) this.x += Math.sign(stop - this.x) * 1.9;
      else this.hold(g, 'eat', 320, 'HE CANNOT HELP HIMSELF: STRIKE HIS BACK');
      return frameLoop(this.A('walk'), this.pt, 4);
    }
    return frameLoop(this.A('idle'), g.frame, 8);
  }
}
