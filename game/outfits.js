// Everyone's thing, placed from the anchors each plush reports (top of the head, eyes, chest, back, paw) rather than
// from numbers that only fit one body: Juniper's hat full of pins, Biscuit's guitar, Nyx's crescent moon and tarot
// card, Clover's snack backpack, Comet's bandana, Rowan's backpack, Thistle's round glasses, and an orange on Moss's
// head, because that is what capybaras do.
import * as THREE from 'three';
import { withFill } from './plush.js';

const V3 = THREE.Vector3;
const mat = (color, o = {}) => withFill(new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));
const add = (parent, geo, m, x, y, z, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(...s); o.castShadow = true; parent.add(o); return o;
};
const dotsTex = (bg, fg) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 64, 64); g.fillStyle = fg;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 16 + (y % 2) * 8 + 4, y * 16 + 8, 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

export function dress(c, name) {
  const r = c.rig; if (!r || !r.body) return;
  const { hop, head, arms, W } = r, back = r.back, chest = r.chest;
  if (name === 'Juniper') {                                   // a camp bucket hat, covered in pins
    const hat = new THREE.Group(); hat.position.copy(r.headTop).add(new V3(0, -0.06, -0.01)); hat.rotation.x = -0.14; head.add(hat);
    const khaki = mat(0xb6a477, { roughness: 1 });
    add(hat, new THREE.CylinderGeometry(0.27, 0.285, 0.02, 32), khaki, 0, 0, 0);
    add(hat, new THREE.CylinderGeometry(0.165, 0.195, 0.12, 32), khaki, 0, 0.065, 0);
    add(hat, new THREE.TorusGeometry(0.192, 0.013, 8, 32), mat(0x6b4a34), 0, 0.022, 0, Math.PI / 2);
    [0xf5a9b8, 0x5bcefa, 0xffffff, 0xffd166, 0xb7a3d9, 0x9ad1a0, 0xff7a59].forEach((col, i) => {
      const a = -0.95 + i * 0.32; add(hat, new THREE.CylinderGeometry(0.022, 0.022, 0.009, 14), mat(col, { roughness: 0.3, metalness: 0.2 }),
        Math.sin(a) * 0.182, 0.06 + (i % 2) * 0.03, Math.cos(a) * 0.182, Math.PI / 2, 0, -a); });
  }
  if (name === 'Biscuit') {                                   // a guitar slung across his back
    const g = new THREE.Group(); g.name = 'guitar'; g.position.set(0.02, 0.4, back.z - 0.045); g.rotation.set(0.1, 0, 0.55); g.scale.setScalar(0.85); hop.add(g);
    const wood = mat(0xc98a4a, { roughness: 0.45 });
    add(g, new THREE.SphereGeometry(1, 20, 12), wood, 0, -0.06, 0, 0, 0, 0, [0.17, 0.15, 0.05]);
    add(g, new THREE.SphereGeometry(1, 20, 12), wood, 0, 0.12, 0, 0, 0, 0, [0.13, 0.11, 0.05]);
    add(g, new THREE.CircleGeometry(0.045, 16), mat(0x2a1a10), 0, 0.03, -0.051, 0, Math.PI, 0);
    add(g, new THREE.BoxGeometry(0.045, 0.34, 0.03), mat(0x5a3a22), 0, 0.38, 0);
    add(g, new THREE.BoxGeometry(0.07, 0.08, 0.035), mat(0x3a2414), 0, 0.58, 0);
    add(hop, new THREE.TorusGeometry(0.235 * W, 0.012, 6, 36), mat(0x7a3a5a), 0, 0.43, -0.01, 0, 0, 0.55, [1, 1, 0.85]);
  }
  if (name === 'Nyx') {                                       // a crescent moon on a fine chain, and a tarot card
    const gold = mat(0xf2c14e, { roughness: 0.25, metalness: 0.8 });
    add(hop, new THREE.TorusGeometry(0.14 * W, 0.005, 6, 36), gold, 0, 0.585, 0.012, Math.PI / 2 - 0.35);
    add(hop, new THREE.TorusGeometry(0.035, 0.009, 8, 24, Math.PI * 1.25), gold, 0, 0.5, chest.z + 0.045, 0, 0, Math.PI * 0.4);
    if (arms[1]) { const card = add(arms[1], new THREE.BoxGeometry(0.075, 0.11, 0.006), mat(0x4a2f7a, { roughness: 0.6 }), 0.0, -0.21, r.paw.z + 0.025, -0.3, 0.2, 0); card.name = 'tarot';
      add(card, new THREE.CircleGeometry(0.018, 5), mat(0xf2c14e, { emissive: 0xf2c14e, emissiveIntensity: 0.4 }), 0, 0, 0.0035); }
  }
  if (name === 'Clover') {                                    // a backpack stuffed with snacks
    const pack = new THREE.Group(); pack.position.set(0, 0.42, back.z - 0.06); hop.add(pack);
    add(pack, new THREE.CapsuleGeometry(0.13, 0.09, 6, 14), mat(0xf2a65a, { roughness: 0.9 }), 0, 0, 0, 0, 0, 0, [1.1, 1, 0.7]);
    add(pack, new THREE.BoxGeometry(0.12, 0.11, 0.05), mat(0xe8434a, { roughness: 0.4 }), 0.05, 0.19, 0.0, 0.2, 0, 0.25);
    add(pack, new THREE.BoxGeometry(0.09, 0.085, 0.04), mat(0x5bcefa, { roughness: 0.4 }), -0.055, 0.17, -0.01, -0.1, 0, -0.3);
    for (const sx of [-1, 1]) add(hop, new THREE.TorusGeometry(0.12, 0.011, 6, 20, Math.PI), mat(0xc77a3a), sx * 0.13 * W, 0.45, -0.03, 0, Math.PI / 2, 0, [1, 1.15, 1]);
  }
  if (name === 'Comet') {                                     // a polka-dot bandana instead of a scarf
    const sc = hop.children.find(o => o.geometry && o.geometry.type === 'TorusGeometry'); if (sc) sc.visible = false;
    const red = mat(0xd8433a, { roughness: 0.9 });
    add(hop, new THREE.TorusGeometry(0.122 * W, 0.028, 8, 28), red, 0, 0.6, 0.008, Math.PI / 2);
    add(hop, new THREE.ConeGeometry(0.11, 0.15, 3), mat(0xffffff, { map: dotsTex('#d8433a', '#ffffff'), roughness: 0.9 }), 0, 0.52, chest.z + 0.03, Math.PI + 0.3, 0, 0, [1, 1, 0.25]);
  }
  if (name === 'Rowan') {                                     // a little green backpack
    add(hop, new THREE.CapsuleGeometry(0.11, 0.07, 6, 14), mat(0x6aa86b, { roughness: 0.9 }), 0, 0.42, back.z - 0.05, 0, 0, 0, [1.05, 1, 0.7]);
    add(hop, new THREE.BoxGeometry(0.11, 0.055, 0.03), mat(0x4e8a52), 0, 0.35, back.z - 0.115);
    for (const sx of [-1, 1]) add(hop, new THREE.TorusGeometry(0.11, 0.01, 6, 20, Math.PI), mat(0x4e8a52), sx * 0.12 * W, 0.45, -0.03, 0, Math.PI / 2, 0, [1, 1.15, 1]);
  }
  if (name === 'Thistle') {                                   // round glasses, sitting just in front of the eyes
    const frame = mat(0x4a3424, { roughness: 0.4 }), R = r.er * 1.55;
    for (const e of r.eyes) add(head, new THREE.TorusGeometry(R, 0.0055, 8, 28), frame, e.x, e.y, e.z + r.er * 0.95, 0, Math.atan2(e.x, 0.35) * 0.6, 0);
    const [l, rr] = r.eyes, gap = (rr.x - l.x) / 2 - R;
    if (gap > 0.004) add(head, new THREE.TorusGeometry(gap, 0.005, 6, 12, Math.PI), frame, 0, l.y + 0.006, l.z + r.er * 1.05, 0, 0, 0, [1, 0.6, 1]);
  }
  if (name === 'Moss') {                                      // an orange, balanced on the head, as is tradition
    add(head, new THREE.SphereGeometry(0.07, 16, 12), mat(0xf5a23a, { roughness: 0.6 }), r.headTop.x, r.headTop.y + 0.055, r.headTop.z);
    add(head, new THREE.SphereGeometry(1, 8, 6), mat(0x4f8a3a), r.headTop.x + 0.025, r.headTop.y + 0.12, r.headTop.z, 0, 0, 0.6, [0.03, 0.01, 0.017]);
  }
}
