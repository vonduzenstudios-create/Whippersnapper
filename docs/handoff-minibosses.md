# Handoff: ten mini-bosses (paused 2026-10-03)

Work in progress. Read this first, then `AGENTS.md`. Delete this file once the feature is done and
the changelog and docs carry the result.

## Where things stand

- **Branch / worktree:** `claude/mini-boss-enemy-design-2c6cf1`, in `.claude/worktrees/mini-boss-enemy-design-2c6cf1`.
  It sits on commit `b3583b3` ("WIP: 0.27.0 puppet art and trial bosses (snapshot)"), which was committed on
  `ashen-library` in the main checkout so this branch would have the puppet art. `art_exchange/` was left out
  on purpose (abandoned).
- **Nothing here is committed yet.** Uncommitted: `src/gfx/minis/*`, `tools/render_sheets.ts`, small edits
  to `src/boss_preview.ts`, `.claude/launch.json` (a `dev-minis` config on port 5291), `.gitignore`
  (`tools/out/`), and `package-lock.json` (rewritten by `npm install`, check before committing).
- `npm run typecheck` passes.
- **Art:** 8 of 10 puppets drawn (first pass). **AI / game hookup:** not started.

## What the user asked for, and the answers they gave

> Ten new unique mini-bosses, put into the enemy editor but not into the game (no room places them).
> The new puppet art style, impressive and detailed, with real animation. Bigger and more imposing than
> normal monsters, unique attacks, no phases, no complicated environment interactions. Some humanoid.
> Monsters that fit a gothic castle.

Answers to the clarifying questions:
- **Depth:** full AI that can be tested. Art, stats, bestiary text, working AI, tuning knobs in the
  enemy editor (`num()`/`can()`), fightable from TEST ENEMY. Not placed in any room.
- **Scale:** varies per creature. Man-sized-plus for the Duchess, Warden and Gargoyle; big for the Bull,
  Brute and Headsman. HP scales with size.
- **Roster:** keep the 10 as pitched (below).
- Standing preferences from memory: ask clarifying questions; no damage sponges, no minions, nothing
  raining from the sky, no two enemies sharing the same trick.

Two tweaks were made so no two creatures share a trick (the user hasn't been told about these in
detail, so mention them):
- The **Lycan** gets a shackle-chain lash instead of a howl (the Ghoul already screams).
- The **Warden's** smoke becomes a lingering choke cloud instead of a vanish (the Duchess already teleports).

## The roster

| id | Name | Art file | Art status | Size (px tall, hero = 36) |
|---|---|---|---|---|
| `headsman` | The Headsman | `src/gfx/minis/headsman.ts` | done, good | ~58 |
| `lycan` | Moonrot Lycan | `lycan.ts` | done, OK (tail looks a little raccoon-striped) | ~52 hunched |
| `unhelmed` | The Unhelmed | `unhelmed.ts` | done, good | ~56 |
| `bull` | Ossified Bull | `bull.ts` | done, OK (idle: the maul arm hides the face) | ~80 with horns |
| `gargoyle` | Rookery Gargoyle | `gargoyle.ts` | done, good | ~50 |
| `warden` | Plague Warden | `warden.ts` | done, very good | ~45 |
| `duchess` | The Sanguine Duchess | `duchess.ts` | done, very good | ~42 |
| `brute` | Stitchwork Brute | `brute.ts` | done, needs polish: the head and face read as a blob, a flatter brow and a clearer jaw would help | ~70 |
| `ferryman` | The Ferryman | **not started** | | ~58 planned |
| `ghoul` | Antlered Ghoul | **not started** | | ~52 hunched / ~64 standing |

Each art file exports `build<Name>Sheet()` (body, faces right, anchor = floor line, so the AI's `feet`
is 0) and `build<Name>Props()` (projectiles). They're registered in `src/gfx/minis/index.ts` (`MINI_ART`,
`miniSheet(id)`, `miniProps(id)`, both lazy). `src/gfx/minis/common.ts` holds the shared materials and helpers.

Channels per creature (pose keys `a`/`b`/`c`, plus the extras noted) are documented at the top of each art file.

### Animations drawn so far (what the AI can use)

- **headsman:** `idle walk chop(1-shot) stuck yank(1) hurl(1) reel barge`. Props: `cage`. `drawCage()` is exported.
- **lycan:** `idle prowl run crouch leap rake(1) lash(1) wall land(1)`. Props: `link`.
- **unhelmed:** `idle walk bowl(1) slash(1) blind catch(1) stagger`. Props: `head` (8-frame roll). `drawHead()` is exported.
- **bull:** `idle walk paw charge crash slam(1) toss(1)`. Props: `shard`.
- **gargoyle:** `idle walk crouch leap dive stuck wake(1) stab(1)`, each also as `_1` and `_2` (crack levels;
  pick by HP: >66% none, >33% `_1`, else `_2`). Props: `chip rubble`.
