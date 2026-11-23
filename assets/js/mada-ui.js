// Mada UI kit: the one icon library, the one card component and the interview info footer, shared by My Mada,
// Mada Academy and the AI interview page. Every string is written with textContent.
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  // One set of line icons: 24x24 grid, round caps, drawn with currentColor. 'circle' is a 9px ring.
  var ICONS = {
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M6 11h12v9H6z'],
    clock: ['M12 7v5l3 2', 'circle'],
    arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
    chevron: ['M6 9l6 6 6-6'],
    flag: ['M6 21V4', 'M6 5h11l-2 4 2 4H6'],
    book: ['M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z', 'M12 6v13.5'],
    mic: ['M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z', 'M6 11a6 6 0 0 0 12 0', 'M12 17v4'],
    play: ['M8 5.5v13l11-6.5z'],
    compass: ['circle', 'M15.5 8.5l-2 5-5 2 2-5z'],
    bars: ['M5 20v-8', 'M12 20V5', 'M19 20v-5'],
    target: ['circle', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 12h.01'],
    layers: ['M12 3l9 5-9 5-9-5z', 'M3 12.5l9 5 9-5', 'M3 17l9 5 9-5'],
    trophy: ['M8 21h8', 'M12 17v4', 'M7 4h10v5a5 5 0 0 1-10 0z', 'M7 6H4v2a3 3 0 0 0 3 3', 'M17 6h3v2a3 3 0 0 1-3 3'],
    chat: ['M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z'],
    // products
    gauge: ['M4.5 17a8.5 8.5 0 1 1 15 0', 'M12 13l3.5-4', 'M12 13h.01'],
    cap: ['M3 9l9-4.5L21 9l-9 4.5z', 'M7 11.2V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-3.8', 'M21 9v5'],
    cv: ['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 14l2 2 4-4'],
    fit: ['M4 5h16v11H9l-5 4z', 'M8 9.5h8', 'M8 12.5h5'],
    interview: ['M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z', 'M5 11a7 7 0 0 0 14 0', 'M12 18v3'],
    maths: ['M5 4h14v16H5z', 'M8 8h8', 'M8 12h2', 'M12 12h2', 'M16 12h.01', 'M8 16h2', 'M12 16h2', 'M16 16h.01'],
    unlimited: ['M7 8a4 4 0 1 0 0 8c4 0 6-8 10-8a4 4 0 1 1 0 8c-4 0-6-8-10-8z'],
    coach: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 20a6 6 0 0 1 12 0', 'M17 11a2.5 2.5 0 1 0 0-5', 'M21 19a5 5 0 0 0-4-4.9'],
    // support and information
    reports: ['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6'],
    headset: ['M4 15v-3a8 8 0 0 1 16 0v3', 'M4 13h3v6H5.5A1.5 1.5 0 0 1 4 17.5z', 'M20 13h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5z', 'M17 19c0 1.5-2 2-5 2'],
    shield: ['M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z', 'M9 12l2.2 2.2L15.5 10']
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  // An icon as an inline SVG. Size and stroke come from the CSS (.m-ic, and the sizes set by its container), never from the caller.
  function icon(name, extraClass) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'm-ic' + (extraClass ? ' ' + extraClass : ''));
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    (ICONS[name] || []).forEach(function (d) {
      var p;
      if (d === 'circle') { p = document.createElementNS(NS, 'circle'); p.setAttribute('cx', '12'); p.setAttribute('cy', '12'); p.setAttribute('r', '9'); }
      else { p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); }
      s.appendChild(p);
    });
    return s;
  }

  // The icon in its container: same box, same centring, same colours everywhere. opts: round (circle), muted (grey).
  function iconBox(name, opts) {
    opts = opts || {};
    var b = el('span', 'm-icon' + (opts.round ? ' round' : '') + (opts.muted ? ' muted' : ''));
    b.appendChild(icon(name));
    return b;
  }

  // The one card. o: {cls, icon, round, muted, title, text, note, badge, badgeCls, foot}
  // Layout is fixed: icon and badge on top, title, text, note, then the foot pinned to the bottom of the card.
  function card(o) {
    var c = el('article', 'm-card' + (o.cls ? ' ' + o.cls : ''));
    var top = el('div', 'm-card-top');
    if (o.icon) top.appendChild(iconBox(o.icon, { round: o.round, muted: o.muted }));
    if (o.badge) top.appendChild(el('span', 'badge m-badge ' + (o.badgeCls || ''), o.badge));
    c.appendChild(top);
    c.appendChild(el('h3', 'm-card-title', o.title));
    if (o.text) c.appendChild(el('p', 'm-card-text', o.text));
    if (o.note) c.appendChild(el('p', 'm-card-note', o.note));
    if (o.foot) { var f = el('div', 'm-card-foot'); f.appendChild(o.foot); c.appendChild(f); }
    return c;
  }

  // The three information cards and the brand line under the AI interview page. Links come from data-* on the host element.
  function infoFooter(host) {
    var d = host.dataset || {};
    var items = [
      { icon: 'reports', title: 'Your interview reports', text: 'Access your previous interview assessments.', cta: 'View my reports', href: d.reports },
      { icon: 'headset', title: 'Need assistance?', text: 'Had an issue with your interview? We’re here to help.', cta: 'Contact support', href: d.support },
      { icon: 'shield', title: 'Your privacy matters', text: 'Mada reports are developmental assessments, not official employer scoring.', cta: 'Privacy policy', href: d.privacy }
    ];
    var grid = el('div', 'm-grid m-info-grid');
    items.forEach(function (it) {
      var a = el('a', 'm-link', it.cta + ' ');
      a.href = it.href || '#';
      var arrow = el('span', 'm-link-arrow', '→'); arrow.setAttribute('aria-hidden', 'true'); a.appendChild(arrow);
      grid.appendChild(card({ cls: 'm-info-card', icon: it.icon, title: it.title, text: it.text, foot: a }));
    });
    var brand = el('p', 'm-info-brand');
    var home = el('a', null, 'Mada'); home.href = d.home || '/';
    brand.appendChild(home); brand.appendChild(document.createTextNode(' – Prepare smarter. Interview confidently.'));
    host.textContent = '';
    host.appendChild(grid);
    host.appendChild(brand);
  }

  window.MadaUI = { icon: icon, iconBox: iconBox, card: card, el: el, infoFooter: infoFooter };

  function boot() {
    var hosts = document.querySelectorAll('[data-mada-info]');
    for (var i = 0; i < hosts.length; i++) infoFooter(hosts[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
