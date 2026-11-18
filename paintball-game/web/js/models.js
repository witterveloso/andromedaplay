import * as THREE from './vendor/three.module.min.js';
import { TEAM_PAINT } from './world.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
const lerp = (a, b, t) => a + (b - a) * t;

// Marcador: cano aponta para -Z. userData.muzzle = ponta do cano.
export function buildMarker(paint) {
  const g = new THREE.Group();
  const dark = std(0x1b1d20, { roughness: 0.35, metalness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.32), dark);
  g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 10), std(0x8b9097, { roughness: 0.3, metalness: 0.9 }));
  barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.34; g.add(barrel);
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), dark);
  shroud.position.set(0, -0.005, -0.2); g.add(shroud);
  const hopperMat = new THREE.MeshStandardMaterial({
    color: paint, emissive: paint, emissiveIntensity: 0.3, roughness: 0.2, transparent: true, opacity: 0.85,
  });
  const hopper = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), hopperMat);
  hopper.scale.y = 0.9; hopper.position.set(0, 0.16, 0.02); g.add(hopper);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.07, 8), dark);
  neck.position.set(0, 0.095, 0.02); g.add(neck);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 12), std(0xb8bcc2, { roughness: 0.3, metalness: 0.85 }));
  tank.rotation.x = Math.PI / 2; tank.position.set(0, -0.11, 0.24); g.add(tank);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), dark);
  grip.position.set(0, -0.1, 0.05); grip.rotation.x = 0.25; g.add(grip);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -0.55);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

let camoTex = null;
function camoTexture() {
  if (camoTex) return camoTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3b4230'; g.fillRect(0, 0, 128, 128);
  const cols = ['#2b3123', '#4d5640', '#232820', '#5f6650'];
  for (let i = 0; i < 38; i++) {
    g.fillStyle = cols[i % cols.length];
    g.beginPath();
    g.ellipse(Math.random() * 128, Math.random() * 128, 8 + Math.random() * 16, 5 + Math.random() * 10, Math.random() * 3, 0, 7);
    g.fill();
  }
  camoTex = new THREE.CanvasTexture(c);
  camoTex.wrapS = camoTex.wrapT = THREE.RepeatWrapping;
  camoTex.colorSpace = THREE.SRGBColorSpace;
  return camoTex;
}

