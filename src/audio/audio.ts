// Web Audio engine: every sound is synthesized at runtime.
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  noiseBuf!: AudioBuffer;
  musicVol = 0.55;
  sfxVol = 0.8;
  private dist: Map<number, Float32Array> = new Map();
  private lastPlay: Record<string, number> = {};

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    // generated cathedral reverb
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 200 ? i / 200 : 1);
    }
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.32;
    this.reverbSend.connect(this.reverb).connect(this.master);
    // white noise
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  setMusicVol(v: number) {
    this.musicVol = v;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }
  setSfxVol(v: number) {
    this.sfxVol = v;
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  distCurve(k: number) {
    let c = this.dist.get(k);
    if (c) return c;
    c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    this.dist.set(k, c);
    return c;
  }

  // ------------------------------------------------------------ primitives
  tone(o: {
    type?: OscillatorType;
    f0: number;
    f1?: number;
    t?: number;
    dur: number;
    vol: number;
    attack?: number;
    out?: AudioNode;
    curve?: 'exp' | 'lin';
    detune?: number;
    lp?: number;
  }) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.t || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.detune) osc.detune.value = o.detune;
    if (o.f1 !== undefined) {
      if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(o.f1, t + o.dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node: AudioNode = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(o.out || this.sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }
  noise(o: { dur: number; vol: number; type?: BiquadFilterType; f0: number; f1?: number; q?: number; t?: number; attack?: number; out?: AudioNode }) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.t || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + (o.attack ?? 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f).connect(g).connect(o.out || this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + o.dur + 0.05);
  }

  // ------------------------------------------------------------ sound effects
  play(name: string, p = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.03) return; // de-dupe
    this.lastPlay[name] = now;
    const s = SFX[name];
    if (s) s(this, p);
  }
}

