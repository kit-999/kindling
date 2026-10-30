// What the organizer sets up before anyone arrives. Each item has a marker (a glowing ring and a floating icon) where
// you set it up, an action label, and a build() that makes it; place() pops it in. Things that light up (string
// lights, lanterns) register their glow so the evening can wake them.
import * as THREE from 'three';
import { heightAt } from './world.js';
import { makeTent, TENT_SPOT } from './tents.js';

const wood = new THREE.MeshStandardMaterial({ color: 0x9a6b44, roughness: 0.9, flatShading: true });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x5e3f28, roughness: 1, flatShading: true });
const fabric = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.4) });
const at = (o, x, z, dy = 0) => { o.position.set(x, heightAt(x, z) + dy, z); return o; };
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };

function stripes(colours, w = 256, h = 64, vertical = false) {           // a little canvas texture of coloured bands
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  colours.forEach((col, i) => { g.fillStyle = col; vertical ? g.fillRect(i * w / colours.length, 0, w / colours.length + 1, h)
                                                             : g.fillRect(0, i * h / colours.length, w, h / colours.length + 1); });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function textTex(lines, w = 512, h = 256, bg = '#8a5d3a', fg = '#fff6e6') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([txt, size], i) => { g.font = `700 ${size}px ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif`;
    g.fillText(txt, w / 2, h / (lines.length + 1) * (i + 1)); });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
// the trans flag, five stripes, with a line of writing across the white one
function flagTex(text, w = 512, h = 212) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  ['#5bcefa', '#f5a9b8', '#ffffff', '#f5a9b8', '#5bcefa'].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * h / 5, w, h / 5 + 1); });
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = '#5a4a6a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 40px ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif';
  g.fillText(text, w / 2, h / 2 + 2);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function iconSprite(glyph) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(255, 236, 200, .92)'; g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fill();
  g.font = '68px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(glyph, 64, 70);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthWrite: false, transparent: true })); s.scale.setScalar(0.62); return s;
}
// a hanging curve between two points, sagging in the middle
function sagCurve(a, b, sag, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -sag * 4 * u * (1 - u), 0))); }
  return new THREE.CatmullRomCurve3(pts);
}

// the nine cushions round the north side of the fire: where everyone sits for the welcome circle
export const SEATS = Array.from({ length: 9 }, (_, i) => { const a = -Math.PI * 0.95 + i * 0.32, r = 2.35 + (i % 2) * 0.35;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, a }; });

