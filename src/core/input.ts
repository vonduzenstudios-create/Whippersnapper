import { BIND_KEY } from '../config';

// The Ashglass Ward has no button of its own: it's UP + SUB-WEAPON (see Player.update).
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'sub' | 'subPrev' | 'subNext' | 'dash' | 'pause' | 'map';
export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'attack', 'sub', 'subPrev', 'subNext', 'dash', 'pause', 'map'];
export const REBINDABLE: Action[] = ['jump', 'attack', 'sub', 'subPrev', 'subNext', 'dash', 'pause', 'map', 'up', 'down', 'left', 'right'];
/** Display names for the controls menu (defaults to the upper-cased action id). */
export const ACTION_LABEL: Partial<Record<Action, string>> = { sub: 'SUB-WEAPON', subPrev: 'SUB PREV', subNext: 'SUB NEXT' };

const DEFAULT_KEYS: Record<Action, string[]> = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'KeyK'],
  attack: ['KeyX', 'KeyJ'],
  sub: ['KeyC', 'KeyL'],
  subPrev: ['KeyQ'],
  subNext: ['KeyE'],
  dash: ['ShiftLeft', 'KeyV'],
  pause: ['Enter', 'Escape'],
  map: ['Tab', 'KeyM'],
};
// Standard gamepad mapping
const DEFAULT_PAD: Record<Action, number[]> = {
  left: [14],
  right: [15],
  up: [12],
  down: [13],
  jump: [0],
  attack: [2],
  sub: [3],
  subPrev: [4], // LB
  subNext: [5], // RB
  dash: [1],
  pause: [9],
  map: [8],
};

export const PAD_NAMES: Record<number, string> = {
  0: 'PAD A', 1: 'PAD B', 2: 'PAD X', 3: 'PAD Y', 4: 'PAD LB', 5: 'PAD RB', 6: 'PAD LT', 7: 'PAD RT',
  8: 'PAD BACK', 9: 'PAD START', 10: 'PAD LS', 11: 'PAD RS', 12: 'DPAD UP', 13: 'DPAD DOWN', 14: 'DPAD LEFT', 15: 'DPAD RIGHT',
};

export function keyLabel(code: string) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code.replace('Left', ' L').replace('Right', ' R').toUpperCase();
}

type Capture = (b: { type: 'key'; code: string } | { type: 'pad'; btn: number }) => void;

export class Input {
  keys = new Set<string>();
  keyHits = new Set<string>();
  bindKeys: Record<Action, string[]>;
  bindPad: Record<Action, number[]>;
  held = {} as Record<Action, boolean>;
  prev = {} as Record<Action, boolean>;
  padPrev: boolean[] = [];
  padNow: boolean[] = [];
  padConnected = false;
  stickX = 0;
  stickY = 0;
  /** Right stick vertical (-1 up .. 1 down, 0 inside the dead zone). The map zooms with it. */
  rStickY = 0;
  private capture: Capture | null = null;
  // menu edges
  confirm = false;
  cancel = false;
  mUp = false;
  mDown = false;
  mLeft = false;
  mRight = false;
  private repeat: Record<string, number> = {};
  anyPressed = false;
  onFirstGesture: (() => void) | null = null;
  /** While set (cutscenes), these replace the player's held actions. Menu edges still read real input. */
  script: Partial<Record<Action, boolean>> | null = null;

