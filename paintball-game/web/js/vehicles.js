// Veículos realistas (modelados por código): perfil lateral curvo + vidros + rodas com aro + faróis, grade, placa, portas, espelhos.
// Tipos: hatch (estilo Gol/Uno), sedan, suv, pickup, van (Kombi) e fusca; mais ônibus. Estados: limpo/empoeirado, enferrujado,
// carbonizado, pneus murchos, sem rodas (sobre blocos), portas abertas, batido (frente amassada) e capotado.
import * as THREE from './vendor/three.module.min.js';
const PI = Math.PI;

// ------------------------------------------------------------------ materiais compartilhados
let SH = null;
const std = (o) => new THREE.MeshStandardMaterial(o);
function shared() {
  if (SH) return SH;
  SH = {
    glass: std({ color: 0x0a1118, roughness: 0.08, metalness: 0.85, envMapIntensity: 1.7 }),
    tire: std({ color: 0x131313, roughness: 0.93 }),
    rim: std({ color: 0xb4b8bd, roughness: 0.3, metalness: 0.95 }),
    rimDark: std({ color: 0x4a4d52, roughness: 0.5, metalness: 0.8 }),
    black: std({ color: 0x08090a, roughness: 0.9 }),
    plastic: std({ color: 0x1c1e21, roughness: 0.65, metalness: 0.1 }),
    chrome: std({ color: 0xdadde0, roughness: 0.18, metalness: 1, envMapIntensity: 1.4 }),
    head: std({ color: 0xf3f1e6, emissive: 0x8d8a70, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.3 }),
    tail: std({ color: 0xb21616, emissive: 0x4a0808, emissiveIntensity: 0.6, roughness: 0.25 }),
    amber: std({ color: 0xd98a1a, emissive: 0x6b3a00, emissiveIntensity: 0.4, roughness: 0.3 }),
    seat: std({ color: 0x2a2622, roughness: 0.95 }),
    block: std({ color: 0x8e8d87, roughness: 0.95 }),
    charred: std({ color: 0x151515, roughness: 0.95 }),
  };
  return SH;
}
const plates = [];
function plateMat(i) {
  if (plates[i % 6]) return plates[i % 6];
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#f2f2ef'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#1d4aa6'; g.fillRect(0, 0, 128, 15);
  g.fillStyle = '#fff'; g.font = '700 10px sans-serif'; g.textAlign = 'center'; g.fillText('BRASIL', 64, 11);
  let seed = (i + 3) * 7919; const rd = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n); };
  const A = 'ABCDEFGHJKLMNPRSTUVWXYZ', t = A[rd(A.length)] + A[rd(A.length)] + A[rd(A.length)] + rd(10) + A[rd(A.length)] + rd(10) + rd(10);
  g.fillStyle = '#16161a'; g.font = '800 34px "Arial Narrow", Arial, sans-serif'; g.fillText(t, 64, 52);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 125, 61);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return (plates[i % 6] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
}

