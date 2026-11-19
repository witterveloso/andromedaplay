import { ARENA } from './world.js';
import { TEAM_CSS } from './ui.js';
import { settings } from './settings.js';

// Mapa de localização (visto de cima, base do jogador embaixo).
// Modos: "Avistados" = inimigos que você ou um aliado enxerga; "Todos" = todos os inimigos; "Desligado".
export function createRadar(game, canvas) {
  const ctx = canvas.getContext('2d');
  const SC = canvas.width / (ARENA.hx * 2);
  const X = (x) => (x + ARENA.hx) * SC, Y = (z) => (z + ARENA.hz) * SC;
  let bg = null, bgMap = null, acc = 0, big = false;
  const lastSeen = new Map();   // inimigo -> instante em que foi avistado
  let clock = 0;

  function buildBg() {
    bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext('2d');
    g.fillStyle = '#0d1219'; g.fillRect(0, 0, bg.width, bg.height);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
    for (let x = -ARENA.hx; x <= ARENA.hx; x += 5) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), bg.height); g.stroke(); }
    for (let z = -ARENA.hz; z <= ARENA.hz; z += 5) { g.beginPath(); g.moveTo(0, Y(z)); g.lineTo(bg.width, Y(z)); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, Y(-0.4), bg.width, 0.8 * SC);
    const w = game.world;
    (w.interiors || []).forEach((i) => { g.fillStyle = 'rgba(125,255,122,.10)'; g.fillRect(X(i.x - i.w / 2), Y(i.z - i.d / 2), i.w * SC, i.d * SC); });
    g.fillStyle = '#46506a';
    w.obstacles.forEach((o) => {
      if (o.type === 'cyl') { g.beginPath(); g.arc(X(o.x), Y(o.z), o.r * SC, 0, 7); g.fill(); }
      else g.fillRect(X(o.x - o.w / 2), Y(o.z - o.d / 2), o.w * SC, o.d * SC);
    });
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.strokeRect(1, 1, bg.width - 2, bg.height - 2);
    bgMap = w.map && w.map.id;
  }

  function scan() {
    const alive = game.combatants.filter((c) => c.alive);
    const allies = alive.filter((c) => c.team === game.player.team), foes = alive.filter((c) => c.team !== game.player.team);
    const pt = { x: 0, y: 0, z: 0 };
    for (const e of foes) {
      for (const a of allies) {
        const dx = e.pos.x - a.pos.x, dz = e.pos.z - a.pos.z;
        if (dx * dx + dz * dz > 2500) continue;
        const from = new game.camera.position.constructor(a.pos.x, a.eyeY, a.pos.z), to = e.chestCenter(new game.camera.position.constructor());
        const hit = game.world.segHit(from, to, false);
        if (!hit || hit.t >= 0.97) { lastSeen.set(e, clock); break; }
      }
    }
  }

  function draw() {
    const mode = settings.get('radar');
    document.body.classList.toggle('radar-off', mode === 'off');
    if (mode === 'off') return;
    if (bgMap !== (game.world.map && game.world.map.id)) buildBg();
    ctx.drawImage(bg, 0, 0);
    const p = game.player;
    // aliados
    game.combatants.forEach((c) => {
      if (c.team !== p.team || c === p) return;
      ctx.globalAlpha = c.alive ? 1 : 0.3; ctx.fillStyle = TEAM_CSS[p.team];
      ctx.beginPath(); ctx.arc(X(c.pos.x), Y(c.pos.z), 5, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // inimigos
    game.combatants.forEach((c) => {
      if (c.team === p.team || !c.alive) return;
      let a = 0;
      if (mode === 'all') a = 1;
      else { const dt = clock - (lastSeen.get(c) ?? -99); a = dt < 0.25 ? 1 : dt < 1.6 ? 1 - (dt - 0.25) / 1.35 : 0; }
      if (a <= 0.02) return;
      const x = X(c.pos.x), y = Y(c.pos.z);
      ctx.globalAlpha = a; ctx.fillStyle = TEAM_CSS[c.team]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.stroke();
      // direção para onde o inimigo olha
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(c.yaw) * 14, y - Math.cos(c.yaw) * 14); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // Centerflag: base-alvo e bandeira (sempre visível)
    if (game.mode === 'flag') {
      const f = game.flag, enemyZ = p.team === 0 ? -ARENA.hz : ARENA.hz;
      ctx.fillStyle = 'rgba(255,210,74,.12)'; ctx.fillRect(X(-8), enemyZ < 0 ? Y(-ARENA.hz) : Y(25), 16 * SC, 5 * SC);
      const fp = f.carrier ? f.carrier.pos : f.pos, fx0 = X(fp.x), fy0 = Y(fp.z);
      ctx.strokeStyle = '#ffd24a'; ctx.fillStyle = '#ffd24a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(fx0, fy0 + 9); ctx.lineTo(fx0, fy0 - 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx0, fy0 - 11); ctx.lineTo(fx0 + 13, fy0 - 6); ctx.lineTo(fx0, fy0 - 1); ctx.closePath(); ctx.fill();
    }
    // jogador: seta + cone de visão
    const px = X(p.pos.x), py = Y(p.pos.z), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), ang = Math.atan2(fz, fx);
    const cone = ctx.createRadialGradient(px, py, 2, px, py, 60);
    cone.addColorStop(0, 'rgba(255,255,255,.28)'); cone.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 60, ang - 0.6, ang + 0.6); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = TEAM_CSS[p.team]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, 7); ctx.lineTo(-3, 0); ctx.lineTo(-7, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (!p.alive) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  }

  const api = {
    update(dt) {
      clock += dt; acc += dt;
      if (acc < 0.1) return; acc = 0;
      if (game.state === 'menu') return;
      if (Math.floor(clock * 5) !== Math.floor((clock - 0.1) * 5)) scan();
      draw();
    },
    reset() { lastSeen.clear(); bgMap = null; },
    toggleBig() { big = !big; canvas.classList.toggle('big', big); },
  };
  canvas.addEventListener('click', () => api.toggleBig());
  return api;
}
