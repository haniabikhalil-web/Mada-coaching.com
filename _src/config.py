"""Site-wide settings. Edit here, then run:  python _src/build.py"""

DOMAIN = 'mada-coaching.com'
EMAIL = 'hello@mada-coaching.com'
VERSION = '10'   # bump to force browsers to reload CSS/JS after changes

GA_ID = 'G-0JW66CX0T1'   # Google Analytics 4 measurement ID

# Online booking links (Calendly, Cal.com, Stripe checkout…).
# While a value is None, the button opens a pre-filled email to EMAIL instead.
BOOKING = {
    'intro': 'https://tidycal.com/mada-coaching/intro-call',   # free 20-min intro call
    'career-strategy': 'https://buy.stripe.com/3cIaEY1hA1yXdrB9bCa3u02',
    'cv-linkedin': 'https://buy.stripe.com/6oU6oI5xQ0uT87hfA0a3u03',      # live CV & LinkedIn session
    'cv-review': 'https://buy.stripe.com/aFacN63pIfpN9blcnOa3u00',        # async CV Review (no meeting)
    'apply-network': 'https://buy.stripe.com/7sY00kaSa7Xl5Z9evWa3u04',
    'mock': 'https://buy.stripe.com/cNi28s7FY6ThevFgE4a3u05',
    'mock-4': 'https://buy.stripe.com/6oU3cw2lE1yXdrBevWa3u06',
    'offer': 'https://buy.stripe.com/eVq3cwf8qfpNevFevWa3u07',
    'progress-session': 'https://buy.stripe.com/00w6oIbWegtRafp9bCa3u08',
    'progress-30': 'https://buy.stripe.com/9B66oI0dw2D1evFevWa3u09',
    'progress-90': 'https://buy.stripe.com/14AfZi0dwdhF3R15Zqa3u0a',
    'membership': 'https://buy.stripe.com/9B6cN60dw3H5cnxfA0a3u01',
    'full-journey': 'https://buy.stripe.com/7sYfZi4tM2D10EPevWa3u0b',
}
