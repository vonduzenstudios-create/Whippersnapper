# Ten trial bosses: handoff (paused 2026-10-03)

The request: ten new bosses, each in its own chamber, puppet-animated in the Bell-Mother's
form-shaded style, two phases each, more than one way to force a vulnerable state, the boss
always in camera, a short intro and dialogue, **not placed in the world** (tested from TEST
ENEMY / the enemy editor / `#test=boss:<id>`).

Decisions the user made (don't re-ask):
- Roster as pitched (table below). Damage is **chip + bonus**: the whip always takes 5
  (`CHIP`), a blow in a vulnerable state takes 25, and a vulnerable state closes after 100.
- 600 HP each = **3 + 3** openings; phase two starts at half HP.
- Build all ten, then the user tests.

## Where things are

| Piece | File | State |
|---|---|---|
| Puppet rig (poses, `keyed`, `bake`, `bust` portraits) | `src/gfx/puppet.ts` | done |
| Boss kit (`TrialBoss`, `Bullet`, `Chain`, `Cord`, `AX0/AX1/AMID`) | `src/game/boss_kit.ts` | done |
| Art table (sheet, props, portrait per boss) | `src/gfx/art_trials.ts` | 6 of 10 entries |
| Chambers (all ten, 48 x 28 tiles, arena columns 8-39) | `src/world/rooms_trials.ts` | done |
| Registry rows | `src/game/bosses.ts` | 6 of 10 rows |
| Stats (all ten) | `src/game/data.ts` | done |
| Speakers and `boss_<id>` / `boss_<id>_phase2` scenes (all ten) | `src/game/story.ts` | done |
| Portraits | `src/gfx/art_portraits.ts` calls `trialPortraits()` | done (follows the art table) |
| Sprite preview | `bosses.html` lists every `TRIAL_ART` entry | done |
| Off-map chamber loading | `startBossTest` in `src/game/test_chamber.ts` | done |
| Camera keeps the boss in view | `Game.updateCamera` (written by the boss-redesign session) | done, used as is |

## The ten bosses

| # | id | Art file | Logic file | Registered | Run in game |
|---|---|---|---|---|---|
| 1 | `castellan` | art_castellan.ts | boss_castellan.ts | yes | **yes**: intro, banner, patterns, pendulum all ran |
| 2 | `marionette` | art_marionette.ts | boss_marionette.ts | yes | no (sprite seen on bosses.html) |
| 3 | `saint` | art_saint.ts | boss_saint.ts | yes | no |
| 4 | `stalker` | art_stalker.ts | boss_stalker.ts | yes | no |
| 5 | `reaper` | art_reaper.ts | boss_reaper.ts | yes | no |
| 6 | `baron` | art_baron.ts | boss_baron.ts | yes | no |
| 7 | `starreader` | art_starreader.ts | boss_starreader.ts | **no** | no |
| 8 | `miller` | art_miller.ts | boss_miller.ts | **no** | no |
| 9 | `mawtoad` | art_mawtoad.ts | boss_mawtoad.ts | **no** | no |
| 10 | `abbess` | art_abbess.ts | **not written** | **no** | no |

Everything listed type checks (`npm run typecheck` shows errors only in the Abbey session's
files). Only the Castellan has actually been fought. Bosses 2-9 are written from the design
but unplayed, so expect tuning and a few runtime bugs.

## What is left, in order

1. **Write `src/game/boss_abbess.ts`** (design below).
2. **Register 7-10**: for each, add an import and a row in `BOSSES` (bosses.ts, after `baron`)
   and an entry in `TRIAL_ART` (art_trials.ts). Copy the shape of the `baron` rows. Names and
   subtitles:
   - `starreader`: The Star-Reader, "he has already seen how this ends". Props: `buildOrreryProps` ('planet0'), `buildOrbits` ('orbits'). `new StarReader(g, x)`
   - `miller`: The Gale Miller, "the wind grinds for him". Props: `buildMillProps` ('stone'), `buildSails` ('sails'). `new Miller(g, x)`
   - `mawtoad`: The Mawtoad, "the bog swallows; so does it". Props: `buildBogProps` ('pod'). `new Mawtoad(g, x)`
   - `abbess`: The Rose Abbess, "her garden is always hungry". Props: `buildGlasshouseProps` ('heart'). `new Abbess(g, x)`
3. **Run every fight** (see Testing). Per boss check: the entrance ends and controls come
   back, each way of opening it works, the vulnerable state takes four blows, phase two's
   scene plays at half HP, death ends cleanly (props gone, no endless explosions).
4. **Look at every sheet** on `bosses.html` and fix what reads badly. Known from the two seen
   so far: ramps need a dark mid-range (the half-Lambert light sits in the top half of a
   ramp), so if a figure looks pale, darken its ramp as was done for the Castellan's steel.
5. **Enemy editor**: `BOSS_SHEETS` in `src/enemy_editor.ts` does not list the trial bosses
   yet, so they can't be picked in `enemies.html`. Add them from `TRIAL_ART` (build with
   `buildSheet(a.sheet())`). They are already in the title's TEST ENEMY list.
