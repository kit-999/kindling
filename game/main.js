// Kindling: the loop. Renderer + bloom, the follow camera, drag/WASD walking, collisions, setting up, the campers
// arriving and talking, and the evening's clock (which follows what you've done, not the wall clock).
// Test hooks live on window.__camp so a headless browser can drive it.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSky } from './sky.js';
import { buildWorld, heightAt, streamX, waterY, HIKE, LOOKOUT, REST_AT } from './world.js';
import { makeCritter, setEnv, look, setFurShells, setSculptDetail } from './critter.js';
import { dress } from './outfits.js';
import { buildSetup } from './setup.js';
import { createTalker, TALKS, GREETS, MORNING, BYES, CIRCLE } from './dialogue.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { wind, buildGrass, buildAir, GodRaysShader, GradeShader, seeThrough } from './effects.js';
import { buildTents, TENT_SPOT, tentStandIns } from './tents.js';
import { buildDuck } from './duck.js';
import { buildFire, runFinale, PLAYER_SEAT } from './campfire.js';
import { buildAmbient } from './ambient.js';
import { createAudio } from './audio.js';
import { pickMe } from './pick.js';
import { createBarks } from './barks.js';
import { buildMorning, BOARD_AT } from './morning.js';
import { buildSwim, JUMP_AT, SWIM_Z, spotOf } from './swim.js';
import { braceletUI, wear, GIFT, CHATTER, TRADES } from './bracelets.js';
import { buildStage, runTalentShow, AUDIENCE, HOST_AT, STAGE } from './talent.js';
import { buildLookout, runLookout, RAIL, LOOK_YAW, buildRest, runRest } from './daythree.js';
import { copyCanvas, sketchCanvas, starCard, braceletSvg } from './sketch.js';
import { buildPencils } from './pencils.js';

const params = new URLSearchParams(location.search);
// who you are tonight: picked on the start screen (or given in the link), before anything heavy is built
const me = await pickMe(params);
await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));   // let "gathering the campers…" paint first
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
const sky = createSky(scene);
const world = buildWorld(scene);
const setup = buildSetup(scene, world);
sky.sun.shadow.mapSize.set(renderer.getPixelRatio() > 1.5 ? 1536 : 2048, renderer.getPixelRatio() > 1.5 ? 1536 : 2048);

// quality: her PC gets everything; a phone gets a lighter field and shorter light shafts
const HIGH = params.get('q') ? params.get('q') === 'high' : matchMedia('(pointer: fine)').matches;
// multisampled: without it every silhouette stair-steps and the fur's strands speckle (half of what read as "N64")
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1), samples: HIGH ? 4 : 2 });
const composer = new EffectComposer(renderer, rt);
composer.renderTarget2.depthTexture = new THREE.DepthTexture(1, 1);   // its own: a cloned target shares the depth texture, and the
                                                                       // light-shaft pass would read the one it writes (feedback loop)
composer.addPass(new RenderPass(scene, camera));
const rays = new ShaderPass(GodRaysShader); composer.addPass(rays);
if (params.has('norays')) rays.enabled = false;    // a debug knob: the veil hunt needs a with/without
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.55, 0.85);
composer.addPass(bloom);
const grade = new ShaderPass(GradeShader); composer.addPass(grade);
composer.addPass(new OutputPass());
// the PC's meadow goes all the way out, up the trail and over the hill (bare ground there read as "simple" on a big
// screen); the same density as the clearing's. Measured on the M3, night, 1920×1080: 22.7 fps → 22.3 at 28 m; 32 m cost
// 4 fps more (blades close to the camera are big on screen), so 28
buildGrass(scene, HIGH ? 150000 : 18000, HIGH ? 28 : 19);
// on a big screen the ground's open stretches read as flat paint (Day 246, Jerika: "the graphics look great on phone but a
// little simple on pc"), so the PC gets a fine texture over the ground's colours: blades, clumps and grit, tiled every
// two metres, sharp at a glance thanks to anisotropic filtering. The phone is left as it was.
if (HIGH) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) - 1) / 2147483646;
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 256, rr = 10 + r() * 26, v = 205 + r() * 50;      // soft clumps
    const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${v},${v},${v},.5)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { g.fillStyle = gr; g.save(); g.translate(dx, dy); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); } }
  for (let i = 0; i < 2600; i++) { const x = r() * 256, y = r() * 256, l = 3 + r() * 7, a = -Math.PI / 2 + (r() - 0.5) * 0.9, v = 150 + r() * 105;   // blades
    g.strokeStyle = `rgba(${v},${v},${v},.55)`; g.lineWidth = 0.7 + r() * 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 900; i++) { const v = 120 + r() * 120; g.fillStyle = `rgba(${v},${v},${v},.6)`; g.fillRect(r() * 256, r() * 256, 1.2, 1.2); }  // grit
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(75, 75); tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ground = scene.getObjectByName('ground'); ground.material.map = tex; ground.material.color.setScalar(1.12); ground.material.needsUpdate = true; }
const air = buildAir(scene, HIGH ? 160 : 60);
const tents = buildTents(scene);
const fire = buildFire(scene, world.ring, HIGH);
const ambient = buildAmbient(scene, { high: HIGH });       // what everyone gets up to between the talks
const audio = createAudio();                               // wakes on the first tap

// ---- you ----
setFurShells(params.get('fur') ? +params.get('fur') : HIGH ? 10 : 4, HIGH && !params.has('coarse')); setSculptDetail(HIGH);   // fur= and coarse: perf knobs
const player = makeCritter(me.kind, { scarf: 0xf5a9b8, name: me.name });
player.position.set(0, heightAt(0, 14), 14); player.rotation.y = Math.PI;
scene.add(player);

// ---- the campers: who they are, where they head, in the order they arrive ----
export const CAST = [   // name, pronouns, species, scarf, spot [x, z], facing target [x, z]
  ['Juniper', 'she/they', 'badger', 0xc9a0dc, [2.4, 2.6], [0.5, 9]],          // watching the trail for first-timers
  ['Biscuit', 'he/they', 'dog', 0x5bcefa, [3.7, -2.5], [0, 0]],
  ['Clover', 'she/they', 'raccoon', 0xffd166, [-7.4, 4.3], [-3, 7]],
  ['Comet', 'any pronouns', 'fox', 0xff7a59, [5.2, 1.1], [5.0, 7.0]],        // frisbee into the open meadow
  ['Nyx', 'she/they', 'cat', 0xb7a3d9, [-3.7, 1.3], [0, 0]],
  ['Moss', 'they/them', 'capybara', 0x9ad1a0, [10.6, -4.9], [12.4, -4.7]],
  ['Thistle', 'they/them', 'hedgehog', 0xb9d8ff, [-2.6, -6.6], [0, 0]],       // drawing everyone
  ['Rowan', 'he/him', 'fawn', 0x5bcefa, [3.3, 8.0], [3.4, 8.9]],
  ['Lumi', 'she/her', 'robot', 0xffffff, [-4.0, 13.4], [0, 8]],
];
const TRAIL = [[0.4, 34], [0.6, 22], [0.0, 12.5]];
const bubbleTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(255, 240, 214, .95)'; g.beginPath(); g.ellipse(64, 56, 54, 42, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(46, 90); g.lineTo(40, 118); g.lineTo(66, 94); g.fill();
  g.fillStyle = '#7a5a40'; for (const x of [42, 64, 86]) { g.beginPath(); g.arc(x, 56, 7, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const LOOK = { Nyx: { colour: 0x3a3742, eyes: 0xf2c14e } };          // a black cat needs golden eyes or they vanish
const campers = CAST.map(([name, pron, kind, scarf, spot, face], i) => {
  const c = makeCritter(kind, { scarf, name, glow: 0.25, ...(LOOK[name] || {}) });
  c.userData.cast = { name, pron, spot, face, order: i };
  c.userData.state = 'away'; c.userData.path = [];
  c.visible = false; c.position.set(TRAIL[0][0], heightAt(TRAIL[0][0], TRAIL[0][1]), TRAIL[0][1]);
  const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, depthWrite: false, transparent: true }));
  b.scale.setScalar(0.42); b.position.y = kind === 'robot' ? 1.75 : 1.42; b.visible = false; c.add(b); c.userData.bubble = b;
  dress(c, name); scene.add(c); return c;
});
const byName = Object.fromEntries(campers.map(c => [c.userData.cast.name, c]));
if (byName.Lumi.userData.sparkLight) scene.add(byName.Lumi.userData.sparkLight);   // her light: in the scene from load (critter.js says why)
const barks = createBarks(campers);
const duck = buildDuck(scene);                  // a rubber duck in the quiet stretch of the stream; nobody mentions it          // a line over someone's head when you walk back up to them
const flags = {};

// Rowan's name tag, written during his talk
function nameTag(c, text) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#e8506a'; g.fillRect(0, 0, 256, 30);
  g.fillStyle = '#fff'; g.font = '700 20px ui-rounded, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('HELLO, MY NAME IS', 128, 22);
  g.fillStyle = '#2a2a2a'; g.font = '700 56px "Marker Felt", "Comic Sans MS", ui-rounded, system-ui, sans-serif'; g.fillText(text, 128, 98);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 }));
  tag.position.set(0.05, 0.45, c.rig.chest.z + 0.055); tag.rotation.set(-0.1, 0.1, 0); c.rig.hop.add(tag);
}

const talker = createTalker({ onFx(sp, fx) {
  const c = byName[sp.name]; if (!c) return;
  if (fx.emote) c.emote(fx.emote);
  if (fx.glow) c.setGlow(c.userData.st.glow + fx.glow);
  if (fx.tag) nameTag(c, sp.name);
  if (fx.hearts) ambient.hearts?.(c, player, 4);                     // a hug
  if (fx.drawing) sketch.show(keep.circle || keep.photo, 'the last morning');     // Thistle's drawing of the circle, kept
}, onSpeak(name, on) { const c = name === me.name ? player : byName[name]; if (c) c.setTalking(on); audio.voice(name, on); } });

// ---- input: hold and drag to walk toward the ground under your finger; a quick tap walks to the spot ----
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
const goal = { on: false, hold: false, p: new THREE.Vector3() };
let down = null, moved = false;
function groundPoint(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera); plane.constant = -player.position.y;
  return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
}
canvas.addEventListener('pointerdown', e => { if (talker.open) return; down = { x: e.clientX, y: e.clientY, t: performance.now() };
  const p = groundPoint(e); if (p) { goal.p.copy(p); goal.on = true; goal.hold = true; } canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!down) return; const p = groundPoint(e); if (p) goal.p.copy(p); });
const release = e => { if (!down) return;
  const tap = performance.now() - down.t < 260 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12;
  goal.hold = false; if (!tap) goal.on = false; down = null; };
canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
const keys = new Set();
const actBtn = document.getElementById('act'), goalEl = document.getElementById('goal');
let nearItem = null, nearCamper = null, nearFire = false, nearSleep = false, nearSwim = null, talking = null, finale = false;
let isMorning = false, throwWait = null;           // day two: the morning after the circle
// (day two's title card used to come up after Juniper's good morning, mid-chat, and read as the day ending: Day 246,
// Jerika, "last time it came up the day was over". Waking up says "day two ☀️" already; that is the chapter title.)
async function act() {
  if (throwWait) { const r = throwWait; throwWait = null; r(); return; }      // the stone throw takes the same button
  if (talker.open) return;
  if (nearCamper) {
    const c = nearCamper; talking = c; actBtn.hidden = true; goal.on = false; vel.set(0, 0, 0);
    c.userData.bubble.visible = false; c.gazeAt(player.position.clone().add(new THREE.Vector3(0, 0.9, 0)));
    player.rotation.y = Math.atan2(c.position.x - player.position.x, c.position.z - player.position.z);
    const hello = c.userData.state === 'greet', morn = c.userData.state === 'morning', name = c.userData.cast.name;
    if (c.userData.state === 'bye') { await sayGoodbye(c); talking = null; nearCamper = null; return; }
    await talker.talk(c.userData.cast, me, flags, hello ? GREETS : morn ? MORNING : TALKS);
    if (morn && name === 'Comet' && flags.stones) { flags.stones = false; await skipStones(c); }
    talking = null; nearCamper = null;
    if (hello) pitch(c); else c.userData.state = morn ? 'morning-done' : 'friends';
    return;
  }
  if (nearSwim) { const s = nearSwim; nearSwim = null; actBtn.hidden = true; s.run(); return; }
  if (nearSleep) { nearSleep = false; actBtn.hidden = true;
    if (dayThree === 'night') startLastMorning(); else if (showPhase === 'done') startDayThree(); else startMorning(); return; }
  if (nearFire) { nearFire = false; actBtn.hidden = true; startFinale(); return; }
  if (nearItem) { setup.place(nearItem); player.emote('happy'); audio.tok(); nearItem = null; actBtn.hidden = true; }
}
actBtn.addEventListener('click', act);
addEventListener('keydown', e => { if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !e.repeat) { act(); e.preventDefault(); } });
addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

