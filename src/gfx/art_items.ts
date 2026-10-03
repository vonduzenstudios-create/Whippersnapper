// Procedural item, pickup and effect sprites.
import { PixelCanvas, SheetBuilder, hex, RGBA } from './pixel';
import { FormCanvas, ramp } from './form';

const O = hex('#120a12');

function heart(p: PixelCanvas, cx: number, cy: number, r: number, c: RGBA, hl: RGBA) {
  p.circle(cx - r * 0.5, cy - r * 0.2, r * 0.55, c);
  p.circle(cx + r * 0.5, cy - r * 0.2, r * 0.55, c);
  p.poly([[cx - r * 1.05, cy], [cx + r * 1.05, cy], [cx, cy + r * 1.05]], c);
  p.set(cx - r * 0.6, cy - r * 0.4, hl);
}

export function buildItemSheet(): SheetBuilder {
  const b = new SheetBuilder(16, 16, 8, 8);
  const mk = (name: string, fn: (p: PixelCanvas) => void, outline = true) => {
    const p = b.canvas();
    fn(p);
    if (outline) p.outline(O);
    b.add(name, p);
  };
  mk('heartS', (p) => heart(p, 8, 8, 3.2, hex('#e0203c'), hex('#ffb0b8')));
  mk('heartB', (p) => {
    heart(p, 8, 8, 5.5, hex('#d01834'), hex('#ffc0c8'));
    p.set(5, 6, hex('#ffffff'));
  });
  mk('potion', (p) => {
    p.rect(7, 2, 3, 3, hex('#8a6a4a'));
    p.circle(8, 10, 4.5, hex('#a8c8e0'));
    p.circle(8, 11, 3.5, hex('#2a6ad8'));
    p.set(6, 8, hex('#ffffff'));
  });
  mk('meat', (p) => {
    p.ellipse(8, 9, 6, 4, hex('#8a3a1a'));
    p.ellipse(8, 8, 5, 3, hex('#c06030'));
    p.line(2, 12, 0, 14, hex('#e8e0c8'), 2);
    p.set(6, 7, hex('#f0a070'));
  });
  mk('whip', (p) => {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.9;
      p.circle(8 + Math.cos(a) * (2 + i * 0.6), 8 + Math.sin(a) * (2 + i * 0.6), 1.2, i % 2 ? hex('#8a8ea0') : hex('#c8ccd8'));
    }
    p.line(3, 13, 6, 10, hex('#6a4a2a'), 2);
  });
  mk('armor', (p) => {
    p.poly([[3, 3], [13, 3], [12, 13], [8, 15], [4, 13]], hex('#6a6e82'));
    p.poly([[4, 4], [8, 4], [8, 14], [5, 12]], hex('#a8acbc'));
    p.rect(3, 3, 3, 3, hex('#c8ccd8'));
    p.rect(10, 3, 3, 3, hex('#8a8ea0'));
  });
  mk('ring', (p) => {
    p.circle(8, 9, 4.5, hex('#d8b040'));
    p.circle(8, 9, 2.5, [0, 0, 0, 0]);
    for (let y = 7; y <= 11; y++) for (let x = 6; x <= 10; x++) if ((x - 8) ** 2 + (y - 9) ** 2 < 6.5) p.clear(x, y);
    p.circle(8, 4, 2, hex('#e02040'));
    p.set(7, 3, hex('#ffc0c0'));
  });
  mk('lifeUp', (p) => {
    p.rect(6, 1, 4, 3, hex('#d8b040'));
    p.poly([[4, 5], [12, 5], [13, 14], [3, 14]], hex('#a01020'));
    heart(p, 8, 10, 2.6, hex('#ffd0d8'), hex('#ffffff'));
  });
  mk('heartUp', (p) => {
    heart(p, 8, 8, 6, hex('#e0b030'), hex('#fff0a0'));
    p.rect(7, 5, 2, 6, hex('#ffffff'));
    p.rect(5, 7, 6, 2, hex('#ffffff'));
  });
  // minor upgrades: a glowing seed with a red (strength) or blue (constitution) heart
  for (const [name, col, hi] of [['strUp', '#c02838', '#ff8a70'], ['conUp', '#2850c0', '#80b0ff']]) {
    mk(name, (p) => {
      p.ellipse(8, 9, 4.5, 6, hex('#3a2a18'));
      p.ellipse(8, 9, 3.5, 5, hex(col));
      p.ellipse(7, 7, 1.5, 2, hex(hi));
      p.line(8, 2, 10, 0, hex('#5a8a3a'));
      p.set(11, 1, hex('#7ab04a'));
    });
  }
  mk('relic', (p) => {
    p.circle(8, 8, 6.5, hex('#d8b040'));
    p.circle(8, 8, 5.2, hex('#3a2a6a'));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      p.circle(8 + Math.cos(a) * 3, 8 + Math.sin(a) * 3, 1, hex('#c8ccd8'));
    }
    p.set(8, 8, hex('#ffffff'));
    p.set(5, 5, hex('#ffffff'));
  });
  mk('holy', (p) => {
    p.rect(7, 1, 3, 2, hex('#8a6a4a'));
    p.rect(7, 3, 3, 2, hex('#c8d8e8'));
    p.circle(8, 10, 4.5, hex('#c8d8e8'));
    p.circle(8, 10, 3.5, hex('#4a9af0'));
    p.rect(7, 8, 3, 1, hex('#ffffff'));
    p.rect(8, 7, 1, 3, hex('#ffffff'));
  });
  mk('cross', (p) => {
    p.rect(7, 1, 3, 14, hex('#d8c070'));
    p.rect(2, 5, 13, 3, hex('#d8c070'));
    p.rect(8, 2, 1, 12, hex('#fff0b0'));
    p.rect(3, 6, 11, 1, hex('#fff0b0'));
    p.set(8, 6, hex('#e02040'));
  });
  mk('ringAnchor', (p) => {
    p.rect(7, 0, 3, 4, hex('#4a4a58'));
    p.circle(8, 9, 5, hex('#8a8ea0'));
    for (let y = 6; y <= 12; y++) for (let x = 5; x <= 11; x++) if ((x - 8) ** 2 + (y - 9) ** 2 < 8.5) p.clear(x, y);
    p.set(5, 7, hex('#d8dce8'));
    p.set(6, 5, hex('#d8dce8'));
  });
  mk('sinew', (p) => {
    // a coil of dark red sinew strung between two iron rings, stretched taut
    p.circle(3, 3, 2.5, hex('#8a8ea0'));
    p.clear(3, 3);
    p.circle(12, 12, 2.5, hex('#8a8ea0'));
    p.clear(12, 12);
    for (let i = 0; i < 5; i++) {
      const cx = 5 + i * 1.5, cy = 5 + i * 1.5;
      p.circle(cx, cy, 2, hex('#7a2a24'));
      p.set(Math.round(cx - 1), Math.round(cy - 1), hex('#c8605a'));
    }
    p.set(2, 1, hex('#d8dce8'));
    p.set(11, 10, hex('#d8dce8'));
  });
  mk('mantle', (p) => {
    // black feathered cloak with a gold clasp
    p.poly([[5, 2], [11, 2], [14, 14], [8, 12], [2, 14]], hex('#3a3260'));
    p.poly([[6, 3], [8, 3], [8, 12], [4, 13]], hex('#6a5ea0'));
    for (let i = 0; i < 4; i++) p.line(3 + i * 3, 14, 4 + i * 3, 11, hex('#9a8ed0'));
    p.rect(7, 2, 3, 2, hex('#d8b040'));
    p.set(8, 2, hex('#fff0a0'));
  });
  mk('greaves', (p) => {
    // ice-shod boot with frost spikes on the sole
    p.rect(6, 1, 5, 8, hex('#6a7ea0'));
    p.rect(6, 1, 2, 8, hex('#a8c0e0'));
    p.poly([[6, 9], [11, 9], [15, 12], [15, 14], [5, 14]], hex('#6a7ea0'));
    p.line(6, 10, 13, 12, hex('#a8c0e0'));
    for (let x = 5; x <= 14; x += 3) p.set(x, 15, hex('#e4f4ff'));
    p.rect(6, 4, 5, 1, hex('#d8b040'));
  });
  mk('shroud', (p) => {
    // folded moth-wing cloak: two grey wings with eye spots, a silver pin
    p.poly([[8, 3], [1, 6], [2, 13], [8, 10]], hex('#6a6478'));
    p.poly([[8, 3], [15, 6], [14, 13], [8, 10]], hex('#8a8498'));
    p.line(8, 3, 8, 12, hex('#3a3448'));
    p.circle(4.5, 8, 1.5, hex('#e0c8a0'));
    p.circle(11.5, 8, 1.5, hex('#e0c8a0'));
    p.set(4, 8, hex('#3a2a20'));
    p.set(12, 8, hex('#3a2a20'));
    p.rect(7, 2, 3, 2, hex('#c8ccd8'));
  });
  mk('pearl', (p) => {
    // a pale pearl in an open dark shell
    p.ellipse(8, 11, 7, 3.5, hex('#2a4a5a'));
    p.ellipse(8, 10, 6, 2.5, hex('#4a7a8a'));
    p.circle(8, 7, 3.6, hex('#d8e8f0'));
    p.circle(7, 6, 1.6, hex('#ffffff'));
    p.set(10, 8, hex('#a0b8c8'));
  });
  mk('ward', (p) => {
    // a smoky glass orb in an iron cradle
    p.circle(8, 7, 5.5, hex('#4a5068'));
    p.circle(8, 7, 4.5, hex('#8a98c0'));
    p.circle(7, 6, 2.5, hex('#c8d4f0'));
    p.set(6, 4, hex('#ffffff'));
    p.poly([[3, 12], [13, 12], [11, 15], [5, 15]], hex('#3a3440'));
    p.line(4, 12, 12, 12, hex('#6a6470'));
  });
  // shields (off hand), seen face on
  mk('shieldWood', (p) => {
    // round buckler: oak planks, iron rim and boss
    p.circle(8, 8, 6.8, hex('#5a5e6a'));
    p.circle(8, 8, 5.6, hex('#8a5a30'));
    for (const x of [5, 8, 11]) p.line(x, 3, x, 13, hex('#6a4220'));
    p.circle(8, 8, 1.8, hex('#9aa0b0'));
    p.set(7, 7, hex('#e0e4f0'));
    p.set(4, 4, hex('#a8acbc'));
  });
  mk('shieldIron', (p) => {
    // heater: flat top, pointed foot, a red stripe down the middle
    p.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], hex('#4a4e5c'));
    p.poly([[3, 3], [13, 3], [13, 8], [8, 13.5], [3, 8]], hex('#8a8ea0'));
    p.rect(7, 3, 3, 10, hex('#a02030'));
    p.line(3, 3, 6, 3, hex('#d8dce8'));
  });
  mk('shieldBone', (p) => {
    // tall pavise of black iron with a skull set in it
    p.rect(3, 1, 10, 14, hex('#2a2a34'));
    p.rect(4, 2, 8, 12, hex('#4a4a58'));
    p.circle(8, 7, 2.6, hex('#e8e0c8'));
    p.rect(7, 9, 3, 2, hex('#e8e0c8'));
    p.set(7, 7, hex('#2a2a34'));
    p.set(9, 7, hex('#2a2a34'));
    p.line(4, 13, 12, 13, hex('#e8e0c8'));
  });
  mk('shieldAsh', (p) => {
    // kite of charcoal split by glowing veins
    p.poly([[8, 1], [14, 4], [12, 11], [8, 15], [4, 11], [2, 4]], hex('#2a2224'));
    p.poly([[8, 2], [13, 4.5], [11.5, 10.5], [8, 13.5], [4.5, 10.5], [3, 4.5]], hex('#4a3a3a'));
    p.line(8, 3, 8, 13, hex('#ff8a30'));
    p.line(5, 6, 8, 8, hex('#ff6a20'));
    p.line(11, 6, 8, 8, hex('#ff6a20'));
    p.set(8, 8, hex('#ffe0a0'));
  });
  mk('knife', (p) => {
    // a slim throwing knife, point up and to the right
    p.line(4, 12, 13, 3, hex('#c8ccd8'), 1.6);
    p.line(6, 11, 13, 4, hex('#ffffff'));
    p.line(2, 14, 5, 11, hex('#6a4a2a'), 2);
    p.line(3, 9, 7, 13, hex('#8a8ea0'));
  });
  mk('rootstone', (p) => {
    // a grey grave-stone shard bound in green roots
    p.poly([[5, 2], [11, 3], [13, 13], [3, 14]], hex('#5a5a62'));
    p.poly([[6, 3], [10, 4], [11, 12], [5, 12]], hex('#8a8a92'));
    p.line(3, 7, 13, 9, hex('#3a6a2a'));
    p.line(4, 12, 10, 2, hex('#4a8a34'));
    p.set(7, 6, hex('#9ad070'));
    p.set(11, 9, hex('#9ad070'));
  });
  mk('gold', (p) => {
    p.circle(8, 8, 4, hex('#d8b040'));
    p.circle(8, 8, 2.5, hex('#f0d060'));
    p.set(7, 6, hex('#ffffff'));
  });
  // a little stack of coins (a bigger gold drop)
  mk('goldPile', (p) => {
    for (const [x, y] of [[5, 11], [11, 11], [8, 8], [8, 12]] as [number, number][]) {
      p.ellipse(x, y, 3.5, 2, hex('#a07828'));
      p.ellipse(x, y - 1, 3.5, 2, hex('#e0b850'));
      p.set(x - 1, y - 2, hex('#fff0a0'));
    }
  });
  // a soul shard: a sliver of pale violet crystal with a light caught inside
  mk('shard', (p) => {
    p.poly([[8, 1], [12, 7], [9, 15], [5, 8]], hex('#6a4ab0'));
    p.poly([[8, 2], [10, 7], [8, 13], [7, 8]], hex('#b49af0'));
    p.set(8, 7, hex('#ffffff'));
    p.set(8, 8, hex('#f0e8ff'));
  });
  return b;
}

