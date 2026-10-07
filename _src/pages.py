import re
"""Page content. Each function builds one page."""
from build import (Ctx, page, icon, faq, cta_band, intro_btn, book_href, waitlist_href, mailto, C)
from data import (STAGES, FULL_JOURNEY, AI_TOOLS, HANI, COACHES, TESTIMONIALS, SEGMENTS, PRINCIPLES, faq_full)


# ---------------------------------------------------------------- shared blocks
def journey_block(ctx, link=True):
    cards = []
    for s in STAGES:
        rise = ' rise' if s['phase'] == 'rise' else ''
        lis = ''.join(f'<li>{b}</li>' for b in s['bullets'])
        cards.append(f'''<a class="step{rise} reveal" href="{ctx.url('services#' + s['id'])}" style="text-decoration:none;color:inherit">
  <div class="step-top">{icon(s['icon'])}<span class="num">{s['num']}</span></div>
  <h3>{s['name']}</h3><p>{s['line']}</p><ul>{lis}</ul></a>''' if link else
                     f'''<div class="step{rise} reveal">
  <div class="step-top">{icon(s['icon'])}<span class="num">{s['num']}</span></div>
  <h3>{s['name']}</h3><p>{s['line']}</p><ul>{lis}</ul></div>''')
    return f'''<div class="journey-labels" aria-hidden="true"><span>Get in</span><span class="rise">Rise</span></div>
<div class="journey">{''.join(cards)}</div>'''


def coach_cards(ctx):
    out = []
    for c in COACHES:
        if c.get('photo'):
            avatar = f'<img src="{ctx.asset("img/" + c["photo"])}" alt="{c["name"]}" width="84" height="84" loading="lazy">'
        else:
            initials = ''.join(w[0] for w in c['name'].split()[:2])
            avatar = f'<span class="avatar" aria-hidden="true">{initials}</span>'
        rows = []
        if c.get('prev'):
            rows.append(f'<div class="coach-row"><span class="k">Worked for</span><span>{c["prev"]}</span></div>')
        if c.get('edu'):
            rows.append(f'<div class="coach-row"><span class="k">Education</span><span>{"<br>".join(c["edu"])}</span></div>')
        foot = []
        if c.get('count'):
            foot.append(f'<span><b style="color:var(--ink)">{c["count"]}</b> candidates coached</span>')
        if c.get('linkedin'):
            foot.append(f'<a href="{c["linkedin"]}" target="_blank" rel="noopener" aria-label="{c["name"]} on LinkedIn">LinkedIn <span class="arrow" aria-hidden="true">&rarr;</span></a>')
        foot_html = f'<div class="card-foot">{"".join(foot)}</div>' if foot else ''
        role_html = f'<p class="role">{c["role"]}</p>' if c.get('role') else ''
        out.append(f'''<div class="card coach-card reveal" data-companies="{'|'.join(c['companies'])}" data-schools="{'|'.join(c['schools'])}">
  <div class="coach">{avatar}
  <div><h3>{c['name']}</h3>{role_html}</div></div>
  <div class="coach-rows">{''.join(rows)}</div>
  {foot_html}
</div>''')
    return ''.join(out)


def coach_filters():
    def opts(key):
        vals = sorted({v for c in COACHES for v in c[key]}, key=lambda x: x.replace('&amp;', '&').lower())
        return '<option value="">All</option>' + ''.join(f'<option value="{v}">{v}</option>' for v in vals)
    return f'''<div class="coach-filters" role="group" aria-label="Filter coaches">
  <label class="select-pill"><span>Company</span><select id="f-company" data-coach-filter="companies">{opts('companies')}</select></label>
  <label class="select-pill"><span>School</span><select id="f-school" data-coach-filter="schools">{opts('schools')}</select></label>
  <button class="filter" type="button" id="f-reset" hidden>Clear filters</button>
  <p class="muted small" id="f-count" aria-live="polite"></p>
</div>'''


def testimonial_cards():
    return ''.join(f'''<figure class="quote reveal" style="margin:0"><p>{q}</p>
<footer><b>{n}</b><br>{loc}</footer></figure>''' for q, n, loc in TESTIMONIALS)


def segments_block():
    out = []
    for name, phase, line, need in SEGMENTS:
        badge = '<span class="badge get">Get in</span>' if phase == 'get' else '<span class="badge rise">Rise</span>'
        out.append(f'''<div class="card reveal"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px">
<h3 style="margin:0">{name}</h3>{badge}</div><p style="color:var(--ink);margin-bottom:6px">{line}</p><p class="small">Needs: {need}</p></div>''')
    return ''.join(out)


def principles_block():
    out = []
    for i, (ic, t, d) in enumerate(PRINCIPLES):
        dark = ' dark' if i == 0 else ''
        out.append(f'<div class="card{dark} reveal">{icon(ic)}<h3>{t}</h3><p>{d}</p></div>')
    return ''.join(out)


HORIZON = '''<div class="horizon" aria-hidden="true"><span class="h-line"></span><span class="h-sun"></span></div>'''


