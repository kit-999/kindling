// Day three: the hike up to the lookout, where everyone shouts their name off the hill and the hill shouts it back
// (Rowan's goes last before yours). This module holds the lookout's props and the scene at the top; main.js runs the
// walk up (you lead, everyone follows in a line) and what comes after.
import * as THREE from 'three';
import { heightAt, LOOKOUT, HIKE, REST_AT } from './world.js';
import { withFill } from './plush.js';

const mat = (color, o = {}) => withFill(new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o }));
// the view: from the top of the hill back down over the camp (the clearing is to the south-east)
const VIEW = Math.atan2(0 - LOOKOUT[0], 0 - LOOKOUT[1]);                 // the direction from the lookout to camp
const dir = new THREE.Vector3(Math.sin(VIEW), 0, Math.cos(VIEW)), across = new THREE.Vector3(Math.cos(VIEW), 0, -Math.sin(VIEW));
const spot = (f, s) => [LOOKOUT[0] + dir.x * f + across.x * s, LOOKOUT[1] + dir.z * f + across.z * s];
// where everyone stands at the railing, looking out (you in the middle)
export const RAIL = { Thistle: spot(-0.2, -3.2), Moss: spot(0.1, -2.5), Clover: spot(0.35, -1.75), Comet: spot(0.55, -1.0), you: spot(0.62, -0.2),
  Rowan: spot(0.6, 0.6), Biscuit: spot(0.45, 1.35), Lumi: spot(0.2, 2.1), Nyx: spot(-0.15, 2.8), Juniper: spot(-0.75, 0.2) };
export const LOOK_YAW = VIEW;

export function buildLookout(scene) {
  const g = new THREE.Group(), wood = mat(0x8a5d3b), dark = mat(0x5a3c28);
  // a railing in an arc along the edge facing camp
  const posts = [];
  for (let i = 0; i <= 8; i++) { const s = -3.6 + i * 0.9, f = 1.25 - Math.pow(s / 3.6, 2) * 0.55, [x, z] = spot(f, s);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 7), dark); p.position.set(x, heightAt(x, z) + 0.45, z); p.castShadow = true; g.add(p); posts.push(p.position.clone()); }
  for (const hgt of [0.55, 0.92]) for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i].clone().setY(posts[i].y - 0.45 + hgt), b = posts[i + 1].clone().setY(posts[i + 1].y - 0.45 + hgt), mid = a.clone().lerp(b, 0.5);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, a.distanceTo(b) + 0.04), wood); rail.position.copy(mid); rail.lookAt(b); rail.castShadow = true; g.add(rail); }
  // a bench, set back from the edge
  { const [x, z] = spot(-1.6, -1.2), y = heightAt(x, z), b = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.42), wood); seat.position.y = 0.42; b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.06), wood); back.position.set(0, 0.68, -0.2); back.rotation.x = -0.12; b.add(back);
    for (const sx of [-0.62, 0.62]) for (const sz of [-0.15, 0.15]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), dark); l.position.set(sx, 0.21, sz); b.add(l); }
    b.traverse(o => { if (o.isMesh) o.castShadow = true; }); b.position.set(x, y, z); b.rotation.y = VIEW; g.add(b); }
  // the sign: "the lookout"
  { const c = document.createElement('canvas'); c.width = 512; c.height = 192; const k = c.getContext('2d');
    k.fillStyle = '#7a5236'; k.fillRect(0, 0, 512, 192); k.strokeStyle = '#4a3424'; k.lineWidth = 10; k.strokeRect(5, 5, 502, 182);
    k.fillStyle = '#fbf0dc'; k.textAlign = 'center'; k.font = '64px "Marker Felt", "Comic Sans MS", ui-rounded, sans-serif'; k.fillText('the lookout ✨', 256, 96);
    k.font = '34px "Marker Felt", "Comic Sans MS", ui-rounded, sans-serif'; k.fillStyle = '#f0d8b0'; k.fillText('shout your name. the hill shouts back.', 256, 150);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const [x, z] = spot(-0.9, -3.4), y = heightAt(x, z), s = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.05), [wood, wood, wood, wood, mat(0xffffff, { map: tex }), wood]); board.position.y = 1.0; s.add(board);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 7), dark); post.position.y = 0.5; s.add(post);
    s.position.set(x, y, z); s.rotation.y = VIEW + Math.PI + 0.5; s.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(s); }
  scene.add(g);
  return { group: g, top: new THREE.Vector3(LOOKOUT[0], heightAt(...LOOKOUT), LOOKOUT[1]) };
}