- **warden:** `idle walk lob(1) saw(1) vent`. Props: `vial puddle`. `drawVial()` is exported.
- **duchess:** `idle walk crack(1) spikes(1) burst(1) reform(1)`. Props: `spike` (anchor at the bottom).
- **brute:** `idle walk punch(1) rip(1) hold toss(1) grab(1) lift slam(1) reel`. Props: `block arc`.

## Remaining art: specs

**The Ferryman** (humanoid, k ~1.35, gaunt and tall):
- Look: hooded boatman in a rotted grey-green robe, gaunt grey hands, coins over his eyes (two gold dots
  in the hood's shadow), a long punt-oar with a lantern hanging from its top (cold green flame), coin purse.
- Anims: `idle` (leaning on the oar, lantern swaying), `walk` (punting: plants the oar and pushes),
  `sweep` (1-shot: a wide oar arc that also covers above him), `swing` (1-shot: the lantern swung,
  leaving flames), `toll` (palm out, a coin glints), `hit`.
- Props: `flame` (a drifting will-o flame, 4 frames), `coin`.

**The Antlered Ghoul** (beast-humanoid, k ~1.5):
- Look: starved, grey-white skin over ribs, very long arms with hooked claws, a deer-skull face with
  antlers (branching strokes), black eye pits with pinprick light, a jaw that unhinges.
- Anims: `idle` (hunched, twitching head), `skitter` (low on all fours), `crouch`, `leap`,
  `rake` (1-shot, 3 hits), `scream` (rears up, jaw wide), `land`.
- Props: none needed (the scream can be a ring of `shock` fx).

## AI design (not started): one class per creature

Plan: `src/game/minis/kit.ts` with `class MiniBoss extends Enemy`:
- `heavy = true` (no knockback), `feet = 0`
- a state machine (`st`, `stT`, `set()`), `loop(anim, per)` and `once(anim, dur)` frame pickers
- `hit(box, dmg, type)` (copy `TrialBoss.hit` from `game/boss_kit.ts`)
- a bigger death burst plus a screen shake
- optionally a slim HP bar over its head once hurt (via `g.overlays`; ask the user)

Reuse `Bullet` and `Chain` from `game/boss_kit.ts` for projectiles and chains (`Bullet` takes
`sheet: miniProps(id), anim`). `Player.grab(holder, presses, time, bite)` handles grabs (`Holder.released(ok)`).
`Player.hex(frames)` slows, `Player.poison(frames, dmg)` poisons, and `g.hunter.hearts` is the hearts count.

| id | Attacks (each telegraphed by its wind-up animation) | Knobs (`ENEMY_TUNING`) |
|---|---|---|
| headsman | chop: the axe sticks in the floor for ~1 s, a punish window. Cage hurl on a chain (`Chain` + `cage` bullet); if it catches her, `grab()` and reel her in, then chop. Shoulder barge (a lunge). | speed, sight, cooldown, cage, barge, mash |
| lycan | gallops on all fours, then a 2-hit `rake`. Leaps at her (`crouch`, `leap`); if the leap hits a wall, clings (`wall`) and kicks back off it. Chain `lash`, mid range. | speed, sight, cooldown, leap, lash |
| unhelmed | `bowl`: the head rolls along the floor (bullet, bounces off walls, comes back). While it's gone he's `blind`: he swings toward where she last made noise (moving, jumping, attacking); standing still keeps him lost. Whipping the rolling head sends it back fast and `stagger`s him (an opening). `slash` up close. | speed, sight, cooldown, bowl |
| bull | `paw`, then `charge` across the room; hitting a wall means `crash`, dazed ~90 frames. `slam`: bone shards burst out of the floor in a fan (`shard` bullets with gravity, not from the sky). `toss` uppercut when she's close in front. | speed, sight, cooldown, charge, slam, toss |
| gargoyle | `crouch`, `leap` toward her, turns to stone at the apex (`dive`, invulnerable: clank, no damage), crashes down sending rubble/chips sideways along the floor, `stuck` in stone ~40 frames (still invulnerable), then `wake` and vulnerable. Tail `stab` up close or when she's behind it. | speed, sight, cooldown, dive, stab |
| warden | keeps his distance, `lob`s vials that shatter into poison `puddle`s (~4 s; poison on touch). `saw` flurry up close (3 hits). `vent`: a lingering choke cloud around him that poisons her if she stays in it. | speed, sight, cooldown, vials, vent, poisonTime |
| duchess | blood `crack` lash at mid range (the hitbox follows the drawn lash, about 90 px). `burst` into bats (use the bat sheet), re-form behind her with `reform`, then lash. `spikes`: a line of blood `spike`s rising toward her one after another. | speed, sight, cooldown, lash, bats, spikes |
| brute | `punch` the floor: a lightning `arc` crawls along the floor toward her. `rip`, `hold`, `toss` a masonry `block` that breaks into rocks on landing. `grab` lunge: if it catches her, `grab(bite)`, `lift` her over its head (pin her to its hand), then `slam` for heavy damage unless she mashes free (then it `reel`s, an opening). | speed, sight, cooldown, arc, throw, grab, mash |
| ferryman | `sweep` oar arc. `swing` the lantern: 3 slow drifting flames home in for ~4 s and can be whipped to pop. Every hit he lands steals 3 hearts (coins fly to him) and heals him a little. | speed, sight, cooldown, flames, toll |
| ghoul | `skitter`s erratically, `leap`s at her, `rake` combo (3 hits stepping in). `scream`: slows her (`p.hex(180)`) within ~120 px, with a screen shake. | speed, sight, cooldown, leap, scream |

HP ballpark (normal enemies top out at the Devourer's 110): man-sized 150-180, big 220-280, atk 20-26,
def 2-6 (the Gargoyle highest).

## Hooking them up (the plan)

1. **data.ts:** add `BASE_ENEMY` entries (name, desc, drops, `portrait: 'idle'`, `test: true` keeps them
   out of the bestiary count) and `ENEMY_TUNING` knobs per id. `BASE_ENEMIES` comes from `ENEMY_TUNING`.
2. **Entity letters:** almost every lowercase letter is taken (only `j` is free). Entity ids are strings,
   so use the digits `'0'`-`'9'` (the map editor draws `e.t` as text, which works). Add them to `ENEMY_LETTER`.
3. **spawn.ts:** a `case` per id, spawning the classes from `src/game/minis/`.
4. **Sheets:** `Game.enemySheet()` falls back to `trialSheet(kind)`; add `|| miniSheet(kind)`. Also, in
   `Game.buildEnemySheets()`, look the base sheet up via `miniSheet()` when `this.sheets[base]` is missing,
   or variants of mini-bosses will have no sheet.
5. **enemy_editor.ts:** `BASE_SHEETS` is built eagerly and `PALETTES` loops over all of it. Make the
   mini-boss entries lazy (getters, or a `sheetOf(base)` helper) so the editor doesn't draw 10 big
   sheets at load.
6. **Test chamber** (`game/test_chamber.ts`): the default `spawnSpot` is under a slab with 112 px of
   headroom (fine). Check the Bull and Brute fit, and add a spot if not.
7. **Map editor:** they will appear in its ENEMIES tab automatically. Maybe add an `ENEMY_HINT` saying "(MINI-BOSS)".
8. **Version:** this is a batch, so bump MINOR (`package.json` is 0.26.0 here, but 0.27.0 is in progress
   on `ashen-library`, so likely 0.28.0; the art comments already say 0.28.0). Add a README changelog
   entry, and update `docs/status.md` and `docs/player-mechanics.md` (bestiary section).

## Tools

- **`tools/render_sheets.ts`** renders any `MINI_ART` sheet (or `castellan`, the quality reference) to a
  PNG contact sheet with a hero-height bar. Usage is in its header comment. This was the main art loop:
  render, view the PNG, adjust the poses, repeat. Much faster than the browser.
- `bosses.html?only=<id>` shows the animated sheets in the dev server (`dev-minis` launch config, port 5291).

## Things learned (puppet pitfalls)

- Pose angles: `an1`/`af1` are measured in the body's frame (added to `lean`), legs on screen.
  `head` is added to `lean`, so a leaning creature needs a negative `head` to keep its face forward.
- Things drawn after the torso sit on top. A big shoulder ball hides the head (the Brute); draw the head last if needed.
- Custom pose keys (`wing`, `tail`, `stone`) must be in the base pose, or `keyed()` won't interpolate them.
- `robe()` hides the legs; keep it short (`len` ~9) for an apron.
- Weapons: `along(d, side)` from the hand. Positive `side` is the leading edge for a swing toward
  increasing angle (clockwise on screen).
- Wide sheets: lashes and chains are drawn in the sprite, so cells must be wide (the Duchess is 196 px).
