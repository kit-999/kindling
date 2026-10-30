// The sky and the light. One number, tod (time of day), runs the whole evening: 0 is golden hour, about 0.55 the
// sun touching the trees, 0.75 blue hour, 1 night; below 0 is earlier in the day (day two's swim sits at -0.25). The dome is a shader (gradient, sun glow, stars, a faint aurora in
// the trans flag's light blue, pink and white); the lights and the fog follow the same keyframes.
import * as THREE from 'three';

const KEYS = [   // tod, zenith, horizon, sun colour, sun strength, hemisphere sky, hemisphere ground, hemi strength
  [-0.40, 0x5f9fe2, 0xd4ebfa, 0xfff3e2, 2.9, 0xdcebff, 0x6e6444, 1.05],   // day two's late morning: higher, whiter, bluer (below 0 is before golden hour)
  [0.00, 0x7fb2de, 0xffd8a2, 0xffe0b0, 2.7, 0xcfe3ff, 0x6b5a3a, 0.95],
  [0.45, 0x5d82b8, 0xffb070, 0xffb060, 2.1, 0xf0c8a0, 0x5a4630, 0.80],
  [0.60, 0x3a4a80, 0xff8a5a, 0xff7a40, 0.9, 0xc89aa0, 0x3a2e30, 0.55],
  [0.78, 0x1a2050, 0x6a4a7a, 0x8a6aa0, 0.0, 0x6a7ab8, 0x2a2638, 0.62],
  [1.00, 0x060818, 0x141a36, 0x6070a0, 0.0, 0x5a6cb0, 0x1c2034, 0.62],
];
const COLOUR = new Set([1, 2, 3, 5, 6]);      // which columns are colours; the rest are plain numbers
function lerpKey(tod, i) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let k = 0; k < KEYS.length - 1; k++) if (tod >= KEYS[k][0] && tod <= KEYS[k + 1][0]) { a = KEYS[k]; b = KEYS[k + 1]; break; }
  const u = b[0] > a[0] ? THREE.MathUtils.clamp((tod - a[0]) / (b[0] - a[0]), 0, 1) : 0;
  if (COLOUR.has(i)) return new THREE.Color(a[i]).lerp(new THREE.Color(b[i]), u);
  return a[i] + (b[i] - a[i]) * u;
}
const colourAt = (tod, i) => lerpKey(tod, i);
const numberAt = (tod, i) => lerpKey(tod, i);

const VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;                       // always on the far plane
  }`;
const FRAG = /* glsl */`
  uniform vec3 uZenith, uHorizon, uSunCol, uSunDir;
  uniform float uSunGlow, uStars, uAurora, uTime;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.05, 0.75, h), 0.7));
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunCol * (pow(s, 900.0) * 3.0 + pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.12) * uSunGlow;
    // stars: one per sky cell, a few bright, all twinkling a little
    if (uStars > 0.0 && d.y > 0.0) {
      vec2 sph = vec2(atan(d.z, d.x) * 60.0, asin(d.y) * 60.0);
      vec2 cell = floor(sph), local = fract(sph) - 0.5;
      float r = hash(cell);
      if (r > 0.82) {
        float tw = 0.7 + 0.3 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);
        float star = smoothstep(0.08 + (r - 0.82) * 0.25, 0.0, length(local)) * tw;
        col += vec3(0.85, 0.9, 1.0) * star * uStars * smoothstep(0.0, 0.25, d.y);
      }
    }
    // aurora: soft curtains low in the north (-z), light blue to pink to white
    if (uAurora > 0.0 && d.z < 0.0 && d.y > 0.02) {
      float az = atan(d.x, -d.z);
      float n = noise(vec2(az * 3.0 + uTime * 0.05, uTime * 0.03)) * 0.6 + noise(vec2(az * 9.0 - uTime * 0.08, 3.0)) * 0.4;
      float band = smoothstep(0.08, 0.22, d.y) * smoothstep(0.62, 0.28, d.y + n * 0.15);
      float curtain = pow(n, 2.2) * band * smoothstep(0.0, 0.5, -d.z);
      vec3 blue = vec3(0.36, 0.81, 0.98), pink = vec3(0.96, 0.66, 0.72), white = vec3(1.0);
      vec3 ac = mix(blue, pink, smoothstep(0.15, 0.45, d.y + n * 0.1));
      ac = mix(ac, white, smoothstep(0.75, 0.95, n) * 0.5);
      col += ac * curtain * uAurora * 0.55;
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createSky(scene) {
  const uniforms = {
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3() }, uSunGlow: { value: 1 }, uStars: { value: 0 }, uAurora: { value: 0 }, uTime: { value: 0 },
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.frustumCulled = false; dome.renderOrder = -1;
  scene.add(dome);

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 120;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0xffffff, 26, 95);

  const sunDir = new THREE.Vector3();
  const MOON_DIR = new THREE.Vector3(-0.45, 0.78, -0.43).normalize(), MOON_COL = new THREE.Color(0x9fb4ff);
  function update(tod, time, focus) {
    // the sun sets in the west (+x) over the stream, a little to the south, from about 20° down to well below the trees
    const elev = THREE.MathUtils.degToRad(20 - 34 * Math.min(tod / 0.75, 1));
    const az = THREE.MathUtils.degToRad(api.morning ? 198 : -18);       // morning: the sun rises on the far side, in the east
    sunDir.set(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az));
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uZenith.value.copy(colourAt(tod, 1)); uniforms.uHorizon.value.copy(colourAt(tod, 2));
    uniforms.uSunCol.value.copy(colourAt(tod, 3));
    uniforms.uSunGlow.value = THREE.MathUtils.clamp(1.2 - tod * 1.1, 0, 1);
    uniforms.uStars.value = THREE.MathUtils.smoothstep(tod, 0.68, 0.92);
    uniforms.uAurora.value = THREE.MathUtils.smoothstep(tod, 0.84, 1.0);
    uniforms.uTime.value = time;
    // after the sun goes, the same light becomes the moon: cool, high in the east, soft shadows
    const sunI = numberAt(tod, 4), moonI = THREE.MathUtils.smoothstep(tod, 0.6, 0.92) * 0.85;
    const useMoon = moonI > sunI, dir = useMoon ? MOON_DIR : (sunDir.y > 0.05 ? sunDir : new THREE.Vector3(sunDir.x, 0.05, sunDir.z).normalize());
    sun.color.copy(useMoon ? MOON_COL : colourAt(tod, 3)); sun.intensity = Math.max(sunI, moonI);
    sun.visible = sun.intensity > 0.02;
    sun.target.position.copy(focus);
    sun.position.copy(focus).addScaledVector(dir, 50);
    hemi.color.copy(colourAt(tod, 5)); hemi.groundColor.copy(colourAt(tod, 6)); hemi.intensity = numberAt(tod, 7);
    scene.fog.color.copy(colourAt(tod, 2)).lerp(colourAt(tod, 1), 0.35).multiplyScalar(0.92);
  }
  const api = { update, sun, hemi, sunDir, dome, morning: false };
  return api;
}
