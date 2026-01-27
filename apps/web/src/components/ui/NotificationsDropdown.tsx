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
    { userId: userId!, unreadOnly: true, limit: 10 },
    { enabled: !!userId }
  )

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      // Invalidate all notification queries to refresh everything
      utils.notification.getUnreadCount.invalidate()
      utils.notification.getMyNotifications.invalidate()
    },
  })

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      // Invalidate all notification queries to refresh everything
      utils.notification.getUnreadCount.invalidate()
      utils.notification.getMyNotifications.invalidate()
    },
  })

  const handleMarkAsRead = (e: React.MouseEvent, notification: any) => {
    e.stopPropagation()
    markAsReadMutation.mutate({
      notificationId: notification.id,
      userId: userId!,
    })
  }

  const handleView = (e: React.MouseEvent, notification: any) => {
    e.stopPropagation()
    // Mark as read when viewing
    markAsReadMutation.mutate({
      notificationId: notification.id,
      userId: userId!,
    })

    // Determine the correct URL to navigate to
    let targetUrl = notification.actionUrl

    // Fix for BAND_MEMBER_JOINED notifications - always go to members page
    if (notification.type === 'BAND_MEMBER_JOINED' && targetUrl) {
      // Extract band slug from actionUrl (e.g., /bands/my-band or /bands/my-band/members)
      const match = targetUrl.match(/^\/bands\/([^\/]+)/)
      if (match) {
        targetUrl = `/bands/${match[1]}/members`
      }
    }

    if (targetUrl) {
      router.push(targetUrl)
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
                <div
                  key={notification.id}
                  className={cn(
                    theme.components.notificationDropdown.item.base,
                    theme.components.notificationDropdown.item.unread
                  )}
                >
                  <Stack spacing="sm">
                    <Flex justify="between" align="start">
                      <Text variant="small" weight="semibold" className="flex-1">
                        {notification.title}
                      </Text>
                      <span className={theme.components.notificationDropdown.unreadDot}></span>
                    </Flex>
                    {notification.message && (
                      <Text variant="small" color="muted">
                        {notification.message}
                      </Text>
                    )}
                    <Flex justify="between" align="center">
                      <Text variant="small" color="muted">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Text>
                      <Flex gap="xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleMarkAsRead(e, notification)}
                        >
                          Mark Read
                        </Button>
                        {notification.actionUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => handleView(e, notification)}
                          >
                            View
                          </Button>
                        )}
                      </Flex>
                    </Flex>
                  </Stack>
                </div>
              ))}
            </div>
          ) : (
            <div className={theme.components.notificationDropdown.empty}>
              <Text color="muted">No unread notifications</Text>
            </div>
          )}

          {/* Footer */}
          <div className={theme.components.notificationDropdown.footer}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push('/notifications')
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