import { MAPS, MAP_LIST } from './maps.js';
import { settings, PALETTES } from './settings.js';
import { TEAM_CSS, TEAM_NAME } from './ui.js';
import { IS_TOUCH } from './input.js';

const $ = (id) => document.getElementById(id);
const TIPS = [
  'Agache atrás do bunker: a mira fica mais precisa e você vira um alvo menor.',
  'Tiro na cara cobre a sua máscara de tinta. Proteja a cabeça!',
  'Pods extras ficam na reserva: recarregue atrás de cobertura.',
  'Troque entre 1ª e 3ª pessoa para espiar o canto sem se expor.',
  'Correr abre a mira. Pare por um instante antes de atirar.',
  'No galpão, os feixes de luz denunciam quem passa por eles.',
];

// grupo de botões de rádio acessível (setas movem a seleção)
function radio(container, items, value, onChange, cls) {
  container.innerHTML = '';
  const btns = items.map((it) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.className = cls || '';
    b.setAttribute('aria-checked', String(it.value === value)); b.tabIndex = it.value === value ? 0 : -1;
    b.dataset.value = it.value;
    if (it.render) it.render(b); else b.textContent = it.label;
    b.addEventListener('click', () => select(it.value, true));
    container.appendChild(b);
    return b;
  });
  function select(v, fire) {
    btns.forEach((b) => { const on = b.dataset.value === String(v); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    if (fire) onChange(v);
  }
  container.onkeydown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const n = (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + btns.length) % btns.length;
    btns[n].focus(); select(items[n].value, true);
  };
  return { select: (v) => select(v, false) };
}

