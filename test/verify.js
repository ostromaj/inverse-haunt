/* Independent math verification for Inverse Haunt.
   Run:  node test/verify.js  [instancesPerGenerator]
   For every generator it builds thousands of random questions and re-derives the
   answer with NUMERICAL methods (root finding, sampling) — never by trusting the
   generator's own formulas. Any mismatch fails the run. */
'use strict';
const M = require('../js/mathcore.js');
const Q = require('../js/questions.js');
const N = +process.argv[2] || 3000;

let failures = 0, checks = 0;
const failLog = {};
function ok(cond, gen, msg, q) {
  checks++;
  if (!cond) {
    failures++;
    failLog[gen] = failLog[gen] || [];
    if (failLog[gen].length < 4) failLog[gen].push(msg + (q ? '\n      prompt: ' + strip(q.prompt) : ''));
  }
}
const strip = (h) => String(h).replace(/<sup>/g, '^').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const F = (p) => M.compile(p);
const near = (a, b, tol) => isFinite(a) && isFinite(b) && Math.abs(a - b) <= (tol || 1e-7) * Math.max(1, Math.abs(b));

// ---- numerical tools ----
function domArr(d) { // interval-object or [lo,hi] -> [lo,hi] clipped
  if (Array.isArray(d)) return d;
  if (!d || d.all || d.ne != null) return [-Infinity, Infinity];
  return [d.lo, d.hi];
}
function inDom(d, x) {
  if (!d) return true;
  if (Array.isArray(d)) return x >= d[0] && x <= d[1];
  return M.ivContains(d, x);
}
// all solutions of f(x)=k in domain (scan + bisection), within [-60,60]
function solveAll(f, k, dom) {
  const [lo0, hi0] = domArr(dom);
  const lo = Math.max(lo0, -60), hi = Math.min(hi0, 60), step = 0.01;
  const roots = [];
  const g = (x) => f(x) - k;
  let xPrev = lo, gPrev = inDom(dom, lo) ? g(lo) : NaN;
  if (isFinite(gPrev) && Math.abs(gPrev) < 1e-12) roots.push(lo);
  for (let x = lo + step; x <= hi + 1e-12; x += step) {
    const xx = Math.min(x, hi), gx = inDom(dom, xx) ? g(xx) : NaN;
    if (isFinite(gx) && Math.abs(gx) < 1e-12) roots.push(xx);
    else if (isFinite(gx) && isFinite(gPrev) && gPrev * gx < 0) {
      let a = xPrev, b = xx, ga = gPrev;
      for (let i = 0; i < 100; i++) { const mid = (a + b) / 2, gm = g(mid); if (ga * gm <= 0) { b = mid; } else { a = mid; ga = gm; } }
      const r = (a + b) / 2;
      if (Math.abs(g(r)) < 1e-6 * Math.max(1, Math.abs(k))) roots.push(r); // reject sign flips across a pole
    }
    xPrev = xx; gPrev = gx;
  }
  // merge duplicates
  const out = [];
  for (const r of roots.sort((a, b) => a - b)) if (!out.length || Math.abs(out[out.length - 1] - r) > 1e-6) out.push(r);
  return out;
}
// injective on domain? A continuous function on an interval is one-to-one iff it is
// strictly monotone; for a domain with a hole (x != c) each piece must be strictly
// monotone AND the pieces' ranges must not overlap.
function injective(f, dom) {
  let pieces;
  if (dom && dom.ne != null) pieces = [[-20, dom.ne], [dom.ne, 20]];
  else { const [lo0, hi0] = domArr(dom); pieces = [[Math.max(lo0, -20), Math.min(hi0, 20)]]; }
  const ranges = [];
  for (const [lo, hi] of pieces) {
    let sgn = 0, prev = null, mn = Infinity, mx = -Infinity;
    for (let i = 0; ; i++) {
      const x = lo + i * 0.005; if (x > hi) break;
      if (!inDom(dom, x)) continue;
      const y = f(x); if (!isFinite(y)) continue;
      mn = Math.min(mn, y); mx = Math.max(mx, y);
      if (prev != null) { const d = y - prev; if (d === 0) return false; const s = Math.sign(d); if (sgn && s !== sgn) return false; sgn = s; }
      prev = y;
    }
    ranges.push([mn, mx]);
  }
  for (let i = 0; i < ranges.length; i++) for (let j = i + 1; j < ranges.length; j++)
    if (ranges[i][0] <= ranges[j][1] && ranges[j][0] <= ranges[i][1]) return false;
  return true;
}
// inverse property: g(f(t)) = t on f's domain, f(g(s)) = s on g's domain
function isInverse(fp, fdom, gp, gdom, range) {
  const f = F(fp), g = F(gp); range = range || 8;
  let tested = 0;
  for (let t = -range; t <= range; t += 0.137) {
    if (!inDom(fdom, t)) continue;
    const y = f(t); if (!isFinite(y)) continue;
    if (gdom && !inDom(gdom, y)) return false;
    const back = g(y); tested++;
    if (!near(back, t, 1e-6)) return false;
  }
  for (let s = -range; s <= range; s += 0.113) {
    if (gdom && !inDom(gdom, s)) continue;
    const x = g(s); if (!isFinite(x)) continue;
    if (!inDom(fdom, x)) return false;
    tested++;
    if (!near(f(x), s, 1e-6)) return false;
  }
  return tested > 10;
}
function visibleSamples(p, dom, win) {
  const f = F(p), pts = [];
  for (let x = win[0]; x <= win[1] + 1e-9; x += 0.01) {
    if (!inDom(dom, x)) continue; const y = f(x);
    if (isFinite(y) && y >= win[2] && y <= win[3]) pts.push([x, y]);
  }
  return pts;
}
function visDiff(p1, d1, p2, d2, win) {
  const f1 = F(p1), f2 = F(p2);
  for (let x = win[0]; x <= win[1]; x += 0.02) {
    const y1 = inDom(d1, x) ? f1(x) : NaN, y2 = inDom(d2, x) ? f2(x) : NaN;
    const v1 = isFinite(y1) && y1 >= win[2] && y1 <= win[3], v2 = isFinite(y2) && y2 >= win[2] && y2 <= win[3];
    if (v1 !== v2) return true;
    if (v1 && Math.abs(y1 - y2) > 0.5) return true;
  }
  return false;
}
function rangeOn(f, lo, hi) {
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i <= 20000; i++) { const x = lo + (hi - lo) * i / 20000; const y = f(x); if (isFinite(y)) { mn = Math.min(mn, y); mx = Math.max(mx, y); } }
  return [mn, mx];
}
const sameIv = (a, b) => M.ivKey(a) === M.ivKey(b);

