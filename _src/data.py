"""Content shared across pages: services, coaches, testimonials, FAQs."""

# ---------------------------------------------------------------- services
# ai: price string, or None when expert-only
STAGES = [
    {
        'svc_line': 'Decide where and how to compete.', 'id': 'position', 'num': '01', 'name': 'Position', 'phase': 'get',
        'line': 'Know where to aim and make your value obvious.',
        'bullets': ['Target firms and roles', 'CV and LinkedIn', 'Your story'],
        'icon': 'search',
        'services': [
            {'key': 'career-strategy', 'outcome': 'A clear target list of firms, offices and level, with a realistic timeline.', 'format': '1 &times; 60-min 1:1 session', 'best': 'Candidates who have not yet decided which firms, offices or level to target.', 'name': 'Career strategy',
             'desc': 'Decide where to aim before you apply: the firms, roles, offices and level that fit your profile, and a realistic timeline to get there.',
             'includes': ['60-minute 1:1 session', 'Target list across firm tiers', 'Office and entry-level choice', 'Written next steps'],
             'expert': '$100', 'ai': '$60'},
            {'key': 'cv-linkedin', 'outcome': 'A CV and LinkedIn profile that read like consulting, reviewed again once revised.', 'format': '1 &times; 60-min live session + 1 review', 'best': 'Candidates with a target list whose CV and LinkedIn do not yet read like consulting.', 'name': 'CV &amp; LinkedIn review',
             'desc': 'Rework your CV and LinkedIn with a coach so your experience reads as evidence a consulting screener is looking for.',
             'includes': ['60-minute live session', 'Annotated feedback on your CV and LinkedIn', 'One review of the revised versions'],
             'expert': '$100', 'ai': '$60'},
            {'key': 'cv-review', 'outcome': 'Expert feedback on your CV within 48 hours: an annotated CV, a scorecard and five priority fixes.', 'format': 'Recorded video review &middot; no meeting', 'best': 'Candidates who want expert feedback on their CV quickly, without scheduling a call.', 'name': 'CV Review <span class="muted">(no meeting)</span>',
             'desc': 'Upload your CV and target role. A coach records a 10&ndash;15 minute video walkthrough and sends it back with an annotated CV, a scorecard and five priority fixes.',
             'includes': ['Delivered within 48 hours', 'Nothing to schedule'],
             'expert': '$50', 'ai': '$30', 'more': 'cv-review'},
        ],
    },
    {
        'svc_line': 'Create opportunities and reach the right people.', 'id': 'connect', 'num': '02', 'name': 'Connect', 'phase': 'get',
        'line': 'Turn applications into a campaign.',
        'bullets': ['Networking strategy', 'Referrals', 'Applications'],
        'icon': 'people',
        'services': [
            {'key': 'apply-network', 'outcome': 'A referral and outreach plan for each target firm, with messages ready to send.', 'format': '1 &times; 60-min 1:1 session', 'best': 'Candidates ready to apply who want referrals and a plan for each firm.', 'name': 'Application &amp; networking strategy',
             'desc': 'Who to contact at each firm, how to ask, and where a referral will make the difference. Then a plan to work through it.',
             'includes': ['60-minute 1:1 session', 'Referral and outreach plan by firm', 'Message templates', 'Application timeline'],
             'expert': '$100', 'ai': '$60'},
        ],
    },
    {
        'svc_line': 'Convert opportunities into offers.', 'id': 'land', 'num': '03', 'name': 'Land', 'phase': 'get',
        'line': 'Perform in interviews and secure the offer.',
        'bullets': ['Case and fit mocks', 'Offer evaluation', 'Negotiation'],
        'icon': 'check',
        'services': [
            {'key': 'mock', 'outcome': 'Specific feedback on case and fit from someone who has interviewed for real, so you know what to fix before the real thing.', 'format': '1 &times; 45-min mock + feedback', 'best': 'Candidates with a first-round or final-round interview coming up.', 'name': 'Mock interview + feedback',
             'desc': 'A realistic case and fit interview, run the way your target firm runs it, by someone who has interviewed for real. Then detailed, specific feedback.',
             'includes': ['45-minute mock interview', 'Detailed feedback on case and fit', 'Your priorities before the real thing'],
             'expert': '$200', 'ai': '$100',
             'package': ('mock-4', '4-mock package', '$500')},
            {'key': 'offer', 'outcome': 'Confidence in your level and package, and a plan to negotiate the right things.', 'format': '1:1 session', 'best': 'Candidates holding an offer, or about to, who want to check level and package before accepting.', 'name': 'Offer evaluation &amp; negotiation',
             'desc': 'Understand what you have actually been offered, from level to package to Gulf allowances and gratuity, then ask for the right things.',
             'includes': ['Offer and level review', 'Package benchmarking', 'Negotiation plan and rehearsal'],
             'expert': '$100', 'ai': '$60'},
        ],
    },
    {
        'svc_line': 'Succeed once you have joined.', 'id': 'progress', 'num': '04', 'name': 'Progress', 'phase': 'rise',
        'line': 'Succeed once you are in.',
        'bullets': ['Onboarding', 'Performance and reviews', 'Promotion'],
        'icon': 'chart',
        'services': [
            {'key': 'progress-session', 'outcome': 'A clear next step on the question that is holding you back.', 'format': '1 &times; 60-min 1:1 session', 'best': 'Consultants with a specific question, review or piece of difficult feedback.', 'name': 'Progress session',
             'desc': 'One conversation with someone outside the problem: your first weeks, a review, difficult feedback, a staffing issue or a promotion case.',
             'includes': ['60-minute 1:1 session'],
             'expert': '$100', 'ai': None},
            {'key': 'progress-30', 'outcome': 'A steady sounding board through a project, a review cycle or a decision.', 'format': '2 calls + check-ins over 30 days', 'best': 'A defined stretch, such as a new project, a review cycle or a decision to make.', 'name': '30-Day support',
             'desc': 'Support through a specific stretch, such as a new project, a review cycle or a decision you need to make.',
             'includes': ['2 calls', 'Async check-ins between calls'],
             'expert': '$150', 'ai': None},
            {'key': 'progress-90', 'outcome': 'A strong start in your new role, with a written 30-60-90 plan and a mentor through your first quarter.', 'format': '4 calls over 90 days + written plan', 'best': 'Consultants about to start, or just starting, a new firm or role.', 'name': 'First 90 days',
             'desc': 'Start your new role well: learn how the team works, own something early and build your reputation on purpose.',
             'includes': ['4 calls across 90 days', 'Written 30-60-90 plan', 'Async check-ins'],
             'expert': '$350', 'ai': None},
            {'key': 'membership', 'outcome': 'A standing mentor for projects, feedback and career decisions.', 'format': 'Monthly membership', 'best': 'Consultants in role who want a standing mentor over time.', 'name': 'Mentorship membership',
             'desc': 'For consultants already in role who want a standing mentor: someone with no organisational agenda who helps you think projects, feedback and career decisions through.',
             'includes': ['Mentor calls', 'Project check-ins', 'End-of-project reviews'],
             'expert': '$50<small>/month</small>', 'ai': None, 'cta': 'Request to join'},
        ],
    },
]

