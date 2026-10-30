/* Inverse Haunt — math core: seeded RNG, expression parser/evaluator,
   pretty printer, answer checking, interval helpers.
   Works in the browser (window.MathCore) and in Node (module.exports). */
(function (root) {
  'use strict';

  // ---------- Seeded RNG (mulberry32) ----------
  function hashString(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function RNG(seed) {
    let a = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 1;
    const next = function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const r = {
      next,
      int(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      // integer in [lo,hi] excluding values in `not`
      intEx(lo, hi, not) {
        for (let i = 0; i < 1000; i++) { const v = r.int(lo, hi); if (!not.includes(v)) return v; }
        throw new Error('intEx failed');
      },
      pick(arr) { return arr[Math.floor(next() * arr.length)]; },
      chance(p) { return next() < p; },
      sign() { return next() < 0.5 ? -1 : 1; },
      shuffle(arr) {
        const a2 = arr.slice();
        for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; }
        return a2;
      },
    };
    return r;
  }

  // ---------- Tokenizer ----------
  const FUNCS = ['sqrt', 'cbrt', 'ln', 'log', 'abs', 'exp'];
  const CONSTS = { e: Math.E, pi: Math.PI };
  const IDENTS = ['sqrt', 'cbrt', 'ln', 'log', 'abs', 'exp', 'pi', 'e', 'x']; // greedy order (longest first)

  function normalize(s) {
    return String(s)
      .replace(/[−–—]/g, '-')
      .replace(/[×·∙⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/π/g, 'pi')
      .replace(/√/g, ' sqrt ')
      .replace(/∛/g, ' cbrt ')
      .replace(/X/g, 'x')
      .toLowerCase();
  }

  function tokenize(src) {
    const s = normalize(src);
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const str = s.slice(i, j);
        if ((str.match(/\./g) || []).length > 1 || str === '.') throw new Error('Bad number "' + str + '"');
        toks.push({ k: 'num', v: parseFloat(str) }); i = j; continue;
      }
      if (/[a-z]/.test(c)) {
        let j = i; while (j < s.length && /[a-z]/.test(s[j])) j++;
        let word = s.slice(i, j);
        // split word greedily into known identifiers (so "2ex" -> e, x)
        while (word.length) {
          const id = IDENTS.find(n => word.startsWith(n));
          if (!id) throw new Error('Unknown symbol "' + word + '"');
          toks.push({ k: 'id', v: id });
          word = word.slice(id.length);
        }
        i = j;
        // log base: log_2 or log_10
        const last = toks[toks.length - 1];
        if (last.v === 'log' && s[i] === '_') {
          let k = i + 1; while (k < s.length && /[0-9.]/.test(s[k])) k++;
          const b = parseFloat(s.slice(i + 1, k));
          if (!(b > 0) || b === 1) throw new Error('Bad log base');
          last.base = b; i = k;
        }
        continue;
      }
      if ('+-*/^()|'.includes(c)) { toks.push({ k: c }); i++; continue; }
      if (c === '[' ) { toks.push({ k: '(' }); i++; continue; }
      if (c === ']' ) { toks.push({ k: ')' }); i++; continue; }
      if (c === ',') throw new Error('Use a decimal point, not a comma');
      throw new Error('Unexpected "' + c + '"');
    }
    return toks;
  }

  // ---------- Parser (recursive descent) ----------
  function parse(src) {
    // allow "f^-1(x) = ...", "y = ..." : keep text after the last '='
    let s = String(src);
    if (s.includes('=')) s = s.slice(s.lastIndexOf('=') + 1);
    if (!s.trim()) throw new Error('Empty answer');
    const toks = tokenize(s);
    let p = 0;
    const peek = () => toks[p];
    const eat = (k) => { const t = toks[p]; if (!t || t.k !== k) throw new Error('Expected "' + k + '"'); p++; return t; };
    const startsPrimary = (t) => t && (t.k === 'num' || t.k === 'id' || t.k === '(');

    function expr() {
      let left = term();
      while (peek() && (peek().k === '+' || peek().k === '-')) {
        const op = toks[p++].k; const right = term();
        left = { t: 'bin', op, a: left, b: right };
      }
      return left;
    }
    function term() {
      let left = unary();
      for (;;) {
        const t = peek();
        if (t && (t.k === '*' || t.k === '/')) { p++; left = { t: 'bin', op: t.k, a: left, b: unary() }; }
        else if (startsPrimary(t)) { left = { t: 'bin', op: '*', a: left, b: power(), implicit: true }; }
        else break;
      }
      return left;
    }
    function unary() {
      const t = peek();
      if (t && t.k === '-') { p++; return { t: 'neg', a: unary() }; }
      if (t && t.k === '+') { p++; return unary(); }
      return power();
    }
    function power() {
      const base = primary();
      if (peek() && peek().k === '^') { p++; return { t: 'bin', op: '^', a: base, b: unary() }; }
      return base;
    }
    function primary() {
      const t = peek();
      if (!t) throw new Error('Answer ends too soon');
      if (t.k === 'num') { p++; return { t: 'num', v: t.v }; }
      if (t.k === '(') { p++; const e = expr(); eat(')'); return e; }
      if (t.k === '|') { p++; const e = expr(); eat('|'); return { t: 'fn', name: 'abs', arg: e }; }
      if (t.k === 'id') {
        p++;
        if (t.v === 'x') return { t: 'var' };
        if (t.v in CONSTS) return { t: 'const', name: t.v };
        if (FUNCS.includes(t.v)) {
          let arg;
          if (peek() && peek().k === '(') { p++; arg = expr(); eat(')'); }
          else arg = power();
          const node = { t: 'fn', name: t.v, arg };
          if (t.v === 'log') node.base = t.base || 10;
          return node;
        }
      }
      throw new Error('Unexpected "' + (t.v || t.k) + '"');
    }
    const ast = expr();
    if (p < toks.length) throw new Error('Unexpected "' + (toks[p].v || toks[p].k) + '"');
    return ast;
  }

  function realPow(b, e) {
    if (b < 0 && !Number.isInteger(e)) {
      const r = 1 / e, rr = Math.round(r);
      if (Math.abs(r - rr) < 1e-9 && Math.abs(rr % 2) === 1) return -Math.pow(-b, e);
      return NaN;
    }
    return Math.pow(b, e);
  }

  function evalAst(n, x) {
    switch (n.t) {
      case 'num': return n.v;
      case 'var': return x;
      case 'const': return CONSTS[n.name];
      case 'neg': return -evalAst(n.a, x);
      case 'bin': {
        const a = evalAst(n.a, x), b = evalAst(n.b, x);
        switch (n.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b;
          case '/': return b === 0 ? NaN : a / b;
          case '^': return realPow(a, b);
        }
        break;
      }
      case 'fn': {
        const v = evalAst(n.arg, x);
        switch (n.name) {
          case 'sqrt': return v < 0 ? NaN : Math.sqrt(v);
          case 'cbrt': return Math.cbrt(v);
          case 'ln': return v <= 0 ? NaN : Math.log(v);
          case 'log': return v <= 0 ? NaN : Math.log(v) / Math.log(n.base || 10);
          case 'abs': return Math.abs(v);
          case 'exp': return Math.exp(v);
        }
      }
    }
    return NaN;
  }

  function hasVar(n) {
    if (!n) return false;
    if (n.t === 'var') return true;
    return hasVar(n.a) || hasVar(n.b) || hasVar(n.arg);
  }

  function compile(src) {
    const ast = typeof src === 'string' ? parse(src) : src;
    const f = (x) => evalAst(ast, x);
    f.ast = ast;
    return f;
  }

  // ---------- Printers ----------
  function prec(n) {
    if (n.t === 'bin') return n.op === '+' || n.op === '-' ? 1 : n.op === '^' ? 4 : 2;
    if (n.t === 'neg') return 3;
    if (n.t === 'num' && n.v < 0) return 3;
    return 5;
  }
  function numPlain(v) { return String(+v.toFixed(10)); }

  function toPlain(n) {
    const wrap = (s, c) => (c ? '(' + s + ')' : s);
    switch (n.t) {
      case 'num': return n.v < 0 ? '(' + numPlain(n.v) + ')' : numPlain(n.v);
      case 'var': return 'x';
      case 'const': return n.name;
      case 'neg': return '-' + wrap(toPlain(n.a), prec(n.a) < 3 || n.a.t === 'neg');
      case 'fn': return n.name === 'log' && n.base !== 10 ? 'log_' + n.base + '(' + toPlain(n.arg) + ')' : n.name + '(' + toPlain(n.arg) + ')';
      case 'bin': {
        const pa = prec(n.a), pb = prec(n.b);
        if (n.op === '+') return toPlain(n.a) + ' + ' + wrap(toPlain(n.b), pb < 2 || n.b.t === 'neg');
        if (n.op === '-') return toPlain(n.a) + ' - ' + wrap(toPlain(n.b), pb <= 3 && pb !== 2 || n.b.t === 'neg');
        if (n.op === '*') return wrap(toPlain(n.a), pa < 2) + '*' + wrap(toPlain(n.b), pb < 4);
        if (n.op === '/') return wrap(toPlain(n.a), pa < 2) + '/' + wrap(toPlain(n.b), pb < 4);
        if (n.op === '^') return wrap(toPlain(n.a), pa < 5) + '^' + wrap(toPlain(n.b), pb < 5);
      }
    }
    throw new Error('bad node');
  }

  const MINUS = '−';
  function numHtml(v) {
    const s = numPlain(Math.abs(v));
    return (v < 0 ? MINUS : '') + s;
  }
  function startsWithDigit(n) {
    if (n.t === 'num') return true;
    if (n.t === 'bin' && n.op !== '/') return startsWithDigit(n.a);
    return false;
  }
  // HTML pretty-printer: stacked fractions, superscripts, radicals, implied multiplication.
  function toHtml(n) {
    const wrap = (s, c) => (c ? '(' + s + ')' : s);
    switch (n.t) {
      case 'num': return numHtml(n.v);
      case 'var': return '<i>x</i>';
      case 'const': return n.name === 'pi' ? 'π' : '<i>e</i>';
      case 'neg': return MINUS + wrap(toHtml(n.a), prec(n.a) < 3 && !(n.a.t === 'bin' && n.a.op === '/') || n.a.t === 'neg');
      case 'fn': {
        const a = toHtml(n.arg);
        if (n.name === 'sqrt') return '√<span class="rad">' + a + '</span>';
        if (n.name === 'cbrt') return '∛<span class="rad">' + a + '</span>';
        if (n.name === 'abs') return '|' + a + '|';
        if (n.name === 'log') return (n.base === 10 ? 'log' : 'log<sub>' + numPlain(n.base) + '</sub>') + '(' + a + ')';
        return n.name + '(' + a + ')';
      }
      case 'bin': {
        const pa = prec(n.a), pb = prec(n.b);
        if (n.op === '+') return toHtml(n.a) + ' + ' + wrap(toHtml(n.b), pb < 2 || n.b.t === 'neg');
        if (n.op === '-') return toHtml(n.a) + ' ' + MINUS + ' ' + wrap(toHtml(n.b), (pb < 2 || n.b.t === 'neg'));
        if (n.op === '/') return '<span class="frac"><span>' + toHtml(n.a) + '</span><span>' + toHtml(n.b) + '</span></span>';
        if (n.op === '^') return wrap(toHtml(n.a), pa < 5 || (n.a.t === 'num' && n.a.v < 0)) + '<sup>' + toHtml(n.b) + '</sup>';
        if (n.op === '*') {
          const L = wrap(toHtml(n.a), pa < 2), Rneeds = pb < 2 || n.b.t === 'neg';
          const R = wrap(toHtml(n.b), Rneeds);
          const juxt = !Rneeds && !startsWithDigit(n.b) && !(n.b.t === 'bin' && n.b.op === '/');
          if (Rneeds && (n.a.t === 'num' || n.a.t === 'var')) return L + R; // 3(x + 1)
          return juxt ? L + R : L + '·' + R;
        }
      }
    }
    throw new Error('bad node');
  }

  function pretty(src) { return toHtml(typeof src === 'string' ? parse(src) : src); }

  // ---------- Answer checking ----------
  function close(a, b, rel) {
    rel = rel == null ? 0.006 : rel;
    if (!isFinite(a) || !isFinite(b)) return false;
    return Math.abs(a - b) <= Math.max(rel * Math.abs(b), 0.005);
  }

  // student numeric answer (may be a fraction, sqrt(2), etc.)
  function checkNumber(input, correct) {
    let ast;
    try { ast = parse(input); } catch (e) { return { ok: false, error: e.message }; }
    if (hasVar(ast)) return { ok: false, error: 'This answer should be a number (no x).' };
    const v = evalAst(ast, 0);
    if (!isFinite(v)) return { ok: false, error: 'That doesn’t give a real number.' };
    return { ok: close(v, correct), value: v };
  }

  // student expression vs correct expression, compared at sample points
  function checkExpr(input, correctPlain, samples) {
    let ast;
    try { ast = parse(input); } catch (e) { return { ok: false, error: e.message }; }
    if (!hasVar(ast)) return { ok: false, error: 'Your answer should include x.' };
    const g = compile(correctPlain);
    for (const x of samples) {
      const want = g(x), got = evalAst(ast, x);
      if (!isFinite(want)) continue;
      if (!isFinite(got) || Math.abs(got - want) > Math.max(1e-4 * Math.abs(want), 2e-3)) return { ok: false };
    }
    return { ok: true };
  }

  // ---------- Intervals / sets ----------
  // {lo, hi, loInc, hiInc} with ±Infinity, or {ne: c}, or {all: true}
  function ivHtml(iv, v) {
    v = '<i>' + (v || 'x') + '</i>';
    if (iv.all) return v + ' ∈ ℝ';
    if (iv.ne != null) return v + ' ≠ ' + numHtml(iv.ne);
    const lo = isFinite(iv.lo), hi = isFinite(iv.hi);
    if (lo && hi) return numHtml(iv.lo) + (iv.loInc ? ' ≤ ' : ' < ') + v + (iv.hiInc ? ' ≤ ' : ' < ') + numHtml(iv.hi);
    if (lo) return v + (iv.loInc ? ' ≥ ' : ' > ') + numHtml(iv.lo);
    if (hi) return v + (iv.hiInc ? ' ≤ ' : ' < ') + numHtml(iv.hi);
    return v + ' ∈ ℝ';
  }
  function ivKey(iv) {
    if (iv.all) return 'all';
    if (iv.ne != null) return 'ne' + iv.ne;
    return [iv.lo, iv.hi, !!iv.loInc, !!iv.hiInc].join('|');
  }
  function ivContains(iv, t) {
    if (iv.all) return true;
    if (iv.ne != null) return t !== iv.ne;
    return (iv.loInc ? t >= iv.lo : t > iv.lo) && (iv.hiInc ? t <= iv.hi : t < iv.hi);
  }
  const iv = {
    closed: (lo, hi) => ({ lo, hi, loInc: true, hiInc: true }),
    ge: (lo) => ({ lo, hi: Infinity, loInc: true, hiInc: false }),
    gt: (lo) => ({ lo, hi: Infinity, loInc: false, hiInc: false }),
    le: (hi) => ({ lo: -Infinity, hi, loInc: false, hiInc: true }),
    lt: (hi) => ({ lo: -Infinity, hi, loInc: false, hiInc: false }),
    ne: (c) => ({ ne: c }),
    all: () => ({ all: true }),
  };

  // ---------- Small builders for plain expressions ----------
  // linear a*x + b as plain text: lin(3,-5) -> "3*x - 5", lin(-1,2) -> "-x + 2"
  function coefX(a, xs) {
    xs = xs || 'x';
    if (a === 1) return xs; if (a === -1) return '-' + xs;
    return a + '*' + xs;
  }
  function addConst(s, b) {
    if (b === 0) return s;
    return s + (b > 0 ? ' + ' + b : ' - ' + (-b));
  }
  function lin(a, b) { return a === 0 ? String(b) : addConst(coefX(a), b); }

  const api = { RNG, hashString, tokenize, parse, compile, evalAst, hasVar, toPlain, toHtml, pretty,
    close, checkNumber, checkExpr, ivHtml, ivKey, ivContains, iv, numHtml, lin, coefX, addConst, MINUS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MathCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