// halfway up: a flat rock beside the trail and a sign, where everyone stops for water and looks back down at camp
export function buildRest(scene) {
  const [x, z] = HIKE[REST_AT], toCamp = new THREE.Vector3(-x, 0, -z).normalize(), side = new THREE.Vector3(toCamp.z, 0, -toCamp.x);
  const g = new THREE.Group(), stone = mat(0x8f8b84, { flatShading: true }), wood = mat(0x8a5d3b), dark = mat(0x5a3c28);
  const rx = x + side.x * 2.75 + toCamp.x * 0.7, rz = z + side.z * 2.75 + toCamp.z * 0.7, ry = heightAt(rx, rz);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), stone); rock.scale.set(1.5, 0.55, 1.15); rock.position.set(rx, ry + 0.1, rz); rock.rotation.y = 0.7;
  rock.castShadow = rock.receiveShadow = true; g.add(rock);
  // a little sign on the other side of the trail: you're halfway
  { const c = document.createElement('canvas'); c.width = 384; c.height = 160; const k = c.getContext('2d');
    k.fillStyle = '#7a5236'; k.fillRect(0, 0, 384, 160); k.strokeStyle = '#4a3424'; k.lineWidth = 9; k.strokeRect(5, 5, 374, 150);
    k.fillStyle = '#fbf0dc'; k.textAlign = 'center'; k.font = '58px "Marker Felt", "Comic Sans MS", ui-rounded, sans-serif'; k.fillText('halfway! ✨', 192, 78);
    k.font = '30px "Marker Felt", "Comic Sans MS", ui-rounded, sans-serif'; k.fillStyle = '#f0d8b0'; k.fillText('the lookout is up and over', 192, 124);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sx = x - side.x * 2.35, sz = z - side.z * 2.35, s = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.33, 0.04), [wood, wood, wood, wood, mat(0xffffff, { map: tex }), wood]); board.position.y = 0.9; s.add(board);
    for (const px of [-0.33, 0.33]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.0, 7), dark); post.position.set(px, 0.5, -0.04); s.add(post); }
    const [px, pz] = HIKE[REST_AT - 1];
    s.position.set(sx, heightAt(sx, sz), sz); s.rotation.y = Math.atan2(px - sx, pz - sz); s.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(s); }
  scene.add(g);
  return { group: g, at: new THREE.Vector3(x, heightAt(x, z), z), rock: new THREE.Vector3(rx, ry + 0.33, rz), toCamp, side };
}
// the rest itself. ctx: byName, player, me, talk, wait, setCine, focus, rest (from buildRest)
export async function runRest(ctx) {
  const { byName, me, talk, wait, setCine, focus, rest } = ctx;
  const say = (n, line) => talk.say(n, n === me.name ? me.pron : byName[n]?.userData.cast.pron ?? '', line);
  // up the slope, looking back down at everyone, with camp small behind them
  // (a tall screen sees a narrow slice, so it stands further back to fit all nine and the rock)
  const tall = innerHeight > innerWidth;
  setCine({ target: rest.at.clone().add(new THREE.Vector3(0, 0.7, 0)).addScaledVector(rest.toCamp, 1.4).addScaledVector(rest.side, tall ? 0.75 : 0), dist: tall ? 10.5 : 6.0, pitch: tall ? 18 : 21, yaw: Math.atan2(-rest.toCamp.x, -rest.toCamp.z), cut: true });
  await wait(0.6); talk.open();
  focus(byName.Juniper); await say('Juniper', 'Water break! We are officially halfway.');
  focus(byName.Comet); await say('Comet', 'HALFWAY? I have been hiking for YEARS.');
  focus(byName.Moss); await say('Moss', '...I live on this rock now. Tell the hammock I said goodbye.');
  focus(byName.Biscuit); byName.Biscuit.emote('wave'); await say('Biscuit', 'Look how small camp is from up here! HI, CAMP! HI, STAGE!');
  focus(byName.Lumi); await say('Lumi', "...I can see my tent. It's so tiny. I'm so far up.");
  focus(byName.Juniper); await say('Juniper', 'Onward, campers. Up and over. The view at the top is worth it.');
  talk.close(); focus(null);
}