FULL_JOURNEY = {
    'key': 'full-journey', 'outcome': 'One coherent campaign, from target list to negotiated offer, with the same coach throughout.', 'expert': '$750', 'ai': '$450', 'separately': '$900',
    'best': 'Candidates starting from scratch who want the whole process handled as one engagement.',
    'includes': ['Career strategy session', 'CV &amp; LinkedIn review', 'Application &amp; networking session',
                 'Four mock interviews with feedback', 'Offer negotiation session', 'Email check-ins between stages'],
}

# ---------------------------------------------------------------- AI
AI_TOOLS = [
    {'name': 'AI CV Review', 'icon': 'doc',
     'desc': 'Upload your consulting CV and receive structured feedback and recommendations.'},
    {'name': 'AI Case Practice', 'icon': 'chart',
     'desc': 'Practice consulting cases on demand and receive feedback on your approach, structure and performance.'},
    {'name': 'AI Fit Interview Practice', 'icon': 'mic',
     'desc': 'Practice behavioral and fit questions, refine your stories and improve your answers through repetition.'},
    {'name': 'AI Application Support', 'icon': 'send',
     'desc': 'Get support improving cover letters, networking messages and other recruiting materials.'},
]

# ---------------------------------------------------------------- people
HANI = {
    'name': 'Hani Abi Khalil', 'photo': 'hani.jpg',
    'role': 'Founder &middot; Engagement Manager and official interviewer, Oliver Wyman',
    'stats': [('300+', 'candidates coached'), ('200+', 'official interviews for Oliver Wyman')],
    'experience': ['Engagement Manager and official interviewer, Oliver Wyman',
                   'Previously Strategy&amp; and Booz Allen Hamilton'],
    'education': ['MBA, INSEAD (Singapore and France)', 'Executive education, London School of Economics',
                  'BSc Economics, Saint Joseph University of Beirut',
                  'Financial Modeling &amp; Valuation Analyst (FMVA), Corporate Finance Institute'],
}

