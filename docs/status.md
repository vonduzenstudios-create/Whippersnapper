# Project status

Update this file when you verify something or finish a listed item.

## Verified

- 0.32.0 (2026-10-03), the wide-open test chamber. `npm run typecheck` is clean. In the browser pane (frame-stepped, `#test=zombie`): the room printed as designed, the hero walked down the left ramp to the lower floor and up and down the right one without snagging, climbed all four right-hand one-way platforms with single jumps, and `startTest(game, 'eel')` put her on the pool's shore with the eel in the water; the crawler clung under the slab, the spider perched and the bat hung from it, the tome sat shelved in the bookcase and the chair stood by the table. Seen on screen: the platform with the bookcase, and the pool beside the left stairs. **Not checked:** those enemy spots by eye, the leap from the high right platforms to the one over the stairs, and the grapple rings.

- 0.26.0 (2026-10-03), pause menu overhaul. `npm run typecheck` is clean. In the browser pane with `#relics`: the STATUS card drawn, PLAY AS ANZEL pressed with Enter swapped the sprite, name and button; EQUIP's slot view, the armor list (DEF up, LCK down arrows) and the accessory list (scroll marks, E tags, five stats up) seen on screen; the game-over menu with three options; `retryRoom()` put gold and HP back to the room entry; `setMusicVol(0)` brought both the music bus and its echo send to 0 and saved `noa_volume`. No console errors. **Not checked:** by ear (that the music is truly silent at 0), a retry inside a boss arena, and switching twins in a save room's aura or with the Mirror Heart sheet.

- 0.25.0 (2026-10-03), Vesna as a form-shaded puppet with her own look. `npm run typecheck` is clean. Rendered to PNG and looked at: idle, walk, sprint, jump, fall, crouch, a whip wind-up and stroke, slide. In the browser pane with `#relics` and scripted input, both twins went through idle, walk, jump, fall, the somersault, landing, crouch, a whip stroke and a sprint; both sheets have 168 frames and the game starts with Vesna's built. (One console error in that session came from a hot reload of a half-finished edit and did not recur on a fresh load.) **Not checked:** the motion at real speed, how the ponytail reads in a fall or on a ring, the character select screen, and the Mirror Heart's glass copies of her.

- 0.24.3 (2026-10-03), the crawler's wall trail. `npm run typecheck` is clean. In the test chamber a crawler climbed a wall and left patches every 8 px up it; read back from the game, each patch's sprite was turned a quarter and sat with solid wall under its glazed edge and open air beside it. No console error. **Not seen on screen** (the camera did not frame that wall), and not checked on a right-hand wall or round an outside corner.

- 0.24.2 (2026-10-03). `npm run typecheck` is clean. Rendered and looked at: the Devourer's walk, whirl, bite (both halves), jaws and coil; the Gloomcaster idle and cast; every ooze size; the Frost Crawler's crawl and drop; the ice slick and icicle. In the test chamber: a Frost Crawler ran 500 frames across floor and wall leaving its trail (seen on screen clinging to a wall), and a Devourer hooked the hero and bit her with a tentacle thrashing (seen on screen), with no console error. **Not checked:** the motion at real speed, the crawler's surge by feel (and whether it reads on walls and ceilings), an icicle growing and falling on screen, and the whirl on screen.

- 0.24.1 (2026-10-03), fixes to the redrawn enemies. `npm run typecheck` is clean. Rendered to PNG and looked at: the dog's 12-frame lope, the harpy's legs, the new Hookjaw (walk, wind, both chops), the Devourer's walk and arm, the Gloomcaster idle and cast, the Tome's flap and spew, all ooze sizes, the spider's crawl, the knight's walk. In the test chamber: a Rustling Tome woke, flapped, wound up and spat pages (4 in the air at once) at the hero with no console error, seen on screen; `]` stepped through enemies in alphabetical order. **Not checked:** the motion at real speed, the ooze's see-through glow on screen, whether a fan of five pages is fair to dodge, the Hookjaw's hook and chop lining up with his new arms, and the title menu's list itself.

