// Ysolde, the Stone Bride (the Bride's Court). Her gaze is a beam you can see, and the fight
// is about what stands between you and it.
//
//   slither  follows the hunter along the floor
//   smash    her tail sweeps the nearest petrified suitor to rubble (and anyone beside it)
//   gaze     she rears and covers her face (a long tell), then throws her arms wide: a beam
//            from her eyes sweeps down across the court.
//              - behind a statue: it stops the beam (and cracks; the second time it falls)
//              - shield raised toward her: it only blocks
//              - shield raised just as the beam reaches you (within GUARD_FRESH frames):
//                the gaze goes back where it came from, and she turns to stone
//              - otherwise you are a statue until you mash free, and she comes for you
//   stone    her own gaze took her: strike. One segment per turning, three in all, and she
//            crumbles a little more each time.
// After the first turning she also spits venom before she looks, and the beam sweeps back up.
import type { Game } from './game';
import type { DmgType, HitKind } from './ent';
import type { Sprite } from '../gfx/view';
import { BossBase, Target, Beam, prop, distToSegment } from './boss_base';
import { EnemyShot } from './objects';
import type { Holder } from './player';
import { clamp, overlap } from '../core/util';

const GAZE_TELL = 70; // frames she hides her face before the beam
const GAZE_SWEEP = 100; // frames the beam takes to sweep down
const GUARD_FRESH = 26; // a shield raised this recently reflects the beam instead of only blocking it
const STONE_HOLD = 220; // frames a petrified hunter stands (or 14 presses)
const STONE_WINDOW = 330; // frames she stays stone

interface Statue {
  s: Sprite;
  x: number;
  stage: number; // 0 whole, 1 cracked, 2 rubble
}

