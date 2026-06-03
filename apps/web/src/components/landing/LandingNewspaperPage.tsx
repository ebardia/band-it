'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'
import {
  LANDING_BANDIT_LAYER_IMAGE,
  LANDING_BANDIT_LAYER_SIGNALS_IMAGE,
  LANDING_BANDIT_LAYER_STACK_IMAGE,
  LANDING_BANDIT_LAYER_HUMANS_IMAGE,
  LANDING_BANDIT_LAYER_GOODS_IMAGE,
} from '@/components/newspaper/newspaperPlaceholders'
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
const SIGNALS_FIGURE_CAPTION =
  'Fig. 2 \u2014 Intelligence signal processing: live feeds screened into machine-readable signal.'

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
    title: 'Government data',
    detail:
      'Public records, liens, court dockets, and regulatory filings \u2014 the early stress signals others miss.',
  },
  {
    title: 'Satellite & geospatial',
    detail:
      'Overhead imagery and location intelligence when the workflow needs eyes on the ground from above.',
  },
]

const STACK_KICKER = 'Anatomy of the stack'
const STACK_HEADING = 'Layers 1\u20136 inside the helmet'
const STACK_FIGURE_CAPTION =
  'Fig. 3 \u2014 The industry stack from energy through vertical agents, wrapped by the Band It layer.'

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

const FLOW_KICKER = 'How the layer works'
const FLOW_HEADING = 'Signals \u00b7 Humans \u00b7 The Goods'

const FLOW_STEPS = [
  {
    label: 'Collect & process',
    text: 'Live feeds enter the signal desk, get screened and correlated, and route into the agent platform and vertical agents you configure.',
  },
  {
    label: 'Run vertical agents',
    text: 'Off-the-shelf or custom agents execute the workflow \u2014 scan, enrich, rank, draft \u2014 on top of layers 5 and 6 inside the stack.',
  },
  {
    label: 'Human in the loop',
    text: 'Humans steer every meaningful step: labels, tasks, projects, proposals. Agents propose; people approve. No autopilot on judgment calls.',
  },
  {
    label: 'The Goods',
    text: 'Verified business intelligence flows out \u2014 webhooks, documents, dashboards your customer can act on. Mind blown, business grounded.',
  },
]

const HUMANS_FIGURE_CAPTION =
  'Fig. 4 \u2014 Human in the loop: reviewers steer orchestration and domain agents at every checkpoint.'
const GOODS_FIGURE_CAPTION =
  'Fig. 5 \u2014 The Goods: verified intelligence out \u2014 mind blown, business grounded.'

const BRIEFING_KICKER = 'Briefing'
const BRIEFING_HEADING = 'Not a chat box. The layer that completes the stack.'
const BRIEFING_LEAD =
  'Human in the loop at every step that matters \u2014 from first signal to final delivery.'

const BRIEFING_PARAGRAPHS = [
  'Most AI products stop at the model or a single prompt. Band It wraps layers 1\u20136: intelligence signal processing in, vertical agents at work, humans steering throughout, and business-ready output into the systems you already run.',
  'Not a raw LLM wrapper, a SIEM dashboard, or an agent builder that vanishes after deploy. One transparent workspace where your band composes workflows \u2014 agent nodes, human checkpoints, sinks to webhooks and documents.',
  'Opportunity discovery, research desks, compliance scans: same engine, different templates. Every node leaves a trace. Every approval is recorded.',
]

const EDITORIAL_KICKER = 'Editorial'
const EDITORIAL_HEADING = 'Wear the AI helmet'
const EDITORIAL_PULL =
  '\u201cSignals in. Humans steering. The Goods out \u2014 verified intelligence your customer can use.\u201d'

const EDITORIAL_PARAGRAPHS = [
  'The stack got deep fast. Most organizations cannot assemble it themselves \u2014 and should not have to. They need one layer that hugs the stack: collects the right signals, routes them to the right agents, keeps humans in the loop, and ships intelligence that holds up in a meeting room.',
  'That is Band It. The helmet is the metaphor: signal desk on the left, human swarm on the right, industry stack inside, The Goods out the top. Real workflows. Real checkpoints. Real output.',
]

const EDITORIAL_CLOSER = 'Signals \u00b7 Humans \u00b7 The Goods.'

type RailBlock = {
  title: string
  detail: string
  cta: string
  href: string
}

