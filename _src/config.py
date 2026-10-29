"""Site-wide settings. Edit here, then run:  python _src/build.py"""

DOMAIN = 'mada-coaching.com'
EMAIL = 'hello@mada-coaching.com'
VERSION = '98'   # bump to force browsers to reload CSS/JS after changes

GA_ID = 'G-0JW66CX0T1'   # Google Analytics 4 measurement ID

# Online booking links. Single sessions and packages: TidyCal (TidyCal collects payment via Stripe).
# CV Review (async) and Mentorship membership: TidyCal booking types.
# While a value is None, the button opens a pre-filled email to EMAIL instead.
BOOKING = {
    'intro': 'https://tidycal.com/mada-coaching/intro-call',   # free 20-min intro call
    'career-strategy': 'https://tidycal.com/mada-coaching/career-strategy',
    'cv-linkedin': 'https://tidycal.com/mada-coaching/cv-linkedin',      # live CV & LinkedIn session
    'cv-review': 'https://tidycal.com/mada-coaching/cv-review',        # async CV Review (no meeting)
    'apply-network': 'https://tidycal.com/mada-coaching/application-networking',
    'mock': 'https://tidycal.com/mada-coaching/mock-interview',
    'mock-4': 'https://tidycal.com/mada-coaching/mock-interview-4-pack',
    'offer': 'https://tidycal.com/mada-coaching/offer-negotiation',
    'progress-session': 'https://tidycal.com/mada-coaching/progress-session',
    'membership': 'https://tidycal.com/mada-coaching/mentorship',
    'full-journey': 'https://tidycal.com/mada-coaching/full-journey',
}

# AI case practice (ai/case-practice/). While AI_PRACTICE_LIVE is False the interviewer page is
# informational and Tatiana's button opens a waitlist email. Flip to True only after the voice
# session, payment and report flow are built and tested end to end.
AI_PRACTICE_LIVE = True
AI_PRACTICE_PRICE_USD = 30   # per single interview; shown on the Mada AI page. Revisit once real call costs are known.
AI_FULL_MOCK_PRICE_USD = 50  # one Full Mock (case and fit together); included in the Practice Pass.
AI_PASS_LIVE = True        # Unlimited Interviews is on sale (Case Interviews today; Fit and Full Mock join when built).
AI_PASS_PRICE_USD = 100      # Practice Pass: unlimited interviews a month, subject to fair use.
# Math Drills are included with an active Practice Pass at no extra cost; standalone stays MATHS_PRICE_USD.

# Mada AI maths drills (ai/maths/). While MATHS_PAID_LIVE is False the page is the open, free practice page (unlinked,
# hidden from search). Flip to True only after the backend is deployed and the Stripe price, webhook events and
# customer portal are set up and tested: then visitors sign in and subscribe for MATHS_PRICE_USD a month.
MATHS_PAID_LIVE = True
MATHS_PRICE_USD = 20

# Mada AI interview reports (ai/report/). Both values are public by design (the publishable key is
# meant for browsers). Leave the key as None until the Phase A functions are deployed: the report
# page then shows "not available yet" and makes no network calls. Never put a secret key here.
SUPABASE_URL = 'https://gjijobwtergfgeaaildq.supabase.co'
SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bQyU2LHpTxWVnqBN1eMoNA_LBozNVx6'
