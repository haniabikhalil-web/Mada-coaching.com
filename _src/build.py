#!/usr/bin/env python3
"""Mada Coaching static site builder.

Run from anywhere:  python _src/build.py
Writes every page into the repo root (one folder per page, each with index.html).
Folders starting with "_" are ignored by GitHub Pages (Jekyll), so this source stays private to the repo.

To switch on online booking or payment later, fill in the links in config.py — nothing else needs to change.
"""
import os, sys, html
from urllib.parse import quote

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
sys.path.insert(0, SRC)

import config as C

LOGO = open(os.path.join(SRC, 'logo.svg')).read()
YEAR = '2026'

# ---------------------------------------------------------------- helpers
class Ctx:
    def __init__(self, path):
        self.path = path            # '' for home, 'services' etc.
        depth = 0 if path == '' else path.count('/') + 1
        self.rel = './' if depth == 0 else '../' * depth

    def url(self, target):
        """Relative link to another page ('' = home), with optional #anchor."""
        anchor = ''
        if '#' in target:
            target, anchor = target.split('#', 1)
            anchor = '#' + anchor
        if target == '':
            return (self.rel if self.rel != './' else './') + anchor
        return f'{self.rel}{target}/' + anchor

    def asset(self, p):
        return f'{self.rel}assets/{p}'


def mailto(subject, body=''):
    q = 'subject=' + quote(subject)
    if body:
        q += '&body=' + quote(body)
    return f'mailto:{C.EMAIL}?{q}'


INTRO_BODY = ("Hi Mada team,\n\nI'd like to book a free intro call.\n\n"
              "Where I am now:\nWhat I'm targeting (firms / roles / office):\nAny deadlines:\n"
              "My time zone:\n\n(Feel free to attach your CV.)\n")


def book_href(key, label):
    """Live booking link if configured, otherwise a pre-filled email."""
    link = C.BOOKING.get(key)
    if link:
        return link
    if key == 'intro':
        return mailto('Free intro call', INTRO_BODY)
    return mailto(f'Booking request: {label}',
                  f"Hi Mada team,\n\nI'd like to book: {label}.\n\nWhere I am now:\nWhat I'm targeting:\nMy time zone:\n")


def waitlist_href(label):
    return mailto(f'Waitlist: {label}',
                  f"Hi Mada team,\n\nPlease let me know when {label} opens.\n\nWhat I'm targeting:\n")


def intro_btn(ctx, cls='btn-primary', text='Book a free intro call'):
    return f'<a class="btn {cls}" href="{ctx.url("book")}">{text} <span class="arrow" aria-hidden="true">&rarr;</span></a>'


ICONS = {
    'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    'people': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.6c2.2.4 3.6 2 4 4.4"/>',
    'check': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
    'chart': '<path d="M4 20h16"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="6" width="3" height="12" rx="1"/><rect x="16" y="9" width="3" height="9" rx="1"/>',
    'link': '<path d="M9.5 14.5l5-5"/><path d="M10.5 6.5l1.8-1.8a4 4 0 015.7 5.7l-1.8 1.8"/><path d="M13.5 17.5l-1.8 1.8a4 4 0 01-5.7-5.7l1.8-1.8"/>',
    'badge': '<path d="M12 3l2.3 1.6 2.8-.1.9 2.7 2.2 1.7-.9 2.7.9 2.7-2.2 1.7-.9 2.7-2.8-.1L12 21l-2.3-1.6-2.8.1-.9-2.7-2.2-1.7.9-2.7-.9-2.7 2.2-1.7.9-2.7 2.8.1z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
    'bolt': '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
    'doc': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    'chat': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
    'send': '<path d="M21 3L3 10.5l7 3 3 7z"/><path d="M10 13.5L21 3"/>',
    'compass': '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'shield': '<path d="M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
    'heart': '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6l8.5 7 8.5-7"/>',
}


