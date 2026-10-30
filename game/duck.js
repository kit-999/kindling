// A rubber duck, paddling up and down the quiet stretch of the stream south of the swimming hole. Nobody in camp
// mentions it. Come close and it turns to you, hops, and says something (Day 248: a small surprise for the debut).
// Its stretch keeps clear of the swim (z -3.2 to 7.4) and Comet's stones (z 0.6), just east of Moss's hammock.
import * as THREE from 'three';
import { streamX, waterY } from './world.js';

const Z0 = -10.2, Z1 = -6.8;        // up and down this stretch
const NEAR = 3.2;                   // how close you come before it notices you (the bank is about 2 m from the middle)
const LINES = ['quack!', 'quack?', '...quack.', 'QUACK!', 'quack quack'];

export function buildDuck(scene) {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd43b, roughness: 0.35 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff922b, roughness: 0.45 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.3 });
  const part = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; };
  part(new THREE.SphereGeometry(0.13, 18, 12), yellow, 0, 0.07, 0, 1, 0.72, 1.28);                    // body
  part(new THREE.ConeGeometry(0.05, 0.1, 10), yellow, 0, 0.12, -0.15).rotation.x = -0.9;             // tail, tipped up
  part(new THREE.SphereGeometry(0.085, 18, 12), yellow, 0, 0.19, 0.09);                              // head
  part(new THREE.SphereGeometry(0.045, 14, 8), orange, 0, 0.175, 0.17, 1, 0.42, 1.3);                 // beak
  for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.013, 8, 6), black, s * 0.038, 0.215, 0.155);   // eyes
  g.scale.setScalar(1.35);
  scene.add(g);                     // in the scene from load, so its materials compile behind the loading screen

  // its line, styled and kept on screen like the campers' barks
  const layer = document.createElement('div'); layer.className = 'barks'; document.body.appendChild(layer);
  const el = document.createElement('div'); el.className = 'bark'; layer.appendChild(el);

  let z = (Z0 + Z1) / 2, dir = 1, heading = 0, hop = 0, until = 0, next = 0, n = 0;
  const v = new THREE.Vector3();
  function update(dt, t, { player, camera, quiet, audio }) {
    const near = Math.hypot(player.position.x - g.position.x, player.position.z - g.position.z) < NEAR;
    if (!near) { z += dir * dt * 0.22; if (z > Z1) { z = Z1; dir = -1; } if (z < Z0) { z = Z0; dir = 1; } }   // paddles; stops for you
    const x = streamX(z) + 0.35 * Math.sin(t * 0.21);                                                     // drifting across the current
    hop = Math.max(0, hop - dt * 2.6);
    g.position.set(x, waterY(z) - 0.05 + Math.sin(t * 2.1) * 0.012 + Math.sin(Math.PI * hop) * 0.16, z);
    const want = near ? Math.atan2(player.position.x - x, player.position.z - z) : (dir > 0 ? 0 : Math.PI) + 0.25 * Math.sin(t * 0.21);
    let d = want - heading; d = Math.atan2(Math.sin(d), Math.cos(d)); heading += d * Math.min(1, dt * 3);
    g.rotation.set(0, heading, Math.sin(t * 1.7) * 0.06);                                                 // a little roll on the water
    if (near && !quiet && t > next) { hop = 1; next = t + 6; until = t + 2.2; el.textContent = LINES[n++ % LINES.length];
      el.classList.add('on'); audio?.quack?.(); }
    if (until && (t > until || quiet)) { until = 0; el.classList.remove('on'); }
    if (until) {
      v.copy(g.position); v.y += 0.55; v.project(camera);
      el.style.visibility = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1 ? 'hidden' : 'visible';
      const hw = (el.offsetWidth || 80) / 2 + 6, hh = (el.offsetHeight || 34) + 8;
      const px = Math.min(innerWidth - hw, Math.max(hw, (v.x * 0.5 + 0.5) * innerWidth)), py = Math.max(hh, (-v.y * 0.5 + 0.5) * innerHeight);
      el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
  return { group: g, update, get line() { return until ? el.textContent : ''; }, get said() { return n; } };
}
