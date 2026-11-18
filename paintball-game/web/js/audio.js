// Sons sintetizados (sem arquivos de áudio): estouro do marcador, splat, acerto etc.
export class Sfx {
  constructor() { this.ctx = null; this.master = null; this.noise = null; this.muted = false; }

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
  }

  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }

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
