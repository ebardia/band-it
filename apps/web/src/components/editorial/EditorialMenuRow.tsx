'use client'

import { EditorialHamburgerNav } from './EditorialHamburgerNav'

/** In-page menu placement (masthead / editorial headers), not a global top bar. */
export function EditorialMenuRow() {
  return (
    <div className="np-ed-menu-row">
      <EditorialHamburgerNav />
    </div>
  )
}