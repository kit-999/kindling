// Day two's evening: the talent show. A little stage goes up in front of Juniper's board (footlights, bunting, a
// microphone), everyone sits on the grass facing it, Juniper hosts, and they go up one at a time: Biscuit's song (verse
// two, finally), Nyx's one card for everybody, Comet's charades (banned; done anyway), Thistle's sketchbook, Lumi's light
// show, your act, Rowan saying his name into the microphone, Moss's total stillness, and last, Clover's frog cake, which
// is half gone, because of a very small frog. The thread from the morning ("someone ate a corner of my frog cake")
// ends here. This module holds the stage, the props and the script; main.js passes in what it needs.
import * as THREE from 'three';
import { heightAt } from './world.js';
import { withFill } from './plush.js';

const mat = (color, o = {}) => withFill(new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }));
export const STAGE = { x: 3.85, z: 2.3, ry: -0.25, top: 0.13 };      // in front of the board, turned to the camp like it
const fwd = new THREE.Vector3(Math.sin(STAGE.ry), 0, Math.cos(STAGE.ry)), side = new THREE.Vector3(Math.cos(STAGE.ry), 0, -Math.sin(STAGE.ry));
const onStage = (f, s = 0) => [STAGE.x + fwd.x * f + side.x * s, STAGE.z + fwd.z * f + side.z * s];
// where everyone sits on the grass, facing the stage (Juniper hosts from beside it); you, front and centre
export const AUDIENCE = { Rowan: [2.65, 4.1], Lumi: [3.35, 4.1], you: [4.05, 4.1], Clover: [4.75, 4.1], Thistle: [5.45, 4.1],
  Moss: [2.3, 5.0], Nyx: [3.0, 5.0], Comet: [3.7, 5.0], Biscuit: [4.4, 5.0] };
export const HOST_AT = onStage(0.35, 1.25);

function stageProps() {
  const g = new THREE.Group(), wood = mat(0x8a5d3b), dark = mat(0x4a3424);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.7, STAGE.top, 1.05), wood); deck.position.y = STAGE.top / 2; deck.castShadow = deck.receiveShadow = true; g.add(deck);
  for (let i = 0; i < 5; i++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.004, 0.012), dark); plank.position.set(0, STAGE.top + 0.002, -0.42 + i * 0.21); g.add(plank); }
  // footlights along the front edge: warm bulbs, free to draw (bloom makes them glow)
  const bulbs = [];
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffc870, emissiveIntensity: 2.4 }));
    b.position.set(-0.7 + i * 0.28, STAGE.top + 0.035, 0.5); g.add(b); bulbs.push(b); }
  // a microphone on a stand, front and to one side, leaning in: dead centre, the stand ran down the middle of every face
  const metal = mat(0x2b2b33, { roughness: 0.4, metalness: 0.6 }), mx = -0.42, mz = 0.3;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 8), metal); stand.position.set(mx, STAGE.top + 0.4, mz); g.add(stand);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 8), metal); boom.rotation.z = -1.1; boom.position.set(mx + 0.13, STAGE.top + 0.86, mz); g.add(boom);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.02, 16), metal); foot.position.set(mx, STAGE.top + 0.01, mz); g.add(foot);
  const mic = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mat(0x9a9aa6, { roughness: 0.35, metalness: 0.7 })); mic.scale.set(1, 1.25, 1); mic.position.set(mx + 0.27, STAGE.top + 0.93, mz); g.add(mic);
  // bunting above the board, the trans flag's colours and a rainbow, swinging a little
  const flags = [], cols = [0x5bcefa, 0xf5a9b8, 0xffffff, 0xf5a9b8, 0x5bcefa, 0xff6b6b, 0xffa94d, 0xffd166, 0x69db7c, 0x5bcefa, 0xb197fc];
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.06, 0, 0, 0.06, 0, 0, 0, -0.13, 0], 3)); tri.computeVertexNormals();
  cols.forEach((c, i) => { const u = i / (cols.length - 1), x = -0.85 + u * 1.7, y = 1.98 - Math.sin(Math.PI * u) * 0.14;
    const f = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 })); f.position.set(x, y, -0.62); g.add(f); flags.push(f); });
  const string = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.9, 1.99], [0, 1.85], [0.9, 1.99]].map(([x, y]) => new THREE.Vector3(x, y, -0.62))), 16, 0.006, 4), dark);
  g.add(string);
  return { g, bulbs, flags };
}

