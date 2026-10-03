// 3D backdrops built from procedural geometry, lights and shaders.
import * as THREE from 'three';
import { VW, VH, TILE } from '../config';
import { CAM_DIST, makeTexture, Sprite, Sheet } from './view';
import { PixelCanvas, hex, shade, mix, RGBA } from './pixel';
import { hash2, rng } from '../core/util';
import type { Room } from '../world/room';

export interface Backdrop {
  group: THREE.Group;
  update(t: number, camX: number, camY: number): void;
  fog: THREE.Fog | null;
  bg: THREE.Color;
  /** Move the backdrop's water surface (flooded rooms only) while the room drains. */
  setWaterLevel?(y: number): void;
}

/** World-space rectangle that a plane at depth d must cover for every camera position in the room. */
function extent(room: Room, d: number) {
  const s = (CAM_DIST + d) / CAM_DIST;
  const ex = (VW / 2) * (s - 1) + 8, ey = (VH / 2) * (s - 1) + 8;
  return { x0: -ex, x1: room.W + ex, y0: -ey, y1: room.H + ey };
}

function plane(w: number, h: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

/** Place a plane covering the room at depth d. */
function wallPlane(room: Room, d: number, mat: THREE.Material, uvScale = 0): THREE.Mesh {
  const e = extent(room, d);
  const w = e.x1 - e.x0, h = e.y1 - e.y0;
  const m = plane(w, h, mat);
  m.position.set((e.x0 + e.x1) / 2, -(e.y0 + e.y1) / 2, -d);
  const u = (mat as THREE.ShaderMaterial).uniforms;
  if (u?.size) u.size.value.set(w, h); // the sky shader works in world units
  if (uvScale && (mat as any).map) {
    const uv = m.geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / uvScale), uv.getY(i) * (h / uvScale));
  }
  return m;
}

// ---------------------------------------------------------------- textures

function stoneTex(base: RGBA, mortar: RGBA, rough: boolean, seed: number, skulls = false) {
  const p = new PixelCanvas(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const bh = rough ? 10 : 12;
      const row = Math.floor(y / bh);
      const bw = rough ? 20 + (row % 2) * 4 : 24;
      const off = row % 2 ? 12 : 0;
      const bx = Math.floor((x + off) / bw);
      const lx = (x + off) % bw, ly = y % bh;
      let c = shade(base, 0.85 + hash2(bx, row, seed) * 0.3);
      if (ly === 0 || lx === 0) c = mortar;
      else if (ly === 1) c = shade(c, 1.15);
      const n = hash2(x, y, seed + 1);
      if (n < 0.08) c = shade(c, 0.85);
      if (skulls && hash2(bx, row, seed + 3) < 0.12 && ly > 2 && ly < bh - 2 && lx > 4 && lx < bw - 4) {
        const sx = lx - bw / 2, sy = ly - bh / 2;
        if (sx * sx * 0.6 + sy * sy < 8) c = hex('#a89c80');
        if ((sx === -1 || sx === 1) && sy === 0) c = hex('#1a1210');
      }
      p.set(x, y, c);
    }
  // ensure seamless rows (height 64 divisible by 12? not exactly → patch by wrapping noise only)
  const t = makeTexture(p, true);
  return t;
}

function checkerTex(a: RGBA, b: RGBA) {
  const p = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      let c = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? a : b;
      if (x % 16 === 0 || y % 16 === 0) c = shade(c, 0.7);
      if (hash2(x, y, 4) < 0.05) c = shade(c, 1.2);
      p.set(x, y, c);
    }
  return makeTexture(p, true);
}

function windowTex(glass: RGBA[], frame: RGBA) {
  const p = new PixelCanvas(32, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 32; x++) {
      const cx = x - 15.5, top = y < 16;
      const inside = top ? cx * cx + (y - 16) * (y - 16) < 15 * 15 : Math.abs(cx) < 15;
      if (!inside) continue;
      let c = glass[Math.floor(hash2(Math.floor(x / 5), Math.floor(y / 7), 2) * glass.length)];
      if (x % 8 === 0 || y % 12 === 0 || Math.abs(cx) < 1) c = frame;
      p.set(x, y, c);
    }
  // rose in the arch
  p.circle(16, 12, 5, glass[0]);
  p.circle(16, 12, 2, frame);
  return makeTexture(p);
}

/** A wall of bookshelves: oak boards every 16 px under rows of leaning spines. Tiles every 64 px. */
function shelfTex(seed: number) {
  const p = new PixelCanvas(64, 64);
  const cols = ['#6a2030', '#2a4a3a', '#34346a', '#7a5028', '#52285a', '#62623a', '#285a68', '#7a3226', '#8a7a58'].map((c) => hex(c));
  const oak = hex('#3a2414'), oakL = hex('#6a4426');
  for (let row = 0; row < 4; row++) {
    const y0 = row * 16;
    p.rect(0, y0, 64, 16, hex('#140b0a')); // the dark back of the case
    let x = 0, k = 0;
    while (x < 64) {
      const w = 3 + Math.floor(hash2(row, k, seed) * 3);
      const h = 7 + Math.floor(hash2(row, k, seed + 1) * 5);
      const col = cols[Math.floor(hash2(row, k, seed + 2) * cols.length)];
      if (hash2(row, k, seed + 3) > 0.08)
        for (let i = 0; i < w && x + i < 64; i++) {
          const c = i === 0 ? shade(col, 1.3) : i === w - 1 ? shade(col, 0.65) : col;
          for (let y = 0; y < h; y++) p.set(x + i, y0 + 12 - y, c);
          if (h > 9 && i === 1) p.set(x + i, y0 + 9, hex('#c8a040')); // a gilt band
        }
      x += w;
      k++;
    }
    p.rect(0, y0 + 13, 64, 1, oakL);
    p.rect(0, y0 + 14, 64, 2, oak);
  }
  return makeTexture(p, true);
}

function bannerTex() {
  const p = new PixelCanvas(16, 48);
  p.rect(0, 0, 16, 40, hex('#6a1020'));
  p.poly([[0, 40], [16, 40], [16, 47], [8, 42], [0, 47]], hex('#6a1020'));
  p.rect(0, 0, 16, 2, hex('#c8a040'));
  p.rect(1, 2, 1, 38, hex('#8a2030'));
  // emblem: crescent and blade
  p.circle(8, 18, 4, hex('#c8a040'));
  p.circle(9.5, 17, 3.5, hex('#6a1020'));
  p.line(8, 22, 8, 32, hex('#c8a040'));
  p.line(6, 25, 10, 25, hex('#c8a040'));
  return makeTexture(p);
}

function ridgeTex(col: RGBA, seed: number, rough: number, w = 256, h = 64) {
  const p = new PixelCanvas(w, h);
  const r = rng(seed);
  let y = h * 0.4;
  const pts: number[] = [];
  for (let x = 0; x < w; x++) {
    y += (r() - 0.5) * rough;
    if (x % 32 === 0) y += (r() - 0.5) * rough * 4;
    y = Math.max(4, Math.min(h - 8, y));
    pts.push(y);
  }
  for (let x = 0; x < w; x++) for (let yy = Math.floor(pts[x]); yy < h; yy++) p.set(x, yy, yy - pts[x] < 2 ? shade(col, 1.4) : col);
  const t = makeTexture(p, true);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function treeTex(seed: number) {
  const p = new PixelCanvas(64, 96);
  const r = rng(seed);
  const col = hex('#0e0a16');
  const branch = (x: number, y: number, a: number, len: number, w: number) => {
    if (len < 3) return;
    const x2 = x + Math.cos(a) * len, y2 = y - Math.sin(a) * len;
    p.line(x, y, x2, y2, col, w);
    branch(x2, y2, a + 0.3 + r() * 0.4, len * 0.68, Math.max(1, w * 0.7));
    branch(x2, y2, a - 0.3 - r() * 0.4, len * 0.66, Math.max(1, w * 0.7));
  };
  branch(32, 96, Math.PI / 2 + (r() - 0.5) * 0.2, 30, 5);
  return makeTexture(p);
}

/** Jagged mountain range with snow caps on the peaks and streaks down the gullies. */
function peakTex(col: RGBA, cap: RGBA, seed: number, w = 512, h = 160) {
  const p = new PixelCanvas(w, h);
  const r = rng(seed);
  const peaks: { x: number; y: number; s: number }[] = [];
  for (let x = -40; x < w + 40; x += 50 + r() * 70) peaks.push({ x, y: 20 + r() * 70, s: 0.7 + r() * 0.8 });
  const top: number[] = [];
  for (let x = 0; x < w; x++) {
    let y = h;
    // each peak is a tent shape; the skyline is the highest of them, roughened a little
    for (const k of peaks) y = Math.min(y, k.y + Math.abs(x - k.x) * k.s);
    for (const k of peaks) y = Math.min(y, k.y + Math.abs(x - k.x + w) * k.s, k.y + Math.abs(x - k.x - w) * k.s); // wrap
    top.push(y + (hash2(x >> 1, seed) - 0.5) * 3);
  }
  for (let x = 0; x < w; x++)
    for (let y = Math.floor(top[x]); y < h; y++) {
      const depth = y - top[x];
      const capDepth = 10 + hash2(x >> 3, seed, 2) * 16 - (y > 90 ? 40 : 0);
      let c = depth < capDepth ? cap : col;
      // snow streaks running down the slopes
      if (depth >= capDepth && hash2(x >> 2, Math.floor(y / 9), seed + 3) < 0.12 && depth < capDepth + 30) c = mix(col, cap, 0.6);
      if (depth < 2) c = shade(cap, 1.08);
      p.set(x, y, c);
    }
  const t = makeTexture(p, true);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Snow-dusted conifer silhouette. */
function pineTex(seed: number, col: RGBA, snow: RGBA) {
  const p = new PixelCanvas(48, 96);
  const r = rng(seed);
  p.rect(23, 76, 3, 20, shade(col, 0.8));
  for (let i = 0; i < 7; i++) {
    const y = 8 + i * 10, half = 4 + i * 3 + r() * 3;
    p.poly([[24, y - 6], [24 + half, y + 9], [24 - half, y + 9]], col);
    for (let x = -half + 2; x < half - 2; x++) if (hash2(x, i, seed) < 0.55) p.set(24 + x, y + 9 - Math.abs(x) * 0.4, snow);
  }
  p.set(24, 2, snow);
  return makeTexture(p);
}

function cloudTex(seed: number) {
  const p = new PixelCanvas(128, 32);
  const r = rng(seed);
  for (let i = 0; i < 14; i++) {
    const x = 16 + r() * 96, y = 16 + (r() - 0.5) * 8, rad = 5 + r() * 9;
    p.ellipse(x, y, rad * 1.6, rad * 0.6, [40, 30, 64, 150]);
  }
  for (let i = 0; i < 8; i++) {
    const x = 24 + r() * 80, y = 13 + (r() - 0.5) * 4, rad = 3 + r() * 6;
    p.ellipse(x, y, rad * 1.6, rad * 0.5, [80, 64, 110, 140]);
  }
  return makeTexture(p);
}

// ---------------------------------------------------------------- shaders

/**
 * Night sky with stars and an optional moon. `size` is the plane's size in world units.
 * Stars and the moon are measured in world units (not UVs), so they stay round whatever
 * the room's shape: the old UV maths stretched the moon into an egg in wide rooms.
 */
function skyMaterial(top: string, horizon: string, moon: boolean) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      t: { value: 0 }, top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, moon: { value: moon ? 1 : 0 },
      size: { value: new THREE.Vector2(1000, 1000) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec2 vUv; uniform float t; uniform vec3 top; uniform vec3 hor; uniform float moon; uniform vec2 size;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 w = vUv * size; // world units across the plane
        vec2 px = floor(w / 5.0);
        vec3 c = mix(hor, top, pow(vUv.y, 0.8));
        float s = h(px);
        if (s > 0.996) c += vec3(0.7,0.7,0.9) * (0.5 + 0.5*sin(t*2.0 + s*100.0));
        if (moon > 0.5) {
          vec2 d = w - size * vec2(0.78, 0.74); // offset from the moon's center
          float r = length(d);
          float R = 104.0; // moon radius
          c += vec3(0.22,0.2,0.3) * smoothstep(R * 3.0, 0.0, r) * 0.5;
          if (r < R) {
            vec3 mc = vec3(0.93,0.9,0.78);
            float cr = h(floor(d / 12.0));
            if (cr > 0.8) mc *= 0.85;
            if (d.x + d.y*0.3 > R * 0.4) mc *= 0.92;
            c = mc;
          }
        }
        c = floor(c * 24.0) / 24.0;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

function waterSurfaceMaterial(col: string, glint: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Color(col) }, glint: { value: new THREE.Color(glint) } },
    vertexShader: `varying vec2 vUv; varying vec3 wp; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w;} `,
    fragmentShader: `
      varying vec2 vUv; varying vec3 wp; uniform float t; uniform vec3 col; uniform vec3 glint;
      void main(){
        vec2 p = floor(wp.xz / 2.0) * 2.0;
        float w = sin(p.x*0.05 + t*1.5 + sin(p.y*0.2)) * sin(p.y*0.31 - t*1.1);
        vec3 c = col * (0.8 + 0.2*w);
        if (w > 0.82) c = glint;
        gl_FragColor = vec4(c, 0.92);
        #include <colorspace_fragment>
      }`,
  });
}