# ---------------------------------------------------------------- home
def home():
    ctx = Ctx('')
    u = ctx.url
    body = f'''
<section class="hero">
  <div class="hero-ar" lang="ar" aria-hidden="true">مدى</div>
  <div class="wrap" style="position:relative">
    <p class="eyebrow">Consulting career coaching &middot; Middle East-focused</p>
    <h1>Get into consulting.<br>Then get ahead in it.</h1>
    <p class="lede">Expert 1:1 coaching from consultants who went through the process, now work at the firms and were hired into those roles. Plus Mada AI, coming soon, to build your skills between sessions.</p>
    <p class="brand-line">Reach the room. Rise in it.</p>
    <div class="btn-row">{intro_btn(ctx)}<a class="btn btn-ghost" href="{u('services')}">See services and prices</a></div>
    {HORIZON}
    <div class="stats two">
      <div class="stat"><b>1,000+</b><span>candidates coached by our coaches</span></div>
      <div class="stat"><b>500+</b><span>official interviews conducted for consulting firms</span></div>
    </div>
  </div>
</section>

<section class="bg-mist">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Where are you now?</p>
      <h2>Start at the step you&rsquo;re at.</h2>
    </div>
    <div class="grid g4">
      <a class="card pick reveal" href="{u('services#position')}"><span class="tag">Applying</span><h3>I&rsquo;m applying, or about to</h3><p>Decide where to aim, sharpen your CV and LinkedIn, and plan your outreach.</p><span class="pick-go">Position and Connect <span class="arrow" aria-hidden="true">&rarr;</span></span></a>
      <a class="card pick reveal" href="{u('services#mock')}"><span class="tag">Interview booked</span><h3>I have an interview coming up</h3><p>Realistic case and fit mocks with someone who has interviewed for real.</p><span class="pick-go">Mock interviews <span class="arrow" aria-hidden="true">&rarr;</span></span></a>
      <a class="card pick reveal" href="{u('services#offer')}"><span class="tag">Offer received</span><h3>I have an offer</h3><p>Understand the level and package, then negotiate the right things.</p><span class="pick-go">Offer and negotiation <span class="arrow" aria-hidden="true">&rarr;</span></span></a>
      <a class="card pick reveal" href="{u('services#progress')}"><span class="tag">Already consulting</span><h3>I&rsquo;m already a consultant</h3><p>Onboarding, reviews and promotion, with someone outside the problem.</p><span class="pick-go">Progress <span class="arrow" aria-hidden="true">&rarr;</span></span></a>
    </div>
    <p class="muted" style="margin-top:24px">Not sure? <a href="{u('services#full-journey')}">The Full Journey</a> covers the whole process as one engagement.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">The problem we solve</p>
      <h2>Candidates struggle twice: getting in, then getting ahead.</h2>
    </div>
    <div class="grid g2">
      <div class="card reveal"><span class="tag">Problem 1 &middot; Getting in</span><h3>An opaque process, navigated alone</h3>
        <ul><li>Which firms realistically fit your profile</li><li>How consulting recruiting actually works</li><li>How to position your experience</li><li>How to network and secure referrals</li><li>How to prepare for case and fit interviews</li><li>How to evaluate and negotiate an offer</li></ul></div>
      <div class="card dark reveal"><span class="tag">Problem 2 &middot; Thriving inside</span><h3>Unwritten rules, learned by trial and error</h3>
        <ul><li>How to perform on projects</li><li>How staffing and feedback work</li><li>How to work with managers and partners</li><li>How to build an internal reputation</li><li>How performance decisions are made</li><li>How and when to progress</li></ul></div>
    </div>
  </div>
</section>

<section class="bg-mist">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">The journey</p>
      <h2>Four steps, from target list to promotion.</h2>
    </div>
    {journey_block(ctx)}
    <p style="margin-top:28px"><a href="{u('how-it-works')}">How a Mada engagement works <span class="arrow" aria-hidden="true">&rarr;</span></a></p>
    <p class="muted" style="margin-top:12px">Want to practice between sessions? <a href="{u('ai')}">Mada AI</a> is coming soon: self-serve tools for CV feedback, case practice and interview prep. <a href="{u('ai')}">Meet Mada AI <span class="arrow" aria-hidden="true">&rarr;</span></a></p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Who coaches</p>
      <h2>Coaches who have been hired, and invited by the Mada team.</h2>
      <p class="lede">Every coach is vetted by the Mada team before joining, and every candidate is matched to the right coach.</p>
    </div>
    <div class="grid g2">{coach_cards(ctx)}</div>
    <p style="margin-top:28px"><a href="{u('coaches')}">Meet the coaches <span class="arrow" aria-hidden="true">&rarr;</span></a></p>
  </div>
</section>

<section class="bg-mist">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">What candidates say</p>
      <h2>Real people. Real progress.</h2>
      <p class="lede">Candidates Hani has coached, identified by first name only for privacy.</p>
    </div>
    <div class="grid g2">{testimonial_cards()}</div>
  </div>
</section>

<section>
  <div class="wrap narrow">
    <div class="section-head reveal"><p class="eyebrow">Questions</p><h2>Before you book.</h2></div>
    {faq(faq_full(u)[:1] + faq_full(u)[1:3] + [faq_full(u)[3]] + [faq_full(u)[12]])}
    <p style="margin-top:24px"><a href="{u('book#faq')}">See all questions <span class="arrow" aria-hidden="true">&rarr;</span></a></p>
  </div>
</section>
{cta_band(ctx)}
'''
    page('', 'Mada Coaching | Get into consulting. Then get ahead in it.',
         '1:1 coaching from experienced consultants and interviewers: applications, CVs, networking, interviews, offers and life inside the firm. Middle East-focused.',
         body, ctx)


# ---------------------------------------------------------------- how it works
def how_it_works():
    ctx = Ctx('how-it-works')
    u = ctx.url
    stage_detail = []
    details = {
        'position': ('Before you apply anywhere, decide where you can realistically win and make that obvious on paper.',
                     ['A target list across MBB, Tier 2 strategy firms, Big Four strategy practices and boutiques', 'The right office and entry level for your profile', 'A CV and LinkedIn that read as consulting evidence', 'A one-minute story that ties it together']),
        'connect': ('Most offers start with a conversation. Turn networking into a plan rather than a series of cold messages.',
                    ['Who to talk to at each firm and office', 'Outreach that leads with a real question', 'Where a referral matters, and how to earn one', 'An application timeline you can actually keep']),
        'land': ('Interviews reward structured thinking under pressure, which is built through practice with people who have interviewed for real.',
                 ['Case interviews in the format your target firm uses', 'Fit stories that survive the follow-up questions', 'Offer evaluation, including level, package and Gulf allowances', 'A negotiation plan, rehearsed before the call']),
        'progress': ('Getting into consulting is hard. Staying in consulting can be even harder. This is the part most coaching stops before.',
                     ['Your first 90 days: learn how the team works and own something early', 'Reviews, feedback and how performance decisions are made', 'Staffing, managers and partners', 'When and how to make the case for promotion']),
    }
    for s in STAGES:
        intro, items = details[s['id']]
        rise = s['phase'] == 'rise'
        lis = ''.join(f'<li>{x}</li>' for x in items)
        stage_detail.append(f'''<div class="split reveal" style="padding:40px 0;border-top:1px solid var(--line);align-items:start">
  <div><span class="badge {'rise' if rise else 'get'}">{'Rise' if rise else 'Get in'} &middot; Step {s['num']}</span>
    <h2 style="margin-top:16px">{s['name']}</h2><p class="lede" style="margin-top:12px">{s['line']}</p></div>
  <div><p>{intro}</p><ul class="checks">{lis}</ul>
    <p style="margin-top:20px"><a href="{u('services#' + s['id'])}">{s['name']} services and prices <span class="arrow" aria-hidden="true">&rarr;</span></a></p></div>
</div>''')

    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">How it works</p>
  <h1>One method, from first target list to first promotion.</h1>
  <p class="lede">Mada breaks a consulting career move into four steps. Use one, or let us carry you through all of them.</p>
  <div class="btn-row">{intro_btn(ctx)}</div>
</div></header>

<section>
  <div class="wrap">
    {journey_block(ctx)}
  </div>
</section>

