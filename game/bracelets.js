// Friendship bracelets, after lunch on day two: everyone on the cushions with a tangle of thread. You pick three
// colours and someone to give it to; it goes on their wrist, and they trade you one back. The panel is HTML (the
// threads, the nine faces, a live braid in your colours); the bracelet itself is a little striped ring on a paw.
import * as THREE from 'three';
import { FACE } from './pick.js';
import { withFill } from './plush.js';

export const THREADS = [['pink', '#f5a9b8'], ['blue', '#5bcefa'], ['white', '#ffffff'], ['red', '#ff6b6b'], ['orange', '#ffa94d'],
  ['yellow', '#ffd166'], ['green', '#69db7c'], ['purple', '#b197fc'], ['lilac', '#e599f7'], ['black', '#2b2b33']];
const KIND = { Juniper: 'badger', Biscuit: 'dog', Clover: 'raccoon', Comet: 'fox', Nyx: 'cat', Moss: 'capybara', Thistle: 'hedgehog', Rowan: 'fawn', Lumi: 'robot' };

// the braid, drawn the way the real ones look: a row of chevrons, the three colours in turn
function braid(colors, w = 300, h = 40, tied = 1) {
  const m = h / 2;
  if (tied < 1) { const x0 = 2 + (w - 4) * tied, loose = colors.map((c, i) => `<path d="M${x0 - 4} ${m} C ${x0 + 30} ${m + (i - 1) * 4}, ${x0 + 60} ${8 + i * 12}, ${w - 6} ${8 + i * 12}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('');
    return `<defs><clipPath id="bclip"><rect x="2" y="4" width="${Math.max(0, x0 - 2)}" height="${h - 8}" rx="${m - 4}"/></clipPath></defs>${loose}<g clip-path="url(#bclip)">${braidPaths(colors, w, h)}</g>`; }
  return `<defs><clipPath id="bclip"><rect x="2" y="4" width="${w - 4}" height="${h - 8}" rx="${m - 4}"/></clipPath></defs>`
    + `<g clip-path="url(#bclip)">${braidPaths(colors, w, h)}</g><rect x="2" y="4" width="${w - 4}" height="${h - 8}" rx="${m - 4}" fill="none" stroke="rgba(0,0,0,.25)"/>`;
}
function braidPaths(colors, w, h) {
  const k = 14, n = Math.ceil(w / k) + 2, m = h / 2; let s = '';
  for (let i = -1; i < n; i++) { const x = i * k, c = colors[((i % 3) + 3) % 3];
    s += `<path d="M${x} 4 L${x + k} 4 L${x + k + 9} ${m} L${x + 9} ${m} Z" fill="${c}"/><path d="M${x + 9} ${m} L${x + k + 9} ${m} L${x + k} ${h - 4} L${x} ${h - 4} Z" fill="${c}" opacity=".86"/>`; }
  return s;
}

// the panel: tap threads to fill the three slots in turn (tap a slot to choose which one's next), tap a face, give it
export function braceletUI(names, start = ['#f5a9b8', '#ffffff', '#5bcefa'], onKnot = () => {}) {
  const el = document.getElementById('bracelet'), threads = el.querySelector('.threads'), who = el.querySelector('.bwho');
  const give = el.querySelector('.go'), pv = el.querySelector('.bpreview'), slots = el.querySelector('.slots');
  const pick = [...start]; let next = 0, to = null;
  threads.innerHTML = THREADS.map(([n, c]) => `<button type="button" data-c="${c}" aria-label="${n} thread" style="--c:${c}"></button>`).join('');
  who.innerHTML = names.map(n => `<button type="button" data-n="${n}" aria-pressed="false"><svg viewBox="0 0 64 64" aria-hidden="true">${FACE[KIND[n]]}</svg><span>${n}</span></button>`).join('');
  const draw = () => {
    pv.innerHTML = braid(pick);
    slots.innerHTML = pick.map((c, i) => `<button type="button" data-i="${i}" aria-label="thread ${i + 1}" class="${i === next ? 'next' : ''}" style="--c:${c}"></button>`).join('');
    who.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.n === to ? 'true' : 'false'));
    give.disabled = !to; give.textContent = to ? `give it to ${to} ✨` : 'pick who it’s for';
  };
  threads.onclick = e => { const b = e.target.closest('button'); if (!b) return; pick[next] = b.dataset.c; next = (next + 1) % 3; draw(); };
  slots.onclick = e => { const b = e.target.closest('button'); if (!b) return; next = +b.dataset.i; draw(); };
  who.onclick = e => { const b = e.target.closest('button'); if (!b) return; to = b.dataset.n; draw(); };
  draw(); el.hidden = false;
  // then you tie it off, a knot at a time, the braid growing along the preview (Day 246, Jerika: "a little more
  // substance during the friendship bracelet part would be cool")
  const title = el.querySelector('.bt'), KNOTS = 5;
  return new Promise(res => { let knots = -1;
    give.onclick = () => { if (!to) return;
      if (knots < 0) { knots = 0; el.classList.add('tying'); title.textContent = `tie it off for ${to} 🪢`; }
      else { knots++; onKnot(knots); }
      pv.innerHTML = braid(pick, 300, 40, 0.12 + 0.88 * knots / KNOTS);
      give.textContent = knots < KNOTS ? `tie a knot · ${knots} of ${KNOTS}` : 'done ✨';
      if (knots >= KNOTS) { give.disabled = true; setTimeout(() => { el.hidden = true; el.classList.remove('tying'); title.textContent = 'make a friendship bracelet 🧵'; give.disabled = false;
        res({ colors: [...pick], who: to }); }, 650); } }; });
}

// while everyone braids, what you overhear round the circle; then, once yours is given, everyone else trades too
// ([giver, receiver, giver's line, receiver's line]; neighbours on the cushions, so a two-shot holds them both)
export const CHATTER = [
  ['Rowan', "I'm spelling my name in knots. R, O, W... I ran out of thread at W."],
  ['Comet', "Mine's a lasso. It's a bracelet AND a lasso. Two talents."],
  ['Biscuit', "Moss is braiding in their sleep. ...It's actually really good?"],
];
export const TRADES = [
  ['Comet', 'Biscuit', 'Trade. Race you to put it on.', 'I WIN. I always win at bracelets.'],
  ['Nyx', 'Moss', "Moss, trade? ...They're asleep. I'll just. There.", '...zzz. ...thank you.'],
  ['Rowan', 'Thistle', 'I made you one. Is that... okay?', 'I drew yours before I made it. Here.'],
  ['Clover', 'Lumi', 'I used every yellow I had. For you. For no reason.', "...I'm glowing. Sorry. I can't help it."],
];

// what they say when you give them yours, what they say trading you theirs, and the colours of the one they made you
export const GIFT = {
  Juniper: ["Twelve summers, and nobody's made me one in these colours. Thank you, organizer.", "Here. Trade. I made yours first thing this morning.", ['#c9a0dc', '#ffffff', '#69db7c']],
  Biscuit: ["For ME? It's going on my paw. Then my guitar. Then my paw again.", "Trade! I made yours with the good blue.", ['#5bcefa', '#f5a9b8', '#ffffff']],
  Clover:  ["It's so pretty. I'm going to show Lumi. For no reason.", "Trade? Yours has a little snack-coloured stripe.", ['#ffd166', '#ffa94d', '#f5a9b8']],
  Comet:   ["This is the best bracelet ever made. I'm not even competing. For once.", "Trade. Mine's better. Kidding. Mostly.", ['#ff6b6b', '#ffd166', '#ffffff']],
  Nyx:     ["The cards didn't tell me about this one. I love it when they don't.", "Here. I pulled a card for your colours. It said these.", ['#b197fc', '#2b2b33', '#ffd166']],
  Moss:    ["...I'll wear it in the hammock. Forever. Possibly asleep.", "...I made you one too. In my sleep, I think.", ['#69db7c', '#ffa94d', '#69db7c']],
  Thistle: ["I'm drawing it. Then I'm wearing it. Then I'm drawing me wearing it.", "Trade? I matched yours to your scarf.", ['#f5a9b8', '#ffffff', '#f5a9b8']],
  Rowan:   ["My first one as Rowan.", "I made you one too. I've been holding it all day.", ['#5bcefa', '#f5a9b8', '#ffffff']],
  Lumi:    ["I'll glow in these colours tonight. I can do that, you know.", "Trade. I picked the colours I glow when I'm happy.", ['#ffffff', '#8be9fd', '#ffd6f5']],
};

// the bracelet on a paw: a small ring, striped on the diagonal in the three colours
function braceletMesh(colors) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 16; const g = c.getContext('2d');
  for (let i = -3; i < 20; i++) { g.fillStyle = colors[((i % 3) + 3) % 3]; g.beginPath();
    g.moveTo(i * 6, 0); g.lineTo(i * 6 + 6, 0); g.lineTo(i * 6 + 6 - 9, 16); g.lineTo(i * 6 - 9, 16); g.closePath(); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.017, 8, 30), withFill(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })));
  m.castShadow = true; return m;
}
export function wear(c, colors, side = 0) {
  const arm = c.rig?.arms?.[side]; if (!arm) return null;
  const paw = c.rig.paw ?? new THREE.Vector3(0, -0.09, 0);
  const m = braceletMesh(colors); m.position.set(paw.x, paw.y + 0.06, paw.z * 0.5); m.rotation.x = Math.PI / 2; arm.add(m); m.name = 'bracelet';
  return m;
}
