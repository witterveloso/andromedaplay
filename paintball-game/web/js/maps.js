import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries, mergeVertices } from './vendor/utils/BufferGeometryUtils.js';
import { buildVehicle, buildBus, VEHICLE_KINDS, vehicleSize } from './vehicles.js';
import { material, boxGeo, planeGeo, decalMaterial, shaftTexture, hashRand } from './textures.js';

const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------------
// utilitários compartilhados pelos mapas
// ---------------------------------------------------------------------------
function helpers({ group, obstacles, quality, interiors = [], spots = [], ramps = [] }) {
  const hi = quality === 'high';
  const mats = new Map();
  const M = (kind, params = {}, opts = {}) => {
    const k = kind + JSON.stringify(params) + JSON.stringify(opts);
    if (!mats.has(k)) mats.set(k, material(kind, params, opts));
    return mats.get(k);
  };
  const hexOf = (c, k = 1.2) => ((Math.min(255, c[0] * k) | 0) << 16) | ((Math.min(255, c[1] * k) | 0) << 8) | (Math.min(255, c[2] * k) | 0);
  // mesma textura-base (cinza) para todas as cores: a cor vem do material (carrega bem mais rápido)
  const paint = (kind, rgb, params = {}, opts = {}) => M(kind, { color: [205, 208, 208], small: true, ...params }, { ...opts, tint: hexOf(rgb) });
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
  return { M, paint, rnd, add, box, cyl, ground, decal, wire, bunting, flush, backdrop, hi, group, obstacles, interiors, spots, ramps };
}

// espelhamento por simetria central: fn(s) com s = +1 e -1 (posição*s, rotação +π se s<0)
const sym = (fn) => { fn(1); fn(-1); };

// copa feita de várias esferas irregulares fundidas (1 geometria): bem mais natural que um icosaedro liso
function leafCluster(hi = true) {
  const parts = [[0, 0, 0, 3.2], [2.1, -0.7, 0.8, 2.3], [-2.0, -0.5, -0.9, 2.4], [0.6, 1.9, -0.6, 2.2], [-0.4, -0.9, 2.2, 2.1], [0.3, 1.2, 1.7, 1.8]].slice(0, hi ? 6 : 4);
  const geos = parts.map(([x, y, z, r], k) => {
    let g = new THREE.IcosahedronGeometry(r, hi ? 2 : 1); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g); const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), L = Math.hypot(px, py, pz) || 1;
      const j = 1 + 0.16 * Math.sin(px * 2.3 + k) * Math.cos(pz * 2.7 - k) + 0.09 * Math.sin(py * 4.1 + px * 1.7);
      p.setXYZ(i, px * j + x, py * j * 0.86 + y, pz * j + z);
      const up = (py / L) * 0.5 + 0.5, k2 = 0.62 + 0.55 * up + 0.12 * Math.sin(px * 5 + pz * 4);   // topo claro, barriga escura
      col[i * 3] = k2; col[i * 3 + 1] = k2; col[i * 3 + 2] = k2 * 0.96;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    return g;
  });
  const merged = mergeGeometries(geos); geos.forEach((g) => g.dispose());
  return merged;
}
function trees(H, count, rMin, rMax, hue = [0.24, 0.32], sat = 0.45, rx = 1, rz = 1.35) {
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 5.4, 8), leafGeo = leafCluster(H.hi);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5a4332, roughness: 1 }), count);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.95, vertexColors: true }), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * PI * 2 + (H.rnd() - 0.5) * 0.1, rr = rMin + H.rnd() * (rMax - rMin), s = 0.8 + H.rnd() * 0.9;
    q.setFromEuler(e.set(0, H.rnd() * PI * 2, 0));
    pos.set(Math.cos(a) * rr * rx, 2.7 * s, Math.sin(a) * rr * rz); sc.set(s, s, s);
    m4.compose(pos, q, sc); trunks.setMatrixAt(i, m4);
    pos.y = 6.4 * s; sc.set(s * (0.9 + H.rnd() * 0.3), s * (0.9 + H.rnd() * 0.25), s * (0.9 + H.rnd() * 0.3));
    m4.compose(pos, q, sc); leaves.setMatrixAt(i, m4);
    leaves.setColorAt(i, col.setHSL(hue[0] + H.rnd() * (hue[1] - hue[0]), sat + 0.1, 0.3 + H.rnd() * 0.14));
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

// veículo realista (veja vehicles.js). alongX: comprimento no eixo X. Cada carro sorteia um modelo (hatch, sedã, SUV, picape, Kombi, Fusca)
const KIND_BAG = ['hatch', 'hatch', 'hatch', 'sedan', 'sedan', 'suv', 'pickup', 'van', 'fusca', 'fusca'];
const fprint = (L, W, ry) => { const c = Math.abs(Math.cos(ry)), n = Math.abs(Math.sin(ry)); return { w: c * L + n * W, d: n * L + c * W }; };
function car(H, { x, z, alongX = false, color = [150, 60, 50], color2, y = 0, stack = 0, tilt = 0, burnt = false, collide = true, kind, wear, flat, stripped, doorOpen, crunch, overturned, yaw = 0 }) {
  kind = kind || KIND_BAG[Math.floor(H.rnd() * KIND_BAG.length)];
  wear = wear ?? (burnt ? 2 : H.rnd() < 0.55 ? 1 : 0);
  const paint = H.M('carpaint', { color: wear >= 2 ? [200, 200, 200] : color, wear, small: true }, { metal: wear >= 2 ? 0.05 : 0.38 });   // cor assada na textura: a ferrugem não muda de cor com a tinta
  const paint2 = kind === 'van' ? H.M('carpaint', { color: [236, 236, 230], wear, small: true }, { metal: 0.3 }) : null;
  const sz = vehicleSize(kind);
  const veh = buildVehicle({ kind, paint, paint2, wear, flat, stripped, doorOpen, crunch, hi: H.hi, plate: Math.floor(H.rnd() * 6), seed: H.rnd() * 10 });
  const g = new THREE.Group(); g.add(veh);
  if (overturned) { veh.rotation.x = PI; veh.position.y = sz.H; }
  g.position.set(x, y, z);
  const ry = (alongX ? 0 : PI / 2) + yaw; g.rotation.y = ry; g.rotation.z = tilt;
  H.group.add(g);
  const f = fprint(sz.L, sz.W, ry);
  if (collide) H.obstacles.push({ type: 'box', x, z, w: f.w, d: f.d, h: y + sz.H + stack });
  return g;
}
// ônibus urbano
function bus(H, { x, z, alongX = false, color = [60, 100, 140], wear = 1, flat = true }) {
  const paint = H.M('carpaint', { color, wear, small: true }, { metal: 0.3 }), paint2 = H.M('carpaint', { color: [235, 235, 230], wear, small: true }, { metal: 0.2 });
  const m = buildBus({ paint, paint2, wear, flat, hi: H.hi, plate: Math.floor(H.rnd() * 6), missing: H.rnd() < 0.4 ? [1] : [] });
  const g = new THREE.Group(); g.add(m); g.position.set(x, 0, z); g.rotation.y = alongX ? 0 : PI / 2; H.group.add(g);
  const w = alongX ? 8.6 : 2.5, d = alongX ? 2.5 : 8.6;
  H.obstacles.push({ type: 'box', x, z, w, d, h: 3.1 });
  return g;
}
// cenas de "vida real": batida, carro depenado sobre blocos, capotado, carbonizado, abandonado de porta aberta
function carScene(H, R, kind, x, z, s = 1, colors) {
  const C = colors, pick = () => C[Math.floor(R() * C.length)], f = s < 0 ? PI : 0;
  switch (kind) {
    case 'crash':   // dois carros que se chocaram: frentes amassadas, em ângulo
      car(H, { x: x - 1.5 * s, z, alongX: true, yaw: f, color: pick(), crunch: 1, wear: 1, kind: 'sedan' });
      car(H, { x: x + 1.15 * s, z: z + 2.1 * s, alongX: false, yaw: f + 0.28 * s, color: pick(), crunch: 0.85, wear: 1, kind: 'hatch' });
      break;
    case 'blocks':  car(H, { x, z, alongX: R() < 0.5, yaw: f, color: pick(), stripped: true, doorOpen: true, wear: 1 }); break;       // depenado
    case 'flip':    car(H, { x, z, alongX: R() < 0.5, yaw: f, color: pick(), overturned: true, wear: 1 }); break;                        // capotado
    case 'burnt':   car(H, { x, z, alongX: R() < 0.5, yaw: f, color: pick(), burnt: true, flat: true }); break;                           // incendiado
    default:        car(H, { x, z, alongX: R() < 0.5, yaw: f, color: pick(), flat: true, doorOpen: true }); break;                        // abandonado
  }
}
const sceneSize = (kind) => (kind === 'crash' ? { w: 6.6, d: 5.6 } : { w: 4.8, d: 4.8 });

