# Bell-Mother sprite brief (for an outside artist / Codex)

This folder is a hand-off. `reference/` holds the boss's **current** sprites, exported from the
game's own drawing code. Please draw a **new version** of the same boss and put it in
`incoming/` using the format below, so it can be dropped into the game.

The game is *Nocturne of Ash*, an original gothic action-platformer (2D pixel sprites in front
of lit 3D backgrounds). **All content must be original**: don't copy or imitate characters,
names or art from existing games or franchises.

---

## 1. Who she is

**The Bell-Mother**, matriarch of the harpies and boss of the Great Belfry (a ruined bell tower).
She flies the whole fight; she never lands.

- A gaunt, ash-grey **harpy crone**: corpse-grey skin, ribs and veins showing, long bony arms
  with hooked bone claws.
- Nude from the hips up, breasts shown (an agreed design choice; the game's tone is very dark,
  adult horror). From the hips down, ragged black plumage covers her loins and runs down to
  scaled bird legs with hooked talons.
- Her face draws forward into a long **hooked beak** lined with needle teeth. Hollow black eye
  with a single red pinpoint. Lank black hair down her back. A **crown of antler and bone**.
- Two big **tattered wings**: black feathers with rotted gaps, hung from bare bone along the
  leading edge (a knuckle at the wrist, small clawed fingers). The far wing is darker and higher.
- A small **rusted iron bell** hangs from a cord at her near hip. Bells are her whole theme:
  she "rings the dead awake" and her attacks are bell shockwaves.

Open to reinterpretation: proportions, pose quality, wing shape, detail, shading. Please keep
the things above (grey crone, beak, antler crown, bone-and-rag wings, bird legs, the bell).

## 2. Files to deliver (in `incoming/`)

| File | What |
|---|---|
| `bellmother_sheet.png` | The sprite sheet: every frame in **one row**, left to right, in the frame order below |
| `frames/<anim>_<n>.png` | *(optional)* the same frames as separate files, e.g. `fly_0.png` |
| `sheet.json` | Cell size, anchor and the animation list, same shape as `reference/sheet.json` (needed if anything differs from the defaults below) |
| `notes.md` | *(optional)* anything you changed or want to suggest |

## 3. Technical format (the hard limits)

