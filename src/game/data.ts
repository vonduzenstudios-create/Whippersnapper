// Items, equipment and enemy stat tables.
// The enemy editor (enemies.html) saves changed and new enemies to enemy_edits.json,
// which is applied on top of the code table below.
import ENEMY_EDITS from './enemy_edits.json';

export type Slot = 'whip' | 'armor' | 'acc' | 'use' | 'sub' | 'max' | 'relic';

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  icon: string; // frame name in the item sheet
  desc: string;
  atk?: number;
  def?: number;
  str?: number;
  con?: number;
  lck?: number;
  len?: number; // whip reach in px
  fire?: boolean;
  frost?: boolean; // icy blue chain (looks only)
  heal?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  whip_leather: { id: 'whip_leather', name: 'Leather Whip', slot: 'whip', icon: 'whip', desc: 'A worn hunting whip.', atk: 6, len: 56 },
  whip_iron: { id: 'whip_iron', name: 'Iron Chain', slot: 'whip', icon: 'whip', desc: 'Heavy linked iron. ATK+12', atk: 12, len: 64 },
  whip_barbed: { id: 'whip_barbed', name: 'Barbed Chain', slot: 'whip', icon: 'whip', desc: 'Hooked barbs tear flesh. ATK+18', atk: 18, len: 68 },
  whip_ember: { id: 'whip_ember', name: 'Ember Chain', slot: 'whip', icon: 'whip', desc: 'Forged in a dying star. Burns. ATK+26', atk: 26, len: 76, fire: true },
  whip_rime: { id: 'whip_rime', name: 'Rime Chain', slot: 'whip', icon: 'whip', desc: 'Cooled in water that never moves. ATK+32', atk: 32, len: 80, frost: true },
  armor_coat: { id: 'armor_coat', name: 'Hunter Coat', slot: 'armor', icon: 'armor', desc: 'Oiled leather coat. DEF+2', def: 2 },
  armor_mail: { id: 'armor_mail', name: "Hunter's Mail", slot: 'armor', icon: 'armor', desc: 'Chain mail under leather. DEF+6', def: 6 },
  armor_bone: { id: 'armor_bone', name: 'Bone Plate', slot: 'armor', icon: 'armor', desc: 'Grim but sturdy. DEF+10 LCK-2', def: 10, lck: -2 },
  armor_raven: { id: 'armor_raven', name: 'Raven Mail', slot: 'armor', icon: 'armor', desc: 'Black scale that drinks the cold. DEF+15', def: 15 },
  acc_fang: { id: 'acc_fang', name: 'Hound Fang', slot: 'acc', icon: 'ring', desc: 'A trophy of the hunt. STR+3 LCK+3', str: 3, lck: 3 },
  acc_bell: { id: 'acc_bell', name: 'Bell Charm', slot: 'acc', icon: 'ring', desc: 'Its chime steadies the heart. CON+6', con: 6 },
  acc_moon: { id: 'acc_moon', name: 'Moon Charm', slot: 'acc', icon: 'ring', desc: 'Silver crescent. LCK+6', lck: 6 },
  acc_blood: { id: 'acc_blood', name: 'Blood Ring', slot: 'acc', icon: 'ring', desc: 'Warm to the touch. STR+4', str: 4 },
  acc_garnet: { id: 'acc_garnet', name: 'Garnet Brooch', slot: 'acc', icon: 'ring', desc: 'A ward against harm. CON+4', con: 4 },
  potion: { id: 'potion', name: 'Potion', slot: 'use', icon: 'potion', desc: 'Restores 40 HP.', heal: 40 },
  elixir: { id: 'elixir', name: 'Elixir', slot: 'use', icon: 'potion', desc: 'Restores all HP.', heal: 9999 },
  sub_holy: { id: 'sub_holy', name: 'Holy Water', slot: 'sub', icon: 'holy', desc: 'Bursts into blue flame. 1 heart.' },
  sub_cross: { id: 'sub_cross', name: 'Cross', slot: 'sub', icon: 'cross', desc: 'Flies out and returns. 2 hearts.' },
  life_up: { id: 'life_up', name: 'Life Max Up', slot: 'max', icon: 'lifeUp', desc: 'Max HP +15' },
  heart_up: { id: 'heart_up', name: 'Heart Max Up', slot: 'max', icon: 'heartUp', desc: 'Max hearts +10' },
  // minor upgrades hidden in secret corners
  str_up: { id: 'str_up', name: 'Might Seed', slot: 'max', icon: 'strUp', desc: 'STR +1 for good' },
  con_up: { id: 'con_up', name: 'Ward Seed', slot: 'max', icon: 'conUp', desc: 'CON +1 for good' },
  relic_grapple: { id: 'relic_grapple', name: 'Chain Grapple', slot: 'relic', icon: 'relic', desc: 'Whip iron rings to swing.' },
  relic_mantle: { id: 'relic_mantle', name: 'Raven Mantle', slot: 'relic', icon: 'mantle', desc: 'Jump again in midair.' },
  relic_greaves: { id: 'relic_greaves', name: 'Frostrunner Greaves', slot: 'relic', icon: 'greaves', desc: 'Down + dash to slide.' },
  // experimental relics (0.4.0): not placed in the world yet, try them in the #lab test room
  relic_shroud: { id: 'relic_shroud', name: 'Duskwing Shroud', slot: 'relic', icon: 'shroud', desc: 'Hold jump while falling to glide.' },
  relic_pearl: { id: 'relic_pearl', name: 'Undertow Pearl', slot: 'relic', icon: 'pearl', desc: 'Move freely and at full speed in water.' },
  relic_ward: { id: 'relic_ward', name: 'Ashglass Ward', slot: 'relic', icon: 'ward', desc: 'Raise a shield bubble. 3 hearts.' },
};

