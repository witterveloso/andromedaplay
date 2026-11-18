import * as THREE from './vendor/three.module.min.js';
import { material, boxGeo, planeGeo, decalMaterial, shaftTexture, hashRand } from './textures.js';

const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------------
// utilitários compartilhados pelos mapas
// ---------------------------------------------------------------------------
function helpers({ group, obstacles, quality }) {
  const hi = quality === 'high';
  const mats = new Map();
  const M = (kind, params = {}, opts = {}) => {
    const k = kind + JSON.stringify(params) + JSON.stringify(opts);
    if (!mats.has(k)) mats.set(k, material(kind, params, opts));
    return mats.get(k);
  };
  const rnd = hashRand(11);
  const add = (mesh, shadow = true, receive = true) => { mesh.castShadow = shadow; mesh.receiveShadow = receive; group.add(mesh); return mesh; };

  function box({ x, z, w, d, h, y = 0, mat, collide = true, shadow = true }) {
    const m = new THREE.Mesh(boxGeo(w, h, d, mat.userData.tile || 2, rnd()), mat);
    m.position.set(x, y + h / 2, z);
    add(m, shadow);
    if (collide) obstacles.push({ type: 'box', x, z, w, d, h: y + h });
    return m;
  }
  function cylGeo(rt, rb, h, seg, tile) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg), uv = g.attributes.uv, c = 2 * PI * Math.max(rt, rb);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * c) / tile, (uv.getY(i) * h) / tile);
    return g;
  }
  function cyl({ x, z, r, h, y = 0, rt, mat, collide = true, seg = 20, shadow = true }) {
    const m = new THREE.Mesh(cylGeo(rt ?? r, r, h, seg, mat.userData.tile || 2), mat);
    m.position.set(x, y + h / 2, z);
    add(m, shadow);
    if (collide) obstacles.push({ type: 'cyl', x, z, r, h: y + h });
    return m;
  }
  function ground(mat, w, d, y = 0) {
    const m = new THREE.Mesh(planeGeo(w, d, mat.userData.tile || 4), mat);
    m.rotation.x = -PI / 2; m.position.y = y; m.receiveShadow = true; group.add(m);
    return m;
  }

  // decalques instanciados (janelas, portas, grafites…)
  const buckets = new Map();
  const ROT = { '+z': 0, '-z': PI, '+x': PI / 2, '-x': -PI / 2 };
  function decal(kind, variant, face, x, y, z, w, h, extra) {
    const key = `${kind}|${variant}|${JSON.stringify(extra || {})}`;
    if (!buckets.has(key)) buckets.set(key, { kind, variant, extra, list: [] });
    buckets.get(key).list.push([face, x, y, z, w, h]);
  }
  // linhas finas (fios elétricos)
  const wireV = [];
  function wire(a, b, sag = 0.7) {
    const n = 8;
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * PI) * sag, a[2] + (b[2] - a[2]) * t];
      if (prev) wireV.push(...prev, ...p);
      prev = p;
    }
  }
  // bandeirinhas (triângulos coloridos)
  const flagV = [], flagC = [];
  const FLAGC = [[0.95, 0.25, 0.25], [0.98, 0.8, 0.15], [0.2, 0.7, 0.95], [0.3, 0.8, 0.35], [0.95, 0.5, 0.15], [0.85, 0.35, 0.8]];
  function bunting(a, b, sag = 0.6) {
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(4, Math.round(len / 0.55));
    wire(a, b, sag);
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.15) / n, t1 = (i + 0.85) / n, tm = (t0 + t1) / 2;
      const P = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * PI) * sag, a[2] + (b[2] - a[2]) * t];
      const p0 = P(t0), p1 = P(t1), pm = P(tm);
      flagV.push(...p0, ...p1, pm[0], pm[1] - 0.38, pm[2]);
      const c = FLAGC[i % FLAGC.length];
      for (let k = 0; k < 3; k++) flagC.push(...c);
    }
  }
  function flush() {
    const g = new THREE.PlaneGeometry(1, 1), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    for (const b of buckets.values()) {
      const im = new THREE.InstancedMesh(g, decalMaterial(b.kind, b.variant, b.extra), b.list.length);
      b.list.forEach(([f, x, y, z, w, h], i) => { q.setFromEuler(e.set(0, ROT[f], 0)); m4.compose(p.set(x, y, z), q, s.set(w, h, 1)); im.setMatrixAt(i, m4); });
      im.frustumCulled = false; group.add(im);
    }
    buckets.clear();
    if (wireV.length) {
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(wireV, 3));
      group.add(new THREE.LineSegments(g2, new THREE.LineBasicMaterial({ color: 0x15171a })));
    }
    if (flagV.length) {
      const g3 = new THREE.BufferGeometry();
      g3.setAttribute('position', new THREE.Float32BufferAttribute(flagV, 3)); g3.setAttribute('color', new THREE.Float32BufferAttribute(flagC, 3));
      g3.computeVertexNormals();
      group.add(new THREE.Mesh(g3, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    }
  }
  // bloco de fundo instanciado (morros, prédios distantes)
  function backdrop(items, mat, tint) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, items.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    items.forEach((it, i) => {
      q.setFromEuler(new THREE.Euler(0, it.ry || 0, 0));
      m4.compose(p.set(it.x, it.y + it.h / 2, it.z), q, s.set(it.w, it.h, it.d)); im.setMatrixAt(i, m4);
      im.setColorAt(i, c.set(it.color ?? 0xffffff));
    });
    im.castShadow = false; im.receiveShadow = false; group.add(im);
    return im;
  }
  return { M, rnd, add, box, cyl, ground, decal, wire, bunting, flush, backdrop, hi, group, obstacles };
}

// espelhamento por simetria central: fn(s) com s = +1 e -1 (posição*s, rotação +π se s<0)
const sym = (fn) => { fn(1); fn(-1); };