- 0.24.0 (2026-10-03), all 23 minor enemies form shaded. `npm run typecheck` is clean. Frames of every enemy were rendered to PNG and looked at enlarged. In the test chamber (`#test=<id>`, cycling with `]`), every base enemy and every variant that came up ran 420 frames with the hero kept alive, with no exception and no console error; the frames each one showed matched its loops (zombie 18 = 8 walk + 10 rise, dog 11, knight 11, devourer 13, serpent 9 ...). Seen on screen: the Devourer reeling the hero in. **Not checked:** the motion at real speed, the Rustling Tome and Restless Chair awake (they stayed asleep in the scripted run), the Devourer's bite frames against the hero's head, the bestiary and enemy editor previews, and how the two migrated color variants look.

- 0.23.0 (2026-10-03), Anzel as a form-shaded puppet. `npm run typecheck` is clean. Rendered to PNG and looked at enlarged: idle, the whole walk cycle, half the sprint, the three jump stages, land, crouch, slide, six somersault frames, hurt, dead, hang, victory, throw and four whip strokes. In the browser pane with `#relics` and scripted input, both twins in turn went through idle, walk, jump, fall, the double jump's somersault, landing, crouch, a crouching and an upward whip stroke and a sprint with no console errors (Anzel's somersault plays turned frames with the sprite's rotation at 0; Vesna's still rotates one frame). The whip stroke played its two wind-up and three stroke frames in order. **Not checked:** the motion at real speed, the whip's chain against the moving hand point, the ring swing, slide, dash, trip and death on screen, the character select and status screens, and the Mirror Heart's reflections of him.

- 0.22.0 (2026-10-03), Gnarlfang as a form-shaded puppet. `npm run typecheck` is clean. Frames of every animation were rendered to PNG and looked at for the flayed form (walk, crouch, charge, leap, howl, bite, stun, down), and walk and bite for the cinder form. In the browser pane with `#boss=hound`: both forms were looked at standing on the pit floor beside the hero, and a scripted run went entrance, stalk, charge, stun, the fake death, the rise into the cinder sheet (520 HP), spit, charge, and the second death (`dead` and `done` set). No console errors. **Not checked:** the motion at real speed, the leap and bite on screen, and the enemy editor's preview with the 152×112 cell.

- 0.21.0 (2026-10-03), the Wyrm's form-shaded sheets. `npm run typecheck` is clean. Skull and vertebra frames were rendered to PNG at several headings and jaws and looked at enlarged. In the browser pane with `#boss`: the entrance ran, and mid-`coil` the whole body was on screen with the skull and every vertebra on the right heading. No console errors. **Not checked:** the motion at real speed (whether 32 headings step visibly on slow turns), phase 2's burning tint on the new colors, the death sequence, and the map editor's `W` marker and bestiary with the bigger 96×96 skull cell.

- 0.20.0 (2026-10-03), the Bell-Mother as a form-shaded puppet. `npm run typecheck` is clean. All five animations were rendered to PNG and looked at enlarged (fly, cast, dive, fall, stunned). In the browser pane with `#boss=bellmother`: the sheet loads (40 frames), she was looked at mid-hover and mid-song beside the hero, and stunned she sits on the arena floor. No console errors. **Not checked:** the motion at real speed (the pane only screenshots stills), the bestiary/enemy editor preview with the bigger 192×152 cell, and a full fight by script. The stunned pose is the roughest (the wings are cut flat by the floor line).

