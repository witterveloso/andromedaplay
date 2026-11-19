import { MAPS, MAP_LIST } from './maps.js';
import { settings, PALETTES } from './settings.js';
import { TEAM_CSS, TEAM_NAME } from './ui.js';
import { IS_TOUCH } from './input.js';

const $ = (id) => document.getElementById(id);
const TIPS = [
  'Suba nas torres pela rampa: de cima dá para ver o campo todo. Agache atrás da mureta.',
  'Botão direito (ou ZOOM no celular) liga a mira de sniper: 4× e 8×. Agachado, a mira fica bem mais firme.',
  'Agache atrás do bunker: a mira fica mais firme e você vira um alvo menor.',
  'Tiro na cara? A tinta cobre a sua máscara. Proteja a cabeça.',
  'Recarregue atrás de cobertura. Pod vazio no meio do tiroteio custa a rodada.',
  'Alterne entre 1ª e 3ª pessoa para espiar o canto sem se expor.',
  'Correr abre a mira. Pare um instante antes de atirar.',
  'Barracos têm porta: entre, se esconda e atire quando alguém cruzar.',
  'No galpão, os feixes de luz entregam quem passa por eles.',
  'Olhe o mapa antes de avançar: ele mostra quem você e seus aliados enxergam.',
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

  const MODES = { elim: ['Eliminação', 'Marque todos os adversários. Melhor de 5 rodadas.'], flag: ['Centerflag', 'Pegue a bandeira no centro do campo e leve até a base inimiga, ou elimine o outro time. Quem carrega a bandeira derruba ela ao ser marcado.'] };
  const modeText = () => { const m = S.get('mode'); $('mode-desc').textContent = MODES[m][1]; $('btn-play').querySelector('small').textContent = `${MODES[m][0]} · ${S.get('teamSize')} × ${S.get('teamSize')} · melhor de 5`; };
  radio($('modes'), [{ value: 'elim', label: 'Eliminação' }, { value: 'flag', label: 'Centerflag' }], S.get('mode'), (v) => { S.set('mode', v); modeText(); }, 'chip');
  { const br = document.createElement('span'); br.className = 'chip dis'; br.innerHTML = 'Battle Royale <i>em breve</i>'; $('modes').appendChild(br); }
  modeText();
  radio($('palette'), PALETTES.map((p, i) => ({ value: String(i), render(b) { b.style.setProperty('--a', p.a); b.style.setProperty('--c', p.b); b.title = `${p.name}: ${p.note}`; b.setAttribute('aria-label', `${p.name}: ${p.note}`); } })),
    String(S.get('palette')), (v) => queue(false, () => { S.set('palette', Number(v)); game.setPalette(Number(v)); }), 'sw');
  radio($('seg-cam'), [{ value: 'fpp', label: '1ª pessoa' }, { value: 'tpp', label: '3ª pessoa' }], S.get('cam'), (v) => S.set('cam', v));
  radio($('seg-team'), [8, 10, 15].map((n) => ({ value: String(n), label: `${n} × ${n}` })), String(S.get('teamSize')),
    (v) => queue(false, () => { S.set('teamSize', Number(v)); game.setTeamSize(); modeText(); }));
  radio($('seg-diff'), [{ value: 'facil', label: 'Fácil' }, { value: 'normal', label: 'Normal' }, { value: 'dificil', label: 'Difícil' }], S.get('diff'), (v) => S.set('diff', v));
  const camRadio = null; // (mantido simples)

  // ---------------- configurações ----------------
  const tabs = [
    { id: 'play', label: 'Jogabilidade', rows: () => [
      range('sens', 'Sensibilidade', 'Velocidade de mira', 0.3, 2.5, 0.05),
      toggle('invertY', 'Inverter eixo vertical', 'Para cima/para baixo invertidos'),
      range('fov', 'Campo de visão', 'Maior = vê mais dos lados', 60, 100, 1),
      action('Rever o tutorial', 'Mostra de novo o passo a passo inicial.', 'Abrir', () => { api.closeSettings(); api.openTutorial(); }),
      select('radar', 'Mapa de localização', 'Avistados: só quem você ou um aliado enxerga. Todos: mostra todos os inimigos.', [['spotted', 'Avistados'], ['all', 'Todos (fácil)'], ['off', 'Desligado']]),
      range('aimAssist', 'Assistência de mira', 'Enquanto atira, puxa a mira para o inimigo mais próximo. 0 = desligada', 0, 1, 0.05),
    ] },
    { id: 'audio', label: 'Áudio', rows: () => [range('volume', 'Volume geral', 'Efeitos e música', 0, 1, 0.05), range('music', 'Música', 'Trilha de fundo. 0 = só efeitos', 0, 1, 0.05), range('ambient', 'Som ambiente', 'Vento, pássaros, pingos, cidade… 0 = desligado', 0, 1, 0.05), soundTest()] },
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
      note('Para atirar: toque na tela (rajada curta) ou segure o dedo (rajada contínua). Arraste para virar a câmera.'),
      toggle('autoFire', 'Tiro automático', 'Atira sozinho quando a mira cruza um inimigo'),
      toggle('lefty', 'Modo canhoto', 'Inverte joystick e botões'),
      toggle('haptics', 'Vibração', navigator.vibrate ? 'Vibra quando você acerta (toque curto) ou é marcado (pulso longo)' : 'Seu navegador não permite vibração (iPhone/iPad não suportam). Use Chrome no Android.'),
      action('Testar vibração', 'Sente o toque de acerto e o de ser marcado.', 'Testar', () => { if (navigator.vibrate) navigator.vibrate([55, 250, 160, 60, 240]); }),
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
    b.onclick = () => { const v = !S.get(k); S.set(k, v); b.setAttribute('aria-checked', String(v)); if (k === 'haptics' && v && navigator.vibrate) navigator.vibrate(60); };
    return r;
  }
  function select(k, t, d, opts) {
    const r = mk(head(t, d) + `<select aria-label="${t}">${opts.map(([v, l]) => `<option value="${v}" ${S.get(k) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`);
    r.querySelector('select').onchange = (e) => { S.set(k, e.target.value); if (k === 'quality') location.reload(); };
    return r;
  }
  function soundTest() {
    const r = mk(head('Testar o som', 'Se não ouvir nada no celular: tire o modo silencioso, suba o volume do aparelho e toque aqui.') + '<button class="btn" id="s-sound-test" style="width:auto;margin:0;padding:10px 16px">▶ Testar</button><span id="s-sound-state" class="note" style="margin:0 0 0 8px"></span>');
    const b = r.querySelector('button'), st = r.querySelector('#s-sound-state');
    const upd = () => { st.textContent = game.sfx.running ? 'Áudio ativo' : 'Áudio bloqueado'; };
    b.onclick = () => { game.sfx.unlock(); game.sfx.setAmbient(game.sfx.ambKind); game.sfx.shot(1); setTimeout(() => game.sfx.hitmarker(), 250); setTimeout(upd, 300); };
    setTimeout(upd, 0);
    return r;
  }
  function action(t, d, label, fn) {
    const r = mk(head(t, d) + `<button class="btn" style="width:auto;margin:0;padding:10px 18px">${label}</button>`);
    r.querySelector('button').onclick = fn;
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
  // botão de som: se o navegador bloqueou o áudio, o toque libera; com som ativo, liga/desliga
  const SND_ON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const SND_OFF = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  const soundBtn = $('btn-sound');
  const paintSound = () => { const ok = game.sfx.running; soundBtn.innerHTML = ok && !game.sfx.muted ? SND_ON : SND_OFF; soundBtn.classList.toggle('blocked', !ok); soundBtn.setAttribute('aria-label', !ok ? 'Ativar o som' : game.sfx.muted ? 'Ligar o som' : 'Desligar o som'); };
  soundBtn.onclick = () => {
    if (!game.sfx.running) { game.unlockAudio(); game.sfx.shot(1); setTimeout(paintSound, 300); return; }
    game.sfx.setMuted(!game.sfx.muted); paintSound();
  };
  setInterval(paintSound, 700); paintSound();
  $('p-settings').onclick = api.openSettings;
  $('s-close').onclick = api.closeSettings;
  $('settings').addEventListener('click', (e) => { if (e.target.id === 'settings') api.closeSettings(); });
  api.settingsOpen = () => $('settings').classList.contains('on');

  // ---------------- navegação ----------------
  const show = (id, on) => $(id).classList.toggle('on', on);
  api.showHome = () => { show('home', true); show('pause', false); show('end', false); document.body.classList.remove('ingame'); $('btn-play').focus({ preventScroll: true }); };
  api.hideHome = () => { show('home', false); document.body.classList.add('ingame'); };
  api.showPause = () => { show('pause', true); $('p-quit').classList.remove('armed'); $('p-quit').textContent = 'Sair do jogo'; $('p-resume').focus(); };
  api.hidePause = () => show('pause', false);
  $('btn-play').onclick = () => { if (busy || pending) { wantPlay = true; return; } game.begin(); };
  $('p-resume').onclick = () => game.resume();
  $('p-restart').onclick = () => { api.hidePause(); game.begin(true); };
  $('p-home').onclick = () => { api.hidePause(); game.goHome(); };
  // sair do jogo: pede confirmação (segundo toque) e volta para a tela de abertura
  const quit = $('p-quit'); let quitT = 0;
  const quitReset = () => { clearTimeout(quitT); quit.textContent = 'Sair do jogo'; quit.classList.remove('armed'); };
  quit.onclick = () => {
    if (!quit.classList.contains('armed')) { quit.textContent = 'Toque de novo para sair'; quit.classList.add('armed'); quitT = setTimeout(quitReset, 3500); return; }
    quitReset(); api.hidePause(); game.goHome();
    api.showIntro(() => { game.unlockAudio && game.unlockAudio(); api.showHome(); });
    try { window.close(); } catch (e) { /* abas abertas pelo usuário não fecham: a abertura já cumpre o papel */ }
  };
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

  // ---------------- abertura + tutorial (só no primeiro acesso) ----------------
  const key = (t) => `<rect width="38" height="38" rx="8" fill="#1b2230" stroke="#fff" stroke-opacity=".32"/><text x="19" y="26" text-anchor="middle" fill="#fff" font-family="Rajdhani,Inter,sans-serif" font-weight="700" font-size="21">${t}</text>`;
  const g = (x, y, inner) => `<g transform="translate(${x},${y})">${inner}</g>`;
  const mouse = (x, leftOn) => `<g transform="translate(${x},10)"><rect width="52" height="88" rx="26" fill="#1b2230" stroke="#fff" stroke-opacity=".38" stroke-width="2"/>${leftOn ? '<path d="M26 0v36H0V26A26 26 0 0 1 26 0z" fill="#ff8a00"/>' : ''}<path d="M26 0v36" stroke="#fff" stroke-opacity=".38" stroke-width="2"/></g>`;
  const ART = {
    pcMove: `<svg viewBox="0 0 290 120">${g(66, 6, key('W'))}${g(24, 50, key('A'))}${g(66, 50, key('S'))}${g(108, 50, key('D'))}${mouse(196, false)}<path d="M262 36a34 34 0 0 1 0 40" stroke="#ff8a00" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
    pcShoot: `<svg viewBox="0 0 290 120">${mouse(60, true)}${g(150, 14, key('C'))}${g(196, 14, key('R'))}${g(242, 14, key('V'))}<text x="169" y="72" text-anchor="middle" fill="#9aa6b5" font-size="12" font-family="Inter,sans-serif">agachar</text><text x="215" y="72" text-anchor="middle" fill="#9aa6b5" font-size="12" font-family="Inter,sans-serif">recarregar</text><text x="261" y="72" text-anchor="middle" fill="#9aa6b5" font-size="12" font-family="Inter,sans-serif">câmera</text><text x="86" y="112" text-anchor="middle" fill="#ff8a00" font-size="13" font-family="Inter,sans-serif" font-weight="700">clique = atirar</text></svg>`,
    touchMove: `<svg viewBox="0 0 290 120"><circle cx="70" cy="62" r="40" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><circle cx="80" cy="54" r="17" fill="#fff" fill-opacity=".88"/><circle cx="178" cy="86" r="11" fill="#ff8a00"/><path d="M178 86q38-62 86-20" stroke="#ff8a00" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="2 10"/><path d="M252 60l14 6-8 12" stroke="#ff8a00" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    touchTap: `<svg viewBox="0 0 290 120"><circle cx="145" cy="60" r="13" fill="#ff8a00"/><circle cx="145" cy="60" r="32" fill="none" stroke="#ff8a00" stroke-opacity=".65" stroke-width="3"/><circle cx="145" cy="60" r="52" fill="none" stroke="#ff8a00" stroke-opacity=".3" stroke-width="3"/><g stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-opacity=".8"><path d="M52 60h34M204 60h34M145 6v22M145 92v22"/></g></svg>`,
    goal: `<svg viewBox="0 0 290 120"><rect x="24" y="8" width="74" height="104" rx="12" fill="#0d1219" stroke="#fff" stroke-opacity=".28"/><rect x="44" y="30" width="22" height="18" fill="#46506a"/><rect x="62" y="64" width="22" height="14" fill="#46506a"/><circle cx="60" cy="98" r="5.5" fill="#fff"/><circle cx="44" cy="22" r="6" fill="#00b4ff" stroke="#fff" stroke-width="2"/><circle cx="82" cy="40" r="6" fill="#00b4ff" stroke="#fff" stroke-width="2"/><path d="M150 106V16" stroke="#ffd24a" stroke-width="5" stroke-linecap="round"/><path d="M152 18l56 18-56 18z" fill="#ffd24a"/><rect x="226" y="54" width="42" height="48" rx="5" fill="none" stroke="#7dff7a" stroke-width="3"/><path d="M238 102V82h18v20" stroke="#7dff7a" stroke-width="3" fill="none"/></svg>`,
  };
  const GOAL = 'Um tiro e você está marcado. Entre nos barracos para se esconder, olhe o mapa para achar os inimigos e, no Centerflag, leve a bandeira até a base inimiga.';
  const PC_SLIDES = [
    { art: ART.pcMove, title: 'Mova-se e mire', text: 'Use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> para andar e o mouse para mirar. <kbd>Shift</kbd> corre.' },
    { art: ART.pcShoot, title: 'Atire e se proteja', text: 'Clique para atirar. <kbd>C</kbd> agacha atrás do bunker, <kbd>R</kbd> recarrega e <kbd>V</kbd> alterna entre 1ª e 3ª pessoa.' },
    { art: ART.goal, title: 'Marque, esconda-se, vença', text: GOAL + ' A tecla <kbd>M</kbd> amplia o mapa.' },
  ];
  const TOUCH_SLIDES = [
    { art: ART.touchMove, title: 'Mova e mire', text: 'Joystick à esquerda para andar. <b>Arraste</b> o dedo na tela para virar a câmera.' },
    { art: ART.touchTap, title: 'Toque para atirar', text: 'Achou o alvo? <b>Toque na tela</b> para disparar. <b>Segure</b> o dedo para uma rajada contínua. Dica: gire com um polegar e toque do outro lado para atirar.' },
    { art: ART.goal, title: 'Marque, esconda-se, vença', text: GOAL + ' Toque no mapa para ampliar.' },
  ];
  let slide = 0, onDone = null;
  const slides = () => (IS_TOUCH ? TOUCH_SLIDES : PC_SLIDES);
  const renderSlide = () => {
    const list = slides(), s = list[slide], last = slide === list.length - 1;
    $('coach-art').innerHTML = s.art; $('coach-step').textContent = `Passo ${slide + 1} de ${list.length}`;
    $('coach-title').textContent = s.title; $('coach-text').innerHTML = s.text;
    $('coach-dots').innerHTML = list.map((_, i) => `<i class="${i === slide ? 'on' : ''}"></i>`).join('');
    $('coach-ok').textContent = last ? 'Começar' : 'Próximo'; $('coach-skip').style.visibility = last ? 'hidden' : 'visible';
  };
  api.openTutorial = (done) => { slide = 0; onDone = done || null; renderSlide(); $('coach').classList.add('on'); $('coach-ok').focus(); };
  const finishTutorial = () => {
    $('coach').classList.remove('on'); S.set('coach', true);
    const d = onDone; onDone = null;
    if (game.tutorialDone) game.tutorialDone();
    if (d) d();
  };
  $('coach-ok').onclick = () => { if (slide < slides().length - 1) { slide++; renderSlide(); } else finishTutorial(); };
  $('coach-skip').onclick = finishTutorial;
  addEventListener('keydown', (e) => {
    if (!$('coach').classList.contains('on')) return;
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); $('coach-ok').click(); }
    else if (e.code === 'ArrowLeft' && slide > 0) { e.preventDefault(); slide--; renderSlide(); }
    else if (e.code === 'Escape') { e.preventDefault(); finishTutorial(); }
  }, true);
  // rede de segurança: se a partida começar sem o tutorial ter sido visto, mostra agora e segura a contagem
  api.maybeCoach = () => { if (S.get('coach')) return false; api.openTutorial(); return true; };
  api.closeCoach = finishTutorial;

  // abertura: "toque para começar" (também libera o áudio no celular)
  api.showIntro = (onStart) => {
    const el = $('intro');
    // chamada adequada ao aparelho: toque no celular, clique/Enter no computador
    $('intro-cta-text').textContent = IS_TOUCH ? 'TOQUE PARA ENTRAR NO CAMPO' : 'ENTRAR NO CAMPO';
    $('intro-sub').textContent = IS_TOUCH ? 'Paintball tático · até 15 contra 15 · PC e celular' : 'Clique ou aperte Enter';
    // frases que se alternam (3,6 s cada)
    const lines = [...document.querySelectorAll('#intro-lines span')]; let li = 0;
    const rot = setInterval(() => { lines[li].classList.remove('on'); li = (li + 1) % lines.length; lines[li].classList.add('on'); }, 3600);
    el.classList.add('on'); $('intro-start').focus({ preventScroll: true });
    const keyGo = (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); go(); } };
    const go = () => { if (!el.classList.contains('on')) return; clearInterval(rot); el.classList.remove('on'); removeEventListener('keydown', keyGo, true); onStart(); };
    el.onclick = go; addEventListener('keydown', keyGo, true);
  };

  // foco preso dentro do diálogo aberto (Tab/Shift+Tab circulam)
  addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const open = ['#settings.on .sheet', '#pause.on .sheet', '#end.on .sheet', '#coach.on .coach-card'].map((q) => document.querySelector(q)).filter(Boolean).pop();
    if (!open) return;
    const f = [...open.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!open.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, true);

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
