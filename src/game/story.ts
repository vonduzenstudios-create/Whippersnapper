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
  run: (k) => `HOLD ${k('run')} WHILE MOVING: RUN`,
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

// ---------------------------------------------------------------- dialogue scenes

/** Who can speak in a dialogue scene. 'hero' is whichever twin is playing. */
export type Speaker = 'hero' | 'pell' | 'wyrm' | 'hound' | 'bellmother';
/** A face for the speaker's portrait (see gfx/art_portraits.ts; missing ones fall back to neutral). */
export type Face = 'neutral' | 'smile' | 'angry' | 'surprised' | 'sad';
export interface Line {
  who: Speaker;
  face?: Face;
  text: string;
}
/** Name plates, and which side of the box each speaker stands on. */
export const SPEAKERS: Record<Speaker, { name: string; side: 'left' | 'right' }> = {
  hero: { name: '{NAME}', side: 'left' },
  pell: { name: 'PELL', side: 'right' },
  wyrm: { name: 'THE OSSUARY WYRM', side: 'right' },
  hound: { name: 'GNARLFANG', side: 'right' },
  bellmother: { name: 'THE BELL-MOTHER', side: 'right' },
};

/** Conversations, shown with Game.talk(). Boss scenes are named `boss_<id>`. */
export const SCENES: Record<string, Line[]> = {
  // the first time you meet Pell in the Ashen Library
  pell_meet: [
    { who: 'pell', face: 'surprised', text: 'OH! A READER. A LIVING ONE. IT HAS BEEN... WELL. IT HAS BEEN A WHILE.' },
    { who: 'hero', face: 'surprised', text: 'A GHOST THAT TALKS. THAT IS NEW.' },
    { who: 'pell', face: 'smile', text: "PELL. THE ARCHIVIST'S LAST APPRENTICE, AND NOW CARETAKER OF ABSOLUTELY EVERYTHING." },
    { who: 'hero', face: 'neutral', text: 'I AM LOOKING FOR A WOMAN. SILVER HAIR, A CHAIN AT HER BELT. SHE WRITES IN THE MARGINS.' },
    { who: 'pell', face: 'sad', text: 'ILSABET. SHE CAME THROUGH NINE NIGHTS AGO, ASKING FOR ENTRY THREE OF THE LEDGER.' },
    { who: 'pell', face: 'sad', text: 'I TOLD HER IT WAS TORN OUT. SHE SAID SHE KNEW WHERE THE PAGE HAD GONE, AND WENT DOWN.' },
    { who: 'hero', face: 'angry', text: 'DOWN WHERE?' },
    { who: 'pell', face: 'neutral', text: 'BELOW THE STACKS. WHERE THE ARCHIVIST KEPT WHAT SHOULD NOT BE READ.' },
    { who: 'pell', face: 'smile', text: 'READERS LEFT A GREAT DEAL BEHIND OVER THE YEARS. I COULD PART WITH SOME OF IT. FOR COIN.' },
    { who: 'hero', face: 'smile', text: 'A GHOST WHO WANTS GOLD?' },
    { who: 'pell', face: 'smile', text: 'EVEN THE DEAD KEEP ACCOUNTS. COME AND BROWSE ANY TIME.' },
  ],
  // every visit after that, before the shop opens
  pell_again: [{ who: 'pell', face: 'smile', text: 'BACK AGAIN? BROWSE ALL YOU LIKE. JUST DO NOT BREATHE ON THE BINDINGS.' }],
  boss_wyrm: [
    { who: 'wyrm', face: 'angry', text: 'KORDER. I KNOW THAT BLOOD. IT TASTES OF CHAINS.' },
    { who: 'hero', face: 'angry', text: 'WHERE IS MY MOTHER?' },
    { who: 'wyrm', face: 'neutral', text: 'SHE WALKED PAST ME AS IF I WERE NOTHING. I AM THE WARDEN OF THIS DOOR, CHILD. IT WILL NOT HAPPEN TWICE.' },
    { who: 'hero', face: 'angry', text: 'THEN STAND ASIDE, OR BE BOUND AGAIN.' },
  ],
  boss_hound: [
    { who: 'hound', face: 'neutral', text: 'A KORDER IN OUR KENNELS. THE PACK REMEMBERS YOUR KIND.' },
    { who: 'hound', face: 'angry', text: 'YOUR ORDER CHAINED US HERE TO GUARD THEIR DEAD. WE GUARD THEM STILL.' },
    { who: 'hero', face: 'neutral', text: 'I AM NOT HERE FOR YOUR KENNELS. LET ME PASS.' },
    { who: 'hound', face: 'angry', text: 'NOTHING PASSES. NOTHING STAYS DEAD. NOT EVEN US.' },
  ],
  boss_bellmother: [
    { who: 'bellmother', face: 'smile', text: 'LISTEN, LITTLE HUNTER. EVERY TOLL WAKES ANOTHER OF THE DEAD.' },
    { who: 'hero', face: 'angry', text: 'THEN I WILL SILENCE THE BELL.' },
    { who: 'bellmother', face: 'neutral', text: 'THE LAST KORDER WHO CLIMBED MY TOWER LEFT HER BLOOD ON THE ROPES. SHE RANG BEAUTIFULLY.' },
    { who: 'hero', face: 'surprised', text: '...MOTHER?' },
    { who: 'bellmother', face: 'angry', text: 'COME. LET ME HEAR HOW YOU RING.' },
  ],
};
