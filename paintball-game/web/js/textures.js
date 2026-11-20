import * as THREE from './vendor/three.module.min.js';

// Biblioteca de materiais PBR procedurais (cor + relevo + rugosidade), todos "tileáveis".
// Cada textura tem um tamanho real em metros (tile) usado para o mapeamento de UV.

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(u, v, px, py, seed) {
  const x = u * px, y = v * py;
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(mod(xi, px), mod(yi, py), seed), b = hash2(mod(xi + 1, px), mod(yi, py), seed);
  const c = hash2(mod(xi, px), mod(yi + 1, py), seed), d = hash2(mod(xi + 1, px), mod(yi + 1, py), seed);
  const s = xf * xf * (3 - 2 * xf), t = yf * yf * (3 - 2 * yf);
  return a + (b - a) * s + (c - a) * t + (a - b - c + d) * s * t;
}
function fbm(u, v, px, py, oct, seed) {
  let s = 0, a = 0.5, nx = px, ny = py, norm = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(u, v, nx, ny, seed + i * 7); norm += a; a *= 0.5; nx *= 2; ny *= 2; }
  return s / norm;
}

// ---------------------------------------------------------------------------
// Geradores: devolvem { c:[r,g,b] 0..255, h: altura 0..1, r: rugosidade 0..1 }
// ---------------------------------------------------------------------------
const GEN = {
  tile: 0.9,
  brick(u, v, p) {
    const rows = p.rows || 8, cols = p.cols || 4, off = p.offset ?? 0.5;
    const y = v * rows, row = Math.floor(y), fy = y - row;
    const x = u * cols + (row & 1) * off, col = Math.floor(x), fx = x - col;
    const mortar = Math.min(fy, 1 - fy) < (p.mortarY || 0.09) || Math.min(fx, 1 - fx) < (p.mortarX || 0.045);
    const n = fbm(u, v, 4, 4, 11, 3), bv = hash2(mod(col, cols), row, 7);
    const grime = smooth(0.35, 0.8, fbm(u, v, 3, 2, 4, 23));
    let c, h;
    if (mortar) { const k = 0.8 + 0.4 * n; c = [160 * k, 154 * k, 142 * k]; h = 0.12; }
    else {
      const base = p.color || [176, 88, 58], k = 0.72 + 0.5 * bv + 0.3 * (n - 0.5);
      c = [base[0] * k, base[1] * k * (0.94 + 0.12 * bv), base[2] * k * (0.92 + 0.16 * n)];
      const e = Math.min(Math.min(fy, 1 - fy) * 6, Math.min(fx, 1 - fx) * 9, 1);
      h = 0.55 + 0.25 * n + 0.2 * e;
    }
    const g = 1 - 0.38 * grime;
    return { c: [c[0] * g, c[1] * g, c[2] * g], h, r: mortar ? 0.95 : 0.82 };
  },
  plaster(u, v, p) {
    const base = p.color || [232, 230, 222];
    const n1 = fbm(u, v, 3, 3, 5, 31), streak = fbm(u, v, 7, 2, 3, 41), pores = vnoise(u, v, 64, 64, 9);
    const peelN = fbm(u, v, 3, 3, 4, 51), peel = smooth(0.6, 0.66, peelN);
    const mold = smooth(0.5, 0.85, fbm(u, v, 2, 2, 4, 61)) * 0.35;
    let k = 0.82 + 0.3 * n1 - 0.2 * streak * 0.8 + (pores - 0.5) * 0.07;
    let c = [base[0] * k, base[1] * k, base[2] * k];
    c = [c[0] * (1 - mold * 0.5), c[1] * (1 - mold * 0.35), c[2] * (1 - mold * 0.6)];
    const under = [152 + 20 * n1, 144 + 18 * n1, 130 + 16 * n1];
    c = [mix(c[0], under[0], peel), mix(c[1], under[1], peel), mix(c[2], under[2], peel)];
    return { c, h: 0.6 + 0.2 * n1 - 0.35 * peel, r: 0.9 };
  },
  concrete(u, v, p) {
    const n = fbm(u, v, 4, 4, 6, 71), pores = vnoise(u, v, 96, 96, 13), st = fbm(u, v, 6, 2, 4, 81);
    const crack = Math.abs(fbm(u, v, 5, 5, 3, 91) - 0.5) < 0.005 ? 1 : 0;
    let k = 0.66 + 0.4 * n - 0.14 * st + (pores < 0.1 ? -0.12 : 0) - crack * 0.22;
    const t = p.tint || [1, 1, 1], b = p.base || 178;
    return { c: [b * k * t[0], b * k * t[1], b * k * t[2]], h: 0.5 + 0.3 * n - crack * 0.4, r: 0.92 };
  },
  floor(u, v, p) {
    const base = GEN.concrete(u, v, p);
    const oil = smooth(0.62, 0.72, fbm(u, v, 3, 3, 4, 101));
    const o = 1 - 0.55 * oil;
    return { c: [base.c[0] * o, base.c[1] * o * 0.98, base.c[2] * o * 0.95], h: base.h, r: mix(base.r, 0.25, oil) };
  },
  asphalt(u, v) {
    const n = fbm(u, v, 5, 5, 5, 111), sp = hash2((u * 512) | 0, (v * 512) | 0, 17);
    const crack = Math.abs(fbm(u, v, 4, 4, 3, 121) - 0.5) < 0.008 ? 1 : 0;
    const k = 0.62 + 0.5 * n + (sp > 0.93 ? 0.35 : 0) - crack * 0.35;
    const w = 52 * k;
    return { c: [w, w * 0.99, w * 0.97], h: 0.4 + 0.3 * sp, r: 0.93 };
  },
  dirt(u, v, p) {
    const n = fbm(u, v, 4, 4, 6, 131), pb = hash2((u * 256) | 0, (v * 256) | 0, 3) > 0.985 ? 0.35 : 0;
    const b = p.color || [122, 92, 64];
    const k = 0.66 + 0.55 * n + pb;
    return { c: [b[0] * k, b[1] * k, b[2] * k * 0.95], h: 0.45 + 0.4 * n, r: 1 };
  },
  grass(u, v, p) {
    const n = fbm(u, v, 5, 5, 6, 141), bl = vnoise(u, v, 128, 128, 5), blade = vnoise(u, v, 300, 90, 7);
    const dry = smooth(0.52, 0.72, fbm(u, v, 3, 3, 4, 143)), clover = smooth(0.6, 0.8, fbm(u, v, 9, 9, 3, 144));
    const b = p.color || [74, 104, 52], k = 0.58 + 0.62 * n + (bl - 0.5) * 0.35 + (blade - 0.5) * 0.3;
    const g = [b[0] * k, b[1] * k, b[2] * k * 0.9];
    return { c: [mix(mix(g[0], 150 * k, dry * 0.32), g[0] * 0.8, clover * 0.5), mix(mix(g[1], 132 * k, dry * 0.32), g[1] * 1.08, clover * 0.5), mix(g[2], 70 * k, dry * 0.32)], h: 0.35 + 0.55 * blade, r: 0.95 };
  },
  carpaint(u, v, p) {
    const wear = p.wear || 0, b = p.color || [205, 208, 208];
    const n = fbm(u, v, 3, 3, 4, 171), g = fbm(u, v, 12, 12, 4, 172), streak = vnoise(u, v, 260, 10, 7);
    let k = 0.93 + 0.14 * (n - 0.5) + 0.06 * (g - 0.5);
    k *= 1 - smooth(0.45, 1.0, v) * (0.16 + 0.12 * wear);                       // sujeira embaixo
    let c = [b[0] * k * 1.08, b[1] * k * 1.08, b[2] * k * 1.08], h = 0.5 + 0.12 * (g - 0.5), r = 0.34 + 0.2 * wear;
    if (streak > 0.94) c = [c[0] * 1.18, c[1] * 1.18, c[2] * 1.18];             // riscos
    const ru = wear > 0 ? smooth(0.66 - 0.05 * wear, 0.84 - 0.05 * wear, fbm(u, v, 5, 5, 5, 173) * 0.8 + 0.4 * smooth(0.55, 1, v)) : 0;
    if (ru > 0) { const rc = [150 + 40 * g, 74 + 24 * g, 38 + 14 * g]; c = [mix(c[0], rc[0], ru), mix(c[1], rc[1], ru), mix(c[2], rc[2], ru)]; h = mix(h, 0.7 + 0.3 * g, ru); r = mix(r, 0.92, ru); }
    if (wear >= 2) {                                                              // carbonizado
      const ash = fbm(u, v, 6, 6, 4, 174), bk = 28 + 34 * ash;
      c = [mix(bk, 140 + 40 * g, ru * 0.55), mix(bk * 0.95, 70 + 24 * g, ru * 0.55), mix(bk * 0.9, 34 + 14 * g, ru * 0.55)]; r = 0.85; h = 0.4 + 0.4 * ash;
    }
    return { c, h, r };
  },
  corrugated(u, v, p) {
    const color = p.color || [130, 150, 160], ridges = p.ridges || 10;
    const ridge = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * ridges);
    const rm = fbm(u, v, 3, 3, 5, 151) * 0.7 + fbm(u, v, 10, 2, 3, 152) * 0.45;
    const rust = smooth((p.rust ?? 0.5) + 0.1, (p.rust ?? 0.5) + 0.26, rm);
    const n = fbm(u, v, 8, 8, 4, 153), shade = 0.62 + 0.38 * ridge;
    const paint = [color[0] * shade, color[1] * shade, color[2] * shade];
    const rc = [(135 + 50 * n) * (0.55 + 0.45 * ridge), (68 + 34 * n) * (0.55 + 0.45 * ridge), (34 + 18 * n) * (0.6 + 0.4 * ridge)];
    return { c: [mix(paint[0], rc[0], rust), mix(paint[1], rc[1], rust), mix(paint[2], rc[2], rust)], h: 0.35 + 0.6 * ridge, r: mix(0.42, 0.92, rust) };
  },
  rust(u, v, p) {
    const n = fbm(u, v, 5, 5, 6, 161), m = fbm(u, v, 3, 3, 4, 162), big = fbm(u, v, 3, 3, 3, 163);
    const color = p.color || null;
    const seam = (Math.abs(u - 0.5) < 0.004 || Math.abs(v - 0.5) < 0.004) ? 0.55 : 1;
    const rustC = [(118 + 60 * n) * seam, (62 + 34 * n) * seam, (34 + 18 * n) * seam];
    let c = rustC;
    if (color) {
      const rustK = smooth(0.56, 0.7, big) * 0.9 + smooth(0.62, 0.8, m) * 0.25;
      const dirt = 0.72 + 0.4 * n;
      const pc = [color[0] * dirt, color[1] * dirt, color[2] * dirt];
      c = [mix(pc[0], rustC[0], rustK), mix(pc[1], rustC[1], rustK), mix(pc[2], rustC[2], rustK)];
    }
    return { c, h: 0.4 + 0.5 * n, r: 0.82 };
  },
  wood(u, v, p) {
    const planks = p.planks || 5, pi = Math.floor(u * planks), fu = u * planks - pi;
    const w = fbm(u, v, 2, 12, 3, 171 + pi), grain = 0.5 + 0.5 * Math.sin(v * 70 + w * 9 + pi * 2.3);
    const gap = Math.min(fu, 1 - fu) < 0.04 ? 0.35 : 1;
    const b = p.color || [150, 108, 66], k = (0.62 + 0.28 * grain + 0.25 * fbm(u, v, 6, 6, 4, 181)) * gap * (0.85 + 0.3 * hash2(pi, 0, 5));
    return { c: [b[0] * k, b[1] * k, b[2] * k], h: 0.5 + 0.2 * grain * gap, r: 0.8 };
  },
  pavers(u, v, p) {
    return GEN.brick(u, v, { rows: p.rows || 10, cols: p.cols || 5, offset: 0.5, color: p.color || [128, 126, 120], mortarX: 0.05, mortarY: 0.08 });
  },
};
const TILE = { carpaint: 1.5, brick: 0.9, plaster: 2.5, concrete: 3, floor: 6, asphalt: 5, dirt: 6, grass: 5, corrugated: 2, rust: 2, wood: 1.2, pavers: 1.6 };

