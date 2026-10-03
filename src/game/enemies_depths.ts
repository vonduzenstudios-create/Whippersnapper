// The Temple Asp (0.18.0): the Serpent Temple's own enemy.
//   slither  patrols; turns toward the hero when she comes into sight
//   coil     a short tell, then...
//   strike   ...it darts along the floor at her (a lunge: the shield blocks it)
//   rear     from further off it rears up and spits a glob of venom in an arc (poison)
import type { Game } from './game';
import { Enemy } from './enemies';
import { EnemyShot } from './objects';

export class Serpent extends Enemy {
  state: 'slither' | 'coil' | 'strike' | 'rear' = 'slither';
  lunges = ['strike'];
  st = 0;
  cool = 40;
  constructor(g: Game, kind: string, x: number, bottom: number) {
    super(g, kind, x, bottom, 9, 6);
    this.feet = 1;
    this.facing = Math.random() < 0.5 ? -1 : 1;
  }
  go(s: Serpent['state']) {
    this.state = s;
    this.st = 0;
  }
  update(g: Game) {
    this.baseUpdate(g);
    const p = g.player, A = this.anims, s = this.sprite!;
    const dx = p.x - this.x, dist = Math.abs(dx), level = Math.abs(p.y - this.y) < 40;
    this.st++;
    if (this.cool > 0) this.cool--;
    let frame = A.slither[Math.floor((this.t * A.slither.length) / 32) % A.slither.length]; // one loop every 32 frames, however many frames it has
    if (this.stun > 0) {
      if (this.state !== 'slither') this.go('slither');
    } else if (this.state === 'slither') {
      const sees = dist < 180 * this.num('sight') && level && p.alive;
      if (sees) {
        this.faceToward(p.x);
        this.vx = this.facing * 0.7 * this.num('speed');
        if (this.cool <= 0 && dist < 64 && this.can('strike')) this.go('coil');
        else if (this.cool <= 0 && dist > 80 && this.can('spit')) this.go('rear');
      } else this.patrolTurn(g, 0.5 * this.num('speed'));
    } else if (this.state === 'coil') {
      this.vx = 0;
      frame = A.coil[0];
      if (this.st === 1) g.audio.play('skitter');
      if (this.st > 18) {
        this.go('strike');
        g.audio.play('bite');
      }
    } else if (this.state === 'strike') {
      this.vx = this.facing * 3.4;
      frame = A.strike[0];
      if (this.st > 16) {
        this.cool = 70 * this.num('cooldown');
        this.go('slither');
      }
    } else if (this.state === 'rear') {
      this.vx = 0;
      frame = A.rear[0];
      this.faceToward(p.x);
      if (this.st === 24) {
        // a lobbed glob, aimed to come down about where she stands
        const vx = Math.max(-3, Math.min(3, dx / 45));
        g.spawn(new EnemyShot(g, this.x + this.facing * 8, this.y - 14, vx, -3.2, 'slime', Math.round(this.atk * 0.6), 0.14));
        g.audio.play('squelch');
      }
      if (this.st > 44) {
        this.cool = 110 * this.num('cooldown');
        this.go('slither');
      }
    }
    this.physics(g);
    s.setFrame(frame);
    this.place();
  }
}
