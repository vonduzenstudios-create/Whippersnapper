// /bosses.html: the expansion boss sprites, animated, with every frame listed (click one to play it).
import { SheetBuilder } from './gfx/pixel';
import { TRIAL_ART } from './gfx/art_trials';
import { MINI_ART } from './gfx/minis';
import { buildHoundSheet, buildCinderHoundSheet } from './gfx/art_hound';
import { buildBellMotherSheet } from './gfx/art_bellmother';
import { buildWyrmSheet, buildWyrmBodySheet } from './gfx/art_wyrm';
import { buildSerpentSheet, buildFigureSheet } from './gfx/art_depths';
import { buildRimehideSheet, buildRimePropSheet } from './gfx/art_rimehide';
import { buildIronKnightSheet, buildFoundrySheet } from './gfx/art_ironknight';
import { buildStoneBrideSheet, buildRotundaSheet } from './gfx/art_stonebride';
import { buildLockWyrmSheet, buildLockWyrmBodySheet, buildLockPropSheet } from './gfx/art_lockwyrm';
import { buildLeviathanSheet, buildGorgonSheet, buildColossusSheet, buildYetiSheet, buildArchivistSheet, buildPropSheet, buildTallPropSheet } from './gfx/art_bosses2';

interface Option { name: string; note: string; sheet: SheetBuilder; anim: string }

const groups: { title: string; options: Option[] }[] = [
  {
    title: 'The Ossuary Wyrm, bone serpent',
    options: [
      { name: 'Skull', note: 'Form shaded (0.21.0), drawn again for each of 32 headings so it is never rotated: jaw0 to jaw3 are the jaw shut to wide. Click a frame to watch that jaw turn through every heading.', sheet: buildWyrmSheet(), anim: 'jaw2' },
      { name: 'Vertebrae and tail', note: 'Ribbed and plain vertebrae in four sizes, and the tail blade, each for 32 headings.', sheet: buildWyrmBodySheet(), anim: 'rib0' },
    ],
  },
  {
    title: 'Gnarlfang, the two-headed hound',
    options: [
      { name: 'Form 1: Flayed', note: 'Skinned red muscle with bulging purple veins, a towering shoulder hump, bone spurs down the spine, a blinded second head, iron collar and broken chain.', sheet: buildHoundSheet(), anim: 'walk' },
      { name: 'Form 2: Cinder', note: 'What rises after you "kill" it. Black bloated hide split by veins of fire, horns, spikes in its back, a torn-open ribcage glowing with embers, and a second head that is only a burning skull.', sheet: buildCinderHoundSheet(), anim: 'walk' },
    ],
  },
  {
    title: 'The Bell-Mother, harpy matron',
    options: [
      { name: 'The Bell-Mother', note: 'A jointed puppet with form shading (0.20.0). Pale lilac skin, violet-black plumage with ash tips, gold eyes, a feather crest, a bronze bell at her throat. Animations: fly, cast, dive, fall, stunned.', sheet: buildBellMotherSheet(), anim: 'fly' },
    ],
  },
];

groups.push({
  title: 'The newer bosses (redrawn in 0.19.0)',
  options: [
    { name: 'The Sump Leviathan', note: 'A blind giant eel: head, body segments and tail strung together by the boss.', sheet: buildLeviathanSheet(), anim: 'swim' },
    { name: 'Ysolde, the Stone Bride', note: 'A gorgon in a tattered wedding veil, asps for hair, on a serpent\'s coils.', sheet: buildGorgonSheet(), anim: 'idle' },
    { name: 'The Hollow Colossus', note: 'A giant suit of armor in pieces: torso, helm, gauntlets, legs and the furnace core.', sheet: buildColossusSheet(), anim: 'idle' },
    { name: 'Arena props', note: 'Wheels, spike racks, bellows, the anvil, bells, anchors, crystals, vents, ice cracks.', sheet: buildPropSheet(), anim: 'wheel' },
    { name: 'Tall props', note: 'A petrified suitor, a standing mirror, the furnace heart.', sheet: buildTallPropSheet(), anim: 'core' },
    { name: 'Old Rimehide', note: 'The white beast of the summit: ram horns, a blue face.', sheet: buildYetiSheet(), anim: 'walk' },
    { name: 'The Head Archivist', note: 'A skull in spectacles and a judge\'s robe, floating.', sheet: buildArchivistSheet(), anim: 'idle' },
    { name: 'Storybook figures', note: 'Pirate (Adventure), duelist (Romance), golem (Horror), sleuth (Mystery).', sheet: buildFigureSheet(), anim: 'pirate' },
    { name: 'Temple Asp', note: 'The Serpent Temple\'s own enemy.', sheet: buildSerpentSheet(), anim: 'slither' },
  ],
});