<section class="bg-mist">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Working with Mada</p><h2>What happens when you get in touch.</h2></div>
    <div class="grid g4">
      <div class="card reveal"><span class="tag">1 &middot; Intro call</span><h3>Tell us where you are</h3><p>A free 20-minute call. We&rsquo;ll tell you where to start, or honestly if we&rsquo;re not the right help.</p></div>
      <div class="card reveal"><span class="tag">2 &middot; Matching</span><h3>We pick your coach</h3><p>Based on your target firms, level and what you need. Every coach is vetted by the Mada team.</p></div>
      <div class="card reveal"><span class="tag">3 &middot; Sessions</span><h3>Live 1:1 sessions</h3><p>Work with your coach at the step where you need help: a single session, a package or the Full Journey.</p></div>
      <div class="card dark reveal"><span class="tag">4 &middot; Beyond the offer</span><h3>Stay for Progress</h3><p>Your first 90 days, reviews and promotion, with someone outside the problem.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">The four steps in detail</p><h2>What we work on at each step.</h2></div>
    {''.join(stage_detail)}
  </div>
</section>

<section class="bg-navy">
  <div class="wrap">
    <div class="split">
      <div class="reveal"><p class="eyebrow">Between sessions</p>
        <h2>Practice more with Mada AI.</h2></div>
      <div class="reveal"><p>Mada AI is a set of self-serve tools for CV feedback, case practice and interview preparation, for when repetition matters.</p>
        <p>The tools are coming soon. Every coaching service is available now.</p>
        <div class="btn-row" style="margin-top:24px"><a class="btn btn-light" href="{u('ai')}">Meet Mada AI</a></div></div>
    </div>
  </div>
</section>
{cta_band(ctx)}
'''
    page('how-it-works', 'How it works',
         'Mada breaks a consulting career move into four steps: Position, Connect, Land and Progress. Use one, or work through all four with a coach.',
         body, ctx)


# ---------------------------------------------------------------- services
def svc_row(ctx, svc, rise=False):
    inc_items = svc.get('includes', [])
    inc = f'<ul class="checks cols">{"".join(f"<li>{x}</li>" for x in inc_items)}</ul>' if inc_items else ''
    more = (f'<p style="margin:14px 0 0"><a href="{ctx.url(svc["more"])}">How CV Review works <span class="arrow" aria-hidden="true">&rarr;</span></a></p>'
            if svc.get('more') else '')
    label = svc['name'].split(' <span')[0].replace('&amp;', '&')
    cta = svc.get('cta', 'Book')
    pkg = ''
    if svc.get('package'):
        k, pname, pprice = svc['package']
        pkg = f'<p class="pkg">{pname}: <b>{pprice}</b></p>'
    r = ' rise' if rise else ''
    return f'''<div class="svc-card{r} reveal" id="{svc['key']}">
  <div class="svc-main">
    <h3>{svc['name']}</h3>
    <p class="outcome">{svc['outcome']}</p>
    <p class="desc">{svc['desc']}</p>
    <p class="svc-best"><b>Best for</b> {svc['best']}</p>
    {inc}{more}
  </div>
  <div class="svc-price">
    <div class="lbl">{svc['format']}</div>
    <div class="amt">{svc['expert']}</div>{pkg}
  </div>
</div>'''


def services():
    ctx = Ctx('services')
    u = ctx.url
    groups = []
    for s in STAGES:
        rise = ' rise' if s['phase'] == 'rise' else ''
        rows = ''.join(svc_row(ctx, x, s['phase'] == 'rise') for x in s['services'])
        groups.append(f'''<div class="svc-group" id="{s['id']}">
  <div class="svc-group-head{rise}"><span class="num">{s['num']}</span><h2>{s['name']}</h2><p>{s['svc_line']}</p></div>
  {rows}
</div>''')
    fj = FULL_JOURNEY
    fj_inc = ''.join(f'<li>{x}</li>' for x in fj['includes'])
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">Mada Experts &middot; 1:1 coaching</p>
  <h1>Expert coaching for every stage of your consulting journey.</h1>
  <p class="lede">Work 1:1 with experienced consultants and interviewers who understand what it takes to break into consulting&mdash;and succeed once you&rsquo;re there.</p>
  <p class="lede" style="margin-top:12px">Whether you need help choosing your target firms, strengthening your application, preparing for interviews, evaluating an offer or navigating life inside consulting, start with the support you need.</p>
  <div class="btn-row"><a class="btn btn-primary" href="#coaching">Explore expert coaching <span class="arrow" aria-hidden="true">&darr;</span></a></div>
</div></header>

<section class="tight" style="padding-bottom:0">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Choose your step</p><h2>Four steps, one journey.</h2></div>
    {journey_block(ctx)}
  </div>
</section>

<section id="full-journey" class="tight">
  <div class="wrap">
    <div class="featured reveal">
      <div>
        <span class="badge get">Position &rarr; Connect &rarr; Land</span>
        <h2>The Full Journey</h2>
        <p class="outcome">{fj['outcome']}</p>
        <p class="best"><b>Best for:</b> {fj['best']}</p>
        <ul class="checks">{fj_inc}</ul>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="opt"><div class="opt-label">Package &middot; one engagement</div>
          <div class="opt-price">{fj['expert']} <small>{fj['saving']}</small></div></div>
      </div>
    </div>
  </div>
</section>

<section id="coaching" style="padding-top:8px">
  <div class="wrap">
    {''.join(groups)}
    <p class="muted small">Indicative USD prices. Multi-session packages are used within 6 months of purchase. See <a href="{u('terms')}">terms</a> and <a href="{u('refunds')}">cancellations and refunds</a>.</p>
  </div>
</section>

<section class="bg-mist tight">
  <div class="wrap">
    <div class="xsell reveal">
      <div><h2>Want to practice between coaching sessions? <span class="badge soon">Coming soon</span></h2>
        <p class="muted">Use Mada AI for on-demand CV feedback, case practice and interview preparation whenever you need it.</p></div>
      <a class="btn btn-ghost" href="{u('ai')}">Explore Mada AI</a>
    </div>
  </div>
</section>
{cta_band(ctx, 'Not sure which service you need?', 'Tell us where you are on a free 20-minute call and we&rsquo;ll point you to the right starting step.')}
'''
    page('services', 'Expert coaching & prices',
         'Expert 1:1 coaching from experienced consultants and interviewers: career strategy, CV and LinkedIn, applications and networking, mock interviews, offer negotiation and support once you are in. From $50.',
         body, ctx)


