// /bosses.html: the expansion boss sprites, animated, with every frame listed (click one to play it).
import { SheetBuilder } from './gfx/pixel';
import { buildHoundSheet, buildCinderHoundSheet, buildBellMotherSheet } from './gfx/art_bosses';
import { buildSerpentSheet, buildFigureSheet } from './gfx/art_depths';
import { buildLeviathanSheet, buildGorgonSheet, buildColossusSheet, buildYetiSheet, buildArchivistSheet, buildPropSheet, buildTallPropSheet } from './gfx/art_bosses2';

interface Option { name: string; note: string; sheet: SheetBuilder; anim: string }

const groups: { title: string; options: Option[] }[] = [
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
      { name: 'The Bell-Mother', note: 'Gaunt ash-grey harpy crone, bare-breasted, veins and ribs showing. A hooked beak of a face with needle teeth, hollow red-pinpoint eyes, lank black hair, antler crown, tattered wings on bare bone, a rusted bell at her hip.', sheet: buildBellMotherSheet(), anim: 'fly' },
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
    const f = pl.frames[idx[Math.floor(tick / 8) % idx.length]];
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
