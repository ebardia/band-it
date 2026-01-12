'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { theme } from '@band-it/shared'

interface NotificationBellProps {
  onClick: () => void
}

export function NotificationBell({ onClick }: NotificationBellProps) {
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

  const { data: countData } = trpc.notification.getUnreadCount.useQuery(
    { userId: userId! },
    { 
      enabled: !!userId,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  )

  const unreadCount = countData?.count || 0

  return (
    <button
      onClick={onClick}
      className={theme.components.notificationBell.button}
    >
      {/* Filled Bell Icon */}
      <svg 
        className="w-6 h-6" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <span className={theme.components.notificationBell.badge}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}