function trees(H, count, rMin, rMax, hue = [0.24, 0.32], sat = 0.45, rx = 1, rz = 1.35) {
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 5, 6), leafGeo = new THREE.IcosahedronGeometry(3.4, 1);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 1 }), count);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * PI * 2 + (H.rnd() - 0.5) * 0.1, rr = rMin + H.rnd() * (rMax - rMin), s = 0.8 + H.rnd() * 0.9;
    pos.set(Math.cos(a) * rr * rx, 2.5 * s, Math.sin(a) * rr * rz); sc.set(s, s, s);
    m4.compose(pos, q, sc); trunks.setMatrixAt(i, m4);
    pos.y = 6.2 * s; sc.set(s * (0.9 + H.rnd() * 0.3), s, s * (0.9 + H.rnd() * 0.3));
    m4.compose(pos, q, sc); leaves.setMatrixAt(i, m4);
    leaves.setColorAt(i, col.setHSL(hue[0] + H.rnd() * (hue[1] - hue[0]), sat, 0.2 + H.rnd() * 0.12));
  }
  H.group.add(trunks, leaves);
}

function fabricMaterial(color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#ececec'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(0,0,0,0.10)';
  for (let i = 0; i < 64; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ color, map: t, roughness: 0.6 });
}
function roundedBox(w, h, d, r) {
  const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4), p = g.attributes.position, v = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const inner = new THREE.Vector3(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)), dir = v.clone().sub(inner);
    if (dir.lengthSq() > 1e-9) { dir.setLength(r); v.copy(inner).add(dir); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// carro destruído (alinhado aos eixos) — alongX: comprimento no eixo X
function car(H, { x, z, alongX = false, color = [150, 60, 50], y = 0, stack = 0, tilt = 0, burnt = false, collide = true }) {
  const g = new THREE.Group();
  const body = H.M('rust', { color: burnt ? [40, 34, 30] : color }), glass = new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.2, metalness: 0.6 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
  const L = 4.4, W = 1.85;
  const mk = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  mk(boxGeo(L, 0.7, W, 1.8), body, 0, 0.55, 0);
  mk(boxGeo(2.3, 0.62, W - 0.2, 1.8), body, -0.25, 1.2, 0);
  mk(boxGeo(2.0, 0.5, W - 0.14, 1.8), glass, -0.25, 1.22, 0).scale.set(1.02, 1, 1.02);
  mk(boxGeo(0.25, 0.3, W + 0.05, 1.8), H.M('rust', { color: [90, 90, 95] }), L / 2, 0.38, 0);
  mk(boxGeo(0.25, 0.3, W + 0.05, 1.8), H.M('rust', { color: [90, 90, 95] }), -L / 2, 0.38, 0);
  const wg = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 14);
  [[1.4, 0.9], [1.4, -0.9], [-1.4, 0.9], [-1.4, -0.9]].forEach(([px, pz], i) => {
    if (H.rnd() < 0.2) return;
    const w = mk(wg, tire, px, 0.34, pz); w.rotation.x = PI / 2;
  });
  g.position.set(x, y, z);
  g.rotation.y = alongX ? 0 : PI / 2;
  g.rotation.z = tilt;
  H.group.add(g);
  const dx = alongX ? L : W, dz = alongX ? W : L;
  if (collide) H.obstacles.push({ type: 'box', x, z, w: dx, d: dz, h: y + 1.5 + stack });
  return g;
}

function barrel(H, x, z, color, collide = true) {
  H.cyl({ x, z, r: 0.3, h: 0.95, mat: H.M('rust', { color, tile: 1 }), seg: 14, collide });
}

// ===========================================================================
// MAPA 1 — ARENA SPEEDBALL (campo de torneio)
// ===========================================================================
function buildArena(ctx) {
  const H = helpers(ctx), { group } = H;
  const turf = H.M('grass', { color: [66, 104, 50], tile: 3 }, { bump: 0.6 });
  H.ground(turf, 44, 64);
  const outer = H.M('grass', { color: [70, 90, 52], tile: 6 }); outer.map.repeat.set(1, 1);
  H.ground(outer, 700, 700, -0.02);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  const mid = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.15), lineMat); mid.rotation.x = -PI / 2; mid.position.y = 0.01; group.add(mid);
  [1, -1].forEach((s, i) => {
    const st = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 2.4), new THREE.MeshStandardMaterial({ color: i ? 0x00b4ff : 0xff8a00, roughness: 0.6 }));
    st.position.set(0, 0.06, s * 28.6); st.receiveShadow = true; group.add(st);
  });
  const PAL = [0xf2c230, 0xe8eef2, 0x2c3036, 0x2f7fc9, 0xe0701f, 0xc83a3a];
  const HALF = [
    ['cyl', -8, 5.5, 0.6, 1.6], ['cyl', 8, 5.5, 0.6, 1.6], ['cyl', 0, 9.5, 0.6, 1.9], ['cyl', -14, 12, 0.6, 1.6], ['cyl', 14, 12, 0.6, 1.6],
    ['cyl', -5, 17, 0.6, 1.9], ['cyl', 5, 17, 0.6, 1.9], ['cyl', -4, 24, 0.65, 1.7], ['cyl', 4, 24, 0.65, 1.7],
    ['box', -3.5, 6, 1.8, 1.8, 1.1], ['box', 3.5, 6, 1.8, 1.8, 1.1], ['box', -10, 16, 3.2, 0.9, 1.9], ['box', 10, 16, 3.2, 0.9, 1.9],
    ['box', -17, 4, 0.9, 3, 1.9], ['box', 17, 4, 0.9, 3, 1.9], ['box', -11, 22, 1.8, 1.8, 1.1], ['box', 11, 22, 1.8, 1.8, 1.1], ['box', 0, 13.5, 2.4, 0.9, 1.9],
  ];
  const list = [['cyl', 0, 0, 0.65, 1.9]];
  HALF.forEach((o) => { list.push(o); const m = o.slice(); m[1] = -o[1]; m[2] = -o[2]; list.push(m); });
  list.forEach((o, idx) => {
    const mat = fabricMaterial(PAL[Math.floor((idx + 1) / 2) % PAL.length]);
    let mesh;
    if (o[0] === 'cyl') {
      const [, x, z, r, h] = o;
      const prof = [[r, 0], [r, h - 0.22], [r * 0.92, h - 0.08], [r * 0.7, h - 0.015], [0.001, h]].map((p) => new THREE.Vector2(p[0], p[1]));
      mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), mat); mesh.position.set(x, 0, z);
      H.obstacles.push({ type: 'cyl', x, z, r, h });
    } else {
      const [, x, z, w, d, h] = o;
      mesh = new THREE.Mesh(roundedBox(w, h, d, 0.17), mat); mesh.position.set(x, h / 2, z);
      H.obstacles.push({ type: 'box', x, z, w, d, h });
    }
    H.add(mesh);
  });
  // rede + postes
  const netC = document.createElement('canvas'); netC.width = netC.height = 64;
  const ng = netC.getContext('2d'); ng.strokeStyle = '#fff'; ng.lineWidth = 4; ng.beginPath(); ng.moveTo(0, 0); ng.lineTo(64, 64); ng.moveTo(64, 0); ng.lineTo(0, 64); ng.stroke();
  const net = new THREE.CanvasTexture(netC); net.wrapS = net.wrapT = THREE.RepeatWrapping;
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.2, 8), postMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 });
  [[0, 31, 0, 42], [0, -31, 0, 42], [21, 0, PI / 2, 62], [-21, 0, PI / 2, 62]].forEach(([x, z, ry, len]) => {
    const t = net.clone(); t.needsUpdate = true; t.repeat.set(len / 0.5, 10);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 5), new THREE.MeshBasicMaterial({ map: t, color: 0x222831, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    m.position.set(x, 2.5, z); m.rotation.y = ry; group.add(m);
    for (let i = -len / 2; i <= len / 2 + 0.01; i += 5) { const p = new THREE.Mesh(postGeo, postMat); p.position.set(x + (ry ? 0 : i), 2.6, z + (ry ? i : 0)); p.castShadow = true; group.add(p); }
  });
  trees(H, H.hi ? 90 : 45, 36, 76);
  [[-30, -44, 0.2, 0x2f6fa8], [29, 45, -0.15, 0xb4472b], [-36, 38, 0.5, 0x4d7a4a]].forEach(([x, z, ry, c]) => {
    const cont = new THREE.Mesh(new THREE.BoxGeometry(6.1, 2.6, 2.4), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.3 }));
    cont.position.set(x, 1.3, z); cont.rotation.y = ry; H.add(cont);
  });
  [[-25, -34], [25, -34], [-25, 34], [25, 34]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 12, 8), postMat); pole.position.set(x, 6, z); pole.castShadow = true; group.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.6 })); lamp.position.set(x, 12.2, z); group.add(lamp);
  });
  H.flush();
  return {
    sky: { top: 0x3b78c8, horizon: 0xcfe0f2, ground: 0x7d8a6a, sunSize: 1 },
    sun: { color: 0xfff0d8, intensity: 2.6, dir: [28, 48, 18] }, hemi: { sky: 0xcfe0ff, ground: 0x4a5d3a, intensity: 1.0 },
    fog: { color: 0xbfd2e6, near: 70, far: 260 }, exposure: 1.05, envIntensity: 0.55,
  };
}

