import * as THREE from 'three';
import { VW, VH } from '../config';
import { PixelCanvas, SheetBuilder } from './pixel';

export const FOV = 40;
export const CAM_DIST = VH / 2 / Math.tan((FOV * Math.PI) / 360);

export class View {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  hud: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stage: HTMLElement;
  camX = 0; // top-left of view in world pixels
  camY = 0;
  /**
   * How far the camera has pulled back: 1 = the z=0 plane maps 1:1 to screen pixels, 1.1 shows
   * 10% more of the world each way. Only nudged a little (the Wyrm's fight), since anything off
   * 1 scales the pixel art by an uneven amount.
   */
  zoom = 1;
  shakeX = 0;
  shakeY = 0;
  world = new THREE.Group(); // per-room content (backdrop + tiles)
  sprites = new THREE.Group();

  constructor() {
    this.stage = document.getElementById('stage')!;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(VW, VH, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.stage.appendChild(this.renderer.domElement);
    this.hud = document.createElement('canvas');
    this.hud.width = VW;
    this.hud.height = VH;
    this.stage.appendChild(this.hud);
    this.ctx = this.hud.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.camera = new THREE.PerspectiveCamera(FOV, VW / VH, 1, 4000);
    this.scene.add(this.world);
    this.scene.add(this.sprites);
    this.scene.background = new THREE.Color('#050308');
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const sw = window.innerWidth, sh = window.innerHeight;
    let scale = Math.min(sw / VW, sh / VH);
    if (scale >= 2) scale = Math.floor(scale * 2) / 2; // keep pixels mostly even
    this.stage.style.width = `${Math.floor(VW * scale)}px`;
    this.stage.style.height = `${Math.floor(VH * scale)}px`;
  }

  /** World pixels the view spans across and down (more than VW x VH when pulled back). */
  get viewW() {
    return VW * this.zoom;
  }
  get viewH() {
    return VH * this.zoom;
  }
  /** Screen position of a world point (for the HUD). */
  sx(x: number) {
    return (x - this.camX) / this.zoom;
  }
  sy(y: number) {
    return (y - this.camY) / this.zoom;
  }

  /** Position the camera so that the z=0 plane maps 1:1 to screen pixels (times the zoom). */
  applyCamera() {
    const z = this.zoom;
    const cx = (z === 1 ? Math.round(this.camX + this.shakeX) : this.camX + this.shakeX) + this.viewW / 2;
    const cy = (z === 1 ? Math.round(this.camY + this.shakeY) : this.camY + this.shakeY) + this.viewH / 2;
    this.camera.position.set(cx, -cy, CAM_DIST * z);
    this.camera.lookAt(cx, -cy, 0);
  }

  render() {
    this.applyCamera();
    // pulled back, everything is that much further away: push the fog back to match
    const fog = this.scene.fog as THREE.Fog | null, push = CAM_DIST * (this.zoom - 1);
    if (fog && 'near' in fog && push) {
      fog.near += push;
      fog.far += push;
    }
    this.renderer.render(this.scene, this.camera);
    if (fog && 'near' in fog && push) {
      fog.near -= push;
      fog.far -= push;
    }
  }

  clearWorld() {
    disposeTree(this.world);
    this.world.clear();
  }
}

export function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map && !m.map.userData?.shared) m.map.dispose();
        m.dispose();
      }
    }
  });
}

// ---------------------------------------------------------------- textures

export function makeTexture(src: HTMLCanvasElement | PixelCanvas, repeat = false) {
  const cv = src instanceof PixelCanvas ? src.toCanvas() : src;
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

export interface Sheet {
  tex: THREE.Texture;
  cw: number;
  ch: number;
  cols: number;
  rows: number;
  ax: number;
  ay: number;
  anims: Record<string, number[]>;
  meta: Record<number, any>;
  W: number;
  H: number;
}

export function buildSheet(b: SheetBuilder): Sheet {
  const cols = Math.min(16, b.frames.length);
  const rows = Math.ceil(b.frames.length / cols);
  const W = cols * b.cw, H = rows * b.ch;
  const big = new PixelCanvas(W, H);
  b.frames.forEach((f, i) => big.blit(f, (i % cols) * b.cw, Math.floor(i / cols) * b.ch));
  const tex = makeTexture(big);
  tex.userData.shared = true;
  return { tex, cw: b.cw, ch: b.ch, cols, rows, ax: b.ax, ay: b.ay, anims: b.anims, meta: b.meta, W, H };
}

const toHex = (r: number, g: number, b: number) => '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);

/** Every opaque color in a sheet as '#rrggbb', most-used first (the palette the enemy editor shows). */
export function sheetColors(s: Sheet): { hex: string; count: number }[] {
  const cv = s.tex.image as HTMLCanvasElement;
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  const counts = new Map<string, number>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const h = toHex(d[i], d[i + 1], d[i + 2]);
    counts.set(h, (counts.get(h) || 0) + 1);
  }
  return [...counts].map(([hex, count]) => ({ hex, count })).sort((a, b) => b.count - a.count);
}

