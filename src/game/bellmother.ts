// The Bell-Mother, matriarch of the harpies (boss of the Great Belfry). Since 0.19.0 the
// fight is her song.
//
// She is wrapped in her own voice: while she sings nothing reaches her. Three small bells hang
// in the belfry, each a different note.
//   sing     she settles on her roost in the lower belfry (`roost`, about 196 px over the floor, so
//            she stays on screen) and sings a phrase: the bells light and sound in order
//   hover / swoop / feathers / toll   then she comes for you, keeping a little above your head (`over`)
// Ring her phrase back on the bells (whip them, in the same order). Get it right and her
// voice breaks: she drops to the floor, stunned, and that's the window. A wrong bell starts
// you over and brings her straight down on you. She sings the phrase again every so often, so
// you can listen twice. Each time she gets up the phrase is one note longer: 3, 4, 5.
import { Sprite } from '../gfx/view';
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import { BossBase, Target, prop } from './boss_base';
import { EnemyShot } from './objects';
import { Shockwave } from './enemies_expansion';
import { clamp, rand } from '../core/util';

const PITCH = [0.667, 1, 1.5]; // the three bells' notes (low, middle, high), a fifth apart so no two sound alike
const NOTE_GAP = 48; // frames between the notes of her phrase
const STUNNED = 330; // frames she lies stunned
const RESING = 780; // frames until she sings the phrase again

