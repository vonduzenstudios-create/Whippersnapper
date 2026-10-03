// NEW GAME +: the Drowned Abbey of Saint Calder, a map of its own (120 rooms).
//
// A sea-cliff abbey on a tidal island. Nine nights ago the Lamp on its tower went dark and
// the Black Tide came in over the causeway and never went out. The hero lands at the ferry
// on Gullmouth Strand and works inward and upward. See docs/level-design.md for the map.
//
// Built with the kit in abbey_kit.ts: each room is a rectangle on the map grid (`at`), the
// doorways come from LINKS at the bottom of this file (so both sides always line up), and
// a doorway up a wall or a ceiling hole gets its landing and climb automatically unless the
// room's build() makes its own way. Gates on the links shape the doorways (see Gate).
//
// The order the relics open the map: Chain Grapple (the Undercroft) -> Frostrunner Greaves
// (the Tithe Gardens) -> Raven Mantle (the Bell Tower) -> Undertow Pearl (the Sea Caves) ->
// Sinew Coil (the Penitents' Gaol) -> Duskwing Shroud (the Saltworks) -> Ashglass Ward (the
// Glass Choir). Each lies on the floor of an empty boss chamber for now.
// tools/check_abbey.ts (npm run check:abbey) proves that order works.
//
// Rows: a room one cell high has its floor at row 12 (k.F); two cells high, 26; three, 40;
// four, 54. Side doorways are rows 8-11 of their cell; ceiling holes columns 10-13 of theirs.
import type { RoomDef } from './rooms';
import { buildWorld, Kit, Link, Spec } from './abbey_kit';

/** Bookcases: [x, y, width, height] (walk-through, the top is a ledge). */
function cases(k: Kit, list: [number, number, number, number][]) {
  for (const [x, y, w, h] of list) k.fill(x, y, w, h, 'K');
}
/** A table on the floor row above `y + 1` with chairs: [x, y, width, left chair, right chair] ('n' prop, 'a' Restless Chair). */
function tables(k: Kit, list: [number, number, number, string, string][]) {
  for (const [x, y, w, l, r] of list) {
    k.fill(x, y, w, 1, 'D');
    if (l) k.e(x - 1, y, l);
    if (r) k.e(x + w, y, r);
  }
}
/** A stone pillar standing on the floor up to row `top` (decor you jump over or climb). */
function pillar(k: Kit, x: number, top: number, w = 2) {
  return k.block(x, top, w, k.F - top);
}

