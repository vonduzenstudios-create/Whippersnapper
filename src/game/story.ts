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
  glide: (k) => `HOLD ${k('jump')} WHILE FALLING: GLIDE (DUSKWING SHROUD)`,
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
  // ---------------------------------------------------------------- the 0.18.0 zones
  lore_grate: [
    'A RUSTED GRATE',
    '',
    'THE GRAVEDIGGERS CAME AND WENT THIS WAY,',
    'DOWN TO THE LICHYARD UNDER THE BRIDGE.',
    'THE BARS ARE LOOSE ENOUGH TO DROP THROUGH.',
  ],
  lore_descent: [
    "A GRAVEDIGGER'S TALLY",
    '',
    'NINE BURIED THIS WEEK. ELEVEN DUG',
    'THEMSELVES OUT. I HAVE STOPPED',
    'CARVING THE STONES.',
  ],
  lore_lichyard: [
    "ILSABET'S NOTE",
    '',
    '{NAME}, IF YOU FOLLOW ME DOWN HERE:',
    'THE HANDS UNDER THE SOIL FEEL YOUR STEPS.',
    'WHEN THE DIRT TREMBLES, JUMP.',
    '',
    'THREE ROADS LEAVE THIS YARD. I TOOK',
    'THE WET ONE.',
  ],
  lore_mourners: [
    "A PAUPER'S STONE",
    '',
    'HERE LIE THOSE WHO BUILT THE KEEP.',
    'NO NAMES WERE KEPT. THE MOTHS REMEMBER.',
  ],
  lore_sexton: [
    "THE SEXTON'S LAST ENTRY",
    '',
    'THE TEMPLE UNDER THE YARD IS OLDER THAN',
    'THE CASTLE. WE BUILT OUR GRAVES ON ITS',
    'ROOF AND CALLED IT HOLY GROUND.',
    'SHE HAS BEEN PATIENT WITH US.',
  ],
  lore_sunken: [
    'SCRATCHED INTO THE WALL',
    '',
    'EAST, THE DROWNED DEEPS: WADE THROUGH.',
    'WEST, A CRACK ALONG THE FLOOR, UNDER',
    'THE WATER. NO ONE CAN CRAWL IT AND HOLD',
    'A BREATH. NOT WITHOUT THE PEARL.',
  ],
  lore_culvert: [
    "A DROWNED MAN'S SLATE",
    '',
    'THE WATER HERE KEEPS ITS OWN HOURS.',
    'IT IS NOT THE MOON THAT PULLS IT.',
    'SOMETHING IN THE CISTERN BREATHES,',
    'AND THE TIDE IS ITS BREATH.',
  ],
  lore_sump: [
    'A PUMP-WARDEN\'S PLATE',
    '',
    'ALL CHANNELS DRAIN TO THE SUMP.',
    'AT HIGH WATER, SWIM. AT LOW WATER, CLIMB.',
    'THE NAVE LIES AT THE BOTTOM, AND',
    'PAST THE NAVE, THE BLACK CISTERN.',
  ],
  lore_bell: [
    "ILSABET'S NOTE",
    '',
    'ITS HIDE TURNS THE CHAIN. ITS BELLY DOES',
    'NOT. TWO WHEELS ON THE WALLS LET THE',
    'POOL OUT: OPEN BOTH AND IT LIES THERE',
    'GASPING. IT WILL PUT THE WATER BACK.',
    'DO IT AGAIN.',
  ],
  lore_nave: [
    'A HYMN BOARD, HALF ROTTED',
    '',
    'THEY PRAYED HERE FOR DRY YEARS.',
    'THE LAST HYMN POSTED IS FOR THE DROWNED.',
  ],
  lore_temple: [
    'CARVED OVER THE ARCH',
    '',
    'SHE WAS PROMISED TO A KING OF THIS',
    'MOUNTAIN. HE SAW HER FACE ON THE WEDDING',
    'NIGHT AND STANDS IN HER COURT STILL.',
    'DO NOT LOOK. NO ONE WHO LOOKED HAS LEFT.',
  ],
  lore_offering: [
    "ILSABET'S NOTE",
    '',
    'HER GAZE IS A LIGHT YOU CAN SEE COMING.',
    'HER STONE SUITORS STOP IT, UNTIL SHE',
    'BREAKS THEM. A SHIELD HELD UP STOPS IT.',
    'A SHIELD RAISED JUST AS IT LANDS SENDS',
    'IT HOME.',
  ],
  lore_fang: [
    'A LEVER PLATE',
    '',
    'THE PILGRIMS\' DOOR. IT OPENS ONLY',
    'FROM THE TEMPLE SIDE.',
  ],
  lore_scales: [
    'THE TREASURY WALL',
    '',
    'OFFERINGS FROM NINE HUNDRED YEARS OF',
    'FRIGHTENED KINGS. SHE NEVER TOUCHED',
    'ANY OF IT.',
  ],
  lore_gaol: [
    "THE WARDEN'S STANDING ORDER",
    '',
    'NO PRISONER IS TO BE RELEASED.',
    'NO PRISONER IS TO BE FED.',
    'NO PRISONER IS TO BE COUNTED AGAIN.',
  ],
  lore_oubliette: [
    'A LEVER PLATE',
    '',
    'GATE TO THE GRAND STAIRWELL.',
    'KEEP SHUT WHILE THE PIT IS FED.',
  ],
  lore_parapet: [
    "ILSABET'S NOTE",
    '',
    'THE KENNEL HOUNDS WERE BRED DOWN FROM',
    'SOMETHING BIGGER. THE BIGGER ONES NEVER',
    'LEFT THE HEIGHTS. THEY ARE WHITE NOW,',
    'AND THEY DO NOT BARK.',
  ],
  lore_nook2: [
    "A WATCHMAN'S LOG",
    '',
    'THE CHAIN DOES NOTHING TO IT. BRANN',
    'LIVED BECAUSE THE LAKE DID NOT HOLD:',
    'ITS OWN SNOW HAD CRACKED THE ICE, IT',
    'JUMPED AT HIM, AND IT WENT THROUGH TO',
    'THE CHEST. WE STRUCK IT THEN.',
  ],
  lore_span2: [
    'THE FAR SIDE OF THE SPAN',
    '',
    'WHOEVER CARVED THIS CROSSED WITHOUT',
    'A BRIDGE. THERE IS A FEATHER FROZEN',
    'INTO THE STONE BESIDE IT.',
  ],
  lore_chute: [
    'A WARNING, PAINTED RED',
    '',
    'AVALANCHE CHUTE. THE ONLY WAY DOWN',
    'IS ALL THE WAY DOWN.',
  ],
  lore_slag: [
    "A FOUNDRYMAN'S MARK",
    '',
    'THE CINDERWORKS FORGED THE ORDER\'S',
    'CHAINS. THE LAST THING CAST HERE WAS',
    'A SUIT OF ARMOR FOR A KNIGHT WHO DIED',
    'BEFORE IT COOLED. IT WAS LIT ANYWAY.',
  ],
  lore_crucible: [
    'THE CRUCIBLE',
    '',
    'THE WALKWAY MELTED LONG AGO.',
    'NOTHING THAT WALKS HAS CROSSED SINCE.',
  ],
  lore_smelter: [
    "ILSABET'S NOTE",
    '',
    'COLD, IT ONLY RINGS. JUMP ON THE BELLOWS',
    'UNTIL ITS HANDS GLOW, STAND ON THE',
    'ANVIL, AND STEP OFF WHEN THE FIST COMES',
    'DOWN. THEN YOU ARE A SMITH. THE FIRE',
    'INSIDE IS WHAT HOLDS THE BLACK DOOR SHUT.',
  ],
  lore_quench: [
    'THE QUENCHING TROUGH',
    '',
    'DRY FOR A HUNDRED YEARS. THE GATE BELOW',
    'ANSWERS TO THE FURNACE, NOT TO HANDS.',
  ],
  lore_threshold: [
    'ETCHED IN THE GLASS',
    '',
    'EVERY HUNTER WHO CAME THIS FAR MET',
    'THE SAME ENEMY. NONE OF THEM',
    'DESCRIBED IT THE SAME WAY.',
  ],
  lore_inverted: [
    'A PLATE, WRITTEN BACKWARDS',
    '',
    '.THGIR SI TFEL ,LLAH SIHT NI',
    '',
    'THE LEVER OVER THE SECOND TROUGH',
    'OPENS THE WAY TO THE HEART.',
  ],
  lore_pool: [
    "ILSABET'S NOTE",
    '',
    'IT DOES WHAT YOU DID, A BREATH LATE.',
    'DO NOT STRIKE IT. STAND WHERE YOU WANT',
    'IT TO STAND WHEN THE CRYSTAL COMES UP.',
    'AFTER THAT, KEEP YOUR EYES ON ONE',
    'MIRROR. I LOST COUNT. I WALKED AROUND.',
  ],
  lore_stacks: [
    'A BRASS PLATE',
    '',
    'RESTRICTED STACKS. BY ORDER OF THE HEAD',
    'ARCHIVIST, NO BOOK HERE MAY BE OPENED.',
    'SOME OF THEM OPEN THEMSELVES.',
  ],
  lore_shelves: [
    "A READER'S COMPLAINT",
    '',
    'HE WROTE THAT I TRIPPED, AND I TRIPPED.',
    'I SMUDGED MY NAME WITH MY THUMB WHILE',
    'THE INK WAS WET. HE TRIPPED INSTEAD.',
    'I AM NOT RETURNING THE BOOK.',
  ],
};

