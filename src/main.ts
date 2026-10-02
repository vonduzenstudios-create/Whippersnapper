import { Game } from './game/game';
import { startLab } from './game/lab';

const game = new Game();
game.start();
const g: any = game;
const hash = location.hash.slice(1);
/** Start playing in a room (as if the Wyrm were already dead), for testing. */
const startIn = (id: string, x: number, bottom: number) => {
  g.hunter.bossDefeated = true;
  g.hunter.flags.push('wyrm_slain', 'pass_buried');
  g.hunter.grapple = true;
  g.state = 'play';
  g.loadRoom(g.defs.find((d: any) => d.id === id), x, bottom);
};
if (hash === 'tour') game.startTour();
if (hash.startsWith('boss')) {
  // #boss = the Wyrm, #boss=hound / #boss=bellmother for the others (99,999 HP, can't be hurt)
  const which = hash.split('=')[1] || 'wyrm';
  const def = g.defs.find((d: any) => d.boss === which) || g.defs.find((d: any) => d.boss === 'wyrm');
  g.hunter.hp = g.hunter.maxHp = 99999;
  g.hunter.grapple = true;
  g.state = 'play';
  g.loadRoom(def, 200, def.h * 14 * 16 - 32);
  g.player.invuln = 999999;
  g.startBoss();
}
// #hub = the Undervault right after the Wyrm. #relics = the same with both movement relics.
if (hash === 'hub' || hash === 'relics') {
  startIn('undervault', 40, 26 * 16);
  if (hash === 'relics') g.hunter.doubleJump = g.hunter.slide = true;
}
// #lab = the test room for the experimental relics and enemies (see game/lab.ts)
if (hash === 'lab') startLab(game);