- 0.19.0 (2026-10-03), the boss rework, by script in the browser pane with real three.js. `npm run typecheck`, `npm run check:rooms` and `npm run build` are clean.
  - Each of the eight fights was driven to the boss's death by a script that plays its solution through the boss's own `targets()` / `onStrike()`: the Leviathan (three drains, the flood scene, mounting the ring, steering with scripted direction keys into all three racks), Ysolde (the shield pulsed with scripted input during the sweep: three reflections), Rimehide (standing still on one slab: boulders and leaps broke it under him), the Colossus (nine forge blows, the breach, the transition into `fg_heart`, three drops of the heart, flags `colossus_open`, `boss_colossus` and `deep_door`, both rewards, the warp back out), the Mirror Heart (three crystal bursts, the view rolling to PI and back to 0, three right mirrors), the Archivist (six blots), the Bell-Mother (phrases of 3, 4 and 5), Gnarlfang (both forms; the long daze at the post).
  - The wrong-answer paths: a wrong mirror hurts and reshuffles, a wrong bell resets and brings a swoop, blotting ARCHIVIST rewrites the line to name the hunter twice, an unblotted tale of every kind plays out without an error, and returning to the Forge with `colossus_open` set goes straight to the breach at half HP.
  - With real inputs (`game.input.script`): the attack button turned a sluice wheel three times from the ledge beside it, three jumps on a bellows raised the heat to 78, and an up-whip blotted a wet name.
  - Looked at on screen: all five redrawn sheets and both prop sheets on `/bosses.html`, the Bell-Mother's wings (one each side), and each arena mid-fight (the gaze beam, a glowing gauntlet over the anvil, the Leviathan under the surface, the aurora, the mirror hall upright and upside down, a wet page, the furnace heart with its jets and vents, a lit bell).

- 0.18.0 (2026-10-03), by script in the browser pane with real three.js:
  - `npm run typecheck` and `npm run check:rooms` are clean for the 43 new rooms (no overlaps, every doorway open on both sides, every sign/item/enemy exists).
  - Every new room loads and runs 240 frames without an error.
  - All six bosses were driven from entrance to death (hits injected every 25 frames): every pattern ran, the half-HP scene played, the defeat flag was set and both rewards appeared. A second run with the hero vulnerable confirmed the petrify (Ysolde), the freeze (Rimehide) and the control swap (Mirror Heart), and that the swap is off again afterwards.
  - Glide gates: on the Broken Span and the Crucible Walk a running double jump came down in the spikes about 10 tiles short; a glide crossed, with and without the double jump.
  - The Pearl gate: the Sunken Stair's underwater tunnel was slid through with Pearl + Greaves, and not with either one alone.
  - Pool exits (Weeping Culvert, Serpent Gate): the surface leap clears the bank when Jump is held.
  - Doors: Courtyard grate down and back up, Mourners' Row grate, Black Door shut and open, the Gaol's lever gate, the Old Well, Spire, Study, Drain and Warden's Stair doors, the Stacks' slide gap (blocked without the slide), the Chute onto the Lodge's grate, and the three climbs through a ceiling hole.
  - The save aura finds one doorway per neighboring save room and ducks the zone song to about half at the door.

- 0.17.0 (2026-10-02), checked with typecheck, build and frame-stepped scripted runs in the browser pane:
  - Grapple (current tuning, scripted): chain 20–46 px, reeled smoothly (full range in ~36 frames hanging still, ~11–17 px per second mid-swing); grab reach 78 px with every whip (all whips 56 px since 0.17.0); swing passes through walls by design, and any exit from `hang` (letting go, a hit, a grab) pops her out of solid tiles; a `stuckT` safety net fired only at the test's own bad spawn points in 13,200 frames of random play over 55 rooms. JUMP hop: 5.2 px/frame up hanging still, 5.1 sideways / 3.0 up from a 3 px/frame swing. Sinew Coil: picked up in the Shrine (dialog, RELICS list); 24 frames to the 70% commit point, 39 to full (32 px); committed, letting go of ATTACK or Down slings at a flat 12 px/frame (~220 px rise); short of it, Down eases back and ATTACK is a plain release; Up lets the tension out with no sling; JUMP hops off; the commit sparkle and tingle fire once. **Level fit:** the Ringing Climb's high rings are out of reach of the current launches and the Wisp Gallery climb wasn't rechecked after the last tuning: the user is adjusting the ring rooms. **Not checked by hand:** how it all feels.
  - Spikes: 60 frames kneeling, then `crippleT` 180 counting down with speed recovering; a jump right after standing worked.
  - Wyrm: every pattern (both phases) shows its head on screen for a good share of its run and finishes; a lunge's skull peeks in at the screen's edge. Retreat → ignite → fight resumes. On death the zoom eases 1.08 → 1 and the Victory banner, the gate message and play follow (no victory screen).
  - Boss intro: the title sits in the lower third with the Wyrm above it; the dialogue box stays at the bottom.
  - Gnarlfang's slam drops its rockfall across the screen, its howl brings 4 dogs on screen; the Bell-Mother summons 4 harpies and her two tolls drop 20 stones.
  - Frost Crawler placed on a one-way ledge walks off, falls, clings to the floor and climbs the next wall.
  - All three HUD styles checked magnified (sub-weapon, bar or orb level, hearts, pips).

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