function glowMaterial(color: string, strength = 1) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Color(color) }, k: { value: strength } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec2 vUv; uniform float t; uniform vec3 col; uniform float k;
      void main(){
        vec2 q = floor(vUv*48.0)/48.0 - 0.5;
        float r = length(q)*2.0;
        float a = smoothstep(1.0, 0.0, r) * (0.85 + 0.15*sin(t*3.0)) * k;
        a = floor(a*6.0)/6.0;
        gl_FragColor = vec4(col*a, 1.0);
      }`,
  });
}

function sigilMaterial(color: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec2 vUv; uniform float t; uniform vec3 col;
      void main(){
        vec2 q = (floor(vUv*96.0)/96.0 - 0.5)*2.0;
        float r = length(q); float a = atan(q.y, q.x);
        float ring = step(abs(r-0.9),0.03) + step(abs(r-0.7),0.02);
        float star = step(abs(sin(a*2.5 + t*0.3)*0.7 - r*0.0 - (r-0.0)*0.0) , 0.0);
        float spokes = step(0.97, abs(cos(a*5.0 + t*0.4))) * step(r, 0.7);
        float runes = step(0.6, fract(sin(floor(a*12.0+t*0.5)*12.9898)*43758.5)) * step(abs(r-0.8),0.05);
        float v = clamp(ring + spokes + runes + star, 0.0, 1.0) * (0.6 + 0.4*sin(t*2.0));
        gl_FragColor = vec4(col*v, 1.0);
      }`,
  });
}

// ---------------------------------------------------------------- particles

function motes(room: Room, n: number, color: string, depth: [number, number], size = 2) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = Math.random() * room.W;
    pos[i * 3 + 1] = -Math.random() * room.H;
    pos[i * 3 + 2] = -(depth[0] + Math.random() * (depth[1] - depth[0]));
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Color(color) }, H: { value: room.H }, W: { value: room.W }, sz: { value: size } },
    vertexShader: `
      attribute float seed; uniform float t; uniform float H; uniform float W; uniform float sz; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + t*(6.0+seed*10.0) + H, H) - H;
        p.x += sin(t*0.7 + seed*30.0)*10.0;
        vA = 0.5 + 0.5*sin(t*2.0 + seed*40.0);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);
        gl_PointSize = sz;
      }`,
    fragmentShader: `uniform vec3 col; varying float vA; void main(){ gl_FragColor = vec4(col*vA, 1.0); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 2;
  return pts;
}

/** Falling snow: points that drift down and sideways (wind > 0 blows right). */
function snowfall(room: Room, n: number, depth: [number, number], size: number, wind: number, speed = 1) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = Math.random() * (room.W + 400) - 200;
    pos[i * 3 + 1] = -Math.random() * (room.H + 100);
    pos[i * 3 + 2] = -(depth[0] + Math.random() * (depth[1] - depth[0]));
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: { t: { value: 0 }, H: { value: room.H + 100 }, W: { value: room.W + 400 }, sz: { value: size }, wind: { value: wind }, spd: { value: speed } },
    vertexShader: `
      attribute float seed; uniform float t; uniform float H; uniform float W; uniform float sz; uniform float wind; uniform float spd; varying float vA;
      void main(){
        vec3 p = position;
        p.y = -mod(-p.y + t*(14.0+seed*18.0)*spd, H);
        p.x = mod(p.x + 200.0 + t*wind*(20.0+seed*20.0) + sin(t*0.9 + seed*40.0)*12.0, W) - 200.0;
        vA = 0.55 + 0.45*seed;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);
        gl_PointSize = sz;
      }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.92,0.95,1.0), vA); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 2;
  return pts;
}

/** The silhouette of Vael Keep on a far hill, with lit windows. */
function distantCastle(): THREE.Group {
  const lambert = (o: THREE.MeshLambertMaterialParameters) => new THREE.MeshLambertMaterial(o);
  const dark = lambert({ color: '#18142a' });
  const castle = new THREE.Group();
  const towers: [number, number, number][] = [[-120, 220, 36], [-60, 300, 44], [0, 380, 56], [70, 260, 40], [130, 200, 30], [-180, 160, 28]];
  for (const [ox, h, w] of towers) {
    const tw = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), dark);
    tw.position.set(ox, h / 2, 0);
    castle.add(tw);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, w * 1.4, 4), lambert({ color: '#221a34' }));
    roof.position.set(ox, h + w * 0.7, 0);
    roof.rotation.y = Math.PI / 4;
    castle.add(roof);
    for (let k = 0; k < 3; k++) {
      if (hash2(ox, k) < 0.4) continue;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 7), new THREE.MeshBasicMaterial({ color: '#ffc060', fog: false }));
      win.position.set(ox + (hash2(k, ox) - 0.5) * w * 0.5, h * (0.4 + k * 0.17), w / 2 + 0.5);
      castle.add(win);
    }
  }
  const wallM = new THREE.Mesh(new THREE.BoxGeometry(380, 120, 20), dark);
  wallM.position.set(-20, 60, 10);
  castle.add(wallM);
  return castle;
}

// ---------------------------------------------------------------- builder

/**
 * Where distant mountain ranges are centered. Outdoor rooms with a sky cell above are
 * mostly seen from their bottom screen, so center on that; tall shafts use the middle.
 */
function horizonMid(room: Room) {
  return room.def.h <= 2 ? room.H - VH / 2 : room.H / 2;
}

