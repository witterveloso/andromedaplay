import * as THREE from './vendor/three.module.min.js';
import { createWorld, ARENA, TEAM_PAINT, segSphere, segCyl } from './world.js';
import { MAPS, MAP_LIST } from './maps.js';
import { buildMarker, loadCharacterAssets } from './models.js';
import { Combatant, Bot, DIFFICULTY } from './combatants.js';
import { Particles } from './effects.js';
import { Sfx } from './audio.js';
import { HUD, MaskOverlay, TEAM_CSS, TEAM_NAME } from './ui.js';
import { Input, IS_TOUCH } from './input.js';
import { camoTexture } from './camo.js';
import { settings, PALETTES } from './settings.js';
import { createScreens } from './screens.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const Q = params.get('quality') || settings.get('quality');
const LOW = Q === 'low' || (Q === 'auto' && IS_TOUCH);
const ROUND_TIME = 120, WIN_SCORE = 3, BALL_SPEED = 88, GRAVITY = 4.2;
const NAMES = ['Rafa', 'Duda', 'Bruno', 'Tati', 'Lipe', 'Gabi', 'Caio', 'Nina', 'Davi', 'Léo', 'Bia', 'Theo'];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const loaderProgress = (p, tip) => { $('ld-fill').style.width = `${Math.round(p * 100)}%`; if (tip) $('ld-tip').textContent = tip; };
loaderProgress(0.05, 'Preparando o campo…');
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 520);
scene.add(camera);
const world = createWorld(scene, renderer, LOW ? 'low' : 'high');
loaderProgress(0.2, 'Montando o campo…');
await nextFrame();
const startMap = MAPS[params.get('map')] ? params.get('map') : MAPS[settings.get('map')] ? settings.get('map') : 'arena';
settings.set('map', startMap);
world.loadMap(startMap);
loaderProgress(0.55, 'Carregando os jogadores…');
await nextFrame();
const particles = new Particles(scene, LOW ? 120 : 240);
const sfx = new Sfx();
const hud = new HUD();
const overlay = new MaskOverlay($('mask'));
const input = new Input(canvas);
const AMB = { arena: 'outdoor', ferro: 'outdoor', favela: 'outdoor', galpao: 'indoor', cidade: 'city' };
// o navegador só libera o áudio depois de um gesto: primeiro toque/clique/tecla em qualquer lugar
const unlockAudio = () => { sfx.setVolume(settings.get('volume')); sfx.setMusic(settings.get('music')); sfx.unlock(); sfx.setAmbient(AMB[world.map.id] || 'outdoor'); };
['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => addEventListener(ev, unlockAudio, { capture: true, once: true }));
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
  const gripR = new THREE.Vector3(0.0, -0.06, 0.03), gripL = new THREE.Vector3(0.0, -0.025, -0.15);
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

// ---------- jogo ----------
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tmpA = V(), tmpB = V(), tmpC = V(), tmpD = V();

const game = {
  world, scene, camera, sfx, input, hud, overlay,
  state: 'menu', paused: false, settings,
  score: [0, 0], roundNo: 0, roundTime: 0, cd: 0, endT: 0, combatants: [], player: null,
  camMode: 'fpp', shake: 0, switchT: 0, menuOrbit: 0,
  get difficulty() { return settings.get('diff'); },
  get camPref() { return params.get('cam') === 'tpp' ? 'tpp' : settings.get('cam'); },

  distToListener(p) { return camera.position.distanceTo(p); },

  spawnBall(origin, dir, owner) {
    const b = balls.find((x) => x.life <= 0);
    if (!b) return;
    b.pos.copy(origin); b.vel.copy(dir).multiplyScalar(BALL_SPEED); b.life = 1.8; b.owner = owner;
    b.mesh.material = ballMats[owner.team]; b.mesh.visible = true; b.mesh.position.copy(origin);
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
      const tb = segCyl(p0, d, c.pos.x, c.pos.z, 0.3, 0, c.bodyTop);
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
    if (hit.kind === 'world') {
      world.addSplat(hit.point, n, team, 0.45 + Math.random() * 0.4);
    } else {
      hit.entity.mark(b.owner, hit.head, hit.point);
    }
  },

  onMarked(victim, shooter, head, point) {
    const you = (c) => (c.isPlayer ? 'Você' : c.name);
    hud.feed(`<b style="color:${TEAM_CSS[shooter.team]}">${you(shooter)}</b> marcou <b style="color:${TEAM_CSS[victim.team]}">${you(victim)}</b>${head ? ' 🎯' : ''}`, shooter.team);
    if (shooter.isPlayer) { hud.hitmarker(); sfx.hitmarker(); this.buzz(25); }
    if (victim.isPlayer) {
      sfx.marked(); this.buzz([60, 40, 90]);
      const col = TEAM_CSS[shooter.team];
      const fx = settings.get('reduceFx') ? 0.45 : 1;
      if (head) overlay.hitFace(col, (this.camMode === 'fpp' ? 1 : 0.6) * fx);
      else {
        const ang = Math.atan2(-(shooter.pos.x - victim.pos.x), -(shooter.pos.z - victim.pos.z)) - victim.yaw;
        overlay.hitBody(col, -ang);
        if (this.camMode === 'fpp') overlay.hitFace(col, 0.5 * fx);
      }
      this.shake = settings.get('reduceFx') ? 0 : 0.5;
      this.switchT = 1.2;
      hud.banner('VOCÊ FOI MARCADO!', 'Mãos para cima — aguarde a rodada', 0, TEAM_CSS[shooter.team]);
    }
    this.updateAlive();
    this.checkRoundEnd();
  },

  updateAlive() {
    [0, 1].forEach((t) => hud.alive(t, this.combatants.filter((c) => c.team === t).map((c) => c.alive)));
  },

  setup() {
    const nm = NAMES.slice().sort(() => Math.random() - 0.5);
    this.player = new Combatant(this, { name: 'Você', team: 0, isPlayer: true });
    this.combatants.push(this.player);
    for (let i = 0; i < 9; i++) this.combatants.push(new Bot(this, { name: nm[i], team: i < 4 ? 0 : 1 }));
    this.layout();
  },

  layout() {
    // laranja: você no centro + 4 bots; azul: 5 bots. Cada time ocupa 5 posições na linha de largada.
    const slots = [[0, -8, -4, 4, 8], [-8, -4, 0, 4, 8]];
    const idx = [0, 0];
    this.combatants.forEach((c) => {
      const x = slots[c.team][idx[c.team]++];
      c.reset(x, c.team === 0 ? 27 : -27, c.team === 0 ? 0 : Math.PI);
    });
  },

  buzz(p) { if (settings.get('haptics') && IS_TOUCH && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignora */ } } },

  rebuild() { // recria os personagens (troca de paleta)
    this.combatants.forEach((c) => { scene.remove(c.model.root); c.model.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
    this.combatants = [];
    this.setup();
  },

  startMatch() {
    this.score = [0, 0]; this.roundNo = 0;
    this.combatants.forEach((c) => { c.kills = 0; });
    hud.score(0, 0);
    this.nextRound();
  },

  nextRound() {
    this.roundNo++;
    this.layout();
    this.player.pods = 4;
    balls.forEach((b) => { b.life = 0; b.mesh.visible = false; });
    world.clearSplats();
    overlay.clear(false);
    this.camMode = this.camPref; this.switchT = 0;
    hud.round(this.roundNo); hud.time(ROUND_TIME); hud.camLabel(this.camMode);
    this.updateAlive();
    this.state = 'countdown'; this.cd = 3.4; this.roundTime = 0; this.lastCd = 4;
    this.player.yaw = 0; this.player.pitch = 0;
  },

  checkRoundEnd() {
    if (this.state !== 'playing') return;
    const alive = [0, 1].map((t) => this.combatants.filter((c) => c.team === t && c.alive).length);
    if (alive[0] === 0 || alive[1] === 0) this.endRound(alive[0] === 0 ? 1 : 0);
  },

  endRound(winner) {
    this.state = 'roundover'; this.endT = 3.6;
    if (winner >= 0) this.score[winner]++;
    hud.score(this.score[0], this.score[1]);
    const matchOver = this.score.some((s) => s >= WIN_SCORE);
    if (matchOver) {
      const won = this.score[0] > this.score[1];
      hud.banner(won ? 'VITÓRIA!' : 'DERROTA', `Placar final ${this.score[0]} – ${this.score[1]}`, 0, won ? '#7dff7a' : '#ff5a5a');
      won ? sfx.win() : sfx.lose();
      this.matchOver = true;
    } else if (winner < 0) {
      hud.banner('EMPATE', 'Tempo esgotado', 0, '#fff');
    } else {
      hud.banner(`RODADA ${TEAM_NAME[winner]}`, `Placar ${this.score[0]} – ${this.score[1]}`, 0, TEAM_CSS[winner]);
      winner === 0 ? sfx.win() : sfx.lose();
    }
  },

  // ---------- atualização ----------
  update(dt) {
    const p = this.player;
    if (this.state === 'menu') { this.menuOrbit += dt * 0.12; this.menuCamera(); particles.update(dt); return; }
    // fases da rodada
    if (this.state === 'countdown') {
      if (!this.tutorialWait) this.cd -= dt;
      const n = Math.ceil(this.cd);
      if (n !== this.lastCd && n >= 1 && n <= 3) { this.lastCd = n; hud.banner(String(n), 'Prepare-se', 1000, '#fff'); sfx.beep(false); }
      if (this.cd <= 0) { this.state = 'playing'; hud.banner('TIRO LIVRE!', '', 1200, '#ffd24a'); sfx.beep(true); }
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
    for (const c of cs) c.syncModel(dt);
    this.stepBalls(dt);
    particles.update(dt);
    this.updateCamera(dt);
    this.updateHud(dt);
    overlay.update(dt);
    if (this.switchT > 0) { this.switchT -= dt; if (this.switchT <= 0 && !p.alive) { this.camMode = 'tpp'; hud.camLabel('tpp'); } }
  },

  updatePlayer(dt) {
    const p = this.player;
    const look = input.consumeLook();
    const s = 0.0022 * settings.get('sens');
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
    const fov = settings.get('fov');
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const fpp = this.camMode === 'fpp' && p.alive;
    const eye = tmpA.set(p.pos.x, p.eyeY, p.pos.z);
    camera.rotation.order = 'YXZ';
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sh = settings.get('reduceFx') ? 0 : this.shake * 0.02;
    camera.rotation.y = p.yaw + (Math.random() - 0.5) * sh;
    camera.rotation.x = p.pitch + (Math.random() - 0.5) * sh;
    camera.rotation.z = 0;
    camera.updateMatrixWorld(true);
    const dir = camera.getWorldDirection(tmpB);
    if (fpp) {
      camera.position.copy(eye);
      fp.visible = true;
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
    sfx.setAmbient(AMB[id] || 'outdoor');
    this.layout();
    $('map-label').textContent = `${MAPS[id].name} · Eliminação`;
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
    this.paused = false; this.state = 'menu'; this.matchOver = false;
    hud.hideBanner(); overlay.clear(false); this.cine = null;
    balls.forEach((b) => { b.life = 0; b.mesh.visible = false; });
    sfx.setMusicScale(1); this.layout(); ui.showHome();
    if (document.pointerLockElement) document.exitPointerLock();
  },
};

// ---------- ligações de UI ----------
loaderProgress(0.75, 'Vestindo os soldados…');
await nextFrame();
await loadCharacterAssets();
game.setup();
const ui = createScreens(game);
game.ui = ui;
hud.camLabel(game.camPref);
$('map-label').textContent = `${MAPS[startMap].name} · Eliminação`;
sfx.setVolume(settings.get('volume'));
settings.onChange((k, v) => { if (k === 'volume') sfx.setVolume(v); if (k === 'music') sfx.setMusic(v); });
sfx.setMusic(settings.get('music')); sfx.ambKind = AMB[startMap] || 'outdoor';
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
addEventListener('keydown', (e) => { if (e.code === 'Tab') { e.preventDefault(); if (game.state !== 'menu') ui.toggleBoard(true); } });
addEventListener('keyup', (e) => { if (e.code === 'Tab') ui.toggleBoard(false); });
if (IS_TOUCH) { let bt = 0; $('top').addEventListener('pointerdown', () => { ui.toggleBoard(true); clearTimeout(bt); bt = setTimeout(() => ui.toggleBoard(false), 3000); }); }
loaderProgress(1, 'Pronto!');
await nextFrame();
ui.hideLoader();
ui.showHome();

// ---------- loop ----------
window.__game = game;
window.__manual = false;
window.__step = (dt = 1 / 30) => { game.update(dt); renderer.render(scene, camera); };
window.__sim = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) game.update(dt); };
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (window.__manual) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.paused) game.update(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
