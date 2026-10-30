// Plush critters: animal people sculpted from melted shapes, chubby and soft, like plushies that came alive. Fur is
// long where real fur is long (cheeks, chests, tails) and short on the face. Faces are rigged for feeling: lids that
// blink, smile and squeeze shut, brows that lift and worry, ears that perk and droop, a mouth that opens when they
// talk. Jerika, Day 245: "the heads are just orbs", "the bodies and arms and legs are kinda just orbs too", "the ears
// don't look organic, just sharp triangles", "they kinda don't seem like they could have emotion? except lumi", and
// cute, not lanky ("fantastic mr fox was a little creepy ... so tall and slim").
import * as THREE from 'three';
import { ell, sph, cone, add, cut, field, sculpt, surfaceAlong } from './sculpt.js';

const C = hex => new THREE.Color(hex), ss = THREE.MathUtils.smoothstep, V3 = THREE.Vector3;

// ---- shared light: a soft camera-side fill on the critters, and the sky reflected in noses and Lumi's glass ----
export const look = { fill: { value: new THREE.Color(0, 0, 0) }, env: null, glossy: [] };
export const glossy = m => { look.glossy.push(m); if (look.env) { m.envMap = look.env; m.needsUpdate = true; } return m; };
export function setEnv(tex) { look.env = tex; for (const m of look.glossy) { m.envMap = tex; m.needsUpdate = true; } }
export function withFill(m) {
  m.onBeforeCompile = s => { s.uniforms.uFill = look.fill;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill;')
      .replace('#include <opaque_fragment>', `outgoingLight += diffuseColor.rgb * uFill * (0.3 + 0.7 * saturate(dot(normalize(normal), normalize(vViewPosition))));
        #include <opaque_fragment>`); };
  m.customProgramCacheKey = () => 'fill'; return m;
}
export const FUR = { n: 6, len: 0.021, fine: false };   // a short plush pile: Day 245, longer strands "read like spines"
// fine: the big-screen pile (Day 246, on her PC: "the spiny fur looks especially spiny on the big screen... not very furry"):
// thinner strands in two interleaved fields so no grid shows, each its own length and shade, combed down a little more
export function setFurShells(n, fine = false) { FUR.n = n; FUR.fine = fine; }

// needle-felted wool for the skin under the fur: a fibre texture as colour variation and as a normal map
function woolCanvas(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const x = r() * 256, y = r() * 256, a = r() * Math.PI, l = 3 + r() * 9, v = 90 + r() * 110;
    g.strokeStyle = `rgba(${v},${v},${v},0.55)`; g.lineWidth = 0.6 + r() * 1.1;
    g.beginPath(); g.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); g.quadraticCurveTo(x + r() * 3, y + r() * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return c;
}
export const WOOL_MAP = (() => { const c = woolCanvas(11), g = c.getContext('2d'), d = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 222 + (d.data[i] - 128) * 0.22; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t; })();
export const WOOL_NORMAL = (() => { const c = woolCanvas(29), g = c.getContext('2d'), src = g.getImageData(0, 0, 256, 256).data, out = g.createImageData(256, 256);
  const h = (x, y) => src[(((y + 256) % 256) * 256 + ((x + 256) % 256)) * 4] / 255;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = (h(x + 1, y) - h(x - 1, y)) * 2.2, dy = (h(x, y + 1) - h(x, y - 1)) * 2.2;
    const n = new V3(-dx, -dy, 1).normalize(), i = (y * 256 + x) * 4;
    out.data[i] = (n.x * 0.5 + 0.5) * 255; out.data[i + 1] = (n.y * 0.5 + 0.5) * 255; out.data[i + 2] = (n.z * 0.5 + 0.5) * 255; out.data[i + 3] = 255; }
  g.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t; })();

