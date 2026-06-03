'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'
import { LANDING_BANDIT_LAYER_IMAGE } from '@/components/newspaper/newspaperPlaceholders'
import { trpc } from '@/lib/trpc'

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

const LEAD_HEADLINE = 'The Band It Layer'

const LEAD_DEK =
  'Band It wraps the AI stack \u2014 intelligence signal processing on one side, human in the loop on the other, vertical agents in the middle, and verified business intelligence out.'

const HERO_FIGURE_CAPTION =
  'Fig. 1 \u2014 The Band It layer: signals \u00b7 stack \u00b7 human swarm \u00b7 the goods.'

const SIGNALS_KICKER = 'Intelligence signal processing'
const SIGNALS_HEADING = 'The signal desk'

const SIGNAL_FEEDS = [
  {
    title: 'Open web',
    detail:
      'Public filings, press, forums, and market chatter \u2014 screened into structured signal, not raw noise.',
  },
  {
    title: 'IoT & telemetry',
    detail:
      'Industrial sensors, ambient feeds, and operational data correlated with the questions your agents are hunting.',
  },
  {
    title: 'Personal devices',
    detail:
      'Wearables and monitoring where policy allows \u2014 optional inputs your band chooses to trust.',
  },
  {
    title: 'Public infrastructure',
    detail:
      'Roads, utilities, transit, water, power, and other civic infrastructure data \u2014 what the built world is doing right now.',
  },
  {
    title: 'Satellite & geospatial',
    detail:
      'Overhead imagery and location intelligence when the workflow needs eyes on the ground from above.',
  },
]

const STACK_KICKER = 'Anatomy of the stack'
const STACK_HEADING = 'Layers 1\u20136 inside the helmet'

const STACK_INTRO =
  'Band It does not pretend to be the whole AI industry. It hugs the stack \u2014 from energy and silicon through models, orchestration, and vertical agents \u2014 and adds the layer that turns raw capability into decision-grade output.'

const STACK_LAYERS = [
  { num: '01', label: 'Energy', text: 'Power, cooling, grid \u2014 the foundation everything else stands on.' },
  { num: '02', label: 'Chips', text: 'GPUs, memory, networking \u2014 the hardware engine.' },
  { num: '03', label: 'Infrastructure', text: 'Data centers, cloud, storage \u2014 where compute lives.' },
  { num: '04', label: 'Large language models', text: 'Foundation and fine-tuned models \u2014 the algorithmic core.' },
  {
    num: '05',
    label: 'Agent management platform',
    text: 'Routing, tools, memory, multi-agent supervision \u2014 where Band It steers orchestration.',
  },
  {
    num: '06',
    label: 'Vertical AI agents',
    text: 'Domain workflows off the shelf or composed by your band \u2014 legal, ops, discovery, research, and more.',
  },
]

const BRIEFING_KICKER = 'Briefing'
const BRIEFING_HEADING = 'Not a chat box. The layer that completes the stack.'
const BRIEFING_LEAD =
  'Human in the loop at every step that matters \u2014 from first signal to final delivery.'

const BRIEFING_PARAGRAPHS = [
  'Most AI products stop at the model or a single prompt. Band It wraps layers 1\u20136: intelligence signal processing in, vertical agents at work, humans steering throughout, and business-ready output into the systems you already run.',
  'Not a raw LLM wrapper, a SIEM dashboard, or an agent builder that vanishes after deploy. One transparent workspace where your band composes workflows \u2014 agent nodes, human checkpoints, sinks to webhooks and documents.',
  'Opportunity discovery, research desks, compliance scans: same engine, different templates. Every node leaves a trace. Every approval is recorded.',
]

type RailBlock = {
  title: string
  detail: string
  cta: string
  href: string
}

const RAIL_BLOCKS: RailBlock[] = [
  {
    title: 'For operators',
    detail:
      'You run the layer day to day \u2014 configure workflows, steer agents, pass human checkpoints, and ship The Goods.',
    cta: 'Get started',
    href: '/register',
  },
  {
    title: 'For companies',
    detail:
      'You bring the use case and the customer \u2014 we compose signal feeds, agents, and review steps around your problem.',
    cta: 'Bring a workflow',
    href: '/register',
  },
  {
    title: 'Agent workflows',
    detail: 'Vertical agents off the shelf or built by your band.',
    cta: 'Learn more',
    href: '/manifesto',
  },
]

function PlatformCta({ className }: { className?: string }) {
  return (
    <Link href="/register" className={`np-landing-platform-cta${className ? ` ${className}` : ''}`}>
      Wear the AI helmet &rarr;
    </Link>
  )
}