export const SUB_COST: Record<string, number> = { sub_holy: 1, sub_cross: 2 };
/** Hearts spent to raise the Ashglass Ward's shield bubble. */
export const WARD_COST = 3;

/**
 * Difficulty levels, picked after character select (and changeable under OPTIONS in the
 * pause menu). Only enemy damage changes, so enemies don't turn into damage sponges.
 * `Hunter.difficulty` is an index into this list.
 */
export const DIFFICULTIES = [
  { name: 'NORMAL', dmg: 1, desc: 'ENEMIES HIT AS HARD AS EVER' },
  { name: 'HARD', dmg: 1.5, desc: 'ENEMIES DEAL 1.5X DAMAGE' },
  { name: 'BRUTAL', dmg: 2, desc: 'ENEMIES DEAL DOUBLE DAMAGE' },
];

/** One entry of an enemy's drop table. `chance` is a percentage before the luck bonus. */
export interface Drop {
  item: string; // pickup kind: heartS, heartB, meat, or an ITEMS id
  chance: number;
}

/** Behavior knobs: speed/sight/cooldown are multipliers (1 = normal), the rest are on/off abilities. */
export type Tune = Record<string, number | boolean>;

export interface EnemyStats {
  hp: number;
  atk: number;
  def: number;
  xp: number;
  name: string;
  desc: string; // bestiary flavor text
  drops: Drop[];
  portrait: string; // animation shown in the bestiary
  /** Which enemy's AI and art this one uses. Base enemies are their own base. */
  base?: string;
  /** Palette swap: original sprite color '#rrggbb' → new color. */
  colors?: Record<string, string>;
  tune?: Tune;
}

