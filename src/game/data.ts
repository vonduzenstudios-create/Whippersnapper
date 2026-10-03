// Items, equipment and enemy stat tables.
// The enemy editor (enemies.html) saves changed and new enemies to enemy_edits.json,
// which is applied on top of the code table below.
import ENEMY_EDITS from './enemy_edits.json';

export type Slot = 'whip' | 'shield' | 'armor' | 'acc' | 'use' | 'sub' | 'max' | 'relic';

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
  fire?: boolean;
  frost?: boolean; // icy blue chain (looks only)
  heal?: number;
  /** Shields: the share of a blocked melee hit that the shield soaks up (0.2 = 20% less damage). */
  block?: number;
  /** Shields: which painted face the raised shield shows (see the relicfx sheet). */
  look?: 'wood' | 'iron' | 'bone' | 'ash';
  /** Accessories: hits no longer knock you back. */
  noKnock?: boolean;
}

/** Every whip reaches the same distance (0.17.0): upgrades add damage and elements, not reach. */
export const WHIP_LEN = 56;

export const ITEMS: Record<string, ItemDef> = {
  whip_leather: { id: 'whip_leather', name: 'Leather Whip', slot: 'whip', icon: 'whip', desc: 'A worn hunting whip.', atk: 6 },
  whip_iron: { id: 'whip_iron', name: 'Iron Chain', slot: 'whip', icon: 'whip', desc: 'Heavy linked iron. ATK+12', atk: 12 },
  whip_barbed: { id: 'whip_barbed', name: 'Barbed Chain', slot: 'whip', icon: 'whip', desc: 'Hooked barbs tear flesh. ATK+18', atk: 18 },
  whip_ember: { id: 'whip_ember', name: 'Ember Chain', slot: 'whip', icon: 'whip', desc: 'Forged in a dying star. Burns. ATK+26', atk: 26, fire: true },
  whip_rime: { id: 'whip_rime', name: 'Rime Chain', slot: 'whip', icon: 'whip', desc: 'Cooled in water that never moves. ATK+32', atk: 32, frost: true },
  // shields (off hand): hold SHIELD to raise one. Only the buckler is given out so far;
  // the others exist but aren't placed in the world yet.
  shield_buckler: { id: 'shield_buckler', name: 'Wooden Buckler', slot: 'shield', icon: 'shieldWood', look: 'wood', desc: 'Oak rimmed in iron. Blocks 50% of melee.', block: 0.5 },
  shield_heater: { id: 'shield_heater', name: 'Iron Heater', slot: 'shield', icon: 'shieldIron', look: 'iron', desc: 'A soldier\'s shield. Blocks 65% of melee. DEF+2', block: 0.65, def: 2 },
  shield_ossuary: { id: 'shield_ossuary', name: 'Ossuary Pavise', slot: 'shield', icon: 'shieldBone', look: 'bone', desc: 'Skulls set in black iron. Blocks 78% of melee. CON+3', block: 0.78, con: 3 },
  shield_ashen: { id: 'shield_ashen', name: 'Ashen Aegis', slot: 'shield', icon: 'shieldAsh', look: 'ash', desc: 'Still warm from the pyre. Blocks 90% of melee. DEF+5', block: 0.9, def: 5 },
  armor_coat: { id: 'armor_coat', name: 'Hunter Coat', slot: 'armor', icon: 'armor', desc: 'Oiled leather coat. DEF+2', def: 2 },
  armor_mail: { id: 'armor_mail', name: "Hunter's Mail", slot: 'armor', icon: 'armor', desc: 'Chain mail under leather. DEF+6', def: 6 },
  armor_bone: { id: 'armor_bone', name: 'Bone Plate', slot: 'armor', icon: 'armor', desc: 'Grim but sturdy. DEF+10 LCK-2', def: 10, lck: -2 },
  armor_raven: { id: 'armor_raven', name: 'Raven Mail', slot: 'armor', icon: 'armor', desc: 'Black scale that drinks the cold. DEF+15', def: 15 },
  acc_fang: { id: 'acc_fang', name: 'Hound Fang', slot: 'acc', icon: 'ring', desc: 'A trophy of the hunt. STR+3 LCK+3', str: 3, lck: 3 },
  acc_bell: { id: 'acc_bell', name: 'Bell Charm', slot: 'acc', icon: 'ring', desc: 'Its chime steadies the heart. CON+6', con: 6 },
  acc_seal: { id: 'acc_seal', name: "Archivist's Seal", slot: 'acc', icon: 'ring', desc: 'Wax stamped by the keeper of the Ashen Library. STR+2 CON+2 LCK+2', str: 2, con: 2, lck: 2 },
  acc_moon: { id: 'acc_moon', name: 'Moon Charm', slot: 'acc', icon: 'ring', desc: 'Silver crescent. LCK+6', lck: 6 },
  acc_blood: { id: 'acc_blood', name: 'Blood Ring', slot: 'acc', icon: 'ring', desc: 'Warm to the touch. STR+4', str: 4 },
  acc_garnet: { id: 'acc_garnet', name: 'Garnet Brooch', slot: 'acc', icon: 'ring', desc: 'A ward against harm. CON+4', con: 4 },
  acc_rootstone: { id: 'acc_rootstone', name: 'Rootstone', slot: 'acc', icon: 'rootstone', desc: 'A grave-stone shard grown through with roots. Hits no longer knock you back.', noKnock: true },
  // sold only in Pell's shop (the Reader's Nook)
  acc_shard: { id: 'acc_shard', name: 'Mirror Shard', slot: 'acc', icon: 'ring', desc: 'A sliver of the Mirror Heart. It shows you a moment early. STR+4 LCK+4', str: 4, lck: 4 },
  acc_lens: { id: 'acc_lens', name: 'Reading Lens', slot: 'acc', icon: 'ring', desc: 'A monocle some reader left on a desk. Things hidden come easier. LCK+5 CON+1', lck: 5, con: 1 },
  potion: { id: 'potion', name: 'Potion', slot: 'use', icon: 'potion', desc: 'Restores 40 HP.', heal: 40 },
  elixir: { id: 'elixir', name: 'Elixir', slot: 'use', icon: 'potion', desc: 'Restores all HP.', heal: 9999 },
  sub_holy: { id: 'sub_holy', name: 'Holy Water', slot: 'sub', icon: 'holy', desc: 'Bursts into blue flame. 1 heart.' },
  sub_cross: { id: 'sub_cross', name: 'Cross', slot: 'sub', icon: 'cross', desc: 'Flies out and returns. 2 hearts.' },
  sub_knife: { id: 'sub_knife', name: 'Throwing Knife', slot: 'sub', icon: 'knife', desc: 'Fast and light. Marks a foe: the next hit ignores half its DEF. 1 heart.' },
  life_up: { id: 'life_up', name: 'Life Max Up', slot: 'max', icon: 'lifeUp', desc: 'Max HP +15' },
  heart_up: { id: 'heart_up', name: 'Heart Max Up', slot: 'max', icon: 'heartUp', desc: 'Max hearts +10' },
  // minor upgrades hidden in secret corners
  str_up: { id: 'str_up', name: 'Might Seed', slot: 'max', icon: 'strUp', desc: 'STR +1 for good' },
  con_up: { id: 'con_up', name: 'Ward Seed', slot: 'max', icon: 'conUp', desc: 'CON +1 for good' },
  relic_grapple: { id: 'relic_grapple', name: 'Chain Grapple', slot: 'relic', icon: 'relic', desc: 'Whip iron rings to swing.' },
  relic_sinew: { id: 'relic_sinew', name: 'Sinew Coil', slot: 'relic', icon: 'sinew', desc: 'On a ring, hold DOWN to stretch the chain; let go to sling off.' },
  relic_mantle: { id: 'relic_mantle', name: 'Raven Mantle', slot: 'relic', icon: 'mantle', desc: 'Jump again in midair.' },
  relic_greaves: { id: 'relic_greaves', name: 'Frostrunner Greaves', slot: 'relic', icon: 'greaves', desc: 'Down + dash to slide.' },
  // experimental relics (0.4.0): not placed in the world yet, try them in the test chamber (#test)
  relic_shroud: { id: 'relic_shroud', name: 'Duskwing Shroud', slot: 'relic', icon: 'shroud', desc: 'Hold jump while falling to glide.' },
  relic_pearl: { id: 'relic_pearl', name: 'Undertow Pearl', slot: 'relic', icon: 'pearl', desc: 'Move freely and at full speed in water.' },
  relic_ward: { id: 'relic_ward', name: 'Ashglass Ward', slot: 'relic', icon: 'ward', desc: 'Raise a shield bubble. 3 hearts.' },
};

