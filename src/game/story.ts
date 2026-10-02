// All of the game's story text in one place: the intro crawl, cutscene captions,
// tutorial signs, lore stones and relic descriptions. The font is upper case only
// and has no em dash, semicolon or ampersand.
import type { Action } from '../core/input';

/**
 * The two playable twins. Story text uses tokens that heroText() fills in:
 * {NAME} = VESNA / ANZEL, {CHILD} = DAUGHTER / SON, {THEY} = SHE / HE, {THEIR} = HER / HIS.
 */
export type HeroId = 'vesna' | 'anzel';
export const HEROES: Record<HeroId, { name: string; child: string; they: string; their: string }> = {
  vesna: { name: 'VESNA', child: 'DAUGHTER', they: 'SHE', their: 'HER' },
  anzel: { name: 'ANZEL', child: 'SON', they: 'HE', their: 'HIS' },
};
export function heroText(s: string, id: HeroId) {
  const h = HEROES[id] || HEROES.vesna;
  return s.replace(/\{NAME\}/g, h.name).replace(/\{CHILD\}/g, h.child).replace(/\{THEY\}/g, h.they).replace(/\{THEIR\}/g, h.their);
}

/** Opening crawl. `gold` lines are highlighted. */
export const INTRO: { text: string; gold?: boolean }[] = [
  { text: 'ONCE IN A HUNDRED YEARS' },
  { text: 'THE ASHEN MOON RISES OVER VAEL KEEP,' },
  { text: 'AND THE DEAD BENEATH THE CASTLE STIR.' },
  { text: '' },
  { text: 'A CENTURY AGO THE CHAIN-HUNTERS BOUND' },
  { text: 'A WYRM OF FUSED BONE IN THE OSSUARY BELOW.' },
  { text: 'FEW OF THE ORDER SURVIVED THE BINDING.' },
  { text: '' },
  { text: 'NINE DAYS AGO, ILSABET KORDER' },
  { text: 'CLIMBED THE HOLLOWCROWN PASS' },
  { text: 'TO SEE WHETHER THE CHAINS STILL HOLD.' },
  { text: 'SHE HAS NOT COME BACK.' },
  { text: '' },
  { text: 'HER {CHILD} {NAME},', gold: true },
  { text: 'LAST OF THE CHAIN-HUNTERS,', gold: true },
  { text: 'FOLLOWS HER INTO THE SNOW.', gold: true },
];

/** Captions for the opening cinematic (see cutscene.ts for timing). */
export const CINE = {
  place: ['THE HOLLOWCROWN PASS', "ONE NIGHT'S CLIMB FROM VAEL KEEP"],
  hero: ['{NAME} KORDER', 'LAST OF THE CHAIN-HUNTERS'],
  bells: ['FAR BELOW, THE BELLS OF VAEL KEEP BEGIN TO TOLL...', 'THOUGH NO LIVING HAND RINGS THEM.'],
  shout: 'AVALANCHE!',
};

/** Builds a hint from the player's current key bindings. `k('jump')` gives e.g. "Z". */
type KeyName = (a: Action) => string;

/** Tutorial signposts ('T' entities whose arg is a key here). Shown while the hero is near. */
export const HINTS: Record<string, (k: KeyName) => string> = {
  move: (k) => `${k('left')} / ${k('right')}: MOVE`,
  run: (k) => `TAP ${k('right')} TWICE AND HOLD IT: RUN`,
  jump: (k) => `${k('jump')}: JUMP   HOLD IT TO JUMP HIGHER`,
  gap: () => 'A RUNNING JUMP CLEARS WIDE GAPS',
  ledge: () => 'JUMP UP THROUGH THIN LEDGES FROM BELOW',
  drop: (k) => `${k('down')} + ${k('jump')}: DROP THROUGH A LEDGE`,
  whip: (k) => `${k('attack')}: WHIP   ${k('up')} + ${k('attack')}: WHIP UPWARD`,
  crack: () => 'CRACKED STONE CRUMBLES WHEN WHIPPED',
  candle: () => 'WHIP CANDLES FOR HEARTS AND FOOD',
  diag: (k) => `HOLD ${k('up')} + ${k('right')} + ${k('attack')}: WHIP DIAGONALLY`,
  dash: (k) => `${k('dash')}: BACKDASH OUT OF DANGER`,
  menu: (k) => `${k('pause')}: MENU AND EQUIPMENT   ${k('map')}: MAP`,
  // the #lab test room
  lab: () => '1-5 X T SPAWN ENEMY  6 CLEAR  7-9 RELIC  0 REFILL',
  djump: (k) => `${k('jump')} AGAIN IN MIDAIR: DOUBLE JUMP`,
  slide: (k) => `HOLD ${k('down')} + ${k('dash')}: SLIDE UNDER LOW GAPS`,
  tide: (k) => `THE WATER RISES AND FALLS. ${k('jump')} IN WATER: SWIM UP`,
  leap: () => 'AT THE SURFACE, JUMP TO LEAP OUT HIGH',
};