/** One behavior knob shown in the enemy editor. */
export interface TuneField {
  key: string;
  label: string;
  kind: 'num' | 'bool';
  help: string;
}
const SPEED: TuneField = { key: 'speed', label: 'Move speed', kind: 'num', help: '1 = normal, 0.5 = half speed' };
const SIGHT: TuneField = { key: 'sight', label: 'Sight range', kind: 'num', help: 'How far away it notices you (1 = normal)' };
const COOL: TuneField = { key: 'cooldown', label: 'Attack cooldown', kind: 'num', help: 'Time between attacks (2 = attacks half as often)' };
/** The behavior knobs each base enemy understands (read by enemies.ts). */
export const ENEMY_TUNING: Record<string, TuneField[]> = {
  zombie: [SPEED, SIGHT],
  bat: [SPEED, SIGHT],
  knight: [SPEED, SIGHT, COOL,
    { key: 'shield', label: 'Front shield', kind: 'bool', help: 'Halves hits from the front' },
    { key: 'thrust', label: 'Spear thrust', kind: 'bool', help: 'Stops and lunges with the spear' }],
  skeleton: [SPEED, SIGHT, COOL,
    { key: 'throw', label: 'Throws bones', kind: 'bool', help: 'Lobs bones in an arc' },
    { key: 'hop', label: 'Hops away', kind: 'bool', help: 'Jumps back when you get close' }],
  wisp: [SPEED, SIGHT],
  drowned: [SPEED, SIGHT, COOL,
    { key: 'spit', label: 'Spits fireballs', kind: 'bool', help: 'Fires burning bile along the ground' },
    { key: 'leap', label: 'Lurks and leaps', kind: 'bool', help: 'Hides underwater until you come near. Off: it walks around from the start' }],
  dog: [SPEED, SIGHT, COOL,
    { key: 'pounce', label: 'Pounces', kind: 'bool', help: 'Leaps at you when it gets close' }],
  harpy: [SPEED, SIGHT, COOL,
    { key: 'swoop', label: 'Swoops', kind: 'bool', help: 'Dives at you in an arc' },
    { key: 'darts', label: 'Feather darts', kind: 'bool', help: 'Throws feathers from the air' }],
  wraith: [SPEED, SIGHT, COOL,
    { key: 'toll', label: 'Bell toll', kind: 'bool', help: 'Rings its bell to send a shockwave along the floor' }],
  crawler: [SPEED, SIGHT,
    { key: 'drop', label: 'Drops from ceilings', kind: 'bool', help: 'Lets go of the ceiling when you pass below' }],
  // experimental enemies (0.4.0), see enemies_extra.ts
  hookjaw: [SPEED, SIGHT, COOL,
    { key: 'hook', label: 'Chain hook', kind: 'bool', help: 'Throws a hook that drags you toward it' },
    { key: 'chop', label: 'Cleaver chop', kind: 'bool', help: 'Chops at you when you are close' }],
  eel: [SPEED, SIGHT, COOL,
    { key: 'lunge', label: 'Lunges', kind: 'bool', help: 'Darts at you when it gets close underwater' },
    { key: 'leap', label: 'Leaps out', kind: 'bool', help: 'Jumps out of the water at you when you stand near the surface' }],
  caster: [SIGHT, COOL,
    { key: 'blink', label: 'Teleports', kind: 'bool', help: 'Vanishes and reappears near you between casts' },
    { key: 'homing', label: 'Homing hex', kind: 'bool', help: 'Its hex bolt curves after you. Off: flies straight' }],
  ooze: [SPEED, SIGHT,
    { key: 'split', label: 'Splits', kind: 'bool', help: 'Splits into two smaller oozes when killed' }],
  grub: [SPEED, SIGHT, COOL,
    { key: 'burrow', label: 'Burrows again', kind: 'bool', help: 'Digs back under after an attack. Off: stays on the surface' }],
};
/** Base enemies the editor can make variants of (not the boss). */
export const BASE_ENEMIES = Object.keys(ENEMY_TUNING);
/** The room-entity letter for each base enemy. */
export const ENEMY_LETTER: Record<string, string> = {
  zombie: 'z', bat: 'b', knight: 'k', skeleton: 's', wisp: 'w', drowned: 'd', dog: 'g', harpy: 'y', wraith: 'r', crawler: 'c',
  hookjaw: 'h', eel: 'e', caster: 'm', ooze: 'o', grub: 'u',
};

/** Every knob of a base enemy at its normal value. */
export function defaultTune(base: string): Tune {
  const t: Tune = {};
  for (const f of ENEMY_TUNING[base] || []) t[f.key] = f.kind === 'num' ? 1 : true;
  return t;
}

