// The 0.18.0 expansion: eight zones (43 rooms) hung off the existing castle, six of them with a
// boss. See docs/level-design.md for the map and the gates.
//
//   The Lichyard        under the Ruined Courtyard's grate: the western hub (no boss)
//   The Drowned Deeps   west of the Forgotten Drain: tidal water, boss the Sump Leviathan (Undertow Pearl)
//   The Serpent Temple  behind an underwater slide tunnel (Pearl + Greaves): boss Ysolde (Rootstone)
//   The Warden's Gaol   off the bottom of the Warden's Stair (no boss), loops to the Grand Stairwell
//   Rimecrown Heights   east of the Windswept Spire: boss Old Rimehide (Duskwing Shroud)
//   The Cinderworks     east of the Old Well: a lava lake only a glide crosses, boss the Hollow
//                       Colossus (Ashglass Ward, and its fall opens the Black Door)
//   The Mirror Vault    behind the Black Door: boss the Mirror Heart (Mirror Shard)
//   The Archivist's Wing  west of the Archivist's Study: boss the Head Archivist (Reading Lens)
//
// Movement rules are the same as in rooms_expansion.ts: steps of at most 4 rows, a 6-7 row
// step needs the Raven Mantle, a one-tile gap needs the Frostrunner Greaves, and a spike gap
// of 20+ tiles needs the Duskwing Shroud (a running double jump covers about 13).
//
// Enemy letters used here: h hookjaw, e eel, m gloomcaster, o ooze, u grub, f moth, x gravehand,
// p spider, v devourer, q temple asp, plus the old ones. An entity's arg picks a variant
// (CODE_VARIANTS in game/data.ts): 'g' + 'dog_dire' is a Dire Wolf.
import { RB, RoomDef } from './rooms';

/** One-way ledges: [x, y, width]. */
function plats(b: RB, list: [number, number, number][]) {
  for (const [x, y, w] of list) b.fill(x, y, w, 1, '=');
}
/** The two ledges under a ceiling hole in cell column `cx` (the Ossuary Shaft pattern). */
function underHole(b: RB, cx: number, side: 'L' | 'R' = 'R') {
  const hx = cx * 24 + 10;
  b.fill(side === 'R' ? hx : hx - 2, 4, 6, 1, '=');
  b.fill(hx, 2, 4, 1, '=');
}
/** Candles: [x, y] (y = the row just above whatever they stand on). */
function candles(b: RB, list: [number, number][]) {
  for (const [x, y] of list) b.e(x, y, 'C');
}
/** A spike pit cut into a two-row floor: columns x..x+w-1 of floor row `floor`. */
function pit(b: RB, x: number, w: number, floor = 12) {
  b.fill(x, floor, w, 2, '.').fill(x, floor + 1, w, 1, '^');
}
/**
 * A ramp flight of `n` steps (each two columns wide, one row high) starting at column x on a
 * floor whose top row is `base`, rising to the right (dir 1, '/') or to the left (dir -1, '\').
 * Solid underneath. Returns the first column past the flight and the row its top reaches.
 */
function ramp(b: RB, x: number, base: number, n: number, dir: 1 | -1): [number, number] {
  let cx = x, row = base;
  for (let k = 0; k < n; k++) {
    row--;
    for (const c of [cx, cx + dir]) b.fill(c, row, 1, base - row, '#').fill(c, row, 1, 1, dir > 0 ? '/' : '\\');
    cx += 2 * dir;
  }
  return [cx, row];
}