// Clover's frog cake: round, frosted green, a frog's face on top (two big eyes, a smile, pink cheeks), and one frog-sized
// bite out of the front, sponge showing, crumbs on the plate. (Day 246, Jerika: "the frog cake being half gone is sad
// hehe, it looks kinda weird": it was half a cylinder.) The bite faces +z, which is the audience once it's on the stage.
const CAKE = { R: 0.2, H: 0.13, bites: [[-0.2, 0.08], [0.18, 0.07]] };    // bites: [angle off the front, radius]
function cakeOutline(R, bites) {           // the cake's edge seen from above: a circle, with round chomps out of the front
  const C = bites.map(([a, b]) => [Math.sin(a) * R, -Math.cos(a) * R, b]);   // shape space: -y becomes +z once stood up
  const pts = [];
  for (let i = 0; i < 120; i++) { const th = i / 120 * Math.PI * 2, ux = Math.cos(th), uy = Math.sin(th); let r = R;
    for (const [cx, cy, b] of C) { const d = ux * cx + uy * cy, disc = d * d - (cx * cx + cy * cy) + b * b;
      if (disc >= 0) { const tt = d - Math.sqrt(disc); if (tt > 0 && tt < r) r = tt; } }
    pts.push(new THREE.Vector2(ux * r, uy * r)); }
  return new THREE.Shape(pts);
}
function frogCake() {
  const g = new THREE.Group(), { R, H, bites } = CAKE;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.26, 0.022, 32), mat(0xffffff, { roughness: 0.3 })); plate.position.y = 0.011; g.add(plate);
  // the cake: frosting green round the outside, sponge where the bite went in (coloured by how far in each point is)
  const body = new THREE.ExtrudeGeometry(cakeOutline(R, bites), { depth: H, bevelEnabled: false, curveSegments: 1 });
  body.rotateX(-Math.PI / 2); body.translate(0, 0.022, 0);
  const P = body.attributes.position, col = new Float32Array(P.count * 3), frostC = new THREE.Color(0x7cc95a), spongeC = new THREE.Color(0xf3d59c), cc = new THREE.Color();
  for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i), P.getZ(i)), y = P.getY(i);
    cc.copy(r > R - 0.004 ? frostC : spongeC); if (r <= R - 0.004 && Math.abs(y - 0.022 - H * 0.5) < 0.008) cc.set(0xf6b8c8);   // a jam layer
    col.set([cc.r, cc.g, cc.b], i * 3); }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3)); body.computeVertexNormals();
  const cake = new THREE.Mesh(body, withFill(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }))); cake.castShadow = true; g.add(cake);
  // the frosting on top, a little proud of the edge and rounded over it
  const top = new THREE.ExtrudeGeometry(cakeOutline(R + 0.006, bites.map(([a, b]) => [a, b - 0.006])), { depth: 0.014, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.009, bevelSegments: 3, curveSegments: 1 });
  top.rotateX(-Math.PI / 2); top.translate(0, 0.022 + H + 0.004, 0);
  const frost = mat(0x86d164, { roughness: 0.45 }), y1 = 0.022 + H + 0.03;
  g.add(new THREE.Mesh(top, frost));
  // the face, at the back of the top, looking out at you
  for (const sx of [-1, 1]) {
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), frost); lid.scale.set(1, 0.9, 1); lid.position.set(sx * 0.075, y1 + 0.012, -0.075); g.add(lid);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.033, 14, 10), mat(0xffffff, { roughness: 0.3 })); white.position.set(sx * 0.077, y1 + 0.03, -0.045); g.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 8), mat(0x1b1b1f, { roughness: 0.2 })); pupil.position.set(sx * 0.078, y1 + 0.034, -0.016); g.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 })); glint.position.set(sx * 0.072, y1 + 0.043, -0.003); g.add(glint);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), mat(0xf6a3b9, { roughness: 0.6 })); cheek.scale.set(1, 0.3, 0.8); cheek.position.set(sx * 0.12, y1 - 0.004, 0.012); g.add(cheek);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 20, Math.PI), mat(0x3d6b2a, { roughness: 0.6 }));
  smile.rotation.x = -Math.PI / 2; smile.rotation.z = Math.PI; smile.position.set(0, y1 - 0.004, 0.0); g.add(smile);
  // crumbs, on the plate under the bite and a few on the stage
  const sponge = mat(0xf3d59c);
  for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.011, 0.014), sponge), a = (Math.random() - 0.5) * 1.1, r = R + 0.01 + Math.random() * 0.07;
    c.position.set(Math.sin(a) * r, 0.026, Math.cos(a) * r); c.rotation.set(Math.random(), Math.random() * 3, Math.random()); g.add(c); }
  g.userData.bite = new THREE.Vector3(0, 0.022 + H * 0.55, R - 0.05);     // where Crumb has been hiding
  return g;
}
// the culprit: a very small frog with crumbs on its face
function tinyFrog() {
  const g = new THREE.Group(), green = mat(0x78c45a, { roughness: 0.55 }), pale = mat(0xd6efb0, { roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), green); body.scale.set(1.15, 0.78, 1.25); body.position.y = 0.05; g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), pale); belly.scale.set(1, 0.7, 0.6); belly.position.set(0, 0.04, 0.045); g.add(belly);
  for (const s of [-1, 1]) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), green); bump.position.set(s * 0.035, 0.1, 0.035); g.add(bump);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), mat(0x161616, { roughness: 0.2 })); eye.position.set(s * 0.038, 0.108, 0.052); g.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), mat(0xffffff)); glint.position.set(s * 0.036, 0.114, 0.064); g.add(glint);
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), green); leg.scale.set(0.8, 0.55, 1.4); leg.position.set(s * 0.06, 0.022, -0.02); g.add(leg);
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), mat(0xf2a0b0)); blush.scale.set(1, 0.6, 0.4); blush.position.set(s * 0.05, 0.075, 0.066); g.add(blush);
  }
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.007, 0.008), mat(0xf2d29a));    // crumbs on its face
    c.position.set((Math.random() - 0.5) * 0.06, 0.055 + Math.random() * 0.025, 0.072); g.add(c); }
  g.scale.setScalar(1.4); g.userData.s = 1.4; return g;
}
// a flat thing held up in both paws (Nyx's card, Thistle's sketchbook): a thin box, the picture on its front
function heldProp(w, h) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), [mat(0xf3eee2), mat(0xf3eee2), mat(0xf3eee2), mat(0xf3eee2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), mat(0x2b2f4a)]);
  m.castShadow = true; m.visible = false; return m;
}
// pinecones for juggling
function pinecone() {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const v = i / 24, y = v * 0.13, body = Math.sin(Math.PI * Math.pow(v, 0.8)) * 0.042 + 0.004, scale = 1 + 0.28 * Math.pow(Math.abs(Math.sin(v * Math.PI * 6)), 0.6);
    pts.push(new THREE.Vector2(Math.max(0.002, body * scale), y)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 10), mat(0x9a6537, { flatShading: true, roughness: 0.95 })); m.geometry.translate(0, -0.065, 0); m.castShadow = true; return m;
}

