/* Inverse Haunt — first-person haunted maze (raycaster). */
(function () {
  'use strict';
  const M = window.MathCore, Qs = window.Questions, R = window.Render, Snd = window.Sound;
  const $ = (id) => document.getElementById(id);

  const FLOORS = [
    { name: 'The Cellar', n: 8, monsters: 2, speed: 1.30, seals: 1, paper: '#4b4044', stripe: '#41373b', wood: '#2e221d', floor: '#3a2c24', ceil: '#1c1517',
      intro: 'Warm-up. Mapping diagrams, function notation, and swapping points. Two of them live down here.' },
    { name: 'The Kitchen', n: 9, monsters: 3, speed: 1.42, seals: 1, paper: '#4d4a3a', stripe: '#43402f', wood: '#33261a', floor: '#3e3226', ceil: '#1d1a14',
      intro: 'Inverse values, tables, and the horizontal line test. Something is rattling the pots.' },
    { name: 'The Library', n: 10, monsters: 4, speed: 1.55, seals: 1, paper: '#3b3f4f', stripe: '#333647', wood: '#2a1f1c', floor: '#35291f', ceil: '#15151c',
      intro: 'Finding inverses, domain and range swaps, and reflecting graphs in y = x. Shh.' },
    { name: 'The Nursery', n: 11, monsters: 5, speed: 1.68, seals: 1, paper: '#55404c', stripe: '#4a3642', wood: '#30201f', floor: '#3b2b29', ceil: '#1d1418',
      intro: 'Quadratics on restricted domains, rational and exponential inverses. The rocking chair is moving by itself.' },
    { name: 'The Attic', n: 12, monsters: 6, speed: 1.82, seals: 3, paper: '#44382f', stripe: '#3a2f27', wood: '#2a1d16', floor: '#3a2b20', ceil: '#140f0c',
      intro: 'The hardest problems in the house. The way out is sealed three times. They know you are here.' },
  ];

  const S = {
    mode: 'title', seed: 'x', code: '', name: '', scaredy: false, horror: false, nextStalk: 20, nextSteps: 15,
    floor: 0, attempt: 0, maze: null, player: null, monsters: [], keys: [], batts: [], door: null, sprites: [],
    keysGot: 0, sealsLeft: 1, candles: 5, battery: 100, score: 0, streak: 0, time: 0,
    deck: [], deckIdx: 0, deckCycle: 0, deckFloor: -1, stats: {}, qTotal: 0, qRight: 0, banished: 0, deaths: 0,
    invuln: 0, doorCool: 0, nextScare: 60, nextHunt: 30, blackout: 0, effects: [], dist: null, distTile: -1, dread: 0, seen: null, showMap: true, hit: 0,
    teacher: /[?&]teacher=1/.test(location.search),
  };
  const input = { keys: new Set(), mdx: 0, locked: false, touchMove: null, touchTurn: null };

  // ---------- canvases ----------
  const cv = $('game'), cx = cv.getContext('2d');
  const low = document.createElement('canvas'), lx = low.getContext('2d');
  let VW = 0, VH = 0, DPR = 1, RW = 400, RH = 225, img, buf, zbuf, cone;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    VW = window.innerWidth; VH = window.innerHeight;
    cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
    RH = VH < 500 ? 180 : 240; RW = Math.max(260, Math.min(520, Math.round(RH * VW / VH)));
    low.width = RW; low.height = RH;
    img = lx.createImageData(RW, RH); buf = new Uint32Array(img.data.buffer);
    zbuf = new Float32Array(RW); cone = new Uint16Array(RW * RH);
  }
  window.addEventListener('resize', resize); resize();

  // ---------- textures ----------
  function canvasTex(w, h, draw, drawEm) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    let em = null;
    if (drawEm) {
      const e = document.createElement('canvas'); e.width = w; e.height = h;
      const eg = e.getContext('2d'); drawEm(eg, w, h);
      const ed = eg.getImageData(0, 0, w, h).data; em = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) em[i] = ed[i * 4 + 3] > 110 ? 1 : 0;
      g.drawImage(e, 0, 0);
    }
    const d = g.getImageData(0, 0, w, h);
    return { w, h, px: new Uint32Array(d.data.buffer.slice(0)), em, canvas: c };
  }
  function seeded(seed) { const r = M.RNG(seed); return () => r.next(); }

  let TX = null;
  function buildTextures(F, sd) {
    const rnd = seeded(sd);
    const wall = (variant) => canvasTex(64, 64, (g) => {
      g.fillStyle = F.paper; g.fillRect(0, 0, 64, 64);
      g.fillStyle = F.stripe; for (let x = 0; x < 64; x += 16) g.fillRect(x + 6, 0, 4, 44);
      g.fillStyle = 'rgba(255,240,220,.07)'; for (let y = 4; y < 44; y += 10) for (let x = 2; x < 64; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y + 3); g.lineTo(x, y + 6); g.lineTo(x - 3, y + 3); g.fill(); }
      g.fillStyle = F.wood; g.fillRect(0, 44, 64, 20);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 44, 64, 2); for (let y = 49; y < 64; y += 5) g.fillRect(0, y, 64, 1);
      g.fillStyle = 'rgba(255,220,180,.08)'; g.fillRect(0, 46, 64, 1);
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(20,10,5,' + (0.1 + rnd() * 0.25) + ')'; g.beginPath(); g.ellipse(rnd() * 64, rnd() * 44, 3 + rnd() * 9, 4 + rnd() * 12, 0, 0, 7); g.fill(); }
      const grd = g.createLinearGradient(0, 0, 0, 44); grd.addColorStop(0, 'rgba(0,0,0,.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 44);
      if (variant === 1) { // scratch marks
        g.strokeStyle = 'rgba(15,5,5,.75)'; g.lineWidth = 1.2;
        for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(22 + k * 5, 10); g.lineTo(18 + k * 6, 40); g.stroke(); }
      } else if (variant === 2) { // scrawled in dried red
        g.fillStyle = 'rgba(120,10,18,.85)'; g.font = 'bold 19px Georgia, serif'; g.fillText('f', 14, 30);
        g.font = 'bold 10px Georgia, serif'; g.fillText('-1', 25, 20); g.font = 'bold 15px Georgia, serif'; g.fillText('(x)', 34, 30);
        g.fillRect(18, 31, 1.5, 6); g.fillRect(37, 31, 1.2, 9);
      } else if (variant === 3) { // handprint
        g.fillStyle = 'rgba(110,12,18,.7)'; g.beginPath(); g.ellipse(32, 26, 6, 7, 0, 0, 7); g.fill();
        for (let k = 0; k < 4; k++) { g.fillRect(25 + k * 4, 12 - (k === 1 || k === 2 ? 3 : 0), 2.5, 10); } g.fillRect(38, 22, 6, 2.5);
        g.fillRect(30, 33, 1.5, 9); g.fillRect(34, 33, 1.2, 6);
      }
    });
    TX = {
      walls: [wall(0), wall(0), wall(1), wall(0), wall(2), wall(0), wall(3)],
      floor: canvasTex(64, 64, (g) => {
        g.fillStyle = F.floor; g.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 64; y += 16) {
          g.fillStyle = 'rgba(0,0,0,' + (0.05 + rnd() * 0.15) + ')'; g.fillRect(0, y, 64, 16);
          g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, y, 64, 1.5); g.fillRect((y * 7) % 64, y, 1.5, 16);
          g.fillStyle = 'rgba(255,230,200,.05)'; for (let k = 0; k < 3; k++) g.fillRect(0, y + 3 + k * 4 + rnd() * 2, 64, 0.8);
        }
      }),
      ceil: canvasTex(64, 64, (g) => {
        g.fillStyle = F.ceil; g.fillRect(0, 0, 64, 64);
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, 10, 64);
        g.strokeStyle = 'rgba(200,200,210,.12)'; g.lineWidth = 0.6;
        for (let k = 1; k < 5; k++) { g.beginPath(); g.arc(10, 0, k * 8, 0, Math.PI / 2); g.stroke(); }
      }),
    };
  }

  function sprites() {
    const MD = window.Monsters.D, mon = {};
    for (const k in MD) mon[k] = Array.from({ length: MD[k].frames || 2 }, (_, fr) => fr).map(fr => canvasTex(MD[k].w, MD[k].h, (g) => MD[k].draw(g, fr), MD[k].em ? (g) => MD[k].em(g, fr) : null));
    const cuteGhost = (frame) => canvasTex(64, 96, (g) => {
      g.fillStyle = '#f6f6ff'; g.beginPath(); g.arc(32, 34, 22, Math.PI, 0); g.lineTo(54, 86);
      for (let i = 0; i < 4; i++) g.quadraticCurveTo(54 - i * 11 - 5.5, 76 + ((i + frame) % 2) * 10, 54 - (i + 1) * 11, 86);
      g.closePath(); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(25, 34, 3.5, 0, 7); g.arc(39, 34, 3.5, 0, 7); g.fill();
      g.fillStyle = '#ff9ab5'; g.beginPath(); g.arc(19, 42, 4, 0, 7); g.arc(45, 42, 4, 0, 7); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.arc(32, 42, 5, 0.3, Math.PI - 0.3); g.stroke();
    });
    const pumpkin = () => canvasTex(64, 64, (g) => {
      g.fillStyle = '#e8822a'; g.beginPath(); g.ellipse(32, 38, 26, 22, 0, 0, 7); g.fill();
      g.strokeStyle = '#b85d17'; g.lineWidth = 2; for (const k of [-12, 0, 12]) { g.beginPath(); g.ellipse(32 + k, 38, 8, 22, 0, 0, 7); g.stroke(); }
      g.fillStyle = '#4c7a2a'; g.fillRect(29, 10, 6, 9);
      g.fillStyle = '#3a1a05'; g.beginPath(); g.arc(23, 33, 4, 0, 7); g.arc(41, 33, 4, 0, 7); g.fill();
      g.strokeStyle = '#3a1a05'; g.lineWidth = 3; g.beginPath(); g.arc(32, 40, 10, 0.25, Math.PI - 0.25); g.stroke();
    });
    const key = canvasTex(32, 32, (g) => {
      g.strokeStyle = '#d9a640'; g.fillStyle = '#d9a640'; g.lineWidth = 3;
      g.beginPath(); g.arc(9, 16, 5, 0, 7); g.stroke(); g.fillRect(14, 14.5, 15, 3); g.fillRect(24, 17, 3, 6); g.fillRect(19, 17, 3, 4);
    }, (g) => { g.fillStyle = '#fff4c4'; g.fillRect(8, 10, 2, 2); g.fillRect(26, 14, 2, 2); g.fillStyle = '#f2c46d'; g.fillRect(15, 15, 5, 1); });
    const batt = canvasTex(32, 32, (g) => {
      g.fillStyle = '#5fae8e'; g.fillRect(10, 8, 12, 22); g.fillRect(13, 5, 6, 3);
      g.fillStyle = '#0b0812'; g.fillRect(15, 12, 2, 8); g.fillRect(12, 15, 8, 2);
    }, (g) => { g.fillStyle = '#9fe3c4'; g.fillRect(13, 5, 6, 2); });
    const door = (open) => canvasTex(64, 96, (g) => {
      g.fillStyle = '#1a0f0a'; g.fillRect(4, 4, 56, 92);
      g.fillStyle = open ? '#3e5c4c' : '#4a1d1d'; g.beginPath(); g.moveTo(10, 96); g.lineTo(10, 30); g.arc(32, 30, 22, Math.PI, 0); g.lineTo(54, 96); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 16; x < 54; x += 8) g.fillRect(x, 14, 1.5, 82);
      g.fillStyle = '#2b2b2b'; g.fillRect(10, 40, 44, 4); g.fillRect(10, 74, 44, 4);
    }, (g) => {
      g.fillStyle = open ? '#9fe3c4' : '#ff3344';
      g.fillRect(43, 56, 3, 6); g.beginPath(); g.arc(44.5, 55, 2.5, 0, 7); g.fill();
      if (open) { g.fillRect(9, 30, 1, 66); g.fillRect(54, 30, 1, 66); }
    });
    const figure = canvasTex(32, 96, (g) => {
      g.fillStyle = '#020102'; g.beginPath(); g.ellipse(16, 14, 7, 9, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(6, 24); g.lineTo(26, 24); g.lineTo(24, 96); g.lineTo(8, 96); g.fill();
    }, (g) => { g.fillStyle = '#ffffff'; g.fillRect(12, 12, 2, 2); g.fillRect(18, 12, 2, 2); });
    return { mon, cute: [cuteGhost(0), cuteGhost(1)], pumpkin: [pumpkin(), pumpkin()], key, batt, door: [door(false), door(true)], figure };
  }
  const SP = sprites();
  const MSET = (location.search.match(/[?&]monsters=(classic|new|main)/) || [0, 'main'])[1];
  const roster = () => window.Monsters.SETS[S.horror ? 'horror' : MSET];
  const GLOWH = { spider: 6, tall: 4, hanger: 5, crawler: 8, mass: 6, face: 10 };
  const GLOW = { ghost: 22, shade: 0, widow: 24, grinner: 6, hollow: 3 };

  // ---------- maze ----------
  function makeMaze(n, rng) {
    const W = 2 * n + 1, grid = new Uint8Array(W * W).fill(1);
    const open = (x, y) => { grid[y * W + x] = 0; };
    const wall = (x, y) => { grid[y * W + x] = 1; };
    const inside = (x, y) => x > 0 && y > 0 && x < W - 1 && y < W - 1;
    const seen = new Uint8Array(n * n), stack = [[0, 0]]; seen[0] = 1; open(1, 1);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // 1. a perfect maze as the skeleton
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = rng.shuffle(dirs).map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen[b * n + a]);
      if (!nb.length) { stack.pop(); continue; }
      const [a, b, ddx, ddy] = nb[0];
      seen[b * n + a] = 1; open(2 * x + 1 + ddx, 2 * y + 1 + ddy); open(2 * a + 1, 2 * b + 1); stack.push([a, b]);
    }
    // 2. open halls with pillars you can run circles around
    const rooms = 2 + Math.floor(n / 3);
    for (let r = 0; r < rooms; r++) {
      const rw = rng.int(2, 3), rh = rng.int(2, 3);
      const cx0 = rng.int(0, n - rw), cy0 = rng.int(0, n - rh);
      if (cx0 === 0 && cy0 === 0 && r === 0) continue;
      const tx0 = 2 * cx0 + 1, tx1 = 2 * (cx0 + rw - 1) + 1, ty0 = 2 * cy0 + 1, ty1 = 2 * (cy0 + rh - 1) + 1;
      for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) open(x, y);
      if (rw === 3 && rh === 3 && rng.chance(0.5)) {
        // one big central block with a corridor ringing it
        for (let y = ty0 + 1; y <= ty1 - 1; y++) for (let x = tx0 + 1; x <= tx1 - 1; x++) wall(x, y);
      } else {
        // a grid of single pillars
        for (let y = ty0 + 1; y < ty1; y += 2) for (let x = tx0 + 1; x < tx1; x += 2) wall(x, y);
      }
    }
    // 3. knock out most dead ends (leave a few as hiding places for keys)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const tx = 2 * x + 1, ty = 2 * y + 1;
      if (grid[ty * W + tx]) continue;
      const walls = dirs.filter(([dx, dy]) => grid[(ty + dy) * W + tx + dx] === 1);
      if (walls.length === 3 && rng.chance(0.8)) {
        const ok = walls.filter(([dx, dy]) => inside(tx + 2 * dx, ty + 2 * dy) && !grid[(ty + 2 * dy) * W + tx + 2 * dx]);
        if (ok.length) { const [dx, dy] = rng.pick(ok); open(tx + dx, ty + dy); }
      }
    }
    // 4. extra shortcuts through random walls between corridors
    for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!grid[y * W + x] || (x % 2) === (y % 2)) continue;
      const horiz = x % 2 === 0;
      const a = horiz ? grid[y * W + x - 1] : grid[(y - 1) * W + x], b2 = horiz ? grid[y * W + x + 1] : grid[(y + 1) * W + x];
      if (!a && !b2 && rng.chance(0.09)) open(x, y);
    }
    const variant = new Uint8Array(W * W);
    for (let i = 0; i < W * W; i++) variant[i] = Math.floor(rng.next() * 7);
    return { W, n, grid, variant };
  }
  const isWall = (tx, ty) => { const m = S.maze; return tx < 0 || ty < 0 || tx >= m.W || ty >= m.W || m.grid[ty * m.W + tx] === 1; };
  const wallAt = (x, y) => isWall(Math.floor(x), Math.floor(y));
  function bfs(tx, ty) {
    const m = S.maze, d = new Int16Array(m.W * m.W).fill(-1), q = [ty * m.W + tx]; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % m.W, y = (c / m.W) | 0;
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ax, ny = y + ay;
        if (!isWall(nx, ny) && d[ny * m.W + nx] < 0) { d[ny * m.W + nx] = d[c] + 1; q.push(ny * m.W + nx); }
      }
    }
    return d;
  }
  function lineOfSight(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(dist / 0.15);
    for (let i = 1; i < steps; i++) { const t = i / steps; if (wallAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }

  // ---------- floor setup ----------
  function startFloor() {
    const F = FLOORS[S.floor];
    const rng = M.RNG(S.seed + '|maze' + S.floor);
    S.maze = makeMaze(F.n, rng);
    const d0 = bfs(1, 1), W = S.maze.W, cells = [];
    for (let y = 1; y < W; y += 2) for (let x = 1; x < W; x += 2) {
      const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => isWall(x + a, y + b)).length;
      if (d0[y * W + x] < 0) continue;
      cells.push({ x, y, d: d0[y * W + x], dead: walls === 3 });
    }
    const maxD = Math.max(...cells.map(c => c.d));
    const door = cells.reduce((a, b) => (b.d > a.d ? b : a));
    const taken = [door, cells[0]];
    const far = (c) => Math.min(...taken.map(t => Math.hypot(t.x - c.x, t.y - c.y)));
    const keys = [];
    for (let i = 0; i < 3; i++) {
      const cand = cells.filter(c => !taken.includes(c) && c.d > maxD * 0.3);
      cand.sort((a, b) => (far(b) + (b.dead ? 3 : 0)) - (far(a) + (a.dead ? 3 : 0)));
      const pick = cand[Math.min(cand.length - 1, rng.int(0, 2))]; keys.push(pick); taken.push(pick);
    }
    const batts = rng.shuffle(cells.filter(c => !taken.includes(c) && c.d > maxD * 0.2 && c.d < maxD * 0.85)).slice(0, 2);
    batts.forEach(b => taken.push(b));
    S.door = { x: door.x + 0.5, y: door.y + 0.5, tx: door.x, ty: door.y, seen: false };
    S.keys = keys.map(k => ({ x: k.x + 0.5, y: k.y + 0.5, got: false, seen: false }));
    S.batts = batts.map(b => ({ x: b.x + 0.5, y: b.y + 0.5, got: false, seen: false }));
    S.monsters = [];
    const spawnCells = rng.shuffle(cells.filter(c => c.d >= 10 && !taken.includes(c)));
    const count = F.monsters + (S.horror ? 1 : 0);
    for (let i = 0; i < count; i++) { const c = spawnCells[i % spawnCells.length]; S.monsters.push(makeMonster(c.x, c.y, i)); }
    // face down the first open corridor
    const dir0 = [[1, 0, 0], [0, 1, Math.PI / 2]].find(([a, b]) => !isWall(1 + a, 1 + b)) || [1, 0, 0];
    S.player = { x: 1.5, y: 1.5, a: dir0[2], bob: 0, moving: 0 };
    S.keysGot = 0; S.sealsLeft = F.seals; S.battery = 100; S.candles = 5; S.invuln = 3; S.doorCool = 0;
    S.nextScare = S.horror ? 18 + Math.random() * 20 : 40 + Math.random() * 50; S.nextHunt = S.horror ? 6 + Math.random() * 6 : 22 + Math.random() * 15; S.nextStalk = 18 + Math.random() * 10; S.nextSteps = 10 + Math.random() * 10; S.blackout = 0; S.loom = null; S.effects = []; S.distTile = -1; S.dread = 0; S.hit = 0;
    S.seen = new Uint8Array(W * W);
    if (S.deckFloor !== S.floor) { S.deck = Qs.floorDeck(S.floor, S.seed, 60); S.deckIdx = 0; S.deckCycle = 0; S.deckFloor = S.floor; }
    buildTextures(F, S.seed + '|tex' + S.floor);
    updateHud();
  }
  function makeMonster(tx, ty, i) {
    return { x: tx + 0.5, y: ty + 0.5, tx, ty, ptx: tx, pty: ty, kind: roster()[i % roster().length], rx: tx + 0.5, ry: ty + 0.5, rt: 0, gl: 0, ghost: null, bob: Math.random() * 6, hunting: false, stun: 0, pose: 0, jt: 0, moving: false, twitch: 0 };
  }
  function respawnFar(mon) {
    const d = S.dist, W = S.maze.W, opts = [];
    for (let y = 1; y < W; y += 2) for (let x = 1; x < W; x += 2) if (d[y * W + x] >= 12) opts.push([x, y]);
    const [x, y] = opts.length ? opts[Math.floor(Math.random() * opts.length)] : [W - 2, W - 2];
    Object.assign(mon, { x: x + 0.5, y: y + 0.5, tx: x, ty: y, ptx: x, pty: y, hunting: false, stun: 1.5 });
  }

  // ---------- input ----------
  const KEYMAP = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', d: 'r', arrowleft: 'tl', q: 'tl', arrowright: 'tr', e: 'tr', m: 'map' };
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((S.mode === 'play' || S.mode === 'paused') && (k === 'escape' || k === 'p')) { e.preventDefault(); togglePause(); return; }
    if (S.mode !== 'play') return;
    if (k === 'm') { S.showMap = !S.showMap; return; }
    if (KEYMAP[k]) { input.keys.add(KEYMAP[k]); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.key.toLowerCase()]; if (k) input.keys.delete(k); });
  window.addEventListener('blur', () => input.keys.clear());
  cv.addEventListener('click', () => { if (S.mode === 'play' && !input.locked && cv.requestPointerLock && matchMedia('(pointer: fine)').matches) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed */ } } });
  document.addEventListener('pointerlockchange', () => { input.locked = document.pointerLockElement === cv; $('lookHint').classList.toggle('on', S.mode === 'play' && !input.locked && matchMedia('(pointer: fine)').matches); });
  document.addEventListener('mousemove', (e) => { if (input.locked && S.mode === 'play') input.mdx += e.movementX; });
  // touch: left half = walk joystick, right half = turn
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || S.mode !== 'play') return;
    const t = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    if (e.clientX < VW / 2) input.touchMove = t; else input.touchTurn = t;
  });
  cv.addEventListener('pointermove', (e) => {
    for (const t of [input.touchMove, input.touchTurn]) if (t && t.id === e.pointerId) {
      if (t === input.touchTurn) input.mdx += (e.clientX - t.x) * 1.4;
      t.x = e.clientX; t.y = e.clientY;
    }
  });
  const endTouch = (e) => { if (input.touchMove && input.touchMove.id === e.pointerId) input.touchMove = null; if (input.touchTurn && input.touchTurn.id === e.pointerId) input.touchTurn = null; };
  cv.addEventListener('pointerup', endTouch); cv.addEventListener('pointercancel', endTouch);
  function releaseMouse() { if (document.pointerLockElement) document.exitPointerLock(); }

  // ---------- update ----------
  const RAD = 0.22;
  const blocked = (x, y) => wallAt(x - RAD, y - RAD) || wallAt(x + RAD, y - RAD) || wallAt(x - RAD, y + RAD) || wallAt(x + RAD, y + RAD);
  const beamRange = () => (4.6 + 5.4 * Math.min(1, S.battery / 40)) * (S.horror ? 0.82 : 1);
  function angTo(x, y) { const p = S.player; let a = Math.atan2(y - p.y, x - p.x) - p.a; return Math.atan2(Math.sin(a), Math.cos(a)); }
  function inBeam(x, y) {
    const p = S.player, d = Math.hypot(x - p.x, y - p.y);
    return S.blackout <= 0 && d < beamRange() && Math.abs(angTo(x, y)) < 0.4 && lineOfSight(p.x, p.y, x, y);
  }

  function update(dt) {
    const p = S.player, F = FLOORS[S.floor];
    S.time += dt; S.invuln -= dt; S.doorCool -= dt; S.hit = Math.max(0, S.hit - dt * 2);
    // turning
    let turn = 0;
    if (input.keys.has('tl')) turn -= 2.4; if (input.keys.has('tr')) turn += 2.4;
    p.a += turn * dt + input.mdx * 0.0026; input.mdx = 0;
    // moving
    let fw = 0, st = 0;
    if (input.keys.has('f')) fw += 1; if (input.keys.has('b')) fw -= 1;
    if (input.keys.has('r')) st += 1; if (input.keys.has('l')) st -= 1;
    if (input.touchMove) { const t = input.touchMove; fw += Math.max(-1, Math.min(1, -(t.y - t.y0) / 50)); st += Math.max(-1, Math.min(1, (t.x - t.x0) / 50)); }
    const dX = Math.cos(p.a), dY = Math.sin(p.a);
    let vx = dX * fw - dY * st, vy = dY * fw + dX * st;
    const len = Math.hypot(vx, vy);
    if (len > 0.05) {
      const sp = 2.35 * dt * Math.min(1, len) / len;
      if (!blocked(p.x + vx * sp, p.y)) p.x += vx * sp;
      if (!blocked(p.x, p.y + vy * sp)) p.y += vy * sp;
      const before = p.bob; p.bob += dt * 9; p.moving = Math.min(1, p.moving + dt * 5);
      if (Math.floor(p.bob / Math.PI) !== Math.floor(before / Math.PI)) Snd.step();
    } else p.moving = Math.max(0, p.moving - dt * 4);

    S.battery = Math.max(0, S.battery - dt * (S.horror ? 0.68 : 0.42));
    if (S.horror && S.blackout <= 0 && Math.random() < dt * 0.04) S.blackout = 0.25 + Math.random() * 0.5; // the light dies for a moment, for no reason
    S.blackout = Math.max(0, S.blackout - dt);

    for (const k of S.keys) if (!k.got && Math.hypot(k.x - p.x, k.y - p.y) < 0.5) {
      k.got = true; S.keysGot++; S.score += 50; Snd.key();
      toast(S.keysGot === 3 ? 'All keys found' : 'Key ' + S.keysGot + ' of 3', S.keysGot === 3 ? 'The door is marked on your map' : '');
      if (S.horror) { S.monsters.forEach(m => { m.hunting = true; }); setTimeout(() => { if (S.mode === 'play') { toast('They all heard that'); Snd.whisper(); } }, 700); }
      else wakeOne('You hear something stir');
    }
    for (const b of S.batts) if (!b.got && Math.hypot(b.x - p.x, b.y - p.y) < 0.5) { b.got = true; S.battery = 100; S.score += 10; Snd.battery(); toast('Fresh batteries'); }
    const ptx = Math.floor(p.x), pty = Math.floor(p.y);
    if (ptx === S.door.tx && pty === S.door.ty && S.doorCool <= 0) {
      if (S.keysGot < 3) { toast('Locked', 'Find all 3 keys first'); S.doorCool = 2.5; }
      else { S.doorCool = 1.2; doorQuestion(); return; }
    }

    const pt = pty * S.maze.W + ptx;
    if (pt !== S.distTile) { S.dist = bfs(ptx, pty); S.distTile = pt; }

    // the hunt: every so often, the nearest idle monster starts tracking you
    S.nextHunt -= dt;
    if (S.nextHunt <= 0) { S.nextHunt = S.horror ? 8 + Math.random() * 8 : 18 + Math.random() * 18; wakeOne(S.scaredy ? 'A ghost wants to play' : 'Something is hunting you'); }

    if (S.loom) { if (updateLoom(dt)) return; }
    let near = 99, nearMon = null, seenD = 99, seenMon = null;
    for (const mon of S.monsters) {
      mon.bob += dt * 3; mon.stun = Math.max(0, mon.stun - dt);
      const pd = S.dist[mon.ty * S.maze.W + mon.tx], eu = Math.hypot(mon.x - p.x, mon.y - p.y);
      if (!mon.hunting && (pd >= 0 && pd <= 8 || (eu < 7 && lineOfSight(mon.x, mon.y, p.x, p.y)))) mon.hunting = true;
      if (mon.hunting && pd > 22) mon.hunting = false;
      if (mon.hunting && pd >= 0 && pd < near) { near = pd; nearMon = mon; }
      // the wail is only audible when nothing blocks the line between you and it
      if (mon.hunting && eu < 12 && eu < seenD && lineOfSight(p.x, p.y, mon.x, mon.y)) { seenD = eu; seenMon = mon; }
      mon.lit = inBeam(mon.x, mon.y);
      const behind = Math.abs(angTo(mon.x, mon.y)) > 0.75;
      let sp = mon.hunting ? F.speed * (mon.lit ? 0.45 : behind ? 1.2 : 1) : 0.8;
      if (mon.kind === 'grinner') {
        // broken-puppet motion: dead still, then a sudden lurch with a head snap
        mon.jt = (mon.jt || 0) - dt;
        if (mon.jt <= 0) {
          mon.moving = !mon.moving;
          if (mon.moving) {
            mon.jt = 0.12 + Math.random() * 0.22;
            mon.pose = (mon.pose + 1 + Math.floor(Math.random() * 4)) % 5;
            if (eu < 10) Snd.crack((1 - eu / 10) * 0.9, Math.sin(angTo(mon.x, mon.y)));
          } else mon.jt = mon.lit ? 0.7 + Math.random() * 0.9 : 0.15 + Math.random() * 0.5;
        }
        if (mon.lit && !mon.moving && Math.random() < dt * 3) { mon.pose = (mon.pose + 1 + Math.floor(Math.random() * 4)) % 5; mon.twitch = 0.08; }
        mon.twitch = Math.max(0, (mon.twitch || 0) - dt);
        const base = mon.hunting ? F.speed * (behind ? 1.2 : 1) : 0.8;
        sp = mon.moving ? base * (mon.lit ? 1.1 : 2.6) : 0;
      }
      if (S.horror) sp = horrorMove(mon, dt, eu, sp, F);
      if (S.scaredy) sp *= 0.8;
      if (mon.stun > 0) sp = 0;
      const gx = mon.tx + 0.5, gy = mon.ty + 0.5, ddx = gx - mon.x, ddy = gy - mon.y, dd = Math.hypot(ddx, ddy);
      if (dd < 0.04) {
        mon.x = gx; mon.y = gy;
        const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [mon.tx + a, mon.ty + b]).filter(([a, b]) => !isWall(a, b));
        let next;
        if (mon.hunting) next = nbs.reduce((best, c) => (S.dist[c[1] * S.maze.W + c[0]] < S.dist[best[1] * S.maze.W + best[0]] ? c : best));
        else { const fwd = nbs.filter(([a, b]) => a !== mon.ptx || b !== mon.pty); const pool = fwd.length ? fwd : nbs; next = pool[Math.floor(Math.random() * pool.length)]; }
        mon.ptx = mon.tx; mon.pty = mon.ty; mon.tx = next[0]; mon.ty = next[1];
      } else { const s2 = Math.min(dd, sp * dt); mon.x += ddx / dd * s2; mon.y += ddy / dd * s2; }
      // last stretch: when in the same corridor and close, lunge straight at you
      if (mon.hunting && eu < 1.2 && mon.stun <= 0 && sp > 0 && (mon.kind !== 'grinner' || mon.moving) && lineOfSight(mon.x, mon.y, p.x, p.y)) { const s3 = sp * dt * 0.8; mon.x += (p.x - mon.x) / eu * s3; mon.y += (p.y - mon.y) / eu * s3; }
      // the Face, with your back turned: it closes in and leans over you instead of grabbing you
      if (S.horror && mon.kind === 'face' && !S.loom && S.invuln <= 0 && mon.hunting && eu < 1.8 && Math.abs(angTo(mon.x, mon.y)) > 1.5 && lineOfSight(p.x, p.y, mon.x, mon.y)) { startLoom(mon); return; }
      if (S.invuln <= 0 && eu < 0.45 && !(S.loom && S.loom.mon === mon)) { caught(mon); return; }
    }
    S.dread = near <= 7 ? Math.max(0.05, 1 - near / 7) : 0;
    if (S.scaredy) S.dread *= 0.3;
    Snd.setHeart(S.dread > 0 && !S.scaredy ? S.dread : 0);
    Snd.setDread(S.dread);
    Snd.setWail(seenMon && !S.scaredy ? Math.max(0.1, Math.pow(1 - seenD / 12, 1.2)) : 0, seenMon ? Math.sin(angTo(seenMon.x, seenMon.y)) : 0);

    S.nextScare -= dt;
    if (S.nextScare <= 0) { S.nextScare = S.horror ? 22 + Math.random() * 25 : 45 + Math.random() * 70; ambientScare(); }
    if (S.horror) {
      // something gets behind you
      S.nextStalk -= dt;
      if (S.nextStalk <= 0) { S.nextStalk = 16 + Math.random() * 12; stalk(); }
      // footsteps right behind you... that stop when you turn around
      S.nextSteps -= dt;
      if (S.nextSteps <= 0) { S.nextSteps = 12 + Math.random() * 16; S.steps = { n: 4 + Math.floor(Math.random() * 4), t: 0, a: p.a }; }
      if (S.steps) { S.steps.t -= dt; if (Math.abs(Math.atan2(Math.sin(p.a - S.steps.a), Math.cos(p.a - S.steps.a))) > 1.2) S.steps = null; else if (S.steps.t <= 0) { Snd.behindStep(); S.steps.t = 0.42; if (--S.steps.n <= 0) S.steps = null; } }
    }
    for (const e of S.effects) e.t += dt;
    S.effects = S.effects.filter(e => e.t < e.dur);
    updateHud();
  }
  // ---- Horrifying-mode movement: every monster moves wrong ----
  function onScreen(mon) { const p = S.player; return Math.abs(angTo(mon.x, mon.y)) < 0.62 && lineOfSight(p.x, p.y, mon.x, mon.y); }
  function horrorMove(mon, dt, eu, sp, F) {
    const base = (mon.hunting ? F.speed * 1.15 : 0.9);
    mon.jt -= dt; mon.gl = Math.max(0, mon.gl - dt);
    if (mon.kind === 'crawler') {
      // drags itself in frantic bursts, limbs pumping; then dead still while its head twists sideways and looks at you.
      // close up it rears back on its arms and lunges.
      const P = S.player, toP = Math.atan2(P.y - mon.y, P.x - mon.x);
      mon.anim = (mon.anim || 0) + dt;
      if (mon.jt <= 0) {
        mon.moving = !mon.moving;
        mon.jt = mon.moving ? 0.35 + Math.random() * 0.55 : 0.25 + Math.random() * (mon.lit ? 1.1 : 0.6);
        if (!mon.moving) {
          mon.rollT = (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.8); // the head wrenches sideways
          if (eu < 10) Snd.crack(Math.min(1, 1.2 - eu / 10), Math.sin(angTo(mon.x, mon.y)));
        } else mon.rollT = (Math.random() - 0.5) * 0.4;
      }
      mon.phase = (mon.phase || 0) + dt * (mon.moving ? 13 : 0.6);
      mon.roll = (mon.roll || 0) + ((mon.rollT || 0) - (mon.roll || 0)) * Math.min(1, dt * (mon.moving ? 6 : 22));
      const goal = mon.moving ? Math.atan2(mon.ty + 0.5 - mon.y, mon.tx + 0.5 - mon.x) : toP;
      mon.yaw = mon.yaw == null ? goal : mon.yaw + Math.atan2(Math.sin(goal - mon.yaw), Math.cos(goal - mon.yaw)) * Math.min(1, dt * (mon.moving ? 9 : 3));
      const rel = Math.atan2(Math.sin(toP - mon.yaw), Math.cos(toP - mon.yaw));
      mon.look = -Math.max(-1.7, Math.min(1.7, rel));
      mon.rear = (mon.rear || 0) + (((eu < 2.6 && mon.hunting) ? 1 : 0) - (mon.rear || 0)) * Math.min(1, dt * 3);
      mon.lunge = (mon.lunge || 0) + (((eu < 1.3 && mon.hunting) ? 1 : 0) - (mon.lunge || 0)) * Math.min(1, dt * 6);
      mon.jaw = (mon.jaw || 0) + (((!mon.moving || eu < 2.5) ? 1 : 0.2) - (mon.jaw || 0)) * Math.min(1, dt * 4);
      if (Math.random() < dt * 0.8) mon.gl = 0.1;
      return mon.moving ? base * (mon.lit ? 1.25 : 2.4) : 0;
    }
    if (mon.kind === 'spider') {
      // scuttling bursts with limbs flickering, then dead still while the head wrenches around
      if (mon.jt <= 0) {
        mon.moving = !mon.moving;
        mon.jt = mon.moving ? 0.25 + Math.random() * 0.45 : 0.2 + Math.random() * (mon.lit ? 1.2 : 0.7);
        if (!mon.moving) { mon.pose = Math.random() < 0.6 ? 4 + Math.floor(Math.random() * 2) : mon.pose; if (eu < 10) Snd.crack((1 - eu / 10), Math.sin(angTo(mon.x, mon.y))); }
      }
      if (mon.moving) { mon.ft = (mon.ft || 0) - dt; if (mon.ft <= 0) { mon.pose = (mon.pose + 1) % 4; mon.ft = 0.045; } }
      if (Math.random() < dt * 1.5) mon.gl = 0.12; // glitch jump
      return mon.moving ? base * (mon.lit ? 1.3 : 2.5) : 0;
    }
    if (mon.kind === 'tall') {
      // only moves while you are not looking at it
      const watched = onScreen(mon);
      if (watched) { if (Math.random() < dt * 2.5) { mon.pose = Math.floor(Math.random() * 4); mon.gl = 0.06; } return 0; }
      if (mon.jt <= 0) { mon.jt = 0.5; mon.pose = Math.floor(Math.random() * 4); }
      return base * 1.6;
    }
    if (mon.kind === 'face') {
      // a staring contest: frozen while you look at it, but its mouth keeps opening;
      // the moment you look away it slides toward you
      const watched = onScreen(mon);
      mon.stare = Math.max(0, Math.min(3.99, (mon.stare || 0) + (watched ? dt * 0.8 : -dt * 1.5)));
      mon.pose = Math.floor(mon.stare);
      if (watched) { if (Math.random() < dt * 1.2) mon.gl = 0.05; return 0; }
      return base * 1.7;
    }
    if (mon.kind === 'mass') {
      // a slow heave that never stops; arms all reach for you when it's close; it shudders
      const P = S.player, toP = Math.atan2(P.y - mon.y, P.x - mon.x);
      mon.anim = (mon.anim || 0) + dt * (eu < 3 ? 1.8 : 1);
      mon.yaw = mon.yaw == null ? toP : mon.yaw + Math.atan2(Math.sin(toP - mon.yaw), Math.cos(toP - mon.yaw)) * Math.min(1, dt * 2);
      mon.reach = (mon.reach || 0) + (Math.max(0, Math.min(1, 1 - (eu - 0.8) / 3)) - (mon.reach || 0)) * Math.min(1, dt * 3);
      mon.scream = mon.reach;
      mon.ft = (mon.ft || 0) - dt;
      if (mon.ft <= 0) { mon.pose = (mon.pose + 1) % 4; mon.ft = 0.18 + Math.random() * 0.2; }
      if (eu < 4 && Math.random() < dt * 4) mon.gl = 0.06;
      return base * (mon.lit ? 0.6 : 1.05);
    }
    if (mon.kind === 'hanger') {
      // convulsing, never still; worse the closer it gets
      mon.ft = (mon.ft || 0) - dt;
      if (mon.ft <= 0) { mon.pose = Math.floor(Math.random() * 4); mon.ft = eu < 4 ? 0.03 + Math.random() * 0.05 : 0.08 + Math.random() * 0.2; }
      if (eu < 5 && Math.random() < dt * 3) mon.gl = 0.08;
      return base * (mon.lit ? 0.7 : 1.25);
    }
    return sp;
  }
  // ---- The Face looming over you from behind ----
  const LOOM_TIME = 3.2;
  function startLoom(mon) {
    const p = S.player;
    S.loom = { mon, t: 0, ox: -Math.cos(p.a) * 0.6, oy: -Math.sin(p.a) * 0.6 };
    Snd.whisper();
  }
  // returns true when the loom has ended in a catch
  function updateLoom(dt) {
    const L = S.loom, p = S.player, mon = L.mon;
    L.t += dt;
    // it stays glued to the spot behind you (it follows you, but not when you turn), so turning around shows it right there
    const bx = p.x + L.ox, by = p.y + L.oy;
    mon.x = mon.rx = bx; mon.y = mon.ry = by; mon.stun = 1;
    const u = Math.min(1, L.t / LOOM_TIME);
    mon.stare = u * 3.99; mon.pose = Math.floor(mon.stare);
    Snd.setWail(0.25 + 0.75 * u, 0); Snd.setDread(0.4 + 0.6 * u); Snd.setHeart(0.4 + 0.6 * u);
    S.dread = 0.3 + 0.7 * u;
    // turn around and look at it, or wait until it's fully over you: either way it gets you
    const looked = L.t > 0.4 && Math.abs(angTo(mon.x, mon.y)) < 0.9;
    if (L.t >= LOOM_TIME || looked) { S.loom = null; caught(mon); return true; }
    return false;
  }
  function drawLoom() {
    const u = Math.min(1, S.loom.t / LOOM_TIME), e = u * u * (3 - 2 * u);
    const tex = SP.mon.face[Math.min(3, Math.floor(u * 3.99))].canvas;
    // darken everything as it blots out the room
    cx.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.55 * e) + ')'; cx.fillRect(0, 0, VW, VH);
    const w = Math.max(VW, VH) * (0.55 + 0.75 * e), h = w;
    const cxp = VW / 2 + Math.sin(S.loom.t * 1.1) * VW * 0.025;
    const cyp = -h * 0.5 + (h * 0.5 + VH * 0.34) * e; // descends from above your head
    cx.save(); cx.translate(cxp, cyp); cx.rotate(Math.PI + Math.sin(S.loom.t * 0.8) * 0.06);
    cx.imageSmoothingEnabled = false; cx.globalAlpha = 0.55 + 0.45 * e;
    cx.drawImage(tex, -w / 2, -h / 2, w, h);
    cx.restore(); cx.globalAlpha = 1;
    // shadow falling across the top of the view
    const sh = cx.createLinearGradient(0, 0, 0, VH * 0.6); sh.addColorStop(0, 'rgba(0,0,0,' + 0.6 * e + ')'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = sh; cx.fillRect(0, 0, VW, VH * 0.6);
  }
  // a hunter that has lost you slips around behind you
  function stalk() {
    const p = S.player, W = S.maze.W, d = S.dist;
    const cand = S.monsters.filter(m => m.hunting && m.stun <= 0 && !lineOfSight(p.x, p.y, m.x, m.y) && d[m.ty * W + m.tx] >= 8);
    if (!cand.length) return;
    const mon = cand[Math.floor(Math.random() * cand.length)], spots = [];
    for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) {
      const v = d[y * W + x]; if (v < 4 || v > 7) continue;
      if (Math.abs(angTo(x + 0.5, y + 0.5)) < 2.1) continue;
      spots.push([x, y]);
    }
    if (!spots.length) return;
    const [x, y] = spots[Math.floor(Math.random() * spots.length)];
    Object.assign(mon, { x: x + 0.5, y: y + 0.5, rx: x + 0.5, ry: y + 0.5, tx: x, ty: y, ptx: x, pty: y, stun: 0.6 });
    Snd.crack(0.9, Math.sin(angTo(mon.x, mon.y)));
  }
  function wakeOne(msg) {
    const idle = S.monsters.filter(m => !m.hunting);
    if (!idle.length) return;
    const d = S.dist || bfs(Math.floor(S.player.x), Math.floor(S.player.y));
    idle.sort((a, b) => d[a.ty * S.maze.W + a.tx] - d[b.ty * S.maze.W + b.tx]);
    idle[0].hunting = true; setTimeout(() => { if (S.mode === 'play') { toast(msg); Snd.whisper(); } }, 900);
  }

  // ---------- baked 3D monsters (tools/bake_monsters.py) ----------
  // each sheet: rows = 8 view angles around the monster, cols = animation frames
  const BK = {};
  (function loadBaked() {
    const meta = window.BAKED_MONSTERS || {};
    for (const kind in meta) {
      const m = meta[kind], img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        const cells = [];
        for (let a = 0; a < m.angles; a++) {
          cells.push([]);
          for (let f = 0; f < m.frames; f++) {
            const d = g.getImageData(f * m.cw, a * m.ch, m.cw, m.ch), px = new Uint32Array(d.data.buffer.slice(0)), em = new Uint8Array(m.cw * m.ch);
            for (let i = 0; i < em.length; i++) { const al = d.data[i * 4 + 3]; em[i] = al > 200 && al < 254 ? 1 : 0; if (al > 0) px[i] |= 0xff000000; }
            cells[a].push({ w: m.cw, h: m.ch, px, em });
          }
        }
        BK[kind] = { m, cells, scare: null };
        if (m.scare) { const si = new Image(); si.onload = () => { BK[kind].scare = si; }; si.src = 'assets/monsters/' + kind + '_scare.png'; }
      };
      img.src = 'assets/monsters/' + kind + '.png';
    }
  })();
  function bakedCell(mon) {
    const B = BK[mon.kind]; if (!B) return null;
    const p = S.player, rel = Math.atan2(p.y - mon.y, p.x - mon.x) - (mon.yaw || 0);
    const a = ((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8;
    let f;
    if (mon.kind === 'crawler') f = mon.moving ? Math.floor(((mon.phase || 0) / (Math.PI * 2)) * 6) % 6 : ((mon.roll || 0) > 0 ? 6 : 7);
    else f = Math.floor((mon.anim || 0) * 4) % B.m.frames;
    return { tex: B.cells[a][(f + B.m.frames) % B.m.frames], m: B.m };
  }

  // ---------- rendering (raycaster) ----------
  const FOV_PLANE = 0.66;
  function shade(c, L, warm) {
    let r = ((c & 255) * L) >> 8, g = (((c >> 8) & 255) * L) >> 8, b = (((c >> 16) & 255) * L) >> 8;
    if (warm) { b = (b * 210) >> 8; g = (g * 238) >> 8; }
    if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
    return 0xff000000 | (b << 16) | (g << 8) | r;
  }
  function render() {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!S.maze || !TX) { cx.fillStyle = '#050307'; cx.fillRect(0, 0, VW, VH); return; }
    const p = S.player, t = S.time;
    const dirX = Math.cos(p.a), dirY = Math.sin(p.a), plX = -dirY * FOV_PLANE, plY = dirX * FOV_PLANE;
    const bobPx = Math.sin(p.bob) * 2.2 * p.moving;
    const horizon = Math.round(RH / 2 + bobPx), posZ = RH / 2;
    // flashlight cone (sways with walking)
    const flashOn = S.blackout <= 0;
    // no flicker: a dying battery and blackouts fade the beam smoothly (photosensitivity-safe)
    S.beamLvl = S.beamLvl == null ? 1 : S.beamLvl;
    const beamTarget = !flashOn ? 0 : S.battery < 15 ? 0.45 + 0.4 * (S.battery / 15) : 1;
    S.beamLvl += (beamTarget - S.beamLvl) * 0.08;
    let flash = S.beamLvl;
    const ccx = RW / 2 + Math.cos(p.bob * 0.5) * 6 * p.moving, ccy = RH / 2 + 8 + Math.abs(Math.sin(p.bob)) * 4 * p.moving;
    const rx = RW * 0.44, ry = RH * 0.72;
    for (let y = 0; y < RH; y++) {
      const ny = (y - ccy) / ry, ny2 = ny * ny, row = y * RW;
      for (let x = 0; x < RW; x++) {
        const nx = (x - ccx) / rx; let c = 1 - (nx * nx + ny2);
        if (c <= 0) { cone[row + x] = 0; continue; }
        cone[row + x] = (c * (0.5 + 0.5 * c) * 255 * flash) | 0;
      }
    }
    const range = beamRange();
    const amb0 = S.scaredy ? 60 : 24, ambR = S.scaredy ? 7 : 3, ambFloor = S.scaredy ? 16 : 3;
    const ambient = (d) => (d < ambR ? (amb0 * (1 - d / ambR)) | 0 : 0) + ambFloor;
    const fall = (d) => { const u = 1 - d / range; return u > 0 ? (430 * u * Math.sqrt(u)) | 0 : 0; };

    // floor + ceiling
    const r0x = dirX - plX, r0y = dirY - plY, r1x = dirX + plX, r1y = dirY + plY;
    const FT = TX.floor.px, CT = TX.ceil.px;
    for (let y = 0; y < RH; y++) {
      const isFloor = y > horizon, pp = isFloor ? y - horizon : horizon - y, row = y * RW;
      if (pp < 1) { for (let x = 0; x < RW; x++) buf[row + x] = 0xff000000; continue; }
      const rd = posZ / pp, am = ambient(rd), fl = fall(rd);
      const stx = rd * (r1x - r0x) / RW, sty = rd * (r1y - r0y) / RW;
      let fx = p.x + rd * r0x, fy = p.y + rd * r0y;
      const T = isFloor ? FT : CT;
      for (let x = 0; x < RW; x++) {
        const tx = ((fx - Math.floor(fx)) * 64) & 63, ty = ((fy - Math.floor(fy)) * 64) & 63;
        fx += stx; fy += sty;
        const L = am + ((cone[row + x] * fl) >> 8);
        buf[row + x] = L <= 1 ? 0xff000000 : shade(T[ty * 64 + tx], L, true);
      }
    }
    // walls
    const W = S.maze.W, seen = S.seen;
    for (let x = 0; x < RW; x++) {
      const camX = 2 * x / RW - 1, rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mx = Math.floor(p.x), my = Math.floor(p.y);
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      let sx, sy, sdx, sdy, side = 0;
      if (rdx < 0) { sx = -1; sdx = (p.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - p.x) * ddx; }
      if (rdy < 0) { sy = -1; sdy = (p.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - p.y) * ddy; }
      let hitW = false, guard = 0, trav = 0;
      while (!hitW && guard++ < 64) {
        if (sdx < sdy) { trav = sdx; sdx += ddx; mx += sx; side = 0; } else { trav = sdy; sdy += ddy; my += sy; side = 1; }
        if (trav < range + 0.5 && mx >= 0 && my >= 0 && mx < W && my < W) seen[my * W + mx] = 1;
        if (isWall(mx, my)) hitW = true;
      }
      const perp = side === 0 ? sdx - ddx : sdy - ddy;
      zbuf[x] = perp;
      const lh = Math.floor(RH / perp);
      let ds = Math.floor(-lh / 2 + horizon), de = Math.floor(lh / 2 + horizon);
      if (ds < 0) ds = 0; if (de >= RH) de = RH - 1;
      let wx = side === 0 ? p.y + perp * rdy : p.x + perp * rdx; wx -= Math.floor(wx);
      let tx = (wx * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = 63 - tx;
      const tex = (mx >= 0 && my >= 0 && mx < W && my < W) ? TX.walls[S.maze.variant[my * W + mx]].px : TX.walls[0].px;
      const step = 64 / lh; let tp = (ds - horizon + lh / 2) * step;
      const am = ambient(perp), fl = fall(perp), sm = side ? 205 : 256;
      for (let y = ds; y <= de; y++) {
        const ty = (tp | 0) & 63; tp += step;
        const L = (((am + ((cone[y * RW + x] * fl) >> 8)) * sm) >> 8);
        buf[y * RW + x] = L <= 1 ? 0xff000000 : shade(tex[ty * 64 + tx], L, true);
      }
    }
    // sprites
    const list = [];
    for (const k of S.keys) if (!k.got) list.push({ x: k.x, y: k.y, tex: SP.key, size: 0.26, lift: 0.32 + Math.sin(t * 2.5) * 0.04, glow: 18, ref: k });
    for (const b of S.batts) if (!b.got) list.push({ x: b.x, y: b.y, tex: SP.batt, size: 0.24, lift: 0, glow: 12, ref: b });
    list.push({ x: S.door.x, y: S.door.y, tex: SP.door[S.keysGot === 3 ? 1 : 0], size: 0.95, lift: 0, glow: 10, ref: S.door });
    for (const mon of S.monsters) {
      const fr = Math.floor(mon.bob * 0.8) % 2, d = Math.hypot(mon.x - p.x, mon.y - p.y);
      let tex, size, glow;
      if (S.scaredy) { const pk = mon.kind === 'shade' || mon.kind === 'hollow'; tex = pk ? SP.pumpkin[0] : SP.cute[fr]; size = pk ? 0.45 : 0.7; glow = 70; }
      else { const nf = SP.mon[mon.kind].length; tex = SP.mon[mon.kind][nf > 2 ? mon.pose % nf : fr]; size = window.Monsters.D[mon.kind].size; glow = (GLOW[mon.kind] ?? GLOWH[mon.kind] ?? 0) + (mon.hunting ? 10 : 0); }
      const jit = !S.scaredy && mon.hunting && d < 3 ? (Math.random() - 0.5) * 0.06 * (3 - d) : 0;
      let lift = S.scaredy ? 0.1 + Math.sin(mon.bob) * 0.05 : 0.02 + Math.sin(mon.bob) * 0.03, gx = 0;
      if (mon.kind === 'grinner' && !S.scaredy) { lift = mon.moving ? Math.random() * 0.04 : 0; if (mon.twitch > 0) gx = (Math.random() - 0.5) * 0.12; }
      const sx2 = -Math.sin(p.a) * gx, sy2 = Math.cos(p.a) * gx;
      const bc = S.horror && !S.scaredy ? bakedCell(mon) : null;
      if (bc) {
        let mx3 = mon.rx, my3 = mon.ry;
        if (mon.gl > 0) { const k = (Math.random() - 0.5) * 0.3; mx3 += -Math.sin(p.a) * k; my3 += Math.cos(p.a) * k; }
        mon.rt -= 1 / 60;
        if (mon.rt <= 0) { mon.rx = mon.x; mon.ry = mon.y; mon.rt = 0.05 + Math.random() * 0.08; }
        list.push({ x: mx3, y: my3, tex: bc.tex, size: bc.m.worldH, lift: bc.m.lift, glow: GLOWH[mon.kind] || 0, mon: true });
        continue;
      }
      let mx = mon.x, my = mon.y;
      if (S.horror && !S.scaredy) {
        // stop-motion: the drawn position only catches up in jumps
        mon.rt -= 1 / 60;
        if (mon.rt <= 0) { mon.ghost = [mon.rx, mon.ry]; mon.rx = mon.x; mon.ry = mon.y; mon.rt = 0.06 + Math.random() * 0.12; }
        mx = mon.rx; my = mon.ry;
        if (mon.gl > 0) { const k = (Math.random() - 0.5) * (mon.kind === 'mass' || mon.kind === 'face' ? 0.15 : 0.5); mx += -Math.sin(p.a) * k; my += Math.cos(p.a) * k; }
        if (window.Monsters.D[mon.kind].ceiling) lift = 1 - size;
        else lift = mon.kind === 'spider' && mon.moving ? Math.random() * 0.03 : 0;
        if (mon.ghost && mon.rt > 0.04) list.push({ x: mon.ghost[0], y: mon.ghost[1], tex, size, lift, glow: 0, mon: true, faint: true });
      }
      list.push({ x: mx + jit + sx2, y: my + jit + sy2, tex, size, lift, glow, mon: true });
    }
    for (const e of S.effects) if (e.kind === 'figure') list.push({ x: e.x, y: e.y, tex: SP.figure, size: 1.05, lift: 0, glow: 0 });
    for (const s of list) s.d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
    list.sort((a, b) => b.d - a.d);
    const invDet = 1 / (plX * dirY - dirX * plY);
    for (const s of list) {
      const rx2 = s.x - p.x, ry2 = s.y - p.y;
      const tX = invDet * (dirY * rx2 - dirX * ry2), tY = invDet * (-plY * rx2 + plX * ry2);
      if (tY < 0.12) continue;
      const scrX = (RW / 2) * (1 + tX / tY);
      const hPx = (RH / tY) * s.size, wPx = hPx * s.tex.w / s.tex.h;
      const floorY = horizon + RH / (2 * tY), bottom = floorY - (s.lift * RH) / tY, top = bottom - hPx;
      const x0 = Math.max(0, Math.floor(scrX - wPx / 2)), x1 = Math.min(RW - 1, Math.floor(scrX + wPx / 2));
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(RH - 1, Math.floor(bottom));
      const am = ambient(tY), fl = fall(tY), T = s.tex;
      let drew = false;
      for (let x = x0; x <= x1; x++) {
        if (tY >= zbuf[x]) continue;
        const tx = Math.min(T.w - 1, ((x - (scrX - wPx / 2)) / wPx * T.w) | 0);
        for (let y = y0; y <= y1; y++) {
          const ty = Math.min(T.h - 1, ((y - top) / hPx * T.h) | 0), i = ty * T.w + tx, c = T.px[i];
          if ((c >>> 24) < 128 || (s.faint && ((x + y) & 1))) continue;
          if (T.em && T.em[i]) { buf[y * RW + x] = c | 0xff000000; drew = true; continue; }
          const L = am + ((cone[y * RW + x] * fl) >> 8) + s.glow;
          buf[y * RW + x] = L <= 1 ? 0xff000000 : shade(c, L, !s.mon);
          drew = true;
        }
      }
      if (drew && s.ref && tY < range) s.ref.seen = true;
    }
    // static when something is close
    if (S.dread > 0.15 && !S.scaredy) {
      const n = (S.dread * S.dread * RW * RH * 0.08) | 0;
      for (let i = 0; i < n; i++) { const v = (Math.random() * 120) | 0; buf[(Math.random() * RW * RH) | 0] = 0xff000000 | (v << 16) | (v << 8) | v; }
    }
    if (S.horror) { const n = (RW * RH * 0.02) | 0; for (let i = 0; i < n; i++) { const v = (Math.random() * 70) | 0; buf[(Math.random() * RW * RH) | 0] = 0xff000000 | (v << 16) | (v << 8) | v; } }
    lx.putImageData(img, 0, 0);
    // blit to screen
    cx.imageSmoothingEnabled = false;
    const shake = (S.hit > 0 ? S.hit * 14 : 0) + (S.dread > 0.6 && !S.scaredy ? (S.dread - 0.6) * 8 : 0);
    const ox = (Math.random() - 0.5) * shake, oy = (Math.random() - 0.5) * shake;
    cx.drawImage(low, ox - shake, oy - shake, VW + 2 * shake, VH + 2 * shake);
    if (S.horror && Math.random() < 0.025 + S.dread * 0.08) { // screen tear
      const by = Math.random() * RH, bh = 4 + Math.random() * 18, off = (Math.random() - 0.5) * 60;
      cx.drawImage(low, 0, by, RW, bh, off, by * VH / RH, VW, bh * VH / RH);
    }
    // vignette, dread tint
    const v = cx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.3, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.75)'); cx.fillStyle = v; cx.fillRect(0, 0, VW, VH);
    if (S.dread > 0 && !S.scaredy) {
      const r2 = cx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.25, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
      r2.addColorStop(0, 'rgba(120,0,15,0)'); r2.addColorStop(1, 'rgba(120,0,15,' + (0.55 * S.dread * (0.8 + 0.2 * Math.sin(t * 8))) + ')');
      cx.fillStyle = r2; cx.fillRect(0, 0, VW, VH);
    }
    drawHand();
    if (S.loom) drawLoom();
    if (S.showMap) drawMap();
    for (const e of S.effects) if (e.kind === 'bat') { const u = e.t / e.dur; cx.font = '48px serif'; cx.fillText('🦇', -60 + (VW + 120) * u, VH * 0.35 + Math.sin(u * 20) * 24); }
  }
  // the hand holding the flashlight
  function drawHand() {
    const p = S.player, s = Math.min(VW, VH) / 700;
    const bx = VW * 0.72 + Math.cos(p.bob * 0.5) * 10 * p.moving, by = VH + 10 + Math.abs(Math.sin(p.bob)) * 12 * p.moving;
    cx.save(); cx.translate(bx, by); cx.scale(s, s); cx.rotate(-0.35);
    cx.fillStyle = '#2b2522'; cx.fillRect(-26, -230, 52, 170);
    cx.fillStyle = '#3d3531'; cx.fillRect(-34, -270, 68, 46);
    cx.fillStyle = '#5b514b'; cx.fillRect(-30, -226, 8, 160);
    if (S.blackout <= 0) { cx.fillStyle = 'rgba(255,240,200,' + (0.35 + 0.5 * Math.min(1, S.battery / 30)) + ')'; cx.fillRect(-30, -276, 60, 8); }
    cx.fillStyle = '#b98f74'; cx.beginPath(); cx.ellipse(0, -90, 52, 44, 0, 0, 7); cx.fill();
    cx.fillStyle = '#a07a61'; for (let i = 0; i < 4; i++) { cx.beginPath(); cx.ellipse(-40 + i * 4, -150 + i * 24, 18, 13, -0.2, 0, 7); cx.fill(); }
    cx.fillStyle = '#2e3d52'; cx.fillRect(-60, -60, 120, 80);
    cx.restore();
  }
  function drawMap() {
    const m = S.maze, W = m.W, sz = Math.min(170, Math.max(110, VW * 0.16)), c = sz / W;
    const ox = 14, oy = VH - sz - 14;
    cx.fillStyle = 'rgba(8,5,12,.72)'; cx.fillRect(ox - 4, oy - 4, sz + 8, sz + 8);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      if (!S.seen[y * W + x]) continue;
      cx.fillStyle = isWall(x, y) ? '#5b4560' : '#2a2030'; cx.fillRect(ox + x * c, oy + y * c, Math.ceil(c), Math.ceil(c));
    }
    cx.fillStyle = '#f2c46d'; for (const k of S.keys) if (!k.got && k.seen) { cx.beginPath(); cx.arc(ox + k.x * c, oy + k.y * c, Math.max(2.5, c * 0.35), 0, 7); cx.fill(); }
    cx.fillStyle = '#9fe3c4'; for (const b of S.batts) if (!b.got && b.seen) cx.fillRect(ox + b.x * c - 2, oy + b.y * c - 2, 4, 4);
    if (S.door.seen || S.keysGot === 3) { cx.fillStyle = S.keysGot === 3 ? '#9fe3c4' : '#b3263a'; cx.fillRect(ox + S.door.tx * c, oy + S.door.ty * c, c, c); }
    const p = S.player; cx.save(); cx.translate(ox + p.x * c, oy + p.y * c); cx.rotate(p.a);
    cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(c * 0.7, 0); cx.lineTo(-c * 0.45, -c * 0.4); cx.lineTo(-c * 0.45, c * 0.4); cx.fill(); cx.restore();
    cx.fillStyle = 'rgba(239,230,210,.6)'; cx.font = '12px ' + getComputedStyle(document.body).fontFamily; cx.fillText('M: map', ox, oy - 8);
  }

  // ---------- HUD ----------
  function updateHud() {
    $('hudFloor').textContent = FLOORS[S.floor].name;
    $('hudKeys').textContent = 'Keys ' + S.keysGot + ' / 3' + (S.keysGot === 3 ? (S.sealsLeft > 1 ? ' (door: ' + S.sealsLeft + ' seals)' : ' (go to the door)') : '');
    let c = ''; for (let i = 0; i < 5; i++) c += '<span class="' + (i < S.candles ? '' : 'out') + '">🕯️</span>';
    if ($('hudCandles').dataset.v !== String(S.candles)) { $('hudCandles').innerHTML = c; $('hudCandles').dataset.v = S.candles; }
    $('hudCandles').setAttribute('aria-label', S.candles + ' lives left');
    const b = $('hudBatt'); b.firstChild.style.width = Math.max(0, S.battery * 0.86) + 'px'; b.classList.toggle('low', S.battery < 20);
    $('hudScore').textContent = S.score.toLocaleString();
    $('hudTime').textContent = fmtTime(S.time);
    $('hudStreak').textContent = S.streak >= 2 ? 'Streak ×' + S.streak : '';
  }
  const fmtTime = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  let toastTimer = null;
  function toast(msg, sub) {
    const t = $('toast'); t.innerHTML = msg + (sub ? '<small>' + sub + '</small>' : ''); t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1900);
  }

  // ---------- screens ----------
  function show(id) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id); }
  function setMode(mode) {
    S.mode = mode; input.keys.clear(); input.touchMove = input.touchTurn = null; input.mdx = 0;
    $('hud').classList.toggle('on', mode === 'play' || mode === 'question' || mode === 'scare' || mode === 'paused');
    $('lookHint').classList.toggle('on', mode === 'play' && !input.locked && matchMedia('(pointer: fine)').matches);
    if (mode !== 'play') { Snd.setHeart(0); Snd.setDread(0); Snd.setWail(0); releaseMouse(); }
  }
  function togglePause() {
    if (S.mode === 'play') { setMode('paused'); setFear(fearNow()); $('mutePause').checked = Snd.muted; show('pause'); }
    else if (S.mode === 'paused') { show(null); setMode('play'); }
  }
  $('pauseBtn').onclick = () => togglePause();
  $('resumeBtn').onclick = () => togglePause();
  $('quitBtn').onclick = () => { Snd.drone(false); setMode('title'); S.maze = null; show('title'); };
  function setFear(level) {
    S.scaredy = level === 'scaredy'; S.horror = level === 'horror';
    Snd.gentle = S.scaredy; Snd.horror = S.horror;
    cv.classList.toggle('horror', S.horror);
    document.querySelectorAll('input[name=fear],input[name=fearP]').forEach(r => { r.checked = r.value === level; });
    try { localStorage.setItem('ih_fear', level); } catch (e) { /* ignore */ }
  }
  const fearNow = () => (S.horror ? 'horror' : S.scaredy ? 'scaredy' : 'normal');
  document.querySelectorAll('input[name=fear]').forEach(r => r.onchange = () => setFear(r.value));
  document.querySelectorAll('input[name=fearP]').forEach(r => r.onchange = () => {
    const was = S.horror; setFear(r.value);
    if (was !== S.horror && S.maze) toast(S.horror ? 'Horrifying mode starts on the next floor' : 'Back to normal on the next floor');
  });
  $('mutePause').onchange = (e) => { Snd.setMuted(e.target.checked); $('muteIn').checked = e.target.checked; };
  function between(title, text, btn, then) {
    setMode('between'); $('btTitle').textContent = title; $('btText').innerHTML = text; $('btBtn').textContent = btn;
    show('between'); $('btBtn').focus();
    $('btBtn').onclick = () => { show(null); then(); };
  }

  // ---------- questions ----------
  function nextQuestion() {
    if (S.deckIdx >= S.deck.length) { S.deckCycle++; S.deck = Qs.floorDeck(S.floor, S.seed + '#' + S.deckCycle, 60); S.deckIdx = 0; }
    return S.deck[S.deckIdx++];
  }
  function askQuestion(why, onDone) {
    setMode('question');
    const q = nextQuestion();
    const card = $('qcard');
    const gdc = q.tier >= 3 ? 'GDC allowed' : '';
    card.innerHTML = '<h2 class="why" id="qWhy">' + why + '</h2><p class="meta">' + q.topicName + (gdc ? '  |  ' + gdc : '') + '</p>' +
      '<div class="prompt">' + q.prompt + '</div><div class="visual" id="qVis"></div><div id="qAns"></div><div id="qFb"></div>';
    let picked = null, done = false;
    const vis = R.visual(q.visual, Math.min(340, window.innerWidth - 60), q.type === 'point' ? (pt) => { picked = pt; $('qSubmit').disabled = false; } : null);
    if (vis) $('qVis').appendChild(vis); else $('qVis').remove();
    const ans = $('qAns');
    const isDoor = why.includes('door') || why.includes('seal');
    function finish(correct) {
      if (done) return; done = true;
      S.qTotal++; const st = S.stats[q.topic] || (S.stats[q.topic] = { name: q.topicName, right: 0, total: 0 }); st.total++;
      if (correct) { S.qRight++; st.right++; S.streak++; S.score += 100 * q.tier + 25 * Math.min(S.streak - 1, 6); Snd.right(); }
      else { S.streak = 0; Snd.wrong(); }
      const fb = $('qFb'); fb.className = 'feedback ' + (correct ? 'good' : 'bad');
      fb.innerHTML = '<h3>' + (correct ? (isDoor ? 'The seal breaks' : 'Destroyed') : (isDoor ? 'The seal holds' : 'It got you')) + '</h3>' +
        (correct ? '' : '<div class="ans">Correct answer: ' + R.answerHtml(q) + '</div>') + '<div>' + q.explain + '</div>' +
        '<div class="cont"><button class="btn" id="qCont" type="button">' + (correct ? 'Keep going' : 'Back into the dark') + '</button></div>';
      ans.querySelectorAll('input,button').forEach(b => { if (b.id !== 'qCont') b.disabled = true; });
      $('qCont').focus();
      $('qCont').onclick = () => { show(null); onDone(correct); };
      fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (q.type === 'mc') {
      const graphs = q.options.some(o => o.visual);
      ans.innerHTML = '<div class="opts' + (graphs ? ' graphs' : '') + '"></div>';
      const box = ans.firstChild;
      q.options.forEach((o, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'opt' + (graphs ? ' graph' : '');
        if (graphs) { b.innerHTML = '<b>' + o.html + '</b>'; b.appendChild(R.visual(o.visual, Math.min(window.innerHeight < 900 ? 200 : 250, (window.innerWidth - 80) / 2))); }
        else b.innerHTML = o.html;
        b.onclick = () => { if (done) return; b.classList.add(i === q.correct ? 'right' : 'wrong'); box.children[q.correct].classList.add('right'); finish(i === q.correct); };
        box.appendChild(b);
      });
      box.firstChild.focus();
    } else if (q.type === 'num' || q.type === 'expr') {
      const isExpr = q.type === 'expr';
      ans.innerHTML = '<div class="answer-row">' + (isExpr ? '<span class="lhs mx"><i>f</i><sup>−1</sup>(<i>x</i>) =</span>' : '') +
        '<input id="qIn" inputmode="' + (isExpr ? 'text' : 'decimal') + '" autocomplete="off" spellcheck="false" aria-label="Your answer" placeholder="' + (isExpr ? 'e.g. (x - 3)/2' : 'Type a number') + '">' +
        '<button class="btn" id="qCheck" type="button">Check</button></div>' +
        (isExpr ? '<div class="keys">' + ['x', '(', ')', '^', '√', '/'].map(k => '<button type="button" data-k="' + k + '">' + k + '</button>').join('') + '</div>' : '') +
        '<div class="reads" id="qReads">' + (q.inputHint ? q.inputHint : isExpr ? 'Any equivalent form works.' : 'Fractions like 7/2 are fine. Decimals: 3 significant figures.') + '</div><div class="err" id="qErr"></div>';
      const inp = $('qIn');
      inp.focus();
      ans.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k === '√' ? 'sqrt(' : b.dataset.k;
        const s = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, s) + k + inp.value.slice(inp.selectionEnd ?? s);
        inp.focus(); inp.setSelectionRange(s + k.length, s + k.length); inp.dispatchEvent(new Event('input'));
      });
      if (isExpr) inp.addEventListener('input', () => {
        const r = $('qReads');
        if (!inp.value.trim()) { r.innerHTML = q.inputHint || 'Any equivalent form works.'; return; }
        try { r.innerHTML = 'Reads as: <span class="mx">' + M.pretty(M.parse(inp.value)) + '</span>'; } catch (e) { r.textContent = 'Reads as: …'; }
      });
      const check = () => {
        if (done) return;
        const v = inp.value;
        if (!v.trim()) { $('qErr').textContent = 'Type an answer first.'; return; }
        const res = isExpr ? M.checkExpr(v, q.answerPlain, q.samples) : M.checkNumber(v, q.answer);
        if (res.error) { $('qErr').textContent = res.error + ' Fix it and press Check again.'; return; }
        $('qErr').textContent = ''; finish(res.ok);
      };
      $('qCheck').onclick = check;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    } else if (q.type === 'point') {
      ans.innerHTML = '<div class="answer-row"><span class="reads">Click a grid point, then submit.</span><button class="btn" id="qSubmit" type="button" disabled>Submit point</button></div>';
      $('qSubmit').onclick = () => { if (picked) finish(picked.x === q.answer.x && picked.y === q.answer.y); };
    }
    show('qwrap');
    $('qwrap').scrollTop = 0;
  }

  function caught(mon) {
    S.loom = null;
    setMode('scare'); S.hit = 1;
    if (S.scaredy) Snd.caught(); else Snd.shriek();
    const jump = !S.scaredy;
    const go = () => askQuestion(S.scaredy ? 'Boo! A friendly ghost wants a math problem' : S.horror ? 'It has you' : 'It caught you', (correct) => {
      if (correct) {
        Snd.banish();
        S.monsters = S.monsters.filter(m => m !== mon); S.banished++;
        toast(S.scaredy ? 'Poof!' : 'Destroyed', S.monsters.length ? S.monsters.length + ' still in the house' : 'This floor is quiet. For now.');
      } else {
        S.candles--; respawnFar(mon);
        if (S.candles <= 0) { died(); return; }
        toast('A candle goes out', S.candles + ' left');
      }
      S.invuln = 2.5; setMode('play');
    });
    if (jump) jumpscare(go, mon.kind, true); else flash(go);
  }
  function doorQuestion() {
    const F = FLOORS[S.floor], total = F.seals, n = total - S.sealsLeft + 1;
    askQuestion(total > 1 ? 'The door has ' + total + ' seals. Seal ' + n : 'The door is sealed', (correct) => {
      if (correct) {
        S.sealsLeft--; Snd.unlock();
        if (S.sealsLeft <= 0) { floorDone(); return; }
        setMode('question'); setTimeout(doorQuestion, 250);
        return;
      }
      const W = S.maze.W, d = S.dist, opts = [];
      for (let y = 1; y < W; y += 2) for (let x = 1; x < W; x += 2) { const v = d[y * W + x]; if (v >= 8 && v <= 14) opts.push([x, y]); }
      if (opts.length) { const [x, y] = opts[Math.floor(Math.random() * opts.length)]; const mon = makeMonster(x, y, S.monsters.length); mon.hunting = true; S.monsters.push(mon); }
      toast('Something woke up', 'Step off the door, then try again');
      S.doorCool = 3; S.invuln = 1.5; setMode('play');
    });
  }
  function floorDone() {
    S.score += 300;
    if (S.floor === FLOORS.length - 1) { endGame(); return; }
    const done = FLOORS[S.floor].name;
    S.floor++;
    between(FLOORS[S.floor].name, 'You escaped ' + done.toLowerCase() + '. +300<br><br>' + FLOORS[S.floor].intro, 'Go up the stairs', () => { startFloor(); setMode('play'); });
  }
  function died() {
    S.deaths++; S.attempt++;
    between('The house claimed you', 'All your candles went out. You wake up at the start of ' + FLOORS[S.floor].name.toLowerCase() + ' with fresh candles. The keys have been hidden again.', 'Try again', () => { startFloor(); setMode('play'); });
  }

  // ---------- scares ----------
  function flash(then) {
    const f = $('flash'); f.style.transition = 'opacity .3s'; f.style.background = '#000'; f.style.opacity = '.7';
    setTimeout(() => { f.style.transition = 'opacity .6s'; f.style.opacity = '0'; }, 380);
    setTimeout(then, 380);
  }
  function jumpscare(then, kind, silent) {
    const box = $('scare'), c = $('scareCanvas'), g = c.getContext('2d');
    c.width = VW; c.height = VH; box.classList.add('on'); if (!silent) Snd.scream();
    const t0 = performance.now(), D = S.horror ? 1400 : 1000;
    const frame = (now) => {
      const u = (now - t0) / D;
      if (u >= 1) { box.classList.remove('on'); box.style.filter = ''; then(); return; }
      drawFace(g, VW, VH, u, kind);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  function drawFace(g, w, h, u, kind) {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const s = Math.min(w, h) * (0.6 + u * 0.7) * (1 + (Math.random() - 0.5) * 0.05);
    if (BK[kind] && BK[kind].scare) { drawBakedScare(g, w, h, u, kind); return; }
    const MD = window.Monsters.D[kind];
    if (MD && MD.face && kind !== 'ghost') {
      const tex = SP.mon[kind][Math.floor(Math.random() * SP.mon[kind].length)].canvas, [fx, fy, fw, fh] = MD.face;
      const sw = fw * tex.width, sh = fh * tex.height, k = Math.min(w / sw, h / sh) * (1.05 + u * 0.6);
      g.imageSmoothingEnabled = false;
      g.drawImage(tex, fx * tex.width, fy * tex.height, sw, sh, w / 2 - sw * k / 2 + (Math.random() - 0.5) * 30, h / 2 - sh * k / 2 + (Math.random() - 0.5) * 30, sw * k, sh * k);
    } else {
    g.save(); g.translate(w / 2 + (Math.random() - 0.5) * 24, h / 2 + (Math.random() - 0.5) * 24);
    if (kind === 'shade') {
      g.fillStyle = '#050106'; g.beginPath(); g.ellipse(0, 0, s * 0.55, s * 0.7, 0, 0, 7); g.fill();
      g.fillStyle = '#ff1f33'; g.shadowColor = '#ff1f33'; g.shadowBlur = 25;
      for (const [ex, ey, r] of [[-0.18, -0.2, 0.05], [0.18, -0.2, 0.05], [0, -0.33, 0.035], [-0.32, -0.36, 0.03], [0.32, -0.34, 0.03]]) { g.beginPath(); g.ellipse(ex * s, ey * s, r * s * 1.5, r * s * 0.8, 0, 0, 7); g.fill(); }
      g.shadowBlur = 0; g.fillStyle = '#d9d2c0';
      for (let i = 0; i < 12; i++) { const x = -0.33 + i * 0.06; g.beginPath(); g.moveTo(x * s, 0.08 * s); g.lineTo((x + 0.03) * s, (0.22 + (i % 2) * 0.05) * s); g.lineTo((x + 0.06) * s, 0.08 * s); g.fill(); }
    } else {
      const grd = g.createRadialGradient(0, -s * 0.1, s * 0.05, 0, 0, s * 0.7);
      grd.addColorStop(0, '#e9e4d6'); grd.addColorStop(0.6, '#a39d8c'); grd.addColorStop(1, '#2b2924');
      g.fillStyle = grd; g.beginPath(); g.ellipse(0, 0, s * 0.38, s * 0.62, 0, 0, 7); g.fill();
      g.fillStyle = '#000';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * s * 0.15, -s * 0.14, s * 0.1, s * 0.16, sx * 0.25, 0, 7); g.fill(); }
      g.fillStyle = '#ff1f33'; g.shadowColor = '#ff1f33'; g.shadowBlur = 20;
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.14, -s * 0.12, s * 0.018, 0, 7); g.fill(); }
      g.shadowBlur = 0; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, s * 0.3, s * 0.1, s * 0.22 + u * s * 0.06, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(-s * 0.17, -s * 0.0, s * 0.012, s * 0.2); g.fillRect(s * 0.13, -s * 0.0, s * 0.01, s * 0.26);
    }
    g.restore();
    }
    const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.95)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 160; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  function drawBakedScare(g, w, h, u, kind) {
    const B = BK[kind], sc = B.m.scare, fr = Math.min(sc.frames - 1, Math.floor(u * sc.frames * 1.4));
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = false;
    const k = Math.max(w / sc.w, h / sc.h) * (1.0 + u * 0.45), dw = sc.w * k, dh = sc.h * k;
    const jx = (Math.random() - 0.5) * 26, jy = (Math.random() - 0.5) * 26;
    g.drawImage(B.scare, fr * sc.w, 0, sc.w, sc.h, (w - dw) / 2 + jx, (h - dh) / 2 + jy, dw, dh);
    const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  }
  function ambientScare() {
    if (S.scaredy) { S.effects.push({ kind: 'bat', t: 0, dur: 2.2 }); Snd.squeak(); return; }
    const r = Math.random(), p = S.player;
    if (r < 0.25) { setMode('scare'); jumpscare(() => { setMode('play'); toast('…was that real?'); }, roster()[Math.floor(Math.random() * roster().length)]); }
    else if (r < 0.7) {
      // a figure stands at the end of the corridor you are looking down, then is gone
      let d = 0.5; while (d < 7 && !wallAt(p.x + Math.cos(p.a) * (d + 0.3), p.y + Math.sin(p.a) * (d + 0.3))) d += 0.25;
      if (d >= 2.5) { S.effects.push({ kind: 'figure', t: 0, dur: 0.75, x: p.x + Math.cos(p.a) * d, y: p.y + Math.sin(p.a) * d }); Snd.whisper(); }
      else S.nextScare = 4;
    } else { S.blackout = 1.8; Snd.whisper(); setTimeout(() => { if (S.mode === 'play') toast('The flashlight comes back on'); }, 1800); }
  }

  // ---------- start / end ----------
  function startGame() {
    Snd.init(); Snd.setMuted($('muteIn').checked);
    setFear((document.querySelector('input[name=fear]:checked') || {}).value || 'normal');
    S.name = $('nameIn').value.trim().slice(0, 24);
    S.code = $('codeIn').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    S.seed = S.code || ('solo-' + Date.now() + '-' + Math.random());
    S.floor = S.teacher ? +$('floorIn').value : 0;
    Object.assign(S, { score: 0, streak: 0, time: 0, stats: {}, qTotal: 0, qRight: 0, banished: 0, deaths: 0, attempt: 0, deckFloor: -1 });
    Snd.drone(true);
    between(FLOORS[S.floor].name, FLOORS[S.floor].intro + '<br><br>Find 3 keys, then the door. They hunt by sound, and they hate your flashlight. If one catches you, answer its question to destroy it. Get it wrong and a candle goes out.', 'Go in', () => { startFloor(); setMode('play'); });
  }
  $('startBtn').onclick = startGame;
  $('codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') startGame(); });
  if (S.teacher) $('teacherRow').hidden = false;
  try { const fl = localStorage.getItem('ih_fear') || (localStorage.getItem('ih_scaredy') === '1' ? 'scaredy' : 'normal'); document.querySelectorAll('input[name=fear]').forEach(r => { r.checked = r.value === fl; }); $('nameIn').value = localStorage.getItem('ih_name') || ''; } catch (e) { /* storage blocked */ }
  $('nameIn').onchange = (e) => { try { localStorage.setItem('ih_name', e.target.value); } catch (er) { /* ignore */ } };

  function endGame() {
    setMode('end'); Snd.drone(false);
    const acc = S.qTotal ? Math.round(100 * S.qRight / S.qTotal) : 0;
    const rows = Object.values(S.stats).sort((a, b) => a.right / a.total - b.right / b.total).map(st =>
      '<tr><td>' + st.name + '<div class="bar"><i style="width:' + Math.round(100 * st.right / st.total) + '%"></i></div></td><td>' + st.right + ' / ' + st.total + '</td></tr>').join('');
    const weakest = Object.values(S.stats).filter(s => s.total >= 2).sort((a, b) => a.right / a.total - b.right / b.total)[0];
    $('endcard').innerHTML = '<h2>You escaped' + (S.name ? ', ' + escapeHtml(S.name) : '') + '</h2>' +
      '<div class="stats"><div><b>' + S.score.toLocaleString() + '</b><span>Score</span></div><div><b>' + fmtTime(S.time) + '</b><span>Time</span></div>' +
      '<div><b>' + acc + '%</b><span>Accuracy (' + S.qRight + '/' + S.qTotal + ')</span></div><div><b>' + S.banished + '</b><span>Monsters destroyed</span></div></div>' +
      '<table class="topics">' + rows + '</table>' +
      (weakest && weakest.right < weakest.total ? '<p class="code-line">Practise next: <b>' + weakest.name + '</b>.</p>' : '') +
      '<p class="code-line">' + (S.code ? 'Room code <b>' + S.code + '</b>. ' : 'Solo run. ') + 'Times the house claimed you: ' + S.deaths + '.</p>' +
      '<div class="cont" style="gap:10px"><button class="btn" id="copyBtn" type="button" style="background:transparent;color:var(--ink);border:1px solid var(--ink-soft)">Copy my result</button><button class="btn" id="againBtn" type="button">Play again</button></div>';
    show('end');
    $('againBtn').onclick = () => { S.maze = null; setMode('title'); show('title'); };
    $('copyBtn').onclick = () => {
      const txt = 'Inverse Haunt: ' + (S.name || 'Anonymous') + ' escaped. Score ' + S.score + ', time ' + fmtTime(S.time) + ', accuracy ' + acc + '% (' + S.qRight + '/' + S.qTotal + ')' + (S.code ? ', room ' + S.code : '');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { $('copyBtn').textContent = 'Copied'; }, () => { prompt('Copy this:', txt); });
    };
  }
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.mode === 'play') update(dt);
    else if (S.mode !== 'title') for (const mon of S.monsters) mon.bob += dt * 3;
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.__haunt = { S, startFloor, askQuestion, FLOORS, setMode, jumpscare };
})();