/** The enemies as written in code, before enemy_edits.json. */
const BASE_ENEMY: Record<string, EnemyStats> = {
  zombie: {
    hp: 22, atk: 11, def: 0, xp: 5, name: 'Grave Zombie', portrait: 'walk',
    desc: 'Castle diggers who never stopped digging. They claw out of the soil when the living pass by.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'heartB', chance: 6 }, { item: 'meat', chance: 4 }, { item: 'potion', chance: 2 }],
  },
  bat: {
    hp: 8, atk: 9, def: 0, xp: 3, name: 'Night Bat', portrait: 'fly',
    desc: 'Roosts in the high vaults and dives at anything warm. Weak, but hard to hit.',
    drops: [{ item: 'heartS', chance: 30 }, { item: 'heartB', chance: 4 }],
  },
  knight: {
    hp: 70, atk: 18, def: 5, xp: 24, name: 'Spear Knight', portrait: 'walk',
    desc: 'A sworn guard still keeping its post. The shield halves blows from the front. Strike its back.',
    drops: [{ item: 'heartB', chance: 12 }, { item: 'potion', chance: 8 }, { item: 'meat', chance: 6 }, { item: 'elixir', chance: 1 }],
  },
  skeleton: {
    hp: 30, atk: 13, def: 2, xp: 11, name: 'Bone Thrower', portrait: 'walk',
    desc: 'Lobs its own bones in high arcs and hops away when you get close.',
    drops: [{ item: 'heartS', chance: 22 }, { item: 'heartB', chance: 8 }, { item: 'potion', chance: 3 }],
  },
  wisp: {
    hp: 18, atk: 14, def: 0, xp: 9, name: 'Grave Wisp', portrait: 'float',
    desc: 'A drifting grave-light. It follows the living slowly and never gives up.',
    drops: [{ item: 'heartS', chance: 15 }, { item: 'heartB', chance: 15 }, { item: 'potion', chance: 2 }],
  },
  drowned: {
    hp: 40, atk: 16, def: 2, xp: 16, name: 'The Drowned', portrait: 'walk',
    desc: 'Lurks under black water, leaps out at passers-by and spits burning bile.',
    drops: [{ item: 'heartB', chance: 10 }, { item: 'potion', chance: 6 }, { item: 'meat', chance: 5 }],
  },
  dog: {
    hp: 28, atk: 13, def: 1, xp: 10, name: 'Wild Dog', portrait: 'run',
    desc: 'The castle hounds, gone feral. They hunt in packs, crouch, then pounce. Jump over the leap.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'meat', chance: 8 }, { item: 'heartB', chance: 5 }],
  },
  harpy: {
    hp: 32, atk: 14, def: 0, xp: 15, name: 'Harpy', portrait: 'fly',
    desc: 'Came with the ashen moon and nests in the belfry. Swoops at you and throws feather darts.',
    drops: [{ item: 'heartS', chance: 20 }, { item: 'heartB', chance: 10 }, { item: 'potion', chance: 3 }],
  },
  wraith: {
    hp: 44, atk: 15, def: 2, xp: 20, name: 'Bell Wraith', portrait: 'float',
    desc: 'A dead bell-ringer still at work. Its toll rolls along the floor as a shockwave. Jump it.',
    drops: [{ item: 'heartB', chance: 14 }, { item: 'potion', chance: 6 }, { item: 'elixir', chance: 1 }],
  },
  crawler: {
    hp: 26, atk: 13, def: 3, xp: 13, name: 'Frost Crawler', portrait: 'crawl',
    desc: 'An ice beetle from the frozen waterworks. Clings to ceilings and drops on whatever passes below.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'heartB', chance: 6 }, { item: 'meat', chance: 4 }],
  },
  hookjaw: {
    hp: 60, atk: 16, def: 3, xp: 22, name: 'Hookjaw', portrait: 'walk',
    desc: 'A gaoler in a rusted iron muzzle. It flings a chain hook to drag prey to its cleaver. Whip the hook out of the air.',
    drops: [{ item: 'heartB', chance: 12 }, { item: 'meat', chance: 8 }, { item: 'potion', chance: 5 }],
  },
  eel: {
    hp: 30, atk: 14, def: 1, xp: 14, name: 'Mire Eel', portrait: 'swim',
    desc: 'Pale and blind, it hunts by the ripples of anything that swims. Faster than you in the water. Stay out of it, or fight on the shore.',
    drops: [{ item: 'heartS', chance: 22 }, { item: 'heartB', chance: 8 }, { item: 'meat', chance: 6 }],
  },
  caster: {
    hp: 36, atk: 15, def: 1, xp: 20, name: 'Gloomcaster', portrait: 'idle',
    desc: 'A hollow-eyed acolyte who steps through shadow. Its hex slows your limbs and shatters wards. Strike while it casts.',
    drops: [{ item: 'heartB', chance: 15 }, { item: 'potion', chance: 6 }, { item: 'elixir', chance: 1 }],
  },
  ooze: {
    hp: 34, atk: 12, def: 0, xp: 6, name: 'Rot Ooze', portrait: 'big',
    desc: 'Grave rot that learned to move. Cut it and each piece crawls on. Only the smallest bits truly die.',
    drops: [{ item: 'heartS', chance: 18 }, { item: 'heartB', chance: 4 }],
  },
  grub: {
    hp: 32, atk: 15, def: 2, xp: 15, name: 'Grave Grub', portrait: 'wriggle',
    desc: 'A blind burrower. Watch for the moving mound of earth, then jump when it trembles. It lies helpless for a moment after it strikes.',
    drops: [{ item: 'heartS', chance: 20 }, { item: 'meat', chance: 8 }, { item: 'heartB', chance: 6 }],
  },
  wyrm: {
    hp: 900, atk: 22, def: 4, xp: 600, name: 'Ossuary Wyrm', portrait: 'skull',
    desc: 'A serpent of fused bone that burrows through stone. The tail is armored. Aim for the skull.',
    drops: [],
  },
  hound: {
    hp: 1100, atk: 22, def: 4, xp: 800, name: 'Gnarlfang', portrait: 'walk',
    desc: 'The two-headed alpha of the kennels. It charges into walls and stuns itself. Strike while it reels. It does not stay dead: it rises again from its own ashes, burning.',
    drops: [],
  },
  bellmother: {
    hp: 1000, atk: 22, def: 3, xp: 850, name: 'The Bell-Mother', portrait: 'fly',
    desc: 'Matriarch of the harpies. Her toll shakes the belfry and sends shockwaves along the floor.',
    drops: [],
  },
};