// ---- printer faithfulness: plain -> AST -> plain must evaluate identically ----
const plainSeen = new Set();
function checkPlain(p, gen) {
  if (plainSeen.has(p)) return; plainSeen.add(p);
  let a, b;
  try { a = F(p); b = F(M.toPlain(M.parse(p))); M.pretty(p); } catch (e) { ok(false, gen, 'unparseable plain "' + p + '": ' + e.message); return; }
  for (let x = -7.3; x < 8; x += 0.61) { const ya = a(x), yb = b(x); if (isFinite(ya) || isFinite(yb)) ok(near(ya, yb, 1e-12), gen, 'printer mismatch for "' + p + '" at x=' + x); }
}
function collectPlains(q) {
  const out = [];
  const walk = (o) => { if (!o || typeof o !== 'object') return; for (const k in o) { if (['f', 'inv', 'plain', 'answerPlain'].includes(k) && typeof o[k] === 'string') out.push(o[k]); else walk(o[k]); } };
  walk(q); return out;
}

// ---- per-generator semantic verifiers ----
const V = {
  mapEval(q) { const c = q.check; const p = c.pairs.find(pp => pp[0] === c.at); return p && p[1] === q.answer && new Set(c.pairs.map(pp => pp[0])).size === 4; },
  mapInv(q) { const c = q.check; const ys = c.pairs.map(p => p[1]); if (new Set(ys).size !== 4) return false; return c.pairs.find(p => p[1] === c.at)[0] === q.answer; },
  mapHasInv(q) { const one = new Set(q.check.pairs.map(p => p[1])).size === q.check.pairs.length; return q.options[q.correct].key === (one ? 'yes' : 'no'); },
  linEval(q) { return near(F(q.check.f)(q.check.at), q.answer); },
  pointSwapMC(q) { const { p, q: y } = q.check; const isAns = (o) => o.pt[0] === y && o.pt[1] === p; return isAns(q.options[q.correct]) && q.options.filter(isAns).length === 1 && q.prompt.includes(M.numHtml(p) + ', ' + M.numHtml(y)); },
  pointClick(q) { const { p, q: y } = q.check; const P = q.visual.points[0]; return P.x === p && P.y === y && q.answer.x === y && q.answer.y === p; },
  mirrorLine(q) { return q.options[q.correct].key === 'yx'; },
  tableInv(q) { const r = q.check.rows; if (new Set(r.map(x => x[1])).size !== r.length) return false; return r.find(x => x[1] === q.check.at)[0] === q.answer; },
  linInvValue(q) { const s = solveAll(F(q.check.f), q.check.k, null); return s.length === 1 && near(s[0], q.answer, 1e-6); },
  compTrick(q) {
    const f = F(q.check.f), k = q.check.k;
    if (q.check.outer) { const s = solveAll(f, k, null); return s.length === 1 && near(f(s[0]), q.answer, 1e-6); }
    const s = solveAll(f, f(k), null); return s.length === 1 && near(s[0], q.answer, 1e-6);
  },
  hltGraphs(q) {
    const W = q.check.win;
    const passes = (o) => { // strictly monotone on its displayed domain
      const f = F(o.plain); let sgn = 0, prev = null;
      for (let x = Math.max(W[0], o.dom[0]); x <= Math.min(W[1], o.dom[1]); x += 0.01) {
        const y = f(x); if (!isFinite(y)) continue;
        if (prev != null) { const d = y - prev; if (d === 0) return false; const s = Math.sign(d); if (sgn && s !== sgn) return false; sgn = s; }
        prev = y;
      }
      return sgn !== 0;
    };
    const failsVisibly = (o) => { // a visible horizontal line meets it twice, far apart
      const pts = visibleSamples(o.plain, o.dom, W).sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length && pts[j][1] - pts[i][1] < 0.03; j++) if (Math.abs(pts[i][0] - pts[j][0]) > 0.5) return true;
      return false;
    };
    return q.options.every((o, i) => (i === q.correct ? passes(o) && visibleSamples(o.plain, o.dom, W).length > 200 : !passes(o) && failsVisibly(o)));
  },
  domRangeSwap(q) {
    const c = q.check, want = c.askDom ? c.fR : c.fD;
    return sameIv(q.options[q.correct].iv, want) && q.options.filter(o => sameIv(o.iv, want)).length === 1;
  },
  hasInvEasy(q) { const inj = injective(F(q.check.f), q.check.dom); return inj === q.check.one && q.options[q.correct].key === (inj ? 'y' : 'n'); },
  hasInvTricky(q) { return V.hasInvEasy(q); },
  linInvExpr(q) {
    if (!isInverse(q.check.f, null, q.answerPlain, null)) return false;
    // alt equivalent form (slope-intercept from two evaluations) must be accepted; wrong forms rejected
    const g = F(q.answerPlain), s = g(1) - g(0), t = g(0);
    const alt = s + '*x + (' + t + ')';
    return M.checkExpr(alt, q.answerPlain, q.samples).ok && M.checkExpr(q.answerPlain, q.answerPlain, q.samples).ok
      && !M.checkExpr(q.check.f, q.answerPlain, q.samples).ok && !M.checkExpr('x', q.answerPlain, q.samples).ok;
  },
  linInvMC(q) { return q.options.every((o, i) => isInverse(q.check.f, null, o.plain, null) === (i === q.correct)); },
  reflectMC(q) {
    const c = q.check, W = c.win, corr = q.options[q.correct];
    if (!isInverse(c.f, c.fd, corr.plain, corr.dom, 6)) return false;
    return q.options.every((o, i) => i === q.correct || (!isInverse(c.f, c.fd, o.plain, o.dom, 6) && visDiff(o.plain, o.dom, corr.plain, corr.dom, W)))
      && q.options.every((o, i) => q.options.every((o2, j) => i >= j || visDiff(o.plain, o.dom, o2.plain, o2.dom, W)));
  },
  interceptSwap(q) {
    const f = F(q.check.f), b = f(0), roots = solveAll(f, 0, null);
    if (roots.length !== 1 || !near(b, q.check.b) || !near(roots[0], q.check.c)) return false;
    const want = q.check.askX ? [b, 0] : [0, roots[0]];
    const isAns = (o) => near(o.pt[0], want[0], 1e-9) && near(o.pt[1], want[1], 1e-9);
    return isAns(q.options[q.correct]) && q.options.filter(isAns).length === 1;
  },
  nonlinValue(q) { const s = solveAll(F(q.check.f), q.check.k, q.check.dom); return s.length === 1 && near(s[0], q.answer, 1e-6); },
  solveInvEq(q) { const f = F(q.check.f); const s = solveAll(f, q.answer, null); return s.length === 1 && near(s[0], q.check.m, 1e-6); },
  rangeInvFromDomain(q) { const want = q.check.dom; return sameIv(q.options[q.correct].iv, want) && q.options.filter(o => sameIv(o.iv, want)).length === 1; },
  domInvFromFormula(q) {
    const D = q.check.dom, [mn, mx] = rangeOn(F(q.check.f), D.lo, D.hi);
    const ok1 = (o) => o.iv.loInc && o.iv.hiInc && near(o.iv.lo, mn, 1e-9) && near(o.iv.hi, mx, 1e-9);
    return ok1(q.options[q.correct]) && q.options.filter(ok1).length === 1;
  },
  interceptClick(q) {
    const f = F(q.check.f);
    if (q.check.askY) { const r = solveAll(f, 0, q.check.d); return r.length === 1 && near(q.answer.y, r[0], 1e-6) && q.answer.x === 0; }
    return near(q.answer.x, f(0), 1e-9) && q.answer.y === 0;
  },
  quadInvExpr(q) {
    const c = q.check;
    if (!isInverse(c.f, c.dom, q.answerPlain, [M.compile(c.f)(c.dom.lo === -Infinity ? c.dom.hi : c.dom.lo), Infinity], 12)) return false;
    // the wrong-sign answer must be rejected by the checker
    const root = q.answerPlain.match(/sqrt\([^)]*\)/)[0];
    const h = c.dom.lo === -Infinity ? c.dom.hi : c.dom.lo;
    const wrong = q.answerPlain.includes('- sqrt') ? M.addConst(root, h) : h + ' - ' + root;
    return M.checkExpr(q.answerPlain, q.answerPlain, q.samples).ok && !M.checkExpr(wrong, q.answerPlain, q.samples).ok;
  },
  quadInvMC(q) {
    const c = q.check, k = F(c.f)(c.dom.lo === -Infinity ? c.dom.hi : c.dom.lo);
    return q.options.every((o, i) => isInverse(c.f, c.dom, o.plain, [k, Infinity], 12) === (i === q.correct));
  },
  quadRestrictMC(q) { const f = F(q.check.f); return q.options.every((o, i) => injective(f, o.iv) === (i === q.correct)); },
  quadDomInv(q) {
    const c = q.check, f = F(c.f), h = c.D.lo, [mn] = rangeOn(f, h, h + 50);
    if (!near(f(h), mn, 1e-9)) return false; // min at left end
    const want = c.askDom ? M.iv.ge(Math.round(mn * 1e9) / 1e9) : c.D;
    if (!(f(h + 1e4) > 1e6)) return false; // unbounded above
    return sameIv(q.options[q.correct].iv, want) && q.options.filter(o => sameIv(o.iv, want)).length === 1;
  },
  rationalInvExpr(q) {
    const c = q.check;
    const g = F(q.answerPlain), f = F(c.f);
    if (isFinite(f(c.c))) return false; // pole is where the prompt says
    let n = 0;
    for (let t = -9; t <= 9; t += 0.173) {
      if (Math.abs(t - c.c) < 1e-3) continue; const y = f(t); if (!isFinite(y)) continue;
      if (!near(g(y), t, 1e-6)) return false; n++;
    }
    return n > 50 && M.checkExpr(q.answerPlain, q.answerPlain, q.samples).ok;
  },
  selfInverse(q) {
    const f = F(q.check.f), a = q.check.a, k = q.check.k;
    if (isFinite(f(a))) return false;
    const s = solveAll(f, k, M.iv.ne(a));
    return s.length === 1 && near(s[0], q.answer, 1e-6) && near(f(q.answer), k, 1e-9);
  },
  rationalDomInv(q) {
    const f = F(q.check.f), h = q.check.h;
    if (isFinite(f(h))) return false;
    const asym = Math.round(f(1e9) * 1e4) / 1e4;
    if (Math.abs(f(-1e9) - asym) > 1e-4) return false;
    if (solveAll(f, asym, M.iv.ne(h)).length) return false; // asymptote value never reached
    const want = q.check.askDom ? M.iv.ne(asym) : M.iv.ne(h);
    return sameIv(q.options[q.correct].iv, want) && q.options.filter(o => sameIv(o.iv, want)).length === 1;
  },
  expInvMC(q) {
    const f = F(q.check.f);
    const good = (p) => { const g = F(p); for (let t = -3; t <= 3; t += 0.1) { if (!near(g(f(t)), t, 1e-6)) return false; } return true; };
    return q.options.every((o, i) => good(o.plain) === (i === q.correct));
  },
  fEqualsInv(q) {
    const f = F(q.check.f);
    const finv = (y) => { const s = solveAll(f, y, null); return s.length === 1 ? s[0] : NaN; };
    // scan for solutions of f(x) - finv(x) = 0 on a coarse grid around the answer
    let hits = 0;
    for (let x = -30; x <= 30; x += 0.5) { const d = f(x) - finv(x); if (Math.abs(d) < 1e-6) hits++; }
    return Math.abs(f(q.answer) - finv(q.answer)) < 1e-6 && hits === 1;
  },
};

