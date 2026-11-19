// Sons sintetizados (sem arquivos de áudio): estouro do marcador, splat, acerto etc.
export class Sfx {
  constructor() { this.ctx = null; this.master = null; this.noise = null; this.muted = false; this.vol = 0.7; this.musicVol = 0.4; this.musicScale = 1; this.musicOn = false; this.ambKind = null; }

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
    if (this.ambKind) this.setAmbient(this.ambKind);
  }

  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  setMusic(v) { this.musicVol = v; this._applyMusic(); }
  setMusicScale(s) { this.musicScale = s; this._applyMusic(); }
  _applyMusic() { if (this.musicGain) this.musicGain.gain.value = this.musicVol * this.musicScale; }

  // Navegadores de celular só liberam o áudio depois de um toque: chamamos isto no primeiro toque/tecla.
  unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignora */ }
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') this.ctx.resume();
    try { const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0); } catch (e) { /* ignora */ }
    this.startMusic();
  }
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
    this.step = 0; this.nextT = this.ctx.currentTime + 0.15;
    const stepDur = 60 / 104 / 4;
    this.musicTimer = setInterval(() => {
      const c = this.ctx; if (!c || c.state !== 'running') return;
      while (this.nextT < c.currentTime + 0.25) { this._musicStep(this.step % 32, this.nextT); this.nextT += stepDur; this.step++; }
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

  // som ambiente por campo (vento, ruído de galpão, cidade vazia)
  setAmbient(kind) {
    this.ambKind = kind;
    if (!this.ctx) return;
    if (this.amb) { try { this.amb.src.stop(); this.amb.lfo.stop(); } catch (e) { /* ignora */ } this.amb.g.disconnect(); this.amb = null; }
    if (!kind) return;
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    src.buffer = this.noise; src.loop = true;
    const cfg = { outdoor: ['lowpass', 520, 0.5, 0.07], indoor: ['lowpass', 170, 0.6, 0.09], city: ['bandpass', 260, 0.4, 0.06] }[kind] || ['lowpass', 400, 0.5, 0.06];
    f.type = cfg[0]; f.frequency.value = cfg[1]; f.Q.value = cfg[2]; g.gain.value = cfg[3];
    lfo.frequency.value = 0.12; lg.gain.value = cfg[1] * 0.35; lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(); lfo.start();
    this.amb = { src, lfo, g };
  }
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
