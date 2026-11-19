import * as THREE from './vendor/three.module.min.js';
import { buildCharacter } from './models.js';
import { ARENA, STEP } from './world.js';

const MAX_HOPPER = 200;
const FIRE_RATE = 10; // bolinhas por segundo
const UP = new THREE.Vector3(0, 1, 0);
const rand = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();

export const DIFFICULTY = {
  facil: { react: 0.75, jitter: 0.055, turn: 3.0, burst: [2, 4], pause: [0.7, 1.4], speed: 3.4 },
  normal: { react: 0.45, jitter: 0.032, turn: 4.5, burst: [3, 6], pause: [0.45, 1.0], speed: 3.9 },
  dificil: { react: 0.25, jitter: 0.018, turn: 7.0, burst: [4, 8], pause: [0.3, 0.7], speed: 4.3 },
};

export class Combatant {
  constructor(game, { name, team, isPlayer = false }) {
    this.game = game; this.name = name; this.team = team; this.isPlayer = isPlayer;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3(); this.vy = 0; this.scoped = false;
    this.yaw = 0; this.pitch = 0; this.crouch = false;
    this.state = 'alive';
    this.hopper = MAX_HOPPER; this.pods = 4; this.reloadT = 0; this.fireCd = 0; this.heat = 0;
    this.model = buildCharacter(team, game.world);
    game.scene.add(this.model.root);
    this.kills = 0;
  }
  get alive() { return this.state === 'alive'; }
  get eyeY() { return this.pos.y + 1.62 - 0.45 * this.model.pose.crouch; }
  headCenter(out) { return out.set(this.pos.x, this.eyeY - 0.02, this.pos.z); }
  chestCenter(out) { return out.set(this.pos.x, this.eyeY - 0.5, this.pos.z); }
  get bodyTop() { return this.eyeY - 0.17; }
  forward(out) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
  get spread() {
    const moving = Math.min(1, this.vel.length() / 5);
    return (0.008 + moving * 0.016 + this.heat) * (this.crouch ? 0.65 : 1) * (this.scoped ? 0.3 : 1);
  }

  reset(x, z, yaw) {
    this.pos.set(x, 0, z); this.vel.set(0, 0, 0); this.vy = 0; this.scoped = false;
    this.yaw = yaw; this.pitch = 0; this.crouch = false;
    this.state = 'alive'; this.hopper = MAX_HOPPER; this.reloadT = 0; this.fireCd = 0; this.heat = 0;
    this.model.clearSplats();
    this.model.pose.crouch = 0; this.model.pose.hands = 0;
    this.syncModel(0.016);
  }

  // sobe em plataformas/rampas e cai das bordas
  updateY(dt) {
    const fl = this.game.world.floorAt(this.pos.x, this.pos.z, this.pos.y);
    if (this.pos.y > fl + 0.01) {
      this.vy -= 20 * dt; this.pos.y += this.vy * dt;
      if (this.pos.y <= fl) { this.pos.y = fl; this.vy = 0; }
    } else { this.pos.y = fl; this.vy = 0; }
  }

  canFire() { return this.alive && this.reloadT <= 0 && this.hopper > 0 && this.fireCd <= 0 && this.game.state === 'playing'; }

  fire(muzzle, dir) {
    if (!this.canFire()) return false;
    const sp = this.spread;
    const right = _v.crossVectors(dir, UP).normalize().clone();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * sp;
    const d = dir.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    this.game.spawnBall(muzzle, d, this);
    this.hopper--; this.fireCd = 1 / FIRE_RATE;
    this.heat = Math.min(0.03, this.heat + 0.0018);
    this.game.sfx.shot(this.isPlayer ? 1 : 9 / Math.max(9, this.game.distToListener(this.pos)));
    if (this.hopper <= 0) this.startReload();
    return true;
  }

  startReload() {
    if (this.reloadT > 0 || this.hopper >= MAX_HOPPER || !this.alive) return;
    if (this.isPlayer && this.pods <= 0) return;
    this.reloadT = this.isPlayer ? 2.0 : 2.4;
    if (this.isPlayer) this.game.sfx.reload();
  }

