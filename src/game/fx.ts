import * as THREE from 'three';
import { Sprite, Sheet } from '../gfx/view';
import { rand } from '../core/util';

interface Part {
  s: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grav: number;
  t: number;
  life: number;
  frames: number[];
  fps: number;
  rot: number;
  fade: boolean;
  drag: number;
}

export interface BurstOpts {
  vx?: number;
  vy?: number;
  speed?: number;
  grav?: number;
  life?: number;
  fps?: number;
  sheet?: 'fx' | 'fire';
  rot?: number;
  fade?: boolean;
  order?: number;
  tint?: [number, number, number];
  drag?: number;
  glow?: number;
}

export class FX {
  parts: Part[] = [];
  pool: Sprite[] = [];
  constructor(private parent: THREE.Object3D, private sheets: { fx: Sheet; fire: Sheet }) {}

  burst(x: number, y: number, name: string, n = 1, spread = 0, o: BurstOpts = {}) {
    const sheet = this.sheets[o.sheet || 'fx'];
    const frames = sheet.anims[name];
    if (!frames) return;
    for (let i = 0; i < n; i++) {
      let s = this.pool.pop();
      if (!s || s.sheet !== sheet) {
        if (s) s.dispose();
        s = new Sprite(sheet, this.parent, o.order ?? 20);
      }
      s.mesh.renderOrder = o.order ?? 20;
      s.visible = true;
      s.opacity = 1;
      s.flash = 0;
      s.glow = o.glow || 0;
      if (o.tint) s.tint(...o.tint);
      else s.tint(1, 1, 1);
      s.mesh.rotation.z = 0;
      const a = rand(0, Math.PI * 2);
      const sp = o.speed ?? 0;
      this.parts.push({
        s,
        x: x + rand(-spread, spread),
        y: y + rand(-spread, spread),
        vx: (o.vx ?? 0) + Math.cos(a) * sp * rand(0.4, 1),
        vy: (o.vy ?? 0) + Math.sin(a) * sp * rand(0.4, 1),
        grav: o.grav ?? 0,
        t: 0,
        life: o.life ?? frames.length * Math.round(60 / (o.fps ?? 15)),
        frames,
        fps: o.fps ?? 15,
        rot: o.rot ?? 0,
        fade: o.fade ?? false,
        drag: o.drag ?? 1,
      });
    }
  }

  update() {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t++;
      p.vy += p.grav;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      if (p.t >= p.life) {
        p.s.visible = false;
        this.pool.push(p.s);
        this.parts.splice(i, 1);
        continue;
      }
      const k = Math.min(p.frames.length - 1, Math.floor((p.t / 60) * p.fps)) % p.frames.length;
      p.s.setFrame(p.frames[k]);
      p.s.place(p.x, p.y);
      if (p.rot) p.s.mesh.rotation.z += p.rot;
      if (p.fade) p.s.opacity = 1 - p.t / p.life;
    }
  }

  clear() {
    for (const p of this.parts) {
      p.s.visible = false;
      this.pool.push(p.s);
    }
    this.parts = [];
  }
}
