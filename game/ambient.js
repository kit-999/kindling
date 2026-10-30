// Life between the talks (Jerika, Day 245: "making some cute visual things, more ambient movement/actions"). Once a
// camper has pitched their tent and settled at their spot, they get on with their evening until you walk right up:
// Biscuit plays the guitar, Nyx turns over tarot cards, Comet throws a frisbee and catches it, Thistle sketches the
// string lights, Clover works through the snacks, Juniper whittles marshmallow sticks and keeps an eye on the
// first-timers, Rowan keeps glancing down at his new name tag, Moss sleeps in the hammock and Lumi hops about.
// At dusk the fireflies come out; at the circle, s'mores; after dark, now and then, a shooting star.
// Everything here poses on top of what each critter's own update already did this frame, so it runs after them.
import * as THREE from 'three';
import { withFill } from './plush.js';
import { heightAt } from './world.js';

const V3 = THREE.Vector3;
const mat = (color, o = {}) => withFill(new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));
const sstep = (e0, e1, x) => THREE.MathUtils.smoothstep(x, e0, e1);
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const CAMP = new V3(0, 0.9, -1);                 // what Thistle's drawing: everyone ("maybe draw all of you, if that's okay")

// ---- little things that drift and fade: music notes, z's, sparkles, crumbs, wood shavings ----
function glyphTex(ch, colour, px = 64) {
  const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d');
  g.font = `700 ${Math.round(px * 0.74)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(40, 24, 16, 0.55)'; g.shadowBlur = px * 0.08; g.fillStyle = colour; g.fillText(ch, px / 2, px * 0.54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dotTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, inner); gr.addColorStop(0.45, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function floaters(scene, tex, n, { additive = false, gravity = 0 } = {}) {
  const pool = Array.from({ length: n }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0,
      ...(additive ? { blending: THREE.AdditiveBlending } : {}) }));
    s.visible = false; s.renderOrder = 3; scene.add(s); return { s, life: 0, max: 1, v: new V3(), size: 0.1, ph: 0 };
  });
  let i = 0;
  return {
    spawn(p, v, life = 2.4, size = 0.14) { const f = pool[i++ % n];
      f.s.position.copy(p); f.v.copy(v); f.life = f.max = life; f.size = size; f.ph = Math.random() * 6.3; f.s.visible = true;
      f.s.material.rotation = rnd(0.35); },
    update(dt, t) {
      for (const f of pool) { if (f.life <= 0) continue;
        f.life -= dt; const k = 1 - f.life / f.max; f.v.y -= gravity * dt;
        f.s.position.addScaledVector(f.v, dt); f.s.position.x += Math.sin(t * 2.2 + f.ph) * dt * 0.08;
        f.s.material.opacity = Math.min(1, k * 6) * Math.min(1, f.life / (f.max * 0.45));
        f.s.scale.setScalar(f.size * (0.65 + 0.35 * Math.min(1, k * 3)));
        if (f.life <= 0) f.s.visible = false; }
    },
  };
}

// ---- props ----
function frisbee(scene) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.028, 28), mat(0xf5a9b8, { roughness: 0.45 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.146, 0.015, 8, 32), mat(0xffffff, { roughness: 0.4 })); rim.rotation.x = Math.PI / 2;
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), mat(0x5bcefa, { roughness: 0.45 }));
  [disc, rim, dot].forEach(m => { m.castShadow = true; g.add(m); });
  scene.add(g); return g;
}
function sketchbook() {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#fff6e2'; x.fillRect(0, 0, 128, 96); x.strokeStyle = '#6b5a4a'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(6, 30); x.quadraticCurveTo(64, 62, 122, 28); x.stroke();                  // the string of lights...
  ['#f5a9b8', '#5bcefa', '#ffffff', '#f5a9b8', '#5bcefa', '#ffffff', '#f5a9b8'].forEach((col, i) => {   // ...pink, blue, white
    const u = (i + 0.5) / 7, px = 6 + u * 116, py = 30 + Math.sin(u * Math.PI) * 15;
    x.fillStyle = col; x.beginPath(); x.arc(px, py + 7, 5, 0, 7); x.fill(); x.strokeStyle = '#6b5a4a'; x.lineWidth = 1; x.stroke(); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.125), mat(0x7a4f36, { roughness: 0.9 }));
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.155, 0.112), mat(0xffffff, { map: tex, roughness: 0.95 }));
  page.rotation.x = -Math.PI / 2; page.position.y = 0.0065; g.add(cover, page); return g;
}
function cookie() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 18), mat(0xd8a35c, { roughness: 0.95 })));
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.4, m = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), mat(0x4a2c1c));
    m.position.set(Math.cos(a) * 0.018, 0.006, Math.sin(a) * 0.018); g.add(m); }
  return g;
}
function stick(len = 0.4, r0 = 0.006, r1 = 0.01) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 6), mat(0xa88458, { roughness: 0.95 }));
  m.castShadow = true; return m;
}

// ---- who does what. Each gets h.k: 0 while busy (walking, talking, at the circle, or you're right there), easing to 1
// once they're free; and may set h.gaze (where to look; null = straight ahead) or h.speed (Lumi's hops). ----
function hobbies(fx) {
  return {
    Biscuit(c, h, dt, t) {                                 // the guitar comes round from his back, and he plays
      const g = h.guitar ??= c.getObjectByName('guitar'); if (!g) return;
      if (!h.back) { h.back = { p: g.position.clone(), q: g.quaternion.clone() };
        h.front = { p: new V3(-0.11, 0.35, c.rig.chest.z + 0.06), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, Math.PI, 1.22)) }; }
      const k = sstep(0, 1, h.k);
      g.position.lerpVectors(h.back.p, h.front.p, k); g.position.x += Math.sin(Math.PI * k) * 0.32;      // round his side, not through him
      g.quaternion.slerpQuaternions(h.back.q, h.front.q, k);
      const [R, L] = c.rig.arms, strum = Math.sin(t * 11) * 0.13 * (0.7 + 0.3 * Math.sin(t * 1.3));
      R.rotation.x += (-0.5 + strum) * k; R.rotation.z += 0.34 * k;
      L.rotation.x += -0.9 * k; L.rotation.z += 0.32 * k;
      if (k > 0.85 && t > (h.next ?? 0)) { h.next = t + 0.55 + Math.random() * 0.45;
        fx.notes.spawn(c.localToWorld(new V3(rnd(0.16), 1.05, 0.12)), new V3(rnd(0.06), 0.3, 0), 2.6, 0.13 + Math.random() * 0.05); }
      h.gaze = undefined;
    },
    Nyx(c, h, dt, t) {                                     // turns over a card, has a look, a little star
      const card = h.card ??= c.getObjectByName('tarot'); const L = c.rig.arms[1];
      h.e = (h.e ?? Math.random() * 3) + dt * (h.k > 0.9 ? 1 : 0); const T = 6, e = h.e % T;
      if (h.lastE !== undefined && e < h.lastE) h.flips = (h.flips ?? 0) + 1; h.lastE = e;
      const up = sstep(0, 0.5, e) * (1 - sstep(2.8, 3.4, e)) * h.k;
      L.rotation.x += -1.25 * up; L.rotation.z += -0.3 * up;
      if (card) { h.ry ??= card.rotation.y; card.rotation.y = h.ry + Math.PI * ((h.flips ?? 0) + sstep(1.0, 1.5, e)); }
      if (card && e > 1.45 && !h.sparked && up > 0.9) { h.sparked = true;
        fx.sparkles.spawn(card.getWorldPosition(new V3()).add(new V3(0, 0.09, 0)), new V3(0, 0.12, 0), 1.3, 0.12); }
      if (e < 1) h.sparked = false;
      h.gaze = up > 0.6 && card ? card.getWorldPosition(new V3()) : undefined;
    },
    Comet(c, h, dt, t) {                                   // a frisbee, thrown in a loop that comes back to the paw
      const d = h.disc ??= fx.frisbee(); d.visible = c.visible;
      const R = c.rig.arms[0], hop = c.rig.hop;
      const paw = () => R.localToWorld(c.rig.paw.clone().add(new V3(0, -0.02, 0.05)));
      h.phase ??= 'hold'; h.t = (h.t ?? -Math.random() * 2) + dt; hop.rotation.y = 0;
      if (h.phase === 'hold') {
        d.position.copy(paw()); d.rotation.set(0.35, c.rotation.y, 0);
        h.gaze = undefined;
        if (h.k > 0.95 && h.t > 3.2) { h.phase = 'wind'; h.t = 0; }
      } else if (h.phase === 'wind') {
        const w = sstep(0, 0.55, h.t); R.rotation.x += 0.75 * w; R.rotation.z += -0.35 * w; hop.rotation.y = -0.4 * w;
        d.position.copy(paw()); d.rotation.set(0.35, c.rotation.y, 0);
        if (h.t > 0.55) { h.phase = 'fly'; h.t = 0; h.S = d.position.clone();
          h.f = new V3(Math.sin(c.rotation.y), 0, Math.cos(c.rotation.y)); h.r = new V3(h.f.z, 0, -h.f.x); }
      } else {
        const u = Math.min(1, h.t / 2.5), s = Math.sin(Math.PI * u);
        R.rotation.x += -1.15 * Math.max(0, 1 - h.t * 2.2);                                   // follow-through
        d.position.copy(h.S).addScaledVector(h.f, 2.5 * s).addScaledVector(h.r, 0.95 * Math.sin(2 * Math.PI * u));
        d.position.y += 0.55 * s; if (u > 0.75) d.position.lerp(paw(), sstep(0.75, 1, u));
        d.rotation.set(0.25 + 0.15 * Math.sin(2 * Math.PI * u), h.t * 24, 0);
        h.gaze = d.position.clone();
        if (u >= 1) { h.phase = 'hold'; h.t = 0; c.emote('happy'); }
      }
    },
    Thistle(c, h, dt, t) {                                 // sketching everyone: look up, draw, look up
      const book = h.book ??= (() => { const b = sketchbook(); b.position.set(0, 0.36, c.rig.chest.z + 0.2); b.rotation.x = -0.55; b.scale.setScalar(1.25); c.rig.hop.add(b); return b; })();
      const k = sstep(0, 1, h.k); book.scale.setScalar(Math.max(0.001, k * 1.25)); book.visible = k > 0.01;
      h.e = (h.e ?? Math.random() * 4) + dt; const e = h.e % 6.5, down = sstep(3.5, 3.9, e) * (1 - sstep(6.1, 6.5, e));
      const [R, L] = c.rig.arms;
      L.rotation.x += -0.85 * k; L.rotation.z += -0.18 * k;
      R.rotation.x += (-0.8 + Math.sin(t * 13) * 0.06 * down) * k; R.rotation.z += 0.3 * k;
      h.gaze = h.k < 0.5 ? undefined : down > 0.5 ? book.getWorldPosition(new V3()) : CAMP;
    },
    Clover(c, h, dt, t, ctx) {                                  // a cookie from the bottomless backpack, three bites at a time
      const R = c.rig.arms[0];
      const ck = h.cookie ??= (() => { const m = cookie(); m.position.copy(c.rig.paw).add(new V3(0, -0.01, 0.045)); m.rotation.x = 1.2; R.add(m); return m; })();
      ck.visible = h.k > 0.05;
      h.e = (h.e ?? Math.random() * 3) + dt * (h.k > 0.9 ? 1 : 0); const e = h.e % 4.6;
      const up = sstep(0, 0.35, e) * (1 - sstep(0.8, 1.15, e)) * h.k;
      R.rotation.x += -2.2 * up; R.rotation.z += 0.6 * up;
      if (e > 0.62 && !h.bit && up > 0.8) { h.bit = true; h.bites = ((h.bites ?? 0) + 1) % 4;
        ck.scale.setScalar(h.bites ? 1 - h.bites * 0.27 : 1);
        const at = ck.getWorldPosition(new V3());
        for (let i = 0; i < 3; i++) fx.crumbs.spawn(at.clone().add(new V3(rnd(0.03), -0.02, rnd(0.03))), new V3(rnd(0.15), 0.25, rnd(0.15)), 0.9, 0.05); }
      if (e < 0.5) h.bit = false;
      // chewing moves the mouth; once you're talking to her the dialogue owns the mouth, so stop touching it
      const chew = h.k > 0.5 && e > 0.8 && e < 2.0;
      if (ctx.talking === c || ctx.finale) h.chew = false; else if (chew !== !!h.chew) { h.chew = chew; c.setTalking(chew); }
      h.gaze = undefined;
    },
    Juniper(c, h, dt, t, ctx) {                            // whittling marshmallow sticks; a glance at the first-timers
      const L = c.rig.arms[1], R = c.rig.arms[0];
      const st = h.stick ??= (() => { const m = stick(0.42); m.position.copy(c.rig.paw).add(new V3(-0.02, 0.06, 0.12)); m.rotation.set(1.1, 0, 0.5); L.add(m); return m; })();
      const k = sstep(0, 1, h.k); st.visible = k > 0.02; st.scale.setScalar(Math.max(0.001, k));
      h.e = (h.e ?? Math.random() * 4) + dt; const e = h.e % 9;
      const look = sstep(6.0, 6.4, e) * (1 - sstep(8.3, 8.7, e)), work = k * (1 - look);
      L.rotation.x += -0.95 * k; L.rotation.z += -0.25 * k;
      const stroke = e < 5 ? Math.max(0, Math.sin(t * 7)) : 0;
      R.rotation.x += (-0.7 - 0.22 * stroke) * work; R.rotation.z += 0.32 * work;
      if (work > 0.8 && stroke > 0.97 && t > (h.next ?? 0)) { h.next = t + 0.5;
        fx.shavings.spawn(st.localToWorld(new V3(0, 0.12, 0)), new V3(rnd(0.1), 0.05, rnd(0.1)), 1.1, 0.045); }
      const lumi = ctx.byName.Lumi;
      h.gaze = h.k < 0.5 ? undefined : look > 0.5 && lumi.visible ? lumi.position.clone().add(new V3(0, 0.8, 0)) : st.localToWorld(new V3(0, 0.1, 0));
    },
    Rowan(c, h, dt, t, ctx) {                              // the new name tag: a look down at it, and a happy little hop
      h.e = (h.e ?? Math.random() * 3) + dt * (h.k > 0.9 ? 1 : 0);
      if (ctx.flags.rowanTag) { const e = h.e % 7;
        h.gaze = h.k > 0.5 && e > 3.4 && e < 5.0 ? c.localToWorld(new V3(0.05, 0.38, 0.45)) : undefined;
        if (e > 5.0 && !h.done) { h.done = true; c.emote('happy'); }
        if (e < 1) h.done = false;
      } else { const e = h.e % 10;                         // before anyone's asked his name: shy, waiting
        if (e > 8 && !h.done) { h.done = true; c.emote('shy'); } if (e < 1) h.done = false; h.gaze = undefined; }
    },
    Moss(c, h, dt, t) {                                    // asleep in the hammock: eyes shut, ears down, z's
      const asleep = h.k > 0.6; if (asleep !== !!h.asleep) { h.asleep = asleep; c.setSleep?.(asleep); }
      if (asleep && t > (h.next ?? 0)) { h.next = t + 1.4 + Math.random() * 0.6;
        fx.zs.spawn(c.localToWorld(new V3(0.1, 1.0, 0.12)), new V3(0.1, 0.2, 0), 2.8, 0.11 + Math.random() * 0.04); }
      h.gaze = asleep ? null : undefined;
    },
    Lumi(c, h, dt, t) {                                    // little hops about, turning to look round her new home
      h.home ??= c.rotation.y;
      h.e = (h.e ?? Math.random() * 2) + dt; const e = h.e % 3.4;
      if (h.lastE !== undefined && e < h.lastE && h.k > 0.9) h.aim = h.home + rnd(0.9); h.lastE = e;
      h.speed = h.k > 0.9 && e < 1.2 ? 0.6 : 0;
      if (h.k > 0.9 && h.aim !== undefined) { let dy = h.aim - c.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.rotation.y += dy * Math.min(1, dt * 2.2); }
      if (h.k < 0.1) h.home = c.rotation.y;
      h.gaze = undefined;
    },
  };
}

// ---- fireflies over the meadow from dusk ----
function fireflies(scene, n) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), F = [];
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = 2.5 + Math.sqrt(Math.random()) * 12;
    F.push({ x: Math.cos(a) * r, z: Math.sin(a) * r + 1, y: 0.35 + Math.random() * 1.5, ph: Math.random() * 6.3, sp: 0.6 + Math.random() * 0.8, bl: 0.8 + Math.random() * 1.6 }); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 0.2, map: dotTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.visible = false; scene.add(pts);
  // the first one is friendly: stand still a few seconds after dark and it comes down to sit on your head, glowing,
  // and goes back to the meadow when you walk on (Day 248, a surprise for the debut). Nothing else reads it.
  const land = { k: 0, still: 0, last: null };
  return (dt, t, tod, camera, ctx) => {
    m.opacity = sstep(0.5, 0.68, tod); pts.visible = m.opacity > 0.01; if (!pts.visible) return;
    for (let i = 0; i < n; i++) { const f = F[i];
      const x = f.x + Math.sin(t * 0.21 * f.sp + f.ph) * 1.3, z = f.z + Math.cos(t * 0.17 * f.sp + f.ph * 1.3) * 1.3;
      pos[i * 3] = x; pos[i * 3 + 1] = heightAt(x, z) + f.y + Math.sin(t * 0.8 * f.sp + f.ph) * 0.22; pos[i * 3 + 2] = z;
      // one right by the lens would fill the screen as a green blob, so they fade out within a few metres of the camera
      const near = camera ? sstep(1.5, 4.0, Math.hypot(x - camera.position.x, pos[i * 3 + 1] - camera.position.y, z - camera.position.z)) : 1;
      const b = (0.08 + Math.pow(Math.max(0, Math.sin(t * f.bl + f.ph)), 6) * 2.2) * near;
      col[i * 3] = 0.85 * b; col[i * 3 + 1] = 1.0 * b; col[i * 3 + 2] = 0.42 * b; }
    const pl = ctx?.player;
    if (pl) {
      const moved = land.last ? Math.hypot(pl.position.x - land.last.x, pl.position.z - land.last.z) : 0;
      land.last = { x: pl.position.x, z: pl.position.z };
      land.still = moved < 0.004 && !ctx.talking && !ctx.finale && m.opacity > 0.6 ? land.still + dt : 0;
      land.k = THREE.MathUtils.clamp(land.k + (land.still > 4 ? dt * 0.35 : -dt * 1.2), 0, 1);
      if (land.k > 0) { const e = land.k * land.k * (3 - 2 * land.k), hx = pl.position.x + Math.sin(t * 1.3) * 0.05,
          hy = pl.position.y + 1.02 + Math.sin(t * 2.2) * 0.03, hz = pl.position.z + Math.cos(t * 1.1) * 0.05;
        pos[0] += (hx - pos[0]) * e; pos[1] += (hy - pos[1]) * e; pos[2] += (hz - pos[2]) * e;
        const glow = 0.9 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.2)); /* above the bloom threshold (0.85): a soft halo */ col[0] += (0.85 * glow - col[0]) * e; col[1] += (glow - col[1]) * e; col[2] += (0.42 * glow - col[2]) * e; }
    }
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
  };
}

// ---- shooting stars: a thin streak across the high sky, now and then after dark; one on cue for the last shot ----
function shootingStars(scene) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.85, 'rgba(230,240,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 16);
  const v = x.createLinearGradient(0, 0, 0, 16); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = v; x.fillRect(0, 0, 128, 16);
  const tex = new THREE.CanvasTexture(c);
  const geo = new THREE.BufferGeometry(); const P = new Float32Array(12);
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 0 });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 1; scene.add(mesh);
  const dirOf = (az, el) => new V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  let s = null, nextAt = 0;
  const api = {
    fire(az0, el0, az1, el1, dur = 1.0) { s = { t: 0, dur, a: dirOf(az0, el0), b: dirOf(az1, el1) }; },
    update(dt, t, tod, camera) {
      if (!s && tod > 0.84 && t > nextAt) { if (nextAt > 0) { const az = rnd(2.6), el = 0.5 + Math.random() * 0.45, dz = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.3);
          api.fire(az, el, az + dz, el - 0.18 - Math.random() * 0.12, 0.8 + Math.random() * 0.5); }
        nextAt = t + 16 + Math.random() * 22; }
      if (!s) { mesh.visible = false; return; }
      s.t += dt; const u = s.t / s.dur; if (u > 1.3) { s = null; mesh.visible = false; return; }
      const R = 300, at = w => s.a.clone().lerp(s.b, THREE.MathUtils.clamp(w, 0, 1)).normalize().multiplyScalar(R).add(camera.position);
      const head = at(u), tail = at(u - 0.45), dir = head.clone().sub(tail), view = head.clone().sub(camera.position).normalize();
      const side = new V3().crossVectors(dir, view).normalize().multiplyScalar(0.8);
      [tail.clone().sub(side), tail.clone().add(side), head.clone().add(side), head.clone().sub(side)].forEach((p, i) => p.toArray(P, i * 3));
      geo.attributes.position.needsUpdate = true; geo.computeBoundingSphere();
      m.opacity = (u < 1 ? Math.min(1, u * 6) : 1 - (u - 1) / 0.3) * sstep(0.6, 0.9, tod); mesh.visible = true;
    },
  };
  return api;
}

// ---- s'mores at the circle: a stick each, held out to the fire; the marshmallows go golden (Comet's catches fire,
// obviously; Clover's never makes it past warm) ----
function smores(scene) {
  const on = new Map();   // critter → { stick, mallow, t }
  const golden = new THREE.Color(0xe0a050), white = new THREE.Color(0xfff8ee), char = new THREE.Color(0x2e211a);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex('rgba(255,200,90,1)', 'rgba(255,90,20,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  flame.visible = false; flame.scale.setScalar(0.16); scene.add(flame);
  const Y = new V3(0, 1, 0), q = new THREE.Quaternion();
  return {
    stop() { for (const o of on.values()) { o.stick.removeFromParent(); o.mallow.removeFromParent(); } on.clear(); flame.visible = false; },
    start(list) { for (const c of list) { if (on.has(c)) continue;
      const s = stick(1, 0.012, 0.017); s.visible = false; scene.add(s);
      const mm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.085, 14), withFill(new THREE.MeshStandardMaterial({ color: white.clone(), roughness: 0.9 })));
      mm.castShadow = true; mm.visible = false; scene.add(mm); on.set(c, { stick: s, mallow: mm, t: -Math.random() * 0.8, eaten: false }); } },
    update(dt, t, fx) {
      for (const [c, o] of on) {
        const seated = c.userData.st?.sit > 0.5 && c.visible;
        o.stick.visible = o.mallow.visible = seated; if (!seated) continue;
        o.t += dt;
        const arm = c.rig.arms[1]; arm.rotation.x += -1.15; arm.rotation.z += -0.1;
        const P = arm.localToWorld(new V3(0, -0.2, 0.07)), toFire = new V3(-P.x, 0, -P.z).normalize();
        const T = P.clone().addScaledVector(toFire, 1.05); T.y = heightAt(T.x, T.z) + 0.62 + Math.sin(t * 1.3 + c.id) * 0.02;
        const d = T.clone().sub(P), len = d.length();
        o.stick.position.copy(P).addScaledVector(d, 0.5); o.stick.quaternion.copy(q.setFromUnitVectors(Y, d.clone().normalize())); o.stick.scale.set(1, len, 1);
        o.mallow.position.copy(T); o.mallow.quaternion.copy(o.stick.quaternion);
        const name = c.userData.cast?.name, k = THREE.MathUtils.clamp(o.t / (name === 'Moss' ? 7 : 4.5), 0, 1);
        o.mallow.material.color.copy(white).lerp(golden, k);
        if (name === 'Comet') { const burn = sstep(3.2, 3.6, o.t) * (1 - sstep(5.0, 5.4, o.t));
          if (o.t > 3.6) o.mallow.material.color.copy(golden).lerp(char, sstep(3.6, 5.2, o.t));
          flame.visible = burn > 0.05; flame.position.copy(T).add(new V3(0, 0.07, 0)); flame.scale.setScalar(0.12 + 0.05 * Math.sin(t * 23) + 0.1 * burn);
          if (o.t > 5.4 && !o.cheered) { o.cheered = true; c.emote('happy'); } }
        if (name === 'Clover' && o.t > 2.4 && !o.eaten) { o.eaten = true; c.setTalking(true); setTimeout(() => c.setTalking(false), 1100);
          for (let i = 0; i < 3; i++) fx.crumbs.spawn(T.clone(), new V3(rnd(0.15), 0.2, rnd(0.15)), 0.8, 0.045); }
        if (o.eaten) o.mallow.visible = false;
      }
    },
  };
}

export function buildAmbient(scene, { high = false } = {}) {
  const fx = {
    notes: floaters(scene, glyphTex('♪', '#fff1c9'), 16),
    sparkles: floaters(scene, glyphTex('✦', '#ffe7a3'), 28, { additive: true }),
    hearts: floaters(scene, glyphTex('♥', '#f7a8c4'), 14),
    zs: floaters(scene, glyphTex('z', '#e8eeff'), 6),
    crumbs: floaters(scene, dotTex('rgba(150,100,55,1)', 'rgba(150,100,55,0)'), 9, { gravity: 1.6 }),
    shavings: floaters(scene, dotTex('rgba(235,215,170,1)', 'rgba(235,215,170,0)'), 6, { gravity: 0.9 }),
    frisbee: () => frisbee(scene),
  };
  const DO = hobbies(fx), H = new Map(), soon = [];        // soon: [{ at, fn }] for hearts and the like
  const flies = fireflies(scene, high ? 90 : 46), stars = shootingStars(scene), toast = smores(scene);
  const FREE = new Set(['settled', 'friends', 'morning', 'morning-done']);
  let clock = 0;
  return {
    // after the critters' own updates: free campers get on with their evening
    update(dt, t, tod, ctx) {
      for (const c of ctx.campers) { const name = c.userData.cast.name, fn = DO[name]; if (!fn) continue;
        const h = H.get(c) ?? (H.set(c, { k: 0 }), H.get(c));
        const free = h.force || (c.visible && FREE.has(c.userData.state) && !c.userData.walking && ctx.talking !== c && !ctx.finale
          && c.position.distanceTo(ctx.player.position) > 2.6);
        h.k += ((free ? 1 : 0) - h.k) * Math.min(1, dt * 2.5);
        fn(c, h, dt, t, ctx);
      }
      for (let i = soon.length - 1; i >= 0; i--) if (t >= soon[i].at) { soon[i].fn(); soon.splice(i, 1); }
      toast.update(dt, t, fx);
      clock = t;
      for (const k of ['notes', 'sparkles', 'hearts', 'zs', 'crumbs', 'shavings']) fx[k].update(dt, t);
      flies(dt, t, tod, ctx.camera, ctx); stars.update(dt, t, tod, ctx.camera);
    },
    // where a camper busy with something wants to look (undefined: no opinion, the game decides)
    gaze(c) { const h = H.get(c); return h && h.k > 0.5 ? h.gaze : undefined; },
    speed(c) { return H.get(c)?.speed || 0; },
    busy(c) { return H.get(c)?.k || 0; },
    smores: list => toast.start(list),
    smoresDone: () => toast.stop(),
    // the finale can ask someone to get on with their thing anyway (Biscuit's song, if you asked for it)
    play(c, on = true) { const h = H.get(c) ?? (H.set(c, { k: 0 }), H.get(c)); h.force = on; },
    hearts(a, b, n = 3) { for (let i = 0; i < n; i++) soon.push({ at: clock + 0.6 + i * 1.3, fn: () => {
      const p = a.position.clone().lerp(b.position, 0.5).add(new V3(0, 1.0, 0));
      fx.hearts.spawn(p, new V3(0, 0.28, 0), 2.4, 0.15); } }); },
    shootingStar: () => stars.fire(-0.32, 0.4, 0.12, 0.24, 1.1),
    // the talent show's notes, hearts, sparkles and z's, from wherever it asks
    spawn(kind, p, v, life, size) { fx[kind]?.spawn(p, v, life, size); },
  };
}