# ---------------------------------------------------------------- Mada AI
def ai():
    ctx = Ctx('ai')
    u = ctx.url
    tools = ''.join(f'''<div class="card tool reveal">{icon(t['icon'])}<span class="badge soon">Coming soon</span>
<h3>{t['name']}</h3><p>{t['desc']}</p>
<a class="btn btn-ghost btn-sm" href="{waitlist_href(t['name'])}" style="margin-top:8px">Join waitlist</a></div>''' for t in AI_TOOLS)
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">Mada AI &middot; Coming soon</p>
  <h1>Practice more. Prepare anytime.</h1>
  <p class="lede">Mada AI gives you always-on tools to sharpen your consulting applications and interview skills at your own pace.</p>
  <p class="lede" style="margin-top:12px">Review your CV, practice cases, prepare fit answers and improve through repetition&mdash;whenever you need it.</p>
  <p class="lede" style="margin-top:12px">For personalized guidance and high-stakes decisions, work with a <a href="{u('services')}">Mada expert</a>.</p>
  <div class="btn-row"><a class="btn btn-primary" href="#tools">Explore Mada AI <span class="arrow" aria-hidden="true">&darr;</span></a></div>
</div></header>

<section class="bg-mist" id="tools">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Self-serve tools</p><h2>Four tools, in development.</h2><p class="lede">Join the waitlist for any of them and we&rsquo;ll email you when it opens.</p></div>
    <div class="grid g2">{tools}</div>
  </div>
</section>

<section class="bg-navy">
  <div class="wrap narrow center" style="text-align:center">
    <h2>Need a human perspective?</h2>
    <p class="lede center" style="margin-top:16px">Some decisions need more than an algorithm. Work 1:1 with an experienced consultant or interviewer for personalized feedback, nuanced career advice and high-stakes preparation.</p>
    <div class="btn-row" style="justify-content:center;margin-top:28px"><a class="btn btn-light" href="{u('services')}">Explore expert coaching</a></div>
  </div>
</section>
'''
    page('ai', 'Mada AI',
         'Self-serve AI tools for CV feedback, case practice, fit interview practice and application support: practice more, prepare anytime. Coming soon: join the waitlist.',
         body, ctx)


# ---------------------------------------------------------------- coaches
def coaches():
    ctx = Ctx('coaches')
    u = ctx.url
    h = HANI
    exp = ''.join(f'<li>{x}</li>' for x in h['experience'])
    edu = ''.join(f'<li>{x}</li>' for x in h['education'])
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">Coaches</p>
  <h1>Coaches who have been hired, and invited by the Mada team.</h1>
  <p class="lede">Every Mada coach has worked at the kind of firm you&rsquo;re targeting. Every one is vetted by the Mada team before joining, and every candidate is matched to the right coach.</p>
</div></header>

<section class="bg-mist">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Our coaches</p><h2>Experienced consultants, vetted by the Mada team.</h2></div>
    {coach_filters()}
    <div class="grid g2" id="coach-grid">{coach_cards(ctx)}</div>
    <p class="card" id="f-empty" hidden style="margin-top:20px">No coach matches both filters yet. Try clearing one, or tell us what you need on the intro call and we&rsquo;ll match you.</p>
    <p class="muted small" style="margin-top:20px">Our bench is growing. New coaches join only after being vetted by the Mada team.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">How we choose coaches</p><h2>Who coaches at Mada.</h2></div>
    <div class="grid g3">
      <div class="card reveal">{icon('target')}<h3>Where they&rsquo;ve worked</h3><p>Coaches come from MBB, Tier 2 strategy firms such as Strategy&amp;, Oliver Wyman, Kearney, Roland Berger and Arthur D. Little, and Big Four strategy practices. Some are current consultants coaching alongside their role.</p></div>
      <div class="card reveal">{icon('badge')}<h3>How they&rsquo;re vetted</h3><p>Every coach is vetted by the Mada team before joining. We look for people who have interviewed or hired, and who can give direct, specific feedback.</p></div>
      <div class="card reveal">{icon('link')}<h3>How you&rsquo;re matched</h3><p>The Mada team matches every candidate to a coach based on target firms, office, level and the step you&rsquo;re at. If you have a preference, tell us on the intro call.</p></div>
    </div>
  </div>
</section>

<section class="bg-navy">
  <div class="wrap">
    <div class="split">
      <div class="reveal"><p class="eyebrow">Coach with Mada</p><h2>Consultant, and want to coach?</h2></div>
      <div class="reveal"><p>We&rsquo;re growing the bench with experienced consultants from MBB, Tier 2 strategy firms and Big Four strategy practices. Tell us a little about yourself and the Mada team will be in touch.</p>
        <div class="btn-row" style="margin-top:24px"><a class="btn btn-light" href="{mailto('Coaching with Mada', 'Hi Mada team,' + chr(10) + chr(10) + 'I would like to coach with Mada.' + chr(10) + chr(10) + 'Current / previous firm and title:' + chr(10) + 'Candidates coached so far:' + chr(10) + 'LinkedIn:' + chr(10))}">Apply to coach</a></div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">What candidates say</p><h2>Coaching with Hani.</h2></div>
    <div class="grid g2">{testimonial_cards()}</div>
  </div>
</section>
{cta_band(ctx)}
'''
    page('coaches', 'Coaches',
         'Mada coaches have worked at Oliver Wyman, Strategy&, FTI and other strategy firms, and every coach is vetted by the Mada team.',
         body, ctx)


# ---------------------------------------------------------------- about
def about():
    ctx = Ctx('about')
    u = ctx.url
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">About Mada</p>
  <h1>We help ambitious people get into consulting, then keep rising once they&rsquo;re in.</h1>
</div></header>

<section>
  <div class="wrap">
    <div class="split">
      <div class="reveal">
        <p class="eyebrow">The name</p>
        <h2>Mada means reach.</h2>
        <p class="lede" style="margin-top:16px">In Arabic, <span lang="ar" style="font-family:var(--arabic)">مدى</span> (mada) means reach, range or horizon: how far a career can go.</p>
        <p class="muted">Our logo is a horizon line with the sun rising over it. Our job is to extend how far every candidate can reach: into the room, and beyond it.</p>
      </div>
      <div class="reveal" style="background:var(--navy);border-radius:var(--radius);min-height:320px;display:grid;place-items:center;text-align:center;padding:40px;position:relative;overflow:hidden">
        <div>
          <div lang="ar" style="font-family:var(--arabic);font-weight:700;font-size:clamp(110px,14vw,170px);line-height:1;color:var(--dawn)">مدى</div>
          <p style="color:#fff;font-weight:600;margin-top:24px">Mada (n.): reach, range, horizon.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="bg-navy">
  <div class="wrap">
    <p class="eyebrow">What we believe</p>
    <h2 style="max-width:920px" class="reveal">Talent is everywhere. Access to people who know how the system works is not.</h2>
    <div class="beliefs">
      <div class="belief reveal"><h4>Our belief</h4><p>The gap is knowledge of the process, not potential.</p></div>
      <div class="belief accent reveal"><h4>Our purpose</h4><p>Extend how far every candidate can reach: into the room, and beyond it.</p></div>
      <div class="belief reveal"><h4>How we work</h4><p>Insider-led, vetted by the Mada team and matched to you, with one partner before and after the offer.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div class="reveal"><p class="eyebrow">What we are, and aren&rsquo;t</p><h2>A career partner, not a recruiter.</h2></div>
      <div class="reveal">
        <p>Mada is not a recruitment agency. We don&rsquo;t place candidates into jobs, and we have no relationship with any employer&rsquo;s hiring decisions.</p>
        <p>We are not only interview coaching either. We help candidates decide where to aim, position themselves, build a strategy to get in, prepare for the process, negotiate the offer, and then do well once they&rsquo;re in.</p>
        <p>We&rsquo;re built in the UAE around Middle East recruiting, and open to candidates anywhere.</p>
      </div>
    </div>
  </div>
