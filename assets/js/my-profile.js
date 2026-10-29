// My Mada "My Profile": a private profile only the signed-in candidate can read or change.
// Stored in Supabase table candidate_profiles through PostgREST with the candidate's own access token; row level security
// lets a candidate see only their own row, and coaches and the AI interviewers never read it. Every string is written with textContent.
(function () {
  var CONSENT_VERSION = 'profile-2026-10';
  var COUNTRIES = ['Afghanistan','Albania','Algeria','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahrain','Bangladesh','Belgium','Brazil','Bulgaria','Canada','Chile','China','Colombia','Croatia','Cyprus','Czechia','Denmark','Egypt','Estonia','Finland','France','Georgia','Germany','Ghana','Greece','Hungary','India','Indonesia','Iran','Iraq','Ireland','Italy','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Mexico','Morocco','Netherlands','New Zealand','Nigeria','Norway','Oman','Pakistan','Palestine','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Tunisia','Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Venezuela','Vietnam','Yemen'];
  var SUGGEST = {
    experience: ['McKinsey & Company','Boston Consulting Group','Bain & Company','Oliver Wyman','Roland Berger','Strategy&','Kearney','L.E.K. Consulting','EY-Parthenon','Deloitte','PwC','KPMG','Accenture','Arthur D. Little','Simon-Kucher','Alvarez & Marsal','Google','Amazon','Microsoft','Aramco','PIF','ADNOC','Emirates','Careem'],
    universities: ['American University of Beirut','American University in Cairo','American University of Sharjah','Khalifa University','King Abdullah University of Science and Technology','King Fahd University of Petroleum and Minerals','King Saud University','Lebanese American University','University of Jordan','Cairo University','NYU Abu Dhabi','London School of Economics','University of Oxford','University of Cambridge','Imperial College London','University College London','Harvard University','MIT','Stanford University','Wharton','INSEAD','London Business School','HEC Paris','IE Business School','ESADE'],
    firms: ['McKinsey & Company','Boston Consulting Group','Bain & Company','Oliver Wyman','Roland Berger','Strategy&','Kearney','L.E.K. Consulting','EY-Parthenon','Deloitte','PwC','KPMG','Accenture','Arthur D. Little','Simon-Kucher','Alvarez & Marsal'],
    offices: ['Dubai','Abu Dhabi','Riyadh','Jeddah','Doha','Kuwait City','Manama','Muscat','Cairo','Amman','Beirut','London','Paris','Frankfurt','Munich','Zurich','Amsterdam','Madrid','Istanbul','New York','San Francisco','Singapore','Mumbai']
  };
  var EDU = ['High school', 'Bachelor’s degree', 'Master’s degree', 'MBA', 'PhD', 'Other'];
  var LIMITS = { experience: 30, universities: 15, firms: 30, offices: 30 };
  var COLS = { experience: 'experience', universities: 'universities', firms: 'target_firms', offices: 'target_offices' };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = text; return n; }
  function uid(token) { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || ''; } catch (e) { return ''; } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var seq = 0;

  function tagInput(key, label, hint, initial) {
    var id = 'pf-' + key + (++seq), tags = (initial || []).slice(), cur = -1, shown = [];
    var wrap = el('div', 'pf-field');
    var lab = el('label', 'pf-label', label); lab.setAttribute('for', id); wrap.appendChild(lab);
    if (hint) wrap.appendChild(el('p', 'pf-hint', hint));
    var box = el('div', 'pf-tags');
    var chips = el('span', 'pf-chips');
    var input = el('input', 'pf-tag-input'); input.id = id; input.type = 'text'; input.autocomplete = 'off'; input.maxLength = 80;
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-controls', id + '-l');
    input.placeholder = 'Type to search or add your own';
    var list = el('ul', 'cb-list'); list.id = id + '-l'; list.setAttribute('role', 'listbox'); list.hidden = true;
    box.appendChild(chips); box.appendChild(input); box.appendChild(list); wrap.appendChild(box);
    function drawChips() {
      while (chips.firstChild) chips.removeChild(chips.firstChild);
      tags.forEach(function (t, i) {
        var c = el('span', 'pf-chip', t);
        var x = el('button', 'pf-chip-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + t);
        x.addEventListener('click', function () { tags.splice(i, 1); drawChips(); input.focus(); });
        c.appendChild(x); chips.appendChild(c);
      });
    }
    function add(v) {
      v = (v || '').replace(/\s+/g, ' ').trim();
      if (!v || v.length > 80) return;
      if (tags.some(function (t) { return t.toLowerCase() === v.toLowerCase(); })) { input.value = ''; return; }
      if (tags.length >= LIMITS[key]) return;
      tags.push(v); input.value = ''; drawChips(); list.hidden = true; input.setAttribute('aria-expanded', 'false');
    }
    function render() {
      var q = input.value.trim().toLowerCase();
      shown = SUGGEST[key].filter(function (s) { return tags.indexOf(s) === -1 && (!q || s.toLowerCase().indexOf(q) !== -1); }).slice(0, 8);
      var typed = input.value.trim();
      if (typed && !shown.some(function (s) { return s.toLowerCase() === typed.toLowerCase(); })) shown.push(typed);
      while (list.firstChild) list.removeChild(list.firstChild);
      shown.forEach(function (s, i) {
        var li = el('li', null, (s === typed && SUGGEST[key].indexOf(s) === -1 ? 'Add “' + s + '”' : s));
        li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === cur ? 'true' : 'false');
        li.addEventListener('mousedown', function (e) { e.preventDefault(); add(s); });
        list.appendChild(li);
      });
      list.hidden = !shown.length; input.setAttribute('aria-expanded', shown.length ? 'true' : 'false');
    }
    input.addEventListener('focus', render);
    input.addEventListener('input', function () { cur = -1; render(); });
    input.addEventListener('blur', function () { setTimeout(function () { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }, 120); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); cur = Math.min(cur + 1, shown.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cur = Math.max(cur - 1, 0); render(); }
      else if (e.key === 'Enter' || e.key === ',') { if (input.value.trim() || cur >= 0) { e.preventDefault(); add(cur >= 0 ? shown[cur] : input.value); cur = -1; } }
      else if (e.key === 'Escape') { list.hidden = true; }
      else if (e.key === 'Backspace' && !input.value && tags.length) { tags.pop(); drawChips(); }
    });
    drawChips();
    return { node: wrap, get: function () { if (input.value.trim()) add(input.value); return tags.slice(); } };
  }

  function field(label, input, opts) {
    opts = opts || {};
    var w = el('div', 'pf-field');
    var l = el('label', 'pf-label', label + (opts.required ? ' *' : '')); l.setAttribute('for', input.id); w.appendChild(l);
    if (opts.hint) w.appendChild(el('p', 'pf-hint', opts.hint));
    w.appendChild(input);
    var err = el('p', 'pf-err'); err.id = input.id + '-err'; err.hidden = true; w.appendChild(err);
    input.setAttribute('aria-describedby', err.id);
    w.setError = function (m) { err.textContent = m || ''; err.hidden = !m; input.setAttribute('aria-invalid', m ? 'true' : 'false'); };
    return w;
  }

  function mount(host, o) {
    // o: { api, key, token(), email, expired() }
    var API = o.api.replace(/\/+$/, '');
    function rest(method, qs, body) {
      var h = { apikey: o.key, authorization: 'Bearer ' + o.token(), 'content-type': 'application/json' };
      if (method !== 'GET') h.prefer = 'return=representation';
      return fetch(API + '/rest/v1/candidate_profiles' + qs, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined });
    }
    var sec = el('section', 'pf'); sec.setAttribute('aria-labelledby', 'pf-title');
    var h = el('h2', 'mm-label', 'My Profile'); h.id = 'pf-title';
    sec.appendChild(h);
    var intro = el('p', 'muted', 'Tell us a little about you so Mada can personalize your experience. Your profile is private: only you can see it. Mada coaches and the AI interviewers do not read it, and you can change or delete it at any time.');
    sec.appendChild(intro);
    var body = el('div', 'pf-body'); sec.appendChild(body); host.appendChild(sec);
    body.appendChild(el('p', 'muted', 'Loading your profile…'));

    var me = uid(o.token());
    rest('GET', '?select=*&user_id=eq.' + encodeURIComponent(me)).then(function (r) {
      if (r.status === 401) return o.expired();
      if (r.status === 404) { unavailable(); return; }
      if (!r.ok) { fail('We could not load your profile just now. Refresh in a minute.'); return; }
      r.json().then(function (rows) { form(rows && rows[0] ? rows[0] : null); });
    }, function () { fail('We could not load your profile just now. Refresh in a minute.'); });

    function clearBody() { while (body.firstChild) body.removeChild(body.firstChild); }
    function fail(m) { clearBody(); body.appendChild(el('p', 'muted mm-err', m)); }
    function unavailable() { clearBody(); body.appendChild(el('p', 'muted', 'My Profile is not available just yet. Please check back soon.')); }

    function form(p) {
      clearBody();
      var f = el('form', 'pf-form'); f.setAttribute('novalidate', '');
      var name = el('input', 'pf-input'); name.id = 'pf-name'; name.type = 'text'; name.autocomplete = 'name'; name.maxLength = 100; name.value = p ? p.full_name : '';
      var city = el('input', 'pf-input'); city.id = 'pf-city'; city.type = 'text'; city.autocomplete = 'address-level2'; city.maxLength = 80; city.value = p ? p.city : '';
      var country = el('input', 'pf-input'); country.id = 'pf-country'; country.type = 'text'; country.autocomplete = 'country-name'; country.maxLength = 80; country.value = p ? p.country : '';
      country.setAttribute('list', 'pf-countries');
      var dl = el('datalist'); dl.id = 'pf-countries'; COUNTRIES.forEach(function (c) { var op = el('option'); op.value = c; dl.appendChild(op); });
      var dob = el('input', 'pf-input'); dob.id = 'pf-dob'; dob.type = 'date'; dob.min = '1900-01-01'; dob.max = today(); dob.autocomplete = 'bday'; dob.value = p ? p.date_of_birth : '';
      var nat = el('input', 'pf-input'); nat.id = 'pf-nat'; nat.type = 'text'; nat.maxLength = 80; nat.value = p && p.nationality ? p.nationality : ''; nat.setAttribute('list', 'pf-countries');
      var edu = el('select', 'pf-input'); edu.id = 'pf-edu';
      var o0 = el('option', null, 'Select…'); o0.value = ''; edu.appendChild(o0);
      EDU.forEach(function (e) { var op = el('option', null, e); op.value = e; edu.appendChild(op); });
      if (p && p.education_level) { if (EDU.indexOf(p.education_level) === -1) { var ox = el('option', null, p.education_level); ox.value = p.education_level; edu.appendChild(ox); } edu.value = p.education_level; }

      var fName = field('Full name', name, { required: true });
      var fDob = field('Date of birth', dob, { required: true, hint: 'Used only to personalize your experience. Never shown to anyone else.' });
      var fCity = field('City', city, { required: true });
      var fCountry = field('Country', country, { required: true });
      var req = el('div', 'pf-grid'); [fName, emailField(), fDob, fCity, fCountry].forEach(function (n) { req.appendChild(n); });
      f.appendChild(req); f.appendChild(dl);

      f.appendChild(el('h3', 'pf-sub', 'Optional'));
      var tExp = tagInput('experience', 'Companies you have worked for', null, p && p.experience);
      var tUni = tagInput('universities', 'Universities', null, p && p.universities);
      var tFirm = tagInput('firms', 'Target firms', 'Firms you would like to join.', p && p.target_firms);
      var tOff = tagInput('offices', 'Target offices', 'Cities you would like to work in.', p && p.target_offices);
      var opt = el('div', 'pf-grid');
      [field('Nationality', nat), field('Education level', edu), tExp.node, tUni.node, tFirm.node, tOff.node].forEach(function (n) { opt.appendChild(n); });
      f.appendChild(opt);

      var cw = el('label', 'wl-consent');
      var cb = el('input'); cb.type = 'checkbox'; cb.id = 'pf-consent'; cb.checked = !!p;
      cw.appendChild(cb);
      cw.appendChild(el('span', null, 'I agree that Mada Coaching may store this information to personalize my experience. It is private to me, and I can edit or delete it at any time.'));
      f.appendChild(cw);
      var msg = el('p', 'wl-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite'); f.appendChild(msg);
      var row = el('div', 'btn-row');
      var save = el('button', 'btn btn-primary', p ? 'Save changes' : 'Save my profile'); save.type = 'submit'; row.appendChild(save);
      if (p) {
        var del = el('button', 'btn btn-ghost', 'Delete my profile'); del.type = 'button';
        del.addEventListener('click', function () {
          if (!window.confirm('Delete your profile? This removes everything saved here and cannot be undone.')) return;
          del.disabled = true;
          rest('DELETE', '?user_id=eq.' + encodeURIComponent(me)).then(function (r) {
            if (r.ok) form(null); else { del.disabled = false; msg.className = 'wl-msg bad'; msg.textContent = 'We could not delete your profile. Please try again.'; }
          }, function () { del.disabled = false; msg.className = 'wl-msg bad'; msg.textContent = 'We could not reach the service. Please try again.'; });
        });
        row.appendChild(del);
      }
      f.appendChild(row);

      function emailField() {
        var w = el('div', 'pf-field');
        var l = el('span', 'pf-label', 'Email'); w.appendChild(l);
        w.appendChild(el('p', 'pf-static', o.email));
        var ch = el('button', 'mm-manage', 'Change email'); ch.type = 'button'; w.appendChild(ch);
        var m2 = el('p', 'pf-hint'); m2.setAttribute('role', 'status'); w.appendChild(m2);
        ch.addEventListener('click', function () {
          ch.hidden = true;
          var ne = el('input', 'pf-input'); ne.type = 'email'; ne.autocomplete = 'email'; ne.setAttribute('aria-label', 'New email address'); ne.placeholder = 'new@example.com';
          var go = el('button', 'btn btn-ghost btn-sm', 'Send confirmation'); go.type = 'button';
          w.appendChild(ne); w.appendChild(go); ne.focus();
          go.addEventListener('click', function () {
            var v = ne.value.trim();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { m2.textContent = 'Please enter a valid email address.'; return; }
            go.disabled = true;
            fetch(API + '/auth/v1/user', { method: 'PUT', headers: { apikey: o.key, authorization: 'Bearer ' + o.token(), 'content-type': 'application/json' }, body: JSON.stringify({ email: v }) })
              .then(function (r) {
                if (r.ok) { m2.textContent = 'We sent a confirmation link to ' + v + '. Your email changes only after you confirm it. Until then, keep signing in with ' + o.email + '.'; ne.hidden = true; go.hidden = true; }
                else { go.disabled = false; m2.textContent = 'We could not start the email change. Please try again, or email hello@mada-coaching.com.'; }
              }, function () { go.disabled = false; m2.textContent = 'We could not reach the service. Please try again.'; });
          });
        });
        return w;
      }

      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = false, first = null;
        function chk(w, input, ok, m) { w.setError(ok ? '' : m); if (!ok) { bad = true; if (!first) first = input; } }
        var nm = name.value.replace(/\s+/g, ' ').trim(), ci = city.value.replace(/\s+/g, ' ').trim(), co = country.value.replace(/\s+/g, ' ').trim();
        chk(fName, name, nm.length >= 2 && nm.length <= 100, 'Please enter your full name.');
        chk(fDob, dob, !!dob.value && dob.value >= '1900-01-01' && dob.value <= today(), 'Please enter a valid date of birth.');
        chk(fCity, city, ci.length >= 1 && ci.length <= 80, 'Please enter your city.');
        chk(fCountry, country, co.length >= 2 && co.length <= 80, 'Please enter your country.');
        if (!cb.checked) { bad = true; msg.className = 'wl-msg bad'; msg.textContent = 'Please tick the box to agree before saving.'; if (!first) first = cb; }
        else if (!bad) msg.textContent = '';
        if (bad) { if (first) first.focus(); return; }
        var data = {
          full_name: nm, date_of_birth: dob.value, city: ci, country: co,
          nationality: nat.value.trim() || null, education_level: edu.value || null,
          experience: tExp.get(), universities: tUni.get(), target_firms: tFirm.get(), target_offices: tOff.get()
        };
        save.disabled = true; msg.className = 'wl-msg'; msg.textContent = 'Saving…';
        var req = p ? rest('PATCH', '?user_id=eq.' + encodeURIComponent(me), data)
                    : rest('POST', '', Object.assign({ user_id: me, consent_version: CONSENT_VERSION }, data));
        req.then(function (r) {
          if (r.status === 401) return o.expired();
          if (!r.ok) throw new Error('status ' + r.status);
          return r.json().then(function (rows) {
            var row = rows && rows[0];
            if (!row) throw new Error('no row');
            form(row);
            var m = body.querySelector('.wl-msg'); if (m) { m.className = 'wl-msg ok'; m.textContent = 'Saved.'; }
          });
        }).catch(function () { save.disabled = false; msg.className = 'wl-msg bad'; msg.textContent = 'We could not save your profile. Please check your details and try again.'; });
      });
      body.appendChild(f);
    }
  }

  window.MadaProfile = { mount: mount };
})();
