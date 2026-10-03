// The Star-Reader (trial boss, 0.27.0). An observatory with a brass orrery turning overhead.
//
// Three worlds go round the great lens at their own speeds. Each one is a grapple ring you
// can swing from, and each one stops for a while when the chain strikes it. To open him up:
//   - ECLIPSE: stop all three worlds in a line (the bottom of each orbit is the easy place:
//     that is where they pass within reach). His stars go dark and he falls
//   - after his NOVA the lens is dark while it gathers light again: get up there (a double
//     jump, or a swing from a world) and crack it
// Otherwise he blinks from spot to spot and casts: rings of stars from the lens with a gap to
// stand in, and comets along two lanes (jump the low one, duck the high one).
// Phase two: the STAR TIDE. The whole floor burns for a moment, so you must be hanging from a
// world when it does, while a beam turns round the lens like a clock hand; and the orbits
// reverse after every tide.
import type { Game } from './game';
import { HitKind } from './ent';
import { Sprite } from '../gfx/view';
import { Target, Beam, distToSegment } from './boss_base';
import { TrialBoss, Bullet, AX0, AX1, AMID } from './boss_kit';
import { lazySheet } from '../gfx/lazy';
import { buildStarReaderSheet, buildOrreryProps, buildOrbits } from '../gfx/art_starreader';
import { TAU } from '../gfx/puppet';

const RADII = [60, 105, 150];
const SPEED = [0.021, -0.0145, 0.0105];
const SPOTS = [AX0 + 70, AMID, AX1 - 70];

interface World { a: number; w: number; stop: number; ring: { x: number; y: number }; s: Sprite }

