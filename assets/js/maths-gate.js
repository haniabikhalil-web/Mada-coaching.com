// Mada AI maths drills: sign-in and subscription gate. Runs only when the page is gated (data-gated="1").
// 1. Email code sign-in (Supabase Auth, same as the call page). A new email creates an account.
// 2. The maths-access function says whether this account has an active subscription. The server decides; this file only asks.
// 3. Active: the drills start. Not active: a short paywall that opens Stripe Checkout. Subscribers manage or cancel in Stripe's portal.
// Every string is written with textContent, never innerHTML.
(function () {
  var app = document.getElementById('maths-app');
  if (!app || app.getAttribute('data-gated') !== '1') return;
  var bar = document.getElementById('maths-account');
  var API = app.getAttribute('data-api');
  var KEY = app.getAttribute('data-key');
  var TERMS = app.getAttribute('data-terms') || '../../terms/';
  var REFUNDS = app.getAttribute('data-refunds') || '../../refunds/';
  var PRICE = app.getAttribute('data-price') || '20';
  var S = window.MadaSession;
  var token = null;
  var email = '';
  var q = new URLSearchParams(location.search);
  var started = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function say(msg) { clear(app); if (bar) clear(bar); app.appendChild(el('p', 'muted', msg)); }
  function ready() { return API && KEY && API.indexOf('https://') === 0 && S && typeof window.MadaMathsStart === 'function'; }
  function post(path, body, bearer) {
    var h = { 'content-type': 'application/json', apikey: KEY };
    if (bearer) h.authorization = 'Bearer ' + bearer;
    return fetch(API.replace(/\/+$/, '') + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  }
  function access(action) { return post('/functions/v1/maths-access', { action: action }, token); }
  function expired(msg) { S.clear(); token = null; if (bar) clear(bar); signInForm(msg || 'Your session expired. Sign in again.'); }
  function stripeUrl(u) {
    try { var x = new URL(u); return x.protocol === 'https:' && /(^|\.)stripe\.com$/.test(x.hostname) ? x.href : null; } catch (e) { return null; }
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---------------------------------------------------------------- sign-in
  function signInForm(msg) {
    clear(app);
    var form = el('form', 'rp-form card mx-card');
    form.appendChild(el('h3', null, 'Sign in to the maths drills'));
    form.appendChild(el('p', 'muted', msg || 'Enter your email and we will send you a one-time code. New here? The same step creates your account.'));
    var input = el('input'); input.type = 'email'; input.required = true; input.autocomplete = 'email'; input.placeholder = 'you@example.com';
    input.setAttribute('aria-label', 'Email address');
    var btn = el('button', 'btn btn-primary', 'Email me a code'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      email = input.value.trim();
      post('/auth/v1/otp', { email: email, create_user: true }).then(function (r) {
        if (r.status === 429) { signInForm('Please wait a minute before asking for another code, then try again.'); return; }
        if (!r.ok) { signInForm('Could not send a code. Check the email address and try again.'); return; }
        codeForm();
      }, function () { signInForm('Could not reach the sign-in service. Try again.'); });
    });
    app.appendChild(form);
  }

  function codeForm() {
    clear(app);
    var form = el('form', 'rp-form card mx-card');
    form.appendChild(el('h3', null, 'Enter your code'));
    form.appendChild(el('p', 'muted', 'We emailed a code to ' + email + '. It can take a minute to arrive.'));
    var input = el('input'); input.type = 'text'; input.inputMode = 'numeric'; input.required = true; input.autocomplete = 'one-time-code';
    input.setAttribute('aria-label', 'One-time code');
    var btn = el('button', 'btn btn-primary', 'Continue'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      post('/auth/v1/verify', { type: 'email', email: email, token: input.value.trim() }).then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      }).then(function (j) { token = j.access_token; S.save(token, email); check(q.get('paid') === '1' ? 12 : 0); },
        function () { signInForm('That code did not work. Request a new one.'); });
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- account bar (subscribers)
  function accountBar(st) {
    if (!bar) return;
    clear(bar);
    var wrap = el('div', 'mx-account');
    var line = 'Signed in as ' + email;
    if (st.renewsOn) line += (st.cancelsAtPeriodEnd ? ' · access ends ' : ' · renews ') + fmtDate(st.renewsOn);
    wrap.appendChild(el('span', 'muted small', line));
    var manage = el('button', 'btn btn-ghost btn-sm', 'Manage subscription'); manage.type = 'button';
    manage.addEventListener('click', function () { openPortal(manage); });
    var out = el('button', 'btn btn-ghost btn-sm', 'Sign out'); out.type = 'button';
    out.addEventListener('click', function () { S.clear(); token = null; if (started) { location.href = location.pathname; } else { clear(bar); signInForm(); } });
    wrap.appendChild(manage); wrap.appendChild(out);
    bar.appendChild(wrap);
  }

  function openPortal(btn) {
    if (btn) btn.disabled = true;
    access('portal').then(function (r) {
      if (r.status === 401) return expired();
      return r.json().then(function (j) {
        var u = r.ok && stripeUrl(j.url);
        if (u) { location.href = u; return; }
        if (btn) btn.disabled = false;
        window.alert('Could not open the billing page. Try again shortly, or email hello@mada-coaching.com.');
      });
    }, function () { if (btn) btn.disabled = false; window.alert('Could not reach the billing service. Try again shortly.'); });
  }

  // ---------------------------------------------------------------- paywall
  function paywall(st) {
    clear(app);
    if (bar) clear(bar);
    var card = el('div', 'card mx-card');
    var lapsed = st.status === 'past_due' || st.status === 'unpaid';
    card.appendChild(el('span', 'tag', lapsed ? 'Payment needed' : 'Subscription'));
    card.appendChild(el('h3', null, lapsed ? 'Your last payment did not go through' : 'Maths drills, $' + PRICE + ' a month'));
    if (lapsed) {
      card.appendChild(el('p', null, 'Update your payment details to get your access back. Nothing else changes.'));
      var fix = el('button', 'btn btn-primary', 'Update billing'); fix.type = 'button';
      fix.addEventListener('click', function () { openPortal(fix); });
      card.appendChild(fix);
    } else {
      if (q.get('canceled') === '1') card.appendChild(el('p', 'rp-disclaimer', 'Checkout was cancelled. You have not been charged.'));
      if (st.status === 'canceled' || st.status === 'incomplete_expired') card.appendChild(el('p', null, 'Your earlier subscription has ended. Subscribe again to pick up where you left off.'));
      var ul = el('ul');
      ['Timed questions on growth, margins, breakeven, payback, compound growth, market sizing, mix and unit economics.',
       'Three difficulty levels plus a random mix, with a worked solution after every question.',
       'Practise as often as you like, whenever you like.'].forEach(function (t) { ul.appendChild(el('li', null, t)); });
      card.appendChild(ul);
      var btn = el('button', 'btn btn-primary', 'Subscribe for $' + PRICE + '/month'); btn.type = 'button';
      var note = el('p', 'muted small');
      btn.addEventListener('click', function () {
        btn.disabled = true;
        access('checkout').then(function (r) {
          if (r.status === 401) return expired();
          if (r.status === 409) return check(0);
          return r.json().then(function (j) {
            var u = r.ok && stripeUrl(j.url);
            if (u) { location.href = u; return; }
            btn.disabled = false;
            note.textContent = r.status === 503 ? 'Payments are not available right now. Please try again later.' : 'Could not open the payment page. You have not been charged. Try again shortly.';
          });
        }, function () { btn.disabled = false; note.textContent = 'Could not reach the payment service. You have not been charged. Try again shortly.'; });
      });
      card.appendChild(btn);
      card.appendChild(note);
      var terms = el('p', 'muted small');
      terms.appendChild(document.createTextNode('Billed monthly and renews automatically. Cancel any time before your next billing date and you will not be charged again; months already started are not refunded. See the '));
      var a1 = el('a', null, 'terms'); a1.href = TERMS; terms.appendChild(a1);
      terms.appendChild(document.createTextNode(' and '));
      var a2 = el('a', null, 'refund policy'); a2.href = REFUNDS; terms.appendChild(a2);
      terms.appendChild(document.createTextNode('. Signed in as ' + email + '. '));
      var other = el('button', 'btn btn-ghost btn-sm', 'Use a different email'); other.type = 'button';
      other.addEventListener('click', function () { S.clear(); token = null; signInForm(); });
      terms.appendChild(other);
      card.appendChild(terms);
    }
    app.appendChild(card);
  }

  // ---------------------------------------------------------------- access check
  function start(st) {
    clear(app);
    started = true;
    accountBar(st);
    window.MadaMathsStart();
  }

  // polls > 0: a payment just came back from Stripe; the webhook may land a few seconds later, so ask again.
  function check(polls) {
    say(polls > 0 ? 'Payment received. Activating your access…' : 'Checking your access…');
    access('status').then(function (r) {
      if (r.status === 401) return expired();
      if (!r.ok) return say('Something went wrong. Please refresh the page in a moment.');
      return r.json().then(function (st) {
        if (st.active) { if (history.replaceState) history.replaceState(null, '', location.pathname); return start(st); }
        if (polls > 0) { setTimeout(function () { check(polls - 1); }, 2500); return; }
        if (q.get('paid') === '1') {
          clear(app);
          var c = el('div', 'card mx-card');
          c.appendChild(el('h3', null, 'Your payment is still being confirmed'));
          c.appendChild(el('p', null, 'This is taking longer than usual. Refresh this page in a minute. If you were charged and still have no access, email hello@mada-coaching.com and we will sort it out.'));
          app.appendChild(c);
          return;
        }
        paywall(st);
      });
    }, function () { say('Could not reach the service. Please try again shortly.'); });
  }

  if (!ready()) { say('The maths drills are not available yet.'); return; }
  var saved = S.load();
  if (saved) { token = saved.token; email = saved.email; check(q.get('paid') === '1' ? 12 : 0); } else signInForm();
})();