  constructor() {
    this.bindKeys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
    this.bindPad = JSON.parse(JSON.stringify(DEFAULT_PAD));
    try {
      const saved = localStorage.getItem(BIND_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.keys) Object.assign(this.bindKeys, s.keys);
        if (s.pad) Object.assign(this.bindPad, s.pad);
        // older saves had RB on dash; RB now cycles sub-weapons
        const dash = this.bindPad.dash;
        if (dash.length === 2 && dash[0] === 1 && dash[1] === 5) this.bindPad.dash = [1];
      }
    } catch {
      /* storage unavailable */
    }
    for (const a of ACTIONS) {
      this.held[a] = false;
      this.prev[a] = false;
    }
    window.addEventListener('keydown', (e) => {
      if (this.onFirstGesture) {
        this.onFirstGesture();
      }
      if (this.capture) {
        e.preventDefault();
        const c = this.capture;
        this.capture = null;
        c({ type: 'key', code: e.code });
        return;
      }
      if (!e.repeat) this.keyHits.add(e.code);
      this.keys.add(e.code);
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('pointerdown', () => this.onFirstGesture && this.onFirstGesture());
  }

  saveBinds() {
    try {
      localStorage.setItem(BIND_KEY, JSON.stringify({ keys: this.bindKeys, pad: this.bindPad }));
    } catch {
      /* ignore */
    }
  }
  resetBinds() {
    this.bindKeys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
    this.bindPad = JSON.parse(JSON.stringify(DEFAULT_PAD));
    this.saveBinds();
  }
  captureNext(cb: Capture) {
    this.capture = cb;
  }
  get capturing() {
    return this.capture !== null;
  }

  private pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;
    for (const p of pads) if (p && p.connected) { pad = p; break; }
    this.padPrev = this.padNow;
    this.padNow = [];
    this.stickX = 0;
    this.stickY = 0;
    this.rStickY = 0;
    this.padConnected = !!pad;
    if (!pad) return;
    for (let i = 0; i < pad.buttons.length; i++) this.padNow[i] = pad.buttons[i].pressed || pad.buttons[i].value > 0.5;
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, ry = pad.axes[3] || 0;
    this.stickX = Math.abs(ax) > 0.4 ? ax : 0;
    this.stickY = Math.abs(ay) > 0.4 ? ay : 0;
    this.rStickY = Math.abs(ry) > 0.4 ? ry : 0;
    if (this.capture) {
      for (let i = 0; i < this.padNow.length; i++) {
        if (this.padNow[i] && !this.padPrev[i]) {
          const c = this.capture;
          this.capture = null;
          c({ type: 'pad', btn: i });
          break;
        }
      }
    }
    if (this.onFirstGesture && this.padNow.some((b) => b)) this.onFirstGesture();
  }

  /** Call once per fixed tick. */
  update() {
    this.pollPad();
    this.anyPressed = this.keyHits.size > 0 || this.padNow.some((b, i) => b && !this.padPrev[i]);
    for (const a of ACTIONS) {
      this.prev[a] = this.held[a];
      let h = false;
      for (const k of this.bindKeys[a]) if (this.keys.has(k) || this.keyHits.has(k)) h = true;
      for (const b of this.bindPad[a]) if (this.padNow[b]) h = true;
      if (a === 'left' && this.stickX < -0.4) h = true;
      if (a === 'right' && this.stickX > 0.4) h = true;
      if (a === 'up' && this.stickY < -0.5) h = true;
      if (a === 'down' && this.stickY > 0.5) h = true;
      this.held[a] = h;
    }
    if (this.script) for (const a of ACTIONS) this.held[a] = !!this.script[a];
    const padHit = (i: number) => this.padNow[i] && !this.padPrev[i];
    const keyHit = (...c: string[]) => c.some((k) => this.keyHits.has(k));
    this.confirm = keyHit('Enter', 'Space', 'KeyZ', 'KeyK') || padHit(0) || padHit(9);
    this.cancel = keyHit('Escape', 'Backspace', 'KeyX', 'KeyJ') || padHit(1);
    this.mUp = this.rep('up', this.held.up);
    this.mDown = this.rep('down', this.held.down);
    this.mLeft = this.rep('left', this.held.left);
    this.mRight = this.rep('right', this.held.right);
    this.keyHits.clear();
  }

  private rep(name: string, h: boolean) {
    if (!h) {
      this.repeat[name] = 0;
      return false;
    }
    const t = (this.repeat[name] = (this.repeat[name] || 0) + 1);
    return t === 1 || (t > 20 && t % 6 === 0);
  }

  down(a: Action) {
    return this.held[a];
  }
  pressed(a: Action) {
    return this.held[a] && !this.prev[a];
  }
  released(a: Action) {
    return !this.held[a] && this.prev[a];
  }
  /** Short name of the first binding for an action, for on-screen hints ("Z", "SHIFT L", "PAD A"). */
  label(a: Action) {
    if (this.padConnected && this.bindPad[a].length) {
      const b = this.bindPad[a][0];
      return PAD_NAMES[b] || `PAD ${b}`;
    }
    return this.bindKeys[a].length ? keyLabel(this.bindKeys[a][0]) : '?';
  }
  /** Use up this tick's press of one action, so later checks of pressed(a) see nothing. */
  consume(a: Action) {
    this.prev[a] = this.held[a];
  }
  /** Forget the current presses (e.g. when closing a menu) so they don't leak into gameplay. */
  flush() {
    for (const a of ACTIONS) this.prev[a] = this.held[a];
  }
}
