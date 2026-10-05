# mada-coaching.com

Static site for Mada Coaching, hosted on GitHub Pages.

## Editing
- Page content: `_src/pages.py` (pages) and `_src/data.py` (services, prices, coaches, testimonials, FAQ).
- Guides: `_src/guides_data.py`.
- Styles: `assets/css/site.css`. Scripts: `assets/js/site.js`.
- After any change, rebuild: `python _src/build.py` (Python 3.10+, no packages needed).

## Turning on booking and payment
Paste each Calendly / Cal.com / Stripe link into `BOOKING` in `_src/config.py`, then rebuild.
Until a link is set, its button opens a pre-filled email to hello@mada-coaching.com.

## Notes
- Folders starting with `_` are not published by GitHub Pages.
- `CNAME` holds the custom domain. Don't delete it.
- To preview locally, open `index.html` in a browser.