// at the top. ctx: byName, player, me, talk, wait, setCine, focus, audio, campers
export async function runLookout(ctx) {
  const { byName, player, me, talk, wait, setCine, focus, audio } = ctx;
  const say = (n, line) => talk.say(n, n === me.name ? me.pron : byName[n]?.userData.cast.pron ?? '', line);
  const hill = line => talk.say('the hill', '', line);
  const top = new THREE.Vector3(LOOKOUT[0], heightAt(...LOOKOUT), LOOKOUT[1]);
  // the view first: over everyone's shoulders, down to the camp, the stage and the stream
  setCine({ target: top.clone().addScaledVector(dir, 13).add(new THREE.Vector3(0, -3.2, 0)), dist: 16.5, pitch: 19, yaw: VIEW + Math.PI - 0.12, cut: true });
  await wait(1.3); await ctx.grab?.(); await wait(1.3);          // Thistle draws this later
  const face = c => ({ target: c.position.clone().add(new THREE.Vector3(0, 0.7, 0)), dist: 2.3, pitch: 8, yaw: VIEW - 0.5, cut: true });
  const wideRail = { target: top.clone().addScaledVector(dir, 0.4).add(new THREE.Vector3(0, 0.9, 0)), dist: 6.0, pitch: 10, yaw: VIEW - 0.3, cut: true };
  setCine(wideRail); focus(byName.Juniper); talk.open();
  await say('Juniper', 'The lookout. Tradition: shout your name off the edge, and the hill shouts it back.');
  const shout = async (n, line, echo, after) => { const c = n === me.name ? player : byName[n];
    setCine(face(c)); focus(c); c.emote('wave'); audio.voice?.(n, true); setTimeout(() => audio.voice?.(n, false), 600);
    await say(n, line); if (echo !== '...') audio.echo?.(n); await hill(echo); if (after) await after(c); };   // '...': too quiet to come back
  // every shout gets the hill's echo, the second ones too (Day 246, Jerika: "the echo when comet said their name was a
  // cute sound effect but it didn't repeat when they did it again. the ribbit didn't echo")
  await shout('Comet', 'COMET!', '...COMET! ...omet! ...met...', async () => { await say('Comet', "It's copying me. I love it. I'm going again. COMET!"); audio.echo?.('Comet'); await hill('...COMET! ...omet...'); });
  await shout('Biscuit', 'BISCUIT!', '...BISCUIT! ...iscuit! ...scuit...', async () => { await say('Biscuit', 'It called me a good boy. I heard it. Everybody heard it.'); });
  await shout('Moss', '...moss.', '...', async () => { await say('Moss', 'Even the hill is sleepy. Respect.'); });
  await shout('Clover', 'CLOVER! AND CRUMB!', '...AND CRUMB! ...crumb...', async () => { audio.ribbit?.(); await say('Crumb', 'ribbit.'); audio.sfx?.('ribbitEcho'); await hill('...ibbit. ...ibbit.'); });
  await shout('Nyx', 'NYX AND THISTLE!', '...THISTLE! ...istle! ...stle...', async () => { await say('Thistle', 'It kept my half. I will allow it.'); });
  await shout('Rowan', '...ROWAN!', '...ROWAN! ...Rowan! ...owan... ...wan...', async c => {
    c.emote('happy'); await wait(0.4);
    await say('Rowan', 'It said it back. The whole hill knows my name now.');
    for (const k of ctx.campers) if (k !== c) k.emote('happy'); player.emote('happy'); });
  // Lumi, who asked "did lumi echo?" for her (Jerika, Day 246): too quiet the first time, then not
  await shout('Lumi', '...lumi.', '...', async c => {
    await say('Lumi', "...it didn't hear me."); c.setGlow?.(1); c.emote('wave'); audio.voice?.('Lumi', true); setTimeout(() => audio.voice?.('Lumi', false), 600);
    await say('Lumi', 'LUMI!'); audio.echo?.('Lumi'); await hill('...LUMI! ...umi! ...mi...');
    c.emote('happy'); for (const k of ctx.campers) if (k !== c) k.emote('happy'); player.emote('happy');
    await say('Lumi', "It heard me. I'm a loud one now. Apparently."); });
  setCine(face(player)); focus(player);
  const pick = await talk.choose([me.named ? `Shout "${me.name.toUpperCase()}!"` : 'Shout "WE\'RE AT CAMP!"', 'Shout "I LOVE YOU ALL!"', 'Shout "BEST WEEKEND EVER!"']);
  const line = pick.opt.replace(/^Shout "|"$/g, ''), last = line.replace(/[!.]/g, '').split(' ').pop();
  player.emote('wave'); await say(me.name, line); audio.echo?.(me.name);
  await hill(`...${line} ...${last.toLowerCase()}! ...${last.toLowerCase().slice(Math.ceil(last.length / 3))}...`);
  setCine(wideRail); focus(byName.Juniper);
  await say('Juniper', 'Twelve summers, and it still gets me.');
  await say('Thistle', "Hold still, everybody. I'm drawing the view. You're all in it.");
  const art = ctx.drawing?.();
  // on a tall screen the drawing fills the top, so aim above Thistle's head and their face sits below it
  const held = c => innerHeight > innerWidth ? { ...face(c), target: face(c).target.add(new THREE.Vector3(0, 0.45, 0)), dist: 2.6 } : face(c);
  if (art) { setCine(held(byName.Thistle)); focus(byName.Thistle); await wait(1.2);
    ctx.sketch?.show(art, 'the view from the lookout ✨');
    await say('Thistle', "Done. Don't look at the paws. Paws are hard."); setCine(wideRail); focus(byName.Juniper); }
  await say('Juniper', "Okay, back down, campers. S'mores tonight. And then we dance.");
  ctx.sketch?.hide(); talk.close(); focus(null);
}
