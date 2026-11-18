import * as THREE from './vendor/three.module.min.js';

export const ARENA = { hx: 20, hz: 30 };
export const TEAM_PAINT = [0xff8a00, 0x00b4ff]; // 0 = laranja, 1 = azul
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function noiseTexture(base, amp, repeatX, repeatY, size = 256) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const n = (Math.random() - 0.5) * amp;
    const b = Math.random() < 0.02 ? -amp * 0.6 : 0;
    img.data[i * 4] = clamp(base[0] + n + b, 0, 255);
    img.data[i * 4 + 1] = clamp(base[1] + n * 1.1 + b, 0, 255);
    img.data[i * 4 + 2] = clamp(base[2] + n * 0.7 + b, 0, 255);
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function fabricTexture() {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#e8e8e8';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(0,0,0,0.10)';
  g.lineWidth = 1;
  for (let i = 0; i < 64; i += 4) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function netTexture() {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  g.strokeStyle = '#fff';
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function splatCanvas(big = false) {
  const s = 128;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  g.translate(64, 64);
  g.fillStyle = '#fff';
  g.beginPath();
  const n = 30;
  const phase = Math.random() * 6;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (big ? 30 : 17) + Math.sin(a * 3 + phase) * 5 + Math.sin(a * 7 + phase * 2) * 3 + rand(-1.5, 1.5);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.fill();
  const drops = big ? 6 : 12;
  for (let k = 0; k < drops; k++) {
    const a = rand(0, Math.PI * 2);
    const dist = rand(big ? 36 : 24, 58);
    const r = rand(2, big ? 5 : 7);
    g.beginPath();
    g.arc(Math.cos(a) * dist, Math.sin(a) * dist, r, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = r * 0.7;
    g.strokeStyle = '#fff';
    g.beginPath();
    g.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
    g.lineTo(Math.cos(a) * dist, Math.sin(a) * dist);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundedBox(w, h, d, r) {
  const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const inner = new THREE.Vector3(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
    const dir = v.clone().sub(inner);
    if (dir.lengthSq() > 1e-9) { dir.setLength(r); v.copy(inner).add(dir); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
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

// cilindro vertical; devolve {t, nx, ny, nz} ou null
export function segCyl(p0, d, cx, cz, r, y0, y1) {
  let best = null;
  const ox = p0.x - cx, oz = p0.z - cz;
  const a = d.x * d.x + d.z * d.z;
  if (a > 1e-12) {
    const b = 2 * (ox * d.x + oz * d.z);
    const c = ox * ox + oz * oz - r * r;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t >= 0 && t <= 1) {
        const y = p0.y + d.y * t;
        if (y >= y0 && y <= y1) {
          best = { t, nx: (ox + d.x * t) / r, ny: 0, nz: (oz + d.z * t) / r };
        }
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
    if (Math.abs(dd[i]) < 1e-9) {
      if (o[i] < min[i] || o[i] > max[i]) return null;
    } else {
      let t1 = (min[i] - o[i]) / dd[i], t2 = (max[i] - o[i]) / dd[i], s = -1;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
      if (t1 > tmin) { tmin = t1; nx = ny = nz = 0; if (i === 0) nx = s; else if (i === 1) ny = s; else nz = s; }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return { t: tmin, nx, ny, nz };
}

// ---------- mundo ----------
const HALF = [
  ['cyl', -8, 5.5, 0.6, 1.6], ['cyl', 8, 5.5, 0.6, 1.6],
  ['cyl', 0, 9.5, 0.6, 1.9],
  ['cyl', -14, 12, 0.6, 1.6], ['cyl', 14, 12, 0.6, 1.6],
  ['cyl', -5, 17, 0.6, 1.9], ['cyl', 5, 17, 0.6, 1.9],
  ['cyl', -4, 24, 0.65, 1.7], ['cyl', 4, 24, 0.65, 1.7],
  ['box', -3.5, 6, 1.8, 1.8, 1.1], ['box', 3.5, 6, 1.8, 1.8, 1.1],
  ['box', -10, 16, 3.2, 0.9, 1.9], ['box', 10, 16, 3.2, 0.9, 1.9],
  ['box', -17, 4, 0.9, 3, 1.9], ['box', 17, 4, 0.9, 3, 1.9],
  ['box', -11, 22, 1.8, 1.8, 1.1], ['box', 11, 22, 1.8, 1.8, 1.1],
  ['box', 0, 13.5, 2.4, 0.9, 1.9],
];
const PALETTE = [0xf2c230, 0xe8eef2, 0x2c3036, 0x2f7fc9, 0xe0701f, 0xc83a3a];

export function buildWorld(scene, quality = 'high') {
  const hi = quality === 'high';
  const obstacles = [];
  const list = [['cyl', 0, 0, 0.65, 1.9]];
  HALF.forEach((o) => {
    list.push(o);
    const m = o.slice();
    m[1] = -o[1];
    m[2] = -o[2];
    list.push(m);
  });

  // luz e céu
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x4a5d3a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(28, 48, 18);
  sun.castShadow = true;
  const ss = sun.shadow;
  ss.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  ss.camera.left = -42; ss.camera.right = 42; ss.camera.top = 42; ss.camera.bottom = -42;
  ss.camera.near = 5; ss.camera.far = 130;
  ss.bias = -0.0004; ss.normalBias = 0.04;
  scene.add(sun);
  scene.fog = new THREE.Fog(0xbfd2e6, 70, 260);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 hor = vec3(0.80,0.88,0.96); vec3 top = vec3(0.22,0.46,0.80); vec3 c = mix(hor, top, pow(clamp(h,0.0,1.0),0.55)); c = mix(c, vec3(0.55,0.62,0.55), clamp(-h*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0);} ',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), skyMat);
  scene.add(sky);

  // chão
  const turf = noiseTexture([60, 98, 46], 46, 40, 50);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA.hx * 2 + 4, ARENA.hz * 2 + 4),
    new THREE.MeshStandardMaterial({ map: turf, bumpMap: turf, bumpScale: 0.6, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ map: noiseTexture([70, 92, 52], 46, 160, 160), roughness: 1 })
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.02;
  outer.receiveShadow = true;
  scene.add(outer);

  // linhas e bases
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  const mid = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.hx * 2, 0.15), lineMat);
  mid.rotation.x = -Math.PI / 2; mid.position.y = 0.01; scene.add(mid);
  [1, -1].forEach((s, i) => {
    const st = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.12, 2.4),
      new THREE.MeshStandardMaterial({ color: TEAM_PAINT[i], roughness: 0.6 })
    );
    st.position.set(0, 0.06, s * 28.6);
    st.receiveShadow = true;
    scene.add(st);
  });

  // bunkers
  const fabric = fabricTexture();
  list.forEach((o, idx) => {
    const color = PALETTE[Math.floor((idx + 1) / 2) % PALETTE.length];
    const mat = new THREE.MeshStandardMaterial({ color, map: fabric, roughness: 0.62, metalness: 0 });
    let mesh;
    if (o[0] === 'cyl') {
      const [, x, z, r, h] = o;
      const prof = [[r, 0], [r, h - 0.22], [r * 0.92, h - 0.08], [r * 0.7, h - 0.015], [0.001, h]]
        .map((p) => new THREE.Vector2(p[0], p[1]));
      mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), mat);
      mesh.position.set(x, 0, z);
      obstacles.push({ type: 'cyl', x, z, r, h });
    } else {
      const [, x, z, w, d, h] = o;
      mesh = new THREE.Mesh(roundedBox(w, h, d, 0.17), mat);
      mesh.position.set(x, h / 2, z);
      obstacles.push({ type: 'box', x, z, w, d, h });
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // rede de proteção
  const net = netTexture();
  const netMat = (len) => {
    const t = net.clone();
    t.needsUpdate = true;
    t.repeat.set(len / 0.5, 5 / 0.5);
    return new THREE.MeshBasicMaterial({ map: t, color: 0x222831, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  };
  const sides = [
    [0, ARENA.hz + 1, 0, ARENA.hx * 2 + 2], [0, -ARENA.hz - 1, 0, ARENA.hx * 2 + 2],
    [ARENA.hx + 1, 0, Math.PI / 2, ARENA.hz * 2 + 2], [-ARENA.hx - 1, 0, Math.PI / 2, ARENA.hz * 2 + 2],
  ];
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.2, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 });
  sides.forEach(([x, z, ry, len]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 5), netMat(len));
    m.position.set(x, 2.5, z); m.rotation.y = ry; scene.add(m);
    for (let i = -len / 2; i <= len / 2 + 0.01; i += 5) {
      const p = new THREE.Mesh(postGeo, postMat);
      const lx = ry ? 0 : i, lz = ry ? i : 0;
      p.position.set(x + lx, 2.6, z + lz);
      p.castShadow = true;
      scene.add(p);
    }
  });

  // cenário de fundo: árvores, contêineres, refletores
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 5, 6);
  const leafGeo = new THREE.IcosahedronGeometry(3.4, 1);
  const N = hi ? 90 : 45;
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 1 }), N);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rand(-0.04, 0.04);
    const rx = 36 + rand(0, 40), rz = 46 + rand(0, 40);
    const s = rand(0.8, 1.7);
    pos.set(Math.cos(a) * rx, 2.5 * s, Math.sin(a) * rz);
    sc.set(s, s, s);
    m4.compose(pos, q, sc); trunks.setMatrixAt(i, m4);
    pos.y = 6.2 * s;
    sc.set(s * rand(0.9, 1.2), s, s * rand(0.9, 1.2));
    m4.compose(pos, q, sc); leaves.setMatrixAt(i, m4);
    leaves.setColorAt(i, col.setHSL(rand(0.24, 0.32), 0.45, rand(0.2, 0.32)));
  }
  trunks.castShadow = leaves.castShadow = false;
  scene.add(trunks, leaves);
  [[-30, -44, 0.2, 0x2f6fa8], [29, 45, -0.15, 0xb4472b], [-36, 38, 0.5, 0x4d7a4a]].forEach(([x, z, ry, c]) => {
    const cont = new THREE.Mesh(new THREE.BoxGeometry(6.1, 2.6, 2.4), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.3 }));
    cont.position.set(x, 1.3, z); cont.rotation.y = ry; cont.castShadow = true; cont.receiveShadow = true; scene.add(cont);
  });
  [[-25, -34], [25, -34], [-25, 34], [25, 34]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 12, 8), postMat);
    pole.position.set(x, 6, z); pole.castShadow = true; scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.6 }));
    lamp.position.set(x, 12.2, z); scene.add(lamp);
  });

  // pontos de cobertura para os bots
  const coverSpots = [];
  const inside = (x, z, m) => obstacles.some((o) => {
    if (o.type === 'cyl') return Math.hypot(x - o.x, z - o.z) < o.r + m;
    return Math.abs(x - o.x) < o.w / 2 + m && Math.abs(z - o.z) < o.d / 2 + m;
  });
  obstacles.forEach((o) => {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
      let reach = o.type === 'cyl' ? o.r : Math.min(o.w / 2 / Math.max(Math.abs(dx), 1e-3), o.d / 2 / Math.max(Math.abs(dz), 1e-3));
      reach += 0.6;
      const x = o.x + dx * reach, z = o.z + dz * reach;
      if (Math.abs(x) < ARENA.hx - 1.5 && Math.abs(z) < ARENA.hz - 1.5 && !inside(x, z, 0.45)) coverSpots.push({ x, z });
    }
  });

  // respingos (decals)
  const variants = [0, 1, 2, 3].map((i) => splatCanvas(i === 3));
  const splatMats = TEAM_PAINT.map((c) => variants.map((tex) => new THREE.MeshStandardMaterial({
    map: tex, color: c, emissive: c, emissiveIntensity: 0.18, roughness: 0.3, metalness: 0,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  })));
  const splatGeo = new THREE.PlaneGeometry(1, 1);
  const MAX_SPLATS = hi ? 420 : 220;
  const splats = [];
  for (let i = 0; i < MAX_SPLATS; i++) {
    const m = new THREE.Mesh(splatGeo, splatMats[0][0]);
    m.visible = false;
    scene.add(m);
    splats.push(m);
  }
  let splatI = 0;
  const Z = new THREE.Vector3(0, 0, 1);

  const world = {
    obstacles, coverSpots, splatMats,
    splatMaterial: (team, v) => splatMats[team][v % 4],
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
    // primeiro obstáculo/chão no segmento p0->p1 (ou null)
    segHit(p0, p1, withGround = true) {
      const d = new THREE.Vector3().subVectors(p1, p0);
      let best = null;
      const min = [0, 0, 0], max = [0, 0, 0];
      for (const o of obstacles) {
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
    insideObstacle: inside,
    collide(p, r) {
      for (const o of obstacles) {
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
