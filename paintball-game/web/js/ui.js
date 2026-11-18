const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
export const TEAM_CSS = ['#ff8a00', '#00b4ff'];
export const TEAM_NAME = ['LARANJA', 'AZUL'];

export class HUD {
  constructor() {
    this.el = {
      so: $('score-o'), sb: $('score-b'), timer: $('timer'), round: $('round'),
      ao: $('alive-o'), ab: $('alive-b'), ammo: $('ammo'), pods: $('pods'), cam: $('cam-label'),
      feed: $('feed'), banner: $('banner'), bannerT: $('banner-t'), bannerS: $('banner-s'),
      cross: $('crosshair'), hit: $('hitmarker'), reload: $('reload-bar'), reloadFill: $('reload-fill'),
    };
    this.bannerTimer = 0;
  }
  score(o, b) { this.el.so.textContent = o; this.el.sb.textContent = b; }
  time(s) {
    s = Math.max(0, Math.ceil(s));
    this.el.timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  round(n) { this.el.round.textContent = `RODADA ${n}`; }
  alive(team, flags) {
    const el = team === 0 ? this.el.ao : this.el.ab;
    el.innerHTML = flags.map((a) => `<i class="${a ? 'on' : ''}" style="--c:${TEAM_CSS[team]}"></i>`).join('');
  }
  ammo(h, pods, reloading) {
    this.el.ammo.textContent = h;
    this.el.ammo.classList.toggle('low', h < 30);
    this.el.pods.textContent = `PODS ${pods}`;
    this.el.reload.classList.toggle('on', reloading > 0);
    this.el.reloadFill.style.transform = `scaleX(${reloading > 0 ? 1 - reloading / 2.0 : 0})`;
  }
  camLabel(mode) { this.el.cam.textContent = mode === 'fpp' ? '1ª PESSOA' : '3ª PESSOA'; }
  feed(text, team) {
    const d = document.createElement('div');
    d.innerHTML = text;
    d.style.borderLeftColor = TEAM_CSS[team];
    this.el.feed.prepend(d);
    while (this.el.feed.children.length > 5) this.el.feed.lastChild.remove();
    setTimeout(() => d.remove(), 5000);
  }
  banner(title, sub = '', ms = 2000, color = '#fff') {
    this.el.bannerT.textContent = title;
    this.el.bannerT.style.color = color;
    this.el.bannerS.textContent = sub;
    this.el.banner.classList.add('on');
    clearTimeout(this.bannerTimer);
    if (ms > 0) this.bannerTimer = setTimeout(() => this.el.banner.classList.remove('on'), ms);
  }
  hideBanner() { clearTimeout(this.bannerTimer); this.el.banner.classList.remove('on'); }
  hitmarker() {
    this.el.hit.classList.remove('on');
    void this.el.hit.offsetWidth;
    this.el.hit.classList.add('on');
  }
  crosshair(spread, visible) {
    this.el.cross.style.setProperty('--gap', `${6 + spread * 700}px`);
    this.el.cross.style.display = visible ? 'block' : 'none';
  }
}

// Tinta que cobre a máscara/tela quando o jogador é atingido.
export class MaskOverlay {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.blobs = [];
    this.drips = [];
    this.alpha = 1;
    this.wipe = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.c.width = Math.floor(innerWidth * dpr);
    this.c.height = Math.floor(innerHeight * dpr);
    this.W = this.c.width; this.H = this.c.height;
  }
  get active() { return this.blobs.length > 0; }
  _blob(x, y, r, color, ttl) {
    const pts = Array.from({ length: 22 }, (_, i) => 1 + Math.sin(i * 1.7 + x) * 0.2 + rand(-0.18, 0.2));
    const sats = Array.from({ length: 7 }, () => ({ a: rand(0, 6.28), d: rand(1.05, 1.5), r: rand(0.05, 0.14) }));
    this.blobs.push({ x, y, r, color, pts, sats, ttl, age: 0, grow: 0.35 });
    const drips = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < drips; i++) {
      this.drips.push({ x: x + rand(-0.6, 0.6) * r, y: y + r * rand(0.2, 0.7), len: 0, max: rand(0.1, 0.45) * this.H, w: rand(0.012, 0.03) * this.W, v: rand(0.05, 0.16) * this.H, color, ttl, age: 0 });
    }
  }
  hitFace(color, strength = 1) {
    const m = Math.min(this.W, this.H);
    const cx = this.W / 2, cy = this.H / 2;
    this._blob(cx, cy * 0.95, m * 0.42 * strength, color, 0);
    const n = Math.round(6 * strength);
    for (let i = 0; i < n; i++) {
      this._blob(cx + rand(-0.55, 0.55) * this.W * 0.5, cy + rand(-0.5, 0.5) * this.H * 0.5, m * rand(0.12, 0.26) * strength, color, 0);
    }
  }
  hitBody(color, angle) {
    // angle: direção (rad) de onde veio o tiro, 0 = frente (topo da tela)
    const m = Math.min(this.W, this.H);
    const dx = Math.sin(angle), dy = -Math.cos(angle);
    for (let i = 0; i < 3; i++) {
      this._blob(this.W / 2 + dx * this.W * rand(0.3, 0.46), this.H / 2 + dy * this.H * rand(0.25, 0.45), m * rand(0.08, 0.18), color, 3.0);
    }
  }
  clear(animated = true) {
    if (!this.blobs.length) return;
    if (animated) this.wipe = 1; else { this.blobs.length = 0; this.drips.length = 0; this.wipe = 0; this.g.clearRect(0, 0, this.W, this.H); }
  }
  update(dt) {
    const g = this.g;
    if (!this.blobs.length) return;
    g.clearRect(0, 0, this.W, this.H);
    if (this.wipe > 0) {
      this.wipe -= dt / 0.9;
      if (this.wipe <= 0) { this.blobs.length = 0; this.drips.length = 0; this.wipe = 0; return; }
    }
    const base = this.wipe > 0 ? this.wipe : 1;
    this.blobs = this.blobs.filter((b) => b.ttl === 0 || b.age < b.ttl);
    this.drips = this.drips.filter((d) => d.ttl === 0 || d.age < d.ttl);
    for (const d of this.drips) {
      d.age += dt;
      d.len = Math.min(d.max, d.len + d.v * dt);
      const a = base * (d.ttl ? Math.min(1, (d.ttl - d.age) / 0.8) : 1);
      g.globalAlpha = 0.94 * a;
      g.strokeStyle = d.color; g.fillStyle = d.color;
      g.lineCap = 'round'; g.lineWidth = d.w;
      g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x, d.y + d.len); g.stroke();
      g.beginPath(); g.arc(d.x, d.y + d.len, d.w * 0.75, 0, 7); g.fill();
    }
    for (const b of this.blobs) {
      b.age += dt;
      b.grow = Math.min(1, b.grow + dt * 9);
      const a = base * (b.ttl ? Math.min(1, (b.ttl - b.age) / 0.8) : 1);
      const r = b.r * (0.3 + 0.7 * b.grow);
      g.globalAlpha = 0.96 * a;
      g.fillStyle = b.color;
      g.beginPath();
      b.pts.forEach((k, i) => {
        const ang = (i / b.pts.length) * Math.PI * 2;
        const x = b.x + Math.cos(ang) * r * k, y = b.y + Math.sin(ang) * r * k;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.closePath(); g.fill();
      for (const s of b.sats) { g.beginPath(); g.arc(b.x + Math.cos(s.a) * r * s.d, b.y + Math.sin(s.a) * r * s.d, r * s.r, 0, 7); g.fill(); }
      const gr = g.createRadialGradient(b.x - r * 0.3, b.y - r * 0.35, r * 0.05, b.x, b.y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)');
      g.fillStyle = gr; g.fill();
    }
    g.globalAlpha = 1;
  }
}