// ===========================================================================
// MAPA 2 — GALPÃO ABANDONADO
// ===========================================================================
function buildGalpao(ctx) {
  const H = helpers(ctx), { group, M } = H;
  H.ground(M('floor', { base: 170, tint: [1, 0.98, 0.94] }, { bump: 0.8 }), 42, 62);
  const wallMat = M('corrugated', { color: [118, 134, 128], rust: 0.46, ridges: 10 }, { bump: 1.6, metal: 0.25 });
  const wallH = 11;
  [[0, 31, 42, 0.4], [0, -31, 42, 0.4], [21, 0, 0.4, 62], [-21, 0, 0.4, 62]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(boxGeo(w, wallH, d, 2), wallMat); m.position.set(x, wallH / 2, z); m.receiveShadow = true; group.add(m);
  });
  // faixa de janelas (luz do dia) e grandes portões
  const sky = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, fog: false });
  [[0, 30.78, 0], [0, -30.78, PI], [20.78, 0, -PI / 2], [-20.78, 0, PI / 2]].forEach(([x, z, ry]) => {
    const len = Math.abs(x) > 1 ? 58 : 38;
    for (let i = -len / 2 + 4; i < len / 2 - 3; i += 9) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.6), sky);
      p.position.set(x + (Math.abs(x) > 1 ? 0 : i), 9, z + (Math.abs(x) > 1 ? i : 0)); p.rotation.y = ry; p.position.x -= Math.sign(x) * 0.0; group.add(p);
      H.decal('janela', 2, ry === 0 ? '-z' : ry === PI ? '+z' : ry > 0 ? '+x' : '-x', p.position.x, 9, p.position.z, 6.2, 2.2, { broken: false });
    }
  });
  // telhado + tesouras metálicas
  const roof = new THREE.Mesh(planeGeo(42, 62, 2), M('corrugated', { color: [100, 112, 108], rust: 0.55 }, { side: THREE.DoubleSide }));
  roof.rotation.x = PI / 2; roof.position.y = wallH; group.add(roof);
  const steel = M('rust', { color: [60, 66, 70], tile: 1.5 }, { bump: 0.8, metal: 0.4 });
  for (let z = -27; z <= 27; z += 9) {
    const b = new THREE.Mesh(boxGeo(42, 0.5, 0.35, 1.5), steel); b.position.set(0, wallH - 0.4, z); group.add(b);
    for (let i = -18; i <= 18; i += 6) { const d = new THREE.Mesh(boxGeo(0.25, 2.4, 0.25, 1.5), steel); d.position.set(i, wallH - 1.6, z); d.rotation.z = (i % 12 === 0 ? 0.6 : -0.6); group.add(d); }
  }
  for (let x = -18; x <= 18; x += 9) { const b = new THREE.Mesh(boxGeo(0.4, 0.4, 62, 1.5), steel); b.position.set(x, wallH - 0.2, 0); group.add(b); }
  // claraboias + feixes de luz
  const sunDir = new THREE.Vector3(14, 40, 9).normalize();
  const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTexture(), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const lightPanel = new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false });
  const skylights = [[-8, 8], [8, -8], [-8, -16], [8, 16], [0, 0], [-8, 24], [8, -24]];
  skylights.forEach(([sx, sz]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 7), lightPanel); p.rotation.x = PI / 2; p.position.set(sx, wallH + 0.02, sz); group.add(p);
    const shift = new THREE.Vector3(-sunDir.x, 0, -sunDir.z).multiplyScalar(wallH / sunDir.y);
    [[1, 0], [0, 1]].forEach(([ax, az]) => {
      const hw = 2.2, bw = 3, g = new THREE.BufferGeometry();
      const top = new THREE.Vector3(sx, wallH, sz), bot = top.clone().add(shift).setY(0);
      const v = [top.x - ax * hw, top.y, top.z - az * hw, top.x + ax * hw, top.y, top.z + az * hw, bot.x + ax * bw, 0, bot.z + az * bw, bot.x - ax * bw, 0, bot.z - az * bw];
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
      group.add(new THREE.Mesh(g, shaftMat));
    });
  });
  // poeira no ar
  const dust = []; for (let i = 0; i < 500; i++) dust.push((H.rnd() - 0.5) * 40, H.rnd() * 10, (H.rnd() - 0.5) * 60);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dust, 3));
  group.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xfff1d0, size: 0.07, transparent: true, opacity: 0.4, depthWrite: false })));
  // manchas e marcações no piso
  const stain = decalMaterial('mancha', 3);
  [[-6, 4, 6], [9, -10, 5], [-12, -18, 7], [3, 18, 5]].forEach(([x, z, s]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), stain); m.rotation.x = -PI / 2; m.position.set(x, 0.015, z); group.add(m); });
  const yellow = new THREE.MeshBasicMaterial({ color: 0xd8b21c });
  [-14, 14].forEach((x) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 54), yellow); l.rotation.x = -PI / 2; l.position.set(x, 0.012, 0); group.add(l); });

  // cobertura (simétrica)
  const wood = M('wood', {}, { bump: 1.4 }), woodDark = M('wood', { color: [110, 80, 52] }, { bump: 1.4 });
  const metal = (c) => M('corrugated', { color: c, rust: 0.52, ridges: 8 }, { bump: 1.8, metal: 0.3 });
  const concrete = M('concrete', { base: 150 });
  H.box({ x: 0, z: 0, w: 5, d: 2.4, h: 2.8, mat: M('rust', { color: [70, 100, 120] }, { metal: 0.35 }) });
  sym((s) => {
    [[-10, 6], [10, 6], [-10, 18], [10, 18]].forEach(([x, z]) => {
      H.cyl({ x: x * s, z: z * s, r: 0.4, h: wallH, mat: concrete, seg: 18 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 18), new THREE.MeshBasicMaterial({ color: 0xd8b21c })); band.position.set(x * s, 0.5, z * s); group.add(band);
    });
    // estantes metálicas
    [[-16, 12], [16, 12]].forEach(([x, z]) => {
      H.box({ x: x * s, z: z * s, w: 1.1, d: 7, h: 2.9, mat: M('rust', { color: [58, 86, 140], tile: 1.2 }, { bump: 1, metal: 0.45 }) });
      for (let k = 0; k < 3; k++) H.box({ x: x * s, z: (z + (k - 1) * 2.3) * s, w: 0.9, d: 1.5, h: 0.8, y: 0.6 + k * 0.05, mat: wood, collide: false });
    });
    // contêineres
    H.box({ x: -6 * s, z: 13 * s, w: 6.1, d: 2.5, h: 2.6, mat: metal([170, 70, 50]) });
    H.box({ x: 7 * s, z: 20 * s, w: 2.5, d: 6.1, h: 2.6, mat: metal([60, 100, 130]) });
    // caixotes, pallets e empilhadeira
    H.box({ x: 1.5 * s, z: 8 * s, w: 1.6, d: 1.6, h: 1.6, mat: wood }); H.box({ x: 3.4 * s, z: 8.6 * s, w: 1.6, d: 1.6, h: 3.2, mat: woodDark });
    H.box({ x: 4 * s, z: 4.5 * s, w: 1.2, d: 1.2, h: 0.55, mat: wood }); H.box({ x: -8 * s, z: 10 * s, w: 1.2, d: 1.2, h: 0.55, mat: wood });
    H.box({ x: -13 * s, z: 3.5 * s, w: 1.4, d: 2.8, h: 1.5, mat: M('rust', { color: [220, 170, 30] }, { bump: 1.2 }) });
    H.box({ x: -13 * s, z: 3.5 * s, w: 1.4, d: 0.3, h: 3.0, y: 0, mat: steel, collide: false });
    barrel(H, 2 * s, 14 * s, [60, 90, 150]); barrel(H, 2.7 * s, 14.4 * s, [150, 50, 40]); barrel(H, 2.2 * s, 15.1 * s, [90, 90, 90]);
    H.box({ x: -2 * s, z: 21 * s, w: 4, d: 0.6, h: 1.1, mat: concrete });
  });
  // lâmpadas penduradas (emissivas) + luzes pontuais quentes
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffe3a8, fog: false });
  [[-14, 0], [14, 0], [0, 20], [0, -20]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.35, 10), lamp); l.position.set(x, 8.2, z); group.add(l); });
  H.flush();
  return {
    indoor: true,
    sky: { top: 0x2a3138, horizon: 0x3a4148, ground: 0x15181b, sunSize: 3 },
    sun: { color: 0xfff0d0, intensity: 3.4, dir: [14, 40, 9] }, hemi: { sky: 0x8fa0b2, ground: 0x2a2724, intensity: 0.55 },
    fog: { color: 0x2a2f35, near: 25, far: 120 }, exposure: 1.2, envIntensity: 0.3,
    lights: [{ color: 0xffd9a0, intensity: 14, distance: 26, pos: [-14, 7.5, 0] }, { color: 0xffd9a0, intensity: 14, distance: 26, pos: [14, 7.5, 0] }, { color: 0xffd9a0, intensity: 12, distance: 24, pos: [0, 7.5, 20] }, { color: 0xffd9a0, intensity: 12, distance: 24, pos: [0, 7.5, -20] }],
  };
}

