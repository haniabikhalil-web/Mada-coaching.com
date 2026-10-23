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
Object.assign(FORMULAS, {
  'growth/share': (i) => i.part / i.T * 100,
  'growth/discount': (i) => i.P * (1 - i.d / 100),
  'growth/sharegain': (i) => i.M * 1000 * (i.s2 - i.s1) / 100,
  'growth/doublediscount': (i) => (1 - (1 - i.d1 / 100) * (1 - i.d2 / 100)) * 100,
  'margin/cost': (i) => i.R * (1 - i.m / 100),
  'margin/fixedcost': (i) => (i.R * i.m / 100 - i.X) / i.R * 100,
  'margin/markup': (i) => i.k / (100 + i.k) * 100,
  'breakeven/price': (i) => i.F / i.u + i.v,
  'breakeven/safety': (i) => (i.sold - i.b) / i.sold * 100,
  'breakeven/costrise': (i) => ((100 - i.v) / (100 - i.v * (1 + i.rise / 100)) - 1) * 100,
  'payback/months': (i) => i.I / i.mo,
  'payback/roi': (i) => i.g / i.I * 100,
  'cagr/cagr2': (i) => (Math.sqrt(i.v / i.v0) - 1) * 100,
  'cagr/startvalue': (i) => i.v / Math.pow(1 + i.rate / 100, i.n),
  'market/households': (i) => i.P / i.hh * i.s / 100 * i.x,
  'market/capacity': (i) => i.N * i.c * i.t * 300 / 1e6,
  'market/target': (i) => i.T / (i.p * i.s / 100),
  'mix/blendedgrowth': (i) => (i.w * i.g1 + (100 - i.w) * i.g2) / 100,
  'mix/pricevolume': (i) => ((1 + i.pc / 100) * (1 + i.vc / 100) - 1) * 100,
  'unit/contribution': (i) => (i.price - i.v) * i.u,
  'unit/revltv': (i) => i.p / (i.c / 100),
  'unit/custbreakeven': (i) => i.F / i.c,
  'hypo/cyclevalue': (i) => 100 * Math.pow((1 + i.p / 100) * (1 - i.p / 100), i.n),
});
// Decision questions: the correct option's text, recomputed independently from the inputs.
const CHOICES = {
  'hypo/downup': () => 'No, it ends lower',
  'hypo/doublehalve': () => 'Back to the start',
  'hypo/cycle': (i) => (1 + i.p / 100) * (1 - i.p / 100) < 1 ? 'Do not invest: it loses value every two years' : 'Invest: it grows every two years',
  'hypo/twooffers': (i) => (1 + i.u / 100) * (1 - i.d / 100) > Math.pow(1 + i.rb / 100, 2) ? 'Option A' : 'Option B',
  'hypo/pricecutdecision': (i) => ((i.m - i.x) / i.m) * (1 + i.y / 100) > 1 ? 'Yes, profit rises' : 'No, profit falls',
  'hypo/lifevspayback': (i) => i.L > i.I / i.s ? 'Yes: it pays back within its life' : 'No: it does not pay back in time',
  'hypo/sharemarket': (i) => (i.s1 + i.g) * (1 - i.k / 100) > i.s1 ? 'Up' : 'Down',
};
Object.assign(FORMULAS, {
  'growth/pctof': (i) => i.B * i.p / 100,
  'growth/decline': (i) => (i.b - i.n) / i.b * 100,
  'growth/runrate': (i) => { const f = 1 + i.g / 100; return i.q * (1 + f + f * f + f * f * f); },
  'growth/ppvspct': (i) => (i.m2 - i.m1) / i.m1 * 100,
  'growth/pctofpct': (i) => i.p1 * i.p2 / 100,
  'growth/asymmetry': (i) => i.a / (100 + i.a) * 100,
  'margin/markupprice': (i) => i.C * (1 + i.k / 100),
  'margin/pricemargin': (i) => i.C / (1 - i.m / 100),
  'margin/grossprofit': (i) => i.R * (1 - i.c / 100),
  'margin/opleverage': (i) => ((i.R * (1 + i.g / 100) * (1 - i.v / 100) - i.F) / (i.R * (1 - i.v / 100) - i.F) - 1) * 100,
  'breakeven/cmratio': (i) => (i.p - i.v) / i.p * 100,
  'breakeven/bundle': (i) => i.F / (i.a + i.b),
  'breakeven/breakevenshare': (i) => i.b / i.M * 100,
  'payback/annualised': (i) => i.I / (i.mo * 12),
  'payback/subsidy': (i) => i.I * (1 - i.sub / 100) / i.s,
  'payback/optioncompare': (i) => i.pb - i.pa,
  'cagr/doubletime': (i) => 72 / i.n,
  'cagr/linear': (i) => i.A + i.X * i.n,
  'cagr/future4': (i) => i.v0 * Math.pow(1 + i.rate / 100, 4),
  'cagr/yearsto': (i) => Math.log(i.tgt / i.v0) / Math.log(1 + i.rate / 100),
  'market/percapita': (i) => i.T / i.P,
  'market/unitsprice': (i) => i.U * i.p,
  'market/segments': (i) => i.x * i.a + i.y * i.b,
  'market/hours': (i) => i.U * i.h * 300 * i.p,
  'market/dailytoyear': (i) => i.d * 365,
  'market/funnel': (i) => i.A * 1000 * (i.a / 100) * (i.t / 100) * (i.rep / 100),
  'market/sharetarget': (i) => i.T / i.M * 100,
  'mix/avg3': (i) => (i.ps[0] * i.us[0] + i.ps[1] * i.us[1] + i.ps[2] * i.us[2]) / (i.us[0] + i.us[1] + i.us[2]),
  'mix/contrib': (i) => i.w * i.g1 / 100,
  'mix/avgmixshift': (i) => (i.s2 - i.s1) / 100 * (i.pp - i.ps),
  'unit/orderprofit': (i) => i.ov * (1 - i.c / 100) - i.f,
  'unit/arpu': (i) => i.R / i.U / 12,
  'unit/remaining': (i) => i.n * Math.pow(1 - i.c / 100, i.m),
  'unit/cacbudget': (i) => i.B * 1e6 / (i.N * 1e3),
  'hypo/lineargap': (i) => 100 * Math.pow(1 + i.rt / 100, i.n) - (100 + i.rt * i.n),
});
Object.assign(CHOICES, {
  'hypo/ppvspctchoice': (i) => { const d = i.m2 - i.m1, rel = Math.round(d / i.m1 * 1000) / 10; return d + ' points, which is ' + rel + '% higher'; },
  'hypo/biggerbase': (i) => i.Ba * i.pa > i.Bb * i.pb ? 'Option A' : 'Option B',
  'hypo/hurdle': (i) => i.rt > i.h ? 'Yes: the return beats the cost of capital' : 'No: the return is below the cost of capital',
  'hypo/recoverychoice': () => 'No, it falls short',
  'hypo/avgofavg': (i) => (i.tA * i.nA + i.tB * i.nB) / (i.nA + i.nB) > (i.tA + i.tB) / 2 ? 'No, it is higher than the simple average' : 'No, it is lower than the simple average',
  'hypo/gonogo': (i) => i.Y * i.sh / 100 > i.b ? 'Go: expected sales exceed breakeven' : 'No-go: expected sales fall short of breakeven',
  'hypo/discountstack': (i) => 'No, it is less than ' + (i.d1 + i.d2) + '% off',
  'hypo/growthvsmargin': (i) => 1000 * (1 + (i.g || 0) / 100) * i.m / 100 > 1000 * (i.m + i.pp) / 100 ? 'Grow revenue ' + i.g + '%' : 'Lift margin ' + i.pp + (i.pp > 1 ? ' points' : ' point'),
  'hypo/cannibal': (i) => i.nu * i.mn - i.ne * i.c / 100 * i.me > 0 ? 'Launch: profit rises' : 'Do not launch: profit falls',
  'hypo/makeorbuy': (i) => i.F + i.v * i.V < i.p * i.V ? 'Make it in-house' : 'Buy it in',
});
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
  for (const k of seen) assert.ok(FORMULAS[k] || CHOICES[k], 'no independent formula for ' + k);
  for (const k of Object.keys(FORMULAS).concat(Object.keys(CHOICES))) assert.ok(seen.has(k), 'formula never exercised: ' + k);
});