export function buildBackdrop(room: Room, candleSheet: Sheet): Backdrop {
  const g = new THREE.Group();
  const theme = room.def.theme;
  const anim: ((t: number, cx: number, cy: number) => void)[] = [];
  const lights: { l: THREE.PointLight; base: number; seed: number }[] = [];
  const floorY = room.H - 2 * TILE;
  let fog: THREE.Fog | null = null;
  let bg = new THREE.Color('#050308');
  let waterSurface: THREE.Mesh | null = null;

  const lambert = (o: THREE.MeshLambertMaterialParameters) => new THREE.MeshLambertMaterial(o);
  const addTorch = (x: number, y: number, d: number, color = '#ff9a40', inten = 2.2, dist = 230, sprite = true) => {
    const l = new THREE.PointLight(color, inten, dist, 0);
    l.position.set(x, -y, -d + 14);
    g.add(l);
    lights.push({ l, base: inten, seed: Math.random() * 100 });
    if (sprite) {
      const s = new Sprite(candleSheet, g, 1);
      s.place(x, y);
      s.mesh.position.z = -d + 2;
      anim.push((t) => s.anim('torch', t + l.userData.seed || 0, 8));
      const glow = plane(64, 64, glowMaterial(color, 0.5));
      glow.position.set(x, -y + 6, -d + 3);
      glow.renderOrder = 1;
      g.add(glow);
      anim.push((t) => ((glow.material as THREE.ShaderMaterial).uniforms.t.value = t + x));
    }
  };
  const floorPlane = (tex: THREE.Texture, depth: number, y = floorY, scale = 32) => {
    const e = extent(room, depth);
    const w = e.x1 - e.x0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, depth), lambert({ map: tex }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((e.x0 + e.x1) / 2, -y, -depth / 2);
    const uv = m.geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / scale), uv.getY(i) * (depth / scale));
    g.add(m);
    return m;
  };
  const ceilingPlane = (tex: THREE.Texture, depth: number, y = TILE, scale = 32) => {
    const e = extent(room, depth);
    const w = e.x1 - e.x0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, depth), lambert({ map: tex }));
    m.rotation.x = Math.PI / 2;
    m.position.set((e.x0 + e.x1) / 2, -y, -depth / 2);
    const uv = m.geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / scale), uv.getY(i) * (depth / scale));
    g.add(m);
  };
  const pillar = (x: number, d: number, top: number, bottom: number, mat: THREE.Material, w = 26) => {
    const h = bottom - top;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    m.position.set(x, -(top + h / 2), -d);
    g.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 8, 8, w + 8), mat);
    cap.position.set(x, -(bottom - 4), -d);
    g.add(cap);
    const cap2 = cap.clone();
    cap2.position.y = -(top + 4);
    g.add(cap2);
  };
  const arch = (x: number, d: number, span: number, y: number, mat: THREE.Material, thick = 10) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(span / 2, thick / 2, 4, 16, Math.PI), mat);
    m.position.set(x, -y, -d);
    g.add(m);
  };
  const chain = (x: number, d: number, y0: number, y1: number) => {
    const mat = lambert({ color: '#4a4a58' });
    for (let y = y0; y < y1; y += 6) {
      const l = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.8, 3, 6), mat);
      l.position.set(x, -y, -d);
      l.rotation.y = (y / 6) % 2 ? Math.PI / 2 : 0;
      g.add(l);
    }
  };

  switch (theme) {
    case 'outdoor':
    case 'courtyard': {
      bg = new THREE.Color('#0b0820');
      fog = new THREE.Fog('#1a1230', CAM_DIST + (300), CAM_DIST + (1400));
      const sky = wallPlane(room, 1600, skyMaterial('#0a0720', '#3c2040', true));
      (sky.material as THREE.ShaderMaterial).fog = false;
      g.add(sky);
      anim.push((t) => ((sky.material as THREE.ShaderMaterial).uniforms.t.value = t));
      // mountain ridges
      for (const [d, col, seed, yoff] of [[1000, '#1c1430', 3, 60], [650, '#140e22', 7, 90]] as [number, string, number, number][]) {
        const e = extent(room, d);
        const tex = ridgeTex(hex(col), seed, 3);
        const w = e.x1 - e.x0;
        tex.repeat.set(w / 512, 1);
        const m = plane(w, 220, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true }));
        m.position.set((e.x0 + e.x1) / 2, -(floorY - 110 + yoff), -d);
        g.add(m);
      }
      // clouds
      for (let i = 0; i < 6; i++) {
        const d = 380 + i * 60;
        const m = plane(256, 64, new THREE.MeshBasicMaterial({ map: cloudTex(i + 2), transparent: true, opacity: 0.8, depthWrite: false }));
        const baseX = (i / 6) * (room.W + 600) - 300;
        m.position.set(baseX, -(floorY - 172 + (i % 3) * 30), -d); // just above the bottom screen's horizon
        g.add(m);
        anim.push((t) => (m.position.x = ((baseX + t * (4 + i)) % (room.W + 800)) - 300));
      }
      // distant castle on the right
      if (theme === 'outdoor') {
        const castle = distantCastle();
        castle.position.set(room.W * 0.82, -(floorY + 40), -480);
        g.add(castle);
      }
      // moonlight
      const moon = new THREE.DirectionalLight('#8a90d0', 1.2);
      moon.position.set(1, 1, 1);
      g.add(moon);
      g.add(new THREE.AmbientLight('#4a3a6a', 1.2));
      if (theme === 'outdoor') {
        // moat below the bridge
        const water = new THREE.Mesh(new THREE.PlaneGeometry(room.W + 1200, 600), waterSurfaceMaterial('#141a3a', '#8a90d0'));
        water.rotation.x = -Math.PI / 2;
        water.position.set(room.W / 2, -(floorY + 60), -300);
        g.add(water);
        anim.push((t) => ((water.material as THREE.ShaderMaterial).uniforms.t.value = t));
        // cliff faces under the ground ends
        const cliffMat = lambert({ map: stoneTex(hex('#3a3450'), hex('#1a1628'), true, 4) });
        for (const [x0, x1] of [[-200, 18 * TILE], [50 * TILE, room.W + 200]]) {
          const c = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 200, 120), cliffMat);
          c.position.set((x0 + x1) / 2, -(floorY + 100), -60);
          g.add(c);
        }
        // dead trees
        for (let i = 0; i < 5; i++) {
          const m = plane(64, 96, new THREE.MeshBasicMaterial({ map: treeTex(i + 9), transparent: true, alphaTest: 0.5 }));
          m.position.set(-40 + i * 70 + (i > 2 ? room.W * 0.35 : 0), -(floorY - 48 + 30), -140 - i * 30);
          g.add(m);
        }
        // drawbridge chains
        chain(18 * TILE + 4, 6, floorY - 150, floorY);
        chain(50 * TILE - 4, 6, 0, floorY);
        // castle gate face (3D extrusion behind the facade tiles)
        const gateWall = new THREE.Mesh(new THREE.BoxGeometry(260, 420, 60), lambert({ map: stoneTex(hex('#4a4e68'), hex('#22243a'), false, 5) }));
        gateWall.position.set(room.W - 40, -(floorY - 200), -40);
        g.add(gateWall);
        addTorch(60 * TILE, floorY - 4 * TILE, 30, '#ff9a40', 2, 200);
        g.add(motes(room, 40, '#8a7ab0', [20, 200]));
      } else {
        // courtyard: inner walls with crenellations and windows
        const wallTex = stoneTex(hex('#4a4454'), hex('#1e1a28'), false, 8);
        const w = wallPlane(room, 140, lambert({ map: wallTex }), 64);
        // crop: inner wall only up to y=48
        const e = extent(room, 140);
        const h = e.y1 - 40;
        w.geometry.dispose();
        w.geometry = new THREE.PlaneGeometry(e.x1 - e.x0, h);
        const uv = w.geometry.attributes.uv as THREE.BufferAttribute;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((e.x1 - e.x0) / 64), uv.getY(i) * (h / 64));
        w.position.set((e.x0 + e.x1) / 2, -(40 + h / 2), -140);
        g.add(w);
        for (let x = e.x0; x < e.x1; x += 32) {
          const cr = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 16), lambert({ map: wallTex }));
          cr.position.set(x, -32, -140);
          g.add(cr);
        }
        const winTex = windowTex([hex('#3a2a10'), hex('#ffb040'), hex('#c07020')], hex('#1a1010'));
        for (let x = 80; x < room.W; x += 220) {
          const win = plane(32, 64, new THREE.MeshBasicMaterial({ map: winTex, transparent: true, alphaTest: 0.5 }));
          win.position.set(x, -(floorY - 120), -139);
          g.add(win);
        }
        floorPlane(checkerTex(hex('#3a3a48'), hex('#2e2e3a')), 140);
        for (let x = 64; x < room.W; x += 256) {
          pillar(x, 70, 60, floorY, lambert({ map: stoneTex(hex('#4a4e68'), hex('#22243a'), false, 9) }), 20);
          addTorch(x, 120, 58, '#ff9a40', 2.2, 220);
        }
        // statue
        const st = new THREE.Group();
        const stoneM = lambert({ color: '#6a6e80' });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(8, 12, 40, 6), stoneM);
        body.position.y = 20;
        st.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(7, 6, 5), stoneM);
        head.position.y = 48;
        st.add(head);
        const wings = new THREE.Mesh(new THREE.BoxGeometry(56, 24, 3), stoneM);
        wings.position.set(0, 36, -6);
        wings.rotation.z = 0.15;
        st.add(wings);
        st.position.set(room.W / 2, -floorY, -50);
        g.add(st);
        g.add(motes(room, 30, '#8a7ab0', [20, 160]));
      }
      break;
    }
    case 'graveyard': {
      // the Lichyard: the burial ravine under the castle bridge. Night sky, bare trees, rows of
      // leaning headstones and a low green mist
      bg = new THREE.Color('#080a14');
      fog = new THREE.Fog('#141c22', CAM_DIST + 200, CAM_DIST + 1100);
      const sky = wallPlane(room, 1600, skyMaterial('#080a1c', '#263a3a', true));
      (sky.material as THREE.ShaderMaterial).fog = false;
      g.add(sky);
      anim.push((t) => ((sky.material as THREE.ShaderMaterial).uniforms.t.value = t));
      for (const [d, col, seed, yoff] of [[900, '#141c24', 13, 40], [560, '#0e1418', 17, 80]] as [number, string, number, number][]) {
        const e = extent(room, d);
        const tex = ridgeTex(hex(col), seed, 3);
        const w = e.x1 - e.x0;
        tex.repeat.set(w / 512, 1);
        const m = plane(w, 220, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true }));
        m.position.set((e.x0 + e.x1) / 2, -(floorY - 110 + yoff), -d);
        g.add(m);
      }
      for (let i = 0; i < room.W / 90; i++) {
        const m = plane(64, 96, new THREE.MeshBasicMaterial({ map: treeTex(i + 31), transparent: true, alphaTest: 0.5 }));
        m.position.set(i * 90 + hash2(i, 41) * 50, -(floorY - 46), -(110 + hash2(i, 42) * 120));
        g.add(m);
      }
      const graveM = lambert({ map: stoneTex(hex('#5a625c'), hex('#262c28'), true, 33) });
      for (let i = 0; i < room.W / 28; i++) {
        const h = 14 + hash2(i, 43) * 16, d = 14 + hash2(i, 44) * 80;
        const cross = hash2(i, 45) < 0.3;
        const st = new THREE.Mesh(new THREE.BoxGeometry(cross ? 4 : 12, h, 4), graveM);
        st.position.set(i * 28 + hash2(i, 46) * 18, -(floorY - h / 2), -d);
        st.rotation.z = (hash2(i, 47) - 0.5) * 0.3;
        g.add(st);
        if (cross) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 4), graveM);
          bar.position.set(st.position.x, -(floorY - h + 5), -d);
          bar.rotation.z = st.rotation.z;
          g.add(bar);
        }
      }
      floorPlane(stoneTex(hex('#2a3024'), hex('#141810'), true, 34), 140);
      const moon = new THREE.DirectionalLight('#8aa0b0', 1.1);
      moon.position.set(-1, 1, 1);
      g.add(moon);
      g.add(new THREE.AmbientLight('#3a4a4a', 1.2));
      g.add(motes(room, 50, '#8ae0a0', [10, 160]));
      break;
    }
    case 'deeps':
    case 'temple':
    case 'gaol':
    case 'forge':
    case 'crystal': {
      // the under-castle settings share one cavern, dressed differently
      const C = {
        deeps: { fog: '#06181c', far: 340, wall: '#22383c', mortar: '#0a1416', floor: '#1e3034', amb: '#2a5a5a', torch: '#60e0c0', mote: '#70e0d0' },
        temple: { fog: '#12140a', far: 420, wall: '#5a5430', mortar: '#201c0c', floor: '#3e3a22', amb: '#5a5a30', torch: '#ffc050', mote: '#c0e070' },
        gaol: { fog: '#0c0808', far: 320, wall: '#3a3434', mortar: '#141010', floor: '#2a2424', amb: '#3a2e2e', torch: '#ff7a30', mote: '#a08070' },
        forge: { fog: '#1c0804', far: 420, wall: '#3a2420', mortar: '#7a2008', floor: '#2a1a16', amb: '#6a3020', torch: '#ff6a20', mote: '#ff9030' },
        crystal: { fog: '#100a24', far: 460, wall: '#3a3060', mortar: '#140e2c', floor: '#4a4080', amb: '#5a4a9a', torch: '#b090ff', mote: '#c8b0ff' },
      }[theme];
      bg = new THREE.Color(C.fog);
      fog = new THREE.Fog(C.fog, CAM_DIST + 90, CAM_DIST + C.far);
      const seed = { deeps: 61, temple: 62, gaol: 63, forge: 64, crystal: 65 }[theme];
      g.add(wallPlane(room, 100, lambert({ map: stoneTex(hex(C.wall), hex(C.mortar), theme !== 'temple' && theme !== 'crystal', seed, theme === 'gaol') }), 64));
      if (!room.water) floorPlane(stoneTex(hex(C.floor), hex(C.mortar), true, seed + 10), 100);
      const stoneM = lambert({ map: stoneTex(shade(hex(C.wall), 1.25), hex(C.mortar), false, seed + 20) });
      g.add(new THREE.AmbientLight(C.amb, 1.0));
      if (theme === 'temple' || theme === 'gaol') {
        // rows of pillars; the temple's are thick and stepped, the gaol's carry chains
        for (let x = 0; x < room.W + 192; x += 192) {
          pillar(x, 55, 0, room.H, stoneM, theme === 'temple' ? 34 : 20);
          if (theme === 'temple') for (let y = 0; y < room.H; y += 224) arch(x + 96, 55, 192, y + 34, stoneM, 16);
        }
        if (theme === 'gaol') for (let i = 0; i < room.W / 60; i++) chain(30 + i * 60 + hash2(i, 7) * 30, 20 + hash2(i, 8) * 50, 0, 50 + hash2(i, 4) * 110);
      }
      if (theme === 'temple') {
        // serpent idols: a coiled body and a flat hooded head, eyes lit
        const idolM = lambert({ color: '#4a8a5a', emissive: '#0a2a14' });
        for (let x = 150; x < room.W; x += 330) {
          for (let k = 0; k < 4; k++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(20 - k * 3, 6, 5, 10), idolM);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(x, -(floorY - 6 - k * 11), -70);
            g.add(ring);
          }
          const hood = new THREE.Mesh(new THREE.SphereGeometry(14, 6, 5), idolM);
          hood.scale.set(1.3, 1, 0.5);
          hood.position.set(x, -(floorY - 64), -70);
          g.add(hood);
          const eyes = plane(40, 20, glowMaterial('#ffd040', 0.6));
          eyes.position.set(x, -(floorY - 66), -62);
          g.add(eyes);
          anim.push((t) => ((eyes.material as THREE.ShaderMaterial).uniforms.t.value = t + x));
        }
      }
      if (theme === 'forge') {
        // the glow of the furnaces below, hanging chains and a slow rain of embers
        const glow = plane(room.W * 3, 260, glowMaterial('#ff4a10', 0.6));
        glow.position.set(room.W / 2, -(room.H + 20), -120);
        g.add(glow);
        anim.push((t) => ((glow.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.6));
        const red = new THREE.PointLight('#ff5020', 1.6, 600, 0);
        red.position.set(room.W / 2, -(room.H + 40), -60);
        g.add(red);
        lights.push({ l: red, base: 1.6, seed: 3 });
        for (let i = 0; i < room.W / 90; i++) chain(40 + i * 90 + hash2(i, 9) * 40, 30 + hash2(i, 5) * 60, 0, 40 + hash2(i, 6) * 140);
        for (let x = 0; x < room.W + 256; x += 256) pillar(x, 60, 0, room.H, stoneM, 30);
      }
      if (theme === 'crystal' || theme === 'deeps') {
        // crystals (the vault) or pale stalagmites (the deeps) on floor and ceiling
        const m = theme === 'crystal' ? lambert({ color: '#b8a0ff', emissive: '#3a2a8a' }) : lambert({ color: '#4a6a68' });
        const n = Math.round(room.W / 40);
        for (let i = 0; i < n; i++) {
          const up = i % 2 === 0;
          const h = 22 + hash2(i, 1) * 50, r = 4 + hash2(i, 2) * 8;
          const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, theme === 'crystal' ? 4 : 6), m);
          const cy = Math.floor(hash2(i, 6) * room.def.h) * 224; // spread over every screen of a tall room
          c.position.set(hash2(i, 3) * room.W, up ? -(cy + 192 - h / 2 + 2) : -(cy + TILE + h / 2 - 2), -(14 + hash2(i, 4) * 80));
          if (!up) c.rotation.x = Math.PI;
          c.rotation.z = (hash2(i, 5) - 0.5) * (theme === 'crystal' ? 0.8 : 0.2);
          g.add(c);
        }
      }
      if (theme === 'crystal') {
        // tall mirrors along the back wall, each with a slow shimmer
        for (let x = 96; x < room.W; x += 192)
          for (let y = 100; y < room.H; y += 224) {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(52, 92, 4), lambert({ color: '#8a6ad0' }));
            frame.position.set(x, -y, -96);
            g.add(frame);
            const glass = plane(44, 84, glowMaterial('#a8d8ff', 0.5));
            glass.position.set(x, -y, -93);
            g.add(glass);
            anim.push((t) => ((glass.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.3 + x));
          }
      }
      for (let x = 128; x < room.W; x += 256) for (let y = 120; y < room.H; y += 224) addTorch(x, y, 80, C.torch, 2.3, 240, theme !== 'crystal' && theme !== 'deeps');
      g.add(motes(room, theme === 'forge' ? 70 : 40, C.mote, [10, 90]));
      break;
    }
    case 'docks': {
      // NEW GAME +: Gullmouth's waterfront at night. A black sea under a cold moon, the abbey's
      // dark tower out on its island, pier posts and fishermen's lanterns
      bg = new THREE.Color('#060a14');
      fog = new THREE.Fog('#0e1a28', CAM_DIST + 220, CAM_DIST + 1300);
      const sky = wallPlane(room, 1600, skyMaterial('#060c1e', '#22344e', true));
      (sky.material as THREE.ShaderMaterial).fog = false;
      g.add(sky);
      anim.push((t) => ((sky.material as THREE.ShaderMaterial).uniforms.t.value = t));
      const e = extent(room, 900);
      const tex = ridgeTex(hex('#101a26'), 71, 3);
      tex.repeat.set((e.x1 - e.x0) / 512, 1);
      const cliffs = plane(e.x1 - e.x0, 220, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true }));
      cliffs.position.set((e.x0 + e.x1) / 2, -(floorY - 60), -900);
      g.add(cliffs);
      // the abbey on its isle: a dark mass with the dead lamp tower
      const isleM = lambert({ color: '#141c28' });
      const isle = new THREE.Mesh(new THREE.BoxGeometry(260, 90, 40), isleM);
      isle.position.set(room.W * 0.7, -(floorY - 30), -620);
      g.add(isle);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(34, 200, 34), isleM);
      tower.position.set(room.W * 0.7 + 60, -(floorY - 150), -620);
      g.add(tower);
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(room.W + 2400, 1400), waterSurfaceMaterial('#0a1626', '#7a90c0'));
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(room.W / 2, -(floorY + 24), -700);
      g.add(sea);
      anim.push((t) => ((sea.material as THREE.ShaderMaterial).uniforms.t.value = t));
      const postM = lambert({ color: '#3a2a1c' });
      for (let x = 40; x < room.W; x += 150) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(10, 120, 10), postM);
        post.position.set(x + hash2(x, 3) * 40, -(floorY - 30), -(60 + hash2(x, 4) * 60));
        g.add(post);
      }
      const moon = new THREE.DirectionalLight('#8aa0d0', 1.1);
      moon.position.set(1, 1, 1);
      g.add(moon);
      g.add(new THREE.AmbientLight('#2a3a5a', 1.2));
      for (let x = 200; x < room.W; x += 320) addTorch(x, floorY - 70, 50, '#ffb060', 1.8, 200);
      g.add(motes(room, 30, '#8aa0c0', [20, 200]));
      break;
    }
    case 'cloister': {
      // NEW GAME +: Saint Calder's abbey. Pale limestone arcades, sea-blue stained glass and
      // the warm light of votive candles
      bg = new THREE.Color('#0c0a08');
      fog = new THREE.Fog('#181610', CAM_DIST + 120, CAM_DIST + 460);
      g.add(wallPlane(room, 110, lambert({ map: stoneTex(hex('#6a6454'), hex('#2a261c'), false, 81) }), 64));
      floorPlane(checkerTex(hex('#5a5444'), hex('#3a3428')), 110);
      const stoneM = lambert({ map: stoneTex(hex('#8a8270'), hex('#3a3628'), false, 82) });
      const winTex = windowTex([hex('#1a4a6a'), hex('#2a7a8a'), hex('#c8b070'), hex('#3a2a6a')], hex('#14100a'));
      const span = 192;
      for (let x = 96; x < room.W + 96; x += span) {
        for (let y = 64; y < room.H - 64; y += 224) {
          const win = plane(48, 96, new THREE.MeshBasicMaterial({ map: winTex, transparent: true, alphaTest: 0.5 }));
          win.position.set(x, -(y + 56), -108);
          g.add(win);
          const shaft = plane(60, 160, glowMaterial('#4a8aa0', 0.3));
          shaft.position.set(x + 12, -(y + 110), -70);
          shaft.rotation.z = 0.25;
          g.add(shaft);
          anim.push((t) => ((shaft.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.3));
        }
        pillar(x - span / 2, 56, 0, room.H, stoneM, 22);
        for (let y = 112; y < room.H; y += 224) addTorch(x - span / 2, y, 40, '#ffc070', 2.2, 230);
      }
      for (let x = 0; x < room.W; x += span) for (let y = 24; y < room.H; y += 224) arch(x, 60, span, y, stoneM, 12);
      g.add(new THREE.AmbientLight('#5a5040', 1.1));
      g.add(motes(room, 26, '#e0d0a0', [10, 100]));
      break;
    }
    case 'seacave': {
      // NEW GAME +: the sea caves under the strand. Wet black rock, dripping stone teeth, and
      // the green-blue glow of things living in the water
      bg = new THREE.Color('#02080a');
      fog = new THREE.Fog('#041216', CAM_DIST + 80, CAM_DIST + 360);
      g.add(wallPlane(room, 100, lambert({ map: stoneTex(hex('#1e2a30'), hex('#0a1014'), true, 91) }), 64));
      if (!room.water) floorPlane(stoneTex(hex('#1a2428'), hex('#0a1014'), true, 92), 100);
      const rockM = lambert({ color: '#2a3a40' });
      const n = Math.round(room.W / 36);
      for (let i = 0; i < n; i++) {
        const up = i % 3 === 0;
        const h = 20 + hash2(i, 11) * 60, r = 4 + hash2(i, 12) * 9;
        const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), rockM);
        const cy = Math.floor(hash2(i, 16) * room.def.h) * 224;
        c.position.set(hash2(i, 13) * room.W, up ? -(cy + 192 - h / 2 + 2) : -(cy + TILE + h / 2 - 2), -(14 + hash2(i, 14) * 80));
        if (!up) c.rotation.x = Math.PI;
        g.add(c);
      }
      const glow = plane(room.W * 3, 260, glowMaterial('#1aa08a', 0.35));
      glow.position.set(room.W / 2, -(room.H + 10), -110);
      g.add(glow);
      anim.push((t) => ((glow.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.4));
      g.add(new THREE.AmbientLight('#1e4a50', 1.0));
      for (let x = 160; x < room.W; x += 320) for (let y = 120; y < room.H; y += 224) addTorch(x, y, 80, '#60e0d0', 1.8, 220, false);
      g.add(motes(room, 50, '#60f0d0', [10, 90]));
      break;
    }
    case 'hall':
    case 'stair':
    case 'shrine': {
      bg = new THREE.Color('#06050c');
      fog = new THREE.Fog('#0a0814', CAM_DIST + (120), CAM_DIST + (420));
      // the back wall matches each setting's own stone (see paletteFor in tiles.ts)
      const wallCol = theme === 'stair' ? '#3e3650' : theme === 'shrine' ? '#30424a' : '#363a52';
      const wallTex = stoneTex(hex(wallCol), hex('#181a2a'), false, 12);
      g.add(wallPlane(room, 110, lambert({ map: wallTex }), 64));
      const stoneM = lambert({ map: stoneTex(hex('#4a4e68'), hex('#22243a'), false, 13) });
      if (theme !== 'stair') floorPlane(checkerTex(hex('#4a3a48'), hex('#24202e')), 110);
      ceilingPlane(stoneTex(hex('#2a2c40'), hex('#121420'), false, 14), 110);
      g.add(new THREE.AmbientLight('#3a3460', theme === 'shrine' ? 0.8 : 1.0));
      const winTex = windowTex([hex('#2a3a8a'), hex('#8a1a2a'), hex('#4a7ac8'), hex('#c8a040')], hex('#0e0a14'));
      const span = theme === 'shrine' ? 192 : 192;
      for (let x = 96; x < room.W + 96; x += span) {
        if (theme !== 'shrine') {
          for (let y = 64; y < room.H - 64; y += 224) {
            const win = plane(48, 96, new THREE.MeshBasicMaterial({ map: winTex, transparent: true, alphaTest: 0.5 }));
            win.position.set(x, -(y + 56), -108);
            g.add(win);
            const shaft = plane(60, 160, glowMaterial('#4a5aa0', 0.35));
            shaft.position.set(x + 12, -(y + 110), -70);
            shaft.rotation.z = 0.25;
            g.add(shaft);
            anim.push((t) => ((shaft.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.3));
          }
        }
        const px = x - span / 2;
        pillar(px, 56, 0, room.H, stoneM, 26);
        if (theme === 'hall') {
          const ban = plane(16, 48, lambert({ map: bannerTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
          ban.scale.set(1.5, 1.5, 1);
          ban.position.set(x + 40, -64, -100);
          g.add(ban);
          const sway = Math.random() * 6;
          anim.push((t) => (ban.rotation.y = Math.sin(t * 0.8 + sway) * 0.15));
        }
        for (let y = 112; y < room.H; y += 224) addTorch(px, y, 40, theme === 'shrine' ? '#6a8aff' : '#ff9a40', 2.4, 240);
      }
      for (let x = 0; x < room.W; x += span) arch(x + span / 2 - span / 2, 60, span, 24, stoneM, 12);
      if (theme === 'stair') {
        // diagonal background stairs
        const stepM = lambert({ map: stoneTex(hex('#3a3e56'), hex('#1a1c2c'), false, 15) });
        for (let i = 0; i < room.H / 16; i++) {
          const s = new THREE.Mesh(new THREE.BoxGeometry(48, 10, 40), stepM);
          const k = i % 16;
          const dir = Math.floor(i / 16) % 2 ? -1 : 1;
          s.position.set(room.W / 2 + dir * (k * 12 - 90), -(room.H - i * 14), -80);
          g.add(s);
        }
      }
      if (theme === 'shrine') {
        const sig = plane(180, 180, sigilMaterial(room.def.save ? '#c02040' : '#4a6aff'));
        sig.position.set(room.W / 2, -(floorY - 80), -100);
        g.add(sig);
        anim.push((t) => ((sig.material as THREE.ShaderMaterial).uniforms.t.value = t));
        const l = new THREE.PointLight(room.def.save ? '#ff4060' : '#6a8aff', 2.5, 300, 0);
        l.position.set(room.W / 2, -(floorY - 40), -40);
        g.add(l);
        lights.push({ l, base: 2.5, seed: 3 });
        g.add(motes(room, 40, room.def.save ? '#ff8090' : '#8ab0ff', [10, 100]));
      } else g.add(motes(room, 24, '#a090c0', [10, 100]));
      break;
    }
    case 'catacomb':
    case 'flooded':
    case 'chasm': {
      const flooded = theme === 'flooded';
      bg = new THREE.Color('#040605');
      fog = new THREE.Fog(flooded ? '#08140e' : '#0a0806', CAM_DIST + (theme === 'chasm' ? 150 : 90), CAM_DIST + (theme === 'chasm' ? 900 : 380));
      const wallTex = stoneTex(hex('#3a3228'), hex('#16110e'), true, 21, true);
      if (theme === 'chasm') {
        // abyss: far wall + glowing depths + stone pillars rising from below
        g.add(wallPlane(room, 700, lambert({ map: wallTex }), 64));
        const glow = plane(room.W * 3, 300, glowMaterial('#a02010', 0.45));
        glow.position.set(room.W / 2, -(room.H + 80), -400);
        g.add(glow);
        anim.push((t) => ((glow.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.5));
        const pm = lambert({ map: stoneTex(hex('#4c4238'), hex('#241c18'), true, 22) });
        for (let i = 0; i < 10; i++) {
          const d = 120 + hash2(i, 1) * 400;
          const p = new THREE.Mesh(new THREE.BoxGeometry(40 + hash2(i, 2) * 30, 900, 40), pm);
          p.position.set(hash2(i, 3) * room.W, -(room.H + 300 - hash2(i, 4) * 200), -d);
          g.add(p);
        }
        for (let i = 0; i < 8; i++) chain(40 + i * (room.W / 8) + hash2(i, 9) * 40, 40 + hash2(i, 5) * 80, 0, 60 + hash2(i, 6) * 120);
        const red = new THREE.PointLight('#ff4020', 1.1, 700, 0);
        red.position.set(room.W / 2, -(room.H + 100), -100);
        g.add(red);
        lights.push({ l: red, base: 1.1, seed: 1 });
        g.add(new THREE.AmbientLight('#3a2a30', 0.7));
        g.add(motes(room, 50, '#ff7030', [10, 300]));
      } else {
        g.add(wallPlane(room, 90, lambert({ map: wallTex }), 64));
        const stoneM = lambert({ map: stoneTex(hex('#4c4238'), hex('#241c18'), true, 23) });
        for (let x = 0; x < room.W + 256; x += 256) {
          pillar(x, 50, 0, room.H, stoneM, 24);
          for (let y = 0; y < room.H; y += 224) arch(x + 128, 50, 256, y + 40, stoneM, 14);
        }
        if (!flooded || !room.water) floorPlane(stoneTex(hex('#2e2620'), hex('#120e0c'), true, 24), 90);
        g.add(new THREE.AmbientLight(flooded ? '#2a4a3a' : '#3a2e28', 1.0));
        for (let x = 128; x < room.W; x += 256) for (let y = 120; y < room.H; y += 224) addTorch(x, y, 80, '#ff8a30', 2.4, 230);
        // bone piles on the floor plane
        const boneM = lambert({ color: '#b8ac8a' });
        for (let i = 0; i < room.W / 40; i++) {
          if (flooded) break;
          const pile = new THREE.Mesh(new THREE.SphereGeometry(4 + hash2(i, 2) * 5, 5, 4), boneM);
          pile.position.set(i * 40 + hash2(i, 1) * 30, -floorY, -(20 + hash2(i, 3) * 60));
          pile.scale.y = 0.5;
          g.add(pile);
        }
        for (let i = 0; i < room.W / 120; i++) chain(60 + i * 120 + hash2(i, 7) * 50, 30 + hash2(i, 8) * 40, 0, 40 + hash2(i, 4) * 80);
        if (flooded && room.water) {
          const water = new THREE.Mesh(new THREE.PlaneGeometry(room.W + 600, 200), waterSurfaceMaterial('#0e3a30', '#6ac0a0'));
          water.rotation.x = -Math.PI / 2;
          water.position.set(room.W / 2, -room.water.y, -100);
          g.add(water);
          waterSurface = water;
          anim.push((t) => ((water.material as THREE.ShaderMaterial).uniforms.t.value = t));
        }
        g.add(motes(room, 40, flooded ? '#60e0a0' : '#c0a070', [10, 80]));
      }
      break;
    }
    case 'snow': {
      // moonlit mountain pass: layered snowy ranges, the keep in the distance, pines, falling snow
      bg = new THREE.Color('#0c1024');
      fog = new THREE.Fog('#2a3456', CAM_DIST + 350, CAM_DIST + 1900);
      const sky = wallPlane(room, 1800, skyMaterial('#070a1e', '#3a4470', true));
      (sky.material as THREE.ShaderMaterial).fog = false;
      g.add(sky);
      anim.push((t) => ((sky.material as THREE.ShaderMaterial).uniforms.t.value = t));
      // ranges are sized so one texture pixel is about one screen pixel at their depth;
      // `top` is roughly where the peaks sit on screen when the camera is on the bottom screen
      const mid = horizonMid(room);
      for (const [d, col, cap, seed, top] of [[1600, '#2a3254', '#b8c4e0', 41, 6], [1150, '#1c2240', '#94a2c4', 42, 34], [800, '#121830', '#6e7ea4', 43, 64]] as [number, string, string, number, number][]) {
        const s = (CAM_DIST + d) / CAM_DIST;
        const e = extent(room, d);
        const w = e.x1 - e.x0;
        const tex = peakTex(hex(col), hex(cap), seed);
        tex.repeat.set(w / s / 512, 1);
        const m = plane(w, 160 * s, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true }));
        m.position.set((e.x0 + e.x1) / 2, -(mid + (top - VH / 2) * s + 80 * s), -d);
        g.add(m);
      }
      // the keep stands in the valley in front of the ranges: further away the higher up
      // the pass you are (rooms further west)
      const cd = 380 + Math.max(0, -room.def.gx) * 34;
      const cs = (CAM_DIST + cd) / CAM_DIST;
      const castle = distantCastle();
      castle.position.set(room.W * 0.85, -(mid + (150 - VH / 2) * cs), -cd);
      g.add(castle);
      // snowfield and pines
      const sp = new PixelCanvas(32, 32);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) sp.set(x, y, hash2(x, y, 31) < 0.1 ? hex('#a8b8d8') : hash2(x >> 2, y >> 1, 32) < 0.3 ? hex('#d4def0') : hex('#e6eefc'));
      floorPlane(makeTexture(sp, true), 320);
      for (let i = 0; i < room.W / 70; i++) {
        const d = 40 + hash2(i, 5, room.def.gx) * 240, k = 1 + d / 300;
        const m = plane(48 * k, 96 * k, lambert({ map: pineTex(i + 60, hex(d > 150 ? '#1a2238' : '#121a2a'), hex('#c8d4ec')), transparent: true, alphaTest: 0.5 }));
        m.position.set(i * 70 + hash2(i, 6) * 50, -(floorY - 48 * k + 4), -d);
        g.add(m);
      }
      const moon = new THREE.DirectionalLight('#9aa8e0', 1.3);
      moon.position.set(1, 1, 1);
      g.add(moon);
      g.add(new THREE.AmbientLight('#56608a', 1.25));
      const wind = room.def.chase ? 1.6 : 0.4;
      g.add(snowfall(room, 220, [40, 420], 1, wind));
      g.add(snowfall(room, 60, [2, 30], 2, wind, 1.4));
      break;
    }
    case 'ice': {
      // ice cave: frozen walls, crystal clusters on floor and ceiling, cold blue light
      bg = new THREE.Color('#05080e');
      fog = new THREE.Fog('#0c1828', CAM_DIST + 80, CAM_DIST + 420);
      g.add(wallPlane(room, 100, lambert({ map: stoneTex(hex('#3a5470'), hex('#142030'), true, 51) }), 64));
      floorPlane(stoneTex(hex('#6a88a8'), hex('#2a3a50'), true, 52), 100);
      ceilingPlane(stoneTex(hex('#2a3c54'), hex('#101824'), true, 53), 100, 3 * TILE);
      const crystalM = lambert({ color: '#7ac0f0', emissive: '#1a4a78' });
      for (let i = 0; i < 16; i++) {
        const up = i % 2 === 0;
        const h = 20 + hash2(i, 1) * 44, r = 4 + hash2(i, 2) * 7;
        const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), crystalM);
        c.position.set(hash2(i, 3) * room.W, up ? -(floorY - h / 2 + 2) : -(3 * TILE + h / 2 - 2), -(12 + hash2(i, 4) * 80));
        if (!up) c.rotation.x = Math.PI;
        c.rotation.z = (hash2(i, 5) - 0.5) * 0.5;
        g.add(c);
      }
      for (const x of [room.W * 0.3, room.W * 0.75]) {
        const l = new THREE.PointLight('#6ac8ff', 2.2, 260, 0);
        l.position.set(x, -(floorY - 40), -30);
        g.add(l);
        lights.push({ l, base: 2.2, seed: x });
        const glow = plane(96, 96, glowMaterial('#4aa0e0', 0.45));
        glow.position.set(x, -(floorY - 40), -60);
        g.add(glow);
        anim.push((t) => ((glow.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.4 + x));
      }
      g.add(new THREE.AmbientLight('#2a4a6a', 1.0));
      g.add(snowfall(room, 40, [10, 80], 1, 0.1, 0.3));
      g.add(motes(room, 24, '#9ad8ff', [10, 80]));
      break;
    }
    case 'garden': {
      // the castle's night gardens: moonlit sky, the keep looming behind tall clipped hedges,
      // kennel fences and lanterns, fireflies
      bg = new THREE.Color('#070a14');
      fog = new THREE.Fog('#101a20', CAM_DIST + 220, CAM_DIST + 1100);
      const sky = wallPlane(room, 1400, skyMaterial('#060818', '#28304a', true));
      (sky.material as THREE.ShaderMaterial).fog = false;
      g.add(sky);
      anim.push((t) => ((sky.material as THREE.ShaderMaterial).uniforms.t.value = t));
      for (const [d, col, seed, yoff] of [[900, '#141a26', 61, 40], [600, '#0e141c', 62, 70]] as [number, string, number, number][]) {
        const e = extent(room, d);
        const tex = ridgeTex(hex(col), seed, 2);
        const w = e.x1 - e.x0;
        tex.repeat.set(w / 512, 1);
        const m = plane(w, 220, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true }));
        m.position.set((e.x0 + e.x1) / 2, -(floorY - 110 + yoff), -d);
        g.add(m);
      }
      const keep = distantCastle();
      keep.scale.set(1.6, 1.6, 1.6);
      keep.position.set(room.W * 0.3 - room.def.gx * 20, -(floorY + 40), -420);
      g.add(keep);
      // hedge rows: dark boxes with a lighter clipped top
      const hedgeM = lambert({ color: '#1a3018' }), hedgeTop = lambert({ color: '#2e4c26' });
      for (const [d, h] of [[150, 90], [90, 60]] as [number, number][]) {
        for (let x = -60; x < room.W + 60; x += 120) {
          if (hash2(x, d) < 0.25) continue; // gaps in the hedge
          const w = 90 + hash2(x, d, 2) * 30;
          const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 24), hedgeM);
          b.position.set(x, -(floorY - h / 2), -d);
          g.add(b);
          const top = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 6, 28), hedgeTop);
          top.position.set(x, -(floorY - h), -d);
          g.add(top);
        }
      }
      // kennel fence posts and rails
      const woodM = lambert({ color: '#3a2a1c' });
      for (let x = 0; x < room.W; x += 40) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(4, 30, 4), woodM);
        post.position.set(x, -(floorY - 15), -40);
        g.add(post);
      }
      for (const y of [10, 22]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(room.W + 80, 3, 2), woodM);
        rail.position.set(room.W / 2, -(floorY - y), -40);
        g.add(rail);
      }
      for (let i = 0; i < 4; i++) {
        const m = plane(64, 96, new THREE.MeshBasicMaterial({ map: treeTex(i + 30), transparent: true, alphaTest: 0.5 }));
        m.position.set(hash2(i, 7, room.def.gx) * room.W, -(floorY - 48 + 10), -200 - i * 40);
        g.add(m);
      }
      const gp = new PixelCanvas(32, 32);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) gp.set(x, y, hash2(x, y, 63) < 0.2 ? hex('#2e4a26') : hash2(x >> 1, y >> 1, 64) < 0.4 ? hex('#1e3418') : hex('#24401e'));
      floorPlane(makeTexture(gp, true), 260);
      const moon = new THREE.DirectionalLight('#8a9ad0', 1.1);
      moon.position.set(1, 1, 1);
      g.add(moon);
      g.add(new THREE.AmbientLight('#3a4a5a', 1.1));
      for (let x = 100; x < room.W; x += 260) addTorch(x, floorY - 40, 30, '#ffb050', 2, 200);
      g.add(motes(room, 40, '#c8f070', [10, 200]));
      break;
    }
    case 'rooftop': {
      // up on the castle roofs: wide sky, clouds racing past, the peaks of the pass, spires around
      bg = new THREE.Color('#0a0c20');
      fog = new THREE.Fog('#242c4a', CAM_DIST + 350, CAM_DIST + 1800);
      const sky = wallPlane(room, 1800, skyMaterial('#060820', '#3a3a6a', true));
      (sky.material as THREE.ShaderMaterial).fog = false;
      g.add(sky);
      anim.push((t) => ((sky.material as THREE.ShaderMaterial).uniforms.t.value = t));
      const mid = horizonMid(room);
      for (const [d, col, cap, seed, top] of [[1500, '#262e50', '#aab8d8', 71, 40], [1000, '#1a2040', '#8a98bc', 72, 80]] as [number, string, string, number, number][]) {
        const s = (CAM_DIST + d) / CAM_DIST;
        const e = extent(room, d);
        const w = e.x1 - e.x0;
        const tex = peakTex(hex(col), hex(cap), seed);
        tex.repeat.set(w / s / 512, 1);
        const m = plane(w, 160 * s, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true }));
        m.position.set((e.x0 + e.x1) / 2, -(mid + (top - VH / 2) * s + 80 * s), -d);
        g.add(m);
      }
      for (let i = 0; i < 6; i++) {
        const d = 300 + i * 70;
        const m = plane(256, 64, new THREE.MeshBasicMaterial({ map: cloudTex(i + 20), transparent: true, opacity: 0.7, depthWrite: false }));
        const baseX = (i / 6) * (room.W + 600) - 300;
        m.position.set(baseX, -(floorY - 162 + (i % 3) * 40), -d); // just above the bottom screen's horizon
        g.add(m);
        anim.push((t) => (m.position.x = ((baseX + t * (12 + i * 2)) % (room.W + 800)) - 300));
      }
      // neighboring spires and roofs
      const slateM = lambert({ color: '#22243a' }), wallM = lambert({ map: stoneTex(hex('#3a3e54'), hex('#181a28'), false, 73) });
      for (let i = 0; i < 7; i++) {
        const d = 120 + hash2(i, 1) * 260, w = 30 + hash2(i, 2) * 30, h = 120 + hash2(i, 3) * 160;
        const x = hash2(i, 4, room.def.gx) * (room.W + 200) - 100;
        const tw = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), wallM);
        tw.position.set(x, -(floorY + 60 - h / 2), -d);
        g.add(tw);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.8, w * 1.6, 4), slateM);
        roof.position.set(x, -(floorY + 60 - h - w * 0.8), -d);
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
      }
      const moon = new THREE.DirectionalLight('#9aa8e0', 1.3);
      moon.position.set(1, 1, 1);
      g.add(moon);
      g.add(new THREE.AmbientLight('#4a5080', 1.2));
      g.add(snowfall(room, 120, [20, 400], 1, 1.4));
      g.add(snowfall(room, 30, [2, 20], 2, 1.4, 1.4));
      break;
    }
    case 'belfry': {
      // inside the bell tower: timber frames, hanging ropes and bells, moonlight through the louvres
      bg = new THREE.Color('#07050a');
      fog = new THREE.Fog('#120c10', CAM_DIST + 100, CAM_DIST + 420);
      g.add(wallPlane(room, 110, lambert({ map: stoneTex(hex('#3e342e'), hex('#181210'), false, 81) }), 64));
      ceilingPlane(stoneTex(hex('#2a221e'), hex('#100c0a'), false, 82), 110);
      if (room.def.gy >= 0) floorPlane(checkerTex(hex('#3a2c22'), hex('#241a14')), 110);
      const timber = lambert({ color: '#3a2616' });
      for (let x = 0; x < room.W + 160; x += 160) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(14, room.H + 200, 14), timber);
        post.position.set(x, -room.H / 2, -60);
        g.add(post);
      }
      for (let y = 80; y < room.H; y += 112) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(room.W + 300, 10, 12), timber);
        beam.position.set(room.W / 2, -y, -64);
        g.add(beam);
        for (let x = 0; x < room.W; x += 160) {
          // diagonal braces
          const br = new THREE.Mesh(new THREE.BoxGeometry(6, 90, 6), timber);
          br.position.set(x + 40, -(y + 40), -66);
          br.rotation.z = 0.7;
          g.add(br);
        }
      }
      // louvred windows letting in blue moonlight
      for (let x = 80; x < room.W; x += 240)
        for (let y = 60; y < room.H - 40; y += 224) {
          const win = plane(40, 70, glowMaterial('#4a5a9a', 0.5));
          win.position.set(x, -(y + 30), -105);
          g.add(win);
          anim.push((t) => ((win.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.2 + x));
          for (let k = 0; k < 5; k++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(44, 3, 4), timber);
            slat.position.set(x, -(y + 6 + k * 12), -100);
            slat.rotation.x = 0.5;
            g.add(slat);
          }
        }
      // bells on ropes
      const bronze = lambert({ color: '#6a5028', emissive: '#1a1004' });
      const ropeM = lambert({ color: '#5a4a34' });
      const profile = [[0, 0], [8, 1], [10, 8], [11, 18], [15, 24], [16, 26], [0, 26]].map(([x, y]) => new THREE.Vector2(x, -y));
      const bellGeo = new THREE.LatheGeometry(profile, 10);
      const big = room.def.boss === 'bellmother';
      const bells = big ? [{ x: room.W / 2, y: 70, s: 4.2, d: 90 }] : [];
      for (let i = 0; i < room.W / 220; i++) bells.push({ x: 110 + i * 220 + hash2(i, 9) * 60, y: 60 + hash2(i, 8) * 80, s: 0.8 + hash2(i, 7) * 0.8, d: 40 + hash2(i, 6) * 40 });
      for (const b of bells) {
        const bell = new THREE.Group();
        const m = new THREE.Mesh(bellGeo, bronze);
        m.scale.set(b.s, b.s, b.s);
        bell.add(m);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, b.y + 200, 4), ropeM);
        rope.position.y = (b.y + 200) / 2;
        bell.add(rope);
        bell.position.set(b.x, -b.y, -b.d); // the bell hangs below this point, its rope goes up
        g.add(bell);
        const seed = b.x;
        anim.push((t) => (bell.rotation.z = Math.sin(t * 0.7 + seed) * 0.06));
      }
      g.add(new THREE.AmbientLight('#3a2e34', 1.0));
      for (let x = 120; x < room.W; x += 240) for (let y = 130; y < room.H; y += 224) addTorch(x, y, 50, '#ffa040', 2.2, 230);
      g.add(motes(room, 50, '#d0b890', [10, 100]));
      break;
    }
    case 'aqueduct': {
      // frozen waterworks: icy arches, a glowing channel of black ice, icicles, cold mist
      bg = new THREE.Color('#04070c');
      fog = new THREE.Fog('#0c1622', CAM_DIST + 90, CAM_DIST + 420);
      const wallTex = stoneTex(hex('#3a4a5a'), hex('#141c26'), true, 91);
      g.add(wallPlane(room, 100, lambert({ map: wallTex }), 64));
      const stoneM = lambert({ map: stoneTex(hex('#4a5a6c'), hex('#1a2230'), true, 92) });
      for (let x = 0; x < room.W + 256; x += 256) {
        pillar(x, 54, 0, room.H, stoneM, 26);
        for (let y = 0; y < room.H; y += 224) arch(x + 128, 54, 256, y + 50, stoneM, 14);
      }
      // the frozen channel along the back wall
      const ice = new THREE.Mesh(new THREE.PlaneGeometry(room.W + 600, 80), waterSurfaceMaterial('#1a3a52', '#9ad8ff'));
      ice.rotation.x = -Math.PI / 2;
      ice.position.set(room.W / 2, -floorY, -60);
      g.add(ice);
      anim.push((t) => ((ice.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.15));
      const icicleM = lambert({ color: '#8ac8f0', emissive: '#1a3a5a' });
      for (let i = 0; i < room.W / 30; i++) {
        const h = 10 + hash2(i, 1) * 30;
        const c = new THREE.Mesh(new THREE.ConeGeometry(2 + hash2(i, 2) * 3, h, 4), icicleM);
        c.rotation.x = Math.PI;
        for (let y = 50; y < room.H; y += 224) {
          const cc = c.clone();
          cc.position.set(i * 30 + hash2(i, 3) * 20, -(y + h / 2), -(30 + hash2(i, 4) * 30));
          g.add(cc);
        }
      }
      g.add(new THREE.AmbientLight('#2a3e56', 1.1));
      for (let x = 128; x < room.W; x += 256)
        for (let y = 120; y < room.H; y += 224) {
          const l = new THREE.PointLight('#7ac8ff', 2, 240, 0);
          l.position.set(x, -y, -30);
          g.add(l);
          lights.push({ l, base: 2, seed: x + y });
          const glow = plane(80, 80, glowMaterial('#4a9ad8', 0.4));
          glow.position.set(x, -y, -50);
          g.add(glow);
          anim.push((t) => ((glow.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.4 + x));
        }
      g.add(snowfall(room, 50, [10, 90], 1, 0.15, 0.35));
      g.add(motes(room, 30, '#a8e0ff', [10, 90]));
      break;
    }
    case 'library': {
      // the Ashen Library: walls of shelves between sandstone piers, warm lamplight, drifting pages
      bg = new THREE.Color('#080604');
      fog = new THREE.Fog('#1a120a', CAM_DIST + 100, CAM_DIST + 460);
      g.add(wallPlane(room, 100, lambert({ map: shelfTex(95) }), 64));
      const oakM = lambert({ color: '#3a2212' });
      const stoneM = lambert({ map: stoneTex(hex('#6a5a3c'), hex('#241a0e'), false, 96) });
      ceilingPlane(stoneTex(hex('#3a3020'), hex('#16100a'), false, 97), 110);
      floorPlane(checkerTex(hex('#3a2418'), hex('#1e120c')), 110);
      g.add(new THREE.AmbientLight('#4a3a2a', 1.0));
      // sandstone piers and arches every 192 px, the shelves running behind them
      for (let px = 0; px < room.W + 96; px += 192) {
        pillar(px, 56, 0, room.H, stoneM, 24);
        arch(px + 96, 60, 192, 24, stoneM, 12);
      }
      // oak gallery rails and rolling ladders against the shelves
      for (let y = 150; y < room.H - 30; y += 224) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(room.W + 300, 6, 10), oakM);
        rail.position.set(room.W / 2, -y, -64);
        g.add(rail);
        for (let x = 12; x < room.W + 150; x += 36) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(3, 22, 3), oakM);
          post.position.set(x, -(y - 12), -64);
          g.add(post);
        }
      }
      for (let i = 0; i < room.W / 200; i++) {
        const lx = 70 + i * 200 + hash2(i, 41) * 80, top = 40 + hash2(i, 42) * 60, len = 130;
        for (const dx of [-7, 7]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(2.5, len, 2.5), oakM);
          rail.position.set(lx + dx, -(top + len / 2), -92);
          rail.rotation.z = 0.08;
          g.add(rail);
        }
        for (let r = 0; r < len; r += 12) {
          const rung = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 2.5), oakM);
          rung.position.set(lx, -(top + r + 6), -92);
          g.add(rung);
        }
      }
      // lamps and chandeliers: warm candlelight, green desk lamps
      const brass = lambert({ color: '#8a6a30', emissive: '#2a1a08' });
      for (let x = 192; x < room.W + 192; x += 384)
        for (let row = 0; row * 224 < room.H; row++) {
          const y = row * 224 + 112;
          const green = (Math.floor(x / 384) + row) % 2 === 1;
          addTorch(x, y, 50, green ? '#7ad8a0' : '#ffb050', green ? 1.6 : 2.0, 230, false);
          const glow = plane(70, 70, glowMaterial(green ? '#40c080' : '#ffa040', 0.4));
          glow.position.set(x, -y, -52);
          g.add(glow);
          anim.push((t) => ((glow.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.5 + x));
          if (!green) {
            // a ring chandelier on a chain
            const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 1.6, 4, 12), brass);
            ring.rotation.x = Math.PI / 2.6;
            ring.position.set(x, -(y - 24), -50);
            g.add(ring);
            chain(x, 50, y - 24 - Math.min(y, 120), y - 24);
            for (let c = 0; c < 6; c++) {
              const a = (c / 6) * Math.PI * 2;
              const cd = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 6, 4), lambert({ color: '#e8dcc0', emissive: '#a08040' }));
              cd.position.set(x + Math.cos(a) * 20, -(y - 24 + Math.sin(a) * 7 - 5), -50 + Math.sin(a) * 15);
              g.add(cd);
            }
          } else {
            const shade_ = new THREE.Mesh(new THREE.ConeGeometry(7, 7, 6), lambert({ color: '#2a6a4a', emissive: '#103a24' }));
            shade_.position.set(x, -(y - 6), -52);
            g.add(shade_);
          }
        }
      g.add(motes(room, 46, '#e4d4aa', [10, 90], 3)); // dust and drifting scraps of paper
      break;
    }
    case 'lair': {
      bg = new THREE.Color('#080203');
      fog = new THREE.Fog('#1a0606', CAM_DIST + (100), CAM_DIST + (500));
      g.add(wallPlane(room, 150, lambert({ map: stoneTex(hex('#3a2020'), hex('#140808'), true, 31, true) }), 64));
      floorPlane(stoneTex(hex('#2e1a1a'), hex('#100606'), true, 32), 150);
      g.add(new THREE.AmbientLight('#3a2024', 0.8));
      // giant ribcage arching over the arena
      const boneM = lambert({ color: '#8a8070' });
      for (let i = 0; i < 9; i++) {
        const x = 40 + i * (room.W - 80) / 8;
        const d = 70 + Math.abs(i - 4) * 6;
        for (const s of [-1, 1]) {
          const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(x, -room.H + 40, -d),
            new THREE.Vector3(x + s * 20, -room.H * 0.4, -d),
            new THREE.Vector3(x + s * 60, -20, -d + 20),
            new THREE.Vector3(room.W / 2 + (x - room.W / 2) * 0.3, 10, -d + 30),
          );
          if (s > 0) continue;
          const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 6 - Math.abs(i - 4) * 0.4, 5, false), boneM);
          g.add(tube);
        }
      }
      // spine along the top
      for (let x = -100; x < room.W + 100; x += 22) {
        const v = new THREE.Mesh(new THREE.SphereGeometry(9, 6, 5), boneM);
        v.position.set(x, 4, -60);
        v.scale.set(1, 0.7, 0.8);
        g.add(v);
      }
      // skull piles
      for (let i = 0; i < 30; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(5 + hash2(i, 1) * 4, 5, 4), boneM);
        s.position.set(hash2(i, 2) * room.W, -floorY + 2, -(10 + hash2(i, 3) * 120));
        g.add(s);
      }
      for (let x = 96; x < room.W; x += 192) addTorch(x, room.H - 120, 100, '#ff6a30', 1.5, 260);
      const pulse = new THREE.PointLight('#ff3010', 0.9, 600, 0);
      pulse.position.set(room.W / 2, -room.H / 2, -40);
      g.add(pulse);
      lights.push({ l: pulse, base: 0.9, seed: 7 });
      g.add(motes(room, 70, '#ff6020', [5, 140], 2));
      break;
    }
  }

  // tag torch sprites with a seed so they don't flicker in sync
  // ---------------------------------------------------------------- boss arenas
  // Each boss room gets set pieces of its own on top of its theme, in layers at different
  // depths so they slide against each other as the camera moves (0.19.0).
  const glowAt = (x: number, y: number, d: number, w: number, h: number, color: string, k: number, speed = 1) => {
    const m = plane(w, h, glowMaterial(color, k));
    m.position.set(x, -y, -d);
    m.renderOrder = 1;
    g.add(m);
    anim.push((t) => ((m.material as THREE.ShaderMaterial).uniforms.t.value = t * speed + x * 0.01));
    return m;
  };
  /** A flat translucent sheet (light shafts, veils, glass). */
  const sheet = (x: number, y: number, d: number, w: number, h: number, color: string, opacity: number, rot = 0, add = true) => {
    const m = plane(w, h, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false, side: THREE.DoubleSide }));
    m.position.set(x, -y, -d);
    m.rotation.z = rot;
    g.add(m);
    return m;
  };
  const W = room.W, H = room.H;
  switch (room.def.id) {
    case 'trial_lock':
    case 'dp_cistern': {
      // the Black Cistern: two great sluice pipes pouring from the back wall, an iron grating
      // across the vault, and cold light falling through it in shafts
      const ironM = lambert({ color: '#3a4448' });
      for (const x of [W * 0.22, W * 0.78]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 60, 10), ironM);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(x, -110, -84);
        g.add(pipe);
        const fall = sheet(x, 110 + (H - 110) / 2, 70, 44, H - 110, '#4ac0c0', 0.22);
        anim.push((t) => ((fall.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(t * 7 + x) * 0.05));
        glowAt(x, H - 40, 60, 140, 80, '#60e0d0', 0.4, 2);
      }
      for (let x = 0; x < W + 64; x += 64) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 220), ironM);
        bar.position.set(x, -20, -110);
        g.add(bar);
      }
      for (let i = 0; i < 6; i++) {
        const sh = sheet(60 + i * 130, H / 2, 40 + i * 14, 26, H * 1.3, '#9ae0ff', 0.07, 0.22);
        anim.push((t) => ((sh.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t * 0.6 + i) * 0.03));
      }
      for (let i = 0; i < 10; i++) chain(40 + i * 76, 24 + (i % 3) * 20, 0, 90 + ((i * 53) % 150));
      break;
    }
    case 'trial_rotunda':
    case 'tp_court': {
      // the Bride's Court: a ruined wedding. A round window of gold glass, veils hung between
      // the pillars, and rows of petrified guests receding into the dark
      glowAt(W / 2, 120, 96, 220, 220, '#ffcf60', 0.55, 0.3);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(92, 7, 6, 28), lambert({ color: '#8a7a40' }));
      ring.position.set(W / 2, -120, -94);
      g.add(ring);
      for (let k = 0; k < 6; k++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(184, 4, 4), lambert({ color: '#8a7a40' }));
        spoke.rotation.z = (k * Math.PI) / 6;
        spoke.position.set(W / 2, -120, -93);
        g.add(spoke);
      }
      for (let i = 0; i < 7; i++) {
        const v = sheet(50 + i * 112, 150, 30 + (i % 3) * 22, 60, 220, '#e8e0d0', 0.1, (i % 2 ? 1 : -1) * 0.08, false);
        anim.push((t) => (v.rotation.z = (i % 2 ? 1 : -1) * 0.08 + Math.sin(t * 0.7 + i) * 0.03));
      }
      const guestM = lambert({ color: '#7a8478' });
      for (let i = 0; i < 26; i++) {
        const d = 34 + hash2(i, 91) * 60;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 30, 6), guestM);
        body.position.set(hash2(i, 92) * W, -(floorY - 15), -d);
        g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(5, 6, 5), guestM);
        head.position.set(body.position.x, -(floorY - 35), -d);
        g.add(head);
      }
      break;
    }
    case 'trial_falls': {
      // the Frozen Falls: the waterfall he dens by is one end of a great frozen cascade down the
      // cave's back wall, buttresses of old ice in two layers, icicles off the roof, cold mist
      glowAt(W * 0.62, 120, 96, 300, 220, '#9ad8ff', 0.3, 0.25);
      // columns of old ice down the back of the cave, in two layers so they slide as the camera pans
      for (const [d, col, em] of [[92, '#2c4664', '#060e1c'], [70, '#43668c', '#0c2040']] as [number, string, string][]) {
        const m = lambert({ color: col, emissive: em });
        for (let i = 0; i < 11; i++) {
          const h = 160 + hash2(i, d) * 220, r = 9 + hash2(i, d + 1) * 16;
          const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 6), m);
          c.position.set(i * 112 + hash2(i, d + 2) * 70 + (d === 70 ? 40 : 0), -(floorY - h / 2), -d);
          g.add(c);
        }
      }
      // the cascade: stacked sheets of pale ice down the back wall behind the falls, brightest at the foot
      for (let k = 0; k < 5; k++) {
        const fall = sheet(70 + k * 26, H / 2, 30 + k * 12, 70 - k * 8, H + 60, '#c8f0ff', 0.2 - k * 0.025);
        anim.push((t) => ((fall.material as THREE.MeshBasicMaterial).opacity = 0.17 - k * 0.025 + Math.sin(t * 1.3 + k) * 0.03));
      }
      glowAt(110, floorY - 30, 70, 220, 110, '#bfe8ff', 0.5, 0.8);
      // icicles hanging off the top of the cliffs
      const iceM = lambert({ color: '#bfe8ff', emissive: '#2a5a88' });
      for (let i = 0; i < 40; i++) {
        const h = 14 + hash2(i, 51) * 40;
        const c = new THREE.Mesh(new THREE.ConeGeometry(3 + hash2(i, 52) * 4, h, 4), iceM);
        c.rotation.z = Math.PI; // point down
        c.position.set(hash2(i, 53) * W, -(3 * TILE + hash2(i, 54) * 30 + h / 2), -(40 + hash2(i, 55) * 50));
        g.add(c);
      }
      // mist rolling low over the floor
      for (let i = 0; i < 6; i++) {
        const m = glowAt(i * 220, floorY - 20, 30 + i * 8, 320, 60, '#d8f0ff', 0.18, 0.5);
        anim.push((t) => (m.position.x = ((i * 220 + t * 10) % (W + 320)) - 160));
      }
      g.add(motes(room, 60, '#e8f6ff', [10, 160], 1));
      break;
    }
    case 'trial_bones':
    case 'ht_summit': {
      // Rimecrown Summit: curtains of aurora over the lake, and the lake itself shining back
      const cols = ['#40e0a0', '#60a0ff', '#a060ff'];
      for (let i = 0; i < 6; i++) {
        const a = sheet(i * 150, 90 + (i % 2) * 30, 300 + i * 60, 260, 200, cols[i % 3], 0.16, 0.12 * (i % 2 ? 1 : -1));
        anim.push((t) => {
          (a.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(t * 0.5 + i * 1.3) * 0.07;
          a.position.x = i * 150 + Math.sin(t * 0.2 + i) * 40;
        });
      }
      const ice = new THREE.Mesh(new THREE.PlaneGeometry(W + 800, 300), waterSurfaceMaterial('#1a3a5a', '#bfe8ff'));
      ice.rotation.x = -Math.PI / 2;
      ice.position.set(W / 2, -(floorY + 1), -150);
      g.add(ice);
      anim.push((t) => ((ice.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.2));
      const iceM = lambert({ color: '#9ad8ff', emissive: '#1a4a78' });
      for (let i = 0; i < 14; i++) {
        const h = 40 + hash2(i, 71) * 90;
        const c = new THREE.Mesh(new THREE.ConeGeometry(8 + hash2(i, 72) * 12, h, 5), iceM);
        c.position.set(hash2(i, 73) * W, -(floorY - h / 2), -(60 + hash2(i, 74) * 160));
        g.add(c);
      }
      break;
    }
    case 'trial_foundry':
    case 'fg_forge':
    case 'fg_heart': {
      // the Great Forge (and the inside of the Colossus): a furnace mouth filling the back
      // wall, great cog wheels turning, and falls of molten metal
      const inside = room.def.id === 'fg_heart';
      glowAt(W * (inside ? 0.5 : 0.3), H - 150, 110, inside ? 380 : 320, 320, '#ff5a10', 0.75, 0.7);
      glowAt(W * (inside ? 0.5 : 0.3), H - 130, 100, 160, 180, '#ffd060', 0.6, 1.5);
      const cogM = lambert({ color: '#4a3a34' });
      const cog = (x: number, y: number, r: number, d: number, speed: number) => {
        const grp = new THREE.Group();
        grp.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.16, 5, 24), cogM));
        for (let k = 0; k < 12; k++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(r * 0.26, r * 0.3, r * 0.2), cogM);
          const a = (k * Math.PI) / 6;
          tooth.position.set(Math.cos(a) * r * 1.16, Math.sin(a) * r * 1.16, 0);
          tooth.rotation.z = a + Math.PI / 2;
          grp.add(tooth);
        }
        for (let k = 0; k < 3; k++) {
          const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 2, r * 0.12, r * 0.1), cogM);
          sp.rotation.z = (k * Math.PI) / 3;
          grp.add(sp);
        }
        grp.position.set(x, -y, -d);
        g.add(grp);
        anim.push((t) => (grp.rotation.z = t * speed));
      };
      cog(W * 0.12, 120, 70, 90, 0.25);
      cog(W * 0.12 + 108, 190, 42, 86, -0.42);
      cog(W * 0.9, 90, 56, 80, 0.3);
      if (inside) cog(W * 0.5, 60, 90, 120, -0.15);
      for (const x of inside ? [40, W - 40] : [W * 0.52, W * 0.94]) {
        const fall = sheet(x, H / 2, 70, 14, H, '#ff9a20', 0.5);
        anim.push((t) => ((fall.material as THREE.MeshBasicMaterial).opacity = 0.42 + Math.sin(t * 9 + x) * 0.1));
        glowAt(x, H - 30, 60, 110, 70, '#ff7a20', 0.6, 3);
      }
      break;
    }
    case 'mv_heart': {
      // the Mirror Heart's hall: sheets of glass hanging at many depths, each catching the
      // light as the camera passes, shafts of violet light, and a slow snow of glitter
      for (let i = 0; i < 22; i++) {
        const d = 20 + hash2(i, 61) * 170, w = 30 + hash2(i, 62) * 70, h = 60 + hash2(i, 63) * 120;
        const m = sheet(hash2(i, 64) * (W + 200) - 100, 40 + hash2(i, 65) * 130, d, w, h, i % 3 ? '#b8a0ff' : '#a0e0ff', 0.1, (hash2(i, 66) - 0.5) * 0.9);
        anim.push((t, cx) => {
          // a glint as it lines up with the middle of the view
          const off = Math.abs(m.position.x - (cx + VW / 2)) / 220;
          (m.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.max(0, 0.22 - off * 0.2) + Math.sin(t * 0.8 + i) * 0.02;
          m.rotation.z += 0.0006 * (i % 2 ? 1 : -1);
        });
      }
      for (let i = 0; i < 7; i++) {
        const sh = sheet(40 + i * 120, H / 2, 26 + i * 10, 34, H * 1.5, '#c8a8ff', 0.08, -0.3);
        anim.push((t) => ((sh.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t * 0.5 + i * 0.9) * 0.04));
      }
      glowAt(W / 2, H / 2, 150, W, H * 1.4, '#7a50ff', 0.35, 0.4);
      g.add(motes(room, 90, '#ffffff', [6, 120], 1));
      break;
    }
    case 'ar_forbidden': {
      // the Forbidden Section: a tall lancet window behind the gallery, lamplight in shafts,
      // and loose pages turning in the air at every depth
      glowAt(W / 2, 110, 130, 150, 260, '#ffd890', 0.6, 0.3);
      for (let k = -1; k <= 1; k++) sheet(W / 2 + k * 40, 110, 128, 6, 230, '#3a2a18', 0.9, 0, false);
      for (let i = 0; i < 5; i++) {
        const sh = sheet(W / 2 - 160 + i * 80, H / 2, 40 + i * 12, 30, H * 1.3, '#ffe0a0', 0.06, 0.18 - i * 0.09);
        anim.push((t) => ((sh.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(t * 0.4 + i) * 0.025));
      }
      for (let i = 0; i < 40; i++) {
        const d = 10 + hash2(i, 81) * 150;
        const pg = sheet(hash2(i, 82) * W, hash2(i, 83) * H, d, 9, 7, '#f0e8d0', 0.75, 0, false);
        const sp = 0.3 + hash2(i, 84) * 0.6, ph = hash2(i, 85) * 6;
        const x0 = pg.position.x, y0 = pg.position.y;
        anim.push((t) => {
          pg.position.x = x0 + Math.sin(t * sp + ph) * 30;
          pg.position.y = y0 + Math.cos(t * sp * 0.7 + ph) * 18;
          pg.rotation.z = Math.sin(t * sp * 2 + ph) * 0.8;
          pg.scale.x = Math.cos(t * sp * 3 + ph); // turning over
        });
      }
      break;
    }
  }

  lights.forEach((L) => (L.l.userData.seed = L.seed));
  const update = (t: number, cx: number, cy: number) => {
    for (const a of anim) a(t, cx, cy);
    for (const L of lights) L.l.intensity = L.base * (0.85 + 0.1 * Math.sin(t * 9 + L.seed) + 0.05 * Math.sin(t * 23 + L.seed * 3));
    g.traverse((o: any) => {
      if (o.isPoints) o.material.uniforms.t.value = t;
    });
  };
  const setWaterLevel = (y: number) => {
    if (waterSurface) waterSurface.position.y = -y;
  };
  return { group: g, update, fog, bg, setWaterLevel };
}