/** A copy of a sheet with some colors swapped (map keys and values are '#rrggbb'). */
export function recolorSheet(s: Sheet, map: Record<string, string>): Sheet {
  const src = s.tex.image as HTMLCanvasElement;
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
  const rgb = new Map<string, [number, number, number]>();
  for (const [from, to] of Object.entries(map)) {
    const n = parseInt(to.slice(1), 16);
    if (from.toLowerCase() !== to.toLowerCase() && !isNaN(n)) rgb.set(from.toLowerCase(), [n >> 16, (n >> 8) & 255, n & 255]);
  }
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const c = rgb.get(toHex(d[i], d[i + 1], d[i + 2]));
    if (c) [d[i], d[i + 1], d[i + 2]] = c;
  }
  ctx.putImageData(img, 0, 0);
  const tex = makeTexture(cv);
  tex.userData.shared = true;
  return { ...s, tex };
}

// ---------------------------------------------------------------- sprites

const spriteGeo = new THREE.PlaneGeometry(1, 1);

const VERT = /* glsl */ `
varying vec2 vUv;
uniform float flipX;
void main() {
  vUv = vec2(flipX > 0.5 ? 1.0 - uv.x : uv.x, uv.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D map;
uniform vec4 uvRect;
uniform float flash;
uniform vec3 flashColor;
uniform vec3 tint;
uniform float opacity;
uniform float glow;
void main() {
  vec4 c = texture2D(map, uvRect.xy + vUv * uvRect.zw);
  if (c.a < 0.5) discard;
  vec3 col = mix(c.rgb * tint, flashColor, flash) + glow * c.rgb;
  gl_FragColor = vec4(col, opacity);
  #include <colorspace_fragment>
}`;

export class Sprite {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  frame = -1;
  flip = false;
  constructor(public sheet: Sheet, parent: THREE.Object3D, order = 10) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        map: { value: sheet.tex },
        uvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        flipX: { value: 0 },
        flash: { value: 0 },
        flashColor: { value: new THREE.Color(1, 1, 1) },
        tint: { value: new THREE.Color(1, 1, 1) },
        opacity: { value: 1 },
        glow: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(spriteGeo, this.mat);
    this.mesh.scale.set(sheet.cw, sheet.ch, 1);
    this.mesh.renderOrder = order;
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
    this.setFrame(0);
  }
  setSheet(s: Sheet) {
    this.sheet = s;
    this.mat.uniforms.map.value = s.tex;
    this.mesh.scale.set(s.cw, s.ch, 1);
    this.frame = -1;
    this.setFrame(0);
  }
  setFrame(i: number) {
    if (i === this.frame) return;
    this.frame = i;
    const s = this.sheet;
    const c = i % s.cols, r = Math.floor(i / s.cols);
    this.mat.uniforms.uvRect.value.set((c * s.cw) / s.W, 1 - ((r + 1) * s.ch) / s.H, s.cw / s.W, s.ch / s.H);
  }
  anim(name: string, t: number, fps = 8, loop = true) {
    const a = this.sheet.anims[name];
    if (!a) return;
    let k = Math.floor(t * fps);
    k = loop ? k % a.length : Math.min(k, a.length - 1);
    this.setFrame(a[k]);
  }
  /** Place so that the sheet anchor lands on world point (x,y). */
  place(x: number, y: number, flip = false) {
    const s = this.sheet;
    this.flip = flip;
    this.mat.uniforms.flipX.value = flip ? 1 : 0;
    const ox = flip ? s.cw - s.ax : s.ax;
    const left = Math.round(x - ox);
    const top = Math.round(y - s.ay);
    this.mesh.position.set(left + s.cw / 2, -(top + s.ch / 2), 0);
  }
  set visible(v: boolean) {
    this.mesh.visible = v;
  }
  get visible() {
    return this.mesh.visible;
  }
  set flash(v: number) {
    this.mat.uniforms.flash.value = v;
  }
  set opacity(v: number) {
    this.mat.uniforms.opacity.value = v;
  }
  set glow(v: number) {
    this.mat.uniforms.glow.value = v;
  }
  tint(r: number, g: number, b: number) {
    this.mat.uniforms.tint.value.setRGB(r, g, b);
  }
  flashColor(r: number, g: number, b: number) {
    this.mat.uniforms.flashColor.value.setRGB(r, g, b);
  }
  dispose() {
    this.mesh.removeFromParent();
    this.mat.dispose();
  }
}
