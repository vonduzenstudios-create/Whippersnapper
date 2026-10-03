# Architecture

## File map

```
src/
  main.ts           entry point, plus the #tour/#boss/#hub/#relics/#test debug hooks
  config.ts         VW/VH 384x224, TILE 16, a map cell = 24x14 tiles, GRAVITY, save keys
  core/input.ts     keyboard + gamepad actions, menu edges, rebinding, localStorage binds
  core/util.ts      math, seeded rng, hash2, Box overlap
  gfx/pixel.ts      PixelCanvas software painter + SheetBuilder (all sprites drawn here)
  gfx/art_chars.ts  2D bone rig (Pose → pixels) for the heroes (HERO = Vesna, HERO_M = Anzel), zombie, skeleton, knight, drowned; bat, wisp, wyrm
  gfx/art_beasts.ts expansion creatures: wild dog, harpy, bell wraith, frost crawler; experimental: hookjaw, mire eel, gloomcaster, rot ooze, grave grub, gravehand; Library: rustling tome, restless chair (also the prop chair); the bone librarian is in art_chars.ts (a skeleton sheet with a cap)
  gfx/art_folk.ts   form-shaded zombie, skeleton, librarian, knight, drowned (one shared puppet, `figure()`), bat, wisp
  gfx/art_hunter.ts the twins as form-shaded puppets: one skeleton and set of poses, a `Look` each (Anzel's coat and short hair, Vesna's skirt, thigh boots and ponytail)
  gfx/art_hound.ts  Gnarlfang (flayed and cinder forms) as a form-shaded puppet: a Pose, IK legs, looping animations. Preview on /bosses.html
  gfx/form.ts       FormCanvas: form shading for big sprites (volumes, material ramps, contact shadows, rim light, tinted outline)
  gfx/art_wyrm.ts   the Ossuary Wyrm: skull and vertebrae drawn once per heading (32), so the boss never rotates a sprite. Sheets `wyrm` and `wyrmBody`
  gfx/art_bellmother.ts the Bell-Mother as a jointed puppet: a skeleton, a Pose, and animations that are poses computed from a clock
  gfx/art_items.ts  item icons (incl. gold, gold pile, soul shard), candles/torch/save altar, fx sheet (incl. feather, rock, shockwave, hook, hex, ice slick, icicle), fire sheet, relicfx sheet (glide wings, shield bubble, ice block), ring sheet (bell toll)
  gfx/art_portraits.ts  dialogue portraits (64x64 anime busts, `<speaker>_<face>`: vesna, anzel, pell, bellmother, wyrm, hound) and Pell's world sprite
  gfx/tiles.ts      paints a whole room's tile layer into one canvas (bricks, edges, moss, spikes, ledges)
  gfx/backdrops.ts  per-theme three.js backdrops: geometry, Lambert lighting, shaders, fog, motes
  gfx/font.ts       5x7 bitmap font drawn on the HUD canvas
  gfx/view.ts       renderer, camera, sprite ShaderMaterial, Sheet/Sprite classes
  audio/audio.ts    AudioEngine: buses, generated reverb, noise, every SFX recipe (SFX table)
  audio/music.ts    step sequencer, instruments (harpsi/organ/bass/guitar/choir/bell/drums), songs
  world/rooms.ts    prelude and castle rooms, built in code with the RB builder; THEMES, ZONES, ZONE_INFO (banner/map color/song)
  world/rooms_expansion.ts  the 26 rooms beyond the Wyrm (Undervault, Kennels, Belfry, Aqueduct, Rampart Walk)
  world/rooms_library.ts  the 12 rooms of the Ashen Library (through the Rookery's west door)
  world/room.ts     Room (tile queries, water rect) + moveBody (AABB tile collision, one-way ledges)
  game/game.ts      Game: fixed 60Hz loop, state machine, room loading, transitions, combat helpers, camera
  game/player.ts    Player: movement, double jump, slide, glide, free swim, shield bubble, whip chain, dangle, grapple pendulum, damage
  game/story.ts     every piece of story text: intro crawl, cinematic captions, signpost hints, lore stones, relic dialogs
  game/cutscene.ts  the opening cinematic (scripted input, camera pan, captions)
  game/avalanche.ts the avalanche that chases the hero through the prelude (shader-drawn snow wall)
  game/enemies.ts   Enemy base + Zombie, Bat, Knight, Skeleton, Wisp, Drowned
  game/enemies_expansion.ts  Dog, Harpy, Wraith, Crawler, and the floor Shockwave
  game/enemies_library.ts  the Rustling Tome (sleeps in a bookcase, tears loose, flaps and dives), the Restless Chair and the prop chair, the Bone Librarian (a Skeleton subclass that throws books)
  game/enemies_extra.ts  experimental (not placed yet): Hookjaw + HookChain, Devourer, Eel, Caster + HexBolt, Ooze, Grub, Moth, Gravehand
  game/enemies_spider.ts  the Gallows Spider (silk thread, web spit, falls when the thread is cut)
  game/test_chamber.ts  enemy test chambers (#test=<id>, #test=boss:<id>, #lab): the room, spawn spots, respawn, keys
  game/spawn.ts     spawnEnemy(): room letter → enemy (its own file to avoid an import loop)
  game/bosses.ts    BOSSES table: name/banner, flag, victory screen, constructor per boss id
  game/boss.ts      Wyrm: trail-following segments, pattern state machine, multi-hitbox
  game/hound.ts     Gnarlfang (Hound Pit boss)
  game/bellmother.ts  the Bell-Mother (Great Belfry boss)
  game/objects.ts   Candle, Pickup, RingAnchor, Altar, Sign (signposts + lore stones), HolyFlask/HolyFire, CrossProj, KnifeProj, EnemyShot, ShieldDrop, WhipBubble/WhipReturn/WhipDrop (the hexed whip), Lever, Merchant
  game/fx.ts        pooled sprite particles
  game/stats.ts     Hunter (persistent stats/inventory/flags, save/load)
  game/data.ts      ITEMS, ENEMY stat table (+ enemy_edits.json), ENEMY_TUNING behavior knobs, SUB_COST, xpForLevel
  game/enemy_edits.json  enemy-editor changes and variants, applied on top of the code enemies
  ui/hud.ts         the status display in three styles (classic strip, two blood-orb layouts; OPTIONS > HUD STYLE, kept in localStorage)
  ui/ui.ts          HUD, title, intro, pause menu (status/equip/items/relics/bestiary/map/controls/sound), dialogue box (drawTalk), Pell's shop (drawShop), map, end screens
  editor/editor.ts  map editor (F2 in game, or editor.html): tabbed tools, doors, world map (move/resize/create rooms), undo, save
  editor/dialog.ts  small HTML form over the canvas, for editor settings that need typing
  editor_main.ts    entry point for editor.html
  enemy_editor.ts   entry point for enemies.html: the enemy editor (DOM page)
  world/room_edits.json  editor-saved room changes and editor-made rooms, applied on top of the code rooms
vite.config.ts      also hosts the dev-only endpoints POST /__editor/save (room_edits.json) and /__editor/save-enemies (enemy_edits.json)
```

