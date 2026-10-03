import { Sprite } from '../gfx/view';
import { moveBody, Body } from '../world/room';
import { clamp, approach, sign, dist, rand } from '../core/util';
import { GRAVITY, MAX_FALL, TILE } from '../config';
import type { Game } from './game';
import { SUB_COST, ITEMS, DIFFICULTIES, WARD_COST } from './data';
import { HolyFlask, CrossProj, KnifeProj, ShieldDrop } from './objects';
import type { DmgType } from './ent';

const WALK = 1.65;
const RUN_MUL = 1.5; // hold RUN while moving to go this much faster than walking (armor counts as 0 meanwhile)
const ECHOES = 5; // fading afterimages trailing behind a run
const ECHO_EVERY = 5; // frames between afterimages
const JUMP_V = -7.1;
const LINKS = 12;
const SWING_G = 0.65; // pendulum gravity scale while hanging from a ring
const SWING_MAX_V = 3.6; // px/frame along the swing arc
const DANGLE_DMG = 0.15; // dangling chain is mostly for show: 15% of a normal strike
const DJUMP_V = -6.2; // second jump (Raven Mantle): ~60 px on its own, ~140 px with the first jump
const SLIDE_V = 4.4; // slide start speed (Frostrunner Greaves)
const SLIDE_MIN = 1.6; // speed while stuck sliding under a low ceiling
const SLIDE_HH = 7; // half height while sliding: 14 px fits under a one-tile gap
const STAND_HH = 18;
const SWIM_V = -2.4; // upward kick of one swim stroke (jump while in water, off the ground)
// experimental relics (0.4.0)
const GLIDE_FALL = 0.75; // Duskwing Shroud: top fall speed while gliding
const GLIDE_MUL = 1.2; // ...and a little extra speed through the air
const FREE_SWIM_V = 2.2; // Undertow Pearl: swim speed up/down while holding UP/DOWN
const WARD_TIME = 180; // Ashglass Ward: frames the bubble lasts (3 s)
const WARD_COOL = 60; // frames after it fades or pops before it can be raised again
const SLOW_MUL = 0.55; // walking speed while hexed by a Gloomcaster
const HOLD_TIME = 150; // a Gravehand lets go by itself after this many frames (2.5 s)
const FREE_GRACE = 60; // after breaking free, hands can't grab again for this long
// Frost Crawler ice trails: the longer she stands on one, the slower she gets, until she
// freezes solid. Only time on the ground counts, and in the air she moves at full speed.
const CHILL_MAX = 150; // frames on the ice (2.5 s) until she's frozen
const CHILL_SLOW = 0.8; // speed lost just before she freezes (she's down to 20%)
const CHILL_THAW = 2; // chill lost each frame she's off the ice (or in the air)
const ICE_MASH = 8; // presses to break out of the ice...
const ICE_TIME = 150; // ...or it cracks open by itself after this long
const TRIP_DOWN = 40; // frames she lies on her face after a Gravehand trips her...
const TRIP_UP = 14; // ...and frames to get back up
const BLOCK_PUSH = 2.6; // a blocked melee blow or lunge shoves her back this fast (it eases off)
// shield (off hand)
const GUARD_MUL = 0.15; // walking speed with the shield raised (85% slower)
const SHIELD_COOL = 90; // frames the shield can't be raised after a touch or magic hit gets through
const BLOCK_INVULN = 40; // grace after blocking a melee hit (a full hit gives 100)
/**
 * The directions each shield aim covers, in degrees from straight ahead (negative = up,
 * beyond -90 = up and behind). UP + a direction aims it diagonally, UP alone overhead.
 */
const GUARD_ARC = { level: [-30, 70], diag: [-80, 0], up: [-125, -55] } as const;
type GuardAim = keyof typeof GUARD_ARC;
// Throwing Knife: a quick flick of the wrist instead of a full throw
const KNIFE_RELEASE = 3;
const KNIFE_END = 9;
const KNIFE_MAX = 3; // knives in the air at once

type PState = 'normal' | 'attack' | 'hurt' | 'dash' | 'throw' | 'hang' | 'dead' | 'toot' | 'slide' | 'yank' | 'trip';

/**
 * Something that holds her in place (a Gravehand, a Devourer's bite). `released` is called
 * when she gets loose: `mashed` = she broke free by mashing, rather than it letting go.
 */
export interface Holder {
  released(mashed: boolean): void;
}
const TOOT_FRAMES = 60 * 60; // crouch perfectly still for 60 seconds...

export class Player implements Body {
  x = 0;
  y = 0;
  hw = 6;
  hh = 18;
  vx = 0;
  vy = 0;
  onGround = false;
  facing = 1;
  state: PState = 'normal';
  t = 0; // time in state
  animT = 0;
  crouch = false;
  invuln = 0;
  coyote = 0;
  jumpBuf = 0;
  atkDir = 0;
  atkStance = 'stand';
  dangle = false;
  flickCool = 0;
  throwLow = false; // the current sub-weapon throw started from a crouch
  throwSub = ''; // the sub-weapon being thrown (it can be switched mid-throw)
  crouchStill = 0; // frames spent crouching without touching anything else
  hitId = 0;
  lastSafe = { x: 0, y: 0 };
  inWater = false;
  landT = 0;
  sprite: Sprite;
  links: Sprite[] = [];
  tip: Sprite;
  chain: { x: number; y: number; px: number; py: number }[] = [];
  whipVisible = false;
  ring: { x: number; y: number } | null = null;
  ropeLen = 0;
  theta = 0;
  omega = 0;
  dropT = 0;
  spikeT = 0;
  djumped = false; // used the double jump since last touching the ground
  spin = 0; // 0..1 progress of the double-jump somersault (0 = not spinning)
  hitWall = false; // last move was stopped by a wall
  running = false; // holding RUN and a direction
  guarding = false; // shield raised (hold SHIELD)
  guardAim: GuardAim = 'level'; // where the shield points: UP + a direction = diag, UP alone = up
  shieldCool = 0; // frames before the shield can be raised again (a touch or magic hit knocked it down)
  shieldHitT = 0; // throttles the clank when something keeps hitting the shield
  webbed = false; // the slow comes from a spider's web (pale) rather than a hex (violet)
  /** Afterimages left behind while running: where each was dropped and how old it is. */
  echoes: { s: Sprite; x: number; y: number; frame: number; flip: boolean; age: number }[] = [];
  gliding = false; // Duskwing Shroud: holding jump while falling
  wardT = 0; // Ashglass Ward: frames left on the shield bubble (0 = down)
  wardCool = 0; // frames before the bubble can be raised again
  wardHitT = 0; // throttles the "blocked" sparks while something keeps touching the bubble
  slowT = 0; // frames left of a Gloomcaster's hex (slower walking)
  yankX = 0; // where a Hookjaw's chain is dragging her
  holdT = 0; // frames until the holder lets go by itself (0 = free): can't walk, jump or dash
  holdBy: Holder | null = null; // the hand or jaws that have her
  mashLeft = 0; // left/right/jump presses still needed to break free
  holdLock = false; // the holder also stops her attacking (a Devourer has her head)
  freeT = 0; // grace after breaking free of a grip
  pushV = 0; // shove from a blocked blow, added to her walking speed and easing off
  justBlocked = false; // the last takeDamage() call was a melee blow her shield blocked
  wings: Sprite; // drawn behind her while gliding
  bubble: Sprite; // the shield bubble
  shield: Sprite; // the raised shield, held in front of her
  iceBlock: Sprite; // the ice she's frozen in
  /** A Frost Crawler's trail is under her feet (set by IcePatch each frame, used up by update). */
  onIce = false;
  chill = 0; // frames of standing on ice, eased off when she's off it: slows her, then freezes her at CHILL_MAX
  /** What holds her when she's frozen solid (see freeze): breaking out shatters the ice. */
  private iceHold: Holder = {
    released: () => {
      const g = this.g;
      this.chill = 0;
      g.audio.play('glass');
      g.fx.burst(this.x, this.y, 'glass', 8, 10, { speed: 2, grav: 0.2, life: 28, tint: [0.8, 1, 1.4] });
    },
  };