/** Lore stones ('T' entities whose arg is a key here). UP reads them; the first line is the title. */
export const LORE: Record<string, string[]> = {
  lore_ice: [
    'A MARK SCRATCHED INTO THE ICE',
    '',
    'THE PASS IS WATCHED. WHEN THE LIVING',
    'CLIMB, THE BELLS RING AND THE MOUNTAIN',
    'ANSWERS. DO NOT STOP MOVING.  - I.K.',
    '',
    "MOTHER'S HAND. SHE CAME THIS WAY.",
  ],
  lore_pilgrim: [
    "A FROZEN PILGRIM'S JOURNAL",
    '',
    'WE CAME TO PRAY BENEATH THE ASHEN MOON.',
    'AT MIDNIGHT THE BELLS RANG, THOUGH THE',
    'TOWER HAS NO RINGER. THEN OUR DEAD',
    'SAT UP IN THE SNOW.',
    '',
    'A HUNTRESS TOLD US TO WAIT FOR HER HERE.',
    'THAT WAS NINE DAYS AGO.',
  ],
  lore_gate: [
    'A WAYSTONE',
    '',
    'VAEL KEEP, SEAT OF THE CHAIN-HUNTERS.',
    'ITS GATE STANDS OPEN. IT HAS NOT CLOSED',
    'IN A HUNDRED YEARS.',
    '',
    'CARVED BELOW, STILL FRESH:',
    'THE WYRM STIRS UNDER THE CATACOMBS.',
    'FIND THE CHAIN SHRINE.  - I.K.',
  ],
  // ── the Undervault and beyond (after the Wyrm)
  lore_letter: [
    "ILSABET KORDER'S LETTER",
    '',
    '{NAME}. IF YOU READ THIS, THE WYRM IS DEAD.',
    'IT WAS NEVER WHAT WE BOUND. IT WAS ONLY',
    'THE WARDEN, AND IT GUARDED THE BLACK DOOR.',
    '',
    "OUR ORDER'S LAST RELICS ARE LOST IN THE KEEP.",
    'THE HOUNDS DRAGGED THE GREAVES TO THEIR PIT.',
    'THE MANTLE HANGS IN THE GREAT BELFRY.',
    'I AM LOOKING FOR ANOTHER WAY DOWN.  - MOTHER',
  ],
  lore_deep: [
    'THE BLACK DOOR',
    '',
    'COLD IRON, TALLER THAN THREE MEN.',
    'STEPS SPIRAL DOWN BEYOND IT INTO THE DARK.',
    'SOMETHING FAR BELOW IS BREATHING.',
    '',
    'THE DOOR WILL NOT OPEN. NOT YET.',
  ],
  lore_kennel: [
    "A GROUNDSKEEPER'S NOTE",
    '',
    'THE HOUNDS ARE NOT HUNGRY. THEY ARE',
    'GUARDING. THE BIG ONE WITH TWO HEADS',
    'LETS NO ONE NEAR ITS PIT. IT SLEEPS',
    'ON SOMETHING THAT GLITTERS.',
  ],
  lore_hunt: [
    "THE HUNTSMAN'S LOG",
    '',
    'WE KEPT HOUNDS TO TRACK THE DEAD.',
    'WHEN THE BELLS RANG, THE DEAD BEGAN',
    'TRACKING US.',
    '',
    'THE HOLE IN THE FLOOR CLIMBS DOWN',
    'TO THE FROZEN WATERWORKS.',
  ],
  lore_rookery: [
    'CLAW MARKS ON A BEAM',
    '',
    'THE HARPIES CAME WITH THE ASHEN MOON.',
    'THEIR MOTHER NESTS IN THE GREAT BELL',
    'AND RINGS IT TO CALL THEM HOME.',
  ],
  lore_bellwright: [
    "THE BELLWRIGHT'S JOURNAL",
    '',
    'THE LAST ENTRY IS A HUNDRED YEARS OLD.',
    'BELOW IT, IN FRESH INK:',
    '',
    'THE BELLS ARE NOT A WARNING. THEY ARE',
    'A CALL, AND SOMETHING ANSWERS.  - I.K.',
  ],
  lore_pump: [
    'A RUSTED PLAQUE',
    '',
    'RIMEWORKS AQUEDUCT. PUMP HOUSE THREE.',
    '',
    'THE PUMPS STOPPED THE NIGHT THE WYRM WAS',
    'BOUND, YET THE WATER STILL RISES AND FALLS',
    'LIKE A TIDE. SOMETHING BELOW IS BREATHING.',
  ],
  lore_span: [
    'SCRATCHED INTO THE ICE',
    '',
    'THE RIME CHAIN WAS FORGED HERE AND COOLED',
    'IN WATER THAT NEVER MOVES.  - I.K.',
    '',
    'A HOLE ABOVE CLIMBS TO THE HUNTSMEN.',
  ],
  lore_drain: [
    'A CHALK MARK ON THE WALL',
    '',
    'THE SHRINE FLOOR ABOVE IS HOLLOW.',
    'THE ORDER HID ITS WAY OUT DOWN HERE.  - I.K.',
  ],
  lore_rampart: [
    "A SENTRY'S CARVING",
    '',
    'FROM THE WALLS YOU CAN SEE THE WHOLE PASS.',
    'NOTHING CLIMBS IT ANY MORE.',
    '',
    'NOTHING THAT LIVES.',
  ],
  // the Ashen Library
  lore_lending: [
    'A BRASS PLATE ON THE DESK',
    '',
    'THE ASHEN LIBRARY OF VAEL KEEP.',
    'BOOKS MUST BE RETURNED BY THE DATE',
    'STAMPED INSIDE THE COVER. THE ARCHIVIST',
    'WILL KNOW IF THEY ARE NOT.',
    '',
    'THE LAST DATE STAMPED IS A CENTURY OLD.',
  ],
  lore_catalogue: [
    'A CARD IN THE CATALOGUE',
    '',
    'THE DRAWER FLOOR GIVES WAY UNDER A',
    'STEADY FOOT. THE DEEPER STACKS ARE BELOW.',
    '',
    'THE BOOKS WERE CHAINED TO THEIR SHELVES.',
    'SOMEONE UNCHAINED THEM.  - I.K.',
  ],
  lore_nook: [
    'A MARGIN NOTE IN FRESH INK',
    '',
    'WHEN YOU HEAR THE SPINES CREAK, MOVE.',
    'THEY WAKE IN A ROW, AND THEY DO NOT',
    'TIRE. KNOCK THEM DOWN ONE AT A TIME.',
    '',
    'REST HERE. THE SHELVES LEAVE THIS ROOM',
    'ALONE.  - I.K.',
  ],
  lore_stair: [
    'CARVED INTO THE BANISTER',
    '',
    'ONE HUNDRED AND TWELVE STEPS, AND NOT ONE',
    'READER EVER CLIMBED THEM TWICE.',
    '',
    'THE BOOKS LIKE THE HIGH SHELVES BEST.',
  ],
  lore_scribe: [
    "A SCRIBE'S LAST PAGE",
    '',
    'THE INK WILL NOT DRY. AT NIGHT IT CRAWLS',
    'BACK TO THE WELL AND WRITES WHAT IT',
    'REMEMBERS. IT REMEMBERS THE BINDING.',
  ],
  lore_vault: [
    'A LABEL ON AN EMPTY SHELF',
    '',
    'FORBIDDEN WORKS. REMOVED BY ORDER OF THE',
    'KORDER FAMILY, AND NEVER RETURNED.',
    'SEE: THE WYRM. SEE: THE PRICE.',
  ],
  lore_reading: [
    'A BOOK OPEN ON THE LONG TABLE',
    '',
    'THE HANDWRITING IS ILSABET KORDER',
    'THE LAST LINE IS UNDERLINED TWICE:',
    '',
    'THE PAGES KNOW MY NAME. THEY ARE',
    'ASKING FOR THE REST OF THE FAMILY.',
  ],
  lore_study: [
    "THE ARCHIVIST'S LEDGER",
    '',
    'ENTRY ONE. THE ORDER BOUND THE WYRM.',
    'ENTRY TWO. THE ORDER LEFT NO RECORD OF',
    'WHAT THE BINDING COST.',
    'ENTRY THREE HAS BEEN TORN OUT.',
    '',
    'IN FRESH INK: I FOUND THE PAGE.  - I.K.',
  ],
};

