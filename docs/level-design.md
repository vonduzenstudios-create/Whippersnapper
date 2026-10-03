# Level design

## Room rules

- Each room is a whole number of map cells. A cell is 24×14 tiles (16 px tiles). `(gx, gy)` is the room's position on the global cell grid.
- Doors sit on tile rows 8–11 of a cell, with the floor at rows 12–13.
- Vertical holes use tile columns 10–13.
- Adjoining rooms must line up on these.
- Past its edge, a room sees the neighboring room's actual tile there (with that room's gates, seals, water and broken stones applied). Where there is no room it's solid, except straight above the room, which is open sky (`Game.tileOutside` returns `''` and `Room.tile` decides). A doorway walled on the other side is a wall. Outdoors there is no invisible ceiling: the hero can fly up out of view and fall back.
- The player transitions rooms when their center crosses the boundary.
- New rooms go in `buildBaseRooms()` in `src/world/rooms.ts`, or are made with NEW ROOM in the map editor (they then live only in `room_edits.json`).

## Sky cells (outdoor rooms)

Outdoor rooms where you can jump high get one extra map cell of open sky on top: lay out the room as usual, then call `b.sky()` (it prepends 14 rows, moves the entities down, and `build()` puts the room one cell higher). Columns that are solid in the old top row (cliffs, towers) keep rising through the sky cell. After `sky()`, rows 0-13 are the sky cell.

Each sky cell has a small secret, defined in `SKY_SECRETS` in `rooms.ts`: a chain of ledges up from the room's highest spot (each step at most 4 rows up and next to the last, so a walking jump makes it), usually starting with a double jump, leading to a minor upgrade, a potion or a cracked-wall pocket. The rooms whose layout lives in `room_edits.json` (Drawbridge, Slope, Pilgrim's Road) had the same secrets written into the JSON.

| Room | Sky secret |
|---|---|
| Shattered Slope | two ledges up from the dead-end bridge, a potion (during the avalanche chase) |
| Pilgrim's Road | double jump from the candle ledge, then a rock outcrop: Might Seed |
| Ravenwatch Cliffs | double jump from the altar ledge, then a ledge: Ward Seed |
| Moonlit Drawbridge | double jump from the gate steps to a ledge, whip the cracked facade stones: Heart Max Up |
| Windswept Spire | two ledges up from the gable-top prize: Ward Seed |
| Rampart Walk | two ledges up from the merlon ledge: Might Seed |

Hollowcrown Ridge has no sky cell: no jump reaches its top, and it is sealed off after the chase.

## Tides (tidal rooms)

`RoomDef.tide = { low, high }` (tile rows of the water surface). The room has no `~` tiles; its water fills the inside of the room from the floor (`H - 2 tiles`) up to a surface that eases between `low` and `high` on a fixed cycle (`TIDE_PERIOD` = 900 frames in game.ts, about 3-4 s resting at each end). The cycle follows the play clock (`Hunter.time`), so it keeps its rhythm across visits. `Game.updateTide()` moves `room.water` and the water's front layer, and plays the `tide` rumble with a message when the water starts to move.

At high tide the hero can swim to the surface and leap out about 67 px (see player-mechanics.md), which reaches places a jump can't:

- Ice Conduit (tide rows 12 → 7): a shelf at row 4, eight rows over the floor and far from the ice block. Potion + Might Seed.
- Frozen Cistern (tide rows 24 → 15): a sealed tank under the bridge (walls x 30/39, roof row 14, floor row 18 with a hole at x 34-35). Its floor is 8 rows over the bottom, too high for one jump. Ward Seed. The only climb back to the bridge without the tide is the west ledge chain.

The double jump also reaches both, on purpose.

## Map editor and room_edits.json

