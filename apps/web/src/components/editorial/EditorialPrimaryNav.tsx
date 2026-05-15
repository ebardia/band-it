'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHelp } from '@/components/help/HelpContext'
import {
  EDITORIAL_PRIMARY_ITEMS,
  isEditorialAccountActive,
  isEditorialNavActive,
} from '@/lib/editorialNav'
import { EditorialAccountMenu } from './EditorialAccountMenu'

export function EditorialPrimaryNav() {
  const pathname = usePathname()
  const { toggle: toggleHelp } = useHelp()
  const accountActive = isEditorialAccountActive(pathname)

  return (
    <nav className="np-ed-primary" aria-label="Primary">
      <div className="np-ed-primary-track">
        {EDITORIAL_PRIMARY_ITEMS.map((item, index) => {
          const inverted = index % 2 === 1
          const active = isEditorialNavActive(pathname, item.href)
          const segmentClass = [
            'np-ed-primary-segment',
            inverted ? 'np-ed-primary-segment--light' : 'np-ed-primary-segment--dark',
            active ? 'np-ed-primary-segment--neon' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <Link key={item.id} href={item.href} className={segmentClass}>
              {item.label}
            </Link>
          )
        })}

        <button
          type="button"
          className="np-ed-primary-segment np-ed-primary-segment--light np-ed-primary-segment--btn"
          onClick={toggleHelp}
        >
          Help
        </button>

        <EditorialAccountMenu inverted={false} active={accountActive} />
      </div>
    </nav>
  )
}
