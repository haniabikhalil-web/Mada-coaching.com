// Email signup on the Resources page. The browser holds only the publishable key and can only call subscribe_marketing().
// Consent is recorded with its wording version; the checkbox is never pre-ticked. Without JavaScript the page says to email us.
(function () {
  var form = document.getElementById('subscribe-form');
  if (!form) return;
  var API = (form.getAttribute('data-api') || '').replace(/\/+$/, '');
  var KEY = form.getAttribute('data-key') || '';
  var VERSION = 'site-2026-11-15'; // must match docs/email-automation/consent-wording.md in mada-ai
  var email = document.getElementById('sub-email');
  var consent = document.getElementById('sub-consent');
  var msg = document.getElementById('sub-msg');
  var submit = document.getElementById('sub-submit');

  function say(text, bad) { msg.textContent = text; msg.className = 'wl-msg' + (bad ? ' bad' : text ? ' ok' : ''); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || v.length > 254) { say('Please enter a valid email address.', true); email.focus(); return; }
    if (!consent.checked) { say('Please tick the box so we know you are happy to hear from us.', true); consent.focus(); return; }
    submit.disabled = true; submit.textContent = 'Saving…'; say('');
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    fetch(API + '/rest/v1/rpc/subscribe_marketing', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: KEY, authorization: 'Bearer ' + KEY },
      body: JSON.stringify({ p_email: v, p_source: 'website-resources', p_consent: true, p_consent_version: VERSION }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('status ' + r.status);
      say('Thank you. You are signed up. You can unsubscribe at any time from any email.');
      submit.textContent = 'Signed up ✓';
      try { if (window.gtag) window.gtag('event', 'newsletter_signup', { method: 'resources' }); } catch (err) { /* analytics never blocks */ }
    }).catch(function () {
      clearTimeout(timer);
      submit.disabled = false; submit.textContent = 'Try again';
      say('We could not save that just now. Please try again, or email hello@mada-coaching.com.', true);
    });
  });
})();
