// The swim, late morning on day two: everyone down at the stream. Moss soaks with an orange on their head (they said so
// at the circle: "Oranges. Ideally balanced on my head first."), Clover floats in a pink inner tube by Lumi's spot on the
// bank, Biscuit paddles in circles, Rowan wades in at the shallow end, Juniper is lifeguard on a rock, Nyx and Thistle
// keep their feet dry. You jump in, Comet cannonballs in after you, and there's a splash fight. This module holds the
// props, the spots, the splashes and the paddling; main.js runs the scene.
import * as THREE from 'three';
import { heightAt, streamX, waterY } from './world.js';
import { withFill } from './plush.js';

const mat = (color, o = {}) => withFill(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }));
// spots along the stream: [z, x from the stream's centre line (negative is the camp side), what they do]
// The camera looks up the stream from downstream (larger z is nearer it), so the bank you jump from is the nearest spot
// of all, and nobody sits between it and the camera (Day 246: Lumi did, and hid you).
const SPOT = {
  Nyx: [-3.6, -2.6, 'bank'], Rowan: [-2.5, -1.25, 'wade'], Juniper: [-1.0, -2.55, 'rock'], Moss: [-0.5, 0.5, 'soak'],
  Thistle: [0.6, -2.5, 'bank'], Comet: [1.5, 0.2, 'swim'], Lumi: [2.4, -2.3, 'bank'], Clover: [2.9, -0.7, 'tube'],
  Biscuit: [4.3, 0.3, 'paddle'],
};
export const JUMP_AT = [6.2, -2.35];          // the spot on the bank you jump in from: [z, x from the centre line]
export const SWIM_Z = [-3.2, 7.4];            // how far up and down the stream you can swim
export const spotOf = name => { const [z, dx] = SPOT[name]; return [streamX(z) + dx, z]; };
const SUNK = 0.42;                             // how deep a swimmer sits: the stream is shallow, so swimmers sit low in it

// splashes: a burst of droplets and a ring on the water, from a small pool
function splashes(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(235,248,255,.8)'); gr.addColorStop(1, 'rgba(235,248,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c), N = 48;
  const bursts = Array.from({ length: 4 }, () => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, size: 0.13, transparent: true, opacity: 0, depthWrite: false, color: 0xeaf6ff }));
    pts.frustumCulled = false; pts.visible = false; scene.add(pts);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 36), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 2; scene.add(ring);
    return { pts, ring, vel: new Float32Array(N * 3), t: 9, size: 1 };
  });
  let next = 0;
  return {
    at(x, z, size = 1) {
      const b = bursts[next++ % bursts.length], p = b.pts.geometry.attributes.position.array, y = waterY(z);
      for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, out = (0.4 + Math.random() * 1.1) * size, up = (1.6 + Math.random() * 2.4) * Math.sqrt(size);
        p[i * 3] = x + Math.cos(a) * 0.1; p[i * 3 + 1] = y; p[i * 3 + 2] = z + Math.sin(a) * 0.1;
        b.vel[i * 3] = Math.cos(a) * out; b.vel[i * 3 + 1] = up; b.vel[i * 3 + 2] = Math.sin(a) * out; }
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.size = 0.2 + 0.09 * size;
      b.ring.position.set(x, y + 0.012, z); b.t = 0; b.size = size; b.pts.visible = b.ring.visible = true;
    },
    update(dt) {
      for (const b of bursts) { if (b.t > 1.6) { b.pts.visible = b.ring.visible = false; continue; }
        b.t += dt; const p = b.pts.geometry.attributes.position.array, floor = b.ring.position.y;
        for (let i = 0; i < N; i++) { b.vel[i * 3 + 1] -= 9.8 * dt;
          p[i * 3] += b.vel[i * 3] * dt; p[i * 3 + 1] = Math.max(floor - 0.05, p[i * 3 + 1] + b.vel[i * 3 + 1] * dt); p[i * 3 + 2] += b.vel[i * 3 + 2] * dt; }
        b.pts.geometry.attributes.position.needsUpdate = true;
        b.pts.material.opacity = Math.max(0, 1 - b.t / 0.95);
        const k = Math.min(1, b.t / 1.6); b.ring.scale.setScalar((0.1 + k * 1.1) * b.size); b.ring.material.opacity = 0.6 * (1 - k); }
    },
  };
}

function innerTube() {
  const g = new THREE.Group(), m = mat(0xf5a9b8, { roughness: 0.35 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.14, 12, 28), m); ring.rotation.x = Math.PI / 2; g.add(ring);
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.143, 6, 5, 0.32), mat(0xffffff, { roughness: 0.35 }));
    s.rotation.set(Math.PI / 2, 0, i * Math.PI / 2); g.add(s); }                                    // white stripes, a classic tube
  return g;
}
function orange() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), mat(0xff9b2f, { roughness: 0.55 })));
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 5), mat(0x4f8a3a)); leaf.scale.set(1, 0.3, 0.5); leaf.position.set(0.03, 0.085, 0); leaf.rotation.z = -0.5; g.add(leaf);
  return g;
}
function rock() {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), mat(0x8d8a85, { roughness: 0.95, flatShading: true }));
  r.scale.set(1.25, 0.62, 1); r.castShadow = r.receiveShadow = true; return r;
}

