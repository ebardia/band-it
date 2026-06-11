'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { CatBotMastheadHeader } from '@/components/landing/CatBotMastheadHeader'
import {
  CAT_BEHAVIORS,
  CAT_BEHAVIORS_HEADING,
  CAT_BEHAVIORS_INTRO,
  CAT_BEHAVIORS_KICKER,
  CAT_TYPES,
  CAT_TYPES_HEADING,
  CAT_TYPES_INTRO,
  CAT_TYPES_KICKER,
  CAT_TYPES_USE_CASE,
  CAT_TYPES_USE_CASE_KICKER,
  CTA_LABEL,
  EXAMPLE_DEAD_MOUSE,
  EXAMPLE_HEADING,
  EXAMPLE_KICKER,
  EXAMPLE_PARAGRAPHS,
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
  RAIL_BLOCKS,
  RAIL_META_LINE,
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

function HowStepCard({ step }: { step: (typeof HOW_STEPS)[number] }) {
  return (
    <li className="np-landing-stack-layer">
      <div className="np-landing-pipeline-step-head">
        <span className="np-landing-pipeline-index" aria-hidden>
          {step.num}
        </span>
        <span className="np-landing-pipeline-label">{step.label}</span>
      </div>
      <p className="np-landing-pipeline-text">{step.text}</p>
    </li>
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

        <CatBotMastheadHeader
          meta={<>{formatPaperDate(new Date())} &middot; Vol. I</>}
          layout="landing"
        />

        <div className="np-profile-shell np-landing-shell">
          <div className="np-profile-spread np-landing-spread">
            <main className="np-profile-main">
              <p className="np-cat np-cat-left">Lead</p>
              <section className="np-landing-arena" aria-labelledby="landing-dek">
                <figure className="np-landing-hero-figure np-landing-hero-figure--cat">
                  <Image
                    src={LANDING_CAT_IMAGES.hero}
                    alt="A cat in a coat and hat reading a newspaper — the morning briefing before a neighborhood roam"
                    width={1536}
                    height={1024}
                    className="np-landing-hero-figure-img"
                    priority
                  />
                </figure>
                <div className="np-landing-lead-copy">
                  <p id="landing-dek" className="np-landing-dek np-landing-dek--lead">
                    {LEAD_DEK}
                  </p>
                  <PlatformCta className="np-landing-lead-cta" />
                </div>
              </section>

              <section className="np-landing-stack" aria-labelledby="landing-how-heading">
                <p className="np-landing-section-kicker">{HOW_KICKER}</p>
                <h2 id="landing-how-heading" className="np-headline-serif np-landing-thesis-lead">
                  {HOW_HEADING}
                </h2>
                <p className="np-landing-paragraph np-landing-stack-intro">{HOW_INTRO}</p>
                <div className="np-landing-how-grid">
                  <ol className="np-landing-how-row np-landing-how-row--pair">
                    {HOW_STEPS.slice(0, 2).map((step) => (
                      <HowStepCard key={step.num} step={step} />
                    ))}
                  </ol>
                  <div className="np-landing-how-row np-landing-how-row--catnip">
                    <ol className="np-landing-how-row np-landing-how-row--single">
                      <HowStepCard step={HOW_STEPS[2]} />
                    </ol>
                    <figure className="np-landing-catnip-figure np-landing-catnip-figure--compact">
                      <Image
                        src={LANDING_CAT_IMAGES.catnipCafe}
                        alt="The Catnip Café — cats gathered outside a neighborhood café at night"
                        width={1536}
                        height={1024}
                        className="np-landing-hero-figure-img"
                      />
                    </figure>
                  </div>
                  <ol className="np-landing-how-row np-landing-how-row--pair">
                    {HOW_STEPS.slice(3, 5).map((step) => (
                      <HowStepCard key={step.num} step={step} />
                    ))}
                  </ol>
                </div>
              </section>

              <section className="np-landing-stack" aria-labelledby="landing-cat-behaviors-heading">
                <p className="np-landing-section-kicker">{CAT_BEHAVIORS_KICKER}</p>
                <h2 id="landing-cat-behaviors-heading" className="np-headline-serif np-landing-thesis-lead">
                  {CAT_BEHAVIORS_HEADING}
                </h2>
                <p className="np-landing-paragraph np-landing-stack-intro">{CAT_BEHAVIORS_INTRO}</p>
                <ol className="np-landing-how-row np-landing-how-row--pair">
                  {CAT_BEHAVIORS.map((behavior) => (
                    <li key={behavior.name} className="np-landing-stack-layer">
                      <div className="np-landing-pipeline-step-head">
                        <span className="np-landing-pipeline-label">{behavior.name}</span>
                      </div>
                      <p className="np-landing-pipeline-text">{behavior.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="np-landing-stack" aria-labelledby="landing-cat-types-heading">
                <p className="np-landing-section-kicker">{CAT_TYPES_KICKER}</p>
                <h2 id="landing-cat-types-heading" className="np-headline-serif np-landing-thesis-lead">
                  {CAT_TYPES_HEADING}
                </h2>
                <div className="np-landing-use-case">
                  <p className="np-landing-section-kicker">{CAT_TYPES_USE_CASE_KICKER}</p>
                  <p className="np-landing-paragraph">{CAT_TYPES_USE_CASE}</p>
                </div>
                <p className="np-landing-paragraph np-landing-stack-intro">{CAT_TYPES_INTRO}</p>
                <ol className="np-landing-how-row np-landing-how-row--pair">
                  {CAT_TYPES.map((cat) => (
                    <li key={cat.name} className="np-landing-stack-layer">
                      <div className="np-landing-pipeline-step-head">
                        <span className="np-landing-pipeline-label">{cat.name}</span>
                      </div>
                      <p className="np-landing-pipeline-text">{cat.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section
                className="np-landing-example-hire-row"
                aria-label="Example and classified hiring"
              >
                <div className="np-landing-example-col" aria-labelledby="landing-example-heading">
                  <p className="np-landing-section-kicker">{EXAMPLE_KICKER}</p>
                  <h2 id="landing-example-heading" className="np-headline-serif np-landing-briefing-question">
                    {EXAMPLE_HEADING}
                  </h2>
                  <div className="np-landing-briefing-columns np-landing-briefing-columns--stacked">
                    <blockquote className="np-landing-dead-mouse">
                      <p className="np-landing-section-kicker">{EXAMPLE_DEAD_MOUSE.label}</p>
                      <p className="np-landing-paragraph">{EXAMPLE_DEAD_MOUSE.text}</p>
                    </blockquote>
                    {EXAMPLE_PARAGRAPHS.map((paragraph, index) => (
                      <p
                        key={index}
                        className={`np-landing-paragraph${index === 0 ? ' np-landing-dropcap' : ''}`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="np-landing-hire-col" aria-labelledby="landing-hire-heading">
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
                </div>
              </section>

              <PlatformCta className="np-landing-editorial-cta" />
            </main>

            <aside className="np-profile-rail" aria-label="Front page briefs">
              <div className="np-rail-block">
                <p className="np-profile-meta-rail" suppressHydrationWarning>
                  {RAIL_META_LINE}
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