export function buildCandleSheet(): SheetBuilder {
  const b = new SheetBuilder(16, 32, 8, 16);
  const frames: PixelCanvas[] = [];
  for (let i = 0; i < 3; i++) {
    const p = b.canvas();
    // iron stand
    p.rect(7, 16, 2, 14, hex('#3a3440'));
    p.rect(4, 29, 8, 2, hex('#3a3440'));
    p.rect(3, 15, 10, 2, hex('#4a4450'));
    p.set(3, 14, hex('#4a4450'));
    p.set(12, 14, hex('#4a4450'));
    // candle
    p.rect(6, 8, 4, 7, hex('#e8e0c8'));
    p.rect(9, 8, 1, 7, hex('#b8b098'));
    p.set(6, 9, hex('#ffffff'));
    // flame
    const sway = [0, 1, -1][i];
    p.poly([[5.5, 7], [8 + sway, 0 + (i === 1 ? 1 : 0)], [10.5, 7]], hex('#ff8a20'));
    p.poly([[6.5, 7], [8 + sway * 0.5, 3], [9.5, 7]], hex('#ffe070'));
    p.outline(O);
    frames.push(p);
  }
  b.add('candle', ...frames);
  // wall sconce torch
  const torch: PixelCanvas[] = [];
  for (let i = 0; i < 3; i++) {
    const p = b.canvas();
    p.rect(6, 18, 4, 3, hex('#4a4450'));
    p.poly([[4, 14], [12, 14], [10, 18], [6, 18]], hex('#5a5460'));
    const sway = [0, 1, -1][i];
    p.poly([[4, 14], [8 + sway, 3 + i], [12, 14]], hex('#e05010'));
    p.poly([[5, 14], [8 + sway, 6 + i], [11, 14]], hex('#ff9a30'));
    p.poly([[6.5, 14], [8, 9], [9.5, 14]], hex('#fff0a0'));
    p.outline(O);
    torch.push(p);
  }
  b.add('torch', ...torch);
  // save altar crystal
  const altar: PixelCanvas[] = [];
  for (let i = 0; i < 4; i++) {
    const p = b.canvas();
    p.poly([[8, 2 + (i % 2)], [13, 12], [8, 22 + (i % 2)], [3, 12]], hex('#a01830'));
    p.poly([[8, 4 + (i % 2)], [11, 12], [8, 18 + (i % 2)]], hex('#e04060'));
    p.set(7, 8, hex('#ffffff'));
    p.rect(3, 26, 10, 5, hex('#4a4450'));
    p.rect(4, 25, 8, 1, hex('#6a6470'));
    p.outline(O);
    altar.push(p);
  }
  b.add('altar', ...altar);
  // floor lever: [0] up (unpulled, red knob), [1] thrown (green knob)
  const lever: PixelCanvas[] = [];
  for (const pulled of [false, true]) {
    const p = b.canvas();
    const tipX = pulled ? 13 : 3;
    p.line(8, 26, tipX, 14, hex('#6a6e82'), 2);
    p.line(8, 26, tipX, 14, hex('#a8acbc'));
    p.circle(tipX, 13, 2.6, pulled ? hex('#30a060') : hex('#c02030'));
    p.set(tipX - 1, 12, pulled ? hex('#a0f0c0') : hex('#ff9090'));
    p.rect(2, 26, 12, 6, hex('#4a4450'));
    p.rect(2, 26, 12, 1, hex('#6a6470'));
    p.rect(5, 25, 6, 2, hex('#1a1418'));
    p.rect(7, 28, 2, 2, pulled ? hex('#40c070') : hex('#d8b040')); // rune stone
    p.outline(O);
    lever.push(p);
  }
  b.add('lever', ...lever);
  // tutorial signpost: a weathered board on a post, capped with snow
  {
    const p = b.canvas();
    p.rect(7, 18, 2, 14, hex('#4a3424'));
    p.rect(1, 12, 14, 8, hex('#7a5a3c'));
    p.rect(1, 12, 14, 1, hex('#9a7a54'));
    p.rect(1, 19, 14, 1, hex('#4a3424'));
    for (let x = 3; x < 13; x += 3) p.rect(x, 15, 2, 2, hex('#2a1c14')); // carved marks
    p.rect(1, 10, 14, 2, hex('#eef4ff'));
    p.set(0, 11, hex('#eef4ff'));
    p.outline(O);
    b.add('sign', p);
  }
  // lore stone: a standing slab with a softly glowing rune
  {
    const p = b.canvas();
    p.poly([[3, 31], [2, 14], [5, 9], [11, 9], [14, 14], [13, 31]], hex('#5a5a6e'));
    p.poly([[4, 30], [4, 14], [6, 11], [8, 11], [8, 30]], hex('#72728a'));
    p.line(8, 15, 8, 24, hex('#8ad0ff'));
    p.line(6, 18, 10, 18, hex('#8ad0ff'));
    p.line(6, 22, 8, 24, hex('#8ad0ff'));
    p.line(10, 22, 8, 24, hex('#8ad0ff'));
    p.outline(O);
    b.add('stone', p);
  }
  return b;
}