/** Dialog shown when a relic is picked up. */
export const RELIC_TEXT: Record<string, string[]> = {
  relic_grapple: [
    'CHAIN GRAPPLE',
    '',
    'Strike toward an iron ring and HOLD the button.',
    'LEFT/RIGHT swing   UP/DOWN reel the chain',
    'Let go to fly off with the swing. JUMP hops off.',
  ],
  relic_sinew: [
    'SINEW COIL',
    '',
    'Woven gut that wants to spring back.',
    'On a ring, let the chain all the way out and keep',
    'holding DOWN to stretch it. Let go to sling off.',
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


// ---------------------------------------------------------------- dialogue scenes

/** Who can speak in a dialogue scene. 'hero' is whichever twin is playing. */
export type Speaker = 'hero' | 'pell' | 'wyrm' | 'hound' | 'bellmother' | 'leviathan' | 'gorgon' | 'colossus' | 'mirror' | 'yeti' | 'archivist';
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
  leviathan: { name: 'THE SUMP LEVIATHAN', side: 'right' },
  gorgon: { name: 'YSOLDE', side: 'right' },
  colossus: { name: 'THE HOLLOW COLOSSUS', side: 'right' },
  mirror: { name: '{NAME}?', side: 'right' },
  yeti: { name: 'OLD RIMEHIDE', side: 'right' },
  archivist: { name: 'THE HEAD ARCHIVIST', side: 'right' },
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
    { who: 'bellmother', face: 'angry', text: 'NOTHING TOUCHES ME WHILE I SING. COME. LEARN MY SONG, IF YOU HAVE THE EAR FOR IT.' },
  ],
  // mid-fight scenes: a boss changing phase (`boss_<id>_phase2`) or rising again (`boss_<id>_revive`)
  boss_wyrm_phase2: [
    { who: 'wyrm', face: 'angry', text: 'YOU CRACK MY BONES, CHILD. BUT BONE IS ONLY KINDLING.' },
    { who: 'hero', face: 'surprised', text: 'IT IS BURNING FROM THE INSIDE...' },
    { who: 'wyrm', face: 'angry', text: 'THE PYRES THAT MADE ME NEVER WENT OUT. COME CLOSER. WARM YOURSELF.' },
  ],
  boss_hound_phase2: [
    { who: 'hound', face: 'angry', text: 'YOU BLEED US, KORDER. GOOD. WE HUNT BETTER HUNGRY.' },
    { who: 'hero', face: 'neutral', text: 'RUN AT ME AGAIN, THEN. THE WALLS HAVE BEEN KIND TO ME SO FAR.' },
  ],
  boss_hound_revive: [
    { who: 'hero', face: 'surprised', text: 'NO... I WATCHED IT DIE.' },
    { who: 'hound', face: 'angry', text: 'I TOLD YOU, KORDER. NOTHING STAYS DEAD HERE.' },
    { who: 'hound', face: 'angry', text: 'YOUR ORDER BURNED US ONCE. WE CAME BACK FROM THAT TOO.' },
  ],
  boss_bellmother_phase2: [
    { who: 'bellmother', face: 'angry', text: 'YOU SANG IT BACK. NO ONE SINGS IT BACK!' },
    { who: 'hero', face: 'angry', text: 'TELL ME WHERE SHE WENT.' },
    { who: 'bellmother', face: 'smile', text: 'A LONGER VERSE, THEN. LET US SEE HOW MUCH OF IT YOU CAN HOLD IN THAT LITTLE HEAD.' },
  ],
  // ---------------------------------------------------------------- the 0.18.0 bosses
  boss_leviathan: [
    { who: 'hero', face: 'surprised', text: 'THE WHOLE POOL IS MOVING...' },
    { who: 'leviathan', face: 'angry', text: 'SMALL. WARM. THE LAST ONE SWAM. THIS ONE WILL NOT.' },
    { who: 'hero', face: 'angry', text: 'THE LAST ONE? THEN YOU HAVE SEEN HER. MOVE, OR I DRAIN THIS PIT WITH YOU IN IT.' },
  ],
  boss_leviathan_phase2: [
    { who: 'leviathan', face: 'angry', text: 'ENOUGH. THREE TIMES YOU EMPTIED MY HOUSE. THERE WILL BE NO FOURTH.' },
    { who: 'hero', face: 'surprised', text: 'IT BROKE THE WHEELS...' },
    { who: 'leviathan', face: 'angry', text: 'YOU CANNOT STOP ME NOW. THE WATER IS HERE TO STAY.' },
    { who: 'hero', face: 'angry', text: 'THEN I WILL COME IN AFTER YOU. THAT IRON IN YOUR BACK HAS A RING ON IT.' },
  ],
  boss_gorgon: [
    { who: 'gorgon', face: 'neutral', text: 'ANOTHER GUEST FOR MY WEDDING. YOU ARE VERY LATE. THE GROOM HAS BEEN STANDING NINE HUNDRED YEARS.' },
    { who: 'hero', face: 'neutral', text: 'I AM LOOKING FOR A WOMAN WITH A CHAIN LIKE THIS ONE.' },
    { who: 'gorgon', face: 'neutral', text: 'SHE WOULD NOT LOOK AT ME EITHER. SUCH RUDE CHILDREN, YOU KORDERS.' },
    { who: 'gorgon', face: 'angry', text: 'LOOK AT ME. JUST ONCE. EVERYONE DOES, IN THE END.' },
  ],
  boss_gorgon_phase2: [
    { who: 'gorgon', face: 'angry', text: 'MY OWN EYES. YOU TURNED MY OWN EYES ON ME.' },
    { who: 'hero', face: 'neutral', text: 'NOW YOU KNOW WHAT YOUR GUESTS SAW.' },
    { who: 'gorgon', face: 'angry', text: 'THEN LOOK LONGER, LITTLE KORDER. I WILL LOOK UNTIL THERE IS NOTHING LEFT TO HIDE BEHIND.' },
  ],
  boss_yeti: [
    { who: 'hero', face: 'surprised', text: 'THE SNOW JUST STOOD UP. AND THE FLOOR IS... ICE. ALL OF IT.' },
    { who: 'yeti', face: 'angry', text: 'MINE. MOUNTAIN MINE. LAKE MINE. LITTLE FIRE-THING GO DOWN, OR GO IN THE WATER.' },
    { who: 'hero', face: 'angry', text: 'YOU ARE A GREAT DEAL HEAVIER THAN I AM.' },
  ],
  boss_yeti_phase2: [
    { who: 'yeti', face: 'angry', text: 'COLD. COLD! LITTLE FIRE-THING PAY.' },
  ],
  boss_colossus: [
    { who: 'colossus', face: 'neutral', text: 'WHO... GOES. THE FORGE IS SHUT. THE DOOR IS SHUT. I WAS MADE TO KEEP THEM SO.' },
    { who: 'hero', face: 'neutral', text: 'THERE IS NO ONE INSIDE YOU. WHO GAVE THE ORDER?' },
    { who: 'colossus', face: 'angry', text: 'THE ORDER REMAINS. THE ONE WHO GAVE IT DOES NOT MATTER. STAND AWAY FROM THE ANVIL.' },
  ],
  boss_colossus_inside: [
    { who: 'hero', face: 'surprised', text: 'CHAINS. IT HANGS ITS OWN HEART ON CHAINS.' },
    { who: 'colossus', face: 'angry', text: 'OUT. OUT. THE ORDER DOES NOT PERMIT... VISITORS.' },
  ],
  boss_colossus_phase2: [
    { who: 'hero', face: 'surprised', text: 'ITS CHEST... THERE IS NOTHING IN THERE BUT FIRE.' },
    { who: 'colossus', face: 'angry', text: 'THE FIRE IS THE ORDER. PUT IT OUT, AND THE DOOR FORGETS WHY IT IS CLOSED.' },
    { who: 'hero', face: 'angry', text: 'THEN I AM GOING IN.' },
  ],
  boss_mirror: [
    { who: 'hero', face: 'surprised', text: 'THAT IS... ME.' },
    { who: 'mirror', face: 'smile', text: 'NOT YET. BUT I AM LEARNING. EVERYTHING YOU DO, I DO. A LITTLE LATE. FOR NOW.' },
    { who: 'hero', face: 'angry', text: 'TAKE MY FACE OFF.' },
    { who: 'mirror', face: 'smile', text: 'YOU CANNOT STRIKE A REFLECTION, {NAME}. YOU CAN ONLY CHOOSE WHERE IT STANDS.' },
  ],
  boss_mirror_phase2: [
    { who: 'mirror', face: 'angry', text: 'YOU BROKE THE COPY. I WAS NEVER THE COPY.' },
    { who: 'hero', face: 'surprised', text: 'THE FLOOR... THE WHOLE HALL IS TURNING OVER.' },
    { who: 'mirror', face: 'smile', text: 'FIVE MIRRORS. I AM IN ONE. YOU ARE IN THE OTHER FOUR. STRIKE CAREFULLY.' },
  ],
  boss_archivist: [
    { who: 'archivist', face: 'neutral', text: 'SILENCE IN THE FORBIDDEN SECTION. YOU HAVE NO CARD, NO APPOINTMENT, AND YOU ARE DRIPPING ON THE CARPET.' },
    { who: 'hero', face: 'neutral', text: 'A WOMAN TORE A PAGE FROM YOUR LEDGER. WHAT WAS ON IT?' },
    { who: 'archivist', face: 'angry', text: 'VANDALISM! IT RUNS IN THE FAMILY, I SEE. I NEED NOT LIFT A FINGER AGAINST YOU, CHILD. ONLY A PEN.' },
    { who: 'archivist', face: 'angry', text: 'WHATEVER I WRITE IN THIS ROOM, HAPPENS. LET US BEGIN YOUR LAST CHAPTER.' },
  ],
  boss_archivist_phase2: [
    { who: 'archivist', face: 'angry', text: 'YOU BLOTTED MY MANUSCRIPT! THREE CHAPTERS, RUINED!' },
    { who: 'hero', face: 'neutral', text: 'YOUR INK DRIES SLOWLY, OLD MAN.' },
    { who: 'archivist', face: 'angry', text: 'THEN I SHALL WRITE MYSELF INTO THE STORY, AND WATCH YOU CHOOSE THE WRONG NAME.' },
  ],
};