- Enemy balance (0.13.0, 2026-10-02), checked with typecheck and frame-stepped runs in the test chamber (`#test=<id>`), plus screenshots:
  - Poleaxe Knight: a 50-damage hit from the front did 5, from behind 50. With the hero 30 px behind it on the ground, it started turning at once, faced her at frame 48 and chopped her on frame 51 for 17. The eight turn frames were looked at side by side (rise toward the camera, then the whip-round chop).
  - Grave Wisp: flames dripped every ~1.5 s while it chased, landed and burned 100 frames, about 3 damage a touch after DEF (its body did ~16).
  - Bell Wraith: the ring hurt the hero within about 60 px of the bell, not at 62 or 70. The ring was seen on screen.
  - Frost Crawler: patches every 8 px along its path. On the ice, walking speed was 0.80 at chill 101 (1.65 normally). Frozen at chill 150, broken out with 8 LEFT presses, chill reset. A hit while frozen shattered the ice. The see-through block and the frosty tint were seen on screen.
  - Gravehand: with the hero walking away at 1.65, the gap held at exactly 100 px for 100 frames, then it sped up and caught her ~45 frames later. When she jumped, it lost her at once and slowed to a stop. When she landed back on its floor it sensed her again. Landing on a table (16 px higher) correctly didn't count. The bigger furrow was seen on screen.

- 0.14.0 (2026-10-02), checked with typecheck, build, frame-stepped runs and screenshots:
  - All 21 portraits were looked at, 4 at a time at 4x. Wyrm, Gnarlfang and Bell-Mother entrances each ran to their dialogue (Wyrm at entrance frame 330, Gnarlfang 260, Bell-Mother 280); stepping through Gnarlfang's lines with ENTER handed control back (`input.script` null) and the fight began (`stalk`). The camera framed the Bell-Mother mid-toll.
  - Pell: walking up in the Reader's Nook started `pell_meet` (11 lines), which opened the shop. Two ENTER presses bought two potions (500 → 420 gold, stock 5 → 3). ENTER used to close the shop (it's also PAUSE); fixed.
  - Drops: 300 Poleaxe Knight kills gave 207 gold drops (12–24, average 18) and 4 soul shards.
  - RELICS page: switching the Raven Mantle off made `doubleJump` false while `_doubleJump` stayed true, and both were saved; an old-style save (`grapple: true`) loaded through the setter.
  - Gravehand: the strike started 2.0–2.2 s after it sensed the hero, walking or standing, with the gap held for the first 90 frames. Crawler on a ceiling: 4 icicles in 420 frames, each leaving floor ice.
  - Knight: the jab frames fit the new 92-wide sheet.