The opening cinematic is not a separate state. It runs during `play` while `Game.cutscene` is set: `Cutscene.update()` drives the hero through `Input.script` (which replaces the held actions), holds the camera, and blocks pause/map. The UI draws letterbox bars and captions instead of the HUD.

The game state machine (`GState` in game.ts) has an `edit` state for the editor. In it, `Game.tick` calls `editor.update()`, the HUD canvas shows `editor.draw()`, and live entities are cleared until test play reloads the room.

The `select` state is the character select screen between the title and the intro crawl. `Game.heroChoice` holds the pick until `newGame()` stores it as `Hunter.hero`; `Game.applyHero()` swaps `sheets.hero` between `heroSheets.vesna` and `heroSheets.anzel`.

## Rooms and their edges

Past its edges a `Room` asks `Game.tileOutside()` for the real tile of the neighboring room (`''` where there is none; `Room.tile` turns that into open sky straight above the room and `'#'` everywhere else). `Game.liveTile()` applies that room's flags: opened gates, packed snow seals, drained water and broken stones. So a doorway that is walled on the other side is a wall, and a gate shared by two rooms (same flag) opens on both sides at once.

Breakable stones stay broken: `Game.breakTile` records `roomId:x,y` in `Hunter.broken`, and `loadRoom` clears them again.