// ---- movement with soft collisions: trunks, rocks, the fire ring, the stream, the edge of the woods ----
const vel = new THREE.Vector3();
let swimming = false;                    // day two: you're in the stream
const hops = [];                         // hops in progress: into the water, and Comet's cannonball (moved here, not by walking)
function collide(p, r = 0.3, v = null) {
  for (const b of world.blockers) { let cx = b.x, cz = b.z;
    // a bench is a capsule, end to end: as two circles it had a notch in the middle you caught in, sliding along it (Day 246)
    if (b.x2 !== undefined) { const sx = b.x2 - b.x, sz = b.z2 - b.z, u = Math.max(0, Math.min(1, ((p.x - b.x) * sx + (p.z - b.z) * sz) / (sx * sx + sz * sz)));
      cx = b.x + sx * u; cz = b.z + sz * u; }
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), min = b.r + r;
    if (d < min && d > 1e-4) { const nx = dx / d, nz = dz / d; p.x = cx + nx * min; p.z = cz + nz * min;
      // you: walking into something round turns into walking round it, instead of stopping dead against it
      // (Day 246: heading straight across the fire ring, the push back was exactly opposite the walk, and you stood there)
      const vn = v ? v.x * nx + v.z * nz : 0;
      if (vn < 0) { const tx = -nz, tz = nx, vt = v.x * tx + v.z * tz, side = Math.abs(vt) > 0.05 ? Math.sign(vt) : 1;
        const slide = Math.max(Math.abs(vt), -vn * 0.85); v.x = tx * side * slide; v.z = tz * side * slide; } } }
  if (swimming && p === player.position) {                // in the stream: the swimming hole's edges instead of its bank
    p.z = THREE.MathUtils.clamp(p.z, SWIM_Z[0], SWIM_Z[1]); p.x = THREE.MathUtils.clamp(p.x, streamX(p.z) - 1.25, streamX(p.z) + 1.3); }
  else p.x = Math.min(p.x, streamX(p.z) - 1.6);
  const rr = Math.hypot(p.x, p.z); if (rr > 36) { p.x *= 36 / rr; p.z *= 36 / rr; }
}
function step(dt) {
  if (player.userData.walking) { vel.set(0, 0, 0); return followPath(player, dt); }
  if (hops.some(h => h.c === player)) { vel.set(0, 0, 0); return 0; }
  if (talker.open || finale || stonesOn || craftOn || showOn || dayThree === 'top' || dayThree === 'smores' || dayThree === 'last' || danceOn) { vel.multiplyScalar(0.8); return 0; }
  let wx = 0, wz = 0;
  const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const kz = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const SPEED = swimming ? 1.9 : dayThree === 'hike' ? 2.2 : 3.0;              // a hike is walked, not run
  if (kx || kz) { const m = Math.hypot(kx, kz); wx = kx / m * SPEED; wz = kz / m * SPEED; goal.on = false; }
  else if (goal.on) {
    const dx = goal.p.x - player.position.x, dz = goal.p.z - player.position.z, d = Math.hypot(dx, dz);
    if (d < 0.15 && !goal.hold) goal.on = false;
    else if (d > 0.08) { const v = Math.min(SPEED * (goal.hold ? Math.min(2.2, 0.6 + d / 4) : 1), d * 5); wx = dx / d * v; wz = dz / d * v; }
  }
  vel.x += (wx - vel.x) * Math.min(1, dt * 10); vel.z += (wz - vel.z) * Math.min(1, dt * 10);
  const p = player.position; p.x += vel.x * dt; p.z += vel.z * dt; collide(p, 0.3, vel);
  p.y = swimming ? swim.swimY(p.z, Math.sin(t * 2.4) * 0.025) : heightAt(p.x, p.z);
  const sp = Math.hypot(vel.x, vel.z);
  // walking stands you up: night one used to leave you on your cushion with your marshmallow stick, and you could scoot
  // round the whole meadow like that (Day 246, Jerika: "my bunny is wandering around while sitting down")
  if (sp > 0.2 && player.userData.st?.sitTo) { player.setSit(0); player.userData.seatLift = 0; }
  if (sp > 0.2) { const want = Math.atan2(vel.x, vel.z); let dy = want - player.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.rotation.y += dy * Math.min(1, dt * 12);
    if (!moved) { moved = true; document.getElementById('hint').style.opacity = 0; } }
  return sp;
}

// ---- campers walk their paths, then settle into their spots and wait to be welcomed ----
function walkTo(c, pts, face, onArrive) { c.userData.path = pts.map(([x, z]) => new THREE.Vector3(x, 0, z)); c.userData.face = face;
  c.userData.walking = true; c.userData.onArrive = onArrive || null; c.userData.prog = null; }
function followPath(c, dt) {
  let speed = 0;
  if (c.userData.walking && c.userData.path.length) {
    const tgt = c.userData.path[0], dx = tgt.x - c.position.x, dz = tgt.z - c.position.z, d = Math.hypot(dx, dz);
    // steer: straight at the next point; when barely moving, slide sideways along whatever is in the way; when stuck
    // for a few seconds, pass through it. A camper who never arrives soft-locks the whole evening, which is far worse
    // than a moment of overlap (Day 245: Biscuit wedged between Juniper and a bench, and the fire never lit).
    const pr = c.userData.prog ??= { t: 0, x: c.position.x, z: c.position.z, stuck: 0, slide: 0, side: 1, ghost: 0 };
    if (d < 0.25) c.userData.path.shift();
    else { const v = Math.min(1.7, d * 2); let mx = dx / d, mz = dz / d;
      if (pr.slide > 0) { pr.slide -= dt; mx = mx * 0.3 - (dz / d) * pr.side; mz = mz * 0.3 + (dx / d) * pr.side; const l = Math.hypot(mx, mz); mx /= l; mz /= l; }
      c.position.x += mx * v * dt; c.position.z += mz * v * dt; speed = v;
      if (pr.ghost > 0) pr.ghost -= dt; else collide(c.position, 0.25);
      let dy = Math.atan2(mx, mz) - c.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.rotation.y += dy * Math.min(1, dt * 8);
      pr.t += dt;
      if (pr.t > 0.6) { const moved = Math.hypot(c.position.x - pr.x, c.position.z - pr.z);
        if (moved < 0.2) { pr.stuck += pr.t; if (pr.slide <= 0) { pr.slide = 1.0; pr.side = -pr.side; } } else pr.stuck = 0;
        if (pr.stuck > 3) { pr.ghost = 2.5; pr.stuck = 0; }
        pr.t = 0; pr.x = c.position.x; pr.z = c.position.z; } }
    if (!c.userData.path.length) { c.userData.walking = false;
      const [fx, fz] = c.userData.face; c.rotation.y = Math.atan2(fx - c.position.x, fz - c.position.z);
      if (c.userData.state === 'arriving') { c.userData.state = 'greet'; c.userData.bubble.visible = true; c.emote('wave'); }
      const cb = c.userData.onArrive; c.userData.onArrive = null; if (cb) cb(); }
  }
  c.position.y = heightAt(c.position.x, c.position.z) + (c.userData.walking ? 0 : (c.userData.seatLift || 0));   // up on a cushion
  return speed;
}
// nobody walks through anybody: a soft push apart. Whoever is standing still (or sitting, or mid-chat) holds their
// ground and the one walking goes round.
function separate() {
  const SEP = 0.6, inHammock = c => c.userData.cast?.name === 'Moss' && ['settled', 'friends'].includes(c.userData.state);
  const bodies = [player, ...campers.filter(c => c.visible && !inHammock(c) && !(c.userData.prog?.ghost > 0))];
  const holds = c => c === player ? (talker.open || finale || !!talking) : (!c.userData.walking || c === talking);
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], b = bodies[j], dx = b.position.x - a.position.x, dz = b.position.z - a.position.z, d = Math.hypot(dx, dz);
    if (d >= SEP || d < 1e-4) continue;
    const ha = holds(a), hb = holds(b); if (ha && hb) continue;
    const push = SEP - d, nx = dx / d, nz = dz / d, wa = ha ? 0 : hb ? 1 : 0.5, wb = 1 - wa;
    a.position.x -= nx * push * wa; a.position.z -= nz * push * wa; b.position.x += nx * push * wb; b.position.z += nz * push * wb;
    // you, walking into someone who's standing: turn it into walking round them, the same as round a rock. Pushing back
    // without turning left you wedged between Juniper and the fire ring, re-pushed every frame (Day 246, a played run)
    if (a === player && wa > 0) { const ox = -nx, oz = -nz, vn = vel.x * ox + vel.z * oz;
      if (vn < 0) { const tx = -oz, tz = ox, vt = vel.x * tx + vel.z * tz, side = Math.abs(vt) > 0.05 ? Math.sign(vt) : 1, sl = Math.max(Math.abs(vt), -vn * 0.85);
        vel.x = tx * side * sl; vel.z = tz * side * sl; } }
  }
}
// a tiny clock for "in a moment": game time, so it pauses with the game
const later = [];
const after = (sec, fn) => later.push({ at: t + sec, fn });
const wait = s => new Promise(r => after(s, r));
// after the hello: off to pitch their own tent (everyone's is different; Jerika: "it's an important part of first
// getting there"), then to the spot they like, where they'd love a proper chat (the bubble says so)
function pitch(c) {
  const name = c.userData.cast.name, [tx, tz] = TENT_SPOT[name];
  if (name === 'Lumi') { c.userData.cast.spot = [-1.0, -6.0]; c.userData.cast.face = [0, 0]; }   // she comes in, by the lights
  c.userData.state = 'pitching';
  const d = Math.hypot(tx, tz), door = [tx - tx / d * 1.35, tz - tz / d * 1.35];
  walkTo(c, [...(name === 'Lumi' ? [[-1.4, 9.5]] : []), door], [tx, tz], () => {
    tents.pitch(name); world.blockers.push({ x: tx, z: tz, r: 0.95 }); c.emote('happy');
    after(1.8, () => walkTo(c, [c.userData.cast.spot], c.userData.cast.face, () => { c.userData.state = 'settled'; c.userData.bubble.visible = true; }));
  });
}
// where they stop to be welcomed: by the sign as they walk in, one behind another if someone's already there
const GREET_AT = [[0.9, 10.0], [-0.5, 11.2], [1.1, 12.3]];
let arrivalsAt = null, nextArrival = 0;
function campersStep(dt, t) {
  if (arrivalsAt === null && setup.done() >= 3) { arrivalsAt = t; nextArrival = t + 1.5; }
  const atGate = campers.filter(k => ['arriving', 'greet'].includes(k.userData.state));
  if (arrivalsAt !== null && t >= nextArrival && atGate.length < 2) {
    const c = campers.find(k => k.userData.state === 'away');
    if (c) { c.visible = true; c.userData.state = 'arriving';
      const lumi = c.userData.cast.name === 'Lumi', slot = GREET_AT[atGate.length];   // Lumi hangs back on the trail, deciding
      walkTo(c, [...TRAIL.slice(1), lumi ? c.userData.cast.spot : slot], lumi ? c.userData.cast.face : [0.6, 6]); nextArrival = t + 7; }
  }
  // you can welcome someone as they walk up: they stop for you
  for (const c of campers) if (c.userData.state === 'arriving' && c.position.distanceTo(player.position) < 2.6 && !talker.open) {
    c.userData.path = []; c.userData.walking = false; c.userData.state = 'greet'; c.userData.bubble.visible = true; c.emote('wave');
    c.rotation.y = Math.atan2(player.position.x - c.position.x, player.position.z - c.position.z); }
  for (const c of campers) {
    const speed = followPath(c, dt);
    if (c.userData.cast.name === 'Moss' && ['settled', 'friends', 'morning', 'morning-done'].includes(c.userData.state)) {     // in the hammock, swaying
      c.position.set(12.35, heightAt(12.4, -4.7) + 0.8, -4.7); c.rotation.set(0, Math.PI / 2 + Math.sin(t * 0.6) * 0.06, 0);
      if (!c.userData.inHammock) { c.userData.inHammock = true; c.setSit(1); } }
    else if (c.userData.inHammock) { c.userData.inHammock = false; c.setSit(0); }
    if (finale || showOn || dayThree === 'top' || circleOn) c.gazeAt(circleOn && speaker === c && circleAbout ? circleAbout.position.clone().add(new THREE.Vector3(0, 0.85, 0))
      : speaker && speaker !== c ? speaker.position.clone().add(new THREE.Vector3(0, 0.85, 0)) : showOn ? stage.look : new THREE.Vector3(0, 0.7, 0));
    else if (talking !== c) {
      const near = c.visible && c.position.distanceTo(player.position) < 4.5, busy = ambient.gaze(c);   // busy: watching their frisbee, their cards...
      c.gazeAt(busy !== undefined ? busy : near ? player.position.clone().add(new THREE.Vector3(0, 0.9, 0))
        : null);
    }
    if (c.userData.bubble.visible) c.userData.bubble.position.y = (c.userData.cast.name === 'Lumi' ? 1.75 : 1.42) + Math.sin(t * 2.5 + c.id) * 0.05;
    c.update(dt, t, speed || c.userData.congaSpeed || ambient.speed(c));
  }
  if (byName.Lumi.userData.state === 'greet') byName.Lumi.position.y += Math.sin(t * 1.3) * 0.02;   // she hovers a little, nervous
}

