import * as THREE from './vendor/three.module.min.js';
import { MAPS } from './maps.js';
import { setTextureQuality } from './textures.js';

export const ARENA = { hx: 20, hz: 30 };
export const TEAM_PAINT = [0xff8a00, 0x00b4ff]; // 0 = equipe do jogador, 1 = adversária (mutável: paletas)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function splatCanvas(big = false) {
  const s = 128, c = makeCanvas(s, s), g = c.getContext('2d');
  g.translate(64, 64); g.fillStyle = '#fff'; g.beginPath();
  const n = 30, phase = Math.random() * 6;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (big ? 30 : 17) + Math.sin(a * 3 + phase) * 5 + Math.sin(a * 7 + phase * 2) * 3 + rand(-1.5, 1.5);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.fill();
  const drops = big ? 6 : 12;
  for (let k = 0; k < drops; k++) {
    const a = rand(0, Math.PI * 2), dist = rand(big ? 36 : 24, 58), r = rand(2, big ? 5 : 7);
    g.beginPath(); g.arc(Math.cos(a) * dist, Math.sin(a) * dist, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = r * 0.7; g.strokeStyle = '#fff'; g.beginPath();
    g.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); g.lineTo(Math.cos(a) * dist, Math.sin(a) * dist); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- interseções de segmento (p0 + d*t, t em [0,1]) ----------
export function segSphere(p0, d, c, r) {
  const ox = p0.x - c.x, oy = p0.y - c.y, oz = p0.z - c.z;
  const a = d.x * d.x + d.y * d.y + d.z * d.z;
  const b = 2 * (ox * d.x + oy * d.y + oz * d.z);
  const k = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - 4 * a * k;
  if (disc < 0 || a < 1e-12) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}

export function segCyl(p0, d, cx, cz, r, y0, y1) {
  let best = null;
  const ox = p0.x - cx, oz = p0.z - cz;
  const a = d.x * d.x + d.z * d.z;
  if (a > 1e-12) {
    const b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t >= 0 && t <= 1) {
        const y = p0.y + d.y * t;
        if (y >= y0 && y <= y1) best = { t, nx: (ox + d.x * t) / r, ny: 0, nz: (oz + d.z * t) / r };
      }
    }
  }
  if (d.y < 0 && p0.y > y1) {
    const t = (y1 - p0.y) / d.y;
    if (t >= 0 && t <= 1 && (!best || t < best.t)) {
      const x = ox + d.x * t, z = oz + d.z * t;
      if (x * x + z * z <= r * r) best = { t, nx: 0, ny: 1, nz: 0 };
    }
  }
  return best;
}

function segBox(p0, d, min, max) {
  let tmin = 0, tmax = 1, nx = 0, ny = 0, nz = 0;
  const o = [p0.x, p0.y, p0.z], dd = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-9) { if (o[i] < min[i] || o[i] > max[i]) return null; }
    else {
      let t1 = (min[i] - o[i]) / dd[i], t2 = (max[i] - o[i]) / dd[i], s = -1;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
      if (t1 > tmin) { tmin = t1; nx = ny = nz = 0; if (i === 0) nx = s; else if (i === 1) ny = s; else nz = s; }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return { t: tmin, nx, ny, nz };
}

function skyMaterial(cfg) {
  const c = (h) => new THREE.Color(h);
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: c(cfg.top) }, horizon: { value: c(cfg.horizon) }, ground: { value: c(cfg.ground) },
      sunDir: { value: new THREE.Vector3(...(cfg.sunDir || [0, 1, 0])).normalize() }, sunColor: { value: c(cfg.sunColor || 0xffffff) },
      sunSize: { value: cfg.sunSize ?? 1 },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `varying vec3 vP; uniform vec3 top, horizon, ground, sunDir, sunColor; uniform float sunSize;
      void main(){ vec3 d = normalize(vP); float h = d.y;
        vec3 c = mix(horizon, top, pow(clamp(h,0.0,1.0),0.5));
        c = mix(c, ground, clamp(-h*5.0,0.0,1.0));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 600.0/sunSize) * 3.0 + pow(s, 12.0) * 0.28);
        gl_FragColor = vec4(c,1.0);} `,
  });
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    // materiais/texturas ficam em cache (reaproveitados ao voltar ao mapa)
  });
}