## Bosses

A room with `boss: '<id>'` (a key of `BOSSES` in `game/bosses.ts`) starts the fight once the hero is 72 px inside it. `startBoss()` walls up every open tile on the room's outer edge and remembers them in `sealedDoors`. The boss calls `game.bossIntro()` after its entrance and `game.onBossDefeated()` when its death animation ends, which reopens the doors, sets `boss_<id>` (and the boss's `flag`), awards XP, and drops the room's `i` items in from above (they stay hidden while the boss lives). Only the Wyrm shows the victory screen. Bosses implement the `Boss` interface in `game/ent.ts` (`label`, `showBar`, `gone`, `phase`, `hp`).

## Coordinates

Game logic uses room-local pixels with y pointing down. three.js uses y up, so meshes sit at `(x, -y)`. Entities store their center `(x, y)` plus half-extents `hw`/`hh`.

## Camera

It is a `PerspectiveCamera` (FOV 40) placed at `CAM_DIST` so that the z=0 plane maps exactly 1:1 to screen pixels. Sprites and tiles live at z=0, and 3D backdrops sit at negative z.

**Any `THREE.Fog` near/far value must include `+ CAM_DIST`**, or everything gets fogged out. This bug has already happened once.

## Two canvases

The WebGL canvas and a 2D HUD canvas (same 384×224 size) are stacked, both with `image-rendering: pixelated`.

## Sprites and render order

Sprites use a custom `ShaderMaterial`: frame selection by UV rect, flipX, white flash, tint, glow, opacity. It ends with `#include <colorspace_fragment>` and draws with `depthTest:false`, so layering is controlled only by `renderOrder`:

| Layer | renderOrder |
|---|---|
| backdrop | opaque |
| backdrop torch sprites | 1 |
| motes | 2 |
| furniture tiles (bookcases, tables: you walk in front of them) | 4 |
| **wyrm** (below the tiles, so walls hide it while it burrows); chairs, and a Restless Chair until it wakes | **5** |
| tiles | 6 |
| candles and altar, boss-reward light beams | 8 |
| pickups | 9 |
| enemies | 10 |
| signposts, lore stones | 7 |
| running afterimages | 11 |
| player | 12 |
| whip | 13 |
| projectiles | 14–15 |
| avalanche (covers the hero when it catches her) | 16 |
| avalanche spray particles | 17 |
| fx | 20 |
| front water | 25 |

All character art faces right; flipX mirrors it.

## Saves

localStorage key `nocturne_of_ash_save_v1` holds the serialized `Hunter`. Key bindings are stored separately (see `core/input.ts`).

`Hunter.serialize()` saves every field. When you add a field, give it a default so older saves still load: `Hunter.load()` assigns the saved keys over a fresh `Hunter`. Fields added this way so far are `flags` (world switches), `bestiary` (kills per enemy kind), `doubleJump` / `slide` (movement relics), `hero` (`'vesna'` or `'anzel'`), `broken` (smashed stones), `difficulty` (index into `DIFFICULTIES`, 0 = Normal) and `marks` (map markers as `[gx, gy]` in map-cell units, fractions allowed).

## World map screen

