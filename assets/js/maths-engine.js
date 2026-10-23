// Mada AI maths drills: question engine.
//
// Consulting-style quantitative questions, three difficulty levels, eight topics. Every question is generated
// from a seeded random number generator, so the same seed gives the same question (used by the tests), and the
// answer is computed by code, never typed in. Each question carries its inputs so a test can recompute it.
//
// Works in the browser (window.MadaMaths) and in node (module.exports) so it can be tested without a browser.
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- random numbers
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function int(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function round(x, d) { var m = Math.pow(10, d || 0); return Math.round(x * m) / m; }
  function num(x) {
    var s = (Math.round(x * 100) / 100).toString();
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function m$(x) { return '$' + num(x) + 'M'; }

  var COMPANIES = ['a retailer', 'a software company', 'a logistics firm', 'a bank', 'a hospital group', 'a beverage maker', 'an airline', 'a telecom operator'];

  // ---------------------------------------------------------------- topics
  // Each generator returns { variant, inputs, prompt, answer, unit, tol (relative), steps[], tip }.
  var TOPICS = {};

  // 1. Percentages and growth ------------------------------------------------
  TOPICS.growth = { label: 'Growth & percentages', levels: {
    1: [
      function (r) {
        var b = pick(r, [40, 50, 80, 120, 200, 250, 400, 500]), p = pick(r, [10, 20, 25, 50]), n = round(b * (1 + p / 100), 1), c = pick(r, COMPANIES);
        return { variant: 'rate', inputs: { b: b, n: n }, prompt: 'Revenue at ' + c + ' grew from ' + m$(b) + ' to ' + m$(n) + '. What was the growth rate?', answer: p, unit: '%', tol: 0.01,
          steps: ['Increase = ' + m$(n) + ' - ' + m$(b) + ' = ' + m$(round(n - b, 1)) + '.', 'Growth = increase / starting value = ' + round(n - b, 1) + ' / ' + b + ' = ' + p + '%.'],
          tip: 'Growth is always measured against the starting value, not the new one.' };
      },
      function (r) {
        var b = pick(r, [40, 50, 80, 120, 200, 250, 400, 500]), p = pick(r, [10, 20, 25, 50]), n = round(b * (1 + p / 100), 1), c = pick(r, COMPANIES);
        return { variant: 'apply', inputs: { b: b, p: p }, prompt: 'Revenue at ' + c + ' is ' + m$(b) + ' and will grow ' + p + '% next year. What will revenue be next year?', answer: n, unit: '$M', tol: 0.01,
          steps: [p + '% of ' + b + ' = ' + round(b * p / 100, 1) + '.', 'New revenue = ' + b + ' + ' + round(b * p / 100, 1) + ' = ' + n + '.'],
          tip: 'Split awkward percentages: 25% = a quarter, 10% = move the decimal, 20% = double 10%.' };
      },
    ],
    2: [
      function (r) {
        var g1 = pick(r, [10, 20, 25, 30, 50]), g2 = pick(r, [-10, -25, 10, 20]), net = round(((1 + g1 / 100) * (1 + g2 / 100) - 1) * 100, 1), c = pick(r, COMPANIES);
        return { variant: 'successive', inputs: { g1: g1, g2: g2 }, prompt: 'Sales at ' + c + ' rose ' + g1 + '% in year one, then ' + (g2 < 0 ? 'fell ' + (-g2) : 'rose ' + g2) + '% in year two. What is the net change over the two years? (to 1 decimal, minus sign for a fall)', answer: net, unit: '%', tol: 0.02,
          steps: ['Multiply the factors: ' + (1 + g1 / 100) + ' x ' + round(1 + g2 / 100, 2) + ' = ' + round((1 + g1 / 100) * (1 + g2 / 100), 4) + '.', 'Net change = ' + net + '%.'],
          tip: 'Never add successive percentages. Multiply the growth factors.' };
      },
      function (r) {
        var x = pick(r, [20, 25, 30, 50, 60, 80]), p = pick(r, [20, 25, 50]), orig = x * 4, n = round(orig * (1 + p / 100), 1), c = pick(r, COMPANIES);
        return { variant: 'reverse', inputs: { n: n, p: p }, prompt: 'After growing ' + p + '% this year, revenue at ' + c + ' is ' + m$(n) + '. What was revenue last year?', answer: orig, unit: '$M', tol: 0.02,
          steps: ['New = old x ' + (1 + p / 100) + '.', 'Old = ' + n + ' / ' + (1 + p / 100) + ' = ' + orig + '.'],
          tip: 'To undo a percentage increase, divide by the growth factor. Subtracting the percentage gives the wrong answer.' };
      },
    ],
    3: [
      function (r) {
        var d = pick(r, [10, 20, 25, 30, 40, 50]), need = round(d / (100 - d) * 100, 1), c = pick(r, COMPANIES);
        return { variant: 'recovery', inputs: { d: d }, prompt: 'Sales at ' + c + ' fell ' + d + '%. What growth rate is needed to get back to the original level? (to 1 decimal)', answer: need, unit: '%', tol: 0.03,
          steps: ['After the fall you have ' + (100 - d) + '% of the original.', 'You need ' + d + ' / ' + (100 - d) + ' = ' + need + '% growth on that smaller base.'],
          tip: 'A fall of d% needs growth of d / (100 - d). Losses are harder to recover than they look.' };
      },
      function (r) {
        var g1 = pick(r, [20, 25, 30]), g2 = pick(r, [-20, -30, 20, 40]), g3 = pick(r, [-10, 10, 25]), b = pick(r, [100, 200, 400]);
        var end = round(b * (1 + g1 / 100) * (1 + g2 / 100) * (1 + g3 / 100), 1), c = pick(r, COMPANIES);
        return { variant: 'threeyear', inputs: { b: b, g1: g1, g2: g2, g3: g3 }, prompt: c.charAt(0).toUpperCase() + c.slice(1) + ' starts at ' + m$(b) + '. Revenue changes ' + (g1 > 0 ? '+' : '') + g1 + '%, ' + (g2 > 0 ? '+' : '') + g2 + '%, then ' + (g3 > 0 ? '+' : '') + g3 + '% over three years. What is revenue at the end?', answer: end, unit: '$M', tol: 0.02,
          steps: ['Apply each factor in turn: ' + b + ' x ' + round(1 + g1 / 100, 2) + ' x ' + round(1 + g2 / 100, 2) + ' x ' + round(1 + g3 / 100, 2) + '.', 'End revenue = ' + end + '.'],
          tip: 'Take it one year at a time and round as you go. A 2% error is fine for a case.' };
      },
    ],
  } };

  // 2. Margins and profitability ----------------------------------------------
  TOPICS.margin = { label: 'Margins & profit', levels: {
    1: [
      function (r) {
        var R = pick(r, [100, 200, 400, 500, 800]), m = pick(r, [10, 20, 25, 40]), C = R * (1 - m / 100);
        return { variant: 'margin', inputs: { R: R, C: C }, prompt: 'A business has revenue of ' + m$(R) + ' and costs of ' + m$(C) + '. What is its profit margin?', answer: m, unit: '%', tol: 0.01,
          steps: ['Profit = ' + R + ' - ' + C + ' = ' + (R - C) + '.', 'Margin = profit / revenue = ' + (R - C) + ' / ' + R + ' = ' + m + '%.'],
          tip: 'Margin is always profit divided by revenue.' };
      },
    ],
    2: [
      function (r) {
        var R = pick(r, [300, 400, 600, 800, 1200]), m = pick(r, [8, 12, 15, 20, 25]), P = round(R * m / 100, 1);
        return { variant: 'profit', inputs: { R: R, m: m }, prompt: 'A company has revenue of ' + m$(R) + ' and an operating margin of ' + m + '%. What is its operating profit?', answer: P, unit: '$M', tol: 0.02,
          steps: [m + '% of ' + R + ' = ' + P + '.'], tip: '10% first, then scale: 15% = 10% + half of 10%.' };
      },
      function (r) {
        var m = pick(r, [10, 20, 25, 40]), R = pick(r, [200, 400, 500, 800]), P = round(R * m / 100, 1);
        return { variant: 'revenue', inputs: { P: P, m: m }, prompt: 'A division earned ' + m$(P) + ' of profit at a margin of ' + m + '%. What was its revenue?', answer: R, unit: '$M', tol: 0.02,
          steps: ['Revenue = profit / margin = ' + P + ' / ' + (m / 100) + ' = ' + R + '.'], tip: 'Turn the margin into a fraction: 20% = 1/5, so revenue is 5x profit.' };
      },
    ],
    3: [
      function (r) {
        var R = pick(r, [400, 500, 800, 1000]), m1 = pick(r, [8, 10, 12]), m2 = m1 + pick(r, [5, 8, 10]), C1 = R * (1 - m1 / 100), C2 = R * (1 - m2 / 100), cut = round((C1 - C2) / C1 * 100, 1);
        return { variant: 'costcut', inputs: { R: R, m1: m1, m2: m2 }, prompt: 'A company has revenue of ' + m$(R) + ' and a margin of ' + m1 + '%. Revenue stays flat. By what percent must it cut costs to reach a margin of ' + m2 + '%? (to 1 decimal)', answer: cut, unit: '%', tol: 0.03,
          steps: ['Costs now = ' + R + ' x ' + (100 - m1) + '% = ' + C1 + '.', 'Costs needed = ' + R + ' x ' + (100 - m2) + '% = ' + C2 + '.', 'Cut = (' + C1 + ' - ' + C2 + ') / ' + C1 + ' = ' + cut + '%.'],
          tip: 'Work in costs, not margin points. A 5-point margin gain is a much bigger cut in costs than 5%.' };
      },
      function (r) {
        var R = pick(r, [100, 200, 400]), m1 = pick(r, [10, 20]), m2 = m1 + pick(r, [10, 15]), C = R * (1 - m1 / 100), P = round(C / (1 - m2 / 100), 2), up = round((P / R - 1) * 100, 1);
        return { variant: 'priceup', inputs: { R: R, m1: m1, m2: m2 }, prompt: 'A product sells for $' + R + ' at a margin of ' + m1 + '%. Unit costs stay the same. By what percent must the price rise to reach a margin of ' + m2 + '%? (to 1 decimal)', answer: up, unit: '%', tol: 0.03,
          steps: ['Unit cost = ' + R + ' x ' + (100 - m1) + '% = $' + C + '.', 'New price = cost / (1 - ' + m2 / 100 + ') = $' + P + '.', 'Rise = ' + P + ' / ' + R + ' - 1 = ' + up + '%.'],
          tip: 'Cost stays fixed, so new price = cost / (1 - target margin).' };
      },
    ],
  } };

  // 3. Breakeven ----------------------------------------------------------------
  TOPICS.breakeven = { label: 'Breakeven', levels: {
    1: [
      function (r) {
        var c = pick(r, [5, 10, 20, 25]), u = pick(r, [1000, 2000, 4000, 5000]), v = pick(r, [10, 20, 30]), p = v + c, F = c * u;
        return { variant: 'units', inputs: { F: F, p: p, v: v }, prompt: 'Fixed costs are $' + num(F) + ' a year. Each unit sells for $' + p + ' and costs $' + v + ' to make. How many units are needed to break even?', answer: u, unit: 'units', tol: 0.01,
          steps: ['Contribution per unit = ' + p + ' - ' + v + ' = $' + c + '.', 'Breakeven = fixed costs / contribution = ' + num(F) + ' / ' + c + ' = ' + num(u) + ' units.'], tip: 'Breakeven units = fixed costs / contribution per unit.' };
      },
    ],
    2: [
      function (r) {
        var c = pick(r, [10, 20, 25, 40]), u = pick(r, [1000, 2000, 5000]), v = pick(r, [20, 30, 60]), p = v + c, F = c * u, T = c * pick(r, [500, 1000, 2000]), units = (F + T) / c;
        return { variant: 'targetprofit', inputs: { F: F, p: p, v: v, T: T }, prompt: 'Fixed costs are $' + num(F) + '. Units sell for $' + p + ' with $' + v + ' variable cost. How many units must be sold to earn a profit of $' + num(T) + '?', answer: units, unit: 'units', tol: 0.02,
          steps: ['Contribution per unit = $' + c + '.', 'Units = (fixed + target profit) / contribution = (' + num(F) + ' + ' + num(T) + ') / ' + c + ' = ' + num(units) + '.'], tip: 'A profit target is just extra fixed cost to cover.' };
      },
      function (r) {
        var cm = pick(r, [20, 25, 40, 50]), F = pick(r, [2, 3, 4, 6]) * 10, rev = round(F / (cm / 100), 1);
        return { variant: 'revenue', inputs: { F: F, cm: cm }, prompt: 'Fixed costs are ' + m$(F) + ' and the contribution margin is ' + cm + '%. What revenue is needed to break even?', answer: rev, unit: '$M', tol: 0.02,
          steps: ['Breakeven revenue = fixed costs / contribution margin = ' + F + ' / ' + cm / 100 + ' = ' + rev + '.'], tip: 'With a 25% margin, revenue needed is 4x fixed costs.' };
      },
    ],
    3: [
      function (r) {
        var p = pick(r, [50, 100]), v = p === 50 ? pick(r, [30, 35]) : pick(r, [60, 70]), cut = pick(r, [10, 20]), c = p - v, p2 = p * (1 - cut / 100), c2 = p2 - v;
        var up = round((c / c2 - 1) * 100, 1);
        return { variant: 'pricecut', inputs: { p: p, v: v, cut: cut }, prompt: 'A product sells for $' + p + ' with $' + v + ' variable cost. A ' + cut + '% price cut is planned. By what percent does breakeven volume rise? (fixed costs unchanged, to 1 decimal)', answer: up, unit: '%', tol: 0.03,
          steps: ['Old contribution = ' + p + ' - ' + v + ' = $' + c + '.', 'New price = $' + p2 + ', new contribution = $' + c2 + '.', 'Breakeven rises by ' + c + ' / ' + c2 + ' - 1 = ' + up + '%.'],
          tip: 'A small price cut eats a big share of a thin contribution, so volume must rise far more than the cut.' };
      },
    ],
  } };

  // 4. Payback ----------------------------------------------------------------
  TOPICS.payback = { label: 'Payback', levels: {
    1: [
      function (r) {
        var s = pick(r, [5, 10, 20, 25]), y = pick(r, [2, 3, 4, 5]), I = s * y;
        return { variant: 'simple', inputs: { I: I, s: s }, prompt: 'A client invests ' + m$(I) + ' in a new system that saves ' + m$(s) + ' a year. What is the payback period?', answer: y, unit: 'years', tol: 0.01,
          steps: ['Payback = investment / annual saving = ' + I + ' / ' + s + ' = ' + y + ' years.'], tip: 'Payback ignores what happens after the money is recovered.' };
      },
    ],
    2: [
      function (r) {
        var s1 = pick(r, [10, 20]), s2 = s1 * 2, I = s1 + s2 / 2 * pick(r, [1, 2]) * 1, yrs = round(1 + (I - s1) / s2, 2);
        return { variant: 'ramp', inputs: { I: I, s1: s1, s2: s2 }, prompt: 'A project costs ' + m$(I) + '. It saves ' + m$(s1) + ' in year one, then ' + m$(s2) + ' every year after. When does it pay back? (in years)', answer: yrs, unit: 'years', tol: 0.03,
          steps: ['After year one, ' + s1 + ' is recovered. ' + (I - s1) + ' remains.', 'At ' + s2 + ' a year, that takes ' + round((I - s1) / s2, 2) + ' more years.', 'Payback = ' + yrs + ' years.'], tip: 'Take the ramp-up year off first, then divide the rest by the steady-state saving.' };
      },
    ],
    3: [
      function (r) {
        var up = pick(r, [20, 40, 50]), m = pick(r, [20, 25, 40]), profit = up * m / 100, M = round(profit * pick(r, [0.25, 0.5]), 2), net = round(profit - M, 2), I = round(net * pick(r, [2, 3, 4, 5]), 1);
        var yrs = round(I / net, 2);
        return { variant: 'netprofit', inputs: { I: I, up: up, m: m, M: M }, prompt: 'A ' + m$(I) + ' investment adds ' + m$(up) + ' of annual revenue at a margin of ' + m + '%, with ' + m$(M) + ' a year of extra running costs on top. What is the payback in years?', answer: yrs, unit: 'years', tol: 0.03,
          steps: ['Extra profit = ' + up + ' x ' + m + '% = ' + profit + '.', 'Net of running costs = ' + profit + ' - ' + M + ' = ' + net + '.', 'Payback = ' + I + ' / ' + net + ' = ' + yrs + ' years.'], tip: 'Payback uses profit, not revenue. Subtract running costs before you divide.' };
      },
    ],
  } };

  // 5. Compound growth (CAGR) ---------------------------------------------------
  TOPICS.cagr = { label: 'Compound growth', levels: {
    1: [
      function (r) {
        var rate = pick(r, [6, 8, 9, 12]), yrs = round(72 / rate, 1);
        return { variant: 'rule72', inputs: { rate: rate }, prompt: 'Using the rule of 72, roughly how many years does it take for an investment growing ' + rate + '% a year to double?', answer: yrs, unit: 'years', tol: 0.1,
          steps: ['Years to double = 72 / rate = 72 / ' + rate + ' = ' + yrs + '.'], tip: 'The rule of 72 is a mental shortcut that works well for rates between 5% and 15%.' };
      },
    ],
    2: [
      function (r) {
        var rate = pick(r, [5, 10, 20, 25]), n = pick(r, [2, 3]), v0 = pick(r, [100, 200, 400]), v = round(v0 * Math.pow(1 + rate / 100, n), 1);
        return { variant: 'future', inputs: { v0: v0, rate: rate, n: n }, prompt: 'A market worth ' + m$(v0) + ' grows ' + rate + '% a year. How big is it after ' + n + ' years? (to 1 decimal)', answer: v, unit: '$M', tol: 0.01,
          steps: ['Factor per year = ' + (1 + rate / 100) + '.', v0 + ' x ' + (1 + rate / 100) + '^' + n + ' = ' + v + '.'], tip: 'Do it year by year. 10% a year for three years is about 33% in total, not 30%.' };
      },
    ],
    3: [
      function (r) {
        var opts = [[10, 3], [20, 3], [25, 2], [50, 2], [100, 3], [20, 2], [10, 2], [30, 2]], o = pick(r, opts), rate = o[0], n = o[1], v0 = pick(r, [50, 100, 200]);
        var v = round(v0 * Math.pow(1 + rate / 100, n), 1);
        return { variant: 'cagr', inputs: { v0: v0, v: v, n: n }, prompt: 'A segment grew from ' + m$(v0) + ' to ' + m$(v) + ' over ' + n + ' years. What was the compound annual growth rate (CAGR)?', answer: rate, unit: '%', tol: 0.05,
          steps: ['Total growth factor = ' + v + ' / ' + v0 + ' = ' + round(v / v0, 3) + '.', 'Find the annual factor x where x^' + n + ' = ' + round(v / v0, 3) + '.', 'x = ' + (1 + rate / 100) + ', so CAGR = ' + rate + '%.'], tip: 'Try the nice rates: 10% and 3 years gives x1.33, 20% and 3 years gives x1.73, 25% and 2 years gives x1.56.' };
      },
    ],
  } };

  // 6. Market sizing -------------------------------------------------------------
  TOPICS.market = { label: 'Market sizing', levels: {
    1: [
      function (r) {
        var P = pick(r, [10, 20, 50, 100]), s = pick(r, [10, 20, 25, 50]), x = pick(r, [20, 40, 50, 100]), ans = round(P * s / 100 * x, 1), what = pick(r, ['a streaming service', 'a fitness app', 'a meal-kit box', 'a car-wash subscription']);
        return { variant: 'simple', inputs: { P: P, s: s, x: x }, prompt: 'A country has ' + P + ' million people. ' + s + '% would buy ' + what + ' at $' + x + ' a year. How large is the market?', answer: ans, unit: '$M', tol: 0.02,
          steps: ['Buyers = ' + P + 'M x ' + s + '% = ' + round(P * s / 100, 1) + 'M.', 'Market = ' + round(P * s / 100, 1) + 'M x $' + x + ' = ' + m$(ans) + '.'], tip: 'Keep units straight: millions of people times dollars gives millions of dollars.' };
      },
    ],
    2: [
      function (r) {
        var P = pick(r, [2, 4, 5, 8]), s = pick(r, [20, 25, 40, 50]), f = pick(r, [1, 2, 3]), x = pick(r, [4, 5, 8, 10]), ans = round(P * s / 100 * f * 50 * x, 1);
        return { variant: 'frequency', inputs: { P: P, s: s, f: f, x: x }, prompt: 'A city has ' + P + ' million people. ' + s + '% buy a coffee ' + f + ' time' + (f > 1 ? 's' : '') + ' a week at $' + x + ' each. Using 50 weeks a year, what is annual coffee spend?', answer: ans, unit: '$M', tol: 0.03,
          steps: ['Buyers = ' + P + 'M x ' + s + '% = ' + round(P * s / 100, 2) + 'M.', 'Purchases a year = ' + round(P * s / 100, 2) + 'M x ' + f + ' x 50 = ' + round(P * s / 100 * f * 50, 1) + 'M.', 'Spend = ' + round(P * s / 100 * f * 50, 1) + 'M x $' + x + ' = ' + m$(ans) + '.'], tip: 'Use 50 weeks, not 52: it is quicker to calculate and well within a case rounding error.' };
      },
    ],
    3: [
      function (r) {
        var R = pick(r, [2, 3, 4]), t = pick(r, [0.5, 1, 1.5]), V = pick(r, [100, 200, 300]), vt = pick(r, [1, 1.5, 2]), cap = pick(r, [20, 25, 30, 40]);
        var trips = R * 1e6 * t / 7 + V * 1e3 * vt, taxis = Math.round(trips / cap);
        return { variant: 'fleet', inputs: { R: R, t: t, V: V, vt: vt, cap: cap }, prompt: 'A city has ' + R + ' million residents making ' + t + ' taxi trip' + (t === 1 ? '' : 's') + ' a week each, plus ' + V + ',000 visitors a day making ' + vt + ' trip' + (vt === 1 ? '' : 's') + ' a day each. A taxi does ' + cap + ' trips a day. How many taxis are needed? (nearest whole number)', answer: taxis, unit: 'taxis', tol: 0.03,
          steps: ['Resident trips a day = ' + R + 'M x ' + t + ' / 7 = ' + num(round(R * 1e6 * t / 7)) + '.', 'Visitor trips a day = ' + V + ',000 x ' + vt + ' = ' + num(V * 1e3 * vt) + '.', 'Total = ' + num(round(trips)) + ' trips a day.', 'Taxis = ' + num(round(trips)) + ' / ' + cap + ' = ' + num(taxis) + '.'], tip: 'Convert everything to the same period (per day) before you add the segments together.' };
      },
    ],
  } };

  // 7. Weighted averages and mix --------------------------------------------------
  TOPICS.mix = { label: 'Mix & weighted averages', levels: {
    1: [
      function (r) {
        var a = pick(r, [60, 70, 80]), pa = pick(r, [10, 20, 30]), pb = pa + pick(r, [10, 20]), avg = round(pa * a / 100 + pb * (100 - a) / 100, 2);
        return { variant: 'two', inputs: { a: a, pa: pa, pb: pb }, prompt: a + '% of units sell at $' + pa + ' and ' + (100 - a) + '% at $' + pb + '. What is the average selling price?', answer: avg, unit: '$', tol: 0.01,
          steps: [pa + ' x ' + a + '% + ' + pb + ' x ' + (100 - a) + '% = ' + avg + '.'], tip: 'The average sits closer to the price with the bigger share.' };
      },
    ],
    2: [
      function (r) {
        var sh = pick(r, [[50, 30, 20], [60, 30, 10], [40, 40, 20]]), mg = pick(r, [[10, 20, 30], [5, 15, 25], [20, 30, 40]]);
        var avg = round(sh[0] * mg[0] / 100 + sh[1] * mg[1] / 100 + sh[2] * mg[2] / 100, 2);
        return { variant: 'three', inputs: { sh: sh, mg: mg }, prompt: 'A company has three product lines making up ' + sh[0] + '%, ' + sh[1] + '% and ' + sh[2] + '% of revenue, with margins of ' + mg[0] + '%, ' + mg[1] + '% and ' + mg[2] + '%. What is the blended margin?', answer: avg, unit: '%', tol: 0.02,
          steps: [sh[0] + '% x ' + mg[0] + '% + ' + sh[1] + '% x ' + mg[1] + '% + ' + sh[2] + '% x ' + mg[2] + '% = ' + avg + '%.'], tip: 'Weight each margin by its share of revenue, not its share of units.' };
      },
    ],
    3: [
      function (r) {
        var mA = pick(r, [10, 15, 20]), mB = mA + pick(r, [20, 30]), s1 = pick(r, [60, 70]), s2 = s1 - pick(r, [10, 20]);
        var d = round((s2 * mA + (100 - s2) * mB) / 100 - (s1 * mA + (100 - s1) * mB) / 100, 2);
        return { variant: 'shift', inputs: { mA: mA, mB: mB, s1: s1, s2: s2 }, prompt: 'Product A has a margin of ' + mA + '% and product B ' + mB + '%. A is ' + s1 + '% of revenue today. If A falls to ' + s2 + '% of revenue, how many percentage points does the blended margin rise by?', answer: d, unit: 'pp', tol: 0.03,
          steps: ['Share moved to B = ' + (s1 - s2) + ' points.', 'Each point moved gains B\'s margin minus A\'s = ' + (mB - mA) + '%.', 'Rise = ' + (s1 - s2) + '% x ' + (mB - mA) + ' = ' + d + ' points.'], tip: 'Mix shift = share moved x the margin gap. No need to recompute both averages.' };
      },
    ],
  } };

  // 8. Unit economics -------------------------------------------------------------
  TOPICS.unit = { label: 'Unit economics', levels: {
    1: [
      function (r) {
        var p = pick(r, [10, 20, 30, 50]), g = pick(r, [40, 50, 60, 80]), L = pick(r, [12, 18, 24, 30]), ltv = round(p * g / 100 * L, 1);
        return { variant: 'ltv', inputs: { p: p, g: g, L: L }, prompt: 'A subscriber pays $' + p + ' a month at a gross margin of ' + g + '% and stays ' + L + ' months. What is the lifetime gross profit per customer?', answer: ltv, unit: '$', tol: 0.02,
          steps: ['Monthly gross profit = ' + p + ' x ' + g + '% = $' + round(p * g / 100, 1) + '.', 'Lifetime = ' + round(p * g / 100, 1) + ' x ' + L + ' = $' + ltv + '.'], tip: 'Lifetime value = monthly profit x months retained.' };
      },
    ],
    2: [
      function (r) {
        var p = pick(r, [20, 25, 50]), g = pick(r, [40, 50, 80]), c = pick(r, [2, 4, 5, 10]), cac = pick(r, [60, 100, 150, 200]), ltv = p * g / 100 / (c / 100), ratio = round(ltv / cac, 1);
        return { variant: 'ratio', inputs: { p: p, g: g, c: c, cac: cac }, prompt: 'A customer pays $' + p + ' a month at a margin of ' + g + '%, and ' + c + '% of customers leave each month. Acquiring one costs $' + cac + '. What is the LTV to CAC ratio? (to 1 decimal)', answer: ratio, unit: 'x', tol: 0.03,
          steps: ['Customer lifetime = 1 / ' + c + '% = ' + round(100 / c, 1) + ' months.', 'LTV = $' + round(p * g / 100, 1) + ' x ' + round(100 / c, 1) + ' = $' + round(ltv, 1) + '.', 'LTV / CAC = ' + round(ltv, 1) + ' / ' + cac + ' = ' + ratio + 'x.'], tip: 'Lifetime in months is 1 divided by monthly churn. A 4% churn means about 25 months.' };
      },
    ],
    3: [
      function (r) {
        var p = pick(r, [20, 25, 40, 50]), g = pick(r, [50, 60, 80]), cac = pick(r, [120, 150, 240, 300]), mo = round(cac / (p * g / 100), 1);
        return { variant: 'cacpayback', inputs: { p: p, g: g, cac: cac }, prompt: 'Acquiring a customer costs $' + cac + '. They pay $' + p + ' a month at a gross margin of ' + g + '%. How many months until the acquisition cost is paid back? (to 1 decimal)', answer: mo, unit: 'months', tol: 0.03,
          steps: ['Monthly gross profit = ' + p + ' x ' + g + '% = $' + round(p * g / 100, 1) + '.', 'Payback = ' + cac + ' / ' + round(p * g / 100, 1) + ' = ' + mo + ' months.'], tip: 'CAC payback uses gross profit, not revenue.' };
      },
      function (r) {
        var p = pick(r, [30, 40, 50]), g = pick(r, [50, 60, 80]), c = pick(r, [2, 4, 5]), maxcac = round(p * g / 100 / (c / 100) / 3, 1);
        return { variant: 'maxcac', inputs: { p: p, g: g, c: c }, prompt: 'A customer pays $' + p + ' a month at a margin of ' + g + '% with ' + c + '% monthly churn. To keep LTV at least 3x CAC, what is the most you can spend to acquire a customer? (to 1 decimal)', answer: maxcac, unit: '$', tol: 0.03,
          steps: ['Lifetime = 1 / ' + c + '% = ' + round(100 / c, 1) + ' months.', 'LTV = $' + round(p * g / 100, 1) + ' x ' + round(100 / c, 1) + ' = $' + round(p * g / 100 * 100 / c, 1) + '.', 'Max CAC = LTV / 3 = $' + maxcac + '.'], tip: 'Work backwards: LTV first, then divide by the target ratio.' };
      },
    ],
  } };

  // ---------------------------------------------------------------- more numeric questions
  function add(topic, level, fn) { TOPICS[topic].levels[level].push(fn); }
  function pct(x) { return round(x, 1); }

  add('growth', 1, function (r) {
    var T = pick(r, [200, 400, 500, 800]), p = pick(r, [10, 20, 25, 40]), part = T * p / 100, c = pick(r, COMPANIES);
    return { variant: 'share', inputs: { T: T, part: part }, prompt: 'Total sales at ' + c + ' are ' + m$(T) + ', of which ' + m$(part) + ' comes from one product. What share of sales is that product?', answer: p, unit: '%', tol: 0.01,
      steps: ['Share = part / total = ' + part + ' / ' + T + ' = ' + p + '%.'], tip: 'Share is part divided by total. Put the smaller number on top.' };
  });
  add('growth', 1, function (r) {
    var P = pick(r, [80, 200, 400, 600]), d = pick(r, [10, 20, 25, 50]), ans = round(P * (1 - d / 100), 2);
    return { variant: 'discount', inputs: { P: P, d: d }, prompt: 'A $' + P + ' product is on sale for ' + d + '% off. What is the sale price?', answer: ans, unit: '$', tol: 0.01,
      steps: [d + '% of ' + P + ' = ' + round(P * d / 100, 2) + '.', 'Sale price = ' + P + ' - ' + round(P * d / 100, 2) + ' = ' + ans + '.'], tip: 'Take the discount off, or multiply by (1 - discount) in one step.' };
  });
  add('growth', 2, function (r) {
    var M = pick(r, [2, 4, 5, 10]), s1 = pick(r, [10, 15, 20]), s2 = s1 + pick(r, [5, 10]), ans = round(M * 1000 * (s2 - s1) / 100, 1);
    return { variant: 'sharegain', inputs: { M: M, s1: s1, s2: s2 }, prompt: 'A market is worth $' + M + 'B. Your share rises from ' + s1 + '% to ' + s2 + '%. How much extra revenue is that?', answer: ans, unit: '$M', tol: 0.02,
      steps: ['Share gain = ' + (s2 - s1) + ' points.', 'Extra revenue = ' + (s2 - s1) + '% x $' + M + 'B = ' + m$(ans) + '.'], tip: 'Convert billions to millions first: $1B = $1,000M.' };
  });
  add('growth', 2, function (r) {
    var d1 = pick(r, [20, 25, 30]), d2 = pick(r, [10, 20]), tot = round((1 - (1 - d1 / 100) * (1 - d2 / 100)) * 100, 1);
    return { variant: 'doublediscount', inputs: { d1: d1, d2: d2 }, prompt: 'A shop takes ' + d1 + '% off, then an extra ' + d2 + '% off the reduced price. What is the total discount on the original price?', answer: tot, unit: '%', tol: 0.02,
      steps: ['Price factor = ' + (1 - d1 / 100) + ' x ' + (1 - d2 / 100) + ' = ' + round((1 - d1 / 100) * (1 - d2 / 100), 3) + '.', 'Total discount = 1 - that = ' + tot + '%.'], tip: 'Two discounts never add up to the sum of the two. Multiply the price factors.' };
  });

  add('margin', 1, function (r) {
    var R = pick(r, [100, 200, 400, 500]), m = pick(r, [10, 20, 25, 40]), C = round(R * (1 - m / 100), 1);
    return { variant: 'cost', inputs: { R: R, m: m }, prompt: 'A business has revenue of ' + m$(R) + ' and a profit margin of ' + m + '%. What are its total costs?', answer: C, unit: '$M', tol: 0.01,
      steps: ['Profit = ' + m + '% x ' + R + ' = ' + round(R * m / 100, 1) + '.', 'Costs = ' + R + ' - ' + round(R * m / 100, 1) + ' = ' + C + '.'], tip: 'Costs = revenue x (1 - margin).' };
  });
  add('margin', 2, function (r) {
    var R = pick(r, [200, 400, 500]), m = pick(r, [10, 20, 25]), X = pick(r, [5, 10]), C = R * (1 - m / 100), nm = round((R - C - X) / R * 100, 1);
    return { variant: 'fixedcost', inputs: { R: R, m: m, X: X }, prompt: 'A company has revenue of ' + m$(R) + ' and a ' + m + '% margin. A new fixed cost of ' + m$(X) + ' is added and revenue does not change. What is the new margin? (to 1 decimal)', answer: nm, unit: '%', tol: 0.03,
      steps: ['Profit now = ' + R + ' x ' + m + '% = ' + round(R * m / 100, 1) + '.', 'Profit after the new cost = ' + round(R * m / 100 - X, 1) + '.', 'New margin = ' + round(R * m / 100 - X, 1) + ' / ' + R + ' = ' + nm + '%.'], tip: 'Subtract the new cost from profit first, then divide by revenue.' };
  });
  add('margin', 3, function (r) {
    var k = pick(r, [25, 50, 100, 20, 40]), m = pct(k / (100 + k) * 100);
    return { variant: 'markup', inputs: { k: k }, prompt: 'A retailer prices everything at cost plus a ' + k + '% markup. What profit margin on the selling price does that give? (to 1 decimal)', answer: m, unit: '%', tol: 0.03,
      steps: ['Let cost = 100. Price = ' + (100 + k) + '.', 'Profit = ' + k + '. Margin = ' + k + ' / ' + (100 + k) + ' = ' + m + '%.'], tip: 'A markup is on cost and a margin is on price, so the margin is always the smaller number.' };
  });

  add('breakeven', 1, function (r) {
    var u = pick(r, [1000, 2000, 5000]), F = u * pick(r, [5, 10, 20]), v = pick(r, [10, 20, 40]), price = F / u + v;
    return { variant: 'price', inputs: { F: F, u: u, v: v }, prompt: 'Fixed costs are $' + num(F) + ' and you expect to sell ' + num(u) + ' units, each costing $' + v + ' to make. What price per unit makes you break even?', answer: price, unit: '$', tol: 0.01,
      steps: ['Fixed cost per unit = ' + num(F) + ' / ' + num(u) + ' = $' + F / u + '.', 'Price = ' + F / u + ' + ' + v + ' = $' + price + '.'], tip: 'Spread fixed costs over the units, then add variable cost.' };
  });
  add('breakeven', 2, function (r) {
    var b = pick(r, [1000, 2000, 4000]), f = pick(r, [1.25, 1.5, 2]), sold = b * f, ms = round((sold - b) / sold * 100, 1);
    return { variant: 'safety', inputs: { b: b, sold: sold }, prompt: 'Breakeven is ' + num(b) + ' units a year and you expect to sell ' + num(sold) + '. By what percent can sales fall before you make a loss? (the margin of safety, to 1 decimal)', answer: ms, unit: '%', tol: 0.03,
      steps: ['Cushion = ' + num(sold) + ' - ' + num(b) + ' = ' + num(sold - b) + ' units.', 'Margin of safety = ' + num(sold - b) + ' / ' + num(sold) + ' = ' + ms + '%.'], tip: 'The margin of safety is measured against expected sales, not against breakeven.' };
  });
  add('breakeven', 3, function (r) {
    var v = pick(r, [50, 60, 70]), rise = pick(r, [10, 20]), p = 100, c = p - v, v2 = v * (1 + rise / 100), c2 = p - v2, up = pct((c / c2 - 1) * 100);
    return { variant: 'costrise', inputs: { v: v, rise: rise }, prompt: 'A product sells for $100 and costs $' + v + ' to make. Variable costs rise ' + rise + '%. By what percent does breakeven volume rise? (fixed costs unchanged, to 1 decimal)', answer: up, unit: '%', tol: 0.03,
      steps: ['Old contribution = 100 - ' + v + ' = $' + c + '.', 'New cost = $' + round(v2, 2) + ', new contribution = $' + round(c2, 2) + '.', 'Breakeven rises by ' + c + ' / ' + round(c2, 2) + ' - 1 = ' + up + '%.'], tip: 'A cost rise on a thin contribution hits breakeven harder than the cost rise itself.' };
  });

  add('payback', 1, function (r) {
    var mo = pick(r, [20, 25, 50, 100]), n = pick(r, [6, 12, 18, 24]), I = mo * n;
    return { variant: 'months', inputs: { I: I, mo: mo }, prompt: 'A tool costs $' + num(I) + ' and saves $' + mo + ' a month. How many months to pay back?', answer: n, unit: 'months', tol: 0.01,
      steps: ['Payback = ' + num(I) + ' / ' + mo + ' = ' + n + ' months.'], tip: 'Keep the units consistent: monthly savings give months.' };
  });
  add('payback', 2, function (r) {
    var I = pick(r, [50, 100, 200]), g = I * pick(r, [0.1, 0.2, 0.25]), roi = round(g / I * 100, 1);
    return { variant: 'roi', inputs: { I: I, g: g }, prompt: 'An investment of ' + m$(I) + ' earns ' + m$(g) + ' of profit every year. What is the annual return on investment?', answer: roi, unit: '%', tol: 0.02,
      steps: ['Return = annual profit / investment = ' + g + ' / ' + I + ' = ' + roi + '%.'], tip: 'ROI is the inverse of payback: a 4 year payback is a 25% return.' };
  });

  add('cagr', 2, function (r) {
    var rate = pick(r, [10, 20, 25, 50]), v0 = pick(r, [100, 200, 400]), v = round(v0 * Math.pow(1 + rate / 100, 2), 1);
    return { variant: 'cagr2', inputs: { v0: v0, v: v }, prompt: 'Sales grew from ' + m$(v0) + ' to ' + m$(v) + ' in two years. What was the annual growth rate (CAGR)?', answer: rate, unit: '%', tol: 0.03,
      steps: ['Total factor = ' + v + ' / ' + v0 + ' = ' + round(v / v0, 3) + '.', 'Annual factor = square root of ' + round(v / v0, 3) + ' = ' + (1 + rate / 100) + ', so ' + rate + '% a year.'], tip: 'For two years, look for a perfect square: 1.21 = 1.1 x 1.1, 1.44 = 1.2 x 1.2, 1.56 = 1.25 x 1.25.' };
  });
  add('cagr', 3, function (r) {
    var rate = pick(r, [10, 20, 25]), n = pick(r, [2, 3]), v0 = pick(r, [100, 200, 400]), v = round(v0 * Math.pow(1 + rate / 100, n), 1);
    return { variant: 'startvalue', inputs: { v: v, rate: rate, n: n }, prompt: 'A market is ' + m$(v) + ' today after growing ' + rate + '% a year for ' + n + ' years. How big was it ' + n + ' years ago? (to 1 decimal)', answer: v0, unit: '$M', tol: 0.02,
      steps: ['Growth factor over ' + n + ' years = ' + round(Math.pow(1 + rate / 100, n), 3) + '.', 'Start = ' + v + ' / ' + round(Math.pow(1 + rate / 100, n), 3) + ' = ' + v0 + '.'], tip: 'Divide by the growth factor to go back in time. Subtracting percentages does not work.' };
  });

  add('market', 1, function (r) {
    var P = pick(r, [10, 20, 40]), hh = pick(r, [4, 5]), s = pick(r, [20, 25, 40, 50]), x = pick(r, [20, 40, 50, 100]), ans = round(P / hh * s / 100 * x, 1);
    return { variant: 'households', inputs: { P: P, hh: hh, s: s, x: x }, prompt: 'A country has ' + P + ' million people in households of ' + hh + '. ' + s + '% of households buy a service at $' + x + ' a year. How large is the market?', answer: ans, unit: '$M', tol: 0.02,
      steps: ['Households = ' + P + 'M / ' + hh + ' = ' + round(P / hh, 2) + 'M.', 'Buyers = ' + round(P / hh, 2) + 'M x ' + s + '% = ' + round(P / hh * s / 100, 2) + 'M.', 'Market = ' + round(P / hh * s / 100, 2) + 'M x $' + x + ' = ' + m$(ans) + '.'], tip: 'Households, not people, are often the right unit for a shared service.' };
  });
  add('market', 2, function (r) {
    var N = pick(r, [50, 100, 200]), c = pick(r, [200, 400, 500]), t = pick(r, [5, 10, 20]), ans = round(N * c * t * 300 / 1e6, 1);
    return { variant: 'capacity', inputs: { N: N, c: c, t: t }, prompt: 'A chain has ' + N + ' stores. Each serves ' + c + ' customers a day at an average ticket of $' + t + ', and trades 300 days a year. What is annual revenue?', answer: ans, unit: '$M', tol: 0.03,
      steps: ['Revenue per store a day = ' + c + ' x $' + t + ' = $' + num(c * t) + '.', 'Per store a year = $' + num(c * t) + ' x 300 = $' + num(c * t * 300) + '.', 'Chain = ' + N + ' x $' + num(c * t * 300) + ' = ' + m$(ans) + '.'], tip: 'Build it bottom-up from one store, then multiply.' };
  });
  add('market', 3, function (r) {
    var T = pick(r, [50, 100, 200]), p = pick(r, [20, 25, 50]), s = pick(r, [10, 20, 25]), pop = round(T / (p * s / 100), 1);
    return { variant: 'target', inputs: { T: T, p: p, s: s }, prompt: 'You want ' + m$(T) + ' of annual revenue from a $' + p + ' product. Only ' + s + '% of people will ever buy it. How many million people must the market contain?', answer: pop, unit: 'M people', tol: 0.03,
      steps: ['Customers needed = ' + T + 'M / $' + p + ' = ' + round(T / p, 2) + 'M.', 'Population = ' + round(T / p, 2) + 'M / ' + s + '% = ' + pop + 'M.'], tip: 'Work backwards: revenue target, then customers, then the population they come from.' };
  });

  add('mix', 2, function (r) {
    var w = pick(r, [60, 70, 80]), g1 = pick(r, [5, 10]), g2 = pick(r, [20, 30]), bl = round((w * g1 + (100 - w) * g2) / 100, 2);
    return { variant: 'blendedgrowth', inputs: { w: w, g1: g1, g2: g2 }, prompt: 'A core business (' + w + '% of revenue) is growing ' + g1 + '% and a new line (' + (100 - w) + '%) is growing ' + g2 + '%. How fast is the company growing overall?', answer: bl, unit: '%', tol: 0.02,
      steps: [w + '% x ' + g1 + '% + ' + (100 - w) + '% x ' + g2 + '% = ' + bl + '%.'], tip: 'Weight each growth rate by its share of today\'s revenue.' };
  });
  add('mix', 3, function (r) {
    var pc = pick(r, [10, 20, -10, -20]), vc = pick(r, [-10, -20, 10, -5]), net = pct(((1 + pc / 100) * (1 + vc / 100) - 1) * 100);
    return { variant: 'pricevolume', inputs: { pc: pc, vc: vc }, prompt: 'A company raises its price ' + (pc > 0 ? pc + '%' : 'by ' + pc + '%') + ' and volume then changes by ' + (vc > 0 ? '+' : '') + vc + '%. What is the net change in revenue? (to 1 decimal, minus sign for a fall)', answer: net, unit: '%', tol: 0.03,
      steps: ['Revenue factor = ' + round(1 + pc / 100, 2) + ' x ' + round(1 + vc / 100, 2) + ' = ' + round((1 + pc / 100) * (1 + vc / 100), 4) + '.', 'Net change = ' + net + '%.'], tip: 'Revenue = price x volume, so multiply the two factors.' };
  });

  add('unit', 1, function (r) {
    var price = pick(r, [20, 50, 100]), v = pick(r, [5, 10, 40]), u = pick(r, [1000, 2000, 5000]), ans = (price - v) * u;
    return { variant: 'contribution', inputs: { price: price, v: v, u: u }, prompt: 'A product sells for $' + price + ' with $' + v + ' of variable cost. It sells ' + num(u) + ' units a month. What is the monthly contribution?', answer: ans, unit: '$', tol: 0.01,
      steps: ['Contribution per unit = ' + price + ' - ' + v + ' = $' + (price - v) + '.', 'Monthly = ' + (price - v) + ' x ' + num(u) + ' = $' + num(ans) + '.'], tip: 'Contribution is price minus variable cost, before fixed costs.' };
  });
  add('unit', 2, function (r) {
    var p = pick(r, [10, 20, 25, 50]), c = pick(r, [2, 4, 5, 10]), ltv = round(p / (c / 100), 1);
    return { variant: 'revltv', inputs: { p: p, c: c }, prompt: 'A subscriber pays $' + p + ' a month and ' + c + '% leave each month. What is the average lifetime revenue per subscriber?', answer: ltv, unit: '$', tol: 0.03,
      steps: ['Average lifetime = 1 / ' + c + '% = ' + round(100 / c, 1) + ' months.', 'Lifetime revenue = $' + p + ' x ' + round(100 / c, 1) + ' = $' + ltv + '.'], tip: 'Average customer lifetime is 1 divided by the monthly churn rate.' };
  });
  add('unit', 3, function (r) {
    var c = pick(r, [10, 20, 25, 50]), n = pick(r, [1000, 2000, 4000]), F = c * n * pick(r, [1, 2]), cust = F / c;
    return { variant: 'custbreakeven', inputs: { F: F, c: c }, prompt: 'A service has $' + num(F) + ' of fixed costs a month. Each customer brings $' + c + ' a month of contribution. How many customers are needed to break even?', answer: cust, unit: 'customers', tol: 0.02,
      steps: ['Customers = fixed costs / contribution per customer = ' + num(F) + ' / ' + c + ' = ' + num(cust) + '.'], tip: 'Same as breakeven units, with customers as the unit.' };
  });

  // ---------------------------------------------------------------- hypotheticals (decisions)
  // Choice questions: kind 'choice', options shuffled, answer is the index of the right option.
  function choose(r, opts, correct) {
    var order = opts.slice(), i, j, t;
    for (i = order.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = order[i]; order[i] = order[j]; order[j] = t; }
    return { options: order, answer: order.indexOf(correct), unit: 'choice', tol: 0.01, kind: 'choice' };
  }
  TOPICS.hypo = { label: 'Hypotheticals & judgment', levels: { 1: [], 2: [], 3: [] } };

  add('hypo', 1, function (r) {
    var p = pick(r, [10, 20, 25, 50]), f = round((1 - p / 100) * (1 + p / 100), 4), q = choose(r, ['Yes, exactly back to the start', 'No, it ends lower', 'No, it ends higher'], 'No, it ends lower');
    return Object.assign(q, { variant: 'downup', inputs: { p: p }, prompt: 'A stock falls ' + p + '% one year and rises ' + p + '% the next. Is it back where it started?',
      steps: ['After the fall you hold ' + (100 - p) + '% of the original.', 'A ' + p + '% rise on that smaller base is less than you lost.', 'Net factor = ' + (1 - p / 100) + ' x ' + (1 + p / 100) + ' = ' + f + ', so it ends ' + round((1 - f) * 100, 2) + '% lower.'], tip: 'Equal percentage gains and losses never cancel: the loss is taken on a bigger base than the gain.' });
  });
  add('hypo', 1, function (r) {
    var f = pick(r, [2, 4]), up = (f - 1) * 100, down = round((1 - 1 / f) * 100, 1), q = choose(r, ['Back to the start', 'Lower than the start', 'Higher than the start'], 'Back to the start');
    return Object.assign(q, { variant: 'doublehalve', inputs: { f: f }, prompt: 'Sales rose ' + up + '% and then fell ' + down + '%. Where are sales compared with the start?',
      steps: ['A ' + up + '% rise multiplies sales by ' + f + '.', 'A ' + down + '% fall multiplies by ' + round(1 - down / 100, 2) + ' = 1/' + f + '.', f + ' x 1/' + f + ' = 1, so sales are back at the start.'], tip: 'To undo a rise of x, you need a fall of x / (1 + x), not x.' });
  });

  add('hypo', 2, function (r) {
    var p = pick(r, [10, 20, 30]), n = pick(r, [3, 5]), final = round(100 * Math.pow(1 - p * p / 10000, n), 1);
    var q = choose(r, ['Invest: the gains and losses cancel out', 'Do not invest: it loses value every two years', 'Invest: it grows every two years'], 'Do not invest: it loses value every two years');
    return Object.assign(q, { variant: 'cycle', inputs: { p: p, n: n }, prompt: 'A friend says a company will go up ' + p + '% in year one and down ' + p + '% in year two, and keep repeating that pattern. Should you invest?',
      steps: ['Each two-year cycle multiplies your money by ' + (1 + p / 100) + ' x ' + (1 - p / 100) + ' = ' + round(1 - p * p / 10000, 4) + '.', 'That is below 1, so you lose a little every cycle.', 'After ' + 2 * n + ' years $100 becomes about $' + final + '.'], tip: 'Up and down by the same percentage is a slow loss. Volatility drags returns down.' });
  });
  add('hypo', 2, function (r) {
    var p = pick(r, [10, 20, 30]), n = pick(r, [3, 5]), final = round(100 * Math.pow(1 - p * p / 10000, n), 1);
    return { variant: 'cyclevalue', kind: 'number', inputs: { p: p, n: n }, prompt: 'A stock rises ' + p + '% in year one, falls ' + p + '% in year two, and repeats that pattern. You put in $100. What is it worth after ' + 2 * n + ' years? (to 1 decimal)', answer: final, unit: '$', tol: 0.02,
      steps: ['One two-year cycle: ' + (1 + p / 100) + ' x ' + (1 - p / 100) + ' = ' + round(1 - p * p / 10000, 4) + '.', n + ' cycles: 100 x ' + round(1 - p * p / 10000, 4) + '^' + n + ' = $' + final + '.'], tip: 'Find the factor for one full cycle, then raise it to the number of cycles.' };
  });
  add('hypo', 2, function (r) {
    var u = pick(r, [40, 50, 60]), d = pick(r, [30, 40, 50]), rb = pick(r, [3, 5, 8]), a = (1 + u / 100) * (1 - d / 100), b = Math.pow(1 + rb / 100, 2);
    var best = a > b ? 'Option A' : 'Option B';
    var q = choose(r, ['Option A', 'Option B'], best);
    return Object.assign(q, { variant: 'twooffers', inputs: { u: u, d: d, rb: rb }, prompt: 'Option A: an investment that gains ' + u + '% in year one and loses ' + d + '% in year two. Option B: a steady ' + rb + '% a year for two years. Which leaves you with more after two years?',
      steps: ['Option A: ' + (1 + u / 100) + ' x ' + round(1 - d / 100, 2) + ' = ' + round(a, 4) + '.', 'Option B: ' + round(1 + rb / 100, 2) + ' x ' + round(1 + rb / 100, 2) + ' = ' + round(b, 4) + '.', best + ' is higher.'], tip: 'Compare the two-year growth factors. Do not average the yearly percentages.' });
  });

  add('hypo', 3, function (r) {
    var x = pick(r, [5, 10]), m = pick(r, [20, 30, 40]), y, ratio, tries = 0;
    do { y = pick(r, [5, 10, 15, 20, 25, 30]); ratio = ((100 * (1 - x / 100) - 100 * (1 - m / 100)) / (100 * m / 100)) * (1 + y / 100); tries++; } while (Math.abs(ratio - 1) < 0.03 && tries < 50);
    var yes = ratio > 1, q = choose(r, ['Yes, profit rises', 'No, profit falls'], yes ? 'Yes, profit rises' : 'No, profit falls');
    var before = m, after = round(100 * (1 - x / 100) - 100 * (1 - m / 100), 2);
    return Object.assign(q, { variant: 'pricecutdecision', inputs: { x: x, m: m, y: y }, prompt: 'A product sells for $100 at a ' + m + '% margin. Cutting the price ' + x + '% would raise volume ' + y + '%. Unit cost does not change. Should you cut the price?',
      steps: ['Profit per unit now = $' + before + '. After the cut = $' + after + '.', 'Total profit factor = (' + after + ' / ' + before + ') x ' + (1 + y / 100) + ' = ' + round(ratio, 3) + '.', yes ? 'Above 1, so profit rises.' : 'Below 1, so profit falls.'], tip: 'A price cut comes straight out of margin. Volume has to rise by more than the margin shrinks.' });
  });
  add('hypo', 3, function (r) {
    var pbk = pick(r, [2, 3, 4]), s = pick(r, [10, 20, 25]), I = s * pbk, L, tries = 0;
    do { L = pick(r, [2, 3, 4, 5, 6]); tries++; } while (L === pbk && tries < 20);
    var yes = L > pbk, q = choose(r, ['Yes: it pays back within its life', 'No: it does not pay back in time'], yes ? 'Yes: it pays back within its life' : 'No: it does not pay back in time');
    return Object.assign(q, { variant: 'lifevspayback', inputs: { I: I, s: s, L: L }, prompt: 'A machine costs ' + m$(I) + ', saves ' + m$(s) + ' a year and will last ' + L + ' years. Should the client buy it?',
      steps: ['Payback = ' + I + ' / ' + s + ' = ' + pbk + ' years.', 'The machine lasts ' + L + ' years, ' + (yes ? 'longer' : 'shorter') + ' than the payback.', yes ? 'It earns back its cost and more.' : 'It wears out before it earns back its cost.'], tip: 'Compare payback with the asset\'s life. Payback beyond the life is a loss.' });
  });
  add('hypo', 3, function (r) {
    var s1 = pick(r, [20, 25, 30]), g, k, ratio, tries = 0;
    do { g = pick(r, [1, 2, 3, 5]); k = pick(r, [5, 10, 15]); ratio = (s1 + g) * (1 - k / 100) / s1; tries++; } while (Math.abs(ratio - 1) < 0.01 && tries < 50);
    var ans = ratio > 1 ? 'Up' : 'Down', q = choose(r, ['Up', 'Down', 'Unchanged'], ans);
    return Object.assign(q, { variant: 'sharemarket', inputs: { s1: s1, g: g, k: k }, prompt: 'Your market share rises from ' + s1 + '% to ' + (s1 + g) + '%, but the whole market shrinks ' + k + '%. Is your revenue up or down?',
      steps: ['Revenue is share x market size.', 'Share factor = ' + (s1 + g) + ' / ' + s1 + ' = ' + round((s1 + g) / s1, 3) + '. Market factor = ' + round(1 - k / 100, 2) + '.', 'Revenue factor = ' + round(ratio, 3) + ', so revenue is ' + ans.toLowerCase() + '.'], tip: 'Winning share in a shrinking market can still mean less revenue. Multiply the two effects.' });
  });

  // ---------------------------------------------------------------- building questions
  var DIFFICULTIES = { 1: 'Easy', 2: 'Medium', 3: 'Hard', random: 'Random mix' };
  var TOPIC_IDS = Object.keys(TOPICS);

  // One question for a topic and level from a seed. Throws on a bad topic or level.
  function make(topic, level, seed) {
    var t = TOPICS[topic];
    if (!t) throw new Error('unknown topic ' + topic);
    var variants = t.levels[level];
    if (!variants) throw new Error('unknown level ' + level);
    var r = rng(seed);
    var q = variants[Math.floor(r() * variants.length)](r);
    q.topic = topic; q.level = level; q.seed = seed; q.topicLabel = t.label; q.kind = q.kind || 'number';
    // JavaScript float noise (820.0000000000001) must never reach a candidate.
    var clean = function (x) { return x.replace(/\d+\.\d{6,}/g, function (m) { return String(round(parseFloat(m), 4)); }); };
    q.prompt = clean(q.prompt); q.tip = clean(q.tip); q.steps = q.steps.map(clean);
    return q;
  }

  // A session: n questions, spread across the chosen topics, no topic twice in a row where possible.
  function session(opts) {
    var level = opts.level === 'random' ? 'random' : (opts.level || 1), n = opts.count || 10, topics = (opts.topics && opts.topics.length ? opts.topics : TOPIC_IDS).filter(function (x) { return TOPICS[x]; });
    if (!topics.length) topics = TOPIC_IDS;
    var base = (opts.seed === undefined ? Math.floor(Math.random() * 1e9) : opts.seed) >>> 0, r = rng(base), out = [], last = null;
    for (var i = 0; i < n; i++) {
      var pool = topics.filter(function (x) { return x !== last; });
      if (!pool.length) pool = topics;
      var tp = pick(r, pool);
      last = tp;
      out.push(make(tp, level === 'random' ? pick(r, [1, 2, 3]) : level, (base + i * 7919 + 13) >>> 0));
    }
    return out;
  }

  // ---------------------------------------------------------------- answers
  // Reads what a person typed: "25", "25%", "$1,200", "1.2k", "1.5 m". Returns a number or null.
  function parseAnswer(text) {
    if (typeof text !== 'string') return null;
    var s = text.trim().toLowerCase().replace(/[$,\s]/g, '').replace(/%$/, '');
    var mult = 1;
    var m = s.match(/^(-?\d*\.?\d+)([kmb])?$/);
    if (!m) return null;
    if (m[2] === 'k') mult = 1e3; else if (m[2] === 'm') mult = 1e6; else if (m[2] === 'b') mult = 1e9;
    var v = parseFloat(m[1]) * mult;
    return isFinite(v) ? v : null;
  }

  // Close enough is right: case interviews reward sensible rounding, so the tolerance is relative.
  function check(q, given) {
    if (q.kind === 'choice') return { ok: given === q.answer, value: q.options[given] };
    var v = typeof given === 'number' ? given : parseAnswer(String(given));
    if (v === null) return { ok: false, invalid: true };
    var tol = Math.max(Math.abs(q.answer) * q.tol, 0.05);
    return { ok: Math.abs(v - q.answer) <= tol, value: v };
  }

  var api = { TOPICS: TOPICS, TOPIC_IDS: TOPIC_IDS, DIFFICULTIES: DIFFICULTIES, make: make, session: session, parseAnswer: parseAnswer, check: check, rng: rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MadaMaths = api;
})(typeof window !== 'undefined' ? window : globalThis);
