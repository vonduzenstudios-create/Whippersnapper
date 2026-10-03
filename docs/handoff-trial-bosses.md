# Handoff: boss reworks (Leviathan, Ysolde, Colossus, Rimehide) and the Bell-Mother fix

Paused on 2026-10-03 at the user's request. Version in `package.json` and the README changelog: 0.27.0. Nothing is committed by this session (another session made a WIP snapshot commit, `b3583b3`, that includes some of these files; later edits are uncommitted).

## The request

Redesign the Leviathan, the medusa (Ysolde), the giant armored knight (Hollow Colossus) and the yeti (Old Rimehide): each in its own chamber, two phases, several ways to force a vulnerable state, detailed puppet sprites in the Bell-Mother style, an intro and brief dialogue, the boss always in camera. **Do not put them into the game**: the user tests them from the editor. Also: rework the Bell-Mother fight because she was always off camera and the bells could not be heard.

The user's picks: Leviathan = Flooded Well + Lock Canal mixed; Ysolde = Sunken Rotunda; Colossus = Foundry; Rimehide = build both Frozen Falls and Mammoth Boneyard.

## What is built

All five fights exist, type-check, and run. They are test-chamber only; the old fights and their rooms are untouched.

| Boss id | Class, file | Art | Chamber (`world/rooms_trial.ts`) |
|---|---|---|---|
| `leviathan2` | `LockLeviathan`, `game/boss_lockwyrm.ts` | `gfx/art_lockwyrm.ts` | `buildSunkenLock` (2 x 3, tidal) |
| `gorgon2` | `StoneBride`, `game/boss_stonebride.ts` | `gfx/art_stonebride.ts` | `buildRotunda` (2 x 2) |
| `colossus2` | `IronKnight`, `game/boss_ironknight.ts` | `gfx/art_ironknight.ts` | `buildFoundry` (3 x 2) |
| `yeti2` | `RimehideFalls`, `game/boss_rimehide.ts` | `gfx/art_rimehide.ts` | `buildFrozenFalls` (3 x 2) |
| `yeti3` | `RimehideBones`, `game/boss_rimehide.ts` | `gfx/art_rimehide.ts` | `buildBoneyard` (3 x 2) |

How to open one: TEST ENEMY on the title (tagged TRIAL), the enemy editor's TEST button (`enemies.html`, they are in the BOSSES list), or `index.html#test=boss:<id>`. Sheets are on `/bosses.html` under "Trial bosses".

Mechanics, numbers and stun routes: the "Trial fights" table in `docs/player-mechanics.md`, and the header comment of each boss file.

Shared plumbing added:

- `Game.updateCamera`: frames the hero and the boss together, zooming out as needed (all bosses). `Boss.camFree` opts out.
- `Game.musicDuck`: the song's base volume, which a boss can lower.
- `BossBase`: `chip()`, `smite()`, and the `frameAt` / `frameLoop` helpers.
- `gfx/lazy.ts`: `lazySheet()` builds a big sheet the first time it is needed (each takes 30 to 330 ms).
- `BossInfo.trial` in `game/bosses.ts` names a boss's chamber builder; `startBossTest` in `game/test_chamber.ts` uses `TRIAL_ROOMS[id] || BOSSES[id]?.trial`.
- `EnemyStats.test` keeps the five out of the bestiary.
- Scenes `boss_<id>` and `boss_<id>_phase2` in `game/story.ts` (they reuse the existing leviathan / gorgon / colossus / yeti portraits).
- `backdrops.ts`: the chambers `trial_lock`, `trial_rotunda`, `trial_foundry`, `trial_bones` share the dressing of the matching boss rooms.
- Bell-Mother (`game/bellmother.ts`): flies in the lower belfry (`roost`, `over`), bells use the new `bell` sound a fifth apart, 48 frames between notes, music ducks while she sings.

## What was verified

