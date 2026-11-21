// Sons sintetizados (sem arquivos de áudio): estouro do marcador, splat, acerto etc.
export class Sfx {
  constructor() { this.ctx = null; this.master = null; this.noise = null; this.muted = false; this.vol = 0.7; this.musicVol = 0.4; this.musicScale = 1; this.musicOn = false; this.ambKind = null; this.ambVol = 0.7; this.silent = null; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol ?? 0.6;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.ambBus = this.ctx.createGain(); this.ambBus.gain.value = this.ambVol; this.ambBus.connect(this.master);
    if (this.ambKind) this.setAmbient(this.ambKind);
  }

  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; }
  setMuted(b) { this.muted = b; if (this.master) this.master.gain.value = b ? 0 : this.vol; }
  setMusic(v) { this.musicVol = v; this._applyMusic(); }
  setAmbientLevel(v) { this.ambVol = v; if (this.ambBus) this.ambBus.gain.value = v; }
  setMusicScale(s) { this.musicScale = s; this._applyMusic(); }
  _applyMusic() { if (this.musicGain) this.musicGain.gain.value = this.musicVol * this.musicScale; }

  // Navegadores de celular só liberam o áudio depois de um toque: chamamos isto no primeiro toque/tecla.
  unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignora */ }
    // iPhone: o Web Audio obedece à chave de silencioso; tocar um <audio> faz o som sair mesmo assim
    if (!this.silent) {
      try {
        const wav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=';
        this.silent = new Audio(wav); this.silent.loop = true; this.silent.volume = 0.01; this.silent.setAttribute('playsinline', '');
      } catch (e) { this.silent = null; }
    }
    if (this.silent) { const p = this.silent.play(); if (p && p.catch) p.catch(() => {}); }
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') this.ctx.resume();
    try { const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0); } catch (e) { /* ignora */ }
    this.startMusic();
  }
  get running() { return !!this.ctx && this.ctx.state === 'running'; }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  _toneAt(t, f0, f1, dur, vol, type, dest) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  _noiseAt(t, type, freq, q, dur, vol, dest) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  // trilha sintetizada (batida suave + baixo + pad), sem arquivos de áudio
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master); this._applyMusic();
    this.mstep = 0; this.nextT = this.ctx.currentTime + 0.15;
    const stepDur = 60 / 104 / 4;
    this.musicTimer = setInterval(() => {
      const c = this.ctx; if (!c || c.state !== 'running') return;
      while (this.nextT < c.currentTime + 0.25) { this._musicStep(this.mstep % 32, this.nextT); this.nextT += stepDur; this.mstep++; }
      if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.05;
    }, 40);
  }
  _musicStep(s, t) {
    const d = this.musicGain, root = [55, 55, 43.65, 49][Math.floor(s / 8) % 4];
    if (s % 4 === 0) this._toneAt(t, 120, 42, 0.16, 0.55, 'sine', d);
    if (s % 4 === 2) this._noiseAt(t, 'highpass', 7000, 0.7, 0.04, 0.10, d);
    if ([0, 3, 6, 10, 13].includes(s % 16)) this._toneAt(t, root * (s % 16 === 10 ? 2 : 1), root * (s % 16 === 10 ? 2 : 1), 0.2, 0.22, 'sawtooth', d);
    if (s % 16 === 0) [220, 261.6, 329.6].forEach((f) => this._toneAt(t, f, f, 1.6, 0.035, 'triangle', d));
  }

  // som ambiente por campo: cama contínua (vento/zumbido) + eventos (pássaros, pingos, percussão distante…)
  setAmbient(kind) {
    this.ambKind = kind;
    clearTimeout(this.evTimer); clearInterval(this.percTimer);
    if (!this.ctx) return;
    if (this.amb) { try { this.amb.src.stop(); this.amb.lfo.stop(); } catch (e) { /* ignora */ } this.amb.g.disconnect(); this.amb = null; }
    if (!kind) return;
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    src.buffer = this.noise; src.loop = true;
    const cfg = { arena: ['lowpass', 520, 0.5, 0.16], ferro: ['lowpass', 420, 0.5, 0.16], favela: ['lowpass', 600, 0.5, 0.13], galpao: ['lowpass', 190, 0.6, 0.2], cidade: ['bandpass', 280, 0.4, 0.15], apocalipse: ['lowpass', 240, 0.5, 0.18] }[kind] || ['lowpass', 450, 0.5, 0.14];
    f.type = cfg[0]; f.frequency.value = cfg[1]; f.Q.value = cfg[2]; g.gain.value = cfg[3];
    lfo.frequency.value = 0.1; lg.gain.value = cfg[1] * 0.4; lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(this.ambBus); src.start(); lfo.start();
    this.amb = { src, lfo, g };
    if (kind === 'galpao') { // zumbido elétrico grave
      const o = c.createOscillator(), og = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 50; og.gain.value = 0.012; o.connect(og); og.connect(this.ambBus); o.start(); this.amb.hum = o;
      const prevStop = this.amb.lfo; this.amb.lfo = { stop() { prevStop.stop(); o.stop(); } };
    }
    const events = { arena: ['birds', 'gust'], ferro: ['crow', 'clank', 'gust'], favela: ['dog', 'gust', 'birds'], galpao: ['drip', 'creak', 'clang'], cidade: ['gust', 'creak', 'siren', 'clank'], apocalipse: ['gust', 'creak', 'crackle', 'crackle', 'boom', 'clank'] }[kind] || ['gust'];
    const next = () => {
      this.evTimer = setTimeout(() => { if (this.ctx && this.ctx.state === 'running' && this.ambKind === kind) this._ambEvent(events[Math.floor(Math.random() * events.length)]); next(); }, 1500 + Math.random() * 4500);
    };
    next();
    if (kind === 'favela') this._startPercussion();
  }
  _ambEvent(name) {
    const c = this.ctx, t = c.currentTime, d = this.ambBus;
    if (name === 'birds') { const n = 2 + Math.floor(Math.random() * 4), base = 2400 + Math.random() * 1200; for (let i = 0; i < n; i++) this._toneAt(t + i * 0.11, base, base * 1.5, 0.07, 0.07, 'sine', d); }
    else if (name === 'crow') { for (let i = 0; i < 2 + (Math.random() < 0.5 ? 1 : 0); i++) { this._toneAt(t + i * 0.32, 620, 380, 0.24, 0.1, 'sawtooth', d); } }
    else if (name === 'dog') { this._toneAt(t, 520, 300, 0.12, 0.07, 'sawtooth', d); this._toneAt(t + 0.22, 500, 280, 0.12, 0.06, 'sawtooth', d); }
    else if (name === 'drip') { const f = 1500 + Math.random() * 900; this._toneAt(t, f, f * 0.5, 0.09, 0.09, 'sine', d); this._toneAt(t + 0.16, f * 0.9, f * 0.45, 0.09, 0.04, 'sine', d); }
    else if (name === 'creak') { this._toneAt(t, 120, 70, 0.8, 0.045, 'sawtooth', d); this._toneAt(t + 0.05, 180, 95, 0.7, 0.03, 'square', d); }
    else if (name === 'clank' || name === 'clang') { const f = 480 + Math.random() * 500; this._toneAt(t, f, f * 0.98, name === 'clang' ? 0.9 : 0.35, 0.07, 'triangle', d); this._toneAt(t, f * 2.4, f * 2.3, 0.25, 0.03, 'square', d); }
    else if (name === 'siren') { const g = c.createGain(), o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(900, t + 1.6); o.frequency.linearRampToValueAtTime(600, t + 3.2); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + 3.2); o.connect(g); g.connect(d); o.start(t); o.stop(t + 3.3); }
    else if (name === 'crackle') { for (let i = 0; i < 7; i++) this._noiseAt(t + i * 0.05 + Math.random() * 0.05, 'highpass', 1800 + Math.random() * 2200, 1, 0.03, 0.06, d); }
    else if (name === 'boom') { this._noiseAt(t, 'lowpass', 140, 0.7, 1.6, 0.22, d); this._toneAt(t, 70, 28, 1.4, 0.18, 'sine', d); }
    else if (name === 'gust') { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 400; f.Q.value = 0.6; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 1.4); g.gain.linearRampToValueAtTime(0.0001, t + 3.2); s.connect(f); f.connect(g); g.connect(d); s.start(t, Math.random() * 0.4, 3.3); }
  }
  // percussão distante (surdo + caixa), baixinha, para o clima de comunidade
  _startPercussion() {
    let step = 0;
    this.percTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.ambKind !== 'favela') return;
      const t = this.ctx.currentTime + 0.05, d = this.ambBus, s = step % 16;
      if (s === 0 || s === 8 || s === 11) this._toneAt(t, 95, 52, 0.22, 0.12, 'sine', d);
      if ([2, 5, 7, 10, 13, 15].includes(s)) this._noiseAt(t, 'bandpass', 3200, 1.2, 0.05, 0.07, d);
      if (s === 4 || s === 12) this._toneAt(t, 260, 200, 0.08, 0.06, 'triangle', d);
      step++;
    }, 60000 / 92 / 4);
  }
  // passos
  step(vol = 1) { if (!this.ctx || this.muted || vol < 0.03) return; this._noiseAt(this.ctx.currentTime, 'lowpass', 700 + Math.random() * 200, 0.7, 0.06, 0.16 * vol, this.master); }
  ui() { this._tone(1250, 880, 0.045, 0.12, 'square'); }

  _burst(type, freq, q, dur, vol) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  _tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  shot(vol = 1) {
    if (vol < 0.03) return;
    this._burst('bandpass', 900, 0.9, 0.09, 0.5 * vol);
    this._tone(150, 60, 0.09, 0.5 * vol);
  }
  splat(vol = 1) {
    if (vol < 0.03) return;
    this._burst('lowpass', 1400, 0.7, 0.12, 0.35 * vol);
  }
  hitmarker() { this._tone(1500, 1100, 0.06, 0.25, 'square'); }
  marked() { this._burst('lowpass', 700, 0.5, 0.3, 0.6); this._tone(320, 90, 0.5, 0.3, 'sawtooth'); }
  beep(high = false) { this._tone(high ? 1320 : 880, high ? 1320 : 880, 0.18, 0.25, 'square'); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, f, 0.2, 0.25, 'triangle', i * 0.12)); }
  lose() { [392, 330, 262].forEach((f, i) => this._tone(f, f * 0.95, 0.3, 0.25, 'triangle', i * 0.18)); }
  reload() { this._burst('bandpass', 2500, 3, 0.05, 0.3); this._tone(300, 200, 0.08, 0.2, 'square', 0.35); }
}
