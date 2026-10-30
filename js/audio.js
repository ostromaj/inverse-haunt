/* Synthesized sound effects — no audio files needed. */
(function (root) {
  'use strict';
  let ctx = null, master = null, droneGain = null, beatTimer = null, loudIn = null, loudOut = null;
  const A = { muted: false, gentle: false };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = A.muted ? 0 : 0.7; master.connect(ctx.destination);
    // scare bus: heavy drive into a fast limiter so jumpscares hit full volume without crackling
    loudIn = ctx.createGain(); loudIn.gain.value = 4;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -14; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.2;
    loudOut = ctx.createGain(); loudOut.gain.value = A.muted ? 0 : 1.6;
    loudIn.connect(lim); lim.connect(loudOut); loudOut.connect(ctx.destination);
  }
  A.init = init;
  A.setMuted = (m) => { A.muted = m; if (master) { master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05); loudOut.gain.setTargetAtTime(m ? 0 : 1.6, ctx.currentTime, 0.05); } };

  function tone(freq, dur, type, vol, when, slideTo, out) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, filterFreq, q, when, sweepTo, out) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(filterFreq || 1000, t); f.Q.value = q || 1;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out || master); src.start(t);
  }

  A.drone = (on) => {
    if (!ctx) return;
    if (on && !droneGain) {
      droneGain = ctx.createGain(); droneGain.gain.value = 0; droneGain.connect(master);
      [55, 55.7, 82.4].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
        const g = ctx.createGain(); g.gain.value = i === 2 ? 0.05 : 0.07;
        o.connect(lp); lp.connect(g); g.connect(droneGain); o.start();
      });
      droneGain.gain.setTargetAtTime(0.5, ctx.currentTime, 2);
    } else if (!on && droneGain) {
      const g = droneGain; droneGain = null; g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => g.disconnect(), 2000);
    }
  };
  // heartbeat speeds up as a monster closes in (0 = none, 1 = right next to you)
  A.heart = (level) => {
    clearTimeout(beatTimer);
    if (!ctx || level <= 0) return;
    const beat = () => { tone(52, 0.18, 'sine', 0.35 * level + 0.1); tone(48, 0.18, 'sine', 0.25 * level + 0.08, 0.18); };
    beat();
    beatTimer = setTimeout(() => A.heart(A._lvl || 0), 900 - 500 * level);
  };
  A.setHeart = (level) => { const was = A._lvl || 0; A._lvl = level; if (!was && level > 0) A.heart(level); if (level <= 0) clearTimeout(beatTimer); };

  A.key = () => { [660, 880, 1320].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, i * 0.07)); };
  A.battery = () => tone(520, 0.12, 'square', 0.08, 0, 900);
  A.unlock = () => { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.6, 'triangle', 0.14, i * 0.05)); };
  A.right = () => { tone(440, 0.12, 'triangle', 0.2); tone(660, 0.18, 'triangle', 0.2, 0.1); tone(990, 0.3, 'triangle', 0.18, 0.2); };
  A.wrong = () => { tone(140, 0.45, 'sawtooth', 0.18, 0, 70); };
  A.banish = () => { noise(0.8, 0.35, 300, 2, 0, 4000); tone(300, 0.7, 'sine', 0.15, 0, 1200); };
  A.caught = () => { if (A.gentle) { tone(500, 0.2, 'sine', 0.15, 0, 300); return; } noise(0.45, 0.5, 220, 1.5, 0, 90, loudIn); tone(110, 0.5, 'sawtooth', 0.3, 0, 40, loudIn); };
  A.whisper = () => { if (A.gentle) return; noise(1.4, 0.12, 2500, 6, 0, 1200); noise(1.2, 0.09, 1800, 8, 0.35, 3000); };
  A.squeak = () => { tone(1800, 0.08, 'sine', 0.08); tone(2200, 0.08, 'sine', 0.08, 0.1); };
  A.scream = () => {
    if (!ctx) return;
    const t = ctx.currentTime, out = loudIn;
    const dist = (amt) => { const ws = ctx.createWaveShaper(), c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * amt); } ws.curve = c; return ws; };
    // body-hit: sub boom
    tone(140, 0.7, 'sine', 0.9, 0, 32, out);
    tone(70, 0.9, 'triangle', 0.6, 0, 28, out);
    // white-noise blast sweeping down
    noise(1.3, 0.9, 2200, 0.7, 0, 600, out);
    noise(0.25, 0.8, 5000, 0.5, 0, 1500, out);
    // the scream: detuned, distorted saws with a ragged vibrato
    [0, 9, 17, 26].forEach((det) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), ws = dist(9);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(1050 + det * 12, t); o.frequency.exponentialRampToValueAtTime(380 + det * 6, t + 1.2);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 19 + det * 0.3; lg.gain.value = 90; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 1.35);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45, t + 0.02); g.gain.setValueAtTime(0.45, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
      o.connect(ws); ws.connect(g); g.connect(out); o.start(t); o.stop(t + 1.35);
    });
    // piercing shriek on top
    const sh = ctx.createOscillator(), sg = ctx.createGain();
    sh.type = 'square'; sh.frequency.setValueAtTime(2600, t); sh.frequency.exponentialRampToValueAtTime(1700, t + 0.9);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.18, t + 0.02); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    sh.connect(sg); sg.connect(out); sh.start(t); sh.stop(t + 1);
  };
  // the hunting wail: a sustained, high, wavering scream. Louder, higher and more frantic as a hunter closes in;
  // panned left/right so you can hear which way it is coming from.
  let wail = null;
  A.setWail = (level, pan) => {
    if (!ctx) return;
    level = A.gentle ? 0 : Math.max(0, Math.min(1, level || 0));
    if (!wail) {
      if (level <= 0) return;
      const out = ctx.createGain(); out.gain.value = 0;
      const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.9;
      const sum = ctx.createGain(); sum.gain.value = 1;
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 6; vg.gain.value = 30; vib.connect(vg);
      const wob = ctx.createOscillator(), wg = ctx.createGain(); wob.frequency.value = 0.4; wg.gain.value = 70; wob.connect(wg);
      const oscs = [[1, 'sawtooth', 0.22], [1.007, 'triangle', 0.5], [0.994, 'triangle', 0.5], [2.01, 'sine', 0.18]].map(([mul, type, v]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = 1300 * mul;
        vg.connect(o.frequency); wg.connect(o.frequency);
        const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(sum); o.start(); return { o, mul };
      });
      const len = ctx.sampleRate * 2, nb = ctx.createBuffer(1, len, ctx.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
      const n = ctx.createBufferSource(); n.buffer = nb; n.loop = true;
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 3200; nf.Q.value = 2;
      const ngn = ctx.createGain(); ngn.gain.value = 0.35; n.connect(nf); nf.connect(ngn); ngn.connect(sum); n.start();
      vib.start(); wob.start();
      sum.connect(bp); bp.connect(out);
      if (pn) { out.connect(pn); pn.connect(loudIn); } else out.connect(loudIn);
      wail = { out, pn, oscs, vib, vg, bp };
    }
    const t = ctx.currentTime, f = 1150 + 850 * level;
    for (const { o, mul } of wail.oscs) o.frequency.setTargetAtTime(f * mul, t, 0.3);
    wail.bp.frequency.setTargetAtTime(f * 1.2, t, 0.3);
    wail.vib.frequency.setTargetAtTime(5 + 6 * level, t, 0.3);
    wail.vg.gain.setTargetAtTime(20 + 50 * level, t, 0.3);
    wail.out.gain.setTargetAtTime(level <= 0 ? 0 : 0.03 + 0.17 * level * level, t, level <= 0 ? 0.08 : 0.2);
    if (wail.pn && pan != null) wail.pn.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)) * 0.85, t, 0.1);
  };
  // the catch: a loud, piercing high scream
  A.shriek = () => {
    if (!ctx || A.gentle) return;
    const t = ctx.currentTime, out = loudIn;
    tone(150, 0.6, 'sine', 0.8, 0, 35, out);                 // impact
    noise(0.9, 0.7, 4200, 0.8, 0, 2200, out);                // breath of the scream
    [0, 11, 23].forEach((det) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), ws = ctx.createWaveShaper(), c = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 5); } ws.curve = c;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(2100 + det * 15, t); o.frequency.linearRampToValueAtTime(2900 + det * 10, t + 0.25); o.frequency.exponentialRampToValueAtTime(1900, t + 1.4);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 13 + det * 0.2; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 1.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.015); g.gain.setValueAtTime(0.4, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.45);
      o.connect(ws); ws.connect(g); g.connect(out); o.start(t); o.stop(t + 1.5);
    });
    const sh = ctx.createOscillator(), sg = ctx.createGain();
    sh.type = 'square'; sh.frequency.setValueAtTime(3400, t); sh.frequency.exponentialRampToValueAtTime(2500, t + 1.1);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.2, t + 0.01); sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    sh.connect(sg); sg.connect(out); sh.start(t); sh.stop(t + 1.2);
  };
  // joints cracking: a few sharp clicks, panned toward the source
  A.crack = (vol, pan) => {
    if (!ctx || A.gentle || vol <= 0) return;
    const out = ctx.createGain(); out.gain.value = Math.min(1, vol);
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pn) { pn.pan.value = Math.max(-1, Math.min(1, pan || 0)); out.connect(pn); pn.connect(master); } else out.connect(master);
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * (0.03 + Math.random() * 0.05), len = Math.floor(ctx.sampleRate * 0.03);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 6);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200 + Math.random() * 1800;
      const g = ctx.createGain(); g.gain.value = 0.9;
      src.connect(hp); hp.connect(g); g.connect(out); src.start(t);
    }
  };
  A.step = () => { noise(0.06, 0.05, 400, 1); };
  // continuous dread layer: low grinding moan + breathy noise, scaled by how close a hunter is
  let dread = null;
  A.setDread = (level) => {
    if (!ctx) return;
    if (!dread) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 41;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 43.5;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.35; lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency);
      o.connect(lp); o2.connect(lp); lp.connect(g);
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
      const ng = ctx.createGain(); ng.gain.value = 0.25; n.connect(bp); bp.connect(ng); ng.connect(g);
      o.start(); o2.start(); lfo.start(); n.start();
      dread = g;
    }
    const v = A.gentle ? 0 : Math.max(0, Math.min(1, level)) * 0.55;
    dread.gain.setTargetAtTime(v, ctx.currentTime, 0.25);
  };

  root.Sound = A;
})(window);