// ---------------------------------------------------------------------------
export function createWorld(scene, renderer, quality = 'high') {
  const hi = quality === 'high';
  setTextureQuality(quality);
  const pmrem = new THREE.PMREMGenerator(renderer);

  // respingos (decals) — persistentes entre mapas
  const variants = [0, 1, 2, 3].map((i) => splatCanvas(i === 3));
  const splatMats = [];
  const buildSplatMats = () => {
    splatMats.length = 0;
    TEAM_PAINT.forEach((c) => splatMats.push(variants.map((tex) => new THREE.MeshStandardMaterial({
      map: tex, color: c, emissive: c, emissiveIntensity: 0.18, roughness: 0.3, metalness: 0,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }))));
  };
  buildSplatMats();
  const splatGeo = new THREE.PlaneGeometry(1, 1);
  const MAX_SPLATS = hi ? 420 : 220;
  const splats = [];
  for (let i = 0; i < MAX_SPLATS; i++) {
    const m = new THREE.Mesh(splatGeo, splatMats[0][0]);
    m.visible = false; scene.add(m); splats.push(m);
  }
  let splatI = 0;
  const Z = new THREE.Vector3(0, 0, 1);

  let group = null, envTarget = null;
  const world = {
    obstacles: [], coverSpots: [], map: null, splatMats,
    splatMaterial: (team, v) => splatMats[team][v % 4],
    recolor() { // chamado ao trocar a paleta de tinta
      TEAM_PAINT.forEach((c, t) => splatMats[t].forEach((m) => { m.color.set(c); m.emissive.set(c); }));
    },
    addSplat(point, normal, team, size = 0.7) {
      const m = splats[splatI++ % MAX_SPLATS];
      m.material = splatMats[team][Math.floor(Math.random() * 3)];
      m.position.copy(point).addScaledVector(normal, 0.012 + (splatI % 7) * 0.0006);
      m.quaternion.setFromUnitVectors(Z, normal);
      m.rotateZ(Math.random() * Math.PI * 2);
      m.scale.setScalar(size);
      m.visible = true;
    },
    clearSplats() { splats.forEach((m) => { m.visible = false; }); },

    loadMap(id) {
      const def = MAPS[id] || MAPS.arena;
      if (group) { scene.remove(group); disposeGroup(group); }
      group = new THREE.Group();
      scene.add(group);
      const obstacles = [];
      const cfg = def.build({ group, obstacles, quality, ARENA, THREE });
      // luz
      scene.fog = new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far);
      scene.background = null;
      const hemi = new THREE.HemisphereLight(cfg.hemi.sky, cfg.hemi.ground, cfg.hemi.intensity);
      group.add(hemi);
      const sun = new THREE.DirectionalLight(cfg.sun.color, cfg.sun.intensity);
      sun.position.set(...cfg.sun.dir);
      sun.castShadow = true;
      const ss = sun.shadow;
      ss.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
      ss.camera.left = -42; ss.camera.right = 42; ss.camera.top = 42; ss.camera.bottom = -42;
      ss.camera.near = 5; ss.camera.far = 150; ss.bias = -0.0004; ss.normalBias = 0.04;
      group.add(sun);
      (cfg.lights || []).forEach((l) => {
        const p = new THREE.PointLight(l.color, l.intensity, l.distance, 1.6);
        p.position.set(...l.pos); group.add(p);
      });
      // céu + reflexos de ambiente (PMREM)
      const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMaterial({ ...cfg.sky, sunDir: cfg.sun.dir, sunColor: cfg.sun.color }));
      group.add(sky);
      const envScene = new THREE.Scene();
      envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), skyMaterial({ ...cfg.sky, sunDir: cfg.sun.dir, sunColor: cfg.sun.color })));
      if (envTarget) envTarget.dispose();
      envTarget = pmrem.fromScene(envScene, 0.02);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = cfg.envIntensity ?? 0.6;
      renderer.toneMappingExposure = cfg.exposure ?? 1.05;

      // pontos de cobertura para os bots
      const inside = (x, z, m) => obstacles.some((o) => (o.type === 'cyl'
        ? Math.hypot(x - o.x, z - o.z) < o.r + m
        : Math.abs(x - o.x) < o.w / 2 + m && Math.abs(z - o.z) < o.d / 2 + m));
      const coverSpots = [];
      obstacles.forEach((o) => {
        if (o.h < 0.9) return;
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
          let reach = o.type === 'cyl' ? o.r : Math.min(o.w / 2 / Math.max(Math.abs(dx), 1e-3), o.d / 2 / Math.max(Math.abs(dz), 1e-3));
          reach += 0.6;
          const x = o.x + dx * reach, z = o.z + dz * reach;
          if (Math.abs(x) < ARENA.hx - 1.5 && Math.abs(z) < ARENA.hz - 1.5 && !inside(x, z, 0.45)) coverSpots.push({ x, z });
        }
      });
      this.obstacles = obstacles;
      this.coverSpots = coverSpots;
      this.map = { id, name: def.name, tag: def.tag, blurb: def.blurb, menu: def.menu, indoor: !!cfg.indoor };
      this.clearSplats();
      return this.map;
    },

    // primeiro obstáculo/chão no segmento p0->p1 (ou null)
    segHit(p0, p1, withGround = true) {
      const d = new THREE.Vector3().subVectors(p1, p0);
      let best = null;
      const min = [0, 0, 0], max = [0, 0, 0];
      for (const o of this.obstacles) {
        let h = null;
        if (o.type === 'cyl') h = segCyl(p0, d, o.x, o.z, o.r, 0, o.h);
        else {
          min[0] = o.x - o.w / 2; min[1] = 0; min[2] = o.z - o.d / 2;
          max[0] = o.x + o.w / 2; max[1] = o.h; max[2] = o.z + o.d / 2;
          h = segBox(p0, d, min, max);
        }
        if (h && (!best || h.t < best.t)) best = h;
      }
      if (withGround && p0.y > 0 && p1.y <= 0) {
        const t = p0.y / (p0.y - p1.y);
        if (!best || t < best.t) best = { t, nx: 0, ny: 1, nz: 0 };
      }
      if (!best) return null;
      return {
        t: best.t,
        point: new THREE.Vector3().copy(p0).addScaledVector(d, best.t),
        normal: new THREE.Vector3(best.nx, best.ny, best.nz),
      };
    },
    collide(p, r) {
      for (const o of this.obstacles) {
        if (o.type === 'cyl') {
          const dx = p.x - o.x, dz = p.z - o.z, dist = Math.hypot(dx, dz), min = o.r + r;
          if (dist < min) {
            const k = dist < 1e-4 ? 0 : 1 / dist;
            p.x = o.x + (dist < 1e-4 ? min : dx * k * min);
            p.z = o.z + (dist < 1e-4 ? 0 : dz * k * min);
          }
        } else {
          const hx = o.w / 2, hz = o.d / 2;
          const cx = clamp(p.x, o.x - hx, o.x + hx), cz = clamp(p.z, o.z - hz, o.z + hz);
          const dx = p.x - cx, dz = p.z - cz, dist = Math.hypot(dx, dz);
          if (dist < r) {
            if (dist > 1e-4) { p.x = cx + (dx / dist) * r; p.z = cz + (dz / dist) * r; }
            else {
              const px = hx - Math.abs(p.x - o.x), pz = hz - Math.abs(p.z - o.z);
              if (px < pz) p.x = o.x + Math.sign(p.x - o.x || 1) * (hx + r);
              else p.z = o.z + Math.sign(p.z - o.z || 1) * (hz + r);
            }
          }
        }
      }
      p.x = clamp(p.x, -ARENA.hx + r, ARENA.hx - r);
      p.z = clamp(p.z, -ARENA.hz + r, ARENA.hz - r);
    },
  };
  return world;
}
