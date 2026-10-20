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

  function render(r, mount) {
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    var root = el('div', 'rp');

    root.appendChild(el('p', 'rp-disclaimer', r.disclaimer));
    root.appendChild(el('h2', null, r.title));

    var sum = el('div', 'rp-summary card');
    sum.appendChild(el('span', 'tag', 'Overall'));
    sum.appendChild(el('div', 'rp-big', r.overall === null ? 'Not scored' : r.overall.toFixed(1) + ' / 5'));
    sum.appendChild(el('p', null, r.overall === null
      ? 'There was not enough evidence for an overall score.'
      : 'Average of the ' + r.assessed + ' of ' + r.total + ' skills with enough evidence. A developmental guide, not a pass or fail.'));
    root.appendChild(sum);

    if (r.notices && r.notices.length) {
      var nb = el('div', 'rp-notices');
      r.notices.forEach(function (n) { nb.appendChild(el('p', null, n)); });
      root.appendChild(nb);
    }

    root.appendChild(el('h3', null, r.product === 'case' ? 'Case skills' : 'Behavioural skills'));
    r.competencies.forEach(function (c) {
      var card = el('div', 'rp-comp card');
      var head = el('div', 'rp-comp-head');
      head.appendChild(el('strong', null, c.label));
      head.appendChild(el('span', 'rp-score', c.score === null ? 'Not scored' : c.score + ' / 5'));
      card.appendChild(head);
      card.appendChild(scoreBar(c.score));
      card.appendChild(el('p', null, c.rationale));
      var quotes = [];
      if (c.evidence) quotes.push(c.evidence);
      (c.more_evidence || []).forEach(function (m) { quotes.push(m); });
      quotes.forEach(function (e) { card.appendChild(el('blockquote', 'rp-quote', '\u201c' + e.quote + '\u201d')); });
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

    var next = el('div', 'card dark rp-next');
    next.appendChild(el('span', 'tag', 'Practise next'));
    next.appendChild(el('p', null, r.next_practice_action));
    root.appendChild(next);

    mount.appendChild(root);
  }
  window.MadaReport = { render: render, el: el };

})();
