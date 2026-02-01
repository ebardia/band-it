'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { jwtDecode } from 'jwt-decode'
import { Dropdown, DropdownItem, useToast, NotificationBell, NotificationsDropdown, AIUsageTicker } from '@/components/ui'
import { useHelp } from '@/components/help/HelpContext'
import { trpc } from '@/lib/trpc'
import { theme } from '@band-it/shared'

export function AppNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()
  const { toggle: toggleHelp } = useHelp()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  // Check if user is a founder of any band
  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const isFounder = myBandsData?.bands?.some(
    (band: any) => band.members?.some(
      (member: any) => member.userId === userId && member.role === 'FOUNDER'
    )
  ) ?? false

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    showToast('Logged out successfully', 'success')
    router.push('/')
  }

  const navLinks = [
    { label: 'Overview', path: '/user-dashboard', guide: 'nav-overview' },
    { label: 'My Bands', path: '/bands/my-bands', guide: 'nav-my-bands' },
    { label: 'Browse Bands', path: '/bands', guide: 'nav-browse-bands' },
  ]

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  // Close mobile menu when navigating
  const handleNavClick = (path: string) => {
    setShowMobileMenu(false)
    router.push(path)
  }

  return (
    <>
      {/* AI Usage Ticker - Hidden on mobile */}
      <div className="hidden md:block">
        <AIUsageTicker />
      </div>
      <nav className={theme.components.nav.container}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4">
        {/* Logo */}
        <button onClick={() => handleNavClick('/user-dashboard')} className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Band IT Logo"
            width={120}
            height={120}
            className="w-24 h-auto md:w-[150px]"
            priority
          />
        </button>

        {/* Center Navigation - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => handleNavClick(link.path)}
              className={isActive(link.path) ? theme.components.nav.activeLink : theme.components.nav.link}
              data-guide={link.guide}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right Side: Hamburger (mobile) + Bell + Account Dropdown */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Help Button */}
          <button
            onClick={toggleHelp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="Help Center"
          >
            <span>?</span>
            <span>Help</span>
          </button>

          {/* Notification Bell with Dropdown */}
          <div className="relative" data-guide="notification-bell">
            <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
            <NotificationsDropdown
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/* Account Dropdown - Hidden on mobile */}
          <div className="hidden md:block">
            <Dropdown trigger={<span>Account ▼</span>}>
              <DropdownItem onClick={() => handleNavClick('/user-dashboard/profile')}>
                Profile
              </DropdownItem>
              {isFounder && (
                <DropdownItem onClick={() => handleNavClick('/user-dashboard/subscription')}>
                  Subscription
                </DropdownItem>
              )}
              <DropdownItem onClick={() => handleNavClick('/user-dashboard/settings')}>
                Settings
              </DropdownItem>
              <DropdownItem onClick={handleLogout}>
                Logout
              </DropdownItem>
            </Dropdown>
          </div>

          {/* Hamburger Menu Button - Visible on mobile */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Only Logout */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3">
            <button
              onClick={() => {
                setShowMobileMenu(false)
                handleLogout()
              }}
              className="block w-full text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
    </>
  )
}