export function createScreens(game) {
  const S = settings;
  let currentMap = S.get('map');
  const api = {};

  // ---------------- tela de carregamento ----------------
  api.progress = (p, tip) => { $('ld-fill').style.width = `${Math.round(p * 100)}%`; if (tip) $('ld-tip').textContent = tip; };
  api.hideLoader = () => { $('loader').classList.remove('on'); };
  api.tip = () => TIPS[Math.floor(Math.random() * TIPS.length)];

  // ---------------- menu inicial ----------------
  const mapsEl = $('maps');
  const mapItems = MAP_LIST.map((id) => ({
    value: id,
    render(b) {
      b.innerHTML = `<img src="assets/maps/${id}.jpg" alt="" loading="lazy" onerror="this.style.display='none'"><div class="m-info"><div class="m-tag">${MAPS[id].tag}</div><div class="m-name">${MAPS[id].name}</div></div>`;
      b.setAttribute('aria-label', MAPS[id].name);
    },
  }));
  // Trabalhos pesados (montar campo, trocar cores) rodam depois de a tela repintar:
  // o clique responde na hora e aparece "Carregando…". Se houver vários cliques, vale o último.
  let busy = false, pending = null, wantPlay = false;
  const paint = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 0))));
  const setBusy = (on) => {
    document.body.classList.toggle('busy', on);
    $('btn-play').querySelector('span').textContent = on ? 'CARREGANDO…' : 'JOGAR AGORA';
    mapsEl.querySelectorAll('.map').forEach((b) => b.classList.toggle('loading', on && b.getAttribute('aria-checked') === 'true' && pending === null && busyMap));
  };
  let busyMap = false;
  async function pump() {
    if (busy) return;
    busy = true;
    while (pending) {
      const job = pending; pending = null; busyMap = job.map; setBusy(true);
      await paint();
      try { job.run(); } catch (e) { console.error(e); }
    }
    busy = false; busyMap = false; setBusy(false);
    if (wantPlay) { wantPlay = false; game.begin(); }
  }
  const queue = (map, run) => { pending = { map, run }; pump(); };
  const mapRadio = radio(mapsEl, mapItems, currentMap, (v) => {
    $('map-desc').textContent = MAPS[v].blurb;
    queue(true, () => { currentMap = v; S.set('map', v); game.setMap(v); });
  }, 'map');
  $('map-desc').textContent = MAPS[currentMap].blurb;
  mapsEl.querySelectorAll('.map').forEach((b) => { b.classList.add('map'); });

  radio($('palette'), PALETTES.map((p, i) => ({ value: String(i), render(b) { b.style.setProperty('--a', p.a); b.style.setProperty('--c', p.b); b.title = `${p.name}: ${p.note}`; b.setAttribute('aria-label', `${p.name}: ${p.note}`); } })),
    String(S.get('palette')), (v) => queue(false, () => { S.set('palette', Number(v)); game.setPalette(Number(v)); }), 'sw');
  radio($('seg-cam'), [{ value: 'fpp', label: '1ª pessoa' }, { value: 'tpp', label: '3ª pessoa' }], S.get('cam'), (v) => S.set('cam', v));
  radio($('seg-diff'), [{ value: 'facil', label: 'Fácil' }, { value: 'normal', label: 'Normal' }, { value: 'dificil', label: 'Difícil' }], S.get('diff'), (v) => S.set('diff', v));
  const camRadio = null; // (mantido simples)

  // ---------------- configurações ----------------
  const tabs = [
    { id: 'play', label: 'Jogabilidade', rows: () => [
      range('sens', 'Sensibilidade', 'Velocidade de mira', 0.3, 2.5, 0.05),
      toggle('invertY', 'Inverter eixo vertical', 'Para cima/para baixo invertidos'),
      range('fov', 'Campo de visão', 'Maior = vê mais dos lados', 60, 100, 1),
      range('aimAssist', 'Assistência de mira', 'Enquanto atira, puxa a mira para o inimigo mais próximo. 0 = desligada', 0, 1, 0.05),
    ] },
    { id: 'audio', label: 'Áudio', rows: () => [range('volume', 'Volume geral', 'Efeitos e música', 0, 1, 0.05), range('music', 'Música', 'Trilha de fundo. 0 = só efeitos', 0, 1, 0.05)] },
    { id: 'gfx', label: 'Gráficos', rows: () => [
      select('quality', 'Qualidade', 'Troque para Baixa se o jogo estiver pesado. Recarrega a página.', [['auto', 'Automática'], ['high', 'Alta'], ['low', 'Baixa']]),
    ] },
    { id: 'acc', label: 'Acessibilidade', rows: () => [
      toggle('reduceFx', 'Reduzir efeitos', 'Menos tinta cobrindo a tela e sem tremor de câmera'),
      select('crossColor', 'Cor da mira', '', [['#ffffff', 'Branca'], ['#7dff7a', 'Verde'], ['#00e5ff', 'Ciano'], ['#ff8a00', 'Laranja'], ['#ff4fd8', 'Magenta']]),
      select('crossStyle', 'Estilo da mira', '', [['cross', 'Cruz'], ['dot', 'Ponto']]),
      range('hudScale', 'Tamanho do HUD', 'Placar, munição e avisos', 0.8, 1.5, 0.05),
      note('Dica: a paleta Clássico (laranja × azul) é a mais segura para daltonismo.'),
    ] },
    { id: 'touch', label: 'Celular', rows: () => [
      range('touchScale', 'Tamanho dos botões', '', 0.8, 1.5, 0.05),
      toggle('autoFire', 'Tiro automático', 'Atira sozinho quando a mira cruza um inimigo'),
      toggle('fireLeft', 'Botão de fogo extra', 'Segundo botão de fogo à esquerda'),
      toggle('lefty', 'Modo canhoto', 'Inverte joystick e botões'),
      toggle('haptics', 'Vibração', 'Vibra quando você acerta ou é marcado'),
    ] },
  ];
  let curTab = 'play';
  function mk(html) { const d = document.createElement('div'); d.className = 'set'; d.innerHTML = html; return d; }
  function head(t, d) { return `<div><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`; }
  function range(k, t, d, min, max, step) {
    const r = mk(head(t, d) + `<input type="range" min="${min}" max="${max}" step="${step}" value="${S.get(k)}" aria-label="${t}">`);
    r.querySelector('input').oninput = (e) => S.set(k, parseFloat(e.target.value));
    return r;
  }
  function toggle(k, t, d) {
    const r = mk(head(t, d) + `<button class="sw-toggle" role="switch" aria-checked="${S.get(k)}" aria-label="${t}"></button>`);
    const b = r.querySelector('button');
    b.onclick = () => { const v = !S.get(k); S.set(k, v); b.setAttribute('aria-checked', String(v)); };
    return r;
  }
  function select(k, t, d, opts) {
    const r = mk(head(t, d) + `<select aria-label="${t}">${opts.map(([v, l]) => `<option value="${v}" ${S.get(k) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`);
    r.querySelector('select').onchange = (e) => { S.set(k, e.target.value); if (k === 'quality') location.reload(); };
    return r;
  }
  function note(t) { const d = document.createElement('p'); d.className = 'note'; d.textContent = t; return d; }
  function renderSettings() {
    const tb = $('s-tabs'); tb.innerHTML = '';
    tabs.forEach((t) => {
      if (t.id === 'touch' && !IS_TOUCH) return;
      const b = document.createElement('button');
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(t.id === curTab)); b.textContent = t.label;
      b.onclick = () => { curTab = t.id; renderSettings(); };
      tb.appendChild(b);
    });
    const body = $('s-body'); body.innerHTML = '';
    tabs.find((t) => t.id === curTab).rows().forEach((r) => body.appendChild(r));
  }
  let settingsFrom = null;
  api.openSettings = () => { settingsFrom = document.activeElement; renderSettings(); $('settings').classList.add('on'); $('s-close').focus(); };
  api.closeSettings = () => { $('settings').classList.remove('on'); if (settingsFrom && settingsFrom.focus) settingsFrom.focus(); };
  $('btn-settings').onclick = api.openSettings;
  $('p-settings').onclick = api.openSettings;
  $('s-close').onclick = api.closeSettings;
  $('settings').addEventListener('click', (e) => { if (e.target.id === 'settings') api.closeSettings(); });
  api.settingsOpen = () => $('settings').classList.contains('on');

  // ---------------- navegação ----------------
  const show = (id, on) => $(id).classList.toggle('on', on);
  api.showHome = () => { show('home', true); show('pause', false); show('end', false); document.body.classList.remove('ingame'); $('btn-play').focus({ preventScroll: true }); };
  api.hideHome = () => { show('home', false); document.body.classList.add('ingame'); };
  api.showPause = () => { show('pause', true); $('p-resume').focus(); };
  api.hidePause = () => show('pause', false);
  $('btn-play').onclick = () => { if (busy || pending) { wantPlay = true; return; } game.begin(); };
  $('p-resume').onclick = () => game.resume();
  $('p-restart').onclick = () => { api.hidePause(); game.begin(true); };
  $('p-home').onclick = () => { api.hidePause(); game.goHome(); };
  $('e-again').onclick = () => { show('end', false); game.begin(true); };
  $('e-home').onclick = () => { show('end', false); game.goHome(); };

  // ---------------- placar / fim de partida ----------------
  function table(el, final) {
    const cs = game.combatants;
    let html = '';
    [0, 1].forEach((t) => {
      const sc = game.score[t];
      html += `<div class="tt" style="--c:${TEAM_CSS[t]}">${TEAM_NAME[t]} · ${sc}</div><div class="tr h"><span>Jogador</span><span>Acertos</span><span>${final ? '' : 'Estado'}</span></div>`;
      cs.filter((c) => c.team === t).sort((a, b) => b.kills - a.kills).forEach((c) => {
        html += `<div class="tr ${c.isPlayer ? 'me' : ''} ${!final && !c.alive ? 'out' : ''}" style="--c:${TEAM_CSS[t]}"><span><i class="dot"></i>${c.isPlayer ? 'Você' : c.name}</span><span>${c.kills}</span><span>${final ? '' : c.alive ? 'vivo' : 'marcado'}</span></div>`;
      });
    });
    el.innerHTML = html;
  }
  api.toggleBoard = (on) => { if (on) table($('board-table'), false); $('board').classList.toggle('on', on); };
  api.showEnd = () => {
    const won = game.score[0] > game.score[1];
    $('end-title').textContent = won ? 'VITÓRIA' : 'DERROTA';
    $('end-title').style.color = won ? 'var(--ok)' : 'var(--bad)';
    $('end-score').innerHTML = `<span style="color:${TEAM_CSS[0]}">${game.score[0]}</span> – <span style="color:${TEAM_CSS[1]}">${game.score[1]}</span>`;
    const all = game.combatants.slice().sort((a, b) => b.kills - a.kills), mvp = all[0];
    $('end-stats').innerHTML = `<div><b>${game.player.kills}</b>seus acertos</div><div><b>${game.roundNo}</b>rodadas</div><div><b>${mvp.isPlayer ? 'Você' : mvp.name}</b>MVP (${mvp.kills})</div>`;
    table($('end-table'), true);
    show('end', true); document.body.classList.remove('ingame'); $('e-again').focus();
  };

  // ---------------- coach (primeiro jogo) ----------------
  // devolve true quando o tutorial foi aberto (a partida espera o jogador confirmar)
  api.maybeCoach = () => {
    if (S.get('coach')) return false;
    $('coach').classList.add('on');
    $('coach-ok').focus();
    return true;
  };
  api.closeCoach = () => { $('coach').classList.remove('on'); S.set('coach', true); game.tutorialDone(); };
  $('coach-ok').onclick = api.closeCoach;
  addEventListener('keydown', (e) => {
    if ($('coach').classList.contains('on') && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); api.closeCoach(); }
  });

  // ---------------- aplicação das preferências ----------------
  api.apply = () => {
    const root = document.documentElement.style;
    root.setProperty('--hud-scale', S.get('hudScale'));
    root.setProperty('--ts', S.get('touchScale'));
    root.setProperty('--cross', S.get('crossColor'));
    $('crosshair').classList.toggle('dot', S.get('crossStyle') === 'dot');
    document.body.classList.toggle('lefty', S.get('lefty'));
    document.body.classList.toggle('nofl', !S.get('fireLeft'));
    document.body.classList.toggle('touch', IS_TOUCH);
  };
  S.onChange(() => api.apply());
  api.apply();
  api.selectMap = (id) => mapRadio.select(id);
  return api;
}
