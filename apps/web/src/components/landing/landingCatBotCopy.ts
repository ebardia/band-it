/** Adopt A Cat Bot — landing page copy */

export const LANDING_CAT_IMAGES = {
  hero: '/landing-cat-reading-paper.png',
  catnipCafe: '/landing-catnip-cafe.png',
} as const

export const LEAD_DEK =
  'Adopt A Cat Bot helps you take in specialized intelligence cats, shape each one for a very narrow job, and send them to patrol neighborhoods mainstream platforms can\u2019t resolve. They watch quietly, notice what changed, investigate what\u2019s new — and bring you the gift wrapped catch: one vetted finding with evidence, not a dashboard full of noise. You keep what rings true. Discard the trap.'

export const MASTHEAD_TAGLINE = 'Wild Cats; Wild Jobs'

/** Slanted arc + neon action line (CatBotMastheadTitle and matching editorial pages). */
export const MASTHEAD_ARC_LABEL = 'Cat Bot'
export const MASTHEAD_ACTION_LABEL = 'Adoption Agency'
export const MASTHEAD_ARIA_LABEL = 'Cat Bot Adoption Agency'

export const MASTHEAD_IMAGE = '/cat-bot-masthead.png'

/** Site-wide wordmark (same art as masthead). */
export const SITE_LOGO = '/logo.png'
export const SITE_LOGO_ALT = MASTHEAD_ARIA_LABEL

export const RAIL_META_LINE = 'Adopt · Domesticate · Roam · Represent'

export const HOW_KICKER = 'How it works'
export const HOW_HEADING = 'From feral to certified'

export const HOW_INTRO =
  'These are not general chatbots that dig one hole deeper. You adopt wild cats — each built for one lane, not everything. We help you domesticate them for a neighborhood and a mission. You stay in the loop at every step: keep the good memory, discard the trap, certify what may alert on your behalf.'

export const HOW_STEPS = [
  {
    num: '01',
    label: 'Adopt',
    text:
      'Choose from a small, niche inventory — a cat per job, not a Swiss Army kitten. Name the mission; set the territory and the rules about what it must never do.',
  },
  {
    num: '02',
    label: 'Domesticate',
    text:
      'Shape tone, targets, and skepticism. Domestication is curated memory — not manual ML. You decide what survives the first patrol.',
  },
  {
    num: '03',
    label: 'Roam & learn',
    text:
      'Unleashed on a fixed beat — the same sources on a schedule, plus side investigations when something new appears. It tries more than one angle, cites sources, and names the STUCK_TRAP it almost fell into.',
  },
  {
    num: '04',
    label: 'Certify',
    text:
      'Review the return packet. Keep the good. Discard the bad. When you approve it, the cat earns your tag — owner named, mission stated, disclosed if it ever speaks in public.',
  },
  {
    num: '05',
    label: 'Represent',
    text:
      'Certified cats deliver digestible catches — a finding, not a dump. Independent but reports home. Monkeys and cats don\u2019t get along; noisy alerts and cats don\u2019t either.',
  },
] as const

export const CAT_BEHAVIORS_KICKER = 'Field guide'
export const CAT_BEHAVIORS_HEADING = 'Why cats, not dashboards'

export const CAT_BEHAVIORS_INTRO =
  'Cats map surprisingly well onto intelligence work. These are the behaviors we build into every bot — fun framing, serious product logic.'

export const CAT_BEHAVIORS = [
  {
    name: 'Stalking',
    text:
      'Patient observation before the pounce. Passive signal monitoring: track a named account for weeks and alert only when a real pattern emerges — not on every blip.',
  },
  {
    name: 'Territory patrol',
    text:
      'Same routes, daily. Change detection on a fixed beat — pricing pages, job boards, leadership bios, license records — flag deltas, not raw dumps.',
  },
  {
    name: 'Whiskers',
    text:
      'Proximity sensing for weak signals: hiring slowdowns, tone shifts in press releases, a receptionist job that names the incumbent software.',
  },
  {
    name: 'Curiosity',
    text:
      'Investigate anything new in the environment. When a cat meets an unfamiliar entity — new competitor, new consolidator — it spawns a side investigation and adds it to the graph.',
  },
  {
    name: 'Reports home',
    text:
      'Roams alone, then brings you the Catch. Autonomous operation; digestible catch. That is the product — not another pane of charts.',
  },
  {
    name: 'Night vision',
    text:
      'Low-light sources mainstream platforms skip: niche forums, regulatory filings, regional press, broker listings, archived pages.',
  },
  {
    name: 'Clowder coordination',
    text:
      'Not a hive mind. A fleet of specialists — pricing cat, hiring cat, funding cat — mostly alone, sharing scent markers (tags and entities) in a common graph.',
  },
] as const

