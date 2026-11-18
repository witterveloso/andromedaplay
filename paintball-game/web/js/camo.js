import * as THREE from 'three';

// Camuflagem gerada por código: laranja = deserto/areia, azul = urbano azulado.
const PALETTES = [
  ['#a58b5b', '#7d6439', '#c9b283', '#4f3e22', '#d9822b'],
  ['#44586b', '#2a3643', '#6c8197', '#1b242e', '#1ab3ff'],
];
const cache = [];
export function camoTexture(team) {
  if (cache[team]) return cache[team];
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), P = PALETTES[team];
  g.fillStyle = P[0]; g.fillRect(0, 0, S, S);
  let seed = 1337 + team * 77;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let layer = 1; layer <= 3; layer++) {
    g.fillStyle = P[layer];
    for (let i = 0; i < 70; i++) {
      const x = r() * S, y = r() * S, rx = 25 + r() * 70, ry = 15 + r() * 40, rot = r() * 3.14;
      g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + rx * .7, y + ry * .5, rx * .5, ry * .6, rot + .8, 0, 7); g.fill();
    }
  }
  // granulado de tecido
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 22; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;                     // glTF usa UV sem inversão
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  cache[team] = t;
  return t;
}
export const TEAM_ACCENT = PALETTES.map((p) => p[4]);