COACHES = [
    {'name': 'Hani Abi Khalil', 'photo': 'hani.jpg', 'role': 'Engagement Manager, Oliver Wyman',
     'prev': 'Booz Allen Hamilton &middot; Strategy&amp;',
     'edu': ['MBA, INSEAD', 'BSc Economics, Saint Joseph University of Beirut'], 'count': '300+',
     'linkedin': 'https://www.linkedin.com/in/hani-abikhalil/'},
    {'name': 'Samer Rayess', 'photo': 'samer.jpg', 'role': 'Engagement Manager, Strategy&amp;',
     'prev': None,
     'edu': ['MBA, Columbia'], 'count': '100+',
     'linkedin': 'https://www.linkedin.com/in/samer-rayess-893a80123/'},
    {'name': 'Christian Whaibe', 'photo': 'christian.jpg', 'role': 'Engagement Manager, Oliver Wyman',
     'prev': 'Deloitte &middot; Booz Allen Hamilton',
     'edu': ['Master in Entrepreneurship, HEC Paris', 'Master in Civil Engineering'], 'count': '70+',
     'linkedin': 'https://www.linkedin.com/in/christian-whaibe/'},
    {'name': 'Karim Chamesddine', 'photo': 'karim.jpg', 'role': 'Engagement Manager, FTI',
     'prev': None,
     'edu': ['MBA, INSEAD'], 'count': '50+',
     'linkedin': 'https://www.linkedin.com/in/karim-a-chamseddine-/'},
    {'name': 'Ana Bonilla', 'photo': 'ana.jpg', 'role': 'Engagement Manager, FTI',
     'prev': None,
     'edu': ['MBA, INSEAD'], 'count': None,
     'linkedin': 'https://www.linkedin.com/in/ana-bonilla-albornoz/'},
    {'name': 'Nicolas Khoriati', 'photo': 'nicolas.jpg', 'role': 'Former Strategy&amp; consultant',
     'prev': 'Four years at Strategy&amp;',
     'edu': ['MBA, INSEAD'], 'count': None,
     'linkedin': 'https://www.linkedin.com/in/nicolas-khoriati/'},
]

# ---------------------------------------------------------------- proof
TESTIMONIALS = [
    ('The feedback was direct, practical, and tailored to where I needed to improve &mdash; not just generic interview advice.',
     'Rafael', 'Consulting candidate &middot; Venezuela'),
    ('The sessions gave me a much clearer understanding of what interviewers were actually looking for. I left each session knowing exactly what to improve and how to work on it.',
     'Abdulaziz', 'Consulting candidate &middot; Saudi Arabia'),
    ('The coaching helped me sharpen both my answers and the way I presented myself. The difference between my first and later mock interviews was very clear.',
     'Joseph', 'Consulting candidate &middot; Lebanon'),
    ('The sessions felt very close to the real interview experience. The feedback was specific, challenging, and exactly what I needed to improve quickly.',
     'Rebecca', 'Consulting candidate &middot; UK'),
]

