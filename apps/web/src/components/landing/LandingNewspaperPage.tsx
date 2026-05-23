'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'
import { trpc } from '@/lib/trpc'

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

const HEADLINE_LINE_1 = 'AI is taking the jobs.'
const HEADLINE_LINE_2 = 'Time to step in the ring.'

const INTRO_OPENING =
  'Imagine waking up, grabbing your coffee, and opening a personalized action-packed \u201cnewspaper\u201d built just for you \u2014'

const INTRO_SCENES = [
  'A paid project in a field you care about that fits your skills.',
  'A local concert looking for backup singers.',
  'A neighbor who needs help building a garden.',
]

const INTRO_CLOSER =
  'No one knows exactly what the future of work will look like in the age of AI. But together, we can position ourselves to be first in line when new paths begin to open.'

const STORY_PARAGRAPHS = [
  'Something fundamental is changing in the way humans work, create, collaborate, and survive.',
  'The old model \u2014 one company, one title, one long-term path \u2014 is beginning to dissolve. AI is accelerating that shift. Some jobs are disappearing, others are transforming, and entirely new forms of work are starting to emerge in their place. Small teams form quickly, solve problems, create things, then reshape and move on to the next opportunity.',
  'Band It is designed for that world.',
  'A world where your skills, interests, relationships, curiosity, and reputation move with you from project to project. Where contributing to a research effort, helping organize a local event, joining a creative collaboration, solving a neighborhood problem, or participating in a paid global project all become part of the same living ecosystem.',
  'Underneath it is a transparent coordination layer where people can assemble around ideas, opportunities, and real-world needs \u2014 quickly, fluidly, and with accountability built in from the start.',
  'Maybe this is where work is headed. Maybe it becomes something else entirely.',
  'Either way, the future is unlikely to arrive in neat corporate boxes. It will probably look more human, more networked, more unpredictable \u2014 and more collaborative than the systems we built before.',
]

const PIPELINE_THESIS =
  'At its core, Band It is a system for assembling and coordinating human talent in a world where work is becoming increasingly fluid.'

const PIPELINE_STEPS = [
  {
    label: 'Opportunities',
    text: 'Projects enter the system from companies, organizations, local communities, startups, research groups, and eventually everyday people. Some are paid. Some are volunteer-driven. Some are strange little experiments that turn into something much bigger.',
  },
  {
    label: 'Assembly',
    text: 'Band It then helps form the right combination of people around those opportunities \u2014 not just based on skills, but also interests, availability, trust, past collaborations, reputation, and shared curiosity. A designer in one city, a researcher in another, a student nearby, a retired expert somewhere else. Small temporary teams forming around real-world needs.',
  },
  {
    label: 'Workspace',
    text: 'Once a team forms, the entire life of the project lives in one transparent space: discussions, tasks, decisions, files, timelines, contributions, payments, and outcomes. Everyone involved can see what is happening, where things stand, and how the work is moving forward.',
  },
  {
    label: 'Histories',
    text: 'Over time, people don\u2019t simply build resumes inside Band It. They build living histories of contribution, collaboration, reliability, creativity, and trust that move with them from one opportunity to the next.',
  },
]

const CLOSER = `This is work, organized around people instead of the other way around. Companies get teams that deliver with full visibility. People get meaningful, paid work — plus the tools, transparency, and community to do it well. That's Band It.`

const BRIEFING_QUESTION =
  'How is Band It different from project tools, freelance platforms, and staffing agencies?'

const BRIEFING_BODY = [
  `Project management tools like Asana or Monday organize work you already have — but they don't find you the work or the people. Freelance marketplaces like Upwork connect you to individuals in a race to the lowest bid, then leave you to manage them alone. Staffing agencies place people but take a heavy cut and disappear once the contract starts.`,
  `Band It does the whole thing. We bring in real paid projects, assemble a qualified team (not a lone freelancer), and manage the work inside one platform built for transparency and accountability — so funders see exactly what's happening with their money and workers get a fair deal and a track record that follows them. It's the project, the people, and the management in one place, organized around the humans doing the work instead of the company extracting from them.`,
]

const RAIL_COMPANIES = `Bring a project. We assemble the team, run the work on-platform, and keep every deliverable and dollar visible — no black boxes.`

