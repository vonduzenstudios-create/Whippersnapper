# Running and testing

## Commands

```
npm install
npm run dev        # Vite dev server
npm run build      # production build to dist/ (does not run tsc)
npm run typecheck  # tsc --noEmit
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

Because `build` skips type checking, always run `typecheck` too.

## Debug hooks

- `window.game` is the live `Game` instance. Example: `game.hunter.grapple = true` gives the grapple.
- Open the page with `#tour` to cycle the camera through every map cell (one every 3 seconds).
- Open the page with `#boss` to jump straight into the Wyrm fight with 99,999 HP. `#boss=hound` and `#boss=bellmother` do the same for Gnarlfang and the Bell-Mother.
- Open the page with `#hub` to start in the Undervault as if the Wyrm had just died (grapple, no relics). `#relics` is the same with both movement relics.
- TEST ROOM on the title menu lists every room and starts you in the one you pick with every relic, both sub-weapons, 9999 HP and 99 hearts (`Game.testRoom`). The world is fresh (no flags), save points don't save while `Game.testRun` is set, and Continue on the game-over screen restarts the test room.
- Enemy test chambers (`game/test_chamber.ts`, 0.10.0): the title menu's **TEST ENEMY** list (0.12.0) calls `startTest()` the same way for every enemy, variant and boss (`testEntries()`). The chamber's state and key handler are module-level, so a second test from the title reuses the room. F3 in the game opens `enemies.html` in a new tab. the enemy editor's **Test this enemy** button opens `index.html?t=<stamp>#test=<enemy id>` (or `#test=boss:<id>` for a boss's real fight in its arena). It hands its unsaved enemies over in localStorage (`TEST_EDITS_KEY` in `config.ts`) stamped with the same `t`, so only that tab uses them. `#test` or `#lab` opens the chamber empty. The hero has every relic, sub-weapon and shield plus the Rootstone, 999 HP and 99 hearts, and nothing saves. The tested enemy starts in its spot (`spawnSpot`: the pool, the bookcase, under the slab, by the table, or the arena floor) and comes back 120 frames after it dies (`Game.testTick`). Keys: R another, [ ] previous/next enemy, 6 clear (and stop respawning), 7/8/9 relic toggles, 0 refill. The room has a pool, a pillar with a spike trench (columns 38–51: don't park the hero there in scripted tests, the spikes turn her around and make her invulnerable), and the arena with a stone slab overhead, a table and a bookcase. In the browser pane the button opens in the same tab (no popups); a normal browser opens a separate one.
- When the browser pane isn't focused, `requestAnimationFrame` may not fire at all. Step the game by hand from the console: `for (let i = 0; i < n; i++) game.tick(); game.render();`, with `game.input.script` holding the inputs. Taking a screenshot runs one real frame, so keep the script set while capturing.
- Frame-stepped scripted runs: set `game.player` with `game.loadRoom(def, x, bottom)`, then step with `input.script` (see below). This is how the expansion's gates were tested.
- `game.newGame()` from the console replays the opening cinematic.
- `game.input.script = { right: true, jump: true }` holds actions as if pressed (the cinematic uses this). Set it back to `null` to return control.
- To step frames by hand, replace the loop's tick: `const tick = game.constructor.prototype.tick.bind(game); game.tick = () => {}`, then call `tick()` as often as you like and `game.render()` to draw. Vite hot reloads undo this.
- `/editor.html` opens the map editor with a room picker and a sturdy test hero. Press F2 to test-play a room, and F2 again to edit it. `window.game.editor` is the `Editor`.
- `/enemies.html` is the enemy editor (plain DOM page, no game running).
- The browser tool can't press the middle mouse button: dispatch `PointerEvent('pointerdown'/'pointerup', { button: 1, clientX, clientY })` on `game.view.hud` (pointerup on `window`) to test middle-click pick.
- Editor saves rewrite `room_edits.json` / `enemy_edits.json`. Back them up before scripted save tests and restore them afterwards.
- Scripted checks in the browser console work well: set `game.player.x/y`, then dispatch `KeyboardEvent`s on `window` (for example `{code: 'KeyX'}` for whip).

## How it has been tested so far

- Headless runs with a mocked three.js: `three` was aliased to a Proxy-based mock module. These covered a random-input stress test in every room, an automated grapple climb, an automated chasm crossing, and an accelerated boss fight through to the victory screen.
- Scripted jumps in the browser pane to confirm every platform tier is reachable.
- Scripted runs (input.script + frame stepping) through the cinematic, the avalanche chase, the Hollow seal, and the (since removed) Reliquary relic gates.
- 2026-10-02, expansion: a crash sweep that loads every new room and runs 3 seconds in each; scripted runs over each ability gate and shortcut (listed in status.md); both new bosses pushed through phase 2 and death.
- Visual checks in the browser with real three.js.

There is no committed test suite yet. Playwright tests are a listed next step.

## play-standalone.html

An older single-file build that loads three.js from the jsDelivr CDN through an importmap. Treat it as a build artifact: regenerate it after changes only if the user still wants it, otherwise ignore it.
