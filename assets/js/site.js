(function(){
  // Local preview: when opened from disk, folder links need index.html
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach(function(a){
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|#)/.test(h)) return;
      var parts = h.split('#');
      if (parts[0] === '' ) return;
      if (/\/$/.test(parts[0]) || parts[0] === '.' || parts[0] === '..') {
        parts[0] = parts[0].replace(/\/?$/, '/') + 'index.html';
        a.setAttribute('href', parts.join('#'));
      }
    });
  }

  // Mobile menu
  var header = document.querySelector('.site-header');
  var btn = document.querySelector('.menu-btn');
  if (header && btn) {
    btn.addEventListener('click', function(){
      var open = header.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Year
  document.querySelectorAll('[data-year]').forEach(function(el){ el.textContent = new Date().getFullYear(); });

  // Open a guide/FAQ when linked by hash
  function openHash(){
    if (!location.hash) return;
    var el = document.getElementById(location.hash.slice(1));
    if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView({block:'start'}); }
  }
  window.addEventListener('hashchange', openHash); openHash();

  // Guide filters
  var filters = document.querySelectorAll('.filter[data-cat]');
  filters.forEach(function(f){
    f.addEventListener('click', function(){
      var cat = f.getAttribute('data-cat');
      filters.forEach(function(x){ x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); });
      document.querySelectorAll('.guide-cat').forEach(function(g){
        g.hidden = !(cat === 'all' || g.getAttribute('data-cat') === cat);
      });
    });
  });

  // Coach filters: two searchable boxes (company, school). Typing filters the coaches by partial match as you type;
  // picking a suggestion fixes the exact name. The two filters combine; "Clear filters" resets both. Keyboard: arrows, Enter, Escape.
  var boxes = document.querySelectorAll('.cb[data-coach-filter]');
  if (boxes.length) {
    var cards = document.querySelectorAll('#coach-grid .coach-card');
    var reset = document.getElementById('f-reset'), count = document.getElementById('f-count'), empty = document.getElementById('f-empty');
    var norm = function (x) { return (x || '').toLowerCase().replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); };
    var apply = function () {
      var n = 0, active = false;
      cards.forEach(function (c) {
        var ok = true;
        boxes.forEach(function (b) {
          var q = norm(b.querySelector('input').value);
          if (!q) return;
          active = true;
          var vals = (c.getAttribute('data-' + b.getAttribute('data-coach-filter')) || '').split('|');
          if (!vals.some(function (v) { return norm(v).indexOf(q) !== -1; })) ok = false;
        });
        c.hidden = !ok; if (ok) { n++; c.classList.add('in'); }
      });
      reset.hidden = !active;
      count.textContent = active ? n + ' of ' + cards.length + ' coaches' : '';
      empty.hidden = n > 0;
    };
    boxes.forEach(function (b) {
      var key = b.getAttribute('data-coach-filter');
      var input = b.querySelector('input'), list = b.querySelector('.cb-list'), clr = b.querySelector('.cb-clear');
      var seen = {}, all = [];
      cards.forEach(function (c) {
        (c.getAttribute('data-' + key) || '').split('|').forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; all.push(v); } });
      });
      all.sort(function (a, z) { return norm(a) < norm(z) ? -1 : 1; });
      var shown = [], cur = -1;
      function render() {
        var q = norm(input.value);
        shown = all.filter(function (v) { return !q || norm(v).indexOf(q) !== -1; });
        while (list.firstChild) list.removeChild(list.firstChild);
        shown.forEach(function (v, i) {
          var li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = input.id + '-o' + i;
          li.textContent = v.replace(/&amp;/g, '&'); li.setAttribute('aria-selected', i === cur ? 'true' : 'false');
          li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(v); });
          list.appendChild(li);
        });
      }
      function open() { render(); list.hidden = !shown.length; input.setAttribute('aria-expanded', 'true'); }
      function shut() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); cur = -1; input.removeAttribute('aria-activedescendant'); }
      function choose(v) { input.value = v.replace(/&amp;/g, '&'); clr.hidden = false; shut(); apply(); }
      function mark() {
        [].forEach.call(list.children, function (li, i) { li.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
        if (cur >= 0 && list.children[cur]) { input.setAttribute('aria-activedescendant', list.children[cur].id); list.children[cur].scrollIntoView({ block: 'nearest' }); }
      }
      input.addEventListener('focus', open);
      input.addEventListener('input', function () { cur = -1; clr.hidden = !input.value; open(); apply(); });
      input.addEventListener('blur', function () { setTimeout(shut, 120); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(); cur = Math.min(cur + 1, shown.length - 1); mark(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cur = Math.max(cur - 1, 0); mark(); }
        else if (e.key === 'Enter') { if (cur >= 0 && shown[cur]) { e.preventDefault(); choose(shown[cur]); } else { shut(); } }
        else if (e.key === 'Escape') { shut(); }
      });
      clr.addEventListener('click', function () { input.value = ''; clr.hidden = true; shut(); apply(); input.focus(); });
      b._clear = function () { input.value = ''; clr.hidden = true; shut(); };
    });
    reset.addEventListener('click', function () { boxes.forEach(function (b) { b._clear(); }); apply(); });
  }

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); });
  }
})();
