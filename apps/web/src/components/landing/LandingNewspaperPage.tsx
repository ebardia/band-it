'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'
import {
  LANDING_BANDIT_LAYER_IMAGE,
  LANDING_MAGICIAN_JUGGLER_IMAGE,
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

const LEAD_HEADLINE = 'Uncover opportunities. Validate them. Run the campaigns.'

const LEAD_DEK =
  'Band It helps you find opportunities for your products and services, lets your subject-matter experts verify and validate each lead, then launches marketing campaigns for the lists that pass review \u2014 two agents, your people in the loop, every step on the record.'

const HERO_FIGURE_CAPTION =
  'Fig. 1 \u2014 The opportunity conveyor belt: signals in, discovery and validation in the middle, campaigns out.'

const SIGNALS_KICKER = 'Step one'
const SIGNALS_HEADING = 'Signal detection'

const SIGNAL_FEEDS = [
  {
    title: 'Hiring & growth',
    detail:
      'A regional HVAC firm posts three service-manager roles and expands into commercial installs \u2014 a signal of capacity stress and a wedge for your operations product.',
  },
  {
    title: 'Market & regulation',
    detail:
      'New EPA reporting rules hit your target vertical \u2014 a signal that compliance-heavy buyers will need help in the next quarter, before competitors reach them.',
  },
  {
    title: 'Digital footprint',
    detail:
      'LinkedIn, press, and job boards show a CRM migration plus a new business-development hire \u2014 a signal the account is buying now, not someday.',
  },
  {
    title: 'Operational stress',
    detail:
      'Glassdoor churn, backlog complaints, or delayed permit filings \u2014 signals of coordination pain your service is built to solve.',
  },
  {
    title: 'Public records & contracts',
    detail:
      'SAM.gov awards, permit pulls, or franchise filings in your geography \u2014 signals that name accounts entering a change window worth a call.',
  },
]

const WORKFLOW_KICKER = 'Step two'
const WORKFLOW_HEADING = 'Discovery agent + your SME'

const WORKFLOW_INTRO =
  'Signals do not become pipeline on their own. The discovery agent hunts across feeds you define, correlates evidence, and ranks who might need what you sell \u2014 and why now. Your subject-matter expert reviews every lead before it moves forward: approve, reject, or edit with context only a human would know.'

const WORKFLOW_STEPS = [
  {
    num: '01',
    label: 'Discovery agent',
    text:
      'Watches your signal feeds, applies fit filters, and assembles ranked opportunity lists with evidence attached \u2014 company, trigger, suggested angle, confidence.',
  },
  {
    num: '02',
    label: 'Human validation',
    text:
      'Your SME checks fit, timing, and tone. Bad leads drop. Good leads get enriched. Nothing reaches outreach until a person signs off.',
  },
  {
    num: '03',
    label: 'Validated list',
    text:
      'What exits is a campaign-ready audience: verified accounts, approved messaging angles, and segment tags your team trusts.',
  },
]

const BRIEFING_KICKER = 'Step three'
const BRIEFING_HEADING = 'Marketing agent + your review'
const BRIEFING_LEAD =
  'Validated lists become campaigns \u2014 with your team steering copy, channels, and spend.'

const BRIEFING_PARAGRAPHS = [
  'The marketing agent turns approved segments into outbound assets: email sequences tuned to each trigger, LinkedIn ad variants for accounts that just won municipal contracts, nurture tracks for companies with fresh BD hires, and landing-page copy matched to the signal that surfaced them.',
  'You set brand voice, compliance boundaries, and budget caps. The agent drafts; your marketer approves. Sequences ship to the CRM, ad platforms, or webhooks you already use \u2014 not a black box that sends on its own.',
  'Same conveyor, different products: a med-spa chain gets a re-engagement campaign for lapsed members; a B2B services firm gets a call-list brief for contractors expanding into government work. Every send traces back to the signal that started it.',
]

const BRIEFING_MAGICIAN_CAPTION =
  'Fig. 2 \u2014 Two agents, one human checkpoint: discovery in, validation through, campaigns out.'

type RailBlock = {
  title: string
  detail: string
  cta?: string
  href?: string
}

const RAIL_BLOCKS: RailBlock[] = [
  {
    title: 'For operators',
    detail:
      'Configure signal feeds, run discovery, pass SME review, and launch campaigns from one workspace \u2014 with a full audit trail.',
  },
  {
    title: 'For companies',
    detail:
      'Bring your product, ICP, and compliance rules. We compose the discovery and marketing agents around how you already sell.',
  },
  {
    title: 'The longer story',
    detail: 'How Band It thinks about signals, agents, and human checkpoints.',
    cta: 'Read the essay',
    href: '/manifesto',
  },
]

function PlatformCta({ className }: { className?: string }) {
  return (
    <Link href="/register" className={`np-landing-platform-cta${className ? ` ${className}` : ''}`}>
      Start discovering &rarr;
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
              Signals &middot; Opportunities &middot; Campaigns &middot; {formatPaperDate(new Date())}{' '}
              &middot; Vol. I
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
                </div>
                <figure className="np-landing-hero-figure">
                  <Image
                    src={LANDING_BANDIT_LAYER_IMAGE}
                    alt="Vintage steampunk engraving of the Band It opportunity conveyor belt: boxes for human tasks, AI agents, decision points, and automated processes passing from signal to action"
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

              <section className="np-landing-stack" aria-labelledby="landing-workflow-heading">
                <p className="np-landing-section-kicker">{WORKFLOW_KICKER}</p>
                <h2 id="landing-workflow-heading" className="np-headline-serif np-landing-thesis-lead">
                  {WORKFLOW_HEADING}
                </h2>
                <p className="np-landing-paragraph np-landing-stack-intro">{WORKFLOW_INTRO}</p>
                <ol className="np-landing-stack-layers">
                  {WORKFLOW_STEPS.map((step) => (
                    <li key={step.num} className="np-landing-stack-layer">
                      <div className="np-landing-pipeline-step-head">
                        <span className="np-landing-pipeline-index" aria-hidden>
                          {step.num}
                        </span>
                        <span className="np-landing-pipeline-label">{step.label}</span>
                      </div>
                      <p className="np-landing-pipeline-text">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="np-landing-briefing" aria-labelledby="landing-briefing-heading">
                <div className="np-landing-briefing-split">
                  <div className="np-landing-briefing-inner">
                    <p className="np-landing-section-kicker">{BRIEFING_KICKER}</p>
                    <h2
                      id="landing-briefing-heading"
                      className="np-headline-serif np-landing-briefing-question"
                    >
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
                  <figure className="np-landing-briefing-figure">
                    <Image
                      src={LANDING_MAGICIAN_JUGGLER_IMAGE}
                      alt="Vintage engraving of a circus magician juggling signals, opportunity lists, campaign assets, and review checkpoints while balancing discovery and marketing agents with a human reviewer"
                      width={1536}
                      height={1024}
                      className="np-landing-briefing-figure-img"
                    />
                    <figcaption className="np-landing-photo-caption">{BRIEFING_MAGICIAN_CAPTION}</figcaption>
                  </figure>
                </div>
              </section>
            </main>

            <aside className="np-profile-rail" aria-label="Front page briefs">
              <div className="np-rail-block">
                <p className="np-profile-meta-rail" suppressHydrationWarning>
                  DISCOVERY AGENT
                  <br />
                  SME REVIEW &middot; MARKETING AGENT
                  <br />
                  {formatPaperDate(new Date()).toUpperCase()}
                </p>
              </div>

              {RAIL_BLOCKS.map((block) => (
                <div key={block.title} className="np-rail-block">
                  <h2 className="np-picks-header">{block.title}</h2>
                  <p className="np-preview-line">{block.detail}</p>
                  {block.cta && block.href ? (
                    <Link href={block.href} className="np-landing-rail-link">
                      {block.cta} &rarr;
                    </Link>
                  ) : null}
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
