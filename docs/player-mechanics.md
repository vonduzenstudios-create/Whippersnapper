# Player mechanics

All of this lives in `src/game/player.ts` unless noted.

## Run

Hold RUN (RT, Left Shift) while moving: the hero runs at 1.5× walking speed (`RUN_MUL`). A run starts on the ground and carries into jumps, so running jumps go farther. Letting go of RUN or the direction drops back to a walk, and you can't run with the shield raised. (Before 0.10.0 this was a double tap.)

- Afterimages: `Player.echoes` is a pool of `ECHOES` hero sprites (render order 11). `tickEchoes()` (end of `update()`) drops one every `ECHO_EVERY` frames while moving at run speed, and `renderEchoes()` draws them tinted blue, fading out. `loadRoom` clears them.
- While `running` is set, `takeDamage` ignores armor (defense counts as 0).

## Shield (0.10.0)

The off-hand slot (`Hunter.equip.shield`, items with `slot: 'shield'`). Each shield has `block` (the share of a blocked melee hit it soaks up) and `look` (which face the `relicfx` sheet draws: `shield_<look>`, frame 0 level, frame 1 diagonal with its top leaning back over her head (\ facing right), frame 2 flat overhead). New games start with `shield_buckler`; `Hunter.load` gives older saves one.

- Hold SHIELD (LT, F / I) to raise it (`Player.guarding`). Only in the normal state, so a whip or throw lowers it for that moment. Walking speed ×`GUARD_MUL` (0.15), no running; jumping and crouching work. `guardAim`: UP + a direction is `diag`, UP alone is `up` (overhead); in either she doesn't move, and left/right only turn her (0.11.0).
- `shieldFaces(dx, dy)` decides what it covers: a direction from her toward the hit, in front of her, within `GUARD_ARC` for the current aim, in degrees from straight ahead (negative = above, below −90 = above and behind): level −30°..70°, diag −80°..0°, up −125°..−55°. `shieldBox()` is where it's drawn and where shots get caught (judged by their flight direction).
- Every hostile ent says how it hurts through `Ent.hitType()` (`DmgType` in `ent.ts`): `touch` (the default: bodies, bosses), `melee` (weapon strikes, and enemies in one of their `Enemy.lunges` states), `shot` (physical `EnemyShot`s: bone, book, feather, rock, web) and `magic` (fire shots, `HexBolt`, `Shockwave`). Direct strikes pass the type to `takeDamage(raw, fromX, ignoreInvuln, fromEnemy, type, fromY)`.
- Melee from a covered side: damage × (1 − block), a shove instead of knockback (`pushV`: `BLOCK_PUSH` 2.6 px/frame, easing off ×0.86 a frame, added to her own movement), and `BLOCK_INVULN` (40) frames of grace (0.12.0). `takeDamage` sets `justBlocked`, and the contact loop calls the attacker's `onBlocked()`. `Enemy`'s default rebounds it (16 frames of stun, which ends most lunge states). The Wild Dog tumbles and lies down ~55 frames, the Restless Chair bounces back to hovering, and the Poleaxe Knight chains up to `KNIGHT_JABS` (2) more thrusts. A lunge whose body overlaps the raised `shieldBox()` is judged at the shield's height, so a pounce arcing in high still counts as faced. Shots: caught on the shield box every frame (`Game.updatePlay`), or at body contact if they came from a covered side (a shot "comes from" 8 frames back along its flight, so arcs are judged by their real angle); no damage. The Hookjaw's hook bounces off. Touch or magic hits go through, and if the shield was raised they knock it down for `SHIELD_COOL` (90) frames (0.16.0: a lowered shield stays on her arm). `dropShield()` spawns a `ShieldDrop` (objects.ts) that tumbles off, bounces twice, blinks and is gone after 80 frames.
- Block values (0.12.1): Wooden Buckler 0.5, Iron Heater 0.65, Ossuary Pavise 0.78, Ashen Aegis 0.9.
- Measured (0.11.0, when the buckler blocked 20%): a buckler turns a 15–18 spear thrust into 12–14. Flat shot: level and diag block, up doesn't. Bone lobs from 100 and 180 px: diag and up block, level doesn't. A rock falling straight down: only up blocks.

## Rootstone (0.10.0)

`acc_rootstone` (`ItemDef.noKnock`, `Hunter.noKnock`): a hit still hurts and gives the usual 100 frames of grace, but she keeps her footing and her control (no hurt state, no knockback). A hit still knocks her off a grapple ring.

## Swimming

In water (`Player.inWater`), pressing Jump off the ground is a swim stroke (`SWIM_V`, -2.4) instead of nothing. If the hero's head is at or above the surface (`y - hh <= water.y + 6`), it is a leap instead: `JUMP_V × 1.1`, a little stronger than a jump. That's about 67 px of feet above the surface. Water halves gravity, so strokes add up. Swimming doesn't use up the double jump. Tidal rooms are built around this (see level-design.md).

## Grapple

Reworked in 0.17.0 to play like Super Castlevania IV:

- Every whip has the same reach since 0.17.0 (`WHIP_LEN` 56 in data.ts; whips differ in ATK and element only). The whip latches if a ring is within `WHIP_LEN` + `GRAB_REACH` (22) = 78 px and within 48° of the strike direction, or within 30 px at any angle.
- **Hold ATTACK to hang on; let go to release.** Dash does nothing on the rope. Sub-weapons can still be thrown.
- **JUMP hops off** (`Player.hopOff`): she lets go with a small boost along the way she's already moving (speed × `HOP_MUL` 1.02 + `HOP_ADD` 2.1 along her heading, plus `HOP_UP` 2.7 of lift), or a `HOP_STILL` (5.2) hop straight up if she was hanging still. Never a pull toward the ring.

## Sinew Coil (relic, 0.17.0)

`relic_sinew` / `Hunter.elastic`, placed for now in the Shrine of the Chain beside the Chain Grapple (`i` at 14,10). On a ring, Down reels the chain out to `ROPE_MAX` as usual; with the Coil, holding Down past that stretches it (`Player.stretch`, up to `STRETCH_MAX` 32 px) like a rubber band (`stretchChain`): `STRETCH_RATE` (1.36 px/frame) slowing to 40% of that near full stretch, and by half at full swing speed (hanging still: 24 frames to the commit point, 39 to full). While stretching, the tension damps her swing (×`STRETCH_DAMP` 0.95 a frame), so a full stretch settles her under the ring. The links redden as it stretches, with a `creak`.

