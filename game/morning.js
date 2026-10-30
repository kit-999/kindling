// Day two, morning. You sleep in your tent and the sun comes up on the other side of camp: breakfast on the cushions,
// Moss still asleep in the hammock, Lumi sunbathing, Comet at the stream with flat stones, and Juniper's board with the
// rest of the weekend on it (Jerika, Day 246: "trans camps are usually ~3 nights, so just waking up and leaving is too
// short"). This module holds the props, where everyone stands, and the stone skipping; main.js runs the scene.
import * as THREE from 'three';
import { heightAt, streamX, waterY } from './world.js';
import { withFill } from './plush.js';

const mat = (color, o = {}) => withFill(new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }));
const put = (o, x, z, dy = 0) => { o.position.set(x, heightAt(x, z) + dy, z); return o; };

export const BOARD_AT = [3.75, 1.35];
// this morning's spots: [x, z, look-at x, look-at z], a cushion from last night to sit on, or the stream bank
const AT = {
  Juniper: [2.85, 2.15, 1.0, 7.0], Rowan: [4.65, 2.25, 3.2, 7.0],
  Clover: { seat: 6 }, Nyx: { seat: 4 }, Biscuit: { seat: 2 },
  Thistle: [-3.6, -3.2, -12, -2.5], Lumi: [-6.6, 1.2, -14, 1.6],     // both facing the sunrise, in the east
  Comet: 'stream',
};

function boardTex() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 512; const g = c.getContext('2d');
  const hand = size => `${size}px "Marker Felt", "Comic Sans MS", ui-rounded, system-ui, sans-serif`;
  g.fillStyle = '#fbf3e1'; g.fillRect(0, 0, 768, 512);
  g.fillStyle = '#3a2a20'; g.textAlign = 'center'; g.font = hand(58); g.fillText('the weekend ✨', 384, 74);
  g.textAlign = 'left';
  const day = (title, colour, y, items) => {
    g.font = hand(34); g.fillStyle = colour; g.fillText(title, 48, y);
    g.font = hand(30); g.fillStyle = '#3a2a20'; items.forEach((l, i) => g.fillText('· ' + l, 70, y + 42 + i * 40));
  };
  day('day two', '#c25a7c', 140, ['swim at the stream', 'friendship bracelets', 'TALENT SHOW tonight 🎤']);
  day('day three', '#3a86b8', 330, ['hike to the lookout', "s'mores, round two", 'dancing under the lights']);
  g.save(); g.translate(500, 150); g.rotate(-0.08); g.font = hand(24); g.fillStyle = '#8a6a5a'; g.fillText('(comet: no charades)', 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function makeBoard() {
  const g = new THREE.Group(), wood = mat(0x7a5236), dark = mat(0x4a3424);
  for (const sx of [-0.78, 0.78]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 7), dark); p.position.set(sx, 0.85, -0.06); p.castShadow = true; g.add(p); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.15, 0.06), wood); back.position.set(0, 1.12, 0); back.castShadow = true; g.add(back);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.05), mat(0xffffff, { map: boardTex(), roughness: 0.95 }));
  paper.position.set(0, 1.12, 0.035); paper.rotation.z = 0.015; g.add(paper);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(0xe8434a, { roughness: 0.4 })); pin.position.set(0, 1.62, 0.05); g.add(pin);
  put(g, BOARD_AT[0], BOARD_AT[1]); g.rotation.y = -0.25;      // turned a little toward the camp
  return g;
}
function makePancakes() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.02, 24), mat(0xf4efe6, { roughness: 0.4 })));
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.13, 0.03, 20), mat(0xd9a05a, { roughness: 0.8 }));
    p.position.set(Math.sin(i * 2.3) * 0.008, 0.025 + i * 0.03, Math.cos(i * 1.7) * 0.008); p.castShadow = true; g.add(p); }
  const butter = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), mat(0xffe9a0)); butter.position.y = 0.21; g.add(butter);
  return g;
}

