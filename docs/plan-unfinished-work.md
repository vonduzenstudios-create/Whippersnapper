# Plan: finishing the paused work (written 2026-10-03)

Three features were paused part-way, each with a handoff file. Everything is committed, so
nothing can be lost; this file says what is left and in what order. Delete it once all
three handoff files are gone.

## Where everything is

| Feature | Branch / commit | Handoff | State |
|---|---|---|---|
| Boss reworks (`leviathan2`, `gorgon2`, `colossus2`, `yeti2`, `yeti3`) + Bell-Mother fix | `main`, 0.30.0 | none (finished; notes in `docs/status.md`) | **Done** 2026-10-03. Tuning left to the user |
| Ten trial bosses (Castellan ... Rose Abbess) | `ashen-library`, 0.29.0 | none (finished; tuning notes in `docs/status.md`) | **Done** 2026-10-03: all ten registered and script-tested. Not hand-played |
| Ten mini-bosses (Headsman ... Antlered Ghoul) | branch `claude/mini-boss-enemy-design-2c6cf1`, `c6c0109` (worktree `.claude/worktrees/mini-boss-enemy-design-2c6cf1`) | `docs/handoff-minibosses.md` (on that branch) | Art for 8 of 10, no AI, not hooked up |
| NEW GAME + (the Drowned Abbey) | `ashen-library`, `129ce82` (0.28.0) | none (finished) | Done. Follow-ups below |

All of the boss work is test-chamber / enemy-editor only. None of it is placed in a room, so
the real game is safe while it is unfinished.

## Order of work

1. ~~**Ten trial bosses**~~ done in 0.29.0 (see the README entry and `docs/status.md`).
2. ~~**Boss reworks**~~ done in 0.30.0.
3. **Mini-bosses** (on their own branch).
   1. Art for the Ferryman and the Antlered Ghoul (specs in the handoff); polish the Brute's head.
   2. The `MiniBoss` kit and one AI class each, the `data.ts`/`spawn.ts`/editor hookup (entity
      letters `'0'`-`'9'`, lazy sheets in the enemy editor).
   3. **Before merging into `ashen-library`**: `git merge ashen-library` into the branch first and
      expect conflicts in `src/boss_preview.ts` (both sides added preview entries: keep both) and
      `.claude/launch.json` (keep every config). The handoff planned version 0.28.0, which NEW
      GAME + now uses: give the mini-bosses **0.30.0** or later (the trial bosses took 0.29.0).
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
  pass first.