export class Gorgon extends BossBase implements Holder {
  label = 'YSOLDE';
  statues: Statue[] = [];
  beam: Beam;
  guardT = 0; // frames the hunter's shield has been up
  turned = 0; // how many times she has been turned to stone
  hinted = false;
  constructor(g: Game, x: number) {
    super(g, 'gorgon', g.sheets.gorgon, 18, 40, 11);
    this.x = x;
    this.y = this.floorY - this.hh;
    this.sprite!.opacity = 0;
    this.beam = new Beam(g, '#ffe060');
    for (const tx of [7, 15, 24, 33, 41]) {
      const sx = tx * 16;
      const s = prop(g, 'tallprops', 'statue', sx, this.floorY, 7);
      this.props.push(s);
      this.statues.push({ s, x: sx, stage: 0 });
    }
  }
  /** She lets a statue go (Holder): the stone look comes off. */
  released() {
    const p = this.g.player;
    p.sprite.tint(1, 1, 1);
    this.g.fx.burst(p.x, p.y, 'dust', 8, 12, { speed: 1.5, grav: 0.1, life: 30 });
    this.g.audio.play('crumble');
  }
  hitType(): DmgType {
    return 'touch';
  }
  targets(): Target[] {
    return [{ id: 'body', x: this.x, y: this.floorY - 50, r: 30 }];
  }
  hurtZones(): Target[] {
    return this.pat === 'stone' ? [] : [{ id: 'body', x: this.x, y: this.floorY - 40, r: 16 }];
  }
  onStrike(g: Game, t: Target, _fromX: number, kind: HitKind) {
    if (this.pat !== 'stone') return this.clank(g, t.x, t.y - 10);
    g.fx.burst(t.x, t.y - 10, 'rock', 3, 10, { speed: 2, grav: 0.15, life: 40, rot: 0.3 });
    if (this.strike(g, t.x, t.y - 20, kind) && this.pat === 'stone') this.breakOut(g);
  }
  /** The stone cracks off her and she is loose again, angrier. */
  breakOut(g: Game) {
    this.turned++;
    this.phase = 2;
    g.audio.play('crumble');
    g.shake(5, 30);
    g.fx.burst(this.x, this.floorY - 50, 'rock', 12, 24, { speed: 3, grav: 0.15, life: 60, rot: 0.3 });
    this.pick('slither');
  }
  destroy() {
    super.destroy();
    this.beam.dispose();
    if (this.g.player.holdBy === this) this.released();
  }
  /** Her eyes. */
  eyes(): [number, number] {
    return [this.x + this.facing * 4, this.floorY - 96];
  }
  setStatue(st: Statue, stage: number) {
    const g = this.g;
    st.stage = stage;
    st.s.setFrame(g.sheets.tallprops.anims.statue[stage]);
    g.audio.play('crumble');
    g.fx.burst(st.x, this.floorY - 40, 'rock', stage === 2 ? 10 : 4, 16, { speed: 2.4, grav: 0.15, life: 50, rot: 0.3 });
    g.fx.burst(st.x, this.floorY - 30, 'dust', 4, 14, { vy: -0.4, life: 30 });
  }
  update(g: Game) {
    this.pt++;
    if (this.flashT > 0) this.flashT--;
    const p = g.player, W = g.room.W, A = g.sheets.gorgon.anims, s = this.sprite!, d = this.data;
    this.guardT = p.guarding ? this.guardT + 1 : 0;
    const fast = this.phase === 2 ? 1.3 : 1;
    const dx = p.x - this.x;
    let frame = A.idle[Math.floor(g.frame / 10) % 4];
    s.glow = 0;
    if (this.pat !== 'gaze') this.beam.hide();
    switch (this.pat) {
      case 'enter':
        s.opacity = Math.min(1, this.pt / 60);
        this.facing = dx < 0 ? -1 : 1;
        if (this.pt === 70) {
          g.audio.play('hex');
          g.bossIntro();
          g.shake(3, 30);
        }
        if (this.pt > 70) frame = A.charge[0];
        if (this.pt === 120) g.bossTalk();
        if (this.pt > 120) this.pick('slither');
        break;
      case 'slither': {
        this.facing = dx < 0 ? -1 : 1;
        const stone = p.holdBy === this;
        // keeps her distance for the gaze; closes in on a hunter she has turned to stone
        const want = stone ? (Math.abs(dx) > 50 ? 1 : 0) : Math.abs(dx) > 190 ? 1 : Math.abs(dx) < 120 ? -0.7 : 0;
        this.x = clamp(this.x + this.facing * want * 1.2 * fast, 50, W - 50);
        if (stone && Math.abs(dx) < 70) this.pick('whip');
        else if (this.pt > 100 / fast) {
          const standing = this.statues.filter((st) => st.stage < 2).length;
          // she thins the statues out before she looks, but always leaves the last one to the beam
          if (this.last !== 'smash' && standing > 1) this.pick('smash');
          else if (this.phase === 2 && this.last !== 'venom') this.pick('venom');
          else this.pick('gaze');
        }
        break;
      }
      case 'smash': {
        // goes to the statue nearest the hunter and sweeps it away
        if (this.pt === 1) {
          const live = this.statues.filter((st) => st.stage < 2);
          d.st = live.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
        }
        const st: Statue = d.st;
        if (!d.at) {
          const tx = st.x - Math.sign(st.x - this.x || 1) * 52;
          this.facing = st.x < this.x ? -1 : 1;
          this.x += clamp(tx - this.x, -2 * fast, 2 * fast);
          if (Math.abs(tx - this.x) < 3 || this.pt > 200) d.at = this.pt;
        } else {
          const t = this.pt - d.at;
          frame = t < 24 ? A.charge[0] : A.whip[0];
          if (t === 24) {
            g.audio.play('whip');
            this.setStatue(st, 2);
          }
          if (t >= 24 && t < 36 && p.alive && p.invuln <= 0) {
            const box = { x: this.x + this.facing * 52, y: this.floorY - 12, hw: 46, hh: 14 };
            if (overlap(box, p)) p.takeDamage(this.atk, this.x, false, true, 'melee', box.y);
          }
          if (t > 60) this.pick('slither');
        }
        break;
      }
      case 'whip': {
        // the tail, on a hunter she has caught
        frame = this.pt < 22 ? A.charge[0] : A.whip[0];
        if (this.pt === 22) g.audio.play('whip');
        if (this.pt >= 22 && this.pt < 34 && p.alive) {
          const box = { x: this.x + this.facing * 52, y: this.floorY - 12, hw: 46, hh: 14 };
          if (overlap(box, p)) {
            if (p.holdBy === this) p.holdT = 1; // the blow breaks the stone
            p.invuln = 0;
            p.takeDamage(this.atk, this.x, false, true, 'melee', box.y);
          }
        }
        if (this.pt > 64) this.pick('slither');
        break;
      }
      case 'venom': {
        frame = A.charge[0];
        this.facing = dx < 0 ? -1 : 1;
        if (this.pt === 30) {
          for (let i = 0; i < 3; i++) g.spawn(new EnemyShot(g, this.x, this.floorY - 90, clamp(dx / 62, -3.5, 3.5) + (i - 1) * 0.7, -3.2, 'slime', 12, 0.13));
          g.audio.play('squelch');
        }
        if (this.pt > 70) this.pick('gaze');
        break;
      }
      case 'gaze': {
        const sweep = this.phase === 2 ? GAZE_SWEEP * 1.7 : GAZE_SWEEP;
        if (this.pt < GAZE_TELL) {
          frame = A.charge[0];
          this.facing = dx < 0 ? -1 : 1;
          s.glow = (this.pt / GAZE_TELL) * 0.7;
          if (this.pt === 1) {
            g.audio.play('hex');
            if (!this.hinted) g.message(g.hunter.equip.shield ? 'HER EYES! HIDE, OR RAISE YOUR SHIELD AS THE GAZE LANDS' : 'HER EYES! GET BEHIND A STATUE', 200);
            this.hinted = true;
          }
          if (this.pt === GAZE_TELL - 1) {
            d.dir = this.facing;
            g.audio.play('sting');
            g.flashWhite = 5;
          }
        } else if (this.pt < GAZE_TELL + sweep) {
          frame = A.beam[0];
          s.glow = 0.5;
          // the beam swings from the roof down to the floor at her feet's level (and, once
          // she's angry, back up again), always out the way she faces
          const t = (this.pt - GAZE_TELL) / GAZE_SWEEP;
          const k = t <= 1 ? t : Math.max(0, 1 - (t - 1) / 0.7);
          const ang = -0.5 + k * 1.45; // radians below the horizontal: from the roof round to the floor near her
          const [ex, ey] = this.eyes();
          let len = 900;
          let x1 = ex + Math.cos(ang) * len * d.dir, y1 = ey + Math.sin(ang) * len;
          // it stops at the floor
          if (y1 > this.floorY) {
            len *= (this.floorY - ey) / (y1 - ey);
            x1 = ex + Math.cos(ang) * len * d.dir;
            y1 = this.floorY;
          }
          // ...or at the first standing statue in its path
          for (const st of this.statues) {
            if (st.stage >= 2 || Math.sign(st.x - ex) !== d.dir) continue;
            const yAt = ey + Math.tan(ang) * Math.abs(st.x - ex);
            if (yAt > this.floorY - 78 && yAt < this.floorY && Math.abs(st.x - ex) < Math.abs(x1 - ex)) {
              x1 = st.x;
              y1 = yAt;
              if (!d.hitStatue) d.hitStatue = st;
            }
          }
          this.beam.set(ex, ey, x1, y1, 7 + Math.sin(this.pt * 0.6) * 2);
          if (this.pt % 3 === 0) g.fx.burst(x1, y1, 'spark', 1, 4, { tint: [1.4, 1.2, 0.5] });
          if (!d.done && p.alive && distToSegment(p.x, p.y, ex, ey, x1, y1) < 13) {
            d.done = true;
            const faces = p.shieldFaces(this.x - p.x, ey - p.y);
            if (faces && this.guardT <= GUARD_FRESH) {
              // turned back on her
              g.audio.play('block');
              g.audio.play('glass');
              g.flashWhite = 10;
              g.shake(4, 20);
              this.beam.set(p.x, p.y, ex, ey, 9);
              this.windowDmg = 0;
              g.message('HER OWN GAZE TAKES HER: STRIKE', 150);
              this.pick('stone');
              break;
            } else if (faces) p.shieldClank(p.y - 6);
            else if (p.invuln <= 0 && p.grab(this, 14, STONE_HOLD, true)) {
              p.sprite.tint(0.55, 0.58, 0.55);
              g.damageNumber(p.x, p.y - 32, 'STONE', '#c0c8c0');
              g.audio.play('crumble');
            }
          }
        } else {
          // the statue that took the beam cracks, or falls if it was cracked already
          if (d.hitStatue && !d.cracked) {
            d.cracked = true;
            this.setStatue(d.hitStatue, d.hitStatue.stage + 1);
          }
          if (this.pt > GAZE_TELL + sweep + 30) this.pick('slither');
        }
        break;
      }
      case 'stone':
        frame = A.stone[Math.min(2, this.turned)];
        if (this.pt > STONE_WINDOW) this.breakOut(g);
        break;
      case 'dying':
        frame = A.stone[2];
        if (p.holdBy === this) p.holdT = 1;
        if (this.deathT % 6 === 0) g.fx.burst(this.x, this.floorY - 50, 'rock', 3, 26, { speed: 2, grav: 0.15, life: 50, rot: 0.3 });
        if (this.dyingTick(g, 150, 34)) {
          this.beam.hide();
          return;
        }
        break;
    }
    s.setFrame(frame);
    s.place(this.x, this.floorY, this.facing < 0);
    this.showFlash();
  }
  hitSpot(): [number, number] {
    return [this.x, this.floorY - 50];
  }
}