By script in the browser (forcing each pattern, then striking through `onHit`): every fight starts in its chamber, every stun route opens its window, both phase scenes play, each boss dies and `onBossDefeated` runs, no console errors. The Bell-Mother stayed on screen for 1,800 frames and the music ducked to 0.18 while she sang. The enemy editor lists all five.

## What is left

1. **Nobody has played any of it by hand.** Timings, damage, hitbox sizes and difficulty are first guesses. Nobody has listened to the `bell` sound.
2. The last three small edits were made after the final browser run and are untested: the well draining as the Leviathan dies, the trial chambers' borrowed backdrops, and the enemy editor entries beyond checking that they list.
3. Known rough spots worth a look:
   - Colossus: the knight does not turn to face the hero at the start of `sweep`, `stomp` or `ring` (only `walk`, `cleave`, `bash`, `scrape`, `wave` set `facing`). The gantry platform sits at his head height.
   - Colossus: "run up the wedged blade" from the pitch was not built. Wedged, he bends over so his body is in whip reach instead.
   - Ysolde: the "veil" is only down her back, so the first half's face is bare. The `stuck` pose shows the tail straight out in front.
   - Rimehide Falls: the Frozen Falls chamber has no special backdrop (plain ice theme plus the falls and pillar props).
   - Rimehide Boneyard: the skull prop only roughly covers the block under it (`rooms_trial.ts`, columns 64-67, rows 23-25).
   - Leviathan: in the second half the weight, chains and racks appear at the scene's frame 30; forcing a pattern before that (in a test script) skips the phase change.
   - The camera zooms a long way out when the fight starts with the boss across a 3-cell room (about 2.1x for the Colossus).
4. Docs not yet updated: `AGENTS.md` (a line on trial bosses, `lazySheet`, the camera), `docs/architecture.md` (new files), `docs/testing.md` (`#test=boss:<trial id>`). Done: README changelog, `docs/player-mechanics.md`, `docs/status.md`.
5. `bellmother.ts`'s header comment still describes the old heights.

## Cautions

- **Other Claude sessions are editing this same folder at the same time** ("10 unique boss designs", "New Game+ map and story", "10 mini-boss enemies for editor"). They touch `bosses.ts`, `data.ts`, `story.ts`, `test_chamber.ts`, `boss_preview.ts`, `rooms.ts`, `tiles.ts`. Re-read a shared file right before editing it and make small in-place edits. Their trial chambers are in `world/rooms_trials.ts` (plural); ours are in `world/rooms_trial.ts` (singular).
- `npm run typecheck` currently reports one error that is not from this work: `src/gfx/tiles.ts(19,43)` (another session's theme edit). `rooms_abbey.ts` also belongs to another session.
- Several source files have CRLF line endings; scripted find-and-replace must allow for both.
- A dev server entry `dev-trial` (port 5276) was added to `.claude/launch.json` for this session, because the other ports were taken.
- In the browser pane, changing only the `#hash` does not reload the game: add a different `?r=N` to get a fresh run.

## A test helper

Paste in the console after loading `index.html?r=1#test=boss:<id>`:

```js
window.T = {
  skip() { const g = game; if (g.state === 'talk') { const d = g.talkState.done; g.talkState = null; g.state = 'play'; d && d(); } },
  run(n) { const g = game; for (let i = 0; i < n; i++) { if (g.state === 'talk') this.skip(); if (g.freezeT > 0) g.freezeT = 1; g.hitstopT = 0; g.updatePlay(); } const b = g.boss; return { pat: b.pat, pt: b.pt, x: b.x, y: b.y, hp: b.hp, phase: b.phase }; },
  hit(n, id = 'body') { const g = game, b = g.boss; for (let i = 0; i < n; i++) { b.struck = b.targets().find((t) => t.id === id); if (b.struck) b.onHit(g, 10, g.player.x, false, 'whip'); this.run(12); } },
};
```

`T.run(300)` gets past the entrance; `game.boss.pick('<pattern>')` forces a pattern; `T.hit(4)` spends a window; `T.hit(2, 'pawl')` strikes a prop target by id.