def icon(name, wrap=True):
    svg = (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
           f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')
    return f'<span class="icon">{svg}</span>' if wrap else svg


def faq(items, ids=None):
    out = ['<div class="faq">']
    for i, (q, a) in enumerate(items):
        idattr = f' id="{ids[i]}"' if ids else ''
        out.append(f'<details{idattr}><summary>{q}</summary><div class="answer">{a}</div></details>')
    out.append('</div>')
    return '\n'.join(out)


def cta_band(ctx, title='Tell us where you are. We&rsquo;ll help you find the next step.',
             text='Start with a free 20-minute intro call. No obligation to continue.'):
    return f'''
<section class="tight"><div class="wrap">
  <div class="cta-band reveal">
    <h2>{title}</h2>
    <p>{text}</p>
    <div class="btn-row">{intro_btn(ctx, 'btn-light')}<a class="btn btn-ghost" href="{ctx.url('services')}">See services</a></div>
    <span class="sun" aria-hidden="true"></span>
  </div>
</div></section>'''


# ---------------------------------------------------------------- layout
NAV = [('how-it-works', 'How it works'), ('services', 'Services'), ('ai', 'Mada AI'),
       ('coaches', 'Coaches'), ('resources', 'Resources'), ('about', 'About')]

def header(ctx):
    cur = ctx.path.split('/')[0]
    links = ''.join(
        '<li><a href="%s"%s>%s</a></li>' % (ctx.url(p), ' aria-current="page"' if cur == p else '', t)
        for p, t in NAV)
    mobile = ''.join(f'<li><a href="{ctx.url(p)}">{t}</a></li>' for p, t in NAV)
    return f'''
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav">
    <a class="logo" href="{ctx.url('')}" aria-label="Mada Coaching home">{LOGO}</a>
    <ul class="nav-links">{links}</ul>
    <div class="nav-cta">
      <a class="btn btn-primary btn-sm" href="{ctx.url('book')}">Book a free intro call</a>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav-panel" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </div>
  <div class="nav-panel" id="nav-panel"><div class="wrap">
    <ul>{mobile}<li><a href="{ctx.url('cv-review')}">CV Review</a></li></ul>
    <a class="btn btn-primary" href="{ctx.url('book')}">Book a free intro call</a>
  </div></div>
</header>'''


def footer(ctx):
    u = ctx.url
    return f'''
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="logo" href="{u('')}" aria-label="Mada Coaching home">{LOGO}</a>
        <p>Consulting career coaching, from your first target list to your first promotion. <span class="foot-ar" lang="ar">مدى</span> means reach.</p>
        <p><a href="mailto:{C.EMAIL}">{C.EMAIL}</a></p>
      </div>
      <div>
        <h4>Services</h4>
        <ul>
          <li><a href="{u('services#position')}">Position</a></li>
          <li><a href="{u('services#connect')}">Connect</a></li>
          <li><a href="{u('services#land')}">Land</a></li>
          <li><a href="{u('services#progress')}">Progress</a></li>
          <li><a href="{u('services#full-journey')}">Full Journey</a></li>
          <li><a href="{u('cv-review')}">CV Review</a></li>
        </ul>
      </div>
      <div>
        <h4>Mada</h4>
        <ul>
          <li><a href="{u('how-it-works')}">How it works</a></li>
          <li><a href="{u('ai')}">Mada AI</a></li>
          <li><a href="{u('coaches')}">Coaches</a></li>
          <li><a href="{u('about')}">About</a></li>
          <li><a href="{u('resources')}">Resources</a></li>
          <li><a href="{u('book')}">Book &amp; FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4>Legal</h4>
        <ul>
          <li><a href="{u('privacy')}">Privacy</a></li>
          <li><a href="{u('terms')}">Terms</a></li>
          <li><a href="{u('refunds')}">Cancellations &amp; refunds</a></li>
          <li><a href="{u('cookies')}">Cookies</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <p>As Mada grows, we intend to give a portion of our profits to UNESCO to help fund education in Lebanon. This is an intended contribution, not a partnership, endorsement or affiliation.</p>
      <p>Firm names are used only to describe our coaches&rsquo; experience and the recruiting processes we help candidates prepare for. Mada Coaching is not affiliated with, endorsed by or partnered with any of them.</p>
      <p>&copy; <span data-year>{YEAR}</span> Mada Coaching. All rights reserved.</p>
    </div>
  </div>
</footer>'''


def page(path, title, description, body, ctx=None, og_title=None):
    ctx = ctx or Ctx(path)
    canonical = f'https://{C.DOMAIN}/' + (f'{path}/' if path else '')
    full_title = title if path == '' else f'{title} | Mada Coaching'
    og_title = og_title or full_title
    desc = html.escape(description, quote=True)
    doc = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{full_title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#0F1F4B">
<link rel="icon" href="{ctx.rel}favicon.ico" sizes="32x32">
<link rel="icon" type="image/svg+xml" href="{ctx.rel}favicon.svg">
<link rel="apple-touch-icon" href="{ctx.rel}apple-touch-icon.png">
<link rel="manifest" href="{ctx.rel}site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Mada Coaching">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="https://{C.DOMAIN}/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="{ctx.asset('fonts/bricolage-grotesque.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{ctx.asset('fonts/instrument-sans.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{ctx.asset('css/site.css')}?v={C.VERSION}">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
{header(ctx)}
<main id="main">
{body}
</main>
{footer(ctx)}
<script src="{ctx.asset('js/site.js')}?v={C.VERSION}" defer></script>
</body>
</html>
'''
    out_dir = os.path.join(ROOT, path) if path else ROOT
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(doc)
    return doc


def build():
    import pages
    built = pages.build_all()
    print(f'Built {len(built)} pages:', ', '.join(p or '/' for p in built))


if __name__ == '__main__':
    build()