export const CAT_TYPES_KICKER = 'The litter'
export const CAT_TYPES_HEADING = 'One clowder, loose coordination'

export const CAT_TYPES_USE_CASE_KICKER = 'Use case · Beacon Digital'
export const CAT_TYPES_USE_CASE =
  'Beacon Digital is a ten-person agency selling SEO, paid search, and websites to local SMBs across the DMV — ~$2.5k/month retainers, a few thousand qualified businesses in their metro, referral- and Clutch-led. They have Apollo, maybe ZoomInfo. Intent data barely registers: a five-person HVAC shop or a two-chair dental office does not generate enough traffic for Bombora topics, and firmographics go stale the week a new owner takes over. The niche sits below the resolution of mainstream BI. That is the wedge.'

export const CAT_TYPES_INTRO =
  'A serious team rarely needs one cat doing everything. It needs a clowder — each with a collar tag and a narrow beat — patrolling a named slice of the real TAM until someone gets a pounce moment no intent platform can produce.'

export const CAT_TYPES = [
  {
    name: 'Stalking Cat',
    text:
      'Picks the high-potential accounts that are not ready yet and watches them, quietly, for months — the agency that just lost a flagship client, the business whose lease is ending, the practice mid-ownership-transfer. No noise until the moment changes, then a single alert. No human tracks 300 maybes for a year; a cat does.',
  },
  {
    name: 'Territory Cat',
    text:
      'Patrols ~2,000 named local SMBs weekly — website, Google Business Profile, reviews, and search position. Not searching; noticing deltas: a new location, \u201cnow hiring,\u201d a refreshed logo, a site that still says \u201ccopyright 2021,\u201d or a slip off page one for the money keyword.',
  },
  {
    name: 'Whisker Cat',
    text:
      'Watches weak composite signals: a job listing for an in-house marketer (DIY about to break), a Google Business Profile that went from no posts to suddenly active, a fresh county permit, a review-velocity spike, a competitor newly outranking them.',
  },
  {
    name: 'Night Vision Cat',
    text:
      'Reads what platforms barely index: county business-license and build-out permits, Chamber of Commerce new-member notices, grand-opening announcements, BBB filings, and local subreddit threads naming a business by name.',
  },
  {
    name: 'Curiosity Cat',
    text:
      'When any cat finds an unknown — a new franchise unit opening, a local shop that just got acquired or took on funding — it spawns a one-off investigation and adds the entity to the graph for the rest of the clowder.',
  },
] as const

export const EXAMPLE_KICKER = 'The gift wrapped catch'
export const EXAMPLE_HEADING = 'What Beacon Digital\u2019s owner actually gets'

export const EXAMPLE_PARAGRAPHS = [
  'Not a dashboard. Once a week, Beacon\u2019s owner opens three to five findings — each a vetted catch with links, not a scraped list pretending to be strategy.',
  'Existing tools sell breadth at low resolution. Cat bots sell persistent, named-account observation at a resolution where big platforms have no data at all. The market is every agency whose ideal clients are local SMBs too small or too offline to show up in intent data — dentists, HVAC, med spas, restaurants, law firms, home services.',
  'When the pattern lines up, the cat pounces: a business with a clear, fresh reason to need marketing right now. That is the moment worth a human phone call — not the hundredth row in an export.',
] as const

