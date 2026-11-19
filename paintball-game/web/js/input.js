// Entrada unificada: teclado + mouse (PC) e joystick + botões na tela (celular).
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.lx = 0; this.ly = 0;           // look acumulado
    this.fireMouse = false; this.holdFire = false; this.fireUntil = 0; this.auto = false;
    this.joy = { x: 0, y: 0 };
    this.crouchTouch = false;
    this.sens = 1;
    this.on = { reload() {}, cam() {}, pause() {}, lockChange() {}, scope() {}, scopeToggle() {}, scopeStep() {} };
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
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.fireMouse = true; this.dragging = true; } else if (e.button === 2) this.on.scope(true); });
    addEventListener('mouseup', (e) => { if (e.button === 0) { this.fireMouse = false; this.dragging = false; } else if (e.button === 2) this.on.scope(false); });
    addEventListener('wheel', (e) => { if (document.body.classList.contains('ingame')) this.on.scopeStep(e.deltaY < 0 ? 1 : -1); }, { passive: true });
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
      this.joy.x = dx / R; this.joy.y = dy / R; jmax = Math.max(jmax, Math.hypot(this.joy.x, this.joy.y));
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    let jst = 0, jmax = 0;
    zoneL.addEventListener('pointerdown', () => { jst = performance.now(); jmax = 0; }, true);
    const endJoy = (e) => {
      if (e.pointerId !== joyId) return;
      if (jmax < 0.25 && performance.now() - jst < 240) this.burst();
      joyId = null; this.joy.x = this.joy.y = 0;
      stick.style.transform = 'translate(0,0)'; base.classList.remove('on');
    };
    zoneL.addEventListener('pointerup', endJoy);
    zoneL.addEventListener('pointercancel', endJoy);

    // Zona de mira: arrastar = virar a câmera · toque rápido = rajada curta · segurar parado = rajada contínua
    let lookId = null, lastX = 0, lastY = 0, sx = 0, sy = 0, st = 0, moved = false, holdT = null;
    zoneR.addEventListener('pointerdown', (e) => {
      if (lookId !== null) return;
      lookId = e.pointerId; lastX = sx = e.clientX; lastY = sy = e.clientY; st = performance.now(); moved = false;
      zoneR.setPointerCapture(lookId);
      clearTimeout(holdT); holdT = setTimeout(() => { if (!moved && lookId !== null) this.holdFire = true; }, 170);
    });
    zoneR.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 14) { moved = true; clearTimeout(holdT); }
      this.lx += (e.clientX - lastX) * 1.6; this.ly += (e.clientY - lastY) * 1.6;
      lastX = e.clientX; lastY = e.clientY;
    });
    const endLook = (e) => {
      if (e.pointerId !== lookId) return;
      clearTimeout(holdT); lookId = null;
      if (this.holdFire) this.holdFire = false;
      else if (!moved && performance.now() - st < 280) this.burst();
    };
    zoneR.addEventListener('pointerup', endLook);
    zoneR.addEventListener('pointercancel', (e) => { if (e.pointerId === lookId) { clearTimeout(holdT); lookId = null; this.holdFire = false; } });

    const bindBtn = (id, down, up) => {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('down'); down(); });
      const end = (e) => { e.stopPropagation(); b.classList.remove('down'); if (up) up(); };
      b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    };
    bindBtn('btn-reload', () => this.on.reload());
    bindBtn('btn-crouch', () => { this.crouchTouch = !this.crouchTouch; document.getElementById('btn-crouch').classList.toggle('active', this.crouchTouch); });
    bindBtn('btn-cam', () => this.on.cam());
    bindBtn('btn-zoom', () => this.on.scopeToggle());
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
  burst() { this.fireUntil = performance.now() + 300; }          // toque: ~3 bolinhas
  get fire() { return this.fireMouse || this.holdFire || this.auto || performance.now() < this.fireUntil; }
  get crouch() { return !!(this.keys.KeyC || this.keys.ControlLeft) || this.crouchTouch; }
}
