// The #lab test room: a sandbox for the experimental relics and enemies (0.4.0).
// It isn't part of the map. main.ts adds it to the room list only when the page is
// opened with #lab, far away from every real room, so it never connects to anything.
//
// Keys while inside it:
//   1-5  spawn a Hookjaw / Mire Eel / Gloomcaster / Rot Ooze / Grave Grub
//   X    spawn a Gravehand
//   T    spawn a Rustling Tome (it sleeps until you are close, then tears loose)
//   Y    spawn a Restless Chair (it stands still until you are close)
//   U    spawn a Bone Librarian (it shelves books, back turned, until you are close)
//   6    clear all enemies
//   7-9  toggle the Duskwing Shroud / Undertow Pearl / Ashglass Ward
//   0    refill HP and hearts
import { RB, RoomDef } from '../world/rooms';
import type { Game } from './game';
import { Hunter } from './stats';
import { Enemy } from './enemies';
import { spawnEnemy } from './spawn';
import { TILE } from '../config';
import { clamp } from '../core/util';

export const LAB_ID = 'lab';

/**
 * 3 x 2 cells. Left: a deep pool (eels, the Undertow Pearl). Middle: a pillar to jump
 * off and a spike trench that only a glide (or the grapple rings) gets you across.
 * Right: an open floor to fight on.
 */
export function buildLabRoom(): RoomDef {
  const b = new RB(3, 2).shell(); // 72 x 28 tiles, floor rows 26-27
  b.fill(24, 18, 47, 8); // raised floor right of the pool (top at row 18)
  b.fill(1, 19, 23, 7, '~'); // the pool, its surface just below that floor
  b.fill(22, 11, 4, 1, '='); // ledges up to the pillar
  b.fill(25, 14, 4, 1, '=');
  b.fill(29, 8, 4, 10); // the pillar (top at row 8)
  b.fill(38, 18, 14, 1, '.').fill(38, 19, 14, 1, '^'); // spike trench
  b.e(42, 14, 'O').e(48, 14, 'O'); // grapple rings over the trench
  b.fill(58, 13, 8, 1, '='); // a ledge over the arena
  b.e(26, 17, 'P').e(27, 17, 'T', 'lab');
  b.e(9, 23, 'e').e(17, 21, 'e');
  b.e(53, 17, 'x').e(55, 17, 'u').e(60, 17, 'o').e(65, 17, 'h').e(69, 17, 'm');
  return b.build(LAB_ID, 'Test Chamber', 'lab', 'flooded', 40, 40);
}

/** Which enemy letter each number key spawns. */
const SPAWN_KEYS: Record<string, string> = { Digit1: 'h', Digit2: 'e', Digit3: 'm', Digit4: 'o', Digit5: 'u', KeyX: 'x', KeyT: 't', KeyY: 'a', KeyU: 'l' };

/** A hunter with every relic, plenty of HP and a full heart pouch. */
function labHunter() {
  const h = new Hunter();
  h.hp = h.maxHp = 400;
  h.hearts = h.maxHearts = 99;
  h.grapple = h.doubleJump = h.slide = true;
  h.glide = h.swim = h.ward = true;
  h.subs = ['sub_holy', 'sub_cross'];
  h.sub = 'sub_holy';
  h.flags.push('wyrm_slain', 'pass_buried');
  return h;
}

export function startLab(g: Game) {
  const def = buildLabRoom();
  g.defs.push(def);
  g.rebuildGrid();
  g.hunter = labHunter();
  g.state = 'play';
  const p = def.ents.find((e) => e.t === 'P')!;
  g.loadRoom(def, p.x * TILE + 8, (p.y + 1) * TILE);
  window.addEventListener('keydown', (e) => {
    if (g.state !== 'play' || g.room.def.id !== LAB_ID) return;
    const h = g.hunter, pl = g.player;
    const letter = SPAWN_KEYS[e.code];
    if (letter) {
      let x: number, bottom: number;
      if (letter === 'e') {
        // eels go in the pool
        x = 12 * TILE;
        bottom = 24 * TILE;
      } else {
        x = clamp(pl.x + pl.facing * 90, 40, g.room.W - 40);
        bottom = g.floorBelow(x, pl.y - 24);
      }
      const en = spawnEnemy(g, letter, x, bottom);
      if (en) {
        g.spawn(en);
        g.fx.burst(x, bottom - 12, 'smoke', 4, 8, { vy: -0.5, life: 30, fade: true });
        g.audio.play('blink');
      }
    } else if (e.code === 'Digit6') {
      for (const en of g.ents) if (en instanceof Enemy) en.dead = true;
      g.message('ENEMIES CLEARED', 90);
    } else if (e.code === 'Digit7') {
      h.glide = !h.glide;
      g.message(`DUSKWING SHROUD ${h.glide ? 'ON' : 'OFF'}`, 90);
    } else if (e.code === 'Digit8') {
      h.swim = !h.swim;
      g.message(`UNDERTOW PEARL ${h.swim ? 'ON' : 'OFF'}`, 90);
    } else if (e.code === 'Digit9') {
      h.ward = !h.ward;
      g.message(`ASHGLASS WARD ${h.ward ? 'ON' : 'OFF'}`, 90);
    } else if (e.code === 'Digit0') {
      h.hp = h.maxHp;
      h.hearts = h.maxHearts;
      g.message('HP AND HEARTS REFILLED', 90);
    }
  });
}