// ===========================================================================
// MAPA 3 — FAVELA / COMUNIDADE ("Morro Vivo")
// ===========================================================================
function buildFavela(ctx) {
  const H = helpers(ctx), { group, M } = H;
  H.ground(M('pavers', { color: [132, 128, 120] }, { bump: 1.4 }), 42, 62);
  const dirt = new THREE.Mesh(planeGeo(42, 62, 6), M('dirt', {}, { bump: 1 })); // manchas de terra nas bordas
  [[-17, 0, 6, 50], [17, 0, 6, 50]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M('dirt', {})); m.rotation.x = -PI / 2; m.position.set(x, 0.01, z); m.receiveShadow = true; group.add(m); });
  const COLORS = [[236, 168, 64], [214, 92, 84], [70, 168, 188], [128, 184, 100], [238, 228, 204], [190, 146, 222], [246, 204, 90], [96, 136, 206]];
  const roofPts = [];
  function house({ x, z, w, d, h, style = 'plaster', c = 0, rot = false, tank = 0 }) {
    const mat = style === 'brick' ? H.M('brick', {}, { bump: 1.6 }) : H.M('plaster', { color: COLORS[c % COLORS.length] }, { bump: 0.9 });
    H.box({ x, z, w, d, h, mat });
    if (style === 'brick') { // parte da fachada rebocada e pintada
      H.box({ x, z, w: w + 0.02, d: d + 0.02, h: Math.min(2.2, h), mat: H.M('plaster', { color: COLORS[(c + 3) % COLORS.length] }, { bump: 0.9 }), collide: false });
    }
    H.box({ x, z, w: w + 0.5, d: d + 0.5, h: 0.25, y: h, mat: H.M('concrete', { base: 160 }), collide: false });
    const faces = [['+z', x, z + d / 2 + 0.03, w, 0], ['-z', x, z - d / 2 - 0.03, w, 0], ['+x', x + w / 2 + 0.03, z, d, 1], ['-x', x - w / 2 - 0.03, z, d, 1]];
    const floors = Math.max(1, Math.floor(h / 3));
    faces.forEach(([f, fx, fz, span, alongZ], fi) => {
      const n = Math.max(1, Math.floor(span / 2.8));
      for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
        if (H.rnd() < 0.18) continue;
        const off = ((i + 0.5) / n - 0.5) * span, yy = fl * 3 + 1.9;
        if (fl === 0 && i === 0 && H.rnd() < 0.8) { alongZ ? H.decal('porta', 1, f, fx, 1.25, fz + off, 1.5, 2.4) : H.decal('porta', 1, f, fx + off, 1.25, fz, 1.5, 2.4); continue; }
        const v = 1 + Math.floor(H.rnd() * 2);
        alongZ ? H.decal('janela', v, f, fx, yy, fz + off, 1.2, 1.2, { broken: false, color: '#1d2a36' }) : H.decal('janela', v, f, fx + off, yy, fz, 1.2, 1.2, { broken: false, color: '#1d2a36' });
      }
      if (H.rnd() < 0.3) { alongZ ? H.decal('grafite', 1 + fi, f, fx, 1.9, fz + (H.rnd() - 0.5) * span * 0.4, 2.6, 2.6) : H.decal('grafite', 1 + fi, f, fx + (H.rnd() - 0.5) * span * 0.4, 1.9, fz, 2.6, 2.6); }
    });
    // laje: caixa d'água, antena, vergalhões
    if (tank) { H.cyl({ x: x + w * 0.2, z: z - d * 0.15, r: 0.62, h: 1.0, y: h + 0.25, mat: new THREE.MeshStandardMaterial({ color: 0x2c78c2, roughness: 0.45 }), collide: false, seg: 18 }); }
    if (H.rnd() < 0.55) { H.cyl({ x: x - w * 0.3, z: z + d * 0.25, r: 0.03, h: 2.2, y: h + 0.25, mat: new THREE.MeshStandardMaterial({ color: 0x777b80, metalness: 0.7, roughness: 0.4 }), collide: false, seg: 6 }); }
    if (style === 'brick') [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => H.cyl({ x: x + sx * (w / 2 - 0.2), z: z + sz * (d / 2 - 0.2), r: 0.05, h: 1.0, y: h + 0.25, mat: H.M('rust', {}), collide: false, seg: 6, shadow: false }));
    roofPts.push([x - w / 2, h + 0.3, z - d / 2], [x + w / 2, h + 0.3, z + d / 2], [x - w / 2, h + 0.3, z + d / 2], [x + w / 2, h + 0.3, z - d / 2]);
  }
  // centro: bar da comunidade
  house({ x: 0, z: 0, w: 3.4, d: 3.4, h: 3.4, c: 6, tank: 0 });
  const awning = new THREE.Mesh(boxGeo(4.6, 0.12, 1.4, 2), new THREE.MeshStandardMaterial({ color: 0xd9433a, roughness: 0.6 })); awning.position.set(0, 2.6, 2.4); group.add(awning);
  const HOUSES = [
    [-12.5, 7, 6, 8, 6.5, 'plaster', 0, 1], [13, 9, 5, 7, 5, 'brick', 0, 0], [-4.5, 12.5, 3.6, 5, 4, 'plaster', 2, 0], [6.5, 15.5, 4.5, 4, 7.5, 'plaster', 3, 1],
    [-14.5, 17, 5, 5, 6.5, 'brick', 0, 0], [15.5, 22.5, 5, 6, 5.5, 'plaster', 4, 1], [-15.5, 23.5, 4.5, 5, 4.5, 'plaster', 1, 0], [3, 5.5, 3.5, 3.5, 3.2, 'plaster', 5, 0],
  ];
  sym((s) => {
    HOUSES.forEach(([x, z, w, d, h, st, c, tk]) => house({ x: x * s, z: z * s, w, d, h, style: st, c: c + (s < 0 ? 2 : 0), tank: tk }));
    // muretas e caixotes de cobertura
    H.box({ x: -8 * s, z: 2.5 * s, w: 2.4, d: 0.5, h: 1.1, mat: H.M('concrete', { base: 190 }) });
    H.box({ x: -9.5 * s, z: 21 * s, w: 2, d: 0.5, h: 1.1, mat: H.M('brick', {}) });
    H.box({ x: 9 * s, z: 18 * s, w: 1.2, d: 1.2, h: 1.1, mat: H.M('wood', {}) });
    barrel(H, -1.6 * s, 18 * s, [40, 100, 170]); barrel(H, 9.4 * s, 12.4 * s, [190, 70, 50]);
  });
  // quadra/praça: faixas no chão
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
  const circle = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.75, 40), white); circle.rotation.x = -PI / 2; circle.position.set(0, 0.012, 0); group.add(circle);
  // fios e bandeirinhas
  for (let i = 0; i < roofPts.length; i++) for (let j = i + 1; j < roofPts.length; j++) {
    const a = roofPts[i], b = roofPts[j], d = Math.hypot(a[0] - b[0], a[2] - b[2]);
    if (d > 3 && d < 9.5 && H.rnd() < 0.14) (H.rnd() < 0.45 ? H.bunting(a, b, 0.7) : H.wire(a, b, 0.6 + H.rnd() * 0.5));
  }
  // muro de contorno com murais
  const wallMat = H.M('concrete', { base: 200, tint: [1, 0.98, 0.92] }, { bump: 0.8 });
  [[0, 31, 42.8, 0.6, '-z'], [0, -31, 42.8, 0.6, '+z'], [21, 0, 0.6, 62.8, '-x'], [-21, 0, 0.6, 62.8, '+x']].forEach(([x, z, w, d, face], i) => {
    H.box({ x, z, w, d, h: 4.2, mat: wallMat, collide: false });
    for (let k = -2; k <= 2; k++) {
      const off = k * 8, offz = k * 11;
      const fx = w > 1 ? x + off : x - Math.sign(x) * 0.34, fz = w > 1 ? z - Math.sign(z) * 0.34 : z + offz;
      H.decal('grafite', i * 5 + k + 12, face, fx, 2.0, fz, 5, 3.5, { word: ['PAZ', 'AMOR', 'ARTE', 'VIDA', 'SAMBA'][(k + 2 + i) % 5] });
    }
  });
  // morro ao fundo: bacia de terra + casinhas
  const prof = [[44, -0.05], [60, 7], [100, 28], [210, 82]].map((p) => new THREE.Vector2(p[0], p[1]));
  const hg = new THREE.LatheGeometry(prof, 64), huv = hg.attributes.uv;
  for (let i = 0; i < huv.count; i++) huv.setXY(i, huv.getX(i) * 90, huv.getY(i) * 26);
  const hillMat = M('dirt', { color: [112, 92, 62], tile: 8 }).clone(); hillMat.side = THREE.DoubleSide;
  const hill = new THREE.Mesh(hg, hillMat); hill.scale.set(1, 1, 1.25); hill.receiveShadow = true; group.add(hill);
  const hillY = (r) => (r <= 60 ? (r - 44) * 0.44 : r <= 100 ? 7 + (r - 60) * 0.525 : 28 + (r - 100) * 0.49);
  const bk = [], cols = [0xe8a840, 0xd65a50, 0x46a8bc, 0x80b864, 0xeee4cc, 0xbe92de, 0xf6cc5a, 0x6088ce, 0xb5603c];
  for (let i = 0; i < (H.hi ? 220 : 110); i++) {
    const a = H.rnd() * PI * 2, r = 47 + H.rnd() * 75, y = hillY(r) - 0.4, w = 3 + H.rnd() * 4, d = 3 + H.rnd() * 4, h = 2.6 + H.rnd() * 4;
    bk.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 1.25, y, w, d, h, ry: -a + 1.57 + (H.rnd() - 0.5) * 0.4, color: cols[Math.floor(H.rnd() * cols.length)] });
  }
  H.backdrop(bk, H.M('plaster', {}, { bump: 0.5 }));
  H.flush();
  return {
    sky: { top: 0x4a78b8, horizon: 0xf4cf9c, ground: 0x8a6a4a, sunSize: 2.2 },
    sun: { color: 0xffc67e, intensity: 3.0, dir: [-30, 24, 18] }, hemi: { sky: 0xffd9b8, ground: 0x7a5a45, intensity: 0.95 },
    fog: { color: 0xeccaa0, near: 45, far: 210 }, exposure: 1.05, envIntensity: 0.6,
  };
}