const SPECS: Spec[] = [
  // ══════════════════════════════════════════════════════════ Gullmouth Strand (start)
  {
    id: 'st_landing', name: 'Ferry Landing', zone: 'strand', theme: 'docks', at: [0, 0, 3, 1], open: true,
    build: (k) => {
      // the ferry tied up at the left, a beach, a tidepool between two stone lips
      k.fill(1, 10, 6, 2, 'H'); // the ferry's hull, run aground
      k.block(36, 10, 1, 2).block(47, 10, 1, 2).pool(37, 10, 10, 2);
      k.e(8, 11, 'P');
      k.sign(14, 11, 'move').sign(22, 11, 'jump').sign(30, 11, 'run').sign(54, 11, 'whip');
      k.candles([20, 11], [34, 11], [52, 11], [66, 11]);
      k.foes('z44 z60 b58@4');
      k.item(42, 11, 'potion');
    },
  },
  {
    id: 'st_lighthouse', name: 'The Old Light', zone: 'strand', theme: 'docks', at: [0, -3, 1, 3],
    build: (k) => {
      // a disused lighthouse: a spiral of landings up to the dead lamp
      k.climb(3, 15, k.F, 6, 6);
      k.ledge(3, 6, 18);
      k.item(18, 5, 'life_up').sign(6, 5, 'ab_lighthouse').candles([10, 5], [14, 5]);
      k.foes('b8@20 b16@30');
    },
  },
  {
    id: 'st_quay', name: 'Fishmarket Quay', zone: 'strand', theme: 'docks', at: [3, 0, 3, 1], open: true,
    build: (k) => {
      // market stalls (tables you can stand on), crates, a cracked sea wall hiding a cubby
      tables(k, [[8, 11, 5, '', ''], [26, 11, 5, '', ''], [46, 11, 5, '', '']]);
      k.block(18, 10, 3, 2).block(19, 8, 2, 2); // a stack of crates
      k.block(58, 6, 13, 1).fill(58, 7, 1, 5, 'B'); // a cubby under the quay wall, shut by cracked stones
      k.item(66, 11, 'sub_holy').sign(14, 11, 'crack').sign(36, 11, 'candle');
      k.candles([10, 10], [28, 10], [48, 10], [40, 11]);
      k.foes('z24 d40 z52 b34@3');
    },
  },
  {
    id: 'st_nets', name: 'Net Lofts', zone: 'strand', theme: 'docks', at: [6, -1, 2, 2],
    build: (k) => {
      // a two-floor timber loft: plank floor at row 12 with a gap, hanging nets (ledges)
      k.fill(1, 12, 30, 1, 'H').fill(38, 12, 9, 1, 'H');
      k.ledges([[20, 22, 6], [28, 18, 6], [32, 15, 5]]);
      k.ledge(4, 5, 6); // the high loft: only the Raven Mantle reaches it
      k.item(6, 4, 'heart_up');
      k.candles([14, 11], [42, 11], [8, 25], [30, 25]);
      k.foes('z20 z38 b12@16 b30@4');
    },
  },
  {
    id: 'st_lane', name: 'Gull Lane', zone: 'strand', theme: 'outdoor', at: [8, 0, 3, 1], open: true,
    build: (k) => {
      // the village street: houses (solid blocks you can stand on), a well over the cove
      k.block(4, 8, 6, 4).block(26, 8, 7, 4).block(64, 8, 6, 4);
      k.ledge(42, 9, 6);
      k.sign(20, 11, 'ab_well').sign(46, 11, 'ab_lane');
      k.candles([6, 7], [28, 7], [66, 7], [44, 11]);
      k.foes('z16 d40 z64 y48@3');
    },
  },
  {
    id: 'st_roofs', name: 'Gull Roofs', zone: 'strand', theme: 'rooftop', at: [6, -3, 3, 1], open: true,
    build: (k) => {
      // pitched roofs over the village, gaps between them
      k.block(1, 9, 12, 3).block(20, 8, 12, 4).block(40, 9, 10, 3).block(56, 8, 8, 4);
      k.pit(13, 7).pit(32, 8).pit(50, 6);
      k.ledge(24, 2, 6); // a chimney top over the middle roof (Raven Mantle)
      k.item(26, 1, 'str_up');
      k.candles([4, 8], [44, 8], [60, 7]);
      k.foes('y30@3 y52@2 b10@3');
    },
  },
  {
    id: 'st_tower', name: 'Watch Tower', zone: 'strand', theme: 'docks', at: [9, -3, 1, 3],
    build: (k) => {
      k.ledges([[3, 34, 5], [16, 30, 5]]);
      k.item(4, 33, 'con_up');
      k.candles([4, 39], [6, 25]);
      k.foes('b12@20 b8@10 c20@1');
    },
  },
  {
    id: 'st_chapel', name: 'Seawall Chapel', zone: 'strand', theme: 'cloister', at: [11, 0, 1, 1], save: true,
    build: (k) => {
      k.e(12, 11, 'S').candles([5, 11], [19, 11]).sign(16, 11, 'ab_chapel');
    },
  },
  {
    id: 'st_seawall', name: 'The Seawall', zone: 'strand', theme: 'outdoor', at: [12, 0, 4, 1], open: true,
    build: (k) => {
      // breakwater blocks; the surf (a pool) behind them
      k.block(8, 10, 4, 2).block(22, 9, 5, 3).block(40, 10, 4, 2).block(62, 9, 6, 3);
      k.block(70, 10, 1, 2).block(82, 10, 1, 2).pool(71, 10, 11, 2);
      k.ledge(30, 6, 6).ledge(46, 6, 6);
      k.item(48, 5, 'potion').sign(16, 11, 'ab_seawall');
      k.candles([10, 9], [24, 8], [42, 9], [64, 8]);
      k.foes('d18 d34 d56 y48@2 e76@11');
    },
  },
  {
    id: 'st_cliff', name: 'Cliff Stair', zone: 'strand', theme: 'outdoor', at: [10, -2, 6, 2], open: true,
    build: (k) => {
      // a stair of rock shelves climbing the cliff above the seawall, to a lookout
      k.block(30, 22, 10, 4).block(44, 18, 10, 8).block(58, 14, 10, 12).block(72, 10, 12, 16);
      k.block(88, 14, 10, 12).block(102, 10, 10, 16).block(116, 7, 27, 19);
      k.ledges([[20, 23, 6], [96, 6, 6]]);
      k.ledge(126, 1, 8); // a crag over the lookout (Raven Mantle)
      k.item(76, 9, 'acc_garnet').item(130, 0, 'life_up').sign(122, 6, 'ab_cliff');
      k.candles([32, 21], [46, 17], [60, 13], [90, 13], [104, 9], [136, 6]);
      k.foes('y40@12 y90@4 y130@2 z62@13 z108@9');
    },
  },
  {
    id: 'st_cove', name: "Smugglers' Cove", zone: 'strand', theme: 'seacave', at: [8, 1, 3, 1],
    build: (k) => {
      // under the lane's well: a sea cave with the smugglers' boat
      k.pool(1, 9, 70, 3);
      k.block(14, 9, 10, 3).block(44, 9, 8, 3);
      k.ledges([[26, 7, 5], [36, 7, 5]]);
      k.block(64, 1, 4, 10); // the sea wall: the way on is a gap under the water (Pearl)
      k.item(18, 8, 'potion').sign(48, 8, 'ab_cove');
      k.candles([16, 8], [46, 8]);
      k.foes('e8@11 e60@11 b36@4');
    },
  },

  // ══════════════════════════════════════════════════════════ The Drowned Causeway
  {
    id: 'cw_gate', name: 'Causeway Gate', zone: 'causeway', theme: 'outdoor', at: [16, 0, 2, 1], open: true,
    build: (k) => {
      k.block(20, 4, 8, 8); // the gatehouse, its arch open at the floor
      k.fill(21, 9, 6, 3, '.');
      k.ledge(14, 8, 6);
      k.sign(6, 11, 'ab_causeway').candles([12, 11], [34, 11], [22, 3]);
      k.foes('d36 b24@2');
    },
  },
  {
    id: 'cw_low', name: 'The Low Causeway', zone: 'causeway', theme: 'docks', at: [18, 0, 4, 1], open: true,
    build: (k) => {
      // stepping stones over the drowned road
      k.pool(1, 9, 94, 3);
      for (const x of [6, 18, 30, 42, 56, 70, 84]) k.block(x, 9, 4, 3);
      k.item(44, 8, 'potion');
      k.candles([7, 8], [31, 8], [57, 8], [85, 8]);
      k.foes('e12@11 e36@11 e64@11 d44@8 y26@3 y76@3');
    },
  },
  {
    id: 'cw_toll', name: 'Tollhouse', zone: 'causeway', theme: 'docks', at: [22, 0, 1, 1], save: true,
    build: (k) => {
      tables(k, [[3, 11, 4, 'n', '']]);
      k.e(14, 11, 'S').candles([18, 11], [4, 10]).sign(10, 11, 'ab_toll');
    },
  },
  {
    id: 'cw_wreck', name: 'The Wreck', zone: 'causeway', theme: 'docks', at: [23, 0, 3, 2],
    build: (k) => {
      // a beached carrack on its side: the deck above, the hold below, the sea in its bilge
      k.fill(1, 12, 52, 1, 'H').fill(60, 12, 11, 1, 'H'); // the deck (a gap to drop through)
      k.block(20, 9, 2, 3); // the mast stump
      k.ledges([[8, 8, 6], [30, 8, 6], [44, 5, 6]]);
      k.pool(1, 23, 70, 3);
      k.block(30, 20, 12, 6); // ballast stones
      k.ledges([[10, 20, 6], [52, 22, 6], [56, 18, 4], [53, 15, 6]]);
      k.item(36, 19, 'whip_iron').item(46, 4, 'heart_up');
      k.candles([10, 11], [32, 11], [64, 11], [34, 19]);
      k.foes('d12 d40 c50@13 e16@25 e56@25 b36@16');
    },
  },
  {
    id: 'cw_breakers', name: 'Breaker Steps', zone: 'causeway', theme: 'outdoor', at: [26, 0, 4, 1], open: true,
    build: (k) => {
      k.block(14, 9, 6, 3).block(26, 7, 6, 5).block(48, 9, 6, 3).block(64, 8, 4, 4);
      k.pit(20, 6).pit(54, 8);
      k.fill(80, 6, 14, 1).fill(80, 7, 1, 5, 'B'); // a smugglers' niche in the breakwater
      k.item(88, 11, 'acc_moon');
      k.candles([16, 8], [28, 6], [50, 8], [66, 7]);
      k.foes('d8 d40 d72 y36@2 y60@2');
    },
  },
  {
    id: 'cw_lamppier', name: 'Lamp Pier', zone: 'causeway', theme: 'docks', at: [26, -1, 3, 1], open: true,
    build: (k) => {
      k.block(60, 6, 2, 6); // the lamp post
      k.ledge(56, 5, 8);
      k.item(60, 4, 'heart_up').sign(30, 11, 'ab_lamppier');
      k.candles([20, 11], [44, 11], [58, 4]);
      k.foes('y20@4 y48@3 c40@13');
    },
  },
  {
    id: 'cw_seagate', name: 'The Sea Gate', zone: 'causeway', theme: 'cloister', at: [30, -1, 2, 2],
    build: (k) => {
      // the abbey's water gate: the road climbs to the narthex
      k.block(36, 16, 11, 10);
      k.ledges([[28, 22, 6], [20, 18, 6]]);
      k.sign(14, 25, 'ab_seagate').candles([6, 25], [40, 15], [28, 21]);
      k.foes('k24 s42@15');
    },
  },
  {
    id: 'cw_shoals', name: 'Tide Shoals', zone: 'causeway', theme: 'seacave', at: [26, 1, 4, 1],
    extra: { tide: { low: 11, high: 5 } },
    build: (k) => {
      // the tide floods this cave twice a minute; at high water a shelf comes in reach
      k.block(20, 9, 6, 3).block(50, 9, 6, 3).block(70, 10, 4, 2);
      k.ledge(36, 4, 6); // only the high tide (or the Raven Mantle) reaches it
      k.item(38, 3, 'con_up').sign(10, 11, 'tide').sign(30, 11, 'leap');
      k.candles([22, 8], [52, 8]);
      k.foes('e14@11 e62@11 d40 c44@1');
    },
  },
  {
    id: 'cw_undertow', name: 'Undertow Arch', zone: 'causeway', theme: 'seacave', at: [30, 1, 3, 1],
    build: (k) => {
      k.block(24, 6, 4, 6).block(50, 8, 6, 4);
      k.ledges([[30, 8, 6], [40, 5, 6]]);
      k.item(42, 4, 'armor_mail');
      k.candles([26, 5], [52, 7], [8, 11]);
      k.foes('d14 d44 c36@1 b60@4');
    },
  },

  // ══════════════════════════════════════════════════════════ Saint Calder's Cloister (hub)
  {
    id: 'cl_narthex', name: 'The Narthex', zone: 'cloister', theme: 'cloister', at: [32, -1, 3, 1],
    build: (k) => {
      pillar(k, 18, 4).fill(18, 9, 2, 3, '.'); // the arches of the porch
      pillar(k, 52, 4).fill(52, 9, 2, 3, '.');
      k.ledges([[24, 8, 6], [42, 8, 6]]);
      k.sign(8, 11, 'ab_narthex').sign(44, 11, 'menu');
      k.candles([12, 11], [26, 7], [44, 7], [60, 11]);
      k.foes('s30 s46 w36@4');
    },
  },
  {
    id: 'cl_lavatorium', name: 'Lavatorium', zone: 'cloister', theme: 'cloister', at: [32, 0, 3, 1],
    build: (k) => {
      // the monks' long washing trough: a pool with a drowned basin at the bottom (Pearl)
      k.block(20, 9, 1, 3).block(52, 9, 1, 3).pool(21, 9, 31, 3);
      k.block(36, 9, 2, 2); // a wall in the trough: one tile under it, under water
      k.item(46, 11, 'heart_up');
      k.candles([10, 11], [66, 11]);
      k.foes('z12 e28@11 w60@4');
    },
  },
  {
    id: 'cl_westwalk', name: 'West Walk', zone: 'cloister', theme: 'cloister', at: [32, -3, 3, 2],
    build: (k) => {
      // the cloister's west walk; its upper door (to the Scriptorium) only a grapple ring reaches
      k.block(30, 1, 2, 9).block(56, 1, 2, 9); // arches hanging from the vault
      k.ledges([[38, 22, 6], [58, 22, 6], [46, 18, 6]]);
      k.candles([36, 25], [56, 25], [48, 17], [24, 25]);
      k.foes('s40 w46@8 s64 r60@14');
      k.sign(30, 25, 'ab_ring');
    },
  },
  {
    id: 'cl_garth', name: 'Cloister Garth', zone: 'cloister', theme: 'cloister', at: [35, -2, 4, 2], open: true,
    build: (k) => {
      // the open green in the middle of the cloister, a cross and a well
      k.block(44, 22, 6, 4).block(46, 18, 2, 4); // the preaching cross
      k.ledges([[30, 22, 6], [56, 22, 6], [36, 18, 6], [54, 18, 6]]);
      k.item(47, 17, 'sub_cross');
      k.candles([20, 25], [66, 25], [32, 20], [58, 20]);
      k.foes('z26 z70 s68 b40@8 b70@10');
      k.sign(12, 25, 'ab_garth');
    },
  },
  {
    id: 'cl_eastwalk', name: 'East Walk', zone: 'cloister', theme: 'cloister', at: [39, -1, 3, 1],
    build: (k) => {
      pillar(k, 16, 6).fill(16, 9, 2, 3, '.');
      pillar(k, 40, 6).fill(40, 9, 2, 3, '.');
      pillar(k, 56, 6).fill(56, 9, 2, 3, '.');
      k.ledges([[24, 8, 8], [46, 8, 6]]);
      k.item(27, 7, 'potion');
      k.candles([10, 11], [30, 11], [50, 11], [64, 11]);
      k.foes('s22 k48 w34@3');
    },
  },
  {
    id: 'cl_chapter', name: 'Chapter House', zone: 'cloister', theme: 'cloister', at: [42, -1, 1, 1], save: true,
    build: (k) => {
      k.e(12, 11, 'S').candles([4, 11], [20, 11]).sign(8, 11, 'ab_chapter');
    },
  },
  {
    id: 'cl_refectory', name: 'Refectory', zone: 'cloister', theme: 'cloister', at: [43, -2, 3, 2],
    build: (k) => {
      // long tables, chairs that are not all chairs
      tables(k, [[6, 25, 8, 'n', 'a'], [26, 25, 10, 'a', 'n'], [46, 25, 8, 'n', 'n']]);
      k.ledges([[30, 18, 8]]);
      k.ledge(12, 19, 6).ledge(4, 15, 6); // the high table (Raven Mantle)
      k.item(6, 14, 'elixir');
      k.candles([10, 24], [30, 24], [50, 24], [33, 17]);
      k.foes('s40 m20@25 w56@16');
    },
  },
  {
    id: 'cl_dorter', name: 'Dorter', zone: 'cloister', theme: 'cloister', at: [39, -3, 4, 2],
    build: (k) => {
      // the monks' dormitory: rows of cots (tables) and a loft
      tables(k, [[8, 25, 4, '', ''], [20, 25, 4, '', ''], [56, 25, 4, '', ''], [68, 25, 4, '', '']]);
      k.fill(30, 12, 36, 1, 'H'); // the loft
      k.ledges([[56, 22, 6], [66, 18, 6], [68, 15, 5]]);
      k.item(60, 11, 'life_up');
      k.candles([14, 25], [62, 25], [40, 11], [64, 11]);
      k.foes('z30 z50 s76 r40@6');
    },
  },
  {
    id: 'cl_infirmary', name: 'Infirmary', zone: 'cloister', theme: 'cloister', at: [35, 0, 4, 1],
    build: (k) => {
      tables(k, [[30, 11, 4, '', ''], [52, 11, 4, '', ''], [70, 11, 4, '', '']]);
      k.block(84, 6, 11, 1).fill(84, 7, 1, 5, 'B');
      k.item(90, 11, 'acc_blood').item(54, 10, 'potion');
      k.candles([20, 11], [44, 11], [62, 11]);
      k.foes('z40 z60 m78 b50@4');
    },
  },
  {
    id: 'cl_kitchen', name: 'Abbey Kitchen', zone: 'cloister', theme: 'cloister', at: [39, 0, 3, 1],
    build: (k) => {
      k.block(4, 8, 6, 4); // the hearth
      tables(k, [[30, 11, 6, '', ''], [48, 11, 5, '', '']]);
      k.ledges([[16, 8, 6], [56, 7, 6]]);
      k.item(58, 6, 'potion');
      k.candles([32, 10], [50, 10], [18, 7]);
      k.foes('o26 o44 z62');
    },
  },
  {
    id: 'cl_cellar', name: 'Wine Cellar', zone: 'cloister', theme: 'catacomb', at: [42, 0, 3, 2],
    build: (k) => {
      // racks of casks; a crawlspace behind the far rack
      k.block(30, 18, 8, 8).block(52, 20, 6, 6);
      k.pocket(62, 9, 5, 'L'); // the far rack: a one-tile gap under it (slide)
      k.item(66, 25, 'acc_fang');
      k.ledges([[20, 20, 6], [40, 15, 6]]);
      k.candles([32, 17], [54, 19], [8, 25]);
      k.foes('u20 b40@18 b10@20 s46');
    },
  },

  // ══════════════════════════════════════════════════════════ The Undercroft
  {
    id: 'uc_stair', name: 'Undercroft Stair', zone: 'undercroft', theme: 'catacomb', at: [36, 1, 1, 3],
    build: (k) => {
      k.candles([6, 39], [18, 25], [6, 11]);
      k.foes('b12@20 b8@32 s16');
    },
  },
  {
    id: 'uc_lamps', name: 'Lamp Store', zone: 'undercroft', theme: 'catacomb', at: [33, 1, 3, 2],
    build: (k) => {
      k.block(20, 14, 30, 2); // the store's upper floor
      k.fill(40, 14, 4, 2, '.');
      k.ledges([[8, 22, 6], [44, 20, 6]]);
      k.item(26, 13, 'heart_up');
      k.candles([24, 13], [48, 13], [12, 25], [60, 25]);
      k.foes('w30@6 s50 u20');
    },
  },
  {
    id: 'uc_crypts', name: "Abbots' Crypts", zone: 'undercroft', theme: 'catacomb', at: [37, 2, 4, 1],
    build: (k) => {
      // tombs along the floor (blocks), effigies on their lids
      for (const x of [10, 26, 42, 58, 74]) k.block(x, 10, 6, 2);
      k.ledge(34, 6, 6);
      k.item(36, 5, 'shield_heater');
      k.candles([12, 9], [28, 9], [44, 9], [60, 9], [76, 9]);
      k.foes('s20 x50 s66 b40@3');
    },
  },
  {
    id: 'uc_tombs', name: "Novices' Tombs", zone: 'undercroft', theme: 'catacomb', at: [37, 3, 4, 2],
    build: (k) => {
      k.block(1, 12, 30, 2); // a raised gallery
      k.block(66, 12, 29, 2);
      k.ledges([[34, 16, 6], [52, 16, 6], [44, 20, 6], [60, 14, 5]]);
      k.item(80, 11, 'str_up');
      k.candles([10, 11], [24, 11], [72, 11], [88, 11], [40, 25], [70, 25]);
      k.foes('s14@11 x40 x70 u56 b80@4');
    },
  },
  {
    id: 'uc_ossuary', name: 'Bone Nave', zone: 'undercroft', theme: 'catacomb', at: [32, 3, 4, 2],
    build: (k) => {
      // a nave walled in bones; the far west door is high in the wall (Raven Mantle)
      k.block(40, 16, 8, 10).block(60, 20, 6, 6);
      k.ledges([[50, 16, 6], [30, 20, 6]]);
      k.ledge(76, 13, 6); // the bone pulpit: a double jump up from the stack
      k.item(78, 12, 'life_up');
      k.candles([42, 15], [62, 19], [20, 25], [86, 25]);
      k.foes('s24 s70 u52 x80 w40@6');
    },
  },
  {
    id: 'uc_charnel', name: 'Charnel Walk', zone: 'undercroft', theme: 'catacomb', at: [41, 2, 3, 1],
    build: (k) => {
      k.block(28, 9, 4, 3).block(48, 9, 4, 3);
      k.ledge(36, 6, 8);
      k.item(38, 5, 'armor_bone');
      k.candles([30, 8], [50, 8], [8, 11]);
      k.foes('s18 s40 o60 b40@3');
    },
  },
  {
    id: 'uc_sump', name: 'The Sump', zone: 'undercroft', theme: 'flooded', at: [41, 3, 3, 2],
    build: (k) => {
      // a drowned cistern; a sealed sluice under the water hides a cache (Pearl)
      k.pool(1, 18, 70, 8);
      k.block(30, 14, 4, 12).fill(30, 25, 4, 1, '~'); // a wall down into the water, one tile open under it
      k.block(1, 12, 10, 2);
      k.ledges([[16, 15, 6], [44, 15, 6], [56, 12, 8]]);
      k.item(40, 25, 'con_up');
      k.candles([4, 11], [58, 11], [18, 14]);
      k.foes('e20@22 e50@22 d60@11 b40@6');
    },
  },
  {
    id: 'uc_well', name: 'Dry Well', zone: 'undercroft', theme: 'catacomb', at: [44, 2, 1, 3],
    build: (k) => {
      k.item(12, 39, 'potion');
      k.candles([6, 39], [18, 39]);
      k.foes('b12@14 b10@28 c4@30');
    },
  },
  {
    id: 'uc_ante', name: 'Reliquary Door', zone: 'undercroft', theme: 'shrine', at: [45, 4, 1, 1], save: true,
    build: (k) => {
      k.e(12, 11, 'S').candles([4, 11], [20, 11]).sign(8, 11, 'ab_ante');
    },
  },
  {
    id: 'uc_prior', name: 'Chamber of the Drowned Prior', zone: 'undercroft', theme: 'lair', at: [46, 3, 2, 2],
    build: (k) => {
      // an empty boss chamber for now: the Chain Grapple lies on the floor
      k.ledges([[8, 21, 8], [32, 21, 8], [20, 17, 8]]);
      k.item(24, 25, 'relic_grapple');
      k.candles([6, 25], [42, 25]);
    },
  },

  // ══════════════════════════════════════════════════════════ The Scriptorium (needs the grapple)
  {
    id: 'sp_porch', name: 'Scriptorium Porch', zone: 'scriptorium', theme: 'library', at: [29, -3, 3, 1],
    build: (k) => {
      cases(k, [[10, 6, 4, 6], [30, 6, 4, 6], [50, 6, 4, 6]]);
      k.e(11, 8, 't').e(51, 9, 't');
      k.foes('l36 s20');
      k.candles([20, 11], [42, 11], [60, 11]).sign(62, 11, 'ab_porch');
    },
  },
  {
    id: 'sp_copy', name: 'Copying Hall', zone: 'scriptorium', theme: 'library', at: [25, -4, 4, 2],
    build: (k) => {
      // rows of copying desks; tall cases along the back with a shelf at the top
      tables(k, [[14, 25, 6, 'n', 'n'], [32, 25, 6, 'a', 'n'], [50, 25, 6, 'n', 'a'], [68, 25, 6, 'n', 'n']]);
      cases(k, [[40, 18, 6, 8], [62, 18, 6, 8]]);
      k.ledges([[24, 22, 6], [30, 18, 6], [46, 15, 6]]);
      k.e(42, 20, 't').e(64, 22, 't').e(66, 19, 't');
      k.item(48, 14, 'sub_knife');
      k.foes('l28 m56@14 w20@8');
      k.candles([16, 24], [34, 24], [52, 24], [70, 24]);
    },
  },
  {
    id: 'sp_nook', name: 'Lectern Nook', zone: 'scriptorium', theme: 'library', at: [29, -4, 1, 1], save: true,
    build: (k) => {
      cases(k, [[16, 6, 4, 6]]);
      k.e(10, 11, 'S').candles([4, 11], [14, 11]).sign(6, 11, 'ab_nook');
    },
  },
  {
    id: 'sp_stacks', name: 'Lower Stacks', zone: 'scriptorium', theme: 'library', at: [24, -2, 4, 1],
    build: (k) => {
      cases(k, [[8, 4, 4, 8], [20, 8, 4, 4], [32, 4, 4, 8], [70, 8, 4, 4], [84, 4, 4, 8]]);
      k.e(9, 6, 't').e(33, 8, 't').e(85, 7, 't');
      k.item(22, 7, 'potion');
      k.foes('l44 a50 p76');
      k.candles([16, 11], [28, 11], [46, 11], [80, 11]);
    },
  },
  {
    id: 'sp_ink', name: 'Ink Cistern', zone: 'scriptorium', theme: 'flooded', at: [20, -2, 4, 2],
    build: (k) => {
      // a cistern of black ink where the scribes drowned their spoiled pages
      k.block(28, 18, 1, 8).block(94, 18, 1, 8);
      k.pool(29, 18, 65, 8);
      k.block(50, 20, 6, 6).block(72, 22, 5, 4);
      k.ledges([[38, 15, 6], [60, 15, 6], [80, 17, 6]]);
      k.item(53, 19, 'whip_barbed');
      k.foes('e40@24 e66@24 m80@16 b60@6');
      k.candles([20, 25], [52, 19], [40, 14]);
    },
  },
  {
    id: 'sp_bindery', name: 'Bindery', zone: 'scriptorium', theme: 'library', at: [22, -4, 3, 2],
    build: (k) => {
      // the book presses (blocks), glue pots, a loft of drying racks
      k.block(10, 22, 6, 4).block(30, 22, 6, 4);
      tables(k, [[44, 25, 6, '', 'a']]);
      k.ledges([[18, 18, 6], [28, 14, 8]]);
      k.item(31, 13, 'acc_lens');
      k.foes('l40 a20 m60@18');
      k.candles([12, 21], [32, 21], [46, 24]);
    },
  },
  {
    id: 'sp_stair', name: "Librarian's Stair", zone: 'scriptorium', theme: 'library', at: [24, -9, 1, 5],
    build: (k) => {
      // a tall stair-well lined with cases; a reading perch at the very top
      cases(k, [[1, 60, 4, 8], [19, 46, 4, 8], [1, 32, 4, 8]]);
      k.e(2, 63, 't').e(20, 48, 't').e(2, 34, 't');
      k.item(21, 11, 'life_up');
      k.foes('b12@40 b10@20 w14@30');
      k.candles([4, 67], [6, 25]);
    },
  },
  {
    id: 'sp_gallery', name: 'Reading Gallery', zone: 'scriptorium', theme: 'library', at: [25, -7, 4, 2],
    build: (k) => {
      // a two-storey gallery of cases; readers' tables between them
      cases(k, [[10, 14, 6, 12], [40, 18, 6, 8], [70, 14, 6, 12]]);
      tables(k, [[22, 25, 6, 'n', 'a'], [52, 25, 6, 'a', 'n']]);
      k.ledges([[30, 22, 6], [48, 22, 6], [18, 17, 6], [56, 15, 8], [86, 18, 5]]);
      k.e(11, 16, 't').e(72, 18, 't').e(41, 21, 't');
      k.item(42, 17, 'con_up');
      k.foes('l30 l64 m50@14');
      k.candles([24, 24], [54, 24], [12, 13], [72, 13]);
    },
  },
  {
    id: 'sp_maps', name: 'Map Vault', zone: 'scriptorium', theme: 'library', at: [25, -9, 3, 2],
    build: (k) => {
      // map chests; a chart room shut off but for a gap at its floor (slide)
      k.block(40, 22, 6, 4).block(54, 20, 6, 6);
      k.pocket(62, 9, 6, 'L');
      k.item(66, 25, 'acc_seal');
      k.ledges([[20, 22, 6], [30, 18, 6], [44, 15, 6]]);
      k.item(46, 14, 'str_up');
      k.foes('l24 p48');
      k.candles([42, 21], [56, 19], [20, 25]);
    },
  },
  {
    id: 'sp_rafters', name: 'Rafters', zone: 'scriptorium', theme: 'belfry', at: [29, -8, 3, 2],
    build: (k) => {
      // under the roof: beams (one-way) and a dusty attic floor
      k.ledges([[10, 22, 8], [24, 18, 8], [40, 20, 8], [54, 16, 8], [32, 14, 8]]);
      k.item(35, 13, 'str_up');
      k.foes('b20@10 b50@8 p30@4 p60@4');
      k.candles([12, 21], [42, 19], [56, 15]);
    },
  },
  {
    id: 'sp_bridge', name: "Scribes' Bridge", zone: 'scriptorium', theme: 'rooftop', at: [32, -8, 4, 1], open: true,
    build: (k) => {
      // a bridge across the roofs to the bell tower; broken in the middle
      k.pit(36, 10);
      k.ledges([[40, 8, 4]]);
      k.ledge(76, 5, 6);
      k.item(78, 4, 'heart_up');
      k.foes('y20@3 y60@3 z70');
      k.candles([12, 11], [30, 11], [52, 11], [86, 11]);
    },
  },
  {
    id: 'sp_burned', name: 'Burned Wing', zone: 'scriptorium', theme: 'library', at: [20, -6, 4, 2],
    build: (k) => {
      // a wing gutted by fire: charred cases, a fallen floor
      cases(k, [[10, 18, 6, 8], [74, 20, 6, 6]]);
      k.fill(30, 14, 30, 1, 'H');
      k.ledges([[20, 22, 6], [24, 18, 5], [64, 22, 6], [60, 18, 6]]);
      k.ledge(40, 7, 6); // a charred beam (Raven Mantle)
      k.item(42, 6, 'elixir').item(44, 13, 'potion');
      k.foes('m40@13 t11@20 l50 f60@8');
      k.candles([12, 17], [76, 19], [32, 13]);
    },
  },

  // ══════════════════════════════════════════════════════════ The Bell Tower (needs the slide)
  {
    id: 'bt_foot', name: 'Tower Foot', zone: 'belltower', theme: 'belfry', at: [43, -4, 2, 2],
    build: (k) => {
      k.block(20, 22, 8, 4);
      k.ledges([[6, 20, 6]]);
      k.item(8, 19, 'potion').sign(30, 25, 'ab_tower');
      k.foes('y30@10 r12@12');
      k.candles([22, 21], [40, 25]);
    },
  },
  {
    id: 'bt_stair', name: 'Ringing Stair', zone: 'belltower', theme: 'belfry', at: [44, -9, 1, 5],
    build: (k) => {
      k.foes('b12@50 b12@24 c22@40 y12@10');
      k.candles([6, 67], [16, 53], [6, 25]);
    },
  },
  {
    id: 'bt_ropes', name: 'Bell-Rope Hall', zone: 'belltower', theme: 'belfry', at: [40, -7, 4, 2],
    build: (k) => {
      // the bell ropes come down through the ceiling (grapple rings) over a well of spikes
      k.pit(30, 30);
      k.e(38, 14, 'O').e(50, 12, 'O');
      k.ledges([[20, 22, 6], [62, 22, 6], [44, 9, 6]]);
      k.item(46, 8, 'life_up');
      k.foes('r20@14 y70@8 k76');
      k.candles([22, 21], [64, 21], [10, 25]);
    },
  },
  {
    id: 'bt_loft', name: 'Clock Loft', zone: 'belltower', theme: 'belfry', at: [40, -9, 4, 2],
    build: (k) => {
      // the abbey clock's gears (blocks) and its pendulum shaft
      k.block(20, 22, 6, 4).block(60, 22, 8, 4);
      k.ledges([[30, 18, 6], [44, 15, 8], [68, 18, 6]]);
      k.item(48, 14, 'acc_bell');
      k.foes('k40 c22@4 y60@6');
      k.candles([22, 21], [62, 21], [46, 14]);
    },
  },
  {
    id: 'bt_west', name: 'West Belfry', zone: 'belltower', theme: 'belfry', at: [36, -9, 4, 2],
    build: (k) => {
      k.block(30, 22, 4, 4).block(54, 20, 4, 6);
      k.ledges([[22, 22, 6], [40, 18, 6], [48, 16, 6], [60, 12, 6]]);
      k.item(62, 11, 'str_up');
      k.foes('k20 r50@10 b70@8');
      k.candles([32, 21], [56, 19], [80, 25]);
    },
  },
  {
    id: 'bt_cell', name: "Bellringer's Cell", zone: 'belltower', theme: 'belfry', at: [45, -6, 1, 1], save: true,
    build: (k) => {
      k.e(12, 11, 'S').candles([4, 11], [20, 11]).sign(16, 11, 'ab_cell');
    },
  },
  {
    id: 'bt_gutter', name: 'Gutter Walk', zone: 'belltower', theme: 'rooftop', at: [45, -8, 3, 1], open: true,
    build: (k) => {
      // a lead gutter round the tower; a gargoyle perch above it (Raven Mantle)
      k.block(20, 9, 4, 3).block(44, 9, 4, 3);
      k.ledge(40, 3, 6);
      k.item(42, 2, 'armor_raven').sign(28, 11, 'ab_gutter');
      k.foes('y20@3 y50@2');
      k.candles([22, 8], [46, 8]);
    },
  },
  {
    id: 'bt_bells', name: 'Hall of Silent Bells', zone: 'belltower', theme: 'belfry', at: [40, -12, 5, 3],
    build: (k) => {
      // three great bells hang in the hall (solid), with ledges round them
      for (const x of [20, 50, 80]) k.block(x, 6, 10, 8).block(x + 3, 1, 4, 5);
      k.ledges([[8, 34, 8], [36, 30, 8], [64, 32, 8], [90, 30, 6], [20, 24, 8], [50, 22, 8], [80, 24, 8], [34, 18, 6]]);
      k.item(54, 21, 'shield_ossuary');
      k.foes('r30@20 r70@20 k60 y90@12 c50@16');
      k.candles([10, 39], [40, 39], [70, 39], [100, 39], [52, 21]);
    },
  },
  {
    id: 'bt_spire', name: 'Lantern Spire', zone: 'belltower', theme: 'rooftop', at: [45, -14, 2, 4],
    build: (k) => {
      // the spire's stair winds up to the lantern room at the top
      k.climb(8, 30, k.F, 8, 8);
      k.ledge(16, 8, 16);
      k.item(22, 7, 'heart_up').sign(30, 7, 'ab_spire');
      k.foes('y20@30 y30@14 b10@44');
      k.candles([18, 7], [28, 7]);
    },
  },
  {
    id: 'bt_crown', name: 'The Belfry Crown', zone: 'belltower', theme: 'belfry', at: [40, -15, 4, 3],
    build: (k) => {
      // an empty boss chamber for now: the Raven Mantle lies on the floor
      k.ledges([[12, 34, 8], [74, 34, 8], [30, 30, 8], [56, 30, 8]]);
      k.item(48, 39, 'relic_mantle');
      k.candles([10, 39], [86, 39], [32, 29], [58, 29]);
    },
  },
  {
    id: 'bt_roof', name: 'Abbey Roofs', zone: 'belltower', theme: 'rooftop', at: [47, -11, 5, 1], open: true,
    build: (k) => {
      // the long roof ridge to the Glass Choir: the middle has fallen into a pit of spikes.
      // Too wide for any jump; the Duskwing Shroud glides over it.
      k.pit(30, 34);
      k.block(14, 9, 6, 3).block(100, 9, 6, 3);
      k.sign(22, 11, 'ab_roof');
      k.foes('y40@4 y80@4 y60@2');
      k.candles([16, 8], [102, 8]);
    },
  },

  // ══════════════════════════════════════════════════════════ The Tithe Gardens (needs the grapple)
  {
    id: 'gd_gate', name: 'Herb Garden Gate', zone: 'gardens', theme: 'garden', at: [46, -2, 3, 1], open: true,
    build: (k) => {
      k.block(30, 5, 6, 3); // the garden gate's arch
      k.ledges([[44, 8, 6]]);
      k.item(46, 7, 'potion');
      k.foes('g40 g56 b20@4');
      k.candles([20, 11], [52, 11]).sign(14, 11, 'ab_gardens');
    },
  },
  {
    id: 'gd_herbs', name: 'Herb Beds', zone: 'gardens', theme: 'garden', at: [49, -2, 4, 1],
    build: (k) => {
      // raised beds (low blocks), grubs in the soil
      for (const x of [6, 30, 64, 82]) k.block(x, 10, 8, 2);
      k.ledges([[46, 8, 6]]);
      k.item(48, 7, 'acc_fang');
      k.foes('u20 x44 u72 f50@4 g90');
      k.candles([8, 9], [32, 9], [66, 9], [84, 9]);
    },
  },
  {
    id: 'gd_orchard', name: 'Dead Orchard', zone: 'gardens', theme: 'graveyard', at: [49, -4, 4, 2], open: true,
    build: (k) => {
      // dead trees: trunks (blocks) and branches (ledges)
      for (const x of [20, 46, 72]) k.block(x, 22, 2, 4);
      k.ledges([[14, 22, 6], [22, 18, 6], [30, 14, 6], [40, 22, 6], [48, 18, 6], [56, 14, 8], [66, 22, 6], [74, 18, 6], [58, 10, 6]]);
      k.item(60, 9, 'life_up');
      k.foes('g30 g60 f40@8 f70@6 x84');
      k.candles([16, 19], [42, 19], [68, 19]);
    },
  },
  {
    id: 'gd_glass', name: 'Glasshouse', zone: 'gardens', theme: 'garden', at: [53, -3, 3, 2],
    build: (k) => {
      // potting benches (tables) and a hanging walkway; a seed tray past a spike bed
      tables(k, [[10, 25, 6, '', ''], [30, 25, 6, '', '']]);
      k.block(50, 22, 8, 4);
      k.ledges([[20, 22, 6], [24, 18, 6], [60, 18, 6]]);
      k.ledge(62, 11, 6); // the top of the vine frame (Raven Mantle)
      k.item(64, 10, 'con_up');
      k.foes('q20 q34 f50@10 o40');
      k.candles([12, 24], [32, 24], [38, 13]);
    },
  },
  {
    id: 'gd_shed', name: "Gardener's Shed", zone: 'gardens', theme: 'garden', at: [56, -2, 1, 1], save: true,
    build: (k) => {
      tables(k, [[3, 11, 3, '', '']]);
      k.e(14, 11, 'S').candles([4, 10], [20, 11]).sign(9, 11, 'ab_shed');
    },
  },
  {
    id: 'gd_briar', name: 'The Briar Heart', zone: 'gardens', theme: 'garden', at: [57, -3, 3, 2],
    build: (k) => {
      // an empty boss chamber for now: the Frostrunner Greaves lie on the floor
      k.ledges([[10, 21, 8], [54, 21, 8], [30, 17, 12]]);
      k.item(36, 25, 'relic_greaves');
      k.candles([8, 25], [64, 25]);
    },
  },
  {
    id: 'gd_well', name: 'Garden Well', zone: 'gardens', theme: 'garden', at: [46, -1, 1, 3],
    build: (k) => {
      k.pool(1, 34, 22, 6);
      k.item(4, 39, 'potion');
      k.foes('e12@38 b12@20');
      k.candles([18, 25], [6, 11]);
    },
  },
  {
    id: 'gd_hives', name: 'Apiary', zone: 'gardens', theme: 'garden', at: [47, 0, 3, 1],
    build: (k) => {
      // skeps on stands (tables), and moths where the bees were
      tables(k, [[10, 11, 3, '', ''], [24, 11, 3, '', ''], [40, 11, 3, '', ''], [56, 11, 3, '', '']]);
      k.ledges([[30, 7, 8]]);
      k.item(33, 6, 'potion');
      k.foes('f20@6 f46@5 f60@7 u34');
      k.candles([11, 10], [41, 10]);
    },
  },
  {
    id: 'gd_graves', name: "Lay Brothers' Graves", zone: 'gardens', theme: 'graveyard', at: [50, -1, 4, 2],
    build: (k) => {
      for (const x of [10, 24, 50, 66, 80]) k.block(x, 24, 3, 2);
      k.block(36, 22, 8, 4); // the mausoleum
      k.ledges([[28, 20, 6], [44, 18, 8], [62, 20, 6]]);
      k.item(48, 17, 'shield_heater');
      k.foes('x20 x60 z30 z74 u50');
      k.candles([11, 23], [25, 23], [38, 21], [81, 23]);
    },
  },
  {
    id: 'gd_topiary', name: 'Topiary Maze', zone: 'gardens', theme: 'garden', at: [54, -1, 3, 2],
    build: (k) => {
      // hedges (blocks); the last hedge has a low gap at its root (slide)
      k.block(14, 22, 4, 4).block(30, 22, 4, 4).block(46, 22, 4, 4);
      k.pocket(60, 11, 8, 'L'); // the hedge cell, a crawl under its root
      k.item(66, 25, 'str_up');
      k.ledges([[22, 20, 6], [36, 18, 8]]);
      k.foes('g20 g40 q52 f30@8');
      k.candles([16, 21], [32, 21], [48, 21]);
    },
  },
  {
    id: 'gd_trellis', name: 'Trellis Walk', zone: 'gardens', theme: 'garden', at: [46, -7, 3, 1],
    build: (k) => {
      k.ledges([[18, 8, 6], [44, 8, 6]]);
      k.item(20, 7, 'heart_up');
      k.foes('f30@6 f50@4 y60@4');
      k.candles([8, 11], [64, 11]);
    },
  },
  {
    id: 'gd_ivy', name: 'Ivy Wall', zone: 'gardens', theme: 'garden', at: [47, -6, 2, 3],
    build: (k) => {
      k.ledges([[4, 30, 6], [40, 22, 6]]);
      k.item(42, 21, 'whip_ember');
      k.foes('f20@20 f30@30 x24');
      k.candles([6, 29], [42, 21], [24, 39]);
    },
  },

  // ══════════════════════════════════════════════════════════ The Sea Caves (needs the double jump)
  {
    id: 'sc_mouth', name: 'Cave Mouth', zone: 'seacaves', theme: 'seacave', at: [28, 2, 4, 3],
    build: (k) => {
      // where the Bone Nave's wall broke into the sea caves: a cliff of rock down to the surf
      k.pool(1, 36, 94, 4);
      k.block(70, 30, 25, 10).block(50, 34, 12, 6);
      k.ledges([[60, 26, 6], [40, 30, 6], [24, 26, 6]]);
      k.e(25, 25, 'L', 'sc_arch').sign(28, 25, 'ab_mouth'); // opens the grate up to the Undertow Arch
      k.foes('e20@39 e44@39 d56@33 c80@29 b40@14');
      k.candles([72, 29], [52, 33], [26, 25]);
    },
  },
  {
    id: 'sc_grotto', name: 'Echo Grotto', zone: 'seacaves', theme: 'seacave', at: [24, 3, 4, 2],
    extra: { tide: { low: 24, high: 14 } },
    build: (k) => {
      // the tide fills the grotto; at high water the shelf in the roof comes in reach
      k.block(20, 22, 6, 4).block(60, 22, 6, 4);
      k.ledges([[34, 20, 8], [74, 20, 6]]);
      k.ledge(44, 10, 8); // a shelf in the roof: only the high tide (or the Raven Mantle) reaches it
      k.item(47, 9, 'armor_raven');
      k.foes('e30@25 e70@25 d50 h84 c40@20');
      k.candles([22, 21], [62, 21], [36, 19]).sign(10, 25, 'tide');
    },
  },
  {
    id: 'sc_kelp', name: 'Kelp Forest', zone: 'seacaves', theme: 'seacave', at: [24, 5, 4, 2],
    build: (k) => {
      // a drowned cave: swim through the kelp (ledges) to the doors
      k.pool(1, 10, 94, 16);
      k.block(30, 18, 4, 8).block(62, 16, 4, 10);
      k.ledges([[20, 20, 6], [44, 14, 8], [76, 18, 6]]);
      k.item(46, 13, 'heart_up');
      k.foes('e20@16 e50@22 e80@14 h40 d70');
      k.candles([46, 13]);
    },
  },
  {
    id: 'sc_lantern', name: 'Lantern Grotto', zone: 'seacaves', theme: 'seacave', at: [28, 5, 1, 1], save: true,
    build: (k) => {
      k.e(12, 11, 'S').candles([4, 11], [20, 11]).sign(16, 11, 'ab_lantern');
    },
  },
  {
    id: 'sc_pools', name: 'Tide Pool Stair', zone: 'seacaves', theme: 'seacave', at: [20, 2, 4, 3],
    build: (k) => {
      // a stair of rock pools climbing up the cave
      k.block(10, 36, 20, 4).block(36, 32, 16, 8).block(58, 36, 12, 4);
      k.pool(30, 34, 6, 6);
      k.ledges([[20, 32, 6], [44, 28, 6], [60, 24, 6], [30, 22, 6], [10, 18, 6]]);
      k.item(12, 17, 'con_up');
      k.foes('d20@35 d60@35 c40@31 e32@38 h76');
      k.candles([12, 35], [38, 31], [60, 35]);
    },
  },
  {
    id: 'sc_run', name: "Smugglers' Run", zone: 'seacaves', theme: 'seacave', at: [14, 2, 6, 2],
    build: (k) => {
      // the smugglers' tunnel: casks, rope bridges (ledges) over a spike trench
      k.pit(40, 8).pit(90, 8);
      k.block(20, 22, 6, 4).block(60, 22, 8, 4).block(110, 22, 6, 4);
      k.ledges([[38, 22, 12], [88, 22, 12], [124, 20, 6]]);
      k.item(126, 19, 'life_up');
      k.foes('d30 d74 d104 c50@14 h130 b80@16');
      k.candles([22, 21], [62, 21], [112, 21]);
    },
  },
  {
    id: 'sc_cache', name: "Smugglers' Cache", zone: 'seacaves', theme: 'seacave', at: [11, 1, 3, 2],
    build: (k) => {
      // the smugglers' hoard: crates on a high shelf
      k.block(30, 20, 8, 6).block(50, 16, 8, 10);
      k.ledges([[20, 22, 6], [40, 17, 6], [60, 12, 8]]);
      k.item(64, 11, 'acc_shard');
      k.foes('d20 h40 c56@15');
      k.candles([32, 19], [52, 15]);
    },
  },
  {
    id: 'sc_blowhole', name: 'The Blowhole', zone: 'seacaves', theme: 'seacave', at: [18, 4, 2, 3],
    build: (k) => {
      k.pool(1, 30, 46, 10);
      k.ledges([[20, 28, 8]]);
      k.item(23, 27, 'potion');
      k.foes('e20@36 b20@12 c40@20');
      k.candles([22, 27]);
    },
  },
  {
    id: 'sc_trench', name: 'Black Trench', zone: 'seacaves', theme: 'seacave', at: [20, 5, 4, 2],
    build: (k) => {
      // a deep trench: the bottom of it is walled off but for a gap at the sea floor (Pearl)
      k.pool(1, 8, 94, 18);
      k.block(60, 14, 3, 11).block(60, 4, 3, 10);
      k.ledges([[10, 14, 6], [30, 18, 6], [44, 12, 6], [80, 14, 6]]);
      k.item(76, 25, 'whip_rime');
      k.foes('e20@20 e46@16 v36 h86 e84@20');
      k.candles([12, 13], [46, 11]);
    },
  },
  {
    id: 'sc_flooded', name: 'Flooded Nave', zone: 'seacaves', theme: 'seacave', at: [14, 4, 4, 2],
    build: (k) => {
      // the sea broke into a chapel here: pews (tables) under the water
      k.pool(1, 18, 94, 8);
      tables(k, [[14, 25, 8, '', ''], [34, 25, 8, '', ''], [54, 25, 8, '', '']]);
      k.ledges([[20, 15, 6], [44, 15, 6], [70, 15, 6], [56, 11, 6]]);
      k.item(58, 10, 'str_up');
      k.foes('e30@22 e60@22 d80 d10 w40@8');
      k.candles([22, 14], [46, 14], [72, 14]);
    },
  },
  {
    id: 'sc_cathedral', name: 'Drowned Cathedral', zone: 'seacaves', theme: 'seacave', at: [10, 4, 4, 3],
    extra: { tide: { low: 38, high: 18 } },
    build: (k) => {
      // the abbey's first church, swallowed by the sea long ago; the tide fills its nave
      pillar(k, 20, 20).fill(20, 36, 2, 4, '.');
      pillar(k, 74, 20).fill(74, 36, 2, 4, '.');
      k.ledges([[30, 36, 6], [50, 32, 8], [64, 36, 6], [44, 26, 6], [24, 22, 6]]);
      k.ledge(52, 14, 8); // the rood loft: high tide or the Raven Mantle
      k.item(56, 13, 'elixir').item(26, 21, 'heart_up');
      k.foes('d30 d60 e40@38 h80 w50@20 v12');
      k.candles([32, 35], [52, 31], [66, 35], [54, 13]);
      k.sign(84, 39, 'ab_cathedral');
    },
  },
  {
    id: 'sc_chapel', name: 'Drowned Chapel', zone: 'seacaves', theme: 'seacave', at: [24, 7, 2, 1],
    build: (k) => {
      k.pool(1, 9, 46, 3);
      k.sign(30, 11, 'ab_drownedchapel');
      k.foes('e20@11 d36');
      k.candles([8, 11], [40, 11]);
    },
  },
  {
    id: 'sc_choir', name: 'The Sunken Choir', zone: 'seacaves', theme: 'seacave', at: [26, 7, 3, 2],
    build: (k) => {
      // an empty boss chamber for now: the Undertow Pearl lies on the floor
      k.pool(1, 22, 70, 4);
      k.ledges([[20, 20, 8], [44, 20, 8], [32, 16, 8]]);
      k.item(36, 25, 'relic_pearl');
      k.candles([22, 19], [46, 19]);
    },
  },

  // ══════════════════════════════════════════════════════════ The Penitents' Gaol (needs the Pearl)
  {
    id: 'gl_floodgate', name: 'Flooded Gate', zone: 'penance', theme: 'gaol', at: [37, 5, 3, 1],
    build: (k) => {
      // the gaol's water gate is shut and the cells beyond are drowned; the bars stop a tile
      // short of the sluice floor (Pearl, and slide under them)
      k.pool(1, 5, 70, 7);
      k.block(18, 1, 3, 10).block(51, 1, 3, 10);
      k.sign(30, 11, 'ab_floodgate');
      k.foes('e8@10 e64@10');
      k.candles([40, 3]);
    },
  },
  {
    id: 'gl_cells', name: "Penitents' Cells", zone: 'penance', theme: 'gaol', at: [40, 5, 4, 1],
    build: (k) => {
      // a row of cells: bars (walls with a gap above the floor... they are open doors now)
      for (const x of [16, 36, 56, 76]) k.block(x, 1, 1, 7);
      k.ledges([[24, 8, 6], [64, 8, 6]]);
      k.item(26, 7, 'potion');
      k.foes('z20:zombie_wretch z44:zombie_wretch k60 x80 m30@4');
      k.candles([6, 11], [30, 11], [50, 11], [70, 11]);
    },
  },
  {
    id: 'gl_rack', name: 'Rack Hall', zone: 'penance', theme: 'gaol', at: [44, 5, 4, 2],
    build: (k) => {
      tables(k, [[30, 25, 8, '', ''], [56, 25, 6, '', '']]);
      k.block(14, 20, 6, 6);
      k.ledges([[40, 20, 6], [64, 18, 6]]);
      k.item(16, 19, 'acc_rootstone');
      k.foes('k40 h70 x24 s60 b50@10');
      k.candles([32, 24], [58, 24], [16, 19]);
    },
  },
  {
    id: 'gl_confess', name: 'Confessional', zone: 'penance', theme: 'gaol', at: [40, 6, 1, 1], save: true,
    build: (k) => {
      k.e(14, 11, 'S').candles([4, 11], [20, 11]).sign(8, 11, 'ab_confess');
    },
  },
  {
    id: 'gl_chains', name: 'Chain Walk', zone: 'penance', theme: 'gaol', at: [41, 6, 3, 1],
    build: (k) => {
      k.e(20, 3, 'O').e(50, 3, 'O');
      k.ledges([[8, 8, 6], [58, 8, 6]]);
      k.item(60, 7, 'con_up');
      k.foes('p20@4 p50@4 z40:zombie_wretch');
      k.candles([10, 7], [60, 7]);
    },
  },
  {
    id: 'gl_oubliette', name: 'The Oubliette', zone: 'penance', theme: 'gaol', at: [36, 5, 1, 4],
    build: (k) => {
      k.item(12, 53, 'heart_up');
      k.foes('c4@20 c20@40 b12@30');
      k.candles([6, 53], [18, 53]);
    },
  },
  {
    id: 'gl_pillory', name: 'Pillory Yard', zone: 'penance', theme: 'gaol', at: [33, 5, 3, 2],
    build: (k) => {
      k.block(30, 22, 4, 4).block(50, 22, 4, 4);
      k.e(60, 25, 'L', 'gl_shortcut').sign(54, 25, 'ab_pillory'); // opens the grate up into the Bone Nave
      k.item(31, 21, 'str_up');
      k.foes('z20:zombie_wretch z44:zombie_wretch s60 x40');
      k.candles([32, 21], [52, 21]);
    },
  },
  {
    id: 'gl_drowned', name: 'Drowning Cells', zone: 'penance', theme: 'gaol', at: [37, 7, 4, 2],
    build: (k) => {
      k.pool(1, 20, 94, 6);
      for (const x of [20, 40, 60]) k.block(x, 14, 2, 8);
      k.ledges([[8, 18, 6], [28, 16, 6], [48, 16, 6], [70, 18, 6]]);
      k.item(50, 15, 'life_up');
      k.foes('e30@24 e70@24 d50:drowned_deep h86');
      k.candles([10, 17], [72, 17]);
    },
  },
  {
    id: 'gl_engine', name: 'The Penitent Engine', zone: 'penance', theme: 'gaol', at: [41, 7, 3, 2],
    build: (k) => {
      // an empty boss chamber for now: the Sinew Coil lies on the floor
      k.ledges([[10, 21, 8], [54, 21, 8]]);
      k.item(36, 25, 'relic_sinew');
      k.candles([8, 25], [64, 25]);
    },
  },
  {
    id: 'gl_shaft', name: 'Weeping Shaft', zone: 'penance', theme: 'gaol', at: [48, 3, 1, 4],
    build: (k) => {
      // a well shaft up into the Saltworks: the ring under the grate is too low for a swing
      k.sign(6, 53, 'ab_shaft');
      k.foes('b12@30 c20@40');
      k.candles([4, 53], [20, 53]);
    },
  },

  // ══════════════════════════════════════════════════════════ The Saltworks (needs the Sinew Coil)
  {
    id: 'sw_vent', name: 'Steam Vent', zone: 'saltworks', theme: 'forge', at: [48, 1, 1, 2],
    build: (k) => {
      k.sign(4, 25, 'ab_saltworks').candles([18, 25]);
      k.foes('b12@10:bat_cinder');
    },
  },
  {
    id: 'sw_pans', name: 'Brine Pans', zone: 'saltworks', theme: 'forge', at: [49, 1, 4, 2],
    build: (k) => {
      // shallow pans of brine boiling down to salt
      k.block(4, 24, 1, 2).block(91, 24, 1, 2).pool(5, 24, 86, 2);
      k.ledges([[16, 20, 8], [40, 18, 8], [64, 20, 8]]);
      k.item(44, 17, 'potion');
      k.foes('o30:ooze_magma o70:ooze_magma b50@10:bat_cinder');
      k.candles([18, 19], [42, 17], [66, 19]);
    },
  },
  {
    id: 'sw_boiler', name: 'Boiler House', zone: 'saltworks', theme: 'forge', at: [53, 1, 3, 2],
    build: (k) => {
      k.block(20, 18, 10, 8).block(46, 20, 8, 6);
      k.ledges([[10, 22, 6], [32, 14, 8]]);
      k.item(35, 13, 'life_up');
      k.foes('h40:hookjaw_thrall k60:knight_slag b30@6:bat_cinder');
      k.candles([22, 17], [48, 19]);
    },
  },
  {
    id: 'sw_save', name: "Salter's Rest", zone: 'saltworks', theme: 'forge', at: [56, 1, 1, 1], save: true,
    build: (k) => {
      k.e(6, 11, 'S').candles([2, 11], [21, 11]);
      k.e(18, 11, 'L', 'sw_shortcut'); // opens the grate up into the Topiary Maze
    },
  },
  {
    id: 'sw_kiln', name: 'Kiln Row', zone: 'saltworks', theme: 'forge', at: [49, 3, 5, 1],
    build: (k) => {
      for (const x of [16, 40, 64, 88]) k.block(x, 8, 6, 4);
      k.pit(24, 14).pit(74, 12);
      k.ledges([[28, 7, 6], [78, 7, 6]]);
      k.item(30, 6, 'shield_ashen');
      k.foes('k50:knight_slag o100:ooze_magma b30@4:bat_cinder b80@4:bat_cinder');
      k.candles([18, 7], [42, 7], [66, 7], [90, 7]);
    },
  },
  {
    id: 'sw_chimney', name: 'Great Chimney', zone: 'saltworks', theme: 'forge', at: [54, 3, 1, 4],
    build: (k) => {
      k.foes('b12@20:bat_cinder b12@40:bat_cinder c4@30');
      k.candles([12, 53]);
    },
  },
  {
    id: 'sw_crucible', name: 'Salt Crucible', zone: 'saltworks', theme: 'forge', at: [49, 4, 5, 2],
    build: (k) => {
      // a crucible of molten salt (a spike pit) too wide to jump: the far ledge needs the glide
      k.pit(14, 24);
      k.block(4, 22, 10, 4);
      k.item(7, 21, 'con_up');
      k.ledges([[44, 22, 8], [70, 20, 8], [90, 16, 6]]);
      k.item(92, 15, 'elixir');
      k.foes('h60:hookjaw_thrall o80:ooze_magma b40@10:bat_cinder');
      k.candles([46, 21], [72, 19], [100, 25]);
    },
  },
  {
    id: 'sw_slag', name: 'Slag Pit', zone: 'saltworks', theme: 'forge', at: [49, 6, 5, 1],
    build: (k) => {
      k.pit(30, 10).pit(70, 10);
      k.block(50, 9, 6, 3);
      k.e(4, 11, 'L', 'sw_slagdoor'); // opens the gate down into the Weeping Shaft
      k.ledges([[33, 8, 4], [73, 8, 4]]);
      k.item(52, 8, 'str_up');
      k.foes('o20:ooze_magma o100:ooze_magma k60:knight_slag');
      k.candles([52, 8], [10, 11], [110, 11]);
    },
  },
  {
    id: 'sw_conveyor', name: 'Brine Conveyor', zone: 'saltworks', theme: 'forge', at: [55, 3, 3, 2],
    build: (k) => {
      k.fill(10, 20, 50, 1, 'H');
      k.ledges([[20, 15, 8], [44, 15, 8]]);
      k.item(47, 14, 'heart_up');
      k.foes('h30:hookjaw_thrall g50:dog_dire b40@8:bat_cinder');
      k.candles([22, 14], [46, 14], [8, 25]);
    },
  },
  {
    id: 'sw_cistern', name: 'Hot Cistern', zone: 'saltworks', theme: 'forge', at: [55, 5, 3, 2],
    build: (k) => {
      // a cistern of hot brine; a sealed tank at the bottom (Pearl)
      k.pool(1, 16, 70, 10);
      k.block(46, 14, 3, 11);
      k.ledges([[10, 14, 6], [26, 12, 6]]);
      k.item(60, 25, 'con_up');
      k.foes('e20@20 e36@24 o30:ooze_magma');
      k.candles([12, 13], [28, 11]);
    },
  },
  {
    id: 'sw_furnace', name: 'Furnace Gate', zone: 'saltworks', theme: 'forge', at: [58, 3, 1, 2],
    build: (k) => {
      k.foes('k12:knight_slag');
      k.candles([6, 25], [18, 25]).sign(4, 25, 'ab_furnace');
    },
  },
  {
    id: 'sw_kilnheart', name: 'The Salt Kiln', zone: 'saltworks', theme: 'forge', at: [59, 2, 3, 3],
    build: (k) => {
      // an empty boss chamber for now: the Duskwing Shroud lies on the floor
      k.ledges([[10, 34, 8], [54, 34, 8], [30, 30, 12]]);
      k.item(36, 39, 'relic_shroud');
      k.candles([8, 39], [64, 39]);
    },
  },

  // ══════════════════════════════════════════════════════════ The Glass Choir (needs the glide)
  {
    id: 'gc_threshold', name: 'Glass Threshold', zone: 'glasschoir', theme: 'crystal', at: [52, -11, 3, 1],
    build: (k) => {
      k.block(30, 9, 6, 3);
      k.sign(14, 11, 'ab_glass');
      k.foes('k50:knight_glass w30@4:wisp_prism');
      k.candles([32, 8], [60, 11]);
    },
  },
  {
    id: 'gc_lancet', name: 'Lancet Gallery', zone: 'glasschoir', theme: 'crystal', at: [52, -13, 3, 2],
    build: (k) => {
      k.block(24, 20, 4, 6).block(48, 22, 4, 4);
      k.ledges([[14, 22, 6], [34, 17, 8], [56, 18, 6]]);
      k.item(37, 16, 'life_up');
      k.foes('m30 w50@10:wisp_prism s60:skeleton_jade');
      k.candles([26, 19], [50, 21]);
    },
  },
  {
    id: 'gc_rose', name: 'Rose Window', zone: 'glasschoir', theme: 'crystal', at: [52, -16, 3, 3],
    build: (k) => {
      k.ledges([[20, 34, 8], [40, 30, 8], [24, 24, 8], [44, 20, 8], [30, 14, 8]]);
      k.item(33, 13, 'heart_up');
      k.foes('y30@20:harpy_rime y50@10:harpy_rime w40@30:wisp_prism r20@28');
      k.candles([22, 33], [42, 29], [32, 13]);
    },
  },
  {
    id: 'gc_nave', name: 'Nave of Prisms', zone: 'glasschoir', theme: 'crystal', at: [55, -12, 4, 2],
    build: (k) => {
      for (const x of [20, 46, 72]) k.block(x, 22, 4, 4);
      k.ledges([[30, 20, 6], [56, 20, 6]]);
      k.item(48, 21, 'con_up');
      k.foes('k34:knight_glass k62:knight_glass m84 w50@10:wisp_prism');
      k.candles([22, 21], [48, 21], [74, 21]);
    },
  },
  {
    id: 'gc_organ', name: 'The Glass Organ', zone: 'glasschoir', theme: 'crystal', at: [55, -15, 3, 3],
    build: (k) => {
      // the organ's pipes (tall glass blocks) and its loft
      for (const [x, top] of [[26, 36], [30, 33], [34, 30], [38, 27]]) k.block(x, top, 3, k.F - top);
      k.ledges([[10, 34, 8], [56, 34, 8], [16, 28, 6]]);
      k.item(39, 26, 'elixir');
      k.foes('s14:skeleton_jade s60:skeleton_jade r40@14');
      k.candles([12, 33], [58, 33]);
    },
  },
  {
    id: 'gc_vestry', name: 'Vestry', zone: 'glasschoir', theme: 'crystal', at: [59, -12, 1, 1], save: true,
    build: (k) => {
      k.e(12, 11, 'S').candles([4, 11], [20, 11]).sign(16, 11, 'ab_vestry');
    },
  },
  {
    id: 'gc_stair', name: 'Shard Stair', zone: 'glasschoir', theme: 'crystal', at: [59, -11, 1, 4],
    build: (k) => {
      k.item(18, 53, 'str_up');
      k.foes('w12@20:wisp_prism w12@40:wisp_prism c4@30');
      k.candles([6, 53], [18, 53]);
    },
  },
  {
    id: 'gc_fall', name: 'Shattered Window', zone: 'glasschoir', theme: 'crystal', at: [57, -7, 3, 4],
    build: (k) => {
      // a great window fell in here; its lead frame is a stair of ledges down to the gardens
      k.ledges([[40, 44, 8], [20, 38, 8], [44, 30, 8], [24, 22, 8]]);
      k.item(26, 21, 'acc_moon');
      k.foes('y30@20:harpy_rime y50@40:harpy_rime w40@10:wisp_prism');
      k.candles([42, 43], [22, 37]);
    },
  },
  {
    id: 'gc_reliquary', name: 'The Reliquary', zone: 'glasschoir', theme: 'crystal', at: [58, -15, 3, 2],
    build: (k) => {
      // an empty boss chamber for now: the Ashglass Ward lies on the floor
      k.ledges([[10, 21, 8], [54, 21, 8], [30, 17, 12]]);
      k.item(36, 25, 'relic_ward');
      k.candles([8, 25], [64, 25]);
    },
  },
];

