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

  // ================= HORRIFYING MODE =================

  // THE BENDER — walks on all fours bent over backwards. Its head hangs upside down
  // between its shoulders, eyes open far too wide, mouth gaping above them.
  // 6 frames: 0-3 skitter cycle, 4-5 the head wrenching around.
  D.spider = { w: 112, h: 192, size: 0.95, frames: 6, draw(g, frame) {
    const step = [[0, 0], [5, -4], [0, 3], [-5, -2], [2, 1], [-2, 0]][frame];
    const skin = '#b9b5ac', dark = '#5e5a54', ink = '#120d0c';
    g.lineCap = 'round'; g.lineJoin = 'round';
    // limbs: knees and elbows jut up far above the body
    const limb = (x0, y0, xk, yk, xf, yf, w) => { g.strokeStyle = dark; g.lineWidth = w + 1.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(xk, yk); g.lineTo(xf, yf); g.stroke(); g.strokeStyle = skin; g.lineWidth = w; g.stroke(); };
    limb(48, 70, 18 - step[0], 18 + step[1], 10 + step[0], 186, 3.6);       // back legs
    limb(64, 70, 94 + step[0], 20 - step[1], 102 - step[0], 186, 3.6);
    limb(46, 112, 6 + step[1], 60 - step[0], 14 - step[1], 188, 3.2);       // arms
    limb(66, 112, 106 - step[1], 62 + step[0], 98 + step[1], 188, 3.2);
    // fingers and toes splayed on the floor
    g.strokeStyle = dark; g.lineWidth = 1.2;
    for (const [x, s] of [[10 + step[0], -1], [102 - step[0], 1], [14 - step[1], -1], [98 + step[1], 1]]) for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, 184); g.lineTo(x + s * (k * 3 - 2), 191); g.stroke(); }
    // torso arched up and back like a bridge
    const tg = g.createLinearGradient(0, 50, 0, 125); tg.addColorStop(0, '#8b877f'); tg.addColorStop(1, skin);
    g.fillStyle = tg; g.beginPath(); g.ellipse(56, 92, 15, 34, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(30,25,20,.5)'; g.lineWidth = 1.1;
    for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(44, 74 + k * 6); g.quadraticCurveTo(56, 78 + k * 6, 68, 74 + k * 6); g.stroke(); }
    // the head: upside down, hanging below the shoulders
    const spin = frame === 4 ? 1.6 : frame === 5 ? -2.4 : 0;
    g.save(); g.translate(56, 140); g.rotate(Math.PI + spin);
    g.fillStyle = '#cfcac0'; g.beginPath(); g.ellipse(0, 0, 15, 19, 0, 0, 7); g.fill();
    g.fillStyle = ink; g.beginPath(); g.ellipse(-6, -6, 6, 6.5, 0, 0, 7); g.ellipse(6, -6, 6, 6.5, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(0, 10, 6, 7 + (frame % 2) * 2, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(-7.5, -1, 1.3, 9); g.fillRect(-5, -1, 0.9, 6); g.fillRect(5.5, -1, 1.3, 11); g.fillRect(7.6, -1, 0.9, 5);
    g.fillStyle = 'rgba(30,20,20,.5)'; g.beginPath(); g.ellipse(-11, 2, 3, 6, 0.2, 0, 7); g.ellipse(11, 2, 3, 6, -0.2, 0, 7); g.fill();
    // strands of hair hanging "up" off the inverted skull
    g.restore();
    g.strokeStyle = '#0b0807'; g.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) { const x = 44 + i * 1.6; g.beginPath(); g.moveTo(x, 156); g.lineTo(x + (J(i) - 0.5) * 6, 166 + J(i + 9) * 14); g.stroke(); }
  }, em(g, frame) {
    const spin = frame === 4 ? 1.6 : frame === 5 ? -2.4 : 0;
    g.save(); g.translate(56, 140); g.rotate(Math.PI + spin);
    g.fillStyle = '#ffffff'; g.fillRect(-6.2, -6.6, 1.3, 1.3); g.fillRect(5.2, -6.6, 1.3, 1.3);
    g.fillStyle = '#e8e0cc';
    for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(k * 1.4 - 0.6, 4); g.lineTo(k * 1.4, 7); g.lineTo(k * 1.4 + 0.6, 4); g.fill(); }
    g.restore();
  }, face: [0.28, 0.6, 0.44, 0.3] };

  // THE TALL ONE — far too tall for the hallway, so it is folded over: its body rises
  // to the ceiling and its head hangs back down in front of its chest. It only moves
  // when you are not looking at it.
  D.tall = { w: 72, h: 192, size: 1.02, frames: 4, draw(g, frame) {
    const tw = [[0, 0], [2, 1], [-2, 2], [1, -2]][frame];
    const body = '#232027', skin = '#c4c0bb';
    g.lineCap = 'round';
    // legs: very long, very thin
    g.strokeStyle = body; g.lineWidth = 4;
    g.beginPath(); g.moveTo(32, 100); g.lineTo(28, 190); g.moveTo(40, 100); g.lineTo(44, 190); g.stroke();
    // torso rising to the ceiling, then folding forward
    g.fillStyle = body; g.beginPath(); g.moveTo(26, 104); g.lineTo(46, 104); g.lineTo(48, 18); g.quadraticCurveTo(36, 0, 24, 18); g.closePath(); g.fill();
    // arms: down to the floor, elbows bent the wrong way
    g.strokeStyle = skin; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(26, 22); g.lineTo(8 + tw[0], 90); g.lineTo(14 - tw[0], 176); g.stroke();
    g.beginPath(); g.moveTo(46, 22); g.lineTo(64 - tw[0], 96); g.lineTo(58 + tw[0], 180); g.stroke();
    g.lineWidth = 1;
    for (const [x, y, s] of [[14 - tw[0], 176, -1], [58 + tw[0], 180, 1]]) for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * (k - 2) * 2.4, y + 10 + (k % 2) * 3); g.stroke(); }
    // long neck hanging down from the fold at the ceiling
    g.strokeStyle = skin; g.lineWidth = 4; g.beginPath(); g.moveTo(36, 8); g.quadraticCurveTo(38 + tw[1], 30, 36 + tw[0], 50 + tw[1]); g.stroke();
    // the head, upside down, facing you
    g.save(); g.translate(36 + tw[0], 64 + tw[1]); g.rotate(Math.PI + tw[0] * 0.05);
    g.fillStyle = '#d8d4cc'; g.beginPath(); g.ellipse(0, 0, 10, 15, 0, 0, 7); g.fill();
    g.fillStyle = '#050304'; g.beginPath(); g.ellipse(-4.2, -4, 3.4, 5.5, 0.15, 0, 7); g.ellipse(4.2, -4, 3.4, 5.5, -0.15, 0, 7); g.fill();
    g.beginPath(); g.ellipse(0, 8, 2.2, 5 + frame * 0.6, 0, 0, 7); g.fill();
    g.restore();
  }, em(g, frame) {
    const tw = [[0, 0], [2, 1], [-2, 2], [1, -2]][frame];
    g.save(); g.translate(36 + tw[0], 64 + tw[1]); g.rotate(Math.PI + tw[0] * 0.05);
    g.fillStyle = '#ffffff'; g.fillRect(-4.8, -3.6, 1.2, 1.2); g.fillRect(3.6, -3.6, 1.2, 1.2);
    g.restore();
  }, face: [0.15, 0.2, 0.7, 0.3] };

  // THE HANGER — clings to the ceiling. A knot of limbs up top, a long neck dangling
  // a face down toward you, jaw hanging open. Convulses when it gets close.
  D.hanger = { w: 96, h: 160, size: 0.85, frames: 4, ceiling: true, draw(g, frame) {
    const sw = [0, 4, -3, 2][frame];
    const skin = '#b3aea6', dark = '#4c4844';
    g.lineCap = 'round';
    // limbs gripping the ceiling
    g.strokeStyle = dark; g.lineWidth = 3;
    for (const [x0, xk, yk, x1] of [[40, 14, 26, 2], [56, 82, 24, 94], [44, 22, 36, 12], [52, 74, 36, 86]]) { g.beginPath(); g.moveTo(x0, 12); g.lineTo(xk + sw * 0.3, yk); g.lineTo(x1, 2); g.stroke(); }
    // hunched back pressed to the ceiling
    g.fillStyle = '#8a857e'; g.beginPath(); g.ellipse(48, 14, 18, 14, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(30,25,20,.5)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(48 + k * 5, 4); g.lineTo(48 + k * 6, 26); g.stroke(); }
    // two arms hanging down, swaying
    g.strokeStyle = skin; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(38, 22); g.quadraticCurveTo(30 + sw, 70, 34 + sw * 1.5, 118); g.stroke();
    g.beginPath(); g.moveTo(58, 22); g.quadraticCurveTo(66 + sw, 76, 62 + sw * 1.5, 124); g.stroke();
    g.lineWidth = 1; for (const [x, y] of [[34 + sw * 1.5, 118], [62 + sw * 1.5, 124]]) for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k - 2) * 2, y + 10 + (k % 2) * 3); g.stroke(); }
    // long neck down to the face
    g.strokeStyle = skin; g.lineWidth = 5; g.beginPath(); g.moveTo(48, 24); g.quadraticCurveTo(48 - sw, 70, 48 + sw * 0.6, 108); g.stroke();
    g.save(); g.translate(48 + sw * 0.6, 126); g.rotate(sw * 0.04);
    g.fillStyle = '#d5d0c6'; g.beginPath(); g.ellipse(0, 0, 13, 19, 0, 0, 7); g.fill();
    g.fillStyle = '#060404'; g.beginPath(); g.ellipse(-5, -6, 4, 5, 0.2, 0, 7); g.ellipse(5, -6, 4, 5, -0.2, 0, 7); g.fill();
    // jaw hanging open, far too long
    g.beginPath(); g.ellipse(0, 10, 5, 10 + frame, 0, 0, 7); g.fill();
    g.restore();
  }, em(g, frame) {
    const sw = [0, 4, -3, 2][frame];
    g.save(); g.translate(48 + sw * 0.6, 126); g.rotate(sw * 0.04);
    g.fillStyle = '#ff2a3a'; g.fillRect(-5.6, -5.6, 1.4, 1.4); g.fillRect(4.2, -5.6, 1.4, 1.4);
    g.restore();
  }, face: [0.2, 0.6, 0.6, 0.4] };

  // ======== HORRIFYING MODE v2: three silhouettes that look nothing alike ========

  // THE CRAWLER — low to the floor, dragging itself toward you on its belly.
  // Black hair spills over its face onto the boards; one eye shows. Long arms
  // claw forward in jerks. 6 frames: 0-3 crawl cycle, 4-5 the head jerking up.
  D.crawler = { w: 128, h: 64, size: 0.5, frames: 6, draw(g, frame) {
    const reach = [[0, 0], [6, -3], [0, 0], [-6, 3], [2, 0], [-2, 0]][frame];
    const jerk = frame === 4 ? -5 : frame === 5 ? 3 : 0;
    const skin = '#b5afa5', dark = '#3b3631';
    g.lineCap = 'round'; g.lineJoin = 'round';
    // back hunched up behind the head, torn grey dress
    const bg = g.createLinearGradient(0, 8, 0, 50); bg.addColorStop(0, '#3a3530'); bg.addColorStop(1, '#0c0a09');
    g.fillStyle = bg; g.beginPath(); g.ellipse(64, 30, 30, 18, 0, Math.PI, 0); g.lineTo(94, 46); g.lineTo(34, 46); g.closePath(); g.fill();
    // arms: elbows jut up, hands slap down far in front
    const arm = (sx, ex, ey, hx, hy) => {
      g.strokeStyle = dark; g.lineWidth = 6; g.beginPath(); g.moveTo(sx, 36); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
      g.strokeStyle = skin; g.lineWidth = 4.2; g.stroke();
      g.strokeStyle = skin; g.lineWidth = 1.6;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + (k - 2) * 3.4, hy + 5 + (k % 2) * 2); g.stroke(); }
    };
    arm(44, 18 - reach[0], 14 + reach[1], 8 - reach[0], 58);
    arm(84, 110 + reach[0], 14 - reach[1], 120 + reach[0], 58);
    // head raised toward you
    g.save(); g.translate(64, 34 + jerk); g.rotate(jerk * 0.03);
    g.fillStyle = '#c9c3b8'; g.beginPath(); g.ellipse(0, 0, 12, 14, 0, 0, 7); g.fill();
    // hair: a wet black curtain falling over the face and spilling onto the floor
    g.strokeStyle = '#050304';
    for (let i = 0; i < 44; i++) {
      const sx = -13 + i * 0.62, len = 18 + J(i) * 16, wob = (J(i + 30) - 0.5) * 8;
      if (sx > -3 && sx < 2 && i % 3) continue; // the parting
      g.lineWidth = 1.1 + J(i + 7);
      g.beginPath(); g.moveTo(sx * 0.9, -13); g.quadraticCurveTo(sx * 1.1 + wob, 4, sx * 1.6 + wob * 1.4, len); g.stroke();
    }
    g.fillStyle = '#050304'; g.beginPath(); g.ellipse(0, -9, 13, 7, 0, Math.PI, 0); g.fill();
    // mouth through the parting
    g.fillStyle = '#120606'; g.beginPath(); g.ellipse(0, 6, 2.6, 5 + (frame % 2), 0, 0, 7); g.fill();
    g.restore();
    // hair pooled on the floor
    g.fillStyle = '#050304'; g.beginPath(); g.ellipse(64, 60, 24, 5, 0, 0, 7); g.fill();
  }, em(g, frame) {
    const jerk = frame === 4 ? -5 : frame === 5 ? 3 : 0;
    g.save(); g.translate(64, 34 + jerk); g.rotate(jerk * 0.03);
    g.fillStyle = '#f2efe6'; g.beginPath(); g.ellipse(-0.5, -3, 2.3, 2, 0, 0, 7); g.fill();
    g.fillStyle = '#000'; g.fillRect(-0.9 + (frame % 3) * 0.4, -3.6, 1.2, 1.2);
    g.restore();
  }, face: [0.33, 0.2, 0.34, 0.7] };

  // THE MASS — a heap of fused bodies that fills the whole hallway. Faces of every
  // size are pressed into it, mouths opening and closing out of time with each other.
  // Arms reach out of it. 4 frames.
  const MASS_FACES = [[44, 44, 13, 0.1], [82, 38, 11, -0.3], [64, 70, 16, 0.05], [30, 84, 9, 0.5], [98, 76, 10, -0.2], [52, 100, 8, -0.4], [80, 104, 9, 0.3], [62, 22, 7, 0.2], [20, 56, 6, -0.6], [108, 52, 7, 0.4]];
  D.mass = { w: 128, h: 128, size: 1.0, frames: 4, draw(g, frame) {
    g.lineCap = 'round';
    // arms reaching out of the heap
    for (const [x0, y0, x1, y1, s] of [[26, 70, 2, 46, -1], [104, 64, 126, 38, 1], [38, 104, 6, 112, -1], [94, 100, 124, 110, 1], [64, 30, 70, 2, 0]]) {
      const w = frame % 2 ? 2 : -2;
      g.strokeStyle = '#2b2420'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + w, (y0 + y1) / 2 - 6, x1 + w, y1); g.stroke();
      g.strokeStyle = '#a49c90'; g.lineWidth = 3; g.stroke();
      g.lineWidth = 1.2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x1 + w, y1); g.lineTo(x1 + w + (s || (k - 2) * 0.5) * 5 + (k - 2) * 1.5, y1 - 6 + k * 2.5); g.stroke(); }
    }
    // the heap: lumpy, glistening, dark
    const mg = g.createRadialGradient(62, 70, 8, 64, 72, 62); mg.addColorStop(0, '#5a4c45'); mg.addColorStop(0.7, '#2c2320'); mg.addColorStop(1, '#120d0c');
    g.fillStyle = mg; g.beginPath();
    for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 2, r = 50 + (J(i * 2.3 + frame * 0.7) - 0.5) * 12; g.lineTo(64 + Math.cos(a) * r * 1.05, 70 + Math.sin(a) * r * 1.05 * (Math.sin(a) > 0 ? 1.15 : 1)); }
    g.fill();
    g.fillStyle = 'rgba(255,240,230,.06)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(20 + J(i) * 88, 30 + J(i + 4) * 80, 5 + J(i + 2) * 8, 2 + J(i + 3) * 3, J(i + 5) * 3, 0, 7); g.fill(); }
    // the faces
    MASS_FACES.forEach(([x, y, r, rot], i) => {
      const scream = 0.35 + 0.65 * (((i * 3 + frame) % 4) / 3);
      g.save(); g.translate(x, y); g.rotate(rot * 1.6);
      // long, stretched face
      const fg = g.createLinearGradient(0, -r * 1.3, 0, r * 1.3); fg.addColorStop(0, '#cfc7b8'); fg.addColorStop(0.6, '#8e8576'); fg.addColorStop(1, '#3b342d');
      g.fillStyle = fg; g.beginPath(); g.ellipse(0, r * 0.1, r * 0.62, r * 1.25, 0, 0, 7); g.fill();
      // deep sockets that drag downward
      for (const sx of [-1, 1]) {
        const so = g.createRadialGradient(sx * r * 0.24, -r * 0.3, 0, sx * r * 0.24, -r * 0.2, r * 0.32); so.addColorStop(0, '#000'); so.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = so; g.beginPath(); g.ellipse(sx * r * 0.24, -r * 0.18, r * 0.2, r * 0.34, sx * 0.15, 0, 7); g.fill();
      }
      // mouth stretched into a long scream
      g.fillStyle = '#050202'; g.beginPath(); g.ellipse(0, r * 0.62, r * 0.17, r * (0.18 + 0.5 * scream), 0, 0, 7); g.fill();
      g.restore();
    });
    // folds of the heap pulled over the faces' edges, so they look sunk into it
    g.fillStyle = 'rgba(30,23,20,.9)';
    for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(14 + J(i + 40) * 100, 22 + J(i + 60) * 96, 6 + J(i + 80) * 10, 3 + J(i + 90) * 5, J(i + 99) * 3, 0, 7); g.fill(); }
  }, em(g) { }, face: [0.12, 0.12, 0.76, 0.76] };

  // THE FACE — an enormous face that fills the corridor, emerging from the dark.
  // Its tiny pupils follow you. The longer you stare at it, the wider its mouth opens.
  // It only moves when you look away. 4 frames = mouth opening.
  D.face = { w: 128, h: 128, size: 0.98, frames: 4, draw(g, frame) {
    const open = frame / 3;
    // gaunt skull-tight skin
    const sk = g.createRadialGradient(56, 40, 6, 64, 62, 66); sk.addColorStop(0, '#d9d1c2'); sk.addColorStop(0.5, '#988e7c'); sk.addColorStop(1, '#2e2923');
    g.fillStyle = sk; g.beginPath(); g.moveTo(64, 2); g.bezierCurveTo(112, 2, 120, 50, 108, 76); g.bezierCurveTo(98, 100, 82, 124, 64, 126); g.bezierCurveTo(46, 124, 30, 100, 20, 76); g.bezierCurveTo(8, 50, 16, 2, 64, 2); g.fill();
    // hollow cheeks and temples
    for (const sx of [-1, 1]) {
      const ch = g.createRadialGradient(64 + sx * 30, 82, 0, 64 + sx * 30, 82, 20); ch.addColorStop(0, 'rgba(20,14,10,.75)'); ch.addColorStop(1, 'rgba(20,14,10,0)');
      g.fillStyle = ch; g.beginPath(); g.ellipse(64 + sx * 30, 82, 14, 22, sx * -0.25, 0, 7); g.fill();
      const tp = g.createRadialGradient(64 + sx * 46, 40, 0, 64 + sx * 46, 40, 14); tp.addColorStop(0, 'rgba(20,14,10,.6)'); tp.addColorStop(1, 'rgba(20,14,10,0)');
      g.fillStyle = tp; g.beginPath(); g.ellipse(64 + sx * 46, 40, 10, 16, 0, 0, 7); g.fill();
    }
    // brow ridge and deep sunken sockets
    for (const sx of [-1, 1]) {
      const so = g.createRadialGradient(64 + sx * 21, 46, 1, 64 + sx * 21, 46, 15); so.addColorStop(0, '#000'); so.addColorStop(0.7, 'rgba(0,0,0,.92)'); so.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = so; g.beginPath(); g.ellipse(64 + sx * 21, 46, 15, 13, 0, 0, 7); g.fill();
    }
    // nose: two dark slits, no bridge
    g.fillStyle = '#1a120e'; g.beginPath(); g.ellipse(60, 70, 2, 4, 0.3, 0, 7); g.ellipse(68, 70, 2, 4, -0.3, 0, 7); g.fill();
    // cracked skin
    g.strokeStyle = 'rgba(30,20,15,.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(40, 10); g.lineTo(46, 22); g.lineTo(43, 30); g.moveTo(92, 92); g.lineTo(84, 100); g.lineTo(88, 110); g.moveTo(98, 20); g.lineTo(90, 28); g.stroke();
    // mouth: thin lips slowly splitting into a tall black void
    g.fillStyle = '#0a0505';
    g.beginPath(); g.ellipse(64, 94 + open * 6, 16 + open * 4, 2 + open * 16, 0, 0, 7); g.fill();
    if (open > 0.3) { g.fillStyle = '#b9ae96'; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(64 + k * 4 - 1.4, 92 + open * 6 - (2 + open * 16) + 1); g.lineTo(64 + k * 4, 92 + open * 6 - (2 + open * 16) + 5); g.lineTo(64 + k * 4 + 1.4, 92 + open * 6 - (2 + open * 16) + 1); g.fill(); } }
    // fade the edges into darkness (ragged so it looks like it's coming out of the black)
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(64, 62, 30, 64, 64, 66); fade.addColorStop(0, '#000'); fade.addColorStop(0.75, 'rgba(0,0,0,.9)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'source-over';
  }, em(g, frame) {
    // tiny pupils that shift each frame, as if tracking you
    const dx = [0, 1.5, -1.5, 0.5][frame];
    g.fillStyle = '#fffaf0'; g.fillRect(64 - 21 + dx - 0.9, 46, 1.8, 1.8); g.fillRect(64 + 21 + dx - 0.9, 46, 1.8, 1.8);
  }, face: [0.05, 0.05, 0.9, 0.9] };

  const SETS = { main: ['grinner', 'shade'], horror: ['crawler', 'mass', 'face'], classic: ['ghost', 'ghost', 'shade'], new: ['widow', 'grinner', 'hollow'] };
  root.Monsters = { D, SETS };
})(window);
