// Mada Readiness Assessment: questionnaire, report, plan and progress hub.
// Every number comes from the readiness Edge Function (deterministic scoring, no model). This file asks and shows.
// Every string is written with textContent, never innerHTML.
(function () {
  var app = document.getElementById('readiness-app');
  if (!app) return;
  var API = (app.getAttribute('data-api') || '').replace(/\/+$/, '');
  var KEY = app.getAttribute('data-key');
  var URLS = {
    case_interview: app.getAttribute('data-start') || '../case-practice/start/',
    academy: app.getAttribute('data-academy') || '../learn/',
    drills: app.getAttribute('data-maths') || '../maths/',
    expert: app.getAttribute('data-expert') || '../../expert/',
    cv_review: app.getAttribute('data-cv') || '../../cv-review/',
    assessment: ''
  };
  var PRIVACY = app.getAttribute('data-privacy') || '../../privacy/';
  var UI = window.MadaUI;
  var ACCOUNT = app.getAttribute('data-account') || '../account/';
  var CAT = {};
  try { JSON.parse(app.getAttribute('data-catalog') || '[]').forEach(function (p) { CAT[p.id] = p; }); } catch (e) {}
  var S = window.MadaSession, I = window.MadaInsights;
  var token = null, email = '';
  var bank = null, steps = [];
  var st = { profile: {}, answers: {}, idx: 0 };
  var DRAFT = 'mada_readiness_draft_v1';
  var SHORT = { problem_solving: 'Structuring', quantitative_skills: 'Quant', business_acumen: 'Judgment', impact_execution: 'Synthesis', communication: 'Comms', fit_interview: 'Fit' };
  var INTERVIEW_AXES = ['problem_solving', 'quantitative_skills', 'business_acumen', 'impact_execution', 'communication', 'fit_interview'];
  var PHASES = [['learn', 'Learn'], ['practice', 'Practise'], ['feedback', 'Get feedback'], ['improve', 'Improve'], ['reassess', 'Reassess']];

  // ---------------------------------------------------------------- helpers
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = text; return n; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function add(p) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]); return p; }
  function btn(text, cls, fnc) { var b = el('button', cls || 'btn btn-primary', text); b.type = 'button'; if (fnc) b.addEventListener('click', fnc); return b; }
  function link(text, href, cls) { var a = el('a', cls || 'btn btn-ghost btn-sm', text); a.href = href; return a; }
  function ready() { return API && KEY && API.indexOf('https://') === 0 && S; }
  function top() { try { window.scrollTo({ top: Math.max(0, app.getBoundingClientRect().top + window.pageYOffset - 90), behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); } }
  function track(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) { /* analytics never blocks */ } }
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  function post(path, body, ms) {
    var h = { 'content-type': 'application/json', apikey: KEY, authorization: 'Bearer ' + (token || KEY) };
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 20000) : null;
    return fetch(API + path, { method: 'POST', headers: h, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined }).then(function (r) {
      if (t) clearTimeout(t);
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, ok: r.ok, json: j }; });
    }, function () { if (t) clearTimeout(t); return { status: 0, ok: false, json: {} }; });
  }
  function fn(name, body, ms) { return post('/functions/v1/' + name, body, ms); }
  function errText(r) { return r.status === 0 ? 'Could not reach the server. Check your connection and try again.' : (r.json && r.json.error && r.json.error.message) || 'Something went wrong. Try again shortly.'; }
  function spin(msg) {
    clear(app);
    var box = el('div', 'mada-loader'); box.setAttribute('role', 'status');
    var ring = el('div', 'mada-loader-ring'); ring.setAttribute('aria-hidden', 'true');
    add(box, ring, el('p', 'muted', msg)); app.appendChild(box);
  }
  function failed(retry, msg) {
    clear(app);
    var box = el('div', 'mada-loader'); box.setAttribute('role', 'alert');
    add(box, el('h2', null, 'That took longer than expected'), el('p', 'muted', msg || 'Check your connection and try again.'), btn('Try again', 'btn btn-primary', retry));
    app.appendChild(box);
  }
  function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify({ profile: st.profile, answers: st.answers, idx: st.idx })); } catch (e) {} }
  function loadDraft() { try { var d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); return d && d.answers ? d : null; } catch (e) { return null; } }
  function dropDraft() { try { localStorage.removeItem(DRAFT); } catch (e) {} }
  function expired() { return S.recover(API, KEY).then(function (ok) { if (ok) { location.reload(); return; } S.clear(); token = null; signIn('Your session expired. Sign in again.', null); }); }

  // ---------------------------------------------------------------- sign in (a new email creates an account)
  function signIn(msg, after) {
    clear(app);
    var form = el('form', 'rp-form card mx-card');
    add(form, el('h3', null, 'Sign in to save'), el('p', 'muted', msg || 'Enter your email and we will send you a one-time code. New here? The same step creates your account.'));
    var input = el('input'); input.type = 'email'; input.required = true; input.autocomplete = 'email'; input.placeholder = 'you@example.com'; input.setAttribute('aria-label', 'Email address');
    var go = el('button', 'btn btn-primary', 'Email me a code'); go.type = 'submit';
    add(form, input, go);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); go.disabled = true; email = input.value.trim();
      post('/auth/v1/otp', { email: email, create_user: true }).then(function (r) {
        if (r.status === 429) return signIn('Please wait a minute before asking for another code, then try again.', after);
        if (!r.ok) return signIn('Could not send a code. Check the email address and try again.', after);
        codeForm(after);
      });
    });
    add(form, btn(after ? 'Back' : 'Back to the start', 'btn btn-ghost btn-sm', function () { if (after) after(); else intro(); }));
    app.appendChild(form);
  }
  function codeForm(after) {
    clear(app);
    var form = el('form', 'rp-form card mx-card');
    add(form, el('h3', null, 'Enter your code'), el('p', 'muted', 'We emailed a code to ' + email + '. It can take a minute to arrive.'));
    var input = el('input'); input.type = 'text'; input.inputMode = 'numeric'; input.required = true; input.autocomplete = 'one-time-code'; input.setAttribute('aria-label', 'One-time code');
    var go = el('button', 'btn btn-primary', 'Continue'); go.type = 'submit';
    add(form, input, go);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); go.disabled = true;
      post('/auth/v1/verify', { type: 'email', email: email, token: input.value.trim() }).then(function (r) {
        if (!r.ok) return signIn('That code did not work. Request a new one.', after);
        token = r.json.access_token; S.save(token, email, r.json.refresh_token, r.json.expires_in);
        track('readiness_signin');
        if (after) after(); else boot();
      });
    });
    app.appendChild(form);
  }

  // ---------------------------------------------------------------- boot
  function loadBank() {
    if (bank) return Promise.resolve(true);
    return fn('readiness', { action: 'questions' }).then(function (r) {
      if (!r.ok || !r.json.questions) return false;
      bank = r.json; steps = [];
      bank.profile.forEach(function (p) { steps.push({ kind: 'profile', q: p, section: 'About you' }); });
      var names = {}; bank.sections.forEach(function (s) { names[s.id] = s.title; });
      bank.questions.forEach(function (q) { steps.push({ kind: 'q', q: q, section: names[q.section] || '' }); });
      return true;
    });
  }
  function boot() {
    if (!ready()) { clear(app); add(app, el('p', 'muted', 'The assessment opens soon.')); return; }
    spin('Loading…');
    Promise.all([loadBank(), S.restore(API, KEY)]).then(function (res) {
      if (!res[0]) return failed(boot);
      if (res[1]) { token = res[1].token; email = res[1].email; }
      if (!token) return intro();
      fn('readiness', { action: 'state' }).then(function (r) {
        if (r.status === 401) return expired();
        if (!r.ok) return failed(boot);
        if (r.json.latest) return hub(r.json);
        intro(r.json.inProgress);
      });
    });
  }

  // ---------------------------------------------------------------- intro
  function intro(saved) {
    clear(app);
    var d = loadDraft();
    var resume = saved && Object.keys(saved.answers || {}).length ? { profile: saved.profile, answers: saved.answers } : (d && Object.keys(d.answers).length + Object.keys(d.profile || {}).length ? d : null);
    var box = el('div', 'rd-intro');
    add(box, el('p', 'eyebrow', 'Mada Readiness Assessment'), el('h2', null, 'How ready are you for consulting recruitment?'),
      el('p', 'lede', 'About ten minutes. ' + steps.length + ' short questions on your applications, case interviews and fit interviews. You get a personal report with your scores, your strengths, what to improve first and a plan.'));
    var list = el('ul', 'rd-ticks');
    ['Free. You can see your full report without an account.', 'Scenario and number questions, not only self-ratings.', 'Honest about its limits: your answers show how ready you feel. A scored Mada AI interview shows how you actually perform.'].forEach(function (t) { add(list, el('li', null, t)); });
    box.appendChild(list);
    var row = el('div', 'btn-row');
    if (resume) {
      add(row, btn('Resume where I left off', 'btn btn-primary', function () { st = { profile: resume.profile || {}, answers: resume.answers || {}, idx: firstOpen(resume) }; track('readiness_resume'); step(); }),
        btn('Start again', 'btn btn-ghost', function () { st = { profile: {}, answers: {}, idx: 0 }; dropDraft(); track('readiness_start'); step(); }));
    } else {
      add(row, btn('Assess my readiness', 'btn btn-primary', function () { st = { profile: {}, answers: {}, idx: 0 }; track('readiness_start'); step(); }));
    }
    box.appendChild(row);
    if (saved && (saved.questionsUpdated || saved.droppedAnswers)) add(box, el('p', 'rd-note-line', 'We have improved some questions since you started. Your answers to the unchanged questions are kept, and we will ask the rest again.'));
    add(box, el('p', 'muted rd-fine', 'Your answers stay in this browser until you choose to save them. If you save, they are stored privately in My Mada and you can delete them any time.'));
    app.appendChild(box);
  }
  function answeredCount(s) { return Object.keys(s.answers || {}).length; }
  function firstOpen(s) {
    for (var i = 0; i < steps.length; i++) {
      var q = steps[i].q;
      if (steps[i].kind === 'profile' ? (s.profile || {})[q.id] === undefined : (s.answers || {})[q.id] === undefined) return i;
    }
    return steps.length - 1;
  }

  // ---------------------------------------------------------------- the questions, one at a time
  function value(s) { return s.kind === 'profile' ? st.profile[s.q.id] : st.answers[s.q.id]; }
  function step() {
    clear(app);
    if (st.idx >= steps.length) return finish();
    var s = steps[st.idx], q = s.q, multi = s.kind === 'profile' && q.multi;
    var wrap = el('div', 'rd-q');
    var head = el('div', 'rd-head');
    var pct = Math.round((st.idx / steps.length) * 100);
    var bar = el('div', 'rd-progress'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(steps.length)); bar.setAttribute('aria-valuenow', String(st.idx));
    var fill = el('i'); fill.style.width = pct + '%'; bar.appendChild(fill);
    add(head, el('p', 'rd-count', 'Question ' + (st.idx + 1) + ' of ' + steps.length + '  ·  ' + s.section), bar);
    wrap.appendChild(head);
    var card = el('div', 'rd-card');
    if (q.context) add(card, el('p', 'rd-context', q.context));
    var h = el('h2', 'rd-prompt', q.prompt); h.setAttribute('id', 'rd-prompt'); card.appendChild(h);
    var group = el('div', 'rd-opts'); group.setAttribute('role', multi ? 'group' : 'radiogroup'); group.setAttribute('aria-labelledby', 'rd-prompt');
    var cur = value(s);
    var cont = null;
    function paint() {
      var v = value(s);
      Array.prototype.forEach.call(group.children, function (b) {
        var on = multi ? (v || []).indexOf(b.getAttribute('data-id')) >= 0 : v === b.getAttribute('data-id');
        b.className = 'rd-opt' + (on ? ' is-on' : ''); b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      if (cont) cont.disabled = !(v && v.length);
    }
    q.options.forEach(function (o, i) {
      var b = el('button', 'rd-opt'); b.type = 'button'; b.setAttribute('data-id', o.id); b.setAttribute('role', multi ? 'checkbox' : 'radio');
      add(b, el('span', 'rd-key', multi ? '' : String.fromCharCode(65 + i)), el('span', 'rd-txt', o.text));
      b.addEventListener('click', function () {
        if (multi) {
          var arr = (st.profile[q.id] || []).slice(), k = arr.indexOf(o.id);
          if (k >= 0) arr.splice(k, 1);
          else if (q.exclusive && o.id === q.exclusive) arr = [o.id];
          else { if (q.exclusive) { var x = arr.indexOf(q.exclusive); if (x >= 0) arr.splice(x, 1); } arr.push(o.id); }
          st.profile[q.id] = arr; saveDraft(); paint();
        } else {
          if (s.kind === 'profile') st.profile[q.id] = o.id; else st.answers[q.id] = o.id;
          saveDraft(); paint();
          setTimeout(function () { next(); }, 220);
        }
      });
      group.appendChild(b);
    });
    card.appendChild(group); wrap.appendChild(card);
    var nav = el('div', 'rd-nav');
    var back = btn('Back', 'btn btn-ghost btn-sm', function () { if (st.idx > 0) { st.idx--; saveDraft(); step(); } else intro(); });
    nav.appendChild(back);
    if (multi) { cont = btn('Continue', 'btn btn-primary', function () { next(); }); nav.appendChild(cont); }
    else if (cur) nav.appendChild(btn('Next', 'btn btn-ghost btn-sm', function () { next(); }));
    wrap.appendChild(nav);
    var saveBox = el('div', 'rd-save');
    var sb = el('button', 'btn btn-ghost rd-save-btn'); sb.type = 'button';
    add(sb, UI.icon('bookmark'), el('span', null, 'Save and finish later'));
    sb.addEventListener('click', function () { track('readiness_save_later'); if (token) saveProgress(); else signIn('Sign in to save your progress. We email you a one-time code, and your answers wait for you in My Mada.', function () { if (token) saveProgress(); else step(); }); });
    add(saveBox, sb, el('p', 'rd-save-note', 'Your progress is saved privately in My Mada.'));
    wrap.appendChild(saveBox);
    app.appendChild(wrap); paint();
    if (st.idx === 0 || st.idx === 6) track('readiness_section', { index: st.idx });
    top();
  }
  function next() { st.idx++; saveDraft(); if (st.idx % 5 === 0) track('readiness_progress', { index: st.idx }); step(); }
  function saveProgress() {
    spin('Saving…');
    fn('readiness', { action: 'save', profile: st.profile, answers: st.answers, consent: true }).then(function (r) {
      if (r.status === 401) return expired();
      if (!r.ok) { step(); return; }
      clear(app);
      var b = el('div', 'rd-intro');
      add(b, el('h2', null, 'Saved'), el('p', 'lede', 'Your progress is saved privately in My Mada. Come back to this page any time to carry on.'), btn('Keep going', 'btn btn-primary', step));
      app.appendChild(b);
    });
  }

  // ---------------------------------------------------------------- finish: score, show the report
  function finish() {
    spin('Working out your report…');
    track('readiness_complete');
    fn('readiness', { action: 'score', profile: st.profile, answers: st.answers }).then(function (r) {
      if (!r.ok) return failed(finish, errText(r));
      report(r.json, null);
    });
  }

  // ---------------------------------------------------------------- report pieces
  function gauge(label, sc, hint) {
    var box = el('div', 'rd-gauge');
    var val = sc.score;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 120 120'); svg.setAttribute('class', 'rd-ring'); svg.setAttribute('aria-hidden', 'true');
    function circ(cls, frac) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', '60'); c.setAttribute('cy', '60'); c.setAttribute('r', '50'); c.setAttribute('class', cls);
      c.setAttribute('stroke-dasharray', (314.16 * frac) + ' 314.16'); c.setAttribute('transform', 'rotate(-90 60 60)'); return c;
    }
    svg.appendChild(circ('rd-ring-bg', 1)); if (val !== null) svg.appendChild(circ('rd-ring-fg b-' + sc.band, val / 100));
    var num = el('div', 'rd-gnum'); add(num, el('b', null, val === null ? '–' : String(val)), el('span', null, '/ 100'));
    var wrap = el('div', 'rd-gwrap'); add(wrap, svg, num);
    add(box, wrap, el('h3', null, label), el('p', 'rd-band b-' + (sc.band || 'none'), sc.label || 'Not enough answers'), hint ? el('p', 'muted rd-ghint', hint) : null);
    return box;
  }
  function tagFor(c) {
    if (c.basis === 'both') return 'Your answers + ' + c.demonstratedReports + ' Mada AI interview' + (c.demonstratedReports > 1 ? 's' : '');
    if (c.basis === 'demonstrated') return 'From Mada AI interviews';
    if (c.basis === 'self_reported') return 'Based on your answers';
    return 'Not enough answers';
  }
  function compCard(c, blurbs) {
    var card = el('div', 'rd-comp');
    add(card, el('div', 'rd-comp-top'), el('p', 'rd-comp-b', blurbs[c.id] || ''));
    var top = card.firstChild; add(top, el('h4', null, c.label), el('b', null, c.combined === null ? '–' : String(c.combined)));
    var bar = el('div', 'rd-bar'); var f = el('i'); f.style.width = (c.combined || 0) + '%'; if (c.demonstrated !== null) f.className = 'is-demo'; bar.appendChild(f);
    card.insertBefore(bar, card.children[1]);
    var tag = el('p', 'rd-tag muted', tagFor(c));
    if (c.self !== null && c.demonstrated !== null) tag.textContent += '  ·  You said ' + c.self + ', interviews showed ' + c.demonstrated;
    card.appendChild(tag);
    return card;
  }
  var BLURB = {
    app_materials: 'A CV and application that show quantified impact and fit the firm.', app_network: 'Conversations with people at your target firms, and knowing how each process works.',
    problem_solving: 'Opening a case, clarifying the problem and building a MECE, hypothesis-led structure.', quantitative_skills: 'Mental math, market sizing and reading charts and tables accurately.',
    business_acumen: 'Commercial instinct: knowing what matters in a business decision.', impact_execution: 'Closing with an answer first, the key risks and the next steps.',
    communication: 'Thinking aloud clearly and handling pushback from the interviewer.', fit_interview: 'Your story, why consulting and this firm, and structured examples.'
  };
  function radar(scores) {
    if (!I || !I.spider) return null;
    var by = {}; scores.competencies.forEach(function (c) { by[c.id] = c; });
    var axes = INTERVIEW_AXES.map(function (id) { return { label: by[id].label, short: SHORT[id] }; });
    function vals(key) { return INTERVIEW_AXES.map(function (id) { var v = by[id][key]; return v === null ? null : v / 20; }); }
    var anyDemo = INTERVIEW_AXES.some(function (id) { return by[id].demonstrated !== null; });
    var series = anyDemo
      ? [{ name: 'Your answers', cls: 'rp-s-first', values: vals('self') }, { name: 'Mada AI interviews', cls: 'rp-s-now', values: vals('demonstrated') }]
      : [{ name: 'Your answers', cls: 'rp-s-now', values: vals('self') }];
    var box = el('div', 'rd-radar');
    box.appendChild(I.spider(axes, series));
    var leg = el('div', 'rp-legend');
    series.forEach(function (s) { var i = el('span', 'rp-leg'); add(i, el('span', 'rp-sw ' + s.cls), document.createTextNode(s.name)); leg.appendChild(i); });
    box.appendChild(leg);
    return box;
  }
  function insights(v) {
    var wrap = el('div', 'rd-two');
    var s = el('div', 'rd-panel'); s.appendChild(el('h3', null, 'Your strongest areas'));
    var ul = el('ul', 'rd-list'); v.scores.strengths.forEach(function (x) { var li = el('li'); add(li, el('b', null, x.label), el('span', null, ' · ' + x.score)); ul.appendChild(li); }); s.appendChild(ul);
    var p = el('div', 'rd-panel'); p.appendChild(el('h3', null, 'What to work on first'));
    var ol = el('ol', 'rd-list rd-prio'); v.roadmap.priorities.forEach(function (x) { var li = el('li'); add(li, el('b', null, x.label + ' · ' + x.score), el('span', 'muted', x.why)); ol.appendChild(li); }); p.appendChild(ol);
    add(wrap, s, p); return wrap;
  }
  function honesty(v) {
    var sc = v.scores, box = el('div', 'rd-note');
    add(box, el('h3', null, 'How to read this'));
    var l = el('ul', 'rd-list');
    if (sc.evidence.basis === 'questionnaire_only') {
      add(l, el('li', null, 'These scores come from your answers, so they show how ready you feel and what you know to do. They are not a prediction of how an interview will go. A scored Mada AI interview shows how you actually perform.'));
      if (sc.headline.interview.capped || sc.headline.application.capped) add(l, el('li', null, 'Without an interview behind it, a score is never shown as "Strong readiness". The top level needs evidence.'));
    } else {
      add(l, el('li', null, 'Your scores now combine your answers with ' + sc.evidence.interviews + ' scored Mada AI interview' + (sc.evidence.interviews > 1 ? 's' : '') + '. Interviews carry more weight than your answers.'));
    }
    if (sc.calibration.status === 'confidence_above_evidence') add(l, el('li', null, 'You described your habits more strongly than the scenario and number questions showed. That is common. A practice interview is the quickest way to find out which is closer.'));
    if (sc.calibration.status === 'evidence_above_confidence') add(l, el('li', null, 'You did better on the scenario and number questions than your own description suggests. You may be underrating yourself.'));
    sc.discrepancies.forEach(function (d) { add(l, el('li', null, d.text)); });
    add(l, el('li', null, 'The levels (Strong 85+, Nearly ready 70 to 84, Developing 50 to 69, Foundation building below 50) are starting points we will tune as more candidates use this. Nothing here estimates your chance of an offer.'));
    box.appendChild(l); return box;
  }
  function diagnostic(v) {
    var d = v.diagnostic, box = el('div', 'rd-panel rd-diag');
    box.appendChild(el('h3', null, d.interviews ? 'Keep the evidence coming' : 'Check this with a real interview'));
    box.appendChild(el('p', null, d.case.why));
    if (d.case.available) {
      if (d.case.suggestedTypes && d.case.suggestedTypes.length) box.appendChild(el('p', 'muted', 'Good case types for your priorities: ' + d.case.suggestedTypes.map(function (t) { return t.label; }).join(', ') + '.'));
      var row = el('div', 'btn-row'); row.appendChild(link('Take a Mada AI case interview', URLS.case_interview, 'btn btn-primary btn-sm'));
      row.lastChild.addEventListener('click', function () { track('readiness_diagnostic_click'); }); box.appendChild(row);
    }
    if (d.fit.note) box.appendChild(el('p', 'muted', d.fit.note));
    return box;
  }
  function reportBody(v) {
    var frag = el('div', 'rd-report');
    var g = el('div', 'rd-gauges');
    var h = v.scores.headline;
    add(g, gauge('Application readiness', h.application, 'CV, outreach and firm knowledge. Based on your answers.'),
      gauge('Interview readiness', h.interview, v.scores.evidence.basis === 'questionnaire_only' ? 'Case and fit interviews. Based on your answers so far.' : 'Case and fit interviews. Your answers plus scored interviews.'));
    frag.appendChild(g);
    add(frag, insights(v), honesty(v));
    var comp = el('section', 'rd-section'); comp.appendChild(el('h3', null, 'Your skills in detail'));
    var r = radar(v.scores); if (r) comp.appendChild(r);
    var grid = el('div', 'rd-comps'); v.scores.competencies.forEach(function (c) { grid.appendChild(compCard(c, BLURB)); }); comp.appendChild(grid);
    frag.appendChild(comp);
    frag.appendChild(diagnostic(v));
    return frag;
  }

  // ---------------------------------------------------------------- the plan
  function planSection(v) {
    var rm = v.roadmap, sec = el('section', 'rd-section');
    add(sec, el('h3', null, 'Your preparation plan'), el('p', 'muted', rm.horizon + '. ' + rm.preparation));
    PHASES.forEach(function (ph) {
      var items = rm.steps.filter(function (s) { return s.phase === ph[0]; });
      if (!items.length) return;
      var g = el('div', 'rd-phase'); g.appendChild(el('h4', null, ph[1]));
      items.forEach(function (s) {
        var c = el('div', 'rd-step'); var t = el('div', 'rd-step-t');
        add(t, el('b', null, s.title), s.optional ? el('span', 'rd-opt-tag', 'Optional') : null);
        add(c, t, el('p', 'muted', s.why));
        if (s.target && s.target !== 'assessment' && URLS[s.target]) c.appendChild(link(s.target === 'academy' ? 'Open Mada Academy' : s.target === 'case_interview' ? 'Start an interview' : s.target === 'drills' ? 'Open Case Math Mastery' : s.target === 'expert' ? 'See Mada coaches' : 'Open', URLS[s.target], 'btn btn-ghost btn-sm'));
        if (s.target === 'assessment') c.appendChild(btn('Retake the assessment', 'btn btn-ghost btn-sm', retake));
        g.appendChild(c);
      });
      sec.appendChild(g);
    });
    var co = el('div', 'rd-note'); add(co, el('h3', null, 'Do you need a coach?'), el('p', null, rm.coaching.reason));
    if (rm.coaching.level !== 'optional') co.appendChild(link('See Mada coaches', URLS.expert, 'btn btn-ghost btn-sm'));
    sec.appendChild(co);
    rm.notes.forEach(function (n) { sec.appendChild(el('p', 'muted rd-fine', n)); });
    sec.appendChild(el('p', 'muted rd-fine', 'Retake after ' + rm.reassessAfter + '.'));
    return sec;
  }

  // ---------------------------------------------------------------- anonymous report with a prompt to save
  function report(v, state) {
    clear(app);
    var wrap = el('div', 'rd-wrap');
    add(wrap, el('p', 'eyebrow', 'Your readiness report'), el('h2', null, 'Where you stand today'));
    wrap.appendChild(reportBody(v));
    var plan = el('section', 'rd-section rd-lock');
    add(plan, el('h3', null, 'Get your plan and track your progress'),
      el('p', null, 'Save this report to My Mada to get a step-by-step plan matched to your priorities, your target firms and your timeline, and to see your progress when you retake the assessment.'),
      el('p', 'muted rd-fine', 'Saving stores your answers privately in your account, only used for your report and plan. Delete them any time. See our '));
    var pl = plan.lastChild; var a = el('a', null, 'privacy policy'); a.href = PRIVACY; pl.appendChild(a); pl.appendChild(document.createTextNode('.'));
    var save = btn(token ? 'Save my report and see my plan' : 'Sign in to save and see my plan', 'btn btn-primary', function () { track('readiness_save_click'); token ? complete() : signIn(null, function () { token ? complete() : report(v, state); }); });
    plan.appendChild(save);
    wrap.appendChild(plan);
    wrap.appendChild(btn('Change my answers', 'btn btn-ghost btn-sm', function () { st.idx = 0; step(); }));
    app.appendChild(wrap); top();
  }
  function complete() {
    spin('Saving your report…');
    fn('readiness', { action: 'complete', profile: st.profile, answers: st.answers, consent: true }).then(function (r) {
      if (r.status === 401) return expired();
      if (!r.ok) return failed(complete, errText(r));
      dropDraft(); track('readiness_saved');
      hub({ latest: r.json.latest, progress: r.json.progress, inProgress: null });
    });
  }
  function retake() { st = { profile: {}, answers: {}, idx: 0 }; dropDraft(); track('readiness_retake'); step(); }

  // ---------------------------------------------------------------- the hub (signed in, at least one saved report)
  function progressSection(p) {
    var sec = el('section', 'rd-section');
    sec.appendChild(el('h3', null, 'Your progress'));
    sec.appendChild(el('p', 'rd-msg', p.message));
    var cols = el('div', 'rd-two');
    var a = el('div', 'rd-panel'); a.appendChild(el('h4', null, 'What you reported'));
    if (p.attempts.length < 2) a.appendChild(el('p', 'muted', 'Retake the assessment after some practice to see how your own view changes. It is self-reported, so it shows confidence, not proof.'));
    p.attempts.forEach(function (x) { var row = el('p', 'rd-row'); add(row, el('span', null, fmtDate(x.completedAt)), el('b', null, 'Application ' + (x.application === null ? '–' : x.application) + '  ·  Interview ' + (x.interview === null ? '–' : x.interview))); a.appendChild(row); });
    var d = el('div', 'rd-panel'); d.appendChild(el('h4', null, 'What your interviews showed'));
    if (!p.demonstrated.interviews.length) d.appendChild(el('p', 'muted', 'No scored interviews yet. They are the evidence that counts most.'));
    p.demonstrated.interviews.forEach(function (x) {
      var row = el('p', 'rd-row'); add(row, el('span', null, fmtDate(x.at) + (x.product === 'fit' ? ' · Fit' : ' · Case')), el('b', null, x.overall === null ? '–' : x.overall + ' / 100')); d.appendChild(row);
    });
    add(cols, a, d); sec.appendChild(cols);
    var stats = el('p', 'muted rd-fine', 'Activity: ' + p.activity.lessonsCompleted + ' Mada Academy lesson' + (p.activity.lessonsCompleted === 1 ? '' : 's') + ' completed, ' + p.activity.interviews + ' scored case interview' + (p.activity.interviews === 1 ? '' : 's') + '. Activity is shown for your own tracking; it does not raise your scores.');
    sec.appendChild(stats);
    var first = p.selfReported.competencies;
    if (p.attempts.length >= 2 && I && I.spider) {
      var by = {}; first.forEach(function (c) { by[c.id] = c; });
      var axes = INTERVIEW_AXES.map(function (id) { return { label: by[id] ? by[id].label : id, short: SHORT[id] }; });
      var box = el('div', 'rd-radar'); box.appendChild(I.spider(axes, [
        { name: 'First attempt', cls: 'rp-s-first', values: INTERVIEW_AXES.map(function (id) { var v = by[id] && by[id].first; return v === null || v === undefined ? null : v / 20; }) },
        { name: 'Latest attempt', cls: 'rp-s-now', values: INTERVIEW_AXES.map(function (id) { var v = by[id] && by[id].latest; return v === null || v === undefined ? null : v / 20; }) }]));
      var leg = el('div', 'rp-legend'); [['First attempt (your answers)', 'rp-s-first'], ['Latest attempt (your answers)', 'rp-s-now']].forEach(function (s) { var i = el('span', 'rp-leg'); add(i, el('span', 'rp-sw ' + s[1]), document.createTextNode(s[0])); leg.appendChild(i); });
      box.appendChild(leg); sec.appendChild(box);
    }
    return sec;
  }
  // Explore more: the other Mada products, live ones first. The assessment itself becomes a retake card, since they just took it.
  function exploreSection() {
    var prods = [{ id: 'retake', name: 'Retake the assessment', icon: 'refresh', status: 'live', href: '#', cta: 'Retake', price: 'Free',
      text: 'See how your readiness has moved since your last attempt.', onClick: function (e) { e.preventDefault(); retake(); } }];
    ['academy', 'case', 'maths', 'pass', 'coach', 'fit', 'cv'].forEach(function (id) { if (CAT[id]) prods.push(CAT[id]); });
    return UI.exploreMore({ label: 'Explore more', products: prods });
  }
  function hub(state) {
    clear(app);
    var v = state.latest, wrap = el('div', 'rd-wrap');
    add(wrap, el('p', 'eyebrow', 'Your preparation hub'), el('h2', null, 'Your readiness'), el('p', 'muted', 'Last assessment: ' + fmtDate(v.completedAt) + '.'));
    var actions = el('div', 'btn-row');
    add(actions, btn('Retake the assessment', 'btn btn-ghost btn-sm', retake), link('Take a Mada AI interview', URLS.case_interview, 'btn btn-primary btn-sm'), link('Open Mada Academy', URLS.academy, 'btn btn-ghost btn-sm'));
    wrap.appendChild(actions);
    wrap.appendChild(reportBody(v));
    wrap.appendChild(planSection(v));
    if (state.progress) wrap.appendChild(progressSection(state.progress));
    wrap.appendChild(exploreSection());
    var del = el('section', 'rd-section'); del.appendChild(el('h3', null, 'Your data'));
    del.appendChild(el('p', 'muted', 'Your answers are private to you. You can delete them at any time.'));
    var b = btn('Delete my assessment data', 'btn btn-ghost btn-sm', function () {
      b.textContent = 'Click again to delete everything'; b.onclick = function () {
        spin('Deleting…'); fn('readiness', { action: 'delete' }).then(function (r) { if (!r.ok) return failed(boot, errText(r)); dropDraft(); st = { profile: {}, answers: {}, idx: 0 }; boot(); });
      };
    });
    del.appendChild(b); wrap.appendChild(del);
    app.appendChild(wrap); top();
  }

  boot();
})();
