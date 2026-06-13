import Link from 'next/link'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { CatBotMastheadHeader } from '@/components/landing/CatBotMastheadHeader'
import {
  CTA_LABEL,
  MANIFESTO_DEK,
  MANIFESTO_HEADLINE,
  MANIFESTO_PARAGRAPHS,
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
              Manifesto &middot; {formatPaperDate(new Date())} &middot; Vol. I
            </>
          }
          layout="centered"
        />

        <div className="np-profile-shell np-manifesto-shell">
          <Link href="/" className="np-manifesto-back">
            &larr; Front page
          </Link>
          <p className="np-cat np-cat-left">Essay</p>
          <h1 className="np-headline-lead np-headline-lead-left">
            {MANIFESTO_HEADLINE}
          </h1>
          <p className="np-landing-dek">{MANIFESTO_DEK}</p>
          <div className="np-landing-columns np-landing-story">
            {MANIFESTO_PARAGRAPHS.map((paragraph, index) => (
              <p
                key={paragraph}
                className={`np-landing-paragraph${index === 0 ? ' np-landing-dropcap' : ''}`}
              >
                {paragraph}
              </p>
            ))}
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
