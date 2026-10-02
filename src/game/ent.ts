import type { Sprite } from '../gfx/view';
import type { Game } from './game';

export type HitKind = 'whip' | 'holy' | 'cross' | 'dangle';

/** What the game and HUD need from a boss (see BOSSES in game/bosses.ts). */
export interface Boss extends Ent {
  hp: number;
  maxHp: number;
  phase: number;
  /** Short name on the health bar. */
  label: string;
  /** False while it makes its entrance or after it dies. */
  readonly showBar: boolean;
  /** True once its death animation has finished. */
  readonly gone: boolean;
}

export abstract class Ent {
  x = 0;
  y = 0;
  hw = 8;
  hh = 8;
  dead = false;
  sprite: Sprite | null = null;
  whipTarget = false;
  hostile = false;
  touchDmg = 0;
  def = 0;
  lastHit = -1;
  /** Hit ids are remembered per source for a few frames so multi-hit attacks behave. */
  hitMemo: Map<number, number> = new Map();
  abstract update(g: Game): void;
  onHit?(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind): void;
  destroy() {
    if (this.sprite) this.sprite.dispose();
    this.sprite = null;
  }
}