/** Ice left by the Frost Crawler, deep shadow to glint. */
const FROST = ramp('#2e6a98', '#5e9cc8', '#96cdec', '#c8ecff', '#ffffff');

export function buildFxSheet(): SheetBuilder {
  const b = new SheetBuilder(16, 16, 8, 8);
  const add = (name: string, n: number, fn: (p: PixelCanvas, i: number) => void, outline: RGBA | null = null) => {
    const fr: PixelCanvas[] = [];
    for (let i = 0; i < n; i++) {
      const p = b.canvas();
      fn(p, i);
      if (outline) p.outline(outline);
      fr.push(p);
    }
    b.add(name, ...fr);
  };
  add('spark', 4, (p, i) => {
    const r = 2 + i * 1.6;
    const c = i < 2 ? hex('#ffffff') : hex('#ffd060');
    p.line(8 - r, 8, 8 + r, 8, c);
    p.line(8, 8 - r, 8, 8 + r, c);
    if (i < 3) {
      p.line(8 - r * 0.6, 8 - r * 0.6, 8 + r * 0.6, 8 + r * 0.6, hex('#ffe8a0'));
      p.line(8 - r * 0.6, 8 + r * 0.6, 8 + r * 0.6, 8 - r * 0.6, hex('#ffe8a0'));
    }
    if (i === 0) p.circle(8, 8, 2, hex('#ffffff'));
  });
  add('smoke', 4, (p, i) => {
    const r = 2.5 + i * 1.2;
    p.circle(8, 8, r, i < 2 ? hex('#7a6a70') : hex('#4a4048'));
    if (i < 3) p.circle(7, 7, r * 0.5, hex('#9a8a90'));
  });
  add('burst', 4, (p, i) => {
    const r = 3 + i * 1.5;
    p.circle(8, 8, r, i < 2 ? hex('#fff0a0') : hex('#ff7020'));
    if (i > 0) p.circle(8, 8, r - 2, i < 3 ? hex('#ff9a30') : [0, 0, 0, 0]);
    if (i === 3) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x - 8) ** 2 + (y - 8) ** 2 < (r - 2) ** 2) p.clear(x, y);
  });
  add('link', 1, (p) => {
    p.ellipse(8, 8, 2.5, 1.6, hex('#9aa0b4'));
    p.set(7, 7, hex('#e0e4f0'));
    p.set(8, 8, hex('#4a4e60'));
  }, hex('#1a1424'));
  add('tip', 1, (p) => {
    p.poly([[5, 6], [12, 8], [5, 10]], hex('#c8ccd8'));
    p.set(6, 7, hex('#ffffff'));
  }, hex('#1a1424'));
  add('emberTip', 2, (p, i) => {
    p.circle(8, 8, 3 + i, hex('#ff7020'));
    p.circle(8, 8, 1.5 + i * 0.5, hex('#fff0a0'));
  });
  add('bone', 1, (p) => {
    p.line(4, 11, 12, 5, hex('#e8e0c0'), 2);
    p.circle(4, 11, 1.6, hex('#e8e0c0'));
    p.circle(12, 5, 1.6, hex('#e8e0c0'));
    p.set(5, 9, hex('#b0a888'));
  }, hex('#1a1010'));
  add('fireball', 2, (p, i) => {
    p.circle(8, 8, 4 + i * 0.5, hex('#e04010'));
    p.circle(8 + i * 0.5, 8, 3, hex('#ff9a30'));
    p.circle(9, 8, 1.6, hex('#fff0a0'));
  }, hex('#401008'));
  add('ember', 2, (p, i) => {
    p.rect(7, 7, 2, 2, i ? hex('#ffb040') : hex('#ff6010'));
  });
  add('splash', 3, (p, i) => {
    const c = hex('#a0d8f0');
    for (let k = -2; k <= 2; k++) {
      const h = (3 - Math.abs(k)) * (3 - i);
      p.line(8 + k * 2, 15, 8 + k * (2 + i), 15 - h, c);
    }
  });
  add('dust', 3, (p, i) => {
    p.circle(8 - i * 2, 12, 2 - i * 0.4, hex('#8a7a70'));
    p.circle(8 + i * 2, 12, 2 - i * 0.4, hex('#8a7a70'));
  });
  add('holyfly', 1, (p) => {
    p.rect(7, 2, 3, 3, hex('#c8d8e8'));
    p.circle(8, 9, 4, hex('#c8d8e8'));
    p.circle(8, 9, 3, hex('#4a9af0'));
    p.set(7, 8, hex('#ffffff'));
  }, O);
  add('glass', 2, (p, i) => {
    for (let k = 0; k < 5; k++) p.set(4 + k * 2 + i, 8 + ((k * 7) % 5) - i * 2, hex('#c8e8ff'));
  });
  add('blood', 3, (p, i) => {
    p.circle(8, 8, 2.5 - i * 0.6, hex('#a01020'));
  });
  add('star', 2, (p, i) => {
    p.set(8, 8, hex('#ffffff'));
    if (!i) {
      p.set(7, 8, hex('#a0c0ff'));
      p.set(9, 8, hex('#a0c0ff'));
      p.set(8, 7, hex('#a0c0ff'));
      p.set(8, 9, hex('#a0c0ff'));
    }
  });
  add('mote', 1, (p) => {
    p.rect(7, 7, 2, 2, hex('#c8f0ff'));
  });
  // snow puff: avalanche spray, double-jump and slide kick-up
  add('puff', 4, (p, i) => {
    const r = 3 + i * 1.4;
    p.circle(8, 8, r, i < 3 ? hex('#e8f0ff') : hex('#b8c8e8'));
    p.circle(9, 9, r * 0.55, hex('#b8c8e8'));
    p.circle(7, 6.5, r * 0.45, hex('#ffffff'));
  });
  add('flake', 2, (p, i) => {
    p.set(8, 8, hex('#ffffff'));
    if (!i) for (const [x, y] of [[7, 8], [9, 8], [8, 7], [8, 9]]) p.set(x, y, hex('#c8dcff'));
  });
  // harpy feather dart, pointing right
  add('feather', 1, (p) => {
    p.line(2, 8, 13, 8, hex('#d8d0e0'));
    for (let k = 0; k < 4; k++) {
      p.line(4 + k * 2, 8, 2 + k * 2, 5, hex('#5a3a6a'));
      p.line(4 + k * 2, 8, 2 + k * 2, 11, hex('#3a2a4a'));
    }
    p.set(14, 8, hex('#ffffff'));
  }, hex('#120a18'));
  // falling masonry
  add('rock', 2, (p, i) => {
    p.poly([[4, 6 + i], [8, 3], [12, 5], [12 - i, 11], [6, 12]], hex('#6a6070'));
    p.line(5, 7, 8, 4, hex('#9a90a0'));
    p.set(9, 9, hex('#3a3440'));
  }, hex('#120e14'));
  // ground shockwave from a bell toll or a heavy landing
  add('shock', 2, (p, i) => {
    const c = i ? hex('#c8b0ff') : hex('#ffffff');
    for (let k = 0; k < 4; k++) p.line(3 + k * 3, 15, 4 + k * 3, 15 - (4 + ((k + i) % 2) * 5), c, 1.5);
    p.line(1, 15, 15, 15, hex('#8a70d0'), 2);
  });
  // a patch of a Frost Crawler's trail, glazed over the floor (bottom rows of the cell): a skin
  // of meltwater frozen as it ran, thick in the middle, with a ripple caught in it
  add('iceSlick', 2, (p, i) => {
    const f = new FormCanvas(16, 16);
    f.poly([[0, 12.6], [16, 12.6], [16, 16], [0, 16]], FROST, (x, y) => 0.42 + (y < 14 ? 0.22 : 0) + Math.sin((x + i * 5) * 0.8) * 0.1 - (y > 14 ? 0.14 : 0));
    // it stands a little proud of the floor, in low swells
    for (let k = 0; k < 3; k++) f.ball(2.5 + k * 5.5 + i * 2, 12.6, 2.6, 1.3, FROST, 0, 0.7);
    f.stroke(2 + i * 5, 12, 5 + i * 5, 12, FROST, 0.99); // light skating on it
    f.dot(11 - i * 6, 14, FROST, 0.99);
    // a frost flower
    const cx = 7 + i * 4;
    f.dot(cx, 10, FROST, 0.99);
    f.dot(cx - 1, 11, FROST, 0.8);
    f.dot(cx + 1, 11, FROST, 0.8);
    p.blit(f.resolve({ outline: false }), 0, 0);
  });
  // an icicle growing from a Frost Crawler's ceiling trail, point down (its root on row 0)
  add('icicle', 1, (p) => {
    const f = new FormCanvas(16, 16);
    f.ball(8, 0.6, 3.6, 1.8, FROST);
    f.limb(8, 1, 8.2, 9, 2.6, 1.2, FROST);
    f.limb(8.2, 9, 8, 14.4, 1.2, 0.3, FROST);
    f.groove(7, 1, 7.4, 10, 0.2); // the light running down it
    f.dot(9, 4, FROST, 0.2); // an air bubble frozen inside
    p.blit(f.resolve({ ink: hex('#12283e') }), 0, 0);
  });
  // the Devourer's tongue: fleshy segments that overlap into one long tongue, and its barbed tip
  add('tongueSeg', 1, (p) => {
    p.ellipse(8, 8, 3.2, 2.4, hex('#a83848'));
    p.line(6, 7, 10, 7, hex('#d86070'));
  }, hex('#2a0610'));
  add('tongueTip', 1, (p) => {
    p.ellipse(6, 8, 3.5, 2.6, hex('#a83848'));
    p.line(4, 7, 8, 7, hex('#d86070'));
    p.poly([[8, 5], [14, 8], [8, 11]], hex('#e8e0c8')); // a bony barb
    p.line(9, 6, 7, 3, hex('#e8e0c8'));
    p.line(9, 10, 7, 13, hex('#e8e0c8'));
  }, hex('#2a0610'));
  // Hookjaw's chain hook, pointing right
  add('hook', 1, (p) => {
    p.line(2, 8, 9, 8, hex('#7a6e68'), 2);
    p.line(9, 8, 13, 5, hex('#a89a90'), 2);
    p.line(13, 5, 14, 9, hex('#a89a90'), 1.5);
    p.line(9, 8, 12, 12, hex('#a89a90'), 1.5);
    p.set(14, 10, hex('#e8e0d8'));
    p.set(12, 13, hex('#e8e0d8'));
  }, hex('#120a0a'));
  // Gloomcaster's hex bolt: a violet sigil that flickers
  add('hex', 2, (p, i) => {
    p.circle(8, 8, 4.5 - i * 0.5, hex('#4a1a6a'));
    p.circle(8, 8, 3, hex('#a040e0'));
    p.line(8, 4 + i, 8, 12 - i, hex('#f0c8ff'));
    p.line(4 + i, 8, 12 - i, 8, hex('#f0c8ff'));
    p.set(8, 8, hex('#ffffff'));
  });
  // ooze spatter
  add('slime', 2, (p, i) => {
    p.circle(8, 9, 2.5 - i * 0.8, hex('#6a9a30'));
    p.set(7, 8, hex('#c0e070'));
  });
  // a scrap of paper tumbling (tomes tearing loose or dying)
  add('page', 3, (p, i) => {
    const w = [5, 3, 2][i], h = [3, 5, 5][i];
    p.rect(8 - Math.floor(w / 2), 8 - Math.floor(h / 2), w, h, hex('#efe4c4'));
    p.set(8, 8, hex('#a89870'));
    if (w > 2) p.set(7, 9 - i, hex('#3a2a30'));
  }, hex('#2a2018'));
  // a book thrown by the Bone Librarian: shut, then flapping open
  add('book', 2, (p, i) => {
    const cover = hex('#7a2a30'), paper = hex('#efe4c4');
    if (i === 0) {
      p.rect(4, 5, 8, 6, cover);
      p.line(5, 10, 11, 10, paper); // page edges
      p.line(4, 5, 4, 10, hex('#4a1820')); // spine
      p.set(8, 7, hex('#d8a030'));
    } else {
      p.poly([[8, 9], [2, 5], [2, 9], [8, 12]], cover);
      p.poly([[8, 9], [14, 5], [14, 9], [8, 12]], cover);
      p.poly([[8, 9], [3, 5], [3, 7], [8, 10]], paper);
      p.poly([[8, 9], [13, 5], [13, 7], [8, 10]], paper);
    }
  }, hex('#1a1010'));
  // the Throwing Knife in flight (points right), and the streak it leaves
  add('knife', 1, (p) => {
    p.line(3, 8, 6, 8, hex('#6a4a2a'), 2); // grip
    p.line(6, 6, 6, 10, hex('#8a8ea0')); // guard
    p.poly([[7, 7], [12, 7.5], [14, 8], [12, 8.5], [7, 9]], hex('#c8ccd8'));
    p.line(7, 7, 12, 7, hex('#ffffff'));
  }, hex('#1a1424'));
  add('streak', 1, (p) => {
    p.line(1, 8, 14, 8, hex('#a8c8ff', 150));
    p.line(6, 8, 14, 8, hex('#e8f0ff', 220));
  });
  // a Gallows Spider's web glob: a sticky white clot with strands
  add('web', 2, (p, i) => {
    const w = hex('#f0f0e8'), d = hex('#b8b8b0');
    p.circle(8, 8, 2.2 + i, w);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + i * 0.5, r = 4 + i * 2;
      p.line(8, 8, 8 + Math.cos(a) * r, 8 + Math.sin(a) * r, d);
    }
    p.set(7, 7, hex('#ffffff'));
  });
  // a strand of spider silk: stretched to length in game (Sprite mesh scale)
  add('silk', 1, (p) => {
    for (let y = 0; y < 16; y++) p.set(8, y, hex('#d8d8d0', 200));
  });
  // a rising air bubble (eels, swimming with the Undertow Pearl)
  add('bubble', 1, (p) => {
    p.circle(8, 8, 2, hex('#c8f0ff'));
    p.circle(8, 8, 1, [0, 0, 0, 0]);
    for (const [x, y] of [[8, 8], [7, 8], [8, 7], [9, 8], [8, 9]]) p.clear(x, y);
    p.set(7, 7, hex('#ffffff'));
  });
  return b;
}

