'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FeedbackButton } from '@/components/feedback'
// import { NotificationBell, NotificationsDropdown } from '@/components/ui'

export function EditorialSecondaryNav() {
  const router = useRouter()

  return (
    <header className="np-ed-secondary">
      <div className="np-ed-secondary-inner">
        <button
          type="button"
          onClick={() => router.push('/daily')}
          className="np-ed-logo-btn"
          aria-label="Band It home"
        >
          <Image
            src="/logo.png"
            alt="BAND IT Logo"
            width={120}
            height={120}
            className="np-ed-logo"
            priority
          />
        </button>

        <div className="np-ed-secondary-actions">
          {/* Notifications hidden on editorial surfaces for now — keep imports for quick restore */}
          {/* <NotificationBell onClick={...} /> */}
          <FeedbackButton />
        </div>
      </div>
    </header>
  )
}
