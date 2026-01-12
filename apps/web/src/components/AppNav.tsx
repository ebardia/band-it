'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Dropdown, DropdownItem, useToast, NotificationBell, NotificationsDropdown } from '@/components/ui'
import { theme } from '@band-it/shared'

export function AppNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()
  const [showNotifications, setShowNotifications] = useState(false)

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
            <DropdownItem onClick={() => router.push('/user-dashboard/subscription')}>
              Subscription
            </DropdownItem>
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
  )
}