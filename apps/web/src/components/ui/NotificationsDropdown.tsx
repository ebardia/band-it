'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { Heading, Text, Stack, Button, Loading, Flex } from '@/components/ui'
import { theme, cn } from '@band-it/shared'

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsDropdown({ isOpen, onClose }: NotificationsDropdownProps) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const utils = trpc.useUtils()

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const { data: notificationsData, isLoading, refetch } = trpc.notification.getMyNotifications.useQuery(
    { userId: userId!, unreadOnly: false, limit: 10 },
    { enabled: !!userId }
  )

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch()
      // Invalidate unread count so bell updates
      if (userId) {
        utils.notification.getUnreadCount.invalidate({ userId })
      }
    },
  })

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch()
      // Invalidate unread count so bell updates
      if (userId) {
        utils.notification.getUnreadCount.invalidate({ userId })
      }
    },
  })

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate({
        notificationId: notification.id,
        userId: userId!,
      })
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
      onClose()
    }
  }

  const handleMarkAllAsRead = () => {
    if (userId) {
      markAllAsReadMutation.mutate({ userId })
    }
  }

  if (!isOpen) return null

  return (
    <div ref={dropdownRef} className={theme.components.notificationDropdown.container}>
      {isLoading ? (
        <div className="p-4">
          <Loading message="Loading notifications..." />
        </div>
      ) : (
        <Stack spacing="sm">
          {/* Header */}
          <div className={theme.components.notificationDropdown.header}>
            <Flex justify="between">
              <Heading level={3}>Notifications</Heading>
              {notificationsData?.notifications && notificationsData.notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                  Mark all read
                </Button>
              )}
            </Flex>
          </div>

          {/* Notifications List */}
          {notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
            <div>
              {notificationsData.notifications.map((notification: any) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    theme.components.notificationDropdown.item.base,
                    !notification.isRead && theme.components.notificationDropdown.item.unread
                  )}
                >
                  <Stack spacing="sm">
                    <Flex justify="between">
                      <Text variant="small" weight="semibold">
                        {notification.title}
                      </Text>
                      {!notification.isRead && (
                        <span className={theme.components.notificationDropdown.unreadDot}></span>
                      )}
                    </Flex>
                    {notification.message && (
                      <Text variant="small" variant="muted">
                        {notification.message}
                      </Text>
                    )}
                    <Text variant="small" variant="muted">
                      {new Date(notification.createdAt).toLocaleString()}
                    </Text>
                  </Stack>
                </button>
              ))}
            </div>
          ) : (
            <div className={theme.components.notificationDropdown.empty}>
              <Text variant="muted">No notifications yet</Text>
            </div>
          )}

          {/* Footer */}
          <div className={theme.components.notificationDropdown.footer}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push('/user-dashboard')
                onClose()
              }}
              className="w-full"
            >
              View All Notifications
            </Button>
          </div>
        </Stack>
      )}
    </div>
  )
}