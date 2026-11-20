import * as THREE from './vendor/three.module.min.js';
import { createWorld, ARENA, TEAM_PAINT, segSphere, segCyl } from './world.js';
import { MAPS, MAP_LIST } from './maps.js';
import { buildMarker, loadCharacterAssets } from './models.js';
import { Combatant, Bot, HITS_TO_OUT, DIFFICULTY } from './combatants.js';
import { Particles } from './effects.js';
import { Sfx } from './audio.js';
import { HUD, MaskOverlay, TEAM_CSS, TEAM_NAME } from './ui.js';
import { Input, IS_TOUCH } from './input.js';
import { camoTexture } from './camo.js';
import { settings, PALETTES } from './settings.js';
import { createScreens } from './screens.js';
import { createRadar } from './radar.js';
import { createOnline } from './online.js';
import { tickTextures, pendingTextures } from './textures.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const Q = params.get('quality') || settings.get('quality');
const LOW = Q === 'low' || (Q === 'auto' && IS_TOUCH);
const SCOPE_ZOOM = [1, 4, 8];
const ROUND_TIME = 150, WIN_SCORE = 3, BALL_SPEED = 88, GRAVITY = 4.2;
const NAMES = ['Rafa', 'Duda', 'Bruno', 'Tati', 'Lipe', 'Gabi', 'Caio', 'Nina', 'Davi', 'Léo', 'Bia', 'Theo', 'Vini', 'Lara', 'Pedro', 'Maju', 'Enzo', 'Livia', 'Kaio', 'Jade', 'Nando', 'Sol', 'Beto', 'Luna', 'Dani', 'Ravi', 'Isis', 'Toni', 'Mel', 'Zeca'];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const loaderProgress = (p, tip) => { $('ld-fill').style.width = `${Math.round(p * 100)}%`; $('ld-fill').parentElement.setAttribute('aria-valuenow', String(Math.round(p * 100))); $('ld-pct').textContent = `${Math.round(p * 100)}%`; if (tip) $('ld-tip').textContent = tip; };
loaderProgress(0.05, 'Calibrando os marcadores…');
await nextFrame();

// paleta de tinta (altera as cores globais antes de construir qualquer coisa)
function paletteApply(i) {
  const p = PALETTES[i] || PALETTES[0];
  TEAM_PAINT[0] = parseInt(p.a.slice(1), 16); TEAM_PAINT[1] = parseInt(p.b.slice(1), 16);
  TEAM_CSS[0] = p.a; TEAM_CSS[1] = p.b;
  document.documentElement.style.setProperty('--o', p.a); document.documentElement.style.setProperty('--b', p.b);
}
paletteApply(settings.get('palette'));

// ---------- cena ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
const basePR = () => Math.min(window.devicePixelRatio || 1, LOW ? 1.25 : 2) * (parseFloat(settings.get('resScale')) || 1);
renderer.setPixelRatio(basePR());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 520);
scene.add(camera);
const world = createWorld(scene, renderer, LOW ? 'low' : 'high');
loaderProgress(0.2, 'Posicionando os bunkers…');
await nextFrame();
const startMap = MAPS[params.get('map')] ? params.get('map') : MAPS[settings.get('map')] ? settings.get('map') : 'arena';
settings.set('map', startMap);
world.loadMap(startMap);
loaderProgress(0.55, 'Enchendo os loaders de tinta…');
await nextFrame();
const particles = new Particles(scene, LOW ? 120 : 240);
const sfx = new Sfx();
const hud = new HUD();
const overlay = new MaskOverlay($('mask'));
const input = new Input(canvas);
const AMB = { arena: 'arena', ferro: 'ferro', favela: 'favela', galpao: 'galpao', cidade: 'cidade' };
// o navegador só libera o áudio depois de um gesto: primeiro toque/clique/tecla em qualquer lugar
const unlockAudio = () => { sfx.setVolume(settings.get('volume')); sfx.setMusic(settings.get('music')); sfx.unlock(); sfx.setAmbientLevel(settings.get('ambient')); if (!sfx.amb) sfx.setAmbient(world.map.id); };
// celulares só liberam o áudio em toques completos (touchend/click): tenta em todos até o som estar ativo
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => addEventListener(ev, () => { if (!sfx.running) unlockAudio(); }, { capture: true }));
addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) sfx.ui(); }, true);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// marcador + braços em primeira pessoa (viewmodel)
let viewmodel = buildMarker(TEAM_PAINT[0]);
viewmodel.scale.setScalar(0.5);
const fp = new THREE.Group();
fp.add(viewmodel);
{
  const sleeve = new THREE.MeshStandardMaterial({ map: camoTexture(0), roughness: 0.9 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 });
  const limb = (a, b, r) => {
    const d = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, d.length(), 12), sleeve);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return mesh;
  };
  const hand = (p, r) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), glove); h.position.copy(p); h.scale.set(1, 0.9, 1.25); return h; };
  const gripR = new THREE.Vector3(0.0, -0.05, 0.035), gripL = new THREE.Vector3(0.0, -0.045, -0.135);
  fp.add(limb(new THREE.Vector3(0.3, -0.42, 0.42), gripR, 0.05), hand(gripR, 0.042));
  fp.add(limb(new THREE.Vector3(-0.2, -0.4, 0.34), gripL, 0.046), hand(gripL, 0.04));
}
fp.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
camera.add(fp);

// ---------- bolinhas ----------
const ballMats = TEAM_PAINT.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.3 }));
const ballGeo = new THREE.SphereGeometry(0.03, 8, 6);
const balls = Array.from({ length: 220 }, () => {
  const mesh = new THREE.Mesh(ballGeo, ballMats[0]);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, owner: null };
});

// sombra "de mancha" sob cada jogador quando as sombras em tempo real estão desligadas (celular)
const blobGeo = new THREE.CircleGeometry(0.5, 14); blobGeo.rotateX(-Math.PI / 2);
const blobs = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 40);
blobs.frustumCulled = false; blobs.count = 0; scene.add(blobs);
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bs = new THREE.Vector3(), _bp = new THREE.Vector3();
function updateBlobs(list) {
  if (world.shadowsOn) { blobs.count = 0; return; }
  let n = 0;
  for (const c of list) {
    if (n >= 40) break;
    if (!c.model.root.visible) continue;
    const k = c.alive ? 1.0 : 1.2;
    _bm.compose(_bp.set(c.pos.x, c.pos.y + 0.03, c.pos.z), _bq, _bs.set(k, 1, k)); blobs.setMatrixAt(n++, _bm);
  }
  blobs.count = n; blobs.instanceMatrix.needsUpdate = true;
}

// ---------- jogo ----------
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
const tmpA = V(), tmpB = V(), tmpC = V(), tmpD = V();

