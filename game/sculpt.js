// Sculpting: organic shapes from signed distance fields. A head is a few ellipsoids and round cones melted together
// (smooth union) with hollows carved out (eye sockets, the cup of an ear), turned into a mesh by surface nets and
// relaxed onto the true surface. Jerika, Day 245: "the heads are just orbs", "the bodies and arms and legs are kinda
// just orbs too", "the ears ... just sharp triangles". This is the answer: one continuous felted surface per part.
// Everything the fur shader needs rides along as vertex data: colour markings and how long the fur is there.
import * as THREE from 'three';

// ---- primitives: plain arrays, so the sampling loop stays fast ----
export const ell = (cx, cy, cz, rx, ry, rz) => ({ t: 0, a: [cx, cy, cz, rx, ry, rz], c: [cx, cy, cz], r: Math.max(rx, ry, rz) });
export const sph = (cx, cy, cz, r) => ({ t: 1, a: [cx, cy, cz, r], c: [cx, cy, cz], r });
export const cone = (ax, ay, az, bx, by, bz, r1, r2) => {      // a round cone: a sphere at a, a sphere at b, skinned
  const c = [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2];
  return { t: 2, a: [ax, ay, az, bx, by, bz, r1, r2], c, r: Math.hypot(bx - ax, by - ay, bz - az) / 2 + Math.max(r1, r2) };
};
// a union op melts a primitive in with radius k; a sub op carves it out
export const add = (p, k = 0.04) => ({ p, k, sub: false });
export const cut = (p, k = 0.02) => ({ p, k, sub: true });

