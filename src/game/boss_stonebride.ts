// Ysolde, the Stone Bride (0.27.0 trial fight: the Sunken Rotunda). Test chamber only.
//
// A round court of stepped tiers going down to the floor she keeps to. Her gaze is a beam
// that sweeps from the vault down to the floor in front of her. Three ways to open her up:
//   - the mirrors: four bronze discs stand on the tiers. A whip stroke turns one to face the
//     court (bright) or away (green). A disc in the beam's path that faces her throws the gaze
//     straight back: she is stone. (That disc is blackened for a while. One that faces away
//     only stops the beam, which makes it cover.) She knows it, and has an asp spit a facing
//     disc round again before she looks: you have the length of her tell to turn it back.
//   - the shield: raised just as the beam arrives, it throws the gaze back as well.
//   - the steps: her tail lash sweeps the floor in front of her. If its end reaches the stone
//     step at either side of the floor, it wedges there (stand on the low step to bait it).
// Caught by the gaze you are a statue until you mash free, and she comes to break you.
//
// Second half (a scene at half health): she tears off the veil. The gaze now sweeps both ways
// at once, the asps spray a turning spiral of venom to weave through, and where you stand the
// floor turns to stone thorns after a moment's cracking.
import { Sprite, Sheet } from '../gfx/view';
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import { BossBase, Target, Beam, distToSegment, frameAt, frameLoop } from './boss_base';
import { EnemyShot } from './objects';
import type { Holder } from './player';
import { lazySheet } from '../gfx/lazy';
import { buildStoneBrideSheet, buildRotundaSheet } from '../gfx/art_stonebride';
import { clamp } from '../core/util';

const GAZE_TELL = 80;
const GAZE_SWEEP = 110;
const GUARD_FRESH = 26;
const STONE_HOLD = 220;
const FLOOR_X0 = 256, FLOOR_X1 = 512; // the sunken floor she keeps to; the lowest steps rise at its ends
const TARNISH = 1200;

interface Disc {
  x: number;
  y: number;
  s: Sprite;
  /** Facing the court (it reflects) or away, the frames left of its turn, and of its blackening. */
  toward: boolean;
  turn: number;
  dull: number;
}

