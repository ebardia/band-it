'use client'

import { EditorialPrimaryNav } from './EditorialPrimaryNav'
import { EditorialSecondaryNav } from './EditorialSecondaryNav'

export function EditorialChrome() {
  return (
    <header className="np-ed-chrome">
      <EditorialPrimaryNav />
      <EditorialSecondaryNav />
    </header>
  )
}
