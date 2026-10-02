// Entry point for editor.html: the game, opened straight into the map editor.
import { Game } from './game/game';

const game = new Game();
game.start();
game.editor.openStandalone();