// ---- run ----
const BAD_TEXT = /NaN|undefined|Infinity|\+ −|− −|\+ -|- -|\[object|null/;
for (const g of Q.GENERATORS) {
  ok(!!V[g.id], g.id, 'no verifier for generator');
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const rng = M.RNG('verify-' + g.id + '-' + i);
    let q;
    try { q = Q.build(g, rng); } catch (e) { ok(false, g.id, 'generator threw: ' + e.message); continue; }
    seen.add(strip(q.prompt) + JSON.stringify(q.options ? q.options.map(o => o.key) : ''));
    ok(!BAD_TEXT.test(q.prompt) && !BAD_TEXT.test(q.explain), g.id, 'bad text: ' + strip(q.prompt + ' || ' + q.explain), q);
    ok(!/(^|[^0-9.])1<i>x/.test(q.prompt), g.id, 'coefficient 1 shown', q);
    for (const p of collectPlains(q)) checkPlain(p, g.id);
    if (q.type === 'num') {
      ok(Number.isFinite(q.answer), g.id, 'non-finite answer', q);
      ok(M.checkNumber(String(q.answer), q.answer).ok, g.id, 'checker rejects own answer', q);
      ok(!M.checkNumber(String(q.answer + 1), q.answer).ok, g.id, 'checker accepts answer+1', q);
    } else if (q.type === 'expr') {
      ok(M.checkExpr(q.answerPlain, q.answerPlain, q.samples).ok, g.id, 'checker rejects own expression', q);
      ok(!M.checkExpr(q.answerPlain + ' + 1', q.answerPlain, q.samples).ok, g.id, 'checker accepts expr+1', q);
      const gg = F(q.answerPlain);
      ok(q.samples.filter(x => isFinite(gg(x))).length >= 5, g.id, 'too few valid sample points', q);
    } else if (q.type === 'mc') {
      ok(q.correct >= 0 && q.correct < q.options.length && q.options.length >= 2, g.id, 'bad correct index', q);
      ok(new Set(q.options.map(o => o.html)).size === q.options.length, g.id, 'duplicate option text', q);
      ok(new Set(q.options.map(o => o.key)).size === q.options.length, g.id, 'duplicate option key', q);
    } else if (q.type === 'point') {
      const W = q.visual.win;
      ok(Number.isInteger(q.answer.x) && Number.isInteger(q.answer.y) && q.answer.x >= W[0] && q.answer.x <= W[1] && q.answer.y >= W[2] && q.answer.y <= W[3], g.id, 'click answer off-grid', q);
    }
    // every drawn curve must actually be visible
    const visuals = [q.visual].concat((q.options || []).map(o => o.visual)).filter(v => v && v.kind === 'graph');
    for (const v of visuals) for (const c of v.curves) ok(visibleSamples(c.plain, c.dom, v.win).length > 100, g.id, 'curve barely visible: ' + c.plain, q);
    let res = false;
    try { res = V[g.id] ? V[g.id](q) : false; } catch (e) { res = false; ok(false, g.id, 'verifier threw: ' + e.stack.split('\n').slice(0, 2).join(' '), q); }
    ok(res, g.id, 'SEMANTIC CHECK FAILED', q);
  }
  console.log((failLog[g.id] ? '✘ ' : '✔ ') + g.id.padEnd(20) + ' tier ' + g.tier + '  ' + String(seen.size).padStart(5) + ' distinct versions');
}