</section>

<section class="bg-mist" id="giving-back">
  <div class="wrap narrow">
    <div class="reveal">
      {icon('heart')}
      <p class="eyebrow">Giving back</p>
      <h2>Your journey can help support someone else&rsquo;s.</h2>
      <p class="lede" style="margin-top:16px">Mada is built on the idea that access to the right guidance can change someone&rsquo;s trajectory. As Mada grows, we intend to donate a portion of our profits to UNESCO to help fund education in Lebanon.</p>
      <p class="muted small">This is a contribution we intend to make, not a partnership, endorsement or affiliation with UNESCO. Details of how and when donations are made will be published here once they are formalised.</p>
    </div>
  </div>
</section>
{cta_band(ctx, 'Wherever you are in your journey, we&rsquo;ll meet you there.')}
'''
    page('about', 'About',
         'Mada means reach. Founded by Hani Abi Khalil, a consultant and official Oliver Wyman interviewer, to help ambitious people get into consulting and keep rising once they are in.',
         body, ctx)


# ---------------------------------------------------------------- CV review
def cv_review():
    ctx = Ctx('cv-review')
    u = ctx.url
    book = book_href('cv-review', 'CV Review (no meeting)')
    scores = [('Structure &amp; formatting', 7), ('Impact &amp; quantification', 5), ('Clarity &amp; readability', 8),
              ('Positioning &amp; narrative', 6), ('Relevance to target role', 6)]
    score_html = ''.join(f'<span>{n}</span><b>{v}/10</b><span class="bar"><i style="width:{v*10}%"></i></span>' for n, v in scores)
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">Position &middot; Mada CV Review</p>
  <h1>Expert feedback on your CV. No meeting required.</h1>
  <p class="lede">Send your CV and target role. Within 48 hours you get a recorded video review, an annotated CV, a scorecard and five priority fixes.</p>
  <div class="btn-row"><a class="btn btn-primary" href="{book}">Request a CV Review &middot; $50 <span class="arrow" aria-hidden="true">&rarr;</span></a><a class="btn btn-ghost" href="{u('services#position')}">All Position services</a></div>
</div></header>

<section>
  <div class="wrap">
    <div class="grid g2" style="gap:56px">
      <div class="reveal"><p class="eyebrow">What you send</p><h2>Six things, nothing to schedule.</h2>
        <ul class="checks" style="margin-top:24px"><li>Your current CV</li><li>The role you&rsquo;re targeting</li><li>Target firms</li><li>Your experience level</li><li>Any job descriptions (optional)</li><li>Specific concerns or questions</li></ul></div>
      <div class="reveal"><p class="eyebrow">What you get back</p><h2>Four deliverables in 48 hours.</h2>
        <div class="grid" style="gap:14px;margin-top:24px">
          <div><h4>Personalised video review</h4><p class="muted">A recorded 10&ndash;15 minute walkthrough in which a Mada coach talks through strengths, weaknesses and the specific changes to make.</p></div>
          <div><h4>Annotated CV</h4><p class="muted">Comments written directly onto your CV, each anchored to the line it refers to.</p></div>
          <div><h4>Structured scorecard</h4><p class="muted">Structure, impact, quantification, clarity, positioning, relevance, readability and overall story.</p></div>
          <div><h4>Prioritised action plan</h4><p class="muted">The five changes that will make the biggest difference, in the order to make them.</p></div>
        </div></div>
    </div>
  </div>
</section>

<section class="bg-mist">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Example</p><h2>What a review looks like.</h2><p class="lede">An illustrative example built to show the format. The candidate and firms are fictional.</p></div>
    <div class="grid cvx">
      <div class="cv-mock reveal">
        <div class="name">Layla Haddad</div>
        <div class="small muted">Dubai, UAE &middot; layla.haddad@example.com &middot; Arabic (native), English (fluent)</div>
        <div class="h">Experience</div>
        <b>Senior Analyst, Northwind Advisory</b> <span class="muted">2022&ndash;present</span>
        <ul><li>Responsible for supporting the client team on a cost-reduction programme for a regional retailer <span class="pin">1</span></li>
        <li>Built a store-level profitability model covering 140 locations, used by the CFO to close 12 underperforming stores</li>
        <li>Coordinated weekly steering-committee materials and other ad-hoc tasks <span class="pin">2</span></li></ul>
        <b>Analyst, Harbor Logistics</b> <span class="muted">2020&ndash;2022</span>
        <ul><li>Redesigned the warehouse handover process across three teams, cutting onboarding time by 30%</li>
        <li>Worked on various process-improvement projects <span class="pin">3</span></li></ul>
        <div class="h">Education</div>BSc Economics, Example University <span class="muted">2020</span>
      </div>
      <div class="card dark reveal"><span class="tag">Your video review &middot; 12:40</span>
        <ul class="notes">
          <li><span class="pin">1</span><div><b style="color:#fff">Lead with the result.</b><br>Duty, not impact. What changed because you were there?</div></li>
          <li><span class="pin">2</span><div><b style="color:#fff">Cut the filler.</b><br>&ldquo;Ad-hoc tasks&rdquo; uses space without adding evidence.</div></li>
          <li><span class="pin">3</span><div><b style="color:#fff">Be specific.</b><br>&ldquo;Various projects&rdquo; is invisible to a screener. Pick one and quantify it.</div></li>
        </ul></div>
      <div class="card reveal"><span class="tag">Scorecard &middot; Experienced hire</span>
        <div class="score">{score_html}<span><b style="color:var(--ink)">Overall</b></span><b>6.5/10</b></div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div class="reveal"><p class="eyebrow">After the review</p><h2>Want help applying the feedback?</h2></div>
      <div class="reveal"><p>A review tells you what to change. If you&rsquo;d rather work through the rewrite with a coach, and build the story that goes with it, book a live CV &amp; LinkedIn session.</p>
        <p>A self-serve AI CV review is coming soon on <a href="{u('ai')}">Mada AI</a>.</p>
        <div class="btn-row" style="margin-top:20px"><a class="btn btn-primary" href="{book}">Request a CV Review</a><a class="btn btn-ghost" href="{u('services#cv-linkedin')}">Live CV &amp; LinkedIn session</a></div></div>
    </div>
  </div>
</section>
'''
    page('cv-review', 'CV Review',
         'Expert consulting CV feedback without a meeting: a recorded video review, annotated CV, scorecard and five priority fixes within 48 hours. $50.',
         body, ctx)