export class StoneBride extends BossBase implements Holder {
  label = 'YSOLDE';
  sheet: Sheet;
  propSheet: Sheet;
  discs: Disc[] = [];
  beams: Beam[];
  bounce: Beam;
  thorns: { x: number; y: number; t: number; s: Sprite }[] = [];
  guardT = 0;
  turned = 0;
  thornT = 0;
  constructor(g: Game, x: number) {
    const sheet = lazySheet('stonebride', buildStoneBrideSheet);
    super(g, 'gorgon2', sheet, 18, 50, 11);
    this.sheet = sheet;
    this.propSheet = lazySheet('rotunda', buildRotundaSheet);
    this.x = x;
    this.y = this.floorY - 50;
    this.facing = -1;
    this.sprite!.opacity = 0;
    this.beams = [new Beam(g, '#ffe060'), new Beam(g, '#ffe060')];
    this.bounce = new Beam(g, '#fff6c0');
    const W = g.room.W;
    // a column behind each disc, from its tier up into the vault
    for (const [dx, dy, top] of [[56, 250, 320], [136, 300, 352]] as [number, number, number][])
      for (const x of [dx, W - dx]) {
        for (let y = top; y > -40; y -= 96) this.put('pillar', x, y, 4);
        this.discs.push({ x, y: dy, s: this.put('disc', x, dy + 30, 7), toward: false, turn: 0, dull: 0 });
      }
  }
  put(anim: string, x: number, bottom: number, order: number) {
    const s = new Sprite(this.propSheet, this.g.view.sprites, order);
    s.setFrame(this.propSheet.anims[anim][0]);
    s.place(x, bottom);
    this.props.push(s);
    return s;
  }
  A(name: string) {
    return this.sheet.anims[(this.phase === 2 ? 'torn_' : '') + name];
  }
  released() {
    const p = this.g.player;
    p.sprite.tint(1, 1, 1);
    this.g.fx.burst(p.x, p.y, 'dust', 8, 12, { speed: 1.5, grav: 0.1, life: 30 });
    this.g.audio.play('crumble');
  }
  get open() {
    return this.pat === 'stone' || this.pat === 'stuck';
  }
  hitType(): DmgType {
    return this.pat === 'lash' ? 'melee' : 'touch';
  }
  eyes(): [number, number] {
    return [this.x + this.facing * 8, this.floorY - 106];
  }
  targets(): Target[] {
    const out: Target[] = this.discs.map((d, i) => ({ id: 'disc' + i, x: d.x, y: d.y, r: 17 }));
    out.push({ id: 'body', x: this.x, y: this.floorY - 54, r: 34 });
    return out;
  }
  hurtZones(): Target[] {
    return this.open ? [] : [{ id: 'body', x: this.x, y: this.floorY - 40, r: 16 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (t.id.startsWith('disc')) {
      const d = this.discs[Number(t.id.slice(4))];
      if (d.turn > 0) return;
      if (d.dull > 0) return this.clank(g, d.x, d.y);
      this.flip(g, d, !d.toward);
      return;
    }
    if (this.open) {
      g.fx.burst(t.x, t.y - 10, 'rock', 3, 10, { speed: 2, grav: 0.15, life: 40, rot: 0.3 });
      if (this.strike(g, t.x, t.y - 20, kind) && this.open) this.breakOut(g);
      return;
    }
    this.chip(g, t.x, t.y - 10);
  }
  flip(g: Game, d: Disc, toward: boolean) {
    d.toward = toward;
    d.turn = 16;
    g.audio.play('note', toward ? 1.5 : 1);
    g.fx.burst(d.x, d.y, 'spark', 3, 10);
  }
  /** Her own gaze (or the stone step) has her: blows count until a segment is spent. */
  window(g: Game, pat: 'stone' | 'stuck', msg: string) {
    this.windowDmg = 0;
    this.clearShots(g);
    g.message(msg, 150);
    this.pick(pat);
  }
  breakOut(g: Game) {
    if (this.pat === 'stone') this.turned++;
    g.audio.play('crumble');
    g.shake(5, 30);
    g.fx.burst(this.x, this.floorY - 50, 'rock', 12, 24, { speed: 3, grav: 0.15, life: 60, rot: 0.3 });
    if (this.hp <= this.maxHp / 2 && this.phase === 1) {
      g.bossScene();
      return this.pick('rage');
    }
    this.pick('slither');
  }
  destroy() {
    super.destroy();
    for (const b of this.beams) b.dispose();
    this.bounce.dispose();
    for (const t of this.thorns) t.s.dispose();
    if (this.g.player.holdBy === this) this.released();
  }
  /** One beam of the gaze, out the way `dir` at `ang` below the horizontal. Returns true if it came back on her. */
  cast(g: Game, beam: Beam, dir: number, ang: number, d: any) {
    const p = g.player, [ex, ey] = [this.x + dir * 8, this.floorY - 106];
    const ux = Math.cos(ang) * dir, uy = Math.sin(ang);
    // it runs until it meets stone
    let len = 0;
    while (len < 900 && !g.room.solidPx(ex + ux * len, ey + uy * len)) len += 6;
    // a disc in its way stops it, or throws it back
    let hit: Disc | null = null;
    for (const dc of this.discs) {
      const along = (dc.x - ex) * ux + (dc.y - ey) * uy;
      if (along < 20 || along > len || distToSegment(dc.x, dc.y, ex, ey, ex + ux * len, ey + uy * len) > 15) continue;
      len = along;
      hit = dc;
    }
    const x1 = ex + ux * len, y1 = ey + uy * len;
    beam.set(ex, ey, x1, y1, 7 + Math.sin(this.pt * 0.6) * 2);
    if (this.pt % 3 === 0) g.fx.burst(x1, y1, 'spark', 1, 4, { tint: [1.4, 1.2, 0.5] });
    if (hit && hit.toward && hit.dull === 0 && hit.turn === 0) {
      hit.dull = TARNISH;
      hit.toward = false;
      this.bounce.set(hit.x, hit.y, ex, ey, 9);
      d.bounceT = 20;
      g.audio.play('glass');
      g.flashWhite = 10;
      g.shake(4, 20);
      return true;
    }
    if (!d.done && p.alive && distToSegment(p.x, p.y, ex, ey, x1, y1) < 13) {
      d.done = true;
      const faces = p.shieldFaces(this.x - p.x, ey - p.y);
      if (faces && this.guardT <= GUARD_FRESH) {
        g.audio.play('block');
        g.audio.play('glass');
        g.flashWhite = 10;
        g.shake(4, 20);
        this.bounce.set(p.x, p.y, ex, ey, 9);
        d.bounceT = 20;
        return true;
      } else if (faces) p.shieldClank(p.y - 6);
      else if (p.invuln <= 0 && p.grab(this, 14, STONE_HOLD, true)) {
        p.sprite.tint(0.55, 0.58, 0.55);
        g.damageNumber(p.x, p.y - 32, 'STONE', '#c0c8c0');
        g.audio.play('crumble');
      }
    }
    return false;
  }
  /** Mirrors turning, and the floor going to stone (second half). */
  arena(g: Game) {
    const p = g.player, DA = this.propSheet.anims.disc;
    for (const d of this.discs) {
      if (d.turn > 0) d.turn--;
      if (d.dull > 0) d.dull--;
      d.s.setFrame(DA[d.turn > 0 ? 1 : d.dull > 0 ? 3 : d.toward ? 2 : 0]);
      d.s.glow = d.toward && d.dull === 0 ? 0.25 + Math.sin(g.frame * 0.12 + d.x) * 0.12 : 0;
    }
    const live = this.phase === 2 && !this.open && this.pat !== 'rage' && this.pat !== 'dying';
    if (live && ++this.thornT > 260 && p.onGround) {
      // the stone creeps to where she stands: cracks first, then thorns
      this.thornT = 0;
      const s = new Sprite(this.propSheet, g.view.sprites, 7);
      this.thorns.push({ x: p.x, y: p.bottom, t: 0, s });
      g.audio.play('crumble');
    }
    const TA = this.propSheet.anims.thorns;
    for (const t of this.thorns) {
      t.t++;
      const up = t.t > 70;
      t.s.setFrame(TA[up ? 1 : 0]);
      t.s.place(t.x, t.y);
      if (t.t === 70) {
        g.audio.play('spike');
        g.fx.burst(t.x, t.y - 6, 'dust', 6, 20, { vy: -0.6, life: 26 });
      }
      if (up && t.t < 200 && this.smite(g, { x: t.x, y: t.y - 8, hw: 28, hh: 10 }, 'magic', Math.round(this.atk * 0.6))) p.hex(120);
      if (t.t >= 200) t.s.dispose();
    }
    this.thorns = this.thorns.filter((t) => t.t < 200);
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, s = this.sprite!, d = this.data;
    this.guardT = p.guarding ? this.guardT + 1 : 0;
    const fast = this.phase === 2 ? 1.25 : 1;
    const dx = p.x - this.x, fy = this.floorY;
    let frame = frameLoop(this.A('idle'), g.frame, 7);
    s.glow = 0;
    if (this.pat !== 'gaze') for (const b of this.beams) b.hide();
    if (d.bounceT > 0) d.bounceT--;
    else this.bounce.hide();
    this.arena(g);
    switch (this.pat) {
      case 'enter':
        // she rises out of the dark in the middle of the court, veiled, and turns to look
        s.opacity = Math.min(1, this.pt / 60);
        this.facing = dx < 0 ? -1 : 1;
        if (this.pt === 70) {
          g.audio.play('hex');
          g.bossIntro();
          g.shake(3, 30);
        }
        if (this.pt > 70) frame = frameLoop(this.A('cover'), this.pt, 8);
        if (this.pt === 130) g.bossTalk();
        if (this.pt > 130) {
          this.pick('slither');
          g.message('TURN A MIRROR TO FACE HER, OR RAISE YOUR SHIELD AS THE GAZE LANDS', 260);
        }
        break;
      case 'slither': {
        this.facing = dx < 0 ? -1 : 1;
        const stone = p.holdBy === this;
        const want = stone ? (Math.abs(dx) > 60 ? 1 : 0) : Math.abs(dx) > 200 ? 1 : Math.abs(dx) < 110 ? -0.6 : 0;
        this.x = clamp(this.x + this.facing * want * 1.3 * fast, FLOOR_X0 + 20, FLOOR_X1 - 20);
        frame = want ? frameLoop(this.A('slither'), this.pt, 5) : frame;
        if (stone && Math.abs(dx) < 110) this.pick('lash');
        else if (this.pt > 96 / fast) {
          const lit = this.discs.some((q) => q.toward && q.dull === 0 && Math.sign(q.x - this.x) === this.facing);
          if (Math.abs(dx) < 130 && this.last !== 'lash') this.pick('lash');
          else if (lit && this.last !== 'hiss' && Math.random() < 0.6) this.pick('hiss');
          else if (this.last === 'gaze' || this.last === 'spiral') this.pick(this.phase === 2 ? this.choose(['spit', 'spiral', 'lash']) : 'spit');
          else this.pick(this.phase === 2 && this.last !== 'spiral' && Math.random() < 0.4 ? 'spiral' : 'gaze');
        }
        break;
      }
      case 'hiss': {
        // an asp spits a facing mirror round again: it turns away as the venom lands
        frame = frameAt(this.A('spit'), this.pt / 30);
        if (this.pt === 1) {
          d.disc = this.discs.filter((q) => q.toward && Math.sign(q.x - this.x) === this.facing).sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0];
          g.audio.play('squelch');
        }
        const q: Disc | undefined = d.disc;
        if (q && this.pt === 26) {
          const [ex, ey] = this.eyes();
          for (let k = 1; k < 8; k++) g.fx.burst(ex + ((q.x - ex) * k) / 8, ey + ((q.y - ey) * k) / 8, 'slime', 1, 2, { life: 14 + k * 2, fade: true });
          this.flip(g, q, false);
        }
        if (this.pt > 44) this.pick('gaze'); // and then she looks
        break;
      }
      case 'lash': {
        // the tail along the floor in front of her: jump it. If its end finds the step, it wedges
        const len = 62 / fast, k = this.pt / len;
        frame = frameAt(this.A('lash'), k);
        if (this.pt === 1) this.facing = dx < 0 ? -1 : 1;
        if (!d.hit && k >= 0.5) {
          d.hit = true;
          g.audio.play('whip');
          const tip = this.x + this.facing * 128;
          if (tip <= FLOOR_X0 + 6 || tip >= FLOOR_X1 - 6) {
            g.audio.play('rumble');
            g.shake(5, 20);
            g.fx.burst(this.facing < 0 ? FLOOR_X0 : FLOOR_X1, fy - 10, 'rock', 8, 10, { speed: 2.4, grav: 0.15, life: 40, rot: 0.3 });
            this.window(g, 'stuck', 'HER TAIL IS WEDGED IN THE STEP: STRIKE');
            break;
          }
        }
        if (k >= 0.5 && k < 0.72) {
          const box = { x: this.x + this.facing * 70, y: fy - 12, hw: 60, hh: 13 };
          if (p.holdBy === this && Math.abs(p.x - box.x) < box.hw + p.hw) {
            p.holdT = 1; // the blow breaks the stone she made of you
            p.invuln = 0;
          }
          this.smite(g, box);
        }
        if (k > 1.3) this.pick('slither');
        break;
      }
      case 'spit': {
        // a fan of venom, lobbed
        frame = frameAt(this.A('spit'), (this.pt - 10) / 24);
        this.facing = dx < 0 ? -1 : 1;
        if (this.pt === 30) {
          const [ex, ey] = this.eyes();
          for (let i = 0; i < 3; i++) g.spawn(new EnemyShot(g, ex, ey, clamp(dx / 62, -3.6, 3.6) + (i - 1) * 0.8, -3.2, 'slime', 12, 0.13));
          g.audio.play('squelch');
        }
        if (this.pt > 66) this.pick('slither');
        break;
      }
      case 'spiral': {
        // the asps spray venom in two turning arms: stand in the gap and walk round with it
        frame = frameLoop(this.A('cast'), this.pt, 6);
        if (this.pt > 30 && this.pt < 200 && this.pt % 7 === 0) {
          const [ex, ey] = this.eyes(), a = this.pt * 0.045;
          for (const off of [0, Math.PI]) g.spawn(new EnemyShot(g, ex, ey - 6, Math.cos(a + off) * 1.5, Math.sin(a + off) * 1.5, 'slime', 10));
          if (this.pt % 21 === 0) g.audio.play('squelch');
        }
        if (this.pt > 230) this.pick('slither');
        break;
      }
      case 'gaze': {
        if (this.pt < GAZE_TELL) {
          frame = frameLoop(this.A('cover'), this.pt, 7);
          this.facing = dx < 0 ? -1 : 1;
          s.glow = (this.pt / GAZE_TELL) * 0.6;
          if (this.pt === 1) g.audio.play('hex');
          if (this.pt === GAZE_TELL - 1) {
            d.dir = this.facing;
            g.audio.play('sting');
            g.flashWhite = 5;
          }
        } else if (this.pt < GAZE_TELL + GAZE_SWEEP) {
          frame = frameLoop(this.A('gaze'), this.pt, 6);
          s.glow = 0.4;
          const ang = -0.6 + ((this.pt - GAZE_TELL) / GAZE_SWEEP) * 1.6; // from the vault round to the floor at her coils
          let back = this.cast(g, this.beams[0], d.dir, ang, d);
          if (this.phase === 2 && !back) back = this.cast(g, this.beams[1], -d.dir, ang, d); // and behind her too, now
          if (back) this.window(g, 'stone', 'HER OWN GAZE TAKES HER: STRIKE');
        } else if (this.pt > GAZE_TELL + GAZE_SWEEP + 30) this.pick('slither');
        break;
      }
      case 'stone':
        frame = this.sheet.anims.stone[Math.min(2, this.turned)];
        if (this.pt > 330) this.breakOut(g);
        break;
      case 'stuck':
        frame = frameLoop(this.A('stuck'), this.pt, 8);
        if (this.pt % 30 === 0) g.fx.burst(this.x + this.facing * 120, fy - 8, 'dust', 2, 6, { vy: -0.5, life: 24 });
        if (this.pt > 250) this.breakOut(g);
        break;
      case 'rage':
        // the scene: she tears the veil away
        frame = this.pt < 50 ? frameLoop(this.sheet.anims.cover, this.pt, 6) : frameLoop(this.sheet.anims.torn_gaze, this.pt, 6);
        if (this.pt === 50) {
          this.phase = 2;
          g.audio.play('screech');
          g.shake(5, 40);
          g.fadeFlash = 10;
          g.fx.burst(this.x, fy - 100, 'page', 14, 20, { speed: 2.4, grav: 0.04, life: 80, rot: 0.2, fade: true });
        }
        if (this.pt === 120) g.bossTalk('boss_gorgon2_phase2');
        if (this.pt > 120) this.pick('slither');
        break;
      case 'dying':
        frame = this.sheet.anims.stone[2];
        if (p.holdBy === this) p.holdT = 1;
        if (this.deathT % 6 === 0) g.fx.burst(this.x, fy - 50, 'rock', 3, 26, { speed: 2, grav: 0.15, life: 50, rot: 0.3 });
        if (this.dyingTick(g, 150, 34)) {
          for (const b of this.beams) b.hide();
          return;
        }
        break;
    }
    s.setFrame(frame);
    s.place(this.x, fy, this.facing < 0);
    this.showFlash();
  }
  hitSpot(): [number, number] {
    return [this.x, this.floorY - 50];
  }
}