// ------------------------------------------------------------------ geometria
function roundedShape(pts) {                     // pts: [x, y, raio]  (polígono fechado com cantos arredondados)
  const n = pts.length, P = pts.map((p) => new THREE.Vector2(p[0], p[1])), s = new THREE.Shape();
  const st = P[n - 1].clone().lerp(P[0], 0.5); s.moveTo(st.x, st.y);
  for (let i = 0; i < n; i++) {
    const p = P[i], din = p.clone().sub(P[(i + n - 1) % n]), dout = P[(i + 1) % n].clone().sub(p), r = pts[i][2] || 0;
    const a = Math.min(r, din.length() / 2 - 1e-3), b = Math.min(r, dout.length() / 2 - 1e-3);
    const p1 = p.clone().addScaledVector(din.normalize(), -a), p2 = p.clone().addScaledVector(dout.normalize(), b);
    s.lineTo(p1.x, p1.y); s.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  s.closePath(); return s;
}
function extrude(pts, width, hi, bt = 0.07, tile = 1.5) {
  const g = new THREE.ExtrudeGeometry(roundedShape(pts), { depth: Math.max(0.05, width - 2 * bt), bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt, bevelSegments: hi ? 2 : 1, curveSegments: hi ? 8 : 4 });
  g.translate(0, 0, -(width - 2 * bt) / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  return g;
}
function wheelParts(hi, R = 1) {
  const prof = [[0.18, -0.125], [0.30, -0.135], [0.355, -0.10], [0.375, -0.03], [0.375, 0.03], [0.355, 0.10], [0.30, 0.135], [0.18, 0.125]].map((p) => new THREE.Vector2(p[0] * R, p[1]));
  const tire = new THREE.LatheGeometry(prof, hi ? 16 : 10); tire.rotateX(PI / 2);
  const rim = new THREE.CylinderGeometry(0.215 * R, 0.215 * R, 0.25, hi ? 14 : 8); rim.rotateX(PI / 2);
  return { tire, rim };
}
const SPEC = {
  sedan: { L: 4.5, W: 1.82, roofY: 1.58, belt: 1.03, wx: [1.43, -1.38], wr: 1, hY: 0.8, tY: 0.88,
    body: [[-2.25, 0.30, .06], [-2.25, 0.80, .10], [-1.98, 1.0, .25], [-1.0, 1.03, 0], [1.05, 1.03, 0], [1.95, 0.93, .35], [2.25, 0.74, .12], [2.25, 0.32, .06]],
    cab: [[-1.38, 1.0, 0], [-0.92, 1.56, .2], [0.50, 1.58, .2], [1.10, 1.0, 0]] },
  hatch: { L: 3.95, W: 1.66, roofY: 1.6, belt: 1.04, wx: [1.25, -1.15], wr: 0.95, hY: 0.82, tY: 0.9,
    body: [[-1.97, 0.30, .06], [-1.97, 0.95, .12], [-1.75, 1.04, .15], [0.9, 1.04, 0], [1.6, 0.94, .3], [1.97, 0.76, .12], [1.97, 0.32, .06]],
    cab: [[-1.78, 1.02, 0], [-1.52, 1.57, .28], [0.35, 1.6, .2], [0.98, 1.02, 0]] },
  suv: { L: 4.6, W: 1.9, roofY: 1.85, belt: 1.12, wx: [1.5, -1.45], wr: 1.14, hY: 0.92, tY: 1.0,
    body: [[-2.3, 0.36, .06], [-2.3, 1.12, .1], [1.1, 1.14, 0], [1.95, 1.08, .3], [2.3, 0.86, .12], [2.3, 0.38, .08]],
    cab: [[-2.18, 1.12, 0], [-2.12, 1.82, .15], [0.5, 1.85, .2], [1.1, 1.12, 0]] },
  pickup: { L: 5.0, W: 1.9, roofY: 1.8, belt: 1.12, wx: [1.55, -1.45], wr: 1.12, hY: 0.9, tY: 0.95, bed: true,
    body: [[-0.6, 0.38, .05], [-0.6, 1.12, .06], [0.35, 1.14, 0], [1.9, 1.05, .3], [2.5, 0.84, .12], [2.5, 0.4, .06]],
    cab: [[-0.55, 1.12, 0], [-0.35, 1.78, .12], [0.7, 1.8, .2], [1.3, 1.12, 0]] },
  van: { L: 4.3, W: 1.72, roofY: 1.95, belt: 1.0, wx: [1.4, -1.35], wr: 0.95, hY: 0.8, tY: 1.0, kombi: true,
    body: [[-2.15, 0.32, .1], [-2.15, 1.9, .35], [1.4, 1.95, .4], [2.15, 1.45, .45], [2.15, 0.36, .08]] },
  fusca: { L: 4.05, W: 1.6, roofY: 1.46, belt: 1.06, wx: [1.3, -1.25], wr: 0.92, hY: 0.82, tY: 0.78, fusca: true,
    body: [[-2.0, 0.34, .1], [-2.0, 0.78, .5], [-1.5, 1.08, .4], [1.0, 1.06, .3], [1.7, 0.95, .45], [2.02, 0.7, .22], [2.02, 0.36, .1]],
    cab: [[-1.55, 1.06, 0], [-0.9, 1.45, .4], [0.1, 1.46, .4], [0.75, 1.06, 0]] },
};
export const VEHICLE_KINDS = Object.keys(SPEC);
export const vehicleSize = (kind) => ({ L: SPEC[kind].L, W: SPEC[kind].W, H: SPEC[kind].roofY });

// ------------------------------------------------------------------ carro
// o: { kind, paint (material), paint2 (material), wear, flat, stripped, doorOpen, crunch, overturned, hi, seed }
export function buildVehicle(o) {
  const S = shared(), sp = SPEC[o.kind || 'hatch'], hi = !!o.hi, { L, W } = sp, g = new THREE.Group();
  const paint = o.paint, burnt = (o.wear || 0) >= 2, seed = o.seed || 0;
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, shadow = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx || ry || rz) m.rotation.set(rx, ry, rz); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const lift = o.stripped ? 0.4 : o.flat ? -0.07 : 0;                    // altura da carroceria
  const body = new THREE.Group(); body.position.y = lift; g.add(body);
  const addB = (geo, mat, x, y, z, rx, ry, rz, shadow) => { const m = add(geo, mat, x, y, z, rx, ry, rz, shadow); g.remove(m); body.add(m); return m; };

  // carroceria
  const bg = extrude(sp.body, W, hi, 0.08);
  if (o.crunch) {                                                        // frente amassada: capô cede, para-choque entra
    const p = bg.attributes.position, c = o.crunch;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = Math.max(0, (x - (L / 2 - 1.5)) / 1.5);
      if (t <= 0) continue;
      const n = Math.sin(y * 9 + z * 7 + seed) * 0.5 + Math.sin(z * 13 - y * 5) * 0.5;
      p.setX(i, x - t * t * 0.55 * c + n * 0.03 * t);
      p.setY(i, y - t * 0.26 * c * (y > 0.7 ? 1 : 0.35) + n * 0.03 * t);
      p.setZ(i, z + n * 0.07 * t * c);
    }
    bg.computeVertexNormals();
  }
  addB(bg, paint, 0, 0, 0, 0, 0, 0, true);

  // cabine (vidros) + teto + colunas
  let Wc = W - 0.26;
  if (sp.cab) {
    const cb = extrude(sp.cab, Wc, hi, 0.05), pc = sp.cab;
    addB(cb, burnt ? S.charred : S.glass, 0, 0, 0, 0, 0, 0, false);
    const roofL = pc[2][0] - pc[1][0] + 0.1, roofX = (pc[1][0] + pc[2][0]) / 2, roofTop = Math.max(pc[1][1], pc[2][1]);
    addB(box(roofL, 0.07, Wc + 0.1), paint, roofX, roofTop + 0.01, 0, 0, 0, 0, true);
    const pil = (a, b, th = 0.09) => {                                   // coluna entre dois pontos da cabine
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      [-1, 1].forEach((sd) => addB(box(len, th, 0.07), paint, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, sd * (Wc / 2 + 0.01), 0, 0, ang, false));
    };
    pil(pc[3], pc[2]); pil(pc[0], pc[1]);
    const bx = (pc[0][0] + pc[3][0]) / 2 - 0.05;                         // coluna B
    [-1, 1].forEach((sd) => addB(box(0.09, roofTop - sp.belt, 0.07), paint, bx, (roofTop + sp.belt) / 2, sd * (Wc / 2 + 0.012), 0, 0, 0, false));
    if (hi) {                                                            // bancos e painel visíveis pelos vidros
      [-0.4, 0.4].forEach((zz) => { addB(box(0.45, 0.55, 0.42), S.seat, bx + 0.45, sp.belt - 0.12, zz, 0, 0, 0, false); addB(box(0.12, 0.55, 0.42), S.seat, bx + 0.22, sp.belt + 0.2, zz, 0, 0, 0, false); });
      addB(box(0.3, 0.3, Wc - 0.2), S.plastic, pc[3][0] - 0.25, sp.belt + 0.05, 0, 0, 0, 0, false);
    }
    if (!burnt) {
      const mir = (sd) => addB(box(0.11, 0.1, 0.17), paint, pc[3][0] - 0.08, sp.belt + 0.14, sd * (W / 2 + 0.1), 0, 0, 0, false);
      mir(-1); mir(1);
    }
  } else if (sp.kombi) {                                                // Kombi: faixa de janelas + para-brisa dividido + faixa bicolor
    const wy = 1.55, h = 0.62;
    [-1, 1].forEach((sd) => { addB(box(3.4, h, 0.03), burnt ? S.charred : S.glass, -0.2, wy, sd * (W / 2 + 0.004), 0, 0, 0, false); for (let k = -3; k <= 3; k++) addB(box(0.07, h, 0.045), paint, -0.2 + k * 0.52, wy, sd * (W / 2 + 0.006), 0, 0, 0, false); });
    addB(box(0.04, 1.0, W - 0.3), burnt ? S.charred : S.glass, 1.93, 1.45, 0, 0, 0, -0.22, false);
    addB(box(0.06, 1.0, 0.05), paint, 1.94, 1.45, 0, 0, 0, -0.22, false);
    if (o.paint2) { [-1, 1].forEach((sd) => addB(box(4.1, 0.2, 0.03), o.paint2, -0.05, 1.13, sd * (W / 2 + 0.01), 0, 0, 0, false)); addB(box(2.0, 0.05, W + 0.02), o.paint2, -0.2, 1.93, 0, 0, 0, 0, false); }
  }
  if (sp.bed) {                                                          // caçamba
    addB(box(1.95, 0.36, W - 0.2), paint, -1.57, 0.58, 0, 0, 0, 0, true);
    addB(box(1.95, 0.05, W - 0.2), S.plastic, -1.57, 0.78, 0, 0, 0, 0, false);
    [-1, 1].forEach((sd) => addB(box(1.95, 0.48, 0.07), paint, -1.57, 1.02, sd * (W / 2 - 0.12), 0, 0, 0, true));
    addB(box(0.07, 0.48, W - 0.2), paint, -2.5, 1.02, 0, 0, 0, 0, true);
    addB(box(0.07, 0.4, W - 0.2), paint, -0.65, 1.0, 0, 0, 0, 0, false);
  }
  // fundo escuro (esconde o vazio sob a carroceria)
  addB(box(L - 0.5, 0.14, W - 0.3), S.black, 0, 0.3, 0, 0, 0, 0, false);

  // para-choques, grade, faróis, lanternas, placas
  const xF = L / 2, xR = -L / 2, bumper = sp.fusca ? S.chrome : S.plastic;
  addB(box(0.22, 0.2, W + 0.02), bumper, xF - 0.04, 0.45, 0, 0, 0, 0, false);
  addB(box(0.22, 0.2, W + 0.02), bumper, xR + 0.04, 0.45, 0, 0, 0, 0, false);
  if (!o.noLights) {
    [-1, 1].forEach((sd) => {
      if (sp.fusca) { const hl = new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12); hl.rotateZ(PI / 2); addB(hl, S.head, 1.78, 1.0, sd * 0.5, 0, 0, 0, false); }
      else addB(box(0.07, 0.17, 0.4), S.head, xF - 0.01, sp.hY, sd * (W / 2 - 0.3), 0, 0, 0, false);
      addB(box(0.06, 0.18, 0.32), S.tail, xR + 0.01, sp.tY, sd * (W / 2 - 0.25), 0, 0, 0, false);
      addB(box(0.06, 0.07, 0.14), S.amber, xF - 0.01, sp.hY - 0.16, sd * (W / 2 - 0.2), 0, 0, 0, false);
    });
    if (!sp.fusca) addB(box(0.05, 0.14, 0.62), S.black, xF, sp.hY - 0.03, 0, 0, 0, 0, false);            // grade
    if (!burnt) {
      const pm = plateMat(o.plate || 0), pg = new THREE.PlaneGeometry(0.5, 0.25);
      const pr = new THREE.Mesh(pg, pm); pr.position.set(xR - 0.004, sp.tY - 0.2, 0); pr.rotation.y = -PI / 2; body.add(pr);
      const pf = new THREE.Mesh(pg, pm); pf.position.set(xF + 0.004, 0.5, 0); pf.rotation.y = PI / 2; body.add(pf);
    }
  }
  // portas (frestas e maçanetas)
  if (hi && sp.cab) {
    const pc = sp.cab, xs = [pc[3][0] - 0.1, (pc[0][0] + pc[3][0]) / 2 - 0.05, pc[0][0] + 0.1];
    [-1, 1].forEach((sd) => {
      xs.forEach((x) => addB(box(0.018, sp.belt - 0.42, 0.012), S.black, x, (sp.belt + 0.42) / 2, sd * (W / 2 + 0.002), 0, 0, 0, false));
      addB(box(0.14, 0.03, 0.03), S.chrome, xs[1] + 0.3, sp.belt - 0.14, sd * (W / 2 + 0.012), 0, 0, 0, false);
      addB(box(0.14, 0.03, 0.03), S.chrome, xs[1] - 0.55, sp.belt - 0.14, sd * (W / 2 + 0.012), 0, 0, 0, false);
    });
  }
  // porta aberta (lado do motorista) para cenas de abandono
  if (o.doorOpen && sp.cab) {
    const hx = sp.cab[3][0] - 0.12, pivot = new THREE.Group(); pivot.position.set(hx, 0, W / 2); body.add(pivot);
    const dm = new THREE.Mesh(box(0.95, sp.belt - 0.45 + 0.5, 0.06), paint); dm.position.set(-0.5, (sp.belt + 0.45 + 0.5) / 2 - 0.24, 0); dm.castShadow = true; pivot.add(dm);
    if (!burnt) { const gl = new THREE.Mesh(box(0.8, 0.42, 0.03), S.glass); gl.position.set(-0.5, sp.belt + 0.3, 0.01); pivot.add(gl); }
    pivot.rotation.y = 1.25;
  }

  // rodas
  const wR = sp.wr, { tire, rim } = wheelParts(hi, wR), wy = 0.375 * wR;
  const wheelsAt = [[sp.wx[0], 1], [sp.wx[0], -1], [sp.wx[1], 1], [sp.wx[1], -1]];
  wheelsAt.forEach(([x, sd], i) => {
    // cava da roda (círculo escuro no costado)
    const arch = new THREE.Mesh(new THREE.CircleGeometry(0.43 * wR, 16), S.black); arch.position.set(x, 0.38 * wR + lift, sd * (W / 2 + 0.012)); if (sd < 0) arch.rotation.y = PI; g.add(arch);
    if (o.stripped) return;                                              // sem rodas
    if (o.missing && o.missing.includes(i)) return;
    const gr = new THREE.Group(); gr.position.set(x, o.flat ? wy * 0.7 : wy, sd * (W / 2 - 0.2)); if (o.flat) gr.scale.set(1.08, 0.72, 1); g.add(gr);
    const t = new THREE.Mesh(tire, S.tire); t.castShadow = false; gr.add(t);
    const r = new THREE.Mesh(rim, hi ? S.rim : S.rimDark); r.position.z = sd * 0.015; gr.add(r);
    if (hi) { const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.27, 8).rotateX(PI / 2), S.rimDark); hub.position.z = sd * 0.02; gr.add(hub);
      for (let k = 0; k < 5; k++) { const sk = new THREE.Mesh(box(0.17, 0.035, 0.03), S.rimDark); sk.position.set(0, 0, sd * 0.135); sk.rotation.z = (k / 5) * PI * 2; sk.position.x = Math.cos(sk.rotation.z) * 0.12; sk.position.y = Math.sin(sk.rotation.z) * 0.12; gr.add(sk); } }
  });
  if (o.stripped) {                                                      // calços de blocos de concreto no lugar das rodas
    wheelsAt.forEach(([x, sd]) => { const bm = new THREE.Mesh(box(0.5, 0.4, 0.4), S.block); bm.position.set(x, 0.2, sd * (W / 2 - 0.35)); bm.castShadow = true; g.add(bm); });
  }
  return g;
}