# ---------------------------------------------------------------- resources
def resources():
    from guides_data import GUIDES
    import re
    ctx = Ctx('resources')
    u = ctx.url
    names = {'consulting': 'Consulting recruiting', 'gcc': 'Middle East recruiting', 'career': 'Career strategy'}

    def fix(b):
        return re.sub(r'\{\{([^}]*)\}\}', lambda m: u(m.group(1)), b)
    cats = []
    for cat, label in names.items():
        items = ''.join(f'''<details id="{g['id']}"><summary>{g['title']}<span class="meta">{g['mins']}</span></summary>
<div class="answer guide-body">{fix(g['body'])}</div></details>''' for g in GUIDES if g['cat'] == cat)
        cats.append(f'<div class="guide-cat" data-cat="{cat}"><h3>{label}</h3><div class="faq">{items}</div></div>')
    filters = '<button class="filter" type="button" data-cat="all" aria-pressed="true">All guides</button>' + ''.join(
        f'<button class="filter" type="button" data-cat="{c}" aria-pressed="false">{l}</button>' for c, l in names.items())
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">Resources</p>
  <h1>Free guides to consulting recruiting, written from the hiring side.</h1>
  <p class="lede">CVs, cases, fit, networking, Middle East offices, offers and your first months in the job. No sign-up.</p>
</div></header>

<section>
  <div class="wrap narrow">
    <div class="filters" role="group" aria-label="Filter guides">{filters}</div>
    {''.join(cats)}
  </div>
</section>
<section class="tight" style="padding-top:0">
  <div class="wrap"><p class="muted">From reading to doing: practice with <a href="{u('ai')}">Mada AI</a> (coming soon), or work 1:1 with an <a href="{u('services')}">expert coach</a>.</p></div>
</section>
{cta_band(ctx, 'Want this applied to your own situation?', 'A free 20-minute intro call is the quickest way to find out where to focus.')}
'''
    page('resources', 'Free consulting recruiting guides',
         'Free guides on consulting CVs, case and fit interviews, networking, Saudi and UAE recruiting, offers and your first 90 days in consulting.',
         body, ctx)


# ---------------------------------------------------------------- book
def book():
    ctx = Ctx('book')
    u = ctx.url
    live = bool(C.BOOKING.get('intro'))
    if live:
        booking = f'<a class="btn btn-primary" href="{C.BOOKING["intro"]}" target="_blank" rel="noopener">Pick a time <span class="arrow" aria-hidden="true">&rarr;</span></a>'
    else:
        booking = f'<a class="btn btn-primary" href="{book_href("intro", "Free intro call")}">Email us to book <span class="arrow" aria-hidden="true">&rarr;</span></a>'
    if live:
        book_title = 'Pick a time that suits you.'
        book_text = f'Choose a slot in the calendar and you&rsquo;ll get a confirmation by email. It helps if you have a few lines ready about where you are. Prefer to write first? Email <a href="mailto:{C.EMAIL}">{C.EMAIL}</a>.'
    else:
        book_title = 'Email us, and we&rsquo;ll send you times.'
        book_text = f'Online booking is opening shortly. Until then, email <a href="mailto:{C.EMAIL}">{C.EMAIL}</a> with a few lines about where you are. We reply within one working day.'
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">Book a free 20-minute intro call</p>
  <h1>Tell us where you are. We&rsquo;ll figure out the next step together.</h1>
  <p class="lede">No charge and no obligation. You tell us what you&rsquo;re targeting, and we tell you where to start, or honestly if we&rsquo;re not the right help.</p>
</div></header>

<section>
  <div class="wrap">
    <div class="grid g2" style="gap:40px;align-items:start">
      <div class="card reveal" style="padding:36px">
        <span class="tag">How to book</span>
        <h2 style="font-size:32px">{book_title}</h2>
        <p class="muted" style="margin-top:12px">{book_text}</p>
        <ul class="checks"><li>Where you are now (studying, working, already in consulting)</li><li>What you&rsquo;re targeting: firms, roles, office</li><li>Any deadlines, such as an interview date</li><li>Your time zone</li><li>Your CV, if you have one ready</li></ul>
        <div class="btn-row" style="margin-top:28px">{booking}</div>
      </div>
      <div class="reveal">
        <h3>Already know what you need?</h3>
        <p class="muted">Every service can be booked directly.</p>
        <div class="grid" style="gap:12px;margin-top:20px">
          <a class="card" style="text-decoration:none;padding:20px 24px" href="{u('services#full-journey')}"><b style="color:var(--ink)">The Full Journey</b> <span class="muted">&middot; $750</span><br><span class="small muted">Position to Land as one engagement</span></a>
          <a class="card" style="text-decoration:none;padding:20px 24px" href="{u('services#mock')}"><b style="color:var(--ink)">Mock interview + feedback</b> <span class="muted">&middot; $200</span><br><span class="small muted">Case and fit, in real conditions</span></a>
          <a class="card" style="text-decoration:none;padding:20px 24px" href="{u('cv-review')}"><b style="color:var(--ink)">CV Review</b> <span class="muted">&middot; $50</span><br><span class="small muted">Video review in 48 hours, no meeting</span></a>
          <a class="card" style="text-decoration:none;padding:20px 24px" href="{u('services#membership')}"><b style="color:var(--ink)">Mentorship membership</b> <span class="muted">&middot; $50/month</span><br><span class="small muted">For consultants already in role</span></a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="bg-mist" id="faq">
  <div class="wrap narrow">
    <div class="section-head reveal"><p class="eyebrow">FAQ</p><h2>Everything else, answered.</h2></div>
    {faq(faq_full(u))}
    <p class="muted" style="margin-top:24px">Something else? Email <a href="mailto:{C.EMAIL}">{C.EMAIL}</a>.</p>
  </div>
</section>
'''
    page('book', 'Book a free intro call',
         'Book a free, no-obligation 20-minute intro call with Mada Coaching, and find answers to common questions about our consulting career coaching.',
         body, ctx)


# ---------------------------------------------------------------- legal
ENTITY = ('Mada Coaching is being registered in the United Arab Emirates; the registered entity will be named here once registration is complete.')