SEGMENTS = [
    ('Students &amp; graduates', 'get', 'Internships and first consulting roles.', 'A structured start to recruiting.'),
    ('Master&rsquo;s &amp; MBA students', 'get', 'Recruiting during or straight after the programme.', 'Positioning, timing and interview depth.'),
    ('Experienced hires', 'get', 'Moving from industry, government, finance or tech.', 'Reframing experience, level and negotiation.'),
    ('Current consultants', 'rise', 'In their first years at a firm.', 'Performance, reviews and promotion.'),
]

PRINCIPLES = [
    ('people', 'Insider-led', 'Coaches who have interviewed, hired and worked at the firms candidates target.'),
    ('link', 'One partner, before and after the offer', 'The same method from first target list to first promotion.'),
    ('badge', 'Vetted and matched', 'Every coach is vetted by the Mada team, and every candidate is matched to the right coach.'),
    ('bolt', 'Expert where it matters, AI where it scales', 'Live coaching for the moments that count. AI tools for practice and prep.'),
]


def faq_full(url):
    return [
        ('Are you a recruitment agency?',
         'No. We don&rsquo;t place candidates into jobs and we have no relationship with any employer. We make you much more effective at navigating consulting recruiting yourself.'),
        ('Who will coach me?',
         'One of our experienced coaches, every one vetted by the Mada team. We match each candidate to a coach based on your target firms, your level and what you need. If you have a preference, say so on the intro call.'),
        ('What happens on the free intro call?',
         'Twenty minutes, no charge and no obligation. You tell us where you are and what you&rsquo;re targeting. We tell you where to start, or tell you honestly if we&rsquo;re not the right help.'),
        ('What&rsquo;s the difference between Mada coaching and Mada AI?',
         f'Coaching is 1:1 with an experienced consultant or interviewer, for personal guidance and high-stakes decisions. <a href="{url("ai")}">Mada AI</a> is a set of self-serve tools for practice and repetition, coming soon. They work well together.'),
        ('When will Mada AI open?',
         f'We&rsquo;re building it now. <a href="{url("ai")}#tools">Join the waitlist</a> for any tool and we&rsquo;ll email you when it opens. All coaching is available today.'),
        ('How long are sessions?',
         'Most sessions run 60 minutes. A mock interview is a 45-minute realistic interview followed by detailed feedback.'),
        ('Can I book one service, or combine them?',
         'Both. Every service stands on its own, and most candidates combine two or three. If you want the whole process handled as one engagement, that&rsquo;s the Full Journey.'),
        ('My interview is next week. Can you still help?',
         'Usually yes, and it&rsquo;s one of the most common reasons people come to us. We&rsquo;ll focus on the gaps that will make the biggest difference rather than trying to cover everything.'),
        ('Do you work with students, or only experienced hires?',
         'Both. We coach students and graduates going for a first role, master&rsquo;s and MBA students, experienced hires moving into consulting, and consultants already in the job.'),
        ('Is it consulting only?',
         'Yes. We focus on strategy and management consulting. We don&rsquo;t cover software engineering, coding or other technical interviews.'),
        ('Can I work with Mada from outside the UAE?',
         'Yes. Coaching is online. We&rsquo;re built around Middle East recruiting and open to candidates anywhere, and we schedule across Gulf, European, Asian and American time zones.'),
        ('How do I pay?',
         'Once we&rsquo;ve agreed your session, we confirm it by email together with how to pay. Online booking and payment are coming to this site shortly.'),
        ('Do you guarantee an offer?',
         'No, and you should be cautious of anyone who does. We have no role in any employer&rsquo;s hiring decision. What we improve is how well prepared and positioned you are when it&rsquo;s made.'),
        ('What is your cancellation policy?',
         f'You can reschedule free of charge up to 24 hours before a session. Full terms are on the <a href="{url("refunds")}">cancellation and refund policy</a> page.'),
    ]