const game = {
  world, scene, camera, sfx, input, hud, overlay,
  state: 'menu', paused: false, settings, camera,
  score: [0, 0], roundNo: 0, roundTime: 0, cd: 0, endT: 0, combatants: [], player: null,
  camMode: 'fpp', shake: 0, switchT: 0, menuOrbit: 0,
  get difficulty() { return settings.get('diff'); },
  get mode() { return settings.get('mode'); },
  flag: { pos: new THREE.Vector3(), carrier: null, mesh: null, cloth: null, beacon: null, cd: 0 },
  get camPref() { return params.get('cam') === 'tpp' ? 'tpp' : settings.get('cam'); },

  distToListener(p) { return camera.position.distanceTo(p); },

  spawnBall(origin, dir, owner) {
    this.spawnBallRaw(origin, dir, owner.team, owner);
    const on = this.online;
    if (on && on.active) {
      if (on.role === 'host') on.queue({ e: 'sh', c: owner.cid, m: [r2(origin.x), r2(origin.y), r2(origin.z)], d: [r3(dir.x), r3(dir.y), r3(dir.z)] });
      else if (owner === this.player) on.sendFire(origin, dir);
    }
  },
  spawnBallRaw(origin, dir, team, owner) {
    const b = balls.find((x) => x.life <= 0);
    if (!b) return;
    b.pos.copy(origin); b.vel.copy(dir).multiplyScalar(BALL_SPEED); b.life = 1.8; b.owner = owner || { team };
    b.mesh.material = ballMats[team]; b.mesh.visible = true; b.mesh.position.copy(origin);
  },
  // convidado: bolinhas só visuais (os acertos quem decide é o anfitrião)
  stepBallsClient(dt) {
    for (const b of balls) {
      if (b.life <= 0) continue;
      b.life -= dt;
      const steps = Math.max(1, Math.ceil((BALL_SPEED * dt) / 0.7)), sdt = dt / steps;
      for (let s = 0; s < steps && b.life > 0; s++) {
        b.vel.y -= GRAVITY * sdt;
        const next = tmpC.copy(b.pos).addScaledVector(b.vel, sdt);
        if (world.segHit(b.pos, next)) { b.life = 0; break; }
        b.pos.copy(next);
      }
      b.mesh.position.copy(b.pos);
      if (b.life <= 0) b.mesh.visible = false;
    }
  },

  // primeiro impacto no segmento p0->p1 (mundo ou inimigos vivos do time oposto a `team`)
  trace(p0, p1, team) {
    const d = tmpD.subVectors(p1, p0);
    let best = world.segHit(p0, p1);
    if (best) best.kind = 'world';
    const hc = tmpA;
    for (const c of this.combatants) {
      if (c.team === team || !c.alive) continue;
      c.headCenter(hc);
      const th = segSphere(p0, d, hc, 0.16);
      const tb = segCyl(p0, d, c.pos.x, c.pos.z, 0.3, c.pos.y, c.bodyTop);
      let t = Infinity, head = false, normal = null;
      if (th >= 0) { t = th; head = true; normal = tmpB.set(0, 0, 0); }
      if (tb && tb.t < t) { t = tb.t; head = false; normal = tmpB.set(tb.nx, tb.ny, tb.nz); }
      if (t < Infinity && (!best || t < best.t)) {
        const point = V().copy(p0).addScaledVector(d, t);
        best = { t, point, normal: head ? point.clone().sub(hc).normalize() : normal.clone(), kind: 'entity', entity: c, head };
      }
    }
    return best;
  },

  stepBalls(dt) {
    for (const b of balls) {
      if (b.life <= 0) continue;
      b.life -= dt;
      const steps = Math.max(1, Math.ceil((BALL_SPEED * dt) / 0.7));
      const sdt = dt / steps;
      for (let s = 0; s < steps && b.life > 0; s++) {
        b.vel.y -= GRAVITY * sdt;
        const next = tmpC.copy(b.pos).addScaledVector(b.vel, sdt);
        const hit = this.trace(b.pos, next, b.owner.team);
        if (hit) { this.onBallHit(b, hit); break; }
        b.pos.copy(next);
        if (Math.abs(b.pos.x) > ARENA.hx + 1 || Math.abs(b.pos.z) > ARENA.hz + 1 || b.pos.y > 40) b.life = 0;
      }
      b.mesh.position.copy(b.pos);
      if (b.life <= 0) b.mesh.visible = false;
    }
  },

  onBallHit(b, hit) {
    b.life = 0;
    const team = b.owner.team, color = TEAM_PAINT[team];
    const n = hit.normal;
    particles.burst(hit.point, n, color, hit.kind === 'entity' ? 14 : 9);
    sfx.splat(Math.min(1, 10 / Math.max(10, this.distToListener(hit.point))));
    const size = 0.45 + Math.random() * 0.4;
    if (this.isHost) this.online.queue({ e: 'im', k: hit.kind === 'world' ? 0 : 1, p: [r2(hit.point.x), r2(hit.point.y), r2(hit.point.z)], n: [r2(n.x), r2(n.y), r2(n.z)], tm: team, sz: r2(size) });
    if (hit.kind === 'world') {
      world.addSplat(hit.point, n, team, size);
    } else {
      hit.entity.mark(b.owner, hit.head, hit.point);
    }
  },

  // tiros que não eliminam: o jogador fica com uma marca de tinta (e a tinta fica na tela) mas segue na partida
  onHit(victim, shooter, head, point) {
    if (this.isHost) this.online.queue({ e: 'hit', v: victim.cid, s: shooter.cid, h: head ? 1 : 0, n: victim.hits, p: [r2(point.x), r2(point.y), r2(point.z)] });
    const you = (c) => (c.isPlayer ? 'Você' : c.name), n = victim.hits, left = HITS_TO_OUT - n;
    hud.feed(`<b style="color:${TEAM_CSS[shooter.team]}">${you(shooter)}</b> acertou <b style="color:${TEAM_CSS[victim.team]}">${you(victim)}</b> · ${n}ª marca${head ? ' 🎯' : ''}`, shooter.team);
    if (shooter.isPlayer) { hud.hitmarker(); sfx.hitmarker(); this.buzz(head ? [30, 25, 50] : 35); }
    if (victim.isPlayer) {
      sfx.splat(1); this.buzz(n >= 2 ? [120, 40, 120] : [90, 40, 70]);
      const col = TEAM_CSS[shooter.team], reduce = settings.get('reduceFx');
      const ang = Math.atan2(-(shooter.pos.x - victim.pos.x), -(shooter.pos.z - victim.pos.z)) - victim.yaw;
      overlay.hitStack(col, -ang, n, reduce ? 0.5 : 1, HITS_TO_OUT - 1);   // a tinta acumula e permanece até o fim da rodada (no último nível quase cobre a tela)
      if (head) overlay.hitFace(col, (0.35 + 0.15 * n) * (reduce ? 0.6 : 1));
      this.shake = reduce ? 0 : 0.3 + 0.1 * n;
      this.hitInfo = { shooter, t: 3, col };
      hud.banner(left === 1 ? 'QUASE FORA! ÚLTIMA MARCA' : `ATINGIDO! ${n}ª MARCA`, left === 1 ? 'Tela quase toda coberta — mais um tiro e você está fora' : `Aguenta mais ${left} tiros — a tinta fica na tela`, 1100, col);
    }
  },

  onMarked(victim, shooter, head, point) {
    if (this.isHost) this.online.queue({ e: 'mark', v: victim.cid, s: shooter.cid, h: head ? 1 : 0, p: [r2(point.x), r2(point.y), r2(point.z)] });
    const you = (c) => (c.isPlayer ? 'Você' : c.name);
    hud.feed(`<b style="color:${TEAM_CSS[shooter.team]}">${you(shooter)}</b> marcou <b style="color:${TEAM_CSS[victim.team]}">${you(victim)}</b>${head ? ' 🎯' : ''}`, shooter.team);
    if (shooter.isPlayer && victim !== shooter) { hud.hitmarker(); sfx.hitmarker(); this.buzz(head ? [40, 30, 90] : 55); }   // acertou: toque curto (na cara: duplo e mais forte)
    if (victim.isPlayer) {
      sfx.marked(); this.buzz([160, 60, 240]);                                                                  // foi marcado: pulso longo e forte
      const col = TEAM_CSS[shooter.team];
      const fx = settings.get('reduceFx') ? 0.45 : 1;
      if (head) overlay.hitFace(col, (this.camMode === 'fpp' ? 1 : 0.6) * fx);
      else {
        const ang = Math.atan2(-(shooter.pos.x - victim.pos.x), -(shooter.pos.z - victim.pos.z)) - victim.yaw;
        overlay.hitBody(col, -ang);
        if (this.camMode === 'fpp') overlay.hitFace(col, 0.85 * fx);
      }
      this.shake = settings.get('reduceFx') ? 0 : 0.5;
      this.switchT = 1.2;
      if (shooter !== victim) this.hitInfo = { shooter, t: 3.6, col };
      hud.banner('VOCÊ FOI MARCADO!', 'Mãos para cima — aguarde a rodada', 0, TEAM_CSS[shooter.team]);
    }
    if (!this.isClient) this.dropFlag(victim);
    this.updateAlive();
    if (!this.isClient) this.checkRoundEnd();
  },

  // seta apontando para quem te marcou (acompanha a câmera) + etiqueta com nome e distância sobre o atirador
  updateHitDir(dt) {
    const hi = this.hitInfo, dirEl = $('hitdir'), tag = $('shooter-tag');
    if (!hi || (hi.t -= dt) <= 0 || this.state === 'menu') { if (hi) this.hitInfo = null; dirEl.classList.remove('on'); tag.style.display = 'none'; return; }
    const sh = hi.shooter, p = this.player;
    const f = camera.getWorldDirection(tmpB), fl = Math.hypot(f.x, f.z) || 1;
    const tx = sh.pos.x - p.pos.x, tz = sh.pos.z - p.pos.z, dist = Math.hypot(tx, tz) || 1;
    const fwd = (tx * f.x + tz * f.z) / fl, rgt = (tx * -f.z + tz * f.x) / fl;
    dirEl.style.setProperty('--hc', hi.col); tag.style.setProperty('--hc', hi.col);
    dirEl.style.transform = `rotate(${Math.atan2(rgt, fwd)}rad)`;
    dirEl.classList.toggle('on', hi.t > 0.4);
    // etiqueta sobre o atirador, se ele estiver no campo de visão
    const v = tmpC.set(sh.pos.x, (sh.pos.y || 0) + 2.15, sh.pos.z).project(camera);
    if (v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05) {
      tag.style.display = 'block'; tag.style.opacity = Math.min(1, hi.t * 1.5);
      tag.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; tag.style.top = `${Math.max(40, (-v.y * 0.5 + 0.5) * innerHeight)}px`;
      tag.firstChild.textContent = sh.name || 'Adversário'; tag.lastChild.textContent = `${Math.round(dist)} m`;
    } else tag.style.display = 'none';
  },

  // ---------------- online ----------------
  updateClient(dt) {
    const p = this.player;
    if (this.state === 'countdown') {
      const n = Math.ceil(this.cd);
      if (n !== this.lastCd && n >= 1 && n <= 3) { this.lastCd = n; hud.banner(String(n), 'Prepare-se', 1000, '#fff'); sfx.beep(false); }
    } else if (this.state === 'playing') hud.time(ROUND_TIME - this.roundTime);
    else if (this.state === 'roundover') {
      this.endT -= dt;
      if (this.endT <= 0) { if (this.matchOver) { this.matchOver = false; this.state = 'menu'; hud.hideBanner(); overlay.clear(false); ui.showEnd(); } else hud.hideBanner(); }
    }
    this.updatePlayer(dt);
    this.online.sendInput(dt);
    this.online.clientStep(dt);
    for (const c of this.combatants) {
      if (!c.alive || c.vel.lengthSq() < 0.5) { c.stepT = 0; continue; }
      c.stepT = (c.stepT || 0) + dt * Math.min(1.6, c.vel.length() / 3);
      if (c.stepT > 0.5) { c.stepT = 0; sfx.step(c.isPlayer ? (c.crouch ? 0.35 : 0.8) : Math.min(1, 7 / Math.max(7, this.distToListener(c.pos))) * (c.crouch ? 0.3 : 0.7)); }
    }
    for (const c of this.combatants) c.syncModel(dt);
    updateBlobs(this.combatants);
    this.stepBallsClient(dt);
    particles.update(dt);
    this.updateCamera(dt);
    this.updateHitDir(dt);
    this.updateHud(dt);
    this.updateFlag(dt);
    if (this.radar) this.radar.update(dt);
    overlay.update(dt);
    if (this.switchT > 0) { this.switchT -= dt; if (this.switchT <= 0 && !p.alive) { this.camMode = 'tpp'; hud.camLabel('tpp'); } }
  },

  // eventos vindos do anfitrião (convidado)
  netEvent(ev) {
    const cb = (id) => this.byCid.get(id);
    switch (ev.e) {
      case 'sh': {
        if (ev.c === this.online.myCid()) break;                       // o próprio tiro já foi desenhado na hora
        const o = cb(ev.c);
        this.spawnBallRaw(V(...ev.m), V(...ev.d), o ? o.team : 0, o);
        if (o) sfx.shot(9 / Math.max(9, this.distToListener(o.pos)));
        break;
      }
      case 'im': {
        const pt = V(...ev.p), n = V(...ev.n);
        particles.burst(pt, n, TEAM_PAINT[ev.tm], ev.k ? 14 : 9);
        sfx.splat(Math.min(1, 10 / Math.max(10, this.distToListener(pt))));
        if (!ev.k) world.addSplat(pt, n, ev.tm, ev.sz);
        for (const b of balls) if (b.life > 0 && b.mesh.material === ballMats[ev.tm] && b.pos.distanceTo(pt) < 1.5) { b.life = 0; b.mesh.visible = false; }
        break;
      }
      case 'hit': {
        const v = cb(ev.v), sh = cb(ev.s); if (!v || !sh) break;
        const pt = V(...ev.p); v.hits = ev.n; v.model.addSplat(pt, sh.team); if (ev.h) v.model.addSplat(pt, sh.team);
        this.onHit(v, sh, !!ev.h, pt); break;
      }
      case 'mark': {
        const v = cb(ev.v), sh = cb(ev.s); if (!v || !sh) break;
        const pt = V(...ev.p);
        v.state = 'marked'; v.hits = HITS_TO_OUT; v.crouch = false; v.vel.set(0, 0, 0);
        if (ev.h) v.model.setHeadPaint(true); else v.model.addSplat(pt, sh.team);
        if (ev.h) v.model.addSplat(pt, sh.team);
        sh.kills++;
        this.onMarked(v, sh, !!ev.h, pt); break;
      }
      case 'fl': {
        const c = cb(ev.c); if (!c) break;
        const nm = `<b style="color:${TEAM_CSS[c.team]}">${c.isPlayer ? 'Você' : c.name}</b>`;
        if (ev.k === 'pick') { sfx.beep(true); hud.feed(`${nm} pegou a bandeira!`, c.team); if (c.isPlayer) hud.banner('VOCÊ PEGOU A BANDEIRA!', 'Leve até a base inimiga', 1800, '#ffd24a'); }
        else hud.feed(`${nm} derrubou a bandeira`, c.team);
        break;
      }
      case 'left': { const c = cb(ev.c); if (c) { hud.feed(`${c.name} saiu da partida`, c.team); this.removeCombatant(c); } break; }
      case 'ph': this.netPhase(ev); break;
      default: break;
    }
  },
  netPhase(ev) {
    if (ev.st === 'countdown') {
      if (ev.nm) { this.score = [0, 0]; this.combatants.forEach((c) => { c.kills = 0; }); hud.score(0, 0); this.matchOver = false; $('end').classList.remove('on'); document.body.classList.add('ingame'); }
      this.roundNo = ev.rn; this.epoch = ev.ep; this.needTeleport = true;
      balls.forEach((b) => { b.life = 0; b.mesh.visible = false; });
      world.clearSplats(); overlay.clear(false);
      this.camMode = this.camPref; this.switchT = 0; this.hitInfo = null; this.scopeLvl = 0;
      hud.round(ev.rn); hud.time(ROUND_TIME); hud.camLabel(this.camMode); hud.hideBanner(); this.resetFlag();
      this.combatants.forEach((c) => c.reset(c.pos.x, c.pos.z, this.spawnYaw(c.team)));
      this.player.pods = 4;
      this.updateAlive(); this.state = 'countdown'; this.cd = 3.4; this.lastCd = 4;
    } else if (ev.st === 'playing') {
      this.state = 'playing'; hud.banner('TIRO LIVRE!', this.mode === 'flag' ? 'Pegue a bandeira no centro e leve à base inimiga' : '', 1800, '#ffd24a'); sfx.beep(true);
    } else if (ev.st === 'roundover') {
      this.state = 'roundover'; this.endT = 3.6; this.score = [ev.sc[0], ev.sc[1]];
      if (ev.mo) this.matchOver = true;
      this.showRoundOver(ev.w, ev.why, !!ev.mo);
    }
  },
  startOnline(list, cfg) {
    if (!this._prev) this._prev = { map: settings.get('map'), mode: settings.get('mode'), teamSize: settings.get('teamSize'), diff: settings.get('diff') };
    settings.set('mode', cfg.mode); settings.set('diff', cfg.diff); settings.set('teamSize', cfg.teamSize);
    this.roster = list;
    settings.set('map', cfg.map); world.loadMap(cfg.map); sfx.setAmbient(cfg.map); if (this.radar) this.radar.reset();
    this.rebuild(); this.setViewTeam(this.player.team);
    this.score = [0, 0]; this.roundNo = 0; this.epoch = 0; this.matchOver = false; this.hitInfo = null; this.scopeLvl = 0; this.cine = null; this.needTeleport = false;
    ui.hideHome(); ui.hidePause(); this.paused = false; this.tutorialWait = true;      // espera todos carregarem
    document.body.classList.add('ingame', 'online');
    hud.score(0, 0); hud.round(1); hud.time(ROUND_TIME); this.updateAlive(); this.resetFlag();
    this.state = 'countdown'; this.cd = 5; this.lastCd = 9;
    hud.banner('Aguardando os jogadores…', 'A partida começa em instantes', 0, '#fff');
    sfx.setMusicScale(0.55); unlockAudio(); mapLabel();
  },
  beginOnlineMatch() { hud.hideBanner(); this.tutorialWait = false; this.startMatch(); input.requestLock(); },
  rematchOnline() { $('end').classList.remove('on'); document.body.classList.add('ingame'); this.matchOver = false; this.tutorialWait = false; this.startMatch(); input.requestLock(); },
  leaveOnline() {
    const pv = this._prev; this._prev = null;
    if (pv) { settings.set('mode', pv.mode); settings.set('diff', pv.diff); settings.set('teamSize', pv.teamSize); settings.set('map', pv.map); world.loadMap(pv.map); sfx.setAmbient(pv.map); if (this.radar) this.radar.reset(); }
    this.roster = null; this.rebuild(); this.setViewTeam(0); this.epoch = 0; this.tutorialWait = false;
    $('end').classList.remove('on'); document.body.classList.remove('online');
    this.goHome(); mapLabel();
  },
  removeCombatant(c) {
    scene.remove(c.model.root); c.model.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.combatants = this.combatants.filter((x) => x !== c); this.byCid.delete(c.cid);
    if (this.flag.carrier === c) this.flag.carrier = null;
    this.updateAlive(); if (this.isHost) this.checkRoundEnd();
  },
  setViewTeam(team) {
    fp.remove(viewmodel); viewmodel = buildMarker(TEAM_PAINT[team]); viewmodel.scale.setScalar(0.5);
    viewmodel.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    fp.add(viewmodel);
  },

  updateAlive() {
    [0, 1].forEach((t) => hud.alive(t, this.combatants.filter((c) => c.team === t).map((c) => c.alive)));
  },

  buildFlag() {
    if (this.flag.mesh) return;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.8, 8), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.8, roughness: 0.3 }));
    pole.position.y = 1.4; pole.castShadow = true;
    const clothGeo = new THREE.PlaneGeometry(1.0, 0.62, 10, 4);
    const cloth = new THREE.Mesh(clothGeo, new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffa000, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide }));
    cloth.position.set(0.5, 2.45, 0); cloth.castShadow = true;
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 16, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beacon.position.y = 8;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 32), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
    g.add(pole, cloth, beacon, ring);
    g.visible = false; scene.add(g);
    Object.assign(this.flag, { mesh: g, cloth, beacon, ring, base: clothGeo.attributes.position.array.slice() });
  },

  resetFlag() {
    const f = this.flag; f.carrier = null; f.cd = 0;
    f.pos.set(world.flagSpot ? world.flagSpot.x : 0, 0, world.flagSpot ? world.flagSpot.z : 0);
    if (f.mesh && f.mesh.parent !== scene) scene.add(f.mesh);
    if (f.mesh) f.mesh.position.copy(f.pos);
  },

  dropFlag(c) {
    const f = this.flag; if (f.carrier !== c) return;
    f.carrier = null; f.cd = 1.2;
    f.pos.set(c.pos.x, 0, c.pos.z); world.collide(f.pos, 0.5);
    hud.feed(`<b style="color:${TEAM_CSS[c.team]}">${c.isPlayer ? 'Você' : c.name}</b> derrubou a bandeira`, c.team);
    if (this.isHost) this.online.queue({ e: 'fl', k: 'drop', c: c.cid });
  },

  updateFlag(dt) {
    const f = this.flag, on = this.mode === 'flag';
    document.body.classList.toggle('flagmode', on);
    if (!f.mesh) return;
    f.mesh.visible = on && this.state !== 'menu';
    if (!f.mesh.visible) return;
    const t = performance.now() / 1000;
    f.cloth.rotation.y = 0;
    const pos = f.cloth.geometry.attributes.position, b = f.base;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(b[i * 3] * 5 - t * 6) * 0.07 * (b[i * 3] + 0.5));
    pos.needsUpdate = true;
    f.beacon.material.opacity = 0.14 + 0.08 * Math.sin(t * 3);
    if (f.carrier) {
      const root = f.carrier.model.root;
      if (f.mesh.parent !== root) { root.add(f.mesh); f.mesh.scale.setScalar(0.5); f.mesh.rotation.set(0, Math.PI, 0.08); f.mesh.position.set(0.0, 0.3, 0.3); }
      f.beacon.visible = false; f.ring.visible = false;
    } else {
      if (f.mesh.parent !== scene) { scene.add(f.mesh); f.mesh.scale.setScalar(1); f.mesh.rotation.set(0, 0, 0); }
      f.mesh.position.copy(f.pos); f.beacon.visible = true; f.ring.visible = true;
      if (this.state !== 'playing' || this.isClient) return;
      f.cd = Math.max(0, f.cd - dt);
      if (f.cd > 0) return;
      let best = null, bd = 1.15;
      for (const c of this.combatants) {
        if (!c.alive) continue;
        const d = Math.hypot(c.pos.x - f.pos.x, c.pos.z - f.pos.z);
        if (d < bd) { bd = d; best = c; }
      }
      if (best) {
        f.carrier = best; sfx.beep(true);
        if (this.isHost) this.online.queue({ e: 'fl', k: 'pick', c: best.cid });
        hud.feed(`<b style="color:${TEAM_CSS[best.team]}">${best.isPlayer ? 'Você' : best.name}</b> pegou a bandeira!`, best.team);
        if (best.isPlayer) hud.banner('VOCÊ PEGOU A BANDEIRA!', 'Leve até a base inimiga', 1800, '#ffd24a');
      }
    }
    // captura: portador chega à base inimiga
    const c = f.carrier;
    if (c && this.state === 'playing' && !this.isClient) {
      const goal = ARENA.hz - 5;
      const ok = c.team === 0 ? c.pos.z < -goal : c.pos.z > goal;
      if (ok && Math.abs(c.pos.x) < 11) this.endRound(c.team, 'flag');
    }
  },

  defaultRoster() {
    const nm = NAMES.slice().sort(() => Math.random() - 0.5), N = settings.get('teamSize') || 8, r = [{ cid: 0, name: 'Você', team: 0, me: true }];
    for (let i = 0; i < N * 2 - 1; i++) r.push({ cid: i + 1, name: nm[i % nm.length], team: i < N - 1 ? 0 : 1, bot: true });
    return r;
  },

  setup() {
    this.buildFlag();
    const roster = this.roster || (this.roster = this.defaultRoster());
    this.combatants = []; this.byCid = new Map();
    for (const r of roster) {
      const o = { name: r.name, team: r.team, isPlayer: !!r.me };
      const c = r.bot ? new Bot(this, o) : new Combatant(this, o);
      c.cid = r.cid; c.pid = r.pid || null; c.remote = !!r.remote;
      this.combatants.push(c); this.byCid.set(c.cid, c);
      if (r.me) this.player = c;
    }
    this.layout();
  },

  layout() {
    // cada time se espalha pela linha de largada (em duas fileiras se for grande); você fica no centro do seu time
    const W = ARENA.hx - 4;
    const slotsFor = (n, playerMid) => {
      const xs = Array.from({ length: n }, (_, i) => (n === 1 ? 0 : -W + (2 * W * i) / (n - 1)));
      const order = playerMid ? xs.map((x, i) => ({ x, i })).sort((a, b) => Math.abs(a.x) - Math.abs(b.x)) : xs.map((x, i) => ({ x, i }));
      return order.map((o) => ({ x: o.x, row: n > 9 ? o.i % 2 : 0 }));
    };
    const count = [0, 1].map((t) => this.combatants.filter((c) => c.team === t).length);
    const slots = [slotsFor(count[0], true), slotsFor(count[1], true)];
    const idx = [0, 0];
    this.combatants.forEach((c) => {
      const sl = slots[c.team][idx[c.team]++], dir = c.team === 0 ? 1 : -1;
      c.reset(sl.x, dir * (ARENA.hz - 3 - sl.row * 1.8), c.team === 0 ? 0 : Math.PI);
    });
  },

  setTeamSize() { this.roster = null; this.rebuild(); this.updateAlive(); },

  buzz(p) { if (settings.get('haptics') && IS_TOUCH && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignora */ } } },

  rebuild() { // recria os personagens (troca de paleta)
    this.combatants.forEach((c) => { scene.remove(c.model.root); c.model.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
    this.combatants = [];
    this.setup();
  },

  get isClient() { return !!(this.online && this.online.active && this.online.role === 'client'); },
  get isHost() { return !!(this.online && this.online.active && this.online.role === 'host'); },
  spawnYaw(team) { return team === 0 ? 0 : Math.PI; },

  startMatch() {
    this.score = [0, 0]; this.roundNo = 0;
    this.combatants.forEach((c) => { c.kills = 0; });
    hud.score(0, 0);
    this.nextRound();
  },

  nextRound() {
    this.roundNo++;
    this.layout();
    this.resetFlag();
    this.player.pods = 4;
    balls.forEach((b) => { b.life = 0; b.mesh.visible = false; });
    world.clearSplats();
    overlay.clear(false);
    this.camMode = this.camPref; this.switchT = 0;
    hud.round(this.roundNo); hud.time(ROUND_TIME); hud.camLabel(this.camMode);
    this.updateAlive();
    this.state = 'countdown'; this.cd = 3.4; this.roundTime = 0; this.lastCd = 4;
    this.player.yaw = this.spawnYaw(this.player.team); this.player.pitch = 0;
    if (this.isHost) { this.epoch = (this.epoch || 0) + 1; this.online.queue({ e: 'ph', st: 'countdown', rn: this.roundNo, ep: this.epoch, nm: this.roundNo === 1 ? 1 : 0 }); }
  },

  checkRoundEnd() {
    if (this.state !== 'playing') return;
    const alive = [0, 1].map((t) => this.combatants.filter((c) => c.team === t && c.alive).length);
    if (alive[0] === 0 || alive[1] === 0) this.endRound(alive[0] === 0 ? 1 : 0);
  },

  endRound(winner, why) {
    this.state = 'roundover'; this.endT = 3.6;
    if (winner >= 0) this.score[winner]++;
    const matchOver = this.score.some((s) => s >= WIN_SCORE);
    this.showRoundOver(winner, why, matchOver);
    if (matchOver) this.matchOver = true;
    if (this.isHost) this.online.queue({ e: 'ph', st: 'roundover', w: winner, why: why || '', mo: matchOver ? 1 : 0, sc: [this.score[0], this.score[1]] });
  },

  // banners/sons do fim de rodada (usado pelo anfitrião e pelos convidados)
  showRoundOver(winner, why, matchOver) {
    const me = this.player.team;
    if (why === 'flag') sfx.beep(true);
    hud.score(this.score[0], this.score[1]);
    if (matchOver) {
      const won = this.score[me] > this.score[1 - me];
      hud.banner(won ? 'VITÓRIA!' : 'DERROTA', `Placar final ${this.score[0]} – ${this.score[1]}`, 0, won ? '#7dff7a' : '#ff5a5a');
      won ? sfx.win() : sfx.lose();
    } else if (winner < 0) {
      hud.banner('EMPATE', 'Tempo esgotado', 0, '#fff');
    } else {
      hud.banner(why === 'flag' ? `BANDEIRA CAPTURADA!` : `RODADA ${TEAM_NAME[winner]}`, `${why === 'flag' ? TEAM_NAME[winner] + ' · ' : ''}Placar ${this.score[0]} – ${this.score[1]}`, 0, TEAM_CSS[winner]);
      winner === me ? sfx.win() : sfx.lose();
    }
  },

  // ---------- atualização ----------
  update(dt) {
    const p = this.player;
    camera.getWorldDirection(this.camFwd || (this.camFwd = new THREE.Vector3()));
    if (this.state === 'menu') { this.menuOrbit += dt * 0.12; this.menuCamera(); particles.update(dt); return; }
    if (this.isClient) { this.updateClient(dt); return; }
    // fases da rodada
    if (this.state === 'countdown') {
      if (!this.tutorialWait) this.cd -= dt;
      const n = Math.ceil(this.cd);
      if (n !== this.lastCd && n >= 1 && n <= 3) { this.lastCd = n; hud.banner(String(n), 'Prepare-se', 1000, '#fff'); sfx.beep(false); }
      if (this.cd <= 0) { this.state = 'playing'; hud.banner('TIRO LIVRE!', this.mode === 'flag' ? 'Pegue a bandeira no centro e leve à base inimiga' : '', 1800, '#ffd24a'); sfx.beep(true); if (this.isHost) this.online.queue({ e: 'ph', st: 'playing' }); }
    } else if (this.state === 'playing') {
      this.roundTime += dt;
      hud.time(ROUND_TIME - this.roundTime);
      if (this.roundTime >= ROUND_TIME) {
        const a = [0, 1].map((t) => this.combatants.filter((c) => c.team === t && c.alive).length);
        this.endRound(a[0] === a[1] ? -1 : a[0] > a[1] ? 0 : 1);
      }
    } else if (this.state === 'roundover') {
      this.endT -= dt;
      if (this.endT <= 0) {
        if (this.matchOver) { this.matchOver = false; this.state = 'menu'; hud.hideBanner(); overlay.clear(false); ui.showEnd(); } else { hud.hideBanner(); this.nextRound(); }
      }
    }

    if (this.isHost) this.online.hostPre(dt);
    this.updatePlayer(dt);
    for (const c of this.combatants) {
      if (c instanceof Bot) c.think(dt);
      else c.tick(dt);
    }
    // separação simples entre jogadores vivos
    const cs = this.combatants;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      if (!a.alive || !b.alive) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.7 && d > 1e-4) { const k = (0.7 - d) / 2 / d; a.pos.x -= dx * k; a.pos.z -= dz * k; b.pos.x += dx * k; b.pos.z += dz * k; }
    }
    for (const c of cs) {
      if (!c.alive || c.vel.lengthSq() < 0.5) { c.stepT = 0; continue; }
      c.stepT = (c.stepT || 0) + dt * Math.min(1.6, c.vel.length() / 3);
      if (c.stepT > 0.5) { c.stepT = 0; sfx.step(c.isPlayer ? (c.crouch ? 0.35 : 0.8) : Math.min(1, 7 / Math.max(7, this.distToListener(c.pos))) * (c.crouch ? 0.3 : 0.7)); }
    }
    for (const c of cs) c.syncModel(dt);
    updateBlobs(cs);
    this.stepBalls(dt);
    particles.update(dt);
    this.updateCamera(dt);
    this.updateHitDir(dt);
    this.updateHud(dt);
    this.updateFlag(dt);
    if (this.radar) this.radar.update(dt);
    overlay.update(dt);
    if (this.isHost) this.online.hostPost(dt);
    if (this.switchT > 0) { this.switchT -= dt; if (this.switchT <= 0 && !p.alive) { this.camMode = 'tpp'; hud.camLabel('tpp'); } }
  },

  updatePlayer(dt) {
    const p = this.player;
    if (this.paused) { p.vel.multiplyScalar(0.8); p.wantShoot = false; input.consumeLook(); return; }   // menu aberto numa partida online
    const look = input.consumeLook();
    const s = 0.0022 * settings.get('sens') / Math.pow(this.zoomK || 1, 0.9);       // zoom: giro mais lento e preciso
    p.yaw -= look.x * s;
    p.pitch = Math.max(-1.3, Math.min(1.4, p.pitch - look.y * s * (settings.get('invertY') ? -1 : 1)));
    // tiro automático: dispara quando a mira cruza um inimigo visível (~3°)
    const live = p.alive && this.state === 'playing';
    input.auto = !!(live && settings.get('autoFire') && this.aimTarget(0.055));
    if (live && input.fire) this.assistAim(dt, look);
    const active = this.state === 'playing' || this.state === 'countdown';
    if (!p.alive || !active) { p.vel.multiplyScalar(0.8); return; }
    if (this.state === 'countdown') return;
    const m = input.move();
    p.crouch = input.crouch;
    const speed = p.crouch ? 2.0 : m.sprint && m.y < 0 ? 6.0 : 4.3;
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    const wx = (-sin * -m.y + cos * m.x) * speed, wz = (-cos * -m.y - sin * m.x) * speed;
    const k = Math.min(1, dt * 12);
    p.vel.x += (wx - p.vel.x) * k; p.vel.z += (wz - p.vel.z) * k;
    p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
    world.collide(p.pos, 0.35);
    p.updateY(dt);
    p.tick(dt);
    p.wantShoot = input.fire;
  },

  // inimigo visível mais próximo da mira (dentro de um cone) — usado pela assistência e pelo tiro automático
  aimTarget(cone) {
    const p = this.player, eye = V(p.pos.x, p.eyeY, p.pos.z), pt = V();
    let best = null, bestAng = cone;
    for (const c of this.combatants) {
      if (c.team === p.team || !c.alive) continue;
      c.chestCenter(pt);
      const dx = pt.x - eye.x, dz = pt.z - eye.z, dy = pt.y - eye.y, hd = Math.hypot(dx, dz);
      if (hd > 45 || hd < 1) continue;
      const wy = Math.atan2(-dx, -dz), wp = Math.atan2(dy, hd);
      const dyaw = Math.atan2(Math.sin(wy - p.yaw), Math.cos(wy - p.yaw)), dpit = wp - p.pitch;
      const ang = Math.hypot(dyaw, dpit);
      if (ang >= bestAng) continue;
      const hit = world.segHit(eye, pt.clone(), false);
      if (hit && hit.t < 0.97) continue;
      bestAng = ang; best = { dyaw, dpit, ang };
    }
    return best;
  },

  // assistência de mira: enquanto atira, puxa suavemente a câmera para o inimigo
  assistAim(dt, look) {
    const strength = settings.get('aimAssist');
    if (!strength) return;
    const best = this.aimTarget(0.38), p = this.player;
    if (!best) return;
    const manual = Math.min(1, Math.hypot(look.x, look.y) / 30);   // quanto o jogador está mexendo: cede o controle
    const k = Math.min(1, dt * 5 * strength) * (1 - 0.8 * manual);
    p.yaw += best.dyaw * k; p.pitch = Math.max(-1.3, Math.min(1.4, p.pitch + best.dpit * k));
  },

  menuCamera() {
    const cfg = (this.world.map && this.world.map.menu) || { r: 36, h: 9, rz: 1.3, look: [0, 1.4, 0] };
    const a = this.menuOrbit;
    camera.fov = 62; camera.updateProjectionMatrix();
    camera.position.set(Math.sin(a) * cfg.r, cfg.h, Math.cos(a) * cfg.r * cfg.rz);
    camera.lookAt(...cfg.look);
    fp.visible = false;
    this.player.model.root.visible = true;
  },

  updateCamera(dt) {
    const p = this.player;
    if (this.cine) { // câmera cinematográfica (usada para gravar vídeos)
      this.cine(camera, dt);
      fp.visible = false; p.model.root.visible = true;
      camera.updateMatrixWorld(true);
      return;
    }
    // mira com zoom: FOV encolhe suavemente (zoom óptico real: tan(fov/2) / zoom)
    if (!p.alive || this.state === 'menu') this.scopeLvl = 0;
    const zt = SCOPE_ZOOM[this.scopeLvl || 0];
    this.zoomK = (this.zoomK || 1) + (zt - (this.zoomK || 1)) * Math.min(1, dt * 14);
    if (Math.abs(this.zoomK - zt) < 0.01) this.zoomK = zt;
    const scoped = this.zoomK > 1.5;
    p.scoped = scoped; $('btn-zoom').classList.toggle('active', !!this.scopeLvl);
    document.body.classList.toggle('scoped', scoped);
    $('scope').classList.toggle('on', scoped);
    if (scoped) $('scope-zoom').textContent = `${SCOPE_ZOOM[this.scopeLvl]}×`;
    const base = settings.get('fov'), fov = this.zoomK > 1.001 ? (2 * Math.atan(Math.tan(base * Math.PI / 360) / this.zoomK)) * 180 / Math.PI : base;
    if (Math.abs(camera.fov - fov) > 0.005) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const fpp = (this.camMode === 'fpp' || scoped) && p.alive;
    const eye = tmpA.set(p.pos.x, p.eyeY, p.pos.z);
    camera.rotation.order = 'YXZ';
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sh = settings.get('reduceFx') ? 0 : this.shake * 0.02;
    // respiração do atirador: oscilação que cresce com o zoom (agachar ou segurar Shift estabiliza)
    let swx = 0, swy = 0;
    if (scoped && !settings.get('reduceFx')) {
      const steady = (p.crouch ? 0.4 : 1) * (input.keys.ShiftLeft || input.keys.ShiftRight ? 0.25 : 1), t = performance.now() / 1000, a = 0.0009 * this.zoomK * steady;
      swx = Math.sin(t * 1.7) * a + Math.sin(t * 3.1) * a * 0.4; swy = Math.cos(t * 1.3) * a * 0.8;
    }
    camera.rotation.y = p.yaw + swx + (Math.random() - 0.5) * sh;
    camera.rotation.x = p.pitch + swy + (Math.random() - 0.5) * sh;
    camera.rotation.z = 0;
    camera.updateMatrixWorld(true);
    const dir = camera.getWorldDirection(tmpB);
    if (fpp) {
      camera.position.copy(eye);
      fp.visible = !scoped;
      p.model.root.visible = false;
    } else {
      const right = tmpC.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const desired = V().copy(eye).addScaledVector(dir, -2.7).addScaledVector(right, 0.6).add(V(0, 0.25, 0));
      const hit = world.segHit(eye, desired, true);
      const t = hit ? Math.max(0.05, hit.t - 0.1) : 1;
      camera.position.copy(eye).addScaledVector(V().subVectors(desired, eye), t);
      camera.position.y = Math.max(0.25, camera.position.y);
      fp.visible = false;
      p.model.root.visible = true;
    }
    this.animateViewmodel(dt);
    camera.updateMatrixWorld(true);
    if (p.alive && this.state === 'playing' && p.wantShoot) this.playerShoot();
  },

  animateViewmodel(dt) {
    const p = this.player;
    this.vmT = (this.vmT || 0) + dt * (2 + p.vel.length() * 1.6);
    const bob = Math.min(1, p.vel.length() / 4);
    this.recoil = Math.max(0, (this.recoil || 0) - dt * 9);
    const rl = p.reloadT > 0 ? 1 : 0;
    this.vmRl = (this.vmRl || 0) + (rl - (this.vmRl || 0)) * Math.min(1, dt * 8);
    fp.position.set(
      0.2 + Math.sin(this.vmT) * 0.008 * bob,
      -0.2 + Math.abs(Math.cos(this.vmT)) * 0.012 * bob - this.vmRl * 0.12,
      -0.5 + this.recoil * 0.04
    );
    fp.rotation.set(this.recoil * 0.06 + this.vmRl * 0.6, 0.03, -this.vmRl * 0.5);
  },

  playerShoot() {
    const p = this.player;
    if (!p.canFire()) return;
    const camPos = camera.getWorldPosition(tmpA.clone());
    const camDir = camera.getWorldDirection(tmpB.clone());
    const far = camPos.clone().addScaledVector(camDir, 120);
    const hit = this.trace(camPos, far, p.team);
    const aim = hit ? hit.point.clone() : far;
    let muzzle;
    if (this.camMode === 'fpp') {
      const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
      muzzle = camPos.clone().addScaledVector(camDir, 0.55).addScaledVector(right, 0.1).add(V(0, -0.1, 0));
    } else {
      p.model.root.updateMatrixWorld(true);
      muzzle = p.model.marker.userData.muzzle.getWorldPosition(new THREE.Vector3());
    }
    const dir = aim.clone().sub(muzzle);
    if (dir.length() < 1.2 || dir.normalize().dot(camDir) < 0.2) dir.copy(camDir);
    if (p.fire(muzzle, dir.normalize())) this.recoil = 1;
  },

  updateHud(dt) {
    const p = this.player;
    hud.ammo(p.hopper, p.pods, p.reloadT);
    $('reload-hint').classList.toggle('on', p.alive && this.state === 'playing' && (p.hopper < 30 || p.reloadT > 0) && p.reloadT <= 0 && p.pods > 0);
    hud.crosshair(p.spread, p.alive);
    hud.lives(p.alive ? HITS_TO_OUT - p.hits : 0);
    if (this.mode === 'flag') { const f = this.flag; $('flag-status').textContent = f.carrier ? `BANDEIRA: ${f.carrier.isPlayer ? 'VOCÊ' : f.carrier.name.toUpperCase()} (${TEAM_NAME[f.carrier.team]})` : 'BANDEIRA: NO CHÃO'; }
    const hidden = p.alive && this.state === 'playing' && world.isInterior(p.pos.x, p.pos.z) && !this.combatants.some((c) => c instanceof Bot && c.alive && c.target === p);
    $('stealth').classList.toggle('on', hidden);
  },

  toggleCam() {
    if (!this.player.alive) return;
    this.camMode = this.camMode === 'fpp' ? 'tpp' : 'fpp';
    settings.set('cam', this.camMode);
    hud.camLabel(this.camMode);
  },

  // ---------- navegação ----------
  setMap(id) {
    settings.set('map', id);
    world.loadMap(id);
    sfx.setAmbient(id);
    if (this.radar) this.radar.reset();
    this.layout();
    $('map-label').textContent = `${MAPS[id].name} · ${settings.get('mode') === 'flag' ? 'Centerflag' : 'Eliminação'}`;
  },
  setPalette(i) {
    paletteApply(i);
    world.recolor();
    ballMats.forEach((mt, t) => { mt.color.set(TEAM_PAINT[t]); mt.emissive.set(TEAM_PAINT[t]); });
    fp.remove(viewmodel); viewmodel = buildMarker(TEAM_PAINT[0]); viewmodel.scale.setScalar(0.5);
    viewmodel.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    fp.add(viewmodel);
    this.rebuild();
    this.updateAlive();
  },
  begin(restart) {
    this.hitInfo = null;
    unlockAudio(); sfx.setMusicScale(0.55);
    if (IS_TOUCH) {
      try { document.documentElement.requestFullscreen?.(); screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { /* ignora */ }
    }
    this.paused = false;
    ui.hideHome(); ui.hidePause();
    this.startMatch();
    // primeiro acesso: o tutorial segura a contagem até o jogador confirmar
    this.tutorialWait = ui.maybeCoach();
    if (!this.tutorialWait) input.requestLock();
  },
  openPause() {
    if (this.state === 'menu' || this.paused) return;
    this.paused = true; ui.showPause();
    if (document.pointerLockElement) document.exitPointerLock();
  },
  tutorialDone() { // jogador confirmou o tutorial: libera a contagem
    if (!this.tutorialWait) return;
    this.tutorialWait = false; this.cd = Math.max(this.cd, 3.4); this.lastCd = 4;
    input.requestLock();
  },
  resume() { this.paused = false; ui.hidePause(); input.requestLock(); },
  goHome() {
    this.paused = false; this.state = 'menu'; this.matchOver = false; this.hitInfo = null; this.scopeLvl = 0; $('hitdir').classList.remove('on'); $('shooter-tag').style.display = 'none';
    hud.hideBanner(); overlay.clear(false); this.cine = null;
    balls.forEach((b) => { b.life = 0; b.mesh.visible = false; });
    if (this.flag.mesh) this.flag.mesh.visible = false;
    sfx.setMusicScale(1); this.layout(); ui.showHome();
    if (document.pointerLockElement) document.exitPointerLock();
  },
};

