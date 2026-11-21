// Os 8 personagens jogáveis: identidade (cor, biotipo, cabelo/acessórios, kit de equipamento) + textura de uniforme com respingos de tinta.
// Observação honesta: todos usam o MESMO esqueleto/malha-base humana (Mixamo "Vanguard"); a diferença vem de proporções (altura/ombros),
// textura própria, cabelo, cabeça/máscara, kit de proteção e acessórios modelados por código. Não são 8 malhas GLB independentes.
import * as THREE from './vendor/three.module.min.js';

export const CHARACTERS = {
  bravo:  { id: 'bravo',  name: 'Bravo',  accent: '#ffc300', role: 'Atleta robusto · equipamento reforçado',       h: 1.03, w: 1.08, hair: 0x1d1510, head: 'short',  kit: ['plate', 'pads', 'belt'],    pattern: 'blotch',  seed: 11 },
  luna:   { id: 'luna',   name: 'Luna',   accent: '#a335ff', role: 'Ágil · roupa esportiva tática',                 h: 0.98, w: 0.95, hair: 0x2a1a14, head: 'bun',    kit: ['bracelet', 'belt'],        pattern: 'drips',   seed: 23 },
  nex:    { id: 'nex',    name: 'Nex',    accent: '#7cff00', role: 'Jovem adulto · visual urbano',                 h: 1.01, w: 1.0,  hair: 0x1a120d, head: 'afro',   kit: ['pouch', 'bracelet'],       pattern: 'dots',    seed: 37 },
  zara:   { id: 'zara',   name: 'Zara',   accent: '#ff6a00', role: 'Aventureira · roupa tática',                   h: 0.99, w: 0.96, hair: 0x3a2216, head: 'braid',  kit: ['pouch', 'belt'],           pattern: 'stripes', seed: 41 },
  falcon: { id: 'falcon', name: 'Falcon', accent: '#1f7bff', role: 'Experiente · equipamento profissional',        h: 1.02, w: 1.04, hair: 0x2b2b2d, head: 'cap',    kit: ['radio', 'gaiter', 'plate'], pattern: 'brush',   seed: 53 },
  kira:   { id: 'kira',   name: 'Kira',   accent: '#ff1fa8', role: 'Atlética · visual moderno',                    h: 0.98, w: 0.95, hair: 0xc9a35b, head: 'pony',   kit: ['bracelet', 'belt'],        pattern: 'splat',   seed: 67 },
  rok:    { id: 'rok',    name: 'Rok',    accent: '#e0261f', role: 'Robusto · proteção reforçada',                 h: 1.04, w: 1.13, hair: 0x1c1410, head: 'helmet', kit: ['plate', 'pads', 'pouch'],  pattern: 'camo',    seed: 79 },
  yuri:   { id: 'yuri',   name: 'Yuri',   accent: '#00d4ff', role: 'Jovem adulto · visual tecnológico',            h: 1.0,  w: 0.98, hair: 0x1b1411, head: 'curly',  kit: ['tech', 'radio'],           pattern: 'pixels',  seed: 91 },
};
export const CHAR_LIST = Object.keys(CHARACTERS);
export const charOf = (id) => CHARACTERS[id] || CHARACTERS.bravo;
export const isChar = (id) => !!CHARACTERS[id];

// textura de uniforme: preto + cor do personagem em padrão próprio (como na arte de referência)
const cache = {};
export function charTexture(C) {
  C = charOf(C && C.id ? C.id : C);
  if (cache[C.id]) return cache[C.id];
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  let seed = C.seed * 7919 + 13; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const acc = C.accent, base = '#16171a';
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const blob = (x, y, rx, ry, rot, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
  const splat = (x, y, R, col) => {                       // respingo: miolo + gotas ao redor
    g.fillStyle = col; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    const n = 7 + Math.floor(r() * 8);
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = R * (1 + r() * 1.4), rr = R * (0.12 + r() * 0.3); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + Math.cos(a) * d * 0.6, y + Math.sin(a) * d * 0.6, rr * 1.6, rr * 0.6, a, 0, 7); g.fill(); }
  };
  switch (C.pattern) {
    case 'blotch': for (let i = 0; i < 46; i++) blob(r() * S, r() * S, 40 + r() * 120, 26 + r() * 70, r() * 3, acc); break;                       // grandes manchas
    case 'drips': for (let i = 0; i < 34; i++) { const x = r() * S, y = r() * S; blob(x, y, 30 + r() * 60, 20 + r() * 40, r() * 3, acc); g.fillRect(x - 4, y, 8, 60 + r() * 150); } break;
    case 'dots': for (let i = 0; i < 260; i++) { g.fillStyle = acc; g.beginPath(); g.arc(r() * S, r() * S, 10 + r() * 34, 0, 7); g.fill(); } break;
    case 'stripes': for (let i = 0; i < 52; i++) { g.save(); g.translate(r() * S, r() * S); g.rotate(-0.6 + r() * 0.5); g.fillStyle = acc; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(70 + r() * 60, 20, 150 + r() * 160, 0); g.quadraticCurveTo(80, -22 - r() * 20, 0, 0); g.fill(); g.restore(); } break;
    case 'brush': for (let i = 0; i < 70; i++) { g.save(); g.translate(r() * S, r() * S); g.rotate(r() * 3.14); g.fillStyle = acc; g.fillRect(-20 - r() * 90, -6 - r() * 10, 70 + r() * 190, 12 + r() * 22); g.restore(); } break;
    case 'splat': for (let i = 0; i < 20; i++) splat(r() * S, r() * S, 28 + r() * 60, acc); break;
    case 'camo': for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 60; i++) { const x = r() * S, y = r() * S, rx = 25 + r() * 80, ry = 15 + r() * 45, rot = r() * 3.14; blob(x, y, rx, ry, rot, layer ? acc : '#3a1412'); blob(x + rx * 0.7, y + ry * 0.5, rx * 0.5, ry * 0.6, rot + 0.8, layer ? acc : '#3a1412'); } break;
    case 'pixels': for (let i = 0; i < 520; i++) { const sz = 22 + Math.floor(r() * 3) * 22; g.fillStyle = r() < 0.18 ? '#ffffff' : acc; g.fillRect(Math.floor(r() * S / 22) * 22, Math.floor(r() * S / 22) * 22, sz, sz); } break;
    default: break;
  }
  for (let i = 0; i < 70; i++) splat(r() * S, r() * S, 3 + r() * 7, r() < 0.7 ? acc : '#e8e8e8');                      // respingos pequenos por cima
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(r() * S, r() * S, 40 + r() * 80, 20 + r() * 50, r() * 3, 0, 7); g.fill(); }   // sujeira
  const img = g.getImageData(0, 0, S, S);                                                                                  // trama do tecido
  for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 18; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (cache[C.id] = t);
}
