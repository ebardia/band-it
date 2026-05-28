'use client'

import { EditorialMenuRow } from '@/components/editorial/EditorialMenuRow'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'

type Props = {
  editionLine: string
}

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function NewspaperMasthead({ editionLine }: Props) {
  return (
    <header className="mb-6 md:mb-8">
      <DailyMastheadTitle />
      <EditorialMenuRow />
      <hr className="np-rule" />
      <div className="np-masthead-meta py-3 md:py-3.5">
        <span suppressHydrationWarning>{formatPaperDate(new Date())}</span>
        <span className="text-right">{editionLine}</span>
      </div>
      <hr className="np-rule" />
    </header>
  )
}