- **Committed** (`Player.committed`): past `STRETCH_COMMIT` (70% of the stretch) she trembles; on the frame it crosses, a ring of six sparkles bursts round the whip's handle with a very quiet `tingle` (`commitSparkle`), and a faint twinkle shows at the hand every 18 frames while it's held. Then letting go of Down **or** of ATTACK fires the sling at once. The only ways out are JUMP (a normal hop off) or holding Up, which lets the tension out at `STRETCH_EASE` (1.2 px/frame) with no sling, then reels in as usual. While stretched, Up/Down work the band instead of reeling.
- Short of the commit point, letting go of Down lets the band ease back (no sling), and letting go of ATTACK is a normal release.
- The sling (`sling`): toward the ring and on past it, always at full power (`SLING_V` 12 px/frame, the same from the commit point to full stretch), plus 30% of her swing, and she lets go. It flings her ~220 px up from where she hangs at full stretch.
- The rope starts at the length it caught at. **Up reels in, Down lets out** (`Player.reel`), between `ROPE_MIN` (20) and `ROPE_MAX` (46). The reel eases up to speed and back down (`REEL_EASE` 0.08). Its top speed depends on how big the swing is (the speed she'd have at the bottom of the arc, so it doesn't jump at the ends of each swing): `REEL_FAST` (1.1 px/frame) hanging still, falling to `REEL_SLOW` (0.18) at 70% of top swing speed. Measured: the full range in ~36 frames hanging still, ~17 px/s in a medium swing, ~11 px/s in a big one. A catch from further than `ROPE_MAX` winds in to it at `REEL_WIND` (1.2 px/frame) instead of snapping short.
- The swing is a body on a rope, not an angle: she moves with gravity × `SWING_G` (0.65) and **passes straight through walls and floors while on the rope** (on purpose, so nothing snags the swing). Past the rope's length she's pulled back onto its circle and loses the outward part of her speed. Caught from closer than that, or from above the ring, the rope just goes slack and she falls until it pulls taut (no more being thrown off to the side).
- Coming off a ring inside a wall or floor, by any route (letting go, a hit, a grab, a room change), pops her out to the nearest spot she fits: `Player.set()` calls `popOut` whenever the state leaves `hang` (`popOut` searches outward 2 px at a time up to 64 px, up first at each distance). As a safety net, `update()` also pops her out if she's been inside solid tiles for more than 2 frames in any state (`stuckT`).
- Left/Right pump along the swing (`SWING_PUMP` 0.06 a frame while taut). Speed is capped at `SWING_MAX_V` (4.8).
- Letting go: sideways speed × `LAUNCH_MUL` (1.35, max 4.8). Near the bottom of the arc or on the way up she also springs off it (`LAUNCH_KICK` 2.2 + 0.6 × swing speed, up to 8.4 px/frame), and `Player.launched` keeps the full rise even though JUMP isn't held. On the way down she just drops away. A full swing peaks a little above the ring.
- The Wisp Gallery grate climb needs the Sinew Coil now (see below).

## Double jump (Raven Mantle)

- `Hunter.doubleJump`. Pressing jump in midair (not in water) after the coyote window fires a second jump at `DJUMP_V` (-6.2, about 60 px on its own). Holding jump still controls the height.
- It uses `inp.pressed('jump')` rather than the jump buffer, so a jump pressed just before landing is still a normal ground jump.
- `Player.djumped` resets on landing and when catching a grapple ring. The hero somersaults (`tuck` frame rotated by `Player.spin`).

## Slide (Frostrunner Greaves)

- `Hunter.slide`. Hold down and press dash on the ground (not in water) to slide forward instead of backdashing.
- The slide starts at 4.4 px/frame and slows down. The hitbox is 14 px tall (`SLIDE_HH` 7), so it fits under a one-tile gap.
- It only ends where she can stand (`Player.fits(18)`). Under a low ceiling she keeps scooting at `SLIDE_MIN`; left/right picks the direction and a wall turns her around. Jump cancels the slide only where there is room.
- Taking damage inside a low gap skips the knockback, because standing up there would wedge her in the ceiling.

## Experimental relics (0.4.0)

Not placed in the world yet. Try them in the test chamber (`#test`). Each has a `Hunter` flag (defaults to false, so old saves load) set by `addItem()`.

- **Duskwing Shroud** (`relic_shroud`, `Hunter.glide`): holding Jump while falling (normal state, not in water) glides. Gravity drops to 0.3×, the fall speed is capped at `GLIDE_FALL` (0.75 px/frame) and air speed is ×`GLIDE_MUL` (1.2). Moth wings (`relicfx` sheet, render order 11) show behind her. Gliding off the lab pillar carries her ~450 px while dropping 80. It doesn't use up the double jump, so double jump, then hold to glide.
- **Undertow Pearl** (`relic_pearl`, `Hunter.swim`): in water there's no 0.6× slowdown (walk and run at full speed: 99 px/s instead of 59), she barely sinks (gravity 0.2×, max fall 1.2), Up/Down swim at `FREE_SWIM_V` (2.2), swim strokes are 1.4× stronger, the floor jump isn't weakened, and the slide works underwater. The surface leap is unchanged, so tidal-room gates that rely on the leap height still hold.
- **Ashglass Ward** (`relic_ward`, `Hunter.ward`): Up + SUB-WEAPON (since 0.4.1) spends `WARD_COST` (3) hearts to raise a bubble for `WARD_TIME` (180 frames). While it's up, `takeDamage` ignores every hit from a monster (`fromEnemy`), with sparks via `blockHit()`; spikes still hurt. Enemy shots that touch it are destroyed as usual. It flickers in its last 45 frames, then can't be raised again for `WARD_COOL` (60). A Gloomcaster hex **pops** it outright (`popWard()`, 30 frames of grace), and a Hookjaw hook bounces off it.

Enemy effects on the hero, also new in 0.4.0:
- `Player.grab(by, presses, time, bite)` / `holdT` / `mashLeft` (0.12.0): a Gravehand's grip or a Devourer's bite (`by` is a `Holder`). While held she can't walk, jump or dash, knockback is cancelled, and she strains in place. Every LEFT, RIGHT or JUMP press takes one off `mashLeft`. At 0 she's free, and a jump press kicks her free with a small hop. `holdT` is when the holder lets go by itself (`HOLD_TIME`, 150 frames, for a hand; never for a bite). Either way `by.released(mashed)` is called. A hand leaves her arms free; a bite sets `holdLock` (no attacks or sub-weapons). After breaking free, `freeT` (60 frames) stops grabs. A warded hero is not grabbed at all.
- `Player.trip(dmg)`: the `trip` state. She pitches forward (`trip` frame 0), lies on her face (frame 1) for `TRIP_DOWN` (40) frames, then gets up (crouch frame, `TRIP_UP` 14). The damage goes through `chew()`.
- `Player.chew(raw)`: damage with no knockback and no grace (bites, the trip), scaled by difficulty and DEF like any enemy hit.
- `Player.yank(targetX)`: the `yank` state drags her toward a Hookjaw (no damage, no invulnerability), ending when she arrives, after 40 frames, or at a wall. It uses the hurt frame.
- `Player.hex(frames)` / `slowT`: walking speed ×`SLOW_MUL` (0.55) and a violet tint while hexed.

