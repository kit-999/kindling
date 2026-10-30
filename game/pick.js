// Who's organizing tonight: pick a critter, a name and pronouns, so whoever's holding the phone can be themselves.
// Shown on the plain link only (any URL parameter skips it: the tests, and links that already say who you are).
// The choice is remembered in this browser and never sent anywhere.
const KINDS = ['fox', 'cat', 'bunny', 'dog', 'raccoon', 'fawn', 'hedgehog', 'badger', 'capybara'];

// little faces, drawn to match each species' colours in plush.js
const eyes = (y = 37, dx = 7.5, r = 3.1) => `<ellipse cx="${32 - dx}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#2a1d18"/><ellipse cx="${32 + dx}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#2a1d18"/>`
  + `<circle cx="${32 - dx + 1}" cy="${y - 1.2}" r="1.1" fill="#fff"/><circle cx="${32 + dx + 1}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`;
const blush = (y = 43) => `<ellipse cx="20.5" cy="${y}" rx="3.2" ry="1.8" fill="#f2a0b0" opacity=".55"/><ellipse cx="43.5" cy="${y}" rx="3.2" ry="1.8" fill="#f2a0b0" opacity=".55"/>`;
const nose = (c = '#2e1c16', y = 42.5) => `<ellipse cx="32" cy="${y}" rx="2.4" ry="1.7" fill="${c}"/>`;
export const FACE = {
  fox: `<path d="M13 30 L17 8 L29 22 Z" fill="#e07a3c"/><path d="M51 30 L47 8 L35 22 Z" fill="#e07a3c"/><path d="M16.5 13 L17 8 L21 12.5 Z" fill="#3a2a24"/><path d="M47.5 13 L47 8 L43 12.5 Z" fill="#3a2a24"/>
        <circle cx="32" cy="36" r="19" fill="#e07a3c"/><path d="M13.5 38 Q32 30 50.5 38 Q48 54 32 55 Q16 54 13.5 38 Z" fill="#fbeee0"/>${eyes()}${nose()}${blush()}`,
  cat: `<path d="M14 30 L16 9 L29 21 Z" fill="#55555e"/><path d="M50 30 L48 9 L35 21 Z" fill="#55555e"/><path d="M17.5 24 L18 14 L24 20 Z" fill="#f3b8c4"/><path d="M46.5 24 L46 14 L40 20 Z" fill="#f3b8c4"/>
        <circle cx="32" cy="36" r="19" fill="#55555e"/><ellipse cx="32" cy="45" rx="10" ry="7.5" fill="#e2ded6"/>${eyes(35)}${nose('#e88aa0', 41.5)}${blush(42)}`,
  bunny: `<ellipse cx="24" cy="15" rx="5.5" ry="13" fill="#f1ebe2"/><ellipse cx="40" cy="15" rx="5.5" ry="13" fill="#f1ebe2"/><ellipse cx="24" cy="16" rx="2.6" ry="9" fill="#f6c1cf"/><ellipse cx="40" cy="16" rx="2.6" ry="9" fill="#f6c1cf"/>
        <circle cx="32" cy="37" r="18.5" fill="#f1ebe2"/><ellipse cx="32" cy="45" rx="8.5" ry="6.5" fill="#fff"/>${eyes(36)}${nose('#f08ca4', 42)}${blush(43)}`,
  dog: `<circle cx="32" cy="35" r="19" fill="#e2b06a"/><ellipse cx="14" cy="35" rx="6" ry="12" fill="#c98f4e" transform="rotate(14 14 35)"/><ellipse cx="50" cy="35" rx="6" ry="12" fill="#c98f4e" transform="rotate(-14 50 35)"/>
        <ellipse cx="32" cy="46" rx="11" ry="8" fill="#fbecd2"/>${eyes(34)}${nose('#33201a', 42)}<path d="M29.5 46 Q32 48.5 34.5 46" stroke="#33201a" stroke-width="1.3" fill="none" stroke-linecap="round"/>${blush(43)}`,
  raccoon: `<circle cx="17" cy="20" r="6.5" fill="#8e8c94"/><circle cx="47" cy="20" r="6.5" fill="#8e8c94"/><circle cx="17" cy="20" r="3.4" fill="#ece8e2"/><circle cx="47" cy="20" r="3.4" fill="#ece8e2"/>
        <circle cx="32" cy="36" r="19" fill="#8e8c94"/><path d="M14 36 Q22 29 32 33 Q42 29 50 36 Q43 42 32 39 Q21 42 14 36 Z" fill="#3e3836"/>
        <ellipse cx="32" cy="46" rx="9" ry="7" fill="#ece8e2"/><circle cx="24.5" cy="36" r="3.4" fill="#2a1d18"/><circle cx="39.5" cy="36" r="3.4" fill="#2a1d18"/><circle cx="25.5" cy="35" r="1.1" fill="#fff"/><circle cx="40.5" cy="35" r="1.1" fill="#fff"/>${nose('#2a1c18', 43)}`,
  fawn: `<ellipse cx="13" cy="24" rx="5.5" ry="10" fill="#c98a52" transform="rotate(-48 13 24)"/><ellipse cx="51" cy="24" rx="5.5" ry="10" fill="#c98a52" transform="rotate(48 51 24)"/>
        <ellipse cx="13.5" cy="24" rx="2.6" ry="6" fill="#f6d3c8" transform="rotate(-48 13.5 24)"/><ellipse cx="50.5" cy="24" rx="2.6" ry="6" fill="#f6d3c8" transform="rotate(48 50.5 24)"/>
        <circle cx="32" cy="36" r="18.5" fill="#c98a52"/><ellipse cx="32" cy="46" rx="9" ry="7" fill="#f6e8d2"/><circle cx="26" cy="23" r="1.6" fill="#f6e8d2"/><circle cx="32" cy="21" r="1.6" fill="#f6e8d2"/><circle cx="38" cy="23" r="1.6" fill="#f6e8d2"/>${eyes(36, 7.5, 3.4)}${nose('#2a1c18', 43)}${blush(43)}`,
  hedgehog: `<path d="M11 36 L9 26 L16 27 L15 17 L22 21 L24 11 L30 18 L34 9 L37 18 L44 12 L45 21 L52 18 L50 27 L56 27 L53 36 Z" fill="#6e4c34"/>
        <circle cx="32" cy="38" r="17.5" fill="#eedcc2"/><circle cx="18.5" cy="27" r="3.2" fill="#e0bea0"/><circle cx="45.5" cy="27" r="3.2" fill="#e0bea0"/><ellipse cx="32" cy="46" rx="8" ry="6" fill="#f6eadb"/>${eyes(37, 7, 3)}${nose('#2a1c18', 43.5)}${blush(44)}`,
  badger: `<circle cx="16" cy="25" r="4.6" fill="#3e3836"/><circle cx="48" cy="25" r="4.6" fill="#3e3836"/><circle cx="32" cy="37" r="19" fill="#98979e"/>
        <path d="M26 19 Q32 16 38 19 L35.5 47 L28.5 47 Z" fill="#f4f1ea"/><path d="M17 31 Q24 26 28 30 L29 46 Q20 47 15 40 Z" fill="#3e3836"/><path d="M47 31 Q40 26 36 30 L35 46 Q44 47 49 40 Z" fill="#3e3836"/>
        <ellipse cx="32" cy="47" rx="8.5" ry="6" fill="#f4f1ea"/><circle cx="24" cy="36.5" r="2.9" fill="#120c0a"/><circle cx="40" cy="36.5" r="2.9" fill="#120c0a"/><circle cx="25" cy="35.5" r="1" fill="#fff"/><circle cx="41" cy="35.5" r="1" fill="#fff"/>${nose('#2a1c18', 44)}`,
  capybara: `<circle cx="20" cy="21" r="3.6" fill="#7a5232"/><circle cx="44" cy="21" r="3.6" fill="#7a5232"/><rect x="11" y="20" width="42" height="36" rx="19" fill="#b07f52"/>
        <rect x="16" y="36" width="32" height="19" rx="9.5" fill="#c9996c"/><circle cx="24" cy="31" r="2.6" fill="#2a1d18"/><circle cx="40" cy="31" r="2.6" fill="#2a1d18"/><circle cx="24.8" cy="30.2" r=".9" fill="#fff"/><circle cx="40.8" cy="30.2" r=".9" fill="#fff"/>
        <ellipse cx="27.5" cy="42" rx="1.6" ry="1.1" fill="#2e1c14"/><ellipse cx="36.5" cy="42" rx="1.6" ry="1.1" fill="#2e1c14"/><circle cx="32" cy="22.5" r="4" fill="#f5a23a"/>`,
};
// Lumi, for the bracelet panel (the robot isn't one of the critters you can be): glass dome, two antennae, a soft glow
FACE.robot = `<line x1="24" y1="15" x2="20" y2="6" stroke="#c9d2de" stroke-width="2"/><circle cx="20" cy="6" r="2.8" fill="#ffd6f5"/>
        <line x1="40" y1="15" x2="44" y2="6" stroke="#c9d2de" stroke-width="2"/><circle cx="44" cy="6" r="2.8" fill="#8be9fd"/>
        <rect x="11" y="14" width="42" height="36" rx="15" fill="#eef2f7"/><rect x="15" y="18" width="34" height="27" rx="12" fill="#bfe6f5" opacity=".75"/>
        <circle cx="25" cy="32" r="3.4" fill="#26314a"/><circle cx="39" cy="32" r="3.4" fill="#26314a"/><circle cx="26" cy="31" r="1.1" fill="#fff"/><circle cx="40" cy="31" r="1.1" fill="#fff"/>
        <path d="M28.5 38.5 Q32 41 35.5 38.5" stroke="#26314a" stroke-width="1.5" fill="none" stroke-linecap="round"/>${blush(39)}<rect x="21" y="50" width="22" height="8" rx="4" fill="#eef2f7"/>`;
