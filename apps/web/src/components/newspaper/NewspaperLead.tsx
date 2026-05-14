'use client'

import Link from 'next/link'

export type LeadPayload = {
  href: string
  kicker: string
  headline: string
  dek: string
  byline: string
}

type Props = {
  lead: LeadPayload | null
  /** When set (e.g. both slots empty), overrides default lead quiet copy */
  leadQuietCopy?: string
}

export function NewspaperLead({ lead, leadQuietCopy }: Props) {
  if (!lead) {
    return (
      <section className="mb-10 md:mb-12" aria-label="Lead story">
        <p className="np-quiet">
          {leadQuietCopy ?? 'Nothing needs your review this morning.'}
        </p>
      </section>
    )
  }

  return (
    <section className="mb-10 md:mb-12" aria-label="Lead story">
      <p className="np-kicker">{lead.kicker}</p>
      <h2 className="np-headline-lead">{lead.headline}</h2>
      <p className="np-dek">{lead.dek}</p>
      <p className="np-byline">{lead.byline}</p>
      <Link href={lead.href} className="np-action">
        Review it
      </Link>
    </section>
  )
}