## Dangle

Holding attack after a strike dangles the chain. A newly pressed direction flicks it once (12-frame cooldown). Holding a direction does nothing, so it always flops back down. It deals 15% damage (`DANGLE_DMG`) with no knockback.

## Sub-weapons

- Holy Water costs 1 heart, Boomerang Cross costs 2, Throwing Knife 1 (`SUB_COST` in `game/data.ts`).
- Throwing Knife (0.10.0, `KnifeProj` in `objects.ts`): released on frame `KNIFE_RELEASE` (3) of a throw that ends on frame `KNIFE_END` (9), about 6 a second; at most `KNIFE_MAX` (3) in the air. Flies straight at 7.5 px/frame, damage `3 + STR × 0.4`, stops at the first thing it hits. It marks an `Enemy` (`exposedT`, 300 frames, a pulsing glow) unless it is `shielded` (Poleaxe Knights with their shield); bosses aren't `Enemy`s, so they're never marked. `Game.dealHit` halves the DEF for the next non-knife hit on a marked enemy and clears the mark.
- `Hunter.subs` lists every sub-weapon found and `Hunter.sub` is the selected one.
- Q/E or LB/RB cycle them (`subPrev`/`subNext` actions). RB used to be a second dash button.
- They can be thrown while hanging from a grapple ring without letting go. Left/Right aims the throw, otherwise it goes the way you're swinging (`Player.paySub()` + `releaseSub(x, y)`).

## Breakable walls

Any contact with the chain breaks `B` tiles, during a strike or while dangling. `Player.breakTouchedTiles()` walks the whole chain from the hand to the tip in 3 px steps and tests a small cross around each point, so one jump-slash can break several blocks.

Broken stones stay broken (saved in `Hunter.broken`). Hidden paths built on this: the Armory's far wall (to the Bellfoot Court) and the Shrine of the Chain's floor (whip downward in a jump, into the Forgotten Drain).

## Damage

Classic-hard: knockback on every hit (unless the shield blocks it or the Rootstone is worn). Spike pits take exactly `SPIKE_DMG` (half) of max HP and put her back at the last safe spot, down on one knee (`kneel` state, `KNEEL_TIME` 60 frames: no moving or jumping). When she stands, `Player.crippleT` starts at `CRIPPLE_TIME` (180 frames) and the slow fades with it: 90% slower at first (half that in the air), wearing off evenly over 3 s, with the red tint fading too. She can jump again as soon as she stands (0.17.0).

`Player.takeDamage(raw, fromX, ignoreInvuln, fromEnemy = true, type = 'touch', fromY)` (see Shield for `type`): damage = `raw × difficulty × (0.9..1.1) − DEF × 0.55`, at least 1. The difficulty multiplier comes from `DIFFICULTIES[Hunter.difficulty]` in `game/data.ts` (Normal 1, Hard 1.5, Brutal 2). Spikes pass `fromEnemy = false`: hazards hit for exactly `raw`, with no difficulty, randomness or DEF. Because DEF is subtracted after the multiplier, Hard and Brutal hurt a bit more than 1.5× / 2× at low levels. DEF is 0 while running.

## Easter egg

Crouching with no other input for 60 s (`TOOT_FRAMES`) plays the `toot` state: hero frames `toot[0-3]`, the `fart` SFX, and green smoke.

## Relics

`addItem()` sets `Hunter.grapple`, `doubleJump` or `slide` by relic id, and the pickup dialog text comes from `RELIC_TEXT` in `game/story.ts`. The Raven Mantle drops from the Bell-Mother and the Frostrunner Greaves from Gnarlfang.

Minor upgrades (slot `max`, 0.2.0): Might Seed `str_up` (base STR +1) and Ward Seed `con_up` (base CON +1), hidden in the sky-cell secrets and the tidal rooms.

