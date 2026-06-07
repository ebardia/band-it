'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import {
  CTA_LABEL,
  CATNIP_CAFE_CAPTION,
  EXAMPLE_HEADING,
  EXAMPLE_KICKER,
  EXAMPLE_PARAGRAPHS,
  HERO_CAPTION,
  HIRE_BODY,
  HIRE_FOOTER,
  HIRE_HEADING,
  HIRE_KICKER,
  HOW_HEADING,
  HOW_INTRO,
  HOW_KICKER,
  HOW_STEPS,
  LANDING_CAT_IMAGES,
  LEAD_DEK,
  LEAD_HEADLINE,
  RAIL_BLOCKS,
} from '@/components/landing/landingCatBotCopy'
import { trpc } from '@/lib/trpc'

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

function PlatformCta({ className }: { className?: string }) {
  return (
    <Link href="/register" className={`np-landing-platform-cta${className ? ` ${className}` : ''}`}>
      {CTA_LABEL}
    </Link>
  )
}

export function LandingCatBotPage() {
  const router = useRouter()
  const trackPageView = trpc.analytics.trackPageView.useMutation()

  useEffect(() => {
    trackPageView.mutate({
      page: 'landing-catbot',
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
          <h1 className="np-catbot-masthead-title">Adopt A Cat Bot</h1>
          <p className="np-catbot-masthead-tagline">Wild cats. Niche jobs. Owner tags.</p>
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span suppressHydrationWarning>
              Adopt &middot; Domesticate &middot; Certify &middot; Roam &middot;{' '}
              {formatPaperDate(new Date())} &middot; Vol. I
            </span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-landing-shell">
          <div className="np-profile-spread np-landing-spread">
            <main className="np-profile-main">
              <p className="np-cat np-cat-left">Lead</p>
              <section className="np-landing-arena" aria-labelledby="landing-headline">
                <figure className="np-landing-hero-figure np-landing-hero-figure--cat">
                  <Image
                    src={LANDING_CAT_IMAGES.hero}
                    alt="A cat in a coat and hat reading a newspaper — the morning briefing before a neighborhood roam"
                    width={1536}
                    height={1024}
                    className="np-landing-hero-figure-img"
                    priority
                  />
                  <figcaption className="np-landing-photo-caption">{HERO_CAPTION}</figcaption>
                </figure>
                <div className="np-landing-lead-copy">
                  <h2 id="landing-headline" className="np-headline-lead np-headline-lead-left">
                    {LEAD_HEADLINE}
                  </h2>
                  <p className="np-landing-dek">{LEAD_DEK}</p>
                  <PlatformCta className="np-landing-lead-cta" />
                </div>
              </section>

              <section className="np-landing-stack" aria-labelledby="landing-how-heading">
                <p className="np-landing-section-kicker">{HOW_KICKER}</p>
                <h2 id="landing-how-heading" className="np-headline-serif np-landing-thesis-lead">
                  {HOW_HEADING}
                </h2>
                <p className="np-landing-paragraph np-landing-stack-intro">{HOW_INTRO}</p>
                <ol className="np-landing-stack-layers">
                  {HOW_STEPS.map((step) => (
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

              <figure className="np-landing-hero-figure np-landing-catnip-figure">
                <Image
                  src={LANDING_CAT_IMAGES.catnipCafe}
                  alt="The Catnip Café — cats gathered outside a neighborhood café at night"
                  width={1536}
                  height={1024}
                  className="np-landing-hero-figure-img"
                />
                <figcaption className="np-landing-photo-caption">{CATNIP_CAFE_CAPTION}</figcaption>
              </figure>

              <section className="np-landing-briefing" aria-labelledby="landing-example-heading">
                <p className="np-landing-section-kicker">{EXAMPLE_KICKER}</p>
                <h2 id="landing-example-heading" className="np-headline-serif np-landing-briefing-question">
                  {EXAMPLE_HEADING}
                </h2>
                <div className="np-landing-briefing-columns">
                  {EXAMPLE_PARAGRAPHS.map((paragraph, index) => (
                    <p
                      key={index}
                      className={`np-landing-paragraph${index === 0 ? ' np-landing-dropcap' : ''}`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>

              <section className="np-landing-classified" aria-labelledby="landing-hire-heading">
                <p className="np-landing-section-kicker">{HIRE_KICKER}</p>
                <div className="np-landing-classified-box">
                  <h2 id="landing-hire-heading" className="np-landing-classified-title">
                    {HIRE_HEADING}
                  </h2>
                  {HIRE_BODY.map((line, index) => (
                    <p key={index} className="np-landing-classified-line">
                      {line}
                    </p>
                  ))}
                  <p className="np-landing-classified-footer">{HIRE_FOOTER}</p>
                </div>
              </section>

              <PlatformCta className="np-landing-editorial-cta" />
            </main>

            <aside className="np-profile-rail" aria-label="Front page briefs">
              <div className="np-rail-block">
                <p className="np-profile-meta-rail" suppressHydrationWarning>
                  ADOPT &middot; DOMESTICATE
                  <br />
                  CERTIFY &middot; ROAM
                  <br />
                  {formatPaperDate(new Date()).toUpperCase()}
                </p>
              </div>

              {RAIL_BLOCKS.map((block) => (
                <div key={block.title} className="np-rail-block">
                  <h2 className="np-picks-header">{block.title}</h2>
                  <p className="np-preview-line">{block.detail}</p>
                  {'cta' in block && block.cta && block.href ? (
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
