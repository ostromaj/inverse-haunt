/* Renders question visuals (mapping diagrams, tables, graphs) as SVG/HTML. Browser only. */
(function (root) {
  'use strict';
  const M = root.MathCore;
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#231a14', SOFT = '#8a7765', GRID = '#d6c8a8', AXIS = '#5b4a3c';
  const F_COL = '#c7853a', CAND_COL = '#7a1f9c', PT_COL = '#b3263a';

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const fmt = (v) => M.numHtml(v).replace(/<[^>]+>/g, '');

  function mapping(v) {
    const ins = v.pairs.map(p => p[0]);
    const outs = Array.from(new Set(v.pairs.map(p => p[1]))).sort((a, b) => a - b);
    const W = 340, rowH = 46, H = Math.max(ins.length, outs.length) * rowH + 70;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Mapping diagram' });
    const defs = el('defs', {}, svg);
    const mk = el('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: INK }, mk);
    const col = (x, vals, label) => {
      el('ellipse', { cx: x, cy: H / 2 + 12, rx: 46, ry: (H - 50) / 2, fill: '#fbf6ea', stroke: AXIS, 'stroke-width': 1.5 }, svg);
      const t = el('text', { x, y: 22, 'text-anchor': 'middle', 'font-size': 17, 'font-style': 'italic', fill: INK }, svg); t.textContent = label;
      const top = H / 2 + 12 - (vals.length - 1) * rowH / 2;
      return vals.map((val, i) => {
        const y = top + i * rowH;
        const tx = el('text', { x, y: y + 6, 'text-anchor': 'middle', 'font-size': 19, fill: INK, 'font-weight': 700 }, svg); tx.textContent = fmt(val);
        return { val, y };
      });
    };
    const L = col(70, ins, 'x'), R = col(W - 70, outs, 'f(x)');
    for (const [x, y] of v.pairs) {
      const a = L.find(o => o.val === x), b = R.find(o => o.val === y);
      el('line', { x1: 70 + 22, y1: a.y, x2: W - 70 - 26, y2: b.y, stroke: INK, 'stroke-width': 1.6, 'marker-end': 'url(#ah)' }, svg);
    }
    return svg;
  }

  function table(v) {
    const t = document.createElement('table'); t.className = 'tbl';
    const r1 = t.insertRow(), r2 = t.insertRow();
    const h1 = document.createElement('th'); h1.innerHTML = '<i>x</i>'; r1.appendChild(h1);
    const h2 = document.createElement('th'); h2.innerHTML = '<i>f</i>(<i>x</i>)'; r2.appendChild(h2);
    for (const [x, y] of v.rows) { r1.insertCell().textContent = fmt(x); r2.insertCell().textContent = fmt(y); }
    return t;
  }

  // graph: {win:[x0,x1,y0,y1], curves:[{plain, dom:[lo,hi], cls}], points:[{x,y,label}], yx, clickable}
  function graph(v, size, onPick) {
    size = size || 340;
    const [x0, x1, y0, y1] = v.win, pad = 4;
    const S = size - pad * 2;
    const sx = (x) => pad + (x - x0) / (x1 - x0) * S;
    const sy = (y) => pad + S - (y - y0) / (y1 - y0) * S;
    const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img', 'aria-label': 'Graph' });
    const cid = 'c' + Math.random().toString(36).slice(2);
    el('rect', { x: pad, y: pad, width: S, height: S, fill: '#fffdf6', stroke: SOFT }, svg);
    const cp = el('clipPath', { id: cid }, el('defs', {}, svg)); el('rect', { x: pad, y: pad, width: S, height: S }, cp);
    const g = el('g', { 'clip-path': `url(#${cid})` }, svg);
    for (let x = Math.ceil(x0); x <= x1; x++) el('line', { x1: sx(x), y1: pad, x2: sx(x), y2: pad + S, stroke: GRID, 'stroke-width': x % 2 ? .6 : 1 }, g);
    for (let y = Math.ceil(y0); y <= y1; y++) el('line', { x1: pad, y1: sy(y), x2: pad + S, y2: sy(y), stroke: GRID, 'stroke-width': y % 2 ? .6 : 1 }, g);
    el('line', { x1: sx(0), y1: pad, x2: sx(0), y2: pad + S, stroke: AXIS, 'stroke-width': 1.6 }, g);
    el('line', { x1: pad, y1: sy(0), x2: pad + S, y2: sy(0), stroke: AXIS, 'stroke-width': 1.6 }, g);
    const fs = Math.max(9, size / 34);
    const step = (x1 - x0) > 10 ? 2 : 2;
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) if (x !== 0 && x !== x1 && x !== x0) { const t = el('text', { x: sx(x), y: sy(0) + fs + 2, 'text-anchor': 'middle', 'font-size': fs, fill: SOFT }, svg); t.textContent = fmt(x); }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) if (y !== 0 && y !== y1 && y !== y0) { const t = el('text', { x: sx(0) - 4, y: sy(y) + fs / 3, 'text-anchor': 'end', 'font-size': fs, fill: SOFT }, svg); t.textContent = fmt(y); }
    if (v.yx) {
      el('line', { x1: sx(Math.max(x0, y0)), y1: sy(Math.max(x0, y0)), x2: sx(Math.min(x1, y1)), y2: sy(Math.min(x1, y1)), stroke: '#6b8f86', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }, g);
      const t = el('text', { x: sx(Math.min(x1, y1)) - 6, y: sy(Math.min(x1, y1)) + 18, 'text-anchor': 'end', 'font-size': fs + 1, fill: '#4f6f67', 'font-style': 'italic' }, svg); t.textContent = 'y = x';
    }
    for (const c of v.curves || []) {
      const f = M.compile(c.plain);
      const lo = Math.max(x0, c.dom[0]), hi = Math.min(x1, c.dom[1]);
      let d = '', pen = false, prevY = null;
      const N = 700;
      for (let i = 0; i <= N; i++) {
        const x = lo + (hi - lo) * i / N, y = f(x);
        const okp = isFinite(y) && y > y0 - 3 && y < y1 + 3 && !(prevY != null && Math.abs(y - prevY) > (y1 - y0));
        if (okp) { d += (pen ? 'L' : 'M') + sx(x).toFixed(2) + ',' + sy(y).toFixed(2); pen = true; } else pen = false;
        prevY = isFinite(y) ? y : null;
      }
      const isF = c.cls === 'f' && (v.curves.length > 1);
      el('path', { d, fill: 'none', stroke: c.cls === 'f' ? F_COL : CAND_COL, 'stroke-width': isF ? 2.2 : 3, opacity: isF ? .55 : 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      // closed endpoint dot for restricted domains
      if (isFinite(c.dom[0]) && c.dom[0] >= x0 && Math.abs(c.dom[0] - Math.round(c.dom[0])) < 1e-9) {
        const y = f(c.dom[0]); if (isFinite(y) && y >= y0 && y <= y1) el('circle', { cx: sx(c.dom[0]), cy: sy(y), r: 3.5, fill: c.cls === 'f' ? F_COL : CAND_COL, opacity: isF ? .6 : 1 }, g);
      }
    }
    for (const p of v.points || []) {
      el('circle', { cx: sx(p.x), cy: sy(p.y), r: 5.5, fill: PT_COL, stroke: '#fff', 'stroke-width': 1.5 }, svg);
      if (p.label) { const t = el('text', { x: sx(p.x) + 8, y: sy(p.y) - 8, 'font-size': fs + 4, 'font-weight': 700, fill: PT_COL }, svg); t.textContent = p.label; }
    }
    if (v.clickable && onPick) {
      svg.style.cursor = 'pointer';
      const mark = el('g', { visibility: 'hidden' }, svg);
      const ring = el('circle', { r: 7, fill: 'none', stroke: CAND_COL, 'stroke-width': 3 }, mark);
      const lab = el('text', { 'font-size': fs + 3, 'font-weight': 700, fill: CAND_COL }, mark);
      const hover = el('circle', { r: 4, fill: CAND_COL, opacity: .35, visibility: 'hidden' }, svg);
      const toXY = (ev) => {
        const r = svg.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width * size, py = (ev.clientY - r.top) / r.height * size;
        const x = Math.round(x0 + (px - pad) / S * (x1 - x0)), y = Math.round(y0 + (pad + S - py) / S * (y1 - y0));
        return { x: Math.max(x0, Math.min(x1, x)), y: Math.max(y0, Math.min(y1, y)) };
      };
      svg.addEventListener('pointermove', (ev) => { const q = toXY(ev); hover.setAttribute('cx', sx(q.x)); hover.setAttribute('cy', sy(q.y)); hover.setAttribute('visibility', 'visible'); });
      svg.addEventListener('pointerleave', () => hover.setAttribute('visibility', 'hidden'));
      svg.addEventListener('click', (ev) => {
        const q = toXY(ev);
        ring.setAttribute('cx', sx(q.x)); ring.setAttribute('cy', sy(q.y));
        lab.setAttribute('x', sx(q.x) + (q.x > (x0 + x1) / 2 ? -10 : 10)); lab.setAttribute('y', sy(q.y) + (q.y > (y0 + y1) / 2 ? 22 : -10));
        lab.setAttribute('text-anchor', q.x > (x0 + x1) / 2 ? 'end' : 'start');
        lab.textContent = '(' + fmt(q.x) + ', ' + fmt(q.y) + ')';
        mark.setAttribute('visibility', 'visible');
        onPick(q);
      });
    }
    return svg;
  }

  function visual(v, size, onPick) {
    if (!v) return null;
    if (v.kind === 'mapping') return mapping(v);
    if (v.kind === 'table') return table(v);
    if (v.kind === 'graph') return graph(v, size, onPick);
    return null;
  }

  // how the correct answer should be displayed
  function answerHtml(q) {
    if (q.type === 'num') return '<span class="mx">' + M.numHtml(Math.round(q.answer * 1e6) / 1e6) + '</span>';
    if (q.type === 'expr') return '<span class="mx"><i>f</i><sup>−1</sup>(<i>x</i>) = ' + M.pretty(q.answerPlain) + '</span>';
    if (q.type === 'point') return '<span class="mx">(' + M.numHtml(q.answer.x) + ', ' + M.numHtml(q.answer.y) + ')</span>';
    if (q.type === 'mc') return q.options[q.correct].html;
    return '';
  }

  root.Render = { visual, graph, mapping, table, answerHtml };
})(window);