function barrel(H, x, z, color, collide = true) {
  H.cyl({ x, z, r: 0.3, h: 0.95, mat: H.paint('rust', color, { tile: 1 }), seg: 14, collide });
}


// barraco com porta: 4 paredes (com abertura), piso e telhado. Dá para entrar e se esconder:
// as paredes bloqueiam tiros e a visão; os bots também usam o interior (waypoint na porta).
function hut(H, { x, z, w, d, h = 3, doors = ['+z'], doorW = 1.5, t = 0.25, wallMat, floorMat, roofMat, crate = true }) {
  const wall = (cx, cz, ww, dd) => H.box({ x: cx, z: cz, w: ww, d: dd, h, mat: wallMat });
  const lintel = (cx, cz, ww, dd) => H.box({ x: cx, z: cz, w: ww, d: dd, h: h - 2.3, y: 2.3, mat: wallMat, collide: false });
  [['+z', z + d / 2 - t / 2], ['-z', z - d / 2 + t / 2]].forEach(([side, cz]) => {
    if (doors.includes(side)) { const sl = (w - doorW) / 2, off = doorW / 2 + sl / 2; wall(x - off, cz, sl, t); wall(x + off, cz, sl, t); lintel(x, cz, doorW, t); }
    else wall(x, cz, w, t);
  });
  const L = d - 2 * t;
  [['+x', x + w / 2 - t / 2], ['-x', x - w / 2 + t / 2]].forEach(([side, cx]) => {
    if (doors.includes(side)) { const sl = (L - doorW) / 2, off = doorW / 2 + sl / 2; wall(cx, z - off, t, sl); wall(cx, z + off, t, sl); lintel(cx, z, t, doorW); }
    else wall(cx, z, t, L);
  });
  H.box({ x, z, w: w - 2 * t, d: d - 2 * t, h: 0.05, mat: floorMat, collide: false, shadow: false });
  H.box({ x, z, w: w + 0.5, d: d + 0.5, h: 0.25, y: h, mat: roofMat, collide: false });
  H.interiors.push({ x, z, w: w - 2 * t, d: d - 2 * t });
  const door = doors[0], nx = door === '+x' ? 1 : door === '-x' ? -1 : 0, nz = door === '+z' ? 1 : door === '-z' ? -1 : 0;
  const via = { x: x + nx * (w / 2 + 1.8), z: z + nz * (d / 2 + 1.8) };
  const inX = w / 2 - t - 0.8, inZ = d / 2 - t - 0.8;
  const via2 = { x: x + nx * (w / 2 - t - 0.7), z: z + nz * (d / 2 - t - 0.7) };   // logo depois da porta
  [[0, 0], [-inX, -inZ], [inX, -inZ], [-inX, inZ], [inX, inZ]].forEach(([ox, oz]) => { if (!(crate && Math.abs(ox + nx * -inX) < 0.01 && Math.abs(oz + nz * -inZ) < 0.01)) H.spots.push({ x: x + ox, z: z + oz, via, via2 }); });
  if (crate) H.box({ x: x - nx * (w / 2 - t - 0.55), z: z - nz * (d / 2 - t - 0.55), w: 0.9, d: 0.9, h: 1.0, mat: H.M('wood', {}) });
}
const flip = (doors, s) => (s > 0 ? doors : doors.map((d) => (d[0] === '+' ? '-' : '+') + d[1]));

// ---------------------------------------------------------------------------
// geração de obstáculos: posição aleatória (semente fixa), sem sobrepor, sempre em pares simétricos
// ---------------------------------------------------------------------------
function overlaps(H, x, z, w, d, m) {
  for (const o of H.obstacles) {
    const ow = o.type === 'cyl' ? o.r * 2 : o.w, od = o.type === 'cyl' ? o.r * 2 : o.d;
    if (Math.abs(x - o.x) < (w + ow) / 2 + m && Math.abs(z - o.z) < (d + od) / 2 + m) return true;
  }
  return false;
}
// make(R) -> { w, d, put(x, z, s) }; s = +1 (original) / -1 (espelho por rotação de 180°)
function scatter(H, A, R, { count, tries = 60, margin = 2.4, zMin = 4, zMax, xMax, make }) {
  let placed = 0;
  for (let n = 0; n < count; n++) {
    for (let t = 0; t < tries; t++) {
      const spec = make(R);
      const x = (R() * 2 - 1) * xMax, z = zMin + R() * (zMax - zMin);
      if (z - spec.d / 2 < 2.5) continue;
      if (z + spec.d / 2 > A.hz - 8 && Math.abs(x) < 14 + spec.w / 2) continue;      // área de largada livre
      if (overlaps(H, x, z, spec.w, spec.d, margin) || overlaps(H, -x, -z, spec.w, spec.d, margin)) continue;
      spec.put(x, z, 1); spec.put(-x, -z, -1); placed++; break;
    }
  }
  return placed;
}

