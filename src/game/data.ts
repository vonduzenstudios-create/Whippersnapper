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
  tune?: Tune;
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
    { key: 'dive', label: 'Dives', kind: 'bool', help: 'Rears back, then dives at you with its covers shut' }],
  chair: [SPEED, SIGHT, COOL,
    { key: 'charge', label: 'Charges', kind: 'bool', help: 'Tips back, then spins straight at you' },
    { key: 'stomp', label: 'Stomps', kind: 'bool', help: 'Rises over you and drops down legs first' }],
  librarian: [SPEED, SIGHT, COOL,
    { key: 'throw', label: 'Throws books', kind: 'bool', help: 'Half in an arc, half straight at you' },
    { key: 'hop', label: 'Hops away', kind: 'bool', help: 'Jumps back when you get close' }],
  spider: [SPEED, SIGHT, COOL,
    { key: 'spit', label: 'Spits webs', kind: 'bool', help: 'Spits a web glob that slows you while it hangs on its thread' },
    { key: 'climb', label: 'Climbs back up', kind: 'bool', help: 'Climbs its thread back to the ceiling after a while. Off: it stays down' }],
};
/** Base enemies the editor can make variants of (not the boss). */
export const BASE_ENEMIES = Object.keys(ENEMY_TUNING);
/** The room-entity letter for each base enemy. */
export const ENEMY_LETTER: Record<string, string> = {
  zombie: 'z', bat: 'b', knight: 'k', skeleton: 's', wisp: 'w', drowned: 'd', dog: 'g', harpy: 'y', wraith: 'r', crawler: 'c',
  hookjaw: 'h', eel: 'e', caster: 'm', ooze: 'o', grub: 'u', hand: 'x', tome: 't', chair: 'a', librarian: 'l', spider: 'p', devourer: 'v', moth: 'f',
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
    desc: 'A grimoire the Archivist chained to its shelf. It slept spine-out among the others until the ash woke it. A whole shelf tears loose together. Knock them out of the air, and watch for the dive.',
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
