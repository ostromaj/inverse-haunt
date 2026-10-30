/* Monster art for Inverse Haunt. Each design is drawn procedurally onto a small canvas
   that the raycaster samples as a sprite. `em` draws the emissive parts (eyes, teeth)
   that stay visible in total darkness. */
(function (root) {
  'use strict';
  const D = {};

  // ---------------- classic set ----------------
  D.ghost = { w: 64, h: 128, size: 1.1, draw(g, frame) {
    const sway = frame ? 2 : -2;
    const gr = g.createLinearGradient(0, 10, 0, 128); gr.addColorStop(0, '#dfe5e6'); gr.addColorStop(0.55, '#8f9b9f'); gr.addColorStop(1, 'rgba(70,80,85,0)');
    g.strokeStyle = '#a9b3b5'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(22, 48); g.quadraticCurveTo(8, 72 + sway, 9, 104 + sway); g.stroke();
    g.beginPath(); g.moveTo(42, 48); g.quadraticCurveTo(56, 72 - sway, 55, 104 - sway); g.stroke();
    g.lineWidth = 1.1; for (const [hx, hy] of [[9, 104 + sway], [55, 104 - sway]]) for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + k * 2.2, hy + 10 + Math.abs(k) * 1.5); g.stroke(); }
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(46, 6, 47, 28, 44, 42); g.lineTo(46 + sway, 66); g.lineTo(44 + sway, 124);
    for (let i = 0; i < 8; i++) g.lineTo(44 + sway - i * 3.2, 96 + ((i * 41 + frame * 17) % 30));
    g.lineTo(20 - sway, 126); g.lineTo(18 - sway, 66); g.lineTo(20, 42); g.bezierCurveTo(17, 28, 18, 6, 32, 6); g.fill();
    g.strokeStyle = 'rgba(40,45,50,.35)'; g.lineWidth = 1; for (let x = 24; x < 42; x += 4) { g.beginPath(); g.moveTo(x, 50); g.lineTo(x + sway * 0.5, 110); g.stroke(); }
    g.fillStyle = '#f1f1ea'; g.beginPath(); g.ellipse(32, 26, 11, 17, 0, 0, 7); g.fill();
    g.fillStyle = '#000';
    g.beginPath(); g.ellipse(26, 22, 4.2, 6.5, 0.2, 0, 7); g.ellipse(38, 22, 4.2, 6.5, -0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(32, 37, 3.5, 7 + frame, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(25.5, 27, 1, 8); g.fillRect(38, 27, 1, 10);
  }, em(g) { g.fillStyle = '#ff1a2e'; g.beginPath(); g.arc(26.5, 23, 1.6, 0, 7); g.arc(37.5, 23, 1.6, 0, 7); g.fill(); }, face: [0.1, 0, 0.8, 0.45] };

  // (the Shade is defined below, after the jitter helper)

  // ---------------- new set ----------------
  // tiny seeded jitter so hand-drawn details are stable between frames
  const J = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // THE SHADE — a hunched shadow that is mostly mouth. Lopsided cluster of red slit eyes,
  // a gaping maw that glows faintly from inside, crooked yellow teeth, arms like dead branches.
  D.shade = { w: 96, h: 192, size: 1.15, draw(g, frame) {
    const f = frame ? 1 : -1, ink = '#020103';
    g.lineCap = 'round'; g.lineJoin = 'round';
    // arms: long, jointed, bent wrong
    g.strokeStyle = ink;
    for (const [s, a] of [[-1, 0], [1, 1]]) {
      g.lineWidth = 3.4; g.beginPath(); g.moveTo(48 + s * 16, 74); g.lineTo(48 + s * 38, 96 + f * s); g.lineTo(48 + s * 34, 140 + a * 6); g.lineTo(48 + s * 42, 168 + f); g.stroke();
      g.lineWidth = 1.6; g.strokeStyle = '#2a2420';
      const hx = 48 + s * 42, hy = 168 + f;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + s * (2 + k * 3), hy + 8, hx + s * (k * 4 - 3), hy + 18 + (k % 2) * 3); g.stroke(); }
      g.strokeStyle = ink;
    }
    // body: ragged, lopsided, dissolving into smoke at the bottom
    g.fillStyle = ink; g.beginPath(); g.moveTo(30, 66);
    for (let i = 0; i <= 16; i++) { const t = i / 16; g.lineTo(30 - 6 * Math.sin(t * 3) - J(i + frame * 5) * 6, 66 + t * 104); }
    for (let i = 0; i <= 18; i++) g.lineTo(26 + i * 2.5, 170 + J(i * 2 + frame * 9) * 20);
    for (let i = 16; i >= 0; i--) { const t = i / 16; g.lineTo(68 + 4 * Math.sin(t * 4) + J(i + 30 + frame * 5) * 6, 66 + t * 104); }
    g.closePath(); g.fill();
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(2,1,3,' + (0.25 + J(i + 70) * 0.5) + ')'; g.fillRect(28 + J(i + 3) * 42, 170 + J(i + 11) * 10, 1.5 + J(i) * 2, 10 + J(i + 5) * 12); }
    // head: tilted, uneven, wider on one side, swallowing the shoulders
    g.beginPath();
    for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2, r = 24 + (J(i * 1.7) - 0.5) * 4 + (Math.cos(a) > 0 ? 3 : 0); g.lineTo(46 + Math.cos(a) * r * 0.95, 52 + Math.sin(a) * r * 1.15); }
    g.fill();
    // the maw: a tall, ragged hole that takes up most of the face
    const mw = [[34, 52], [40, 49], [47, 51], [55, 48], [61, 53], [63, 66], [60, 80 + frame * 2], [52, 88 + frame * 3], [43, 86 + frame * 3], [36, 78 + frame], [32, 64]];
    g.fillStyle = '#1a0205'; g.beginPath(); mw.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    // crooked teeth around the rim, uneven and yellowed
    g.fillStyle = '#cbbf98';
    const rim = (t) => { const n = mw.length, u = t * n, i = Math.floor(u) % n, j = (i + 1) % n, k = u - Math.floor(u); return [mw[i][0] + (mw[j][0] - mw[i][0]) * k, mw[i][1] + (mw[j][1] - mw[i][1]) * k]; };
    for (let i = 0; i < 26; i++) {
      const t = i / 26, [x, y] = rim(t), [x2, y2] = rim(t + 0.01), nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1;
      const len = 3 + J(i + 20) * 6, wdt = 1 + J(i + 40) * 1.2;
      const tx = x + (nx / nl) * len + (J(i + 60) - 0.5) * 2, ty = y + (ny / nl) * len;
      g.beginPath(); g.moveTo(x - wdt, y); g.lineTo(tx, ty); g.lineTo(x + wdt, y); g.fill();
    }
    // strings of drool
    g.strokeStyle = 'rgba(190,180,170,.55)'; g.lineWidth = 0.7;
    for (const [x0, x1] of [[40, 42], [50, 49], [57, 58]]) { g.beginPath(); g.moveTo(x0, 52); g.quadraticCurveTo((x0 + x1) / 2, 72 + frame * 3, x1, 84 + frame * 2); g.stroke(); }
  }, em(g, frame) {
    // throat glow
    const tg = g.createRadialGradient(48, 70, 1, 48, 70, 10); tg.addColorStop(0, 'rgba(150,10,25,1)'); tg.addColorStop(1, 'rgba(150,10,25,0)');
    g.fillStyle = tg; g.beginPath(); g.ellipse(48, 70, 7, 10, 0, 0, 7); g.fill();
    // lopsided cluster of slit eyes, different sizes, one drifting down the cheek
    g.fillStyle = '#ff1d30';
    for (const [x, y, w, h, r] of [[36, 38, 3.4, 1.2, 0.35], [52, 35, 4.2, 1.4, -0.2], [44, 30, 2.2, 0.9, 0.1], [60, 42, 2.6, 1, -0.5], [31, 47, 1.8, 0.8, 0.6], [57, 28, 1.6, 0.7, 0]]) {
      g.beginPath(); g.ellipse(x, y + (frame && x > 50 ? 0.6 : 0), w, h, r, 0, 7); g.fill();
    }
  }, face: [0.17, 0.08, 0.66, 0.42] };

  // THE WIDOW — impossibly tall, head snapped sideways, wet black hair over the face,
  // one wide eye staring through a gap, arms hanging to the floor.
  D.widow = { w: 96, h: 192, size: 1.25, draw(g, frame) {
    const f = frame ? 1 : -1;
    // dress
    const dg = g.createLinearGradient(0, 55, 0, 192);
    dg.addColorStop(0, '#e2ddd2'); dg.addColorStop(0.5, '#aaa498'); dg.addColorStop(0.92, '#5f5a52'); dg.addColorStop(1, 'rgba(60,55,50,0)');
    g.fillStyle = dg; g.beginPath(); g.moveTo(36, 58); g.lineTo(60, 58); g.lineTo(64, 90); g.lineTo(72 + f, 180);
    for (let i = 0; i <= 12; i++) g.lineTo(72 + f - i * 3.6, 176 + J(i + frame * 13) * 16);
    g.lineTo(28, 182); g.lineTo(32, 90); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,35,30,.35)'; g.lineWidth = 1;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(40 + k * 3.5, 70); g.quadraticCurveTo(36 + k * 6, 130, 33 + k * 7 + f, 178); g.stroke(); }
    for (let k = 0; k < 7; k++) { g.fillStyle = 'rgba(55,40,30,' + (0.12 + J(k) * 0.15) + ')'; g.beginPath(); g.ellipse(38 + J(k + 5) * 22, 80 + J(k + 9) * 80, 1.5 + J(k + 2) * 2.5, 3 + J(k + 3) * 6, 0, 0, 7); g.fill(); }
    // arms: too long, hanging to the floor
    g.strokeStyle = '#b3ada2'; g.lineCap = 'round'; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(36, 62); g.quadraticCurveTo(24, 110, 22 - f, 168); g.stroke();
    g.beginPath(); g.moveTo(60, 62); g.quadraticCurveTo(72, 110, 74 + f, 168); g.stroke();
    g.lineWidth = 1.2;
    for (const [hx, hy, s] of [[22 - f, 168, -1], [74 + f, 168, 1]]) for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + s * (k - 2) * 2, hy + 8, hx + s * (k - 2) * 3.2, hy + 15 + (k % 2) * 4); g.stroke(); }
    // neck snapped to the side
    g.strokeStyle = '#c9c3b8'; g.lineWidth = 5; g.beginPath(); g.moveTo(48, 60); g.quadraticCurveTo(50, 46, 58, 38); g.stroke();
    // head, tilted hard
    g.save(); g.translate(58, 28); g.rotate(0.85);
    g.fillStyle = '#cfc9be'; g.beginPath(); g.ellipse(0, 0, 11, 15, 0, 0, 7); g.fill();
    g.restore();
    // hair: a wet black curtain falling straight down over the whole face
    g.fillStyle = '#060405'; g.beginPath(); g.ellipse(58, 25, 15, 13, 0, Math.PI, 0); g.fill();
    g.strokeStyle = '#060405';
    for (let i = 0; i < 70; i++) {
      const th = Math.PI + (i / 69) * Math.PI, sx = 58 + Math.cos(th) * 15, sy = 25 + Math.sin(th) * 13 + 2;
      const len = 62 + J(i) * 60, wob = (J(i + 50) - 0.5) * 5;
      g.lineWidth = 1.2 + J(i + 7) * 1.2;
      g.beginPath(); g.moveTo(sx, sy); g.bezierCurveTo(sx + wob, sy + len * 0.35, sx - wob + f * 0.8, sy + len * 0.7, sx + wob * 0.6 + f * 1.4, sy + len); g.stroke();
    }
    // the parting: one eye and a slack, open mouth
    g.fillStyle = '#bdb7ab'; g.beginPath(); g.ellipse(54, 36, 3.2, 13, 0.08, 0, 7); g.fill();
    g.fillStyle = '#140808'; g.beginPath(); g.ellipse(54, 45 + frame, 1.7, 4 + frame, 0.08, 0, 7); g.fill();
    g.strokeStyle = '#060405'; g.lineWidth = 1; for (const dx of [-2.6, 2.4]) { g.beginPath(); g.moveTo(54 + dx, 24); g.lineTo(54 + dx * 1.2, 52); g.stroke(); }
  }, em(g, frame) {
    g.fillStyle = '#f4f1e8'; g.beginPath(); g.ellipse(54, 32, 2.4, 2.2, 0, 0, 7); g.fill();
    g.fillStyle = '#000'; g.fillRect(53.4 + (frame ? 0.5 : -0.5), 31.3, 1.3, 1.3);
  }, face: [0.25, 0.02, 0.6, 0.3] };

  // THE GRINNER — an emaciated thing with a smile far too wide for its face.
  // In the dark you only see the teeth and two pinprick eyes.
  // poses: [head tilt, arm sway, extra mouth gape, head drop]
  const GP = [[-0.18, -1.5, 0, 0], [0.42, 2.5, 3, 2], [-0.62, -3, 1, 3], [0.12, 1.5, 5, -1], [-0.9, 0, 2, 5]];
  D.grinner = { w: 96, h: 192, size: 1.05, frames: 5, draw(g, frame) {
    const P = GP[frame % GP.length], f = P[1];
    const skin = '#a8a49a', dark = '#6c685f';
    g.lineCap = 'round';
    // legs, bent
    g.strokeStyle = dark; g.lineWidth = 4;
    g.beginPath(); g.moveTo(42, 122); g.lineTo(32, 150); g.lineTo(36, 188); g.stroke();
    g.beginPath(); g.moveTo(54, 122); g.lineTo(66, 150); g.lineTo(60, 188); g.stroke();
    // torso: ribs and a sunken belly
    const tg = g.createLinearGradient(30, 0, 66, 0); tg.addColorStop(0, dark); tg.addColorStop(0.5, skin); tg.addColorStop(1, dark);
    g.fillStyle = tg; g.beginPath(); g.moveTo(32, 70); g.lineTo(64, 70); g.quadraticCurveTo(60, 100, 56, 126); g.lineTo(40, 126); g.quadraticCurveTo(36, 100, 32, 70); g.fill();
    g.strokeStyle = 'rgba(40,32,26,.55)'; g.lineWidth = 1.2;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(36 + k * 0.5, 76 + k * 6); g.quadraticCurveTo(48, 72 + k * 6, 60 - k * 0.5, 76 + k * 6); g.stroke(); }
    g.beginPath(); g.moveTo(48, 72); g.lineTo(48, 112); g.stroke();
    // arms dragging on the floor, elbows out
    g.strokeStyle = skin; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(33, 72); g.lineTo(14 + f, 118); g.lineTo(20 + f, 178); g.stroke();
    g.beginPath(); g.moveTo(63, 72); g.lineTo(82 - f, 118); g.lineTo(76 - f, 178); g.stroke();
    g.strokeStyle = dark; g.lineWidth = 1.3;
    for (const [hx, s] of [[20 + f, -1], [76 - f, 1]]) for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(hx, 178); g.lineTo(hx + s * (k - 1.5) * 3.5, 190); g.stroke(); }
    // neck, head long and narrow, tipped to one side
    g.strokeStyle = skin; g.lineWidth = 6; g.beginPath(); g.moveTo(48, 72); g.lineTo(47 + P[0] * 5, 58 + P[3]); g.stroke();
    g.save(); g.translate(47 + P[0] * 6, 34 + P[3]); g.rotate(P[0]);
    const hg = g.createRadialGradient(-3, -8, 3, 0, 0, 30); hg.addColorStop(0, '#d2cdc2'); hg.addColorStop(0.7, '#8f8b82'); hg.addColorStop(1, '#4e4a44');
    g.fillStyle = hg; g.beginPath(); g.ellipse(0, 0, 17, 27, 0, 0, 7); g.fill();
    // sunken cheeks and brow
    g.fillStyle = 'rgba(30,25,20,.45)'; g.beginPath(); g.ellipse(-11, 6, 5, 9, 0.2, 0, 7); g.ellipse(11, 6, 5, 9, -0.2, 0, 7); g.fill();
    // deep black eye pits, high on the skull
    g.fillStyle = '#060303'; g.beginPath(); g.ellipse(-7, -10, 5, 6.5, 0.25, 0, 7); g.ellipse(7, -10, 5, 6.5, -0.25, 0, 7); g.fill();
    // the grin, wider than the head: corners split up into the cheeks
    g.fillStyle = '#080303';
    g.beginPath(); g.moveTo(-23, -1); g.quadraticCurveTo(0, 30 + P[2], 23, -1); g.quadraticCurveTo(0, 13, -23, -1); g.fill();
    g.strokeStyle = 'rgba(20,8,8,.85)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(-23, -1); g.lineTo(-25, -7); g.moveTo(23, -1); g.lineTo(25, -7); g.stroke();
    g.restore();
  }, em(g, frame) {
    const P = GP[frame % GP.length];
    g.save(); g.translate(47 + P[0] * 6, 34 + P[3]); g.rotate(P[0]);
    g.fillStyle = '#ffffff'; g.fillRect(-7.6, -10, 1.3, 1.3); g.fillRect(6.4, -10, 1.3, 1.3);
    g.fillStyle = '#efe9d8';
    const q = (t, cy) => [-23 + 46 * t, (1 - t) * (1 - t) * -1 + 2 * (1 - t) * t * cy + t * t * -1];
    for (let i = 1; i < 18; i++) { const [x, y] = q(i / 18, 13); g.beginPath(); g.moveTo(x - 1.2, y - 0.6); g.lineTo(x, y + 4.2); g.lineTo(x + 1.2, y - 0.6); g.fill(); }
    for (let i = 1; i < 18; i++) { const [x, y] = q(i / 18, 30 + P[2]); g.beginPath(); g.moveTo(x - 1.2, y + 0.6); g.lineTo(x, y - 4.2); g.lineTo(x + 1.2, y + 0.6); g.fill(); }
    g.restore();
  }, face: [0.2, 0.0, 0.6, 0.34] };

  // THE HOLLOW — a towering hooded shape wearing a cracked porcelain doll mask
  // that weeps black. Pale hands keep reaching out of the cloak.
  D.hollow = { w: 96, h: 192, size: 1.2, draw(g, frame) {
    const f = frame ? 1 : -1;
    // reaching hands (behind/through the cloak)
    const hand = (x0, y0, x1, y1, s) => {
      g.strokeStyle = '#120c10'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 - 6, x1, y1); g.stroke();
      g.strokeStyle = '#bdb6b0'; g.lineWidth = 1.3;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(x1 + s * 6, y1 + (k - 2) * 2.5, x1 + s * (10 + (k % 2) * 3), y1 + (k - 2) * 4.5); g.stroke(); }
      g.fillStyle = '#bdb6b0'; g.beginPath(); g.ellipse(x1, y1, 3, 2.4, 0, 0, 7); g.fill();
    };
    hand(36, 96, 12 - f, 84, -1); hand(60, 104, 82 + f, 92, 1); hand(38, 132, 16 + f, 140, -1); hand(58, 138, 80 - f, 150, 1);
    // cloak with smoky ragged edges
    g.fillStyle = '#070508';
    g.beginPath(); g.moveTo(48, 10);
    for (let i = 0; i <= 20; i++) { const t = i / 20; g.lineTo(64 + t * 12 + J(i + frame * 7) * 5, 14 + t * 172); }
    for (let i = 0; i <= 14; i++) g.lineTo(76 - i * 4, 182 + J(i * 3 + frame) * 10);
    for (let i = 20; i >= 0; i--) { const t = i / 20; g.lineTo(32 - t * 12 - J(i + 40 + frame * 7) * 5, 14 + t * 172); }
    g.closePath(); g.fill();
    // hood opening
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(48, 42, 16, 22, 0, 0, 7); g.fill();
    // porcelain mask
    const mg = g.createRadialGradient(46, 38, 2, 48, 44, 18); mg.addColorStop(0, '#f2eee5'); mg.addColorStop(1, '#b7b0a3');
    g.fillStyle = mg; g.beginPath(); g.ellipse(48, 44, 11.5, 16, 0, 0, 7); g.fill();
    // almond eye holes
    g.fillStyle = '#000';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(48 + s * 2, 40); g.quadraticCurveTo(48 + s * 6, 34, 48 + s * 10, 40); g.quadraticCurveTo(48 + s * 6, 44, 48 + s * 2, 40); g.fill(); }
    // black tears running down and off the mask
    g.fillStyle = 'rgba(0,0,0,.85)';
    g.fillRect(42, 42, 1.4, 22); g.fillRect(44.2, 42, 1, 14); g.fillRect(53, 42, 1.4, 26); g.fillRect(51, 42, 0.9, 11);
    g.beginPath(); g.arc(42.7, 64, 1.2, 0, 7); g.arc(53.7, 68, 1.3, 0, 7); g.fill();
    // cracks
    g.strokeStyle = 'rgba(30,25,25,.8)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(41, 29); g.lineTo(45, 35); g.lineTo(43, 38); g.moveTo(56, 48); g.lineTo(52, 53); g.lineTo(55, 57); g.lineTo(52, 60); g.stroke();
    // stitched mouth
    g.strokeStyle = '#2a1414'; g.lineWidth = 1; g.beginPath(); g.moveTo(43, 53); g.lineTo(53, 53); g.stroke();
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(44 + k * 2.2, 51); g.lineTo(44 + k * 2.2, 55); g.stroke(); }
  }, em(g) { g.fillStyle = '#ff1f33'; g.fillRect(41.5, 39.2, 1.6, 1.6); g.fillRect(53, 39.2, 1.6, 1.6); }, face: [0.25, 0.08, 0.5, 0.3] };

  const SETS = { main: ['grinner', 'shade'], classic: ['ghost', 'ghost', 'shade'], new: ['widow', 'grinner', 'hollow'] };
  root.Monsters = { D, SETS };
})(window);