// ---------------------------------------------------------------------------
// Torres/plataformas elevadas: o jogador e os bots sobem pela rampa e atiram de cima (ninho de sniper).
// dir = direção (unitária, eixo X ou Z) da base da rampa para a plataforma.
function tower(H, { x, z, dir, h = 2.6, mat, railMat, size = 4.2, rw = 2.0 }) {
  const [ux, uz] = dir, L = h / 0.4, edge = size / 2;
  H.box({ x, z, w: size, d: size, h, mat }); H.obstacles[H.obstacles.length - 1].walk = true;
  // rampa maciça (cunha): a superfície inclinada é por onde se anda
  const cx = x - ux * (edge + L / 2), cz = z - uz * (edge + L / 2);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, h); sh.closePath();
  const wg = new THREE.ExtrudeGeometry(sh, { depth: rw, bevelEnabled: false });
  wg.translate(-L / 2, 0, -rw / 2); wg.rotateY(Math.atan2(-uz, ux));
  const uv = wg.attributes.uv, tile = mat.userData.tile || 2; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  const wedge = new THREE.Mesh(wg, mat); wedge.position.set(cx, 0, cz); H.add(wedge);
  H.ramps.push({ cx, cz, hw: rw / 2, hl: L / 2, ux, uz, h });
  H.obstacles.push({ type: 'box', x: cx, z: cz, w: Math.abs(ux) * L + Math.abs(uz) * rw, d: Math.abs(uz) * L + Math.abs(ux) * rw, h: 0.02, ghost: true });
  // muretas (cobertura) nos três lados fechados e nos cantos da entrada
  const t = 0.2, rh = 0.9, sx = Math.abs(uz), sz = Math.abs(ux);          // eixo lateral
  const wall = (px, pz, w, d) => H.box({ x: px, z: pz, w, d, h: rh, y: h, mat: railMat || mat });
  // lado de frente (oposto à rampa)
  wall(x + ux * (edge - t / 2), z + uz * (edge - t / 2), Math.abs(uz) * size + Math.abs(ux) * t, Math.abs(ux) * size + Math.abs(uz) * t);
  // laterais
  [-1, 1].forEach((sd) => wall(x + -uz * sd * (edge - t / 2), z + ux * sd * (edge - t / 2), Math.abs(ux) * size + Math.abs(uz) * t, Math.abs(uz) * size + Math.abs(ux) * t));
  // cantos junto à rampa (deixam 2 m de abertura)
  const gap = (size - rw) / 2;
  [-1, 1].forEach((sd) => wall(x - ux * (edge - t / 2) + -uz * sd * (rw / 2 + gap / 2), z - uz * (edge - t / 2) + ux * sd * (rw / 2 + gap / 2), Math.abs(uz) * gap + Math.abs(ux) * t, Math.abs(ux) * gap + Math.abs(uz) * t));
  // pontos de cobertura para os bots (em cima, atrás das muretas)
  const low = { x: x - ux * (edge + L - 0.6), z: z - uz * (edge + L - 0.6) }, top = { x: x - ux * (edge - 0.7), z: z - uz * (edge - 0.7) };
  const k = edge - 0.8;
  [[ux * k, uz * k], [-uz * k, ux * k], [uz * k, -ux * k], [-uz * k * 0.6 + ux * k * 0.3, ux * k * 0.6 + uz * k * 0.3], [uz * k * 0.6 + ux * k * 0.3, -ux * k * 0.6 + uz * k * 0.3]]
    .forEach(([ox, oz]) => H.spots.push({ x: x + ox, z: z + oz, y: h, via: low, via2: top }));
}
// sorteia `pairs` torres (e as espelhadas por simetria central) em lugares livres
function towers(H, A, R, { pairs = 2, h = 2.6, mat, railMat }) {
  const L = h / 0.4, size = 4.2, ext = size / 2 + L + 0.6;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let done = 0;
  for (let n = 0; n < pairs; n++) {
    for (let t = 0; t < 120; t++) {
      const x = (R() * 2 - 1) * (A.hx - 8), z = 9 + R() * (A.hz - 25), dir = dirs[(R() * 4) | 0];
      const [ux, uz] = dir, cx = x - ux * (size / 2 + L / 2), cz = z - uz * (size / 2 + L / 2);
      const rw = Math.abs(ux) * L + Math.abs(uz) * 2.4, rd = Math.abs(uz) * L + Math.abs(ux) * 2.4;
      if (Math.abs(cx) + rw / 2 > A.hx - 2 || Math.abs(x) + size / 2 > A.hx - 2 || z + size / 2 > A.hz - 10 || Math.abs(cz) + rd / 2 > A.hz - 10) continue;
      if (Math.hypot(x, z) < ext + 2 || Math.hypot(cx, cz) < 6) continue;
      const bad = overlaps(H, x, z, size, size, 2.2) || overlaps(H, cx, cz, rw, rd, 1.6) || overlaps(H, -x, -z, size, size, 2.2) || overlaps(H, -cx, -cz, rw, rd, 1.6);
      if (bad) continue;
      tower(H, { x, z, dir, h, mat, railMat }); tower(H, { x: -x, z: -z, dir: [-ux, -uz], h, mat, railMat });
      done++; break;
    }
  }
  return done;
}
function container(H, metal, { x, z, alongX, color, color2, stack }) {
  const w = alongX ? 6.1 : 2.5, d = alongX ? 2.5 : 6.1;
  H.box({ x, z, w, d, h: 2.6, mat: metal(color) });
  if (stack) { H.box({ x, z, w, d, h: 2.6, y: 2.6, mat: metal(color2 || color), collide: false }); H.obstacles[H.obstacles.length - 1].h = 5.2; }
}
function carStack(H, o) {
  car(H, { ...o, stack: o.stacked ? 1.4 : 0 });
  if (o.stacked) car(H, { x: o.x, z: o.z, alongX: o.alongX, color: o.color2 || [70, 100, 140], y: 1.5, tilt: o.tilt || 0.06, collide: false, wear: 1, flat: true });
}

// ===========================================================================
// MAPA 1 — ARENA SPEEDBALL (campo de torneio, 60 × 90 m)
// ===========================================================================
function buildArena(ctx) {
  const H = helpers(ctx), { group } = H, A = ctx.ARENA, hx = A.hx, hz = A.hz, R = hashRand(21);
  const turf = H.M('grass', { color: [66, 104, 50], tile: 3 }, { bump: 0.6 });
  H.ground(turf, hx * 2 + 4, hz * 2 + 4);
  const outer = H.M('grass', { color: [70, 90, 52], tile: 6 }); H.ground(outer, 900, 900, -0.02);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  const mid = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, 0.15), lineMat); mid.rotation.x = -PI / 2; mid.position.y = 0.01; group.add(mid);
  [1, -1].forEach((s, i) => {
    const st = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 2.4), new THREE.MeshStandardMaterial({ color: i ? 0x00b4ff : 0xff8a00, roughness: 0.6 }));
    st.position.set(0, 0.06, s * (hz - 1.4)); st.receiveShadow = true; group.add(st);
  });
  const PAL = [0xf2c230, 0xe8eef2, 0x2c3036, 0x2f7fc9, 0xe0701f, 0xc83a3a];
  const fab = new Map();
  const bunker = (spec, x, z, idx) => {
    const col = PAL[idx % PAL.length];
    if (!fab.has(col)) fab.set(col, fabricMaterial(col));
    const mat = fab.get(col);
    let mesh;
    if (spec.k === 'cyl') {
      const r = spec.r, h = spec.h;
      const prof = [[r, 0], [r, h - 0.22], [r * 0.92, h - 0.08], [r * 0.7, h - 0.015], [0.001, h]].map((p) => new THREE.Vector2(p[0], p[1]));
      mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), mat); mesh.position.set(x, 0, z);
      H.obstacles.push({ type: 'cyl', x, z, r, h });
    } else {
      mesh = new THREE.Mesh(roundedBox(spec.w, spec.h, spec.d, 0.17), mat); mesh.position.set(x, spec.h / 2, z);
      H.obstacles.push({ type: 'box', x, z, w: spec.w, d: spec.d, h: spec.h });
    }
    H.add(mesh);
  };
  bunker({ k: 'cyl', r: 0.65, h: 1.9 }, 0, 0, 0);
  let ci = 1;
  towers(H, A, R, { pairs: 2, h: 2.6, mat: H.M('wood', { tile: 1.5 }), railMat: H.M('wood', { tile: 1.5 }) });
  scatter(H, A, R, { count: H.hi ? 78 : 56, margin: 2.7, zMax: hz - 8, xMax: hx - 3, make: (R) => {
    const t = R(); let spec;
    if (t < 0.42) spec = { k: 'cyl', r: 0.6, h: R() < 0.5 ? 1.6 : 1.9 };
    else if (t < 0.68) spec = { k: 'box', w: 1.8, d: 1.8, h: 1.1 };
    else if (t < 0.86) spec = { k: 'box', w: 3.2, d: 0.9, h: 1.9 };
    else spec = { k: 'box', w: 0.9, d: 3, h: 1.9 };
    const idx = ci++;
    return { w: spec.k === 'cyl' ? spec.r * 2 : spec.w, d: spec.k === 'cyl' ? spec.r * 2 : spec.d, put: (x, z) => bunker(spec, x, z, idx) };
  } });
  // rede + postes
  const netC = document.createElement('canvas'); netC.width = netC.height = 64;
  const ng = netC.getContext('2d'); ng.strokeStyle = '#fff'; ng.lineWidth = 4; ng.beginPath(); ng.moveTo(0, 0); ng.lineTo(64, 64); ng.moveTo(64, 0); ng.lineTo(0, 64); ng.stroke();
  const net = new THREE.CanvasTexture(netC); net.wrapS = net.wrapT = THREE.RepeatWrapping;
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.2, 8), postMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 });
  [[0, hz + 1, 0, hx * 2 + 2], [0, -hz - 1, 0, hx * 2 + 2], [hx + 1, 0, PI / 2, hz * 2 + 2], [-hx - 1, 0, PI / 2, hz * 2 + 2]].forEach(([x, z, ry, len]) => {
    const t = net.clone(); t.needsUpdate = true; t.repeat.set(len / 0.5, 10);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 5), new THREE.MeshBasicMaterial({ map: t, color: 0x222831, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    m.position.set(x, 2.5, z); m.rotation.y = ry; group.add(m);
    for (let i = -len / 2; i <= len / 2 + 0.01; i += 5) { const p = new THREE.Mesh(postGeo, postMat); p.position.set(x + (ry ? 0 : i), 2.6, z + (ry ? i : 0)); p.castShadow = true; group.add(p); }
  });
  trees(H, H.hi ? 130 : 64, 42, 100);
  [[-46, -66, 0.2, 0x2f6fa8], [44, 68, -0.15, 0xb4472b], [-54, 58, 0.5, 0x4d7a4a], [52, -60, 0.1, 0xc9a43a]].forEach(([x, z, ry, c]) => {
    const cont = new THREE.Mesh(new THREE.BoxGeometry(6.1, 2.6, 2.4), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.3 }));
    cont.position.set(x, 1.3, z); cont.rotation.y = ry; H.add(cont);
  });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const x = sx * (hx + 6), z = sz * (hz + 6);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 12, 8), postMat); pole.position.set(x, 6, z); pole.castShadow = true; group.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.6 })); lamp.position.set(x, 12.2, z); group.add(lamp);
  });
  H.flush();
  return {
    sky: { top: 0x3b78c8, horizon: 0xcfe0f2, ground: 0x7d8a6a, sunSize: 1 },
    sun: { color: 0xfff0d8, intensity: 2.6, dir: [34, 58, 22] }, hemi: { sky: 0xcfe0ff, ground: 0x4a5d3a, intensity: 1.0 },
    fog: { color: 0xbfd2e6, near: 90, far: 330 }, exposure: 1.05, envIntensity: 0.55,
  };
}

