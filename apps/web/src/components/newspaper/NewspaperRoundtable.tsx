'use client'

import Link from 'next/link'
import { NEWSPAPER_ROUNDTABLE_IMAGE } from './newspaperPlaceholders'

export type RoundtablePayload = {
  href: string
  kicker: string
  headline: string
  excerpt: string
  byline: string
}

function roundtableCategoryLabel(): string {
  return 'DISCUSSION'
}

type Props = {
  item: RoundtablePayload | null
  /** When both newspaper slots are empty, use shorter copy under Roundtable */
  roundtableQuietCopy?: string
}

export function NewspaperRoundtable({ item, roundtableQuietCopy }: Props) {
  return (
    <section className="np-rt-section" aria-label="The Roundtable">
      <hr className="np-rule mb-8 md:mb-10" />
      <h3 className="np-picks-header">The Roundtable</h3>

      {!item ? (
        <p className="np-quiet np-quiet-left">
          {roundtableQuietCopy ?? "You're caught up. No new replies or mentions."}
        </p>
      ) : (
        <article className="np-pick-row">
          <img
            className="np-pick-thumb"
            src={NEWSPAPER_ROUNDTABLE_IMAGE}
            alt=""
            width={112}
            height={112}
            loading="lazy"
            decoding="async"
          />
          <div className="min-w-0 flex-1">
            <p className="np-cat np-cat-left">{roundtableCategoryLabel()}</p>
            <h3 className="np-headline-serif">{item.headline}</h3>
            <p className="np-excerpt">{item.excerpt}</p>
            <p className="np-byline np-byline-left">{item.byline}</p>
            <Link href={item.href} className="np-action np-action-left">
              Read and reply
            </Link>
          </div>
        </article>
      )}
    </section>
  )
}
