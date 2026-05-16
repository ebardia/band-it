'use client'

import { EditorialMenuRow } from '@/components/editorial/EditorialMenuRow'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'

/** Masthead chrome while Daily feed loads (menu + rule, no date yet). */
export function DailyMastheadSkeleton() {
  return (
    <header className="mb-6 md:mb-8">
      <DailyMastheadTitle />
      <EditorialMenuRow />
      <hr className="np-rule" />
    </header>
  )
}