export function buildSwim(scene) {
  const fx = splashes(scene), tube = innerTube(), fruit = orange(), seat = rock();
  tube.visible = fruit.visible = seat.visible = false; scene.add(tube, seat);
  let on = false, campers = [], t = 0;
  const swimmers = new Map();       // camper → what they do here
  // where someone ends up, height included: on the rock, on the bank, ankle-deep at the edge, or low in the water
  const landY = name => { const [z, dx, what] = SPOT[name], ground = heightAt(streamX(z) + dx, z);
    return what === 'rock' ? ground + 0.36 : what === 'bank' || what === 'wade' ? ground + 0.04 : waterY(z) - SUNK + (what === 'tube' ? 0.2 : 0); };
  return {
    landY,
    splash: (x, z, size) => fx.at(x, z, size),
    get on() { return on; },
    // everyone arrives: put them in their spots (main.js walks them to the bank first)
    settle(c) {
      const name = c.userData.cast.name, [z, dx, what] = SPOT[name], x = streamX(z) + dx;
      swimmers.set(c, what); c.userData.walking = false; c.userData.path = [];
      const ground = heightAt(x, z);
      // on the bank (or the rock, or wading in) facing the water, to the east; in the water, facing back toward the camera
      c.position.set(x, ground, z); c.rotation.y = ['bank', 'rock', 'wade'].includes(what) ? Math.PI / 2 : -0.6;
      const sit = ['bank', 'rock', 'soak', 'tube'].includes(what) ? 1 : 0; c.setSit?.(sit); if (c.userData.st) c.userData.st.sit = sit;
      c.userData.seatLift = landY(name) - ground;
      const gtr = c.getObjectByName('guitar'); if (gtr) gtr.visible = !['soak', 'tube', 'paddle', 'swim'].includes(what);   // left on the bank
      if (name === 'Moss') { const top = new THREE.Box3().setFromObject(c.head).max.y, mid = c.head.getWorldPosition(new THREE.Vector3());
        fruit.position.copy(c.head.worldToLocal(new THREE.Vector3(mid.x, top + 0.07, mid.z))); c.head.add(fruit); fruit.visible = true; }
    },
    // the rock and the tube are there before anyone gets down to the water
    start(list) { on = true; campers = list;
      { const [z, dx] = SPOT.Juniper, x = streamX(z) + dx; seat.position.set(x, heightAt(x, z) + 0.12, z); seat.visible = true; }
      { const [z, dx] = SPOT.Clover, x = streamX(z) + dx; tube.position.set(x, waterY(z) + 0.02, z); tube.visible = true; } },
    stop() { on = false; for (const c of swimmers.keys()) { const gtr = c.getObjectByName('guitar'); if (gtr) gtr.visible = true; } swimmers.clear(); tube.visible = seat.visible = fruit.visible = false; fruit.parent?.remove(fruit); },
    // where a swimmer's feet go, and how they bob
    swimY: (z, bob = 0) => waterY(z) - SUNK + bob,
    update(dt) {
      t += dt; fx.update(dt);
      if (!on) return;
      if (tube.visible && !swimmers.has(campers.find(c => c.userData.cast.name === 'Clover'))) tube.position.y = waterY(tube.position.z) + 0.02 + Math.sin(t * 1.4) * 0.03;
      for (const [c, what] of swimmers) {
        if (what === 'paddle') {                                      // Biscuit, round and round, happily
          const [z0, dx0] = SPOT.Biscuit, a = t * 0.9, r = 0.55, cx = streamX(z0) + dx0;
          c.position.x = cx + Math.cos(a) * r; c.position.z = z0 + Math.sin(a) * r;
          c.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
          c.position.y = waterY(c.position.z) - SUNK + Math.sin(t * 5) * 0.025;
        } else if (what === 'tube') {                                 // Clover, drifting a little in the tube
          const [z0, dx0] = SPOT.Clover, x = streamX(z0) + dx0 + Math.sin(t * 0.35) * 0.18, z = z0 + Math.sin(t * 0.23) * 0.12;
          c.position.x = x; c.position.z = z; c.position.y = waterY(z) - SUNK + 0.2 + Math.sin(t * 1.4) * 0.03; c.rotation.y = -Math.PI / 2 + Math.sin(t * 0.3) * 0.5;
          tube.position.set(x, waterY(z) + 0.02 + Math.sin(t * 1.4) * 0.03, z); tube.rotation.y = t * 0.2;
        } else if (what === 'soak' || what === 'swim') {
          c.position.y = waterY(c.position.z) - SUNK + Math.sin(t * 1.3 + c.id) * 0.02;
        }
      }
    },
  };
}