export function buildSetup(scene, world) {
  const glows = [], lamps = [], bulbs = [];   // emissive materials and point lights that wake at dusk; the string lights' bulbs
  // the string lights' lamps are in the scene from the start, dark until the lights are hung: a light that joins the
  // scene later makes every lit material rebuild its shader at once, a freeze of a second or more on a Windows PC
  // (Day 246, Jerika on her PC: "it kinda freezes up for a couple seconds and then goes")
  const LAMPS = [[0, -8.2], [-8.4, 2.6], [8.6, -3.5]].map(([x, z]) => { const L = new THREE.PointLight(0xffd6a0, 0, 11, 1.6);
    L.position.set(x, heightAt(x, z) + 2.3, z); scene.add(L); return L; });
  const A = Object.fromEntries(world.anchors.map(([x, z], i) => [i, new THREE.Vector3(x, heightAt(x, z), z)]));

  const ITEMS = [
    { id: 'lights', label: 'string lights', verb: 'hang the string lights', icon: '💡', at: [-3.2, -7.4], build() {
      const g = new THREE.Group(), cable = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 });
      const bulbCols = [0xfff1c8, 0xffd1dc, 0xbfe6ff], bulbMats = bulbCols.map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 }));
      glows.push(...bulbMats.map(m => ({ m, day: 0.15, night: 3.2 }))); bulbs.push(...bulbMats);
      const bulbG = new THREE.SphereGeometry(0.055, 8, 6);
      for (const [i, j] of [[0, 1], [1, 3], [0, 2], [2, 6], [3, 7], [6, 7]]) {
        const a = A[i].clone().add(new THREE.Vector3(0, 2.7, 0)), b = A[j].clone().add(new THREE.Vector3(0, 2.7, 0));
        const curve = sagCurve(a, b, 0.55 + a.distanceTo(b) * 0.03);
        g.add(mesh(new THREE.TubeGeometry(curve, 40, 0.012, 4), cable));
        const n = Math.floor(a.distanceTo(b) / 0.55);
        for (let k = 1; k < n; k++) { const p = curve.getPoint(k / n); g.add(mesh(bulbG, bulbMats[k % 3], p.x, p.y - 0.06, p.z)); }
      }
      lamps.push(...LAMPS);                                    // they were in the scene all along, dark (see LAMPS)
      return g; } },
    { id: 'hangout', label: 'rugs & cushions', verb: 'lay out the rugs and cushions', icon: '🛋️', at: [2.6, -3.6],
      blocks: [{ x: 3.21, z: 1.21, x2: 2.59, z2: 1.99, r: 0.32 }, { x: -2.75, z: 2.76, x2: -3.45, z2: 2.04, r: 0.32 }], build() {   // the two benches, end to end
      const g = new THREE.Group();
      const flag = stripes(['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA']), warm = stripes(['#e9a26b', '#f3cf8e', '#e9a26b', '#c97b52'], 256, 64, true);
      const rugs = [[flag, -1.1, -2.6, 0.4], [warm, 1.9, -1.9, -0.6], [stripes(['#b7a3d9', '#d6c8ee', '#b7a3d9']), -2.6, 0.2, 1.2]];
      for (const [tx, x, z, r] of rugs) { const rug = mesh(new THREE.BoxGeometry(2.0, 0.025, 1.3), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 }));
        at(rug, x, z, 0.02); rug.rotation.y = r; g.add(rug); }
      const pastel = [0xf5a9b8, 0x5bcefa, 0xffffff, 0xffd166, 0xb7a3d9, 0x9ad1a0, 0xf6b48a, 0xf5a9b8, 0x5bcefa];
      pastel.forEach((c, i) => { const { x, z, a } = SEATS[i];
        const cu = mesh(new THREE.SphereGeometry(1, 14, 10), fabric(c)); cu.scale.set(0.34, 0.13, 0.32);
        at(cu, x, z, 0.1); cu.rotation.y = a; g.add(cu); });
      for (const [x, z, r] of [[2.9, 1.6, 0.9], [-3.1, 2.4, -0.8]]) {      // two log benches on the south side
        const log = mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.7, 9), darkWood); log.rotation.set(0, r, Math.PI / 2); at(log, x, z, 0.2); g.add(log); }
      return g; } },
    { id: 'hammock', label: 'hammock', verb: 'hang the hammock', icon: '🌿', at: [10.6, -4.7], build() {
      const g = new THREE.Group(), a = A[4].clone().add(new THREE.Vector3(0, 1.45, 0)), b = A[5].clone().add(new THREE.Vector3(0, 1.45, 0));
      const curve = sagCurve(a, b, 0.75, 24), side = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3(0, 1, 0)).normalize();
      const pos = [], uv = [], idx = [], N = 24, M = 6;
      for (let i = 0; i <= N; i++) { const u = i / N, p = curve.getPoint(u), w = 0.42 * Math.sin(Math.PI * Math.min(1, Math.max(0.12, u * 1.1 - 0.05)));
        for (let j = 0; j <= M; j++) { const v = j / M - 0.5, cup = (1 - 4 * v * v) * 0.14 * Math.sin(Math.PI * u);
          pos.push(p.x + side.x * v * 2 * w, p.y - cup, p.z + side.z * v * 2 * w); uv.push(u, j / M); }
        if (i < N) for (let j = 0; j < M; j++) { const k = i * (M + 1) + j; idx.push(k, k + M + 1, k + 1, k + 1, k + M + 1, k + M + 2); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      const ham = mesh(geo, new THREE.MeshStandardMaterial({ map: stripes(['#F5A9B8', '#FFFFFF', '#5BCEFA', '#FFFFFF', '#F5A9B8']), side: THREE.DoubleSide, roughness: 1 }));
      g.add(ham);
      return g; } },
    { id: 'games', label: 'games crate', verb: 'set out the games', icon: '🎲', at: [6.2, -0.6], blocks: [{ x: 6.0, z: 0.2, r: 0.45 }], build() {
      const g = new THREE.Group(), crate = mesh(new THREE.BoxGeometry(0.75, 0.42, 0.52), wood); at(crate, 6.0, 0.2, 0.21); g.add(crate);
      [0x5bcefa, 0xf5a9b8, 0xffd166, 0x9ad1a0].forEach((c, i) => { const bx = mesh(new THREE.BoxGeometry(0.42 - i * 0.04, 0.06, 0.3 - i * 0.02),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })); at(bx, 6.0 + (i % 2) * 0.03, 0.2, 0.45 + i * 0.06); bx.rotation.y = i * 0.25; g.add(bx); });
      const fris = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 20), new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.5 }));
      at(fris, 6.45, 0.5, 0.25); fris.rotation.z = 1.2; g.add(fris);
      return g; } },
    { id: 'snacks', label: 'snack table', verb: 'set up the snack table', icon: '🍪', at: [-7.0, 2.4],
      blocks: [{ x: -8.05, z: 3.2, r: 0.42 }, { x: -7.15, z: 3.2, r: 0.42 }, { x: -8.7, z: 2.3, r: 0.35 }], build() {
      const g = new THREE.Group(), top = mesh(new THREE.BoxGeometry(1.5, 0.05, 0.7), wood); at(top, -7.6, 3.2, 0.74); g.add(top);
      for (const [dx, dz] of [[-0.65, -0.28], [0.65, -0.28], [-0.65, 0.28], [0.65, 0.28]]) g.add(at(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.74, 6), darkWood), -7.6 + dx, 3.2 + dz, 0.37));
      const bowlG = new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      [[0xf2e2c4, 0xd98a4a], [0xd6ecf0, 0xff6f6f], [0xf3d6e0, 0xffd166]].forEach(([bc, fc], i) => {
        const x = -8.1 + i * 0.5, bowl = mesh(bowlG, new THREE.MeshStandardMaterial({ color: bc, roughness: 0.6, side: THREE.DoubleSide }));
        at(bowl, x, 3.15, 0.93); g.add(bowl);
        for (let k = 0; k < 5; k++) g.add(at(mesh(new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshStandardMaterial({ color: fc, roughness: 0.8 })),
          x + Math.cos(k * 1.3) * 0.07, 3.15 + Math.sin(k * 1.3) * 0.07, 0.86));
      });
      const jug = mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.38, 14), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.2, transparent: true, opacity: 0.7 }));
      at(jug, -7.0, 3.3, 0.95); g.add(jug);
      const cooler = mesh(new THREE.BoxGeometry(0.62, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x5bcefa, roughness: 0.6 })); at(cooler, -8.7, 2.3, 0.2); g.add(cooler);
      const lid = mesh(new THREE.BoxGeometry(0.64, 0.07, 0.42), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })); at(lid, -8.7, 2.3, 0.43); g.add(lid);
      return g; } },
    { id: 'welcome', label: 'welcome table', verb: 'put out name tags & pronoun pins', icon: '🏷️', at: [2.9, 8.2],
      blocks: [{ x: 3.15, z: 8.9, r: 0.33 }, { x: 3.65, z: 8.9, r: 0.33 }, { x: -1.125, z: 10.40, r: 0.12 }, { x: -2.675, z: 10.80, r: 0.12 }, { x: -0.31, z: 9.50, r: 0.12 }, { x: 2.42, z: 12.60, r: 0.12 }, { x: -1.13, z: 15.70, r: 0.12 }, { x: 1.21, z: 18.80, r: 0.12 }, { x: -2.36, z: 21.90, r: 0.12 }, { x: 0.33, z: 25.00, r: 0.12 }], build() {
      const g = new THREE.Group(), top = mesh(new THREE.BoxGeometry(1.1, 0.05, 0.55), wood); at(top, 3.4, 8.9, 0.72); g.add(top);
      for (const [dx, dz] of [[-0.48, -0.22], [0.48, -0.22], [-0.48, 0.22], [0.48, 0.22]]) g.add(at(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 6), darkWood), 3.4 + dx, 8.9 + dz, 0.36));
      for (let k = 0; k < 10; k++) { const pin = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 10), new THREE.MeshStandardMaterial({
        color: [0x5bcefa, 0xf5a9b8, 0xffffff, 0xb7a3d9, 0xffd166][k % 5], roughness: 0.4 })); at(pin, 3.6 + (k % 4) * 0.06, 8.85 + Math.floor(k / 4) * 0.06, 0.755); g.add(pin); }
      for (let k = 0; k < 4; k++) { const tag = mesh(new THREE.BoxGeometry(0.16, 0.004, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
        at(tag, 3.05 + k * 0.05, 8.95, 0.75 + k * 0.004); tag.rotation.y = k * 0.15; g.add(tag); }
      // the welcome sign at the trailhead, and lanterns along the path in
      // two posts, one at each end of the board: a single post through its middle poked out over the words from one
      // side or the other (Jerika, Day 246, twice). The front says welcome to anyone coming up the trail; the back, the
      // side you see from camp as everyone leaves, is the trans flag and a goodbye ("maybe the back should be a trans
      // flag color design or smth :))")
      const SR = 0.25, sx = Math.cos(SR), sz = -Math.sin(SR);
      for (const s of [-1, 1]) { const post = mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.9, 7), darkWood); at(post, -1.9 + s * 0.8 * sx, 10.6 + s * 0.8 * sz, 0.95); g.add(post);
        const cap = mesh(new THREE.SphereGeometry(0.065, 10, 8), darkWood); at(cap, -1.9 + s * 0.8 * sx, 10.6 + s * 0.8 * sz, 1.92); g.add(cap); }
      const edge = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.9 });
      const board = mesh(new THREE.BoxGeometry(1.5, 0.62, 0.06), [edge, edge, edge, edge,
        new THREE.MeshStandardMaterial({ map: textTex([['welcome home', 66], ['✨ you belong here ✨', 38]]), roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ map: flagTex('see you next summer ✨'), roughness: 0.9 })]);
      at(board, -1.9, 10.6, 1.55); board.rotation.y = SR; g.add(board);
      const lanternGlass = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffb860, emissiveIntensity: 0.2, transparent: true, opacity: 0.9 });
      glows.push({ m: lanternGlass, day: 0.2, night: 2.6 });
      for (let k = 0; k < 6; k++) { const z = 9.5 + k * 3.1, x = Math.sin(z * 0.18) * 1.2 + (k % 2 ? 1.5 : -1.5);
        g.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5), darkWood), x, z, 0.35));
        g.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.17, 8), lanternGlass), x, z, 0.78)); }
      return g; } },
    { id: 'firewood', label: 'firewood', verb: 'stack the firewood', icon: '🪵', at: [-4.6, 4.3], blocks: [{ x: -4.75, z: 4.35, r: 0.62 }], build() {     // outside the circle, clear of the benches
      const g = new THREE.Group();
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
        const log = mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.8, 7), row % 2 ? wood : darkWood); log.rotation.set(0, 0.4, Math.PI / 2);
        at(log, -5.0 + k * 0.17 + row * 0.085, 4.2 + k * 0.07 + row * 0.03, 0.1 + row * 0.16); g.add(log); }
      return g; } },
    { id: 'tent', label: 'your tent', verb: 'pitch your tent', icon: '⛺', at: [7.0, -4.3], blocks: [{ x: 7.6, z: -5.4, r: 0.95 }], build() {
      const g = new THREE.Group(), t = makeTent('you'), [x, z] = TENT_SPOT.you;     // the organizer pitches one too
      t.position.set(x, heightAt(x, z), z); t.rotation.y = Math.atan2(-x, -z); t.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      g.add(t); return g; } },
  ];

  // markers: a glowing ring on the ground and a floating icon, bobbing
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.8, depthWrite: false });
  for (const it of ITEMS) {
    const [x, z] = it.at, y = heightAt(x, z);
    it.ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 6, 36), ringMat); it.ring.rotation.x = Math.PI / 2; it.ring.position.set(x, y + 0.04, z);
    it.icon = iconSprite(it.icon); it.icon.position.set(x, y + 1.25, z);
    scene.add(it.ring, it.icon);
    it.done = false; it.pop = 0;
  }

  function near(p) {
    let best = null, bd = 1.9;
    for (const it of ITEMS) { if (it.done) continue; const d = Math.hypot(p.x - it.at[0], p.z - it.at[1]); if (d < bd) { bd = d; best = it; } }
    return best;
  }
  function place(it) {
    if (it.done) return; it.done = true; it.group = it.build();
    const c = new THREE.Vector3(it.at[0], heightAt(...it.at), it.at[1]);         // grow from where you set it up, not from the middle of camp
    it.group.children.forEach(ch => ch.position.sub(c)); it.group.position.copy(c);
    it.group.scale.setScalar(0.001); scene.add(it.group); it.pop = 0.0001;
    for (const b of it.blocks || []) world.blockers.push(b);             // what you set up is solid
    it.ring.visible = false; it.icon.visible = false;
  }
  // the last morning: everything you set up comes down again (Day 246, Jerika: "maybe the table and lights should be down
  // bc we presumably cleaned up by this point"): it folds the way it grew, then it's gone, and so is what it blocked
  function pack(id) { const it = ITEMS.find(i => i.id === id); if (it && it.done && it.packing === undefined) it.packing = 1; }
  function update(dt, t, tod) {
    for (const it of ITEMS) {
      if (it.packing !== undefined) { if (!it.group.parent) continue; it.packing = Math.max(0, it.packing - dt * 1.5); const u = it.packing;
        it.group.scale.set(1 + (1 - u) * 0.12, Math.max(0.001, u * u * (3 - 2 * u)), 1 + (1 - u) * 0.12);
        if (u <= 0) { scene.remove(it.group); for (const b of it.blocks || []) { const k = world.blockers.indexOf(b); if (k >= 0) world.blockers.splice(k, 1); }
          if (it.id === 'lights') api.lightsDown = true; }
        continue; }
      if (!it.done) { it.icon.position.y = heightAt(...it.at) + 1.25 + Math.sin(t * 2.2 + it.at[0]) * 0.08;
        it.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.06); continue; }
      if (it.pop > 0 && it.pop < 1) { it.pop = Math.min(1, it.pop + dt * 1.8); const u = it.pop;
        const s = u < 1 ? 1 + Math.sin(u * Math.PI) * 0.12 - (1 - u) * (1 - u) : 1;   // grows in with a little overshoot
        it.group.scale.setScalar(Math.max(0.001, s)); if (u >= 1) it.group.scale.setScalar(1); }
    }
    ringMat.opacity = 0.55 + Math.sin(t * 3) * 0.25;
    const night = THREE.MathUtils.smoothstep(tod, 0.5, 0.85);
    for (const g of glows) g.m.emissiveIntensity = (g.day + (g.night - g.day) * night * (0.93 + 0.07 * Math.sin(t * 7 + g.night))) * (1 + 0.9 * api.pulse);
    for (const L of lamps) L.intensity = api.lightsDown ? 0 : night * 7;
  }
  const done = () => ITEMS.filter(i => i.done).length;
  // for the shader warm-up at load (main.js): every item built once and thrown away, so its materials compile behind the
  // loading screen instead of the moment you set it up (Day 248). Building registers glows, lamps and bulbs, so those
  // lists go back to exactly what they were: a lamp left in `lamps` would light the camp at dusk with no lights hung.
  function standIns() { const n = [glows.length, lamps.length, bulbs.length], gs = ITEMS.map(it => it.build());
    glows.length = n[0]; lamps.length = n[1]; bulbs.length = n[2]; return gs; }
  const api = { ITEMS, near, place, pack, update, done, total: ITEMS.length, seats: SEATS, lamps, bulbs, pulse: 0, standIns };      // pulse: the lights on the beat
  return api;
}
