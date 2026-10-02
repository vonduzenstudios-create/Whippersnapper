// Entry point for enemies.html: the enemy editor.
//
// Edit the stats, behavior, drops and colors of the base enemies, or make variants of
// them (a variant has its own id, name and numbers but reuses its base enemy's AI and art).
// SAVE writes src/game/enemy_edits.json through the dev server (see vite.config.ts);
// data.ts applies that file on top of the code table, so the game and map editor pick
// up the changes on their next reload.
import { baseEnemies, BASE_ENEMIES, ENEMY_TUNING, EnemyStats, EnemyEdits, Drop, ITEMS, PICKUP_NAMES, defaultTune, Tune } from './game/data';
import ENEMY_EDITS from './game/enemy_edits.json';
import { buildSheet, sheetColors, recolorSheet, Sheet } from './gfx/view';
import { buildZombieSheet, buildSkeletonSheet, buildKnightSheet, buildDrownedSheet, buildBatSheet, buildWispSheet, buildLibrarianSheet, buildWyrmSheet } from './gfx/art_chars';
import { buildHoundSheet, buildBellMotherSheet } from './gfx/art_bosses';
import { TEST_EDITS_KEY } from './config';
import {
  buildDogSheet, buildHarpySheet, buildWraithSheet, buildCrawlerSheet,
  buildHookjawSheet, buildEelSheet, buildCasterSheet, buildOozeSheet, buildGrubSheet, buildHandSheet, buildTomeSheet, buildChairSheet, buildSpiderSheet,
} from './gfx/art_beasts';

const BASE_SHEETS: Record<string, Sheet> = {
  zombie: buildSheet(buildZombieSheet()),
  bat: buildSheet(buildBatSheet()),
  knight: buildSheet(buildKnightSheet()),
  skeleton: buildSheet(buildSkeletonSheet()),
  wisp: buildSheet(buildWispSheet()),
  drowned: buildSheet(buildDrownedSheet()),
  dog: buildSheet(buildDogSheet()),
  harpy: buildSheet(buildHarpySheet()),
  wraith: buildSheet(buildWraithSheet()),
  crawler: buildSheet(buildCrawlerSheet()),
  hookjaw: buildSheet(buildHookjawSheet()),
  eel: buildSheet(buildEelSheet()),
  caster: buildSheet(buildCasterSheet()),
  ooze: buildSheet(buildOozeSheet()),
  grub: buildSheet(buildGrubSheet()),
  hand: buildSheet(buildHandSheet()),
  tome: buildSheet(buildTomeSheet()),
  chair: buildSheet(buildChairSheet()),
  librarian: buildSheet(buildLibrarianSheet()),
  spider: buildSheet(buildSpiderSheet()),
};
/** The bosses: their stats and text can be edited here, but not their colors, and they have no variants. */
const BOSS_SHEETS: Record<string, Sheet> = {
  wyrm: buildSheet(buildWyrmSheet()),
  hound: buildSheet(buildHoundSheet()),
  bellmother: buildSheet(buildBellMotherSheet()),
};
const PALETTES: Record<string, { hex: string; count: number }[]> = {};
for (const [k, s] of Object.entries(BASE_SHEETS)) PALETTES[k] = sheetColors(s);

/** Things an enemy can drop: heart and meat pickups, and every item except relics. */
const DROP_OPTIONS: [string, string][] = [
  ...Object.entries(PICKUP_NAMES),
  ...Object.values(ITEMS).filter((it) => it.slot !== 'relic').map((it): [string, string] => [it.id, it.name]),
];

// ---------------------------------------------------------------- state

const CODE = baseEnemies(); // the enemies as written in data.ts
for (const [id, st] of Object.entries(CODE)) st.base = id;
/** The working copy of enemy_edits.json. */
let edits: EnemyEdits = JSON.parse(JSON.stringify(ENEMY_EDITS));
let savedJson = JSON.stringify(edits);
/** Variant renames since the last save (original id → new id), so rooms can follow. */
let renames: Record<string, string> = {};
let sel = 'zombie';