/** What the enemy editor saves: changed base enemies, and variants (any id whose `base` is another enemy). */
export type EnemyEdits = Record<string, EnemyStats>;

/** The code enemies (deep copied, so editing them never changes the originals). */
export function baseEnemies(): Record<string, EnemyStats> {
  return JSON.parse(JSON.stringify(BASE_ENEMY));
}

/**
 * Code enemies with the editor's changes applied. Each variant is listed right after
 * its base enemy so the bestiary groups them. The boss stays last.
 */
export function buildEnemies(edits: EnemyEdits): Record<string, EnemyStats> {
  const base = baseEnemies();
  for (const [id, st] of Object.entries(base)) {
    st.base = id;
    if (edits[id]) base[id] = { ...st, ...edits[id], base: id };
  }
  const out: Record<string, EnemyStats> = {};
  for (const id of Object.keys(base)) {
    out[id] = base[id];
    for (const [vid, v] of Object.entries(edits))
      if (!base[vid] && v.base === id && ENEMY_TUNING[id]) out[vid] = { ...v, drops: v.drops || [] };
  }
  return out;
}

export const ENEMY: Record<string, EnemyStats> = buildEnemies(ENEMY_EDITS as unknown as EnemyEdits);

/** Display names for pickups that are not inventory items. */
export const PICKUP_NAMES: Record<string, string> = { heartS: 'Small Heart', heartB: 'Big Heart', meat: 'Roast Meat' };

/** Luck multiplies every drop chance: LCK 10 gives +20%. */
export function dropChance(base: number, lck: number) {
  return base * (1 + lck / 50);
}

export function xpForLevel(lv: number) {
  return Math.round(25 * Math.pow(lv, 1.75));
}
