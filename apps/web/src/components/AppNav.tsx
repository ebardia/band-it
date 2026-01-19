'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { jwtDecode } from 'jwt-decode'
import { Dropdown, DropdownItem, useToast, NotificationBell, NotificationsDropdown, AIUsageTicker } from '@/components/ui'
import { trpc } from '@/lib/trpc'
import { theme } from '@band-it/shared'

export function AppNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()
  const [showNotifications, setShowNotifications] = useState(false)
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
    { label: 'Overview', path: '/user-dashboard' },
    { label: 'My Bands', path: '/bands/my-bands' },
    { label: 'Browse Bands', path: '/bands' },
  ]

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <>
      <AIUsageTicker />
      <nav className={theme.components.nav.container}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => router.push('/user-dashboard')}>
          <Image 
            src="/logo.png" 
            alt="Band IT Logo" 
            width={150} 
            height={150}
            priority
          />
        </button>

        {/* Center Navigation */}
        <div className="flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => router.push(link.path)}
              className={isActive(link.path) ? theme.components.nav.activeLink : theme.components.nav.link}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right Side: Bell + Account Dropdown */}
        <div className="flex items-center gap-4">
          {/* Notification Bell with Dropdown */}
          <div className="relative">
            <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
            <NotificationsDropdown 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>

          {/* Account Dropdown */}
          <Dropdown trigger={<span>Account ▼</span>}>
            <DropdownItem onClick={() => router.push('/user-dashboard/profile')}>
              Profile
            </DropdownItem>
            {isFounder && (
              <DropdownItem onClick={() => router.push('/user-dashboard/subscription')}>
                Subscription
              </DropdownItem>
            )}
            <DropdownItem onClick={() => router.push('/user-dashboard/settings')}>
              Settings
            </DropdownItem>
            <DropdownItem onClick={handleLogout}>
              Logout
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </nav>
    </>
  )
}