// The magic layer: wind (grass, trees, flowers), a field of grass blades, drifting autumn leaves and pollen, light
// shafts through the trees, and a warm grade with a soft vignette. A quality setting scales the costly parts:
// her PC gets the full field, a phone gets a lighter one.
import * as THREE from 'three';
import { heightAt, streamX, hikeDist } from './world.js';

export const wind = { uTime: { value: 0 }, uGust: { value: 1 } };

// Bend anything in the wind: displacement grows with the vertex's height above its own base (local y), phased by where
// the instance stands in the world so a gust visibly travels across the field.
export function addWind(material, { amount = 0.1, height = 1, stiff = 1 } = {}) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = wind.uTime; shader.uniforms.uGust = wind.uGust;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uGust;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 ip = vec3(0.0);
          #ifdef USE_INSTANCING
            ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #endif
          float h = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0);
          float bend = h * h * ${amount.toFixed(3)} * uGust;
          float wave = sin(uTime * 1.6 / ${stiff.toFixed(2)} + ip.x * 0.32 + ip.z * 0.21) * 0.7
                     + sin(uTime * 3.7 + ip.x * 1.3 - ip.z * 0.9) * 0.3;
          float gust = smoothstep(0.35, 1.0, sin(uTime * 0.45 + ip.x * 0.08 - ip.z * 0.05) * 0.5 + 0.5);
          transformed.x += bend * (wave + gust * 1.6);
          transformed.z += bend * (wave * 0.5 + gust * 0.6);
        }`);
  };
  material.customProgramCacheKey = () => 'wind' + amount + height + stiff;
  return material;
}

// ---- a field of grass blades: each blade a little bent strip, darker at the root, warmer at the tip ----
export function buildGrass(scene, count, R = 19) {      // R: how far out from the fire the meadow goes
  const geo = new THREE.BufferGeometry(), pos = [], col = [], idx = [];
  const SEG = 4, root = new THREE.Color(0x2f4a22), tip = new THREE.Color(0xb7c86a);
  for (let i = 0; i <= SEG; i++) {
    const v = i / SEG, w = 0.045 * (1 - v * 0.92), bendZ = v * v * 0.12;
    pos.push(-w, v, bendZ, w, v, bendZ);
    const c = root.clone().lerp(tip, Math.pow(v, 0.8)); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }), { amount: 0.18, height: 1 });
  const blades = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  let n = 0, tries = 0, seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  while (n < count && tries++ < count * 6) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const pathD = Math.min(z > 3.5 ? Math.abs(x - Math.sin(z * 0.18) * 1.2) - 1.0 : 9, r > 5.5 ? hikeDist(x, z) - 0.8 : 9), ringD = Math.hypot(x, z) - 4.3;
    if (pathD < 0 || ringD < 0 || Math.abs(x - streamX(z)) < 2.3 || (r > R - 4 && rnd() < (r - (R - 4)) / 4)) continue;
    // mown short in the clearing, longer toward the woods, and feathered down to nothing at the trail and the circle
    const edge = THREE.MathUtils.smoothstep(Math.min(pathD, ringD), 0, 1.6);
    const hgt = (0.13 + rnd() * 0.17 + THREE.MathUtils.smoothstep(r, 9, 16) * 0.22) * (0.25 + 0.75 * edge);
    e.set((rnd() - 0.5) * 0.35, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.35); q.setFromEuler(e);
    p.set(x, heightAt(x, z) - 0.02, z); m.compose(p, q, s.set(1, hgt, 1)); blades.setMatrixAt(n, m);
    blades.setColorAt(n, new THREE.Color(1, 1, 1).offsetHSL((rnd() - 0.5) * 0.05, 0, (rnd() - 0.5) * 0.18));
    n++;
  }
  blades.count = n; blades.receiveShadow = true; blades.frustumCulled = false;
  scene.add(blades);
  return blades;
}

// ---- autumn leaves drifting down from the broadleaf trees, and pollen glinting in the sunbeams ----
export function buildAir(scene, count) {
  const leafG = new THREE.PlaneGeometry(0.11, 0.08);
  const leafM = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 });
  const leaves = new THREE.InstancedMesh(leafG, leafM, count), L = [];
  const pal = [0xe0a33c, 0xd9762f, 0xc2502e, 0xe6c35a];
  for (let i = 0; i < count; i++) {
    const z = -18 + Math.random() * 36, x = streamX(z) - 3 - Math.random() * 9;
    L.push({ x, z, y: 1 + Math.random() * 5, vy: 0.25 + Math.random() * 0.25, ph: Math.random() * 6.3, spin: 0.5 + Math.random() * 2 });
    leaves.setColorAt(i, new THREE.Color(pal[i % pal.length]));
  }
  leaves.frustumCulled = false; scene.add(leaves);
  const N = Math.round(count * 1.5), pp = new Float32Array(N * 3), P = [];
  for (let i = 0; i < N; i++) P.push([(Math.random() - 0.5) * 26, 0.4 + Math.random() * 3, (Math.random() - 0.5) * 26, Math.random() * 6.3]);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32; const g = dot.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,248,220,1)'); gr.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const pm = new THREE.PointsMaterial({ size: 0.07, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c8 });
  const pollen = new THREE.Points(pg, pm); pollen.frustumCulled = false; scene.add(pollen);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), e = new THREE.Euler();
  return function update(dt, t, tod, focus) {
    for (let i = 0; i < count; i++) { const l = L[i];
      l.y -= l.vy * dt; l.x += Math.sin(t * 0.9 + l.ph) * 0.35 * dt + 0.12 * dt; l.z += Math.cos(t * 0.7 + l.ph) * 0.25 * dt;
      const ground = heightAt(l.x, l.z);
      if (l.y < ground + 0.02) { l.y = ground + 0.02; l.vy = 0; if (Math.random() < dt * 0.05) { l.y = 4 + Math.random() * 3; l.vy = 0.25 + Math.random() * 0.25; } }
      e.set(t * l.spin + l.ph, t * l.spin * 0.7, l.vy > 0 ? Math.sin(t * 2 + l.ph) : Math.PI / 2);
      q.setFromEuler(e); p.set(l.x, l.y, l.z); m.compose(p, q, s); leaves.setMatrixAt(i, m);
    }
    leaves.instanceMatrix.needsUpdate = true;
    pm.opacity = (1 - THREE.MathUtils.smoothstep(tod, 0.4, 0.62)) * 0.9;
    if (pm.opacity > 0) {
      for (let i = 0; i < N; i++) { const [x, y, z, ph] = P[i];
        pp[i * 3] = focus.x + x + Math.sin(t * 0.21 + ph) * 0.8; pp[i * 3 + 1] = heightAt(focus.x + x, focus.z + z) + y + Math.sin(t * 0.37 + ph * 2) * 0.3;
        pp[i * 3 + 2] = focus.z + z + Math.cos(t * 0.17 + ph) * 0.8; }
      pg.attributes.position.needsUpdate = true;
    }
  };
}

// ---- light shafts: smear the bright, open sky toward the sun; the trees cut the shafts out of it ----
export const GodRaysShader = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uSun: { value: new THREE.Vector2() }, uStrength: { value: 0 },
              uColor: { value: new THREE.Color() } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth; uniform vec2 uSun; uniform float uStrength; uniform vec3 uColor; varying vec2 vUv;
    const int N = 56;
    // one NaN or infinity in the HDR buffer (an odd GPU, a degenerate normal) gets smeared over the whole screen by
    // this pass and the bloom after it; it has to stop here (Day 245, her "screen turns really bright yellow")
    vec3 clean(vec3 c) { return (any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : min(c, vec3(48.0)); }
    void main() {
      vec3 base = clean(texture2D(tDiffuse, vUv).rgb);
      if (uStrength <= 0.0) { gl_FragColor = vec4(base, 1.0); return; }
      vec2 dir = (uSun - vUv) / float(N) * 0.85, p = vUv;
      float acc = 0.0, decay = 1.0;
      for (int i = 0; i < N; i++) {
        p += dir;
        // past the frame's edge there is nothing to read. Clamping to the edge read one edge pixel dozens of times over,
        // and when that pixel was open sky it laid a milky yellow veil across the whole screen (her phone, Day 246:
        // portrait shows a sliver of sky in the top corner that landscape never does)
        if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) break;
        float sky = step(0.99999, textureLod(tDepth, p, 0.0).x);
        vec3 c = clean(textureLod(tDiffuse, p, 0.0).rgb);
        acc += sky * min(max(dot(c, vec3(0.299, 0.587, 0.114)) - 0.55, 0.0), 2.0) * decay;
        decay *= 0.962;
      }
      gl_FragColor = vec4(base + uColor * acc * uStrength / float(N), 1.0);
    }`,
};