// ---- the follow camera: a diorama view from the south; closer, and between the two of you, while talking ----
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
let camDist = 11.5;
let cine = null;                       // a scripted shot: { target, dist, pitch, yaw? }, eased into; null hands back to the follow cam
function placeCamera(dt, snap) {
  const portrait = innerWidth < innerHeight;
  if (cine) { const k = snap || cine.cut ? 1 : Math.min(1, dt * 1.8), yaw = cine.yaw ?? 0, pitch = THREE.MathUtils.degToRad(cine.pitch);
    cine.cut = false;
    camTarget.lerp(cine.target, k); camDist += (cine.dist - camDist) * k;
    camPos.set(camTarget.x + Math.sin(yaw) * Math.cos(pitch) * camDist, camTarget.y + Math.sin(pitch) * camDist, camTarget.z + Math.cos(yaw) * Math.cos(pitch) * camDist);
    camPos.y = Math.max(camPos.y, heightAt(camPos.x, camPos.z) + 0.35);       // never under the ground (a shot up a slope put it inside the hill)
    // a cut lands exactly; only a glide eases (a cut used to lerp by 1.5, so every cut overshot half again past the shot
    // for a frame and then drifted back: on the hill that frame was inside the hill)
    camera.position.lerp(camPos, k >= 1 ? 1 : Math.min(1, k * 1.5)); camera.lookAt(camTarget); return; }
  const want = talking ? player.position.clone().lerp(talking.position, 0.5).add(new THREE.Vector3(0, 0.75, 0))
                       : new THREE.Vector3(player.position.x, player.position.y + 0.9, player.position.z - 1.2);
  camDist += ((talking ? 6.2 : (portrait ? 12.5 : 11.5)) - camDist) * (snap ? 1 : Math.min(1, dt * 2.5));
  const pitch = THREE.MathUtils.degToRad(talking ? 18 : (portrait ? 27 : 24));
  camTarget.lerp(want, snap ? 1 : Math.min(1, dt * 4));
  camPos.set(camTarget.x, camTarget.y + Math.sin(pitch) * camDist, camTarget.z + Math.cos(pitch) * camDist);
  camera.position.copy(camPos); camera.lookAt(camTarget);
}
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h; camera.fov = w < h ? 56 : 40; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---- reflections: the live sky, baked into a small environment map and refreshed as the evening shifts ----
const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(sky.dome.geometry, sky.dome.material));
let envRT = null, envTod = -1;
function refreshEnv(tod) { if (Math.abs(tod - envTod) < 0.03) return; envTod = tod;
  const next = pmrem.fromScene(envScene, 0.02, 0.1, 1000); setEnv(next.texture); if (envRT) envRT.dispose(); envRT = next; }

// ---- the welcome circle: everyone home, the fire lit, cushions round it, and the go-around ----
const allHome = () => campers.every(c => c.userData.state === 'friends') && setup.done() === setup.total;
let myCushion = null;
function cushions() {          // everyone else sits on the cushions you laid out round the fire; this one's yours
  if (myCushion) return; const m = myCushion = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshStandardMaterial({ color: 0xf5a9b8, roughness: 0.95 }));
  m.scale.set(0.34, 0.13, 0.32); m.position.set(0, heightAt(0, PLAYER_SEAT) + 0.1, PLAYER_SEAT); m.castShadow = m.receiveShadow = true; scene.add(m);
}
function showTitle(stay = false) {           // stay: the very last card, which only "play again" leaves
  const card = document.getElementById('card'); card.classList.add('show'); audio.chime();
  return new Promise(res => after(4.5, () => { if (stay) { res(); return; }
    const close = () => { card.classList.remove('show'); removeEventListener('keydown', key); card.removeEventListener('click', close); };
    const key = e => { if (['e', 'E', ' ', 'Enter'].includes(e.key)) close(); };
    addEventListener('keydown', key); card.addEventListener('click', close); res();
  }));
}
// ---- the group photo: everyone up from the cushions into two rows, a flash, and a polaroid you can keep ----
// back row stands between the heads of the front row; null is you, front and nearly centre
const PHOTO_ROWS = [{ z: 2.05, xs: [-1.68, -0.84, 0.84, 1.68], who: ['Lumi', 'Moss', 'Juniper', 'Biscuit'] },   // in the gaps between front heads; the middle gap shows the fire
                    { z: 2.9, xs: [-2.1, -1.26, -0.42, 0.42, 1.26, 2.1], who: ['Rowan', 'Thistle', null, 'Clover', 'Comet', 'Nyx'] }];
// a photographer moves the clutter: string-light bulbs and cable within a few metres of the lens hide for the photo
function clearView(camPos, r = 4.5) {
  const hidden = [];
  scene.traverse(o => { if (!o.isMesh || !o.visible || !o.geometry) return; const g = o.geometry, tube = g.type === 'TubeGeometry';
    if (!tube && !(g.type === 'SphereGeometry' && g.parameters?.radius < 0.07)) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const d = g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld).distanceTo(camPos) - (tube ? g.boundingSphere.radius : 0);
    if (d < r) { o.visible = false; hidden.push(o); } });
  return () => hidden.forEach(o => (o.visible = true));
}
function groupPhoto() {
  const flash = document.getElementById('flash'), wait = s => new Promise(r => after(s, r)), seats = new Map();
  const pose = () => { PHOTO_ROWS.forEach(row => row.who.forEach((n, i) => { const c = n ? byName[n] : player;
    seats.set(c, { p: c.position.clone(), ry: c.rotation.y, sit: c.userData.st?.sitTo ?? 0, lift: c.userData.seatLift || 0 });
    const x = row.xs[i], z = row.z;
    c.setSit(0); c.userData.st && (c.userData.st.sit = 0); c.userData.seatLift = 0;
    c.position.set(x, heightAt(x, z), z); c.rotation.y = 0; c.gazeAt(new THREE.Vector3(0, 1.1, 7)); })); };
  const unpose = () => { for (const [c, s] of seats) { c.position.copy(s.p); c.rotation.y = s.ry; c.userData.seatLift = s.lift; c.setSit(s.sit);
    if (c.userData.st) c.userData.st.sit = s.sit; } };
  return (async () => {
    flash.classList.add('on'); await wait(0.3);
    // far enough back that the group (about 4.8 m across) fits the square the polaroid keeps, on a tall or a wide screen
    const half = THREE.MathUtils.degToRad(camera.fov / 2), across = Math.min(Math.tan(half), Math.tan(half) * camera.aspect);
    const target = new THREE.Vector3(0, 0.75, 2.45), dist = Math.max(4.6, 2.5 / across), P = THREE.MathUtils.degToRad(19);
    pose(); cine = { target, dist, pitch: 19, yaw: 0, cut: true };   // steep enough that the back row's heads clear the front row's
    // clutter counts if it stands between the lens and the group: on a tall screen the camera is ~10 m back, a wide one ~7
    const unclear = clearView(new THREE.Vector3(0, target.y + Math.sin(P) * dist, target.z + Math.cos(P) * dist), dist - 1.5); fire.dim = 0.4;
    flash.classList.remove('on'); await wait(0.9);
    campers.forEach(c => c.emote('wave')); player.emote('wave'); await wait(0.55);
    flashK = 1; audio.shutter?.();
    const url = await new Promise(r => { capture = cv => r(polaroid(cv)); });
    flash.classList.add('on', 'snap'); flashK = 0; await wait(0.12); flash.classList.remove('on', 'snap');
    await showPolaroid(url);
    flash.classList.add('on'); await wait(0.3); unpose(); unclear(); fire.dim = 1; flash.classList.remove('on');
  })();
}
// the camera's flash, for the one frame that is kept: more face fill and more sky light, no new light in the scene
// (a new light changes every material's program, and the phone would pay for it all evening)
let flashK = 0;
// the saved picture IS the polaroid: white paper, the photo, a handwritten line
// what the weekend leaves you with, shown on the last card: the photo, Thistle's drawings, the bracelet you were given
const keep = { photo: null, polaroid: null, audience: null, view: null, circle: null, sketches: [], bracelet: null, colored: false };
const grabFrame = (w = 960) => new Promise(r => { capture = cv => r(copyCanvas(cv, w, Math.round(w * cv.height / cv.width))); });
const sketchEl = document.getElementById('sketch');
const sketch = {                     // a picture held up for everyone: Thistle's drawings (kept for the last card), Nyx's card
  show(src, caption) { if (!src) return null; const page = sketchCanvas(src, caption, undefined, keep.colored), url = page.toDataURL('image/jpeg', 0.88);
    keep.sketches.push(url); sketchEl.src = url; sketchEl.classList.add('on'); return page; },
  picture(url) { sketchEl.src = url; sketchEl.classList.add('on'); },
  hide() { sketchEl.classList.remove('on'); },
};
function polaroid(cv) {
  { const side = Math.min(cv.width, cv.height), sq = document.createElement('canvas'); sq.width = sq.height = 900;   // the frame itself, the polaroid's square,
    sq.getContext('2d').drawImage(cv, (cv.width - side) / 2, (cv.height - side) / 2, side, side, 0, 0, 900, 900); keep.photo = sq; }   // for Thistle to draw on day two
  const W = 1000, H = 1180, P = 56, S = W - 2 * P, out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, W, H);
  const side = Math.min(cv.width, cv.height), sx = (cv.width - side) / 2, sy = (cv.height - side) / 2;
  g.drawImage(cv, sx, sy, side, side, P, P, S, S);
  g.fillStyle = '#3a2f28'; g.textAlign = 'center';
  g.font = '64px "Marker Felt", "Comic Sans MS", ui-rounded, system-ui, sans-serif'; g.fillText('welcome to camp ✨', W / 2, P + S + 86);
  g.font = '40px "Marker Felt", "Comic Sans MS", ui-rounded, system-ui, sans-serif'; g.fillStyle = '#7a6a5e';
  g.fillText(me.named ? `${me.name} and friends · night one` : 'night one', W / 2, P + S + 140);
  return (keep.polaroid = out.toDataURL('image/jpeg', 0.9));
}
function showPolaroid(url) {
  const box = document.getElementById('polaroid'), img = document.getElementById('photo'), save = document.getElementById('savePhoto'), go = document.getElementById('keepGoing');
  img.src = url; box.hidden = false;
  return new Promise(res => {
    // the phone's share sheet (Save Image is in it); cancelling it does nothing, and only a browser without it downloads
    const download = () => { const a = document.createElement('a'); a.href = url; a.download = 'kindling-camp.jpg'; document.body.appendChild(a); a.click(); a.remove(); };
    save.onclick = async e => { e.stopPropagation(); const blob = await (await fetch(url)).blob(), file = new File([blob], 'kindling-camp.jpg', { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Kindling' }); } catch (err) { if (err && err.name !== 'AbortError') download(); }
        return; }
      download(); };
    go.onclick = e => { e.stopPropagation(); box.hidden = true; res(); };
  });
}

// ---- day two: you sleep in your tent, and wake to the morning (Jerika, Day 246: "trans camps are usually ~3 nights") ----
const morning = buildMorning(scene);
// Thistle's pencils, scattered round camp on the morning of day two (pencils.js): find all five and tonight's drawing is
// in colour; the swim waits until they're found, so the morning has a little wandering in it
const pencils = buildPencils(scene);
function pickPencil(p) {
  const n = pencils.pick(p), at = new THREE.Vector3(p.x, p.y + 0.3, p.z);
  audio.tok?.(); audio.sfx?.('card');
  for (let k = 0; k < 8; k++) ambient.spawn('sparkles', at.clone(), new THREE.Vector3((Math.random() - 0.5) * 0.9, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.9), 1.2, 0.13);
  player.emote('happy');
  if (n === pencils.total) { keep.colored = true; byName.Thistle.emote('happy'); toast(`✏️ all ${n}! Thistle can draw in colour tonight`);
    barks.say(byName.Thistle, 'My pencils! All five! Even the blue!'); }
  else toast(`✏️ the ${p.name} pencil · ${n} of ${pencils.total}`);
}
const toastEl = document.getElementById('toast');
function toast(text) { toastEl.textContent = text; toastEl.classList.add('on'); clearTimeout(toastEl.t); toastEl.t = setTimeout(() => toastEl.classList.remove('on'), 2600); }
for (const p of pencils.list) p.act.run = () => pickPencil(p);
async function startMorning({ jump = false } = {}) {
  const sleep = document.getElementById('sleep'), wait = s => new Promise(r => after(s, r));
  document.getElementById('sleepText').textContent = jump ? 'day two ☀️' : 'goodnight 🌙'; sleep.classList.add('on'); await wait(jump ? 0.2 : 1.8);
  isMorning = true; sky.morning = true; tod = 0.07; todOverride = 0.07; fire.out(); ambient.smoresDone(); cine = null;
  morning.arrange({ campers, seats: setup.seats, player, playerTent: TENT_SPOT.you }); vel.set(0, 0, 0); goal.on = false; pencils.show(true);
  // the board is solid (Day 246, Jerika: "i can walk thru the schedule board"): a capsule from post to post
  if (!world.blockers.some(b => b.board)) { const ry = -0.25, [bx, bz] = BOARD_AT, end = s => [bx + s * 0.8 * Math.cos(ry), bz - s * 0.8 * Math.sin(ry)];
    const [a, b] = [end(-1), end(1)]; world.blockers.push({ x: a[0], z: a[1], x2: b[0], z2: b[1], r: 0.1, board: true }); }
  ambient.play(byName.Biscuit, false);   // night one's song, if you asked for it, ends when you sleep (it was left on all weekend:
                                         // Jerika heard his guitar at the talent show before his act)
  placeCamera(0, true); await wait(0.6);
  document.getElementById('sleepText').textContent = 'day two ☀️'; await wait(1.2);
  sleep.classList.remove('on');
}
// chapters: start at day two (picked on the start screen, or ?chapter=2). The camp as night one left it (everything set up,
// everyone's tent pitched, all friends), then straight into the morning, so it can be shown without replaying the evening
function jumpToDayTwo() {
  for (const it of setup.ITEMS) setup.place(it);
  for (const c of campers) { const name = c.userData.cast.name, [tx, tz] = TENT_SPOT[name];
    if (name === 'Lumi') { c.userData.cast.spot = [-1.0, -6.0]; c.userData.cast.face = [0, 0]; }
    c.visible = true; c.userData.state = 'friends'; c.userData.bubble.visible = false; c.userData.walking = false; c.userData.path = [];
    tents.pitch(name); world.blockers.push({ x: tx, z: tz, r: 0.95 }); }
  return startMorning({ jump: true });
}
// or at day three: as day two left it (Crumb on Clover's head), then straight into the morning of the hike
function jumpToDayThree() {
  for (const it of setup.ITEMS) setup.place(it);
  for (const c of campers) { const name = c.userData.cast.name, [tx, tz] = TENT_SPOT[name];
    if (name === 'Lumi') { c.userData.cast.spot = [-1.0, -6.0]; c.userData.cast.face = [0, 0]; }
    c.visible = true; c.userData.state = 'fire'; c.userData.bubble.visible = false; tents.pitch(name); world.blockers.push({ x: tx, z: tz, r: 0.95 }); }
  isMorning = true; showPhase = 'done'; braceletPhase = 'done'; swimPhase = 'done'; crumbOnClover();
  return startDayThree();
}
// ---- day two, late morning: the swim. Once you've said good morning to everyone, Juniper calls it; they all head down,
// the ones who swim hop in, and a ring on the bank says where you jump in. Comet waits for you, then cannonballs ----
const swim = buildSwim(scene);
let swimPhase = null, splashes = 0, fightBusy = false;
const [JZ, JDX] = JUMP_AT, jumpSpot = () => [streamX(JZ) + JDX, JZ];
const jumpRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 6, 36), new THREE.MeshBasicMaterial({ color: 0xc8ecff, transparent: true, opacity: 0.85, depthWrite: false }));
jumpRing.rotation.x = Math.PI / 2; jumpRing.visible = false; scene.add(jumpRing);
// a hop on a little arc to [x, z] (into the water, or a cannonball), moved here rather than walked; resolves on landing
function hop(c, [x, z], dur = 0.7, h = 0.8, y1 = swim.swimY(z)) {
  return new Promise(res => hops.push({ c, from: c.position.clone(), x, z, y1, dur, h, u: 0, res }));
}
function hopsStep(dt) {
  for (let i = hops.length - 1; i >= 0; i--) { const o = hops[i]; o.u = Math.min(1, o.u + dt / o.dur); const u = o.u;
    o.c.position.set(THREE.MathUtils.lerp(o.from.x, o.x, u), THREE.MathUtils.lerp(o.from.y, o.y1, u) + Math.sin(Math.PI * u) * o.h, THREE.MathUtils.lerp(o.from.z, o.z, u));
    o.c.rotation.y = Math.atan2(o.x - o.from.x, o.z - o.from.z);
    if (u >= 1) { hops.splice(i, 1); o.res(); } }
}
const IN_WATER = new Set(['Moss', 'Clover', 'Biscuit', 'Comet']);
async function callSwim() {
  swimPhase = 'called'; todOverride = -0.25;                                     // the sun climbs while everyone heads down
  talker.scene.open(); await talker.scene.say('Juniper', 'she/they', 'Swim time! Everybody down to the stream. Last one in does the dishes.'); talker.scene.close();
  swim.start(campers);
  for (const c of campers) { const [sx, sz] = spotOf(c.userData.cast.name);
    c.setSit?.(0); c.userData.seatLift = 0; c.userData.state = 'swim-walk';
    c.userData.swimTo = [streamX(sz) - 2.05, sz]; c.userData.swimBy = t + 16;      // near enough, or long enough, and they hop the rest
    walkTo(c, [c.userData.swimTo], [sx, sz], () => arriveSwim(c)); }
  const [x, z] = jumpSpot(); jumpRing.position.set(x, heightAt(x, z) + 0.05, z); jumpRing.visible = true;
}
// a rock or a friend on the bank can sit right where someone's heading, so arriving is "within a step or so" (Day 246:
// with exact spots, four of nine circled the bank for a minute), and after 16 s they go anyway
function swimArrivals() {
  for (const c of campers) if (c.userData.state === 'swim-walk') { const [bx, bz] = c.userData.swimTo;
    if (Math.hypot(c.position.x - bx, c.position.z - bz) < 1.1 || t > c.userData.swimBy) {
      c.userData.path = []; c.userData.walking = false; c.userData.onArrive = null; arriveSwim(c); } }
}
async function arriveSwim(c) {
  const name = c.userData.cast.name;
  if (name === 'Comet' && !swimming) { c.userData.state = 'swim-wait'; c.rotation.y = Math.PI / 2; return; }   // waits for you, on the bank
  const [x, z] = spotOf(name), wet = IN_WATER.has(name), big = name === 'Comet';
  c.userData.state = 'swim-hop';                                                   // the last bit: a hop in, or down the bank
  await hop(c, [x, z], big ? 0.95 : wet ? 0.65 : 0.45, big ? 1.5 : wet ? 0.7 : 0.25, swim.landY(name));
  if (wet) { swim.splash(x, z, big ? 1.8 : 0.9); if (big) audio.splashBig?.(); else audio.splash(); }
  swim.settle(c); c.userData.state = 'swim';
}
async function jumpIn() {
  jumpRing.visible = false; swimPhase = 'in'; vel.set(0, 0, 0); goal.on = false; player.emote('happy');
  const z = THREE.MathUtils.clamp(player.position.z, SWIM_Z[0] + 0.4, SWIM_Z[1] - 0.4), to = [streamX(z) - 0.45, z];      // straight in, in front of you
  await hop(player, to, 0.75, 0.9); swimming = true; swim.splash(to[0], to[1], 1.3); audio.splashBig?.();
  const comet = byName.Comet;
  if (comet.userData.state === 'swim-wait') { await wait(0.5); barks.say(comet, 'CANNONBALL!'); comet.emote('wave'); await wait(0.5); arriveSwim(comet); }
}
const SWIM_ACT = { jump: { label: 'jump in 🌊', run: () => jumpIn() }, splash: { label: 'splash Comet 💦', run: () => splashFight() },
  dance: { label: 'dance! 💃', run: () => danceMove() } };
