// The campfire: real flames (a noise shader on crossed planes), embers, rising sparks and a flickering warm light,
// then the evening's last scene: everyone gathers on the cushions, you welcome them, pick two icebreakers, and they go
// round one by one. Clover outs herself as a robosexual. Lumi's spark is at its brightest when it's her turn.
import * as THREE from 'three';
import { heightAt } from './world.js';

const FLAME_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FLAME_F = /* glsl */`
  uniform float uTime, uSeed, uOn; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ return n(p) * 0.55 + n(p * 2.1) * 0.27 + n(p * 4.3) * 0.18; }
  void main() {
    vec2 uv = vUv; float y = uv.y;
    float x = (uv.x - 0.5) * 2.0;
    float wob = (fbm(vec2(y * 3.0 - uTime * 1.8, uSeed)) - 0.5) * 0.5 * y;
    float width = (1.0 - y) * 0.95 + 0.05;
    float shape = 1.0 - smoothstep(width * 0.55, width, abs(x + wob));
    float lick = fbm(vec2(uv.x * 4.0 + uSeed, y * 5.0 - uTime * 3.2));
    float f = shape * smoothstep(0.0, 0.08, y) * smoothstep(1.0, 0.2 + lick * 0.5, y + lick * 0.35);
    vec3 col = mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.62, 0.15), smoothstep(0.1, 0.55, f));
    col = mix(col, vec3(1.0, 0.95, 0.72), smoothstep(0.65, 0.95, f) * (1.0 - y));
    gl_FragColor = vec4(col * 2.4 * f, f) * uOn;
  }`;

export const PLAYER_SEAT = 2.75;            // your cushion, south of the fire
export const ANSWERS = {   // what do you want to do / a name you almost picked / comfort snack / camp superpower
  Juniper: ["Tell the ghost story about the hammock. Moss, you'll want to hear this one.", "Junebug. My sister still calls me that, and I let her.",
            "Ginger snaps dunked in cocoa. Don't knock it.", "I can start a fire with wet wood and a grudge."],
  Biscuit: ["Play the song! Swim in the stream! Nap! Play the song again!", "Sir Waggington. I was twelve. I stand by it.",
            "Peanut butter, off the spoon. Don't tell me if that's weird.", "I can make friends with anyone in under a minute. I've timed it."],
  Clover:  ["Feed everyone. Win charades. Maybe kiss someone down by the stream. Hypothetically.", "Pickle. Not as a name. I just really wanted pickles that day.",
            "Pickles. Obviously. A whole jar.", "I can fit an entire snack table into one backpack."],
  Comet:   ["Everything. Every game. Probably cry at the fire once. Possibly now.", "Blaze. I was thirteen and I was correct.",
            "Sour gummy worms, the kind that hurt a little.", "I can turn anything into a competition. This is a competition. I'm winning."],
  Nyx:     ["Readings for anyone who wants one, and a midnight walk down to the stream.", "Raven. Then I met three other Ravens.",
            "Dark chocolate with sea salt. And tea. Always tea.", "I always know when someone needs to talk."],
  Moss:    ["This. Exactly this. And then the hammock.", "I've always been Moss. Moss has always been Moss.",
            "Oranges. Ideally balanced on my head first.", "Total stillness. Birds land on me."],
  Thistle: ["Look at the lights. Maybe draw them. Maybe draw all of you, if that's okay.", "Hazel. It was close, but it never quite fit.",
            "Toast. Plain toast. It's very comforting.", "I notice small things. Like how Comet's ears twitch when they're lying."],
  Rowan:   ["Hear people say my name. I've been counting. It's a lot. It's good.", "Elliot, for about a week. It was a good week.",
            "Grape juice boxes. The tiny ones.", "I remember everyone's pronouns. I practiced in the car."],
  Lumi:    ["Stay. I think I'd like to stay.", "L-7 was the only name I ever had. Lumi is the first one I picked.",
            "Sunlight. Is that a snack? It's a snack for me.", "I glow when I'm happy. You can probably tell right now."],
};
const QUESTIONS = ['what do you want to do at camp this weekend?', 'a name you almost picked?', 'your comfort snack?', 'your camp superpower?'];

