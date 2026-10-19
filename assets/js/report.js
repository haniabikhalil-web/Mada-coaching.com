// Mada AI interview report page. Signs a candidate in with an emailed code (Supabase Auth, existing
// accounts only), asks the interview-report function for their released report, and draws it.
//
// Every string from the report is written with textContent, never innerHTML.
// The access token lives in memory only and is gone when the tab closes.
(function () {
  var app = document.getElementById('report-app');
  if (!app) return;
  var statusEl = document.getElementById('report-status');
  var API = app.getAttribute('data-api');
  var KEY = app.getAttribute('data-key');
  var token = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function say(msg) { clear(); app.appendChild(el('p', 'muted', msg)); }

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
    mount = mount || app;
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
      if (c.evidence) {
        var q = el('blockquote', 'rp-quote', '“' + c.evidence.quote + '”');
        card.appendChild(q);
      }
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
  window.MadaReport = { render: render };

  // ---------------------------------------------------------------- sign-in and fetch
  function ready() { return API && KEY && API.indexOf('https://') === 0; }

  function post(path, body, bearer) {
    var h = { 'content-type': 'application/json', apikey: KEY };
    if (bearer) h.authorization = 'Bearer ' + bearer;
    return fetch(API.replace(/\/+$/, '') + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  }

  function signInForm(msg) {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Sign in to see your report'));
    form.appendChild(el('p', 'muted', msg || 'Enter the email you used with Mada. We will email you a one-time code.'));
    var input = el('input'); input.type = 'email'; input.required = true; input.autocomplete = 'email'; input.placeholder = 'you@example.com';
    input.setAttribute('aria-label', 'Email address');
    var btn = el('button', 'btn btn-primary', 'Email me a code'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      var email = input.value.trim();
      // create_user:false = existing accounts only; no one can self-register from this page.
      post('/auth/v1/otp', { email: email, create_user: false }).then(function () { codeForm(email); },
        function () { signInForm('Could not reach the sign-in service. Try again.'); });
    });
    app.appendChild(form);
  }

  function codeForm(email) {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Enter your code'));
    form.appendChild(el('p', 'muted', 'If that email has a Mada account, a code is on its way.'));
    var input = el('input'); input.type = 'text'; input.inputMode = 'numeric'; input.required = true; input.autocomplete = 'one-time-code';
    input.setAttribute('aria-label', 'One-time code');
    var btn = el('button', 'btn btn-primary', 'Show my report'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      post('/auth/v1/verify', { type: 'email', email: email, token: input.value.trim() }).then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      }).then(function (j) { token = j.access_token; load(); }, function () { signInForm('That code did not work. Request a new one.'); });
    });
    app.appendChild(form);
  }

  function load() {
    say('Loading your report…');
    var id = new URLSearchParams(location.search).get('id');
    post('/functions/v1/interview-report', id ? { id: id } : {}, token).then(function (r) {
      if (r.status === 401) { token = null; return signInForm('Your session expired. Sign in again.'); }
      if (!r.ok) return say(r.status === 404 ? 'We could not find that report.' : 'Something went wrong. Please try again shortly.');
      return r.json().then(function (j) {
        if (!j.reports.length) return say('You have no released reports yet. Your coach reviews each report before it appears here.');
        if (id || j.reports.length === 1) return render(j.reports[0].report);
        clear();
        app.appendChild(el('h2', null, 'Your reports'));
        j.reports.forEach(function (x) {
          var a = el('a', 'btn btn-ghost', x.report.title + ' · ' + new Date(x.released_at).toLocaleDateString());
          a.href = '?id=' + encodeURIComponent(x.id);
          app.appendChild(a);
        });
      });
    }, function () { say('Could not reach the report service. Please try again shortly.'); });
  }

  if (statusEl && !ready()) { say('Interview reports are not available yet. We will email you when yours is ready.'); return; }
  if (ready()) signInForm();
})();
