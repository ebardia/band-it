'use client'

import { useEffect } from 'react'
import Link from 'next/link'
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

const HEADLINE = 'AI is taking the jobs. Band It helps you take the work.'

const DEK =
  'Band It matches skilled people to real paid projects — assembling teams, managing the work, and putting income, purpose, and play back in people\u2019s hands.'

const BODY = [
  `Work is changing fast, and not gently. AI is absorbing functions that used to be full-time jobs, companies are running leaner, and more people are piecing together a living from contracts, fractional roles, and project work rather than a single paycheck. Band It is built for this new reality. Bring us a project — a marketing campaign, a research effort, a design sprint, a software build — and we assemble a qualified team to take it on, then run it through a platform built for transparency and accountability from day one. You see who's doing what, what's been delivered, and where every dollar goes. No black boxes, no chasing updates, no wondering whether the work is on track.`,
  `For the people doing the work, Band It is something different than a job board or a race-to-the-bottom freelance marketplace. It's a daily companion that helps you make a living on your own terms — find paid projects matched to your skills, team up with other talented people, and build a track record that follows you from project to project. And because life isn't only about earning, Band It also surfaces ways to contribute to causes you care about and do things simply for the joy of it. Whatever you open it for on a given morning, the goal is the same: to help you take action and move your life forward.`,
]

const CLOSER = `This is work, organized around people instead of the other way around. Companies get teams that deliver with full visibility. People get meaningful, paid work — plus the tools, transparency, and community to do it well. That's Band It.`

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
            <span className="text-right">Front page</span>
          </div>
          <hr className="np-rule" />
        </header>

        <section className="np-lead-section" aria-labelledby="landing-headline">
          <div className="np-lead-stack">
            <p className="np-cat">The edition</p>
            <h1 id="landing-headline" className="np-headline-lead">
              {HEADLINE}
            </h1>
            <p className="np-dek">{DEK}</p>
          </div>
        </section>

        <article className="np-landing-body">
          {BODY.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="np-landing-paragraph">
              {paragraph}
            </p>
          ))}
          <p className="np-landing-paragraph np-landing-closer">{CLOSER}</p>
        </article>

        <footer className="np-landing-footer">
          <Link href="/register" className="np-landing-auth-btn np-landing-auth-btn-primary">
            Register
          </Link>
          <button
            type="button"
            className="np-landing-auth-link np-landing-footer-signin"
            onClick={() => router.push('/login')}
          >
            Sign In
          </button>
        </footer>
      </div>
    </EditorialSurface>
  )
}
