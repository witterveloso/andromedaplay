// Helicópteros caídos, ENTRÁVEIS: paredes/pisos com colisão (dá para entrar pelas portas, se esconder e atirar de dentro),
// casco com teto em arco, rombo no teto, cabine, motores, rotor quebrado, trem de pouso arriado, bancos, caixas e fumaça.
// Coordenadas locais: u = lateral, v = ao longo do helicóptero (nariz em +v). ry (múltiplo de 90°) gira o conjunto no mapa.
import * as THREE from './vendor/three.module.min.js';
const PI = Math.PI;
const std = (o) => new THREE.MeshStandardMaterial(o);
let MAT = null;
const mats = () => MAT || (MAT = {
  glass: std({ color: 0x0b1219, roughness: 0.1, metalness: 0.8, envMapIntensity: 1.5, transparent: true, opacity: 0.8 }),
  dark: std({ color: 0x15161a, roughness: 0.85, metalness: 0.2 }),
  metal: std({ color: 0x5b5f64, roughness: 0.45, metalness: 0.85 }),
  seat: std({ color: 0x33372a, roughness: 0.95 }),
  rubber: std({ color: 0x0f0f10, roughness: 0.95 }),
  blade: std({ color: 0x1b1c1d, roughness: 0.6, metalness: 0.4 }),
  warn: std({ color: 0xc99a1a, roughness: 0.7 }),
  red: std({ color: 0x8a1212, emissive: 0x3a0505, emissiveIntensity: 0.6, roughness: 0.5 }),
});

function frame(H, x, z, ry) {
  const c = Math.round(Math.cos(ry)), s = Math.round(Math.sin(ry)), sw = Math.abs(s) === 1;
  return {
    pt: (u, v) => ({ x: x + u * c + v * s, z: z - u * s + v * c }),
    rect: (u, v, du, dv) => ({ x: x + u * c + v * s, z: z - u * s + v * c, w: sw ? dv : du, d: sw ? du : dv }),
    group: () => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; H.group.add(g); return g; },
  };
}
function archGeo(hw, y0, rise, th, len, segs = 14, tile = 1.5) {
  const s = new THREE.Shape(), outer = [], inner = [];
  for (let i = 0; i <= segs; i++) { const a = PI - (i / segs) * PI; outer.push([Math.cos(a) * hw, y0 + Math.sin(a) * rise]); inner.push([Math.cos(a) * (hw - th), y0 + Math.sin(a) * (rise - th)]); }
  s.moveTo(...outer[0]); outer.forEach((p) => s.lineTo(...p)); inner.reverse().forEach((p) => s.lineTo(...p)); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  return g;
}
// perfil lateral (v, y) extrudado ao longo de u (largura) — usado no nariz/rabo
function sideProfile(pts, width, rad = 0.25, tile = 1.5) {
  const sh = new THREE.Shape(), n = pts.length;
  const P = pts.map((p) => new THREE.Vector2(p[0], p[1]));
  const st = P[n - 1].clone().lerp(P[0], 0.5); sh.moveTo(st.x, st.y);
  for (let i = 0; i < n; i++) {
    const p = P[i], din = p.clone().sub(P[(i + n - 1) % n]), dout = P[(i + 1) % n].clone().sub(p), r = pts[i][2] ?? rad;
    const a = Math.min(r, din.length() / 2 - 1e-3), b = Math.min(r, dout.length() / 2 - 1e-3);
    const p1 = p.clone().addScaledVector(din.normalize(), -a), p2 = p.clone().addScaledVector(dout.normalize(), b);
    sh.lineTo(p1.x, p1.y); sh.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  sh.closePath();
  const bt = 0.07, g = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -(width - 2 * bt) / 2); g.rotateY(-PI / 2);          // X(v) -> +Z do conjunto
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  return g;
}

