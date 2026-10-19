// Mada AI case practice: sign in, accept the recording notice, talk to Victoria, get the report.
//
//   1. Email code sign-in (Supabase Auth). A new email creates an account.
//   2. Pay once (Stripe Checkout, a hosted page) if there is no unused call. The credit is granted only by Stripe's
//      verified webhook, never by this page.
//   3. Pick the case type and accept the notice. The CONSENT_VERSION below must match the server's
//      (mada-ai supabase/functions/_shared/interview/policy.ts); the server refuses any other.
//   4. interview-start returns a short-lived voice token. The browser connects to ElevenLabs with it.
//      No API key is ever in this file or this page.
//   5. After the call, poll interview-status until the report is ready, then draw it.
//
// Every string from the server is written with textContent, never innerHTML.
// The access token lives in memory only and is gone when the tab closes.
(function () {
  var app = document.getElementById('call-app');
  if (!app) return;
  var API = app.getAttribute('data-api');
  var KEY = app.getAttribute('data-key');
  var PRICE = app.getAttribute('data-price') || '50';
  var paidReturn = /[?&]paid=1/.test(location.search);
  var CONSENT_VERSION = '2026-10-v1';
  var RETENTION_DAYS = 90;
  var token = null;
  var email = '';
  var conv = null;
  var timer = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function say(msg) { clear(); app.appendChild(el('p', 'muted', msg)); }
  function ready() { return API && KEY && API.indexOf('https://') === 0 && window.MadaVoice; }

  function post(path, body, bearer) {
    var h = { 'content-type': 'application/json', apikey: KEY };
    if (bearer) h.authorization = 'Bearer ' + bearer;
    return fetch(API.replace(/\/+$/, '') + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  }

  // ---------------------------------------------------------------- 1. sign in
  function signInForm(msg) {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Enter your email'));
    form.appendChild(el('p', 'muted', msg || 'Your report is tied to this email. We will send you a one-time code.'));
    var input = el('input'); input.type = 'email'; input.required = true; input.autocomplete = 'email'; input.placeholder = 'you@example.com';
    input.setAttribute('aria-label', 'Email address');
    var btn = el('button', 'btn btn-primary', 'Email me a code'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      email = input.value.trim();
      post('/auth/v1/otp', { email: email, create_user: true }).then(function (r) {
        if (!r.ok) throw new Error();
        codeForm();
      }, function () { signInForm('Could not reach the sign-in service. Try again.'); }).catch(function () { signInForm('Could not send a code. Check the email address and try again.'); });
    });
    app.appendChild(form);
  }

  function codeForm() {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Enter your code'));
    form.appendChild(el('p', 'muted', 'We emailed a code to ' + email + '.'));
    var input = el('input'); input.type = 'text'; input.inputMode = 'numeric'; input.required = true; input.autocomplete = 'one-time-code';
    input.setAttribute('aria-label', 'One-time code');
    var btn = el('button', 'btn btn-primary', 'Continue'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      post('/auth/v1/verify', { type: 'email', email: email, token: input.value.trim() }).then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      }).then(function (j) { token = j.access_token; gate(); }, function () { signInForm('That code did not work. Request a new one.'); });
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- 2. pay
  function balance() {
    return post('/functions/v1/interview-checkout', { action: 'balance' }, token).then(function (r) {
      if (r.status === 401) { token = null; return -1; }
      return r.ok ? r.json().then(function (j) { return j.credits; }) : 0;
    });
  }

  // After Stripe sends the candidate back, the credit arrives a few seconds later via the webhook.
  function gate(tries) {
    tries = tries || 0;
    if (!tries) say('Checking your account\u2026');
    balance().then(function (n) {
      if (n < 0) return signInForm('Your session expired. Sign in again.');
      if (n > 0) return setup(paidReturn ? 'Payment received. You are ready to start.' : undefined);
      if (paidReturn && tries < 10) { say('Confirming your payment\u2026'); return setTimeout(function () { gate(tries + 1); }, 3000); }
      payScreen(paidReturn ? 'We have not received your payment yet. If you were charged, email us and we will sort it out.' : undefined);
    }, function () { payScreen('Could not reach the service. Please try again.'); });
  }

  function payScreen(msg) {
    clear();
    var card = el('div', 'rp-form card');
    card.appendChild(el('h3', null, 'One call with Victoria: $' + PRICE));
    if (msg) card.appendChild(el('p', 'rp-notice', msg));
    var ul = el('ul');
    ['One spoken case interview, about 25 minutes.', 'A structured report at the end of the call, also emailed to you.', 'Secure payment by card on Stripe\u2019s page. We never see your card details.'].forEach(function (t) { ul.appendChild(el('li', null, t)); });
    card.appendChild(ul);
    var btn = el('button', 'btn btn-primary', 'Pay $' + PRICE + ' and continue'); btn.type = 'button';
    btn.addEventListener('click', function () {
      btn.disabled = true;
      post('/functions/v1/interview-checkout', { action: 'checkout' }, token).then(function (r) {
        if (r.status === 401) { token = null; return signInForm('Your session expired. Sign in again.'); }
        return r.json().then(function (j) {
          if (r.ok && j.url && j.url.indexOf('https://') === 0) { location.href = j.url; return; }
          if (j && j.error && j.error.code === 'already_has_credit') return gate();
          btn.disabled = false;
          payScreen('We could not open the payment page. You have not been charged. Please try again shortly.');
        });
      }, function () { btn.disabled = false; payScreen('Could not reach the service. Please try again.'); });
    });
    card.appendChild(btn);
    app.appendChild(card);
  }

  // ---------------------------------------------------------------- 3. set up
  function setup(msg) {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Your interview with Victoria'));
    if (msg) form.appendChild(el('p', 'rp-notice', msg));
    var label = el('label', null, 'Case type');
    var sel = el('select');
    var opt = el('option', null, 'Investment decision'); opt.value = 'investment'; sel.appendChild(opt);
    label.appendChild(sel);
    form.appendChild(label);
    form.appendChild(el('p', 'muted', 'You will get a case of this type at random. You need a quiet place, a microphone and about 25 minutes.'));

    var box = el('div', 'rp-consent');
    box.appendChild(el('strong', null, 'Before you start'));
    var ul = el('ul');
    [
      'Your voice is recorded and turned into a transcript while you speak with Victoria, an AI interviewer.',
      'An AI scores the transcript against Mada’s rubric. The report is a Mada developmental assessment, not official employer scoring.',
      'The transcript is kept for ' + RETENTION_DAYS + ' days and then deleted. Your scores and report are kept so you can come back to them.',
      'Voice and transcript are processed by our providers ElevenLabs (the voice) and Anthropic (the scoring).',
      'Your report appears here at the end of the call and is emailed to ' + email + '.'
    ].forEach(function (t) { ul.appendChild(el('li', null, t)); });
    box.appendChild(ul);
    var cl = el('label', 'rp-check');
    var cb = el('input'); cb.type = 'checkbox'; cb.required = true;
    cl.appendChild(cb); cl.appendChild(el('span', null, ' I have read this and agree to the recording and scoring.'));
    box.appendChild(cl);
    form.appendChild(box);

    var btn = el('button', 'btn btn-primary', 'Start the call'); btn.type = 'submit';
    form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cb.checked) return;
      btn.disabled = true;
      start(sel.value);
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- 4. the call
  function start(caseType) {
    say('Starting your call…');
    post('/functions/v1/interview-start', { interviewer: 'victoria', case_type: caseType, consent: true, consent_version: CONSENT_VERSION }, token).then(function (r) {
      if (r.status === 401) { token = null; return signInForm('Your session expired. Sign in again.'); }
      return r.json().then(function (j) {
        if (!r.ok) {
          var code = j && j.error && j.error.code;
          if (code === 'payment_required') return payScreen('You need to buy a call first.');
          if (code === 'call_in_progress') return setup('You already have a call in progress. Finish it, or wait a few minutes and try again.');
          if (code === 'voice_unavailable') return setup('We could not start the call. Nothing was used. Please try again shortly.');
          return setup('We could not start the call. Please try again shortly.');
        }
        connect(j);
      });
    }, function () { setup('Could not reach the service. Please try again.'); });
  }

  function connect(s) {
    clear();
    var card = el('div', 'rp-form card');
    card.appendChild(el('h3', null, 'Connecting to Victoria…'));
    var stat = el('p', 'muted', 'Allow the microphone when your browser asks.');
    var end = el('button', 'btn btn-ghost', 'End call'); end.type = 'button'; end.disabled = true;
    card.appendChild(stat); card.appendChild(end);
    app.appendChild(card);
    var head = card.firstChild;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (timer) { clearInterval(timer); timer = null; }
      waitForReport(s.session_id);
    }
    window.MadaVoice.Conversation.startSession({
      conversationToken: s.token,
      connectionType: 'webrtc',
      dynamicVariables: s.dynamic_variables,
      onConnect: function () {
        head.textContent = 'You are speaking with Victoria';
        stat.textContent = 'Speak naturally. End the call when the interview is over.';
        end.disabled = false;
        var t0 = Date.now();
        timer = setInterval(function () {
          var sec = Math.floor((Date.now() - t0) / 1000);
          stat.textContent = 'In call · ' + Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
        }, 1000);
      },
      onDisconnect: finish,
      onError: function () { stat.textContent = 'There was a connection problem.'; }
    }).then(function (c) {
      conv = c;
      end.addEventListener('click', function () { end.disabled = true; c.endSession().then(finish, finish); });
    }, function () {
      done = true;
      setup('We could not start the call. Check that your browser can use the microphone, then try again.');
    });
  }

  // ---------------------------------------------------------------- 5. the report
  function waitForReport(sessionId) {
    clear();
    var card = el('div', 'rp-form card');
    card.appendChild(el('h3', null, 'Preparing your report'));
    var stat = el('p', 'muted', 'This usually takes about a minute. Keep this page open.');
    card.appendChild(stat);
    app.appendChild(card);
    var tries = 0;
    (function poll() {
      tries++;
      post('/functions/v1/interview-status', { session_id: sessionId }, token).then(function (r) {
        if (r.status === 401) { token = null; return signInForm('Your session expired. Sign in again to see your report; it has also been emailed to you.'); }
        return r.json().then(function (j) {
          if (j.status === 'ready') return window.MadaReport.render(j.report, app);
          if (j.status === 'in_review') return say('Your report is being checked by a Mada coach. We will email it to ' + email + ' as soon as it is ready.');
          if (j.status === 'failed') return say('We could not score this call. It may have been too short, or there was a technical problem. Please email us and we will sort it out.');
          if (j.status === 'expired') return say('This call did not start in time. You can start again.');
          if (tries > 60) return say('Your report is taking longer than usual. We will email it to ' + email + ' when it is ready.');
          setTimeout(poll, 4000);
        });
      }, function () { if (tries > 60) say('We lost the connection. Your report will be emailed to ' + email + '.'); else setTimeout(poll, 6000); });
    })();
  }

  if (!ready()) { say('AI case practice is opening soon.'); return; }
  signInForm();
})();