  constructor(private g: Game) {
    this.wings = new Sprite(g.sheets.relicfx, g.view.sprites, 11);
    this.wings.visible = false;
    this.bubble = new Sprite(g.sheets.relicfx, g.view.sprites, 13);
    this.bubble.visible = false;
    this.shield = new Sprite(g.sheets.relicfx, g.view.sprites, 13);
    this.shield.visible = false;
    this.iceBlock = new Sprite(g.sheets.relicfx, g.view.sprites, 13);
    this.iceBlock.visible = false;
    this.sprite = new Sprite(g.sheets.hero, g.view.sprites, 12);
    for (let i = 0; i < ECHOES; i++) {
      const s = new Sprite(g.sheets.hero, g.view.sprites, 11);
      s.visible = false;
      this.echoes.push({ s, x: 0, y: 0, frame: 0, flip: false, age: 99 });
    }
    for (let i = 0; i < LINKS; i++) {
      const s = new Sprite(g.sheets.fx, g.view.sprites, 13);
      s.setFrame(g.sheets.fx.anims.link[0]);
      s.visible = false;
      this.links.push(s);
      this.chain.push({ x: 0, y: 0, px: 0, py: 0 });
    }
    this.tip = new Sprite(g.sheets.fx, g.view.sprites, 13);
    this.tip.visible = false;
  }

  get bottom() {
    return this.y + this.hh;
  }
  get alive() {
    return this.state !== 'dead';
  }

  setHeight(h: number) {
    if (h === this.hh) return;
    const bottom = this.bottom;
    this.hh = h;
    this.y = bottom - h;
  }

  place(x: number, bottom: number) {
    this.x = x;
    this.hh = STAND_HH;
    this.y = bottom - this.hh;
    this.vx = this.vy = 0;
    this.lastSafe = { x: this.x, y: this.y };
  }

  /** World position of the hand for the current frame. */
  hand(): [number, number] {
    const meta = this.g.sheets.hero.meta[this.sprite.frame];
    const ax = this.x, ay = this.bottom - 18;
    if (!meta) return [ax, ay - 6];
    return [ax + meta.hand[0] * this.facing, ay + meta.hand[1]];
  }

  set(state: PState) {
    this.state = state;
    this.t = 0;
  }

