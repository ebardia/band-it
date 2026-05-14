'use client'

import Link from 'next/link'
import { NEWSPAPER_LEAD_IMAGE } from './newspaperPlaceholders'

export type LeadPayload = {
  href: string
  kicker: string
  headline: string
  dek: string
  byline: string
}

function leadCategoryLabel(apiKicker: string): string {
  const u = apiKicker.toUpperCase()
  if (u.includes('REVIEW') || u.includes('PEER')) return 'REVIEW'
  return u.slice(0, 18)
}

type Props = {
  lead: LeadPayload | null
  /** When set (e.g. both slots empty), overrides default lead quiet copy */
  leadQuietCopy?: string
}

export function NewspaperLead({ lead, leadQuietCopy }: Props) {
  if (!lead) {
    return (
      <section className="np-lead-section" aria-label="Lead story">
        <p className="np-quiet">
          {leadQuietCopy ?? 'Nothing needs your review this morning.'}
        </p>
      </section>
    )
  }

  const cat = leadCategoryLabel(lead.kicker)

  return (
    <section className="np-lead-section" aria-label="Lead story">
      <div className="np-lead-stack">
        <p className="np-cat">{cat}</p>
        <h2 className="np-headline-lead">{lead.headline}</h2>
        <p className="np-dek">{lead.dek}</p>
        <p className="np-byline">{lead.byline}</p>
        <div className="np-action-wrap">
          <Link href={lead.href} className="np-action">
            Review it
          </Link>
        </div>
      </div>

      <div className="np-hero">
        <img
          src={NEWSPAPER_LEAD_IMAGE}
          alt=""
          width={1400}
          height={788}
          loading="eager"
          decoding="async"
        />
      </div>
    </section>
  )
}