export interface WaterFront {
  mesh: THREE.Mesh;
  update(t: number): void;
  /** Resize to a new water rectangle (used while a room drains). */
  setRect(w: { x: number; y: number; w: number; h: number }): void;
}

/** Translucent water in front of the play layer. */
export function buildWaterFront(room: Room): WaterFront | null {
  const w = room.water;
  if (!w) return null;
  // crypt water is murky green; the Aqueduct's meltwater is icy blue
  const icy = room.def.theme === 'aqueduct';
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      t: { value: 0 }, h: { value: w.h }, wd: { value: w.w },
      deep: { value: new THREE.Color(...(icy ? [0.04, 0.14, 0.3] : [0.05, 0.22, 0.2])) },
      foam: { value: new THREE.Color(...(icy ? [0.6, 0.85, 1.0] : [0.5, 0.85, 0.75])) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec2 vUv; uniform float t; uniform float h; uniform float wd; uniform vec3 deep; uniform vec3 foam;
      void main(){
        vec2 px = floor(vec2(vUv.x*wd, (1.0-vUv.y)*h));
        float surf = 2.0*sin(px.x*0.08 + t*2.0) + sin(px.x*0.21 - t*3.0);
        if (px.y < surf + 2.0) discard;
        vec3 c = deep;
        float a = 0.55;
        if (px.y < surf + 4.0) { c = foam; a = 0.8; }
        float caus = sin(px.x*0.15 + sin(px.y*0.1 + t)*2.0 + t) * sin(px.y*0.13 - t*1.3);
        if (caus > 0.85) c += vec3(0.1,0.2,0.18);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w.w, w.h), mat);
  m.position.set(w.x + w.w / 2, -(w.y + w.h / 2), 0);
  m.renderOrder = 25;
  m.frustumCulled = false;
  const h0 = w.h;
  return {
    mesh: m,
    update: (t) => (mat.uniforms.t.value = t),
    setRect: (r) => {
      // the plane was built h0 tall; scale it and keep the shader's pixel grid in step
      m.visible = r.h > 0.5; // a tidal room's water can drain away completely
      m.scale.y = Math.max(0.001, r.h / h0);
      m.position.y = -(r.y + r.h / 2);
      mat.uniforms.h.value = r.h;
    },
  };
}

export { mix };
