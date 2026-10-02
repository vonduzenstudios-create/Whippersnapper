# Project status

Update this file when you verify something or finish a listed item.

## Verified

- `npm run typecheck` passes cleanly against the real `@types/three` 0.170 (TypeScript 5.9), and `npm run build` succeeds (checked 2026-10-01).
- Headless runs with a mocked three.js: a random-input stress test in every room with no errors, an automated grapple climb, an automated chasm crossing, and an accelerated boss fight through to the victory screen.
- The user's browser pane showed every room and the boss rendering correctly with real three.js.
- First playtest feedback (2026-10-01) was addressed:
  - slower grapple swing
  - bat grace period (bats can't wake in the first 45 frames of a room)
  - Ossuary Shaft and Lair platforms rebuilt so every tier is reachable (checked by scripted jumps in the browser)
  - enemy sprites mirrored correctly (all character art faces right)
  - dangle nerf
  - switchable sub-weapons
  - the crouch easter egg
  - Scripted runs still clear the Chasm and the Wisp Gallery grate climb.

- Second batch (2026-10-01), checked with scripted runs in the browser pane, typecheck and build:
  - The Flooded Crypt lever drains the room and opens the sunken gate. Walking through reaches the Gallery of Wisps. While locked, the gate blocks from the gallery side.
  - Holy Water and Cross can be thrown while hanging, without letting go.
  - One jump-slash broke 2 stacked breakable blocks, and the dangle broke the third.
  - At half HP the boss shrieks, flees fully off screen, then ignites.
  - The bestiary page renders stats, drops and descriptions.
  - The map editor paints tiles (mouse coordinates checked), undoes, saves to `room_edits.json` without reloading the page, reloads saved edits, and resets rooms. F2 toggles edit/play in the main game.

- Prelude, story and movement relics (2026-10-01), checked with typecheck, build, and scripted runs in the browser pane:
  - The opening cinematic plays through: camera pan from the keep, captions, the hero walks in, turns, and the avalanche appears. Skipping works.
  - A scripted run cleared the Ridge and the Slope chase with full HP. The avalanche never got closer than 137 px, so it stays on screen as pressure.
  - The avalanche crashes into the Hollow's doorway, packs it with snow, sets `pass_buried`, and the music changes. The map draws that door as a wall afterwards.
  - Lore stones open their dialogs. An up-whip next to the Hollow's cracked wall clears it.
  - Pilgrim's Road → Ravenwatch Cliffs → Drawbridge transitions work.
  - (The Reliquary test room checked here was removed on 2026-10-02.)
  - Killing the Wyrm opens the lair's right gate. The victory screen returns to play.
  - The map scales to fit the wider world. The editor room picker showed all 20 rooms in two columns (there are 46 now; not rechecked).

- Editor upgrade and enemy editor (2026-10-02), checked with typecheck, build, and scripted runs in the browser pane (both JSON files were restored afterwards):
  - Tool bar tabs render. Middle-click picks a candle, a wall and a placed variant. Typing in the HTML dialogs doesn't trigger editor shortcuts.
  - Enemy editor: made a Drowned variant (25 HP, fireballs off, hue shifted), saved it, and it appeared in the map editor's ENEMIES tab in its new colors. In play it spawned with its own stats and sheet. With `spit` off it fired 0 shots in 1.5 s; with it on, 2.
  - Renaming the variant's id and saving updated the room that placed it.
  - World map: created a 2×1 room under the Courtyard and opened holes on both sides with the DOOR tool (the edge hint turned green). Test play fell from the Courtyard into the new room. Resize, overlap refusal, undo and PROPS work. Saved, reloaded, and the room came back from `room_edits.json`.

- Room-view grow strips and door arrows (2026-10-02), checked in the browser pane: a real click on the Drawbridge's left-door arrow opened Ravenwatch Cliffs at the matching door. The Stairwell's bottom hole leads to the Ossuary Shaft (view at its top) and back (view at the Stairwell's bottom). Growing the Cliffs upward kept the old tiles and the view in place, growing left into Pilgrim's Road was refused, shrinking needs two right-clicks, and undo stepped back through both. A world-map resize was undone from the room view.

- Double-tap run (2026-10-02), scripted with frame stepping: a double tap gives 2.06 px/frame (1.25× walk) both ways. Releasing stops it, turning around drops to a walk, taps 25+ frames apart don't start a run, and the run carries into a jump.

- Character select (2026-10-02), in the browser pane: the select screen shows both twins (the chosen one walks in place), Anzel appears in the cinematic, the intro crawl reads "HER SON ANZEL", dialogs and the status page fill in his name, and `hero` is saved.

- Boss redesign (0.3.0, 2026-10-02), in the browser pane with `#boss=hound` / `#boss=bellmother` and scripted hits: Gnarlfang's flayed form stands on the floor in the Hound Pit; killing it plays the fakeout (no bar, collapsed frame), then it rises in cinder form with a banner and a refilling bar (880 HP); `spit` fires its fireballs; the second death sets `boss_hound` and ends the fight. The new Bell-Mother swoops, mirrored, in the Great Belfry. No console errors. **Not yet played by hand:** fight balance of the second form, and whether the bigger hound hitbox (hw 27, hh 22 since 0.3.2, when the sprite shrank 10%) feels fair.

- Castle expansion (2026-10-02), checked with typecheck, build and frame-stepped scripted runs in the browser pane:
  - No room cells overlap, and every door/hole between the new rooms lines up with an opening on the other side (checked by script over all rooms).
  - Every new room loads and runs 3 seconds of play with its enemies without errors. All four new songs parse.
  - Gnarlfang and the Bell-Mother: entrance, banner, health bar, attacks, phase 2 (dogs / harpies summoned), death, doors reopening, `boss_<id>` set, relic floating down. Gnarlfang's charge ends in the wall stun.
  - Undervault hole ↔ Warden's Stair both ways. The Ringing Climb: all three rings caught and climbed with the starting leather whip.
  - Double-jump gates: one jump fails and a double jump succeeds at the Courtyard ledge, the Old Well top and the Span's high end. From the Courtyard ledge the jump carries up onto the Rampart Walk, and you can drop back down.
  - Slide gates: blocked without the Greaves; with them the Hound Pit ↔ Lodge tunnel works both ways, the Frost Sluice crawl goes through, and both wall pockets give their items.
  - Shortcuts: the Servants' Gallery gate blocks until the lever is whipped, then leads into the Sanctum. The Armory's cracked wall leads to the Bellfoot Court and back. The Shrine floor drops into the Forgotten Drain and, once broken, stays broken so you can climb back up.

- Version 0.2.0 (2026-10-02, playtest feedback batch), checked with typecheck, build, and frame-stepped scripted runs in the browser pane:
  - Every room loads and runs 2 seconds of random input without errors. No room cells overlap, and every doorway is open on both sides. The only edges open to nothing are the sky-cell tops and old, intended spots.
  - Bosses: the Wyrm hides every segment, including the tail, then is removed. The Bell-Mother and Gnarlfang are removed after dying and the screen shake stops. Each reward drops 40 px from the hero onto the floor, with a beam, an arrow and a message. Walking into the Raven Mantle picked it up and opened its dialog.
  - The Bell-Mother's new art checked at 6× zoom (fly and cast frames).
  - Tides: the Conduit cycles low → rising (message) → high → receding. A scripted swim at high tide reached the Conduit shelf and the Cistern tank (Ward Seed collected). At low tide a jump from the floor peaks well below the shelf.
  - No invisible ceiling: launched upward at the top of the Slope, the hero rose to y −94 and fell back.
  - Sky secrets: single jump fails and double jump lands on the first Pilgrim's Road ledge. Every following ledge in the Pilgrim's Road, Cliffs, Spire, Rampart and Slope chains was landed by a scripted walking jump. The Drawbridge pocket was entered after breaking the facade stones, and the Heart Max Up collected.
  - The moon is round in the Windswept Spire and the Hound Pit.
  - Map: the cursor moves, zoom goes in and out, and a marker was placed and drawn as an X.
  - The new-game flow goes title → twin → difficulty → intro → play, and `Hunter.difficulty` is stored. Average damage from a 13-ATK hit at DEF 6 is Normal 9.7, Hard 16.1 and Brutal 22.8. While running at Normal it's 13.0 (armor ignored).
  - Running: 2.47 px/frame (1.5× walk), five afterimages trailing.

- 0.12.2 redraws (2026-10-02), in the browser pane: every Devourer frame seen at 3× (tentacles, the tongue curled out in the wind-up, the body tipped mouth-down in the bite). The tongue was seen in flight at 5×. The bite seen at 6× covers her head and shoulders; the tentacles drape round her. The Gravehand's new grip seen at 8× and 10× in game. Typecheck and build pass.
- 0.12.1 tweaks (2026-10-02), in the browser pane: the Devourer's frames and its bite (seen at 3× and 7×) show the long neck, and the bite's jaws cover her whole head. The Gravehand's warning measured 20 frames, and its dirt trail was seen at 6×. Typecheck and build pass.
- Enemy and shield changes (0.12.0, 2026-10-02), checked with typecheck, build and scripted runs in the browser pane, no console errors:
  - TEST ENEMY on the title opens the list (bosses first, variants tagged). Gnarlfang started its arena fight. Two chamber tests in a row from the title left one Test Chamber room, with the first test's enemy gone. The enemy editor shows the Devourer and the Gravehand's new fields (10 presses, leash 0, trips).
  - Spear Knight: with the hero put behind it on the ground, it started turning 3 frames later and faced her at frame 28; the turn ended at frame 53. With the shield raised 50 px in front of it, it thrust three times (blocked: 11, 9, 9) and shoved her back ~16 px each time.
  - Wild Dog: its pounce into the raised shield was blocked (6 damage). It tumbled back ~70 px and got up 56 frames later.
  - Shield drop: a touch hit sent the shield off her arm. It bounced twice and was gone after 80 frames (cooldown 90).
  - Gravehand: it tracked a standing hero, grabbed her and let go by itself after ~2.5 s. Against a running hero it kept pace under her, rumbled, and tripped her (7 damage after DEF). The fist, seen at 9×, sits round her boots in front of her. The trip frames were seen at 6×.
  - Hookjaw: the chop fell 7–8 frames after she arrived (it used to take 24+).
  - Devourer: it hooked her into its jaws and bit every ~0.4 s (seen at 5×: the jaws cover her head). 10 presses at ~10 a second freed her in ~1 s, and it reeled back. All its frames were seen at 3–4×.
- Shield aiming (0.11.0, 2026-10-02), scripted in the test chamber: guard-walking is 0.247 px/frame; Up, Up+Right and Up+Left give 0 (Up+Left turns her left). Blocks: flat shot level/diag yes, up no; lobs from 100 and 180 px diag/up yes, level no; straight-down rock up only. The rendered frame (only the shield drawn) shows the diagonal's top behind its bottom (\ facing right), the pose the user picked.
- Shields, knife, run, spider and test chambers (0.10.0, 2026-10-02), checked with typecheck and scripted runs plus screenshots in the browser pane, no console errors:
  - Shield: a buckler cut the Spear Knight's thrust from 15–18 to 12–14, she kept her footing (1.2 px/frame shove, 40 frames of grace). Guarding walks at 0.825 px/frame (half of 1.65) and can't run. A touch hit dropped the shield for 90 frames. Three spider webs in a row were stopped with no damage and no slow. Arc check: the level shield covers −30°..60° in 15° steps, tilted −60°..15°; behind and straight overhead never. Bone lobs from 140 and 180 px were stopped by the tilted shield and by neither stance from 60–100 px, and the level shield stopped none. The raised pose was looked at in screenshots (the user asked for the top to lean forward, `/`).
  - Rootstone: a hit left her in the normal state with no knockback and 100 frames of grace.
  - Run: holding RUN + Right gives 2.47 px/frame; releasing RUN drops to 1.65.
  - Knife: six thrown in one second (1 heart each). It never marked the shielded Spear Knight. On the Hookjaw (DEF 3) it marked every time, and whip damage went from 10.35 to 11.62 on average, with the mark used up by that hit. The streak and the glow were seen on screen.
  - Spider: perch → drop to her height → hang → spit (the web hit for 2 and slowed her for 150 frames). A whip point on the thread, clear of the body, cut it with no damage: fall, land, crawl. Its crawl frames were redrawn after a look in the enemy editor.
  - Test chambers: `[`/`]` cycled through all 25 enemies and variants with no errors, each in its spot (crawler under the slab, tome shelved in the bookcase, eel and Drowned in the pool). `#test=boss:bellmother` started the real fight (1000 HP, the hero can be hurt). The editor's button (a real click) carried an unsaved HP change into the test; opening `#test=spider` by hand used the saved HP. The editor lists the three bosses with stats and an animated preview.
  - The equipment page's SHIELD row and picker fit; the controls page and the title card fit with RUN and SHIELD.
- TEST ROOM title option (0.9.0, 2026-10-02), checked with typecheck and in the browser pane: the list opens, pages and scrolls (58 rooms), picking the Antechamber starts there with every relic, and a sweep through `testRoom` for all 58 rooms put the hero on open ground in each. Not yet checked: a save point during a test run, and the game-over restart, in real play.
- Experimental relics and enemies (0.4.0, 2026-10-02), checked with typecheck and frame-stepped scripted runs in the `#lab` room in the browser pane, no console errors:
  - Glide: off the pillar it crossed the spike trench and landed ~450 px away with no damage. Without the Shroud the same jump lands at the trench's edge.
  - Pearl: horizontal swim speed 99 px/s (59 without), Up rose 74 px in 40 frames, Down sank 36 px in 30 frames (0 and 0 without).
  - Ward: costs 3 hearts, an ooze sitting on her did 0 damage for 3 s, then hurt her once the bubble faded. A Gloomcaster hex popped the bubble (no damage, 60-frame cooldown).
  - Hex without a ward: 10 damage and slowed to 54 px/s walking.
  - Hookjaw: wind-up, throw, yank of ~45 px, and the chop lands 24 frames after she regains control.
  - Ooze: 1 → 2 → 4 → gone (7 kills).
  - Grub: creep, tremble, burst, stranded, dig, creep again.
  - Eel: chase and lunge in the pool. Leaped out at her on the bank and hit, then flopped back into the water.
  - The enemy editor opens all the new enemies, and now the expansion ones too (their sheets were missing there).

- Gravehand (0.5.0, 2026-10-02), checked with typecheck and scripted play in `#lab`: warn, burst, grab at the right moment, held 100 frames with no input and freed early by wiggles and by a jump (with a small hop). Not yet playtested by feel (grip length, wiggle cost, warning time), not placed in any room, and its sprite hasn't been looked at closely.

- The Bone Librarian (0.8.0, 2026-10-02), checked with typecheck and scripted runs plus screenshots in the browser pane (Lending Hall): it tends its shelf from behind, wakes when the hero comes within range, turns, and throws; over 20 s it threw 6 arcing and 2 straight books (random 50/50), both kinds hit the hero. Its frames were looked at enlarged. Not yet checked: feel by a human (wake range, straight-book speed), its other four placements in play, and waking it by a hit.

- The Library rework (0.7.0, 2026-10-02), checked with typecheck, `npm run build`, frame-stepped scripted runs and screenshots in the browser pane:
  - Grand Staircase ramp: walking from the bottom door to the top landing and back, at walking and running speed, never leaves the ground, never stalls, and the height changes at most 0.83 px a frame (1.24 running). The first try stalled where the ramp meets a landing (a 3 px lip); `Room.blocks` now lets a grounded body step up lips of 8 px or less. Jumping on the slope lands exactly on its surface; crouch and stand up work on it.
  - Bookcases and tables: the hero stands in front of them and walks through them, and they're drawn behind her. Not re-checked: the 0.6.0 reachability search (furniture tops are one-way now, which only adds ways up).
  - Restless Chair: still → wake → float → rise → drop → rest, and wind → charge → float loops, seen in scripted runs; the drop hit the hero; it dies and lands in the bestiary. Chairs face their table. All 12 library rooms load without errors.
  - Not yet checked: feel by a human (chair speeds, wake range, how often it stomps), the new `creak`/`knock` sounds by ear, the editor's new tile swatches, and the re-colored castle areas beyond the Stairwell.

- The Ashen Library and the Rustling Tome (0.6.0, 2026-10-02), checked with typecheck, `npm run build`, scripted runs and screenshots in the browser pane:
  - Every library door and hole lines up with its neighbor (all edge tiles checked through `Game.tileOutside`); the Rookery's new west door leads into the Lending Hall, with the zone banner and the library song.
  - A physics reachability search (the real `moveBody`, gravity, jump speed, one-way ledges) from each room's doors reaches every other door, hole ledge and item: the staircase top, both Gallery/Catalogue/Undercroft holes (up through the grates), the Inkwell Shaft both ways, the Reading Room's shelf stair (Life Max Up, Elixir), the Study desk (Archivist's Seal) and the Undercroft's vault door. The Mezzanine's Might Seed ledge is NOT reachable without the double jump, as designed. The search caught one bad layout (a vault block walling off the Undercroft) before it shipped.
  - A bot holding Left and tapping Jump climbs the whole Grand Staircase in about 1050 frames and walks out the top door, without a double jump.
  - Tomes: wake, rattle, burst out of the case, flap, wind up and dive, all seen on screen. A stress run forced every tome awake in every library room with the hero at three spots: none got stuck in a wall or case (the first version launched ceiling-hung tomes up into the ceiling and trapped them; `tearLoose` fixed that).
  - A crash sweep ran 4 s of input in each of the 12 rooms with no errors. The map editor (F2) opens in the library, shows the bookcase tile swatch, and the enemy editor lists the Tome.
  - Not yet checked: balance and feel by a human (13 tomes on the staircase may be a lot; their wake range, dive speed and cooldowns are guesses), a full run from the Rookery through every room in order, the whip against a flapping tome in real play (damage and hitstop were not looked at), and the new song by ear.

- Controls tweak (0.4.1, 2026-10-02), checked with typecheck and frame-stepped scripted input in `#lab`:
  - Up + Sub-weapon raises the Ward (3 hearts, 180 frames) and throws nothing. The SHIELD button is gone.
  - Down + Sub-weapon throws the cross while staying crouched (hitbox stays 24 px tall), and she's still crouched after. Standing throws are unchanged. Both release at the same height (the throw frame's hand is already low).
  - Not seen on screen yet: the crouch throw borrows the crouching-whip frames.

## Not verified yet

- 0.12.0 by hand: whether the 20-frame rumble and the faint trail are fair (a Gravehand can't be outrun, so jumping at the rumble is the only dodge), how the trip and the 10-press mash feel on a real keyboard and gamepad, and the Devourer's damage (40% of its ATK a bite). The new shield block values (50–90%) haven't been played against. The Knight's "almost three hits" window was worked out from frame counts, not played. The Devourer isn't placed in any room.

- 0.10.0 by hand: how the shield feels (half speed, the arc sizes, the 90-frame knock-down), the run on a real gamepad's RT and the shield on LT, the new sounds (`block`, `shieldUp`, `shieldDown`, `snap`, `skitter`), the Gallows Spider's speeds and spit rate. None of the new items or the spider are placed in the world. The knife's mark is worth little against today's low enemy DEF values (0–5).

- 0.4.0 experimental relics and enemies: nobody has played them by hand or heard the new sounds (`glide`, `ward`, `wardHit`, `wardPop`, `wardOff`, `chain`, `bite`, `hex`, `blink`, `squelch`, `burrow`). Stats, timings and the 3-heart ward cost are first guesses. The glide wings are small and mostly sit behind her body. The new enemies' sprites have only been seen at normal zoom.

- 0.2.0: nobody has played it by hand. Not yet judged by a human: how the tide timing (15 s cycle) and swimming feel, whether Hard/Brutal are the right numbers, and how the afterimages look in motion. The right-stick map zoom is untested on a real gamepad. The `chime`, `tide`, `swim` and `mark` sounds haven't been heard. The Slope sky secret sits in the avalanche chase and may be too risky to bother with.

- The expansion has had no human play. Untested by script: the Bellfoot climb up to the Ringing Climb hole, the Rookery nest and Spire gable jumps, the Raven's Drop climb back up, the Briar Maze item climb, the Cistern bridge, the Bell-Mother's swoop hitting you, and how hard either boss is with real input. Enemy counts and damage are untuned.
- Nobody has heard the new songs (`undervault`, `kennels`, `belfry`, `aqueduct`, `library`) or sounds (`growl`, `bark`, `handbell`, `harpy`, `howl`, `pages`).
- The Ashen Library (0.6.0) has had no human play, and its enemy counts are untuned (see its entry under Verified). The Rustling Tome's sprite, flap rhythm and dive tell have only been looked at in a few screenshots.
- The world map spans 38 × 14 cells. Zoom and a scrolling cursor were added in 0.2.0.
- The editor's room picker with 58 rooms hasn't been checked.

- The new editor features have only had scripted use: real mouse dragging of room edges on the world map, and the enemy editor's color pickers by hand.

- Nobody has heard the new `toll`, `rumble`, `avalanche`, `djump` and `slide` sounds, or the `pass` and `chase` songs.
- The avalanche chase hasn't been played by a human yet. Its speed (`BASE_SPEED`, `LEASH` in avalanche.ts) may need tuning.
- The slide and double jump have only had scripted use. How they feel with real input is unknown.
- Pilgrim's Road enemies (zombies, a bat) are untuned for a tutorial room.

- Nobody has heard the new `screech`, `lever` and `drain` sounds yet.
- The editor has only had scripted use. A human session with real mouse painting and dragging may find rough spots.

- Only one human playtest so far. Difficulty, damage numbers and enemy placement are still mostly untuned.
- Nobody has listened to the audio yet. Mix levels and song quality are unknown.
- Gamepad support is untested on real hardware.

## Known rough edges

- The moon halo shows visible color banding.
- Lunge and weave patterns sometimes leave long gaps between attacks, because the next pattern waits until the whole body is off screen.
- Room transitions are instant fades. The map has no room labels.

- Signposts use the snowy signpost sprite everywhere.
- The Undervault's Black Door is a gate that never opens (`deep_door`), waiting for the next area.
- Breakable walls need several strikes at different heights (a standing strike breaks one tile). That's the old behavior, but the Shrine floor needs a few downward strikes.
- The Bell-Mother's wings are flat polygons and read a little stiff.

## Possible next steps

- Playtest and tune (the avalanche chase, the expansion's enemies and both new bosses).
- The area behind the Black Door.
- Options screen for screen scaling.
- A short attract demo on the title screen.
- More breakable-wall secrets.
- Playwright tests (see [testing.md](testing.md) for the mock approach used before).
- Save slots.