// ===========================================================================
// MAPA 4 — FERRO-VELHO
// ===========================================================================
function buildFerro(ctx) {
  const H = helpers(ctx), { group, M } = H;
  H.ground(M('dirt', { color: [118, 90, 62], tile: 5 }, { bump: 1.6 }), 42, 62);
  const outer = M('dirt', { color: [104, 86, 62], tile: 7 }); H.ground(outer, 700, 700, -0.02);
  // trilhas de pneu e óleo no chão
  const oil = decalMaterial('mancha', 5);
  [[-5, 6, 8], [7, -8, 7], [-12, -14, 9], [10, 18, 6], [0, 0, 8]].forEach(([x, z, s]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), oil); m.rotation.x = -PI / 2; m.position.set(x, 0.015, z); group.add(m); });
  const metal = (c, r = 0.5) => M('corrugated', { color: c, rust: r, ridges: 8 }, { bump: 1.8, metal: 0.3 });
  const tireMat = M('concrete', { base: 44 }, { bump: 2 });
  sym((s) => {
    car(H, { x: -9 * s, z: 6 * s, alongX: false, color: [160, 66, 52] });
    car(H, { x: -9 * s, z: 6 * s, alongX: false, color: [70, 100, 140], y: 1.5, stack: 1.4, tilt: 0.06, collide: false }); // 2º carro empilhado
    H.obstacles[H.obstacles.length - 1].h = 2.9;
    car(H, { x: 8 * s, z: 12 * s, alongX: true, color: [190, 170, 60] });
    car(H, { x: -3 * s, z: 18 * s, alongX: true, color: [80, 120, 90], burnt: false });
    car(H, { x: 13 * s, z: 4 * s, alongX: false, color: [140, 140, 150] });
    car(H, { x: 13 * s, z: 4 * s, alongX: false, color: [180, 60, 60], y: 1.5, stack: 1.4, tilt: -0.08, collide: false }); H.obstacles[H.obstacles.length - 1].h = 2.9;
    H.box({ x: -14 * s, z: 14 * s, w: 6.1, d: 2.5, h: 2.6, mat: metal([180, 90, 50]) });
    H.box({ x: -14 * s, z: 14 * s, w: 6.1, d: 2.5, h: 2.6, y: 2.6, mat: metal([60, 110, 130]), collide: false }); H.obstacles[H.obstacles.length - 1].h = 5.2;
    H.box({ x: 3 * s, z: 21.5 * s, w: 2.5, d: 6.1, h: 2.6, mat: metal([90, 130, 80], 0.6) });
    // pilhas de pneus
    H.cyl({ x: 0 * s, z: 6 * s, r: 1.0, h: 1.3, mat: tireMat, seg: 18 }); H.cyl({ x: -5.5 * s, z: 15 * s, r: 1.0, h: 1.0, mat: tireMat, seg: 18 });
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.3, 10, 22), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })); t2.rotation.x = PI / 2; t2.position.set(0 * s, 1.5, 6 * s); H.add(t2);
    // montes de sucata
    const heap = H.cyl({ x: 5.5 * s, z: 2.5 * s, r: 1.7, h: 1.8, rt: 0.7, mat: M('rust', {}, { bump: 2 }), seg: 9 });
    heap.scale.set(1, 1, 1.15);
    for (let k = 0; k < 6; k++) { const sl = new THREE.Mesh(boxGeo(0.2 + H.rnd() * 0.5, 0.15, 1.4, 1), M('rust', { color: [90 + H.rnd() * 60, 70, 60] })); sl.position.set((5.5 + (H.rnd() - 0.5) * 2.2) * s, 1.4 + H.rnd() * 0.6, (2.5 + (H.rnd() - 0.5) * 2) * s); sl.rotation.set(H.rnd(), H.rnd() * 3, H.rnd()); H.add(sl); }
    // barris, muretas de concreto, caixote
    barrel(H, -2 * s, 11 * s, [170, 60, 40]); barrel(H, -2.7 * s, 11.5 * s, [60, 90, 130]); barrel(H, -1.9 * s, 12.2 * s, [100, 100, 100]);
    H.box({ x: 11 * s, z: 21 * s, w: 3.2, d: 0.7, h: 1.1, mat: M('concrete', { base: 160 }) });
    H.box({ x: -7 * s, z: 22 * s, w: 1.5, d: 1.5, h: 1.5, mat: M('wood', {}) });
  });
  // ônibus velho no centro
  H.box({ x: 0, z: 0, w: 2.6, d: 9, h: 3, mat: M('rust', { color: [228, 178, 38] }, { bump: 1.4 }) });
  for (let i = -3; i <= 3; i++) { H.decal('janela', 3, '+x', 1.33, 2.0, i * 1.2, 1, 0.9, { broken: true }); H.decal('janela', 3, '-x', -1.33, 2.0, i * 1.2, 1, 0.9, { broken: true }); }
  // barraco / escritório
  H.box({ x: -16, z: -4, w: 4.2, d: 3.4, h: 2.8, mat: metal([140, 130, 110], 0.7) });
  // cerca de chapas + cenário
  const fence = metal([150, 130, 100], 0.75);
  [[0, 31, 42.8, 0.3, 0], [0, -31, 42.8, 0.3, 0], [21, 0, 0.3, 62.8, 0], [-21, 0, 0.3, 62.8, 0]].forEach(([x, z, w, d]) => { H.box({ x, z, w, d, h: 3.6, mat: fence, collide: false }); });
  for (let i = 0; i < 14; i++) { const a = H.rnd() * PI * 2, r = 30 + H.rnd() * 20; const mound = new THREE.Mesh(new THREE.ConeGeometry(4 + H.rnd() * 5, 6 + H.rnd() * 7, 8), M('rust', { color: [78, 72, 66] }, { bump: 2 })); mound.position.set(Math.cos(a) * r * 0.9, 3, Math.sin(a) * r * 1.2); mound.castShadow = true; group.add(mound); }
  // guindaste ao fundo
  const crane = M('rust', { color: [200, 150, 30], tile: 1.5 }, { bump: 1.2, metal: 0.3 });
  const mast = new THREE.Mesh(boxGeo(1.2, 24, 1.2, 1.5), crane); mast.position.set(-27, 12, -30); mast.castShadow = true; group.add(mast);
  const arm = new THREE.Mesh(boxGeo(1, 1, 22, 1.5), crane); arm.position.set(-27, 24, -20); group.add(arm);
  const mag = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x222 })); mag.position.set(-27, 14, -12); group.add(mag);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 10, 6), new THREE.MeshStandardMaterial({ color: 0x222222 })); cable.position.set(-27, 19.2, -12); group.add(cable);
  trees(H, 30, 52, 90, [0.2, 0.28], 0.3);
  H.flush();
  return {
    sky: { top: 0x5f88b8, horizon: 0xe4d6bd, ground: 0x7a6a50, sunSize: 1.8 },
    sun: { color: 0xffe2b8, intensity: 2.7, dir: [20, 38, -24] }, hemi: { sky: 0xd0d8e6, ground: 0x6b5a45, intensity: 0.95 },
    fog: { color: 0xcfc2aa, near: 55, far: 230 }, exposure: 1.05, envIntensity: 0.6,
  };
}