const isBase = (id: string) => BASE_ENEMIES.includes(id);
const isBoss = (id: string) => !!BOSS_SHEETS[id] && !!CODE[id];
/** An enemy written in data.ts (a base enemy or a boss), as opposed to an editor-made variant. */
const isCode = (id: string) => isBase(id) || isBoss(id);
const baseOf = (id: string) => (isBase(id) ? id : edits[id]?.base) || 'zombie';

/** What an enemy looks like right now (code version + edits). */
function current(id: string): EnemyStats {
  if (isCode(id)) return { ...CODE[id], ...edits[id], base: id };
  return edits[id];
}

/** Store a change. Base enemies that match their code version again are dropped from the edits. */
function store(id: string, st: EnemyStats) {
  const clean: EnemyStats = JSON.parse(JSON.stringify(st));
  if (clean.colors && !Object.keys(clean.colors).length) delete clean.colors;
  if (clean.tune && !Object.keys(clean.tune).length) delete clean.tune;
  if (isCode(id) && JSON.stringify(clean) === JSON.stringify(CODE[id])) delete edits[id];
  else edits[id] = clean;
  refreshStatus();
}
function update(fn: (st: EnemyStats) => void) {
  const st = current(sel);
  fn(st);
  store(sel, st);
  drawPreview();
}

// ---------------------------------------------------------------- small DOM helpers