export function buildStage(scene) {
  const { g, bulbs, flags } = stageProps(), cake = frogCake(), frog = tinyFrog(), cones = [pinecone(), pinecone(), pinecone()];
  const y0 = heightAt(STAGE.x, STAGE.z);
  g.position.set(STAGE.x, y0, STAGE.z); g.rotation.y = STAGE.ry; g.visible = false; scene.add(g);
  cake.visible = frog.visible = false; scene.add(cake, frog); cones.forEach(c => { c.visible = false; scene.add(c); });
  const prop = heldProp(0.2, 0.3); scene.add(prop);
  let t = 0, juggler = null, jugT = 0, jugN = -1, onCatch = null, frogHop = null, lightShow = false, mime = null, holder = null, swayers = [];
  const V = new THREE.Vector3(), paw = (c, i) => { const a = c.rig.arms[i]; a.updateWorldMatrix(true, false); return a.localToWorld(new THREE.Vector3(0, -0.2, 0.07)); };
  const FLAG = [new THREE.Color(0x5bcefa), new THREE.Color(0xf5a9b8), new THREE.Color(0xffffff)], WARM = new THREE.Color(0xffc870);
  const at = (f, s, dy = 0) => { const [x, z] = onStage(f, s); return new THREE.Vector3(x, y0 + STAGE.top + dy, z); };
  return {
    group: g, cake, frog,
    spot: () => at(0, 0),                                                         // where a performer stands
    look: new THREE.Vector3(STAGE.x, y0 + STAGE.top + 0.75, STAGE.z),             // what the audience watches
    show(on) { g.visible = on; },
    // the cake at the front corner of the stage (the side away from the microphone), then the frog, from behind it
    cakeOut() { cake.position.copy(at(0.2, 0.5, 0.0)); cake.rotation.y = STAGE.ry; cake.visible = true; cake.scale.setScalar(0.001); cake.userData.pop = 0; },
    // Crumb, out of the bite he made: up out of the sponge, then a hop down onto the stage in front of the cake
    frogOut() { const bite = cake.localToWorld(cake.userData.bite.clone()), up = bite.clone().add(new THREE.Vector3(0, 0.1, 0)), to = at(0.48, 0.42, 0.0);
      frog.position.copy(bite); frog.rotation.y = STAGE.ry; frog.visible = true; frog.scale.setScalar(0.001); delete frog.userData.y0;
      return new Promise(res => { frogHop = { legs: [[bite, up, 0.35, 0.02], [up, to, 0.5, 0.16]], k: 0, u: 0, res }; }); },
    // Comet's charades: 'windmill' (arms wheeling), 'tornado' (spinning, fast), 'frog' (crouch and hop), null (stop)
    mime(c, kind) { if (mime && mime.c !== c) mime.c.userData.seatLift = STAGE.top;
      mime = kind ? { c, kind, t: 0, ry: STAGE.ry } : null; c.rotation.y = STAGE.ry; if (!kind) c.userData.seatLift = STAGE.top; },
    // something held up in both paws, facing the audience: a canvas for its front, or null to put it away
    holdUp(c, picture, w = 0.2, h = 0.3) { holder = picture ? c : null; prop.visible = !!picture;
      if (picture) { prop.scale.set(w / 0.2, h / 0.3, 1); const tex = new THREE.CanvasTexture(picture); tex.colorSpace = THREE.SRGBColorSpace;
        const m = prop.material[4]; m.map?.dispose(); m.map = tex; m.needsUpdate = true; } },
    sway(list) { swayers = list || []; },
    lightShow(on) { lightShow = on; if (!on) bulbs.forEach(b => b.material.emissive.copy(WARM)); },
    juggle(c, on, catchFn = null) { juggler = on ? c : null; jugT = 0; jugN = -1; onCatch = catchFn; cones.forEach(k => { k.visible = on; }); if (!on) c.gazeAt(null); },
    update(dt, night) {
      t += dt;
      if (!g.visible) return;
      for (const b of bulbs) b.material.emissiveIntensity = 0.6 + 2.2 * night;
      if (lightShow) bulbs.forEach((b, i) => b.material.emissive.copy(FLAG[Math.floor(t * 4 + i) % 3]));     // Lumi's show: the footlights go flag colours
      flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 1.7 + i) * 0.18; });
      if (cake.visible && cake.userData.pop < 1) { cake.userData.pop = Math.min(1, cake.userData.pop + dt * 2.5); const u = cake.userData.pop; cake.scale.setScalar(Math.max(0.001, u + Math.sin(u * Math.PI) * 0.15)); }
      if (frogHop) { const h = frogHop, [from, to, dur, arc] = h.legs[h.k]; h.u = Math.min(1, h.u + dt / dur); const u = h.u;
        frog.position.lerpVectors(from, to, u); frog.position.y += Math.sin(Math.PI * u) * arc;
        frog.scale.setScalar(frog.userData.s * (h.k === 0 ? Math.max(0.001, u) : 1));
        if (u >= 1) { if (++h.k < h.legs.length) h.u = 0; else { frogHop = null; frog.userData.y0 = frog.position.y; h.res(); } } }
      // a tiny fidget, up and back down (it used to only go up, and Crumb floated off into the sky: Day 246)
      else if (frog.visible && frog.userData.y0 !== undefined && frog.parent === scene) frog.position.y = frog.userData.y0 + (Math.sin(t * 9) > 0.97 ? 0.004 : 0);
      // a three-pinecone cascade, thrown from one paw and caught in the other, a throw every 0.42 s (it was a blur, and
      // the arms never moved: Day 246, "they moved really fast and i didn't move my body at all")
      if (juggler) { jugT += dt; const T = 0.42, c = juggler, fw = new THREE.Vector3(Math.sin(c.rotation.y), 0, Math.cos(c.rotation.y));
        const n = Math.floor(jugT / T);
        c.rig.arms.forEach((a, i) => { const mine = ((n % 2) + 2) % 2 === (i ? 0 : 1), since = jugT - n * T;   // right paw throws on evens
          a.rotation.x = -1.25 - (mine ? 0.45 * Math.exp(-since * 9) : 0) + 0.12 * Math.sin(jugT * 15 + i); a.rotation.z = (i ? 1 : -1) * 0.12; });
        const P = [paw(c, 1).addScaledVector(fw, 0.06), paw(c, 0).addScaledVector(fw, 0.06)];   // [right, left]
        const mid = P[0].clone().add(P[1]).multiplyScalar(0.5), inward = h => mid.clone().sub(P[h]).setY(0).normalize();
        let top = null;
        cones.forEach((k, i) => { const u = jugT / T + i, cyc = Math.floor(u / 3), p = u - 3 * cyc, nThrow = 3 * cyc - i, h = ((nThrow % 2) + 2) % 2, o = 1 - h;
          const from = P[h].clone().addScaledVector(inward(h), 0.035), to = P[o].clone().addScaledVector(inward(o), -0.035);
          if (p < 2) { const q = p / 2; k.position.lerpVectors(from, to, q); k.position.y += 0.58 * 4 * q * (1 - q); if (!top || k.position.y > top.y) top = k.position; }
          else { const q = p - 2; k.position.lerpVectors(to, P[o].clone().addScaledVector(inward(o), 0.035), q); k.position.y -= 0.035 * Math.sin(Math.PI * q); }
          k.rotation.z = jugT * 5 + i * 2; });
        if (n !== jugN) { if (jugN >= 0) onCatch?.(); jugN = n; }
        if (top) c.gazeAt(top.clone()); }
      if (mime) { const m = mime, c = m.c; m.t += dt;
        if (m.kind === 'windmill') { c.rig.arms.forEach((a, i) => { const sx = i ? 1 : -1; a.rotation.z = sx * (1.4 + Math.sin(m.t * 6 + i * Math.PI) * 1.1); a.rotation.x = -0.15; }); }
        if (m.kind === 'tornado') { c.rotation.y = m.ry + m.t * Math.min(16, 4 + m.t * 10); c.rig.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * 1.35; }); }
        if (m.kind === 'frog') { const ph = (m.t * 1.6) % 1, air = ph < 0.55 ? Math.sin(Math.PI * ph / 0.55) : 0, crouch = ph >= 0.55 ? Math.sin(Math.PI * (ph - 0.55) / 0.45) : 0;
          c.userData.seatLift = STAGE.top + 0.32 * air; c.rig.hop.scale.set(1 + 0.12 * crouch - 0.06 * air, 1 - 0.18 * crouch + 0.12 * air, 1 + 0.12 * crouch - 0.06 * air);
          c.rig.arms.forEach((a, i) => { a.rotation.x = -0.9 - 0.6 * crouch; a.rotation.z = (i ? 1 : -1) * (0.5 + 0.4 * air); }); } }
      // held at the chest, not the face (held higher, it covered the eyes of whoever was holding it)
      if (holder) { const c = holder; c.rig.arms.forEach((a, i) => { a.rotation.x = -1.3; a.rotation.z = (i ? 1 : -1) * 0.08; });
        const pr = paw(c, 0).add(paw(c, 1)).multiplyScalar(0.5); prop.position.copy(pr).add(new THREE.Vector3(Math.sin(c.rotation.y), 0, Math.cos(c.rotation.y)).multiplyScalar(0.07));
        prop.position.y -= 0.02; prop.rotation.set(-0.15, c.rotation.y, 0); }
      for (const c of swayers) { c.rig.hop.rotation.z = Math.sin(t * 2.4 + c.id) * 0.12; }
    },
  };
}

