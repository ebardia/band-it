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
  Loading
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function MyBandsPage() {
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
            <Stack spacing="xl">
              <Flex justify="between" align="center">
                <Heading level={1}>My Bands</Heading>
                <Button variant="primary" size="md" onClick={() => router.push('/bands/create')}>
                  Create New Band
                </Button>
              </Flex>

              {myBandsData?.bands && myBandsData.bands.length > 0 ? (
                <Stack spacing="md">
                  {myBandsData.bands.map((band: any) => (
                    <Card key={band.id} hover onClick={() => router.push(`/bands/${band.slug}`)}>
                      <Stack spacing="md">
                        <Flex justify="between" align="center">
                          <Flex gap="sm" align="center">
                            {band.isSubBand && band.parentBand && (
                              <Text color="muted">{band.parentBand.name} &gt;</Text>
                            )}
                            <Heading level={2}>{band.name}</Heading>
                            {band.isBigBand && <Badge variant="info">Big Band</Badge>}
                          </Flex>
                          {getStatusBadge(band.status)}
                        </Flex>
                        <Text color="muted" className="line-clamp-3">{band.description}</Text>
                        <Flex justify="between">
                          <Text variant="small">
                            Role: <Text variant="small" weight="semibold">{band.myRole.replace('_', ' ')}</Text>
                          </Text>
                          <Flex gap="md">
                            {band.isBigBand && (
                              <Text variant="small">
                                Bands: <Text variant="small" weight="semibold">{band._count?.subBands || 0}</Text>
                              </Text>
                            )}
                            <Text variant="small">
                              Members: <Text variant="small" weight="semibold">{band._count?.members || 0}</Text>
                            </Text>
                          </Flex>
                        </Flex>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Card>
                  <Stack spacing="md" align="center">
                    <Text>You're not a member of any bands yet.</Text>
                    <Flex gap="md">
                      <Button variant="primary" size="md" onClick={() => router.push('/bands/create')}>
                        Create Your First Band
                      </Button>
                      <Button variant="secondary" size="md" onClick={() => router.push('/bands')}>
                        Browse Bands
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              )}
            </Stack>
          </div>
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}
