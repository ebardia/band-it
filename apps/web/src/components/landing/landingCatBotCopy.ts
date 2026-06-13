/** Adopt A Cat Bot — landing page copy */

export const LANDING_CAT_IMAGES = {
  hero: '/landing-cat-reading-paper.png',
  catnipCafe: '/landing-catnip-cafe.png',
} as const

export const LEAD_DEK =
  'Adopt A Cat Bot helps you take in specialized intelligence cats, shape each one for a very narrow job, and send them to patrol neighborhoods mainstream platforms can\u2019t resolve. They watch quietly, notice what changed, investigate what\u2019s new — and bring you the dead mouse: one vetted finding with evidence, not a dashboard full of noise. You keep what rings true. Discard the trap.'

export const MASTHEAD_TAGLINE = 'Wild Cats; Wild Jobs'

/** Slanted arc + neon action line (CatBotMastheadTitle and matching editorial pages). */
export const MASTHEAD_ARC_LABEL = 'Cat Bot'
export const MASTHEAD_ACTION_LABEL = 'Adoption Agency'
export const MASTHEAD_ARIA_LABEL = 'Cat Bot Adoption Agency'

export const MASTHEAD_IMAGE = '/cat-bot-masthead.png'

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
      'Roams alone, then brings you the dead mouse. Autonomous operation; digestible catch. That is the product — not another pane of charts.',
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

export const CAT_TYPES_USE_CASE_KICKER = 'Use case · VetDesk'
export const CAT_TYPES_USE_CASE =
  'VetDesk sells practice-management software to independent veterinary clinics — fifteen people, ~$8k ACV, ~30,000 target clinics, sales-led. They have ZoomInfo, maybe Apollo, maybe 6sense. Intent data barely registers: six-person clinics do not generate enough traffic for Bombora topics, and firmographics go stale. The niche sits below the resolution of mainstream BI. That is the wedge.'

export const CAT_TYPES_INTRO =
  'A serious team rarely needs one cat doing everything. It needs a clowder — each with a collar tag and a narrow beat — patrolling a named slice of the real TAM until someone gets a pounce moment no intent platform can produce.'

export const CAT_TYPES = [
  {
    name: 'Territory Cat',
    text:
      'Patrols ~2,000 named clinics weekly — website, Google Business, Yelp, state vet-board licenses. Not searching; noticing deltas: new associate on the team page, hours changed, \u201cnow accepting new patients,\u201d a second location.',
  },
  {
    name: 'Whisker Cat',
    text:
      'Watches weak composite signals: a receptionist job mentioning Cornerstone (current stack), an owner license renewal lapse (retirement \u2192 sale \u2192 re-evaluation window), reviews citing long hold times (operational pain).',
  },
  {
    name: 'Night Vision Cat',
    text:
      'Reads what platforms barely index: state vet-board minutes, practice-brokerage listings, Chamber announcements, VIN and vet subreddit threads complaining about specific software.',
  },
  {
    name: 'Curiosity Cat',
    text:
      'When any cat finds an unknown — a new clinic, a regional consolidator buying practices — it spawns a one-off investigation and adds the entity to the graph for the rest of the clowder.',
  },
] as const

export const EXAMPLE_KICKER = 'The dead mouse'
export const EXAMPLE_HEADING = 'What VetDesk\u2019s salesperson actually gets'

export const EXAMPLE_PARAGRAPHS = [
  'Forget the dashboard. Once a week, VetDesk\u2019s rep opens three to five findings — each a vetted catch with links, not a CSV export pretending to be strategy.',
  'Existing platforms sell breadth at low resolution. Cat bots sell persistent, named-account observation at a resolution where big platforms have no data at all. The market is every vertical SaaS company whose buyers are too small or too offline to show up in intent data — vets, dental, HVAC, funeral homes, marinas.',
  'When the pattern lines up, the cat pounces. That is the moment worth a human phone call — not the hundredth row in a signal table.',
] as const

