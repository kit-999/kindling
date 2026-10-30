// Critters: the animal campers are sculpted plushies (plush.js). This file keeps the one camper who isn't fur:
// Lumi, the little glass robot from the robot game, a trans girl with a spark in her chest. Jerika, Day 245, after
// the plushies' first round of notes: "lumi looks amazing tho!!", so she is built exactly as she was.
import * as THREE from 'three';
import { look, glossy, setEnv, withFill, WOOL_MAP, WOOL_NORMAL, setFurShells, setSculptDetail, makePlush } from './plush.js';
export { look, setEnv, setFurShells, setSculptDetail };

const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
const blushMat = new THREE.MeshBasicMaterial({ color: 0xff9aae, transparent: true, opacity: 0.28, depthWrite: false });
const mouthMat = new THREE.MeshBasicMaterial({ color: 0x4a2a2a });
const SPH = new THREE.SphereGeometry(1, 24, 16);
const CAP = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 16);
function part(geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; return m;
}
function roundedBox(w, h, d, r, seg = 6) {          // a box with every edge rounded, normals included
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i);
    c.set(THREE.MathUtils.clamp(v.x, -hx, hx), THREE.MathUtils.clamp(v.y, -hy, hy), THREE.MathUtils.clamp(v.z, -hz, hz));
    const dir = v.clone().sub(c).normalize(); v.copy(c).addScaledVector(dir, r); p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, dir.x, dir.y, dir.z); }
  return g;
}
function stripeTex(cols) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d');
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 64 / cols.length, 8, 64 / cols.length + 1); });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx;
}
const TRANS = ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'];
const SHADOW_TEX = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'),
  gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