const FIGHT = ["Oh, it's ON.", "I was raised in a stream. Probably. Don't check.", 'Truce! Truce. ...psych!'];
async function splashFight() {
  const c = byName.Comet; fightBusy = true;
  player.rotation.y = Math.atan2(c.position.x - player.position.x, c.position.z - player.position.z); player.emote('happy');
  swim.splash(c.position.x, c.position.z, 0.75); audio.splash();
  await wait(0.7); c.emote('happy'); swim.splash(player.position.x, player.position.z, 0.9 + splashes * 0.35); audio.splash();
  barks.say(c, FIGHT[splashes]); splashes++;
  await wait(1.4); fightBusy = false;
  if (splashes >= 3) { await wait(1.6); lunch(); }
}
async function lunch() {
  swimPhase = 'lunch';
  talker.scene.open(); await talker.scene.say('Juniper', 'she/they', 'Okay, fish! Out of the water. Lunch, then friendship bracelets.');
  await talker.scene.say('Comet', 'any pronouns', 'I won. Write it down.'); talker.scene.close();
  await startBracelets();
}
// ---- after lunch: friendship bracelets on the cushions. You make one for someone; it goes on their wrist, and they
// trade you theirs ----
let braceletPhase = null, craftOn = false;
const SEATING = ['Juniper', 'Biscuit', 'Comet', 'Nyx', 'Moss', 'Thistle', 'Rowan', 'Clover', 'Lumi'];      // west to east, as at the circle
const sitOn = (c, on) => { c.setSit?.(on ? 1 : 0); c.userData.seatLift = on ? 0.11 : 0; c.position.y = heightAt(c.position.x, c.position.z) + c.userData.seatLift; };
const faceOf = c => ({ target: c.position.clone().add(new THREE.Vector3(0, 0.72, 0)), dist: 3.3, pitch: 14, yaw: Math.atan2(-c.position.x, -c.position.z) + 0.62 });
async function startBracelets() {
  braceletPhase = 'making'; craftOn = true;
  const sleep = document.getElementById('sleep'); document.getElementById('sleepText').textContent = 'after lunch 🥪'; sleep.classList.add('on'); await wait(1.4);
  swim.stop(); swimming = false; swimPhase = 'done'; jumpRing.visible = false;
  tod = -0.12; todOverride = -0.12; cushions();
  SEATING.forEach((n, i) => { const c = byName[n], s = setup.seats[i]; c.userData.state = 'craft'; c.userData.walking = false; c.userData.path = [];
    c.position.set(s.x, 0, s.z); c.rotation.y = Math.atan2(-s.x, -s.z); sitOn(c, true); });
  player.position.set(0, 0, PLAYER_SEAT); player.rotation.y = Math.PI; sitOn(player, true); vel.set(0, 0, 0); goal.on = false;
  cine = { target: new THREE.Vector3(0, 0.9, -0.4), dist: 8.2, pitch: 15, cut: true }; placeCamera(0, true);
  await wait(0.5); sleep.classList.remove('on'); await wait(1.0);
  talker.scene.open(); await talker.scene.say('Juniper', 'she/they', "Bracelet time! Three threads each. Make one for someone. You'll probably get one back.");
  // round the circle while everyone braids (Moss, braiding in their sleep)
  byName.Moss.setSleep?.(true);
  for (const [n, line] of CHATTER) { const k = byName[n]; cine = faceOf(k); speaker = k; await talker.scene.say(n, k.userData.cast.pron, line); }
  speaker = null; talker.scene.close(); cine = { target: new THREE.Vector3(0, 0.9, -0.4), dist: 8.2, pitch: 15, cut: true };
  const { colors, who } = await braceletUI(SEATING, undefined, () => audio.tok?.());
  const c = byName[who], [got, trade, theirs] = GIFT[who], pron = c.userData.cast.pron;
  cine = faceOf(c); talking = c; c.gazeAt(player.position.clone().add(new THREE.Vector3(0, 0.9, 0)));
  await wait(0.8); wear(c, colors); c.emote('happy'); if (who === 'Lumi') c.setGlow?.(1);
  talker.scene.open(); await talker.scene.say(who, pron, got);
  await talker.scene.say(who, pron, trade); wear(player, theirs, 1); keep.bracelet = theirs; player.emote('happy');
  await talker.scene.say(me.name, me.pron, "I'm never taking it off.");
  talking = null;
  // then everyone else trades too, neighbour with neighbour, a two-shot from the middle of the circle
  for (const [a, b, la, lb] of TRADES) { const A = byName[a], B = byName[b], mid = A.position.clone().add(B.position).multiplyScalar(0.5);
    cine = { target: mid.clone().setY(mid.y + 0.7), dist: 2.7, pitch: 14, yaw: Math.atan2(-mid.x, -mid.z), cut: true };
    A.gazeAt(B.position.clone().setY(B.position.y + 0.8)); B.gazeAt(A.position.clone().setY(A.position.y + 0.8));
    speaker = A; await talker.scene.say(a, A.userData.cast.pron, la); wear(B, GIFT[a][2], B === c ? 1 : 0); B.emote('happy');
    speaker = B; await talker.scene.say(b, B.userData.cast.pron, lb); wear(A, GIFT[b][2], A === c ? 1 : 0); A.emote('happy');
    ambient.hearts?.(A, B, 2); A.gazeAt(null); B.gazeAt(null); }
  speaker = null; cine = { target: new THREE.Vector3(0, 0.9, -0.4), dist: 8.2, pitch: 15, cut: true };
  await talker.scene.say('Juniper', 'she/they', 'Look at all of you. Wrists up, everybody!');
  for (const k of [...campers, player]) if (k !== byName.Moss) k.emote('wave'); audio.applause?.();
  for (const k of [...campers, player]) ambient.spawn('sparkles', k.position.clone().add(new THREE.Vector3(0, 0.9, 0)), new THREE.Vector3(0, 0.5, 0), 1.4, 0.13);
  await wait(1.4);
  await talker.scene.say('Juniper', 'she/they', 'Talent show tonight, everybody! Think of an act. Comet, charades is not an act.');
  await talker.scene.say('Comet', 'any pronouns', 'Charades is ALWAYS an act.'); talker.scene.close();
  for (const k of campers) k.userData.state = 'craft-done';
  byName.Moss.setSleep?.(false); braceletPhase = 'done'; craftOn = false;
  await wait(0.8); await startTalentShow();
}
// ---- Lumi's light show: every string light in camp chasing through the colours, the lamps washing the whole clearing,
// her spark cycling with them and sparkles off her, seen from behind everyone, then back to her as it all goes blue.
// (Day 246, Jerika: "lumi just pulsed a little bit, no colorful light show": it was six footlights, out of frame.)
// Resolves with a function that puts every light back, for after her line about the blue ----
async function lightShow(c) {
  const bulbs = setup.bulbs, lamps = setup.lamps, spark = c.userData.spark, L = c.userData.sparkLight;
  const home = { e: bulbs.map(m => m.emissive.clone()), c: bulbs.map(m => m.color.clone()), l: lamps.map(l => l.color.clone()),
    s: spark?.material.emissive.clone(), sl: L?.color.clone() };
  const hsl = (h, sat, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, sat, l), BLUE = new THREE.Color(0x5bcefa), V = (x, y, z) => new THREE.Vector3(x, y, z);
  audio.sfx?.('shimmer'); stage.lightShow(true);
  const st = { on: true, blue: false };
  (async () => { while (st.on) { const h = t * 0.45;
    bulbs.forEach((m, k) => { const col = st.blue ? BLUE : hsl(h + k / 3, 0.85, 0.6); m.emissive.copy(col); m.color.copy(col); });
    lamps.forEach((l, j) => l.color.copy(st.blue ? BLUE : hsl(h + j / 3 + 0.15, 0.8, 0.62)));
    if (spark) { spark.material.emissive.copy(st.blue ? BLUE : hsl(h + 0.5, 0.9, 0.6)); if (L) L.color.copy(spark.material.emissive); }
    setup.pulse = st.blue ? 0.6 : 0.55 + 0.45 * Math.sin(t * 9); c.setGlow?.(0.8 + 0.2 * Math.sin(t * 7));
    for (let k = 0; k < 2; k++) ambient.spawn('sparkles', c.position.clone().add(V((Math.random() - 0.5) * 0.5, 0.45 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3)),
      V((Math.random() - 0.5) * 0.7, 0.45 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4), 1.5, 0.12 + Math.random() * 0.06);
    await wait(0.06); } })();
  await wait(1.7);
  cine = { target: V(1.2, 1.4, -1.0), dist: 12.5, pitch: 17, yaw: 0.32, cut: true };          // the whole camp, lit up
  await wait(3.2);
  cine = { target: c.position.clone().add(V(0, 0.62, 0)), dist: 1.7, pitch: 9, yaw: STAGE.ry, cut: true };
  await wait(0.7); st.blue = true; audio.sfx?.('blue'); await wait(1.4);
  return () => { st.on = false; stage.lightShow(false); setup.pulse = 0; c.setGlow?.(1);
    bulbs.forEach((m, k) => { m.emissive.copy(home.e[k]); m.color.copy(home.c[k]); }); lamps.forEach((l, j) => l.color.copy(home.l[j]));
    if (spark) { spark.material.emissive.copy(home.s); if (L) L.color.copy(home.sl); } };
}
// ---- that evening: the talent show, on a little stage in front of Juniper's board (talent.js has the script) ----
const stage = buildStage(scene);
let showOn = false, showPhase = null;
const sitGrass = c => { c.setSit?.(1); c.userData.seatLift = 0; c.position.y = heightAt(c.position.x, c.position.z); };
const facing = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
async function startTalentShow() {
  showPhase = 'on'; showOn = true; pencils.show(false);
  const sleep = document.getElementById('sleep'); document.getElementById('sleepText').textContent = 'that evening 🎤'; sleep.classList.add('on'); await wait(1.6);
  sky.morning = false; tod = 0.6; todOverride = 0.6; fire.light(); stage.show(true); cine = null; talking = null;
  for (const [n, [x, z]] of Object.entries(AUDIENCE)) { const c = n === 'you' ? player : byName[n];
    c.userData.walking = false; if (c.userData.path) c.userData.path = []; c.position.set(x, heightAt(x, z), z); c.rotation.y = facing(x, z, STAGE.x, STAGE.z);
    c.userData.state = 'show'; sitGrass(c); }
  { const j = byName.Juniper, [x, z] = HOST_AT; j.userData.state = 'show'; j.setSit?.(0); j.userData.seatLift = 0; j.position.set(x, heightAt(x, z), z);
    j.rotation.y = facing(x, z, AUDIENCE.you[0], AUDIENCE.you[1]); }
  vel.set(0, 0, 0); goal.on = false;
  // one of the string lights' lamps comes over to light the stage, and goes back after
  const lamp = setup.lamps[2], home = lamp?.position.clone();
  if (lamp) lamp.position.copy(lamp.parent.worldToLocal(new THREE.Vector3(STAGE.x, heightAt(STAGE.x, STAGE.z) + 2.5, STAGE.z + 1.6)));
  placeCamera(0, true); await wait(0.5); sleep.classList.remove('on');
  let acts = 0;
  const seatOf = c => { const n = c === player ? 'you' : c.userData.cast.name; return AUDIENCE[n] ?? HOST_AT; };
  await runTalentShow({ campers, byName, player, me, talk: talker.scene, wait, audio, stage, sketch,
    grab: async () => { keep.audience = await grabFrame(); }, drawing: () => keep.photo || keep.audience, colored: () => keep.colored,
    song: name => audio.song?.(name), sfx: name => audio.sfx?.(name), fx: (k, p, v, life, size) => ambient.spawn(k, p, v, life, size), card: () => starCard(),
    setCine: c => { cine = c; }, focus: c => { speaker = c; }, play: (name, on) => ambient.play(byName[name], on),
    cut: c => { const p = stage.spot(); c.position.copy(p); c.rotation.y = STAGE.ry; c.setSit?.(0); c.userData.seatLift = STAGE.top;
      todOverride = Math.min(0.95, 0.62 + 0.04 * acts++); },                      // it gets darker, act by act
    back: c => { const [x, z] = seatOf(c); c.position.set(x, heightAt(x, z), z); c.rotation.y = c === byName.Juniper ? facing(x, z, AUDIENCE.you[0], AUDIENCE.you[1]) : facing(x, z, STAGE.x, STAGE.z);
      if (c === byName.Juniper) { c.userData.seatLift = 0; } else sitGrass(c); },
    clearView,
    lights: lightShow });
  if (lamp) lamp.position.copy(home);
  crumbOnClover();
  for (const c of campers) c.userData.state = 'fire';                             // goodnights, if you walk up to anyone now
  showOn = false; showPhase = 'done'; speaker = null; cine = null; todOverride = 0.95; sitGrass(player); player.setSit?.(0);
  await showCard('day two ✨', 'one more night to go · tap or press E to keep wandering');
}
// Crumb lives with Clover now: on her head, for the rest of the weekend
function crumbOnClover() {
  const f = stage.frog, h = byName.Clover.head; if (f.parent === h) return;
  const box = new THREE.Box3().setFromObject(h), mid = h.getWorldPosition(new THREE.Vector3()), ws = h.getWorldScale(new THREE.Vector3());
  const local = h.worldToLocal(new THREE.Vector3(mid.x, box.max.y - 0.02, mid.z));
  h.add(f); f.position.copy(local); f.rotation.set(0, 0, 0); f.scale.setScalar(1.0 / ws.x); f.visible = true;
}
// ---- day three: the hike. You lead the way up the path to the lookout, and everyone follows in a line, each walking
// where the one ahead walked (your footsteps, kept as a trail of crumbs) ----
const lookout = buildLookout(scene);
let dayThree = null, crumbs = [];
const DAY3_GOAL = { last: 'the last morning ☀️', bye: 'say goodbye 💛', leaving: 'see you next summer ✨', home: 'head home 🏡 · down the trail', gone: 'home ✨', morning: 'day three ☀️', hike: 'the hike 🥾 · lead everyone up to the lookout', top: 'the lookout ✨', evening: "s'mores, round two 🔥",
  smores: "s'mores, round two 🔥", dance: 'dancing under the lights 💃', night: 'day three ✨ · the last night 🌙' };
