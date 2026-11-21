// Seleção de personagem: 8 cards com miniatura 3D + prévia 3D rotativa com animações (parado, andando, correndo, agachado, eliminado).
// Usa um renderizador próprio só enquanto a tela está aberta (libera a GPU ao fechar).
import * as THREE from './vendor/three.module.min.js';
import { CHARACTERS, CHAR_LIST, charOf } from './characters.js';
import { buildCharacter } from './models.js';
import { settings } from './settings.js';

const $ = (id) => document.getElementById(id);
const ANIMS = [['idle', 'Parado', { speed: 0 }], ['walk', 'Andando', { speed: 1.5 }], ['run', 'Correndo', { speed: 4.6 }], ['crouch', 'Agachado', { speed: 0, crouch: true }], ['out', 'Eliminado', { speed: 0, handsUp: true }]];
const wait = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export function createCharSelect(game) {
  const thumbs = {};
  let renderer = null, scene = null, cam = null, cur = null, curId = settings.get('character'), raf = 0, last = 0, anim = ANIMS[0], spin = 0.5, dragging = false, disposed = true;

  function ensureRenderer() {
    const canvas = $('cs-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50); cam.position.set(0, 1.12, 4.7); cam.lookAt(0, 0.93, 0);
    // iluminação de estúdio + reflexos suaves (ambiente em gradiente)
    scene.add(new THREE.HemisphereLight(0xcfdcff, 0x3a2e26, 1.1));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.3); key.position.set(-2.5, 3.5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc8ff, 1.4); rim.position.set(3, 2, -3); scene.add(rim);
    const env = new THREE.Scene(), sph = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
    const pos = sph.geometry.attributes.position, col = new Float32Array(pos.count * 3), cT = new THREE.Color(0xdfe9ff), cB = new THREE.Color(0x3a2f28);
    for (let i = 0; i < pos.count; i++) { const k = (pos.getY(i) / 10 + 1) / 2, c = cB.clone().lerp(cT, k); col.set([c.r, c.g, c.b], i * 3); }
    sph.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); env.add(sph);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.04).texture; scene.environmentIntensity = 0.9; pm.dispose();
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.6, metalness: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; scene.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.06, 1.12, 48), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.0; ring.name = 'ring'; scene.add(ring);
    disposed = false;
  }
  function size() {
    const c = $('cs-canvas'), w = Math.max(160, c.clientWidth), h = Math.max(200, c.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function setChar(id) {
    curId = id;
    if (cur) { scene.remove(cur.root); cur.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    cur = buildCharacter(0, game.world, id); cur.root.rotation.y = Math.PI - 0.45; scene.add(cur.root);
    const C = charOf(id); scene.getObjectByName('ring').material.color.set(C.accent);
    $('cs-name').textContent = C.name; $('cs-role').textContent = C.role; $('cs-name').style.color = C.accent;
    document.querySelectorAll('#cs-grid [role=radio]').forEach((b) => { const on = b.dataset.id === id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!cur) return;
    if (!dragging) cur.root.rotation.y += dt * spin;
    cur.animate(dt, { crouch: !!anim[2].crouch, handsUp: !!anim[2].handsUp, pitch: 0, speed: anim[2].speed });
    renderer.render(scene, cam);
  }
  async function makeThumbs() {
    for (const id of CHAR_LIST) {
      if (thumbs[id]) continue;
      await wait();
      if (disposed) return;
      const keep = cur, keepY = keep ? keep.root.rotation.y : 0;
      const t = buildCharacter(0, game.world, id); t.root.rotation.y = Math.PI - 0.5; scene.add(t.root);
      if (keep) keep.root.visible = false;
      for (let i = 0; i < 3; i++) t.animate(0.05, { crouch: false, handsUp: false, pitch: 0, speed: 0 });
      const c = $('cs-canvas'), w = c.width, h = c.height;
      renderer.setPixelRatio(1); renderer.setSize(220, 300, false); cam.aspect = 220 / 300; cam.updateProjectionMatrix(); renderer.setClearColor(0x1a2132, 1); renderer.render(scene, cam); renderer.setClearColor(0x000000, 0);
      thumbs[id] = c.toDataURL('image/jpeg', 0.86);
      scene.remove(t.root); t.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      if (keep) { keep.root.visible = true; keep.root.rotation.y = keepY; }
      size();
      const img = document.querySelector(`#cs-grid [data-id="${id}"] img`); if (img) img.src = thumbs[id];
      if (id === settings.get('character')) refreshButton();
    }
  }
  function buildGrid() {
    const grid = $('cs-grid'); grid.innerHTML = '';
    CHAR_LIST.forEach((id, i) => {
      const C = CHARACTERS[id], b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.id = id; b.className = 'cs-card'; b.style.setProperty('--c', C.accent);
      b.setAttribute('aria-label', `${C.name}: ${C.role}`);
      b.innerHTML = `<span class="cs-thumb"><img alt="" ${thumbs[id] ? `src="${thumbs[id]}"` : ''}><i>${C.name[0]}</i></span><b>${C.name}</b><small>${C.role.split(' · ')[0]}</small>`;
      b.onclick = () => { setChar(id); };
      b.onkeydown = (e) => { const k = e.key; if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(k)) return; e.preventDefault(); const n = (i + (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1) + CHAR_LIST.length) % CHAR_LIST.length; setChar(CHAR_LIST[n]); grid.children[n].focus(); };
      grid.appendChild(b);
    });
    const an = $('cs-anim'); an.innerHTML = '';
    ANIMS.forEach((a) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.textContent = a[1]; b.setAttribute('aria-checked', String(a === anim)); b.onclick = () => { anim = a; an.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b))); }; an.appendChild(b); });
  }
  function refreshButton() {
    const id = settings.get('character'), C = charOf(id);
    $('cb-name').textContent = C.name; $('cb-role').textContent = C.role.split(' · ')[0];
    const t = $('cb-thumb'); t.style.setProperty('--c', C.accent);
    t.innerHTML = thumbs[id] ? `<img alt="" src="${thumbs[id]}">` : `<i>${C.name[0]}</i>`;
  }

  const api = {
    refreshButton,
    open() {
      $('chars').classList.add('on'); document.body.classList.add('chars-open');
      buildGrid(); ensureRenderer(); size(); setChar(charOf(settings.get('character')).id);
      last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      makeThumbs();
      const sel = document.querySelector('#cs-grid [aria-checked=true]'); if (sel) sel.focus({ preventScroll: true });
      addEventListener('resize', size);
    },
    close() {
      $('chars').classList.remove('on'); document.body.classList.remove('chars-open');
      cancelAnimationFrame(raf); removeEventListener('resize', size);
      if (cur) { scene.remove(cur.root); cur.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); cur = null; }
      if (renderer) { renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* ignora */ } renderer = null; }
      disposed = true;
      $('btn-char').focus({ preventScroll: true });
    },
  };
  $('btn-char').onclick = () => api.open();
  $('cs-close').onclick = () => api.close();
  $('cs-use').onclick = () => { game.setCharacter(curId); refreshButton(); api.close(); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('chars').classList.contains('on')) { e.stopPropagation(); api.close(); } }, true);
  const cv = $('cs-canvas'); let px = 0;
  cv.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!dragging || !cur) return; cur.root.rotation.y += (e.clientX - px) * 0.012; px = e.clientX; });
  const up = () => { dragging = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  refreshButton();
  return api;
}
