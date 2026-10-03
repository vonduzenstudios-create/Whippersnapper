// Every boss in one table. A room with `boss: '<id>'` starts that fight when the hero
// walks in, seals its doors until the boss dies, and only shows its items ('i') afterwards.
import type { Game } from './game';
import type { Boss } from './ent';
import { Wyrm } from './boss';
import { Hound } from './hound';
import { BellMother } from './bellmother';

export interface BossInfo {
  /** Banner when the fight starts. */
  name: string;
  sub: string;
  /** Flag set when it dies (opens gates tied to it, like the Lair's far gate). */
  flag?: string;
  /** A message shown once it's dead (the Wyrm: the way on has opened). */
  after?: string;
  /** Create the boss. (x, bottom) is the room's 'W' marker, if it has one. */
  make: (g: Game, x: number, bottom: number) => Boss;
}

export const BOSSES: Record<string, BossInfo> = {
  wyrm: { name: 'Ossuary Wyrm', sub: 'devourer of the forgotten dead', flag: 'wyrm_slain', after: 'THE GATE BEYOND THE LAIR STANDS OPEN', make: (g) => new Wyrm(g) },
  hound: { name: 'Gnarlfang', sub: 'the two-headed warden of the kennels', make: (g, x) => new Hound(g, x) },
  bellmother: { name: 'The Bell-Mother', sub: 'she who rings the dead awake', make: (g) => new BellMother(g) },
};