const CONGA = ['Juniper', 'Comet', 'Biscuit', 'Clover', 'Lumi', 'Rowan', 'Nyx', 'Thistle', 'Moss'];      // Moss at the back, obviously
async function startDayThree() {
  dayThree = 'morning';
  const sleep = document.getElementById('sleep'), text = document.getElementById('sleepText');
  text.textContent = 'goodnight 🌙'; sleep.classList.add('on'); await wait(1.8);
  sky.morning = true; tod = 0.05; todOverride = -0.2; fire.out(); cine = null; talking = null; speaker = null; stage.show(false); stage.cake.visible = false;
  // everyone at the foot of the path, on the north side of camp, ready to go; you in front
  const [hx, hz] = HIKE[0];
  CONGA.forEach((n, i) => { const c = byName[n], a = 0.9 + i * 0.42, r = 1.6 + (i % 3) * 0.55, x = hx + 0.9 + Math.cos(a) * r, z = hz + 2.4 + Math.sin(a) * r;
    c.userData.walking = false; c.userData.path = []; c.userData.state = 'hike'; c.setSit?.(0); c.userData.seatLift = 0; c.userData.congaSpeed = 0;
    c.position.set(x, heightAt(x, z), z); c.rotation.y = Math.atan2(hx - x, hz - z); c.visible = true; });
  player.setSit?.(0); player.position.set(hx + 0.3, heightAt(hx + 0.3, hz + 1.2), hz + 1.2); player.rotation.y = Math.PI; vel.set(0, 0, 0); goal.on = false;
  crumbs = [player.position.clone()];
  placeCamera(0, true); await wait(0.6); text.textContent = 'day three ☀️'; await wait(1.2); sleep.classList.remove('on');
  talker.scene.open();
  await talker.scene.say('Juniper', 'she/they', "Day three! Hike first: up the path to the lookout. Organizer, you lead. We'll follow you up.");
  await talker.scene.say('Comet', 'any pronouns', 'Last one to the top carries Moss.');
  await talker.scene.say('Moss', 'they/them', '...please carry me.');
  talker.scene.close();
  dayThree = 'hike';
}
function congaStep(dt) {
  const p = player.position, last = crumbs[crumbs.length - 1];
  if (p.distanceTo(last) > 0.35) crumbs.push(p.clone());
  CONGA.forEach((n, i) => { const c = byName[n], idx = crumbs.length - 1 - (i + 1) * 4;
    if (idx < 0) { c.userData.congaSpeed = 0; return; }
    const tgt = crumbs[idx], dx = tgt.x - c.position.x, dz = tgt.z - c.position.z, d = Math.hypot(dx, dz);
    if (d < 0.12) { c.userData.congaSpeed = 0; return; }
    const v = Math.min(n === 'Moss' ? 3.0 : 3.4, d * 2.6), step = Math.min(d, v * dt);
    c.position.x += dx / d * step; c.position.z += dz / d * step; collide(c.position, 0.25);
    let dy = Math.atan2(dx, dz) - c.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.rotation.y += dy * Math.min(1, dt * 8);
    c.userData.congaSpeed = v; });
  if (!restDone && Math.hypot(p.x - HIKE[REST_AT][0], p.z - HIKE[REST_AT][1]) < 2.2) restStop();
  else if (Math.hypot(p.x - LOOKOUT[0], p.z - LOOKOUT[1]) < 3.0) startLookout();
}
// halfway: everyone gathers by the rock, Moss on it, and looks back down at camp; then the line forms behind you again
const rest = buildRest(scene); world.blockers.push({ x: rest.rock.x, z: rest.rock.z, r: 0.55 });
let restDone = false;
async function restStop() {
  restDone = true; dayThree = 'rest'; vel.set(0, 0, 0); goal.on = false;
  const R = rest.at, d = rest.toCamp, s = rest.side, face = Math.atan2(-d.x, -d.z);
  ['Thistle', 'Nyx', 'Comet', 'Biscuit', 'you', 'Juniper', 'Clover', 'Lumi', 'Rowan'].forEach((n, i) => { const c = n === 'you' ? player : byName[n],
    w = -1.55 + i * 0.44, f = 0.8 + Math.abs(i - 4) * 0.09, x = R.x + d.x * f + s.x * w, z = R.z + d.z * f + s.z * w;     // a shallow arc between the sign and the rock
    c.userData.congaSpeed = 0; c.position.set(x, heightAt(x, z), z); c.rotation.y = face; });
  const m = byName.Moss; m.userData.congaSpeed = 0; m.position.set(rest.rock.x, rest.rock.y, rest.rock.z); m.rotation.y = face;
  m.userData.seatLift = rest.rock.y - heightAt(rest.rock.x, rest.rock.z); m.setSit?.(1);
  await runRest({ byName, player, me, talk: talker.scene, wait, setCine: c => { cine = c; }, focus: c => { speaker = c; }, rest });
  m.setSit?.(0); m.userData.seatLift = 0; cine = null; placeCamera(0, true);
  crumbs = [player.position.clone()];                                               // the line forms again behind you
  dayThree = 'hike';
}
async function startLookout() {
  dayThree = 'top'; vel.set(0, 0, 0); goal.on = false;
  for (const c of [...campers, player]) { const n = c === player ? 'you' : c.userData.cast.name, [x, z] = RAIL[n];
    c.userData.congaSpeed = 0; c.position.set(x, heightAt(x, z), z); c.rotation.y = LOOK_YAW; if (c !== player) c.userData.state = 'lookout'; }
  byName.Juniper.rotation.y = LOOK_YAW + Math.PI;                                   // Juniper faces everyone, to explain the tradition
  await runLookout({ byName, player, me, campers, talk: talker.scene, wait, audio, setCine: c => { cine = c; }, focus: c => { speaker = c; }, sketch,
    grab: async () => { keep.view = await grabFrame(); }, drawing: () => keep.view });
  cine = null;
  await startNightThree();
}
// ---- night three: s'mores round two at the fire, then everyone up and dancing round it under the string lights
// (Biscuit's playlist: "It's one song. It's very long."), and a slow last song ----
let danceOn = false, dancePhase = null, danceMoves = 0, danceT0 = 0, spin = 0, jumpT = 0, danceUnclear = () => {};
const DANCE_LINES = { Comet: 'Dance-off! DANCE-OFF!', Biscuit: 'This is the good part!', Thistle: "I can't draw this fast!",
  Nyx: 'The cards said we would dance. The cards are always right.', Rowan: "I'm dancing! As Rowan!", Juniper: 'Twelve summers! Best dancers yet!',
  Moss: '...this is me dancing.', Clover: 'Crumb is dancing too! Look at him go!', Lumi: "I'm glowing on the beat! I didn't know I could!" };