export function buildCharacter(team, world) {
  const paint = TEAM_PAINT[team];
  const jersey = std(paint, { roughness: 0.7 });
  const camo = std(0xffffff, { roughness: 0.95, map: camoTexture() });
  const black = std(0x15171a, { roughness: 0.5 });
  const skin = std(0xc89a78, { roughness: 0.8 });
  const root = new THREE.Group();
  const upper = new THREE.Group();
  const legsGroup = new THREE.Group();
  root.add(upper, legsGroup);

  const legs = [-1, 1].map((s) => {
    const g = new THREE.Group();
    g.position.x = s * 0.1;
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.62, 4, 8), camo);
    leg.position.y = -0.4;
    const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.18, 3, 8), black);
    boot.rotation.x = Math.PI / 2;
    boot.position.set(0, -0.76, -0.05);
    g.add(leg, boot);
    legsGroup.add(g);
    return g;
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 4, 12), jersey);
  torso.scale.set(1.65, 1, 1.05);
  torso.position.y = 1.12;
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.16, 4, 12), std(0x23262b, { roughness: 0.9 }));
  vest.scale.set(1.7, 1, 1.1);
  vest.position.y = 1.2;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), std(0x1b1d20));
  pack.position.set(0, 1.18, 0.2);
  upper.add(torso, vest, pack);

  // cabeça + máscara
  const head = new THREE.Group();
  head.position.y = 1.6;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), std(0x1c1f23, { roughness: 0.4 }));
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skin);
  neckM.position.y = -0.14;
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0x16283a, emissive: 0x0a1624, roughness: 0.08, metalness: 0.35 })
  );
  visor.scale.set(1.3, 0.72, 0.75);
  visor.position.set(0, -0.005, -0.1);
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.09), black);
  chin.position.set(0, -0.085, -0.1);
  head.add(chin);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.27), jersey);
  stripe.position.y = 0.09;
  head.add(helmet, visor, neckM, stripe);
  const paintOverlay = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), world.splatMaterial(team, 3));
  paintOverlay.position.set(0, 0.0, -0.152);
  paintOverlay.rotation.y = Math.PI;
  paintOverlay.visible = false;
  head.add(paintOverlay);
  upper.add(head);

  // braços + marcador (pivô no ombro)
  const pivot = new THREE.Group();
  pivot.position.y = 1.38;
  const mkArm = (s) => {
    const a = new THREE.Group();
    a.position.x = s * 0.27;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.46, 4, 8), jersey);
    arm.position.y = -0.28;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), black);
    hand.position.y = -0.58;
    a.add(arm, hand);
    pivot.add(a);
    return a;
  };
  const armR = mkArm(1), armL = mkArm(-1);
  const marker = buildMarker(paint);
  marker.position.set(0.05, -0.08, -0.5);
  pivot.add(marker);
  upper.add(pivot);
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  paintOverlay.castShadow = false;

  const bodySplats = [];
  const pose = { crouch: 0, hands: 0, phase: 0 };
  const tmp = new THREE.Vector3();
  const ch = {
    root, marker, head, paintOverlay, pose,
    setHeadPaint(on) { paintOverlay.visible = on; },
    addSplat(worldPoint, team2) {
      root.updateMatrixWorld(true);
      tmp.copy(worldPoint);
      root.worldToLocal(tmp);
      const n = new THREE.Vector3(tmp.x, 0, tmp.z);
      if (n.lengthSq() < 1e-4) n.set(0, 0, -1);
      n.normalize();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), world.splatMaterial(team2, Math.floor(Math.random() * 3)));
      m.scale.setScalar(0.3 + Math.random() * 0.15);
      m.position.set(n.x * 0.27, clamp01(tmp.y, 0.3, 1.6), n.z * 0.27);
      m.lookAt(m.position.clone().add(n));
      m.rotateZ(Math.random() * 6);
      root.add(m);
      bodySplats.push(m);
      if (bodySplats.length > 7) root.remove(bodySplats.shift());
    },
    clearSplats() { bodySplats.splice(0).forEach((m) => root.remove(m)); paintOverlay.visible = false; },
    animate(dt, st) {
      const k = Math.min(1, dt * 10);
      pose.crouch = lerp(pose.crouch, st.crouch ? 1 : 0, k);
      pose.hands = lerp(pose.hands, st.handsUp ? 1 : 0, Math.min(1, dt * 7));
      const c = pose.crouch, h = pose.hands;
      legsGroup.position.y = 0.8 - 0.4 * c;
      legsGroup.scale.y = 1 - 0.5 * c;
      upper.position.y = -0.4 * c;
      pose.phase += st.speed * dt * 2.4;
      const sw = Math.sin(pose.phase) * 0.75 * Math.min(1, st.speed / 3);
      legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
      pivot.rotation.x = lerp(st.pitch * 0.7, 0, h);
      armR.rotation.x = lerp(Math.PI / 2 - 0.1, Math.PI, h);
      armL.rotation.x = lerp(Math.PI / 2 - 0.1, Math.PI, h);
      armR.rotation.z = lerp(0, -0.25, h); armL.rotation.z = lerp(0, 0.25, h);
      armL.rotation.y = lerp(-0.25, 0, h);
      marker.position.set(lerp(0.05, 0.27, h), lerp(-0.08, 0.7, h), lerp(-0.5, 0, h));
      marker.rotation.x = lerp(0, Math.PI / 2, h);
    },
  };
  return ch;
}

function clamp01(v, a, b) { return Math.max(a, Math.min(b, v)); }
