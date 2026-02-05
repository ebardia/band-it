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
  Alert,
  QuickActionsWidget
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

  // Fetch recommended bands
  const { data: recommendationsData } = trpc.band.getRecommendedBands.useQuery(
    { userId: userId!, limit: 6 },
    { enabled: !!userId }
  )

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

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      {/* Mobile View - Quick Actions Only */}
      <div className="md:hidden min-h-screen bg-gray-50 px-4 py-4">
        <QuickActionsWidget userId={userId} />
        {bandCount <= 1 && (
          <button
            onClick={() => router.push('/discover')}
            className="w-full text-left bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg p-4 transition-colors border border-blue-200 hover:border-blue-300 mb-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="text-gray-900 font-semibold">Find More Bands</p>
                  <p className="text-sm text-gray-600">Discover bands that match your skills and interests</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}
        <div className="text-center mt-8">
          <Text color="muted" className="text-sm">
            For full dashboard, use a larger screen
          </Text>
        </div>
      </div>

      {/* Desktop View - Full Dashboard */}
      <div className="hidden md:block">
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
              {/* Quick Actions Widget - at the top for immediate visibility */}
              <QuickActionsWidget userId={userId} />

              <Stack spacing="xl">
              {/* Recommended Bands for You */}
              <Stack spacing="lg">
                <Heading level={2}>✨ Recommended Bands for You</Heading>

                {/* Message if no profile or no strong matches */}
                {recommendationsData?.message && (
                  <Alert variant="info">
                    <Flex justify="between" align="center">
                      <Text variant="small">{recommendationsData.message}</Text>
                      {!recommendationsData.hasProfile && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push('/profile')}
                        >
                          Update Profile
                        </Button>
                      )}
                    </Flex>
                  </Alert>
                )}

                {/* Recommended Bands */}
                {recommendationsData?.recommendations && recommendationsData.recommendations.length > 0 ? (
                  <Stack spacing="md">
                    {recommendationsData.recommendations.map((rec: any) => (
                      <Card key={rec.band.id}>
                        <Flex justify="between" align="start">
                          <Stack spacing="sm" className="flex-1">
                            <Flex justify="between" align="center">
                              <Heading level={4}>{rec.band.name}</Heading>
                              {rec.matchScore > 0 && (
                                <Badge variant="success">{rec.matchScore}% match</Badge>
                              )}
                            </Flex>
                            <Text variant="small" color="muted">{rec.band.description}</Text>

                            {/* Match Reasons */}
                            {rec.matchReasons && rec.matchReasons.length > 0 && (
                              <Stack spacing="xs">
                                {rec.matchReasons.map((reason: string, idx: number) => (
                                  <Text key={idx} variant="small" className="text-green-700">
                                    {reason}
                                  </Text>
                                ))}
                              </Stack>
                            )}

                            <Flex gap="sm">
                              <Badge variant="info">{rec.band.memberCount} members</Badge>
                              <Badge variant="success">{rec.band.status}</Badge>
                            </Flex>
                          </Stack>
                          <Flex gap="sm" className="ml-4">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => router.push(`/bands/${rec.band.slug}`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => router.push(`/bands/${rec.band.slug}/apply`)}
                            >
                              Apply
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Card className="bg-gray-50 border-dashed border-2 border-gray-200">
                    <Stack spacing="sm" className="text-center py-4">
                      <Text color="muted">No band recommendations available.</Text>
                      <Text variant="small" color="muted">
                        You may already be a member of all available bands, or there are no active bands yet.
                      </Text>
                    </Stack>
                  </Card>
                )}

                {/* Prompt to update profile for better matches */}
                {recommendationsData?.hasProfile === false && (
                  <Card className="bg-blue-50 border border-blue-200">
                    <Flex justify="between" align="center">
                      <Stack spacing="xs">
                        <Text weight="semibold">Get Better Recommendations</Text>
                        <Text variant="small" color="muted">
                          Complete your profile to help us find bands that match your interests and skills.
                        </Text>
                      </Stack>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push('/profile')}
                      >
                        Update Profile
                      </Button>
                    </Flex>
                  </Card>
                )}
              </Stack>
            </Stack>
          </div>

          </Flex>
        </DashboardContainer>
      </div>
    </PageWrapper>
  )
}