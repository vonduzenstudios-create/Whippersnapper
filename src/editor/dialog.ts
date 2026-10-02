// A small HTML form shown over the game canvas, for editor settings that need typing
// (room names, flags, sign text keys). Keys typed into it never reach the game.

export interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'check';
  value: string | number | boolean;
  /** For selects: [value, label] pairs. */
  options?: [string, string][];
  min?: number;
  max?: number;
  help?: string;
}

const CSS = `
.ed-dlg-back { position: fixed; inset: 0; background: rgba(5,3,8,0.7); display: flex; align-items: center; justify-content: center; z-index: 50; }
.ed-dlg { background: #140c1a; border: 2px solid #d8b060; color: #e8dcc8; font: 14px/1.4 ui-monospace, Consolas, monospace; padding: 16px 18px; min-width: 320px; max-width: 90vw; }
.ed-dlg h2 { margin: 0 0 12px; font-size: 15px; color: #d8b060; letter-spacing: 1px; text-transform: uppercase; }
.ed-dlg label { display: grid; grid-template-columns: 9em 1fr; align-items: center; gap: 10px; margin: 7px 0; }
.ed-dlg label.check { grid-template-columns: 9em auto; justify-content: start; }
.ed-dlg input, .ed-dlg select { background: #0a0610; color: #e8dcc8; border: 1px solid #6a4a2a; padding: 4px 6px; font: inherit; }
.ed-dlg input:focus, .ed-dlg select:focus { outline: 1px solid #d8b060; }
.ed-dlg .help { grid-column: 2; color: #8a7a90; font-size: 12px; margin-top: -6px; }
.ed-dlg .row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.ed-dlg button { background: #1e1424; color: #e8dcc8; border: 1px solid #6a4a2a; padding: 5px 14px; font: inherit; cursor: pointer; }
.ed-dlg button.ok { background: #6a2030; border-color: #d8b060; }
.ed-dlg button:hover { background: #3a2030; }
`;

/** Show a form. Resolves with the entered values by key, or null if cancelled. */
export function formDialog(title: string, fields: Field[], okLabel = 'OK'): Promise<Record<string, any> | null> {
  if (!document.getElementById('ed-dlg-css')) {
    const st = document.createElement('style');
    st.id = 'ed-dlg-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'ed-dlg-back';
    const box = document.createElement('form');
    box.className = 'ed-dlg';
    const h = document.createElement('h2');
    h.textContent = title;
    box.appendChild(h);
    const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
    for (const f of fields) {
      const lab = document.createElement('label');
      if (f.type === 'check') lab.className = 'check';
      lab.append(f.label);
      let el: HTMLInputElement | HTMLSelectElement;
      if (f.type === 'select') {
        el = document.createElement('select');
        for (const [v, l] of f.options || []) el.add(new Option(l, v, false, v === f.value));
      } else {
        el = document.createElement('input');
        el.type = f.type === 'check' ? 'checkbox' : f.type;
        if (f.type === 'check') el.checked = !!f.value;
        else el.value = String(f.value);
        if (f.min !== undefined) el.min = String(f.min);
        if (f.max !== undefined) el.max = String(f.max);
      }
      lab.appendChild(el);
      if (f.help) {
        const hp = document.createElement('div');
        hp.className = 'help';
        hp.textContent = f.help;
        lab.appendChild(hp);
      }
      box.appendChild(lab);
      inputs.set(f.key, el);
    }
    const row = document.createElement('div');
    row.className = 'row';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    const ok = document.createElement('button');
    ok.type = 'submit';
    ok.className = 'ok';
    ok.textContent = okLabel;
    row.append(cancel, ok);
    box.appendChild(row);
    back.appendChild(box);
    document.body.appendChild(back);

    const done = (v: Record<string, any> | null) => {
      back.remove();
      resolve(v);
    };
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      const out: Record<string, any> = {};
      for (const f of fields) {
        const el = inputs.get(f.key)!;
        if (f.type === 'check') out[f.key] = (el as HTMLInputElement).checked;
        else if (f.type === 'number') {
          let n = Number(el.value);
          if (!isFinite(n)) n = Number(f.value);
          if (f.min !== undefined) n = Math.max(f.min, n);
          if (f.max !== undefined) n = Math.min(f.max, n);
          out[f.key] = n;
        } else out[f.key] = el.value.trim();
      }
      done(out);
    });
    cancel.addEventListener('click', () => done(null));
    back.addEventListener('pointerdown', (e) => e.target === back && done(null));
    // keep typing away from the game and editor shortcuts
    for (const type of ['keydown', 'keyup'] as const)
      back.addEventListener(type, (e) => {
        e.stopPropagation();
        if (type === 'keydown' && (e as KeyboardEvent).key === 'Escape') done(null);
      });
    (inputs.values().next().value as HTMLElement | undefined)?.focus();
  });
}