// ===========================================================================
// MAPA 5 — CIDADE ABANDONADA
// ===========================================================================
function buildCidade(ctx) {
  const H = helpers(ctx), { group, M } = H;
  H.ground(M('asphalt', { tile: 5 }, { bump: 1.2 }), 44, 64);
  H.ground(M('concrete', { base: 120, tile: 6 }, { bump: 1 }), 700, 700, -0.02);
  const yellow = new THREE.MeshBasicMaterial({ color: 0xd6b52a }), white = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  for (let z = -29; z < 29; z += 4) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2), yellow); l.rotation.x = -PI / 2; l.position.set(0, 0.012, z); group.add(l); }
  for (let z = -28; z < 28; z += 6) [-10, 10].forEach((x) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3), white); l.rotation.x = -PI / 2; l.position.set(x, 0.012, z); group.add(l); });
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), white); cross.rotation.x = -PI / 2; cross.position.set(0, 0.012, 6); group.add(cross);
  const stain = decalMaterial('mancha', 7);
  [[-4, 3, 6], [7, -9, 6], [-8, -15, 7]].forEach(([x, z, s]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), stain); m.rotation.x = -PI / 2; m.position.set(x, 0.015, z); group.add(m); });
  function building({ x, z, w, d, h, c = 0, collide = true, floors }) {
    const tones = [[196, 190, 178], [168, 172, 170], [190, 176, 150], [150, 150, 146]];
    const mat = M('plaster', { color: tones[c % tones.length] }, { bump: 1.0 });
    H.box({ x, z, w, d, h, mat, collide });
    H.box({ x, z, w: w + 0.4, d: d + 0.4, h: 0.5, y: h, mat: M('concrete', { base: 140 }), collide: false });
    const nf = floors ?? Math.floor(h / 3.4);
    [['+z', x, z + d / 2 + 0.03, w, 0], ['-z', x, z - d / 2 - 0.03, w, 0], ['+x', x + w / 2 + 0.03, z, d, 1], ['-x', x - w / 2 - 0.03, z, d, 1]].forEach(([f, fx, fz, span, al]) => {
      const n = Math.max(1, Math.floor(span / 2.6));
      for (let fl = 0; fl < nf; fl++) for (let i = 0; i < n; i++) {
        if (H.rnd() < 0.08) continue;
        const off = ((i + 0.5) / n - 0.5) * span, yy = fl * 3.4 + 2.2, v = Math.floor(H.rnd() * 3);
        al ? H.decal('janela', v, f, fx, yy, fz + off, 1.5, 1.7, { broken: true }) : H.decal('janela', v, f, fx + off, yy, fz, 1.5, 1.7, { broken: true });
      }
      if (H.rnd() < 0.5) { al ? H.decal('mancha', 1, f, fx, h * 0.55, fz, span, h * 0.8) : H.decal('mancha', 1, f, fx, h * 0.55, fz, span, h * 0.8); }
    });
  }
  sym((s) => {
    [[-13.5, 8, 9, 9, 10, 0], [13, 10, 8, 10, 12, 1], [-13, 21.5, 8, 6, 8, 2], [12.5, 22, 7, 6, 9, 3]].forEach(([x, z, w, d, h, c]) => building({ x: x * s, z: z * s, w, d, h, c: c + (s < 0 ? 1 : 0) }));
    car(H, { x: -2.5 * s, z: 10 * s, alongX: false, color: [120, 120, 125], burnt: true });
    car(H, { x: 6 * s, z: 17 * s, alongX: false, color: [140, 60, 50] });
    H.box({ x: 3.5 * s, z: 14.5 * s, w: 3.2, d: 0.7, h: 1.1, mat: M('concrete', { base: 175 }) });
    H.box({ x: -4 * s, z: 17.5 * s, w: 3.2, d: 0.7, h: 1.1, mat: M('concrete', { base: 175 }) });
    H.box({ x: -6 * s, z: 3 * s, w: 3, d: 2.5, h: 1.0, mat: M('rust', { color: [110, 100, 92] }, { bump: 2 }) });
    H.box({ x: 9 * s, z: 4 * s, w: 2.6, d: 8.6, h: 3.1, mat: M('rust', { color: [60, 100, 140] }, { bump: 1.2 }) }); // ônibus
    for (let i = -3; i <= 3; i++) { H.decal('janela', 4, '+x', (9 + 1.31) * s * (s > 0 ? 1 : 1), 2.1, (4 + i * 1.1) * s, 0.9, 0.9, { broken: true }); }
    // postes e árvores brotando do asfalto
    [[-8, 12], [8, 8]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 7, 8), new THREE.MeshStandardMaterial({ color: 0x3b3f44, metalness: 0.6, roughness: 0.5 })); p.position.set(x * s, 3.5, z * s); p.rotation.z = 0.05 * s; p.castShadow = true; group.add(p); });
  });
  H.box({ x: 0, z: 0, w: 6.1, d: 2.5, h: 2.6, mat: M('corrugated', { color: [70, 110, 90], rust: 0.55, ridges: 8 }, { bump: 1.8 }) });
  // prédios arruinados ao redor (altos, sem colisão) + vegetação
  const ring = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * PI * 2, r = 36 + H.rnd() * 12, w = 8 + H.rnd() * 8, d = 8 + H.rnd() * 8, h = 12 + H.rnd() * 26;
    ring.push({ x: Math.cos(a) * r * 0.95, z: Math.sin(a) * r * 1.35, y: 0, w, d, h, ry: a, color: [0xb4b0a4, 0x9fa3a4, 0xb8a98c, 0x8c9094][i % 4] });
  }
  H.backdrop(ring, H.M('concrete', { base: 190 }, { bump: 0.6 }));
  trees(H, H.hi ? 60 : 30, 30, 50, [0.2, 0.3], 0.35, 0.9, 1.3);
  H.flush();
  return {
    sky: { top: 0x6f7f90, horizon: 0xc6ccd2, ground: 0x6a6e70, sunSize: 0.6 },
    sun: { color: 0xdde6f2, intensity: 1.5, dir: [10, 45, 12] }, hemi: { sky: 0xc4ccd6, ground: 0x5a5f55, intensity: 1.35 },
    fog: { color: 0xaab4be, near: 28, far: 150 }, exposure: 1.0, envIntensity: 0.75,
  };
}