- 0.16.0 (2026-10-02), checked with typecheck, build and scripted runs in the browser pane (frames stepped with `game.tick()`):
  - Boss scenes: all three entrances ran to a freeze frame and their talk (Wyrm at entrance frame 302 mid-roar, Gnarlfang 260 mid-howl, Bell-Mother 280 on her bell). Half HP started each phase scene and its talk (`boss_wyrm_phase2` at `ignite` 104, `boss_hound_phase2` at `howl` 60 with both dogs out, `boss_bellmother_phase2` at `rage` 110). Gnarlfang's fake death left the hero free until frame 150, then the scene ran to `boss_hound_revive` with the cinder form at full HP. After each talk the controls came back with 40–60 frames of grace. Screenshots: the banner sat below the Wyrm during its lap; the dialogue box moved to the top for Gnarlfang and the Wyrm's entrance, so neither was covered.
  - Frost Crawler: it circled the test chamber's floating slab several times (underside, left wall, top, right wall), with its feet on each surface.
  - Hookjaw with the hero standing still: hook, chop, thrown back to ~105 px, hook again, over and over; it never stalled.
  - Devourer with the hero standing still: the whirl slapped her 132–146 px, then the tongue pulled her back in. Whirl frames seen (no cleaver).
  - Bell Wraith reverb (leather whip, ring 59 px): a hit with her body 61 or 66 px away didn't hurt her, 57 or 45 px did.
  - Gloomcaster: a hex disarmed her (whip in the bubble, slowed). Whip attacks did nothing. Softcore: the bubble popped after ~3.7 s and the whip flew back. Hardcore: it dropped to the floor, stayed there after leaving the room and coming back, and walking over it gave it back.
  - Grave Grub: stranded 110 frames, cocoon, three moths after 100 more. A moth burst on her: 4 damage, then poison of 2 HP every 30 frames; at 3 HP it stopped at 1.
  - Gravehand: invisible and still for its whole rest after a mash-free, visible again once rested. Soul shard floated to her from 90 px away in under a second. Shield: a touch hit with the shield lowered left it alone; a magic hit with it raised dropped it.
- 0.15.0 (2026-10-02), checked with typecheck and scripted runs in `#test=crawler`:
  - Ice: walking speed went from 1.65 to 0.82 px/frame on the first iced frame; she froze 119 frames after first touching ice; 90 frames off ice brought `chill` and `iceT` back to 0. Blue tint seen.
  - Spikes: 500 damage at 999 max HP, back to `lastSafe`, `crippleT` 600. Walking 0.16 px/frame (10%), jump ignored during the first 5 s and working after. Red tint seen.

## NEW GAME + (0.28.0)

- `npm run check:abbey` (about two minutes): all 120 rooms and every item and lever are reached, in seven rounds: no relic, grapple, slide, double jump, Pearl, Sinew Coil, glide. Nothing behind a gate showed up a round early. `npm run check:rooms -- --abbey`: no overlaps, no floating items, every sign key exists (the only WALLED lines are open-topped rooms under another room, and the two slide crawlspaces).
- In the real game with `game.input.script`: the Weeping Shaft's coil gate. Grapple + double jump, pumping the swing every way tried, tops out with her feet ~86 px under the grate; the Sinew Coil sling plus a double jump at its peak lands her on it. The Smugglers' Cove sea wall: with the Pearl, a slide under the water carries her into the Smugglers' Cache; without it, Down + Dash is a backdash.
- The title menu (NEW GAME +, then CONTINUE + once saved), character select with the new names, the crawl, the opening lines, saving to the abbey's own slot and continuing from it were played through. The map screen shows the whole island. New themes (docks, cloister, seacave) were looked at in a few rooms.
- Not playtested by hand: the room-by-room feel, enemy density and difficulty, and whether every jump the checker found is comfortable. The checker's grapple ring is a rough model (the gates built on rings copy the Gallery of Wisps pattern).

## Not verified yet

- 0.19.0 has had no human play. The scripts prove each cycle can be completed, not that it is fun or fair. Open questions: whether the 26-frame reflect window on Ysolde's beam is findable by feel; whether baiting Rimehide onto a pre-cracked slab is readable (the script simply stood still); how hard it is to catch the Leviathan's ring with a real whip, and to steer it; whether three bellows jumps between slams is too much busywork; whether the shell game is trackable upside down at the third round's speed; whether a page can always be reached in time (some hang over a case two screens from where you stand); whether the Bell-Mother's notes are distinct enough by ear (nobody has heard them: the pane has no audio) or only by which bell lights. The scripted Colossus run forced the furnace heat instead of pumping it between slams.
- The Archivist's `dark` tale and the Mirror Heart's flipped view have not been checked together with the pause menu or a death mid-effect beyond the room reload resetting them.

