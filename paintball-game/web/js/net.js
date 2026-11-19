// Camada de rede: salas peer-to-peer (WebRTC) via PeerJS. Um jogador é o anfitrião (a "sala"), os demais conectam nele.
// O servidor público do PeerJS só é usado para o aperto de mão inicial; depois os dados vão direto entre os aparelhos.
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';            // sem I, O, 0, 1 (evita confusão ao ditar o código)
const PREFIX = 'splatarena-';
const params = new URLSearchParams(location.search);

export const genCode = () => Array.from({ length: 5 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join('');
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

let loading = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve();
  if (!loading) loading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js';
    s.onload = res; s.onerror = () => { loading = null; rej(new Error('Não foi possível carregar o módulo online.')); };
    document.head.appendChild(s);
  });
  return loading;
}
function peerOptions() {
  const o = {
    debug: 0,
    config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' },
      // retransmissão pública (ajuda quando o roteador/operadora bloqueia a conexão direta)
      { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
    ] },
  };
  if (params.get('peerhost')) {                       // servidor próprio / testes: ?peerhost=localhost&peerport=9000&peersecure=0
    o.host = params.get('peerhost'); o.port = Number(params.get('peerport')) || 9000;
    o.path = params.get('peerpath') || '/'; o.secure = params.get('peersecure') === '1';
  }
  return o;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Net {
  constructor() {
    this.role = null; this.peer = null; this.conns = new Map(); this.conn = null; this.code = ''; this.id = '';
    this.rtt = 0; this.lastSeen = new Map(); this._timers = [];
    // callbacks (definidos por quem usa)
    this.onMsg = () => {}; this.onJoin = () => {}; this.onLeave = () => {}; this.onClosed = () => {};
  }
  get active() { return !!this.role; }

  _createPeer(id) {
    return new Promise((resolve, reject) => {
      const p = new window.Peer(id, peerOptions());
      let done = false;
      const to = setTimeout(() => { if (done) return; done = true; try { p.destroy(); } catch (e) { /* ignora */ } reject(Object.assign(new Error('O servidor de salas não respondeu. Tente de novo.'), { type: 'timeout' })); }, 12000);
      p.on('open', (pid) => { if (done) return; done = true; clearTimeout(to); this.peer = p; this.id = pid; resolve(p); });
      p.on('error', (e) => { if (!done) { done = true; clearTimeout(to); try { p.destroy(); } catch (x) { /* ignora */ } reject(e); } else console.warn('[net]', e.type || e); });
      p.on('disconnected', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) { /* ignora */ } });
    });
  }

  async host() {
    await loadPeer();
    for (let i = 0; i < 6; i++) {
      const code = genCode();
      try {
        await this._createPeer(PREFIX + code);
        this.code = code; this.role = 'host';
        this.peer.on('connection', (c) => this._accept(c));
        this._timers.push(setInterval(() => this._watchdog(), 2500));
        return code;
      } catch (e) { if (e.type !== 'unavailable-id') throw e; }
    }
    throw new Error('Não foi possível criar a sala. Tente de novo.');
  }

  _accept(c) {
    c.on('open', () => { this.conns.set(c.peer, c); this.lastSeen.set(c.peer, performance.now()); this.onJoin(c.peer, c); });
    c.on('data', (d) => { this.lastSeen.set(c.peer, performance.now()); if (d && d.t === 'p') { this.sendTo(c.peer, { t: 'q', ts: d.ts }); return; } this.onMsg(d, c.peer); });
    const gone = () => { if (this.conns.get(c.peer) === c) { this.conns.delete(c.peer); this.lastSeen.delete(c.peer); this.onLeave(c.peer); } };
    c.on('close', gone); c.on('error', gone);
  }
  _watchdog() {                                       // derruba quem ficou mudo por muito tempo
    const now = performance.now();
    for (const [id, t] of this.lastSeen) if (now - t > 12000) { const c = this.conns.get(id); try { c && c.close(); } catch (e) { /* ignora */ } this.conns.delete(id); this.lastSeen.delete(id); this.onLeave(id); }
  }

  async join(code) {
    await loadPeer();
    code = cleanCode(code);
    if (code.length < 5) throw new Error('O código tem 5 letras/números.');
    await this._createPeer(undefined);
    const conn = await new Promise((resolve, reject) => {
      const c = this.peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      const to = setTimeout(() => { try { c.close(); } catch (e) { /* ignora */ } reject(new Error('Não consegui conectar. Confira o código ou a internet dos dois lados.')); }, 15000);
      c.on('open', () => { clearTimeout(to); resolve(c); });
      c.on('error', (e) => { clearTimeout(to); reject(new Error('Não consegui conectar à sala.')); });
      this.peer.on('error', (e) => { if (e.type === 'peer-unavailable') { clearTimeout(to); reject(new Error('Sala não encontrada. Confira o código.')); } });
    });
    this.conn = conn; this.code = code; this.role = 'client';
    conn.on('data', (d) => { if (d && d.t === 'q') { this.rtt = Math.round(performance.now() - d.ts); return; } this.onMsg(d, 'host'); });
    const lost = () => { if (this.role) this.onClosed(); };
    conn.on('close', lost); conn.on('error', lost);
    this._timers.push(setInterval(() => this.send({ t: 'p', ts: performance.now() }), 2000));
    return code;
  }

  send(msg) { if (this.conn && this.conn.open) { try { this.conn.send(msg); } catch (e) { /* ignora */ } } }                // cliente -> anfitrião
  sendTo(id, msg) { const c = this.conns.get(id); if (c && c.open) { try { c.send(msg); } catch (e) { /* ignora */ } } }       // anfitrião -> um cliente
  broadcast(msg, except) { for (const [id, c] of this.conns) if (id !== except && c.open) { try { c.send(msg); } catch (e) { /* ignora */ } } }
  get peers() { return [...this.conns.keys()]; }

  close() {
    this.role = null;
    this._timers.forEach(clearInterval); this._timers = [];
    for (const c of this.conns.values()) { try { c.close(); } catch (e) { /* ignora */ } }
    try { this.conn && this.conn.close(); } catch (e) { /* ignora */ }
    try { this.peer && this.peer.destroy(); } catch (e) { /* ignora */ }
    this.conns.clear(); this.lastSeen.clear(); this.conn = null; this.peer = null; this.code = '';
  }
}