| Property | Value |
|---|---|
| File type | **PNG, 32-bit RGBA** (8 bits per channel), non-interlaced |
| Frame (cell) size | **112 × 96 px** (current). May grow up to **128 × 112** if you need room; say so in `sheet.json` |
| Sheet layout | Frames packed left to right, no gaps or padding, top-left origin. 6 frames = 672 × 96 |
| Scale | **1 pixel = 1 game pixel.** Do *not* upscale. The game screen is only **384 × 224**, scaled up with crisp pixels |
| Facing | **Facing right.** The game mirrors her horizontally to face left |
| Anchor | Pixel **(56, 48)** of every frame (the center of a 112×96 cell). Her position in the world lands here, so keep her body centered on it in every frame or she will jitter |
| Hitbox | **40 × 48 px box centered on the anchor** (x 36..76, y 24..72 of the cell). Her torso/body should fill roughly this box; wings and crown can spill out (they don't hurt) |
| Transparency | **Binary alpha only: every pixel fully opaque (255) or fully transparent (0).** The game discards pixels under 50% alpha and draws the rest *fully* opaque, so soft edges turn into hard dark fringes |
| Anti-aliasing | **None.** No blur, no smoothing, no soft shadows, no glow baked in, no sub-pixel resampling |
| Outline | A 1-px outline around the whole silhouette in near-black **`#08040a`** (4-neighbor, not diagonal). Keep it: it separates her from the dark backgrounds |
| Background | Transparent. No drop shadow, no ground |
| Lighting | Light comes from the upper right / front (her near side is lit, the far side and the turned-away flank are in shadow). The 3D scene does **not** light sprites, so the colors you paint are exactly the colors shown |
| Edges of the cell | Keep everything inside the cell. (The current wings-up frames clip the wing tip at the left edge: a known flaw, feel free to fix it by fitting the wing in) |

## 4. Palette

The current sheet uses **37 colors** (`reference/bellmother_palette.png`, and every color with
its pixel count in `reference/sheet.json`). The named base colors from the code:

| Role | Colors |
|---|---|
| Skin (ash grey): base / shadow / light / deep shadow | `#a6a2aa` `#666072` `#d2ced4` `#3a3242` |
| Nipple / areola / veins | `#4a2236` `#7a5866` `#7a7092` |
| Hair: base / dark | `#1c1820` `#0a080c` |
| Wing feathers: base / dark / light / mid | `#1e1a20` `#0c0a0e` `#3a3440` `#2e2630` |
| Leg scales / talons / bone (wing bones, claws, crown) | `#3a3632` `#b0a080` `#d8ccb4` |
| Beak: horn / ridge light / open mouth / teeth | `#2e262c` `#6e6068` `#140408` `#e8e0d0` |
| Eye: socket / pinpoint | `#060406` `#ff2020` |
| Rusted bell: rust / dark rust | `#6a4a34` `#3a2a22` |
| Outline | `#08040a` |

The other colors are darker copies of these for the far wing and far leg.

**Limits:** stay at or under about **48 colors**, flat pixel-art shading (no gradients). Keep
the mood: desaturated, cold and grey, near-black feathers, bone accents, with the **red eye as
the only saturated color**. You may adjust shades or add a few, but list your final palette in
`sheet.json`.

Things the game does to the colors (so plan for them):
- **Hit flash:** the whole sprite flashes white for a few frames when hit.
- **Second phase (below half HP):** her colors are multiplied by **R×1.2, G×0.9, B×0.85**
  (a reddish, angrier tint). Very bright reds will clip to pure red.
- **Glow:** while ringing the bell, her colors are brightened additively (up to +60%). Very
  light colors will wash out to white.
- **Death:** she fades out and wobbles (rotates ±11°) as she falls. Done in code, no frames needed.

## 5. Animations and frames

The game runs at **60 updates per second**. Frame order in the sheet:

| Index | Name | Pose | Used for |
|---|---|---|---|
| 0 | `fly_0` | wings **fully up** | hovering, flying |
| 1 | `fly_1` | wings partway up | |
| 2 | `fly_2` | wings **down** (the power stroke) | |
| 3 | `fly_3` | wings level | |
| 4 | `dive_0` | swooping: body leans forward, legs tucked and trailing back, wings swept back | the swoop attack, and her death fall |
| 5 | `cast_0` | both arms raised overhead, beak open screaming, wings raised high | firing feather darts, ringing the bell (shockwaves), summoning harpies, the intro freeze frame |

- **`fly`** loops 0→1→2→3 at **one frame every 7 updates (~8.5 fps)**, faster (every 5, 12 fps)
  when she rages at half HP. Smooth wingbeat cycle, body bobbing slightly is fine, but the body
  must stay on the anchor.
- **`dive`** and **`cast`** are single held poses right now.

### Optional extras (welcome, not required)

The fight currently reuses those 6 frames for everything. If you want to add more, these would
help most, and the code will be updated to use them. Keep the same naming (`<anim>_<n>`) and
list them in `sheet.json`:

| Suggested anim | Frames | Where it would play |
|---|---|---|
| `fly` | 6–8 instead of 4 | a smoother wingbeat |
| `dive` | 2–3 | wing flutter during the swoop |
| `screech` | 2 | the wind-up before a swoop (head thrown back, beak open) |
| `cast` | 2–3 | arms rising, then the scream (instead of snapping into the pose) |
| `toll` | 2–3 | striking the bell at her hip, for the shockwave attack |
| `hurt` | 1 | a flinch when hit hard |
| `death` | 2–4 | crumpling as she falls (the fade and wobble stay in code) |

## 6. What's in `reference/`

| File | What |
|---|---|
| `bellmother_sheet.png` | The current sheet, exactly as the game uses it (672 × 96, 6 frames) |
| `bellmother_sheet_x4.png` | The same, 4× bigger on a dark background, for viewing only |
| `bellmother_guide_x4.png` | 4× with the **anchor (cyan cross)** and **hitbox (magenta box)** on every frame |
| `frames/`, `frames_x4/` | Each frame alone, 1× and 4× |
| `bellmother_palette.png` | Every color in the sheet, most used first |
| `scale_vs_hero_x4.png` | Her first fly frame next to the player character, to show relative size (the hero is 48 × 48 px, about 36 px tall) |
| `sheet.json` | Cell size, anchor, hitbox, frame list, animations and the full palette with counts |
| `portraits/` | Her **dialogue portraits** (64 × 64; `neutral`, `smile`, `angry`), shown in the talk box. A separate anime-style bust with its own lilac palette. Not part of this job, but a redraw in the same 64 × 64 format would also be welcome |

The 1× files are the source of truth; the 4× files are only for looking at.

## 7. Checklist before handing back

- [ ] PNG, RGBA, 1× scale, binary alpha (only 0 or 255), no anti-aliasing
- [ ] 112 × 96 cells (or the larger size you put in `sheet.json`), packed in one row
- [ ] Facing right, body centered on the anchor in every frame
- [ ] Body roughly fills the 40 × 48 hitbox
- [ ] 1-px `#08040a` outline, nothing touching or clipped by the cell edges
- [ ] The 6 required frames in order: `fly_0..3`, `dive_0`, `cast_0` (extras after them)
- [ ] ≤ ~48 colors, final palette listed, the red eye the only strong color
- [ ] Original design: nothing traced or copied from existing games