// ---- skipping stones: along the stream, a ripple at every touch, each hop shorter than the last ----
function stoneGame(scene) {
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(0x8a8d93, { roughness: 0.6 }));
  stone.scale.set(1.2, 0.35, 1); stone.castShadow = true; stone.visible = false; scene.add(stone);
  const rings = Array.from({ length: 10 }, () => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2; r.visible = false; r.renderOrder = 2; scene.add(r); return { r, t: 9 }; });
  let ri = 0, flight = null;
  const water = waterY;
  const ripple = (x, z, splash) => { const o = rings[ri++ % rings.length]; o.t = 0; o.r.position.set(x, water(z) + 0.012, z); o.r.visible = true; splash?.(); };
  return {
    // quality 0..1 sets the hops (a good throw gets 6 to 8); resolves with the count when the stone sinks
    throw(from, quality, splash) {
      const hops = Math.max(1, Math.min(9, Math.round(1 + quality * 6.5 + (Math.random() - 0.4) * 1.6)));
      return new Promise(res => { flight = { from: from.clone(), hops, hop: -1, t: 0, z: from.z, res, splash }; stone.visible = true; });
    },
    update(dt) {
      for (const o of rings) { if (o.t > 2) { o.r.visible = false; continue; }
        o.t += dt; const k = o.t / 2; o.r.scale.setScalar(0.08 + k * 0.6); o.r.material.opacity = 0.55 * (1 - k); }
      if (!flight) return;
      const f = flight; f.t += dt;
      if (f.hop < 0) {                                          // out of the hand, down to the water
        const u = Math.min(1, f.t / 0.35), z0 = f.from.z + 0.6, x1 = streamX(z0);
        stone.position.set(THREE.MathUtils.lerp(f.from.x, x1, u), THREE.MathUtils.lerp(f.from.y, water(z0), u) + Math.sin(Math.PI * u) * 0.25,
          THREE.MathUtils.lerp(f.from.z, z0, u));
        if (u >= 1) { f.hop = 0; f.t = 0; f.z = z0; ripple(x1, z0, f.splash); }
        return;
      }
      const len = 1.5 * Math.pow(0.8, f.hop), dur = 0.22 + len * 0.12, u = Math.min(1, f.t / dur), z = f.z + len * u;
      stone.position.set(streamX(z), water(z) + Math.sin(Math.PI * u) * len * 0.18, z); stone.rotation.y += dt * 20;
      if (u >= 1) { f.hop++; f.t = 0; f.z = z; ripple(streamX(z), z, f.splash);
        if (f.hop >= f.hops) { stone.visible = false; flight = null; f.res(f.hops); } }
    },
  };
}

export function buildMorning(scene) {
  const board = makeBoard(), cakes = makePancakes();
  board.visible = cakes.visible = false; scene.add(board, cakes);
  const stones = stoneGame(scene);
  return {
    board, stones,
    arrange({ campers, seats, player, playerTent }) {
      board.visible = true; put(cakes, 0.7, -2.15, 0.05); cakes.visible = true;
      for (const c of campers) {
        const name = c.userData.cast.name, a = AT[name];
        c.userData.state = 'morning'; c.userData.walking = false; c.userData.path = []; c.visible = true;
        c.setSit?.(0); if (c.userData.st) c.userData.st.sit = 0; c.userData.seatLift = 0;
        if (name === 'Moss') continue;                          // the hammock keeps Moss
        if (a && a.seat !== undefined) { const s = seats[a.seat];
          c.position.set(s.x, heightAt(s.x, s.z) + 0.11, s.z); c.rotation.y = Math.atan2(-s.x, -s.z);
          c.setSit?.(1); if (c.userData.st) c.userData.st.sit = 1; c.userData.seatLift = 0.11; continue; }
        if (a === 'stream') { const z = 0.6, x = streamX(z) - 1.85; c.position.set(x, heightAt(x, z), z); c.rotation.y = Math.PI / 2; continue; }
        c.position.set(a[0], heightAt(a[0], a[1]), a[1]); c.rotation.y = Math.atan2(a[2] - a[0], a[3] - a[1]);
      }
      const [tx, tz] = playerTent, d = Math.hypot(tx, tz), px = tx - tx / d * 1.4, pz = tz - tz / d * 1.4;   // at your tent door
      player.setSit?.(0); if (player.userData.st) player.userData.st.sit = 0;
      player.position.set(px, heightAt(px, pz), pz); player.rotation.y = Math.atan2(-px, -pz);
    },
    update(dt) { stones.update(dt); },
  };
}