export class StarReader extends TrialBoss {
  label = 'STAR-READER';
  hub: { x: number; y: number };
  worlds: World[];
  lens: Sprite;
  /** Frames the lens stays dark after a nova (it can be cracked then). */
  dark = 0;
  beam: Beam;
  beamA = 0;
  fade = 1;
  constructor(g: Game, x: number) {
    super(g, 'starreader', lazySheet('starreader', buildStarReaderSheet), 14, 28, x);
    this.hub = { x: AMID, y: this.floorY - 166 };
    const props = lazySheet('orreryProps', buildOrreryProps);
    const tracks = new Sprite(lazySheet('orbits', buildOrbits), g.view.sprites, 2);
    tracks.place(this.hub.x, this.hub.y);
    this.lens = new Sprite(props, g.view.sprites, 8);
    this.worlds = RADII.map((_, i) => {
      const w: World = { a: i * 2.1 + 1, w: SPEED[i], stop: 0, ring: { x: 0, y: 0 }, s: new Sprite(props, g.view.sprites, 8) };
      g.rings.push(w.ring); // she can hang from a world
      this.props.push(w.s);
      return w;
    });
    this.props.push(tracks, this.lens);
    this.beam = new Beam(g, '#80b0ff');
    this.gear.push(this.beam);
    this.x = AMID;
    this.facing = -1;
    this.place();
  }
  /** Put every world where its angle says (0 = straight below the lens). */
  place() {
    this.worlds.forEach((w, i) => {
      w.ring.x = this.hub.x + Math.sin(w.a) * RADII[i];
      w.ring.y = this.hub.y + Math.cos(w.a) * RADII[i];
    });
  }
  targets(): Target[] {
    const out: Target[] = this.worlds.map((w, i) => ({ id: `w${i}`, x: w.ring.x, y: w.ring.y, r: 12 }));
    out.push({ id: 'lens', x: this.hub.x, y: this.hub.y, r: 15 });
    if (this.fade > 0.5) out.push({ id: 'body', x: this.x, y: this.y, r: 22 });
    return out;
  }
  hurtZones(): Target[] {
    return this.vulnT > 0 || this.fade < 0.5 ? [] : [{ id: 'body', x: this.x, y: this.y, r: 12 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id[0] === 'w') {
      const w = this.worlds[+t.id.slice(1)];
      w.stop = this.phase === 2 ? 330 : 440;
      g.audio.play('tingle');
      g.fx.burst(t.x, t.y, 'star', 5, 8, { life: 24, fade: true, glow: 1 });
      // an eclipse: all three stopped, in a line
      const spread = (a: number, b: number) => Math.abs(((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI);
      const [a, b, c] = this.worlds;
      if (this.worlds.every((x) => x.stop > 0) && spread(a.a, b.a) < 0.34 && spread(b.a, c.a) < 0.34 && spread(a.a, c.a) < 0.34) {
        for (const x of this.worlds) x.stop = 0;
        g.flashWhite = 6;
        this.stun(g, 320, 'ECLIPSE. HIS STARS GO DARK: STRIKE');
      }
      return;
    }
    if (t.id === 'lens') {
      if (this.dark <= 0 || this.vulnT > 0) return this.clank(g, t.x, t.y);
      this.dark = 0;
      g.audio.play('glass');
      g.fx.burst(t.x, t.y, 'glass', 10, 8, { speed: 2, grav: 0.1, life: 34, fade: true });
      return this.stun(g, 320, 'THE LENS CRACKS: STRIKE');
    }
    this.bodyHit(g, t, kind);
  }
  star(g: Game, x: number, y: number, ang: number, speed: number) {
    g.spawn(new Bullet(g, x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, Math.round(this.atk * 0.5), { anim: 'star', scale: 1.5, glow: 1, r: 3, life: 320, type: 'magic', tint: [0.7, 0.9, 1.6] }));
  }
  run(g: Game) {
    const p = g.player, d = this.data, two = this.phase === 2;
    this.y = this.floorY - this.hh;
    // ── the orrery turns
    const PA = this.lens.sheet.anims;
    this.worlds.forEach((w, i) => {
      if (w.stop > 0) w.stop--;
      else w.a = (w.a + w.w * (this.pat === 'shift' ? 4 : 1) + TAU) % TAU;
      this.place();
      w.s.setFrame(PA[`planet${i}`][w.stop > 0 ? 1 : 0]);
      w.s.place(w.ring.x, w.ring.y);
      w.s.flash = w.stop > 0 && w.stop < 60 && g.frame % 8 < 4 ? 0.5 : 0; // about to move again
    });
    if (this.dark > 0) this.dark--;
    this.lens.setFrame(this.vulnT > 0 ? PA.lens[3] : this.dark > 0 ? PA.lens[2] : PA.lens[Math.floor(g.frame / 10) % 2]);
    this.lens.place(this.hub.x, this.hub.y);
    this.lens.glow = this.dark > 0 || this.vulnT > 0 ? 0 : 0.3;
    this.beam.hide();
    let fade = 1;
    switch (this.pat) {
      case 'enter':
        fade = Math.min(1, this.pt / 40);
        this.loop(this.pt > 60 ? 'cast' : 'idle', 7);
        if (this.pt === 1) g.audio.play('blink');
        this.enterBeats(g, 60, 124);
        break;
      case 'shift':
        this.loop('nova', 5);
        if (this.pt % 30 === 1) g.shake(3, 14);
        if (this.pt === 90) for (const w of this.worlds) w.w = -w.w;
        this.shiftBeats(g, 104);
        break;
      case 'idle':
        this.look();
        this.loop('idle', 7);
        if (this.pt > (two ? 56 : 84)) {
          const opts = ['rings', 'comets', 'blink'];
          if (this.last !== 'nova' && this.dark <= 0) opts.push('nova');
          if (two && this.last !== 'tide') opts.push('tide', 'tide');
          this.pick(this.choose(opts));
        }
        break;
      case 'blink': {
        // gone in a scatter of stars, back somewhere else
        fade = this.pt < 20 ? 1 - this.pt / 20 : Math.min(1, (this.pt - 26) / 20);
        if (this.pt === 1) g.audio.play('blink');
        if (this.pt === 22) {
          const others = SPOTS.filter((s) => Math.abs(s - this.x) > 10 && Math.abs(s - p.x) > 40);
          this.x = others[Math.floor(Math.random() * others.length)] ?? AMID;
          g.fx.burst(this.x, this.y, 'star', 10, 16, { life: 30, fade: true, glow: 1 });
        }
        this.loop('idle', 7);
        if (this.pt > 50) this.pick('idle');
        break;
      }
      case 'rings': {
        this.loop('cast', 6);
        const n = two ? 4 : 3;
        if (this.pt % 44 === 24 && this.pt < 44 * n) {
          g.audio.play('chime');
          const gap = Math.atan2(p.y - this.hub.y, p.x - this.hub.x) + (Math.random() - 0.5) * 1.6;
          for (let k = 0; k < 18; k++) {
            const a = gap + (k / 18) * TAU;
            if (k > 1 && k < 17) this.star(g, this.hub.x, this.hub.y, a, 1.35);
          }
        }
        if (this.pt > 44 * n + 24) this.pick('idle');
        break;
      }
      case 'comets': {
        this.loop('cast', 6);
        const n = two ? 4 : 3, every = 56;
        const k = Math.floor(this.pt / every), t = this.pt % every;
        if (k < n) {
          if (t === 0) {
            d.low = k % 2 === 0 ? Math.random() < 0.5 : !d.low;
            d.dir = Math.random() < 0.5 ? 1 : -1;
            g.audio.play('mark');
          }
          const y = this.floorY - (d.low ? 11 : 46);
          if (t < 40) this.beam.set(AX0, y, AX1, y, 3, 0.18 + (t % 8 < 4 ? 0.12 : 0)); // where it will come
          if (t === 40) {
            g.audio.play('fire');
            g.spawn(new Bullet(g, d.dir > 0 ? AX0 + 6 : AX1 - 6, y, d.dir * 5.2, 0, this.atk, { anim: 'fireball', scale: 1.7, glow: 0.8, r: 6, life: 140, type: 'magic', tint: [0.6, 0.9, 1.8], solid: false }));
          }
        } else if (t > 20) this.pick('idle');
        break;
      }
      case 'nova': {
        this.loop('nova', 5);
        const CHARGE = 84;
        if (this.pt < CHARGE) {
          this.lens.glow = 0.3 + this.pt / CHARGE;
          if (this.pt % 3 === 0) {
            const a = Math.random() * TAU;
            g.fx.burst(this.hub.x + Math.cos(a) * 60, this.hub.y + Math.sin(a) * 60, 'star', 1, 0, { vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4, life: 22, glow: 1 });
          }
          if (this.pt === 1) g.audio.play('breath');
        } else if (this.pt === CHARGE) {
          g.audio.play('explode');
          g.shake(5, 16);
          g.flashWhite = 4;
          const off = Math.random() * TAU;
          for (let k = 0; k < 24; k++) if (k % 6 > 1) this.star(g, this.hub.x, this.hub.y, off + (k / 24) * TAU, 2);
          this.dark = two ? 150 : 190;
          g.message('THE LENS IS DARK', 110);
        }
        if (this.pt > CHARGE + 60) this.pick('idle');
        break;
      }
      case 'tide': {
        // phase two: the floor is about to be the sky. Be off it.
        this.loop('nova', 5);
        const WARN = 80, BURN = 90;
        if (this.pt === 1) {
          g.audio.play('tide');
          g.message('THE STAR TIDE RISES: GET OFF THE FLOOR', 130);
        }
        const hot = this.pt >= WARN && this.pt < WARN + BURN;
        if (this.pt < WARN + BURN && g.frame % (hot ? 1 : 4) === 0) {
          const x = AX0 + Math.random() * (AX1 - AX0);
          g.fx.burst(x, this.floorY - 2, 'star', 1, 0, { vy: hot ? -2.2 : -0.6, life: hot ? 22 : 30, fade: true, glow: 1, tint: [0.7, 0.9, 1.6] });
        }
        if (hot) {
          if (p.alive && p.invuln <= 0 && p.bottom > this.floorY - 18) p.takeDamage(Math.round(this.atk * 0.7), p.x, false, true, 'magic');
          // the hand of the clock: don't be hanging where it points
          this.beamA += 0.022;
          const ex = this.hub.x + Math.sin(this.beamA) * 165, ey = this.hub.y + Math.cos(this.beamA) * 165;
          this.beam.set(this.hub.x, this.hub.y, ex, ey, 7, 0.9);
          if (p.alive && p.invuln <= 0 && distToSegment(p.x, p.y, this.hub.x, this.hub.y, ex, ey) < 9) p.takeDamage(this.atk, this.hub.x, false, true, 'magic');
        }
        if (this.pt === WARN + BURN) for (const w of this.worlds) w.w = -w.w;
        if (this.pt > WARN + BURN + 30) this.pick('idle');
        break;
      }
      case 'stun':
        this.loop('stun', 8);
        break;
    }
    this.fade = fade;
    this.sprite!.opacity = fade;
  }
}
