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
  QuickActionsWidget,
  BandCardCompact
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

  // Check welcome state and redirect if needed
  const { data: welcomeState } = trpc.onboarding.getUserWelcomeState.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  useEffect(() => {
    if (welcomeState && !welcomeState.hasCompletedWelcome && !welcomeState.hasBands) {
      router.replace('/welcome')
    }
  }, [welcomeState, router])

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

  // Mobile redirect for single-band users
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobile = window.innerWidth < 768

    if (isMobile && myBandsData?.bands) {
      const activeBands = myBandsData.bands.filter((b: any) => b.status === 'ACTIVE')
      if (activeBands.length === 1) {
        router.replace(`/bands/${activeBands[0].slug}`)
      }
    }
  }, [myBandsData, router])

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

      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-gray-50 px-4 py-4">
        {/* Quick Actions - compact */}
        <QuickActionsWidget userId={userId} />

        {/* My Bands Section */}
        {myBandsData?.bands && myBandsData.bands.filter((b: any) => b.status === 'ACTIVE').length > 0 ? (
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">My Bands</h2>
            <div className="space-y-3">
              {myBandsData.bands
                .filter((b: any) => b.status === 'ACTIVE')
                .map((band: any) => (
                  <button
                    key={band.id}
                    onClick={() => router.push(`/bands/${band.slug}`)}
                    className="w-full bg-white rounded-lg shadow p-4 flex items-center gap-3 hover:bg-gray-50"
                  >
                    {band.imageUrl ? (
                      <img src={band.imageUrl} alt={band.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-xl">🎸</span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{band.name}</p>
                      <p className="text-sm text-gray-500">Tap to open discussions</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          /* New User - No Bands */
          <div className="mt-4">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <span className="text-4xl mb-3 block">🎵</span>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Band-It!</h2>
              <p className="text-gray-500 mb-4">Find a band to join and start collaborating</p>
              <button
                onClick={() => router.push('/discover')}
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700"
              >
                Discover Bands
              </button>
            </div>
          </div>
        )}
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
                  <Stack spacing="sm">
                    {recommendationsData.recommendations.map((rec: any) => (
                      <BandCardCompact
                        key={rec.band.id}
                        band={rec.band}
                        matchScore={rec.matchScore}
                        matchReasons={rec.matchReasons}
                      />
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