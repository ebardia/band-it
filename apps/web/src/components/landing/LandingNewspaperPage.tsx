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

const BODY = [
  `Work is changing fast, and not gently. AI is absorbing functions that used to be full-time jobs, companies are running leaner, and more people are piecing together a living from contracts, fractional roles, and project work rather than a single paycheck. Band It is built for this new reality. Bring us a project — a marketing campaign, a research effort, a design sprint, a software build — and we assemble a qualified team to take it on, then run it through a platform built for transparency and accountability from day one. You see who's doing what, what's been delivered, and where every dollar goes. No black boxes, no chasing updates, no wondering whether the work is on track.`,
  `For the people doing the work, Band It is something different than a job board or a race-to-the-bottom freelance marketplace. It's a daily companion that helps you make a living on your own terms — find paid projects matched to your skills, team up with other talented people, and build a track record that follows you from project to project. And because life isn't only about earning, Band It also surfaces ways to contribute to causes you care about and do things simply for the joy of it. Whatever you open it for on a given morning, the goal is the same: to help you take action and move your life forward.`,
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
                  The story
                </h2>
                <div className="np-landing-columns">
                  <p className="np-landing-paragraph np-landing-dropcap">{BODY[0]}</p>
                  <p className="np-landing-paragraph">{BODY[1]}</p>
                </div>
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
