// Every boss in one table. A room with `boss: '<id>'` starts that fight when the hero
// walks in, seals its doors until the boss dies, and only shows its items ('i') afterwards.
import type { Game } from './game';
import type { Boss } from './ent';
import { Wyrm } from './boss';
import { Hound } from './hound';
import { BellMother } from './bellmother';
import { Leviathan } from './boss_leviathan';
import { Gorgon } from './boss_gorgon';
import { Yeti } from './boss_yeti';
import { Colossus, FurnaceHeart } from './boss_colossus';
import { MirrorHeart } from './boss_mirror';
import { Archivist } from './boss_archivist';

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
  // the 0.18.0 zones
  leviathan: { name: 'The Sump Leviathan', sub: 'the tide beneath the castle', make: (g) => new Leviathan(g) },
  gorgon: { name: 'Ysolde, the Stone Bride', sub: 'none who met her eyes have left', make: (g, x) => new Gorgon(g, x) },
  yeti: { name: 'Old Rimehide', sub: 'the white hunger of the summit', make: (g) => new Yeti(g) },
  colossus: { name: 'The Hollow Colossus', sub: 'armor that outlived its knight', flag: 'deep_door', after: 'FAR BELOW, THE BLACK DOOR GRINDS OPEN', make: (g, x) => (g.room.def.id === 'fg_heart' ? new FurnaceHeart(g) : new Colossus(g, x)) }, // one boss, two rooms: the armor, then inside it
  mirror: { name: 'The Mirror Heart', sub: 'it has been waiting to meet you', make: (g) => new MirrorHeart(g) },
  archivist: { name: 'The Head Archivist', sub: 'keeper of every story but his own', make: (g, x, bottom) => new Archivist(g, x, bottom) },
};
