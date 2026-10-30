// Barks: once you've had a proper chat with someone, walking up to them again gets a short line over their head (and a
// little babble), so wandering round camp keeps finding people being themselves. After the circle, at night, the lines
// turn to goodnights. Screen-space, so they're readable on a phone however far back the camera sits.
import * as THREE from 'three';

const LINES = {   // [day, night]
  Juniper: [["Saved you a good log, organizer.", "Twelve summers, and it still gets me.", "Ghost story at midnight. Bring a blanket."],
            ["Night, organizer. Good work today.", "Hear that? Crickets. That's the camp sound."]],
  Biscuit: [["I'm writing verse two!", "Want to hear the song? It's the good one.", "Best. Campsite. Ever."],
            ["Is it too late for one more song?", "I'm so full of s'mores."]],
  Clover:  [["Pickle?", "The frog cake is safe. For now.", "I've had four cookies. Don't count."],
            ["Is Lumi glowing more? She's glowing more.", "Midnight snack? Midnight snack."]],
  Comet:   [["Frisbee? Frisbee. Frisbee!", "I'm winning. At what? Yes.", "Charades later. I'm warming up."],
            ["Okay, okay. Charades tomorrow.", "I'm not crying, you're crying."]],
  Nyx:     [["The cards say you're doing great.", "Pull one later? I'll go easy on you.", "The Star again. Twice today."],
            ["Midnight walk to the stream. You in?", "The cards are resting. So should you."]],
  Moss:    [["...zzz. Oh. Hi.", "The hammock and I are very happy.", "Ten out of ten. No notes."],
            ["zzz", "Goodnight. ...zzz."]],
  Thistle: [["I'm drawing you. Hold still. ...kidding.", "Your lights are in my sketchbook now.", "Pink, blue, white. I counted them all."],
            ["The lights are even better at night.", "I drew everyone at the fire. Want to see?"]],
  Rowan:   [["Rowan. It still feels good to say.", "Thirteen times now. Still counting.", "I learned everyone's pronouns. I've got them."],
            ["Night. ...Rowan says goodnight.", "Best day. Best name."]],
  Lumi:    [["I'm humming. The good kind.", "My lights match my scarf. I checked.", "I'm glad I came in."],
            ["I'm staying up to watch the stars.", "Goodnight, organizer. I'm glad I came."]],
};

// day two, at the stream (walk up to anyone once they're settled in, or out, of the water)
const SWIM = {
  Juniper: ["Lifeguard on duty. Mostly vibes duty.", "No running on the rocks! ...Fine. Gentle jogging."],
  Biscuit: ["I'm a dog. This is my moment.", "Round and round! I'm a boat!"],
  Clover:  ["Don't tip me. There are snacks in here.", "I'm floating near Lumi. For no reason. Tube reasons."],
  Comet:   ["Splash me. I dare you.", "That cannonball was a ten. I'm the judge."],
  Nyx:     ["The water's cold. The cards said it would be.", "My feet are in. That counts."],
  Moss:    ["This is where I live now.", "The orange stays on. It's load-bearing."],
  Thistle: ["Drawing the splashes. They won't hold still.", "Biscuit's done forty laps. I'm counting."],
  Rowan:   ["It's cold! It's good. It's cold.", "Up to my knees. Big day."],
  Lumi:    ["I'm water-resistant. Not waterproof. It's a whole thing.", "Clover keeps floating past. I don't mind."],
};

export function createBarks(campers) {
  const layer = document.createElement('div'); layer.className = 'barks'; document.body.appendChild(layer);
  const B = new Map(campers.map(c => { const el = document.createElement('div'); el.className = 'bark'; layer.appendChild(el);
    return [c, { el, until: 0, next: 0, i: Math.floor(Math.random() * 3), near: false }]; }));
  const v = new THREE.Vector3();
  // one at a time (Jerika, Day 246: round the fire after the circle they all spoke at once and the bubbles covered each
  // other). Walking up to someone arms them; whoever's nearest of the armed goes first, and the rest wait their turn.
  let busyUntil = 0;
  let now = 0;
  const show = (c, text) => { for (const [k, o] of B) if (k !== c && o.until) { o.until = 0; o.el.classList.remove('on'); }     // still one at a time
    const b = B.get(c); b.el.textContent = text; b.armed = false; b.until = now + 3.2; b.next = now + 9; busyUntil = now + 3.6; b.el.classList.add('on'); };
  function update(t, { player, camera, quiet, night, audio, swim }) {
    now = t;
    let pick = null, pickD = Infinity;
    for (const [c, b] of B) {
      const name = c.userData.cast.name, lines = swim ? SWIM[name] : LINES[name], st = c.userData.state;
      const canTalk = !quiet && c.visible && (swim ? st === 'swim' : night ? st === 'fire' : st === 'friends') && lines;
      const d = c.position.distanceTo(player.position), near = canTalk && d < 2.3;
      if (near && !b.near && t > b.next) b.armed = true;     // just walked up
      if (!near) b.armed = false;
      b.near = near;
      if (b.armed && d < pickD) { pick = c; pickD = d; }
      if (b.until && (t > b.until || quiet)) { b.until = 0; b.el.classList.remove('on'); }
    }
    if (pick && t > busyUntil) {
      const b = B.get(pick), name = pick.userData.cast.name, set = swim ? SWIM[name] : LINES[name][night ? 1 : 0];
      show(pick, set[b.i++ % set.length]);
      if (audio) { audio.voice(name, true); setTimeout(() => audio.voice(name, false), 650); }
    }
    for (const [c, b] of B) if (b.until) {
      v.copy(c.position); v.y += c.userData.cast.name === 'Lumi' ? 1.5 : 1.25; v.project(camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1;
      b.el.style.visibility = off ? 'hidden' : 'visible';
      // kept whole on screen: a speaker near the edge used to push half the bubble off it (the dance, on a phone, Day 248)
      const hw = (b.el.offsetWidth || 170) / 2 + 6, hh = (b.el.offsetHeight || 40) + 8;
      const px = Math.min(innerWidth - hw, Math.max(hw, (v.x * 0.5 + 0.5) * innerWidth)), py = Math.max(hh, (-v.y * 0.5 + 0.5) * innerHeight);
      b.el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
  update.say = (c, text) => show(c, text);       // a line on cue (Comet's cannonball, the splash fight), taking the turn
  return update;
}
