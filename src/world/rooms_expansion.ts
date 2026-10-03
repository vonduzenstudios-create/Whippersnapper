// The castle beyond the Ossuary Wyrm: the Undervault hub and three regions that loop
// into each other and back into the old castle. See docs/level-design.md for the map.
//
// Movement rules these layouts rely on (docs/level-design.md has the numbers):
//   - normal steps are at most 4 rows up; a 6-7 row step needs the Raven Mantle
//   - a gap one tile high needs the Frostrunner Greaves (slide); paths everyone must
//     take are at least 3 tiles high (standing is 36 px)
//   - to climb up through a hole in a ceiling: a ledge 4 rows down (6 wide) and one
//     2 rows down exactly under the hole, like the Ossuary Shaft. The room above
//     catches you on the floor beside its hole
//
// Enemy letters: g wild dog, y harpy, r bell wraith, c frost crawler (plus the old ones).
import { RB, RoomDef, SKY_SECRETS } from './rooms';

/** One-way ledges: [x, y, width]. */
function plats(b: RB, list: [number, number, number][]) {
  for (const [x, y, w] of list) b.fill(x, y, w, 1, '=');
}
/** The two ledges under a ceiling hole in cell column `cx` (see the note at the top). */
function underHole(b: RB, cx: number, side: 'L' | 'R' = 'R') {
  const hx = cx * 24 + 10;
  b.fill(side === 'R' ? hx : hx - 2, 4, 6, 1, '=');
  b.fill(hx, 2, 4, 1, '=');
}

