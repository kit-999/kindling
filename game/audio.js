// Sound, all made here (no recordings): a breeze and the odd bird while the sun's up, crickets from dusk, the fire's
// crackle once it's lit, Biscuit's guitar when you're near him, a wooden "tok" when you set something up, and each
// camper's own soft babble while they talk. Browsers only allow sound after a tap, so it wakes on the first one; the
// speaker button mutes it, and remembers. I can't hear any of this: the levels are measured (test/camp-audio.cjs),
// and Jerika is the ears.
const VOICES = {   // babble: waveform, base pitch (Hz), syllable length (s), gap (s)
  Juniper: ['triangle', 300, 0.06, 0.03], Biscuit: ['triangle', 520, 0.045, 0.02], Clover: ['triangle', 470, 0.05, 0.02],
  Comet: ['triangle', 430, 0.04, 0.015], Nyx: ['sine', 290, 0.07, 0.035], Moss: ['sine', 190, 0.09, 0.05],
  Thistle: ['sine', 410, 0.06, 0.03], Rowan: ['sine', 370, 0.06, 0.035], Lumi: ['sine', 620, 0.07, 0.03],
};
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const LOUD = 2.2;   // master level: measured too quiet at 0.9 (daytime about -46 dB); the compressor after it keeps peaks safe
const CHORDS = [[55, 59, 62, 67], [52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 66]];   // G, Em, C, D (MIDI)

