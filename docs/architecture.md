# Architecture

## File map

```
src/
  main.ts           entry point, plus the #tour/#boss/#hub/#relics/#lab debug hooks
  config.ts         VW/VH 384x224, TILE 16, a map cell = 24x14 tiles, GRAVITY, save keys
  core/input.ts     keyboard + gamepad actions, menu edges, rebinding, localStorage binds
  core/util.ts      math, seeded rng, hash2, Box overlap
  gfx/pixel.ts      PixelCanvas software painter + SheetBuilder (all sprites drawn here)
  gfx/art_chars.ts  2D bone rig (Pose → pixels) for the heroes (HERO = Vesna, HERO_M = Anzel), zombie, skeleton, knight, drowned; bat, wisp, wyrm
  gfx/art_beasts.ts expansion creatures: wild dog, harpy, bell wraith, frost crawler; experimental: hookjaw, mire eel, gloomcaster, rot ooze, grave grub, gravehand; Library: rustling tome, restless chair (also the prop chair); the bone librarian is in art_chars.ts (a skeleton sheet with a cap)
  gfx/art_bosses.ts expansion bosses: Gnarlfang (flayed and cinder forms), the Bell-Mother. Preview on /bosses.html
  gfx/art_items.ts  item icons, candles/torch/save altar, fx sheet (incl. feather, rock, shockwave, hook, hex), fire sheet, relicfx sheet (glide wings, shield bubble)
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
  game/enemies_extra.ts  experimental (not placed yet): Hookjaw + HookChain, Eel, Caster + HexBolt, Ooze, Grub, Gravehand
  game/lab.ts       the #lab test room for experimental relics and enemies (number-key spawner)
  game/spawn.ts     spawnEnemy(): room letter → enemy (its own file to avoid an import loop)
  game/bosses.ts    BOSSES table: name/banner, flag, victory screen, constructor per boss id
  game/boss.ts      Wyrm: trail-following segments, pattern state machine, multi-hitbox
  game/hound.ts     Gnarlfang (Hound Pit boss)
  game/bellmother.ts  the Bell-Mother (Great Belfry boss)
  game/objects.ts   Candle, Pickup, RingAnchor, Altar, Sign (signposts + lore stones), HolyFlask/HolyFire, CrossProj, EnemyShot
  game/fx.ts        pooled sprite particles
  game/stats.ts     Hunter (persistent stats/inventory/flags, save/load)
  game/data.ts      ITEMS, ENEMY stat table (+ enemy_edits.json), ENEMY_TUNING behavior knobs, SUB_COST, xpForLevel
  game/enemy_edits.json  enemy-editor changes and variants, applied on top of the code enemies
  ui/ui.ts          HUD, title, intro, pause menu (status/equip/items/bestiary/map/controls/sound), map, end screens
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
