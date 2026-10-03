// The mini-bosses' art in one table (0.28.0): each one's puppet sheet and its props sheet, both
// built the first time something asks (see lazy.ts). The game, the enemy editor and
// bosses.html all read this.
import { SheetBuilder } from '../pixel';
import { Sheet } from '../view';
import { lazySheet } from '../lazy';
import { buildHeadsmanSheet, buildHeadsmanProps } from './headsman';
import { buildLycanSheet, buildLycanProps } from './lycan';
import { buildUnhelmedSheet, buildUnhelmedProps } from './unhelmed';
import { buildBullSheet, buildBullProps } from './bull';
import { buildGargoyleSheet, buildGargoyleProps } from './gargoyle';
import { buildWardenSheet, buildWardenProps } from './warden';
import { buildDuchessSheet, buildDuchessProps } from './duchess';
import { buildBruteSheet, buildBruteProps } from './brute';

export interface MiniArt {
  /** What bosses.html says about the sprite. */
  note: string;
  sheet: () => SheetBuilder;
  props: () => SheetBuilder;
}

export const MINI_ART: Record<string, MiniArt> = {
  headsman: {
    note: 'A hooded executioner: bare scarred chest, blood-stiff apron, a crescent axe and a gibbet cage on a chain.',
    sheet: buildHeadsmanSheet,
    props: buildHeadsmanProps,
  },
  lycan: {
    note: 'A mangy grey werewolf on wolf legs, torn shackles on its wrists and a length of chain it swings like a flail.',
    sheet: buildLycanSheet,
    props: buildLycanProps,
  },
  unhelmed: {
    note: 'A headless knight in blackened, gilt-edged plate. Blue fire burns out of his collar; he carries his own head in an iron lantern.',
    sheet: buildUnhelmedSheet,
    props: buildUnhelmedProps,
  },
  bull: {
    note: 'A minotaur of crypt bones bound in iron, a coal of a heart in its open ribcage, a nose ring and a reliquary maul.',
    sheet: buildBullSheet,
    props: buildBullProps,
  },
  gargoyle: {
    note: 'A living rain-spout: slate hide, bat wings, ram horns, a spade-tailed whip. It sets into granite when it drops on you, and cracks with ember light as it is hurt (_1, _2 sets).',
    sheet: buildGargoyleSheet,
    props: buildGargoyleProps,
  },
  warden: {
    note: 'A plague doctor: beaked mask with green lenses, wide hat, tarred coat, a bandolier of vials, a smoking censer-cane and a bone saw.',
    sheet: buildWardenSheet,
    props: buildWardenProps,
  },
  duchess: {
    note: 'A vampire noblewoman: waxen skin, red eyes, a winged collar, a black and wine gown, a lace fan, and a lash of her own blood. Bursts into bats.',
    sheet: buildDuchessSheet,
    props: buildDuchessProps,
  },
  brute: {
    note: 'A flesh golem stitched from discarded parts: one huge grey arm, one pale human one, bolts in the neck, a riveted skull, sparking copper electrodes.',
    sheet: buildBruteSheet,
    props: buildBruteProps,
  },
};

/** A mini-boss's body sheet (undefined for any other id). */
export function miniSheet(id: string): Sheet | undefined {
  const a = MINI_ART[id];
  return a && lazySheet(id, a.sheet);
}
/** A mini-boss's props sheet. */
export function miniProps(id: string): Sheet {
  return lazySheet(id + '_props', MINI_ART[id].props);
}