// ---- answer-checker unit tests (how students type) ----
const num = [['3/2', 1.5, true], ['1.5', 1.5, true], ['−2', -2, true], ['-2', -2, true], ['2', -2, false], ['sqrt(16)', 4, true], ['4.00', 4, true],
  ['1.41', Math.SQRT2, true], ['1.4', Math.SQRT2, false], ['x', 3, false], ['', 3, false], ['3,5', 3.5, false], ['2^3', 8, true], ['-11', -11, true]];
for (const [inp, want, exp] of num) ok(M.checkNumber(inp, want).ok === exp, 'checker', 'checkNumber("' + inp + '", ' + want + ') should be ' + exp);
const S = [-5, -2, 0, 0.5, 3, 7, 11];
const ex = [
  ['(x-3)/2', '(x - 3)/2', true], ['x/2 - 1.5', '(x - 3)/2', true], ['0.5x-1.5', '(x - 3)/2', true], ['f^-1(x) = (x-3)/2', '(x - 3)/2', true],
  ['y = (x−3)÷2', '(x - 3)/2', true], ['x-3/2', '(x - 3)/2', false], ['(x+3)/2', '(x - 3)/2', false], ['2x+3', '(x - 3)/2', false],
  ['1/2(x-3)', '(x - 3)/2', true], ['(1/2)(x-3)', '(x - 3)/2', true], ['-(3-x)/2', '(x - 3)/2', true],
  ['sqrt(x-2)+3', 'sqrt(x - 2) + 3', true], ['√(x−2)+3', 'sqrt(x - 2) + 3', true], ['3+(x-2)^(1/2)', 'sqrt(x - 2) + 3', true], ['3-sqrt(x-2)', 'sqrt(x - 2) + 3', false],
  ['(3x+1)/(x-2)', '(3*x + 1)/(x - 2)', true], ['3x+1/x-2', '(3*x + 1)/(x - 2)', false], ['(1+3x)/(x-2)', '(3*x + 1)/(x - 2)', true],
  ['log_2(x-3)', 'log_2(x - 3)', true], ['ln(x-3)/ln(2)', 'log_2(x - 3)', true], ['ln(x)+2', 'ln(x) + 2', true], ['2x', '2*x', true], ['x2', '2*x', true],
  ['7x-8', '7*x - 8', true], ['7(x-8)', '7*x - 8', false], ['2cbrt(x)', '2*cbrt(x)', true], ['2x^(1/3)', '2*cbrt(x)', true],
];
for (const [inp, want, exp] of ex) {
  const samples = want.includes('log') || want.includes('ln') ? [3.5, 4, 5, 7, 10, 19] : want.includes('sqrt') ? [2, 2.5, 3, 6, 11, 18] : S;
  ok(M.checkExpr(inp, want, samples).ok === exp, 'checker', 'checkExpr("' + inp + '" vs "' + want + '") should be ' + exp);
}
console.log((failLog.checker ? '✘ ' : '✔ ') + 'answer checker unit tests (' + (num.length + ex.length) + ')');

console.log('\n' + checks.toLocaleString() + ' checks, ' + failures + ' failures');
for (const k in failLog) { console.log('\n[' + k + ']'); failLog[k].forEach(s => console.log('   - ' + s)); }
process.exit(failures ? 1 : 0);