  tick(dt) {
    this.fireCd -= dt;
    this.heat = Math.max(0, this.heat - dt * 0.03);
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) { this.hopper = MAX_HOPPER; if (this.isPlayer) this.pods--; }
    }
  }

  // acertado por uma bolinha
  mark(shooter, head, point) {
    if (!this.alive) return;
    this.state = 'marked';
    this.crouch = false;
    this.vel.set(0, 0, 0);
    if (head) this.model.setHeadPaint(true);
    else this.model.addSplat(point, shooter.team);
    if (head) this.model.addSplat(point, shooter.team);
    shooter.kills++;
    this.game.onMarked(this, shooter, head, point);
  }

  syncModel(dt) {
    const m = this.model;
    m.root.position.set(this.pos.x, this.pos.y, this.pos.z);
    m.root.rotation.y = this.yaw;
    // LOD de equipes grandes: quem está atrás da câmera (ou muito longe) não é desenhado e anima só de vez em quando
    const cam = this.game.camera;
    if (!this.isPlayer && cam) {
      const dx = this.pos.x - cam.position.x, dz = this.pos.z - cam.position.z, d2 = dx * dx + dz * dz, f = this.game.camFwd;
      const hide = (f && dx * f.x + dz * f.z < -0.25 * Math.sqrt(d2) && d2 > 64) || d2 > 95 * 95;
      m.root.visible = !hide;
      if (m.setLod) m.setLod(d2 > 55 * 55 ? 2 : d2 > 26 * 26 ? 1 : 0);
      if (hide) { this._lodT = (this._lodT || 0) + dt; if (this._lodT < 0.15) return; dt = this._lodT; this._lodT = 0; }
    }
    m.animate(dt, { crouch: this.crouch, handsUp: !this.alive, pitch: this.pitch, speed: this.alive ? this.vel.length() : 0 });
  }
}

export class Bot extends Combatant {
  constructor(game, opts) {
    super(game, opts);
    this.dest = new THREE.Vector3();
    this.target = null; this.seenT = 0; this.scanT = Math.random() * 0.2;
    this.burst = 0; this.pauseT = 0; this.idleT = 0; this.strafe = 0; this.strafeT = 0;
    this.noiseY = 0; this.noiseP = 0; this.noiseT = 0;
    this.stuckT = 0; this.lastPos = new THREE.Vector3(); this.aggr = Math.random(); this.via = null; this.via2 = null; this.stage = 0; this.objT = 0; this.objActive = false; this.sideT = 0; this.sideDir = 1; this.stuckN = 0;
  }
  reset(x, z, yaw) {
    super.reset(x, z, yaw);
    this.target = null; this.seenT = 0; this.burst = 0; this.pauseT = 0; this.idleT = rand(0, 1.2);
    this.aggr = rand(0.2, 1);
    this.pickDest(true);
  }

  pickDest(first = false) {
    const g = this.game, spots = g.world.coverSpots;
    const own = this.team === 0 ? 1 : -1; // laranja começa em +z
    const progress = first ? 0.15 : Math.min(1, g.roundTime / 85);
    const B = ARENA.hz - 8;
    const wantZ = own * (B - (B + 8 * this.aggr) * Math.min(1, 0.25 + progress * 0.6 + this.aggr * 0.35));
    let best = null, bs = 1e9;
    for (let i = 0; i < 6; i++) {
      const s = spots[(Math.random() * spots.length) | 0];
      const score = Math.abs(s.z - wantZ) + Math.random() * 8;
      if (score < bs) { bs = score; best = s; }
    }
    // às vezes o bot se esconde dentro de um barraco
    if (!first && Math.random() < 0.2) {
      const inner = spots.filter((s) => s.via);
      if (inner.length) best = inner[(Math.random() * inner.length) | 0];
    }
    // e às vezes sobe numa torre para atirar de cima
    if (!first && Math.random() < 0.14) {
      const high = spots.filter((s) => s.y > 0);
      if (high.length) best = high[(Math.random() * high.length) | 0];
    }
    this.dest.set(best.x, best.y || 0, best.z);
    this.via = best.via || null; this.via2 = best.via2 || null; this.stage = 0;
    this.stuckT = 0; this.lastPos.copy(this.pos);
  }

