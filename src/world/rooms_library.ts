// The Ashen Library: a wing of 12 rooms north-west of the old castle, entered through a new
// west door in the Harpy Rookery (so it needs the Chain Grapple, to climb the Ringing Climb).
// See docs/level-design.md for the map.
//
// Furniture: bookcases ('K') and tables ('D') stand in the same layer as the hero, but you
// walk in front of them; only their tops are solid (like one-way ledges). The 't' entity is a
// Rustling Tome: place tomes INSIDE bookcase tiles. They sleep there until you pass, then tear
// loose and flap at you. Chairs ('n') are scenery that face the table beside them; a Restless
// Chair ('a') looks exactly the same until you come close. A Bone Librarian ('l') stands on
// the floor in front of a bookcase, shelving books with its back turned until you come close.
//
// The Grand Staircase is a ramp ('\' tiles): you walk up and down it, it's only drawn as steps.
//
// Movement rules are the same as in rooms_expansion.ts: steps of at most 4 rows, a 6-7 row
// step needs the Raven Mantle (double jump), paths everyone takes have 3+ tiles of headroom.
import { RB, RoomDef } from './rooms';

/** One-way ledges: [x, y, width]. */
function plats(b: RB, list: [number, number, number][]) {
  for (const [x, y, w] of list) b.fill(x, y, w, 1, '=');
}
/** Bookcases (walk-through, standable top, shelves of spines): [x, y, width, height]. */
function cases(b: RB, list: [number, number, number, number][]) {
  for (const [x, y, w, h] of list) b.fill(x, y, w, h, 'K');
}
/**
 * A table on the floor (one tile high, top standable) with a chair at each end: [x, y, width,
 * left chair, right chair], y = the row just above the floor. A chair is 'n' (scenery), 'a' (a
 * Restless Chair) or '' (none).
 */
function tables(b: RB, list: [number, number, number, string, string][]) {
  for (const [x, y, w, l, r] of list) {
    b.fill(x, y, w, 1, 'D');
    if (l) b.e(x - 1, y, l);
    if (r) b.e(x + w, y, r);
  }
}
/** Sleeping tomes, each at a tile inside a bookcase: [x, y]. */
function tomes(b: RB, list: [number, number][]) {
  for (const [x, y] of list) b.e(x, y, 't');
}
/** Candles on the floor row (or on a surface: pass the row just above it): [x, y]. */
function candles(b: RB, list: [number, number][]) {
  for (const [x, y] of list) b.e(x, y, 'C');
}
/**
 * The top two ledges under a ceiling hole in cell column `cx` (the Ossuary Shaft pattern:
 * the room above catches you on the floor beside its hole). The side picks which way the
 * wider ledge sticks out, so it can sit next to a stepping ledge.
 */
function underHole(b: RB, cx: number, side: 'L' | 'R' = 'R') {
  const hx = cx * 24 + 10;
  b.fill(side === 'R' ? hx : hx - 2, 4, 6, 1, '=');
  b.fill(hx, 2, 4, 1, '=');
}

