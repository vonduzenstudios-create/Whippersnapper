// The in-game status display (health, sub-weapon, hearts), in three styles picked in
// OPTIONS: the classic strip in the top-left corner, or one of two "demonic" layouts built
// round a glass orb of blood in the bottom-left corner that drains as she's hurt.
import { VH } from '../config';
import { drawText } from '../gfx/font';
import { ITEMS } from '../game/data';
import type { Sheet } from '../gfx/view';
import type { Hunter } from '../game/stats';

export type HudStyle = 'classic' | 'socket' | 'ring';
export const HUD_STYLES: { id: HudStyle; name: string; desc: string }[] = [
  { id: 'classic', name: 'CLASSIC', desc: 'SUB-WEAPON AND HEALTH BAR, TOP LEFT' },
  { id: 'socket', name: 'DEMONIC I', desc: 'BLOOD ORB WITH A SUB-WEAPON SOCKET' },
  { id: 'ring', name: 'DEMONIC II', desc: 'BLOOD ORB RINGED WITH HEART PIPS' },
];

// The choice is a setting of this browser, not of the save (like the key bindings).
const HUD_KEY = 'noa_hud_style';
export function loadHudStyle(): HudStyle {
  try {
    const s = localStorage.getItem(HUD_KEY);
    if (HUD_STYLES.some((h) => h.id === s)) return s as HudStyle;
  } catch {
    // storage blocked: just use the default
  }
  return 'classic';
}
export function saveHudStyle(s: HudStyle) {
  try {
    localStorage.setItem(HUD_KEY, s);
  } catch {
    // storage blocked: the choice lasts until the page closes
  }
}

const GOLD = '#d8b060';
const PALE = '#e8dcc8';
const BRASS = '#8a6a3a';
const HEART = '#e0203c';

/** What the HUD needs from the UI: the drawing context, the item sheet and a frame counter. */
export interface HudCtx {
  ctx: CanvasRenderingContext2D;
  items: Sheet;
  t: number;
}