const cache = new Map();
let QUALITY = 512;
export function setTextureQuality(q) { QUALITY = q === 'low' ? 256 : 512; }

function canvas(S) { const c = document.createElement('canvas'); c.width = c.height = S; return c; }

// Geração PROGRESSIVA: a textura nasce como um quadradinho cinza e é pintada aos poucos (alguns ms por quadro),
// então trocar de campo não congela o navegador. tickTextures() é chamado a cada quadro pelo loop principal.
const jobs = [];
const solid = (v) => { const c = canvas(2), g = c.getContext('2d'); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, 0, 2, 2); return c; };
export function tickTextures(budgetMs = 5) {
  if (!jobs.length) return;
  const t0 = performance.now();
  while (jobs.length && performance.now() - t0 < budgetMs) {
    const j = jobs[0], S = j.S;
    const rows = Math.min(S - j.y, 8);
    for (let y = j.y; y < j.y + rows; y++) for (let x = 0; x < S; x++) {
      const o = j.gen.call(GEN, x / S, y / S, j.params), i = (y * S + x) * 4;
      j.ic.data[i] = clamp(o.c[0], 0, 255); j.ic.data[i + 1] = clamp(o.c[1], 0, 255); j.ic.data[i + 2] = clamp(o.c[2], 0, 255); j.ic.data[i + 3] = 255;
      const hv = clamp(o.h) * 255; j.ih.data[i] = j.ih.data[i + 1] = j.ih.data[i + 2] = hv; j.ih.data[i + 3] = 255;
      const rv = clamp(o.r) * 255; j.ir.data[i] = j.ir.data[i + 1] = j.ir.data[i + 2] = rv; j.ir.data[i + 3] = 255;
    }
    j.y += rows;
    if (j.y >= S) {
      jobs.shift();
      j.gc.putImageData(j.ic, 0, 0); j.gh.putImageData(j.ih, 0, 0); j.gr.putImageData(j.ir, 0, 0);
      [[j.res.map, j.cc], [j.res.bump, j.ch], [j.res.rough, j.cr]].forEach(([t, c]) => { t.dispose(); t.image = c; t.needsUpdate = true; });
      j.done = true;
    }
  }
}
export const pendingTextures = () => jobs.length;
// ao trocar de campo: descarta o que ainda não foi pintado (vai ser pedido de novo se voltarem a esse campo)
export function cancelTextureJobs() {
  for (const j of jobs) cache.delete(j.key);
  jobs.length = 0;
}
// ao trocar de campo: libera da placa de vídeo TODAS as texturas do campo anterior (sem isso a memória só cresce a cada troca)
export function purgeTextures() {
  jobs.length = 0;
  for (const r of cache.values()) { r.map.dispose(); r.bump.dispose(); r.rough.dispose(); }
  cache.clear();
  for (const v of decalCache.values()) { if (v.map) v.map.dispose(); if (v.dispose) v.dispose(); }
  decalCache.clear();
}

