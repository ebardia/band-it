'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  Flex,
  Card,
  Badge,
  Loading,
  PageWrapper,
  DashboardContainer
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function NotificationsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const utils = trpc.useUtils()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: notificationsData, isLoading } = trpc.notification.getMyNotifications.useQuery(
    { userId: userId!, unreadOnly: showUnreadOnly, limit: 50 },
    { enabled: !!userId }
  )

  const { data: countData } = trpc.notification.getUnreadCount.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getUnreadCount.invalidate()
      utils.notification.getMyNotifications.invalidate()
    },
  })

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getUnreadCount.invalidate()
      utils.notification.getMyNotifications.invalidate()
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
    }
  }

  const handleMarkAllAsRead = () => {
    if (userId) {
      markAllAsReadMutation.mutate({ userId })
    }
  }

  if (!userId) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Loading message="Loading..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const notifications = notificationsData?.notifications || []
  const unreadCount = countData?.count || 0

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'danger'
      case 'HIGH':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />
      <DashboardContainer>
        <Stack spacing="xl">
          {/* Header */}
          <Flex justify="between" align="center">
            <Stack spacing="sm">
              <Heading level={1}>Notifications</Heading>
              {unreadCount > 0 && (
                <Text color="muted">{unreadCount} unread</Text>
              )}
            </Stack>
            <Flex gap="sm">
              <Button
                variant={showUnreadOnly ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                {showUnreadOnly ? 'Showing Unread' : 'Show Unread Only'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                >
                  Mark All Read
                </Button>
              )}
            </Flex>
          </Flex>

          {/* Notifications List */}
          {isLoading ? (
            <Loading message="Loading notifications..." />
          ) : notifications.length > 0 ? (
            <Stack spacing="md">
              {notifications.map((notification: any) => (
                <Card
                  key={notification.id}
                  hover
                  onClick={() => handleNotificationClick(notification)}
                  className={notification.isRead ? 'opacity-70' : ''}
                >
                  <Flex justify="between" align="start">
                    <Stack spacing="sm" className="flex-1">
                      <Flex gap="sm" align="center">
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <Text weight="semibold">{notification.title}</Text>
                        {notification.priority !== 'MEDIUM' && (
                          <Badge variant={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                        )}
                      </Flex>
                      {notification.message && (
                        <Text variant="small" color="muted">
                          {notification.message}
                        </Text>
                      )}
                      <Text variant="small" color="muted">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Text>
                    </Stack>
                    {notification.actionUrl && (
                      <Button variant="ghost" size="sm">
                        View →
                      </Button>
                    )}
                  </Flex>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card>
              <Stack spacing="md" align="center" className="py-8">
                <Text color="muted">
                  {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </Text>
                {showUnreadOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUnreadOnly(false)}
                  >
                    Show all notifications
                  </Button>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </DashboardContainer>
    </PageWrapper>
  )
}