// ===========================================================================
// MAPA 2 — GALPÃO ABANDONADO (60 × 90 m)
// ===========================================================================
function buildGalpao(ctx) {
  const H = helpers(ctx), { group, M } = H, A = ctx.ARENA, hx = A.hx, hz = A.hz, R = hashRand(33);
  H.ground(M('floor', { base: 170, tint: [1, 0.98, 0.94] }, { bump: 0.8 }), hx * 2 + 2, hz * 2 + 2);
  const wallMat = M('corrugated', { color: [118, 134, 128], rust: 0.46, ridges: 10 }, { bump: 1.6, metal: 0.25 });
  const wallH = 12;
  [[0, hz + 1, hx * 2 + 2, 0.4], [0, -hz - 1, hx * 2 + 2, 0.4], [hx + 1, 0, 0.4, hz * 2 + 2], [-hx - 1, 0, 0.4, hz * 2 + 2]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(boxGeo(w, wallH, d, 2), wallMat); m.position.set(x, wallH / 2, z); m.receiveShadow = true; group.add(m);
  });
  const sky = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, fog: false });
  [[0, hz + 0.78, 0], [0, -hz - 0.78, PI], [hx + 0.78, 0, -PI / 2], [-hx - 0.78, 0, PI / 2]].forEach(([x, z, ry]) => {
    const alongZ = Math.abs(x) > 1, len = alongZ ? hz * 2 - 2 : hx * 2 - 2;
    for (let i = -len / 2 + 4; i < len / 2 - 3; i += 9) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.6), sky);
      p.position.set(x + (alongZ ? 0 : i), 10, z + (alongZ ? i : 0)); p.rotation.y = ry; group.add(p);
      H.decal('janela', 2, ry === 0 ? '-z' : ry === PI ? '+z' : ry > 0 ? '+x' : '-x', p.position.x, 10, p.position.z, 6.2, 2.2, { broken: false });
    }
  });
  const roof = new THREE.Mesh(planeGeo(hx * 2 + 2, hz * 2 + 2, 2), M('corrugated', { color: [100, 112, 108], rust: 0.55 }, { side: THREE.DoubleSide }));
  roof.rotation.x = PI / 2; roof.position.y = wallH; group.add(roof);
  const steel = H.paint('rust', [60, 66, 70], { tile: 1.5 }, { bump: 0.8, metal: 0.4 });
  for (let z = -(hz - 3); z <= hz - 3; z += 9) {
    const b = new THREE.Mesh(boxGeo(hx * 2 + 2, 0.5, 0.35, 1.5), steel); b.position.set(0, wallH - 0.4, z); group.add(b);
    for (let i = -(hx - 3); i <= hx - 3; i += 6) { const d = new THREE.Mesh(boxGeo(0.25, 2.4, 0.25, 1.5), steel); d.position.set(i, wallH - 1.6, z); d.rotation.z = (Math.round(i / 6) % 2 === 0 ? 0.6 : -0.6); group.add(d); }
  }
  for (let x = -(hx - 3); x <= hx - 3; x += 9) { const b = new THREE.Mesh(boxGeo(0.4, 0.4, hz * 2 + 2, 1.5), steel); b.position.set(x, wallH - 0.2, 0); group.add(b); }
  // claraboias + feixes de luz
  const sunDir = new THREE.Vector3(14, 40, 9).normalize();
  const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTexture(), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const lightPanel = new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false });
  const skylights = [];
  [-18, 0, 18].forEach((x) => [-36, -18, 0, 18, 36].forEach((z) => skylights.push([x + (z % 36 === 0 ? 4 : -2), z])));
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
  const dust = []; for (let i = 0; i < (H.hi ? 1000 : 500); i++) dust.push((H.rnd() - 0.5) * hx * 2, H.rnd() * 11, (H.rnd() - 0.5) * hz * 2);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dust, 3));
  group.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xfff1d0, size: 0.07, transparent: true, opacity: 0.4, depthWrite: false })));
  const stain = decalMaterial('mancha', 3);
  for (let i = 0; i < 9; i++) { const s = 5 + H.rnd() * 4, m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), stain); m.rotation.x = -PI / 2; m.position.set((H.rnd() - 0.5) * (hx * 2 - 10), 0.015, (H.rnd() - 0.5) * (hz * 2 - 10)); group.add(m); }
  const yellow = new THREE.MeshBasicMaterial({ color: 0xd8b21c });
  [-(hx - 5), hx - 5].forEach((x) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.25, hz * 2 - 8), yellow); l.rotation.x = -PI / 2; l.position.set(x, 0.012, 0); group.add(l); });

  const wood = M('wood', {}, { bump: 1.4 }), woodDark = M('wood', { color: [110, 80, 52] }, { bump: 1.4 });
  const metal = (c) => H.paint('corrugated', c, { rust: 0.52, ridges: 8 }, { bump: 1.8, metal: 0.3 });
  const concrete = M('concrete', { base: 150 });
  H.box({ x: 0, z: 0, w: 6, d: 2.6, h: 2.8, mat: H.paint('rust', [70, 100, 120], {}, { metal: 0.35 }) });
  sym((s) => {
    [-21, -7, 7, 21].forEach((x) => [8, 22].forEach((z) => {
      H.cyl({ x: x * s, z: z * s, r: 0.4, h: wallH, mat: concrete, seg: 16 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 16), new THREE.MeshBasicMaterial({ color: 0xd8b21c })); band.position.set(x * s, 0.5, z * s); group.add(band);
    }));
    // escritórios (barracos com porta)
    hut(H, { x: -25 * s, z: 33 * s, w: 7, d: 6, h: 3, doors: flip(['+x'], s), wallMat: metal([100, 120, 130]), floorMat: M('concrete', { base: 120 }), roofMat: metal([90, 100, 105]) });
    hut(H, { x: 25 * s, z: 14 * s, w: 6, d: 5, h: 3, doors: flip(['-x'], s), wallMat: metal([120, 110, 100]), floorMat: M('concrete', { base: 120 }), roofMat: metal([90, 100, 105]) });
  });
  towers(H, A, R, { pairs: 2, h: 2.4, mat: H.M('rust', { tile: 2 }), railMat: H.M('rust', { tile: 2 }) });
  scatter(H, A, R, { count: H.hi ? 34 : 24, margin: 2.4, zMax: hz - 8, xMax: hx - 3, make: (R) => {
    const t = R();
    if (t < 0.22) { const tall = R() < 0.5; return { w: 1.6, d: 1.6, put: (x, z) => H.box({ x, z, w: 1.6, d: 1.6, h: tall ? 3.2 : 1.6, mat: tall ? woodDark : wood }) }; }
    if (t < 0.34) return { w: 1.2, d: 1.2, put: (x, z) => H.box({ x, z, w: 1.2, d: 1.2, h: 0.55, mat: wood }) };
    if (t < 0.5) { const ax = R() < 0.5, c = [[170, 70, 50], [60, 100, 130], [90, 130, 80]][Math.floor(R() * 3)]; return { w: ax ? 6.1 : 2.5, d: ax ? 2.5 : 6.1, put: (x, z) => container(H, metal, { x, z, alongX: ax, color: c }) }; }
    if (t < 0.64) { const ax = R() < 0.5; return { w: ax ? 7 : 1.1, d: ax ? 1.1 : 7, put: (x, z) => H.box({ x, z, w: ax ? 7 : 1.1, d: ax ? 1.1 : 7, h: 2.9, mat: H.paint('rust', [58, 86, 140], { tile: 1.2 }, { bump: 1, metal: 0.45 }) }) }; }
    if (t < 0.74) return { w: 1.5, d: 2.8, put: (x, z) => { H.box({ x, z, w: 1.4, d: 2.8, h: 1.5, mat: H.paint('rust', [220, 170, 30], {}, { bump: 1.2 }) }); H.box({ x, z: z - 1.2, w: 0.3, d: 0.3, h: 3, mat: steel, collide: false }); } };
    if (t < 0.82) return { w: 5, d: 2.4, put: (x, z) => H.box({ x, z, w: 5, d: 2.4, h: 2.6, mat: H.paint('rust', [70, 100, 120], {}, { metal: 0.35 }) }) };
    if (t < 0.92) return { w: 1.6, d: 1.6, put: (x, z) => { barrel(H, x, z, [60, 90, 150]); barrel(H, x + 0.7, z + 0.4, [150, 50, 40]); barrel(H, x + 0.2, z + 1.1, [90, 90, 90]); } };
    return { w: 4, d: 0.8, put: (x, z) => H.box({ x, z, w: 4, d: 0.6, h: 1.1, mat: concrete }) };
  } });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffe3a8, fog: false });
  const lampPts = [[-20, 10], [20, -10], [0, 28], [0, -28], [-20, -32], [20, 32], [0, 0], [-22, 30], [22, -30]];
  lampPts.forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.35, 10), lamp); l.position.set(x, 8.8, z); group.add(l); });
  H.flush();
  return {
    indoor: true,
    sky: { top: 0x2a3138, horizon: 0x3a4148, ground: 0x15181b, sunSize: 3 },
    sun: { color: 0xfff0d0, intensity: 3.4, dir: [14, 40, 9] }, hemi: { sky: 0x8fa0b2, ground: 0x2a2724, intensity: 0.55 },
    fog: { color: 0x2a2f35, near: 30, far: 150 }, exposure: 1.2, envIntensity: 0.3,
    lights: [[-20, 10], [20, -10], [0, 28], [0, -28], [-20, -32], [20, 32]].map(([x, z]) => ({ color: 0xffd9a0, intensity: 13, distance: 28, pos: [x, 8, z] })),
  };
}

