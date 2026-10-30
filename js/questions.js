/* Inverse Haunt — question generators.
   Every question is built from plain-text formulas that are parsed by MathCore,
   so what students SEE is exactly what the checker COMPUTES.
   test/verify.js independently re-checks thousands of generated questions. */
(function (root) {
  'use strict';
  const M = root.MathCore || require('./mathcore.js');
  const { pretty, numHtml, lin, coefX, addConst, iv, ivHtml, ivKey, compile } = M;

  const FX = '<i>f</i>(<i>x</i>)';
  const FINV = '<i>f</i><sup>−1</sup>';
  const FINVX = FINV + '(<i>x</i>)';
  const finvAt = (k) => FINV + '(' + numHtml(k) + ')';
  const fAt = (k) => '<i>f</i>(' + numHtml(k) + ')';
  const pt = (x, y) => '(' + numHtml(x) + ', ' + numHtml(y) + ')';
  const fdef = (plain) => '<span class="mx">' + FX + ' = ' + pretty(plain) + '</span>';
  const m = (h) => '<span class="mx">' + h + '</span>';
  const paren = (v) => (v < 0 ? '(' + numHtml(v) + ')' : numHtml(v));
  const swapXY = (html) => html.replace(/<i>x<\/i>/g, '<i>y</i>');

  const TOPICS = {
    notation: 'Function notation',
    points: 'Points on inverses',
    oneone: 'One-to-one & "is there an inverse?"',
    domran: 'Domain & range of inverses',
    find: 'Finding inverses',
    graphs: 'Graphs of inverses',
  };

  function finishMC(rng, correct, distractors) {
    const opts = rng.shuffle([Object.assign({ isCorrect: true }, correct)].concat(distractors.map(d => Object.assign({ isCorrect: false }, d))));
    const ci = opts.findIndex(o => o.isCorrect);
    opts.forEach(o => delete o.isCorrect);
    return { options: opts, correct: ci };
  }
  function labelGraphOptions(mc) {
    mc.options.forEach((o, i) => { o.label = 'ABCD'[i]; o.html = 'Graph ' + o.label; });
    return mc;
  }
  // choose up to n candidates whose key differs from correct and from each other
  function pickDistinct(correctKey, cands, n, keyFn) {
    const seen = new Set([correctKey]); const out = [];
    for (const c of cands) {
      const k = keyFn(c);
      if (!seen.has(k)) { seen.add(k); out.push(c); if (out.length === n) break; }
    }
    if (out.length < n) throw new Error('not enough distinct distractors');
    return out;
  }
  const validIv = (I) => I.all || I.ne != null || I.lo < I.hi;
  const ivOpt = (I, v) => ({ html: m(ivHtml(I, v)), iv: I, key: ivKey(I) });

  // visible difference between two curves on a window (used to keep graph options distinct)
  function visiblyDifferent(p1, d1, p2, d2, win) {
    const f1 = compile(p1), f2 = compile(p2);
    for (let x = win[0]; x <= win[1]; x += 0.05) {
      const in1 = x >= d1[0] && x <= d1[1], in2 = x >= d2[0] && x <= d2[1];
      const y1 = in1 ? f1(x) : NaN, y2 = in2 ? f2(x) : NaN;
      const v1 = isFinite(y1) && y1 >= win[2] && y1 <= win[3];
      const v2 = isFinite(y2) && y2 >= win[2] && y2 <= win[3];
      if (v1 !== v2) return true;
      if (v1 && v2 && Math.abs(y1 - y2) > 0.6) return true;
    }
    return false;
  }

  const G = [];
  function gen(id, tier, topic, fn) { G.push({ id, tier, topic, fn }); }

  // ================= TIER 1 — very easy, diagrams =================

  function mapping(rng, oneToOne) {
    const ins = rng.shuffle([-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4).sort((a, b) => a - b);
    let outs;
    if (oneToOne) outs = rng.shuffle([-4, -2, -1, 0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14, 15]).slice(0, 4);
    else outs = ins.map(() => rng.int(-4, 15));
    return { ins, outs, pairs: ins.map((x, i) => [x, outs[i]]) };
  }

  gen('mapEval', 1, 'notation', (rng) => {
    const mp = mapping(rng, false);
    const i = rng.int(0, 3), k = mp.ins[i], ans = mp.outs[i];
    return {
      type: 'num',
      prompt: 'The mapping diagram shows the function <i>f</i>. Find ' + m(fAt(k)) + '.',
      visual: { kind: 'mapping', pairs: mp.pairs },
      answer: ans,
      explain: 'Start at the input ' + numHtml(k) + ' and follow its arrow. It lands on ' + numHtml(ans) + ', so ' + m(fAt(k) + ' = ' + numHtml(ans)) + '.',
      check: { pairs: mp.pairs, ask: 'f', at: k },
    };
  });

  gen('mapInv', 1, 'points', (rng) => {
    const mp = mapping(rng, true);
    const i = rng.int(0, 3), y = mp.outs[i], ans = mp.ins[i];
    return {
      type: 'num',
      prompt: 'The mapping diagram shows the one-to-one function <i>f</i>. Find ' + m(finvAt(y)) + '.',
      visual: { kind: 'mapping', pairs: mp.pairs },
      answer: ans,
      explain: m(FINV) + ' runs the arrows backwards. Which input lands on ' + numHtml(y) + '? It’s ' + numHtml(ans) + ', because ' + m(fAt(ans) + ' = ' + numHtml(y)) + '. So ' + m(finvAt(y) + ' = ' + numHtml(ans)) + '.',
      check: { pairs: mp.pairs, ask: 'finv', at: y },
    };
  });

  gen('mapHasInv', 1, 'oneone', (rng) => {
    const one = rng.chance(0.5);
    const mp = mapping(rng, true);
    if (!one) { const i = rng.int(0, 3); let j = rng.int(0, 3); if (j === i) j = (i + 1) % 4; mp.outs[j] = mp.outs[i]; mp.pairs = mp.ins.map((x, k) => [x, mp.outs[k]]); }
    const yes = { html: 'Yes — every output comes from exactly one input, so <i>f</i> is one-to-one', key: 'yes' };
    const no = { html: 'No — two different inputs share the same output', key: 'no' };
    const silly = { html: 'No — an inverse only exists when the inputs and outputs are the same numbers', key: 'silly' };
    const mc = finishMC(rng, one ? yes : no, one ? [no, silly] : [yes, silly]);
    let explain;
    if (one) explain = 'Each output is hit by only one arrow, so <i>f</i> is one-to-one and every arrow can be reversed. ' + m(FINV) + ' exists.';
    else {
      const dup = mp.outs.find((v, i) => mp.outs.indexOf(v) !== i);
      const xs = mp.pairs.filter(p => p[1] === dup).map(p => numHtml(p[0]));
      explain = 'Inputs ' + xs.join(' and ') + ' both go to ' + numHtml(dup) + '. Reversed, ' + numHtml(dup) + ' would need to go to two places — that’s not a function. So no inverse.';
    }
    return Object.assign({ type: 'mc', prompt: 'Does the function <i>f</i> shown have an inverse function?', visual: { kind: 'mapping', pairs: mp.pairs }, explain, check: { pairs: mp.pairs } }, mc);
  });

  gen('linEval', 1, 'notation', (rng) => {
    const a = rng.intEx(-6, 6, [0, 1]), b = rng.intEx(-9, 9, [0]), k = rng.intEx(-5, 6, [0]);
    const plain = lin(a, b), ans = a * k + b;
    return {
      type: 'num',
      prompt: 'Given ' + fdef(plain) + ', find ' + m(fAt(k)) + '.',
      answer: ans,
      explain: 'Replace every <i>x</i> with ' + numHtml(k) + ': ' + m(fAt(k) + ' = ' + numHtml(a) + paren(k) + (b > 0 ? ' + ' : ' − ') + Math.abs(b) + ' = ' + numHtml(ans)) + '.',
      check: { f: plain, at: k, ask: 'f' },
    };
  });

  gen('pointSwapMC', 1, 'points', (rng) => {
    let p, q;
    do { p = rng.intEx(-9, 9, [0]); q = rng.intEx(-9, 9, [0]); } while (Math.abs(p) === Math.abs(q));
    const o = (x, y) => ({ html: m(pt(x, y)), pt: [x, y], key: x + ',' + y });
    const mc = finishMC(rng, o(q, p), [o(-p, q), o(p, -q), o(-q, -p)]);
    return Object.assign({
      type: 'mc',
      prompt: 'The point ' + m(pt(p, q)) + ' lies on the graph of ' + m('<i>y</i> = ' + FX) + '. Which point <b>must</b> lie on the graph of ' + m('<i>y</i> = ' + FINVX) + '?',
      explain: 'An inverse swaps inputs and outputs. ' + m(fAt(p) + ' = ' + numHtml(q)) + ' means ' + m(finvAt(q) + ' = ' + numHtml(p)) + ', so the point is ' + m(pt(q, p)) + ' — the reflection in the line <i>y</i> = <i>x</i>.',
      check: { p, q },
    }, mc);
  });

  gen('pointClick', 1, 'points', (rng) => {
    let p, q;
    do { p = rng.intEx(-7, 7, [0]); q = rng.intEx(-7, 7, [0]); } while (p === q);
    return {
      type: 'point',
      prompt: 'Point <b>P</b> ' + m(pt(p, q)) + ' is on ' + m('<i>y</i> = ' + FX) + '. <b>Click the grid</b> where P lands on ' + m('<i>y</i> = ' + FINVX) + '.',
      visual: { kind: 'graph', win: [-8, 8, -8, 8], yx: true, curves: [], points: [{ x: p, y: q, label: 'P' }], clickable: true },
      answer: { x: q, y: p },
      explain: 'Swap the coordinates: ' + m(pt(p, q)) + ' → ' + m(pt(q, p)) + '. That’s P reflected in the dashed line <i>y</i> = <i>x</i>.',
      check: { p, q },
    };
  });

  gen('mirrorLine', 1, 'graphs', (rng) => {
    const o = (h, k) => ({ html: h, key: k });
    const mc = finishMC(rng, o(m('<i>y</i> = <i>x</i>'), 'yx'), [o('the <i>x</i>-axis', 'xa'), o('the <i>y</i>-axis', 'ya'), o(m('<i>y</i> = −<i>x</i>'), 'ynx')]);
    return Object.assign({
      type: 'mc',
      prompt: 'The graph of ' + m('<i>y</i> = ' + FINVX) + ' is always a reflection of ' + m('<i>y</i> = ' + FX) + ' in which line?',
      explain: 'Every point (<i>a</i>, <i>b</i>) on <i>f</i> becomes (<i>b</i>, <i>a</i>) on ' + m(FINV) + '. Swapping <i>x</i> and <i>y</i> is a reflection in <i>y</i> = <i>x</i>.',
      check: { fixed: 'yx' },
    }, mc);
  });

  // ================= TIER 2 =================

  gen('tableInv', 2, 'points', (rng) => {
    const x0 = rng.int(-3, 2);
    const xs = [0, 1, 2, 3, 4].map(i => x0 + i);
    const ys = rng.shuffle([-7, -5, -3, -1, 0, 2, 4, 6, 8, 9, 11, 13, 16]).slice(0, 5);
    const i = rng.int(0, 4), y = ys[i], ans = xs[i];
    return {
      type: 'num',
      prompt: 'The table shows a one-to-one function <i>f</i>. Find ' + m(finvAt(y)) + '.',
      visual: { kind: 'table', rows: xs.map((x, k) => [x, ys[k]]) },
      answer: ans,
      explain: 'Look for ' + numHtml(y) + ' in the <b><i>f</i>(<i>x</i>)</b> row (not the <i>x</i> row!). It sits under <i>x</i> = ' + numHtml(ans) + ', so ' + m(finvAt(y) + ' = ' + numHtml(ans)) + '.',
      check: { rows: xs.map((x, k) => [x, ys[k]]), at: y },
    };
  });

  gen('linInvValue', 2, 'find', (rng) => {
    const a = rng.sign() * rng.int(2, 6), mm = rng.int(-6, 8), b = rng.intEx(-12, 12, [0]);
    const k = a * mm + b, plain = lin(a, b);
    const v = rng.int(0, 1);
    const ask = v === 0 ? 'find ' + m(finvAt(k)) : 'solve ' + m('<i>f</i>(<i>x</i>) = ' + numHtml(k));
    return {
      type: 'num',
      prompt: 'Given ' + fdef(plain) + ', ' + ask + '.',
      answer: mm,
      explain: 'Set the function equal to ' + numHtml(k) + ': ' + m(pretty(plain) + ' = ' + numHtml(k)) + '. Then ' + m(numHtml(a) + '<i>x</i> = ' + numHtml(k - b)) + ', so <i>x</i> = ' + numHtml(mm) + '. Check: ' + m(fAt(mm) + ' = ' + numHtml(k)) + ' ✔',
      check: { f: plain, k },
    };
  });

  gen('compTrick', 2, 'notation', (rng) => {
    const cube = rng.chance(0.4);
    const plain = cube ? addConst('x^3', rng.intEx(-9, 9, [0])) : lin(rng.sign() * rng.int(2, 7), rng.intEx(-9, 9, [0]));
    const k = rng.intEx(-9, 15, [0, 1]);
    const outer = rng.chance(0.5);
    const expr = outer ? '<i>f</i>(' + finvAt(k) + ')' : FINV + '(' + fAt(k) + ')';
    return {
      type: 'num',
      prompt: 'Given ' + fdef(plain) + ', find ' + m(expr) + '.',
      answer: k,
      explain: '<i>f</i> and ' + m(FINV) + ' undo each other, so ' + m(expr + ' = ' + numHtml(k)) + '. No algebra needed — that was the trick! 🎃',
      check: { f: plain, k, outer },
    };
  });

  const HLT_WIN = [-6, 6, -6, 6];
  const ONE_POOL = [
    { p: '0.5*x + 1' }, { p: '-2*x + 1' }, { p: 'x^3/20' }, { p: '2^x - 3' },
    { p: 'sqrt(x + 5) - 2', dom: [-5, 6] }, { p: '-x^3/25 + 1' }, { p: '3 - 0.5*x' }, { p: 'ln(x + 6)', dom: [-5.95, 6] },
  ];
  const NOT_POOL = [
    { p: '(x - 1)^2/2 - 3' }, { p: '4 - (x + 1)^2/2' }, { p: 'abs(x) - 2' }, { p: 'x^3/6 - 2*x' },
    { p: '2' }, { p: '4 - x^2/3' }, { p: 'abs(x - 1) + 1' }, { p: '(x + 2)^2/3 - 4' },
  ];
  gen('hltGraphs', 2, 'oneone', (rng) => {
    const good = rng.pick(ONE_POOL);
    const bad = rng.shuffle(NOT_POOL).slice(0, 3);
    const g = (c) => ({ visual: { kind: 'graph', win: HLT_WIN, curves: [{ plain: c.p, dom: c.dom || [-6, 6], cls: 'cand' }] }, plain: c.p, dom: c.dom || [-6, 6], key: c.p });
    const mc = labelGraphOptions(finishMC(rng, g(good), bad.map(g)));
    return Object.assign({
      type: 'mc',
      prompt: 'Which graph shows a <b>one-to-one</b> function (so it has an inverse)? Think: horizontal line test.',
      explain: 'Horizontal line test: if any horizontal line hits the graph more than once, two inputs share an output, so there’s no inverse. Only Graph ' + 'ABCD'[mc.correct] + ' passes — every horizontal line hits it at most once.',
      check: { win: HLT_WIN },
    }, mc);
  });

  gen('domRangeSwap', 2, 'domran', (rng) => {
    const askDom = rng.chance(0.5);
    let fD, fR, cands, correct, v;
    if (rng.chance(0.65)) {
      const vals = rng.shuffle([-8, -6, -5, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 12]).slice(0, 4).sort((a, b) => a - b);
      const [v1, v2, v3, v4] = vals;
      if (rng.chance(0.5)) { fD = iv.closed(v1, v3); fR = iv.closed(v2, v4); } else { fD = iv.closed(v2, v4); fR = iv.closed(v1, v3); }
      cands = [fD, fR, iv.closed(fD.lo, fR.hi), iv.closed(fR.lo, fD.hi), iv.closed(-fR.hi, -fR.lo)];
    } else {
      const a = rng.intEx(-6, 6, [0]); const c = rng.intEx(-6, 9, [a, -a, 0]);
      fD = iv.ge(a); fR = iv.le(c);
      cands = [fD, fR, iv.ge(c), iv.le(a), iv.ge(-c)];
    }
    if (askDom) { correct = fR; v = 'x'; } else { correct = fD; v = 'y'; }
    const ds = pickDistinct(ivKey(correct), rng.shuffle(cands).filter(validIv), 3, ivKey);
    const mc = finishMC(rng, ivOpt(correct, v), ds.map(I => ivOpt(I, v)));
    return Object.assign({
      type: 'mc',
      prompt: 'A function <i>f</i> has domain ' + m(ivHtml(fD, 'x')) + ' and range ' + m(ivHtml(fR, 'y')) + '. What is the <b>' + (askDom ? 'domain' : 'range') + '</b> of ' + m(FINV) + '?',
      explain: 'Inverses swap inputs and outputs, so domain and range swap too. ' + (askDom ? 'Domain of ' + m(FINV) + ' = range of <i>f</i>: ' : 'Range of ' + m(FINV) + ' = domain of <i>f</i>: ') + m(ivHtml(correct, v)) + '.',
      check: { fD, fR, askDom },
    }, mc);
  });

  const HASINV_EASY = [
    { p: 'x^2 + 1', d: iv.all(), one: false }, { p: 'x^2 + 1', d: iv.ge(0), one: true }, { p: 'x^3 - 4', d: iv.all(), one: true },
    { p: 'abs(x - 2)', d: iv.all(), one: false }, { p: '5 - 3*x', d: iv.all(), one: true }, { p: '2^x', d: iv.all(), one: true },
    { p: '7', d: iv.all(), one: false }, { p: 'x^4', d: iv.all(), one: false }, { p: 'sqrt(x)', d: iv.ge(0), one: true },
  ];
  const HASINV_TRICKY = [
    { p: 'x^2 - 6*x', d: iv.ge(0), one: false }, { p: '1/x', d: iv.ne(0), one: true }, { p: 'x^2', d: iv.ge(-1), one: false },
    { p: 'x^3 - 3*x', d: iv.all(), one: false }, { p: 'x^2 - 4*x + 1', d: iv.ge(2), one: true }, { p: '(x - 3)^2', d: iv.le(3), one: true },
    { p: '(x + 2)^2 - 5', d: iv.ge(-2), one: true }, { p: 'abs(x)', d: iv.ge(-2), one: false }, { p: 'x^2 + 2*x', d: iv.ge(-1), one: true },
  ];
  function hasInv(rng, pool) {
    const c = rng.pick(pool);
    const yes = { html: 'Yes — <i>f</i> is one-to-one on this domain', key: 'y' };
    const no = { html: 'No — <i>f</i> is not one-to-one on this domain', key: 'n' };
    const mc = finishMC(rng, c.one ? yes : no, [c.one ? no : yes]);
    return Object.assign({
      type: 'mc',
      prompt: 'Does ' + fdef(c.p) + ', ' + m(ivHtml(c.d, 'x')) + ' have an inverse function? (Sketch it on your GDC!)',
      explain: c.one ? 'On this domain the graph passes the horizontal line test — every output comes from just one input — so ' + m(FINV) + ' exists.'
        : 'On this domain the graph fails the horizontal line test: some horizontal line hits it more than once (two inputs, same output), so there’s no inverse.',
      check: { f: c.p, dom: c.d, one: c.one },
    }, mc);
  }
  gen('hasInvEasy', 2, 'oneone', (rng) => hasInv(rng, HASINV_EASY));

  // ================= TIER 3 =================

  gen('hasInvTricky', 3, 'oneone', (rng) => hasInv(rng, HASINV_TRICKY));

  gen('linInvExpr', 3, 'find', (rng) => {
    const v = rng.int(0, 2);
    const b = rng.intEx(-9, 9, [0]);
    let f, inv, a;
    if (v === 0) { a = rng.sign() * rng.int(2, 7); f = lin(a, b); inv = '(' + addConst('x', -b) + ')/' + (a < 0 ? '(' + a + ')' : a); }
    else if (v === 1) { a = rng.int(2, 7); f = '(' + addConst('x', b) + ')/' + a; inv = lin(a, -b); }
    else { a = rng.int(2, 7); f = b + ' - ' + coefX(a); inv = '(' + b + ' - x)/' + a; }
    return {
      type: 'expr',
      prompt: 'Find ' + m(FINVX) + ' for ' + fdef(f) + '.',
      answerPlain: inv,
      samples: [-7, -3.5, -1, 0, 0.5, 2, 4.25, 9, 13],
      explain: 'Write ' + m('<i>y</i> = ' + pretty(f)) + ', swap <i>x</i> and <i>y</i>, then solve for <i>y</i>. You get ' + m(FINVX + ' = ' + pretty(inv)) + '. (Equivalent forms are accepted.)',
      check: { f, inv },
    };
  });

  gen('linInvMC', 3, 'find', (rng) => {
    const a = rng.sign() * rng.int(2, 6), b = rng.intEx(-9, 9, [0]);
    const f = lin(a, b);
    const den = a < 0 ? '(' + a + ')' : String(a);
    const right = '(' + addConst('x', -b) + ')/' + den;
    const d = ['(' + addConst('x', b) + ')/' + den, addConst('x/' + den, -b), '1/(' + f + ')', lin(a, -b)];
    const o = (p) => ({ html: m(FINVX + ' = ' + pretty(p)), plain: p, key: p });
    const mc = finishMC(rng, o(right), rng.shuffle(d).slice(0, 3).map(o));
    return Object.assign({
      type: 'mc',
      prompt: 'Which of these is the inverse of ' + fdef(f) + '?',
      explain: 'Undo the steps in reverse order: <i>f</i> multiplies by ' + numHtml(a) + ' then ' + (b > 0 ? 'adds ' + b : 'subtracts ' + (-b)) + ', so ' + m(FINV) + ' ' + (b > 0 ? 'subtracts ' + b : 'adds ' + (-b)) + ' then divides by ' + numHtml(a) + ': ' + m(pretty(right)) + '. Careful: ' + m('1/<i>f</i>(<i>x</i>)') + ' is a reciprocal, NOT an inverse.',
      check: { f },
    }, mc);
  });

  const REFLECT_POOL = [
    { f: '2*x + 1', fd: [-Infinity, Infinity], inv: '(x - 1)/2', id: [-Infinity, Infinity] },
    { f: 'x^3/8', fd: [-Infinity, Infinity], inv: '2*cbrt(x)', id: [-Infinity, Infinity] },
    { f: 'sqrt(x + 4)', fd: [-4, Infinity], inv: 'x^2 - 4', id: [0, Infinity] },
    { f: '2^x', fd: [-Infinity, Infinity], inv: 'log_2(x)', id: [0.0001, Infinity] },
    { f: '(x - 1)^2/2', fd: [1, Infinity], inv: '1 + sqrt(2*x)', id: [0, Infinity] },
    { f: '0.5*x - 2', fd: [-Infinity, Infinity], inv: '2*x + 4', id: [-Infinity, Infinity] },
    { f: 'e^x - 3', fd: [-Infinity, Infinity], inv: 'ln(x + 3)', id: [-2.9999, Infinity] },
  ];
  const negP = (p) => '-(' + p + ')';
  const subNeg = (p) => M.toPlain(substNeg(M.parse(p)));
  function substNeg(n) {
    if (n.t === 'var') return { t: 'neg', a: { t: 'var' } };
    const c = Object.assign({}, n);
    if (n.a) c.a = substNeg(n.a); if (n.b) c.b = substNeg(n.b); if (n.arg) c.arg = substNeg(n.arg);
    return c;
  }
  const flipD = (d) => [-d[1], -d[0]];
  gen('reflectMC', 3, 'graphs', (rng) => {
    const c = rng.pick(REFLECT_POOL);
    const W = [-6, 6, -6, 6];
    const cands = rng.shuffle([
      { p: negP(c.f), d: c.fd }, { p: subNeg(c.f), d: flipD(c.fd) }, { p: negP(c.inv), d: c.id },
      { p: subNeg(c.inv), d: flipD(c.id) }, { p: c.f, d: c.fd },
    ]);
    const chosen = [];
    for (const k of cands) {
      if (!visiblyDifferent(k.p, k.d, c.inv, c.id, W)) continue;
      if (chosen.some(o => !visiblyDifferent(k.p, k.d, o.p, o.d, W))) continue;
      chosen.push(k); if (chosen.length === 3) break;
    }
    const g = (k) => ({ visual: { kind: 'graph', win: W, yx: true, curves: [{ plain: c.f, dom: c.fd, cls: 'f' }, { plain: k.p, dom: k.d, cls: 'cand' }] }, plain: k.p, dom: k.d, key: k.p });
    const mc = labelGraphOptions(finishMC(rng, g({ p: c.inv, d: c.id }), chosen.map(g)));
    return Object.assign({
      type: 'mc',
      prompt: 'The faint curve in each graph is ' + m('<i>y</i> = ' + FX) + '. In which graph is the bold curve ' + m('<i>y</i> = ' + FINVX) + '?',
      explain: 'The inverse is the mirror image of <i>f</i> in the dashed line <i>y</i> = <i>x</i>. In Graph ' + 'ABCD'[mc.correct] + ', every point (<i>a</i>, <i>b</i>) on <i>f</i> matches a point (<i>b</i>, <i>a</i>) on the bold curve. The others are reflections in the <i>x</i>- or <i>y</i>-axis (or no reflection at all).',
      check: { f: c.f, fd: c.fd, win: W },
    }, mc);
  });

  gen('interceptSwap', 3, 'graphs', (rng) => {
    let b, c;
    do { b = rng.intEx(-7, 7, [0]); c = rng.intEx(-7, 7, [0]); } while (Math.abs(b) === Math.abs(c));
    const askX = rng.chance(0.5);
    const o = (x, y) => ({ html: m(pt(x, y)), pt: [x, y], key: x + ',' + y });
    const mc = askX ? finishMC(rng, o(b, 0), [o(0, b), o(c, 0), o(-b, 0)]) : finishMC(rng, o(0, c), [o(c, 0), o(0, b), o(0, -c)]);
    const fplain = b + '*(1 - x/' + (c < 0 ? '(' + c + ')' : c) + ')';
    return Object.assign({
      type: 'mc',
      prompt: 'The graph of ' + m('<i>y</i> = ' + FX) + ' crosses the <i>y</i>-axis at ' + m(pt(0, b)) + ' and the <i>x</i>-axis at ' + m(pt(c, 0)) + '. Where does ' + m('<i>y</i> = ' + FINVX) + ' cross the <b>' + (askX ? '<i>x</i>' : '<i>y</i>') + '-axis</b>?',
      visual: { kind: 'graph', win: [-8, 8, -8, 8], curves: [{ plain: fplain, dom: [-Infinity, Infinity], cls: 'f' }], points: [{ x: 0, y: b }, { x: c, y: 0 }] },
      explain: 'Swap the coordinates of each intercept: ' + m(pt(0, b) + ' → ' + pt(b, 0)) + ' and ' + m(pt(c, 0) + ' → ' + pt(0, c)) + '. So ' + m(FINV) + ' crosses the ' + (askX ? '<i>x</i>-axis at ' + m(pt(b, 0)) : '<i>y</i>-axis at ' + m(pt(0, c))) + '. The intercepts trade axes!',
      check: { f: fplain, b, c, askX },
    }, mc);
  });

  gen('nonlinValue', 3, 'find', (rng) => {
    const kind = rng.pick(['cube', 'exp', 'quad', 'sqrt', 'frac']);
    let plain, dom = iv.all(), ans, k, domTxt = '', how;
    if (kind === 'cube') { const b = rng.intEx(-9, 9, [0]); ans = rng.intEx(-4, 4, [0]); plain = addConst('x^3', b); k = ans ** 3 + b; how = m('<i>x</i><sup>3</sup> = ' + numHtml(k - b)) + ', so <i>x</i> = ∛(' + numHtml(k - b) + ') = ' + numHtml(ans); }
    else if (kind === 'exp') { const b = rng.intEx(-9, 9, [0]); ans = rng.int(1, 6); plain = addConst('2^x', b); k = 2 ** ans + b; how = m('2<sup><i>x</i></sup> = ' + numHtml(k - b)) + ', so <i>x</i> = ' + numHtml(ans) + ' (try powers of 2, or log<sub>2</sub> on your GDC)'; }
    else if (kind === 'quad') {
      const h = rng.intEx(-5, 5, [0]), c = rng.intEx(-6, 6, [0]), t = rng.int(1, 5);
      ans = h + t; plain = addConst('(' + addConst('x', -h) + ')^2', c); k = t * t + c; dom = iv.ge(h); domTxt = ', ' + m(ivHtml(dom, 'x'));
      how = m('(<i>x</i> ' + (h > 0 ? '− ' + h : '+ ' + (-h)) + ')<sup>2</sup> = ' + numHtml(t * t)) + ', so <i>x</i> ' + (h > 0 ? '− ' + h : '+ ' + (-h)) + ' = ±' + t + '. Only <i>x</i> = ' + numHtml(ans) + ' is in the domain ' + m(ivHtml(dom, 'x')) + ' (the other one, ' + numHtml(h - t) + ', is a trap!)';
    }
    else if (kind === 'sqrt') { const h = rng.int(-5, 6), c = rng.intEx(-6, 6, [0]), t = rng.int(1, 5); ans = t * t - h; plain = addConst('sqrt(' + addConst('x', h) + ')', c); k = t + c; dom = iv.ge(-h); domTxt = ', ' + m(ivHtml(dom, 'x')); how = m('√(' + (h === 0 ? '<i>x</i>' : '<i>x</i> ' + (h > 0 ? '+ ' + h : '− ' + (-h))) + ') = ' + t) + ', square both sides: ' + (h === 0 ? '<i>x</i>' : '<i>x</i> ' + (h > 0 ? '+ ' + h : '− ' + (-h))) + ' = ' + (t * t) + ', so <i>x</i> = ' + numHtml(ans); }
    else { const a = rng.int(2, 5), b = rng.intEx(-9, 9, [0]); let mm; do { mm = rng.int(-8, 12); } while ((mm + b) % a !== 0); ans = mm; plain = '(' + addConst('x', b) + ')/' + a; k = (mm + b) / a; how = 'multiply by ' + a + ': ' + m('<i>x</i> ' + (b > 0 ? '+ ' + b : '− ' + (-b)) + ' = ' + numHtml(k * a)) + ', so <i>x</i> = ' + numHtml(ans); }
    return {
      type: 'num',
      prompt: 'Given ' + fdef(plain) + domTxt + ', find ' + m(finvAt(k)) + '.',
      answer: ans,
      explain: m(finvAt(k)) + ' is the input that makes ' + m('<i>f</i>(<i>x</i>) = ' + numHtml(k)) + '. Solve: ' + how + '. Check: ' + m(fAt(ans) + ' = ' + numHtml(k)) + ' ✔',
      check: { f: plain, dom, k },
    };
  });

  gen('solveInvEq', 3, 'find', (rng) => {
    const a = rng.sign() * rng.int(2, 6), b = rng.intEx(-9, 9, [0]), mm = rng.intEx(-6, 7, [0]);
    const plain = lin(a, b), ans = a * mm + b;
    return {
      type: 'num',
      prompt: 'Given ' + fdef(plain) + ', solve ' + m(FINVX + ' = ' + numHtml(mm)) + '.',
      answer: ans,
      explain: m(FINVX + ' = ' + numHtml(mm)) + ' means <i>f</i> sends ' + numHtml(mm) + ' to <i>x</i>. So <i>x</i> = ' + m(fAt(mm) + ' = ' + numHtml(a) + paren(mm) + (b > 0 ? ' + ' + b : ' − ' + (-b)) + ' = ' + numHtml(ans)) + '. No need to find ' + m(FINVX) + ' at all!',
      check: { f: plain, m: mm },
    };
  });

  gen('rangeInvFromDomain', 3, 'domran', (rng) => {
    const a = rng.int(2, 4), b = rng.intEx(-6, 6, [0]);
    const p = rng.int(-4, 2), q = p + rng.int(2, 5);
    const plain = lin(a, b), fp = a * p + b, fq = a * q + b;
    const correct = iv.closed(p, q);
    const cands = rng.shuffle([iv.closed(fp, fq), iv.closed(-q, -p), iv.closed(p, fq), iv.closed(fp, q), iv.closed(0, q), iv.closed(p, q + 1)]);
    const ds = pickDistinct(ivKey(correct), cands.filter(validIv), 3, ivKey);
    const mc = finishMC(rng, ivOpt(correct, 'y'), ds.map(I => ivOpt(I, 'y')));
    return Object.assign({
      type: 'mc',
      prompt: 'The function ' + fdef(plain) + ' has domain ' + m(ivHtml(correct, 'x')) + '. What is the <b>range</b> of ' + m(FINV) + '?',
      explain: 'Trick question — no calculating needed! The range of ' + m(FINV) + ' is the domain of <i>f</i>: ' + m(ivHtml(correct, 'y')) + '. (The range of <i>f</i>, ' + m(ivHtml(iv.closed(fp, fq), 'y')) + ', would be the <i>domain</i> of ' + m(FINV) + '.)',
      check: { f: plain, dom: correct, ask: 'range' },
    }, mc);
  });

  gen('domInvFromFormula', 3, 'domran', (rng) => {
    const a = rng.sign() * rng.int(2, 4), b = rng.intEx(-6, 6, [0]);
    const p = rng.int(-4, 2), q = p + rng.int(2, 4);
    const plain = lin(a, b), fp = a * p + b, fq = a * q + b, lo = Math.min(fp, fq), hi = Math.max(fp, fq);
    const correct = iv.closed(lo, hi), D = iv.closed(p, q);
    const cands = rng.shuffle([D, iv.closed(-hi, -lo), iv.closed(lo, q), iv.closed(p, hi), iv.closed(lo + 1, hi + 1), iv.closed(lo, hi + 2)]);
    const ds = pickDistinct(ivKey(correct), cands.filter(validIv), 3, ivKey);
    const mc = finishMC(rng, ivOpt(correct, 'x'), ds.map(I => ivOpt(I, 'x')));
    return Object.assign({
      type: 'mc',
      prompt: 'The function ' + fdef(plain) + ' has domain ' + m(ivHtml(D, 'x')) + '. What is the <b>domain</b> of ' + m(FINV) + '?',
      explain: 'Domain of ' + m(FINV) + ' = range of <i>f</i>. The ends: ' + m(fAt(p) + ' = ' + numHtml(fp)) + ' and ' + m(fAt(q) + ' = ' + numHtml(fq)) + '.' + (a < 0 ? ' The slope is negative, so the order flips! ' : ' ') + 'Domain of ' + m(FINV) + ': ' + m(ivHtml(correct, 'x')) + '.',
      check: { f: plain, dom: D },
    }, mc);
  });

  const CLICK_POOL = [
    { f: '2^x - 4', d: [-Infinity, Infinity], xi: 2, yi: -3 },
    { f: 'x^3/8 + 1', d: [-Infinity, Infinity], xi: -2, yi: 1 },
    { f: 'sqrt(x + 4) - 1', d: [-4, Infinity], xi: -3, yi: 1 },
    { f: '2*x - 6', d: [-Infinity, Infinity], xi: 3, yi: -6 },
    { f: '3 - x/2', d: [-Infinity, Infinity], xi: 6, yi: 3 },
    { f: 'ln(x + 3)', d: [-2.9999, Infinity], xi: -2, yi: null },
    { f: '5 - 2^x', d: [-Infinity, Infinity], xi: null, yi: 4 },
  ];
  gen('interceptClick', 3, 'graphs', (rng) => {
    const c = rng.pick(CLICK_POOL);
    let askY = c.xi != null && (c.yi == null || rng.chance(0.5));
    const ans = askY ? { x: 0, y: c.xi } : { x: c.yi, y: 0 };
    return {
      type: 'point',
      prompt: 'Here is the graph of ' + m('<i>y</i> = ' + FX) + '. <b>Click</b> the point where ' + m('<i>y</i> = ' + FINVX) + ' crosses the <b>' + (askY ? '<i>y</i>' : '<i>x</i>') + '-axis</b>.',
      visual: { kind: 'graph', win: [-8, 8, -8, 8], yx: true, curves: [{ plain: c.f, dom: c.d, cls: 'f' }], clickable: true },
      answer: ans,
      explain: askY
        ? '<i>f</i> crosses the <i>x</i>-axis at ' + m(pt(c.xi, 0)) + '. Swap the coordinates: ' + m(FINV) + ' crosses the <i>y</i>-axis at ' + m(pt(0, c.xi)) + '.'
        : '<i>f</i> crosses the <i>y</i>-axis at ' + m(pt(0, c.yi)) + '. Swap the coordinates: ' + m(FINV) + ' crosses the <i>x</i>-axis at ' + m(pt(c.yi, 0)) + '.',
      check: { f: c.f, d: c.d, askY },
    };
  });

  // ================= TIER 4 — hard =================

  const quadPlain = (h, k) => addConst('(' + addConst('x', -h) + ')^2', k);

  gen('quadInvExpr', 4, 'find', (rng) => {
    const h = rng.intEx(-5, 5, [0]), k = rng.intEx(-6, 6, [0]);
    const right = rng.chance(0.6);
    const f = quadPlain(h, k), dom = right ? iv.ge(h) : iv.le(h);
    const root = 'sqrt(' + addConst('x', -k) + ')';
    const inv = right ? addConst(root, h) : h + ' - ' + root;
    return {
      type: 'expr',
      prompt: 'Find ' + m(FINVX) + ' for ' + fdef(f) + ', ' + m(ivHtml(dom, 'x')) + '.',
      answerPlain: inv,
      samples: [0, 0.5, 1, 2.25, 4, 7, 12, 20].map(t => t + k),
      inputHint: 'Use sqrt( ) or the √ button.',
      explain: 'Swap: ' + m('<i>x</i> = (<i>y</i> ' + (h > 0 ? '− ' + h : '+ ' + (-h)) + ')<sup>2</sup> ' + (k > 0 ? '+ ' + k : '− ' + (-k))) + '. Then ' + m('(<i>y</i> ' + (h > 0 ? '− ' + h : '+ ' + (-h)) + ')<sup>2</sup> = ' + pretty(addConst('x', -k))) + ', so ' + m('<i>y</i> = ' + numHtml(h) + ' ± ' + pretty(root)) + '. The original domain ' + m(ivHtml(dom, 'x')) + ' becomes the range of ' + m(FINV) + ', so we need the <b>' + (right ? '+' : '−') + '</b> sign: ' + m(FINVX + ' = ' + pretty(inv)) + '.',
      check: { f, dom, inv },
    };
  });

  gen('quadInvMC', 4, 'find', (rng) => {
    const h = rng.intEx(-5, 5, [0]), k = rng.intEx(-6, 6, [0, h, -h]);
    const right = rng.chance(0.5);
    const f = quadPlain(h, k), dom = right ? iv.ge(h) : iv.le(h);
    const r = (s) => 'sqrt(' + addConst('x', s) + ')';
    const plus = addConst(r(-k), h), minus = h + ' - ' + r(-k);
    const correct = right ? plus : minus;
    const ds = [right ? minus : plus, addConst(r(-k), -h), addConst(r(k), h), addConst(r(-h), k)];
    const o = (p) => ({ html: m(FINVX + ' = ' + pretty(p)), plain: p, key: p });
    const mc = finishMC(rng, o(correct), ds.slice(0, 3).map(o));
    return Object.assign({
      type: 'mc',
      prompt: 'Which is the inverse of ' + fdef(f) + ', ' + m(ivHtml(dom, 'x')) + '?',
      explain: 'Solving gives ' + m('<i>y</i> = ' + numHtml(h) + ' ± ' + pretty(r(-k))) + '. The range of ' + m(FINV) + ' must equal the domain of <i>f</i>, ' + m(ivHtml(dom, 'y')) + ', so take the ' + (right ? '+' : '−') + ' sign: ' + m(pretty(correct)) + '.',
      check: { f, dom },
    }, mc);
  });

  gen('quadRestrictMC', 4, 'oneone', (rng) => {
    const h = rng.intEx(-5, 5, [0]), k = rng.intEx(-6, 6, [0]);
    const expanded = rng.chance(0.5);
    let f;
    if (expanded) { const B = -2 * h, C = h * h + k; f = addConst('x^2' + (B > 0 ? ' + ' + coefX(B) : ' - ' + coefX(-B)), C); }
    else f = quadPlain(h, k);
    const correct = rng.chance(0.5) ? iv.ge(h) : iv.le(h);
    const bad = rng.shuffle([iv.ge(h - rng.int(1, 3)), iv.le(h + rng.int(1, 3)), iv.all(), iv.ge(-h), iv.le(-h), iv.ge(k), iv.le(k), iv.ge(0), iv.le(0)])
      .filter(I => I.all || (isFinite(I.lo) ? I.lo < h : I.hi > h));
    const ds = pickDistinct(ivKey(correct), bad, 3, ivKey);
    const mc = finishMC(rng, ivOpt(correct, 'x'), ds.map(I => ivOpt(I, 'x')));
    return Object.assign({
      type: 'mc',
      prompt: 'Which domain makes ' + fdef(f) + ' one-to-one (so it has an inverse)?',
      explain: (expanded ? 'Find the vertex: <i>x</i> = −<i>b</i>/(2<i>a</i>) = ' + numHtml(h) + '. ' : 'The vertex is at <i>x</i> = ' + numHtml(h) + '. ') + 'A parabola turns around at its vertex, so the domain must stay entirely on one side of it. ' + m(ivHtml(correct, 'x')) + ' works; every other option includes values on both sides of ' + numHtml(h) + '.',
      check: { f },
    }, mc);
  });

  gen('quadDomInv', 4, 'domran', (rng) => {
    const h = rng.intEx(-5, 5, [0]), k = rng.intEx(-6, 6, [0, h, -h]);
    const f = quadPlain(h, k), D = iv.ge(h);
    const askDom = rng.chance(0.6);
    const correct = askDom ? iv.ge(k) : iv.ge(h);
    const v = askDom ? 'x' : 'y';
    const ds = pickDistinct(ivKey(correct), rng.shuffle([iv.ge(h), iv.ge(k), iv.le(k), iv.ge(-k), iv.le(h), iv.ge(-h), iv.all(), iv.ge(0)]), 3, ivKey);
    const mc = finishMC(rng, ivOpt(correct, v), ds.map(I => ivOpt(I, v)));
    return Object.assign({
      type: 'mc',
      prompt: 'For ' + fdef(f) + ', ' + m(ivHtml(D, 'x')) + ', what is the <b>' + (askDom ? 'domain' : 'range') + '</b> of ' + m(FINV) + '?',
      explain: askDom
        ? 'Domain of ' + m(FINV) + ' = range of <i>f</i>. The vertex (' + numHtml(h) + ', ' + numHtml(k) + ') is the lowest point, so the range of <i>f</i> is ' + m(ivHtml(iv.ge(k), 'y')) + '. Domain of ' + m(FINV) + ': ' + m(ivHtml(correct, 'x')) + '.'
        : 'Range of ' + m(FINV) + ' = domain of <i>f</i> = ' + m(ivHtml(correct, 'y')) + '.',
      check: { f, D, askDom },
    }, mc);
  });

  gen('rationalInvExpr', 4, 'find', (rng) => {
    let a, b, c;
    do { a = rng.int(1, 5); c = rng.intEx(-5, 5, [0, a]); b = rng.intEx(-9, 9, [0]); } while (-a * c - b === 0);
    const f = '(' + lin(a, b) + ')/(' + addConst('x', -c) + ')';
    const inv = '(' + lin(c, b) + ')/(' + addConst('x', -a) + ')';
    return {
      type: 'expr',
      prompt: 'Find ' + m(FINVX) + ' for ' + fdef(f) + ', ' + m(ivHtml(iv.ne(c), 'x')) + '.',
      answerPlain: inv,
      samples: [-6.5, -3, -1.5, 0.25, 2.5, 7, 11].filter(x => Math.abs(x - a) > 0.3),
      inputHint: 'Use brackets! e.g. (3x+1)/(x-2)',
      explain: 'Swap <i>x</i> and <i>y</i>: ' + m('<i>x</i> = ' + swapXY(pretty(f))) + '. Multiply both sides by ' + m(swapXY(pretty(addConst('x', -c)))) + ': ' + m('<i>xy</i> ' + (c > 0 ? '− ' : '+ ') + (Math.abs(c) === 1 ? '' : Math.abs(c)) + '<i>x</i> = ' + (a === 1 ? '' : a) + '<i>y</i> ' + (b > 0 ? '+ ' + b : '− ' + (-b))) + '. Get the <i>y</i> terms together: ' + m('<i>y</i>(<i>x</i> − ' + a + ') = ' + pretty(lin(c, b))) + '. So ' + m(FINVX + ' = ' + pretty(inv)) + '.',
      check: { f, c, inv },
    };
  });

  gen('selfInverse', 4, 'find', (rng) => {
    for (;;) {
      const a = rng.int(1, 4), b = rng.intEx(-9, 12, [0, -a * a]);
      const ks = rng.shuffle([-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].filter(k => k !== a));
      for (const k of ks) {
        const num = a * k + b, den = k - a;
        if (num % den === 0 && num / den !== k) {
          const ans = num / den;
          const f = '(' + lin(a, b) + ')/(' + addConst('x', -a) + ')';
          return {
            type: 'num',
            prompt: 'Given ' + fdef(f) + ', ' + m(ivHtml(iv.ne(a), 'x')) + ', find ' + m(finvAt(k)) + '.',
            answer: ans,
            explain: 'Solve ' + m('<i>f</i>(<i>x</i>) = ' + numHtml(k)) + ': ' + m(pretty(lin(a, b)) + ' = ' + numHtml(k) + '(' + pretty(addConst('x', -a)) + ')') + ', which gives <i>x</i> = ' + numHtml(ans) + '. 👻 Plot twist: this <i>f</i> is its <b>own</b> inverse (its graph is symmetric in <i>y</i> = <i>x</i>), so ' + m(finvAt(k) + ' = ' + fAt(k) + ' = ' + numHtml(ans)) + '.',
            check: { f, a, k },
          };
        }
      }
    }
  });

  gen('rationalDomInv', 4, 'domran', (rng) => {
    let c, h, mm;
    do { c = rng.intEx(-6, 6, [0]); h = rng.intEx(-6, 6, [0]); mm = rng.intEx(-6, 6, [0]); } while (new Set([c, h, mm, -c, -h]).size < 5);
    const f = c + (mm > 0 ? ' + ' + mm : ' - ' + (-mm)) + '/(' + addConst('x', -h) + ')';
    const askDom = rng.chance(0.6);
    const correct = askDom ? iv.ne(c) : iv.ne(h), v = askDom ? 'x' : 'y';
    const ds = pickDistinct(ivKey(correct), rng.shuffle([iv.ne(h), iv.ne(c), iv.ne(-c), iv.ne(-h), iv.ne(mm), iv.all()]), 3, ivKey);
    const mc = finishMC(rng, ivOpt(correct, v), ds.map(I => ivOpt(I, v)));
    return Object.assign({
      type: 'mc',
      prompt: 'For ' + fdef(f) + ', ' + m(ivHtml(iv.ne(h), 'x')) + ', what is the <b>' + (askDom ? 'domain' : 'range') + '</b> of ' + m(FINV) + '?',
      explain: askDom
        ? 'The fraction ' + m(pretty(mm + '/(' + addConst('x', -h) + ')')) + ' can never equal 0, so <i>f</i>(<i>x</i>) can never equal ' + numHtml(c) + ' (that’s the horizontal asymptote <i>y</i> = ' + numHtml(c) + '). Range of <i>f</i>: ' + m(ivHtml(iv.ne(c), 'y')) + ', so domain of ' + m(FINV) + ': ' + m(ivHtml(correct, 'x')) + '.'
        : 'Range of ' + m(FINV) + ' = domain of <i>f</i>: ' + m(ivHtml(correct, 'y')) + ' (the vertical asymptote of <i>f</i> becomes a horizontal one for ' + m(FINV) + ').',
      check: { f, h, askDom },
    }, mc);
  });

  gen('expInvMC', 4, 'find', (rng) => {
    const kind = rng.int(0, 2);
    let f, right, ds, why;
    if (kind === 0) { const b = rng.intEx(-6, 6, [0]); f = addConst('2^x', b); right = 'log_2(' + addConst('x', -b) + ')'; ds = [addConst('log_2(x)', -b), '2^(' + addConst('x', -b) + ')', 'log_2(' + addConst('x', b) + ')']; why = 'Swap: ' + m('<i>x</i> = 2<sup><i>y</i></sup> ' + (b > 0 ? '+ ' + b : '− ' + (-b))) + ', so ' + m('2<sup><i>y</i></sup> = ' + pretty(addConst('x', -b))) + ' and ' + m('<i>y</i> = ' + pretty(right)) + '.'; }
    else if (kind === 1) { const h = rng.intEx(-5, 5, [0]); f = 'e^(' + addConst('x', -h) + ')'; right = addConst('ln(x)', h); ds = ['ln(' + addConst('x', -h) + ')', 'ln(' + addConst('x', h) + ')', 'e^(' + addConst('x', h) + ')']; why = 'Swap: ' + m('<i>x</i> = ' + swapXY(pretty(f))) + '. Take ln: ' + m('ln <i>x</i> = <i>y</i> ' + (h > 0 ? '− ' + h : '+ ' + (-h))) + ', so ' + m('<i>y</i> = ' + pretty(right)) + '.'; }
    else { const a = rng.int(3, 5); f = a + '*2^x'; right = 'log_2(x/' + a + ')'; ds = ['log_2(x)/' + a, 'log_2(' + a + '*x)', a + '*log_2(x)']; why = 'Swap: ' + m('<i>x</i> = ' + a + '·2<sup><i>y</i></sup>') + ', so ' + m('2<sup><i>y</i></sup> = ' + pretty('x/' + a)) + ' and ' + m('<i>y</i> = ' + pretty(right)) + '.'; }
    const o = (p) => ({ html: m(FINVX + ' = ' + pretty(p)), plain: p, key: p });
    const mc = finishMC(rng, o(right), ds.map(o));
    return Object.assign({ type: 'mc', prompt: 'Which is the inverse of ' + fdef(f) + '?', explain: why + ' Logs undo exponentials!', check: { f } }, mc);
  });

  gen('fEqualsInv', 4, 'find', (rng) => {
    const a = rng.pick([2, 3, 4, 5, 0.5]), x0 = rng.intEx(-6, 6, [0]);
    let b = x0 * (1 - a);
    if (!Number.isInteger(b)) return G.find(g => g.id === 'fEqualsInv').fn(rng);
    const plain = lin(a, b);
    const invP = a < 1 ? lin(1 / a, -b / a) : '(' + addConst('x', -b) + ')/' + a;
    return {
      type: 'num',
      prompt: 'Given ' + fdef(plain) + ', solve ' + m(FX + ' = ' + FINVX) + '.',
      answer: x0,
      explain: 'Shortcut: <i>f</i> is increasing, so <i>f</i> and ' + m(FINV) + ' meet on the line <i>y</i> = <i>x</i>. Solve ' + m(pretty(plain) + ' = <i>x</i>') + ' → <i>x</i> = ' + numHtml(x0) + '. (Or find ' + m(FINVX + ' = ' + pretty(invP)) + ' and set them equal — same answer.)',
      check: { f: plain },
    };
  });

  // ---------- Selection ----------
  const FLOOR_TIERS = [
    { 1: 1 },
    { 1: 0.4, 2: 0.6 },
    { 2: 0.4, 3: 0.6 },
    { 3: 0.5, 4: 0.5 },
    { 3: 0.3, 4: 0.7 },
  ];

  function build(g, rng) {
    const q = g.fn(rng);
    q.gen = g.id; q.tier = g.tier; q.topic = g.topic; q.topicName = TOPICS[g.topic];
    return q;
  }

  // a deck of questions for one floor (deterministic for a given seed)
  function floorDeck(floor, seed, count) {
    const rng = M.RNG(seed + '|floor' + floor);
    const weights = FLOOR_TIERS[Math.min(floor, FLOOR_TIERS.length - 1)];
    const deck = []; let last = null;
    while (deck.length < count) {
      let r = rng.next(), tier = 1;
      for (const t in weights) { r -= weights[t]; if (r <= 0) { tier = +t; break; } tier = +t; }
      const pool = G.filter(g => g.tier === tier && g.id !== last);
      const g = rng.pick(pool);
      deck.push(build(g, rng)); last = g.id;
    }
    return deck;
  }

  const api = { GENERATORS: G, TOPICS, build, floorDeck, FLOOR_TIERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Questions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