// ============================================================================================
// Helicóptero de transporte militar (estilo UH-60) — cabine 2,4 × 5,6 m com duas portas, rombo no teto
// o: { x, z, ry, paint, burnt, rust }  -> devolve { fires: [{x,y,z}] } para o cenário acender fogo/fumaça
export function buildTransportHeli(H, o) {
  const { x, z, ry = 0, paint, paintBurnt, floorMat, innerMat } = o, F = frame(H, x, z, ry), S = mats(), g = F.group();
  const add = (geo, mat, px, py, pz, rx = 0, ryy = 0, rz = 0, sh = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); if (rx || ryy || rz) m.rotation.set(rx, ryy, rz); m.castShadow = sh; m.receiveShadow = true; g.add(m); return m; };
  const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const WALL = 2.25, T = 0.12, HW = 1.2, HL = 2.8;
  const wall = (u, v, du, dv, mat = paint, h = WALL, y = 0, collide = true) => { const r = F.rect(u, v, du, dv); return H.box({ x: r.x, z: r.z, w: r.w, d: r.d, h, y, mat, collide }); };

  // paredes laterais com porta (esq. em v=+0,7; dir. em v=-0,7)  — rotação de 180° mantém o conjunto simétrico
  [[-1, 0.7], [1, -0.7]].forEach(([sd, dc]) => {
    const u = sd * (HW + T / 2), a0 = -HL, a1 = dc - 0.9, b0 = dc + 0.9, b1 = HL;
    wall(u, (a0 + a1) / 2, T, a1 - a0); wall(u, (b0 + b1) / 2, T, b1 - b0);
    wall(u, dc, T, 1.8, paint, WALL - 1.95, 1.95, false);                         // verga da porta
    // porta de correr arriada/aberta (visual) e trilho
    add(bx(0.05, 1.7, 0.9), paintBurnt, sd * (HW + 0.25), 0.9, dc + 1.55, 0, 0, 0.12 * sd);
    add(bx(0.06, 0.05, 2.0), S.metal, sd * (HW + 0.07), 2.0, dc, 0, 0, 0, false);
  });
  wall(0, -HL - T / 2, 2 * HW + 2 * T, T); wall(0, HL + T / 2, 2 * HW + 2 * T, T);   // anteparas traseira e dianteira
  // piso + deck
  const fr = F.rect(0, 0, 2 * HW, 2 * HL); H.box({ x: fr.x, z: fr.z, w: fr.w, d: fr.d, h: 0.06, mat: floorMat, collide: false, shadow: false });
  for (let k = -2; k <= 2; k++) add(bx(2 * HW - 0.1, 0.02, 0.05), S.metal, 0, 0.075, k * 1.0, 0, 0, 0, false);

  // teto em arco (com rombo da queda) e painel rasgado
  [[-2.9, -0.55], [0.95, 2.9]].forEach(([a, b]) => { const len = b - a; add(archGeo(HW + T, WALL, 0.5, 0.1, len), paint, 0, 0, (a + b) / 2); });
  add(bx(1.6, 0.06, 1.2), paintBurnt, 0.7, 2.75, 0.2, 0.9, 0.2, 0.5);             // chapa do teto dobrada para cima
  // nervuras internas do casco (cavernas) e fiação pendurada
  for (let k = -2; k <= 2; k++) if (Math.abs(k * 1.1 - 0.2) > 0.9) add(archGeo(HW, WALL, 0.45, 0.07, 0.08), S.metal, 0, 0, k * 1.1, 0, 0, 0, false);
  for (let k = 0; k < 7; k++) add(new THREE.CylinderGeometry(0.012, 0.012, 0.7 + (k % 3) * 0.25, 4), S.dark, -0.4 + k * 0.14, 2.3, 0.4 + (k % 2) * 0.2, 0, 0, 0.1 * (k - 3), false);

  // nariz (cabine de comando) e rabo curto — sólidos, servem de cobertura
  const nose = F.rect(0, 3.62, 2 * HW + 2 * T, 1.7); H.box({ x: nose.x, z: nose.z, w: nose.w, d: nose.d, h: 1.9, mat: paint, collide: true, shadow: false });
  const tail = F.rect(0, -3.62, 1.5, 1.7);          H.box({ x: tail.x, z: tail.z, w: tail.w, d: tail.d, h: 1.5, mat: paintBurnt, collide: true, shadow: false });
  add(sideProfile([[2.9, 0.55, .05], [2.9, 2.55, .25], [3.55, 2.65, .45], [4.35, 1.85, .5], [4.72, 1.0, .35], [4.5, 0.55, .1]], 2 * HW + 2 * T), paint, 0, 0, 0);  // casco do nariz
  add(bx(2.1, 0.7, 0.04), S.glass, 0, 2.25, 3.62 + 0.55, -0.55, 0, 0, false);                 // para-brisas
  [-1, 1].forEach((sd) => add(bx(0.04, 0.6, 1.0), S.glass, sd * (HW + 0.1), 2.0, 3.55, 0, 0, 0, false));
  add(bx(1.7, 0.2, 0.4), S.dark, 0, 1.55, 3.45, 0, 0, 0, false);                               // painel de instrumentos
  [-0.5, 0.5].forEach((px) => add(bx(0.5, 0.2, 0.55), S.seat, px, 0.9, 3.4, 0, 0, 0, false)); // bancos dos pilotos
  add(sideProfile([[-2.9, 0.55, .05], [-2.9, 2.0, .3], [-3.8, 1.45, .35], [-4.5, 1.15, .2], [-4.5, 0.55, .05]], 1.5), paintBurnt, 0, 0, 0);                           // cone de cauda
  // fuselagem traseira/boom quebrado visto de cima do cone (fin truncado)
  add(bx(0.1, 1.4, 1.2), paintBurnt, 0, 1.7, -3.9, 0, 0, 0.25);

  // motores (nacelas), mastro e cubo do rotor com pás quebradas
  [-0.62, 0.62].forEach((px) => { const n = add(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 14), S.metal, px, 3.0, -0.3, PI / 2, 0, 0); n.material = S.metal; add(bx(0.7, 0.35, 0.5), S.dark, px, 3.1, 0.95, 0, 0, 0, false); });
  add(new THREE.CylinderGeometry(0.16, 0.2, 1.1, 10), S.metal, 0.1, 3.7, 0.3, 0.12, 0, 0.12);                      // mastro torto
  add(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10), S.dark, 0.2, 4.25, 0.25, 0.12, 0, 0.12);                  // cubo do rotor
  for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2 + 0.4, len = 0.9 + (k % 2) * 0.7; add(bx(len, 0.06, 0.28), S.blade, 0.2 + Math.cos(a) * len * 0.5, 4.2 - k * 0.12, 0.25 + Math.sin(a) * len * 0.5, 0.25, -a, -0.35); }
  // pás caídas no chão (longas, partidas)
  [[3.4, 7.2, 0.6, 5.4], [-3.8, -6.8, 2.4, 4.2]].forEach(([u, v, rot, len]) => add(bx(len, 0.05, 0.3), S.blade, u, 0.06, v, 0, rot, 0.03, false));
  // trem de pouso arriado
  [-1, 1].forEach((sd) => { add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), S.metal, sd * 1.38, 0.5, -0.7, 0, 0, sd * 0.5, false); const w = add(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 14), S.rubber, sd * 1.65, 0.34, -0.75, 0, 0, PI / 2, false); w.scale.y = 0.8; });
  // faixas de aviso e numeração desgastada
  add(bx(0.04, 0.25, 1.6), S.warn, -(HW + T + 0.01), 1.55, -1.7, 0, 0, 0, false); add(bx(0.04, 0.25, 1.6), S.warn, (HW + T + 0.01), 1.55, 1.7, 0, 0, 0, false);
  add(bx(0.04, 0.5, 0.9), S.dark, -(HW + T + 0.012), 1.0, -1.9, 0, 0, 0, false);

  // interior: bancos de lona, caixas, maca
  [[-1, -2.5, -0.4], [1, 0.5, 2.5]].forEach(([sd, a, b]) => {
    const vm = (a + b) / 2, len = b - a;
    add(bx(0.5, 0.12, len), S.seat, sd * 0.88, 0.5, vm, 0, 0, 0, false); add(bx(0.08, 0.7, len), S.seat, sd * 1.12, 0.9, vm, 0, 0, 0, false);
    add(bx(0.5, 0.45, 0.05), S.metal, sd * 0.88, 0.25, a + 0.05, 0, 0, 0, false); add(bx(0.5, 0.45, 0.05), S.metal, sd * 0.88, 0.25, b - 0.05, 0, 0, 0, false);
  });
  [[0.55, -2.35], [-0.6, 2.4]].forEach(([u, v]) => { const r = F.rect(u, v, 0.8, 0.8); H.box({ x: r.x, z: r.z, w: r.w, d: r.d, h: 0.6, mat: o.crateMat, collide: true }); });
  add(bx(0.5, 0.05, 1.8), S.seat, -0.15, 0.1, -0.3, 0, 0.1, 0, false);                                      // maca no chão

  // registro do interior para os bots + "visão escondida"
  const inner = F.rect(0, 0, 2 * HW, 2 * HL); H.interiors.push({ x: inner.x, z: inner.z, w: inner.w, d: inner.d });
  const door = (sd, dc) => ({ via: F.pt(sd * (HW + 2.0), dc), via2: F.pt(sd * (HW - 0.55), dc) });
  const dl = door(-1, 0.7), dr = door(1, -0.7);
  [[-0.7, 0.7], [0.75, 1.9], [-0.75, 2.2], [0.5, 0.2]].forEach(([u, v]) => H.spots.push({ ...F.pt(u, v), ...dl }));
  [[0.7, -0.7], [-0.75, -1.9], [0.75, -2.2], [-0.5, -0.2]].forEach(([u, v]) => H.spots.push({ ...F.pt(u, v), ...dr }));
  return { fires: [F.pt(0.2, 2.6), F.pt(-0.3, -4.2)].map((p) => ({ x: p.x, y: 2.6, z: p.z })), smoke: [F.pt(0, 0.2)].map((p) => ({ x: p.x, y: 2.8, z: p.z })), footprint: { w: ry % PI ? 5.2 : 2.9, d: ry % PI ? 2.9 : 5.2 } };
}

