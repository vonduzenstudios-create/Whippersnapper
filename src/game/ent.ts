import type { Sprite } from '../gfx/view';
import type { Game } from './game';

export type HitKind = 'whip' | 'holy' | 'cross' | 'dangle' | 'knife';

/**
 * How a hostile thing hurts the hero, which decides what her shield does about it:
 *   touch  walking into an enemy's body: the shield doesn't help (and gets knocked down)
 *   melee  a weapon strike or a deliberate lunge: the shield cuts the damage
 *   shot   a physical projectile (bone, book, feather, rock, web, hook): the shield stops it
 *   magic  fire, hexes and shockwaves: the shield doesn't help (and gets knocked down)
 */
export type DmgType = 'touch' | 'melee' | 'shot' | 'magic';

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
  /** How far the camera pulls back during the fight (1 = not at all; see View.zoom). */
  readonly camZoom?: number;
  /** True while the camera should not try to keep it in view (it has left the room on purpose). */
  readonly camFree?: boolean;
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
  /** Frames left of a Throwing Knife's mark: the next other hit ignores half its DEF. */
  exposedT = 0;
  /** Hit ids are remembered per source for a few frames so multi-hit attacks behave. */
  hitMemo: Map<number, number> = new Map();
  abstract update(g: Game): void;
  /** What kind of hit touching this deals right now (see DmgType). */
  hitType(): DmgType {
    return 'touch';
  }
  onHit?(g: Game, dmg: number, fromX: number, crit: boolean, kind: HitKind): void;
  /** Its melee blow or lunge just hit the hero's raised shield (see Player.justBlocked). */
  onBlocked?(g: Game): void;
  destroy() {
    if (this.sprite) this.sprite.dispose();
    this.sprite = null;
  }
}