export function createAudio() {
  let ctx = null, out = null, muted = false, noise = null, plucks = new Map(), meter = null;
  try { muted = localStorage.getItem('kindling-muted') === '1'; } catch { /* private mode: not remembered */ }
  const btn = document.getElementById('mute');
  const SPK = '<path d="M4 9.2h3.6L12.5 5v14l-4.9-4.2H4z" fill="currentColor"/>';
  const ON = SPK + '<path d="M15.6 8.8a4.6 4.6 0 0 1 0 6.4M18.2 6.2a8.3 8.3 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>';
  const OFF = SPK + '<path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>';
  const label = () => { if (!btn) return; btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${muted ? OFF : ON}</svg>`;
    btn.setAttribute('aria-label', muted ? 'sound off' : 'sound on'); };
  label();

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 55; hp.connect(comp);   // nothing a phone speaker can't play
    out = ctx.createGain(); out.gain.value = muted ? 0 : LOUD; out.connect(hp);
    meter = ctx.createAnalyser(); meter.fftSize = 2048; comp.connect(meter);                   // for the tests: how loud, what pitch
    const hush = ctx.createGain(); hush.gain.value = 0; meter.connect(hush).connect(ctx.destination);   // so every engine keeps it running
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
    buildBeds();
  }
  if (btn) btn.addEventListener('click', e => { e.stopPropagation(); start(); muted = !muted; label();
    try { localStorage.setItem('kindling-muted', muted ? '1' : '0'); } catch { /* fine */ }
    if (out) out.gain.setTargetAtTime(muted ? 0 : LOUD, ctx.currentTime, 0.05); });
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, start, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });

  // ---- the beds: breeze (day), the fire's low roar; their levels follow the evening ----
  let breeze, roar;
  function bed(filterType, freq, q) {
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(out); src.start(); return g;
  }
  function buildBeds() { breeze = bed('bandpass', 480, 0.5); roar = bed('lowpass', 240, 0.7); }

  // ---- one-shots ----
  const pan = p => { const s = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (s) s.pan.value = p; return s; };
  function tone(type, f0, f1, at, dur, vol, p = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(), s = pan(p);
    o.type = type; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); (s ? g.connect(s).connect(out) : g.connect(out)); o.start(at); o.stop(at + dur + 0.02);
  }
  // a breath: noise through a band that slides from f0 to f1, swelling then fading (for Moss's snore)
  function breath(at, dur, f0, f1, vol) {
    const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 1.8; f.frequency.setValueAtTime(f0, at); f.frequency.linearRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(out); src.start(at, Math.random() * 0.8, dur + 0.05);
  }
  function crack(at, vol) {
    const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1600 + Math.random() * 3200; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.002);          // a click, not a thump
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.022 + Math.random() * 0.03);
    src.connect(f).connect(g).connect(out); src.start(at, Math.random() * 1.5, 0.08);
  }
  function pluck(midi) {                                   // Karplus-Strong, made once per note
    if (plucks.has(midi)) return plucks.get(midi);
    const sr = ctx.sampleRate, n = Math.round(sr / NOTE(midi)), len = Math.round(sr * 2.2), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    let mean = 0; for (let i = 0; i < n; i++) { d[i] = Math.random() * 2 - 1; mean += d[i] / n; }
    for (let i = 0; i < n; i++) d[i] -= mean;          // no DC: the string's averaging keeps it while the note dies, and it read as 0 Hz
    for (let i = n; i < len; i++) d[i] = 0.4985 * (d[i - n] + d[i - n + 1]);           // average two neighbours: the string's damping
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i])); for (let i = 0; i < len; i++) d[i] /= peak || 1;
    plucks.set(midi, b); return b;
  }
  function strum(chord, at, vol, down = true) {
    const notes = down ? chord : [...chord].reverse();
    notes.forEach((m, i) => { const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = pluck(m); f.type = 'lowpass'; f.frequency.value = 2600; g.gain.value = vol * (i === 0 && down ? 1 : 0.8);
      src.connect(f).connect(g).connect(out); src.start(at + i * 0.016); src.stop(at + i * 0.016 + 2.2); });
  }

  // ---- songs: a melody sung (a soft little voice with vibrato and a scoop into each note) over a strummed guitar, scored
  // here as [midi, beats] (0 = a rest) with a chord per bar; each plays into its own gain, so stop() fades it out ----
  const SONGS = {
    // Biscuit's song, verse two, for the talent show (Jerika: "maybe a different song than the one they always play"):
    // D major, the camp guitar's G Em C D left alone
    biscuit: { bpm: 96, beats: 4, voice: [520, 'triangle'], loops: 2,
      chords: [[50, 57, 62, 66], [45, 52, 57, 61, 64], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [50, 57, 62, 66], [45, 52, 57, 61, 64], [43, 50, 55, 59, 62, 45, 52, 57, 61, 64], [50, 57, 62, 66]],
      tune: [[78, 1], [78, .5], [76, .5], [74, 1], [74, 1], [76, .5], [76, .5], [78, .5], [76, .5], [73, 2], [74, 1], [78, 1], [83, 1.5], [81, .5],
        [79, 1], [78, .5], [76, .5], [74, 2], [78, .5], [81, .5], [81, 1], [78, .5], [76, .5], [74, 1], [76, 1], [73, 1], [76, 1], [81, 1],
        [83, 1], [81, 1], [79, 1], [76, 1], [74, 3], [0, 1]] },
    // the song you lead (Jerika: "a little tonal song would be super cute"): a waltz everyone sings, a third apart
    camp: { bpm: 84, beats: 3, voice: [0, 'sine'], loops: 1, harmony: true, claps: true,
      chords: [[53, 57, 60, 65], [53, 57, 60, 65], [46, 53, 58, 62], [53, 57, 60, 65], [50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [53, 57, 60, 65]],
      tune: [[69, 1], [72, 1], [77, 1], [76, 2], [74, 1], [74, 1], [70, 1], [74, 1], [72, 3], [69, 1], [74, 1], [77, 1], [79, 2], [77, 1], [76, 1], [74, 1], [72, 1], [77, 3]] },
  };
  const THIRD = { 69: 65, 72: 69, 77: 74, 76: 72, 74: 70, 70: 67, 79: 76, 81: 77 };   // F major, a third below
  function sing(dest, midi, at, dur, vol, type = 'triangle', p = 0) {
    const f = NOTE(midi), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), s = pan(p);
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    o.type = type; o2.type = 'sine';
    o.frequency.setValueAtTime(f * 0.97, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.06);          // the scoop into the note
    o2.frequency.setValueAtTime(f * 2 * 0.97, at); o2.frequency.exponentialRampToValueAtTime(f * 2, at + 0.06);
    lfo.frequency.value = 5.4; depth.gain.setValueAtTime(0, at); depth.gain.linearRampToValueAtTime(f * 0.006, at + Math.min(0.3, dur * 0.6));
    lfo.connect(depth); depth.connect(o.frequency); depth.connect(o2.frequency);
    const end = at + dur * 0.92;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.04); g.gain.setValueAtTime(vol * 0.85, Math.max(at + 0.05, end - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, end); g2.gain.value = 0.18;
    o.connect(g); o2.connect(g2).connect(g); (s ? g.connect(s).connect(dest) : g.connect(dest));
    for (const x of [o, o2, lfo]) { x.start(at); x.stop(end + 0.05); }
  }
  function strumTo(dest, chord, at, vol, down = true) {
    const notes = down ? chord : [...chord].reverse();
    notes.forEach((m, i) => { const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = pluck(m); f.type = 'lowpass'; f.frequency.value = 2600; g.gain.value = vol * (i === 0 && down ? 1 : 0.8);
      src.connect(f).connect(g).connect(dest); src.start(at + i * 0.016); src.stop(at + i * 0.016 + 2.2); });
  }
  function clapAt(dest, at, vol) { for (let i = 0; i < 6; i++) { const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), d = at + Math.random() * 0.03;
    f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 1400; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(vol, d + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.05);
    src.buffer = noise; src.connect(f).connect(g).connect(dest); src.start(d, Math.random() * 1.5, 0.08); } }
  function song(name) {
    const S = SONGS[name]; if (!ctx || !S) return () => {};
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(out);
    const spb = 60 / S.bpm, t0 = ctx.currentTime + 0.15, bar = S.beats * spb, loopLen = S.chords.length * bar;
    for (let L = 0; L < S.loops; L++) { const base = t0 + L * loopLen;
      // the guitar: the chord on every beat, a down-strum on the one and up-strums between (on a seven-note bar, two chords)
      S.chords.forEach((ch, b) => { const two = ch.length > 6, A = two ? ch.slice(0, ch.length / 2) : ch, B = two ? ch.slice(ch.length / 2) : ch;
        for (let k = 0; k < S.beats; k++) { const c = k < S.beats / 2 ? A : B, at = base + b * bar + k * spb;
          strumTo(bus, c, at, k === 0 ? 0.075 : 0.05, true); if (S.beats === 4 && (k === 1 || k === 2)) strumTo(bus, c, at + spb / 2, 0.035, false);
          if (S.claps && k > 0) clapAt(bus, at, 0.05);
          if (S.claps && k === 0) sing(bus, c[0], at, bar * 0.95, 0.03, 'sine'); } });                // everyone humming the root (an octave
                                                                                                    // lower was 87 Hz: under a phone speaker)
      // the voice (or voices: the camp song is everybody, the tune doubled a hair apart, and a third below)
      let at = base; for (const [m, beats] of S.tune) { const dur = beats * spb;
        if (m) { if (S.voice[0]) sing(bus, m, at, dur, 0.07, S.voice[1]);
          else { sing(bus, m, at, dur, 0.05, 'triangle', -0.25); sing(bus, m + 0.06, at + 0.012, dur, 0.04, 'sine', 0.25);
            if (S.harmony && THIRD[m]) sing(bus, THIRD[m], at + 0.006, dur, 0.035, 'sine', 0.05); } }
        at += dur; } }
    let done = false;
    return () => { if (done) return; done = true; const n = ctx.currentTime; bus.gain.setTargetAtTime(0, n, 0.25); setTimeout(() => bus.disconnect(), 2500); };
  }
  function hiss(at, dur, f0, f1, vol, type = 'bandpass', q = 1.5) {        // filtered noise, swept: whooshes, cymbals, pages
    const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.02, dur / 5)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(out); src.start(at, Math.random() * 1.2, dur + 0.05);
  }
  function bell(midi, at, vol, p = 0, decay = 1.1) { const f = NOTE(midi);
    for (const [k, v] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) { const o = ctx.createOscillator(), g = ctx.createGain(), s = pan(p);
      o.type = 'sine'; o.frequency.value = f * k; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol * v, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay / k ** 0.3); o.connect(g); (s ? g.connect(s).connect(out) : g.connect(out)); o.start(at); o.stop(at + decay + 0.1); } }
  // the talent show's one-shots
  const SFX = {
    rimshot: at => { tone('sine', 210, 120, at, 0.16, 0.14); tone('sine', 160, 90, at + 0.17, 0.2, 0.15); hiss(at + 0.36, 1.1, 9000, 6000, 0.06, 'highpass', 0.7); crack(at + 0.36, 0.08); },
    whoosh: at => hiss(at, 0.75, 300, 1900, 0.22, 'bandpass', 2.2),                 // levels measured: at 0.09 it was under the breeze
    boing: at => { tone('sine', 200, 620, at, 0.2, 0.17); tone('triangle', 400, 1240, at, 0.12, 0.05); },
    card: at => { [84, 88, 91, 95, 100].forEach((m, i) => bell(m, at + i * 0.07, 0.03, (i - 2) * 0.3, 1.6)); tone('sine', NOTE(48), NOTE(48), at, 1.6, 0.04); },
    page: at => { hiss(at, 0.1, 2600, 1400, 0.16, 'bandpass', 0.8); hiss(at + 0.13, 0.12, 2200, 1200, 0.12, 'bandpass', 0.8); },
    // Lumi's light show: bells climbing two octaves of a pentatonic scale, left and right, then the shimmer holds
    shimmer: at => { [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96].forEach((m, i) => bell(m, at + i * 0.12, 0.035, i % 2 ? 0.5 : -0.5));
      for (let k = 0; k < 10; k++) bell([84, 88, 91, 96][k % 4], at + 1.5 + k * 0.22, 0.02, Math.sin(k) * 0.7, 0.9); },
    blue: at => { [60, 64, 67, 71, 74].forEach((m, i) => bell(m + 12, at + i * 0.05, 0.03, 0, 2.2)); },
    // RO-WAN, RO-WAN, RO-WAN: everyone clapping on the syllables
    ribbitEcho: at => { for (const [k, v] of [[0.5, 0.035], [0.95, 0.016]]) { tone('sawtooth', 320, 180, at + k, 0.11, v); tone('square', 160, 120, at + k, 0.1, v / 2);
      tone('sawtooth', 320, 180, at + k + 0.17, 0.11, v * 0.8); } },
    chant: at => { for (let k = 0; k < 3; k++) { clapAt(out, at + k * 0.9, 0.09); clapAt(out, at + k * 0.9 + 0.32, 0.09); } },
  };

  // ---- the clock: what's due in the next moment, scheduled a little ahead so it never stutters ----
  const due = { bird: 2, crack: 0, strum: 0, crickets: [0.3, 0.9, 1.6], step: 0, snore: 0 };
  let beat = 0, talking = null, sylAt = 0, dance = null, step = 0;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const CRICKETS = [[4300, 0.9, -0.6], [4700, 1.15, 0.5], [5100, 0.75, 0.1]];
  function update(dt, s) {                                 // s: { tod, fire (0..1), fireNear (0..1), guitar (0..1), guitarPan }
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime, ahead = now + 0.25, day = 1 - smooth(0.4, 0.62, s.tod), dusk = smooth(0.45, 0.72, s.tod);
    breeze.gain.setTargetAtTime(0.03 * (0.4 + 0.6 * day) * (0.7 + 0.3 * Math.sin(now * 0.31) * Math.sin(now * 0.13)), now, 0.4);
    roar.gain.setTargetAtTime(0.05 * s.fire * s.fireNear, now, 0.3);
    if (day > 0.2 && now > due.bird) { const p = Math.random() * 1.6 - 0.8, n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1200;
      for (let i = 0; i < n; i++) tone('sine', base, base * 1.25, now + 0.05 + i * 0.13, 0.08, 0.02 * day, p);
      due.bird = now + 3 + Math.random() * 7; }
    if (dusk > 0.05) CRICKETS.forEach(([f, per, p], k) => { while (due.crickets[k] < ahead) { const at = Math.max(due.crickets[k], now);
        for (let i = 0; i < 3; i++) tone('sine', f, f * 1.01, at + i * 0.05, 0.022, 0.022 * dusk, p);
        due.crickets[k] = at + per * (0.9 + Math.random() * 0.2); } });
    else due.crickets = due.crickets.map(() => now + 0.5);
    if (s.fire > 0.05) { while (due.crack < ahead) { const at = Math.max(due.crack, now); crack(at, 0.16 * s.fire * s.fireNear * (0.4 + Math.random() * 0.6));
        due.crack = at + 0.04 + Math.random() * 0.22; } }
    if (s.guitar > 0.02) { while (due.strum < ahead) { const at = Math.max(due.strum, now), chord = CHORDS[Math.floor(beat / 4) % 4];
        strum(chord, at, 0.06 * s.guitar, beat % 4 !== 2); beat++; due.strum = at + (beat % 4 === 3 ? 0.25 : 0.5); } }
    else due.strum = now;
    // Moss, asleep in the hammock: a slow snore when you're near (in, then out with a little whistle)
    if (s.snore > 0.02) { if (now > due.snore) { const at = now + 0.05, v = 0.06 * s.snore;
        breath(at, 0.95, 360, 620, v); breath(at + 1.1, 1.15, 320, 170, v * 0.85); tone('sine', 880, 690, at + 1.2, 0.5, v * 0.12);
        due.snore = at + 3.5 + Math.random() * 0.7; } }
    else due.snore = now + 0.8;
    // night three's dance party: four on the floor, claps, a bassline and the guitar over G Em C D; then a slow last song
    if (dance) { const spb = dance === 'fast' ? 60 / 116 / 4 : 60 / 72 / 2;
      while (due.step < ahead) { const at = Math.max(due.step, now), st = step % 16, bar = Math.floor(step / 16) % 4, chord = CHORDS[bar];
        if (dance === 'fast') {
          if (st % 4 === 0) tone('sine', 150, 62, at, 0.15, 0.2);              // the kick, pitched where a phone can play it
          if (st % 4 === 2) crack(at, 0.045);
          if (st === 4 || st === 12) { crack(at, 0.09); crack(at + 0.011, 0.07); crack(at + 0.023, 0.05); }
          if ([0, 3, 6, 8, 11, 14].includes(st)) { const f = mtof(chord[0] - 12); tone('triangle', f, f, at, 0.13, 0.09); }
          if (st === 0 || st === 8) strum(chord, at, 0.05, st === 0);
          if (st % 2 === 0) { const f = mtof(chord[(st / 2 + bar) % 4] + 12); tone('sine', f, f, at, 0.09, 0.02); }
        } else {
          if (st % 8 === 0) strum(chord, at, 0.07, true);
          if (st % 2 === 0) { const f = mtof(chord[(st / 2) % 4] + 12); tone('sine', f, f * 0.999, at, 0.45, 0.016); }
        }
        step++; due.step = at + spb; } }
    else due.step = now;
    if (talking && now > sylAt) { const [type, f, len, gap] = VOICES[talking] || ['triangle', 360, 0.055, 0.03];
      const j = Math.pow(2, (Math.floor(Math.random() * 7) - 3) / 12), at = Math.max(sylAt, now);
      tone(type, f * j, f * j * (talking === 'Lumi' ? 1.03 : 0.97), at, len, 0.035);
      sylAt = at + len + gap; }
  }
  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  return {
    update,
    voice(name, on) { talking = on ? name : (talking === name ? null : talking); },
    tok() { if (!ctx) return; const at = ctx.currentTime; tone('sine', 260, 170, at, 0.12, 0.08); tone('triangle', 820, 600, at, 0.04, 0.03); },
    splash() { if (!ctx) return; const at = ctx.currentTime; crack(at, 0.12); tone('sine', 900, 380, at, 0.09, 0.03); },
    // a cannonball: a whoosh of water (filtered noise falling in pitch), a low thump, then droplets landing for a second
    splashBig() { if (!ctx) return; const at = ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(3200, at); f.frequency.exponentialRampToValueAtTime(420, at + 0.7);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.42, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.85);
      src.connect(f).connect(g).connect(out); src.start(at, Math.random() * 0.6, 0.9);
      tone('sine', 220, 70, at, 0.22, 0.16);
      for (let i = 0; i < 7; i++) { const d = at + 0.3 + Math.random() * 0.8; crack(d, 0.05 + Math.random() * 0.04); tone('sine', 1500 - i * 110, 520, d, 0.07, 0.014); } },
    // the crowd: a few dozen claps, thick at first and thinning out
    applause() { if (!ctx) return; const at = ctx.currentTime;
      for (let i = 0; i < 48; i++) crack(at + 1.8 * Math.pow(Math.random(), 1.6), 0.035 + Math.random() * 0.05); },
    // a very small frog: two croaks
    ribbit() { if (!ctx) return; const at = ctx.currentTime;
      for (const k of [0, 0.17]) { tone('sawtooth', 320, 180, at + k, 0.11, 0.06); tone('square', 160, 120, at + k, 0.1, 0.03); } },
    // a rubber duck, squeezed: a squeak up, then down, with a little body under it (the duck in the stream, Day 248)
    quack() { if (!ctx) return; const at = ctx.currentTime; tone('square', 900, 1350, at, 0.07, 0.035);
      tone('square', 1350, 760, at + 0.06, 0.14, 0.03); tone('sine', 450, 380, at, 0.18, 0.03); },
    // the hill answering: three soft, falling calls, each half as loud
    echo() { if (!ctx) return; const at = ctx.currentTime;
      for (let k = 0; k < 3; k++) { const d = at + 0.45 + k * 0.42, v = 0.05 * Math.pow(0.5, k); tone('triangle', 560, 420, d, 0.22, v); tone('sine', 280, 210, d, 0.24, v * 0.8); } },
    dance(mode) { dance = mode || null; step = 0; },
    song(name) { return ctx ? song(name) : () => {}; },
    sfx(name) { if (ctx && SFX[name]) SFX[name](ctx.currentTime + 0.02); },
    shutter() { if (!ctx) return; const at = ctx.currentTime; tone('triangle', 1800, 900, at, 0.03, 0.05); tone('sine', 420, 300, at + 0.04, 0.06, 0.04); },
    chime() { if (!ctx) return; const at = ctx.currentTime + 0.05; strum(CHORDS[0], at, 0.12); strum(CHORDS[0].map(m => m + 12), at + 0.9, 0.06); },
    level() { if (!meter) return null; const a = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(a);
      let s = 0, p = 0; for (const v of a) { s += v * v; p = Math.max(p, Math.abs(v)); }
      const f = new Float32Array(meter.frequencyBinCount); meter.getFloatFrequencyData(f);
      let bi = 0; for (let i = 1; i < f.length; i++) if (f[i] > f[bi]) bi = i;
      return { rms: Math.sqrt(s / a.length), peak: p, loudestHz: Math.round(bi * ctx.sampleRate / meter.fftSize), state: ctx.state }; },
    get running() { return !!ctx && ctx.state === 'running'; },
  };
}
