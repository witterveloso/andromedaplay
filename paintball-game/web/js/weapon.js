import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

// Marcador tático de paintball (.68), modelado a partir de referências reais (linha Tippmann Cronus / A-5 tática):
// corpo com trilhos Picatinny, cano ventilado dentro de capa (shroud), empunhadura vertical, loader com bolinhas,
// cilindro de ar (HPA) com regulador e manômetro, coronha retrátil e mira red-dot.
// Eixo do cano = -Z. Origem no centro do corpo. userData.muzzle = boca do cano.
export const MARKER_SPECS = { calibre: '.68', cadencia: 'até 10 bolinhas/s', capacidade: '200 no loader', peso: '≈ 1,6 kg' };

export function buildMarker(paint) {
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const mats = {
    poly: M({ color: 0x1c1e23, roughness: 0.5, metalness: 0.3 }),
    metal: M({ color: 0xa3a9b1, roughness: 0.26, metalness: 0.95 }),
    dark: M({ color: 0x0c0d10, roughness: 0.7, metalness: 0.2 }),
    rubber: M({ color: 0x131418, roughness: 0.96 }),
    carbon: M({ color: 0x15171b, roughness: 0.32, metalness: 0.55 }),
    accent: M({ color: paint, roughness: 0.32, metalness: 0.7, emissive: paint, emissiveIntensity: 0.2 }),
    glass: M({ color: 0xcfe6ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.26, envMapIntensity: 1.6, depthWrite: false }),
    balls: M({ color: paint, emissive: paint, emissiveIntensity: 0.45, roughness: 0.3 }),
    led: new THREE.MeshBasicMaterial({ color: 0x4dff7a }),
    dot: new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    lens: M({ color: 0x0b1a2a, roughness: 0.05, metalness: 0.7, envMapIntensity: 1.5 }),
  };
  const parts = {};
  const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const add = (key, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    geo.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s.set(sx, sy, sz)));
    (parts[key] || (parts[key] = [])).push(geo);
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cylZ = (r1, r2, len, seg = 18) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.rotateX(Math.PI / 2); return g; };
  const cylY = (r1, r2, len, seg = 18) => new THREE.CylinderGeometry(r1, r2, len, seg);

  // corpo (receiver) + janela de ejeção/placa lateral
  add('poly', box(0.058, 0.104, 0.25), 0, 0, 0);
  add('dark', box(0.062, 0.05, 0.09), 0, 0.012, 0.015);
  add('metal', box(0.006, 0.07, 0.15), 0.031, 0.0, 0.015);
  add('metal', box(0.006, 0.07, 0.15), -0.031, 0.0, 0.015);
  add('accent', box(0.007, 0.012, 0.15), 0.032, 0.036, 0.015);
  add('accent', box(0.007, 0.012, 0.15), -0.032, 0.036, 0.015);
  add('led', new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 10), 0.0325, -0.02, 0.07, 0, 0, Math.PI / 2);
  // trilho Picatinny superior (com ranhuras)
  add('metal', box(0.026, 0.01, 0.42), 0, 0.057, -0.05);
  for (let z = -0.24; z <= 0.14; z += 0.0185) add('dark', box(0.028, 0.0045, 0.006), 0, 0.0625, z);
  // cano ventilado + capa (shroud) + ponta
  add('metal', cylZ(0.0135, 0.0135, 0.46), 0, 0.006, -0.3);
  add('poly', cylZ(0.027, 0.027, 0.24), 0, 0.006, -0.25);
  add('metal', cylZ(0.029, 0.029, 0.012), 0, 0.006, -0.372);
  add('accent', cylZ(0.0295, 0.0295, 0.008), 0, 0.006, -0.135);
  add('accent', cylZ(0.0165, 0.0165, 0.012), 0, 0.006, -0.48);
  for (let i = 0; i < 5; i++) add('dark', cylZ(0.0168, 0.0168, 0.004), 0, 0.006, -0.425 - i * 0.0125);   // furos/ranhuras do cano
  // trilhos laterais/inferior + empunhadura vertical
  add('metal', box(0.02, 0.01, 0.17), 0, -0.037, -0.27);
  for (let z = -0.34; z <= -0.2; z += 0.017) add('dark', box(0.022, 0.0045, 0.006), 0, -0.0425, z);
  add('poly', box(0.034, 0.02, 0.05), 0, -0.05, -0.27);
  add('rubber', cylY(0.0155, 0.0185, 0.095), 0, -0.1, -0.27);
  add('accent', cylY(0.0188, 0.0188, 0.006), 0, -0.147, -0.27);
  // punho + guarda-mato + gatilho
  add('rubber', box(0.036, 0.115, 0.052), 0, -0.1, 0.07, 0.28, 0, 0);
  add('poly', box(0.014, 0.008, 0.085), 0, -0.07, -0.005);
  add('poly', box(0.014, 0.045, 0.008), 0, -0.058, -0.047);
  add('metal', box(0.008, 0.034, 0.012), 0, -0.052, -0.012, -0.25, 0, 0);
  // alimentador (loader) com bolinhas visíveis
  add('poly', cylY(0.021, 0.026, 0.05), 0, 0.083, -0.045);
  add('metal', cylY(0.03, 0.03, 0.012), 0, 0.11, -0.045);
  add('glass', new THREE.SphereGeometry(0.066, 24, 16), 0, 0.17, -0.045, 0, 0, 0, 1, 0.88, 1.18);
  add('accent', new THREE.TorusGeometry(0.033, 0.0045, 8, 24), 0, 0.114, -0.045, Math.PI / 2, 0, 0);
  add('metal', cylY(0.018, 0.018, 0.012), 0, 0.236, -0.045);
  { // ~34 bolinhas dentro do loader
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 34; i++) {
      const a = r() * 6.283, b = Math.acos(2 * r() - 1), rr = Math.cbrt(r()) * 0.05;
      add('balls', new THREE.SphereGeometry(0.0118, 8, 6), Math.sin(b) * Math.cos(a) * rr * 0.95, 0.165 + Math.cos(b) * rr * 0.75, -0.045 + Math.sin(b) * Math.sin(a) * rr * 1.1);
    }
  }
  // cilindro de ar (HPA) + regulador + manômetro
  add('carbon', cylZ(0.031, 0.031, 0.26, 20), 0, -0.134, 0.19);
  add('accent', cylZ(0.0318, 0.0318, 0.02, 20), 0, -0.134, 0.1);
  add('metal', cylZ(0.022, 0.022, 0.03, 16), 0, -0.134, 0.07);
  add('poly', box(0.05, 0.05, 0.06), 0, -0.095, 0.03);
  add('metal', new THREE.CylinderGeometry(0.0125, 0.0125, 0.012, 16), 0.035, -0.1, 0.03, 0, 0, Math.PI / 2);
  add('lens', new THREE.CylinderGeometry(0.0105, 0.0105, 0.004, 16), 0.042, -0.1, 0.03, 0, 0, Math.PI / 2);
  add('led', new THREE.CylinderGeometry(0.0015, 0.0015, 0.0042, 6), 0.0443, -0.1, 0.03, 0, 0, Math.PI / 2);
  // coronha retrátil + apoio
  add('metal', cylZ(0.013, 0.013, 0.14), 0, 0.012, 0.19);
  add('poly', box(0.034, 0.05, 0.1), 0, 0.012, 0.275);
  add('rubber', box(0.046, 0.115, 0.03), 0, -0.01, 0.34);
  // mira red-dot sobre o trilho
  add('poly', box(0.034, 0.038, 0.062), 0, 0.083, -0.12);
  add('lens', cylZ(0.0145, 0.0145, 0.004), 0, 0.087, -0.153);
  add('metal', box(0.04, 0.006, 0.07), 0, 0.064, -0.12);
  add('dot', new THREE.CylinderGeometry(0.0018, 0.0018, 0.0042, 8), 0, 0.087, -0.1528, Math.PI / 2, 0, 0);

  const g = new THREE.Group();
  for (const [key, geos] of Object.entries(parts)) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mats[key]);
    mesh.castShadow = key !== 'glass' && key !== 'balls';
    if (key === 'glass') mesh.renderOrder = 2;
    g.add(mesh);
    geos.forEach((geo) => geo.dispose());
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.006, -0.545);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.userData.specs = MARKER_SPECS;
  return g;
}