export function buildExpansionRooms(): RoomDef[] {
  const R: RoomDef[] = [];

  // ══════════════════════════════════════════════════════════ the Undervault (hub)

  // U1 ── The Undervault (3 x 2): the Lair's far gate opens into its lower left.
  // Save altar and Ilsabet's letter by the door, the sealed Black Door at the bottom right,
  // a hole up to the Warden's Stair and a door east to the Root Cellar.
  {
    const b = new RB(3, 2);
    b.shell().door('L', 1).door('R', 0).hole('T', 1);
    b.fill(46, 12, 25, 2); // upper floor (east door)
    b.fill(62, 14, 9, 12); // its foundations
    b.fill(60, 20, 2, 1).fill(61, 21, 1, 5, 'G'); // the Black Door: a gate that never opens (yet)
    plats(b, [[26, 22, 6], [33, 18, 6], [39, 15, 6]]); // lower floor -> upper floor
    plats(b, [[38, 8, 6]]); // upper floor -> the hole
    underHole(b, 1);
    b.e(5, 25, 'S').e(11, 25, 'T', 'lore_letter').e(57, 25, 'T', 'lore_deep');
    b.e(2, 25, 'C').e(20, 25, 'C').e(36, 17, 'C').e(50, 11, 'C').e(66, 11, 'C').e(41, 7, 'C');
    b.e(30, 25, 's').e(48, 25, 's').e(56, 11, 'k').e(20, 8, 'w').e(52, 4, 'w');
    R.push(b.build('undervault', 'The Undervault', 'undervault', 'catacomb', 14, 4, { gateFlag: 'deep_door' }));
  }

  // U2 ── Warden's Stair (1 x 4): the spine of the new castle. Up from the Undervault;
  // doors to the Bellfoot Court (top left), the Kennel Gate (right) and the Servants' Gallery (left).
  {
    const b = new RB(1, 4);
    b.shell().hole('B', 0).door('L', 0).door('R', 1).door('L', 2);
    b.fill(1, 40, 5, 2); // Servants' Gallery landing (left, cell 2)
    b.fill(18, 26, 5, 2); // Kennel Gate landing (right, cell 1)
    b.fill(1, 12, 5, 2); // Bellfoot landing (left, cell 0)
    plats(b, [
      [15, 50, 6], [8, 46, 6], [6, 43, 5], // floor -> left landing (row 40)
      [9, 36, 6], [16, 32, 6], [12, 29, 5], // -> right landing (row 26)
      [10, 22, 6], [3, 18, 6], [8, 15, 5], // -> top left landing (row 12)
    ]);
    b.e(3, 39, 'C').e(20, 25, 'C').e(3, 11, 'C').e(12, 49, 'C').e(13, 21, 'C');
    b.e(4, 53, 's').e(19, 31, 's').e(12, 10, 'b').e(6, 34, 'b');
    R.push(b.build('wardenstair', "Warden's Stair", 'undervault', 'stair', 15, 0));
  }

  // U3 ── Servants' Gallery (5 x 1): a long hall back toward the old castle. The lever at
  // its west end raises the gate into the Sanctum of Rest: a shortcut to the save room.
  // A heart vessel sits on a high shelf that only a double jump reaches.
  {
    const b = new RB(5, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(0, 8, 1, 4, 'G'); // the far side of the Sanctum's gate
    b.e(4, 11, 'L', 'servants_gate');
    // long tables and cupboards
    b.fill(14, 10, 5, 2).fill(34, 10, 6, 2).fill(58, 9, 3, 3).fill(100, 9, 3, 3);
    plats(b, [[22, 8, 6], [44, 8, 5], [90, 8, 5], [108, 7, 6]]);
    // a long table under a high shelf: 6 rows up from the table top, so it needs a double jump
    b.fill(68, 10, 10, 2);
    plats(b, [[71, 4, 4]]);
    b.e(72, 3, 'i', 'life_up');
    b.e(8, 11, 'C').e(24, 7, 'C').e(46, 7, 'C').e(68, 6, 'C').e(92, 7, 'C').e(112, 11, 'C');
    b.e(28, 11, 'k').e(52, 11, 'g').e(56, 11, 'g').e(76, 11, 'k').e(96, 11, 'z').e(104, 11, 'z');
    b.e(40, 3, 'b').e(86, 3, 'b');
    R.push(b.build('servants', "Servants' Gallery", 'undervault', 'hall', 10, 2, { gateFlag: 'servants_gate' }));
  }

  // U4 ── Root Cellar (2 x 1): east of the Undervault, on to the Old Well.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(12, 10, 3, 2).fill(30, 9, 4, 3);
    plats(b, [[20, 7, 6], [36, 6, 5]]);
    b.e(37, 5, 'i', 'potion');
    b.e(6, 11, 'C').e(22, 6, 'C').e(42, 11, 'C');
    b.e(18, 11, 'z').e(26, 11, 'z').e(40, 11, 'g');
    R.push(b.build('cellar', 'Root Cellar', 'undervault', 'catacomb', 17, 4));
  }

  // ══════════════════════════════════════════════════════════ Kennel Yards & Briar Garden

  // K1 ── Kennel Gate (3 x 1): out into the night garden. The hole in the gatehouse roof
  // is the bottom of Raven's Drop (you land here coming down from the Belfry).
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0).hole('T', 1);
    b.fill(14, 9, 4, 3).fill(52, 10, 5, 2); // kennel huts
    plats(b, [[28, 8, 6]]);
    underHole(b, 1);
    b.e(8, 11, 'T', 'run');
    b.e(5, 11, 'C').e(30, 7, 'C').e(46, 11, 'C').e(64, 11, 'C');
    b.e(24, 11, 'g').e(42, 11, 'g').e(60, 11, 'g');
    R.push(b.build('kennelgate', 'Kennel Gate', 'kennels', 'garden', 16, 1));
  }

  // K2 ── Briar Maze (2 x 2): thorny hedges. A hole in the bottom left drops into the Old
  // Well (the way back up needs a double jump).
  {
    const b = new RB(2, 2);
    b.shell().door('L', 0).door('R', 1).hole('B', 0);
    b.fill(1, 12, 14, 2); // entry ledge
    b.fill(16, 25, 6, 1, '^'); // thorns on the bottom floor
    b.fill(26, 1, 21, 4); // overgrown hedge mass at the top right
    b.fill(44, 12, 3, 9); // hedge wall
    plats(b, [[15, 22, 8], [20, 18, 5], [15, 15, 4]]); // over the thorns, and back up to the entry ledge
    plats(b, [[30, 22, 6], [38, 18, 5], [31, 14, 6], [37, 10, 6]]);
    b.e(40, 9, 'i', 'heart_up');
    b.e(6, 11, 'C').e(18, 20, 'C').e(33, 13, 'C').e(42, 25, 'C');
    b.e(8, 25, 'g').e(32, 25, 'g').e(40, 25, 'g').e(20, 15, 'y');
    R.push(b.build('briarmaze', 'Briar Maze', 'kennels', 'garden', 19, 1));
  }

  // K3 ── Kennel Yards (3 x 1): long open runs full of dogs. A hole in the roof at the
  // west end leads up to the Groundskeeper's Rest (save).
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0).hole('T', 0);
    plats(b, [[4, 8, 6]]);
    underHole(b, 0);
    b.fill(22, 10, 4, 2).fill(40, 10, 4, 2).fill(56, 9, 3, 3); // kennels and a feed trough
    b.e(30, 11, 'T', 'run');
    b.e(2, 11, 'C').e(20, 11, 'C').e(38, 11, 'C').e(54, 11, 'C').e(68, 11, 'C');
    b.e(32, 11, 'g').e(36, 11, 'g').e(48, 11, 'g').e(52, 11, 'g').e(62, 11, 'g').e(46, 3, 'y');
    R.push(b.build('kennelyard', 'Kennel Yards', 'kennels', 'garden', 21, 2));
  }

  // K4 ── Groundskeeper's Rest (1 x 1): save altar above the Kennel Yards.
  {
    const b = new RB(1, 1);
    b.shell().hole('B', 0);
    b.e(4, 11, 'S').e(19, 11, 'T', 'lore_kennel').e(2, 11, 'C').e(16, 11, 'C');
    R.push(b.build('gardenrest', "Groundskeeper's Rest", 'kennels', 'shrine', 21, 1, { save: true }));
  }

  // K5 ── The Hound Pit (2 x 2): Gnarlfang's arena. The Frostrunner Greaves appear when
  // it dies, and the one-tile tunnel in the east wall leads to the Huntsman's Lodge.
  {
    const b = new RB(2, 2);
    b.shell().door('L', 1).door('R', 1);
    b.fill(42, 22, 6, 3); // low tunnel to the east (into the doorway too): slide through row 25
    plats(b, [[5, 22, 7], [35, 22, 6], [18, 18, 12]]);
    b.e(24, 20, 'W');
    b.e(24, 17, 'i', 'relic_greaves');
    R.push(b.build('houndpit', 'The Hound Pit', 'kennels', 'garden', 24, 1, { boss: 'hound' }));
  }

  // K6 ── Huntsman's Lodge (2 x 1): reached by sliding out of the Hound Pit. A trophy room
  // with a hole in the floor down to the Rime Stair (and the Aqueduct far below).
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).hole('B', 1);
    b.fill(0, 8, 5, 3); // the tunnel continues: only row 11 is open
    b.fill(18, 9, 4, 3);
    plats(b, [[10, 7, 5], [26, 7, 6]]);
    b.e(12, 6, 'i', 'acc_fang').e(16, 11, 'T', 'lore_hunt');
    b.e(8, 11, 'C').e(28, 6, 'C').e(44, 11, 'C');
    R.push(b.build('lodge', "Huntsman's Lodge", 'kennels', 'hall', 26, 2));
  }

  // ══════════════════════════════════════════════════════════ the Belfry

  // B1 ── Bellfoot Court (4 x 1): under the bell tower. West: a cracked wall into the old
  // Armory. East: the Warden's Stair. A hole in the ceiling leads up the Ringing Climb.
  {
    const b = new RB(4, 1);
    b.shell().door('L', 0).door('R', 0).hole('T', 1);
    plats(b, [[28, 8, 6]]);
    underHole(b, 1);
    b.fill(56, 7, 10, 5); // the cracked old bell, fallen long ago
    plats(b, [[48, 8, 6], [68, 8, 6]]);
    b.e(61, 6, 'i', 'potion');
    b.e(6, 11, 'C').e(22, 11, 'C').e(30, 7, 'C').e(50, 7, 'C').e(80, 11, 'C');
    b.e(16, 11, 's').e(44, 11, 'r').e(76, 11, 'k').e(86, 3, 'b').e(36, 3, 'b');
    R.push(b.build('bellfoot', 'Bellfoot Court', 'belfry', 'belfry', 11, 0));
  }

  // B2 ── The Ringing Climb (1 x 4): the bell tower's shaft. Each landing is 14 rows above
  // the last: swing from the iron rings to get up.
  {
    const b = new RB(1, 4);
    b.shell().hole('B', 0).door('L', 2).door('R', 1).door('R', 0);
    // Each climb is two rings, CV4 style: jump and catch the low ring by the hole, swing and
    // let go to fly up to the high ring on the far side, then swing from that one and let go
    // to land on the next landing.
    b.fill(1, 40, 8, 2); // landing by the Rookery door
    b.fill(13, 26, 10, 2); // landing by the Loft door
    b.fill(13, 12, 10, 2); // landing by the Great Belfry door
    b.e(10, 44, 'O').e(10, 30, 'O').e(10, 16, 'O'); // low rings
    b.e(18, 37, 'O').e(5, 25, 'O').e(4, 10, 'O'); // high rings
    b.e(3, 39, 'C').e(19, 25, 'C').e(19, 11, 'C');
    b.e(16, 36, 'y').e(6, 22, 'y').e(4, 8, 'b');
    R.push(b.build('belfryshaft', 'The Ringing Climb', 'belfry', 'belfry', 12, -4));
  }

  // B3 ── Harpy Rookery (2 x 1): nests on the beams. The highest nest needs a double jump.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0); // the west door leads into the Ashen Library
    plats(b, [[6, 10, 6], [20, 10, 6], [34, 10, 6]]);
    plats(b, [[13, 4, 5]]); // high nest: 6 rows above the beams
    b.e(15, 3, 'i', 'acc_bell').e(40, 11, 'T', 'lore_rookery');
    b.e(8, 9, 'C').e(36, 9, 'C').e(24, 11, 'C');
    b.e(10, 5, 'y').e(28, 4, 'y').e(38, 5, 'y');
    R.push(b.build('rookery', 'Harpy Rookery', 'belfry', 'belfry', 10, -2));
  }

  // B4 ── Bellwright's Loft (2 x 1): save altar before the Great Belfry.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0);
    b.fill(30, 10, 6, 2); // workbench
    b.e(16, 11, 'S').e(26, 11, 'T', 'lore_bellwright').e(32, 9, 'i', 'potion');
    b.e(6, 11, 'C').e(40, 11, 'C');
    R.push(b.build('loft', "Bellwright's Loft", 'belfry', 'belfry', 13, -3, { save: true }));
  }

  // B5 ── The Great Belfry (2 x 2): the Bell-Mother's nest under the great bell. The door
  // high on the east wall leads out onto the roofs; the Raven Mantle appears when she falls.
  {
    const b = new RB(2, 2);
    b.shell().door('L', 1).door('R', 0);
    b.fill(40, 12, 7, 2); // roof door landing
    plats(b, [[4, 22, 8], [36, 22, 8], [14, 18, 8], [26, 18, 8], [33, 15, 6]]);
    b.e(24, 10, 'W');
    b.e(18, 17, 'i', 'relic_mantle');
    R.push(b.build('greatbelfry', 'The Great Belfry', 'belfry', 'belfry', 13, -5, { boss: 'bellmother' }));
  }

  // B6 ── Windswept Spire (3 x 1): out on the roofs. Spiked gutters, harpies, a prize on
  // the highest gable, and a hole down Raven's Drop at the east end.
  {
    const b = new RB(3, 1);
    b.fill(0, 0, 1, 8).fill(0, 12, 72, 2).door('L', 0); // the tower wall behind you
    b.fill(71, 0, 1, 14);
    b.fill(14, 12, 6, 2, '.').fill(14, 13, 6, 1, '^'); // spiked gutter
    b.fill(34, 12, 6, 2, '.').fill(34, 13, 6, 1, '^');
    b.fill(24, 9, 6, 3); // gable
    b.fill(44, 9, 4, 3);
    plats(b, [[25, 3, 4]]); // gable top prize: 6 rows above the gable
    b.hole('B', 2);
    b.e(26, 2, 'i', 'life_up');
    b.e(6, 11, 'C').e(46, 8, 'C').e(66, 11, 'C');
    b.e(20, 4, 'y').e(40, 3, 'y').e(54, 5, 'y');
    b.sky();
    SKY_SECRETS.spire(b);
    R.push(b.build('spire', 'Windswept Spire', 'belfry', 'rooftop', 15, -5));
  }

  // B7 ── Raven's Drop (1 x 5): a long fall down the outside of the tower to the Kennel
  // Gate. Climbing back up needs a double jump (7-row steps). A slit in the wall halfway
  // down hides a pocket you can only slide into.
  {
    const b = new RB(1, 5);
    b.fill(0, 0, 1, 70).fill(23, 0, 1, 70).fill(0, 68, 24, 2);
    b.hole('B', 0);
    underHole(b, 0);
    // wall pocket: 3 rows tall inside, but its mouth (x 6-8, row 42) is only one tile high
    b.fill(1, 36, 8, 7).fill(1, 40, 5, 3, '.').fill(6, 42, 3, 1, '.');
    b.fill(1, 43, 12, 1); // ledge under the pocket
    plats(b, [[3, 8, 6], [14, 15, 7], [3, 22, 7], [14, 29, 8], [14, 47, 8], [3, 54, 7], [15, 61, 7]]);
    b.e(3, 42, 'i', 'heart_up');
    b.e(5, 7, 'C').e(17, 28, 'C').e(10, 42, 'C').e(18, 60, 'C');
    b.e(10, 18, 'y').e(12, 50, 'y');
    R.push(b.build('ravensdrop', "Raven's Drop", 'belfry', 'rooftop', 17, -4));
  }

  // ══════════════════════════════════════════════════════════ Rimeworks Aqueduct

  // A1 ── The Old Well (1 x 5): from the Briar Maze hole down to the Aqueduct. The lower
  // part climbs with normal jumps (Root Cellar <-> the bottom), the top needs a double jump.
  {
    const b = new RB(1, 5);
    b.shell().hole('T', 0).door('L', 1).door('R', 3).door('L', 4);
    b.fill(1, 26, 6, 2); // Root Cellar landing
    b.fill(18, 54, 5, 2); // Cistern landing
    plats(b, [
      [8, 64, 6], [14, 60, 6], [12, 58, 5], // bottom -> Cistern landing (row 54)
      [10, 50, 6], [3, 46, 6], [10, 42, 6], [16, 38, 6], [9, 34, 6], [8, 30, 6], // -> Root Cellar landing (row 26)
      [10, 19, 6], [3, 12, 6], [10, 5, 6], [10, 2, 4], // -> the top hole: 7-row steps
    ]);
    b.e(4, 25, 'C').e(20, 53, 'C').e(12, 63, 'C').e(5, 11, 'C');
    b.e(2, 48, 'c').e(21, 33, 'c').e(12, 15, 'b');
    R.push(b.build('oldwell', 'The Old Well', 'aqueduct', 'aqueduct', 19, 3));
  }

  // A2 ── Frozen Cistern (3 x 2): a tidal reservoir. A bridge across the top, and below it
  // water that rises from the bottom (row 24) to just under the bridge (row 15) and back.
  // A slide-only pocket in the lower west wall. Under the middle of the bridge hangs a
  // sealed tank with a hole in its floor: swim up into it at high tide (or double jump).
  {
    const b = new RB(3, 2);
    b.shell().door('L', 0).door('R', 0);
    b.fill(1, 12, 8, 2).fill(64, 12, 7, 2); // door ledges
    plats(b, [[12, 12, 8], [24, 11, 10], [38, 12, 8], [50, 11, 10]]); // the bridge
    // pocket in the lower west wall: 3 rows tall inside, its mouth (x 6-9, row 25) one tile high
    b.fill(1, 18, 9, 8).fill(1, 23, 5, 3, '.').fill(6, 25, 4, 1, '.');
    plats(b, [[12, 22, 6], [17, 18, 5], [12, 15, 5]]); // the one climb back to the bridge (west)
    // the hanging tank: walls x 30 and 39, roof row 14, floor row 18 with a hole at x 34-35.
    // Its floor is 8 rows above the bottom, out of reach of a single jump.
    b.fill(30, 14, 10, 1).fill(30, 15, 1, 3).fill(39, 15, 1, 3).fill(30, 18, 10, 1).fill(34, 18, 2, 1, '.');
    b.e(32, 17, 'i', 'con_up');
    b.e(20, 25, 'T', 'tide').e(26, 25, 'T', 'leap');
    b.e(3, 25, 'i', 'armor_raven');
    b.e(4, 11, 'C').e(28, 10, 'C').e(54, 10, 'C').e(66, 11, 'C').e(14, 21, 'C');
    b.e(44, 25, 'c').e(58, 25, 'c').e(36, 3, 'w').e(60, 4, 'w').e(18, 3, 'b');
    b.e(46, 1, 'c').e(22, 1, 'c'); // frost crawlers clinging to the vault, over the bridge
    R.push(b.build('cistern', 'Frozen Cistern', 'aqueduct', 'aqueduct', 20, 6, { tide: { low: 24, high: 15 } }));
  }

  // A3 ── Pump House (1 x 1): save altar.
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0).door('R', 0);
    b.e(12, 11, 'S').e(4, 11, 'C').e(20, 11, 'C').e(16, 11, 'T', 'lore_pump');
    R.push(b.build('pumphouse', 'Pump House', 'aqueduct', 'shrine', 23, 6, { save: true }));
  }

  // A4 ── Aqueduct Span (4 x 1): a broken aqueduct over a frozen ravine. The far end is
  // 7 rows higher (double jump) and holds the Rime Chain; a hole there climbs to the Lodge.
  {
    const b = new RB(4, 1);
    b.shell().door('L', 0).hole('T', 3);
    b.fill(30, 12, 8, 2, '.').fill(30, 13, 8, 1, '^'); // ice spikes in a break in the span
    plats(b, [[16, 8, 5]]);
    b.fill(56, 5, 39, 9); // the high end of the span: 7 rows above the floor, nothing in between
    plats(b, [[82, 2, 4]]); // under the hole (3 rows above the high end)
    b.e(64, 4, 'i', 'whip_rime').e(60, 4, 'T', 'lore_span');
    b.e(6, 11, 'C').e(24, 11, 'C').e(46, 7, 'C').e(70, 4, 'C');
    b.e(20, 11, 'c').e(48, 1, 'c').e(26, 1, 'c').e(36, 4, 'b').e(72, 2, 'w'); // row 1 = clinging to the ceiling
    R.push(b.build('span', 'Aqueduct Span', 'aqueduct', 'aqueduct', 24, 6));
  }

  // A5 ── Rime Stair (1 x 3): from the top of the Span up to the Huntsman's Lodge.
  {
    const b = new RB(1, 3);
    b.shell().hole('T', 0).hole('B', 0);
    underHole(b, 0);
    plats(b, [[3, 36, 6], [14, 32, 6], [4, 28, 6], [14, 24, 6], [4, 20, 6], [14, 16, 6], [4, 12, 6], [13, 8, 6]]);
    b.e(5, 11, 'i', 'life_up');
    b.e(17, 32, 'C').e(7, 20, 'C');
    b.e(20, 24, 'c').e(2, 30, 'c');
    R.push(b.build('rimestair', 'Rime Stair', 'aqueduct', 'aqueduct', 27, 3));
  }

  // A6 ── Ice Conduit (3 x 1): a channel between the Frost Sluice and the Forgotten Drain.
  // The tide floods it from dry up to row 7. A shelf high on the east side (row 4, 8 rows
  // over the floor, far from anything to jump from) is reached by leaping out at high tide.
  {
    const b = new RB(3, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(28, 9, 4, 3); // ice block
    b.fill(46, 4, 7, 1); // the high shelf
    b.e(49, 3, 'i', 'potion').e(51, 3, 'i', 'str_up');
    b.e(8, 11, 'T', 'tide');
    b.e(6, 11, 'C').e(30, 8, 'C').e(64, 11, 'C').e(48, 3, 'C');
    b.e(18, 11, 'c').e(40, 1, 'c').e(60, 1, 'c').e(22, 4, 'w');
    R.push(b.build('conduit', 'Ice Conduit', 'aqueduct', 'aqueduct', 12, 7, { tide: { low: 12, high: 7 } }));
  }

  // A7 ── Frost Sluice (4 x 1): from the bottom of the Old Well west toward the catacombs.
  // A long crawlspace under the sluice gate needs the slide.
  {
    const b = new RB(4, 1);
    b.shell().door('L', 0).door('R', 0);
    b.fill(20, 1, 10, 10); // sluice gate housing: only row 11 is open beneath it
    b.fill(46, 10, 4, 2).fill(64, 9, 3, 3);
    plats(b, [[54, 7, 6], [72, 6, 6]]);
    b.e(74, 5, 'i', 'heart_up');
    b.e(8, 11, 'C').e(40, 11, 'C').e(56, 6, 'C').e(86, 11, 'C');
    b.e(42, 1, 'c').e(80, 11, 'c').e(84, 1, 'c').e(60, 3, 'b'); // row 1 = clinging to the ceiling
    R.push(b.build('sluice', 'Frost Sluice', 'aqueduct', 'aqueduct', 15, 7));
  }

  // A8 ── Forgotten Drain (4 x 1): under the Shrine of the Chain. Break the shrine's cracked
  // floor to drop in. Broken stones stay broken, so after that you can climb back up.
  {
    const b = new RB(4, 1);
    b.shell().door('R', 0).hole('T', 0);
    plats(b, [[4, 8, 6]]);
    underHole(b, 0);
    b.fill(30, 10, 5, 2).fill(52, 9, 4, 3);
    plats(b, [[62, 7, 6], [78, 8, 6]]);
    b.e(64, 6, 'i', 'elixir').e(20, 11, 'T', 'lore_drain');
    b.e(2, 11, 'C').e(26, 11, 'C').e(48, 11, 'C').e(80, 7, 'C');
    b.e(40, 11, 'c').e(70, 1, 'c').e(34, 1, 'c').e(58, 3, 'w'); // row 1 = clinging to the ceiling
    R.push(b.build('drain', 'Forgotten Drain', 'aqueduct', 'aqueduct', 8, 7));
  }

  // ══════════════════════════════════════════════════════════ secrets in the old castle

  // C1 ── Rampart Walk (2 x 1): above the Ruined Courtyard. The walkway is a one-way ledge,
  // so you can jump up onto it from the courtyard (double jump) and drop back down.
  {
    const b = new RB(2, 1);
    b.fill(0, 0, 1, 14).fill(47, 0, 1, 14);
    b.fill(1, 13, 46, 1, '=');
    // merlons (kept clear of x 8-15, above the courtyard ledge you jump up from)
    b.fill(3, 9, 3, 4).fill(22, 9, 3, 4).fill(36, 9, 3, 4);
    plats(b, [[22, 5, 3]]);
    b.e(23, 4, 'i', 'heart_up').e(30, 12, 'T', 'lore_rampart');
    b.e(4, 8, 'C').e(37, 8, 'C');
    b.e(16, 6, 'y').e(32, 5, 'y');
    b.sky();
    SKY_SECRETS.rampart(b);
    R.push(b.build('rampart', 'Rampart Walk', 'castle', 'rooftop', 3, 1));
  }

  return R;
}
