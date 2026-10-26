// Mada AI report insights: what each skill means, a spider chart, benchmarks against other candidates, progress
// across cases and "what to practise next". Shared by the single report page and "My reports".
// Every string is written with textContent, never innerHTML. SVG is built with createElementNS.
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  // The 11 categories of the Mada assessment framework. `scored` = scored from an AI interview today.
  var INFO = [
    { id: 'quantitative_skills', label: 'Quantitative skills', group: 'Case skills', scored: true,
      what: 'Working confidently with numbers, calculating accurately and turning results into business insight.',
      looks: ['Picks the right calculation and formula', 'Does mental maths quickly and accurately', 'Explains the calculation so it is easy to follow', 'Checks whether the answer makes business sense', 'Spots and fixes mistakes without being told'] },
    { id: 'problem_solving', label: 'Problem solving', group: 'Case skills', scored: true,
      what: 'Breaking a complex, ambiguous problem into manageable parts and finding a logical path to an answer.',
      looks: ['Structures the problem into clear, distinct areas', 'Forms a hypothesis and refines it as facts arrive', 'Focuses on the issues that matter most', 'Connects findings into one coherent picture', 'Adapts when new evidence challenges the first idea'] },
    { id: 'business_acumen', label: 'Business sense / acumen', group: 'Case skills', scored: true,
      what: 'Commercial awareness: how businesses operate, make decisions and create value.',
      looks: ['Understands the client’s model, industry and competitors', 'Uses practical judgment, not only frameworks', 'Sees the commercial meaning of the numbers', 'Considers customers, operations and risks', 'Recommends something sensible and realistic'] },
    { id: 'impact_execution', label: 'Impact-driven execution', group: 'Case skills', scored: true,
      what: 'Moving beyond analysis to practical actions that deliver results.',
      looks: ['Focuses on what moves the client’s objective most', 'Turns findings into concrete recommendations', 'Prioritises by benefit, feasibility and urgency', 'Offers creative options when the obvious ones fall short', 'Names trade-offs and implementation risks'] },
    { id: 'development_leadership', label: 'Development & leadership', group: 'Behavioural skills', scored: true,
      what: 'Potential to take initiative, influence others, lead through challenges and develop people and teams.',
      looks: ['Shows ownership and accountability', 'Takes initiative without waiting to be asked', 'Influences and motivates others', 'Supports colleagues and team growth', 'Reflects on experience and shows growth'] },
    { id: 'trust_relationships', label: 'Trust-based relationships', group: 'Behavioural skills', scored: true,
      what: 'Building credibility and strong working relationships with different people.',
      looks: ['Builds rapport and trust', 'Understands other people’s perspectives and motives', 'Handles disagreement constructively', 'Shows empathy, professionalism and reliability', 'Collaborates while keeping relationships positive'] },
    { id: 'grit_resilience', label: 'Grit & resilience', group: 'Behavioural skills', scored: true,
      what: 'Determination and adaptability when facing uncertainty, setbacks or pressure.',
      looks: ['Keeps going on hard goals', 'Stays composed and productive under pressure', 'Responds constructively to setbacks and criticism', 'Adapts to the unfamiliar and learns from mistakes', 'Shows curiosity, ambition and willingness to stretch'] },
    { id: 'communication', label: 'Communication', group: 'Case and behavioural skills', scored: true,
      what: 'Communicating ideas clearly, confidently and persuasively, and engaging well with the interviewer.',
      looks: ['Presents ideas in a structured, easy-to-follow way', 'Leads with the conclusion, then the reasoning', 'Explains complex ideas simply', 'Listens, understands the question, answers it directly', 'Gives concise recommendations backed by evidence'] },
    { id: 'motivation', label: 'Motivation for consulting', group: 'Additional dimensions', scored: false,
      what: 'Whether you have a clear, credible understanding of consulting, its demands, and why it fits your ambitions.', looks: [] },
    { id: 'firm_fit', label: 'Firm & cultural fit', group: 'Additional dimensions', scored: false,
      what: 'Your understanding of the target firm, alignment with its culture and values, and why you would succeed there.', looks: [] },
    { id: 'overall', label: 'Overall interview performance', group: 'Additional dimensions', scored: false,
      what: 'A holistic view of readiness: analytical and interpersonal strength, consistency, use of feedback and overall potential.', looks: [] }
  ];
  var BY_ID = {};
  INFO.forEach(function (c) { BY_ID[c.id] = c; });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function num(x) { return typeof x === 'number' && isFinite(x); }
  function fmt(x) { return num(x) ? x.toFixed(1) : 'n/a'; }

  // "What this measures" block for one skill id; null when the id is unknown.
  function explain(id) {
    var c = BY_ID[id];
    if (!c) return null;
    var d = el('details', 'rp-what');
    d.appendChild(el('summary', null, 'What this skill measures'));
    d.appendChild(el('p', null, c.what));
    if (c.looks.length) {
      d.appendChild(el('p', 'rp-what-h', 'Interviewers look for someone who:'));
      var ul = el('ul');
      c.looks.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      d.appendChild(ul);
    }
    return d;
  }

  // The full framework, as a collapsible guide.
  function guide() {
    var box = el('div', 'card rp-guide');
    box.appendChild(el('h3', null, 'How you are assessed'));
    box.appendChild(el('p', 'muted', 'Mada uses the same eleven categories real consulting interviewers use. Eight are scored from your AI interviews today. The other three are covered in coaching.'));
    var group = null;
    INFO.forEach(function (c) {
      if (c.group !== group) { group = c.group; box.appendChild(el('h4', 'rp-guide-h', group)); }
      var d = el('details', 'rp-what');
      var s = el('summary', null, c.label);
      if (!c.scored) s.appendChild(el('span', 'rp-pill', 'Coached, not AI-scored'));
      d.appendChild(s);
      d.appendChild(el('p', null, c.what));
      if (c.looks.length) {
        var ul = el('ul');
        c.looks.forEach(function (t) { ul.appendChild(el('li', null, t)); });
        d.appendChild(ul);
      }
      box.appendChild(d);
    });
    return box;
  }

  // ---------------------------------------------------------------- spider chart
  // axes: [{label}], series: [{name, cls, values:[number|null], dashed}]. Scale 0..5.
  function spider(axes, series) {
    var n = axes.length, S = 360, cx = S / 2, cy = S / 2, R = 120;
    var root = svg('svg', { viewBox: '-70 -8 ' + (S + 140) + ' ' + (S + 16), class: 'rp-spider', role: 'img' });
    root.setAttribute('aria-label', 'Spider chart: ' + series.map(function (s) {
      return s.name + ': ' + axes.map(function (a, i) { return a.label + ' ' + fmt(s.values[i]); }).join(', ');
    }).join('. '));
    function pt(i, v) {
      var a = -Math.PI / 2 + (2 * Math.PI * i) / n, r = (R * v) / 5;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    for (var ring = 1; ring <= 5; ring++) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(pt(i, ring).join(','));
      root.appendChild(svg('polygon', { points: pts.join(' '), class: 'rp-ring' }));
    }
    for (var j = 0; j < n; j++) {
      var e = pt(j, 5);
      root.appendChild(svg('line', { x1: cx, y1: cy, x2: e[0], y2: e[1], class: 'rp-axis' }));
      var lp = pt(j, 6.15);
      var t = svg('text', { x: lp[0], y: lp[1], class: 'rp-axlabel', 'text-anchor': lp[0] < cx - 8 ? 'end' : lp[0] > cx + 8 ? 'start' : 'middle', 'dominant-baseline': 'middle' });
      t.textContent = axes[j].short || axes[j].label;
      root.appendChild(t);
    }
    series.forEach(function (s) {
      var have = s.values.filter(num).length;
      if (!have) return;
      var pts = s.values.map(function (v, i) { return pt(i, num(v) ? v : 0).join(','); }).join(' ');
      var shape = have >= 3 ? 'polygon' : 'polyline';
      root.appendChild(svg(shape, { points: pts, class: 'rp-series ' + s.cls }));
      s.values.forEach(function (v, i) {
        if (!num(v)) return;
        var p = pt(i, v);
        root.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 3.5, class: 'rp-dot ' + s.cls }));
      });
    });
    return root;
  }

  function legend(series) {
    var l = el('div', 'rp-legend');
    series.forEach(function (s) {
      var i = el('span', 'rp-leg');
      i.appendChild(el('span', 'rp-sw ' + s.cls));
      i.appendChild(document.createTextNode(s.name));
      l.appendChild(i);
    });
    return l;
  }

  // Short axis labels so the chart reads on a phone.
  var SHORT = { quantitative_skills: 'Quant', problem_solving: 'Problem solving', business_acumen: 'Business sense', impact_execution: 'Impact', communication: 'Communication', development_leadership: 'Leadership', trust_relationships: 'Trust', grit_resilience: 'Grit' };

  function othersMap(ins) {
    var m = {};
    ((ins && ins.others && ins.others.by_competency) || []).forEach(function (c) { m[c.id] = c.avg; });
    return m;
  }

  // ---------------------------------------------------------------- single report: this interview vs you before vs others
  function reportPanel(r, ins) {
    var comps = (r.competencies || []).filter(function (c) { return c.id; });
    if (comps.length < 3) return null;
    var axes = comps.map(function (c) { return { label: c.label, short: SHORT[c.id] }; });
    var series = [{ name: 'This interview', cls: 'rp-s-now', values: comps.map(function (c) { return num(c.score) ? c.score : null; }) }];
    var om = othersMap(ins);
    var hasOthers = ins && ins.others && ins.others.available;
    if (hasOthers) series.push({ name: 'Other candidates', cls: 'rp-s-others', values: comps.map(function (c) { return num(om[c.id]) ? om[c.id] : null; }) });
    var box = el('div', 'card rp-panel');
    box.appendChild(el('h3', null, 'Your skills at a glance'));
    box.appendChild(spider(axes, series));
    box.appendChild(legend(series));
    if (hasOthers) {
      box.appendChild(el('p', 'muted', 'Other candidates: the average of ' + ins.others.candidates + ' people who took a Mada AI case interview. Each person counts once.'));
    } else if (ins) {
      box.appendChild(el('p', 'muted', 'The comparison with other candidates appears once enough people have taken an interview, so no one can be identified.'));
    }
    return box;
  }

  // A "you vs others" line to put under a skill's score.
  function benchLine(score, avg) {
    if (!num(score) || !num(avg)) return null;
    var d = Math.round((score - avg) * 10) / 10;
    var txt = d === 0 ? 'In line with the average of other candidates (' + fmt(avg) + ').'
      : (d > 0 ? 'Above' : 'Below') + ' the average of other candidates (' + fmt(avg) + ') by ' + Math.abs(d).toFixed(1) + '.';
    return el('p', 'rp-bench ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'flat'), txt);
  }

  // ---------------------------------------------------------------- progress across cases
  function nextFocusCard(ins) {
    if (!ins || !ins.next_focus) return null;
    var c = el('div', 'card dark rp-next');
    c.appendChild(el('span', 'tag', 'What to practise next'));
    c.appendChild(el('h3', 'rp-next-h', ins.next_focus.label + ' case'));
    c.appendChild(el('p', null, ins.next_focus.reason));
    return c;
  }

  function coverage(ins) {
    var box = el('div', 'card');
    box.appendChild(el('h3', null, 'Case types you have practised'));
    var max = Math.max(1, Math.max.apply(null, ins.coverage.map(function (c) { return c.count; })));
    ins.coverage.forEach(function (c) {
      var row = el('div', 'rp-cov');
      row.appendChild(el('span', 'rp-cov-name', c.label));
      var bar = el('span', 'rp-cov-bar');
      var fill = el('span', 'rp-cov-fill' + (c.count === 0 ? ' zero' : ''));
      fill.style.width = (c.count === 0 ? 0 : Math.max(8, Math.round((100 * c.count) / max))) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('span', 'rp-cov-n', String(c.count)));
      box.appendChild(row);
    });
    return box;
  }

  function tile(label, value, sub, cls) {
    var t = el('div', 'rp-tile' + (cls ? ' ' + cls : ''));
    t.appendChild(el('span', 'rp-tile-l', label));
    t.appendChild(el('span', 'rp-tile-v', value));
    if (sub) t.appendChild(el('span', 'rp-tile-s', sub));
    return t;
  }

  function progress(ins) {
    var root = el('div', 'rp-progress');
    if (!ins || !ins.count) return root;
    var me = ins.me;
    var tiles = el('div', 'rp-tiles');
    tiles.appendChild(tile('First interview', fmt(me.first_overall), 'out of 5'));
    if (ins.count >= 2) {
      var imp = me.improvement;
      tiles.appendChild(tile('Improvement', num(imp) ? (imp > 0 ? '+' : '') + imp.toFixed(1) : 'n/a', 'latest vs first', num(imp) ? (imp > 0 ? 'up' : imp < 0 ? 'down' : '') : ''));
      tiles.appendChild(tile('Average of new cases', fmt(me.avg_new_overall), ins.count - 1 + (ins.count === 2 ? ' case' : ' cases') + ' since your first'));
    }
    if (ins.others.available) tiles.appendChild(tile('Other candidates', fmt(ins.others.overall), 'average of ' + ins.others.candidates));
    root.appendChild(tiles);

    // Spider: first vs average of new cases vs others.
    var by = me.by_competency;
    var axes = by.map(function (c) { return { label: c.label, short: SHORT[c.id] }; });
    var series = [{ name: 'Your first interview', cls: 'rp-s-first', values: by.map(function (c) { return c.first; }) }];
    if (ins.count >= 2) series.push({ name: 'Average of your new cases', cls: 'rp-s-now', values: by.map(function (c) { return c.avg_new; }) });
    if (ins.others.available) {
      var om = othersMap(ins);
      series.push({ name: 'Other candidates', cls: 'rp-s-others', values: by.map(function (c) { return num(om[c.id]) ? om[c.id] : null; }) });
    }
    var chart = el('div', 'card rp-panel');
    chart.appendChild(el('h3', null, 'Your skills over time'));
    chart.appendChild(spider(axes, series));
    chart.appendChild(legend(series));
    if (ins.count < 2) chart.appendChild(el('p', 'muted', 'Take another case to see how you improve against your first.'));
    root.appendChild(chart);

    var nf = nextFocusCard(ins);
    if (nf) root.appendChild(nf);
    root.appendChild(coverage(ins));
    return root;
  }

  window.MadaInsights = { INFO: INFO, explain: explain, guide: guide, spider: spider, reportPanel: reportPanel, benchLine: benchLine, progress: progress, nextFocusCard: nextFocusCard, othersMap: othersMap };
})();
