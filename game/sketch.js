// Thistle's sketchbook (and Nyx's card). Thistle draws everyone, all weekend ("I'm drawing you. Hold still. ...kidding."), and on day two
// and day three you finally see the drawings: a picture of the camp you actually played (your group photo from night one,
// or the view from the lookout) turned into pencil: soft grey tones from the picture's light, darker lines where it
// changes, a little grain, on a page with a spiral binding and a caption in Thistle's hand.

// a copy of a canvas, taken right away (a WebGL canvas clears after it's shown, so it can't be kept by reference)
export function copyCanvas(src, w = src.width, h = src.height) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(src, 0, 0, w, h); return c;
}

function boxBlur(a, W, H, r) {                     // separable box blur on a luminance array
  const t = new Float32Array(a.length), o = new Float32Array(a.length), n = 2 * r + 1;
  for (let y = 0; y < H; y++) { let s = 0; const row = y * W;
    for (let x = -r; x <= r; x++) s += a[row + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { t[row + x] = s / n; s += a[row + Math.min(W - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
  for (let x = 0; x < W; x++) { let s = 0;
    for (let y = -r; y <= r; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { o[y * W + x] = s / n; s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
  return o;
}

// a little value noise, for wobbling the hatching and fraying the edges
function noise2(seed) {
  const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
}
const sstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// the drawing itself: W×H, cropped to fill from the middle of the source. Outlines where the picture changes (a pixel
// against a blurred version of its neighbourhood), and the shading as hatching: one set of diagonal strokes in the
// mid-tones, crossed in the darks, a third set in the deepest shadow, each a little wobbly; the edges fray out into
// bare paper the way a sketch that wasn't meant for anyone does
export function pencil(src, W = 720, H = 540, colored = false) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const k = Math.max(W / src.width, H / src.height), sw = W / k, sh = H / k;
  g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data, N = W * H, L = new Float32Array(N), C = colored ? Uint8ClampedArray.from(d) : null;
  for (let i = 0; i < N; i++) L[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
  // levels from the picture itself, so a night photo by the fire still has a full range of greys
  const sorted = Float32Array.from(L).sort(), lo = sorted[Math.floor(N * 0.02)], hi = Math.max(lo + 1, sorted[Math.floor(N * 0.98)]);
  for (let i = 0; i < N; i++) L[i] = Math.min(255, Math.max(0, (L[i] - lo) / (hi - lo) * 255));
  const S = boxBlur(L, W, H, 1), B = boxBlur(S, W, H, 6);
  const nz = noise2(7), fray = noise2(19), grain = noise2(31), edge = 0.13 * Math.min(W, H);
  const paper = [248, 244, 235], lead = [54, 57, 72];
  const hatch = (u, width) => { const f = u - Math.floor(u), dist = Math.min(f, 1 - f) * 2; return 1 - sstep(width - 0.14, width + 0.06, dist); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x;
    const ink = Math.min(1, Math.max(0, (1 - S[i] / Math.max(1, B[i])) * 3.4));        // darker than its surroundings: a line
    let dark = sstep(0.16, 0.95, 1 - S[i] / 255); const w = (nz(x / 23, y / 23) - 0.5) * 0.5;
    if (C) { const r = C[i * 4], gg = C[i * 4 + 1], b = C[i * 4 + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);   // colour gets strokes too, not just shadow
      dark = Math.max(dark, mx ? (mx - mn) / mx * 0.8 : 0); }
    let sh = 0;
    if (dark > 0.1) sh = Math.max(sh, hatch((x + y) / 6.5 + w, Math.min(0.62, (dark - 0.1) * 1.6)));
    if (dark > 0.42) sh = Math.max(sh, hatch((x - y) / 7.5 + w, Math.min(0.55, (dark - 0.42) * 1.8)));
    if (dark > 0.72) sh = Math.max(sh, hatch((x + 0.3 * y) / 5.2 - w, Math.min(0.5, (dark - 0.72) * 2.2)));
    const m = Math.min(1, Math.max(0, Math.min(x, W - 1 - x, y, H - 1 - y) / edge + (fray(x / 38, y / 38) - 0.55) * 1.3));
    const gph = Math.min(1, Math.max(ink * 0.95, sh * 0.72)) * m * (0.9 + 0.1 * grain(x / 2.1, y / 2.1));
    const p = (1 - gph) * (0.985 + 0.03 * grain(x / 7, y / 7));
    let lr = lead[0], lg = lead[1], lb = lead[2];
    if (C) {   // coloured pencil: the strokes take the picture's own colour, brighter and more saturated, outlines stay darker
      const r = C[i * 4], gg = C[i * 4 + 1], b = C[i * 4 + 2], mx = Math.max(r, gg, b, 1), mean = (r + gg + b) / 3, boost = 230 / mx;
      const sr = Math.min(255, (mean + (r - mean) * 1.7) * boost), sg = Math.min(255, (mean + (gg - mean) * 1.7) * boost), sb = Math.min(255, (mean + (b - mean) * 1.7) * boost);
      const k = Math.min(1, ink * 1.4) * 0.55;                   // how much of a line this is: lines are mostly graphite
      lr = Math.max(0, sr * 0.72) * (1 - k) + lead[0] * k; lg = Math.max(0, sg * 0.72) * (1 - k) + lead[1] * k; lb = Math.max(0, sb * 0.72) * (1 - k) + lead[2] * k; }
    d[i * 4] = paper[0] * p + lr * (1 - p); d[i * 4 + 1] = paper[1] * p + lg * (1 - p); d[i * 4 + 2] = paper[2] * p + lb * (1 - p); d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// the page: cream paper, a spiral binding along the top, the drawing a little crooked, a caption in Thistle's hand
export function sketchCanvas(src, caption, sign = '— Thistle', colored = false) {
  const W = 900, H = 820, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(120, 100, 70, .06)'; for (let y = 120; y < H - 30; y += 34) g.fillRect(40, y, W - 80, 2);      // faint ruled lines
  const art = pencil(src, 760, 540, colored);
  g.save(); g.translate(W / 2, 100 + 270); g.rotate(-0.012); g.globalCompositeOperation = 'multiply'; g.drawImage(art, -380, -270); g.restore();
  for (let x = 60; x < W - 40; x += 52) {                                                                         // the spiral
    g.fillStyle = '#e4dccb'; g.beginPath(); g.arc(x, 38, 11, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6d6f7a'; g.lineWidth = 5; g.beginPath(); g.arc(x, 30, 12, Math.PI * 0.95, Math.PI * 2.05); g.stroke(); }
  g.fillStyle = '#3d4050'; g.textAlign = 'left';
  g.font = '44px "Marker Felt", "Comic Sans MS", "Chalkboard SE", ui-rounded, system-ui, sans-serif'; g.fillText(caption, 64, H - 92);
  g.textAlign = 'right'; g.font = '34px "Marker Felt", "Comic Sans MS", "Chalkboard SE", ui-rounded, system-ui, sans-serif'; g.fillText(sign, W - 60, H - 40);
  return c;
}
export const sketchPage = (src, caption, sign) => sketchCanvas(src, caption, sign).toDataURL('image/jpeg', 0.88);

// Nyx's card: XVII, The Star. Night blue, a gold border, one great eight-pointed star and seven small ones over a
// pool that holds their light
export function starCard() {
  const W = 600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#141838'); bg.addColorStop(0.6, '#2a2563'); bg.addColorStop(1, '#3b2b6e');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gold = '#e9c66b';
  g.strokeStyle = gold; g.lineWidth = 6; g.strokeRect(18, 18, W - 36, H - 36); g.lineWidth = 2; g.strokeRect(32, 32, W - 64, H - 64);
  const star = (x, y, R, r, n, fill, glow = 0) => { g.save(); g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.shadowColor = fill; g.shadowBlur = glow; g.fillStyle = fill; g.fill(); g.restore(); };
  // a scatter of tiny stars, the big one, and seven around it
  let sd = 3; const rnd = () => ((sd = (sd * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,240,${0.25 + rnd() * 0.5})`; g.fillRect(50 + rnd() * (W - 100), 50 + rnd() * 560, 2, 2); }
  star(W / 2, 300, 170, 52, 8, gold, 40); star(W / 2, 300, 120, 40, 8, '#fff3c4', 20);
  [[120, 150], [480, 150], [95, 330], [505, 330], [150, 500], [450, 500], [W / 2, 560]].forEach(([x, y], i) => star(x, y, 30 - (i % 3) * 4, 9, 8, '#fff8e8', 14));
  // the pool, and the light in it
  const pool = g.createLinearGradient(0, 640, 0, 860); pool.addColorStop(0, '#2e5f8c'); pool.addColorStop(1, '#173a5e');
  g.fillStyle = '#26335a'; g.beginPath(); g.moveTo(40, 700); g.quadraticCurveTo(170, 610, 300, 660); g.quadraticCurveTo(430, 610, 560, 690); g.lineTo(560, 880); g.lineTo(40, 880); g.fill();
  g.fillStyle = pool; g.beginPath(); g.ellipse(W / 2, 770, 230, 70, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255, 240, 200, .55)'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(W / 2, 770, 40 + i * 32, 10 + i * 9, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  star(W / 2, 772, 26, 8, 8, '#fff3c4', 18);
  // the banner
  g.fillStyle = '#141838'; g.fillRect(70, 885, W - 140, 72); g.strokeStyle = gold; g.lineWidth = 2; g.strokeRect(70, 885, W - 140, 72);
  g.fillStyle = gold; g.textAlign = 'center'; g.font = '600 40px Georgia, "Times New Roman", serif'; g.fillText('XVII · THE STAR', W / 2, 935);
  g.font = '600 34px Georgia, "Times New Roman", serif'; g.fillText('XVII', W / 2, 95);
  return { canvas: c, url: c.toDataURL('image/jpeg', 0.9) };
}

// your bracelet, small, for the keepsakes at the end
export function braceletSvg(colors) {
  const k = 14, n = 16, h = 40, m = h / 2; let s = '';
  for (let i = -1; i < n; i++) { const x = i * k, col = colors[((i % 3) + 3) % 3];
    s += `<path d="M${x} 4 L${x + k} 4 L${x + k + 9} ${m} L${x + 9} ${m} Z" fill="${col}"/><path d="M${x + 9} ${m} L${x + k + 9} ${m} L${x + k} ${h - 4} L${x} ${h - 4} Z" fill="${col}" opacity=".86"/>`; }
  return `<svg viewBox="0 0 220 ${h}" aria-label="your bracelet"><defs><clipPath id="kclip"><rect x="2" y="4" width="216" height="${h - 8}" rx="${m - 4}"/></clipPath></defs><g clip-path="url(#kclip)">${s}</g></svg>`;
}