export function pbr(kind, params = {}) {
  const key = kind + JSON.stringify(params) + QUALITY;
  if (cache.has(key)) return cache.get(key);
  const S = params.small ? Math.min(QUALITY, 256) : QUALITY, gen = GEN[kind];
  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = QUALITY > 256 ? 8 : 2;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const res = { map: mk(solid(135), true), bump: mk(solid(128), false), rough: mk(solid(255), false), tile: params.tile || TILE[kind] || 2 };
  const cc = canvas(S), ch = canvas(S), cr = canvas(S);
  const gc = cc.getContext('2d'), gh = ch.getContext('2d'), gr = cr.getContext('2d');
  jobs.push({ key, S, gen, params, res, y: 0, cc, ch, cr, gc, gh, gr, ic: gc.createImageData(S, S), ih: gh.createImageData(S, S), ir: gr.createImageData(S, S) });
  cache.set(key, res);
  return res;
}

// material PBR a partir de um gerador. tint multiplica a cor (útil para pintar paredes).
export function material(kind, params = {}, opts = {}) {
  const t = pbr(kind, params);
  const m = new THREE.MeshStandardMaterial({
    map: t.map, bumpMap: t.bump, bumpScale: opts.bump ?? 1.2, roughnessMap: t.rough, roughness: 1,
    metalness: opts.metal ?? 0, color: opts.tint ?? 0xffffff, side: opts.side ?? THREE.FrontSide,
  });
  m.userData.tile = t.tile;
  return m;
}