// ============================================================================================
// Helicóptero leve de TV/resgate (estilo Bell 206): cabine 2,0 × 2,8 m, bolha de vidro (janelas altas abertas = dá para atirar por elas)
export function buildLightHeli(H, o) {
  const { x, z, ry = 0, paint, paintBurnt, floorMat } = o, F = frame(H, x, z, ry), S = mats(), g = F.group();
  const add = (geo, mat, px, py, pz, rx = 0, ryy = 0, rz = 0, sh = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); if (rx || ryy || rz) m.rotation.set(rx, ryy, rz); m.castShadow = sh; m.receiveShadow = true; g.add(m); return m; };
  const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const HW = 1.0, HL = 1.4, T = 0.1, LOW = 1.1;
  const wall = (u, v, du, dv, h, y = 0, collide = true, mat = paint) => { const r = F.rect(u, v, du, dv); return H.box({ x: r.x, z: r.z, w: r.w, d: r.d, h, y, mat, collide }); };
  // lados: parede baixa (1,1 m) = cobertura; acima, janelas abertas. Porta no lado +u (v de -0,3 a 0,9)
  wall(-(HW + T / 2), 0, T, 2 * HL, LOW);
  wall(HW + T / 2, (-HL + -0.3) / 2, T, -0.3 + HL, LOW); wall(HW + T / 2, (0.9 + HL) / 2, T, HL - 0.9, LOW);
  wall(0, -HL - T / 2, 2 * HW + 2 * T, T, 2.1);                                                     // antepara do motor (sólida)
  wall(0, HL + T / 2, 2 * HW + 2 * T, T, LOW);                                                      // painel frontal baixo
  const fr = F.rect(0, 0, 2 * HW, 2 * HL); H.box({ x: fr.x, z: fr.z, w: fr.w, d: fr.d, h: 0.05, mat: floorMat, collide: false, shadow: false });
  // montantes e teto (visual), bolha de vidro quebrada
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => add(bx(0.07, 1.0, 0.07), paint, sx * (HW + 0.02), LOW + 0.5, sz * (HL - 0.05), 0, 0, 0, true));
  add(bx(2 * HW + 0.3, 0.1, 2 * HL + 0.3), paintBurnt, 0, 2.15, 0, 0.04, 0, 0.05);                  // teto empenado
  add(bx(0.04, 0.9, 2 * HW - 0.1), S.glass, HL + 0.15, 1.6, 0, 0, 0, 0, false);                      // para-brisa (restos)
  add(bx(0.04, 0.5, 0.5), S.glass, HL + 0.14, 1.65, 0.35, 0, 0, 0.35, false);
  // nariz/bolha baixa e rabo
  add(sideProfile([[1.5, 0.35, .05], [1.5, 1.1, .1], [2.1, 0.95, .4], [2.45, 0.6, .3], [2.3, 0.35, .1]], 1.7), paint, 0, 0, 0);
  add(sideProfile([[-1.5, 0.45, .05], [-1.5, 2.1, .3], [-2.2, 1.5, .4], [-2.5, 0.9, .2], [-2.4, 0.45, .1]], 1.7), paintBurnt, 0, 0, 0);          // caixa do motor
  // rotor quebrado, mastro torto, pá pendurada, cauda caída
  add(new THREE.CylinderGeometry(0.1, 0.13, 1.0, 8), S.metal, -0.2, 2.65, -0.5, 0.15, 0, 0.18);
  add(bx(3.4, 0.05, 0.22), S.blade, -0.8, 2.4, -0.4, 0.2, 0.5, -0.6);
  add(bx(2.2, 0.05, 0.22), S.blade, 0.9, 3.1, -0.3, -0.1, 0.5, 0.35);
  add(bx(3.0, 0.22, 0.2), paintBurnt, 3.8, 0.12, -5.0, 0, 0.5, 0, true);                              // boom de cauda no chão (visual)
  add(bx(0.06, 0.9, 0.5), paintBurnt, 5.2, 0.55, -5.7, 0, 0.5, 0.3, false);
  // esquis tortos
  [-1, 1].forEach((sd) => { add(new THREE.CylinderGeometry(0.035, 0.035, 3.3, 6), S.metal, sd * 1.15, 0.08, 0.1, PI / 2, 0, sd * 0.08, false); add(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), S.metal, sd * 1.12, 0.3, 0.9, 0, 0, sd * 0.25, false); add(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), S.metal, sd * 1.1, 0.3, -0.9, 0, 0, sd * 0.25, false); });
  // faixa lateral (TV/RESGATE) e listras
  add(bx(0.03, 0.3, 2.0), S.warn, -(HW + T + 0.01), 0.75, 0.1, 0, 0, 0, false);
  // interior: poltronas, painel
  [[-0.45, 0.55], [0.45, 0.55]].forEach(([u, v]) => { add(bx(0.5, 0.12, 0.5), S.seat, u, 0.45, v, 0, 0, 0, false); add(bx(0.5, 0.6, 0.1), S.seat, u, 0.8, v - 0.28, 0.12, 0, 0, false); });
  add(bx(1.7, 0.45, 0.12), S.seat, 0, 0.45, -0.9, 0, 0, 0, false);
  add(bx(1.8, 0.25, 0.3), S.dark, 0, 0.95, 1.25, 0, 0, 0, false);

  const inner = F.rect(0, 0, 2 * HW, 2 * HL); H.interiors.push({ x: inner.x, z: inner.z, w: inner.w, d: inner.d });
  const via = F.pt(HW + 1.8, 0.3), via2 = F.pt(HW - 0.5, 0.3);
  [[0.0, 0.2], [-0.5, -0.5], [0.4, 0.9], [-0.4, 0.9]].forEach(([u, v]) => H.spots.push({ ...F.pt(u, v), via, via2 }));
  return { fires: [F.pt(0, -1.9)].map((p) => ({ x: p.x, y: 1.4, z: p.z })), smoke: [F.pt(0, -1.7)].map((p) => ({ x: p.x, y: 2.0, z: p.z })), footprint: { w: ry % PI ? 3.2 : 2.3, d: ry % PI ? 2.3 : 3.2 } };
}
