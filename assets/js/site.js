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