// ===========================================================================
// MAPA 3 — FAVELA / COMUNIDADE ("Morro Vivo", 60 × 90 m)
// ===========================================================================
function buildFavela(ctx) {
  const H = helpers(ctx), { group, M } = H, A = ctx.ARENA, hx = A.hx, hz = A.hz, R = hashRand(55);
  H.ground(M('pavers', { color: [132, 128, 120] }, { bump: 1.4 }), hx * 2 + 2, hz * 2 + 2);
  [[-(hx - 3), 0, 6, hz * 2 - 8], [hx - 3, 0, 6, hz * 2 - 8]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M('dirt', {})); m.rotation.x = -PI / 2; m.position.set(x, 0.01, z); m.receiveShadow = true; group.add(m); });
  const COLORS = [[236, 168, 64], [214, 92, 84], [70, 168, 188], [128, 184, 100], [238, 228, 204], [190, 146, 222], [246, 204, 90], [96, 136, 206]];
  const roofPts = [];
  function house({ x, z, w, d, h, style = 'plaster', c = 0, tank = 0 }) {
    const mat = style === 'brick' ? H.M('brick', {}, { bump: 1.6 }) : H.paint('plaster', COLORS[c % COLORS.length], {}, { bump: 0.9 });
    H.box({ x, z, w, d, h, mat });
    if (style === 'brick') H.box({ x, z, w: w + 0.02, d: d + 0.02, h: Math.min(2.2, h), mat: H.paint('plaster', COLORS[(c + 3) % COLORS.length], {}, { bump: 0.9 }), collide: false });
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
    if (tank) H.cyl({ x: x + w * 0.2, z: z - d * 0.15, r: 0.62, h: 1.0, y: h + 0.25, mat: new THREE.MeshStandardMaterial({ color: 0x2c78c2, roughness: 0.45 }), collide: false, seg: 16 });
    if (H.rnd() < 0.55) H.cyl({ x: x - w * 0.3, z: z + d * 0.25, r: 0.03, h: 2.2, y: h + 0.25, mat: new THREE.MeshStandardMaterial({ color: 0x777b80, metalness: 0.7, roughness: 0.4 }), collide: false, seg: 6 });
    if (style === 'brick') [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => H.cyl({ x: x + sx * (w / 2 - 0.2), z: z + sz * (d / 2 - 0.2), r: 0.05, h: 1.0, y: h + 0.25, mat: H.M('rust', {}), collide: false, seg: 6, shadow: false }));
    roofPts.push([x - w / 2, h + 0.3, z - d / 2], [x + w / 2, h + 0.3, z + d / 2], [x - w / 2, h + 0.3, z + d / 2], [x + w / 2, h + 0.3, z - d / 2]);
  }
  // praça central: bar da comunidade (barraco enterável)
  hut(H, { x: 0, z: 0, w: 6, d: 5, h: 3.4, doors: ['+z', '-z'], wallMat: H.paint('plaster', COLORS[6], {}, { bump: 0.9 }), floorMat: H.M('concrete', { base: 150 }), roofMat: H.M('concrete', { base: 160 }) });
  H.decal('grafite', 31, '+z', 2.1, 2.1, 2.55, 2.6, 2.6, { word: 'BAR' });
  const awning = new THREE.Mesh(boxGeo(4.6, 0.12, 1.4, 2), new THREE.MeshStandardMaterial({ color: 0xd9433a, roughness: 0.6 })); awning.position.set(0, 2.7, 3.0); group.add(awning);
  // quarteirões: grade de casas com becos de ~3 m (metade z>0; o resto é espelhado)
  const HUT_CELLS = new Set(['-16.5,20', '27.5,9', '-27.5,41', '16.5,41', '5.5,31']);
  const xs = [-27.5, -16.5, -5.5, 5.5, 16.5, 27.5], zs = [9, 20, 31, 41];
  const wallPal = H.M('brick', {}, { bump: 1.6 });
  sym((s) => {
    for (const cx of xs) for (const cz of zs) {
      const key = `${cx},${cz}`;
      if (Math.abs(cx) <= 6 && cz <= 9) continue;                        // alameda central
      if (cz >= 41 && Math.abs(cx) <= 17 && !HUT_CELLS.has(key)) continue; // largada livre
      const r = H.rnd();
      const jx = (H.rnd() - 0.5) * 2, jz = (H.rnd() - 0.5) * 2;
      if (HUT_CELLS.has(key)) {
        hut(H, { x: (cx + jx * 0.5) * s, z: (cz - 1 + jz * 0.5) * s, w: 4.6, d: 4, h: 3.2, doors: flip([cx < 0 ? '+x' : '-x'], s), wallMat: wallPal, floorMat: H.M('concrete', { base: 140 }), roofMat: H.M('concrete', { base: 150 }) });
        continue;
      }
      if (r < 0.9) {
        const w = 4.8 + H.rnd() * 1.8, d = 4.8 + H.rnd() * 1.8, h = [3.2, 4.5, 6.5, 7.8][Math.floor(H.rnd() * 4)];
        if (cz + d / 2 + jz > hz - 7 && Math.abs(cx) < 14) continue;
        house({ x: (cx + jx) * s, z: (cz + jz) * s, w, d, h, style: H.rnd() < 0.35 ? 'brick' : 'plaster', c: Math.floor(H.rnd() * 8) + (s < 0 ? 2 : 0), tank: H.rnd() < 0.5 ? 1 : 0 });
      } else {
        H.box({ x: (cx + jx) * s, z: cz * s, w: 2.4, d: 0.5, h: 1.1, mat: H.M('concrete', { base: 190 }) });
        barrel(H, (cx - 1.4) * s, (cz + 1.2) * s, [40, 100, 170]);
      }
    }
  });
  // detalhes entre as casas
  const brickMat = H.M('brick', {}), concMat = H.M('concrete', { base: 190 }), woodMat = H.M('wood', {});
  towers(H, A, R, { pairs: 2, h: 2.8, mat: H.M('concrete', { tile: 2 }), railMat: H.M('concrete', { tile: 2 }) });
  scatter(H, A, R, { count: H.hi ? 40 : 24, margin: 1.7, zMax: hz - 8, xMax: hx - 3, make: (R) => {
    const t = R();
    if (t < 0.34) return { w: 2.4, d: 0.5, put: (x, z) => H.box({ x, z, w: 2.4, d: 0.5, h: 1.1, mat: R() < 0.5 ? concMat : brickMat }) };
    if (t < 0.6) return { w: 1.2, d: 1.2, put: (x, z) => H.box({ x, z, w: 1.2, d: 1.2, h: 1.1, mat: woodMat }) };
    if (t < 0.85) return { w: 1.4, d: 1.4, put: (x, z) => { barrel(H, x, z, [40, 100, 170]); barrel(H, x + 0.65, z + 0.3, [190, 70, 50]); } };
    return { w: 3, d: 0.6, put: (x, z) => H.box({ x, z, w: 3, d: 0.6, h: 1.1, mat: concMat }) };
  } });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
  const circle = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.75, 40), white); circle.rotation.x = -PI / 2; circle.position.set(0, 0.012, 0); group.add(circle);
  for (let i = 0; i < roofPts.length; i++) for (let j = i + 1; j < roofPts.length; j++) {
    const a = roofPts[i], b = roofPts[j], d = Math.hypot(a[0] - b[0], a[2] - b[2]);
    if (d > 3 && d < 9.5 && H.rnd() < 0.1) (H.rnd() < 0.45 ? H.bunting(a, b, 0.7) : H.wire(a, b, 0.6 + H.rnd() * 0.5));
  }
  const wallMat2 = H.M('concrete', { base: 200, tint: [1, 0.98, 0.92] }, { bump: 0.8 });
  [[0, hz + 1, hx * 2 + 2.8, 0.6, '-z'], [0, -hz - 1, hx * 2 + 2.8, 0.6, '+z'], [hx + 1, 0, 0.6, hz * 2 + 2.8, '-x'], [-hx - 1, 0, 0.6, hz * 2 + 2.8, '+x']].forEach(([x, z, w, d, face], i) => {
    H.box({ x, z, w, d, h: 4.2, mat: wallMat2, collide: false });
    const along = w > 1, len = along ? w : d, n = Math.floor(len / 9);
    for (let k = 0; k < n; k++) {
      const off = -len / 2 + 6 + k * ((len - 12) / Math.max(1, n - 1));
      const fx = along ? x + off : x - Math.sign(x) * 0.34, fz = along ? z - Math.sign(z) * 0.34 : z + off;
      H.decal('grafite', i * 9 + k + 12, face, fx, 2.0, fz, 5, 3.5, { word: ['PAZ', 'AMOR', 'ARTE', 'VIDA', 'SAMBA', 'FÉ', 'LUZ'][(k + i) % 7] });
    }
  });
  const prof = [[56, -0.05], [74, 7], [112, 28], [230, 82]].map((p) => new THREE.Vector2(p[0], p[1]));
  const hg = new THREE.LatheGeometry(prof, 64), huv = hg.attributes.uv;
  for (let i = 0; i < huv.count; i++) huv.setXY(i, huv.getX(i) * 90, huv.getY(i) * 26);
  const hillMat = M('dirt', { color: [112, 92, 62], tile: 8 }).clone(); hillMat.side = THREE.DoubleSide;
  const hill = new THREE.Mesh(hg, hillMat); hill.scale.set(1, 1, 1.25); hill.receiveShadow = true; group.add(hill);
  const hillY = (r) => (r <= 74 ? (r - 56) * 0.39 : r <= 112 ? 7 + (r - 74) * 0.55 : 28 + (r - 112) * 0.46);
  const bk = [], cols = [0xe8a840, 0xd65a50, 0x46a8bc, 0x80b864, 0xeee4cc, 0xbe92de, 0xf6cc5a, 0x6088ce, 0xb5603c];
  for (let i = 0; i < (H.hi ? 300 : 150); i++) {
    const a = H.rnd() * PI * 2, r = 60 + H.rnd() * 80, y = hillY(r) - 0.4, w = 3 + H.rnd() * 4, d = 3 + H.rnd() * 4, h = 2.6 + H.rnd() * 4;
    bk.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 1.25, y, w, d, h, ry: -a + 1.57 + (H.rnd() - 0.5) * 0.4, color: cols[Math.floor(H.rnd() * cols.length)] });
  }
  H.backdrop(bk, H.M('plaster', {}, { bump: 0.5 }));
  H.flush();
  return {
    sky: { top: 0x4a78b8, horizon: 0xf4cf9c, ground: 0x8a6a4a, sunSize: 2.2 },
    sun: { color: 0xffc67e, intensity: 3.0, dir: [-40, 32, 24] }, hemi: { sky: 0xffd9b8, ground: 0x7a5a45, intensity: 0.95 },
    fog: { color: 0xeccaa0, near: 60, far: 260 }, exposure: 1.05, envIntensity: 0.6,
  };
}