  update() {
    const g = this.g, inp = g.input, room = g.room;
    this.t++;
    this.animT++;
    if (this.invuln > 0) this.invuln--;
    if (this.landT > 0) this.landT--;
    if (this.wardHitT > 0) this.wardHitT--;
    if (this.slowT > 0) this.slowT--;
    if (this.wardCool > 0) this.wardCool--;
    if (this.shieldCool > 0) this.shieldCool--;
    if (this.shieldHitT > 0) this.shieldHitT--;
    if (this.wardT > 0 && --this.wardT === 0) {
      this.wardCool = WARD_COOL;
      g.audio.play('wardOff');
    }
    const wasWater = this.inWater;
    this.inWater = room.inWater(this.x, this.y + 4);
    if (this.inWater !== wasWater && Math.abs(this.vy) > 1 && room.water) {
      g.fx.burst(this.x, room.water!.y - 6, 'splash', 1, 0);
      g.audio.play('splash');
    }
    // Undertow Pearl: water doesn't slow her down, and she swims freely
    const freeSwim = this.inWater && g.hunter.swim;
    // Frost Crawler ice: standing on it chills her more and more; jumping keeps her free of it
    const iced = this.onIce && this.onGround && this.state !== 'dead';
    this.onIce = false;
    if (iced && this.holdT <= 0) {
      if (++this.chill >= CHILL_MAX) this.freeze();
    } else if (!this.frozen) this.chill = Math.max(0, this.chill - CHILL_THAW);
    const chillMul = this.onGround ? 1 - CHILL_SLOW * (this.chill / CHILL_MAX) : 1;
    const wmul = (this.inWater && !freeSwim ? 0.6 : 1) * (this.slowT > 0 ? SLOW_MUL : 1) * chillMul;
    const L = inp.down('left'), R = inp.down('right'), U = inp.down('up'), D = inp.down('down');
    const hdir = (R ? 1 : 0) - (L ? 1 : 0);

    // Shield: hold SHIELD to raise it (only in the normal state, so a whip or throw lowers it
    // for a moment). UP tilts it a little. A touch or magic hit knocks it down for a while.
    const wasGuarding = this.guarding;
    this.guarding = !!g.hunter.equip.shield && inp.down('shield') && this.shieldCool <= 0 && this.state === 'normal' && this.holdT <= 0;
    this.guardAim = this.guarding && U && !this.crouch ? (hdir ? 'diag' : 'up') : 'level';
    if (this.guarding && !wasGuarding) g.audio.play('shieldUp');
    if (inp.pressed('shield') && g.hunter.equip.shield && this.shieldCool > 0) g.audio.play('cancel');

    // Run: hold RUN while moving. It starts on the ground and carries into a jump;
    // letting go of RUN or the direction drops back to a walk. No running behind a shield.
    const startRun = !this.running && this.onGround;
    this.running = inp.down('run') && hdir !== 0 && !this.guarding && (this.running || this.onGround);
    if (this.running && startRun && this.state === 'normal' && !this.inWater) g.fx.burst(this.x - hdir * 6, this.bottom - 3, 'dust', 1, 0);

    if (this.state !== 'dead') {
      const cyc = (inp.pressed('subNext') ? 1 : 0) - (inp.pressed('subPrev') ? 1 : 0);
      if (cyc && g.hunter.cycleSub(cyc)) g.audio.play('menu');
      // Ashglass Ward: UP + SUB-WEAPON. That press is used up, so it doesn't also throw.
      if (U && inp.pressed('sub') && g.hunter.ward && this.state !== 'toot') {
        inp.consume('sub');
        this.raiseWard();
      }
    }

    if (inp.pressed('jump')) this.jumpBuf = 7;
    else if (this.jumpBuf > 0) this.jumpBuf--;
    if (this.freeT > 0) this.freeT--;
    if (this.holdT > 0) this.updateHold();
    if (this.onGround) {
      this.coyote = 6;
      this.djumped = false;
    } else if (this.coyote > 0) this.coyote--;
    if (this.spin > 0) this.spin = this.spin + 1 / 22 >= 1 ? 0 : this.spin + 1 / 22;

    let gravity = (this.inWater ? GRAVITY * 0.55 : GRAVITY);
    let maxFall = this.inWater ? 2.5 : MAX_FALL;
    if (freeSwim) {
      // with the pearl she barely sinks; UP/DOWN swim (see the normal state)
      gravity = GRAVITY * 0.2;
      maxFall = 1.2;
    }

    // Duskwing Shroud: holding jump while falling spreads the wings
    const glide = g.hunter.glide && this.state === 'normal' && !this.onGround && !this.inWater && inp.down('jump') && this.vy > 0;
    if (glide && !this.gliding) {
      g.audio.play('glide');
      this.spin = 0;
    }
    this.gliding = glide;
    if (glide) {
      gravity = GRAVITY * 0.3;
      maxFall = GLIDE_FALL;
    }

    switch (this.state) {
      case 'normal': {
        this.crouch = this.onGround && D && !this.inWater;
        this.setHeight(this.crouch ? 12 : 18);
        if (!this.crouch) {
          // aiming the shield up (UP, UP+LEFT, UP+RIGHT) plants her feet: the direction only aims
          const aimOnly = this.guarding && this.guardAim !== 'level';
          const target = aimOnly ? 0 : hdir * WALK * (this.running ? RUN_MUL : 1) * (this.guarding ? GUARD_MUL : 1) * (glide ? GLIDE_MUL : 1) * wmul;
          if (!this.onGround && Math.abs(this.vx) > Math.max(WALK, Math.abs(target)) + 0.1) {
            // keep swing / launch momentum in the air, steer gently
            this.vx = approach(this.vx, target, hdir && Math.sign(hdir) !== Math.sign(this.vx) ? 0.12 : 0.035);
          } else this.vx = target;
          if (hdir) this.facing = hdir;
        } else {
          this.vx = 0;
          if (hdir) this.facing = hdir;
        }
        // drop through one-way platforms
        if (this.crouch && this.jumpBuf > 0 && this.standingOnOneWay()) {
          this.jumpBuf = 0;
          this.dropT = 10;
          this.crouch = false;
          this.setHeight(18);
          this.y += 2;
        } else if (this.jumpBuf > 0 && this.coyote > 0) {
          this.vy = JUMP_V * (this.inWater && !freeSwim ? 0.85 : 1);
          this.jumpBuf = 0;
          this.coyote = 0;
          this.onGround = false;
          this.crouch = false;
          this.setHeight(18);
          g.audio.play('jump');
        } else if (inp.pressed('jump') && !this.onGround && this.inWater && room.water) {
          // swimming: jump strokes upward; with your head at the surface it's a full leap out
          // of the water (a little stronger than a jump, since you kick off the water)
          this.jumpBuf = 0;
          if (this.y - this.hh <= room.water.y + 6) {
            this.vy = JUMP_V * 1.1;
            g.audio.play('jump');
            g.fx.burst(this.x, room.water.y - 4, 'splash', 1, 0);
          } else {
            this.vy = Math.min(this.vy, SWIM_V * (freeSwim ? 1.4 : 1));
            g.audio.play('swim');
            g.fx.burst(this.x, this.bottom - 4, 'mote', 2, 4, { vy: -0.6, life: 30, fade: true });
          }
        } else if (inp.pressed('jump') && !this.onGround && g.hunter.doubleJump && !this.djumped && !this.inWater) {
          // Raven Mantle: one more jump in midair, with a somersault and a puff of feathers/snow
          this.djumped = true;
          this.jumpBuf = 0;
          this.vy = DJUMP_V;
          this.spin = 0.001;
          g.audio.play('djump');
          g.fx.burst(this.x, this.bottom, 'puff', 3, 5, { vy: 0.6, life: 20, fade: true });
        }
        if (!inp.down('jump') && this.vy < -2.5) this.vy = -2.5;
        if (freeSwim && (U || D) && !this.crouch) {
          // Undertow Pearl: hold UP or DOWN to swim that way
          this.vy = approach(this.vy, U ? -FREE_SWIM_V : FREE_SWIM_V, 0.25);
          if (this.animT % 20 === 0) g.fx.burst(this.x, this.y - 12, 'bubble', 1, 3, { vy: -0.8, life: 40, fade: true });
        }
        // easter egg timer: only "down" may be held, nothing else
        const still = this.crouch && !hdir && !U && !inp.down('jump') && !inp.down('attack') && !inp.down('sub') && !inp.down('dash');
        this.crouchStill = still ? this.crouchStill + 1 : 0;
        if (this.crouchStill >= TOOT_FRAMES) {
          this.crouchStill = 0;
          this.crouch = false;
          this.setHeight(18);
          this.set('toot');
        } else if (this.holdLock) {
          // a Devourer has her head: nothing but mashing helps
        } else if (inp.pressed('attack')) this.startAttack(U, D, hdir);
        else if (inp.pressed('sub')) this.startThrow();
        else if (inp.pressed('dash') && this.onGround && this.holdT <= 0) {
          if (g.hunter.slide && D && (!this.inWater || freeSwim)) this.startSlide();
          else {
            this.set('dash');
            this.vx = -this.facing * 3.6;
            g.audio.play('dash');
            g.fx.burst(this.x + this.facing * 4, this.bottom - 3, 'dust', 1, 0);
          }
        }
        break;
      }
      case 'slide': {
        // Frostrunner Greaves: a low, fast slide forward that slows down. It only ends where
        // there is room to stand, so you can't get stuck crouched inside a one-tile gap.
        const roomy = this.fits(STAND_HH);
        if (roomy && this.jumpBuf > 0) {
          this.set('normal'); // the buffered jump fires next frame
          break;
        }
        this.vx = approach(this.vx, 0, 0.13);
        const done = this.t > 20 || Math.abs(this.vx) < SLIDE_MIN || !this.onGround;
        if (done && roomy) {
          this.set('normal');
          break;
        }
        if (done) {
          // under a low ceiling: keep scooting; left/right picks the way, a wall turns you around
          if (hdir) this.facing = hdir;
          else if (this.hitWall) this.facing = -this.facing;
          this.vx = this.facing * SLIDE_MIN;
        }
        if (this.t % 4 === 0) g.fx.burst(this.x - this.facing * 8, this.bottom - 2, 'puff', 1, 2, { vx: -this.facing * 0.6, vy: -0.4, life: 16, fade: true });
        break;
      }
      case 'attack': {
        const wind = 6, strike = 8, rec = 7;
        if (this.onGround && this.atkStance !== 'air') this.vx = 0;
        else if (this.atkStance === 'air') {
          const target = hdir * WALK * wmul; // keep drifting but don't turn
          this.vx = Math.abs(this.vx) > WALK + 0.1 ? approach(this.vx, target, 0.035) : target;
          if (this.onGround) {
            // landed mid-swing: keep the swing, switch stance
            this.atkStance = this.atkDir === 4 || this.atkDir === 3 ? 'stand' : 'stand';
            if (this.atkDir === 4) this.atkDir = 0;
            if (this.atkDir === 3) this.atkDir = 0;
          }
        }
        if (!inp.down('jump') && this.vy < -2.5) this.vy = -2.5;
        if (this.t === wind) {
          g.audio.play('whip');
          this.hitId = g.newHitId();
        }
        if (this.t >= wind + strike && inp.down('attack') && !this.dangle && this.t === wind + strike) {
          this.dangle = true;
          // seed the dangling chain from the strike line
          for (const c of this.chain) {
            c.px = c.x;
            c.py = c.y;
          }
        }
        if (this.dangle) {
          if (!inp.down('attack')) {
            this.dangle = false;
            this.set('normal');
          } else {
            if (this.onGround) this.vx = 0;
            if (this.jumpBuf > 0 && this.coyote > 0) {
              this.vy = JUMP_V;
              this.jumpBuf = 0;
              this.atkStance = 'air';
            }
            if (this.t % 14 === 0) this.hitId = g.newHitId();
          }
        } else if (this.t >= wind + strike + rec) this.set('normal');
        break;
      }
      case 'throw': {
        if (this.onGround) this.vx = 0;
        // the knife is a flick of the wrist: it leaves sooner and she recovers sooner
        const quick = this.throwSub === 'sub_knife';
        if (this.t === (quick ? KNIFE_RELEASE : 7)) this.releaseSub();
        if (this.t >= (quick ? KNIFE_END : 16)) this.set('normal');
        break;
      }
      case 'dash': {
        this.vx = approach(this.vx, 0, 0.18);
        if (inp.pressed('attack')) this.startAttack(U, D, hdir);
        else if (this.t > 16 || !this.onGround) this.set('normal');
        break;
      }
      case 'hurt': {
        if (this.t > 24 && this.onGround) this.set('normal');
        else if (this.t > 40) this.set('normal');
        break;
      }
      case 'yank': {
        // dragged along by a Hookjaw's chain until she reaches it (or hits something)
        const dx = this.yankX - this.x;
        this.vx = clamp(dx * 0.18, -5, 5);
        if (Math.abs(dx) < 6 || this.t > 40 || (this.hitWall && this.t > 2)) {
          this.vx *= 0.3;
          this.set('normal');
        }
        break;
      }
      case 'hang': {
        this.updateHang(hdir, U, D);
        this.tickEchoes(); // let any afterimages fade while swinging
        return;
      }
      case 'dead': {
        this.vx = approach(this.vx, 0, 0.1);
        break;
      }
      case 'toot':
        this.updateToot();
        break;
      case 'trip': {
        // tripped by a Gravehand: pitched forward onto her face, then up again
        if (this.onGround) this.vx = approach(this.vx, 0, 0.15);
        if (this.t > TRIP_DOWN + TRIP_UP && this.onGround) this.set('normal');
        break;
      }
    }

    // a blocked blow's shove, on top of whatever she's doing on her feet
    if (this.pushV) {
      if (this.state === 'normal' || this.state === 'attack' || this.state === 'throw') this.vx += this.pushV;
      this.pushV = Math.abs(this.pushV) < 0.1 ? 0 : this.pushV * 0.86;
    }

    // held by a Gravehand or a Devourer: rooted to the spot, knockback included
    if (this.holdT > 0) {
      this.vx = 0;
      this.vy = Math.max(this.vy, 0);
    }

    // physics
    this.vy = Math.min(this.vy + gravity, maxFall);
    if (this.dropT > 0) this.dropT--;
    const wasGround = this.onGround;
    const r = moveBody(room, this, true, this.dropT > 0);
    this.hitWall = r.hitX;
    if (r.landed && !wasGround) {
      g.audio.play('land');
      if (this.state === 'trip') {
        // face-first into the floor
        g.fx.burst(this.x + this.facing * 8, this.bottom - 2, 'dust', 4, 10, { speed: 1.4 });
        g.shake(2, 6);
      }
      if (this.state === 'normal') this.landT = 5;
    }
    // remember a safe spot for spike/pit recovery
    if (this.onGround && this.state === 'normal' && !this.onSpikesBelow()) {
      const tx = Math.floor(this.x / TILE), ty = Math.floor((this.bottom + 1) / TILE);
      if (room.solidAt(tx - 1, ty) && room.solidAt(tx + 1, ty)) this.lastSafe = { x: this.x, y: this.y };
      else if (room.floorAt(tx, ty)) this.lastSafe = { x: this.x, y: this.y };
    }
    this.checkSpikes();
    this.updateWhip();
    this.tickEchoes();
  }

