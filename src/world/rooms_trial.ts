// The trial chambers (0.27.0): arenas for bosses that are being tried out and are NOT in the
// world. They are not part of buildRooms(): the test chamber adds one to the room list when
// its boss is picked from TEST ENEMY or the enemy editor (see BossInfo.trial in game/bosses.ts
// and startBossTest in game/test_chamber.ts). They sit far off the map, at cells (60+, 60).
import { RB, RoomDef } from './rooms';

/** The Frozen Falls: a cave under a frozen waterfall. Thin lake ice in the middle (the boss breaks it), ledges either side. */
export function buildFrozenFalls(): RoomDef {
  const b = new RB(3, 2).shell(); // 72 x 28 tiles, floor rows 26-27
  b.fill(6, 21, 6, 1, '=').fill(12, 17, 6, 1, '='); // ledges up the west side, by the falls
  b.fill(60, 21, 6, 1, '=').fill(54, 17, 6, 1, '='); // and the east
  b.fill(34, 20, 6, 1, '='); // one over the lake
  b.e(20, 25, 'P');
  return b.build('trial_falls', 'The Frozen Falls', 'heights', 'ice', 72, 60, { boss: 'yeti2' });
}

/** The Mammoth Boneyard: a den inside a frozen ribcage. Rib ledges, a beam for each carcass, the skull to the east. */
export function buildBoneyard(): RoomDef {
  const b = new RB(3, 2).shell();
  for (const x of [20, 36, 52]) b.fill(x, 19, 5, 1, '='); // the rib tips
  b.fill(31, 14, 6, 1, '=').fill(42, 14, 6, 1, '='); // the high ribs, either side of the hanging tusk
  b.fill(8, 12, 5, 1, '=').fill(56, 12, 5, 1, '='); // the beams the carcasses hang from
  b.fill(64, 23, 4, 3); // something to stand on inside the mammoth's skull (the prop is drawn over it)
  b.e(24, 5, 'O').e(48, 5, 'O'); // rings on the spine
  b.e(16, 25, 'P');
  return b.build('trial_bones', 'The Mammoth Boneyard', 'heights', 'snow', 76, 60, { boss: 'yeti3' });
}

/**
 * The Foundry: a long forge floor under a crane rail. Catwalks at both ends and a gantry in
 * the middle (from it the ladle's ring is in reach). The trough, the grate and the molten
 * channel are props the boss lays on the floor.
 */
export function buildFoundry(): RoomDef {
  const b = new RB(3, 2).shell();
  b.fill(3, 20, 8, 1, '=').fill(61, 20, 8, 1, '='); // low catwalks
  b.fill(13, 15, 8, 1, '=').fill(51, 15, 8, 1, '='); // high catwalks
  b.fill(34, 13, 5, 1, '='); // the gantry under the rail, clear of his head (the ladle's ring is in reach from it)
  b.fill(26, 14, 2, 1, '=').fill(45, 14, 2, 1, '='); // ledges from the high catwalks out to the gantry
  b.e(22, 25, 'P').e(48, 25, 'W'); // close enough that the camera need not pull far back at the start
  return b.build('trial_foundry', 'The Foundry', 'forge', 'forge', 68, 60, { boss: 'colossus2' });
}

/**
 * The Sunken Rotunda: a round court whose floor steps down in three tiers from each wall to a
 * sunken floor in the middle (columns 16-31), where the boss keeps. Her mirrors stand on the
 * upper two tiers.
 */
export function buildRotunda(): RoomDef {
  const b = new RB(2, 2).shell(); // 48 x 28 tiles, floor rows 26-27
  for (const [x, top] of [[1, 20], [6, 22], [11, 24]]) {
    b.fill(x, top, 5, 26 - top);
    b.fill(48 - x - 5, top, 5, 26 - top);
  }
  b.e(18, 25, 'P').e(28, 25, 'W');
  return b.build('trial_rotunda', 'The Sunken Rotunda', 'temple', 'temple', 64, 60, { boss: 'gorgon2' });
}

/**
 * The Sunken Lock: a lock at the foot of a flooded well (2 x 3 cells, 48 x 42 tiles). Two
 * basins either side of a stone weir with a gap under it; above, the shaft: ledges up both
 * sides, stubs of the old stair on the walls, rings up the middle. Tidal water (the boss runs it).
 */
export function buildSunkenLock(): RoomDef {
  const b = new RB(2, 3).shell(); // floor rows 40-41
  b.fill(1, 31, 9, 9).fill(38, 31, 9, 9); // the banks
  b.fill(22, 30, 4, 10).fill(22, 35, 4, 3, '.'); // the weir, and the gap under it
  b.fill(14, 32, 4, 1, '=').fill(30, 32, 4, 1, '='); // planks over each basin
  for (const y of [27, 19, 11]) b.fill(y === 27 ? 11 : 12, y, y === 27 ? 5 : 7, 1, '=').fill(y === 27 ? 32 : 29, y, y === 27 ? 5 : 7, 1, '=');
  for (const [y, n] of [[23, 7], [15, 8], [7, 7]]) b.fill(1, y, n, 1).fill(47 - n, y, n, 1); // the broken stair
  b.e(24, 24, 'O').e(24, 16, 'O').e(24, 8, 'O');
  b.e(5, 30, 'P');
  return b.build('trial_lock', 'The Sunken Lock', 'deeps', 'deeps', 60, 60, { boss: 'leviathan2', tide: { low: 33, high: 13 } });
}
