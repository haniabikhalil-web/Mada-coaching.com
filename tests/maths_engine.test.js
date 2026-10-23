// Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const M = require('../assets/js/maths-engine.js');

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// Independent recomputation of every variant from its stored inputs.
const FORMULAS = {
  'growth/rate': (i) => (i.n - i.b) / i.b * 100,
  'growth/apply': (i) => i.b * (1 + i.p / 100),
  'growth/successive': (i) => ((1 + i.g1 / 100) * (1 + i.g2 / 100) - 1) * 100,
  'growth/reverse': (i) => i.n / (1 + i.p / 100),
  'growth/recovery': (i) => (1 / (1 - i.d / 100) - 1) * 100,
  'growth/threeyear': (i) => i.b * (1 + i.g1 / 100) * (1 + i.g2 / 100) * (1 + i.g3 / 100),
  'margin/margin': (i) => (i.R - i.C) / i.R * 100,
  'margin/profit': (i) => i.R * i.m / 100,
  'margin/revenue': (i) => i.P / (i.m / 100),
  'margin/costcut': (i) => (1 - (1 - i.m2 / 100) / (1 - i.m1 / 100)) * 100,
  'margin/priceup': (i) => ((i.R * (1 - i.m1 / 100)) / (1 - i.m2 / 100) / i.R - 1) * 100,
  'breakeven/units': (i) => i.F / (i.p - i.v),
  'breakeven/targetprofit': (i) => (i.F + i.T) / (i.p - i.v),
  'breakeven/revenue': (i) => i.F / (i.cm / 100),
  'breakeven/pricecut': (i) => ((i.p - i.v) / (i.p * (1 - i.cut / 100) - i.v) - 1) * 100,
  'payback/simple': (i) => i.I / i.s,
  'payback/ramp': (i) => 1 + (i.I - i.s1) / i.s2,
  'payback/netprofit': (i) => i.I / (i.up * i.m / 100 - i.M),
  'cagr/rule72': (i) => 72 / i.rate,
  'cagr/future': (i) => i.v0 * Math.pow(1 + i.rate / 100, i.n),
  'cagr/cagr': (i) => (Math.pow(i.v / i.v0, 1 / i.n) - 1) * 100,
  'market/simple': (i) => i.P * i.s / 100 * i.x,
  'market/frequency': (i) => i.P * (i.s / 100) * i.f * 50 * i.x,
  'market/fleet': (i) => (i.R * 1e6 * i.t / 7 + i.V * 1e3 * i.vt) / i.cap,
  'mix/two': (i) => (i.pa * i.a + i.pb * (100 - i.a)) / 100,
  'mix/three': (i) => (i.sh[0] * i.mg[0] + i.sh[1] * i.mg[1] + i.sh[2] * i.mg[2]) / 100,
  'mix/shift': (i) => (i.s1 - i.s2) / 100 * (i.mB - i.mA),
  'unit/ltv': (i) => i.p * i.g / 100 * i.L,
  'unit/ratio': (i) => (i.p * i.g / 100 / (i.c / 100)) / i.cac,
  'unit/cacpayback': (i) => i.cac / (i.p * i.g / 100),
  'unit/maxcac': (i) => (i.p * i.g / 100 / (i.c / 100)) / 3,
};
// Variants whose published answer is deliberately rounded (to 1 decimal, or to a whole number).
const ROUNDED = (a) => Math.abs(a - Math.round(a * 10) / 10) < 1e-9 || Math.abs(a - Math.round(a)) < 1e-9 || Math.abs(a - Math.round(a * 100) / 100) < 1e-9;

test('every topic has all three levels and every variant has a formula', () => {
  for (const id of M.TOPIC_IDS) {
    for (const lvl of [1, 2, 3]) {
      assert.ok(M.TOPICS[id].levels[lvl] && M.TOPICS[id].levels[lvl].length, `${id} level ${lvl}`);
    }
  }
  const seen = new Set();
  for (const id of M.TOPIC_IDS) for (const lvl of [1, 2, 3]) for (let s = 0; s < 60; s++) seen.add(id + '/' + M.make(id, lvl, s).variant);
  for (const k of seen) assert.ok(FORMULAS[k], 'no independent formula for ' + k);
  for (const k of Object.keys(FORMULAS)) assert.ok(seen.has(k), 'formula never exercised: ' + k);
});