/**
 * Bigger effects worn by the hero: the Duskwing Shroud's wings while gliding and the
 * Ashglass Ward's shield bubble. 48x48 cells, anchored at the center.
 */
export function buildRelicFxSheet(): SheetBuilder {
  const b = new SheetBuilder(48, 48, 24, 24);
  // moth wings spread behind the shoulders (art faces right, wings trail back-left)
  const wings = (flap: number) => {
    const p = b.canvas();
    const sx = 25, sy = 19; // shoulders
    /** One wing sweeping back from the shoulders; `lift` raises the tip, `dim` = the far wing. */
    const wing = (lift: number, dim: boolean) => {
      const tipX = sx - 23, tipY = sy - 15 + lift + flap * 4;
      const c = dim ? hex('#3e3a4e') : hex('#7a7490'), cd = dim ? hex('#2a2438') : hex('#5a5470');
      // leading edge out to the tip, then a scalloped trailing edge back to the waist
      const pts: [number, number][] = [[sx, sy], [sx - 10, tipY - 2], [tipX, tipY], [tipX - 1, tipY + 5]];
      for (let k = 1; k <= 4; k++) pts.push([tipX + k * 4.5, tipY + 5 + k * 4.2 + (k % 2) * 2]);
      pts.push([sx - 2, sy + 9]);
      p.poly(pts, c);
      // veins and an eye spot near the tip
      for (let k = 1; k <= 3; k++) p.line(sx - 1, sy + 1, tipX + k * 5, tipY + 6 + k * 4, cd);
      p.line(sx, sy, tipX, tipY, dim ? hex('#2a2438') : hex('#b8b0d0'));
      if (!dim) {
        p.circle(tipX + 7, tipY + 6, 2.6, hex('#e0c8a0'));
        p.circle(tipX + 7, tipY + 6, 1.2, hex('#2a1a14'));
      }
    };
    wing(5, true);
    wing(0, false);
    p.outline(hex('#120a18'));
    return p;
  };
  b.add('wings', wings(0), wings(1));
  // shield bubble: a thin shimmering ring with a moving highlight
  const bubble = (i: number) => {
    const p = b.canvas();
    const cx = 24, cy = 24, r = 21;
    for (let a = 0; a < 360; a += 2) {
      const t = (a * Math.PI) / 180;
      const lit = Math.cos(t - (i * Math.PI) / 2 - 2.2) > 0.6;
      p.set(cx + Math.cos(t) * r, cy + Math.sin(t) * r, lit ? hex('#ffffff') : hex('#a8d0ff'));
      if (a % 4 === 0) p.set(cx + Math.cos(t) * (r - 1), cy + Math.sin(t) * (r - 1), hex('#5a80c8', 160));
    }
    // a few faint motes inside the glass
    for (let k = 0; k < 4; k++) {
      const t = k * 1.7 + i * 0.6;
      p.set(cx + Math.cos(t) * 12, cy + Math.sin(t) * 14, hex('#c8e0ff', 140));
    }
    return p;
  };
  b.add('bubble', bubble(0), bubble(1), bubble(2), bubble(3));
  // a Gloomcaster's hex bubble, holding her whip: violet glass with a pearly sheen that
  // slides round the rim (pink, violet, sea-green), a soft fill and a bright glint
  const pearl = [hex('#f0a8e8'), hex('#b890ff'), hex('#8ae8d8'), hex('#c8a0ff')];
  const hexBubble = (i: number) => {
    const p = b.canvas();
    const cx = 24, cy = 24, r = 12;
    p.circle(cx, cy, r, hex('#6a3aa0', 70));
    p.circle(cx - 2, cy - 2, r - 4, hex('#8a5ac8', 40));
    for (let a = 0; a < 360; a += 3) {
      const t = (a * Math.PI) / 180;
      const k = Math.floor(((a / 360) * 4 + i) % 4); // the sheen's colors turn with the frame
      p.set(cx + Math.cos(t) * r, cy + Math.sin(t) * r, pearl[k]);
      if (a % 6 === 0) p.set(cx + Math.cos(t) * (r - 1), cy + Math.sin(t) * (r - 1), hex('#4a2070', 180));
    }
    // the glint, sliding a little each frame
    const gx = cx - 5 + i, gy = cy - 6;
    p.set(gx, gy, hex('#ffffff'));
    p.set(gx + 1, gy, hex('#ffffff'));
    p.set(gx, gy + 1, hex('#ffe8ff', 200));
    return p;
  };
  b.add('hexBubble', hexBubble(0), hexBubble(1), hexBubble(2), hexBubble(3));
  // the raised shield, seen from the side: a narrow face held out in front of her.
  // Frame 0: held level. Frame 1: aimed up and forward, its top leaning back over her head (\ when
  // facing right). Frame 2: held flat overhead.
  const looks: Record<string, (p: PixelCanvas) => void> = {
    wood: (p) => {
      p.ellipse(8, 12, 4, 10, hex('#5a5e6a'));
      p.ellipse(8, 12, 3, 9, hex('#8a5a30'));
      p.line(8, 4, 8, 20, hex('#6a4220'));
      p.set(9, 12, hex('#c8ccd8'));
    },
    iron: (p) => {
      p.poly([[4, 2], [12, 2], [12, 15], [8, 23], [4, 15]], hex('#4a4e5c'));
      p.poly([[5, 3], [11, 3], [11, 15], [8, 21], [5, 15]], hex('#8a8ea0'));
      p.rect(7, 3, 2, 16, hex('#a02030'));
      p.line(5, 3, 5, 14, hex('#d8dce8'));
    },
    bone: (p) => {
      p.rect(4, 0, 8, 24, hex('#2a2a34'));
      p.rect(5, 1, 6, 22, hex('#4a4a58'));
      p.circle(8, 9, 2.2, hex('#e8e0c8'));
      p.set(7, 9, hex('#2a2a34'));
      p.set(9, 9, hex('#2a2a34'));
      p.rect(7, 11, 3, 2, hex('#e8e0c8'));
    },
    ash: (p) => {
      p.poly([[8, 0], [12, 3], [11, 15], [8, 24], [5, 15], [4, 3]], hex('#2a2224'));
      p.poly([[8, 1], [11, 4], [10, 15], [8, 22], [6, 15], [5, 4]], hex('#4a3a3a'));
      p.line(8, 3, 8, 20, hex('#ff8a30'));
      p.set(8, 10, hex('#ffe0a0'));
    },
  };
  for (const [look, paint] of Object.entries(looks)) {
    const face = new PixelCanvas(16, 24);
    paint(face);
    face.outline(hex('#120a12'));
    b.add(`shield_${look}`, placeRotated(b.canvas(), face, 0), placeRotated(b.canvas(), face, -0.75), placeRotated(b.canvas(), face, -Math.PI / 2));
  }
  // a block of ice around a frozen hero (Frost Crawler trails): whole, cracked, about to burst
  b.add('iceBlock', ...[0, 1, 2].map((crack) => {
    const p = b.canvas();
    const ice = hex('#a8d8f0', 170), iceL = hex('#e0f6ff', 210), iceD = hex('#5890c0', 200);
    p.poly([[11, 10], [17, 5], [32, 6], [37, 12], [36, 44], [12, 44]], ice);
    p.poly([[13, 11], [18, 7], [24, 7], [16, 20], [14, 34]], iceL); // a glint down the left face
    p.line(31, 8, 35, 13, iceL);
    p.line(35, 14, 35, 43, iceD);
    p.line(12, 43, 36, 43, iceD);
    // cracks spreading from the middle as she struggles
    const cracks: [number, number, number, number][][] = [
      [],
      [[24, 22, 29, 15], [24, 22, 19, 30]],
      [[24, 22, 29, 15], [24, 22, 19, 30], [29, 15, 34, 12], [24, 22, 33, 27], [19, 30, 14, 33], [24, 22, 22, 9]],
    ];
    for (const [x0, y0, x1, y1] of cracks[crack]) p.line(x0, y0, x1, y1, hex('#ffffff'));
    p.outline(hex('#1a3a58'));
    return p;
  }));
  return b;
}

