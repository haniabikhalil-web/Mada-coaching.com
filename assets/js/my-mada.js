// Mada AI "My Mada": one sign-in, and everything the candidate has in one place: the maths drills subscription and progress,
// AI case interview credits and reports. Reads only from existing endpoints; every string is written with textContent.
(function () {
  var app = document.getElementById('account-app');
  if (!app) return;
  var API = app.getAttribute('data-api');
  var KEY = app.getAttribute('data-key');
  var MATHS_ON = app.getAttribute('data-maths') === '1';
  var MATHS_URL = app.getAttribute('data-maths-url') || '../maths/';
  var START = app.getAttribute('data-start') || '../case-practice/start/';
  var REPORTS = app.getAttribute('data-reports') || '../reports/';
  var BOOK = app.getAttribute('data-book') || '../../services/';
  var S = window.MadaSession;
  var token = null, email = '';

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
  function link(text, href, cls) { var a = el('a', cls || 'btn btn-ghost btn-sm', text); a.href = href; return a; }
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
  function stripeUrl(u) { try { var x = new URL(u); return x.protocol === 'https:' && /(^|\.)stripe\.com$/.test(x.hostname) ? x.href : ''; } catch (e) { return ''; } }

  // ---------------------------------------------------------------- sign in (existing accounts only, same as My reports)
  function signInForm(msg) {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Sign in to My Mada'));
    form.appendChild(el('p', 'muted', msg || 'Enter the email you use with Mada. We will email you a one-time code.'));
    var input = el('input'); input.type = 'email'; input.required = true; input.autocomplete = 'email'; input.placeholder = 'you@example.com';
    input.setAttribute('aria-label', 'Email address');
    var btn = el('button', 'btn btn-primary', 'Email me a code'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); btn.disabled = true; email = input.value.trim();
      post('/auth/v1/otp', { email: email, create_user: false }).then(function () { codeForm(); },
        function () { signInForm('Could not reach the sign-in service. Try again.'); });
    });
    app.appendChild(form);
  }
  function codeForm() {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Enter your code'));
    form.appendChild(el('p', 'muted', 'If that email has a Mada account, a code is on its way. It can take a minute.'));
    var input = el('input'); input.type = 'text'; input.inputMode = 'numeric'; input.required = true; input.autocomplete = 'one-time-code';
    input.setAttribute('aria-label', 'One-time code');
    var btn = el('button', 'btn btn-primary', 'Open My Mada'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); btn.disabled = true;
      post('/auth/v1/verify', { type: 'email', email: email, token: input.value.trim() }).then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      }).then(function (j) { token = j.access_token; S.save(token, email, j.refresh_token, j.expires_in); load(); },
        function () { signInForm('That code did not work. Request a new one.'); });
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- data
  function call(path, body) {
    return post(path, body, token).then(function (r) {
      if (r.status === 401) return { unauthorised: true };
      if (!r.ok) return { error: true };
      return r.json().then(function (j) { return { ok: true, data: j }; }, function () { return { error: true }; });
    }, function () { return { error: true }; });
  }
  function load() {
    say('Loading your account…');
    Promise.all([
      MATHS_ON ? call('/functions/v1/maths-access', { action: 'status' }) : Promise.resolve({ off: true }),
      call('/functions/v1/interview-checkout', { action: 'balance' }),
      call('/functions/v1/interview-report', {}),
      MATHS_ON ? call('/functions/v1/maths-progress', { action: 'get' }) : Promise.resolve({ off: true })
    ]).then(function (res) {
      if (res[3] && res[3].ok && res[3].data && Array.isArray(res[3].data.attempts)) serverAttempts = res[3].data.attempts;
      res = res.slice(0, 3);
      if (res.some(function (x) { return x.unauthorised; })) {
        return S.recover(API, KEY).then(function (ok) {
          if (ok) { location.reload(); return; }
          S.clear(); token = null; signInForm('Your session expired. Sign in again.');
        });
      }
      show(res[0], res[1], res[2]);
    });
  }

  // Local maths progress (kept by the drills page in this browser, per email)
  var serverAttempts = null;
  function mathsProgress() {
    if (serverAttempts && serverAttempts.length) {
      var oks = serverAttempts.filter(function (r) { return r.ok; }).length;
      return { n: serverAttempts.length, pct: Math.round(100 * oks / serverAttempts.length) };
    }
    try {
      var a = JSON.parse(localStorage.getItem('mada_maths_attempts:' + String(email).toLowerCase()) || '[]');
      if (!Array.isArray(a) || !a.length) return null;
      var ok = a.filter(function (r) { return r.ok; }).length;
      return { n: a.length, pct: Math.round(100 * ok / a.length) };
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- page
  function section(title, badgeText, badgeCls) {
    var c = el('div', 'card acct-card');
    var head = el('div', 'acct-head');
    head.appendChild(el('h3', null, title));
    if (badgeText) head.appendChild(el('span', 'badge ' + (badgeCls || ''), badgeText));
    c.appendChild(head);
    return c;
  }
  function row(children) { var d = el('div', 'acct-actions'); children.forEach(function (c) { d.appendChild(c); }); return d; }

  function mathsCard(m) {
    if (m.off) return null;
    var active = m.ok && m.data && m.data.active;
    var c = section('Maths drills', m.error ? '' : active ? 'Active' : 'Not subscribed', active ? 'good' : '');
    if (m.error) { c.appendChild(el('p', 'muted', 'We could not load this just now. Refresh in a minute.')); return c; }
    if (active) {
      var d = m.data;
      c.appendChild(el('p', null, d.renewsOn ? (d.cancelsAtPeriodEnd ? 'Your access ends on ' : 'Renews on ') + fmtDate(d.renewsOn) + '.' : 'Your subscription is active.'));
      var p = mathsProgress();
      if (p) c.appendChild(el('p', 'muted', p.n + ' questions answered, ' + p.pct + '% correct. Your full report is on the drills page.'));
      var manage = el('button', 'btn btn-ghost btn-sm', 'Manage subscription'); manage.type = 'button';
      manage.addEventListener('click', function () {
        manage.disabled = true;
        call('/functions/v1/maths-access', { action: 'portal' }).then(function (r) {
          var u = r.ok && stripeUrl(r.data && r.data.url);
          if (u) { location.href = u; return; }
          manage.disabled = false; window.alert('Could not open the billing page. Try again shortly, or email hello@mada-coaching.com.');
        });
      });
      c.appendChild(row([link('Open the drills', MATHS_URL, 'btn btn-primary btn-sm'), manage]));
    } else {
      c.appendChild(el('p', 'muted', 'Timed case-maths questions with worked solutions and a progress report.'));
      c.appendChild(row([link('See the maths drills', MATHS_URL, 'btn btn-primary btn-sm')]));
    }
    return c;
  }

  function casesCard(bal, rep) {
    var credits = bal.ok && bal.data ? bal.data.credits : null;
    var list = rep.ok && rep.data ? (rep.data.reports || []) : null;
    var c = section('AI case interviews', credits > 0 ? 'Call ready' : '', credits > 0 ? 'good' : '');
    if (credits === null && list === null) { c.appendChild(el('p', 'muted', 'We could not load this just now. Refresh in a minute.')); return c; }
    if (credits !== null) c.appendChild(el('p', null, credits > 0 ? 'You have ' + credits + ' practice interview' + (credits === 1 ? '' : 's') + ' ready to use.' : 'No practice interview ready. You can buy one when you want to practise.'));
    if (list !== null) {
      c.appendChild(el('p', 'muted', list.length ? list.length + (list.length === 1 ? ' report' : ' reports') + ' so far.' : 'Your reports will appear here after each call.'));
    }
    var acts = [link(credits > 0 ? 'Start a practice interview' : 'Practise a case', START, 'btn btn-primary btn-sm')];
    if (list && list.length) acts.push(link('See my reports', REPORTS));
    c.appendChild(row(acts));
    return c;
  }

  function show(maths, bal, rep) {
    clear();
    var top = el('div', 'acct-top');
    top.appendChild(el('span', 'muted', 'Signed in as ' + email));
    var out = el('button', 'btn btn-ghost btn-sm', 'Sign out'); out.type = 'button';
    out.addEventListener('click', function () { S.clear(); token = null; signInForm(); });
    top.appendChild(out);
    app.appendChild(top);
    var m = mathsCard(maths);
    if (m) app.appendChild(m);
    app.appendChild(casesCard(bal, rep));
    var coach = section('Coaching with a Mada coach');
    coach.appendChild(el('p', 'muted', 'Work 1:1 with a consultant on your applications, cases and offers.'));
    coach.appendChild(row([link('See coaching options', BOOK)]));
    app.appendChild(coach);
  }

  if (!ready()) { say('My Mada is not available yet.'); return; }
  S.restore(API, KEY).then(function (saved) {
    if (saved) { token = saved.token; email = saved.email; load(); } else signInForm();
  });
})();
