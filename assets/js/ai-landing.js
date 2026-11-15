// Mada AI landing page: event tracking for the main conversion links, and a returning-candidate label on the plan link.
// No sign-in wall and no network call unless this browser already holds a Mada session.
(function () {
  function track(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) { /* analytics never blocks */ } }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-lp]') : null;
    if (a) track('ai_landing_' + a.getAttribute('data-lp'), { destination: a.getAttribute('href') });
  });

  var link = document.querySelector('a[data-signed-label]');
  var cfg = document.getElementById('waitlist-cfg');
  var S = window.MadaSession;
  if (!link || !cfg || !S || !S.load) return;
  var s = S.load();
  if (!s) return;
  var API = (cfg.getAttribute('data-api') || '').replace(/\/+$/, '');
  var KEY = cfg.getAttribute('data-key') || '';
  if (!API || !KEY) return;
  // A signed-in candidate who already has a saved report goes straight to their plan and progress; everyone else is offered the assessment.
  fetch(API + '/functions/v1/readiness', {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: KEY, authorization: 'Bearer ' + s.token },
    body: JSON.stringify({ action: 'state' })
  }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (j && j.latest) link.innerHTML = link.getAttribute('data-signed-label') + ' <span aria-hidden="true">&rarr;</span>';
  }).catch(function () { /* keep the default label */ });
})();