const $ = (id: string) => document.getElementById(id)!;
/** Make an element, set its properties and append its children. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids);
  return e;
}
function row(label: string, input: HTMLElement, help = '') {
  const r = el('div', { className: 'row' }, el('span', {}, label), input);
  if (help) r.append(el('div', { className: 'help' }, help));
  return r;
}
function section(title: string, ...kids: (Node | string)[]) {
  return el('section', {}, el('h2', {}, title), ...kids);
}
function say(text: string, kind: '' | 'ok' | 'err' = '') {
  const s = $('status');
  s.textContent = text;
  s.className = kind;
}
function refreshStatus() {
  const dirty = JSON.stringify(edits) !== savedJson;
  document.title = `${dirty ? '* ' : ''}Nocturne of Ash - Enemy Editor`;
  if (dirty) say('Unsaved changes');
}

// ---------------------------------------------------------------- color math

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- list

function drawList() {
  const list = $('list');
  list.replaceChildren();
  for (const base of BASE_ENEMIES) {
    const ids = [base, ...Object.keys(edits).filter((id) => !isBase(id) && edits[id].base === base)];
    for (const id of ids) {
      const st = current(id);
      const item = el('div', { className: `item${isBase(id) ? '' : ' variant'}${id === sel ? ' sel' : ''}` }, st.name);
      if (isBase(id) && edits[id]) item.append(el('span', { className: 'mark' }, ' *'));
      item.title = isBase(id) ? `${id} (base enemy)` : `${id} (variant of ${base})`;
      item.onclick = () => select(id);
      list.append(item);
    }
  }
  list.append(el('div', { className: 'group' }, 'BOSSES'));
  for (const id of Object.keys(BOSS_SHEETS)) {
    const item = el('div', { className: `item${id === sel ? ' sel' : ''}` }, current(id).name);
    if (edits[id]) item.append(el('span', { className: 'mark' }, ' *'));
    item.title = `${id} (boss)`;
    item.onclick = () => select(id);
    list.append(item);
  }
  ($('variant') as HTMLButtonElement).disabled = isBoss(sel);
  ($('delete') as HTMLButtonElement).disabled = isCode(sel);
  ($('reset') as HTMLButtonElement).disabled = !isCode(sel) || !edits[sel];
}

function select(id: string) {
  sel = id;
  drawList();
  drawForm();
}

// ---------------------------------------------------------------- form

let preview: HTMLCanvasElement;
let animSel: HTMLSelectElement;

function numberInput(value: number, onChange: (v: number) => void, step = 1, min = 0) {
  const i = el('input', { type: 'number', value: String(value), step: String(step), min: String(min) });
  i.oninput = () => {
    const v = Number(i.value);
    if (i.value !== '' && isFinite(v)) onChange(Math.max(min, v));
  };
  return i;
}

function drawForm() {
  if (isBoss(sel)) return drawBossForm();
  const st = current(sel), base = baseOf(sel), content = $('content');
  const left = el('div'), right = el('div');
  content.replaceChildren(left, right);

  // identity
  const idInput = el('input', { value: sel, readOnly: isBase(sel) });
  idInput.onchange = () => renameVariant(idInput);
  const name = el('input', { value: st.name });
  name.oninput = () => {
    update((s) => (s.name = name.value));
    drawList();
  };
  const desc = el('textarea', { value: st.desc });
  desc.oninput = () => update((s) => (s.desc = desc.value));
  left.append(section('Identity',
    row('ID', idInput, isBase(sel) ? 'Base enemies keep their id' : 'a-z, 0-9 and _ only. Rooms that use this variant follow a rename when you save'),
    row('Name', name, 'Shown in the bestiary'),
    row('Behaves like', el('input', { value: CODE[base].name, readOnly: true }), 'The AI and sprite this enemy is built on'),
    row('Bestiary text', desc),
  ));

  // stats
  const stat = (key: 'hp' | 'atk' | 'def' | 'xp', label: string) =>
    el('label', {}, label, numberInput(st[key], (v) => update((s) => (s[key] = Math.round(v)))));
  left.append(section('Stats',
    el('div', { className: 'stats' }, stat('hp', 'HP'), stat('atk', 'ATK'), stat('def', 'DEF'), stat('xp', 'EXP')),
    el('p', { className: 'note' }, 'ATK is the damage of touching it and of its attacks. DEF is taken off every hit it receives.'),
  ));

  // behavior
  const tune: Tune = { ...defaultTune(base), ...st.tune };
  const beh = section('Behavior');
  for (const f of ENEMY_TUNING[base]) {
    const set = (v: number | boolean) => update((s) => {
      s.tune = { ...s.tune, [f.key]: v };
      if (v === defaultTune(base)[f.key]) delete s.tune[f.key]; // only store what differs from normal
    });
    if (f.kind === 'bool') {
      const c = el('input', { type: 'checkbox', checked: tune[f.key] !== false });
      c.onchange = () => set(c.checked);
      beh.append(row(f.label, el('label', {}, c), f.help));
    } else beh.append(row(f.label, numberInput(Number(tune[f.key]), (v) => set(v), 0.1, 0.1), f.help));
  }
  left.append(beh);

  // drops
  const drops = section('Drops');
  const dropRows = el('div');
  const drawDrops = () => {
    dropRows.replaceChildren();
    current(sel).drops.forEach((d: Drop, i: number) => {
      const item = el('select');
      for (const [v, l] of DROP_OPTIONS) item.add(new Option(l, v, false, v === d.item));
      item.onchange = () => update((s) => (s.drops[i].item = item.value));
      const chance = numberInput(d.chance, (v) => update((s) => (s.drops[i].chance = v)), 0.5);
      const del = el('button', { textContent: 'x', title: 'Remove this drop' });
      del.onclick = () => {
        update((s) => s.drops.splice(i, 1));
        drawDrops();
      };
      dropRows.append(el('div', { className: 'drop' }, item, chance, del));
    });
  };
  drawDrops();
  const add = el('button', { textContent: '+ Add drop' });
  add.onclick = () => {
    update((s) => s.drops.push({ item: 'heartS', chance: 10 }));
    drawDrops();
  };
  drops.append(dropRows, el('div', { className: 'btns' }, add),
    el('p', { className: 'note' }, 'Chance is a percent before the luck bonus (LCK 10 = +20%). At most one item drops per kill; rarer ones are rolled first.'));
  left.append(drops);

  // preview
  preview = el('canvas', { width: 160, height: 80 });
  preview.id = 'preview';
  animSel = el('select');
  for (const a of Object.keys(BASE_SHEETS[base].anims)) animSel.add(new Option(a, a, false, a === CODE[base].portrait));
  right.append(section('Preview', preview, row('Animation', animSel), el('p', { className: 'note' }, 'Left: the base enemy. Right: this one.')));

  // colors
  right.append(colorSection(base));
  drawPreview();
}

/** A boss: name, text and stats can change. Its attacks are in code, and it has no colors or variants. */
function drawBossForm() {
  const st = current(sel), content = $('content');
  const left = el('div'), right = el('div');
  content.replaceChildren(left, right);
  const name = el('input', { value: st.name });
  name.oninput = () => {
    update((s) => (s.name = name.value));
    drawList();
  };
  const desc = el('textarea', { value: st.desc });
  desc.oninput = () => update((s) => (s.desc = desc.value));
  const stat = (key: 'hp' | 'atk' | 'def' | 'xp', label: string) =>
    el('label', {}, label, numberInput(st[key], (v) => update((s) => (s[key] = Math.round(v)))));
  left.append(
    section('Identity',
      row('ID', el('input', { value: sel, readOnly: true }), 'Bosses keep their id'),
      row('Name', name, 'Shown in the bestiary (the fight banner has its own name in game/bosses.ts)'),
      row('Bestiary text', desc)),
    section('Stats',
      el('div', { className: 'stats' }, stat('hp', 'HP'), stat('atk', 'ATK'), stat('def', 'DEF'), stat('xp', 'EXP')),
      el('p', { className: 'note' }, 'ATK is the damage of touching it; its attacks have their own numbers in code. Gnarlfang rises again with part of this HP.')),
  );
  preview = el('canvas', { width: 160, height: 80 });
  preview.id = 'preview';
  animSel = el('select');
  for (const a of Object.keys(BOSS_SHEETS[sel].anims)) animSel.add(new Option(a, a, false, a === CODE[sel].portrait));
  right.append(section('Preview', preview, row('Animation', animSel),
    el('p', { className: 'note' }, 'Bosses are made of several sprites in game; this is the main one. See bosses.html for every frame.')));
  drawPreview();
}

