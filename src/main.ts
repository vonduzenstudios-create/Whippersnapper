import { Game } from './game/game';
import { startTest } from './game/test_chamber';

const game = new Game();
game.start();
// F3 opens the enemy editor in its own tab (F2 is the map editor, inside the game)
window.addEventListener('keydown', (e) => {
  if (e.code !== 'F3') return;
  e.preventDefault(); // F3 is the browser's find-next
  window.open('enemies.html', 'nocturne_enemies');
});
const g: any = game;
const hash = decodeURIComponent(location.hash.slice(1));
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
// #abbey = NEW GAME + from its start (the Drowned Abbey). #abbey=<room id> = TEST ROOM there
// (every relic, nothing saved), e.g. #abbey=gl_shaft
if (hash === 'abbey' || hash.startsWith('abbey=')) {
  game.setWorld('abbey');
  const id = hash.split('=')[1];
  const def = id && g.defs.find((d: any) => d.id === id);
  if (def) game.testRoom(def);
  else game.newGame();
}
// #test=<enemy id> = the enemy test chamber with that enemy (the enemy editor's TEST button),
// #test=boss:<id> = that boss's fight, #test or #lab = the chamber empty (see game/test_chamber.ts)
if (hash === 'lab' || hash === 'test' || hash.startsWith('test=')) startTest(game, hash.split('=')[1] || '');