export class BellMother extends BossBase {
  label = 'BELL-MOTHER';
  bells: { s: Sprite; x: number; y: number; lit: number }[] = [];
  song: number[] = [];
  at = 0; // how many notes of the phrase the hunter has rung back
  sinceSong = 0;
  ringT = 0; // frames since a bell last sounded: the music stays ducked a moment after it
  constructor(g: Game) {
    super(g, 'bellmother', g.sheets.bellmother, 20, 24, 11);
    const W = g.room.W;
    this.x = W / 2;
    this.y = -80;
    for (let i = 0; i < 3; i++) {
      const x = W / 2 + (i - 1) * 234, y = this.floorY - 84 - (i === 1 ? 26 : 0);
      const s = prop(g, 'props', 'bell', x, y, 7, i);
      this.props.push(s);
      this.bells.push({ s, x, y, lit: 0 });
    }
  }
  get stunned() {
    return this.pat === 'stunned';
  }
  targets(): Target[] {
    const out: Target[] = this.bells.map((b, i) => ({ id: 'bell' + i, x: b.x, y: b.y + 4, r: 16 }));
    out.push({ id: 'body', x: this.x, y: this.y, r: 24 });
    return out;
  }
  hurtZones(): Target[] {
    return this.stunned || this.pat === 'fall' ? [] : [{ id: 'body', x: this.x, y: this.y, r: 18 }];
  }
  hitType(): DmgType {
    return this.pat === 'swoop' ? 'melee' : 'touch';
  }
  ring(g: Game, i: number) {
    this.bells[i].lit = 30;
    this.ringT = 50;
    g.audio.play('bell', PITCH[i]);
    g.fx.burst(this.bells[i].x, this.bells[i].y + 10, 'star', 6, 12, { speed: 1.2, life: 30, fade: true, glow: 1 });
  }
  /** A new phrase of `n` notes (never the same bell twice running, so each note is heard apart). */
  compose(n: number) {
    this.song = [];
    for (let i = 0; i < n; i++) {
      let k: number;
      do k = Math.floor(Math.random() * 3);
      while (k === this.song[i - 1]);
      this.song.push(k);
    }
    this.at = 0;
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id === 'body') {
      if (!this.stunned) return this.clank(g, t.x, t.y);
      if (this.strike(g, this.x, this.y, kind) && this.stunned) this.pick('rise');
      return;
    }
    if (this.stunned || this.pat === 'fall' || this.pat === 'sing') return;
    const i = Number(t.id.slice(4));
    this.ring(g, i);
    if (i === this.song[this.at]) {
      if (++this.at < this.song.length) return;
      // the whole phrase, rung back at her: her voice breaks
      g.audio.play('glass');
      g.audio.play('screech');
      g.flashWhite = 8;
      g.shake(5, 30);
      this.clearShots(g);
      this.windowDmg = 0;
      g.message('HER VOICE BREAKS: STRIKE', 140);
      this.pick('fall');
    } else {
      // a wrong note: start again, and she is on you at once
      this.at = 0;
      g.audio.play('screech');
      g.message('A WRONG NOTE', 90);
      if (this.pat === 'hover' || this.pat === 'feathers') this.pick('swoop');
    }
  }
  next() {
    if (this.sinceSong > RESING) return this.pick('sing');
    this.pick(this.choose(['swoop', 'feathers', 'toll', 'swoop']));
  }
  /** Steer toward a point with a little inertia (damped, so she settles instead of circling). */
  steer(tx: number, ty: number, max: number, acc = 0.12) {
    this.vx = clamp((this.vx + Math.sign(tx - this.x) * acc) * 0.94, -max, max);
    this.vy = clamp((this.vy + Math.sign(ty - this.y) * acc) * 0.94, -max, max);
    if (Math.abs(tx - this.x) < 12) this.vx *= 0.85;
    if (Math.abs(ty - this.y) < 12) this.vy *= 0.85;
    this.x += this.vx;
    this.y += this.vy;
  }
  update(g: Game) {
    this.pt++;
    this.sinceSong++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, A = g.sheets.bellmother.anims, s = this.sprite!, d = this.data;
    const W = g.room.W, fy = this.floorY;
    const fast = this.phase === 2 ? 1.2 : 1;
    // she keeps to the lower belfry now (0.27.0), where the camera can hold her and the hunter
    // together: `roost` is where she sings and tolls, `over` is a little above the hunter's head
    const roost = fy - 196, over = clamp(p.y - 118, roost - 20, fy - 130);
    // the song has to be heard: the music drops right down while she sings, and whenever a bell sounds
    if (this.ringT > 0) this.ringT--;
    g.musicDuck = this.pat === 'dying' ? 1 : this.pat === 'sing' ? 0.18 : this.ringT > 0 ? 0.35 : 1;
    // her sheet is a puppet's poses (gfx/art_bellmother.ts): every animation is a loop of in-betweens
    const loop = (a: number[], every: number) => a[Math.floor(g.frame / every) % a.length];
    const cast = loop(A.cast, 4);
    let frame = loop(A.fly, this.phase === 2 ? 3 : 4);
    switch (this.pat) {
      case 'enter':
        this.y += (roost - this.y) * 0.03;
        if (this.pt === 40) {
          g.audio.play('screech');
          g.shake(4, 60);
        }
        if (this.pt === 80) g.bossIntro();
        if (this.pt === 150) {
          g.audio.play('toll');
          g.shake(4, 50);
        }
        if (this.pt > 150) frame = cast;
        if (this.pt === 190) g.bossTalk();
        if (this.pt > 190) {
          this.compose(3);
          this.pick('sing');
          g.message('LISTEN, THEN RING IT BACK ON THE BELLS', 240);
        }
        break;
      case 'sing': {
        // under the great bell, singing her phrase: each bell lights as its note sounds
        this.steer(W / 2, roost, 2.4);
        this.facing = p.x < this.x ? -1 : 1;
        frame = cast;
        s.glow = 0.35;
        const k = (this.pt - 50) / NOTE_GAP;
        if (this.pt >= 50 && Number.isInteger(k) && k < this.song.length) this.ring(g, this.song[k]);
        if (this.pt > 50 + this.song.length * NOTE_GAP + 20) {
          this.sinceSong = 0;
          this.at = 0;
          this.pick('hover');
        }
        break;
      }
      case 'hover': {
        const tx = clamp(p.x + Math.sin(this.pt * 0.02) * 140, 60, W - 60), ty = over + Math.sin(this.pt * 0.05) * 12;
        this.steer(tx, ty, 2 * fast);
        this.facing = p.x < this.x ? -1 : 1;
        if (this.pt > 110 / fast) this.next();
        break;
      }
      case 'swoop': {
        if (this.pt === 1) {
          d.side = p.x < W / 2 ? 1 : -1; // start on the side away from the hunter
          d.sx = d.side > 0 ? W - 60 : 60;
        }
        if (this.pt < 60) {
          this.steer(d.sx, over, 4);
          this.facing = -d.side;
          if (this.pt === 40) g.audio.play('screech');
        } else {
          if (this.pt === 60) {
            d.x0 = this.x;
            d.y0 = this.y;
            d.low = clamp(p.y - 4, roost, fy - 26); // dives to your height
            d.len = 80 / fast;
          }
          const t = Math.min(1, (this.pt - 60) / d.len);
          const x1 = d.side > 0 ? 60 : W - 60;
          this.x = d.x0 + (x1 - d.x0) * t;
          this.y = d.y0 + (d.low - d.y0) * Math.sin(t * Math.PI);
          frame = loop(A.dive, 3);
          if (this.pt % 4 === 0) g.fx.burst(this.x - this.facing * 20, this.y, 'smoke', 1, 6, { life: 20, fade: true });
          if (t >= 1) this.pick('hover');
        }
        break;
      }
      case 'feathers': {
        this.steer(clamp(p.x, 80, W - 80), over, 2.4);
        this.facing = p.x < this.x ? -1 : 1;
        frame = cast;
        const every = 40;
        if (this.pt % every === 0 && this.pt <= every * 2) {
          const base = Math.atan2(p.y - this.y, p.x - this.x);
          for (let i = 0; i < 5; i++) {
            const a = base + (i - 2) * 0.24;
            g.spawn(new EnemyShot(g, this.x, this.y + 6, Math.cos(a) * 2.5, Math.sin(a) * 2.5, 'feather', 14));
          }
          g.audio.play('harpy');
        }
        if (this.pt > every * 2 + 30) this.pick('hover');
        break;
      }
      case 'toll':
        // the great bell: one shockwave rolls in from each wall
        this.steer(W / 2, roost, 3);
        frame = cast;
        s.glow = this.pt < 50 ? (this.pt / 50) * 0.6 : 0.2;
        if (this.pt === 50) {
          g.audio.play('toll');
          g.shake(6, 50);
          g.spawn(new Shockwave(g, 28, fy, 2.3 * fast, 16, 400));
          g.spawn(new Shockwave(g, W - 28, fy, -2.3 * fast, 16, 400));
        }
        if (this.pt > 110) this.pick('hover');
        break;
      case 'fall':
        // her voice broken, she drops like a stone
        this.vy = Math.min(this.vy + 0.35, 7);
        this.y += this.vy;
        frame = loop(A.fall, 3);
        if (this.y >= fy - 22) {
          this.y = fy - 22;
          this.vy = 0;
          g.shake(5, 20);
          g.audio.play('explode');
          g.fx.burst(this.x, fy, 'smoke', 8, 20, { vy: -0.4, life: 40, fade: true });
          this.pick('stunned');
        }
        break;
      case 'stunned':
        frame = loop(A.stunned, 6); // slumped on the floor, heaving for breath
        if (this.pt % 20 === 0) g.fx.burst(this.x + rand(-16, 16), this.y - 20, 'star', 1, 4, { life: 24, fade: true });
        if (this.pt > STUNNED) this.pick('rise');
        break;
      case 'rise':
        // back up into the vault, and a longer phrase
        this.steer(W / 2, roost, 3, 0.2);
        if (this.pt === 1) {
          if (this.hp <= this.maxHp / 2 && this.phase === 1) {
            this.phase = 2;
            g.bossScene();
            return this.pick('rage');
          }
          g.audio.play('screech');
        }
        if (this.pt > 70) {
          this.compose(Math.min(5, this.song.length + 1));
          this.pick('sing');
        }
        break;
      case 'rage':
        // her second wind (a scene): she rings the great bell with her own body
        this.steer(W / 2, roost, 2.5);
        this.facing = p.x < this.x ? -1 : 1;
        frame = this.pt < 50 ? loop(A.fly, 3) : cast;
        if (this.pt === 30) {
          g.audio.play('screech');
          g.shake(5, 40);
          g.fadeFlash = 12;
        }
        if (this.pt === 60 || this.pt === 95) {
          g.audio.play('toll');
          g.shake(6, 40);
          g.fx.burst(this.x, this.y - 10, 'spark', 6, 16, { speed: 2, life: 26 });
        }
        s.glow = this.pt > 50 ? 0.5 : 0;
        if (this.pt === 110) g.bossTalk('boss_bellmother_phase2');
        if (this.pt > 110) {
          this.compose(Math.min(5, this.song.length + 1));
          this.pick('sing');
        }
        break;
      case 'dying':
        this.y = Math.min(fy - 20, this.y + 0.8);
        frame = loop(A.fall, 3);
        if (this.deathT % 7 === 0) g.fx.burst(this.x, this.y, 'smoke', 2, 16, { vy: 0.8, life: 40, fade: true }); // falling feathers
        if (this.deathT === 150) g.audio.play('toll');
        if (this.dyingTick(g, 160, 24)) return;
        break;
    }
    this.x = clamp(this.x, 24, W - 24);
    s.setFrame(frame);
    s.place(this.x, this.y, this.facing < 0);
    this.showFlash();
    if (this.phase === 2) s.tint(1.2, 0.9, 0.85);
    if (this.pat !== 'toll' && this.pat !== 'rage' && this.pat !== 'sing') s.glow = 0;
    // the bells: lit while they sound, and the ones already rung back glow faintly
    const P = g.sheets.props.anims;
    this.bells.forEach((b, i) => {
      if (b.lit > 0) b.lit--;
      b.s.setFrame((b.lit > 0 ? P.bellLit : P.bell)[i]);
      b.s.place(b.x + (b.lit > 0 ? Math.sin(b.lit * 0.8) * 2 : 0), b.y);
      b.s.glow = b.lit > 0 ? 0.25 + (b.lit / 30) * 0.5 : 0;
    });
  }
}