function colorSection(base: string) {
  const sec = section('Colors');
  const pal = PALETTES[base];
  const grid = el('div', { className: 'swatches' });
  const pickers: HTMLInputElement[] = [];
  const colors = () => current(sel).colors || {};
  pal.forEach(({ hex, count }) => {
    const pick = el('input', { type: 'color', value: colors()[hex] || hex, title: `${hex} (${count} pixels). Click to change` });
    pick.oninput = () => update((s) => {
      s.colors = { ...s.colors };
      if (pick.value.toLowerCase() === hex) delete s.colors[hex];
      else s.colors[hex] = pick.value;
    });
    pickers.push(pick);
    const from = el('div', { className: 'from', title: `original ${hex}` });
    from.style.background = hex;
    grid.append(el('div', { className: 'sw' }, from, pick));
  });

  // quick recolor: shift every original color at once
  const slider = (label: string, min: number, max: number, value: number) => {
    const s = el('input', { type: 'range', min: String(min), max: String(max), value: String(value) });
    const out = el('span', {}, String(value));
    s.oninput = () => (out.textContent = s.value);
    return { s, box: el('div', { className: 'shift' }, el('span', {}, label), s, out) };
  };
  const hue = slider('Hue', -180, 180, 0), sat = slider('Saturation', 0, 200, 100), lit = slider('Brightness', 50, 150, 100);
  const apply = el('button', { textContent: 'Apply to all colors' });
  apply.onclick = () => {
    const map: Record<string, string> = {};
    for (const { hex } of pal) {
      const [h, s, l] = hexToHsl(hex);
      const out = hslToHex(h + Number(hue.s.value), Math.min(1, (s * Number(sat.s.value)) / 100), Math.min(1, (l * Number(lit.s.value)) / 100));
      if (out !== hex) map[hex] = out;
    }
    update((s) => (s.colors = map));
    pal.forEach(({ hex }, i) => (pickers[i].value = map[hex] || hex));
  };
  const reset = el('button', { textContent: 'Reset colors' });
  reset.onclick = () => {
    update((s) => delete s.colors);
    pal.forEach(({ hex }, i) => (pickers[i].value = hex));
  };
  sec.append(
    el('p', { className: 'note' }, 'Each swatch is one color of the original sprite, most-used first. Pick a new color for any of them, or shift them all at once below.'),
    grid, hue.box, sat.box, lit.box, el('div', { className: 'btns' }, apply, reset),
  );
  return sec;
}