/**
 * The ring of sound a Bell Wraith's toll sends out around it: big frames (128x128, centered)
 * that grow from a tight ring to a faint wide one.
 */
export const RING_RADII = [10, 20, 30, 40, 48, 54];
export function buildRingSheet(): SheetBuilder {
  const b = new SheetBuilder(128, 128, 64, 64);
  b.add('ring', ...RING_RADII.map((r, i) => {
    const p = b.canvas();
    const w = 4 - i * 0.5; // thins out as it spreads
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const d = Math.hypot(x + 0.5 - 64, y + 0.5 - 64) - r;
        if (d > -w && d < 0) p.set(x, y, d > -1.2 ? hex('#ffffff', 230 - i * 25) : hex('#b8a0ff', 200 - i * 25));
        // a few ripples trailing inside it
        else if (i > 1 && Math.abs(d + w + 4) < 0.6 && (x + y) % 3 === 0) p.set(x, y, hex('#8a70d0', 140 - i * 15));
      }
    return p;
  }));
  return b;
}

/** Copy `src` into the middle of `dst`, turned by `angle` radians (nearest pixel, so it stays crisp). */
function placeRotated(dst: PixelCanvas, src: PixelCanvas, angle: number) {
  const cx = dst.w / 2, cy = dst.h / 2, sx = src.w / 2, sy = src.h / 2;
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  for (let y = 0; y < dst.h; y++)
    for (let x = 0; x < dst.w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const c = src.get(Math.floor(dx * cos - dy * sin + sx), Math.floor(dx * sin + dy * cos + sy));
      if (c[3]) dst.set(x, y, c);
    }
  return dst;
}

