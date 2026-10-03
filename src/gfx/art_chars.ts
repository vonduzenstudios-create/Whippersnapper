// What the two-legged puppets share: the pose of the old skeletal rig, and the hunters' cell.
// (The rig's own drawing code is gone: the twins are drawn in art_hunter.ts and the enemies
// that used it in art_folk.ts, both with form shading.)

/** Joint angles for a figure seen from the side, facing right. */
export interface Pose {
  hx: number; // hip position in the cell
  hy: number;
  lean: number; // torso angle, + leans forward (right)
  fl: [number, number]; // front leg [thigh angle from down (+ forward), knee bend]
  bl: [number, number];
  fa: [number, number]; // front arm [shoulder angle from down (+ forward), elbow bend]
  ba: [number, number];
  coat?: number; // coat tail flare in px
  hair?: number; // hair lift in px
  scarf?: number; // scarf flutter phase
  headDy?: number;
  mouth?: number;
}

export const HERO_W = 48, HERO_H = 48, HERO_AX = 24, HERO_AY = 28, HERO_FEET = 46;
export const ATTACK_DIRS = [90, 135, 178, 45, 4]; // fwd, upfwd, up, downfwd, down
