// The ten trial bosses' art in one table (0.27.0): each one's puppet sheet (built the first
// time it is needed, see lazy.ts), its prop sheets, and its two dialogue portraits. The game,
// the enemy editor and bosses.html all read this.
import { PixelCanvas, SheetBuilder } from './pixel';
import { Sheet } from './view';
import { lazySheet } from './lazy';
import { buildCastellanSheet, buildCastellanProps, buildClockFace, castellanPortrait } from './art_castellan';

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