/** Tall flame for holy water fire and the wyrm's burning breath. */
export function buildFireSheet(): SheetBuilder {
  const b = new SheetBuilder(16, 32, 8, 31);
  const fr: PixelCanvas[] = [];
  for (let i = 0; i < 4; i++) {
    const p = b.canvas();
    const s = [0, 1.5, -1, 0.5][i];
    const h = [24, 28, 22, 26][i];
    p.poly([[1, 31], [4 + s, 31 - h * 0.6], [8 + s, 31 - h], [12 + s * 0.5, 31 - h * 0.55], [15, 31]], hex('#3a6af0'));
    p.poly([[3, 31], [6 + s, 31 - h * 0.5], [8 + s, 31 - h * 0.8], [11, 31 - h * 0.4], [13, 31]], hex('#7ab0ff'));
    p.poly([[5, 31], [8 + s * 0.5, 31 - h * 0.45], [11, 31]], hex('#e8f4ff'));
    fr.push(p);
  }
  b.add('holyfire', ...fr);
  const fr2: PixelCanvas[] = [];
  for (let i = 0; i < 4; i++) {
    const p = b.canvas();
    const s = [0, 1.5, -1, 0.5][i];
    const h = [24, 28, 22, 26][i];
    p.poly([[1, 31], [4 + s, 31 - h * 0.6], [8 + s, 31 - h], [12 + s * 0.5, 31 - h * 0.55], [15, 31]], hex('#c02008'));
    p.poly([[3, 31], [6 + s, 31 - h * 0.5], [8 + s, 31 - h * 0.8], [11, 31 - h * 0.4], [13, 31]], hex('#ff7a20'));
    p.poly([[5, 31], [8 + s * 0.5, 31 - h * 0.45], [11, 31]], hex('#fff0a0'));
    fr2.push(p);
  }
  b.add('fire', ...fr2);
  return b;
}