def legal(path, title, sections, desc):
    ctx = Ctx(path)
    u = ctx.url
    parts = []
    for h, content in sections:
        parts.append(f'<h2>{h}</h2>{content}')
    body = f'''
<header class="subhero"><div class="wrap">
  <p class="eyebrow">Legal</p>
  <h1>{title}</h1>
  <p class="lede">Last updated: October 2026</p>
</div></header>
<section><div class="wrap narrow legal">{"".join(parts).replace("{{refunds}}", u("refunds"))}</div></section>
'''
    page(path, title, desc, body, ctx)


def legal_pages():
    E = C.EMAIL
    legal('privacy', 'Privacy Policy', [
        ('Who we are', f'<p>Mada Coaching (&ldquo;Mada&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides 1:1 career and interview coaching for consulting. This policy explains what personal information we collect when you use {C.DOMAIN} or book a session with us, why we collect it, and what rights you have over it. {ENTITY} For any question about this policy, or to exercise any of the rights below, contact us at <a href="mailto:{E}">{E}</a>.</p>'),
        ('What we collect', '<ul><li><strong>Booking information</strong>: your name, email address, time zone and any notes you give us when you book a session, by email or through our scheduling provider once online booking is live.</li><li><strong>Coaching materials</strong>: documents you choose to share with us, such as a CV, cover letter, LinkedIn profile, job descriptions or offer details.</li><li><strong>Session notes</strong>: our own working notes, so we can prepare for and follow up on your sessions.</li><li><strong>Payment information</strong>: payments are processed by our payment provider. We receive confirmation that a payment was made; we do not receive or store your full card details.</li><li><strong>Correspondence</strong>: emails and messages you send us.</li><li><strong>AI tools</strong>: when Mada AI tools open, the content you submit to them (for example a CV or practice answers) is processed to give you feedback. We will describe this in more detail here before any tool goes live.</li></ul>'),
        ('Why we use it', '<p>We use this information to deliver the coaching you have booked, to prepare tailored feedback on your materials, to match you with a coach, to manage payments and scheduling, and to respond to your enquiries. We rely on the performance of our agreement with you as the basis for most of this processing, and on our legitimate interest in running and improving the service for the rest. Where we send you optional updates, such as waitlist emails, we rely on your consent, and you can withdraw it at any time.</p>'),
        ('Who we share it with', '<p>We share personal information only with the coach matched to you and the service providers we need to operate: scheduling, payment, email, file storage and AI providers, and professional advisers where required. Every Mada coach is bound to keep what you share confidential. We do not sell your personal information, and we do not share your CV, materials or session content with employers, recruiters or any third party without your explicit instruction.</p>'),
        ('Confidentiality of your job search', '<p>What you tell us about your current employer, your search, your compensation or your offers stays between you, your coach and Mada. We will never contact an employer about you, disclose that you are looking, or use your name or materials in marketing without your written permission.</p>'),
        ('International transfers', '<p>We work with candidates, coaches and providers in several countries, so your information may be processed outside your country of residence. Where that happens we rely on the safeguards offered by those providers, including standard contractual clauses where applicable.</p>'),
        ('How long we keep it', '<p>We keep booking and payment records for as long as required for tax and accounting purposes. We keep coaching materials and session notes for up to 24 months after your last session so we can pick up where we left off, unless you ask us to delete them sooner.</p>'),
        ('Your rights', f'<p>You can ask us for a copy of the personal information we hold about you, ask us to correct it, ask us to delete it, object to how we use it, or ask us to restrict its use. Write to <a href="mailto:{E}">{E}</a> and we will respond within 30 days. If you are not satisfied with our response, you may complain to the data protection authority where you live.</p>'),
        ('Cookies and analytics', f'<p>This site uses only what it needs to work and, where enabled, privacy-respecting analytics that tell us which pages are visited. See our <a href="../cookies/">Cookie Policy</a>.</p>'),
        ('Changes', '<p>If we change this policy we will update the date at the top of this page.</p>'),
    ], 'How Mada Coaching collects, uses and protects your personal information.')

    legal('terms', 'Terms &amp; Conditions', [
        ('These terms', f'<p>These terms apply when you book or receive coaching from Mada Coaching. {ENTITY} By booking a session you agree to them. If you are booking on behalf of someone else, you confirm you have their authority to do so.</p>'),
        ('What we provide', '<p>We provide 1:1 career and interview coaching for consulting: advice, structured preparation, feedback on your materials, mock interviews and guidance through the stages of a job search and the early years of a consulting career. Sessions are delivered remotely by video call unless we agree otherwise. Sessions may be delivered by the founder or by a coach from the Mada bench, matched to you by Mada.</p>'),
        ('Mada AI tools', '<p>Mada AI tools are self-serve products that run on Mada&rsquo;s own tools rather than in a live session. AI-generated feedback can be wrong or incomplete; use it as one input to your own judgement. Specific terms for each tool will be shown before you buy or use it.</p>'),
        ('What we do not provide', '<p>We are not a recruitment agency and we do not place candidates into jobs. We have no role in any employer&rsquo;s hiring decision, and we cannot and do not guarantee an interview, an offer, a salary level, a promotion or any other outcome. Nothing on this website or in a session should be read as a promise of employment. We do not provide legal, immigration, tax or financial advice, and any commentary on an offer is general information for your own decision-making, not professional advice in those fields.</p>'),
        ('Booking and payment', '<p>Sessions are paid in advance unless agreed otherwise. Prices are shown in US dollars on the Services page. Where a multi-session package is purchased, sessions must be scheduled within 6 months of purchase. Memberships are billed monthly and can be cancelled before the next billing date. We may change our prices at any time, but never for a session you have already paid for.</p>'),
        ('Rescheduling, cancellation and refunds', '<p>Our <a href="{{refunds}}">Cancellation &amp; Refund Policy</a> forms part of these terms.</p>'),
        ('Your responsibilities', '<p>Coaching works when you take part. You agree to provide accurate information about your experience and situation, to arrive for sessions on time and prepared, and to do the agreed work between sessions. You are responsible for every decision you make about your career, your applications and any offer you accept or decline.</p>'),
        ('Honesty in applications', '<p>We help you present your genuine experience as clearly and compellingly as possible. We will not help you fabricate experience, qualifications, employment dates or results, and we may end an engagement without refund if asked to.</p>'),
        ('Materials and intellectual property', '<p>Frameworks, templates, exercises, tools and written guidance we provide remain ours, and are licensed to you for your own personal use in your own career. Please do not resell, publish or distribute them. Your CV, your documents and your own work remain entirely yours.</p>'),
        ('Confidentiality', '<p>We treat what you share with us as confidential, and we ask the same of you regarding our materials and methods. We may use anonymised, non-identifying observations to improve our coaching and tools. We will only use your name, likeness or story publicly with your written permission.</p>'),
        ('Recording', '<p>Neither party may record a session without the other&rsquo;s prior agreement.</p>'),
        ('Liability', '<p>To the extent permitted by law, our total liability to you in connection with our services is limited to the amount you paid us for the session, package or membership period giving rise to the claim. We are not liable for indirect or consequential losses, including lost earnings or lost opportunities. Nothing in these terms limits liability that cannot lawfully be limited.</p>'),
        ('Ending an engagement', '<p>Either of us may end an engagement at any time. If we end it for a reason other than your breach of these terms, we will refund any sessions you have paid for and not yet taken.</p>'),
        ('Governing law', f'<p>These terms are governed by the laws of the United Arab Emirates as applied in the Emirate of Dubai, and the courts of Dubai have exclusive jurisdiction over any dispute. We would always rather resolve a problem directly first: please write to <a href="mailto:{E}">{E}</a>.</p>'),
        ('Changes', '<p>We may update these terms; the version in force is the one published here on the date you book.</p>'),
    ], 'The terms that apply when you book or receive coaching from Mada Coaching.')

    legal('refunds', 'Cancellation &amp; Refund Policy', [
        ('Why we ask for notice', '<p>We hold a specific slot for you and prepare for your session in advance, so we ask for reasonable notice if your plans change. In return, we keep refunds simple.</p>'),
        ('Rescheduling', '<p>You can reschedule free of charge up to <strong>24 hours</strong> before your session. Inside 24 hours we will always try to accommodate a move where we can, but a session moved at short notice may be treated as used.</p>'),
        ('Cancellation and refunds', '<ul><li><strong>More than 24 hours before the session:</strong> cancel for a full refund, or keep the credit for a later date.</li><li><strong>Less than 24 hours before the session:</strong> the session is charged in full, because the slot can no longer be offered to anyone else.</li><li><strong>No-show:</strong> if you do not attend and do not tell us, the session is charged in full. If something went wrong, write to us; we will listen.</li><li><strong>If we cancel:</strong> you choose a full refund or a rescheduled session at no cost. If we ever cancel at short notice, we will also offer your next session at no charge.</li></ul>'),
        ('Packages and the Full Journey', '<p>Multi-session packages, including the 4-mock package and the Full Journey, can be refunded pro rata at any time: we refund the sessions you have not yet taken, charging the sessions you have taken at the standard single-session rate. Package sessions should be used within 6 months of purchase.</p>'),
        ('Mentorship membership', '<p>You can cancel your membership at any time before your next billing date, and you will not be charged again. Months already started are not refunded.</p>'),
        ('CV Review', '<p>Once your recorded review has been delivered, CV Review is not refundable, but if it did not deliver what we said it would, see below.</p>'),
        ('The free intro call', '<p>The introductory call is free and carries no obligation. Cancel or reschedule it whenever you need to.</p>'),
        ('If you are not satisfied', '<p>If a session did not deliver what we said it would, tell us within 7 days and we will either redo it at no cost or refund it. We would rather fix it than keep money we did not earn.</p>'),
        ('How to request a refund', f'<p>Email <a href="mailto:{E}">{E}</a> with your name and session date. We will respond within 5 working days, and refunds are returned to the original payment method within 10 working days of approval.</p>'),
        ('Statutory rights', '<p>This policy sits alongside, and does not limit, any rights you have under the consumer law of your country.</p>'),
    ], 'Rescheduling, cancellation and refund terms for Mada Coaching sessions, packages and memberships.')

    legal('cookies', 'Cookie Policy', [
        ('What cookies are', '<p>Cookies are small text files a website stores on your device. They are used to make a site work, to remember your preferences, and in some cases to measure how the site is used.</p>'),
        ('What this site uses', '<p>We keep this deliberately minimal.</p><ul><li><strong>None by default</strong>: browsing this site sets no cookies. Our fonts and files are served from this site, not from third parties.</li><li><strong>Scheduling and payment</strong>: when online booking and payment go live, our providers will set their own cookies when you use them. Their cookie notices govern those.</li><li><strong>Analytics</strong>: where enabled, we use privacy-respecting analytics to count page visits. We do not use advertising cookies, and we do not sell or share this data.</li></ul>'),
        ('What this site does not use', '<p>We do not run advertising or retargeting cookies, we do not embed social media tracking pixels, and we do not build advertising profiles about you.</p>'),
        ('Managing cookies', '<p>You can block or delete cookies in your browser settings at any time. The site will continue to work.</p>'),
        ('Questions', f'<p>Write to <a href="mailto:{E}">{E}</a> and we will answer.</p>'),
    ], 'The cookies and similar technologies used on mada-coaching.com.')