/** A filled pixel circle (row by row, so the edge stays crisp instead of anti-aliased). */
function disc(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  c.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
    c.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

/** The sub-weapon's icon (16 x 16), centered on (cx, cy). */
function subIcon(H: HudCtx, h: Hunter, cx: number, cy: number) {
  if (!h.sub) return;
  const sh = H.items, idx = sh.anims[ITEMS[h.sub].icon]?.[0];
  if (idx === undefined) return;
  H.ctx.drawImage(sh.tex.image as HTMLCanvasElement, (idx % sh.cols) * sh.cw, Math.floor(idx / sh.cols) * sh.ch, sh.cw, sh.ch, cx - 8, cy - 8, sh.cw, sh.ch);
}

/** One pip per unlocked sub-weapon, the selected one lit, in a row centered on cx. */
function subPips(c: CanvasRenderingContext2D, h: Hunter, cx: number, y: number) {
  if (h.subs.length < 2) return;
  const x0 = cx - h.subs.length * 2;
  h.subs.forEach((id, i) => {
    c.fillStyle = '#000';
    c.fillRect(x0 + i * 4 - 1, y - 1, 5, 4);
    c.fillStyle = id === h.sub ? '#f0d070' : '#5a4a50';
    c.fillRect(x0 + i * 4, y, 3, 2);
  });
}

/** True while health is low enough to flash a warning. */
const lowBlink = (H: HudCtx, h: Hunter) => h.hp / h.maxHp < 0.25 && H.t % 30 < 15;

export function drawHud(H: HudCtx, h: Hunter, style: HudStyle) {
  if (style === 'classic') classic(H, h);
  else demonic(H, h, style);
}

// ---------------------------------------------------------------- classic

/**
 * A round brass frame holding the sub-weapon in the corner, the health bar running off to
 * its right (longer as her max HP grows), and the heart count under the frame.
 */
function classic(H: HudCtx, h: Hunter) {
  const c = H.ctx, cx = 17, cy = 17;
  // health bar first, so the frame overlaps its end
  const w = Math.round(Math.min(160, Math.max(80, 50 + h.maxHp * 0.45)));
  const x = cx + 8, y = 12, bh = 7;
  c.fillStyle = '#000';
  c.fillRect(x - 1, y - 2, w + 3, bh + 4);
  c.fillStyle = BRASS;
  c.fillRect(x, y - 1, w + 1, 1);
  c.fillRect(x, y + bh, w + 1, 1);
  c.fillRect(x + w, y - 1, 1, bh + 2);
  c.fillStyle = '#2a0e18';
  c.fillRect(x, y, w, bh);
  const fw = Math.round(w * Math.max(0, Math.min(1, h.hp / h.maxHp)));
  c.fillStyle = lowBlink(H, h) ? '#ff6070' : '#c01830';
  c.fillRect(x, y, fw, bh);
  c.fillStyle = '#e04050';
  c.fillRect(x, y + 1, fw, 2);
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fillRect(x, y, fw, 1);
  c.fillStyle = '#6a0a18';
  c.fillRect(x, y + bh - 1, fw, 1);
  // the round frame
  disc(c, cx, cy, 14, '#000');
  disc(c, cx, cy, 13, BRASS);
  disc(c, cx, cy, 12, GOLD);
  disc(c, cx, cy, 11, '#3a2416');
  disc(c, cx, cy, 10, '#140a14');
  c.fillStyle = 'rgba(255,240,200,0.5)';
  c.fillRect(cx - 7, cy - 11, 5, 1);
  subIcon(H, h, cx, cy);
  // hearts under the frame, sub-weapon pips under the bar
  drawText(c, '@', cx - 9, cy + 16, HEART);
  drawText(c, String(h.hearts).padStart(2, '0'), cx - 2, cy + 16, PALE);
  subPips(c, h, x + 10, y + bh + 4);
}

// ---------------------------------------------------------------- demonic

const ORB_R = 24;
const ORB = { x: 4 + ORB_R + 2, y: VH - 4 - ORB_R - 2 };
// DEMONIC II's orb sits further in, to leave room for the heart pips round its rim
const RING_ORB = { x: ORB.x + 8, y: ORB.y - 4 };

/**
 * The blood orb: a brass-rimmed glass ball whose red fills from the bottom up to her share
 * of health, with a lighter rippling surface and a glint on the glass.
 */
function orb(H: HudCtx, h: Hunter, at = ORB) {
  const c = H.ctx, { x: cx, y: cy } = at, r = ORB_R;
  disc(c, cx, cy, r + 3, '#000');
  disc(c, cx, cy, r + 2, BRASS);
  disc(c, cx, cy, r + 1, '#2a1a10');
  disc(c, cx, cy, r, '#12060a');
  const frac = Math.max(0, Math.min(1, h.hp / h.maxHp));
  const level = cy + r - Math.round(frac * r * 2); // y of the surface
  const low = lowBlink(H, h);
  for (let y = -r; y <= r; y++) {
    const py = cy + y;
    const wave = Math.round(Math.sin(H.t * 0.08 + y) * 0.6);
    if (py < level + wave) continue;
    const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
    // darker toward the bottom, a bright band at the surface
    const depth = (py - level) / (r * 2);
    c.fillStyle = py <= level + 1 ? (low ? '#ff8090' : '#ff5060') : low ? '#e03048' : depth < 0.35 ? '#c01828' : depth < 0.7 ? '#9a1020' : '#6a0816';
    c.fillRect(cx - w, py, w * 2 + 1, 1);
  }
  // glass: a curved glint top-left and a faint rim shine bottom-right
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillRect(cx - 13, cy - 16, 6, 2);
  c.fillRect(cx - 16, cy - 13, 2, 5);
  c.fillRect(cx - 11, cy - 18, 3, 1);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(cx + 9, cy + 14, 6, 1);
  // four studs on the rim
  c.fillStyle = GOLD;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) c.fillRect(cx + dx * (r + 2) - 1, cy + dy * (r + 2) - 1, 2, 2);
}

function demonic(H: HudCtx, h: Hunter, style: HudStyle) {
  if (style === 'socket') socketStyle(H, h);
  else ringStyle(H, h);
}

