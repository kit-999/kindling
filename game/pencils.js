// Thistle's colored pencils. The case blew open in the night and five pencils are scattered round camp: by the stream,
// under Moss's hammock, behind Lumi's tent, in the flowers by Clover's, and down at the trailhead. Each lies in the grass
// with a little marker bobbing over it (drawn on top, so a pencil behind a tree is still findable). Find all five and
// Thistle draws in colour that night. (Day 246, Jerika: "maybe a little more wandering in the game instead? like some
// activity where you need to explore the space a little? not tooooo much... it's a pretty camp.")
import * as THREE from 'three';
import { heightAt, streamX } from './world.js';
import { withFill } from './plush.js';

export const PENCILS = [
  { at: [streamX(5.5) - 2.4, 5.5], color: 0x5bcefa, name: 'blue' },        // by the stream
  { at: [9.4, -3.2], color: 0xf5a9b8, name: 'pink' },                      // under the hammock
  { at: [-0.4, -12.0], color: 0xb197fc, name: 'purple' },                  // behind Lumi's tent
  { at: [-8.9, 5.6], color: 0xffd166, name: 'yellow' },                    // in the flowers by Clover's tent
  { at: [0.6, 12.4], color: 0x69db7c, name: 'green' },                     // down at the trailhead
];

function markerTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 10, 64, 64, 62); r.addColorStop(0, 'rgba(255, 246, 225, .95)'); r.addColorStop(0.72, 'rgba(255, 236, 200, .9)'); r.addColorStop(1, 'rgba(255, 236, 200, 0)');
  g.fillStyle = r; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
  g.font = '60px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✏️', 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(0.4, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function pencilMesh(color) {
  const g = new THREE.Group(), m = (c, o = {}) => withFill(new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6), m(color)); g.add(body);
  const wood = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.075, 6), m(0xecd2a4)); wood.position.y = 0.1975; g.add(wood);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.028, 6), m(color, { roughness: 0.4 })); lead.position.y = 0.221; g.add(lead);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.03, 10), m(0xc8c8d0, { metalness: 0.6, roughness: 0.35 })); band.position.y = -0.175; g.add(band);
  const rub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.034, 0.045, 10), m(0xf2a0b0)); rub.position.y = -0.21; g.add(rub);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function buildPencils(scene) {
  const tex = markerTex(), glow = glowTex();
  const list = PENCILS.map(({ at: [x, z], color, name }, i) => {
    const y = heightAt(x, z), g = new THREE.Group(), p = pencilMesh(color);
    p.rotation.z = Math.PI / 2; p.position.y = 0.04; g.add(p); g.position.set(x, y, z); g.rotation.y = i * 1.7 + 0.4; g.scale.setScalar(2.1);
    // the marker: big enough to spot across camp (the first ones were beads at play distance), a soft glow behind it
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true }));
    mark.scale.setScalar(0.72); mark.renderOrder = 11; mark.position.set(x, y + 1.15, z);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: color, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    halo.scale.setScalar(1.5); halo.renderOrder = 10; mark.add(halo); halo.scale.setScalar(2.1);
    g.visible = mark.visible = false; scene.add(g, mark);
    const pen = { x, z, y, g, mark, halo, name, got: false };
    pen.act = { label: `pick up the ${name} pencil ✏️`, run: null };             // main.js fills in run
    return pen;
  });
  let on = false, found = 0;
  return {
    list, total: list.length, get found() { return found; }, get on() { return on; },
    show(v) { on = v; for (const p of list) { p.g.visible = p.mark.visible = v && !p.got; } },
    near(pos) { if (!on) return null; return list.find(p => !p.got && Math.hypot(p.x - pos.x, p.z - pos.z) < 1.25) || null; },
    pick(p) { if (p.got) return found; p.got = true; p.g.visible = p.mark.visible = false; return ++found; },
    // the marker fades as you walk up (you've found it; close to the camera it was a big blur over the screen)
    update(t, you) { list.forEach((p, i) => { if (!p.mark.visible) return; p.mark.position.y = p.y + 1.15 + Math.sin(t * 2.4 + i) * 0.1;
      const near = you ? THREE.MathUtils.smoothstep(Math.hypot(you.x - p.x, you.z - p.z), 1.0, 3.2) : 1;
      p.mark.scale.setScalar(0.72 * (1 + 0.08 * Math.sin(t * 3.1 + i))); p.mark.material.opacity = near; p.halo.material.opacity = (0.55 + 0.3 * Math.sin(t * 3.1 + i)) * near; }); },
  };
}
