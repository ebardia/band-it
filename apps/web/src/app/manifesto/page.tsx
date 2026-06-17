import Link from 'next/link'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { CatBotMastheadHeader } from '@/components/landing/CatBotMastheadHeader'
import {
  CTA_LABEL,
  MANIFESTO_DEK,
  MANIFESTO_HEADLINE,
  MANIFESTO_REFERENCES,
  MANIFESTO_SECTIONS,
  MANIFESTO_SOURCES_NOTE,
  MANIFESTO_SUBDEK,
  MANIFESTO_SUMMARY,
  MANIFESTO_SUMMARY_KICKER,
} from '@/components/landing/landingCatBotCopy'

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export default function ManifestoPage() {
  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <CatBotMastheadHeader
          meta={
            <>
              White paper &middot; {formatPaperDate(new Date())} &middot; Vol. I
            </>
          }
          layout="centered"
        />

        <div className="np-profile-shell np-manifesto-shell">
          <Link href="/" className="np-manifesto-back">
            &larr; Front page
          </Link>
          <p className="np-cat np-cat-left">White paper</p>
          <h1 className="np-headline-lead np-headline-lead-left">
            {MANIFESTO_HEADLINE}
          </h1>
          <p className="np-landing-dek">{MANIFESTO_DEK}</p>
          <p className="np-manifesto-subdek">{MANIFESTO_SUBDEK}</p>

          <div className="np-manifesto-body">
            <section className="np-manifesto-section">
              <p className="np-landing-section-kicker">{MANIFESTO_SUMMARY_KICKER}</p>
              <p className="np-landing-paragraph np-landing-dropcap">{MANIFESTO_SUMMARY}</p>
            </section>

            {MANIFESTO_SECTIONS.map((section) => (
              <section key={section.title} className="np-manifesto-section">
                <h2 className="np-headline-serif np-manifesto-section-title">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="np-landing-paragraph">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <section className="np-manifesto-section np-manifesto-refs">
              <h2 className="np-headline-serif np-manifesto-section-title">References</h2>
              <ol className="np-manifesto-ref-list">
                {MANIFESTO_REFERENCES.map((ref) => (
                  <li key={ref.href}>
                    <a
                      href={ref.href}
                      className="np-manifesto-ref-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ref.label}
                    </a>
                  </li>
                ))}
              </ol>
              <p className="np-landing-paragraph np-manifesto-sources-note">
                {MANIFESTO_SOURCES_NOTE}
              </p>
            </section>
          </div>

          <p className="np-landing-paragraph np-landing-editorial-cta">
            <Link href="/register" className="np-landing-platform-cta">
              {CTA_LABEL}
            </Link>
          </p>
        </div>
      </div>
    </EditorialSurface>
  )
}