// ---- fur: the skin, plus shells pushed out along the normal by however long the fur is at that spot ----
// Strands come from a 3D cell pattern on the skin's own position, so the same strand runs up through every shell and
// tapers; roots are darker than tips; the outer shells droop a little, the way fur does. A per-critter blush uniform
// pinks the cheeks (painted as a vertex weight), so a flustered critter can go red.
function furHook(m, k, n, blush) {
  const uK = { value: n ? k / n : 0 }, uLen = { value: n ? FUR.len * k / n : 0 };
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, { uK, uLen, uFill: look.fill }); if (blush) s.uniforms.uBlush = blush;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float fur; attribute float cheek; varying float vFur; varying float vCheek; varying vec3 vBase; uniform float uLen; uniform float uK;`)
      .replace('#include <project_vertex>', `vFur = fur; vCheek = cheek; vBase = position;
        vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
        mvPosition.xyz += normalize( transformedNormal ) * uLen * fur;
        mvPosition.xyz += ( viewMatrix * vec4( 0.0, -1.0, 0.0, 0.0 ) ).xyz * uLen * fur * uK * ${FUR.fine ? '0.3' : '0.25'};
        gl_Position = projectionMatrix * mvPosition;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vFur; varying float vCheek; varying vec3 vBase; uniform float uK; uniform vec3 uFill; ${blush ? 'uniform float uBlush;' : ''}
        vec3 h3(vec3 c) { return fract(sin(vec3(dot(c, vec3(127.1, 311.7, 74.7)), dot(c, vec3(269.5, 183.3, 246.1)), dot(c, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }`)
      .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
        ${blush ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.42, 0.5), clamp(vCheek * uBlush, 0.0, 0.55));' : ''}
        diffuseColor.rgb *= mix(1.0 - ${FUR.fine ? '0.18' : '0.14'} * vFur, ${FUR.fine ? '1.04' : '1.02'}, uK);
        ${k > 0 && FUR.fine ? `if (vFur < 0.04) discard;
        vec3 q = vBase * 140.0, q2 = q * 1.37 + 0.5, r1 = h3(floor(q)), r2 = h3(floor(q2) + 7.0);
        float d1 = length(fract(q) - 0.5 - (r1 - 0.5) * 0.5), d2 = length(fract(q2) - 0.5 - (r2 - 0.5) * 0.5);
        float t1 = uK / (0.8 + 0.2 * r1.z), t2 = uK / (0.8 + 0.2 * r2.z);           // each strand its own length
        float R1 = mix(0.66, 0.4, t1 * t1), R2 = mix(0.66, 0.4, t2 * t2);
        float a1 = t1 > 1.0 ? 0.0 : 1.0 - smoothstep(R1 - 2.0 * fwidth(d1), R1, d1);
        float a2 = t2 > 1.0 ? 0.0 : 1.0 - smoothstep(R2 - 2.0 * fwidth(d2), R2, d2);
        // further off a strand is smaller than a pixel: an even coverage then, instead of a sparkle
        diffuseColor.a = mix(max(a1 * (1.0 - 0.5 * t1 * t1), a2 * (1.0 - 0.5 * t2 * t2)), 0.6 * (1.0 - uK), smoothstep(0.7, 1.5, length(fwidth(q))));
        if (diffuseColor.a < 0.04) discard;
        diffuseColor.rgb *= 0.95 + 0.1 * (a1 > a2 ? r1.x : r2.x);` : k > 0 ? `if (vFur < 0.04) discard;
        vec3 q = vBase * 125.0, fc = fract(q) - 0.5, o = h3(floor(q)) - 0.5;
        float dd = length(fc - o * 0.4), rr = mix(0.74, 0.36, uK * uK);
        diffuseColor.a = 1.0 - smoothstep(rr - 2.0 * fwidth(dd), rr, dd);` : ''}`)
      .replace('#include <opaque_fragment>', `outgoingLight += diffuseColor.rgb * uFill * (0.3 + 0.7 * saturate(dot(normalize(normal), normalize(vViewPosition))));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'fur' + (k > 0 ? 's' : 'b') + (blush ? 'c' : '') + (FUR.fine ? 'f' : ''); return m;
}
const skinMat = (sheen, blush) => furHook(new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, map: WOOL_MAP, normalMap: WOOL_NORMAL,
  normalScale: new THREE.Vector2(0.55, 0.55), sheen: 0.3, sheenRoughness: 0.8, sheenColor: C(sheen).lerp(C(0xffffff), 0.4) }), 0, 0, blush);
const shellCache = {};
const shellMat = (k, n, blush) => {
  const make = () => furHook(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, alphaTest: FUR.fine ? 0 : 0.5, alphaToCoverage: true }), k, n, blush);
  if (blush) return make();
  return (shellCache[k + '/' + n] ??= make());
};
// several copies of one indexed geometry, each already moved into place, as one geometry (the vendored three has no
// BufferGeometryUtils, and copies of a single geometry need only this much)
function mergeCopies(geos) {
  const out = new THREE.BufferGeometry(), first = geos[0], n0 = first.attributes.position.count, idx0 = first.index.array;
  for (const name of Object.keys(first.attributes)) { const { itemSize } = first.attributes[name], arr = new Float32Array(n0 * itemSize * geos.length);
    geos.forEach((g, i) => arr.set(g.attributes[name].array, i * n0 * itemSize)); out.setAttribute(name, new THREE.BufferAttribute(arr, itemSize)); }
  const idx = new Uint32Array(idx0.length * geos.length);
  geos.forEach((g, i) => { for (let k = 0; k < idx0.length; k++) idx[i * idx0.length + k] = g.index.array[k] + i * n0; });
  out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
}
function furred(geo, sheen, blush) {             // the skin mesh, with its shells as children
  const m = new THREE.Mesh(geo, skinMat(sheen, blush)); m.castShadow = true;
  for (let k = 1; k <= FUR.n; k++) { const s = new THREE.Mesh(geo, shellMat(k, FUR.n, blush)); s.renderOrder = 1; m.add(s); }
  return m;
}

// ---- the painted eye: a warm iris, darker at the top where the lid shades it, a soft pupil, three catchlights ----
// (Her one compliment on Day 245 was the eyes, so the paint stays; what changed is that it sits on an eyeball now.)
function painted(draw, edge, S = 128) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.lineCap = g.lineJoin = 'round'; draw(g, S);
  const src = g.getImageData(0, 0, S, S).data, out = new Uint8Array(S * S * 4), er = edge >> 16 & 255, eg = edge >> 8 & 255, eb = edge & 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, o = ((S - 1 - y) * S + x) * 4, a = src[i + 3], k = Math.min(1, a / 96);
    out[o] = src[i] * k + er * (1 - k); out[o + 1] = src[i + 1] * k + eg * (1 - k); out[o + 2] = src[i + 2] * k + eb * (1 - k); out[o + 3] = a; }
  const t = new THREE.DataTexture(out, S, S); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true; return t;
}
const INK = 0x2a1810, eyeTexs = {}, shutTexs = {};
// the open eye, drawn by a shader on a patch flush with the face: a soft upright oval with a lash line, a sliver of
// warm white, and a big iris (lit from below, fibres round it, a pupil, two catchlights) that can move, so you can
// see where they're looking. Day 245, the 3D eyeballs "a bit beady and lifeless"; the painted ones she liked.
function eyeMaterial(iris, slit) {
  const u = { uIris: { value: C(iris) }, uLook: { value: new THREE.Vector2() }, uSlit: { value: slit ? 1 : 0 } };
  const m = withFill(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, depthWrite: false }));
  const fill = m.onBeforeCompile;
  m.onBeforeCompile = s => { fill(s); Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vEyeUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvEyeUv = uv;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vEyeUv; uniform vec3 uIris; uniform vec2 uLook; uniform float uSlit;`)
      .replace('#include <map_fragment>', `
      vec2 p = (vEyeUv - 0.5) * 2.0;
      float e = length(p / vec2(0.8, 0.92)), aa = fwidth(e) * 1.3;
      if (e > 1.0 + aa) discard;
      vec3 ink = vec3(0.11, 0.065, 0.04);
      vec3 sclera = mix(vec3(0.97, 0.93, 0.87), vec3(0.7, 0.62, 0.58), smoothstep(-0.15, 0.9, p.y));
      vec2 ic = uLook * vec2(0.13, 0.05) + vec2(0.0, 0.1);            // a little high, tucked under the lid: warm, not startled
      vec2 q = (p - ic) / vec2(0.63, 0.74);
      float ir = length(q), ia = fwidth(ir) * 1.5;
      vec3 iris = mix(uIris * 1.4 + 0.06, uIris * 0.48, smoothstep(-0.95, 0.8, q.y));
      iris *= 0.88 + 0.12 * sin((ir > 1e-4 ? atan(q.y, q.x) : 0.0) * 19.0) * smoothstep(0.35, 0.95, ir);   // atan(0,0) is NaN on some GPUs
      float pr = uSlit > 0.5 ? length(q / vec2(0.26, 0.82)) : ir / 0.46;
      vec3 col = mix(vec3(0.05, 0.03, 0.02), iris, smoothstep(1.0 - 4.0 * ia, 1.0, pr));
      col = mix(col, ink, smoothstep(0.84, 1.0, ir));
      col = mix(col, sclera, smoothstep(1.0 - ia, 1.0 + ia, ir));
      vec2 c1 = (p - ic - vec2(-0.19, 0.25)) / vec2(1.0, 1.15), c2 = p - ic - vec2(0.21, -0.25);
      col = mix(col, vec3(1.0, 0.985, 0.95), 1.0 - smoothstep(0.15 - ia, 0.15 + ia, length(c1)));
      col = mix(col, vec3(1.0, 0.985, 0.95), 1.0 - smoothstep(0.065 - ia, 0.065 + ia, length(c2)));
      float lash = mix(0.9, 0.8, smoothstep(0.1, 0.7, p.y));
      col = mix(col, ink, smoothstep(lash - aa, lash + aa, e));
      diffuseColor = vec4(col, 1.0 - smoothstep(1.0 - aa, 1.0 + aa, e));`); };
  m.customProgramCacheKey = () => 'eye'; m.userData.u = u; return m;
}
// a shut eye: the lid, in whatever colour the face is there (the material tints this white), with the line that says
// how it's shut: blink ◡, happy ^, flustered > <
function shutTex(state, lid) {
  const hexs = c => '#' + c.getHexString(), dark = lid.r * 0.3 + lid.g * 0.59 + lid.b * 0.11 < 0.06;
  return (shutTexs[state + lid.getHex()] ??= painted((g, S) => {
    const cx = S / 2, cy = S / 2, gr = g.createRadialGradient(cx, cy, S * 0.33, cx, cy, S * 0.5), c = lid.clone().convertLinearToSRGB();
    gr.addColorStop(0, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},1)`); gr.addColorStop(1, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.strokeStyle = dark ? '#cfc6be' : '#2a1810'; g.lineWidth = S * 0.06; g.beginPath();
    if (state === 'happy') { g.moveTo(S * 0.3, S * 0.58); g.quadraticCurveTo(cx, S * 0.3, S * 0.7, S * 0.58); }
    else if (state === 'blink') { g.moveTo(S * 0.29, S * 0.47); g.quadraticCurveTo(cx, S * 0.64, S * 0.71, S * 0.47); }
    else { const d = state === 'squeezeL' ? 1 : -1;
      g.moveTo(cx - d * S * 0.13, S * 0.37); g.lineTo(cx + d * S * 0.12, cy); g.lineTo(cx - d * S * 0.13, S * 0.63); }
    g.stroke();
  }, lid.clone().convertLinearToSRGB().getHex()));
}
function eyeTex(iris, slit) {
  const col = C(iris), hex = c => '#' + c.getHexString();
  return (eyeTexs[iris + ':' + slit] ??= painted((g, S) => {
    const cx = S / 2, cy = S / 2, rx = S * 0.4, ry = S * 0.44;
    const gr = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    gr.addColorStop(0, hex(col.clone().multiplyScalar(0.28))); gr.addColorStop(0.55, hex(col)); gr.addColorStop(1, hex(col.clone().lerp(C(0xfff2d6), 0.5)));
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill();
    g.fillStyle = '#170c07'; g.beginPath();
    if (slit) g.ellipse(cx, cy, rx * 0.28, ry * 0.72, 0, 0, 7); else g.ellipse(cx, cy - S * 0.01, rx * 0.52, ry * 0.52, 0, 0, 7); g.fill();
    g.fillStyle = '#fffaf2';
    g.beginPath(); g.ellipse(cx - rx * 0.36, cy - ry * 0.34, rx * 0.3, ry * 0.26, -0.5, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + rx * 0.4, cy + ry * 0.4, rx * 0.13, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + rx * 0.42, cy - ry * 0.46, rx * 0.07, 0, 7); g.fill();
  }, INK));
}
const Z = new V3(0, 0, 1);
function decal(on, yaw, pitch, w, h, mat, lift) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 20, Math.PI / 2 - w / 2, w, Math.PI / 2 - h / 2, h), mat);
  m.quaternion.setFromUnitVectors(Z, new V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)));
  m.scale.setScalar(lift); on.add(m); return m;
}
const SHADOW_TEX = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'),
  gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

// ---- who's who: palette, head and body shape, ears, tail ----
// muzzle: [y0, z0, y1, z1, r0, r1] a round cone from the face out to the tip of the snout
const SPECIES = {
  fox:      { coat: 0xe07a3c, light: 0xfbeee0, dark: 0x3a2a24, inner: 0xf6e2cc, nose: 0x2e1c16, iris: 0xb0682c, brow: 0x9a4a22,
              muzzle: [0.13, 0.09, 0.085, 0.31, 0.085, 0.032], ear: { len: 0.21, wid: 0.085, thick: 0.03, tip: 0.32, at: [0.125, 0.32, -0.02], tilt: 0.38 },
              tail: 'fox', socks: true },
  cat:      { coat: 0x55555e, light: 0xe2ded6, dark: 0x2a2830, inner: 0xf3b8c4, nose: 0xe88aa0, iris: 0x9a8a3c, brow: 0x8a8494, slit: true,
              muzzle: [0.12, 0.1, 0.1, 0.205, 0.08, 0.05], pads: true, ear: { len: 0.155, wid: 0.078, thick: 0.026, tip: 0.38, at: [0.12, 0.335, 0], tilt: 0.34 },
              tail: 'cat' },
  dog:      { coat: 0xe2b06a, light: 0xfbecd2, dark: 0xc98f4e, inner: 0xc98f4e, nose: 0x33201a, iris: 0x7a4a2a, brow: 0xa8743c, open: true,
              muzzle: [0.13, 0.09, 0.09, 0.27, 0.092, 0.058], ear: { len: 0.18, wid: 0.075, thick: 0.026, tip: 0.8, at: [0.175, 0.29, -0.01], tilt: 2.75, flop: true },
              tail: 'dog' },
  raccoon:  { coat: 0x8e8c94, light: 0xece8e2, dark: 0x3e3836, inner: 0xd8c8c8, nose: 0x2a1c18, iris: 0x7a5236, brow: 0xece8e2,
              muzzle: [0.13, 0.09, 0.085, 0.29, 0.08, 0.033], ear: { len: 0.115, wid: 0.072, thick: 0.025, tip: 0.85, at: [0.14, 0.32, -0.02], tilt: 0.55 },
              tail: 'raccoon', mask: true },
  badger:   { coat: 0x98979e, light: 0xf4f1ea, dark: 0x3e3836, inner: 0x5a5458, nose: 0x2a1c18, iris: 0x6a4430, brow: 0xf4f1ea,
              muzzle: [0.13, 0.09, 0.08, 0.3, 0.085, 0.032], ear: { len: 0.075, wid: 0.06, thick: 0.024, tip: 0.95, at: [0.16, 0.3, -0.04], tilt: 0.85 },
              tail: 'stub', stripes: true },
  capybara: { coat: 0xb07f52, light: 0xc9996c, dark: 0x7a5232, inner: 0x7a5232, nose: 0x2e1c14, iris: 0x6a4228, brow: 0x7a5232,
              muzzle: [0.2, 0.06, 0.16, 0.25, 0.125, 0.112], muzzleK: 0.1, cranium: [0.98, 0.88], eyeAt: [0.112, 0.262], eyeR: 0.033, eyeW: 0.07,
              headExtra: () => [add(ell(0, 0.2, 0.11, 0.15, 0.14, 0.16), 0.1)],
              ear: { len: 0.05, wid: 0.042, thick: 0.02, tip: 0.95, at: [0.15, 0.33, -0.06], tilt: 0.6 }, tail: null, w: 1.18 },
  hedgehog: { coat: 0xeedcc2, light: 0xf6eadb, dark: 0x6e4c34, inner: 0xe0bea0, nose: 0x2a1c18, iris: 0x6a4430, brow: 0x8a6448,
              muzzle: [0.11, 0.1, 0.075, 0.3, 0.072, 0.024], ear: { len: 0.06, wid: 0.048, thick: 0.02, tip: 0.95, at: [0.15, 0.29, 0.06], tilt: 0.7 },
              tail: null, quills: true },
  fawn:     { coat: 0xc98a52, light: 0xf6e8d2, dark: 0x7a5236, inner: 0xf6d3c8, nose: 0x2a1c18, iris: 0x5e3822, brow: 0x8a5a36, cranium: [0.92, 1.02], eyeW: 0.1,
              muzzle: [0.13, 0.09, 0.075, 0.3, 0.074, 0.036], ear: { len: 0.2, wid: 0.082, thick: 0.022, tip: 0.5, at: [0.15, 0.31, -0.02], tilt: 0.95 },
              tail: 'tuft', spots: true },
  bunny:    { coat: 0xf1ebe2, light: 0xffffff, dark: 0xd8cfc4, inner: 0xf6c1cf, nose: 0xf08ca4, iris: 0x8a4e5e, brow: 0xc8bcb0,
              muzzle: [0.12, 0.1, 0.1, 0.19, 0.08, 0.055], pads: true, ear: { len: 0.26, wid: 0.068, thick: 0.024, tip: 0.6, at: [0.08, 0.36, -0.03], tilt: 0.18 },
              tail: 'pom' },
};

// ---- the parts ----
const geoCache = {};
const H = { hi: 0.0072 };                     // sculpting resolution: grid step in metres (phones get a coarser one)
export function setSculptDetail(high) { H.hi = high ? 0.0072 : 0.0105; }

function bodyGeo(sp, W, key) {
  return (geoCache['body:' + key] ??= (() => {
    const f = field([
      add(ell(0, 0.33, 0, 0.2 * W, 0.19, 0.18 * W)),                     // a round tummy
      add(ell(0, 0.24, -0.025, 0.17 * W, 0.11, 0.15 * W), 0.08),           // a bottom to sit on
      add(ell(0, 0.49, 0.012, 0.155 * W, 0.15, 0.14 * W), 0.09),           // chest
      add(ell(0, 0.59, 0, 0.115 * W, 0.075, 0.105 * W), 0.08),             // shoulders, into the neck
    ]);
    const belly = C(sp.light), dark = C(sp.dark);
    return sculpt(f, [-0.3 * W, 0.08, -0.26 * W], [0.3 * W, 0.7, 0.26 * W], H.hi * 1.25, { center: [0, 0.38, 0],
      paint: (c, x, y, z) => { c.set(sp.coat);
        c.lerp(belly, (1 - ss(Math.hypot(x / (0.125 * W), (y - 0.4) / 0.19), 0.72, 1)) * ss(z, 0.03, 0.12));
        if (sp.spots) for (const [sx, sy] of [[0.07, 0.5], [-0.09, 0.44], [0.02, 0.36], [0.11, 0.33], [-0.05, 0.27], [0.09, 0.56]])
          c.lerp(belly, (1 - ss(Math.hypot(x - sx, y - sy), 0.018, 0.03)) * ss(-z, 0.04, 0.1));
        if (sp.stripes) c.lerp(C(0x6e6a6e), (1 - ss(Math.hypot(x / (0.125 * W), (y - 0.4) / 0.19), 0.72, 1)) * ss(z, 0.03, 0.12));
      },
      fur: (x, y, z) => 0.62 + 0.38 * ss(z, 0.04, 0.14) * ss(y, 0.42, 0.55) });      // a fluffy chest ruff
  })());
}
function limbGeo(sp, kind, key, species) {             // an arm (a paw on the end) or a leg (a foot with three toe bumps)
  return (geoCache[kind + ':' + key] ??= (() => {
    const leg = kind === 'leg';
    const f = field(leg ? [
      add(cone(0, 0, 0, 0, -0.165, 0.01, 0.085, 0.062)),
      add(ell(0, -0.2, 0.045, 0.07, 0.042, 0.095), 0.045),
      add(sph(0.028, -0.21, 0.115, 0.024), 0.02), add(sph(0, -0.21, 0.125, 0.025), 0.02), add(sph(-0.028, -0.21, 0.115, 0.024), 0.02),
    ] : [
      add(cone(0, 0, 0, 0, -0.165, 0.02, 0.056, 0.046)),
      add(ell(0, -0.195, 0.03, 0.052, 0.05, 0.05), 0.04),
      add(sph(0.032, -0.18, 0.05, 0.021), 0.02),
    ]);
    const dark = C(sp.dark), light = C(sp.light);
    return sculpt(f, leg ? [-0.1, -0.27, -0.1] : [-0.08, -0.28, -0.08], leg ? [0.1, 0.1, 0.18] : [0.08, 0.07, 0.11], H.hi, { center: [0, -0.1, 0],
      paint: (c, x, y) => { c.set(sp.coat);
        if (sp.socks || sp.stripes || sp.mask) c.lerp(dark, ss(-y, leg ? 0.09 : 0.11, leg ? 0.15 : 0.16));
        if (species === 'hedgehog') c.lerp(light, 0.3); },
      fur: (x, y) => 0.5 - 0.3 * ss(-y, 0.14, 0.2) });
  })());
}
function earGeo(sp, key) {
  return (geoCache['ear:' + key] ??= (() => {
    const e = sp.ear, L = e.len, W = e.wid, T = e.thick;
    const f = field([
      add(ell(0, L * 0.2, 0, W, L * 0.28, T)),
      add(ell(0, L * 0.52, 0, W * 0.8, L * 0.32, T * 0.85), 0.05),
      add(ell(0, L * 0.82, 0, W * e.tip, L * 0.2, T * 0.7), 0.045),
      cut(ell(0, L * 0.5, T * 0.9, W * 0.6, L * 0.4, T * 0.72), 0.015),       // the cup
    ]);
    const inner = C(sp.inner), dark = C(sp.dark), light = C(sp.light);
    return sculpt(f, [-W - 0.02, -0.06, -T - 0.02], [W + 0.02, L + 0.03, T + 0.02], H.hi * 0.7, { center: [0, L * 0.4, -0.05],
      paint: (c, x, y, z) => { c.set(sp.coat);
        const cupped = (1 - ss(Math.hypot(x / (W * 0.62), (y - L * 0.5) / (L * 0.42)), 0.8, 1)) * ss(z, 0, T * 0.4);
        if (sp.stripes) c.set(sp.dark);
        if (sp.mask) c.lerp(light, ss(Math.hypot(x / W, (y - L * 0.45) / (L * 0.55)), 0.82, 0.95));
        if (sp.socks) c.lerp(dark, ss(y, L * 0.55, L * 0.75) * ss(-z, -T * 0.2, T * 0.2));
        c.lerp(inner, cupped); },
      fur: (x, y, z) => { const cupped = (1 - ss(Math.hypot(x / (W * 0.62), (y - L * 0.5) / (L * 0.42)), 0.6, 1)) * ss(z, 0, T * 0.4);
        return 0.32 + 0.5 * cupped; } });
  })());
}
function tailGeo(sp, key) {
  if (!sp.tail) return null;
  return (geoCache['tail:' + key] ??= (() => {
    const t = sp.tail, light = C(sp.light), dark = C(sp.dark);
    const ops = {
      fox: [add(cone(0, 0, 0, 0, 0.2, 0.02, 0.055, 0.1)), add(ell(0, 0.3, 0.035, 0.11, 0.15, 0.11), 0.08), add(ell(0, 0.44, 0.06, 0.07, 0.08, 0.07), 0.07)],
      cat: [add(cone(0, 0, 0, 0, 0.25, 0.0, 0.034, 0.03)), add(cone(0, 0.25, 0, 0, 0.36, 0.07, 0.03, 0.027), 0.03)],
      dog: [add(cone(0, 0, 0, 0, 0.17, 0.03, 0.042, 0.034))],
      raccoon: [add(cone(0, 0, 0, 0, 0.22, 0.0, 0.055, 0.08)), add(ell(0, 0.29, 0.01, 0.075, 0.1, 0.075), 0.06)],
      stub: [add(ell(0, 0.05, 0, 0.05, 0.085, 0.05))],
      tuft: [add(ell(0, 0.05, 0.01, 0.055, 0.075, 0.04))],
      pom: [add(sph(0, 0.04, 0, 0.07))],
    }[t];
    return sculpt(field(ops), [-0.14, -0.08, -0.14], [0.14, 0.54, 0.16], H.hi, { center: [0, 0.2, 0],
      paint: (c, x, y) => { c.set(sp.coat);
        if (t === 'fox') c.lerp(light, ss(y, 0.4, 0.46));
        if (t === 'raccoon') c.lerp(dark, ss(Math.sin(y * 34 - 1.2), 0.1, 0.4) * ss(y, 0.04, 0.08));
        if (t === 'tuft' || t === 'pom') c.set(sp.light);
        if (t === 'dog') c.lerp(light, ss(y, 0.12, 0.17)); },
      fur: () => (t === 'fox' || t === 'raccoon' || t === 'pom') ? 1 : t === 'cat' ? 0.45 : 0.75 });
  })());
}

// the head: cranium, chubby cheeks, chin, snout, brow ridges, eye sockets; and where the eyes sit
function headParts(sp) {
  const [cw, ch] = sp.cranium ?? [1, 1], m = sp.muzzle, er = sp.eyeR ?? 0.044, [ex, ey] = sp.eyeAt ?? [0.09, 0.198];
  const base = [
    add(ell(0, 0.2, 0, 0.215 * cw, 0.2 * ch, 0.2)),
    add(ell(0.105, 0.115, 0.07, 0.115, 0.095, 0.1), 0.07), add(ell(-0.105, 0.115, 0.07, 0.115, 0.095, 0.1), 0.07),
    add(ell(0, 0.07, 0.09, 0.085, 0.05, 0.08), 0.06),
    add(cone(0, m[0], m[1], 0, m[2], m[3], m[4], m[5]), sp.muzzleK ?? 0.06),
    add(ell(0.082, 0.268, 0.105, 0.068, 0.03, 0.05), 0.05), add(ell(-0.082, 0.268, 0.105, 0.068, 0.03, 0.05), 0.05),
    ...(sp.pads ? [add(sph(0.026, m[2] + 0.002, m[3] - 0.004, 0.03), 0.02), add(sph(-0.026, m[2] + 0.002, m[3] - 0.004, 0.03), 0.02)] : []),
    ...(sp.headExtra ? sp.headExtra() : []),
  ];
  const f0 = field(base), surf = surfaceAlong(f0, [ex, ey, 0], [0, 0, 1], 0.5);
  const eye = [ex, ey, surf[2]];                          // on the face: the eyes are painted on it (see eyeMaterial)
  const ops = base;
  const tip = [0, m[2], m[3]], noseAt = surfaceAlong(field(ops), [0, tip[1], tip[2] - 0.02], new V3(0, 0.55, 1).normalize().toArray(), 0.3);
  return { ops, f: field(ops), f0, surf: surf[2], eye, er, noseAt, tip };
}
function headGeo(sp, key, hp, species) {
  return (geoCache['head:' + key] ??= (() => {
    const light = C(sp.light), dark = C(sp.dark), [ex, ey, ez] = hp.eye, m = sp.muzzle;
    return sculpt(hp.f, [-0.3, -0.06, -0.26], [0.3, 0.46, 0.4], H.hi, { center: [0, 0.18, 0],
      paint: (c, x, y, z) => { c.set(sp.coat); const ax = Math.abs(x);
        const muzzle = ss(z, m[1] + 0.02, m[1] + 0.09) * (1 - ss(y, m[2] + m[5] + 0.02, m[2] + m[5] + 0.07));
        const cheeks = ss(z, 0.02, 0.12) * (1 - ss(y, 0.13, 0.18)) * ss(ax, 0.03, 0.08);
        if (species === 'fox') { c.lerp(light, Math.max(cheeks, muzzle * (1 - ss(y, m[2] - 0.01, m[2] + 0.03)))); }
        else if (sp.mask) { c.lerp(light, Math.max(muzzle, cheeks * 0.8));
          c.lerp(light, ss(z, 0.12, 0.2) * (1 - ss(Math.abs(y - 0.29), 0.02, 0.05)) * ss(ax, 0.03, 0.06) * (1 - ss(ax, 0.13, 0.17)));
          c.lerp(dark, ss(z, 0.05, 0.14) * (1 - ss(Math.abs(y - (ey - 0.005)), 0.035, 0.065)) * ss(ax, 0.025, 0.05));
          c.lerp(dark, (1 - ss(ax, 0.008, 0.02)) * ss(y, 0.2, 0.24) * ss(z, 0.12, 0.2)); }
        else if (sp.stripes) { c.set(sp.light); c.lerp(dark, ss(ax, 0.045, 0.06) * (1 - ss(ax, 0.13, 0.15)) * ss(y, m[2] + 0.02, m[2] + 0.06) * (1 - muzzle * 0.8)); }
        else if (sp.quills) { c.lerp(C(0xc9a27a), ss(-z, -0.06, 0.06) * ss(y, 0.18, 0.28)); }
        else c.lerp(light, Math.max(muzzle * 0.85, sp.pads ? cheeks * 0.6 : 0) * (species === 'capybara' ? 0 : 1));
        if (species === 'capybara') c.lerp(C(0x8a5e3a), ss(z, 0.17, 0.24));
      },
      fur: (x, y, z) => { const ax = Math.abs(x);
        const nearEye = 1 - ss(Math.hypot(ax - ex, y - ey, z - ez), hp.er * 1.1, hp.er * 1.75);     // bare at the eyes, so no fur creeps over them
                                                                                                    // (just at them: a wider bare ring read as goggles)
        const face = ss(z, 0.08, 0.16) * (1 - ss(ax, 0.1, 0.17));
        const cheek = ss(ax, 0.1, 0.17) * (1 - ss(y, 0.14, 0.22)) * ss(z, -0.04, 0.06);
        // the face keeps a short pile too, bare only at the eyes and the very tip of the muzzle (Day 246, Jerika: "the
        // bunny's nonfurry face is kinda weird": the face was bare felt, and read as a mask on a fluffy head)
        return Math.max(0, (0.6 - 0.28 * face + 0.45 * cheek) * (1 - nearEye) - 0.24 * ss(z, m[1] + 0.06, m[3] - 0.02)); },
      attrs: { cheek: (x, y, z) => (1 - ss(Math.hypot(Math.abs(x) - 0.11, y - 0.12, z - 0.14), 0.02, 0.065)) },
    });
  })());
}

// ---- the critter ----
const IRIS_DEFAULT = 0x6b4228;
export function makePlush(kind, opts = {}) {
  const base = SPECIES[kind] ?? SPECIES.fox, sp = { ...base, ...(opts.colour ? { coat: opts.colour } : {}) }, W = sp.w ?? 1;
  const key = kind + ':' + sp.coat;
  const root = new THREE.Group(), hop = new THREE.Group(); root.add(hop);
  const blush = { value: 0.35 };

  // body, legs, arms
  const body = furred(bodyGeo(sp, W, key), sp.coat); hop.add(body);
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.095 * W, 0.25, 0.0); hop.add(leg); legs.push(leg);
    leg.add(furred(limbGeo(sp, 'leg', key, kind), sp.coat));
    const arm = new THREE.Group(); arm.position.set(sx * 0.152 * W, 0.555, 0.01); arm.rotation.z = sx * 0.22; hop.add(arm); arms.push(arm);
    const am = furred(limbGeo(sp, 'arm', key, kind), sp.coat); am.scale.x = sx; arm.add(am);
  }
  // scarf: everyone gets one, it's camp
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.118 * W, 0.042, 12, 28), withFill(new THREE.MeshPhysicalMaterial({ color: opts.scarf ?? 0x5bcefa,
    roughness: 1, map: WOOL_MAP, normalMap: WOOL_NORMAL, sheen: 0.4, sheenColor: C(opts.scarf ?? 0x5bcefa).lerp(C(0xffffff), 0.4) })));
  scarf.rotation.x = Math.PI / 2; scarf.position.set(0, 0.6, 0.008); scarf.scale.set(1, 1.08, 1); scarf.castShadow = true; hop.add(scarf);
  // tail
  let tail = null; const tg = tailGeo(sp, key);
  if (tg) { tail = new THREE.Group(); tail.position.set(0, 0.27, -0.16 * W); tail.rotation.x = sp.tail === 'fox' ? -1.25 : sp.tail === 'cat' ? -0.55 : -0.9;
    tail.add(furred(tg, sp.coat)); hop.add(tail); }

  // head
  const hp = headParts(sp), head = new THREE.Group(); head.position.set(0, 0.6, 0.01); hop.add(head);
  head.add(furred(headGeo(sp, key, hp, kind), sp.coat, blush));
  // eyes: painted flush on the face (open, glancing about) with a shut version for blinking, smiling and squeezing tight
  const eyeGroups = [], opens = [], shuts = [], er = hp.er;
  const lidColour = (() => { const g = head.children[0].geometry, P = g.attributes.position, Cc = g.attributes.color, F = g.attributes.fur;
    let best = 0, bd = 1e9; for (let i = 0; i < P.count; i++) { const d = Math.hypot(P.getX(i) - hp.eye[0], P.getY(i) - hp.eye[1], P.getZ(i) - hp.eye[2]);
      if (d < bd) { bd = d; best = i; } }
    return new THREE.Color(Cc.getX(best), Cc.getY(best), Cc.getZ(best)).multiplyScalar(1 - 0.2 * F.getX(best)); })();
  for (const sx of [-1, 1]) {
    // a sphere fitted to the face right there, so the painted eye lies flush on it
    const S0 = new V3(sx * hp.eye[0], hp.eye[1], hp.surf), e0 = 0.002, f0 = hp.f0;
    const N0 = new V3(f0(S0.x + e0, S0.y, S0.z) - f0(S0.x - e0, S0.y, S0.z), f0(S0.x, S0.y + e0, S0.z) - f0(S0.x, S0.y - e0, S0.z),
      f0(S0.x, S0.y, S0.z + e0) - f0(S0.x, S0.y, S0.z - e0)).normalize();
    const R = 0.17, holder = new THREE.Group(); holder.position.copy(S0).addScaledVector(N0, -R); holder.scale.setScalar(R); head.add(holder);
    const ny = Math.asin(N0.y), nyaw = Math.atan2(N0.x, N0.z), eyeW = (sp.eyeW ?? 0.092) / R / 0.8;
    const open = decal(holder, nyaw, ny, eyeW, eyeW * 1.12, eyeMaterial(opts.eyes ?? sp.iris ?? IRIS_DEFAULT, !!sp.slit), 1 + 0.0045 / R);
    open.renderOrder = 3; opens.push(open);
    const span = eyeW * 1.15;
    const shut = decal(holder, nyaw, ny, span, span * 1.12, withFill(new THREE.MeshStandardMaterial({ map: shutTex('blink', lidColour), transparent: true,
      roughness: 1, depthWrite: false })), 1 + 0.005 / R);
    shut.renderOrder = 3; shut.visible = false; shut.userData.side = sx < 0 ? 'L' : 'R'; shuts.push(shut);
  }
  // brows: little felt tufts above the eyes
  const browMat = withFill(new THREE.MeshStandardMaterial({ color: C(sp.coat).lerp(C(sp.brow), 0.6), roughness: 1 })), brows = [];
  for (const sx of [-1, 1]) {
    const at = surfaceAlong(hp.f, [sx * (hp.eye[0] + 0.004), hp.eye[1] + er + 0.046, 0.02], [0, 0, 1], 0.5);
    const b = new THREE.Group(); b.position.set(at[0], at[1], at[2] + 0.004); head.add(b);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.026, 4, 8), browMat); m.rotation.z = Math.PI / 2 + sx * 0.14; m.scale.set(1, 1, 0.6); b.add(m);   // ends up a touch: cheerful, not pleading
    b.userData = { sx, y: b.position.y }; brows.push(b);
  }
  // nose, and a mouth: a little ω hanging from the nose, and a mouth that opens (dark, with a tongue) when they talk
  const noseMat = glossy(withFill(new THREE.MeshPhysicalMaterial({ color: sp.nose, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.35 })));
  const nr = kind === 'dog' ? [0.04, 0.03, 0.028] : kind === 'capybara' ? [0.05, 0.028, 0.024] : sp.pads ? [0.018, 0.013, 0.012] : [0.027, 0.02, 0.02];
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), noseMat); nose.scale.set(...nr); nose.position.fromArray(hp.noseAt); head.add(nose);
  const proj = p => { for (let i = 0; i < 4; i++) { const d = hp.f(p.x, p.y, p.z), e = 0.002;
      const g = new V3(hp.f(p.x + e, p.y, p.z) - hp.f(p.x - e, p.y, p.z), hp.f(p.x, p.y + e, p.z) - hp.f(p.x, p.y - e, p.z), hp.f(p.x, p.y, p.z + e) - hp.f(p.x, p.y, p.z - e)).normalize();
      p.addScaledVector(g, -d); } return p; };
  const n0 = new V3().fromArray(hp.noseAt), top = n0.clone().add(new V3(0, -nr[1] * 0.9, 0)), j = top.clone().add(new V3(0, -0.022, 0.004));
  const wpts = [new V3(-0.03, 0.006, -0.012), new V3(-0.016, -0.008, -0.002), new V3(0, 0, 0), new V3(0.016, -0.008, -0.002), new V3(0.03, 0.006, -0.012)]
    .map(o => proj(j.clone().add(o)));
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a1a14, roughness: 0.8 });
  const lift = p => p.clone().add(p.clone().sub(new V3(0, 0.15, 0)).normalize().multiplyScalar(0.0025));
  head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, proj(j.clone())].map(lift)), 6, 0.004, 6), mouthMat));
  head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wpts.map(lift)), 20, 0.004, 6), mouthMat));
  const mouth = new THREE.Group(), mAt = proj(j.clone().add(new V3(0, -0.012, 0))), e2 = 0.002;
  const mN = new V3(hp.f(mAt.x + e2, mAt.y, mAt.z) - hp.f(mAt.x - e2, mAt.y, mAt.z), hp.f(mAt.x, mAt.y + e2, mAt.z) - hp.f(mAt.x, mAt.y - e2, mAt.z),
    hp.f(mAt.x, mAt.y, mAt.z + e2) - hp.f(mAt.x, mAt.y, mAt.z - e2)).normalize();
  mouth.position.copy(mAt).addScaledVector(mN, -0.007); mouth.quaternion.setFromUnitVectors(Z, mN); head.add(mouth);
  const cav = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5a1a1c, roughness: 0.9 })); cav.scale.set(0.022, 0.017, 0.012); mouth.add(cav);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf28aa0, roughness: 0.7 }));
  tongue.scale.set(0.6, 0.45, 0.6); tongue.position.set(0, -0.45, 0.35); cav.add(tongue);
  mouth.scale.y = 0.001;
  // ears
  const ears = [];
  for (const sx of [-1, 1]) {
    const e = sp.ear, g = new THREE.Group(); g.position.set(sx * e.at[0], e.at[1], e.at[2]);
    g.rotation.set(-0.12, e.flop ? sx * 0.3 : 0, -sx * e.tilt); head.add(g);
    const m = furred(earGeo(sp, key), sp.coat); if (e.flop) m.rotation.y = -sx * 1.2; g.add(m);
    g.userData = { sx, tilt: e.tilt, flop: !!e.flop }; ears.push(g);
  }
  // hedgehog quills: soft spines over the back of the head and body
  if (sp.quills) {
    const qg = new THREE.LatheGeometry(Array.from({ length: 9 }, (_, i) => new THREE.Vector2(Math.max(1e-4, 0.026 * Math.pow(1 - i / 8, 0.7)), 0.11 * i / 8)), 7);
    const qc = new Float32Array(qg.attributes.position.count * 3), dk = C(0x6a4630), tp = C(0xd8b48c);
    for (let i = 0; i < qg.attributes.position.count; i++) { const c = dk.clone().lerp(tp, ss(qg.attributes.position.getY(i), 0.05, 0.11)); qc.set([c.r, c.g, c.b], i * 3); }
    qg.setAttribute('color', new THREE.BufferAttribute(qc, 3));
    const qm = withFill(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    const bodyF = field([add(ell(0, 0.33, 0, 0.2, 0.19, 0.18)), add(ell(0, 0.49, 0.012, 0.155, 0.15, 0.14), 0.09)]);
    // one mesh per patch of quills, not one per quill: Thistle was 126 meshes and 80 shadow casters against everyone
    // else's 55-69, about 140 extra draw calls in any scene he was in (Day 246). Each quill is placed exactly as before.
    const place = (f, o, parent, n, zMax) => { const geos = [], pos = new V3(), quat = new THREE.Quaternion(), one = new V3(1, 1, 1), mx = new THREE.Matrix4();
      for (let k = 0; k < n; k++) {
        const a = k * 2.399963, h = (k + 0.5) / n, th = Math.acos(1 - 2 * h), d = [Math.sin(th) * Math.cos(a), Math.cos(th), Math.sin(th) * Math.sin(a)];
        if (d[2] > zMax || (parent === head && d[1] < -0.2)) continue;
        const p = surfaceAlong(f, o, d, 0.5), dir = new V3(d[0], d[1] + 0.25, d[2] - 0.35).normalize();
        pos.fromArray(p).addScaledVector(dir, -0.012); quat.setFromUnitVectors(new V3(0, 1, 0), dir);
        geos.push(qg.clone().applyMatrix4(mx.compose(pos, quat, one))); }
      if (geos.length) { const q = new THREE.Mesh(mergeCopies(geos), qm); q.castShadow = true; parent.add(q); } };
    place(hp.f, [0, 0.2, 0], head, 90, -0.05); place(bodyF, [0, 0.38, 0], hop, 110, -0.25);
  }

  // a soft contact shadow, so they sit on the ground even when the sun's shadow is gone
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, opacity: 0.55 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; blob.renderOrder = 2; root.add(blob);

  // ---- feeling ----
  const st = { phase: 0, step: 0, squash: 0, blinkAt: 1 + Math.random() * 3, blink: 0, earAt: 2 + Math.random() * 4, ear: 0,
               look: null, yaw: 0, pitch: 0, tilt: 0, emote: null, emoteT: 0, wave: 0, glow: opts.glow ?? 0.5, talk: false,
               eyes: 'open', glance: new V3(), glanceAt: 0, brow: 0, worry: 0, perk: 0, droop: 0, open: sp.open ? 0.35 : 0, blushK: 0.35, sit: 0, sitTo: 0 };
  root.userData = { kind, name: opts.name, st };
  const ease = (k, v, rate, dt) => { st[k] += (v - st[k]) * Math.min(1, dt * rate); };
  function update(dt, t, speed) {
    // walking: legs step, arms swing, a little bob and sway
    const walking = speed > 0.15;
    // the step rate follows the speed up to a camper's walk (1.7 m/s); you move at 3, and at that rate it was a blur
    // (Day 246, Jerika: "all the walking is fine except my character the bunny's... the fast wobbling is so funny"),
    // so above a walk the steps lengthen into a trot instead: fewer of them, a bigger bounce
    const trot = THREE.MathUtils.smoothstep(speed, 1.7, 3.0);
    if (walking) st.phase += dt * (3.2 + Math.min(speed, 1.7) * 1.4 + Math.max(0, speed - 1.7) * 0.25);
    st.step += ((walking ? 1 : 0) - st.step) * Math.min(1, dt * 8);
    const s = Math.sin(st.phase * Math.PI * 2) * st.step;
    st.sit += (st.sitTo - st.sit) * Math.min(1, dt * 3);                    // sitting: down onto a cushion, legs out in front
    legs.forEach((l, i) => (l.rotation.x = (i ? -s : s) * 0.55 * (1 - st.sit) - 1.4 * st.sit));
    let y = Math.abs(Math.cos(st.phase * Math.PI * 2)) * 0.028 * (1 + 0.9 * trot) * st.step - 0.13 * st.sit, sq = 1 + Math.sin(t * 2.2 + root.id) * 0.012;
    hop.rotation.z = s * 0.05; hop.rotation.x = 0.05 * st.step - 0.05 * st.sit;
    // emotes set the face's targets; everything eases toward them
    let eyes = 'open', brow = 0, worry = 0, perk = 0, droop = 0, open = sp.open ? 0.35 : 0, blushK = 0.35, wave = 0;
    if (st.emote) { st.emoteT += dt; const e = st.emoteT;
      if (st.emote === 'happy') { y += Math.max(0, Math.sin(e * 9)) * 0.12 * Math.max(0, 1 - e / 1.4);
        if (e < 1.9) { eyes = 'happy'; brow = 0.012; perk = 1; open = 0.85; } }
      if (st.emote === 'shy') { const k = Math.min(1, e * 3) * Math.max(0, 1 - (e - 2.1) / 0.6);
        sq *= 1 - 0.06 * k; if (k > 0.5) eyes = 'squeeze'; worry = k; droop = k; blushK = 0.35 + 0.65 * k; }
      if (st.emote === 'wave') { wave = Math.max(0, 1 - e / 1.7); brow = 0.014 * wave; perk = wave; open = Math.max(open, 0.6 * wave); }
      if (st.emote === 'nod') { head.rotation.x = Math.sin(e * 10) * 0.18 * Math.max(0, 1 - e / 0.8); if (e < 0.5) eyes = 'blink'; }
      if (e > 2.8) st.emote = null; }
    if (st.sleep && !st.emote) { eyes = 'blink'; droop = 0.75; }                      // asleep: eyes shut, ears and head down
    if (st.talk) open = Math.max(open, 0.25 + 0.45 * Math.max(0, Math.sin(t * 17)));
    if (t > st.blinkAt) { st.blink = 0.14; st.blinkAt = t + 2.2 + Math.random() * 4; }
    st.blink = Math.max(0, st.blink - dt);
    if (st.blink > 0 && eyes === 'open') eyes = 'blink';
    ease('brow', brow, 9, dt); ease('worry', worry, 7, dt);
    ease('perk', perk, 8, dt); ease('droop', droop, 6, dt); ease('open', open, 16, dt); ease('blushK', blushK, 4, dt);
    st.wave += (wave - st.wave) * Math.min(1, dt * 10);
    hop.position.y = y; hop.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    blob.scale.setScalar(1 - Math.min(0.4, Math.max(0, y) * 1.5)); blob.material.opacity = 0.55 * (1 - Math.min(0.5, Math.max(0, y) * 2));
    // the face
    if (eyes !== st.eyes) { st.eyes = eyes; opens.forEach(o => (o.visible = eyes === 'open'));
      shuts.forEach(m => { m.visible = eyes !== 'open'; if (m.visible) m.material.map = shutTex(eyes === 'squeeze' ? 'squeeze' + m.userData.side : eyes, lidColour); }); }
    // the eyes glance: toward whatever they're looking at, and every so often somewhere else for a moment
    if (t > st.glanceAt) { st.glanceAt = t + 1.2 + Math.random() * 3; st.glance.set((Math.random() - 0.5) * 0.45, (Math.random() - 0.5) * 0.12, 0); }
    const gy = THREE.MathUtils.clamp((st.look ? (st.lookYaw ?? 0) - st.yaw : 0) * 0.6 + st.glance.x * (st.look ? 0.3 : 1), -0.35, 0.35), gp = st.glance.y;
    st.glanceNow = st.glanceNow ?? new THREE.Vector2(); st.glanceNow.x += (gy / 0.35 - st.glanceNow.x) * Math.min(1, dt * 14); st.glanceNow.y += (gp / 0.12 - st.glanceNow.y) * Math.min(1, dt * 14);
    opens.forEach(o => o.material.userData.u.uLook.value.set(THREE.MathUtils.clamp(st.glanceNow.x, -1, 1), THREE.MathUtils.clamp(st.glanceNow.y, -1, 1)));
    for (const b of brows) { b.position.y = b.userData.y + st.brow - st.worry * 0.003; b.rotation.z = b.userData.sx * -0.3 * st.worry; }
    mouth.scale.y = Math.max(0.001, st.open);
    blush.value = st.blushK;
    // ears: an occasional flick; up when excited, back and down when shy
    if (t > st.earAt) { st.ear = 1; st.earAt = t + 2.5 + Math.random() * 5; }
    st.ear = Math.max(0, st.ear - dt * 4);
    ears.forEach((g, i) => { const u = g.userData, flick = Math.sin(st.ear * Math.PI * 2) * 0.22 * (i ? 1 : 0.5);
      g.rotation.x = -0.12 - flick + st.droop * 0.5 - st.perk * 0.15;
      g.rotation.z = -u.sx * (u.tilt + (u.flop ? -0.25 * st.perk : -0.18 * st.perk + 0.45 * st.droop)); });
    // head: turns toward what it's looking at, tilts, curious; down when shy
    let yaw = 0, pitch = 0, tilt = Math.sin(t * 0.7 + root.id) * 0.05;
    if (st.look) { const local = root.worldToLocal(st.look.clone()), hpos = new V3(0, 0.85, 0);
      const d = local.sub(hpos); st.lookYaw = Math.atan2(d.x, d.z); yaw = THREE.MathUtils.clamp(st.lookYaw, -1.0, 1.0);
      pitch = THREE.MathUtils.clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.35, 0.35); tilt = 0.14 * Math.sign(yaw || 1); }
    st.yaw += (yaw - st.yaw) * Math.min(1, dt * 6); st.pitch += (pitch + 0.16 * st.droop - st.pitch) * Math.min(1, dt * 5);
    st.tilt += (tilt - st.tilt) * Math.min(1, dt * 3);
    head.rotation.y = st.yaw; head.rotation.z = st.tilt; if (st.emote !== 'nod') head.rotation.x = st.pitch;
    // arms: swing when walking, wave hello, tuck in when shy
    arms.forEach((a, i) => { const sx = i ? 1 : -1;
      a.rotation.x = -(i ? s : -s) * 0.5 - st.droop * 0.4 - 0.5 * st.sit;
      a.rotation.z = sx * (0.22 - st.droop * 0.18 + (i === 1 ? st.wave * (2.3 + Math.sin(t * 15) * 0.3) : 0)); });
    if (tail) { const wag = kind === 'dog' ? (st.perk > 0.3 || st.talk ? 14 : 5) : 1.6;
      tail.rotation.z = Math.sin(t * wag) * (kind === 'dog' ? 0.35 : 0.14) + s * 0.1; }
  }
  const emote = k => { st.emote = k; st.emoteT = 0; };
  const gazeAt = v => { st.look = v ? v.clone() : null; };
  const setGlow = v => { st.glow = THREE.MathUtils.clamp(v, 0, 1); };
  const setTalking = on => { st.talk = !!on; };
  const setSit = v => { st.sitTo = v; };
  const setSleep = on => { st.sleep = !!on; };
  const headTop = surfaceAlong(hp.f, [0, 0.2, 0], [0, 1, 0], 0.5);
  const rig = { hop, head, body, arms, legs, tail, ears, W,
    headTop: new V3(headTop[0], headTop[1] + FUR.len * 0.6, headTop[2]), eyes: [new V3(-hp.eye[0], hp.eye[1], hp.eye[2]), new V3(hp.eye[0], hp.eye[1], hp.eye[2])], er,
    neck: new V3(0, 0.6, 0.008), back: new V3(0, 0.42, -0.19 * W), chest: new V3(0, 0.5, 0.15 * W), paw: new V3(0, -0.2, 0.06) };
  return Object.assign(root, { update, emote, gazeAt, setGlow, setTalking, setSit, setSleep, head, rig, eyeAt: rig.eyes });
}
