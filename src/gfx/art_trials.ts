// The ten trial bosses' art in one table (0.27.0): each one's puppet sheet (built the first
// time it is needed, see lazy.ts), its prop sheets, and its two dialogue portraits. The game,
// the enemy editor and bosses.html all read this.
import { PixelCanvas, SheetBuilder } from './pixel';
import { Sheet } from './view';
import { lazySheet } from './lazy';
import { buildMarionetteSheet, buildHandSheet, buildStageProps, buildCurtain, marionettePortrait } from './art_marionette';
import { buildSaintSheet, buildSaintProps, buildRoseWindow, saintPortrait } from './art_saint';
import { buildStalkerSheet, buildLanternSheet, stalkerPortrait } from './art_stalker';
import { buildReaperSheet, buildFieldProps, buildSickle, buildMoon, reaperPortrait } from './art_reaper';
import { buildBaronSheet, buildBaronProps, baronPortrait } from './art_baron';
import { buildCastellanSheet, buildCastellanProps, buildClockFace, castellanPortrait } from './art_castellan';
import { buildStarReaderSheet, buildOrreryProps, buildOrbits, starreaderPortrait } from './art_starreader';
import { buildMillerSheet, buildMillProps, buildSails, millerPortrait } from './art_miller';
import { buildMawtoadSheet, buildBogProps, mawtoadPortrait } from './art_mawtoad';
import { buildAbbessSheet, buildGlasshouseProps, abbessPortrait } from './art_abbess';

export interface TrialArt {
  /** What bosses.html says about the sprite. */
  note: string;
  sheet: () => SheetBuilder;
  /** `portrait(true)` is the angry face. */
  portrait: (angry: boolean) => PixelCanvas;
  /** Its arena props: [name on bosses.html, builder, animation to show]. */
  props: [string, () => SheetBuilder, string][];
}

export const TRIAL_ART: Record<string, TrialArt> = {
  castellan: {
    note: 'A clockwork knight in blued steel and brass: a dial in his chest, a winding key in his back, a halberd.',
    sheet: buildCastellanSheet,
    portrait: castellanPortrait,
    props: [['Gears and the pendulum', buildCastellanProps, 'gear'], ['The clock face', buildClockFace, 'face']],
  },
  marionette: {
    note: 'A porcelain dancer with ball joints, a cracked cheek and a bladed fan in each hand.',
    sheet: buildMarionetteSheet,
    portrait: marionettePortrait,
    props: [["The puppeteer's hands", buildHandSheet, 'open'], ['Sandbag', buildStageProps, 'bag'], ['Curtain', buildCurtain, 'curtain']],
  },
  saint: {
    note: 'A gaunt priest in ash-white vestments and a tall mitre, eyes bound, embers at his throat.',
    sheet: buildSaintSheet,
    portrait: saintPortrait,
    props: [['Censers', buildSaintProps, 'lit'], ['Rose window', buildRoseWindow, 'rose']],
  },
  stalker: {
    note: 'A lank four-legged shadow with a bone mask, ember eyes, a mane of smoke and a whip of a tail.',
    sheet: buildStalkerSheet,
    portrait: stalkerPortrait,
    props: [['Lanterns', buildLanternSheet, 'lit']],
  },
  reaper: {
    note: 'A scarecrow in a ragged coat and a wide hat, a stitched sack for a face, a lantern at his belt, a scythe.',
    sheet: buildReaperSheet,
    portrait: reaperPortrait,
    props: [['Wheat', buildFieldProps, 'tall'], ['Sickle', buildSickle, 'sickle'], ['Harvest moon', buildMoon, 'moon']],
  },
  baron: {
    note: 'A stout old gunner: greatcoat, tricorn, a peg leg, a bandolier of bombs, a hand mortar on his shoulder.',
    sheet: buildBaronSheet,
    portrait: baronPortrait,
    props: [['Bombs, kegs and powder', buildBaronProps, 'keg']],
  },
  starreader: {
    note: 'A stooped astrologer in a midnight robe sewn with constellations, a long beard, a tall bent hat, a staff with an armillary sphere.',
    sheet: buildStarReaderSheet,
    portrait: starreaderPortrait,
    props: [['Orrery planets', buildOrreryProps, 'planet0'], ['Orbits', buildOrbits, 'orbits']],
  },
  miller: {
    note: 'A huge flour-pale miller in a leather cap and apron, a great bellows on his back and a horn-mouthed hose in his fists.',
    sheet: buildMillerSheet,
    portrait: millerPortrait,
    props: [['Millstone', buildMillProps, 'stone'], ['Sails', buildSails, 'sails']],
  },
  mawtoad: {
    note: 'A toad the size of a cart: warty olive back, pale belly, a swelling throat sac and a mouth that is most of its head.',
    sheet: buildMawtoadSheet,
    portrait: mawtoadPortrait,
    props: [['Reeds, pods and stumps', buildBogProps, 'pod']],
  },
  abbess: {
    note: 'A tall nun in a habit of old leaves, a white wimple, a crown of thorns, roses on her shoulders, roots for feet and a briar for a whip.',
    sheet: buildAbbessSheet,
    portrait: abbessPortrait,
    props: [['Hearts, briar and thorns', buildGlasshouseProps, 'heart']],
  },
};

/** A trial boss's sheet (undefined for any other id). */
export function trialSheet(id: string): Sheet | undefined {
  const a = TRIAL_ART[id];
  return a && lazySheet(id, a.sheet);
}

/** `<id>_neutral` and `<id>_angry` for every trial boss (64x64). */
export function trialPortraits(): Record<string, PixelCanvas> {
  const out: Record<string, PixelCanvas> = {};
  for (const [id, a] of Object.entries(TRIAL_ART)) {
    out[`${id}_neutral`] = a.portrait(false);
    out[`${id}_angry`] = a.portrait(true);
  }
  return out;
}