export function buildFire(scene, ring, high) {
  const g = new THREE.Group(); g.position.copy(ring.position); scene.add(g);
  const uniforms = [];
  for (let i = 0; i < 3; i++) {
    const u = { uTime: { value: 0 }, uSeed: { value: i * 3.7 }, uOn: { value: 0 } }; uniforms.push(u);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.55), new THREE.ShaderMaterial({ uniforms: u, vertexShader: FLAME_V, fragmentShader: FLAME_F,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.y = 0.82; m.rotation.y = i * Math.PI / 3; g.add(m);
  }
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 64; const gc = glowC.getContext('2d'), gr = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,170,80,1)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); gc.fillStyle = gr; gc.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowC), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.scale.set(2.6, 1.6, 1); glow.position.y = 0.35; g.add(glow);
  const light = new THREE.PointLight(0xff9a48, 0, 18, 1.6); light.position.y = 1.0; g.add(light);
  if (high) { light.castShadow = true; light.shadow.mapSize.set(512, 512); light.shadow.camera.near = 0.3; light.shadow.camera.far = 14; light.shadow.bias = -0.002; }
  // the logs in the ring start to glow
  const embers = [];
  ring.traverse(o => { if (o.isMesh && o.geometry.type === 'CylinderGeometry') { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xff5a1a); o.material.emissiveIntensity = 0; embers.push(o.material); } });
  // sparks rising
  const N = 70, sp = new Float32Array(N * 3), S = [];
  for (let i = 0; i < N; i++) S.push({ y: Math.random() * 3, x: 0, z: 0, vx: 0, vz: 0, vy: 1 + Math.random() * 1.5, life: Math.random() });
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32; { const dg = dot.getContext('2d'), gg = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
    gg.addColorStop(0, 'rgba(255,230,180,1)'); gg.addColorStop(0.35, 'rgba(255,170,80,0.8)'); gg.addColorStop(1, 'rgba(255,120,40,0)'); dg.fillStyle = gg; dg.fillRect(0, 0, 32, 32); }
  const sm = new THREE.PointsMaterial({ color: 0xffb060, size: 0.07, map: new THREE.CanvasTexture(dot), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });   // round, soft
  const sparks = new THREE.Points(sg, sm); sparks.frustumCulled = false; g.add(sparks);
  let on = 0, lit = false;
  return {
    dim: 1,
    get lit() { return lit; }, get level() { return on; },
    light: () => { lit = true; },
    out: () => { lit = false; },
    update(dt, t) {
      on += ((lit ? 1 : 0) - on) * Math.min(1, dt * 0.8);
      const shown = on * this.dim;                    // dim: the photo's flash exposure (1 otherwise); `on` stays the fire's real level
      for (const u of uniforms) { u.uTime.value = t; u.uOn.value = shown; }
      const flick = 0.82 + 0.1 * Math.sin(t * 13.1) + 0.08 * Math.sin(t * 7.3 + 1.2) + 0.05 * Math.sin(t * 23.0);
      light.intensity = on * 14 * flick; glow.material.opacity = shown * 0.4 * flick; sm.opacity = shown;
      for (const m of embers) m.emissiveIntensity = on * (1.6 + 0.4 * Math.sin(t * 3.1));
      for (let i = 0; i < N; i++) { const s = S[i]; s.life += dt * 0.45; s.y += s.vy * dt; s.x += s.vx * dt; s.z += s.vz * dt;
        s.vx += (Math.random() - 0.5) * dt * 1.2; s.vz += (Math.random() - 0.5) * dt * 1.2;
        if (s.life > 1 || s.y > 3.4) { s.life = 0; s.y = 0.3; s.x = (Math.random() - 0.5) * 0.4; s.z = (Math.random() - 0.5) * 0.4; s.vx = 0; s.vz = 0; }
        sp[i * 3] = s.x; sp[i * 3 + 1] = s.y; sp[i * 3 + 2] = s.z; }
      sg.attributes.position.needsUpdate = true;
    },
  };
}