const RAIL_BLOCKS: RailBlock[] = [
  {
    title: 'For operators',
    detail: 'Run signal-to-outcome workflows with agents and human checkpoints.',
    cta: 'Get started',
    href: '/register',
  },
  {
    title: 'For companies',
    detail: 'Bring a use case. We\u2019ll compose the layer around your stack.',
    cta: 'Bring a workflow',
    href: '/register',
  },
  {
    title: 'Agent workflows',
    detail: 'Vertical agents off the shelf or built by your band.',
    cta: 'Learn more',
    href: '/manifesto',
  },
  {
    title: 'Talk It Out',
    detail: 'When the group needs a facilitator, not another dashboard.',
    cta: 'See how',
    href: '/talk-it-out',
  },
]

function PlatformCta({ className }: { className?: string }) {
  return (
    <Link href="/register" className={`np-landing-platform-cta${className ? ` ${className}` : ''}`}>
      Wear the AI helmet &rarr;
    </Link>
  )
}

function DetailFigure({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string
  alt: string
  caption: string
  width: number
  height: number
}) {
  return (
    <figure className="np-landing-detail-figure">
      <Image src={src} alt={alt} width={width} height={height} className="np-landing-detail-figure-img" />
      <figcaption className="np-landing-photo-caption">{caption}</figcaption>
    </figure>
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
                <DetailFigure
                  src={LANDING_BANDIT_LAYER_SIGNALS_IMAGE}
                  alt="Detail of the signal desk panel on the Band It layer helmet diagram"
                  caption={SIGNALS_FIGURE_CAPTION}
                  width={430}
                  height={680}
                />
              </section>

              <hr className="np-rule" />

              <section className="np-landing-stack" aria-labelledby="landing-stack-heading">
                <p className="np-landing-section-kicker">{STACK_KICKER}</p>
                <h2 id="landing-stack-heading" className="np-headline-serif np-landing-thesis-lead">
                  {STACK_HEADING}
                </h2>
                <p className="np-landing-paragraph np-landing-stack-intro">{STACK_INTRO}</p>
                <DetailFigure
                  src={LANDING_BANDIT_LAYER_STACK_IMAGE}
                  alt="Detail of the six-layer AI stack inside the Band It helmet visor"
                  caption={STACK_FIGURE_CAPTION}
                  width={616}
                  height={680}
                />
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

              <section className="np-landing-pipeline" aria-labelledby="landing-flow-heading">
                <p className="np-landing-pipeline-kicker">{FLOW_KICKER}</p>
                <h2 id="landing-flow-heading" className="np-landing-pipeline-thesis">
                  {FLOW_HEADING}
                </h2>
                <ol className="np-landing-pipeline-flow np-landing-pipeline-flow--solo">
                  {FLOW_STEPS.map((step, index) => (
                    <li key={step.label} className="np-landing-pipeline-step">
                      <div className="np-landing-pipeline-step-head">
                        <span className="np-landing-pipeline-index" aria-hidden>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="np-landing-pipeline-label">{step.label}</span>
                      </div>
                      <p className="np-landing-pipeline-text">{step.text}</p>
                    </li>
                  ))}
                </ol>
                <div className="np-landing-detail-pair">
                  <DetailFigure
                    src={LANDING_BANDIT_LAYER_HUMANS_IMAGE}
                    alt="Detail of the human-in-the-loop panel on the Band It layer helmet diagram"
                    caption={HUMANS_FIGURE_CAPTION}
                    width={430}
                    height={680}
                  />
                  <DetailFigure
                    src={LANDING_BANDIT_LAYER_GOODS_IMAGE}
                    alt="Detail of smoke rising from the helmet vent — mind blown, The Goods delivered"
                    caption={GOODS_FIGURE_CAPTION}
                    width={816}
                    height={320}
                  />
                </div>
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
                </div>
              </section>

              <section className="np-landing-editorial" aria-labelledby="landing-editorial-heading">
                <p className="np-landing-section-kicker">{EDITORIAL_KICKER}</p>
                <h2 id="landing-editorial-heading" className="np-headline-serif np-landing-editorial-head">
                  {EDITORIAL_HEADING}
                </h2>
                <p className="np-profile-pullquote np-landing-editorial-pull">{EDITORIAL_PULL}</p>
                {EDITORIAL_PARAGRAPHS.map((paragraph, index) => (
                  <p key={index} className="np-landing-paragraph np-landing-editorial-p">
                    {paragraph}
                  </p>
                ))}
                <p className="np-profile-manifesto np-landing-closer np-landing-editorial-bookend">
                  {EDITORIAL_CLOSER}
                </p>
                <p className="np-landing-paragraph">
                  <Link href="/manifesto" className="np-landing-rail-link">
                    Read the longer essay &rarr;
                  </Link>
                </p>
                <PlatformCta className="np-landing-editorial-cta" />
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
