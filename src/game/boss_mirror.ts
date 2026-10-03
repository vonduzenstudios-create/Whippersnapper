// The Mirror Heart (the Mirror Vault). It can't be struck: it is a reflection.
//
// PART ONE, the echo. A glass copy of the hunter stands across the hall's middle from her and
// does everything she did 55 frames ago, mirrored: walks, jumps, swings its own chain (which
// hurts). Crystal grows in the hall:
//   violet growths sprout on ITS side. Each has a pale twin mark on your side: be standing on
//     the mark, and a moment later the copy is standing in the crystal when it bursts.
//   red growths sprout under YOU. Move, and remember the copy moves when you do.
// Three bursts under the copy end part one.
//
// PART TWO (a scene), the shell game. The whole view turns upside down. The Heart steps into
// one of the five standing mirrors, the mirrors trade their contents back and forth, and then
// you have a few seconds to put the chain through the right one. Right: the glass cracks and
// it takes a segment. Wrong: what's in that mirror is you, and you take the blow. Three right
// answers shatter it. Each round trades more, faster.
import { Sprite } from '../gfx/view';
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import { BossBase, Target, SEG, prop } from './boss_base';
import { clamp, rand, overlap } from '../core/util';

const DELAY = 55; // frames the copy runs behind the hunter
const GROW = 120; // frames a crystal takes from first glow to bursting
const PICK_TIME = 260; // frames to choose a mirror

interface Rec {
  x: number;
  y: number;
  frame: number;
  facing: number;
  attack: boolean;
}
interface Growth {
  x: number;
  t: number;
  red: boolean;
  s: Sprite;
  mark: Sprite | null;
}
interface Mirror {
  x: number;
  frame: Sprite;
  fig: Sprite;
  fx: number; // where its figure is drawn (slides during a trade)
  cracked: number;
}