export const MAPS = {
  arena: { name: 'Arena Speedball', tag: 'Torneio', blurb: 'Campo simétrico com bunkers infláveis. O clássico competitivo.', menu: { r: 36, h: 9, rz: 1.3, look: [0, 1.4, 0] }, build: buildArena },
  galpao: { name: 'Galpão Abandonado', tag: 'Interior', blurb: 'Estantes, contêineres e colunas sob feixes de luz do telhado.', menu: { r: 13, h: 3.8, rz: 1.5, look: [0, 1.6, 0] }, build: buildGalpao },
  favela: { name: 'Morro Vivo', tag: 'Comunidade', blurb: 'Becos, lajes e muita cor. Combate vertical e curto.', menu: { r: 24, h: 12, rz: 1.35, look: [0, 1.6, 0] }, build: buildFavela },
  ferro: { name: 'Ferro-Velho', tag: 'Industrial', blurb: 'Carcaças empilhadas, pneus e contêineres enferrujados.', menu: { r: 28, h: 9, rz: 1.3, look: [0, 1.4, 0] }, build: buildFerro },
  cidade: { name: 'Cidade Abandonada', tag: 'Urbano', blurb: 'Ruas vazias, prédios em ruínas e ônibus tombado.', menu: { r: 26, h: 10, rz: 1.35, look: [0, 1.6, 0] }, build: buildCidade },
};
export const MAP_LIST = Object.keys(MAPS);