const NAME = { fox: 'fox', cat: 'cat', bunny: 'bunny', dog: 'pup', raccoon: 'raccoon', fawn: 'fawn', hedgehog: 'hedgehog', badger: 'badger', capybara: 'capybara' };

function load() { try { return JSON.parse(localStorage.getItem('kindling-me') || '{}'); } catch { return {}; } }
function save(me) { try { localStorage.setItem('kindling-me', JSON.stringify(me)); } catch { /* private mode: not remembered */ } }
const done = ({ kind, name, pron, chapter }) => ({ kind: KINDS.includes(kind) ? kind : 'fox', name: (name || '').trim() || 'you', pron: (pron || '').trim(),
  named: !!(name || '').trim(), chapter: [1, 2, 3].includes(+chapter) ? +chapter : 1 });

export function pickMe(params) {
  const saved = load();
  // the chapter is not remembered: every visit starts at night one unless you pick another (or the link says ?chapter=2)
  const me = { kind: params.get('me') || saved.kind || 'fox', name: params.get('name') ?? saved.name ?? '', pron: params.get('pron') ?? saved.pron ?? '',
    chapter: params.get('chapter') || 1 };
  const panel = document.getElementById('pick');
  if (location.search.length > 1 || !panel) return Promise.resolve(done(me));
  const kinds = document.getElementById('kinds'), name = document.getElementById('pname'), pron = document.getElementById('ppron');
  kinds.innerHTML = KINDS.map(k => `<button type="button" data-k="${k}" aria-label="${NAME[k]}"><svg viewBox="0 0 64 64" aria-hidden="true">${FACE[k]}</svg><span>${NAME[k]}</span></button>`).join('');
  const mark = () => kinds.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === me.kind ? 'true' : 'false'));
  kinds.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { me.kind = b.dataset.k; mark(); } });
  name.value = me.name; pron.value = me.pron; mark();
  const chapters = document.getElementById('chapters');
  chapters?.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; me.chapter = +b.dataset.c;
    chapters.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
  panel.hidden = false;
  return new Promise(res => {
    let gone = false;
    const go = () => { if (gone) return; gone = true; me.name = name.value; me.pron = pron.value;
      save({ kind: me.kind, name: me.name, pron: me.pron }); name.blur(); pron.blur();
      panel.hidden = true; res(done(me)); };
    panel.addEventListener('submit', e => { e.preventDefault(); go(); });          // the begin button, or Enter
  });
}