test('answers match an independent recomputation, over many seeds', () => {
  for (const id of M.TOPIC_IDS) for (const lvl of [1, 2, 3]) for (let s = 0; s < 400; s++) {
    const q = M.make(id, lvl, s);
    if (q.kind === 'choice') {
      assert.strictEqual(q.options[q.answer], CHOICES[id + '/' + q.variant](q.inputs), `${id}/${q.variant} seed ${s}: wrong option marked correct`);
      assert.strictEqual(new Set(q.options).size, q.options.length, 'duplicate options');
      continue;
    }
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
    if (q.kind === 'choice') assert.ok(q.options.length >= 2 && q.options.every((o) => o && !/NaN|undefined/.test(o)), 'bad options');
    assert.ok(q.prompt.length > 20 && q.steps.length >= 1 && q.tip && q.unit, `${id}/${q.variant} seed ${s}: incomplete`);
    assert.ok(Number.isFinite(q.answer) && (q.kind === 'choice' ? Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length : q.answer !== 0), `${id}/${q.variant} seed ${s}: bad answer ${q.answer}`);
    assert.ok(q.tol > 0 && q.tol <= 0.1, 'tolerance out of range');
    assert.ok(!/ %|\s{2,}| ,/.test(q.prompt), `${id}/${q.variant} seed ${s}: stray spacing in prompt: ${q.prompt}`);
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

test('choice questions: check marks only the right option, and options are shuffled', () => {
  const q = M.make('hypo', 2, 3);
  const ids = new Set();
  for (let s = 0; s < 80; s++) { const c = M.make('hypo', 1, s); if (c.kind === 'choice') ids.add(c.answer); }
  assert.ok(ids.size > 1, 'the right option should not always be in the same place');
  for (let s = 0; s < 80; s++) {
    const c = M.make('hypo', 3, s);
    assert.ok(M.check(c, c.answer).ok);
    assert.ok(!M.check(c, (c.answer + 1) % c.options.length).ok);
  }
  assert.ok(q);
});

test('the bank is bigger: at least 100 distinct numeric and decision variants', () => {
  const seen = new Set();
  for (const id of M.TOPIC_IDS) for (const lvl of [1, 2, 3]) for (let s = 0; s < 80; s++) seen.add(id + '/' + M.make(id, lvl, s).variant);
  assert.ok(seen.size >= 100, 'only ' + seen.size + ' variants');
});
