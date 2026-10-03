// Turns a room's enemy letters into enemies. Kept apart from enemies.ts so the
// expansion enemies (which extend Enemy) don't create an import loop.
import type { Game } from './game';
import type { Ent } from './ent';
import { ENEMY, ENEMY_LETTER } from './data';
import { Zombie, Bat, Knight, Skeleton, Wisp, Drowned } from './enemies';
import { Dog, Harpy, Wraith, Crawler } from './enemies_expansion';
import { Hookjaw, Devourer, Eel, Caster, Ooze, Grub, Gravehand, Moth } from './enemies_extra';
import { Tome, Chair, Librarian } from './enemies_library';
import { Spider } from './enemies_spider';
import { Serpent } from './enemies_depths';
import { Headsman, Unhelmed, Warden, Duchess, Ferryman } from './minis/humans';
import { Lycan, Bull, Gargoyle, Brute, Ghoul } from './minis/beasts';

/**
 * Spawn the enemy for room-entity letter `t`. `variant` (the entity's arg) is an
 * enemy-editor variant id of that same base enemy; unknown ids fall back to the base.
 */
export function spawnEnemy(g: Game, t: string, x: number, bottom: number, variant?: string): Ent | null {
  const base = Object.keys(ENEMY_LETTER).find((k) => ENEMY_LETTER[k] === t);
  if (!base) return null;
  const kind = variant && ENEMY[variant]?.base === base ? variant : base;
  switch (base) {
    case 'zombie':
      return new Zombie(g, kind, x, bottom);
    case 'bat':
      return new Bat(g, kind, x, bottom - 8);
    case 'knight':
      return new Knight(g, kind, x, bottom);
    case 'skeleton':
      return new Skeleton(g, kind, x, bottom);
    case 'wisp':
      return new Wisp(g, kind, x, bottom - 8);
    case 'drowned':
      return new Drowned(g, kind, x, bottom);
    case 'dog':
      return new Dog(g, kind, x, bottom);
    case 'harpy':
      return new Harpy(g, kind, x, bottom - 8);
    case 'wraith':
      return new Wraith(g, kind, x, bottom - 16);
    case 'crawler':
      return new Crawler(g, kind, x, bottom);
    case 'hookjaw':
      return new Hookjaw(g, kind, x, bottom);
    case 'devourer':
      return new Devourer(g, kind, x, bottom);
    case 'eel':
      return new Eel(g, kind, x, bottom);
    case 'caster':
      return new Caster(g, kind, x, bottom);
    case 'ooze':
      return new Ooze(g, kind, x, bottom);
    case 'hand':
      return new Gravehand(g, kind, x, bottom);
    case 'grub':
      return new Grub(g, kind, x, bottom);
    case 'tome':
      return new Tome(g, kind, x, bottom);
    case 'chair':
      return new Chair(g, kind, x, bottom);
    case 'librarian':
      return new Librarian(g, kind, x, bottom);
    case 'moth':
      return new Moth(g, kind, x, bottom - 8);
    case 'spider':
      return new Spider(g, kind, x, bottom);
    case 'serpent':
      return new Serpent(g, kind, x, bottom);
    // the mini-bosses (0.31.0)
    case 'headsman':
      return new Headsman(g, kind, x, bottom);
    case 'lycan':
      return new Lycan(g, kind, x, bottom);
    case 'unhelmed':
      return new Unhelmed(g, kind, x, bottom);
    case 'bull':
      return new Bull(g, kind, x, bottom);
    case 'gargoyle':
      return new Gargoyle(g, kind, x, bottom);
    case 'warden':
      return new Warden(g, kind, x, bottom);
    case 'duchess':
      return new Duchess(g, kind, x, bottom);
    case 'brute':
      return new Brute(g, kind, x, bottom);
    case 'ferryman':
      return new Ferryman(g, kind, x, bottom);
    case 'ghoul':
      return new Ghoul(g, kind, x, bottom);
  }
  return null;
}