export function buildDepthRooms(): RoomDef[] {
  const R: RoomDef[] = [];

  // ══════════════════════════════════════════════════════════ the Lichyard (western hub)

  // Y1 ── Gravedigger's Descent (1 x 2): the shaft under the Courtyard's grate. Ledges all the
  // way down; the door at the bottom opens west onto the Lichyard.
  {
    const b = new RB(1, 2);
    b.shell().hole('T', 0).door('L', 1);
    plats(b, [[14, 22, 6], [5, 18, 6], [14, 14, 6], [5, 10, 6], [14, 7, 6]]);
    underHole(b, 0);
    b.e(18, 25, 'T', 'lore_descent');
    candles(b, [[4, 25], [16, 21], [7, 17], [16, 13], [7, 9]]);
    b.e(12, 25, 'z').e(8, 12, 'b').e(18, 4, 'b');
    R.push(b.build('ly_descent', "Gravedigger's Descent", 'lichyard', 'catacomb', 4, 3));
  }

  // Y2 ── The Lichyard (3 x 1): the castle's burial ravine, open to the sky. Gravehands swim
  // under the soil and grubs burrow between the tombs. An iron shield lies on the roof of the
  // old crypt, 6 rows up (double jump).
  {
    const b = new RB(3, 1);
    b.shell(false).door('L', 0).door('R', 0);
    b.fill(12, 10, 2, 2).fill(22, 10, 3, 2).fill(46, 9, 3, 3).fill(58, 10, 2, 2); // tombs
    plats(b, [[31, 6, 6]]); // the crypt roof: nothing else within reach of it
    b.e(33, 5, 'i', 'shield_heater').e(64, 11, 'T', 'lore_lichyard');
    candles(b, [[6, 11], [23, 9], [40, 11], [47, 8], [68, 11]]);
    b.e(18, 11, 'x').e(52, 11, 'x').e(28, 11, 'u').e(42, 11, 'u');
    b.e(8, 11, 'z').e(36, 11, 'z').e(62, 11, 'z').e(16, 4, 'w', 'wisp_variant').e(54, 3, 'w', 'wisp_variant');
    R.push(b.build('ly_yard', 'The Lichyard', 'lichyard', 'graveyard', 1, 4));
  }

  // Y3 ── Mourners' Row (2 x 1): the old paupers' plots. Moths hang over the graves, and a
  // grate at the east end (Down + Jump) drops into the Sunken Stair.
  {
    const b = new RB(2, 1);
    b.shell(false).door('L', 0).door('R', 0).hole('B', 1);
    b.fill(34, 12, 4, 1, '='); // the grate over the Sunken Stair
    b.fill(8, 10, 3, 2).fill(18, 9, 2, 3).fill(26, 10, 3, 2); // tombs
    plats(b, [[12, 7, 5]]);
    b.e(14, 6, 'i', 'potion').e(42, 11, 'T', 'lore_mourners');
    candles(b, [[4, 11], [19, 8], [30, 11], [44, 11]]);
    b.e(14, 11, 'u').e(23, 11, 'x').e(40, 11, 's').e(10, 4, 'f').e(22, 3, 'f').e(30, 5, 'f').e(32, 11, 'o');
    R.push(b.build('ly_row', "Mourners' Row", 'lichyard', 'graveyard', -1, 4));
  }

  // Y4 ── Sexton's Lodge (1 x 1): save altar at the west end of the graveyard.
  {
    const b = new RB(1, 1);
    b.shell().door('R', 0);
    b.e(6, 11, 'S').e(14, 11, 'T', 'lore_sexton');
    candles(b, [[3, 11], [18, 11]]);
    R.push(b.build('ly_sexton', "Sexton's Lodge", 'lichyard', 'shrine', -2, 4, { save: true }));
  }

  // Y5 ── The Sunken Stair (1 x 3): a flooded shaft under Mourners' Row. Its bottom is under
  // water. East, a door (walk through the water) into the Deeps. West, a one-tile tunnel along
  // the floor into the Serpent Temple: sliding under water needs the Pearl and the Greaves.
  // The gate high on the west wall is the temple's shortcut, opened from the other side.
  {
    const b = new RB(1, 3);
    b.shell().hole('T', 0).door('L', 0).door('L', 2).door('R', 2);
    b.fill(0, 8, 1, 4, 'G'); // the Fang Gallery's gate
    b.fill(1, 12, 6, 2); // its landing
    underHole(b, 0);
    plats(b, [[8, 8, 6], [14, 12, 6], [6, 16, 6], [14, 20, 6], [6, 24, 6], [14, 28, 6]]);
    b.fill(1, 31, 22, 9, '~');
    b.fill(0, 34, 8, 5); // the sunken block (it covers the doorway too): only the tunnel along the floor (row 39) is open
    b.e(18, 27, 'T', 'lore_sunken').e(10, 23, 'T', 'leap');
    candles(b, [[3, 11], [16, 11], [8, 23], [16, 19]]);
    b.e(14, 39, 'd').e(18, 39, 'e').e(10, 5, 'b').e(18, 16, 'b');
    R.push(b.build('ly_stair', 'The Sunken Stair', 'lichyard', 'flooded', 0, 5, { gateFlag: 'temple_gate' }));
  }

  // ══════════════════════════════════════════════════════════ the Drowned Deeps

  // D1 ── Weeping Culvert (3 x 1): from the Sunken Stair's flooded bottom east into the
  // Deeps. A pool behind a bank (leap out at the surface), then a crawlspace under a fallen
  // sluice housing that needs the slide.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(1, 6, 13, 6, '~');
    b.fill(14, 6, 2, 6); // the bank
    plats(b, [[17, 9, 3]]); // a step back up onto it from the dry side
    b.fill(26, 1, 10, 10); // the fallen housing: only row 11 is open under it
    b.fill(46, 10, 4, 2).fill(58, 9, 3, 3);
    plats(b, [[50, 7, 6]]);
    b.e(52, 6, 'i', 'potion').e(40, 11, 'T', 'lore_culvert');
    candles(b, [[20, 11], [44, 11], [66, 11]]);
    b.e(6, 11, 'd', 'drowned_deep').e(10, 11, 'e').e(42, 11, 'o').e(54, 11, 'o').e(64, 3, 'b').e(38, 3, 'b');
    R.push(b.build('dp_culvert', 'Weeping Culvert', 'deeps', 'deeps', 1, 7));
  }

  // D2 ── Silt Channel (3 x 1): west of the Forgotten Drain. Stone piers stand clear of the
  // water at low tide and drown at high tide. A shelf under the vault (row 3) is reached by
  // leaping out at high tide, or with a double jump.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(10, 9, 6, 3).fill(26, 9, 6, 3).fill(42, 9, 6, 3).fill(58, 9, 6, 3); // piers
    plats(b, [[18, 8, 5], [34, 8, 5], [50, 8, 5]]);
    b.fill(33, 3, 7, 1);
    b.e(36, 2, 'i', 'heart_up').e(4, 11, 'T', 'tide');
    candles(b, [[12, 8], [44, 8], [60, 8], [35, 2]]);
    b.e(22, 11, 'e').e(38, 11, 'e').e(54, 11, 'e').e(66, 11, 'd').e(28, 3, 'b');
    R.push(b.build('dp_silt', 'Silt Channel', 'deeps', 'deeps', 5, 7, { tide: { low: 10, high: 6 } }));
  }

  // D3 ── The Sump (1 x 3): the shaft all the Deeps drain into. The tide fills it almost to
  // the top landings and empties it again, so you can climb the ledges or ride the water.
  {
    const b = new RB(1, 3);
    b.shell().door('L', 0).door('R', 0).door('R', 1).door('L', 2);
    b.fill(1, 12, 8, 2).fill(15, 12, 8, 2); // top landings (Culvert left, Silt Channel right)
    b.fill(17, 26, 6, 2); // the Diving Bell's landing
    plats(b, [[10, 37, 5], [16, 34, 5], [9, 30, 6], [8, 23, 6], [2, 20, 5], [9, 16, 6]]);
    b.e(20, 25, 'T', 'lore_sump');
    candles(b, [[3, 11], [20, 11], [18, 25], [11, 29]]);
    b.e(6, 39, 'e').e(16, 39, 'e').e(12, 6, 'b').e(4, 28, 'b');
    R.push(b.build('dp_sump', 'The Sump', 'deeps', 'deeps', 4, 7, { tide: { low: 38, high: 16 } }));
  }

  // D4 ── The Diving Bell (1 x 1): save altar off the Sump.
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0);
    b.e(14, 11, 'S').e(8, 11, 'T', 'lore_bell');
    candles(b, [[4, 11], [20, 11]]);
    R.push(b.build('dp_bell', 'The Diving Bell', 'deeps', 'shrine', 5, 8, { save: true }));
  }

  // D5 ── The Drowned Nave (3 x 1): a chapel under the water. The tide covers everything but
  // the roof beams; a shelf above the altar (6 rows over it) is a high-tide leap.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(14, 8, 2, 4).fill(54, 8, 2, 4); // columns
    b.fill(34, 9, 4, 3); // the altar
    plats(b, [[20, 8, 5], [46, 8, 5]]);
    b.fill(33, 3, 6, 1);
    b.e(35, 2, 'i', 'con_up').e(62, 11, 'T', 'lore_nave');
    candles(b, [[22, 7], [48, 7], [36, 8]]);
    b.e(8, 11, 'd', 'drowned_deep').e(28, 11, 'd', 'drowned_deep').e(44, 11, 'd').e(24, 11, 'e').e(50, 11, 'e');
    R.push(b.build('dp_nave', 'The Drowned Nave', 'deeps', 'deeps', 1, 9, { tide: { low: 11, high: 4 } }));
  }

  // D6 ── The Black Cistern (2 x 2): the Sump Leviathan's pool (see game/boss_leviathan.ts).
  // The boss runs the water itself. Ledges at three heights: rows 13 and 11 stand clear of the
  // full pool (the first sluice wheels hang beside the row-13 ones), rows 6 and 5 stand clear
  // even when it floods the room for good.
  {
    const b = new RB(2, 2);
    b.shell().door('R', 1);
    plats(b, [
      [8, 21, 6], [34, 21, 6], [20, 17, 8], // up out of the pool
      [2, 13, 5], [41, 13, 5], [12, 13, 6], [30, 13, 6], [20, 11, 8], // over the full pool
      [13, 9, 5], [30, 9, 5], [3, 6, 7], [38, 6, 7], [20, 5, 8], // the high ledges
    ]);
    b.e(24, 25, 'W');
    b.e(22, 25, 'i', 'relic_pearl').e(26, 25, 'i', 'life_up');
    R.push(b.build('dp_cistern', 'The Black Cistern', 'deeps', 'deeps', -1, 8, { boss: 'leviathan', tide: { low: 26, high: 14 } }));
  }

  // ══════════════════════════════════════════════════════════ the Serpent Temple

  // T1 ── Serpent Gate (2 x 1): the far end of the Sunken Stair's tunnel comes up in a pool
  // here. Leap out onto the bank; the temple proper begins beyond it.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(34, 5, 13, 7, '~');
    b.fill(43, 8, 5, 3); // the tunnel goes on: only row 11 is open
    b.fill(32, 5, 2, 7); // the bank
    plats(b, [[28, 8, 4]]); // back up onto the bank from the dry side
    b.fill(12, 10, 4, 2); // an offering block
    b.e(22, 11, 'T', 'lore_temple');
    candles(b, [[4, 11], [13, 9], [26, 11]]);
    b.e(8, 11, 'q').e(20, 11, 'q').e(18, 3, 'p');
    R.push(b.build('tp_gate', 'Serpent Gate', 'temple', 'temple', -2, 7));
  }

  // T2 ── The Coil Stair (1 x 3): the temple's spine. Bottom: the Gate (east) and the Hall of
  // Scales (west). Middle: the Offering Room (east) and the Bride's Court (west). Top: the Fang Gallery.
  {
    const b = new RB(1, 3);
    b.shell().door('R', 2).door('L', 2).door('R', 1).door('L', 1).door('R', 0);
    b.fill(1, 26, 6, 2).fill(17, 26, 6, 2); // middle landings
    b.fill(17, 12, 6, 2); // top landing
    plats(b, [[9, 37, 5], [15, 34, 5], [9, 30, 6], [9, 23, 6], [3, 19, 5], [10, 16, 5]]);
    candles(b, [[3, 25], [20, 25], [20, 11], [12, 39]]);
    b.e(4, 39, 'q').e(19, 25, 's', 'skeleton_jade').e(12, 3, 'p').e(5, 14, 'p').e(11, 29, 'q');
    R.push(b.build('tp_coil', 'The Coil Stair', 'temple', 'temple', -3, 5));
  }

  // T3 ── Offering Room (1 x 1): save altar before the Bride's Court.
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0);
    b.e(14, 11, 'S').e(8, 11, 'T', 'lore_offering');
    candles(b, [[4, 11], [20, 11]]);
    R.push(b.build('tp_offer', 'Offering Room', 'temple', 'shrine', -2, 6, { save: true }));
  }

  // T4 ── Fang Gallery (2 x 1): spike troughs under a row of ledges. The lever at the east end
  // raises the gate into the Sunken Stair: the temple's shortcut back to the Lichyard.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    pit(b, 10, 6);
    pit(b, 24, 6);
    plats(b, [[11, 9, 4], [25, 9, 4]]);
    b.e(42, 11, 'L', 'temple_gate').e(38, 11, 'T', 'lore_fang').e(26, 8, 'i', 'potion');
    candles(b, [[4, 11], [20, 11], [34, 11]]);
    b.e(18, 11, 'q').e(34, 11, 'q').e(13, 3, 'p').e(27, 3, 'p').e(40, 11, 's', 'skeleton_jade');
    R.push(b.build('tp_fang', 'Fang Gallery', 'temple', 'temple', -2, 5));
  }

  // T5 ── Hall of Scales (3 x 1): the treasury. A stepped dais in the middle (ramps up both
  // sides) with the Ossuary Pavise on top, a Devourer loose among the offerings.
  {
    const b = new RB(3, 1);
    b.shell().door('R', 0);
    const [x0, top] = ramp(b, 26, 12, 4, 1); // rises to the right: x 26-33, top at row 8
    b.fill(x0, top, 6, 12 - top); // the dais: x 34-39
    ramp(b, x0 + 13, 12, 4, -1); // and down again over x 40-47 (this ramp rises to the left, so it starts at its low end, x 47)
    b.fill(6, 10, 3, 2).fill(58, 10, 4, 2);
    plats(b, [[12, 8, 5], [52, 8, 5]]);
    b.e(36, 7, 'i', 'shield_ossuary').e(14, 7, 'i', 'str_up').e(64, 11, 'T', 'lore_scales');
    candles(b, [[4, 11], [35, 7], [38, 7], [54, 7], [68, 11]]);
    b.e(18, 11, 'v').e(50, 11, 'q').e(60, 9, 'q').e(24, 11, 'm').e(46, 3, 'p');
    R.push(b.build('tp_scales', 'Hall of Scales', 'temple', 'temple', -6, 7));
  }

  // T6 ── The Bride's Court (2 x 2): Ysolde's throne room. The Rootstone falls when she does.
  {
    const b = new RB(2, 2);
    b.shell().door('R', 1);
    plats(b, [[6, 22, 6], [36, 22, 6], [19, 19, 10]]);
    b.e(14, 25, 'W');
    b.e(22, 25, 'i', 'acc_rootstone').e(26, 25, 'i', 'life_up');
    R.push(b.build('tp_court', "The Bride's Court", 'temple', 'temple', -5, 5, { boss: 'gorgon' }));
  }

  // ══════════════════════════════════════════════════════════ the Warden's Gaol

  // G1 ── Gaol Gate (2 x 1): through the new door at the foot of the Warden's Stair.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(14, 1, 2, 6).fill(30, 1, 2, 6); // portcullis housings hanging from the roof
    b.fill(20, 10, 4, 2);
    b.e(40, 11, 'T', 'lore_gaol');
    candles(b, [[6, 11], [22, 9], [36, 11], [44, 11]]);
    b.e(10, 11, 'z', 'zombie_wretch').e(26, 11, 'z', 'zombie_wretch').e(18, 11, 'h').e(34, 11, 's');
    R.push(b.build('ga_gate', 'Gaol Gate', 'gaol', 'gaol', 13, 3));
  }

  // G2 ── The Long Cells (3 x 1): cell walls hang from the roof, gaolers still walk the row.
  // A grate in the floor (Down + Jump) drops into the Torturer's Gallery.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0).hole('B', 1);
    b.fill(34, 12, 4, 1, '=');
    for (const x of [10, 20, 44, 54, 64]) b.fill(x, 1, 1, 7); // cell walls
    b.fill(14, 10, 3, 2).fill(48, 10, 3, 2); // cots
    plats(b, [[24, 8, 5]]);
    b.e(26, 7, 'i', 'potion');
    candles(b, [[6, 11], [30, 11], [40, 11], [60, 11], [68, 11]]);
    b.e(16, 9, 'h').e(58, 11, 'h').e(28, 11, 'o').e(42, 11, 'o').e(8, 11, 'z', 'zombie_wretch').e(66, 11, 'z', 'zombie_wretch');
    R.push(b.build('ga_cells', 'The Long Cells', 'gaol', 'gaol', 10, 3));
  }

  // G3 ── The Oubliette (1 x 2): a pit with a Devourer at the bottom and the Throwing Knife
  // beside it. The lever on the top landing raises the gate into the Grand Stairwell: a
  // shortcut to the old castle.
  {
    const b = new RB(1, 2);
    b.shell().door('L', 0).door('R', 0).door('R', 1);
    b.fill(0, 8, 1, 4, 'G');
    b.fill(1, 12, 9, 2).fill(14, 12, 9, 2); // the top landing, with the pit mouth in the middle
    plats(b, [[14, 22, 6], [6, 19, 6], [8, 16, 6], [10, 14, 4]]);
    b.e(4, 11, 'L', 'gaol_gate').e(18, 11, 'T', 'lore_oubliette');
    b.e(3, 25, 'i', 'sub_knife');
    candles(b, [[7, 11], [20, 11], [20, 25]]);
    b.e(10, 25, 'v').e(16, 5, 'b');
    R.push(b.build('ga_oubliette', 'The Oubliette', 'gaol', 'gaol', 9, 3, { gateFlag: 'gaol_gate' }));
  }

  // G4 ── Torturer's Gallery (2 x 1): the rack room under the Long Cells. A shelf 7 rows up
  // (double jump) holds a Life Max Up.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).hole('T', 1);
    plats(b, [[28, 8, 6]]);
    underHole(b, 1);
    b.fill(16, 10, 5, 2); // the rack
    plats(b, [[6, 5, 4]]); // the high shelf: 7 rows over the floor, nothing near it
    b.e(7, 4, 'i', 'life_up');
    candles(b, [[4, 11], [18, 9], [26, 11], [44, 11]]);
    b.e(12, 11, 'h').e(24, 11, 'o').e(42, 11, 'z', 'zombie_wretch').e(40, 4, 'b');
    R.push(b.build('ga_gallery', "Torturer's Gallery", 'gaol', 'gaol', 10, 4));
  }

  // ══════════════════════════════════════════════════════════ Rimecrown Heights

  // H1 ── Frostbitten Parapet (3 x 1): out along the wall from the Windswept Spire, under the
  // open sky. Dire wolves run the walk and the summit harpies come down to meet you.
  {
    const b = new RB(3, 1);
    b.fill(0, 0, 1, 8).fill(0, 12, 72, 2).fill(71, 0, 1, 14).door('L', 0).door('R', 0);
    b.fill(14, 12, 5, 2, '.').fill(14, 13, 5, 1, '^'); // a break in the wall walk
    b.fill(26, 9, 5, 3).fill(44, 10, 4, 2).fill(56, 9, 3, 3); // merlons and a guard hut
    plats(b, [[34, 7, 5]]);
    b.e(36, 6, 'i', 'potion').e(8, 11, 'T', 'lore_parapet');
    candles(b, [[4, 11], [28, 8], [50, 11], [66, 11]]);
    b.e(22, 11, 'g', 'dog_dire').e(40, 11, 'g', 'dog_dire').e(62, 11, 'g', 'dog_dire').e(32, 3, 'y', 'harpy_rime').e(52, 4, 'y', 'harpy_rime');
    R.push(b.build('ht_parapet', 'Frostbitten Parapet', 'heights', 'rooftop', 18, -5));
  }

  // H2 ── Rimecrown Climb (1 x 4): an ice shaft inside the highest tower. West door: the
  // Parapet. East doors, top to bottom: the Howling Gallery, the Watchfire Nook (save), the
  // Broken Span. A Ward Seed lies at the very bottom.
  {
    const b = new RB(1, 4);
    b.shell().door('L', 1).door('R', 0).door('R', 1).door('R', 2);
    b.fill(1, 26, 6, 2).fill(17, 26, 6, 2); // Parapet and Nook landings
    b.fill(17, 12, 6, 2); // Gallery landing
    b.fill(17, 40, 6, 2); // Span landing
    plats(b, [
      [9, 26, 6], // across between the two middle landings
      [9, 22, 6], [3, 18, 5], [9, 15, 6], // up to the Gallery landing
      [9, 30, 6], [3, 34, 5], [10, 37, 6], // down to the Span landing
      [14, 44, 4], [11, 48, 5], [4, 51, 5], // and on down to the bottom
    ]);
    b.e(20, 53, 'i', 'con_up');
    candles(b, [[3, 25], [20, 25], [20, 11], [20, 39], [12, 53]]);
    b.e(2, 40, 'c').e(21, 20, 'c').e(12, 53, 'c').e(12, 8, 'y', 'harpy_rime').e(8, 33, 'y', 'harpy_rime');
    R.push(b.build('ht_climb', 'Rimecrown Climb', 'heights', 'ice', 21, -6));
  }

  // H3 ── Watchfire Nook (1 x 1): save altar halfway up the Climb.
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0);
    b.e(14, 11, 'S').e(8, 11, 'T', 'lore_nook2');
    candles(b, [[4, 11], [20, 11]]);
    R.push(b.build('ht_nook', 'Watchfire Nook', 'heights', 'shrine', 22, -5, { save: true }));
  }

  // H4 ── The Broken Span (3 x 1): a bridge of ice, 22 tiles of it gone. Only the Duskwing
  // Shroud carries you over (a running double jump falls about 9 tiles short).
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0);
    pit(b, 14, 22);
    b.e(60, 11, 'i', 'life_up').e(54, 11, 'T', 'lore_span2').e(6, 11, 'T', 'glide');
    candles(b, [[10, 11], [40, 11], [66, 11]]);
    b.e(48, 11, 'r').e(64, 1, 'c');
    R.push(b.build('ht_span', 'The Broken Span', 'heights', 'ice', 22, -4));
  }

  // H5 ── Howling Gallery (3 x 1): the last hall before the summit. Wraiths toll in the
  // dark, crawlers ice the floor, and a slide pocket in the far wall hides a Might Seed.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(18, 10, 4, 2).fill(40, 9, 4, 3); // ice blocks
    plats(b, [[26, 8, 6], [48, 7, 5]]);
    // a pocket under a shelf of ice near the east door: its mouth (row 11) is one tile high
    // (the block itself is 4 rows high: hop over it to reach the east door)
    b.fill(56, 8, 9, 4).fill(60, 9, 4, 3, '.').fill(56, 11, 4, 1, '.');
    b.e(62, 11, 'i', 'str_up');
    candles(b, [[6, 11], [28, 7], [50, 6], [68, 11]]);
    b.e(14, 11, 'r').e(46, 11, 'r').e(30, 1, 'c').e(52, 1, 'c').e(12, 1, 'c').e(34, 11, 'g', 'dog_dire');
    R.push(b.build('ht_gallery', 'Howling Gallery', 'heights', 'ice', 22, -6));
  }

  // H6 ── Rimecrown Summit (2 x 2): Old Rimehide's den, on a frozen lake (see game/boss_yeti.ts).
  // The floor's top row is the ice: eight slabs of five tiles (x 4-43) the fight can break
  // (a broken slab is a one-tile-deep hole of freezing water), with solid rim at both ends. The east door leads to the Avalanche Chute.
  {
    const b = new RB(2, 2);
    b.shell().door('L', 0).door('R', 1);
    b.fill(1, 12, 7, 2); // the entry landing
    plats(b, [[10, 22, 6], [20, 18, 8], [9, 15, 5]]); // the way back up to it
    b.e(34, 25, 'W');
    b.e(22, 25, 'i', 'relic_shroud').e(26, 25, 'i', 'heart_up');
    R.push(b.build('ht_summit', 'Rimecrown Summit', 'heights', 'snow', 25, -6, { boss: 'yeti' }));
  }

  // H7 ── Avalanche Chute (1 x 7): the long way down the outside of the keep, onto the roof
  // of the Huntsman's Lodge. Glide to pick the ledges you want; climbing back up takes the
  // double jump (7-row steps).
  {
    const b = new RB(1, 7);
    b.shell().door('L', 0).hole('B', 0);
    b.fill(1, 12, 8, 2);
    const ledges: [number, number, number][] = [];
    for (let i = 0; i < 11; i++) ledges.push([i % 2 ? 3 : 14, 19 + i * 7, 7]);
    plats(b, ledges);
    b.e(5, 39, 'i', 'elixir').e(17, 60, 'i', 'con_up').e(6, 11, 'T', 'lore_chute');
    candles(b, [[3, 11], [16, 18], [5, 25], [5, 53], [5, 81]]);
    b.e(10, 30, 'y', 'harpy_rime').e(12, 66, 'y', 'harpy_rime').e(21, 44, 'c');
    R.push(b.build('ht_chute', 'Avalanche Chute', 'heights', 'rooftop', 27, -5));
  }

  // ══════════════════════════════════════════════════════════ the Cinderworks

  // F1 ── Slag Gate (2 x 1): through the Old Well's new east door. Slag troughs in the floor.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    pit(b, 16, 4);
    pit(b, 30, 4);
    b.fill(22, 10, 4, 2);
    plats(b, [[36, 8, 5]]);
    b.e(8, 11, 'T', 'lore_slag').e(38, 7, 'i', 'potion');
    candles(b, [[4, 11], [24, 9], [44, 11]]);
    b.e(12, 11, 'o', 'ooze_magma').e(42, 11, 'o', 'ooze_magma').e(24, 9, 'h', 'hookjaw_thrall').e(20, 3, 'b', 'bat_cinder').e(34, 4, 'b', 'bat_cinder');
    R.push(b.build('fg_gate', 'Slag Gate', 'forge', 'forge', 20, 5));
  }

  // F2 ── The Bellows (1 x 3): the forge's great flue. Bottom doors: the Slag Gate (west) and
  // the Crucible Walk (east). Halfway up, the Quench Shaft's gate (it opens when the
  // Colossus falls). A Life Max Up at the top of the climb.
  {
    const b = new RB(1, 3);
    b.shell().door('L', 2).door('R', 2).door('R', 1);
    b.fill(17, 26, 6, 2);
    plats(b, [[10, 37, 5], [4, 34, 5], [11, 30, 6], [9, 23, 5], [3, 19, 5], [10, 15, 5], [16, 11, 5]]);
    b.e(18, 10, 'i', 'life_up');
    candles(b, [[4, 39], [20, 39], [19, 25], [12, 14]]);
    b.e(18, 25, 'h', 'hookjaw_thrall').e(8, 28, 'b', 'bat_cinder').e(14, 18, 'b', 'bat_cinder').e(6, 8, 'b', 'bat_cinder').e(8, 39, 'o', 'ooze_magma');
    R.push(b.build('fg_bellows', 'The Bellows', 'forge', 'forge', 22, 3));
  }

  // F3 ── Crucible Walk (3 x 1): a lake of slag 22 tiles across with nothing over it. Only
  // the Duskwing Shroud gets you to the far side.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    pit(b, 24, 22);
    b.fill(10, 10, 4, 2).fill(56, 10, 4, 2);
    b.e(6, 11, 'T', 'lore_crucible');
    candles(b, [[4, 11], [20, 11], [50, 11], [68, 11]]);
    b.e(16, 11, 'k', 'knight_slag').e(62, 11, 'k', 'knight_slag').e(52, 11, 'o', 'ooze_magma').e(66, 3, 'b', 'bat_cinder');
    R.push(b.build('fg_crucible', 'Crucible Walk', 'forge', 'forge', 23, 5));
  }

  // F4 ── Smelter's Rest (1 x 1): save altar. The hole in its roof climbs the Chimney.
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0).hole('T', 0);
    plats(b, [[4, 8, 6]]);
    underHole(b, 0);
    b.e(18, 11, 'S').e(6, 11, 'T', 'lore_smelter');
    candles(b, [[3, 11], [21, 11]]);
    R.push(b.build('fg_rest', "Smelter's Rest", 'forge', 'shrine', 26, 5, { save: true }));
  }

  // F5 ── The Chimney (1 x 2): up from the Rest to the Great Forge's door. An Elixir at the top.
  {
    const b = new RB(1, 2);
    b.shell().hole('B', 0).door('L', 1);
    b.fill(10, 26, 4, 1, '='); // a grate over the hole, so the jump up from the Rest lands here
    plats(b, [[15, 22, 6], [8, 18, 5], [15, 14, 6], [7, 10, 6]]);
    b.e(9, 9, 'i', 'elixir');
    candles(b, [[3, 25], [20, 25], [17, 13]]);
    b.e(12, 6, 'b', 'bat_cinder').e(18, 20, 'b', 'bat_cinder');
    R.push(b.build('fg_chimney', 'The Chimney', 'forge', 'forge', 26, 3));
  }

  // F6 ── The Great Forge (2 x 2): the Hollow Colossus stands at the east end; the anvil and
  // the two bellows are on the floor in front of it (the boss places them, see
  // game/boss_colossus.ts). When its chest bursts open you walk into it: the fight ends in
  // 'fg_heart'. The high west door leads out through the Quench Shaft.
  {
    const b = new RB(2, 2);
    b.shell().door('R', 1).door('L', 0);
    b.fill(1, 12, 6, 2);
    plats(b, [[8, 22, 4], [3, 18, 5], [9, 15, 5]]);
    b.e(33, 25, 'W');
    R.push(b.build('fg_forge', 'The Great Forge', 'forge', 'forge', 24, 3, { boss: 'colossus' }));
  }

  // F6b ── Inside the Colossus (1 x 2): its chest, from the inside. No doors: you come in
  // through the breach (Colossus, 'breach') and leave by the glowing one that opens when the
  // Furnace Heart is dead. The Ashglass Ward and the Ashen Aegis are left in the ashes here,
  // and far below the Black Door opens.
  {
    const b = new RB(1, 2);
    b.shell();
    plats(b, [[2, 22, 5], [17, 22, 5], [9, 18, 6], [2, 14, 4], [18, 14, 4]]);
    b.e(10, 25, 'i', 'relic_ward').e(13, 25, 'i', 'shield_ashen');
    R.push(b.build('fg_heart', 'Inside the Colossus', 'forge', 'forge', 21, 3, { boss: 'colossus', warp: { x: 2, y: 25, to: 'fg_forge', tx: 26, ty: 25 } }));
  }

  // F7 ── Quench Shaft (1 x 2): the way out. Drop from the Forge's high door to the gate into
  // the Bellows, which is shut until the Colossus is dead (so the lava lake can't be skipped).
  {
    const b = new RB(1, 2);
    b.shell().door('R', 0).door('L', 1);
    b.fill(0, 22, 1, 4, 'G');
    b.fill(8, 12, 15, 2); // the landing under the Forge door
    plats(b, [[2, 16, 5], [9, 20, 6], [2, 23, 5]]);
    b.e(18, 11, 'i', 'heart_up').e(12, 11, 'T', 'lore_quench');
    candles(b, [[20, 11], [14, 25], [20, 25]]);
    R.push(b.build('fg_quench', 'Quench Shaft', 'forge', 'forge', 23, 3, { gateFlag: 'boss_colossus' }));
  }

  // ══════════════════════════════════════════════════════════ the Mirror Vault

  // V1 ── Threshold of Glass (2 x 1): behind the Black Door. A grate at the east end
  // (Down + Jump) drops into the Hall of Facets.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).hole('B', 1);
    b.fill(34, 12, 4, 1, '=');
    b.fill(14, 10, 3, 2).fill(24, 9, 3, 3);
    b.e(8, 11, 'T', 'lore_threshold');
    candles(b, [[4, 11], [20, 11], [42, 11]]);
    b.e(20, 11, 'k', 'knight_glass').e(30, 4, 'w', 'wisp_prism').e(12, 3, 'w', 'wisp_prism').e(42, 11, 'm');
    R.push(b.build('mv_threshold', 'Threshold of Glass', 'vault', 'crystal', 17, 5));
  }

  // V2 ── Hall of Facets (3 x 1): a hall built twice, each half the mirror of the other.
  // A Heart Max Up on the middle shelf (6 rows up: double jump).
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).hole('T', 2);
    plats(b, [[52, 8, 6]]);
    underHole(b, 2, 'L');
    for (const x of [8, 20]) {
      b.fill(x, 10, 3, 2); // crystal plinths, mirrored about the middle of the western two cells
      b.fill(44 - x, 10, 3, 2);
    }
    plats(b, [[22, 6, 4]]);
    b.e(23, 5, 'i', 'heart_up');
    candles(b, [[4, 11], [16, 11], [30, 11], [42, 11], [66, 11]]);
    b.e(14, 11, 'm').e(32, 11, 'm').e(42, 11, 'k', 'knight_glass').e(26, 3, 'w', 'wisp_prism').e(60, 5, 'w', 'wisp_prism');
    R.push(b.build('mv_facets', 'Hall of Facets', 'vault', 'crystal', 16, 6));
  }

  // V3 ── The Inverted Gallery (2 x 1): in this room LEFT is RIGHT (RoomDef.mirror). Two spike
  // troughs, and on a ledge over the second one the lever that opens the gate to the Mirror Heart.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    pit(b, 12, 5);
    pit(b, 26, 5);
    plats(b, [[26, 8, 5]]);
    b.e(28, 7, 'L', 'vault_gate').e(42, 11, 'T', 'lore_inverted');
    candles(b, [[6, 11], [21, 11], [36, 11], [44, 11]]);
    b.e(20, 4, 'w', 'wisp_prism').e(36, 11, 'm');
    R.push(b.build('mv_inverted', 'The Inverted Gallery', 'vault', 'crystal', 14, 6, { mirror: true }));
  }

  // V4 ── The Still Pool (1 x 1): save altar. Its west gate opens with the Inverted Gallery's lever.
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(0, 8, 1, 4, 'G');
    b.e(12, 11, 'S').e(18, 11, 'T', 'lore_pool');
    candles(b, [[5, 11], [21, 11]]);
    R.push(b.build('mv_pool', 'The Still Pool', 'vault', 'shrine', 13, 6, { save: true, gateFlag: 'vault_gate' }));
  }

  // V5 ── The Mirror Heart (2 x 1): one long bare hall. The boss stands five mirrors along it
  // (game/boss_mirror.ts); the copy only walks the floor, so there are no ledges.
  {
    const b = new RB(2, 1);
    b.shell().door('R', 0);
    b.e(22, 11, 'i', 'acc_shard').e(26, 11, 'i', 'heart_up');
    R.push(b.build('mv_heart', 'The Mirror Heart', 'vault', 'crystal', 11, 6, { boss: 'mirror' }));
  }

  // ══════════════════════════════════════════════════════════ the Archivist's Wing

  // A1 ── The Restricted Stacks (3 x 1): through the Study's west door. A fallen press blocks
  // the hall just inside: only the crawlspace under it (row 11) is open, so it needs the slide.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(54, 1, 8, 10); // the fallen press
    for (const [x, y, w, h] of [[6, 7, 5, 5], [16, 9, 5, 3], [30, 6, 5, 6], [42, 8, 5, 4]] as [number, number, number, number][]) b.fill(x, y, w, h, 'K');
    b.fill(22, 11, 4, 1, 'D').e(21, 11, 'a').e(26, 11, 'n');
    for (const [x, y] of [[7, 8], [9, 10], [17, 10], [31, 7], [33, 9], [43, 9], [45, 10]]) b.e(x, y, 't');
    b.e(66, 11, 'T', 'lore_stacks');
    candles(b, [[4, 11], [23, 10], [38, 11], [50, 11], [68, 11]]);
    b.e(12, 11, 'l').e(36, 11, 'l').e(40, 11, 'm').e(48, 3, 'p').e(14, 3, 'p');
    R.push(b.build('ar_stacks', 'The Restricted Stacks', 'archive', 'library', -8, -4));
  }

  // A2 ── The Chained Shelves (1 x 2): down from the Stacks to the Forbidden Section's door.
  {
    const b = new RB(1, 2);
    b.shell().door('R', 0).door('R', 1);
    b.fill(1, 12, 9, 2).fill(14, 12, 9, 2);
    plats(b, [[14, 22, 6], [5, 19, 6], [8, 16, 6], [10, 14, 4]]);
    b.fill(2, 20, 3, 6, 'K');
    b.e(3, 22, 't').e(3, 24, 't').e(6, 25, 'T', 'lore_shelves');
    candles(b, [[4, 11], [18, 11], [12, 25], [20, 25]]);
    b.e(16, 25, 'l').e(6, 6, 'w');
    R.push(b.build('ar_shelves', 'The Chained Shelves', 'archive', 'library', -9, -4));
  }

  // A3 ── The Forbidden Section (2 x 2): the Head Archivist's reading room. He stands at his
  // lectern on the floor between the two middle cases (a ghost: you walk and whip straight
  // through him), and his pages hang over the four tall cases and between them
  // (game/boss_archivist.ts knows where: x 192, 336, 480, 624).
  {
    const b = new RB(2, 2);
    b.shell().door('L', 0);
    b.fill(1, 12, 7, 2);
    for (const x of [10, 19, 28, 37]) b.fill(x, 20, 4, 6, 'K');
    plats(b, [[4, 17, 5], [14, 23, 5], [23, 23, 5], [32, 23, 5]]);
    b.e(25, 25, 'W');
    b.e(22, 25, 'i', 'acc_lens').e(26, 25, 'i', 'life_up');
    R.push(b.build('ar_forbidden', 'The Forbidden Section', 'archive', 'library', -8, -3, { boss: 'archivist' }));
  }

  return R;
}
