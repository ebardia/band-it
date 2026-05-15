'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { useHelp } from '@/components/help/HelpContext'
import { FeedbackModal } from '@/components/feedback'
import { useToast } from '@/components/ui'
import { trpc } from '@/lib/trpc'
import {
  EDITORIAL_PRIMARY_ITEMS,
  isEditorialAccountActive,
  isEditorialNavActive,
} from '@/lib/editorialNav'

export function EditorialHamburgerNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()
  const { toggle: toggleHelp } = useHelp()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: { userId: string } = jwtDecode(token)
        setUserId(decoded.userId)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const isFounder =
    myBandsData?.bands?.some((band: { members?: { userId: string; role: string }[] }) =>
      band.members?.some((m) => m.userId === userId && m.role === 'FOUNDER')
    ) ?? false

  useEffect(() => {
    setOpen(false)
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    showToast('Logged out successfully', 'success')
    setOpen(false)
    router.push('/')
  }

  const handleHelp = () => {
    setOpen(false)
    toggleHelp()
  }

  const handleFeedback = () => {
    setOpen(false)
    setFeedbackOpen(true)
  }

  const accountActive = isEditorialAccountActive(pathname)

  return (
    <>
      <nav className="np-ed-menu-bar" aria-label="Menu" ref={menuRef}>
        <button
          type="button"
          className="np-ed-menu-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="editorial-menu-panel"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span className="np-ed-menu-icon" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>

        {open ? (
          <div
            id="editorial-menu-panel"
            className="np-ed-menu-panel"
            role="menu"
          >
            {EDITORIAL_PRIMARY_ITEMS.map((item) => {
              const active = isEditorialNavActive(pathname, item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  role="menuitem"
                  className={`np-ed-menu-item${active ? ' np-ed-menu-item--active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}

            <div className="np-ed-menu-group">
              <button
                type="button"
                className={`np-ed-menu-item np-ed-menu-item--expand${accountActive ? ' np-ed-menu-item--active' : ''}`}
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                Account
                <span className="np-ed-menu-chevron" aria-hidden>
                  {accountOpen ? '−' : '+'}
                </span>
              </button>
              {accountOpen ? (
                <div className="np-ed-menu-sub">
                  <button type="button" className="np-ed-menu-subitem" onClick={() => go('/user-dashboard/profile')}>
                    Profile
                  </button>
                  {isFounder && (
                    <button
                      type="button"
                      className="np-ed-menu-subitem"
                      onClick={() => go('/user-dashboard/subscription')}
                    >
                      Subscription
                    </button>
                  )}
                  <button type="button" className="np-ed-menu-subitem" onClick={() => go('/user-dashboard/settings')}>
                    Settings
                  </button>
                  <button type="button" className="np-ed-menu-subitem np-ed-menu-subitem--danger" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              ) : null}
            </div>

            <button type="button" role="menuitem" className="np-ed-menu-item" onClick={handleHelp}>
              Help
            </button>
            <button type="button" role="menuitem" className="np-ed-menu-item" onClick={handleFeedback}>
              Feedback
            </button>
          </div>
        ) : null}
      </nav>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
