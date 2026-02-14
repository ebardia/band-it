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
  PageWrapper,
  DashboardContainer,
  Flex,
  Badge,
  Loading
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function MyBandsPage() {
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

  const { data: myBandsData, isLoading } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Fetch counts for sidebar
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const bandCount = myBandsData?.bands.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const taskCount = myTasksData?.tasks.length || 0

  if (isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer wide>
          <Flex gap="md" align="start">
            <DashboardSidebar />
            <div className="flex-1">
              <Loading message="Loading your bands..." />
            </div>
          </Flex>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />
      <DashboardContainer wide>
        <Flex gap="md" align="start">
          <DashboardSidebar
            bandCount={bandCount}
            proposalCount={proposalCount}
            projectCount={projectCount}
            taskCount={taskCount}
          />

          <div className="flex-1">
            <Stack spacing="md">
              <Flex justify="between" align="center">
                <Heading level={1}>My Bands</Heading>
                <Button variant="primary" size="md" onClick={() => router.push('/bands/create')}>
                  Create New Band
                </Button>
              </Flex>

              {myBandsData?.bands && myBandsData.bands.length > 0 ? (
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  {myBandsData.bands.map((band: any) => (
                    <div
                      key={band.id}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/bands/${band.slug}`)}
                    >
                      <div className="flex items-center py-3 px-3 md:px-4">
                        {/* Band info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {band.isSubBand && band.parentBand && (
                              <Text variant="small" color="muted">{band.parentBand.name} &gt;</Text>
                            )}
                            <Text weight="semibold" className="truncate">{band.name}</Text>
                            {band.isBigBand && <Badge variant="info">Big Band</Badge>}
                            {getStatusBadge(band.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                            <span>{band.myRole.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{band._count?.members || 0} members</span>
                            {band.isBigBand && (
                              <>
                                <span>•</span>
                                <span>{band._count?.subBands || 0} bands</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Arrow */}
                        <span className="text-gray-400 ml-2">→</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg bg-white p-6 text-center">
                  <Text color="muted" className="mb-4">You're not a member of any bands yet.</Text>
                  <Flex gap="md" justify="center">
                    <Button variant="primary" size="md" onClick={() => router.push('/bands/create')}>
                      Create Your First Band
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => router.push('/bands')}>
                      Browse Bands
                    </Button>
                  </Flex>
                </div>
              )}
            </Stack>
          </div>
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}