/**
 * What Pell sells in the Reader's Nook: price in gold, and how many he has. Stock doesn't
 * come back (Hunter.bought counts what's been bought).
 */
export const SHOP: { item: string; price: number; stock: number }[] = [
  { item: 'potion', price: 40, stock: 5 },
  { item: 'elixir', price: 250, stock: 1 },
  { item: 'acc_lens', price: 180, stock: 1 },
  { item: 'shield_heater', price: 240, stock: 1 },
  { item: 'acc_rootstone', price: 320, stock: 1 },
];

export const SUB_COST: Record<string, number> = { sub_holy: 1, sub_cross: 2, sub_knife: 1 };
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
  /**
   * A quick recolor for variants written in code (CODE_VARIANTS): turn every color's hue by
   * `h` degrees and scale its saturation and lightness. Ignored when `colors` is set.
   */
  shift?: { h: number; s: number; l: number };
  tune?: Tune;
  /** A boss that only exists in the test chamber so far: kept out of the bestiary. */
  test?: boolean;
}

/** One behavior knob shown in the enemy editor. */
export interface TuneField {
  key: string;
  label: string;
  kind: 'num' | 'bool';
  help: string;
  /** The normal value: a number knob's (default 1, a multiplier) or an on/off switch's (default on). Number knobs also have the editor's step and minimum. */
  def?: number | boolean;
  step?: number;
  min?: number;
}
const SPEED: TuneField = { key: 'speed', label: 'Move speed', kind: 'num', help: '1 = normal, 0.5 = half speed' };
const SIGHT: TuneField = { key: 'sight', label: 'Sight range', kind: 'num', help: 'How far away it notices you (1 = normal)' };
const COOL: TuneField = { key: 'cooldown', label: 'Attack cooldown', kind: 'num', help: 'Time between attacks (2 = attacks half as often)' };
/** The behavior knobs each base enemy understands (read by enemies.ts). */
export const ENEMY_TUNING: Record<string, TuneField[]> = {
  zombie: [SPEED, SIGHT],
  bat: [SPEED, SIGHT],
  knight: [SPEED, SIGHT, COOL,
    { key: 'shield', label: 'Front shield', kind: 'bool', help: 'Stops 90% of every hit from the front. Only its back (or a knight mid-turn) takes full damage' },
    { key: 'thrust', label: 'Poleaxe jab', kind: 'bool', help: 'Stops and jabs with the spike of its poleaxe' }],
  skeleton: [SPEED, SIGHT, COOL,
    { key: 'throw', label: 'Throws bones', kind: 'bool', help: 'Lobs bones in an arc' },
    { key: 'hop', label: 'Hops away', kind: 'bool', help: 'Jumps back when you get close' }],
  wisp: [SPEED, SIGHT,
    { key: 'drip', label: 'Drips flames', kind: 'bool', help: 'Flames drip off it while it hunts you and burn on the floor for a moment' }],
  drowned: [SPEED, SIGHT, COOL,
    { key: 'spit', label: 'Spits fireballs', kind: 'bool', help: 'Fires burning bile along the ground' },
    { key: 'leap', label: 'Lurks and leaps', kind: 'bool', help: 'Hides underwater until you come near. Off: it walks around from the start' }],
  dog: [SPEED, SIGHT, COOL,
    { key: 'pounce', label: 'Pounces', kind: 'bool', help: 'Leaps at you when it gets close' }],
  harpy: [SPEED, SIGHT, COOL,
    { key: 'swoop', label: 'Swoops', kind: 'bool', help: 'Dives at you in an arc' },
    { key: 'darts', label: 'Feather darts', kind: 'bool', help: 'Throws feathers from the air' }],
  wraith: [SPEED, SIGHT, COOL,
    { key: 'toll', label: 'Bell toll', kind: 'bool', help: 'Rings its bell: the sound hurts you up close and sends a shockwave along the floor' },
    { key: 'reverb', label: 'Reverb', kind: 'bool', help: 'Hitting it rings its bell back at you, out to 80% of your whip reach. Strike from the tip to stay clear' }],
  crawler: [SPEED, SIGHT,
    { key: 'drop', label: 'Drops from ceilings', kind: 'bool', help: 'Lets go of the ceiling when you pass below' },
    { key: 'trail', label: 'Ice trail', kind: 'bool', help: 'Leaves ice where it walks: standing on it slows you more and more, then freezes you solid. Jumping keeps you clear' }],
  // experimental enemies (0.4.0), see enemies_extra.ts
  hookjaw: [SPEED, SIGHT, COOL,
    { key: 'hook', label: 'Chain hook', kind: 'bool', help: 'Throws a hook that drags you toward it' },
    { key: 'chop', label: 'Cleaver chop', kind: 'bool', help: 'Chops at you when you are close, knocking you back out to hook range' }],
  eel: [SPEED, SIGHT, COOL,
    { key: 'lunge', label: 'Lunges', kind: 'bool', help: 'Darts at you when it gets close underwater' },
    { key: 'leap', label: 'Leaps out', kind: 'bool', help: 'Jumps out of the water at you when you stand near the surface' }],
  caster: [SIGHT, COOL,
    { key: 'blink', label: 'Teleports', kind: 'bool', help: 'Vanishes and reappears near you between casts' },
    { key: 'homing', label: 'Homing hex', kind: 'bool', help: 'Its hex bolt curves after you. Off: flies straight' },
    { key: 'disarm', label: 'Hex disarms', kind: 'bool', help: 'A hex that hits you also seals your whip in a bubble that floats off for 3-5 s. Touch it to pop it early' },
    { key: 'hardcore', label: 'Hardcore disarm', kind: 'bool', def: false, help: 'On: when the bubble pops by itself your whip drops to the floor and stays there until you pick it up. Off: it flies back to you' }],
  ooze: [SPEED, SIGHT,
    { key: 'split', label: 'Splits', kind: 'bool', help: 'Splits into two smaller oozes when killed' }],
  grub: [SPEED, SIGHT, COOL,
    { key: 'burrow', label: 'Burrows again', kind: 'bool', help: 'Digs back under after an attack (when it does not cocoon). Off: stays on the surface' },
    { key: 'evolve', label: 'Hatches moths', kind: 'bool', help: 'Left on the surface for 2 s it spins a cocoon, and 1.7 s later three Grave Moths burst out. Kill it before it hatches' }],
  moth: [SPEED, SIGHT, COOL,
    { key: 'poison', label: 'Poison powder', kind: 'bool', help: 'Bursting on you leaves a poison that drains your HP every half second (it never takes your last HP)' },
    { key: 'poisonTime', label: 'Poison length', kind: 'num', help: 'How long the poison lasts (1 = 5 s)' }],
  hand: [SIGHT, COOL,
    { key: 'mash', label: 'Presses to escape', kind: 'num', def: 10, step: 1, min: 1, help: 'Left, right or jump presses it takes to break its grip (it lets go by itself after 2.5 s)' },
    { key: 'leash', label: 'Leash (tiles)', kind: 'num', def: 0, step: 1, min: 0, help: 'How far it may follow you underground from where it was placed. 0 = anywhere along its floor' },
    { key: 'trip', label: 'Trips runners', kind: 'bool', help: 'Running over it trips you onto your face instead of holding you' }],
  devourer: [SPEED, SIGHT, COOL,
    { key: 'hook', label: 'Tongue lash', kind: 'bool', help: 'Lashes out its barbed tongue to drag you into its jaws' },
    { key: 'chop', label: 'Tentacle whirl', kind: 'bool', help: 'Spins its tentacles when you are close and slaps you far away, out to tongue range' },
    { key: 'mash', label: 'Presses to escape', kind: 'num', def: 10, step: 1, min: 1, help: 'Left, right or jump presses it takes to tear free of its bite. It keeps biting until you do' }],
  // the Ashen Library (0.6.0), see enemies_library.ts
  tome: [SPEED, SIGHT, COOL,
    { key: 'spew', label: 'Spits pages', kind: 'bool', help: 'Rears back, opens wide, then spits a fan of five pages at you' }],
  chair: [SPEED, SIGHT, COOL,
    { key: 'charge', label: 'Charges', kind: 'bool', help: 'Tips back, then spins straight at you' },
    { key: 'stomp', label: 'Stomps', kind: 'bool', help: 'Rises over you and drops down legs first' }],
  librarian: [SPEED, SIGHT, COOL,
    { key: 'throw', label: 'Throws books', kind: 'bool', help: 'Half in an arc, half straight at you' },
    { key: 'hop', label: 'Hops away', kind: 'bool', help: 'Jumps back when you get close' }],
  serpent: [SPEED, SIGHT, COOL,
    { key: 'spit', label: 'Spits venom', kind: 'bool', help: 'Rears up and spits a glob of venom that poisons' },
    { key: 'strike', label: 'Strikes', kind: 'bool', help: 'Coils, then darts along the floor at you' }],
  spider: [SPEED, SIGHT, COOL,
    { key: 'spit', label: 'Spits webs', kind: 'bool', help: 'Spits a web glob that slows you while it hangs on its thread' },
    { key: 'climb', label: 'Climbs back up', kind: 'bool', help: 'Climbs its thread back to the ceiling after a while. Off: it stays down' }],
};
/** Base enemies the editor can make variants of (not the boss). */
export const BASE_ENEMIES = Object.keys(ENEMY_TUNING);
/** The room-entity letter for each base enemy. */
export const ENEMY_LETTER: Record<string, string> = {
  zombie: 'z', bat: 'b', knight: 'k', skeleton: 's', wisp: 'w', drowned: 'd', dog: 'g', harpy: 'y', wraith: 'r', crawler: 'c',
  hookjaw: 'h', eel: 'e', caster: 'm', ooze: 'o', grub: 'u', hand: 'x', tome: 't', chair: 'a', librarian: 'l', spider: 'p', devourer: 'v', moth: 'f', serpent: 'q',
};