// ---------- ligações de UI ----------
loaderProgress(0.75, 'Vestindo os jogadores…');
await nextFrame();
await loadCharacterAssets();
game.setup();
const ui = createScreens(game);
game.ui = ui;
game.online = createOnline(game, { THREE, NAMES });
$('btn-online').onclick = () => game.online.openEntry();
game.unlockAudio = unlockAudio;
const radar = createRadar(game, $('radar'));
game.radar = radar;
hud.camLabel(game.camPref);
const mapLabel = () => { $('map-label').textContent = `${MAPS[world.map.id].name} · ${settings.get('mode') === 'flag' ? 'Centerflag' : 'Eliminação'}`; };
mapLabel(); settings.onChange((k) => { if (k === 'mode') mapLabel(); });
sfx.setVolume(settings.get('volume'));
settings.onChange((k, v) => { if (k === 'volume') sfx.setVolume(v); if (k === 'music') sfx.setMusic(v); if (k === 'ambient') sfx.setAmbientLevel(v); });
sfx.setMusic(settings.get('music')); sfx.ambKind = startMap; sfx.setAmbientLevel(settings.get('ambient'));
input.on.scope = (down) => { if (down) { if (game.player.alive && game.state !== 'menu' && !game.paused) game.scopeLvl = game.lastScope || 1; } else { if (game.scopeLvl) game.lastScope = game.scopeLvl; game.scopeLvl = 0; } };
input.on.scopeStep = (d) => { if (game.scopeLvl) { game.scopeLvl = d > 0 ? 2 : 1; game.lastScope = game.scopeLvl; } };
input.on.scopeToggle = () => { if (!game.player.alive || game.state === 'menu' || game.paused) return; game.scopeLvl = ((game.scopeLvl || 0) + 1) % 3; document.getElementById('btn-zoom').classList.toggle('active', !!game.scopeLvl); };
input.on.reload = () => { if (game.state === 'playing' && !game.paused) game.player.startReload(); };
input.on.cam = () => { if (!game.paused && game.state !== 'menu') game.toggleCam(); };
input.on.pause = () => {
  if (ui.settingsOpen()) ui.closeSettings();
  else if (game.paused) game.resume();
  else game.openPause();
};
input.on.lockChange = (locked) => { if (!locked && game.state !== 'menu' && !game.paused && !IS_TOUCH && !ui.settingsOpen()) game.openPause(); };
canvas.addEventListener('mousedown', () => { if (!IS_TOUCH && !input.locked && game.state !== 'menu' && !game.paused) input.requestLock(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { game.openPause(); sfx.suspend(); } else sfx.resume(); });
addEventListener('keydown', (e) => { if (e.code === 'Tab' && !game.paused && !ui.settingsOpen() && game.state !== 'menu') { e.preventDefault(); ui.toggleBoard(true); } });
addEventListener('keyup', (e) => { if (e.code === 'Tab') ui.toggleBoard(false); });
addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat && game.state !== 'menu') radar.toggleBig(); });
if (IS_TOUCH) { let bt = 0; $('top').addEventListener('pointerdown', () => { ui.toggleBoard(true); clearTimeout(bt); bt = setTimeout(() => ui.toggleBoard(false), 3000); }); }
loaderProgress(1, 'Tudo pronto para o primeiro tiro.');
await nextFrame();
ui.hideLoader();
// abertura -> (tutorial só no primeiro acesso) -> menu
const afterTutorial = () => { ui.showHome(); if (params.get('sala')) game.online.openEntry(params.get('sala')); };
ui.showIntro(() => {
  unlockAudio();
  if (settings.get('coach')) afterTutorial(); else ui.openTutorial(afterTutorial);
});

