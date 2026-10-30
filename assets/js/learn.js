// Mada AI "Introduction to Case Solving": sign-in, dashboard, lessons, exercises with AI feedback, tutor chat and the Mini Case Challenge.
// The server decides everything that matters: which modules a candidate may open (learn-state), what the tutor says and how work is scored
// (learn-tutor). This file only asks and shows. Every string is written with textContent, never innerHTML.
(function () {
  var app = document.getElementById('learn-app');
  if (!app) return;
  var API = (app.getAttribute('data-api') || '').replace(/\/+$/, '');
  var KEY = app.getAttribute('data-key');
  var START = app.getAttribute('data-start') || '../case-practice/start/';
  var MATHS = app.getAttribute('data-maths') || '../maths/';
  var TERMS = app.getAttribute('data-terms') || '../../terms/';
  var REFUNDS = app.getAttribute('data-refunds') || '../../refunds/';
  var PASS_PRICE = app.getAttribute('data-pass-price') || '100';
  var S = window.MadaSession;
  var token = null, email = '';
  var dash = null;          // the last learn-state "get" answer
  var moduleCache = {};     // key -> module content for the current level
  var chatHistory = {};     // module key -> [{role, content}]

  // ---------------------------------------------------------------- small helpers
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function btn(text, cls, onClick) {
    var b = el('button', cls || 'btn btn-primary', text); b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function paragraphs(text, cls) {
    var wrap = el('div', cls || 'ln-text');
    String(text).split(/\n\n+/).forEach(function (t) {
      var p = el('p'); p.style.whiteSpace = 'pre-wrap'; p.textContent = t; wrap.appendChild(p);
    });
    return wrap;
  }
  function ready() { return API && KEY && API.indexOf('https://') === 0 && S; }
  function top() { try { window.scrollTo({ top: Math.max(0, app.getBoundingClientRect().top + window.pageYOffset - 90), behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); } }
  function stripeUrl(u) {
    try { var x = new URL(u); return x.protocol === 'https:' && /(^|\.)stripe\.com$/.test(x.hostname) ? x.href : null; } catch (e) { return null; }
  }
  function draftGet(k) { try { return localStorage.getItem('mada_learn_draft_' + k) || ''; } catch (e) { return ''; } }
  function draftSet(k, v) { try { if (v) localStorage.setItem('mada_learn_draft_' + k, v); else localStorage.removeItem('mada_learn_draft_' + k); } catch (e) {} }

  function post(path, body, ms) {
    var h = { 'content-type': 'application/json', apikey: KEY };
    if (token) h.authorization = 'Bearer ' + token;
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 20000) : null;
    return fetch(API + path, { method: 'POST', headers: h, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined }).then(function (r) {
      if (t) clearTimeout(t);
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, ok: r.ok, json: j }; });
    }, function () { if (t) clearTimeout(t); return { status: 0, ok: false, json: {} }; });
  }
  function fn(name, body, ms) { return post('/functions/v1/' + name, body, ms); }
  function errText(r, fallback) {
    var m = r && r.json && r.json.error && r.json.error.message;
    if (r.status === 0) return 'Could not reach the server. Check your connection and try again.';
    return m || fallback || 'Something went wrong. Try again shortly.';
  }
  function expired() {
    return S.recover(API, KEY).then(function (ok) {
      if (ok) { location.reload(); return; }
      S.clear(); token = null; signIn('Your session expired. Sign in again.');
    });
  }
  function spin(msg) {
    clear(app);
    var box = el('div', 'mada-loader'); box.setAttribute('role', 'status');
    var ring = el('div', 'mada-loader-ring'); ring.setAttribute('aria-hidden', 'true');
    add(box, ring, el('p', 'muted', msg));
    app.appendChild(box);
  }
  function failed(retry, msg) {
    clear(app);
    var box = el('div', 'mada-loader'); box.setAttribute('role', 'alert');
    add(box, el('h2', null, 'That took longer than expected'), el('p', 'muted', msg || 'We could not load your course. Check your connection and try again.'), btn('Try again', 'btn btn-primary', retry));
    app.appendChild(box);
  }

  // ---------------------------------------------------------------- sign in (a new email creates an account: modules 1 and 2 are free)
  function signIn(msg) {
    clear(app);
    var form = el('form', 'rp-form card mx-card');
    add(form, el('h3', null, 'Sign in to start the course'),
      el('p', 'muted', msg || 'Enter your email and we will send you a one-time code. New here? The same step creates your account. Modules 1 and 2 are free.'));
    var input = el('input'); input.type = 'email'; input.required = true; input.autocomplete = 'email'; input.placeholder = 'you@example.com';
    input.setAttribute('aria-label', 'Email address');
    var go = el('button', 'btn btn-primary', 'Email me a code'); go.type = 'submit';
    add(form, input, go);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); go.disabled = true; email = input.value.trim();
      post('/auth/v1/otp', { email: email, create_user: true }).then(function (r) {
        if (r.status === 429) return signIn('Please wait a minute before asking for another code, then try again.');
        if (!r.ok) return signIn('Could not send a code. Check the email address and try again.');
        codeForm();
      });
    });
    app.appendChild(form);
  }
  function codeForm() {
    clear(app);
    var form = el('form', 'rp-form card mx-card');
    add(form, el('h3', null, 'Enter your code'), el('p', 'muted', 'We emailed a code to ' + email + '. It can take a minute to arrive.'));
    var input = el('input'); input.type = 'text'; input.inputMode = 'numeric'; input.required = true; input.autocomplete = 'one-time-code';
    input.setAttribute('aria-label', 'One-time code');
    var go = el('button', 'btn btn-primary', 'Continue'); go.type = 'submit';
    add(form, input, go);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); go.disabled = true;
      post('/auth/v1/verify', { type: 'email', email: email, token: input.value.trim() }).then(function (r) {
        if (!r.ok) return signIn('That code did not work. Request a new one.');
        token = r.json.access_token; S.save(token, email, r.json.refresh_token, r.json.expires_in); load();
      });
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- loading the dashboard
  function load() {
    spin('Loading your course…');
    fn('learn-state', { action: 'get' }).then(function (r) {
      if (r.status === 401) return expired();
      if (!r.ok) return failed(load);
      dash = r.json; moduleCache = {};
      if (!dash.level) return levelPicker(false);
      home();
    });
  }

  // ---------------------------------------------------------------- level
  var LEVELS = [
    { id: 'beginner', title: 'Beginner', text: 'New to case interviews, or only a little practice so far.' },
    { id: 'intermediate', title: 'Intermediate', text: 'You know the basics but struggle with structure, numbers or the final answer.' },
    { id: 'experienced', title: 'Experienced', text: 'You have done cases and want to sharpen the fundamentals.' },
  ];
  function levelPicker(changing) {
    clear(app);
    var wrap = el('div', 'ln-level');
    add(wrap, el('h2', null, changing ? 'Change your level' : 'Where are you starting from?'),
      el('p', 'muted', 'This adjusts the explanations, the examples and how demanding the exercises are. You can change it any time.'));
    var grid = el('div', 'ln-level-grid');
    LEVELS.forEach(function (l) {
      var card = el('button', 'card ln-level-card' + (dash && dash.level === l.id ? ' is-current' : ''));
      card.type = 'button';
      add(card, el('h3', null, l.title), el('p', 'muted', l.text));
      card.addEventListener('click', function () {
        card.disabled = true;
        fn('learn-state', { action: 'set_level', level: l.id }).then(function (r) {
          if (r.status === 401) return expired();
          if (!r.ok) { card.disabled = false; return window.alert(errText(r)); }
          load();
        });
      });
      grid.appendChild(card);
    });
    add(wrap, grid);
    if (changing) add(wrap, btn('Back to the course', 'btn btn-ghost', home));
    app.appendChild(wrap);
  }

  // ---------------------------------------------------------------- dashboard
  function levelLabel(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i].title; return ''; }

  function home() {
    clear(app);
    var done = dash.modules.filter(function (m) { return m.completed; }).length;
    var total = dash.modules.length;

    var bar = el('div', 'ln-bar');
    add(bar, el('span', 'muted small', 'Signed in as ' + email + ' · ' + levelLabel(dash.level) + ' level'),
      btn('Change level', 'btn btn-ghost btn-sm', function () { levelPicker(true); }),
      btn('Sign out', 'btn btn-ghost btn-sm', function () { S.clear(); token = null; dash = null; signIn(); }));
    app.appendChild(bar);

    // progress
    var prog = el('div', 'card ln-progress');
    add(prog, el('h3', null, done + ' of ' + total + ' modules complete'));
    var track = el('div', 'ln-track'); track.setAttribute('role', 'progressbar'); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(total)); track.setAttribute('aria-valuenow', String(done));
    var fill = el('div', 'ln-fill'); fill.style.width = Math.round(done / total * 100) + '%'; track.appendChild(fill);
    add(prog, track, el('p', 'muted small', 'Completing modules unlocks the Mini Case Challenge. Your Case Readiness Score comes from the quality of your work, not from how many modules you finish.'));
    app.appendChild(prog);

    if (!dash.entitlement.full) app.appendChild(upgradeCard());

    // journey
    var journey = el('ol', 'ln-journey');
    ['Learn the fundamentals', 'Practise individual skills', 'Complete a mini case', 'Attempt a full AI mock interview', 'Improve with feedback'].forEach(function (t, i) {
      var li = el('li'); add(li, el('span', 'ln-j-n', String(i + 1)), el('span', null, t)); journey.appendChild(li);
    });
    app.appendChild(journey);

    // modules
    var list = el('div', 'ln-modules');
    dash.modules.forEach(function (m, i) { list.appendChild(moduleCard(m, i)); });
    list.appendChild(miniCard());
    app.appendChild(list);

    var practise = el('p', 'muted ln-practise');
    practise.appendChild(document.createTextNode('Between modules, build your calculation speed in '));
    var a = el('a', null, 'Case Math Mastery'); a.href = MATHS; practise.appendChild(a);
    practise.appendChild(document.createTextNode('.'));
    app.appendChild(practise);

    if (dash.readiness && dash.readiness.overall !== null && dash.mini.finished) app.appendChild(readinessCard(dash.readiness, dash.mini.result));
    app.appendChild(rubricBox());
  }

  function statusPill(m) {
    if (m.completed) return el('span', 'ai-pill live', 'Completed');
    if (m.locked) return el('span', 'ai-pill soon', 'Included with Unlimited Interviews');
    return el('span', 'ai-pill best', m.free ? 'Free' : 'Open');
  }
  function moduleCard(m, i) {
    var card = el('article', 'card ln-module' + (m.locked ? ' is-locked' : ''));
    var head = el('div', 'ln-module-head');
    add(head, el('span', 'ai-num', ('0' + (i + 1)).slice(-2)), statusPill(m));
    add(card, head, el('h3', null, m.title), el('p', 'muted', m.objective), el('p', 'small muted', 'About ' + m.minutes + ' minutes'));
    if (m.locked) {
      add(card, btn('See what unlocks it', 'btn btn-ghost btn-sm', function () { var u = document.getElementById('ln-upgrade'); if (u) { u.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }));
    } else {
      add(card, btn(m.completed ? 'Review module' : (m.attempted ? 'Continue' : 'Start module'), 'btn btn-primary btn-sm', function () { openModule(m.key); }));
    }
    return card;
  }
  function miniCard() {
    var m = dash.mini;
    var card = el('article', 'card ln-module ln-mini' + (m.unlocked ? '' : ' is-locked'));
    var head = el('div', 'ln-module-head');
    add(head, el('span', 'ai-num', '★'), m.finished ? el('span', 'ai-pill live', 'Finished') : (m.unlocked ? el('span', 'ai-pill best', 'Unlocked') : el('span', 'ai-pill soon', 'Locked')));
    add(card, head, el('h3', null, 'Mini Case Challenge'),
      el('p', 'muted', 'A guided 10 to 15 minute case: questions, structure, two calculations, interpretation and a recommendation. It gives you your Case Readiness Score.'));
    if (m.unlocked) {
      add(card, btn(m.finished ? 'See my result' : (m.started ? 'Continue the case' : 'Start the case'), 'btn btn-primary btn-sm', function () { miniOpen(); }));
    } else {
      add(card, el('p', 'small muted', dash.entitlement.full ? 'Complete all six modules to unlock it.' : 'Needs Unlimited Interviews and all six modules complete.'));
    }
    return card;
  }
  function upgradeCard() {
    var card = el('div', 'card mx-card ln-upgrade'); card.id = 'ln-upgrade';
    add(card, el('span', 'tag', 'Full course'), el('h3', null, 'Modules 3 to 6 and the Mini Case Challenge'),
      el('p', 'muted', 'Modules 1 and 2 are free. The rest of the course, with AI feedback on every exercise and your Case Readiness Score, is included with Unlimited Interviews at $' + PASS_PRICE + ' a month.'));
    var ul = el('ul');
    ['Structuring, numbers, business judgment and your final recommendation, taught step by step.', 'Specific AI feedback on every exercise, with hints and model answers.', 'Unlimited AI case interviews and Case Math Mastery in the same subscription.'].forEach(function (t) { ul.appendChild(el('li', null, t)); });
    var note = el('p', 'muted small');
    var go = btn('Get Unlimited Interviews, $' + PASS_PRICE + '/month', 'btn btn-primary', function () {
      go.disabled = true;
      fn('pass-access', { action: 'checkout' }).then(function (r) {
        if (r.status === 401) return expired();
        if (r.status === 409) return load();
        var u = r.ok && stripeUrl(r.json.url);
        if (u) { location.href = u; return; }
        go.disabled = false;
        note.textContent = r.status === 503 ? 'Payments are not available right now. Please try again later.' : 'Could not open the payment page. You have not been charged. Try again shortly.';
      });
    });
    var terms = el('p', 'muted small');
    terms.appendChild(document.createTextNode('Billed monthly and renews automatically. Cancel any time before your next billing date. See the '));
    var a1 = el('a', null, 'terms'); a1.href = TERMS; terms.appendChild(a1);
    terms.appendChild(document.createTextNode(' and '));
    var a2 = el('a', null, 'refund policy'); a2.href = REFUNDS; terms.appendChild(a2);
    terms.appendChild(document.createTextNode('.'));
    add(card, ul, go, note, terms);
    return card;
  }
  function rubricBox() {
    var d = document.createElement('details'); d.className = 'ln-rubric';
    var s = el('summary', null, 'How your Case Readiness Score works'); d.appendChild(s);
    var ol = el('ul');
    ((dash.rubric && dash.rubric.steps) || []).forEach(function (t) { ol.appendChild(el('li', null, t)); });
    d.appendChild(ol);
    return d;
  }

  // ---------------------------------------------------------------- readiness
  function dimBars(dims) {
    var wrap = el('div', 'ln-dims');
    dims.forEach(function (d) {
      var row = el('div', 'ln-dim');
      var label = el('span', 'ln-dim-label', d.label);
      var t = el('div', 'ln-track small'); var f = el('div', 'ln-fill'); f.style.width = (d.score === null ? 0 : Math.max(2, d.score)) + '%'; t.appendChild(f);
      add(row, label, t, el('span', 'ln-dim-score', d.score === null ? 'No evidence yet' : String(Math.round(d.score))));
      wrap.appendChild(row);
    });
    return wrap;
  }
  function readinessCard(r, result) {
    var card = el('div', 'card ln-readiness');
    add(card, el('p', 'eyebrow', 'Your latest result'));
    var big = el('div', 'ln-score'); add(big, el('span', 'ln-score-n', String(Math.round(r.overall))), el('span', 'ln-score-of', '/ 100'));
    add(card, big, el('h3', null, r.band ? r.band.label : ''), el('p', 'muted', r.band ? r.band.note : ''), dimBars(r.dimensions));
    return card;
  }

  // ---------------------------------------------------------------- module page
  function openModule(key) {
    spin('Opening the module…');
    fn('learn-state', { action: 'module', module: key }).then(function (r) {
      if (r.status === 401) return expired();
      if (r.status === 403) { load(); return; }
      if (!r.ok) return failed(function () { openModule(key); }, errText(r));
      moduleCache[key] = r.json.module; showModule(key);
    });
  }
  function infoFor(key) { for (var i = 0; i < dash.modules.length; i++) if (dash.modules[i].key === key) return dash.modules[i]; return null; }

  function showModule(key) {
    var m = moduleCache[key], info = infoFor(key);
    clear(app);
    var nav = el('div', 'ln-bar');
    add(nav, btn('← All modules', 'btn btn-ghost btn-sm', function () { load(); }), el('span', 'muted small', 'About ' + m.minutes + ' minutes'));
    app.appendChild(nav);
    add(app, el('h2', 'ln-title', m.title), el('p', 'lede', m.objective));

    var body = el('div', 'ln-body');
    m.blocks.forEach(function (b) { var n = block(b); if (n) body.appendChild(n); });
    app.appendChild(body);

    m.exercises.forEach(function (ex) { app.appendChild(exerciseCard(key, ex)); });

    var foot = el('div', 'card ln-complete');
    var attempted = m.exercises.every(function (e) { return dash.exercises[e.key]; });
    var complete = btn(info && info.completed ? 'Completed. Back to the course' : 'Mark module complete', 'btn btn-primary', function () {
      if (info && info.completed) return load();
      complete.disabled = true;
      fn('learn-state', { action: 'complete', module: key }).then(function (r) {
        if (r.status === 401) return expired();
        if (!r.ok) { complete.disabled = false; note.textContent = errText(r); return; }
        load();
      });
    });
    var note = el('p', 'muted small', attempted ? 'You can still retry the exercise afterwards.' : 'Try the exercise first. Completing a module needs at least one attempt.');
    complete.disabled = !attempted && !(info && info.completed);
    foot.appendChild(el('h3', null, 'Finished this module?'));
    add(foot, complete, note);
    app.appendChild(foot);
    app.appendChild(chatBox(key));
  }

  function block(b) {
    if (b.type === 'p') return paragraphs(b.text);
    if (b.type === 'callout') { var c = el('div', 'ln-callout'); c.appendChild(paragraphs(b.text, 'ln-text')); return c; }
    if (b.type === 'list') {
      var w = el('div', 'ln-block'); if (b.title) w.appendChild(el('h4', null, b.title));
      var ul = el('ul'); b.items.forEach(function (t) { ul.appendChild(el('li', null, t)); }); w.appendChild(ul); return w;
    }
    if (b.type === 'steps') {
      var s = el('div', 'ln-block'); if (b.title) s.appendChild(el('h4', null, b.title));
      var ol = el('ol', 'ln-steps');
      b.items.forEach(function (it) { var li = el('li'); add(li, el('b', null, it.title), el('span', null, ' ' + it.text)); ol.appendChild(li); });
      s.appendChild(ol); return s;
    }
    if (b.type === 'twocol') {
      var t = el('div', 'ln-block'); if (b.title) t.appendChild(el('h4', null, b.title));
      var g = el('div', 'ln-two');
      [['ln-col weak', b.left], ['ln-col strong', b.right]].forEach(function (p) {
        var col = el('div', p[0]); add(col, el('b', 'ln-col-h', p[1].heading), paragraphs(p[1].text)); g.appendChild(col);
      });
      t.appendChild(g); return t;
    }
    if (b.type === 'example') { var e = el('div', 'ln-example'); add(e, el('b', 'ln-col-h', 'Worked example: ' + b.title), paragraphs(b.text)); return e; }
    if (b.type === 'quiz') return quiz(b);
    return null;
  }

  function quiz(b) {
    var box = el('div', 'ln-quiz');
    add(box, el('b', 'ln-col-h', 'Quick check'), el('p', 'ln-q', b.question));
    var out = el('p', 'ln-quiz-out'); out.setAttribute('aria-live', 'polite');
    var opts = el('div', 'ln-opts');
    b.options.forEach(function (o, i) {
      var ob = btn(o, 'ln-opt', function () {
        var all = opts.querySelectorAll('.ln-opt');
        for (var k = 0; k < all.length; k++) { all[k].disabled = true; if (k === b.answer) all[k].classList.add('is-right'); }
        if (i !== b.answer) ob.classList.add('is-wrong');
        out.textContent = (i === b.answer ? 'Correct. ' : 'Not quite. ') + b.why;
      });
      opts.appendChild(ob);
    });
    add(box, opts, out);
    return box;
  }

  // ---------------------------------------------------------------- calculator (no eval: a small parser)
  function calc(expr) {
    var s = String(expr).replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '').replace(/\s+/g, '');
    if (!s) return null;
    var i = 0;
    function num() {
      var m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)); if (!m) throw new Error('number');
      i += m[0].length; var v = parseFloat(m[0]);
      while (s[i] === '%') { v = v / 100; i++; }
      return v;
    }
    function atom() {
      if (s[i] === '(') { i++; var v = expr1(); if (s[i] !== ')') throw new Error('paren'); i++; while (s[i] === '%') { v = v / 100; i++; } return v; }
      if (s[i] === '-') { i++; return -atom(); }
      if (s[i] === '+') { i++; return atom(); }
      return num();
    }
    function pow() { var b = atom(); if (s[i] === '^') { i++; return Math.pow(b, pow()); } return b; }
    function term() {
      var v = pow();
      while (s[i] === '*' || s[i] === '/') { var op = s[i++]; var r = pow(); if (op === '/' && r === 0) throw new Error('zero'); v = op === '*' ? v * r : v / r; }
      return v;
    }
    function expr1() { var v = term(); while (s[i] === '+' || s[i] === '-') { var op = s[i++]; var r = term(); v = op === '+' ? v + r : v - r; } return v; }
    var out = expr1(); if (i !== s.length || !isFinite(out)) throw new Error('syntax');
    return out;
  }
  function fmtNum(n) {
    if (Math.abs(n) >= 1e15 || (Math.abs(n) > 0 && Math.abs(n) < 1e-6)) return n.toExponential(4);
    return (Math.round(n * 1e6) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
  function scratchpad() {
    var d = document.createElement('details'); d.className = 'ln-tool';
    d.appendChild(el('summary', null, 'Calculator'));
    var row = el('div', 'ln-calc');
    var input = el('input'); input.type = 'text'; input.placeholder = 'e.g. 1.5m x 25% x 24 x 150'; input.setAttribute('aria-label', 'Calculation'); input.inputMode = 'text';
    var out = el('output', 'ln-calc-out'); out.setAttribute('aria-live', 'polite');
    var hist = el('ul', 'ln-calc-hist');
    function run() {
      var raw = input.value.replace(/(\d+\.?\d*|\.\d+)\s*([kKmMbB])(?![a-zA-Z])/g, function (_, n, u) { return '(' + n + '*' + ({ k: 1e3, m: 1e6, b: 1e9 })[u.toLowerCase()] + ')'; }).replace(/[xX]/g, '*');
      try {
        var v = calc(raw); if (v === null) return;
        out.textContent = '= ' + fmtNum(v);
        var li = el('li', null, input.value + '  ' + out.textContent); hist.insertBefore(li, hist.firstChild);
        while (hist.children.length > 5) hist.removeChild(hist.lastChild);
      } catch (e) { out.textContent = 'Check the calculation'; }
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    add(row, input, btn('Calculate', 'btn btn-ghost btn-sm', run));
    add(d, row, out, hist, el('p', 'muted small', 'Use + - x / ( ) % and k, m, b for thousands, millions, billions. Nothing here is saved or sent.'));
    return d;
  }

  // ---------------------------------------------------------------- outline helper
  function outlineTools(ta) {
    var row = el('div', 'ln-outline');
    function lineRange() {
      var v = ta.value, a = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, e = v.indexOf('\n', ta.selectionEnd); if (e < 0) e = v.length;
      return [a, e];
    }
    function shift(dir) {
      var r = lineRange(), v = ta.value, chunk = v.slice(r[0], r[1]);
      var out = chunk.split('\n').map(function (ln) { return dir > 0 ? '   ' + ln : ln.replace(/^( {1,3}|\t)/, ''); }).join('\n');
      ta.value = v.slice(0, r[0]) + out + v.slice(r[1]);
      ta.setSelectionRange(r[0], r[0] + out.length); ta.focus(); ta.dispatchEvent(new Event('input'));
    }
    add(row, btn('Indent', 'btn btn-ghost btn-sm', function () { shift(1); }), btn('Outdent', 'btn btn-ghost btn-sm', function () { shift(-1); }),
      el('span', 'muted small', 'Select the lines for a branch, then indent it under its parent.'));
    return row;
  }

  // ---------------------------------------------------------------- exercise
  function exerciseCard(modKey, ex) {
    var card = el('section', 'card ln-exercise');
    var saved = dash.exercises[ex.key];
    add(card, el('p', 'eyebrow', 'Exercise'), el('h3', null, ex.title), paragraphs(ex.prompt, 'ln-prompt'));

    if (ex.table) {
      var tb = el('table', 'ln-table'); tb.appendChild(el('caption', null, ex.table.caption));
      var thead = el('thead'), hr = el('tr'); ex.table.head.forEach(function (h) { hr.appendChild(el('th', null, h)); }); thead.appendChild(hr); tb.appendChild(thead);
      var tbody = el('tbody'); ex.table.rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', null, c)); }); tbody.appendChild(tr); }); tb.appendChild(tbody);
      card.appendChild(tb);
    }
    if (ex.tools.indexOf('scratchpad') >= 0) card.appendChild(scratchpad());

    var inputs = {};   // field id -> textarea
    var form = el('div', 'ln-fields');
    var single = null;
    if (ex.fields) {
      ex.fields.forEach(function (f) {
        var lab = el('label', 'ln-field'); lab.appendChild(el('span', 'ln-field-l', f.label));
        if (f.hint) lab.appendChild(el('span', 'muted small', f.hint));
        var ta = el('textarea'); ta.rows = f.rows || 3; ta.maxLength = 2500;
        var d = draftGet(ex.key + '.' + f.id); if (d) ta.value = d;
        ta.addEventListener('input', function () { draftSet(ex.key + '.' + f.id, ta.value); });
        lab.appendChild(ta); form.appendChild(lab); inputs[f.id] = ta;
      });
    } else {
      var lab = el('label', 'ln-field'); lab.appendChild(el('span', 'ln-field-l', 'Your answer'));
      single = el('textarea'); single.rows = ex.tools.indexOf('tree') >= 0 ? 12 : 8; single.maxLength = 6000;
      if (ex.placeholder) single.placeholder = ex.placeholder;
      var d2 = draftGet(ex.key) || (saved && saved.latest ? '' : ''); if (d2) single.value = d2;
      single.addEventListener('input', function () { draftSet(ex.key, single.value); });
      if (ex.tools.indexOf('tree') >= 0) lab.appendChild(outlineTools(single));
      lab.appendChild(single); form.appendChild(lab);
    }
    card.appendChild(form);

    var status = el('p', 'ln-status muted small'); status.setAttribute('aria-live', 'polite');
    var result = el('div', 'ln-feedback');
    var hintBox = el('div', 'ln-hints');
    var model = el('div', 'ln-model');
    var hintsShown = 0;

    var send = btn(saved ? 'Get feedback on a new attempt' : 'Get feedback', 'btn btn-primary', function () {
      var payload = { action: 'feedback', exercise: ex.key };
      if (ex.fields) { var o = {}; ex.fields.forEach(function (f) { o[f.id] = inputs[f.id].value; }); payload.fields = o; } else { payload.submission = single.value; }
      send.disabled = true; status.textContent = 'Your tutor is reading your answer. This usually takes 15 to 40 seconds…';
      fn('learn-tutor', payload, 90000).then(function (r) {
        send.disabled = false;
        if (r.status === 401) return expired();
        if (!r.ok) { status.textContent = errText(r, 'The tutor could not answer just now. Your work is kept; try again.'); return; }
        status.textContent = 'Attempt ' + r.json.attempt_no + ' saved.';
        dash.exercises[ex.key] = { count: r.json.attempt_no, latest: { attempt_no: r.json.attempt_no, feedback: r.json.feedback } };
        showFeedback(result, r.json.feedback, r.json.attempt_no);
        send.textContent = 'Get feedback on a new attempt';
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        refreshComplete();
      });
    });
    var hintBtn = btn('Give me a hint', 'btn btn-ghost', function () {
      if (hintsShown >= ex.hints.length) { status.textContent = 'That is all the hints. Try the model answer if you are stuck.'; return; }
      hintBox.appendChild(el('p', 'ln-hint', 'Hint ' + (hintsShown + 1) + ': ' + ex.hints[hintsShown])); hintsShown++;
      if (hintsShown >= ex.hints.length) hintBtn.textContent = 'No more hints';
    });
    var reveal = btn('Show the model answer', 'btn btn-ghost', function () {
      var tried = !!dash.exercises[ex.key];
      if (!tried && !window.confirm('You have not tried this yet. You will learn more if you attempt it first. Show the model answer anyway?')) return;
      reveal.disabled = true;
      fn('learn-state', { action: 'reveal', exercise: ex.key, explicit: !tried }).then(function (r) {
        reveal.disabled = false;
        if (r.status === 401) return expired();
        if (!r.ok) { status.textContent = errText(r); return; }
        clear(model); add(model, el('h4', null, 'Model answer'), paragraphs(r.json.modelAnswer, 'ln-text'), el('p', 'muted small', 'Yours does not need to match it word for word. Look at the structure and the reasoning.'));
      });
    });
    add(card, el('div', 'btn-row ln-actions'), status);
    card.querySelector('.ln-actions').appendChild(send); card.querySelector('.ln-actions').appendChild(hintBtn); card.querySelector('.ln-actions').appendChild(reveal);
    add(card, hintBox, result, model);

    if (saved && saved.latest && saved.latest.feedback) {
      showFeedback(result, saved.latest.feedback, saved.latest.attempt_no, true);
      if (saved.latest.submission) {
        var d3 = document.createElement('details'); d3.className = 'ln-last';
        d3.appendChild(el('summary', null, 'Your last attempt'));
        d3.appendChild(paragraphs(saved.latest.submission, 'ln-text')); result.appendChild(d3);
      }
    }
    return card;
  }
  function refreshComplete() {
    // Enable "Mark module complete" once every exercise has an attempt.
    var cur = document.querySelector('.ln-complete button.btn-primary');
    if (!cur) return;
    for (var key in moduleCache) {
      var m = moduleCache[key]; if (!m) continue;
      var ok = m.exercises.every(function (e) { return dash.exercises[e.key]; });
      var info = infoFor(key); if (info) info.attempted = ok;
    }
    cur.disabled = false;
  }
  function showFeedback(box, f, n, resumed) {
    clear(box);
    var head = el('h4', null, (resumed ? 'Feedback on attempt ' : 'Feedback on attempt ') + n);
    add(box, head, el('p', 'ln-summary', f.summary));
    if (f.dimensions && f.dimensions.length) {
      var chips = el('div', 'ln-chips');
      f.dimensions.forEach(function (d) {
        var c = el('div', 'ln-chip'); add(c, el('b', null, d.label), el('span', null, d.rating || 'Not enough to judge'), d.note ? el('small', 'muted', d.note) : null); chips.appendChild(c);
      });
      box.appendChild(chips);
    }
    function listBlock(title, items, cls) {
      if (!items || !items.length) return;
      var w = el('div', 'ln-fb-list ' + cls); w.appendChild(el('b', null, title)); var ul = el('ul'); items.forEach(function (t) { ul.appendChild(el('li', null, t)); }); w.appendChild(ul); box.appendChild(w);
    }
    listBlock('What worked', f.strengths, 'good'); listBlock('To improve', f.improvements, 'todo');
    if (f.nextHint) add(box, el('p', 'ln-hint', 'A nudge: ' + f.nextHint));
    if (f.followUp) add(box, el('p', 'ln-follow', 'Think about this: ' + f.followUp));
  }

  // ---------------------------------------------------------------- tutor chat
  function chatBox(key) {
    var d = document.createElement('details'); d.className = 'card ln-chat';
    d.appendChild(el('summary', null, 'Ask the tutor a question about this module'));
    var log = el('div', 'ln-chat-log'); log.setAttribute('aria-live', 'polite');
    var hist = chatHistory[key] = chatHistory[key] || [];
    function draw(role, text) { var m = el('div', 'ln-msg ' + role); m.appendChild(paragraphs(text, 'ln-text')); log.appendChild(m); log.scrollTop = log.scrollHeight; }
    hist.forEach(function (t) { draw(t.role, t.content); });
    var form = el('form', 'ln-chat-form');
    var ta = el('textarea'); ta.rows = 2; ta.maxLength = 800; ta.placeholder = 'For example: how do I know which branch to start with?'; ta.setAttribute('aria-label', 'Your question');
    var go = el('button', 'btn btn-primary btn-sm', 'Ask'); go.type = 'submit';
    var note = el('p', 'muted small', 'The tutor gives hints rather than doing the exercise for you.');
    add(form, ta, go);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = ta.value.trim(); if (!q) return;
      go.disabled = true; draw('user', q); ta.value = '';
      var pending = el('div', 'ln-msg assistant muted', 'Thinking…'); log.appendChild(pending);
      fn('learn-tutor', { action: 'chat', module: key, message: q, history: hist.slice(-8) }, 60000).then(function (r) {
        go.disabled = false; log.removeChild(pending);
        if (r.status === 401) return expired();
        if (!r.ok) { draw('assistant', errText(r, 'The tutor could not answer just now. Try again.')); return; }
        hist.push({ role: 'user', content: q }); hist.push({ role: 'assistant', content: r.json.reply }); draw('assistant', r.json.reply);
      });
    });
    add(d, log, form, note);
    return d;
  }

  // ---------------------------------------------------------------- Mini Case Challenge
  var mini = null;   // working state of the case in this page: { stage: 0..4, saved: {...} }
  function miniOpen() {
    var m = dash.mini;
    if (m.finished) return miniResult(m.result, true);
    if (!m.started) {
      clear(app);
      var c = el('div', 'card mx-card');
      add(c, el('h3', null, m.title), paragraphs(m.case.intro), el('p', 'muted', 'About ' + m.case.minutes + ' minutes, in five short stages. Guidance is minimal here: this is where you show what you have learned. Your Case Readiness Score comes from this and your exercises.'),
        btn('Start the case', 'btn btn-primary', function () { miniStart(); }), btn('Back', 'btn btn-ghost', home));
      app.appendChild(c); return;
    }
    mini = { stage: firstOpenStage(), saved: m.saved }; miniStage();
  }
  function miniStart() {
    spin('Starting the case…');
    fn('learn-tutor', { action: 'mini_start' }, 30000).then(function (r) {
      if (r.status === 401) return expired();
      if (!r.ok) return failed(load, errText(r));
      fn('learn-state', { action: 'get' }).then(function (g) { if (g.ok) dash = g.json; dash.mini.started = true; mini = { stage: 0, saved: dash.mini.saved }; miniStage(); });
    });
  }
  function firstOpenStage() {
    var s = dash.mini.saved;
    if (!s.framework) return (s.questions && s.questions.length) ? 1 : 0;
    if (!s.quant) return 2; if (!s.interpret) return 3; return 4;
  }
  function stageHeader(i) {
    var c = dash.mini.case;
    var nav = el('div', 'ln-bar'); add(nav, btn('← Course', 'btn btn-ghost btn-sm', function () { load(); }), el('span', 'muted small', 'Stage ' + (i + 1) + ' of ' + c.stages.length));
    app.appendChild(nav);
    var dots = el('ol', 'ln-stages');
    c.stages.forEach(function (s, k) { var li = el('li', k === i ? 'is-now' : (k < i ? 'is-done' : '')); li.textContent = s.title; dots.appendChild(li); });
    add(app, dots, el('h2', 'ln-title', dash.mini.title), paragraphs(c.intro, 'ln-prompt'));
    var st = c.stages[i]; add(app, el('h3', null, st.title), el('p', 'lede', st.instruction));
  }
  function miniStage() {
    clear(app); var c = dash.mini.case, i = mini.stage;
    stageHeader(i);
    var key = c.stages[i].key;
    if (key === 'clarify') return miniClarify();
    if (key === 'framework') return miniText('framework', true);
    if (key === 'quant') return miniQuant();
    if (key === 'interpret') return miniFields('interpret', c.interpretFields);
    if (key === 'recommend') return miniFields('recommend', c.recommendFields);
  }
  function miniNext() { mini.stage = Math.min(mini.stage + 1, dash.mini.case.stages.length - 1); miniStage(); top(); }
  function miniPrev(box) { if (mini.stage > 0) box.appendChild(btn('Back', 'btn btn-ghost', function () { mini.stage--; miniStage(); top(); })); }

  function miniClarify() {
    var qs = (mini.saved.questions || []).slice(), left = dash.mini.maxQuestions - qs.length;
    var log = el('div', 'ln-chat-log'); log.setAttribute('aria-live', 'polite');
    function draw(role, text) { var m = el('div', 'ln-msg ' + role); m.appendChild(paragraphs(text, 'ln-text')); log.appendChild(m); }
    qs.forEach(function (q) { draw('user', q.q); draw('assistant', q.a); });
    var counter = el('p', 'muted small', left + ' question' + (left === 1 ? '' : 's') + ' left');
    var form = el('form', 'ln-chat-form');
    var ta = el('textarea'); ta.rows = 2; ta.maxLength = 300; ta.placeholder = 'One specific question…'; ta.setAttribute('aria-label', 'Your question');
    var go = el('button', 'btn btn-primary btn-sm', 'Ask'); go.type = 'submit';
    var note = el('p', 'muted small');
    add(form, ta, go);
    if (left <= 0) { form.hidden = true; counter.textContent = 'You have asked all your questions.'; }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var q = ta.value.trim(); if (q.length < 3) return;
      go.disabled = true; note.textContent = '';
      fn('learn-tutor', { action: 'mini_ask', question: q }, 60000).then(function (r) {
        go.disabled = false;
        if (r.status === 401) return expired();
        if (!r.ok) { note.textContent = errText(r); return; }
        draw('user', q); draw('assistant', r.json.answer); ta.value = '';
        qs.push({ q: q, a: r.json.answer }); mini.saved.questions = qs;
        left = r.json.remaining; counter.textContent = left + ' question' + (left === 1 ? '' : 's') + ' left';
        if (left <= 0) { form.hidden = true; counter.textContent = 'You have asked all your questions.'; }
      });
    });
    var row = el('div', 'btn-row'); add(row, btn('Done asking', 'btn btn-primary', miniNext)); miniPrev(row);
    add(app, log, counter, form, note, row);
  }
  function miniText(stage, tree) {
    var lab = el('label', 'ln-field'); lab.appendChild(el('span', 'ln-field-l', 'Your structure'));
    var ta = el('textarea'); ta.rows = 12; ta.maxLength = 4000; ta.value = mini.saved[stage] || draftGet('mini.' + stage);
    ta.placeholder = '1. First main branch\n   - sub-branch\n2. Second main branch\n\nHypothesis: ...\nI would start with: ... because ...';
    ta.addEventListener('input', function () { draftSet('mini.' + stage, ta.value); });
    if (tree) lab.appendChild(outlineTools(ta));
    lab.appendChild(ta);
    var note = el('p', 'ln-status muted small'); note.setAttribute('aria-live', 'polite');
    var row = el('div', 'btn-row');
    var save = btn('Save and continue', 'btn btn-primary', function () {
      save.disabled = true;
      fn('learn-tutor', { action: 'mini_save', stage: stage, data: ta.value }, 30000).then(function (r) {
        save.disabled = false;
        if (r.status === 401) return expired();
        if (!r.ok) { note.textContent = errText(r); return; }
        mini.saved[stage] = ta.value.trim(); draftSet('mini.' + stage, ''); miniNext();
      });
    });
    add(row, save); miniPrev(row); add(app, lab, note, row);
  }
  function dataPack() {
    var t = dash.mini.case.dataPack, tb = el('table', 'ln-table'); tb.appendChild(el('caption', null, t.caption));
    var thead = el('thead'), hr = el('tr'); t.head.forEach(function (h) { hr.appendChild(el('th', null, h)); }); thead.appendChild(hr); tb.appendChild(thead);
    var tbody = el('tbody'); t.rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', null, c)); }); tbody.appendChild(tr); }); tb.appendChild(tbody);
    return tb;
  }
  function miniQuant() {
    var q = mini.saved.quant || {};
    app.appendChild(dataPack()); app.appendChild(scratchpad());
    var rev = el('input'); rev.type = 'text'; rev.inputMode = 'decimal'; rev.value = q.revenue_m != null ? q.revenue_m : draftGet('mini.rev');
    var pay = el('input'); pay.type = 'text'; pay.inputMode = 'decimal'; pay.value = q.payback_years != null ? q.payback_years : draftGet('mini.pay');
    var work = el('textarea'); work.rows = 5; work.maxLength = 2500; work.value = q.working || draftGet('mini.work');
    function keep() { draftSet('mini.rev', rev.value); draftSet('mini.pay', pay.value); draftSet('mini.work', work.value); }
    [rev, pay, work].forEach(function (n) { n.addEventListener('input', keep); });
    function field(label, hint, node) { var l = el('label', 'ln-field'); add(l, el('span', 'ln-field-l', label), el('span', 'muted small', hint), node); return l; }
    var note = el('p', 'ln-status muted small'); note.setAttribute('aria-live', 'polite');
    var row = el('div', 'btn-row');
    var save = btn('Save and continue', 'btn btn-primary', function () {
      save.disabled = true;
      fn('learn-tutor', { action: 'mini_save', stage: 'quant', data: { revenue_m: rev.value, payback_years: pay.value, working: work.value } }, 30000).then(function (r) {
        save.disabled = false;
        if (r.status === 401) return expired();
        if (!r.ok) { note.textContent = errText(r); return; }
        mini.saved.quant = { revenue_m: parseFloat(rev.value), payback_years: parseFloat(pay.value), working: work.value.trim() };
        ['mini.rev', 'mini.pay', 'mini.work'].forEach(function (k) { draftSet(k, ''); }); miniNext();
      });
    });
    add(row, save); miniPrev(row);
    add(app, field('Annual revenue (AED millions)', 'A number such as 2.7', rev), field('Simple payback (years)', 'A number such as 7.5', pay), field('Your working', 'Show the steps.', work), note, row);
  }
  function miniFields(stage, fields) {
    var vals = mini.saved[stage] || {}, inputs = {};
    fields.forEach(function (f) {
      var l = el('label', 'ln-field'); l.appendChild(el('span', 'ln-field-l', f.label));
      var ta = el('textarea'); ta.rows = f.rows || 3; ta.maxLength = 2500; ta.value = vals[f.id] || draftGet('mini.' + stage + '.' + f.id);
      ta.addEventListener('input', function () { draftSet('mini.' + stage + '.' + f.id, ta.value); });
      l.appendChild(ta); app.appendChild(l); inputs[f.id] = ta;
    });
    var note = el('p', 'ln-status muted small'); note.setAttribute('aria-live', 'polite');
    var row = el('div', 'btn-row'); var last = stage === 'recommend';
    var save = btn(last ? 'Save and see my result' : 'Save and continue', 'btn btn-primary', function () {
      var data = {}; fields.forEach(function (f) { data[f.id] = inputs[f.id].value; });
      save.disabled = true;
      fn('learn-tutor', { action: 'mini_save', stage: stage, data: data }, 30000).then(function (r) {
        if (r.status === 401) return expired();
        if (!r.ok) { save.disabled = false; note.textContent = errText(r); return; }
        mini.saved[stage] = data; fields.forEach(function (f) { draftSet('mini.' + stage + '.' + f.id, ''); });
        if (!last) { save.disabled = false; return miniNext(); }
        note.textContent = 'Your tutor is assessing the whole case. This usually takes 30 to 60 seconds…';
        fn('learn-tutor', { action: 'mini_finish' }, 120000).then(function (f) {
          if (f.status === 401) return expired();
          if (!f.ok) { save.disabled = false; note.textContent = errText(f, 'The tutor could not finish just now. Your answers are saved; try again.'); return; }
          fn('learn-state', { action: 'get' }).then(function (g) { if (g.ok) dash = g.json; miniResult(f.json.result, false); });
        });
      });
    });
    add(row, save); miniPrev(row); add(app, note, row);
  }
  function miniResult(res, fromHome) {
    clear(app); top();
    var nav = el('div', 'ln-bar'); add(nav, btn('← Course', 'btn btn-ghost btn-sm', function () { load(); })); app.appendChild(nav);
    var r = res.readiness;
    var head = el('div', 'card ln-readiness');
    add(head, el('p', 'eyebrow', 'Mini Case Challenge result'));
    if (r.overall === null) {
      add(head, el('h3', null, 'Not enough evidence for a score yet'), el('p', 'muted', 'A Case Readiness Score needs evidence in at least five of the six skills. Complete the exercises you skipped, then run the case again.'));
    } else {
      var big = el('div', 'ln-score'); add(big, el('span', 'ln-score-n', String(Math.round(r.overall))), el('span', 'ln-score-of', '/ 100'));
      add(head, big, el('h3', null, r.band.label), el('p', 'muted', r.band.note));
    }
    add(head, el('p', 'ln-summary', res.summary), dimBars(r.dimensions));
    app.appendChild(head);

    var q = el('div', 'card'); q.appendChild(el('h4', null, 'Your numbers'));
    add(q, el('p', null, 'Annual revenue: ' + (res.quant.revenueOk ? 'on target.' : 'not quite right. Check the order of operations: courts x hours x days x occupancy x price.')),
      el('p', null, 'Payback: ' + (res.quant.paybackOk ? 'on target.' : 'not quite right. Payback is the investment divided by annual profit after fixed and variable costs.')));
    app.appendChild(q);

    function list(title, items, strengths) {
      var c = el('div', 'card'); c.appendChild(el('h4', null, title));
      if (!items.length) c.appendChild(el('p', 'muted', 'Nothing to show yet.'));
      items.forEach(function (it) {
        var d = el('div', 'ln-pri'); add(d, el('b', null, it.label + ' · ' + Math.round(it.score) + '/100'));
        if (it.note) d.appendChild(el('p', 'muted', it.note));
        if (!strengths) { d.appendChild(el('p', null, it.action)); var m = infoFor(it.module); if (m && !m.locked) d.appendChild(btn('Revisit ' + m.title, 'btn btn-ghost btn-sm', function () { openModule(it.module); })); }
        c.appendChild(d);
      });
      return c;
    }
    add(app, list('Top strengths', res.strengths, true), list('Your improvement priorities', res.priorities, false));

    var next = el('div', 'card mx-card');
    add(next, el('h3', null, 'Next: test it under pressure'), el('p', 'muted', 'Practise a full case with the Mada AI interviewer, then come back to the exercises behind your lowest scores.'));
    var a = el('a', 'btn btn-primary', 'Practise a full case'); a.href = START; next.appendChild(a);
    next.appendChild(btn('Try the Mini Case again', 'btn btn-ghost', function () {
      if (window.confirm('Start the Mini Case again? Your current result will be replaced when you finish the new attempt.')) miniStart();
    }));
    app.appendChild(next);
    app.appendChild(rubricBox());
  }

  // ---------------------------------------------------------------- start
  function init() {
    if (!ready()) { clear(app); app.appendChild(el('p', 'muted', 'This course is not available yet.')); return; }
    S.restore(API, KEY).then(function (s) {
      if (s) { token = s.token; email = s.email; load(); } else { signIn(); }
    });
  }
  init();
})();