/** Every knob of a base enemy at its normal value. */
export function defaultTune(base: string): Tune {
  const t: Tune = {};
  for (const f of ENEMY_TUNING[base] || []) t[f.key] = f.def ?? (f.kind === 'num' ? 1 : true);
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
    hp: 70, atk: 18, def: 5, xp: 24, name: 'Poleaxe Knight', portrait: 'walk',
    desc: 'A sworn guard still keeping its post. Its shield turns almost any blow from the front, so get round to its back. It turns slowly, raising its poleaxe overhead as it comes round, then brings it down hard. Strike during the turn and get clear before the chop.',
    drops: [{ item: 'heartB', chance: 12 }, { item: 'potion', chance: 8 }, { item: 'meat', chance: 6 }, { item: 'elixir', chance: 1 }],
  },
  skeleton: {
    hp: 30, atk: 13, def: 2, xp: 11, name: 'Bone Thrower', portrait: 'walk',
    desc: 'Lobs its own bones in high arcs and hops away when you get close.',
    drops: [{ item: 'heartS', chance: 22 }, { item: 'heartB', chance: 8 }, { item: 'potion', chance: 3 }],
  },
  wisp: {
    hp: 18, atk: 14, def: 0, xp: 9, name: 'Grave Wisp', portrait: 'float',
    desc: 'A drifting grave-light. It follows the living slowly and never gives up, and while it hunts, flames drip from it and burn where they land.',
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
    desc: 'A dead bell-ringer still at work. When it lifts its bell, back off: the toll itself hurts anyone close by, and it rolls on along the floor as a shockwave. Jump that. Every blow makes the bell ring back, so strike it from the very tip of your whip.',
    drops: [{ item: 'heartB', chance: 14 }, { item: 'potion', chance: 6 }, { item: 'elixir', chance: 1 }],
  },
  crawler: {
    hp: 26, atk: 13, def: 3, xp: 13, name: 'Frost Crawler', portrait: 'crawl',
    desc: 'An ice beetle from the frozen waterworks. It goes its own way and pays you no mind, crawling up walls, across ceilings and round every corner, and drops on whatever passes below. It leaves a trail of ice behind it. Stand on the ice too long and you slow to a crawl, then freeze solid. Hop across it instead.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'heartB', chance: 6 }, { item: 'meat', chance: 4 }],
  },
  hookjaw: {
    hp: 60, atk: 16, def: 3, xp: 22, name: 'Hookjaw', portrait: 'walk',
    desc: 'A gaoler in a rusted iron muzzle. It flings a chain hook to drag prey to its cleaver. Whip the hook out of the air.',
    drops: [{ item: 'heartB', chance: 12 }, { item: 'meat', chance: 8 }, { item: 'potion', chance: 5 }],
  },
  devourer: {
    hp: 110, atk: 20, def: 4, xp: 40, name: 'Devourer', portrait: 'walk',
    desc: 'Little more than a mouth on legs. Its barbed tongue lashes out and drags you in, and its whole body opens to swallow your head. It does not let go. Mash to tear free, or be eaten a bite at a time. Get too close and it whirls its tentacles to slap you away, then reaches for you again.',
    drops: [{ item: 'heartB', chance: 18 }, { item: 'meat', chance: 10 }, { item: 'potion', chance: 8 }, { item: 'elixir', chance: 2 }],
  },
  eel: {
    hp: 30, atk: 14, def: 1, xp: 14, name: 'Mire Eel', portrait: 'swim',
    desc: 'Pale and blind, it hunts by the ripples of anything that swims. Faster than you in the water. Stay out of it, or fight on the shore.',
    drops: [{ item: 'heartS', chance: 22 }, { item: 'heartB', chance: 8 }, { item: 'meat', chance: 6 }],
  },
  caster: {
    hp: 36, atk: 15, def: 1, xp: 20, name: 'Gloomcaster', portrait: 'idle',
    desc: 'A hollow-eyed acolyte who steps through shadow. Its hex slows your limbs, shatters wards and tears the whip from your hand, sealed in a drifting bubble: chase it down and touch it to pop it. Strike while it casts.',
    drops: [{ item: 'heartB', chance: 15 }, { item: 'potion', chance: 6 }, { item: 'elixir', chance: 1 }],
  },
  ooze: {
    hp: 34, atk: 12, def: 0, xp: 6, name: 'Rot Ooze', portrait: 'big',
    desc: 'Grave rot that learned to move. Cut it and each piece crawls on. Only the smallest bits truly die.',
    drops: [{ item: 'heartS', chance: 18 }, { item: 'heartB', chance: 4 }],
  },
  grub: {
    hp: 32, atk: 15, def: 2, xp: 15, name: 'Grave Grub', portrait: 'wriggle',
    desc: 'A blind burrower. Watch for the moving mound of earth, then jump when it trembles. It lies helpless for a moment after it strikes: kill it then, or it wraps itself in a cocoon and hatches a swarm of Grave Moths.',
    drops: [{ item: 'heartS', chance: 20 }, { item: 'meat', chance: 8 }, { item: 'heartB', chance: 6 }],
  },
  moth: {
    hp: 8, atk: 8, def: 0, xp: 5, name: 'Grave Moth', portrait: 'fly',
    desc: 'What a Grave Grub becomes when it is left lying too long. They come in threes, flitting at you in mad zigzags, and burst into a cloud of poison powder on whatever they touch. One hit kills one.',
    drops: [{ item: 'heartS', chance: 15 }],
  },
  hand: {
    hp: 20, atk: 0, def: 0, xp: 8, name: 'Gravehand', portrait: 'reach',
    desc: 'A dead hand that swims under the floor after you. Watch its furrow of soil and listen for its nails: it keeps pace with you, then comes faster than you can run. It feels you only through the ground, so leaping throws it off. When the dirt rumbles at your feet, jump! It closes around your ankles and holds on: mash left, right or jump to break free. Run over it and it trips you flat.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'heartB', chance: 5 }],
  },
  tome: {
    hp: 24, atk: 14, def: 1, xp: 12, name: 'Rustling Tome', portrait: 'flap',
    desc: 'A grimoire the Archivist chained to its shelf. It slept spine-out among the others until the ash woke it. A whole shelf tears loose together. Knock them out of the air, and when one hangs still and starts to glow, get out from in front of it.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'heartB', chance: 8 }, { item: 'potion', chance: 3 }],
  },
  chair: {
    hp: 30, atk: 14, def: 2, xp: 14, name: 'Restless Chair', portrait: 'float',
    desc: 'A reading chair that got tired of waiting for its reader. It stands among the others, perfectly still, until you come close. Then it kicks off the floor and comes for you, spinning or stamping.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'meat', chance: 8 }, { item: 'heartB', chance: 6 }],
  },
  librarian: {
    hp: 30, atk: 13, def: 2, xp: 12, name: 'Bone Librarian', portrait: 'walk',
    desc: 'Still shelving the Archivist\'s books, centuries after the last reader left. Disturb it and it throws them at you: some lobbed high, some straight at your head.',
    drops: [{ item: 'heartS', chance: 22 }, { item: 'heartB', chance: 8 }, { item: 'potion', chance: 3 }],
  },
  spider: {
    hp: 26, atk: 12, def: 1, xp: 13, name: 'Gallows Spider', portrait: 'hang',
    desc: 'Lowers itself on a silk line to look you in the eye, then spits webs that bind your legs. Cut the thread with the whip and it drops to the floor.',
    drops: [{ item: 'heartS', chance: 24 }, { item: 'heartB', chance: 7 }, { item: 'potion', chance: 3 }],
  },
  serpent: {
    hp: 28, atk: 14, def: 1, xp: 14, name: 'Temple Asp', portrait: 'slither',
    desc: 'The temple was built for them, and they never left. It coils before it strikes: step back or jump the dart. From further off it rears up and spits venom that eats at you for a while.',
    drops: [{ item: 'heartS', chance: 24 }, { item: 'heartB', chance: 7 }, { item: 'potion', chance: 3 }],
  },
  wyrm: {
    hp: 900, atk: 22, def: 4, xp: 600, name: 'Ossuary Wyrm', portrait: 'skull',
    desc: 'A serpent of fused bone that burrows through stone. The tail is armored. Aim for the skull.',
    drops: [],
  },
  hound: {
    hp: 650, atk: 22, def: 4, xp: 800, name: 'Gnarlfang', portrait: 'walk',
    desc: 'The two-headed alpha of the kennels. It charges into walls and stuns itself. Strike while it reels. It does not stay dead: it rises again from its own ashes, burning.',
    drops: [],
  },
  bellmother: {
    hp: 300, atk: 22, def: 3, xp: 850, name: 'The Bell-Mother', portrait: 'fly',
    desc: 'Matriarch of the harpies. Nothing reaches her while she sings. Listen to her phrase, ring it back on the three bells, and her voice breaks.',
    drops: [],
  },
  leviathan: {
    hp: 600, atk: 22, def: 3, xp: 900, name: 'The Sump Leviathan', portrait: 'swim',
    desc: 'A blind eel grown vast in the black water under the castle, armored everywhere but the belly. Open both sluice wheels to drain its pool. When it floods the cistern for good, catch the harpoon in its back and ride it onto the spikes.',
    drops: [],
  },
  gorgon: {
    hp: 300, atk: 23, def: 3, xp: 950, name: 'Ysolde, the Stone Bride', portrait: 'idle',
    desc: 'Half woman, half serpent, crowned with asps. Her gaze is a beam: hide behind her petrified suitors while they last, or raise your shield just as it lands and send it back to her.',
    drops: [],
  },
  colossus: {
    hp: 600, atk: 26, def: 6, xp: 1200, name: 'The Hollow Colossus', portrait: 'idle',
    desc: 'A suit of armor five times the height of a man, with nothing inside but furnace light. Cold, it only rings. Stoke the bellows, bait a glowing piece onto the anvil and forge it to pieces. Then go in after the heart.',
    drops: [],
  },
  mirror: {
    hp: 600, atk: 24, def: 3, xp: 1100, name: 'The Mirror Heart', portrait: 'idle',
    desc: 'It wears your shape, cut from glass, and does what you did a moment ago. Stand where you want it to stand. Then it hides among the mirrors, and the world turns over.',
    drops: [],
  },
  yeti: {
    hp: 300, atk: 25, def: 4, xp: 1000, name: 'Old Rimehide', portrait: 'idle',
    desc: 'The white beast of the summit, too thick-furred for the chain and too heavy for the frozen lake it dens on. Let its boulders crack a slab, then make it jump there.',
    drops: [],
  },
  // ---- trial bosses (0.27.0): reworks that only exist in the test chamber so far (`test`)
  yeti2: {
    hp: 400, atk: 25, def: 4, xp: 1000, name: 'Old Rimehide (Frozen Falls)', portrait: 'walk', test: true,
    desc: 'Trial fight. His fur turns the chain. Break thin ice under his leap, bait his charge into the frozen falls, or lure him over a vent as it blows. At half health he tears a pillar of ice loose.',
    drops: [],
  },
  leviathan2: {
    hp: 600, atk: 22, def: 3, xp: 900, name: 'The Sump Leviathan (Sunken Lock)', portrait: 'jaw1', test: true,
    desc: 'Trial fight. In the lock: drain the pool with both sluice wheels, beach it on the weir, or drop the lock gate on it. Then it floods the well: tangle its rise in a chain, drop the counterweight on it, or ride its harpoon into the spike racks.',
    drops: [],
  },
  gorgon2: {
    hp: 400, atk: 23, def: 3, xp: 950, name: 'Ysolde (Sunken Rotunda)', portrait: 'idle', test: true,
    desc: 'Trial fight. Her gaze is a beam. Turn a bronze mirror to face her and it throws the gaze back, or raise your shield as it lands, or bait her tail into the stone step. At half health she tears off the veil and looks both ways at once.',
    drops: [],
  },
  colossus2: {
    hp: 600, atk: 26, def: 6, xp: 1200, name: 'The Hollow Colossus (Foundry)', portrait: 'walk', test: true,
    desc: 'Trial fight. Plate only rings. Bait his cleave onto the floor grate so the blade sticks, tip the crane ladle on him, or get his hot plate into the quench trough. At half health the plate bursts and the fire inside fights on.',
    drops: [],
  },
  yeti3: {
    hp: 400, atk: 25, def: 4, xp: 1000, name: 'Old Rimehide (Boneyard)', portrait: 'walk', test: true,
    desc: 'Trial fight. Bait a slam at the foot of a rib to jam his arm, drop the hanging tusk on him, whip a carcass off its hook so he stops to eat, or make him leap into the skull. At half health he takes up the tusk.',
    drops: [],
  },
  archivist: {
    hp: 600, atk: 23, def: 3, xp: 1050, name: 'The Head Archivist', portrait: 'idle',
    desc: 'He never left his lectern, and he writes what happens next. Blot your name out of his sentence while the ink is wet and the story happens to him instead.',
    drops: [],
  },
  // ---- the ten trial bosses (0.27.0): not placed in the world, fought from TEST ENEMY. 600 HP = 3 + 3 openings
  castellan: {
    hp: 600, atk: 24, def: 0, xp: 1100, name: 'The Pendulum Castellan', portrait: 'idle',
    desc: "A clockwork knight who keeps the tower's hour. Bait his chop onto a floor gear, let the pendulum catch him mid-swing, or get behind him after his sweep and unwind the key in his back.",
    drops: [],
  },
  marionette: {
    hp: 600, atk: 23, def: 0, xp: 1100, name: 'Lady Marrow', portrait: 'idle',
    desc: "A porcelain dancer on strings. Whip a string while it is pulled taut, or drop a sandbag on her. When the strings are gone, the hands that held them come down.",
    drops: [],
  },
  saint: {
    hp: 600, atk: 20, def: 0, xp: 1150, name: 'The Censer Saint', portrait: 'idle',
    desc: "His sermon is a storm of cinders fed by four hanging censers. Snuff all four and he chokes; or strike his own censer at the end of its swing and send it back to him.",
    drops: [],
  },
  stalker: {
    hp: 600, atk: 25, def: 0, xp: 1150, name: 'The Umbral Stalker', portrait: 'prowl',
    desc: "It cannot be struck in the dark and cannot bear the light. Swing a lantern over it, make it lunge into a lit patch of floor, or throw holy fire at its feet.",
    drops: [],
  },
  reaper: {
    hp: 600, atk: 25, def: 0, xp: 1150, name: 'The Harvest Reaper', portrait: 'idle',
    desc: "A scarecrow with a scythe and a lantern for a heart. Crouch in the tall wheat and strike him from behind while he searches, or set the wheat alight under him. He cuts his own cover down.",
    drops: [],
  },
  baron: {
    hp: 600, atk: 24, def: 0, xp: 1200, name: 'The Powder Baron', portrait: 'idle',
    desc: "The last gunner of the east rampart. Whip his bombs back before the fuse runs out, turn his rolling kegs round, or stand so his cannon hits his own powder.",
    drops: [],
  },
  starreader: {
    hp: 600, atk: 22, def: 0, xp: 1250, name: 'The Star-Reader', portrait: 'idle',
    desc: "He reads the future in a brass orrery, so change it: stop each world at the bottom of its orbit to make an eclipse, or break his lens while it gathers light again.",
    drops: [],
  },
  miller: {
    hp: 600, atk: 25, def: 0, xp: 1200, name: 'The Gale Miller', portrait: 'idle',
    desc: "He carries a storm in the bellows on his back. Strike the valve from above when he vents, pull the sail brake so a sail clips him, or let his own breath drag a millstone back into him.",
    drops: [],
  },
  mawtoad: {
    hp: 600, atk: 24, def: 0, xp: 1200, name: 'The Mawtoad', portrait: 'idle',
    desc: "It swallows whatever its tongue touches. Drop a gas pod in the way, or dodge so the tongue sticks in a thorn stump. Swollen into a ball, it bursts on the same thorns.",
    drops: [],
  },
  abbess: {
    hp: 600, atk: 23, def: 0, xp: 1300, name: 'The Rose Abbess', portrait: 'idle',
    desc: "Three root-hearts feed her and her walls of briar: one high, one in a crawlspace, one behind a thorn curtain that burns. Uprooted, her thorn whip can be caught on yours and torn away.",
    drops: [],
  },
};