export class MirrorHeart extends BossBase {
  label = 'MIRROR HEART';
  tape: Rec[] = [];
  growths: Growth[] = [];
  mirrors: Mirror[] = [];
  nextGrow = 150;
  hitsOne = 0; // crystal bursts that caught the copy
  rounds = 0; // right answers in the shell game
  inside = 0; // which mirror holds it
  roll = 0; // how far the view has turned (0..1)
  constructor(g: Game) {
    super(g, 'mirror', g.mirrorSheets[g.hunter.hero], 6, 18, 11);
    const W = g.room.W;
    this.x = W - g.player.x;
    this.y = this.floorY - 18;
    this.sprite!.opacity = 0;
    for (let i = 0; i < 5; i++) {
      const x = W / 2 + (i - 2) * 126;
      const fig = new Sprite(g.mirrorSheets[g.hunter.hero], g.view.sprites, 7);
      fig.visible = false;
      const frame = prop(g, 'tallprops', 'mirror', x, this.floorY, 8);
      this.props.push(frame, fig);
      this.mirrors.push({ x, frame, fig, fx: x, cracked: 0 });
    }
  }
  hitType(): DmgType {
    return 'touch';
  }
  targets(): Target[] {
    if (this.pat === 'pick') return this.mirrors.map((m, i) => ({ id: 'm' + i, x: m.x, y: this.floorY - 46, r: 22 }));
    if (this.phase === 1 && this.pat === 'echo') return [{ id: 'copy', x: this.x, y: this.y, r: 14 }];
    return [];
  }
  hurtZones(): Target[] {
    return this.pat === 'echo' ? [{ id: 'copy', x: this.x, y: this.y, r: 9 }] : [];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id === 'copy') {
      // a reflection: the chain goes through it with a ripple
      g.fx.burst(t.x, t.y, 'glass', 2, 6, { life: 16, fade: true });
      return this.clank(g, t.x, t.y);
    }
    const i = Number(t.id.slice(1)), m = this.mirrors[i], p = g.player;
    if (i === this.inside) {
      this.rounds++;
      m.cracked = Math.min(2, m.cracked + 1);
      m.frame.setFrame(g.sheets.tallprops.anims.mirror[m.cracked]);
      g.audio.play('glass');
      g.shake(5, 24);
      g.fx.burst(m.x, this.floorY - 46, 'glass', 14, 20, { speed: 2.5, grav: 0.08, life: 50, fade: true });
      this.windowDmg = 0;
      this.strike(g, m.x, this.floorY - 46, kind, SEG);
      if (this.pat !== 'dying') this.pick('reveal');
    } else {
      // that one was you
      g.audio.play('hex');
      g.fx.burst(m.x, this.floorY - 46, 'glass', 6, 12, { speed: 2, life: 30, fade: true });
      p.invuln = 0;
      p.takeDamage(this.atk, m.x, false, true, 'magic');
      g.message('THAT ONE WAS YOU', 110);
      this.pick('reveal');
    }
  }
  destroy() {
    super.destroy();
    for (const gr of this.growths) {
      gr.s.dispose();
      gr.mark?.dispose();
    }
    this.g.view.roll = 0;
  }
  /** Start a crystal: on the copy's side (with its twin mark on yours), or red, under the hunter. */
  grow(g: Game, red: boolean) {
    const W = g.room.W, p = g.player;
    // its side is the half the hunter isn't in
    const side = p.x < W / 2 ? 1 : -1;
    const x = red ? clamp(p.x, 40, W - 40) : clamp(W / 2 + side * rand(70, W / 2 - 50), 40, W - 40);
    const s = prop(g, 'props', 'crystal', x, this.floorY - 24, 9);
    if (red) s.tint(1.6, 0.4, 0.5);
    const mark = red ? null : prop(g, 'props', 'mark', W - x, this.floorY - 24, 9);
    this.growths.push({ x, t: 0, red, s, mark });
    g.audio.play('chime');
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, W = g.room.W, s = this.sprite!, d = this.data;
    const HA = g.sheets.hero.anims;
    // the tape of what she did
    this.tape.push({ x: p.x, y: p.y, frame: p.sprite.frame, facing: p.facing, attack: p.state === 'attack' });
    if (this.tape.length > DELAY + 1) this.tape.shift();
    const rec = this.tape[0];
    // the view turns over in part two, and back when it dies
    const wantRoll = this.phase === 2 && this.pat !== 'dying' ? 1 : 0;
    this.roll += clamp(wantRoll - this.roll, -0.02, 0.02);
    g.view.roll = this.roll * Math.PI;
    switch (this.pat) {
      case 'enter':
        s.opacity = Math.min(0.9, this.pt / 70);
        this.x = W - p.x;
        if (this.pt % 8 === 0 && this.pt < 70) g.fx.burst(this.x + rand(-10, 10), this.y + rand(-16, 16), 'glass', 1, 4, { vy: -0.5, life: 24, fade: true });
        if (this.pt === 80) {
          g.audio.play('glass');
          g.bossIntro();
        }
        if (this.pt === 130) g.bossTalk();
        if (this.pt > 130) {
          this.pick('echo');
          g.message('IT DOES WHAT YOU DID. PUT IT WHERE THE CRYSTAL GROWS', 240);
        }
        break;
      case 'echo': {
        // the copy: her position mirrored about the hall's middle, a moment late
        this.x = W - rec.x;
        this.y = rec.y;
        this.facing = -rec.facing;
        s.setFrame(rec.frame);
        // its chain is as real as hers
        if (rec.attack && p.alive && p.invuln <= 0) {
          const box = { x: this.x + this.facing * 34, y: this.y - 4, hw: 30, hh: 10 };
          if (overlap(box, p)) p.takeDamage(this.atk, this.x, false, true, 'melee', box.y);
        }
        if (--this.nextGrow <= 0) {
          d.n = (d.n || 0) + 1;
          this.grow(g, d.n % 3 === 0);
          this.nextGrow = 190 - this.hitsOne * 25;
        }
        break;
      }
      case 'rage':
        // the scene: the copy bursts, and the hall turns over
        s.opacity = Math.max(0, 0.9 - this.pt / 20);
        if (this.pt === 1) {
          g.audio.play('glass');
          g.fx.burst(this.x, this.y, 'glass', 16, 20, { speed: 2.5, grav: 0.05, life: 50, fade: true });
          for (const gr of this.growths) {
            gr.s.dispose();
            gr.mark?.dispose();
          }
          this.growths = [];
        }
        if (this.pt === 40) g.audio.play('hex');
        if (this.pt === 110) g.bossTalk('boss_mirror_phase2');
        if (this.pt > 110) {
          this.pick('show');
          g.message('WATCH THE MIRROR IT STEPS INTO', 200);
        }
        break;
      case 'show':
        // it shows itself in one mirror
        if (this.pt === 1) {
          this.inside = Math.floor(Math.random() * 5);
          for (const m of this.mirrors) m.fx = m.x;
          g.audio.play('chime');
        }
        if (this.pt > 70) this.pick('shuffle');
        break;
      case 'shuffle': {
        // pairs of mirrors trade what's in them; the figures slide across, all looking alike
        const swaps = 3 + this.rounds * 2, each = Math.max(22, 40 - this.rounds * 8);
        const k = Math.floor((this.pt - 1) / each), t = ((this.pt - 1) % each) / each;
        if (k >= swaps) {
          for (const m of this.mirrors) m.fx = m.x;
          this.pick('pick');
          break;
        }
        if ((this.pt - 1) % each === 0) {
          // the next trade: mostly ones that move the Heart
          d.a = Math.random() < 0.7 ? this.inside : Math.floor(Math.random() * 5);
          do d.b = Math.floor(Math.random() * 5);
          while (d.b === d.a);
          g.audio.play('blink');
        }
        const a = this.mirrors[d.a], b = this.mirrors[d.b];
        const e = t * t * (3 - 2 * t);
        a.fx = a.x + (b.x - a.x) * e;
        b.fx = b.x + (a.x - b.x) * e;
        if ((this.pt - 1) % each === each - 1) {
          // done: the contents have changed places
          if (this.inside === d.a) this.inside = d.b;
          else if (this.inside === d.b) this.inside = d.a;
          a.fx = a.x;
          b.fx = b.x;
        }
        break;
      }
      case 'pick':
        if (this.pt === 1) g.message('WHICH ONE?', 120);
        if (this.pt > PICK_TIME) {
          // too slow: it comes out of the glass at her
          const m = this.mirrors[this.inside];
          g.audio.play('glass');
          g.fx.burst(m.x, this.floorY - 46, 'glass', 8, 14, { speed: 2, life: 30, fade: true });
          if (p.alive && Math.abs(p.x - m.x) < 150) {
            p.invuln = 0;
            p.takeDamage(this.atk, m.x, false, true, 'magic');
          }
          this.pick('reveal');
        }
        break;
      case 'reveal':
        // a breath between rounds, with the truth showing
        if (this.pt > 70) this.pick('show');
        break;
      case 'dying':
        if (this.deathT % 5 === 0) {
          const m = this.mirrors[Math.floor(Math.random() * 5)];
          g.fx.burst(m.x + rand(-14, 14), this.floorY - rand(20, 80), 'glass', 2, 8, { speed: 1.5, grav: 0.08, life: 40, fade: true });
        }
        if (this.deathT === 60) for (const m of this.mirrors) m.frame.setFrame(g.sheets.tallprops.anims.mirror[2]);
        this.x = this.mirrors[this.inside].x;
        this.y = this.floorY - 46;
        if (this.dyingTick(g, 130, 20)) {
          g.view.roll = 0;
          for (const m of this.mirrors) m.fig.visible = false;
          return;
        }
        break;
    }
    // crystals grow, burst and fall away
    const CA = g.sheets.props.anims.crystal, MA = g.sheets.props.anims.mark;
    for (const gr of this.growths) {
      gr.t++;
      gr.s.setFrame(CA[gr.t < GROW * 0.5 ? 0 : gr.t < GROW ? 1 : 2]);
      gr.s.glow = gr.t < GROW ? 0.3 + Math.sin(gr.t * 0.3) * 0.2 : 0.6;
      gr.mark?.setFrame(MA[Math.floor(gr.t / 10) % 2]);
      if (gr.t === GROW) {
        g.audio.play('glass');
        g.fx.burst(gr.x, this.floorY - 20, 'glass', 8, 12, { speed: 2.5, grav: 0.1, life: 40, fade: true });
        const spike = { x: gr.x, y: this.floorY - 24, hw: 16, hh: 24 };
        if (gr.red) {
          if (p.alive && p.invuln <= 0 && overlap(spike, p)) p.takeDamage(this.atk, gr.x, false, true, 'magic');
        } else if (this.pat === 'echo' && Math.abs(this.x - gr.x) < 22 && this.y > this.floorY - 60) {
          // the copy was standing in it
          this.hitsOne++;
          this.windowDmg = 0;
          this.strike(g, this.x, this.y, 'whip', SEG);
          if (this.hitsOne >= 3 && this.pat === 'echo') {
            this.phase = 2;
            g.bossScene();
            this.pick('rage');
          }
        }
      }
    }
    this.growths = this.growths.filter((gr) => {
      if (gr.t < GROW + 40) return true;
      gr.s.dispose();
      gr.mark?.dispose();
      return false;
    });
    // what the mirrors show
    const lit = this.pat === 'show' || this.pat === 'reveal' || this.pat === 'dying';
    this.mirrors.forEach((m, i) => {
      const f = m.fig;
      if (this.phase === 1) {
        // part one: only her own faint reflection, in whichever mirror she passes
        f.visible = Math.abs(p.x - m.x) < 26;
        f.setFrame(p.sprite.frame);
        f.place(m.x + (p.x - m.x) * 0.5, this.floorY - 18, p.facing > 0);
        f.opacity = 0.35;
        f.tint(1, 1, 1);
        return;
      }
      f.visible = this.pat !== 'rage';
      f.setFrame(HA.idle[Math.floor(g.frame / 12) % 4]);
      f.place(m.fx, this.floorY - 18, i % 2 === 0);
      f.opacity = 0.85;
      // only while it shows itself can you tell which one is the Heart
      const real = i === this.inside;
      if (lit && real) f.tint(1.5, 1.2, 1.8);
      else if (lit) f.tint(0.35, 0.3, 0.45);
      else f.tint(0.8, 0.75, 1);
      f.glow = lit && real ? 0.5 : 0;
    });
    s.visible = this.phase === 1;
    s.place(this.x, this.y, this.facing < 0);
    s.glow = 0.15;
    this.showFlash();
  }
  hitSpot(): [number, number] {
    return this.phase === 2 ? [this.mirrors[this.inside].x, this.floorY - 46] : [this.x, this.y];
  }
}