const RAIL_WORKERS = `Paid projects matched to your skills, teammates you can trust, a track record that travels with you — plus purpose and play beyond the paycheck.`

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
            <span>{formatPaperDate(new Date())}</span>
            <span className="text-right">Front page · Vol. I</span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-landing-shell">
          <div className="np-profile-spread np-landing-spread">
            <main className="np-profile-main">
              <p className="np-cat np-cat-left">The edition</p>
              <div className="np-landing-lead-row">
                <div className="np-landing-lead-text">
                  <h1 id="landing-headline" className="np-headline-lead np-headline-lead-left np-landing-headline">
                    <span className="np-landing-headline-line np-landing-headline-line--setup">
                      {HEADLINE_LINE_1}
                    </span>
                    <span className="np-landing-headline-line np-landing-headline-line--punch">
                      {HEADLINE_LINE_2}
                    </span>
                  </h1>
                </div>
                <figure className="np-landing-lead-photo">
                  <Image
                    src="/landing-boxing-ring.jpg"
                    alt="Vintage boxing ring under arena lights"
                    width={640}
                    height={480}
                    className="np-landing-lead-photo-img"
                    priority
                  />
                  <figcaption className="np-landing-photo-caption">
                    Step in — the work is waiting
                  </figcaption>
                </figure>
              </div>
              <section className="np-landing-intro" aria-label="Opening">
                <p className="np-landing-intro-text np-landing-dropcap">{INTRO_OPENING}</p>
                <div className="np-landing-intro-scenes">
                  {INTRO_SCENES.map((scene) => (
                    <p key={scene} className="np-landing-intro-scene">
                      {scene}
                    </p>
                  ))}
                </div>
                <p className="np-landing-intro-text np-landing-intro-close">{INTRO_CLOSER}</p>
              </section>

              <hr className="np-rule" />

              <section className="np-landing-story" aria-labelledby="landing-story-heading">
                <h2 id="landing-story-heading" className="np-picks-header np-picks-header-left">
                  The Story
                </h2>
                <div className="np-landing-columns">
                  {STORY_PARAGRAPHS.map((paragraph, index) => (
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
                  How it works
                </p>
                <p className="np-landing-pipeline-thesis">{PIPELINE_THESIS}</p>
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
              </section>

              <p className="np-profile-pullquote">
                Whatever you open it for on a given morning, the goal is the same: to help you take
                action and move your life forward.
              </p>

              <section className="np-landing-briefing" aria-labelledby="landing-briefing-heading">
                <div className="np-landing-briefing-inner">
                  <h2 id="landing-briefing-heading" className="np-picks-header np-picks-header-left">
                    Briefing
                  </h2>
                  <p className="np-landing-briefing-tags" aria-hidden>
                    Project tools · Freelance platforms · Staffing agencies
                  </p>
                  <h3 className="np-headline-serif np-landing-briefing-question">{BRIEFING_QUESTION}</h3>
                  <div className="np-landing-briefing-columns">
                    <p className="np-landing-paragraph">{BRIEFING_BODY[0]}</p>
                    <p className="np-landing-paragraph np-landing-briefing-lead">{BRIEFING_BODY[1]}</p>
                  </div>
                </div>
              </section>

              <section className="np-landing-editorial" aria-labelledby="landing-editorial-heading">
                <h2 id="landing-editorial-heading" className="np-picks-header np-picks-header-left">
                  Editorial
                </h2>
                <p className="np-profile-manifesto np-landing-closer">{CLOSER}</p>
              </section>
            </main>

            <aside className="np-profile-rail" aria-label="Front page briefs">
              <div className="np-rail-block">
                <p className="np-profile-meta-rail">
                  BAND IT
                  <br />
                  WORK · PLAY · TALK IT OUT
                  <br />
                  {formatPaperDate(new Date()).toUpperCase()}
                </p>
              </div>

              <div className="np-rail-block">
                <h2 className="np-picks-header">For companies</h2>
                <p className="np-preview-line">{RAIL_COMPANIES}</p>
              </div>

              <div className="np-rail-block">
                <h2 className="np-picks-header">For people doing the work</h2>
                <p className="np-preview-line">{RAIL_WORKERS}</p>
              </div>

              <div className="np-rail-block">
                <h2 className="np-picks-header">Also in this edition</h2>
                <ul className="np-next-list">
                  <li className="np-next-item">
                    <p className="np-next-title">The Daily</p>
                    <p className="np-next-detail">
                      Your morning edition — paid work, causes, and play matched to you.
                    </p>
                  </li>
                  <li className="np-next-item">
                    <p className="np-next-title">Talk It Out</p>
                    <p className="np-next-detail">
                      Facilitated conversations when your band needs to decide or resolve.
                    </p>
                  </li>
                </ul>
              </div>

              <div className="np-rail-block np-landing-rail-cta">
                <h2 className="np-picks-header">Get started</h2>
                <div className="np-landing-rail-actions">
                  <Link
                    href="/register"
                    className="np-profile-btn np-profile-btn-primary np-landing-rail-btn"
                  >
                    Register
                  </Link>
                  <button
                    type="button"
                    className="np-profile-btn np-landing-rail-btn"
                    onClick={() => router.push('/login')}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </EditorialSurface>
  )
}
