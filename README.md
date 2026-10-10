# mada-coaching.com

Static site for Mada Coaching, hosted on GitHub Pages at
[mada-coaching.com](https://mada-coaching.com).

---

## ⚠️ Do not edit the HTML files directly

**Every `.html` file in this repo is generated.** `index.html`,
`services/index.html`, `coaches/index.html` and the rest are build output, not
source. If you edit one by hand, the next build overwrites your work and it is
gone.

Edit the Python files in `_src/`, then rebuild.

---

## Making a change

```bash
python3 _src/build.py
```

Python 3.10+, no packages to install. It rewrites all 15 pages in about a
second, then commit both your `_src/` change and the regenerated HTML.

To preview before committing, open `index.html` in a browser.

## Where things live

| What you want to change | File |
| --- | --- |
| Page copy, sections, page structure | `_src/pages.py` |
| Services, prices, coaches, testimonials, FAQ | `_src/data.py` |
| Resource guides | `_src/guides_data.py` |
| Domain, contact email, booking links, analytics ID, asset version | `_src/config.py` |
| Site-wide header, footer, nav, `<head>` | `_src/build.py` |
| Styles | `assets/css/site.css` |
| Scripts | `assets/js/site.js` |
| Images | `assets/img/` |

Styles, scripts and images are *not* generated — edit those directly. After
changing the CSS or JS, bump `VERSION` in `_src/config.py` and rebuild, so
returning visitors get the new file instead of a cached copy.

## Working together

Both of us push straight to `main`, so:

1. **Pull first.** `git pull` (or Pull origin in GitHub Desktop) before you
   start editing. Because the HTML is generated, two people building from
   different starting points produces conflicts in every page at once, which
   are miserable to untangle.
2. Make your change in `_src/`.
3. Run the build.
4. Commit and push.

## Deployment

Pushing to `main` triggers `.github/workflows/static.yml`, which publishes the
whole repo to GitHub Pages. It takes about 20 seconds. There is no staging
environment — **a push to `main` is a change to the live site.**

`CNAME` holds the custom domain. Don't delete it.

## Booking and payment links

`BOOKING` in `_src/config.py` maps each service to its scheduling or checkout
link. While a value is `None`, that button opens a pre-filled email to
hello@mada-coaching.com instead. Paste the real link in, rebuild, and the
button switches over.

## Analytics

Google Analytics 4 is wired into the page template in `_src/build.py`, with the
measurement ID in `GA_ID` in `_src/config.py`. It lands on every page
automatically — don't paste the tag into individual pages, or those pages will
double-count.

If you change what analytics collects, the Cookie Policy and Privacy Policy in
`_src/pages.py` describe it specifically and need updating to match.

## Notes

- `_src/` is served publicly, like everything else in the repo — the build
  workflow uploads the entire repo. Don't put anything private in it.
- `python3 _src/build.py` also regenerates `sitemap.xml` and `robots.txt`.