/** Dialog shown when a relic is picked up. */
export const RELIC_TEXT: Record<string, string[]> = {
  relic_grapple: [
    'CHAIN GRAPPLE',
    '',
    'Strike toward an iron ring to latch on.',
    'LEFT/RIGHT swing   UP/DOWN climb the chain',
    'JUMP lets go with a mighty leap.',
  ],
  relic_mantle: [
    'RAVEN MANTLE',
    '',
    'A cloak of black feathers that catches the air.',
    'Press JUMP again in midair to double jump.',
  ],
  relic_greaves: [
    'FROSTRUNNER GREAVES',
    '',
    'Ice-shod boots that never lose their footing.',
    'Hold DOWN and press DASH to slide',
    'under gaps one block high.',
  ],
  relic_shroud: [
    'DUSKWING SHROUD',
    '',
    'Moth-grey silk that drinks the wind.',
    'Hold JUMP while falling to glide.',
  ],
  relic_pearl: [
    'UNDERTOW PEARL',
    '',
    'A cold pearl from a drowned saint.',
    'Water no longer slows you. Move at full speed,',
    'and hold UP or DOWN to swim freely.',
  ],
  relic_ward: [
    'ASHGLASS WARD',
    '',
    'A shard of smoked glass that remembers being whole.',
    'Press UP + SUB-WEAPON to raise a bubble',
    'that turns every blow for a few seconds. 3 hearts.',
  ],
};

/** Shown on the victory screen, which now leads back into the game. */
export const VICTORY_LINES = ['THE WYRM WAS ONLY THE WARDEN.', 'BEYOND THE LAIR, A SEALED DOOR HAS OPENED.'];
