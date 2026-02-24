'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Button,
  PageWrapper,
  DashboardContainer,
  Flex,
  Card,
  Loading,
  QuickActionsWidget,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function OverviewDashboard() {
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
  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
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

  // Calculate stats for sidebar
  const bandCount = myBandsData?.bands.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const assignedTaskCount = myTasksData?.tasks.length || 0
  const projectTaskCount = myProjectTasksData?.tasks.length || 0

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
              {/* My Bands - Quick Access Cards */}
              {myBandsData?.bands && myBandsData.bands.filter((b: any) => b.status === 'ACTIVE').length > 0 ? (
                <div className="mb-6">
                  <Stack spacing="sm">
                    {myBandsData.bands
                      .filter((b: any) => b.status === 'ACTIVE')
                      .map((band: any) => (
                        <button
                          key={band.id}
                          onClick={() => router.push(`/bands/${band.slug}`)}
                          className="w-full bg-white rounded-lg shadow p-4 flex items-center gap-4 hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
                        >
                          {band.imageUrl ? (
                            <img src={band.imageUrl} alt={band.name} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-xl text-white">🎸</span>
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900">{band.name}</p>
                            <p className="text-sm text-gray-500">Go to band page</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                  </Stack>
                </div>
              ) : (
                /* No Bands - Prompt to discover */
                <div className="mb-6">
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
                    <Flex justify="between" align="center">
                      <Stack spacing="xs">
                        <Text weight="semibold">Welcome to Band-It!</Text>
                        <Text variant="small" color="muted">
                          Find a band to join and start collaborating with other musicians.
                        </Text>
                      </Stack>
                      <Button
                        variant="primary"
                        onClick={() => router.push('/bands')}
                      >
                        Browse Bands
                      </Button>
                    </Flex>
                  </Card>
                </div>
              )}

              {/* Quick Actions Widget */}
              <QuickActionsWidget userId={userId} />
          </div>

          </Flex>
        </DashboardContainer>
      </div>
    </PageWrapper>
  )
}