test('answers match an independent recomputation, over many seeds', () => {
  for (const id of M.TOPIC_IDS) for (const lvl of [1, 2, 3]) for (let s = 0; s < 400; s++) {
    const q = M.make(id, lvl, s);
    const want = FORMULAS[id + '/' + q.variant](q.inputs);
    // published answers are rounded for display; allow rounding only
    assert.ok(Math.abs(q.answer - want) <= Math.max(0.051, Math.abs(want) * 0.006), `${id}/${q.variant} seed ${s}: answer ${q.answer} vs ${want}`);
    assert.ok(ROUNDED(q.answer), `${id}/${q.variant} seed ${s}: answer ${q.answer} has stray decimals`);
  }
});

test('questions read cleanly: no NaN, undefined, float noise or empty parts', () => {
  for (const id of M.TOPIC_IDS) for (const lvl of [1, 2, 3]) for (let s = 0; s < 400; s++) {
    const q = M.make(id, lvl, s);
    const text = [q.prompt, q.tip].concat(q.steps).join(' | ');
    assert.ok(!/NaN|undefined|Infinity|null|\[object/.test(text), `${id}/${q.variant} seed ${s}: ${text}`);
    assert.ok(!/\d\.\d*(0000|9999)\d*/.test(text), `${id}/${q.variant} seed ${s}: float noise in ${text}`);
    assert.ok(q.prompt.length > 20 && q.steps.length >= 1 && q.tip && q.unit, `${id}/${q.variant} seed ${s}: incomplete`);
    assert.ok(Number.isFinite(q.answer) && q.answer !== 0, `${id}/${q.variant} seed ${s}: bad answer ${q.answer}`);
    assert.ok(q.tol > 0 && q.tol <= 0.1, 'tolerance out of range');
  }
});

test('the same seed gives the same question; different seeds vary', () => {
  assert.deepStrictEqual(M.make('growth', 2, 42), M.make('growth', 2, 42));
  const prompts = new Set();
  for (let s = 0; s < 200; s++) prompts.add(M.make('market', 3, s).prompt);
  assert.ok(prompts.size > 20, 'too little variety: ' + prompts.size);
});

test('difficulty rises: harder levels need more working steps on average', () => {
  const avg = (lvl) => { let t = 0, n = 0; for (const id of M.TOPIC_IDS) for (let s = 0; s < 100; s++) { t += M.make(id, lvl, s).steps.length; n++; } return t / n; };
  assert.ok(avg(1) < avg(3), `easy ${avg(1)} should be below hard ${avg(3)}`);
});

test('parseAnswer understands how people type', () => {
  const p = M.parseAnswer;
  assert.strictEqual(p('25'), 25);
  assert.strictEqual(p(' 25% '), 25);
  assert.strictEqual(p('$1,200'), 1200);
  assert.strictEqual(p('1.2k'), 1200);
  assert.strictEqual(p('1.5m'), 1500000);
  assert.strictEqual(p('-10'), -10);
  assert.strictEqual(p('.5'), 0.5);
  for (const bad of ['', 'abc', '12abc', '1.2.3', '--5', null, undefined, '%']) assert.strictEqual(p(bad), null, String(bad));
});

test('check accepts close answers and rejects wrong ones', () => {
  const q = M.make('growth', 1, 1);
  assert.ok(M.check(q, String(q.answer)).ok);
  assert.ok(M.check(q, q.answer * 1.005).ok);
  assert.ok(!M.check(q, q.answer * 1.2).ok);
  assert.ok(M.check(q, 'banana').invalid);
  assert.ok(!M.check(q, 0).ok);
});

test('a session has the right size, level and topics, and no topic twice in a row', () => {
  const s = M.session({ level: 2, count: 12, topics: ['growth', 'margin', 'cagr'], seed: 7 });
  assert.strictEqual(s.length, 12);
  assert.ok(s.every((q) => q.level === 2 && ['growth', 'margin', 'cagr'].includes(q.topic)));
  for (let i = 1; i < s.length; i++) assert.notStrictEqual(s[i].topic, s[i - 1].topic);
  const one = M.session({ level: 1, count: 5, topics: ['growth'], seed: 3 });
  assert.strictEqual(one.length, 5);
  assert.deepStrictEqual(M.session({ level: 3, count: 8, seed: 9 }), M.session({ level: 3, count: 8, seed: 9 }));
  assert.ok(M.session({ level: 1, count: 4, topics: ['nonsense'], seed: 1 }).length === 4, 'falls back to all topics');
});

test('random difficulty mixes the three levels, and every question is still valid', () => {
  const s = M.session({ level: 'random', count: 60, seed: 5 });
  assert.strictEqual(s.length, 60);
  assert.deepStrictEqual([...new Set(s.map((q) => q.level))].sort(), [1, 2, 3]);
  assert.ok(s.every((q) => Number.isFinite(q.answer)));
  assert.strictEqual(M.DIFFICULTIES.random, 'Random mix');
});
