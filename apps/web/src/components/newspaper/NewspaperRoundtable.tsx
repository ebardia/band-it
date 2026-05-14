'use client'

import Link from 'next/link'

export type RoundtablePayload = {
  href: string
  kicker: string
  headline: string
  excerpt: string
  byline: string
}

type Props = {
  item: RoundtablePayload | null
  /** When both newspaper slots are empty, use shorter copy under Roundtable */
  roundtableQuietCopy?: string
}

export function NewspaperRoundtable({ item, roundtableQuietCopy }: Props) {
  return (
    <section aria-label="The Roundtable">
      <hr className="np-rule mb-8 md:mb-10" />
      <h3 className="np-section-label">The Roundtable</h3>

      {!item ? (
        <p className="np-quiet">
          {roundtableQuietCopy ?? "You're caught up. No new replies or mentions."}
        </p>
      ) : (
        <>
          <p className="np-kicker">{item.kicker}</p>
          <h2 className="np-headline-section">{item.headline}</h2>
          <p className="np-excerpt">{item.excerpt}</p>
          <p className="np-byline">{item.byline}</p>
          <Link href={item.href} className="np-action">
            Read and reply
          </Link>
        </>
      )}
    </section>
  )
}
