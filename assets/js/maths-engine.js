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
    q.topic = topic; q.level = level; q.seed = seed; q.topicLabel = t.label;
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
    var v = typeof given === 'number' ? given : parseAnswer(String(given));
    if (v === null) return { ok: false, invalid: true };
    var tol = Math.max(Math.abs(q.answer) * q.tol, 0.05);
    return { ok: Math.abs(v - q.answer) <= tol, value: v };
  }

  var api = { TOPICS: TOPICS, TOPIC_IDS: TOPIC_IDS, DIFFICULTIES: DIFFICULTIES, make: make, session: session, parseAnswer: parseAnswer, check: check, rng: rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MadaMaths = api;
})(typeof window !== 'undefined' ? window : globalThis);
