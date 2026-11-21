// Jogo online: sala (lobby), protocolo e sincronização.
// Modelo: o ANFITRIÃO roda a simulação inteira (bots, bolinhas, acertos, rodadas) e manda "fotos" do estado ~15x por segundo;
// os convidados movem o próprio personagem, mandam posição/mira/tiros e desenham o que o anfitrião manda.
import { Net, cleanCode } from './net.js';
import { MAPS, MAP_LIST } from './maps.js';
import { settings } from './settings.js';
import { TEAM_CSS, TEAM_NAME } from './ui.js';
import { radio } from './screens.js';
import { CHAR_LIST, isChar } from './characters.js';

const $ = (id) => document.getElementById(id);
const r2 = (v) => Math.round(v * 100) / 100;
const SNAP_DT = 1 / 15, INPUT_DT = 1 / 20;
const clean = (s) => String(s || '').replace(/[<>&"'`]/g, '').trim().slice(0, 14);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createOnline(game, { THREE, NAMES }) {
  let net = null, role = null, players = [], phase = 'off';           // off | lobby | loading | game
  let cfg = { map: 'arena', mode: 'elim', teamSize: 8, diff: 'normal', versus: 'coop', fill: true };
  let ready = new Set(), loadTimer = 0, snapAcc = 0, inAcc = 0, queueEv = [], myCid = -1, myId = 'host', targets = new Map(), netT = 0;
  const api = { get role() { return role; }, get active() { return phase !== 'off' && !!role; }, get phase() { return phase; }, get cfg() { return cfg; } };

  function toast(t) {
    let e = $('toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; e.setAttribute('role', 'status'); document.body.appendChild(e); }
    e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 4200);
  }
  const show = (id, on) => $(id).classList.toggle('on', on);
  const status = (t, ok) => { const e = $('o-status'); e.textContent = t || ''; e.classList.toggle('ok', !!ok); };
  const myName = () => clean($('o-name').value) || clean(settings.get('name')) || `Jogador${Math.floor(Math.random() * 90 + 10)}`;
  const linkFor = (code) => `${location.origin}${location.pathname}?sala=${code}`;

  // ------------------------------------------------------------------ entrada / criação / entrada por código
  api.openEntry = (prefill) => {
    $('o-name').value = clean(settings.get('name'));
    if (prefill) $('o-code').value = cleanCode(prefill);
    status(''); show('online', true);
    (prefill ? $('o-name') : $('o-create')).focus({ preventScroll: true });
  };
  api.closeEntry = () => show('online', false);

  function newNet() {
    net = new Net();
    net.onMsg = onMsg; net.onJoin = onJoin; net.onLeave = onLeave;
    net.onClosed = () => { if (phase !== 'off') { api.leave(true, 'A conexão com o anfitrião caiu.'); } };
  }
  const busy = (on, msg) => { ['o-create', 'o-join'].forEach((i) => { $(i).disabled = on; }); if (msg !== undefined) status(msg); };

  async function create() {
    const name = myName(); settings.set('name', name); busy(true, 'Criando a sala…');
    try {
      newNet(); const code = await net.host();
      role = 'host'; myId = 'host'; phase = 'lobby';
      cfg = { map: settings.get('map'), mode: settings.get('mode'), teamSize: settings.get('teamSize') || 8, diff: settings.get('diff'), versus: 'coop', fill: true };
      players = [{ id: 'host', name, team: 0, host: true, ch: settings.get('character') }];
      busy(false, ''); show('online', false); openLobby(code);
    } catch (e) { fail(e); }
  }
  async function join() {
    const name = myName(), code = cleanCode($('o-code').value);
    if (code.length < 5) { status('O código tem 5 letras/números.'); return; }
    settings.set('name', name); busy(true, 'Entrando na sala…');
    try {
      newNet(); await net.join(code);
      role = 'client'; myId = net.id; phase = 'lobby'; players = [];
      net.send({ t: 'hi', name, v: 1, ch: settings.get('character') });
      busy(false, ''); show('online', false); openLobby(code);
    } catch (e) { fail(e); }
  }
  function fail(e) {
    try { net && net.close(); } catch (x) { /* ignora */ }
    net = null; role = null; phase = 'off'; busy(false);
    status(e && e.message ? e.message : 'Não foi possível conectar.');
  }

  // ------------------------------------------------------------------ lobby
  function openLobby(code) {
    $('l-code').textContent = code; show('lobby', true); renderLobby();
    document.body.classList.add('online');
    $('l-start').focus({ preventScroll: true });
  }
  function renderLobby() {
    if (phase !== 'lobby') return;
    const host = role === 'host', pvp = cfg.versus === 'pvp';
    $('l-players').innerHTML = players.map((p) => {
      const mine = p.id === myId, can = pvp && (host || mine) && phase === 'lobby';
      const team = pvp ? TEAM_NAME[p.team] : 'Amigos';
      return `<div class="l-p ${mine ? 'me' : ''}"><span><b>${esc(p.name)}</b>${mine ? '<small>você</small>' : ''}${p.host ? '<small>anfitrião</small>' : ''}</span><button type="button" class="l-team" data-id="${esc(p.id)}" style="--c:${pvp ? TEAM_CSS[p.team] : '#7dff7a'}" ${can ? '' : 'disabled'} aria-label="Equipe de ${esc(p.name)}: ${team}">${team}</button></div>`;
    }).join('') || '<div class="note">Conectando…</div>';
    $('l-players').querySelectorAll('button.l-team:not([disabled])').forEach((b) => { b.onclick = () => toggleTeam(b.dataset.id); });
    const cfgEl = $('l-cfg');
    if (host) {
      cfgEl.innerHTML = `
        <div class="field"><span class="lab" id="lb-v">Como jogar</span><div id="l-versus" class="seg" role="radiogroup" aria-labelledby="lb-v"></div></div>
        ${pvp ? '<div class="field"><span class="lab" id="lb-f">Completar com bots</span><div id="l-fill" class="seg" role="radiogroup" aria-labelledby="lb-f"></div></div>' : ''}
        <div class="field"><span class="lab" id="lb-t">Jogadores por equipe</span><div id="l-size" class="seg" role="radiogroup" aria-labelledby="lb-t"></div></div>
        <div class="field"><span class="lab" id="lb-m">Modo</span><div id="l-mode" class="seg" role="radiogroup" aria-labelledby="lb-m"></div></div>
        <div class="field"><span class="lab"><label for="l-map">Campo</label></span><select id="l-map">${MAP_LIST.map((id) => `<option value="${id}" ${cfg.map === id ? 'selected' : ''}>${esc(MAPS[id].name)}</option>`).join('')}</select></div>
        <div class="field"><span class="lab" id="lb-d">Bots</span><div id="l-diff" class="seg" role="radiogroup" aria-labelledby="lb-d"></div></div>`;
      const set = (k, v) => { cfg[k] = v; if (k === 'versus') rebalance(); broadcastLobby(); renderLobby(); };
      radio($('l-versus'), [{ value: 'coop', label: 'Amigos × Bots' }, { value: 'pvp', label: 'Amigos × Amigos' }], cfg.versus, (v) => set('versus', v));
      if (pvp) radio($('l-fill'), [{ value: '1', label: 'Sim' }, { value: '0', label: 'Não' }], cfg.fill ? '1' : '0', (v) => set('fill', v === '1'));
      radio($('l-size'), [8, 10, 15].map((n) => ({ value: String(n), label: `${n} × ${n}` })), String(cfg.teamSize), (v) => set('teamSize', Number(v)));
      radio($('l-mode'), [{ value: 'elim', label: 'Eliminação' }, { value: 'flag', label: 'Centerflag' }], cfg.mode, (v) => set('mode', v));
      radio($('l-diff'), [{ value: 'facil', label: 'Fácil' }, { value: 'normal', label: 'Normal' }, { value: 'dificil', label: 'Difícil' }], cfg.diff, (v) => set('diff', v));
      $('l-map').onchange = (e) => set('map', e.target.value);
    } else {
      const m = MAPS[cfg.map] || MAPS.arena;
      cfgEl.innerHTML = `<div class="l-sum"><b>${cfg.versus === 'pvp' ? 'Amigos × Amigos' : 'Amigos × Bots'}</b> · ${cfg.teamSize} × ${cfg.teamSize}${cfg.versus === 'pvp' ? (cfg.fill ? ' · completa com bots' : ' · sem bots') : ''}<br>${esc(m.name)} · ${cfg.mode === 'flag' ? 'Centerflag' : 'Eliminação'} · bots ${{ facil: 'fáceis', normal: 'normais', dificil: 'difíceis' }[cfg.diff]}</div>`;
    }
    $('l-start').style.display = host ? '' : 'none';
    $('l-info').textContent = host ? (players.length < 2 && cfg.versus === 'pvp' && !cfg.fill ? 'Chame um amigo: mande o código ou o link.' : 'Quando todos estiverem aqui, toque em Começar.') : 'Aguardando o anfitrião começar a partida…';
  }
  function rebalance() {
    if (cfg.versus === 'coop') players.forEach((p) => { p.team = 0; });
    else players.forEach((p, i) => { p.team = i % 2; });
  }
  function toggleTeam(id) {
    const p = players.find((x) => x.id === id); if (!p) return;
    if (role === 'host') { p.team = 1 - p.team; broadcastLobby(); renderLobby(); } else net.send({ t: 'team', team: 1 - p.team });
  }
  function broadcastLobby() { if (role === 'host' && net) net.broadcast({ t: 'lobby', players, cfg }); }

  $('l-copy').onclick = async () => {
    const link = linkFor($('l-code').textContent);
    try { await navigator.clipboard.writeText(link); $('l-info').textContent = 'Link copiado! Mande para os amigos.'; }
    catch (e) { window.prompt('Copie o link da sala:', link); }
  };

  // ------------------------------------------------------------------ início da partida (anfitrião)
  function buildRoster() {
    const humans = players.map((p) => ({ ...p, team: cfg.versus === 'coop' ? 0 : p.team }));
    const byTeam = [humans.filter((p) => p.team === 0), humans.filter((p) => p.team === 1)];
    if (cfg.versus === 'pvp' && !cfg.fill && (!byTeam[0].length || !byTeam[1].length)) { $('l-info').textContent = 'Sem bots, é preciso ao menos 1 amigo em cada equipe.'; return null; }
    const N = Math.max(cfg.teamSize, byTeam[0].length, byTeam[1].length);
    const used = new Set(humans.map((p) => p.name)), pool = NAMES.filter((n) => !used.has(n)).sort(() => Math.random() - 0.5);
    let cid = 0, bn = 0; const roster = [];
    [0, 1].forEach((t) => {
      byTeam[t].forEach((p) => roster.push({ cid: cid++, name: p.name, team: t, pid: p.id, bot: false, ch: isChar(p.ch) ? p.ch : 'bravo' }));
      const nb = cfg.versus === 'coop' ? N - byTeam[t].length : (cfg.fill ? N - byTeam[t].length : 0);
      for (let i = 0; i < nb; i++) roster.push({ cid: cid++, name: pool[bn++ % pool.length] || `Bot ${bn}`, team: t, pid: null, bot: true, ch: CHAR_LIST[(bn * 5 + t * 3) % CHAR_LIST.length] });
    });
    return { roster, N };
  }
  $('l-start').onclick = () => {
    if (role !== 'host' || phase !== 'lobby') return;
    const b = buildRoster(); if (!b) return;
    const c = { map: cfg.map, mode: cfg.mode, teamSize: b.N, diff: cfg.diff };
    phase = 'loading'; ready = new Set(); show('lobby', false);
    net.broadcast({ t: 'start', cfg: c, roster: b.roster });
    enterGame(b.roster, c);
    $('l-start').disabled = true;
    const go = () => { if (phase !== 'loading') return; clearTimeout(loadTimer); phase = 'game'; game.beginOnlineMatch(); };
    api._go = go;
    loadTimer = setTimeout(go, 12000);
    if (!net.peers.length) go();
  };
  function maybeBegin() { if (phase === 'loading' && net.peers.every((id) => ready.has(id))) api._go(); }

  function enterGame(roster, c) {
    const meR = roster.find((r) => r.pid === myId);
    myCid = meR ? meR.cid : -1;
    const list = roster.map((r) => ({ cid: r.cid, name: r.name, team: r.team, pid: r.pid, ch: r.ch, me: r.pid === myId, bot: role === 'host' && r.bot, remote: r.pid !== myId && !r.bot }));
    game.startOnline(list, c);
    targets = new Map(); snapAcc = 0; inAcc = 0; queueEv = [];
  }

  // ------------------------------------------------------------------ mensagens
  function onJoin(id) { /* esperamos o "hi" para registrar o jogador */ }
  function onLeave(id) {
    if (role !== 'host') return;
    const p = players.find((x) => x.id === id); players = players.filter((x) => x.id !== id); ready.delete(id);
    if (phase === 'lobby') { broadcastLobby(); renderLobby(); return; }
    const c = game.combatants.find((x) => x.pid === id);
    if (c) { game.removeCombatant(c); queueEv.push({ e: 'left', c: c.cid }); }
    if (phase === 'loading') maybeBegin();
  }
  const num = (v) => typeof v === 'number' && isFinite(v);
  const vec3 = (a) => Array.isArray(a) && a.length === 3 && a.every(num);
  function onMsg(m, from) {
    try { handle(m, from); } catch (e) { console.warn('[online] mensagem ignorada', e); }
  }
  function handle(m, from) {
    if (!m || !m.t) return;
    if (role === 'host') {
      switch (m.t) {
        case 'hi':
          if (phase !== 'lobby') { net.sendTo(from, { t: 'busy' }); setTimeout(() => { try { net.conns.get(from)?.close(); } catch (e) { /* ignora */ } }, 400); return; }
          if (players.length >= 10) { net.sendTo(from, { t: 'busy', full: true }); return; }
          players.push({ id: from, ch: isChar(m.ch) ? m.ch : 'bravo', name: clean(m.name) || 'Amigo', team: cfg.versus === 'pvp' ? (players.filter((p) => p.team === 0).length <= players.filter((p) => p.team === 1).length ? 0 : 1) : 0 });
          broadcastLobby(); renderLobby(); break;
        case 'team': if (phase === 'lobby' && cfg.versus === 'pvp') { const p = players.find((x) => x.id === from); if (p) { p.team = m.team ? 1 : 0; broadcastLobby(); renderLobby(); } } break;
        case 'ready': ready.add(from); maybeBegin(); break;
        case 'in': {
          const c = game.combatants.find((x) => x.pid === from);
          if (c && [m.x, m.z, m.yaw, m.pitch, m.f, m.ep].every(num)) c.netIn = { ep: m.ep, f: m.f | 0, yaw: m.yaw, pitch: Math.max(-1.5, Math.min(1.5, m.pitch)), x: Math.max(-200, Math.min(200, m.x)), z: Math.max(-200, Math.min(200, m.z)), at: performance.now() };
          break;
        }
        case 'fire': onFire(from, m); break;
        default: break;
      }
      return;
    }
    switch (m.t) {
      case 'lobby': players = m.players; cfg = m.cfg; renderLobby(); break;
      case 'busy': api.leave(true, m.full ? 'A sala está cheia.' : 'A partida já começou.'); break;
      case 'start': phase = 'loading'; show('lobby', false); enterGame(m.roster, m.cfg); net.send({ t: 'ready' }); phase = 'game'; break;
      case 's': onSnap(m); break;
      case 'closed': api.leave(true, 'O anfitrião encerrou a sala.'); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ anfitrião: entradas dos convidados e "fotos" do estado
  function onFire(from, m) {
    const c = game.combatants.find((x) => x.pid === from);
    if (!c || !c.alive || game.state !== 'playing' || m.ep !== game.epoch || !vec3(m.m) || !vec3(m.d)) return;
    const now = performance.now(); if (now - (c.lastFire || 0) < 55) return; c.lastFire = now;
    const o = new THREE.Vector3(...m.m), d = new THREE.Vector3(...m.d).normalize();
    if (o.distanceTo(c.pos) > 4.5) o.set(c.pos.x, c.eyeY - 0.2, c.pos.z);
    game.spawnBall(o, d, c);
    game.sfx.shot(9 / Math.max(9, game.distToListener(c.pos)));
  }
  api.queue = (ev) => { if (role === 'host') queueEv.push(ev); };
  api.hostPre = (dt) => {
    for (const c of game.combatants) {
      const i = c.netIn; if (!c.remote || !i) continue;
      if (i.ep !== game.epoch) continue;                                    // ainda não confirmou a nova rodada
      c.yaw = i.yaw; c.pitch = i.pitch; c.crouch = !!(i.f & 1); c.scoped = !!(i.f & 2);
      if (c.alive && game.state === 'playing') {
        const k = 1 - Math.exp(-dt * 22), ox = c.pos.x, oz = c.pos.z;
        c.pos.x += (i.x - c.pos.x) * k; c.pos.z += (i.z - c.pos.z) * k;
        game.world.collide(c.pos, 0.35); c.updateY(dt);
        c.vel.set(Math.max(-7, Math.min(7, (c.pos.x - ox) / Math.max(dt, 1e-3))), 0, Math.max(-7, Math.min(7, (c.pos.z - oz) / Math.max(dt, 1e-3))));
      } else c.vel.multiplyScalar(0.8);
    }
  };
  api.hostPost = (dt) => {
    netT += dt;
    if (phase !== 'game') return;
    snapAcc += dt; if (snapAcc < SNAP_DT) return; snapAcc = 0;
    const live = net.peers.filter((id) => ready.has(id));
    if (!live.length) { queueEv.length = 0; return; }
    const f = game.flag;
    const msg = {
      t: 's', ev: queueEv.splice(0),
      s: { st: game.state, cd: r2(game.cd), rt: r2(game.roundTime), sc: game.score, rn: game.roundNo, ep: game.epoch },
      c: game.combatants.map((c) => [c.cid, r2(c.pos.x), r2(c.pos.y), r2(c.pos.z), r2(c.yaw), r2(c.pitch), (c.alive ? 1 : 0) | (c.crouch ? 2 : 0) | (c.scoped ? 4 : 0), c.hits]),
      fl: [f.carrier ? f.carrier.cid : -1, r2(f.pos.x), r2(f.pos.z)],
    };
    live.forEach((id) => net.sendTo(id, msg));
  };

  // ------------------------------------------------------------------ convidado: receber "fotos" e mandar entradas
  function onSnap(m) {
    for (const ev of m.ev || []) game.netEvent(ev);
    const s = m.s;
    game.score = s.sc; game.roundTime = s.rt; game.cd = s.cd;
    if (s.st !== game.state && game.state !== 'menu' && (s.st === 'playing' || s.st === 'countdown') && game.state !== 'roundover') game.state = s.st;
    for (const a of m.c) {
      const c = game.byCid.get(a[0]); if (!c) continue;
      const [, x, y, z, yaw, pitch, fl, hits] = a;
      if (c === game.player) {
        c.hits = hits;
        if (!(fl & 1) && c.alive) c.state = 'marked'; else if ((fl & 1) && !c.alive && game.state === 'countdown') c.state = 'alive';
        if (game.needTeleport && s.ep === game.epoch) { c.pos.set(x, y, z); game.needTeleport = false; }
        else if (Math.hypot(c.pos.x - x, c.pos.z - z) > 6 && game.state !== 'playing') c.pos.set(x, y, z);
      } else {
        c.hits = hits; c.state = (fl & 1) ? 'alive' : 'marked'; c.crouch = !!(fl & 2); c.scoped = !!(fl & 4);
        let t = targets.get(c.cid); if (!t) { t = { x, y, z, yaw, pitch }; targets.set(c.cid, t); c.pos.set(x, y, z); c.yaw = yaw; c.pitch = pitch; }
        t.x = x; t.y = y; t.z = z; t.yaw = yaw; t.pitch = pitch;
        if (game.state !== 'playing') { c.pos.set(x, y, z); c.yaw = yaw; c.pitch = pitch; }
      }
    }
    const f = game.flag; const carrier = m.fl[0] >= 0 ? game.byCid.get(m.fl[0]) : null;
    f.carrier = carrier || null; if (!carrier) f.pos.set(m.fl[1], 0, m.fl[2]);
  }
  api.clientStep = (dt) => {
    const k = 1 - Math.exp(-dt * 14);
    for (const c of game.combatants) {
      if (c === game.player) continue;
      const t = targets.get(c.cid); if (!t) continue;
      const ox = c.pos.x, oz = c.pos.z;
      c.pos.x += (t.x - c.pos.x) * k; c.pos.z += (t.z - c.pos.z) * k; c.pos.y += (t.y - c.pos.y) * k;
      let dy = t.yaw - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.yaw += dy * k; c.pitch += (t.pitch - c.pitch) * k;
      c.vel.set((c.pos.x - ox) / Math.max(dt, 1e-3), 0, (c.pos.z - oz) / Math.max(dt, 1e-3));
      if (c.vel.length() > 9) c.vel.setLength(9);
    }
    if (netT > 1) { netT = 0; }
  };
  api.sendInput = (dt) => {
    inAcc += dt; if (inAcc < INPUT_DT || !net) return; inAcc = 0;
    const p = game.player;
    net.send({ t: 'in', ep: game.epoch, x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), yaw: r2(p.yaw), pitch: r2(p.pitch), f: (p.crouch ? 1 : 0) | (p.scoped ? 2 : 0) });
  };
  api.sendFire = (o, d) => { if (net) net.send({ t: 'fire', ep: game.epoch, m: [r2(o.x), r2(o.y), r2(o.z)], d: [r2(d.x * 1000) / 1000, r2(d.y * 1000) / 1000, r2(d.z * 1000) / 1000] }); };
  api.myCid = () => myCid;
  api.rtt = () => (net ? net.rtt : 0);
  api.code = () => (net ? net.code : '');

  // ------------------------------------------------------------------ fim de partida / sair
  api.rematch = () => { if (role === 'host') game.rematchOnline(); };
  api.leave = (silent, msg) => {
    clearTimeout(loadTimer);
    const was = phase;
    try { if (role === 'host' && net) net.broadcast({ t: 'closed' }); } catch (e) { /* ignora */ }
    setTimeout(() => { try { net && net.close(); } catch (e) { /* ignora */ } net = null; }, 120);
    role = null; phase = 'off'; players = []; targets = new Map(); queueEv = [];
    document.body.classList.remove('online'); show('lobby', false); show('online', false); $('l-start').disabled = false;
    if (was === 'loading' || was === 'game') game.leaveOnline();
    else if (game.ui && game.state === 'menu') game.ui.showHome();
    if (msg) setTimeout(() => toast(msg), 60);
  };
  $('l-leave').onclick = () => api.leave();
  $('o-close').onclick = () => { api.closeEntry(); };
  $('o-create').onclick = create;
  $('o-join').onclick = join;
  $('o-code').addEventListener('input', (e) => { e.target.value = cleanCode(e.target.value); });
  $('o-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
  $('o-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
  window.addEventListener('beforeunload', () => { try { if (role === 'host' && net) net.broadcast({ t: 'closed' }); } catch (e) { /* ignora */ } });
  setInterval(() => {                                   // latência no canto da tela
    const el = $('netinfo'); if (!el || !api.active) return;
    const ms = role === 'client' ? net?.rtt : 0;
    el.textContent = role === 'host' ? `ONLINE · SALA ${net?.code} · ${net?.peers.length || 0} AMIGO(S)` : `ONLINE · SALA ${net?.code} · ${ms} ms`;
    el.classList.toggle('bad', role === 'client' && ms > 180);
  }, 1000);
  return api;
}