  findTarget() {
    const g = this.game;
    const eye = new THREE.Vector3(this.pos.x, this.eyeY, this.pos.z);
    const f = this.forward(new THREE.Vector3());
    let best = null, bd = 58;
    const pt = new THREE.Vector3();
    for (const c of g.combatants) {
      if (c.team === this.team || !c.alive) continue;
      c.chestCenter(pt);
      const dx = pt.x - eye.x, dz = pt.z - eye.z, dist = Math.hypot(dx, dz);
      if (dist > bd) continue;
      const dot = (dx * f.x + dz * f.z) / Math.max(dist, 0.01) / Math.max(Math.hypot(f.x, f.z), 0.01);
      if (dist > 9 && dot < 0.35) continue;
      const hit = g.world.segHit(eye, pt, false);
      if (hit && hit.t < 0.97) continue;
      best = c; bd = dist;
    }
    return best;
  }

  // Centerflag: pegar a bandeira, escoltar quem a leva ou perseguir o carregador inimigo
  flagObjective(dt) {
    const g = this.game, f = g.flag;
    this.objT -= dt;
    if (this.objT > 0) return;
    this.objT = 0.5; this.objActive = false;
    if (g.mode !== 'flag' || g.state !== 'playing' || !this.alive) return;
    const goal = f.carrier ? f.carrier.pos : f.pos;
    let rank = 0;
    for (const m of g.combatants) {
      if (m === this || m.team !== this.team || !m.alive || m === f.carrier) continue;
      if (Math.hypot(m.pos.x - goal.x, m.pos.z - goal.z) < Math.hypot(this.pos.x - goal.x, this.pos.z - goal.z)) rank++;
    }
    let tx = null, tz = null;
    if (f.carrier === this) { tx = this.pos.x * 0.4; tz = this.team === 0 ? -(ARENA.hz - 2.5) : ARENA.hz - 2.5; }
    else if (!f.carrier) { if (rank < 2) { tx = f.pos.x; tz = f.pos.z; } }
    else if (f.carrier.team === this.team) { if (rank < 3) { tx = f.carrier.pos.x + (rank - 1) * 1.6; tz = f.carrier.pos.z + (this.team === 0 ? -2 : 2); } }
    else if (rank < 3) { tx = f.carrier.pos.x; tz = f.carrier.pos.z; }
    if (tx === null) return;
    this.objActive = true; this.via = null; this.via2 = null; this.stage = 2;
    this.dest.set(tx, 0, tz);
  }

