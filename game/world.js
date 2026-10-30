// The campsite: a forest clearing on gentle ground, a stream curving along the west edge, conifers all round, rocks,
// shrubs, mushrooms by the water that glow after dark, the fire ring, and fireflies. 1 unit = 1 metre.
// Exposes heightAt(x, z) for anything that stands on the ground, and blockers (trunks, rocks) for walking.
import * as THREE from 'three';
import { addWind, addSeeThrough } from './effects.js';

// ---- deterministic noise, so the camp is the same camp every visit ----
let seed = 245;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.17;

// the stream's centre line (x as a function of z), on the west side where the sun sets
export const streamX = z => 17 + 2.6 * Math.sin(z * 0.11) + 1.2 * Math.sin(z * 0.27 + 1.3);
const STREAM_HALF = 1.7;

// day three's hike: a path from the north side of camp (between Thistle's tent and Lumi's) up a hill to a lookout over
// the clearing. The hill and the path are part of the world from the start, so on night one there's somewhere to wander.
// the hike: out of camp to the north, west along the foot of the hill, then switchbacks up its far side and over the top
// to the lookout. It used to go straight up, 22 m in seven seconds (Day 246, Jerika: "getting up the hill was suuuuper
// fast tho, not really a hike"); now 38, at a walking pace, with a rest halfway (HIKE[REST_AT])
export const HIKE = [[-2.2, -6.8], [-2.6, -10.6], [-7.0, -12.4], [-12.0, -13.0], [-16.6, -15.2], [-20.2, -18.6], [-17.8, -21.4], [-21.0, -23.8],
  [-19.2, -26.4], [-15.8, -25.0]];
export const REST_AT = 4;
export const LOOKOUT = [-15.6, -24.4];
const HILL = [-17.6, -26.4];
export function hikeDist(x, z) {               // how far (x, z) is from the hike path
  let best = Infinity;
  for (let i = 0; i < HIKE.length - 1; i++) { const [ax, az] = HIKE[i], [bx, bz] = HIKE[i + 1], dx = bx - ax, dz = bz - az;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * u, z - az - dz * u)); }
  return best;
}
// what the hike keeps clear of trees, rocks and bushes: the path, the top of the hill, and the view from it back to camp
// (a lane down the slope toward the clearing: a tree right below the railing hid half of it)
const VIEW_TO = [LOOKOUT[0] * 0.45, LOOKOUT[1] * 0.45];
function viewDist(x, z) { const [ax, az] = LOOKOUT, dx = VIEW_TO[0] - ax, dz = VIEW_TO[1] - az;
  const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * u, z - az - dz * u) - u * 2.5; }
export const hikeClear = (x, z, pad = 0) => hikeDist(x, z) < 2.4 + pad || Math.hypot(x - LOOKOUT[0], z - LOOKOUT[1]) < 4.6 + pad || viewDist(x, z) < 3.2 + pad;

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.06, z * 0.06) - 0.5) * 0.9;                       // gentle rolls everywhere
  h += THREE.MathUtils.smoothstep(r, 20, 48) * (2.4 + fbm(x * 0.03 + 7, z * 0.03) * 4);   // the forest floor rises away from the clearing
  const ds = Math.abs(x - streamX(z));
  h -= (1 - THREE.MathUtils.smoothstep(ds, STREAM_HALF * 0.6, STREAM_HALF * 2.4)) * 0.75;   // the stream bed
  if (x > streamX(z) + 3) h += Math.min(1.5, (x - streamX(z) - 3) * 0.18);   // the far bank rises a little
  { const dx = x - HILL[0], dz = z - HILL[1]; h += 4.4 * Math.exp(-(dx * dx + dz * dz) / (2 * 7 * 7)); }   // the lookout's hill
  return h;
}

const DAY_WATER = new THREE.Color(0x5fa3c8);
// the stream's surface at z: the water is built level across, this far above the middle of the bed
export const waterY = z => heightAt(streamX(z), z) + 0.2;

