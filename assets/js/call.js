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
  var paidReturn = /[?&]paid=1/.test(location.search);
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
  function balance() {
    return post('/functions/v1/interview-checkout', { action: 'balance' }, token).then(function (r) {
      if (r.status === 401) { token = null; saveSession(); return -1; }
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
    card.appendChild(el('h3', null, 'One AI case interview: $' + PRICE));
    if (msg) card.appendChild(el('p', 'rp-notice', msg));
    var ul = el('ul');
    ['One spoken case interview, about 25 minutes. You choose the interviewer and case after paying.', 'A structured report at the end of the call, also emailed to you.', 'Secure payment by card on Stripe\u2019s page. We never see your card details.'].forEach(function (t) { ul.appendChild(el('li', null, t)); });
    card.appendChild(ul);
    var btn = el('button', 'btn btn-primary', 'Pay $' + PRICE + ' and continue'); btn.type = 'button';
    btn.addEventListener('click', function () {
      btn.disabled = true;
      post('/functions/v1/interview-checkout', { action: 'checkout' }, token).then(function (r) {
        if (r.status === 401) return expire('Your session expired. Sign in again.');
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
  // Only Tatiana and the investment case are open today. The other cards show what is coming and cannot be picked;
  // the server accepts nothing else either (interview-start validates interviewer and case type).
  // Alex is not public. A tester opens the start page with ?interviewer=alex; the server still refuses him until his agent is set up.
  var TESTER_ALEX = false;
  try { TESTER_ALEX = new URLSearchParams(location.search).get('interviewer') === 'alex'; } catch (e) { TESTER_ALEX = false; }
  // Faisal is open on the same start page as Tatiana.
  var interviewer = 'victoria';
  function who() { return interviewer === 'alex' ? 'Alex' : interviewer === 'faisal' ? 'Faisal' : 'Tatiana'; }
  var INTERVIEWERS = [
    { id: 'victoria', name: 'Tatiana', title: 'Partner', desc: 'Executive-level mock interviewer. Calm, direct and demanding, with sharp follow-ups that push clear top-down thinking and confident recommendations.', img: 'tatiana', open: true },
    { id: TESTER_ALEX ? 'alex' : 'soon-alex', name: 'Alex', title: 'Senior Manager', desc: 'Analytical drill specialist. Fast-paced and numbers-first, he pushes quantitative accuracy, exhibit reading and data-backed insights.', img: 'alex', open: TESTER_ALEX },
    { id: 'faisal', name: 'Faisal', title: 'Principal', desc: 'Challenge-focused interviewer. Tests how well you structure ambiguity, defend your logic and synthesize clearly under pressure.', img: 'faisal', open: true },
    { id: 'soon-layal', name: 'Layal', title: 'Senior Manager', desc: 'Strategic thought partner. Curious and probing, she keeps asking \u2018so what?\u2019 to sharpen implications, trade-offs and recommendations.', img: 'layal', open: false },
    { id: 'soon-joe', name: 'Joe', title: 'Junior Manager', desc: 'Approachable practice interviewer. Relaxed and conversational, ideal for building confidence, sharpening structure and improving core case habits.', img: 'joe', open: false },
    { id: 'soon-mona', name: 'Mona', title: 'Principal', desc: 'Precision-focused evaluator. Expects crisp communication, disciplined problem solving and strong case execution with minimal hand-holding.', img: 'mona', open: false }
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
    { id: 'soon-e', name: 'Easier', desc: 'More guidance and a slower pace.', open: false },
    { id: 'soon-h', name: 'Harder', desc: 'Less guidance, tougher follow-ups.', open: false }
  ];

  // "Random" is chosen here, in the browser, from the case types that are open today; the server still picks
  // which case of that type, and prefers one this candidate has not had.
  function randomCaseType() {
    var open = CASE_TYPES.filter(function (c) { return c.open && c.id !== 'random'; });
    return open[Math.floor(Math.random() * open.length)].id;
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
      slotI.appendChild(picker('1. Choose your interviewer', INTERVIEWERS, chosenI, function (id) { chosenI = id; interviewer = id === 'alex' ? 'alex' : id === 'faisal' ? 'faisal' : 'victoria'; draw(); }, true));
      slotC.appendChild(picker('2. Choose a case type', CASE_TYPES, chosenC, function (id) { chosenC = id; draw(); }, false));
      slotD.appendChild(picker('3. Choose a difficulty', DIFFICULTIES, chosenD, function (id) { chosenD = id; draw(); }, false));
    }
    draw();
    form.appendChild(slotI); form.appendChild(slotC); form.appendChild(slotD);
    form.appendChild(el('p', 'muted', 'You will get a case of this type at random. You need a quiet place, a microphone and about 25 minutes.'));

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
      start(chosenC === 'random' ? randomCaseType() : chosenC);
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- 4. the call
  function start(caseType) {
    say('Starting your call…');
    post('/functions/v1/interview-start', { interviewer: interviewer, case_type: caseType, consent: true, consent_version: CONSENT_VERSION }, token).then(function (r) {
      if (r.status === 401) return expire('Your session expired. Sign in again.');
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
    var stage = el('div', 'call-stage call-grid');
    var orbWrap = el('div', 'orb-wrap');
    var orb = el('div', 'orb is-connecting');
    orbWrap.appendChild(el('div', 'orb-ring'));
    orbWrap.appendChild(orb);
    var name = el('p', 'call-name', who());
    var stat = el('p', 'call-status', 'Connecting… allow the microphone when your browser asks.');
    var clock = el('p', 'call-clock', '0:00');
    var tr = el('div', 'call-transcript');
    tr.setAttribute('aria-live', 'off');
    tr.appendChild(el('p', 'call-tr-empty', 'The conversation will appear here as you speak.'));
    var bar = el('div', 'call-bar');
    var mute = el('button', 'call-btn', 'Mute'); mute.type = 'button'; mute.disabled = true;
    var end = el('button', 'call-btn call-btn-end', 'End call'); end.type = 'button'; end.disabled = true;
    bar.appendChild(mute); bar.appendChild(end);
    var side = el('div', 'call-side');
    [orbWrap, name, stat, clock, bar].forEach(function (n) { side.appendChild(n); });
    var main = el('div', 'call-main');
    main.appendChild(el('p', 'call-tr-title', 'Live transcript'));
    main.appendChild(tr);
    stage.appendChild(side); stage.appendChild(main);
    app.appendChild(stage);

    var done = false, mode = 'listening', raf = null, muted = false;
    function finish() {
      if (done) return;
      done = true;
      if (timer) { clearInterval(timer); timer = null; }
      if (raf) cancelAnimationFrame(raf);
      waitForReport(s.session_id);
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
        var t0 = Date.now();
        timer = setInterval(function () {
          var sec = Math.floor((Date.now() - t0) / 1000);
          clock.textContent = Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
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
  function waitForReport(sessionId) {
    clear();
    var card = el('div', 'call-stage call-wait');
    var orbWrap = el('div', 'orb-wrap');
    orbWrap.appendChild(el('div', 'orb-ring'));
    orbWrap.appendChild(el('div', 'orb is-thinking'));
    card.appendChild(orbWrap);
    card.appendChild(el('h3', 'call-name', 'Preparing your report'));
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
          if (j.status === 'ready') return window.MadaReport.render(j.report, app);
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
