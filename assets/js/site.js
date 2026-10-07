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

  // Coach filters (company + school)
  var sels = document.querySelectorAll('[data-coach-filter]');
  if (sels.length) {
    var cards = document.querySelectorAll('#coach-grid .coach-card');
    var reset = document.getElementById('f-reset'), count = document.getElementById('f-count'), empty = document.getElementById('f-empty');
    var apply = function(){
      var n = 0, active = false;
      cards.forEach(function(c){
        var ok = true;
        sels.forEach(function(s){
          if (!s.value) return;
          active = true;
          if ((c.getAttribute('data-' + s.getAttribute('data-coach-filter')) || '').split('|').indexOf(s.value) < 0) ok = false;
        });
        c.hidden = !ok; if (ok) { n++; c.classList.add('in'); }
      });
      reset.hidden = !active;
      count.textContent = active ? n + ' of ' + cards.length + ' coaches' : '';
      empty.hidden = n > 0;
    };
    sels.forEach(function(s){ s.addEventListener('change', apply); });
    reset.addEventListener('click', function(){ sels.forEach(function(s){ s.value = ''; }); apply(); });
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