  /** The 60-second-crouch easter egg: strain, toot, hop, then fan the air. */
  updateToot() {
    const g = this.g, inp = g.input;
    this.vx = 0;
    const back = this.x - this.facing * 7, low = this.bottom - 12;
    const gas = (n: number, spread: number) =>
      g.fx.burst(back, low, 'smoke', n, spread, {
        vx: -this.facing * 0.5, vy: -0.25, fps: 5, life: 80, fade: true, drag: 0.97, tint: [0.75, 1.15, 0.35],
      });
    if (this.t === 18) {
      g.audio.play('fart');
      g.shake(1.5, 10);
      gas(6, 5);
      g.damageNumber(this.x, this.y - 26, 'PFFT!', '#a8e060');
    }
    if (this.t > 18 && this.t < 60 && this.t % 7 === 0) gas(1, 3);
    if (this.t === 24 && this.onGround) this.vy = -2.6; // startled little hop
    // fanning lasts a couple of seconds; any action cancels it early
    const busy = inp.pressed('attack') || inp.pressed('jump') || inp.pressed('sub') || inp.pressed('dash');
    if (this.t > 150 || (this.t > 60 && busy)) this.set('normal');
  }

  startSlide() {
    const g = this.g;
    this.crouch = false;
    this.set('slide');
    this.setHeight(SLIDE_HH);
    this.vx = this.facing * SLIDE_V;
    g.audio.play('slide');
    g.fx.burst(this.x - this.facing * 6, this.bottom - 3, 'puff', 2, 3, { vx: -this.facing, life: 18, fade: true });
  }

  /** True if a body `hh` half-tall, standing on the current feet, overlaps no solid tile. */
  fits(hh: number) {
    const room = this.g.room;
    const l = Math.floor((this.x - this.hw) / TILE), r = Math.floor((this.x + this.hw - 0.01) / TILE);
    const t = Math.floor((this.bottom - hh * 2) / TILE), b = Math.floor((this.bottom - 0.01) / TILE);
    for (let y = t; y <= b; y++) for (let x = l; x <= r; x++) if (room.blocks(x, y, this.bottom)) return false;
    return true;
  }

  standingOnOneWay() {
    const room = this.g.room;
    const ty = Math.floor((this.bottom + 1) / TILE);
    const l = Math.floor((this.x - this.hw) / TILE), r = Math.floor((this.x + this.hw - 0.01) / TILE);
    let one = false;
    for (let tx = l; tx <= r; tx++) {
      if (room.solidAt(tx, ty)) return false;
      if (room.oneWayAt(tx, ty)) one = true;
    }
    return one;
  }

  onSpikesBelow() {
    const room = this.g.room;
    const ty = Math.floor((this.bottom + 2) / TILE);
    return room.tile(Math.floor(this.x / TILE), ty) === '^';
  }

  checkSpikes() {
    const g = this.g, room = g.room;
    if (this.state === 'dead') return;
    const ty = Math.floor((this.bottom - 2) / TILE);
    const l = Math.floor((this.x - this.hw) / TILE), r = Math.floor((this.x + this.hw - 0.01) / TILE);
    let spike = false;
    for (let tx = l; tx <= r; tx++) if (room.tile(tx, ty) === '^') spike = true;
    if (!spike) return;
    g.audio.play('spike');
    this.invuln = 0;
    const dead = this.takeDamage(20, this.x - this.facing, true, false);
    if (!dead) {
      g.fadeFlash = 12;
      this.x = this.lastSafe.x;
      this.y = this.lastSafe.y;
      this.vx = this.vy = 0;
      this.set('normal');
      this.invuln = 90;
    }
  }

  startAttack(U: boolean, D: boolean, hdir: number) {
    if (hdir) this.facing = hdir;
    const air = !this.onGround;
    let dir = 0;
    if (U && hdir) dir = 1;
    else if (U) dir = 2;
    else if (D && air && hdir) dir = 3;
    else if (D && air) dir = 4;
    this.atkDir = dir;
    this.atkStance = air ? 'air' : this.crouch || (D && !air) ? 'crouch' : 'stand';
    if (this.atkStance === 'crouch') {
      this.atkDir = 0;
      this.setHeight(12);
    } else this.setHeight(18);
    if (this.atkStance === 'stand' && dir >= 3) this.atkDir = 0;
    this.dangle = false;
    this.set('attack');
  }

  /** Spend hearts for the selected sub-weapon. Returns false if it can't be thrown right now. */
  paySub() {
    const h = this.g.hunter;
    if (!h.sub) return false;
    const cost = SUB_COST[h.sub] || 1;
    if (h.hearts < cost) {
      this.g.audio.play('cancel');
      return false;
    }
    if (h.sub === 'sub_cross' && this.g.ents.filter((e) => e instanceof CrossProj).length >= 2) return false;
    if (h.sub === 'sub_knife' && this.g.ents.filter((e) => e instanceof KnifeProj).length >= KNIFE_MAX) return false;
    h.hearts -= cost;
    return true;
  }

  startThrow() {
    if (!this.paySub()) return;
    // a throw from a crouch keeps her crouched (and her smaller hitbox), like a crouching whip
    this.throwLow = this.crouch;
    this.throwSub = this.g.hunter.sub;
    this.setHeight(this.throwLow ? 12 : 18);
    this.set('throw');
  }

  /** Spawn the sub-weapon projectile, from the throwing hand unless a spawn point is given. */
  releaseSub(sx?: number, sy?: number) {
    const g = this.g, h = g.hunter;
    const [hx, hy] = sx !== undefined && sy !== undefined ? [sx, sy] : this.hand();
    g.audio.play('throw');
    if (h.sub === 'sub_holy') g.spawn(new HolyFlask(g, hx, hy - 4, this.facing));
    else if (h.sub === 'sub_cross') {
      g.spawn(new CrossProj(g, hx, hy, this.facing));
      g.audio.play('cross');
    } else if (h.sub === 'sub_knife') g.spawn(new KnifeProj(g, hx, hy - 2, this.facing));
  }

  // ------------------------------------------------------------- whip

  whipAngle() {
    const a = [0, -45, -90, 45, 90][this.atkDir] * (Math.PI / 180);
    return { dx: Math.cos(a) * this.facing, dy: Math.sin(a) };
  }

