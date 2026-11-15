// Mada AI landing page: event tracking for the main conversion links, and a returning-candidate label on the plan link.
// No sign-in wall and no network call unless this browser already holds a Mada session.
(function () {
  function track(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) { /* analytics never blocks */ } }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-lp]') : null;
    if (a) track('ai_landing_' + a.getAttribute('data-lp'), { destination: a.getAttribute('href') });
  });

})();
