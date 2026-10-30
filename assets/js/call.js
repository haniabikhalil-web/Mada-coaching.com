// Mada AI case practice: sign in, accept the recording notice, talk to Tatiana, get the report.
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
  // The payment return URL is the bare domain, so the saved sign-in must live there too.
  if (location.hostname === 'www.mada-coaching.com') { location.replace('https://mada-coaching.com' + location.pathname + location.search); return; }
  var API = app.getAttribute('data-api');
  var KEY = app.getAttribute('data-key');
  var PRICE = app.getAttribute('data-price') || '50';
  var PASS_PRICE = app.getAttribute('data-pass-price') || '100';
  var CAP_MIN = 25, CAP_SECS = CAP_MIN * 60; // matches the Max conversation duration on every ElevenLabs interviewer
  var PASS_LIVE = app.getAttribute('data-pass-live') === '1';
  var passReturn = /[?&]pass=1/.test(location.search);
  var paidReturn = /[?&]paid=1/.test(location.search) || passReturn;
  var CONSENT_VERSION = '2026-10-v1';
  var RETENTION_DAYS = 90;
  // The sign-in survives the trip to Stripe and back in this browser (localStorage, www and non-www are folded into one host below), so the candidate
  // is not asked for their email and code twice. It expires after 50 minutes and is cleared on any 401.
  // Sign-in is shared with the other Mada AI pages through window.MadaSession (ai-session.js): an hour-long access token plus a refresh token.
  var S = window.MadaSession;
  function saveSession(refresh, expiresIn) { if (!S) return; if (token) S.save(token, email, refresh, expiresIn); else S.clear(); }
  function expire(msg) {
    // One quiet refresh before asking for a new code.
    var go = S ? S.recover(API, KEY) : Promise.resolve(false);
    return go.then(function (ok) { if (ok) { location.reload(); return; } token = null; saveSession(); signInForm(msg); });
  }
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

  function post(path, body, bearer, timeoutMs) {
    var h = { 'content-type': 'application/json', apikey: KEY };
    if (bearer) h.authorization = 'Bearer ' + bearer;
    var ctl = timeoutMs && window.AbortController ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, timeoutMs) : null;
    var done = function () { if (t) clearTimeout(t); };
    return fetch(API.replace(/\/+$/, '') + path, { method: 'POST', headers: h, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { done(); return r; }, function (e) { done(); throw e; });
  }

  // ---------------------------------------------------------------- 1. sign in
  function signInForm(msg) {
    clear();
    var form = el('form', 'rp-form card');
    form.appendChild(el('h3', null, 'Sign in to My Mada'));
    form.appendChild(el('p', 'muted', msg || 'Your interviews, reports and subscriptions live in My Mada. Enter your email and we will send you a one-time code. New here? This creates your account.'));
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
      }).then(function (j) { token = j.access_token; saveSession(j.refresh_token, j.expires_in); gate(); }, function () { signInForm('That code did not work. Request a new one.'); });
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- 2. pay
  // Resolves to { credits, pass }, or null when the session has expired.
  function balance() {
    return post('/functions/v1/interview-checkout', { action: 'balance' }, token).then(function (r) {
      if (r.status === 401) { token = null; saveSession(); return null; }
      return r.ok ? r.json().then(function (j) { return { credits: j.credits || 0, pass: !!j.pass }; }) : { credits: 0, pass: false };
    });
  }

  // After Stripe sends the candidate back, the credit or subscription arrives a few seconds later via the webhook.
  function gate(tries) {
    tries = tries || 0;
    if (!tries) say('Checking your account\u2026');
    balance().then(function (b) {
      if (!b) return signInForm('Your session expired. Sign in again.');
      if (b.pass || b.credits > 0) return setup(paidReturn ? (passReturn ? 'Subscription active. You are ready to start.' : 'Payment received. You are ready to start.') : undefined);
      if (paidReturn && tries < 10) { say('Confirming your payment\u2026'); return setTimeout(function () { gate(tries + 1); }, 3000); }
      payScreen(paidReturn ? 'We have not received your payment yet. If you were charged, email us and we will sort it out.' : undefined);
    }, function () { payScreen('Could not reach the service. Please try again.'); });
  }

  // Opens a Stripe-hosted page for one of the two ways to pay.
  function pay(path, btn, msgEl) {
    btn.disabled = true;
    post(path, { action: 'checkout' }, token).then(function (r) {
      if (r.status === 401) return expire('Your session expired. Sign in again.');
      return r.json().then(function (j) {
        if (r.ok && j.url && j.url.indexOf('https://') === 0) { location.href = j.url; return; }
        var code = j && j.error && j.error.code;
        if (code === 'already_has_credit' || code === 'already_subscribed') return gate();
        btn.disabled = false;
        msgEl.textContent = 'We could not open the payment page. You have not been charged. Please try again shortly.';
      });
    }, function () { btn.disabled = false; msgEl.textContent = 'Could not reach the service. Please try again.'; });
  }

  // The purchase page: the same two-card layout as the homepage pricing (white single card, navy unlimited card).
  function payScreen(msg) {
    clear();
    var wrapEl = el('div', 'call-pay');
    if (msg) wrapEl.appendChild(el('p', 'rp-notice', msg));
    var grid = el('div', 'call-pay-grid');
    var note = el('p', 'call-note');
    note.setAttribute('role', 'status');

    function priceLine(amount, per) {
      var p = el('p', 'pp-price', '$' + amount);
      p.appendChild(el('small', null, per));
      return p;
    }
    function list(items) {
      var ul = el('ul', 'checks');
      items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      return ul;
    }

    var single = el('div', 'card');
    single.appendChild(el('h3', null, 'Single AI Interview'));
    single.appendChild(el('p', 'pp-sub', 'Pay once, practice once.'));
    single.appendChild(priceLine(PRICE, '/ interview'));
    single.appendChild(list(['One spoken case interview, about 25 minutes.', 'You choose the interviewer and case after paying.', 'A structured report at the end, also emailed to you.']));
    var b1 = el('button', 'btn btn-outline', 'Pay $' + PRICE + ' and continue'); b1.type = 'button';
    b1.addEventListener('click', function () { pay('/functions/v1/interview-checkout', b1, note); });
    single.appendChild(b1);

    var pass = el('div', 'card call-pay-best');
    pass.appendChild(el('span', 'badge rise', 'Best Value'));
    pass.appendChild(el('h3', null, 'Unlimited AI Interviews'));
    pass.appendChild(el('p', 'pp-sub', 'Practice as much as you need.'));
    pass.appendChild(priceLine(PASS_PRICE, '/ month'));
    pass.appendChild(list(['Unlimited interviews, subject to fair use.', 'Every interviewer and case type.', 'A report after every interview. Cancel any time.']));
    var b2 = el('button', 'btn btn-primary', 'Subscribe for $' + PASS_PRICE + '/month'); b2.type = 'button';
    b2.addEventListener('click', function () { pay('/functions/v1/pass-access', b2, note); });
    pass.appendChild(b2);

    grid.appendChild(single); if (PASS_LIVE) grid.appendChild(pass);
    wrapEl.appendChild(grid);
    wrapEl.appendChild(el('p', 'call-note', 'Secure payment by card on Stripe\u2019s page. We never see your card details.' + (PASS_LIVE ? ' The subscription renews monthly until you cancel it from My Mada.' : '')));
    wrapEl.appendChild(note);
    app.appendChild(wrapEl);
  }

  // Loading state shown at once (no artificial delay) while the interview is being set up.
  function loader(title, text) {
    clear();
    var box = el('div', 'mada-loader');
    box.setAttribute('role', 'status');
    box.appendChild(el('div', 'mada-loader-ring'));
    box.lastChild.setAttribute('aria-hidden', 'true');
    box.appendChild(el('h2', null, title));
    if (text) box.appendChild(el('p', null, text));
    app.appendChild(box);
    return box;
  }
  function loaderFailed(text, retry, back) {
    clear();
    var box = el('div', 'mada-loader');
    box.setAttribute('role', 'alert');
    box.appendChild(el('h2', null, 'That took longer than expected'));
    box.appendChild(el('p', null, text));
    var row = el('div', 'btn-row'); row.style.justifyContent = 'center';
    var r = el('button', 'btn btn-primary', 'Try again'); r.type = 'button'; r.addEventListener('click', retry);
    var c = el('button', 'btn btn-ghost', 'Back'); c.type = 'button'; c.addEventListener('click', back);
    row.appendChild(r); row.appendChild(c); box.appendChild(row);
    app.appendChild(box);
  }


  // ---------------------------------------------------------------- 3. set up
  // All six interviewers are open today. The other cards show what is coming and cannot be picked;
  // the server accepts nothing else either (interview-start validates interviewer and case type).
  // All six interviewers are open on the same start page.
  var interviewer = 'victoria';
  function who() { return interviewer === 'alex' ? 'Arthur' : interviewer === 'faisal' ? 'Faisal' : interviewer === 'layal' ? 'Layal' : interviewer === 'joe' ? 'Joe' : interviewer === 'mona' ? 'Mona' : 'Tatiana'; }
  var INTERVIEWERS = [
    { id: 'victoria', name: 'Tatiana', title: 'Partner', desc: 'Executive-level mock interviewer. Calm, direct and demanding, with sharp follow-ups that push clear top-down thinking and confident recommendations.', img: 'tatiana', open: true },
    { id: 'faisal', name: 'Faisal', title: 'Partner', desc: 'Challenge-focused interviewer. Tests how well you structure ambiguity, defend your logic and synthesize clearly under pressure.', img: 'faisal', open: true },
    // id stays 'alex' (the server and the voice agent know him by it); only the name shown to candidates is Arthur.
    { id: 'alex', name: 'Arthur', title: 'Principal', desc: 'Analytical drill specialist. Fast-paced and numbers-first, he pushes quantitative accuracy, exhibit reading and data-backed insights.', img: 'alex', open: true },
    { id: 'layal', name: 'Layal', title: 'Principal', desc: 'Strategic thought partner. Curious and probing, she keeps asking \u2018so what?\u2019 to sharpen implications, trade-offs and recommendations.', img: 'layal', open: true },
    { id: 'mona', name: 'Mona', title: 'Manager', desc: 'Precision-focused evaluator. Expects crisp communication, disciplined problem solving and strong case execution with minimal hand-holding.', img: 'mona', open: true },
    { id: 'joe', name: 'Joe', title: 'Manager', desc: 'Approachable practice interviewer. Relaxed and conversational, ideal for building confidence, sharpening structure and improving core case habits.', img: 'joe', open: true }
  ];
  var CASE_TYPES = [
    { id: 'random', name: 'Random', desc: 'Surprise me: a random case type, like the real thing.', open: true },
    { id: 'investment', name: 'Investment decision', desc: 'Should the client invest? Market, economics, risks.', open: true },
    { id: 'market-sizing', name: 'Market sizing', desc: 'Estimate a market from first principles.', open: true },
    { id: 'growth', name: 'Growth strategy', desc: 'Where should the client grow next?', open: true },
    { id: 'profitability', name: 'Profitability', desc: 'Is it worth it? Costs, revenue and the decision.', open: true },
    { id: 'market-entry', name: 'Market entry', desc: 'Should the client enter a new market? Price, cost position, risks.', open: true },
    { id: 'pricing', name: 'Pricing', desc: 'What should it cost? Price, volume and profit.', open: true },
    { id: 'soon-3', name: 'M&A', desc: 'Case type', open: false }
  ];

  var DIFFICULTIES = [
    { id: 'standard', name: 'Standard', desc: 'Typical first-round difficulty.', open: true },
    { id: 'easier', name: 'Easier', desc: 'More guidance and a slower pace.', open: true },
    { id: 'harder', name: 'Harder', desc: 'Less guidance, tougher follow-ups.', open: true }
  ];

  // "Random" is chosen here, in the browser, from the case types that are open today; the server still picks
  // which case of that type, and prefers one this candidate has not had.
  function randomCaseType() {
    var open = CASE_TYPES.filter(function (c) { return c.open && c.id !== 'random'; });
    return open[Math.floor(Math.random() * open.length)].id;
  }

  // Difficulty as a slider: Easier, Standard, Harder. Only the open levels can be chosen; tapping a coming-soon stop
  // shows what it will be, and the thumb stays where it is. The server accepts easier, standard or harder.
  var dPreview = null;
  function difficultySlider(title, chosen, onPick) {
    var wrap = el('div', 'pk');
    wrap.appendChild(el('h4', 'pk-title', title));
    var box = el('div', 'dl');
    var LV = ['easier', 'standard', 'harder'].map(function (id) { return DIFFICULTIES.filter(function (d) { return d.id === id; })[0]; });
    var idx = 1;
    LV.forEach(function (d, i) { if (d.id === chosen) idx = i; });
    var shown = LV[dPreview !== null ? dPreview : idx];
    var head = el('p', 'dl-head');
    head.appendChild(el('strong', null, shown.name));
    if (!shown.open) head.appendChild(el('span', 'pk-badge', 'Coming soon'));
    box.appendChild(head);
    var track = el('div', 'dl-track');
    var pos = [0, 50, 100];
    var fill = el('span', 'dl-fill'); fill.style.width = pos[idx] + '%'; track.appendChild(fill);
    LV.forEach(function (d, i) {
      var b = el('button', 'dl-stop' + (d.open ? '' : ' is-soon') + (i === dPreview ? ' is-preview' : '')); b.type = 'button';
      b.style.left = pos[i] + '%';
      b.setAttribute('aria-label', d.name + (d.open ? '' : ' (coming soon)'));
      b.addEventListener('click', function () {
        if (d.open) { dPreview = null; onPick(d.id); } else { dPreview = i; onPick(chosen); }
      });
      track.appendChild(b);
    });
    var thumb = el('span', 'dl-thumb'); thumb.style.left = pos[idx] + '%'; thumb.setAttribute('aria-hidden', 'true');
    track.appendChild(thumb);
    box.appendChild(track);
    var ends = el('div', 'dl-ends');
    LV.forEach(function (d) { ends.appendChild(el('span', null, d.name)); });
    box.appendChild(ends);
    box.appendChild(el('p', 'dl-desc', shown.desc));
    wrap.appendChild(box);
    return wrap;
  }

  function picker(title, items, chosen, onPick, avatar) {
    var wrap = el('div', 'pk');
    wrap.appendChild(el('h4', 'pk-title', title));
    var grid = el('div', 'pk-grid');
    items.forEach(function (it) {
      var b = el('button', 'pk-card' + (avatar ? ' pk-person' : '') + (it.open ? '' : ' is-soon') + (it.id === chosen ? ' is-on' : ''));
      b.type = 'button';
      if (!it.open) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      if (avatar) {
        var av = el('span', 'pk-avatar');
        var im = el('img'); im.src = '/assets/img/interviewers/' + it.img + '.jpg'; im.alt = it.name + ', ' + it.title; im.width = 560; im.height = 469; im.loading = 'lazy';
        av.appendChild(im); b.appendChild(av);
      }
      var txt = el('span', 'pk-text');
      txt.appendChild(el('strong', null, it.name));
      if (it.title) txt.appendChild(el('span', 'pk-role', it.title));
      txt.appendChild(el('span', 'pk-desc', it.desc));
      if (!it.open) txt.appendChild(el('span', 'pk-badge', 'Coming soon'));
      else if (it.id === chosen) txt.appendChild(el('span', 'pk-badge pk-badge-on', 'Selected'));
      b.appendChild(txt);
      if (it.open) b.addEventListener('click', function () { onPick(it.id); });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function setup(msg) {
    clear();
    var chosenI = 'victoria', chosenC = 'random', chosenD = 'standard';
    var form = el('form', 'rp-form rp-wide card');
    form.appendChild(el('h3', null, 'Set up your AI interview'));
    if (msg) form.appendChild(el('p', 'rp-notice', msg));
    var slotI = el('div'), slotC = el('div'), slotD = el('div');
    function draw() {
      slotI.textContent = ''; slotC.textContent = ''; slotD.textContent = '';
      slotI.appendChild(picker('1. Choose your interviewer', INTERVIEWERS, chosenI, function (id) { chosenI = id; interviewer = id === 'alex' ? 'alex' : id === 'faisal' ? 'faisal' : id === 'layal' ? 'layal' : id === 'joe' ? 'joe' : id === 'mona' ? 'mona' : 'victoria'; draw(); }, true));
      slotC.appendChild(picker('2. Choose a case type', CASE_TYPES, chosenC, function (id) { chosenC = id; draw(); }, false));
      slotD.appendChild(difficultySlider('3. Choose a difficulty', chosenD, function (id) { chosenD = id; draw(); }));
    }
    draw();
    form.appendChild(slotI); form.appendChild(slotC); form.appendChild(slotD);
    form.appendChild(el('p', 'muted', 'You will get a case of this type at random. You need a quiet place, a microphone and about 25 minutes. The interview ends automatically at 25 minutes.'));

    var box = el('div', 'rp-consent');
    box.appendChild(el('strong', null, 'Before you start'));
    var ul = el('ul');
    [
      'Your voice is recorded and turned into a transcript while you speak with ' + who() + ', an AI interviewer.',
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
      start(chosenC === 'random' ? randomCaseType() : chosenC, chosenD);
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- 4. the call
  function start(caseType, difficulty) {
    loader('Getting your interviewer ready\u2026', who() + ' is preparing your case. This usually takes a few seconds.');
    post('/functions/v1/interview-start', { interviewer: interviewer, case_type: caseType, difficulty: difficulty || 'standard', consent: true, consent_version: CONSENT_VERSION }, token, 30000).then(function (r) {
      if (r.status === 401) return expire('Your session expired. Sign in again.');
      return r.json().then(function (j) {
        if (!r.ok) {
          var code = j && j.error && j.error.code;
          if (code === 'payment_required') return payScreen('You need to buy a call first.');
          if (code === 'fair_use') return setup('You have reached the limit of interviews for today. Come back later today and practice again.');
          if (code === 'call_in_progress') return setup('You already have a call in progress. Finish it, or wait a few minutes and try again.');
          if (code === 'voice_unavailable') return setup('We could not start the call. Nothing was used. Please try again shortly.');
          return setup('We could not start the call. Please try again shortly.');
        }
        connect(j);
      });
    }, function (e) {
      loaderFailed('We could not start the interview. Check your connection and try again. If it keeps happening, wait a minute first.',
        function () { start(caseType, difficulty); }, function () { setup(); });
    });
  }

  function connect(s) {
    clear();
    var stage = el('div', 'call-stage call-grid');
    var orbWrap = el('div', 'orb-wrap');
    var orb = el('div', 'orb is-connecting');
    orbWrap.appendChild(el('div', 'orb-ring'));
    orbWrap.appendChild(orb);
    var name = el('p', 'call-name', who());
    var stat = el('p', 'call-status', 'Connecting… allow the microphone when your browser asks.');
    var clock = el('p', 'call-clock', '0:00');
    var left = el('p', 'call-left', 'Ends automatically at 25:00');
    var warn = el('p', 'call-warn'); warn.setAttribute('role', 'alert'); warn.hidden = true;
    var tr = el('div', 'call-transcript');
    tr.setAttribute('aria-live', 'off');
    tr.appendChild(el('p', 'call-tr-empty', 'The conversation will appear here as you speak.'));
    var bar = el('div', 'call-bar');
    var mute = el('button', 'call-btn', 'Mute'); mute.type = 'button'; mute.disabled = true;
    var end = el('button', 'call-btn call-btn-end', 'End call'); end.type = 'button'; end.disabled = true;
    bar.appendChild(mute); bar.appendChild(end);
    var side = el('div', 'call-side');
    [orbWrap, name, stat, clock, left, bar].forEach(function (n) { side.appendChild(n); });
    var main = el('div', 'call-main');
    main.appendChild(warn);
    main.appendChild(el('p', 'call-tr-title', 'Live transcript'));
    main.appendChild(tr);
    stage.appendChild(side); stage.appendChild(main);
    app.appendChild(stage);

    var done = false, mode = 'listening', raf = null, muted = false, t0 = 0;
    function finish() {
      if (done) return;
      done = true;
      if (timer) { clearInterval(timer); timer = null; }
      if (raf) cancelAnimationFrame(raf);
      waitForReport(s.session_id, t0 && (Date.now() - t0) / 1000 >= CAP_SECS - 5 ? 'cap' : '', t0 ? Math.round((Date.now() - t0) / 1000) : 0);
    }
    function setMode(m) {
      mode = m;
      orb.className = 'orb is-' + (m === 'speaking' ? 'speaking' : 'listening');
      stat.textContent = m === 'speaking' ? who() + ' is speaking' : 'Listening… your turn';
    }
    function addLine(source, text) {
      if (!text) return;
      var empty = tr.querySelector('.call-tr-empty');
      if (empty) tr.removeChild(empty);
      var line = el('p', 'call-line ' + (source === 'user' ? 'is-you' : 'is-tatiana'));
      line.appendChild(el('span', 'call-who', source === 'user' ? 'You' : who()));
      line.appendChild(el('span', 'call-text', text));
      tr.appendChild(line);
      tr.scrollTop = tr.scrollHeight;
    }
    function animate() {
      if (done) return;
      var v = 0;
      try { v = conv ? (mode === 'speaking' ? conv.getOutputVolume() : conv.getInputVolume()) : 0; } catch (e) { v = 0; }
      v = Math.min(1, Math.max(0, v || 0));
      orbWrap.style.setProperty('--lvl', (1 + v * 0.45).toFixed(3));
      raf = requestAnimationFrame(animate);
    }

    window.MadaVoice.Conversation.startSession({
      conversationToken: s.token,
      connectionType: 'webrtc',
      dynamicVariables: s.dynamic_variables,
      onConnect: function () {
        setMode('listening');
        end.disabled = false; mute.disabled = false;
        t0 = Date.now();
        // The call ends by itself at 25 minutes (the cap set on every interviewer in ElevenLabs). Warn the candidate on screen and tell the interviewer, so they say it out loud too.
        var LIMIT = CAP_SECS, fired = {};
        var CHECKS = [
          { at: 300, text: 'About 5 minutes left. Start moving toward your recommendation.',
            tell: 'TIME CHECK: about five minutes remain; the call ends automatically at 25 minutes. At your next natural pause, tell the candidate in one short sentence that you are close to time, then carry on with the case (pose the extension if you have not yet, or go to the standard closing). Do not ask for a recommendation now: the standard closing asks for it once, and if the candidate has already given a complete recommendation you do not ask again.' },
          { at: 120, text: '2 minutes left. Wrap up with your recommendation.',
            tell: 'TIME CHECK: two minutes remain. Go to the standard closing now. If the candidate has already given a recommendation with its rationale, key risks and next steps, do not ask for it again: say "Thank you, that covers it." and close. If one element is missing, ask only for that element, once.' },
          { at: 60, text: '1 minute left. The interview ends automatically at 25:00.',
            tell: 'TIME CHECK: one minute remains. Thank the candidate and close the interview now; the call will end automatically.' }
        ];
        function mmss(n) { n = Math.max(0, n); return Math.floor(n / 60) + ':' + ('0' + (n % 60)).slice(-2); }
        timer = setInterval(function () {
          var sec = Math.floor((Date.now() - t0) / 1000), remain = LIMIT - sec;
          clock.textContent = mmss(sec);
          left.textContent = remain > 0 ? mmss(remain) + ' left' : 'Time is up';
          left.classList.toggle('is-low', remain <= 300);
          CHECKS.forEach(function (c) {
            if (remain <= c.at && !fired[c.at]) {
              fired[c.at] = true;
              warn.textContent = c.text; warn.hidden = false;
              try { if (conv && conv.sendContextualUpdate) conv.sendContextualUpdate(c.tell); } catch (e) {}
            }
          });
        }, 1000);
        raf = requestAnimationFrame(animate);
      },
      onModeChange: function (m) { setMode(m && m.mode === 'speaking' ? 'speaking' : 'listening'); },
      onMessage: function (m) { if (m && m.message) addLine(m.source === 'user' ? 'user' : 'ai', String(m.message)); },
      onDisconnect: finish,
      onError: function () { stat.textContent = 'There was a connection problem.'; }
    }).then(function (c) {
      conv = c;
      mute.addEventListener('click', function () {
        muted = !muted;
        try { c.setMicMuted(muted); } catch (e) { muted = !muted; return; }
        mute.textContent = muted ? 'Unmute' : 'Mute';
        mute.classList.toggle('is-on', muted);
      });
      end.addEventListener('click', function () { end.disabled = true; c.endSession().then(finish, finish); });
    }, function () {
      done = true;
      setup('We could not start the call. Check that your browser can use the microphone, then try again.');
    });
  }

  // ---------------------------------------------------------------- 5. the report
  function waitForReport(sessionId, reason, secs) {
    clear();
    var card = el('div', 'call-stage call-wait');
    var ring = el('div', 'mada-loader-ring'); ring.setAttribute('aria-hidden', 'true');
    ring.style.margin = '0 auto 20px';
    card.appendChild(ring);
    card.appendChild(el('h3', 'call-name', reason === 'cap' ? 'Your interview has ended' : 'Preparing your report'));
    if (reason === 'cap') card.appendChild(el('p', 'call-status', 'The interview reached its ' + CAP_MIN + '-minute limit, so the call ended automatically. Your report is on its way.'));
    var stat = el('p', 'call-status', who() + '’s notes are being scored. This usually takes about a minute. Keep this page open.');
    card.appendChild(stat);
    app.appendChild(card);
    var tries = 0;
    var steps = ['Collecting your transcript\u2026', 'Checking each answer against the case\u2026', 'Scoring your skills\u2026', 'Writing your feedback\u2026'];
    (function poll() {
      tries++;
      stat.textContent = steps[Math.min(steps.length - 1, Math.floor(tries / 6))] + ' This usually takes under a minute. Keep this page open.';
      post('/functions/v1/interview-status', { session_id: sessionId }, token).then(function (r) {
        if (r.status === 401) return expire('Your session expired. Sign in again to see your report; it has also been emailed to you.');
        return r.json().then(function (j) {
          if (j.status === 'ready') return window.MadaReport.render(j.report, app, undefined, j.difficulty);
          if (j.status === 'in_review') return say('Your report needs a little more time. We will email it to ' + email + ' as soon as it is ready.');
          if (j.status === 'failed') return say('We could not score this call. It may have been too short, or there was a technical problem. Please email us and we will sort it out.');
          if (j.status === 'expired') return say('This call did not start in time. You can start again.');
          if (tries > 110) return say('Your report is taking longer than usual. We will email it to ' + email + ' when it is ready.');
          setTimeout(poll, 2000);
        });
      }, function () { if (tries > 110) say('We lost the connection. Your report will be emailed to ' + email + '.'); else setTimeout(poll, 6000); });
    })();
  }

  if (!ready()) { say('AI case practice is opening soon.'); return; }
  (S ? S.restore(API, KEY) : Promise.resolve(null)).then(function (saved) {
    if (saved) { token = saved.token; email = saved.email; gate(); }
    else signInForm(paidReturn ? 'Payment received. Sign in with the same email to continue to your interview.' : undefined);
  });
})();
