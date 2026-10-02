// Global constants for Nocturne of Ash
export const VW = 384; // internal render width (pixels)
export const VH = 224; // internal render height (pixels)
export const TILE = 16;
export const SCREEN_COLS = 24; // one map cell = 24 x 14 tiles
export const SCREEN_ROWS = 14;
export const CELL_W = SCREEN_COLS * TILE; // 384
export const CELL_H = SCREEN_ROWS * TILE; // 224
export const STEP = 1 / 60;

export const GRAVITY = 0.32;
export const MAX_FALL = 6.5;

export const SAVE_KEY = 'nocturne_of_ash_save_v1';
export const BIND_KEY = 'nocturne_of_ash_binds_v1';