/**
 * DEMONIC I: the orb, with a round stone socket on a bracket off its right side holding the
 * sub-weapon, and the heart count on a little stone plaque under the socket.
 */
function socketStyle(H: HudCtx, h: Hunter) {
  const c = H.ctx, sx = ORB.x + ORB_R + 14, sy = ORB.y + 4;
  // bracket from the rim to the socket
  c.fillStyle = '#000';
  c.fillRect(ORB.x + ORB_R, sy - 3, 8, 6);
  c.fillStyle = BRASS;
  c.fillRect(ORB.x + ORB_R, sy - 2, 8, 4);
  orb(H, h);
  // the socket
  disc(c, sx, sy, 12, '#000');
  disc(c, sx, sy, 11, '#4a4048');
  disc(c, sx, sy, 10, '#2a2228');
  disc(c, sx, sy, 9, '#0c080c');
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(sx - 6, sy - 8, 4, 1);
  subIcon(H, h, sx, sy);
  subPips(c, h, sx, sy - 16);
  // the plaque
  const txt = String(h.hearts).padStart(2, '0'), pw = 26, px = sx - pw / 2, py = sy + 12;
  c.fillStyle = '#000';
  c.fillRect(px - 1, py - 1, pw + 2, 12);
  c.fillStyle = '#5a5058';
  c.fillRect(px, py, pw, 10);
  c.fillStyle = '#3a3238';
  c.fillRect(px + 1, py + 1, pw - 2, 8);
  drawText(c, '@', px + 2, py + 2, HEART, null);
  drawText(c, txt, px + 9, py + 2, PALE, null);
}

const PIPS = 18; // heart pips round the rim
const GEM_A = -0.8; // where on the rim the sub-weapon gem sits (radians; up and to the right)

/**
 * DEMONIC II: the orb, with the sub-weapon in a smaller gem set into its rim (up and to the
 * right) and the hearts as a ring of tiny pips round the rest of the rim's upper half, lit
 * as a share of her heart capacity. The exact count sits small beside the orb.
 */
function ringStyle(H: HudCtx, h: Hunter) {
  const c = H.ctx, { x: cx, y: cy } = RING_ORB;
  orb(H, h, RING_ORB);
  // pips from the left of the orb over the top, stopping short of the gem
  const a0 = Math.PI * 0.95, a1 = Math.PI * 2 + GEM_A - 0.42, pr = ORB_R + 6;
  const lit = Math.round((Math.min(h.hearts, h.maxHearts) / Math.max(1, h.maxHearts)) * PIPS);
  for (let i = 0; i < PIPS; i++) {
    const a = a0 + ((a1 - a0) * i) / (PIPS - 1);
    const px = Math.round(cx + Math.cos(a) * pr), py = Math.round(cy + Math.sin(a) * pr);
    c.fillStyle = '#000';
    c.fillRect(px - 2, py - 2, 4, 4);
    c.fillStyle = i < lit ? (i === lit - 1 && H.t % 40 < 20 ? '#ff7088' : HEART) : '#3a1820';
    c.fillRect(px - 1, py - 1, 2, 2);
  }
  // the gem
  const gx = Math.round(cx + Math.cos(GEM_A) * (ORB_R + 3)), gy = Math.round(cy + Math.sin(GEM_A) * (ORB_R + 3));
  disc(c, gx, gy, 11, '#000');
  disc(c, gx, gy, 10, GOLD);
  disc(c, gx, gy, 9, '#2a1838');
  disc(c, gx, gy, 8, '#100818');
  c.fillStyle = 'rgba(220,200,255,0.35)';
  c.fillRect(gx - 5, gy - 7, 3, 1);
  subIcon(H, h, gx, gy);
  subPips(c, h, gx + 19, gy + 6);
  drawText(c, '@', cx + ORB_R + 6, cy + ORB_R - 6, HEART);
  drawText(c, String(h.hearts).padStart(2, '0'), cx + ORB_R + 13, cy + ORB_R - 6, PALE);
}