const LINKS: Link[] = [
  // Gullmouth Strand
  ['st_landing', 'st_quay'],
  ['st_landing', 'st_lighthouse', { gate: 'dj', in: 'st_landing' }],
  ['st_quay', 'st_nets', { at: 0 }],
  ['st_nets', 'st_lane', { at: 0 }],
  ['st_lane', 'st_tower', { at: 9 }],
  ['st_roofs', 'st_tower', { at: -3 }],
  ['st_lane', 'st_cove', { at: 10 }],
  ['st_lane', 'st_chapel'],
  ['st_chapel', 'st_seawall'],
  ['st_tower', 'st_cliff', { at: -1 }],
  ['st_seawall', 'cw_gate'],
  // the Drowned Causeway
  ['cw_gate', 'cw_low'],
  ['cw_low', 'cw_toll'],
  ['cw_toll', 'cw_wreck', { at: 0 }],
  ['cw_wreck', 'cw_breakers', { at: 0 }],
  ['cw_breakers', 'cw_lamppier', { at: 27, gate: 'dj', in: 'cw_breakers' }],
  ['cw_breakers', 'cw_seagate', { at: 0 }],
  ['cw_wreck', 'cw_shoals', { at: 1 }],
  ['cw_shoals', 'cw_undertow'],
  ['cw_seagate', 'cw_undertow', { at: 30 }],
  // Saint Calder's Cloister
  ['cw_seagate', 'cl_narthex', { at: -1 }],
  ['cw_seagate', 'cl_lavatorium', { at: 0 }],
  ['cl_narthex', 'cl_garth', { at: -1 }],
  ['cl_narthex', 'cl_lavatorium', { at: 33 }],
  ['cl_lavatorium', 'cl_infirmary'],
  ['cl_westwalk', 'cl_garth', { at: -2 }],
  ['cl_garth', 'cl_eastwalk', { at: -1 }],
  ['cl_garth', 'cl_dorter', { at: -2 }],
  ['cl_garth', 'cl_infirmary', { at: 37 }],
  ['cl_eastwalk', 'cl_chapter'],
  ['cl_chapter', 'cl_refectory', { at: -1 }],
  ['cl_eastwalk', 'cl_kitchen', { at: 40 }],
  ['cl_infirmary', 'cl_kitchen'],
  ['cl_kitchen', 'cl_cellar', { at: 0 }],
  ['cl_cellar', 'cl_refectory', { at: 44, gate: 'drop', in: 'cl_cellar' }],
  // the Undercroft
  ['cl_infirmary', 'uc_stair', { at: 36 }],
  ['cl_lavatorium', 'uc_lamps', { at: 34 }],
  ['uc_lamps', 'uc_stair', { at: 2 }],
  ['uc_stair', 'uc_crypts', { at: 2 }],
  ['uc_stair', 'uc_tombs', { at: 3 }],
  ['uc_ossuary', 'uc_stair', { at: 3 }],
  ['cl_cellar', 'uc_charnel', { at: 43 }],
  ['uc_crypts', 'uc_charnel'],
  ['uc_tombs', 'uc_sump', { at: 4 }],
  ['uc_charnel', 'uc_sump', { at: 42 }],
  ['uc_charnel', 'uc_well', { at: 2 }],
  ['uc_sump', 'uc_well', { at: 4 }],
  ['uc_well', 'uc_ante', { at: 4 }],
  ['uc_ante', 'uc_prior', { at: 4 }],
  // the Scriptorium
  ['cl_westwalk', 'sp_porch', { at: -3, gate: 'ring', in: 'cl_westwalk' }],
  ['sp_copy', 'sp_porch', { at: -3 }],
  ['sp_copy', 'sp_nook', { at: -4 }],
  ['sp_copy', 'sp_stacks', { at: 26 }],
  ['sp_ink', 'sp_stacks', { at: -2 }],
  ['sp_ink', 'cw_low', { at: 20, gate: 'dj', in: 'cw_low' }],
  ['sp_bindery', 'sp_copy', { at: -3 }],
  ['sp_bindery', 'sp_stair', { at: 24 }],
  ['sp_stair', 'sp_gallery', { at: -6 }],
  ['sp_stair', 'sp_maps', { at: -9 }],
  ['sp_burned', 'sp_stair', { at: -5 }],
  ['sp_gallery', 'sp_rafters', { at: -7 }],
  ['sp_rafters', 'sp_bridge', { at: -8 }],
  // the Bell Tower
  ['sp_bridge', 'bt_west', { at: -8, gate: 'slide', in: 'bt_west' }],
  ['cl_dorter', 'bt_foot', { at: -3, gate: 'slide', in: 'bt_foot' }],
  ['bt_foot', 'bt_stair', { at: 44 }],
  ['bt_west', 'bt_loft', { at: -8 }],
  ['bt_loft', 'bt_stair', { at: -8 }],
  ['bt_loft', 'bt_ropes', { at: 41 }],
  ['bt_ropes', 'bt_stair', { at: -6 }],
  ['bt_stair', 'bt_cell', { at: -6 }],
  ['bt_stair', 'bt_gutter', { at: -8 }],
  ['bt_stair', 'bt_bells', { at: 44 }],
  ['bt_bells', 'bt_spire', { at: -11, gate: 'dj', in: 'bt_bells' }],
  ['bt_crown', 'bt_bells', { at: 41 }],
  ['bt_spire', 'bt_roof', { at: -11 }],
  // the Tithe Gardens
  ['cl_refectory', 'gd_gate', { at: -2, gate: 'ring', in: 'cl_refectory' }],
  ['gd_gate', 'gd_herbs'],
  ['gd_gate', 'gd_well', { at: 46 }],
  ['gd_orchard', 'gd_herbs', { at: 50 }],
  ['gd_herbs', 'gd_glass', { at: -2 }],
  ['gd_orchard', 'gd_glass', { at: -3 }],
  ['gd_glass', 'gd_shed', { at: -2 }],
  ['gd_shed', 'gd_briar', { at: -2 }],
  ['gd_well', 'gd_hives', { at: 0 }],
  ['gd_hives', 'gd_graves', { at: 0 }],
  ['gd_herbs', 'gd_graves', { at: 51 }],
  ['gd_graves', 'gd_topiary', { at: 0 }],
  ['bt_gutter', 'gd_trellis', { at: 47, gate: 'drop', in: 'gd_trellis' }],
  ['gd_trellis', 'gd_ivy', { at: 48 }],
  ['gd_ivy', 'gd_orchard', { at: -4 }],
  // the Sea Caves
  ['sc_mouth', 'uc_ossuary', { at: 3, gate: 'dj', in: 'uc_ossuary' }],
  ['cw_undertow', 'sc_mouth', { at: 30, gate: 'lever:sc_arch', in: 'cw_undertow' }],
  ['sc_grotto', 'sc_mouth', { at: 4 }],
  ['sc_grotto', 'sc_kelp', { at: 25 }],
  ['sc_kelp', 'sc_lantern', { at: 5 }],
  ['sc_pools', 'sc_grotto', { at: 4 }],
  ['sc_run', 'sc_pools', { at: 3 }],
  ['sc_cache', 'sc_run', { at: 2 }],
  ['st_cove', 'sc_cache', { at: 1, gate: 'manual', in: 'st_cove' }],
  ['sc_run', 'sc_blowhole', { at: 18 }],
  ['sc_flooded', 'sc_blowhole', { at: 5 }],
  ['sc_blowhole', 'sc_trench', { at: 6 }],
  ['sc_trench', 'sc_kelp', { at: 6 }],
  ['sc_cathedral', 'sc_flooded', { at: 5 }],
  ['sc_kelp', 'sc_chapel', { at: 24 }],
  ['sc_chapel', 'sc_choir', { at: 7 }],
  // the Penitents' Gaol
  ['uc_tombs', 'gl_floodgate', { at: 38 }],
  ['gl_oubliette', 'gl_floodgate', { at: 5 }],
  ['gl_floodgate', 'gl_cells', { at: 5 }],
  ['gl_cells', 'gl_rack', { at: 5 }],
  ['gl_cells', 'gl_confess', { at: 40 }],
  ['gl_confess', 'gl_chains', { at: 6 }],
  ['gl_chains', 'gl_rack', { at: 6 }],
  ['gl_pillory', 'gl_oubliette', { at: 6 }],
  ['uc_ossuary', 'gl_pillory', { at: 34, gate: 'lever:gl_shortcut', in: 'uc_ossuary' }],
  ['gl_oubliette', 'gl_drowned', { at: 8 }],
  ['gl_drowned', 'gl_engine', { at: 8 }],
  ['gl_chains', 'gl_engine', { at: 42 }],
  ['gl_rack', 'gl_shaft', { at: 6 }],
  // the Saltworks
  ['sw_vent', 'gl_shaft', { at: 48, gate: 'coil', in: 'gl_shaft' }],
  ['gl_shaft', 'sw_slag', { at: 6, gate: 'lever:sw_slagdoor', in: 'gl_shaft' }],
  ['sw_vent', 'sw_pans', { at: 2 }],
  ['sw_pans', 'sw_boiler', { at: 2 }],
  ['sw_pans', 'sw_kiln', { at: 50 }],
  ['sw_boiler', 'sw_save', { at: 1 }],
  ['gd_topiary', 'sw_save', { at: 56, gate: 'lever:sw_shortcut', in: 'gd_topiary' }],
  ['sw_kiln', 'sw_chimney', { at: 3 }],
  ['sw_crucible', 'sw_chimney', { at: 5 }],
  ['sw_slag', 'sw_chimney', { at: 6 }],
  ['sw_chimney', 'sw_conveyor', { at: 4 }],
  ['sw_chimney', 'sw_cistern', { at: 6 }],
  ['sw_conveyor', 'sw_furnace', { at: 4 }],
  ['sw_furnace', 'sw_kilnheart', { at: 4 }],
  // the Glass Choir
  ['bt_roof', 'gc_threshold', { at: -11 }],
  ['gc_threshold', 'gc_nave', { at: -11 }],
  ['gc_lancet', 'gc_threshold', { at: 52 }],
  ['gc_lancet', 'gc_nave', { at: -12 }],
  ['gc_rose', 'gc_lancet', { at: 53 }],
  ['gc_rose', 'gc_organ', { at: -14 }],
  ['gc_organ', 'gc_nave', { at: 56 }],
  ['gc_organ', 'gc_reliquary', { at: -14 }],
  ['gc_nave', 'gc_vestry', { at: -12 }],
  ['gc_nave', 'gc_stair', { at: -11 }],
  ['gc_stair', 'gc_fall', { at: 59 }],
  ['gc_fall', 'gd_briar', { at: 58, gate: 'drop', in: 'gd_briar' }],
];

export function buildAbbeyRooms(): RoomDef[] {
  return buildWorld(SPECS, LINKS);
}