// ---- the grade: warm highlights, cool shadows, a soft vignette; in linear light, before tone mapping ----
export const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uWarm: { value: 1 }, uVig: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uWarm, uVig; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 warm = vec3(1.06, 1.0, 0.9), cool = vec3(0.92, 0.97, 1.08);
      c *= mix(cool, warm, smoothstep(0.05, 0.6, l) * uWarm + (1.0 - uWarm) * 0.5);
      vec2 d = vUv - 0.5; c *= 1.0 - uVig * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// ---- see-through: trees between the camera and you dissolve into a soft stipple, so a tree never hides you
// (Jerika, Day 245: "the trees block a lot when moving around"). Two rules: inside a circle round you on screen,
// anything nearer the camera than you goes; and anything within a few metres of the camera goes wherever it is,
// because a crown right in front of the lens fills the whole view (found by playing it, not by a scripted run).
// Shadows are untouched: the shadow pass doesn't use this shader.
// uSeeNear (from, to metres) and uSeeRing (from, to on screen) are set each frame: wider while the camera follows you (Day 248:
// a crown 5-7 m from the lens still walled off a third of the view beside Clover's and Lumi's spots), the original narrow
// values in a scripted shot, where a close camera would otherwise dissolve the tents and trees behind whoever is talking.
export const seeThrough = { uSeeFocus2: { value: new THREE.Vector2() }, uSeeFocusZ: { value: 10 }, uSeeRes: { value: new THREE.Vector2(1, 1) },
  uSeeNear: { value: new THREE.Vector2(4.5, 2.4) }, uSeeRing: { value: new THREE.Vector2(0.66, 0.34) } };
export function addSeeThrough(material) {
  const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = (s, r) => {
    if (prev) prev.call(material, s, r);
    Object.assign(s.uniforms, seeThrough);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec2 uSeeFocus2; uniform float uSeeFocusZ; uniform vec2 uSeeRes; uniform vec2 uSeeNear; uniform vec2 uSeeRing;
      float seeBayer(vec2 p) { int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
        const float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.); return (m[i] + 0.5) / 16.0; }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        { vec2 ndc = gl_FragCoord.xy / uSeeRes * 2.0 - 1.0;
          float sd = length((ndc - uSeeFocus2) * vec2(uSeeRes.x / uSeeRes.y, 1.0)), z = vViewPosition.z;
          float infront = 1.0 - smoothstep(uSeeFocusZ - 1.8, uSeeFocusZ - 0.7, z);
          float fade = max(smoothstep(uSeeRing.x, uSeeRing.y, sd) * infront, smoothstep(uSeeNear.x, uSeeNear.y, z)) * 0.9;
          if (fade > seeBayer(gl_FragCoord.xy)) discard; }`);
  };
  material.customProgramCacheKey = () => (prevKey ? prevKey.call(material) : '') + '|see2';
  return material;
}