export function buildWorld(scene) {
  const blockers = [];      // {x, z, r}
  const glowMats = [];      // emissive materials that wake up at dusk
  const updaters = [];

  // ---- ground: one big displaced plane with vertex colours (grass, moss, path, stream gravel) ----
  const G = new THREE.PlaneGeometry(150, 150, 150, 150); G.rotateX(-Math.PI / 2);
  const pos = G.attributes.position, cols = [];
  const grass = new THREE.Color(0x6d8f47), moss = new THREE.Color(0x3f5f34), dirt = new THREE.Color(0x9a7a52),
        gravel = new THREE.Color(0x8a8270), dry = new THREE.Color(0x9a9a52);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z);
    pos.setY(i, y);
    const r = Math.hypot(x, z), n = fbm(x * 0.15 + 3, z * 0.15), ds = Math.abs(x - streamX(z));
    const n2 = fbm(x * 0.45 - 9, z * 0.45 + 4);
    const c = grass.clone().lerp(dry, THREE.MathUtils.smoothstep(n, 0.55, 0.75) * 0.5).offsetHSL(0, 0, (n2 - 0.5) * 0.08)
                         .lerp(moss, THREE.MathUtils.smoothstep(r, 16, 26) * 0.85);
    // the trail in from the south, and a worn patch round the fire
    const onPath = Math.abs(x - Math.sin(z * 0.18) * 1.2) < 1.1 + n * 0.5 && z > 4 && z < 32;
    if (onPath) c.lerp(dirt, 0.8);
    { const dh = hikeDist(x, z); if (dh < 0.9 + n * 0.4 && Math.hypot(x, z) > 5.5) c.lerp(dirt, 0.72 * (1 - THREE.MathUtils.smoothstep(dh, 0.5, 1.3 + n * 0.4)) + 0.08); }
    if (r < 3.6) c.lerp(dirt, 0.55 * (1 - r / 3.6) + 0.25);
    if (ds < STREAM_HALF * 2.2) c.lerp(gravel, 1 - THREE.MathUtils.smoothstep(ds, STREAM_HALF * 1.2, STREAM_HALF * 2.2));
    cols.push(c.r, c.g, c.b);
  }
  G.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  G.computeVertexNormals();
  const ground = new THREE.Mesh(G, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; ground.name = 'ground';
  scene.add(ground);

  // ---- the stream: a ribbon following the centre line, flowing, with a fresnel sheen that takes the sky's colour ----
  const segs = 140, wPos = [], wUv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const z = -75 + 150 * i / segs, cx = streamX(z);
    for (const side of [-1, 1]) {
      const x = cx + side * STREAM_HALF * 1.15;
      wPos.push(x, heightAt(cx, z) + 0.2, z); wUv.push(side < 0 ? 0 : 1, z / 6);   // level across, following the bed downhill
    }
    if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const W = new THREE.BufferGeometry();
  W.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3)); W.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
  W.setIndex(idx); W.computeVertexNormals();
  const waterU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog,    // fog: true needs three's fog uniforms present
    { uTime: { value: 0 }, uSky: { value: new THREE.Color() }, uDeep: { value: new THREE.Color(0x1d4250) }, uNight: { value: 0 } }]);
  const water = new THREE.Mesh(W, new THREE.ShaderMaterial({
    uniforms: waterU, transparent: true, fog: true,
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vW; #include <fog_pars_vertex>
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition; #include <fog_vertex> }`.replace(/#include <(\w+)>/g, '\n#include <$1>\n'),
    fragmentShader: /* glsl */`uniform float uTime, uNight; uniform vec3 uSky, uDeep; varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main() {
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float flow = sin(vUv.y * 9.0 - uTime * 2.2 + sin(vUv.x * 6.0) * 1.5) * 0.5 + 0.5;
        float ripple = sin(vUv.y * 23.0 - uTime * 3.1 + vUv.x * 4.0) * 0.5 + 0.5;
        vec3 col = mix(uDeep, uSky, 0.32 + flow * 0.18 + ripple * 0.1);
        // a glint is a soft point of light in its cell, not the whole cell: up close the cell was a white rectangle (Day 246)
        vec2 g = vec2(vUv.x * 14.0, vUv.y * 9.0 - uTime * 1.6), cell = floor(g), f = fract(g) - 0.5;
        float spark = smoothstep(0.22, 0.0, length(f * vec2(1.0, 0.55))) + smoothstep(0.05, 0.0, abs(f.x)) * smoothstep(0.3, 0.0, abs(f.y)) * 0.6;
        float glint = step(0.975, h(cell)) * spark * (0.5 + 0.5 * sin(uTime * 6.0 + h(cell + 3.0) * 30.0));
        col += vec3(1.0, 0.93, 0.8) * glint * (1.0 - uNight) * 0.9 + vec3(0.5, 0.9, 1.0) * glint * uNight * 0.6;
        gl_FragColor = vec4(col, 0.82 * edge + 0.1);
        #include <fog_fragment>
      }`.replace(/#include <(\w+)>/g, '\n#include <$1>\n'),
  }));
  water.renderOrder = 1;
  scene.add(water);
  updaters.push((t, tod, sky) => { const night = THREE.MathUtils.smoothstep(tod, 0.55, 0.9); waterU.uTime.value = t; waterU.uNight.value = night;
    waterU.uSky.value.copy(sky.hemi.color).multiplyScalar(0.85 - 0.55 * night); waterU.uDeep.value.setHex(0x1d4250).multiplyScalar(1 - 0.5 * night);
    // day two's bright sky is nearly white, and the stream went white with it: there it takes a blue of its own (night one unchanged)
    if (sky.morning) { waterU.uSky.value.lerp(DAY_WATER, 0.55); waterU.uDeep.value.setHex(0x1f5568); } });

  // ---- organic pieces: soft shapes displaced with 3D noise; the original normals are kept so shading stays smooth ----
  const n3 = (x, y, z) => vnoise(x + z * 1.7, y - z * 0.6) * 0.5 + vnoise(y * 1.3 - x + 11, z + x * 0.4) * 0.5;
  function lumpy(geo, amt, freq) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i);
      v.multiplyScalar(1 + (n3(v.x * freq + 5, v.y * freq, v.z * freq - 3) - 0.5) * amt); p.setXYZ(i, v.x, v.y, v.z); }
    return geo;
  }
  function tierGeo() {          // a bell: rounded shoulder, flared skirt, a wavy hem tucked under
    const prof = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14; prof.push(new THREE.Vector2(Math.pow(Math.sin(u * Math.PI / 2), 0.85), 1 - u * 0.9)); }
    prof.push(new THREE.Vector2(0.86, 0.04), new THREE.Vector2(0.5, 0.0), new THREE.Vector2(0.001, 0.02));
    const g = new THREE.LatheGeometry(prof, 22), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const th = Math.atan2(v.z, v.x), low = 1 - v.y;
      const k = 1 + 0.09 * Math.sin(th * 7) * low * low; v.x *= k; v.z *= k; v.y -= 0.07 * (Math.sin(th * 7) * 0.5 + 0.5) * low * low;
      p.setXYZ(i, v.x, v.y, v.z); }
    return g;
  }
  const blobG = lumpy(new THREE.SphereGeometry(1, 18, 13), 0.38, 1.6);
  const smallBlobG = lumpy(new THREE.SphereGeometry(1, 10, 7), 0.3, 1.8);
  const tierG = tierGeo();

  // ---- trees: soft conifers everywhere; broadleaf trees along the stream, some already turned for October ----
  const trees = [];
  const keepOut = (x, z) => {                               // the clearing, the trail and the stream stay open
    const r = Math.hypot(x, z), ds = Math.abs(x - streamX(z));
    return r < 15.5 || (Math.abs(x) < 3.2 && z > 4) || ds < STREAM_HALF * 2.6;
  };
  for (let i = 0; i < 520 && trees.length < 210; i++) {
    const a = rand() * Math.PI * 2, r = 16 + Math.pow(rand(), 0.7) * 42;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z) || trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
    const nearStream = Math.abs(x - streamX(z)) < 9;
    trees.push({ x, z, s: 0.8 + rand() * 0.7, rot: rand() * 6.3, tint: rand(), broad: nearStream ? rand() < 0.7 : rand() < 0.12 });
  }
  const anchors = [[-6.5, -9.5], [6.8, -9.2], [-10.8, -1.5], [10.6, 1.2], [12.2, -6.8], [12.6, -2.6], [-8.6, 7.4], [7.8, 7.6]];
  for (const [x, z] of anchors) trees.push({ x, z, s: 1.1, rot: rand() * 6.3, tint: rand(), anchor: true, broad: x > 11 });
  const conifers = trees.filter(t => !t.broad), broads = trees.filter(t => t.broad);
  const trunkG = new THREE.CylinderGeometry(0.12, 0.26, 1, 10); trunkG.translate(0, 0.5, 0);
  const bark = addSeeThrough(new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 1 }));
  const trunks = new THREE.InstancedMesh(trunkG, bark, trees.length);
  const TIERS = [[1.85, 1.9, 1.15], [1.45, 1.65, 2.25], [1.05, 1.4, 3.2], [0.66, 1.15, 4.05]];   // radius, height, base y
  const tierM = new THREE.InstancedMesh(tierG, addSeeThrough(addWind(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), { amount: 0.05, height: 1, stiff: 2.4 })), conifers.length * TIERS.length);
  const canopy = [];
  broads.forEach(t => { const n = 6 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + rand(), rr = 0.75 + rand() * 0.5;
      canopy.push({ t, x: Math.cos(a) * rr, y: 3.0 + rand() * 1.1 + (k === 0 ? 0.9 : 0), z: Math.sin(a) * rr, s: 0.85 + rand() * 0.55 }); } });
  const canopyM = new THREE.InstancedMesh(blobG, addSeeThrough(addWind(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }), { amount: 0.12, height: 1, stiff: 1.8 })), canopy.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const deep = new THREE.Color(0x2f5b3e), light = new THREE.Color(0x5b8a4c), blue = new THREE.Color(0x35605c);
  const AUTUMN = [0xd9a441, 0xe08a3c, 0xc85a3a, 0xe8c25a], SUMMER = [0x7aa64f, 0x8fb85a, 0x6c9a48];
  trees.forEach((t, i) => {
    const hgt = t.broad ? 3.2 : 1.4;
    q.setFromAxisAngle(up, t.rot); pv.set(t.x, heightAt(t.x, t.z) - 0.05, t.z);
    t.gone = !t.anchor && hikeClear(t.x, t.z);                                     // on the hike path: not there (and not solid)
    m.compose(pv, q, t.gone ? sv.set(0, 0, 0) : sv.set(t.s * (t.broad ? 0.85 : 1), t.s * hgt, t.s * (t.broad ? 0.85 : 1))); trunks.setMatrixAt(i, m);
    if (!t.gone) blockers.push({ x: t.x, z: t.z, r: 0.45 * t.s });
  });
  conifers.forEach((t, i) => {
    const c = deep.clone().lerp(light, t.tint * 0.7).lerp(blue, t.tint > 0.72 ? 0.45 : 0), base = heightAt(t.x, t.z);
    TIERS.forEach(([rad, h, y], k) => {
      q.setFromAxisAngle(up, t.rot + k * 0.7); pv.set(t.x, base + y * t.s, t.z);
      m.compose(pv, q, t.gone ? sv.set(0, 0, 0) : sv.set(rad * t.s, h * t.s, rad * t.s)); tierM.setMatrixAt(i * TIERS.length + k, m);
      tierM.setColorAt(i * TIERS.length + k, c.clone().offsetHSL(0, 0, k * 0.03));
    });
  });
  canopy.forEach((b, i) => {
    const t = b.t, base = heightAt(t.x, t.z), autumn = Math.abs(t.x - streamX(t.z)) < 9 && t.tint < 0.55;
    const pal = autumn ? AUTUMN : SUMMER, col = new THREE.Color(pal[Math.floor(t.tint * 97) % pal.length]);
    q.setFromEuler(new THREE.Euler(rand(), rand() * 6, rand()));
    pv.set(t.x + b.x * t.s, base + b.y * t.s, t.z + b.z * t.s);
    m.compose(pv, q, t.gone ? sv.set(0, 0, 0) : sv.set(b.s * t.s, b.s * t.s * 0.85, b.s * t.s)); canopyM.setMatrixAt(i, m);
    canopyM.setColorAt(i, col.offsetHSL((rand() - 0.5) * 0.03, 0, (rand() - 0.5) * 0.08 + (b.y > 3.8 ? 0.05 : 0)));
  });
  for (const im of [trunks, tierM, canopyM]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }

  // ---- boulders: round, lumpy, moss on whatever faces the sky ----
  const rockG = lumpy(new THREE.SphereGeometry(1, 16, 11), 0.42, 1.3);
  { const n = rockG.attributes.normal, cc = [];
    for (let i = 0; i < n.count; i++) { const mo = THREE.MathUtils.smoothstep(n.getY(i), 0.35, 0.85);
      cc.push(1 - mo * 0.35, 1 - mo * 0.08, 1 - mo * 0.45); }
    rockG.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); }
  const rocks = [];
  for (let i = 0; i < 70; i++) {
    const z = -40 + rand() * 80, side = rand() < 0.5 ? -1 : 1;
    rocks.push([streamX(z) + side * (STREAM_HALF * (1.0 + rand() * 0.9)), z, 0.25 + rand() * 0.5]);
  }
  for (let i = 0; i < 26; i++) { const a = rand() * 6.3, r = 13 + rand() * 5; rocks.push([Math.cos(a) * r, Math.sin(a) * r, 0.3 + rand() * 0.6]); }
  const rockM = new THREE.InstancedMesh(rockG, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95 }), rocks.length);
  rocks.forEach(([x, z, s], i) => {
    q.setFromEuler(new THREE.Euler(0, rand() * 6, 0)); pv.set(x, heightAt(x, z) + s * 0.15, z);
    const gone = hikeClear(x, z, -0.6);
    m.compose(pv, q, gone ? sv.set(0, 0, 0).addScalar(rand() * 0) : sv.set(s * (1 + rand() * 0.5), s * 0.62, s)); rockM.setMatrixAt(i, m);
    rockM.setColorAt(i, new THREE.Color(0x857f74).offsetHSL(0, -0.02, (rand() - 0.5) * 0.1));
    if (s > 0.45 && !gone) blockers.push({ x, z, r: s * 0.9 });
  });
  rockM.castShadow = true; rockM.receiveShadow = true; scene.add(rockM);

  // ---- bushes: two to four soft puffs each, denser toward the trees ----
  const puffs = [];
  for (let i = 0; i < 700 && puffs.length < 420; i++) {
    const a = rand() * 6.3, r = 10 + Math.pow(rand(), 0.6) * 38, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) < 12 || (Math.abs(x) < 2.6 && z > 4) || Math.abs(x - streamX(z)) < STREAM_HALF * 1.4) continue;
    const n = 2 + Math.floor(rand() * 3), tone = rand();
    for (let k = 0; k < n; k++) puffs.push([x + (rand() - 0.5) * 0.8, z + (rand() - 0.5) * 0.8, 0.32 + rand() * 0.3, tone]);
  }
  const bushM = new THREE.InstancedMesh(smallBlobG, addWind(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), { amount: 0.07, height: 1 }), puffs.length);
  puffs.forEach(([x, z, s, tone], i) => {
    q.setFromEuler(new THREE.Euler(rand(), rand() * 6, rand())); pv.set(x, heightAt(x, z) + s * 0.45, z);
    m.compose(pv, q, hikeClear(x, z, -1.2) ? sv.set(0, 0, 0) : sv.set(s, s * 0.8, s)); bushM.setMatrixAt(i, m);
    bushM.setColorAt(i, new THREE.Color(tone < 0.15 ? 0x9a8a40 : 0x4f7a3a).offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.1));
  });
  bushM.castShadow = true; bushM.receiveShadow = true; scene.add(bushM);

  // ---- clover clumps and little flowers in the clearing, kept out of the hangout circle and the trail ----
  const clumps = [];
  for (let i = 0; i < 1600 && clumps.length < 220; i++) {
    const a = rand() * 6.3, r = 5.5 + Math.sqrt(rand()) * 11, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if ((Math.abs(x - Math.sin(z * 0.18) * 1.2) < 1.3 && z > 3) || Math.abs(x - streamX(z)) < STREAM_HALF * 1.6) continue;
    clumps.push([x, z, 0.07 + rand() * 0.07]);
  }
  const clumpM = new THREE.InstancedMesh(smallBlobG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), clumps.length);
  clumps.forEach(([x, z, s], i) => { q.setFromEuler(new THREE.Euler(0, rand() * 6, 0)); pv.set(x, heightAt(x, z) + s * 0.2, z);
    m.compose(pv, q, sv.set(s * 1.3, s * 0.95, s * 1.3)); clumpM.setMatrixAt(i, m);
    clumpM.setColorAt(i, new THREE.Color(0x6e9a48).offsetHSL((rand() - 0.5) * 0.05, 0, (rand() - 0.5) * 0.1)); });
  clumpM.receiveShadow = true;   // replaced by the grass field (effects.js); kept out of the scene
  const flowerG = new THREE.SphereGeometry(0.055, 6, 4); flowerG.translate(0, 0.2, 0);
  const FLOWER = [0xfff6d8, 0xffd166, 0xf5a9b8, 0xb9d8ff, 0xffffff];
  const flowers = new THREE.InstancedMesh(flowerG, addWind(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), { amount: 0.06, height: 0.25 }), 160);
  for (let i = 0; i < 160; i++) { const a = rand() * 6.3, r = 3 + Math.sqrt(rand()) * 12, x = Math.cos(a) * r, z = Math.sin(a) * r;
    pv.set(x, heightAt(x, z), z); m.compose(pv, q.identity(), sv.setScalar(0.7 + rand() * 0.6)); flowers.setMatrixAt(i, m);
    flowers.setColorAt(i, new THREE.Color(FLOWER[Math.floor(rand() * FLOWER.length)])); }
  scene.add(flowers);

  // ---- mushrooms by the stream: ordinary by day, softly glowing teal and pink after dark ----
  const capG = new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), stemG = new THREE.CylinderGeometry(0.035, 0.05, 0.18, 6);
  stemG.translate(0, 0.09, 0); capG.translate(0, 0.17, 0);
  const capTeal = new THREE.MeshStandardMaterial({ color: 0xcfe9e3, emissive: 0x3ff0d8, emissiveIntensity: 0, roughness: 0.6 });
  const capPink = new THREE.MeshStandardMaterial({ color: 0xf2dcdf, emissive: 0xff7fb0, emissiveIntensity: 0, roughness: 0.6 });
  const stemM = new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.9 });
  glowMats.push(capTeal, capPink);
  for (let i = 0; i < 22; i++) {
    const z = -14 + rand() * 30, x = streamX(z) - STREAM_HALF * (1.7 + rand() * 1.5);
    const n = 2 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const s = 0.6 + rand() * 0.9, mx = x + (rand() - 0.5) * 0.7, mz = z + (rand() - 0.5) * 0.7, y = heightAt(mx, mz);
      const stem = new THREE.Mesh(stemG, stemM), cap = new THREE.Mesh(capG, rand() < 0.62 ? capTeal : capPink);
      for (const p of [stem, cap]) { p.position.set(mx, y, mz); p.scale.setScalar(s); scene.add(p); }
    }
  }
  updaters.push((t, tod) => { const g = THREE.MathUtils.smoothstep(tod, 0.55, 0.85);
    capTeal.emissiveIntensity = g * (1.6 + 0.25 * Math.sin(t * 1.3)); capPink.emissiveIntensity = g * (1.4 + 0.25 * Math.sin(t * 1.1 + 2)); });

  // ---- the fire ring: stones round a hollow, two crossed logs, all waiting to be lit ----
  const ring = new THREE.Group(); ring.name = 'fire-ring';
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x8a8378, vertexColors: true, roughness: 0.95 });
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2, st = new THREE.Mesh(rockG, stoneM);
    st.position.set(Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95); st.scale.set(0.26, 0.2, 0.22); st.rotation.set(rand(), rand() * 6, rand());
    st.castShadow = st.receiveShadow = true; ring.add(st);
  }
  const logM = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 1 });
  for (const r of [0.5, -0.6]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.2, 14), logM);
    lg.rotation.set(0, r, Math.PI / 2); lg.position.y = 0.14; lg.castShadow = true; ring.add(lg); }
  ring.position.set(0, heightAt(0, 0), 0);
  scene.add(ring);
  blockers.push({ x: 0, z: 0, r: 1.15 });

  // ---- fireflies: points that wander near the trees and come out at dusk ----
  const FF = 140, ffPos = new Float32Array(FF * 3), ffBase = [];
  for (let i = 0; i < FF; i++) { const a = rand() * 6.3, r = 9 + rand() * 12; ffBase.push([Math.cos(a) * r, Math.sin(a) * r, rand() * 6.3, 0.5 + rand() * 1.6]); }
  const ffG = new THREE.BufferGeometry(); ffG.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  const dc = dot.getContext('2d'), grd = dc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,220,1)'); grd.addColorStop(0.25, 'rgba(230,255,140,0.75)'); grd.addColorStop(1, 'rgba(200,255,120,0)');
  dc.fillStyle = grd; dc.fillRect(0, 0, 64, 64);
  const ffM = new THREE.PointsMaterial({ size: 0.32, map: new THREE.CanvasTexture(dot), color: 0xeaff9a, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const fireflies = new THREE.Points(ffG, ffM); fireflies.frustumCulled = false; scene.add(fireflies);
  updaters.push((t, tod) => {
    ffM.opacity = THREE.MathUtils.smoothstep(tod, 0.5, 0.8);
    if (ffM.opacity <= 0) return;
    for (let i = 0; i < FF; i++) { const [bx, bz, ph, sp] = ffBase[i];
      const x = bx + Math.sin(t * 0.23 * sp + ph) * 1.6, z = bz + Math.cos(t * 0.19 * sp + ph * 1.3) * 1.6;
      ffPos[i * 3] = x; ffPos[i * 3 + 2] = z; ffPos[i * 3 + 1] = heightAt(x, z) + 0.6 + Math.sin(t * 0.7 * sp + ph) * 0.45 + (i % 3) * 0.35;
      if (Math.sin(t * 1.7 * sp + ph * 5) < -0.6) ffPos[i * 3 + 1] = -50;   // each one blinks off now and then
    }
    ffG.attributes.position.needsUpdate = true;
  });

  return { blockers, anchors, glowMats, ring, update: (t, tod, sky) => updaters.forEach(f => f(t, tod, sky)) };
}