// ===========================================================================
// MAPA 4 — FERRO-VELHO (60 × 90 m)
// ===========================================================================
function buildFerro(ctx) {
  const H = helpers(ctx), { group, M } = H, A = ctx.ARENA, hx = A.hx, hz = A.hz, R = hashRand(66);
  H.ground(M('dirt', { color: [118, 90, 62], tile: 5 }, { bump: 1.6 }), hx * 2 + 2, hz * 2 + 2);
  H.ground(M('dirt', { color: [104, 86, 62], tile: 7 }), 900, 900, -0.02);
  const oil = decalMaterial('mancha', 5);
  for (let i = 0; i < 12; i++) { const s = 6 + H.rnd() * 5, m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), oil); m.rotation.x = -PI / 2; m.position.set((H.rnd() - 0.5) * (hx * 2 - 8), 0.015, (H.rnd() - 0.5) * (hz * 2 - 8)); group.add(m); }
  const metal = (c, r = 0.5) => H.paint('corrugated', c, { rust: r < 0.65 ? 0.52 : 0.72, ridges: 8 }, { bump: 1.8, metal: 0.3 });
  const tireMat = M('concrete', { base: 44 }, { bump: 2 });
  const rustHeap = M('rust', {}, { bump: 2 });
  H.box({ x: 0, z: 0, w: 2.6, d: 9, h: 3, mat: H.paint('rust', [228, 178, 38], {}, { bump: 1.4 }) });
  for (let i = -3; i <= 3; i++) { H.decal('janela', 3, '+x', 1.33, 2.0, i * 1.2, 1, 0.9, { broken: true }); H.decal('janela', 3, '-x', -1.33, 2.0, i * 1.2, 1, 0.9, { broken: true }); }
  sym((s) => {
    hut(H, { x: -26 * s, z: 11 * s, w: 4.6, d: 4, h: 2.8, doors: flip(['+x'], s), wallMat: metal([140, 130, 110], 0.7), floorMat: M('dirt', { color: [96, 80, 60] }), roofMat: metal([120, 110, 95], 0.8) });
    hut(H, { x: -24 * s, z: 34 * s, w: 5, d: 4.4, h: 2.8, doors: flip(['+x'], s), wallMat: metal([120, 118, 108], 0.75), floorMat: M('dirt', { color: [96, 80, 60] }), roofMat: metal([110, 104, 92], 0.8) });
  });
  const CAR_COLORS = [[160, 66, 52], [70, 100, 140], [190, 170, 60], [80, 120, 90], [140, 140, 150], [180, 60, 60], [200, 120, 40]];
  towers(H, A, R, { pairs: 2, h: 2.6, mat: H.M('corrugated', { tile: 2 }), railMat: H.M('rust', { tile: 2 }) });
  scatter(H, A, R, { count: H.hi ? 46 : 30, margin: 2.5, zMax: hz - 8, xMax: hx - 3, make: (R) => {
    const t = R();
    if (t < 0.34) {
      const r2 = R();
      if (r2 < 0.16) { const k = r2 < 0.08 ? 'crash' : 'blocks', sz = sceneSize(k); return { w: sz.w, d: sz.d, put: (x, z, sg) => carScene(H, R, k, x, z, sg, CAR_COLORS) }; }
      if (r2 < 0.26) { const sz = sceneSize('flip'); return { w: sz.w, d: sz.d, put: (x, z, sg) => carScene(H, R, 'flip', x, z, sg, CAR_COLORS) }; }
    }
    if (t < 0.34) { const ax = R() < 0.5, st = R() < 0.35, c = CAR_COLORS[Math.floor(R() * 7)], c2 = CAR_COLORS[Math.floor(R() * 7)]; return { w: ax ? 4.4 : 1.9, d: ax ? 1.9 : 4.4, put: (x, z) => carStack(H, { x, z, alongX: ax, color: c, color2: c2, stacked: st, tilt: (R() - 0.5) * 0.16 }) }; }
    if (t < 0.55) { const ax = R() < 0.5, st = R() < 0.4, c = [[180, 90, 50], [60, 110, 130], [90, 130, 80], [140, 60, 50]][Math.floor(R() * 4)], c2 = [[60, 110, 130], [180, 90, 50]][Math.floor(R() * 2)]; return { w: ax ? 6.1 : 2.5, d: ax ? 2.5 : 6.1, put: (x, z) => container(H, metal, { x, z, alongX: ax, color: c, color2: c2, stack: st }) }; }
    if (t < 0.68) { const tall = R() < 0.4; return { w: 2.1, d: 2.1, put: (x, z) => { H.cyl({ x, z, r: 1.0, h: tall ? 1.3 : 1.0, mat: tireMat, seg: 16 }); if (tall) { const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.3, 10, 20), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })); t2.rotation.x = PI / 2; t2.position.set(x, 1.5, z); H.add(t2); } } }; }
    if (t < 0.8) return { w: 3.4, d: 3.8, put: (x, z) => { H.cyl({ x, z, r: 1.7, h: 1.8, rt: 0.7, mat: rustHeap, seg: 9 }); for (let k = 0; k < 5; k++) { const sl = new THREE.Mesh(boxGeo(0.2 + H.rnd() * 0.5, 0.15, 1.4, 1), H.paint('rust', [90 + H.rnd() * 60, 70, 60], {})); sl.position.set(x + (H.rnd() - 0.5) * 2.2, 1.4 + H.rnd() * 0.6, z + (H.rnd() - 0.5) * 2); sl.rotation.set(H.rnd(), H.rnd() * 3, H.rnd()); H.add(sl); } } };
    if (t < 0.9) return { w: 1.8, d: 1.8, put: (x, z) => { barrel(H, x, z, [170, 60, 40]); barrel(H, x + 0.7, z + 0.5, [60, 90, 130]); barrel(H, x - 0.1, z + 1.2, [100, 100, 100]); } };
    if (t < 0.96) return { w: 1.5, d: 1.5, put: (x, z) => H.box({ x, z, w: 1.5, d: 1.5, h: 1.5, mat: M('wood', {}) }) };
    return { w: 3.2, d: 0.7, put: (x, z) => H.box({ x, z, w: 3.2, d: 0.7, h: 1.1, mat: M('concrete', { base: 160 }) }) };
  } });
  const fence = metal([150, 130, 100], 0.75);
  [[0, hz + 1, hx * 2 + 2.8, 0.3], [0, -hz - 1, hx * 2 + 2.8, 0.3], [hx + 1, 0, 0.3, hz * 2 + 2.8], [-hx - 1, 0, 0.3, hz * 2 + 2.8]].forEach(([x, z, w, d]) => { H.box({ x, z, w, d, h: 3.6, mat: fence, collide: false }); });
  for (let i = 0; i < 18; i++) { const a = H.rnd() * PI * 2, r = 56 + H.rnd() * 26; const mound = new THREE.Mesh(new THREE.ConeGeometry(4 + H.rnd() * 5, 6 + H.rnd() * 7, 8), H.paint('rust', [78, 72, 66], {}, { bump: 2 })); mound.position.set(Math.cos(a) * r * 0.9, 3, Math.sin(a) * r * 1.2); mound.castShadow = true; group.add(mound); }
  const crane = H.paint('rust', [200, 150, 30], { tile: 1.5 }, { bump: 1.2, metal: 0.3 });
  const mast = new THREE.Mesh(boxGeo(1.2, 26, 1.2, 1.5), crane); mast.position.set(-(hx + 9), 13, -(hz + 2)); mast.castShadow = true; group.add(mast);
  const arm = new THREE.Mesh(boxGeo(1, 1, 24, 1.5), crane); arm.position.set(-(hx + 9), 26, -(hz - 9)); group.add(arm);
  const mag = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x222 })); mag.position.set(-(hx + 9), 16, -(hz - 17)); group.add(mag);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 10, 6), new THREE.MeshStandardMaterial({ color: 0x222222 })); cable.position.set(-(hx + 9), 21.2, -(hz - 17)); group.add(cable);
  trees(H, H.hi ? 44 : 22, 56, 100, [0.2, 0.28], 0.3);
  H.flush();
  return {
    sky: { top: 0x5f88b8, horizon: 0xe4d6bd, ground: 0x7a6a50, sunSize: 1.8 },
    sun: { color: 0xffe2b8, intensity: 2.7, dir: [26, 46, -30] }, hemi: { sky: 0xd0d8e6, ground: 0x6b5a45, intensity: 0.95 },
    fog: { color: 0xcfc2aa, near: 70, far: 290 }, exposure: 1.05, envIntensity: 0.6,
  };
}