/**
 * Variants written in code (the enemy editor's variants live in enemy_edits.json, and an
 * entry there with the same id wins). Each reuses its base enemy's AI and art, recolored
 * by `shift`, with its own stats and behavior knobs.
 */
export const CODE_VARIANTS: Record<string, EnemyStats> = {
  dog_dire: {
    base: 'dog', hp: 46, atk: 18, def: 2, xp: 22, name: 'Dire Wolf', portrait: 'run',
    desc: 'What the kennel hounds were bred from. White as the drifts it hunts in, half again the weight of a dog, and it does not wait long before it springs.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'meat', chance: 12 }, { item: 'heartB', chance: 8 }],
    shift: { h: 200, s: 0.25, l: 1.9 }, tune: { speed: 1.25, sight: 1.4, cooldown: 0.7 },
  },
  harpy_rime: {
    base: 'harpy', hp: 40, atk: 17, def: 1, xp: 20, name: 'Rime Harpy', portrait: 'fly',
    desc: 'The summit flock. Frost has bleached their feathers, and their darts come faster.',
    drops: [{ item: 'heartS', chance: 20 }, { item: 'heartB', chance: 12 }, { item: 'potion', chance: 4 }],
    shift: { h: 190, s: 0.5, l: 1.5 }, tune: { speed: 1.15, cooldown: 0.75 },
  },
  ooze_magma: {
    base: 'ooze', hp: 44, atk: 18, def: 1, xp: 12, name: 'Slag Ooze', portrait: 'big',
    desc: 'Forge slag that never cooled. It creeps faster than the grave kind and every piece of it burns.',
    drops: [{ item: 'heartS', chance: 18 }, { item: 'heartB', chance: 8 }],
    shift: { h: -95, s: 1.6, l: 1.25 }, tune: { speed: 1.4 },
  },
  bat_cinder: {
    base: 'bat', hp: 12, atk: 14, def: 0, xp: 6, name: 'Cinder Bat', portrait: 'fly',
    desc: 'They roost in the flues of the Cinderworks, wings glowing like coals.',
    drops: [{ item: 'heartS', chance: 30 }, { item: 'heartB', chance: 6 }],
    shift: { h: 140, s: 1.6, l: 1.2 }, tune: { speed: 1.3 },
  },
  hookjaw_thrall: {
    base: 'hookjaw', hp: 80, atk: 21, def: 5, xp: 34, name: 'Forge Thrall', portrait: 'walk',
    desc: 'A gaoler set to work the bellows. Its hook is red hot and its patience is shorter.',
    drops: [{ item: 'heartB', chance: 14 }, { item: 'meat', chance: 8 }, { item: 'potion', chance: 6 }],
    shift: { h: -20, s: 1.5, l: 0.9 }, tune: { cooldown: 0.75 },
  },
  knight_slag: {
    base: 'knight', hp: 95, atk: 23, def: 7, xp: 38, name: 'Slag Knight', portrait: 'walk',
    desc: 'Armor cast in the Cinderworks and never taken off. Still warm.',
    drops: [{ item: 'heartB', chance: 14 }, { item: 'potion', chance: 9 }, { item: 'elixir', chance: 2 }],
    shift: { h: 150, s: 1.3, l: 0.85 }, tune: { speed: 1.1 },
  },
  knight_glass: {
    base: 'knight', hp: 85, atk: 22, def: 6, xp: 36, name: 'Glass Sentinel', portrait: 'walk',
    desc: 'A reflection of a castle guard that stepped out of its mirror. It turns faster than the men it copies.',
    drops: [{ item: 'heartB', chance: 14 }, { item: 'potion', chance: 9 }, { item: 'elixir', chance: 2 }],
    shift: { h: 45, s: 0.8, l: 1.35 }, tune: { speed: 1.2, cooldown: 0.8 },
  },
  wisp_prism: {
    base: 'wisp', hp: 26, atk: 18, def: 0, xp: 15, name: 'Prism Wisp', portrait: 'float',
    desc: 'Light that lost its way between two mirrors. Quicker than a grave-light, and it sheds no flame.',
    drops: [{ item: 'heartS', chance: 15 }, { item: 'heartB', chance: 15 }, { item: 'potion', chance: 3 }],
    shift: { h: 80, s: 1.2, l: 1.15 }, tune: { speed: 1.5, drip: false },
  },
  zombie_wretch: {
    base: 'zombie', hp: 34, atk: 16, def: 1, xp: 10, name: 'Gaol Wretch', portrait: 'walk',
    desc: 'Prisoners the Warden forgot. The cells could not hold them once they died.',
    drops: [{ item: 'heartS', chance: 25 }, { item: 'heartB', chance: 8 }, { item: 'meat', chance: 5 }],
    shift: { h: 160, s: 0.6, l: 0.85 }, tune: { speed: 1.3 },
  },
  drowned_deep: {
    base: 'drowned', hp: 58, atk: 20, def: 3, xp: 26, name: 'Deep Drowned', portrait: 'walk',
    desc: 'The oldest of the drowned, from the lowest water. Pale as a fish belly.',
    drops: [{ item: 'heartB', chance: 12 }, { item: 'potion', chance: 7 }, { item: 'meat', chance: 5 }],
    shift: { h: 60, s: 0.5, l: 1.4 }, tune: { cooldown: 0.8 },
  },
  skeleton_jade: {
    base: 'skeleton', hp: 44, atk: 18, def: 3, xp: 20, name: 'Jade Votary', portrait: 'walk',
    desc: 'Temple dead, their bones stained green by centuries of offerings. They throw far and often.',
    drops: [{ item: 'heartS', chance: 22 }, { item: 'heartB', chance: 10 }, { item: 'potion', chance: 4 }],
    shift: { h: 80, s: 3, l: 0.8 }, tune: { cooldown: 0.7 },
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
  edits = { ...JSON.parse(JSON.stringify(CODE_VARIANTS)), ...edits };
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
