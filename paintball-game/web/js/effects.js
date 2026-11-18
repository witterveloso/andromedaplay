import * as THREE from './vendor/three.module.min.js';

// Partículas de tinta (explosão ao estourar a bolinha)
export class Particles {
  constructor(scene, count = 220) {
    this.count = count;
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.028, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      count
    );
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.p = Array.from({ length: count }, () => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, s: 1 }));
    this.i = 0;
    this.m = new THREE.Matrix4();
    this.col = new THREE.Color();
    for (let k = 0; k < count; k++) {
      this.mesh.setMatrixAt(k, this.m.makeScale(0, 0, 0));
      this.mesh.setColorAt(k, this.col.set(0xffffff));
    }
    scene.add(this.mesh);
  }

  burst(point, normal, color, n = 10, speed = 3) {
    for (let k = 0; k < n; k++) {
      const q = this.p[this.i];
      this.mesh.setColorAt(this.i, this.col.set(color));
      this.i = (this.i + 1) % this.count;
      q.pos.copy(point);
      q.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(speed).addScaledVector(normal, speed * (0.4 + Math.random() * 0.8));
      q.life = 0.35 + Math.random() * 0.3;
      q.s = 0.6 + Math.random() * 1.1;
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    for (let k = 0; k < this.count; k++) {
      const q = this.p[k];
      if (q.life > 0) {
        q.life -= dt;
        q.vel.y -= 9 * dt;
        q.pos.addScaledVector(q.vel, dt);
        const s = q.life > 0 ? q.s * Math.min(1, q.life * 4) : 0;
        this.m.makeScale(s, s, s).setPosition(q.pos);
      } else this.m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(k, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
