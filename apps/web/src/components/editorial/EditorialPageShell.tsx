'use client'

import type { ReactNode } from 'react'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

type Props = {
  children: ReactNode
  /** Small caps label under the masthead (e.g. FIRST EDITION) */
  kicker?: string
  editionLabel?: string
}

/**
 * Landing-style newspaper shell — use for new editorial pages (welcome, onboarding, etc.).
 */
export function EditorialPageShell({ children, kicker, editionLabel = 'Your edition' }: Props) {
  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead">
          <DailyMastheadTitle />
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span>{formatPaperDate(new Date())}</span>
            <span className="text-right">{editionLabel}</span>
          </div>
          {kicker ? <p className="np-cat np-cat-left">{kicker}</p> : null}
        </header>
        {children}
      </div>
    </EditorialSurface>
  )
}
