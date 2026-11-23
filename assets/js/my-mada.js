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
  var BOOK = app.getAttribute('data-book') || '../../expert/';
  var S = window.MadaSession;
  var UI = window.MadaUI;
  var token = null, email = '';

  // The product catalog (names, text, icons, status, links, CTA labels, prices) is written once, in the build, from the site config.
  // Every tile on this page, owned or in Explore more, reads from it; nothing about a product is typed again below.
  var CAT = {};
  try { JSON.parse(app.getAttribute('data-catalog') || '[]').forEach(function (p) { CAT[p.id] = p; }); } catch (e) {}
  function P(id) { return CAT[id] || { id: id, name: id, text: '', icon: '', status: 'soon', href: '', cta: '', price: '' }; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function say(msg) { clear(); app.appendChild(el('p', 'muted', msg)); }
  function spin(msg) {
    clear();
    var box = el('div', 'mada-loader'); box.setAttribute('role', 'status');
    var ring = el('div', 'mada-loader-ring'); ring.setAttribute('aria-hidden', 'true');
    box.appendChild(ring); box.appendChild(el('p', 'muted', msg));
    app.appendChild(box);
  }
  function loadFailed() {
    clear();
    var box = el('div', 'mada-loader'); box.setAttribute('role', 'alert');
    box.appendChild(el('h2', null, 'That took longer than expected'));
    box.appendChild(el('p', 'muted', 'We could not load your account. Check your connection and try again.'));
    var b = el('button', 'btn btn-primary', 'Try again'); b.type = 'button'; b.addEventListener('click', load);
    box.appendChild(b); app.appendChild(box);
  }
  function ready() { return API && KEY && API.indexOf('https://') === 0 && S; }
  function post(path, body, bearer) {
    var h = { 'content-type': 'application/json', apikey: KEY };
    if (bearer) h.authorization = 'Bearer ' + bearer;
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
    var req = fetch(API.replace(/\/+$/, '') + path, { method: 'POST', headers: h, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
    if (t) req.then(function () { clearTimeout(t); }, function () { clearTimeout(t); });
    return req;
  }
  function link(text, href, cls) { var a = el('a', cls || 'btn btn-ghost btn-sm', text); a.href = href; return a; }
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
  function stripeUrl(u) { try { var x = new URL(u); return x.protocol === 'https:' && /(^|\.)stripe\.com$/.test(x.hostname) ? x.href : ''; } catch (e) { return ''; } }

  // ---------------------------------------------------------------- sign in (existing accounts only, same as My reports)
  function signInForm(msg) {
    clear(); hero(false);
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
    spin('Loading your account…');
    Promise.all([
      MATHS_ON ? call('/functions/v1/maths-access', { action: 'status' }) : Promise.resolve({ off: true }),
      call('/functions/v1/interview-checkout', { action: 'balance' }),
      call('/functions/v1/interview-report', {}),
      MATHS_ON ? call('/functions/v1/maths-progress', { action: 'get' }) : Promise.resolve({ off: true }),
      call('/functions/v1/pass-access', { action: 'status' })
    ]).then(function (res) {
      if (res[3] && res[3].ok && res[3].data && Array.isArray(res[3].data.attempts)) serverAttempts = res[3].data.attempts;
      var passRes = res[4];
      res = res.slice(0, 3);
      if (res.some(function (x) { return x.unauthorised; })) {
        return S.recover(API, KEY).then(function (ok) {
          if (ok) { location.reload(); return; }
          S.clear(); token = null; signInForm('Your session expired. Sign in again.');
        });
      }
      try { show(res[0], res[1], res[2], passRes); } catch (e) { loadFailed(); }
    }, loadFailed);
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
  // One product tile, built from its catalog entry p with the shared card. o (all optional) is what only this account knows:
  // {owned, text, note, pill, pillCls, cta:{text,href}, manage:fn}. Anything not given here comes from the catalog.
  function tile(p, o) {
    o = o || {};
    var owned = !!o.owned, soon = p.status !== 'live';
    var cta = o.cta || (!soon && p.href && p.cta ? { text: p.cta, href: p.href } : null);
    var foot = null;
    if (cta || owned) {
      foot = el('div', 'mm-foot');
      if (!owned && !soon && p.price) foot.appendChild(el('p', 'mm-price', p.price));
      if (cta) foot.appendChild(link(cta.text, cta.href, owned ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'));
      if (owned) {
        // Same row, same size, in every owned tile; an empty row where there is no subscription keeps the buttons level
        var mrow = el('div', 'mm-mrow');
        if (o.manage) {
          var m = el('button', 'mm-manage', 'Manage subscription'); m.type = 'button';
          m.addEventListener('click', function () { o.manage(m); });
          mrow.appendChild(m);
        }
        foot.appendChild(mrow);
      }
    }
    return UI.card({
      cls: 'mm-tile ' + (owned ? 'owned' : 'explore'), icon: p.icon, title: p.name,
      text: o.text !== undefined ? o.text : p.text, note: o.note,
      badge: o.pill || (soon ? 'Coming soon' : ''), badgeCls: o.pill ? (o.pillCls || '') : (soon ? 'soon' : ''), foot: foot
    });
  }
  function portal(fn) {
    return function (btn) {
      btn.disabled = true;
      call(fn, { action: 'portal' }).then(function (r) {
        var u = r.ok && stripeUrl(r.data && r.data.url);
        if (u) { location.href = u; return; }
        btn.disabled = false; window.alert('Could not open the billing page. Try again shortly, or email hello@mada-coaching.com.');
      });
    };
  }
  function renewal(d) { return d && d.renewsOn ? (d.cancelsAtPeriodEnd ? 'Ends on ' : 'Renews on ') + fmtDate(d.renewsOn) + '.' : ''; }
  function group(label, tiles) {
    var g = el('div', 'mm-group');
    g.appendChild(el('h2', 'mm-label', label));
    var grid = el('div', 'm-grid mm-grid');
    tiles.forEach(function (t) { grid.appendChild(t); });
    g.appendChild(grid);
    return g;
  }

  function hero(signedIn) {
    var t = document.getElementById('mm-title'), l = document.getElementById('mm-lede'), h = document.getElementById('mm-hero');
    if (!t || !l) return;
    if (signedIn) {
      t.textContent = 'Welcome back.';
      l.textContent = 'Pick up where you left off, or explore what else Mada can do for you.';
      if (h) h.classList.add('mm-compact');
    } else {
      t.textContent = 'Everything you have with Mada, in one place.';
      l.textContent = 'Sign in once to see your Case Math Mastery, your Case Interviews and your reports, and to manage your subscription.';
      if (h) h.classList.remove('mm-compact');
    }
    l.hidden = false;
    var w = app.parentNode; if (w) w.classList[signedIn ? 'add' : 'remove']('mm-wide');
    var sec = app.closest ? app.closest('section') : null; if (sec) sec.classList[signedIn ? 'add' : 'remove']('mm-sec');
  }

  function show(maths, bal, rep, pass) {
    clear(); hero(true);
    var top = el('div', 'acct-top mm-top');
    top.appendChild(el('span', 'muted', 'Signed in as ' + email));
    var out = el('button', 'mm-manage', 'Sign out'); out.type = 'button';
    out.addEventListener('click', function () { S.clear(); token = null; signInForm(); });
    var actions = el('span', 'mm-actions'); actions.appendChild(out);
    top.appendChild(actions);
    app.appendChild(top);

    var mine = [], more = [], notes = [];
    var failed = function (what) { notes.push('We could not load ' + what + ' just now. Refresh in a minute.'); };

    var ex = {};   // Explore more tiles by catalog id; the order they appear in is set once, below

    // Practice Pass
    var passOn = !!(pass && pass.ok && pass.data && pass.data.active);
    if (pass && pass.error) failed('your Practice Pass');
    else if (passOn) {
      mine.push(tile(P('pass'), { owned: true, pill: 'Active', pillCls: 'good',
        text: 'Up to ' + pass.data.dailyLimit + ' interviews a day. Quality beats quantity, so space your sessions out and reflect on each report.', note: renewal(pass.data) + (typeof pass.data.minutesUsed === 'number' && pass.data.monthlyMinutes ? (renewal(pass.data) ? ' \u00b7 ' : '') + pass.data.minutesUsed + ' of ' + pass.data.monthlyMinutes + ' interview minutes used in the last ' + pass.data.monthlyWindowDays + ' days' : ''),
        cta: { text: 'Start an interview', href: START }, manage: portal('/functions/v1/pass-access') }));
    } else {
      ex.pass = tile(P('pass'));
    }

    // Case Interviews (single credits)
    var credits = bal.ok && bal.data ? bal.data.credits : null;
    var list = rep.ok && rep.data ? (rep.data.reports || []) : null;
    if (credits === null && list === null) failed('your interviews');
    if (credits > 0 && !passOn) {
      mine.push(tile(P('case'), { owned: true, pill: credits + ' ready', pillCls: 'good',
        text: 'You have ' + credits + ' practice interview' + (credits === 1 ? '' : 's') + ' ready to use.',
        cta: { text: 'Start a practice interview', href: START } }));
    } else if (!passOn && credits !== null && bal.data && bal.data.free_first) {
      mine.push(tile(P('case'), { owned: true, pill: 'First one free', pillCls: 'good',
        text: 'Your first AI case interview is free. Choose an interviewer and a case, speak for about 25 minutes and get a scored report.',
        cta: { text: 'Start your free interview', href: START } }));
    } else if (!passOn && credits !== null) {
      ex.case = tile(P('case'));
    }

    // Case Math Mastery
    if (!maths.off) {
      var mOn = !!(maths.ok && maths.data && maths.data.active);
      if (maths.error) failed('your Case Math Mastery');
      else if (mOn) {
        var pr = mathsProgress();
        mine.push(tile(P('maths'), { owned: true, pill: 'Active', pillCls: 'good',
          text: pr ? pr.n + ' questions answered, ' + pr.pct + '% correct.' : undefined, note: renewal(maths.data),
          cta: { text: 'Open Case Math Mastery', href: MATHS_URL }, manage: portal('/functions/v1/maths-access') }));
      } else {
        ex.maths = tile(P('maths'));
      }
    }

    // Reports
    if (list && list.length) {
      mine.push(tile({ id: 'reports', name: 'Your reports', icon: 'reports', status: 'live' }, { owned: true, pill: list.length + (list.length === 1 ? ' report' : ' reports'),
        text: 'Every practice interview you have taken, ready to read again.', cta: { text: 'See my reports', href: REPORTS } }));
    }

    // The rest of the catalog: always something to explore. Coming-soon products are shown so the road ahead is visible.
    ['readiness', 'academy', 'coach', 'fit', 'cv'].forEach(function (id) { ex[id] = tile(P(id)); });
    ['pass', 'readiness', 'academy', 'case', 'maths', 'coach', 'fit', 'cv'].forEach(function (id) { if (ex[id]) more.push(ex[id]); });

    if (mine.length) app.appendChild(group('Your products', mine));
    else {
      var empty = el('div', 'mm-empty');
      empty.appendChild(el('h2', null, 'Nothing active yet.'));
      empty.appendChild(el('p', 'muted', 'Start with any of the options below. Your products and reports will show up here.'));
      app.appendChild(empty);
    }
    notes.forEach(function (n) { app.appendChild(el('p', 'muted mm-err', n)); });
    app.appendChild(group(mine.length ? 'Explore more' : 'Explore', more));
    if (window.MadaProfile) {
      var pfHost = el('div', 'pf-host');
      app.insertBefore(pfHost, top.nextSibling);   // the first-time card sits right under "Signed in as"
      window.MadaProfile.mount({ api: API, key: KEY, email: email, token: function () { return token; }, bar: out, prompt: pfHost,
        expired: function () { return S.recover(API, KEY).then(function (ok) { if (ok) { location.reload(); return; } S.clear(); token = null; signInForm('Your session expired. Sign in again.'); }); } });
    }
  }

  if (!ready()) { say('My Mada is not available yet.'); return; }
  S.restore(API, KEY).then(function (saved) {
    if (saved) { token = saved.token; email = saved.email; load(); } else signInForm();
  });
})();