- The 0.18.0 zones have had one human playtest, which led to the 0.19.0 boss rework (their bosses as described under 0.18.0 above no longer exist). Still unknown: enemy counts in every new room, and item balance (three relics and two top shields now drop from bosses). Nobody has heard the seven new songs or the save theme leaking through a door (the pane had no audio). The storybook figures are about a third taller than the hero. Scripted jumps did not cover every ledge chain in the new shafts (Sump, Coil Stair, Rimecrown Climb, Bellows, Chimney), which follow the 3 to 4 row rule on paper. The Leviathan fight without the Pearl is slow going in the water by design, but nobody has tried it.
- The enemy editor shows code variants with their base enemy's colors (it doesn't apply `shift`).

- 0.16.0 by hand: how the scenes pace in real play (the Wyrm's retreat can keep the controls locked for a few seconds), the new `sting`, `flutter` and `powder` sounds, how the crawler looks easing round corners at full speed, and whether the moths' zigzag and poison (20 HP over 5 s at default) are fair. The new banter is first-draft writing. Crawlers wrapping into narrow one-tile gaps weren't tried. A hardcore whip dropped over a pit lands on the nearest floor beside it, but falls straight there through any blocks in between.

- 0.15.0 by hand: how the ice and cripple feel in real play (in the air, slows are half as strong, which wasn't measured), and spikes in rooms where `lastSafe` sits right beside the pit.

- 0.14.0 by hand: the dialogue on a gamepad, the pace of the boss entrances (8–9 s before the talk), shop prices against how much gold a real run earns, and the Wyrm's portrait (a horned skull head-on, while its sprite is a long-snouted profile). The `talk` and `coin` sounds haven't been heard by a human. Signs and lore stones still use the old plain text box.

- 0.13.0 by hand: whether the Poleaxe Knight's 48-frame rise is long enough to get hits in and still escape the chop, whether the bell ring's ~60 px reach is fair, how quickly crawler ice builds up in real play (crawlers that cling to ceilings leave no trail until they drop), and whether the Gravehand's stalk feels like dread or just slow. The `dong` and `scrape` sounds haven't been heard by a human yet. In the test chamber the wisp and crawler were moved by script (the crawler was put on the floor by hand).

- 0.12.0 by hand: whether the 20-frame rumble and the faint trail are fair (a Gravehand can't be outrun, so jumping at the rumble is the only dodge), how the trip and the 10-press mash feel on a real keyboard and gamepad, and the Devourer's damage (40% of its ATK a bite). The new shield block values (50–90%) haven't been played against. The Knight's "almost three hits" window was worked out from frame counts, not played (replaced in 0.13.0 by the turn-and-chop). The Devourer isn't placed in any room.

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

## Trial fights (0.27.0)

- Verified by script in the browser (forcing each pattern and each window, then striking): all five trial fights (`leviathan2`, `gorgon2`, `colossus2`, `yeti2`, `yeti3`) start in their chambers, every stun route opens its window, the phase scenes play, and each dies cleanly. No console errors.
- Verified by script: the Bell-Mother stays inside the camera for 1,800 frames of her fight (0 frames off screen), and the music ducks to 0.18 while she sings.
- Hand-play and tuning are left to the user (see Boss reworks below).
- The trial chambers are not in `buildRooms()`, so `npm run check:rooms` does not check them.

## Trial bosses (0.29.0)

- Verified by script in the browser (2026-10-03): all ten (`castellan` ... `abbess`) load from `#test=boss:<id>`, the entrance and the phase-two scene both hand the controls back, 1,800 frames of each phase run with no console errors, and each death ends cleanly (nothing left in the room, the boss on the floor).
- Verified by script: every phase-one opening of every boss opens it and four blows close the window; also the Marionette's resting fist, the Stalker's relit lanterns, the Reaper's dizzy whirl, both outcomes of the Abbess's whip tangle and her holy-water opening. The Abbess's low heart takes a real crouching whip and the high one a real double-jump whip.
- Fixed while testing: holy fire emptied a whole window by itself (now it chips); the Miller's millstone opened him every throw by bouncing back (now only when he inhales it); bosses killed mid-leap hung in the air; the Saint's robe was too pale.
- Not done: nobody has played them by hand. Tuning notes from the scripted runs: the Castellan's pendulum opens him often even for a hero who does nothing; the Miller's sail brake opens him wherever he stands (the sails cover most of the floor), on a 700-frame cooldown; the bowl-back only happens if he happens to inhale right after a throw.

## Boss reworks (0.30.0)

- Finished the rough spots from the rework handoff: the Colossus turns to face you before his sweep, stamp and ember rings; the Foundry's gantry is raised clear of his head (row 13) with a ledge out to it from each high catwalk, and the hero and he start closer, so the camera opens at 1.3x instead of 2.2x; Ysolde wears a lace veil over her face in the first half (she lifts it to gaze) and her `stuck` tail now kinks up into the step; the Frozen Falls has its own backdrop (a frozen cascade, ice columns in two layers, icicles, mist); the Boneyard skull's jaw now hides the block under it.
- Verified by script in the browser: all five run 1,500 frames and die cleanly with no console errors; the Leviathan's well drains to the floor as it dies.
- Left as it is: "run up the wedged blade" (from the Colossus pitch) was not built, since nothing in the engine lets the hero stand on a sprite; wedged, he bends into whip reach instead. Nobody has listened to the `bell` sound or tuned damage (left to the user).

## Mini-bosses (0.31.0)

- Built: all ten (art, AI, data, spawn letters `0`-`9`, enemy-editor knobs, lazy sheets in the game and the editor). The Ferryman and the Antlered Ghoul are new puppets; the Brute's head was redrawn forward of its shoulder with a brow and a jaw.
- Verified by script in the browser's test chamber: each runs 3,000 frames using every one of its states with no console errors, and dies cleanly. Checked one by one: the Headsman's cage catches and reels you in (and mashing frees you), the Unhelmed staggers when his head is whipped back, the Brute's grab slams you or reels when you mash free, the Gargoyle takes no damage as stone and switches to its cracked sheets, the Ferryman's blow takes 3 hearts and heals him, the Ghoul's scream slows you, the Warden's puddle poisons, the Lycan clings to a wall and kicks off, the Bull's toss throws you up.
- Fixed on the way: the Mawtoad's tongue never dragged the hero in (it hurt her first, and a hurt hero can't be yanked).
- Not done: none of them is placed in a room, nobody has played them by hand, and HP / damage are untuned (left to the user).

## On hold: NEW GAME + follow-ups

Paused by the user (2026-10-03), no plans to continue for now: the abbey's seven empty boss chambers, something for the Ashglass Ward to unlock (the sealed Lamp chamber), the abbey's own music, and a hand playtest of its 120 rooms (`npm run check:abbey` after any change).

## Known rough edges

- The moon halo shows visible color banding.
- Lunge and weave patterns sometimes leave long gaps between attacks, because the next pattern waits until the whole body is off screen.
- Room transitions are instant fades. The map has no room labels.

- Signposts use the snowy signpost sprite everywhere.
- The Black Door now opens when the Hollow Colossus dies (`deep_door`).
- Breakable walls need several strikes at different heights (a standing strike breaks one tile). That's the old behavior, but the Shrine floor needs a few downward strikes.
- The Bell-Mother's wings are flat polygons and read a little stiff.

## Possible next steps

- Playtest and tune (the avalanche chase, the expansion's enemies and both new bosses).
- Playtest and tune the 0.18.0 zones and bosses.
- Sky-cell secrets for the Lichyard and the Frostbitten Parapet.
- Options screen for screen scaling.
- A short attract demo on the title screen.
- More breakable-wall secrets.
- Playwright tests (see [testing.md](testing.md) for the mock approach used before).
- Save slots.