`UI.drawMap()` draws the map inside `MAP_AREA`, clipped. `UI.mapZoom` scales the cell size from "the whole world fits" (`mapBounds().fitCW`) up to `MAP_MAX_CW` px. The view scrolls to keep `UI.mapCur` (the cursor, in cells) in sight. `updateMapCursor()` reads the stick / d-pad / arrows for the cursor, `Input.rStickY` (gamepad axis 3) or Q / E (`subPrev` / `subNext`) for zoom, and Jump to add or remove a marker. The cursor starts on the hero each time the map opens.

World flags in use: `crypt_drained` (Flooded Crypt lever), `pass_buried` (the avalanche has sealed the prelude), `wyrm_slain` (opens the Lair's far gate into the Undervault), `servants_gate` (the lever in the Servants' Gallery opens the shortcut into the Sanctum of Rest), `boss_<id>` (that boss is dead; `Hunter.beaten(id)`, which also accepts the old `bossDefeated` for the Wyrm). `deep_door` is the Undervault's Black Door, never set yet.

## Audio

- Audio starts on the first key press or click, because browsers block audio until then.
- Music is scheduled 200 ms ahead on a 40 ms interval.
- Songs are written as one token per 16th note (`-` holds, `.` rests).
- New sounds: add a recipe to the `SFX` table in `audio/audio.ts`. New instruments or songs go in `audio/music.ts`.

## Dialogue, boss entrances and the shop (0.14.0)

- `Game.talk(scene, done?)` shows a conversation (a `SCENES` key in story.ts, or a list of `Line`s: speaker, face, text) in state `'talk'`. `UI.updateTalk` types each line out (`TALK_SPEED`), CONFIRM finishes it or moves on, CANCEL skips the rest; then `done` runs. `SPEAKERS` gives each speaker a name plate and a side: the hero stands on the left, everyone else on the right (mirrored). Portraits are frames `<speaker>_<face>` in the portraits sheet; the hero's are `vesna_*` / `anzel_*`, and a missing face falls back to `_neutral`.
- Boss entrances: `Game.startBoss` calls `bossScene()` (`bossShow`, `input.script = {}`, long invulnerability), so the hero stands still and the camera follows the boss with letterbox bars (`drawHUD` shows only the bars and the banner). Each boss's `enter` pattern shows itself off, then calls `Game.bossTalk()` (scene `boss_<id>`): a freeze frame (`freezeT`), then the talk, whose `done` hands the controls back. Mid-fight phase scenes use the same two calls (0.16.0, see player-mechanics.md, Boss scenes). Leaving the room mid-entrance (`loadRoom`) also hands them back.
- Shop: room entity `M` is `Merchant` (objects.ts), Pell. Coming within 80 px the first time plays `pell_meet` and sets the `met_pell` flag; after that, UP by him plays `pell_again`. Both end in `UI.openShop()` (state `'shop'`). Stock is `SHOP` in data.ts; `Hunter.bought` counts what's been bought, so stock doesn't come back.
- Gold and soul shards: `dropGold` (objects.ts) runs on every kill before the drop table: `GOLD_CHANCE` (55%, luck-scaled) for about half to all of the enemy's XP in gold (a pile sprite past 10), and `SHARD_CHANCE` (1.5%) for a soul shard. Candles drop 1–4 gold 12% of the time. `Hunter.gold` / `Hunter.shards`; shards aren't used yet.
- Relic toggles: `Hunter.grapple` etc. are getters: found (`_grapple`...) and not listed in `relicOff`. Old saves' `grapple: true` goes through the setters. The RELICS page calls `toggleRelic(id)`.

## Added in 0.18.0

