// The opening cinematic on Hollowcrown Ridge.
//
// It runs inside normal play: the room, physics and entities keep updating, while this
// script drives the hero through Input.script, holds the camera, and shows captions
// between letterbox bars (drawn by UI.drawCutscene). Any confirm press skips to the end.
//
// Timeline (frames at 60 per second):
//   0-240    camera pans from the distant keep back to the hero      caption: the place
//   240-330  she walks in                                             caption: her name
//   360-480  the keep's bells toll three times                         caption: the bells
//   520      the mountain rumbles, snow sifts down, she turns around
//   590      the avalanche appears                                    caption: AVALANCHE!
//   660      she turns to run: the chase begins
import type { Game } from './game';
import { CINE } from './story';
import { LEASH } from './avalanche';
import { clamp, rand } from '../core/util';
import { VW } from '../config';

const END = 660;

export class Cutscene {
  t = 0;
  done = false;
  /** 0..1 letterbox bar height. */
  bars = 0;
  /** Lines currently shown (CINE.place etc.), with their fade timer. */
  caption: { lines: string[]; t: number; big: boolean } | null = null;
  shout = 0; // frames left on the "AVALANCHE!" title
  holdCam = true;

  constructor(private g: Game) {}

  /** Called by Game.newGame after the room is loaded. */
  begin() {
    const g = this.g;
    g.input.script = {};
    g.view.camX = g.room.W - VW;
    g.view.camY = 0;
    g.music.play('pass', 1.5);
  }

  update() {
    const g = this.g, p = g.player, t = ++this.t;
    if (g.input.confirm && t > 20) return this.finish(true);
    this.bars = Math.min(1, this.bars + 0.04);
    if (this.caption) this.caption.t++;
    if (this.shout > 0) this.shout--;
    const say = (lines: string[], big: boolean) => (this.caption = { lines, t: 0, big });

    // camera: ease from the keep on the right back to the hero
    if (t <= 240) {
      const k = t / 240, e = k * k * (3 - 2 * k);
      g.view.camX = (g.room.W - VW) * (1 - e) + clamp(p.x - VW / 2, 0, g.room.W - VW) * e;
    } else this.holdCam = false;

    if (t === 20) say(CINE.place, true);
    if (t === 240) {
      say(CINE.hero, true);
      g.input.script = { right: true };
    }
    if (t === 330) g.input.script = {};
    if (t === 360 || t === 420 || t === 480) g.audio.play('toll');
    if (t === 360) say(CINE.bells, false);
    if (t === 500) g.music.stop(1.5);
    if (t >= 520 && t < END) {
      // the mountain shakes harder and harder; snow sifts down from above
      g.shake(1 + ((t - 520) / (END - 520)) * 3, 4);
      if (t % 30 === 0) g.audio.play('rumble');
      if (t % 2 === 0) g.fx.burst(g.view.camX + rand(0, VW), g.view.camY - 4, 'flake', 1, 0, { vy: rand(1, 2.5), vx: rand(-0.3, 0.3), life: 120, order: 17 });
    }
    if (t === 560) {
      p.facing = -1; // she looks back up the mountain
      this.caption = null;
    }
    if (t === 590) {
      g.damageNumber(p.x, p.y - 30, '!', '#ffe060');
      const av = g.avalanche;
      if (av) {
        av.front = g.view.camX - 30;
        av.active = true;
        av.cine = true;
      }
      g.audio.play('avalanche');
      this.shout = 120;
    }
    if (t >= END) this.finish(false);
  }

  /** End the cinematic (or skip it) and start the chase. */
  finish(skipped: boolean) {
    const g = this.g, p = g.player;
    this.done = true;
    g.cutscene = null;
    g.input.script = null;
    g.input.flush();
    p.facing = 1;
    const av = g.avalanche;
    if (av) {
      av.active = true;
      av.cine = false;
      if (skipped) av.front = Math.min(av.front, p.x - LEASH);
    }
    g.music.play('chase', 0.3);
    g.message('RUN!', 120);
  }
}