# ---------------------------------------------------------------- 404
def not_found():
    import os
    from build import ROOT
    ctx = Ctx('')
    ctx.rel = '/'
    body = f'''
<header class="subhero" style="padding:120px 0"><div class="wrap">
  <p class="eyebrow">404</p>
  <h1>This page is beyond the horizon.</h1>
  <p class="lede">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
  <div class="btn-row"><a class="btn btn-primary" href="/">Go to the homepage</a><a class="btn btn-ghost" href="/services/">See services</a></div>
</div></header>'''
    page('', 'Page not found | Mada Coaching', 'Page not found.', body, ctx)
    # page() wrote to ROOT/index.html; move it to 404.html and rebuild home after
    os.replace(os.path.join(ROOT, 'index.html'), os.path.join(ROOT, '404.html'))


def build_all():
    not_found()
    home(); how_it_works(); services(); ai(); coaches(); about(); cv_review(); resources(); book(); legal_pages()
    root_files()
    return ['', 'how-it-works', 'services', 'ai', 'coaches', 'about', 'cv-review', 'resources', 'book',
            'privacy', 'terms', 'refunds', 'cookies', '404']


def root_files():
    import os
    from build import ROOT
    pages_ = ['', 'how-it-works/', 'services/', 'ai/', 'coaches/', 'about/', 'cv-review/', 'resources/', 'book/',
              'privacy/', 'terms/', 'refunds/', 'cookies/']
    urls = ''.join(f'  <url><loc>https://{C.DOMAIN}/{p}</loc><lastmod>2026-10-02</lastmod></url>\n' for p in pages_)
    files = {
        'CNAME': C.DOMAIN + '\n',
        'robots.txt': f'User-agent: *\nAllow: /\n\nSitemap: https://{C.DOMAIN}/sitemap.xml\n',
        'sitemap.xml': f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n',
        'site.webmanifest': '{"name":"Mada Coaching","short_name":"Mada","icons":[{"src":"/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"/icon-512.png","sizes":"512x512","type":"image/png"}],"theme_color":"#0F1F4B","background_color":"#FFFFFF","display":"browser"}\n',
    }
    for name, content in files.items():
        with open(os.path.join(ROOT, name), 'w', encoding='utf-8') as f:
            f.write(content)
