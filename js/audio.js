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
