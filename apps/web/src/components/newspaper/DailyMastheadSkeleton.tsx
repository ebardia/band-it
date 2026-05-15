'use client'

import { EditorialMenuRow } from '@/components/editorial/EditorialMenuRow'

/** Masthead chrome while Daily feed loads (menu + rule, no date yet). */
export function DailyMastheadSkeleton() {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="np-masthead-title text-[clamp(2.75rem,9vw,4.25rem)] mb-3 md:mb-4">
        The Daily
      </h1>
      <EditorialMenuRow />
      <hr className="np-rule" />
    </header>
  )
}
