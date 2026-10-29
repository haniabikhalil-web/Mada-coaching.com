// "Join the waitlist" on the Mada AI page: a small modal that stores an email for one tool.
// The browser only ever holds the publishable key and can only call the join_waitlist() function; it cannot read the list.
// Without JavaScript, or if the save fails, the original mailto link still works.
(function () {
  var cfg = document.getElementById('waitlist-cfg');
  var links = document.querySelectorAll('a[data-waitlist]');
  if (!cfg || !links.length || typeof HTMLDialogElement === 'undefined') return;
  var API = (cfg.getAttribute('data-api') || '').replace(/\/+$/, '');
  var KEY = cfg.getAttribute('data-key') || '';
  var CONSENT_VERSION = 'waitlist-2026-10';
  var SLUGS = {
    'Introduction to Case Solving': 'intro-case-solving',
    'Fit Interviews': 'fit-interviews',
    'Full Mock Interviews': 'full-mock-interviews',
    'AI CV Review': 'ai-cv-review'
  };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  var dlg = el('dialog', 'wl-dialog');
  dlg.setAttribute('aria-labelledby', 'wl-title');
  var form = el('form', 'wl-form'); form.setAttribute('novalidate', '');
  var close = el('button', 'wl-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close');
  var title = el('h2', '', ''); title.id = 'wl-title';
  var lead = el('p', 'wl-lead', 'Leave your email and we will let you know the moment it opens. One email, no spam.');
  var lab = el('label', 'wl-label', 'Email address'); lab.setAttribute('for', 'wl-email');
  var email = el('input', 'wl-input'); email.type = 'email'; email.id = 'wl-email'; email.name = 'email';
  email.autocomplete = 'email'; email.inputMode = 'email'; email.required = true; email.maxLength = 254;
  var cwrap = el('label', 'wl-consent');
  var consent = el('input'); consent.type = 'checkbox'; consent.id = 'wl-consent';
  cwrap.appendChild(consent);
  cwrap.appendChild(el('span', '', 'I agree that Mada Coaching may email me once when this tool opens, and I can withdraw at any time.'));
  var msg = el('p', 'wl-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
  var submit = el('button', 'btn btn-primary wl-submit', 'Join the waitlist'); submit.type = 'submit';
  [close, title, lead, lab, email, cwrap, msg, submit].forEach(function (n) { form.appendChild(n); });
  dlg.appendChild(form);
  document.body.appendChild(dlg);

  var tool = '', toolName = '', opener = null, fallback = '';

  function say(text, bad) { msg.textContent = text; msg.className = 'wl-msg' + (bad ? ' bad' : text ? ' ok' : ''); }
  function reset() { email.value = ''; consent.checked = false; say(''); submit.hidden = false; submit.disabled = false; submit.textContent = 'Join the waitlist'; }

  function open(a) {
    var card = a.closest('.ai-prod');
    toolName = (card && card.querySelector('h3') ? card.querySelector('h3').textContent : '') || a.getAttribute('data-tool-name') || '';
    tool = SLUGS[toolName] || a.getAttribute('data-waitlist');
    fallback = a.getAttribute('href');
    opener = a; reset();
    title.textContent = 'Join the ' + toolName + ' waitlist';
    dlg.showModal();
    email.focus();
  }
  links.forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); open(a); });
  });
  close.addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (opener) opener.focus(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || v.length > 254) { say('Please enter a valid email address.', true); email.focus(); return; }
    if (!consent.checked) { say('Please tick the box so we know you are happy to hear from us.', true); consent.focus(); return; }
    submit.disabled = true; submit.textContent = 'Saving…'; say('');
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    fetch(API + '/rest/v1/rpc/join_waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: KEY, authorization: 'Bearer ' + KEY },
      body: JSON.stringify({ p_email: v, p_tool: tool, p_consent: true, p_consent_version: CONSENT_VERSION }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('status ' + r.status);
      say('You are on the list. We will email ' + v + ' when ' + toolName + ' opens.');
      submit.hidden = true;
    }).catch(function () {
      clearTimeout(timer);
      submit.disabled = false; submit.textContent = 'Try again';
      msg.className = 'wl-msg bad'; msg.textContent = '';
      msg.appendChild(document.createTextNode('We could not save that just now. Please try again, or '));
      var a = el('a', '', 'email us instead'); a.href = fallback; msg.appendChild(a); msg.appendChild(document.createTextNode('.'));
    });
  });
})();