- `world/rooms_depths.ts`: the eight new zones. `gfx/art_depths.ts`: their sprites and boss portraits. `game/boss_base.ts`, `bosses_west.ts`, `bosses_deep.ts`, `enemies_depths.ts`: the bosses and the Temple Asp. `tools/check_rooms.ts`: the map check (`npm run check:rooms`; `tools/check_rooms_ids.ts` lists the boss ids so the check needn't load three.js).
- Themes `graveyard`, `deeps`, `temple`, `gaol`, `forge`, `crystal` (tile palettes in `tiles.ts`; the last five share one cavern backdrop in `backdrops.ts`, dressed per theme). Zones `lichyard`, `deeps`, `temple`, `gaol`, `forge`, `vault`, `heights`, `archive`.
- `view.ts` `shiftColor()` moves a color in HSL space. `Game.buildEnemySheets` uses it for code variants (`EnemyStats.shift`), and for the glass copies of the hero sheets.
- Two `Music` players: `Game.music` (the zone's song) and `Game.saveMusic` (the save theme near a save room's door). `Music.setVolume` eases a player's own gain.
- Volume (0.26.0): `AudioEngine.reverbSend` (effects' echo) and `musicVerb` (music's echo) each pass through their bus volume before the shared reverb, so a slider at 0 silences the echo too. Volumes persist in localStorage (`noa_volume`).
- Save aura: `Game.findSaveDoors()` runs in `loadRoom` and lists the doorways whose far side is a `save` room; `updateSaveAura()` runs each play frame.

## Added in 0.19.0

- One file per boss: `game/boss_leviathan.ts`, `boss_gorgon.ts`, `boss_yeti.ts`, `boss_colossus.ts` (the armor and the `FurnaceHeart` inside it), `boss_mirror.ts`, `boss_archivist.ts`, on `boss_base.ts` (`BossBase`, `Target`, `Beam`, `prop()`). `bosses_west.ts` and `bosses_deep.ts` are gone. `bellmother.ts` now extends `BossBase` too.
- `gfx/art_bosses2.ts`: the redrawn boss sheets, `relief()` (edge lighting for flat shapes), and the `props` and `tallprops` sheets.
- `backdrops.ts`: after the theme's switch, a second switch on `room.def.id` adds each boss arena's own layers.
- One boss id can span two rooms: `BOSSES.colossus.make` returns the `Colossus` in `fg_forge` and the `FurnaceHeart` in `fg_heart`. The defeat flag is set only when the heart dies.

## Added in 0.27.0-0.30.0 (trial fights)

- Puppets: `gfx/puppet.ts` (rig, poses, `keyed`, `bake`, `bust` portraits) and `gfx/form.ts` (form-shaded drawing, `ramp`). Sheets that are big are built the first time they are needed with `lazySheet(key, builder)` (`gfx/lazy.ts`).
- The five reworks (`leviathan2`, `gorgon2`, `colossus2`, `yeti2`, `yeti3`): `game/boss_lockwyrm.ts`, `boss_stonebride.ts`, `boss_ironknight.ts`, `boss_rimehide.ts` (both Rimehides), art in `gfx/art_lockwyrm.ts`, `art_stonebride.ts`, `art_ironknight.ts`, `art_rimehide.ts`. Their chambers are in `world/rooms_trial.ts`, named by `BossInfo.trial`; their arena layers are in `backdrops.ts` (`trial_lock`, `trial_rotunda`, `trial_foundry`, `trial_falls`, `trial_bones`).
- The ten trial bosses: `game/boss_kit.ts` (`TrialBoss`, `Bullet`, `Chain`, `Cord`, `AX0`/`AX1`/`AMID`), one `game/boss_<id>.ts` and one `gfx/art_<id>.ts` each, chambers in `world/rooms_trials.ts` (`TRIAL_ROOMS`), and the art table `gfx/art_trials.ts` (`TRIAL_ART`) that the game, the enemy editor and `/bosses.html` all read.
- `startBossTest` (`game/test_chamber.ts`) loads a trial chamber off the map: `TRIAL_ROOMS[id] || BOSSES[id]?.trial`. None of these rooms is in `buildRooms()`.
- The camera (`Game.updateCamera`) frames the hero and the boss together, pulling back as far as it must (capped at 2.2x). `Boss.camFree` opts out, `Boss.camZoom` asks for a little extra. `Game.musicDuck` is the song's base volume, which the Bell-Mother lowers while she sings.
