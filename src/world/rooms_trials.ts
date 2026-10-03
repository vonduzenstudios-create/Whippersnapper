// The ten trial bosses' chambers (0.27.0). They are NOT part of the world: buildRooms() never
// sees them. The enemy test (TEST ENEMY on the title, `#test=boss:<id>`, the enemy editor's
// TEST button) builds the one it needs and parks it far off the map (game/test_chamber.ts).
//
// Every chamber is 2 x 2 cells (48 x 28 tiles) with walls eight tiles thick, so the arena is
// always columns 8-39 with its floor at row 26 (AX0 / AX1 in game/boss_kit.ts), and there is
// stone round it for the camera to pull back over. What differs is the ceiling, the theme and
// a few tiles; the rest of each chamber is the props its boss brings along.
import { RB, RoomDef, Theme } from './rooms';

/** `ceil` = the first open row under the ceiling (0 = open sky). */
function chamber(i: number, id: string, name: string, theme: Theme, ceil: number, bossCol: number, shape?: (b: RB) => void): RoomDef {
  const b = new RB(2, 2).shell(ceil > 0);
  b.fill(0, 0, 8, 28).fill(40, 0, 8, 28);
  if (ceil > 0) b.fill(0, 0, 48, ceil);
  shape?.(b);
  b.e(11, 25, 'P').e(bossCol, 25, 'W');
  return b.build(`trial_${id}`, name, 'lab', theme, 60 + i * 3, 60, { boss: id });
}

export const TRIAL_ROOMS: Record<string, () => RoomDef> = {
  castellan: () => chamber(0, 'castellan', 'The Clock Tower', 'belfry', 11, 31),
  marionette: () => chamber(1, 'marionette', 'The Dark Stage', 'hall', 11, 30),
  saint: () => chamber(2, 'saint', 'The Smoking Chapel', 'shrine', 10, 24),
  stalker: () => chamber(3, 'stalker', 'The Lantern Crypt', 'catacomb', 13, 34),
  reaper: () => chamber(4, 'reaper', 'The Red Field', 'graveyard', 0, 32),
  baron: () => chamber(5, 'baron', 'The East Battery', 'courtyard', 0, 33),
  starreader: () => chamber(6, 'starreader', 'The Orrery', 'crystal', 5, 24),
  miller: () => chamber(7, 'miller', 'The Mill Loft', 'rooftop', 8, 32),
  mawtoad: () => chamber(8, 'mawtoad', 'The Bog Hollow', 'flooded', 12, 31),
  // a planter with a crawlspace under it (the low root-heart) and a ring by the trellis (the high one)
  abbess: () => chamber(9, 'abbess', 'The Glasshouse', 'garden', 11, 22, (b) => b.fill(26, 23, 4, 2).e(19, 17, 'O')),
};
