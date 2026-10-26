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
  var S = window.MadaSession;
  var token = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function say(msg) { clear(); app.appendChild(el('p', 'muted', msg)); }

  function render(r) { window.MadaReport.render(r, app); }

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
      }).then(function (j) { token = j.access_token; if (S) S.save(token, email, j.refresh_token, j.expires_in); load(); }, function () { signInForm('That code did not work. Request a new one.'); });
    });
    app.appendChild(form);
  }

  function load() {
    say('Loading your report…');
    var id = new URLSearchParams(location.search).get('id');
    post('/functions/v1/interview-report', id ? { id: id } : {}, token).then(function (r) {
      if (r.status === 401) { token = null; if (!S) return signInForm('Your session expired. Sign in again.'); return S.recover(API, KEY).then(function (ok) { if (ok) { location.reload(); return; } S.clear(); signInForm('Your session expired. Sign in again.'); }); }
      if (r.status === 404 && id) return coachView(id);
      if (!r.ok) return say(r.status === 404 ? 'We could not find that report.' : 'Something went wrong. Please try again shortly.');
      return r.json().then(function (j) {
        // Not this account's report: a Mada coach may still open it (interview-admin allows coaches only).
        if (id && !j.reports.length) return coachView(id);
        if (!j.reports.length) return say('You have no reports yet. Reports appear here after your call; a few are checked by a Mada coach first.');
        if (!id) { location.replace('../reports/'); return; }
        render(j.reports[0].report);
        var back = el('p', null);
        var a = el('a', 'btn btn-ghost', 'All my reports'); a.href = '../reports/';
        back.appendChild(a);
        app.appendChild(back);
      });
    }, function () { say('Could not reach the report service. Please try again shortly.'); });
  }

  // Coach view: a signed-in coach opens any candidate's report by id, whatever its status. Anyone else
  // gets the same "not found" a missing report gets.
  function coachView(id) {
    return post('/functions/v1/interview-admin', { action: 'get', id: id }, token).then(function (r) {
      if (!r.ok) return say('We could not find that report.');
      return r.json().then(function (row) {
        if (!row || !row.public_report) return say('We could not find that report.');
        render(row.public_report);
        var note = el('p', 'muted', 'Coach view. Status: ' + (row.status || 'unknown') + (row.hold_reason ? ' (' + row.hold_reason + ')' : '') + '. This is not the signed-in account\u2019s own report.');
        app.insertBefore(note, app.firstChild);
      });
    }, function () { say('Could not reach the report service. Please try again shortly.'); });
  }

  if (statusEl && !ready()) { say('Interview reports are not available yet. We will email you when yours is ready.'); return; }
  if (ready()) {
    (S ? S.restore(API, KEY) : Promise.resolve(null)).then(function (saved) {
      if (saved) { token = saved.token; load(); } else signInForm();
    });
  }
})();
