'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Card,
  Loading,
  Alert,
  AdminLayout,
  Flex,
  Badge,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Event type labels for display
const eventTypeLabels: Record<string, string> = {
  user_registered: 'User Registered',
  user_signed_in: 'User Signed In',
  band_created: 'Band Created',
  proposal_created: 'Proposal Created',
  task_completed: 'Task Completed',
  page_viewed: 'Page Viewed',
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

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

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getOverview.useQuery(
    { userId: userId! },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const { data: trends, isLoading: trendsLoading } = trpc.analytics.getDailyTrends.useQuery(
    { userId: userId!, days: 30 },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const { data: recentEvents, isLoading: eventsLoading } = trpc.analytics.getRecentEvents.useQuery(
    { userId: userId!, limit: 50 },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  // Check if user is admin
  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Analytics" subtitle="Loading...">
          <Loading message="Checking permissions..." />
        </AdminLayout>
      </>
    )
  }

  if (!profileData?.user?.isAdmin) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Access Denied">
          <Alert variant="danger">
            <Text>You do not have permission to access the admin area.</Text>
          </Alert>
        </AdminLayout>
      </>
    )
  }

  const isLoading = overviewLoading || trendsLoading || eventsLoading

  // Calculate max value for chart scaling
  const maxTrendValue = trends
    ? Math.max(
        ...trends.map(
          (t) =>
            t.registrations + t.signIns + t.bandsCreated + t.proposalsCreated + t.tasksCompleted
        ),
        1
      )
    : 1

  const formatChange = (change: number) => {
    if (change === 0) return '0%'
    return change > 0 ? `+${change}%` : `${change}%`
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Analytics" subtitle="Platform usage metrics and trends">
        <Stack spacing="lg">
          {isLoading ? (
            <Loading message="Loading analytics data..." />
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <Stack spacing="xs">
                    <Text variant="small" color="muted">Total Users</Text>
                    <Heading level={2}>{overview?.totals.users ?? 0}</Heading>
                    <Flex align="center" gap="xs">
                      <Text variant="small" color="muted">
                        {overview?.recent.registrations ?? 0} new (30d)
                      </Text>
                      <Text
                        variant="small"
                        className={getChangeColor(overview?.changes.registrations ?? 0)}
                      >
                        {formatChange(overview?.changes.registrations ?? 0)}
                      </Text>
                    </Flex>
                  </Stack>
                </Card>

                <Card className="p-4">
                  <Stack spacing="xs">
                    <Text variant="small" color="muted">Total Bands</Text>
                    <Heading level={2}>{overview?.totals.bands ?? 0}</Heading>
                    <Flex align="center" gap="xs">
                      <Text variant="small" color="muted">
                        {overview?.recent.bands ?? 0} new (30d)
                      </Text>
                      <Text
                        variant="small"
                        className={getChangeColor(overview?.changes.bands ?? 0)}
                      >
                        {formatChange(overview?.changes.bands ?? 0)}
                      </Text>
                    </Flex>
                  </Stack>
                </Card>

                <Card className="p-4">
                  <Stack spacing="xs">
                    <Text variant="small" color="muted">Total Proposals</Text>
                    <Heading level={2}>{overview?.totals.proposals ?? 0}</Heading>
                    <Flex align="center" gap="xs">
                      <Text variant="small" color="muted">
                        {overview?.recent.proposals ?? 0} new (30d)
                      </Text>
                      <Text
                        variant="small"
                        className={getChangeColor(overview?.changes.proposals ?? 0)}
                      >
                        {formatChange(overview?.changes.proposals ?? 0)}
                      </Text>
                    </Flex>
                  </Stack>
                </Card>

                <Card className="p-4">
                  <Stack spacing="xs">
                    <Text variant="small" color="muted">Tasks Completed</Text>
                    <Heading level={2}>{overview?.totals.tasksCompleted ?? 0}</Heading>
                    <Flex align="center" gap="xs">
                      <Text variant="small" color="muted">
                        {overview?.recent.tasksCompleted ?? 0} (30d)
                      </Text>
                      <Text
                        variant="small"
                        className={getChangeColor(overview?.changes.tasksCompleted ?? 0)}
                      >
                        {formatChange(overview?.changes.tasksCompleted ?? 0)}
                      </Text>
                    </Flex>
                  </Stack>
                </Card>
              </div>

              {/* Daily Trends Chart */}
              <Card>
                <div className="p-4 border-b border-gray-100">
                  <Heading level={3}>Daily Activity (Last 30 Days)</Heading>
                </div>
                <div className="p-4">
                  {trends && trends.length > 0 ? (
                    <div className="h-48 flex items-end gap-1">
                      {trends.map((day, index) => {
                        const total =
                          day.registrations +
                          day.signIns +
                          day.bandsCreated +
                          day.proposalsCreated +
                          day.tasksCompleted
                        const height = Math.max((total / maxTrendValue) * 100, 2)
                        const date = new Date(day.date)
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6

                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center group relative"
                          >
                            <div
                              className={`w-full rounded-t transition-all ${
                                isWeekend ? 'bg-gray-200' : 'bg-blue-400'
                              } hover:bg-blue-600`}
                              style={{ height: `${height}%` }}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              <div className="font-semibold">{day.date}</div>
                              <div>Registrations: {day.registrations}</div>
                              <div>Sign-ins: {day.signIns}</div>
                              <div>Bands: {day.bandsCreated}</div>
                              <div>Proposals: {day.proposalsCreated}</div>
                              <div>Tasks: {day.tasksCompleted}</div>
                            </div>
                            {/* Show date label every 7 days */}
                            {index % 7 === 0 && (
                              <Text
                                variant="small"
                                color="muted"
                                className="mt-1 text-xs transform -rotate-45 origin-left"
                              >
                                {date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <Text color="muted">No trend data available yet.</Text>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <Flex gap="md" wrap="wrap">
                    <Flex align="center" gap="xs">
                      <div className="w-3 h-3 bg-blue-400 rounded" />
                      <Text variant="small" color="muted">Weekday</Text>
                    </Flex>
                    <Flex align="center" gap="xs">
                      <div className="w-3 h-3 bg-gray-200 rounded" />
                      <Text variant="small" color="muted">Weekend</Text>
                    </Flex>
                  </Flex>
                </div>
              </Card>

              {/* Recent Events */}
              <Card>
                <div className="p-4 border-b border-gray-100">
                  <Heading level={3}>Recent Events</Heading>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentEvents && recentEvents.length > 0 ? (
                    recentEvents.slice(0, 20).map((event: any) => {
                      const metadata = event.metadata as Record<string, unknown> | null
                      return (
                        <Flex
                          key={event.id}
                          justify="between"
                          align="center"
                          className="px-4 py-3"
                        >
                          <Flex align="center" gap="md" wrap="wrap">
                            <Badge
                              variant={
                                event.eventType === 'user_registered'
                                  ? 'success'
                                  : event.eventType === 'band_created'
                                  ? 'info'
                                  : event.eventType === 'task_completed'
                                  ? 'warning'
                                  : event.eventType === 'page_viewed'
                                  ? 'secondary'
                                  : 'secondary'
                              }
                            >
                              {eventTypeLabels[event.eventType] || event.eventType}
                            </Badge>
                            {event.userName ? (
                              <Text variant="small" color="muted">
                                {event.userName} ({event.userEmail})
                              </Text>
                            ) : event.eventType === 'page_viewed' && metadata?.page ? (
                              <Text variant="small" color="muted">
                                Page: {String(metadata.page)}
                              </Text>
                            ) : null}
                          </Flex>
                          <Text variant="small" color="muted" className="flex-shrink-0">
                            {new Date(event.createdAt).toLocaleString()}
                          </Text>
                        </Flex>
                      )
                    })
                  ) : (
                    <div className="p-4">
                      <Text color="muted">No events recorded yet.</Text>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </Stack>
      </AdminLayout>
    </>
  )
}
