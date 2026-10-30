// Tents: each camper pitches their own after you've talked. Domes and striped A-frames in everyone's colours, and
// Lumi's, a translucent little dome with fairy lights inside that glow after dark. pitch() pops one up.
import * as THREE from 'three';
import { heightAt } from './world.js';
import { addSeeThrough } from './effects.js';

// see-through like the trees: a tent between you and the camera dissolves instead of filling the view
const fabric = (c, o = {}) => addSeeThrough(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.9, sheen: 0.6, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.5), side: THREE.DoubleSide, ...o }));
const stripes = (cols) => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d');
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 64 / cols.length, 0, 64 / cols.length + 1, 8); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2; return t; };

// where each one pitches, round the edge of the clearing, door facing the fire
export const TENT_SPOT = {
  Juniper: [-9.6, -4.6], Biscuit: [4.8, -7.9], Clover: [-10.4, 3.6], Comet: [7.0, 4.8], Nyx: [-6.0, 8.6],
  Thistle: [-4.2, -9.3], Rowan: [2.8, -10.0], Lumi: [-0.8, -10.2], Moss: [9.0, -7.6],
  you: [7.6, -5.4],                      // the organizer's, pitched from the setup list
};
const STYLE = {
  Juniper: ['dome', 0x7a9a5a, 0xb6a477], Biscuit: ['frame', 0xf2b84b, 0x5bcefa], Clover: ['dome', 0xf2a65a, 0xffd166],
  Comet: ['frame', 0xd8433a, 0xffffff], Nyx: ['dome', 0x4a2f7a, 0xf2c14e], Thistle: ['dome', 0xb9d8ff, 0xffffff],
  Rowan: ['frame', 0x6aa86b, 0xf6e8d2], Lumi: ['lumi', 0xf5c6d2, 0xbfe6ff], Moss: ['dome', 0x9ad1a0, 0x6aa86b],
  you: ['dome', 0xf5a9b8, 0x5bcefa],
};

// one tent, built at the origin facing +z (so a caller can place it); buildTents pitches and animates them
const glows = [];
export function makeTent(name) {
  {
    const [kind, main, accent] = STYLE[name], g = new THREE.Group();
    if (kind === 'dome' || kind === 'lumi') {
      const m = kind === 'lumi' ? new THREE.MeshPhysicalMaterial({ color: main, roughness: 0.5, transparent: true, opacity: 0.55, side: THREE.DoubleSide, sheen: 0.5 })
                                : fabric(main);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
      shell.scale.set(kind === 'lumi' ? 0.85 : 1.05, kind === 'lumi' ? 0.8 : 0.95, kind === 'lumi' ? 0.95 : 1.25); shell.castShadow = shell.receiveShadow = true; g.add(shell);
      const door = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20, 0, Math.PI), fabric(new THREE.Color(main).multiplyScalar(0.55)));
      door.position.set(0, 0.0, (kind === 'lumi' ? 0.95 : 1.25) - 0.02); door.scale.set(1, 1.25, 1); g.add(door);
      for (const r of [0.5, -0.5]) { const pole = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.012, 6, 32, Math.PI), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 }));
        pole.rotation.y = r + Math.PI / 2; pole.scale.set(kind === 'lumi' ? 0.86 : 1.06, kind === 'lumi' ? 0.81 : 0.96, 1); g.add(pole); }
      if (kind === 'lumi') {                                    // fairy lights inside
        const bulb = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd9a0, emissiveIntensity: 0.4 });
        glows.push(bulb);
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), bulb);
          b.position.set(Math.cos(a) * 0.62, 0.5 + Math.sin(a * 3) * 0.08, Math.sin(a) * 0.7); g.add(b); }
      }
    } else {                                                    // an A-frame: a three-sided prism lying on its side
      const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.9, 3, 1, true), fabric(0xffffff, { map: stripes([`#${new THREE.Color(main).getHexString()}`, `#${new THREE.Color(accent).getHexString()}`]) }));
      prism.rotation.set(Math.PI / 2, 0, 0); prism.rotation.z = Math.PI; prism.position.y = 0.42; prism.castShadow = prism.receiveShadow = true; g.add(prism);
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.85, 3), fabric(main)); back.position.set(0, 0.42, -0.95); back.rotation.z = -Math.PI / 2; g.add(back);
      const flapL = new THREE.Mesh(new THREE.CircleGeometry(0.85, 3, 0, Math.PI * 2 / 3), fabric(new THREE.Color(main).multiplyScalar(0.7)));
      flapL.position.set(0, 0.42, 0.95); flapL.rotation.z = -Math.PI / 2; g.add(flapL);
    }
    return g;
  }
}
// a lit tent wakes after dark; the organizer's tent comes from setup.js, so its light is ticked from here too
export function tentGlow(tod, t) { const night = THREE.MathUtils.smoothstep(tod, 0.5, 0.8);
  for (const m of glows) m.emissiveIntensity = 0.4 + night * 2.6 * (0.9 + 0.1 * Math.sin(t * 5)); }

// for the shader warm-up at load: every tent built once and thrown away, its materials compiled before anyone pitches;
// Lumi's fairy lights register a glow, so the list goes back to what it was (Day 248)
export function tentStandIns() { const n = glows.length, gs = Object.keys(STYLE).map(makeTent); glows.length = n; return gs; }

export function buildTents(scene) {
  const tents = {};
  // her tent's light is in the scene from the start, dark: a light joining later rebuilds every shader (the freezes)
  const lumiLight = new THREE.PointLight(0xffc890, 0, 4, 2); scene.add(lumiLight);
  function pitch(name) {
    if (!TENT_SPOT[name] || tents[name]) return;
    const [x, z] = TENT_SPOT[name], g = makeTent(name);
    g.position.set(x, heightAt(x, z), z); g.rotation.y = Math.atan2(-x, -z); g.scale.setScalar(0.001);
    g.userData.pop = 0.0001; scene.add(g); tents[name] = g;
    if (STYLE[name][0] === 'lumi') { lumiLight.position.set(x, heightAt(x, z) + 0.4, z); g.userData.light = lumiLight; }
  }
  // the last morning: folded away (the pop in reverse), then gone
  function fold(name) { const g = tents[name]; if (g && !g.userData.fold) g.userData.fold = 1; }
  function update(dt, t, tod) {
    for (const [name, g] of Object.entries(tents)) {
      if (g.userData.fold) { g.userData.fold = Math.max(0, g.userData.fold - dt * 1.4); const u = g.userData.fold;
        g.scale.set(1 + (1 - u) * 0.15, Math.max(0.001, u * u * (3 - 2 * u)), 1 + (1 - u) * 0.15);
        if (u <= 0) { scene.remove(g); delete tents[name]; if (g.userData.light) g.userData.light.intensity = 0; } continue; }
      if (g.userData.pop > 0 && g.userData.pop < 1) { g.userData.pop = Math.min(1, g.userData.pop + dt * 1.1); const u = g.userData.pop;
        g.scale.set(1 + Math.sin(u * Math.PI * 2.5) * 0.1 * (1 - u), Math.max(0.001, u * u * (3 - 2 * u)), 1 + Math.sin(u * Math.PI * 2.5) * 0.1 * (1 - u)); if (u >= 1) g.scale.setScalar(1); }
      if (g.userData.light) g.userData.light.intensity = THREE.MathUtils.smoothstep(tod, 0.5, 0.8) * 2.2;
    }
    tentGlow(tod, t);
  }
  return { pitch, fold, update, tents };
}
