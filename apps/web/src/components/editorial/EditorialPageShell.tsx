'use client'

import type { ReactNode } from 'react'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'
import { EditorialNeonMasthead } from '@/components/newspaper/EditorialNeonMasthead'

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
  /** When set, replaces the default Daily Action masthead with a neon arc + action word. */
  mastheadArcLabel?: string
  mastheadActionLabel?: string
  mastheadAriaLabel?: string
  mastheadBrand?: string
}

/**
 * Landing-style newspaper shell — use for new editorial pages (welcome, onboarding, etc.).
 */
export function EditorialPageShell({
  children,
  kicker,
  editionLabel = 'Your edition',
  mastheadArcLabel,
  mastheadActionLabel,
  mastheadAriaLabel,
  mastheadBrand,
}: Props) {
  const useCustomMasthead =
    mastheadArcLabel && mastheadActionLabel && mastheadAriaLabel

  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead">
          {useCustomMasthead ? (
            <>
              {mastheadBrand ? <p className="np-cat">{mastheadBrand}</p> : null}
              <EditorialNeonMasthead
                arcLabel={mastheadArcLabel}
                actionLabel={mastheadActionLabel}
                ariaLabel={mastheadAriaLabel}
              />
            </>
          ) : (
            <DailyMastheadTitle />
          )}
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span suppressHydrationWarning>{formatPaperDate(new Date())}</span>
            <span className="text-right">{editionLabel}</span>
          </div>
          {kicker ? <p className="np-cat np-cat-left">{kicker}</p> : null}
        </header>
        {children}
      </div>
    </EditorialSurface>
  )
}