export function LandingNewspaperPage() {
  const router = useRouter()
  const trackPageView = trpc.analytics.trackPageView.useMutation()

  useEffect(() => {
    trackPageView.mutate({
      page: 'landing',
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <div className="np-landing-auth">
          <Link href="/register" className="np-landing-auth-link">
            Register
          </Link>
          <button
            type="button"
            className="np-landing-auth-btn"
            onClick={() => router.push('/login')}
          >
            Sign In
          </button>
        </div>

        <header className="np-landing-masthead">
          <DailyMastheadTitle />
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span suppressHydrationWarning>
              The Band It Layer &middot; {formatPaperDate(new Date())} &middot; Vol. I &middot; Anatomy
              of the stack
            </span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-landing-shell">
          <div className="np-profile-spread np-landing-spread">
            <main className="np-profile-main">
              <p className="np-cat np-cat-left">Lead</p>
              <section className="np-landing-arena" aria-labelledby="landing-headline">
                <div className="np-landing-lead-copy">
                  <h1 id="landing-headline" className="np-headline-lead np-headline-lead-left">
                    {LEAD_HEADLINE}
                  </h1>
                  <p className="np-landing-dek">{LEAD_DEK}</p>
                  <PlatformCta className="np-landing-lead-cta" />
                </div>
                <figure className="np-landing-hero-figure">
                  <Image
                    src={LANDING_BANDIT_LAYER_IMAGE}
                    alt="Vintage newspaper diagram of the Band It layer: a space helmet wrapping the AI stack with intelligence signal processing on the left, human in the loop on the right, and layers from energy through vertical agents inside"
                    width={1536}
                    height={1024}
                    className="np-landing-hero-figure-img"
                    priority
                  />
                  <figcaption className="np-landing-photo-caption">{HERO_FIGURE_CAPTION}</figcaption>
                </figure>
              </section>

              <section className="np-landing-opportunities" aria-labelledby="landing-signals-heading">
                <p className="np-landing-section-kicker">{SIGNALS_KICKER}</p>
                <h2 id="landing-signals-heading" className="np-picks-header np-picks-header-left">
                  {SIGNALS_HEADING}
                </h2>
                <ul className="np-landing-opportunity-cards np-landing-signal-cards">
                  {SIGNAL_FEEDS.map((feed, index) => (
                    <li key={index} className="np-landing-opportunity-card">
                      <p className="np-landing-opportunity-title">{feed.title}</p>
                      <p className="np-landing-opportunity-detail">{feed.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <hr className="np-rule" />

              <section className="np-landing-stack" aria-labelledby="landing-stack-heading">
                <p className="np-landing-section-kicker">{STACK_KICKER}</p>
                <h2 id="landing-stack-heading" className="np-headline-serif np-landing-thesis-lead">
                  {STACK_HEADING}
                </h2>
                <p className="np-landing-paragraph np-landing-stack-intro">{STACK_INTRO}</p>
                <ol className="np-landing-stack-layers">
                  {STACK_LAYERS.map((layer) => (
                    <li key={layer.num} className="np-landing-stack-layer">
                      <div className="np-landing-pipeline-step-head">
                        <span className="np-landing-pipeline-index" aria-hidden>
                          {layer.num}
                        </span>
                        <span className="np-landing-pipeline-label">{layer.label}</span>
                      </div>
                      <p className="np-landing-pipeline-text">{layer.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="np-landing-briefing" aria-labelledby="landing-briefing-heading">
                <div className="np-landing-briefing-inner">
                  <p className="np-landing-section-kicker">{BRIEFING_KICKER}</p>
                  <h2 id="landing-briefing-heading" className="np-headline-serif np-landing-briefing-question">
                    {BRIEFING_HEADING}
                  </h2>
                  <p className="np-landing-briefing-lead-line">{BRIEFING_LEAD}</p>
                  <div className="np-landing-briefing-columns">
                    {BRIEFING_PARAGRAPHS.map((paragraph, index) => (
                      <p
                        key={index}
                        className={`np-landing-paragraph${index === 0 ? ' np-landing-dropcap' : ''}`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  <p className="np-landing-paragraph">
                    <Link href="/manifesto" className="np-landing-rail-link">
                      Read the longer essay &rarr;
                    </Link>
                  </p>
                  <PlatformCta className="np-landing-editorial-cta" />
                </div>
              </section>
            </main>

            <aside className="np-profile-rail" aria-label="Front page briefs">
              <div className="np-rail-block">
                <p className="np-profile-meta-rail" suppressHydrationWarning>
                  BAND IT LAYER
                  <br />
                  SIGNALS &middot; AGENTS &middot; HUMANS
                  <br />
                  {formatPaperDate(new Date()).toUpperCase()}
                </p>
              </div>

              {RAIL_BLOCKS.map((block) => (
                <div key={block.title} className="np-rail-block">
                  <h2 className="np-picks-header">{block.title}</h2>
                  <p className="np-preview-line">{block.detail}</p>
                  <Link href={block.href} className="np-landing-rail-link">
                    {block.cta} &rarr;
                  </Link>
                </div>
              ))}

              <div className="np-rail-block np-landing-rail-cta">
                <PlatformCta className="np-landing-rail-platform-cta" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </EditorialSurface>
  )
}