// ===========================================================================
// MAPA 5 — CIDADE ABANDONADA (60 × 90 m)
// ===========================================================================
function buildCidade(ctx) {
  const H = helpers(ctx), { group, M } = H, A = ctx.ARENA, hx = A.hx, hz = A.hz, R = hashRand(77);
  H.ground(M('asphalt', { tile: 5 }, { bump: 1.2 }), hx * 2 + 2, hz * 2 + 2);
  H.ground(M('concrete', { base: 120, tile: 6 }, { bump: 1 }), 900, 900, -0.02);
  const yellow = new THREE.MeshBasicMaterial({ color: 0xd6b52a }), white = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  for (let z = -(hz - 1); z < hz - 1; z += 4) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2), yellow); l.rotation.x = -PI / 2; l.position.set(0, 0.012, z); group.add(l); }
  for (let z = -(hz - 2); z < hz - 2; z += 6) [-10, 10].forEach((x) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3), white); l.rotation.x = -PI / 2; l.position.set(x, 0.012, z); group.add(l); });
  [-1, 1].forEach((s) => { const cross = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.5), white); cross.rotation.x = -PI / 2; cross.position.set(0, 0.012, s * 8); group.add(cross); });
  const stain = decalMaterial('mancha', 7);
  for (let i = 0; i < 10; i++) { const s = 5 + H.rnd() * 3, m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), stain); m.rotation.x = -PI / 2; m.position.set((H.rnd() - 0.5) * (hx * 2 - 10), 0.015, (H.rnd() - 0.5) * (hz * 2 - 10)); group.add(m); }
  function building({ x, z, w, d, h, c = 0, collide = true }) {
    const tones = [[196, 190, 178], [168, 172, 170], [190, 176, 150], [150, 150, 146]];
    const mat = H.paint('plaster', tones[c % tones.length], {}, { bump: 1.0 });
    H.box({ x, z, w, d, h, mat, collide });
    H.box({ x, z, w: w + 0.4, d: d + 0.4, h: 0.5, y: h, mat: M('concrete', { base: 140 }), collide: false });
    const nf = Math.floor(h / 3.4);
    [['+z', x, z + d / 2 + 0.03, w, 0], ['-z', x, z - d / 2 - 0.03, w, 0], ['+x', x + w / 2 + 0.03, z, d, 1], ['-x', x - w / 2 - 0.03, z, d, 1]].forEach(([f, fx, fz, span, al]) => {
      const n = Math.max(1, Math.floor(span / 2.6));
      for (let fl = 0; fl < nf; fl++) for (let i = 0; i < n; i++) {
        if (H.rnd() < 0.08) continue;
        const off = ((i + 0.5) / n - 0.5) * span, yy = fl * 3.4 + 2.2, v = Math.floor(H.rnd() * 3);
        al ? H.decal('janela', v, f, fx, yy, fz + off, 1.5, 1.7, { broken: true }) : H.decal('janela', v, f, fx + off, yy, fz, 1.5, 1.7, { broken: true });
      }
      if (H.rnd() < 0.5) H.decal('mancha', 1, f, fx, h * 0.55, fz, span, h * 0.8);
    });
  }
  // quarteirões de prédios dos dois lados da avenida central + ruas transversais
  sym((s) => {
    [[-21, 10], [-21, 28], [21, 10], [21, 28], [-21, 39.5, 6], [21, 39.5, 6], [-9.5, 24, 4.5, 7], [9.5, 22, 4.5, 7]].forEach(([x, z, dd, ww], i) => {
      const w = ww ?? (11 + H.rnd() * 4), d = dd ?? (11 + H.rnd() * 4), h = ww ? 5 + H.rnd() * 3 : 9 + H.rnd() * 9;
      building({ x: (x + (H.rnd() - 0.5) * 2) * s, z: z * s, w, d, h, c: i + (s < 0 ? 1 : 0) });
    });
    hut(H, { x: -17 * s, z: 39.5 * s, w: 5, d: 4, h: 3.2, doors: flip(['+z'], s), wallMat: H.paint('plaster', [176, 170, 156], {}, { bump: 1.0 }), floorMat: M('concrete', { base: 120 }), roofMat: M('concrete', { base: 130 }) });
    hut(H, { x: 12 * s, z: 18 * s, w: 5.5, d: 4.4, h: 3.2, doors: flip(['-x'], s), wallMat: H.paint('plaster', [160, 156, 148], {}, { bump: 1.0 }), floorMat: M('concrete', { base: 120 }), roofMat: M('concrete', { base: 130 }) });
    [[-8, 12], [8, 8], [-8, 30], [8, 34]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 7, 8), new THREE.MeshStandardMaterial({ color: 0x3b3f44, metalness: 0.6, roughness: 0.5 })); p.position.set(x * s, 3.5, z * s); p.rotation.z = 0.05 * s; p.castShadow = true; group.add(p); });
  });
  H.box({ x: 0, z: 0, w: 6.1, d: 2.5, h: 2.6, mat: M('corrugated', { color: [70, 110, 90], rust: 0.55, ridges: 8 }, { bump: 1.8 }) });
  const concS = M('concrete', { base: 175 }), rustS = H.paint('rust', [110, 100, 92], {}, { bump: 2 });
  towers(H, A, R, { pairs: 2, h: 3.0, mat: H.M('concrete', { tile: 2 }), railMat: H.M('concrete', { tile: 2 }) });
  scatter(H, A, R, { count: H.hi ? 66 : 42, margin: 2.2, zMax: hz - 8, xMax: hx - 3, make: (R) => {
    const t = R();
    if (t < 0.36) {
      const r2 = R(), kinds = ['crash', 'burnt', 'flip', 'abandoned', 'abandoned', 'blocks'];
      if (r2 < 0.5) { const k = kinds[Math.floor(R() * kinds.length)], sz = sceneSize(k); return { w: sz.w, d: sz.d, put: (x, z, sg) => carScene(H, R, k, x, z, sg, [[120, 120, 125], [140, 60, 50], [90, 100, 110], [170, 160, 150], [60, 85, 120], [150, 120, 50]]) }; }
    }
    if (t < 0.36) { const ax = R() < 0.3, bt = R() < 0.5; return { w: ax ? 4.4 : 1.9, d: ax ? 1.9 : 4.4, put: (x, z) => car(H, { x, z, alongX: ax, color: [[120, 120, 125], [140, 60, 50], [90, 100, 110]][Math.floor(R() * 3)], burnt: bt }) }; }
    if (t < 0.58) { const ax = R() < 0.5; return { w: ax ? 3.2 : 0.7, d: ax ? 0.7 : 3.2, put: (x, z) => H.box({ x, z, w: ax ? 3.2 : 0.7, d: ax ? 0.7 : 3.2, h: 1.1, mat: concS }) }; }
    if (t < 0.74) return { w: 3, d: 2.5, put: (x, z) => H.box({ x, z, w: 3, d: 2.5, h: 1.0, mat: rustS }) };
    if (t < 0.84) return { w: 2.6, d: 8.6, put: (x, z) => bus(H, { x, z, alongX: false, color: [[60, 100, 140], [190, 150, 40], [150, 60, 50]][Math.floor(R() * 3)] }) };
    if (t < 0.93) { const ax = R() < 0.5; return { w: ax ? 6.1 : 2.5, d: ax ? 2.5 : 6.1, put: (x, z) => container(H, (c) => H.paint('corrugated', c, { rust: 0.52, ridges: 8 }, { bump: 1.8 }), { x, z, alongX: ax, color: [70, 110, 90] }) }; }
    return { w: 1.2, d: 1.2, put: (x, z) => H.box({ x, z, w: 1.2, d: 1.2, h: 1.1, mat: M('wood', {}) }) };
  } });
  const ring = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * PI * 2, r = 54 + H.rnd() * 14, w = 8 + H.rnd() * 8, d = 8 + H.rnd() * 8, h = 12 + H.rnd() * 26;
    ring.push({ x: Math.cos(a) * r * 0.95, z: Math.sin(a) * r * 1.35, y: 0, w, d, h, ry: a, color: [0xb4b0a4, 0x9fa3a4, 0xb8a98c, 0x8c9094][i % 4] });
  }
  H.backdrop(ring, H.M('concrete', { base: 190 }, { bump: 0.6 }));
  trees(H, H.hi ? 70 : 34, 50, 72, [0.2, 0.3], 0.35, 0.9, 1.3);
  H.flush();
  return {
    sky: { top: 0x6f7f90, horizon: 0xc6ccd2, ground: 0x6a6e70, sunSize: 0.6 },
    sun: { color: 0xdde6f2, intensity: 1.5, dir: [14, 52, 16] }, hemi: { sky: 0xc4ccd6, ground: 0x5a5f55, intensity: 1.35 },
    fog: { color: 0xaab4be, near: 36, far: 190 }, exposure: 1.0, envIntensity: 0.75,
  };
}