export function makeCritter(kind, opts = {}) {
  if (kind !== 'robot') return makePlush(kind, opts);
  const root = new THREE.Group(), hop = new THREE.Group(), head = new THREE.Group();
  root.add(hop);
  const glass = glossy(new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    transparent: true, opacity: 0.3, ior: 1.45, specularIntensity: 1, depthWrite: false, envMapIntensity: 1.2 }));
  const ears = [], arms = [];
  hop.add(part(roundedBox(0.5, 0.46, 0.4, 0.13), glass, 0, 0.36, 0));
  for (const sx of [-1, 1]) {
    hop.add(part(SPH, glass, sx * 0.11, 0.05, 0.05, 0.09, 0.06, 0.12));
    const arm = new THREE.Group(); arm.position.set(sx * 0.27, 0.42, 0.02);
    arm.add(part(CAP(0.05, 0.06), glass, 0, -0.06, 0)); arm.rotation.z = sx * 0.4;
    hop.add(arm); arms.push(arm);
  }
  // her scarf is the flag
  const scarfMat = withFill(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 1, map: stripeTex(TRANS), normalMap: WOOL_NORMAL,
    normalScale: new THREE.Vector2(0.7, 0.7), sheen: 0.45, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff) }));
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 10, 24), scarfMat);
  scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.6; scarf.castShadow = true; hop.add(scarf);
  head.position.y = 0.6 + 0.35 * 0.86; hop.add(head);
  head.add(part(roundedBox(0.66, 0.54, 0.54, 0.17), glass, 0, 0, 0));
  // her face: glossy glass eyes with a highlight, blush, a little smile
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * 0.14, -0.02, 0.26);
    e.add(part(SPH, new THREE.MeshPhysicalMaterial({ color: 0x23324a, roughness: 0.1, clearcoat: 1, emissive: 0x2a5a8a, emissiveIntensity: 0.4 }), 0, 0, 0, 0.05, 0.058, 0.04));
    e.add(part(SPH, shine, -sx * 0.013, 0.018, 0.036, 0.012)); head.add(e); eyes.push(e);
    head.add(part(SPH, blushMat, sx * 0.2, -0.09, 0.27, 0.05, 0.028, 0.012));
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 16, Math.PI), mouthMat);
  smile.rotation.z = Math.PI; smile.position.set(0, -0.11, 0.275); head.add(smile);
  for (const sx of [-1, 1]) {                                                  // antennae with little pearls
    const ant = new THREE.Group(); ant.position.set(sx * 0.17, 0.26, 0); ant.rotation.z = -sx * 0.18;
    ant.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), glass, 0, 0.09, 0));
    ant.add(part(SPH, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1 }), 0, 0.2, 0, 0.045)); head.add(ant); ears.push(ant);
  }
  const s = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 0.024 : (i % 4 ? 0.075 : 0.1);
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const spark = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffb54a, emissiveIntensity: 2.2 }));
  spark.position.set(0, 0.38, 0.0); hop.add(spark);
  // her light lives in the scene, not in her (main.js adds it at load): she's hidden until she arrives, and a light that
  // joins the scene then makes every lit material rebuild its shader at once (the PC freezes, Day 246); it follows her spark
  const sparkLight = new THREE.PointLight(0xffb860, 0, 2.4, 2);

  // a soft contact shadow, so she sits on the ground even when the sun's shadow is gone
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, opacity: 0.55 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; blob.renderOrder = 2; root.add(blob);

  const st = { phase: 0, air: 0, squash: 0, blinkAt: 2 + Math.random() * 3, blink: 0, ear: 0, earAt: 3 + Math.random() * 4,
               look: null, yaw: 0, tilt: 0, emote: null, emoteT: 0, wave: 0, glow: opts.glow ?? 0.5, talk: false, sit: 0, sitTo: 0 };
  root.userData = { kind, name: opts.name, st };
  function update(dt, t, speed) {
    if (speed > 0.15 || st.air > 0.001) {
      const prev = st.phase % 1;
      st.phase += dt * (2.3 + speed * 0.9);
      const p = st.phase % 1;
      if (p < prev) st.squash = 1;                         // the phase wrapped: a landing
      st.air = speed > 0.15 ? Math.sin(p * Math.PI) * (0.09 + Math.min(speed, 3) * 0.035) : Math.max(0, st.air - dt * 1.2);
    } else st.phase = 0;
    st.squash = Math.max(0, st.squash - dt * 6);
    let y = st.air, sqY = 1 - st.squash * 0.14 + Math.sin(t * 2.1 + root.id) * 0.014, sqX = 1 + st.squash * 0.09;
    if (st.emote) {
      st.emoteT += dt; const e = st.emoteT;
      if (st.emote === 'happy') y += Math.max(0, Math.sin(e * 9)) * 0.16 * Math.max(0, 1 - e / 1.4);
      if (st.emote === 'shy') sqY *= 1 - 0.08 * Math.min(1, e * 3) * Math.max(0, 1 - (e - 2) / 0.6);
      if (st.emote === 'nod') head.rotation.x = Math.sin(e * 10) * 0.18 * Math.max(0, 1 - e / 0.8);
      if (st.emote === 'wave') st.wave = Math.max(0, 1 - e / 1.6);
      if (e > 2.6) st.emote = null;
    }
    st.sit += (st.sitTo - st.sit) * Math.min(1, dt * 3);                    // she settles lower to sit, still hovering a little
    hop.position.y = y - 0.1 * st.sit; hop.scale.set(sqX, sqY, sqX);
    blob.scale.setScalar(1 - Math.min(0.4, y * 1.5)); blob.material.opacity = 0.55 * (1 - Math.min(0.5, y * 2));
    let yaw = 0, tilt = Math.sin(t * 0.7 + root.id) * 0.04;
    if (st.look) { const local = root.worldToLocal(st.look.clone());
      yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.1, 1.1); tilt = 0.16 * Math.sign(yaw || 1); }
    st.yaw += (yaw - st.yaw) * Math.min(1, dt * 6); head.rotation.y = st.yaw;
    st.tilt += (tilt - st.tilt) * Math.min(1, dt * 3); head.rotation.z = st.tilt;
    if (st.emote === 'shy') head.rotation.x = 0.25 * Math.min(1, st.emoteT * 3);
    else if (st.emote !== 'nod') head.rotation.x *= 0.9;
    if (t > st.blinkAt) { st.blink = 0.13; st.blinkAt = t + 2.5 + Math.random() * 4; }
    st.blink = Math.max(0, st.blink - dt);
    eyes.forEach(e => (e.scale.y = st.blink > 0 ? 0.12 : 1));
    if (t > st.earAt) { st.ear = 1; st.earAt = t + 3 + Math.random() * 5; }
    st.ear = Math.max(0, st.ear - dt * 4);
    ears.forEach((e, i) => (e.rotation.x = Math.sin(st.ear * Math.PI * 2) * 0.25 * (i ? 1 : 0.6)));
    arms.forEach((a, i) => { const sg = i ? 1 : -1;
      a.rotation.x = Math.sin(st.phase * Math.PI * 2 + i * Math.PI) * 0.45 * Math.min(1, speed);
      a.rotation.z = sg * (0.4 + (i === 1 ? st.wave * (1.9 + Math.sin(t * 16) * 0.35) : 0)); });
    const g = st.glow; spark.material.emissiveIntensity = 0.5 + g * 1.8 + Math.sin(t * 2.4) * 0.15;
    spark.rotation.y = Math.sin(t * 0.8) * 0.4; sparkLight.intensity = root.visible ? 0.08 + g * 0.45 : 0;
    hop.localToWorld(sparkLight.position.set(0, 0.38, 0.12));
  }
  const emote = k => { st.emote = k; st.emoteT = 0; };
  const gazeAt = v => { st.look = v ? v.clone() : null; };       // not lookAt: Object3D already has one
  const setGlow = v => { st.glow = THREE.MathUtils.clamp(v, 0, 1); };
  const setTalking = on => { st.talk = !!on; };
  const setSit = v => { st.sitTo = v; };
  const rig = { hop, head, arms, eyes: [new THREE.Vector3(-0.14, -0.02, 0.26), new THREE.Vector3(0.14, -0.02, 0.26)] };
  root.userData.sparkLight = sparkLight; root.userData.spark = spark;
  return Object.assign(root, { update, emote, gazeAt, setGlow, setTalking, setSit, head, rig, eyeAt: rig.eyes });
}
