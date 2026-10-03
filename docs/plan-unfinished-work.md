# Plan: finishing the paused work (written 2026-10-03)

Three features were paused part-way, each with a handoff file. Everything is committed, so
nothing can be lost; this file says what is left and in what order. Delete it once all
three handoff files are gone.

## Where everything is

| Feature | Branch / commit | Handoff | State |
|---|---|---|---|
| Boss reworks (`leviathan2`, `gorgon2`, `colossus2`, `yeti2`, `yeti3`) + Bell-Mother fix | `ashen-library`, `c65e0aa` (0.27.0) | `docs/handoff-trial-bosses.md` | Built and script-tested, never hand-played |
| Ten trial bosses (Castellan ... Rose Abbess) | `ashen-library`, `b3583b3` + `c65e0aa` | `docs/trial-bosses-handoff.md` | 6 registered, 3 written but unregistered, Abbess logic not written. Only the Castellan has been fought |
| Ten mini-bosses (Headsman ... Antlered Ghoul) | branch `claude/mini-boss-enemy-design-2c6cf1`, `c6c0109` (worktree `.claude/worktrees/mini-boss-enemy-design-2c6cf1`) | `docs/handoff-minibosses.md` (on that branch) | Art for 8 of 10, no AI, not hooked up |
| NEW GAME + (the Drowned Abbey) | `ashen-library`, `129ce82` (0.28.0) | none (finished) | Done. Follow-ups below |

All of the boss work is test-chamber / enemy-editor only. None of it is placed in a room, so
the real game is safe while it is unfinished.

## Order of work

1. **Ten trial bosses** (biggest gap; other work depends on its shared files settling).
   1. Write `src/game/boss_abbess.ts` from the design in its handoff.
   2. Register `starreader`, `miller`, `mawtoad`, `abbess` in `BOSSES` (bosses.ts) and `TRIAL_ART`
      (art_trials.ts), copying the `baron` rows.
   3. Fight all ten from TEST ENEMY (`#test=boss:<id>`): entrance hands controls back, every
      opening works, phase two at half HP, clean death.
   4. Look at every sheet on `bosses.html`; darken pale ramps.
   5. Add them to `BOSS_SHEETS` in `enemy_editor.ts`.
   6. Docs: player-mechanics table, status, AGENTS boss notes, README entry.
2. **Boss reworks**: hand-play the five fights, fix the rough spots in its handoff (Colossus
   facing at the start of `sweep`/`stomp`/`ring`, the gantry height, Ysolde's veil and `stuck`
   pose, the Boneyard skull prop, the camera zooming far out in 3-cell rooms), listen to the new
   bell sound, then the docs it lists (AGENTS.md, architecture.md, testing.md, the
   `bellmother.ts` header).
3. **Mini-bosses** (on their own branch).
   1. Art for the Ferryman and the Antlered Ghoul (specs in the handoff); polish the Brute's head.
   2. The `MiniBoss` kit and one AI class each, the `data.ts`/`spawn.ts`/editor hookup (entity
      letters `'0'`-`'9'`, lazy sheets in the enemy editor).
   3. **Before merging into `ashen-library`**: `git merge ashen-library` into the branch first and
      expect conflicts in `src/boss_preview.ts` (both sides added preview entries: keep both) and
      `.claude/launch.json` (keep every config). The handoff planned version 0.28.0, which NEW
      GAME + now uses: give the mini-bosses **0.29.0** or later.
4. **NEW GAME + follow-ups** (need the user's input first):
   - Pitch 2-3 options for each of the seven empty boss chambers (the user's boss rules apply:
     one learnable cycle, no sponges, no minions, nothing from the sky, no floating out of reach).
     The new trial bosses and mini-bosses are candidates for the abbey once they are finished.
   - Give the Ashglass Ward something to unlock (the sealed Lamp chamber is the obvious place).
   - Own music for the abbey zones (they borrow the old songs).
   - A hand playtest of the 120 rooms (jump comfort, enemy density); re-run `npm run check:abbey`
     after any change.

## Working on these safely

- One session per feature, ideally each in its own worktree, so they never edit the same
  working tree at once (that is how the three got tangled this time).
- Shared files every feature touches: `bosses.ts`, `data.ts`, `story.ts`, `test_chamber.ts`,
  `boss_preview.ts`, `enemy_editor.ts`, `backdrops.ts`, `README.md`, `package.json`. Make small
  in-place edits and re-read before editing.
- Dev-server ports already taken in `.claude/launch.json`: `dev` 5273, `dev-alt` 5274,
  `dev-trial` 5276, `dev-bosses` 5283, `dev-minis` 5291 (mini-boss branch), `dev-abbey` 5295.
- Commit when a feature reaches a safe point, and check `npm run typecheck` and `npm run build`
  pass first. Never commit `art_exchange/` (abandoned).