const SIZE = { hx: 30, hz: 45 };
export const MAPS = {
  arena: { name: 'Arena Speedball', tag: 'Torneio', blurb: 'Campo amplo com dezenas de bunkers infláveis. O clássico competitivo.', size: SIZE, menu: { r: 56, h: 16, rz: 1.3, look: [0, 1.4, 0] }, build: buildArena },
  galpao: { name: 'Galpão Abandonado', tag: 'Interior', blurb: 'Hall enorme com colunas, estantes, contêineres e escritórios.', size: SIZE, menu: { r: 22, h: 5, rz: 1.7, look: [0, 1.6, 0] }, build: buildGalpao },
  favela: { name: 'Morro Vivo', tag: 'Comunidade', blurb: 'Labirinto de becos, lajes e muita cor. Combate vertical e curto.', size: SIZE, menu: { r: 34, h: 17, rz: 1.4, look: [0, 1.6, 0] }, build: buildFavela },
  ferro: { name: 'Ferro-Velho', tag: 'Industrial', blurb: 'Pátio gigante de carcaças empilhadas, pneus e contêineres.', size: SIZE, menu: { r: 44, h: 14, rz: 1.3, look: [0, 1.4, 0] }, build: buildFerro },
  cidade: { name: 'Cidade Abandonada', tag: 'Urbano', blurb: 'Avenidas, quarteirões em ruínas e ônibus tombado.', size: SIZE, menu: { r: 40, h: 16, rz: 1.35, look: [0, 1.6, 0] }, build: buildCidade },
};
export const MAP_LIST = Object.keys(MAPS);
