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
    say('Loading your account…');
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
      show(res[0], res[1], res[2], passRes);
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
  var ICONS = {
    interview: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
    maths: 'M5 4h14v16H5zM8 8h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0',
    reports: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
    coach: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M21 19a5 5 0 0 0-4-4.9',
    unlimited: 'M7 8a4 4 0 1 0 0 8c4 0 6-8 10-8a4 4 0 1 1 0 8c-4 0-6-8-10-8z'
  };
  function icon(name) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONS[name]); s.appendChild(p);
    return s;
  }

  // One product tile. o: {icon, title, text, note, pill, pillCls, cta:{text,href}, manage:fn, owned}
  function tile(o) {
    var t = el('div', 'mm-tile' + (o.owned ? ' owned' : ' explore'));
    var top = el('div', 'mm-tile-top');
    var ic = el('span', 'mm-icon'); ic.appendChild(icon(o.icon)); top.appendChild(ic);
    if (o.pill) top.appendChild(el('span', 'badge ' + (o.pillCls || ''), o.pill));
    t.appendChild(top);
    t.appendChild(el('h3', null, o.title));
    if (o.text) t.appendChild(el('p', 'mm-text', o.text));
    if (o.note) t.appendChild(el('p', 'mm-note', o.note));
    var foot = el('div', 'mm-foot');
    if (o.cta) foot.appendChild(link(o.cta.text, o.cta.href, o.owned ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'));
    if (o.owned) {
      // Same row, same size, in every owned tile; an empty row where there is no subscription keeps the buttons level
      var mrow = el('div', 'mm-mrow');
      if (o.manage) {
        var m = el('button', 'mm-manage', 'Manage subscription'); m.type = 'button';
        m.addEventListener('click', function () { o.manage(m); });
        mrow.appendChild(m);
      }
      foot.appendChild(mrow);
    }
    t.appendChild(foot);
    return t;
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
    var grid = el('div', 'mm-grid');
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
      l.textContent = 'Sign in once to see your maths drills, your AI case interviews and your reports, and to manage your subscription.';
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
    top.appendChild(out);
    app.appendChild(top);

    var mine = [], more = [], notes = [];
    var failed = function (what) { notes.push('We could not load ' + what + ' just now. Refresh in a minute.'); };

    // Unlimited interviews
    var passOn = !!(pass && pass.ok && pass.data && pass.data.active);
    if (pass && pass.error) failed('your Unlimited interviews');
    else if (passOn) {
      mine.push(tile({ owned: true, icon: 'unlimited', title: 'Unlimited interviews', pill: 'Active', pillCls: 'good',
        text: 'Practise as much as you need, up to ' + pass.data.dailyLimit + ' interviews a day.', note: renewal(pass.data),
        cta: { text: 'Start an interview', href: START }, manage: portal('/functions/v1/pass-access') }));
    } else {
      more.push(tile({ icon: 'unlimited', title: 'Unlimited interviews', text: 'One subscription for Case, Fit and Full Mock interviews, with Math Drills included.', cta: { text: 'See the options', href: START } }));
    }

    // Case interviews (single credits)
    var credits = bal.ok && bal.data ? bal.data.credits : null;
    var list = rep.ok && rep.data ? (rep.data.reports || []) : null;
    if (credits === null && list === null) failed('your interviews');
    if (credits > 0 && !passOn) {
      mine.push(tile({ owned: true, icon: 'interview', title: 'AI case interviews', pill: credits + ' ready', pillCls: 'good',
        text: 'You have ' + credits + ' practice interview' + (credits === 1 ? '' : 's') + ' ready to use.',
        cta: { text: 'Start a practice interview', href: START } }));
    } else if (!passOn && credits !== null) {
      more.push(tile({ icon: 'interview', title: 'AI case interviews', text: 'Practise a real case with an AI interviewer and get a scored report.', cta: { text: 'Practise a case', href: START } }));
    }

    // Maths drills
    if (!maths.off) {
      var mOn = !!(maths.ok && maths.data && maths.data.active);
      if (maths.error) failed('your maths drills');
      else if (mOn) {
        var pr = mathsProgress();
        mine.push(tile({ owned: true, icon: 'maths', title: 'Maths drills', pill: 'Active', pillCls: 'good',
          text: pr ? pr.n + ' questions answered, ' + pr.pct + '% correct.' : 'Timed case-maths questions with worked solutions.', note: renewal(maths.data),
          cta: { text: 'Open the drills', href: MATHS_URL }, manage: portal('/functions/v1/maths-access') }));
      } else {
        more.push(tile({ icon: 'maths', title: 'Maths drills', text: 'Timed case-maths questions with worked solutions and a progress report.', cta: { text: 'See the maths drills', href: MATHS_URL } }));
      }
    }

    // Reports
    if (list && list.length) {
      mine.push(tile({ owned: true, icon: 'reports', title: 'Your reports', pill: list.length + (list.length === 1 ? ' report' : ' reports'),
        text: 'Every practice interview you have taken, ready to read again.', cta: { text: 'See my reports', href: REPORTS } }));
    }

    // Coaching, always something to explore
    more.push(tile({ icon: 'coach', title: 'Coaching with a Mada coach', text: 'Work 1:1 with a consultant on your applications, cases and offers.', cta: { text: 'See coaching options', href: BOOK } }));

    if (mine.length) app.appendChild(group('Your products', mine));
    else {
      var empty = el('div', 'mm-empty');
      empty.appendChild(el('h2', null, 'Nothing active yet.'));
      empty.appendChild(el('p', 'muted', 'Start with any of the options below. Your products and reports will show up here.'));
      app.appendChild(empty);
    }
    notes.forEach(function (n) { app.appendChild(el('p', 'muted mm-err', n)); });
    app.appendChild(group(mine.length ? 'Explore more' : 'Explore', more));
  }

  if (!ready()) { say('My Mada is not available yet.'); return; }
  S.restore(API, KEY).then(function (saved) {
    if (saved) { token = saved.token; email = saved.email; load(); } else signInForm();
  });
})();