const DANCERS = ['Juniper', 'Biscuit', 'Comet', 'Nyx', 'Moss', 'Thistle', 'Rowan', 'Clover', 'Lumi', 'you'];
// the dance floor: the open grass just south of the fire, between the two log benches (round the fire itself, the ring
// ran through a bench and Juniper's board)
const FLOOR = [0, 4.3];
let danceAt = new Map();
async function startNightThree() {
  dayThree = 'evening';
  const sleep = document.getElementById('sleep'), text = document.getElementById('sleepText');
  text.textContent = 'that evening 🔥'; sleep.classList.add('on'); await wait(1.6);
  sky.morning = false; tod = 0.8; todOverride = 0.92; fire.light(); cine = null; speaker = null; cushions();
  SEATING.forEach((n, i) => { const c = byName[n], s = setup.seats[i]; c.userData.state = 'night3'; c.userData.walking = false; c.userData.path = [];
    c.position.set(s.x, 0, s.z); c.rotation.y = Math.atan2(-s.x, -s.z); sitOn(c, true); });
  player.position.set(0, 0, PLAYER_SEAT); player.rotation.y = Math.PI; sitOn(player, true); vel.set(0, 0, 0); goal.on = false;
  dayThree = 'smores';
  ambient.smores([...campers, player]);
  cine = { target: new THREE.Vector3(0, 0.35, -0.9), dist: 5.4, pitch: 46, cut: true }; placeCamera(0, true);
  await wait(0.4); sleep.classList.remove('on'); await wait(1.2);
  talker.scene.open();
  await talker.scene.say('Clover', 'she/they', "S'mores, round two! Crumb gets the first one."); audio.ribbit?.();
  await talker.scene.say('Crumb', '', 'ribbit.');
  await talker.scene.say('Comet', 'any pronouns', "I'm building a s'more tower. Don't look at it. It's structurally unsound.");
  cine = { target: new THREE.Vector3(0, 0.9, -0.4), dist: 8.2, pitch: 15 };
  await talker.scene.say('Biscuit', 'he/they', "Okay. Dance party. I made a playlist. It's one song. It's very long.");
  await talker.scene.say('Juniper', 'she/they', 'Everybody up!');
  talker.scene.close(); ambient.smoresDone?.();
  startDance();
}
function startDance() {
  dayThree = 'dance'; danceOn = true; dancePhase = 'fast'; danceMoves = 0; danceT0 = t; audio.dance?.('fast');
  DANCERS.forEach((n, i) => { const c = n === 'you' ? player : byName[n], a = Math.PI / 2 + i / DANCERS.length * Math.PI * 2, r = 1.75 + (i % 2) * 0.3;
    const x = FLOOR[0] + Math.cos(a) * r, z = FLOOR[1] + Math.sin(a) * r; c.setSit?.(0); c.userData.seatLift = 0; c.userData.st && (c.userData.st.sit = 0);
    c.position.set(x, heightAt(x, z), z); c.rotation.y = Math.atan2(FLOOR[0] - x, FLOOR[1] - z); if (c !== player) c.userData.state = 'dance';
    danceAt.set(c, { x, z, ry: c.rotation.y, ph: i * 0.37 }); });
  cine = { target: new THREE.Vector3(FLOOR[0], 0.8, FLOOR[1]), dist: 6.6, pitch: 17, yaw: 0, cut: true };
  // the string lights right over the dance floor would sit between the camera and everyone, blown out; they step aside
  // for the party, and the rest of the lights stay up round the clearing
  danceUnclear = clearView(new THREE.Vector3(FLOOR[0], 1.5, FLOOR[1] + 2.5), 6.5);
  later.push({ at: t + 2.0, fn: danceBark });
  later.push({ at: t + 30, fn: () => { if (dancePhase === 'fast') slowDance(); } });
}
function danceBark() {
  if (dancePhase !== 'fast') return;
  const order = ['Comet', 'Rowan', 'Lumi', 'Clover', 'Biscuit', 'Moss', 'Nyx', 'Thistle', 'Juniper'], n = order[Math.floor((t - danceT0) / 2.8) % order.length];
  barks.say(byName[n], DANCE_LINES[n]); later.push({ at: t + 2.8, fn: danceBark });
}
async function danceMove() {
  const k = danceMoves++ % 3;
  if (k === 0) spin = 1;                                        // a spin
  else if (k === 1) jumpT = 1;                                  // a jump
  else player.emote('wave');                                    // jazz hands
  for (const c of campers) if (Math.random() < 0.35) c.emote('happy');
  if (danceMoves >= 6 && dancePhase === 'fast') { await wait(1.2); slowDance(); }
}
async function slowDance() {
  if (dancePhase !== 'fast') return;
  dancePhase = 'slow'; audio.dance?.('slow'); barks.say(byName.Juniper, 'Last song, campers. A slow one.');
  // Clover and Lumi find each other; everyone else sways where they are; Moss is asleep on their feet
  const cl = byName.Clover, lu = byName.Lumi;
  danceAt.set(cl, { x: FLOOR[0] - 0.42, z: FLOOR[1], ry: Math.PI / 2, ph: 0 }); danceAt.set(lu, { x: FLOOR[0] + 0.42, z: FLOOR[1], ry: -Math.PI / 2, ph: 0 });
  byName.Moss.setSleep?.(true); ambient.hearts?.(cl, lu);
  await wait(13);
  endDance();
}
async function endDance() {
  if (!danceOn) return;
  audio.dance?.(null); danceOn = false; dancePhase = 'done'; setup.pulse = 0; byName.Moss.setSleep?.(false); danceUnclear();
  for (const c of [...campers, player]) { c.setSit?.(1); c.userData.seatLift = 0; }
  cine = { target: new THREE.Vector3(0, 7, -16), dist: 11, pitch: -6 };                // up to the stars
  await wait(1.3); ambient.shootingStar?.(); await wait(2.6);
  for (const c of campers) c.userData.state = 'fire';                                  // goodnights, if you walk up to anyone
  cine = null; player.setSit?.(0); dayThree = 'night';
  await showCard('day three ✨', 'the last night · tap or press E to keep wandering');
}
// ---- the last morning: the tents fold away, everyone waits by the trail with their bags, and you say goodbye to each
// of them (Juniper last). Then they head down the trail one at a time, and the weekend ends where it began ----
// three rows between the welcome sign and the name-tag table, clear of the lantern post on the trail
let juniperSaid = false;
const BYE_AT = { Rowan: [-1.0, 8.3], Lumi: [0.4, 8.3], Clover: [1.6, 8.3], Thistle: [-1.1, 9.4], Comet: [0.6, 9.4], Biscuit: [1.8, 9.4],
  Nyx: [-0.6, 10.5], Moss: [0.7, 10.5], Juniper: [1.9, 10.5] };
