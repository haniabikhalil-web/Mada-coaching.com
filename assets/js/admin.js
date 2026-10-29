// Mada team dashboard (coach accounts only). Reads one function, public.admin_dashboard(), with the signed-in user's token;
// the database refuses anyone who is not a coach. Profile data arrives as counts only. Every server string is written with textContent.
(function () {
  var app = document.getElementById('admin-app');
  if (!app) return;
  var API = app.getAttribute('data-api'), KEY = app.getAttribute('data-key'), HOME = app.getAttribute('data-home') || '../account/';
  var S = window.MadaSession, token = null, data = null, tab = 'users', q = '';

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = text; return n; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function say(msg, link) {
    clear(app); var p = el('p', 'muted', msg); app.appendChild(p);
    if (link) { var a = el('a', 'btn btn-primary', link[0]); a.href = link[1]; a.style.marginTop = '16px'; a.style.display = 'inline-block'; app.appendChild(a); }
  }
  function spin(msg) {
    clear(app); var b = el('div', 'mada-loader'); b.setAttribute('role', 'status');
    var r = el('div', 'mada-loader-ring'); r.setAttribute('aria-hidden', 'true'); b.appendChild(r); b.appendChild(el('p', 'muted', msg)); app.appendChild(b);
  }
  function url(p) { return API.replace(/\/+$/, '') + p; }
  function usd(c) { return '$' + ((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function day(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  var LABEL = {
    timing: { 'already-interviewing': 'Already interviewing', 'within-1-month': 'Within 1 month', '1-3-months': 'In 1–3 months', '3-6-months': 'In 3–6 months', later: 'Later than 6 months', exploring: 'Just exploring', 'not-answered': 'Not answered' },
    tool: { 'intro-case-solving': 'Intro to case solving', 'fit-interviews': 'Fit interviews', 'full-mock-interviews': 'Full mock interviews', 'ai-cv-review': 'AI CV review' }
  };

  function load() {
    spin('Loading the dashboard…');
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    fetch(url('/rest/v1/rpc/admin_dashboard'), { method: 'POST', headers: { 'content-type': 'application/json', apikey: KEY, authorization: 'Bearer ' + token }, body: '{}', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (t) clearTimeout(t);
        if (r.status === 401) return S.recover(API, KEY).then(function (ok) { if (ok) location.reload(); else { S.clear(); say('Your session expired. Sign in again.', ['Sign in at My Mada', HOME]); } });
        if (r.status === 403 || r.status === 400 || r.status === 404) return say('This page is for the Mada team. Your account does not have access.');
        if (!r.ok) return fail();
        return r.json().then(function (j) { data = j; draw(); }, fail);
      }, fail);
  }
  function fail() {
    clear(app); var b = el('div', 'mada-loader'); b.appendChild(el('h2', null, 'That took longer than expected'));
    var x = el('button', 'btn btn-primary', 'Try again'); x.type = 'button'; x.addEventListener('click', load); b.appendChild(x); app.appendChild(b);
  }

  function tile(n, label, sub) { var d = el('div', 'ad-tile'); d.appendChild(el('b', null, String(n))); d.appendChild(el('span', null, label)); if (sub) d.appendChild(el('small', null, sub)); return d; }
  function bars(obj, labels, total) {
    var wrap = el('div', 'ad-bars'), keys = Object.keys(obj || {}).sort(function (a, b) { return obj[b] - obj[a]; });
    if (!keys.length) { wrap.appendChild(el('p', 'muted', 'No answers yet.')); return wrap; }
    var max = Math.max.apply(null, keys.map(function (k) { return obj[k]; }));
    keys.forEach(function (k) {
      var row = el('div', 'ad-bar'); row.appendChild(el('span', 'ad-bar-l', (labels && labels[k]) || k));
      var tr = el('span', 'ad-bar-t'), f = el('i'); f.style.width = Math.max(4, Math.round(100 * obj[k] / max)) + '%'; tr.appendChild(f); row.appendChild(tr);
      row.appendChild(el('span', 'ad-bar-n', String(obj[k]))); wrap.appendChild(row);
    });
    return wrap;
  }
  function spark(days) {
    var NS = 'http://www.w3.org/2000/svg', w = 600, h = 80, max = Math.max.apply(null, days.map(function (d) { return d.n; }).concat([1]));
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('class', 'ad-spark'); s.setAttribute('role', 'img');
    s.setAttribute('aria-label', 'New accounts per day, last 30 days');
    var bw = w / days.length;
    days.forEach(function (d, i) {
      var bh = d.n ? Math.max(3, (d.n / max) * (h - 8)) : 1.5, r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', i * bw + 1); r.setAttribute('y', h - bh); r.setAttribute('width', bw - 2); r.setAttribute('height', bh); r.setAttribute('rx', 2);
      var tt = document.createElementNS(NS, 'title'); tt.textContent = day(d.day) + ': ' + d.n; r.appendChild(tt); s.appendChild(r);
    });
    return s;
  }

  var TABS = {
    users: { name: 'Accounts', cols: ['Email', 'Signed up', 'Last sign-in', 'Verified', 'Profile', 'Single', 'Unlimited', 'Maths', 'Calls'],
      rows: function () { return (data.users || []).map(function (u) { return [u.email, day(u.created_at), u.last_sign_in_at ? day(u.last_sign_in_at) : '', u.verified ? 'Yes' : 'No', u.profile_done ? 'Yes' : '', u.single_paid || '', u.unlimited || '', u.maths || '', u.calls ? u.calls_scored + '/' + u.calls + ' scored' : '']; }); } },
    waitlist: { name: 'Waitlist', cols: ['Email', 'Tool', 'Joined'],
      rows: function () { return (data.waitlist || []).map(function (w) { return [w.email, LABEL.tool[w.tool] || w.tool, day(w.created_at)]; }); } },
    purchases: { name: 'Purchases', cols: ['Email', 'Amount', 'Status', 'Date'],
      rows: function () { return (data.purchases || []).map(function (p) { return [p.email || '', usd(p.amount_cents), p.status, when(p.created_at)]; }); } },
    profiles: { name: 'Profiles', cols: ['Email', 'Name', 'City', 'Country', 'Nationality', 'Education', 'Interviews expected', 'Target firms', 'Target offices', 'Universities', 'Experience', 'Updated'],
      rows: function () { return (data.profiles || []).map(function (p) { return [p.email || '', p.full_name, p.city, p.country, p.nationality || '', p.education || '', LABEL.timing[p.timing] || p.timing || '', (p.target_firms || []).join(', '), (p.target_offices || []).join(', '), (p.universities || []).join(', '), (p.experience || []).join(', '), day(p.updated_at)]; }); } },
    calls: { name: 'Interviews', cols: ['Email', 'Interviewer', 'Case', 'Level', 'Status', 'Date'],
      rows: function () { return (data.calls || []).map(function (c) { return [c.email || '', c.interviewer, c.case_id, c.difficulty, c.status, when(c.created_at)]; }); } }
  };

  function csv(rows, cols) {
    var esc = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    return [cols].concat(rows).map(function (r) { return r.map(esc).join(','); }).join('\n');
  }

  function welcomeBox() {
    var box = el('div', 'ad-card'); box.appendChild(el('h3', null, 'Send the welcome email'));
    box.appendChild(el('p', 'muted', 'Sends the real welcome email from hello@mada-coaching.com to one address, so you can see what new candidates receive.'));
    var row = el('div', 'ad-row'), inp = el('input'); inp.type = 'email'; inp.placeholder = 'name@example.com'; inp.setAttribute('aria-label', 'Send the welcome email to');
    var btn = el('button', 'btn btn-primary btn-sm', 'Send'); btn.type = 'button'; var note = el('p', 'muted'); note.setAttribute('role', 'status');
    btn.addEventListener('click', function () {
      var to = inp.value.trim(); if (!to) return; btn.disabled = true; note.textContent = 'Sending…';
      fetch(url('/functions/v1/admin-welcome-preview'), { method: 'POST', headers: { 'content-type': 'application/json', apikey: KEY, authorization: 'Bearer ' + token }, body: JSON.stringify({ to: to }) })
        .then(function (r) { note.textContent = r.ok ? 'Sent to ' + to + '.' : 'It could not be sent (' + r.status + ').'; btn.disabled = false; }, function () { note.textContent = 'It could not be sent. Check your connection.'; btn.disabled = false; });
    });
    row.appendChild(inp); row.appendChild(btn); box.appendChild(row); box.appendChild(note); return box;
  }

  function draw() {
    clear(app); var t = data.totals || {};
    var top = el('div', 'acct-top mm-top'); top.appendChild(el('span', 'muted', 'Updated ' + when(data.generated_at)));
    var rf = el('button', 'mm-manage', 'Refresh'); rf.type = 'button'; rf.addEventListener('click', load); top.appendChild(rf); app.appendChild(top);

    var tiles = el('div', 'ad-tiles');
    tiles.appendChild(tile(t.accounts, 'Accounts', t.new_7d + ' in the last 7 days, ' + t.new_30d + ' in 30'));
    tiles.appendChild(tile(t.verified, 'Verified emails'));
    tiles.appendChild(tile(t.with_profile, 'Profiles completed'));
    tiles.appendChild(tile(t.waitlist, 'Waitlist sign-ups'));
    tiles.appendChild(tile(t.calls, 'AI interviews', t.calls_scored + ' scored, ' + t.calls_failed + ' failed, ' + t.reports_held + ' held'));
    tiles.appendChild(tile(t.single_paid, 'Single interviews bought'));
    tiles.appendChild(tile(t.unlimited_active, 'Unlimited subscribers'));
    tiles.appendChild(tile(t.maths_active, 'Maths subscribers'));
    tiles.appendChild(tile(usd(t.revenue_cents), 'Single-interview revenue'));
    app.appendChild(tiles);

    var c1 = el('div', 'ad-card'); c1.appendChild(el('h3', null, 'New accounts, last 30 days')); c1.appendChild(spark(data.signups_by_day || [])); app.appendChild(c1);

    var pc = data.profile_counts || {}, ins = el('div', 'ad-card');
    ins.appendChild(el('h3', null, 'Who is applying (from completed profiles)'));
    ins.appendChild(el('p', 'muted', 'Counts from completed profiles. The Profiles tab below lists each one.'));
    var g = el('div', 'ad-grid');
    [['When they expect interviews', pc.timing, LABEL.timing], ['Countries', pc.country], ['Target firms', pc.target_firms], ['Target offices', pc.target_offices], ['Education', pc.education]].forEach(function (x) {
      var d = el('div'); d.appendChild(el('h4', null, x[0])); d.appendChild(bars(x[1], x[2])); g.appendChild(d);
    });
    ins.appendChild(g); app.appendChild(ins);

    var wb = data.waitlist_by_tool || {}, c2 = el('div', 'ad-card'); c2.appendChild(el('h3', null, 'Waitlist by tool')); c2.appendChild(bars(wb, LABEL.tool)); app.appendChild(c2);

    var tabs = el('div', 'ad-tabs'); tabs.setAttribute('role', 'tablist');
    Object.keys(TABS).forEach(function (k) {
      var b = el('button', 'ad-tab' + (k === tab ? ' is-on' : ''), TABS[k].name + ' (' + TABS[k].rows().length + ')'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === tab ? 'true' : 'false');
      b.addEventListener('click', function () { tab = k; q = ''; draw(); }); tabs.appendChild(b);
    });
    app.appendChild(tabs);
    var def = TABS[tab], all = def.rows(), bar = el('div', 'ad-row'), sin = el('input'); sin.type = 'search'; sin.placeholder = 'Search'; sin.value = q; sin.setAttribute('aria-label', 'Search the table');
    var ex = el('button', 'btn btn-ghost btn-sm', 'Download CSV'); ex.type = 'button';
    ex.addEventListener('click', function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(all, def.cols)], { type: 'text/csv' })); a.download = 'mada-' + tab + '-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    });
    bar.appendChild(sin); bar.appendChild(ex); app.appendChild(bar);
    var wrap = el('div', 'ad-table'); app.appendChild(wrap);
    function table() {
      clear(wrap); var rows = all.filter(function (r) { return !q || r.join(' ').toLowerCase().indexOf(q) !== -1; });
      var tb = el('table'), th = el('tr'); def.cols.forEach(function (c) { th.appendChild(el('th', null, c)); }); var hd = el('thead'); hd.appendChild(th); tb.appendChild(hd);
      var bd = el('tbody'); rows.slice(0, 300).forEach(function (r) { var tr = el('tr'); r.forEach(function (v) { tr.appendChild(el('td', null, v)); }); bd.appendChild(tr); }); tb.appendChild(bd); wrap.appendChild(tb);
      wrap.appendChild(el('p', 'muted', rows.length ? 'Showing ' + Math.min(300, rows.length) + ' of ' + rows.length + '.' : 'Nothing matches.'));
    }
    sin.addEventListener('input', function () { q = sin.value.trim().toLowerCase(); table(); }); table();
    app.appendChild(welcomeBox());
  }

  if (!API || !KEY || !S) { say('The dashboard is not available.'); return; }
  S.restore(API, KEY).then(function (s) {
    if (!s) { say('Sign in to My Mada with your coach account, then come back to this page.', ['Sign in at My Mada', HOME]); return; }
    token = s.token; load();
  });
})();
