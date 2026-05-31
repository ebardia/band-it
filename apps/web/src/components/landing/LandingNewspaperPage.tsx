'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'
import {
  LANDING_DRY_CLEANER_RACK_IMAGE,
  LANDING_STEAMPUNK_FACTORY_IMAGE,
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

const LEAD_HEADLINE = 'What are you wearing today?'

const LEAD_DEK =
  'An action-packed daily edition. Pick what suits the work \u2014 the team, the agents, the mission. Your closet is bigger than you think.'

const PHOTO_CAPTION =
  'The whole rack. Try something on. Change it by lunch.'

const OPPORTUNITIES_KICKER = 'This morning'
const OPPORTUNITIES_HEADING = "What\u2019s on your rack"

const OPPORTUNITY_TEASERS = [
  {
    title: 'Wear the researcher hat.',
    detail:
      'A nonprofit needs to understand who\u2019s funding their space right now. Two hours of agent work plus your read produces a report they\u2019ll actually use.',
  },
  {
    title: 'Put on the campaign jacket.',
    detail:
      'A marketing agency in your region is building out a six-week launch and needs a four-person team. Your skills fit. Two collaborators are already in.',
  },
  {
    title: 'Lace up the weekend boots.',
    detail:
      'A neighborhood mural project lost its lead artist on Saturday. Three people are looking for a fourth. No pay, real fun.',
  },
]

const THESIS_KICKER = 'The thesis'
const THESIS_LEAD =
  'The age of human-in-the-loop AI is ending. Group-in-the-loop is beginning.'

const THESIS_PARAGRAPHS = [
  'Most AI tools imagine one person prompting one model. That\u2019s the old way wearing new clothes.',
  'Real work \u2014 research, creative projects, building things, solving messy problems \u2014 is rarely a solo act. It\u2019s a small group of people with the right skills, the right agents, and a shared workspace, moving together. The team thinks. The agents do. The humans choose what matters.',
  'Band It is built for that. Your team forms around a project. Your agents come with you. The work happens out in the open, with transparency and accountability built in from the first hour.',
  'You don\u2019t replace humans with AI. You don\u2019t bolt AI onto humans. You compose them \u2014 group in the loop, together.',
]

const PIPELINE_KICKER = 'How a day goes'
const PIPELINE_HEADING = 'Four moves, every project'

const PIPELINE_STEPS = [
  {
    label: 'The Closet',
    text: 'Projects, problems, and opportunities \u2014 paid, volunteer, experimental, local, global. Some come from companies. Some from communities. Some you create yourself. Hung up where you can see them.',
  },
  {
    label: 'Getting Dressed',
    text: 'Band It helps you assemble the right combination for the work \u2014 people with the skills, agents with the capabilities, and the trust signals that say this group can deliver. A designer here, a researcher there, a few agents you\u2019ve built or borrowed. A team dressed for the job.',
  },
  {
    label: 'The Fitting Room',
    text: 'One transparent space for the whole project: tasks, decisions, files, money, agents at work, humans deciding. Try it. Change it. Tear it out and try again \u2014 without paying a huge price for every experiment.',
  },
  {
    label: 'The Wardrobe',
    text: 'Not a static resume. A living wardrobe of what you\u2019ve worn, who you\u2019ve worked with, what your agents handled well, and what you can take into tomorrow\u2019s project. Your record moves with you.',
  },
]

const PULL_QUOTE = '\u201cTry it. Don\u2019t like it? Change it. All on a whim.\u201d'

const BRIEFING_HEADING = 'Where does Band It fit?'
const BRIEFING_LEAD = "It's not what you've seen before."

const BRIEFING_PARAGRAPHS = [
  'Not a freelance marketplace where you bid against strangers for the lowest price. Not a project management tool that organizes work you somehow have to find on your own. Not an agent builder that drops you off once the agent is built. Not a staffing agency that disappears the moment the contract is signed.',
  'Those are all single-piece tools for a single-piece world.',
  'Band It is the whole picture.',
  'A coordination layer where a small group of humans and their AI capabilities take on real work \u2014 find it, form around it, ship it, and get paid for it \u2014 all in one transparent place. The project, the people, the agents, the money, the record. Together, not scattered across six tools and three companies.',
]

const EDITORIAL_HEADING = 'Who knew humanity would end up in the dry-cleaning business?'

const EDITORIAL_PARAGRAPHS = [
  'Endless racks of roles, swapped in and out as the day demands. A research hat in the morning, a marketing jacket by afternoon, dancing shoes for the evening project. The work isn\u2019t disappearing \u2014 the way we organize for it is. Technology is becoming a utility, and what\u2019s left is what humans do best: choose, combine, create, and decide together. Often with agents at our side.',
  'Band It is built for that world. Real projects. Real teams. Real money. Full visibility. A record that follows the person, not the employer.',
]

const EDITORIAL_CLOSER = 'What are you wearing today?'

const PIPELINE_FIGURE_CAPTION =
  'Behind the counter \u2014 closet, fitting room, and wardrobe, all on one rolling rack.'

type RailBlock = {
  title: string
  detail: string
  cta: string
  href: string
}

const RAIL_BLOCKS: RailBlock[] = [
  {
    title: 'For workers',
    detail: 'Real work, real teams, your agents come with you.',
    cta: 'Get started',
    href: '/register',
  },
  {
    title: 'For companies',
    detail:
      'Bring us a project. We\u2019ll dress the team for it and ship it in the open.',
    cta: 'Bring a project',
    href: '/register',
  },
  {
    title: 'For recruiters',
    detail:
      'Run multiple project teams in one transparent place. Your bench, your agents, your back-office.',
    cta: 'See how',
    href: '/about',
  },
  {
    title: 'The Daily',
    detail: 'Your morning edition \u2014 what\u2019s on your rack today.',
    cta: 'Learn more',
    href: '/daily',
  },
  {
    title: 'Talk It Out',
    detail: 'When the group needs a facilitator, not another app.',
    cta: 'See how',
    href: '/talk-it-out',
  },
]

function PlatformCta({ className }: { className?: string }) {
  return (
    <Link href="/register" className={`np-landing-platform-cta${className ? ` ${className}` : ''}`}>
      Step onto the platform &rarr;
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
              The Daily &middot; {formatPaperDate(new Date())} &middot; Vol. I &middot; Your edition
            </span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-landing-shell">
          <div className="np-profile-spread np-landing-spread">
            <main className="np-profile-main">
              <p className="np-cat np-cat-left">Lead</p>
              <section className="np-landing-arena" aria-labelledby="landing-headline">
                <div className="np-landing-arena-row">
                  <div className="np-landing-lead-copy">
                    <h1 id="landing-headline" className="np-headline-lead np-headline-lead-left">
                      {LEAD_HEADLINE}
                    </h1>
                    <p className="np-landing-dek">{LEAD_DEK}</p>
                    <PlatformCta className="np-landing-lead-cta" />
                  </div>
                  <figure className="np-landing-lead-photo">
                    <Image
                      src={LANDING_DRY_CLEANER_RACK_IMAGE}
                      alt="Editorial illustration of a long dry-cleaner rolling rack hung with hats, lab coats, tool belts, and work shoes"
                      width={640}
                      height={480}
                      className="np-landing-lead-photo-img"
                      priority
                    />
                    <figcaption className="np-landing-photo-caption">{PHOTO_CAPTION}</figcaption>
                  </figure>
                </div>
              </section>

              <section
                className="np-landing-opportunities"
                aria-labelledby="landing-opportunities-heading"
              >
                <p className="np-landing-section-kicker">{OPPORTUNITIES_KICKER}</p>
                <h2
                  id="landing-opportunities-heading"
                  className="np-picks-header np-picks-header-left"
                >
                  {OPPORTUNITIES_HEADING}
                </h2>
                <ul className="np-landing-opportunity-cards">
                  {OPPORTUNITY_TEASERS.map((teaser) => (
                    <li key={teaser.title} className="np-landing-opportunity-card">
                      <p className="np-landing-opportunity-title">{teaser.title}</p>
                      <p className="np-landing-opportunity-detail">{teaser.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <hr className="np-rule" />

              <section className="np-landing-story" aria-labelledby="landing-thesis-heading">
                <p className="np-landing-section-kicker">{THESIS_KICKER}</p>
                <h2 id="landing-thesis-heading" className="np-headline-serif np-landing-thesis-lead">
                  {THESIS_LEAD}
                </h2>
                <div className="np-landing-columns">
                  {THESIS_PARAGRAPHS.map((paragraph, index) => (
                    <p
                      key={paragraph}
                      className={`np-landing-paragraph${index === 0 ? ' np-landing-dropcap' : ''}`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>

              <section className="np-landing-pipeline" aria-labelledby="landing-pipeline-heading">
                <p className="np-landing-pipeline-kicker" id="landing-pipeline-heading">
                  {PIPELINE_KICKER}
                </p>
                <p className="np-landing-pipeline-thesis">{PIPELINE_HEADING}</p>
                <div className="np-landing-pipeline-layout">
                  <ol className="np-landing-pipeline-flow">
                    {PIPELINE_STEPS.map((step, index) => (
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

                  <figure className="np-landing-pipeline-figure">
                    <div className="np-daily-classified-frame">
                      <Image
                        src={LANDING_STEAMPUNK_FACTORY_IMAGE}
                        alt="A vast steampunk factory floor of brass gears, flywheels, steam pipes, and Victorian machinery."
                        width={1200}
                        height={675}
                        className="np-daily-classified-img"
                      />
                    </div>
                    <figcaption className="np-daily-classified-caption">
                      {PIPELINE_FIGURE_CAPTION}
                    </figcaption>
                  </figure>
                </div>
              </section>

              <p className="np-profile-pullquote">{PULL_QUOTE}</p>

              <section className="np-landing-briefing" aria-labelledby="landing-briefing-heading">
                <div className="np-landing-briefing-inner">
                  <h2 id="landing-briefing-heading" className="np-picks-header np-picks-header-left">
                    Briefing
                  </h2>
                  <h3 className="np-headline-serif np-landing-briefing-question">{BRIEFING_HEADING}</h3>
                  <p className="np-landing-briefing-lead-line">{BRIEFING_LEAD}</p>
                  <div className="np-landing-briefing-columns">
                    {BRIEFING_PARAGRAPHS.map((paragraph) => (
                      <p key={paragraph} className="np-landing-paragraph">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </section>

              <section className="np-landing-editorial" aria-labelledby="landing-editorial-heading">
                <h2 id="landing-editorial-heading" className="np-picks-header np-picks-header-left">
                  Editorial
                </h2>
                <h3 className="np-headline-serif np-landing-editorial-head">{EDITORIAL_HEADING}</h3>
                {EDITORIAL_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph} className="np-landing-paragraph np-landing-editorial-p">
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
                  BAND IT
                  <br />
                  WORK &middot; PLAY &middot; TALK IT OUT
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