// the show itself. ctx: campers, byName, player, me, talk, wait, setCine, cut (performer onto the stage), back (to their
// seat), focus, play (Biscuit's guitar), audio, stage, title, lights (Lumi's light show on the string lights), setTodTarget
export async function runTalentShow(ctx) {
  const { byName, player, me, talk, wait, setCine, focus, audio, stage } = ctx;
  const say = (n, line) => talk.say(n, n === me.name ? me.pron : byName[n]?.userData.cast.pron ?? '', line);
  const W = { target: new THREE.Vector3(STAGE.x + 0.1, stage.look.y - 0.1, STAGE.z + 0.35), dist: 6.4, pitch: 12, yaw: 0.12 };
  const wide = (cut = false) => ({ ...W, target: W.target.clone(), cut });
  // close-ups from the gap between the stage and the front row: any further back and the camera is in the audience,
  // looking at the backs of heads (Day 246, the first run: your ears, in front of every act)
  // the audience, from the stage: what a performer sees
  const crowd = { target: new THREE.Vector3((AUDIENCE.Rowan[0] + AUDIENCE.Thistle[0]) / 2, 0.55, 4.5), dist: 3.3, pitch: 10, yaw: Math.PI + 0.35, cut: true };
  // a medium shot, for acts that need room (arms out, hops, pinecones in the air): pulled back AND up, so it looks over
  // the front row rather than through it (pulled straight back, Lumi's glass head filled the frame)
  const medium = c => ({ target: c.position.clone().add(new THREE.Vector3(0, 0.72, 0)), dist: 2.35, pitch: 24, yaw: STAGE.ry, cut: true });
  // holding a picture up: on a tall screen the picture fills the top, so aim above their head and their face sits below it
  const held = c => innerHeight > innerWidth ? { ...close(c), target: close(c).target.add(new THREE.Vector3(0, 0.38, 0)), dist: 1.8 } : close(c);
  const close = c => ({ target: c.position.clone().add(new THREE.Vector3(0, 0.64, 0)), dist: 1.55, pitch: 9, yaw: STAGE.ry, cut: true });
  const p = THREE.MathUtils.degToRad(W.pitch), wideCam = W.target.clone().add(new THREE.Vector3(Math.sin(W.yaw) * Math.cos(p), Math.sin(p), Math.cos(W.yaw) * Math.cos(p)).multiplyScalar(W.dist));
  const unclear = ctx.clearView?.(wideCam, 3.2) ?? (() => {});             // string-light bulbs right by the lens would blur huge
  const clap = (who = null) => { audio.applause?.(); for (const k of ctx.campers) if (k !== who) k.emote('happy'); if (who !== player) player.emote('happy'); };
  const every = (secs, fn) => { let on = true; (async () => { while (on) { fn(); await wait(secs); } })(); return { stop() { on = false; } }; };
  const act = async (name, lines) => {        // the host calls them up; cut to them on the stage; their lines; applause; back
    const c = name === 'you' ? player : byName[name];
    ctx.cut(c); setCine(close(c)); focus(c); await wait(0.5);
    await lines(c);
    clap(c); await wait(1.2);
    ctx.back(c); setCine(wide(true)); focus(byName.Juniper); await wait(0.4);
  };
  setCine(wide(true)); focus(byName.Juniper); await wait(1.2);
  talk.open();
  await say('Juniper', 'Welcome to the camp talent show! The rules: be kind, be loud, and absolutely no charades.');
  await say('Comet', 'BOOOO.');
  await say('Juniper', 'First up: Biscuit, with a song.');
  const everyone = [...ctx.campers, player];
  await act('Biscuit', async c => { ctx.play('Biscuit', true); const stop = ctx.song?.('biscuit') ?? (() => {});
    const notes = every(0.5, () => ctx.fx?.('notes', c.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.95, 0.1)), new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.32, 0), 2.4, 0.13));
    stage.sway(everyone.filter(k => k !== c));
    await say('Biscuit', "This is the song. Verse two is new. I finished it this afternoon, in the stream.");
    await say('Biscuit', "♪ Campfire, campfire, you're a fire at camp... ♪");
    await say('Biscuit', "♪ ...and we're all at camp, and the camp is on fire. Not ON fire. Near fire. ♪");
    notes.stop(); stop(); ctx.play('Biscuit', false); stage.sway(null);
    await say('Biscuit', 'Thank you! I worked on it for three years.'); });
  await say('Juniper', 'Next, Nyx, with the cards.');
  await act('Nyx', async c => {
    await say('Nyx', "I pulled one card for all of us. Before the show. I wasn't going to say, but.");
    const card = ctx.card?.(); if (card) { stage.holdUp(c, card.canvas, 0.17, 0.28); ctx.sfx?.('card'); ctx.sketch?.picture(card.url); setCine(held(c)); }
    await say('Nyx', "The Star. It means hope. It means you're exactly where you're meant to be."); stage.holdUp(c, null); });
  ctx.sketch?.hide();
  await say('Juniper', 'And now: Comet, who is NOT doing charades.');
  await act('Comet', async c => {
    await say('Comet', "I'm doing charades. Nobody stop me.");
    setCine(medium(c));                                       // wider: arms out, and the hops go up
    stage.mime(c, 'windmill'); ctx.sfx?.('whoosh'); await wait(1.7);
    await say('Clover', 'A windmill!');
    stage.mime(c, 'tornado'); ctx.sfx?.('whoosh'); const w = every(0.6, () => ctx.sfx?.('whoosh')); await wait(1.5); w.stop();
    await say('Biscuit', 'A tornado! A very small tornado!');
    stage.mime(c, 'frog'); const b = every(0.625, () => ctx.sfx?.('boing')); await wait(2.0);
    await say('Rowan', '...a frog?'); b.stop(); stage.mime(c, null);
    setCine(close(c)); c.emote('happy');
    await say('Comet', 'IT WAS A FROG. Rowan wins. Frogs are everywhere this weekend, have you noticed?'); });
  await say('Juniper', 'Thistle, you said you had something?');
  await act('Thistle', async c => {
    // the drawing is the group photo from night one, in pencil; a game started at day two has no night one, so Thistle
    // draws the audience instead, from the stage, and you see what Thistle sees first
    let art = ctx.drawing?.(), caption = 'everyone, at the fire 🔥';
    if (ctx.colored?.()) await say('Thistle', 'In colour. Because someone found all five of my pencils.');
    if (art) await say('Thistle', "I drew everyone. At the fire last night. I wasn't going to show anyone.");
    else { await say('Thistle', "I drew everyone. Just now, from up here. I wasn't going to show anyone.");
      setCine(crowd); focus(c); await wait(1.0); await ctx.grab?.(); art = ctx.drawing?.(); caption = 'everyone, at the show ✨';
      setCine(close(c)); await wait(0.3); }
    const page = ctx.sketch?.show(art, caption); ctx.sfx?.('page'); if (page) { stage.holdUp(c, page, 0.27, 0.25); setCine(held(c)); }
    await say('Thistle', "It's all of you. And the lights. ...Mostly the lights. You look really happy in it."); stage.holdUp(c, null); });
  ctx.sketch?.hide();
  await say('Juniper', 'Lumi! The light show!');
  await act('Lumi', async c => {
    await say('Lumi', "I practised all day. In my head. Here goes.");
    const lightsBack = await ctx.lights(c);
    await say('Lumi', "...I didn't know I could do the blue. I'm glad I came."); lightsBack?.(); });
  await say('Juniper', "Organizer! You're up.");
  await act('you', async c => {
    const pick = await talk.choose(['Juggle three pinecones', 'Tell a joke', 'Lead a camp song']);
    if (pick.opt.startsWith('Juggle')) { await say(me.name, 'Three pinecones. No net.');
      setCine(medium(c)); stage.juggle(c, true, () => audio.tok?.()); await wait(5.2); stage.juggle(c, false); setCine(close(c));
      await say('Comet', "That's it. I'm learning to juggle. Tomorrow. Before the hike."); }
    else if (pick.opt.startsWith('Tell')) { await say(me.name, 'Why do trees never get lost at camp?'); await say(me.name, '...They always know their roots.');
      ctx.sfx?.('rimshot'); for (const k of ctx.campers) k.emote('shy'); await wait(1.3);
      await say('Comet', 'BOOOO. Again. Do it again.'); }
    else { await say(me.name, "Everybody! You know this one."); const stop = ctx.song?.('camp') ?? (() => {});
      stage.sway(everyone); setCine({ ...wide(true), dist: 5.2 });
      const notes = every(0.35, () => { const k = everyone[Math.floor(Math.random() * everyone.length)];
        ctx.fx?.('notes', k.position.clone().add(new THREE.Vector3(0, 0.95, 0)), new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.3, 0), 2.2, 0.12); });
      await say('Everyone', "♪ Here by the fire we sing under stars... ♪"); await wait(0.3);
      await say('Everyone', "♪ ...everyone here is a friend of our own. ♪");
      notes.stop(); stop(); stage.sway(null); setCine(close(c)); } });
  await say('Juniper', 'Rowan, you wanted a turn?');
  await act('Rowan', async c => {
    await say('Rowan', "My talent is... I'm going to say my name. Into the microphone."); c.emote('shy'); await wait(0.6);
    await say('Rowan', "I'm Rowan.");
    for (const k of ctx.campers) if (k !== c) k.emote('wave'); player.emote('wave'); ctx.sfx?.('chant'); setCine(crowd);
    const hearts = every(0.3, () => { const k = everyone[Math.floor(Math.random() * everyone.length)]; if (k === c) return;
      ctx.fx?.('hearts', k.position.clone().add(new THREE.Vector3(0, 1.0, 0)), new THREE.Vector3(0, 0.3, 0), 2.2, 0.13); });
    await say('Everyone', 'RO-WAN! RO-WAN! RO-WAN!'); hearts.stop(); setCine(close(c));
    await say('Rowan', '...that was fourteen. I lost count. I don\'t mind.'); });
  await say('Juniper', 'Moss! Moss? Moss is up.');
  await act('Moss', async c => {
    await say('Moss', 'My talent is total stillness.'); await wait(1.4);
    c.setSleep?.(true); const zs = every(0.75, () => ctx.fx?.('zs', c.position.clone().add(new THREE.Vector3(0.12, 0.95, 0.05)), new THREE.Vector3(0.06, 0.22, 0), 2.6, 0.14));
    await wait(0.6); await say('Moss', '...zzz.');
    await say('Juniper', "They're asleep. On stage. That's a standing ovation, everybody."); zs.stop(); c.setSleep?.(false); });
  await say('Juniper', "And last, but never least: Clover, who's been guarding something all weekend.");
  await act('Clover', async c => {
    await say('Clover', 'For my talent, I baked. Behold: the FROG CAKE.'); stage.cakeOut(); await wait(0.9);
    setCine({ target: stage.cake.position.clone().add(new THREE.Vector3(0, 0.14, 0)), dist: 1.05, pitch: 24, yaw: STAGE.ry - 0.1, cut: true }); await wait(0.6);
    await say('Clover', "...there's a BITE out of it. A fresh one!");
    await say('Clover', 'Moss. MOSS. Was it you?'); await say('Moss', '...zzz. No.');
    await stage.frogOut(); audio.ribbit?.();
    // the culprit, close up (on a tall phone the cake shot is too narrow to hold both)
    setCine({ target: stage.frog.position.clone().add(new THREE.Vector3(0, 0.09, 0)), dist: 0.7, pitch: 12, yaw: STAGE.ry - 0.1, cut: true }); await wait(0.6);
    await say('Frog', 'ribbit.');
    await say('Clover', '...it was YOU. You tiny cake thief. Look at your face. It has CRUMBS on it.'); audio.ribbit?.();
    setCine(close(c)); await say('Clover', "His name is Crumb. He lives with me now. This is my talent, actually."); });
  focus(byName.Juniper); setCine(wide(true));
  await say('Juniper', "Best talent show in twelve summers. Crumb is officially a camper. Goodnight, everybody!");
  talk.close(); focus(null); unclear();
  await wait(1.5);
}