type Sfx = (a: AudioEngine, p: number) => void;
const SFX: Record<string, Sfx> = {
  whip: (a) => {
    a.noise({ dur: 0.14, vol: 0.25, type: 'bandpass', f0: 500, f1: 3000, q: 2, attack: 0.06 });
    a.noise({ dur: 0.06, vol: 0.55, type: 'highpass', f0: 3500, t: 0.1 });
    a.tone({ type: 'square', f0: 2400, f1: 900, dur: 0.04, vol: 0.08, t: 0.1 });
  },
  hit: (a) => {
    a.tone({ type: 'sine', f0: 220, f1: 50, dur: 0.14, vol: 0.6 });
    a.noise({ dur: 0.08, vol: 0.35, type: 'lowpass', f0: 2200, f1: 400 });
    a.tone({ type: 'square', f0: 900, f1: 300, dur: 0.05, vol: 0.06 });
  },
  clink: (a) => {
    a.tone({ type: 'triangle', f0: 1800, dur: 0.2, vol: 0.15 });
    a.tone({ type: 'triangle', f0: 2710, dur: 0.15, vol: 0.1 });
  },
  // shield (0.10.0): a dull wooden thud with a ring of iron on top
  block: (a) => {
    a.tone({ type: 'sine', f0: 160, f1: 70, dur: 0.12, vol: 0.45 });
    a.noise({ dur: 0.05, vol: 0.3, type: 'bandpass', f0: 1400, q: 3 });
    a.tone({ type: 'triangle', f0: 1350, dur: 0.14, vol: 0.08, t: 0.01 });
  },
  shieldUp: (a) => a.noise({ dur: 0.07, vol: 0.12, type: 'bandpass', f0: 900, f1: 1600, q: 2 }),
  shieldDown: (a) => {
    a.tone({ type: 'triangle', f0: 700, f1: 260, dur: 0.18, vol: 0.12 });
    a.noise({ dur: 0.1, vol: 0.2, type: 'lowpass', f0: 1200, f1: 300 });
  },
  // Gallows Spider: the silk snapping, legs ticking on stone (its spit uses 'spit')
  snap: (a) => {
    a.tone({ type: 'square', f0: 2600, f1: 1200, dur: 0.03, vol: 0.08 });
    a.noise({ dur: 0.05, vol: 0.2, type: 'highpass', f0: 5000 });
  },
  skitter: (a) => {
    for (let i = 0; i < 5; i++) a.noise({ dur: 0.015, vol: 0.12, type: 'highpass', f0: 3500, t: i * 0.035 });
  },
  enemyDie: (a) => {
    a.noise({ dur: 0.4, vol: 0.4, type: 'lowpass', f0: 3000, f1: 200 });
    a.tone({ type: 'square', f0: 500, f1: 60, dur: 0.35, vol: 0.12, lp: 2000 });
  },
  jump: (a) => a.tone({ type: 'square', f0: 180, f1: 360, dur: 0.09, vol: 0.06, lp: 1500 }),
  land: (a) => a.noise({ dur: 0.07, vol: 0.25, type: 'lowpass', f0: 600, f1: 120 }),
  dash: (a) => a.noise({ dur: 0.16, vol: 0.2, type: 'bandpass', f0: 1500, f1: 400, q: 1.5 }),
  hurt: (a) => {
    a.tone({ type: 'sawtooth', f0: 420, f1: 110, dur: 0.25, vol: 0.18, lp: 2500 });
    a.noise({ dur: 0.12, vol: 0.3, type: 'lowpass', f0: 1800 });
  },
  heart: (a) => {
    a.tone({ type: 'sine', f0: 988, dur: 0.08, vol: 0.2 });
    a.tone({ type: 'sine', f0: 1480, dur: 0.12, vol: 0.2, t: 0.06 });
  },
  item: (a) => {
    [523, 659, 784, 1047].forEach((f, i) => a.tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.18, t: i * 0.06 }));
  },
  relic: (a) => {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => {
      a.tone({ type: 'triangle', f0: f, dur: 0.6, vol: 0.14, t: i * 0.09, out: a.reverbSend });
      a.tone({ type: 'sine', f0: f * 2, dur: 0.4, vol: 0.06, t: i * 0.09 });
    });
  },
  levelUp: (a) => {
    [523, 659, 784, 988, 1047].forEach((f, i) => a.tone({ type: 'square', f0: f, dur: 0.16, vol: 0.09, t: i * 0.07, lp: 3000 }));
    a.tone({ type: 'square', f0: 1319, dur: 0.5, vol: 0.09, t: 0.38, lp: 3000 });
  },
  throw: (a) => a.noise({ dur: 0.18, vol: 0.18, type: 'bandpass', f0: 800, f1: 2400, q: 2 }),
  glass: (a) => {
    a.noise({ dur: 0.2, vol: 0.3, type: 'highpass', f0: 4000 });
    [3200, 4400, 5100].forEach((f, i) => a.tone({ type: 'sine', f0: f, dur: 0.18, vol: 0.06, t: i * 0.03 }));
  },
  fire: (a) => {
    a.noise({ dur: 0.7, vol: 0.3, type: 'lowpass', f0: 900, f1: 300, attack: 0.05 });
    for (let i = 0; i < 6; i++) a.noise({ dur: 0.03, vol: 0.15, type: 'highpass', f0: 3000, t: Math.random() * 0.6 });
  },
  cross: (a) => {
    for (let i = 0; i < 4; i++) a.tone({ type: 'triangle', f0: 1200 + i * 80, f1: 700, dur: 0.06, vol: 0.06, t: i * 0.07 });
  },
  grapple: (a) => {
    a.tone({ type: 'triangle', f0: 1300, dur: 0.25, vol: 0.18 });
    a.tone({ type: 'triangle', f0: 2050, dur: 0.18, vol: 0.12 });
    a.noise({ dur: 0.05, vol: 0.2, type: 'highpass', f0: 5000 });
  },
  splash: (a) => a.noise({ dur: 0.35, vol: 0.35, type: 'lowpass', f0: 2500, f1: 300 }),
  bone: (a) => {
    for (let i = 0; i < 3; i++) a.noise({ dur: 0.03, vol: 0.3, type: 'bandpass', f0: 1600 + i * 300, q: 6, t: i * 0.045 });
  },
  roar: (a) => {
    const ctx = a.ctx!;
    const t = ctx.currentTime;
    const ws = ctx.createWaveShaper();
    ws.curve = a.distCurve(40) as any;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    for (const f of [70, 73.5, 104]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 1.3, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 1.8);
      o.connect(ws);
      o.start(t);
      o.stop(t + 1.9);
    }
    ws.connect(lp).connect(g).connect(a.sfxBus);
    g.connect(a.reverbSend);
    a.noise({ dur: 1.6, vol: 0.25, type: 'bandpass', f0: 500, f1: 200, q: 1, attack: 0.2 });
  },
  // boss phase change: a long, distorted, wavering shriek layered over the roar
  screech: (a) => {
    const ctx = a.ctx!, t = ctx.currentTime, dur = 2.4;
    const ws = ctx.createWaveShaper();
    ws.curve = a.distCurve(60) as any;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + dur);
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.08);
    g.gain.setValueAtTime(0.5, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11; // the "wobble" in the shriek
    const depth = ctx.createGain();
    depth.gain.value = 70;
    lfo.connect(depth);
    for (const f of [1050, 1110, 1580]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.3);
      o.frequency.exponentialRampToValueAtTime(f * 0.45, t + dur);
      depth.connect(o.frequency);
      o.connect(ws);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
    ws.connect(bp).connect(g).connect(a.sfxBus);
    g.connect(a.reverbSend);
    a.noise({ dur: dur * 0.8, vol: 0.3, type: 'highpass', f0: 2500, f1: 900, attack: 0.05 });
    SFX.roar(a, 1);
  },
  lever: (a) => {
    a.tone({ type: 'square', f0: 140, f1: 70, dur: 0.12, vol: 0.25, lp: 900 });
    for (let i = 0; i < 4; i++) a.noise({ dur: 0.03, vol: 0.25, type: 'bandpass', f0: 2200, q: 8, t: 0.05 + i * 0.05 });
    a.tone({ type: 'triangle', f0: 1500, dur: 0.25, vol: 0.1, t: 0.25 });
  },
  // gurgling water running out through a sluice
  drain: (a) => {
    a.noise({ dur: 1.0, vol: 0.3, type: 'lowpass', f0: 500, f1: 160, attack: 0.1 });
    for (let i = 0; i < 5; i++) {
      const f = 200 + Math.random() * 250;
      a.tone({ type: 'sine', f0: f, f1: f * 1.8, dur: 0.09, vol: 0.12, t: i * 0.15 + Math.random() * 0.08 });
    }
  },
  bossHit: (a) => {
    a.tone({ type: 'sine', f0: 160, f1: 40, dur: 0.22, vol: 0.7 });
    a.noise({ dur: 0.1, vol: 0.4, type: 'bandpass', f0: 1800, q: 3 });
  },
  explode: (a) => {
    a.noise({ dur: 1.0, vol: 0.55, type: 'lowpass', f0: 1800, f1: 80 });
    a.tone({ type: 'sine', f0: 120, f1: 30, dur: 0.8, vol: 0.6 });
  },
  breath: (a) => a.noise({ dur: 1.2, vol: 0.35, type: 'bandpass', f0: 400, f1: 1500, q: 0.8, attack: 0.1 }),
  spit: (a) => {
    a.noise({ dur: 0.15, vol: 0.25, type: 'bandpass', f0: 900, f1: 300, q: 2 });
    a.tone({ type: 'sawtooth', f0: 300, f1: 120, dur: 0.15, vol: 0.06, lp: 1200 });
  },
  menu: (a) => a.tone({ type: 'square', f0: 660, dur: 0.05, vol: 0.06, lp: 3000 }),
  confirm: (a) => {
    a.tone({ type: 'square', f0: 660, dur: 0.06, vol: 0.07, lp: 3000 });
    a.tone({ type: 'square', f0: 990, dur: 0.1, vol: 0.07, t: 0.05, lp: 3000 });
  },
  cancel: (a) => a.tone({ type: 'square', f0: 440, f1: 300, dur: 0.1, vol: 0.07, lp: 2000 }),
  pause: (a) => {
    a.tone({ type: 'triangle', f0: 880, dur: 0.1, vol: 0.12 });
    a.tone({ type: 'triangle', f0: 660, dur: 0.15, vol: 0.12, t: 0.08 });
  },
  save: (a) => {
    [440, 554, 659, 880].forEach((f) => a.tone({ type: 'sine', f0: f, dur: 1.6, vol: 0.09, attack: 0.3, out: a.reverbSend }));
    [440, 554, 659, 880].forEach((f) => a.tone({ type: 'triangle', f0: f, dur: 1.2, vol: 0.05, attack: 0.3 }));
  },
  crumble: (a) => {
    a.noise({ dur: 0.4, vol: 0.4, type: 'lowpass', f0: 1200, f1: 150 });
    for (let i = 0; i < 4; i++) a.noise({ dur: 0.04, vol: 0.2, type: 'bandpass', f0: 800 + Math.random() * 800, q: 4, t: i * 0.06 });
  },
  candle: (a) => {
    a.noise({ dur: 0.12, vol: 0.2, type: 'highpass', f0: 2000, f1: 6000 });
    a.tone({ type: 'sine', f0: 1200, f1: 600, dur: 0.1, vol: 0.06 });
  },
  door: (a) => a.noise({ dur: 0.6, vol: 0.4, type: 'lowpass', f0: 300, f1: 60, attack: 0.05 }),
  gate: (a) => {
    a.noise({ dur: 0.9, vol: 0.5, type: 'lowpass', f0: 500, f1: 50 });
    a.tone({ type: 'sine', f0: 80, f1: 40, dur: 0.6, vol: 0.5 });
  },
  death: (a) => {
    [392, 349, 311, 262, 196].forEach((f, i) => a.tone({ type: 'sawtooth', f0: f, dur: 0.4, vol: 0.08, t: i * 0.16, lp: 1500 }));
  },
  spike: (a) => {
    a.tone({ type: 'square', f0: 1200, f1: 200, dur: 0.15, vol: 0.1 });
    a.noise({ dur: 0.1, vol: 0.3, type: 'highpass', f0: 2000 });
  },
  flame: (a) => a.noise({ dur: 0.2, vol: 0.12, type: 'bandpass', f0: 600, f1: 1400, q: 1 }),
  // a huge, distant bell: FM partials that ring on into the reverb
  toll: (a) => {
    const ctx = a.ctx!, t = ctx.currentTime, dur = 4.5;
    for (const [f, v] of [[98, 0.22], [196.5, 0.1], [262, 0.06], [415, 0.04]]) {
      const car = ctx.createOscillator();
      car.frequency.value = f;
      const mod = ctx.createOscillator();
      mod.frequency.value = f * 1.41;
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(f * 1.2, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 2);
      mod.connect(mg).connect(car.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      car.connect(g);
      g.connect(a.sfxBus);
      g.connect(a.reverbSend);
      car.start(t);
      mod.start(t);
      car.stop(t + dur + 0.05);
      mod.stop(t + dur + 0.05);
    }
  },
  // wild dog: a low rattling growl, and a sharp bark when it pounces
  growl: (a) => {
    a.tone({ type: 'sawtooth', f0: 95, f1: 80, dur: 0.45, vol: 0.12, lp: 500 });
    a.noise({ dur: 0.45, vol: 0.18, type: 'lowpass', f0: 400, f1: 250 });
  },
  bark: (a) => {
    a.tone({ type: 'sawtooth', f0: 420, f1: 180, dur: 0.12, vol: 0.14, lp: 1400 });
    a.noise({ dur: 0.1, vol: 0.2, type: 'bandpass', f0: 900, q: 2 });
  },
  // the bell wraith's little hand bell
  handbell: (a) => {
    for (const [f, v] of [[1180, 0.12], [1770, 0.06], [2650, 0.04]]) a.tone({ type: 'sine', f0: f, dur: 1.1, vol: v, out: a.reverbSend });
    a.tone({ type: 'triangle', f0: 1180, dur: 0.6, vol: 0.08 });
  },
  // the bell wraith's toll, right up close: a heavy clapper strike and a big, low DONG
  // whose beating partials hang in the air
  dong: (a) => {
    const ctx = a.ctx!, t = ctx.currentTime, dur = 2.6;
    for (const [f, v] of [[147, 0.3], [149.5, 0.18], [294, 0.12], [352, 0.08], [441, 0.07], [740, 0.04]]) {
      const car = ctx.createOscillator();
      car.frequency.value = f;
      const mod = ctx.createOscillator();
      mod.frequency.value = f * 1.41;
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(f * 1.6, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.04, t + 0.9);
      mod.connect(mg).connect(car.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (f < 200 ? 1 : 0.6));
      car.connect(g);
      g.connect(a.sfxBus);
      g.connect(a.reverbSend);
      car.start(t);
      mod.start(t);
      car.stop(t + dur + 0.05);
      mod.stop(t + dur + 0.05);
    }
    // the clapper strike and the thump of air
    a.noise({ dur: 0.08, vol: 0.4, type: 'bandpass', f0: 2400, q: 1.2 });
    a.tone({ type: 'sine', f0: 90, f1: 40, dur: 0.35, vol: 0.4 });
  },
  // harpy cry: a short falling screech
  harpy: (a) => {
    a.tone({ type: 'sawtooth', f0: 1900, f1: 900, dur: 0.25, vol: 0.06, lp: 3500 });
    a.noise({ dur: 0.2, vol: 0.12, type: 'highpass', f0: 3000, f1: 1500 });
  },
  // a tome tearing loose from its shelf: a quick riffle of paper and a dry thump
  // a wooden chair coming to life: a slow, wavering creak
  creak: (a) => {
    a.tone({ type: 'sawtooth', f0: 150, f1: 210, dur: 0.18, vol: 0.06, lp: 700 });
    a.tone({ type: 'sawtooth', f0: 210, f1: 120, dur: 0.22, vol: 0.06, lp: 700, t: 0.16 });
    a.noise({ dur: 0.3, vol: 0.06, type: 'bandpass', f0: 900, f1: 500, q: 4 });
  },
  // chair legs knocking down on the floor
  knock: (a) => {
    a.noise({ dur: 0.08, vol: 0.3, type: 'lowpass', f0: 900, f1: 200 });
    a.tone({ type: 'triangle', f0: 180, f1: 90, dur: 0.1, vol: 0.12 });
  },
  pages: (a) => {
    for (let i = 0; i < 7; i++) a.noise({ dur: 0.04, vol: 0.2, type: 'bandpass', f0: 2600 + Math.random() * 1800, q: 1.5, t: i * 0.035 });
    a.tone({ type: 'triangle', f0: 240, f1: 130, dur: 0.12, vol: 0.06, lp: 900 });
  },
  // Gnarlfang calling its pack: two rising and falling voices
  howl: (a) => {
    a.tone({ type: 'sawtooth', f0: 220, f1: 420, dur: 0.6, vol: 0.1, lp: 1200, attack: 0.1 });
    a.tone({ type: 'sawtooth', f0: 420, f1: 260, dur: 0.9, vol: 0.1, lp: 1200, t: 0.55 });
    a.tone({ type: 'sawtooth', f0: 330, f1: 520, dur: 0.6, vol: 0.07, lp: 1400, attack: 0.1, t: 0.1 });
    a.tone({ type: 'sawtooth', f0: 520, f1: 300, dur: 0.9, vol: 0.07, lp: 1400, t: 0.65 });
  },
  // the mountain groaning: deep filtered noise with a sub-bass throb
  rumble: (a) => {
    a.noise({ dur: 1.3, vol: 0.35, type: 'lowpass', f0: 160, f1: 90, attack: 0.25 });
    a.tone({ type: 'sine', f0: 42, f1: 34, dur: 1.2, vol: 0.35, attack: 0.2 });
  },
  // the avalanche hitting: a roaring wash of noise over a falling boom
  avalanche: (a) => {
    a.noise({ dur: 2.6, vol: 0.55, type: 'lowpass', f0: 1400, f1: 120, attack: 0.08 });
    a.noise({ dur: 1.8, vol: 0.25, type: 'bandpass', f0: 3000, f1: 600, q: 0.7, attack: 0.05 });
    a.tone({ type: 'sine', f0: 70, f1: 28, dur: 1.6, vol: 0.6 });
    for (let i = 0; i < 6; i++) a.noise({ dur: 0.08, vol: 0.2, type: 'bandpass', f0: 500 + Math.random() * 900, q: 3, t: 0.1 + Math.random() * 1.2 });
  },
  // double jump: an airy whoosh that rises, like a cloak snapping open
  djump: (a) => {
    a.noise({ dur: 0.22, vol: 0.25, type: 'bandpass', f0: 600, f1: 2600, q: 1.5, attack: 0.02 });
    a.tone({ type: 'triangle', f0: 400, f1: 820, dur: 0.12, vol: 0.08 });
  },
  // boss reward beacon: a soft, high two-note shimmer that repeats while the item waits
  chime: (a) => {
    [1568, 2093].forEach((f, i) => a.tone({ type: 'sine', f0: f, dur: 0.5, vol: 0.06, t: i * 0.12, out: a.reverbSend }));
  },
  // tide turning: a deep slosh of water rushing through the channels
  tide: (a) => {
    a.noise({ dur: 1.6, vol: 0.3, type: 'lowpass', f0: 500, f1: 180, attack: 0.4 });
    a.noise({ dur: 1.0, vol: 0.12, type: 'bandpass', f0: 1200, f1: 600, q: 0.8, attack: 0.3 });
  },
  // a swim stroke: a short bubbly splash
  swim: (a) => {
    a.noise({ dur: 0.14, vol: 0.18, type: 'bandpass', f0: 900, f1: 1800, q: 2 });
    a.tone({ type: 'sine', f0: 300, f1: 520, dur: 0.08, vol: 0.06 });
  },
  // map marker placed / removed
  mark: (a) => a.tone({ type: 'triangle', f0: 880, f1: 1320, dur: 0.07, vol: 0.08 }),
  // slide: boots scraping across ice and snow
  slide: (a) => {
    a.noise({ dur: 0.35, vol: 0.28, type: 'bandpass', f0: 2200, f1: 700, q: 1.2, attack: 0.01 });
    a.noise({ dur: 0.2, vol: 0.15, type: 'highpass', f0: 5000 });
  },
  // ---- experimental relics and enemies (0.4.0)
  // Duskwing Shroud opening: a soft, papery flutter
  glide: (a) => {
    for (let i = 0; i < 4; i++) a.noise({ dur: 0.05, vol: 0.12, type: 'bandpass', f0: 900 + i * 150, q: 2, t: i * 0.04 });
    a.noise({ dur: 0.3, vol: 0.08, type: 'lowpass', f0: 1200, f1: 500, attack: 0.05 });
  },
  // Ashglass Ward: a rising glassy shimmer, a ping when something bounces off, a shatter, and a fade
  ward: (a) => {
    [660, 990, 1320].forEach((f, i) => a.tone({ type: 'sine', f0: f, f1: f * 1.5, dur: 0.35, vol: 0.08, t: i * 0.04, out: a.reverbSend }));
    a.noise({ dur: 0.3, vol: 0.1, type: 'highpass', f0: 3000, f1: 6000, attack: 0.1 });
  },
  wardHit: (a) => {
    a.tone({ type: 'triangle', f0: 2200, f1: 1600, dur: 0.12, vol: 0.1 });
    a.tone({ type: 'sine', f0: 3300, dur: 0.08, vol: 0.05 });
  },
  wardPop: (a) => {
    SFX.glass(a, 1);
    a.tone({ type: 'sine', f0: 1500, f1: 300, dur: 0.3, vol: 0.12 });
  },
  wardOff: (a) => a.tone({ type: 'sine', f0: 1320, f1: 660, dur: 0.25, vol: 0.06 }),
  // Hookjaw's chain rattling out
  chain: (a) => {
    for (let i = 0; i < 3; i++) a.noise({ dur: 0.025, vol: 0.18, type: 'bandpass', f0: 2600 + Math.random() * 1200, q: 10, t: i * 0.03 });
  },
  // Mire Eel snapping its jaws
  bite: (a) => {
    a.noise({ dur: 0.06, vol: 0.3, type: 'bandpass', f0: 1400, q: 3 });
    a.tone({ type: 'square', f0: 260, f1: 90, dur: 0.08, vol: 0.08, lp: 1200 });
  },
  // Gloomcaster: a whispering, wavering chord as it gathers the hex, and a hollow pop when it steps through shadow
  hex: (a) => {
    [233, 277, 349].forEach((f) => a.tone({ type: 'sawtooth', f0: f, f1: f * 1.06, dur: 0.7, vol: 0.04, attack: 0.3, lp: 900, out: a.reverbSend }));
    a.noise({ dur: 0.7, vol: 0.08, type: 'bandpass', f0: 2500, f1: 1200, q: 4, attack: 0.3 });
  },
  blink: (a) => {
    a.tone({ type: 'sine', f0: 900, f1: 180, dur: 0.18, vol: 0.12 });
    a.noise({ dur: 0.15, vol: 0.1, type: 'lowpass', f0: 1500, f1: 300 });
  },
  // Rot Ooze: a wet slap
  squelch: (a) => {
    a.noise({ dur: 0.12, vol: 0.22, type: 'lowpass', f0: 900, f1: 200, q: 3 });
    a.tone({ type: 'sine', f0: 180, f1: 90, dur: 0.1, vol: 0.12 });
  },
  // a boss's freeze frame: a deep, ringing hit
  sting: (a) => {
    a.noise({ dur: 0.25, vol: 0.35, type: 'lowpass', f0: 1800, f1: 150 });
    a.tone({ type: 'sawtooth', f0: 110, f1: 52, dur: 0.9, vol: 0.14, lp: 900 });
    a.tone({ type: 'square', f0: 220, f1: 104, dur: 0.6, vol: 0.05, lp: 1400, t: 0.02 });
  },
  // a Grave Moth darting in: quick, dry, papery wingbeats
  flutter: (a) => {
    for (let i = 0; i < 4; i++) a.noise({ dur: 0.025, vol: 0.13, type: 'bandpass', f0: 1400 + i * 150, q: 2, t: i * 0.045 });
  },
  // a Grave Moth bursting: a soft, dusty puff
  powder: (a) => {
    a.noise({ dur: 0.3, vol: 0.22, type: 'bandpass', f0: 1800, f1: 600, q: 0.8 });
    a.tone({ type: 'sine', f0: 140, f1: 70, dur: 0.15, vol: 0.08 });
  },
  // Grave Grub digging: gritty, scraping earth
  // dialogue typing out: a soft, slightly random blip every few letters
  talk: (a) => a.tone({ type: 'triangle', f0: 520 + Math.random() * 80, dur: 0.035, vol: 0.05 }),
  // picking up coins: a bright two-note clink
  coin: (a) => {
    a.tone({ type: 'square', f0: 1320, dur: 0.06, vol: 0.06, lp: 4000 });
    a.tone({ type: 'square', f0: 1980, dur: 0.12, vol: 0.06, lp: 4000, t: 0.05 });
  },
  // a Gravehand dragging itself under the floor: a dull scrape, louder (`p` up to 1) as it speeds up
  scrape: (a, p) => {
    a.noise({ dur: 0.14, vol: 0.06 + 0.14 * p, type: 'lowpass', f0: 420, f1: 150, attack: 0.02 });
    a.noise({ dur: 0.03, vol: 0.04 + 0.06 * p, type: 'bandpass', f0: 1500, q: 4, t: 0.05 });
  },
  burrow: (a) => {
    a.noise({ dur: 0.45, vol: 0.25, type: 'bandpass', f0: 500, f1: 250, q: 1.5, attack: 0.05 });
    for (let i = 0; i < 5; i++) a.noise({ dur: 0.03, vol: 0.12, type: 'bandpass', f0: 1200 + Math.random() * 800, q: 5, t: i * 0.07 });
  },
  // easter egg: a low sawtooth whose pitch is wobbled fast by an LFO, plus a breathy flutter
  fart: (a) => {
    const ctx = a.ctx!, t = ctx.currentTime, dur = 0.85;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(62, t + dur);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(34, t);
    lfo.frequency.linearRampToValueAtTime(18, t + dur);
    const depth = ctx.createGain();
    depth.gain.value = 38;
    lfo.connect(depth).connect(osc.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.03);
    g.gain.setValueAtTime(0.3, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp).connect(g).connect(a.sfxBus);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
    a.noise({ dur: dur * 0.9, vol: 0.12, type: 'lowpass', f0: 380, f1: 140, attack: 0.02 });
  },
};