// the last scene, run once: ctx gives it the campers, the talk box, walking, the camera and the clock
export async function runFinale(ctx) {
  const { campers, byName, player, me, flags, talk, walkTo, sit, setCine, setTodTarget, wait, title, fire, focus = () => {} } = ctx;
  const faceOf = c => ({ target: c.position.clone().add(new THREE.Vector3(0, 0.72, 0)), dist: 3.3, pitch: 14, yaw: Math.atan2(-c.position.x, -c.position.z) + 0.62 });
  fire.light(); setTodTarget(0.8);
  // everyone on the cushions round the north side of the fire, facing it (and the camera); you on the south side.
  // Clover sits next to Lumi, which matters later.
  const order = ['Juniper', 'Biscuit', 'Clover', 'Comet', 'Nyx', 'Moss', 'Thistle', 'Rowan', 'Lumi'];          // who speaks, in turn
  const seating = ['Juniper', 'Biscuit', 'Comet', 'Nyx', 'Moss', 'Thistle', 'Rowan', 'Clover', 'Lumi'];        // west to east
  const seatOf = Object.fromEntries(seating.map((n, i) => [n, ctx.seats[i]]));
  for (const n of order) { const c = byName[n], s = seatOf[n]; c.userData.state = 'fire';
    walkTo(c, [[s.x * 1.5, s.z * 1.5], [s.x, s.z]], [0, 0], () => sit(c, true)); }
  walkTo(player, [[0, PLAYER_SEAT]], [0, 0], () => sit(player, true));
  await wait(9);
  setCine({ target: new THREE.Vector3(0, 0.9, -0.4), dist: 8.2, pitch: 15 });
  await wait(2.5);
  talk.open(); focus(byName.Juniper);
  await talk.say('Juniper', 'she/they', "Alright, alright, everybody settle in. Organizer, the floor is yours.");
  if (flags.juniperWatches) { await talk.say('Juniper', 'she/they', "Oh, and first-timers get the comfy cushions. House rule.");
    byName.Rowan.emote('happy'); byName.Lumi.emote('happy'); focus(player); }
  focus(player);
  const welcome = await talk.choose(["Welcome home, everyone. This weekend is yours.",
    "Whoever you were when you got here, you're welcome exactly as you are.", "I'm bad at speeches. I love you all. Snacks are with the raccoon."]);
  await talk.say(me.name, me.pron, welcome.opt);
  campers.forEach(c => c.emote('happy'));
  if (welcome.opt.startsWith('Welcome')) await talk.say('Juniper', 'she/they', 'Hear, hear!');
  if (welcome.opt.startsWith('Whoever')) { byName.Lumi.setGlow(byName.Lumi.userData.st.glow + 0.2); await talk.say('Lumi', 'she/her', '...exactly as I am.'); }
  if (welcome.opt.startsWith("I'm bad")) await talk.say('Clover', 'she/they', 'THE RACCOON CONFIRMS.');
  await talk.say(me.name, me.pron, "Let's go round. Name, pronouns, and...");
  const q1 = await talk.choose(QUESTIONS.map((q, i) => ({ opt: q, i })));
  await talk.say(me.name, me.pron, `...${q1.opt} And...`);
  const q2 = await talk.choose(QUESTIONS.map((q, i) => ({ opt: q, i })).filter(o => o.i !== q1.i));
  await talk.say(me.name, me.pron, `...${q2.opt}`);
  for (const n of order) {
    const c = byName[n], { pron } = c.userData.cast;
    setCine(faceOf(c)); focus(c);
    c.emote(n === 'Rowan' || n === 'Lumi' ? 'shy' : 'wave');
    if (n === 'Lumi') c.setGlow(1);
    const intro = n === 'Moss' ? "I'm Moss. They/them. I left the hammock for this, so you know it's important."
      : n === 'Rowan' && flags.rowanTag ? "I'm Rowan. He/him. ...that's twelve times today."
      : `I'm ${n}. ${pron[0].toUpperCase() + pron.slice(1)}.`;
    await talk.say(n, pron, intro);
    await talk.say(n, pron, ANSWERS[n][q1.i]);
    await talk.say(n, pron, ANSWERS[n][q2.i]);
    if (n === 'Clover') {
      await talk.say('Clover', 'she/they', '...also. I should be honest with everyone.');
      await talk.say('Clover', 'she/they', "I'm a robosexual.");
      setCine({ ...faceOf(byName.Lumi), dist: 4.2 }); focus(byName.Lumi);
      byName.Lumi.setGlow(1); byName.Lumi.emote('shy');
      await talk.say('Lumi', 'she/her', '...oh.');
      setCine(faceOf(c)); focus(c); c.emote('shy');
      await talk.say('Clover', 'she/they', "Please don't look at me. Everyone is looking at me.");
      await talk.say('Comet', 'any pronouns', 'Iconic.');
      byName.Lumi.setGlow(0.7);
    }
    if (n === 'Biscuit' && flags.guitar) await talk.say('Biscuit', 'he/they', "And after this I'm playing the song. All four of it.");
    if (n === 'Biscuit' && flags.biscuitHelps) await talk.say('Biscuit', 'he/they', "Also I helped welcome everyone. I was SO gentle. Ask anyone.");
    if (n === 'Nyx' && flags.tarotNight) await talk.say('Nyx', 'she/they', 'Readings after this. Line forms behind the hedgehog.');
    if (n === 'Lumi') { await talk.say('Lumi', 'she/her', "I'm really glad I came in."); c.emote('happy'); }
  }
  if (me.named) {                                                    // and you go round too, if you told us who you are
    setCine(faceOf(player)); focus(player); player.emote('wave');
    const p = me.pron ? ` ${me.pron[0].toUpperCase() + me.pron.slice(1)}.` : '';
    await talk.say(me.name, me.pron, `I'm ${me.name}.${p} And I'm so glad every one of you is here.`);
    campers.forEach(c => c.emote('happy'));
  }
  setCine({ target: new THREE.Vector3(0, 0.9, -0.4), dist: 8.2, pitch: 15 }); focus(byName.Juniper);
  await talk.say('Juniper', 'she/they', 'Welcome to camp, everybody.');
  campers.forEach(c => c.emote('happy')); player.emote('happy');
  // s'mores, now the fire's going (seen from above: a ring of sticks), and what you set in motion earlier comes round again
  ctx.smores?.([...campers, player].filter(c => !(flags.guitar && c === byName.Biscuit)));
  setCine({ target: new THREE.Vector3(0, 0.35, -0.9), dist: 5.4, pitch: 46 });
  setTodTarget(1);
  if (flags.cloverSnacks) { focus(byName.Clover); await talk.say('Clover', 'she/they', "Snack table's officially open! I brought graham crackers. I brought, um. A lot of graham crackers."); }
  if (flags.charades) { focus(byName.Comet); await talk.say('Comet', 'any pronouns', 'Is it charades time? It feels like charades time.');
    focus(byName.Juniper); await talk.say('Juniper', 'she/they', "After s'mores, Comet."); }
  if (flags.guitar) { focus(byName.Biscuit); ctx.play?.('Biscuit', true); await talk.say('Biscuit', 'he/they', "Okay. The song. It's the good one."); }
  talk.close(); focus(null);
  ctx.hearts?.(byName.Clover, byName.Lumi);                                        // and something between those two
  await wait(6.5);
  // a photo before the night takes over: two rows, a flash, a polaroid to keep
  talk.open(); focus(byName.Juniper);
  await talk.say('Juniper', 'she/they', 'Wait, wait. Photo! Everybody squish in.');
  talk.close(); focus(null);
  await ctx.photo?.();
  focus(byName.Comet); talk.open(); await talk.say('Comet', 'any pronouns', 'Was my ear in it? My ear was in it.'); talk.close(); focus(null);
  setCine({ target: new THREE.Vector3(0, 7, -16), dist: 11, pitch: -6 });       // up to the sky: stars, and the aurora
  await wait(1.3); ctx.shootingStar?.();                                           // and one shooting star, on cue
  await wait(2.4);
  await title();
  setCine(null);
}
