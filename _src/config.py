"""Site-wide settings. Edit here, then run:  python _src/build.py"""

DOMAIN = 'mada-coaching.com'
EMAIL = 'hello@mada-coaching.com'
VERSION = '10'   # bump to force browsers to reload CSS/JS after changes

GA_ID = 'G-0JW66CX0T1'   # Google Analytics 4 measurement ID

# Online booking links. Single sessions and packages: TidyCal (TidyCal collects payment via Stripe).
# CV Review (async) and Mentorship membership: Stripe payment links.
# While a value is None, the button opens a pre-filled email to EMAIL instead.
BOOKING = {
    'intro': 'https://tidycal.com/mada-coaching/intro-call',   # free 20-min intro call
    'career-strategy': 'https://tidycal.com/mada-coaching/career-strategy',
    'cv-linkedin': 'https://tidycal.com/mada-coaching/cv-linkedin',      # live CV & LinkedIn session
    'cv-review': 'https://buy.stripe.com/aFacN63pIfpN9blcnOa3u00',        # async CV Review (no meeting)
    'apply-network': 'https://tidycal.com/mada-coaching/application-networking',
    'mock': 'https://tidycal.com/mada-coaching/mock-interview',
    'mock-4': 'https://tidycal.com/mada-coaching/mock-interview-4-pack',
    'offer': 'https://tidycal.com/mada-coaching/offer-negotiation',
    'progress-session': 'https://tidycal.com/mada-coaching/progress-session',
    'progress-30': 'https://tidycal.com/mada-coaching/30-day-support',
    'progress-90': 'https://tidycal.com/mada-coaching/first-90-days',
    'membership': 'https://buy.stripe.com/9B6cN60dw3H5cnxfA0a3u01',
    'full-journey': 'https://tidycal.com/mada-coaching/full-journey',
}