  updateWhip() {
    const g = this.g;
    const [hx, hy] = this.hand();
    const L = g.hunter.whipLen;
    this.whipVisible = false;
    if (this.state === 'attack') {
      const wind = 6, strike = 8;
      const { dx, dy } = this.whipAngle();
      if (this.t < wind) {
        // trailing behind the shoulder
        this.whipVisible = true;
        const back = Math.atan2(-0.9, -this.facing * 0.6);
        for (let i = 0; i < LINKS; i++) {
          const a = back + (i / LINKS) * 1.4 * this.facing;
          const d = (i + 1) * (L / LINKS) * 0.45;
          this.chain[i].x = hx + Math.cos(a) * d;
          this.chain[i].y = hy + Math.sin(a) * d + i * 0.4;
        }
      } else if (this.t < wind + strike && !this.dangle) {
        this.whipVisible = true;
        const k = this.t - wind;
        const ext = Math.min(1, (k + 1) / 3);
        for (let i = 0; i < LINKS; i++) {
          const f = ((i + 1) / LINKS) * ext;
          const sag = Math.sin(f * Math.PI) * (k < 3 ? 6 : 1.5);
          this.chain[i].x = hx + dx * L * f - dy * sag * this.facing * 0;
          this.chain[i].y = hy + dy * L * f + sag * (Math.abs(dx) > 0.5 ? 1 : 0);
        }
        if (k >= 1 && k <= 6) this.whipHits(1, 'whip');
        if (k === 2) this.tryGrapple(hx, hy, dx, dy, L);
      } else if (this.dangle) {
        this.whipVisible = true;
        this.simDangle(hx, hy, L);
        this.whipHits(DANGLE_DMG, 'dangle');
      }
    } else if (this.state === 'hang' && this.ring) {
      this.whipVisible = true;
      for (let i = 0; i < LINKS; i++) {
        const f = (i + 1) / LINKS;
        this.chain[i].x = hx + (this.ring.x - hx) * f;
        this.chain[i].y = hy + (this.ring.y - hy) * f;
      }
    }
  }

  simDangle(hx: number, hy: number, L: number) {
    const inp = this.g.input;
    // A freshly pressed direction flicks the chain once; holding it does nothing,
    // so gravity always wins and the chain flops back down.
    if (this.flickCool > 0) this.flickCool--;
    const fx = (inp.pressed('right') ? 1 : 0) - (inp.pressed('left') ? 1 : 0);
    const fy = (inp.pressed('down') ? 1 : 0) - (inp.pressed('up') ? 1 : 0);
    const flick = (fx || fy) && this.flickCool === 0;
    if (flick) {
      this.flickCool = 12;
      this.g.audio.play('whip');
      this.hitId = this.g.newHitId();
    }
    const seg = L / LINKS;
    for (let i = 0; i < LINKS; i++) {
      const c = this.chain[i];
      const vx = (c.x - c.px) * 0.92, vy = (c.y - c.py) * 0.92;
      c.px = c.x;
      c.py = c.y;
      c.x += vx;
      c.y += vy + 0.45;
      if (flick) {
        // give the outer links a burst of velocity (Verlet: shift the previous position)
        const n = Math.hypot(fx, fy), k = 15 * ((i + 1) / LINKS);
        c.px -= (fx / n) * k;
        c.py -= (fy / n) * k;
      }
    }
    for (let it = 0; it < 4; it++) {
      let ax = hx, ay = hy;
      for (let i = 0; i < LINKS; i++) {
        const c = this.chain[i];
        const ddx = c.x - ax, ddy = c.y - ay;
        const d = Math.hypot(ddx, ddy) || 1;
        const k = (d - seg) / d;
        if (i === 0) {
          c.x -= ddx * k;
          c.y -= ddy * k;
        } else {
          const p = this.chain[i - 1];
          c.x -= ddx * k * 0.5;
          c.y -= ddy * k * 0.5;
          p.x += ddx * k * 0.5;
          p.y += ddy * k * 0.5;
        }
        ax = c.x;
        ay = c.y;
      }
    }
  }

  whipHits(mul: number, kind: 'whip' | 'dangle') {
    const g = this.g;
    const pts: [number, number][] = [];
    for (let i = 2; i < LINKS; i++) pts.push([this.chain[i].x, this.chain[i].y]);
    const base = g.hunter.atk * mul;
    g.attackPoints(pts, kind === 'whip' ? 7 : 5, this.hitId, base, this.x, kind);
    this.breakTouchedTiles();
  }