// ---------- loop ----------
window.__gov = () => ({ tier: govTier, pr: govPR, avgMs: Math.round(govAvg * 1000) }); window.__game = game; window.__r = renderer; window.__scene = scene;
window.__manual = false;
window.__step = (dt = 1 / 30) => { game.update(dt); renderer.render(scene, camera); };
window.__sim = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) game.update(dt); };
let last = performance.now();
// governador de desempenho: se o aparelho não sustenta ~30 fps, baixa a qualidade sozinho (resolução -> sombras -> resolução menor)
let govAvg = 0.016, govSlow = 0, govTier = 0, govPR = renderer.getPixelRatio();
settings.onChange((k) => { if (k === 'resScale') { govTier = 0; govSlow = 0; govAvg = 0.016; govPR = basePR(); renderer.setPixelRatio(govPR); resize(); } });
function govDegrade() {
  govTier++;
  if (govTier === 1) govPR = Math.min(govPR, 1);
  else if (govTier === 2) world.setShadows(false);
  else if (govTier === 3) govPR = Math.min(govPR, 0.75);
  else if (govTier === 4) govPR = 0.55;
  else return;
  renderer.setPixelRatio(govPR); resize();
  govAvg = 0.016; govSlow = 0;
}
function frame(now) {
  requestAnimationFrame(frame);
  if (window.__manual) return;
  const raw = (now - last) / 1000;
  if (game.state !== 'menu' && !game.paused && raw < 3) {            // ignora pausas e abas em segundo plano
    govAvg += (Math.min(raw, 0.25) - govAvg) * 0.12;
    if (govAvg > 0.036) { govSlow += Math.min(raw, 1); if (govSlow > 3) govDegrade(); } else govSlow = Math.max(0, govSlow - raw);
  }
  const dt = Math.min(0.05, raw);
  last = now;
  tickTextures(game.state === 'playing' ? (pendingTextures() > 8 ? 6 : 3) : 14);       // menu/contagem: pinta rápido; em jogo: só uma fatia por quadro
  if (!game.paused || (game.online && game.online.active)) game.update(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