- Press **F2** during play to edit the current room. Press F2 again to test-play from the ghost hero's spot. `editor.html` opens the same editor with a room picker and a test hero (9999 HP, grapple, both sub-weapons).
- The tool bar has tabs: MAP TILES, DOORS, ENEMIES (including enemy-editor variants), OBJECTS (candle, ring, altar, sign, lever), ITEMS. Middle-click a tile or entity to pick it as the current tool (a middle drag still pans). Double-click a sign, lever, item or enemy to set its text key, flag, item or variant.
- The DOOR tool opens the doorway on the nearest outer edge of the clicked cell, at the standard spot (rows 8–11, or columns 10–13 for holes), digging through walls up to 8 tiles thick. Right-click walls it up. Where a room touches a neighbor, the editor marks each doorway spot on the edge: green = open on both sides, red = open on one side only, dim = both walled.
- **MAP** (or M) opens the world map: drag a room to move it, drag an edge of the selected room to resize it (max 8×8 cells), double-click to edit it. Rooms can't overlap. NEW ROOM asks for a name, setting (theme), zone (music/map color/banner) and size, then you click to place it. New rooms start as a closed shell; cut doors with the DOOR tool on both sides. Only editor-made rooms can be deleted. Boss rooms can be resized too: a fight walls up whatever doorways the room has.
- In the room view, the margin just outside each edge is a grow strip: click it to add a cell on that side, right-click twice to remove the outer cells on that side. A finished (green) doorway gets a gold arrow in the margin; click it to jump to that room, with the ghost hero and view at the matching door.
- Undo snapshots include a room's position and size, so Ctrl+Z steps back through resizes (in both views). It refuses if the old size would now overlap another room.
- Resizing keeps the tiles where they are in the world. New space is open with walls round the new outer edge, and entities that fall outside are dropped (locked ones are pulled back inside).
- **PROPS** edits a room's name, setting, zone, save-room flag and gate/drain/seal flags.
- **SAVE** (or Ctrl+S) posts to a dev-only endpoint in `vite.config.ts`, which writes `src/world/room_edits.json`. It saves every room that differs from its code version: tiles, entities, and only the settings that differ (position, size, theme...). Rooms made in the editor are saved with all their settings, and `applyEdits()` adds them after the code rooms. `buildRooms()` = `buildBaseRooms()` + that file.
- The code layouts in `rooms.ts` are the originals. If a room is in `room_edits.json`, **the JSON wins**, so check it before editing a room in code. Delete the room's entry (or use RESET in the editor) to go back to the code version.
- Entities `P R W` (start, relic, boss) can be moved but not deleted in the editor. Levers (`L`) need a second right-click to delete.
- In a production build there is no save endpoint, so SAVE copies the JSON to the clipboard instead.

## Enemy editor (enemies.html)

- Edit a base enemy's name, bestiary text, stats, behavior knobs, drops and colors, or **make a variant** of it. A variant reuses its base enemy's AI and art. Details are in [player-mechanics.md](player-mechanics.md).
- Colors: each swatch is one color of the original sprite (most-used first). Change single colors, or shift them all by hue/saturation/brightness.
- SAVE writes `src/game/enemy_edits.json`. Renaming a variant's id also updates rooms in `room_edits.json` that place it. Save the map editor first if it has unsaved changes using the old id, or they will overwrite that fix. Reload the game or map editor after saving to see the changes.

## Legend

Tiles:

| Char | Meaning |
|---|---|
| `#` | solid |
| `B` | breakable |
| `H` | wood plank |
| `=` | one-way ledge |
| `/` `\` | ramp rising to the right / left, one tile every two (lay them in pairs, solid under them) |
| `K` | bookcase: walk through it, stand on its top (tomes sleep in it) |
| `D` | table: walk through it, stand on its top |
| `^` | spikes |
| `~` | water |
| `G` | gate (solid until the room's `gateFlag` is set) |
| `N` | snow seal (open until the room's `sealFlag` is set, then packed snow) |

Entities:

| Char | Meaning |
|---|---|
| `P` | player start |
| `C` | candle |
| `S` | save altar |
| `O` | grapple ring |
| `i` | item (arg = item id) |
| `R` | relic |
| `L` | lever (arg = the flag it sets) |
| `T` | signpost or lore stone (arg = a `HINTS` or `LORE` key in `game/story.ts`) |
| `W` | boss marker (the room's `boss` id picks the boss; Gnarlfang ignores the marker and starts across from you) |
| `z b k s w d` | enemies: zombie, bat, knight, skeleton, wisp, drowned (optional arg = an enemy-editor variant id of that enemy) |
| `g y r c` | expansion enemies: wild dog, harpy, bell wraith, frost crawler (a crawler crawls round walls and ceilings on its own; placed right under a ceiling it starts there) |
| `t` | Rustling Tome (Library). Place it on a `K` (bookcase) tile: the tome sleeps inside it until you pass |
| `a` | Restless Chair (Library): looks like a prop chair until you come close |
| `l` | Bone Librarian (Library): put it on the floor in front of a bookcase; it shelves books with its back turned until you come close |
| `n` | chair (scenery). Faces a table within 3 tiles on its row |
| `M` | Pell, the merchant (the Reader's Nook): introduces himself the first time, then UP opens his shop |
| `v` | Devourer: a mouth on tentacles (a stronger Hookjaw) whose tongue drags you into its jaws (see player-mechanics.md) |
| `f` | Grave Moth: a flying enemy (grubs left on the surface also hatch them, three at a time). It bursts on touch and poisons you |
| `p` | Gallows Spider: place it anywhere under a ceiling; it finds the ceiling above and hangs from it. Leave it a clear drop below |

In a boss room, items (`i`) are the reward: they stay hidden until the boss dies, then float down into place.

## Movement numbers the layouts depend on

- The jump reaches about 75 px. Keep platform steps at 4 tiles or less vertically.
- A walking jump covers about 115 px horizontally. With the double-tap run (1.5× speed since 0.2.0) it is about 173 px, so a gap meant to be impassable must be wider than that. (Measured on flat ground from takeoff to landing: 73 px walking, 100 px running.)
- Water halves gravity. Jump in water swims up, and at the surface it leaps out about 67 px.
- In the air the player keeps momentum above walking speed, which matters after grapple launches.
- With the Raven Mantle, jump + double jump reaches about 140 px. Double-jump gates are 6-7 rows (96-112 px) with nothing in between.
- A ceiling in row 0 means the highest place you can stand is row 4 (standing is 36 px tall). Rooms with no top row (outdoors) are open to the sky; there is no invisible ceiling any more.
- Climbing up through a ceiling hole: a one-way ledge 4 rows down (6 wide) and one 2 rows down exactly under the hole (`underHole()` in rooms_expansion.ts). Jumping from the lower one carries you into the room above, which catches you on the floor beside its hole. Falling down the hole lands you on the upper ledge.
- With the Frostrunner Greaves, the slide is 14 px tall and fits a one-tile (16 px) gap. Without them, crouching is 24 px.
- Grapple, slide and double-jump numbers are in [player-mechanics.md](player-mechanics.md).

## Level map (global cell grid)

```
Prelude (gy 2, zone 'pass'; rooms marked [sky] also have a sky cell at gy 1):
Hollowcrown Ridge (-10..-8) → Shattered Slope (-7..-5) [sky] → Frostbite Hollow (-4) → Pilgrim's Road (-3..-2) [sky] → Ravenwatch Cliffs (-1, save) [sky] → Drawbridge
  The cinematic plays on the Ridge. The avalanche chases through Ridge and Slope and buries the Hollow's left door.

Drawbridge (0-2, 1-2) [sky] → Courtyard (3-4,2) → Great Hall (5-7,2) → Stairwell (8, 0-3)
Stairwell → Armory (9-10,0), dead end with the Iron Chain behind a breakable wall
Stairwell → Save room (9,2)
Stairwell bottom hole → Ossuary Shaft (8, 4-5)
Shaft → left: Corridor of Bones (5-7,5) → Flooded Crypt (3-4, 5-6) → Gallery of Wisps (5-7,6) → Shrine (8,6) [Chain Grapple]
Gallery of Wisps ring + jump up through the one-way grate → Corridor of Bones (the shortcut back)
Shaft → right: The Chasm (9-10,5) [grapple rings over spikes] → Antechamber save (11,5) → Lair (12-13, 4-5) [boss]
Lair right door (gate, opens when the Wyrm dies) → the Undervault

