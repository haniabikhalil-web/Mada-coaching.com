// Mada AI report view: draws a candidate-safe report object. Shared by the report page and the call page.
// Every string from the report is written with textContent, never innerHTML.
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  // ---------------------------------------------------------------- rendering
  function scoreBar(score) {
    var wrap = el('div', 'rp-scorebar');
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', score === null ? 'Not scored' : 'Score ' + score + ' out of 5');
    for (var i = 1; i <= 5; i++) {
      var seg = el('span', 'rp-seg' + (score !== null && i <= score ? ' on' : ''));
      wrap.appendChild(seg);
    }
    return wrap;
  }

  // ---------------------------------------------------------------- coaching ("How you could have done better")
  function fmtNum(x) {
    if (typeof x !== 'number' || !isFinite(x)) return '';
    return x.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  var CALC_LABEL = {
    arithmetic_error: 'Calculation check',
    assumption: 'Assumption to justify',
    illustration: 'Worked example (illustrative, not a case fact)'
  };
  function part(label, text, cls) {
    var p = el('div', 'rp-cpart' + (cls ? ' ' + cls : ''));
    p.appendChild(el('span', 'rp-clabel', label));
    p.appendChild(el('p', null, text));
    return p;
  }
  function coachItem(it, n) {
    var box = el('div', 'rp-ci');
    var head = el('div', 'rp-ci-head');
    head.appendChild(el('span', 'rp-ci-n', String(n)));
    head.appendChild(el('strong', null, it.moment));
    if (it.kind === 'refinement') head.appendChild(el('span', 'rp-badge rp-ok', 'To go further'));
    box.appendChild(head);
    box.appendChild(part(it.kind === 'refinement' ? 'What would take it further' : 'What was missing', it.what_was_missing));
    if (it.you_said) {
      var said = el('div', 'rp-cpart');
      said.appendChild(el('span', 'rp-clabel', 'What you said'));
      said.appendChild(el('blockquote', 'rp-quote', '\u201c' + it.you_said + '\u201d'));
      box.appendChild(said);
    }
    box.appendChild(part('What you could have done', it.what_you_could_have_done));
    if (it.calculation) {
      var c = it.calculation;
      var cb = el('div', 'rp-calc');
      cb.appendChild(el('span', 'rp-clabel', CALC_LABEL[c.kind] || 'Calculation'));
      var row = el('div', 'rp-calc-row');
      if (c.your_calculation) {
        var a = el('div', 'rp-calc-step');
        a.appendChild(el('span', 'rp-calc-k', 'Your calculation'));
        a.appendChild(el('span', 'rp-calc-v', c.your_calculation));
        row.appendChild(a);
        row.appendChild(el('span', 'rp-calc-arrow', '\u2192'));
      }
      var b = el('div', 'rp-calc-step');
      b.appendChild(el('span', 'rp-calc-k', c.kind === 'arithmetic_error' ? 'Corrected calculation' : 'Calculation'));
      b.appendChild(el('span', 'rp-calc-v', c.corrected_expression.replace(/\d{4,}/g, function (m) { return Number(m).toLocaleString('en-US'); }).replace(/\*/g, ' \u00d7 ').replace(/\//g, ' \u00f7 ') + ' = ' + fmtNum(c.corrected_result) + (c.unit ? ' ' + c.unit : '')));
      row.appendChild(b);
      cb.appendChild(row);
      cb.appendChild(el('p', 'rp-calc-imp', 'What it means: ' + c.implication));
      box.appendChild(cb);
    }
    var ex = el('div', 'rp-cpart rp-example');
    ex.appendChild(el('span', 'rp-clabel', 'What a stronger answer could sound like (an example, not what you said)'));
    ex.appendChild(el('p', null, '\u201c' + it.stronger_answer + '\u201d'));
    box.appendChild(ex);
    return box;
  }
  function coachingBlock(co) {
    var det = el('details', 'rp-coach');
    var sum = el('summary', null);
    sum.appendChild(el('span', 'rp-coach-t', 'How you could have done better'));
    sum.appendChild(el('span', 'rp-coach-n', co.items.length + (co.items.length === 1 ? ' point' : ' points')));
    det.appendChild(sum);
    var body = el('div', 'rp-coach-body');
    co.items.forEach(function (it, i) { body.appendChild(coachItem(it, i + 1)); });
    if (co.keep_doing) body.appendChild(part('Keep doing', co.keep_doing, 'rp-keep'));
    det.appendChild(body);
    return det;
  }
  function planCard(plan) {
    var box = el('div', 'card dark rp-next');
    box.appendChild(el('span', 'tag', 'Practise next'));
    var ol = el('ol', 'rp-plan');
    plan.forEach(function (p) {
      var li = el('li');
      var h = el('div', 'rp-plan-h');
      h.appendChild(el('span', 'rp-plan-p', 'Priority ' + p.priority));
      h.appendChild(el('strong', null, p.focus));
      h.appendChild(el('span', 'rp-plan-s', p.label));
      li.appendChild(h);
      li.appendChild(el('p', null, p.exercise));
      ol.appendChild(li);
    });
    box.appendChild(ol);
    return box;
  }
  // Printing shows every skill's coaching open, then puts the page back as it was.
  var printState = [];
  window.addEventListener('beforeprint', function () {
    printState = [];
    Array.prototype.forEach.call(document.querySelectorAll('details.rp-coach'), function (d) { printState.push([d, d.open]); d.open = true; });
  });
  window.addEventListener('afterprint', function () {
    printState.forEach(function (x) { x[0].open = x[1]; });
    printState = [];
  });

  function render(r, mount, ins, level) {
    var MI = window.MadaInsights || null;
    var om = MI && ins ? MI.othersMap(ins) : {};
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    var root = el('div', 'rp');

    root.appendChild(el('p', 'rp-disclaimer', r.disclaimer));
    root.appendChild(el('h2', null, r.title));
    if (level === 'easier' || level === 'standard' || level === 'harder') root.appendChild(el('p', 'rp-level', 'Difficulty: ' + level.charAt(0).toUpperCase() + level.slice(1) + '. Scored against the same rubric at every level.'));

    var sum = el('div', 'rp-summary card');
    sum.appendChild(el('span', 'tag', 'Overall'));
    sum.appendChild(el('div', 'rp-big', r.overall === null ? 'Not scored' : r.overall.toFixed(1) + ' / 5'));
    sum.appendChild(el('p', null, r.overall === null
      ? 'There was not enough evidence for an overall score.'
      : 'Average of the ' + r.assessed + ' of ' + r.total + ' skills with enough evidence. A developmental guide, not a pass or fail.'));
    root.appendChild(sum);

    if (window.print && r.competencies.some(function (c) { return c.coaching; })) {
      var pb = el('button', 'btn btn-outline rp-print', 'Save or print as PDF');
      pb.type = 'button';
      pb.addEventListener('click', function () { window.print(); });
      root.appendChild(pb);
    }

    if (r.notices && r.notices.length) {
      var nb = el('div', 'rp-notices');
      r.notices.forEach(function (n) { nb.appendChild(el('p', null, n)); });
      root.appendChild(nb);
    }

    var panel = MI ? MI.reportPanel(r, ins) : null;
    if (panel) root.appendChild(panel);

    root.appendChild(el('h3', null, r.product === 'case' ? 'Case skills' : 'Behavioural skills'));
    r.competencies.forEach(function (c) {
      var card = el('div', 'rp-comp card');
      var head = el('div', 'rp-comp-head');
      head.appendChild(el('strong', null, c.label));
      head.appendChild(el('span', 'rp-score', c.score === null ? 'Not scored' : c.score + ' / 5'));
      card.appendChild(head);
      card.appendChild(scoreBar(c.score));
      var bl = MI ? MI.benchLine(c.score, om[c.id]) : null;
      if (bl) card.appendChild(bl);
      card.appendChild(el('p', null, c.rationale));
      var quotes = [];
      if (c.evidence) quotes.push(c.evidence);
      (c.more_evidence || []).forEach(function (m) { quotes.push(m); });
      quotes.forEach(function (e) { card.appendChild(el('blockquote', 'rp-quote', '\u201c' + e.quote + '\u201d')); });
      var ex = MI ? MI.explain(c.id) : null;
      if (ex) card.appendChild(ex);
      if (c.coaching && c.coaching.items && c.coaching.items.length) card.appendChild(coachingBlock(c.coaching));
      root.appendChild(card);
    });

    if (r.milestones && r.milestones.length) {
      root.appendChild(el('h3', null, 'Case milestones'));
      root.appendChild(el('p', 'muted', 'How far you got on each stage of the case, and how much help you needed.'));
      var grid = el('div', 'rp-ms');
      r.milestones.forEach(function (m) {
        var card = el('div', 'rp-m card');
        card.appendChild(el('span', 'rp-badge rp-' + m.tone, m.badge));
        card.appendChild(el('strong', null, m.id + ' · ' + m.label));
        card.appendChild(el('p', null, m.note));
        grid.appendChild(card);
      });
      root.appendChild(grid);
    }

    function list(title, items) {
      var box = el('div', 'card');
      box.appendChild(el('h3', null, title));
      var ul = el('ul');
      items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      box.appendChild(ul);
      return box;
    }
    var two = el('div', 'rp-two');
    two.appendChild(list('Strengths', r.strengths));
    two.appendChild(list('To improve', r.improvements));
    root.appendChild(two);

    if (r.practice_plan && r.practice_plan.length) {
      root.appendChild(planCard(r.practice_plan));
    } else {
      var next = el('div', 'card dark rp-next');
      next.appendChild(el('span', 'tag', 'Practise next'));
      next.appendChild(el('p', null, r.next_practice_action));
      root.appendChild(next);
    }
    if (MI && ins) { var nf = MI.nextFocusCard(ins); if (nf) root.appendChild(nf); }
    if (MI) root.appendChild(MI.guide());

    mount.appendChild(root);
  }
  window.MadaReport = { render: render, el: el };

})();