  think(dt) {
    const g = this.game, P = DIFFICULTY[g.difficulty];
    if (g.mode === 'flag') this.flagObjective(dt); else this.objActive = false;
    if (!this.alive || g.state !== 'playing') { this.vel.multiplyScalar(0.8); return; }
    this.tick(dt);
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.12 + Math.random() * 0.1;
      const t = this.findTarget();
      if (t !== this.target) this.seenT = 0;
      this.target = t;
    }
    let wishX = 0, wishZ = 0, speed = 0;
    const t = (g.mode === 'flag' && g.flag.carrier === this) ? null : this.target;   // quem leva a bandeira corre, não luta
    if (t) {
      this.seenT += dt;
      const pt = t.chestCenter(new THREE.Vector3());
      this.noiseT -= dt;
      if (this.noiseT <= 0) { this.noiseT = 0.35; this.noiseY = rand(-1, 1) * P.jitter * 1.2; this.noiseP = rand(-1, 1) * P.jitter * 1.2; }
      const dx = pt.x - this.pos.x, dz = pt.z - this.pos.z, dy = pt.y - this.eyeY;
      const hd = Math.hypot(dx, dz);
      const wantYaw = Math.atan2(-dx, -dz) + this.noiseY;
      const wantPitch = Math.atan2(dy, hd) + this.noiseP;
      let dyaw = wantYaw - this.yaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      const turn = P.turn * dt;
      this.yaw += Math.max(-turn, Math.min(turn, dyaw));
      this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 8);
      const err = Math.abs(dyaw);
      // movimento durante o combate: ocasionalmente se desloca de lado ou agacha
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeT = rand(0.5, 1.3);
        this.strafe = Math.random() < 0.45 ? 0 : (Math.random() < 0.5 ? -1 : 1);
        if (Math.random() < 0.25) this.crouch = !this.crouch;
      }
      if (this.strafe) {
        const sx = Math.cos(this.yaw) * this.strafe, sz = -Math.sin(this.yaw) * this.strafe;
        wishX = sx; wishZ = sz; speed = this.crouch ? 1.4 : P.speed * 0.6;
      }
      // disparo em rajadas
      if (this.pauseT > 0) this.pauseT -= dt;
      else if (this.seenT > P.react && err < 0.12 && this.canFire()) {
        if (this.burst <= 0) this.burst = Math.round(rand(P.burst[0], P.burst[1]));
        const muzzle = new THREE.Vector3(this.pos.x, this.eyeY - 0.18, this.pos.z)
          .addScaledVector(this.forward(new THREE.Vector3()), 0.55);
        const dir = this.forward(new THREE.Vector3());
        if (this.fire(muzzle, dir)) {
          this.burst--;
          if (this.burst <= 0) this.pauseT = rand(P.pause[0], P.pause[1]);
        }
      }
    } else {
      this.seenT = 0; this.burst = 0;
      if (this.hopper < 40) this.startReload();
      this.crouch = false;
      // pontos de passagem: fora da porta -> logo depois da porta -> destino (para entrar nos barracos)
      let wp = null;
      for (let k = 0; k < 2; k++) {
        wp = this.stage === 0 ? this.via : this.stage === 1 ? this.via2 : null;
        if (wp && Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z) < 0.8) this.stage++; else break;
      }
      wp = this.stage === 0 ? this.via : this.stage === 1 ? this.via2 : null;
      const goVia = !!wp;
      const tx = wp ? wp.x : this.dest.x, tz = wp ? wp.z : this.dest.z;
      const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.7 && !goVia) {
        this.idleT -= dt;
        if (this.idleT <= 0) { this.idleT = rand(0.6, 2.2); if (!this.objActive) this.pickDest(); }
        // olha para o lado do inimigo enquanto espera
        const ez = this.team === 0 ? -1 : 1;
        const wantYaw = ez < 0 ? 0 : Math.PI;
        let dyaw = Math.atan2(Math.sin(wantYaw - this.yaw), Math.cos(wantYaw - this.yaw));
        this.yaw += dyaw * Math.min(1, dt * 3);
        this.pitch += (0 - this.pitch) * Math.min(1, dt * 4);
        this.crouch = true;
      } else {
        wishX = dx / d; wishZ = dz / d; speed = P.speed;
        // preso num obstáculo: contorna pelo lado por um instante
        if (this.sideT > 0) { this.sideT -= dt; wishX = wishX * 0.35 - wishZ * this.sideDir; wishZ = wishZ * 0.35 + dx / d * this.sideDir; }
        const wantYaw = Math.atan2(-dx, -dz);
        let dyaw = Math.atan2(Math.sin(wantYaw - this.yaw), Math.cos(wantYaw - this.yaw));
        this.yaw += dyaw * Math.min(1, dt * 6);
        this.pitch += (0 - this.pitch) * Math.min(1, dt * 4);
        this.stuckT += dt;
        if (this.stuckT > 0.9) {
          if (this.pos.distanceTo(this.lastPos) < 0.5) {
            this.stuckN = (this.stuckN || 0) + 1;
            this.sideDir = Math.random() < 0.5 ? -1 : 1; this.sideT = 1.1;                 // desvia para o lado
            if (!this.objActive && this.stuckN >= 2) { this.pickDest(); this.stuckN = 0; }   // e, se persistir, escolhe outro destino
          } else this.stuckN = 0;
          this.stuckT = 0; this.lastPos.copy(this.pos);
        }
      }
    }
    if (this.crouch && !t) speed *= 0.5;
    this.vel.set(wishX * speed, 0, wishZ * speed);
    this.pos.addScaledVector(this.vel, dt);
    g.world.collide(this.pos, 0.35);
    this.updateY(dt);
  }
}