// Mapeamento "triplanar em metros" para BoxGeometry: UV = posição / tamanho do tile.
export function boxGeo(w, h, d, tile = 2, jitter = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  const ox = jitter * 7.3, oy = jitter * 3.1;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    let a, b;
    if (ax > 0.5) { a = p.getZ(i); b = p.getY(i); } else if (ay > 0.5) { a = p.getX(i); b = p.getZ(i); } else { a = p.getX(i); b = p.getY(i); }
    uv.setXY(i, a / tile + ox, -b / tile + oy);
  }
  return g;
}
export function planeGeo(w, h, tile = 2) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  return g;
}

// ---------------------------------------------------------------------------
// Decalques desenhados (grafites, janelas quebradas, manchas, faixas)
// ---------------------------------------------------------------------------
const decalCache = new Map();
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export function decalMaterial(kind, seed = 0, extra = {}) {
  const key = kind + seed + JSON.stringify(extra);
  if (decalCache.has(key)) return decalCache.get(key);
  const DS = QUALITY > 256 ? 512 : 256, c = canvas(DS), g = c.getContext('2d');
  g.scale(DS / 512, DS / 512);
  let s = seed * 9301 + 49297;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  if (kind === 'grafite') drawGraffiti(g, r, extra);
  else if (kind === 'janela') drawWindow(g, r, extra);
  else if (kind === 'porta') drawDoor(g, r, extra);
  else if (kind === 'mancha') drawStain(g, r);
  const m = new THREE.MeshStandardMaterial({
    map: tex(c), transparent: true, roughness: 0.85, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  decalCache.set(key, m);
  return m;
}

function drawGraffiti(g, r, { word } = {}) {
  const words = ['PAZ', 'AMOR', 'ARTE', 'VIDA', 'FÉ', 'LUZ', 'SAMBA', 'FUTEBOL'];
  const palettes = [['#ffd23f', '#ee4266', '#3bceac'], ['#00c2ff', '#ff6b35', '#fff'], ['#9b5de5', '#f15bb5', '#fee440'], ['#00f5d4', '#ff9f1c', '#fff']];
  const pal = palettes[Math.floor(r() * palettes.length)];
  g.clearRect(0, 0, 512, 512);
  g.save(); g.translate(256, 256); g.rotate((r() - 0.5) * 0.18);
  const text = word || words[Math.floor(r() * words.length)];
  g.font = '900 190px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(text).width; if (tw > 400) g.font = `900 ${Math.floor((190 * 400) / tw)}px Impact, "Arial Black", sans-serif`;
  g.lineJoin = 'round';
  g.lineWidth = 34; g.strokeStyle = '#111'; g.strokeText(text, 0, 0);
  const grad = g.createLinearGradient(-200, -80, 200, 80); grad.addColorStop(0, pal[0]); grad.addColorStop(0.55, pal[1]); grad.addColorStop(1, pal[2]);
  g.fillStyle = grad; g.fillText(text, 0, 0);
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText(text, -3, -4);
  // brilhos e pingos
  g.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc((r() - 0.5) * 340, (r() - 0.5) * 110, 4 + r() * 6, 0, 7); g.fill(); }
  for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 330; g.strokeStyle = pal[i % 3]; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 70 + r() * 70); g.stroke(); }
  g.restore();
  // estrela
  g.fillStyle = pal[0]; g.strokeStyle = '#111'; g.lineWidth = 8;
  g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 22 : 48; g.lineTo(80 + Math.cos(a) * rr, 90 + Math.sin(a) * rr); } g.closePath(); g.stroke(); g.fill();
}
function drawWindow(g, r, { broken = true, color = '#1b2127' } = {}) {
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = '#2a2d31'; g.fillRect(40, 20, 432, 472);
  g.fillStyle = color; g.fillRect(64, 44, 384, 424);
  const sky = g.createLinearGradient(0, 44, 0, 468); sky.addColorStop(0, 'rgba(120,150,175,.55)'); sky.addColorStop(1, 'rgba(20,28,36,.2)');
  g.fillStyle = sky; g.fillRect(64, 44, 384, 424);
  g.strokeStyle = '#2a2d31'; g.lineWidth = 12; g.beginPath(); g.moveTo(256, 44); g.lineTo(256, 468); g.moveTo(64, 256); g.lineTo(448, 256); g.stroke();
  if (broken) {
    g.strokeStyle = 'rgba(210,225,235,.8)'; g.lineWidth = 2;
    const cx = 120 + r() * 260, cy = 90 + r() * 300;
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, l = 60 + r() * 150; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); }
    g.fillStyle = '#0b0d10'; g.beginPath(); g.moveTo(cx - 30, cy - 10); g.lineTo(cx + 40, cy - 40); g.lineTo(cx + 50, cy + 30); g.lineTo(cx - 10, cy + 50); g.closePath(); g.fill();
  }
  // tábuas
  if (r() > 0.55) { g.fillStyle = '#7a5a3a'; g.save(); g.translate(256, 256); g.rotate(-0.12); g.fillRect(-250, -26, 500, 52); g.fillStyle = '#5b422a'; g.fillRect(-250, -26, 500, 6); g.restore(); }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(40, 492, 432, 14);
}
function drawDoor(g, r, { color = '#6b4a2d' } = {}) {
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = '#25282c'; g.fillRect(70, 10, 372, 502);
  g.fillStyle = color; g.fillRect(92, 32, 328, 480);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4;
  for (let x = 92; x < 420; x += 55) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x, 512); g.stroke(); }
  g.fillStyle = '#c9a13a'; g.beginPath(); g.arc(380, 290, 12, 0, 7); g.fill();
}
function drawStain(g, r) {
  g.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    const x = 256 + (r() - 0.5) * 300, y = 200 + (r() - 0.5) * 220, rad = 20 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(20,16,10,.28)'); gr.addColorStop(1, 'rgba(20,16,10,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  for (let i = 0; i < 10; i++) { const x = 90 + r() * 330; g.fillStyle = 'rgba(20,16,10,.22)'; g.fillRect(x, 200, 3 + r() * 5, 120 + r() * 180); }
}

// textura de luz volumétrica (raios de sol): degradê que some nas bordas
export function shaftTexture() {
  if (decalCache.has('shaft')) return decalCache.get('shaft');
  const c = canvas(128), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  decalCache.set('shaft', t);
  return t;
}
export function hashRand(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
