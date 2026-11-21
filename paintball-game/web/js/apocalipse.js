// ZONA ZERO — cenário apocalíptico: rodovia colapsada, engarrafamento carbonizado, helicópteros caídos que dá para ENTRAR,
// ruínas, trincheiras de sacos de areia, árvores mortas, fogo, fumaça e cinzas no ar. Layout simétrico (justo para os dois times).
//
// Desenho de nível (leitura "de jogador"):
//  • 3 corredores — centro (rodovia: carros queimados em faixas, canteiro com brechas), flancos esquerdo/direito (ruínas e helicópteros leves);
//  • objetivo no meio: o helicóptero de transporte (cobertura sólida + interior com duas portas em lados opostos, sem linha de tiro reta);
//  • terreno alto: pilares do viaduto com rampas (torres), expostos mas com visão geral — risco/recompensa;
//  • entradas: portas dos helicópteros e das ruínas; janelas altas dos leves permitem atirar de dentro;
//  • largadas: trincheira de sacos de areia a ~12 m de cada base, área de largada livre.
import * as THREE from './vendor/three.module.min.js';
import { buildTransportHeli, buildLightHeli } from './helicopters.js';
const PI = Math.PI;

let TEX = null;
function textures() {
  if (TEX) return TEX;
  const mk = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  TEX = {
    flame: mk((g) => {
      const gr = g.createRadialGradient(64, 78, 4, 64, 70, 56); gr.addColorStop(0, 'rgba(255,245,190,1)'); gr.addColorStop(0.25, 'rgba(255,170,50,.95)'); gr.addColorStop(0.6, 'rgba(230,70,10,.55)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(64, 4); g.bezierCurveTo(96, 40, 112, 70, 90, 110); g.lineTo(38, 110); g.bezierCurveTo(14, 70, 32, 40, 64, 4); g.fill();
    }),
    smoke: mk((g) => { for (let i = 0; i < 5; i++) { const x = 40 + Math.random() * 48, y = 40 + Math.random() * 48, r = 26 + Math.random() * 18, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(34,30,28,.55)'); gr.addColorStop(1, 'rgba(34,30,28,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } }),
    soot: mk((g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(8,6,5,.9)'); gr.addColorStop(0.55, 'rgba(12,9,7,.55)'); gr.addColorStop(1, 'rgba(12,9,7,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }),
  };
  return TEX;
}
function deadTreeGeo() {
  const parts = [], add = (r0, r1, len, x, y, z, rx, rz) => { const g = new THREE.CylinderGeometry(r1, r0, len, 5); g.translate(0, len / 2, 0); g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); parts.push(g); };
  add(0.2, 0.07, 5.2, 0, 0, 0, 0.04, 0.03);
  [[2.2, 0.9, 0.5], [3.0, -0.8, 0.6], [3.7, 0.7, -0.6], [2.8, -0.5, -0.8], [4.4, 0.4, 0.3]].forEach(([y, rz, rx]) => add(0.06, 0.02, 1.7 - y * 0.15, 0, y, 0, rx, rz));
  const out = []; parts.forEach((g) => { g.deleteAttribute('uv'); out.push(g.toNonIndexed()); });
  let n = 0; out.forEach((g) => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  out.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return geo;
}

export function buildApocalipse(ctx, L) {
  const { helpers, hashRand, car, bus, carScene, sceneSize, hut, scatter, towers, sym, flip, container, barrel, decalMaterial, overlaps } = L;
  const H = helpers(ctx), { group, M } = H, A = ctx.ARENA, hx = A.hx, hz = A.hz, R = hashRand(404), T = textures(), anim = ctx.anim || [];
  const hi = H.hi, fires = [], smokes = [], lights = [];

  // ------------------------------------------------------------- terreno: cinza e terra queimada + rodovia + manchas de fuligem
  H.ground(M('dirt', { color: [96, 82, 70], tile: 6 }, { bump: 1.3 }), hx * 2 + 2, hz * 2 + 2);
  H.ground(M('dirt', { color: [70, 58, 50], tile: 8 }), 900, 900, -0.02);
  const road = M('asphalt', { tile: 5 }, { bump: 1.4 });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(21, hz * 2 + 2), road.clone()); m.material.color.set(0xb4aca4); m.rotation.x = -PI / 2; m.position.set(0, 0.012, 0); m.receiveShadow = true; group.add(m); }
  const faded = new THREE.MeshBasicMaterial({ color: 0xb9b2a0, transparent: true, opacity: 0.55 }), amber = new THREE.MeshBasicMaterial({ color: 0xb08a22, transparent: true, opacity: 0.6 });
  for (let z = -(hz - 1); z < hz - 1; z += 5) [-5.1, 5.1].forEach((x) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 2.6), faded); l.rotation.x = -PI / 2; l.position.set(x, 0.02, z); group.add(l); });
  [-0.12, 0.12].forEach((x) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, hz * 2), amber); l.rotation.x = -PI / 2; l.position.set(x, 0.02, 0); group.add(l); });
  const soot = new THREE.MeshBasicMaterial({ map: T.soot, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (let i = 0; i < 20; i++) { const s = 4 + R() * 7, m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), soot); m.rotation.x = -PI / 2; m.rotation.z = R() * 6; m.position.set((R() - 0.5) * (hx * 2 - 6), 0.025, (R() - 0.5) * (hz * 2 - 8)); group.add(m); }
  const stain = decalMaterial('mancha', 3);
  for (let i = 0; i < 8; i++) { const s = 5 + R() * 4, m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), stain); m.rotation.x = -PI / 2; m.position.set((R() - 0.5) * 18, 0.03, (R() - 0.5) * (hz * 2 - 10)); group.add(m); }

  // ------------------------------------------------------------- materiais
  const conc = M('concrete', { base: 110, tile: 3 }, { bump: 1.1 }), concD = M('concrete', { base: 70, tile: 3 }, { bump: 1.2 });
  const olive = H.M('carpaint', { color: [82, 90, 64], wear: 1, small: true }, { metal: 0.25 }), oliveBurnt = H.M('carpaint', { color: [200, 200, 200], wear: 2, small: true }, { metal: 0.05 });
  const metalFloor = H.paint('rust', [90, 92, 96], {}, { bump: 1.2 }), crate = M('wood', {}), rust = H.paint('rust', [110, 78, 58], {}, { bump: 2 });
  const plaster = H.paint('plaster', [96, 88, 80], {}, { bump: 1.3 }), brick = H.paint('plaster', [88, 74, 66], {}, { bump: 1.5 });

  // ------------------------------------------------------------- o helicóptero de transporte no meio (objetivo) — dá para entrar
  const big = buildTransportHeli(H, { x: 0, z: 0, ry: 0, paint: olive, paintBurnt: oliveBurnt, floorMat: metalFloor, crateMat: crate });
  fires.push(...big.fires.map((f) => ({ ...f, s: 2.2 }))); smokes.push(...big.smoke.map((s) => ({ ...s, h: 18, w: 3 })));
  lights.push({ color: 0xff7a2a, intensity: 2.6, distance: 22, pos: [0.2, 3.2, 2.6] });

  // ------------------------------------------------------------- engarrafamento carbonizado na rodovia (faixas), espelhado por simetria central
  const jam = [], lanes = [-6.9, -3.5, 3.5, 6.9], palette = [[110, 112, 118], [140, 60, 50], [90, 100, 112], [170, 160, 148], [60, 85, 120], [150, 120, 50], [60, 90, 70], [180, 180, 175]];
  for (const lx of lanes) {
    for (let z = 9.5; z < hz - 9;) {
      if (R() < 0.2) { z += 3.5; continue; }
      const kind = R() < 0.1 ? 'bus' : ['hatch', 'hatch', 'sedan', 'sedan', 'suv', 'pickup', 'van', 'fusca'][Math.floor(R() * 8)];
      jam.push({ x: lx + (R() - 0.5) * 0.7, z: z + 2.2, kind, color: palette[Math.floor(R() * palette.length)], wear: R() < 0.7 ? 2 : 1, yaw: (R() - 0.5) * 0.2, open: R() < 0.22, flat: R() < 0.5, crunch: R() < 0.12 ? 0.8 : 0, fire: R() < 0.1 });
      z += (kind === 'bus' ? 10.2 : 5.4) + R() * 3.2;
    }
  }
  jam.forEach((j, i) => [1, -1].forEach((s) => {
    const dir = (j.x > 0 ? 1 : -1) * s > 0 ? 0 : PI;                               // mão e contramão
    if (j.kind === 'bus') bus(H, { x: j.x * s, z: j.z * s, alongX: false, color: j.color, wear: 2, flat: true });
    else car(H, { x: j.x * s, z: j.z * s, alongX: false, yaw: (dir === 0 ? PI : 0) + j.yaw + (s < 0 ? PI : 0), color: j.color, kind: j.kind, wear: j.wear, doorOpen: j.open, flat: j.flat, crunch: j.crunch });
    if (j.fire && s > 0 && fires.length < 11) { fires.push({ x: j.x, y: 1.2, z: j.z, s: 1.3 }); smokes.push({ x: j.x, y: 1.4, z: j.z, h: 11, w: 1.6 }); if (lights.length < 6) lights.push({ color: 0xff6a20, intensity: 1.6, distance: 12, pos: [j.x, 1.6, j.z] }); }
  }));

  // canteiro central (barreiras New Jersey com brechas) e guard-rails
  sym((s) => {
    for (let z = 10; z < hz - 8; z += 3.3) { if (Math.abs(z - 24) < 1.7 || Math.abs(z - 33) < 1.7) continue; H.box({ x: 0, z: z * s, w: 0.55, d: 3.0, h: 0.95, mat: conc }); }
    for (let z = 8; z < hz - 8; z += 8) [-10.8, 10.8].forEach((x) => { if (Math.abs(z - 20) < 3.5) return; H.box({ x, z: z * s, w: 0.14, d: 6.5, h: 0.78, mat: rust }); });
  });

  // ------------------------------------------------------------- helicópteros leves caídos nos flancos (porta virada para a rodovia)
  [[-17.5, 13.5, 0], [-18.5, -27, 0]].forEach(([px, pz, ry]) => [1, -1].forEach((s) => {
    const r = buildLightHeli(H, { x: px * s, z: pz * s, ry: s > 0 ? ry : ry + PI, paint: H.M('carpaint', { color: [170, 170, 162], wear: 1, small: true }, { metal: 0.3 }), paintBurnt: oliveBurnt, floorMat: metalFloor });
    if (s > 0) { fires.push(...r.fires.map((f) => ({ ...f, s: 1.2 }))); smokes.push(...r.smoke.map((q) => ({ ...q, h: 12, w: 1.8 }))); }
  }));

  // terreno alto (rampa do viaduto desabado): escolhe os lugares livres ANTES das ruínas
  towers(H, A, R, { pairs: 2, h: 2.8, mat: conc, railMat: concD });
  const free = (x, z, w, d) => !overlaps(H, x, z, w, d, 1.2);

  // ------------------------------------------------------------- ruínas enterráveis + paredes quebradas nos flancos
  sym((s) => {
    if (free(-23 * s, 31 * s, 6.5, 5)) hut(H, { x: -23 * s, z: 31 * s, w: 6.5, d: 5, h: 3.4, doors: flip(['+x'], s), wallMat: brick, floorMat: concD, roofMat: concD });
    if (free(23 * s, 8 * s, 5, 6.5)) hut(H, { x: 23 * s, z: 8 * s, w: 5, d: 6.5, h: 3.2, doors: flip(['-z'], s), wallMat: plaster, floorMat: concD, roofMat: concD });
    // paredes ruídas (em "L" e pedaços soltos) — cobertura de altura variada
    [[-21, 20, 5.2, 0.45, 2.6], [-24.5, 22.5, 0.45, 5.0, 3.2], [-14, 38, 4.2, 0.45, 2.0], [22, 21, 0.45, 5.4, 2.4], [18, 30, 5.2, 0.45, 3.0]].forEach(([x, z, w, d, h]) => { if (free(x * s, z * s, w, d)) H.box({ x: x * s, z: z * s, w, d, h, mat: plaster }); });
  });
  // viaduto desabado: pilares com lajes quebradas e ferragens (a laje inclinada é só visual; o pilar é cobertura)
  sym((s) => {
    if (!free(13.5 * s, 16 * s, 2.2, 2.2)) return;
    H.box({ x: 13.5 * s, z: 16 * s, w: 2.2, d: 2.2, h: 6.5, mat: concD });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(11, 0.9, 5.4), conc); slab.position.set(13.5 * s + 3.4 * s, 4.1, 16 * s); slab.rotation.z = 0.5 * s; slab.rotation.y = 0.2; slab.castShadow = true; group.add(slab);
    for (let k = 0; k < 8; k++) { const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6 + R() * 1.4, 5), M('rust', {}, {})); rb.position.set(13.5 * s + (R() - 0.2) * 3 * s, 6.8 + R(), 16 * s + (R() - 0.5) * 4); rb.rotation.set((R() - 0.5) * 0.8, 0, (R() - 0.5) * 0.9); group.add(rb); }
  });

  // ------------------------------------------------------------- trincheiras de sacos de areia perto das bases
  const sand = H.paint('plaster', [128, 108, 78], {}, { bump: 2 });
  sym((s) => {
    [[-8, 29, 5.5, 0.55], [8, 29, 5.5, 0.55], [-12.5, 27.2, 0.55, 3.2], [12.5, 27.2, 0.55, 3.2], [0, 26, 3.4, 0.55]].forEach(([x, z, w, d]) => { H.box({ x: x * s, z: z * s, w, d, h: 1.05, mat: sand }); H.box({ x: x * s, z: z * s, w: w * 0.92, d: d * 0.92, h: 0.3, y: 1.05, mat: sand, collide: false }); });
    barrel(H, 10.4 * s, 31.5 * s, [150, 70, 40]); barrel(H, 10.9 * s, 32.6 * s, [90, 95, 100]);
    fires.push({ x: 10.6 * s, y: 1.0, z: 32 * s, s: 0.8 }); if (s > 0 && lights.length < 6) lights.push({ color: 0xff8a30, intensity: 1.5, distance: 11, pos: [10.6, 1.6, 32] });
  });

  // ------------------------------------------------------------- terreno alto (rampa do viaduto), cenas de carros e entulho
  const rubble = M('concrete', { base: 90, tile: 2 }, { bump: 1.6 });
  scatter(H, A, R, { count: hi ? 44 : 30, margin: 2.3, zMax: hz - 8, xMax: hx - 3, make: (R) => {
    const t = R();
    if (t < 0.3) { const k = ['crash', 'burnt', 'burnt', 'flip', 'abandoned', 'blocks'][Math.floor(R() * 6)], sz = sceneSize(k); return { w: sz.w, d: sz.d, put: (x, z, sg) => carScene(H, R, k, x, z, sg, palette) }; }
    if (t < 0.5) { const h = 1.0 + R() * 0.8; return { w: 3.4, d: 3.4, put: (x, z) => H.cyl({ x, z, r: 1.6, h, rt: 0.6, mat: rubble, seg: 8 }) }; }
    if (t < 0.65) return { w: 3.2, d: 0.9, put: (x, z) => H.box({ x, z, w: 3.2, d: 0.9, h: 1.05, mat: conc }) };
    if (t < 0.75) return { w: 1.8, d: 1.8, put: (x, z) => { barrel(H, x, z, [150, 70, 40]); barrel(H, x + 0.7, z + 0.5, [80, 84, 90]); } };
    if (t < 0.88) { const ax = R() < 0.5; return { w: ax ? 6.1 : 2.5, d: ax ? 2.5 : 6.1, put: (x, z) => container(H, (c) => H.paint('corrugated', c, { rust: 0.7, ridges: 8 }, { bump: 1.8 }), { x, z, alongX: ax, color: [92, 64, 48] }) }; }
    return { w: 2.6, d: 0.7, put: (x, z) => H.box({ x, z, w: 2.6, d: 0.7, h: 2.2 + R() * 0.8, mat: plaster }) };
  } });

  // ------------------------------------------------------------- horizonte: prédios carbonizados, árvores mortas, fumaça ao longe
  const ring = [];
  for (let i = 0; i < 44; i++) { const a = (i / 44) * PI * 2, r = 56 + R() * 14, w = 8 + R() * 10, d = 8 + R() * 10, h = 14 + R() * 38; ring.push({ x: Math.cos(a) * r * 0.95, z: Math.sin(a) * r * 1.35, y: 0, w, d, h, ry: a, color: [0x1b1918, 0x242120, 0x151312, 0x2a2523][i % 4] }); }
  H.backdrop(ring, H.M('concrete', { base: 90 }, { bump: 0.6 }));
  { // árvores mortas (instanciadas): algumas no campo (só visual) e muitas no anel
    const n = hi ? 70 : 34, im = new THREE.InstancedMesh(deadTreeGeo(), new THREE.MeshStandardMaterial({ color: 0x2a221d, roughness: 1 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const a = R() * PI * 2, r = 36 + R() * 34, s = 0.8 + R() * 0.9; p.set(Math.cos(a) * r * 0.9, 0, Math.sin(a) * r * 1.3); if (Math.abs(p.x) < hx + 1 && Math.abs(p.z) < hz + 1) p.x += 26 * Math.sign(p.x || 1); q.setFromEuler(e.set(0, R() * 6, 0)); sc.set(s, s * (0.8 + R() * 0.7), s); m4.compose(p, q, sc); im.setMatrixAt(i, m4); }
    im.castShadow = true; im.frustumCulled = false; group.add(im);
  }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.4; smokes.push({ x: Math.cos(a) * 62, y: 0, z: Math.sin(a) * 88, h: 46, w: 7 }); }

  // ------------------------------------------------------------- fogo, fumaça e cinzas (animados)
  const flameMat = new THREE.SpriteMaterial({ map: T.flame, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const flames = fires.slice(0, hi ? 11 : 7).map((f) => { const sp = new THREE.Sprite(flameMat); sp.position.set(f.x, f.y, f.z); sp.scale.set(f.s * 1.3, f.s * 1.9, 1); sp.center.set(0.5, 0.1); group.add(sp); return { sp, f, ph: R() * 6 }; });
  const smokeMat = new THREE.SpriteMaterial({ map: T.smoke, color: 0x3a3330, transparent: true, depthWrite: false, opacity: 0.55 });
  const puffs = [];
  smokes.slice(0, hi ? 16 : 8).forEach((c) => { const n = hi ? 7 : 4; for (let k = 0; k < n; k++) { const sp = new THREE.Sprite(smokeMat.clone()); sp.renderOrder = 3; group.add(sp); puffs.push({ sp, c, ph: k / n + R() * 0.05, sp0: 0.12 + R() * 0.08 }); } });
  // cinzas e brasas flutuando
  const N = hi ? 420 : 180, apos = new Float32Array(N * 3), acol = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { apos[i * 3] = (R() - 0.5) * hx * 2.4; apos[i * 3 + 1] = R() * 16; apos[i * 3 + 2] = (R() - 0.5) * hz * 2.2; const ember = R() < 0.18; acol[i * 3] = ember ? 1 : 0.55; acol[i * 3 + 1] = ember ? 0.5 : 0.5; acol[i * 3 + 2] = ember ? 0.18 : 0.48; }
  const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(apos, 3)); ag.setAttribute('color', new THREE.BufferAttribute(acol, 3));
  const ash = new THREE.Points(ag, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false })); ash.frustumCulled = false; group.add(ash);
  anim.push((dt, t) => {
    flames.forEach(({ sp, f, ph }) => { const k = 1 + 0.18 * Math.sin(t * 9 + ph) + 0.1 * Math.sin(t * 15 + ph * 2); sp.scale.set(f.s * 1.3 * (0.9 + 0.1 * Math.sin(t * 7 + ph)), f.s * 1.9 * k, 1); sp.material.rotation = 0.05 * Math.sin(t * 5 + ph); });
    puffs.forEach((p) => { const life = (t * p.sp0 + p.ph) % 1, c = p.c; p.sp.position.set(c.x + Math.sin(life * 5 + p.ph * 9) * c.w * 0.4 + life * c.w * 1.2, c.y + life * c.h, c.z + Math.cos(life * 4 + p.ph * 7) * c.w * 0.3); const s = c.w * (0.7 + life * 2.6); p.sp.scale.set(s, s, 1); p.sp.material.opacity = Math.sin(life * PI) * 0.5; });
    const a = ag.attributes.position.array;
    for (let i = 0; i < N; i++) { a[i * 3 + 1] -= dt * (0.5 + (i % 5) * 0.12); a[i * 3] += dt * (0.9 + Math.sin(t * 0.5 + i) * 0.4); if (a[i * 3 + 1] < 0) { a[i * 3 + 1] = 15 + (i % 3); } if (a[i * 3] > hx * 1.2) a[i * 3] = -hx * 1.2; }
    ag.attributes.position.needsUpdate = true;
  });

  H.flush();
  return {
    sky: { top: 0x3a2a26, horizon: 0xc2582a, ground: 0x2a1d17, sunSize: 2.4, clouds: 0.9 },
    sun: { color: 0xffa466, intensity: 2.1, dir: [-38, 30, 30] }, hemi: { sky: 0xc59278, ground: 0x5a4538, intensity: 1.9 },
    fog: { color: 0x7d523c, near: 18, far: 120 }, exposure: 1.3, envIntensity: 1.0,
    lights,
  };
}