// ---------------------------------------------------------------- preview

let shownSheet: { key: string; sheet: Sheet } | null = null;
/** The selected enemy's sheet, recolored (rebuilt only when its colors change). */
function sheetFor(id: string) {
  const st = current(id), base = baseOf(id), key = id + JSON.stringify(st.colors || {});
  if (shownSheet?.key !== key) {
    if (shownSheet && !Object.values(BASE_SHEETS).includes(shownSheet.sheet)) shownSheet.sheet.tex.dispose();
    const cols = st.colors || {};
    shownSheet = { key, sheet: Object.keys(cols).length ? recolorSheet(BASE_SHEETS[base], cols) : BASE_SHEETS[base] };
  }
  return shownSheet.sheet;
}

function drawFrameAt(c: CanvasRenderingContext2D, s: Sheet, idx: number, cx: number, bottom: number, scale: number) {
  const img = s.tex.image as HTMLCanvasElement;
  c.drawImage(img, (idx % s.cols) * s.cw, Math.floor(idx / s.cols) * s.ch, s.cw, s.ch, Math.round(cx - (s.cw * scale) / 2), Math.round(bottom - s.ch * scale), s.cw * scale, s.ch * scale);
}

function drawPreview() {
  if (!preview) return;
  if (isBoss(sel)) return drawBossPreview();
  const base = baseOf(sel), orig = BASE_SHEETS[base], mine = sheetFor(sel);
  // scale so the widest sheet (the knight's spear) still fits half the canvas
  const scale = Math.max(1, Math.floor(Math.min(80 / orig.cw, 80 / orig.ch) * 2) / 2);
  const W = Math.round(orig.cw * scale * 2 + 24), H = Math.round(orig.ch * scale + 12);
  if (preview.width !== W || preview.height !== H) {
    preview.width = W;
    preview.height = H;
  }
  const c = preview.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#1a1220';
  c.fillRect(0, 0, W, H);
  const anim = orig.anims[animSel.value] || orig.anims[Object.keys(orig.anims)[0]];
  const idx = anim[Math.floor(performance.now() / 160) % anim.length];
  drawFrameAt(c, orig, idx, W / 4 + 4, H - 6, scale);
  drawFrameAt(c, mine, idx, (W * 3) / 4 - 4, H - 6, scale);
}
/** One boss sprite, centered and as large as fits. */
function drawBossPreview() {
  const s = BOSS_SHEETS[sel];
  const scale = Math.max(1, Math.floor(Math.min(240 / s.cw, 160 / s.ch) * 2) / 2);
  const W = Math.round(s.cw * scale + 24), H = Math.round(s.ch * scale + 12);
  if (preview.width !== W || preview.height !== H) {
    preview.width = W;
    preview.height = H;
  }
  const c = preview.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#1a1220';
  c.fillRect(0, 0, W, H);
  const anim = s.anims[animSel.value] || s.anims[Object.keys(s.anims)[0]];
  drawFrameAt(c, s, anim[Math.floor(performance.now() / 160) % anim.length], W / 2, H - 6, scale);
}