// ------------------------------------------------------------------ ônibus urbano
export function buildBus(o) {
  const S = shared(), hi = !!o.hi, L = 8.6, W = 2.5, H = 3.1, g = new THREE.Group(), paint = o.paint, burnt = (o.wear || 0) >= 2;
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, shadow = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx || ry || rz) m.rotation.set(rx, ry, rz); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const lift = o.flat ? -0.06 : 0;
  const prof = [[-L / 2, 0.55, .12], [-L / 2, H - 0.1, .25], [-L / 2 + 0.5, H, .2], [L / 2 - 1.1, H, .25], [L / 2, H - 0.7, .35], [L / 2, 0.6, .15]];
  const body = new THREE.Mesh(extrude(prof, W, hi, 0.1), paint); body.castShadow = true; body.receiveShadow = true; body.position.y = lift; g.add(body);
  const gm = burnt ? S.charred : S.glass, wy = 2.05;
  [-1, 1].forEach((sd) => {
    add(box(L - 2.0, 0.95, 0.03), gm, -0.6, wy, sd * (W / 2 + 0.006), 0, 0, 0, false);                 // faixa de janelas
    for (let k = 0; k <= 6; k++) add(box(0.09, 0.95, 0.045), paint, -0.6 - (L - 2.0) / 2 + k * ((L - 2.0) / 6), wy, sd * (W / 2 + 0.008), 0, 0, 0, false);
    add(box(L - 0.4, 0.2, 0.04), o.paint2 || S.chrome, 0, 1.15, sd * (W / 2 + 0.008), 0, 0, 0, false);  // faixa lateral
    add(box(1.2, 1.7, 0.04), gm, L / 2 - 1.6, 1.5, sd * (W / 2 + 0.008), 0, 0, 0, false);                // porta (vidro)
  });
  add(box(0.05, 1.45, W - 0.35), gm, L / 2 + 0.005, 2.15, 0, 0, 0, 0.12, false);                          // para-brisa
  add(box(0.06, 0.28, W - 0.8), S.amber, L / 2 + 0.01, 2.95, 0, 0, 0, 0, false);                          // letreiro
  add(box(0.05, 0.9, W - 0.7), gm, -L / 2 - 0.004, 2.0, 0, 0, 0, 0, false);                               // vidro traseiro
  [-1, 1].forEach((sd) => { add(box(0.07, 0.2, 0.42), S.head, L / 2 + 0.005, 0.95, sd * (W / 2 - 0.35), 0, 0, 0, false); add(box(0.06, 0.22, 0.3), S.tail, -L / 2 - 0.004, 1.0, sd * (W / 2 - 0.3), 0, 0, 0, false); });
  add(box(0.26, 0.3, W + 0.04), S.plastic, L / 2 - 0.05, 0.55, 0, 0, 0, 0, false); add(box(0.26, 0.3, W + 0.04), S.plastic, -L / 2 + 0.05, 0.55, 0, 0, 0, 0, false);
  const pm = plateMat(o.plate || 1), pl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), pm); pl.position.set(-L / 2 - 0.006, 0.75, 0); pl.rotation.y = -PI / 2; g.add(pl);
  add(box(L - 1.2, 0.16, W - 0.3), S.black, 0, 0.4, 0, 0, 0, 0, false);
  const { tire, rim } = wheelParts(hi, 1.3);
  [[2.6, 1], [2.6, -1], [-2.4, 1], [-2.4, -1]].forEach(([x, sd], i) => {
    add(new THREE.CircleGeometry(0.55, 16), S.black, x, 0.5 + lift, sd * (W / 2 + 0.014), 0, sd < 0 ? PI : 0, 0, false);
    if (o.missing && o.missing.includes(i)) return;
    const gr = new THREE.Group(); gr.position.set(x, o.flat ? 0.34 : 0.49, sd * (W / 2 - 0.22)); if (o.flat) gr.scale.set(1.08, 0.7, 1); g.add(gr);
    gr.add(new THREE.Mesh(tire, S.tire)); const r = new THREE.Mesh(rim, S.rimDark); r.position.z = sd * 0.02; gr.add(r);
  });
  return g;
}
