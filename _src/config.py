"""Site-wide settings. Edit here, then run:  python _src/build.py"""

DOMAIN = 'mada-coaching.com'
EMAIL = 'hello@mada-coaching.com'
VERSION = '8'   # bump to force browsers to reload CSS/JS after changes

# Online booking links (Calendly, Cal.com, Stripe checkout…).
# While a value is None, the button opens a pre-filled email to EMAIL instead.
BOOKING = {
    'intro': 'https://calendly.com/hello-mada-coaching/20min',   # free 20-min intro call
    'career-strategy': None,
    'cv-linkedin': None,      # live CV & LinkedIn session
    'cv-review': None,        # async CV Review (no meeting)
    'apply-network': None,
    'mock': None,
    'mock-4': None,
    'offer': None,
    'progress-session': None,
    'progress-30': None,
    'progress-90': None,
    'membership': None,
    'full-journey': None,
}
