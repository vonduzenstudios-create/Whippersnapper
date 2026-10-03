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
import { RimehideFalls, RimehideBones } from './boss_rimehide';
import type { RoomDef } from '../world/rooms';
import { buildFrozenFalls, buildBoneyard, buildFoundry, buildRotunda, buildSunkenLock } from '../world/rooms_trial';
import { LockLeviathan } from './boss_lockwyrm';
import { StoneBride } from './boss_stonebride';
import { IronKnight } from './boss_ironknight';
import { Castellan } from './boss_castellan';
import { Marionette } from './boss_marionette';
import { Saint } from './boss_saint';
import { Stalker } from './boss_stalker';
import { Reaper } from './boss_reaper';
import { Baron } from './boss_baron';
import { StarReader } from './boss_starreader';
import { Miller } from './boss_miller';
import { Mawtoad } from './boss_mawtoad';
import { Abbess } from './boss_abbess';

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
  /**
   * A trial boss (0.27.0): not in the world yet. This builds its own chamber, which only the
   * test chamber loads (TEST ENEMY on the title, or the enemy editor's TEST button).
   */
  trial?: () => RoomDef;
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
  // the trial bosses: reworks waiting to be tried, each in a chamber of its own (world/rooms_trial.ts)
  yeti2: { name: 'Old Rimehide', sub: 'the white hunger under the falls', make: (g) => new RimehideFalls(g), trial: buildFrozenFalls },
  leviathan2: { name: 'The Sump Leviathan', sub: 'the tide beneath the castle', make: (g) => new LockLeviathan(g), trial: buildSunkenLock },
  gorgon2: { name: 'Ysolde, the Stone Bride', sub: 'none who met her eyes have left', make: (g, x) => new StoneBride(g, x), trial: buildRotunda },
  colossus2: { name: 'The Hollow Colossus', sub: 'armor that outlived its knight', make: (g, x) => new IronKnight(g, x), trial: buildFoundry },
  yeti3: { name: 'Old Rimehide', sub: 'he dens in what he could not finish', make: (g) => new RimehideBones(g), trial: buildBoneyard },
  // the ten trial bosses (0.27.0): no room in the world has them yet. TEST ENEMY builds each one's chamber (world/rooms_trials.ts)
  castellan: { name: 'The Pendulum Castellan', sub: 'he keeps the hour, and the hour keeps him', make: (g, x) => new Castellan(g, x) },
  marionette: { name: 'Lady Marrow', sub: 'the last dancer of a dead theatre', make: (g, x) => new Marionette(g, x) },
  saint: { name: 'The Censer Saint', sub: 'his prayers are smoke and cinders', make: (g, x) => new Saint(g, x) },
  stalker: { name: 'The Umbral Stalker', sub: 'it lives where the lanterns do not reach', make: (g, x) => new Stalker(g, x) },
  reaper: { name: 'The Harvest Reaper', sub: 'the field is his, and all that stands in it', make: (g, x) => new Reaper(g, x) },
  baron: { name: 'The Powder Baron', sub: 'last gunner of the east rampart', make: (g, x) => new Baron(g, x) },
  starreader: { name: 'The Star-Reader', sub: 'he has already seen how this ends', make: (g, x) => new StarReader(g, x) },
  miller: { name: 'The Gale Miller', sub: 'the wind grinds for him', make: (g, x) => new Miller(g, x) },
  mawtoad: { name: 'The Mawtoad', sub: 'the bog swallows; so does it', make: (g, x) => new Mawtoad(g, x) },
  abbess: { name: 'The Rose Abbess', sub: 'her garden is always hungry', make: (g, x) => new Abbess(g, x) },
};
