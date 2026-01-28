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

  // Fetch all data
  const { data: myBandsData, refetch: refetchMyBands } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: invitationsData, refetch: refetchInvitations } = trpc.band.getMyInvitations.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: applicationsData, refetch: refetchApplications } = trpc.band.getMyApplicationsToReview.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: notificationsData } = trpc.notification.getMyNotifications.useQuery(
    { userId: userId!, limit: 10 },
    { enabled: !!userId }
  )

  const { data: allBandsData } = trpc.band.getAll.useQuery()

  // Fetch user's proposals, projects, and tasks
  const { data: myProposalsData } = trpc.proposal.getMyProposals.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProjectsData } = trpc.project.getMyProjects.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myTasksData } = trpc.task.getMyTasks.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProjectTasksData } = trpc.task.getMyProjectTasks.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Calculate recommended bands (bands user is NOT a member of)
  const myBandIds = new Set(myBandsData?.bands.map((b: any) => b.id) || [])
  const recommendedBands = allBandsData?.bands.filter((band: any) => 
    !myBandIds.has(band.id)
  ).slice(0, 3) || []

  // Mutations
  const acceptInviteMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted!', 'success')
      refetchInvitations()
      refetchMyBands()
      utils.notification.getUnreadCount.invalidate({ userId: userId! })
    },
  })

  const declineInviteMutation = trpc.band.declineInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation declined', 'success')
      refetchInvitations()
      utils.notification.getUnreadCount.invalidate({ userId: userId! })
    },
  })

  const approveApplicationMutation = trpc.band.approveApplication.useMutation({
    onSuccess: () => {
      showToast('Application approved!', 'success')
      refetchApplications()
      refetchMyBands()
      utils.notification.getUnreadCount.invalidate({ userId: userId! })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const rejectApplicationMutation = trpc.band.rejectApplication.useMutation({
    onSuccess: () => {
      showToast('Application rejected', 'success')
      refetchApplications()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  if (!userId) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer wide>
          <Loading message="Loading..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  // Calculate stats
  const bandCount = myBandsData?.bands.length || 0
  const inviteCount = invitationsData?.invitations.length || 0
  const applicationCount = applicationsData?.applications.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const assignedTaskCount = myTasksData?.tasks.length || 0
  const projectTaskCount = myProjectTasksData?.tasks.length || 0
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

      <DashboardContainer wide>
        <Flex gap="md" align="start">
          {/* Left Sidebar */}
          <DashboardSidebar
            bandCount={bandCount}
            proposalCount={proposalCount}
            projectCount={projectCount}
            assignedTaskCount={assignedTaskCount}
            projectTaskCount={projectTaskCount}
          />

          {/* Center Content */}
          <div className="flex-1">
            <Stack spacing="xl">
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
                            <Text variant="small" color="muted">{invitation.band.description}</Text>
                          </Stack>
                          <Flex gap="sm">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => acceptInviteMutation.mutate({
                                membershipId: invitation.id,
                                userId
                              })}
                              disabled={acceptInviteMutation.isPending}
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
                              disabled={declineInviteMutation.isPending}
                            >
                              Decline
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                )}

                {/* Applications to Review */}
                {applicationsData?.applications && applicationsData.applications.length > 0 && (
                  <Stack spacing="md">
                    <Heading level={3}>Applications to Review ({applicationCount})</Heading>
                    {applicationsData.applications.map((application: any) => (
                      <Card key={application.id}>
                        <Stack spacing="md">
                          <Flex justify="between">
                            <Stack spacing="sm">
                              <Heading level={4}>{application.user.name}</Heading>
                              <Badge variant="info">Applying to: {application.band.name}</Badge>
                            </Stack>
                            <Flex gap="sm">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => approveApplicationMutation.mutate({
                                  membershipId: application.id,
                                  approverId: userId
                                })}
                                disabled={approveApplicationMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => rejectApplicationMutation.mutate({
                                  membershipId: application.id,
                                  approverId: userId
                                })}
                                disabled={rejectApplicationMutation.isPending}
                              >
                                Reject
                              </Button>
                            </Flex>
                          </Flex>
                          
                          {application.notes && (
                            <Stack spacing="sm">
                              <Text variant="small" weight="semibold">Why they want to join:</Text>
                              <Text variant="small">{application.notes}</Text>
                            </Stack>
                          )}

                          {application.user.strengths && application.user.strengths.length > 0 && (
                            <Stack spacing="sm">
                              <Text variant="small" weight="semibold">Strengths:</Text>
                              <Text variant="small">{application.user.strengths.join(', ')}</Text>
                            </Stack>
                          )}
                        </Stack>
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

                {inviteCount === 0 && applicationCount === 0 && pendingBands.length === 0 && (
                  <Alert variant="success">
                    <Text>All caught up! No actions needed.</Text>
                  </Alert>
                )}
              </Stack>

              {/* Discovery Feed */}
              <Stack spacing="lg">
                <Heading level={2}>📊 Discovery Feed</Heading>

                {/* Recommended Bands */}
                {recommendedBands.length > 0 && (
                  <Stack spacing="md">
                    <Heading level={3}>Recommended Bands</Heading>
                    {recommendedBands.map((band: any) => (
                      <Card key={band.id}>
                        <Flex justify="between">
                          <Stack spacing="sm">
                            <Heading level={4}>{band.name}</Heading>
                            <Text variant="small" color="muted">{band.description}</Text>
                            <Flex gap="sm">
                              <Badge variant="info">{band._count.members} members</Badge>
                              <Badge variant={band.status === 'ACTIVE' ? 'success' : 'warning'}>{band.status}</Badge>
                            </Flex>
                          </Stack>
                          <Flex gap="sm">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => router.push(`/bands/${band.slug}`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => router.push(`/bands/${band.slug}/apply`)}
                            >
                              Apply
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                )}

                {/* New Bands This Week */}
                {newBandsThisWeek.length > 0 && (
                  <Stack spacing="md">
                    <Heading level={3}>New Bands This Week</Heading>
                    {newBandsThisWeek.slice(0, 3).map((band: any) => (
                      <Card key={band.id}>
                        <Flex justify="between">
                          <Stack spacing="sm">
                            <Heading level={4}>{band.name}</Heading>
                            <Text variant="small" color="muted">{band.description}</Text>
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

              </Stack>
            </Stack>
          </div>

        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}