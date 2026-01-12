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
  useToast,
  PageWrapper,
  DashboardContainer,
  Flex,
  Card,
  Badge,
  Loading,
  Alert
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function OverviewDashboard() {
  const router = useRouter()
  const { showToast } = useToast()
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

  // Fetch all data
  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: invitationsData } = trpc.band.getMyInvitations.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: notificationsData } = trpc.notification.getMyNotifications.useQuery(
    { userId: userId!, limit: 10 },
    { enabled: !!userId }
  )

  const { data: allBandsData } = trpc.band.getAll.useQuery()

  // Get applications to review (for bands where user can approve)
  const bandsWhereCanApprove = myBandsData?.bands.filter((band: any) => 
    band.whoCanApprove.includes(band.myRole)
  ) || []

  const acceptInviteMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted!', 'success')
    },
  })

  const declineInviteMutation = trpc.band.declineInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation declined', 'success')
    },
  })

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

  // Calculate stats
  const bandCount = myBandsData?.bands.length || 0
  const inviteCount = invitationsData?.invitations.length || 0
  const pendingBands = myBandsData?.bands.filter((b: any) => b.status === 'PENDING') || []
  const newBandsThisWeek = allBandsData?.bands.filter((band: any) => {
    const createdDate = new Date(band.createdAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return createdDate > weekAgo
  }) || []

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Flex gap="md" align="start">
          {/* Left Sidebar */}
          <DashboardSidebar bandCount={bandCount} />

          {/* Center Content */}
          <div className="flex-1">
            <Stack spacing="xl">
              <Heading level={1}>Overview</Heading>

              {/* Quick Stats */}
              <Flex gap="md">
                <Card>
                  <Stack spacing="sm">
                    <Text variant="small" variant="muted">My Bands</Text>
                    <Heading level={2}>{bandCount}</Heading>
                  </Stack>
                </Card>
                <Card>
                  <Stack spacing="sm">
                    <Text variant="small" variant="muted">Pending Invites</Text>
                    <Heading level={2}>{inviteCount}</Heading>
                  </Stack>
                </Card>
                <Card>
                  <Stack spacing="sm">
                    <Text variant="small" variant="muted">Total Members</Text>
                    <Heading level={2}>
                      {myBandsData?.bands.reduce((sum: number, band: any) => sum + band._count.members, 0) || 0}
                    </Heading>
                  </Stack>
                </Card>
              </Flex>

              {/* Action Required Section */}
              <Stack spacing="lg">
                <Heading level={2}>🔴 Action Required</Heading>

                {/* Pending Invitations */}
                {invitationsData?.invitations && invitationsData.invitations.length > 0 && (
                  <Stack spacing="md">
                    <Heading level={3}>Pending Invitations ({inviteCount})</Heading>
                    {invitationsData.invitations.map((invitation: any) => (
                      <Card key={invitation.id}>
                        <Flex justify="between">
                          <Stack spacing="sm">
                            <Heading level={4}>{invitation.band.name}</Heading>
                            <Text variant="small" variant="muted">{invitation.band.description}</Text>
                          </Stack>
                          <Flex gap="sm">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => acceptInviteMutation.mutate({
                                membershipId: invitation.id,
                                userId
                              })}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => declineInviteMutation.mutate({
                                membershipId: invitation.id,
                                userId
                              })}
                            >
                              Decline
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                )}

                {/* Bands Needing Members */}
                {pendingBands.length > 0 && (
                  <Stack spacing="md">
                    <Heading level={3}>Bands Needing Members</Heading>
                    {pendingBands.map((band: any) => (
                      <Card key={band.id}>
                        <Flex justify="between">
                          <Stack spacing="sm">
                            <Heading level={4}>{band.name}</Heading>
                            <Badge variant="warning">Needs {3 - band._count.members} more member(s)</Badge>
                          </Stack>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => router.push(`/bands/${band.slug}/invite`)}
                          >
                            Invite Members
                          </Button>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                )}

                {inviteCount === 0 && pendingBands.length === 0 && (
                  <Alert variant="success">
                    <Text>All caught up! No actions needed.</Text>
                  </Alert>
                )}
              </Stack>

              {/* Discovery Feed */}
              <Stack spacing="lg">
                <Heading level={2}>📊 Discovery Feed</Heading>

                {/* New Bands This Week */}
                {newBandsThisWeek.length > 0 && (
                  <Stack spacing="md">
                    <Heading level={3}>New Bands This Week</Heading>
                    {newBandsThisWeek.slice(0, 3).map((band: any) => (
                      <Card key={band.id}>
                        <Flex justify="between">
                          <Stack spacing="sm">
                            <Heading level={4}>{band.name}</Heading>
                            <Text variant="small" variant="muted">{band.description}</Text>
                            <Badge variant="info">{band._count.members} members</Badge>
                          </Stack>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/bands/${band.slug}`)}
                          >
                            View Band
                          </Button>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                )}

                {/* Placeholders */}
                <Card>
                  <Stack spacing="sm">
                    <Heading level={4}>Grant Opportunities</Heading>
                    <Text variant="small" variant="muted">Coming soon - We'll show grant opportunities matched to your interests</Text>
                  </Stack>
                </Card>
              </Stack>
            </Stack>
          </div>

          {/* Right Sidebar - Activity */}
          <aside className="w-80 bg-white rounded-lg shadow p-4">
            <Stack spacing="lg">
              <Heading level={3}>Recent Activity</Heading>
              
              {notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
                <Stack spacing="sm">
                  {notificationsData.notifications.slice(0, 5).map((notification: any) => (
                    <div key={notification.id} className="p-3 bg-gray-50 rounded-lg">
                      <Stack spacing="sm">
                        <Text variant="small" weight="semibold">{notification.title}</Text>
                        {notification.message && (
                          <Text variant="small" variant="muted">{notification.message}</Text>
                        )}
                        <Text variant="small" variant="muted">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Text>
                      </Stack>
                    </div>
                  ))}
                </Stack>
              ) : (
                <Text variant="small" variant="muted">No recent activity</Text>
              )}

              {/* Quick Stats */}
              <Stack spacing="md">
                <Heading level={4}>Quick Stats</Heading>
                <Text variant="small">🎸 {bandCount} Bands</Text>
                <Text variant="small">👥 {myBandsData?.bands.reduce((sum: number, band: any) => sum + band._count.members, 0) || 0} Total Members</Text>
                <Text variant="small">✉️ {inviteCount} Pending Invites</Text>
              </Stack>

              {/* Placeholders */}
              <Card>
                <Stack spacing="sm">
                  <Heading level={4}>Messages</Heading>
                  <Text variant="small" variant="muted">Coming soon</Text>
                </Stack>
              </Card>
            </Stack>
          </aside>
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}