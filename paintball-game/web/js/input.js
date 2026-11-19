// Entrada unificada: teclado + mouse (PC) e joystick + botões na tela (celular).
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.lx = 0; this.ly = 0;           // look acumulado
    this.fireMouse = false; this.fireTouch = false; this.fireTouchL = false; this.auto = false;
    this.joy = { x: 0, y: 0 };
    this.crouchTouch = false;
    this.sens = 1;
    this.on = { reload() {}, cam() {}, pause() {}, lockChange() {} };
    this.locked = false;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.on.reload();
      if (e.code === 'KeyV') this.on.cam();
      if (e.code === 'Escape') this.on.pause();
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.fireMouse = false; });
    addEventListener('mousemove', (e) => {
      if (this.locked || (this.dragging && !IS_TOUCH)) { this.lx += e.movementX; this.ly += e.movementY; }
    });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.fireMouse = true; this.dragging = true; } });
    addEventListener('mouseup', (e) => { if (e.button === 0) { this.fireMouse = false; this.dragging = false; } });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.on.lockChange(this.locked);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    if (IS_TOUCH) this._initTouch();
  }

  requestLock() {
    if (IS_TOUCH) return;
    try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignora */ }
  }

  _initTouch() {
    const zoneL = document.getElementById('joy-zone');
    const zoneR = document.getElementById('look-zone');
    const base = document.getElementById('joy-base');
    const stick = document.getElementById('joy-stick');
    let joyId = null, ox = 0, oy = 0;
    const R = 58;
    zoneL.addEventListener('pointerdown', (e) => {
      if (joyId !== null) return;
      joyId = e.pointerId; ox = e.clientX; oy = e.clientY;
      zoneL.setPointerCapture(joyId);
      base.style.left = `${ox}px`; base.style.top = `${oy}px`; base.classList.add('on');
    });
    zoneL.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyId) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      this.joy.x = dx / R; this.joy.y = dy / R;
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const endJoy = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null; this.joy.x = this.joy.y = 0;
      stick.style.transform = 'translate(0,0)'; base.classList.remove('on');
    };
    zoneL.addEventListener('pointerup', endJoy);
    zoneL.addEventListener('pointercancel', endJoy);

    let lookId = null, lastX = 0, lastY = 0;
    zoneR.addEventListener('pointerdown', (e) => {
      if (lookId !== null) return;
      lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY; zoneR.setPointerCapture(lookId);
    });
    zoneR.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      this.lx += (e.clientX - lastX) * 1.6; this.ly += (e.clientY - lastY) * 1.6;
      lastX = e.clientX; lastY = e.clientY;
    });
    const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
    zoneR.addEventListener('pointerup', endLook);
    zoneR.addEventListener('pointercancel', endLook);

    const bindBtn = (id, down, up) => {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('down'); down(); });
      const end = (e) => { e.stopPropagation(); b.classList.remove('down'); if (up) up(); };
      b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    };
    bindBtn('btn-fire', () => { this.fireTouch = true; }, () => { this.fireTouch = false; });
    // arrastar com o dedo no botão de fogo também gira a câmera (atirar e acompanhar o alvo com um só dedo)
    {
      const fb = document.getElementById('btn-fire');
      let fid = null, fx = 0, fy = 0;
      fb.addEventListener('pointerdown', (e) => { fid = e.pointerId; fx = e.clientX; fy = e.clientY; });
      fb.addEventListener('pointermove', (e) => {
        if (e.pointerId !== fid) return;
        this.lx += (e.clientX - fx) * 1.6; this.ly += (e.clientY - fy) * 1.6;
        fx = e.clientX; fy = e.clientY;
      });
      const endF = (e) => { if (e.pointerId === fid) fid = null; };
      fb.addEventListener('pointerup', endF); fb.addEventListener('pointercancel', endF);
    }
    bindBtn('btn-fire-l', () => { this.fireTouchL = true; }, () => { this.fireTouchL = false; });
    bindBtn('btn-reload', () => this.on.reload());
    bindBtn('btn-crouch', () => { this.crouchTouch = !this.crouchTouch; document.getElementById('btn-crouch').classList.toggle('active', this.crouchTouch); });
    bindBtn('btn-cam', () => this.on.cam());
    bindBtn('btn-pause', () => this.on.pause());
    document.addEventListener('touchmove', (e) => { if (document.body.classList.contains('ingame')) e.preventDefault(); }, { passive: false });
  }

  consumeLook() {
    const r = { x: this.lx, y: this.ly };
    this.lx = this.ly = 0;
    return r;
  }
  move() {
    const k = this.keys;
    let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let y = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    x += this.joy.x; y += this.joy.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, sprint: !!(k.ShiftLeft || k.ShiftRight) || this.joy.y < -0.95 };
  }
  get fire() { return this.fireMouse || this.fireTouch || this.fireTouchL || this.auto; }
  get crouch() { return !!(this.keys.KeyC || this.keys.ControlLeft) || this.crouchTouch; }
}