export const EXAMPLE_CATCH = {
  label: 'Sample catch · pounce moment',
  text:
    'Cedar & Co. Family Dental (Fairfax, VA) — filed a county build-out permit for a second location in April; posted an office-manager listing last week mentioning \u201chelp us grow new-patient volume\u201d; their Google Business Profile sits at 4.8 stars but hasn\u2019t posted in six months and just slipped off page one for \u201cFairfax dentist.\u201d A growing practice with budget, a weak online presence, and a reason to act now — roughly a 30-day window. Evidence: three links.',
} as const

export const HIRE_KICKER = 'Classified'
export const HIRE_HEADING = 'Now hiring: cool cats'

export const HIRE_BODY = [
  'Walk the neighborhoods. Act cool. Stay mysterious.',
  'Prior experience overrated. Attitude essential.',
  'We are not looking for résumés. We are looking for cats who can loiter with intent, patrol without panic, and report home with one Catch — not the whole field.',
] as const

export const HIRE_FOOTER = 'Inquiries welcome. Coolness interview at the Catnip Café.'

export const RAIL_BLOCKS = [
  {
    title: 'For owners',
    detail:
      'Vertical SaaS, resellers, and niche B2B teams that need named-account cats — territory patrol, weak-signal whiskers, night-vision sources — not another intent dashboard.',
  },
  {
    title: 'The longer story',
    detail: 'How we think about roams, memory, the gift wrapped catch, and transparent bias.',
    cta: 'Read the essay',
    href: '/manifesto',
  },
] as const

export const CTA_LABEL = 'Adopt a cat \u2192'

export const MANIFESTO_HEADLINE = 'Seven instincts. One Catch.'

export const MANIFESTO_DEK =
  'A longer essay on why we build intelligence cats around stalking, territory patrol, whiskers, curiosity, night vision, reporting home, and clowder coordination \u2014 not another dashboard pretending to be strategy.'

export const MANIFESTO_PARAGRAPHS = [
  'Everyone has met the chatbot that digs one hole deeper. You hint at a direction and it elaborates the rut. Dashboards do the same at scale: breadth without resolution, alerts on every blip, no memory of what you already rejected. Cat Bot Adoption Agency exists because niche B2B work needs a different posture \u2014 patient, territorial, skeptical \u2014 and because the deliverable should be a vetted catch with evidence, not a pane of charts.',
  'Stalking comes first. A cat watches before it pounces. Our bots monitor named accounts and fixed sources for weeks, holding fire until a real pattern emerges. Territory patrol is the beat itself: the same routes on a schedule \u2014 pricing pages, job boards, leadership bios, license records \u2014 flagging deltas instead of dumping raw feeds. You define the neighborhood; the cat learns what normal looks like there.',
  'Whiskers sense what firmographics miss: a receptionist listing that names the incumbent stack, a tone shift in a press release, a hiring slowdown that precedes a budget freeze. Curiosity is what happens when something new appears \u2014 an unknown competitor, a regional consolidator, a forum thread that does not fit the map. The cat spawns a side investigation, cites its sources, and adds the entity to the graph for the rest of the clowder.',
  'Night vision is for the low-light sources mainstream platforms skip: niche forums, regulatory filings, regional press, broker listings, archived pages. This is where vertical SaaS buyers actually leave traces \u2014 too small for intent data, too offline for Bombora. The wedge is persistent observation at a resolution big platforms cannot produce.',
  'Reports home is the product contract. The cat roams alone, then brings you the gift wrapped catch: one finding, linked and explained, with the trap it almost fell into named out loud. You review the return packet, keep the good memory, discard the bad, and certify what may speak on your behalf. Domestication is curated memory \u2014 not manual model training. Owner named, mission stated, bias disclosed.',
  'Clowder coordination keeps the fleet honest. Not a hive mind \u2014 a roster of specialists with collar tags: a pricing cat, a hiring cat, a funding cat, mostly alone, sharing scent markers in a common graph. A serious team rarely needs one cat doing everything. It needs loose coordination across narrow beats until someone gets a pounce moment no intent platform can manufacture.',
  'That is the longer case for cats over dashboards: adopt a wild specialist, domesticate it for one lane, let it patrol with these seven instincts, certify what earns your tag, and represent your goals transparently when it speaks in public. Monkeys and cats do not get along; noisy alerts and cats do not either. We are building for teams that would rather receive three Catches than three hundred rows.',
] as const
