// Mada AI "My reports": every released interview report for the signed-in candidate, newest first.
// Signs in with an emailed one-time code (existing accounts only) unless this browser already has a fresh sign-in.
// The interview-report function returns only this candidate's own released, candidate-safe reports.
// Every string from the server is written with textContent, never innerHTML.
(function () {
  var app = document.getElementById('reports-app');
  if (!app) return;
  var API = app.getAttribute('data-api');
  var KEY = app.getAttribute('data-key');
  var START = app.getAttribute('data-start') || '../case-practice/';
  var S = window.MadaSession;
  var token = null;
  var email = '';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function say(msg) { clear(); app.appendChild(el('p', 'muted', msg)); }
  function ready() { return API && KEY && API.indexOf('https://') === 0 && S; }
  function post(path, body, bearer) {
    var h = { 'content-type': 'application/json', apikey: KEY };
    if (bearer) h.authorization = 'Bearer ' + bearer;
    return fetch(API.replace(/\/+$/, '') + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  }

  function signInForm(msg) {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Sign in to see your reports'));
    form.appendChild(el('p', 'muted', msg || 'Enter the email you used with Mada. We will email you a one-time code.'));
    var input = el('input'); input.type = 'email'; input.required = true; input.autocomplete = 'email'; input.placeholder = 'you@example.com';
    input.setAttribute('aria-label', 'Email address');
    var btn = el('button', 'btn btn-primary', 'Email me a code'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      email = input.value.trim();
      // create_user:false = existing accounts only; no one can self-register from this page.
      post('/auth/v1/otp', { email: email, create_user: false }).then(function () { codeForm(); },
        function () { signInForm('Could not reach the sign-in service. Try again.'); });
    });
    app.appendChild(form);
  }

  function codeForm() {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Enter your code'));
    form.appendChild(el('p', 'muted', 'If that email has a Mada account, a code is on its way.'));
    var input = el('input'); input.type = 'text'; input.inputMode = 'numeric'; input.required = true; input.autocomplete = 'one-time-code';
    input.setAttribute('aria-label', 'One-time code');
    var btn = el('button', 'btn btn-primary', 'Show my reports'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      post('/auth/v1/verify', { type: 'email', email: email, token: input.value.trim() }).then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      }).then(function (j) { token = j.access_token; S.save(token, email, j.refresh_token, j.expires_in); load(); },
        function () { signInForm('That code did not work. Request a new one.'); });
    });
    app.appendChild(form);
  }

  function caseName(title) { return String(title || 'Case interview').replace(/^Case interview report:\s*/i, ''); }
  function when(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function card(x) {
    var r = x.report || {};
    var a = el('a', 'card rp-item');
    a.href = '../report/?id=' + encodeURIComponent(x.id);
    var head = el('div', 'rp-item-head');
    var left = el('div');
    left.appendChild(el('span', 'tag', when(x.released_at)));
    left.appendChild(el('h3', null, caseName(r.title)));
    head.appendChild(left);
    head.appendChild(el('div', 'rp-item-score', r.overall === null || r.overall === undefined ? 'Not scored' : r.overall.toFixed(1) + ' / 5'));
    a.appendChild(head);
    var comps = (r.competencies || []).filter(function (c) { return c.score !== null && c.score !== undefined; });
    if (comps.length) {
      var row = el('div', 'rp-chips');
      comps.forEach(function (c) { row.appendChild(el('span', 'rp-chip', c.label + ' ' + c.score + '/5')); });
      a.appendChild(row);
    }
    a.appendChild(el('span', 'rp-item-open', 'Open report'));
    return a;
  }

  function show(list) {
    clear();
    if (!list.length) {
      var empty = el('div', 'card');
      empty.appendChild(el('h3', null, 'No reports yet'));
      empty.appendChild(el('p', null, 'Your reports appear here after each call. Some are checked by a Mada coach first, so a report can take a little longer.'));
      var go = el('a', 'btn btn-primary', 'Start AI case practice'); go.href = START;
      empty.appendChild(go);
      app.appendChild(empty);
      return;
    }
    app.appendChild(el('p', 'muted', list.length + (list.length === 1 ? ' report' : ' reports') + ' for ' + (email || 'your account') + ', newest first.'));
    var wrap = el('div', 'rp-list');
    list.forEach(function (x) { wrap.appendChild(card(x)); });
    app.appendChild(wrap);
    var foot = el('p', null);
    var again = el('a', 'btn btn-ghost', 'Practise another case'); again.href = START;
    foot.appendChild(again);
    app.appendChild(foot);
    var out = el('button', 'btn btn-ghost', 'Sign out'); out.type = 'button';
    out.addEventListener('click', function () { S.clear(); token = null; signInForm(); });
    app.appendChild(out);
  }

  function load() {
    say('Loading your reports…');
    post('/functions/v1/interview-report', {}, token).then(function (r) {
      if (r.status === 401) return S.recover(API, KEY).then(function (ok) { if (ok) { location.reload(); return; } S.clear(); token = null; signInForm('Your session expired. Sign in again.'); });
      if (!r.ok) return say('Something went wrong. Please try again shortly.');
      return r.json().then(function (j) { show(j.reports || []); });
    }, function () { say('Could not reach the report service. Please try again shortly.'); });
  }

  if (!ready()) { say('Reports are not available yet.'); return; }
  S.restore(API, KEY).then(function (saved) {
    if (saved) { token = saved.token; email = saved.email; load(); } else signInForm();
  });
})();
