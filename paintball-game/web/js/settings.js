// Preferências do jogador (salvas no navegador).
export const PALETTES = [
  { name: 'Clássico', a: '#ff8a00', b: '#00b4ff', note: 'Laranja × Azul (melhor para daltonismo)' },
  { name: 'Neon', a: '#ff2e93', b: '#b6ff00', note: 'Rosa × Verde-limão' },
  { name: 'Solar', a: '#ffd400', b: '#8a4dff', note: 'Amarelo × Violeta' },
];

const DEFAULTS = {
  map: 'arena', mode: 'elim', cam: 'fpp', diff: 'normal', palette: 0,
  sens: 1, invertY: false, fov: 72,
  aimAssist: (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) ? 0.5 : 0,
  radar: 'spotted',
  volume: 0.7, music: 0.4, ambient: 0.7, quality: 'auto',
  autoFire: false, fireLeft: false,
  reduceFx: (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches), tapHints: 0, hudScale: 1, crossColor: '#ffffff', crossStyle: 'cross',
  touchScale: 1, lefty: false, haptics: true, coach: false,
};
const listeners = new Set();
const data = { ...DEFAULTS };
try {
  const raw = JSON.parse(localStorage.getItem('splat_settings') || '{}');
  Object.keys(DEFAULTS).forEach((k) => { if (raw[k] !== undefined && typeof raw[k] === typeof DEFAULTS[k]) data[k] = raw[k]; });
} catch (e) { /* sem armazenamento */ }

export const settings = {
  get(k) { return data[k]; },
  set(k, v) {
    if (data[k] === v) return;
    data[k] = v;
    try { localStorage.setItem('splat_settings', JSON.stringify(data)); } catch (e) { /* ignora */ }
    listeners.forEach((fn) => fn(k, v));
  },
  onChange(fn) { listeners.add(fn); },
};