// the trial bosses (0.27.0): test-chamber fights that are not in the world yet
groups.push({
  title: 'Trial bosses (0.27.0, test chamber only)',
  options: [
    { name: 'Old Rimehide (puppet)', note: 'Form-shaded puppet: bare-handed, with an ice pillar, and with a mammoth tusk.', sheet: buildRimehideSheet(), anim: 'walk' },
    { name: 'The Sump Leviathan (head)', note: 'Form shaded, drawn again for each of 16 headings: jaw0 to jaw2.', sheet: buildLockWyrmSheet(), anim: 'jaw1' },
    { name: 'Leviathan body', note: 'Three sizes of segment and the tail fin, 16 headings x 2 fin beats each; the harpoon.', sheet: buildLockWyrmBodySheet(), anim: 'seg0' },
    { name: 'The Sunken Lock', note: 'Lock gate, counterweight, winch pawl.', sheet: buildLockPropSheet(), anim: 'pawl' },
    { name: 'Ysolde (serpent puppet)', note: 'Veiled, torn, and turned to stone. Sixteen tail segments and seven asps, each on its own clock.', sheet: buildStoneBrideSheet(), anim: 'idle' },
    { name: 'The Rotunda', note: 'Bronze mirror discs (away, turning, facing, blackened), a column drum, stone thorns.', sheet: buildRotundaSheet(), anim: 'disc' },
    { name: 'The Hollow Colossus (walking puppet)', note: 'Plated, and bare (the furnace fire in a cage of iron bands).', sheet: buildIronKnightSheet(), anim: 'walk' },
    { name: 'The Foundry', note: 'Crane ladle, quench trough, floor grate, molten channel.', sheet: buildFoundrySheet(), anim: 'ladle' },
    { name: 'His dens', note: 'Snow boulder, the frozen falls, rubble, ice pillar, vent, ribs, the hanging tusk, a carcass, the mammoth skull.', sheet: buildRimePropSheet(), anim: 'rib' },
  ],
});

// the ten new trial bosses: every puppet, its props and its two portraits (gfx/art_trials.ts)
for (const [id, a] of Object.entries(TRIAL_ART)) {
  const faces = new SheetBuilder(64, 64, 32, 32);
  faces.add('neutral', a.portrait(false));
  faces.add('angry', a.portrait(true));
  groups.push({
    title: `Trial boss: ${id}`,
    options: [
      { name: id, note: a.note, sheet: a.sheet(), anim: 'idle' },
      ...a.props.map(([name, build, anim]) => ({ name, note: 'Arena props.', sheet: build(), anim })),
      { name: 'Portraits', note: 'Cut from the puppet, drawn large.', sheet: faces, anim: 'neutral' },
    ],
  });
}
// the mini-bosses (0.31.0): enemies, not in any room yet. Built only when shown (?only=<name>), they are many frames.
const ONLY = new URLSearchParams(location.search).get('only')?.toLowerCase();
groups.push({
  title: 'Mini-bosses (0.31.0, enemy editor and TEST ENEMY)',
  options: Object.entries(MINI_ART)
    .filter(([id]) => !ONLY || ONLY === 'mini' || id.includes(ONLY))
    .flatMap(([id, a]) => [
      { name: id, note: a.note, sheet: a.sheet(), anim: 'idle' },
      { name: id + ' props', note: 'What it throws.', sheet: a.props(), anim: Object.keys(a.props().anims)[0] },
    ]),
});

const root = document.getElementById('root')!;
const zoomInput = document.getElementById('zoom') as HTMLInputElement;
const players: { cv: HTMLCanvasElement; sheet: SheetBuilder; frames: HTMLCanvasElement[]; anim: string }[] = [];

const only = new URLSearchParams(location.search).get('only')?.toLowerCase();
const frameCanvas = (sheet: SheetBuilder, i: number) => sheet.frames[i].toCanvas();

for (const g of groups) {
  const h = document.createElement('h2');
  h.textContent = g.title;
  root.appendChild(h);
  const row = document.createElement('div');
  row.className = 'row';
  for (const o of g.options) {
    if (only && !(g.title + ' ' + o.name).toLowerCase().includes(only)) continue; // ?only=flayed shows one option
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${o.name}</h3><p>${o.note}</p>`;
    const cv = document.createElement('canvas');
    card.appendChild(cv);
    // every animation, one small frame each
    const strip = document.createElement('div');
    strip.className = 'strip';
    for (const [anim, idx] of Object.entries(o.sheet.anims))
      idx.forEach((fi, k) => {
        const fig = document.createElement('figure');
        const c = frameCanvas(o.sheet, fi);
        c.style.width = c.width * 2 + 'px';
        c.style.cursor = 'pointer';
        c.title = 'Play ' + anim;
        fig.appendChild(c);
        fig.append(idx.length > 1 ? `${anim} ${k + 1}` : anim);
        c.onclick = () => (player.anim = anim);
        strip.appendChild(fig);
      });
    card.appendChild(strip);
    row.appendChild(card);
    const player = { cv, sheet: o.sheet, frames: o.sheet.frames.map((f) => f.toCanvas()), anim: o.anim };
    players.push(player);
  }
  root.appendChild(row);
}

let tick = 0;
function render() {
  const z = +zoomInput.value;
  for (const pl of players) {
    const idx = pl.sheet.anims[pl.anim];
    const f = pl.frames[idx[Math.floor(tick / (idx.length > 8 ? 4 : 8)) % idx.length]]; // long cycles are in-betweened, so play them faster
    if (pl.cv.width !== f.width * z) {
      pl.cv.width = f.width * z;
      pl.cv.height = f.height * z;
    }
    const ctx = pl.cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, pl.cv.width, pl.cv.height);
    ctx.drawImage(f, 0, 0, f.width * z, f.height * z);
  }
  tick++;
  requestAnimationFrame(render);
}
render();