6. **Docs and version**: a "Trial bosses (0.27.0)" section in `docs/player-mechanics.md` (one
   row per boss: openings, phase two, numbers), a line in `docs/status.md`, the AGENTS.md
   boss notes (`TrialBoss`, `rooms_trials.ts`, chip + bonus), a README changelog entry. The
   other session may already have bumped `package.json` to 0.27.0: check before bumping.

## Design of the one unwritten fight: the Rose Abbess

Chamber `trial_abbess` (garden theme): a planter block at columns 26-29, rows 23-24, with a
one-tile crawlspace under it (row 25); a grapple ring at tile (19, 17). `hw 14, hh 28`. The
sheet has `idle`, `walk`, `lash` (12, one-shot), `cast`, `stun`; props sheet has `heart` (2),
`dead`, `wall` (2), `curtain` (whole, burnt), `patch`.

- **Briar walls** creep in from both sides (`AX0 + creep`, `AX1 - creep`, creep up to 150 px
  at about 0.11 px/frame, faster in phase two). Touching one hurts and pushes her out. They
  draw back while the Abbess is stunned. Draw each as a filled `Cord` plus a column of `wall`
  sprites at its edge.
- **Phase one, rooted** at her marker. Three root-hearts, two blows each, each withers for
  about 720 frames; all three withered at once = `stun`:
  - high: `(AMID, floorY - 150)`, reached with the ring or a double jump
  - low: in the crawlspace at about `(448, floorY - 8)`, reached by crouch-whip or slide
  - behind the `curtain` at about `(AX0 + 170, floorY - 16)`: six whip blows hack through it,
    or a `HolyFire` within 30 px burns it for ~500 frames
  Attacks: `lash` (30-frame tell, a melee box about 120 px long at chest height), `pods`
  (three lobbed seed pods that leave `patch` thorns on the floor for ~240 frames), `surge`
  (a rumble, then the walls jump 30 px inward).
- **Phase two, uprooted**: hearts are dead for good; she walks at about 0.7 px/frame. Openings:
  - whip her during the active frames of `lash`: the whips tangle (`p.grab(holder, 10, 150)`,
    a `Chain` drawn between them). Mash free in time = her briar tears off = `stun`; too slow
    = she yanks you in for a hit
  - holy water on her while she is casting `pods` (blooms open): `kind === 'holy'` in
    `onStrike` = `stun`

## How a trial boss is built (read one before writing the last)

`boss_castellan.ts` + `art_castellan.ts` are the reference pair.
- Art: a `draw(P, cell, k)` that returns `{ f, head }`; animations are pose functions baked
  with `bake(b, name, frames, poseFn, draw, loop)`; the portrait is `bust(...)` of the same
  draw at about 3.5x. Non-upright bosses (`art_stalker.ts`, `art_mawtoad.ts`) write their own
  skeleton but keep the same shape.
- Logic: extend `TrialBoss`, implement `run(g)` as one `switch (this.pat)` that moves the boss
  and sets `this.fr`. Every attack ends with `this.pick('idle')`; only `'idle'` is interrupted
  by the phase change. `enterBeats` / `shiftBeats` give the entrance and phase scene their
  music, freeze and dialogue. `stun(g, frames, message)` opens it; `bodyHit` does chip or bonus.
  Whip-able things (props and parts) go in `targets()` and are handled in `onStrike`.
- Sheets come from `lazySheet(key, builder)` (`gfx/lazy.ts`), so nothing is drawn at start-up.

## Testing

- Dev server: launch config `dev-bosses` (port 5283). A hash change alone does not reload, so
  change the query too: `http://localhost:5283/?b=1#test=boss:castellan`.
- To fast-forward from the console: `for (let i = 0; i < 300; i++) game.tick(); game.render()`.
  Set `game.boss.hp = 290` to reach phase two.
- Sprites: `http://localhost:5283/bosses.html?only=trial%20boss:%20<id>`.

## Other sessions in this folder

Two other Claude sessions were editing this working tree at the same time:
- **Boss redesign** (yeti2, yeti3, leviathan2, gorgon2, colossus2): owns `boss_rimehide.ts`,
  `art_rimehide.ts`, `lazy.ts`, `rooms_trial.ts` (singular), and has small entries in
  bosses.ts, data.ts, story.ts, test_chamber.ts, boss_preview.ts, boss_base.ts, game.ts. It
  asked that shared files only get small in-place edits. Keep its lines.
- **Drowned Abbey / NEW GAME +**: `rooms_abbey.ts`, `abbey_kit.ts`, edits to rooms.ts and
  tiles.ts. When this was paused its files did not type check and `abbey_kit.ts` had a
  circular import (`Cannot access 'RB' before initialization`) that stopped the game loading,
  which is why bosses 2-6 were never run. Check the game loads before testing.