The Undervault (hub, zone 'undervault'):
  The Undervault (14-16, 4-5) [save, Ilsabet's letter, the sealed Black Door] → hole up → Warden's Stair (15, 0-3)
  Undervault east → Root Cellar (17-18,4) → Old Well (19, 3-7)
  Warden's Stair: left → Servants' Gallery (10-14,2) → [lever opens the gate] → Sanctum of Rest (9,2): shortcut to the old castle
                  top left → Bellfoot Court; right → Kennel Gate

Kennel Yards (zone 'kennels'):
  Kennel Gate (16-18,1) → Briar Maze (19-20, 1-2) → Kennel Yards (21-23,2) → Hound Pit (24-25, 1-2) [boss Gnarlfang: Frostrunner Greaves]
  Kennel Yards hole up → Groundskeeper's Rest (21,1) [save]
  Hound Pit → slide tunnel → Huntsman's Lodge (26-27,2) [Hound Fang] → hole down → Rime Stair (27, 3-5) → Aqueduct Span
  Briar Maze hole down → Old Well (back up needs the double jump)

The Belfry (zone 'belfry'):
  Old Armory (9-10,0) cracked wall ↔ Bellfoot Court (11-14,0) ↔ Warden's Stair
  Bellfoot hole up → The Ringing Climb (12, -4..-1) [grapple rings] → Harpy Rookery (10-11,-2) [Bell Charm, double jump]
                                                                     → Bellwright's Loft (13-14,-3) [save]
                                                                     → The Great Belfry (13-14, -5..-4) [boss Bell-Mother: Raven Mantle]
  Great Belfry high east door → Windswept Spire (15-17, -6..-5) [sky] → hole → Raven's Drop (17, -4..0) [slide pocket] → Kennel Gate
    (one way down; climbing back up needs the double jump)

Rimeworks Aqueduct (zone 'aqueduct'):
  Old Well → Frozen Cistern (20-22, 6-7) [tidal; Raven Mail, slide pocket; Ward Seed in the tank] → Pump House (23,6) [save] → Aqueduct Span (24-27,6)
  Span high end [double jump]: Rime Chain, hole up to the Rime Stair
  Old Well bottom → Frost Sluice (15-18,7) [slide crawlspace] → Ice Conduit (12-14,7) [tidal; high shelf] → Forgotten Drain (8-11,7)
  Forgotten Drain hole up ↔ Shrine of the Chain's cracked floor (old catacombs)

The Ashen Library (zone 'library', theme 'library'; 12 rooms in `src/world/rooms_library.ts`, entered by the Harpy Rookery's new west door):
  Harpy Rookery (10-11,-2) west door → Lending Hall (8-9,-2) → Card Catalogue (7,-2)
  Card Catalogue left door → The Grand Staircase (3-6, -4..-2): a flight climbing right to left, two steps wide and one high, a landing every 9 steps
  Card Catalogue grate (Down + Jump) ↔ Undercroft (2-7,-1) hole up: the shortcut back
  Card Catalogue hole up → Reader's Nook (7,-3) [save]
  Grand Staircase top landing → Upper Gallery (0-2,-4) → Scriptorium (-2..-1,-4) → Inkwell Shaft (-3, -4..-1) → Archivist's Study (-5..-4,-4) [save, Archivist's Seal]
  Inkwell Shaft bottom door → Lower Stacks (-2..1,-1) → Undercroft (2-7,-1) [vault behind one cracked column: Ward Seed]
  Upper Gallery hole up (through a grate) → Clerk's Mezzanine (0-2,-5) [Might Seed on a ledge only a double jump reaches] → Great Reading Room (3-6,-6..-5) [Life Max Up, Elixir]
  Grand Staircase top hole up ↔ Great Reading Room grate (the way back down)

Old castle secret: Rampart Walk (3-4, 0-1) [sky], above the Ruined Courtyard. Double jump to the courtyard's high ledge, then jump up onto the walkway.
```

57 code rooms plus the editor-made `flooded_cave`, 199 map cells (14 of them sky cells), counting the 12-room Library (48 cells). The Chain Grapple gates the Wyrm. After it, either boss can be fought first: the Kennels need nothing, the Belfry needs the grapple. Each boss drops one movement relic, and the Aqueduct, the Rookery, the Rampart and several pockets need one or both.

Gates and rewards to come back for:

| Where | Needs | Reward |
|---|---|---|
| Servants' Gallery high shelf | double jump | Life Max Up |
| Harpy Rookery high nest | double jump | Bell Charm |
| Windswept Spire gable | double jump | Life Max Up |
| Raven's Drop wall pocket | slide | Heart Max Up |
| Hound Pit → Huntsman's Lodge | slide | Hound Fang, the way down to the Aqueduct |
| Frozen Cistern wall pocket | slide | Raven Mail |
| Frost Sluice crawlspace | slide | the loop to the old catacombs |
| Aqueduct Span high end | double jump | Rime Chain |
| Old Well top / Raven's Drop climb | double jump | shortcuts back up |
| Rampart Walk | double jump | Heart Max Up |
| Armory wall / Shrine floor | whip the cracked stones | hidden ways in |
| Sky cells (Pilgrim's Road, Cliffs, Drawbridge) | double jump | Might Seed, Ward Seed, Heart Max Up |
| Ice Conduit shelf / Cistern tank | high tide (swim + leap) or double jump | Might Seed + potion, Ward Seed |

## The Ashen Library

- Theme `library`: tan-gold sandstone walls, a green carpet runner on the floors, oak shelf boards for the one-way ledges, and a backdrop of towering bookshelves between sandstone piers, chandeliers and green desk lamps.
- Furniture: bookcases (`K`, painted by `paintBookcase`) and tables (`D`, `paintTable`) are walk-through. Only the top row is solid, from above, like a one-way ledge (Down + Jump drops through it too). They're painted on a separate layer (renderOrder 4) behind the hero and enemies. Tables are one tile high and carry random clutter (books, an open folio, an inkwell). Put candles on a table by placing them on the row above it.
- Chairs: `n` is a prop, `a` a Restless Chair. Both face a table within 3 tiles on their row (`chairFacing`), and both draw at renderOrder 5 until the enemy wakes. `tables()` in rooms_library.ts places a table with a chair at each end.
- Bookcases are the shelves the Rustling Tomes sleep in. Put each `t` entity on a tile inside a `K` block. Cases standing on the floor, on the Grand Staircase's landings, and hanging from the ceiling all work.
- Climbing through a ceiling hole needs a stepping ledge when the floor is more than 4 rows under the lower ledge (Card Catalogue: the cabinet; Upper Gallery, Grand Staircase and Undercroft: a row-8 ledge). Floors over a hole (Catalogue, Mezzanine, Reading Room) have a one-way grate (`=`), so the hole is not in your way. Down + Jump drops through it, and you jump up through it from below.
- The Grand Staircase is a ramp of `\` tiles (drawn as small steps, 8 px deep and 4 high) built from per-column surface rows (see the room's code): 28 steps of 2 columns each, with landings of 10 columns after steps 9 and 18, and a 7-wide top landing. If you change the numbers, the door rows (R door rows 36-39 over the floor, L door rows 8-11 over the top landing, hole at x 10-13) must still match.

## Prelude: tutorial signs and the avalanche

- Signposts (`T` + a `HINTS` key) show a hint built from the player's current bindings while she is within about 2 tiles. Keep signs at least 4 tiles apart so their hints don't fight.
- Lore stones (`T` + a `LORE` key) show "UP: READ" and open a dialog.
- `RoomDef.chase`: `'run'` rooms have an avalanche while `CHASE_FLAG` (`pass_buried`) is unset. If it catches her she loses 10 HP (never the last one) and the room restarts from where she entered. `'end'` rooms (the Hollow) have one that crashes into the left door, sets the room's `sealFlag`, and turns its `N` tiles solid.
- The avalanche runs at 1.4 px/frame (walking is 1.65) but is leashed to 175 px behind her, so it always hovers at the left of the screen.
- New games start on the Ridge (`START_ROOM` in game.ts). The title screen still shows the Drawbridge, which must stay first in `buildBaseRooms()`.

## Switches, flags, gates and water

- A lever (`L`) sets a persistent flag in `Hunter.flags` when whipped (`Game.setFlag`). Flags are saved with the game.
- `RoomDef.gateFlag`: the room's `G` tiles open once that flag is set. `RoomDef.drainFlag`: the room's water drains once it is set.
- Flooded Crypt: the lower-right door is a sunken gate. The lever in the bottom-left corner (underwater) sets `crypt_drained`. The water drains over about 4 seconds, then the gate opens. The Gallery of Wisps' left door is the other side of the same gate and shares the flag.
- When a room loads, flags that are already set are applied before painting (`Room.drain()`, `Room.openGates()`).
- The Gallery of Wisps can still be reached first by dropping through the Corridor of Bones grate. The locked gate then blocks the way into the crypt from that side.

## Fragile spots

These were tuned by playtesting and scripted runs. Re-check them after changing physics or layouts:

- Ossuary Shaft and Lair platforms: every tier must be reachable by jumping.
- The Chasm: must be crossable with grapple rings.
- Gallery of Wisps grate climb: needs the grapple Up-boost to reach the Corridor of Bones.
- Shattered Slope: the thin-ledge climb (rows 9 and 6) up the cliff, and the bridge at row 4 that dead-ends so you must drop through it. A scripted run cleared it.
- Frostbite Hollow: a standing whip only reaches the bottom cracked block. An up-whip right next to the wall clears the whole column, which is what the sign teaches.
- Double-jump gates (Courtyard ledge, Old Well top, Span high end, Rookery nest, Spire gable, Servants' shelf, Raven's Drop): must stay taller than one jump (~79 px) and within a double jump (~140 px), with nothing in between.
- Slide gates (Hound Pit/Lodge tunnel, Frost Sluice, the Raven's Drop and Cistern pockets): exactly one tile high, and the pocket mouths sit at floor level. The Pit/Lodge tunnel covers the doorway column too, so you can't stand up between the rooms.
- The Ringing Climb: each ring sits 2-4 rows below the landing it serves, close enough to reach from the landing below with the starting whip (tested with the leather whip).
- Rampart Walk: keep its merlons clear of x 8-15, above the Courtyard ledge you jump up from.
- Sky-cell ledge chains: the first step of the Pilgrim's Road and Cliffs chains is a double jump that only just lands (peak 13.9 rows for a row-14 ledge). Don't raise them. The Drawbridge facade pocket needs its 4-row mouth (rows 9-12) to be enterable from the ledge.
- Library: the Clerk's Mezzanine ledge (row 4, 6 rows over the case top at row 10) is a double-jump gate: keep every other platform in that room at least 4 tiles away from it. The Undercroft vault is shut by one `B` column and must stay at the dead end past the hole (a vault block spanning floor to row 5 in the middle of the corridor walled the room in during the first draft). The Grand Staircase's hanging bookcases (rows 1-6) must stay clear of the jump from the row-8 stepping ledge to the row-4 ledge.
- Tidal rooms: the Conduit shelf must stay more than 79 px above any standing spot within reach (the ice block top is 80 px below it, but 14 tiles away), and the Cistern tank floor 8 rows over the bottom.