export function buildLibraryRooms(): RoomDef[] {
  const R: RoomDef[] = [];

  // ══════════════════════════════════════════════════════════ the entrance

  // L1 ── Lending Hall (2 x 1): through the Rookery's new west door. The first bookcases, with
  // three tomes asleep in them, a reading table with a candle (one of its chairs is restless),
  // and a brass plate.
  {
    const b = new RB(2, 1);
    b.shell().door('L', 0).door('R', 0);
    cases(b, [[6, 9, 5, 3], [15, 8, 5, 4], [26, 10, 6, 2], [38, 8, 5, 4]]);
    plats(b, [[22, 8, 4]]);
    tables(b, [[33, 11, 3, 'n', 'a']]);
    tomes(b, [[16, 9], [18, 10], [40, 9]]);
    b.e(13, 11, 'T', 'lore_lending');
    candles(b, [[4, 11], [28, 9], [34, 10], [44, 11]]);
    b.e(23, 11, 's').e(45, 11, 's').e(29, 11, 'l');
    R.push(b.build('lib_lending', 'Lending Hall', 'library', 'library', 8, -2));
  }

  // L2 ── Card Catalogue (1 x 1): drawers of index cards. Two holes: up into the Reader's
  // Nook, and down (through a grate: Down + Jump) into the Undercroft. Climb the cabinet
  // and the two ledges to reach the hole in the roof.
  {
    const b = new RB(1, 1);
    b.shell().door('L', 0).door('R', 0).hole('T', 0).hole('B', 0);
    b.fill(10, 12, 4, 1, '='); // grate over the floor hole
    cases(b, [[2, 9, 4, 3], [17, 8, 5, 4]]);
    underHole(b, 0);
    tomes(b, [[3, 10], [18, 9], [20, 10]]);
    b.e(7, 11, 'T', 'lore_catalogue').e(15, 11, 'T', 'drop');
    candles(b, [[8, 11], [19, 7], [23, 11]]);
    b.e(8, 5, 'w');
    R.push(b.build('lib_catalogue', 'Card Catalogue', 'library', 'library', 7, -2));
  }

  // L3 ── Reader's Nook (1 x 1): a save altar above the Catalogue, and Pell's shop. The shelf here holds no tomes.
  {
    const b = new RB(1, 1);
    b.shell().hole('B', 0);
    cases(b, [[15, 9, 5, 3]]);
    tables(b, [[8, 11, 3, 'n', 'n']]);
    b.e(4, 11, 'S').e(21, 11, 'T', 'lore_nook').e(17, 11, 'M'); // Pell keeps his shop by the shelf
    candles(b, [[2, 11], [9, 10], [14, 11], [22, 11]]);
    R.push(b.build('lib_nook', "Reader's Nook", 'library', 'library', 7, -3, { save: true }));
  }

  // ══════════════════════════════════════════════════════════ the Grand Staircase

  // L4 ── The Grand Staircase (4 x 3): one enormous flight climbing right to left, a ramp that
  // rises one tile every two (drawn as steps), with a landing every nine "steps". Bookcases stand on the landings and hang
  // from the ceiling; their tomes wake as you climb to their height. The door at the bottom
  // right comes from the Catalogue; the top landing leads on to the Upper Gallery, and the
  // hole above it climbs to the Great Reading Room.
  {
    const b = new RB(4, 3); // 96 x 42 tiles, floor rows 40-41
    b.shell().door('R', 2).door('L', 0).hole('T', 0);
    // the surface row of every column, built from the right: flat entry, 9 steps, a landing,
    // 9 steps, a landing, 10 steps, the top landing
    const surf: number[] = new Array(96).fill(40);
    const slope: boolean[] = new Array(96).fill(false); // columns of ramp, not landing
    let cx = 84, row = 40;
    const steps = (n: number) => {
      for (let k = 0; k < n; k++) {
        cx -= 2;
        row -= 1;
        surf[cx] = surf[cx + 1] = row;
        slope[cx] = slope[cx + 1] = true;
      }
    };
    const landing = (w: number) => {
      for (let i = 1; i <= w; i++) surf[cx - i] = row;
      cx -= w;
    };
    steps(9);
    landing(10);
    steps(9);
    landing(10);
    steps(10);
    landing(7); // x 1..7 at row 12
    // solid under the surface; on the ramp columns the surface tile itself is the slope
    for (let x = 1; x < 95; x++) {
      if (surf[x] < 40) b.fill(x, surf[x], 1, 40 - surf[x], '#');
      if (slope[x]) b.fill(x, surf[x], 1, 1, '\\');
    }
    // up through the hole in the ceiling: a stepping ledge, then the two under-hole ledges
    plats(b, [[6, 8, 6]]);
    underHole(b, 0);
    // bookcases on the landings, and hanging from the ceiling
    cases(b, [[58, 27, 5, 4], [30, 18, 5, 4]]);
    cases(b, [[1, 1, 6, 3], [30, 1, 8, 6], [44, 1, 6, 5], [56, 1, 8, 6], [78, 1, 10, 4]]);
    tomes(b, [[59, 28], [61, 29], [31, 19], [33, 20]]);
    tomes(b, [[3, 2], [5, 3], [32, 3], [34, 5], [36, 4], [58, 3], [61, 5], [80, 2], [84, 3]]);
    b.e(88, 39, 'T', 'lore_stair');
    candles(b, [[85, 39], [92, 39], [56, 30], [65, 30], [28, 21], [37, 21], [2, 11], [7, 11]]);
    b.e(64, 30, 'k').e(36, 21, 's').e(48, 16, 'w').e(20, 8, 'w');
    b.e(5, 11, 'i', 'potion');
    R.push(b.build('lib_stair', 'The Grand Staircase', 'library', 'library', 3, -4));
  }

  // ══════════════════════════════════════════════════════════ the upper floors

  // L5 ── Upper Gallery (3 x 1): the long hall at the top of the stairs. Bookcases line it, and
  // a hole in the roof (a stepping ledge, then two more) climbs to the Clerk's Mezzanine.
  {
    const b = new RB(3, 1);
    b.shell().door('R', 0).door('L', 0).hole('T', 1);
    cases(b, [[8, 8, 6, 4], [20, 9, 5, 3], [44, 8, 6, 4], [56, 9, 5, 3]]);
    plats(b, [[28, 8, 6]]);
    underHole(b, 1);
    tables(b, [[64, 11, 4, 'n', 'a']]);
    tomes(b, [[9, 9], [11, 10], [22, 10], [45, 9], [47, 10], [48, 9], [57, 10], [59, 10]]);
    candles(b, [[4, 11], [26, 11], [41, 11], [54, 8], [66, 10]]);
    b.e(31, 11, 'k').e(52, 11, 's').e(16, 5, 'w');
    R.push(b.build('lib_gallery', 'Upper Gallery', 'library', 'library', 0, -4));
  }

  // L6 ── Scriptorium (2 x 1): two writing desks (a restless chair at each), a skeleton scribe and
  // a librarian at the shelf, a bookcase hanging overhead.
  {
    const b = new RB(2, 1);
    b.shell().door('R', 0).door('L', 0);
    cases(b, [[22, 9, 5, 3], [14, 1, 8, 4]]);
    tables(b, [[8, 11, 5, 'n', 'a'], [34, 11, 5, 'a', 'n']]);
    tomes(b, [[16, 2], [19, 3], [23, 10], [25, 10]]);
    b.e(3, 11, 'T', 'lore_scribe');
    candles(b, [[10, 10], [36, 10], [44, 11]]);
    b.e(24, 11, 'l').e(30, 11, 's').e(30, 5, 'w');
    R.push(b.build('lib_scriptorium', 'Scriptorium', 'library', 'library', -2, -4));
  }

  // L7 ── Inkwell Shaft (1 x 4): a tall dark well down the middle of the wing. A door at the
  // top on each side (the Scriptorium and the Archivist's Study), and one at the bottom to the
  // Lower Stacks. The top landings are split by a hole (x 10-13): drop down it, or climb the
  // zig-zag of ledges back up to it.
  {
    const b = new RB(1, 4); // 24 x 56 tiles
    b.shell().door('R', 0).door('L', 0).door('R', 3);
    b.fill(1, 12, 9, 2).fill(14, 12, 9, 2); // top landings, a 4-wide hole between them
    // ascending from the floor (row 54): right, middle, left, middle, right, ... up to the hole
    const zig: [number, number][] = [
      [50, 15], [46, 8], [42, 2], [38, 8], [34, 15], [30, 8], [26, 2], [22, 8], [18, 15],
    ];
    for (const [y, x] of zig) b.fill(x, y, 6, 1, '=');
    b.fill(10, 14, 4, 1, '='); // the last ledge, right under the hole
    candles(b, [[4, 11], [19, 11], [17, 49], [10, 45], [11, 37], [17, 17], [11, 21]]);
    b.e(12, 30, 'w').e(6, 5, 'b').e(18, 4, 'b');
    R.push(b.build('lib_shaft', 'Inkwell Shaft', 'library', 'library', -3, -4));
  }

  // L8 ── The Archivist's Study (2 x 1): the end of the wing. Tall bookcases and the Archivist's
  // long desk, with his seal on it and a save altar beside. Every shelf in the room is full of
  // tomes, and his chair has been waiting for him.
  {
    const b = new RB(2, 1);
    b.shell().door('R', 0).door('L', 0); // west door: the Archivist's Wing
    cases(b, [[1, 5, 4, 7], [32, 6, 4, 6], [38, 9, 4, 3]]);
    tables(b, [[18, 11, 8, 'a', 'n']]);
    tomes(b, [[2, 8], [3, 10], [33, 7], [34, 9], [33, 10], [39, 10]]);
    b.e(22, 10, 'i', 'acc_seal');
    b.e(14, 11, 'S').e(29, 11, 'T', 'lore_study');
    candles(b, [[8, 11], [12, 11], [19, 10], [25, 10], [44, 11]]);
    b.e(10, 4, 'w');
    R.push(b.build('lib_study', "Archivist's Study", 'library', 'library', -5, -4, { save: true }));
  }

  // L9 ── Clerk's Mezzanine (3 x 1): above the Gallery, reached through a grate over its hole.
  // A Might Seed sits on a high ledge that only a double jump reaches (6 rows over the case).
  {
    const b = new RB(3, 1);
    b.shell().door('R', 0).hole('B', 1);
    b.fill(34, 12, 4, 1, '='); // grate over the floor hole
    cases(b, [[6, 9, 6, 3], [14, 10, 6, 2], [40, 9, 5, 3], [50, 8, 5, 4], [24, 1, 8, 3]]);
    plats(b, [[15, 4, 4]]); // 6 rows over the low case: a double jump
    b.e(16, 3, 'i', 'str_up');
    tables(b, [[60, 11, 4, 'a', 'n']]);
    tomes(b, [[8, 10], [26, 2], [29, 2], [51, 9], [53, 10]]);
    candles(b, [[3, 11], [22, 11], [47, 11], [62, 10], [68, 11]]);
    b.e(52, 11, 'l').e(31, 7, 'w');
    R.push(b.build('lib_mezzanine', "Clerk's Mezzanine", 'library', 'library', 0, -5));
  }

  // L10 ── Great Reading Room (4 x 2): long tables under hanging bookcases (mind the chairs), and a stair of shelf
  // ledges up the east side to the best seat in the house. The grate by the door drops back down
  // to the top of the Grand Staircase.
  {
    const b = new RB(4, 2); // 96 x 28 tiles, floor rows 26-27
    b.shell().door('L', 1).hole('B', 0);
    b.fill(10, 26, 4, 1, '='); // grate over the floor hole
    cases(b, [[40, 22, 8, 4], [70, 23, 6, 3]]);
    tables(b, [[19, 25, 9, 'n', 'a'], [50, 25, 5, 'a', 'n']]);
    cases(b, [[14, 1, 10, 4], [36, 1, 12, 5], [62, 1, 10, 4]]);
    plats(b, [[56, 22, 6], [62, 18, 6], [68, 14, 6], [74, 10, 6]]);
    b.fill(82, 7, 12, 1, '='); // the top shelf
    tomes(b, [[16, 2], [20, 3], [38, 2], [42, 3], [45, 2], [64, 2], [68, 3], [42, 24], [72, 24]]);
    b.e(86, 6, 'i', 'life_up').e(90, 6, 'i', 'elixir');
    b.e(6, 25, 'T', 'lore_reading').e(16, 25, 'T', 'drop');
    candles(b, [[3, 25], [21, 24], [26, 24], [34, 25], [52, 24], [66, 25], [58, 21], [76, 9]]);
    b.e(36, 25, 'k').e(84, 25, 'k').e(32, 25, 's').e(60, 12, 'w').e(30, 9, 'w');
    R.push(b.build('lib_reading', 'Great Reading Room', 'library', 'library', 3, -6));
  }

  // ══════════════════════════════════════════════════════════ the stacks below

  // L11 ── Lower Stacks (4 x 1): low shelves in the dark under the wing, between the Inkwell
  // Shaft and the Undercroft. Bookcases hang from the ceiling over the walkway.
  {
    const b = new RB(4, 1);
    b.shell().door('L', 0).door('R', 0);
    cases(b, [[10, 9, 6, 3], [24, 8, 5, 4], [58, 9, 6, 3], [72, 8, 5, 4]]);
    tables(b, [[40, 11, 8, 'n', 'a']]);
    cases(b, [[30, 1, 10, 3], [62, 1, 12, 3]]);
    tomes(b, [[26, 9], [28, 10], [74, 9], [76, 10], [32, 2], [36, 2], [65, 2], [68, 2], [71, 2]]);
    candles(b, [[6, 11], [20, 11], [44, 10], [66, 11], [90, 11]]);
    b.e(54, 11, 'k').e(12, 8, 's').e(60, 8, 's').e(61, 11, 'l').e(36, 6, 'w');
    R.push(b.build('lib_lower', 'Lower Stacks', 'library', 'library', -2, -1));
  }

  // L12 ── Undercroft (6 x 1): the Archivist's forbidden stacks. The hole in the roof (near the
  // east end, a stepping ledge and two more) climbs back up into the Card Catalogue. A walled-off
  // vault, shut by one cracked column of stones, holds a Ward Seed.
  {
    const b = new RB(6, 1);
    b.shell().door('L', 0).hole('T', 5);
    cases(b, [[8, 9, 6, 3], [22, 10, 5, 2], [34, 8, 6, 4], [50, 9, 4, 3], [84, 8, 5, 4], [96, 9, 6, 3], [110, 9, 5, 3]]);
    tables(b, [[64, 11, 7, 'a', 'n']]);
    cases(b, [[60, 1, 14, 3]]);
    // the vault, at the dead end past the hole: a stone block with a hollow inside, shut by one cracked column
    b.fill(137, 5, 6, 7).fill(138, 8, 4, 4, '.').fill(137, 8, 1, 4, 'B');
    plats(b, [[124, 8, 6]]);
    underHole(b, 5);
    tomes(b, [[36, 9], [38, 10], [63, 2], [67, 2], [71, 2], [85, 9], [87, 10], [98, 10], [111, 10], [113, 10]]);
    b.e(139, 11, 'i', 'con_up').e(104, 11, 'T', 'lore_vault');
    candles(b, [[4, 11], [18, 11], [30, 11], [46, 11], [56, 11], [80, 11], [106, 11], [120, 11], [134, 11]]);
    b.e(44, 11, 'k').e(76, 11, 'k').e(26, 9, 's').e(100, 8, 's').e(52, 11, 'l').e(76, 6, 'w').e(120, 4, 'w');
    R.push(b.build('lib_undercroft', 'Undercroft', 'library', 'library', 2, -1));
  }

  return R;
}
