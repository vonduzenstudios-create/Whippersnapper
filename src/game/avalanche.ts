// The avalanche that chases the hero down the Hollowcrown Pass.
//
// It is one tall wall of snow covering everything left of `front`. The wall is drawn
// by a pixel shader (billows rolling up its face, powder mist ahead of it) and spits
// snow-puff particles. It runs at a little under walking speed, but it is on a leash:
// if the hero gets far ahead it speeds up, so it always hovers at the left of the screen.
import * as THREE from 'three';
import { Ent } from './ent';
import type { Game } from './game';
import { approach, rand } from '../core/util';
import { TILE } from '../config';

const BASE_SPEED = 1.4; // walking is 1.65
const CATCH_UP = 2.6; // speed while further than LEASH behind the hero
export const LEASH = 175; // px
const CAUGHT_DMG = 10; // never lethal: it leaves at least 1 HP

const VERT = /* glsl */ `
varying vec3 wp;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  wp = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */ `
varying vec3 wp;
uniform float t;
uniform float front;
uniform float fade;
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 p = floor(vec2(wp.x, -wp.y)); // game pixels, y down
  // the face of the wall wobbles
  float edge = front + 9.0 * sin(p.y * 0.045 + t * 2.3) + 6.0 * sin(p.y * 0.11 - t * 3.7) + 3.0 * sin(p.y * 0.29 + t * 6.1);
  float d = edge - p.x; // > 0 inside the snow
  // round billows rolling up the face
  float cell = floor((p.y + t * 55.0) / 22.0);
  float bill = 1e3;
  for (int k = -1; k <= 1; k++) {
    float c = cell + float(k);
    vec2 ctr = vec2(edge - 4.0 + h1(c) * 14.0, c * 22.0 + 11.0 - t * 55.0);
    bill = min(bill, length(p - ctr) - (9.0 + h1(c + 7.0) * 9.0));
  }
  float inside = max(d, -bill); // > 0 inside, roughly the distance to the surface
  if (inside <= 0.0) {
    // dithered powder mist ahead of the wall
    float m = inside + 34.0;
    if (m <= 0.0 || h2(p + floor(t * 12.0)) > (m / 34.0) * 0.55) discard;
    gl_FragColor = vec4(0.85, 0.9, 1.0, 0.65 * fade);
    #include <colorspace_fragment>
    return;
  }
  float sw = sin(p.x * 0.09 + p.y * 0.05 - t * 4.0) + sin(p.x * 0.05 - p.y * 0.08 + t * 3.0) + h2(floor(p / 3.0)) * 0.6;
  vec3 c = vec3(0.9, 0.94, 1.0);
  if (sw > 0.9) c = vec3(0.62, 0.7, 0.88);
  if (sw > 1.6) c = vec3(0.4, 0.46, 0.66);
  if (inside < 2.0) c = vec3(1.0);
  if (inside > 110.0) c *= 0.8;
  // tumbling rocks and broken ice
  if (h2(floor((p + vec2(-t * 90.0, t * 30.0)) / 4.0)) > 0.985) c = vec3(0.16, 0.18, 0.26);
  gl_FragColor = vec4(c, fade);
  #include <colorspace_fragment>
}`;

export class Avalanche extends Ent {
  speed = 0.9;
  t = 0;
  /** False during the cinematic until it is revealed. */
  active: boolean;
  /** Cinematic mode: creep forward at a fixed speed, ignore the leash, never catch. */
  cine = false;
  caughtT = 0;
  slammed = false;
  fade = 1;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;

  /** stopAt: the x where an 'end' room's avalanche crashes into the doorway (null = keep chasing). */
  constructor(g: Game, public front: number, active: boolean, private stopAt: number | null = null) {
    super();
    this.active = active;
    const H = g.room.H + 200;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: { t: { value: 0 }, front: { value: front }, fade: { value: 1 } },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(640, H), this.mat);
    this.mesh.renderOrder = 16; // over the hero, under the particles
    this.mesh.frustumCulled = false;
    this.mesh.position.y = -(g.room.H / 2);
    g.view.sprites.add(this.mesh);
    this.place();
  }

  private place() {
    // the plane's right edge sits a little past the front so billows and mist fit
    this.mesh.position.x = this.front + 70 - 320;
    this.mat.uniforms.front.value = this.front;
    this.mat.uniforms.fade.value = this.fade;
  }

  update(g: Game) {
    this.t++;
    this.mat.uniforms.t.value = this.t / 60;
    const p = g.player;
    if (this.slammed) {
      // settle and fade away after crashing into the doorway
      this.fade = Math.max(0, this.fade - 1 / 40);
      if (this.fade <= 0) this.dead = true;
    } else if (this.caughtT > 0) {
      // swallow the screen, then restart the room
      this.front += 4;
      if (++this.caughtT === 45) g.restartRoom();
    } else if (this.active) {
      const gap = p.x - this.front;
      const target = this.cine ? 0.9 : gap > LEASH ? CATCH_UP : BASE_SPEED;
      this.speed = approach(this.speed, target, 0.04);
      this.front += this.speed;
      if (this.stopAt !== null && this.front >= this.stopAt) this.slam(g);
      else if (!this.cine && this.stopAt === null && p.alive && this.front > p.x - p.hw) this.catch(g);
    }
    // spray
    if (this.active && this.fade > 0.5 && this.t % 2 === 0) {
      const y = rand(g.view.camY - 20, g.view.camY + 240);
      g.fx.burst(this.front + rand(-10, 6), y, 'puff', 1, 0, { vx: this.speed + rand(0.4, 1.6), vy: rand(-1.4, -0.2), life: 34, fade: true, order: 17 });
    }
    if (this.active && this.t % 3 === 0) g.fx.burst(this.front + rand(-30, 0), rand(g.view.camY, g.view.camY + 224), 'flake', 1, 0, { vx: this.speed + rand(1, 3), vy: rand(-1, 1), life: 40, order: 17 });
    // rumble, louder when close
    if (this.active && !this.slammed && this.t % 40 === 0 && p.x - this.front < 300) g.audio.play('rumble');
    this.place();
  }

  private catch(g: Game) {
    const h = g.hunter, p = g.player;
    this.caughtT = 1;
    const dmg = Math.min(CAUGHT_DMG, h.hp - 1);
    if (dmg > 0) {
      h.hp -= dmg;
      g.damageNumber(p.x, p.y - 20, dmg, '#ff5060');
    }
    p.set('hurt');
    p.vx = 2;
    p.vy = -3;
    g.audio.play('avalanche');
    g.audio.play('hurt');
    g.shake(5, 40);
    g.flashWhite = 16;
    g.message('BURIED! THE MOUNTAIN TAKES ANOTHER TRY...', 120);
  }

  /** 'end' rooms: crash into the left doorway, bury it, and stop. */
  private slam(g: Game) {
    this.front = this.stopAt!;
    this.slammed = true;
    const p = g.player;
    // shove the hero clear of the doorway if she is standing in it
    if (p.x - p.hw < 2 * TILE) {
      p.x = 2 * TILE + p.hw;
      p.vx = 2.5;
      p.vy = -3;
    }
    for (let i = 0; i < 24; i++) g.fx.burst(rand(4, 40), rand(6 * TILE, 12 * TILE), 'puff', 1, 0, { vx: rand(0.5, 3), vy: rand(-2, 0.5), life: 40, fade: true });
    g.audio.play('avalanche');
    g.shake(6, 50);
    g.flashWhite = 12;
    const flag = g.room.def.sealFlag;
    if (flag) g.setFlag(flag);
  }

  destroy() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mat.dispose();
    super.destroy();
  }
}
