// Mada AI maths drills: the practice page. Pick a difficulty and topics, answer timed consulting-style
// questions, see the worked solution after each one and a summary at the end.
// Every string is written with textContent, never innerHTML. History is kept in this browser only.
(function () {
  var app = document.getElementById('maths-app');
  var M = window.MadaMaths;
  if (!app || !M) return;

  var HISTORY_KEY = 'mada_maths_history';
  var state = { level: 1, topics: M.TOPIC_IDS.slice(), count: 10 };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function readHistory() { try { var h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } }
  function saveHistory(entry) { try { var h = readHistory(); h.unshift(entry); localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20))); } catch (e) { /* storage blocked: fine */ } }
  function fmtTime(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }

  // ---------------------------------------------------------------- setup
  var BLURB = { 1: 'Round numbers and one step. Warm up and build speed.', 2: 'Two steps and messier numbers. Case-interview level.', 3: 'Multi-step and unfamiliar setups. Final-round pace.' };

  function setup() {
    clear();
    var card = el('div', 'card mx-card');
    card.appendChild(el('h3', null, 'Choose your difficulty'));
    var levels = el('div', 'mx-levels'); levels.setAttribute('role', 'radiogroup'); levels.setAttribute('aria-label', 'Difficulty');
    [1, 2, 3].forEach(function (l) {
      var b = el('button', 'mx-level' + (state.level === l ? ' on' : ''));
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', state.level === l ? 'true' : 'false');
      b.appendChild(el('b', null, M.DIFFICULTIES[l])); b.appendChild(el('span', null, BLURB[l]));
      b.addEventListener('click', function () { state.level = l; setup(); });
      levels.appendChild(b);
    });
    card.appendChild(levels);

    card.appendChild(el('h3', 'mx-h', 'Choose your topics'));
    var chips = el('div', 'mx-chips');
    M.TOPIC_IDS.forEach(function (id) {
      var on = state.topics.indexOf(id) !== -1;
      var c = el('button', 'mx-chip' + (on ? ' on' : ''), M.TOPICS[id].label);
      c.type = 'button'; c.setAttribute('aria-pressed', on ? 'true' : 'false');
      c.addEventListener('click', function () {
        var i = state.topics.indexOf(id);
        if (i === -1) state.topics.push(id); else if (state.topics.length > 1) state.topics.splice(i, 1);
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
    go.addEventListener('click', function () { run(M.session({ level: state.level, count: state.count, topics: state.topics })); });
    card.appendChild(go);
    app.appendChild(card);

    var h = readHistory();
    if (h.length) {
      var box = el('div', 'card mx-card'); box.style.marginTop = '20px';
      box.appendChild(el('h3', null, 'Your recent drills'));
      var ul = el('ul', 'mx-history');
      h.slice(0, 5).forEach(function (e) {
        ul.appendChild(el('li', null, M.DIFFICULTIES[e.level] + ': ' + e.correct + ' of ' + e.total + ' correct, ' + fmtTime(e.avgSec) + ' per question'));
      });
      box.appendChild(ul);
      app.appendChild(box);
    }
  }

  // ---------------------------------------------------------------- a run of questions
  function run(questions) {
    var results = [], idx = 0, started = 0, timer = null;

    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    function show() {
      stop(); clear();
      var q = questions[idx];
      var card = el('div', 'card mx-card');
      var top = el('div', 'mx-top');
      top.appendChild(el('span', 'badge', 'Question ' + (idx + 1) + ' of ' + questions.length));
      top.appendChild(el('span', 'tag', q.topicLabel + ' · ' + M.DIFFICULTIES[q.level]));
      var clock = el('span', 'mx-clock', '0:00'); clock.setAttribute('aria-label', 'Time on this question');
      top.appendChild(clock);
      card.appendChild(top);
      card.appendChild(el('p', 'mx-prompt', q.prompt));

      var form = el('form', 'mx-form');
      var input = el('input'); input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off'; input.required = true;
      input.setAttribute('aria-label', 'Your answer in ' + q.unit); input.placeholder = 'Your answer';
      var unit = el('span', 'mx-unit', q.unit);
      var submit = el('button', 'btn btn-primary', 'Check'); submit.type = 'submit';
      var skip = el('button', 'btn btn-ghost', 'Skip'); skip.type = 'button';
      form.appendChild(input); form.appendChild(unit); form.appendChild(submit); form.appendChild(skip);
      card.appendChild(form);
      var fb = el('div', 'mx-feedback'); fb.setAttribute('aria-live', 'polite');
      card.appendChild(fb);
      app.appendChild(card);

      started = Date.now();
      timer = setInterval(function () { clock.textContent = fmtTime((Date.now() - started) / 1000); }, 500);
      input.focus();

      function finish(res) {
        stop();
        var sec = (Date.now() - started) / 1000;
        results.push({ q: q, ok: res.ok, skipped: !!res.skipped, sec: sec });
        input.disabled = true; submit.disabled = true; skip.disabled = true;
        clear(); // rebuild the card with the feedback
        var c2 = el('div', 'card mx-card');
        c2.appendChild(el('span', 'badge', 'Question ' + (idx + 1) + ' of ' + questions.length));
        c2.appendChild(el('p', 'mx-prompt', q.prompt));
        var verdict = el('p', 'mx-verdict ' + (res.ok ? 'good' : 'bad'), res.skipped ? 'Skipped.' : res.ok ? 'Correct.' : 'Not quite.');
        verdict.setAttribute('role', 'status');
        c2.appendChild(verdict);
        c2.appendChild(el('p', null, 'Answer: ' + q.answer + ' ' + q.unit + (res.value !== undefined && !res.ok ? ' (you said ' + res.value + ')' : '') + '. Time: ' + fmtTime(sec) + '.'));
        var ol = el('ol', 'mx-steps');
        q.steps.forEach(function (s) { ol.appendChild(el('li', null, s)); });
        c2.appendChild(el('h4', 'mx-h', 'Worked solution')); c2.appendChild(ol);
        c2.appendChild(el('p', 'muted', 'Tip: ' + q.tip));
        var last = idx === questions.length - 1;
        var next = el('button', 'btn btn-primary', last ? 'See results' : 'Next question'); next.type = 'button';
        next.addEventListener('click', function () { idx++; if (idx < questions.length) show(); else summary(results); });
        c2.appendChild(next);
        app.appendChild(c2);
        next.focus();
      }

      form.addEventListener('submit', function (e) {
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
  function summary(results) {
    clear();
    var correct = results.filter(function (r) { return r.ok; }).length;
    var avg = results.reduce(function (a, r) { return a + r.sec; }, 0) / results.length;
    var card = el('div', 'card mx-card');
    card.appendChild(el('h3', null, 'Drill complete'));
    card.appendChild(el('p', 'mx-score', correct + ' of ' + results.length + ' correct'));
    card.appendChild(el('p', 'muted', 'Average ' + fmtTime(avg) + ' per question. Difficulty: ' + M.DIFFICULTIES[results[0].q.level] + '.'));

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
    app.appendChild(card);

    saveHistory({ at: Date.now(), level: results[0].q.level, correct: correct, total: results.length, avgSec: avg });
  }

  setup();
})();