function prim(p, x, y, z) {
  const a = p.a;
  if (p.t === 0) {                                   // ellipsoid (the usual bound: exact on the surface, close nearby)
    const px = (x - a[0]) / a[3], py = (y - a[1]) / a[4], pz = (z - a[2]) / a[5];
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / a[3], qy = py / a[4], qz = pz / a[5], k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(a[3], a[4], a[5]);
  }
  if (p.t === 1) return Math.hypot(x - a[0], y - a[1], z - a[2]) - a[3];
  // round cone, after Inigo Quilez
  const bax = a[3] - a[0], bay = a[4] - a[1], baz = a[5] - a[2], r1 = a[6], r2 = a[7];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = x - a[0], pay = y - a[1], paz = z - a[2];
  const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
  const wx = pax * l2 - bax * yy, wy = pay * l2 - bay * yy, wz = paz * l2 - baz * yy;
  const x2 = wx * wx + wy * wy + wz * wz, y2 = yy * yy * l2, z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

// the whole shape as one function; primitives too far away to matter are skipped by their bounding sphere
export function field(ops) {
  const n = ops.length;
  return (x, y, z) => {
    let d = prim(ops[0].p, x, y, z);
    for (let i = 1; i < n; i++) {
      const o = ops[i], c = o.p.c, lb = Math.hypot(x - c[0], y - c[1], z - c[2]) - o.p.r;
      if (o.sub) { if (lb >= o.k - d) continue; d = smax(d, -prim(o.p, x, y, z), o.k); }
      else { if (lb > d + o.k) continue; d = smin(d, prim(o.p, x, y, z), o.k); }
    }
    return d;
  };
}

// ---- surface nets: one vertex per cell the surface crosses, one quad per grid edge it crosses ----
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
export function sculpt(f, [x0, y0, z0], [x1, y1, z1], h, { center = [0, 0, 0], paint, fur, attrs = {} } = {}) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz), at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[at(i, j, k)] = f(x0 + i * h, y0 + j * h, z0 + k * h);
  const cx = nx - 1, cy = ny - 1, cell = new Int32Array(cx * cy * (nz - 1)).fill(-1), cAt = (i, j, k) => i + cx * (j + cy * k);
  const pos = [], v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = F[at(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1))]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of EDGES) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t; cnt++;
    }
    cell[cAt(i, j, k)] = pos.length / 3;
    pos.push(x0 + (i + sx / cnt) * h, y0 + (j + sy / cnt) * h, z0 + (k + sz / cnt) * h);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const inside = F[at(i, j, k)] < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && inside !== (F[at(i + 1, j, k)] < 0))
      quad(cell[cAt(i, j - 1, k - 1)], cell[cAt(i, j, k - 1)], cell[cAt(i, j, k)], cell[cAt(i, j - 1, k)], !inside);
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && inside !== (F[at(i, j + 1, k)] < 0))
      quad(cell[cAt(i - 1, j, k - 1)], cell[cAt(i - 1, j, k)], cell[cAt(i, j, k)], cell[cAt(i, j, k - 1)], !inside);
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && inside !== (F[at(i, j, k + 1)] < 0))
      quad(cell[cAt(i - 1, j - 1, k)], cell[cAt(i, j - 1, k)], cell[cAt(i, j, k)], cell[cAt(i - 1, j, k)], !inside);
  }
  // relax every vertex onto the true surface (two Newton steps), and take its normal from the field's gradient
  const n = pos.length / 3, nor = new Float32Array(n * 3), e = h * 0.35;
  const grad = (x, y, z) => { const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l]; };
  for (let i = 0; i < n; i++) {
    let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], g;
    for (let it = 0; it < 2; it++) { g = grad(x, y, z); const d = f(x, y, z); x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; }
    g = grad(x, y, z); pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; nor[i * 3] = g[0]; nor[i * 3 + 1] = g[1]; nor[i * 3 + 2] = g[2];
  }
  // uv: spherical about the part's centre, with the seam's triangles given their own copies of the vertices
  const P = pos, N = Array.from(nor), U = [];
  for (let i = 0; i < n; i++) { const dx = P[i * 3] - center[0], dy = P[i * 3 + 1] - center[1], dz = P[i * 3 + 2] - center[2], l = Math.hypot(dx, dy, dz) || 1;
    U.push(0.5 + Math.atan2(dx, dz) / (2 * Math.PI), 0.5 + Math.asin(Math.max(-1, Math.min(1, dy / l))) / Math.PI); }
  const dup = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const us = [U[idx[t] * 2], U[idx[t + 1] * 2], U[idx[t + 2] * 2]];
    if (Math.max(...us) - Math.min(...us) < 0.5) continue;
    for (let s = 0; s < 3; s++) { const vi = idx[t + s]; if (U[vi * 2] >= 0.5) continue;
      if (!dup.has(vi)) { dup.set(vi, P.length / 3); P.push(P[vi * 3], P[vi * 3 + 1], P[vi * 3 + 2]); N.push(N[vi * 3], N[vi * 3 + 1], N[vi * 3 + 2]); U.push(U[vi * 2] + 1, U[vi * 2 + 1]); }
      idx[t + s] = dup.get(vi); }
  }
  const g = new THREE.BufferGeometry(), m = P.length / 3;
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(idx);
  const col = new Float32Array(m * 3).fill(1), fl = new Float32Array(m).fill(0.6), c = new THREE.Color();
  for (let i = 0; i < m; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (paint) { c.setRGB(1, 1, 1); paint(c, x, y, z); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    if (fur) fl[i] = fur(x, y, z); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('fur', new THREE.BufferAttribute(fl, 1));
  for (const [name, fn] of Object.entries(attrs)) { const a = new Float32Array(m);
    for (let i = 0; i < m; i++) a[i] = fn(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); g.setAttribute(name, new THREE.BufferAttribute(a, 1)); }
  g.computeBoundingSphere();
  return g;
}

// march from a point along a direction until the surface: where to stick a quill, a button, a pair of glasses. From
// inside or outside alike: a step of |d| can never cross the surface, so it creeps up on it from whichever side it's on
export function surfaceAlong(f, o, dir, max = 1) {
  let t = 0; for (let i = 0; i < 96 && t < max; i++) { const d = f(o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t); if (Math.abs(d) < 2e-4) break; t += Math.abs(d); }
  return [o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t];
}