// the go-round on the last morning: round the cold fire in the order they speak, you last, on the trail side between
// Thistle and Juniper (Day 247, after asking Opus 3 how a camp's last morning should go; see CIRCLE in dialogue.js)
const RING = ['Juniper', 'Rowan', 'Lumi', 'Clover', 'Moss', 'Comet', 'Biscuit', 'Nyx', 'Thistle', 'you'];
const ringAt = i => { const a = Math.PI / 2 + (i - 9) * Math.PI / 5; return [Math.cos(a) * 2.1, Math.sin(a) * 2.1]; };
let circleOn = false, circleAbout = null;
// the camp's bunting, carried down the trail by Rowan and Lumi as they lead everyone out (Day 247: Opus 3, asked how a
// camp's last morning should go so the lonely ones don't leave lonely, suggested giving those two "a task to do together
// on the trail out: carrying the camp banner"). Built at load and left visible, out of sight under the ground, so
// compileAsync builds its materials behind the loading screen (a material first drawn mid-game froze her PC on Day 246);
// hidden once that has run.
const banner = (() => {
  const g = new THREE.Group(), cols = [0x5bcefa, 0xf5a9b8, 0xffffff, 0xf5a9b8, 0x5bcefa], W = 0.15, H = 0.21;      // the trans flag
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-W / 2, 0, 0, W / 2, 0, 0, 0, -H, 0], 3)); tri.computeVertexNormals();
  const flagsB = cols.map((c) => { const f = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 })); g.add(f); return f; });
  const N = 12, pts = new Float32Array(N * 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x3a2f28 })); line.frustumCulled = false; g.add(line);
  g.position.set(0, -20, 0); scene.add(g);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), m = new THREE.Matrix4();
  let a = null, b = null, sag = 0.06;
  const at = (out, u) => out.lerpVectors(A, B, u).addScaledVector(up, -sag * 4 * u * (1 - u));
  return {
    g,
    carry(ca, cb) { a = ca; b = cb; g.position.set(0, 0, 0); g.visible = true; },
    hide() { a = b = null; g.visible = false; },
    update(t) {
      if (!a) return;
      if (!a.visible || !b.visible) { this.hide(); return; }
      dir.subVectors(b.position, a.position).setY(0); const d = dir.length(); if (d < 1e-3) return; dir.divideScalar(d);
      A.copy(a.position).addScaledVector(dir, 0.16); A.y = a.position.y + 0.58;          // held at the side, about paw height
      B.copy(b.position).addScaledVector(dir, -0.16); B.y = b.position.y + 0.66;
      sag = 0.05 + Math.max(0, 1.1 - A.distanceTo(B)) * 0.18;                             // slack when they walk closer together
      const P = A.clone();
      for (let i = 0; i < N; i++) { at(P, i / (N - 1)); pts[i * 3] = P.x; pts[i * 3 + 1] = P.y; pts[i * 3 + 2] = P.z; }
      lg.attributes.position.needsUpdate = true;
      side.crossVectors(dir, up); m.makeBasis(dir, up, side);                              // flags hang in the string's vertical plane
      flagsB.forEach((f, i) => { at(f.position, (i + 1) / (flagsB.length + 1)); f.quaternion.setFromRotationMatrix(m); f.rotateX(Math.sin(t * 2.4 + i * 1.3) * 0.28); });
    },
  };
})();
async function startLastMorning() {
  dayThree = 'last';
  const sleep = document.getElementById('sleep'), text = document.getElementById('sleepText');
  text.textContent = 'goodnight 🌙'; sleep.classList.add('on'); await wait(1.8);
  sky.morning = true; tod = 0.04; todOverride = 0.0; fire.out(); cine = null; talking = null; speaker = null; danceOn = false; setup.pulse = 0;
  RING.forEach((n, i) => { const c = n === 'you' ? player : byName[n], [x, z] = ringAt(i);
    if (c !== player) { c.userData.walking = false; c.userData.path = []; c.setSit?.(0); c.userData.seatLift = 0; c.userData.st && (c.userData.st.sit = 0);
      c.setSleep?.(false); c.userData.state = 'circle'; c.visible = true; }
    c.position.set(x, heightAt(x, z), z); c.rotation.y = Math.atan2(-x, -z); });        // everyone round the cold fire, facing it
  player.setSit?.(0); vel.set(0, 0, 0); goal.on = false;
  // wide, from the trail end: the circle, and the camp coming down behind it
  cine = { target: new THREE.Vector3(0, 0.6, -1.2), dist: innerWidth < innerHeight ? 16 : 13, pitch: 24, yaw: 0.3, cut: true };
  placeCamera(0, true); await wait(0.6); text.textContent = 'the last morning ☀️'; await wait(1.4); sleep.classList.remove('on');
  // everyone was up early: the tents come down one by one, and theirs stay up last
  const names = Object.keys(TENT_SPOT).filter(n => n !== 'you');
  names.forEach((n, i) => after(0.6 + i * 0.7, () => { tents.fold(n); const [x, z] = TENT_SPOT[n];
    for (let k = world.blockers.length - 1; k >= 0; k--) { const b = world.blockers[k]; if (b.x === x && b.z === z) world.blockers.splice(k, 1); } }));
  // and everything you set up comes down with them; the welcome sign stays, its back turned to camp says goodbye
  ['lights', 'games', 'snacks', 'firewood', 'hangout', 'hammock', 'tent'].forEach((id, i) => after(1.0 + i * 0.75, () => setup.pack(id)));
  await wait(6.2);
  await goRound();
  // then the bags go by the trail, where you say goodbye to each of them; the ones north of the fire go round it
  for (const [n, [x, z]] of Object.entries(BYE_AT)) { const c = byName[n], via = c.position.z < 0.8 ? [[c.position.x < 0 ? -2.7 : 2.7, 1.0]] : [];
    c.userData.state = 'bye'; walkTo(c, [...via, [x, z]], [0.4, 15]); }
  dayThree = 'bye';
}
async function goRound() {
  circleOn = true; const portrait = innerWidth < innerHeight, J = byName.Juniper;
  const who = n => (n === 'you' ? player : byName[n]), pron = n => (n === 'you' ? me.pron : byName[n].userData.cast.pron), nameOf = n => (n === 'you' ? me.name : n);
  // a two-shot from the middle of the circle: the one talking, and the one they're talking about, next to them
  const two = (a, b) => { const mid = a.position.clone().add(b.position).multiplyScalar(0.5);
    return { target: mid.setY(mid.y + 0.7), dist: portrait ? 4.1 : 2.9, pitch: 14, yaw: Math.atan2(-mid.x, -mid.z), cut: true }; };
  // and one alone, straight on from the middle (the welcome circle's angled shot put Rowan's back across a third of it)
  const one = c => ({ target: c.position.clone().setY(c.position.y + 0.72), dist: portrait ? 3.4 : 2.6, pitch: 12, yaw: Math.atan2(-c.position.x, -c.position.z), cut: true });
  talker.scene.open(); speaker = J; circleAbout = null; cine = one(J);
  for (const line of CIRCLE.open) await talker.scene.say('Juniper', 'she/they', line);
  for (const r of CIRCLE.round) {
    const A = who(r.who), B = who(r.about);
    cine = two(A, B); speaker = A; circleAbout = B; A.emote('nod');
    after(1.1, () => { if (r.react) B.emote(r.react); if (r.glow) B.setGlow?.((B.userData.st?.glow || 0) + r.glow); if (r.hearts) ambient.hearts?.(A, B, 3); });
    await talker.scene.say(nameOf(r.who), pron(r.who), r.say);
    if (r.reply) { speaker = B; circleAbout = A; await talker.scene.say(nameOf(r.about), pron(r.about), r.reply); }
  }
  // your turn, last. Thistle draws you like this, in the middle: it's the drawing they hand you at the goodbyes
  speaker = null; circleAbout = null;
  cine = { target: player.position.clone().setY(player.position.y + 0.6), dist: portrait ? 6.4 : 5.2, pitch: 16,
    yaw: Math.atan2(-player.position.x, -player.position.z), cut: true };
  await wait(0.35); keep.circle = await grabFrame(900);
  speaker = player; circleAbout = J;
  const pick = await talker.scene.choose(CIRCLE.mine);
  await talker.scene.say(me.name, me.pron, pick.opt);
  cine = two(J, player); speaker = J; circleAbout = player; J.emote('happy');
  await talker.scene.say('Juniper', 'she/they', pick.then);
  for (const c of campers) c.emote('happy'); player.emote('happy');
  speaker = J; circleAbout = null; cine = one(J);
  await talker.scene.say('Juniper', 'she/they', CIRCLE.close);
  talker.scene.close(); speaker = null; circleAbout = null; circleOn = false; cine = null;
  goal.on = false; vel.set(0, 0, 0);                   // a tap while the camp was packing shouldn't walk you off afterwards
}
async function sayGoodbye(c) {
  const name = c.userData.cast.name;
  if (name === 'Juniper') {
    const left = campers.filter(k => k !== c && k.userData.state === 'bye').length;
    if (left) { talker.scene.open(); await talker.scene.say('Juniper', 'she/they', "Say bye to everyone else first, organizer. I'll be here. I'm always the last to leave."); talker.scene.close(); return; }
    return lastGoodbye(c);
  }
  await talker.talk(c.userData.cast, me, flags, BYES); sketch.hide();          // Thistle's drawing goes in your bag
  c.userData.state = 'bye-done'; c.emote('wave');
}
async function lastGoodbye(j) {
  dayThree = 'leaving'; talking = j; actBtn.hidden = true;
  talker.scene.open();
  await talker.scene.say('Juniper', 'she/they', 'Twelve summers. This was one of the good ones. Because of you, organizer.');
  await talker.scene.say('Juniper', 'she/they', 'Same time next summer?');
  const pick = await talker.scene.choose(["Wouldn't miss it.", "I'll bring more firewood.", 'Save me the good log.']);
  await talker.scene.say(me.name, me.pron, pick.opt);
  await talker.scene.say('Juniper', 'she/they', pick.opt.startsWith('Save') ? "It's yours. It's always been yours." : "It's a date. Okay, everybody. Group hug!");
  talker.scene.close(); talking = null;
  for (const c of campers) c.emote('happy'); player.emote('happy');
  ambient.hearts?.(byName.Clover, byName.Lumi);
  await wait(1.6);
  // and then down the trail, one at a time, waving; you stay at the top of it and wave back
  const px = 0.6, pz = 7.2; player.position.set(px, heightAt(px, pz), pz); player.rotation.y = 0;
  cine = { target: new THREE.Vector3(0.4, 0.9, 12.5), dist: 9.5, pitch: 13, yaw: Math.PI + 0.12, cut: true };
  // Rowan and Lumi go first, side by side, with the bunting between them (see `banner`); the rest follow, and Juniper
  // goes last, as she told you she always does
  const order = [['Rowan', 'Lumi'], 'Moss', 'Nyx', 'Biscuit', 'Thistle', 'Comet', 'Clover', 'Juniper'];
  // and Biscuit plays them down the trail, so the song goes quieter as he goes ("on the way, songs may be sung": a
  // 1930 book's advice for a camp's last morning, from Talkie, Day 246)
  ambient.play(byName.Biscuit, true);
  barks.say(byName.Juniper, 'Rowan, Lumi: you two lead us out. Take the bunting.');
  // and the crowd parts for them: the four standing in their lane step aside, so the two walk up a clear aisle side by side
  // (in the first try they slid round the standing rows one behind the other, and the bunting went edge-on to the camera)
  for (const [n, x, z] of [['Thistle', -1.75, 9.4], ['Nyx', -1.55, 10.5], ['Comet', 1.2, 9.4], ['Moss', 1.3, 10.5]]) walkTo(byName[n], [[x, z]], [0.4, 15]);
  const leave = (n, dx) => { const c = byName[n]; c.emote('wave'); c.userData.state = 'leaving';
    walkTo(c, [[0.0, 12.5], [0.6, 22], [0.5, 27]].map(([x, z]) => [x + dx, z]), [0.4, 40],
      () => { c.visible = false; if (c === byName.Biscuit) ambient.play(c, false); }); };
  order.forEach((n, i) => after(1.2 + i * 1.5, () => {
    if (Array.isArray(n)) { leave(n[0], -0.45); leave(n[1], 0.45); banner.carry(byName[n[0]], byName[n[1]]); }
    else leave(n, i % 2 ? 0.35 : -0.35); }));
  after(2.2, () => barks.say(byName.Lumi, "I'm glad I came in."));
  await wait(1.2 + order.length * 1.5 + 5.5);
  player.emote('wave');
  await showCard('see you next summer ✨', "everyone's gone down the trail · follow them when you're ready");
  dayThree = 'home';
}
// the end: the camp was yours to wander as long as you liked (Day 246, Jerika: "i walk down the path but nothing happens,
// i just can wander around the screen forever... it's fun to wander around forever"), and the trail takes you home, where
// you find what you brought back: the photo, Thistle's drawings, the bracelet on your wrist
let ending = false;
async function theEnd() {
  ending = true; goal.on = false; vel.set(0, 0, 0); dayThree = 'gone';
  const sleep = document.getElementById('sleep'), text = document.getElementById('sleepText');
  text.textContent = 'the drive home 🚗'; sleep.classList.add('on'); await wait(2.2);
  cine = { target: new THREE.Vector3(0, 1.0, 1.0), dist: 16, pitch: 24, yaw: Math.PI * 0.85, cut: true };     // the empty camp, from above
  todOverride = 0.55; player.visible = false;
  text.textContent = 'home ✨'; await wait(1.6); sleep.classList.remove('on'); await wait(1.0);
  const keeps = [keep.polaroid, ...keep.sketches].filter(Boolean).map(u => `<img src="${u}" alt="">`);
  if (keep.bracelet) keeps.push(braceletSvg(keep.bracelet));
  await showCard(keeps.length ? 'home, with a pocket full of camp ✨' : 'home ✨', 'made with love by Kit · thanks for coming to camp', keeps, true);
}
function danceStep(dt) {
  const bps = dancePhase === 'fast' ? 116 / 60 : 72 / 60, ph = (t - danceT0) * bps;
  setup.pulse = dancePhase === 'fast' ? Math.exp(-(ph % 1) * 5) : 0.25 + 0.15 * Math.sin(ph * Math.PI);
  if (cine && cine.yaw !== undefined) cine.yaw = Math.sin((t - danceT0) * 0.16) * 0.95;  // the camera sways along the south side, the fire behind the party
  for (const [c, d] of danceAt) {
    const k = ph + d.ph, slow = dancePhase === 'slow', bounce = slow ? 0 : Math.abs(Math.sin(k * Math.PI)) * 0.09;
    let x = d.x, z = d.z;
    if (slow) { const pair = c === byName.Clover || c === byName.Lumi; x += pair ? 0 : Math.sin(k * 0.5) * 0.05; }
    if (c === player) {
      if (spin > 0) spin = Math.max(0, spin - dt * 1.6);
      if (jumpT > 0) jumpT = Math.max(0, jumpT - dt * 2.2);
      c.position.set(x, heightAt(x, z) + bounce + Math.sin(Math.PI * jumpT) * 0.45, z);
      c.rotation.y = d.ry + Math.sin(k * Math.PI * 0.5) * (slow ? 0.15 : 0.35) + (1 - spin) * Math.PI * 2 * (spin > 0 ? 1 : 0);
    } else {
      c.userData.seatLift = bounce; c.position.x = x; c.position.z = z;
      c.rotation.y = d.ry + Math.sin(k * Math.PI * (slow ? 0.25 : 0.5)) * (slow ? 0.18 : 0.4);
      if (!slow && Math.floor(k) % 8 === Math.floor(d.ph * 3) % 8 && (k % 1) < dt * bps) c.emote('happy');    // now and then, a hop
    }
  }
}
// skipping stones with Comet: three throws, each timed on a shrinking ring; Comet counts every bounce
const COUNTS = { 1: "One! It counts. I'm counting it.", 2: 'Two! A classic.', 3: 'Three! Okay, okay.', 4: "Four! You've done this before.",
  5: "Five! I'm getting nervous.", 6: "Six! One off my record. I'm sweating.", 7: "Seven. That's my record. We're tied. I hate this. I love this.",
  8: "EIGHT?! New camp record. I'm putting it on the board.", 9: "NINE?! On the board. In permanent marker." };
let stonesOn = false;
async function skipStones(comet) {
  stonesOn = true;
  const z = comet.position.z - 0.9, x = comet.position.x;
  player.position.set(x, heightAt(x, z), z); player.rotation.y = Math.PI / 2; vel.set(0, 0, 0);
  const tz = 3.2, tx = streamX(tz);
  cine = { target: new THREE.Vector3(tx, heightAt(tx, tz) + 0.4, tz), dist: 6.2, pitch: 24, yaw: -2.37 };
  const pulse = document.getElementById('pulse'), ring = document.getElementById('ring');
  let best = 0;
  for (let i = 0; i < 3; i++) {
    pulse.hidden = false; actBtn.hidden = false; actBtn.textContent = matchMedia('(pointer: fine)').matches ? 'throw!  ·  E' : 'throw!';
    const t0 = performance.now(); let raf = 0;
    const scaleAt = ms => 0.675 + 0.325 * Math.cos(((ms - t0) / 1100) * Math.PI * 2);      // 1 → 0.35 → 1, every 1.1 s
    const spin = () => { ring.style.transform = `scale(${scaleAt(performance.now()).toFixed(3)})`; raf = requestAnimationFrame(spin); }; spin();
    await new Promise(r => { throwWait = r; });
    cancelAnimationFrame(raf); pulse.hidden = true; actBtn.hidden = true;
    const quality = 1 - (scaleAt(performance.now()) - 0.35) / 0.65;
    player.emote('wave');
    const hand = player.position.clone().add(new THREE.Vector3(0.25, 0.55, 0.1));
    const hops = await morning.stones.throw(hand, quality, () => audio.splash?.());
    best = Math.max(best, hops);
    talker.scene.open(); await talker.scene.say('Comet', 'any pronouns', COUNTS[hops]); talker.scene.close();
    if (hops >= 7) comet.emote('happy');
  }
  talker.scene.open();
  await talker.scene.say('Comet', 'any pronouns', best >= 7 ? 'Okay. Rematch tonight. After the talent show. Bring that arm.' : 'Rematch tonight. After the talent show. I will be unbearable.');
  talker.scene.close(); cine = null; stonesOn = false;
}
function showCard(sub, foot, keeps = null, again = false) {
  const card = document.getElementById('card'), box = document.getElementById('keeps'), btn = document.getElementById('again');
  card.querySelector('.s').textContent = sub; card.querySelector('.f').textContent = foot;
  if (keeps && keeps.length) { box.innerHTML = keeps.join(''); box.hidden = false; } else { box.hidden = true; box.innerHTML = ''; }
  btn.hidden = !again; btn.onclick = e => { e.stopPropagation(); location.reload(); };
  if (again) return showTitle(true);
  return showTitle();
}

async function startFinale() {
  if (finale || fire.lit) return;
  finale = true; goal.on = false; vel.set(0, 0, 0); cushions();
  await runFinale({ campers, byName, player, me, flags, talk: talker.scene, fire, title: showTitle,
    seats: setup.seats, walkTo, setCine: c => { cine = c; }, setTodTarget: v => { todOverride = v; },
    sit: (c, on) => { c.setSit(on ? 1 : 0); c.userData.seatLift = on ? 0.11 : 0; c.position.y = heightAt(c.position.x, c.position.z) + c.userData.seatLift; },
    wait: s => new Promise(r => after(s, r)), focus: c => { speaker = c; }, smores: ambient.smores, shootingStar: ambient.shootingStar,
    play: (name, on) => ambient.play(byName[name], on), hearts: (a, b) => ambient.hearts(a, b), photo: groupPhoto });
  finale = false; speaker = null;
}