Expansion equipment: Rime Chain (whip, ATK+32, icy blue chain, top of the Aqueduct Span), Raven Mail (armor, DEF+15, Frozen Cistern pocket), Hound Fang (STR+3 LCK+3, Huntsman's Lodge), Bell Charm (CON+6, Harpy Rookery).

## Enemies

- Bats can't wake in the first 45 frames of a room (grace period from playtest feedback).
- Poleaxe Knight (0.13.0): its shield passes `KNIGHT_SHIELD` (10%) of any hit from the side it faces, in every state but `turn`. The turn is its attack, timed from `KNIGHT_TURN_FRAMES` in art_chars.ts (each entry: turned-to-camera 0..1, poleaxe angle, blade side, frames shown): a 48-frame rise drawn by `knightTurning()` (turning toward the camera, poleaxe climbing overhead), the facing flips at `KNIGHT_FLIP` (48), then a fast fall. The poleaxe is held `KNIGHT_REACH` (7) px further out on the turn, and the chop hits a 48×48 box in front (reaching 52 px, 0.14.0) for ATK + 4 (melee, so a shield blocks it) on frames 51–60, and the head bites the floor on frame 57. The whole turn is 72 frames (1.2 s). Its sheet is 92×80 (anchor 28, 58) so the raised poleaxe and the full jab fit.
- Each enemy's stats, drop table, bestiary text and portrait animation live in `ENEMY` in `game/data.ts`. `rollEnemyDrop` does one roll per kill, so at most one item drops. Luck multiplies every chance by `1 + LCK/50`.
- `ENEMY` = the code table + `game/enemy_edits.json` (written by the enemy editor, `enemies.html`). That file can change base enemies and add **variants**: an entry whose `base` is another enemy. A variant has its own id, name, stats, drops, bestiary entry, a palette swap (`colors`: original `#rrggbb` → new) and behavior knobs (`tune`), but reuses its base enemy's class and art.
- Behavior knobs are listed per base enemy in `ENEMY_TUNING` (data.ts) and read in enemies.ts through `Enemy.num()` (speed, sight, cooldown multipliers, 1 = normal) and `Enemy.can()` (abilities, on unless turned off): knight `shield`/`thrust`, wisp `drip`, crawler `drop`/`trail`, skeleton `throw`/`hop`, drowned `spit`/`leap`. A drowned with `leap` off walks around from the start instead of lurking. Add a knob to `ENEMY_TUNING` and read it in the enemy's class.
- Rooms place a variant as its base letter plus `arg` = the variant id (`{ t: 'd', arg: 'drowned_pup' }`). An unknown id falls back to the base enemy. `Game.enemySheet(kind)` gives each variant its recolored sheet (built once at startup by `recolorSheet` in view.ts).
- Kills are counted per kind in `Hunter.bestiary`. The pause menu's BESTIARY page shows an enemy's stats, drops (with your current luck applied) and description after the first kill.
- Bosses award their XP and a bestiary entry in `Game.onBossDefeated()`, because they never go through `Enemy.die()`.

### Expansion enemies (`game/enemies_expansion.ts`)

| Letter | Enemy | Behavior | Knobs |
|---|---|---|---|
| `g` | Wild Dog | Prowls; on sight it crouches and growls, then runs at you and pounces when close. Skids after, then cools down. Never runs off ledges | `pounce` |
| `y` | Harpy | Flies (not through walls). Hovers to one side of you, then swoops in a U-shaped dive or throws a feather dart | `swoop`, `darts` |
| `r` | Bell Wraith | Floats slowly after you, keeping a little distance. Lifts its bell (a `handbell` tinkle, 30 frames of glow), then tolls (`dong`): a `TollRing` spreads to `TOLL_RADIUS` (72 px, 0.16.0) in `RING_LIFE` (18) frames and hurts you once if it reaches your body (magic), and a shockwave runs both ways along the floor below it. Jump that (0.13.0). Every hit on it rings back (`reverb`, 0.16.0, at most every 20 frames): a smaller ring for 70% of its ATK out to `REVERB_SHARE` (80%) of your strike reach (`whipLen + 18`, measured from the near edge of your body), so the outer fifth of your reach is safe. The ring art is scaled to each ring's radius | `toll`, `reverb` |
| `c` | Frost Crawler | Ignores you (0.16.0). It clings to whatever it walks on and follows it round every corner: up walls, across ceilings, down the far side, round whole blocks. It tracks a foot point half a pixel off its surface (`fx, fy`), the surface direction (`nx, ny`) and its heading (`tx, ty`): solid ahead turns it up the wall (inside corner), no surface under it after a step wraps it round the edge (outside corner). It turns back only at water and within 2 px of the room's edge (doorways, holes). The sprite turns to put its feet on the surface, easing round corners. On a ceiling it drops when you pass below (then falls with physics and clings to the floor it lands on). To start one on a ceiling, put it in the row just below the ceiling. It lays an `IcePatch` every `ICE_STEP` (8) px on floors, ceilings and (0.24.3) walls, where the ice is only decoration, lasting `ICE_LIFE` (360) frames (see Ice trails below). Every 90–150 frames an `Icicle` grows from a random patch of its ceiling trail for `ICICLE_GROW` (50) frames, shivering at the end, then drops: a physical shot for 60% of its ATK that shatters into three floor patches where it lands (0.14.0) | `drop`, `trail` |

`Shockwave` is a hostile ent that runs along the floor until a wall or a drop. Bell tolls and Gnarlfang's landings use it.

**Ice trails (0.13.0).** An `IcePatch` sets `Player.onIce` while her feet are on it (player.ts reads and clears it next frame). Reworked in 0.15.0: grounded on ice, `Player.chill` (0..1) jumps straight to 1 and `Player.iceT` counts up; off the ice or in the air `chill` drops by `1/ICE_THAW` per frame and `iceT` by `ICE_FREEZE/ICE_THAW`, so both wear off in 1.5 s (`ICE_THAW` 90). Her speed is multiplied by `1 - ICE_SLOW * chill` on the ground (`ICE_SLOW` 0.5), half that slow in the air. The blue tint follows `chill`; flakes come faster as `iceT` nears `ICE_FREEZE` (120 frames, 2 s). There she `freeze()`s: a `grab()` by her own `iceHold` (arms locked, `ICE_MASH` 8 presses or `ICE_TIME` 150 frames), drawn as a see-through `iceBlock` from the relicfx sheet that cracks as she mashes. Any hit that lands shatters it.

**Grave Wisp drips (0.13.0).** While a wisp is chasing (`drip` on), every 70–110 frames it drops a `WispFlame` (enemies.ts): it falls, then burns on the floor for `DRIP_BURN` (100) frames, 10×12 px, for 45% of the wisp's ATK as magic. Water puts it out. Its `drip` and `flame` frames are in the wisp's own sheet, so they burn in the wisp's colors, a variant's palette swap included (0.14.0). The Wispette has `drip` off.

### Experimental enemies (`game/enemies_extra.ts`, 0.4.0)

Not placed in any room yet. Try them with the enemy editor's TEST button, or place them with the map editor's ENEMIES tab.

| Letter | Enemy | Behavior | Knobs |
|---|---|---|---|
| `h` | Hookjaw | Heavy (no flinch). Lumbers toward you to `CLOSE` (30 px). At `HOOK_MIN` (48) to 166 px it whirls its chain (26 frames), then throws a hook (`HookChain`, range 176, aimed within ±35°). A hit drags you to it (`Player.yank`, to `pullTo()`). The cleaver hangs raised while you're dragged and falls `QUICK_WIND` (8) frames after you land (0.12.0). Whipping the hook out of the air cancels it. Within `CHOP_REACH` (40) it chops (24-frame wind-up); a chop that hits throws you back (`swat`, `SWAT_KNOCK` 3.4 px/frame, about 100 px) and its next hook comes after 40 frames instead of 110 (0.16.0) | `hook`, `chop` |
| `v` | Devourer | A great round mouth on tentacles (`Devourer extends Hookjaw`, 110 HP, hitbox 10×22): the two halves of its body are its jaws. Its "hook" is its barbed tongue (`tongue = true`: the `HookChain` draws `tongueSeg`/`tongueTip` from the fx sheet and leaves from `hookFrom()`, its mouth). The tongue drags you to `BITE_DX` (16) px in front of it, where its body waits open. It `grab()`s you as a bite: the body tips forward mouth-down over your head, drawn over you (render order 13), and `chew()`s 40% of its ATK every `BITE_EVERY` (24) frames until you mash free. Then it reels back for 60 frames. No cleaver (0.16.0): its close-up attack (`melee = 'whirl'`) coils its tentacles for `WHIRL_WIND` (18) frames, then spins for `WHIRL_SPIN` (26), hitting anything within 40 px either side for its ATK and slapping you about 145 px away (`swat` ×1.25), out to tongue range | `hook`, `chop` (the whirl), `mash` (presses, 10) |
| `e` | Mire Eel | Lives in water. Drifts, then chases swimmers at 1.7 px/frame (faster than an unaided swimmer) and lunges. If you stand at the water's edge above it, it leaps straight up and steers at you. Out of water it flops back toward the pool | `lunge`, `leap` |
| `m` | Gloomcaster | Casts a slow hex (`HexBolt`, 1.7 px/frame, homes for 110 frames) that hurts and slows you for 200 frames, or pops a ward bubble. A hex that hits also disarms you (0.16.0, `Player.disarm`): the whip goes into a `WhipBubble` (objects.ts) that drifts at random for 180–300 frames. Touch it to pop it and take the whip back. If it pops by itself, the whip flies back (`WhipReturn`), or with `hardcore` on it drops to the floor below (`WhipDrop`) and `Hunter.lostWhip` remembers where (room, x, y) until you walk over it, across rooms and saves. While `Player.disarmed` there are no whip attacks or grapples; sub-weapons still work. Leaving the room with the bubble still up settles it (`WhipHolder.leaveRoom`). Then the caster fades out and reappears 70–170 px from you on solid floor (`blinkSpot`). Hitting it mid-cast fizzles the spell and makes it blink early. Whip the bolt to break it | `blink`, `homing`, `disarm`, `hardcore` (off by default) |
| `o` | Rot Ooze | Hops after you. Sizes 3 → 2 → 1 (HP ×1 / ×0.55 / ×0.3). Killing one bigger than size 1 splits it in two (XP and a bestiary kill each time). Only the smallest pieces roll drops. The pieces inherit the killing blow's hit id, so one swing can't chain through them | `split` |
| `x` | Gravehand | Under the floor it shows as a `furrow` (a mound of soil with broken earth behind, faint when still) and leaves lingering dirt clods, with a `scrape` that quickens and gets louder with its speed. It only `senses()` you while you stand on its floor within 260 px; then it stalks: for `HAND_HOLD` (90) frames it keeps the distance it sensed you at, on the same side, wherever you go (up to 5 px/frame), then it rushes in from `HAND_MIN` (0.8), speeding up by `HAND_ACCEL` (0.12/frame) to `HAND_MAX` (4.5). From sensing you to the rumble takes about 2.1 s (0.14.0). Off the ground you're lost to it: it slows (×0.92 a frame) toward where it last felt you, and starts the stalk over when you land (0.13.0). It moves only while the floor carries on and nothing walls it off, up to `leash` tiles from where it was placed (0 = no limit). When it's under your feet on the ground, the dirt rumbles for `HAND_WARN` (20) frames, following you, at `HAND_WARN_TRACK` (2.6) and only while you're on the ground, then it bursts up and can close for `HAND_SNAP` (8) frames. If you're running (with `trip` on) it trips you (`Player.trip`, 10 damage); otherwise it `grab()`s your ankles: a wrist rises from the dirt and the fingers reach up round her shins, drawn in front of her (render order 13). It lets go by itself after 150 frames, or when you mash `mash` presses (then it rests for `HAND_RESTED`, 600 frames). Jumping at the rumble makes it miss. Not `hostile`. HP 20, only hittable while up; killing it frees you (0.12.0) | `mash` (10), `leash` (0), `trip` |
| `u` | Grave Grub | Untouchable mound under the floor that creeps toward you. Right under you it trembles (26 frames), then bursts up (hostile) and lands stranded for `GRUB_STRANDED` (110) frames, taking 1.5× damage. Then, with `evolve` on (0.16.0), it spins a cocoon (harmless, still 1.5× damage) that hatches three Grave Moths after `GRUB_COCOON` (100) frames; with it off, it digs back down (`burrow`) | `burrow`, `evolve` |
| `f` | Grave Moth | Hatched from a grub's cocoon, three at a time (0.16.0), or placed. 8 HP. Flutters at you in jittery zigzags (steering plus a random sideways jitter), bouncing off walls; within 90 px it sometimes darts straight at you (`dive`, 28 frames). It isn't `hostile`: when it touches you it bursts (`burst`): its ATK as damage, then `Player.poison` (2 HP every 30 frames for 300 frames by default; it never takes the last HP; the hero turns green) | `poison`, `poisonTime` |

### Mini-bosses (`game/minis/`, 0.31.0)

Ten big enemies, in the enemy editor and TEST ENEMY but in no room yet (entity letters `0`-`9`). They are `MiniBoss`es (`game/minis/kit.ts`, on `Enemy`): heavy (blows don't push them), a state machine of telegraphed attacks, no phases, no health bar. Each attack is a switch in the enemy editor, and speed / sight / cooldown are knobs as usual. Art: `gfx/minis/` (`MINI_ART`), drawn the first time one is needed. Stats are first guesses (150-280 HP), left for tuning.

| Enemy | Letter | Attacks |
|---|---|---|
| The Headsman | `0` | Axe chop that sticks in the floor for a second (punish him); a gibbet cage hurled on a chain (caught: mash or be reeled in and chopped; `mash` knob); a shoulder barge (the shield blocks it) |
| Moonrot Lycan | `1` | Gallops on all fours, two-hit rake; leaps (into a wall it clings, then kicks off back at you); shackle-chain lash at mid range |
| The Unhelmed | `2` | Bowls his head along the floor; while it rolls he is blind and swings at the last noise you made (moving, jumping, striking). Whip the head back into him: he staggers. Sword slash up close |
| Ossified Bull | `3` | Paws, then charges (into a wall: dazed; it stops at ledges); maul slam that throws bone shards out of the floor; an uppercut that tosses you |
| Rookery Gargoyle | `4` | Leaps, turns to stone and drops (rubble skids both ways); stone, it can't be hurt until it wakes; tail stab, front or behind. Cracks as it is hurt (`_1`/`_2` sheets) |
| Plague Warden | `5` | Keeps his distance; lobbed vials leave poison puddles; a lingering choke cloud; a three-cut bone saw up close |
| The Sanguine Duchess | `6` | Blood lash (its hitbox follows the lash); bursts into bats and re-forms behind you; a running line of blood spikes |
| Stitchwork Brute | `7` | Punches a crawl of lightning along the floor; rips up and throws masonry (it breaks into rocks); grabs, lifts you overhead and slams you unless you mash free (then it reels; `mash` knob) |
| The Ferryman | `8` | Oar sweep that covers the air above him; lantern flames that drift after you (whip to pop); every blow he lands takes 3 hearts and mends him |
| Antlered Ghoul | `9` | Skitters erratically; leaps; three-slash rake; a scream that slows you for 3 s up close |

### Gallows Spider (`game/enemies_spider.ts`, 0.10.0)

Not placed in any room yet.

| Letter | Enemy | Behavior | Knobs |
|---|---|---|---|
| `p` | Gallows Spider | Finds the ceiling above where it's placed and hangs there (`perch`). When you pass within 56 px across and below it (up to 240 px), it lowers itself on a silk line (`drop`, 3.2 px/frame) to your chest height, or as low as the floor allows. `hang`: sways, creeps up or down to stay level with you, and every 110 frames (within 170 px) opens its fangs for 18 frames and spits a web glob (`EnemyShot` kind `web`, half its ATK, `Player.web(150)`: the hex slow, tinted white). After 330 frames it climbs back up and rests 100 frames. Any hit on the thread (`hitAt`/`hitBox` test the line) cuts it: it falls, then scuttles after you on the floor (`crawl`). HP 26 | `spit`, `climb` |

### Library enemies (`game/enemies_library.ts`, 0.6.0)

| Letter | Enemy | Behavior | Knobs |
|---|---|---|---|
| `t` | Rustling Tome | Sleeps spine-out inside a bookcase (place it on an `H` tile of a library room): `shelved` is not `hostile` and not a whip target. When you come within 130 px across and 100 px up or down it wakes 8-18 frames later and rouses every sleeping tome within 110 px (12-52 frames each), so a shelf lets go together. Then it rattles in place (26 frames, eyes glow, pages shake out), tears loose (`burst`: flies through the wood until it is clear of stone, taking the nearest way out, see `tearLoose`) and flaps (`flap`): it circles 44-80 px out and about 32 px above you, covers beating. Every 90-150 frames, within 200 px, it rears back (`wind`, 18 frames, the tell) and dives straight at where you stood (`dive`, up to 30 frames, 3.1 px/frame, covers shut). It bounces off walls and flaps again. HP 24, flies (collides with stone, passes through one-way ledges), dies in a scatter of pages. If it ever ends up inside stone it tears loose again | `dive` |
| `a` | Restless Chair | Stands among the prop chairs (`n`) with the same sprite, facing the same table, drawn behind the hero; `still` is not `hostile` and not a whip target. Within 64 px across and 48 px up or down it wakes: creaks, rattles and hops twice (40 frames, whip-able but harmless), then floats (`float`): it hovers at your height about 46 px to your side, bobbing. Every 50-90 frames it attacks: `stomp` (within 80 px, half the time) rises 72 px over you for 48 frames, shivers, and drops legs first until it lands (then rests 40 frames: hit it); `charge` (within 180 px) tips back for 20 frames (the tell) and cartwheels straight at you at 3.4 px/frame for up to 50 frames, bouncing off walls. HP 30. Collides with walls and stands on one-way tops | `charge`, `stomp` |
| `l` | Bone Librarian (0.8.0) | A `Skeleton` subclass (`Librarian`) with its own sheet (a cap, books instead of bones). Place it on the floor in front of a bookcase. `tend`: seen from behind, shelving books (a 4-frame loop), not `hostile` but whip-able. Within 110 px across and 56 px up or down, or when hit, it turns (`turn`, 22 frames, a small hop), then fights exactly like a skeleton, its first throw coming after 20 frames. `throwShot` picks 50/50: a book lobbed like a bone (spins), or one thrown straight at you at 2.8 px/frame (flaps). Books (`EnemyShot` kind `book`) break into pages on stone. HP 30 | `throw`, `hop` |

## Expansion bosses

- **Gnarlfang** (`game/hound.ts`, Hound Pit, 1100 HP): stalks and bites; crouches and charges until it slams into a wall, then reels dazed for 80 frames and takes 50% more damage (a `Rockfall` of 11 stones, 16 in phase 2); pounces at you and its landing sends shockwaves both ways. It ignores one-way ledges. At half HP it howls in four wild dogs, two at a time at the screen's edges, and howls again later if they're dead. When the first form's HP runs out it fakes its death (`fakeout`: collapses, goes dark, no HP bar, music stops, ~3.5 s of silence, embers and growls), then rises as the Cinder Mastiff (`rise`: sheet swaps to `houndCinder`, HP bar refills to 80% of the first form's, untouchable while it howls). The cinder form moves 1.35× faster, adds `spit` (two fans of three fireballs), drops fireballs instead of rocks on wall slams, and throws two burning cinders when it lands from a leap. Its second death is the real one.
- **The Bell-Mother** (`game/bellmother.ts`, Great Belfry, 1000 HP): hovers above you; swoops from the far side at your height; fires three fans of feathers; rings the great bell so shockwaves roll in from both walls. At half HP she rages (a scene, see Boss scenes), summons four harpies at the screen's edges, tolls twice (each toll a `Rockfall` of 10 stones), and attacks faster.
- **Rockfall** (objects.ts, 0.17.0): drops `count` stones (or cinders) one after another over ~a second, spread across what the camera shows, every third one aimed at the hero, each warned by 30 frames of trickling grit at the spot. They fall from the ceiling, or the top of the screen if the ceiling is out of view. The Wyrm's bone rain uses the same idea (every third bone aimed, faster in both phases).

## Boss rewards and deaths

- When a boss's death animation ends it sets `dead = true` (so its update stops) and calls `Game.onBossDefeated()`. Before 0.2.0 the Bell-Mother and Gnarlfang kept running their death loop, and the explosions never stopped.
- `Game.spawnBossRewards()` drops the room's `i` items a short way from the hero, toward the middle of the room, onto the floor below (`Game.floorBelow`), instead of at their placed spot. `Pickup.setBeacon()` adds a column of light (render order 8), rising sparkles and a repeating `chime`, and puts the pickup in `Game.beacons`. The HUD draws a bouncing arrow over each one (`UI.drawBeaconArrows`), or a pointer at the screen edge when it's off screen. A reward left behind is still placed at its spot on the next visit, with its beacon.

## Wyrm in a big arena (0.17.0)

The Lair is four screens, so the Wyrm's patterns start from just outside the camera's view instead of the far walls (`Wyrm.cam`): lunges come from the screen edge she's further from, and first creep the skull in until it just shows at that edge (or out of the wall, if the wall is on screen) for 45 frames, rattling, as the tell. Weave and coil run across or round the middle of the screen; rain, perch and ignite drop from just above it. `trailClear()` means "nothing of it can be seen" (off screen or buried in rock). It sets `Boss.camZoom` = 1.08, so the camera pulls back 8% for the fight (`View.zoom`, eased in `Game.updateCamera`), and back to 1 as it dies.

## Wyrm phase change

At 50% HP the Wyrm switches to the `retreat` pattern, which starts a boss scene (0.16.0, see Boss scenes). It shrieks (`screech` SFX), the screen shakes and flashes red, enemy shots are cleared, and it writhes for 50 frames. Then it flees off screen along its heading: sideways patterns leave through a side wall, ceiling patterns back up into the ceiling. It can't be damaged during the retreat. Only once every segment is out of view does it switch to `ignite` and come back burning.

## Boss scenes (0.16.0)

Entrances and mid-fight changes all run through the same two calls on `Game`:

- `bossScene()`: the hero stops (`input.script = {}`), can't be hurt (`invuln` 99999), and the camera follows the boss with letterbox bars (`bossShow`). `startBoss()` calls it for the entrance; a boss calls it when it changes phase.
- `bossTalk(scene = 'boss_<id>')`: called once the boss strikes its pose. A freeze frame (`FREEZE`, 45 frames: nothing updates but the camera, a white flash, the `sting` sound, a dark red vignette round the boss), then `talk(scene)`; its `done` hands the controls back with 60 frames of grace. The vignette stays up under the dialogue.
- The name banner picks its side once, as it appears: the top if the boss is in the lower 55% of the screen, else the bottom (`UI.bossLow`). In a boss scene the dialogue box does the same, moving to the top (portraits hanging under it at the sides) when the boss is low.
- Phase scenes and their `SCENES` keys: the Wyrm at half HP (`retreat` starts the scene; `ignite` rears over her and talks, `boss_wyrm_phase2`), Gnarlfang at half HP (`howl` with `data.scene`, talks at frame 60 after the dogs arrive, `boss_hound_phase2`), its revive (the `fakeout` leaves her free until the embers stir at frame 150; `rise` talks at frame 110, `boss_hound_revive`), and the Bell-Mother at half HP (`rage`: shriek, two tolls with no shockwaves, talks at frame 110, then `summon`, `boss_bellmother_phase2`).

## 0.18.0: the Temple Asp, code variants and six bosses

**Temple Asp** (`game/enemies_depths.ts`, letter `q`): patrols; within sight it closes in. Under 64 px it coils for 18 frames and darts 3.4 px/frame for 16 (a lunge, so the shield blocks it). From further off it rears for 24 frames and lobs a venom glob (`EnemyShot` kind `slime`: 60% of its ATK, then 4 s of poison).

**Code variants** (`CODE_VARIANTS` in `game/data.ts`): Dire Wolf (dog), Rime Harpy, Slag Ooze, Cinder Bat, Forge Thrall (hookjaw), Slag Knight, Glass Sentinel (knight), Prism Wisp, Gaol Wretch (zombie), Deep Drowned, Jade Votary (skeleton). The enemy editor lists them like its own variants; saving one there copies it into `enemy_edits.json`, which then wins.

**New shot kinds**: `icicle`, `glass` (points along its flight) and `slime` (poisons).

## Bosses since 0.19.0

The user's rule after playing 0.18.0: **no damage sponges, no minion swarms, nothing raining from the sky, no targets floating out of reach, and no two bosses sharing a trick.** Every boss after the Wyrm has one cycle tied to its zone. Working the cycle opens a window; only blows in a window count. HP is segments of 100 and a blow takes 25 (`SEG` / `BLOWS` in `boss_base.ts`), so a window is four blows however strong the whip is.

| Boss (HP) | File | Cycle | Numbers |
|---|---|---|---|
| Sump Leviathan (600) | boss_leviathan.ts | **Part one:** whip both sluice wheels open, the pool drains, strike the stranded belly, it refloods. Wheel spots per round are in `WHEEL_SPOTS` (round 2: one up on the row-6 ledge; round 3: one under water). While the pool is full it lunges (a 46-frame tell) or spits two brine globs. **Part two** (scene at half HP): the pool rises to row 8 for good. Whip the harpoon ring to mount (`Player.mount`), lean with the direction keys (it turns at most 0.05 rad a frame, swims 3.3 px/frame), ram each of three spike racks (left wall, right wall, roof) for a segment. It throws you after 600 frames | 3 strokes per wheel; stranded up to 400 frames |
| Ysolde (300) | boss_gorgon.ts | Five statues give cover. **Gaze:** 70-frame tell, then a beam sweeps from the roof down to the floor at her feet in 100 frames (and back up once she's angry). A statue in its path stops it (cracks, then falls). Shield up and facing: blocked. Shield raised within 26 frames of the beam arriving (`GUARD_FRESH`): reflected, she is stone for 330 frames. Neither: you are stone (14 presses or 220 frames) and she comes over with her tail. **Smash:** she sweeps away the statue nearest you (never the last one). After the first turning she spits a venom fan before each gaze | three turnings |
| Old Rimehide (300) | boss_yeti.ts | Eight ice slabs of 5 tiles (x 4-43), 3 cracks each (`crack()`). A snow boulder cracks the slab it lands on, a leap the slab he lands on (a shadow marks it for 34 frames; after the first dunking a leap counts double). The chain only clanks (he guards) until a slab breaks under him: stuck 380 frames. Open water refreezes after 1200 frames and chills you while you stand in it | three dunkings |
| Hollow Colossus (600) | boss_colossus.ts | **Outside:** each landing on a bellows adds 30 heat (fades 0.07 a frame). At heat 55+ the pieces whose turn it is warm up; at temp 70+ they glow. A piece slams where you stand; if that's the anvil (x 330) and it's hot, it lies soft for 300 frames: three blows shatter it. Gauntlets, then the helm (it can only reach 210 px). Then the `colossus_open` flag is set and its chest is a doorway into `fg_heart`. **Inside** (`FurnaceHeart`): four chain anchors, two strokes each, drop the heart for 320 frames. Two flame jets turn round it and three floor vents blow in turn (60-frame warning); faster each of three rounds. Dying outside the room and coming back skips straight to the breach | 9 forge blows, then 3 drops |
| Mirror Heart (600) | boss_mirror.ts | **Echo:** the copy is at `W - x` of where you were 55 frames ago, and its chain is real. Violet crystal sprouts on its side with a pale mark at the mirrored spot on yours: 120 frames to burst. Every third growth is red and sprouts under you. Three bursts under the copy. **Shell game** (scene: `View.roll` goes to PI): it shows itself in one of five mirrors, 3/5/7 trades (40/32/24 frames each), then 260 frames to strike one. Wrong mirror or too slow: you take the hit and it reshuffles | 3 + 3 |
| Head Archivist (600) | boss_archivist.ts | A page types itself out (`TALES`), then HUNTER glows while the ink is wet (170 frames, 120 in part two). Whip it: the word becomes ARCHIVIST and the tale happens to him, one chapter (segment) each. Otherwise it happens to you: books from both walls, a pirate crossing the floor, flames under your feet, a duelist's lunge, a golem's floor pound, or darkness. Part two (scene at half HP): both names are in the sentence; blotting ARCHIVIST doubles the tale on you | six chapters |
| Bell-Mother (300) | bellmother.ts | `sing`: her phrase plays on the three bells (38 frames a note). Whip them in the same order while she hovers, swoops, throws feathers or tolls (one shockwave from each wall, no masonry). Right: she falls and is stunned 330 frames. A wrong bell resets the count and brings a swoop. She re-sings every 780 frames. Phrases of 3, 4, 5 notes | three falls |
| Gnarlfang (650 + 80% again) | hound.ts | As before (charge into a wall to daze him, then the Cinder Mastiff) without the pack summon or the rockfall. A charge that ends within 70 px of the stone post (x 496) dazes him 170 frames instead of 80 | |

### Trial fights (0.27.0, test chamber only)

Reworks of four bosses, each in its own chamber (`world/rooms_trial.ts`, built only by the test chamber; `BossInfo.trial`). Not in the world: the fights above are unchanged. Each has two halves and three ways to open a window in each. Outside a window a blow on an unarmored part chips 5 HP but never takes the last of a segment (`BossBase.chip`).

| Boss (HP) | File, id | First half | Second half |
|---|---|---|---|
| Sump Leviathan (600) | boss_lockwyrm.ts, `leviathan2` | The lock. Both sluice wheels (3 strokes each) strand it; a lunge over the weir top beaches it (280 frames; it won't fall for it twice running); the pawl on the weir (2 strokes) drops the gate through the gap it swims through and pins it | The weir breaks and the water climbs to row 13. A rise through one of the two chains (x 216, 552) tangles it; the west ledge's pawl (2 strokes) drops the counterweight down the middle for a whole segment; the harpoon ring mounts it and each of three wall racks is a segment |
| Ysolde (400) | boss_stonebride.ts, `gorgon2` | Four mirror discs: a stroke turns one to face the court. A facing disc in the beam's path reflects it (she is stone 330 frames; the disc is blackened 1200). She spits a facing disc away before some gazes (the 80-frame tell is your chance to turn it back). Shield raised within 26 frames reflects too. A tail lash whose end reaches the step at either end of the floor wedges (250 frames) | The gaze sweeps both ways; a two-armed venom spiral; every 260 frames the ground under you cracks, then is thorns for 130 frames |
| Hollow Colossus (600) | boss_ironknight.ts, `colossus2` | Plate clanks. A cleave that lands on the grate (x 496-656) wedges 300 frames; the ladle's ring pours slag for 80 frames (on him: kneels 300, plate hot 900); hot plate in the trough (x 256) cracks: a window of two segments. A shield rush through the molten channel also heats him. Low sweep (jump), stamp (shockwaves), shield rush (crouch or slide), sparks | Bare fire (chips). Flame waves, ember rings with gaps, and a third of the floor burning in turn (90-frame warning). Grate and ladle as before; the trough douses him (once per 900 frames) |
| Old Rimehide, Frozen Falls (400) | boss_rimehide.ts, `yeti2` | Six ice slabs (2 cracks each): a boulder is one, a leap one. A charge that ends at the falls buries him; standing over a vent as it blows scalds him | An ice-pillar club: slam (shockwaves, shards, cracks ice, even under him), a double flat swing (duck), kicked snowballs that crack the slabs they cross, blizzard breath that shoves you |
| Old Rimehide, Boneyard (400) | boss_rimehide.ts, `yeti3` | A slam at the foot of a rib jams his arm (the rib snaps after); the hanging tusk (3 strokes on the sinew) fells him for a double window if he is under it; a carcass whipped off its hook makes him walk over and eat; a leap into the skull sticks his horns | He takes the tusk, the high ribs drop lower. Double swing, a slam that throws a ring of shards; rib stumps still jam the tusk |

Debug: `#test=boss:<id>` with the ids above. `#boss=leviathan`, `gorgon`, `yeti`, `colossus`, `mirror`, `archivist`, `bellmother`, `hound`, or pick them under TEST ENEMY. `/bosses.html` shows their sheets and the two prop sheets.

### Trial bosses (0.27.0-0.29.0, test chamber only)

Ten new bosses, each in a chamber of its own (`world/rooms_trials.ts`, 48 x 28 tiles, arena columns 8-39 = `AX0`..`AX1` in `game/boss_kit.ts`). None is in the world yet. All extend `TrialBoss` (`boss_kit.ts`) and share one damage rule, **chip + bonus**: any blow takes 5 (`CHIP`); each boss has several ways to force a vulnerable state (`stun`, about 300 frames), where a blow takes 25 and four blows (100) close it. 600 HP = 3 + 3 openings; phase two (its `boss_<id>_phase2` scene) starts at half HP. Holy fire only ever chips, even in a window, so it can open a boss but not empty the window by itself (0.29.0).

| Boss | id | Openings, phase one | Phase two |
|---|---|---|---|
| The Pendulum Castellan | `castellan` | Bait his chop onto a floor gear (the halberd jams); be near the middle when he attacks (the pendulum hits him mid-swing); his sweep turns his back: three blows on the winding key | Faster, wider pendulum; the gears grind in turns (no jamming a grinding gear, don't stand on it); the thrust springs back once |
| Lady Marrow | `marionette` | Whip a string while it is taut (hoisted for the kick, or bowing in the curtsey); whip a sandbag's rope so it lands on her | The puppeteer's hands: one carries and swings her, one slams and sweeps. Three blows on the resting fist after a slam (or a sandbag on it) and she is dropped |
| The Censer Saint | `saint` | Snuff all four hanging censers (two blows each; they relight); strike his own censer at the front of its swing (it flashes) | He walks; the spiral turns both ways, four rings, censers relight sooner |
| The Umbral Stalker | `stalker` | Only solid in light. Swing a lantern so its moving pool crosses it; stand in a lit pool when it lunges; holy water (fire is light) | It bites lanterns dark (two blows relight one); the lunge feints first |
| The Harvest Reaper | `reaper` | Crouch in tall wheat and he searches: strike him from behind; holy water lights the wheat and his straw catches if he stands in it | The field burns to three sheaves that regrow; two fire lines creep; the whirl leaves him dizzy (any blow opens him) |
| The Powder Baron | `baron` | Whip a fused bomb back so it bursts beside him (short fuse: from close); whip a rolling keg back to him; put the powder store between you when he fires the cannon | A running powder trail to jump, tumbling chain-shot, three bombs at a time |
| The Star-Reader | `starreader` | Stop all three orbiting worlds (grapple rings) in a line: an eclipse; after his nova, crack the dark lens (double jump or a swing) | Star tide: the floor burns, so hang from a world; a beam turns round the lens; orbits reverse after each tide |
| The Gale Miller | `miller` | Strike the valve on his pack from above while he vents; whip the sail brake by the left wall (the sails clip him); his millstone, if he inhales while it still rolls (one that only bounced back he stops: 0.29.0) | A crosswind that changes side on a tell; he leaps onto a sail and drops on you, landing winded |
| The Mawtoad | `mawtoad` | Whip a gas pod off its reed so it lies between you: the tongue takes it; dodge so the tongue sticks in a thorn stump | It rolls round the hollow as a ball; a fallen pod takes the bounce out; low enough at a wall, it bursts on the thorns |
| The Rose Abbess | `abbess` | Briar walls creep in from both sides (they hurt and push you out, and draw back while she is stunned). Wither all three root-hearts (two blows each, ~720 frames each): high over the middle (ring or double jump), low in the crawlspace (crouch-whip or slide), and behind a thorn curtain (six blows, or holy water burns it). She lashes at chest height (crouch), lobs seed pods that leave thorns, and surges the walls in | Uprooted, she walks. Whip her or her briar while the lash is out: the whips tangle; mash free and her briar tears away, too slow and she reels you in. Holy water on her while she casts her pods |

Debug: `#test=boss:<id>`, TEST ENEMY on the title, or the enemy editor (the trial bosses are in its list since 0.29.0, each sheet drawn when first picked).