export const EXAMPLE_DEAD_MOUSE = {
  label: 'Sample catch · pounce moment',
  text:
    'Maple Creek Animal Hospital (Boise) — practice listed with a broker in March; license transferred to Dr. Sarah Kim on May 28; she posted two front-desk job listings yesterday mentioning \u201ctransitioning systems.\u201d New owner, actively re-evaluating software, ~30-day window. Evidence: three links.',
} as const

export const HIRE_KICKER = 'Classified'
export const HIRE_HEADING = 'Now hiring: cool cats'

export const HIRE_BODY = [
  'Walk the neighborhoods. Act cool. Stay mysterious.',
  'Prior experience overrated. Attitude essential.',
  'We are not looking for résumés. We are looking for cats who can loiter with intent, patrol without panic, and report home with one dead mouse — not the whole field.',
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
    detail: 'How we think about roams, memory, the dead mouse, and transparent bias.',
    cta: 'Read the essay',
    href: '/manifesto',
  },
] as const

export const CTA_LABEL = 'Adopt a cat \u2192'

export const MANIFESTO_HEADLINE = 'Seven instincts. One dead mouse.'

export const MANIFESTO_DEK =
  'A longer essay on why we build intelligence cats around stalking, territory patrol, whiskers, curiosity, night vision, reporting home, and clowder coordination \u2014 not another dashboard pretending to be strategy.'

export const MANIFESTO_PARAGRAPHS = [
  'Everyone has met the chatbot that digs one hole deeper. You hint at a direction and it elaborates the rut. Dashboards do the same at scale: breadth without resolution, alerts on every blip, no memory of what you already rejected. Cat Bot Adoption Agency exists because niche B2B work needs a different posture \u2014 patient, territorial, skeptical \u2014 and because the deliverable should be a vetted catch with evidence, not a pane of charts.',
  'Stalking comes first. A cat watches before it pounces. Our bots monitor named accounts and fixed sources for weeks, holding fire until a real pattern emerges. Territory patrol is the beat itself: the same routes on a schedule \u2014 pricing pages, job boards, leadership bios, license records \u2014 flagging deltas instead of dumping raw feeds. You define the neighborhood; the cat learns what normal looks like there.',
  'Whiskers sense what firmographics miss: a receptionist listing that names the incumbent stack, a tone shift in a press release, a hiring slowdown that precedes a budget freeze. Curiosity is what happens when something new appears \u2014 an unknown competitor, a regional consolidator, a forum thread that does not fit the map. The cat spawns a side investigation, cites its sources, and adds the entity to the graph for the rest of the clowder.',
  'Night vision is for the low-light sources mainstream platforms skip: niche forums, regulatory filings, regional press, broker listings, archived pages. This is where vertical SaaS buyers actually leave traces \u2014 too small for intent data, too offline for Bombora. The wedge is persistent observation at a resolution big platforms cannot produce.',
  'Reports home is the product contract. The cat roams alone, then brings you the dead mouse: one finding, linked and explained, with the trap it almost fell into named out loud. You review the return packet, keep the good memory, discard the bad, and certify what may speak on your behalf. Domestication is curated memory \u2014 not manual model training. Owner named, mission stated, bias disclosed.',
  'Clowder coordination keeps the fleet honest. Not a hive mind \u2014 a roster of specialists with collar tags: a pricing cat, a hiring cat, a funding cat, mostly alone, sharing scent markers in a common graph. A serious team rarely needs one cat doing everything. It needs loose coordination across narrow beats until someone gets a pounce moment no intent platform can manufacture.',
  'That is the longer case for cats over dashboards: adopt a wild specialist, domesticate it for one lane, let it patrol with these seven instincts, certify what earns your tag, and represent your goals transparently when it speaks in public. Monkeys and cats do not get along; noisy alerts and cats do not either. We are building for teams that would rather receive three dead mice than three hundred rows.',
] as const