// ---- the evening's clock: the sun follows the work ----
let capture = null;                       // a function to hand the canvas to, once, right after the next frame is drawn
let tod = params.has('tod') ? +params.get('tod') : 0.04;
const fixedTod = params.has('tod');
const greeted = () => campers.filter(c => ['pitching', 'settled', 'friends', 'fire'].includes(c.userData.state)).length;
const befriended = () => campers.filter(c => ['friends', 'fire'].includes(c.userData.state)).length;
const targetTod = () => 0.04 + 0.28 * setup.done() / setup.total + 0.1 * greeted() / campers.length + 0.14 * befriended() / campers.length;
let t = 0, last = performance.now(), todOverride = null, speaker = null;
placeCamera(0, true);
function frame(now) {
  // never backwards: the first frame's timestamp is from before the scene finished building (about a second earlier),
  // and a negative step left everything that pops in on that frame stuck mid-pop, tents 5 m tall (Day 246, a day-two start)
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = Math.max(last, now); t += dt;
  if (!fixedTod) { const want = todOverride ?? targetTod(), rate = todOverride === null ? 0.03 : 0.045; tod += THREE.MathUtils.clamp(want - tod, -dt * rate, dt * rate); }
  for (let i = later.length - 1; i >= 0; i--) if (t >= later[i].at) { const f = later[i].fn; later.splice(i, 1); f(); }
  const sp = step(dt);
  player.update(dt, t, sp);
  if (dayThree === 'hike') congaStep(dt);
  if (dayThree === 'home' && !ending && player.position.z > 20.5 && !document.getElementById('card').classList.contains('show')) theEnd();
  if (danceOn) danceStep(dt);
  campersStep(dt, t);
  separate();
  ambient.update(dt, t, tod, { campers, byName, player, flags, talking, finale, camera });
  { const b = byName.Biscuit, near = d => Math.max(0, 1 - d);                  // what you'd hear from where you stand
    audio.update(dt, { tod, fire: fire.level, fireNear: Math.max(0.2, near(Math.hypot(camTarget.x, camTarget.z) / 16)),
      guitar: !showOn && ambient.busy(b) > 0.85 ? near(b.position.distanceTo(player.position) / 10) : 0,   // the show has its own songs
      snore: byName.Moss.userData.st?.sleep && byName.Moss.visible ? near(byName.Moss.position.distanceTo(player.position) / 7) : 0 }); }
  const hush = talker.open || finale || !!talking || showOn || document.getElementById('card').classList.contains('show');
  barks(t, { player, camera, quiet: hush, night: fire.lit, audio, swim: swimPhase === 'called' || swimPhase === 'in' });
  duck.update(dt, t, { player, camera, quiet: hush || !!cine, audio });
  // what can I do here? a camper waiting to be welcomed comes first, then whatever's left to set up
  if (!talker.open && !finale) {
    // on the last morning Juniper waits to be last: until everyone else has had their goodbye, she's not the one the button
    // offers (standing in front of the rows and pressing E reaches the next person, not her "everyone else first" again)
    const byeLeft = dayThree === 'bye' ? campers.filter(k => k.userData.state === 'bye' && k !== byName.Juniper).length : 0;
    if (byeLeft && !juniperSaid && !byName.Juniper.userData.walking && byName.Juniper.position.distanceTo(player.position) < 2.2) {   // once she's at the trail, not as the circle breaks up
      juniperSaid = true; barks.say(byName.Juniper, "Everyone else first, organizer. I'm always the last to leave."); }
    const c = campers.filter(k => ['greet', 'settled', 'morning', 'bye'].includes(k.userData.state) && k.position.distanceTo(player.position) < 2.4
                                  && !(byeLeft && k === byName.Juniper))
                     .sort((a, b) => a.position.distanceTo(player.position) - b.position.distanceTo(player.position))[0] || null;
    const it = c || isMorning ? null : setup.near(player.position);
    const fireReady = !c && !it && !fire.lit && !isMorning && allHome() && Math.hypot(player.position.x, player.position.z) < 3.6;
    const [ttx, ttz] = TENT_SPOT.you, sleepReady = !c && !it && ((fire.lit && !isMorning) || (showPhase === 'done' && !dayThree))
      && Math.hypot(player.position.x - ttx, player.position.z - ttz) < 2.4 || (!c && dayThree === 'night' && Math.hypot(player.position.x - ttx, player.position.z - ttz) < 2.4);
    const [jx, jz] = jumpSpot(), comet = byName.Comet;
    // jump in from anywhere on the near bank of the swimming hole, not only at the ring: walking along the bank to the
    // ring, the campers sitting there and the rocks boxed you in (Day 246, a played run; the ring just marks the spot)
    const pz = player.position.z, bankOK = pz > SWIM_Z[0] + 0.4 && pz < SWIM_Z[1] - 0.4 && player.position.x > streamX(pz) - 3.4;
    const pen = !c && isMorning && !showPhase ? pencils.near(player.position) : null;
    const sw = pen ? pen.act : swimPhase === 'called' && !hops.length && (bankOK || Math.hypot(player.position.x - jx, player.position.z - jz) < 1.6) ? SWIM_ACT.jump
      : swimming && swimPhase === 'in' && !fightBusy && splashes < 3 && comet.userData.state === 'swim' && comet.position.distanceTo(player.position) < 1.9 ? SWIM_ACT.splash
      : danceOn && dancePhase === 'fast' ? SWIM_ACT.dance : null;
    if (!throwWait && (c !== nearCamper || it !== nearItem || fireReady !== nearFire || sleepReady !== nearSleep || sw !== nearSwim)) {
      nearCamper = c; nearItem = it; nearFire = fireReady; nearSleep = sleepReady; nearSwim = sw; actBtn.hidden = !(c || it || fireReady || sleepReady || sw);
      const key = matchMedia('(pointer: fine)').matches ? '  ·  E' : '';
      if (c) actBtn.textContent = `${c.userData.state === 'greet' ? 'welcome' : c.userData.state === 'morning' ? 'say good morning to' : c.userData.state === 'bye' ? 'say goodbye to' : 'talk to'} ${c.userData.cast.name}${key}`;
      else if (it) actBtn.textContent = it.verb + key;
      else if (fireReady) actBtn.textContent = `light the campfire${key}`;
      else if (sleepReady) actBtn.textContent = `sleep in your tent 🌙${key}`;
      else if (sw) actBtn.textContent = sw.label + key; }
  }
  const d = setup.done(), g = greeted(), f = befriended(), arrived = campers.filter(k => k.userData.state !== 'away').length;
  const mornDone = campers.filter(k => k.userData.state === 'morning-done').length;
  goalEl.textContent = dayThree === 'bye' ? `say goodbye 💛 · ${campers.filter(k => k.userData.state === 'bye-done').length} of ${campers.length}`
    : dayThree ? (DAY3_GOAL[dayThree] ?? 'day three ☀️') : isMorning ? (showPhase === 'done' ? 'day two ✨ · goodnight 🌙' : showPhase ? 'the talent show 🎤'
      : braceletPhase === 'done' ? 'the talent show is tonight 🎤' : braceletPhase ? 'friendship bracelets 🧵'
      : swimPhase === 'called' ? 'the swim 🌊 · jump in at the stream'
      : swimPhase === 'in' ? (byName.Comet.userData.state === 'swim' ? `splash fight 💦 · ${splashes} of 3` : 'the swim 🌊')
      : swimPhase === 'lunch' ? 'lunch 🥪' : (mornDone < campers.length ? `day two, morning ☀️ · good morning ${mornDone} of ${campers.length}` : 'day two ☀️')
        + (!swimPhase && pencils.found < pencils.total ? ` · ✏️ Thistle's pencils ${pencils.found} of ${pencils.total}` : ''))
    : fire.lit ? (finale ? 'the welcome circle 🔥' : 'welcome to camp ✨ · your tent when you\'re ready 🌙')
    : d < setup.total && arrived === 0 ? `set up camp · ${d} of ${setup.total}`
    : g < campers.length ? `welcome everyone · ${g} of ${campers.length}${d < setup.total ? ` · camp ${d}/${setup.total}` : ''}`
    : f < campers.length ? `get to know everyone · ${f} of ${campers.length}${d < setup.total ? ` · camp ${d}/${setup.total}` : ''}`
    : allHome() ? 'everyone is here ✨ · meet at the fire 🔥' : 'everyone is settling in…';
  setup.update(dt, t, tod); tents.update(dt, t, tod); banner.update(t); pencils.update(t, player.position); fire.update(dt, t); morning.update(dt); stage.update(dt, THREE.MathUtils.smoothstep(tod, 0.55, 0.85));
  if (swimPhase) swimArrivals(); hopsStep(dt); swim.update(dt);
  if (jumpRing.visible) jumpRing.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
  if (isMorning && !swimPhase && mornDone === campers.length && pencils.found === pencils.total && !talker.open && !talking && !stonesOn
      && !document.getElementById('card').classList.contains('show')) callSwim();
  placeCamera(dt);
  { const f = camTarget.clone().project(camera); seeThrough.uSeeFocus2.value.set(f.x, f.y);          // trees between us go see-through
    seeThrough.uSeeFocusZ.value = -camTarget.clone().applyMatrix4(camera.matrixWorldInverse).z; renderer.getDrawingBufferSize(seeThrough.uSeeRes.value);
    const wide = !cine && !talking;   // the follow camera at its usual distance; a talk or a scripted shot keeps the narrow rule
    seeThrough.uSeeNear.value.set(wide ? 7.0 : 4.5, wide ? 3.5 : 2.4); seeThrough.uSeeRing.value.set(wide ? 0.85 : 0.66, wide ? 0.45 : 0.34); }
  sky.update(tod, t, camTarget);
  refreshEnv(tod);
  look.fill.value.copy(sky.hemi.color).multiplyScalar(0.2 * sky.hemi.intensity);   // a soft fill on the critters' faces, from the sky's own light
  if (flashK > 0) { look.fill.value.addScalar(0.55 * flashK); sky.hemi.intensity += 1.6 * flashK; }
  wind.uTime.value = t;
  air(dt, t, tod, camTarget);
  // light shafts: where the sun is on screen, how strong (golden hour most, gone after sunset)
  { const sp = camera.position.clone().addScaledVector(sky.sunDir, 300).project(camera);
    const u = sp.x * 0.5 + 0.5, v = sp.y * 0.5 + 0.5, off = Math.max(0, -u, u - 1, -v, v - 1);   // how far outside the frame the sun is
    rays.uniforms.uSun.value.set(u, v);
    rays.uniforms.uStrength.value = (sp.z < 1 ? 1 : 0) * (1 - THREE.MathUtils.smoothstep(off, 0.1, 0.5))
                                  * (1 - THREE.MathUtils.smoothstep(tod, 0.42, 0.62)) * 2.6;
    rays.uniforms.uColor.value.copy(sky.sun.color);
    rays.uniforms.tDepth.value = composer.readBuffer.depthTexture; }
  grade.uniforms.uWarm.value = 1 - THREE.MathUtils.smoothstep(tod, 0.62, 0.95) * 0.6;
  renderer.toneMappingExposure = 1.05 + 0.4 * THREE.MathUtils.smoothstep(tod, 0.6, 1);   // eyes adjust after dark
  world.update(t, tod, sky);
  composer.render();
  if (capture) { const f = capture; capture = null; f(renderer.domElement); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.getElementById('hint').textContent = matchMedia('(pointer: fine)').matches ? 'WASD or arrow keys to walk · or click where to go' : 'drag to walk';
// every material there is, built now behind the loading screen rather than the first time it's seen (each one a stall
// on a Windows PC); compileAsync lets the browser build them in parallel where it can
// compile the way the game draws: into the composer's linear target. Bound to nothing, compile() builds the sRGB,
// tone-mapped variants of every program, which the game never uses, so the warm-up quietly built the wrong ones and
// only the frames drawn behind the loading screen warmed anything (Day 248, read off each program's cache key).
const compileAsDrawn = (what, lights) => { const was = renderer.getRenderTarget(); renderer.setRenderTarget(composer.readBuffer);
  const ready = renderer.compileAsync(what, camera, lights); renderer.setRenderTarget(was); return ready.catch(() => {}); };
// compileAsync walks only what's visible, so what waits hidden (setup items, tents not yet pitched, props for later
// days) used to build its shaders the moment it first appeared: 11 programs during setup and pitching (Day 248). Compile
// those too, as visible stand-ins sharing their geometry and materials, lit by the real scene; the real objects'
// visibility is never touched, so nothing the game reads from it can change.
{ const stand = new THREE.Scene(), hiddenUp = o => { for (let q = o; q; q = q.parent) if (!q.visible) return true; return false; };
  scene.traverse(o => { if ((o.isMesh || o.isSprite || o.isLine || o.isPoints) && !o.isSkinnedMesh && o.material && hiddenUp(o)) {
    const s = o.clone(false); s.visible = true; stand.add(s); } });
  for (const g of [...setup.standIns(), ...tentStandIns()]) stand.add(g);       // and what is only built when you set it up or a camper pitches
  if (stand.children.length) await compileAsDrawn(stand, scene); }
await compileAsDrawn(scene, scene);
banner.hide();                       // compiled with everything else above; it waits for the last morning
window.__camp = { setup, campers, byName, flags, barks, duck, act: () => act(), setTod: v => { tod = v; }, get tod() { return tod; }, get talking() { return !!talking; },
  setCine: c => { cine = c; }, groupPhoto, startMorning: () => startMorning(), morning, get isMorning() { return isMorning; }, get stonesOn() { return stonesOn; }, swim, jumpSpot, streamX, get swimPhase() { return swimPhase; }, get braceletPhase() { return braceletPhase; }, startBracelets: () => startBracelets(), startTalentShow: () => startTalentShow(), get showPhase() { return showPhase; }, stage, startDayThree: () => startDayThree(), get dayThree() { return dayThree; }, get crumbs() { return crumbs.length; }, hikePath: HIKE, lookoutAt: LOOKOUT, startNightThree: () => startNightThree(), get dancePhase() { return dancePhase; }, keep, get danceMoves() { return danceMoves; }, startLastMorning: () => startLastMorning(), startRest: () => restStop(), pencils, get swimming() { return swimming; }, get splashes() { return splashes; }, camera, player, me, scene, renderer, tents, fire, ambient, audio, startFinale: () => startFinale(), get finale() { return finale; }, ready: true };
if (me.chapter === 2) jumpToDayTwo();
if (me.chapter === 3) jumpToDayThree();
document.getElementById('loading').style.opacity = 0; setTimeout(() => (document.getElementById('loading').hidden = true), 900);
