// Mada AI maths drills: the practice page. Pick a difficulty and topics, answer timed consulting-style
// questions, see the worked solution after each one and a summary at the end.
// Every string is written with textContent, never innerHTML. History is kept in this browser only.
(function () {
  var app = document.getElementById('maths-app');
  var M = window.MadaMaths;
  if (!app || !M) return;

  var HISTORY_KEY = 'mada_maths_history';
  // mix = Random Mix (every topic). It is on by default and excludes picking individual topics; topics holds the individual choices.
  var state = { level: 'random', mix: true, topics: [], count: 10 };
  function chosenTopics() { return state.mix || !state.topics.length ? M.TOPIC_IDS.slice() : state.topics.slice(); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function readHistory() { try { var h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } }
  function saveHistory(entry) { try { var h = readHistory(); h.unshift(entry); localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20))); } catch (e) { /* storage blocked: fine */ } }
  // Every answered question is kept (this browser, per signed-in email) so the progress report can total them by topic.
  function who() { try { var j = window.MadaSession && window.MadaSession.load(); return j && j.email ? String(j.email).toLowerCase() : 'guest'; } catch (e) { return 'guest'; } }
  function attemptsKey() { return 'mada_maths_attempts:' + who(); }
  function readAttempts() { try { var a = JSON.parse(localStorage.getItem(attemptsKey()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveAttempt(q, res, sec) {
    var row = null;
    try {
      var a = readAttempts();
      row = { t: q.topic, l: q.level, ok: res.ok ? 1 : 0, sk: res.skipped ? 1 : 0, s: Math.round(sec), at: Date.now() };
      a.push(row);
      localStorage.setItem(attemptsKey(), JSON.stringify(a.slice(-3000)));
    } catch (e) { /* storage blocked: the report just stays empty */ }
    if (row && canSync()) remote({ action: 'add', attempts: [row] });
  }
  // ---------------------------------------------------------------- account sync
  // Signed-in drills keep every attempt on the candidate's account too, so the report follows them to any device.
  // This browser's copy is a cache: it is merged with the account's on the way in, and anything only here is uploaded.
  var API = app.getAttribute('data-api'), KEY = app.getAttribute('data-key'), SESS = window.MadaSession;
  var syncing = null, synced = false;
  function canSync() { return app.getAttribute('data-gated') === '1' && !!API && !!KEY && !!SESS && who() !== 'guest'; }
  function remote(body) {
    return SESS.restore(API, KEY).then(function (saved) {
      if (!saved) return null;
      return fetch(API.replace(/\/+$/, '') + '/functions/v1/maths-progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: KEY, authorization: 'Bearer ' + saved.token },
        body: JSON.stringify(body)
      }).then(function (r) { return r.ok ? r.json() : null; });
    }).catch(function () { return null; });
  }
  function sig(r) { return r.at + '|' + r.t; }
  function pushAll(rows) {
    var chain = Promise.resolve();
    for (var i = 0; i < rows.length; i += 500) (function (chunk) { chain = chain.then(function () { return remote({ action: 'add', attempts: chunk }); }); })(rows.slice(i, i + 500));
    return chain;
  }
  // Resolves true when this browser's copy changed.
  function sync() {
    if (!canSync()) return Promise.resolve(false);
    if (syncing) return syncing;
    syncing = remote({ action: 'get' }).then(function (j) {
      if (!j || !Array.isArray(j.attempts)) return false;
      var local = readAttempts(), have = {}, seen = {};
      j.attempts.forEach(function (r) { have[sig(r)] = 1; });
      local.forEach(function (r) { seen[sig(r)] = 1; });
      var fresh = j.attempts.filter(function (r) { return !seen[sig(r)]; });
      var missing = local.filter(function (r) { return !have[sig(r)]; });
      if (fresh.length) {
        try { localStorage.setItem(attemptsKey(), JSON.stringify(local.concat(fresh).sort(function (a, b) { return a.at - b.at; }).slice(-3000))); } catch (e) { /* storage blocked */ }
      }
      synced = true;
      return pushAll(missing).then(function () { return fresh.length > 0; });
    }).then(function (changed) { syncing = null; return changed; }, function () { syncing = null; return false; });
    return syncing;
  }
  function pct(ok, n) { return n ? Math.round(100 * ok / n) : 0; }
  function fmtTime(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }

  // ---------------------------------------------------------------- setup
  var BLURB = { random: 'A mix of all three levels, question by question.', 1: 'Round numbers and one step. Warm up and build speed.', 2: 'Two steps and messier numbers. Case-interview level.', 3: 'Multi-step and unfamiliar setups. Final-round pace.' };

  function setup() {
    if (!synced && canSync()) sync().then(function (changed) { if (changed && app.querySelector('.mx-card') && !app.querySelector('.mx-form')) setup(); });
    clear();
    var card = el('div', 'card mx-card');
    card.appendChild(el('h3', null, 'Choose your difficulty'));
    var levels = el('div', 'mx-levels'); levels.setAttribute('role', 'radiogroup'); levels.setAttribute('aria-label', 'Difficulty');
    ['random', 1, 2, 3].forEach(function (l) {
      var b = el('button', 'mx-level' + (state.level === l ? ' on' : ''));
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', state.level === l ? 'true' : 'false');
      b.appendChild(el('b', null, M.DIFFICULTIES[l])); b.appendChild(el('span', null, BLURB[l]));
      b.addEventListener('click', function () { state.level = l; setup(); });
      levels.appendChild(b);
    });
    card.appendChild(levels);

    card.appendChild(el('h3', 'mx-h', 'Choose your topics'));
    var chips = el('div', 'mx-chips');
    var rnd = el('button', 'mx-chip' + (state.mix ? ' on' : ''), 'Random Mix');
    rnd.type = 'button'; rnd.setAttribute('aria-pressed', state.mix ? 'true' : 'false');
    rnd.addEventListener('click', function () { state.mix = true; state.topics = []; setup(); });
    chips.appendChild(rnd);
    M.TOPIC_IDS.forEach(function (id) {
      var on = !state.mix && state.topics.indexOf(id) !== -1;
      var c = el('button', 'mx-chip' + (on ? ' on' : ''), M.TOPICS[id].label);
      c.type = 'button'; c.setAttribute('aria-pressed', on ? 'true' : 'false');
      c.addEventListener('click', function () {
        var i = state.topics.indexOf(id);
        if (state.mix) { state.mix = false; state.topics = [id]; }
        else if (i === -1) state.topics.push(id);
        else state.topics.splice(i, 1);
        if (!state.topics.length) state.mix = true;   // never an empty selection: fall back to Random Mix
        setup();
      });
      chips.appendChild(c);
    });
    card.appendChild(chips);

    card.appendChild(el('h3', 'mx-h', 'How many questions?'));
    var counts = el('div', 'mx-chips');
    [5, 10, 15].forEach(function (n) {
      var c = el('button', 'mx-chip' + (state.count === n ? ' on' : ''), String(n));
      c.type = 'button'; c.setAttribute('aria-pressed', state.count === n ? 'true' : 'false');
      c.addEventListener('click', function () { state.count = n; setup(); });
      counts.appendChild(c);
    });
    card.appendChild(counts);

    var go = el('button', 'btn btn-primary', 'Start drill'); go.type = 'button'; go.style.marginTop = '24px';
    go.addEventListener('click', function () { run(M.session({ level: state.level, count: state.count, topics: chosenTopics() }), state.level); });
    card.appendChild(go);
    app.appendChild(card);

    var att = readAttempts();
    var rep = el('div', 'card mx-card'); rep.style.marginTop = '20px';
    rep.appendChild(el('h3', null, 'Your progress report'));
    rep.appendChild(el('p', 'muted', att.length ? 'You have answered ' + att.length + ' question' + (att.length === 1 ? '' : 's') + '. See your totals for each question type, by difficulty, and what to practise next.' : 'Answer a few questions and your totals for each question type will appear here.'));
    if (att.length) { var rb = el('button', 'btn btn-ghost', 'Open my report'); rb.type = 'button'; rb.addEventListener('click', function () { openReport(); }); rep.appendChild(rb); }
    app.appendChild(rep);

    var h = readHistory();
    if (h.length) {
      var box = el('div', 'card mx-card'); box.style.marginTop = '20px';
      box.appendChild(el('h3', null, 'Your recent practice'));
      var ul = el('ul', 'mx-history');
      h.slice(0, 5).forEach(function (e) {
        ul.appendChild(el('li', null, M.DIFFICULTIES[e.level] + ': ' + e.correct + ' of ' + e.total + ' correct, ' + fmtTime(e.avgSec) + ' per question'));
      });
      box.appendChild(ul);
      app.appendChild(box);
    }
  }

  // ---------------------------------------------------------------- progress report
  function openReport() {
    if (!canSync() || synced) return report();
    clear();
    app.appendChild(el('p', 'muted', 'Loading your progress\u2026'));
    sync().then(report, report);
  }
  function report() {
    clear();
    var a = readAttempts();
    var card = el('div', 'card mx-card');
    card.appendChild(el('h3', null, 'Your progress report'));
    if (!a.length) {
      card.appendChild(el('p', null, 'Nothing here yet. Answer a few questions and come back.'));
    } else {
      var okAll = a.filter(function (r) { return r.ok; }).length;
      var avgAll = a.reduce(function (x, r) { return x + r.s; }, 0) / a.length;
      var tiles = el('div', 'mx-tiles');
      [[String(a.length), 'questions answered'], [pct(okAll, a.length) + '%', 'correct overall'], [fmtTime(avgAll), 'average per question']].forEach(function (t) {
        var d = el('div', 'mx-tile'); d.appendChild(el('b', null, t[0])); d.appendChild(el('span', null, t[1])); tiles.appendChild(d);
      });
      card.appendChild(tiles);

      var by = {};
      M.TOPIC_IDS.forEach(function (id) { by[id] = { label: M.TOPICS[id].label, n: 0, ok: 0, sec: 0 }; });
      a.forEach(function (r) { var t = by[r.t]; if (!t) return; t.n++; t.sec += r.s; if (r.ok) t.ok++; });

      card.appendChild(el('h4', null, 'By question type'));
      var tbl = el('div', 'mx-table'); tbl.setAttribute('role', 'table');
      var head = el('div', 'mx-row mx-head'); head.setAttribute('role', 'row');
      ['Question type', 'Answered', 'Correct', 'Accuracy', 'Avg time'].forEach(function (h) { var c = el('span', null, h); c.setAttribute('role', 'columnheader'); head.appendChild(c); });
      tbl.appendChild(head);
      M.TOPIC_IDS.forEach(function (id) {
        var t = by[id];
        var row = el('div', 'mx-row'); row.setAttribute('role', 'row');
        var name = el('span', 'mx-name'); name.setAttribute('role', 'cell');
        name.appendChild(el('b', null, t.label));
        var bar = el('i', 'mx-bar'); var fill = el('i', 'mx-fill'); fill.style.width = pct(t.ok, t.n) + '%'; bar.appendChild(fill); name.appendChild(bar);
        row.appendChild(name);
        [String(t.n), t.n ? String(t.ok) : '-', t.n ? pct(t.ok, t.n) + '%' : 'Not tried', t.n ? fmtTime(t.sec / t.n) : '-'].forEach(function (v) { var c = el('span', null, v); c.setAttribute('role', 'cell'); row.appendChild(c); });
        tbl.appendChild(row);
      });
      card.appendChild(tbl);

      card.appendChild(el('h4', null, 'By difficulty'));
      var ul = el('ul', 'mx-history');
      [1, 2, 3].forEach(function (l) {
        var xs = a.filter(function (r) { return String(r.l) === String(l); });
        ul.appendChild(el('li', null, M.DIFFICULTIES[l] + ': ' + (xs.length ? xs.filter(function (r) { return r.ok; }).length + ' of ' + xs.length + ' correct (' + pct(xs.filter(function (r) { return r.ok; }).length, xs.length) + '%)' : 'not tried yet')));
      });
      card.appendChild(ul);

      // Focus next: anything not tried first, then the lowest accuracy among types with at least 3 answers.
      var untried = M.TOPIC_IDS.filter(function (id) { return by[id].n === 0; });
      var shaky = M.TOPIC_IDS.filter(function (id) { return by[id].n >= 3; }).sort(function (x, y) { return pct(by[x].ok, by[x].n) - pct(by[y].ok, by[y].n); });
      var msg = '';
      if (untried.length) msg = 'Try ' + by[untried[0]].label + ' next. You have not practised it yet, and a well-rounded candidate covers every type.';
      else if (shaky.length && pct(by[shaky[0]].ok, by[shaky[0]].n) < 100) msg = 'Practise ' + by[shaky[0]].label + ' next. It is your lowest at ' + pct(by[shaky[0]].ok, by[shaky[0]].n) + '% correct.';
      else msg = 'Strong across the board. Move up a difficulty level.';
      card.appendChild(el('h4', null, 'What to practise next'));
      card.appendChild(el('p', null, msg));
      card.appendChild(el('p', 'muted', canSync() ? 'Your totals are saved to your Mada account (' + who() + '), so they follow you to any device.' : 'Your totals are stored in this browser for ' + (who() === 'guest' ? 'this device' : who()) + '. Clearing your browser data clears them.'));
    }
    var back = el('button', 'btn btn-primary', 'Back to Case Math Mastery'); back.type = 'button';
    back.addEventListener('click', function () { setup(); });
    card.appendChild(back);
    app.appendChild(card);
  }

  // ---------------------------------------------------------------- a run of questions
  function run(questions, levelChoice) {
    var results = [], idx = 0, started = 0, timer = null;

    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    function show() {
      stop(); clear();
      var q = questions[idx];
      var card = el('div', 'card mx-card');
      var top = el('div', 'mx-top');
      top.appendChild(el('span', 'mx-q', 'Question ' + (idx + 1) + ' of ' + questions.length));
      top.appendChild(el('span', 'mx-cat', q.topicLabel + ' \u00b7 ' + M.DIFFICULTIES[q.level]));
      var clock = el('span', 'mx-clock', '0:00'); clock.setAttribute('aria-label', 'Time on this question');
      top.appendChild(clock);
      card.appendChild(top);
      card.appendChild(el('p', 'mx-prompt', q.prompt));

      var isChoice = q.kind === 'choice';
      var input = null, submit = null;
      var skip = el('button', 'btn btn-ghost', 'Skip'); skip.type = 'button';
      var form;
      if (isChoice) {
        // Decision questions: pick one option. No typing, so no invalid input.
        form = el('div', 'mx-choices'); form.setAttribute('role', 'group'); form.setAttribute('aria-label', 'Choose one answer');
        q.options.forEach(function (text, i) {
          var o = el('button', 'mx-option', text); o.type = 'button';
          o.addEventListener('click', function () { finish(M.check(q, i)); });
          form.appendChild(o);
        });
        form.appendChild(skip);
      } else {
        form = el('form', 'mx-form');
        input = el('input'); input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off'; input.required = true;
        input.setAttribute('aria-label', 'Your answer in ' + q.unit); input.placeholder = 'Your answer';
        var unit = el('span', 'mx-unit', q.unit);
        submit = el('button', 'btn btn-primary', 'Check'); submit.type = 'submit';
        form.appendChild(input); form.appendChild(unit); form.appendChild(submit); form.appendChild(skip);
      }
      card.appendChild(form);
      var fb = el('div', 'mx-feedback'); fb.setAttribute('aria-live', 'polite');
      card.appendChild(fb);
      app.appendChild(card);

      started = Date.now();
      timer = setInterval(function () { clock.textContent = fmtTime((Date.now() - started) / 1000); }, 500);
      if (input) input.focus();

      function finish(res) {
        stop();
        var sec = (Date.now() - started) / 1000;
        results.push({ q: q, ok: res.ok, skipped: !!res.skipped, sec: sec });
        saveAttempt(q, res, sec);
        clear(); // rebuild the card with the feedback
        var c2 = el('div', 'card mx-card');
        c2.appendChild(el('span', 'mx-q', 'Question ' + (idx + 1) + ' of ' + questions.length));
        c2.appendChild(el('p', 'mx-prompt', q.prompt));
        var verdict = el('p', 'mx-verdict ' + (res.ok ? 'good' : 'bad'), res.skipped ? 'Skipped.' : res.ok ? 'Correct.' : 'Not quite.');
        verdict.setAttribute('role', 'status');
        c2.appendChild(verdict);
        var shown = q.kind === 'choice' ? q.options[q.answer] : q.answer + ' ' + q.unit;
        c2.appendChild(el('p', null, 'Answer: ' + shown + (res.value !== undefined && !res.ok ? ' (you said ' + res.value + ')' : '') + '. Time: ' + fmtTime(sec) + '.'));
        var ol = el('ol', 'mx-steps');
        q.steps.forEach(function (s) { ol.appendChild(el('li', null, s)); });
        c2.appendChild(el('h4', 'mx-h', 'Worked solution')); c2.appendChild(ol);
        c2.appendChild(el('p', 'muted', 'Tip: ' + q.tip));
        var last = idx === questions.length - 1;
        var next = el('button', 'btn btn-primary', last ? 'See results' : 'Next question'); next.type = 'button';
        next.addEventListener('click', function () { idx++; if (idx < questions.length) show(); else summary(results, levelChoice); });
        c2.appendChild(next);
        app.appendChild(c2);
        next.focus();
      }

      if (!isChoice) form.addEventListener('submit', function (e) {
        e.preventDefault();
        var res = M.check(q, input.value);
        if (res.invalid) { fb.textContent = 'Type a number, for example 25, 25% or 1.2k.'; input.focus(); return; }
        finish(res);
      });
      skip.addEventListener('click', function () { finish({ ok: false, skipped: true }); });
    }
    show();
  }

  // ---------------------------------------------------------------- summary
  function summary(results, levelChoice) {
    clear();
    var correct = results.filter(function (r) { return r.ok; }).length;
    var avg = results.reduce(function (a, r) { return a + r.sec; }, 0) / results.length;
    var card = el('div', 'card mx-card');
    card.appendChild(el('h3', null, 'Drill complete'));
    card.appendChild(el('p', 'mx-score', correct + ' of ' + results.length + ' correct'));
    card.appendChild(el('p', 'muted', 'Average ' + fmtTime(avg) + ' per question. Difficulty: ' + M.DIFFICULTIES[levelChoice] + '.'));

    var by = {};
    results.forEach(function (r) { var t = by[r.q.topic] = by[r.q.topic] || { label: r.q.topicLabel, ok: 0, n: 0 }; t.n++; if (r.ok) t.ok++; });
    var ul = el('ul', 'mx-history');
    Object.keys(by).forEach(function (k) { ul.appendChild(el('li', null, by[k].label + ': ' + by[k].ok + ' of ' + by[k].n)); });
    card.appendChild(ul);
    var weak = Object.keys(by).filter(function (k) { return by[k].ok < by[k].n; }).sort(function (a, b) { return (by[a].ok / by[a].n) - (by[b].ok / by[b].n); })[0];
    if (weak) card.appendChild(el('p', null, 'Practise next: ' + by[weak].label + '.'));
    else card.appendChild(el('p', null, 'Clean sheet. Try the next difficulty.'));

    var again = el('button', 'btn btn-primary', 'Another drill'); again.type = 'button';
    again.addEventListener('click', function () { setup(); });
    card.appendChild(again);
    var rp = el('button', 'btn btn-ghost', 'My progress report'); rp.type = 'button'; rp.style.marginLeft = '10px';
    rp.addEventListener('click', function () { openReport(); });
    card.appendChild(rp);
    app.appendChild(card);

    saveHistory({ at: Date.now(), level: levelChoice, correct: correct, total: results.length, avgSec: avg });
  }

    // When the page is gated (sign-in and subscription), maths-gate.js starts the drills once access is confirmed.
  if (app.getAttribute('data-gated') === '1') window.MadaMathsStart = setup; else setup();
})();