const loop = () => {
  drawPreview();
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// ---------------------------------------------------------------- actions

function uniqueId(want: string) {
  let id = want, i = 2;
  while (isBase(id) || edits[id] || CODE[id]) id = `${want}_${i++}`;
  return id;
}

function renameVariant(input: HTMLInputElement) {
  const want = input.value.trim().toLowerCase();
  if (want === sel) return;
  if (!/^[a-z0-9_]+$/.test(want)) {
    input.value = sel;
    return say('IDs may only use a-z, 0-9 and _', 'err');
  }
  if (isBase(want) || edits[want] || CODE[want]) {
    input.value = sel;
    return say(`"${want}" is already taken`, 'err');
  }
  // keep one entry per original id, so a variant renamed twice still maps from its saved id
  const orig = Object.keys(renames).find((k) => renames[k] === sel) || sel;
  if (JSON.parse(savedJson)[orig]) renames[orig] = want;
  edits[want] = edits[sel];
  delete edits[sel];
  sel = want;
  drawList();
  refreshStatus();
}

$('variant').onclick = () => {
  const st = current(sel), base = baseOf(sel);
  const id = uniqueId(`${base}_variant`);
  edits[id] = { ...JSON.parse(JSON.stringify(st)), base, name: `${st.name} Variant` };
  refreshStatus();
  select(id);
  say(`Made ${id}. Rename it and change what you like, then save.`, 'ok');
};

$('delete').onclick = () => {
  if (isBase(sel)) return;
  if (!confirm(`Delete the variant "${current(sel).name}"? Rooms that place it will get the base enemy instead.`)) return;
  const base = baseOf(sel);
  delete edits[sel];
  refreshStatus();
  select(base);
};

// TEST: open the game in the enemy test chamber with this enemy (or this boss's fight).
// The working copy goes along through localStorage, so unsaved changes are tested too.
$('test').onclick = () => {
  // the stamp ties the copy to this one test tab (the game ignores copies with another stamp),
  // and the changing query string makes the tab reload even if only the hash differs
  const t = String(Date.now());
  try {
    localStorage.setItem(TEST_EDITS_KEY, JSON.stringify({ t, edits }));
  } catch {
    say('Could not hand over unsaved changes: the test uses the saved enemies', 'err');
  }
  const what = isBoss(sel) ? `boss:${sel}` : sel;
  window.open(`index.html?t=${t}#test=${what}`, 'nocturne_test');
};

$('reset').onclick = () => {
  if (!isCode(sel) || !edits[sel]) return;
  if (!confirm(`Reset ${CODE[sel].name} to the version in data.ts?`)) return;
  delete edits[sel];
  refreshStatus();
  select(sel);
};

$('save').onclick = async () => {
  const body = JSON.stringify({ enemies: edits, renames });
  let j: any = null;
  try {
    const res = await fetch('/__editor/save-enemies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    j = await res.json();
  } catch {
    // production builds have no save endpoint: hand the data over instead
    try {
      await navigator.clipboard.writeText(JSON.stringify(edits, null, 2));
      say('No dev server: enemy_edits.json content copied to the clipboard', 'ok');
    } catch {
      say('Save failed. Run npm run dev and try again', 'err');
    }
    return;
  }
  if (!j.ok) return say(`Save failed: ${j.error}`, 'err');
  savedJson = JSON.stringify(edits);
  renames = {};
  refreshStatus();
  say(`Saved ${j.enemies} enemies to enemy_edits.json${j.moved ? `, updated ${j.moved} placed enemies in rooms` : ''}. Reload the game or map editor to use them.`, 'ok');
};

window.addEventListener('beforeunload', (e) => {
  if (JSON.stringify(edits) !== savedJson) e.preventDefault();
});

drawList();
drawForm();