  /**
   * Breakable stones: any contact with the chain breaks them, strike or dangle.
   * We walk every segment from the hand to the tip in 3px steps and test a small
   * cross around each point (the chain is a few pixels thick), so a strike that
   * sweeps through several blocks breaks all of them.
   */
  breakTouchedTiles() {
    const g = this.g, room = g.room;
    const [hx, hy] = this.hand();
    const found = new Set<string>();
    let ax = hx, ay = hy;
    for (const c of this.chain) {
      const steps = Math.max(1, Math.ceil(Math.hypot(c.x - ax, c.y - ay) / 3));
      for (let s = 1; s <= steps; s++) {
        const px = ax + ((c.x - ax) * s) / steps, py = ay + ((c.y - ay) * s) / steps;
        for (const [ox, oy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) {
          const tx = Math.floor((px + ox) / TILE), ty = Math.floor((py + oy) / TILE);
          if (room.tile(tx, ty) === 'B') found.add(`${tx},${ty}`);
        }
      }
      ax = c.x;
      ay = c.y;
    }
    for (const k of found) {
      const [tx, ty] = k.split(',').map(Number);
      g.breakTile(tx, ty);
    }
  }

  tryGrapple(hx: number, hy: number, dx: number, dy: number, L: number) {
    const g = this.g;
    if (!g.hunter.grapple) return;
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const r of g.rings) {
      const d = dist(hx, hy, r.x, r.y);
      if (d > L + 32 || d < 8) continue;
      const ux = (r.x - hx) / d, uy = (r.y - hy) / d;
      const dot = ux * dx + uy * dy;
      if (d > 30 && dot < Math.cos((48 * Math.PI) / 180)) continue;
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    if (!best) return;
    this.ring = best;
    const ax = this.x, ay = this.y - 24; // hanging hand point
    this.ropeLen = clamp(Math.hypot(ax - best.x, ay - best.y), 8, L + 16);
    this.theta = Math.atan2(ax - best.x, ay - best.y);
    // carry momentum into the swing
    const tvx = Math.cos(this.theta), tvy = -Math.sin(this.theta);
    this.omega = clamp((this.vx * tvx + this.vy * tvy) / this.ropeLen, -0.12, 0.12);
    this.set('hang');
    this.dangle = false;
    this.djumped = false; // catching a ring gives the double jump back
    this.spin = 0;
    this.setHeight(18);
    g.audio.play('grapple');
    g.fx.burst(best.x, best.y, 'spark', 1, 0);
  }

  updateHang(hdir: number, U: boolean, D: boolean) {
    const g = this.g, inp = g.input, ring = this.ring!;
    const HAND_DY = 24; // body center sits this far below the hand
    const Lr = this.ropeLen;
    // angular pendulum: theta measured from straight down, + to the right
    // SWING_G < 1 gives a slow, weighty arc; pumping with left/right adds a little energy
    let alpha = -(GRAVITY / Math.max(Lr, 10)) * Math.sin(this.theta) * SWING_G;
    if (hdir) {
      const moving = Math.sign(this.omega) || hdir;
      if (moving === hdir) alpha += hdir * 0.0016;
      else alpha += hdir * 0.0008;
    }
    this.omega = (this.omega + alpha) * 0.995;
    // cap the speed along the arc so short ropes can't whip around
    const maxW = SWING_MAX_V / Math.max(Lr, 10);
    this.omega = clamp(this.omega, -maxW, maxW);
    const oldT = this.theta;
    this.theta += this.omega;
    if (Math.abs(this.theta) > 1.65) {
      this.theta = Math.sign(this.theta) * 1.65;
      this.omega *= -0.2;
    }
    if (U) this.ropeLen = Math.max(8, this.ropeLen - 1.5);
    if (D) this.ropeLen = Math.min(g.hunter.whipLen + 16, this.ropeLen + 1.5);
    const ox = this.x, oy = this.y;
    this.x = ring.x + Math.sin(this.theta) * this.ropeLen;
    this.y = ring.y + Math.cos(this.theta) * this.ropeLen + HAND_DY;
    if (this.overlapsSolid()) {
      // try keeping only the rope-length change, then give up and bounce
      this.theta = oldT;
      this.omega *= -0.3;
      this.x = ring.x + Math.sin(this.theta) * this.ropeLen;
      this.y = ring.y + Math.cos(this.theta) * this.ropeLen + HAND_DY;
      if (this.overlapsSolid()) {
        this.x = ox;
        this.y = oy;
        this.ropeLen = Lr;
      }
    }
    // tangential velocity (used for release + animation)
    const v = this.omega * this.ropeLen;
    this.vx = Math.cos(this.theta) * v;
    this.vy = -Math.sin(this.theta) * v;
    this.facing = this.omega > 0.004 ? 1 : this.omega < -0.004 ? -1 : this.facing;
    this.updateWhip();
    if (inp.pressed('jump')) {
      this.ring = null;
      this.set('normal');
      const boost = U ? 9.4 : 7.6;
      this.vy = Math.max(Math.min(this.vy, 0) * 0.6 - boost, -11);
      this.vx = clamp(this.vx * 1.35, -4.6, 4.6);
      this.jumpBuf = 0;
      g.audio.play('jump');
    } else if (inp.pressed('attack') || inp.pressed('dash')) {
      this.ring = null;
      this.set('normal');
    } else if (inp.pressed('sub') && this.paySub()) {
      // throw without letting go: aim with left/right, otherwise throw the way you're swinging
      if (hdir) this.facing = hdir;
      this.releaseSub(this.x + this.facing * 6, this.y - 6);
    }
    this.checkSpikes();
  }

  overlapsSolid() {
    const room = this.g.room;
    const l = Math.floor((this.x - this.hw) / TILE), r = Math.floor((this.x + this.hw - 0.01) / TILE);
    const t = Math.floor((this.y - this.hh) / TILE), b = Math.floor((this.y + this.hh - 0.01) / TILE);
    for (let y = t; y <= b; y++) for (let x = l; x <= r; x++) if (room.blocks(x, y, this.y + this.hh)) return true;
    return false;
  }

  // ------------------------------------------------------------- damage

  /**
   * Returns true if the hit killed the player. Enemy hits are scaled by the difficulty;
   * spikes (fromEnemy = false) are not. While running, armor doesn't count: that's the
   * price of the speed.
   *
   * `type` says what the raised shield does (see DmgType): melee blows from the side it
   * faces are cut by the shield's block value, shots from that side are stopped, and touch
   * or magic hits go straight through and knock the shield down for a while. (fromX, fromY)
   * is where the hit came from.
   */
  takeDamage(raw: number, fromX: number, ignoreInvuln = false, fromEnemy = true, type: DmgType = 'touch', fromY = this.y) {
    const g = this.g, h = g.hunter;
    this.justBlocked = false;
    if (this.state === 'dead') return true;
    if (!ignoreInvuln && this.invuln > 0) return false;
    if (fromEnemy && this.wardT > 0) {
      // the Ashglass Ward turns every blow from a monster (but not spikes)
      this.blockHit(fromX, this.y);
      return false;
    }
    const faced = fromEnemy && this.shieldFaces(fromX - this.x, fromY - this.y);
    if (faced && type === 'shot') {
      this.shieldClank(fromY);
      return false;
    }
    const blocked = faced && type === 'melee';
    if (fromEnemy && (type === 'touch' || type === 'magic') && h.equip.shield) {
      if (this.guarding) g.audio.play('shieldDown');
      if (this.shieldCool <= 0) this.dropShield(fromX);
      this.guarding = false;
      this.shieldCool = SHIELD_COOL;
    }
    const mul = fromEnemy ? (DIFFICULTIES[h.difficulty] || DIFFICULTIES[0]).dmg : 1;
    const def = this.running ? 0 : h.def;
    let dmg = Math.max(1, Math.round(raw * mul * (0.9 + Math.random() * 0.2) - def * 0.55));
    if (blocked) dmg = Math.max(1, Math.round(dmg * (1 - h.block)));
    h.hp -= dmg;
    g.damageNumber(this.x, this.y - 20, dmg, blocked ? '#c8c8d8' : '#ff5060');
    if (blocked) {
      this.shieldClank(fromY);
      g.shake(1.5, 6);
    } else {
      g.audio.play('hurt');
      g.shake(3, 8);
    }
    this.ring = null;
    this.dangle = false;
    if (this.frozen) {
      // the blow shatters the ice she was frozen in
      this.holdT = 0;
      this.holdBy = null;
      this.holdLock = false;
      this.freeT = FREE_GRACE;
      this.iceHold.released(false);
    }
    if (h.hp <= 0) return this.die(fromX);
    if (this.state === 'slide' && !this.fits(STAND_HH)) {
      this.invuln = 100; // no knockback inside a low gap: standing up there would wedge her in the ceiling
      return false;
    }
    if (blocked) {
      // she keeps her footing behind the shield, but the blow shoves her back (the attacker
      // learns it was blocked through justBlocked, and stops its lunge)
      if (!h.noKnock) this.pushV = (this.x < fromX ? -1 : 1) * BLOCK_PUSH;
      this.invuln = BLOCK_INVULN;
      this.justBlocked = true;
      return false;
    }
    if (h.noKnock) {
      // Rootstone: the hit lands, but she keeps her footing and her control
      // (a hit still shakes her off a grapple ring, like any other)
      if (this.state === 'hang') this.set('normal');
      this.invuln = 100;
      return false;
    }
    this.set('hurt');
    this.setHeight(18);
    const dir = this.x < fromX ? -1 : 1;
    this.facing = -dir;
    this.vx = dir * 1.9;
    this.vy = -3.6;
    this.invuln = 100;
    return false;
  }

  /** Out of HP: she falls. Always returns true (takeDamage's "it killed her"). */
  die(fromX: number) {
    const g = this.g;
    g.hunter.hp = 0;
    this.holdT = 0;
    this.holdBy = null;
    this.holdLock = false;
    this.set('dead');
    this.vx = -sign(fromX - this.x || 1) * 1.2;
    this.vy = -3;
    g.audio.play('death');
    g.onPlayerDeath();
    return true;
  }
  /**
   * Damage that leaves her where she is: no knockback, no grace, the shield doesn't help
   * (a Devourer's bite, the fall from a trip). Scaled by the difficulty like any enemy hit.
   */
  chew(raw: number) {
    const g = this.g, h = g.hunter;
    if (this.state === 'dead') return;
    const mul = (DIFFICULTIES[h.difficulty] || DIFFICULTIES[0]).dmg;
    const dmg = Math.max(1, Math.round(raw * mul * (0.9 + Math.random() * 0.2) - h.def * 0.55));
    h.hp -= dmg;
    g.damageNumber(this.x, this.y - 20, dmg, '#ff5060');
    g.audio.play('hurt');
    g.shake(2, 6);
    if (h.hp <= 0) this.die(this.x - this.facing);
  }
  /** The shield is knocked out of her hand: it tumbles to the floor and blinks away (see ShieldDrop). */
  dropShield(fromX: number) {
    const g = this.g, id = g.hunter.equip.shield;
    if (!id) return;
    const look = ITEMS[id].look || 'wood';
    const away = this.x < fromX ? -1 : 1;
    const b = this.shieldBox();
    g.spawn(new ShieldDrop(g, b.x, b.y, away, g.sheets.relicfx.anims[`shield_${look}`][0], this.facing < 0));
  }

  // ------------------------------------------------------------- experimental relics and enemy effects

  /** Ashglass Ward: spend hearts to raise the shield bubble. */
  raiseWard() {
    const g = this.g, h = g.hunter;
    if (this.wardT > 0 || this.wardCool > 0) return;
    if (h.hearts < WARD_COST) {
      g.audio.play('cancel');
      return;
    }
    h.hearts -= WARD_COST;
    this.wardT = WARD_TIME;
    g.audio.play('ward');
    g.fx.burst(this.x, this.y, 'star', 10, 14, { vy: -0.4, life: 30, fade: true, glow: 1, tint: [0.7, 0.9, 1.4] });
  }
  /** Something bounced off the bubble: sparks where it struck (throttled, since contact repeats every frame). */
  blockHit(fromX: number, fromY: number) {
    if (this.wardHitT > 0) return;
    this.wardHitT = 10;
    const a = Math.atan2(fromY - this.y, fromX - this.x);
    this.g.fx.burst(this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 20, 'spark', 1, 2);
    this.g.audio.play('wardHit');
    this.g.shake(1, 4);
  }
  /** A Gloomcaster's hex shatters the bubble outright. A moment of grace follows. */
  popWard() {
    const g = this.g;
    this.wardT = 0;
    this.wardCool = WARD_COOL;
    this.invuln = 30;
    g.audio.play('wardPop');
    g.fx.burst(this.x, this.y, 'glass', 8, 18, { speed: 1.5, grav: 0.1, life: 30 });
    g.shake(2, 8);
  }
  /** A Gloomcaster's hex slows her down for a while. */
  hex(frames: number) {
    this.slowT = Math.max(this.slowT, frames);
    this.webbed = false;
  }
  /** Frozen solid in a block of ice (too long on a Frost Crawler's trail). */
  get frozen() {
    return this.holdBy === this.iceHold && this.holdT > 0;
  }
  /** The chill took her: she's locked in ice until she mashes out or it cracks open. */
  freeze() {
    if (!this.grab(this.iceHold, ICE_MASH, ICE_TIME, true)) return;
    this.g.audio.play('glass');
    this.g.fx.burst(this.x, this.y, 'flake', 6, 10, { vy: -0.4, life: 30, fade: true });
  }
  /** A Gallows Spider's web glob: the same slow as a hex, but sticky white instead of violet. */
  web(frames: number) {
    if (this.slowT > frames && !this.webbed) return; // a longer hex is already on
    this.slowT = Math.max(this.slowT, frames);
    this.webbed = true;
  }

  // ------------------------------------------------------------- shield

  /**
   * True if the raised shield faces something coming from direction (dx, dy), measured
   * from her toward it (see GUARD_ARC for what each aim covers).
   */
  shieldFaces(dx: number, dy: number) {
    if (!this.guarding || this.state !== 'normal') return false;
    const a = (Math.atan2(dy, dx * this.facing) * 180) / Math.PI; // 0 = ahead, -90 = overhead
    const [lo, hi] = GUARD_ARC[this.guardAim];
    return a >= lo && a <= hi;
  }
  /** The raised shield, as a box in front of her (shots that touch it are stopped). */
  shieldBox() {
    const x = this.x + this.facing * 9, cy = this.bottom - 18;
    if (this.guardAim === 'up') return { x: this.x + this.facing * 2, y: cy - 22, hw: 10, hh: 4 };
    if (this.guardAim === 'diag') return { x: x - this.facing, y: cy - 13, hw: 7, hh: 6 };
    if (this.crouch) return { x, y: this.bottom - 9, hw: 4, hh: 8 };
    return { x, y: cy - 1, hw: 4, hh: 10 };
  }
  /** Something struck the shield: a clank and sparks (throttled, since contact can repeat). */
  shieldClank(fromY: number) {
    if (this.shieldHitT > 0) return;
    this.shieldHitT = 8;
    const b = this.shieldBox();
    const sx = b.x + this.facing * b.hw, sy = clamp(fromY, b.y - b.hh, b.y + b.hh);
    this.g.fx.burst(sx, sy, 'spark', 2, 3);
    this.g.audio.play('block');
  }
  /**
   * Something seizes her: a Gravehand's fist around her ankles, or a Devourer's jaws (`bite`).
   * She can't walk, jump or dash until she mashes LEFT, RIGHT or JUMP `presses` times, or the
   * holder lets go by itself after `time` frames. A Gravehand leaves her arms free; a bite
   * doesn't. Returns false if it didn't take (warded, just broke free, already held, or in a
   * state that can't be held; a hand also needs her on the ground).
   */
  grab(by: Holder, presses: number, time = HOLD_TIME, bite = false) {
    const g = this.g;
    if (this.holdT > 0 || this.freeT > 0 || this.state === 'dead') return false;
    if (!bite && !this.onGround) return false;
    const ok = ['normal', 'attack', 'throw', 'dash', ...(bite ? ['yank', 'hurt'] : [])];
    if (!ok.includes(this.state)) return false;
    if (this.wardT > 0) {
      this.blockHit(this.x, bite ? this.y - 10 : this.bottom);
      return false;
    }
    if (this.state !== 'normal') this.set('normal');
    this.holdT = Math.round(time);
    this.holdBy = by;
    this.mashLeft = Math.max(1, Math.round(presses));
    this.holdLock = bite;
    this.guarding = false;
    this.crouch = false;
    this.setHeight(STAND_HH);
    this.vx = 0;
    this.pushV = 0;
    this.running = false;
    this.jumpBuf = 0;
    g.audio.play('hurt');
    g.shake(1.5, 6);
    return true;
  }
  /** Counts the grip down and the mashing up. Every LEFT, RIGHT or JUMP press counts as one. */
  updateHold() {
    const g = this.g, inp = g.input;
    this.holdT--;
    this.jumpBuf = 0; // a held hero can't jump (but trying shakes the grip loose)
    const hop = inp.pressed('jump');
    const presses = (inp.pressed('left') ? 1 : 0) + (inp.pressed('right') ? 1 : 0) + (hop ? 1 : 0);
    if (presses) {
      this.mashLeft -= presses;
      g.fx.burst(this.x + rand(-4, 4), this.holdLock ? this.y - 12 : this.bottom - 2, this.holdLock ? 'spark' : 'dust', 1, 3);
    }
    if (this.state === 'dead') this.holdT = 0;
    const mashed = this.mashLeft <= 0;
    if (this.holdT > 0 && !mashed) return;
    const by = this.holdBy;
    this.holdT = 0;
    this.holdBy = null;
    this.holdLock = false;
    this.freeT = FREE_GRACE;
    if (mashed && hop && this.state !== 'dead') {
      this.vy = JUMP_V * 0.7; // kicks free with a little hop
      this.onGround = false;
      g.audio.play('jump');
    }
    g.fx.burst(this.x, this.bottom - 2, 'dust', 4, 8, { speed: 1.6 });
    by?.released(mashed && this.state !== 'dead');
  }
  /** A Gravehand caught her mid-run: she pitches forward onto her face, takes a knock, and gets up. */
  trip(dmg: number) {
    const g = this.g;
    if (this.state === 'dead' || this.wardT > 0 || !this.onGround) return false;
    this.ring = null;
    this.dangle = false;
    this.guarding = false;
    this.running = false;
    this.crouch = false;
    this.setHeight(STAND_HH);
    this.set('trip');
    this.vx = this.facing * 2.2;
    this.vy = -1.6;
    this.onGround = false;
    this.freeT = TRIP_DOWN + TRIP_UP + 20; // no grabbing her while she's down
    g.audio.play('hurt');
    this.chew(dmg);
    return true;
  }
  /**
   * A Hookjaw's chain caught her: she's dragged to `targetX`. Returns false if it
   * didn't take (invulnerable, warded or already dead).
   */
  yank(targetX: number) {
    const g = this.g;
    if (this.state === 'dead' || this.invuln > 0) return false;
    if (this.wardT > 0) {
      this.blockHit(targetX, this.y);
      return false;
    }
    this.ring = null;
    this.dangle = false;
    this.crouch = false;
    this.setHeight(STAND_HH);
    this.set('yank');
    this.yankX = targetX;
    this.vy = Math.min(this.vy, -2.2);
    this.facing = targetX < this.x ? -1 : 1;
    g.audio.play('hurt');
    g.shake(2, 6);
    return true;
  }

  // ------------------------------------------------------------- render

  /**
   * Running leaves a trail of fading, ghostly blue copies of the hero. A new one is
   * dropped every few frames while moving at run speed; each fades out over ~20 frames.
   * Called at the end of update(); renderEchoes() draws them.
   */
  tickEchoes() {
    const fast = this.running && Math.abs(this.vx) > WALK + 0.1 && this.state !== 'hang' && this.state !== 'dead';
    for (const e of this.echoes) e.age++;
    if (fast && this.animT % ECHO_EVERY === 0) {
      const e = this.echoes.reduce((a, b) => (b.age > a.age ? b : a)); // reuse the oldest
      Object.assign(e, { x: this.x, y: this.bottom - 18, frame: this.sprite.frame, flip: this.facing < 0, age: 0 });
    }
  }
  renderEchoes() {
    const sheet = this.g.sheets.hero;
    for (const e of this.echoes) {
      const life = ECHOES * ECHO_EVERY;
      e.s.visible = e.age < life;
      if (!e.s.visible) continue;
      if (e.s.sheet !== sheet) e.s.setSheet(sheet);
      e.s.setFrame(e.frame);
      e.s.place(e.x, e.y, e.flip);
      e.s.opacity = 0.65 * (1 - e.age / life);
      e.s.tint(0.4, 0.7, 1.4);
      e.s.glow = 0.6;
    }
  }

  /** Glide wings behind her, the shield bubble around her. */
  renderRelics() {
    const A = this.g.sheets.relicfx.anims, cy = this.bottom - 18;
    this.wings.visible = this.gliding && this.state === 'normal';
    if (this.wings.visible) {
      this.wings.setFrame(A.wings[Math.floor(this.animT / 10) % 2]);
      this.wings.place(this.x, cy - 4, this.facing < 0);
    }
    // the bubble flickers in its last moments so you know it's about to go
    const ending = this.wardT < 45 && Math.floor(this.wardT / 4) % 2 === 0;
    this.bubble.visible = this.wardT > 0 && !ending && this.state !== 'dead';
    if (this.bubble.visible) {
      this.bubble.setFrame(A.bubble[Math.floor(this.animT / 6) % 4]);
      this.bubble.place(this.x, cy);
      this.bubble.opacity = 0.75 + Math.sin(this.animT * 0.15) * 0.15;
      this.bubble.glow = 0.4;
    }
    // frozen solid: the block cracks more the closer she is to breaking out
    this.iceBlock.visible = this.frozen;
    if (this.frozen) {
      const left = this.mashLeft / ICE_MASH;
      this.iceBlock.setFrame(A.iceBlock[left > 0.66 ? 0 : left > 0.33 ? 1 : 2]);
      this.iceBlock.place(this.x, cy - 2);
      this.iceBlock.glow = 0.15;
      this.iceBlock.opacity = 0.6; // she shows through the ice
    }
  }

  /** The raised shield, held out in front of her (tilted up when she aims it up). */
  renderShield(blink: boolean) {
    const sh = this.shield, id = this.g.hunter.equip.shield;
    sh.visible = this.guarding && this.state === 'normal' && !!id;
    if (!sh.visible) return;
    const A = this.g.sheets.relicfx.anims, look = ITEMS[id].look || 'wood';
    const b = this.shieldBox();
    sh.setFrame(A[`shield_${look}`][{ level: 0, diag: 1, up: 2 }[this.guardAim]]);
    sh.place(b.x, b.y, this.facing < 0);
    sh.opacity = blink ? 0.5 : 1;
  }

  hide() {
    this.shield.visible = false;
    this.wings.visible = false;
    this.bubble.visible = false;
    this.iceBlock.visible = false;
    for (const e of this.echoes) e.s.visible = false;
    this.sprite.visible = false;
    for (const l of this.links) l.visible = false;
    this.tip.visible = false;
  }

  render() {
    const s = this.sprite, A = this.g.sheets.hero.anims;
    const pick = (name: string, fps = 10, loop = true) => s.anim(name, this.animT / 60, fps, loop);
    const spinning = this.state === 'normal' && this.spin > 0 && !this.onGround;
    s.mesh.rotation.z = spinning ? -this.facing * this.spin * Math.PI * 2 : 0;
    switch (this.state) {
      case 'normal':
        if (spinning) s.setFrame(A.tuck[0]);
        else if (this.crouch) s.setFrame(A.crouch[0]);
        else if (!this.onGround) s.setFrame(this.vy < 0 ? A.jump[0] : A.fall[Math.floor(this.animT / 8) % 2]);
        else if (this.landT > 0) s.setFrame(A.land[0]);
        else if (Math.abs(this.vx) > 0.1) pick('walk', this.inWater ? 7 : this.running ? 14 : 11);
        else pick('idle', 3);
        break;
      case 'attack': {
        const phase = this.t < 6 ? 0 : 1;
        s.setFrame(A[`atk_${this.atkStance}_${this.atkDir}_${phase}`][0]);
        break;
      }
      case 'throw': {
        // no crouch-throw art of its own: the crouching whip's wind-up and strike read the same
        const rel = this.throwSub === 'sub_knife' ? KNIFE_RELEASE : 7;
        if (this.throwLow) s.setFrame(A[`atk_crouch_0_${this.t < rel ? 0 : 1}`][0]);
        else s.setFrame(A.throw[this.t < rel ? 0 : 1]);
        break;
      }
      case 'dash':
        s.setFrame(A.dash[this.t < 8 ? 0 : 1]);
        break;
      case 'slide':
        s.setFrame(A.slide[0]);
        break;
      case 'hurt':
      case 'yank':
        s.setFrame(A.hurt[0]);
        break;
      case 'trip':
        // pitching forward, then flat on her face, then pushing herself up
        s.setFrame(this.t > TRIP_DOWN ? A.crouch[0] : this.onGround && this.t > 4 ? A.trip[1] : A.trip[0]);
        break;
      case 'toot':
        s.setFrame(this.t < 22 ? A.toot[0] : this.t < 60 ? A.toot[1] : A.toot[2 + (Math.floor(this.t / 8) % 2)]);
        break;
      case 'dead':
        s.setFrame(this.onGround && this.t > 20 ? A.dead[0] : A.hurt[0]);
        break;
      case 'hang': {
        const sw = this.theta * this.facing;
        s.setFrame(Math.abs(this.theta) < 0.25 ? A.hang[0] : sw > 0 ? A.swingF[0] : A.swingB[0]);
        break;
      }
    }
    // held: she strains against the grip
    const strain = this.holdT > 0 && !this.frozen ? (this.animT % 4 < 2 ? -1 : 1) : 0;
    s.place(this.x + strain, this.bottom - 18, this.facing < 0);
    const blink = this.invuln > 0 && this.state !== 'dead' && Math.floor(this.invuln / 3) % 2 === 0;
    s.opacity = blink ? 0.35 : 1;
    // webbed: pale and sticky, with strands trailing off her
    if (this.slowT > 0 && this.webbed) {
      s.tint(1.05, 1.05, 0.95);
      if (this.animT % 10 === 0) this.g.fx.burst(this.x, this.bottom - 6, 'mote', 1, 6, { vy: 0.3, life: 20, fade: true, tint: [1.2, 1.2, 1.1] });
    } else if (this.slowT > 0) {
      // hexed: a sickly violet cast, with motes rising off her
      s.tint(0.85, 0.65, 1.15);
      if (this.animT % 8 === 0) this.g.fx.burst(this.x, this.y, 'mote', 1, 8, { vy: -0.5, life: 24, fade: true, tint: [1.3, 0.5, 1.6] });
    } else if (this.chill > 0) {
      // chilled: she pales to frosty blue, shedding flakes faster the colder she gets
      const c = this.chill / CHILL_MAX;
      s.tint(1 - 0.3 * c, 1 - 0.08 * c, 1 + 0.35 * c);
      if (this.animT % Math.max(4, Math.round(16 - c * 12)) === 0) this.g.fx.burst(this.x, this.y, 'flake', 1, 7, { vy: -0.3, life: 22, fade: true });
    } else s.tint(1, 1, 1);
    this.renderEchoes();
    this.renderRelics();
    this.renderShield(blink);
    // whip
    const fire = this.g.hunter.fireWhip, frost = !!ITEMS[this.g.hunter.equip.whip]?.frost;
    for (let i = 0; i < LINKS; i++) {
      const l = this.links[i];
      l.visible = this.whipVisible && i < LINKS - 1;
      if (l.visible) {
        l.place(this.chain[i].x, this.chain[i].y);
        if (fire) l.tint(1.4, 0.8, 0.5);
        else if (frost) l.tint(0.75, 1.05, 1.5);
        else l.tint(1, 1, 1);
      }
    }
    this.tip.visible = this.whipVisible;
    if (this.whipVisible) {
      const c = this.chain[LINKS - 1], p = this.chain[LINKS - 2];
      const fx = this.g.sheets.fx.anims;
      this.tip.setFrame(fire ? fx.emberTip[Math.floor(this.animT / 4) % 2] : fx.tip[0]);
      this.tip.place(c.x, c.y);
      this.tip.mesh.rotation.z = -Math.atan2(c.y - p.y, c.x - p.x);
    }
  }
}
